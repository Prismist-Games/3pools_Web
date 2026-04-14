import { useState } from 'react';
import { generatePoolGrid, applyGravityAndRefill } from '../utils/matrixHelpers';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { V3_INITIAL_STATE, AP_CONFIG } from '../data/v3Config';
import { POOL_TYPES, generateWallShop, buildBiasedStickerWeights } from '../data/poolTypes';
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
    const expeditionConfig = config.expedition || { expeditionCount: 3 };
    const baseInventorySize = config.inventorySize ?? 10;
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

    // --- Lives ---
    const INITIAL_LIVES = 5;
    const [lives, setLives] = useState(INITIAL_LIVES);

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

    // --- 印花墙 per-instance biased stickers ---
    // Each 印花墙 card in the deck carries its own independently-rolled 2-id bias pair
    // (stored on the pool type as `_bias`). No global state needed — bias travels with
    // the pool instance through deck → revealed → current → discard.

    // --- Derived State ---
    const isDrawAnimating = drawAnimState !== null;
    const drawLimitReached = currentPool ? drawCount >= (currentPool.poolType?.drawLimit ?? Infinity) : false;
    const canDraw = actionPoints >= AP_CONFIG.drawCost && phase === 'drawing' && !drawLimitReached;
    const canRefreshWalls = actionPoints >= AP_CONFIG.refreshCost && phase === 'pool_selection';

    // =============================================
    // WALL SHOP
    // =============================================

    // --- Slot card constants ---
    const MAX_PROFIT_CARDS = 5;

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
        setDrawCount(0);
        setTotalDrawCount(0);
        setTurnNumber(1);

        // Reset lives
        setLives(INITIAL_LIVES);

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

    /** Start a new turn — reset AP, generate new danger cards */
    const startNextTurn = () => {
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

        // --- Normal wall draw handling ---
        if (drawnCell === null || drawnCell.type === 'blank') {
            showToast(t('\u7A7A\u683C'), 'info');
        } else if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'bomb') {
            // Bomb: destroy adjacent 8 cells
        }

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
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setExpeditionNumber(0);
        setExpeditionScores([]);
        setBonusItems([]);
        setLives(INITIAL_LIVES);
        setSlotCards([]);
    };

    const startNextExpedition = () => {
        setTurnNumber(0);
        setMatrix(null);
        setCurrentPool(null);
        setRevealedPools([]);
        setDisplayedProfitCards([]);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setLives(INITIAL_LIVES);

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

        // Lives
        lives,

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
