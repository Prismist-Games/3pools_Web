import { useState, useEffect, useMemo } from 'react';
import {
    getAllNormalItems,
    generateOrder,
    rollRarity,
    getNextRarity,
    getRandomAffix,
    getRandomItems
} from '../utils/helpers';
import { SKILL_DEFINITIONS } from '../data/constants';
import { useLanguage } from '../contexts/LanguageContext';

export const useGameLogic = (config, initialSkills = [], onReset, initialScore = 0) => {
    const { t } = useLanguage();
    // Patience System
    const [patience, setPatience] = useState(config.patience.initialPatience);
    const [patienceStage, setPatienceStage] = useState(0);
    const [score, setScore] = useState(initialScore);

    // 生命值系统（原急躁值）
    const [health, setHealth] = useState(config.emergency?.health?.maxHealth || 3);
    const [emergencyDifficulty, setEmergencyDifficulty] = useState(config.emergency?.difficulty?.initial || 1);

    // Upgraded items tracking: [{ orderId, itemIndex, originalRarityId }]
    const [upgradedOrderItems, setUpgradedOrderItems] = useState([]);

    const currentStageConfig = config.stages[0]; // Always use stage 0 (no stage progression)
    const maxInventorySize = currentStageConfig.inventorySize;

    // Gold System
    const [gold, setGold] = useState(config.global?.initialGold || 30);

    const [drawCount, setDrawCount] = useState(0);

    const [activePools, setActivePools] = useState([]);
    const [orders, setOrders] = useState([]);
    const [emergencyOrder, setEmergencyOrder] = useState(null);
    const [emergencyOrderCompleted, setEmergencyOrderCompleted] = useState(false); // 标记限时订单已完成但未刷新

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

    const [modalContent, setModalContent] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);

    const [skills, setSkills] = useState(initialSkills);
    const [skillSelectionCandidates, setSkillSelectionCandidates] = useState(null);
    const [skillState, setSkillState] = useState({
        consecutiveCommons: 0,
        nextDrawGuaranteedRare: false,
        nextDrawExtraItem: false,
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

        // Initialize Emergency Order if none (Separate from normal orders slot limit)
        if (!emergencyOrder) {
            const deadline = config.emergency?.deadline || 15;
            const newEmergencyOrder = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, emergencyDifficulty);
            newEmergencyOrder.isEmergency = true;
            newEmergencyOrder.deadline = deadline;
            newEmergencyOrder.maxDeadline = deadline;
            newEmergencyOrder.difficulty = emergencyDifficulty;
            setEmergencyOrder(newEmergencyOrder);
        }
    }, [config, allNormalItems, currentStageConfig.orderSlots, orders.length, emergencyOrder, emergencyDifficulty]);

    const generateActivePools = () => {
        const result = [];
        const usedAffixIds = new Set();
        let tempPools = [...config.pools.slice(0, currentStageConfig.allowedPoolCount)];

        for (let i = 0; i < 3; i++) {
            if (tempPools.length === 0) break;
            const totalWeight = tempPools.reduce((sum, p) => sum + (p.weight || 1), 0);
            let r = Math.random() * totalWeight;
            let selectedIndex = -1;
            for (let j = 0; j < tempPools.length; j++) {
                r -= (tempPools[j].weight || 1);
                if (r <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            if (selectedIndex === -1) selectedIndex = tempPools.length - 1;
            const selectedPool = JSON.parse(JSON.stringify(tempPools[selectedIndex]));
            selectedPool.originalId = selectedPool.id;
            selectedPool.id = selectedPool.originalId;
            selectedPool.items = selectedPool.items.slice(0, currentStageConfig.poolSize);
            if (currentStageConfig.mechanics.affixes) {
                const availableAffixes = config.affixes.filter(a => !usedAffixIds.has(a.id));
                const affixPool = availableAffixes.length > 0 ? availableAffixes : config.affixes;
                const affix = getRandomAffix(affixPool);
                selectedPool.affixKey = affix.id;
                selectedPool.affix = affix;
                selectedPool.cost = affix.cost || config.patience.drawCost; // Use affix cost if defined
                usedAffixIds.add(affix.id);
            } else {
                selectedPool.cost = config.patience.drawCost;
            }
            result.push(selectedPool);
            tempPools.splice(selectedIndex, 1);
        }
        return result;
    };

    const applyEntropy = (inv) => {
        if (!currentStageConfig.mechanics.entropy) return inv;
        return inv.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        });
    };

    const refreshPools = (tick = false) => {
        setActivePools(generateActivePools());
        if (tick && currentStageConfig.mechanics.entropy) {
            setInventory(prev => prev.map(item => {
                if (!item || item.decay === undefined) return item;
                return { ...item, decay: item.decay - 1 };
            }));
        }

        // NOTE: Emergency order deadline no longer ticks down - player evacuates manually
    };

    useEffect(() => {
        refreshPools(false);
    }, [config]);

    useEffect(() => {
        const newStage = calculatePatienceStage(patience);
        if (newStage !== patienceStage) {
            handlePatienceStageChange(newStage, patienceStage);
            setPatienceStage(newStage);
        }
    }, [patience]);

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

    const handlePatienceStageChange = (newStage, oldStage) => {
        if (newStage > oldStage) {
            if (newStage <= 1) return;
            const stageDiff = newStage - Math.max(oldStage, 1);
            if (stageDiff <= 0) return;
            for (let i = 0; i < stageDiff; i++) {
                upgradeRandomOrderItem(newStage - i);
            }
        } else if (newStage < oldStage) {
            const stageDiff = oldStage - Math.max(newStage, 1);
            if (stageDiff <= 0) return;
            for (let i = 0; i < stageDiff; i++) {
                revertLastUpgrade();
            }
        }
    };

    const addInventoryItem = (itemName, rarityId) => {
        const allItems = getAllNormalItems(config.pools, currentStageConfig);
        const baseItem = allItems.find(i => i.name === itemName);
        const rarity = config.rarity.find(r => r.id === rarityId) || config.rarity[0];
        if (!baseItem) {
            showToast(`找不到物品: ${itemName}`, 'error');
            return;
        }
        const newItem = {
            ...baseItem,
            id: Math.random().toString(36).substr(2, 9),
            rarity,
            obtainCount: drawCount
        };
        if (inventory.length < maxInventorySize) {
            setInventory(prev => [...prev, newItem]);
            showToast(`${t("已获取")}: ${t(newItem.name)} (${t(rarity.name)})`, 'success');
        } else {
            showToast(t('背包已满！'), 'error');
        }
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

    // ===== 耐心值阶段机制核心函数 =====

    const calculatePatienceStage = (currentPatience) => {
        const stages = config.patience.stages; // [100, 80, 60, 40, 20, 10]
        for (let i = 0; i < stages.length; i++) {
            if (currentPatience >= stages[i]) return i;
        }
        return stages.length; // <10 时返回最大阶段
    };

    const upgradeRandomOrderItem = (currentStage) => {
        const eligibleOrders = orders
            .map((order, idx) => ({ order, idx }))
            .filter(({ order }) => order && order.requirements.length > 0);

        if (eligibleOrders.length === 0) return;

        const { order: randomOrder, idx: orderSlotIndex } = eligibleOrders[
            Math.floor(Math.random() * eligibleOrders.length)
        ];

        const eligibleItems = randomOrder.requirements.filter(req => {
            const nextRarity = getNextRarity(req.requiredRarity.id, config);
            return nextRarity !== null;
        });

        if (eligibleItems.length === 0) return;

        const randomReq = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
        const itemIndex = randomOrder.requirements.indexOf(randomReq);
        const nextRarity = getNextRarity(randomReq.requiredRarity.id, config);

        // 更新订单
        const updatedOrders = orders.map((o, idx) => {
            if (idx === orderSlotIndex && o) {
                const newReqs = [...o.requirements];
                newReqs[itemIndex] = { ...newReqs[itemIndex], requiredRarity: nextRarity };
                return { ...o, requirements: newReqs };
            }
            return o;
        });
        setOrders(updatedOrders);

        // 记录升级
        setUpgradedOrderItems(prev => [...prev, {
            orderSlotIndex,
            itemIndex,
            upgradeStage: currentStage
        }]);
    };

    const revertLastUpgrade = () => {
        if (upgradedOrderItems.length === 0) return;

        const lastUpgrade = upgradedOrderItems[upgradedOrderItems.length - 1];
        const { orderSlotIndex, itemIndex } = lastUpgrade;

        const order = orders[orderSlotIndex];
        if (!order) {
            setUpgradedOrderItems(prev => prev.slice(0, -1));
            return;
        }

        // 降级一次
        const currentReq = order.requirements[itemIndex];
        const currentRarityId = currentReq.requiredRarity.id;
        const rarityIndex = config.rarity.findIndex(r => r.id === currentRarityId);

        if (rarityIndex > 0) {
            const lowerRarity = config.rarity[rarityIndex - 1];

            const updatedOrders = orders.map((o, idx) => {
                if (idx === orderSlotIndex && o) {
                    const newReqs = [...o.requirements];
                    newReqs[itemIndex] = { ...newReqs[itemIndex], requiredRarity: lowerRarity };
                    return { ...o, requirements: newReqs };
                }
                return o;
            });
            setOrders(updatedOrders);
        }

        setUpgradedOrderItems(prev => prev.slice(0, -1));
    };



    const applySlotUpgrades = (newOrders, targetIndices = null) => {
        const result = [...newOrders];
        const updatedUpgrades = [];
        let upgradeChanged = false;

        upgradedOrderItems.forEach((upgrade) => {
            const { orderSlotIndex, itemIndex, upgradeStage } = upgrade;

            // 如果提供了 targetIndices，仅处理指定的槽位
            if (targetIndices && !targetIndices.includes(orderSlotIndex)) {
                updatedUpgrades.push(upgrade);
                return;
            }

            const order = result[orderSlotIndex];

            if (!order || !order.requirements[itemIndex]) {
                if (order && order.requirements.length > 0) {
                    const newIndex = Math.floor(Math.random() * order.requirements.length);
                    updatedUpgrades.push({ ...upgrade, itemIndex: newIndex });
                    upgradeChanged = true;

                    let currentRarity = order.requirements[newIndex].requiredRarity;
                    for (let i = 0; i < upgradeStage; i++) {
                        const nextRarity = getNextRarity(currentRarity.id, config);
                        if (nextRarity) currentRarity = nextRarity;
                    }
                    result[orderSlotIndex].requirements[newIndex] = {
                        ...result[orderSlotIndex].requirements[newIndex],
                        requiredRarity: currentRarity
                    };
                } else {
                    updatedUpgrades.push(upgrade);
                }
                return;
            }

            updatedUpgrades.push(upgrade);

            let currentRarity = order.requirements[itemIndex].requiredRarity;
            for (let i = 0; i < upgradeStage; i++) {
                const nextRarity = getNextRarity(currentRarity.id, config);
                if (nextRarity) currentRarity = nextRarity;
            }

            result[orderSlotIndex].requirements[itemIndex] = {
                ...result[orderSlotIndex].requirements[itemIndex],
                requiredRarity: currentRarity
            };
        });

        return { orders: result, updatedUpgrades, hasChanges: upgradeChanged };
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

            let extraPatience = 0;
            if (hasSkill('poverty_relief') && patience < 20) {
                extraPatience += 5;
            }
            if (hasSkill('big_order_expert') && order.requirements.length === 4) {
                extraPatience += 5;
            }
            if (hasSkill('hard_order_expert')) {
                const hasHardReq = order.requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) extraPatience += 10;
            }

            const finalPatienceReward = order.basePatienceReward; // Fixed reward as requested
            const finalScoreReward = Math.ceil(order.baseScoreReward * multiplier);

            return {
                index: idx,
                finalPatienceReward,
                finalScoreReward,
                isScoreOrder: isMain,
                reqCount: order.requirements.length,
                requirements: order.requirements
            };
        };

        const results = [];
        // Normal Orders
        orders.forEach((o, i) => {
            const res = checkOrder(o, i, true);
            if (res) results.push(res);
        });

        // Emergency Order (Index 999)
        if (emergencyOrder) {
            const res = checkOrder(emergencyOrder, 999, false);
            if (res) results.push(res);
        }

        return results;
    }, [orders, emergencyOrder, isSubmitMode, selectedIndices, inventory, hasSkill, patience, skills]);

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

            let extraPatience = 0;
            if (hasSkill('poverty_relief') && patience < 20) {
                extraPatience += 5;
            }
            if (hasSkill('big_order_expert') && order.requirements.length === 4) {
                extraPatience += 5;
            }
            if (hasSkill('hard_order_expert')) {
                const hasHardReq = order.requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) extraPatience += 10;
            }

            const finalPatienceReward = order.basePatienceReward; // Fixed reward as requested
            const finalScoreReward = Math.ceil(order.baseScoreReward * multiplier);

            return {
                index: idx,
                finalPatienceReward,
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

        // Emergency Order (Index 999)
        if (emergencyOrder) {
            const res = checkOrder(emergencyOrder, 999, false);
            if (res) results.push(res);
        }

        return results;
    }, [inventory, orders, patience, skills, emergencyOrder]);

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

    const createItem = (pool, itemTemplate, affixKey = null) => {
        const rarity = rollRarity(config, affixKey, patience, hasSkill, skillState, currentStageConfig);
        return {
            ...itemTemplate,
            uid: Math.random().toString(36).substr(2, 9),
            poolName: pool.name,
            rarity: rarity,
            sterile: affixKey === 'hardened',
            decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 40) : undefined
        };

    };


    const handleIncomingItems = (newItems, overrideInventory = null) => {
        // Negotiator Skill Check
        if (hasSkill('negotiator')) {
            let triggered = false;
            newItems.forEach(item => {
                if (item.rarity.bonus >= 0.4) triggered = true;
            });
            if (triggered) {
                setOrders(prev => prev.map(o => ({ ...o, remainingRefreshes: o.remainingRefreshes + 1 })));
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

    const handleScoreDraw = (pool) => {
        const scoreRate = config.global.scoreDropRate || 0.3;
        const isScoreItem = Math.random() < scoreRate;

        if (isScoreItem) {
            const target = pool.targetItem;
            const mythicRarity = config.rarity.find(r => r.id === 'mythic');
            const newItem = {
                ...target,
                uid: Math.random().toString(36).substr(2, 9),
                poolName: pool.name,
                rarity: mythicRarity,
                isScoreItem: true
            };

            setModalContent({
                title: t("传说降临！"),
                item: newItem,
                message: t("获得了稀有的主线道具！"),
                type: 'resource',
                actualItem: newItem
            });

        } else {
            const currentStageConfig = config.stages[score];
            const allowedCount = currentStageConfig ? currentStageConfig.allowedPoolCount : config.pools.length;
            const validPools = config.pools.slice(0, allowedCount);

            const randomPool = validPools[Math.floor(Math.random() * validPools.length)];

            const poolSize = currentStageConfig ? currentStageConfig.poolSize : (config.pools[0]?.items.length || 4);
            const validItems = randomPool.items.slice(0, poolSize);
            const randomItem = validItems[Math.floor(Math.random() * validItems.length)];

            const currentStageId = config.stages[score]?.id;

            let targetRarityId = 'common';
            if (currentStageId === 1) targetRarityId = 'uncommon';
            else if (currentStageId === 2) targetRarityId = 'rare';
            else if (currentStageId >= 3) targetRarityId = 'epic';

            const rarity = config.rarity.find(r => r.id === targetRarityId) || config.rarity[0];

            const newItem = {
                ...randomItem,
                uid: Math.random().toString(36).substr(2, 9),
                poolName: randomPool.name,
                rarity: rarity
            };

            setModalContent({
                title: rarity.id === 'legendary' ? t("金色传说！") : (rarity.id === 'epic' ? t("史诗物品") : t("意外收获")),
                item: newItem,
                message: t("来自主线池的意外收获"),
                type: 'normal',
                actualItem: newItem
            });
        }
    };

    const handleNormalDraw = (pool) => {
        setDrawCount(prev => prev + 1);

        let itemsToProcess = [];

        if (pool.affixKey === 'fragmented') {
            for (let i = 0; i < 3; i++) {
                const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
                itemsToProcess.push(createItem(pool, tpl, 'fragmented'));
            }
        } else {
            const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
            const newItem = createItem(pool, tpl, pool.affixKey);
            itemsToProcess.push(newItem);
        }

        if (skillState.nextDrawExtraItem) {
            const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
            const extraItem = createItem(pool, tpl, pool.affixKey);
            itemsToProcess.push(extraItem);
        }

        const newSkillState = { ...skillState };
        newSkillState.nextDrawExtraItem = false;
        newSkillState.nextDrawGuaranteedRare = false;

        let allCommon = true;
        itemsToProcess.forEach(item => {
            if (item.rarity.id !== 'common') allCommon = false;
        });

        if (allCommon) {
            newSkillState.consecutiveCommons += 1;
        } else {
            newSkillState.consecutiveCommons = 0;
        }

        if (hasSkill('consolation_prize') && newSkillState.consecutiveCommons >= 5) {
            newSkillState.nextDrawGuaranteedRare = true;
            newSkillState.consecutiveCommons = 0;
            showToast("【安慰奖】触发：下一次必定稀有！", "info");
        }

        setSkillState(newSkillState);

        // Apply Entropy (Time passes on draw)
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

        handleIncomingItems(itemsToProcess, decayedInventory);

        refreshPools(true);
    };

    const handleDraw = (pool) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0) return;

        // Use pool cost (from affix config)
        let finalCost = pool.cost || config.patience.drawCost;

        if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
            finalCost = Math.max(0, finalCost - 1);
        }

        // Check gold affordability
        if (gold < finalCost) {
            showToast("金币不足！", "error");
            return;
        }

        if (pool.affixKey === 'trade_in') {
            setGold(prev => prev - finalCost);
            setSelectionMode({ type: 'trade_in', pool });
            return;
        }
        if (pool.affixKey === 'precise') {
            setGold(prev => prev - finalCost);

            const candidates = [];
            let itemIndices = pool.items.map((_, i) => i);

            for (let i = 0; i < 2; i++) {
                if (itemIndices.length === 0) itemIndices = pool.items.map((_, i) => i);
                const randArrIdx = Math.floor(Math.random() * itemIndices.length);
                const actualItemIdx = itemIndices[randArrIdx];
                itemIndices.splice(randArrIdx, 1);
                const tpl = pool.items[actualItemIdx];
                candidates.push(createItem(pool, tpl, pool.affixKey));
            }
            setSelectionMode({ type: 'precise', pool, items: candidates });
            return;
        }
        if (pool.affixKey === 'targeted') {
            setGold(prev => prev - finalCost);
            // "有的放矢" 应呈现该池子的全部原始物品，不受当前阶段 poolSize 限制
            const originalPool = config.pools.find(p => p.id === (pool.originalId || pool.id));
            const allItems = originalPool ? originalPool.items : pool.items;
            setSelectionMode({ type: 'targeted', pool, items: allItems, cost: finalCost });
            return;
        }

        setGold(prev => prev - finalCost);
        handleNormalDraw(pool);
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
        refreshPools(true);
        setModalContent(null);
    };

    const handleSelectionSelect = (selectedItem) => {
        const { type, pool } = selectionMode;

        // Fix: Apply Entropy when confirming a selection (Time passes)
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

        if (type === 'precise') {
            setDrawCount(prev => prev + 1);
            handleIncomingItems([selectedItem], decayedInventory);
            refreshPools(true);
            setSelectionMode(null);
        } else if (type === 'targeted') {
            const newItem = createItem(pool, selectedItem, pool.affixKey);
            setDrawCount(prev => prev + 1);
            handleIncomingItems([newItem], decayedInventory);
            refreshPools(true);
            setSelectionMode(null);
        }
    };

    const handleSelectionCancel = () => {
        if (selectionMode?.type === 'targeted') {
            // 退回金币
            const refundCost = selectionMode.cost || config.patience.drawCost;
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else if (selectionMode?.type === 'trade_in') {
            // 退回金币
            const pool = selectionMode.pool;
            let refundCost = pool.cost || config.patience.drawCost;
            if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
                refundCost = Math.max(0, refundCost - 1);
            }
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else if (selectionMode?.type === 'precise') {
            // 退回金币
            const pool = selectionMode.pool;
            let refundCost = pool.cost || config.patience.drawCost;
            if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
                refundCost = Math.max(0, refundCost - 1);
            }
            setGold(prev => prev + refundCost);
            setSelectionMode(null);
        } else {
            setSelectionMode(null);
        }
    }

    const handleSlotClick = (index) => {
        if (selectionMode?.type === 'trade_in') {
            const consumedItem = inventory[index];
            if (!consumedItem) return;

            if (consumedItem.isScoreItem) {
                showToast("主线道具无法用于以旧换新！", "error");
                return;
            }

            const pool = selectionMode.pool;

            // Apply Entropy (Time passes)
            const decayedInv = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

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

            setDrawCount(prev => prev + 1);
            handleIncomingItems([newItem], decayedInv);
            refreshPools(true);
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
                newInventory[index] = upgradedItem;
                setInventory(newInventory);
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
                const newInventory = inventory.filter(i => i && i.name !== targetName);
                // Calculate refund for cleared items
                const clearedItems = inventory.filter(i => i && i.name === targetName);
                const recycleValue = clearedItems.reduce((acc, i) => acc + (i.rarity.recycleValue || 0), 0);
                if (recycleValue > 0) setGold(prev => prev + recycleValue);

                const itemToAdd = { ...pendingItem };
                delete itemToAdd.isOverload;
                newInventory.push(itemToAdd);

                setInventory(newInventory); // No entropy applied on overload resolution

                setPendingItem(null);
                // setDrawCount? Maybe not, strictly. But it changes state.
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

            const newInventory = [...inventory];
            newInventory[index] = pendingItem;
            newInventory[index] = pendingItem; // Duplicated line in original, removing one.
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
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode) return;
        if (config.patience?.enabled !== false && patience < config.global.refreshCost) return;
        if (!currentStageConfig.mechanics.refresh) {
            showToast("当前时代尚未解锁订单刷新技术！", "error");
            return;
        }

        const newOrders = Array(currentStageConfig.orderSlots).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig));

        // 应用槽位升级
        const { orders: upgradedOrders, updatedUpgrades, hasChanges } = applySlotUpgrades(newOrders);
        setOrders(upgradedOrders);
        if (hasChanges) setUpgradedOrderItems(updatedUpgrades);
    };

    const handleRefreshSingleOrder = (index) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode) return;

        if (!currentStageConfig.mechanics.refresh) {
            showToast("当前时代尚未解锁订单刷新技术！", "error");
            return;
        }

        const currentOrder = orders[index];
        if (currentOrder.remainingRefreshes <= 0) return;

        const newOrder = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);

        let newRefreshes = currentOrder.remainingRefreshes - 1;
        if (hasSkill('time_freeze') && Math.random() < 0.20) {
            newRefreshes = currentOrder.remainingRefreshes;
            showToast("【时间冻结】触发：刷新次数未消耗！");
        }
        newOrder.remainingRefreshes = newRefreshes;

        const newOrders = [...orders];
        newOrders[index] = newOrder;

        // 应用槽位升级 - 仅针对新生成的订单
        const { orders: upgradedOrders, updatedUpgrades, hasChanges } = applySlotUpgrades(newOrders, [index]);
        setOrders(upgradedOrders);
        if (hasChanges) setUpgradedOrderItems(updatedUpgrades);
    };

    const handleOrderClick = (orderIndex) => {
        const order = orderIndex === 999 ? emergencyOrder : orders[orderIndex];
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
            showToast("库存中没有满足该订单条件的物品", "error");
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

            requirements.forEach(req => {
                // Find if any CURRENTLY selected item matches this req (that isn't already "used" for another req in this loop)
                // This is complex to do perfectly in one pass, let's just use the logic from before but better.

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
                showToast("库存中没有满足该订单条件的物品", "info");
            }
        }
    };

    const handleConfirmSubmission = () => {
        if (satisfiableOrders.length === 0) {
            showToast("请至少完成一个任务才能提交！", "error");
            return;
        }

        let gainedPatience = 0;
        let gainedScore = 0;
        const newOrders = [...orders];
        const completedIndices = [];

        // 追踪完成的订单类型
        let completedEmergencyOrder = false;
        let completedScoreCount = 0;

        const nextSkillState = { ...skillState };

        satisfiableOrders.forEach(({ index, finalPatienceReward, finalScoreReward, reqCount, requirements, isScoreOrder }) => {
            gainedPatience += finalPatienceReward;
            gainedScore += finalScoreReward;

            if (hasSkill('big_order_expert') && reqCount === 4) {
                showToast("【大订单专家】触发：+5耐心值");
            }

            if (hasSkill('hard_order_expert')) {
                const hasHardReq = requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) {
                    showToast("【困难订单专家】触发：+10耐心值");
                }
            }

            if (hasSkill('auto_restock')) nextSkillState.nextDrawExtraItem = true;
            if (hasSkill('turn_fortune')) nextSkillState.nextDrawGuaranteedRare = true;

            // 追踪订单类型
            if (index === 999) {
                completedEmergencyOrder = true;
            }

            // 积分订单的奖励通常更高，这里将其视为所有非限时订单都能获得积分
            if (isScoreOrder) completedScoreCount++;

            completedIndices.push(index);
        });

        setSkillState(nextSkillState);

        setPatience(prev => prev + gainedPatience);
        setScore(prev => prev + gainedScore);

        // 只有手动“撤离”会提升难度，因此这里删除了完成订单时的难度提升逻辑

        // 完成积分订单后，降低限时订单难度
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
                            showToast(`积分订单达成，撤离需求难度降低至 ${newDiff}！`, "success");
                        }
                        return newDiff;
                    });
                }
            }
        }

        completedIndices.forEach(idx => {
            if (idx === 999) {
                // 限时订单完成：标记为已完成，但不立即刷新
                // 等倒计时结束后再刷新
                setEmergencyOrderCompleted(true);
            } else {
                newOrders[idx] = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            }
        });

        // 应用槽位升级 - 仅针对新生成的订单
        const { orders: upgradedOrders, updatedUpgrades, hasChanges } = applySlotUpgrades(newOrders, completedIndices);
        setOrders(upgradedOrders);
        if (hasChanges) setUpgradedOrderItems(updatedUpgrades);

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
            if (extraGold > 0) showToast(`【炼金术】触发：获得 ${extraGold} 金币！`, 'info');
        }

        setGold(prev => prev + baseValue + extraGold);

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
            setSelectedSlot(null);
        }
    };

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
        showToast("背包已整理", "success");
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

    // Evacuate: Trigger timeout effect and reset gold
    const handleEvacuate = () => {
        if (!emergencyOrder) return;

        // 只在限时订单未完成时减少生命值
        if (!emergencyOrderCompleted) {
            const healthConfig = config.emergency?.health;
            if (healthConfig?.enabled) {
                const decreaseAmount = healthConfig.decreaseOnTimeout || 1;
                const newHealth = Math.max(0, health - decreaseAmount);
                setHealth(newHealth);
                showToast(`撤离！生命值 -${decreaseAmount}（${newHealth}/${healthConfig.maxHealth}）`, "warning");
            }
        }

        // 刷新限时订单（难度提升）
        const difficultyConfig = config.emergency?.difficulty;
        const increaseOnTimeout = difficultyConfig?.increaseOnNewOrder || 1;
        const maxDifficulty = difficultyConfig?.maxDifficulty || 10;
        const newDifficulty = Math.min(maxDifficulty, emergencyDifficulty + increaseOnTimeout);

        setEmergencyDifficulty(newDifficulty);

        const deadline = config.emergency?.deadline || 15;
        const newEmergencyOrder = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, newDifficulty);
        newEmergencyOrder.isEmergency = true;
        newEmergencyOrder.deadline = deadline;
        newEmergencyOrder.maxDeadline = deadline;
        newEmergencyOrder.difficulty = newDifficulty;
        setEmergencyOrder(newEmergencyOrder);
        setEmergencyOrderCompleted(false);

        // 重置金币到初始值
        const initialGold = config.global?.initialGold || 30;
        setGold(initialGold);
        showToast(`撤离成功！金币已重置为 ${initialGold}`, "info");
    };

    // Patience Check: Game Over when patience <= 0
    // Also check Emergency Deadline and Health
    useEffect(() => {
        if (!modalContent) {
            if (config.patience?.enabled !== false && patience <= 0) {
                setModalContent({
                    title: t("游戏结束"),
                    item: { name: t('耐心耗尽'), icon: '💔', rarity: { color: 'bg-red-500', name: 'GAME OVER', starColor: 'text-white' } },
                    message: t("你的耐心值已耗尽！"),
                    type: 'game_over',
                    score: drawCount
                });
            } else if (config.emergency?.health?.enabled && health <= 0) {
                setModalContent({
                    title: t("游戏结束"),
                    item: { name: t('生命耗尽'), icon: '💀', rarity: { color: 'bg-red-500', name: 'GAME OVER', starColor: 'text-white' } },
                    message: t("你的生命值已归零！"),
                    type: 'game_over',
                    score: score // 使用积分作为最终得分
                });
            } else if (emergencyOrder && emergencyOrder.deadline <= 0) {
                // 倒计时结束
                if (emergencyOrderCompleted) {
                    // 订单已完成，刷新订单
                    const deadline = config.emergency?.deadline || 15;
                    const newDifficulty = emergencyDifficulty; // 完成时已经调整过难度了

                    const newEmergencyOrder = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, newDifficulty);
                    newEmergencyOrder.isEmergency = true;
                    newEmergencyOrder.deadline = deadline;
                    newEmergencyOrder.maxDeadline = deadline;
                    newEmergencyOrder.difficulty = newDifficulty;
                    setEmergencyOrder(newEmergencyOrder);
                    setEmergencyOrderCompleted(false); // 重置完成标记
                } else {
                    // 订单超时：扣除生命值并刷新订单
                    const healthConfig = config.emergency?.health;
                    if (healthConfig?.enabled) {
                        const decreaseAmount = healthConfig.decreaseOnTimeout || 1;
                        const newHealth = Math.max(0, health - decreaseAmount);
                        setHealth(newHealth);
                        showToast(`${t("撤离需求超时！")}${t("生命值")} -${decreaseAmount}（${newHealth}/${healthConfig.maxHealth}）`, "error");

                        const newDifficulty = emergencyDifficulty;

                        const deadline = config.emergency?.deadline || 15;
                        const newEmergencyOrder = generateOrder(allNormalItems, config, hasSkill, currentStageConfig, true, newDifficulty);
                        newEmergencyOrder.isEmergency = true;
                        newEmergencyOrder.deadline = deadline;
                        newEmergencyOrder.maxDeadline = deadline;
                        newEmergencyOrder.difficulty = newDifficulty;
                        setEmergencyOrder(newEmergencyOrder);
                    } else {
                        // 如果未启用急躁值系统，则直接游戏结束
                        setModalContent({
                            title: t("游戏结束"),
                            item: { name: t('撤离需求超时'), icon: '⏰', rarity: { color: 'bg-red-500', name: 'GAME OVER', starColor: 'text-white' } },
                            message: t("未能在规定时间内完成撤离需求！"),
                            type: 'game_over',
                            score: drawCount
                        });
                    }
                }
            }
        }
    }, [patience, modalContent, score, config, emergencyOrder, emergencyOrderCompleted, health, emergencyDifficulty, allNormalItems, hasSkill, currentStageConfig]);

    return {
        state: {
            gold,
            patience,
            patienceStage,
            emergencyOrder,
            emergencyOrderCompleted,
            health,
            emergencyDifficulty,
            score,
            upgradedOrderItems,
            currentStageConfig,
            maxInventorySize,
            drawCount,
            activePools,
            orders,
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
            selectedItemNames
        },
        actions: {
            showToast,
            hideToast,
            triggerSkillSelection,
            handleSkillSelect,
            handleSkillReplace,
            handleDraw,
            handleCloseModal,
            handleSelectionSelect,
            handleSelectionCancel,
            handleSlotClick,
            handleDiscardNew,
            handleRefreshAllOrders,
            handleRefreshSingleOrder,
            handleOrderClick,
            handleConfirmSubmission,
            handleConfirmRecycle,
            toggleSubmitMode,
            toggleRecycleMode,
            handleSortInventory,
            handlePoolHover,
            handlePoolLeave,
            handleEvacuate,
            refreshPools,
            addInventoryItem
        },
        helpers: {
            hasSkill
        }
    };
};
