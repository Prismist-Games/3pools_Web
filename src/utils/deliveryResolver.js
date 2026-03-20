// src/utils/deliveryResolver.js

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Calculate actual durability for an item.
 * D is determined solely by quality tier: baseDurability + rarityIndex * durabilityPerTier.
 * Individual item base durability is no longer used.
 */
export function getActualDurability(item, durabilityPerTier, baseDurability = 3) {
    const rarityIndex = RARITY_ORDER.indexOf(item.rarity?.id || 'common');
    return baseDurability + rarityIndex * durabilityPerTier;
}

/**
 * Prepare items for delivery — creates working copies with currentDurability.
 * Applies angular S bonus. Protective bonus is deferred to resolveDelivery
 * so it uses the final arrangement after packing swaps.
 */
export function prepareDeliveryItems(items, durabilityPerTier, baseDurability = 3) {
    return items.map(item => {
        let currentDurability = getActualDurability(item, durabilityPerTier, baseDurability);
        let effectiveSharpness = item.sharpness || 0;

        // Angular: S+2
        if (item.deliveryTag === 'angular') {
            effectiveSharpness += 1;
        }

        return {
            ...item,
            currentDurability,
            effectiveSharpness,
            destroyed: false,
            originalRarityId: item.rarity.id,
            explosiveHitCount: 0,  // tracks hits for explosive trigger (explodes every 2 hits)
        };
    });
}

/**
 * Get effective sharpness for an attacker considering delivery tags and bump direction.
 */
function getEffectiveSharpness(attacker, direction) {
    if (attacker.deliveryTag === 'unidirectional') {
        if (direction === '→') {
            return 0; // safe direction
        } else {
            return (attacker.effectiveSharpness || attacker.sharpness || 0) * 2; // dangerous direction
        }
    }
    return attacker.effectiveSharpness ?? (attacker.sharpness || 0);
}

/**
 * Resolve a single collision between attacker and defender.
 * Single HP layer: if D >= damage, subtract. If D < damage, item is destroyed.
 * Set bonus items do not damage each other.
 * Mutates defender in place. Returns collision record for animation.
 */
function resolveCollision(attacker, defender, direction) {
    if (attacker.destroyed || defender.destroyed) {
        return null;
    }

    // Set bonus: items with set_bonus tag do NOT damage each other
    if (attacker.deliveryTag === 'set_bonus' && defender.deliveryTag === 'set_bonus') {
        return {
            attackerUid: attacker.uid,
            defenderUid: defender.uid,
            damage: 0,
            type: 'no_damage',
        };
    }

    const damage = getEffectiveSharpness(attacker, direction);
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
        durabilityAfter: defender.currentDurability,
        type: 'absorb',
    };

    defender.currentDurability -= damage;
    if (defender.currentDurability <= 0) {
        defender.currentDurability = 0;
        defender.destroyed = true;
        record.durabilityAfter = 0;
        record.type = 'destroy';
    } else {
        record.durabilityAfter = defender.currentDurability;
        record.type = 'absorb';
    }

    return record;
}

/**
 * Apply damage to a target item (used by explosive chain).
 * D reaches 0 = destroyed.
 * Returns a collision record.
 */
function applyExplosiveDamage(source, target, damage) {
    if (target.destroyed) return null;

    const record = {
        attackerUid: source.uid,
        defenderUid: target.uid,
        damage,
        durabilityBefore: target.currentDurability,
        durabilityAfter: target.currentDurability,
        type: 'explosive_damage',
    };

    target.currentDurability -= damage;
    if (target.currentDurability <= 0) {
        target.currentDurability = 0;
        target.destroyed = true;
        record.durabilityAfter = 0;
        record.type = 'explosive_destroy';
    } else {
        record.durabilityAfter = target.currentDurability;
    }

    return record;
}

/**
 * Process explosive triggers after collisions in a bump.
 * Explosive items accumulate hits; every 2 hits taken triggers an explosion
 * dealing 1 damage to all other surviving items. Can chain-react.
 */
function processExplosiveTriggers(workingItems, bumpCollisions) {
    // Count hits taken by explosive items this bump
    for (const collision of bumpCollisions) {
        const defender = workingItems.find(i => i.uid === collision.defenderUid);
        if (defender && defender.deliveryTag === 'explosive' && collision.damage > 0 && collision.type !== 'no_damage') {
            defender.explosiveHitCount = (defender.explosiveHitCount || 0) + 1;
        }
    }

    const explosiveRecords = [];
    let hasNewTrigger = true;

    while (hasNewTrigger) {
        hasNewTrigger = false;

        for (const item of workingItems) {
            if (item.deliveryTag === 'explosive' &&
                !item.destroyed &&
                item.explosiveHitCount >= 2) {

                item.explosiveHitCount -= 2;  // consume 2 hits
                hasNewTrigger = true;

                // Deal 1 damage to all other surviving items
                for (const target of workingItems) {
                    if (target.uid !== item.uid && !target.destroyed) {
                        const record = applyExplosiveDamage(item, target, 1);
                        if (record) explosiveRecords.push(record);
                    }
                }
            }
        }
    }

    return explosiveRecords;
}

/**
 * Resolve one bump (one direction). Returns array of collision records.
 * Mutates workingItems in place.
 */
function resolveBump(workingItems, direction) {
    const activeItems = workingItems.filter(item => !item.destroyed);
    const collisions = [];

    if (direction === '→') {
        for (let i = 0; i < activeItems.length - 1; i++) {
            const collision = resolveCollision(activeItems[i], activeItems[i + 1], direction);
            if (collision) collisions.push(collision);
        }
    } else {
        for (let i = activeItems.length - 1; i > 0; i--) {
            const collision = resolveCollision(activeItems[i], activeItems[i - 1], direction);
            if (collision) collisions.push(collision);
        }
    }

    // Process explosive triggers (every 2 hits taken → explode)
    const explosiveRecords = processExplosiveTriggers(workingItems, collisions);
    collisions.push(...explosiveRecords);

    return collisions;
}

/**
 * Main entry point. Resolves full delivery sequence.
 * Protective bonus is applied here (not in prepareDeliveryItems) so it uses
 * the final arrangement after all packing swaps.
 */
export function resolveDelivery(items, bumps, rarityConfig, durabilityPerTier = 1) {
    // Apply protective bonus based on final arrangement
    for (let i = 0; i < items.length; i++) {
        if (items[i].deliveryTag === 'protective') {
            const protectiveBonus = 1 * durabilityPerTier;  // +1 quality tier worth of D
            if (i > 0) items[i - 1].currentDurability += protectiveBonus;
            if (i < items.length - 1) items[i + 1].currentDurability += protectiveBonus;
        }
    }

    const bumpHistory = [];

    for (const direction of bumps) {
        const collisions = resolveBump(items, direction);

        const activeItems = items.filter(item => !item.destroyed);
        const snapshot = activeItems.map(item => ({
            uid: item.uid,
            name: item.name,
            icon: item.icon,
            currentDurability: item.currentDurability,
            rarity: item.rarity ? { ...item.rarity } : null,
            destroyed: item.destroyed,
            sharpness: item.sharpness,
            effectiveSharpness: item.effectiveSharpness,
            durability: item.durability,
            deliveryTag: item.deliveryTag,
        }));

        bumpHistory.push({ direction, collisions, itemsSnapshot: snapshot });
    }

    const finalItems = items.filter(item => !item.destroyed);

    return { bumpHistory, finalItems };
}

/**
 * Check if post-delivery items still satisfy order requirements.
 * Simple check: is the item still alive (not destroyed)?
 */
export function evaluateDeliveryResult(finalItems, requirements, assignedUids) {
    const itemMap = new Map();
    finalItems.forEach(item => itemMap.set(item.uid, item));

    const slotResults = requirements.map((req, i) => {
        const uid = assignedUids[i];
        const item = itemMap.get(uid);

        if (!item) {
            return { uid, met: false, reason: 'destroyed' };
        }

        return { uid, met: true };
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

    return entries[0][0];
}
