/**
 * poolTypes.js — 14 walls: 1 印花墙 + 13 tiered walls.
 *
 * ALL walls produce stickers only (no out-of-game items on walls).
 * Out-of-game items are obtained through Score Orders (得分订单),
 * which appear as encounters via the flip system.
 *
 * Walls are grouped by tier for rarity-weighted roll:
 *   Common  (★):      3 walls + 1 印花墙
 *   Uncommon (★★):    3 walls
 *   Rare (★★★):       3 walls
 *   Epic (★★★★):      2 walls
 *   Legendary (★★★★★): 2 walls
 */

// --- sticker id groupings ---
export const WALL_L1_STICKERS = ['sun', 'water', 'fire', 'wind', 'seed', 'stone', 'ice', 'vortex'];

const ALL_STICKER_WEIGHTS = {
    sun: 1, water: 1, fire: 1, wind: 1,
    seed: 1, stone: 1, ice: 1, vortex: 1,
};

// All sticker types eligible for bias on any wall
export const STICKER_BIAS_POOL = WALL_L1_STICKERS;
// Legacy alias
export const STICKER_WALL_BIAS_POOL = STICKER_BIAS_POOL;

/**
 * Roll a random sticker bias of 1-2 types for a wall instance.
 * @param {number} [count] — number of bias types (1 or 2). Defaults to random 1-2.
 * @returns {string[]} array of 1-2 sticker ids
 */
export function rollStickerBias(count) {
    const n = count ?? (2 + Math.floor(Math.random() * 2)); // 2 or 3
    const pool = [...STICKER_BIAS_POOL];
    const pick = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        pick.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return pick;
}

// Legacy alias — delegates to the new general function
export function rollStickerWallBias() {
    return rollStickerBias(2);
}

/**
 * Build sticker weight map given a bias array.
 * Biased types get weight 9 (~65-70% of sticker cells), others get weight 2 (~30-35%).
 * @param {string[]} bias — array of sticker ids to boost
 * @returns {Object} { stickerId: weight }
 */
export function buildBiasedStickerWeights(bias) {
    const weights = { ...ALL_STICKER_WEIGHTS };
    // Set all to base 2, biased to 9
    for (const id of Object.keys(weights)) weights[id] = 2;
    if (Array.isArray(bias)) {
        for (const id of bias) {
            if (id in weights) weights[id] = 9;
        }
    }
    return weights;
}

// Legacy alias
export function buildStickerWallWeights(bias) {
    return buildBiasedStickerWeights(bias);
}

/** Rarity tiers. */
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_LABEL_CN = {
    common: '★',
    uncommon: '★★',
    rare: '★★★',
    epic: '★★★★',
    legendary: '★★★★★',
};

// =============================================
// WALL DEFINITIONS
// =============================================

export const POOL_TYPES = [
    // ============ 印花墙 (common, free, sticker-focused) ============
    {
        id: 'sticker_wall',
        name: '印花墙',
        icon: '🏷️',
        tier: 'common',
        color: 'bg-green-50 border-green-300 text-green-800',
        cardBg: 'from-green-50 to-green-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 6, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },

    // ============ ★ Common walls (3 walls) ============
    {
        id: 'star1_a',
        name: '调料摊',
        icon: '🫙',
        tier: 'common',
        color: 'bg-green-50 border-green-300 text-green-800',
        cardBg: 'from-green-50 to-green-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 5, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star1_b',
        name: '菜摊',
        icon: '🥕',
        tier: 'common',
        color: 'bg-green-50 border-green-300 text-green-800',
        cardBg: 'from-green-50 to-green-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 5, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star1_c',
        name: '粮铺',
        icon: '🌽',
        tier: 'common',
        color: 'bg-green-50 border-green-300 text-green-800',
        cardBg: 'from-green-50 to-green-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 5, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },

    // ============ ★★ Uncommon walls (3 walls) ============
    {
        id: 'star2_a',
        name: '酱料铺',
        icon: '🌶️',
        tier: 'uncommon',
        color: 'bg-blue-50 border-blue-300 text-blue-800',
        cardBg: 'from-blue-50 to-blue-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star2_b',
        name: '干货行',
        icon: '🌰',
        tier: 'uncommon',
        color: 'bg-blue-50 border-blue-300 text-blue-800',
        cardBg: 'from-blue-50 to-blue-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star2_c',
        name: '果蔬园',
        icon: '🍊',
        tier: 'uncommon',
        color: 'bg-blue-50 border-blue-300 text-blue-800',
        cardBg: 'from-blue-50 to-blue-100',
        entryCost: {},
        riskLabel: '低',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },

    // ============ ★★★ Rare walls (3 walls) ============
    {
        id: 'star3_a',
        name: '渔港',
        icon: '⚓',
        tier: 'rare',
        color: 'bg-purple-50 border-purple-300 text-purple-800',
        cardBg: 'from-purple-50 to-purple-100',
        entryCost: {},
        riskLabel: '中',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star3_b',
        name: '油坊',
        icon: '🫒',
        tier: 'rare',
        color: 'bg-purple-50 border-purple-300 text-purple-800',
        cardBg: 'from-purple-50 to-purple-100',
        entryCost: {},
        riskLabel: '中',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star3_c',
        name: '果园',
        icon: '🍇',
        tier: 'rare',
        color: 'bg-purple-50 border-purple-300 text-purple-800',
        cardBg: 'from-purple-50 to-purple-100',
        entryCost: {},
        riskLabel: '中',
        drawLimit: 4, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },

    // ============ ★★★★ Epic walls (2 walls) ============
    {
        id: 'star4_a',
        name: '珍品阁',
        icon: '🏺',
        tier: 'epic',
        color: 'bg-amber-50 border-amber-400 text-amber-800',
        cardBg: 'from-amber-50 to-amber-100',
        entryCost: {},
        riskLabel: '高',
        drawLimit: 3, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star4_b',
        name: '美食坊',
        icon: '🦀',
        tier: 'epic',
        color: 'bg-amber-50 border-amber-400 text-amber-800',
        cardBg: 'from-amber-50 to-amber-100',
        entryCost: {},
        riskLabel: '高',
        drawLimit: 3, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },

    // ============ ★★★★★ Legendary walls (2 walls) ============
    {
        id: 'star5_a',
        name: '远洋号',
        icon: '🚢',
        tier: 'legendary',
        color: 'bg-orange-50 border-orange-400 text-orange-800',
        cardBg: 'from-orange-50 to-orange-100',
        entryCost: {},
        riskLabel: '极高',
        drawLimit: 3, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
    {
        id: 'star5_b',
        name: '庄园',
        icon: '🏡',
        tier: 'legendary',
        color: 'bg-orange-50 border-orange-400 text-orange-800',
        cardBg: 'from-orange-50 to-orange-100',
        entryCost: {},
        riskLabel: '极高',
        drawLimit: 3, // TODO (tuning)
        gridRules: { stickers: 16, items: 0, gold: 0, empty: 0 },
        stickerWeights: ALL_STICKER_WEIGHTS,
        stickerTypes: WALL_L1_STICKERS,
        stickerFilter: null,
    },
];

/** Look up a pool type by id. */
export function getPoolType(id) {
    return POOL_TYPES.find(p => p.id === id) || null;
}

/**
 * Generate a wall shop — N walls randomly selected from POOL_TYPES with
 * tier-weighted distribution. Each wall instance gets a random sticker bias.
 *
 * @param {number} count — number of walls to generate (default 5)
 * @param {Object} [tierWeights] — { common: w, uncommon: w, ... } override
 * @returns {Array<Object>} array of pool type instances with _bias
 */
export function generateWallShop(count = 5, tierWeights) {
    const defaultTierWeights = {
        common: 40, uncommon: 30, rare: 30, epic: 0, legendary: 0,
    };
    const weights = tierWeights || defaultTierWeights;

    // Bucket all walls by tier
    const buckets = {};
    for (const pt of POOL_TYPES) {
        const tier = pt.tier || 'common';
        if (!buckets[tier]) buckets[tier] = [];
        buckets[tier].push(pt);
    }

    // Build weighted candidate list
    const candidates = [];
    for (const [tier, weight] of Object.entries(weights)) {
        if (weight > 0 && buckets[tier] && buckets[tier].length > 0) {
            candidates.push({ tier, weight, walls: buckets[tier] });
        }
    }
    if (candidates.length === 0) return [];

    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);

    const results = [];
    for (let i = 0; i < count; i++) {
        // Weighted-random roll for tier
        let roll = Math.random() * totalWeight;
        let selectedTier = candidates[candidates.length - 1];
        for (const c of candidates) {
            if (roll < c.weight) { selectedTier = c; break; }
            roll -= c.weight;
        }

        // Uniform pick within chosen tier
        const chosenType = selectedTier.walls[Math.floor(Math.random() * selectedTier.walls.length)];

        // Every wall instance gets a random sticker bias
        const bias = rollStickerBias();
        results.push({ ...chosenType, _bias: bias });
    }

    return results;
}

/**
 * Legacy: Generate the INITIAL pool deck — 3 sticker_wall variants.
 * @deprecated Use generateWallShop instead.
 */
export function generatePoolDeck() {
    const stickerWall = getPoolType('sticker_wall');
    if (!stickerWall) return [];
    return [
        { ...stickerWall, _bias: rollStickerWallBias() },
        { ...stickerWall, _bias: rollStickerWallBias() },
        { ...stickerWall, _bias: rollStickerWallBias() },
    ];
}
