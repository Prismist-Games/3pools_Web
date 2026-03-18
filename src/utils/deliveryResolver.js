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
 * Applies delivery tag effects (fortified, fragile, angular, protective, set_bonus).
 */
export function prepareDeliveryItems(items, durabilityPerTier) {
    // Phase 1: Create working copies with base durability
    const workingItems = items.map(item => {
        let currentDurability = getActualDurability(item, durabilityPerTier);
        let effectiveSharpness = item.sharpness || 0;

        // Fortified: +4 base durability
        if (item.deliveryTag === 'fortified') {
            currentDurability += 4;
        }

        // Fragile: D fixed at 1
        if (item.deliveryTag === 'fragile') {
            currentDurability = 1;
        }

        // Angular: S+3 (stored as effective value for delivery)
        if (item.deliveryTag === 'angular') {
            effectiveSharpness += 3;
        }

        return {
            ...item,
            currentDurability,
            effectiveSharpness,
            destroyed: false,
            originalRarityId: item.rarity.id,
            explosiveTriggeredThisBump: false,
        };
    });

    // Phase 2: Set bonus — +2D per other set item
    const setCount = workingItems.filter(i => i.deliveryTag === 'set_bonus').length;
    if (setCount > 1) {
        for (const item of workingItems) {
            if (item.deliveryTag === 'set_bonus') {
                item.currentDurability += (setCount - 1) * 2;
            }
        }
    }

    // Phase 3: Protective — adjacent items get +3D (one-time, based on initial arrangement)
    for (let i = 0; i < workingItems.length; i++) {
        if (workingItems[i].deliveryTag === 'protective') {
            if (i > 0) workingItems[i - 1].currentDurability += 3;
            if (i < workingItems.length - 1) workingItems[i + 1].currentDurability += 3;
        }
    }

    return workingItems;
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
 * Mutates defender in place. Returns collision record for animation.
 */
function resolveCollision(attacker, defender, rarityConfig, direction) {
    if (attacker.destroyed || defender.destroyed) {
        return null;
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
        rarityBefore: defender.rarity.id,
        durabilityAfter: defender.currentDurability,
        rarityAfter: defender.rarity.id,
        type: 'absorb',
    };

    if (defender.currentDurability >= damage) {
        defender.currentDurability -= damage;
        record.durabilityAfter = defender.currentDurability;
        record.type = 'absorb';
    } else if (defender.currentDurability > 0) {
        defender.currentDurability = 0;
        degradeQuality(defender, rarityConfig);
        record.durabilityAfter = 0;
        record.rarityAfter = defender.destroyed ? null : defender.rarity.id;
        record.type = defender.destroyed ? 'destroy' : 'pierce';
    } else {
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
        item.destroyed = true;
        item.rarity = null;
    } else {
        const lowerRarityId = RARITY_ORDER[currentIndex - 1];
        const lowerRarity = rarityConfig.find(r => r.id === lowerRarityId);
        item.rarity = { ...lowerRarity };
        item.degradedThisBump = true;
    }
}

/**
 * Apply damage to a target item (used by explosive chain).
 * Returns a collision record if quality changed.
 */
function applyExplosiveDamage(source, target, damage, rarityConfig) {
    if (target.destroyed) return null;

    const record = {
        attackerUid: source.uid,
        defenderUid: target.uid,
        damage,
        durabilityBefore: target.currentDurability,
        rarityBefore: target.rarity?.id,
        durabilityAfter: target.currentDurability,
        rarityAfter: target.rarity?.id,
        type: 'explosive_damage',
    };

    if (target.currentDurability >= damage) {
        target.currentDurability -= damage;
        record.durabilityAfter = target.currentDurability;
    } else if (target.currentDurability > 0) {
        target.currentDurability = 0;
        degradeQuality(target, rarityConfig);
        record.durabilityAfter = 0;
        record.rarityAfter = target.destroyed ? null : target.rarity?.id;
        record.type = target.destroyed ? 'explosive_destroy' : 'explosive_pierce';
    } else {
        degradeQuality(target, rarityConfig);
        record.durabilityAfter = 0;
        record.rarityAfter = target.destroyed ? null : target.rarity?.id;
        record.type = target.destroyed ? 'explosive_destroy' : 'explosive_degrade';
    }

    return record;
}

/**
 * Process explosive triggers after collisions in a bump.
 * Each explosive item triggers at most once per bump. Allows chain reactions.
 */
function processExplosiveTriggers(workingItems, rarityConfig) {
    const explosiveRecords = [];
    const triggeredUids = new Set();
    let hasNewTrigger = true;

    while (hasNewTrigger) {
        hasNewTrigger = false;

        for (const item of workingItems) {
            if (item.deliveryTag === 'explosive' &&
                item.degradedThisBump &&
                !item.destroyed &&
                !triggeredUids.has(item.uid)) {

                triggeredUids.add(item.uid);
                hasNewTrigger = true;

                // Deal 2 damage to all other surviving items
                for (const target of workingItems) {
                    if (target.uid !== item.uid && !target.destroyed) {
                        const record = applyExplosiveDamage(item, target, 2, rarityConfig);
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
function resolveBump(workingItems, direction, rarityConfig) {
    // Reset per-bump flags
    for (const item of workingItems) {
        item.degradedThisBump = false;
        item.explosiveTriggeredThisBump = false;
    }

    const activeItems = workingItems.filter(item => !item.destroyed);
    const collisions = [];

    if (direction === '→') {
        for (let i = 0; i < activeItems.length - 1; i++) {
            const collision = resolveCollision(activeItems[i], activeItems[i + 1], rarityConfig, direction);
            if (collision) collisions.push(collision);
        }
    } else {
        for (let i = activeItems.length - 1; i > 0; i--) {
            const collision = resolveCollision(activeItems[i], activeItems[i - 1], rarityConfig, direction);
            if (collision) collisions.push(collision);
        }
    }

    // Process explosive chain reactions after all collisions
    const explosiveRecords = processExplosiveTriggers(workingItems, rarityConfig);
    collisions.push(...explosiveRecords);

    return collisions;
}

/**
 * Main entry point. Resolves full delivery sequence.
 */
export function resolveDelivery(items, bumps, rarityConfig) {
    const bumpHistory = [];

    for (const direction of bumps) {
        const collisions = resolveBump(items, direction, rarityConfig);

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

    return entries[0][0];
}
