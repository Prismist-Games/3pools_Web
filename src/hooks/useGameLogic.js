import { useState } from 'react';
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { AP_CONFIG, INITIAL_LIVES, WALL_TYPES } from '../data/v3Config';
import { generateSlotCard, canSatisfyCard, getRequirements, EVACUATION_PROFIT_REQUIREMENT } from '../data/slotCards';

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
    // phases: 'pre_game' | 'wall_choice' | 'drawing' | 'voucher_draft' | 'game_over'

    // --- Action Points ---
    const [actionPoints, setActionPoints] = useState(AP_CONFIG.maxAP);

    // --- Wall Choice State ---
    const [wallCandidates, setWallCandidates] = useState([]); // 3 candidates for wall_choice phase

    // --- Voucher Shelf State ---
    const [voucherShelf, setVoucherShelf] = useState([]); // length 5 during gameplay, empty outside
    const [voucherDraftCandidates, setVoucherDraftCandidates] = useState(null); // null or length-2 array

    // --- Turn Transition Context ---
    // Snapshot of danger-card rotation info captured in endTurn and consumed in
    // continueToNextTurn after the voucher_draft phase resolves.
    const [pendingTurnContext, setPendingTurnContext] = useState(null);

    // --- Pending Danger Cards ---
    // Count of extra danger cards queued for the next turn by drawing danger
    // cells (type 'danger_cell') from the wall. Reset to 0 after spawning.
    const [pendingDangerCards, setPendingDangerCards] = useState(0);

    // --- Pool State ---
    const [currentPool, setCurrentPool] = useState(null);   // { uid, poolType, grid, cellCounts } or null

    // --- Lives ---
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

    // =============================================
    // WALL CHOICE + VOUCHER SHELF
    // =============================================

    /**
     * Weighted pick of one wall type from WALL_TYPES.
     */
    const pickWallType = () => {
        const total = WALL_TYPES.reduce((s, t) => s + t.weight, 0);
        let roll = Math.random() * total;
        for (const t of WALL_TYPES) {
            roll -= t.weight;
            if (roll <= 0) return t;
        }
        return WALL_TYPES[0];
    };

    /**
     * Roll a fresh set of 3 wall candidates for the wall_choice phase.
     * Each candidate rolls a distinct wallType + sticker set and pre-builds
     * a plain grid (wall-type mutations like hidden/multiplier are applied
     * at pickWall time, not here, so the picker preview stays uniform).
     *
     * Shape: { uid, stickers, grid, wallType }.
     */
    const generateWallChoiceCandidates = () => {
        const candidates = [];
        const usedTypeIds = new Set();
        let attempts = 0;

        while (candidates.length < 3 && attempts < 30) {
            attempts++;
            const wallType = pickWallType();
            if (usedTypeIds.has(wallType.id)) continue;
            usedTypeIds.add(wallType.id);

            const stickers = pickWallStickers(STICKER_TYPES, 3, 4);
            const { grid } = generateWall(stickers, null, undefined);

            candidates.push({
                uid: generateUID(),
                stickers,
                grid,
                wallType,
            });
        }

        return candidates;
    };

    /** Roll a fresh full 5-voucher shelf */
    const generateFullVoucherShelf = (turn) => {
        const shelf = [];
        for (let i = 0; i < 5; i++) {
            shelf.push(generateSlotCard('profit', { turnCreated: turn }));
        }
        return shelf;
    };

    /** Roll 2 voucher candidates for voucher_draft phase */
    const generateVoucherDraftCandidates = (turn) => {
        return [
            generateSlotCard('profit', { turnCreated: turn }),
            generateSlotCard('profit', { turnCreated: turn }),
        ];
    };

    /**
     * pickWall — called from WallPicker in wall_choice phase. Clones the
     * pre-built grid and applies wall-type mutations (hidden masking for
     * 'hidden', multiplier flags for 'multiplier'). Drift and alternating
     * mutate at draw time, not here. No AP cost — entry is free.
     */
    const pickWall = (index) => {
        if (phase !== 'wall_choice') return;
        const candidate = wallCandidates[index];
        if (!candidate) return;

        const wallType = candidate.wallType;
        // Clone the grid so mutations don't leak into the unused candidates.
        const grid = candidate.grid.map(r => r.map(c => c ? { ...c } : null));

        if (wallType.id === 'hidden') {
            // Mark ~hiddenRatio of cells as hidden. Group cells hide together.
            const ratio = wallType.hiddenRatio || 0.3;
            const hiddenGroups = new Set();
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const cell = grid[r][c];
                    if (!cell || (cell.type !== 'sticker' && cell.type !== 'item')) continue;
                    if (cell.groupId && hiddenGroups.has(cell.groupId)) continue;
                    if (Math.random() < ratio) {
                        if (cell.groupId) {
                            hiddenGroups.add(cell.groupId);
                        } else {
                            cell.hidden = true;
                        }
                    }
                }
            }
            // Propagate group hiding to all cells in marked groups.
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c]?.groupId && hiddenGroups.has(grid[r][c].groupId)) {
                        grid[r][c].hidden = true;
                    }
                }
            }
        } else if (wallType.id === 'multiplier') {
            // Mark ~multiplierRatio of cells with multiplier = 2.
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

        setCurrentPool({
            uid: candidate.uid,
            wallType,
            stickers: candidate.stickers,
            // Backwards-compat poolType sub-object so GameCore's drawing
            // header and drawLimitReached derived state keep working.
            poolType: {
                name: wallType.name,
                icon: wallType.icon,
                drawLimit: Infinity,
                _bias: candidate.stickers?.map(s => s.id),
            },
        });
        setMatrix(grid);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setWallCandidates([]);
        setPhase('drawing');
    };

    /**
     * exitWall — end the current wall and auto-end the turn. The player flows
     * through voucher_draft and then lands in wall_choice with fresh candidates
     * and a new turn's AP. Also used by the drain detector in completeDrawAnim.
     */
    const exitWall = () => {
        setCurrentPool(null);
        setMatrix(null);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        endTurn();
    };

    /**
     * replaceVoucher — commit a draft candidate into a shelf slot, then finish
     * the turn transition via continueToNextTurn.
     */
    const replaceVoucher = (candidateIdx, targetSlotIdx) => {
        if (phase !== 'voucher_draft') return;
        if (!voucherDraftCandidates) return;
        const candidate = voucherDraftCandidates[candidateIdx];
        if (!candidate) return;
        if (targetSlotIdx < 0 || targetSlotIdx >= voucherShelf.length) return;

        setVoucherShelf(prev => {
            const next = [...prev];
            next[targetSlotIdx] = candidate;
            return next;
        });
        setVoucherDraftCandidates(null);
        continueToNextTurn();
    };

    /**
     * skipVoucherDraft — shelf unchanged, finish the turn transition.
     */
    const skipVoucherDraft = () => {
        if (phase !== 'voucher_draft') return;
        setVoucherDraftCandidates(null);
        continueToNextTurn();
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
     * Collect reward items from all satisfied vouchers on the shelf.
     * Stickers are NOT consumed. Backpack capacity does NOT apply at
     * evacuation — every satisfied reward counts toward the final score.
     */
    const collectEvacuationRewards = () => {
        const rewardItems = [];
        for (const voucher of voucherShelf) {
            if (!voucher) continue;
            if (!canSatisfyCard(voucher, inventory)) continue;
            if (!voucher.reward?.items) continue;
            for (const item of voucher.reward.items) {
                // Spread to preserve rarity/tags/nameEn (needed by Kitchen scoring).
                rewardItems.push({
                    ...item,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
        }
        return rewardItems;
    };

    /** Remove a specific slot card (e.g., player discards it). */
    const removeSlotCard = (cardId) => {
        setSlotCards(prev => prev.filter(c => c.id !== cardId));
    };

    // Derived: danger cards come from slotCards (which is now pure-danger since
    // profits moved to voucherShelf). Evacuation reads from the shelf.
    const dangerCards_slot = slotCards.filter(c => c.type === 'danger');

    const satisfiedProfitCount = voucherShelf.filter(v => v && canSatisfyCard(v, inventory)).length;
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
        setLives(INITIAL_LIVES);

        // Turn 1 danger card (rotation scaling starts at 1, same as before).
        const turn1Dangers = [generateSlotCard('danger', { turnCreated: 1 })];
        setSlotCards(turn1Dangers);
        setPendingDangerCards(0);

        // Pre-roll a full 5-voucher shelf and a fresh 3-candidate wall choice.
        setVoucherShelf(generateFullVoucherShelf(1));
        setVoucherDraftCandidates(null);
        setWallCandidates(generateWallChoiceCandidates());

        setCurrentPool(null);
        setMatrix(null);
        setPhase('wall_choice');
    };

    /** End current turn manually (forfeits remaining AP) */
    const endTurn = () => {
        // Snapshot sticker types required by current danger cards so the next turn's
        // danger cards can exclude them (rotation rule — see game_rules.md).
        const prevDangerStickerTypes = Array.from(new Set(
            slotCards
                .filter(c => c.type === 'danger')
                .flatMap(c => Object.keys(getRequirements(c)))
        ));

        // Check danger slot cards before opening the voucher draft
        checkDangerCards();

        // Stash rotation context so continueToNextTurn can honor it after the draft
        setPendingTurnContext({ excludeStickerTypes: prevDangerStickerTypes });

        // Every turn end unconditionally opens a voucher draft
        setVoucherDraftCandidates(generateVoucherDraftCandidates(turnNumber + 1));
        setPhase('voucher_draft');
    };

    /**
     * continueToNextTurn — entered from replaceVoucher or skipVoucherDraft after
     * the draft is resolved. Resets AP, spawns new danger cards, routes to
     * drawing (if a wall is held) or wall_choice (if not).
     */
    const continueToNextTurn = () => {
        const excludeStickerTypes = pendingTurnContext?.excludeStickerTypes ?? [];
        setPendingTurnContext(null);

        const nextTurn = turnNumber + 1;
        setTurnNumber(nextTurn);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setDrawCount(0);

        // Danger card count = turn-scaled baseline + any pending extras queued by
        // danger cells drawn during this past turn.
        const baselineCount = Math.ceil(nextTurn / 2);
        const totalDangerCount = baselineCount + pendingDangerCards;
        const newDangerCards = [];
        for (let i = 0; i < totalDangerCount; i++) {
            newDangerCards.push(generateSlotCard('danger', {
                turnCreated: nextTurn,
                excludeStickerTypes,
            }));
        }
        setSlotCards(prev => [...prev, ...newDangerCards]);
        setPendingDangerCards(0);

        // If the player still holds a wall, resume drawing. Otherwise roll fresh
        // wall candidates — this covers the "drained wall then ended turn" case.
        if (currentPool) {
            setPhase('drawing');
        } else {
            setWallCandidates(generateWallChoiceCandidates());
            setPhase('wall_choice');
        }
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
        // Skip empty (null) cells — the random pick only considers filled cells.
        const activeCols = row
            .map((cell, colIndex) => (cell !== null ? colIndex : -1))
            .filter(i => i !== -1);
        if (activeCols.length === 0) {
            showToast(t('此行已空'), 'info');
            return;
        }

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

        // Skip empty (null) cells — the random pick only considers filled cells.
        const activeCols = matrix
            .map((row, rowIndex) => (row[colIndex] !== null ? rowIndex : -1))
            .filter(i => i !== -1);
        if (activeCols.length === 0) {
            showToast(t('此列已空'), 'info');
            return;
        }

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

        const mult = drawnCell?.multiplier || 1;
        let obtainedItem = null;
        const wallTypeId = currentPool?.wallType?.id;

        // --- Normal wall draw handling ---
        if (drawnCell === null || drawnCell.type === 'blank') {
            showToast(t('\u7A7A\u683C'), 'info');
        } else if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'bomb') {
            // Bomb: destroy adjacent 8 cells (handled below in the matrix update)
        } else if (drawnCell.type === 'danger_cell') {
            // Queue extra danger cards for next turn. Multiplier wall doubles.
            const n = mult || 1;
            setPendingDangerCards(prev => prev + n);
            showToast(`⚠️ ${t('下回合危险卡')} +${n}`, 'warning');
        }

        // Mutate the grid: null drawn cells, bomb explosion, hidden-wall
        // adjacent reveal, drift shuffle.
        const mutateGrid = (prevMatrix) => {
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

            // Hidden wall: reveal adjacent hidden cells (whole group reveals together)
            if (wallTypeId === 'hidden') {
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
            // across the entire grid (including previously-empty slots).
            if (wallTypeId === 'drift') {
                const cells = [];
                for (let r = 0; r < newMatrix.length; r++) {
                    for (let c = 0; c < newMatrix[r].length; c++) {
                        if (newMatrix[r][c] !== null) {
                            cells.push(newMatrix[r][c]);
                            newMatrix[r][c] = null;
                        }
                    }
                }
                // Shuffle cells
                for (let i = cells.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [cells[i], cells[j]] = [cells[j], cells[i]];
                }
                // Collect all positions and shuffle
                const allPositions = [];
                for (let r = 0; r < newMatrix.length; r++) {
                    for (let c = 0; c < newMatrix[r].length; c++) {
                        allPositions.push([r, c]);
                    }
                }
                for (let i = allPositions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
                }
                // Redistribute cells into first N shuffled positions
                for (let i = 0; i < cells.length; i++) {
                    const [r, c] = allPositions[i];
                    newMatrix[r][c] = cells[i];
                }
            }

            return newMatrix;
        };

        // Null the drawn cells (and apply wall-type mutations), then check
        // if the wall is fully drained. If so schedule exitWall on the next
        // tick — doing it inside the updater keeps the order deterministic.
        let drainedAfterThisDraw = false;
        setMatrix(prev => {
            const next = mutateGrid(prev);
            drainedAfterThisDraw = next.every(row => row.every(c => c === null));
            return next;
        });
        if (drainedAfterThisDraw) {
            setTimeout(() => exitWall(), 400);
        }

        if (obtainedItem) {
            setFlyingItem({
                icon: obtainedItem.item?.icon || obtainedItem.icon,
                name: obtainedItem.item?.name || obtainedItem.name,
                shapeSize: obtainedItem.shapeSize || 1,
                rowIndex: finalRowIndex,
                colIndex: finalColIndex,
                id: Date.now(),
            });
            // Multiplier wall: add the item mult times. Only applies to
            // stickers/items (multiplying out_of_game items is unbalanced).
            if (mult > 1 && (obtainedItem.type === 'sticker' || obtainedItem.type === 'item')) {
                for (let i = 0; i < mult; i++) {
                    addToInventory({ ...obtainedItem, uid: generateUID() });
                }
                showToast(`×${mult} ${t('贴纸')}`, 'success');
            } else {
                addToInventory(obtainedItem);
            }
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

    /** Evacuate — collect rewards and finish evacuation flow */
    const evacuate = () => {
        if (!canEvacuate) return;
        const rewardItems = collectEvacuationRewards();
        if (rewardItems.length > 0) {
            showToast(`🎁 ${t('物品兑换券兑换')} ×${rewardItems.length}`, 'success');
        }
        setSlotCards([]);
        // Merge rewards into live inventory so the game-over Kitchen fridge
        // can see the items the player just earned. Inventory is cleared on
        // startNextExpedition / handleReset.
        const finalInventory = [...inventory, ...rewardItems];
        setInventory(finalInventory);
        finishEvacuation(finalInventory, 'evacuated');
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
        setWallCandidates([]);
        setVoucherShelf([]);
        setVoucherDraftCandidates(null);
        setPendingTurnContext(null);
        setPendingDangerCards(0);
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
        setWallCandidates([]);
        setVoucherShelf([]);
        setVoucherDraftCandidates(null);
        setPendingTurnContext(null);
        setPendingDangerCards(0);
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

        // Wall Choice
        wallCandidates,
        pickWall,
        exitWall,

        // Voucher Shelf + Draft
        voucherShelf,
        voucherDraftCandidates,
        replaceVoucher,
        skipVoucherDraft,

        // Pool state
        currentPool,
        drawLimitReached,

        // Danger cards + evacuation (passive matching)
        dangerCards: dangerCards_slot,
        pendingDangerCards,
        canEvacuate,
        satisfiedProfitCount,
        evacuationProfitRequirement: EVACUATION_PROFIT_REQUIREMENT,
        addSlotCard,
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
