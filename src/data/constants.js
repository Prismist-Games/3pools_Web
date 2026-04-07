
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
            "2": 0,
            "3": 0,
            "4": 100
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
            "common": 0,
            "uncommon": 0.4,
            "rare": 0.45,
            "epic": 0.15,
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
    enabled: false,
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
    { id: 'rare', name: '稀有', color: 'border-blue-400 bg-blue-50 text-blue-700', dotColor: 'bg-blue-500', starColor: 'text-blue-500', shadow: 'shadow-blue-200', bonus: 0.25, recycleValue: 0 },
    { id: 'epic', name: '史诗', color: 'border-purple-400 bg-purple-50 text-purple-700', dotColor: 'bg-purple-500', starColor: 'text-purple-500', shadow: 'shadow-purple-200', bonus: 0.5, recycleValue: 0 },
    { id: 'legendary', name: '传说', color: 'border-orange-400 bg-orange-50 text-orange-700', dotColor: 'bg-orange-500', starColor: 'text-orange-500', shadow: 'shadow-orange-200', bonus: 1.0, recycleValue: 0 },
    { id: 'mythic', name: '神话', color: 'border-rose-500 bg-rose-50 text-rose-700', dotColor: 'bg-rose-500', starColor: 'text-rose-600', shadow: 'shadow-rose-200', bonus: 2.0, recycleValue: 0 }
];

// --- 填充物品：不属于任何订单，占据矩阵空位 ---
export const FILLER_ITEMS = [
    { name: '炸弹', icon: '💣' },
];

// --- 大物品目录：所有可能出现的物品 ---
export const ITEM_CATALOG = [
    // 水果
    { name: '西瓜', icon: '🍉' },
    { name: '柠檬', icon: '🍋' },
    { name: '芒果', icon: '🥭' },
    { name: '苹果', icon: '🍎' },
    { name: '葡萄', icon: '🍇' },
    { name: '樱桃', icon: '🍒' },
    { name: '草莓', icon: '🍓' },
    { name: '桃子', icon: '🍑' },
    { name: '梨', icon: '🍐' },
    { name: '香蕉', icon: '🍌' },
    { name: '菠萝', icon: '🍍' },
    { name: '椰子', icon: '🥥' },
    { name: '猕猴桃', icon: '🥝' },
    { name: '蓝莓', icon: '🫐' },
    // 蔬菜
    { name: '玉米', icon: '🌽' },
    { name: '辣椒', icon: '🌶️' },
    { name: '胡萝卜', icon: '🥕' },
    { name: '西兰花', icon: '🥦' },
    { name: '蘑菇', icon: '🍄' },
    { name: '大蒜', icon: '🧄' },
    { name: '洋葱', icon: '🧅' },
    { name: '茄子', icon: '🍆' },
    { name: '番茄', icon: '🍅' },
    { name: '土豆', icon: '🥔' },
    // 食物
    { name: '面包', icon: '🍞' },
    { name: '奶酪', icon: '🧀' },
    { name: '鸡蛋', icon: '🥚' },
    { name: '培根', icon: '🥓' },
    { name: '汉堡', icon: '🍔' },
    { name: '披萨', icon: '🍕' },
    { name: '热狗', icon: '🌭' },
    { name: '三明治', icon: '🥪' },
    { name: '煎蛋', icon: '🍳' },
    { name: '饺子', icon: '🥟' },
    { name: '寿司', icon: '🍣' },
    { name: '拉面', icon: '🍜' },
    { name: '曲奇', icon: '🍪' },
    { name: '蛋糕', icon: '🎂' },
    { name: '冰淇淋', icon: '🍦' },
    { name: '甜甜圈', icon: '🍩' },
    { name: '巧克力', icon: '🍫' },
    { name: '糖果', icon: '🍬' },
    { name: '棒棒糖', icon: '🍭' },
    { name: '蜂蜜', icon: '🍯' },
    { name: '爆米花', icon: '🍿' },
    { name: '年糕', icon: '🍡' },
    { name: '仙贝', icon: '🍘' },
    // 饮品
    { name: '咖啡', icon: '☕' },
    { name: '绿茶', icon: '🍵' },
    { name: '奶茶', icon: '🧋' },
    { name: '果汁', icon: '🧃' },
    { name: '啤酒', icon: '🍺' },
    { name: '红酒', icon: '🍷' },
    { name: '鸡尾酒', icon: '🍸' },
    // 动物
    { name: '猫咪', icon: '🐱' },
    { name: '小狗', icon: '🐶' },
    { name: '兔子', icon: '🐰' },
    { name: '熊猫', icon: '🐼' },
    { name: '狐狸', icon: '🦊' },
    { name: '独角兽', icon: '🦄' },
    { name: '龙', icon: '🐲' },
    { name: '蝴蝶', icon: '🦋' },
    { name: '海豚', icon: '🐬' },
    { name: '企鹅', icon: '🐧' },
    { name: '猫头鹰', icon: '🦉' },
    { name: '鲸鱼', icon: '🐋' },
    { name: '章鱼', icon: '🐙' },
    { name: '螃蟹', icon: '🦀' },
    { name: '乌龟', icon: '🐢' },
    { name: '蜗牛', icon: '🐌' },
    { name: '瓢虫', icon: '🐞' },
    { name: '松鼠', icon: '🐿️' },
    { name: '刺猬', icon: '🦔' },
    { name: '鹦鹉', icon: '🦜' },
    { name: '火烈鸟', icon: '🦩' },
    { name: '河马', icon: '🦛' },
    // 自然
    { name: '向日葵', icon: '🌻' },
    { name: '玫瑰', icon: '🌹' },
    { name: '樱花', icon: '🌸' },
    { name: '四叶草', icon: '🍀' },
    { name: '仙人掌', icon: '🌵' },
    { name: '枫叶', icon: '🍁' },
    { name: '栗子', icon: '🌰' },
    { name: '雪花', icon: '❄️' },
    { name: '彩虹', icon: '🌈' },
    { name: '闪电', icon: '⚡' },
    { name: '火焰', icon: '🔥' },
    { name: '水滴', icon: '💧' },
    { name: '星星', icon: '⭐' },
    { name: '月亮', icon: '🌙' },
    { name: '太阳', icon: '☀️' },
    { name: '贝壳', icon: '🐚' },
    { name: '珊瑚', icon: '🪸' },
    // 宝物与奇物
    { name: '钥匙', icon: '🔑' },
    { name: '灯泡', icon: '💡' },
    { name: '望远镜', icon: '🔭' },
    { name: '指南针', icon: '🧭' },
    { name: '沙漏', icon: '⏳' },
    { name: '船锚', icon: '⚓' },
    { name: '宝石', icon: '💎' },
    { name: '皇冠', icon: '👑' },
    { name: '魔法棒', icon: '🪄' },
    { name: '水晶球', icon: '🔮' },
    { name: '地图', icon: '🗺️' },
    { name: '羽毛', icon: '🪶' },
    { name: '蜡烛', icon: '🕯️' },
    { name: '铃铛', icon: '🔔' },
    { name: '骰子', icon: '🎲' },
    { name: '调色板', icon: '🎨' },
    { name: '齿轮', icon: '⚙️' },
    { name: '盾牌', icon: '🛡️' },
    { name: '卷轴', icon: '📜' },
    { name: '试管', icon: '🧪' },
    { name: '磁铁', icon: '🧲' },
    { name: '梯子', icon: '🪜' },
    { name: '镜子', icon: '🪞' },
    { name: '线团', icon: '🧶' },
    // 乐器与玩具
    { name: '吉他', icon: '🎸' },
    { name: '小提琴', icon: '🎻' },
    { name: '鼓', icon: '🥁' },
    { name: '喇叭', icon: '📯' },
    { name: '风筝', icon: '🪁' },
    { name: '气球', icon: '🎈' },
    { name: '礼物', icon: '🎁' },
    { name: '泰迪熊', icon: '🧸' },
    { name: '弹珠', icon: '🔵' },
    // 现代物品
    { name: '手机', icon: '📱' },
    { name: '耳机', icon: '🎧' },
    { name: '电脑', icon: '💻' },
    { name: '相机', icon: '📷' },
    { name: '手表', icon: '⌚' },
    { name: '电池', icon: '🔋' },
    { name: '卫星', icon: '🛰️' },
    { name: '火箭', icon: '🚀' },
    { name: '机器人', icon: '🤖' },
    // 文具与书
    { name: '铅笔', icon: '✏️' },
    { name: '笔记本', icon: '📒' },
    { name: '童话书', icon: '📕' },
    { name: '剪刀', icon: '✂️' },
    // 医疗与科学
    { name: '显微镜', icon: '🔬' },
    { name: '胶囊', icon: '💊' },
    { name: '注射器', icon: '💉' },
    { name: 'DNA', icon: '🧬' },
    // 运动
    { name: '足球', icon: '⚽' },
    { name: '篮球', icon: '🏀' },
    { name: '乒乓球拍', icon: '🏓' },
    { name: '奖杯', icon: '🏆' },
    // 厨具
    { name: '菜刀', icon: '🔪' },
    { name: '汤勺', icon: '🥄' },
    // 交通
    { name: '帆船', icon: '⛵' },
    { name: '自行车', icon: '🚲' },
    // 其他奇物
    { name: '锤子', icon: '🔨' },
    { name: '信封', icon: '✉️' },
    { name: '放大镜', icon: '🔍' },
    { name: '手电筒', icon: '🔦' },
    { name: '雨伞', icon: '☂️' },
    { name: '王冠', icon: '♟️' },
    { name: '回形针', icon: '📎' },
    { name: '图钉', icon: '📌' },
    { name: '锁', icon: '🔒' },
    { name: '鞭炮', icon: '🧨' },
    { name: '灯笼', icon: '🏮' },
    { name: '扇子', icon: '🪭' },
    { name: '陶罐', icon: '🏺' },
    { name: '念珠', icon: '📿' },
];

// --- 抽取效果定义 ---
export const DRAW_EFFECTS = [
    { id: 'shuffle', name: '洗牌', desc: '重新随机排列这条线上的物品位置', icon: '🔀', color: 'blue' },
    { id: 'collapse', name: '坍缩', desc: '抽取后，剩余格子全部消除（炸弹不触发）', icon: '💥', color: 'red' },
    { id: 'sweep', name: '全收', desc: '获得这条线上所有物品，但品质降为普通（炸弹会触发）', icon: '🌊', color: 'teal' },
    { id: 'springboard', name: '跳板', desc: '本次抽取不消耗金币', icon: '🆓', color: 'green' },
    { id: 'mutate', name: '变异', desc: '抽到的物品名字随机变为这条线上另一个物品', icon: '🎭', color: 'purple' },
    { id: 'copy', name: '复制', desc: '抽到的物品获得两份', icon: '✨', color: 'gold' },
    { id: 'charge', name: '充能', desc: '抽取后，另一方向所有物品品质+1（持续一回合）', icon: '⚡', color: 'amber' },
    { id: 'unlock', name: '解放', desc: '下次抽取可自由选择任意行或列', icon: '🔓', color: 'emerald' },
    { id: 'seal', name: '封印', desc: '冻结这条线上的物品，3次抽取内不可被抽到', icon: '❄️', color: 'cyan' },
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

    // 难度阈值：积分达到阈值时提升难度
    difficultyThresholds: {
        1: 7,
        2: 10,
        3: 13,
        4: 16,
        5: 19,
        6: 22,
        7: 25,
        8: 28,
        9: 31,
        10: 34
    },

    // 撤离订单截止期限
    deadline: 15,

    // 生命值系统
    health: {
        enabled: true,
        maxHealth: 1,
        decreaseOnTimeout: 1
    },

    // 急迫度系统
    impatience: {
        enabled: true,
        maxValue: 1,
        increaseOnTimeout: 1
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
    },
    starScoreMultiplier: 1.5,
    starWeights: {
        "0-0": 0,
        "0-1": 1,
        "1-2": 0,
        "2-3": 4,
        "3-4": 7,
        "4-5": 10,
        "0.5-1": 3,
        "2-2.5": 10,
        "2.5-3": 18
    }
};

export const INITIAL_GAME_CONFIG = {
    affixes: INITIAL_AFFIXES_CONFIG,
    rarity: INITIAL_RARITY_CONFIG,
    catalog: ITEM_CATALOG,
    stages: INITIAL_STAGE_CONFIG,
    progress: SCORE_PROGRESS_CONFIG,
    emergency: EMERGENCY_ORDER_CONFIG,
    toolItems: TOOL_ITEM_CONFIG,
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
        "initialGold": 20,
        "initialRefreshCount": 3,
        "maxRefreshCount": 3,
        "matrixOrderItemChance": 0.85
    }
};

