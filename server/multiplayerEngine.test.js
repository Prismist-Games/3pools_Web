import assert from 'node:assert/strict';
import { MultiplayerRoom } from './multiplayerEngine.js';
import { INITIAL_GAME_CONFIG } from '../src/data/constants.js';

const config = INITIAL_GAME_CONFIG;

function makeItem(uid, template = config.pools[0].items[0], rarityId = 'common') {
    const pool = config.pools.find((candidate) => candidate.items.some((item) => item.name === template.name));
    return {
        ...template,
        poolId: pool.id,
        poolName: pool.name,
        id: uid,
        uid,
        rarity: config.rarity.find((rarity) => rarity.id === rarityId),
    };
}

function makeOrder(id = 'buffered-order') {
    const pool = config.pools[0];
    const template = pool.items[0];
    return {
        id,
        requirements: [{
            ...template,
            poolId: pool.id,
            poolName: pool.name,
            requiredRarity: config.rarity.find((rarity) => rarity.id === 'common'),
        }],
        baseScoreReward: 2,
        isScoreOrder: true,
    };
}

function usePassivePool(room) {
    const sourcePool = config.pools[0];
    room.activePools = [{
        ...sourcePool,
        originalId: sourcePool.id,
        items: sourcePool.items.slice(0, 4),
        affixKey: 'volatile',
        affix: config.affixes.find((affix) => affix.id === 'volatile'),
        cost: 1,
    }];
    return room.activePools[0].id;
}

function createStartedRoom() {
    const room = new MultiplayerRoom(config);
    const playerA = room.addPlayer('A');
    const playerB = room.addPlayer('B');
    room.start(playerA);
    usePassivePool(room);
    return { room, playerA, playerB };
}

function testOrderBufferAllowsOtherPlayersUntilNextDraw() {
    const { room, playerA, playerB } = createStartedRoom();
    const originalOrder = makeOrder();
    const originalOrderCount = room.stage.orderSlots;
    room.orders = [originalOrder, ...Array.from({ length: originalOrderCount - 1 }, (_, index) => makeOrder(`filler-${index}`))];

    room.players.get(playerA).inventory = [makeItem('a-item')];
    room.players.get(playerB).inventory = [makeItem('b-item')];

    room.submitOrder(playerA, originalOrder.id, ['a-item']);

    let bufferedOrder = room.orders.find((order) => order.id === originalOrder.id);
    assert.ok(bufferedOrder, 'completed order should stay visible in the current decision window');
    assert.equal(room.orders.length, originalOrderCount + 1, 'first completion should append one replacement order');
    assert.deepEqual(bufferedOrder.completedBy.map((entry) => entry.playerId), [playerA]);
    assert.throws(
        () => {
            room.players.get(playerA).inventory = [makeItem('a-second-item')];
            room.submitOrder(playerA, originalOrder.id, ['a-second-item']);
        },
        /已经完成过该订单/,
        'the same player should not score the same buffered order twice',
    );

    room.submitOrder(playerB, originalOrder.id, ['b-item']);

    bufferedOrder = room.orders.find((order) => order.id === originalOrder.id);
    assert.ok(bufferedOrder, 'completed order should remain available for the rest of the decision window');
    assert.equal(room.orders.length, originalOrderCount + 1, 'additional players completing the same buffered order should not append more replacements');
    assert.deepEqual(bufferedOrder.completedBy.map((entry) => entry.playerId), [playerA, playerB]);

    const poolId = usePassivePool(room);
    room.choosePool(playerA, poolId);
    assert.ok(room.orders.find((order) => order.id === originalOrder.id), 'buffered order should not retire when only one player is ready');

    room.choosePool(playerB, poolId);
    assert.equal(room.status, 'playing');
    assert.equal(room.orders.length, originalOrderCount);
    assert.equal(room.orders.some((order) => order.id === originalOrder.id), false, 'buffered order should retire when the next draw resolves');
}

function testOutOfFundsPlayerCanRecycleBeforeStopping() {
    const { room, playerA } = createStartedRoom();
    const player = room.players.get(playerA);

    player.gold = 0;
    player.inventory = [makeItem('rare-cashout-item', config.pools[0].items[0], 'rare')];
    room.beginRound();

    const brokeSnapshot = room.snapshot(playerA).players.find((candidate) => candidate.id === playerA);
    assert.equal(player.eliminated, false, 'a broke player should not be automatically stopped while they can manage inventory');
    assert.equal(brokeSnapshot.needsCashout, true, 'snapshot should expose the cashout state to the UI');
    assert.equal(room.canParticipateInCurrentRound(player), false, 'a broke player should not block the current reveal');

    room.recycleItems(playerA, { indices: [0] });
    assert.equal(player.gold, 1, 'rare recycle value should restore one gold');
    assert.equal(player.eliminated, false, 'recycling should keep the player in the game');

    const poolId = usePassivePool(room);
    assert.equal(room.canParticipateInCurrentRound(player), true, 'after recycling enough gold, the player can rejoin the current decision window');
    room.choosePool(playerA, poolId);
    assert.equal(player.ready, true);
}

function testManualStopDrawingFinishesAfterAllPlayersStop() {
    const { room, playerA, playerB } = createStartedRoom();

    room.stopDrawing(playerA);
    assert.equal(room.players.get(playerA).eliminated, true);
    assert.equal(room.status, 'playing', 'game should continue while at least one player has not stopped');

    room.stopDrawing(playerB);
    assert.equal(room.status, 'finished');
}

function testResetToLobbyPreservesConnectedPlayers() {
    const { room, playerA, playerB } = createStartedRoom();
    const originalNames = [...room.players.values()].map((player) => player.name);

    room.players.get(playerA).score = 12;
    room.players.get(playerA).inventory = [makeItem('carried-item')];
    room.stopDrawing(playerA);
    room.stopDrawing(playerB);

    room.resetToLobby(playerA);

    assert.equal(room.status, 'lobby');
    assert.equal(room.players.size, 2);
    assert.deepEqual([...room.players.values()].map((player) => player.name), originalNames);
    assert.equal(room.orders.length, 0);
    assert.equal(room.activePools.length, 0);
    assert.equal(room.round, 0);
    assert.equal(room.roundResults.length, 0);
    assert.ok(room.hostId);

    for (const player of room.players.values()) {
        assert.equal(player.connected, true);
        assert.equal(player.gold, config.global?.initialGold ?? 30);
        assert.equal(player.score, 0);
        assert.deepEqual(player.inventory, []);
        assert.equal(player.pendingItem, null);
        assert.equal(player.pendingQueue.length, 0);
        assert.equal(player.ready, false);
        assert.equal(player.eliminated, false);
    }
}

testOrderBufferAllowsOtherPlayersUntilNextDraw();
testOutOfFundsPlayerCanRecycleBeforeStopping();
testManualStopDrawingFinishesAfterAllPlayersStop();
testResetToLobbyPreservesConnectedPlayers();

console.log('multiplayerEngine tests passed');
