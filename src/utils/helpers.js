// helpers.js - utility functions for game logic

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

export const rollRequirementRarity = (config, currentStageConfig, isEmergency = false, emergencyDifficulty = 1) => {
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
    const nameCount = isEmergency ? 4 : 3;

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

    const requiredRarity = rollRequirementRarity(config, currentStageConfig, isEmergency, emergencyDifficulty);

    let baseScoreReward = 0;
    if (!isEmergency) {
        const rarityWeights = config.progress?.rarityWeights || {};
        const offset = config.progress?.progressOffset || 0;
        const rarityScore = rarityWeights[requiredRarity.id] || 0;
        baseScoreReward = Math.max(1, Math.floor(rarityScore + offset));
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        requiredNames,
        requiredIcons,
        requiredPoolIds,
        requiredRarity,
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
