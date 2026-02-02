import { useState, useEffect, useMemo } from 'react';
import {
    getAllNormalItems,
    generateOrder,
    generateMainlineOrder,
    rollRarity,
    getNextRarity,
    getRandomAffix,
    getRandomItems
} from '../utils/helpers';
import { MAINLINE_ITEMS, SKILL_DEFINITIONS, RARITY_COIN_VALUE } from '../data/constants';

export const useGameLogic = (config, initialSkills = [], onReset, initialProgress = 0) => {
    const [gold, setGold] = useState(config.global.initialGold);
    const [tickets, setTickets] = useState(config.global.initialTickets);

    const [mainlineProgress, setMainlineProgress] = useState(initialProgress);

    const currentStageConfig = config.stages[mainlineProgress] || config.stages[config.stages.length - 1];
    const maxInventorySize = currentStageConfig.inventorySize;

    const [drawCount, setDrawCount] = useState(0);

    const [activePools, setActivePools] = useState([]);
    const [orders, setOrders] = useState([]);
    const [mainlineOrder, setMainlineOrder] = useState(null);

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

    // 支付方式选择状态
    const [paymentMode, setPaymentMode] = useState(null); // null | 'selecting' | 'item_select'
    const [pendingPoolForPayment, setPendingPoolForPayment] = useState(null);

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
        if (mainlineProgress < config.stages.length) {
            setMainlineOrder(generateMainlineOrder(mainlineProgress, config, currentStageConfig));
        } else {
            setMainlineOrder(null);
        }
    }, [mainlineProgress, config, currentStageConfig]);

    useEffect(() => {
        if (orders.length < currentStageConfig.orderSlots) {
            const needed = currentStageConfig.orderSlots - orders.length;
            const newOrders = [...orders, ...Array(needed).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig))];
            setOrders(newOrders);
        } else if (orders.length === 0) {
            setOrders(Array(currentStageConfig.orderSlots).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig)));
        }
    }, [config, allNormalItems, currentStageConfig.orderSlots, orders.length]);

    const generateActivePools = () => {
        const result = [];
        const usedAffixIds = new Set();

        let tempPools = config.pools.slice(0, currentStageConfig.allowedPoolCount);

        const mainlineChance = config.global.mainlineChance !== undefined ? config.global.mainlineChance : 0.5;
        const canSpawnMainline = false; // P2 Refactor: Mainline Pool Disabled

        let targetMainlineItem = null;

        if (canSpawnMainline) {
            const neededItems = MAINLINE_ITEMS;
            for (let i = mainlineProgress; i < neededItems.length; i++) {
                const itemDef = neededItems[i];
                const hasItemByName = inventory.some(inv => inv.name === itemDef.name);
                if (!hasItemByName) {
                    targetMainlineItem = itemDef;
                    break;
                }
            }
        }

        let slotTypes = ['normal', 'normal', 'normal'];
        if (targetMainlineItem) {
            slotTypes[0] = 'mainline';
        }

        slotTypes = slotTypes.sort(() => 0.5 - Math.random());

        for (let i = 0; i < 3; i++) {
            let selectedPool = null;
            const type = slotTypes[i];

            if (type === 'mainline' && targetMainlineItem) {
                selectedPool = {
                    id: `mainline_pool_${targetMainlineItem.id}`,
                    name: `${targetMainlineItem.name}池`,
                    type: 'mainline',
                    targetItem: targetMainlineItem,
                    weight: 0,
                    cost: 10,
                    currency: 'ticket',
                    icon: targetMainlineItem.icon,
                    color: 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-400',
                    items: []
                };
                targetMainlineItem = null;
            } else {
                if (tempPools.length > 0) {
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

                    selectedPool = JSON.parse(JSON.stringify(tempPools[selectedIndex]));
                    selectedPool.originalId = selectedPool.id;
                    // Stable ID to prevent flickering
                    selectedPool.id = selectedPool.originalId;

                    selectedPool.items = selectedPool.items.slice(0, currentStageConfig.poolSize);

                    tempPools.splice(selectedIndex, 1);
                }
            }

            if (selectedPool && selectedPool.type === 'normal') {
                if (currentStageConfig.mechanics.affixes) {
                    const availableAffixes = config.affixes.filter(a => !usedAffixIds.has(a.id));
                    const affixPool = availableAffixes.length > 0 ? availableAffixes : config.affixes;
                    const affix = getRandomAffix(affixPool);

                    selectedPool.affixKey = affix.id;
                    selectedPool.affix = affix;
                    selectedPool.cost = affix.cost;
                    usedAffixIds.add(affix.id);
                } else {
                    selectedPool.cost = currentStageConfig.fixedPrice !== null ? currentStageConfig.fixedPrice : 1;
                }

                // Stage 1 Volatility: Random cost 1-4
                if (currentStageConfig.mechanics.volatility) {
                    selectedPool.cost = Math.floor(Math.random() * 4) + 1;
                }
            }

            if (selectedPool) result.push(selectedPool);
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
    };

    useEffect(() => {
        refreshPools(false);
    }, [config, mainlineProgress]);

    const triggerSkillSelection = () => {
        const availableSkills = SKILL_DEFINITIONS.filter(s => {
            if (!config.enabledSkillIds.includes(s.id)) return false;
            if (skills.includes(s.id)) return false;

            if (s.id === 'vip_discount' && mainlineProgress < 2) return false;
            if (s.id === 'hard_order_expert' && mainlineProgress < 3) return false;
            if ((['cut_corners', 'time_freeze', 'negotiator'].includes(s.id)) && mainlineProgress < 3) return false;

            return true;
        });

        if (availableSkills.length === 0) {
            showToast("暂无更多可学习技能！");
            return;
        }

        const candidates = getRandomItems(availableSkills, Math.min(3, availableSkills.length));
        setSkillSelectionCandidates(candidates);
    };

    const handleSkillSelect = (skill) => {
        if (!skill) {
            setSkillSelectionCandidates(null);
            return;
        }
        if (skills.length < 3) {
            setSkills(prev => [...prev, skill.id]);
            setSkillSelectionCandidates(null);
            showToast(`获得了技能：${skill.name}`);
        }
    };

    const handleSkillReplace = (oldSkillId, newSkill) => {
        setSkills(prev => prev.map(id => id === oldSkillId ? newSkill.id : id));
        setSkillSelectionCandidates(null);
        showToast(`替换技能：${newSkill.name}`);
    };

    const maxRequirementRarityMap = useMemo(() => {
        const map = {};
        const allOrders = [...orders];
        if (mainlineOrder) allOrders.push(mainlineOrder);

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
    }, [orders, mainlineOrder]);

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

            let extraGold = 0;
            if (hasSkill('poverty_relief') && gold < 5 && order.rewardType === 'gold') {
                extraGold += 5; // Updated to +5
            }
            if (hasSkill('big_order_expert') && order.requirements.length === 4) {
                extraGold += 5; // New: Flat +5
            }
            if (hasSkill('hard_order_expert')) {
                const hasHardReq = order.requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) extraGold += 10; // New: Flat +10
            }

            // P0: extraGold is added AFTER the multiplier, making it a final flat bonus (unaffected by rarity/flush multipliers).
            // This matches the user requirement: "10点加成不会吃到稀有度的加成，变成最终加成".
            const finalReward = Math.ceil(order.baseReward * multiplier) + extraGold;
            return { index: idx, finalReward, rewardType: order.rewardType, isMainline: isMain, reqCount: order.requirements.length, requirements: order.requirements };
        };

        const results = [];
        orders.forEach((o, i) => {
            const res = checkOrder(o, i, false);
            if (res) results.push(res);
        });
        if (mainlineOrder) {
            const res = checkOrder(mainlineOrder, -1, true);
            if (res) results.push(res);
        }

        return results;
    }, [isSubmitMode, selectedIndices, inventory, orders, mainlineOrder, gold, skills]);

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

            let extraGold = 0;
            if (hasSkill('poverty_relief') && gold < 5 && order.rewardType === 'gold') {
                extraGold += 5; // Updated to +5
            }
            if (hasSkill('big_order_expert') && order.requirements.length === 4) {
                extraGold += 5; // New: Flat +5
            }
            if (hasSkill('hard_order_expert')) {
                const hasHardReq = order.requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) extraGold += 10; // New: Flat +10
            }

            const finalReward = Math.ceil(order.baseReward * multiplier) + extraGold;
            return { index: idx, finalReward, rewardType: order.rewardType, isMainline: isMain, reqCount: order.requirements.length, requirements: order.requirements };
        };

        const results = [];
        if (mainlineOrder) {
            const res = checkOrder(mainlineOrder, -1, true);
            if (res) results.push(res);
        }
        orders.forEach((order, idx) => {
            if (order) {
                const res = checkOrder(order, idx, false);
                if (res) results.push(res);
            }
        });
        return results;
    }, [inventory, orders, mainlineOrder, gold, skills]);

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
                    showToast("库存种类过载！请选择一种物品进行批量替换，或丢弃新物品。", "warning");
                }

                setPendingItem(nextItem);
                setSelectedSlot(null);
            }
        }
    }, [pendingItem, pendingQueue, inventory, maxInventorySize, currentStageConfig]);

    const createItem = (pool, itemTemplate, affixKey = null) => {
        const rarity = rollRarity(config, affixKey, gold, hasSkill, skillState, currentStageConfig);
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
                showToast("【谈判专家】触发：订单刷新次数+1");
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
                        showToast("库存种类过载！请选择一种物品进行批量替换，或丢弃新物品。", "warning");
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
                    showToast("背包已满！", "warning");
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

    const handleMainlineDraw = (pool) => {
        const mainlineRate = config.global.mainlineDropRate || 0.3;
        const isMainlineItem = Math.random() < mainlineRate;

        if (isMainlineItem) {
            const target = pool.targetItem;
            const mythicRarity = config.rarity.find(r => r.id === 'mythic');
            const newItem = {
                ...target,
                uid: Math.random().toString(36).substr(2, 9),
                poolName: pool.name,
                rarity: mythicRarity,
                isMainlineItem: true
            };

            setModalContent({
                title: "传说降临！",
                item: newItem,
                message: "获得了稀有的主线道具！",
                type: 'resource',
                actualItem: newItem
            });

        } else {
            const currentStageConfig = config.stages[mainlineProgress];
            const allowedCount = currentStageConfig ? currentStageConfig.allowedPoolCount : config.pools.length;
            const validPools = config.pools.slice(0, allowedCount);

            const randomPool = validPools[Math.floor(Math.random() * validPools.length)];

            const poolSize = currentStageConfig ? currentStageConfig.poolSize : 5;
            const validItems = randomPool.items.slice(0, poolSize);
            const randomItem = validItems[Math.floor(Math.random() * validItems.length)];

            const currentStageId = config.stages[mainlineProgress]?.id;

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
                title: rarity.id === 'legendary' ? "金色传说！" : (rarity.id === 'epic' ? "史诗物品" : "意外收获"),
                item: newItem,
                message: "来自主线池的意外收获",
                type: 'normal',
                actualItem: newItem
            });
        }
    };

    const handleNormalDraw = (pool, updatedInventory = null) => {
        setDrawCount(prev => prev + 1);

        let itemsToProcess = [];

        if (pool.affixKey === 'volatile') {
            // Volatile: Higher chance for legendary, but ONLY Common or Legendary
            // We'll override the rarity rolled by createItem essentially, or just roll cleanly here.
            // Let's modify properties after creation to be safe or pass a flag.
            // Simpler: Just force the rarity here.
            const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
            const newItem = createItem(pool, tpl, pool.affixKey);

            // Override Rarity Logic for Volatile
            // 10% Legendary, 90% Common (or config based). User said "Can drop Blue" -> Bug.
            const isLegendary = Math.random() < 0.1; // 10% chance
            const rarityId = isLegendary ? 'legendary' : 'common';
            newItem.rarity = config.rarity.find(r => r.id === rarityId);

            itemsToProcess.push(newItem);
        } else if (pool.affixKey === 'fragmented') {
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
        // 使用传入的 updatedInventory 或当前 inventory
        const baseInventory = updatedInventory || inventory;
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(baseInventory) : [...baseInventory];

        handleIncomingItems(itemsToProcess, decayedInventory);

        refreshPools();
    };

    const handleDraw = (pool) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0) return;

        let finalCost = pool.cost;

        if (pool.currency === 'gold' && hasSkill('calculated') && gold < 10) {
            finalCost = Math.max(1, finalCost - 2);
        }

        if (pool.currency === 'gold' && hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
            finalCost = Math.max(0, finalCost - 1);
        }

        if (pool.type === 'mainline') {
            if (tickets < finalCost) {
                showToast("奖券不足！", "error");
                return;
            }
            setTickets(prev => prev - finalCost);
            handleMainlineDraw(pool);
        } else {
            if (pool.affixKey === 'trade_in') {
                setSelectionMode({ type: 'trade_in', pool });
                return;
            }
            if (pool.affixKey === 'precise') {
                if (gold < finalCost) { showToast("金币不足！", "error"); return; }
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
                if (gold < finalCost) { showToast("金币不足！", "error"); return; }
                setGold(prev => prev - finalCost);
                setSelectionMode({ type: 'targeted', pool, items: pool.items, cost: finalCost });
                return;
            }
            if (gold < finalCost) {
                showToast("金币不足！", "error");
                return;
            }
            setGold(prev => prev - finalCost);
            handleNormalDraw(pool);
        }
    };

    // ===== 支付方式选择系统 =====

    // 点击奖池 -> 打开支付选择
    const handlePoolClick = (pool) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || paymentMode) return;

        // 计算最终价格
        let finalCost = pool.cost;
        if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
            finalCost = Math.max(0, finalCost - 1);
        }

        // 以旧换新词缀特殊处理：先付开启费
        if (pool.affixKey === 'trade_in') {
            setPendingPoolForPayment({ ...pool, cost: 1, originalPool: pool }); // 开启费1金币
        } else {
            setPendingPoolForPayment({ ...pool, cost: finalCost });
        }
        setPaymentMode('selecting');
    };

    // 用金币支付
    const handlePayWithGold = () => {
        if (!pendingPoolForPayment || paymentMode !== 'selecting') return;

        const pool = pendingPoolForPayment;
        const cost = pool.cost;

        if (gold < cost) {
            showToast("金币不足！", "error");
            return;
        }

        setGold(prev => prev - cost);

        // 清除支付状态
        setPaymentMode(null);
        setPendingPoolForPayment(null);

        // 执行抽奖逻辑
        executeDrawAfterPayment(pool.originalPool || pool);
    };

    // 进入道具选择模式
    const handleSelectItemPayment = () => {
        if (!pendingPoolForPayment || paymentMode !== 'selecting') return;
        setPaymentMode('item_select');
    };

    // 用道具支付
    const handlePayWithItem = (itemIndex) => {
        if (!pendingPoolForPayment || paymentMode !== 'item_select') return;

        const item = inventory[itemIndex];
        if (!item) return;

        const pool = pendingPoolForPayment;
        const requiredCost = pool.cost;
        const itemValue = RARITY_COIN_VALUE[item.rarity.id] || 1;

        // 检查道具是否满足最低品质要求
        if (itemValue < requiredCost) {
            showToast(`需要至少 ${requiredCost} 金币等值的道具！`, "error");
            return;
        }

        // 消耗道具（向下覆盖，无找零）
        const newInventory = [...inventory];
        newInventory[itemIndex] = null;
        setInventory(newInventory);

        // 清除支付状态
        setPaymentMode(null);
        setPendingPoolForPayment(null);

        // 执行抽奖逻辑（传递已更新的 inventory）
        executeDrawAfterPayment(pool.originalPool || pool, newInventory);
    };

    // 取消支付选择
    const handleCancelPayment = () => {
        setPaymentMode(null);
        setPendingPoolForPayment(null);
    };

    // 支付完成后执行抽奖
    const executeDrawAfterPayment = (pool, updatedInventory = null) => {
        // 以旧换新特殊处理
        if (pool.affixKey === 'trade_in') {
            setSelectionMode({ type: 'trade_in', pool });
            return;
        }
        // 精准词缀
        if (pool.affixKey === 'precise') {
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
        // 有的放矢词缀
        if (pool.affixKey === 'targeted') {
            setSelectionMode({ type: 'targeted', pool, items: pool.items });
            return;
        }
        // 普通抽奖
        handleNormalDraw(pool, updatedInventory);
    };

    const handleCloseModal = () => {
        if (modalContent?.type === 'stage_up') {
            setModalContent(null);

            // P2 Refactor: Stage Hard Reset
            // 1. Clear Inventory
            setInventory(Array(currentStageConfig.inventorySize).fill(null));

            // 2. Reset Orders (Set to empty, let useEffect regenerate)
            setOrders([]);

            // 3. Reset Gold
            setGold(currentStageConfig.initialGold || 0);

            // 4. Remove Tickets
            setTickets(0);

            triggerSkillSelection();
            return;
        }

        if (modalContent?.actualItem) {
            // Apply Entropy (Time passes)
            const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];
            handleIncomingItems([modalContent.actualItem], decayedInventory);
        }
        setDrawCount(prev => prev + 1);
        refreshPools(false);
        setModalContent(null);
    };

    const handleSelectionSelect = (selectedItem) => {
        const { type, pool } = selectionMode;

        // Fix: Apply Entropy when confirming a selection (Time passes)
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

        if (type === 'precise') {
            setDrawCount(prev => prev + 1);
            handleIncomingItems([selectedItem], decayedInventory);
            refreshPools();
            setSelectionMode(null);
        } else if (type === 'targeted') {
            const newItem = createItem(pool, selectedItem, pool.affixKey);
            setDrawCount(prev => prev + 1);
            handleIncomingItems([newItem], decayedInventory);
            refreshPools(false);
            setSelectionMode(null);
        }
    };

    const handleSelectionCancel = () => {
        if (selectionMode?.type === 'targeted') {
            setGold(prev => prev + selectionMode.cost);
            setSelectionMode(null);
        } else if (selectionMode?.type === 'trade_in') {
            setSelectionMode(null);
        }
    }

    const handleSlotClick = (index) => {
        if (selectionMode?.type === 'trade_in') {
            const consumedItem = inventory[index];
            if (!consumedItem) return;

            if (consumedItem.isMainlineItem) {
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
            refreshPools();
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

                if (!currentStageConfig.mechanics.synthesis) {
                    showToast("合成系统暂未解锁！", "error");
                    return;
                }

                const nextRarity = getNextRarity(targetItem.rarity.id, config);

                if (currentStageConfig.rarityWeights[nextRarity.id] <= 0 && nextRarity.id !== 'mythic') {
                    showToast(`受限于当前时代工艺，无法合成【${nextRarity.name}】物品！`, 'error');
                    return;
                }

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

                if (!currentStageConfig.mechanics.synthesis) {
                    showToast("合成系统暂未解锁！", "error");
                    setSelectedSlot(null);
                    return;
                }

                const nextRarity = getNextRarity(sourceItem.rarity.id, config);

                if (currentStageConfig.rarityWeights[nextRarity.id] <= 0) {
                    showToast(`受限于当前时代工艺，无法合成【${nextRarity.name}】物品！`, 'error');
                    setSelectedSlot(null);
                    return;
                }

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
        if (gold < config.global.refreshCost) return;
        if (!currentStageConfig.mechanics.refresh) {
            showToast("当前时代尚未解锁订单刷新技术！", "error");
            return;
        }

        setGold(prev => prev - config.global.refreshCost);
        setOrders(Array(currentStageConfig.orderSlots).fill(null).map(() => generateOrder(allNormalItems, config, hasSkill, currentStageConfig)));
        // Refreshing does not consume durability
        // setInventory(prev => applyEntropy(prev));
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
        setOrders(newOrders);
        // Refreshing does not consume durability
        // setInventory(prev => applyEntropy(prev));
    };

    const handleOrderClick = (orderIndex, isMainline = false) => {
        if (!isSubmitMode) return;

        const order = isMainline ? mainlineOrder : orders[orderIndex];
        if (!order) return;

        const newSelectedIndices = [...selectedIndices];
        const tempSelectedIndices = [...newSelectedIndices];
        const indicesToAdd = [];
        const requirements = [...order.requirements];

        for (const req of requirements) {
            const existingMatchIndexInSelected = tempSelectedIndices.findIndex(idx => {
                const item = inventory[idx];
                return item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus;
            });

            if (existingMatchIndexInSelected !== -1) {
                tempSelectedIndices.splice(existingMatchIndexInSelected, 1);
                continue;
            }

            const currentlyUsedIndices = new Set([...selectedIndices, ...indicesToAdd]);
            const candidates = inventory
                .map((item, idx) => ({ item, idx }))
                .filter(({ item, idx }) =>
                    item &&
                    !currentlyUsedIndices.has(idx) &&
                    item.name === req.name &&
                    item.rarity.bonus >= req.requiredRarity.bonus
                );

            candidates.sort((a, b) => b.item.rarity.bonus - a.item.rarity.bonus);

            if (candidates.length > 0) {
                const match = candidates[0];
                indicesToAdd.push(match.idx);
            }
        }

        if (indicesToAdd.length > 0) {
            setSelectedIndices([...selectedIndices, ...indicesToAdd]);
        }
    };

    const handleConfirmSubmission = () => {
        if (satisfiableOrders.length === 0) {
            showToast("请至少完成一个任务才能提交！", "error");
            return;
        }

        let gainedGold = 0;
        let gainedTickets = 0;
        const newOrders = [...orders];
        const completedIndices = [];
        let mainlineCompleted = false;

        const nextSkillState = { ...skillState };

        satisfiableOrders.forEach(({ index, finalReward, rewardType, isMainline, reqCount, requirements }) => {
            if (rewardType === 'gold') gainedGold += finalReward;
            if (rewardType === 'ticket') gainedTickets += finalReward;

            if (hasSkill('big_order_expert') && reqCount === 4) {
                // gainedGold += 15; // Refactored: Included in finalReward
                showToast("【大订单专家】触发：+5金币"); // Update message to +5
            }

            if (hasSkill('hard_order_expert')) {
                const hasHardReq = requirements.some(req => req.requiredRarity.id === 'epic' || req.requiredRarity.id === 'legendary');
                if (hasHardReq) {
                    // gainedGold += 20; // Refactored: Included in finalReward
                    showToast("【困难订单专家】触发：+10金币"); // Update message to +10
                }
            }

            if (hasSkill('auto_restock')) nextSkillState.nextDrawExtraItem = true;
            if (hasSkill('turn_fortune')) nextSkillState.nextDrawGuaranteedRare = true;

            if (isMainline) {
                mainlineCompleted = true;
            } else {
                completedIndices.push(index);
            }
        });

        setSkillState(nextSkillState);

        setGold(prev => prev + gainedGold);
        setTickets(prev => prev + gainedTickets);

        completedIndices.forEach(idx => {
            newOrders[idx] = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
        });
        setOrders(newOrders);

        if (mainlineCompleted) {
            const nextProgress = mainlineProgress + 1;
            setMainlineProgress(nextProgress);

            if (nextProgress >= 4) {
                setModalContent({
                    title: "恭喜通关！",
                    item: { name: '游戏胜利', icon: '🏆', rarity: { color: 'bg-yellow-500', name: 'VICTORY', starColor: 'text-yellow-200' } },
                    message: "你已经完成了所有主线挑战！",
                    type: 'victory',
                    score: drawCount
                });
            } else {
                const nextStage = config.stages[nextProgress];
                setModalContent({
                    type: 'stage_up',
                    title: `阶段解锁: ${nextStage.name}`,
                    desc: nextStage.desc,
                    unlocks: nextStage.unlocks,
                    item: { name: nextStage.name, icon: '🚀', rarity: { color: 'bg-blue-500', name: 'NEW STAGE', starColor: 'text-white' } }
                });
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
        let extraTickets = 0;

        if (hasSkill('alchemy')) {
            selectedIndices.forEach(idx => {
                const item = inventory[idx];
                if (item && item.rarity.bonus >= 0.2) {
                    if (Math.random() < 0.25) extraTickets += 5; // Updated: 25% chance, +5 Gold
                }
            });
            if (extraTickets > 0) showToast(`【炼金术】触发：获得 ${extraTickets} 金币！`, 'info');
        }

        setGold(prev => prev + baseValue + extraTickets);
        // setTickets(prev => prev + extraTickets); // Tickets removed

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
        if (pool.type !== 'mainline') {
            setHoveredPoolId(pool.originalId || pool.id);
            setHoveredPoolItemNames(pool.items.map(i => i.name));
        }
    };

    const handlePoolLeave = () => {
        setHoveredPoolId(null);
        setHoveredPoolItemNames([]);
    };

    return {
        state: {
            gold, tickets,
            mainlineProgress, currentStageConfig, maxInventorySize,
            drawCount,
            activePools,
            orders, mainlineOrder,
            inventory,
            pendingItem, pendingQueue,
            selectedSlot,
            hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
            setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
            isSubmitMode, isRecycleMode, selectedIndices,
            modalContent, selectionMode,
            paymentMode, pendingPoolForPayment,  // 支付方式选择状态
            skills, skillSelectionCandidates,
            toast,
            toast,
            satisfiableOrders, // P2 Fix: Return calculated memo, not empty array
            potentialSatisfiableOrders, // P2 Fix: Return preview memo
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
            refreshPools,
            // 支付方式选择函数
            handlePoolClick,
            handlePayWithGold,
            handleSelectItemPayment,
            handlePayWithItem,
            handleCancelPayment
        },
        helpers: {
            hasSkill
        }
    };
};
