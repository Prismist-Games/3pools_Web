/**
 * slotCards.js — Passive Matching Card System
 *
 * Three card types:
 *   - 利润卡 (profit): auto-checked at evacuation — if inventory satisfies requirements, rewards are granted
 *   - 危险卡 (danger): auto-checked at turn end — if inventory satisfies requirements, safe; otherwise lose 1 life
 *   - 撤离条件在 useGameLogic 中检查 (need EVACUATION_PROFIT_REQUIREMENT satisfied profit cards)
 *
 * Cards have requirements (sticker types/counts) but stickers are NEVER consumed.
 * The same sticker can satisfy multiple cards simultaneously.
 * The constraint is backpack SPACE (15 slots), not sticker consumption.
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
 * Difficulty tiers for profit cards.
 * Maps slot count to reward tier ranges (star levels of OUT_OF_GAME_ITEMS).
 * More slots → higher tier rewards.
 */
const PROFIT_REWARD_TIERS = [
    // slots → which ORDER_TEMPLATE difficulties to reference
    { slots: 2, difficulties: ['easy'] },
    { slots: 3, difficulties: ['easy', 'medium'] },
];

// =============================================
// HELPERS
// =============================================

function generateUID() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Pick N random distinct sticker type IDs */
function pickRandomStickerTypes(count) {
    const shuffled = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(s => s.id);
}

/** Pick a random item from an array */
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate reward items for a profit card based on slot count.
 * Uses ORDER_TEMPLATES to determine difficulty → reward tiers,
 * then picks random OUT_OF_GAME_ITEMS at those tiers.
 */
function generateProfitReward(slotCount) {
    // Find matching tier config
    const tierConfig = PROFIT_REWARD_TIERS.find(t => t.slots === slotCount)
        || PROFIT_REWARD_TIERS[PROFIT_REWARD_TIERS.length - 1];

    // Pick a matching ORDER_TEMPLATE by difficulty, capped at 2 reward items
    const matchingTemplates = ORDER_TEMPLATES.filter(
        t => tierConfig.difficulties.includes(t.difficulty) && t.rewardTiers.length <= 2
    );
    const template = matchingTemplates.length > 0
        ? pickRandom(matchingTemplates)
        : pickRandom(ORDER_TEMPLATES.filter(t => t.rewardTiers.length <= 2) || ORDER_TEMPLATES);

    // Generate reward items from the template's reward tiers (truncate to 2 max)
    const tiers = template.rewardTiers.slice(0, 2);
    const items = tiers.map(tier => {
        const candidates = OUT_OF_GAME_ITEMS.filter(i => i.stars === tier);
        if (candidates.length === 0) return { ...OUT_OF_GAME_ITEMS[0] };
        return { ...pickRandom(candidates) };
    });

    return { items };
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
 * @returns {object} A slot card object
 */
export function generateSlotCard(type, options = {}) {
    const config = SLOT_CARD_CONFIG[type];
    if (!config) {
        throw new Error(`Unknown slot card type: ${type}`);
    }

    // Determine slot count
    const slotCount = options.slotCount
        ?? (config.minSlots + Math.floor(Math.random() * (config.maxSlots - config.minSlots + 1)));

    // Determine how many distinct sticker types to spread across slots
    const maxTypes = type === 'profit'
        ? Math.min(3, slotCount)
        : Math.min(2, slotCount);
    const stickerTypeCount = options.stickerTypeCount
        ?? (1 + Math.floor(Math.random() * maxTypes));

    // Pick sticker types and distribute slots across them
    const chosenTypes = pickRandomStickerTypes(stickerTypeCount);

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
                filledStickerUid: null, // uid of the sticker placed here (for unfill)
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

    // Profit cards get rewards
    if (type === 'profit') {
        card.reward = generateProfitReward(slotCount);
    }

    // Danger cards track creation turn
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
 * For evacuation cards, returns { any: slotCount }.
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
