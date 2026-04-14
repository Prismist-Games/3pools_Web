/**
 * slotCards.js — 插槽卡系统 (Slot Card System)
 *
 * Three card types:
 *   - 利润卡 (profit): fill sticker slots → at evacuation, convert to out-of-game items
 *   - 危险卡 (danger): fill sticker slots before turn end → or lose 1 life (auto-generated each turn)
 *   - 撤离卡 (evacuation): fill all slots (any sticker type) → enables evacuation (one per expedition, cannot be removed)
 *
 * Cards carry slots that require specific sticker types (or 'any' for evacuation).
 * Players fill slots by consuming stickers from inventory. Unfilling returns the sticker.
 */

import { STICKER_TYPES, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES } from './v2Config';

// =============================================
// CONFIGURATION
// =============================================

/** Slot counts by card type */
export const SLOT_CARD_CONFIG = {
    profit: {
        minSlots: 2,
        maxSlots: 3,
    },
    danger: {
        minSlots: 1,
        maxSlots: 1,
    },
    evacuation: {
        minSlots: 8,
        maxSlots: 8,
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
 * @param {'profit' | 'danger' | 'evacuation'} type - Card type
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

    // Evacuation cards: all slots accept any sticker type
    if (type === 'evacuation') {
        const slots = [];
        for (let i = 0; i < slotCount; i++) {
            slots.push({
                stickerType: 'any',
                filled: false,
                filledStickerUid: null,
                filledStickerType: null, // stores the actual sticker type placed (for display/unfill)
            });
        }

        return {
            id: `slot_${type}_${generateUID()}`,
            type,
            slots,
        };
    }

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
// CARD QUERIES
// =============================================

/** Check if all slots on a card are filled */
export function isCardComplete(card) {
    return card.slots.every(s => s.filled);
}

/** Count filled / total slots */
export function getCardProgress(card) {
    const filled = card.slots.filter(s => s.filled).length;
    return { filled, total: card.slots.length };
}

/**
 * Get a summary of sticker types needed (unfilled) on a card.
 * Returns: { [stickerType]: count }
 */
export function getUnfilledRequirements(card) {
    const needs = {};
    for (const slot of card.slots) {
        if (!slot.filled) {
            const key = slot.stickerType; // 'any' will appear as a key for evacuation cards
            needs[key] = (needs[key] || 0) + 1;
        }
    }
    return needs;
}

/**
 * Check if a sticker from inventory can fill a specific slot on a card.
 * @param {object} card - The slot card
 * @param {number} slotIndex - Index of the slot to fill
 * @param {object} stickerItem - Inventory item (must have isSticker + stickerId)
 * @returns {boolean}
 */
export function canFillSlot(card, slotIndex, stickerItem) {
    const slot = card.slots[slotIndex];
    if (!slot) return false;
    if (slot.filled) return false;
    if (!stickerItem?.isSticker) return false;
    // 'any' type slots accept any sticker
    if (slot.stickerType === 'any') return true;
    return stickerItem.stickerId === slot.stickerType;
}

/**
 * Find the first unfilled slot on a card that matches a given sticker type.
 * Returns slot index, or -1 if none found.
 */
export function findMatchingSlot(card, stickerType) {
    return card.slots.findIndex(s => !s.filled && (s.stickerType === stickerType || s.stickerType === 'any'));
}

/**
 * Get sticker type info (icon, name) by sticker ID.
 * Useful for rendering slot requirements.
 */
export function getStickerTypeInfo(stickerTypeId) {
    return STICKER_TYPES.find(s => s.id === stickerTypeId) || null;
}
