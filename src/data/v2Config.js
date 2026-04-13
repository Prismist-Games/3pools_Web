/**
 * v2Config.js — v2 data foundations
 * Stickers, out-of-game items, orders, walls, expeditions
 */

// --- 贴纸类型 ---
export const STICKER_TYPES = [
    { id: 'mountain',  icon: '🏔️', name: '山' },
    { id: 'sea',       icon: '🌊', name: '海' },
    { id: 'field',     icon: '🌾', name: '田' },
    { id: 'forest',    icon: '🌲', name: '林' },
    { id: 'sky',       icon: '🌤️', name: '空' },
    { id: 'island',    icon: '🏝️', name: '岛' },
    { id: 'desert',    icon: '🏜️', name: '沙' },
    { id: 'snow',      icon: '❄️', name: '雪' },
    { id: 'fire',      icon: '🔥', name: '火' },
    { id: 'lightning', icon: '⚡', name: '电' },
    { id: 'star',      icon: '⭐', name: '星' },
    { id: 'moon',      icon: '🌙', name: '月' },
    { id: 'flower',    icon: '🌸', name: '花' },
    { id: 'wind',      icon: '🌪️', name: '风' },
    { id: 'rain',      icon: '🌧️', name: '雨' },
    { id: 'sun',       icon: '☀️', name: '日' },
    { id: 'river',     icon: '🏞️', name: '河' },
    { id: 'volcano',   icon: '🌋', name: '岩' },
    { id: 'rainbow',   icon: '🌈', name: '虹' },
    { id: 'crystal',   icon: '💎', name: '晶' },
];

// --- 食材与厨具 ---
// 按分值分成4个tier：1/2/3/5分
export const OUT_OF_GAME_ITEMS = [
    // 1分 — 调料 & 酱料
    { id: 'salt',      icon: '🧂', name: '盐',     score: 1 },
    { id: 'butter',    icon: '🧈', name: '黄油',   score: 1 },
    { id: 'soy',       icon: '🫗', name: '酱油',   score: 1 },
    { id: 'olive_oil', icon: '🫒', name: '橄榄油', score: 1 },
    { id: 'cream',     icon: '🥛', name: '奶油',   score: 1 },
    { id: 'vinegar',   icon: '🍶', name: '醋',     score: 1 },
    { id: 'sugar',     icon: '🍬', name: '糖',     score: 1 },
    // 2分 — 香料 & 蔬果
    { id: 'garlic',    icon: '🧄', name: '大蒜',   score: 2 },
    { id: 'ginger',    icon: '🫚', name: '姜',     score: 2 },
    { id: 'chili',     icon: '🌶️', name: '辣椒',   score: 2 },
    { id: 'onion',     icon: '🧅', name: '洋葱',   score: 2 },
    { id: 'tomato',    icon: '🍅', name: '番茄',   score: 2 },
    { id: 'lemon',     icon: '🍋', name: '柠檬',   score: 2 },
    { id: 'mushroom',  icon: '🍄', name: '蘑菇',   score: 2 },
    { id: 'potato',    icon: '🥔', name: '土豆',   score: 2 },
    { id: 'veggie',    icon: '🥬', name: '蔬菜',   score: 2 },
    { id: 'corn',      icon: '🌽', name: '玉米',   score: 2 },
    // 1分 — 主食 & 基底
    { id: 'rice',      icon: '🍚', name: '米饭',   score: 1 },
    { id: 'noodle',    icon: '🍜', name: '面条',   score: 1 },
    { id: 'flour',     icon: '🌾', name: '面粉',   score: 1 },
    // 2分 — 普通食材
    { id: 'bread',     icon: '🍞', name: '面包',   score: 2 },
    { id: 'cheese',    icon: '🧀', name: '芝士',   score: 2 },
    { id: 'tofu',      icon: '🫘', name: '豆腐',   score: 2 },
    { id: 'egg',       icon: '🥚', name: '鸡蛋',   score: 2 },
    { id: 'chicken',   icon: '🍗', name: '鸡肉',   score: 2 },
    { id: 'pork',      icon: '🥓', name: '猪肉',   score: 2 },
    // 3分 — 优质食材
    { id: 'beef',      icon: '🥩', name: '牛肉',   score: 3 },
    { id: 'lamb',      icon: '🍖', name: '羊肉',   score: 3 },
    { id: 'fish',      icon: '🐟', name: '鱼',     score: 3 },
    { id: 'shrimp',    icon: '🦐', name: '虾',     score: 3 },
    { id: 'salmon',    icon: '🍣', name: '三文鱼', score: 3 },
    // 5分 — 珍稀食材
    { id: 'lobster',   icon: '🦞', name: '龙虾',   score: 5 },
    { id: 'truffle',   icon: '🫕', name: '松露',   score: 5 },
    // 5分 — 厨具
    { id: 'knife',     icon: '🔪', name: '主厨刀', score: 5 },
    { id: 'pan',       icon: '🍳', name: '铸铁锅', score: 5 },
    { id: 'pot',       icon: '🫕', name: '砂锅',   score: 5 },
];

// --- 订单模板 ---
// 奖励物品 1-3 个，数量呈正态分布（2个最多，1/3个较少）
// 同总分下，物品越少 = 占菜篮格子越少 = 越高效 = 越难获取
export const ORDER_TEMPLATES = [
    // 1 个奖励 (~25%)
    { id: 'a', difficulty: 'easy',    rewardTiers: [1],       totalStickers: 2, stickerTypes: 1, weight: 8  },
    { id: 'b', difficulty: 'medium',  rewardTiers: [2],       totalStickers: 3, stickerTypes: 2, weight: 7  },
    { id: 'c', difficulty: 'hard',    rewardTiers: [3],       totalStickers: 4, stickerTypes: 3, weight: 5  },
    { id: 'd', difficulty: 'extreme', rewardTiers: [5],       totalStickers: 6, stickerTypes: 4, weight: 3  },
    // 2 个奖励 (~50%)
    { id: 'e', difficulty: 'easy',    rewardTiers: [1, 1],    totalStickers: 3, stickerTypes: 1, weight: 14 },
    { id: 'f', difficulty: 'medium',  rewardTiers: [1, 2],    totalStickers: 4, stickerTypes: 2, weight: 12 },
    { id: 'g', difficulty: 'medium',  rewardTiers: [2, 2],    totalStickers: 4, stickerTypes: 2, weight: 10 },
    { id: 'h', difficulty: 'hard',    rewardTiers: [2, 3],    totalStickers: 5, stickerTypes: 3, weight: 8  },
    // 3 个奖励 (~25%)
    { id: 'i', difficulty: 'easy',    rewardTiers: [1, 1, 1], totalStickers: 3, stickerTypes: 1, weight: 8  },
    { id: 'j', difficulty: 'medium',  rewardTiers: [1, 1, 2], totalStickers: 4, stickerTypes: 2, weight: 7  },
    { id: 'k', difficulty: 'hard',    rewardTiers: [1, 1, 3], totalStickers: 5, stickerTypes: 3, weight: 5  },
    { id: 'l', difficulty: 'extreme', rewardTiers: [1, 2, 3], totalStickers: 6, stickerTypes: 3, weight: 3  },
];

// --- 墙类型定义 ---
export const WALL_TYPES = [
    { id: 'hidden',      name: '神秘面纱', icon: '🎭', desc: '有些格子被面纱盖住。抽它们旁边的东西，面纱就会被掀开。', weight: 20, hiddenRatio: 0.3 },
    { id: 'multiplier',  name: '双倍惊喜', icon: '✨', desc: '有些格子上画着加倍标记——抽到它们，收获变成两份！', weight: 15, multiplierRatio: 0.2 },
    { id: 'alternating', name: '交叉问答', icon: '🔀', desc: '行和列不能连抽。抽完一行就得挑一列，反过来也一样。', weight: 20 },
    { id: 'center_rotate', name: '转盘中心', icon: '🎡', desc: '中间四个格子是个小转盘。你每抽一次，它就顺时针转一格。', weight: 15 },
    { id: 'conveyor',      name: '传送带',   icon: '➡️', desc: '其中一排像上了传送带——每抽一次就往前挪一格，走到尽头会从另一头绕回来。', weight: 15 },
    { id: 'savage_growth', name: '野蛮生长', icon: '🌱', desc: '抽到什么东西，它旁边四个格子就会跟着变成一模一样的。', weight: 15 },
    { id: 'blast_heal',    name: '爆裂愈合', icon: '💣', desc: '抽完之后，原地会冒出一颗新炸弹。越抽越多，越抽越危险！', weight: 15 },
    { id: 'yin_yang',      name: '阴阳轮转', icon: '☯️', desc: '墙上只有两种贴纸。抽到一种，它就会变成另一种。', weight: 15 },
    { id: 'mirror',        name: '镜花水月', icon: '🪞', desc: '左右两半像镜子里的倒影。抽一格，对面那格也一起到手。', weight: 15, goldOverride: 3 },
    { id: 'blessing_heal', name: '祝福愈合', icon: '🙏', desc: '抽完之后，原地会爆出一颗膨化格。膨化格周围的东西，抽到都会变多哦！', weight: 15 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,     // 每局游戏远征次数
    scoreToWin: 30,         // 胜利所需总分
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 5,    // 货架最大订单数
    maxActive: 3,           // 玩家最多持有订单数
    newPerTurn: 1,          // 每回合新增订单数
    initialCount: 4,        // 游戏开始时的初始订单数
};

// --- 墙贴纸数量范围 ---
export const WALL_STICKER_COUNT = {
    min: 3,
    max: 4,
};
