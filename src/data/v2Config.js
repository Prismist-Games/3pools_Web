/**
 * v2Config.js — v2 data foundations
 * Stickers, out-of-game items, orders, walls, expeditions
 */

// --- 贴纸类型 ---
export const STICKER_TYPES = [
    { id: 'mountain', icon: '🏔️', name: '山' },
    { id: 'sea',      icon: '🌊', name: '海' },
    { id: 'field',    icon: '🌾', name: '田' },
    { id: 'forest',   icon: '🌲', name: '林' },
    { id: 'sky',      icon: '🌤️', name: '空' },
    { id: 'island',   icon: '🏝️', name: '岛' },
    { id: 'desert',   icon: '🏜️', name: '沙' },
    { id: 'snow',     icon: '❄️', name: '雪' },
];

// --- 游戏外物品（出口物品）---
// 按分值分成4个tier：1/2/3/5分
export const OUT_OF_GAME_ITEMS = [
    // 1分
    { id: 'doll',     icon: '🧸', name: '玩偶',   score: 1 },
    { id: 'headset',  icon: '🎧', name: '耳机',   score: 1 },
    { id: 'sunglasses', icon: '🕶️', name: '墨镜', score: 1 },
    // 2分
    { id: 'watch',    icon: '⌚', name: '手表',   score: 2 },
    { id: 'handbag',  icon: '👜', name: '手包',   score: 2 },
    { id: 'camera',   icon: '📷', name: '相机',   score: 2 },
    // 3分
    { id: 'laptop',   icon: '💻', name: '笔记本', score: 3 },
    { id: 'dress',    icon: '👗', name: '礼服',   score: 3 },
    { id: 'ring',     icon: '💍', name: '戒指',   score: 3 },
    // 5分
    { id: 'car',      icon: '🚗', name: '汽车',   score: 5 },
    { id: 'travel',   icon: '🏝️', name: '旅行',  score: 5 },
    { id: 'house',    icon: '🏠', name: '房产',   score: 5 },
];

// --- 订单模板 ---
// 奖励物品 1-3 个，数量呈正态分布（2个最多，1/3个较少）
// 同总分下，物品越少 = 占背包格子越少 = 越高效 = 越难获取
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
    { id: 'basic',       name: '经典赛道', icon: '🎯', desc: '标准规则，行列自由选择', weight: 30 },
    { id: 'hidden',      name: '神秘面纱', icon: '🎭', desc: '部分格子内容隐藏，抽到相邻格时揭示', weight: 20, hiddenRatio: 0.3 },
    { id: 'drift',       name: '乾坤大挪移', icon: '🌀', desc: '每次抽取后，剩余格子随机移位', weight: 15 },
    { id: 'multiplier',  name: '双倍惊喜', icon: '✨', desc: '部分格子效果翻倍（贴纸×2，厄运×2）', weight: 15, multiplierRatio: 0.2 },
    { id: 'alternating', name: '交叉问答', icon: '🔀', desc: '必须行列交替选择', weight: 20 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,     // 每局游戏远征次数
    scoreToWin: 30,         // 胜利所需总分
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 5,    // 公告板最大订单数
    maxActive: 3,           // 玩家最多持有订单数
    newPerTurn: 1,          // 每回合新增订单数
    initialCount: 4,        // 游戏开始时的初始订单数
};

// --- 墙贴纸数量范围 ---
export const WALL_STICKER_COUNT = {
    min: 3,
    max: 4,
};
