import { useState, useEffect, useMemo } from 'react';
import {
    getAllNormalItems,
    generateOrder,
    generateRoomNeedOrder,
    getNextRarity,
    getRandomItems,
    rollRarity
} from '../utils/helpers';
import { generateItemMatrix, applyGravity, applyBombExplosion } from '../utils/matrixHelpers';
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { SKILL_DEFINITIONS, TOOL_ITEMS, DOOM_CONFIG, ROOM_NEEDS } from '../data/constants';
import { useLanguage } from '../contexts/LanguageContext';

export const useGameLogic = (config, initialSkills = [], onReset, initialScore = 0) => {
    const { t } = useLanguage();
    const [score, setScore] = useState(initialScore);

    const currentStageConfig = config.stages[0]; // Always use stage 0 (no stage progression)
    const maxInventorySize = currentStageConfig.inventorySize;

    // Game Phase System: 'show_intro' → 'show' → 'home'
    const [gamePhase, setGamePhase] = useState('show_intro');
    const [showDrawsThisRound, setShowDrawsThisRound] = useState(0);
    const DRAWS_PER_ROUND = 5; // 每轮节目可抽取次数

    // Day system (day 1 starts in show_intro, TV already watched)
    const [day, setDay] = useState(1);
    const [tvWatchedToday, setTvWatchedToday] = useState(true);

    // Track items drawn during show round (held until delivery)
    const [showDrawnItems, setShowDrawnItems] = useState([]);

    // Host comment key: increments after each draw to trigger new comment
    const [hostCommentKey, setHostCommentKey] = useState(0);

    // Home storage: persistent inventory separate from show inventory
    const [homeStorage, setHomeStorage] = useState([]);

    // Doom System
    const doomConfig = config.doom || DOOM_CONFIG;
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);
    const [doomHitCount, setDoomHitCount] = useState(0);
    const [isDoomResolving, setIsDoomResolving] = useState(false);
    const [doomResolutionState, setDoomResolutionState] = useState(null);
    const [doomGridHighlight, setDoomGridHighlight] = useState(null); // Set of indices that just got loaded
    const lastDoomTriggerDrawRef = { current: -Infinity };
    const isInitialMatrixRef = { current: true };

    const [orderRefreshCount, setOrderRefreshCount] = useState(config.global?.initialRefreshCount ?? 4);
    const REFRESH_MAX = config.global?.maxRefreshCount ?? 4;

    const [drawCount, setDrawCount] = useState(0);

    const [matrix, setMatrix] = useState(null);
    // Gravity animation event: { col, removedRow, tick }
    const [gravityEvent, setGravityEvent] = useState(null);
    // Last drawn item for fly animation: { row, col, item, rarity, tick }
    const [lastDraw, setLastDraw] = useState(null);
    const [explodingCells, setExplodingCells] = useState(null);
    const [orders, setOrders] = useState([]);

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

    // 候选订单选择系统: { slotIndex, candidates: [order1, order2] }
    const [orderCandidates, setOrderCandidates] = useState(null);
    const [orderCandidateQueue, setOrderCandidateQueue] = useState([]);

    const [modalContent, setModalContent] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);

    // 订单槽位分配系统: { "orderIndex-reqIndex": inventoryItemUid }
    const [orderSlotAssignments, setOrderSlotAssignments] = useState({});

    // 工具物品选择目标模式: { toolIndex: number, effectType: string }
    const [toolSelectionMode, setToolSelectionMode] = useState(null);

    const [skills, setSkills] = useState(initialSkills);
    const [skillSelectionCandidates, setSkillSelectionCandidates] = useState(null);
    const [skillState, setSkillState] = useState({
        consecutiveCommons: 0,
        nextDrawGuaranteedRare: false,
        nextDrawExtraItem: false,
        nextDrawEnhanced: false,
    });

    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    const hasSkill = (id) => skills.includes(id);

    const allNormalItems = useMemo(() => getAllNormalItems(config.pools, currentStageConfig), [config.pools, currentStageConfig]);

    useEffect(() => {
        if (initialSkills && initialSkills.length > 0) {
            setSkills([...initialSkills]);
        }
    }, [initialSkills]);

    // Initialize orders from room needs
    useEffect(() => {
        if (orders.length < currentStageConfig.orderSlots) {
            const needed = currentStageConfig.orderSlots - orders.length;
            const newOrders = [...orders];
            for (let i = 0; i < needed; i++) {
                const order = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, newOrders);
                if (order) newOrders.push(order);
            }
            setOrders(newOrders);
        } else if (orders.length === 0) {
            const newOrders = [];
            for (let i = 0; i < currentStageConfig.orderSlots; i++) {
                const order = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, newOrders);
                if (order) newOrders.push(order);
            }
            setOrders(newOrders);
        }
    }, [config, allNormalItems, currentStageConfig.orderSlots, orders.length]);

    const applyEntropy = (inv) => {
        if (!currentStageConfig.mechanics.entropy) return inv;
        return inv.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        });
    };

    const refreshMatrix = () => {
        const newMatrix = generateItemMatrix(allNormalItems, config, currentStageConfig);
        setMatrix(newMatrix);
    };

    useEffect(() => {
        refreshMatrix();
    }, [config]);

    // Grid Refresh: consume 1 Rare+ item to fully refresh the matrix
    const handleGridRefresh = (inventoryIndex) => {
        if (isDrawing || pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || orderCandidates || modalContent || isDoomResolving) return;
        const item = inventory[inventoryIndex];
        if (!item || item.rarity.bonus < 0.25) {
            showToast(t("需要稀有及以上品质的物品"), "error");
            return;
        }
        const newInventory = [...inventory];
        newInventory.splice(inventoryIndex, 1);
        setInventory(newInventory);
        refreshMatrix();
        // Manual refresh: no doom loading (protection rule), but can trigger doom resolution
        isInitialMatrixRef.current = true; // temporarily block loading
        showToast(`${t("消耗")} ${t(item.name)} ${t("刷新了物品网格")}`, "info");
        const nextDraw = drawCount + 1;
        if (shouldTriggerDoom(nextDraw)) {
            lastDoomTriggerDrawRef.current = nextDraw;
            setTimeout(() => triggerDoomResolution(), 600);
        }
    };

    const triggerSkillSelection = () => {
        const availableSkills = SKILL_DEFINITIONS.filter(s => {
            if (!config.enabledSkillIds.includes(s.id)) return false;
            if (skills.includes(s.id)) return false;
            if (s.id === 'vip_discount' && score < 2) return false;
            if (s.id === 'hard_order_expert' && score < 3) return false;
            if ((['cut_corners', 'time_freeze', 'negotiator'].includes(s.id)) && score < 3) return false;
            return true;
        });
        if (availableSkills.length === 0) {
            showToast(t("暂无更多可学习技能！"));
            return;
        }
        const candidates = getRandomItems(availableSkills, Math.min(3, availableSkills.length));
        setSkillSelectionCandidates(candidates);
    };

    const addInventoryItem = (itemName, rarityId) => {
        const allItems = getAllNormalItems(config.pools, currentStageConfig);
        const baseItem = allItems.find(i => i.name === itemName);
        const rarity = config.rarity.find(r => r.id === rarityId) || config.rarity[0];
        if (!baseItem) {
            showToast(`${t("找不到物品")}: ${t(itemName)}`, 'error');
            return;
        }
        const newItem = {
            ...baseItem,
            id: Math.random().toString(36).substr(2, 9),
            uid: Math.random().toString(36).substr(2, 9),
            rarity,
            obtainCount: drawCount
        };
        if (inventory.length < maxInventorySize) {
            setInventory(prev => [...prev, newItem]);
            showToast(`${t("已获取")}: ${t(newItem.name)} (${t(rarity.name)})`, 'success');
        } else {
            showToast(t("背包已满！"), 'error');
        }
    };

    const debugGetOrderItems = (orderIndex) => {
        const order = orders[orderIndex];

        if (!order) return;

        const itemsToAdd = order.requirements.map(req => {
            const allItems = getAllNormalItems(config.pools, currentStageConfig);
            const baseItem = allItems.find(i => i.name === req.name);
            return {
                ...baseItem,
                id: Math.random().toString(36).substr(2, 9),
                uid: Math.random().toString(36).substr(2, 9),
                rarity: req.requiredRarity,
                obtainCount: drawCount
            };
        });

        setInventory(prev => {
            const newInv = [...prev];
            itemsToAdd.forEach(item => {
                if (newInv.length < maxInventorySize) {
                    newInv.push(item);
                }
            });
            return newInv;
        });
        showToast(t("调试：已获取订单所需物品"), 'success');
    };

    const handleSkillSelect = (skill) => {
        if (!skill) {
            setSkillSelectionCandidates(null);
            return;
        }
        if (skills.length < 3) {
            setSkills(prev => [...prev, skill.id]);
            setSkillSelectionCandidates(null);
            showToast(`${t("获得了技能：")}${t(skill.name)}`);
        }
    };

    const handleSkillReplace = (oldSkillId, newSkill) => {
        setSkills(prev => prev.map(id => id === oldSkillId ? newSkill.id : id));
        setSkillSelectionCandidates(null);
        showToast(`${t("替换技能：")}${t(newSkill.name)}`);
    };

    const maxRequirementRarityMap = useMemo(() => {
        const map = {};
        const allOrders = [...orders];

        allOrders.forEach(order => {
            if (!order) return;
            order.requirements.forEach(req => {
                const currentMax = map[req.name] || -1;
                if (req.requiredRarity.bonus > currentMax) {
                    map[req.name] = req.requiredRarity.bonus;
                }
            });
        });
        return map;
    }, [orders]);

    // === 订单槽位系统：派生状态 ===

    // 已分配到订单的物品 uid 集合
    const assignedItemUids = useMemo(() => new Set(Object.values(orderSlotAssignments)), [orderSlotAssignments]);

    // 幻影标记：某个普通订单的需求被其他普通订单的同名需求已分配了物品
    // 返回 { "orderIndex-reqIndex": { item, sourceKey } }
    const phantomMarks = useMemo(() => {
        const result = {};
        const assignedNormal = {};
        Object.entries(orderSlotAssignments).forEach(([key, uid]) => {
            const item = inventory.find(i => i && i.uid === uid);
            if (!item) return;
            if (!assignedNormal[item.name]) assignedNormal[item.name] = [];
            assignedNormal[item.name].push({ key, item });
        });

        orders.forEach((order, orderIdx) => {
            if (!order) return;
            order.requirements.forEach((req, reqIdx) => {
                const myKey = `${orderIdx}-${reqIdx}`;
                if (orderSlotAssignments[myKey]) return;
                const sources = assignedNormal[req.name];
                if (sources && sources.length > 0) {
                    result[myKey] = { item: sources[0].item, sourceKey: sources[0].key };
                }
            });
        });

        return result;
    }, [orders, orderSlotAssignments, inventory]);

    // 清除指定订单索引的所有槽位分配
    const clearAssignmentsForOrders = (indices) => {
        setOrderSlotAssignments(prev => {
            const newAssignments = { ...prev };
            Object.keys(newAssignments).forEach(key => {
                const orderIdx = parseInt(key.split('-')[0]);
                if (indices.includes(orderIdx)) delete newAssignments[key];
            });
            return newAssignments;
        });
    };

    // 辅助：更新 assignment 中的 uid（合成/工具操作后物品 uid 变化时）
    const updateAssignmentUid = (oldUid, newUid) => {
        setOrderSlotAssignments(prev => {
            const newAssignments = { ...prev };
            let changed = false;
            Object.keys(newAssignments).forEach(key => {
                if (newAssignments[key] === oldUid) {
                    newAssignments[key] = newUid;
                    changed = true;
                }
            });
            return changed ? newAssignments : prev;
        });
    };

    // 辅助：移除 assignment 中的 uid（物品被消耗/回收/万象棱镜替换后）
    const removeAssignmentByUid = (uid) => {
        setOrderSlotAssignments(prev => {
            const newAssignments = { ...prev };
            let changed = false;
            Object.keys(newAssignments).forEach(key => {
                if (newAssignments[key] === uid) {
                    delete newAssignments[key];
                    changed = true;
                }
            });
            return changed ? newAssignments : prev;
        });
    };

    const satisfiableOrders = useMemo(() => {
        if (!isSubmitMode || selectedIndices.length === 0) return [];
        const selectedItems = selectedIndices.map(idx => inventory[idx]).filter(Boolean);
        const handGroups = {};
        selectedItems.forEach(item => {
            if (!handGroups[item.name]) handGroups[item.name] = [];
            handGroups[item.name].push(item);
        });
        Object.keys(handGroups).forEach(k => {
            handGroups[k].sort((a, b) => b.rarity.bonus - a.rarity.bonus);
        });

        const checkOrder = (order, idx, isMain) => {
            if (!order) return null;
            const tempHand = JSON.parse(JSON.stringify(handGroups));
            let isSatisfied = true;
            let totalSubmitBonus = 0;

            const allReqs = order.requirements;
            let isSameType = false;
            if (hasSkill('ocd') && allReqs.length > 1) {
                const firstPool = allReqs[0].poolId;
                isSameType = allReqs.every(r => r.poolId === firstPool);
            }

            for (const req of order.requirements) {
                const availableItems = tempHand[req.name];
                if (!availableItems || availableItems.length === 0) {
                    isSatisfied = false;
                    break;
                }
                const matchIndex = availableItems.findIndex(item => (item.rarity.bonus >= req.requiredRarity.bonus && (!item.decay || item.decay > 0)));
                if (matchIndex === -1) {
                    isSatisfied = false;
                    break;
                }
                const matchedItem = availableItems[matchIndex];
                totalSubmitBonus += matchedItem.rarity.bonus;
                availableItems.splice(matchIndex, 1);
            }
            if (!isSatisfied) return null;

            let multiplier = 1 + totalSubmitBonus;
            if (isSameType) multiplier *= 2;

            const finalScoreReward = Math.ceil(order.baseScoreReward * multiplier);

            return {
                index: idx,
                finalScoreReward,
                isScoreOrder: isMain,
                reqCount: order.requirements.length,
                requirements: order.requirements
            };
        };

        const results = [];
        orders.forEach((o, i) => {
            const res = checkOrder(o, i, true);
            if (res) results.push(res);
        });

        return results;
    }, [orders, isSubmitMode, selectedIndices, inventory, hasSkill, skills]);

    // Preview Potential Rewards (Calculate using BEST items from inventory)
    const potentialSatisfiableOrders = useMemo(() => {
        // Run this even if NOT in submit mode, to show preview
        const handGroups = {};
        // Group ALL non-null inventory items
        inventory.forEach(item => {
            if (item) {
                if (!handGroups[item.name]) handGroups[item.name] = [];
                handGroups[item.name].push(item);
            }
        });
        Object.keys(handGroups).forEach(k => {
            handGroups[k].sort((a, b) => b.rarity.bonus - a.rarity.bonus);
        });

        const checkOrder = (order, idx, isMain) => {
            const tempHand = JSON.parse(JSON.stringify(handGroups)); // Deep copy for simulation
            let isSatisfied = true;
            let totalSubmitBonus = 0;

            const allReqs = order.requirements;
            let isSameType = false;
            // Helper function for OCD check (same as above)
            if (hasSkill('ocd') && allReqs.length > 1) {
                const firstPool = allReqs[0].poolId;
                isSameType = allReqs.every(r => r.poolId === firstPool);
            }

            for (const req of order.requirements) {
                const availableItems = tempHand[req.name];
                if (!availableItems || availableItems.length === 0) {
                    isSatisfied = false;
                    break;
                }
                const matchIndex = availableItems.findIndex(item => (item.rarity.bonus >= req.requiredRarity.bonus && (!item.decay || item.decay > 0)));
                if (matchIndex === -1) {
                    isSatisfied = false;
                    break;
                }
                const matchedItem = availableItems[matchIndex];
                totalSubmitBonus += matchedItem.rarity.bonus;
                availableItems.splice(matchIndex, 1);
            }
            if (!isSatisfied) return null;

            let multiplier = 1 + totalSubmitBonus;
            if (isSameType) multiplier *= 2;

            const finalScoreReward = Math.ceil(order.baseScoreReward * multiplier);

            return {
                index: idx,
                finalScoreReward,
                isScoreOrder: isMain,
                reqCount: order.requirements.length,
                requirements: order.requirements
            };
        };

        const results = [];
        orders.forEach((order, idx) => {
            if (order) {
                const res = checkOrder(order, idx, true);
                if (res) results.push(res);
            }
        });

        return results;
    }, [inventory, orders, skills]);

    const totalRecycleValue = useMemo(() => {
        if (!isRecycleMode || selectedIndices.length === 0) return 0;
        return selectedIndices.reduce((sum, idx) => {
            const item = inventory[idx];
            return sum + (item ? item.rarity.recycleValue : 0);
        }, 0);
    }, [isRecycleMode, selectedIndices, inventory]);

    const selectedItemNames = useMemo(() => {
        if (!isSubmitMode) return [];
        return selectedIndices.map(idx => inventory[idx]?.name).filter(Boolean);
    }, [isSubmitMode, selectedIndices, inventory]);

    useEffect(() => {
        if (!pendingItem && pendingQueue.length > 0) {
            const nextItem = pendingQueue[0];

            // Check for Stage 2 Overload (Specialization)
            let isOverload = false;
            if (currentStageConfig.mechanics.specialization) {
                const uniqueNames = new Set(inventory.filter(i => i).map(i => i.name));
                if (uniqueNames.size >= 7 && !uniqueNames.has(nextItem.name)) {
                    isOverload = true;
                }
            }

            if (!isOverload && inventory.length < maxInventorySize) {
                // Safe to add
                setPendingQueue(prev => prev.slice(1));
                setInventory(prev => [...prev, nextItem]);
            } else {
                // Must handle as pending (either full or overload)
                // We consume it from queue and make it the active pendingItem
                setPendingQueue(prev => prev.slice(1));

                if (isOverload) {
                    nextItem.isOverload = true;
                    showToast(t("库存种类过载！请选择一种物品进行批量替换，或丢弃新物品。"), "warning");
                }

                setPendingItem(nextItem);
                setSelectedSlot(null);
            }
        }
    }, [pendingItem, pendingQueue, inventory, maxInventorySize, currentStageConfig]);

    // 候选订单队列处理：当前选择完毕后自动弹出下一个
    useEffect(() => {
        if (!orderCandidates && orderCandidateQueue.length > 0) {
            const [next, ...rest] = orderCandidateQueue;
            setOrderCandidates(next);
            setOrderCandidateQueue(rest);
        }
    }, [orderCandidates, orderCandidateQueue]);

    const handleIncomingItems = (newItems, overrideInventory = null) => {
        // Negotiator Skill Check
        if (hasSkill('negotiator')) {
            let triggered = false;
            newItems.forEach(item => {
                if (item.rarity.bonus >= 0.4) triggered = true;
            });
            if (triggered) {
                setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + 1));
                showToast(t("【谈判专家】触发：订单刷新次数+1"));
            }
        }

        let currentInventory = overrideInventory ? [...overrideInventory] : [...inventory];
        // Local state tracking for the loop
        let localPendingItem = pendingItem;
        let localOverload = false; // logic overload
        let remainingQueue = [];
        let overloadTriggered = false; // for effect flag

        // Process items one by one
        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];

            // 1. Check Overload (if enabled)
            if (currentStageConfig.mechanics.specialization && !localOverload) {
                const uniqueNames = new Set(currentInventory.map(invItem => invItem ? invItem.name : null).filter(n => n !== null));
                // Check if adding this NEW type would exceed limit
                if (uniqueNames.size >= 7 && !uniqueNames.has(item.name)) {
                    item.isOverload = true;
                    localOverload = true;
                    overloadTriggered = true; // for effect flag

                    if (!localPendingItem) {
                        localPendingItem = item;
                        setPendingItem(item);
                        showToast(t("库存种类过载！请选择一种物品进行批量替换，或丢弃新物品。"), "warning");
                    } else {
                        remainingQueue.push(item);
                    }
                    continue; // Skip adding to inventory
                }
            }

            // 2. Check if we are blocked by previous overload or full pending queue
            if (localOverload || localPendingItem) {
                remainingQueue.push(item);
                continue;
            }

            // 3. Add to Inventory (Find Slot or Append)
            let slotIndex = -1;
            const existingNullIndex = currentInventory.indexOf(null);

            if (existingNullIndex !== -1) {
                slotIndex = existingNullIndex;
            }

            if (slotIndex !== -1) {
                currentInventory[slotIndex] = item;
            } else if (currentInventory.length < maxInventorySize) {
                // Dynamic growth if array is not full size yet
                currentInventory.push(item);
            } else {
                // No space
                if (!localPendingItem) {
                    localPendingItem = item;
                    setPendingItem(item);
                    showToast(t("背包已满！"), "warning");
                } else {
                    remainingQueue.push(item);
                }
            }
        }

        // Apply state updates
        // Since we modify currentInventory locally (which is either a clone of 'inventory' or 'overrideInventory'),
        // and 'overrideInventory' (if passed) already had entropy applied by the caller if needed,
        // we just need to commit the new state.

        if (remainingQueue.length > 0) {
            setPendingQueue(prev => [...prev, ...remainingQueue]);
        }

        setInventory(currentInventory);
    };

    // --- Doom System Functions ---

    // Doom loading (装弹): each new cell has a chance to add danger to doom grid
    // newCellPositions: array of { row, col } for newly generated cells
    const processDoomLoading = (newCellPositions) => {
        if (isInitialMatrixRef.current) return 0;
        const loadChance = MATRIX_CONFIG.doom?.loadChance || 0.05;
        const markedPositions = [];
        for (const pos of newCellPositions) {
            if (Math.random() < loadChance) markedPositions.push(pos);
        }
        if (markedPositions.length === 0) return 0;

        // Step 1: Show marks on matrix cells (visible for 1.5s)
        setMatrix(prev => {
            const m = prev.map(r => [...r]);
            for (const pos of markedPositions) {
                if (m[pos.row]?.[pos.col]) {
                    m[pos.row][pos.col] = { ...m[pos.row][pos.col], doomLoadMark: true };
                }
            }
            return m;
        });

        // Step 2: After display, remove marks and add dangers to doom grid
        setTimeout(() => {
            // Clear marks from matrix
            setMatrix(prev => {
                const m = prev.map(r => [...r]);
                for (const pos of markedPositions) {
                    if (m[pos.row]?.[pos.col]) {
                        const { doomLoadMark, ...rest } = m[pos.row][pos.col];
                        m[pos.row][pos.col] = rest;
                    }
                }
                return m;
            });
            // Add dangers to doom grid with highlight
            const highlightIndices = [];
            setDoomGrid(prev => {
                const newGrid = [...prev];
                for (let i = 0; i < markedPositions.length; i++) {
                    const emptyIndex = newGrid.findIndex(cell => cell.type === 'empty');
                    if (emptyIndex !== -1) {
                        newGrid[emptyIndex] = { type: 'danger' };
                        highlightIndices.push(emptyIndex);
                    }
                }
                return newGrid;
            });
            setDoomGridHighlight(new Set(highlightIndices));
            setTimeout(() => setDoomGridHighlight(null), 2000);
            showToast(`${t("装弹")}：${markedPositions.length}${t("个危险加入厄运网格")}`, "warning");
        }, 800);

        return markedPositions.length;
    };

    // Doom trigger (开枪): chance per refresh event
    const shouldTriggerDoom = (nextDrawCount) => {
        if (nextDrawCount <= doomConfig.initialProtectionDraws) return false;
        const sinceTrigger = nextDrawCount - lastDoomTriggerDrawRef.current;
        if (sinceTrigger <= doomConfig.triggerCooldownDraws) return false;
        const chance = MATRIX_CONFIG.doom?.triggerChance || 0.10;
        return Math.random() < chance;
    };

    const triggerDoomResolution = () => {
        setIsDoomResolving(true);
        setDoomGrid(currentGrid => {
            setDoomLevel(currentLevel => {
                const finalSelections = [];
                for (let i = 0; i < currentLevel; i++) {
                    const randomIndex = Math.floor(Math.random() * currentGrid.length);
                    finalSelections.push({
                        index: randomIndex,
                        type: currentGrid[randomIndex].type,
                    });
                }
                const spinningPositions = finalSelections.map(() =>
                    Math.floor(Math.random() * currentGrid.length)
                );
                setDoomResolutionState({
                    finalSelections,
                    spinningPositions,
                    phase: 'spinning',
                    tick: 0,
                    totalTicks: 20,
                    gridSize: currentGrid.length,
                });
                return currentLevel;
            });
            return currentGrid;
        });
    };

    const tickDoomResolution = () => {
        setDoomResolutionState(prev => {
            if (!prev || prev.phase !== 'spinning') return prev;
            const nextTick = prev.tick + 1;
            if (nextTick >= prev.totalTicks) {
                return {
                    ...prev,
                    spinningPositions: prev.finalSelections.map(s => s.index),
                    phase: 'settled',
                    tick: nextTick,
                };
            }
            const newPositions = prev.spinningPositions.map((pos, i) => {
                const settleAt = prev.totalTicks - prev.finalSelections.length + i;
                if (nextTick >= settleAt) return prev.finalSelections[i].index;
                return Math.floor(Math.random() * prev.gridSize);
            });
            return { ...prev, spinningPositions: newPositions, tick: nextTick };
        });
    };

    const completeDoomResolution = () => {
        if (!doomResolutionState) return;

        const hits = doomResolutionState.finalSelections.filter(s => s.type === 'danger').length;
        const newHp = hp - hits;

        // Doom level: based on cumulative hits
        let newHitCount = doomHitCount + hits;
        let newDoomLevel = doomLevel;
        while (newHitCount >= doomConfig.hitsPerLevelUp) {
            newHitCount -= doomConfig.hitsPerLevelUp;
            newDoomLevel += 1;
        }
        setDoomHitCount(newHitCount);
        setDoomLevel(newDoomLevel);
        setHp(Math.max(0, newHp));

        if (hits > 0) {
            showToast(`${t("厄运结算")}：${hits} ${t("次命中")}！HP -${hits}`, "error");
        }
        if (newDoomLevel > doomLevel) {
            showToast(`${t("厄运等级提升至")} ${newDoomLevel}！`, "warning");
        }

        setIsDoomResolving(false);
        setDoomResolutionState(null);
        setIsDrawing(false);

        if (newHp <= 0) {
            setInventory(prev => {
                const currentItems = prev.filter(i => i !== null);
                const numToLose = Math.floor(currentItems.length / 2);
                const shuffled = [...currentItems].sort(() => Math.random() - 0.5);
                return shuffled.slice(numToLose);
            });
            setModalContent({
                type: 'game_over',
                title: t("游戏结束"),
                item: { icon: '💀', name: t("生命值耗尽") },
                message: t("失去了一半物品，带着剩余物品撤离。"),
            });
        }
    };

    // --- Row/Column selection: core draw action (two-phase: fly then gravity) ---
    const [isDrawing, setIsDrawing] = useState(false);
    const drawTimerRef = { current: null };

    const selectRowOrColumn = (type, index) => {
        // Guard: block during pending states or ongoing draw animation
        if (gamePhase !== 'show') return;
        if (isDrawing || pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || orderCandidates || modalContent || isDoomResolving) return;
        if (!matrix) return;

        // Collect cells from the selected row or column
        const gridSize = MATRIX_CONFIG.gridSize;
        const cells = [];
        if (type === 'row') {
            for (let c = 0; c < gridSize; c++) cells.push({ cell: matrix[index][c], row: index, col: c });
        } else {
            for (let r = 0; r < gridSize; r++) cells.push({ cell: matrix[r][index], row: r, col: index });
        }

        // Random pick 1
        const picked = cells[Math.floor(Math.random() * cells.length)];
        const selectedCell = picked.cell;
        const cellType = selectedCell.type || 'normal';

        // === Phase 1: fly animation starts immediately ===
        setIsDrawing(true);
        setLastDraw({ row: picked.row, col: picked.col, item: selectedCell.item, rarity: selectedCell.rarity, cellType, tick: Date.now() });

        const capturedMatrix = matrix;
        const capturedInventory = [...inventory];
        const capturedSkillState = { ...skillState };

        drawTimerRef.current = setTimeout(() => {
            // First: gravity for the picked cell itself
            let afterPickMatrix = applyGravity(capturedMatrix, picked.row, picked.col, allNormalItems, config, currentStageConfig);

            if (cellType === 'bomb') {
                // --- Bomb cell: explode then gravity ---
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
                    const { matrix: explodedMatrix } = applyBombExplosion(capturedMatrix, picked.row, picked.col, allNormalItems, config, currentStageConfig);
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
                    // Doom events for bomb: new cells at top rows of affected columns
                    const newCellPositions = [];
                    for (const [colStr, info] of Object.entries(colInfo)) {
                        const c = parseInt(colStr);
                        for (let r = 0; r < info.count; r++) newCellPositions.push({ row: r, col: c });
                    }
                    isInitialMatrixRef.current = false;
                    processDoomLoading(newCellPositions);
                    // Doom trigger check — show mark then resolve
                    const nextDraw = drawCount + 1;
                    if (shouldTriggerDoom(nextDraw)) {
                        lastDoomTriggerDrawRef.current = nextDraw;
                        // Pick a random new cell to show trigger mark
                        const triggerPos = newCellPositions.length > 0
                            ? newCellPositions[Math.floor(Math.random() * newCellPositions.length)]
                            : { row: 0, col: 0 };
                        setMatrix(prev => {
                            const m = prev.map(r => [...r]);
                            if (m[triggerPos.row]?.[triggerPos.col]) {
                                m[triggerPos.row][triggerPos.col] = { ...m[triggerPos.row][triggerPos.col], doomTriggerMark: true };
                            }
                            return m;
                        });
                        setTimeout(() => {
                            setMatrix(prev => {
                                const m = prev.map(r => [...r]);
                                if (m[triggerPos.row]?.[triggerPos.col]) {
                                    const { doomTriggerMark, ...rest } = m[triggerPos.row][triggerPos.col];
                                    m[triggerPos.row][triggerPos.col] = rest;
                                }
                                return m;
                            });
                            triggerDoomResolution();
                        }, 800);
                    } else {
                        setTimeout(() => setIsDrawing(false), 350);
                    }
                }, 350);
                setDrawCount(prev => prev + 1);
                return;

            } else {
                // --- Normal item ---
                let rarity = selectedCell.rarity;
                if (capturedSkillState.nextDrawEnhanced) {
                    const nextRarity = getNextRarity(rarity.id, config);
                    if (nextRarity) rarity = nextRarity;
                }

                let newItem = {
                    ...selectedCell.item,
                    uid: Math.random().toString(36).substr(2, 9),
                    rarity,
                    poolName: selectedCell.item.poolName,
                    decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 25) : undefined,
                };

                let itemsToProcess = [newItem];
                let newCellCount = 1; // track how many new cells were generated

                // Extra item from skill (自动补货)
                let extraPicked = null;
                if (capturedSkillState.nextDrawExtraItem && cells.length > 1) {
                    const remaining = cells.filter(c => c !== picked);
                    extraPicked = remaining[Math.floor(Math.random() * remaining.length)];
                    let extraRarity = extraPicked.cell.rarity;
                    if (capturedSkillState.nextDrawEnhanced) {
                        const next = getNextRarity(extraRarity.id, config);
                        if (next) extraRarity = next;
                    }
                    itemsToProcess.push({
                        ...extraPicked.cell.item,
                        uid: Math.random().toString(36).substr(2, 9),
                        rarity: extraRarity,
                        poolName: extraPicked.cell.item.poolName,
                        decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 25) : undefined,
                    });
                    newCellCount = 2;
                }

                // Apply gravity
                if (extraPicked) {
                    const finalMatrix = applyGravity(afterPickMatrix, extraPicked.row, extraPicked.col, allNormalItems, config, currentStageConfig);
                    setMatrix(finalMatrix);
                    setGravityEvent({ col: picked.col, removedRow: picked.row, col2: extraPicked.col, removedRow2: extraPicked.row, tick: Date.now() });
                } else {
                    setMatrix(afterPickMatrix);
                    setGravityEvent({ col: picked.col, removedRow: picked.row, tick: Date.now() });
                }

                // Doom loading: check new cells at row 0
                isInitialMatrixRef.current = false;
                const newCellPositions = [{ row: 0, col: picked.col }];
                if (extraPicked) newCellPositions.push({ row: 0, col: extraPicked.col });
                processDoomLoading(newCellPositions);

                // Update skill state
                const newSkillState = { ...capturedSkillState };
                newSkillState.nextDrawExtraItem = false;
                newSkillState.nextDrawGuaranteedRare = false;
                newSkillState.nextDrawEnhanced = false;

                if (itemsToProcess.every(item => item.rarity.id === 'common')) {
                    newSkillState.consecutiveCommons += 1;
                } else {
                    newSkillState.consecutiveCommons = 0;
                }

                if (hasSkill('consolation_prize') && newSkillState.consecutiveCommons >= 5) {
                    newSkillState.nextDrawGuaranteedRare = true;
                    newSkillState.consecutiveCommons = 0;
                    showToast(t("【安慰奖】触发：下一次必定稀有！"), "info");
                }

                if (hasSkill('negotiator') && itemsToProcess.some(item => item.rarity.bonus >= 0.5)) {
                    setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + 1));
                    showToast(t("【谈判专家】触发：订单刷新次数+1"));
                }

                setSkillState(newSkillState);

                // Record drawn items for delivery + trigger host comment update
                if (gamePhase === 'show') {
                    setShowDrawnItems(prev => [...prev, ...itemsToProcess]);
                    setHostCommentKey(prev => prev + 1);
                }

                const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(capturedInventory) : [...capturedInventory];
                handleIncomingItems(itemsToProcess, decayedInventory);

                // Doom trigger check (开枪): show mark on cell, then resolve
                const nextDraw = drawCount + 1;
                if (shouldTriggerDoom(nextDraw)) {
                    lastDoomTriggerDrawRef.current = nextDraw;
                    setLastDraw(null);
                    // Show trigger mark on the new top cell
                    setMatrix(prev => {
                        const m = prev.map(r => [...r]);
                        if (m[0]?.[picked.col]) {
                            m[0][picked.col] = { ...m[0][picked.col], doomTriggerMark: true };
                        }
                        return m;
                    });
                    setDrawCount(prev => prev + 1);
                    // Display 1.5s, then clear mark and start resolution
                    setTimeout(() => {
                        setMatrix(prev => {
                            const m = prev.map(r => [...r]);
                            if (m[0]?.[picked.col]) {
                                const { doomTriggerMark, ...rest } = m[0][picked.col];
                                m[0][picked.col] = rest;
                            }
                            return m;
                        });
                        triggerDoomResolution();
                    }, 800);
                    return;
                }
            }

            setDrawCount(prev => prev + 1);
            setIsDrawing(false);
        }, 450);
    };

    // 尝试提附工具物品：按概率判断是否在物品列表末尾添加一个工具物品
    const tryDropToolItem = (items) => {
        const toolConfig = config.toolItems;
        if (!toolConfig || Math.random() >= (toolConfig.dropChance || 0)) return items;
        const toolItem = rollToolItem(toolConfig);
        return toolItem ? [...items, toolItem] : items;
    };

    // 根据权重随机选择一个工具物品并创建实例
    const rollToolItem = (toolConfig) => {
        const weights = toolConfig.weights || {};
        const entries = TOOL_ITEMS.filter(t => (weights[t.id] || 0) > 0);
        if (entries.length === 0) return null;

        const totalWeight = entries.reduce((sum, t) => sum + (weights[t.id] || 0), 0);
        let r = Math.random() * totalWeight;
        let selected = entries[0];
        for (const entry of entries) {
            r -= (weights[entry.id] || 0);
            if (r <= 0) { selected = entry; break; }
        }

        const commonRarity = config.rarity.find(r => r.id === 'common') || config.rarity[0];
        return {
            ...selected,
            name: selected.name,
            icon: selected.icon,
            uid: Math.random().toString(36).substr(2, 9),
            rarity: commonRarity,
            isToolItem: true,
            toolId: selected.id,
            toolDesc: selected.desc,
            toolEffectType: selected.effectType,
            sterile: true, // 工具物品无法合成
        };
    };

    // 右键使用工具物品：进入选择目标模式（星辉祝福保持直接激活）
    const handleToolItemUse = (index) => {
        const item = inventory[index];
        if (!item || !item.isToolItem) return;

        // 不允许在特殊模式中使用
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || toolSelectionMode) {
            showToast(t("当前状态下无法使用工具物品"), 'error');
            return;
        }

        const effectType = item.toolEffectType;

        if (effectType === 'enhance_next') {
            // 星辉祝福：直接激活，不需要选择目标
            setSkillState(prev => ({ ...prev, nextDrawEnhanced: true }));
            const newInventory = [...inventory];
            newInventory[index] = null;
            setInventory(newInventory.filter(i => i !== null));
            showToast(t("星辉祝福已激活：下次抽取品质+1"), 'success');
        } else {
            // 命运熔炉 / 万象棱镜：进入选择目标模式
            setToolSelectionMode({ toolIndex: index, effectType });
            setSelectedSlot(null);
            showToast(t("请点击选择一个目标物品"), 'info');
        }
    };

    const handleCancelToolSelection = () => {
        setToolSelectionMode(null);
    };

    // 根据权重表随机选择一个品质
    const rollWeightedRarity = (weights) => {
        const entries = Object.entries(weights).filter(([_, w]) => w > 0);
        if (entries.length === 0) return config.rarity[0];

        const totalWeight = entries.reduce((sum, [_, w]) => sum + w, 0);
        let r = Math.random() * totalWeight;
        for (const [rarityId, w] of entries) {
            r -= w;
            if (r <= 0) {
                return config.rarity.find(rr => rr.id === rarityId) || config.rarity[0];
            }
        }
        return config.rarity[0];
    };

    const handleCloseModal = () => {
        // Victory modal handling
        if (modalContent?.type === 'victory') {
            setModalContent(null);
            return;
        }

        if (modalContent?.actualItem) {
            const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];
            handleIncomingItems([modalContent.actualItem], decayedInventory);
        }
        setDrawCount(prev => prev + 1);
        setModalContent(null);
    };

    const handleSelectionSelect = (_selectedItem) => {
        // precise/targeted affix modes removed (no longer used with matrix system)
        setSelectionMode(null);
    };

    const handleSelectionCancel = () => {
        setSelectionMode(null);
    }

    // === 订单槽位系统：操作函数 ===

    const handleAssignToOrder = (orderIndex, reqIndex) => {
        const item = inventory[selectedSlot];
        if (!item) return;
        const key = `${orderIndex}-${reqIndex}`;
        setOrderSlotAssignments(prev => ({ ...prev, [key]: item.uid }));
        setSelectedSlot(null);
    };

    const handleUnassignFromOrder = (orderIndex, reqIndex) => {
        const key = `${orderIndex}-${reqIndex}`;
        setOrderSlotAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[key];
            return newAssignments;
        });
    };

    // === 订单槽位点击统一入口 ===
    const handleOrderSlotClick = (orderIndex, reqIndex) => {
        const key = `${orderIndex}-${reqIndex}`;
        const assignedUid = orderSlotAssignments[key];
        if (!assignedUid) return;
        const itemIndex = inventory.findIndex(i => i && i.uid === assignedUid);
        if (itemIndex === -1) return;
        const item = inventory[itemIndex];

        // 工具选择模式：对订单槽位物品使用工具
        if (toolSelectionMode) {
            if (item.isToolItem) {
                showToast(t("无法对工具物品使用！"), 'error');
                return;
            }
            const { toolIndex, effectType } = toolSelectionMode;
            const toolItem = inventory[toolIndex];
            if (!toolItem) { setToolSelectionMode(null); return; }

            if (effectType === 'reforge_left') {
                const reforgeWeights = config.toolItems?.reforgeRarityWeights || {};
                const newRarity = rollWeightedRarity(reforgeWeights);
                if (!newRarity) { setToolSelectionMode(null); return; }
                const newUid = Math.random().toString(36).substr(2, 9);
                const newInventory = [...inventory];
                newInventory[itemIndex] = { ...item, rarity: newRarity, uid: newUid };
                newInventory[toolIndex] = null;
                setInventory(newInventory.filter(i => i !== null));
                updateAssignmentUid(item.uid, newUid);
                showToast(`${t("命运熔炉")}：${t(item.name)} → ${t(newRarity.name)}`, 'success');
            } else if (effectType === 'transmute_left') {
                const sourcePool = config.pools.find(p => p.items.some(pi => pi.name === item.name));
                if (!sourcePool) { showToast(t("找不到对应的奖池！"), 'error'); setToolSelectionMode(null); return; }
                const candidates = sourcePool.items.filter(pi => pi.name !== item.name);
                if (candidates.length === 0) { showToast(t("同奖池中没有其他物品！"), 'error'); setToolSelectionMode(null); return; }
                const newTpl = candidates[Math.floor(Math.random() * candidates.length)];
                const newItem = {
                    ...newTpl,
                    uid: Math.random().toString(36).substr(2, 9),
                    poolName: sourcePool.name,
                    rarity: item.rarity,
                    sterile: item.sterile,
                    decay: item.decay,
                };
                const newInventory = [...inventory];
                newInventory[itemIndex] = newItem;
                newInventory[toolIndex] = null;
                setInventory(newInventory.filter(i => i !== null));
                // 名称变了 → 退回背包（清除 assignment）
                removeAssignmentByUid(item.uid);
                showToast(`${t("万象棱镜")}：${t(item.name)} → ${t(newTpl.name)}`, 'success');
            }
            setToolSelectionMode(null);
            return;
        }

        // 以旧换新：消耗订单槽位物品
        if (selectionMode?.type === 'trade_in') {
            if (item.isScoreItem) {
                showToast(t("主线道具无法用于以旧换新！"), "error");
                return;
            }
            if (item.isToolItem) {
                showToast(t("工具道具无法用于以旧换新！"), "error");
                return;
            }
            // 复用背包的 trade_in 逻辑，通过背包 index 调用
            removeAssignmentByUid(item.uid);
            handleSlotClick(itemIndex);
            return;
        }

        // 回收模式：选中/取消订单槽位物品
        if (isRecycleMode) {
            if (selectedIndices.includes(itemIndex)) {
                setSelectedIndices(prev => prev.filter(i => i !== itemIndex));
            } else {
                setSelectedIndices(prev => [...prev, itemIndex]);
            }
            return;
        }

        // 提交模式 / 撤离模式：选中/取消
        if (isSubmitMode) {
            if (selectedIndices.includes(itemIndex)) {
                setSelectedIndices(prev => prev.filter(i => i !== itemIndex));
            } else {
                setSelectedIndices(prev => [...prev, itemIndex]);
            }
            return;
        }

        // PendingItem 合成
        if (pendingItem) {
            if (!item.sterile && !pendingItem.sterile &&
                pendingItem.name === item.name &&
                pendingItem.rarity.id === item.rarity.id &&
                pendingItem.rarity.id !== 'mythic') {
                const nextRarity = getNextRarity(item.rarity.id, config);
                const upgradedItem = { ...item, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
                const newInventory = [...inventory];
                newInventory[itemIndex] = upgradedItem;
                setInventory(newInventory);
                updateAssignmentUid(item.uid, upgradedItem.uid);
                setPendingItem(null);
                return;
            }

            // Overload 替换订单槽位物品
            if (pendingItem.isOverload) {
                const targetName = item.name;
                const clearedItems = inventory.filter(i => i && i.name === targetName);
                clearedItems.forEach(i => {
                    if (assignedItemUids.has(i.uid)) removeAssignmentByUid(i.uid);
                });
                const newInventory = inventory.filter(i => i && i.name !== targetName);
                const itemToAdd = { ...pendingItem };
                delete itemToAdd.isOverload;
                newInventory.push(itemToAdd);
                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            // 背包满替换订单槽位物品：旧物品丢弃，新物品放入背包（不继承订单分配）
            removeAssignmentByUid(item.uid);
            const newInventory = [...inventory];
            newInventory[itemIndex] = pendingItem;
            setInventory(newInventory);
            setPendingItem(null);
            return;
        }

        // SelectedSlot 合成
        if (selectedSlot !== null) {
            const sourceItem = inventory[selectedSlot];
            if (sourceItem && !item.sterile && !sourceItem.sterile &&
                sourceItem.name === item.name &&
                sourceItem.rarity.id === item.rarity.id &&
                sourceItem.rarity.id !== 'mythic' &&
                (!item.decay || item.decay > 0) && (!sourceItem.decay || sourceItem.decay > 0)) {
                const nextRarity = getNextRarity(sourceItem.rarity.id, config);
                const upgradedItem = { ...item, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
                const newInventory = [...inventory];
                newInventory[itemIndex] = upgradedItem;
                newInventory[selectedSlot] = null;
                setInventory(newInventory.filter(i => i !== null));
                updateAssignmentUid(item.uid, upgradedItem.uid);
                setSelectedSlot(null);
                return;
            }
            return; // 不可合成，不做任何操作
        }

        // 默认：点击订单槽位取消分配
        handleUnassignFromOrder(orderIndex, reqIndex);
    };

    const handleSlotClick = (index) => {
        const clickedItem = inventory[index];
        const isAssignedToOrder = clickedItem && assignedItemUids.has(clickedItem.uid);

        // 工具选择模式：点击背包物品作为工具目标
        if (toolSelectionMode) {
            if (!clickedItem) return;
            if (clickedItem.isToolItem) {
                showToast(t("无法对工具物品使用！"), 'error');
                return;
            }
            const { toolIndex, effectType } = toolSelectionMode;
            const toolItem = inventory[toolIndex];
            if (!toolItem) { setToolSelectionMode(null); return; }

            if (effectType === 'reforge_left') {
                const reforgeWeights = config.toolItems?.reforgeRarityWeights || {};
                const newRarity = rollWeightedRarity(reforgeWeights);
                if (!newRarity) { setToolSelectionMode(null); return; }
                const oldUid = clickedItem.uid;
                const newUid = Math.random().toString(36).substr(2, 9);
                const newInventory = [...inventory];
                newInventory[index] = { ...clickedItem, rarity: newRarity, uid: newUid };
                newInventory[toolIndex] = null;
                setInventory(newInventory.filter(i => i !== null));
                if (isAssignedToOrder) updateAssignmentUid(oldUid, newUid);
                showToast(`${t("命运熔炉")}：${t(clickedItem.name)} → ${t(newRarity.name)}`, 'success');
            } else if (effectType === 'transmute_left') {
                const sourcePool = config.pools.find(p => p.items.some(pi => pi.name === clickedItem.name));
                if (!sourcePool) { showToast(t("找不到对应的奖池！"), 'error'); setToolSelectionMode(null); return; }
                const candidates = sourcePool.items.filter(pi => pi.name !== clickedItem.name);
                if (candidates.length === 0) { showToast(t("同奖池中没有其他物品！"), 'error'); setToolSelectionMode(null); return; }
                const newTpl = candidates[Math.floor(Math.random() * candidates.length)];
                const newItem = {
                    ...newTpl,
                    uid: Math.random().toString(36).substr(2, 9),
                    poolName: sourcePool.name,
                    rarity: clickedItem.rarity,
                    sterile: clickedItem.sterile,
                    decay: clickedItem.decay,
                };
                const newInventory = [...inventory];
                newInventory[index] = newItem;
                newInventory[toolIndex] = null;
                setInventory(newInventory.filter(i => i !== null));
                // 名称变了，如果在订单上则退回背包（清除 assignment）
                if (isAssignedToOrder) removeAssignmentByUid(clickedItem.uid);
                showToast(`${t("万象棱镜")}：${t(clickedItem.name)} → ${t(newTpl.name)}`, 'success');
            }
            setToolSelectionMode(null);
            return;
        }

        // 已分配到订单的物品：只允许特定操作通过，阻止选中/交换位置
        // 允许通过的：合成（pendingItem/selectedSlot）、以旧换新、回收、overload
        if (isAssignedToOrder) {
            // 允许以旧换新
            if (selectionMode?.type === 'trade_in') { /* fall through to trade_in logic below */ }
            // 允许回收模式
            else if (isRecycleMode) { /* fall through to recycle logic below */ }
            // 允许 pendingItem 合成和 overload
            else if (pendingItem) { /* fall through to pending logic below */ }
            // 允许 selectedSlot 合成
            else if (selectedSlot !== null) {
                const sourceItem = inventory[selectedSlot];
                if (sourceItem && clickedItem && !clickedItem.sterile && !sourceItem.sterile &&
                    sourceItem.name === clickedItem.name &&
                    sourceItem.rarity.id === clickedItem.rarity.id &&
                    sourceItem.rarity.id !== 'mythic' &&
                    (!clickedItem.decay || clickedItem.decay > 0) && (!sourceItem.decay || sourceItem.decay > 0)) {
                    // 合成：fall through
                } else {
                    return; // 不可合成，阻止
                }
            }
            // 其他情况（尝试选中等）阻止
            else { return; }
        }

        if (selectionMode?.type === 'trade_in') {
            const consumedItem = inventory[index];
            if (!consumedItem) return;

            if (consumedItem.isScoreItem) {
                showToast(t("主线道具无法用于以旧换新！"), "error");
                return;
            }

            if (consumedItem.isToolItem) {
                showToast(t("工具道具无法用于以旧换新！"), "error");
                return;
            }

            const pool = selectionMode.pool;

            // Apply Entropy (Time passes)
            const decayedInv = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

            // 如果消耗的物品在订单槽位上，清除 assignment
            if (assignedItemUids.has(consumedItem.uid)) removeAssignmentByUid(consumedItem.uid);

            // Remove item (set to null) from DECAYED inventory
            decayedInv[index] = null;

            // No intermediate setInventory needed, handleIncomingItems will set it.

            let candidates = pool.items.filter(i => i.name !== consumedItem.name);
            if (candidates.length === 0) candidates = pool.items;

            const tpl = candidates[Math.floor(Math.random() * candidates.length)];
            const rarityConfig = config.rarity;
            const oldRarityIndex = rarityConfig.findIndex(r => r.id === consumedItem.rarity.id);

            let newRarity;
            if (oldRarityIndex === -1) {
                newRarity = rarityConfig[0];
            } else {
                const isUpgrade = Math.random() < 0.05;
                let newRarityIndex = oldRarityIndex;
                if (isUpgrade) {
                    newRarityIndex = Math.min(rarityConfig.length - 1, oldRarityIndex + 1);
                }
                newRarity = rarityConfig[newRarityIndex];
            }

            const newItem = {
                ...tpl,
                uid: Math.random().toString(36).substr(2, 9),
                poolName: pool.name,
                rarity: newRarity,
                sterile: consumedItem.sterile,
                decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 40) : undefined
            };

            let finalItem = newItem;
            if (skillState.nextDrawEnhanced) {
                const nextRarity = getNextRarity(newItem.rarity.id, config);
                if (nextRarity) finalItem = { ...newItem, rarity: nextRarity };
                setSkillState(prev => ({ ...prev, nextDrawEnhanced: false }));
            }

            setDrawCount(prev => prev + 1);
            handleIncomingItems(tryDropToolItem([finalItem]), decayedInv);
            refreshMatrix();
            setSelectionMode(null);
            return;
        }

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
                // 如果目标物品在订单槽位上，更新 uid
                if (assignedItemUids.has(targetItem.uid)) updateAssignmentUid(targetItem.uid, upgradedItem.uid);
                setPendingItem(null);
                return;
            }

            if (pendingItem.isOverload) {
                // targetItem is already declared at line 790 (but check for null again to be safe in this context? No, it's const, it hasn't changed. Just check value.)

                // CRASH FIX: Ensure targetItem exists (it might be null if clicking empty slot in some edge case)
                if (!targetItem) {
                    return;
                }

                const targetName = targetItem.name;
                // 清除被替换物品的订单槽位分配
                const clearedItems = inventory.filter(i => i && i.name === targetName);
                clearedItems.forEach(i => {
                    if (assignedItemUids.has(i.uid)) removeAssignmentByUid(i.uid);
                });
                const newInventory = inventory.filter(i => i && i.name !== targetName);

                const itemToAdd = { ...pendingItem };
                delete itemToAdd.isOverload;
                newInventory.push(itemToAdd);

                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            // Normal Replace (Backpack Full)
            if (!targetItem) {
                // If clicking empty slot when pendingItem is present (but not overload), just place it.
                const newInventory = [...inventory];
                newInventory[index] = pendingItem;
                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            // 如果被替换的物品在订单槽位上，更新 assignment uid 为新物品
            if (assignedItemUids.has(targetItem.uid)) updateAssignmentUid(targetItem.uid, pendingItem.uid);

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
                (!targetItem.decay || targetItem.decay > 0) && (!sourceItem.decay || sourceItem.decay > 0) &&
                sourceItem.name === targetItem.name &&
                sourceItem.rarity.id === targetItem.rarity.id &&
                sourceItem.rarity.id !== 'mythic') {



                const nextRarity = getNextRarity(sourceItem.rarity.id, config);

                const upgradedItem = { ...targetItem, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
                const newInventory = [...inventory];
                newInventory[index] = upgradedItem;
                newInventory[selectedSlot] = null;
                setInventory(newInventory.filter(item => item !== null));
                // 如果目标物品在订单槽位上，更新 uid
                if (assignedItemUids.has(targetItem.uid)) updateAssignmentUid(targetItem.uid, upgradedItem.uid);
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

        // Discarding does NOT consume durability (only draws do)
        // setInventory(prev => applyEntropy(prev));

        setPendingItem(null);
        setSelectedSlot(null);
    };

    const handleRefreshAllOrders = () => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || orderCandidates) return;
        if (!currentStageConfig.mechanics.refresh) {
            showToast(t("当前时代尚未解锁订单刷新技术！"), "error");
            return;
        }

        // 刷新所有订单前，清除所有槽位分配
        const allIndices = Array.from({ length: currentStageConfig.orderSlots }, (_, i) => i);
        clearAssignmentsForOrders(allIndices);

        // 为每个槽位生成2个候选订单，逐个让玩家选择
        const allCandidates = [];
        for (let i = 0; i < currentStageConfig.orderSlots; i++) {
            const candidate1 = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, orders) || generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            const candidate2 = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, orders) || generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            allCandidates.push({ slotIndex: i, candidates: [candidate1, candidate2] });
        }

        if (allCandidates.length > 0) {
            setOrderCandidates(allCandidates[0]);
            if (allCandidates.length > 1) {
                setOrderCandidateQueue(allCandidates.slice(1));
            }
        }
    };

    const handleRefreshSingleOrder = (index) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || orderCandidates) return;

        if (!currentStageConfig.mechanics.refresh) {
            showToast(t("当前时代尚未解锁订单刷新技术！"), "error");
            return;
        }

        const currentOrder = orders[index];
        if (orderRefreshCount <= 0) return;

        let usedRefresh = true;
        if (hasSkill('time_freeze') && Math.random() < 0.20) {
            usedRefresh = false;
            showToast(t("【时间冻结】触发：刷新次数未消耗！"));
        }

        if (usedRefresh) {
            setOrderRefreshCount(prev => Math.max(0, prev - 1));
        }

        // 刷新单个订单前，清除该订单的槽位分配
        clearAssignmentsForOrders([index]);

        // 生成2个候选订单，让玩家选择
        const candidate1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
        const candidate2 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);

        setOrderCandidates({ slotIndex: index, candidates: [candidate1, candidate2] });
    };

    const handleSelectOrderCandidate = (candidateIndex) => {
        if (!orderCandidates) return;
        const { slotIndex, candidates } = orderCandidates;
        const selectedOrder = candidates[candidateIndex];

        const newOrders = [...orders];
        newOrders[slotIndex] = selectedOrder;

        setOrders(newOrders);

        setOrderCandidates(null);
        // 队列中的下一个候选由 useEffect 自动处理
    };

    const handleOrderClick = (orderIndex) => {
        // 新增：如果有 selectedSlot，尝试将选中物品放入订单槽位
        if (selectedSlot !== null && !isSubmitMode && !isRecycleMode && !pendingItem && !selectionMode) {
            const item = inventory[selectedSlot];
            if (item && !item.isToolItem && !item.isScoreItem && !assignedItemUids.has(item.uid)) {
                const order = orders[orderIndex];
                if (order) {
                    // 找到第一个名称匹配且未被直接分配的需求
                    const reqIdx = order.requirements.findIndex((req, rIdx) => {
                        const key = `${orderIndex}-${rIdx}`;
                        return req.name === item.name && !orderSlotAssignments[key];
                    });
                    if (reqIdx !== -1) {
                        handleAssignToOrder(orderIndex, reqIdx);
                        return;
                    } else {
                        showToast(t("该订单不需要此物品，或对应槽位已有物品"), "info");
                    }
                }
            }
            setSelectedSlot(null);
            return;
        }

        // Normal Orders Logic
        const order = orders[orderIndex];
        if (!order) return;

        // Check if we can satisfy at least ONE requirement for this order
        // If NO requirement can be satisfied, prevent clicking
        const requirements = [...order.requirements];
        let canSatisfyAny = false;

        for (const req of requirements) {
            const hasMatchingItem = inventory.some(item =>
                item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus
            );
            if (hasMatchingItem) {
                canSatisfyAny = true;
                break;
            }
        }

        // Prevent clicking if no requirements can be satisfied
        if (!canSatisfyAny) {
            showToast(t("库存中没有满足该订单条件的物品"), "error");
            return;
        }

        // Auto-enter submit mode if not active
        if (!isSubmitMode) {
            setIsSubmitMode(true);
            setIsRecycleMode(false);
            setSelectedSlot(null);
            // We can't immediately run the selection logic because state updates are async,
            // but we can use a local flag to proceed in this execution turn.
        }

        // Check which items are currently satisfying THIS specific order
        const currentMatchesIdx = [];
        const tempSelected = [...selectedIndices];

        for (const req of requirements) {
            const matchIdx = tempSelected.findIndex(idx => {
                const item = inventory[idx];
                return item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus;
            });
            if (matchIdx !== -1) {
                currentMatchesIdx.push(tempSelected[matchIdx]);
                tempSelected.splice(matchIdx, 1);
            }
        }

        const isFullySatisfied = currentMatchesIdx.length === requirements.length;

        if (isFullySatisfied) {
            // UNSELECT all items used for this order
            setSelectedIndices(prev => prev.filter(idx => !currentMatchesIdx.includes(idx)));
        } else {
            // TRY TO FILL the remaining/missing requirements
            const indicesToAdd = [];
            const currentlyUsedIndices = new Set(selectedIndices);

            for (const req of requirements) {
                // Skip if already matched
                const alreadyMatched = currentMatchesIdx.some(idx => {
                    const item = inventory[idx];
                    return item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus;
                });

                // Wait, the toggle logic above is simpler. 
                // Let's just find ALL candidates to satisfy the order from scratch, 
                // but prioritizing keeping what's already selected.
            }

            // Simpler "Fill everything we can" logic:
            const finalIndicesToAdd = [];
            const usedInThisSearch = new Set(selectedIndices);

            requirements.forEach((req, rIdx) => {
                // 1. 优先使用已分配到该订单槽位的物品
                const slotKey = `${orderIndex}-${rIdx}`;
                const assignedUid = orderSlotAssignments[slotKey];
                if (assignedUid) {
                    const assignedIdx = inventory.findIndex(i => i && i.uid === assignedUid);
                    if (assignedIdx !== -1 && !usedInThisSearch.has(assignedIdx) &&
                        inventory[assignedIdx].rarity.bonus >= req.requiredRarity.bonus &&
                        (!inventory[assignedIdx].decay || inventory[assignedIdx].decay > 0)) {
                        finalIndicesToAdd.push(assignedIdx);
                        usedInThisSearch.add(assignedIdx);
                        return;
                    }
                }

                // 2. 回退：从背包搜索最优候选
                const candidates = inventory
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item, idx }) =>
                        item &&
                        !usedInThisSearch.has(idx) &&
                        item.name === req.name &&
                        item.rarity.bonus >= req.requiredRarity.bonus
                    );
                candidates.sort((a, b) => b.item.rarity.bonus - a.item.rarity.bonus);
                if (candidates.length > 0) {
                    finalIndicesToAdd.push(candidates[0].idx);
                    usedInThisSearch.add(candidates[0].idx);
                }
            });

            if (finalIndicesToAdd.length > 0) {
                setSelectedIndices(prev => [...prev, ...finalIndicesToAdd]);
            } else if (!isFullySatisfied && !isSubmitMode) {
                // If we JUST entered submit mode but couldn't find anything, show a hint
                showToast(t("库存中没有满足该订单条件的物品"), "info");
            }
        }
    };

    const handleConfirmSubmission = () => {
        if (satisfiableOrders.length === 0) {
            showToast(t("请至少完成一个任务才能提交！"), "error");
            return;
        }

        let gainedScore = 0;
        const newOrders = [...orders];
        const completedIndices = [];

        const nextSkillState = { ...skillState };

        satisfiableOrders.forEach(({ index, finalScoreReward }) => {
            gainedScore += finalScoreReward;

            if (hasSkill('auto_restock')) nextSkillState.nextDrawExtraItem = true;
            if (hasSkill('turn_fortune')) nextSkillState.nextDrawGuaranteedRare = true;

            completedIndices.push(index);
        });

        setSkillState(nextSkillState);

        setScore(prev => prev + gainedScore);

        // 每次完成订单，增加刷新次数
        if (completedIndices.length > 0) {
            setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + completedIndices.length));
        }

        // 为已完成的普通订单槽位生成候选订单，让玩家选择
        // 先清除这些订单的槽位分配
        if (completedIndices.length > 0) {
            clearAssignmentsForOrders(completedIndices);
        }

        const candidateQueue = [];
        completedIndices.forEach(idx => {
            const candidate1 = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, orders) || generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            const candidate2 = generateRoomNeedOrder(allNormalItems, config, ROOM_NEEDS, orders) || generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            candidateQueue.push({ slotIndex: idx, candidates: [candidate1, candidate2] });
        });

        // 不立即更新订单数组，等选择完成后再更新

        // 启动候选订单选择队列
        if (candidateQueue.length > 0) {
            setOrderCandidates(candidateQueue[0]);
            if (candidateQueue.length > 1) {
                setOrderCandidateQueue(candidateQueue.slice(1));
            }
        }

        const newInventory = inventory.filter((_, idx) => !selectedIndices.includes(idx));
        setInventory(newInventory);

        setIsSubmitMode(false);
        setSelectedIndices([]);
    };

    const handleConfirmRecycle = () => {
        if (selectedIndices.length === 0) return;

        // 清除被回收物品的订单槽位分配
        selectedIndices.forEach(idx => {
            const item = inventory[idx];
            if (item && assignedItemUids.has(item.uid)) {
                removeAssignmentByUid(item.uid);
            }
        });

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
            setIsEvacuationMode(false);
            setSelectedSlot(null);
        }
    };

    // Evacuation mode removed — evacuation is now unconditional via handleEvacuate

    const handleSortInventory = () => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode) return;

        setInventory(prev => {
            const validItems = prev.filter(i => i !== null);
            validItems.sort((a, b) => {
                // 1. Name (Primary)
                const nameDiff = a.name.localeCompare(b.name, 'zh-CN');
                if (nameDiff !== 0) return nameDiff;

                // 2. Pool Name (Secondary)
                const poolDiff = (a.poolName || '').localeCompare(b.poolName || '', 'zh-CN');
                if (poolDiff !== 0) return poolDiff;

                // 3. Rarity (Tertiary - Descending)
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

    const handlePoolHover = (pool) => {
        if (pool.type !== 'score') {
            setHoveredPoolId(pool.originalId || pool.id);
            setHoveredPoolItemNames(pool.items.map(i => i.name));
        }
    };

    const handlePoolLeave = () => {
        setHoveredPoolId(null);
        setHoveredPoolItemNames([]);
    };

    // Phase transition: open TV → show intro
    const startShow = () => {
        if (tvWatchedToday) return;
        setTvWatchedToday(true);
        setShowDrawnItems([]);
        setGamePhase('show_intro');
    };

    // Phase transition: host intro done → start drawing (empty show inventory)
    const beginDrawing = () => {
        setHomeStorage([...inventory]); // save home items
        setInventory([]); // show starts with empty inventory
        refreshMatrix(); // fresh grid each day
        setGamePhase('show');
        setShowDrawsThisRound(0);
    };

    // Phase transition: show outro (host says goodbye, then player goes home)
    const goHome = () => {
        setGamePhase('show_outro');
        setShowDrawsThisRound(0);
    };

    // Phase transition: confirm going home after outro → delivery knock
    const confirmGoHome = () => {
        setGamePhase('delivery_knock');
    };

    // Phase transition: open the delivery box
    const [deliveryItems, setDeliveryItems] = useState([]);
    const [deliveryRevealed, setDeliveryRevealed] = useState(false);

    const openDelivery = () => {
        // Delivery = only items still in show inventory (recycled items excluded)
        setDeliveryItems([...inventory]);
        setDeliveryRevealed(true);
    };

    const collectDelivery = () => {
        // Merge remaining show items into home storage
        const mergedStorage = [...homeStorage, ...inventory.filter(Boolean)];
        setInventory(mergedStorage);
        setHomeStorage(mergedStorage);
        setDeliveryItems([]);
        setDeliveryRevealed(false);
        setShowDrawnItems([]);
        setGamePhase('home');
    };

    // Keep homeStorage in sync with inventory during home phase
    useEffect(() => {
        if (gamePhase === 'home') {
            setHomeStorage([...inventory]);
        }
    }, [inventory, gamePhase]);

    // Sleep: advance to next day (only after watching TV)
    const sleep = () => {
        if (!tvWatchedToday) return;
        setHomeStorage([...inventory]); // save before sleep
        setDay(prev => prev + 1);
        setTvWatchedToday(false);
        setGamePhase('home');
    };

    // Track draws per round — auto-transition to home after DRAWS_PER_ROUND
    useEffect(() => {
        if (gamePhase === 'show' && showDrawsThisRound >= DRAWS_PER_ROUND && !isDrawing && !isDoomResolving && !pendingItem && pendingQueue.length === 0) {
            goHome();
        }
    }, [showDrawsThisRound, gamePhase, isDrawing, isDoomResolving, pendingItem, pendingQueue]);

    // Increment per-round draw counter when drawCount changes (skip initial)
    const prevDrawCountRef = { current: drawCount };
    useEffect(() => {
        if (drawCount > 0 && drawCount !== prevDrawCountRef.current) {
            prevDrawCountRef.current = drawCount;
            if (gamePhase === 'show') {
                setShowDrawsThisRound(prev => prev + 1);
            }
        }
    }, [drawCount, gamePhase]);

    // Simplified evacuation: unconditional, keep all items
    const handleEvacuate = () => {
        setModalContent({
            type: 'victory',
            score: score,
            title: t("撤离成功"),
            message: t("你带着战利品成功撤离了！"),
        });
    };


    return {
        state: {
            hp,
            doomGrid,
            doomLevel,
            doomHitCount,
            isDoomResolving,
            doomResolutionState,
            doomGridHighlight,
            score,
            currentStageConfig,
            maxInventorySize,
            drawCount,
            matrix, gravityEvent, lastDraw, isDrawing, explodingCells,
            orders,
            orderRefreshCount,
            REFRESH_MAX,
            orderCandidates, orderCandidateQueue,
            inventory,
            pendingItem, pendingQueue,
            selectedSlot,
            hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
            setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
            isSubmitMode, isRecycleMode, selectedIndices,
            modalContent, selectionMode,
            skills, skillSelectionCandidates,
            toast,
            satisfiableOrders,
            potentialSatisfiableOrders,
            totalRecycleValue,
            selectedItemNames,
            skillState,
            orderSlotAssignments,
            assignedItemUids,
            phantomMarks,
            toolSelectionMode,
            gamePhase,
            showDrawsThisRound,
            DRAWS_PER_ROUND,
            day,
            tvWatchedToday,
            deliveryItems,
            deliveryRevealed,
            hostCommentKey,
        },
        actions: {
            showToast,
            hideToast,
            triggerSkillSelection,
            handleSkillSelect,
            handleSkillReplace,
            selectRowOrColumn,
            handleCloseModal,
            handleSelectionSelect,
            handleSelectionCancel,
            handleSlotClick,
            handleDiscardNew,
            handleRefreshAllOrders,
            handleRefreshSingleOrder,
            handleSelectOrderCandidate,
            handleOrderClick,
            handleConfirmSubmission,
            handleConfirmRecycle,
            toggleSubmitMode,
            toggleRecycleMode,
            handleSortInventory,
            handlePoolHover,
            handlePoolLeave,
            handleEvacuate,
            addInventoryItem,
            debugGetOrderItems,
            handleToolItemUse,
            handleUnassignFromOrder,
            handleOrderSlotClick,
            handleCancelToolSelection,
            handleGridRefresh,
            tickDoomResolution,
            completeDoomResolution,
            startShow,
            beginDrawing,
            goHome,
            confirmGoHome,
            openDelivery,
            collectDelivery,
            sleep,
            setGamePhase,
        },
        helpers: {
            hasSkill
        }
    };
};
