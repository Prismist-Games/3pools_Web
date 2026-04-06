/**
 * v2Config.js — v2 data foundations
 * Stickers, out-of-game items, orders, walls, expeditions
 */

// --- 贴纸类型 ---
export const STICKER_TYPES = [
    { id: 'star',      icon: '⭐', name: '星星' },
    { id: 'flower',    icon: '🌸', name: '花朵' },
    { id: 'lightning', icon: '⚡', name: '闪电' },
    { id: 'fire',      icon: '🔥', name: '火焰' },
    { id: 'moon',      icon: '🌙', name: '月亮' },
    { id: 'clover',    icon: '🍀', name: '四叶草' },
    { id: 'note',      icon: '🎵', name: '音符' },
    { id: 'butterfly', icon: '🦋', name: '蝴蝶' },
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

// --- 订单难度模板 ---
// 每个难度对应分值、贴纸总数量、贴纸种类数
export const ORDER_DIFFICULTY_TEMPLATES = {
    easy: {
        id: 'easy',
        name: '容易',
        score: 1,
        totalStickers: 2,
        stickerTypes: 2,
    },
    medium: {
        id: 'medium',
        name: '中等',
        score: 2,
        totalStickers: 3,
        stickerTypes: 2,
    },
    hard: {
        id: 'hard',
        name: '困难',
        score: 3,
        totalStickers: 4,
        stickerTypes: 3,
    },
    extreme: {
        id: 'extreme',
        name: '极难',
        score: 5,
        totalStickers: 6,
        stickerTypes: 4,
    },
};

// --- 订单难度权重 ---
export const ORDER_DIFFICULTY_WEIGHTS = {
    easy:    40,
    medium:  35,
    hard:    18,
    extreme:  7,
};

// --- 墙类型定义 ---
export const WALL_TYPES = [
    {
        id: 'basic',
        name: '基础墙',
        desc: '标准规则',
    },
    {
        id: 'hidden',
        name: '隐藏墙',
        desc: '大量隐藏格',
    },
    {
        id: 'drift',
        name: '漂移墙',
        desc: '抽取后格子随机移位',
    },
    {
        id: 'multiplier',
        name: '加倍墙',
        desc: '部分格子有可见倍率标记',
    },
    {
        id: 'alternating',
        name: '交替墙',
        desc: '行列交替选择',
    },
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
    initialCount: 2,        // 游戏开始时的初始订单数
};

// --- 墙贴纸数量范围 ---
export const WALL_STICKER_COUNT = {
    min: 2,
    max: 3,
};
