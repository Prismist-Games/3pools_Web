# Spatial Pool System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current category+affix pool system with a spatial pool selection system where 20 items are arranged on a 5×4 map and players use shape-based frames with quality effects to select draw targets.

**Architecture:** New spatial constants and helpers encapsulate shape/frame data and logic. `useGameLogic` adds spatial state (`itemMap`, `availableFrames`, `selectedFrameIndex`) and a `handleMapPlace` function that constructs a **virtual pool** from spatial coverage, then passes it through the **entire existing draw pipeline** (`handleDraw` → `handleNormalDraw`). This ensures all skill logic, entropy, enhancement, trade-in, precise selection, and item processing are automatically inherited. `refreshPools` is modified to generate frames instead of pools. New `ItemMap` and `FrameSelector` components replace `PoolCard`.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Lucide React. No test suite — verification via dev server (`npm run dev`).

**Design Spec:** `design_docs/spatial_pool_system_proposal.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/data/spatialConstants.js` | Shape definitions, quality effect configs, cost calculation |
| `src/utils/spatialPoolHelpers.js` | Item map generation, frame generation, shape rotation, coverage calculation |
| `src/components/game/ItemMap.jsx` | 5×4 item grid with frame placement hover preview and click-to-place |
| `src/components/game/FrameSelector.jsx` | 3 frame option cards with shape mini-preview, effect name, cost |

### Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useGameLogic.js` | Replace `activePools`/`generateActivePools` with spatial state (`itemMap`, `availableFrames`, `selectedFrameIndex`); new draw flow (`handleFrameSelect`, `handleMapPlace`); regenerate map on evacuation |
| `src/GameCore.jsx` | Replace `PoolCard` section with `ItemMap` + `FrameSelector`; wire new props/callbacks; update milestone highlighting |
| `src/utils/helpers.js` | No changes needed — `rollRarity` already works with affix ID strings |
| `src/utils/translations.js` | Add spatial pool UI strings |

### Deprecated (keep file, remove imports)

| File | Status |
|------|--------|
| `src/components/game/PoolCard.jsx` | No longer imported from GameCore |

---

## Task 1: Spatial Constants

**Files:**
- Create: `src/data/spatialConstants.js`

- [ ] **Step 1: Create spatialConstants.js**

```js
// src/data/spatialConstants.js
// Shape definitions, quality effects, and cost calculation for the spatial pool system.

import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG } from './constants.js';

// --- Flat item list (all 20 items) ---
export const ALL_ITEMS = INITIAL_POOLS_DATA.flatMap(pool =>
  pool.items.map(item => ({
    name: item.name,
    icon: item.icon,
    poolId: pool.id,
    poolName: pool.name,
  }))
);

// --- Base shape definitions ---
// cells are [row, col] offsets from anchor (top-left origin)
export const BASE_SHAPES = [
  {
    id: 'single',
    name: '单格',
    cells: [[0, 0]],
  },
  {
    id: 'domino',
    name: '双格',
    cells: [[0, 0], [0, 1]],
  },
  {
    id: 'tromino_line',
    name: '三连',
    cells: [[0, 0], [0, 1], [0, 2]],
  },
  {
    id: 'tromino_l',
    name: 'L形',
    cells: [[0, 0], [1, 0], [1, 1]],
  },
  {
    id: 'tetromino_square',
    name: '方块',
    cells: [[0, 0], [0, 1], [1, 0], [1, 1]],
  },
  {
    id: 'tetromino_t',
    name: 'T形',
    cells: [[0, 0], [0, 1], [0, 2], [1, 1]],
  },
];

// --- Quality effects (adapted from affixes, excluding 'targeted') ---
// 'targeted' is removed — its function is replaced by small shapes.
export const QUALITY_EFFECTS = INITIAL_AFFIXES_CONFIG.filter(a => a.id !== 'targeted');

// --- Cost calculation ---
// Cost = shape base cost (by coverage count) + quality effect premium
export const SHAPE_BASE_COSTS = {
  1: 4, // single cell — maximum name precision
  2: 3,
  3: 2,
  4: 1, // 4 cells — least precision
};

export const QUALITY_PREMIUMS = {
  trade_in: 0,
  volatile: 0,
  fragmented: 0,
  hardened: 1,
  precise: 1,
  purified: 2,
};

export function calculateFrameCost(coverageCount, qualityEffectId) {
  const baseCost = SHAPE_BASE_COSTS[coverageCount] ?? 1;
  const premium = QUALITY_PREMIUMS[qualityEffectId] ?? 0;
  return baseCost + premium;
}

// --- Generation constraints ---
// These quality effects require coverage >= 2
export const MIN_COVERAGE_EFFECTS = new Set(['trade_in', 'precise']);

// --- Map dimensions ---
export const MAP_ROWS = 5;
export const MAP_COLS = 4;
```

- [ ] **Step 2: Verify import**

Add temporary test at top of `src/hooks/useGameLogic.js`:
```js
import { ALL_ITEMS, BASE_SHAPES, QUALITY_EFFECTS } from '../data/spatialConstants.js';
console.log('Spatial:', ALL_ITEMS.length, 'items,', BASE_SHAPES.length, 'shapes,', QUALITY_EFFECTS.length, 'effects');
```
Run `npm run dev`. Console should show: `Spatial: 20 items, 6 shapes, 6 effects`. Remove the console.log after verifying.

- [ ] **Step 3: Commit**

```
git add src/data/spatialConstants.js
git commit -m "feat: add spatial pool system constants"
```

---

## Task 2: Spatial Pool Helpers

**Files:**
- Create: `src/utils/spatialPoolHelpers.js`

- [ ] **Step 1: Create spatialPoolHelpers.js**

```js
// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system: map generation, shape rotation,
// frame generation, and coverage calculation.

import {
  ALL_ITEMS,
  BASE_SHAPES,
  QUALITY_EFFECTS,
  MAP_ROWS,
  MAP_COLS,
  MIN_COVERAGE_EFFECTS,
  calculateFrameCost,
} from '../data/spatialConstants.js';

// --- Shape rotation ---

/**
 * Rotate shape cells 90° clockwise: [r, c] → [c, -r]
 * Then normalize so min row/col is 0.
 */
function rotateCells90(cells) {
  const rotated = cells.map(([r, c]) => [c, -r]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC]);
}

/**
 * Generate a canonical string key for a set of cells (for dedup).
 */
function cellsKey(cells) {
  const sorted = [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return sorted.map(([r, c]) => `${r},${c}`).join('|');
}

/**
 * Get all unique rotations of a base shape.
 * Returns array of cell arrays.
 */
export function getUniqueRotations(baseCells) {
  const seen = new Set();
  const rotations = [];
  let current = baseCells;
  for (let i = 0; i < 4; i++) {
    const key = cellsKey(current);
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push([...current.map(c => [...c])]);
    }
    current = rotateCells90(current);
  }
  return rotations;
}

// --- Pre-computed shape variants ---
// Each entry: { baseId, name, cells, coverageCount }
let _allShapeVariants = null;

export function getAllShapeVariants() {
  if (_allShapeVariants) return _allShapeVariants;
  _allShapeVariants = [];
  for (const base of BASE_SHAPES) {
    const rotations = getUniqueRotations(base.cells);
    for (let ri = 0; ri < rotations.length; ri++) {
      _allShapeVariants.push({
        baseId: base.id,
        name: base.name,
        cells: rotations[ri],
        coverageCount: rotations[ri].length,
        rotationIndex: ri,
      });
    }
  }
  return _allShapeVariants;
}

// --- Item map generation ---

/**
 * Generate a random 5×4 item map by shuffling all 20 items.
 * Returns a 2D array [row][col] of item objects: { name, icon, poolId, poolName }.
 */
export function generateItemMap() {
  const shuffled = [...ALL_ITEMS];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const grid = [];
  let idx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push(shuffled[idx++]);
    }
    grid.push(row);
  }
  return grid;
}

// --- Frame generation ---

/**
 * Generate 3 random frames with unique quality effects.
 * Each frame: { shape, qualityEffect, cost }
 * shape: { baseId, name, cells, coverageCount, rotationIndex }
 * qualityEffect: affix object from QUALITY_EFFECTS
 */
export function generateFrames() {
  const allVariants = getAllShapeVariants();
  const frames = [];
  const usedEffectIds = new Set();

  for (let i = 0; i < 3; i++) {
    // Pick random shape variant
    const shape = allVariants[Math.floor(Math.random() * allVariants.length)];

    // Pick random quality effect (no repeats)
    const availableEffects = QUALITY_EFFECTS.filter(e => {
      if (usedEffectIds.has(e.id)) return false;
      // Enforce minimum coverage constraint
      if (MIN_COVERAGE_EFFECTS.has(e.id) && shape.coverageCount < 2) return false;
      return true;
    });

    if (availableEffects.length === 0) {
      // Fallback: re-pick shape with >= 2 coverage if needed
      const bigVariants = allVariants.filter(v => v.coverageCount >= 2);
      const fallbackShape = bigVariants[Math.floor(Math.random() * bigVariants.length)];
      const fallbackEffects = QUALITY_EFFECTS.filter(e => !usedEffectIds.has(e.id));
      const effect = fallbackEffects[Math.floor(Math.random() * fallbackEffects.length)];
      usedEffectIds.add(effect.id);
      frames.push({
        shape: fallbackShape,
        qualityEffect: effect,
        cost: calculateFrameCost(fallbackShape.coverageCount, effect.id),
      });
      continue;
    }

    const effect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
    usedEffectIds.add(effect.id);
    frames.push({
      shape,
      qualityEffect: effect,
      cost: calculateFrameCost(shape.coverageCount, effect.id),
    });
  }

  return frames;
}

// --- Coverage calculation ---

/**
 * Given a shape and an anchor position (row, col), return the grid cells covered.
 * Returns null if any cell would be out of bounds (invalid placement).
 * Otherwise returns array of { row, col, item } objects.
 */
export function getFrameCoverage(shape, anchorRow, anchorCol, itemMap) {
  const covered = [];
  for (const [dr, dc] of shape.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
      return null; // out of bounds — invalid placement
    }
    covered.push({ row: r, col: c, item: itemMap[r][c] });
  }
  return covered;
}

/**
 * Check if a placement is valid (all shape cells within grid bounds).
 */
export function isValidPlacement(shape, anchorRow, anchorCol) {
  for (const [dr, dc] of shape.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
      return false;
    }
  }
  return true;
}
```

- [ ] **Step 2: Verify by adding temp console test in useGameLogic.js**

```js
import { generateItemMap, generateFrames } from '../utils/spatialPoolHelpers.js';
// In useGameLogic body:
useEffect(() => {
  const map = generateItemMap();
  console.log('Item map:', map);
  const frames = generateFrames();
  console.log('Frames:', frames);
}, []);
```
Run `npm run dev`. Verify console shows a 5×4 grid of items and 3 frames with shapes/effects/costs. Remove temp code.

- [ ] **Step 3: Commit**

```
git add src/utils/spatialPoolHelpers.js
git commit -m "feat: add spatial pool helper functions"
```

---

## Task 3: Game Logic — State & Generation

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This task replaces pool state/generation with spatial state and repurposes `refreshPools` to generate frames.

- [ ] **Step 1: Add imports and spatial state**

Add imports at top of useGameLogic.js:
```js
import { generateItemMap, generateFrames, getFrameCoverage } from '../utils/spatialPoolHelpers.js';
```

Replace the `activePools` state with spatial state:
```js
// Replace: const [activePools, setActivePools] = useState(() => generateActivePools());
const [itemMap, setItemMap] = useState(() => generateItemMap());
const [availableFrames, setAvailableFrames] = useState(() => generateFrames());
const [selectedFrameIndex, setSelectedFrameIndex] = useState(null);
```

- [ ] **Step 2: Fix `createItem` to handle null pool**

The existing `createItem` (line 295) accesses `pool.name` which crashes if pool is null. The spatial system passes virtual pools, but for safety add null handling:

```js
// Line 300: change
poolName: pool.name,
// To:
poolName: pool?.name || itemTemplate.poolName,
```

This works because `ALL_ITEMS` (from spatialConstants.js) already includes `poolName` on each item template.

- [ ] **Step 3: Replace `generateActivePools` and `refreshPools`**

Remove the `generateActivePools` function entirely (lines 96-133).

Replace `refreshPools` (line 143) with frame-based logic:
```js
const refreshPools = (tick = false) => {
    setAvailableFrames(generateFrames());
    setSelectedFrameIndex(null);
    if (tick && currentStageConfig.mechanics.entropy) {
        setInventory(prev => prev.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        }));
    }
};
```

This keeps the function name `refreshPools` so all existing callsites (`handleNormalDraw`, etc.) continue to work without modification.

- [ ] **Step 4: Regenerate item map on evacuation**

In `handleEvacuationContinue` (line 1119), add after existing resets:
```js
setItemMap(generateItemMap());
setAvailableFrames(generateFrames());
setSelectedFrameIndex(null);
```

- [ ] **Step 5: Expose new state in return object**

In the `return` block's `state` section, replace `activePools` with:
```js
itemMap,
availableFrames,
selectedFrameIndex,
```

In the `actions` section, add:
```js
handleFrameSelect: (index) => setSelectedFrameIndex(index),
```

- [ ] **Step 6: Remove old pool initialization useEffect**

If there's a `useEffect` that calls `refreshPools` on config change (around line 154-156), check if it's still needed. If it only served to initialize `activePools`, remove it since `availableFrames` is initialized via `useState`.

- [ ] **Step 7: Verify**

Run `npm run dev`. The game may have broken pool rendering (PoolCard expects `activePools`), but the app should not crash. Check console for no import errors.

- [ ] **Step 8: Commit**

```
git add src/hooks/useGameLogic.js
git commit -m "feat: replace pool state with spatial state, repurpose refreshPools"
```

---

## Task 4: Game Logic — Spatial Draw Flow

**Files:**
- Modify: `src/hooks/useGameLogic.js`

**Key insight:** Instead of writing parallel draw logic, `handleMapPlace` constructs a **virtual pool** from the spatial coverage and passes it to the **existing `handleDraw`**. This automatically inherits all skill logic (vip_discount, enhancement, consolation_prize, extra item), entropy handling, trade-in/precise selection modes, and gold management.

A virtual pool has the same shape as a real pool: `{ name, items, affixKey, affix, cost }`.

- [ ] **Step 1: Add handleMapPlace function**

Place near the existing `handleDraw` function:

```js
const handleMapPlace = (anchorRow, anchorCol) => {
    if (selectedFrameIndex === null) return;

    const frame = availableFrames[selectedFrameIndex];
    if (!frame) return;

    const coverage = getFrameCoverage(frame.shape, anchorRow, anchorCol, itemMap);
    if (!coverage) return; // invalid placement (out of bounds)

    const coveredItems = coverage.map(c => c.item);

    // Construct a virtual pool that the existing handleDraw can process
    const virtualPool = {
        name: 'spatial',
        items: coveredItems,
        affixKey: frame.qualityEffect.id,
        affix: frame.qualityEffect,
        cost: frame.cost,
        // Include originalId so any pool-id-based lookups don't crash
        originalId: 'spatial',
        id: 'spatial',
    };

    // Pass to existing draw pipeline — all skill logic, entropy,
    // enhancement, trade-in, precise, gold checks are handled automatically
    handleDraw(virtualPool);
};
```

That's it. The existing `handleDraw` (line 584) handles:
- Guard conditions (`pendingItem`, `isSubmitMode`, `isRecycleMode`, `selectionMode`, `pendingQueue`, `isEvacuationMode`)
- `vip_discount` skill discount
- Gold affordability check
- `trade_in` → `setSelectionMode({ type: 'trade_in', pool: virtualPool })` — the existing trade-in handler at line 760 uses `selectionMode.pool.items` to find candidates, which now contains covered items
- `precise` → `setSelectionMode({ type: 'precise', pool: virtualPool, items: candidates })` — works with virtual pool's items array
- `handleNormalDraw(virtualPool)` — existing logic handles fragmented, enhancement, entropy, skill tracking, then calls `refreshPools` (which now generates new frames per Task 3)

- [ ] **Step 2: Remove the `targeted` branch from handleDraw**

In `handleDraw` (line 622-629), remove the `targeted` affix branch since this effect no longer exists in the spatial system. The `QUALITY_EFFECTS` in spatialConstants.js already excludes `targeted`.

- [ ] **Step 3: Expose handleMapPlace in return actions**

```js
handleMapPlace,
```

- [ ] **Step 4: Verify**

Run `npm run dev`. The app should not crash. The draw flow won't be testable until UI is wired (Task 7).

- [ ] **Step 5: Commit**

```
git add src/hooks/useGameLogic.js
git commit -m "feat: add handleMapPlace using virtual pool through existing draw pipeline"
```

---

## Task 5: FrameSelector Component

**Files:**
- Create: `src/components/game/FrameSelector.jsx`

- [ ] **Step 1: Create FrameSelector.jsx**

```jsx
// src/components/game/FrameSelector.jsx
import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Renders a mini-preview of a shape's geometry.
 * Shows a small grid with filled cells matching the shape.
 */
function ShapePreview({ cells }) {
  const maxR = Math.max(...cells.map(([r]) => r)) + 1;
  const maxC = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  return (
    <div
      className="inline-grid gap-0.5"
      style={{
        gridTemplateRows: `repeat(${maxR}, 1rem)`,
        gridTemplateColumns: `repeat(${maxC}, 1rem)`,
      }}
    >
      {Array.from({ length: maxR * maxC }, (_, i) => {
        const r = Math.floor(i / maxC);
        const c = i % maxC;
        const filled = cellSet.has(`${r},${c}`);
        return (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${
              filled ? 'bg-indigo-400' : 'bg-slate-100'
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * FrameSelector — displays 3 available frames for the player to choose from.
 *
 * Props:
 *   frames: array of 3 frame objects { shape, qualityEffect, cost }
 *   selectedIndex: currently selected frame index (null if none)
 *   gold: current gold amount
 *   onSelect: (index) => void
 *   disabled: boolean — block interaction during pending/modes
 */
function FrameSelector({ frames, selectedIndex, gold, onSelect, disabled }) {
  const { t } = useLanguage();

  if (!frames || frames.length === 0) return null;

  return (
    <div className="flex gap-2 justify-center">
      {frames.map((frame, index) => {
        const canAfford = gold >= frame.cost;
        const isSelected = selectedIndex === index;

        return (
          <button
            key={index}
            onClick={() => !disabled && canAfford && onSelect(index)}
            disabled={disabled || !canAfford}
            className={`
              relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all
              min-w-[120px]
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 scale-105'
                : canAfford
                  ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Shape preview */}
            <ShapePreview cells={frame.shape.cells} />

            {/* Quality effect name */}
            <span className="text-sm font-medium text-slate-700">
              {t(frame.qualityEffect.name)}
            </span>

            {/* Cost */}
            <span className={`flex items-center gap-1 text-sm font-bold ${
              canAfford ? 'text-amber-600' : 'text-red-400'
            }`}>
              <Coins size={14} />
              {frame.cost}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(FrameSelector);
```

- [ ] **Step 2: Commit**

```
git add src/components/game/FrameSelector.jsx
git commit -m "feat: add FrameSelector component"
```

---

## Task 6: ItemMap Component

**Files:**
- Create: `src/components/game/ItemMap.jsx`

- [ ] **Step 1: Create ItemMap.jsx**

```jsx
// src/components/game/ItemMap.jsx
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement } from '../../utils/spatialPoolHelpers';
import { MAP_ROWS, MAP_COLS } from '../../data/spatialConstants';

/**
 * ItemMap — renders the 5×4 item grid and handles frame placement interaction.
 *
 * Props:
 *   itemMap: 2D array [row][col] of { name, icon, poolId, poolName }
 *   selectedFrame: the currently selected frame object (or null)
 *   onPlace: (anchorRow, anchorCol) => void — called when player confirms placement
 *   onHoverCoverage: (itemNames[]) => void — called with covered item names on hover (for milestone highlighting)
 *   disabled: boolean — block interaction
 */
function ItemMap({ itemMap, selectedFrame, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);

  // Compute covered cells based on hover position and selected frame
  const coveredCells = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(selectedFrame.shape, row, col)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of selectedFrame.shape.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [selectedFrame, hoverAnchor]);

  const isValidHover = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return false;
    return isValidPlacement(selectedFrame.shape, hoverAnchor.row, hoverAnchor.col);
  }, [selectedFrame, hoverAnchor]);

  const handleCellHover = (row, col) => {
    if (!selectedFrame || disabled) return;
    setHoverAnchor({ row, col });
    // Compute covered item names for milestone highlighting
    if (isValidPlacement(selectedFrame.shape, row, col) && onHoverCoverage) {
      const names = selectedFrame.shape.cells
        .map(([dr, dc]) => itemMap[row + dr]?.[col + dc]?.name)
        .filter(Boolean);
      onHoverCoverage(names);
    }
  };

  const handleMouseLeave = () => {
    setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  };

  const handleCellClick = (row, col) => {
    if (!selectedFrame || disabled) return;
    if (!isValidPlacement(selectedFrame.shape, row, col)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  };

  if (!itemMap) return null;

  return (
    <div
      className="inline-grid gap-1 p-2 bg-slate-100 rounded-lg border border-slate-200"
      style={{
        gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)`,
      }}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: MAP_ROWS * MAP_COLS }, (_, i) => {
        const row = Math.floor(i / MAP_COLS);
        const col = i % MAP_COLS;
        const item = itemMap[row][col];
        const isCovered = coveredCells.has(`${row},${col}`);

        return (
          <div
            key={`${row}-${col}`}
            className={`
              flex flex-col items-center justify-center
              w-16 h-16 rounded-md border transition-all cursor-default select-none
              ${isCovered && isValidHover
                ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105'
                : 'bg-white border-slate-200'
              }
              ${selectedFrame && !disabled ? 'cursor-crosshair' : ''}
            `}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px]">
              {t(item.name)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ItemMap);
```

- [ ] **Step 2: Commit**

```
git add src/components/game/ItemMap.jsx
git commit -m "feat: add ItemMap component"
```

---

## Task 7: GameCore Integration

**Files:**
- Modify: `src/GameCore.jsx`

This is the wiring task — connect new components and replace the old pool section.

- [ ] **Step 1: Add imports**

```jsx
import FrameSelector from './components/game/FrameSelector';
import ItemMap from './components/game/ItemMap';
```

Remove or comment out the PoolCard import:
```jsx
// import PoolCard from './components/game/PoolCard';
```

- [ ] **Step 2: Extract spatial state from useGameLogic**

In GameCore where `state` and `actions` are destructured from useGameLogic, add:
```jsx
const {
  // ... existing state
  itemMap,
  availableFrames,
  selectedFrameIndex,
} = state;

const {
  // ... existing actions
  handleFrameSelect,
  handleMapPlace,
} = actions;
```

- [ ] **Step 3: Replace pool rendering section**

Find the pool section (around lines 376-409) that maps `activePools` to `PoolCard` components. Replace with:

```jsx
{/* Spatial Pool Section */}
<div className="flex flex-col items-center gap-3 py-3">
  {/* Frame selector */}
  <FrameSelector
    frames={availableFrames}
    selectedIndex={selectedFrameIndex}
    gold={gold}
    onSelect={handleFrameSelect}
    disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode}
  />

  {/* Item map */}
  <ItemMap
    itemMap={itemMap}
    selectedFrame={selectedFrameIndex !== null ? availableFrames[selectedFrameIndex] : null}
    onPlace={handleMapPlace}
    onHoverCoverage={(names) => {
      // Reuse hoveredPoolItemNames for milestone highlighting
      setHoveredPoolItemNames(names);
    }}
    disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || selectedFrameIndex === null}
  />
</div>
```

Note: `setHoveredPoolItemNames` may need to be exposed from useGameLogic as an action, or the hover state managed in GameCore. Check how `hoveredPoolItemNames` is currently set — if it's via `handlePoolHover`, replace that with direct state management for the new system.

- [ ] **Step 4: Clean up old pool hover handlers**

Remove or guard the old `handlePoolHover`/`handlePoolLeave` calls. The new `onHoverCoverage` callback handles milestone highlighting.

- [ ] **Step 5: Verify basic flow**

Run `npm run dev`. You should see:
1. The 5×4 item map grid with 20 items
2. 3 frame selector buttons above the map
3. Clicking a frame highlights it
4. Hovering over the map with a frame selected shows coverage preview
5. Clicking on the map triggers a draw (item appears in inventory)
6. Frames refresh after each draw

- [ ] **Step 6: Commit**

```
git add src/GameCore.jsx src/hooks/useGameLogic.js
git commit -m "feat: integrate spatial pool system into GameCore"
```

---

## Task 8: Verify Interactive Quality Effects

**Files:**
- Possibly modify: `src/hooks/useGameLogic.js`, `src/GameCore.jsx`

Because `handleMapPlace` passes a virtual pool through the existing `handleDraw` pipeline, interactive effects (precise, trade_in) should work automatically. The existing selection mode UI (overlay in GameCore) reads from `selectionMode.pool` and `selectionMode.items`, which are populated correctly by the virtual pool.

This task is primarily verification, with fixes only if something breaks.

- [ ] **Step 1: Test precise flow**

Run `npm run dev`. Get a frame with "精准" effect. Select it, place on map.
Expected: the existing 2-pick-1 overlay appears with 2 items from the covered area.
If it doesn't work: check that `selectionMode` is being set with the right shape (`{ type: 'precise', pool: virtualPool, items: candidates }`).

- [ ] **Step 2: Test trade_in flow**

Get a frame with "以旧换新" effect. Select it, place on map.
Expected: game enters inventory selection mode. Clicking an inventory item swaps it for a different-named item from the covered area.
If it doesn't work: the existing handler at line 774 reads `selectionMode.pool.items` — verify the virtual pool's `.items` contains the covered item templates.

- [ ] **Step 3: Test cancel/refund**

Cancel a precise or trade_in selection mid-flow.
Expected: gold is refunded. The existing `handleSelectionCancel` reads `selectionMode.pool.cost` — verify the virtual pool's `.cost` is set correctly.

- [ ] **Step 4: Fix any issues found, commit**

```
git add src/hooks/useGameLogic.js src/GameCore.jsx
git commit -m "fix: verify and fix interactive quality effects for spatial pool system"
```

---

## Task 9: Translations & Cleanup

**Files:**
- Modify: `src/utils/translations.js`
- Modify: `src/GameCore.jsx`
- Deprecate: `src/components/game/PoolCard.jsx`

- [ ] **Step 1: Add translation keys**

In `translations.js`, add English translations for any new Chinese strings:
```js
// Spatial pool system
'选择一个框': 'Select a frame',
'放置到地图上': 'Place on map',
'单格': 'Single',
'双格': 'Domino',
'三连': 'Line',
'L形': 'L-Shape',
'方块': 'Square',
'T形': 'T-Shape',
```

Note: Quality effect names (以旧换新的, 硬化的, etc.) should already have translations from the old system. Verify.

- [ ] **Step 2: Remove PoolCard references**

Ensure `PoolCard` is not imported anywhere. Keep the file for reference but remove all imports and usage in GameCore.

- [ ] **Step 3: Remove old pool-related state from return**

In useGameLogic, remove `activePools` from the returned state if nothing else depends on it. Check for any remaining references to `activePools`, `handleDraw`, `handlePoolHover`, `handlePoolLeave` in GameCore and remove them.

- [ ] **Step 4: Test both languages**

Run `npm run dev`. Switch between Chinese and English. Verify:
- Frame selector labels are translated
- Item names on the map are translated
- No text overflow or layout issues in either language

- [ ] **Step 5: Commit**

```
git add src/utils/translations.js src/GameCore.jsx src/hooks/useGameLogic.js
git commit -m "feat: add spatial pool translations, clean up old pool system"
```

---

## Implementation Notes

### Virtual pool architecture
The core architectural decision: `handleMapPlace` constructs a virtual pool object from spatial coverage and passes it to the **existing `handleDraw`** function. This means:
- `handleDraw`, `handleNormalDraw`, `createItem`, `rollRarity`, `handleIncomingItems` — all reused as-is
- Skill effects (vip_discount, enhancement, consolation_prize, extra item) — automatically inherited
- Entropy handling — automatically inherited (applyEntropy + overrideInventory in handleNormalDraw)
- Trade-in and precise selection modes — automatically work because `selectionMode.pool` is set to the virtual pool, and existing handlers read `pool.items` and `pool.cost`
- Gold refund on cancel — works because virtual pool has `.cost`

### What changes
- `createItem` (line 300): add null safety: `poolName: pool?.name || itemTemplate.poolName`
- `generateActivePools`: removed entirely
- `refreshPools`: repurposed to generate frames + clear selection (keeps function name so all callsites work)
- `activePools` state: replaced by `itemMap`, `availableFrames`, `selectedFrameIndex`
- `handleDraw`'s `targeted` branch: removed (targeted effect replaced by small shapes)

### What stays the same
- `handleDraw` function (minus targeted branch) — receives virtual pool
- `handleNormalDraw` — unchanged, processes virtual pool like any pool
- `rollRarity` — unchanged, quality effect IDs match affix IDs
- `handleIncomingItems` — unchanged
- `handleSelectionCancel` — unchanged, reads from `selectionMode.pool`
- Trade-in handler in `handleSlotClick` — unchanged, reads from `selectionMode.pool.items`
- Inventory system, milestone grid, merging, skill system — all unchanged

### Balance tuning parameters
- Shape base costs: `SHAPE_BASE_COSTS` in spatialConstants.js
- Quality premiums: `QUALITY_PREMIUMS` in spatialConstants.js
- Shape generation weights (currently uniform — can be adjusted)
- Quality effect weights (currently uniform — can be adjusted)
