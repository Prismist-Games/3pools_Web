# Trait System (特质系统) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete trait system with 45 traits, infusion mechanic, fusion trait inheritance, and value-based order matching — as specified in `design_docs/trait_system_spec.md`.

**Architecture:** Traits are data-driven definitions in `constants.js`. Value calculation is a pure function in `helpers.js` that computes dynamically from rarity base + permanentBonus + aura traits. Infusion is a new interaction mode in `useGameLogic.js` (similar to existing `selectionMode`). Trait selection popups reuse the existing modal pattern (`orderCandidates`-style state).

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, JavaScript ESM

**Spec:** `design_docs/trait_system_spec.md` — all section numbers below reference this document.

---

## File Map

| File | Responsibility | Changes |
|------|---------------|---------|
| `src/data/constants.js` | All game config and data definitions | Add `TRAIT_DEFINITIONS` (45 entries), `VALUE_SYSTEM_CONFIG`, `TRAIT_SYSTEM_CONFIG`; update `SCORE_PROGRESS_CONFIG`; update `INITIAL_GAME_CONFIG` |
| `src/utils/helpers.js` | Pure utility functions | Rewrite `getItemValue` (spec §8.1); add `rollTrait`; update `getCompositeRarity` for `default` key; update `generateOrder` reward formula (spec §7.3) |
| `src/hooks/useGameLogic.js` | All game state and actions | Add trait fields to `createItem`; update `fuseItems` for trait inheritance; add `infuseMode` state + `handleStartInfuse`/`handleInfuseTarget`/`handleCancelInfuse`; add `traitSelectionPending` state; add per-round triggers; update upgrade/recycle for traits |
| `src/components/game/InventorySlot.jsx` | Item card display | Add trait dots, infusion count, infuse mode visual states |
| `src/components/game/OrderCard.jsx` | Order display | Already shows `requiredValue` — minor tweaks only |
| `src/GameCore.jsx` | Layout + interaction wiring | Pass infuse props to InventorySlot; add trait selection modal; add right-click handler for infusion; add infuse mode status bar |
| `src/utils/translations.js` | EN translations | Add all 45 trait names + descriptions + UI strings |
| `src/App.jsx` | Config panel | Add `valueSystem.baseValues` editor, `traitSystem` toggle |

---

### Task 1: TRAIT_DEFINITIONS + Config (Spec §11, §12)

**Files:**
- Modify: `src/data/constants.js`

All 45 traits defined as a single exported object. Config objects for valueSystem and traitSystem. Updated SCORE_PROGRESS_CONFIG with orderValueWeights.

- [ ] **Step 1: Add TRAIT_DEFINITIONS export**

Insert after `TOOL_ITEM_CONFIG` (line 261). The object has 45 entries following the schema in spec §12. Each entry has `id`, `name`, `desc`, `category`, `effectType`, and type-specific fields.

Key trait categories:
- 5 passive auras (spec §3.1) — `effectType: 'aura'`, `auraType: 'additive'|'multiplicative'`
- 5 pool triggers (spec §3.2) — `effectType: 'trigger'`, `onInfuse: (material, target) => number`
- 20 name triggers (spec §3.3) — same pattern, checks `material.name`
- 2 quality triggers (spec §3.4) — checks `material.rarityId`
- 4 other triggers (spec §3.5) — various conditions including special `infuse_common_free`
- 4 material triggers (spec §3.6) — `onConsumed: (material, target, config, inv) => {effects}`
- 1 fusion trigger (spec §3.7) — `onFusion: () => 3`
- 2 capacity (spec §3.8) — `effectType: 'permanent_capacity'`, `capacityEffect`
- 2 special (spec §3.9) — `effectType: 'special'`

Special notes:
- `decay_infuse` (§3.1) has BOTH `onRound` and `onInfuse` — dual trigger on permanentBonus
- `virgin_double` multiplicative aura checks `item.infusionHistory.length === 0`
- `same_pool_synergy` additive aura counts same-poolId items in inventory (needs `inventoryItems` param)
- `material_full_value.onConsumed` needs the material's current total value — caller must compute and attach as `materialItem._currentValue`
- `infuse_common_free` is `effectType: 'special'` with `specialType: 'common_free_infuse'` — checked in infusion flow, NOT via onInfuse
- `infuse_burst` is `effectType: 'special'` with `specialType: 'infuse_burst'` — +5 permanentBonus on first infuse, then self-removes
- `infuse_order_match.onInfuse` takes 4th param `activeOrderNames` (array of all required names from active orders)

- [ ] **Step 2: Add VALUE_SYSTEM_CONFIG and TRAIT_SYSTEM_CONFIG**

```javascript
export const VALUE_SYSTEM_CONFIG = {
    baseValues: { common: 0, uncommon: 2, rare: 4, epic: 7, legendary: 12, mythic: 20 },
    compositeQualityThresholds: { default: [0, 2, 4, 7, 12, 20] },
    rewardMultiplier: 1,
};

export const TRAIT_SYSTEM_CONFIG = {
    enabled: true,
    baseInfusionCount: 3,
    maxTraitSlots: 3,
    minRarityForTrait: 'uncommon',
    traitWeights: {
        categoryPool: 0.4,
        categoryPoolSplit: 0.5,
        otherTraits: 0.6,
    },
};
```

- [ ] **Step 3: Update SCORE_PROGRESS_CONFIG**

Add `orderValueWeights` field (spec §7.2):
```javascript
orderValueWeights: { 3: 0.15, 4: 0.25, 5: 0.25, 6: 0.15, 7: 0.10, 8: 0.05, 10: 0.03, 12: 0.02 }
```

- [ ] **Step 4: Update INITIAL_GAME_CONFIG**

Add to the config object:
```javascript
valueSystem: VALUE_SYSTEM_CONFIG,
traitSystem: TRAIT_SYSTEM_CONFIG,
```

- [ ] **Step 5: Add difficultyRequiredValues to EMERGENCY_ORDER_CONFIG**

Map difficulty levels to value requirements for evacuation orders:
```javascript
difficultyRequiredValues: { 1: 3, 2: 4, 3: 5, 4: 7 }
```

- [ ] **Step 6: Verify build**

Run: `npm run dev` — should start without errors.

---

### Task 2: Value Calculation + Trait Rolling (Spec §1.3, §4, §8.1)

**Files:**
- Modify: `src/utils/helpers.js`

- [ ] **Step 1: Import TRAIT_DEFINITIONS**

```javascript
import { TRAIT_DEFINITIONS } from '../data/constants';
```

- [ ] **Step 2: Rewrite getItemValue (spec §8.1)**

Replace the existing `getItemValue` function. New signature: `getItemValue(item, config, inventoryItems = [])`.

Compute: `Math.max(0, Math.floor((baseValue + permanentBonus + additiveAura) * multiplicativeAura))`

Where additiveAura/multiplicativeAura come from iterating `item.traits`, looking up each in `TRAIT_DEFINITIONS`, and calling `calcAdditive`/`calcMultiplicative` for aura-type traits.

- [ ] **Step 3: Update getCompositeRarity for 'default' key**

The current implementation looks up by `componentCount` number key. The spec uses a `"default"` key. Update the fallback logic:
```javascript
let breakpoints = thresholds[componentCount] || thresholds['default'] || thresholds[String(componentCount)];
```

- [ ] **Step 4: Add rollTrait function (spec §4)**

```javascript
export const rollTrait = (config) => { ... }
```

Probability: 40% → pool/name category (50/50 split inside), 60% → remaining 20 traits (equal weight).

Pool traits: `['infuse_fruit', 'infuse_medicine', 'infuse_electronics', 'infuse_kitchenware', 'infuse_stationery']`

Name traits: all 20 `infuse_*` name triggers.

Other traits: `['flat_value_2', 'multiplier_1_5', 'virgin_double', 'same_pool_synergy', 'decay_infuse', 'infuse_uncommon_plus', 'infuse_rare_plus', 'infuse_same_name', 'infuse_different_pool', 'infuse_common_free', 'infuse_order_match', 'material_full_value', 'material_infuse_count', 'material_inventory_boost', 'material_refund', 'fusion_value_3', 'extra_infuse_3', 'extra_trait_1', 'recycle_double', 'infuse_burst']`

- [ ] **Step 5: Update generateOrder reward formula (spec §7.3)**

Change reward calculation for non-emergency orders:
```javascript
baseScoreReward = Math.max(1, Math.ceil(requiredValue * rewardMultiplier));
```
Note: `ceil` not `floor` per spec §7.3.

- [ ] **Step 6: Verify build**

Run: `npm run dev`

---

### Task 3: Item Data Structure + Trait Assignment on Draw (Spec §2.2, §8)

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Import rollTrait and TRAIT_DEFINITIONS**

Add `rollTrait` to the helpers import. Add `TRAIT_DEFINITIONS` to the constants import.

- [ ] **Step 2: Update createItem to add trait fields (spec §8)**

Add new fields to the item object created in `createItem()`:
```javascript
traits: [],
permanentBonus: 0,
infusionHistory: [],
remainingInfusions: config.traitSystem?.baseInfusionCount || 3,
maxInfusions: config.traitSystem?.baseInfusionCount || 3,
maxTraits: 1,
componentCount: 1,
```

- [ ] **Step 3: Assign trait on draw for uncommon+ items (spec §2.2)**

After creating the item in `createItem`, if `rarity.id !== 'common'` (more precisely, if rarity index >= the index of `config.traitSystem.minRarityForTrait`), call `rollTrait(config)` and set `item.traits = [traitId]`.

Then apply capacity traits immediately: if the rolled trait is `extra_infuse_3` or `extra_trait_1`, apply `capacityEffect` to the item's `maxInfusions`/`maxTraits`.

- [ ] **Step 4: Add trait fields to ALL other item creation spots**

Search for all places that create item objects (not via `createItem`):
- `addInventoryItem` (~line 210): debug function, add trait fields
- `debugGetOrderItems` (~line 241): debug function, add trait fields
- `handleScoreDraw` (~line 648): score items, add trait fields (no traits assigned)
- Trade-in `newItem` (~line 1161): add trait fields, assign trait if uncommon+
- `fuseItems`: handled in Task 4

Each created item needs: `traits: [], permanentBonus: 0, infusionHistory: [], remainingInfusions: 3, maxInfusions: 3, maxTraits: 1, componentCount: 1`

- [ ] **Step 5: Update all upgrade spots to preserve trait fields**

There are 4 places where items are upgraded (rarity+1). Currently they create `upgradedItem = { ...item, rarity: nextRarity, value: ..., uid: ... }`. Since they spread the original item, trait fields ARE preserved. But we need to:
- Remove the `value:` override (value is now computed dynamically)
- Ensure the spread preserves all trait fields (it does by default)

Search for `getBaseValue(nextRarity.id` — these are the upgrade spots.
- ~line 979: pendingItem + orderSlot merge
- ~line 1026: selectedSlot + orderSlot merge
- ~line 1209: pendingItem + inventory merge
- ~line 1290: selectedSlot + inventory merge

For each, change `value: getBaseValue(nextRarity.id, config)` to just remove the value override (or keep it as base value for backward compat).

**IMPORTANT**: When two common items merge into uncommon, the result should get a random trait (spec §6.2 — white synthesis). Add this check after creating the upgraded item: if both source items had `rarity.id === 'common'`, call `rollTrait(config)` and assign to the result.

- [ ] **Step 6: Verify build**

Run: `npm run dev`

---

### Task 4: Fusion Trait Interaction (Spec §6)

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Update fuseItems to handle trait inheritance (spec §6.1, §6.4, §6.5)**

In `fuseItems()`, add:
```javascript
// Merge traits — deduplicate by ID
const allTraits = [...new Set([...(item1.traits || []), ...(item2.traits || [])])];

// Component count
const componentCount = (item1.componentCount || 1) + (item2.componentCount || 1);

// Max traits = min(componentCount, 3) + any capacity bonuses
let maxTraits = Math.min(componentCount, config.traitSystem?.maxTraitSlots || 3);
// Check for extra_trait_1 capacity in both items
[item1, item2].forEach(item => {
    (item.traits || []).forEach(tid => {
        const t = TRAIT_DEFINITIONS[tid];
        if (t?.effectType === 'permanent_capacity' && t.capacityEffect?.maxTraits) {
            maxTraits += t.capacityEffect.maxTraits;
        }
    });
});

// Merge infusion data
const infusionHistory = [...(item1.infusionHistory || []), ...(item2.infusionHistory || [])];
const remainingInfusions = (item1.remainingInfusions ?? 3) + (item2.remainingInfusions ?? 3);
const maxInfusions = (item1.maxInfusions ?? 3) + (item2.maxInfusions ?? 3);

// Permanent bonus — sum both
const permanentBonus = (item1.permanentBonus || 0) + (item2.permanentBonus || 0);
```

Add these to the returned fused item. Remove the hardcoded `value: totalValue`.

- [ ] **Step 2: Handle trait overflow — return pending state**

If `allTraits.length > maxTraits`, the fused item needs trait selection. Change `fuseItems` to return extra info:
```javascript
return {
    ...fusedItem,
    traits: allTraits, // all traits, may exceed limit
    _needsTraitSelection: allTraits.length > maxTraits,
    _maxTraits: maxTraits,
};
```

The caller (fusion mode in handleSlotClick) checks `_needsTraitSelection` and opens the trait selection modal if true.

- [ ] **Step 3: Add traitSelectionPending state**

```javascript
const [traitSelectionPending, setTraitSelectionPending] = useState(null);
// { item, targetIndex, maxTraits, allTraits, context: 'fusion'|'infusion', onConfirm }
```

When fusion produces an item that needs selection:
1. Store the fused item + inventory context in `traitSelectionPending`
2. Don't place item in inventory yet
3. When player confirms selection → write selected traits to item, place in inventory

- [ ] **Step 4: Handle fusion_value_3 trigger (spec §6.3)**

After trait selection is confirmed (or if no selection needed), check if the FINAL traits include `fusion_value_3`. If so, add +3 to `permanentBonus` for each parent that had it.

Logic: count how many of the original parents had `fusion_value_3`. But after dedup, we only know if the trait exists in the result. Per spec §10.10: if the trait is retained in the result, it triggers. If both parents had it, it still triggers once (deduped). Wait — spec says "若双方都有此特质，+6" so we need to count from the PARENTS, not the deduped result.

Track: `fusion_value_3_count = [item1, item2].filter(i => (i.traits || []).includes('fusion_value_3')).length`
Then: `permanentBonus += fusion_value_3_count * 3` (but only if `fusion_value_3` is in the FINAL selected traits).

- [ ] **Step 5: White synthesis trait assignment (spec §6.2)**

In the UPGRADE path (same name + same rarity → rarity+1), when both items are `common`:
- Result gets `componentCount: 2`
- Result gets `maxTraits: 2` (dual component fusion)
- Result gets 1 random trait via `rollTrait(config)`
- Apply capacity effects if the trait is a capacity type

- [ ] **Step 6: Update fusion mode handler**

In the fusion selection mode handler (selectionMode.type === 'fusion', step 2), after calling `fuseItems`:
- If `_needsTraitSelection`, set `traitSelectionPending` instead of placing item
- Otherwise place item normally

- [ ] **Step 7: Add handleConfirmTraitSelection action**

```javascript
const handleConfirmTraitSelection = (selectedTraitIds) => {
    if (!traitSelectionPending) return;
    const { item, context, ...rest } = traitSelectionPending;
    item.traits = selectedTraitIds;
    // Handle fusion_value_3 trigger
    // Place item in inventory
    // Clear traitSelectionPending
};
```

Export in `actions`.

- [ ] **Step 8: Verify build**

Run: `npm run dev`

---

### Task 5: Infusion System (Spec §5, §9)

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Add infuseMode state**

```javascript
const [infuseMode, setInfuseMode] = useState(null); // { materialIndex }
```

- [ ] **Step 2: Add handleStartInfuse (spec §9.4)**

Guards: item exists, not tool, `componentCount === 1`, no other mode active.
```javascript
const handleStartInfuse = (index) => {
    const item = inventory[index];
    if (!item || item.isTool || (item.componentCount || 1) > 1) return;
    if (isSubmitMode || isRecycleMode || isEvacuationMode || pendingItem || selectionMode || infuseMode || orderCandidates) return;
    setInfuseMode({ materialIndex: index });
    setSelectedSlot(null);
};
```

- [ ] **Step 3: Add handleCancelInfuse**

```javascript
const handleCancelInfuse = () => setInfuseMode(null);
```

- [ ] **Step 4: Implement handleInfuseTarget (spec §5.2 — full 7-step flow)**

```javascript
const handleInfuseTarget = (targetIndex) => {
    if (!infuseMode) return;
    const materialIndex = infuseMode.materialIndex;
    const material = inventory[materialIndex];
    const target = inventory[targetIndex];

    if (!material || !target || targetIndex === materialIndex) return;
    if ((target.remainingInfusions ?? 3) <= 0) return;

    // Step 1: Check remaining infusions ✓ (above)

    // Step 2: Record material info in target's infusionHistory
    const materialInfo = {
        name: material.name,
        poolId: material.poolId || material.poolIds?.[0],
        rarityId: material.rarity?.id,
    };
    const newTarget = { ...target };
    newTarget.infusionHistory = [...(target.infusionHistory || []), materialInfo];

    // Step 3: Trigger target's infuse triggers
    let bonusAdd = 0;
    // Collect active order names for infuse_order_match
    const activeOrderNames = [...orders, ...emergencyOrders]
        .filter(Boolean)
        .flatMap(o => o.requiredNames || []);

    for (const traitId of (target.traits || [])) {
        const trait = TRAIT_DEFINITIONS[traitId];
        if (!trait) continue;
        if (trait.effectType === 'trigger' && trait.onInfuse) {
            bonusAdd += trait.onInfuse(materialInfo, target, config, activeOrderNames);
        }
    }
    // decay_infuse special: also has onInfuse
    // (already handled above if trait has onInfuse)

    // Handle infuse_burst special
    let burstTriggered = false;
    if ((target.traits || []).includes('infuse_burst')) {
        bonusAdd += 5;
        burstTriggered = true;
    }

    newTarget.permanentBonus = (target.permanentBonus || 0) + bonusAdd;

    // Step 4: Trigger material's material-type traits
    let goldAdd = 0;
    let inventoryBonusAdd = 0;
    let targetMaxInfusionsAdd = 0;

    // Compute material's current value for material_full_value
    const materialValue = getItemValue(material, config, inventory);

    for (const traitId of (material.traits || [])) {
        const trait = TRAIT_DEFINITIONS[traitId];
        if (!trait || trait.category !== 'material') continue;
        if (trait.onConsumed) {
            const matWithValue = { ...material, _currentValue: materialValue };
            const effects = trait.onConsumed(matWithValue, newTarget, config, inventory);
            if (effects.targetBonusAdd) newTarget.permanentBonus += effects.targetBonusAdd;
            if (effects.goldAdd) goldAdd += effects.goldAdd;
            if (effects.inventoryBonusAdd) inventoryBonusAdd += effects.inventoryBonusAdd;
            if (effects.targetMaxInfusionsAdd) targetMaxInfusionsAdd += effects.targetMaxInfusionsAdd;
        }
    }

    newTarget.maxInfusions = (newTarget.maxInfusions || 3) + targetMaxInfusionsAdd;

    // Step 5: Trait transfer
    const materialTraits = material.traits || [];
    const targetMaxTraits = newTarget.maxTraits || 1;

    if (materialTraits.length > 0) {
        const currentTraitCount = (newTarget.traits || []).length;
        if (currentTraitCount < targetMaxTraits) {
            // Room for material trait — add it
            newTarget.traits = [...(newTarget.traits || []), ...materialTraits];
            // Apply capacity effects for newly added traits
            materialTraits.forEach(tid => {
                const t = TRAIT_DEFINITIONS[tid];
                if (t?.effectType === 'permanent_capacity') {
                    if (t.capacityEffect?.maxInfusions) newTarget.maxInfusions += t.capacityEffect.maxInfusions;
                    if (t.capacityEffect?.maxTraits) newTarget.maxTraits = (newTarget.maxTraits || 1) + t.capacityEffect.maxTraits;
                }
            });
        } else {
            // Trait overflow — need selection popup
            // Set traitSelectionPending, pass context
            // Don't complete infusion yet — wait for selection
            // ... (handled below)
        }
    }

    // Handle infuse_burst removal
    if (burstTriggered) {
        newTarget.traits = (newTarget.traits || []).filter(t => t !== 'infuse_burst');
    }

    // Step 6: Deduct infusion count
    const isCommonFree = (target.traits || []).includes('infuse_common_free') && materialInfo.rarityId === 'common';
    if (!isCommonFree) {
        newTarget.remainingInfusions = (target.remainingInfusions ?? 3) - 1;
    }

    // Step 7: Destroy material, update inventory
    const newInventory = [...inventory];
    newInventory[targetIndex] = newTarget;
    newInventory[materialIndex] = null;

    // Apply inventory bonus if material_inventory_boost triggered
    if (inventoryBonusAdd > 0) {
        newInventory.forEach((item, i) => {
            if (item && i !== materialIndex) {
                newInventory[i] = { ...item, permanentBonus: (item.permanentBonus || 0) + inventoryBonusAdd };
            }
        });
    }

    if (goldAdd > 0) setGold(prev => prev + goldAdd);

    // Remove nulls and update
    setInventory(newInventory.filter(i => i !== null));

    // Clean up assignments
    if (assignedItemUids.has(material.uid)) removeAssignmentByUid(material.uid);

    setInfuseMode(null);
};
```

**IMPORTANT**: If trait transfer needs selection (step 5 overflow), instead of completing immediately, set `traitSelectionPending` with context `'infusion'` and defer the inventory update. The `handleConfirmTraitSelection` from Task 4 handles the completion.

- [ ] **Step 5: Add infuseMode to guards**

Update all mode-entry guards to check `infuseMode`:
- `handleDraw`: add `|| infuseMode` to the early return
- `handleRefreshAllOrders`: same
- `handleRefreshSingleOrder`: same
- `toggleSubmitMode`: same
- `toggleRecycleMode`: same
- `enterFusionMode`: same

- [ ] **Step 6: Export new state and actions**

In the return object:
- `state`: add `infuseMode`, `traitSelectionPending`
- `actions`: add `handleStartInfuse`, `handleInfuseTarget`, `handleCancelInfuse`, `handleConfirmTraitSelection`

- [ ] **Step 7: Verify build**

Run: `npm run dev`

---

### Task 6: Per-Round Triggers + Recycle Trait (Spec §3.1 decay_infuse, §3.9 recycle_double)

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Add per-round trait triggers in handleNormalDraw (spec §13 step 6)**

After `handleIncomingItems(itemsToProcess, decayedInventory)` and before `refreshPools(true)`, apply per-round triggers:

```javascript
// Per-round trait triggers (decay_infuse)
setInventory(prev => prev.map(item => {
    if (!item || !item.traits) return item;
    let bonusChange = 0;
    for (const traitId of item.traits) {
        const trait = TRAIT_DEFINITIONS[traitId];
        if (trait?.onRound) {
            bonusChange += trait.onRound(item);
        }
    }
    if (bonusChange !== 0) {
        return { ...item, permanentBonus: (item.permanentBonus || 0) + bonusChange };
    }
    return item;
}));
```

**Note**: This must run AFTER `handleIncomingItems` sets inventory (which it does via `setInventory`). Since React batches state updates, we need this as a separate `setInventory` call using the functional updater form to chain properly.

- [ ] **Step 2: Update recycle to handle recycle_double (spec §3.9)**

In `handleConfirmRecycle`, when calculating `baseValue`:
```javascript
let baseValue = 0;
selectedIndices.forEach(idx => {
    const item = inventory[idx];
    if (!item) return;
    let recycleVal = item.rarity?.recycleValue || 0;
    if ((item.traits || []).includes('recycle_double')) {
        recycleVal *= 2;
    }
    baseValue += recycleVal;
});
```

Replace the current `totalRecycleValue` usage with this inline calculation, or update the `totalRecycleValue` memo to account for `recycle_double`.

- [ ] **Step 3: Verify build**

Run: `npm run dev`

---

### Task 7: UI — InventorySlot Updates (Spec §10.1, §10.2)

**Files:**
- Modify: `src/components/game/InventorySlot.jsx`
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Add new props to InventorySlot**

```javascript
// New props for trait system
infuseMode,          // { materialIndex } | null
isInfuseMaterial,    // boolean — this item is the selected material
isInfuseTarget,      // boolean — this item can be infused into
isInfuseDisabled,    // boolean — greyed out in infuse mode
onContextMenu,       // right-click handler for starting infusion
computedValue,       // number — dynamically computed total value
```

- [ ] **Step 2: Update value display**

Replace the current value badge to use `computedValue` prop instead of `item.value`:
```jsx
{(computedValue !== undefined && computedValue > 0) && (
    <div className="absolute -top-1.5 -left-1.5 z-20 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white shadow-md ring-1.5 ring-white">
        <span className="text-[10px] font-black leading-none">{computedValue}</span>
    </div>
)}
```

- [ ] **Step 3: Add trait dots display**

After the item name, show colored dots for traits:
```jsx
{item.traits && item.traits.length > 0 && (
    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
        {item.traits.map((traitId, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500 ring-1 ring-white"
                 title={TRAIT_DEFINITIONS[traitId]?.name} />
        ))}
    </div>
)}
```

Import `TRAIT_DEFINITIONS` from constants.

- [ ] **Step 4: Add infusion count display**

Show infusion count when item has traits or infusion history:
```jsx
{item.traits && (item.traits.length > 0 || (item.infusionHistory || []).length > 0) && (
    <div className="absolute bottom-0 left-0 text-[7px] font-bold text-slate-500 bg-white/70 rounded-tr px-0.5 z-10">
        {item.remainingInfusions ?? 3}/{item.maxInfusions ?? 3}
    </div>
)}
```

- [ ] **Step 5: Add infuse mode visual states (spec §10.2)**

```jsx
{/* Infuse mode: material label */}
{isInfuseMaterial && (
    <div className="absolute inset-0 flex items-center justify-center bg-purple-600/80 rounded-lg z-10">
        <span className="text-white text-[10px] font-black">{t("材料")}</span>
    </div>
)}
```

Add to button className:
```
${isInfuseTarget ? 'ring-4 ring-purple-400 cursor-pointer' : ''}
${isInfuseDisabled ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}
```

- [ ] **Step 6: Add right-click handler**

Add `onContextMenu` to the button:
```jsx
onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(index); }}
```

- [ ] **Step 7: Update GameCore to pass new props**

In GameCore's InventorySlot render, add:
```jsx
infuseMode={infuseMode}
isInfuseMaterial={!!infuseMode && infuseMode.materialIndex === idx}
isInfuseTarget={!!infuseMode && infuseMode.materialIndex !== idx && item && (item.remainingInfusions ?? 3) > 0 && !item.isTool}
isInfuseDisabled={!!infuseMode && (infuseMode.materialIndex === idx || !item || (item.remainingInfusions ?? 3) <= 0 || item.isTool)}
onContextMenu={(index) => handleStartInfuse(index)}
computedValue={item ? getItemValue(item, config, inventory) : 0}
```

Import `getItemValue` in GameCore. Destructure `infuseMode` from state and `handleStartInfuse` from actions.

- [ ] **Step 8: Add infuse mode status bar in GameCore**

Near the existing mode status bars (submit mode, recycle mode text), add:
```jsx
{infuseMode && (
    <div className="text-center text-purple-700 font-bold text-sm bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
        {t("注入模式：选择目标物品")}
        <button onClick={handleCancelInfuse} className="ml-2 text-purple-500 hover:text-purple-700">
            {t("取消")}
        </button>
    </div>
)}
```

- [ ] **Step 9: Verify build**

Run: `npm run dev`

---

### Task 8: Trait Selection Modal (Spec §9.5)

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Add TraitSelectionModal component**

Inline in GameCore or as a separate component. Renders when `traitSelectionPending` is not null:

```jsx
{traitSelectionPending && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="font-black text-lg mb-1">{t("选择保留的特质")}</h3>
            <p className="text-sm text-slate-500 mb-4">
                {t("特质上限")}: {traitSelectionPending.maxTraits}
            </p>
            <div className="flex flex-col gap-2 mb-4">
                {traitSelectionPending.allTraits.map(traitId => {
                    const trait = TRAIT_DEFINITIONS[traitId];
                    const isSelected = selectedTraits.includes(traitId);
                    return (
                        <button key={traitId}
                            onClick={() => toggleTraitSelection(traitId)}
                            className={`p-3 rounded-lg border-2 text-left transition-all
                                ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="font-bold text-sm">{t(trait.name)}</div>
                            <div className="text-xs text-slate-500">{t(trait.desc)}</div>
                        </button>
                    );
                })}
            </div>
            {traitSelectionPending.context === 'infusion' && (
                <button onClick={() => handleConfirmTraitSelection(traitSelectionPending.allTraits.filter(t => !materialTraitIds.includes(t)).slice(0, traitSelectionPending.maxTraits))}
                    className="w-full text-sm text-slate-500 mb-2">
                    {t("放弃新特质")}
                </button>
            )}
            <button onClick={() => handleConfirmTraitSelection(selectedTraits)}
                disabled={selectedTraits.length > traitSelectionPending.maxTraits}
                className="w-full bg-purple-600 text-white font-bold py-2 rounded-xl disabled:opacity-50">
                {t("确认")} ({selectedTraits.length}/{traitSelectionPending.maxTraits})
            </button>
        </div>
    </div>
)}
```

This needs local state `selectedTraits` managed within the modal.

- [ ] **Step 2: Verify build**

Run: `npm run dev`

---

### Task 9: Translations (Spec §0.3)

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add all trait translations**

Add to `EN_TRANSLATIONS`:
```javascript
// Trait names (45)
"坚固": "Sturdy",
"增幅": "Amplify",
"纯净": "Pure",
"同源共鸣": "Pool Synergy",
"衰变亲和": "Decay Affinity",
"水果亲和": "Fruit Affinity",
"药物亲和": "Medicine Affinity",
"电器亲和": "Electronics Affinity",
"厨具亲和": "Kitchenware Affinity",
"文具亲和": "Stationery Affinity",
// ... all 20 name cravings: "[Name]渴望" → "[Name] Craving"
"品质吸收": "Quality Absorb",
"稀有汲取": "Rare Extract",
"同名共鸣": "Same Name Resonance",
"异源增幅": "Cross-Pool Boost",
"普品免费": "Common Free",
"订单契合": "Order Match",
"精华转移": "Essence Transfer",
"注入传承": "Infuse Legacy",
"全员增幅": "Global Boost",
"回收返还": "Recycle Refund",
"融合增幅": "Fusion Boost",
"注入扩容": "Infuse Expand",
"特质扩容": "Trait Expand",
"双倍回收": "Double Recycle",
"注入爆发": "Infuse Burst",

// Trait descriptions (45 - all desc strings)
// ... each Chinese desc → English translation

// UI strings
"材料": "Material",
"注入模式：选择目标物品": "Infuse Mode: Select Target",
"选择保留的特质": "Select Traits to Keep",
"特质上限": "Trait Limit",
"放弃新特质": "Discard New Trait",
"注入": "Infuse",
"特质": "Traits",
"基础": "Base",
"永久": "Permanent",
"光环": "Aura",
"剩余注入": "Infusions Left",
"已注入": "Infused",
```

- [ ] **Step 2: Verify build**

Run: `npm run dev`

---

### Task 10: Config Panel Updates (Spec §11)

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add valueSystem.baseValues editor**

In the settings UI, add a section to edit base values per rarity. If this section already exists from prior work, update the values to match spec §1.1.

- [ ] **Step 2: Add traitSystem toggle**

Simple checkbox to enable/disable the trait system:
```jsx
<label>
    <input type="checkbox" checked={config.traitSystem?.enabled} onChange={...} />
    {t("特质系统")}
</label>
```

- [ ] **Step 3: Add orderValueWeights editor**

Table of value → weight entries, similar to existing rarity weight editors.

- [ ] **Step 4: Verify build**

Run: `npm run dev`

---

### Task 11: Final Integration + Verification

- [ ] **Step 1: Full build check**

Run: `npm run dev` and verify no console errors.

- [ ] **Step 2: Manual verification checklist (spec §14)**

Open the game in browser and verify:
- [ ] Drawing uncommon+ item shows a trait (colored dot on card)
- [ ] Drawing common item shows no trait
- [ ] Value badge shows computed value (base + trait effects)
- [ ] Orders show value requirements (≥N)
- [ ] Merging two commons into uncommon gives the result a trait
- [ ] Fusing two items with different traits → result inherits both
- [ ] Right-clicking a single item → enters infuse mode (purple highlights)
- [ ] Infusing material into target → material consumed, target gains bonuses
- [ ] Trait selection popup appears when traits exceed limit
- [ ] recycle_double trait doubles recycle gold
- [ ] ESC cancels infuse mode

- [ ] **Step 3: Commit**

```bash
git add src/data/constants.js src/utils/helpers.js src/hooks/useGameLogic.js src/components/game/InventorySlot.jsx src/components/game/OrderCard.jsx src/GameCore.jsx src/utils/translations.js src/App.jsx
git commit -m "feat: implement trait system with 45 traits, infusion mechanic, and value-based orders"
```
