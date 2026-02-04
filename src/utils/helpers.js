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
    // P0: Use orderRarityWeights if available (specific to orders), otherwise fallback to general rarityWeights
    // For emergency orders, use emergency-specific weights if available
    let weights;
    if (isEmergency && config.emergency) {
        // 优先使用难度相关的品质权重
        const difficultyWeights = config.emergency.difficultyRarityWeights?.[emergencyDifficulty];
        if (difficultyWeights) {
            weights = difficultyWeights;
        } else if (config.emergency.rarityWeights) {
            weights = config.emergency.rarityWeights;
        } else if (config.emergency.baseRarityWeights) {
            weights = config.emergency.baseRarityWeights;
        } else {
            weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
        }
    } else {
        weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
    }

    const r = Math.random();

    // 累积概率计算
    let accumulated = 0;

    // 强制按照 weights 权重 Roll，如果阶段没有配置该稀有度权重，则不会 Roll 出来
    if (weights.common > 0) {
        accumulated += weights.common;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'common');
    }
    if (weights.uncommon > 0) {
        accumulated += weights.uncommon;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'uncommon');
    }
    if (weights.rare > 0) {
        accumulated += weights.rare;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'rare');
    }
    if (weights.epic > 0) {
        accumulated += weights.epic;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'epic');
    }
    if (weights.legendary > 0) {
        accumulated += weights.legendary;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'legendary');
    }
    if (weights.mythic > 0) {
        accumulated += weights.mythic;
        if (r <= accumulated) return config.rarity.find(r => r.id === 'mythic');
    }

    // Fallback to common
    return config.rarity.find(r => r.id === 'common');
};

export const generateOrder = (allNormalItems, config, hasSkill = () => false, currentStageConfig, isEmergency = false, emergencyDifficulty = 1) => {
    // P0: Use orderCountWeights for configurable requirement counts (2, 3, or 4)
    let count = 3;

    // Emergency orders use their own config if available
    if (isEmergency && config.emergency) {
        const emergencyConfig = config.emergency;

        // 使用难度配置来决定需求数量
        const difficultyWeights = emergencyConfig.difficultyReqCountWeights?.[emergencyDifficulty];
        if (difficultyWeights) {
            // 根据难度等级的权重分布随机选择需求数量
            const entries = Object.entries(difficultyWeights);
            const totalWeight = entries.reduce((sum, [_, weight]) => sum + weight, 0);
            let random = Math.random() * totalWeight;

            for (const [reqCount, weight] of entries) {
                random -= weight;
                if (random <= 0) {
                    count = parseInt(reqCount);
                    break;
                }
            }
        } else if (emergencyConfig.reqCountMin !== undefined && emergencyConfig.reqCountMax !== undefined) {
            const min = emergencyConfig.reqCountMin || 1;
            const max = emergencyConfig.reqCountMax || 4;
            count = Math.floor(Math.random() * (max - min + 1)) + min;
        } else if (emergencyConfig.reqCount !== undefined) {
            count = emergencyConfig.reqCount;
        }
    } else if (currentStageConfig.orderCountWeights) {
        const weights = currentStageConfig.orderCountWeights;
        const w2 = weights[2] || 0;
        const w3 = weights[3] || 0;
        const w4 = weights[4] || 0;
        const totalWeight = w2 + w3 + w4;

        // Safety check to avoid infinite loops or errors if weights are 0
        if (totalWeight <= 0) {
            count = 3;
        } else {
            let random = Math.random() * totalWeight;
            if (random < w2) count = 2;
            else if (random < w2 + w3) count = 3;
            else count = 4;
        }
    } else {
        // Fallback legacy logic
        const { orderCountRange } = currentStageConfig;
        count = Math.floor(Math.random() * (orderCountRange[1] - orderCountRange[0] + 1)) + orderCountRange[0];
    }

    // 技能【偷工减料】- does not affect emergency orders
    if (!isEmergency && hasSkill('cut_corners') && Math.random() < 0.20 && count > 1) {
        count -= 1;
    }

    const rawRequirements = getRandomItems(allNormalItems, count);

    // 检查是否有精确的难度需求配置
    const difficultyRequirements = isEmergency && config.emergency?.difficultyRequirements?.[emergencyDifficulty];

    let requirements;
    if (difficultyRequirements && difficultyRequirements.length > 0) {
        // 使用精确配置模式
        // 将配置的品质需求展开成数组
        const rarityList = [];
        difficultyRequirements.forEach(req => {
            const rarityObj = config.rarity.find(r => r.id === req.rarity);
            if (rarityObj) {
                for (let i = 0; i < req.count; i++) {
                    rarityList.push(rarityObj);
                }
            }
        });

        // 如果配置的品质数量不足，用普通品质补足
        while (rarityList.length < rawRequirements.length) {
            rarityList.push(config.rarity.find(r => r.id === 'common'));
        }

        // 如果配置的品质数量过多，截断
        if (rarityList.length > rawRequirements.length) {
            rarityList.length = rawRequirements.length;
        }

        // 随机打乱品质列表，避免每次都是相同顺序
        const shuffledRarities = rarityList.sort(() => Math.random() - 0.5);

        requirements = rawRequirements.map((item, index) => ({
            ...item,
            requiredRarity: shuffledRarities[index]
        }));
    } else {
        // 使用原有的随机模式
        requirements = rawRequirements.map(item => ({
            ...item,
            requiredRarity: rollRequirementRarity(config, currentStageConfig, isEmergency, emergencyDifficulty)
        }));
    }

    const totalReqBonus = requirements.reduce((sum, req) => sum + req.requiredRarity.bonus, 0);

    // Patience System: Base rewards for both patience and progress
    const defaultBaseReward = config.patience?.orderCompletionReward || 15;
    const baseRewards = currentStageConfig.baseRewards || { 2: defaultBaseReward, 3: defaultBaseReward, 4: defaultBaseReward };

    const rawBaseReward = baseRewards[count] || defaultBaseReward;

    // Fixed patience reward (no rarity multiplier)
    const basePatienceReward = rawBaseReward;

    // Base progress reward (calculated ONLY by sum of per-rarity weights)
    // Emergency orders DON'T give progress rewards
    let baseProgressReward = 0;

    if (!isEmergency) {
        const rarityWeights = config.progress?.rarityWeights || {};
        const offset = config.progress?.progressOffset || 0;

        // Formula: sum of weights of each required item's rarity + offset
        const totalRarityScore = requirements.reduce((sum, req) => {
            const rKey = req.requiredRarity?.id || 'common';
            return sum + (rarityWeights[rKey] || 0);
        }, 0);

        const calculatedProgress = Math.floor(totalRarityScore + offset);
        baseProgressReward = Math.max(1, Math.min(4, calculatedProgress));
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        requirements,
        basePatienceReward,
        baseProgressReward,
        remainingRefreshes: 2,
        isMainline: false
    };
};

// generateMainlineOrder removed - mainline orders are replaced by progress system


export const rollRarity = (config, affixKey = null, currentGold = 0, hasSkill = () => false, skillState = {}, currentStageConfig) => {
    const { rarity: rarityConfig } = config;
    const weights = currentStageConfig.rarityWeights;

    // 词缀处理优先于技能保底
    if (affixKey === 'hardened' || affixKey === 'purified') {
        if (weights.legendary > 0) {
            const r = Math.random();
            if (r < 0.67) return rarityConfig.find(r => r.id === 'rare');
            if (r < 0.97) return rarityConfig.find(r => r.id === 'epic');
            return rarityConfig.find(r => r.id === 'legendary');
        } else if (weights.epic > 0) {
            const r = Math.random();
            return r < 0.7 ? rarityConfig.find(r => r.id === 'rare') : rarityConfig.find(r => r.id === 'epic');
        } else if (weights.rare > 0) {
            return rarityConfig.find(r => r.id === 'rare');
        }
        return rarityConfig.find(r => r.id === 'uncommon'); // Fallback
    }

    if (affixKey === 'volatile') {
        const r = Math.random();
        // P3: Volatile always has a small chance (0.5%) for Legendary, regardless of global weights
        if (r < 0.995) return rarityConfig.find(r => r.id === 'common');
        return rarityConfig.find(r => r.id === 'legendary');
    }

    if (affixKey === 'fragmented') {
        return rarityConfig.find(r => r.id === 'common');
    }

    // 检查技能保底
    if (skillState.nextDrawGuaranteedRare) {
        const allowedRarities = rarityConfig.filter(r => weights[r.id] > 0);
        const highRarities = allowedRarities.filter(r => ['rare', 'epic', 'legendary'].includes(r.id));

        if (highRarities.length > 0) {
            return highRarities[Math.floor(Math.random() * highRarities.length)];
        } else {
            return allowedRarities[allowedRarities.length - 1];
        }
    }

    // Calcluate Total Weight for Normalization
    const orderedRarityIds = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    let totalWeight = 0;

    // First pass: sum weights
    for (const rid of orderedRarityIds) {
        let w = weights[rid] || 0;
        if (rid === 'legendary' && hasSkill('lucky_7') && (currentGold % 10 === 7)) {
            w *= 2;
        }
        totalWeight += w;
    }

    // Roll
    const r = Math.random() * totalWeight;
    let accumulated = 0;

    for (const rid of orderedRarityIds) {
        let w = weights[rid] || 0;
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

    return rarityConfig[0];
};

export const getNextRarity = (currentRarityId, config) => {
    const { rarity: rarityConfig } = config;
    const currentIndex = rarityConfig.findIndex(r => r.id === currentRarityId);
    if (currentIndex !== -1 && currentIndex < rarityConfig.length - 1) {
        return rarityConfig[currentIndex + 1];
    }
    return null;
};
