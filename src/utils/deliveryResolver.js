// src/utils/deliveryResolver.js

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Calculate actual durability for an item (base + quality bonus).
 */
export function getActualDurability(item, durabilityPerTier) {
    const base = item.durability || 0;
    const rarityIndex = RARITY_ORDER.indexOf(item.rarity?.id || 'common');
    return base + rarityIndex * durabilityPerTier;
}

/**
 * Prepare items for delivery — creates working copies with currentDurability.
 * @param {Array} items - inventory items assigned to the order
 * @param {number} durabilityPerTier - from DELIVERY_CONFIG
 * @returns {Array} working copies with currentDurability, destroyed, originalRarityId
 */
export function prepareDeliveryItems(items, durabilityPerTier) {
    return items.map(item => ({
        ...item,
        currentDurability: getActualDurability(item, durabilityPerTier),
        destroyed: false,
        originalRarityId: item.rarity.id,
    }));
}

/**
 * Resolve a single collision between attacker and defender.
 * Mutates defender in place. Returns collision record for animation.
 */
function resolveCollision(attacker, defender, rarityConfig) {
    if (attacker.destroyed || defender.destroyed) {
        return null; // skip
    }

    const damage = attacker.sharpness || 0;
    if (damage === 0) {
        return {
            attackerUid: attacker.uid,
            defenderUid: defender.uid,
            damage: 0,
            type: 'no_damage',
        };
    }

    const record = {
        attackerUid: attacker.uid,
        defenderUid: defender.uid,
        damage,
        durabilityBefore: defender.currentDurability,
        rarityBefore: defender.rarity.id,
        durabilityAfter: defender.currentDurability,
        rarityAfter: defender.rarity.id,
        type: 'absorb',
    };

    if (defender.currentDurability >= damage) {
        // Shield absorbs fully
        defender.currentDurability -= damage;
        record.durabilityAfter = defender.currentDurability;
        record.type = 'absorb';
    } else if (defender.currentDurability > 0) {
        // Shield breaks, quality degrades
        defender.currentDurability = 0;
        degradeQuality(defender, rarityConfig);
        record.durabilityAfter = 0;
        record.rarityAfter = defender.destroyed ? null : defender.rarity.id;
        record.type = defender.destroyed ? 'destroy' : 'pierce';
    } else {
        // No shield, direct quality hit
        degradeQuality(defender, rarityConfig);
        record.durabilityAfter = 0;
        record.rarityAfter = defender.destroyed ? null : defender.rarity.id;
        record.type = defender.destroyed ? 'destroy' : 'degrade';
    }

    return record;
}

/**
 * Degrade item quality by one tier. Common with no durability → destroyed.
 * Mutates item in place.
 */
function degradeQuality(item, rarityConfig) {
    const currentIndex = RARITY_ORDER.indexOf(item.rarity.id);
    if (currentIndex <= 0) {
        // Common → destroyed
        item.destroyed = true;
        item.rarity = null;
    } else {
        const lowerRarityId = RARITY_ORDER[currentIndex - 1];
        const lowerRarity = rarityConfig.find(r => r.id === lowerRarityId);
        item.rarity = { ...lowerRarity };
    }
}

/**
 * Resolve one bump (one direction). Returns array of collision records.
 * Mutates workingItems in place.
 */
function resolveBump(workingItems, direction, rarityConfig) {
    const activeItems = workingItems.filter(item => !item.destroyed);
    const collisions = [];

    if (direction === '→') {
        for (let i = 0; i < activeItems.length - 1; i++) {
            const collision = resolveCollision(activeItems[i], activeItems[i + 1], rarityConfig);
            if (collision) collisions.push(collision);
        }
    } else {
        for (let i = activeItems.length - 1; i > 0; i--) {
            const collision = resolveCollision(activeItems[i], activeItems[i - 1], rarityConfig);
            if (collision) collisions.push(collision);
        }
    }

    return collisions;
}

/**
 * Main entry point. Resolves full delivery sequence.
 *
 * @param {Array} items - working items (from prepareDeliveryItems)
 * @param {Array} bumps - e.g. ['→', '←', '→']
 * @param {Array} rarityConfig - from config.rarity (INITIAL_RARITY_CONFIG)
 * @returns {{ bumpHistory: Array, finalItems: Array }}
 *
 * bumpHistory[i] = {
 *   direction: '→' | '←',
 *   collisions: [{ attackerUid, defenderUid, damage, type, ... }],
 *   itemsSnapshot: [...] // deep copy of active items AFTER this bump
 * }
 */
export function resolveDelivery(items, bumps, rarityConfig) {
    const bumpHistory = [];

    for (const direction of bumps) {
        const collisions = resolveBump(items, direction, rarityConfig);

        // Snapshot active items after bump (deep copy for replay)
        const activeItems = items.filter(item => !item.destroyed);
        const snapshot = activeItems.map(item => ({
            uid: item.uid,
            name: item.name,
            icon: item.icon,
            currentDurability: item.currentDurability,
            rarity: item.rarity ? { ...item.rarity } : null,
            destroyed: item.destroyed,
            sharpness: item.sharpness,
            durability: item.durability,
        }));

        bumpHistory.push({ direction, collisions, itemsSnapshot: snapshot });
    }

    const finalItems = items.filter(item => !item.destroyed);

    return { bumpHistory, finalItems };
}

/**
 * Check if post-delivery items still satisfy order requirements.
 * @param {Array} finalItems - items after delivery (may be degraded/destroyed)
 * @param {Array} requirements - order requirements [{name, requiredRarity}, ...]
 * @param {Array} assignedUids - uid of item assigned to each requirement slot
 * @returns {{ passed: boolean, slotResults: Array }}
 */
export function evaluateDeliveryResult(finalItems, requirements, assignedUids) {
    const itemMap = new Map();
    finalItems.forEach(item => itemMap.set(item.uid, item));

    const slotResults = requirements.map((req, i) => {
        const uid = assignedUids[i];
        const item = itemMap.get(uid);

        if (!item) {
            // Item was destroyed
            return { uid, met: false, reason: 'destroyed' };
        }

        const requiredIndex = RARITY_ORDER.indexOf(req.requiredRarity.id);
        const actualIndex = RARITY_ORDER.indexOf(item.rarity.id);

        if (actualIndex < requiredIndex) {
            return { uid, met: false, reason: 'degraded', actualRarity: item.rarity.id };
        }

        return { uid, met: true, actualRarity: item.rarity.id };
    });

    const passed = slotResults.every(s => s.met);

    return { passed, slotResults };
}

/**
 * Generate random bump directions for a delivery distance.
 */
export function generateBumpDirections(distance) {
    const directions = [];
    for (let i = 0; i < distance; i++) {
        directions.push(Math.random() < 0.5 ? '→' : '←');
    }
    return directions;
}

/**
 * Roll a delivery distance based on config weights.
 */
export function rollDeliveryDistance(distanceWeights) {
    const entries = Object.entries(distanceWeights).map(([d, w]) => [parseInt(d), w]);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;

    for (const [distance, weight] of entries) {
        r -= weight;
        if (r <= 0) return distance;
    }

    return entries[0][0]; // fallback
}
