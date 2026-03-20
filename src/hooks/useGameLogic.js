import { useState, useEffect, useMemo } from 'react';
import {
    getAllNormalItems,
    generateOrder,
    getNextRarity,
    getRandomItems
} from '../utils/helpers';
import { generateResourceMatrix, selectAvailableShapes, getShapeCells, isValidPlacement, getCoveredResourcePoints } from '../utils/matrixHelpers';
import { SKILL_DEFINITIONS, TOOL_ITEMS } from '../data/constants';
import { useLanguage } from '../contexts/LanguageContext';

export const useGameLogic = (config, initialSkills = [], onReset, initialScore = 0) => {
    const { t } = useLanguage();
    const [score, setScore] = useState(initialScore);

    const [emergencyDifficulty, setEmergencyDifficulty] = useState(config.emergency?.difficulty?.initial || 1);

    const currentStageConfig = config.stages[0]; // Always use stage 0 (no stage progression)
    const maxInventorySize = currentStageConfig.inventorySize;

    // Gold System
    const [gold, setGold] = useState(config.global?.initialGold || 30);

    const [orderRefreshCount, setOrderRefreshCount] = useState(config.global?.initialRefreshCount ?? 4);
    const REFRESH_MAX = config.global?.maxRefreshCount ?? 4;

    const [drawCount, setDrawCount] = useState(0);

    const [matrix, setMatrix] = useState(null);
    const [availableShapes, setAvailableShapes] = useState([]);
    const [selectedShape, setSelectedShape] = useState(null);
    const [shapeOrientation, setShapeOrientation] = useState('h');
    const [orders, setOrders] = useState([]);
    const [emergencyOrders, setEmergencyOrders] = useState([]);

    const [inventory, setInventory] = useState([]);

    const [pendingItem, setPendingItem] = useState(null);
    const [pendingQueue, setPendingQueue] = useState([]);

    const [selectedSlot, setSelectedSlot] = useState(null);

    const [hoveredPoolId, setHoveredPoolId] = useState(null);
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
    const [hoveredPoolItemNames, setHoveredPoolItemNames] = useState([]);

    const [isSubmitMode, setIsSubmitMode] = useState(false);
    const [isEvacuationMode, setIsEvacuationMode] = useState(false);
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

    useEffect(() => {
        if (orders.length < currentStageConfig.orderSlots) {
            const needed = currentStageConfig.orderSlots - orders.length;
            const newOrders = [...orders, ...Array(needed).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig))];
            setOrders(newOrders);
        } else if (orders.length === 0) {
            setOrders(Array(currentStageConfig.orderSlots).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig)));
        }

        // Initialize Emergency Orders if none
        if (emergencyOrders.length === 0) {
            // Generate first order
            const order1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, emergencyDifficulty);
            order1.isEmergency = true;
            order1.difficulty = emergencyDifficulty;

            // Generate second order (ensure different item types AND CATEGORIES)
            const usedPoolIds = new Set(order1.requirements.map(r => r.poolId));
            const availableForSecond = allNormalItems.filter(i => !usedPoolIds.has(i.poolId));

            // Fallback if no items left (unlikely but safe)
            const itemsForOrder2 = availableForSecond.length >= (config.emergency?.reqCountMin || 1) ? availableForSecond : allNormalItems;

            const order2 = generateOrder(itemsForOrder2, config, hasSkill, currentStageConfig, true, emergencyDifficulty);
            order2.isEmergency = true;
            order2.difficulty = emergencyDifficulty;

            setEmergencyOrders([order1, order2]);
        }
    }, [config, allNormalItems, currentStageConfig.orderSlots, orders.length, emergencyOrders.length, emergencyDifficulty]);

    const applyEntropy = (inv) => {
        if (!currentStageConfig.mechanics.entropy) return inv;
        return inv.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        });
    };

    const refreshMatrix = (tick = false) => {
        setMatrix(generateResourceMatrix(allNormalItems, config, currentStageConfig));
        setAvailableShapes(selectAvailableShapes());
        setSelectedShape(null);
        setShapeOrientation('h');
        if (tick && currentStageConfig.mechanics.entropy) {
            setInventory(prev => prev.map(item => {
                if (!item || item.decay === undefined) return item;
                return { ...item, decay: item.decay - 1 };
            }));
        }
    };

    useEffect(() => {
        refreshMatrix(false);
    }, [config]);

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
        let order;
        if (orderIndex >= 998) {
            order = emergencyOrders[orderIndex - 998];
        } else {
            order = orders[orderIndex];
        }

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
        // 按类别分别收集已分配的物品名称 -> 实际物品
        const assignedNormal = {}; // 普通订单的分配
        const assignedEmergency = {}; // 撤离订单的分配
        Object.entries(orderSlotAssignments).forEach(([key, uid]) => {
            const item = inventory.find(i => i && i.uid === uid);
            if (!item) return;
            const orderIdx = parseInt(key.split('-')[0]);
            const target = orderIdx >= 998 ? assignedEmergency : assignedNormal;
            if (!target[item.name]) target[item.name] = [];
            target[item.name].push({ key, item });
        });

        // 普通订单之间产生幻影
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

        // 撤离订单之间产生幻影
        emergencyOrders.forEach((order, idx) => {
            if (!order) return;
            const orderIdx = 998 + idx;
            order.requirements.forEach((req, reqIdx) => {
                const myKey = `${orderIdx}-${reqIdx}`;
                if (orderSlotAssignments[myKey]) return;
                const sources = assignedEmergency[req.name];
                if (sources && sources.length > 0) {
                    result[myKey] = { item: sources[0].item, sourceKey: sources[0].key };
                }
            });
        });

        return result;
    }, [orders, emergencyOrders, orderSlotAssignments, inventory]);

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
        if ((!isSubmitMode && !isEvacuationMode) || selectedIndices.length === 0) return [];
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
        // Normal Orders
        if (!isEvacuationMode) {
            orders.forEach((o, i) => {
                const res = checkOrder(o, i, true);
                if (res) results.push(res);
            });
        }

        // Emergency Orders
        if (isEvacuationMode) {
            emergencyOrders.forEach((order, idx) => {
                if (order) {
                    const res = checkOrder(order, 998 + idx, false);
                    if (res) results.push(res);
                }
            });
        }

        return results;
    }, [orders, emergencyOrders, isSubmitMode, isEvacuationMode, selectedIndices, inventory, hasSkill, skills]);

    // Preview Potential Rewards (Calculate using BEST items from inventory)
    const potentialSatisfiableOrders = useMemo(() => {
        // Run this even if NOT in submit mode, to show "Preview" of gold
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

        // Emergency Orders
        emergencyOrders.forEach((order, idx) => {
            if (order) {
                const res = checkOrder(order, 998 + idx, false);
                if (res) results.push(res);
            }
        });

        return results;
    }, [inventory, orders, skills, emergencyOrders]);

    const totalRecycleValue = useMemo(() => {
        if (!isRecycleMode || selectedIndices.length === 0) return 0;
        return selectedIndices.reduce((sum, idx) => {
            const item = inventory[idx];
            return sum + (item ? item.rarity.recycleValue : 0);
        }, 0);
    }, [isRecycleMode, selectedIndices, inventory]);

    const selectedItemNames = useMemo(() => {
        if (!isSubmitMode && !isEvacuationMode) return [];
        return selectedIndices.map(idx => inventory[idx]?.name).filter(Boolean);
    }, [isSubmitMode, isEvacuationMode, selectedIndices, inventory]);

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

    const handleMatrixDraw = (row, col) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || isEvacuationMode || orderCandidates) return;
        if (!selectedShape) {
            showToast(t("请先选择形状"), "error");
            return;
        }
        if (!matrix) return;

        const shapeCells = getShapeCells(selectedShape, row, col, shapeOrientation);
        if (!isValidPlacement(shapeCells, 5, matrix.anchors)) {
            showToast(t("无效放置：必须覆盖至少一个锚点"), "error");
            return;
        }

        const cost = selectedShape.cost;
        if (gold < cost) {
            showToast(t("金币不足！"), "error");
            return;
        }

        const coveredPoints = getCoveredResourcePoints(shapeCells, matrix.resourcePoints);
        if (coveredPoints.length === 0) {
            showToast(t("没有资源点被覆盖"), "error");
            return;
        }

        // Deduct gold
        setGold(prev => prev - cost);
        setDrawCount(prev => prev + 1);

        // Random pick 1 resource point from covered set
        const selectedPoint = coveredPoints[Math.floor(Math.random() * coveredPoints.length)];

        // Create item from the resource point
        let newItem = {
            ...selectedPoint.item,
            uid: Math.random().toString(36).substr(2, 9),
            rarity: selectedPoint.rarity,
            poolName: selectedPoint.item.poolName,
            decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 25) : undefined,
        };

        // Apply enhance (星辉祝福)
        if (skillState.nextDrawEnhanced) {
            const nextRarity = getNextRarity(newItem.rarity.id, config);
            if (nextRarity) newItem = { ...newItem, rarity: nextRarity };
        }

        let itemsToProcess = [newItem];

        // Auto Restock skill: extra item
        if (skillState.nextDrawExtraItem) {
            const extraPoint = coveredPoints[Math.floor(Math.random() * coveredPoints.length)];
            let extraItem = {
                ...extraPoint.item,
                uid: Math.random().toString(36).substr(2, 9),
                rarity: extraPoint.rarity,
                poolName: extraPoint.item.poolName,
                decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 25) : undefined,
            };
            if (skillState.nextDrawEnhanced) {
                const nextRarity = getNextRarity(extraItem.rarity.id, config);
                if (nextRarity) extraItem = { ...extraItem, rarity: nextRarity };
            }
            itemsToProcess.push(extraItem);
        }

        // Update skill state
        const newSkillState = { ...skillState };
        newSkillState.nextDrawExtraItem = false;
        newSkillState.nextDrawGuaranteedRare = false;
        newSkillState.nextDrawEnhanced = false;

        // Consolation prize tracking
        let allCommon = itemsToProcess.every(item => item.rarity.id === 'common');
        if (allCommon) {
            newSkillState.consecutiveCommons += 1;
        } else {
            newSkillState.consecutiveCommons = 0;
        }

        if (hasSkill('consolation_prize') && newSkillState.consecutiveCommons >= 5) {
            newSkillState.nextDrawGuaranteedRare = true;
            newSkillState.consecutiveCommons = 0;
            showToast(t("【安慰奖】触发：下一次必定稀有！"), "info");
        }

        // Negotiator skill
        if (hasSkill('negotiator')) {
            const hasEpicPlus = itemsToProcess.some(item => item.rarity.bonus >= 0.5);
            if (hasEpicPlus) {
                setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + 1));
                showToast(t("【谈判专家】触发：订单刷新次数+1"));
            }
        }

        setSkillState(newSkillState);

        // Apply Entropy
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

        handleIncomingItems(tryDropToolItem(itemsToProcess), decayedInventory);

        refreshMatrix(true);
    };

    const handleSelectShape = (shape) => {
        setSelectedShape(prev => prev?.id === shape.id ? null : shape);
    };

    const handleToggleOrientation = () => {
        setShapeOrientation(prev => prev === 'h' ? 'v' : 'h');
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
        if (pendingItem || isSubmitMode || isRecycleMode || isEvacuationMode || selectionMode || toolSelectionMode) {
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
        refreshMatrix(true);
        setModalContent(null);
    };

    const handleSelectionSelect = (_selectedItem) => {
        // precise/targeted affix modes removed (no longer used with matrix system)
        setSelectionMode(null);
    };

    const handleSelectionCancel = () => {
        if (selectionMode?.type === 'targeted') {
            // 退回金币
            const refundCost = selectionMode.cost || 2;
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else if (selectionMode?.type === 'trade_in') {
            // 退回金币
            const pool = selectionMode.pool;
            let refundCost = pool.cost || 2;
            if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
                refundCost = Math.max(0, refundCost - 1);
            }
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else if (selectionMode?.type === 'precise') {
            // 退回金币
            const pool = selectionMode.pool;
            let refundCost = pool.cost || 2;
            if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
                refundCost = Math.max(0, refundCost - 1);
            }
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else {
            setSelectionMode(null);
        }
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
        if (isSubmitMode || isEvacuationMode) {
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
                const recycleValue = clearedItems.reduce((acc, i) => acc + (i.rarity.recycleValue || 0), 0);
                if (recycleValue > 0) setGold(prev => prev + recycleValue);
                const itemToAdd = { ...pendingItem };
                delete itemToAdd.isOverload;
                newInventory.push(itemToAdd);
                setInventory(newInventory);
                setPendingItem(null);
                return;
            }

            // 背包满替换订单槽位物品：回收旧物品，新物品放入背包（不继承订单分配）
            const recycleGain = item.rarity.recycleValue;
            if (recycleGain > 0) setGold(prev => prev + recycleGain);
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
            refreshMatrix(true);
            setSelectionMode(null);
            return;
        }

        if (isSubmitMode || isRecycleMode || isEvacuationMode) {
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
                const recycleValue = clearedItems.reduce((acc, i) => acc + (i.rarity.recycleValue || 0), 0);
                if (recycleValue > 0) setGold(prev => prev + recycleValue);

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

            const recycleGain = targetItem.rarity.recycleValue;
            if (recycleGain > 0) setGold(prev => prev + recycleGain);
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
        const recycleGain = pendingItem.rarity.recycleValue;
        if (recycleGain > 0) setGold(prev => prev + recycleGain);

        // Discarding does NOT consume durability (only draws do)
        // setInventory(prev => applyEntropy(prev));

        setPendingItem(null);
        setSelectedSlot(null);
    };

    const handleRefreshAllOrders = () => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || isEvacuationMode || orderCandidates) return;
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
            const candidate1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            const candidate2 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
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
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || isEvacuationMode || orderCandidates) return;

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
        if (selectedSlot !== null && !isSubmitMode && !isRecycleMode && !isEvacuationMode && !pendingItem && !selectionMode) {
            const item = inventory[selectedSlot];
            if (item && !item.isToolItem && !item.isScoreItem && !assignedItemUids.has(item.uid)) {
                // 根据 orderIndex 查找对应订单
                const order = orderIndex >= 998
                    ? emergencyOrders[orderIndex - 998]
                    : orders[orderIndex];
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

        // Handle Emergency Orders click (Evacuation Mode)
        if (orderIndex >= 998) {
            if (!isEvacuationMode) {
                return;
            }
            const order = emergencyOrders[orderIndex - 998];
            if (!order) return;

            // Logic for auto-selecting items for this emergency order
            // Similar to normal order logic below but specifically for evacuation

            // 1. Check if satisfiable
            let canSatisfyAny = false;
            for (const req of order.requirements) {
                if (inventory.some(item => item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus)) {
                    canSatisfyAny = true;
                    break;
                }
            }
            if (!canSatisfyAny) {
                showToast(t("库存中没有满足该离开关卡需求的物品"), "error");
                return;
            }

            // 2. Select items
            // We want to fill this specific order requirements from inventory
            const finalIndicesToAdd = [];
            const usedInThisSearch = new Set(selectedIndices); // Respect already selected

            order.requirements.forEach(req => {
                const candidates = inventory
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item, idx }) =>
                        item &&
                        !usedInThisSearch.has(idx) &&
                        item.name === req.name &&
                        item.rarity.bonus >= req.requiredRarity.bonus
                    );
                candidates.sort((a, b) => b.item.rarity.bonus - a.item.rarity.bonus); // Use best first
                if (candidates.length > 0) {
                    finalIndicesToAdd.push(candidates[0].idx);
                    usedInThisSearch.add(candidates[0].idx);
                }
            });

            if (finalIndicesToAdd.length > 0) {
                // If we found new items, add them. 
                // If we clicked an already satisfied order, maybe toggle off? 
                // Normal logic toggles off if fully satisfied.

                // Check if fully satisfied by CURRENT selection
                // But emergency order doesn't have a "status" check in the same way here easily without memo.
                // Let's just Add for now.
                setSelectedIndices(prev => {
                    // Filter out any that might be duplicates just in case
                    const newIndices = finalIndicesToAdd.filter(idx => !prev.includes(idx));
                    return [...prev, ...newIndices];
                });
            }

            return;
        }

        // Normal Orders Logic
        if (isEvacuationMode) return; // Cannot click normal orders in evacuation mode

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

        // 追踪完成的订单类型
        let completedEmergencyOrder = false;
        let completedScoreCount = 0;

        const nextSkillState = { ...skillState };

        satisfiableOrders.forEach(({ index, finalScoreReward, reqCount, requirements, isScoreOrder }) => {
            gainedScore += finalScoreReward;

            if (hasSkill('big_order_expert') && reqCount === 4) {
                showToast(t("【大订单专家】触发：+5金币"));
            }

            if (hasSkill('hard_order_expert')) {
                const hasHardReq = requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) {
                    showToast(t("【困难订单专家】触发：+10金币"));
                }
            }

            if (hasSkill('auto_restock')) nextSkillState.nextDrawExtraItem = true;
            if (hasSkill('turn_fortune')) nextSkillState.nextDrawGuaranteedRare = true;

            // 追踪订单类型
            if (index >= 998) {
                completedEmergencyOrder = true;
            }

            // 积分订单的奖励通常更高，这里将其视为所有非撤离订单都能获得积分
            if (isScoreOrder) completedScoreCount++;

            completedIndices.push(index);
        });

        setSkillState(nextSkillState);

        setScore(prev => prev + gainedScore);

        // 每次完成订单，增加刷新次数
        if (completedIndices.length > 0) {
            setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + completedIndices.length));
        }

        // 只有手动“离开关卡”会提升难度，因此这里删除了完成订单时的难度提升逻辑

        // 完成积分订单后，降低撤离订单难度
        if (completedScoreCount > 0) {
            const difficultyConfig = config.emergency?.difficulty;
            if (difficultyConfig) {
                const decreaseAmountBase = difficultyConfig.decreaseOnScoreOrder !== undefined ? difficultyConfig.decreaseOnScoreOrder : 1;
                const decreaseAmount = decreaseAmountBase * completedScoreCount;
                const minDifficulty = difficultyConfig.minDifficulty || 1;
                if (decreaseAmount > 0) {
                    setEmergencyDifficulty(prev => {
                        const newDiff = Math.max(minDifficulty, prev - decreaseAmount);
                        if (newDiff < prev) {
                            showToast(`${t("积分订单达成，离开关卡需求难度降低至")} ${newDiff}！`, "success");
                        }
                        return newDiff;
                    });
                } else if (decreaseAmountBase === 0) {
                    showToast(t("积分订单达成！"), "success");
                }
            }
        }

        // 为已完成的普通订单槽位生成候选订单，让玩家选择
        // 先清除这些订单的槽位分配
        const normalCompletedIndices = completedIndices.filter(idx => idx < 998);
        if (normalCompletedIndices.length > 0) {
            clearAssignmentsForOrders(normalCompletedIndices);
        }

        const candidateQueue = [];
        completedIndices.forEach(idx => {
            if (idx >= 998) {
                // Emergency orders handled via Evacuate button now
            } else {
                // 保留旧订单显示，直到玩家选择新订单后再替换
                const candidate1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
                const candidate2 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
                candidateQueue.push({ slotIndex: idx, candidates: [candidate1, candidate2] });
            }
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

        let baseValue = totalRecycleValue;
        let extraGold = 0;

        if (hasSkill('alchemy')) {
            selectedIndices.forEach(idx => {
                const item = inventory[idx];
                if (item && item.rarity.bonus >= 0.2) {
                    if (Math.random() < 0.25) extraGold += 5;
                }
            });
            if (extraGold > 0) showToast(`${t("【炼金术】触发：获得")} ${extraGold} ${t("金币")}!`, 'info');
        }

        setGold(prev => prev + baseValue + extraGold);

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

    const toggleEvacuationMode = () => {
        const nextState = !isEvacuationMode;
        setIsEvacuationMode(nextState);
        setIsSubmitMode(false);
        setIsRecycleMode(false);
        setSelectedIndices([]);
    };

    const handleSortInventory = () => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || isEvacuationMode) return;

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

    // Evacuate: Trigger submission check for emergency orders
    const handleEvacuate = () => {
        toggleEvacuationMode();
    };

    const handleEvacuationContinue = () => {
        // 1. Increase Difficulty
        const difficultyConfig = config.emergency?.difficulty;
        const increaseOnEvacuation = difficultyConfig?.increaseOnNewOrder || 1;
        const maxDifficulty = difficultyConfig?.maxDifficulty || 10;
        const newDifficulty = Math.min(maxDifficulty, emergencyDifficulty + increaseOnEvacuation);
        setEmergencyDifficulty(newDifficulty);

        // 2. Generate New Orders
        const order1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, newDifficulty);
        order1.isEmergency = true;
        order1.difficulty = newDifficulty;

        const usedPoolIds = new Set(order1.requirements.map(r => r.poolId));
        const availableForSecond = allNormalItems.filter(i => !usedPoolIds.has(i.poolId));
        const itemsForOrder2 = availableForSecond.length >= (config.emergency?.reqCountMin || 1) ? availableForSecond : allNormalItems;

        const order2 = generateOrder(itemsForOrder2, config, hasSkill, currentStageConfig, true, newDifficulty);
        order2.isEmergency = true;
        order2.difficulty = newDifficulty;

        setEmergencyOrders([order1, order2]);

        // 3. Reset Gold
        const initialGold = config.global?.initialGold || 30;
        setGold(initialGold);

        // 4. Consume Items
        const newInventory = inventory.filter((_, idx) => !selectedIndices.includes(idx));
        setInventory(newInventory);

        showToast(`${t("离开此关卡成功！金币已重置为")} ${initialGold}`, "success");

        setIsEvacuationMode(false);
        setSelectedIndices([]);
        setModalContent(null);
    };

    const handleEvacuationExtract = () => {
        setModalContent({
            type: 'victory',
            score: score,
            title: t("离开关卡成功"),
            message: t("你带着战利品成功离开了此关卡！")
        });
    };

    const handleConfirmEvacuation = () => {
        if (emergencyOrders.length === 0) return;

        // Find satisfies emergency order
        // satisfiableOrders calculates based on *selection* and *isEvacuationMode* (which is true)
        // It returns an array of satisfied orders (indices 998, 999)

        const satisfied = satisfiableOrders.filter(o => o.index >= 998);

        if (satisfied.length === 0) {
            showToast(t("所选物品不足以完成离开关卡需求！"), "error");
            return;
        }

        setModalContent({
            type: 'evacuation_success',
            score: score
        });
    };


    return {
        state: {
            gold,
            emergencyOrders,
            emergencyDifficulty,
            score,
            currentStageConfig,
            maxInventorySize,
            drawCount,
            matrix, availableShapes, selectedShape, shapeOrientation,
            orders,
            orderRefreshCount,
            REFRESH_MAX,
            orderCandidates, orderCandidateQueue,
            inventory,
            pendingItem, pendingQueue,
            selectedSlot,
            hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
            setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
            isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
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
            toolSelectionMode
        },
        actions: {
            showToast,
            hideToast,
            triggerSkillSelection,
            handleSkillSelect,
            handleSkillReplace,
            handleMatrixDraw,
            handleSelectShape,
            handleToggleOrientation,
            refreshMatrix,
            handleCloseModal,
            handleSelectionSelect,
            handleSelectionCancel,
            handleSlotClick,
            handleDiscardNew,
            handleRefreshAllOrders,
            handleRefreshSingleOrder,
            handleSelectOrderCandidate,
            handleOrderClick,
            toggleEvacuationMode,
            handleConfirmEvacuation,
            handleConfirmSubmission,
            handleConfirmRecycle,
            toggleSubmitMode,
            toggleRecycleMode,
            handleSortInventory,
            handlePoolHover,
            handlePoolLeave,
            handleEvacuate,
            addInventoryItem,
            handleEvacuationContinue,
            handleEvacuationExtract,
            debugGetOrderItems,
            handleToolItemUse,
            handleUnassignFromOrder,
            handleOrderSlotClick,
            handleCancelToolSelection
        },
        helpers: {
            hasSkill
        }
    };
};
