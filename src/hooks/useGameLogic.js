import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    getNextRarity,
    getEventPoolItems,
} from '../utils/helpers';
import { generateItemMatrix, applyGravity, applyBombExplosion } from '../utils/matrixHelpers';
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { EVENT_ITEMS, EVENT_DEFINITIONS } from '../data/constants';
import { useLanguage } from '../contexts/LanguageContext';

// === Event System Core Functions ===

/**
 * Compute active events for a given day based on event definitions, previous results, and game state.
 * Also handles carry-over events (deadline > current day, still active from previous day).
 */
const computeActiveEvents = (day, eventResults, gameState, previousActiveEvents = []) => {
    const active = [];
    const activeIds = new Set();

    // 1. Carry-over: events from previous days that haven't reached deadline yet and aren't resolved
    for (const evt of previousActiveEvents) {
        if (!eventResults[evt.id] && evt.deadline >= day) {
            active.push({ ...evt, status: 'active' });
            activeIds.add(evt.id);
        }
    }

    // 2. Process day's new events
    const dayEvents = EVENT_DEFINITIONS.filter(e => e.day === day);
    const excludedIds = new Set();

    for (const eventDef of dayEvents) {
        if (activeIds.has(eventDef.id)) continue; // Already carried over
        if (excludedIds.has(eventDef.id)) continue;

        if (eventDef.type === 'fixed') {
            active.push({ ...eventDef, status: 'active' });
            activeIds.add(eventDef.id);
        } else if (eventDef.type === 'random') {
            // Check exclusions
            if (eventDef.excludes) {
                const isExcluded = eventDef.excludes.some(id => activeIds.has(id));
                if (isExcluded) continue;
            }
            // Roll
            if (Math.random() < (eventDef.randomChance || 0.5)) {
                active.push({ ...eventDef, status: 'active' });
                activeIds.add(eventDef.id);
                // Mark exclusions
                if (eventDef.excludes) {
                    eventDef.excludes.forEach(id => excludedIds.add(id));
                }
            }
        } else if (eventDef.type === 'conditional') {
            // Check condition
            const { eventId, result } = eventDef.condition || {};
            if (eventId && eventResults[eventId] === result) {
                active.push({ ...eventDef, status: 'active' });
                activeIds.add(eventDef.id);
            }
        }
    }

    // 3. Handle E3a/E3b mutual exclusion: if neither was rolled in random, that's fine
    //    The excludes logic above handles this.

    // 4. Handle autoComplete events (E12)
    for (let i = 0; i < active.length; i++) {
        if (active[i].autoComplete && active[i].requirements.length === 0) {
            active[i] = { ...active[i], status: 'success' };
        }
    }

    // 5. Apply starving penalty: if starving, Day 3 events get +water requirement
    if (gameState.starving && day === 3) {
        for (let i = 0; i < active.length; i++) {
            const evt = active[i];
            if (evt.status === 'success') continue; // Skip auto-completed
            if (!evt.requirements.includes('water')) {
                active[i] = { ...evt, requirements: [...evt.requirements, 'water'] };
            }
        }
    }

    // 6. Apply extraRequirements
    for (let i = 0; i < active.length; i++) {
        const evt = active[i];
        if (evt.extraRequirements) {
            const { condition, items } = evt.extraRequirements;
            let shouldApply = false;
            if (condition === 'powerOut' && gameState.powerOut) {
                shouldApply = true;
            } else if (condition === 'E2_failed' && eventResults['E2'] === 'fail') {
                shouldApply = true;
            }
            if (shouldApply && items) {
                const newReqs = [...evt.requirements];
                items.forEach(itemId => {
                    if (!newReqs.includes(itemId)) {
                        newReqs.push(itemId);
                    }
                });
                active[i] = { ...evt, requirements: newReqs };
            }
        }
    }

    return active;
};

/**
 * Compute the item pool for the matrix based on active events' requirements.
 */
const computeItemPool = (activeEvents) => {
    const itemIdSet = new Set();
    for (const evt of activeEvents) {
        if (evt.status === 'success' || evt.status === 'fail') continue;
        for (const itemId of evt.requirements) {
            itemIdSet.add(itemId);
        }
    }
    return getEventPoolItems(EVENT_ITEMS, [...itemIdSet]);
};

// === Main Hook ===

export const useGameLogic = (config, initialSkills = [], onReset, initialScore = 0) => {
    const { t } = useLanguage();

    const currentStageConfig = config.stages[0]; // Always use stage 0
    const maxInventorySize = currentStageConfig.inventorySize;

    // === Event System State ===
    const [currentDay, setCurrentDay] = useState(1);
    const [events, setEvents] = useState([]); // Active events for current day
    const [eventResults, setEventResults] = useState({}); // { E1: 'success', E2: 'fail', ... }
    const [gameState, setGameState] = useState({}); // { powerOut: false, starving: false, ... }
    const [gamePhase, setGamePhase] = useState('playing'); // 'playing' | 'summary'

    // Gold System
    const [gold, setGold] = useState(config.global?.initialGold || 20);

    const DRAWS_PER_DAY = 10;
    const [drawsRemaining, setDrawsRemaining] = useState(DRAWS_PER_DAY);
    const [dayFailed, setDayFailed] = useState(false); // true if gold hit 0 this day

    const [drawCount, setDrawCount] = useState(0);

    const [matrix, setMatrix] = useState(null);
    const [gravityEvent, setGravityEvent] = useState(null);
    const [lastDraw, setLastDraw] = useState(null);
    const [explodingCells, setExplodingCells] = useState(null);

    const [inventory, setInventory] = useState([]);

    const [pendingItem, setPendingItem] = useState(null);
    const [pendingQueue, setPendingQueue] = useState([]);

    const [selectedSlot, setSelectedSlot] = useState(null);

    const [hoveredPoolId, setHoveredPoolId] = useState(null);
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
    const [hoveredPoolItemNames, setHoveredPoolItemNames] = useState([]);

    const [isSubmitMode, setIsSubmitMode] = useState(false);
    const [isRecycleMode, setIsRecycleMode] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState([]);

    // Which event is currently being submitted to
    const [submitTargetEventId, setSubmitTargetEventId] = useState(null);

    const [modalContent, setModalContent] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);

    const [skillState, setSkillState] = useState({
        consecutiveCommons: 0,
        nextDrawGuaranteedRare: false,
        nextDrawExtraItem: false,
        nextDrawEnhanced: false,
    });

    const [toast, setToast] = useState(null);
    const [goldFlash, setGoldFlash] = useState(false);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    const hasSkill = () => false; // Skills disabled in event prototype

    // Compute current item pool from active events
    const currentItemPool = useMemo(() => {
        return computeItemPool(events);
    }, [events]);

    // Deduct gold — if gold hits 0, day is failed (evacuation failure)
    const deductGold = (amount = 1) => {
        setGold(prev => {
            const newGold = Math.max(0, prev - amount);
            if (newGold <= 5 && newGold > 0) {
                showToast(`-${amount} 🪙  (${t("剩余")} ${newGold})`, "warning");
            }
            if (newGold === 0) {
                showToast(t("金币耗尽！撤离失败，今天的物品无法提交。"), "error");
                setDayFailed(true);
            }
            return newGold;
        });
        setGoldFlash(true);
        setTimeout(() => setGoldFlash(false), 600);
    };

    // === Initialize Day ===
    const initDay = useCallback((dayNumber, prevEventResults = {}, prevGameState = {}, prevEvents = []) => {
        // 1. Refresh gold and draws
        setGold(config.global?.initialGold || 20);
        setDrawsRemaining(DRAWS_PER_DAY);
        setDayFailed(false);

        // 2. Compute active events
        const activeEvents = computeActiveEvents(dayNumber, prevEventResults, prevGameState, prevEvents);

        // 3. Handle auto-complete events (E12): give random items
        for (const evt of activeEvents) {
            if (evt.autoComplete && evt.status === 'success') {
                const giveCount = evt.onSuccess?.giveRandomItems || 0;
                if (giveCount > 0) {
                    // Give random items from EVENT_ITEMS to inventory
                    const randomItems = [];
                    for (let i = 0; i < giveCount; i++) {
                        const randomEventItem = EVENT_ITEMS[Math.floor(Math.random() * EVENT_ITEMS.length)];
                        const rarity = config.rarity.find(r => r.id === 'uncommon') || config.rarity[0];
                        randomItems.push({
                            name: randomEventItem.name,
                            icon: randomEventItem.icon,
                            itemId: randomEventItem.itemId,
                            poolId: 'event',
                            poolName: 'event',
                            uid: Math.random().toString(36).substr(2, 9),
                            rarity,
                            obtainCount: 0,
                        });
                    }
                    setInventory(prev => {
                        const newInv = [...prev];
                        for (const item of randomItems) {
                            if (newInv.length < maxInventorySize) {
                                newInv.push(item);
                            }
                        }
                        return newInv;
                    });
                    showToast(`${t("邻居回礼")}：${t("获得了")} ${giveCount} ${t("个物品")}！`, 'success');
                }
                // Mark result
                prevEventResults[evt.id] = 'success';
            }
        }

        setEvents(activeEvents);
        setEventResults({ ...prevEventResults });

        // 4. Update item pool and regenerate matrix
        const pool = computeItemPool(activeEvents);
        if (pool.length > 0) {
            const newMatrix = generateItemMatrix(pool, config, currentStageConfig);
            setMatrix(newMatrix);
        }

        // 5. Reset UI state
        setIsSubmitMode(false);
        setIsRecycleMode(false);
        setSelectedIndices([]);
        setSelectedSlot(null);
        setSubmitTargetEventId(null);
    }, [config, currentStageConfig, maxInventorySize, t]);

    // === End Day ===
    const endDay = useCallback(() => {
        const newEventResults = { ...eventResults };
        const newGameState = { ...gameState };

        // 1. Fail incomplete events that have deadline === currentDay
        for (const evt of events) {
            if (evt.status === 'active' && evt.deadline === currentDay) {
                newEventResults[evt.id] = 'fail';

                // Apply onFail effects
                if (evt.onFail) {
                    if (evt.onFail.setState) {
                        Object.assign(newGameState, evt.onFail.setState);
                    }
                    // triggers are handled by conditional events on future days
                }
            }
        }

        // 2. Mark successful events that were already completed
        for (const evt of events) {
            if (evt.status === 'success' && !newEventResults[evt.id]) {
                newEventResults[evt.id] = 'success';
            }
        }

        setEventResults(newEventResults);
        setGameState(newGameState);

        if (currentDay >= 3) {
            // Game over - show summary
            setGamePhase('summary');
            return;
        }

        // 3. Advance day
        const nextDay = currentDay + 1;
        setCurrentDay(nextDay);

        // Keep carry-over events (deadline > currentDay, not yet resolved)
        const carryOver = events.filter(evt =>
            !newEventResults[evt.id] && evt.deadline > currentDay
        );

        initDay(nextDay, newEventResults, newGameState, carryOver);
    }, [currentDay, events, eventResults, gameState, initDay]);

    // === Submit Items to Event ===
    const submitToEvent = useCallback((eventId) => {
        if (dayFailed) {
            showToast(t("撤离失败，无法提交物品"), "error");
            return;
        }
        const evt = events.find(e => e.id === eventId);
        if (!evt || evt.status !== 'active') return;

        // Check if player has all required items (name-only matching)
        const requiredItems = [...evt.requirements];
        const usedIndices = [];
        const tempInv = [...inventory];

        for (const reqItemId of requiredItems) {
            const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
            if (!eventItem) continue;
            const invIdx = tempInv.findIndex((item, idx) =>
                item && item.name === eventItem.name && !usedIndices.includes(idx)
            );
            if (invIdx === -1) {
                showToast(t("物品不足，无法完成此事件"), 'error');
                return;
            }
            usedIndices.push(invIdx);
        }

        // Remove used items from inventory
        const newInventory = inventory.filter((_, idx) => !usedIndices.includes(idx));
        setInventory(newInventory);

        // Mark event as success
        const newEventResults = { ...eventResults, [eventId]: 'success' };
        setEventResults(newEventResults);

        // Update event status in active events
        setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, status: 'success' } : e
        ));

        // Apply onSuccess effects
        if (evt.onSuccess) {
            if (evt.onSuccess.setState) {
                setGameState(prev => ({ ...prev, ...evt.onSuccess.setState }));
            }
            // triggers handled by conditional events on future days
        }

        showToast(`${t("事件完成")}：${t(evt.name)}`, 'success');

        // Reset submit mode
        setIsSubmitMode(false);
        setSelectedIndices([]);
        setSubmitTargetEventId(null);
    }, [events, inventory, eventResults, dayFailed, t]);

    // Check if an event can be completed with current inventory
    const canCompleteEvent = useCallback((eventId) => {
        const evt = events.find(e => e.id === eventId);
        if (!evt || evt.status !== 'active') return false;

        const requiredItems = [...evt.requirements];
        const tempUsed = [];

        for (const reqItemId of requiredItems) {
            const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
            if (!eventItem) return false;
            const invIdx = inventory.findIndex((item, idx) =>
                item && item.name === eventItem.name && !tempUsed.includes(idx)
            );
            if (invIdx === -1) return false;
            tempUsed.push(invIdx);
        }
        return true;
    }, [events, inventory]);

    // === Matrix draw ===
    const refreshMatrix = useCallback(() => {
        if (currentItemPool.length > 0) {
            const newMatrix = generateItemMatrix(currentItemPool, config, currentStageConfig);
            setMatrix(newMatrix);
        }
    }, [currentItemPool, config, currentStageConfig]);

    // Initialize on first render
    useEffect(() => {
        initDay(1, {}, {}, []);
    }, []);

    // Process pending queue
    useEffect(() => {
        if (!pendingItem && pendingQueue.length > 0) {
            const nextItem = pendingQueue[0];
            if (inventory.length < maxInventorySize) {
                setPendingQueue(prev => prev.slice(1));
                setInventory(prev => [...prev, nextItem]);
            } else {
                setPendingQueue(prev => prev.slice(1));
                setPendingItem(nextItem);
                setSelectedSlot(null);
            }
        }
    }, [pendingItem, pendingQueue, inventory, maxInventorySize]);

    const handleIncomingItems = (newItems, overrideInventory = null) => {
        let currentInventory = overrideInventory ? [...overrideInventory] : [...inventory];
        let localPendingItem = pendingItem;
        let remainingQueue = [];

        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];

            if (localPendingItem) {
                remainingQueue.push(item);
                continue;
            }

            let slotIndex = -1;
            const existingNullIndex = currentInventory.indexOf(null);

            if (existingNullIndex !== -1) {
                slotIndex = existingNullIndex;
            }

            if (slotIndex !== -1) {
                currentInventory[slotIndex] = item;
            } else if (currentInventory.length < maxInventorySize) {
                currentInventory.push(item);
            } else {
                if (!localPendingItem) {
                    localPendingItem = item;
                    setPendingItem(item);
                    showToast(t("背包已满！"), "warning");
                } else {
                    remainingQueue.push(item);
                }
            }
        }

        if (remainingQueue.length > 0) {
            setPendingQueue(prev => [...prev, ...remainingQueue]);
        }

        setInventory(currentInventory);
    };

    // --- Row/Column selection: core draw action ---
    const [isDrawing, setIsDrawing] = useState(false);
    const drawTimerRef = { current: null };

    const selectRowOrColumn = (type, index) => {
        if (isDrawing || pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || modalContent) return;
        if (!matrix) return;
        if (drawsRemaining <= 0) {
            showToast(t("今天的抽取次数已用完"), "warning");
            return;
        }
        if (gold <= 0) {
            showToast(t("金币耗尽，无法抽取"), "warning");
            return;
        }

        const gridSize = MATRIX_CONFIG.gridSize;
        const cells = [];
        if (type === 'row') {
            for (let c = 0; c < gridSize; c++) cells.push({ cell: matrix[index][c], row: index, col: c });
        } else {
            for (let r = 0; r < gridSize; r++) cells.push({ cell: matrix[r][index], row: r, col: index });
        }

        const picked = cells[Math.floor(Math.random() * cells.length)];
        const selectedCell = picked.cell;
        const rawCellType = selectedCell.type || 'normal';

        // Blank check: normal items not needed by any active event show as blank
        const eventItemNames = new Set();
        for (const evt of events) {
            if (evt.status === 'active') {
                for (const itemId of evt.requirements) {
                    const eventItem = EVENT_ITEMS.find(ei => ei.itemId === itemId);
                    if (eventItem) eventItemNames.add(eventItem.name);
                }
            }
        }
        const cellType = (rawCellType === 'normal' && !eventItemNames.has(selectedCell.item.name)) ? 'blank' : rawCellType;

        setIsDrawing(true);
        setLastDraw({ row: picked.row, col: picked.col, item: selectedCell.item, rarity: selectedCell.rarity, cellType, tick: Date.now() });

        const capturedMatrix = matrix;
        const capturedInventory = [...inventory];
        const capturedSkillState = { ...skillState };

        drawTimerRef.current = setTimeout(() => {
            let afterPickMatrix = applyGravity(capturedMatrix, picked.row, picked.col, currentItemPool, config, currentStageConfig);

            if (cellType === 'blank') {
                setMatrix(afterPickMatrix);
                setGravityEvent({ col: picked.col, removedRow: picked.row, tick: Date.now() });
            } else if (cellType === 'gold_penalty') {
                setMatrix(afterPickMatrix);
                setGravityEvent({ col: picked.col, removedRow: picked.row, tick: Date.now() });
                deductGold(selectedCell.goldCost);
                showToast(`${t("金币陷阱")} -${selectedCell.goldCost} 🪙`, "warning");
            } else if (cellType === 'bomb') {
                showToast(t("💣 炸弹爆炸！"), "info");

                const neighbors = [];
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = picked.row + dr;
                        const nc = picked.col + dc;
                        if (nr >= 0 && nr < MATRIX_CONFIG.gridSize && nc >= 0 && nc < MATRIX_CONFIG.gridSize) {
                            neighbors.push({ row: nr, col: nc });
                        }
                    }
                }

                setExplodingCells(neighbors);

                setTimeout(() => {
                    const { matrix: explodedMatrix } = applyBombExplosion(capturedMatrix, picked.row, picked.col, currentItemPool, config, currentStageConfig);
                    setMatrix(explodedMatrix);
                    setExplodingCells(null);

                    const allRemoved = [{ row: picked.row, col: picked.col }, ...neighbors];
                    const colInfo = {};
                    for (const cell of allRemoved) {
                        if (!colInfo[cell.col]) colInfo[cell.col] = { count: 0, lowestRow: 0 };
                        colInfo[cell.col].count++;
                        colInfo[cell.col].lowestRow = Math.max(colInfo[cell.col].lowestRow, cell.row);
                    }
                    setGravityEvent({ bombExplosion: true, colInfo, tick: Date.now() });
                }, 350);

                setDrawCount(prev => prev + 1);
                setDrawsRemaining(prev => prev - 1);
                setTimeout(() => setIsDrawing(false), 700);
                return;
            } else {
                // Normal item cell
                let rarity = selectedCell.rarity;
                if (capturedSkillState.nextDrawEnhanced) {
                    const nextRarity = getNextRarity(rarity.id, config);
                    if (nextRarity) rarity = nextRarity;
                }

                let newItem = {
                    ...selectedCell.item,
                    uid: Math.random().toString(36).substr(2, 9),
                    rarity,
                    poolName: selectedCell.item.poolName || 'event',
                };

                let itemsToProcess = [newItem];

                setMatrix(afterPickMatrix);
                setGravityEvent({ col: picked.col, removedRow: picked.row, tick: Date.now() });

                const newSkillState = { ...capturedSkillState };
                newSkillState.nextDrawExtraItem = false;
                newSkillState.nextDrawGuaranteedRare = false;
                newSkillState.nextDrawEnhanced = false;

                if (itemsToProcess.every(item => item.rarity.id === 'common')) {
                    newSkillState.consecutiveCommons += 1;
                } else {
                    newSkillState.consecutiveCommons = 0;
                }

                setSkillState(newSkillState);
                handleIncomingItems(itemsToProcess, [...capturedInventory]);
            }

            setDrawCount(prev => prev + 1);
            setDrawsRemaining(prev => prev - 1);
            setIsDrawing(false);
        }, 450);
    };

    // === Slot Click Handler (Inventory) ===
    const handleSlotClick = (index) => {
        const clickedItem = inventory[index];

        if (isSubmitMode || isRecycleMode) {
            if (!inventory[index]) return;
            if (selectedIndices.includes(index)) {
                setSelectedIndices(prev => prev.filter(i => i !== index));
            } else {
                setSelectedIndices(prev => [...prev, index]);
            }
            return;
        }

        if (pendingItem) {
            const targetItem = inventory[index];
            if (targetItem && !targetItem.sterile && !pendingItem.sterile &&
                pendingItem.name === targetItem.name &&
                pendingItem.rarity.id === targetItem.rarity.id &&
                pendingItem.rarity.id !== 'mythic') {
                const nextRarity = getNextRarity(targetItem.rarity.id, config);
                const upgradedItem = { ...targetItem, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
                const newInventory = [...inventory];
                newInventory[index] = upgradedItem;
                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            // Normal Replace (Backpack Full)
            if (!targetItem) {
                const newInventory = [...inventory];
                newInventory[index] = pendingItem;
                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            const recycleGain = targetItem.rarity.recycleValue;
            if (recycleGain > 0) setGold(prev => prev + recycleGain);

            const newInventory = [...inventory];
            newInventory[index] = pendingItem;
            setInventory(newInventory);
            setPendingItem(null);
            return;
        }

        if (selectedSlot === null) {
            if (inventory[index]) setSelectedSlot(index);
            return;
        }
        if (selectedSlot === index) {
            setSelectedSlot(null);
            return;
        }
        if (typeof selectedSlot === 'number') {
            const sourceItem = inventory[selectedSlot];
            const targetItem = inventory[index];

            if (targetItem && !targetItem.sterile && !sourceItem.sterile &&
                sourceItem.name === targetItem.name &&
                sourceItem.rarity.id === targetItem.rarity.id &&
                sourceItem.rarity.id !== 'mythic') {
                const nextRarity = getNextRarity(sourceItem.rarity.id, config);
                const upgradedItem = { ...targetItem, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
                const newInventory = [...inventory];
                newInventory[index] = upgradedItem;
                newInventory[selectedSlot] = null;
                setInventory(newInventory.filter(item => item !== null));
                setSelectedSlot(null);
                return;
            }
            if (targetItem) {
                const newInventory = [...inventory];
                newInventory[index] = sourceItem;
                newInventory[selectedSlot] = targetItem;
                setInventory(newInventory);
                setSelectedSlot(null);
                return;
            }
            const newInventory = [...inventory];
            const [movedItem] = newInventory.splice(selectedSlot, 1);
            newInventory.splice(index, 0, movedItem);
            setInventory(newInventory);
            setSelectedSlot(null);
        }
    };

    const handleDiscardNew = () => {
        const recycleGain = pendingItem.rarity.recycleValue;
        if (recycleGain > 0) setGold(prev => prev + recycleGain);
        setPendingItem(null);
        setSelectedSlot(null);
    };

    // === Event Click Handler ===
    const handleEventClick = (eventId) => {
        const evt = events.find(e => e.id === eventId);
        if (!evt || evt.status !== 'active') return;

        if (isSubmitMode && submitTargetEventId === eventId) {
            // Toggle off
            setIsSubmitMode(false);
            setSelectedIndices([]);
            setSubmitTargetEventId(null);
            return;
        }

        // Enter submit mode for this event
        setIsSubmitMode(true);
        setIsRecycleMode(false);
        setSelectedSlot(null);
        setSubmitTargetEventId(eventId);

        // Auto-select matching items from inventory
        const requiredItems = [...evt.requirements];
        const indicesToSelect = [];
        const usedIndices = new Set();

        for (const reqItemId of requiredItems) {
            const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
            if (!eventItem) continue;
            const invIdx = inventory.findIndex((item, idx) =>
                item && item.name === eventItem.name && !usedIndices.has(idx)
            );
            if (invIdx !== -1) {
                indicesToSelect.push(invIdx);
                usedIndices.add(invIdx);
            }
        }

        setSelectedIndices(indicesToSelect);
    };

    // === Confirm Submission ===
    const handleConfirmSubmission = () => {
        if (!submitTargetEventId) {
            showToast(t("请先选择一个事件"), 'error');
            return;
        }

        submitToEvent(submitTargetEventId);
    };

    // === Recycle ===
    const totalRecycleValue = useMemo(() => {
        if (!isRecycleMode || selectedIndices.length === 0) return 0;
        return selectedIndices.reduce((sum, idx) => {
            const item = inventory[idx];
            return sum + (item ? item.rarity.recycleValue : 0);
        }, 0);
    }, [isRecycleMode, selectedIndices, inventory]);

    const handleConfirmRecycle = () => {
        if (selectedIndices.length === 0) return;
        let baseValue = totalRecycleValue;
        setGold(prev => prev + baseValue);
        const newInventory = inventory.filter((_, idx) => !selectedIndices.includes(idx));
        setInventory(newInventory);
        setIsRecycleMode(false);
        setSelectedIndices([]);
    };

    const toggleSubmitMode = () => {
        if (pendingItem || selectionMode) return;
        if (isSubmitMode) {
            setIsSubmitMode(false);
            setSelectedIndices([]);
            setSubmitTargetEventId(null);
        } else {
            setIsSubmitMode(true);
            setIsRecycleMode(false);
            setSelectedSlot(null);
        }
    };

    const toggleRecycleMode = () => {
        if (pendingItem || selectionMode) return;
        if (isRecycleMode) {
            setIsRecycleMode(false);
            setSelectedIndices([]);
        } else {
            setIsRecycleMode(true);
            setIsSubmitMode(false);
            setSelectedSlot(null);
            setSubmitTargetEventId(null);
        }
    };

    const handleSortInventory = () => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode) return;

        setInventory(prev => {
            const validItems = prev.filter(i => i !== null);
            validItems.sort((a, b) => {
                const nameDiff = a.name.localeCompare(b.name, 'zh-CN');
                if (nameDiff !== 0) return nameDiff;
                return (b.rarity.bonus || 0) - (a.rarity.bonus || 0);
            });

            const newInv = Array(maxInventorySize).fill(null);
            for (let i = 0; i < validItems.length; i++) {
                newInv[i] = validItems[i];
            }
            return newInv;
        });
        showToast(t("背包已整理"), "success");
    };

    const handleCloseModal = () => {
        setModalContent(null);
    };

    const handleSelectionSelect = () => {
        setSelectionMode(null);
    };

    const handleSelectionCancel = () => {
        setSelectionMode(null);
    };

    // === Debug: add items for an event ===
    const debugGetEventItems = (eventId) => {
        const evt = events.find(e => e.id === eventId);
        if (!evt) return;

        const itemsToAdd = evt.requirements.map(reqItemId => {
            const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
            if (!eventItem) return null;
            const rarity = config.rarity.find(r => r.id === 'common') || config.rarity[0];
            return {
                name: eventItem.name,
                icon: eventItem.icon,
                itemId: eventItem.itemId,
                poolId: 'event',
                poolName: 'event',
                uid: Math.random().toString(36).substr(2, 9),
                rarity,
                obtainCount: drawCount,
            };
        }).filter(Boolean);

        setInventory(prev => {
            const newInv = [...prev];
            itemsToAdd.forEach(item => {
                if (newInv.length < maxInventorySize) {
                    newInv.push(item);
                }
            });
            return newInv;
        });
        showToast(t("调试：已获取事件所需物品"), 'success');
    };

    // === New Game (Reset) ===
    const resetGame = useCallback(() => {
        setCurrentDay(1);
        setEvents([]);
        setEventResults({});
        setGameState({});
        setGamePhase('playing');
        setGold(20);
        setInventory([]);
        setDrawCount(0);
        setPendingItem(null);
        setPendingQueue([]);
        setSelectedSlot(null);
        setIsSubmitMode(false);
        setIsRecycleMode(false);
        setSelectedIndices([]);
        setSubmitTargetEventId(null);
        setModalContent(null);
        setSelectionMode(null);
        setSkillState({
            consecutiveCommons: 0,
            nextDrawGuaranteedRare: false,
            nextDrawExtraItem: false,
            nextDrawEnhanced: false,
        });

        // Re-init day 1
        setTimeout(() => initDay(1, {}, {}, []), 0);
    }, [initDay]);

    // Selected item names for highlighting
    const selectedItemNames = useMemo(() => {
        if (!isSubmitMode) return [];
        return selectedIndices.map(idx => inventory[idx]?.name).filter(Boolean);
    }, [isSubmitMode, selectedIndices, inventory]);

    return {
        state: {
            gold,
            currentStageConfig,
            maxInventorySize,
            drawCount,
            matrix, gravityEvent, lastDraw, isDrawing, explodingCells, goldFlash,
            inventory,
            pendingItem, pendingQueue,
            selectedSlot,
            hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
            setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
            isSubmitMode, isRecycleMode, selectedIndices,
            modalContent, selectionMode,
            toast,
            totalRecycleValue,
            selectedItemNames,
            skillState,
            // Event system
            currentDay,
            events,
            eventResults,
            gameState: gameState,
            gamePhase,
            submitTargetEventId,
            currentItemPool,
            drawsRemaining,
            dayFailed,
        },
        actions: {
            showToast,
            hideToast,
            selectRowOrColumn,
            handleCloseModal,
            handleSelectionSelect,
            handleSelectionCancel,
            handleSlotClick,
            handleDiscardNew,
            handleConfirmSubmission,
            handleConfirmRecycle,
            toggleSubmitMode,
            toggleRecycleMode,
            handleSortInventory,
            handleEventClick,
            endDay,
            submitToEvent,
            debugGetEventItems,
            resetGame,
        },
        helpers: {
            hasSkill,
            canCompleteEvent,
        }
    };
};
