/**
 * v2Config.js — v2 data foundations
 * Stickers (raw ingredients), out-of-game items (food ingredients/seasonings), orders, expeditions
 */

// --- 印花类型（自然元素）---
export const STICKER_TYPES = [
    { id: 'sun',     icon: '☀️', name: '阳光' },
    { id: 'water',   icon: '💧', name: '水滴' },
    { id: 'fire',    icon: '🔥', name: '火焰' },
    { id: 'wind',    icon: '💨', name: '清风' },
    { id: 'seed',    icon: '🌱', name: '种子' },
    { id: 'stone',   icon: '🪨', name: '矿石' },
    { id: 'ice',     icon: '❄️', name: '冰霜' },
    { id: 'vortex',  icon: '🌀', name: '漩涡' },
];

// --- 局外物品（食材/调料）---
// 按星级分成5个tier：★/★★/★★★/★★★★/★★★★★
export const OUT_OF_GAME_ITEMS = [
    // ★ 家常必备 (8)
    { id: 'salt',       icon: '🧂', name: '食盐',     stars: 1 },
    { id: 'garlic',     icon: '🧄', name: '大蒜',     stars: 1 },
    { id: 'ginger',     icon: '🫚', name: '生姜',     stars: 1 },
    { id: 'onion',      icon: '🧅', name: '洋葱',     stars: 1 },
    { id: 'carrot',     icon: '🥕', name: '胡萝卜',   stars: 1 },
    { id: 'soysauce',   icon: '🫗', name: '酱油',     stars: 1 },
    { id: 'corn',       icon: '🌽', name: '玉米',     stars: 1 },
    { id: 'potato',     icon: '🥔', name: '土豆',     stars: 1 },
    // ★★ 常用好料 (8)
    { id: 'chili',      icon: '🌶️', name: '辣椒',    stars: 2 },
    { id: 'peanut',     icon: '🥜', name: '花生',     stars: 2 },
    { id: 'butter',     icon: '🧈', name: '黄油',     stars: 2 },
    { id: 'honey',      icon: '🍯', name: '蜂蜜',     stars: 2 },
    { id: 'douchi',     icon: '🫘', name: '豆豉',     stars: 2 },
    { id: 'chestnut',   icon: '🌰', name: '栗子',     stars: 2 },
    { id: 'citrus',     icon: '🍊', name: '柑橘',     stars: 2 },
    { id: 'broccoli',   icon: '🥦', name: '西兰花',   stars: 2 },
    // ★★★ 优质食材 (7)
    { id: 'shrimp',     icon: '🦐', name: '鲜虾',     stars: 3 },
    { id: 'avocado',    icon: '🥑', name: '牛油果',   stars: 3 },
    { id: 'oliveoil',   icon: '🫒', name: '橄榄油',   stars: 3 },
    { id: 'coconut',    icon: '🥥', name: '椰奶',     stars: 3 },
    { id: 'grape',      icon: '🍇', name: '葡萄',     stars: 3 },
    { id: 'mango',      icon: '🥭', name: '芒果',     stars: 3 },
    { id: 'octopus',    icon: '🐙', name: '章鱼',     stars: 3 },
    // ★★★★ 高档珍品 (6)
    { id: 'saffron',    icon: '🌸', name: '藏红花',   stars: 4 },
    { id: 'kingcrab',   icon: '🦀', name: '帝王蟹',   stars: 4 },
    { id: 'redwine',    icon: '🍷', name: '红酒',     stars: 4 },
    { id: 'ham',        icon: '🥓', name: '火腿',     stars: 4 },
    { id: 'cheese',     icon: '🧀', name: '芝士',     stars: 4 },
    { id: 'miso',       icon: '🍶', name: '味噌',     stars: 4 },
    // ★★★★★ 至臻极品 (5)
    { id: 'lobster',    icon: '🦞', name: '龙虾',     stars: 5 },
    { id: 'wagyu',      icon: '🥩', name: '和牛',     stars: 5 },
    { id: 'oyster',     icon: '🦪', name: '生蚝',     stars: 5 },
    { id: 'truffle',    icon: '🍫', name: '松露',     stars: 5 },
    { id: 'abalone',    icon: '🫕', name: '鲍鱼',     stars: 5 },
];

// --- 订单模板 ---
// 奖励物品 1-3 个，数量呈正态分布（2个最多，1/3个较少）
// 同总星下，物品越少 = 占背包格子越少 = 越高效 = 越难获取
export const ORDER_TEMPLATES = [
    // 1 个奖励 (~25%)
    { id: 'a',  difficulty: 'easy',    rewardTiers: [1],       totalStickers: 2, stickerTypes: 1, weight: 8  },
    { id: 'b',  difficulty: 'medium',  rewardTiers: [2],       totalStickers: 3, stickerTypes: 2, weight: 7  },
    { id: 'c',  difficulty: 'hard',    rewardTiers: [3],       totalStickers: 4, stickerTypes: 3, weight: 5  },
    { id: 'c2', difficulty: 'hard',    rewardTiers: [4],       totalStickers: 5, stickerTypes: 3, weight: 4  },
    { id: 'd',  difficulty: 'extreme', rewardTiers: [5],       totalStickers: 6, stickerTypes: 4, weight: 3  },
    // 2 个奖励 (~50%)
    { id: 'e',  difficulty: 'easy',    rewardTiers: [1, 1],    totalStickers: 3, stickerTypes: 1, weight: 14 },
    { id: 'f',  difficulty: 'medium',  rewardTiers: [1, 2],    totalStickers: 4, stickerTypes: 2, weight: 12 },
    { id: 'g',  difficulty: 'medium',  rewardTiers: [2, 2],    totalStickers: 4, stickerTypes: 2, weight: 10 },
    { id: 'h',  difficulty: 'hard',    rewardTiers: [2, 3],    totalStickers: 5, stickerTypes: 3, weight: 8  },
    { id: 'h2', difficulty: 'hard',    rewardTiers: [3, 4],    totalStickers: 5, stickerTypes: 3, weight: 6  },
    // 3 个奖励 (~25%)
    { id: 'i',  difficulty: 'easy',    rewardTiers: [1, 1, 1], totalStickers: 3, stickerTypes: 1, weight: 8  },
    { id: 'j',  difficulty: 'medium',  rewardTiers: [1, 1, 2], totalStickers: 4, stickerTypes: 2, weight: 7  },
    { id: 'k',  difficulty: 'hard',    rewardTiers: [1, 1, 3], totalStickers: 5, stickerTypes: 3, weight: 5  },
    { id: 'l',  difficulty: 'extreme', rewardTiers: [1, 2, 3], totalStickers: 6, stickerTypes: 3, weight: 3  },
];

// --- 墙类型定义（已废弃：v3 改为颜色系统，见 v3Config WALL_COLORS）---
// @deprecated — kept as stub to avoid import errors until useGameLogic.js is updated in Task 3
export const WALL_TYPES = [];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,     // 每局游戏远征次数
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 3,    // 公告板最大订单数
    maxActive: 3,           // 玩家最多持有订单数
    newPerTurn: 1,          // 每回合新增订单数
    initialCount: 3,        // v3: 公告牌初始满3个订单
};

// --- 墙贴纸数量范围 ---
export const WALL_STICKER_COUNT = {
    min: 2,
    max: 4,
};
