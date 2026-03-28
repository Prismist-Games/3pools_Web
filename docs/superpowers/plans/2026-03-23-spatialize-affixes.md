# Spatialize Affixes on Item Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move quality effects (affixes) from a separate menu onto the 3×4 item map as spatial cells, so the player interacts with them by framing them with the 2×2 cursor rather than selecting from a list.

**Architecture:** The item map grid (`itemMap`) is extended to support two cell types: regular items and effect cells. 3 of the 12 grid positions are designated as "effect slots" with spacing constraints (no 2×2 frame can cover more than 1 effect). The FrameSelector menu is removed. When the player's 2×2 frame covers an effect cell, that effect applies to the draw; when no effect is covered, a cheap default draw occurs. Effect contents refresh each draw (positions stay fixed until full map refresh).

**Tech Stack:** React 18, Tailwind CSS 3, Vite 6, JavaScript (ESM/.jsx)

**Important project context:**
- No test suite exists — this is a rapid prototype project
- All game state lives in `useGameLogic` hook; components are pure display
- Chinese is source language; wrap UI strings with `t()`, add English to `translations.js`
- Config-driven: game data in `src/data/constants.js`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/spatialPoolHelpers.js` | Modify | Add effect placement logic, modify `generateItemMap()` and `refreshCoveredCells()` |
| `src/data/spatialConstants.js` | Modify | Add `EFFECT_SLOT_COUNT` constant |
| `src/components/game/ItemMap.jsx` | Modify | Render effect cells, remove `hasSelectedEffect` gate, show hover cost |
| `src/hooks/useGameLogic.js` | Modify | Rework `handleMapPlace()` to detect effects in coverage, remove frame selection state, modify `refreshPools()` |
| `src/GameCore.jsx` | Modify | Remove FrameSelector, update ItemMap props and disabled conditions |
| `src/utils/translations.js` | Modify | Add English translations if needed |

---

## Task 1: Extend Map Data Structure with Effect Cells

**Files:**
- Modify: `src/data/spatialConstants.js`
- Modify: `src/utils/spatialPoolHelpers.js`

### Design

Effect cells are map grid cells with an `isEffect: true` flag and an `effect` object containing the quality effect config. 3 effect cells are placed with a spacing constraint: for any two effects, `|rowA - rowB| >= 2` OR `|colA - colB| >= 2`. This guarantees no 2×2 frame can cover more than 1 effect.

### Steps

- [ ] **Step 1.1: Add constant for effect slot count**

In `src/data/spatialConstants.js`, add:
```javascript
export const EFFECT_SLOT_COUNT = 3;
```

- [ ] **Step 1.2: Add `EFFECT_SLOT_COUNT` to imports in spatialPoolHelpers**

In `src/utils/spatialPoolHelpers.js`, update the import block (line 4-10) to include `EFFECT_SLOT_COUNT`:

```javascript
import {
  ALL_ITEMS,
  QUALITY_EFFECTS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  EFFECT_SLOT_COUNT,
} from '../data/spatialConstants.js';
```

- [ ] **Step 1.3: Add `generateEffectPositions()` to spatialPoolHelpers**

```javascript
/**
 * Pick EFFECT_SLOT_COUNT positions on the grid with spacing constraint:
 * no two positions share a 2×2 block (i.e., for any pair,
 * |row diff| >= 2 OR |col diff| >= 2).
 */
export function generateEffectPositions() {
  const allCells = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      allCells.push([r, c]);
    }
  }
  // Shuffle
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }
  const positions = [];
  for (const [r, c] of allCells) {
    if (positions.length >= EFFECT_SLOT_COUNT) break;
    const valid = positions.every(([pr, pc]) =>
      Math.abs(pr - r) >= 2 || Math.abs(pc - c) >= 2
    );
    if (valid) positions.push([r, c]);
  }
  // Greedy pick can fail with unlucky shuffle order — retry
  if (positions.length < EFFECT_SLOT_COUNT) return generateEffectPositions();
  return positions;
}
```

- [ ] **Step 1.4: Add `pickRandomEffects()` helper**

```javascript
/**
 * Pick `count` unique random quality effects from QUALITY_EFFECTS.
 * Returns array of effect config objects.
 */
export function pickRandomEffects(count) {
  const shuffled = [...QUALITY_EFFECTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
```

- [ ] **Step 1.5: Modify `generateItemMap()` to include effect cells**

Replace the current implementation:

```javascript
export function generateItemMap() {
  // 1. Generate effect slot positions with spacing constraint
  const effectPositions = generateEffectPositions();
  const effects = pickRandomEffects(effectPositions.length);
  const effectSet = new Set(effectPositions.map(([r, c]) => `${r},${c}`));

  // 2. Shuffle items for non-effect cells
  const shuffled = [...ALL_ITEMS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3. Build grid
  const grid = [];
  let itemIdx = 0;
  let effectIdx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (effectSet.has(`${r},${c}`)) {
        row.push({ isEffect: true, effect: effects[effectIdx++] });
      } else {
        row.push(shuffled[itemIdx++ % shuffled.length]);
      }
    }
    grid.push(row);
  }
  return grid;
}
```

- [ ] **Step 1.6: Modify `refreshCoveredCells()` to skip effect cells**

Effect cells are NOT refreshed here — `refreshAllEffects()` (Step 1.6) handles all effect content refreshes. This function only refreshes item cells.

```javascript
/**
 * Refresh item cells covered by a 2×2 placement.
 * Effect cells are skipped (handled by refreshAllEffects).
 */
export function refreshCoveredCells(itemMap, anchorRow, anchorCol) {
  const newMap = itemMap.map(row => [...row]);
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue;
    if (newMap[r][c].isEffect) continue; // Skip effect cells
    newMap[r][c] = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  }
  return newMap;
}
```

- [ ] **Step 1.7: Add `refreshAllEffects()` — refresh just effect contents across entire map**

This is called after each draw to give the player new effect options (mimicking the old "3 new affixes each draw"):

```javascript
/**
 * Refresh all effect cell contents on the map (positions unchanged).
 * Returns a new map.
 */
export function refreshAllEffects(itemMap) {
  const newMap = itemMap.map(row => [...row]);
  const newEffects = pickRandomEffects(EFFECT_SLOT_COUNT);
  let idx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (newMap[r][c].isEffect) {
        newMap[r][c] = { isEffect: true, effect: newEffects[idx++] };
      }
    }
  }
  return newMap;
}
```

- [ ] **Step 1.8: Verify dev server runs without errors**

Run: `npm run dev`

The map should now show 3 effect cells (they'll look broken in the UI until Task 2 — that's expected). Verify no console errors.

- [ ] **Step 1.9: Commit**

```bash
git add src/data/spatialConstants.js src/utils/spatialPoolHelpers.js
git commit -m "feat: extend item map data structure with effect cells"
```

---

## Task 2: Render Effect Cells in ItemMap

**Files:**
- Modify: `src/components/game/ItemMap.jsx`

### Design

Effect cells get a distinct visual treatment: teal background with dashed border, showing the effect name and cost. They're clearly differentiated from item cells. The `hasSelectedEffect` prop is removed — the map is always interactive (the player no longer needs to select a frame first). All existing affix name translations already exist in `translations.js`.

### Steps

- [ ] **Step 2.1: Update ItemMap to render effect cells**

In `ItemMap.jsx`, modify the cell rendering loop. For each cell, check `cell.isEffect`:

```jsx
// Inside the mapping loop, replace the current cell content render:
const cell = itemMap[row][col];
const isEffectCell = cell.isEffect;

// For effect cells, no rarity highlighting from orders
const neededRarity = isEffectCell ? null : neededItems.get(cell.name);
```

Replace the cell content JSX (the `<span>` elements inside the cell div) with:

```jsx
{isEffectCell ? (
  <>
    <span className={`text-xs font-bold leading-tight text-center transition-all duration-300 ${iconClass}`}>
      {t(cell.effect.name)}
    </span>
    <span className={`flex items-center gap-0.5 text-[10px] font-bold text-amber-600 mt-0.5 transition-all duration-300 ${
      textVisible ? '' : 'opacity-0'
    }`}>
      <Coins size={10} />{cell.effect.cost}
    </span>
  </>
) : (
  <>
    <span className={`text-xl leading-none transition-all duration-300 ${iconClass}`}>
      {cell.icon}
    </span>
    <span className={`text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px] transition-all duration-300 ${
      textVisible ? '' : 'opacity-0'
    }`}>
      {t(cell.name)}
    </span>
    {neededRarity && textVisible && (
      <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${RARITY_LABEL_COLOR[neededRarity]}`}>
        {RARITY_LABEL[neededRarity]}+
      </span>
    )}
  </>
)}
```

Add the `Coins` import at the top of `ItemMap.jsx`:
```javascript
import { Coins } from 'lucide-react';
```

- [ ] **Step 2.2: Add default styling for effect cells**

In the `bgClass` determination logic, add an effect-cell default style. After the existing conditions (animation phases, hover, needed rarity), add a branch for effect cells:

```javascript
} else if (isEffectCell) {
  bgClass = 'bg-teal-50 border-teal-300 border-dashed';
} else if (neededRarity) {
```

- [ ] **Step 2.3: Remove `hasSelectedEffect` gate from hover/click**

Change all references to `hasSelectedEffect` in ItemMap:

1. `coveredCells` useMemo: remove `!hasSelectedEffect` condition → always compute when `hoverAnchor` exists
2. `isValidHover` useMemo: same change
3. `handleCellHover`: remove `if (!hasSelectedEffect ...)` gate
4. `handleCellClick`: remove `if (!hasSelectedEffect ...)` gate
5. Cursor class: remove `hasSelectedEffect &&` condition, always show `cursor-crosshair` when not disabled

Remove `hasSelectedEffect` from the component props entirely.

- [ ] **Step 2.4: Update `onHoverCoverage` to only report item names (not effects)**

In `handleCellHover`, filter out effect cells from the coverage names:

```javascript
const names = FIXED_SHAPE.cells
  .map(([dr, dc]) => {
    const cell = itemMap[row + dr]?.[col + dc];
    return cell && !cell.isEffect ? cell.name : null;
  })
  .filter(Boolean);
onHoverCoverage(names);
```

- [ ] **Step 2.5: Skip flying animation for effect cells**

In the `useEffect` that launches `FlyingItem` on 'fly' phase, add a guard:

```javascript
const cell = itemMap[r]?.[c];
if (cell && !cell.isEffect) {
  setFlyingItem({ icon: cell.icon, startRect: rect });
  setTimeout(() => setFlyingItem(null), 500);
}
```

- [ ] **Step 2.6: Verify visual rendering**

Run: `npm run dev`
Expected: 3 cells on the map show effect names + cost with teal dashed border. Other 9 cells show items as before. Hovering shows 2×2 frame highlight. Click does nothing yet (draw logic not updated).

- [ ] **Step 2.7: Commit**

```bash
git add src/components/game/ItemMap.jsx
git commit -m "feat: render effect cells on item map with distinct visuals"
```

---

## Task 3: Remove FrameSelector and Update GameCore Layout

**Files:**
- Modify: `src/GameCore.jsx`

### Steps

- [ ] **Step 3.1: Remove FrameSelector import and usage**

In `GameCore.jsx`:
1. Remove the import: `import FrameSelector from './components/game/FrameSelector';`
2. Remove the entire `<FrameSelector ... />` JSX block (lines ~390-396)

- [ ] **Step 3.2: Update ItemMap props**

Replace the current ItemMap usage with:

```jsx
<ItemMap
    itemMap={itemMap}
    drawAnimInfo={drawAnimInfo}
    milestone={milestone}
    rarityConfig={config.rarity}
    onPlace={handleMapPlace}
    onHoverCoverage={(names) => {
        state.setHoveredPoolItemNames(names);
    }}
    disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode}
/>
```

Key changes:
- Removed `hasSelectedEffect={selectedFrameIndex !== null}` (prop removed)
- Removed `selectedFrameIndex === null` from disabled condition (player can always interact)

- [ ] **Step 3.3: Update handleRefreshMap if needed**

Verify that `handleRefreshMap` in the actions still calls `generateItemMap()` which now includes effect cells. No change needed if so.

- [ ] **Step 3.4: Verify layout**

Run: `npm run dev`
Expected: FrameSelector menu is gone. Item map is directly visible with effect cells. Map is always interactive (hover shows 2×2 frame). Clicking doesn't draw yet.

- [ ] **Step 3.5: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: remove FrameSelector menu, map is always interactive"
```

---

## Task 4: Rework Draw Logic for Spatial Effects

**Files:**
- Modify: `src/hooks/useGameLogic.js`
- Modify: `src/utils/spatialPoolHelpers.js` (import `refreshAllEffects`)

### Design

`handleMapPlace()` now:
1. Gets frame coverage (4 cells)
2. Separates item cells from effect cells in the coverage
3. If 1 effect cell found: use that effect's config (cost, quality rules, etc.)
4. If 0 effect cells found: default draw — standard quality distribution, cost = 1
5. Draws from item cells only (effect cell is not an item to draw)
6. After draw: refresh covered item cells with new items, then refresh ALL effect contents on the map (via `refreshAllEffects`)

The `availableFrames` and `selectedFrameIndex` state variables are removed. `refreshPools()` is modified to call `refreshAllEffects()` on the item map instead of `generateFrames()`.

### Steps

- [ ] **Step 4.1: Add default draw config constant**

In `src/data/spatialConstants.js`, add:

```javascript
/** Default draw config when no effect cell is in the 2×2 frame */
export const DEFAULT_DRAW = { id: null, cost: 1 };
```

- [ ] **Step 4.2: Remove `availableFrames` and `selectedFrameIndex` state from useGameLogic**

In `useGameLogic.js`:
1. Remove: `const [availableFrames, setAvailableFrames] = useState(() => generateFrames());`
2. Remove: `const [selectedFrameIndex, setSelectedFrameIndex] = useState(null);`
3. Remove the `generateFrames` import from spatialPoolHelpers (it will be deleted in Step 4.2b)
4. Add `refreshAllEffects` to the existing spatialPoolHelpers import
5. Add import: `import { DEFAULT_DRAW } from '../data/spatialConstants.js';`
6. Remove `availableFrames` and `selectedFrameIndex` from the returned state object
7. Remove `handleFrameSelect` from the returned actions object

- [ ] **Step 4.2b: Remove dead `generateFrames` function from spatialPoolHelpers**

In `src/utils/spatialPoolHelpers.js`, delete the `generateFrames()` function (lines ~59-74). It's no longer called anywhere.

- [ ] **Step 4.3: Modify `refreshPools()` to refresh effect contents on the map**

Replace the current `refreshPools`:

```javascript
const refreshPools = (tick = false) => {
    // Refresh effect cell contents on the map (positions unchanged)
    setItemMap(prev => refreshAllEffects(prev));
    if (tick && currentStageConfig.mechanics.entropy) {
        setInventory(prev => prev.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        }));
    }
};
```

- [ ] **Step 4.4: Rewrite `handleMapPlace()` for spatial effects**

Replace the current `handleMapPlace` with:

```javascript
const handleMapPlace = (anchorRow, anchorCol) => {
    if (drawAnimInfo) return;

    const coverage = getFrameCoverage(anchorRow, anchorCol, itemMap);
    if (!coverage) return;

    // Separate items from effects in coverage
    const itemCells = coverage.filter(c => !c.item.isEffect);
    const effectCell = coverage.find(c => c.item.isEffect);

    // Determine effect config (null = default draw, no special effect)
    const affixConfig = effectCell ? effectCell.item.effect : null;
    const affixKey = affixConfig ? affixConfig.id : null;
    const cost = affixConfig ? affixConfig.cost : DEFAULT_DRAW.cost;

    // NOTE: Gold check and vip_discount are handled by handleDraw().
    // We do NOT duplicate that logic here. For interactive effects,
    // handleDraw is called immediately so the check happens before
    // any visible effect. For passive effects, the animation starts
    // first — this matches the existing architecture.

    const coveredKeys = new Set(coverage.map(c => `${c.row},${c.col}`));

    // Build virtual pool from item cells only
    const poolItems = itemCells.map(c => c.item);

    // For interactive effects (precise/trade_in), execute immediately
    if (affixKey === 'trade_in' || affixKey === 'precise') {
        const virtualPool = {
            name: 'spatial',
            items: poolItems,
            affixKey,
            affix: affixConfig,
            cost,
            originalId: 'spatial',
            id: 'spatial',
        };
        handleDraw(virtualPool);
        setTimeout(() => {
            setItemMap(prev => {
                const refreshed = refreshCoveredCells(prev, anchorRow, anchorCol);
                return refreshAllEffects(refreshed);
            });
        }, 600);
        return;
    }

    // For passive effects (or no effect): pick random item from item cells
    if (itemCells.length === 0) return; // Edge case: shouldn't happen with spacing constraint

    const drawnIndex = Math.floor(Math.random() * itemCells.length);
    const drawnCell = itemCells[drawnIndex];

    const makePool = () => {
        const items = affixKey === 'fragmented' ? poolItems : [drawnCell.item];
        return {
            name: 'spatial',
            items,
            affixKey,
            affix: affixConfig,
            cost,
            originalId: 'spatial',
            id: 'spatial',
        };
    };

    // Phase 1: highlight the drawn item (300ms)
    setDrawAnimInfo({
        drawnKey: `${drawnCell.row},${drawnCell.col}`,
        coveredKeys,
        phase: 'highlight',
    });

    setTimeout(() => {
        // Phase 2: drawn item flies to inventory (500ms)
        setDrawAnimInfo(prev => prev ? { ...prev, phase: 'fly' } : null);

        setTimeout(() => {
            // Phase 3: execute draw + other cells fade out (400ms)
            handleDraw(makePool());
            setDrawAnimInfo(prev => prev ? { ...prev, phase: 'exit' } : null);

            setTimeout(() => {
                // Phase 4: refresh cells, new items enter (350ms)
                setDrawAnimInfo(prev => prev ? { ...prev, phase: 'enter' } : null);
                setItemMap(prev => {
                    const refreshed = refreshCoveredCells(prev, anchorRow, anchorCol);
                    return refreshAllEffects(refreshed);
                });

                setTimeout(() => {
                    setDrawAnimInfo(null);
                }, 350);
            }, 400);
        }, 500);
    }, 300);
};
```

- [ ] **Step 4.5: Update `handleDraw` — handle null affixKey for default draws**

In the `handleDraw` function, the `affixKey` may now be `null` (default draw, no effect). The existing code paths check for specific affix keys (`trade_in`, `precise`) before falling through to `handleNormalDraw`. A `null` affixKey will naturally fall through to `handleNormalDraw`, which uses `rollRarity(config, affixKey, ...)` — verify that `rollRarity` handles `null` affixKey by returning standard weights. Check `src/utils/helpers.js` for `rollRarity` behavior with null/undefined affix.

If `rollRarity` doesn't handle null gracefully, add a guard:
```javascript
// In rollRarity or in handleNormalDraw:
// If affixKey is null/undefined, use standard rarity weights
```

- [ ] **Step 4.6: Update `handleRefreshMap` to regenerate full map with effects**

The current `handleRefreshMap` calls `generateItemMap()` which now includes effect cells. Verify it works. Should be fine with no changes needed.

- [ ] **Step 4.7: Remove stale state from return object**

In the return object of `useGameLogic`, remove:
- `availableFrames` from `state`
- `selectedFrameIndex` from `state`
- `handleFrameSelect` from `actions`

Also remove `setSelectedFrameIndex` from the return and any references in GameCore.

- [ ] **Step 4.8: Clean up GameCore references to removed state**

In `GameCore.jsx`, remove destructuring of `availableFrames`, `selectedFrameIndex`, and `handleFrameSelect` from the `state`/`actions` objects.

- [ ] **Step 4.9: Verify full draw flow**

Run: `npm run dev`

Test scenarios:
1. **Frame with 1 effect cell + 3 items**: hover shows highlight, click triggers draw with that effect. Cost matches effect cost. Items appear in inventory with correct quality rules.
2. **Frame with 0 effect cells (4 items)**: hover shows highlight, click triggers default draw at cost 1 with standard quality distribution.
3. **After each draw**: effect cell contents refresh (new random effects appear). Item cells in the covered area refresh. Other cells unchanged.
4. **Manual map refresh (1 gold button)**: entire map regenerates including new effect positions.
5. **Interactive effects**: "以旧换新" and "精准" still trigger their selection overlays correctly.
6. **Gold check**: can't draw if insufficient gold. Toast appears.

- [ ] **Step 4.10: Commit**

```bash
git add src/hooks/useGameLogic.js src/data/spatialConstants.js src/utils/spatialPoolHelpers.js src/GameCore.jsx
git commit -m "feat: spatialize affixes — draw logic uses map-embedded effects"
```

---

## Task 5: Polish and Edge Cases

**Files:**
- Modify: `src/components/game/ItemMap.jsx`
- Modify: `src/hooks/useGameLogic.js`

### Steps

- [ ] **Step 5.1: Effect cell hover highlight — use teal instead of indigo**

When the 2×2 frame covers an effect cell during hover, that effect cell should highlight in teal (consistent with its base color) while item cells highlight in indigo:

In the hover highlight branch of ItemMap:
```javascript
} else if (isCovered && isValidHover) {
  bgClass = isEffectCell
    ? 'bg-teal-100 border-teal-400 ring-2 ring-teal-300 scale-105'
    : 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105';
```

- [ ] **Step 5.2: Show cost indicator on hover**

When hovering over a valid 2×2 placement, display the draw cost near the frame. Add a small floating cost badge:

In ItemMap, after the grid div, conditionally render a cost indicator when hovering:

```jsx
{isValidHover && hoverAnchor && (
  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-bold text-amber-600 bg-white border border-amber-300 rounded px-1.5 py-0.5 shadow-sm pointer-events-none">
    <Coins size={12} />
    {(() => {
      const effectInFrame = FIXED_SHAPE.cells
        .map(([dr, dc]) => itemMap[hoverAnchor.row + dr]?.[hoverAnchor.col + dc])
        .find(cell => cell?.isEffect);
      return effectInFrame ? effectInFrame.effect.cost : 1;
    })()}
  </div>
)}
```

Note: Add `relative` to the grid div's className in ItemMap so the absolute positioning works:
```jsx
className="relative inline-grid gap-1 p-2 bg-slate-100 rounded-lg border border-slate-200"
```

- [ ] **Step 5.3: Animation — don't animate effect cells during exit/enter phases**

Effect cells should remain stable during the draw animation (they're landmarks, not drawn items). In the animation phase logic, skip animation for effect cells:

```javascript
// Add early in the animation checks:
if (isEffectCell && (phase === 'exit' || phase === 'enter') && isCoveredAnim) {
  // Effect cell stays visible and stable during animation
  bgClass = 'bg-teal-50 border-teal-300 border-dashed';
  iconClass = '';
  textVisible = true;
} else if (phase === 'highlight' && isDrawn) {
  // ... existing animation code
```

- [ ] **Step 5.4: Verify all edge cases**

Run: `npm run dev`

- Effect cells don't fly, don't fade during exit, don't scale during enter
- Cost badge appears on hover showing correct cost
- Effect cells have teal highlight when hovered
- Hovering different 2×2 positions shows different costs depending on whether an effect is included

- [ ] **Step 5.5: Run lint**

Run: `npm run lint`
Fix any linting errors.

- [ ] **Step 5.6: Commit**

```bash
git add src/components/game/ItemMap.jsx src/hooks/useGameLogic.js
git commit -m "feat: polish effect cell visuals, hover cost, animation handling"
```

---

## Task 6: Update Game Rules Documentation

**Files:**
- Modify: `design_docs/game_rules.md`

### Steps

- [ ] **Step 6.1: Update the "奖池系统（空间奖池）" section**

Update to reflect:
- Item map is now 3×4 with 9 items + 3 effect slots
- Effect slots have spacing constraint (no 2×2 frame covers 2+)
- Player places 2×2 frame directly (no separate effect menu)
- If frame covers an effect: that effect applies, cost = effect cost
- If no effect in frame: standard draw, cost = 1
- Effect contents refresh each draw; positions are fixed until full map refresh

Remove the "品质效果（词条）" subsection that describes the 3-choose-1 menu, or rewrite it to describe the spatial placement.

- [ ] **Step 6.2: Commit**

```bash
git add design_docs/game_rules.md
git commit -m "docs: update game rules for spatialized affixes"
```
