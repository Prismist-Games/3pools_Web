import { ORDER_TEMPLATES, OUT_OF_GAME_ITEMS } from './v2Config';

/**
 * growthOrders.js — 6 growth orders (成长订单) that unlock new walls.
 *
 * L2 orders (A/B/C): always active. Completing one rewards a L2 wall.
 * L3 orders (D/E/F): VISIBLE but LOCKED until at least 1 L2 order is completed.
 *
 * Submission rules:
 *   - Order is 'ready' when stickers held ≥ all requirements
 *   - Ready orders show a 提交 button — must be confirmed manually (not auto-submitted)
 *   - On submit, stickers are consumed and the reward wall is added to the pool deck
 *     (face-down; appears on next 翻开新池)
 *
 * Requirement shape:
 *   groups: array of { stickerIds: string[], count: number }
 *     meaning: count stickers drawn from the stickerIds set (any split)
 *
 * Reward shape:
 *   wallId: poolTypes.js id
 */

export const GROWTH_ORDERS = [
    // ===== L2 orders =====
    {
        id: 'A',
        label: 'A',
        layer: 2,
        name: '订单 A',
        description: '5 × 🔥/🌀',
        groups: [
            { stickerIds: ['fire', 'vortex'], count: 5 },
        ],
        reward: { wallId: 'electronics' },
        rewardHint: '解锁 电子展 (★-★★★ 食材)',
    },
    {
        id: 'B',
        label: 'B',
        layer: 2,
        name: '订单 B',
        description: '5 × ☀️/💧',
        groups: [
            { stickerIds: ['sun', 'water'], count: 5 },
        ],
        reward: { wallId: 'luxury' },
        rewardHint: '解锁 奢侈品展 (★★-★★★ 食材)',
    },
    {
        id: 'C',
        label: 'C',
        layer: 2,
        name: '订单 C',
        description: '5 × 🌱/🪨',
        groups: [
            { stickerIds: ['seed', 'stone'], count: 5 },
        ],
        reward: { wallId: 'home' },
        rewardHint: '解锁 家居展 (★★-★★★ 食材)',
    },

    // ===== L3 orders — locked until any L2 order completed =====
    {
        id: 'D',
        label: 'D',
        layer: 3,
        name: '订单 D',
        description: '3 × ❄️/💨 + 2 × 🔥/🌀',
        groups: [
            { stickerIds: ['ice', 'wind'], count: 3 },
            { stickerIds: ['fire', 'vortex'], count: 2 },
        ],
        reward: { wallId: 'vehicle' },
        rewardHint: '解锁 载具展 (★★★-★★★★ 食材)',
    },
    {
        id: 'E',
        label: 'E',
        layer: 3,
        name: '订单 E',
        description: '3 × ❄️/💨 + 2 × ☀️/💧',
        groups: [
            { stickerIds: ['ice', 'wind'], count: 3 },
            { stickerIds: ['sun', 'water'], count: 2 },
        ],
        reward: { wallId: 'premium' },
        rewardHint: '解锁 高档墙 (★★★-★★★★★ 食材)',
    },
    {
        id: 'F',
        label: 'F',
        layer: 3,
        name: '订单 F',
        description: '3 × ❄️/💨 + 2 × 🌱/🪨',
        groups: [
            { stickerIds: ['ice', 'wind'], count: 3 },
            { stickerIds: ['seed', 'stone'], count: 2 },
        ],
        reward: { wallId: 'rare' },
        rewardHint: '解锁 稀有墙 (★★★★-★★★★★ 食材)',
    },
];

/** Count stickers per id in the inventory. */
export function getStickerCounts(inventory) {
    const counts = {};
    for (const item of inventory) {
        if (item?.isSticker && item.stickerId) {
            counts[item.stickerId] = (counts[item.stickerId] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Compute the current progress for each requirement group on an order.
 * Returns: array of { need, have } objects aligned to order.groups.
 */
export function getOrderProgress(order, inventory) {
    const counts = getStickerCounts(inventory);
    return order.groups.map(g => {
        let have = 0;
        for (const sid of g.stickerIds) have += counts[sid] || 0;
        return { need: g.count, have: Math.min(g.count, have) };
    });
}

/** Is the order ready for submission (requirements met)? */
export function isOrderReady(order, inventory) {
    const progress = getOrderProgress(order, inventory);
    return progress.every(p => p.have >= p.need);
}

/** The 6 basic sticker IDs eligible for score orders (excludes rare ❄️💨). */
export const GOLD_ORDER_STICKER_IDS = ['sun', 'water', 'fire', 'seed', 'stone', 'vortex'];

// =============================================
// SCORE ORDERS (得分订单) — procedurally generated encounters
// =============================================

/**
 * Generate a single score order.
 * Uses ORDER_TEMPLATES for structure and OUT_OF_GAME_ITEMS for rewards.
 * Shape is compatible with getOrderProgress / isOrderReady helpers:
 *   { type: 'score_order', id, groups, rewardItems, totalStars, difficulty }
 */
export function generateScoreOrder() {
    // 1. Pick a template by weighted random
    const totalWeight = ORDER_TEMPLATES.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * totalWeight;
    let template = ORDER_TEMPLATES[ORDER_TEMPLATES.length - 1];
    for (const t of ORDER_TEMPLATES) {
        roll -= t.weight;
        if (roll <= 0) { template = t; break; }
    }

    // 2. Build reward items from rewardTiers
    const rewardItems = template.rewardTiers.map(tier => {
        const candidates = OUT_OF_GAME_ITEMS.filter(i => i.stars === tier);
        if (candidates.length === 0) return OUT_OF_GAME_ITEMS[0]; // fallback
        return { ...candidates[Math.floor(Math.random() * candidates.length)] };
    });
    const totalStars = rewardItems.reduce((sum, i) => sum + (i.stars || 0), 0);

    // 3. Build sticker requirements
    //    Pick `stickerTypes` distinct sticker IDs, distribute `totalStickers` across them
    const typeCount = Math.min(template.stickerTypes, GOLD_ORDER_STICKER_IDS.length);
    const shuffled = [...GOLD_ORDER_STICKER_IDS].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, typeCount);

    // Each type needs at least 1; distribute remaining randomly
    const counts = picked.map(() => 1);
    let remaining = template.totalStickers - typeCount;
    for (let i = 0; i < remaining; i++) {
        counts[Math.floor(Math.random() * typeCount)]++;
    }

    const groups = picked.map((sid, i) => ({
        stickerIds: [sid],
        count: counts[i],
    }));

    const id = 'score_' + Math.random().toString(36).substr(2, 6);
    return {
        type: 'score_order',
        id,
        groups,
        rewardItems,
        totalStars,
        difficulty: template.difficulty,
    };
}
