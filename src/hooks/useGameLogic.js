import { useState, useMemo } from 'react';
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES } from '../data/v2Config';
import { WALL_COLORS, UNLOCK_TEMPLATES, DOOM_PHASES, DOOM_RESOLUTION_DRAWS, V3_INITIAL_STATE } from '../data/v3Config';

import { useLanguage } from '../contexts/LanguageContext';

// =============================================
// HELPER FUNCTIONS
// =============================================

function generateUID() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
}

function pickWeightedTemplate() {
    const total = ORDER_TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of ORDER_TEMPLATES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return ORDER_TEMPLATES[0];
}

function generateOrder() {
    const template = pickWeightedTemplate();
    // Pick a random out-of-game item for each reward tier
    const rewards = template.rewardTiers.map(tierScore => {
        const matching = OUT_OF_GAME_ITEMS.filter(i => i.score === tierScore);
        return { ...matching[Math.floor(Math.random() * matching.length)] };
    });
    const totalScore = rewards.reduce((s, r) => s + r.score, 0);
    // Generate sticker requirements
    const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
    const selectedTypes = shuffledStickers.slice(0, template.stickerTypes);
    const requirements = [];
    let remaining = template.totalStickers;
    for (let i = 0; i < selectedTypes.length; i++) {
        const count = i === selectedTypes.length - 1
            ? remaining
            : 1 + Math.floor(Math.random() * (remaining - (selectedTypes.length - i - 1)));
        requirements.push({ stickerId: selectedTypes[i].id, icon: selectedTypes[i].icon, name: selectedTypes[i].name, count });
        remaining -= count;
    }
    return { id: generateUID(), difficulty: template.difficulty, rewards, totalScore, requirements };
}

export const useGameLogic = (config) => {
    const { t } = useLanguage();

    // --- Configuration ---
    const doomConfig = config.doom || DOOM_CONFIG;
    const turnConfig = config.turn || TURN_CONFIG;
    const orderConfig = config.order || { bulletinCapacity: 5, maxActive: 3, newPerTurn: 1, initialCount: 2 };
    const expeditionConfig = config.expedition || { expeditionCount: 3, scoreToWin: 30 };
    const maxInventorySize = config.inventorySize || config.stages[0].inventorySize;

    // --- Expedition State ---
    const [expeditionNumber, setExpeditionNumber] = useState(0);
    const [expeditionScores, setExpeditionScores] = useState([]);
    const [totalScore, setTotalScore] = useState(0);
    const [bonusItems, setBonusItems] = useState([]); // 3 random item IDs that give +1 bonus per game

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [gold, setGold] = useState(0);
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'wall_choice' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);
    const [wallCandidates, setWallCandidates] = useState(null);
    const [currentWallType, setCurrentWallType] = useState(null);
    const [lastDrawDirection, setLastDrawDirection] = useState(null);
    const [currentWallColor, setCurrentWallColor] = useState(null);

    // --- Draw Count State ---
    const [drawCount, setDrawCount] = useState(0);          // draws on current wall
    const [totalDrawCount, setTotalDrawCount] = useState(0); // total draws this expedition
    const [refreshCount, setRefreshCount] = useState(V3_INITIAL_STATE.refreshCount);

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    const [isDoomResolving, setIsDoomResolving] = useState(false);
    const [doomAnimState, setDoomAnimState] = useState(null);
    const [doomResolutionResult, setDoomResolutionResult] = useState(null);
    const [afterDoomAction, setAfterDoomAction] = useState(null); // null | 'end_turn'

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);

    // --- Inventory Pending Queue ---
    const [pendingItems, setPendingItems] = useState([]); // queue of items awaiting placement when inventory full

    // --- Order State ---
    const [bulletinBoard, setBulletinBoard] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);

    // --- Incoming Order (flies to bulletin between turns) ---
    const [incomingOrder, setIncomingOrder] = useState(null);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [flyingItem, setFlyingItem] = useState(null);
    const [drawAnimState, setDrawAnimState] = useState(null);
    // { direction: 'row'|'column', rowIndex, colIndex, activeCols, finalColIndex, finalRowIndex, finalHighlight, drawnCell, tick, totalTicks, currentHighlight, phase: 'scanning'|'settled' }

    // --- Derived State ---
    const dangerCount = useMemo(() =>
        doomGrid.filter(cell => cell.type === 'danger').length,
        [doomGrid]
    );

    // --- v3 Doom Helpers ---
    const getDoomDraws = (turn) => {
        for (const entry of DOOM_RESOLUTION_DRAWS) {
            if (turn >= entry.turnRange[0] && turn <= entry.turnRange[1]) return entry.draws;
        }
        return 3;
    };

    // --- v3 Wall Candidate Generation ---
    const wallColorValues = Object.values(WALL_COLORS);

    const generateWallCandidates = () => {
        const candidates = [];
        for (let i = 0; i < 3; i++) {
            const wallColor = wallColorValues[Math.floor(Math.random() * wallColorValues.length)];
            const stickerRange = wallColor.stickerRange || [2, 4];
            const stickers = pickWallStickers(STICKER_TYPES, stickerRange[0], stickerRange[1]);

            // Build the baseDistribution wrapper that generateWall expects
            const evacuationBase = wallColor.evacuationRange
                ? (wallColor.evacuationRange[0] + wallColor.evacuationRange[1]) / 2
                : 0;
            const wallColorForGen = {
                baseDistribution: {
                    sticker: wallColor.sticker,
                    gold: wallColor.gold,
                    negative: wallColor.negative,
                    evacuation: evacuationBase,
                },
                negativeBreakdown: wallColor.negativeBreakdown,
            };

            const { grid, cellCounts } = generateWall(stickers, wallColorForGen);

            // Generate unlock condition
            const templates = Math.random() < 0.5 ? UNLOCK_TEMPLATES.drawOnly : UNLOCK_TEMPLATES.drawAndGold;
            const unlock = { ...templates[Math.floor(Math.random() * templates.length)] };

            candidates.push({ stickers, grid, cellCounts, wallColor, unlockCondition: unlock });
        }
        return candidates;
    };

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start a new turn: generate grid */
    const startNewTurn = () => {
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setLastDrawResult(null);
        setDoomResolutionResult(null);

        // Doom accumulation — phase-based (not on first turn)
        if (newTurnNumber > 1) {
            const doomPhase = DOOM_PHASES.find(p => newTurnNumber >= p.turnRange[0] && newTurnNumber <= p.turnRange[1]);
            if (doomPhase && doomPhase.interval !== Infinity) {
                const turnsInPhase = newTurnNumber - doomPhase.turnRange[0];
                if (turnsInPhase % doomPhase.interval === 0) {
                    setDoomGrid(prev => {
                        const newGrid = [...prev];
                        for (let i = 0; i < newGrid.length; i++) {
                            if (newGrid[i].type === 'empty') {
                                newGrid[i] = { type: 'danger' };
                                break;
                            }
                        }
                        return newGrid;
                    });
                }
            }
        }

        // Reset draw direction
        setLastDrawDirection(null);

        // 3-choose-1 wall selection with colors and unlock conditions
        setWallCandidates(generateWallCandidates());
        setPhase('wall_choice');
    };

    /** Start the game (first turn) */
    const startGame = () => {
        // Pick bonus items on first expedition of a new game
        if (expeditionNumber === 0) {
            const shuffled = [...OUT_OF_GAME_ITEMS].sort(() => Math.random() - 0.5);
            const bonusValues = [1, 2, 3];
            setBonusItems(shuffled.slice(0, 3).map((item, i) => ({ ...item, bonusValue: bonusValues[i] })));
        }
        setExpeditionNumber(prev => prev + 1);
        // v3 initial economy
        setGold(V3_INITIAL_STATE.gold);
        setRefreshCount(V3_INITIAL_STATE.refreshCount);
        setDrawCount(0);
        setTotalDrawCount(0);
        // Seed initial bulletin with unique reward combinations
        const initial = [];
        const usedKeys = new Set();
        const targetCount = orderConfig.initialCount;
        let attempts = 0;
        while (initial.length < targetCount && attempts < 50) {
            const order = generateOrder();
            const key = order.rewards.map(r => r.id).sort().join(',');
            if (!usedKeys.has(key)) {
                usedKeys.add(key);
                initial.push(order);
            }
            attempts++;
        }
        setBulletinBoard(initial);
        startNewTurn();
    };

    /** End current turn: resolve doom once, then go to between-turns decision */
    const endTurn = () => {
        resolveDoom('end_turn');
    };

    /** Continue to next turn — show incoming order first, then wall choice */
    const continueToNextTurn = () => {
        setIncomingOrder(generateOrder());
        setPhase('incoming_order');
    };

    /** Check if a wall candidate can be unlocked (draws + gold requirements) */
    const canUnlockWall = (candidate) => {
        const cond = candidate.unlockCondition;
        if (cond.draws && drawCount < cond.draws) return false;
        if (cond.gold && gold < cond.gold) return false;
        return true;
    };

    /** Select one of the wall candidates to play with */
    const selectWall = (index) => {
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        if (!canUnlockWall(chosen)) return;

        // Pay gold cost if any
        if (chosen.unlockCondition.gold) {
            setGold(prev => prev - chosen.unlockCondition.gold);
        }

        setCurrentWallColor(chosen.wallColor);
        setCurrentWallType(null);  // keep for compat, will be null
        setMatrix(chosen.grid);
        setWallCandidates(null);
        setDrawCount(0);  // reset per-wall draw count
        setPhase('drawing');
    };

    /** Refresh wall candidates (limited uses per expedition) */
    const refreshWallCandidates = () => {
        if (refreshCount <= 0) return;
        setRefreshCount(prev => prev - 1);
        setWallCandidates(generateWallCandidates());
    };

    // =============================================
    // DRAW MECHANIC
    // =============================================

    const isDrawAnimating = drawAnimState !== null;

    /** Select a row — starts scanning animation, then resolves */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing') return;
        if (isDoomResolving || isDrawAnimating) return;
        if (!matrix || !matrix[rowIndex]) return;

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        const row = matrix[rowIndex];
        const activeCols = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null) activeCols.push(colIndex);
        });
        if (activeCols.length === 0) return;

        // v3: free draws — increment draw counts
        setDrawCount(prev => prev + 1);
        setTotalDrawCount(prev => prev + 1);

        // Pre-determine result
        const finalColIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = row[finalColIndex];

        // Calculate total ticks: cycle through active cells multiple times, end on finalColIndex
        const finalIdx = activeCols.indexOf(finalColIndex);
        // At least 2 full passes + land on final
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

    /** Select a column — starts scanning animation top-to-bottom, then resolves */
    const selectColumn = (colIndex) => {
        if (phase !== 'drawing') return;
        if (isDoomResolving || isDrawAnimating) return;
        if (!matrix) return;

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        // activeCols here are actually active row indices for this column
        const activeCols = [];
        matrix.forEach((row, rowIndex) => {
            if (row[colIndex] !== null) activeCols.push(rowIndex);
        });
        if (activeCols.length === 0) return;

        // v3: free draws — increment draw counts
        setDrawCount(prev => prev + 1);
        setTotalDrawCount(prev => prev + 1);

        // Pre-determine result: pick a random row from active rows
        const finalRowIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = matrix[finalRowIndex][colIndex];

        // Calculate total ticks: 1 full pass + landing on finalRowIndex
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

    /** Advance draw scanning animation — sequential through active cells */
    const tickDrawAnim = () => {
        setDrawAnimState(prev => {
            if (!prev || prev.phase !== 'scanning') return prev;
            const newTick = prev.tick + 1;
            if (newTick >= prev.totalTicks) {
                return { ...prev, tick: newTick, currentHighlight: prev.finalHighlight, phase: 'settled' };
            }
            // Cycle through activeCols
            const next = prev.activeCols[newTick % prev.activeCols.length];
            return { ...prev, tick: newTick, currentHighlight: next };
        });
    };

    /** Apply draw result after animation settles */
    const completeDrawAnim = () => {
        if (!drawAnimState) return;
        const { direction, finalRowIndex, finalColIndex, drawnCell } = drawAnimState;

        // Track draw direction
        setLastDrawDirection(direction);

        const mult = drawnCell.multiplier || 1;
        let obtainedItem = null;
        const doomEffects = { resolutions: 0 };
        let isEvacuationOffer = false;

        if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'doom_resolution') {
            doomEffects.resolutions = 1 * mult;
        } else if (drawnCell.type === 'doom_accumulation') {
            setDoomGrid(prev => {
                const newGrid = [...prev];
                for (let i = 0; i < newGrid.length; i++) {
                    if (newGrid[i].type === 'empty') {
                        newGrid[i] = { type: 'danger' };
                        break;
                    }
                }
                return newGrid;
            });
            showToast(t('厄运积累') + ' +1', 'warning');
        } else if (drawnCell.type === 'damage') {
            setHp(prev => {
                const newHp = Math.max(0, prev - 1);
                if (newHp <= 0) {
                    handleGameOver();
                }
                return newHp;
            });
            showToast('💥 -1 HP', 'error');
        } else if (drawnCell.type === 'evacuation') {
            isEvacuationOffer = true;
            showToast(t('撤离机会'), 'info');
        } else if (drawnCell.type === 'gold') {
            const goldGain = drawnCell.goldAmount * mult;
            setGold(prev => prev + goldGain);
            showToast(`${t('金币')} +${goldGain}${mult > 1 ? ' (\u00d7' + mult + ')' : ''}`, 'success');
        }

        // Remove drawn cell(s) from matrix
        setMatrix(prev => {
            const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));

            // Remove drawn cell(s)
            if (drawnCell.groupId) {
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

            return newMatrix;
        });

        if (obtainedItem) {
            setFlyingItem({
                icon: obtainedItem.item.icon,
                name: obtainedItem.item.name,
                shapeSize: obtainedItem.shapeSize || 1,
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                id: Date.now(),
            });
            addToInventory(obtainedItem);
        }

        if (doomEffects.resolutions > 0) {
            for (let i = 0; i < doomEffects.resolutions; i++) {
                resolveDoom();
            }
        }

        setLastDrawResult({
            rowIndex: finalRowIndex,
            colIndex: finalColIndex,
            obtained: obtainedItem,
            doomEffects,
            isEvacuationOffer,
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
                score: itemCell.item.score,
                isOutOfGame: true,
                uid: itemCell.uid,
            };
        } else {
            // Legacy 'item' type
            newItem = {
                name: itemCell.item.name,
                icon: itemCell.item.icon,
                poolId: itemCell.item.poolId,
                uid: itemCell.uid,
            };
        }
        if (inventory.length >= maxInventorySize) {
            setPendingItems(prev => [...prev, newItem]);
            return;
        }
        setInventory(prev => [...prev, newItem]);
    };

    // Current pending item is the first in queue
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
            : { id: itemDef.id, name: itemDef.name, icon: itemDef.icon, score: itemDef.score, isOutOfGame: true, uid: generateUID() };

        const toInventory = [];
        const toPending = [];
        for (let i = 0; i < count; i++) {
            if (inventory.length + toInventory.length < maxInventorySize) {
                toInventory.push(makeItem());
            } else {
                toPending.push(makeItem());
            }
        }
        if (toInventory.length > 0) setInventory(prev => [...prev, ...toInventory]);
        if (toPending.length > 0) setPendingItems(prev => [...prev, ...toPending]);
    };

    // =============================================
    // ORDER SYSTEM
    // =============================================

    /** Queue a new order as incoming (player must manually accept/discard) */
    const addBulletinOrder = () => {
        setIncomingOrder(generateOrder());
    };

    /** Resolve incoming order and proceed to wall choice */
    const resolveIncomingAndProceed = () => {
        setIncomingOrder(null);
        if (phase === 'incoming_order') {
            startNewTurn();
        }
    };

    /** Accept the incoming order into the bulletin board */
    const confirmIncomingOrder = () => {
        if (!incomingOrder) return;
        if (bulletinBoard.length >= orderConfig.bulletinCapacity) {
            // Bulletin full — need to replace, handled by replaceBulletinOrder
            return;
        }
        setBulletinBoard(prev => [...prev, incomingOrder]);
        resolveIncomingAndProceed();
    };

    /** Replace a bulletin order with the incoming one (when bulletin is full) */
    const replaceBulletinOrder = (orderId) => {
        if (!incomingOrder) return;
        setBulletinBoard(prev => prev.map(o => o.id === orderId ? incomingOrder : o));
        resolveIncomingAndProceed();
    };

    /** Discard the incoming order */
    const discardIncomingOrder = () => {
        resolveIncomingAndProceed();
    };

    // --- Pending accept for replace flow ---
    const [pendingAcceptOrder, setPendingAcceptOrder] = useState(null);

    /** Move an order from bulletin board to active orders */
    const acceptOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;
        if (activeOrders.length >= orderConfig.maxActive) {
            // Full — enter replace mode
            setPendingAcceptOrder(order);
            return;
        }
        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        setActiveOrders(prev => [...prev, order]);
    };

    /** Replace an active order with the pending one */
    const confirmReplaceOrder = (activeOrderId) => {
        if (!pendingAcceptOrder) return;
        setBulletinBoard(prev => prev.filter(o => o.id !== pendingAcceptOrder.id));
        setActiveOrders(prev => prev.map(o =>
            o.id === activeOrderId ? pendingAcceptOrder : o
        ));
        setPendingAcceptOrder(null);
    };

    /** Cancel the pending accept */
    const cancelReplaceOrder = () => {
        setPendingAcceptOrder(null);
    };

    /** Check if player has required stickers to submit an order */
    const canSubmitOrder = (orderId) => {
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) return false;
        const stickerCounts = {};
        for (const item of inventory) {
            if (item.isSticker && item.stickerId) {
                stickerCounts[item.stickerId] = (stickerCounts[item.stickerId] || 0) + 1;
            }
        }
        return order.requirements.every(req => (stickerCounts[req.stickerId] || 0) >= req.count);
    };

    /** Submit a completed order: consume stickers, add reward to inventory */
    const submitOrder = (orderId) => {
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) return;
        if (!canSubmitOrder(orderId)) {
            showToast(t('贴纸不足'), 'warning');
            return;
        }

        // Remove required stickers from inventory
        const toRemove = {};
        for (const req of order.requirements) {
            toRemove[req.stickerId] = (toRemove[req.stickerId] || 0) + req.count;
        }
        setInventory(prev => {
            const remaining = [...prev];
            for (const [stickerId, count] of Object.entries(toRemove)) {
                let removed = 0;
                for (let i = remaining.length - 1; i >= 0 && removed < count; i--) {
                    if (remaining[i].isSticker && remaining[i].stickerId === stickerId) {
                        remaining.splice(i, 1);
                        removed++;
                    }
                }
            }
            // Add all reward items
            for (const reward of order.rewards) {
                remaining.push({
                    id: reward.id,
                    name: reward.name,
                    icon: reward.icon,
                    score: reward.score,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
            return remaining;
        });

        // Remove order from active
        setActiveOrders(prev => prev.filter(o => o.id !== orderId));
        showToast(t('订单完成'), 'success');
    };

    // =============================================
    // DOOM RESOLUTION
    // =============================================

    /** Start animated doom resolution */
    const resolveDoom = (action = null) => {
        if (action) setAfterDoomAction(action);

        // v3: draw count based on current turn number
        const draws = getDoomDraws(turnNumber);

        // Pre-calculate final selections
        const finalSelections = [];
        let hpLoss = 0;
        for (let i = 0; i < draws; i++) {
            const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
            const isHit = doomGrid[cellIndex].type === 'danger';
            if (isHit) hpLoss++;
            finalSelections.push({ index: cellIndex, isHit });
        }

        // Start with random spinning positions
        const spinningPositions = finalSelections.map(() =>
            Math.floor(Math.random() * doomConfig.gridSize)
        );

        setIsDoomResolving(true);
        setDoomAnimState({
            phase: 'spinning',
            tick: 0,
            totalTicks: 12,
            spinningPositions,
            finalSelections,
            hpLoss,
        });
    };

    /** Advance doom animation by one tick (called by GameCore interval) */
    const tickDoomResolution = () => {
        setDoomAnimState(prev => {
            if (!prev || prev.phase !== 'spinning') return prev;
            const newTick = prev.tick + 1;

            const newPositions = prev.spinningPositions.map((pos, i) => {
                const settleAt = prev.totalTicks - prev.finalSelections.length + i;
                if (newTick >= settleAt) return prev.finalSelections[i].index;
                return Math.floor(Math.random() * doomConfig.gridSize);
            });

            if (newTick >= prev.totalTicks) {
                return { ...prev, phase: 'settled', spinningPositions: newPositions, tick: newTick };
            }
            return { ...prev, spinningPositions: newPositions, tick: newTick };
        });
    };

    /** Apply doom results after animation completes */
    const completeDoomResolution = () => {
        if (!doomAnimState) return;
        const { hpLoss, finalSelections } = doomAnimState;

        if (hpLoss > 0) {
            const newHp = Math.max(0, hp - hpLoss);
            setHp(newHp);
            showToast(t('厄运命中') + ` -${hpLoss} HP`, 'error');
            if (newHp <= 0) {
                setDoomAnimState(null);
                setIsDoomResolving(false);
                setAfterDoomAction(null);
                handleGameOver();
                return;
            }
        }

        setDoomResolutionResult({
            hits: finalSelections.map(s => ({ index: s.index, result: s.isHit ? 'danger' : 'empty' })),
            hpLoss,
        });
        setDoomAnimState(null);
        setIsDoomResolving(false);

        if (afterDoomAction === 'end_turn') {
            setAfterDoomAction(null);
            setPhase('between_turns');
        }
    };

    // =============================================
    // EVACUATION & GAME OVER
    // =============================================

    const handleEvacuate = () => {
        const outOfGameItems = inventory.filter(i => i.isOutOfGame);
        const bonusMap = new Map(bonusItems.map(b => [b.id, b.bonusValue || 2]));
        const baseScore = outOfGameItems.reduce((sum, item) => sum + (item.score || 0), 0);
        const bonusScore = outOfGameItems.reduce((sum, item) => sum + (bonusMap.get(item.id) || 0), 0);
        const score = baseScore + bonusScore;
        setExpeditionScores(prev => [...prev, { score, baseScore, bonusScore, items: outOfGameItems }]);
        setTotalScore(prev => prev + score);
        setModalContent('evacuated');
        setPhase('game_over');
    };

    const handleGameOver = () => {
        setInventory([]);
        setExpeditionScores(prev => [...prev, { score: 0, items: [] }]);
        setModalContent('game_over');
        setPhase('game_over');
    };

    const handleReset = () => {
        setTurnNumber(0);
        setGold(0);
        setPhase('pre_game');
        setMatrix(null);
        setWallCandidates(null);
        setCurrentWallType(null);
        setCurrentWallColor(null);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setRefreshCount(V3_INITIAL_STATE.refreshCount);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setIsDoomResolving(false);
        setDoomAnimState(null);
        setDoomResolutionResult(null);
        setAfterDoomAction(null);
        setInventory([]);
        setBulletinBoard([]);
        setActiveOrders([]);
        setPendingAcceptOrder(null);
        setIncomingOrder(null);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setExpeditionNumber(0);
        setExpeditionScores([]);
        setTotalScore(0);
        setBonusItems([]);
    };

    /** Reset per-expedition state but keep meta state, return to pre_game */
    const startNextExpedition = () => {
        setTurnNumber(0);
        setGold(0);
        setMatrix(null);
        setWallCandidates(null);
        setCurrentWallType(null);
        setCurrentWallColor(null);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setRefreshCount(V3_INITIAL_STATE.refreshCount);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setIsDoomResolving(false);
        setDoomAnimState(null);
        setDoomResolutionResult(null);
        setAfterDoomAction(null);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setBulletinBoard([]);
        setActiveOrders([]);
        setPendingAcceptOrder(null);
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
        totalScore,
        expeditionConfig,
        bonusItems,

        // Turn state
        turnNumber,
        gold,
        phase,

        // Grid
        matrix,
        wallCandidates,
        lastDrawResult,
        currentWallType,
        currentWallColor,
        lastDrawDirection,

        // v3 draw/economy state
        drawCount,
        totalDrawCount,
        refreshCount,
        canUnlockWall,
        refreshWallCandidates,
        getDoomDraws,

        // Doom
        hp,
        doomGrid,
        dangerCount,
        isDoomResolving,
        doomAnimState,
        doomResolutionResult,

        // Inventory
        inventory,
        maxInventorySize,
        pendingItem,
        pendingItems,

        // Orders
        bulletinBoard,
        activeOrders,

        // UI
        toast,
        clearToast,
        modalContent,
        flyingItem,
        setFlyingItem,
        drawAnimState,
        isDrawAnimating,

        // Actions
        startGame,
        selectRow,
        selectColumn,
        endTurn,
        continueToNextTurn,
        selectWall,
        handleEvacuate,
        handleReset,
        startNextExpedition,
        tickDoomResolution,
        completeDoomResolution,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        debugAddItem,
        discardPendingItem,
        acceptOrder,
        submitOrder,
        canSubmitOrder,
        incomingOrder,
        confirmIncomingOrder,
        discardIncomingOrder,
        replaceBulletinOrder,
        pendingAcceptOrder,
        confirmReplaceOrder,
        cancelReplaceOrder,
    };
};
