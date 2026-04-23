/**
 * activePool.js — stateless helpers that derive the active ingredient pool
 * from LIVE_CONFIG.disabledIngredientIds at call time.
 *
 * All functions are pure reads — they never mutate LIVE_CONFIG.
 */

import { INGREDIENTS, MARKET_TYPES, DISHES } from '../data/v2Config';
import { LIVE_CONFIG } from '../data/runtimeConfig';

export function isIngredientActive(id) {
    return !LIVE_CONFIG.disabledIngredientIds.includes(id);
}

export function getActiveIngredients() {
    return INGREDIENTS.filter(i => isIngredientActive(i.id));
}

/** Returns a Set of 大类 names that have at least one active ingredient. */
export function getActiveCategories() {
    const active = new Set();
    for (const ing of INGREDIENTS) {
        if (isIngredientActive(ing.id)) {
            active.add(ing.tags[0]);
        }
    }
    return active;
}

/** Returns MARKET_TYPES entries whose category has at least one active ingredient. */
export function getActiveMarketTypes() {
    const activeCategories = getActiveCategories();
    return MARKET_TYPES.filter(mt => activeCategories.has(mt.category));
}

/**
 * Returns a Set containing:
 *   - every tags[0] (大类) from active ingredients
 *   - every tags[1] (小类) from active ingredients
 *   - every active ingredient id
 */
export function getActiveTags() {
    const tags = new Set();
    for (const ing of INGREDIENTS) {
        if (isIngredientActive(ing.id)) {
            tags.add(ing.tags[0]);
            tags.add(ing.tags[1]);
            tags.add(ing.id);
        }
    }
    return tags;
}

/**
 * Scan DISHES and return warnings for any tag/id references that are no longer
 * present in the active pool.
 *
 * Returns an array of { dishId, dishName, issue } objects.
 */
export function getDishWarnings() {
    const activeTags = getActiveTags();
    const activeIngredientIds = new Set(getActiveIngredients().map(i => i.id));
    const warnings = [];

    function checkRules(rules, slotName, dishId, dishName, prefix) {
        for (const rule of rules) {
            if (rule.match?.tag && !activeTags.has(rule.match.tag)) {
                warnings.push({
                    dishId,
                    dishName,
                    issue: `${prefix}slot「${slotName}」的 rule 引用的 tag「${rule.match.tag}」已不在池中`,
                });
            }
            if (rule.match?.id && !activeIngredientIds.has(rule.match.id)) {
                warnings.push({
                    dishId,
                    dishName,
                    issue: `${prefix}slot「${slotName}」的 rule 引用的 id「${rule.match.id}」已不在池中`,
                });
            }
        }
    }

    function checkSlot(slot, dishId, dishName, prefix = '') {
        // Skip slots with empty rules and defaultMultiplier=1 (match-anything fallback)
        if (slot.rules.length === 0 && slot.defaultMultiplier === 1) return;

        checkRules(slot.rules, slot.name, dishId, dishName, prefix);

        // Check if required slot with defaultMultiplier=0 has no matchable rules at all
        if (slot.required && slot.defaultMultiplier === 0 && slot.rules.length > 0) {
            const hasMatchable = slot.rules.some(r => {
                if (r.match?.tag) return activeTags.has(r.match.tag);
                if (r.match?.id) return activeIngredientIds.has(r.match.id);
                return true;
            });
            if (!hasMatchable) {
                warnings.push({
                    dishId,
                    dishName,
                    issue: `${prefix}slot「${slot.name}」在当前池子下无解（必填但无 rule 可匹配）`,
                });
            }
        }

        // Check trigger
        if (slot.trigger) {
            if (slot.trigger.whenTag && !activeTags.has(slot.trigger.whenTag)) {
                warnings.push({
                    dishId,
                    dishName,
                    issue: `${prefix}slot「${slot.name}」的 trigger.whenTag「${slot.trigger.whenTag}」已不在池中`,
                });
            }
            if (slot.trigger.spawnSlot) {
                checkSlot(slot.trigger.spawnSlot, dishId, dishName, `${prefix}(spawnSlot) `);
            }
        }

        // Check crossBonus
        if (slot.crossBonus?.requireTag && !activeTags.has(slot.crossBonus.requireTag)) {
            warnings.push({
                dishId,
                dishName,
                issue: `${prefix}slot「${slot.name}」的 crossBonus.requireTag「${slot.crossBonus.requireTag}」已不在池中`,
            });
        }
    }

    for (const dish of DISHES) {
        for (const slot of dish.slots) {
            checkSlot(slot, dish.id, dish.name);
        }
    }

    return warnings;
}
