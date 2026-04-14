import { useState } from 'react';
import { generatePoolGrid, applyGravityAndRefill } from '../utils/matrixHelpers';
import { DOOM_CONFIG } from '../data/constants';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { V3_INITIAL_STATE, AP_CONFIG, RISK_CONFIG } from '../data/v3Config';
import { POOL_TYPES, generateWallShop, buildBiasedStickerWeights } from '../data/poolTypes';
import { GROWTH_ORDERS, isOrderReady, getOrderProgress, generateScoreOrder } from '../data/growthOrders';
import { generateSlotCard, canSatisfyCard, EVACUATION_PROFIT_REQUIREMENT } from '../data/slotCards';

import { useLanguage } from '../contexts/LanguageContext';

// =============================================
// HELPER FUNCTIONS
// =============================================

function generateUID() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export const useGameLogic = (config) => {
    const { t } = useLanguage();

    // --- Configuration ---
    const doomConfig = config.doom || DOOM_CONFIG;
    const expeditionConfig = config.expedition || { expeditionCount: 3 };
    const baseInventorySize = config.inventorySize || 15;
    const [inventoryBonus, setInventoryBonus] = useState(0);
    const maxInventorySize = baseInventorySize + inventoryBonus;

    // --- Expedition State ---
    const [expeditionNumber, setExpeditionNumber] = useState(0);
    const [expeditionScores, setExpeditionScores] = useState([]);
    const [bonusItems, setBonusItems] = useState([]);

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [phase, setPhase] = useState('pre_game');
    // phases: 'pre_game' | 'pool_selection' | 'drawing' | 'game_over'

    // --- Action Points ---
    const [actionPoints, setActionPoints] = useState(AP_CONFIG.maxAP);

    // --- Wall Shop State ---
    const [revealedPools, setRevealedPools] = useState([]);   // array of 5 wall instances
    const [displayedProfitCards, setDisplayedProfitCards] = useState([]); // 2 profit cards in shop display

    // --- Pool State ---
    const [currentPool, setCurrentPool] = useState(null);   // { uid, poolType, grid, cellCounts } or null

    // --- Doom State (legacy — kept for backward compat, ignored by new risk system) ---
    const [doomCounter, setDoomCounter] = useState(0);
    const [hp, setHp] = useState(doomConfig.initialHP);

    // --- Risk System State ---
    const [risk, setRisk] = useState(RISK_CONFIG.RISK_FLOOR); // kept for backward compat, no longer drives danger
    const [wallDepth, setWallDepth] = useState(0);
    const [lives, setLives] = useState(RISK_CONFIG.INITIAL_LIVES);

    // --- Heat / Danger Wall System (replaces danger cards) ---
    const [turnHeat, setTurnHeat] = useState(0);                 // accumulates per turn, resets each turn
    const [cumulativeExposure, setCumulativeExposure] = useState(0); // accumulates per expedition, resets on evacuation
    const [dangerWalls, setDangerWalls] = useState([]);           // array of danger wall encounters

    // --- Score Order Encounters State ---
    const [scoreOrderEncounters, setScoreOrderEncounters] = useState([]);

    // --- Slot Cards State ---
    const [slotCards, setSlotCards] = useState([]); // array of slot card objects (profit + danger)

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);
    const [lastDrawDirection, setLastDrawDirection] = useState(null);

    // --- Draw Count State ---
    const [drawCount, setDrawCount] = useState(0);
    const [totalDrawCount, setTotalDrawCount] = useState(0);

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [flyingItem, setFlyingItem] = useState(null);
    const [drawAnimState, setDrawAnimState] = useState(null);

    // --- Pool Overflow State ---
    const [pendingFlippedPool, setPendingFlippedPool] = useState(null);

    // --- Growth Orders State ---
    // completedOrderIds: Set-like array of order ids that have been submitted
    const [completedOrderIds, setCompletedOrderIds] = useState([]);

    // --- 印花墙 per-instance biased stickers ---
    // Each 印花墙 card in the deck carries its own independently-rolled 2-id bias pair
    // (stored on the pool type as `_bias`). No global state needed — bias travels with
    // the pool instance through deck → revealed → current → discard.

    // --- Derived State ---
    const isDrawAnimating = drawAnimState !== null;
    const canFlipOrder = actionPoints >= AP_CONFIG.flipCost
        && pendingFlippedPool === null;
    const drawLimitReached = currentPool ? drawCount >= (currentPool.poolType?.drawLimit ?? Infinity) : false;
    const canDraw = actionPoints >= AP_CONFIG.drawCost && phase === 'drawing' && !drawLimitReached;
    const canRefreshWalls = actionPoints >= AP_CONFIG.refreshCost && phase === 'pool_selection';

    // Risk system: derive coefficient from riskLabel via config lookup
    const getRiskCoeff = (poolType) => {
        const label = poolType?.riskLabel || '低';
        return RISK_CONFIG.RISK_COEFFICIENTS[label] || 1;
    };
    // Risk tier: plateau shrinks as you draw deeper (4, 3, 2, 1, 1, 1...)
    const getRiskTier = (depth) => {
        if (depth <= 4) return 1;
        if (depth <= 7) return 2;
        if (depth <= 9) return 3;
        return depth - 6; // 10→4, 11→5, 12→6...
    };
    const currentPoolRiskCoeff = getRiskCoeff(currentPool?.poolType);
    const nextDrawRiskIncrement = getRiskTier(wallDepth + 1) * currentPoolRiskCoeff;

    // --- Growth Orders: derived view ---
    const growthOrdersView = GROWTH_ORDERS.map(order => {
        const completed = completedOrderIds.includes(order.id);
        const locked = false;
        const ready = !completed && isOrderReady(order, inventory);
        return { order, completed, locked, ready };
    });

    // =============================================
    // WALL SHOP
    // =============================================

    // --- Slot card constants ---
    const MAX_PROFIT_CARDS = 5;
    const FLIP_HEAT = 3;

    // Cost-to-drawLimit mapping for wall shop
    const COST_DRAW_LIMIT = { 1: 3, 2: 5, 3: 7 };

    /** Generate 5 shop walls with random entry costs and draw limits */
    const generateShopWalls = () => {
        const shopWalls = generateWallShop(AP_CONFIG.wallShopSize);
        return shopWalls.map(poolType => {
            const entryCost = 1 + Math.floor(Math.random() * 3); // 1-3 AP
            const drawLimit = COST_DRAW_LIMIT[entryCost] || 5;
            return {
                uid: generateUID(),
                poolType: { ...poolType, drawLimit },
                entryCost,
                drawLimit,
            };
        });
    };

    /** Generate 2 profit cards for the display */
    const generateDisplayCards = () => {
        const cards = [];
        for (let i = 0; i < AP_CONFIG.displayCardCount; i++) {
            cards.push(generateSlotCard('profit', { turnCreated: turnNumber }));
        }
        return cards;
    };

    /** Refresh wall shop — costs AP, replaces all 5 walls + 2 profit cards */
    const refreshWalls = () => {
        if (!canRefreshWalls) return;
        setActionPoints(prev => prev - AP_CONFIG.refreshCost);
        const newWalls = generateShopWalls();
        setRevealedPools(newWalls);
        setDisplayedProfitCards(generateDisplayCards());
        showToast(`🔄 ${t('奖品墙已刷新')}`, 'info');
    };

    /** Check if player can enter a specific pool */
    const canEnterPool = (pool) => {
        return actionPoints >= pool.entryCost && phase === 'pool_selection';
    };

    /** Enter a pool — pay AP, generate grid with biased weights, switch to drawing */
    const enterPool = (poolUid) => {
        const pool = revealedPools.find(p => p.uid === poolUid);
        if (!pool) return;
        if (!canEnterPool(pool)) {
            showToast(t('行动点不足'), 'warning');
            return;
        }

        setActionPoints(prev => prev - pool.entryCost);

        // Generate grid with biased sticker weights
        const stickerWeightsOverride = pool.poolType._bias
            ? buildBiasedStickerWeights(pool.poolType._bias)
            : undefined;
        const { grid, cellCounts } = generatePoolGrid(pool.poolType, STICKER_TYPES, OUT_OF_GAME_ITEMS, stickerWeightsOverride);

        setCurrentPool({
            uid: pool.uid,
            poolType: pool.poolType,
            cellCounts,
            entryCost: pool.entryCost,
        });
        setMatrix(grid);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setWallDepth(0);
        setPhase('drawing');
    };

    /** Exit current pool — remove wall from shop, return to pool_selection */
    const exitPool = () => {
        if (!currentPool) return;
        // Remove the wall from the shop
        setRevealedPools(prev => prev.filter(p => p.uid !== currentPool.uid));
        setCurrentPool(null);
        setMatrix(null);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setPhase('pool_selection');
    };

    /** Take a displayed profit card — costs AP, adds to player's slot cards */
    const takeDisplayCard = (cardId) => {
        if (actionPoints < AP_CONFIG.takeCardCost) {
            showToast(t('行动点不足'), 'warning');
            return;
        }
        const profitCount = slotCards.filter(c => c.type === 'profit').length;
        if (profitCount >= MAX_PROFIT_CARDS) {
            showToast(t('兑换券已满'), 'warning');
            return;
        }
        const card = displayedProfitCards.find(c => c.id === cardId);
        if (!card) return;

        setActionPoints(prev => prev - AP_CONFIG.takeCardCost);
        setDisplayedProfitCards(prev => prev.filter(c => c.id !== cardId));
        setSlotCards(prev => [...prev, card]);
        showToast(`💎 ${t('获取兑换券')}`, 'success');
    };

    /** Check if a displayed card can be taken */
    const canTakeCard = (cardId) => {
        const profitCount = slotCards.filter(c => c.type === 'profit').length;
        return actionPoints >= AP_CONFIG.takeCardCost
            && profitCount < MAX_PROFIT_CARDS
            && phase === 'pool_selection';
    };

    /** Flip Order — costs AP. Produces a score order.
     *  Results go to Order Area.
     */
    const flipOrder = () => {
        if (!canFlipOrder) return;
        if (isDrawAnimating) return;

        setActionPoints(prev => prev - AP_CONFIG.flipCost);

        // Add heat on flip
        setTurnHeat(prev => prev + FLIP_HEAT);

        // Generate a score order
        const order = generateScoreOrder();
        const scoreEncounter = { type: 'score_order', id: order.id, order };

        // Order area overflow check
        const orderAreaCount = scoreOrderEncounters.length;
        if (orderAreaCount >= AP_CONFIG.maxRevealedOrders) {
            // Score orders can be discarded when overflow — use pending mechanism
            setPendingFlippedPool({ uid: scoreEncounter.id, poolType: null, isScoreOrder: true, scoreEncounter });
        } else {
            setScoreOrderEncounters(prev => [...prev, scoreEncounter]);
        }
        showToast(`📋 ${t('得分订单出现')}!`, 'info');
    };

    /** Resolve pool overflow — player chooses to accept or discard a pending score order.
     *  action: 'replace' | 'discard'
     */
    const resolvePoolOverflow = (action) => {
        if (!pendingFlippedPool) return;

        // If the pending item is a score order (from score order overflow)
        if (pendingFlippedPool.isScoreOrder) {
            if (action !== 'discard') {
                setScoreOrderEncounters(prev => [...prev, pendingFlippedPool.scoreEncounter]);
            }
            // If discarded, score order is simply dropped (no penalty)
            setPendingFlippedPool(null);
            return;
        }

        setPendingFlippedPool(null);
    };

    // =============================================
    // GROWTH ORDERS
    // =============================================

    /** Submit a growth order — consume stickers, grant a perk (TODO) or placeholder reward.
     *  Called only after a confirmation click in the UI. Under the new architecture,
     *  orders no longer unlock walls — they give perks or gold. All walls are reachable
     *  via the rarity-weighted flip roll controlled by the player tier.
     */
    const submitGrowthOrder = (orderId) => {
        const order = GROWTH_ORDERS.find(o => o.id === orderId);
        if (!order) return;
        if (completedOrderIds.includes(orderId)) return;
        // No inter-order gating in the new design — any order can be submitted when ready.
        if (!isOrderReady(order, inventory)) {
            showToast(t('印花不足'), 'warning');
            return;
        }

        // Consume stickers — for each group, remove `count` stickers matching any of stickerIds
        setInventory(prev => {
            const remaining = [...prev];
            for (const group of order.groups) {
                let toRemove = group.count;
                for (let i = remaining.length - 1; i >= 0 && toRemove > 0; i--) {
                    const it = remaining[i];
                    if (it?.isSticker && group.stickerIds.includes(it.stickerId)) {
                        remaining.splice(i, 1);
                        toRemove--;
                    }
                }
            }
            return remaining;
        });

        // TODO (perk system): replace this stub with actual perk / gold rewards.
        // For now, completing an order just marks it done. No reward is granted.
        // When perks are designed, consume `order.reward` (or a new field) and apply here.

        // Mark completed
        setCompletedOrderIds(prev => [...prev, orderId]);
        showToast(`✨ ${t('订单完成')}: ${t(order.name)}`, 'success');
    };

    // =============================================
    // SCORE ORDERS
    // =============================================

    /** Submit a score order — consume stickers, add reward items to inventory, remove encounter. */
    const submitScoreOrder = (orderId) => {
        const encounter = scoreOrderEncounters.find(e => e.id === orderId);
        if (!encounter) return;
        const order = encounter.order;
        if (!isOrderReady(order, inventory)) {
            showToast(t('印花不足'), 'warning');
            return;
        }

        // Consume stickers
        setInventory(prev => {
            const remaining = [...prev];
            for (const group of order.groups) {
                let toRemove = group.count;
                for (let i = remaining.length - 1; i >= 0 && toRemove > 0; i--) {
                    const it = remaining[i];
                    if (it?.isSticker && group.stickerIds.includes(it.stickerId)) {
                        remaining.splice(i, 1);
                        toRemove--;
                    }
                }
            }
            return remaining;
        });

        // Add reward items to inventory
        const rewardInventoryItems = order.rewardItems.map(item => ({
            id: item.id,
            name: item.name,
            icon: item.icon,
            stars: item.stars,
            isOutOfGame: true,
            uid: generateUID(),
        }));

        // Check if items fit; overflow to pending if needed
        setInventory(prev => {
            const newInv = [...prev];
            const toPending = [];
            for (const item of rewardInventoryItems) {
                if (newInv.length < maxInventorySize) {
                    newInv.push(item);
                } else {
                    toPending.push(item);
                }
            }
            if (toPending.length > 0) {
                setPendingItems(prevP => [...prevP, ...toPending]);
            }
            return newInv;
        });

        // Remove the score order encounter
        setScoreOrderEncounters(prev => prev.filter(e => e.id !== orderId));
        showToast(`📋 ${t('得分订单完成')}!`, 'success');
    };

    // =============================================
    // SLOT CARDS
    // =============================================

    /** Add a new slot card to the player's active cards */
    const addSlotCard = (type, options = {}) => {
        const card = generateSlotCard(type, {
            ...options,
            turnCreated: options.turnCreated ?? turnNumber,
        });
        setSlotCards(prev => [...prev, card]);
        return card;
    };

    // NOTE: fillSlot, unfillSlot, moveSlot removed — passive matching system.
    // Stickers are never consumed. Cards auto-check inventory at turn end / evacuation.

    /**
     * Check danger cards at turn end (passive matching).
     * For each danger card, check if inventory CONTAINS the required stickers.
     * If satisfied -> resolved (no damage). Stickers NOT consumed.
     * If NOT satisfied -> -1 life.
     * All danger cards are removed after check.
     * @returns {{ lost: number, resolved: number }}
     */
    const checkDangerCards = () => {
        const dangerCards = slotCards.filter(c => c.type === 'danger');
        let lost = 0;
        let resolved = 0;

        for (const card of dangerCards) {
            if (canSatisfyCard(card, inventory)) {
                resolved++;
            } else {
                lost++;
            }
        }

        // Apply life loss
        if (lost > 0) {
            setLives(prev => {
                const newLives = Math.max(0, prev - lost);
                if (newLives <= 0) {
                    showToast(`💀 ${t('生命耗尽')}! ${t('失去了全部物品')}`, 'warning');
                    setInventory([]);
                    setTimeout(() => finishEvacuation([], 'game_over'), 500);
                } else {
                    showToast(`⚠️ ${t('危险卡未满足')}! -${lost} ❤️`, 'warning');
                }
                return newLives;
            });
        }

        if (resolved > 0) {
            showToast(`✅ ${t('危险卡已化解')} ×${resolved}`, 'success');
        }

        // Remove all danger cards (both resolved and failed)
        setSlotCards(prev => prev.filter(c => c.type !== 'danger'));

        return { lost, resolved };
    };

    /**
     * Resolve slot cards at evacuation (passive matching).
     * - Satisfied profit cards: grant reward items. Stickers NOT consumed.
     * - Unsatisfied profit cards: no reward, no penalty.
     * - Danger cards should have been resolved at turn end already; clean up any remaining.
     * @returns {{ rewardItems: object[] }} items gained from satisfied profit cards
     */
    const resolveSlotCardsAtEvacuation = () => {
        const currentProfitCards = slotCards.filter(c => c.type === 'profit');
        const rewardItems = [];

        for (const card of currentProfitCards) {
            if (canSatisfyCard(card, inventory) && card.reward?.items) {
                for (const item of card.reward.items) {
                    rewardItems.push({
                        id: item.id,
                        name: item.name,
                        icon: item.icon,
                        stars: item.stars,
                        isOutOfGame: true,
                        uid: generateUID(),
                    });
                }
            }
        }

        // Add reward items to inventory
        if (rewardItems.length > 0) {
            setInventory(prev => {
                const newInv = [...prev];
                const toPending = [];
                for (const item of rewardItems) {
                    if (newInv.length < maxInventorySize) {
                        newInv.push(item);
                    } else {
                        toPending.push(item);
                    }
                }
                if (toPending.length > 0) {
                    setPendingItems(prevP => [...prevP, ...toPending]);
                }
                return newInv;
            });
            showToast(`🎁 ${t('物品兑换券兑换')} ×${rewardItems.length}`, 'success');
        }

        // Clear all slot cards
        setSlotCards([]);

        return { rewardItems };
    };

    /** Remove a specific slot card (e.g., player discards it). */
    const removeSlotCard = (cardId) => {
        setSlotCards(prev => prev.filter(c => c.id !== cardId));
    };

    // Derived: separate card types for easy access
    const profitCards = slotCards.filter(c => c.type === 'profit');
    const dangerCards_slot = slotCards.filter(c => c.type === 'danger');

    // Evacuation: player must currently hold at least N satisfied profit cards.
    const satisfiedProfitCount = profitCards.filter(c => canSatisfyCard(c, inventory)).length;
    const canEvacuate = satisfiedProfitCount >= EVACUATION_PROFIT_REQUIREMENT;

    // Simple capacity: just inventory count (no slot counting)
    const usedCapacity = inventory.length;
    const freeCapacity = Math.max(0, maxInventorySize - usedCapacity);

    // =============================================
    // DANGER WALL SYSTEM
    // =============================================

    /**
     * Generate a danger wall grid based on cumulative exposure.
     * Returns a small grid (1x3) with resolve and hit cells.
     * TODO (tuning): thresholds are placeholders.
     */
    const generateDangerGrid = (exposure) => {
        let resolveCount, hitCount;
        if (exposure < 20) {
            resolveCount = 2; hitCount = 1;
        } else if (exposure < 50) {
            resolveCount = 1; hitCount = 2;
        } else {
            resolveCount = 0; hitCount = 3;
        }
        const cells = [];
        for (let i = 0; i < resolveCount; i++) {
            cells.push({ type: 'danger_resolve', icon: '\uD83D\uDEE1\uFE0F', name: '\u5316\u89E3' });
        }
        for (let i = 0; i < hitCount; i++) {
            cells.push({ type: 'danger_hit', icon: '\uD83D\uDC80', name: '\u547D\u4E2D' });
        }
        // Shuffle cells
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        // Return as 1-row grid (1x3) for draw mechanics compatibility
        return [cells];
    };

    /** Enter a danger wall — set up small grid, use normal draw mechanics */
    const enterDangerWall = (dangerWallId) => {
        if (isDrawAnimating) return;
        const dw = dangerWalls.find(d => d.id === dangerWallId);
        if (!dw) return;

        setWallDepth(0);

        setCurrentPool({
            uid: dw.id,
            poolType: {
                id: 'danger_wall',
                name: '\u5371\u9669\u5899',
                icon: '\uD83D\uDD25',
                tier: 'danger',
                color: 'bg-red-50 border-red-400 text-red-800',
                cardBg: 'from-red-50 to-red-100',
                entryCost: {},
                riskLabel: '\u9AD8',
                drawLimit: dw.drawLimit,
                isDangerWall: true,
            },
            cellCounts: {},
            isDangerWall: true,
            dangerWallId: dw.id,
        });
        setMatrix(dw.grid);
        setDrawCount(0);
        setLastDrawDirection(null);
        setLastDrawResult(null);
        setPhase('drawing');
    };

    /** Exit a danger wall — return to pool_selection. */
    const exitDangerWallView = () => {
        if (!currentPool) return;
        if (currentPool.isDangerWall) {
            setDangerWalls(prev => prev.filter(d => d.id !== currentPool.dangerWallId));
        }
        setCurrentPool(null);
        setMatrix(null);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setPhase('pool_selection');
    };

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start the game */
    const startGame = () => {
        // Pick bonus items on first expedition
        if (expeditionNumber === 0) {
            const shuffled = [...OUT_OF_GAME_ITEMS].sort(() => Math.random() - 0.5);
            const bonusValues = [1, 2, 3];
            setBonusItems(shuffled.slice(0, 3).map((item, i) => ({ ...item, bonusValue: bonusValues[i] })));
        }
        setExpeditionNumber(prev => prev + 1);
        setActionPoints(AP_CONFIG.maxAP);
        setDoomCounter(0);
        setDrawCount(0);
        setTotalDrawCount(0);
        setTurnNumber(1);
        setCompletedOrderIds([]);

        // Risk / heat system: reset to clean state
        setRisk(RISK_CONFIG.RISK_FLOOR);
        setWallDepth(0);
        setLives(RISK_CONFIG.INITIAL_LIVES);
        setTurnHeat(0);
        setCumulativeExposure(0);
        setDangerWalls([]);
        setScoreOrderEncounters([]);

        // Create initial slot cards: turn 1 danger only (profit cards now come from display)
        const turn1DangerCount = Math.ceil(1 / 2); // Turn 1: 1 danger card
        const turn1DangerCards = [];
        for (let i = 0; i < turn1DangerCount; i++) {
            turn1DangerCards.push(generateSlotCard('danger', { turnCreated: 1 }));
        }
        setSlotCards([...turn1DangerCards]);

        // Generate wall shop + displayed profit cards
        const shopWalls = generateShopWalls();
        setRevealedPools(shopWalls);
        setDisplayedProfitCards(generateDisplayCards());

        setCurrentPool(null);
        setMatrix(null);
        setPhase('pool_selection');
    };

    /** End current turn manually (forfeits remaining AP) */
    const endTurn = () => {
        // Check danger slot cards before moving to next turn
        checkDangerCards();

        startNextTurn();
    };

    /** Start a new turn — check turn-end danger from heat, reset AP */
    const startNextTurn = () => {
        // --- Turn-end danger check using turnHeat ---
        // P(danger) = turnHeat / (turnHeat + RISK_K)
        const currentHeat = turnHeat;
        const dangerProb = currentHeat / (currentHeat + RISK_CONFIG.RISK_K);

        // Update cumulative exposure before resetting heat
        setCumulativeExposure(prev => prev + currentHeat);

        if (Math.random() < dangerProb) {
            // Generate a danger wall based on cumulative exposure
            const grid = generateDangerGrid(cumulativeExposure + currentHeat);
            const drawLimit = grid[0].length; // draw limit = number of cells
            const dw = {
                type: 'danger_wall',
                id: generateUID(),
                grid,
                drawLimit,
                resolved: false,
            };
            setDangerWalls(prev => [...prev, dw]);
            showToast(`\u26A0\uFE0F ${t('\u5371\u9669\u5899\u51FA\u73B0')}!`, 'warning');
        }

        // Reset turn heat
        setTurnHeat(0);

        const nextTurn = turnNumber + 1;
        setTurnNumber(nextTurn);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setDrawCount(0);

        // Auto-generate danger cards — count scales with turn number
        // TODO (tuning): adjust scaling formula after playtesting
        const dangerCardCount = Math.ceil(nextTurn / 2);
        const newDangerCards = [];
        for (let i = 0; i < dangerCardCount; i++) {
            newDangerCards.push(generateSlotCard('danger', { turnCreated: nextTurn }));
        }

        // No auto-generate profit cards — they only come from the display
        setSlotCards(prev => [...prev, ...newDangerCards]);

        // Return to pool selection — clear current pool/matrix
        setCurrentPool(null);
        setMatrix(null);

        // Refresh displayed profit cards for new turn
        setDisplayedProfitCards(generateDisplayCards());

        setPhase('pool_selection');
    };

    // =============================================
    // DRAW MECHANIC (preserved from original)
    // =============================================

    /** Select a row — starts scanning animation, then resolves */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing') return;
        if (isDrawAnimating) return;
        if (!matrix || !matrix[rowIndex]) return;
        if (actionPoints < AP_CONFIG.drawCost) {
            showToast(t('行动点不足'), 'warning');
            return;
        }

        setLastDrawResult(null);
        setFlyingItem(null);

        const row = matrix[rowIndex];
        // Empty cells (null) are drawable too — they yield no effect but still consume a draw.
        const activeCols = row.map((_, colIndex) => colIndex);
        if (activeCols.length === 0) return;

        // Pay AP cost
        setActionPoints(prev => prev - AP_CONFIG.drawCost);
        setDrawCount(prev => prev + 1);
        setTotalDrawCount(prev => prev + 1);

        // Pre-determine result
        const finalColIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = row[finalColIndex];

        const finalIdx = activeCols.indexOf(finalColIndex);
        const fullPasses = 1;
        const totalTicks = fullPasses * activeCols.length + finalIdx + 1;

        setDrawAnimState({
            direction: 'row',
            rowIndex,
            colIndex: null,
            activeCols,
            finalColIndex,
            finalRowIndex: rowIndex,
            finalHighlight: finalColIndex,
            drawnCell,
            tick: 0,
            totalTicks,
            currentHighlight: activeCols[0],
            phase: 'scanning',
        });
    };

    /** Select a column */
    const selectColumn = (colIndex) => {
        if (phase !== 'drawing') return;
        if (isDrawAnimating) return;
        if (!matrix) return;
        if (actionPoints < AP_CONFIG.drawCost) {
            showToast(t('行动点不足'), 'warning');
            return;
        }

        setLastDrawResult(null);
        setFlyingItem(null);

        // Empty cells (null) are drawable too.
        const activeCols = matrix.map((_, rowIndex) => rowIndex);
        if (activeCols.length === 0) return;

        setActionPoints(prev => prev - AP_CONFIG.drawCost);
        setDrawCount(prev => prev + 1);
        setTotalDrawCount(prev => prev + 1);

        const finalRowIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = matrix[finalRowIndex][colIndex];

        const finalIdx = activeCols.indexOf(finalRowIndex);
        const fullPasses = 1;
        const totalTicks = fullPasses * activeCols.length + finalIdx + 1;

        setDrawAnimState({
            direction: 'column',
            rowIndex: null,
            colIndex,
            activeCols,
            finalColIndex: colIndex,
            finalRowIndex,
            finalHighlight: finalRowIndex,
            drawnCell,
            tick: 0,
            totalTicks,
            currentHighlight: activeCols[0],
            phase: 'scanning',
        });
    };

    /** Advance draw scanning animation */
    const tickDrawAnim = () => {
        setDrawAnimState(prev => {
            if (!prev || prev.phase !== 'scanning') return prev;
            const newTick = prev.tick + 1;
            if (newTick >= prev.totalTicks) {
                return { ...prev, tick: newTick, currentHighlight: prev.finalHighlight, phase: 'settled' };
            }
            const next = prev.activeCols[newTick % prev.activeCols.length];
            return { ...prev, tick: newTick, currentHighlight: next };
        });
    };

    /** Apply draw result after animation settles */
    const completeDrawAnim = () => {
        if (!drawAnimState) return;
        const { direction, finalRowIndex, finalColIndex, drawnCell } = drawAnimState;

        setLastDrawDirection(direction);

        let obtainedItem = null;

        // --- Danger wall draw handling ---
        if (currentPool?.isDangerWall) {
            if (drawnCell?.type === 'danger_resolve') {
                showToast(`\uD83D\uDEE1\uFE0F ${t('\u5371\u9669\u5316\u89E3')}!`, 'success');
                // Remove drawn cell from grid
                setMatrix(prev => {
                    const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
                    newMatrix[finalRowIndex][finalColIndex] = null;
                    return newMatrix;
                });
                // Remove danger wall and exit automatically
                setDangerWalls(prev => prev.filter(d => d.id !== currentPool.dangerWallId));
                setLastDrawResult({ rowIndex: finalRowIndex, colIndex: finalColIndex, obtained: null });
                setDrawAnimState(null);
                // Auto-exit after brief delay — return to pool selection
                setTimeout(() => {
                    setLastDrawResult(null);
                    setLastDrawDirection(null);
                    setDrawCount(0);
                    setCurrentPool(null);
                    setMatrix(null);
                    setPhase('pool_selection');
                }, 600);
                return;
            } else if (drawnCell?.type === 'danger_hit') {
                showToast(`\uD83D\uDC80 ${t('\u547D\u4E2D')} -1 \u2764\uFE0F`, 'warning');
                setLives(prev => {
                    const newLives = prev - 1;
                    if (newLives <= 0) {
                        showToast(`\uD83D\uDC80 ${t('\u751F\u547D\u8017\u5C3D')}! ${t('\u5931\u53BB\u4E86\u5168\u90E8\u7269\u54C1')}`, 'warning');
                        setInventory([]);
                        setTimeout(() => finishEvacuation([], 'game_over'), 500);
                    }
                    return Math.max(0, newLives);
                });
            }
            // Remove drawn cell, set last result, clear anim
            setMatrix(prev => {
                const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
                newMatrix[finalRowIndex][finalColIndex] = null;
                return newMatrix;
            });
            // Check if draw limit reached — auto-exit danger wall
            const newDrawCount = drawCount + 1;
            const dw = dangerWalls.find(d => d.id === currentPool.dangerWallId);
            if (dw && newDrawCount >= dw.drawLimit) {
                setDangerWalls(prev => prev.filter(d => d.id !== currentPool.dangerWallId));
                setLastDrawResult({ rowIndex: finalRowIndex, colIndex: finalColIndex, obtained: null });
                setDrawAnimState(null);
                setTimeout(() => {
                    setLastDrawResult(null);
                    setLastDrawDirection(null);
                    setDrawCount(0);
                    setCurrentPool(null);
                    setMatrix(null);
                    setPhase('pool_selection');
                }, 600);
                return;
            }
            setLastDrawResult({ rowIndex: finalRowIndex, colIndex: finalColIndex, obtained: null });
            setDrawAnimState(null);
            return;
        }

        // --- Normal wall draw handling ---
        if (drawnCell === null || drawnCell.type === 'blank') {
            showToast(t('\u7A7A\u683C'), 'info');
        } else if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'gold') {
            // Gold cells no longer grant gold (gold removed). Treat as empty.
            showToast(t('\u7A7A\u683C'), 'info');
        } else if (drawnCell.type === 'bomb') {
            // Bomb: destroy adjacent 8 cells
        }

        // --- Heat accumulation on draw ---
        // Add risk-based heat to turnHeat
        setWallDepth(prev => {
            const newDepth = prev + 1;
            const poolType = currentPool?.poolType;
            const coeff = getRiskCoeff(poolType);
            const increment = getRiskTier(newDepth) * coeff;
            setTurnHeat(prevHeat => prevHeat + increment);
            return newDepth;
        });

        // Phase 1: Null drawn cells (show gap), then Phase 2: gravity + refill after delay.
        // Multi-cell shapes: all cells in the group become null.
        const nullDrawnCells = (prevMatrix) => {
            const newMatrix = prevMatrix.map(r => r.map(c => c ? { ...c } : null));

            if (drawnCell?.groupId) {
                for (let r = 0; r < newMatrix.length; r++) {
                    for (let c = 0; c < newMatrix[r].length; c++) {
                        if (newMatrix[r][c]?.groupId === drawnCell.groupId) {
                            newMatrix[r][c] = null;
                        }
                    }
                }
            } else {
                newMatrix[finalRowIndex][finalColIndex] = null;
            }

            // Bomb explosion — destroyed cells become null too
            if (drawnCell?.type === 'bomb') {
                const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                const destroyGroups = new Set();
                for (const [dr, dc] of dirs) {
                    const nr = finalRowIndex + dr;
                    const nc = finalColIndex + dc;
                    if (nr >= 0 && nr < newMatrix.length && nc >= 0 && nc < newMatrix[0].length && newMatrix[nr][nc]) {
                        if (newMatrix[nr][nc].groupId) {
                            destroyGroups.add(newMatrix[nr][nc].groupId);
                        } else {
                            newMatrix[nr][nc] = null;
                        }
                    }
                }
                if (destroyGroups.size > 0) {
                    for (let r = 0; r < newMatrix.length; r++) {
                        for (let c = 0; c < newMatrix[r].length; c++) {
                            if (newMatrix[r][c]?.groupId && destroyGroups.has(newMatrix[r][c].groupId)) {
                                newMatrix[r][c] = null;
                            }
                        }
                    }
                }
                showToast('💣 ' + t('炸弹爆炸！'), 'warning');
            }

            return newMatrix;
        };

        // Phase 1: null the drawn cells to show the gap
        setMatrix(prev => nullDrawnCells(prev));

        // Phase 2: after a brief delay, apply gravity + refill (triggers fall animation)
        setTimeout(() => {
            setMatrix(prev => {
                const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
                applyGravityAndRefill(newMatrix, STICKER_TYPES);
                return newMatrix;
            });
        }, 120);

        if (obtainedItem) {
            setFlyingItem({
                icon: obtainedItem.item?.icon || obtainedItem.icon,
                name: obtainedItem.item?.name || obtainedItem.name,
                shapeSize: obtainedItem.shapeSize || 1,
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                id: Date.now(),
            });
            addToInventory(obtainedItem);
        }

        setLastDrawResult({
            rowIndex: finalRowIndex,
            colIndex: finalColIndex,
            obtained: obtainedItem,
        });
        setDrawAnimState(null);

    };

    // =============================================
    // INVENTORY
    // =============================================

    const addToInventory = (itemCell) => {
        let newItem;
        if (itemCell.type === 'sticker') {
            newItem = {
                name: itemCell.item.name,
                icon: itemCell.item.icon,
                stickerId: itemCell.item.id,
                isSticker: true,
                uid: itemCell.uid,
            };
        } else if (itemCell.type === 'out_of_game') {
            newItem = {
                id: itemCell.item.id,
                name: itemCell.item.name,
                icon: itemCell.item.icon,
                stars: itemCell.item.stars,
                isOutOfGame: true,
                uid: itemCell.uid,
            };
        } else {
            newItem = {
                name: itemCell.item?.name || itemCell.name,
                icon: itemCell.item?.icon || itemCell.icon,
                uid: itemCell.uid,
            };
        }
        if (usedCapacity >= maxInventorySize) {
            setPendingItems(prev => [...prev, newItem]);
            return;
        }
        setInventory(prev => [...prev, newItem]);
    };

    const pendingItem = pendingItems.length > 0 ? pendingItems[0] : null;

    const replaceInventoryItem = (index) => {
        if (!pendingItem) return;
        setInventory(prev => {
            const next = [...prev];
            next[index] = pendingItem;
            return next;
        });
        setPendingItems(prev => prev.slice(1));
    };

    const discardPendingItem = () => {
        setPendingItems(prev => prev.slice(1));
    };

    const discardInventoryItem = (indices) => {
        const idxSet = new Set(Array.isArray(indices) ? indices : [indices]);
        setInventory(prev => prev.filter((_, i) => !idxSet.has(i)));
    };

    /** Debug: add items directly to inventory */
    const debugAddItem = (itemDef, count) => {
        const makeItem = () => itemDef.isSticker
            ? { name: itemDef.name, icon: itemDef.icon, stickerId: itemDef.id, isSticker: true, uid: generateUID() }
            : { id: itemDef.id, name: itemDef.name, icon: itemDef.icon, stars: itemDef.stars, isOutOfGame: true, uid: generateUID() };

        const toInventory = [];
        const toPending = [];
        for (let i = 0; i < count; i++) {
            if (usedCapacity + toInventory.length < maxInventorySize) {
                toInventory.push(makeItem());
            } else {
                toPending.push(makeItem());
            }
        }
        if (toInventory.length > 0) setInventory(prev => [...prev, ...toInventory]);
        if (toPending.length > 0) setPendingItems(prev => [...prev, ...toPending]);
    };

    // =============================================
    // EVACUATION & GAME OVER
    // =============================================

    /** Evacuate — resolve slot cards and finish evacuation flow */
    const evacuate = () => {
        if (!canEvacuate) return;
        // Resolve slot cards (profit cards convert rewards, etc.)
        resolveSlotCardsAtEvacuation();
        // Finish evacuation with current inventory
        finishEvacuation(inventory, 'evacuated');
    };

    /** Collect out-of-game items from inventory */
    const collectItems = (items) => {
        const outOfGameItems = items.filter(i => i.isOutOfGame);
        return { outOfGameItems };
    };

    /** Complete evacuation */
    const finishEvacuation = (finalInventory, modalType = 'evacuated') => {
        const { outOfGameItems } = collectItems(finalInventory);
        setExpeditionScores(prev => [...prev, { items: outOfGameItems }]);
        setModalContent(modalType);
        setPhase('game_over');
    };

    /** Remove any encounter from the revealed area.
     *  type: 'pool' | 'danger_wall' | 'score_order'
     *  id: uid of the encounter to remove
     */
    const removeEncounter = (type, id) => {
        if (type === 'danger_wall') {
            // Remove danger wall — costs 1 life
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                    showToast(`\uD83D\uDC80 ${t('\u751F\u547D\u8017\u5C3D')}! ${t('\u5931\u53BB\u4E86\u5168\u90E8\u7269\u54C1')}`, 'warning');
                    setInventory([]);
                    setTimeout(() => finishEvacuation([], 'game_over'), 500);
                } else {
                    showToast(`\uD83D\uDC80 ${t('\u79FB\u9664\u5371\u9669')} -1 \u2764\uFE0F`, 'warning');
                }
                return Math.max(0, newLives);
            });
            setDangerWalls(prev => prev.filter(d => d.id !== id));
        } else if (type === 'score_order') {
            // Remove score order — no penalty
            setScoreOrderEncounters(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleGameOver = () => {
        setInventory([]);
        setExpeditionScores(prev => [...prev, { items: [] }]);
        setModalContent('game_over');
        setPhase('game_over');
    };

    const handleReset = () => {
        setTurnNumber(0);
        setPhase('pre_game');
        setMatrix(null);
        setCurrentPool(null);
        setRevealedPools([]);
        setDisplayedProfitCards([]);
        setActionPoints(AP_CONFIG.maxAP);
        setDoomCounter(0);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setHp(doomConfig.initialHP);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setPendingFlippedPool(null);
        setExpeditionNumber(0);
        setExpeditionScores([]);
        setBonusItems([]);
        setCompletedOrderIds([]);
        // Risk / heat system reset
        setRisk(RISK_CONFIG.RISK_FLOOR);
        setWallDepth(0);
        setLives(RISK_CONFIG.INITIAL_LIVES);
        setTurnHeat(0);
        setCumulativeExposure(0);
        setDangerWalls([]);
        setScoreOrderEncounters([]);
        setSlotCards([]);
    };

    const startNextExpedition = () => {
        setTurnNumber(0);
        setMatrix(null);
        setCurrentPool(null);
        setRevealedPools([]);
        setDisplayedProfitCards([]);
        setActionPoints(AP_CONFIG.maxAP);
        setDoomCounter(0);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setHp(doomConfig.initialHP);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setPendingFlippedPool(null);
        setCompletedOrderIds([]);
        // Risk / heat system reset
        setRisk(RISK_CONFIG.RISK_FLOOR);
        setWallDepth(0);
        setLives(RISK_CONFIG.INITIAL_LIVES);
        setTurnHeat(0);
        setCumulativeExposure(0);
        setDangerWalls([]);
        setScoreOrderEncounters([]);

        // No evacuation card — passive sticker count check
        setSlotCards([]);

        setPhase('pre_game');
    };

    // =============================================
    // UTILITY
    // =============================================

    const showToast = (message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
    };

    const clearToast = () => {
        setToast(null);
    };

    // =============================================
    // RETURN
    // =============================================

    return {
        // Expedition state
        expeditionNumber,
        expeditionScores,
        expeditionConfig,
        bonusItems,

        // Turn state
        turnNumber,
        phase,

        // AP
        actionPoints,
        maxAP: AP_CONFIG.maxAP,
        apDrawCost: AP_CONFIG.drawCost,

        // Wall Shop
        revealedPools,
        displayedProfitCards,
        canRefreshWalls,
        refreshWalls,
        enterPool,
        exitPool,
        canEnterPool,
        takeDisplayCard,
        canTakeCard,

        // Pool state
        currentPool,
        drawLimitReached,
        enterDangerWall,
        exitDangerWallView,
        pendingFlippedPool,
        resolvePoolOverflow,

        // Order Area
        canFlipOrder,
        flipOrder,

        // Growth orders
        growthOrdersView,
        completedOrderIds,
        submitGrowthOrder,

        // Score orders
        scoreOrderEncounters,
        submitScoreOrder,

        // Slot cards (passive matching)
        slotCards,
        profitCards,
        dangerCards: dangerCards_slot,
        canEvacuate,
        satisfiedProfitCount,
        evacuationProfitRequirement: EVACUATION_PROFIT_REQUIREMENT,
        addSlotCard,
        checkDangerCards,
        resolveSlotCardsAtEvacuation,
        removeSlotCard,
        evacuate,

        // Doom (legacy)
        doomCounter,
        hp,

        // Risk / heat system
        risk,
        lives,
        wallDepth,
        turnHeat,
        cumulativeExposure,
        dangerWalls,
        nextDrawRiskIncrement,

        removeEncounter,

        // Grid
        matrix,
        lastDrawResult,
        lastDrawDirection,
        drawCount,
        totalDrawCount,
        canDraw,

        // Draw animation
        drawAnimState,
        isDrawAnimating,

        // Inventory
        inventory,
        maxInventorySize,
        usedCapacity,
        freeCapacity,
        pendingItem,
        pendingItems,

        // UI
        toast,
        clearToast,
        modalContent,
        flyingItem,
        setFlyingItem,

        // Actions
        startGame,
        selectRow,
        selectColumn,
        endTurn,
        handleReset,
        startNextExpedition,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        discardPendingItem,
        debugAddItem,
    };
};
