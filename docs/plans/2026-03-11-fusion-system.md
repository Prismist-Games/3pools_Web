# Fusion System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current multi-item + quality order system with a name-fusion mechanic where players combine items into composites to fulfill orders requiring specific name combinations.

**Architecture:** Items gain a `names` array (single items have one entry, composites have multiple). Fusion combines two different-named items into one composite. Orders require a single item containing 3 specific names (4 for evacuation). Tool items are removed entirely. Merge (same name + same quality → quality+1) remains unchanged.

**Tech Stack:** React 18, Vite 6, JavaScript (ESM), Tailwind CSS 3

**Note:** This project has no test suite. Verification is manual via `npm run dev` (localhost:5173/3pools_Web/).

---

## Summary of Design Rules

- **Fusion:** Two items with different names and no name overlap → new item with combined names, quality = max(inputs). When name counts differ, the item with fewer names must have strictly higher quality.
- **Merge (unchanged):** Two items with identical `names` array and same quality → quality+1. Cannot merge mythic or sterile items.
- **Orders:** Require 3 specific item names. Submitted item must contain all required names (superset OK). No quality requirement on orders. No joint technique (one item per order).
- **Evacuation orders:** Require 4 specific item names. No quality restriction.
- **Score:** Fixed base score per order. Multiplier = 1 + submitted item's rarity bonus.
- **Tool items:** Removed entirely.
- **Sterile items:** Cannot merge, CAN fuse.
- **Composite recycle value:** Same as single item of that quality.

---

## Task 1: Update Item Data Model

**Files:**
- Modify: `src/hooks/useGameLogic.js` (createItem, ~line 599)
- Modify: `src/utils/helpers.js` (rollRarity return isn't affected, but generateOrder uses item templates)

**Goal:** All items carry a `names` array, `icons` array, and `poolIds` array. Single items have arrays of length 1.

**Step 1: Update `createItem()` in useGameLogic.js**

At line 599-610, change:

```javascript
const createItem = (pool, itemTemplate, affixKey = null) => {
    const rarity = rollRarity(config, affixKey, gold, hasSkill, skillState, currentStageConfig);
    return {
        ...itemTemplate,
        uid: Math.random().toString(36).substr(2, 9),
        poolName: pool.name,
        rarity: rarity,
        sterile: affixKey === 'hardened',
        decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 40) : undefined,
        // New: composite item support
        names: [itemTemplate.name],
        icons: [itemTemplate.icon],
        poolIds: [pool.id],
    };
};
```

**Step 2: Update trade-in item creation in handleSlotClick**

At ~line 1338-1345 where trade-in creates a new item, add the same arrays:

```javascript
const newItem = {
    ...tpl,
    uid: Math.random().toString(36).substr(2, 9),
    poolName: pool.name,
    rarity: newRarity,
    sterile: consumedItem.sterile,
    decay: currentStageConfig.mechanics.entropy ? (currentStageConfig.entropyDecayValue || 40) : undefined,
    names: [tpl.name],
    icons: [tpl.icon],
    poolIds: [pool.id],
};
```

**Step 3: Verify**

Run `npm run dev`, draw some items, open browser console, inspect inventory items to confirm `names` array exists.

**Step 4: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: add names/icons/poolIds arrays to item data model"
```

---

## Task 2: Remove Tool Items

**Files:**
- Modify: `src/hooks/useGameLogic.js` (remove tool state, tool logic, tryDropToolItem)
- Modify: `src/data/constants.js` (remove TOOL_ITEMS export usage — keep definition for reference but stop importing)
- Modify: `src/components/game/InventorySlot.jsx` (remove tool item rendering and right-click handler)
- Modify: `src/GameCore.jsx` (remove tool-related UI/state references)

**Step 1: Remove tool state and imports from useGameLogic.js**

- Line 10: Remove `TOOL_ITEMS` from import
- Line 62: Remove `toolSelectionMode` state declaration
- Remove the `tryDropToolItem` function (search for `tryDropToolItem`)
- Remove the `handleToolItemUse` function (search for `handleToolItemUse`)
- In `handleSlotClick` (line 1218-1263): Remove the entire `toolSelectionMode` block
- In all `handleIncomingItems` calls: Replace `tryDropToolItem([item])` with just `[item]` (or `[finalItem]`)
- In the return object: Remove `toolSelectionMode` from state, remove any tool-related actions
- Remove `rollWeightedRarity` helper if only used by tools

**Step 2: Clean up InventorySlot.jsx**

- Remove ToolItemTooltip component
- Remove `onContextMenu` handler for tool items
- Remove tool-specific styling/indicators
- Remove any `isToolItem` conditional rendering

**Step 3: Clean up GameCore.jsx**

- Remove references to `toolSelectionMode` from state destructuring
- Remove any tool-related UI elements or conditional rendering

**Step 4: Verify**

Run `npm run dev`, draw items, confirm no tool items drop, no right-click tool behavior.

**Step 5: Commit**

```bash
git add src/hooks/useGameLogic.js src/data/constants.js src/components/game/InventorySlot.jsx src/GameCore.jsx
git commit -m "feat: remove tool item system"
```

---

## Task 3: Add Fusion Mechanic

**Files:**
- Modify: `src/hooks/useGameLogic.js` (add fusion helpers, integrate into handleSlotClick)

**Step 1: Add fusion helper functions**

Add these near the top of the hook (after createItem, before handleIncomingItems):

```javascript
// Check if two items can fuse (different names, no overlap, quality gate)
const canFuse = (item1, item2) => {
    if (!item1 || !item2) return false;
    // Decay check
    if ((item1.decay !== undefined && item1.decay <= 0) ||
        (item2.decay !== undefined && item2.decay <= 0)) return false;

    const names1 = item1.names || [item1.name];
    const names2 = item2.names || [item2.name];

    // No overlap allowed
    const hasOverlap = names1.some(n => names2.includes(n));
    if (hasOverlap) return false;

    // Quality gate: when name counts differ, fewer-names item must have strictly higher quality
    if (names1.length !== names2.length) {
        const fewerItem = names1.length < names2.length ? item1 : item2;
        const moreItem = names1.length < names2.length ? item2 : item1;
        if (fewerItem.rarity.bonus <= moreItem.rarity.bonus) return false;
    }

    return true;
};

// Perform fusion: combine two items into one composite
const fuseItems = (item1, item2) => {
    const names1 = item1.names || [item1.name];
    const names2 = item2.names || [item2.name];
    const icons1 = item1.icons || [item1.icon];
    const icons2 = item2.icons || [item2.icon];
    const poolIds1 = item1.poolIds || [item1.poolId];
    const poolIds2 = item2.poolIds || [item2.poolId];

    const combinedNames = [...names1, ...names2];
    const combinedIcons = [...icons1, ...icons2];
    const combinedPoolIds = [...poolIds1, ...poolIds2];

    // Quality = max of the two inputs
    const maxRarity = item1.rarity.bonus >= item2.rarity.bonus ? item1.rarity : item2.rarity;

    return {
        name: combinedNames.join('×'),
        names: combinedNames,
        icons: combinedIcons,
        poolId: combinedPoolIds[0], // primary pool (for backwards compat)
        poolIds: combinedPoolIds,
        poolName: combinedPoolIds.map(pid => {
            const pool = config.pools.find(p => p.id === pid);
            return pool ? pool.name : pid;
        }).join('×'),
        uid: Math.random().toString(36).substr(2, 9),
        rarity: maxRarity,
        sterile: false, // composites are never sterile
        decay: currentStageConfig.mechanics.entropy
            ? Math.max(item1.decay || 0, item2.decay || 0)
            : undefined,
        icon: combinedIcons[0], // primary icon for backwards compat
    };
};
```

**Step 2: Integrate fusion into selectedSlot logic in handleSlotClick**

In `handleSlotClick`, at ~line 1449-1472, after the merge check and before the swap logic, add fusion:

```javascript
// After existing merge check (line ~1457) fails:
// Check for fusion
if (targetItem && canFuse(sourceItem, targetItem)) {
    const fusedItem = fuseItems(sourceItem, targetItem);
    const newInventory = [...inventory];
    newInventory[index] = fusedItem;
    newInventory[selectedSlot] = null;
    setInventory(newInventory.filter(item => item !== null));
    // Clear any assignments for consumed items
    if (assignedItemUids.has(targetItem.uid)) removeAssignmentByUid(targetItem.uid);
    if (assignedItemUids.has(sourceItem.uid)) removeAssignmentByUid(sourceItem.uid);
    setSelectedSlot(null);
    showToast(`${t("融合")}: ${sourceItem.name} + ${targetItem.name} → ${fusedItem.name}`, 'success');
    return;
}
```

**Step 3: Integrate fusion into pendingItem logic**

In `handleSlotClick`, at ~line 1371, after the merge check for pendingItem, add:

```javascript
// After pending merge check fails, before overload check:
if (targetItem && canFuse(pendingItem, targetItem)) {
    const fusedItem = fuseItems(pendingItem, targetItem);
    const newInventory = [...inventory];
    newInventory[index] = fusedItem;
    setInventory(newInventory);
    if (assignedItemUids.has(targetItem.uid)) removeAssignmentByUid(targetItem.uid);
    setPendingItem(null);
    showToast(`${t("融合")}: ${pendingItem.name} + ${targetItem.name} → ${fusedItem.name}`, 'success');
    return;
}
```

**Step 4: Also integrate fusion into the assigned-item check block**

At ~line 1276-1286, expand the "allow selectedSlot merge" check to also allow fusion:

```javascript
else if (selectedSlot !== null) {
    const sourceItem = inventory[selectedSlot];
    const canMergeItems = sourceItem && clickedItem && !clickedItem.sterile && !sourceItem.sterile &&
        sourceItem.name === clickedItem.name &&
        sourceItem.rarity.id === clickedItem.rarity.id &&
        sourceItem.rarity.id !== 'mythic' &&
        (!clickedItem.decay || clickedItem.decay > 0) && (!sourceItem.decay || sourceItem.decay > 0);
    const canFuseItems = canFuse(sourceItem, clickedItem);
    if (!canMergeItems && !canFuseItems) {
        return; // Can't merge or fuse, block
    }
    // else fall through to merge/fuse logic
}
```

**Step 5: Update merge checks to use `names` array**

In all merge checks throughout handleSlotClick and handleOrderSlotClick, change:
- `sourceItem.name === targetItem.name` → compare names arrays:

```javascript
const namesMatch = (a, b) => {
    const na = a.names || [a.name];
    const nb = b.names || [b.name];
    return na.length === nb.length && na.every((n, i) => nb.includes(n));
};
```

Use `namesMatch(sourceItem, targetItem)` instead of `sourceItem.name === targetItem.name` in all merge checks.

**Step 6: Verify**

Run `npm run dev`:
1. Draw two different single items (e.g., watermelon and lemon — same pool, different names)
2. Click one, click the other → they should fuse into "西瓜×柠檬"
3. The fused item should show in inventory
4. Try fusing a 1-name Common with a 2-name Common → should fail (quality gate)
5. Try fusing a 1-name Uncommon with a 2-name Common → should succeed

**Step 7: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: add fusion mechanic for combining items"
```

---

## Task 4: Redesign Order System

**Files:**
- Modify: `src/utils/helpers.js` (generateOrder)
- Modify: `src/hooks/useGameLogic.js` (satisfiableOrders, handleConfirmSubmission, potentialSatisfiableOrders)
- Modify: `src/data/constants.js` (add baseOrderScore config if needed)

**Step 1: Rewrite `generateOrder()` in helpers.js**

Replace the current generateOrder with a simplified version:

```javascript
export const generateOrder = (allNormalItems, config, hasSkill = () => false, currentStageConfig, isEmergency = false, emergencyDifficulty = 1) => {
    // Determine how many names the order requires
    const nameCount = isEmergency ? 4 : 3;

    // Pick random unique item names
    const selectedItems = getRandomItems(allNormalItems, nameCount);
    const requiredNames = selectedItems.map(item => item.name);
    const requiredIcons = selectedItems.map(item => item.icon);
    const requiredPoolIds = selectedItems.map(item => item.poolId);

    // Base score reward (only for non-emergency orders)
    const baseScoreReward = isEmergency ? 0 : (currentStageConfig.baseRewards?.[nameCount] || 15);

    return {
        id: Math.random().toString(36).substr(2, 9),
        requiredNames,
        requiredIcons,
        requiredPoolIds,
        baseScoreReward,
        isScoreOrder: !isEmergency,
        isEmergency: isEmergency || false,
        difficulty: isEmergency ? emergencyDifficulty : undefined,
        // Keep requirements as empty array for backwards compat with any code that reads .requirements.length
        requirements: requiredNames.map((name, i) => ({
            name,
            icon: requiredIcons[i],
            poolId: requiredPoolIds[i],
        })),
    };
};
```

Note: `rollRequirementRarity` is no longer called by generateOrder. Keep the function in helpers.js for now (don't delete, it may be used elsewhere).

**Step 2: Rewrite `satisfiableOrders` in useGameLogic.js**

Replace the current useMemo at ~line 388-464:

```javascript
const satisfiableOrders = useMemo(() => {
    if ((!isSubmitMode && !isEvacuationMode) || selectedIndices.length === 0) return [];
    const selectedItems = selectedIndices.map(idx => inventory[idx]).filter(Boolean);

    const checkOrder = (order, orderIndex) => {
        if (!order) return null;
        const requiredNames = order.requiredNames || order.requirements?.map(r => r.name) || [];

        // Find a selected item whose names contain ALL required names
        for (const item of selectedItems) {
            const itemNames = item.names || [item.name];
            const hasAllNames = requiredNames.every(rn => itemNames.includes(rn));
            if (hasAllNames && (!item.decay || item.decay > 0)) {
                // Calculate score
                const multiplier = 1 + (item.rarity.bonus || 0);
                const finalScoreReward = Math.ceil((order.baseScoreReward || 0) * multiplier);

                return {
                    index: orderIndex,
                    finalScoreReward,
                    isScoreOrder: order.isScoreOrder !== false,
                    matchedItemUid: item.uid,
                    requiredNames,
                };
            }
        }
        return null;
    };

    const results = [];
    const usedItemUids = new Set(); // No joint technique: each item used once

    const ordersToCheck = isEvacuationMode
        ? emergencyOrders.map((o, i) => ({ order: o, index: 998 + i }))
        : orders.map((o, i) => ({ order: o, index: i }));

    for (const { order, index } of ordersToCheck) {
        if (!order) continue;
        const requiredNames = order.requiredNames || order.requirements?.map(r => r.name) || [];

        // Find best matching item (highest quality) not yet used
        let bestMatch = null;
        let bestBonus = -1;

        for (const item of selectedItems) {
            if (usedItemUids.has(item.uid)) continue;
            const itemNames = item.names || [item.name];
            const hasAllNames = requiredNames.every(rn => itemNames.includes(rn));
            if (hasAllNames && (!item.decay || item.decay > 0)) {
                if (item.rarity.bonus > bestBonus) {
                    bestMatch = item;
                    bestBonus = item.rarity.bonus;
                }
            }
        }

        if (bestMatch) {
            usedItemUids.add(bestMatch.uid);
            const multiplier = 1 + (bestMatch.rarity.bonus || 0);
            const finalScoreReward = Math.ceil((order.baseScoreReward || 0) * multiplier);
            results.push({
                index,
                finalScoreReward,
                isScoreOrder: order.isScoreOrder !== false,
                matchedItemUid: bestMatch.uid,
                requiredNames,
            });
        }
    }

    return results;
}, [orders, emergencyOrders, isSubmitMode, isEvacuationMode, selectedIndices, inventory]);
```

**Step 3: Update `potentialSatisfiableOrders`**

Apply similar logic as above but checking ALL inventory items (not just selected). At ~line 467-510.

**Step 4: Update `handleConfirmSubmission`**

At ~line 1779-1889, update to consume the matched items:

Key changes:
- Instead of consuming all `selectedIndices`, consume only the items matched by `satisfiableOrders` (via `matchedItemUid`)
- Remove skill checks that depend on old order structure (big_order_expert checks `reqCount === 4`, hard_order_expert checks `requiredRarity` — these don't apply in new system)

```javascript
const handleConfirmSubmission = () => {
    if (satisfiableOrders.length === 0) {
        showToast(t("请至少完成一个任务才能提交！"), "error");
        return;
    }

    let gainedScore = 0;
    const completedIndices = [];
    let completedScoreCount = 0;
    const nextSkillState = { ...skillState };
    const consumedUids = new Set();

    satisfiableOrders.forEach(({ index, finalScoreReward, isScoreOrder, matchedItemUid }) => {
        gainedScore += finalScoreReward;
        completedIndices.push(index);
        consumedUids.add(matchedItemUid);

        if (hasSkill('auto_restock')) nextSkillState.nextDrawExtraItem = true;
        if (hasSkill('turn_fortune')) nextSkillState.nextDrawGuaranteedRare = true;

        if (isScoreOrder) completedScoreCount++;
    });

    setSkillState(nextSkillState);
    setScore(prev => prev + gainedScore);

    if (completedIndices.length > 0) {
        setOrderRefreshCount(prev => Math.min(REFRESH_MAX, prev + completedIndices.length));
    }

    // Difficulty decrease on score orders
    if (completedScoreCount > 0) {
        const difficultyConfig = config.emergency?.difficulty;
        if (difficultyConfig) {
            const decreaseAmountBase = difficultyConfig.decreaseOnScoreOrder !== undefined ? difficultyConfig.decreaseOnScoreOrder : 1;
            const decreaseAmount = decreaseAmountBase * completedScoreCount;
            const minDifficulty = difficultyConfig.minDifficulty || 1;
            if (decreaseAmount > 0) {
                setEmergencyDifficulty(prev => {
                    const newDiff = Math.max(minDifficulty, prev - decreaseAmount);
                    if (newDiff < prev) {
                        showToast(`${t("积分订单达成，离开关卡需求难度降低至")} ${newDiff}！`, "success");
                    }
                    return newDiff;
                });
            }
        }
    }

    // Generate candidate orders for completed normal orders
    const normalCompletedIndices = completedIndices.filter(idx => idx < 998);
    if (normalCompletedIndices.length > 0) {
        clearAssignmentsForOrders(normalCompletedIndices);
    }

    const candidateQueue = [];
    completedIndices.forEach(idx => {
        if (idx < 998) {
            const candidate1 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            const candidate2 = generateOrder(allNormalItems, config, hasSkill, currentStageConfig);
            candidateQueue.push({ slotIndex: idx, candidates: [candidate1, candidate2] });
        }
    });

    if (candidateQueue.length > 0) {
        setOrderCandidates(candidateQueue[0]);
        if (candidateQueue.length > 1) {
            setOrderCandidateQueue(candidateQueue.slice(1));
        }
    }

    // Consume matched items only
    const newInventory = inventory.filter(item => item && !consumedUids.has(item.uid));
    setInventory(newInventory);

    setIsSubmitMode(false);
    setSelectedIndices([]);
};
```

**Step 5: Update evacuation order generation**

In `handleEvacuationContinue` (~line 2000), the generateOrder calls already pass `isEmergency=true`. Since our new generateOrder uses `nameCount = isEmergency ? 4 : 3`, evacuation orders will automatically get 4 names. No change needed here.

But verify that the initial emergency order generation (in useEffect or init code) also uses the updated generateOrder.

**Step 6: Update `handleConfirmEvacuation`**

At ~line 2047-2065, this already uses `satisfiableOrders` which we've updated. Should work. Verify the item consumption logic matches the new pattern (consume by uid, not by selectedIndices).

**Step 7: Remove/simplify order slot assignment system**

The current system assigns individual items to individual requirement slots. With the new system, there are no per-requirement slots — just "does this item match this order?"

Options:
- **Quick approach:** Keep the state but stop using it. Remove slot-click handlers from OrderCard.
- **Clean approach:** Remove `orderSlotAssignments`, `assignedItemUids`, `phantomMarks` state and all related functions.

For the prototype, take the quick approach — comment out or skip slot assignment logic, don't delete it yet.

**Step 8: Verify**

Run `npm run dev`:
1. Check that orders now show 3 names (even if UI is rough)
2. Fuse items to create a composite matching an order
3. Enter submit mode, select the composite
4. Confirm the order is satisfied and score is awarded
5. Check evacuation orders show 4 names

**Step 9: Commit**

```bash
git add src/utils/helpers.js src/hooks/useGameLogic.js
git commit -m "feat: redesign order system for fusion-based gameplay"
```

---

## Task 5: Update UI Components

**Files:**
- Modify: `src/components/game/InventorySlot.jsx`
- Modify: `src/components/game/OrderCard.jsx`
- Modify: `src/GameCore.jsx`

**Step 1: Update InventorySlot to display composite items**

Composite items have multiple names/icons. The slot should show:
- For single items (1 name): current display (icon + name)
- For composites (2+ names): show multiple small icons, condensed name like "西瓜×注射器"

Key changes:
- Read `item.names` and `item.icons` arrays
- If `names.length > 1`, render a composite display (e.g., multiple small icons in a grid, truncated combined name)
- Quality border color still based on `item.rarity`

**Step 2: Update OrderCard to display name requirements**

Replace the current requirement slot display with a simpler list of required names:
- Show 3 (or 4) name labels/icons for the order's `requiredNames`
- Highlight the order when a matching composite is selected in submit mode
- Remove the per-slot assignment UI (no more individual requirement slots)

Key changes:
- Read `order.requiredNames` and `order.requiredIcons`
- Render each required name as a small label with icon
- In submit mode, check if any selected item satisfies this order and show visual feedback
- Remove `orderSlotAssignments` rendering

**Step 3: Update GameCore.jsx**

- Remove slot assignment interactions (no more dragging items to order slots)
- Remove tool-related conditional rendering (already done in Task 2)
- Update the submit mode UI to work with the new order matching
- Update any score preview displays

**Step 4: Add fusion visual feedback to InventorySlot**

When an item is selected (selectedSlot), other items that can fuse with it should have a visual indicator (similar to the current merge indicator):
- Pass `canFuseWith` flag or compute it in the component
- Show a distinct border/glow for fusible items (different from merge indicator)

**Step 5: Verify**

Run `npm run dev`:
1. Orders display 3 name requirements clearly
2. Composite items display legibly in inventory
3. Fusible items are highlighted when a source item is selected
4. Submit mode correctly highlights satisfiable orders
5. Full gameplay loop works: draw → fuse → submit → new order

**Step 6: Commit**

```bash
git add src/components/game/InventorySlot.jsx src/components/game/OrderCard.jsx src/GameCore.jsx
git commit -m "feat: update UI for fusion system and name-based orders"
```

---

## Task 6: Translations & Edge Cases

**Files:**
- Modify: `src/utils/translations.js`

**Step 1: Add fusion-related translations**

```javascript
// Add to translations
"融合": "Fuse",
"融合成功": "Fusion successful",
"无法融合": "Cannot fuse",
"品质不足，无法融合": "Quality too low to fuse",
"名字重叠，无法融合": "Overlapping names, cannot fuse",
```

**Step 2: Handle edge cases**

- Trade-in affix with composites: consuming a composite should work (big cost, clear feedback)
- Ensure recycling composites works correctly (uses rarity.recycleValue, unchanged)
- Ensure pending item fusion works when inventory is full
- Ensure fragmented affix (3 items) works correctly with new item structure

**Step 3: Verify full gameplay loop**

1. Start new game
2. Draw items from different pools
3. Merge same-name items to raise quality
4. Fuse different items into composites
5. Submit composites to orders
6. Complete evacuation orders with 4-name composites
7. Test recycling composites
8. Test trade-in with composites
9. Test all affix types still work

**Step 4: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat: add fusion translations and handle edge cases"
```

---

## Task 7: Clean Up & Polish

**Step 1: Remove dead code**

- Remove `rollRequirementRarity` calls from generateOrder (already done, but verify no other callers)
- Remove `orderCountWeights` usage (orders always have 1 composite requirement now)
- Clean up any remaining tool item references
- Remove unused skill interactions (big_order_expert, hard_order_expert depend on old order structure — disable or adapt)

**Step 2: Update game rules doc**

Update `design_docs/game_rules.md` with the new mechanics. At minimum:
- Document fusion rules
- Document new order format
- Document removal of tool items
- Note this is a prototype version

**Step 3: Final verify**

Full playthrough to confirm everything works together.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: clean up dead code and update game rules"
```

---

## Execution Notes

- **Order of tasks matters:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
- Task 2 (remove tools) should be done before Task 3 (add fusion) to reduce complexity during merge conflict resolution in handleSlotClick
- Task 4 (order redesign) depends on Task 1 (item model) and Task 3 (fusion) being complete
- Task 5 (UI) should be done after Task 4 so we can test the full loop
- The UI in Task 5 should be functional, not polished — this is a rapid prototype
- If `npm run lint` reports issues, fix them before committing
