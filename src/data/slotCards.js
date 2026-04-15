/**
 * slotCards.js — Passive Matching Card System
 *
 * Two card types:
 *   - 利润卡 (profit): auto-checked at evacuation — if inventory satisfies requirements, rewards are granted
 *   - 危险卡 (danger): auto-checked at turn end — if inventory satisfies requirements, safe; otherwise lose 1 life
 *
 * Evacuation is gated in useGameLogic on EVACUATION_PROFIT_REQUIREMENT satisfied profit cards.
 *
 * Cards have requirements (sticker types/counts) but stickers are NEVER consumed.
 * The same sticker can satisfy multiple cards simultaneously.
 * The constraint is backpack space, not sticker consumption.
 */

import { STICKER_TYPES, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES } from './v2Config';

// =============================================
// CONFIGURATION
// =============================================

/** Number of satisfied profit cards required to evacuate. */
export const EVACUATION_PROFIT_REQUIREMENT = 3;

/** Requirement counts by card type (how many sticker slots define requirements) */
export const SLOT_CARD_CONFIG = {
    profit: {
        minSlots: 2,
        maxSlots: 3,
    },
    danger: {
        minSlots: 1,
        maxSlots: 1,
    },
};

/**
 * Required sticker count per reward star tier.
 * Multi-item vouchers get a -1 discount per extra item beyond the first.
 */
const STAR_STICKER_COUNT = { 1: 2, 2: 3, 3: 4, 4: 5 };

function computeProfitStickerCount(tiers) {
    const base = tiers.reduce((sum, tier) => sum + (STAR_STICKER_COUNT[tier] ?? 2), 0);
    const discount = Math.max(0, tiers.length - 1); // -1 per extra item
    return Math.max(2, base - discount);
}

// =============================================
// HELPERS
// =============================================

function generateUID() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Pick N random distinct sticker type IDs, optionally excluding a list of type IDs */
function pickRandomStickerTypes(count, excludeStickerTypes = []) {
    const excludeSet = new Set(excludeStickerTypes);
    let pool = STICKER_TYPES.filter(s => !excludeSet.has(s.id));
    // If exclusion leaves too few types to fulfill `count`, fall back to the full pool.
    if (pool.length < count) pool = STICKER_TYPES;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(s => s.id);
}

/** Pick a random item from an array */
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick a weighted-random item from an array of objects with a `weight` field */
function pickWeighted(arr) {
    const total = arr.reduce((sum, item) => sum + (item.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const item of arr) {
        roll -= item.weight ?? 1;
        if (roll <= 0) return item;
    }
    return arr[arr.length - 1];
}

/**
 * Generate reward items for a profit card.
 * Picks a template by weight, then derives sticker requirement from reward tiers.
 * Returns { items, stickerCount }.
 */
function generateProfitReward() {
    const candidates = ORDER_TEMPLATES.filter(t => t.rewardTiers.length === 1 && t.rewardTiers[0] <= 4);
    const template = pickWeighted(candidates.length > 0 ? candidates : ORDER_TEMPLATES);

    const tiers = template.rewardTiers.slice(0, 2);
    const items = tiers.map(tier => {
        const pool = OUT_OF_GAME_ITEMS.filter(i => i.stars === tier);
        return { ...(pool.length > 0 ? pickRandom(pool) : OUT_OF_GAME_ITEMS[0]) };
    });

    return { items, stickerCount: computeProfitStickerCount(tiers) };
}

// =============================================
// CARD GENERATION
// =============================================

/**
 * Generate a slot card.
 *
 * @param {'profit' | 'danger'} type - Card type
 * @param {object} [options]
 * @param {number} [options.slotCount] - Override slot count (otherwise random within range)
 * @param {number} [options.turnCreated] - Current turn number (for danger cards)
 * @param {number} [options.stickerTypeCount] - How many distinct sticker types to use
 *   (defaults: profit 1-3, danger 1-2 — fewer types = easier to fill)
 * @param {string[]} [options.excludeStickerTypes] - Sticker type IDs the card must NOT use
 *   (used to rotate danger-card requirements across turns)
 * @returns {object} A slot card object
 */
export function generateSlotCard(type, options = {}) {
    const config = SLOT_CARD_CONFIG[type];
    if (!config) {
        throw new Error(`Unknown slot card type: ${type}`);
    }

    // For profit cards: generate reward first, derive sticker count from tiers.
    // For danger cards: use config range directly.
    let reward = null;
    let slotCount;
    if (type === 'profit') {
        reward = generateProfitReward();
        slotCount = reward.stickerCount;
    } else {
        slotCount = options.slotCount
            ?? (config.minSlots + Math.floor(Math.random() * (config.maxSlots - config.minSlots + 1)));
    }

    // Determine how many distinct sticker types to spread across slots
    const maxTypes = type === 'profit'
        ? Math.min(3, slotCount)
        : Math.min(2, slotCount);
    const stickerTypeCount = options.stickerTypeCount
        ?? (1 + Math.floor(Math.random() * maxTypes));

    // Pick sticker types and distribute slots across them
    const chosenTypes = pickRandomStickerTypes(stickerTypeCount, options.excludeStickerTypes);

    // Build slots: distribute evenly, then assign remainder randomly
    const slotsPerType = Array(stickerTypeCount).fill(Math.floor(slotCount / stickerTypeCount));
    let remainder = slotCount - slotsPerType.reduce((a, b) => a + b, 0);
    while (remainder > 0) {
        slotsPerType[Math.floor(Math.random() * stickerTypeCount)]++;
        remainder--;
    }

    const slots = [];
    for (let typeIdx = 0; typeIdx < stickerTypeCount; typeIdx++) {
        for (let i = 0; i < slotsPerType[typeIdx]; i++) {
            slots.push({
                stickerType: chosenTypes[typeIdx],
                filled: false,
                filledStickerUid: null,
            });
        }
    }

    // Shuffle slots so same types aren't always grouped
    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    const card = {
        id: `slot_${type}_${generateUID()}`,
        type,
        slots,
    };

    if (reward) card.reward = reward;

    if (type === 'danger') {
        card.turnCreated = options.turnCreated ?? 0;
    }

    return card;
}

// =============================================
// CARD QUERIES — Passive Matching
// =============================================

/**
 * Get the requirements map for a card: { [stickerType]: count }.
 */
export function getRequirements(card) {
    const reqs = {};
    for (const slot of card.slots) {
        const key = slot.stickerType;
        reqs[key] = (reqs[key] || 0) + 1;
    }
    return reqs;
}

/**
 * Build an inventory sticker count map: { [stickerId]: count }
 * Only counts items with isSticker === true.
 */
function buildInventoryCounts(inventory) {
    const counts = {};
    for (const item of inventory) {
        if (item?.isSticker && item.stickerId) {
            counts[item.stickerId] = (counts[item.stickerId] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Check if the current inventory satisfies a card's requirements.
 * Stickers are NOT consumed — just checked for presence.
 * Each card is checked independently (same sticker can satisfy multiple cards).
 *
 * @param {object} card - A slot card with .slots array
 * @param {object[]} inventory - Player's current inventory
 * @returns {boolean} true if all requirements are met
 */
export function canSatisfyCard(card, inventory) {
    const reqs = getRequirements(card);
    const invCounts = buildInventoryCounts(inventory);

    for (const [stickerType, needed] of Object.entries(reqs)) {
        if (stickerType === 'any') {
            // 'any' — needs that many stickers of ANY type total
            const totalStickers = Object.values(invCounts).reduce((sum, n) => sum + n, 0);
            if (totalStickers < needed) return false;
        } else {
            if ((invCounts[stickerType] || 0) < needed) return false;
        }
    }
    return true;
}

/**
 * Get sticker type info (icon, name) by sticker ID.
 * Useful for rendering slot requirements.
 */
export function getStickerTypeInfo(stickerTypeId) {
    return STICKER_TYPES.find(s => s.id === stickerTypeId) || null;
}
