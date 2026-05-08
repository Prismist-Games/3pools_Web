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

testOrderBufferAllowsOtherPlayersUntilNextDraw();

console.log('multiplayerEngine tests passed');
