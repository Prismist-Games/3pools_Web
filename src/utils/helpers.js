// helpers.js - utility functions for game logic

import { TRAIT_DEFINITIONS } from '../data/constants';

export const getAllNormalItems = (pools, currentStageConfig) => {
    // 修正：限制池子类型（allowedPoolCount）和池内物品数量（poolSize）
    const allowedPools = pools.slice(0, currentStageConfig.allowedPoolCount);

    return allowedPools.flatMap(pool =>
        pool.items.slice(0, currentStageConfig.poolSize).map(item => ({ ...item, poolId: pool.id, poolName: pool.name }))
    );
};

export const getRandomAffix = (affixes) => {
    const totalWeight = affixes.reduce((sum, a) => sum + (a.weight || 0), 0);
    let r = Math.random() * totalWeight;
    for (const affix of affixes) {
        r -= affix.weight || 0;
        if (r <= 0) {
            return affix;
        }
    }
    return affixes[0];
};

export const getRandomItems = (array, count) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// --- 价值系统工具函数 ---

// 获取单个物品的基础价值（由品质决定）
export const getBaseValue = (rarityId, config) => {
    const baseValues = config.valueSystem?.baseValues || {};
    return baseValues[rarityId] || 0;
};

// 根据总价值和组件数量，查阈值表得到显示品质
export const getCompositeRarity = (totalValue, componentCount, config) => {
    const thresholds = config.valueSystem?.compositeQualityThresholds || {};
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    // 找到匹配的组件数量阈值表，如果没有精确匹配则使用最大的
    let breakpoints = thresholds[componentCount] || thresholds['default'];
    if (!breakpoints) {
        const keys = Object.keys(thresholds).map(Number).filter(k => !isNaN(k)).sort((a, b) => a - b);
        const maxKey = keys[keys.length - 1];
        breakpoints = thresholds[maxKey] || [0, 2, 4, 7, 12, 20];
    }

    // 从高到低查找匹配的品质
    let resultId = 'common';
    for (let i = breakpoints.length - 1; i >= 0; i--) {
        if (totalValue >= breakpoints[i]) {
            resultId = rarityOrder[i] || 'common';
            break;
        }
    }

    return config.rarity.find(r => r.id === resultId) || config.rarity[0];
};

// 计算物品的价值（单个或复合，支持特性光环）
export const getItemValue = (item, config, inventoryItems = []) => {
    if (!item) return 0;

    const baseValue = getBaseValue(item.rarity?.id, config);
    const permanentBonus = item.permanentBonus || 0;

    let additiveAura = 0;
    let multiplicativeAura = 1;

    for (const traitId of (item.traits || [])) {
        const trait = TRAIT_DEFINITIONS[traitId];
        if (!trait || trait.effectType !== 'aura') continue;

        if (trait.auraType === 'additive') {
            additiveAura += trait.calcAdditive(item, inventoryItems);
        } else if (trait.auraType === 'multiplicative') {
            multiplicativeAura *= trait.calcMultiplicative(item, inventoryItems);
        }
    }

    return Math.max(0, Math.floor(
        (baseValue + permanentBonus + additiveAura) * multiplicativeAura
    ));
};

// 随机抽取一个特性 ID
export const rollTrait = (config) => {
    const weights = config.traitSystem?.traitWeights || { categoryPool: 0.4, categoryPoolSplit: 0.5, otherTraits: 0.6 };

    const poolTraits = ['infuse_fruit', 'infuse_medicine', 'infuse_electronics', 'infuse_kitchenware', 'infuse_stationery'];
    const nameTraits = ['infuse_watermelon', 'infuse_lemon', 'infuse_mango', 'infuse_apple', 'infuse_powder_drink', 'infuse_eye_drops', 'infuse_syringe', 'infuse_capsule', 'infuse_pencil', 'infuse_eraser', 'infuse_stapler', 'infuse_notebook', 'infuse_frying_pan', 'infuse_kitchen_knife', 'infuse_cutting_board', 'infuse_soup_spoon', 'infuse_phone', 'infuse_earphones', 'infuse_ac', 'infuse_computer'];
    const otherTraits = ['flat_value_2', 'multiplier_1_5', 'virgin_double', 'same_pool_synergy', 'decay_infuse', 'infuse_uncommon_plus', 'infuse_rare_plus', 'infuse_same_name', 'infuse_different_pool', 'infuse_common_free', 'infuse_order_match', 'material_full_value', 'material_infuse_count', 'material_inventory_boost', 'material_refund', 'fusion_value_3', 'extra_infuse_3', 'extra_trait_1', 'recycle_double', 'infuse_burst'];

    const r = Math.random();

    if (r < weights.categoryPool) {
        // 40% — pool/name category
        const r2 = Math.random();
        if (r2 < weights.categoryPoolSplit) {
            // Pool traits (equal weight)
            return poolTraits[Math.floor(Math.random() * poolTraits.length)];
        } else {
            // Name traits (equal weight)
            return nameTraits[Math.floor(Math.random() * nameTraits.length)];
        }
    } else {
        // 60% — other traits (equal weight)
        return otherTraits[Math.floor(Math.random() * otherTraits.length)];
    }
};

// 随机生成订单的 requiredValue
export const rollRequiredValue = (config, isEmergency = false, emergencyDifficulty = 1) => {
    // 撤离订单：从难度映射表取固定值
    if (isEmergency && config.emergency?.difficultyRequiredValues?.[emergencyDifficulty] !== undefined) {
        return config.emergency.difficultyRequiredValues[emergencyDifficulty];
    }

    // 普通订单：按权重随机
    const valueWeights = config.progress?.orderValueWeights || { 0: 0.4, 1: 0.35, 2: 0.2, 3: 0.05 };
    const entries = Object.entries(valueWeights).map(([v, w]) => [Number(v), w]);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

    const r = Math.random() * totalWeight;
    let accumulated = 0;
    for (const [value, weight] of entries) {
        accumulated += weight;
        if (r <= accumulated) return value;
    }
    return 0;
};

export const rollRequirementRarity = (config, currentStageConfig, isEmergency = false, emergencyDifficulty = 1) => {
    // Check fixed difficulty requirements first (exact rarity per difficulty level)
    if (isEmergency && config.emergency?.difficultyRequirements?.[emergencyDifficulty]) {
        const fixedRarityId = config.emergency.difficultyRequirements[emergencyDifficulty];
        const found = config.rarity.find(r => r.id === fixedRarityId);
        if (found) return found;
    }

    let weights;
    if (isEmergency && config.emergency) {
        const difficultyWeights = config.emergency.difficultyRarityWeights?.[emergencyDifficulty];
        if (difficultyWeights) {
            weights = difficultyWeights;
        } else if (config.emergency.rarityWeights) {
            weights = config.emergency.rarityWeights;
        } else {
            weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
        }
    } else {
        weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
    }

    const r = Math.random();
    let accumulated = 0;

    if (weights.common > 0) { accumulated += weights.common; if (r <= accumulated) return config.rarity.find(r => r.id === 'common'); }
    if (weights.uncommon > 0) { accumulated += weights.uncommon; if (r <= accumulated) return config.rarity.find(r => r.id === 'uncommon'); }
    if (weights.rare > 0) { accumulated += weights.rare; if (r <= accumulated) return config.rarity.find(r => r.id === 'rare'); }
    if (weights.epic > 0) { accumulated += weights.epic; if (r <= accumulated) return config.rarity.find(r => r.id === 'epic'); }
    if (weights.legendary > 0) { accumulated += weights.legendary; if (r <= accumulated) return config.rarity.find(r => r.id === 'legendary'); }
    if (weights.mythic > 0) { accumulated += weights.mythic; if (r <= accumulated) return config.rarity.find(r => r.id === 'mythic'); }

    return config.rarity.find(r => r.id === 'common');
};

export const generateOrder = (allNormalItems, config, hasSkill = () => false, currentStageConfig, isEmergency = false, emergencyDifficulty = 1) => {
    const nameCount = isEmergency ? (config.emergency?.emergencyNameCount || 3) : 3;

    // Pick random unique items (ensuring unique names)
    const shuffled = [...allNormalItems].sort(() => 0.5 - Math.random());
    const seen = new Set();
    const selectedItems = [];
    for (const item of shuffled) {
        if (!seen.has(item.name)) {
            seen.add(item.name);
            selectedItems.push(item);
            if (selectedItems.length >= nameCount) break;
        }
    }

    const requiredNames = selectedItems.map(item => item.name);
    const requiredIcons = selectedItems.map(item => item.icon);
    const requiredPoolIds = selectedItems.map(item => item.poolId);

    // 生成 requiredValue 替代 requiredRarity
    const requiredValue = rollRequiredValue(config, isEmergency, emergencyDifficulty);

    const rewardMultiplier = config.valueSystem?.rewardMultiplier || 1;
    let baseScoreReward = 0;
    if (!isEmergency) {
        baseScoreReward = Math.max(1, Math.ceil(requiredValue * rewardMultiplier));
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        requiredNames,
        requiredIcons,
        requiredPoolIds,
        requiredValue,
        baseScoreReward,
        isScoreOrder: !isEmergency,
        isEmergency: isEmergency || false,
        difficulty: isEmergency ? emergencyDifficulty : undefined,
        // Backwards compat: keep requirements array for any code that reads it
        requirements: requiredNames.map((name, i) => ({
            name,
            icon: requiredIcons[i],
            poolId: requiredPoolIds[i],
            poolName: (() => {
                const pool = config.pools?.find(p => p.id === requiredPoolIds[i]);
                return pool ? pool.name : requiredPoolIds[i];
            })(),
        })),
    };
};

// generateMainlineOrder removed - mainline orders are replaced by progress system


export const rollRarity = (config, affixKey = null, currentGold = 0, hasSkill = () => false, skillState = {}, currentStageConfig) => {
    const { rarity: rarityConfig, affixes } = config;
    const stageWeights = currentStageConfig.rarityWeights;

    // --- 1. 确定逻辑约束（Logic: 哪些品质是允许产出的） ---
    const orderedRarityIds = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    let allowedRarityIds = [...orderedRarityIds];

    if (affixKey === 'volatile') {
        allowedRarityIds = ['common', 'legendary']; // 波动逻辑：只有普通或传说
    } else if (affixKey === 'fragmented') {
        allowedRarityIds = ['common']; // 稀碎逻辑：只有普通
    } else if (affixKey === 'hardened' || affixKey === 'purified') {
        allowedRarityIds = ['rare', 'epic', 'legendary', 'mythic']; // 提纯/硬化逻辑：保底稀有+
    }

    // --- 2. 提取数值驱动（Values: 从配置中获取权重） ---
    const finalWeights = {};
    let customWeights = null;

    // 尝试获取词缀自定义权重
    if (affixKey && affixes) {
        const affix = affixes.find(a => a.id === affixKey);
        if (affix && affix.rarityWeights) {
            customWeights = affix.rarityWeights;
        }
    }

    // 应用逻辑过滤后的权重
    allowedRarityIds.forEach(rid => {
        // 优先使用词缀权重，没有则使用阶段权重
        const rawWeight = customWeights ? (customWeights[rid] || 0) : (stageWeights[rid] || 0);
        finalWeights[rid] = rawWeight;
    });

    // --- 3. 计算总权重并处理技能修正 ---
    let totalWeight = 0;
    allowedRarityIds.forEach(rid => {
        let w = finalWeights[rid];
        if (rid === 'legendary' && hasSkill('lucky_7') && (currentGold % 10 === 7)) {
            w *= 2;
        }
        totalWeight += w;
    });

    // 容错处理：如果当前配置在该逻辑约束下总权重为 0，则执行强制保底
    if (totalWeight <= 0) {
        if (affixKey === 'hardened' || affixKey === 'purified') return rarityConfig.find(r => r.id === 'rare');
        if (affixKey === 'volatile' || affixKey === 'fragmented') return rarityConfig.find(r => r.id === 'common');
        return rarityConfig.find(r => r.id === 'common');
    }

    // --- 4. 抽取逻辑 ---
    // 技能保底判断（如果是保底抽，且保底品质在允许范围内）
    if (skillState.nextDrawGuaranteedRare) {
        const highTierIds = allowedRarityIds.filter(id => ['rare', 'epic', 'legendary', 'mythic'].includes(id));
        if (highTierIds.length > 0) {
            const pickId = highTierIds[Math.floor(Math.random() * highTierIds.length)];
            return rarityConfig.find(r => r.id === pickId);
        }
    }

    const r = Math.random() * totalWeight;
    let accumulated = 0;

    for (const rid of allowedRarityIds) {
        let w = finalWeights[rid];
        if (rid === 'legendary' && hasSkill('lucky_7') && (currentGold % 10 === 7)) {
            w *= 2;
        }

        if (w > 0) {
            accumulated += w;
            if (r <= accumulated) {
                return rarityConfig.find(item => item.id === rid);
            }
        }
    }

    return rarityConfig[0]; // 极端情况回退
};

export const getNextRarity = (currentRarityId, config) => {
    const { rarity: rarityConfig } = config;
    const currentIndex = rarityConfig.findIndex(r => r.id === currentRarityId);
    if (currentIndex !== -1 && currentIndex < rarityConfig.length - 1) {
        return rarityConfig[currentIndex + 1];
    }
    return null;
};
