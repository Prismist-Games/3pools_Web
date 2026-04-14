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
// 每个订单奖励 1 个对应级别的食材
export const ORDER_TEMPLATES = [
    { id: 'a', difficulty: 'easy',    rewardTiers: [1], totalStickers: 2, stickerTypes: 1, weight: 5 },
    { id: 'b', difficulty: 'medium',  rewardTiers: [2], totalStickers: 3, stickerTypes: 2, weight: 5 },
    { id: 'c', difficulty: 'hard',    rewardTiers: [3], totalStickers: 4, stickerTypes: 3, weight: 5 },
    { id: 'd', difficulty: 'extreme', rewardTiers: [5], totalStickers: 6, stickerTypes: 4, weight: 2 },
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
