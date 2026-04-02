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

// 从 ROOM_NEEDS 生成一个需求订单
export const generateRoomNeedOrder = (allNormalItems, config, roomNeeds, existingOrders = []) => {
    // Avoid duplicate needs
    const existingItemKeys = new Set(
        existingOrders.filter(Boolean).map(o => o.requirements.map(r => r.name).sort().join('+'))
    );
    const available = roomNeeds.filter(need => {
        const key = need.items.sort().join('+');
        return !existingItemKeys.has(key);
    });
    if (available.length === 0) return null;

    const need = available[Math.floor(Math.random() * available.length)];
    const commonRarity = config.rarity.find(r => r.id === 'common');

    const requirements = need.items.map(itemName => {
        const found = allNormalItems.find(i => i.name === itemName);
        if (!found) return { name: itemName, icon: '❓', poolId: 'unknown', poolName: '未知', requiredRarity: commonRarity };
        return {
            ...found,
            requiredRarity: commonRarity,
        };
    });

    return {
        id: Math.random().toString(36).substr(2, 9),
        requirements,
        baseScoreReward: 0,
        isScoreOrder: false,
        homeDesc: need.desc,
        showDesc: need.showDesc,
        roomId: need.room,
        func: need.func,
        effect: need.effect,
    };
};

// 根据订单需求物品生成描述（现实 + 节目两种）— 用于旧的随机订单系统
const generateOrderDescription = (requirements) => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // === 现实描述：基于具体物品名，结合房间用途 ===
    const ITEM_FLAVOR = {
        // 水果 → 花园/厨房
        "西瓜": ["种一棵西瓜藤，夏天就有西瓜吃了", "花园里刚好有块空地"],
        "柠檬": ["柠檬树适合种在窗边", "泡一杯柠檬水也不错"],
        "芒果": ["要是能种出芒果就好了", "热带水果，但也许能活"],
        "苹果": ["苹果树需要时间，但值得等", "一颗苹果，一棵树的开始"],
        // 药物 → 厕所/卧室
        "冲剂": ["感觉有点着凉了", "备着总比没有好"],
        "滴眼液": ["看太久东西眼睛干涩", "需要缓解一下眼睛"],
        "注射器": ["以防万一要用到", "药箱里应该有这个"],
        "胶囊": ["每天按时吃药", "药快吃完了"],
        // 文具 → 花园/客厅
        "铅笔": ["想画一画花园的样子", "记录每天发生的事"],
        "橡皮": ["画错了可以擦掉重来", "要是生活也能这样就好了"],
        "订书机": ["把这些天的笔记装订起来", "纸太多了，需要整理"],
        "笔记本": ["开始写日记吧", "空白的本子，像空白的日子"],
        // 厨具 → 厨房
        "平底锅": ["想做一顿像样的饭", "有锅才能做饭"],
        "菜刀": ["切菜需要一把好刀", "厨房怎么能没有刀"],
        "砧板": ["切东西总得有个案板", "准备一个干净的砧板"],
        "汤勺": ["煮汤的时候用得上", "喝碗热汤暖暖身子"],
        // 电器 → 客厅
        "手机": ["好久没和外面联系了", "看看有没有信号"],
        "耳机": ["想安静地听点什么", "戴上耳机，世界就远了"],
        "空调": ["房间里太闷了", "要是有空调就好了"],
        "电脑": ["需要查一些东西", "有电脑日子会好过很多"],
    };

    const GENERIC_HOME = ["这个用得上", "家里正好缺这个", "有比没有强"];

    // 取第一个需求物品的风味文字
    const firstItem = requirements[0];
    const homeDesc = ITEM_FLAVOR[firstItem?.name]
        ? pick(ITEM_FLAVOR[firstItem.name])
        : pick(GENERIC_HOME);

    // === 节目描述：通用兑奖风格 ===
    const reqCount = requirements.length;
    const hasRare = requirements.some(r => ['rare', 'epic', 'legendary'].includes(r.requiredRarity?.id));

    const SHOW_BY_COUNT = {
        2: ["轻松兑奖！只需2个token！", "小奖快兑！凑齐2个就能换！", "2token速兑，手快有手慢无！"],
        3: ["经典兑奖！集齐3个token赢大奖！", "3token组合奖，奖品升级！", "三连兑！观众最爱的经典环节！"],
        4: ["超级大奖！4个token兑换豪华奖品！", "终极挑战！集齐4个token赢走大奖！", "4token豪华兑换，今天的重头戏！"],
    };
    const SHOW_RARE = ["高品质token兑换！这可是稀有大奖！", "品质挑战！拿出您最好的token来兑换！", "尊贵奖品专区！需要高品质token哦！"];

    const showDesc = hasRare ? pick(SHOW_RARE) : pick(SHOW_BY_COUNT[reqCount] || SHOW_BY_COUNT[3]);

    return { homeDesc, showDesc };
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
        isScoreOrder: !isEmergency,
        ...(!isEmergency ? generateOrderDescription(requirements) : { homeDesc: null, showDesc: null }),
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
