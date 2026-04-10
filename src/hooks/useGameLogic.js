import { useState, useMemo } from 'react';
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES } from '../data/v2Config';
import { WALL_COLORS, WALL_FUNCTIONS, UNLOCK_TEMPLATES, DOOM_RESOLUTION_DRAWS, V3_INITIAL_STATE, getDoomTurnEvents } from '../data/v3Config';

import { useLanguage } from '../contexts/LanguageContext';

// =============================================
// HELPER FUNCTIONS
// =============================================

function generateUID() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Add a new danger to the doom grid, or upgrade a random existing danger
// when the danger count is already at the cap.
function addDangerOrUpgrade(grid, maxDangers) {
    const newGrid = grid.map(c => ({ ...c }));
    const dangerIndexes = [];
    for (let i = 0; i < newGrid.length; i++) {
        if (newGrid[i].type === 'danger') dangerIndexes.push(i);
    }
    if (dangerIndexes.length < maxDangers) {
        for (let i = 0; i < newGrid.length; i++) {
            if (newGrid[i].type === 'empty') {
                newGrid[i] = { type: 'danger', level: 0 };
                return { grid: newGrid, upgraded: false };
            }
        }
    }
    if (dangerIndexes.length === 0) return { grid: newGrid, upgraded: false };
    const idx = dangerIndexes[Math.floor(Math.random() * dangerIndexes.length)];
    newGrid[idx] = { ...newGrid[idx], level: (newGrid[idx].level || 0) + 1 };
    return { grid: newGrid, upgraded: true };
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
    const orderConfig = config.order || { bulletinCapacity: 3, maxActive: 3, newPerTurn: 1, initialCount: 3 };
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
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'wall_choice' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);
    const [wallCandidates, setWallCandidates] = useState(null);
    const [currentWallType, setCurrentWallType] = useState(null);
    const [lastDrawDirection, setLastDrawDirection] = useState(null);
    const [currentWallColor, setCurrentWallColor] = useState(null);
    const [currentWallFunction, setCurrentWallFunction] = useState(null);

    // --- Draw Count State ---
    const [drawCount, setDrawCount] = useState(0);          // draws on current wall
    const [totalDrawCount, setTotalDrawCount] = useState(0); // total draws this expedition
    const [refreshCount, setRefreshCount] = useState(V3_INITIAL_STATE.refreshCount);

    // --- Wall Function State ---
    const [acquiredLongTerms, setAcquiredLongTerms] = useState([]);
    const [acquiredPersistents, setAcquiredPersistents] = useState([]);
    const [shieldCount, setShieldCount] = useState(0);         // 护盾次数
    const [fastPassCount, setFastPassCount] = useState(0); // 快速通道累积次数
    const [safetyNetCount, setSafetyNetCount] = useState(0); // 安全网叠加层数（每层=紧急撤离时可保护1物品）
    const [emergencyEvacMode, setEmergencyEvacMode] = useState(false); // 紧急撤离选物模式
    const [emergencyEvacProtected, setEmergencyEvacProtected] = useState(new Set()); // 已选保护物品索引
    const [wallDrawLimit, setWallDrawLimit] = useState(Infinity); // 当前墙抽取次数上限
    const drawLimitReached = drawCount >= wallDrawLimit;

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger', level: 0 };
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

    const generateWallCandidates = (plain = false) => {
        const candidates = [];
        const usedFunctionIds = new Set();
        let attempts = 0;
        while (candidates.length < 3 && attempts < 30) {
            attempts++;
            const wallColor = wallColorValues[Math.floor(Math.random() * wallColorValues.length)];

            let wallFunction = null;
            let gridCells;
            if (plain) {
                // Plain walls: no function, no special cells
                gridCells = undefined;
            } else {
                // Pick a function not already used in this batch
                const colorFunctions = (WALL_FUNCTIONS[wallColor.id] || []).filter(f => !usedFunctionIds.has(f.id));
                if (colorFunctions.length === 0) continue;
                wallFunction = colorFunctions[Math.floor(Math.random() * colorFunctions.length)];
                usedFunctionIds.add(wallFunction.id);
                const gc = wallFunction.gridCells || {};
                gridCells = Object.keys(gc).length > 0 ? gc : undefined;
            }

            const stickerRange = wallColor.stickerRange || [3, 4];
            const stickers = pickWallStickers(STICKER_TYPES, stickerRange[0], stickerRange[1]);
            const { grid, cellCounts } = generateWall(stickers, wallColor, gridCells);

            // Pre-generate orders for order cells so tooltips can show order info
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]?.type === 'order') {
                        grid[r][c].order = generateOrder();
                    }
                }
            }

            // Unlock conditions temporarily disabled for playtesting
            const unlock = {};

            const drawLimit = wallFunction?.drawLimit ?? 5;
            candidates.push({ stickers, grid, cellCounts, wallColor, unlockCondition: unlock, wallFunction, drawLimit });
        }
        return candidates;
    };

    // =============================================
    // TURN FLOW
    // =============================================

    /** Prepare wall selection (called at game start and never again — subsequent walls are picked inline) */
    const startNewTurn = () => {
        setLastDrawResult(null);
        setDoomResolutionResult(null);
        setLastDrawDirection(null);

        // First turn: plain walls — no unlock, no function, no special cells
        const candidates = generateWallCandidates(true);
        setWallCandidates(candidates);
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

    /** Continue drawing — go back to the current wall */
    const continueToNextTurn = () => {
        setPhase('drawing');
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
        if (isDoomResolving || isDrawAnimating) return;
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        if (!canUnlockWall(chosen)) return;

        // Pay gold cost if any
        if (chosen.unlockCondition.gold) {
            setGold(prev => prev - chosen.unlockCondition.gold);
        }

        // Entering a new wall = advancing to next turn
        // Doom accumulation and turn increment
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setLastDrawResult(null);
        setDoomResolutionResult(null);

        // Doom events for this turn (accumulate / resolve / both)
        const doomEvents = getDoomTurnEvents(newTurnNumber);
        if (doomEvents.accumulate) {
            const willUpgrade = dangerCount >= doomConfig.maxDangerCount;
            setDoomGrid(prev => addDangerOrUpgrade(prev, doomConfig.maxDangerCount).grid);
            showToast(willUpgrade ? `☠ ${t('厄运升级')}` : `☠ ${t('厄运积累')} +1`, 'warning');
        }
        if (doomEvents.resolve) {
            // Auto-resolution will be triggered after wall setup (deferred)
            setTimeout(() => resolveDoom(), 500);
        }

        // Normal evacuation countdown — decrement on wall entry
        if (evacuationCountdown > 0) {
            const remaining = evacuationCountdown - 1;
            setEvacuationCountdown(remaining);
            if (remaining <= 0) {
                // Auto-evacuate
                finishEvacuation(inventory, 'evacuated');
                return;
            }
            showToast(t('普通撤离倒计时') + ` ${remaining}`, 'info');
        }

        setCurrentWallColor(chosen.wallColor);
        setCurrentWallFunction(chosen.wallFunction || null);
        setCurrentWallType(null);
        setMatrix(chosen.grid);
        setDrawCount(0);
        setWallDrawLimit(chosen.drawLimit ?? chosen.wallFunction?.drawLimit ?? 5);
        setLastDrawDirection(null);
        setFastPassCount(0);

        // --- Apply wall function ---
        if (chosen.wallFunction) {
            applyWallFunction(chosen.wallFunction, chosen.wallColor);
        }

        // --- Apply persistent effect bonuses for this wall's color ---
        const colorId = chosen.wallColor.id;
        for (const effect of acquiredPersistents) {
            if (effect.targetColor === colorId && effect.goldBonus) {
                setGold(prev => prev + effect.goldBonus);
                showToast(`💰 ${t(effect.name)}: +${effect.goldBonus} ${t('金币')}`, 'success');
            }
            if (effect.targetColor === colorId && effect.stickerBonus) {
                // Random sticker from this wall's sticker types
                const wallStickers = chosen.stickers;
                if (wallStickers && wallStickers.length > 0) {
                    const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
                    const uid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                    const newItem = { name: sticker.name, icon: sticker.icon, stickerId: sticker.id, isSticker: true, uid };
                    if (inventory.length < maxInventorySize) {
                        setInventory(prev => [...prev, newItem]);
                    } else {
                        setPendingItems(prev => [...prev, newItem]);
                    }
                    showToast(`🎁 ${t(effect.name)}: ${sticker.icon} ${t(sticker.name)}`, 'success');
                }
            }
        }

        // Kaleidoscope: auto +1 refresh every 3 turns
        if (newTurnNumber > 0 && newTurnNumber % 3 === 0) {
            const hasKaleidoscope = acquiredPersistents.some(e => e.id === 'kaleidoscope');
            if (hasKaleidoscope) {
                setRefreshCount(prev => prev + 1);
                showToast(`🔄 ${t('万花筒')}: ${t('刷新')} +1`, 'success');
            }
        }

        setWallCandidates(generateWallCandidates());
        setPhase('drawing');
    };

    // --- Wall-active function actions (brown walls) ---
    const [pawnshopMode, setPawnshopMode] = useState(false);
    const [pawnshopSelected, setPawnshopSelected] = useState(new Set());

    const startPawnshop = () => {
        const stickers = inventory.filter(i => i.isSticker);
        if (stickers.length < 1) { showToast(t('贴纸不足'), 'warning'); return; }
        setPawnshopMode(true);
        setPawnshopSelected(new Set());
    };

    const togglePawnshopItem = (index) => {
        if (!pawnshopMode) return;
        if (!inventory[index]?.isSticker) return;
        setPawnshopSelected(prev => {
            const next = new Set(prev);
            if (next.has(index)) { next.delete(index); }
            else { next.add(index); }
            return next;
        });
    };

    const confirmPawnshop = () => {
        const count = pawnshopSelected.size;
        if (count === 0) return;
        setInventory(prev => prev.filter((_, i) => !pawnshopSelected.has(i)));
        setGold(prev => prev + count);
        setPawnshopMode(false);
        setPawnshopSelected(new Set());
        showToast(`${t('典当行')}: -${count}${t('贴纸')} → +${count}💰`, 'success');
    };

    const cancelPawnshop = () => {
        setPawnshopMode(false);
        setPawnshopSelected(new Set());
    };

    const [clinicUsed, setClinicUsed] = useState(false);

    const useClinic = () => {
        if (clinicUsed) { showToast(t('已使用过'), 'info'); return; }
        if (gold < 3) { showToast(t('金币不足！'), 'warning'); return; }
        if (hp >= doomConfig.initialHP) { showToast(t('生命值已满'), 'info'); return; }
        setGold(prev => prev - 3);
        setHp(prev => Math.min(doomConfig.initialHP, prev + 1));
        setClinicUsed(true);
        showToast(`${t('急救站')}: -3💰 → +1❤️`, 'success');
    };

    // Shop (杂货铺): 3 sticker packs (1/2/3 different stickers) + 1 refresh, no restock
    const [shopStock, setShopStock] = useState([]); // [{ type: 'pack'|'refresh', stickers?, sold, cost }]
    const PACK_PRICES = { 1: 2, 2: 4, 3: 6 };

    const buyShopItem = (index) => {
        const item = shopStock[index];
        if (!item || item.sold) return;
        if (gold < item.cost) { showToast(t('金币不足！'), 'warning'); return; }
        setGold(prev => prev - item.cost);
        setShopStock(prev => prev.map((s, i) => i === index ? { ...s, sold: true } : s));
        if (item.type === 'pack') {
            const newItems = item.stickers.map(s => ({
                name: s.name, icon: s.icon, stickerId: s.id, isSticker: true,
                uid: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
            }));
            for (const newItem of newItems) {
                if (inventory.length < maxInventorySize) {
                    setInventory(prev => [...prev, newItem]);
                } else {
                    setPendingItems(prev => [...prev, newItem]);
                }
            }
            const icons = item.stickers.map(s => s.icon).join('');
            showToast(`🏪 ${icons}`, 'success');
        } else if (item.type === 'refresh') {
            setRefreshCount(prev => prev + 1);
            showToast(`🏪 🔄 ${t('刷新')} +1`, 'success');
        }
    };

    // Black market: 3 random items per entry, no restock, each can only be bought once
    const [blackmarketSold, setBlackmarketSold] = useState(new Set());
    const [blackmarketStock, setBlackmarketStock] = useState([]);

    const useBlackmarket = (itemDef) => {
        const prices = { 1: 8, 2: 14, 3: 20 };
        const cost = prices[itemDef.score];
        if (!cost) { showToast(t('此物品不可购买'), 'warning'); return; }
        if (blackmarketSold.has(itemDef.id)) { showToast(t('已售罄'), 'info'); return; }
        if (gold < cost) { showToast(t('金币不足！'), 'warning'); return; }
        setGold(prev => prev - cost);
        setBlackmarketSold(prev => new Set(prev).add(itemDef.id));
        const uid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        const newItem = { id: itemDef.id, name: itemDef.name, icon: itemDef.icon, score: itemDef.score, isOutOfGame: true, uid };
        if (inventory.length < maxInventorySize) {
            setInventory(prev => [...prev, newItem]);
        } else {
            setPendingItems(prev => [...prev, newItem]);
        }
        showToast(`${t('黑市')}: ${itemDef.icon} -${cost}💰`, 'success');
    };

    /** Apply the wall's function effect */
    const applyWallFunction = (fn, wallColor) => {
        if (fn.type === 'wall_active') {
            if (fn.id === 'clinic') {
                setClinicUsed(false);
            } else if (fn.id === 'blackmarket') {
                const eligible = OUT_OF_GAME_ITEMS.filter(i => [1, 2, 3].includes(i.score));
                const shuffled = [...eligible].sort(() => Math.random() - 0.5);
                setBlackmarketStock(shuffled.slice(0, 3));
                setBlackmarketSold(new Set());
            } else if (fn.id === 'shop') {
                // Generate shop stock: 3 sticker packs (1/2/3 different stickers each) + 1 refresh
                const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
                // Need 1+2+3 = 6 unique stickers
                const picked = shuffledStickers.slice(0, 6);
                const packSizes = [1, 2, 3].sort(() => Math.random() - 0.5);
                const stock = [];
                let offset = 0;
                for (const size of packSizes) {
                    stock.push({
                        type: 'pack',
                        stickers: picked.slice(offset, offset + size),
                        sold: false,
                        cost: PACK_PRICES[size],
                    });
                    offset += size;
                }
                stock.push({ type: 'refresh', sold: false, cost: 3 });
                setShopStock(stock);
            }
            showToast(`🏪 ${t(fn.name)}`, 'info');
        } else if (fn.type === 'persistent') {
            // Safety Net is the stacking exception — tracked as a counter, not in acquiredPersistents
            if (fn.id === 'safety_net') {
                setSafetyNetCount(prev => {
                    const next = prev + 1;
                    showToast(`✨ ${t(fn.name)} ×${next}`, 'success');
                    return next;
                });
            } else {
                // Add persistent effect (same name+color doesn't stack, different color does)
                setAcquiredPersistents(prev => {
                    const hasSame = prev.some(f => f.id === fn.id);
                    if (hasSame) {
                        showToast(`${t(fn.name)} ${t('已拥有，不叠加')}`, 'info');
                        return prev;
                    }
                    showToast(`✨ ${t('获得持久效果')}: ${t(fn.name)}`, 'success');
                    return [...prev, { ...fn, colorId: wallColor.id }];
                });
            }
        } else if (fn.type === 'instant') {
            // Instant effects are grid-based — extra cells already injected during wall generation
            showToast(`⚡ ${t(fn.name)}`, 'info');
        }
    };

    /** Refresh wall candidates (limited uses per expedition) */
    const refreshWallCandidates = () => {
        if (isDoomResolving || isDrawAnimating) return;
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
        if (drawLimitReached) return;
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
        if (drawLimitReached) return;
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
            if (shieldCount > 0) {
                setShieldCount(prev => prev - 1);
                showToast(`🛡️ ${t('护盾抵消了厄运结算')}`, 'info');
            } else {
                doomEffects.resolutions = 1 * mult;
            }
        } else if (drawnCell.type === 'doom_accumulation') {
            if (shieldCount > 0) {
                setShieldCount(prev => prev - 1);
                showToast(`🛡️ ${t('护盾抵消了厄运积累')}`, 'info');
            } else {
                const willUpgrade = dangerCount >= doomConfig.maxDangerCount;
                setDoomGrid(prev => addDangerOrUpgrade(prev, doomConfig.maxDangerCount).grid);
                showToast(willUpgrade ? t('厄运升级') : t('厄运积累') + ' +1', 'warning');
            }
        } else if (drawnCell.type === 'evacuation') {
            isEvacuationOffer = true;
            showToast(t('撤离机会'), 'info');
        } else if (drawnCell.type === 'gold') {
            const goldGain = drawnCell.goldAmount * mult;
            setGold(prev => prev + goldGain);
            showToast(`${t('金币')} +${goldGain}${mult > 1 ? ' (\u00d7' + mult + ')' : ''}`, 'success');
        } else if (drawnCell.type === 'refresh') {
            setRefreshCount(prev => prev + 1);
            showToast(`🔄 ${t('刷新')} +1`, 'success');
        } else if (drawnCell.type === 'order') {
            const order = drawnCell.order || generateOrder();
            if (activeOrders.length < orderConfig.maxActive) {
                setActiveOrders(prev => [...prev, order]);
                showToast(`📋 ${t('获得新订单')}`, 'success');
            } else {
                // Active orders full — let player pick one to replace.
                // Tag the pending order so confirmReplaceOrder knows to skip
                // gold cost and bulletin refill (drawn orders are free and
                // don't originate from the bulletin).
                setPendingAcceptOrder({ ...order, _fromDraw: true });
                showToast(`📋 ${t('订单已满，选择要替换的订单')}`, 'info');
            }
        } else if (drawnCell.type === 'pass') {
            // Immediately boost a random currently-shown candidate's drawLimit
            setWallCandidates(prev => {
                if (!prev || prev.length === 0) return prev;
                const idx = Math.floor(Math.random() * prev.length);
                return prev.map((w, i) => i === idx
                    ? { ...w, drawLimit: (w.drawLimit ?? w.wallFunction?.drawLimit ?? 5) + 1 }
                    : w);
            });
            showToast(`🎫 ${t('通行证')} +1`, 'success');
        } else if (drawnCell.type === 'shield') {
            setShieldCount(prev => prev + 1);
            showToast(`🛡️ ${t('护盾')} +1`, 'success');
        } else if (drawnCell.type === 'backpack') {
            setInventoryBonus(prev => prev + 1);
            showToast(`🎒 ${t('背包容量')} +1`, 'success');
        } else if (drawnCell.type === 'fast_pass') {
            setFastPassCount(prev => prev + 1);
            showToast(`⏩ ${t('普通撤离等待')} -1`, 'success');
        } else if (drawnCell.type === 'bomb') {
            // Bomb handled in matrix update below
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

            // Bomb: destroy adjacent 8 cells
            if (drawnCell.type === 'bomb') {
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

    // v3 order pricing by difficulty
    const ORDER_GOLD_COST = { easy: 1, medium: 2, hard: 3, extreme: 4 };

    /** Buy an order from bulletin board (costs gold, auto-refills bulletin) */
    const acceptOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;
        const cost = ORDER_GOLD_COST[order.difficulty] || 3;
        if (gold < cost) {
            showToast(t('金币不足！'), 'warning');
            return;
        }
        if (activeOrders.length >= orderConfig.maxActive) {
            setPendingAcceptOrder(order);
            return;
        }
        setGold(prev => prev - cost);
        // Remove from bulletin and auto-refill
        setBulletinBoard(prev => {
            const updated = prev.filter(o => o.id !== orderId);
            updated.push(generateOrder()); // auto-refill
            return updated;
        });
        setActiveOrders(prev => [...prev, order]);
    };

    /** Replace an active order with the pending one */
    const confirmReplaceOrder = (activeOrderId) => {
        if (!pendingAcceptOrder) return;
        // Strip the internal source marker before committing to state
        const { _fromDraw, ...cleanOrder } = pendingAcceptOrder;
        if (!_fromDraw) {
            // Bulletin-bought order: charge gold and refill bulletin slot
            const cost = ORDER_GOLD_COST[cleanOrder.difficulty] || 3;
            setGold(prev => prev - cost);
            setBulletinBoard(prev => {
                const updated = prev.filter(o => o.id !== cleanOrder.id);
                updated.push(generateOrder());
                return updated;
            });
        }
        setActiveOrders(prev => prev.map(o =>
            o.id === activeOrderId ? cleanOrder : o
        ));
        setPendingAcceptOrder(null);
    };

    /** Cancel the pending accept */
    const cancelReplaceOrder = () => {
        setPendingAcceptOrder(null);
    };

    /** Pay 3 gold to refresh all bulletin orders */
    const refreshBulletin = () => {
        if (gold < 3) { showToast(t('金币不足！'), 'warning'); return; }
        setGold(prev => prev - 3);
        const newOrders = [];
        const usedKeys = new Set();
        let attempts = 0;
        while (newOrders.length < orderConfig.bulletinCapacity && attempts < 50) {
            const order = generateOrder();
            const key = order.rewards.map(r => r.id).sort().join(',');
            if (!usedKeys.has(key)) { usedKeys.add(key); newOrders.push(order); }
            attempts++;
        }
        setBulletinBoard(newOrders);
        showToast(`🔄 ${t('公告牌已刷新')}`, 'success');
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
            const cell = doomGrid[cellIndex];
            const isHit = cell.type === 'danger';
            const damage = isHit ? 1 + (cell.level || 0) : 0;
            hpLoss += damage;
            finalSelections.push({ index: cellIndex, isHit, damage });
        }

        // Start with random spinning positions
        const spinningPositions = finalSelections.map(() =>
            Math.floor(Math.random() * doomConfig.gridSize)
        );

        setIsDoomResolving(true);
        setDoomAnimState({
            phase: 'spinning',
            tick: 0,
            totalTicks: 8,
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
            hits: finalSelections.map(s => ({ index: s.index, result: s.isHit ? 'danger' : 'empty', damage: s.damage || 0 })),
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

    // --- Normal evacuation countdown ---
    const [evacuationCountdown, setEvacuationCountdown] = useState(0); // 0 = not evacuating

    /** Calculate score from current inventory */
    const calcScore = (items) => {
        const outOfGameItems = items.filter(i => i.isOutOfGame);
        const bonusMap = new Map(bonusItems.map(b => [b.id, b.bonusValue || 2]));
        const baseScore = outOfGameItems.reduce((sum, item) => sum + (item.score || 0), 0);
        const bonusScore = outOfGameItems.reduce((sum, item) => sum + (bonusMap.get(item.id) || 0), 0);
        return { score: baseScore + bonusScore, baseScore, bonusScore, outOfGameItems };
    };

    /** Complete evacuation — score out-of-game items, end expedition */
    const finishEvacuation = (finalInventory, modalType = 'evacuated') => {
        const { score, baseScore, bonusScore, outOfGameItems } = calcScore(finalInventory);
        setExpeditionScores(prev => [...prev, { score, baseScore, bonusScore, items: outOfGameItems }]);
        setTotalScore(prev => prev + score);
        setModalContent(modalType);
        setPhase('game_over');
    };

    /** 1. 抽中撤离 — triggered by 🚪 cell, immediate, free */
    const handleDrawEvacuate = () => {
        finishEvacuation(inventory);
    };

    /** 2. 金币撤离 — costs 12 gold, immediate */
    const handleGoldEvacuate = () => {
        if (gold < 12) {
            showToast(t('金币不足！'), 'warning');
            return;
        }
        setGold(prev => prev - 12);
        finishEvacuation(inventory);
    };

    /** 3. 普通撤离 — 3 turns countdown, no cancel. fast_pass reduces by 1 (min 1). */
    const handleNormalEvacuate = () => {
        const countdown = Math.max(1, 3 - fastPassCount);
        setEvacuationCountdown(countdown);
        showToast(t('普通撤离已发起，剩余') + ` ${countdown} ` + t('回合'), 'info');
    };

    /** Run the emergency evac with a set of protected indices (0..N from safetyNetCount). */
    const runEmergencyEvacuation = (protectedIdxSet) => {
        const protectedItems = inventory.filter((_, i) => protectedIdxSet.has(i));
        const remaining = inventory.filter((_, i) => !protectedIdxSet.has(i));
        const shuffled = [...remaining].sort(() => Math.random() - 0.5);
        const keepCount = Math.ceil(shuffled.length / 2);
        const randomlyKept = shuffled.slice(0, keepCount);
        const kept = [...protectedItems, ...randomlyKept];
        setInventory(kept);
        finishEvacuation(kept, 'emergency_evacuated');
    };

    /** 4. 紧急撤离 — if safetyNetCount > 0, open picker; else immediate. */
    const handleEmergencyEvacuate = () => {
        if (safetyNetCount > 0 && inventory.length > 0) {
            // Auto-protect everything if stacks ≥ inventory
            if (safetyNetCount >= inventory.length) {
                const all = new Set(inventory.map((_, i) => i));
                runEmergencyEvacuation(all);
                return;
            }
            setEmergencyEvacMode(true);
            setEmergencyEvacProtected(new Set());
            return;
        }
        runEmergencyEvacuation(new Set());
    };

    const toggleEmergencyEvacItem = (index) => {
        if (!emergencyEvacMode) return;
        setEmergencyEvacProtected(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else if (next.size < safetyNetCount) {
                next.add(index);
            }
            return next;
        });
    };

    const confirmEmergencyEvacuate = () => {
        if (!emergencyEvacMode) return;
        const protectedSet = new Set(emergencyEvacProtected);
        setEmergencyEvacMode(false);
        setEmergencyEvacProtected(new Set());
        runEmergencyEvacuation(protectedSet);
    };

    const cancelEmergencyEvacuate = () => {
        setEmergencyEvacMode(false);
        setEmergencyEvacProtected(new Set());
    };

    /** Legacy single evacuate (for 🚪 cell and backward compat) */
    const handleEvacuate = handleDrawEvacuate;

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
        setCurrentWallFunction(null);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setRefreshCount(V3_INITIAL_STATE.refreshCount);
        setEvacuationCountdown(0);
        setAcquiredLongTerms([]);
        setAcquiredPersistents([]);
        setShieldCount(0);
        setFastPassCount(0);
        setSafetyNetCount(0);
        setEmergencyEvacMode(false);
        setEmergencyEvacProtected(new Set());
        setWallDrawLimit(Infinity);
        setInventoryBonus(0);
        setBlackmarketSold(new Set());
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger', level: 0 };
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
        setCurrentWallFunction(null);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setRefreshCount(V3_INITIAL_STATE.refreshCount);
        setEvacuationCountdown(0);
        setAcquiredLongTerms([]);
        setAcquiredPersistents([]);
        setShieldCount(0);
        setFastPassCount(0);
        setSafetyNetCount(0);
        setEmergencyEvacMode(false);
        setEmergencyEvacProtected(new Set());
        setWallDrawLimit(Infinity);
        setInventoryBonus(0);
        setBlackmarketSold(new Set());
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger', level: 0 };
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
        currentWallColor, currentWallFunction,
        pawnshopMode, pawnshopSelected, startPawnshop, togglePawnshopItem, confirmPawnshop, cancelPawnshop,
        useClinic, clinicUsed, useBlackmarket, blackmarketSold, blackmarketStock,
        shopStock, buyShopItem,
        lastDrawDirection,

        // v3 draw/economy state
        drawCount,
        totalDrawCount,
        refreshCount,
        wallDrawLimit,
        drawLimitReached,
        canUnlockWall,
        refreshWallCandidates,
        getDoomDraws,

        // Doom
        hp,
        doomGrid,
        dangerCount,
        maxDangerCount: doomConfig.maxDangerCount,
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
        handleEvacuate, handleDrawEvacuate, handleGoldEvacuate, handleNormalEvacuate, handleEmergencyEvacuate,
        evacuationCountdown,
        acquiredLongTerms, acquiredPersistents, shieldCount, fastPassCount,
        safetyNetCount,
        emergencyEvacMode, emergencyEvacProtected,
        toggleEmergencyEvacItem, confirmEmergencyEvacuate, cancelEmergencyEvacuate,
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
        acceptOrder, refreshBulletin,
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
