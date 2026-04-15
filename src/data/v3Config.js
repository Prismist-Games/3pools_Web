/**
 * v3Config.js — wall types, AP config, initial lives
 *
 * Wall types are "draw rule variants" — each gives the wall a different
 * way to play with the same grid. Not to be confused with the earlier
 * (now retired) wall color / wall function design.
 */

// --- Wall Types (5 draw-rule variants) ---
export const WALL_TYPES = [
    { id: 'basic',       name: '经典赛道',   icon: '🎯', desc: '标准规则，行列自由选择',                           weight: 30 },
    { id: 'hidden',      name: '神秘面纱',   icon: '🎭', desc: '部分格子内容隐藏，抽到相邻格时揭示',              weight: 20, hiddenRatio: 0.3 },
    { id: 'drift',       name: '乾坤大挪移', icon: '🌀', desc: '每次抽取后，剩余格子随机移位',                    weight: 15 },
    { id: 'multiplier',  name: '双倍惊喜',   icon: '✨', desc: '部分格子效果翻倍（贴纸×2）',                      weight: 15, multiplierRatio: 0.2 },
    { id: 'alternating', name: '交叉问答',   icon: '🔀', desc: '必须行列交替选择',                                weight: 20 },
];

// --- Action Point (AP) 系统 ---
export const AP_CONFIG = {
    maxAP: 10,          // AP per turn
    drawCost: 0,        // AP cost per draw (free)
};

// --- v3 初始状态 ---
export const INITIAL_LIVES = 5;
