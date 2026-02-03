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

/**
 * 生成品质要求列表（新解耦系统）
 * 根据物品数量和配置的概率，生成独立的品质要求
 * @returns {Array} 品质要求数组，如 [{ rarityId: 'rare', minRarity: {...}, count: 1 }, ...]
 */
export const generateQualityRequirements = (itemCount, config, currentStageConfig) => {
    const weights = currentStageConfig.orderRarityWeights || currentStageConfig.rarityWeights;
    
    // 为每个物品槽位 roll 一个品质
    const rolledRarities = [];
    for (let i = 0; i < itemCount; i++) {
        const rarity = rollRequirementRarity(config, currentStageConfig);
        rolledRarities.push(rarity);
    }
    
    // 统计各品质数量（不包括普通，因为普通不需要额外要求）
    const rarityCounts = {};
    const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon']; // 从高到低
    
    rolledRarities.forEach(rarity => {
        if (rarity.id !== 'common') {
            rarityCounts[rarity.id] = (rarityCounts[rarity.id] || 0) + 1;
        }
    });
    
    // 转换为品质要求列表
    const qualityRequirements = [];
    rarityOrder.forEach(rarityId => {
        if (rarityCounts[rarityId] > 0) {
            const rarityObj = config.rarity.find(r => r.id === rarityId);
            qualityRequirements.push({
                rarityId: rarityId,
                minRarity: rarityObj,
                count: rarityCounts[rarityId]
            });
        }
    });
    
    return qualityRequirements;
};

/**
 * 计算品质要求对应的奖励加成
 * @param {Array} qualityRequirements 品质要求数组
 * @returns {number} 总加成值
 */
export const calculateQualityBonus = (qualityRequirements) => {
    return qualityRequirements.reduce((sum, req) => {
        return sum + (req.minRarity.bonus * req.count);
    }, 0);
};

/**
 * 检查物品列表是否满足品质要求（最优匹配算法）
 * 贪心策略：高品质要求优先使用高品质物品
 * @param {Array} items 物品数组（包含 rarity 信息）
 * @param {Array} qualityRequirements 品质要求数组
 * @returns {Object} { satisfied: boolean, matchResult: Array, totalBonus: number }
 */
export const checkQualitySatisfaction = (items, qualityRequirements, config) => {
    if (!items || items.length === 0) {
        return { satisfied: qualityRequirements.length === 0, matchResult: [], totalBonus: 0 };
    }
    
    // 获取品质排序（从高到低）
    const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    const getRarityIndex = (rarityId) => rarityOrder.indexOf(rarityId);
    
    // 将物品按品质从高到低排序
    const sortedItems = [...items].sort((a, b) => {
        return getRarityIndex(a.rarity.id) - getRarityIndex(b.rarity.id);
    });
    
    // 品质要求已经是从高到低排序的（在生成时保证）
    // 贪心匹配：对于每个品质要求，从剩余物品中选择满足要求的物品
    const usedItemIndices = new Set();
    const matchResult = [];
    let totalBonus = 0;
    
    for (const req of qualityRequirements) {
        let matchedCount = 0;
        const reqMatches = [];
        
        for (let i = 0; i < sortedItems.length && matchedCount < req.count; i++) {
            if (usedItemIndices.has(i)) continue;
            
            const item = sortedItems[i];
            // 检查物品品质是否 >= 要求品质（bonus 越高品质越好）
            if (item.rarity.bonus >= req.minRarity.bonus) {
                usedItemIndices.add(i);
                matchedCount++;
                totalBonus += item.rarity.bonus;
                reqMatches.push(item);
            }
        }
        
        matchResult.push({
            requirement: req,
            matchedItems: reqMatches,
            satisfied: matchedCount >= req.count
        });
    }
    
    // 加上未使用物品的 bonus（它们也会被提交）
    for (let i = 0; i < sortedItems.length; i++) {
        if (!usedItemIndices.has(i)) {
            totalBonus += sortedItems[i].rarity.bonus;
        }
    }
    
    const allSatisfied = matchResult.every(m => m.satisfied);
    
    return {
        satisfied: allSatisfied,
        matchResult,
        totalBonus
    };
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

    // 新系统：物品与品质解耦
    // 1. 随机选择物品（不含品质要求）
    const items = getRandomItems(allNormalItems, count).map(item => ({
        name: item.name,
        icon: item.icon,
        poolId: item.poolId,
        poolName: item.poolName
    }));
    
    // 2. 生成独立的品质要求
    const qualityRequirements = generateQualityRequirements(count, config, currentStageConfig);
    
    // 3. 计算基础奖励（基于品质要求的加成）
    const qualityBonus = calculateQualityBonus(qualityRequirements);

    // P2 Refactor: Always Gold, Configurable Base
    const rewardType = 'gold';

    // Default fallback if config is missing (compatibility)
    const defaultBaseRewards = { 2: 7, 3: 10, 4: 15 };
    const baseRewards = currentStageConfig.baseRewards || defaultBaseRewards;

    const rawBaseReward = baseRewards[count] || 15;
    const baseReward = Math.ceil(rawBaseReward * (1 + qualityBonus));

    // 兼容性：保留 requirements 字段用于其他系统（如 PoolCard 的需求显示）
    // 但主要使用新的 items 和 qualityRequirements
    const requirements = items.map((item, idx) => ({
        ...item,
        // 为了向后兼容，保留 requiredRarity 但设为 common
        requiredRarity: config.rarity.find(r => r.id === 'common')
    }));

    return {
        id: Math.random().toString(36).substr(2, 9),
        items,                    // 新：物品列表（不含品质）
        qualityRequirements,      // 新：品质要求列表
        requirements,             // 兼容：旧格式（用于其他系统）
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

    // 新系统：物品与品质解耦
    const items = [];
    for (let i = 0; i < count; i++) {
        const randomPool = pools[Math.floor(Math.random() * pools.length)];
        const item = getRandomItems(randomPool.items, 1)[0];
        items.push({
            name: item.name,
            icon: item.icon,
            poolId: randomPool.id,
            poolName: randomPool.name
        });
    }
    
    // 主线订单的品质要求：所有物品都需要达到指定品质
    const qualityRequirements = [{
        rarityId: rarityId,
        minRarity: targetRarity,
        count: count
    }];

    // 兼容性：保留 requirements 字段
    const requirements = items.map(item => ({
        ...item,
        requiredRarity: targetRarity
    }));

    return {
        id: `mainline_order_${Math.random().toString(36).substr(2, 9)}`,
        items,                    // 新：物品列表
        qualityRequirements,      // 新：品质要求列表
        requirements,             // 兼容：旧格式
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
