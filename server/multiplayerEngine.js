import { INITIAL_GAME_CONFIG } from '../src/data/constants.js';
import {
    generateOrder,
    getAllNormalItems,
    getNextRarity,
    getRandomAffix,
    rollRarity,
} from '../src/utils/helpers.js';

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const ROUND_RESULT_LIMIT = 8;

const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = () => Math.random().toString(36).slice(2, 11);
const hasSkill = () => false;

export class MultiplayerRoom {
    constructor(config = INITIAL_GAME_CONFIG) {
        this.config = clone(config);
        this.stage = this.config.stages[0];
        this.players = new Map();
        this.hostId = null;
        this.status = 'lobby';
        this.orders = [];
        this.activePools = [];
        this.round = 0;
        this.roundResults = [];
        this.log = [];
    }

    addPlayer(name = '玩家') {
        if (this.status !== 'lobby') {
            throw new Error('游戏已经开始，第一版不支持中途加入');
        }
        if (this.players.size >= MAX_PLAYERS) {
            throw new Error('房间已满');
        }

        const id = makeId();
        if (!this.hostId) this.hostId = id;

        this.players.set(id, {
            id,
            name: String(name).trim().slice(0, 12) || `玩家${this.players.size + 1}`,
            connected: true,
            isHost: id === this.hostId,
            gold: this.config.global?.initialGold ?? 30,
            score: 0,
            inventory: [],
            pendingItem: null,
            pendingQueue: [],
            selectedDraw: null,
            interaction: null,
            ready: false,
            eliminated: false,
        });

        this.addLog(`${this.players.get(id).name} 加入房间`);
        return id;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        if (this.status === 'lobby') {
            this.players.delete(playerId);
            if (this.hostId === playerId) {
                this.hostId = this.players.keys().next().value || null;
                if (this.hostId) this.players.get(this.hostId).isHost = true;
            }
        } else {
            player.connected = false;
            player.eliminated = true;
            player.ready = false;
            player.interaction = null;
            player.selectedDraw = null;
            this.checkGameEnd();
        }
        this.addLog(`${player.name} 离开房间`);
    }

    start(playerId) {
        if (this.status !== 'lobby') throw new Error('游戏已经开始');
        if (playerId !== this.hostId) throw new Error('只有房主可以开始');
        if (this.players.size < MIN_PLAYERS) throw new Error('至少需要 2 名玩家');

        this.status = 'playing';
        this.orders = this.createOrders();
        this.beginRound();
        this.addLog('游戏开始');
    }

    choosePool(playerId, poolId) {
        this.ensurePlaying();
        const player = this.requireActivePlayer(playerId);
        if (player.pendingItem || player.pendingQueue.length > 0 || player.interaction || player.ready) return;

        const pool = this.activePools.find((candidate) => candidate.id === poolId);
        if (!pool) throw new Error('奖池不存在');
        if (player.gold < pool.cost) throw new Error('金币不足');
        if (pool.affixKey === 'trade_in' && player.inventory.length === 0) {
            throw new Error('背包为空，无法使用以旧换新');
        }

        if (pool.affixKey === 'precise') {
            player.interaction = {
                type: 'precise',
                poolId,
                items: this.createPreciseCandidates(pool),
            };
            return;
        }

        if (pool.affixKey === 'targeted') {
            const originalPool = this.config.pools.find((source) => source.id === (pool.originalId || pool.id));
            player.interaction = {
                type: 'targeted',
                poolId,
                items: (originalPool?.items || pool.items).map((item) => ({ ...item })),
            };
            return;
        }

        if (pool.affixKey === 'trade_in') {
            player.interaction = {
                type: 'trade_in',
                poolId,
                items: player.inventory.map((item) => ({ uid: item.uid, name: item.name, icon: item.icon, rarity: item.rarity })),
            };
            return;
        }

        player.selectedDraw = { poolId };
        player.ready = true;
        this.tryResolveRound();
    }

    chooseInteractive(playerId, payload = {}) {
        this.ensurePlaying();
        const player = this.requireActivePlayer(playerId);
        if (!player.interaction) throw new Error('当前没有需要选择的词缀');

        if (player.interaction.type === 'precise') {
            const selected = player.interaction.items.find((item) => item.uid === payload.itemUid);
            if (!selected) throw new Error('候选物品不存在');
            player.selectedDraw = { poolId: player.interaction.poolId, selectedItem: selected };
        }

        if (player.interaction.type === 'targeted') {
            const selectedTemplate = player.interaction.items.find((item) => item.name === payload.itemName);
            if (!selectedTemplate) throw new Error('目标物品不存在');
            player.selectedDraw = { poolId: player.interaction.poolId, targetItemName: selectedTemplate.name };
        }

        if (player.interaction.type === 'trade_in') {
            const consumed = player.inventory.find((item) => item.uid === payload.itemUid);
            if (!consumed) throw new Error('用于以旧换新的物品不存在');
            player.selectedDraw = { poolId: player.interaction.poolId, consumedItemUid: consumed.uid };
        }

        player.interaction = null;
        player.ready = true;
        this.tryResolveRound();
    }

    handlePending(playerId, payload = {}) {
        this.ensurePlaying();
        const player = this.players.get(playerId);
        if (!player?.pendingItem) return;

        const pendingItem = player.pendingItem;

        if (payload.action === 'discard') {
            player.gold += pendingItem.rarity?.recycleValue || 0;
            this.addLog(`${player.name} 回收了待处理物品 ${pendingItem.name}`);
        } else if (payload.action === 'replace') {
            const targetIndex = Number(payload.index);
            const target = player.inventory[targetIndex];
            if (!target) throw new Error('替换目标不存在');

            if (this.canSynthesize(target, pendingItem)) {
                player.inventory[targetIndex] = {
                    ...target,
                    uid: makeId(),
                    rarity: getNextRarity(target.rarity.id, this.config),
                };
                this.addLog(`${player.name} 合成升级了 ${target.name}`);
            } else {
                player.gold += target.rarity?.recycleValue || 0;
                player.inventory[targetIndex] = pendingItem;
                this.addLog(`${player.name} 用 ${pendingItem.name} 替换了 ${target.name}`);
            }
        } else {
            throw new Error('未知的待处理操作');
        }

        player.pendingItem = null;
        this.processPendingQueue(player);
        this.updateElimination(player);
        this.tryResolveRound();
        this.checkGameEnd();
    }

    moveItem(playerId, payload = {}) {
        this.ensurePlaying();
        const player = this.players.get(playerId);
        if (!player || player.eliminated) return;
        if (player.pendingItem || player.interaction) throw new Error('当前状态下无法整理背包');
        if (player.ready || player.selectedDraw) throw new Error('已选择奖池，等待开奖时无法整理背包');

        const from = Number(payload.from);
        const to = Number(payload.to);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= player.inventory.length || to >= this.stage.inventorySize) {
            throw new Error('背包位置无效');
        }
        if (from === to) return;

        const source = player.inventory[from];
        const target = player.inventory[to];

        if (target && this.canSynthesize(target, source)) {
            player.inventory[to] = {
                ...target,
                uid: makeId(),
                rarity: getNextRarity(target.rarity.id, this.config),
            };
            player.inventory.splice(from, 1);
            this.addLog(`${player.name} 合成升级了 ${target.name}`);
            return;
        }

        if (to >= player.inventory.length) {
            player.inventory.splice(from, 1);
            player.inventory.push(source);
            return;
        }

        player.inventory[from] = target;
        player.inventory[to] = source;
    }

    recycleItems(playerId, payload = {}) {
        this.ensurePlaying();
        const player = this.players.get(playerId);
        if (!player || player.eliminated) return;
        if (player.pendingItem || player.interaction) throw new Error('当前状态下无法回收');
        if (player.ready || player.selectedDraw) throw new Error('已选择奖池，等待开奖时无法回收');

        const indices = [...new Set((payload.indices || []).map(Number))]
            .filter((index) => Number.isInteger(index) && index >= 0 && index < player.inventory.length)
            .sort((a, b) => b - a);
        if (indices.length === 0) return;

        let value = 0;
        for (const index of indices) {
            const item = player.inventory[index];
            value += item?.rarity?.recycleValue || 0;
            player.inventory.splice(index, 1);
        }
        player.gold += value;
        this.addLog(`${player.name} 回收 ${indices.length} 个物品，获得 ${value} 金币`);
        this.updateElimination(player);
        this.tryResolveRound();
        this.checkGameEnd();
    }

    submitOrder(playerId, orderId, itemUids = []) {
        this.ensurePlaying();
        const player = this.players.get(playerId);
        if (!player || player.eliminated) return;
        if (player.pendingItem) throw new Error('请先处理待处理物品');
        if (player.ready || player.interaction || player.selectedDraw) throw new Error('等待开奖时无法提交订单');

        const orderIndex = this.orders.findIndex((order) => order.id === orderId);
        if (orderIndex < 0) throw new Error('订单已经不存在');

        const order = this.orders[orderIndex];
        const match = itemUids.length > 0
            ? this.findOrderMatchByUids(player.inventory, order, itemUids)
            : this.findOrderMatch(player.inventory, order);
        if (!match) throw new Error('背包物品不足以完成订单');

        const finalScoreReward = this.calculateOrderScore(order, match.items);
        player.score += finalScoreReward;
        player.inventory = player.inventory.filter((_, index) => !match.indices.includes(index));
        this.orders[orderIndex] = this.createOrder();
        this.addLog(`${player.name} 完成订单，获得 ${finalScoreReward} 分`);
    }

    beginRound() {
        this.round += 1;
        this.activePools = this.generateActivePools();

        for (const player of this.players.values()) {
            player.selectedDraw = null;
            player.interaction = null;
            player.ready = false;
            this.updateElimination(player);
        }

        this.checkGameEnd();
    }

    tryResolveRound() {
        if (this.status !== 'playing') return;
        const availablePlayers = [...this.players.values()].filter((player) => this.canParticipateInCurrentRound(player));
        const unresolvedPlayers = availablePlayers.filter((player) => !player.ready);

        if ([...this.players.values()].every((player) => player.eliminated)) {
            this.finishGame();
            return;
        }
        if (availablePlayers.length === 0 || unresolvedPlayers.length > 0) return;

        const results = [];
        for (const player of availablePlayers) {
            const result = this.resolvePlayerDraw(player);
            results.push(result);
            this.handleIncomingItems(player, result.items);
            player.ready = false;
            player.selectedDraw = null;
        }
        this.roundResults = results.slice(-ROUND_RESULT_LIMIT);

        this.beginRound();
    }

    resolvePlayerDraw(player) {
        const draw = player.selectedDraw;
        const pool = this.activePools.find((candidate) => candidate.id === draw.poolId);
        let items = [];
        player.gold -= pool.cost;

        if (pool.affixKey === 'precise') {
            items = [draw.selectedItem];
        } else if (pool.affixKey === 'targeted') {
            const template = pool.items.find((item) => item.name === draw.targetItemName)
                || this.config.pools.flatMap((source) => source.items).find((item) => item.name === draw.targetItemName);
            items = [this.createItem(pool, template, pool.affixKey, player.gold)];
        } else if (pool.affixKey === 'trade_in') {
            const consumed = player.inventory.find((item) => item.uid === draw.consumedItemUid);
            if (!consumed) {
                items = [];
            } else {
                player.inventory = player.inventory.filter((item) => item.uid !== consumed.uid);
                let candidates = pool.items.filter((item) => item.name !== consumed.name);
                if (candidates.length === 0) candidates = pool.items;
                const template = candidates[Math.floor(Math.random() * candidates.length)];
                const upgraded = Math.random() < 0.05 ? getNextRarity(consumed.rarity.id, this.config) : null;
                items = [{
                    ...template,
                    poolId: pool.originalId || pool.id,
                    poolName: pool.name,
                    id: makeId(),
                    uid: makeId(),
                    rarity: upgraded || consumed.rarity,
                    sterile: consumed.sterile,
                }];
            }
        } else if (pool.affixKey === 'fragmented') {
            items = Array.from({ length: 3 }, () => {
                const template = pool.items[Math.floor(Math.random() * pool.items.length)];
                return this.createItem(pool, template, 'fragmented', player.gold);
            });
        } else {
            const template = pool.items[Math.floor(Math.random() * pool.items.length)];
            items = [this.createItem(pool, template, pool.affixKey, player.gold)];
        }

        return {
            round: this.round,
            playerId: player.id,
            playerName: player.name,
            poolName: pool.name,
            affixName: pool.affix?.name,
            items,
        };
    }

    handleIncomingItems(player, items) {
        for (const item of items) {
            if (player.inventory.length < this.stage.inventorySize && !player.pendingItem) {
                player.inventory.push(item);
            } else {
                player.pendingQueue.push(item);
            }
        }
        this.processPendingQueue(player);
    }

    processPendingQueue(player) {
        if (player.pendingItem) return;
        while (player.pendingQueue.length > 0) {
            const nextItem = player.pendingQueue.shift();
            if (player.inventory.length < this.stage.inventorySize) {
                player.inventory.push(nextItem);
            } else {
                player.pendingItem = nextItem;
                return;
            }
        }
    }

    createItem(pool, itemTemplate, affixKey = null, gold = 0) {
        const rarity = rollRarity(this.config, affixKey, gold, hasSkill, {}, this.stage);
        return {
            ...itemTemplate,
            poolId: pool.originalId || pool.id,
            poolName: pool.name,
            id: makeId(),
            uid: makeId(),
            rarity,
            sterile: affixKey === 'hardened',
        };
    }

    createPreciseCandidates(pool) {
        const candidates = [];
        let itemIndices = pool.items.map((_, index) => index);
        for (let i = 0; i < 2; i += 1) {
            if (itemIndices.length === 0) itemIndices = pool.items.map((_, index) => index);
            const randArrIdx = Math.floor(Math.random() * itemIndices.length);
            const actualItemIdx = itemIndices[randArrIdx];
            itemIndices.splice(randArrIdx, 1);
            candidates.push(this.createItem(pool, pool.items[actualItemIdx], pool.affixKey));
        }
        return candidates;
    }

    generateActivePools() {
        const result = [];
        const usedAffixIds = new Set();
        const tempPools = [...this.config.pools.slice(0, this.stage.allowedPoolCount)];

        for (let i = 0; i < 3; i += 1) {
            const totalWeight = tempPools.reduce((sum, pool) => sum + (pool.weight || 1), 0);
            let random = Math.random() * totalWeight;
            let selectedIndex = tempPools.length - 1;
            for (let j = 0; j < tempPools.length; j += 1) {
                random -= tempPools[j].weight || 1;
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }

            const selectedPool = clone(tempPools[selectedIndex]);
            selectedPool.originalId = selectedPool.id;
            selectedPool.items = selectedPool.items.slice(0, this.stage.poolSize);

            const availableAffixes = this.config.affixes.filter((affix) => !usedAffixIds.has(affix.id));
            const affix = getRandomAffix(availableAffixes.length > 0 ? availableAffixes : this.config.affixes);
            selectedPool.affixKey = affix.id;
            selectedPool.affix = affix;
            selectedPool.cost = affix.cost || 2;
            usedAffixIds.add(affix.id);

            result.push(selectedPool);
            tempPools.splice(selectedIndex, 1);
        }

        return result;
    }

    createOrders() {
        return Array.from({ length: this.stage.orderSlots }, () => this.createOrder());
    }

    createOrder() {
        const allItems = getAllNormalItems(this.config.pools, this.stage);
        return generateOrder(allItems, this.config, hasSkill, this.stage);
    }

    findOrderMatch(inventory, order) {
        const used = new Set();
        const indices = [];
        const items = [];

        for (const req of order.requirements) {
            const index = inventory.findIndex((item, itemIndex) => (
                item
                && !used.has(itemIndex)
                && item.name === req.name
                && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)
            ));
            if (index === -1) return null;
            used.add(index);
            indices.push(index);
            items.push(inventory[index]);
        }

        return { indices, items };
    }

    findOrderMatchByUids(inventory, order, itemUids) {
        const selected = itemUids.map((uid) => {
            const index = inventory.findIndex((item) => item?.uid === uid);
            return { index, item: inventory[index] };
        });

        if (selected.some(({ index, item }) => index < 0 || !item)) return null;
        if (selected.length !== order.requirements.length) return null;

        const used = new Set();
        const indices = [];
        const items = [];

        for (const req of order.requirements) {
            const selectedIndex = selected.findIndex(({ item }, idx) => (
                !used.has(idx)
                && item.name === req.name
                && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)
            ));
            if (selectedIndex === -1) return null;
            used.add(selectedIndex);
            indices.push(selected[selectedIndex].index);
            items.push(selected[selectedIndex].item);
        }

        return { indices, items };
    }

    calculateOrderScore(order, items) {
        const bonus = items.reduce((sum, item, index) => {
            const req = order.requirements[index];
            return sum + Math.max(req.requiredRarity?.bonus || 0, item.rarity?.bonus || 0);
        }, 0);
        return Math.ceil(order.baseScoreReward * (1 + bonus));
    }

    canSynthesize(target, incoming) {
        return target
            && incoming
            && !target.sterile
            && !incoming.sterile
            && target.name === incoming.name
            && target.rarity?.id === incoming.rarity?.id
            && target.rarity?.id !== 'mythic';
    }

    canAffordAnyPool(player) {
        return this.activePools.some((pool) => player.gold >= pool.cost && (pool.affixKey !== 'trade_in' || player.inventory.length > 0));
    }

    canParticipateInCurrentRound(player) {
        return !player.eliminated
            && !player.pendingItem
            && player.pendingQueue.length === 0;
    }

    updateElimination(player) {
        if (player.eliminated) return;
        if (player.pendingItem || player.pendingQueue.length > 0) return;
        if (this.activePools.length > 0 && !this.canAffordAnyPool(player)) {
            player.eliminated = true;
            player.ready = false;
            player.interaction = null;
            player.selectedDraw = null;
            this.addLog(`${player.name} 金币不足，停止抽奖`);
        }
    }

    checkGameEnd() {
        if (this.status === 'playing' && [...this.players.values()].every((player) => player.eliminated)) {
            this.finishGame();
        }
    }

    finishGame() {
        this.status = 'finished';
        this.addLog('游戏结束');
    }

    ensurePlaying() {
        if (this.status !== 'playing') throw new Error('游戏尚未开始');
    }

    requireActivePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) throw new Error('玩家不存在');
        if (player.eliminated) throw new Error('你已经停止抽奖');
        return player;
    }

    addLog(message) {
        this.log = [{ id: makeId(), message, time: Date.now() }, ...this.log].slice(0, 24);
    }

    snapshot(viewerId = null) {
        const players = [...this.players.values()].map((player) => ({
            id: player.id,
            name: player.name,
            connected: player.connected,
            isHost: player.id === this.hostId,
            isSelf: player.id === viewerId,
            gold: player.gold,
            score: player.score,
            inventory: player.inventory,
            pendingItem: player.pendingItem,
            pendingQueueCount: player.pendingQueue.length,
            ready: player.ready,
            eliminated: player.eliminated,
            interaction: player.id === viewerId ? player.interaction : null,
        }));

        return {
            status: this.status,
            hostId: this.hostId,
            viewerId,
            minPlayers: MIN_PLAYERS,
            maxPlayers: MAX_PLAYERS,
            round: this.round,
            orders: this.orders,
            activePools: this.activePools,
            players,
            roundResults: this.roundResults,
            log: this.log,
            inventorySize: this.stage.inventorySize,
            rankings: players
                .map((player) => ({ id: player.id, name: player.name, score: player.score }))
                .sort((a, b) => b.score - a.score),
        };
    }
}
