
import {
    Package, Trophy, Check, Star, ArrowLeftRight, ChevronsUp, Sparkles, Ticket, Gift, Zap, TrendingUp, Clock, ListOrdered
} from 'lucide-react';

// --- 阶段配置定义 ---
export const INITIAL_STAGE_CONFIG = [
    {
        "id": 0,
        "name": "阶段 1",
        "mechanicDesc": "基础机制生效",
        "desc": "普通模式 (Base)",
        "inventorySize": 10,
        "orderSlots": 3,
        "poolSize": 4,
        "allowedPoolCount": 5,
        "initialGold": 20,
        "orderCountRange": [
            2,
            4
        ],
        "orderCountWeights": {
            "2": 20,
            "3": 65,
            "4": 15
        },
        "baseRewards": {
            "2": 15,
            "3": 15,
            "4": 15
        },
        "rarityWeights": {
            "common": 0.37,
            "uncommon": 0.3,
            "rare": 0.2,
            "epic": 0.1,
            "legendary": 0.03,
            "mythic": 0
        },
        "orderRarityWeights": {
            "common": 0.4,
            "uncommon": 0.35,
            "rare": 0.2,
            "epic": 0.05,
            "legendary": 0,
            "mythic": 0
        },
        "mechanics": {
            "refresh": true,
            "affixes": true,
            "synthesis": true,
            "variablePrice": true
        },
        "unlocks": [
            "游戏开始！",
            "普通模式"
        ]
    },
    {
        "id": 1,
        "name": "阶段 2",
        "mechanicDesc": "奖池的价格随机波动",
        "desc": "波动模式 (Volatility)",
        "inventorySize": 10,
        "orderSlots": 3,
        "poolSize": 4,
        "allowedPoolCount": 5,
        "initialGold": 30,
        "orderCountRange": [
            2,
            4
        ],
        "orderCountWeights": {
            "2": 20,
            "3": 65,
            "4": 15
        },
        "rarityWeights": {
            "common": 0.8,
            "uncommon": 0.19,
            "rare": 0.01,
            "epic": 0.005,
            "legendary": 0.001,
            "mythic": 0
        },
        "orderRarityWeights": {
            "common": 0.4,
            "uncommon": 0.35,
            "rare": 0.2,
            "epic": 0.05,
            "legendary": 0,
            "mythic": 0
        },
        "mechanics": {
            "refresh": true,
            "affixes": true,
            "synthesis": true,
            "variablePrice": true,
            "volatility": true
        },
        "unlocks": [
            "阶段提升",
            "波动机制生效"
        ]
    },
    {
        "id": 2,
        "name": "阶段 3",
        "mechanicDesc": "背包内物品种类数量受限",
        "desc": "专业化模式 (Specialization)",
        "inventorySize": 20,
        "orderSlots": 3,
        "poolSize": 4,
        "allowedPoolCount": 5,
        "initialGold": 40,
        "orderCountRange": [
            2,
            4
        ],
        "orderCountWeights": {
            "2": 20,
            "3": 65,
            "4": 15
        },
        "rarityWeights": {
            "common": 0.8,
            "uncommon": 0.19,
            "rare": 0.01,
            "epic": 0.005,
            "legendary": 0.001,
            "mythic": 0
        },
        "orderRarityWeights": {
            "common": 0.4,
            "uncommon": 0.35,
            "rare": 0.2,
            "epic": 0.05,
            "legendary": 0,
            "mythic": 0
        },
        "mechanics": {
            "refresh": true,
            "affixes": true,
            "synthesis": true,
            "variablePrice": true,
            "specialization": true
        },
        "unlocks": [
            "阶段提升",
            "7种物品上限生效"
        ]
    },
    {
        "id": 3,
        "name": "阶段 4",
        "mechanicDesc": "物品随时间腐烂衰变",
        "desc": "熵增模式 (Entropy)",
        "inventorySize": 10,
        "orderSlots": 3,
        "poolSize": 4,
        "allowedPoolCount": 5,
        "initialGold": 50,
        "entropyDecayValue": 25,
        "orderCountRange": [
            2,
            4
        ],
        "orderCountWeights": {
            "2": 20,
            "3": 65,
            "4": 15
        },
        "rarityWeights": {
            "common": 0.8,
            "uncommon": 0.19,
            "rare": 0.01,
            "epic": 0.005,
            "legendary": 0.001,
            "mythic": 0
        },
        "orderRarityWeights": {
            "common": 0.4,
            "uncommon": 0.35,
            "rare": 0.2,
            "epic": 0.05,
            "legendary": 0,
            "mythic": 0
        },
        "mechanics": {
            "refresh": true,
            "affixes": true,
            "synthesis": true,
            "variablePrice": true,
            "entropy": true
        },
        "unlocks": [
            "阶段提升",
            "物品腐烂机制生效"
        ]
    }
];

// --- 技能定义 ---
export const SKILL_DEFINITIONS = [
    { id: 'poverty_relief', name: '贫困救济', desc: '金币 < 20 时，完成订单额外获得 +5 金币。', Icon: Gift, type: 'gold', color: 'text-yellow-600 bg-yellow-100' },
    { id: 'lucky_7', name: '幸运 7', desc: '当前金币的尾数为 7 时，抽取传说物品的概率翻倍。', Icon: Star, type: 'luck', color: 'text-green-600 bg-green-100' },
    { id: 'alchemy', name: '炼金术', desc: '回收"稀有"及以上品质物品时，25% 概率获得 5 金币。', Icon: Sparkles, type: 'gold', color: 'text-purple-600 bg-purple-100' },
    { id: 'vip_discount', name: '贵宾折扣', desc: '"精准"和"有的放矢"词缀的奖池金币消耗减少 1。', Icon: Ticket, type: 'draw', color: 'text-orange-600 bg-orange-100' },
    { id: 'negotiator', name: '谈判专家', desc: '抽到"史诗"或以上品质物品时，所有订单获得 1 次刷新次数。', Icon: ArrowLeftRight, type: 'utility', color: 'text-slate-600 bg-slate-100' },
    { id: 'consolation_prize', name: '安慰奖', desc: '连续抽到 5 个"普通"品质物品后，下次抽奖获得的物品必定是稀有以上品质。', Icon: Check, type: 'luck', color: 'text-teal-600 bg-teal-100' },
    { id: 'cut_corners', name: '偷工减料', desc: '刷新出新订单时，20% 概率使订单需求物品数量 -1（最低为1）。', Icon: Zap, type: 'refresh', color: 'text-red-600 bg-red-100' },
    { id: 'time_freeze', name: '时间冻结', desc: '刷新单个订单时，20% 概率不消耗该订单的剩余刷新次数。', Icon: Clock, type: 'refresh', color: 'text-cyan-600 bg-cyan-100' },
    { id: 'ocd', name: '强迫症', desc: '提交的订单若所有物品属于同一种类，积分奖励翻倍。', Icon: ListOrdered, type: 'order', color: 'text-indigo-600 bg-indigo-100' },
    { id: 'auto_restock', name: '自动补货', desc: '完成任意订单后，下次抽奖获得的物品会多获得 1 个。', Icon: Package, type: 'draw', color: 'text-lime-600 bg-lime-100' },
    { id: 'turn_fortune', name: '时来运转', desc: '完成任意订单后，下次抽奖获得的物品必定是稀有以上品质。', Icon: ChevronsUp, type: 'luck', color: 'text-rose-600 bg-rose-100' },
    { id: 'big_order_expert', name: '大订单专家', desc: '完成需求物品数为 4 个的订单时，额外获得 5 金币。', Icon: Package, type: 'order', color: 'text-amber-600 bg-amber-600' },
    { id: 'hard_order_expert', name: '困难订单专家', desc: '完成需要史诗以上品质物品的订单时，额外获得 10 金币。', Icon: Trophy, type: 'order', color: 'text-fuchsia-600 bg-fuchsia-100' },
];

// --- 工具物品定义 ---
export const TOOL_ITEMS = [
    {
        id: 'tool_reforge',
        name: '命运熔炉',
        icon: '🔥',
        desc: '使用后随机改变左侧物品的品质（品质概率与"有的放矢"词缀相同）。',
        effectType: 'reforge_left',
    },
    {
        id: 'tool_transmute',
        name: '万象棱镜',
        icon: '🔮',
        desc: '使用后将左侧物品变为同类型（同奖池）的另一个物品，品质不变。',
        effectType: 'transmute_left',
    },
    {
        id: 'tool_enhance',
        name: '星辉祝福',
        icon: '✨',
        desc: '使用后下一个抽出的物品品质提升1级。',
        effectType: 'enhance_next',
    },
];

// --- 工具物品掉落配置 ---
export const TOOL_ITEM_CONFIG = {
    dropChance: 0.2,           // 每次抽奖时掉落工具物品的概率
    weights: {                  // 三种工具物品的相对权重
        tool_reforge: 1,
        tool_transmute: 1,
        tool_enhance: 1,
    },
    reforgeRarityWeights: {     // 命运熔炉重roll品质的概率分布
        common: 0.4,
        uncommon: 0.3,
        rare: 0.2,
        epic: 0.08,
        legendary: 0.02,
        mythic: 0,
    },
};

// --- 特质定义 ---
export const TRAIT_DEFINITIONS = {
    // §3.1 被动光环
    flat_value_2: {
        id: 'flat_value_2',
        name: '坚固',
        desc: '价值+2',
        category: 'passive',
        effectType: 'aura',
        auraType: 'additive',
        calcAdditive: (item, inv) => 2,
    },
    multiplier_1_5: {
        id: 'multiplier_1_5',
        name: '增幅',
        desc: '价值×1.5',
        category: 'passive',
        effectType: 'aura',
        auraType: 'multiplicative',
        calcMultiplicative: (item, inv) => 1.5,
    },
    virgin_double: {
        id: 'virgin_double',
        name: '纯净',
        desc: '从未被注入过时，价值×2',
        category: 'passive',
        effectType: 'aura',
        auraType: 'multiplicative',
        calcMultiplicative: (item) => (item.infusionHistory || []).length === 0 ? 2 : 1,
    },
    same_pool_synergy: {
        id: 'same_pool_synergy',
        name: '同源共鸣',
        desc: '背包中每有一个其他同类型池物品，价值+1',
        category: 'passive',
        effectType: 'aura',
        auraType: 'additive',
        calcAdditive: (item, inventoryItems) => {
            if (!inventoryItems) return 0;
            const myPoolId = item.poolId || (item.poolIds && item.poolIds[0]);
            return inventoryItems.filter(i => i && i.uid !== item.uid && (i.poolId || (i.poolIds && i.poolIds[0])) === myPoolId).length;
        },
    },
    decay_infuse: {
        id: 'decay_infuse',
        name: '衰变亲和',
        desc: '价值每回合-1，每次被注入时+3',
        category: 'passive',
        effectType: 'trigger',
        onRound: () => -1,
        onInfuse: () => 3,
    },

    // §3.2 池触发
    infuse_fruit: {
        id: 'infuse_fruit',
        name: '水果亲和',
        desc: '注入水果时，价值+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.poolId === 'fruit' ? 1 : 0,
    },
    infuse_medicine: {
        id: 'infuse_medicine',
        name: '药物亲和',
        desc: '注入药物时，价值+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.poolId === 'medicine' ? 1 : 0,
    },
    infuse_electronics: {
        id: 'infuse_electronics',
        name: '电器亲和',
        desc: '注入电器时，价值+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.poolId === 'electronics' ? 1 : 0,
    },
    infuse_kitchenware: {
        id: 'infuse_kitchenware',
        name: '厨具亲和',
        desc: '注入厨具时，价值+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.poolId === 'kitchenware' ? 1 : 0,
    },
    infuse_stationery: {
        id: 'infuse_stationery',
        name: '文具亲和',
        desc: '注入文具时，价值+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.poolId === 'stationery' ? 1 : 0,
    },

    // §3.3 名字触发
    infuse_watermelon: {
        id: 'infuse_watermelon',
        name: '西瓜渴望',
        desc: '注入西瓜时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '西瓜' ? 2 : 0,
    },
    infuse_lemon: {
        id: 'infuse_lemon',
        name: '柠檬渴望',
        desc: '注入柠檬时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '柠檬' ? 2 : 0,
    },
    infuse_mango: {
        id: 'infuse_mango',
        name: '芒果渴望',
        desc: '注入芒果时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '芒果' ? 2 : 0,
    },
    infuse_apple: {
        id: 'infuse_apple',
        name: '苹果渴望',
        desc: '注入苹果时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '苹果' ? 2 : 0,
    },
    infuse_powder_drink: {
        id: 'infuse_powder_drink',
        name: '冲剂渴望',
        desc: '注入冲剂时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '冲剂' ? 2 : 0,
    },
    infuse_eye_drops: {
        id: 'infuse_eye_drops',
        name: '滴眼液渴望',
        desc: '注入滴眼液时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '滴眼液' ? 2 : 0,
    },
    infuse_syringe: {
        id: 'infuse_syringe',
        name: '注射器渴望',
        desc: '注入注射器时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '注射器' ? 2 : 0,
    },
    infuse_capsule: {
        id: 'infuse_capsule',
        name: '胶囊渴望',
        desc: '注入胶囊时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '胶囊' ? 2 : 0,
    },
    infuse_pencil: {
        id: 'infuse_pencil',
        name: '铅笔渴望',
        desc: '注入铅笔时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '铅笔' ? 2 : 0,
    },
    infuse_eraser: {
        id: 'infuse_eraser',
        name: '橡皮渴望',
        desc: '注入橡皮时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '橡皮' ? 2 : 0,
    },
    infuse_stapler: {
        id: 'infuse_stapler',
        name: '订书机渴望',
        desc: '注入订书机时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '订书机' ? 2 : 0,
    },
    infuse_notebook: {
        id: 'infuse_notebook',
        name: '笔记本渴望',
        desc: '注入笔记本时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '笔记本' ? 2 : 0,
    },
    infuse_frying_pan: {
        id: 'infuse_frying_pan',
        name: '平底锅渴望',
        desc: '注入平底锅时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '平底锅' ? 2 : 0,
    },
    infuse_kitchen_knife: {
        id: 'infuse_kitchen_knife',
        name: '菜刀渴望',
        desc: '注入菜刀时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '菜刀' ? 2 : 0,
    },
    infuse_cutting_board: {
        id: 'infuse_cutting_board',
        name: '砧板渴望',
        desc: '注入砧板时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '砧板' ? 2 : 0,
    },
    infuse_soup_spoon: {
        id: 'infuse_soup_spoon',
        name: '汤勺渴望',
        desc: '注入汤勺时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '汤勺' ? 2 : 0,
    },
    infuse_phone: {
        id: 'infuse_phone',
        name: '手机渴望',
        desc: '注入手机时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '手机' ? 2 : 0,
    },
    infuse_earphones: {
        id: 'infuse_earphones',
        name: '耳机渴望',
        desc: '注入耳机时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '耳机' ? 2 : 0,
    },
    infuse_ac: {
        id: 'infuse_ac',
        name: '空调渴望',
        desc: '注入空调时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '空调' ? 2 : 0,
    },
    infuse_computer: {
        id: 'infuse_computer',
        name: '电脑渴望',
        desc: '注入电脑时，价值+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => m.name === '电脑' ? 2 : 0,
    },

    // §3.4 品质触发
    infuse_uncommon_plus: {
        id: 'infuse_uncommon_plus',
        name: '品质吸收',
        desc: '注入优秀以上品质物品时+1',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => { const order = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']; return order.indexOf(m.rarityId) >= 1 ? 1 : 0; },
    },
    infuse_rare_plus: {
        id: 'infuse_rare_plus',
        name: '稀有汲取',
        desc: '注入稀有以上品质物品时+3',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m) => { const order = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']; return order.indexOf(m.rarityId) >= 2 ? 3 : 0; },
    },

    // §3.5 其他触发
    infuse_same_name: {
        id: 'infuse_same_name',
        name: '同名共鸣',
        desc: '注入同名物品时+3',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m, target) => m.name === (target.name || (target.names && target.names[0])) ? 3 : 0,
    },
    infuse_different_pool: {
        id: 'infuse_different_pool',
        name: '异源增幅',
        desc: '注入不同类型池物品时+2',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m, target) => { const tp = target.poolId || (target.poolIds && target.poolIds[0]); return m.poolId !== tp ? 2 : 0; },
    },
    infuse_common_free: {
        id: 'infuse_common_free',
        name: '普品免费',
        desc: '注入白色物品时，不消耗注入次数',
        category: 'infuse_trigger',
        effectType: 'special',
        specialType: 'common_free_infuse',
    },
    infuse_order_match: {
        id: 'infuse_order_match',
        name: '订单契合',
        desc: '注入满足活跃订单名字需求的物品时+3',
        category: 'infuse_trigger',
        effectType: 'trigger',
        onInfuse: (m, target, config, activeOrderNames) => (activeOrderNames || []).includes(m.name) ? 3 : 0,
    },

    // §3.6 材料触发
    material_full_value: {
        id: 'material_full_value',
        name: '精华转移',
        desc: '被消耗时，目标获得本物品全部当前价值',
        category: 'material',
        effectType: 'trigger',
        onConsumed: (mat) => ({ targetBonusAdd: mat._currentValue || 0 }),
    },
    material_infuse_count: {
        id: 'material_infuse_count',
        name: '注入传承',
        desc: '被消耗时，目标注入次数上限+1',
        category: 'material',
        effectType: 'trigger',
        onConsumed: () => ({ targetMaxInfusionsAdd: 1 }),
    },
    material_inventory_boost: {
        id: 'material_inventory_boost',
        name: '全员增幅',
        desc: '被消耗时，背包中所有物品各+1价值',
        category: 'material',
        effectType: 'trigger',
        onConsumed: () => ({ inventoryBonusAdd: 1 }),
    },
    material_refund: {
        id: 'material_refund',
        name: '回收返还',
        desc: '被消耗时，获得本物品品质对应的回收金币',
        category: 'material',
        effectType: 'trigger',
        onConsumed: (mat) => ({ goldAdd: mat.rarity?.recycleValue || 0 }),
    },

    // §3.7 融合触发
    fusion_value_3: {
        id: 'fusion_value_3',
        name: '融合增幅',
        desc: '融合时，结果物品价值+3',
        category: 'fusion',
        effectType: 'trigger',
        onFusion: () => 3,
    },

    // §3.8 容量
    extra_infuse_3: {
        id: 'extra_infuse_3',
        name: '注入扩容',
        desc: '注入次数上限+3',
        category: 'capacity',
        effectType: 'permanent_capacity',
        capacityEffect: { maxInfusions: 3 },
    },
    extra_trait_1: {
        id: 'extra_trait_1',
        name: '特质扩容',
        desc: '特质条目上限+1',
        category: 'capacity',
        effectType: 'permanent_capacity',
        capacityEffect: { maxTraits: 1 },
    },

    // §3.9 特殊
    recycle_double: {
        id: 'recycle_double',
        name: '双倍回收',
        desc: '回收本物品时，获得双倍金币',
        category: 'special',
        effectType: 'special',
        specialType: 'recycle_double',
    },
    infuse_burst: {
        id: 'infuse_burst',
        name: '注入爆发',
        desc: '首次被注入时+5价值，之后本特质消失',
        category: 'special',
        effectType: 'special',
        specialType: 'infuse_burst',
    },

    // 新增特质
    growth_per_round: {
        id: 'growth_per_round',
        name: '持续成长',
        desc: '每回合永久加值+1',
        category: 'passive',
        effectType: 'trigger',
        onRound: () => 1,
    },
    empty_slot_bonus: {
        id: 'empty_slot_bonus',
        name: '空间共鸣',
        desc: '背包中每有一个空格，价值+1',
        category: 'passive',
        effectType: 'aura',
        auraType: 'additive',
        calcAdditive: (item, inv, config) => {
            const max = config?.stages?.[0]?.inventorySize || 10;
            return Math.max(0, max - (inv ? inv.length : 0));
        },
    },
    refresh_growth: {
        id: 'refresh_growth',
        name: '时光积淀',
        desc: '每次奖池刷新时，永久加值+1',
        category: 'passive',
        effectType: 'trigger',
        onRound: () => 1,
    },
    infuse_risky: {
        id: 'infuse_risky',
        name: '危险注入',
        desc: '被注入时永久加值+4，但随机失去一条已有特质',
        category: 'special',
        effectType: 'special',
        specialType: 'infuse_risky',
    },
    full_inventory_bonus: {
        id: 'full_inventory_bonus',
        name: '满载增幅',
        desc: '背包已满时，价值+3',
        category: 'passive',
        effectType: 'aura',
        auraType: 'additive',
        calcAdditive: (item, inv, config) => {
            const max = config?.stages?.[0]?.inventorySize || 10;
            return inv && inv.length >= max ? 3 : 0;
        },
    },
    trait_count_bonus: {
        id: 'trait_count_bonus',
        name: '特质共鸣',
        desc: '该物品每有一条特质，价值+2',
        category: 'passive',
        effectType: 'aura',
        auraType: 'additive',
        calcAdditive: (item) => (item.traits || []).length * 2,
    },
};

// --- 价值系统配置 ---
export const VALUE_SYSTEM_CONFIG = {
    baseValues: { common: 0, uncommon: 2, rare: 4, epic: 7, legendary: 12, mythic: 20 },
    compositeQualityThresholds: { default: [0, 2, 4, 7, 12, 20] },
    rewardMultiplier: 1,
};

// --- 特质系统配置 ---
export const TRAIT_SYSTEM_CONFIG = {
    enabled: true,
    baseInfusionCount: 3,
    maxTraitSlots: 3,
    minRarityForTrait: 'uncommon',
    traitWeights: { categoryPool: 0.3, categoryPoolSplit: 0.5, otherTraits: 0.7 },
};

export const INITIAL_AFFIXES_CONFIG = [
    {
        "id": "trade_in",
        "name": "以旧换新的",
        "desc": "用背包内的 1 个物品随机置换 1 个同品质的物品。",
        "type": "interaction",
        "weight": 10,
        "cost": 1
    },
    {
        "id": "hardened",
        "name": "硬化的",
        "desc": "稀有度更高，但物品带有【绝育】效果，无法合成。",
        "type": "passive",
        "weight": 10,
        "cost": 2,
        "rarityWeights": {
            "common": 0,
            "uncommon": 0.2,
            "rare": 0.7,
            "epic": 0.09,
            "legendary": 0.01
        }
    },
    {
        "id": "purified",
        "name": "提纯的",
        "desc": "保底产出稀有、史诗或传说物品。",
        "type": "passive",
        "weight": 10,
        "cost": 3,
        "rarityWeights": {
            "common": 0,
            "uncommon": 0,
            "rare": 0.67,
            "epic": 0.3,
            "legendary": 0.03
        }
    },
    {
        "id": "volatile",
        "name": "波动的",
        "desc": "有更高的概率出现传说物品，但只会产出普通和传说物品",
        "type": "passive",
        "weight": 10,
        "cost": 1,
        "rarityWeights": {
            "common": 0.9,
            "uncommon": 0,
            "rare": 0,
            "epic": 0,
            "legendary": 0.1
        }
    },
    {
        "id": "fragmented",
        "name": "稀碎的",
        "desc": "一次抽取获得 3 个物品，但必定为普通品质。",
        "type": "passive",
        "weight": 10,
        "cost": 1
    },
    {
        "id": "precise",
        "name": "精准的",
        "desc": "从 2 个不同的候选物品中任选其一。",
        "type": "interaction",
        "weight": 10,
        "cost": 2
    },
    {
        "id": "targeted",
        "name": "有的放矢的",
        "desc": "指定一个想要的物品类型。",
        "type": "interaction",
        "weight": 10,
        "cost": 4
    }
];

export const INITIAL_RARITY_CONFIG = [
    { id: 'common', name: '普通', color: 'border-slate-300 bg-slate-50 text-slate-600', dotColor: 'bg-slate-400', starColor: 'text-slate-400', shadow: '', bonus: 0, recycleValue: 0 },
    { id: 'uncommon', name: '优秀', color: 'border-green-400 bg-green-50 text-green-700', dotColor: 'bg-green-500', starColor: 'text-green-500', shadow: 'shadow-green-200', bonus: 0.1, recycleValue: 0 },
    { id: 'rare', name: '稀有', color: 'border-blue-400 bg-blue-50 text-blue-700', dotColor: 'bg-blue-500', starColor: 'text-blue-500', shadow: 'shadow-blue-200', bonus: 0.25, recycleValue: 1 },
    { id: 'epic', name: '史诗', color: 'border-purple-400 bg-purple-50 text-purple-700', dotColor: 'bg-purple-500', starColor: 'text-purple-500', shadow: 'shadow-purple-200', bonus: 0.5, recycleValue: 2 },
    { id: 'legendary', name: '传说', color: 'border-orange-400 bg-orange-50 text-orange-700', dotColor: 'bg-orange-500', starColor: 'text-orange-500', shadow: 'shadow-orange-200', bonus: 1.0, recycleValue: 4 },
    { id: 'mythic', name: '神话', color: 'border-rose-500 bg-rose-50 text-rose-700', dotColor: 'bg-rose-500', starColor: 'text-rose-600', shadow: 'shadow-rose-200', bonus: 2.0, recycleValue: 10 }
];

export const INITIAL_POOLS_DATA = [
    {
        "id": "fruit",
        "name": "水果",
        "type": "normal",
        "currency": "gold",
        "color": "bg-green-100 text-green-800 border-green-200",
        "icon": "🍎",
        "items": [
            {
                "name": "西瓜",
                "icon": "🍉"
            },
            {
                "name": "柠檬",
                "icon": "🍋"
            },
            {
                "name": "芒果",
                "icon": "🥭"
            },
            {
                "name": "苹果",
                "icon": "🍎"
            }
        ]
    },
    {
        "id": "medicine",
        "name": "药物",
        "type": "normal",
        "currency": "gold",
        "color": "bg-red-100 text-red-800 border-red-200",
        "icon": "💊",
        "items": [
            {
                "name": "冲剂",
                "icon": "🍵"
            },
            {
                "name": "滴眼液",
                "icon": "💧"
            },
            {
                "name": "注射器",
                "icon": "💉"
            },
            {
                "name": "胶囊",
                "icon": "💊"
            }
        ]
    },
    {
        "id": "stationery",
        "name": "文具",
        "type": "normal",
        "currency": "gold",
        "color": "bg-yellow-100 text-yellow-800 border-yellow-200",
        "icon": "✏️",
        "items": [
            {
                "name": "铅笔",
                "icon": "✏️"
            },
            {
                "name": "橡皮",
                "icon": "🧼"
            },
            {
                "name": "订书机",
                "icon": "📎"
            },
            {
                "name": "笔记本",
                "icon": "📒"
            }
        ]
    },
    {
        "id": "kitchenware",
        "name": "厨具",
        "type": "normal",
        "currency": "gold",
        "color": "bg-orange-100 text-orange-800 border-orange-200",
        "icon": "🍳",
        "items": [
            {
                "name": "平底锅",
                "icon": "🍳"
            },
            {
                "name": "菜刀",
                "icon": "🔪"
            },
            {
                "name": "砧板",
                "icon": "🪵"
            },
            {
                "name": "汤勺",
                "icon": "🥄"
            }
        ]
    },
    {
        "id": "electronics",
        "name": "电器",
        "type": "normal",
        "currency": "gold",
        "color": "bg-blue-100 text-blue-800 border-blue-200",
        "icon": "⚡️",
        "items": [
            {
                "name": "手机",
                "icon": "📱"
            },
            {
                "name": "耳机",
                "icon": "🎧"
            },
            {
                "name": "空调",
                "icon": "❄️"
            },
            {
                "name": "电脑",
                "icon": "💻"
            }
        ]
    }
];

// --- 撤离订单配置 ---
export const EMERGENCY_ORDER_CONFIG = {
    // 难度系统
    difficulty: {
        initial: 1,         // 初始难度
        increaseOnNewOrder: 1,  // 每个新撤离订单难度增加值
        decreaseOnScoreOrder: 0,  // 完成积分订单时难度减少值
        minDifficulty: 1,   // 最小难度
        maxDifficulty: 4    // 最大难度（可选）
    },

    // 基础配置
    reqCountMin: 1,         // 需求数量最小值
    reqCountMax: 4,         // 需求数量最大值

    // 基础品质权重（难度=1时使用）
    baseRarityWeights: {
        common: 0.5,
        uncommon: 0.3,
        rare: 0.15,
        epic: 0.04,
        legendary: 0.01
    },

    // 难度等级配置：难度 -\u003e 需求数量权重
    difficultyReqCountWeights: {
        1: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 },
        2: { 1: 0.4, 2: 0.35, 3: 0.2, 4: 0.05 },
        3: { 1: 0.3, 2: 0.35, 3: 0.25, 4: 0.1 },
        4: { 1: 0.2, 2: 0.3, 3: 0.3, 4: 0.2 },
        5: { 1: 0.1, 2: 0.25, 3: 0.35, 4: 0.3 },
        6: { 1: 0.05, 2: 0.2, 3: 0.35, 4: 0.4 },
        7: { 1: 0.05, 2: 0.15, 3: 0.3, 4: 0.5 },
        8: { 1: 0.0, 2: 0.1, 3: 0.3, 4: 0.6 },
        9: { 1: 0.0, 2: 0.05, 3: 0.25, 4: 0.7 },
        10: { 1: 0.0, 2: 0.0, 3: 0.2, 4: 0.8 }
    },

    // 难度等级配置：难度 -\u003e 品质权重
    difficultyRarityWeights: {
        1: { common: 0.5, uncommon: 0.3, rare: 0.15, epic: 0.04, legendary: 0.01 },
        2: { common: 0.45, uncommon: 0.3, rare: 0.18, epic: 0.06, legendary: 0.01 },
        3: { common: 0.4, uncommon: 0.3, rare: 0.2, epic: 0.08, legendary: 0.02 },
        4: { common: 0.35, uncommon: 0.3, rare: 0.22, epic: 0.1, legendary: 0.03 },
        5: { common: 0.3, uncommon: 0.28, rare: 0.25, epic: 0.12, legendary: 0.05 },
        6: { common: 0.25, uncommon: 0.25, rare: 0.28, epic: 0.15, legendary: 0.07 },
        7: { common: 0.2, uncommon: 0.22, rare: 0.3, epic: 0.18, legendary: 0.1 },
        8: { common: 0.15, uncommon: 0.2, rare: 0.32, epic: 0.2, legendary: 0.13 },
        9: { common: 0.1, uncommon: 0.15, rare: 0.35, epic: 0.25, legendary: 0.15 },
        10: { common: 0.05, uncommon: 0.1, rare: 0.35, epic: 0.3, legendary: 0.2 }
    },

    // 难度等级配置：难度 -> 精确品质需求（可选，如配置则优先使用）
    // 数组中每项表示需要的品质和数量，会随机打乱后生成订单
    // 示例: 1: [{ rarity: 'common', count: 1 }, { rarity: 'uncommon', count: 1 }]
    // 表示难度1固定需要1个普通+1个优秀品质的物品
    difficultyRequirements: {
        1: [{ rarity: 'uncommon', count: 1 }, { rarity: 'rare', count: 1 }],
        2: [{ rarity: 'rare', count: 1 }, { rarity: 'rare', count: 1 }],
        3: [{ rarity: 'rare', count: 1 }, { rarity: 'epic', count: 1 }],
        4: [{ rarity: 'epic', count: 1 }, { rarity: 'epic', count: 1 }]
    },
    difficultyRequiredValues: { 1: 3, 2: 4, 3: 5, 4: 7 },
};

// --- 积分订单配置 ---
export const SCORE_PROGRESS_CONFIG = {
    targetProgress: null,      // 无上限
    progressOffset: 0,         // 计算偏移量
    // 详细品质权重分配 (累加每个需求物品的值)
    rarityWeights: {
        common: 2,
        uncommon: 2.5,
        rare: 4,
        epic: 8,
        legendary: 16,
        mythic: 32
    },
    orderValueWeights: { 10: 1 }
};

export const INITIAL_GAME_CONFIG = {
    affixes: INITIAL_AFFIXES_CONFIG,
    rarity: INITIAL_RARITY_CONFIG,
    pools: INITIAL_POOLS_DATA,
    stages: INITIAL_STAGE_CONFIG,
    progress: SCORE_PROGRESS_CONFIG,
    emergency: EMERGENCY_ORDER_CONFIG,
    toolItems: TOOL_ITEM_CONFIG,
    valueSystem: VALUE_SYSTEM_CONFIG,
    traitSystem: TRAIT_SYSTEM_CONFIG,
    enabledSkillIds: [
        "poverty_relief",
        "lucky_7",
        "alchemy",
        "vip_discount",
        "negotiator",
        "consolation_prize",
        "cut_corners",
        "time_freeze",
        "ocd",
        "auto_restock",
        "turn_fortune",
        "big_order_expert",
        "hard_order_expert"
    ],
    global: {
        "refreshCost": 5,
        "initialGold": 30,
        "initialRefreshCount": 3,
        "maxRefreshCount": 3
    }
};

