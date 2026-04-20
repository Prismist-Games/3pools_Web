
import {
    Package, Trophy, Check, Star, ArrowLeftRight, ChevronsUp, Sparkles, Ticket, Gift, Zap, TrendingUp, Clock, ListOrdered
} from 'lucide-react';
import { EXPEDITION_CONFIG, ORDER_CONFIG } from './v2Config';

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
        // "initialGold": 20, // removed: gold system replaced by doom/HP
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
        // "initialGold": 30, // removed: gold system replaced by doom/HP
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
        "mechanicDesc": "菜篮内物品种类数量受限",
        "desc": "专业化模式 (Specialization)",
        "inventorySize": 20,
        "orderSlots": 3,
        "poolSize": 4,
        "allowedPoolCount": 5,
        // "initialGold": 40, // removed: gold system replaced by doom/HP
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
        // "initialGold": 50, // removed: gold system replaced by doom/HP
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

export const INITIAL_AFFIXES_CONFIG = [
    {
        "id": "trade_in",
        "name": "以旧换新的",
        "desc": "用菜篮内的 1 个物品随机置换 1 个同品质的物品。",
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
    { id: 'common', name: '普通', color: 'border-kitchen-gold-border-muted bg-kitchen-card text-kitchen-text-secondary', dotColor: 'bg-kitchen-text-muted', starColor: 'text-kitchen-text-muted', shadow: '', bonus: 0, recycleValue: 0 },
    { id: 'uncommon', name: '优秀', color: 'border-green-400 bg-green-50 text-green-700', dotColor: 'bg-green-500', starColor: 'text-green-500', shadow: 'shadow-green-200', bonus: 0.1, recycleValue: 0 },
    { id: 'rare', name: '稀有', color: 'border-kitchen-info-border bg-blue-50 text-blue-700', dotColor: 'bg-kitchen-info', starColor: 'text-kitchen-info', shadow: 'shadow-blue-200', bonus: 0.25, recycleValue: 1 },
    { id: 'epic', name: '史诗', color: 'border-purple-400 bg-purple-50 text-purple-700', dotColor: 'bg-purple-500', starColor: 'text-purple-500', shadow: 'shadow-purple-200', bonus: 0.5, recycleValue: 2 },
    { id: 'legendary', name: '传说', color: 'border-kitchen-gold bg-orange-50 text-orange-700', dotColor: 'bg-kitchen-gold', starColor: 'text-kitchen-gold', shadow: 'shadow-orange-200', bonus: 1.0, recycleValue: 4 },
    { id: 'mythic', name: '神话', color: 'border-kitchen-danger bg-rose-50 text-rose-700', dotColor: 'bg-kitchen-danger', starColor: 'text-kitchen-danger', shadow: 'shadow-rose-200', bonus: 2.0, recycleValue: 10 }
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
    }
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
    }
};

// --- 厄运系统配置 ---
export const DOOM_CONFIG = {
    gridSize: 10,              // 厄运网格格子数
    initialDangerCount: 1,     // 初始"危险"格子数
    initialHP: 5,              // 初始生命值
    initialDoomLevel: 1,       // 初始厄运等级
    dangerPerTurn: 1,          // 每回合自动增加的危险格子数
};

// --- 回合制配置 ---
export const TURN_CONFIG = {
    goldPerTurn: 3,            // 每次进市场的抽取次数
    drawCost: 1,               // 每次抽取消耗
};

export const INITIAL_GAME_CONFIG = {
    pools: INITIAL_POOLS_DATA,
    stages: INITIAL_STAGE_CONFIG,
    doom: DOOM_CONFIG,
    turn: TURN_CONFIG,
    expedition: EXPEDITION_CONFIG,
    order: ORDER_CONFIG,
    inventorySize: 10,
};

