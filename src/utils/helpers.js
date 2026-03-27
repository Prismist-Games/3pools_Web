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
    // 检查是否有精确的难度需求配置（优先级最高）
    const difficultyRequirements = isEmergency && config.emergency?.difficultyRequirements?.[emergencyDifficulty];

    // Helper: Get unique pool items
    const getUniquePoolItems = (sourceItems, num) => {
        const poolGroups = {};
        sourceItems.forEach(item => {
            if (!poolGroups[item.poolId]) poolGroups[item.poolId] = [];
            poolGroups[item.poolId].push(item);
        });

        const availablePoolIds = Object.keys(poolGroups);
        const selectedPoolIds = getRandomItems(availablePoolIds, Math.min(num, availablePoolIds.length));

        return selectedPoolIds.map(pid => {
            const itemsInPool = poolGroups[pid];
            return itemsInPool[Math.floor(Math.random() * itemsInPool.length)];
        });
    };

    let count;
    let requirements;

    if (difficultyRequirements && difficultyRequirements.length > 0) {
        // 使用精确配置模式 - 数量由配置的总物品数决定
        count = difficultyRequirements.reduce((sum, req) => sum + req.count, 0);

        // 如果是紧急订单，限制数量为可用池子数量，保证种类唯一
        if (isEmergency) {
            const availablePoolCount = new Set(allNormalItems.map(i => i.poolId)).size;
            if (count > availablePoolCount) {
                count = availablePoolCount;
                // 需调整 difficultyRequirements 以匹配新数量 (简单截断)
                // 这里稍微复杂，简单起见我们只调整生成的 rawRequirements 数量
                // 但 rarityList 也需要调整
            }
        }

        // 随机选择物品
        let rawRequirements;
        if (isEmergency) {
            rawRequirements = getUniquePoolItems(allNormalItems, count);
        } else {
            rawRequirements = getRandomItems(allNormalItems, count);
        }

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

        // 截断 rarityList 以匹配实际 count (如果因唯一性被缩减)
        if (rarityList.length > count) {
            rarityList.length = count;
        }

        // 随机打乱品质列表，避免每次都是相同顺序
        const shuffledRarities = rarityList.sort(() => Math.random() - 0.5);

        requirements = rawRequirements.map((item, index) => ({
            ...item,
            requiredRarity: shuffledRarities[index] || config.rarity.find(r => r.id === 'common')
        }));
    } else {
        // 使用随机模式
        // P0: Use orderCountWeights for configurable requirement counts (2, 3, or 4)
        count = 3; // Default value

        // Emergency orders use their own config if available
        if (isEmergency && config.emergency) {
            const emergencyConfig = config.emergency;

            // 使用难度配置来决定需求数量（如果有）
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

        // Enforce unique pools for emergency orders
        if (isEmergency) {
            const availablePoolCount = new Set(allNormalItems.map(i => i.poolId)).size;
            if (count > availablePoolCount) count = availablePoolCount;
        }

        let rawRequirements;
        if (isEmergency) {
            rawRequirements = getUniquePoolItems(allNormalItems, count);
        } else {
            rawRequirements = getRandomItems(allNormalItems, count);
        }

        // 使用随机品质生成
        requirements = rawRequirements.map(item => ({
            ...item,
            requiredRarity: rollRequirementRarity(config, currentStageConfig, isEmergency, emergencyDifficulty)
        }));
    }

    const totalReqBonus = requirements.reduce((sum, req) => sum + req.requiredRarity.bonus, 0);

    const baseRewards = currentStageConfig.baseRewards || { 2: 15, 3: 15, 4: 15 };
    const rawBaseReward = baseRewards[count] || 15;

    // Base score reward (calculated ONLY by sum of per-rarity weights)
    // Emergency orders DON'T give score rewards
    let baseScoreReward = 0;

    if (!isEmergency) {
        const rarityWeights = config.progress?.rarityWeights || {};
        const offset = config.progress?.progressOffset || 0;

        // Formula: sum of weights of each required item's rarity + offset
        const totalRarityScore = requirements.reduce((sum, req) => {
            const rKey = req.requiredRarity?.id || 'common';
            return sum + (rarityWeights[rKey] || 0);
        }, 0);

        const calculatedScore = Math.floor(totalRarityScore + offset);
        baseScoreReward = Math.max(1, calculatedScore);
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        requirements,
        baseScoreReward,
        isScoreOrder: !isEmergency
    };
};

// generateMainlineOrder removed - mainline orders are replaced by progress system


export const rollRarity = (config, affixKey = null, hasSkill = () => false, skillState = {}, currentStageConfig) => {
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
        if (rid === 'legendary' && hasSkill('lucky_7')) {
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
        if (rid === 'legendary' && hasSkill('lucky_7')) {
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
