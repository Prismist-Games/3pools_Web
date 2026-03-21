import { useState, useEffect, useMemo } from 'react';
import {
    getAllNormalItems,
    rollRarity,
    getNextRarity,
    getRandomAffix,
    getRandomItems
} from '../utils/helpers';
import { SKILL_DEFINITIONS, TOOL_ITEMS } from '../data/constants';
import { useLanguage } from '../contexts/LanguageContext';
import { generateMilestone } from '../utils/gridGenerator.js';
import { TASK_GOLD_REWARD } from '../data/gridConstants.js';
import { generateItemMap, generateFrames, getFrameCoverage } from '../utils/spatialPoolHelpers.js';

export const useGameLogic = (config, initialSkills = [], onReset, initialScore = 0) => {
    const { t } = useLanguage();
    const [score, setScore] = useState(initialScore);

    const currentStageConfig = config.stages[0]; // Always use stage 0 (no stage progression)
    const maxInventorySize = currentStageConfig.inventorySize;

    // Gold System
    const [gold, setGold] = useState(config.global?.initialGold || 30);

    const [drawCount, setDrawCount] = useState(0);

    const [itemMap, setItemMap] = useState(() => generateItemMap());
    const [availableFrames, setAvailableFrames] = useState(() => generateFrames());
    const [selectedFrameIndex, setSelectedFrameIndex] = useState(null);
    const activePools = []; // deprecated, kept for compatibility during migration

    // Milestone grid system
    const [milestone, setMilestone] = useState(null);
    const [milestoneNumber, setMilestoneNumber] = useState(1);

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

    const [modalContent, setModalContent] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null);

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

    // Initialize milestone when null (game start or after evacuation)
    useEffect(() => {
        if (!milestone && allNormalItems.length > 0) {
            const newMilestone = generateMilestone(
                allNormalItems,
                config.rarity,
                milestoneNumber
            );
            setMilestone(newMilestone);
        }
    }, [milestone, allNormalItems]);

    const applyEntropy = (inv) => {
        if (!currentStageConfig.mechanics.entropy) return inv;
        return inv.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        });
    };

    const refreshPools = (tick = false) => {
        setAvailableFrames(generateFrames());
        setSelectedFrameIndex(null);
        if (tick && currentStageConfig.mechanics.entropy) {
            setInventory(prev => prev.map(item => {
                if (!item || item.decay === undefined) return item;
                return { ...item, decay: item.decay - 1 };
            }));
        }
    };

    useEffect(() => {
        refreshPools(false);
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

    // Cell matching: for each unfilled cell, find inventory items that can fill it
    const cellMatches = useMemo(() => {
        if (!milestone) return {};
        const matches = {};
        milestone.cells.forEach((cell) => {
            if (cell.filledItem) return;
            const matchingItems = inventory
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) =>
                    item &&
                    item.name === cell.itemName &&
                    config.rarity.findIndex(r => r.id === item.rarity.id) >=
                    config.rarity.findIndex(r => r.id === cell.requiredRarity)
                );
            if (matchingItems.length > 0) {
                matches[cell.id] = matchingItems.map(m => m.idx);
            }
        });
        return matches;
    }, [milestone, inventory, config.rarity]);

    const fillableCellIds = useMemo(() => Object.keys(cellMatches), [cellMatches]);

    // Which pools have items needed by unfilled cells (for pool highlighting)
    const relevantPoolIds = useMemo(() => {
        if (!milestone) return new Set();
        return new Set(
            milestone.cells
                .filter(c => !c.filledItem)
                .map(c => c.poolId)
        );
    }, [milestone]);

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

    const createItem = (pool, itemTemplate, affixKey = null) => {
        const rarity = rollRarity(config, affixKey, gold, hasSkill, skillState, currentStageConfig);
        return {
            ...itemTemplate,
            uid: Math.random().toString(36).substr(2, 9),
            poolName: pool?.name || itemTemplate.poolName,
            rarity: rarity,
            sterile: affixKey === 'hardened',
            decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 40) : undefined
        };

    };


    const handleIncomingItems = (newItems, overrideInventory = null) => {
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

        // 星辉祝福辅助：创建物品后立即提升品质，确保每个物品（包括稀碎的3个）都被提升
        const withEnhancement = (item) => {
            if (!skillState.nextDrawEnhanced) return item;
            const nextRarity = getNextRarity(item.rarity.id, config);
            return nextRarity ? { ...item, rarity: nextRarity } : item;
        };

        if (pool.affixKey === 'fragmented') {
            for (let i = 0; i < 3; i++) {
                const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
                // 稀碎一次出3个，星辉祝福只提升第一个
                itemsToProcess.push(i === 0 ? withEnhancement(createItem(pool, tpl, 'fragmented')) : createItem(pool, tpl, 'fragmented'));
            }
        } else {
            const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
            itemsToProcess.push(withEnhancement(createItem(pool, tpl, pool.affixKey)));
        }

        if (skillState.nextDrawExtraItem) {
            const tpl = pool.items[Math.floor(Math.random() * pool.items.length)];
            itemsToProcess.push(withEnhancement(createItem(pool, tpl, pool.affixKey)));
        }

        const newSkillState = { ...skillState };
        newSkillState.nextDrawExtraItem = false;
        newSkillState.nextDrawGuaranteedRare = false;
        newSkillState.nextDrawEnhanced = false;

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
            showToast(t("【安慰奖】触发：下一次必定稀有！"), "info");
        }

        setSkillState(newSkillState);

        // Apply Entropy (Time passes on draw)
        const decayedInventory = currentStageConfig.mechanics.entropy ? applyEntropy(inventory) : [...inventory];

        handleIncomingItems(tryDropToolItem(itemsToProcess), decayedInventory);

        refreshPools(true);
    };

    // 工具道具掉落已禁用
    const tryDropToolItem = (items) => items;

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

    const handleMapPlace = (anchorRow, anchorCol) => {
        if (selectedFrameIndex === null) return;

        const frame = availableFrames[selectedFrameIndex];
        if (!frame) return;

        const coverage = getFrameCoverage(frame.shape, anchorRow, anchorCol, itemMap);
        if (!coverage) return; // invalid placement (out of bounds)

        const coveredItems = coverage.map(c => c.item);

        // Construct a virtual pool that the existing handleDraw can process
        const virtualPool = {
            name: 'spatial',
            items: coveredItems,
            affixKey: frame.qualityEffect.id,
            affix: frame.qualityEffect,
            cost: frame.cost,
            originalId: 'spatial',
            id: 'spatial',
        };

        // Pass to existing draw pipeline — all skill logic, entropy,
        // enhancement, trade-in, precise, gold checks are handled automatically
        handleDraw(virtualPool);
    };

    const handleDraw = (pool) => {
        if (pendingItem || isSubmitMode || isRecycleMode || selectionMode || pendingQueue.length > 0 || isEvacuationMode) return;

        // Use pool cost (from affix config)
        let finalCost = pool.cost || 2;

        if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
            finalCost = Math.max(0, finalCost - 1);
        }

        // Check gold affordability
        if (gold < finalCost) {
            showToast(t("金币不足！"), "error");
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

        // 星辉祝福：提升品质1级
        const applyEnhancement = (item) => {
            if (!skillState.nextDrawEnhanced) return item;
            const nextRarity = getNextRarity(item.rarity.id, config);
            return nextRarity ? { ...item, rarity: nextRarity } : item;
        };

        if (type === 'precise') {
            setDrawCount(prev => prev + 1);
            const enhancedItem = applyEnhancement(selectedItem);
            handleIncomingItems(tryDropToolItem([enhancedItem]), decayedInventory);
            refreshPools(true);
            setSelectionMode(null);
            if (skillState.nextDrawEnhanced) setSkillState(prev => ({ ...prev, nextDrawEnhanced: false }));
        } else if (type === 'targeted') {
            const newItem = createItem(pool, selectedItem, pool.affixKey);
            const enhancedItem = applyEnhancement(newItem);
            setDrawCount(prev => prev + 1);
            handleIncomingItems(tryDropToolItem([enhancedItem]), decayedInventory);
            refreshPools(true);
            setSelectionMode(null);
            if (skillState.nextDrawEnhanced) setSkillState(prev => ({ ...prev, nextDrawEnhanced: false }));
        }
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

    const handleSlotClick = (index) => {
        const clickedItem = inventory[index];

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
                showToast(`${t("万象棱镜")}：${t(clickedItem.name)} → ${t(newTpl.name)}`, 'success');
            }
            setToolSelectionMode(null);
            return;
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
            refreshPools(true);
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
                setPendingItem(null);
                return;
            }

            if (pendingItem.isOverload) {
                // CRASH FIX: Ensure targetItem exists (it might be null if clicking empty slot in some edge case)
                if (!targetItem) {
                    return;
                }

                const targetName = targetItem.name;
                const clearedItems = inventory.filter(i => i && i.name === targetName);
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

    const handleFillCell = (cellId) => {
        if (!milestone) return;

        const cellIndex = milestone.cells.findIndex(c => c.id === cellId);
        const cell = milestone.cells[cellIndex];
        if (!cell || cell.filledItem) return;

        const matchingIndices = cellMatches[cellId];
        if (!matchingIndices || matchingIndices.length === 0) return;

        // Use the first matching item (lowest index)
        const invIdx = matchingIndices[0];
        const item = inventory[invIdx];

        // Fill the cell
        const updatedCells = milestone.cells.map((c, i) =>
            i === cellIndex ? { ...c, filledItem: item } : c
        );

        // Check task completions
        const updatedTasks = milestone.tasks.map(task => {
            if (task.isCompleted) return task;
            const allFilled = task.cellIndices.every(idx => updatedCells[idx].filledItem !== null);
            return allFilled ? { ...task, isCompleted: true } : task;
        });

        // Calculate rewards for newly completed tasks
        const newlyCompleted = updatedTasks.filter(
            (task, idx) => task.isCompleted && !milestone.tasks[idx].isCompleted
        );

        let scoreGain = 0;
        let goldGain = 0;
        let triggerEvacuation = false;

        for (const task of newlyCompleted) {
            const taskScore = task.cellIndices.reduce(
                (sum, idx) => sum + updatedCells[idx].scoreReward, 0
            );
            scoreGain += Math.ceil(taskScore);

            if (task.cellIndices.some(idx => updatedCells[idx].hasEvacuation)) {
                triggerEvacuation = true;
            }
        }

        // Remove consumed item from inventory
        const newInventory = [...inventory];
        newInventory[invIdx] = null;

        // Apply state updates
        setMilestone({
            ...milestone,
            cells: updatedCells,
            tasks: updatedTasks,
        });
        setInventory(newInventory);
        if (scoreGain > 0) setScore(prev => prev + scoreGain);
        if (goldGain > 0) setGold(prev => prev + goldGain);

        if (newlyCompleted.length > 0) {
            showToast(
                `${t('任务完成')}! +${scoreGain} ${t('积分')} +${goldGain} ${t('金币')}`,
                'epic'
            );
        }

        if (triggerEvacuation) {
            setTimeout(() => {
                setModalContent({
                    type: 'evacuation_triggered',
                    title: '撤离触发',
                    score: score + scoreGain,
                });
            }, 800);
        }
    };

    const handleEvacuationContinue = () => {
        setGold(config.global?.initialGold || currentStageConfig.initialGold);
        setMilestoneNumber(prev => prev + 1);
        setMilestone(null); // triggers re-generation via useEffect
        setModalContent(null);
        // Clear inventory for new milestone
        setInventory([]);
        setPendingItem(null);
        setPendingQueue([]);
        setSelectedSlot(null);
        setSelectedIndices([]);
        setIsSubmitMode(false);
        setIsEvacuationMode(false);
        setItemMap(generateItemMap());
        setAvailableFrames(generateFrames());
        setSelectedFrameIndex(null);
    };

    const handleEvacuationExtract = () => {
        setModalContent({
            type: 'victory',
            score: score,
            title: t('提取成功'),
            message: t('你带着战利品成功离开了！')
        });
    };


    return {
        state: {
            gold,
            score,
            currentStageConfig,
            maxInventorySize,
            drawCount,
            activePools,
            itemMap,
            availableFrames,
            selectedFrameIndex,
            milestone,
            milestoneNumber,
            cellMatches,
            fillableCellIds,
            relevantPoolIds,
            inventory,
            pendingItem, pendingQueue,
            selectedSlot,
            hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
            setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
            isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
            modalContent, selectionMode,
            skills, skillSelectionCandidates,
            toast,
            totalRecycleValue,
            selectedItemNames,
            skillState,
            toolSelectionMode
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
            handleFillCell,
            handleEvacuationContinue,
            handleEvacuationExtract,
            handleConfirmRecycle,
            toggleSubmitMode,
            toggleRecycleMode,
            handleSortInventory,
            handlePoolHover,
            handlePoolLeave,
            refreshPools,
            addInventoryItem,
            handleToolItemUse,
            handleCancelToolSelection,
            handleFrameSelect: (index) => setSelectedFrameIndex(index),
            handleMapPlace,
        },
        helpers: {
            hasSkill
        }
    };
};
