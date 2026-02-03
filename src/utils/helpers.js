import { MAINLINE_ITEMS } from '../data/constants.js';

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

export const rollRequirementRarity = (config, currentStageConfig) => {
    // P0: Use orderRarityWeights if available (specific to orders), otherwise fallback to general rarityWeights
    const weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
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

export const generateOrder = (allNormalItems, config, hasSkill = () => false, currentStageConfig) => {
    // P0: Use orderCountWeights for configurable requirement counts (2, 3, or 4)
    let count = 3;
    if (currentStageConfig.orderCountWeights) {
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

    // 技能【偷工减料】
    if (hasSkill('cut_corners') && Math.random() < 0.20 && count > 1) {
        count -= 1;
    }

    const rawRequirements = getRandomItems(allNormalItems, count);

    const requirements = rawRequirements.map(item => ({
        ...item,
        requiredRarity: rollRequirementRarity(config, currentStageConfig)
    }));

    const totalReqBonus = requirements.reduce((sum, req) => sum + req.requiredRarity.bonus, 0);

    // P2 Refactor: Always Gold, Configurable Base
    const rewardType = 'gold';

    // Default fallback if config is missing (compatibility)
    const defaultBaseRewards = { 2: 7, 3: 10, 4: 15 };
    const baseRewards = currentStageConfig.baseRewards || defaultBaseRewards;

    const rawBaseReward = baseRewards[count] || 15;

    const baseReward = Math.ceil(rawBaseReward * (1 + totalReqBonus));

    return {
        id: Math.random().toString(36).substr(2, 9),
        requirements,
        baseReward,
        rewardType,
        remainingRefreshes: 2,
        isMainline: false
    };
};

export const generateMainlineOrder = (level, config, currentStageConfig) => {
    // P3 Update: Configurable Mainline Requirements
    const count = currentStageConfig.mainlineReqCount || 2;
    const rarityId = currentStageConfig.mainlineReqRarity || 'epic';
    const targetRarity = config.rarity.find(r => r.id === rarityId) || config.rarity.find(r => r.id === 'epic');

    const pools = config.pools.slice(0, currentStageConfig.allowedPoolCount);
    // Select 'count' random pool items (can be same pool or different, let's keep it diverse if possible, but distinct pools logic was nice)
    // If count > allowedPoolCount, we must reuse.
    // Let's just pick 'count' random items from 'allowedPools' entirely? OR pick pools then items?
    // Previous logic: Pick 2 distinct pools.
    // New logic: Pick 'count' random items from 'getAllNormalItems' but that might be too broad.
    // Let's stick to "Pick N random pools (can contain duplicates if needed), then 1 item from each".

    // Actually, picking N distinct pools is better for variety if count <= pools.length.

    const requirements = [];
    // We need 'count' items from DIFFERENT pools.
    // Shuffle available pools and pick from each one sequentially
    const shuffledPools = [...pools].sort(() => 0.5 - Math.random());

    for (let i = 0; i < count; i++) {
        // Pick pool at index i (wrap around if count > pools.length, but normally count <= pools.length)
        const poolIndex = i % shuffledPools.length;
        const randomPool = shuffledPools[poolIndex];
        const item = getRandomItems(randomPool.items, 1)[0];

        requirements.push({
            ...item,
            poolId: randomPool.id,
            poolName: randomPool.name,
            requiredRarity: targetRarity
        });
    }

    return {
        id: `mainline_order_${Math.random().toString(36).substr(2, 9)}`,
        requirements,
        baseReward: 0,
        rewardType: 'none',
        remainingRefreshes: 0,
        isMainline: true,
        level: level + 1,
        name: `主线订单`
    };
};

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
