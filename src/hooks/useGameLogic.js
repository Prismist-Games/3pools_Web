import { useState, useMemo, useEffect, useRef } from 'react';
import { generateWall, pickMarketIngredients } from '../utils/matrixHelpers';
import { generateWallFromTemplate } from '../utils/templateGenerator';
import { LEVEL_TEMPLATES } from '../data/levelTemplates';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS, ORDER_TEMPLATES, MARKET_TYPES, QUALITY_CONFIG, QUALITY_WEIGHTS, DISHES } from '../data/v2Config';
import { LIVE_CONFIG } from '../data/runtimeConfig';
import { pickDoomEmoji } from '../data/matrixConfig';

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
    const templates = LIVE_CONFIG.orderTemplates;
    const total = templates.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of templates) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return templates[0];
}

function rollQuality() {
    const entries = Object.entries(LIVE_CONFIG.qualityWeights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [qId, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return Number(qId);
    }
    return 1;
}

// Distribute reqBudget (score-value units) across slotCount requirement slots.
// Returns an array of quality IDs. Each slot targets avgScore ±25% variance,
// mapped to the nearest quality tier — creating natural quality mixing.
function assignQualitiesFromBudget(reqBudget, slotCount) {
    const avgScore = reqBudget / slotCount;
    return Array.from({ length: slotCount }, () => {
        const targetScore = avgScore * (0.75 + Math.random() * 0.5);
        return QUALITY_CONFIG.reduce((best, q) =>
            Math.abs(q.scoreValue - targetScore) < Math.abs(best.scoreValue - targetScore) ? q : best
        , QUALITY_CONFIG[0]).id;
    });
}

function pickMarketType() {
    const total = MARKET_TYPES.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of MARKET_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return MARKET_TYPES[0];
}

// Index ingredients by 二级 tag (tags[1]). Each entry collects the tag's shared
// icon, its 大类, and the list of concrete ingredient ids that belong to it —
// used by order generation (pick tag) and reward resolution (pick concrete).
const TAG2_INDEX = (() => {
    const map = new Map();
    for (const ing of INGREDIENTS) {
        const [categoryTag, tag2] = ing.tags;
        if (!map.has(tag2)) {
            map.set(tag2, { tag2, categoryTag, icon: ing.icon, ingredientIds: [] });
        }
        map.get(tag2).ingredientIds.push(ing.id);
    }
    return map;
})();
const TAG2_ENTRIES = [...TAG2_INDEX.values()];

function generateOrder() {
    const template = pickWeightedTemplate();

    const rewardQualityDef = QUALITY_CONFIG.find(q => q.id === template.rewardQuality) || QUALITY_CONFIG[0];

    // Pick N distinct 二级 tag entries for requirements — fully random,
    // no cross-category constraint (may include multiple tags from the same 大类).
    const selectedTag2 = [...TAG2_ENTRIES].sort(() => Math.random() - 0.5).slice(0, template.ingredientTypes);

    // Reward tag2: avoid duplicating any requirement tag2 (same 小类), but
    // 大类 collisions between reward and reqs are allowed now.
    const reqTag2Set = new Set(selectedTag2.map(e => e.tag2));
    const rewardPool = TAG2_ENTRIES.filter(e => !reqTag2Set.has(e.tag2));
    const rewardEntry = rewardPool[Math.floor(Math.random() * rewardPool.length)]
        || TAG2_ENTRIES[Math.floor(Math.random() * TAG2_ENTRIES.length)];
    const finalReward = {
        tag2: rewardEntry.tag2,
        categoryTag: rewardEntry.categoryTag,
        icon: rewardEntry.icon,
        name: rewardEntry.tag2,
        tags: [rewardEntry.categoryTag, rewardEntry.tag2],
        quality: template.rewardQuality,
        score: rewardQualityDef.scoreValue,
        isOutOfGame: true,
    };

    // Assign quality to each slot.
    //   qualityDist (explicit, e.g. hard/extreme) → shuffle + slot 1:1 map
    //   reqBudget  (legacy, e.g. easy/medium)    → distribute with ±25% variance
    // Shuffle so display order doesn't reveal the tier ladder.
    let qualityIds;
    if (template.qualityDist) {
        qualityIds = [...template.qualityDist].sort(() => Math.random() - 0.5);
        // Pad/truncate defensively so length == selectedTag2.length
        while (qualityIds.length < selectedTag2.length) qualityIds.push(1);
        qualityIds = qualityIds.slice(0, selectedTag2.length);
    } else {
        qualityIds = assignQualitiesFromBudget(template.reqBudget, selectedTag2.length);
    }
    const requirements = selectedTag2.map((entry, i) => ({
        tag2: entry.tag2,
        categoryTag: entry.categoryTag,
        icon: entry.icon,
        name: entry.tag2,
        tags: [entry.categoryTag, entry.tag2],
        quality: qualityIds[i],
        count: 1,
    }));

    return { id: generateUID(), difficulty: template.difficulty, rewards: [finalReward], totalScore: finalReward.score, requirements };
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

    // --- Day / Meta State ---
    // Switched from expedition (3-run cap, totalScore goal) to day (unbounded,
    // popularity-driven). expeditionNumber/setExpeditionNumber aliased to
    // day state so legacy reads don't break.
    const [dayNumber, setDayNumber] = useState(0);
    const [popularity, setPopularity] = useState(10);
    const [lastCookResult, setLastCookResult] = useState(null);
    const expeditionNumber = dayNumber;
    const setExpeditionNumber = setDayNumber;
    // Legacy state retained for backward compat; not driven by the cook loop.
    const [expeditionScores, setExpeditionScores] = useState([]);
    const [totalScore, setTotalScore] = useState(0);

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [gold, setGold] = useState(0);
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);
    const [currentWallType, setCurrentWallType] = useState(null);
    const [currentLevel, setCurrentLevel] = useState(null); // hand-crafted level for reveal overlay
    const [lastDrawDirection, setLastDrawDirection] = useState(null);
    // 3-choose-1 candidates surfaced during 'wall_choice' phase. Each is
    // { marketIngredients, grid, doomCellCount, wallType }
    const [wallCandidates, setWallCandidates] = useState(null);
    // Set when the player clicks a candidate on the picker — holds the
    // chosen candidate while the reveal overlay shows the modifier/level
    // for a confirm-click. Commit-on-click: no back-out once peeked.
    const [pendingWallCandidate, setPendingWallCandidate] = useState(null);

    // --- Board Effect State ---
    const [gravityActive, setGravityActive] = useState(false);
    const [gravityDrops, setGravityDrops] = useState(null); // { "row-col": dropDistance } for animation
    const [rotationMoves, setRotationMoves] = useState(null); // { "row-col": {fromRow, fromCol} } for center-rotate animation
    const [growthFlashes, setGrowthFlashes] = useState(null); // Set of "row-col" keys for savage-growth flash feedback
    const [chessColor, setChessColor] = useState(null); // 'black' | 'white' — chessboard boardEffect only
    const [sourceEdge, setSourceEdge] = useState(null); // 'top'|'bottom'|'left'|'right' — channel_flow boardEffect only

    // --- Sub-Level State ---
    const [wallStack, setWallStack] = useState([]); // stack of { matrix, gold, wallType }
    const isInSubLevel = wallStack.length > 0;

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger', emoji: pickDoomEmoji() };
        }
        return grid;
    });
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);
    const [isDoomResolving, setIsDoomResolving] = useState(false);
    const [doomAnimState, setDoomAnimState] = useState(null);
    const [doomResolutionResult, setDoomResolutionResult] = useState(null);
    const [afterDoomAction, setAfterDoomAction] = useState(null); // null | 'end_turn'

    // --- Inventory State ---
    // inventory = show-only basket (菜篮)
    // fridge    = home-side persistent storage (冰箱). On return-to-restaurant
    //   all out-of-game items move from inventory to fridge; cooking consumes
    //   from fridge. Leftovers persist across days.
    const [inventory, setInventory] = useState([]);
    const [fridge, setFridge] = useState([]);

    // --- Inventory Pending Queue ---
    const [pendingItems, setPendingItems] = useState([]); // queue of items awaiting placement when inventory full

    // --- Order State ---
    const [bulletinBoard, setBulletinBoard] = useState([]);
    const REFRESH_INITIAL_CHARGES = 3;
    const [refreshCharges, setRefreshCharges] = useState(REFRESH_INITIAL_CHARGES);
    // ID of the order whose submit modal is open. Null when no modal is shown.
    const [submittingOrderId, setSubmittingOrderId] = useState(null);

    // --- Incoming Order Queue ---
    // Each element is { id, candidates: [orderA, orderB] }. UI reads the
    // front (`incomingQueue[0]`) and it gets consumed via
    // confirm/discard/replace. Keeping this as a queue (not a single slot)
    // lets simultaneous sources stack: completion auto-refill + manual
    // refresh + setup-time 5-pack all coexist without overwriting.
    const [incomingQueue, setIncomingQueue] = useState([]);
    // Set when the player picks a candidate while shelf is full — UI enters
    // "choose which shelf order to replace" mode. Declared up here (instead
    // of next to replaceBulletinOrder) so the setup useEffect below can
    // reference it without hitting the temporal dead zone.
    const [pendingChosenOrder, setPendingChosenOrder] = useState(null);

    // --- Opening Setup ---
    // `dishIntroPending`: true while the "today's dish" overlay is still
    // waiting for the player to dismiss it. During setup, the player also
    // picks 5 orders via the incoming queue before the first wall generates.
    const [dishIntroPending, setDishIntroPending] = useState(false);
    const [currentDish, setCurrentDish] = useState(null);

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
                        newGrid[i] = { type: 'danger', emoji: pickDoomEmoji() };
                        added++;
                    }
                }
                return newGrid;
            });
        }

        // Reset draw direction for alternating wall
        setLastDrawDirection(null);

        // Generate up to 3 unique market candidates (capped at available types to prevent infinite loop).
        const maxCandidates = Math.min(3, MARKET_TYPES.length);
        const candidates = [];
        const usedTypeIds = new Set();
        while (candidates.length < maxCandidates) {
            const marketType = pickMarketType();
            if (usedTypeIds.has(marketType.id)) continue;
            usedTypeIds.add(marketType.id);
            const marketIngredients = pickMarketIngredients(marketType);
            const { grid, doomCellCount } = generateWall(marketIngredients);
            candidates.push({ marketIngredients, grid, doomCellCount, wallType: marketType });
        }
        setWallCandidates(candidates);
        setPhase('wall_choice');
    };

    /** Player picks one of the 3 market candidates — apply it immediately. */
    const selectWall = (index) => {
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        wallDrawCountRef.current = 0;
        setCurrentWallType(chosen.wallType);
        setMatrix(chosen.grid.map(r => r.map(c => c ? { ...c } : null)));
        setWallCandidates(null);
        setPhase('drawing');
    };

    /** Player clicks past the reveal — apply the chosen candidate. */
    const confirmWallReveal = () => {
        if (!pendingWallCandidate) return;
        const chosen = pendingWallCandidate;
        setPendingWallCandidate(null);
        setWallCandidates(null);
        applyWallCandidate(chosen);
    };

    /** Start the game: show today's dish, then let the player assemble the
     *  initial bulletin via SETUP_CONFIG.pickCount × pick-1-of-2 events. The
     *  first wall does NOT generate until setup finishes — that way the
     *  The first wall does NOT generate until setup finishes. */
    const startGame = () => {
        setExpeditionNumber(prev => prev + 1);

        // Pick today's dish — fixed order by day. Day 1 → DISHES[0],
        // Day 2 → DISHES[1], cycles afterwards.
        const nextDay = expeditionNumber + 1;
        const dish = DISHES[(nextDay - 1) % DISHES.length];
        setCurrentDish(dish);
        setDishIntroPending(true);

        setBulletinBoard([]);
        setPendingChosenOrder(null);
        setPhase('setup');
        // Queue will be filled once the player dismisses the dish intro
        // (see dismissDishIntro below).
    };

    /** Player dismisses the "today's dish" overlay — auto-fill the shelf
     *  with 4 initial orders. No more setup picking. */
    const dismissDishIntro = () => {
        if (!dishIntroPending) return;
        setDishIntroPending(false);
        const initial = [];
        for (let i = 0; i < 4; i++) {
            initial.push(generateOrder());
        }
        setBulletinBoard(initial);
    };

    // When the setup queue drains (after the 5 initial picks), auto-start
    // the first wall. Gated on dishIntro being dismissed so we don't fire
    // while the queue is still empty waiting for the intro.
    useEffect(() => {
        if (phase !== 'setup') return;
        if (dishIntroPending) return;
        if (incomingQueue.length > 0) return;
        if (pendingChosenOrder) return;
        startNewTurn();
    }, [phase, dishIntroPending, incomingQueue.length, pendingChosenOrder]);

    /** Channel-flow water resolution. Runs at end of turn, before the
     *  standard end-turn doom round. BFS (8-neighbor) from dug source-edge
     *  cells; each visited cell resolves under the same rules a normal
     *  draw would, except every effect is queued and applied in one batch.
     *  Returns the count of doom_resolution cells flooded — caller folds
     *  that into the doom resolution call so animation fires once. */
    const resolveWaterFlow = () => {
        if (currentLevel?.boardEffect !== 'channel_flow') return 0;
        if (!matrix || !sourceEdge) return 0;
        const rows = matrix.length;
        const cols = matrix[0].length;

        // Step 1: entry points = dug cells on the source edge.
        const entryPoints = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!matrix[r][c]?.dug) continue;
                const onEdge = (
                    (sourceEdge === 'top'    && r === 0) ||
                    (sourceEdge === 'bottom' && r === rows - 1) ||
                    (sourceEdge === 'left'   && c === 0) ||
                    (sourceEdge === 'right'  && c === cols - 1)
                );
                if (onEdge) entryPoints.push([r, c]);
            }
        }
        if (entryPoints.length === 0) return 0;

        // Step 2: BFS 8-neighbor through dug cells, recording wave layers.
        const DIRS_8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        const visited = new Set();
        for (const [r, c] of entryPoints) visited.add(`${r}-${c}`);
        const layers = [];
        let frontier = entryPoints;
        while (frontier.length > 0) {
            layers.push(frontier);
            const next = [];
            for (const [r, c] of frontier) {
                for (const [dr, dc] of DIRS_8) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                    const key = `${nr}-${nc}`;
                    if (visited.has(key)) continue;
                    if (!matrix[nr][nc]?.dug) continue;
                    visited.add(key);
                    next.push([nr, nc]);
                }
            }
            frontier = next;
        }

        // Step 3: walk layers and produce a new matrix + batched effects.
        const newMatrix = matrix.map(r => r.map(c => c ? { ...c } : null));
        const consumed = new Set();
        const inventoryAdds = [];
        let goldGain = 0;
        let healGain = 0;
        let bagExpand = 0;
        let orderAddCount = 0;
        let totalDoomResolutions = 0;
        let bombFired = false;

        // Cell becomes content-empty but keeps dug flag (so water in later
        // waves can still flow through). Non-dug cells go to null.
        const clearContent = (r, c) => {
            const cell = newMatrix[r][c];
            if (!cell) return;
            const wasDug = !!cell.dug;
            newMatrix[r][c] = wasDug
                ? { type: 'empty', dug: true, uid: generateUID() }
                : null;
        };

        for (const layer of layers) {
            // Sub-pass 1: collect content. Same-wave cells gathered here
            // are immune to bombs that detonate in sub-pass 2.
            for (const [r, c] of layer) {
                if (consumed.has(`${r}-${c}`)) continue;
                const cell = newMatrix[r][c];
                if (!cell) continue;

                if (cell.type === 'ingredient' || cell.type === 'out_of_game') {
                    inventoryAdds.push({ ...cell });
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                } else if (cell.type === 'gold') {
                    goldGain += cell.goldAmount || 0;
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                } else if (cell.type === 'order_cell') {
                    orderAddCount += 1;
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                } else if (cell.type === 'heal') {
                    healGain += cell.healAmount || 1;
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                } else if (cell.type === 'backpack_expand') {
                    bagExpand += cell.expandAmount || 1;
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                }
            }

            // Sub-pass 2: structural effects (bombs, doom).
            for (const [r, c] of layer) {
                const orig = matrix[r][c];
                if (!orig) continue;
                if (orig.type === 'bomb') {
                    for (const [dr, dc] of DIRS_8) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                        if (consumed.has(`${nr}-${nc}`)) continue;
                        consumed.add(`${nr}-${nc}`);
                        clearContent(nr, nc);
                    }
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                    bombFired = true;
                } else if (orig.type === 'doom_resolution') {
                    totalDoomResolutions += 1;
                    consumed.add(`${r}-${c}`);
                    clearContent(r, c);
                }
            }
        }

        setMatrix(newMatrix);
        if (goldGain > 0) {
            setGold(prev => prev + goldGain);
            showToast(`💧 ${t('抽数')} +${goldGain}`, 'success');
        }
        if (healGain > 0) {
            setHp(prev => Math.min(prev + healGain, doomConfig.initialHP));
            showToast(`💧 ❤️‍🩹 HP +${healGain}`, 'success');
        }
        if (bagExpand > 0) {
            setInventoryBonus(prev => prev + bagExpand);
            showToast(`💧 🎒 ${t('菜篮')} +${bagExpand}`, 'success');
        }
        for (let i = 0; i < orderAddCount; i++) addBulletinOrder();
        if (orderAddCount > 0) {
            showToast(`💧 📋 ${t('新订单')} +${orderAddCount}`, 'info');
        }
        for (const item of inventoryAdds) {
            addToInventory(item);
        }
        if (bombFired) {
            showToast('💧 💣 ' + t('炸弹爆炸！'), 'warning');
        }

        return totalDoomResolutions;
    };

    /** End current turn: resolve doom once, then go to between-turns decision.
     *  Channel_flow levels first run water flow (which may queue extra doom
     *  resolution rounds), then fold those into a single resolveDoom call. */
    const endTurn = () => {
        if (currentLevel?.boardEffect === 'channel_flow') {
            const extraRounds = resolveWaterFlow();
            resolveDoom('end_turn', 1 + extraRounds);
        } else {
            resolveDoom('end_turn');
        }
    };

    /** Continue to next turn. Per-turn auto refill removed — shelf stays
     *  full via completion-triggered auto refill and the manual refresh
     *  button. */
    const continueToNextTurn = () => {
        startNewTurn();
    };

    /** Dev tool: force-load any level template immediately, regardless of phase. */
    const loadTestLevel = (template) => {
        const marketType = pickMarketType();
        const marketIngredients = pickMarketIngredients(marketType);
        const result = generateWallFromTemplate(template, marketIngredients);
        wallDrawCountRef.current = 0;
        setupBoardEffect(template, result.grid);
        setCurrentLevel(template);
        setCurrentWallType(marketType);
        setWallCandidates(null);
        setPendingWallCandidate(null);
        setMatrix(result.grid);
        setLastDrawResult(null);
        setGravityActive(false);
        setGold(template.settings?.gold ?? turnConfig.goldPerTurn);
        if (turnNumber === 0) setTurnNumber(1);
        setPhase('drawing');
    };

    /** Apply a chosen wall candidate. Modifier-specific grid mutations and
     *  wallType randomization are baked in at candidate-generation time
     *  (finalizeProceduralCandidate), so this is now just a state setter
     *  plus gold override and phase transition. */
    const applyWallCandidate = (chosen) => {
        wallDrawCountRef.current = 0;
        setCurrentWallType(chosen.wallType || null);
        setCurrentLevel(chosen.level || null);

        if (chosen.wallType?.goldOverride !== undefined) {
            setGold(chosen.wallType.goldOverride);
        }
        if (chosen.level?.settings?.gold !== undefined) {
            setGold(chosen.level.settings.gold);
        }

        const grid = chosen.level
            ? setupBoardEffect(chosen.level, chosen.grid.map(r => r.map(c => c ? { ...c } : null)))
            : chosen.grid;
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

        // Generate and load sub-level — inherit parent wall's market type if available
        const subMarketType = currentWallType && currentWallType.category ? currentWallType : pickMarketType();
        const subMarketIngredients = pickMarketIngredients(subMarketType);
        const result = generateWallFromTemplate(subLevel, subMarketIngredients);
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
    // Tracks how many draws have completed on the current wall, for board effects tied to draw count.
    const wallDrawCountRef = useRef(0);

    /** Chessboard boardEffect setup: tag each cell with cellColor based on
     *  (r+c) parity, then overwrite a random cell of each color with a
     *  state_switch so the player can transit both ways. Mutates grid in
     *  place. Returns grid. */
    const setupChessboardGrid = (grid) => {
        const black = [];
        const white = [];
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                if (!grid[r][c]) continue;
                const color = (r + c) % 2 === 0 ? 'black' : 'white';
                grid[r][c].cellColor = color;
                if (color === 'black') black.push([r, c]);
                else white.push([r, c]);
            }
        }
        const switchCfg = MATRIX_CONFIG.specialCells.stateSwitch;
        const place = (positions, color) => {
            if (positions.length === 0) return;
            const [pr, pc] = positions[Math.floor(Math.random() * positions.length)];
            grid[pr][pc] = {
                type: 'state_switch',
                icon: switchCfg.icon,
                name: switchCfg.name,
                cellColor: color,
                uid: generateUID(),
            };
        };
        place(black, 'black');
        place(white, 'white');
        return grid;
    };

    /** Apply boardEffect-specific setup at level entry. Mutates the grid
     *  for effects that need cell tagging (e.g. chessboard) and resets
     *  any per-effect state on the player side. Always called before
     *  setMatrix during loadTestLevel / applyWallCandidate. */
    const setupBoardEffect = (level, grid) => {
        const eff = level?.boardEffect;
        if (eff === 'quality_upgrade') {
            upgradeGridCells(grid);
            setChessColor(null);
            setSourceEdge(null);
        } else if (eff === 'channel_flow') {
            const edges = ['top', 'bottom', 'left', 'right'];
            setSourceEdge(edges[Math.floor(Math.random() * edges.length)]);
            setChessColor(null);
        } else if (eff === 'chessboard') {
            setupChessboardGrid(grid);
            setChessColor(Math.random() < 0.5 ? 'black' : 'white');
            setSourceEdge(null);
        } else {
            setChessColor(null);
            setSourceEdge(null);
        }
        return grid;
    };

    /** Pure helper: applies 2 quality upgrades directly to a grid array (for level-load trigger).
     *  Returns the mutated grid (same reference). */
    const upgradeGridCells = (grid) => {
        const upgradeable = [];
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
                if (grid[r][c]?.type === 'ingredient') upgradeable.push([r, c]);
            }
        }
        if (upgradeable.length === 0) return grid;
        for (let i = 0; i < 2; i++) {
            const [ur, uc] = upgradeable[Math.floor(Math.random() * upgradeable.length)];
            const cell = grid[ur][uc];
            grid[ur][uc] = { ...cell, minQuality: Math.min((cell.minQuality ?? 1) + 1, 5) };
        }
        return grid;
    };

    /** Quality upgrade board effect: upgrade 2 random ingredient cells (with replacement)
     *  via React state, excluding the cell just drawn. Used after draws 1 and 2. */
    const applyQualityUpgrade = (excludeRow, excludeCol) => {
        const upgradeable = [];
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
                const cell = matrix[r][c];
                if (cell?.type === 'ingredient' && !(r === excludeRow && c === excludeCol)) {
                    upgradeable.push([r, c]);
                }
            }
        }
        if (upgradeable.length === 0) return;
        const positions = [];
        for (let i = 0; i < 2; i++) {
            positions.push(upgradeable[Math.floor(Math.random() * upgradeable.length)]);
        }
        setMatrix(prev => {
            const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
            for (const [ur, uc] of positions) {
                const qCell = newMatrix[ur][uc];
                if (qCell?.type === 'ingredient') {
                    newMatrix[ur][uc] = { ...qCell, minQuality: Math.min((qCell.minQuality ?? 1) + 1, 5) };
                }
            }
            return newMatrix;
        });
        showToast('✨ 食材品质提升 ×2', 'info');
        setGrowthFlashes(new Set(positions.map(([r, c]) => `${r}-${c}`)));
        setTimeout(() => setGrowthFlashes(null), 400);
    };

    const selectRow = (rowIndex) => {
        if (phase !== 'drawing' && phase !== 'drawing_sub') return;
        if (isDoomResolving || isDrawAnimating) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        const row = matrix[rowIndex];
        const activeCols = [];
        const isChannelFlow = currentLevel?.boardEffect === 'channel_flow';
        const chessFilter = currentLevel?.boardEffect === 'chessboard' ? chessColor : null;
        row.forEach((cell, colIndex) => {
            if (cell === null || cell.type === 'empty') return;
            if (isChannelFlow && cell.dug) return;
            if (chessFilter && cell.cellColor !== chessFilter) return;
            activeCols.push(colIndex);
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

        setDoomResolutionResult(null);
        setFlyingItem(null);
        setLastDrawResult(null);

        // activeCols here are actually active row indices for this column
        const activeCols = [];
        const isChannelFlow = currentLevel?.boardEffect === 'channel_flow';
        const chessFilter = currentLevel?.boardEffect === 'chessboard' ? chessColor : null;
        matrix.forEach((row, rowIndex) => {
            const cell = row[colIndex];
            if (cell === null || cell.type === 'empty') return;
            if (isChannelFlow && cell.dug) return;
            if (chessFilter && cell.cellColor !== chessFilter) return;
            activeCols.push(rowIndex);
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

        // Discard-keep board effect: odd draws (1st, 3rd, 5th) are discarded with no effects.
        if (currentLevel?.boardEffect === 'discard_keep') {
            wallDrawCountRef.current += 1;
            if (wallDrawCountRef.current % 2 === 1) {
                setMatrix(prev => {
                    const m = prev.map(r => r.map(c => c ? { ...c } : null));
                    m[finalRowIndex][finalColIndex] = null;
                    if (gravityActive) {
                        const rows = m.length, cols = m[0].length;
                        let moved = true;
                        while (moved) {
                            moved = false;
                            for (let r = rows - 2; r >= 0; r--) {
                                for (let c = 0; c < cols; c++) {
                                    const cell = m[r][c];
                                    if (!cell || cell.type === 'empty') continue;
                                    if (m[r + 1][c] === null) {
                                        m[r + 1][c] = cell;
                                        m[r][c] = null;
                                        moved = true;
                                    }
                                }
                            }
                        }
                    }
                    return m;
                });
                const discardIcon = drawnCell.item?.icon || drawnCell.icon || '';
                const discardName = drawnCell.item?.name || drawnCell.name || '';
                showToast(`🚫 ${t('丢弃')} ${discardIcon} ${t(discardName)}`, 'warning');
                setLastDrawResult({ rowIndex: finalRowIndex, colIndex: finalColIndex, obtained: null, doomEffects: { resolutions: 0 } });
                setDrawAnimState(null);
                return;
            }
        }

        // Channel flow: drawing only carves the cell into a canal; all
        // resolution is deferred to end-of-turn water flow. Mark dug,
        // preserve content, fire no effects.
        if (currentLevel?.boardEffect === 'channel_flow') {
            setMatrix(prev => {
                const next = prev.map(r => r.map(c => c ? { ...c } : null));
                if (next[finalRowIndex]?.[finalColIndex]) {
                    next[finalRowIndex][finalColIndex].dug = true;
                }
                return next;
            });
            setLastDrawResult({
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                obtained: null,
                doomEffects: { resolutions: 0 },
                dugOnly: true,
            });
            setDrawAnimState(null);
            return;
        }

        // Buff field coverage at the drawn cell — bomb is explicitly unaffected.
        const buffCov = drawnCell.type === 'bomb'
            ? 0
            : countBuffFieldCoverage(matrix, finalRowIndex, finalColIndex);
        const buffMult = buffCov + 1;
        const mult = (drawnCell.multiplier || 1) * buffMult;
        let obtainedItem = null;
        const doomEffects = { resolutions: 0 };

        if (drawnCell.type === 'ingredient' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'doom_resolution') {
            doomEffects.resolutions = 1 * mult;
        } else if (drawnCell.type === 'gold') {
            const goldGain = drawnCell.goldAmount * mult;
            setGold(prev => prev + goldGain);
            showToast(`${t('抽数')} +${goldGain}${mult > 1 ? ' (×' + mult + ')' : ''}`, 'success');
        } else if (drawnCell.type === 'order_cell') {
            // Order cells queue an additional pick-1-of-2 for the end of
            // this wall (resolved in between_turns along with the default
            // one from endTurn).
            addBulletinOrder();
            showToast(`📋 ${t('新订单')} +1`, 'info');
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
        } else if (drawnCell.type === 'state_switch') {
            // Chessboard switch: flip the player's color. No other effect; the
            // cell removal happens in the standard setMatrix block below.
            const next = drawnCell.cellColor === 'black' ? 'white' : 'black';
            setChessColor(next);
            const label = next === 'black' ? t('黑') : t('白');
            showToast(`☯️ ${t('身份切换')} → ${label}`, 'info');
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
            if (mirrorCell.type === 'ingredient' || mirrorCell.type === 'out_of_game') {
                if (mMult > 1 && mirrorCell.type === 'ingredient') {
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
            } else if (mirrorCell.type === 'gold') {
                const g = mirrorCell.goldAmount * mMult;
                setGold(prev => prev + g);
                showToast(`🪞 ${t('镜像')} ${t('抽数')} +${g}`, 'success');
            } else if (mirrorCell.type === 'order_cell') {
                addBulletinOrder();
                showToast(`🪞 ${t('镜像')}: 📋 ${t('新订单')} +1`, 'info');
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

        // Remove drawn cell(s) and apply wall modifiers
        setMatrix(prev => {
            const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));

            // Clear the drawn cell and mirror cell (if mirror modifier active).
            newMatrix[finalRowIndex][finalColIndex] = null;
            if (mirrorCell && mirrorRow !== null && mirrorCol !== null) {
                newMatrix[mirrorRow][mirrorCol] = null;
            }

            // Bomb: destroy all adjacent cells (8 directions). Runs for the
            // drawn cell and (if mirror modifier) for the mirror cell too.
            // Chessboard: bomb only damages cells of the same color (the
            // player's current side); the opposite-color "phantom" cells
            // are unaffected, so a black bomb wipes its 4 diagonal black
            // neighbors and leaves the 4 orthogonal white cells alone.
            const bombDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            const isChessboard = currentLevel?.boardEffect === 'chessboard';
            const explodeAt = (br, bc, bombColor) => {
                for (const [dr, dc] of bombDirs) {
                    const nr = br + dr;
                    const nc = bc + dc;
                    if (nr < 0 || nr >= newMatrix.length || nc < 0 || nc >= newMatrix[0].length) continue;
                    const target = newMatrix[nr][nc];
                    if (!target) continue;
                    if (isChessboard && bombColor && target.cellColor !== bombColor) continue;
                    newMatrix[nr][nc] = null;
                }
            };
            let bombFired = false;
            if (drawnCell.type === 'bomb') {
                explodeAt(finalRowIndex, finalColIndex, drawnCell.cellColor);
                bombFired = true;
            }
            if (mirrorCell?.type === 'bomb') {
                explodeAt(mirrorRow, mirrorCol, mirrorCell.cellColor);
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
            const yieldCount = mult;
            const flyId = Date.now();
            console.log('[FLY-DIAG] setFlyingItem called, id =', flyId, 'yieldCount =', yieldCount);
            setFlyingItem({
                icon: obtainedItem.item.icon,
                name: obtainedItem.item.name,
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                count: yieldCount,
                id: flyId,
            });
            if (yieldCount > 1) {
                for (let i = 0; i < yieldCount; i++) {
                    addToInventory({ ...obtainedItem, uid: generateUID() });
                }
            } else {
                addToInventory(obtainedItem);
            }
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

        // Quality upgrade board effect: fire after draws 1 and 2 (not 3).
        if (currentLevel?.boardEffect === 'quality_upgrade') {
            wallDrawCountRef.current += 1;
            if (wallDrawCountRef.current <= 2) {
                applyQualityUpgrade(finalRowIndex, finalColIndex);
            }
        }
    };

    // =============================================
    // INVENTORY
    // =============================================

    const addToInventory = (itemCell) => {
        const rolled = itemCell.item?.quality ?? rollQuality();
        const quality = Math.max(rolled, itemCell.minQuality ?? 1);
        const qualityDef = QUALITY_CONFIG.find(q => q.id === quality) || QUALITY_CONFIG[0];
        const newItem = {
            ...itemCell.item,
            quality,
            score: qualityDef.scoreValue,
            isOutOfGame: true,
            uid: itemCell.uid,
        };
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

    /** Synthesize: merge 2 identical items at the same quality into the next quality tier */
    const synthesizeItems = (index1, index2) => {
        const item1 = inventory[index1];
        const item2 = inventory[index2];
        if (!item1 || !item2) return false;
        if (item1.id !== item2.id || item1.quality !== item2.quality) return false;
        if (item1.quality >= 5) return false;

        const newQuality = item1.quality + 1;
        const newQualityDef = QUALITY_CONFIG.find(q => q.id === newQuality) || QUALITY_CONFIG[QUALITY_CONFIG.length - 1];

        setInventory(prev => {
            const next = [...prev];
            const [lo, hi] = index1 < index2 ? [index1, index2] : [index2, index1];
            next.splice(hi, 1);
            next.splice(lo, 1);
            next.push({ ...item1, quality: newQuality, score: newQualityDef.scoreValue, uid: generateUID() });
            return next;
        });

        showToast(`${t('合成成功')}: ${item1.icon} ${item1.name} (${newQualityDef.name})`, 'success');
        return true;
    };

    /** Swap two inventory positions (both must exist in the packed array). */
    const swapInventoryItems = (i, j) => {
        if (i === j) return false;
        setInventory(prev => {
            if (i < 0 || j < 0 || i >= prev.length || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
        return true;
    };

    /** If pending head item can synthesize with inventory[idx] (same id + same
     *  quality + quality < 5), merge: consume pending, upgrade inventory[idx]
     *  to next quality tier. Returns true if synthesis happened. */
    const synthesizeWithPending = (idx) => {
        if (pendingItems.length === 0) return false;
        const pending = pendingItems[0];
        const target = inventory[idx];
        if (!target || !pending) return false;
        if (!target.isOutOfGame || !pending.isOutOfGame) return false;
        if (target.id !== pending.id) return false;
        if (target.quality !== pending.quality) return false;
        if (target.quality >= 5) return false;

        const newQuality = target.quality + 1;
        const newQualityDef = QUALITY_CONFIG.find(q => q.id === newQuality) || QUALITY_CONFIG[QUALITY_CONFIG.length - 1];

        setInventory(prev => prev.map((it, i) => i === idx
            ? { ...target, quality: newQuality, score: newQualityDef.scoreValue, uid: generateUID() }
            : it
        ));
        setPendingItems(prev => prev.slice(1));
        showToast(`${t('合成成功')}: ${target.icon} ${target.name} (${newQualityDef.name})`, 'success');
        return true;
    };

    /** Debug: add items directly to inventory */
    const debugAddItem = (itemDef, count) => {
        const quality = itemDef.quality || 1;
        const qualityDef = QUALITY_CONFIG.find(q => q.id === quality) || QUALITY_CONFIG[0];
        const makeItem = () => ({
            ...itemDef,
            quality,
            score: qualityDef.scoreValue,
            isOutOfGame: true,
            uid: generateUID(),
        });

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

    /** Push a new 2-candidate incoming event to the back of the queue. */
    const addBulletinOrder = () => {
        setIncomingQueue(prev => [...prev, {
            id: generateUID(),
            candidates: [generateOrder(), generateOrder()],
        }]);
    };

    /** Player picks one of the two candidates at the front of the queue.
     *  If shelf is full, hold the chosen order as pendingChosenOrder and
     *  enter replacement mode. Either way the queue head is consumed. */
    const confirmIncomingOrder = (chosenOrder) => {
        const head = incomingQueue[0];
        if (!head) return;
        if (bulletinBoard.length >= orderConfig.bulletinCapacity) {
            setPendingChosenOrder(chosenOrder);
            setIncomingQueue(prev => prev.slice(1));
            return;
        }
        setBulletinBoard(prev => [...prev, chosenOrder]);
        setIncomingQueue(prev => prev.slice(1));
    };

    /** Replace a shelf order with the pending chosen order (when shelf is full) */
    const replaceBulletinOrder = (orderId) => {
        if (!pendingChosenOrder) return;
        setBulletinBoard(prev => prev.map(o => o.id === orderId ? pendingChosenOrder : o));
        setPendingChosenOrder(null);
    };

    /** Discard current incoming event. During opening setup this is gated by
     *  UI (player cannot skip — see GameCore), so discard only happens during
     *  normal play when the player actively declines both candidates or
     *  cancels a replacement. */
    const discardIncomingOrder = () => {
        if (pendingChosenOrder) {
            setPendingChosenOrder(null);
            return;
        }
        setIncomingQueue(prev => prev.slice(1));
    };

    /** Check if player has required ingredients to submit an order (checks bulletinBoard).
     *  Matches by 二级 tag (`tags[1] === req.tag2`) with quality ≥ req.quality.
     *  Allocates inventory items greedily per req to avoid double-counting. */
    const canSubmitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return false;
        const used = new Set();
        for (const req of order.requirements) {
            let allocated = 0;
            for (let i = 0; i < inventory.length && allocated < req.count; i++) {
                if (used.has(i)) continue;
                const item = inventory[i];
                if (item?.tags?.[1] === req.tag2 && item.quality >= req.quality) {
                    used.add(i);
                    allocated++;
                }
            }
            if (allocated < req.count) return false;
        }
        return true;
    };

    /** Open the submit modal for an order. The modal lets the player pick
     *  which specific inventory items to consume (for each tag2 requirement)
     *  and which concrete ingredient to receive as the reward. */
    const submitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;
        if (!canSubmitOrder(orderId)) {
            showToast(t('食材不足'), 'warning');
            return;
        }
        setSubmittingOrderId(orderId);
    };

    const cancelSubmitOrder = () => setSubmittingOrderId(null);

    /** Commit the submit-modal choices: consume selected uids, grant the
     *  chosen concrete rewards. If inventory is full, excess rewards queue
     *  to pendingItems for replace/discard resolution.
     *  @param orderId        the order being submitted
     *  @param consumeUids    array of inventory uids the player chose to consume
     *  @param rewardChoices  array of ingredient ids (one per reward slot) */
    const confirmSubmitOrder = (orderId, consumeUids, rewardChoices) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;

        const toRemoveUids = new Set(consumeUids);

        const concreteRewards = order.rewards.map((r, i) => {
            const chosenId = rewardChoices[i];
            const chosen = INGREDIENTS.find(ing => ing.id === chosenId)
                || INGREDIENTS.find(ing => ing.tags?.[1] === r.tag2)
                || INGREDIENTS[0];
            const qualityDef = QUALITY_CONFIG.find(q => q.id === r.quality) || QUALITY_CONFIG[0];
            return {
                ...chosen,
                quality: r.quality,
                score: qualityDef.scoreValue,
                isOutOfGame: true,
                uid: generateUID(),
            };
        });

        // Route rewards through pendingItems if inventory would overflow
        const remaining = inventory.filter(item => item && !toRemoveUids.has(item.uid));
        const capacity = maxInventorySize - remaining.length;
        const toInventory = concreteRewards.slice(0, Math.max(0, capacity));
        const toPending = concreteRewards.slice(Math.max(0, capacity));

        setInventory([...remaining, ...toInventory]);
        if (toPending.length > 0) setPendingItems(prev => [...prev, ...toPending]);

        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        setSubmittingOrderId(null);
        // Completing an order offers a pick-1-of-2 just like leaving a wall.
        addBulletinOrder();
        showToast(t('订单完成'), 'success');
    };

    /** Manual refresh: consume 1 charge to push a new 2-candidate event to
     *  the queue. Multiple refreshes can stack — the player will resolve
     *  them one at a time. Blocked only during an active replacement step. */
    const triggerRefresh = () => {
        if (refreshCharges <= 0) return;
        if (pendingChosenOrder) return;
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
                const cell = doomGrid[cellIndex];
                const isHit = cell.type === 'danger';
                if (isHit) hpLoss++;
                finalSelections.push({ index: cellIndex, isHit, emoji: cell.emoji || pickDoomEmoji() });
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
            // Leaving a wall always offers a pick-1-of-2 order.
            addBulletinOrder();
        }
    };

    // =============================================
    // EVACUATION → RESTAURANT → COOK RESULT → NEXT DAY
    // =============================================

    /** Player evacuates — leave the show, take the basket back to the
     *  kitchen. Transfers out-of-game items from the basket (inventory)
     *  into the home fridge (persistent across days), then clears them
     *  out of the basket. Stickers stay in the inventory until startNextDay
     *  resets it (they don't belong in the fridge). */
    const returnToRestaurant = () => {
        const outOfGame = inventory.filter(i => i.isOutOfGame);
        if (outOfGame.length > 0) {
            setFridge(prev => [...prev, ...outOfGame]);
            setInventory(prev => prev.filter(i => !i.isOutOfGame));
        }
        setPhase('restaurant');
    };

    /** Legacy alias: handleEvacuate now routes to the restaurant phase
     *  instead of ending the run. The full-screen Kitchen component
     *  renders while phase === 'restaurant'. */
    const handleEvacuate = returnToRestaurant;

    /** Invoked by Kitchen's cook button. Consumes the placed ingredient
     *  uids from the fridge (persistent home storage), bumps popularity,
     *  stores the result for the cook_result phase to display. */
    const handleCookResult = (result, usedUids) => {
        if (usedUids && usedUids.length > 0) {
            const uidSet = new Set(usedUids);
            setFridge(prev => prev.filter(item => !uidSet.has(item.uid)));
        }
        setPopularity(prev => Math.max(0, prev + (result?.popularityDelta || 0)));
        setLastCookResult(result);
        setPhase('cook_result');
    };

    /** Player clicks past the cook result screen to start the next day.
     *  Resets per-day state (HP, doom, inventory, orders, matrix, etc.)
     *  but keeps dayNumber, popularity. Returns to pre_game
     *  so the normal startGame → setup → day loop takes over. */
    const startNextDay = () => {
        setTurnNumber(0);
        setGold(0);
        setMatrix(null);
        setWallCandidates(null);
        setPendingWallCandidate(null);
        setCurrentWallType(null);
        setCurrentLevel(null);
        setLastDrawDirection(null);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger', emoji: pickDoomEmoji() };
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
        setRefreshCharges(REFRESH_INITIAL_CHARGES);
        setIncomingQueue([]);
        setDishIntroPending(false);
        setCurrentDish(null);
        setLastCookResult(null);
        setPhase('pre_game');
    };

    /** HP-zero path: no restaurant, no cook. Basket is lost entirely and
     *  the run ends. Player has to reset to start over. */
    const handleGameOver = () => {
        setInventory([]);
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
                grid[i] = { type: 'danger', emoji: pickDoomEmoji() };
            }
            return grid;
        });
        setDoomLevel(doomConfig.initialDoomLevel);
        setIsDoomResolving(false);
        setDoomAnimState(null);
        setDoomResolutionResult(null);
        setAfterDoomAction(null);
        setInventory([]);
        setFridge([]);
        setBulletinBoard([]);
        setPendingChosenOrder(null);
        setRefreshCharges(REFRESH_INITIAL_CHARGES);
        setIncomingQueue([]);
        setDishIntroPending(false);
        setCurrentDish(null);
        setWallCandidates(null);
        setPendingWallCandidate(null);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setDayNumber(0);
        setPopularity(10);
        setLastCookResult(null);
        setExpeditionScores([]);
        setTotalScore(0);
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
                grid[i] = { type: 'danger', emoji: pickDoomEmoji() };
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
        setRefreshCharges(REFRESH_INITIAL_CHARGES);
        setIncomingQueue([]);
        setDishIntroPending(false);
        setCurrentDish(null);
        setWallCandidates(null);
        setPendingWallCandidate(null);
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
        // Day / Meta state
        dayNumber,
        popularity,
        lastCookResult,
        // Legacy aliases (expeditionNumber === dayNumber)
        expeditionNumber,
        expeditionScores,
        totalScore,
        expeditionConfig,

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
        wallCandidates,

        // Board Effects
        gravityDrops,
        rotationMoves,
        growthFlashes,
        chessColor,
        sourceEdge,

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
        fridge,
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
        selectWall,
        confirmWallReveal,
        pendingWallCandidate,
        selectRow,
        selectColumn,
        endTurn,
        continueToNextTurn,
        handleEvacuate,
        returnToRestaurant,
        handleCookResult,
        startNextDay,
        handleReset,
        startNextExpedition,
        tickDoomResolution,
        completeDoomResolution,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        synthesizeItems,
        swapInventoryItems,
        synthesizeWithPending,
        debugAddItem,
        discardPendingItem,
        submitOrder,
        canSubmitOrder,
        submittingOrder: submittingOrderId ? bulletinBoard.find(o => o.id === submittingOrderId) : null,
        confirmSubmitOrder,
        cancelSubmitOrder,
        triggerRefresh,
        incomingOrder: incomingQueue[0] || null,
        incomingQueueLength: incomingQueue.length,
        confirmIncomingOrder,
        discardIncomingOrder,
        replaceBulletinOrder,

        // Opening setup
        dishIntroPending,
        currentDish,
        dismissDishIntro,
        loadTestLevel,
    };
};
