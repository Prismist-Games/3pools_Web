import { useState } from 'react';
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
import { getRowIndices, getColIndices, getDoomTarget, isLineFullyProtected, getNeighbors } from '../utils/fateWallHelpers';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { STICKER_TYPES, INGREDIENTS, ORDER_TEMPLATES, WALL_TYPES } from '../data/v2Config';
import { generateCharm, rollCharmType, CHARM_TYPES, UPGRADEABLE_CHARMS, CHARM_UPGRADE_MAP, CHARM_CONFIGS, NON_COPYABLE_CHARMS } from '../data/charms';

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

function pickWallType() {
    const total = WALL_TYPES.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of WALL_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return WALL_TYPES[0];
}

function generateOrder() {
    const template = pickWeightedTemplate();
    // Pick a random ingredient for each reward rarity tier
    const rewards = template.rewardTiers.map(tier => {
        const matching = INGREDIENTS.filter(i => i.rarity === tier);
        const picked = matching[Math.floor(Math.random() * matching.length)];
        return { ...picked, score: picked.rarity }; // score alias for backward compat
    });
    const totalScore = rewards.reduce((s, r) => s + r.rarity, 0);
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
    const orderConfig = config.order || { bulletinCapacity: 5, newPerTurn: 1, initialCount: 2 };
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

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);

    // --- Fate Wall State ---
    const [fateWall, setFateWall] = useState({ cells: Array(16).fill(null) });
    const [turnBonuses, setTurnBonuses] = useState({ draws: 0, orders: 0, stickers: 0 });
    const [pendingCharm, setPendingCharm] = useState(null);
    // null | { charm: CharmObject }

    // Luck phase state
    const [luckPhase, setLuckPhase] = useState('idle'); // 'idle' | 'selecting' | 'result'
    const [luckResult, setLuckResult] = useState(null);
    // luckResult: { charm, charmIndex, effectDescription }
    const [copyMirrorState, setCopyMirrorState] = useState(null);
    // null | { step: 'select_source', charmIndex, sourceOptions: number[] }
    //       | { step: 'select_target', charmIndex, sourceIndex, emptySlots: number[], newCharm }

    // Doom draw state
    const [doomDrawQueue, setDoomDrawQueue] = useState(0);
    const [doomDrawTotal, setDoomDrawTotal] = useState(0);
    const [doomDrawPhase, setDoomDrawPhase] = useState('idle'); // 'idle' | 'selecting' | 'result'
    const [doomDrawResult, setDoomDrawResult] = useState(null);
    // null | { hitIndex: number|null, blocked: boolean, hpLoss: number }
    const [afterDoomAction, setAfterDoomAction] = useState(null); // null | 'end_turn'
    const [doomDelayCount, setDoomDelayCount] = useState(0);

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);

    // --- Inventory Pending Queue ---
    const [pendingItems, setPendingItems] = useState([]); // queue of items awaiting placement when inventory full

    // --- Order State ---
    const [bulletinBoard, setBulletinBoard] = useState([]);
    // activeOrders removed — bulletinBoard is now the only order list

    // --- Incoming Order (flies to bulletin between turns) ---
    const [incomingOrder, setIncomingOrder] = useState(null);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [flyingItem, setFlyingItem] = useState(null);
    const [drawAnimState, setDrawAnimState] = useState(null);
    // { direction: 'row'|'column', rowIndex, colIndex, activeCols, finalColIndex, finalRowIndex, finalHighlight, drawnCell, tick, totalTicks, currentHighlight, phase: 'scanning'|'settled' }

    // Helper used in multiple places
    const createInitialFateWallCells = () => {
        const cells = Array(16).fill(null);
        for (const idx of [5, 6, 9, 10]) {
            cells[idx] = generateCharm(CHARM_TYPES.BLANK);
        }
        return cells;
    };

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start a new turn: generate grid, give gold */
    const startNewTurn = () => {
        setTurnBonuses({ draws: 0, orders: 0, stickers: 0 });
        setDoomDelayCount(0);
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setGold(turnConfig.goldPerTurn);
        setLastDrawResult(null);

        // Reset draw direction for alternating wall
        setLastDrawDirection(null);

        // 3-choose-1 wall selection — no duplicate wall types
        const candidates = [];
        const usedTypeIds = new Set();
        while (candidates.length < 3) {
            const wallType = pickWallType();
            if (usedTypeIds.has(wallType.id)) continue;
            usedTypeIds.add(wallType.id);
            const stickers = pickWallStickers(STICKER_TYPES);
            const { grid, doomCellCount } = generateWall(stickers);
            candidates.push({ stickers, grid, doomCellCount, wallType });
        }
        setWallCandidates(candidates);
        setPhase('wall_choice');
    };

    /** Start the game (first turn) */
    const startGame = () => {
        // Pick bonus items on first expedition of a new game
        if (expeditionNumber === 0) {
            const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
            const bonusValues = [1, 2, 3];
            setBonusItems(shuffled.slice(0, 3).map((item, i) => ({ ...item, bonusValue: bonusValues[i] })));
        }
        setExpeditionNumber(prev => prev + 1);
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
        setFateWall({ cells: createInitialFateWallCells() });
        setTurnBonuses({ draws: 0, orders: 0, stickers: 0 });
        startNewTurn();
    };

    /** End current turn: resolve doom once, then go to between-turns decision */
    const endTurn = () => {
        resolveDoom('end_turn');
    };

    /** Continue to next turn — show incoming order first (two candidates), then wall choice */
    const continueToNextTurn = () => {
        setIncomingOrder({ candidates: [generateOrder(), generateOrder()] });
        setPhase('incoming_order');
    };

    /** Select one of the wall candidates to play with */
    const selectWall = (index) => {
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        const wallType = chosen.wallType;
        setCurrentWallType(wallType);

        // Apply wall-type mutations to the grid before setting it
        const grid = chosen.grid.map(r => r.map(c => c ? { ...c } : null));

        if (wallType.id === 'hidden') {
            // Mark ~30% of groups/single cells as hidden (whole group hides together)
            const ratio = wallType.hiddenRatio || 0.3;
            const hiddenGroups = new Set();
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const cell = grid[r][c];
                    if (!cell || (cell.type !== 'sticker' && cell.type !== 'item')) continue;
                    if (cell.groupId && hiddenGroups.has(cell.groupId)) continue; // already decided
                    if (Math.random() < ratio) {
                        if (cell.groupId) {
                            hiddenGroups.add(cell.groupId);
                        } else {
                            cell.hidden = true;
                        }
                    }
                }
            }
            // Apply group hiding
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]?.groupId && hiddenGroups.has(grid[r][c].groupId)) {
                        grid[r][c].hidden = true;
                    }
                }
            }
        } else if (wallType.id === 'multiplier') {
            // Mark ~20% of cells with multiplier = 2
            const ratio = wallType.multiplierRatio || 0.2;
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const cell = grid[r][c];
                    if (cell && Math.random() < ratio) {
                        cell.multiplier = 2;
                    }
                }
            }
        }

        setMatrix(grid);
        setWallCandidates(null);
        setPhase('luck_draw');
        setLuckPhase('selecting');
    };

    // =============================================
    // DRAW MECHANIC
    // =============================================

    const isDrawAnimating = drawAnimState !== null;

    /** Select a row — starts scanning animation, then resolves */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing') return;
        if (isDrawAnimating) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;
        // Alternating wall: block consecutive row draws
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'row') return;

        setFlyingItem(null);
        setLastDrawResult(null);

        const row = matrix[rowIndex];
        const activeCols = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null) activeCols.push(colIndex);
        });
        if (activeCols.length === 0) return;

        setGold(prev => prev - turnConfig.drawCost);

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
        if (isDrawAnimating) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix) return;
        // Alternating wall: block consecutive column draws
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'column') return;

        setFlyingItem(null);
        setLastDrawResult(null);

        // activeCols here are actually active row indices for this column
        const activeCols = [];
        matrix.forEach((row, rowIndex) => {
            if (row[colIndex] !== null) activeCols.push(rowIndex);
        });
        if (activeCols.length === 0) return;

        setGold(prev => prev - turnConfig.drawCost);

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

        // Track draw direction for alternating wall
        setLastDrawDirection(direction);

        const mult = drawnCell.multiplier || 1;
        let obtainedItem = null;
        const doomEffects = { resolutions: 0, upgrades: 0 };

        if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'doom_resolution') {
            doomEffects.resolutions = 1 * mult;
        } else if (drawnCell.type === 'doom_upgrade') {
            doomEffects.upgrades = 1 * mult;
        } else if (drawnCell.type === 'gold') {
            const goldGain = drawnCell.goldAmount * mult;
            setGold(prev => prev + goldGain);
            showToast(`${t('金币')} +${goldGain}${mult > 1 ? ' (×' + mult + ')' : ''}`, 'success');
        } else if (drawnCell.type === 'order_cell') {
            addBulletinOrder();
            showToast(t('获得新订单'), 'info');
        } else if (drawnCell.type === 'bomb') {
            // Bomb: mark for adjacent destruction (handled in matrix update below)
        } else if (drawnCell.type === 'fate_cell') {
            const charmType = rollCharmType();
            const charm = generateCharm(charmType);
            setPendingCharm({ charm });
            showToast(`✨ ${t('获得幸运符')}: ${t(charm.type)}`, 'info');
        }

        // Remove drawn cell(s) + hidden reveal + drift shuffle
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

            // Bomb: destroy all adjacent cells (8 directions)
            if (drawnCell.type === 'bomb') {
                const bombDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                const destroyGroups = new Set();
                for (const [dr, dc] of bombDirs) {
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
                // Destroy entire groups touched by explosion
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

            // Hidden wall: reveal adjacent hidden cells (whole group reveals together)
            if (currentWallType?.id === 'hidden') {
                const revealGroups = new Set();
                const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                for (const [dr, dc] of dirs) {
                    const nr = finalRowIndex + dr;
                    const nc = finalColIndex + dc;
                    if (nr >= 0 && nr < newMatrix.length && nc >= 0 && nc < newMatrix[0].length) {
                        const neighbor = newMatrix[nr][nc];
                        if (neighbor?.hidden) {
                            if (neighbor.groupId) {
                                revealGroups.add(neighbor.groupId);
                            } else {
                                neighbor.hidden = false;
                            }
                        }
                    }
                }
                // Reveal entire groups
                if (revealGroups.size > 0) {
                    for (let r = 0; r < newMatrix.length; r++) {
                        for (let c = 0; c < newMatrix[r].length; c++) {
                            if (newMatrix[r][c]?.groupId && revealGroups.has(newMatrix[r][c].groupId)) {
                                newMatrix[r][c].hidden = false;
                            }
                        }
                    }
                }
            }

            // Drift wall: shuffle remaining non-null cells to random positions
            if (currentWallType?.id === 'drift') {
                const cells = [];
                const positions = [];
                for (let r = 0; r < newMatrix.length; r++) {
                    for (let c = 0; c < newMatrix[r].length; c++) {
                        if (newMatrix[r][c] !== null) {
                            cells.push(newMatrix[r][c]);
                            positions.push([r, c]);
                        }
                    }
                }
                // Shuffle cells array
                for (let i = cells.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [cells[i], cells[j]] = [cells[j], cells[i]];
                }
                // Clear all non-null positions
                for (const [r, c] of positions) {
                    newMatrix[r][c] = null;
                }
                // Redistribute: collect ALL positions (null and non-null)
                const allPositions = [];
                for (let r = 0; r < newMatrix.length; r++) {
                    for (let c = 0; c < newMatrix[r].length; c++) {
                        allPositions.push([r, c]);
                    }
                }
                // Shuffle all positions
                for (let i = allPositions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
                }
                // Place cells into first N shuffled positions
                for (let i = 0; i < cells.length; i++) {
                    const [r, c] = allPositions[i];
                    newMatrix[r][c] = cells[i];
                }
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
            // Multiplier: add to inventory multiple times for stickers
            if (mult > 1 && (obtainedItem.type === 'sticker' || obtainedItem.type === 'item')) {
                for (let i = 0; i < mult; i++) {
                    addToInventory({ ...obtainedItem, uid: generateUID() });
                }
            } else {
                addToInventory(obtainedItem);
            }
        }

        if (doomEffects.upgrades > 0) {
            setDoomLevel(prev => prev + doomEffects.upgrades);
            showToast(t('厄运升级') + ` +${doomEffects.upgrades}${mult > 1 ? ' (×' + mult + ')' : ''}`, 'warning');
        }

        if (doomEffects.resolutions > 0) {
            resolveDoom(null, doomLevel * doomEffects.resolutions);
        }

        setLastDrawResult({
            rowIndex: finalRowIndex,
            colIndex: finalColIndex,
            obtained: obtainedItem,
            doomEffects,
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
                ...itemCell.item,
                score: itemCell.item.rarity, // backward compat alias
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

    /** Synthesize: merge 2 identical items into the next rarity tier */
    const synthesizeItems = (index1, index2) => {
        const item1 = inventory[index1];
        const item2 = inventory[index2];
        if (!item1 || !item2 || item1.id !== item2.id) return false;

        // Find current item definition in INGREDIENTS
        const currentDef = INGREDIENTS.find(ing => ing.id === item1.id);
        if (!currentDef || currentDef.rarity >= 4) return false;

        // Find next rarity in same sub-category (match both tags)
        const subTag = currentDef.tags[1]; // e.g., '鸡'
        const mainTag = currentDef.tags[0]; // e.g., '肉类'
        const nextDef = INGREDIENTS.find(ing =>
            ing.tags[0] === mainTag && ing.tags[1] === subTag && ing.rarity === currentDef.rarity + 1
        );
        if (!nextDef) return false;

        // Remove 2 items, add 1 new item
        setInventory(prev => {
            const next = [...prev];
            // Remove higher index first to avoid shifting
            const [lo, hi] = index1 < index2 ? [index1, index2] : [index2, index1];
            next.splice(hi, 1);
            next.splice(lo, 1);
            // Add new item
            next.push({ ...nextDef, isOutOfGame: true, uid: generateUID() });
            return next;
        });

        showToast(`${t('合成成功')}: ${nextDef.icon} ${nextDef.name}`, 'success');
        return true;
    };

    /** Debug: add items directly to inventory */
    const debugAddItem = (itemDef, count) => {
        const makeItem = () => itemDef.isSticker
            ? { name: itemDef.name, icon: itemDef.icon, stickerId: itemDef.id, isSticker: true, uid: generateUID() }
            : { ...itemDef, score: itemDef.rarity || itemDef.score, isOutOfGame: true, uid: generateUID() };

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

    /** Queue a new order as incoming with two candidates (player picks one) */
    const addBulletinOrder = () => {
        setIncomingOrder({ candidates: [generateOrder(), generateOrder()] });
    };

    /** Resolve incoming order and proceed to wall choice */
    const resolveIncomingAndProceed = () => {
        setIncomingOrder(null);
        if (phase === 'incoming_order') {
            startNewTurn();
        }
    };

    /** Player picks one of the two incoming candidates. If shelf not full, add directly.
     *  If shelf is full, store the chosen order as pendingChosenOrder for replacement step. */
    const [pendingChosenOrder, setPendingChosenOrder] = useState(null);

    const confirmIncomingOrder = (chosenOrder) => {
        if (!incomingOrder) return;
        if (bulletinBoard.length >= orderConfig.bulletinCapacity) {
            // Shelf full — store chosen order, player must pick which to replace
            setPendingChosenOrder(chosenOrder);
            setIncomingOrder(null);
            return;
        }
        setBulletinBoard(prev => [...prev, chosenOrder]);
        resolveIncomingAndProceed();
    };

    /** Replace a shelf order with the pending chosen order (when shelf is full) */
    const replaceBulletinOrder = (orderId) => {
        if (!pendingChosenOrder) return;
        setBulletinBoard(prev => prev.map(o => o.id === orderId ? pendingChosenOrder : o));
        setPendingChosenOrder(null);
        resolveIncomingAndProceed();
    };

    /** Discard the incoming order (skip both candidates) */
    const discardIncomingOrder = () => {
        setPendingChosenOrder(null);
        resolveIncomingAndProceed();
    };

    /** Check if player has required stickers to submit an order (checks bulletinBoard) */
    const canSubmitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return false;
        const stickerCounts = {};
        for (const item of inventory) {
            if (item.isSticker && item.stickerId) {
                stickerCounts[item.stickerId] = (stickerCounts[item.stickerId] || 0) + 1;
            }
        }
        return order.requirements.every(req => (stickerCounts[req.stickerId] || 0) >= req.count);
    };

    /** Submit a completed order: consume stickers, add reward to inventory (from bulletinBoard) */
    const submitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
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
                    ...reward,
                    score: reward.rarity || reward.score,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
            return remaining;
        });

        // Remove order from shelf
        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        showToast(t('订单完成'), 'success');
    };

    // =============================================
    // DOOM RESOLUTION
    // =============================================

    const resolveDoom = (action = null, forceCount = null) => {
        if (action) setAfterDoomAction(action);
        const count = forceCount !== null
            ? forceCount
            : action === 'end_turn'
                ? Math.max(0, doomLevel - doomDelayCount)
                : doomLevel;
        if (count <= 0) {
            if (action === 'end_turn') setPhase('between_turns');
            return;
        }
        setDoomDrawQueue(count);
        setDoomDrawTotal(count);
        setDoomDrawPhase('selecting');
    };

    const handleDoomSelect = ({ direction, lineIndex }) => {
        if (doomDrawPhase !== 'selecting') return;

        const targetIndex = getDoomTarget(fateWall.cells, direction, lineIndex);
        const targetCell = fateWall.cells[targetIndex];

        let blocked = false;
        let hpLoss = 0;

        if (targetCell !== null) {
            blocked = true;
            removeCharm(targetIndex);
        } else {
            hpLoss = 1;
        }

        setDoomDrawResult({ hitIndex: targetIndex, blocked, hpLoss });
        setDoomDrawPhase('result');
    };

    const confirmDoomDraw = () => {
        const result = doomDrawResult;
        const hpLoss = result?.hpLoss ?? 0;
        let newHp = hp;

        if (hpLoss > 0) {
            newHp = Math.max(0, hp - hpLoss);
            setHp(newHp);
            showToast(`❤️ HP -${hpLoss}`, 'error');
        }

        setDoomDrawResult(null);
        const remaining = doomDrawQueue - 1;
        setDoomDrawQueue(remaining);

        if (newHp <= 0) {
            setDoomDrawPhase('idle');
            setDoomDrawQueue(0);
            setDoomDrawTotal(0);
            setAfterDoomAction(null);
            setDoomDelayCount(0);
            handleGameOver();
            return;
        }

        if (remaining > 0) {
            setDoomDrawPhase('selecting');
        } else {
            setDoomDrawPhase('idle');
            setDoomDelayCount(0);
            const action = afterDoomAction;
            setAfterDoomAction(null);
            if (action === 'end_turn') {
                setPhase('between_turns');
            }
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
        setLastDrawDirection(null);
        setHp(doomConfig.initialHP);
        setDoomLevel(doomConfig.initialDoomLevel);
        setInventory([]);
        setBulletinBoard([]);
        setPendingChosenOrder(null);
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
        setFateWall({ cells: createInitialFateWallCells() });
        setTurnBonuses({ draws: 0, orders: 0, stickers: 0 });
        setDoomDrawQueue(0);
        setDoomDrawTotal(0);
        setDoomDrawPhase('idle');
        setDoomDrawResult(null);
        setAfterDoomAction(null);
        setDoomDelayCount(0);
    };

    /** Reset per-expedition state but keep meta state, return to pre_game */
    const startNextExpedition = () => {
        setTurnNumber(0);
        setGold(0);
        setMatrix(null);
        setWallCandidates(null);
        setCurrentWallType(null);
        setLastDrawDirection(null);
        setHp(doomConfig.initialHP);
        setDoomLevel(doomConfig.initialDoomLevel);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setBulletinBoard([]);
        setPendingChosenOrder(null);
        setFateWall({ cells: createInitialFateWallCells() });
        setTurnBonuses({ draws: 0, orders: 0, stickers: 0 });
        setDoomDrawQueue(0);
        setDoomDrawTotal(0);
        setDoomDrawPhase('idle');
        setDoomDrawResult(null);
        setAfterDoomAction(null);
        setDoomDelayCount(0);
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
    // LUCK PHASE
    // =============================================

    const applyLuckEffect = (charm, charmIndex) => {
        const DRAW_CAP = 5;
        const ORDER_CAP = 3;
        const STICKER_CAP = 3;
        let effectDescription = '';

        // Catalyst check: +1 to numeric effects if at least 1 adjacent catalyst exists
        const hasCatalyst = getNeighbors(charmIndex).some(
            i => fateWall.cells[i]?.type === CHARM_TYPES.CATALYST
        );
        const catalystBonus = hasCatalyst ? 1 : 0;

        switch (charm.type) {
            case CHARM_TYPES.DRAW_COUNT: {
                const base = 1 + catalystBonus;
                const available = DRAW_CAP - turnBonuses.draws;
                const actual = Math.min(base, available);
                if (actual > 0) {
                    setGold(prev => prev + actual);
                    setTurnBonuses(prev => ({ ...prev, draws: prev.draws + actual }));
                    effectDescription = `+${actual} ${t('抽取次数')}${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('抽取次数上限');
                }
                break;
            }
            case CHARM_TYPES.STICKER: {
                const base = 1 + catalystBonus;
                const available = STICKER_CAP - turnBonuses.stickers;
                const actual = Math.min(base, available);
                if (actual > 0) {
                    for (let i = 0; i < actual; i++) {
                        const stickerTypes = [...STICKER_TYPES];
                        const picked = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
                        addToInventory({
                            type: 'sticker',
                            item: picked,
                            uid: Math.random().toString(36).substr(2, 9),
                        });
                    }
                    setTurnBonuses(prev => ({ ...prev, stickers: prev.stickers + actual }));
                    effectDescription = `+${actual} ${t('贴纸')}${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('贴纸上限');
                }
                break;
            }
            case CHARM_TYPES.ORDER: {
                const base = 1 + catalystBonus;
                const available = ORDER_CAP - turnBonuses.orders;
                const actual = Math.min(base, available);
                if (actual > 0) {
                    for (let i = 0; i < actual; i++) {
                        setBulletinBoard(prev => [...prev, generateOrder()]);
                    }
                    setTurnBonuses(prev => ({ ...prev, orders: prev.orders + actual }));
                    effectDescription = `+${actual} ${t('订单')}${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('订单上限');
                }
                break;
            }
            case CHARM_TYPES.COMPOUND: {
                const newGrowth = Math.min(4, charm.growthCount + 1);
                const base = newGrowth + catalystBonus;
                const available = DRAW_CAP - turnBonuses.draws;
                const actual = Math.min(base, available);
                setFateWall(prev => {
                    const newCells = [...prev.cells];
                    if (newCells[charmIndex]) {
                        newCells[charmIndex] = { ...newCells[charmIndex], growthCount: newGrowth };
                    }
                    return { cells: newCells };
                });
                if (actual > 0) {
                    setGold(prev => prev + actual);
                    setTurnBonuses(prev => ({ ...prev, draws: prev.draws + actual }));
                    effectDescription = `+${actual} ${t('抽取次数')} (复利 ×${newGrowth})${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('抽取次数上限');
                }
                break;
            }
            case CHARM_TYPES.COMPOUND_STICKER: {
                const newGrowth = Math.min(3, charm.growthCount + 1);
                const base = newGrowth + catalystBonus;
                const available = STICKER_CAP - turnBonuses.stickers;
                const actual = Math.min(base, available);
                setFateWall(prev => {
                    const newCells = [...prev.cells];
                    if (newCells[charmIndex]) {
                        newCells[charmIndex] = { ...newCells[charmIndex], growthCount: newGrowth };
                    }
                    return { cells: newCells };
                });
                for (let i = 0; i < actual; i++) {
                    const stickerTypes = [...STICKER_TYPES];
                    const picked = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
                    addToInventory({ type: 'sticker', item: picked, uid: Math.random().toString(36).substr(2,9) });
                }
                if (actual > 0) {
                    setTurnBonuses(prev => ({ ...prev, stickers: prev.stickers + actual }));
                    effectDescription = `+${actual} ${t('贴纸')} (复利 ×${newGrowth})${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('贴纸上限');
                }
                break;
            }
            case CHARM_TYPES.COMPOUND_ORDER: {
                const newGrowth = Math.min(3, charm.growthCount + 1);
                const base = newGrowth + catalystBonus;
                const available = ORDER_CAP - turnBonuses.orders;
                const actual = Math.min(base, available);
                setFateWall(prev => {
                    const newCells = [...prev.cells];
                    if (newCells[charmIndex]) {
                        newCells[charmIndex] = { ...newCells[charmIndex], growthCount: newGrowth };
                    }
                    return { cells: newCells };
                });
                for (let i = 0; i < actual; i++) {
                    setBulletinBoard(prev => [...prev, generateOrder()]);
                }
                if (actual > 0) {
                    setTurnBonuses(prev => ({ ...prev, orders: prev.orders + actual }));
                    effectDescription = `+${actual} ${t('订单')} (复利 ×${newGrowth})${hasCatalyst ? ' ✦' : ''}`;
                } else {
                    effectDescription = t('订单上限');
                }
                break;
            }
            case CHARM_TYPES.DELAY_DOOM: {
                const reduction = 1 + catalystBonus;
                setDoomDelayCount(prev => prev + reduction);
                effectDescription = `${t('厄运次数')} -${reduction}`;
                break;
            }
            case CHARM_TYPES.ENHANCED_DELAY: {
                const reduction = 2 + catalystBonus;
                setDoomDelayCount(prev => prev + reduction);
                effectDescription = `${t('厄运次数')} -${reduction}`;
                break;
            }
            case CHARM_TYPES.ALCHEMY_POT: {
                const neighbors = getNeighbors(charmIndex);
                const upgradeTargets = neighbors.filter(
                    i => fateWall.cells[i] && UPGRADEABLE_CHARMS.includes(fateWall.cells[i].type)
                );
                if (upgradeTargets.length === 0) {
                    // No valid targets — no effect, no use consumed
                    effectDescription = t('无可升级目标');
                    break;
                }
                const targetIndex = upgradeTargets[Math.floor(Math.random() * upgradeTargets.length)];
                const targetCharm = fateWall.cells[targetIndex];
                const upgradedType = CHARM_UPGRADE_MAP[targetCharm.type];
                const upgradedCharm = generateCharm(upgradedType);
                setFateWall(prev => {
                    const newCells = [...prev.cells];
                    newCells[targetIndex] = upgradedCharm;
                    const potCharm = newCells[charmIndex];
                    if (potCharm) {
                        const newUsesLeft = (potCharm.usesLeft ?? 1) - 1;
                        if (newUsesLeft <= 0) {
                            newCells[charmIndex] = null;
                        } else {
                            newCells[charmIndex] = { ...potCharm, usesLeft: newUsesLeft };
                        }
                    }
                    return { cells: newCells };
                });
                effectDescription = `${t('升级')}: ${CHARM_CONFIGS[targetCharm.type]?.name} → ${CHARM_CONFIGS[upgradedType]?.name}`;
                return effectDescription; // early return: skip isPersistent check
            }
            case CHARM_TYPES.RESONANCE_BELL: {
                const ONE_SHOT_SKIP = [CHARM_TYPES.RESONANCE_BELL, CHARM_TYPES.ALCHEMY_POT, CHARM_TYPES.COPY_MIRROR];
                const neighbors = getNeighbors(charmIndex).sort((a, b) => a - b);
                const effects = [];
                for (const nIdx of neighbors) {
                    const neighbor = fateWall.cells[nIdx];
                    if (!neighbor) continue;
                    if (ONE_SHOT_SKIP.includes(neighbor.type)) continue;
                    const desc = applyLuckEffect(neighbor, nIdx);
                    if (desc) effects.push(desc);
                }
                effectDescription = effects.length > 0
                    ? `${t('共鸣')}: ${effects.join(' | ')}`
                    : t('无相邻目标');
                break;
            }
            case CHARM_TYPES.COPY_MIRROR: {
                const neighbors = getNeighbors(charmIndex);
                const sourceOptions = neighbors.filter(
                    i => fateWall.cells[i] && !NON_COPYABLE_CHARMS.includes(fateWall.cells[i].type)
                );
                const emptySlots = fateWall.cells
                    .map((c, i) => (c === null ? i : -1))
                    .filter(i => i !== -1);
                // Mirror always disappears regardless of outcome
                removeCharm(charmIndex);
                if (sourceOptions.length === 0 || emptySlots.length === 0) {
                    effectDescription = t('复制镜：无有效目标或网格已满');
                    return effectDescription;
                }
                setCopyMirrorState({ step: 'select_source', charmIndex, sourceOptions });
                effectDescription = t('复制镜：请选择复制源');
                return effectDescription;
            }
            case CHARM_TYPES.BLANK:
            case CHARM_TYPES.CATALYST:
            case CHARM_TYPES.GUARD_STONE:
            case CHARM_TYPES.BAIT:
                effectDescription = t('无效果');
                break;
            default:
                effectDescription = t('效果待实现');
                break;
        }

        if (!charm.isPersistent) {
            removeCharm(charmIndex);
        }

        return effectDescription;
    };

    const handleLuckSelect = ({ direction, lineIndex }) => {
        const indices = direction === 'row' ? getRowIndices(lineIndex) : getColIndices(lineIndex);
        const filled = indices.filter(i => fateWall.cells[i] !== null);
        if (filled.length === 0) return;
        const charmIndex = filled[Math.floor(Math.random() * filled.length)];
        const charm = fateWall.cells[charmIndex];
        const effectDescription = applyLuckEffect(charm, charmIndex);
        setLuckResult({ charm, charmIndex, effectDescription });
        setLuckPhase('result');
    };

    const confirmLuck = () => {
        if (copyMirrorState) return; // wait for copy mirror sub-interaction to complete
        setLuckResult(null);
        setLuckPhase('idle');
        setPhase('drawing');
    };

    const handleCopyMirrorSelectSource = (sourceIndex) => {
        if (!copyMirrorState || copyMirrorState.step !== 'select_source') return;
        const emptySlots = fateWall.cells
            .map((c, i) => (c === null ? i : -1))
            .filter(i => i !== -1);
        if (emptySlots.length === 0) {
            setCopyMirrorState(null);
            return;
        }
        const sourceCharm = fateWall.cells[sourceIndex];
        const newCharm = generateCharm(sourceCharm.type);
        setCopyMirrorState({
            step: 'select_target',
            charmIndex: copyMirrorState.charmIndex,
            sourceIndex,
            emptySlots,
            newCharm,
        });
    };

    const handleCopyMirrorSelectTarget = (targetIndex) => {
        if (!copyMirrorState || copyMirrorState.step !== 'select_target') return;
        placeCharm(targetIndex, copyMirrorState.newCharm);
        const copiedName = CHARM_CONFIGS[copyMirrorState.newCharm.type]?.name || copyMirrorState.newCharm.type;
        setCopyMirrorState(null);
        setLuckResult(prev => prev ? { ...prev, effectDescription: `${t('复制')}: ${copiedName}` } : prev);
    };

    // =============================================
    // FATE WALL ACTIONS
    // =============================================

    const placeCharm = (index, charm) => {
        setFateWall(prev => {
            const newCells = [...prev.cells];
            newCells[index] = charm;
            return { cells: newCells };
        });
    };

    const removeCharm = (index) => {
        setFateWall(prev => {
            const newCells = [...prev.cells];
            newCells[index] = null;
            return { cells: newCells };
        });
    };

    const confirmCharmPlacement = (index) => {
        if (!pendingCharm) return;
        placeCharm(index, pendingCharm.charm);
        setPendingCharm(null);
    };

    const discardPendingCharm = () => setPendingCharm(null);

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
        lastDrawDirection,

        // Doom
        hp,
        doomLevel,
        resolveDoom,
        doomDrawPhase,
        doomDrawQueue,
        doomDrawTotal,
        doomDrawResult,
        handleDoomSelect,
        confirmDoomDraw,

        // Inventory
        inventory,
        maxInventorySize,
        pendingItem,
        pendingItems,

        // Orders
        bulletinBoard,
        pendingChosenOrder,

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
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        synthesizeItems,
        debugAddItem,
        discardPendingItem,
        submitOrder,
        canSubmitOrder,
        incomingOrder,
        confirmIncomingOrder,
        discardIncomingOrder,
        replaceBulletinOrder,

        // Fate Wall
        fateWall,
        turnBonuses,
        placeCharm,
        removeCharm,
        pendingCharm,
        confirmCharmPlacement,
        discardPendingCharm,

        // Luck phase
        luckPhase,
        luckResult,
        handleLuckSelect,
        confirmLuck,
        copyMirrorState,
        handleCopyMirrorSelectSource,
        handleCopyMirrorSelectTarget,

        debugAddStorageItems: (items) => {
            setExpeditionScores(prev => [...prev, { score: 0, baseScore: 0, bonusScore: 0, items }]);
        },
    };
};
