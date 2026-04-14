import { useState, useMemo } from 'react';
import { generateWall } from '../utils/matrixHelpers';
import { generateWallFromTemplate } from '../utils/templateGenerator';
import { pickTemplate, LEVEL_TEMPLATES } from '../data/levelTemplates';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { STICKER_TYPES, INGREDIENTS, ORDER_TEMPLATES, WALL_TYPES, REFRESH_CONFIG } from '../data/v2Config';

import { useLanguage } from '../contexts/LanguageContext';

// =============================================
// HELPER FUNCTIONS
// =============================================

/** Count buff_field cells in the 4-neighbor (orthogonal) range of (r, c). The
 *  cell at (r, c) itself is not counted (even if it is a buff_field). */
function countBuffFieldCoverage(matrix, r, c) {
    if (!matrix) return 0;
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let count = 0;
    for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (matrix[nr][nc]?.type === 'buff_field') count++;
    }
    return count;
}

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
    const { t, language } = useLanguage();

    // --- Configuration ---
    const doomConfig = config.doom || DOOM_CONFIG;
    const turnConfig = config.turn || TURN_CONFIG;
    const orderConfig = config.order || { bulletinCapacity: 5, initialCount: 5 };
    const expeditionConfig = config.expedition || { expeditionCount: 3, scoreToWin: 30 };
    const baseInventorySize = config.inventorySize || config.stages[0].inventorySize;
    const [inventoryBonus, setInventoryBonus] = useState(0);
    const maxInventorySize = baseInventorySize + inventoryBonus;

    // --- Expedition State ---
    const [expeditionNumber, setExpeditionNumber] = useState(0);
    const [expeditionScores, setExpeditionScores] = useState([]);
    const [totalScore, setTotalScore] = useState(0);
    const [bonusItems, setBonusItems] = useState([]); // 3 random item IDs that give +1 bonus per game

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [gold, setGold] = useState(0);
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);
    const [currentWallType, setCurrentWallType] = useState(null);
    const [currentLevel, setCurrentLevel] = useState(null); // hand-crafted level for reveal overlay
    const [lastDrawDirection, setLastDrawDirection] = useState(null);

    // --- Board Effect State ---
    const [gravityActive, setGravityActive] = useState(false);
    const [gravityDrops, setGravityDrops] = useState(null); // { "row-col": dropDistance } for animation
    const [rotationMoves, setRotationMoves] = useState(null); // { "row-col": {fromRow, fromCol} } for center-rotate animation
    const [growthFlashes, setGrowthFlashes] = useState(null); // Set of "row-col" keys for savage-growth flash feedback

    // --- Sub-Level State ---
    const [wallStack, setWallStack] = useState([]); // stack of { matrix, gold, wallType }
    const isInSubLevel = wallStack.length > 0;

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);
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
    const [refreshCharges, setRefreshCharges] = useState(REFRESH_CONFIG.initialCharges);

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

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start a new turn: generate grid, give gold */
    const startNewTurn = () => {
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setGold(turnConfig.goldPerTurn);
        setLastDrawResult(null);
        setDoomResolutionResult(null);
        setGravityActive(false);

        // Doom accumulation (not on first turn)
        if (newTurnNumber > 1) {
            setDoomGrid(prev => {
                const newGrid = [...prev];
                let added = 0;
                for (let i = 0; i < newGrid.length && added < doomConfig.dangerPerTurn; i++) {
                    if (newGrid[i].type === 'empty') {
                        newGrid[i] = { type: 'danger' };
                        added++;
                    }
                }
                return newGrid;
            });
        }

        // Reset draw direction for alternating wall
        setLastDrawDirection(null);

        // Generate a single wall for this turn. Either a hand-crafted level
        // (if the schedule picks one) or a procedural modifier wall. No
        // 3-choose-1; the modifier is revealed on the click-to-dismiss
        // overlay in GameCore.
        const currentExpedition = Math.max(1, expeditionNumber);
        const template = pickTemplate(currentExpedition);
        let candidate;
        if (template) {
            const result = generateWallFromTemplate(template);
            candidate = {
                stickers: result.stickers,
                grid: result.grid,
                doomCellCount: result.doomCellCount,
                wallType: null,
                level: template,
            };
        } else {
            const wallType = pickWallType();
            // Collect sticker IDs required by current shelf orders. Every
            // sticker cell on the wall will independently roll from this
            // needed set (not a fixed 3-4-type pool). If there are no
            // orders, fall back to the full sticker roster.
            const neededIds = new Set();
            for (const order of bulletinBoard) {
                for (const req of (order.requirements || [])) {
                    neededIds.add(req.stickerId);
                }
            }
            const stickers = neededIds.size > 0
                ? STICKER_TYPES.filter(s => neededIds.has(s.id))
                : STICKER_TYPES;
            const { grid, doomCellCount } = generateWall(stickers);
            candidate = { stickers, grid, doomCellCount, wallType, level: null };
        }
        applyWallCandidate(candidate);
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
        startNewTurn();
    };

    /** End current turn: resolve doom once, then go to between-turns decision */
    const endTurn = () => {
        resolveDoom('end_turn');
    };

    /** Continue to next turn. Per-turn auto refill removed — shelf stays
     *  full via completion-triggered auto refill and the manual refresh
     *  button. */
    const continueToNextTurn = () => {
        startNewTurn();
    };

    /** Apply a generated wall candidate: randomize per-instance modifier
     *  params, mutate the grid for modifier effects, set state, and advance
     *  to the drawing phase. Called from startNewTurn with a single auto-
     *  generated candidate (3-choose-1 was removed). */
    const applyWallCandidate = (chosen) => {
        let wallType = chosen.wallType;
        // Conveyor modifier: roll random axis/index/direction per instance
        if (wallType?.id === 'conveyor') {
            const size = MATRIX_CONFIG.gridSize;
            wallType = {
                ...wallType,
                conveyorAxis: Math.random() < 0.5 ? 'row' : 'col',
                conveyorIndex: Math.floor(Math.random() * size),
                conveyorDirection: Math.random() < 0.5 ? 1 : -1, // +1 = right/down, -1 = left/up
            };
        }
        setCurrentWallType(wallType);
        setCurrentLevel(chosen.level || null);

        // Apply wall-type mutations to the grid before setting it
        const grid = chosen.grid.map(r => r.map(c => c ? { ...c } : null));

        // Modifier-specific gold override (e.g., mirror only gives 3 coins)
        if (wallType?.goldOverride !== undefined) {
            setGold(wallType.goldOverride);
        }

        // Level-specific gold override
        if (chosen.level?.settings?.gold !== undefined) {
            setGold(chosen.level.settings.gold);
        }

        // Level candidates have no wallType — skip modifier mutations
        if (!wallType) {
            setMatrix(grid);
            setPhase('drawing');
            return;
        }

        if (wallType.id === 'hidden') {
            // Mark ~30% of sticker cells as hidden (independent per cell).
            const ratio = wallType.hiddenRatio || 0.3;
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const cell = grid[r][c];
                    if (!cell || (cell.type !== 'sticker' && cell.type !== 'item')) continue;
                    if (Math.random() < ratio) {
                        cell.hidden = true;
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

        // Center rotate modifier: guarantee the center 2×2 contains at least
        // one bomb or one buff_field so the rotating zone always has a
        // decision-changing anchor (the original rotate-only version had no
        // real effect on line evaluation).
        if (wallType.id === 'center_rotate') {
            const size = MATRIX_CONFIG.gridSize;
            const r0 = Math.floor(size / 2) - 1;
            const c0 = Math.floor(size / 2) - 1;
            const centerPositions = [
                [r0, c0], [r0, c0 + 1],
                [r0 + 1, c0], [r0 + 1, c0 + 1],
            ];
            const hasAnchor = centerPositions.some(([r, c]) => {
                const t = grid[r]?.[c]?.type;
                return t === 'bomb' || t === 'buff_field';
            });
            if (!hasAnchor) {
                const [pr, pc] = centerPositions[Math.floor(Math.random() * centerPositions.length)];
                const pickBuff = Math.random() < 0.5;
                if (pickBuff) {
                    const bfCfg = MATRIX_CONFIG.specialCells.buffField;
                    grid[pr][pc] = {
                        type: 'buff_field',
                        icon: bfCfg.icon,
                        name: bfCfg.name,
                        uid: generateUID(),
                    };
                } else {
                    const bombCfg = MATRIX_CONFIG.specialCells.bomb;
                    grid[pr][pc] = {
                        type: 'bomb',
                        icon: bombCfg.icon,
                        name: bombCfg.name,
                        uid: generateUID(),
                    };
                }
            }
        }

        setMatrix(grid);
        setPhase('drawing');
    };

    /** Enter a sub-level: push current wall state, load sub-level grid.
     *  entranceRow/Col: position of the entrance cell to remove from saved matrix */
    const enterSubLevel = (subLevelId, entranceRow, entranceCol) => {
        const subLevel = LEVEL_TEMPLATES.find(t => t.id === subLevelId && t.role === 'sub');
        if (!subLevel) return;

        // Save current matrix with entrance cell removed
        const savedMatrix = matrix.map(r => r.map(c => c ? { ...c } : null));
        if (entranceRow !== undefined && entranceCol !== undefined) {
            savedMatrix[entranceRow][entranceCol] = null;
        }

        setWallStack(prev => [...prev, {
            matrix: savedMatrix,
            gold,
            wallType: currentWallType,
            level: currentLevel,
        }]);

        // Generate and load sub-level
        const result = generateWallFromTemplate(subLevel);
        const subGold = subLevel.settings?.gold ?? turnConfig.goldPerTurn;
        setMatrix(result.grid);
        setGold(subGold);
        setCurrentWallType(null);
        setCurrentLevel(null);
        setLastDrawResult(null);
        setDrawAnimState(null);
        setPhase('drawing_sub');
    };

    /** Exit sub-level: play exit animation, then pop wall stack and restore. No doom resolution. */
    const exitSubLevel = () => {
        if (wallStack.length === 0) return;

        // Set a transitional phase to trigger exit animation
        setPhase('exiting_sub');

        // After animation completes, restore parent state
        setTimeout(() => {
            const parent = wallStack[wallStack.length - 1];
            setWallStack(prev => prev.slice(0, -1));
            setMatrix(parent.matrix);
            setGold(parent.gold);
            setCurrentWallType(parent.wallType);
            setCurrentLevel(parent.level || null);
            setLastDrawResult(null);
            setPhase('drawing');
        }, 280);
    };

    // =============================================
    // DRAW MECHANIC
    // =============================================

    const isDrawAnimating = drawAnimState !== null;

    /** Select a row — starts scanning animation, then resolves */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing' && phase !== 'drawing_sub') return;
        if (isDoomResolving || isDrawAnimating) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;
        // Alternating wall: block consecutive row draws
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'row') return;

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        const row = matrix[rowIndex];
        const activeCols = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null && cell.type !== 'empty') activeCols.push(colIndex);
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
        if (phase !== 'drawing' && phase !== 'drawing_sub') return;
        if (isDoomResolving || isDrawAnimating) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix) return;
        // Alternating wall: block consecutive column draws
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'column') return;

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        // activeCols here are actually active row indices for this column
        const activeCols = [];
        matrix.forEach((row, rowIndex) => {
            if (row[colIndex] !== null && row[colIndex].type !== 'empty') activeCols.push(rowIndex);
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

        // Buff field coverage at the drawn cell — bomb is explicitly unaffected.
        const buffCov = drawnCell.type === 'bomb'
            ? 0
            : countBuffFieldCoverage(matrix, finalRowIndex, finalColIndex);
        const buffMult = buffCov + 1;
        const mult = (drawnCell.multiplier || 1) * buffMult;
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
            // Order cells now grant a refresh charge (capped). Popcorn
            // multiplier does not apply — each cell is a single +1.
            setRefreshCharges(prev => {
                if (prev >= REFRESH_CONFIG.maxCharges) {
                    showToast(t('刷新次数已满'), 'warning');
                    return prev;
                }
                showToast(`🔄 ${t('刷新 +1')}`, 'info');
                return prev + 1;
            });
        } else if (drawnCell.type === 'heal') {
            const amount = (drawnCell.healAmount || 1) * mult;
            setHp(prev => Math.min(prev + amount, doomConfig.initialHP));
            showToast(`❤️‍🩹 HP +${amount}${mult > 1 ? ' (×' + mult + ')' : ''}`, 'success');
        } else if (drawnCell.type === 'backpack_expand') {
            const amount = (drawnCell.expandAmount || 1) * mult;
            setInventoryBonus(prev => prev + amount);
            showToast(`🎒 ${t('菜篮')} +${amount}${mult > 1 ? ' (×' + mult + ')' : ''}`, 'success');
        } else if (drawnCell.type === 'gravity') {
            setGravityActive(true);
            showToast('⬇️ ' + t('重力开关！'), 'info');
        } else if (drawnCell.type === 'bomb') {
            // Bomb: mark for adjacent destruction (handled in matrix update below)
        } else if (drawnCell.type === 'entrance') {
            // Enter sub-level directly — no setTimeout, no stale closure issues
            const entryName = (language === 'en' && drawnCell.name_en) ? drawnCell.name_en : drawnCell.name;
            showToast(`${drawnCell.icon || '🚪'} ${t('进入子关卡')}: ${entryName}`, 'info');
            enterSubLevel(drawnCell.subLevelId, finalRowIndex, finalColIndex);
            return; // Skip the normal post-draw flow
        }

        // Mirror modifier: also resolve the cell on the opposite side of the
        // wall (same row, mirrored column). Cached from the live matrix so we
        // see the cell as the player saw it before any mutations.
        let mirrorRow = null;
        let mirrorCol = null;
        let mirrorCell = null;
        if (currentWallType?.id === 'mirror' && drawnCell.type !== 'entrance' && matrix) {
            mirrorRow = finalRowIndex;
            mirrorCol = matrix[0].length - 1 - finalColIndex;
            if (mirrorCol !== finalColIndex) {
                mirrorCell = matrix[mirrorRow]?.[mirrorCol] || null;
            }
        }

        if (mirrorCell) {
            const mMult = mirrorCell.multiplier || 1;
            if (mirrorCell.type === 'item' || mirrorCell.type === 'sticker' || mirrorCell.type === 'out_of_game') {
                if (mMult > 1 && (mirrorCell.type === 'sticker' || mirrorCell.type === 'item')) {
                    for (let i = 0; i < mMult; i++) {
                        addToInventory({ ...mirrorCell, uid: generateUID() });
                    }
                } else {
                    addToInventory({ ...mirrorCell, uid: generateUID() });
                }
                const itemName = mirrorCell.item?.name || mirrorCell.name;
                showToast(`🪞 ${t('镜像')}: ${mirrorCell.item?.icon || mirrorCell.icon || ''} ${t(itemName)}`, 'success');
            } else if (mirrorCell.type === 'doom_resolution') {
                doomEffects.resolutions += 1 * mMult;
            } else if (mirrorCell.type === 'doom_upgrade') {
                doomEffects.upgrades += 1 * mMult;
            } else if (mirrorCell.type === 'gold') {
                const g = mirrorCell.goldAmount * mMult;
                setGold(prev => prev + g);
                showToast(`🪞 ${t('镜像')} ${t('金币')} +${g}`, 'success');
            } else if (mirrorCell.type === 'order_cell') {
                setRefreshCharges(prev => {
                    if (prev >= REFRESH_CONFIG.maxCharges) return prev;
                    return prev + 1;
                });
                showToast(`🪞 ${t('镜像')}: 🔄 ${t('刷新 +1')}`, 'info');
            } else if (mirrorCell.type === 'heal') {
                const a = (mirrorCell.healAmount || 1) * mMult;
                setHp(prev => Math.min(prev + a, doomConfig.initialHP));
                showToast(`🪞 ${t('镜像')} ❤️‍🩹 HP +${a}`, 'success');
            } else if (mirrorCell.type === 'backpack_expand') {
                const a = (mirrorCell.expandAmount || 1) * mMult;
                setInventoryBonus(prev => prev + a);
                showToast(`🪞 ${t('镜像')} 🎒 ${t('菜篮')} +${a}`, 'success');
            } else if (mirrorCell.type === 'gravity') {
                setGravityActive(true);
                showToast(`🪞 ${t('镜像')} ⬇️ ${t('重力开关！')}`, 'info');
            }
            // bomb mirror handled in setMatrix below
            // entrance mirror skipped (entrance only on hand-crafted levels, not mirror walls)
        }

        // Remove drawn cell(s) + hidden reveal + drift shuffle
        setMatrix(prev => {
            const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));

            // Remove drawn cell
            newMatrix[finalRowIndex][finalColIndex] = null;

            // Mirror modifier: remove mirror cell as well. Bomb explosion
            // handled later (we want to also explode the drawn bomb first).
            if (mirrorCell && mirrorRow !== null && mirrorCol !== null) {
                newMatrix[mirrorRow][mirrorCol] = null;
            }

            // Bomb: destroy all adjacent cells (8 directions). Runs for the
            // drawn cell and (if mirror modifier) for the mirror cell too.
            const bombDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            const explodeAt = (br, bc) => {
                for (const [dr, dc] of bombDirs) {
                    const nr = br + dr;
                    const nc = bc + dc;
                    if (nr >= 0 && nr < newMatrix.length && nc >= 0 && nc < newMatrix[0].length && newMatrix[nr][nc]) {
                        newMatrix[nr][nc] = null;
                    }
                }
            };
            let bombFired = false;
            if (drawnCell.type === 'bomb') {
                explodeAt(finalRowIndex, finalColIndex);
                bombFired = true;
            }
            if (mirrorCell?.type === 'bomb') {
                explodeAt(mirrorRow, mirrorCol);
                bombFired = true;
            }
            if (bombFired) {
                showToast('💣 ' + t('炸弹爆炸！'), 'warning');
            }

            // Blast heal wall: any non-bomb draw leaves a fresh bomb at the
            // drawn position. Drawing a bomb itself does NOT regenerate the
            // bomb — the explosion already cleared 8 neighbors and re-seeding
            // would make bombs immortal.
            if (currentWallType?.id === 'blast_heal' && drawnCell.type !== 'bomb') {
                const bombCfg = MATRIX_CONFIG.specialCells.bomb;
                newMatrix[finalRowIndex][finalColIndex] = {
                    type: 'bomb',
                    icon: bombCfg.icon,
                    name: bombCfg.name,
                    uid: generateUID(),
                };
            }

            // Blessing heal wall: any non-buff_field draw leaves a fresh
            // buff_field at the drawn position. Drawing a buff_field itself
            // just removes it — spawning a new one would make the aura
            // indestructible.
            if (currentWallType?.id === 'blessing_heal' && drawnCell.type !== 'buff_field') {
                const bfCfg = MATRIX_CONFIG.specialCells.buffField;
                newMatrix[finalRowIndex][finalColIndex] = {
                    type: 'buff_field',
                    icon: bfCfg.icon,
                    name: bfCfg.name,
                    uid: generateUID(),
                };
            }

            // Savage growth wall: overwrite the 4 orthogonal neighbors of the
            // drawn cell with a fresh copy of the drawn cell. Empty neighbors
            // are skipped (rule: nothing grows into empty). If the draw was a
            // bomb, the explosion above already cleared all 8 neighbors, so
            // this block naturally does nothing.
            if (currentWallType?.id === 'savage_growth' && drawnCell) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                const flashes = [];
                for (const [dr, dc] of dirs) {
                    const nr = finalRowIndex + dr;
                    const nc = finalColIndex + dc;
                    if (nr >= 0 && nr < newMatrix.length && nc >= 0 && nc < newMatrix[0].length) {
                        if (newMatrix[nr][nc] !== null) {
                            newMatrix[nr][nc] = { ...drawnCell, uid: generateUID() };
                            flashes.push(`${nr}-${nc}`);
                        }
                    }
                }
                if (flashes.length > 0) {
                    setGrowthFlashes(new Set(flashes));
                    setTimeout(() => setGrowthFlashes(null), 400);
                }
            }

            // Hidden wall: reveal adjacent hidden cells (independent per cell)
            if (currentWallType?.id === 'hidden') {
                const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                for (const [dr, dc] of dirs) {
                    const nr = finalRowIndex + dr;
                    const nc = finalColIndex + dc;
                    if (nr >= 0 && nr < newMatrix.length && nc >= 0 && nc < newMatrix[0].length) {
                        const neighbor = newMatrix[nr][nc];
                        if (neighbor?.hidden) {
                            neighbor.hidden = false;
                        }
                    }
                }
            }

            // Conveyor wall: cycle the chosen row/column by one step in its fixed direction
            if (currentWallType?.id === 'conveyor') {
                const { conveyorAxis, conveyorIndex, conveyorDirection } = currentWallType;
                const rows = newMatrix.length;
                const cols = newMatrix[0].length;
                const len = conveyorAxis === 'row' ? cols : rows;

                // Extract the current line
                const line = [];
                for (let i = 0; i < len; i++) {
                    const r = conveyorAxis === 'row' ? conveyorIndex : i;
                    const c = conveyorAxis === 'row' ? i : conveyorIndex;
                    line.push(newMatrix[r][c]);
                }

                // Cyclic shift: new[i] = old[(i - direction + len) % len]
                const moves = {};
                for (let i = 0; i < len; i++) {
                    const fromI = ((i - conveyorDirection) % len + len) % len;
                    const r = conveyorAxis === 'row' ? conveyorIndex : i;
                    const c = conveyorAxis === 'row' ? i : conveyorIndex;
                    const fromR = conveyorAxis === 'row' ? conveyorIndex : fromI;
                    const fromC = conveyorAxis === 'row' ? fromI : conveyorIndex;
                    newMatrix[r][c] = line[fromI];
                    if (line[fromI]) moves[`${r}-${c}`] = { fromRow: fromR, fromCol: fromC };
                }

                if (Object.keys(moves).length > 0) {
                    setRotationMoves(moves);
                    setTimeout(() => setRotationMoves(null), 350);
                }
            }

            // Center rotate wall: rotate the center 2×2 clockwise by one step
            if (currentWallType?.id === 'center_rotate') {
                const rows = newMatrix.length;
                const cols = newMatrix[0].length;
                // Center 2×2 for 4×4: rows [1,2] × cols [1,2]
                const r0 = Math.floor(rows / 2) - 1;
                const c0 = Math.floor(cols / 2) - 1;
                if (r0 >= 0 && c0 >= 0 && r0 + 1 < rows && c0 + 1 < cols) {
                    // Clockwise: TL→TR, TR→BR, BR→BL, BL→TL
                    const tl = newMatrix[r0][c0];
                    const tr = newMatrix[r0][c0 + 1];
                    const br = newMatrix[r0 + 1][c0 + 1];
                    const bl = newMatrix[r0 + 1][c0];
                    newMatrix[r0][c0 + 1] = tl;       // TL → TR
                    newMatrix[r0 + 1][c0 + 1] = tr;   // TR → BR
                    newMatrix[r0 + 1][c0] = br;       // BR → BL
                    newMatrix[r0][c0] = bl;           // BL → TL

                    // Build moves map for animation — only non-null cells
                    const moves = {};
                    if (tl) moves[`${r0}-${c0 + 1}`]     = { fromRow: r0,     fromCol: c0     };
                    if (tr) moves[`${r0 + 1}-${c0 + 1}`] = { fromRow: r0,     fromCol: c0 + 1 };
                    if (br) moves[`${r0 + 1}-${c0}`]     = { fromRow: r0 + 1, fromCol: c0 + 1 };
                    if (bl) moves[`${r0}-${c0}`]         = { fromRow: r0 + 1, fromCol: c0     };
                    if (Object.keys(moves).length > 0) {
                        setRotationMoves(moves);
                        setTimeout(() => setRotationMoves(null), 350);
                    }
                }
            }

            // Gravity: all cells fall down independently, one step per iteration
            // Iterative bottom-up: process from bottom row upward so lower things settle first
            if (gravityActive || drawnCell.type === 'gravity') {
                const rows = newMatrix.length;
                const cols = newMatrix[0].length;
                const isFree = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols
                    && (newMatrix[r][c] === null || newMatrix[r][c]?.type === 'empty');

                // Record original positions by uid for animation
                const originalPos = new Map();
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (newMatrix[r][c]?.uid) originalPos.set(newMatrix[r][c].uid, r);
                    }
                }

                // Repeat until no movement (handles cascading)
                let moved = true;
                while (moved) {
                    moved = false;

                    for (let r = rows - 2; r >= 0; r--) {
                        for (let c = 0; c < cols; c++) {
                            const cell = newMatrix[r][c];
                            if (!cell || cell.type === 'empty') continue;

                            if (isFree(r + 1, c)) {
                                newMatrix[r + 1][c] = cell;
                                newMatrix[r][c] = null;
                                moved = true;
                            }
                        }
                    }
                }

                // Compute drop distances: new row - original row (in grid units)
                const drops = {};
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const cell = newMatrix[r][c];
                        if (cell?.uid && originalPos.has(cell.uid)) {
                            const origRow = originalPos.get(cell.uid);
                            if (r !== origRow) {
                                drops[`${r}-${c}`] = r - origRow; // positive = fell down
                            }
                        }
                    }
                }
                if (Object.keys(drops).length > 0) {
                    setGravityDrops(drops);
                    // Clear after animation
                    setTimeout(() => setGravityDrops(null), 350);
                }
            }

            return newMatrix;
        });

        if (obtainedItem) {
            setFlyingItem({
                icon: obtainedItem.item.icon,
                name: obtainedItem.item.name,
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                id: Date.now(),
            });
            // Multiplier: add to inventory multiple times for stickers, items,
            // and out_of_game (食材). The buff_field aura stacks (N+1)× on top
            // of any per-cell multiplier, so mult may exceed 2.
            if (mult > 1) {
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
            resolveDoom(null, doomEffects.resolutions);
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

    /** Clear incoming order state. Phase transitions are no longer tied to
     *  incoming orders — continue-to-next-turn goes straight to startNewTurn. */
    const resolveIncomingAndProceed = () => {
        setIncomingOrder(null);
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

        // Remove order from shelf and auto-spawn a 2-candidate incoming to
        // fill the freed slot — shelf stays at capacity.
        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        addBulletinOrder();
        showToast(t('订单完成'), 'success');
    };

    /** Manual refresh: consume 1 charge to generate 2 new candidates.
     *  Since shelf is always at capacity, this always routes through the
     *  replacement step (player picks which existing order to swap out). */
    const triggerRefresh = () => {
        if (refreshCharges <= 0) return;
        if (incomingOrder) return; // don't double-queue
        setRefreshCharges(c => c - 1);
        addBulletinOrder();
    };

    // =============================================
    // DOOM RESOLUTION
    // =============================================

    /** Start animated doom resolution */
    const resolveDoom = (action = null, times = 1) => {
        if (action) setAfterDoomAction(action);

        // Pre-calculate final selections (times rounds of doomLevel hits each)
        const finalSelections = [];
        let hpLoss = 0;
        for (let t = 0; t < times; t++) {
            for (let i = 0; i < doomLevel; i++) {
                const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
                const isHit = doomGrid[cellIndex].type === 'danger';
                if (isHit) hpLoss++;
                finalSelections.push({ index: cellIndex, isHit });
            }
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

        setCurrentWallType(null);
        setCurrentLevel(null);
        setLastDrawDirection(null);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setDoomLevel(doomConfig.initialDoomLevel);
        setIsDoomResolving(false);
        setDoomAnimState(null);
        setDoomResolutionResult(null);
        setAfterDoomAction(null);
        setInventory([]);
        setBulletinBoard([]);
        setPendingChosenOrder(null);
        setRefreshCharges(REFRESH_CONFIG.initialCharges);
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

        setCurrentWallType(null);
        setCurrentLevel(null);
        setLastDrawDirection(null);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setDoomLevel(doomConfig.initialDoomLevel);
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
        setPendingChosenOrder(null);
        setRefreshCharges(REFRESH_CONFIG.initialCharges);
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
        lastDrawResult,
        currentWallType,
        currentLevel,
        lastDrawDirection,

        // Board Effects
        gravityDrops,
        rotationMoves,
        growthFlashes,

        // Sub-Level
        isInSubLevel, wallStack,
        enterSubLevel, exitSubLevel,

        // Doom
        hp,
        doomGrid,
        doomLevel,
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
        pendingChosenOrder,
        refreshCharges,

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
        handleEvacuate,
        handleReset,
        startNextExpedition,
        tickDoomResolution,
        completeDoomResolution,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        synthesizeItems,
        debugAddItem,
        discardPendingItem,
        submitOrder,
        canSubmitOrder,
        triggerRefresh,
        incomingOrder,
        confirmIncomingOrder,
        discardIncomingOrder,
        replaceBulletinOrder,
        debugAddStorageItems: (items) => {
            setExpeditionScores(prev => [...prev, { score: 0, baseScore: 0, bonusScore: 0, items }]);
        },
    };
};
