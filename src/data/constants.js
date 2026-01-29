
import {
    RefreshCw, Package, Trophy, RotateCcw, AlertCircle, X, Check, Star, Hand, ArrowLeftRight, ChevronsUp, Sparkles, Layers, Send, Coins, Ticket, Trash2, Ban, Gift, Target, Shuffle, Repeat, Settings, Download, Upload, Save, FileJson, Power, Info, MousePointerClick, Crown, ListOrdered, Flag, FastForward, Zap, ShieldCheck, Clover, TrendingUp, ShoppingBag, Clock, Briefcase, Gem, Scale, Hammer, ArrowRight, Eye, Lock, ZapOff
} from 'lucide-react';

export const ResetIcon = RotateCcw;

// --- 阶段配置定义 ---
export const INITIAL_STAGE_CONFIG = [
    {
        "id": 0,
        "name": "阶段 1",
        "mechanicDesc": "基础机制生效",
        "desc": "普通模式 (Base)",
        "inventorySize": 10,
        "orderSlots": 4,
        "poolSize": 5,
        "allowedPoolCount": 5,
        "fixedPrice": null,
        "initialGold": 20,
        "mainlineReqCount": 2,
        "mainlineReqRarity": "epic",
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
            "2": 7,
            "3": 10,
            "4": 15
        },
        "rarityWeights": {
            "common": 0.8,
            "uncommon": 0.19,
            "rare": 0.01,
            "epic": 0,
            "legendary": 0,
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
        "orderSlots": 4,
        "poolSize": 5,
        "allowedPoolCount": 5,
        "fixedPrice": null,
        "initialGold": 30,
        "mainlineReqCount": 2,
        "mainlineReqRarity": "epic",
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
            "epic": 0,
            "legendary": 0,
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
        "orderSlots": 4,
        "poolSize": 5,
        "allowedPoolCount": 5,
        "fixedPrice": null,
        "initialGold": 40,
        "mainlineReqCount": 2,
        "mainlineReqRarity": "epic",
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
            "epic": 0,
            "legendary": 0,
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
        "orderSlots": 4,
        "poolSize": 5,
        "allowedPoolCount": 5,
        "fixedPrice": null,
        "initialGold": 50,
        "mainlineReqCount": 2,
        "mainlineReqRarity": "epic",
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
            "epic": 0,
            "legendary": 0,
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
// Tickets removed, Gold rewards increased
export const SKILL_DEFINITIONS = [
    { id: 'poverty_relief', name: '贫困救济', desc: '持有金币 < 5 时，完成订单的金币奖励额外 +5。', Icon: Gift, type: 'gold', color: 'text-yellow-600 bg-yellow-100' },
    { id: 'lucky_7', name: '幸运 7', desc: '当前金币数量的尾数为 7 时，抽取传说物品的概率翻倍。', Icon: Star, type: 'luck', color: 'text-green-600 bg-green-100' },
    { id: 'alchemy', name: '炼金术', desc: '回收“稀有”及以上品质物品时，25% 概率获得 5 金币。', Icon: Sparkles, type: 'gold', color: 'text-purple-600 bg-purple-100' },
    { id: 'vip_discount', name: '贵宾折扣', desc: '“精准”和“有的放矢”词缀的奖池金币消耗减少 1。', Icon: Ticket, type: 'draw', color: 'text-orange-600 bg-orange-100' },
    { id: 'negotiator', name: '谈判专家', desc: '抽到“史诗”或以上品质物品时，所有订单获得 1 次刷新次数。', Icon: ArrowLeftRight, type: 'utility', color: 'text-slate-600 bg-slate-100' },
    { id: 'consolation_prize', name: '安慰奖', desc: '连续抽到 5 个“普通”品质物品后，下次抽奖获得的物品必定是稀有以上品质。', Icon: Check, type: 'luck', color: 'text-teal-600 bg-teal-100' },
    { id: 'cut_corners', name: '偷工减料', desc: '刷新出新订单时，20% 概率使订单需求物品数量 -1（最低为1）。', Icon: Zap, type: 'refresh', color: 'text-red-600 bg-red-100' },
    { id: 'time_freeze', name: '时间冻结', desc: '刷新单个订单时，20% 概率不消耗该订单的剩余刷新次数。', Icon: Clock, type: 'refresh', color: 'text-cyan-600 bg-cyan-100' },
    { id: 'ocd', name: '强迫症', desc: '提交的订单若所有物品属于同一种类，金币奖励翻倍。', Icon: ListOrdered, type: 'order', color: 'text-indigo-600 bg-indigo-100' },
    { id: 'auto_restock', name: '自动补货', desc: '完成任意订单后，下次抽奖获得的物品会多获得 1 个。', Icon: Package, type: 'draw', color: 'text-lime-600 bg-lime-100' },
    { id: 'turn_fortune', name: '时来运转', desc: '完成任意订单后，下次抽奖获得的物品必定是稀有以上品质。', Icon: ChevronsUp, type: 'luck', color: 'text-rose-600 bg-rose-100' },
    { id: 'big_order_expert', name: '大订单专家', desc: '完成需求物品数为 4 个的订单时，额外获得 5 金币。', Icon: Package, type: 'order', color: 'text-amber-600 bg-amber-100' },
    { id: 'hard_order_expert', name: '困难订单专家', desc: '完成需要史诗以上品质物品的订单时，额外获得 10 金币。', Icon: Trophy, type: 'order', color: 'text-fuchsia-600 bg-fuchsia-100' },
];

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
        "cost": 2
    },
    {
        "id": "purified",
        "name": "提纯的",
        "desc": "保底产出稀有、史诗或传说物品。",
        "type": "passive",
        "weight": 10,
        "cost": 3
    },
    {
        "id": "volatile",
        "name": "波动的",
        "desc": "有更高的概率出现传说物品，但只会产出普通和传说物品",
        "type": "passive",
        "weight": 10,
        "cost": 1
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
    {
        "id": "common",
        "name": "普通",
        "color": "border-slate-300 bg-slate-50 text-slate-600",
        "dotColor": "bg-slate-400",
        "bonus": 0,
        "prob": 0.4,
        "shadow": "",
        "starColor": "text-slate-400",
        "recycleValue": 0
    },
    {
        "id": "uncommon",
        "name": "优秀",
        "color": "border-green-400 bg-green-50 text-green-700",
        "dotColor": "bg-green-500",
        "bonus": 0.1,
        "prob": 0.3,
        "shadow": "shadow-green-200",
        "starColor": "text-green-500",
        "recycleValue": 0
    },
    {
        "id": "rare",
        "name": "稀有",
        "color": "border-blue-400 bg-blue-50 text-blue-700",
        "dotColor": "bg-blue-500",
        "bonus": 0.2,
        "prob": 0.19,
        "shadow": "shadow-blue-200",
        "starColor": "text-blue-500",
        "recycleValue": 1
    },
    {
        "id": "epic",
        "name": "史诗",
        "color": "border-purple-400 bg-purple-50 text-purple-700",
        "dotColor": "bg-purple-500",
        "bonus": 0.4,
        "prob": 0.1,
        "shadow": "shadow-purple-200",
        "starColor": "text-purple-500",
        "recycleValue": 2
    },
    {
        "id": "legendary",
        "name": "传说",
        "color": "border-orange-400 bg-orange-50 text-orange-700",
        "dotColor": "bg-orange-500",
        "bonus": 1,
        "prob": 0.01,
        "shadow": "shadow-orange-200",
        "starColor": "text-orange-500",
        "recycleValue": 4
    },
    {
        "id": "mythic",
        "name": "神话",
        "color": "border-rose-500 bg-rose-50 text-rose-700",
        "dotColor": "bg-rose-500",
        "bonus": 3,
        "prob": 0,
        "shadow": "shadow-rose-200",
        "starColor": "text-rose-600",
        "recycleValue": 10
    }
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
            },
            {
                "name": "橙子",
                "icon": "🍊"
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
            },
            {
                "name": "绷带",
                "icon": "🤕"
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
            },
            {
                "name": "尺子",
                "icon": "📏"
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
            },
            {
                "name": "叉子",
                "icon": "🍴"
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
            },
            {
                "name": "电视",
                "icon": "📺"
            }
        ]
    }
];

export const MAINLINE_ITEMS = [
    { id: 'm1', name: '仙果', icon: '🍑', poolId: 'fruit', desc: '主线1道具' },
    { id: 'm2', name: '灵丹', icon: '🏺', poolId: 'medicine', desc: '主线2道具' },
    { id: 'm3', name: '神笔', icon: '🖌️', poolId: 'stationery', desc: '主线3道具' },
    { id: 'm4', name: '金铲铲', icon: '🔱', poolId: 'kitchenware', desc: '主线4道具' },
    { id: 'm5', name: '特斯拉', icon: '🚘', poolId: 'electronics', desc: '主线5道具' },
];

export const INITIAL_GAME_CONFIG = {
    affixes: INITIAL_AFFIXES_CONFIG,
    rarity: INITIAL_RARITY_CONFIG,
    pools: INITIAL_POOLS_DATA,
    stages: INITIAL_STAGE_CONFIG,
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
        "initialGold": 999,
        // Removed initialTickets
        "mainlineChance": 0.5,
        "mainlineDropRate": 0.4,
        "mainlineFillerLegendaryRate": 0.1
    }
};
