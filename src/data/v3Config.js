/**
 * v3Config.js — v3 data foundations
 * Wall colors, unlock templates, doom phases, initial state
 */

// --- 墙颜色配置 ---
// 每种颜色定义格子数量分布（总计 25 格）
// negative 拆分为：resolution(💀) + accumulation(⬛) + damage(💥)
export const WALL_COLORS = {
    brown: {
        id: 'brown',
        icon: '🟫',
        name: '棕色',
        sticker: 10,
        gold: 6,
        negative: 5,        // 2💀 + 2⬛ + 1💥
        negativeBreakdown: { resolution: 2, accumulation: 2, damage: 1 },
        evacuationRange: [0, 1],
        stickerRange: [2, 3],
    },
    yellow: {
        id: 'yellow',
        icon: '🟨',
        name: '黄色',
        sticker: 8,
        gold: 9,
        negative: 5,        // 2💀 + 2⬛ + 1💥
        negativeBreakdown: { resolution: 2, accumulation: 2, damage: 1 },
        evacuationRange: [0, 1],
        stickerRange: [2, 3],
    },
    green: {
        id: 'green',
        icon: '🟩',
        name: '绿色',
        sticker: 15,
        gold: 2,
        negative: 5,        // 2💀 + 2⬛ + 1💥
        negativeBreakdown: { resolution: 2, accumulation: 2, damage: 1 },
        evacuationRange: [0, 1],
        stickerRange: [3, 4],
    },
    red: {
        id: 'red',
        icon: '🟥',
        name: '红色',
        sticker: 9,
        gold: 3,
        negative: 9,        // 3💀 + 3⬛ + 3💥
        negativeBreakdown: { resolution: 3, accumulation: 3, damage: 3 },
        evacuationRange: [1, 1],
        stickerRange: [2, 3],
    },
    blue: {
        id: 'blue',
        icon: '🟦',
        name: '蓝色',
        sticker: 13,
        gold: 3,
        negative: 3,        // 1💀 + 1⬛ + 1💥
        negativeBreakdown: { resolution: 1, accumulation: 1, damage: 1 },
        evacuationRange: [0, 1],
        stickerRange: [2, 4],
    },
};

// --- 解锁条件模板 ---
// drawOnly: 仅需抽取次数
// drawAndGold: 需要抽取次数 + 金币
export const UNLOCK_TEMPLATES = {
    drawOnly: [
        { draws: 3 },
        { draws: 4 },
        { draws: 5 },
        { draws: 6 },
        { draws: 7 },
        { draws: 8 },
        { draws: 10 },
    ],
    drawAndGold: [
        { draws: 3, gold: 3 },
        { draws: 4, gold: 3 },
        { draws: 5, gold: 5 },
        { draws: 8, gold: 5 },
    ],
};

// --- 厄运阶段配置 ---
// interval: Infinity = 不积累；数值 N = 每 N 回合积累 1 次
export const DOOM_PHASES = [
    { name: '安全',   nameEn: 'Safe',   turnRange: [1, 4],   interval: Infinity },
    { name: '缓慢',   nameEn: 'Slow',   turnRange: [5, 8],   interval: 2        },
    { name: '加速',   nameEn: 'Fast',   turnRange: [9, 12],  interval: 1        },
    { name: '危险',   nameEn: 'Danger', turnRange: [13, Infinity], interval: 1  },
];

// --- 厄运结算抽取数（按回合数）---
export const DOOM_RESOLUTION_DRAWS = [
    { turnRange: [1, 6],   draws: 1 },
    { turnRange: [7, 12],  draws: 2 },
    { turnRange: [13, Infinity], draws: 3 },
];

// --- v3 初始状态 ---
export const V3_INITIAL_STATE = {
    hp: 5,
    gold: 5,
    refreshCount: 1,
    backpackCapacity: 15,
    doomGridSize: 10,
    initialDanger: 0,
};
