# Sticker System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the template sticker system so that (1) polyomino grouping is explicit rather than auto-BFS, (2) sticker type count is a wall-level config with range support and auto-clamped lower bound, and (3) the constraints JSON textarea is replaced with visual controls.

**Architecture:** Template grid cells gain an optional `group` number for explicit polyomino grouping. The `constraints` object is replaced by a structured `settings` object with `stickerTypeRange: [min, max]` and `maxDoomInBlank`. The editor adds a "group brush" mode for painting polyomino groups, and replaces the JSON textarea with visual controls. The template resolver reads `group` fields instead of doing BFS, and uses `stickerTypeRange` to determine how many procedural sticker types to add.

**Tech Stack:** React 18, Tailwind CSS 3 (existing stack, no new deps)

---

## File Structure

### Modified Files
| File | Changes |
|------|---------|
| `src/data/levelTemplates.js` | Update `CELL_TYPES`, sample templates to use `group` + `settings` instead of `constraints` |
| `src/utils/templateGenerator.js` | Delete BFS grouping, read `group` from cells, use `settings.stickerTypeRange` for procedural fill |
| `src/components/editor/GridPainter.jsx` | Add group brush mode: click sticker cells to assign/cycle group numbers, render group borders |
| `src/components/editor/CellPalette.jsx` | Add group brush toggle, remove sticker_A/B/C buttons (replaced by generic sticker + group), add wall-level settings UI |
| `src/components/editor/LevelEditor.jsx` | Replace constraints JSON textarea with structured settings state, pass group brush state to GridPainter, compute auto-clamped sticker type lower bound |
| `src/components/editor/TemplatePreview.jsx` | Add group border rendering for template thumbnails |

---

## Task 1: Update Template Data Format

**Files:**
- Modify: `src/data/levelTemplates.js`

The core data format changes:
- Remove `STICKER_A`, `STICKER_B`, `STICKER_C` from `CELL_TYPES` (replaced by `any_sticker` + `group`)
- Sticker cells use `{ type: 'any_sticker', group: 1 }` to indicate polyomino membership. Same `group` number = same polyomino = same sticker type at generation time
- Template-level `constraints` object is replaced by `settings`:
  ```js
  settings: {
    stickerTypeRange: [2, 3],  // total sticker types on this wall (min, max)
    maxDoomInBlank: 0,         // max doom cells in procedural fill (undefined = no limit)
  }
  ```

- [ ] **Step 1: Update CELL_TYPES and sample templates**

Replace the entire contents of `src/data/levelTemplates.js` (everything above the `TEMPLATE_SCHEDULE` constant) with:

```js
/**
 * Cell type tokens for template grids.
 * null = blank (procedural fill)
 * String tokens = fixed or constrained cells
 * Object tokens = cell with extra properties (e.g. multiplier, group)
 *
 * Sticker grouping:
 *   { type: 'any_sticker', group: 1 } — belongs to polyomino group 1
 *   'any_sticker' or { type: 'any_sticker' } — independent 1×1 sticker
 *   Same group number → same polyomino → same randomly-bound sticker type
 *   Different group numbers → different polyominoes (may or may not be same type)
 */
export const CELL_TYPES = {
  // Structural
  EMPTY: 'empty',                // true blank — skipped during draw, not filled by procedural
  // Fixed types
  DOOM_RESOLVE: 'doom_resolve',
  DOOM_UPGRADE: 'doom_upgrade',
  BOMB: 'bomb',
  GOLD: 'gold',
  ORDER: 'order',
  OUT_OF_GAME: 'out_of_game',
  // Constrained types (resolved at generation time)
  ANY_DOOM: 'any_doom',           // randomly doom_resolve or doom_upgrade
  ANY_SPECIAL: 'any_special',     // randomly gold/order/out_of_game/bomb
  ANY_STICKER: 'any_sticker',     // random sticker type, 1×1 unless grouped
};

// --- Sample templates ---

export const LEVEL_TEMPLATES = [
  {
    id: 'bomb_ring',
    name: '炸弹圈',
    description: '外圈炸弹包围，中心高倍贴纸',
    grid: [
      ['bomb', 'bomb', 'bomb', 'bomb', 'bomb'],
      ['bomb', null,   null,   null,   'bomb'],
      ['bomb', null,   { type: 'any_sticker', multiplier: 5 }, null, 'bomb'],
      ['bomb', null,   null,   null,   'bomb'],
      ['bomb', 'bomb', 'bomb', 'bomb', 'bomb'],
    ],
    settings: {
      stickerTypeRange: [2, 2],
    },
  },
  {
    id: 'doom_corridor',
    name: '死亡走廊',
    description: '厄运格集中在中间列，两侧是安全贴纸区',
    grid: [
      [null, null, 'doom_resolve', null, null],
      [null, null, 'any_doom',     null, null],
      [null, null, 'doom_upgrade', null, null],
      [null, null, 'any_doom',     null, null],
      [null, null, 'doom_resolve', null, null],
    ],
    settings: {
      maxDoomInBlank: 0,
    },
  },
  {
    id: 'treasure_corners',
    name: '四角宝藏',
    description: '四角放高价值物品，中间是风险区',
    grid: [
      [{ type: 'out_of_game' }, null, null, null, { type: 'out_of_game' }],
      [null, 'any_doom', null, 'any_doom', null],
      [null, null, 'bomb', null, null],
      [null, 'any_doom', null, 'any_doom', null],
      [{ type: 'out_of_game' }, null, null, null, { type: 'out_of_game' }],
    ],
    settings: {},
  },
];
```

Keep everything from `TEMPLATE_SCHEDULE` onward unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/data/levelTemplates.js
git commit -m "refactor: replace sticker_A/B/C with group-based sticker system, constraints → settings"
```

---

## Task 2: Update Template Resolver

**Files:**
- Modify: `src/utils/templateGenerator.js`

Major changes:
1. Remove `STICKER_A/B/C` handling from `resolveConstrainedCell`
2. Delete the entire BFS grouping step (Step 3)
3. Replace with explicit `group` field reading: cells with same `group` number get same `groupId` and same randomly-bound sticker type
4. Use `settings.stickerTypeRange` instead of `constraints.stickerTypeCount`
5. Procedural fill sticker types = total range minus distinct group types already used
6. Read `settings.maxDoomInBlank` instead of `constraints.maxDoomInBlank`

- [ ] **Step 1: Replace the entire file**

```js
// src/utils/templateGenerator.js
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { CELL_TYPES } from '../data/levelTemplates';
import { pickWallStickers, fillDoomAndSpecials, fillEmptyCellsWithStickers } from './matrixHelpers';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Resolve a single template cell token to a concrete cell object.
 * Does NOT handle grouping — that's done at the template level.
 */
function resolveConstrainedCell(token) {
  const { doomCells, specialCells } = MATRIX_CONFIG;

  let cellType, extras = {};
  if (typeof token === 'object' && token !== null) {
    cellType = token.type;
    const { type: _, group: _g, ...rest } = token;
    extras = rest;
  } else {
    cellType = token;
  }

  switch (cellType) {
    case CELL_TYPES.EMPTY:
      return { type: 'empty', uid: generateUID() };
    case CELL_TYPES.DOOM_RESOLVE:
      return { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras };
    case CELL_TYPES.DOOM_UPGRADE:
      return { type: 'doom_upgrade', icon: doomCells.upgrade.icon, name: doomCells.upgrade.name, uid: generateUID(), ...extras };
    case CELL_TYPES.ANY_DOOM:
      return Math.random() < 0.5
        ? { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras }
        : { type: 'doom_upgrade', icon: doomCells.upgrade.icon, name: doomCells.upgrade.name, uid: generateUID(), ...extras };
    case CELL_TYPES.BOMB:
      return { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID(), ...extras };
    case CELL_TYPES.GOLD: {
      const [min, max] = specialCells.gold.goldRange;
      const goldAmount = extras.goldAmount ?? (min + Math.floor(Math.random() * (max - min + 1)));
      return { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.ORDER:
      return { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID(), ...extras };
    case CELL_TYPES.OUT_OF_GAME: {
      const item = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
      return { type: 'out_of_game', icon: item.icon, name: item.name, item: { ...item }, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.ANY_SPECIAL: {
      const types = [CELL_TYPES.GOLD, CELL_TYPES.ORDER, CELL_TYPES.OUT_OF_GAME, CELL_TYPES.BOMB];
      return resolveConstrainedCell(types[Math.floor(Math.random() * types.length)]);
    }
    case CELL_TYPES.ANY_STICKER:
      // Sticker type will be assigned later during group binding
      return { type: 'sticker', item: null, uid: generateUID(), groupId: null, shapeSize: 1, ...extras };
    default:
      return null;
  }
}

/**
 * Generate a wall from a template.
 *
 * 1. Resolve all fixed/constrained cells
 * 2. Assign sticker types: group-based binding (same group = same type = same polyomino)
 * 3. Procedural fill on blank cells, respecting settings
 */
export function generateWallFromTemplate(template) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const settings = template.settings || template.constraints || {};

  // Step 1: Resolve all template cells
  const doomCellCount = { resolution: 0, upgrade: 0 };
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token === null || token === undefined) continue;

      const cell = resolveConstrainedCell(token);
      if (cell) {
        grid[r][c] = cell;
        if (cell.type === 'doom_resolution') doomCellCount.resolution++;
        if (cell.type === 'doom_upgrade') doomCellCount.upgrade++;
      }
    }
  }

  // Step 2: Assign sticker types based on group numbers
  // Collect all group numbers used in the template
  const groupNumbers = new Set();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token && typeof token === 'object' && token.group !== undefined) {
        groupNumbers.add(token.group);
      }
    }
  }

  // Shuffle sticker types and assign one per group number
  const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
  const groupToSticker = new Map();
  const groupToGroupId = new Map();
  let stickerIdx = 0;
  for (const gNum of groupNumbers) {
    groupToSticker.set(gNum, shuffledStickers[stickerIdx % shuffledStickers.length]);
    groupToGroupId.set(gNum, generateUID());
    stickerIdx++;
  }
  const distinctGroupTypes = groupNumbers.size;

  // Apply sticker types and groupIds to all sticker cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (!cell || cell.type !== 'sticker') continue;

      const token = template.grid[r]?.[c];
      const gNum = (typeof token === 'object' && token !== null) ? token.group : undefined;

      if (gNum !== undefined && groupToSticker.has(gNum)) {
        // Grouped sticker: same type and groupId as its group
        cell.item = { ...groupToSticker.get(gNum) };
        cell.groupId = groupToGroupId.get(gNum);
      } else {
        // Ungrouped sticker: independent, random type
        cell.item = { ...shuffledStickers[(stickerIdx++) % shuffledStickers.length] };
        cell.groupId = generateUID();
      }
    }
  }

  // Count shape sizes for each group
  const groupCellCounts = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'sticker' && cell.groupId) {
        groupCellCounts.set(cell.groupId, (groupCellCounts.get(cell.groupId) || 0) + 1);
      }
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'sticker' && cell.groupId) {
        cell.shapeSize = groupCellCounts.get(cell.groupId) || 1;
      }
    }
  }

  // Step 3: Procedural fill on blank cells
  const proceduralDoom = fillDoomAndSpecials(grid, gridSize, {
    maxDoomInBlank: settings.maxDoomInBlank,
  });
  doomCellCount.resolution += proceduralDoom.resolution;
  doomCellCount.upgrade += proceduralDoom.upgrade;

  // Determine how many sticker types for procedural fill
  const [rangeMin, rangeMax] = settings.stickerTypeRange || [3, 4];
  const totalMin = Math.max(rangeMin, distinctGroupTypes);
  const totalMax = Math.max(rangeMax, totalMin);
  const totalTarget = totalMin + Math.floor(Math.random() * (totalMax - totalMin + 1));
  const proceduralTypeCount = Math.max(1, totalTarget - distinctGroupTypes);

  // Pick procedural sticker types (excluding types already used by groups)
  const usedStickerIds = new Set([...groupToSticker.values()].map(s => s.id));
  const availableStickers = STICKER_TYPES.filter(s => !usedStickerIds.has(s.id));
  let wallStickers;
  if (availableStickers.length >= proceduralTypeCount) {
    wallStickers = pickWallStickers(availableStickers, proceduralTypeCount, proceduralTypeCount);
  } else {
    // Not enough unique types left, use all available + some repeats
    wallStickers = pickWallStickers(STICKER_TYPES, proceduralTypeCount, proceduralTypeCount);
  }

  fillEmptyCellsWithStickers(grid, wallStickers, gridSize);

  // Collect all unique sticker types on the grid for preview
  const stickerMap = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'sticker' && cell.item) {
        stickerMap.set(cell.item.id, cell.item);
      }
    }
  }

  return { grid, doomCellCount, stickers: [...stickerMap.values()] };
}
```

- [ ] **Step 2: Verify the game still works**

Run: `npm run dev`

Start a game. Template walls should still generate and be playable. Sticker cells from templates should appear correctly. The `bomb_ring` template should show 2 sticker types total.

- [ ] **Step 3: Commit**

```bash
git add src/utils/templateGenerator.js
git commit -m "refactor: explicit group-based polyomino binding, settings.stickerTypeRange for type count"
```

---

## Task 3: Add Group Brush to GridPainter

**Files:**
- Modify: `src/components/editor/GridPainter.jsx`

Add a "group mode" to the grid. When group mode is active, clicking a sticker cell assigns/increments its group number. Visual feedback: cells with the same group number share a colored border. The group number is shown in the cell.

- [ ] **Step 1: Replace GridPainter.jsx**

```jsx
import React, { useState, useCallback } from 'react';
import { CELL_TYPES } from '../../data/levelTemplates';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const CELL_DISPLAY = {
  empty: { icon: '⬜', bg: 'bg-gray-900/80', label: '空白格' },
  doom_resolve: { icon: '💀', bg: 'bg-red-900/60', label: '厄运结算' },
  doom_upgrade: { icon: '⬆️', bg: 'bg-red-700/60', label: '厄运升级' },
  any_doom: { icon: '💀?', bg: 'bg-red-800/40', label: '随机厄运' },
  bomb: { icon: '💣', bg: 'bg-orange-900/60', label: '炸弹' },
  gold: { icon: '💰', bg: 'bg-yellow-700/60', label: '金币' },
  order: { icon: '📋', bg: 'bg-blue-700/60', label: '订单' },
  out_of_game: { icon: '🎁', bg: 'bg-purple-700/60', label: '出口物品' },
  any_special: { icon: '❓', bg: 'bg-gray-600/60', label: '随机特殊' },
  any_sticker: { icon: '🏷️', bg: 'bg-green-700/40', label: '贴纸' },
};

// Distinct colors for group borders
const GROUP_COLORS = [
  'border-rose-400',
  'border-sky-400',
  'border-amber-400',
  'border-lime-400',
  'border-violet-400',
  'border-teal-400',
  'border-orange-400',
  'border-pink-400',
];

function getCellType(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') return cell;
  return cell.type || null;
}

function getCellGroup(cell) {
  if (typeof cell === 'object' && cell !== null) return cell.group;
  return undefined;
}

function getCellDisplay(cell) {
  const type = getCellType(cell);
  if (!type) return { icon: '🎲', bg: 'bg-gray-800/30', label: '随机填充' };
  return CELL_DISPLAY[type] || { icon: '?', bg: 'bg-gray-500/60', label: type };
}

export default function GridPainter({ grid, onGridChange, activeBrush, brushExtras, groupMode, activeGroupNumber }) {
  const [isPainting, setIsPainting] = useState(false);
  const gridSize = MATRIX_CONFIG.gridSize;

  const applyBrush = useCallback((r, c) => {
    const newGrid = grid.map(row => [...row]);
    if (activeBrush === null) {
      newGrid[r][c] = null;
    } else if (brushExtras && Object.keys(brushExtras).length > 0) {
      newGrid[r][c] = { type: activeBrush, ...brushExtras };
    } else {
      newGrid[r][c] = activeBrush;
    }
    onGridChange(newGrid);
  }, [grid, activeBrush, brushExtras, onGridChange]);

  const applyGroup = useCallback((r, c) => {
    const cell = grid[r][c];
    const type = getCellType(cell);
    // Only sticker cells can be grouped
    if (type !== 'any_sticker') return;

    const newGrid = grid.map(row => [...row]);
    const currentGroup = getCellGroup(cell);

    if (currentGroup === activeGroupNumber) {
      // Clicking same group = remove from group
      if (typeof cell === 'object') {
        const { group: _, ...rest } = cell;
        // If only type remains, simplify to string
        const keys = Object.keys(rest);
        newGrid[r][c] = keys.length === 1 && keys[0] === 'type' ? rest.type : rest;
      }
    } else {
      // Assign to active group
      if (typeof cell === 'string') {
        newGrid[r][c] = { type: cell, group: activeGroupNumber };
      } else {
        newGrid[r][c] = { ...cell, group: activeGroupNumber };
      }
    }
    onGridChange(newGrid);
  }, [grid, activeGroupNumber, onGridChange]);

  const handleMouseDown = (r, c, e) => {
    e.preventDefault();
    if (e.button === 2) {
      // Right-click: erase in paint mode, remove group in group mode
      if (groupMode) {
        const cell = grid[r][c];
        if (typeof cell === 'object' && cell?.group !== undefined) {
          const newGrid = grid.map(row => [...row]);
          const { group: _, ...rest } = cell;
          const keys = Object.keys(rest);
          newGrid[r][c] = keys.length === 1 && keys[0] === 'type' ? rest.type : rest;
          onGridChange(newGrid);
        }
      } else {
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = null;
        onGridChange(newGrid);
      }
    } else {
      setIsPainting(true);
      if (groupMode) {
        applyGroup(r, c);
      } else {
        applyBrush(r, c);
      }
    }
  };

  const handleMouseEnter = (r, c) => {
    if (!isPainting) return;
    if (groupMode) {
      applyGroup(r, c);
    } else {
      applyBrush(r, c);
    }
  };

  const handleMouseUp = () => setIsPainting(false);

  return (
    <div
      className="inline-grid gap-1 select-none"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const display = getCellDisplay(cell);
          const hasMultiplier = typeof cell === 'object' && cell?.multiplier;
          const group = getCellGroup(cell);
          const groupColor = group !== undefined ? GROUP_COLORS[group % GROUP_COLORS.length] : null;

          return (
            <div
              key={`${r}-${c}`}
              className={`w-16 h-16 ${display.bg} rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative
                ${groupColor ? `border-2 ${groupColor}` : 'border border-gray-600'}
                ${groupMode && getCellType(cell) === 'any_sticker' ? 'ring-1 ring-white/20' : ''}`}
              onMouseDown={(e) => handleMouseDown(r, c, e)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              title={`[${r},${c}] ${display.label}${group !== undefined ? ` (组${group})` : ''}`}
            >
              <span className="text-xl">{display.icon}</span>
              {group !== undefined && (
                <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${groupColor ? groupColor.replace('border-', 'text-') : 'text-gray-400'}`}>
                  G{group}
                </span>
              )}
              {hasMultiplier && (
                <span className="absolute bottom-0.5 right-1 text-xs font-bold text-yellow-300">
                  x{cell.multiplier}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/GridPainter.jsx
git commit -m "feat: GridPainter group mode — click sticker cells to assign group numbers, colored borders"
```

---

## Task 4: Update CellPalette — Group Brush + Remove A/B/C

**Files:**
- Modify: `src/components/editor/CellPalette.jsx`

Remove `sticker_A/B/C` buttons. Add a group mode toggle and group number selector (1-8).

- [ ] **Step 1: Replace CellPalette.jsx**

```jsx
import React from 'react';
import { CELL_TYPES } from '../../data/levelTemplates';

const PALETTE_ITEMS = [
  { type: null, icon: '🚫', label: '橡皮擦（随机填充）', group: '工具' },
  { type: CELL_TYPES.EMPTY, icon: '⬜', label: '空白格（不填充）', group: '工具' },
  { type: CELL_TYPES.DOOM_RESOLVE, icon: '💀', label: '厄运结算', group: '厄运' },
  { type: CELL_TYPES.DOOM_UPGRADE, icon: '⬆️', label: '厄运升级', group: '厄运' },
  { type: CELL_TYPES.ANY_DOOM, icon: '💀?', label: '随机厄运', group: '厄运' },
  { type: CELL_TYPES.BOMB, icon: '💣', label: '炸弹', group: '特殊' },
  { type: CELL_TYPES.GOLD, icon: '💰', label: '金币', group: '特殊' },
  { type: CELL_TYPES.ORDER, icon: '📋', label: '订单', group: '特殊' },
  { type: CELL_TYPES.OUT_OF_GAME, icon: '🎁', label: '出口物品', group: '特殊' },
  { type: CELL_TYPES.ANY_SPECIAL, icon: '❓', label: '随机特殊', group: '特殊' },
  { type: CELL_TYPES.ANY_STICKER, icon: '🏷️', label: '贴纸', group: '贴纸' },
];

const GROUP_COLORS = [
  'bg-rose-400/30 border-rose-400',
  'bg-sky-400/30 border-sky-400',
  'bg-amber-400/30 border-amber-400',
  'bg-lime-400/30 border-lime-400',
  'bg-violet-400/30 border-violet-400',
  'bg-teal-400/30 border-teal-400',
  'bg-orange-400/30 border-orange-400',
  'bg-pink-400/30 border-pink-400',
];

export default function CellPalette({
  activeBrush, onBrushChange,
  multiplier, onMultiplierChange,
  groupMode, onGroupModeChange,
  activeGroupNumber, onActiveGroupNumberChange,
}) {
  const groups = [...new Set(PALETTE_ITEMS.map(i => i.group))];

  return (
    <div className="flex flex-col gap-4 p-3 bg-gray-900/80 rounded-lg min-w-[180px]">
      {groups.map(group => (
        <div key={group}>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">{group}</div>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE_ITEMS.filter(i => i.group === group).map(item => (
              <button
                key={item.type ?? 'eraser'}
                onClick={() => { onBrushChange(item.type); if (groupMode) onGroupModeChange(false); }}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-sm transition-all
                  ${!groupMode && activeBrush === item.type
                    ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50'
                    : 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                  }`}
                title={item.label}
              >
                <span className="text-lg">{item.icon}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Group brush */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">编组</div>
        <button
          onClick={() => onGroupModeChange(!groupMode)}
          className={`w-full px-3 py-1.5 rounded border text-sm mb-2 transition-all
            ${groupMode
              ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50 text-yellow-300'
              : 'border-gray-600 bg-gray-800/60 hover:border-gray-400 text-gray-300'
            }`}
        >
          🔗 编组画笔 {groupMode ? '(开)' : '(关)'}
        </button>
        {groupMode && (
          <div className="flex flex-wrap gap-1.5">
            {GROUP_COLORS.map((color, i) => (
              <button
                key={i}
                onClick={() => onActiveGroupNumberChange(i)}
                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold transition-all
                  ${color}
                  ${activeGroupNumber === i ? 'ring-2 ring-white/60 scale-110' : 'opacity-70 hover:opacity-100'}`}
              >
                {i}
              </button>
            ))}
          </div>
        )}
        {groupMode && (
          <p className="text-[10px] text-gray-500 mt-1.5">点击贴纸格子分配到组 {activeGroupNumber}。右键移除。同组 = 同种类 + 同 polyomino。</p>
        )}
      </div>

      {/* Multiplier input */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">倍率</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">x</span>
          <input
            type="number"
            min={1}
            max={10}
            value={multiplier}
            onChange={(e) => onMultiplierChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-center text-sm text-white"
          />
          <span className="text-xs text-gray-500">(对所有格子生效)</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/CellPalette.jsx
git commit -m "feat: CellPalette — remove sticker_A/B/C, add group brush toggle with color-coded group selector"
```

---

## Task 5: Update LevelEditor — Settings UI + Group State

**Files:**
- Modify: `src/components/editor/LevelEditor.jsx`

Replace the constraints JSON textarea with structured settings controls:
- Sticker type range (min/max dropdowns), with min auto-clamped to distinct group count
- Max doom in blank (number input or "no limit" checkbox)
- Add group mode state, pass to GridPainter and CellPalette

- [ ] **Step 1: Replace LevelEditor.jsx**

```jsx
// src/components/editor/LevelEditor.jsx
import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MATRIX_CONFIG } from '../../data/matrixConfig';
import { LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { generateWallFromTemplate } from '../../utils/templateGenerator';
import GridPainter from './GridPainter';
import CellPalette from './CellPalette';
import TemplatePreview from './TemplatePreview';

const EMPTY_GRID = () =>
  Array.from({ length: MATRIX_CONFIG.gridSize }, () => Array(MATRIX_CONFIG.gridSize).fill(null));

/** Count distinct group numbers used on sticker cells in the grid */
function countDistinctGroups(grid) {
  const groups = new Set();
  for (const row of grid) {
    for (const cell of row) {
      if (typeof cell === 'object' && cell !== null && cell.group !== undefined) {
        groups.add(cell.group);
      }
    }
  }
  return groups.size;
}

export default function LevelEditor() {
  const { templateId } = useParams();

  const existingTemplate = templateId
    ? LEVEL_TEMPLATES.find(t => t.id === templateId)
      ?? (() => { try { return JSON.parse(localStorage.getItem('levelTemplates') || '[]').find(t => t.id === templateId); } catch { return null; } })()
    : null;

  const existingSettings = existingTemplate?.settings || existingTemplate?.constraints || {};

  const [id, setId] = useState(existingTemplate?.id || '');
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [grid, setGrid] = useState(
    existingTemplate ? existingTemplate.grid.map(r => [...r]) : EMPTY_GRID()
  );

  // Settings state (structured, not JSON)
  const [stickerMin, setStickerMin] = useState(existingSettings.stickerTypeRange?.[0] ?? 3);
  const [stickerMax, setStickerMax] = useState(existingSettings.stickerTypeRange?.[1] ?? 4);
  const [maxDoomInBlank, setMaxDoomInBlank] = useState(existingSettings.maxDoomInBlank ?? -1); // -1 = no limit
  
  // Brush state
  const [activeBrush, setActiveBrush] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  
  // Group mode state
  const [groupMode, setGroupMode] = useState(false);
  const [activeGroupNumber, setActiveGroupNumber] = useState(0);

  // Auto-compute lower bound for sticker types
  const distinctGroups = useMemo(() => countDistinctGroups(grid), [grid]);
  const effectiveMin = Math.max(stickerMin, distinctGroups);
  const effectiveMax = Math.max(stickerMax, effectiveMin);

  // Brush extras
  const brushExtras = {};
  if (multiplier > 1 && activeBrush) {
    brushExtras.multiplier = multiplier;
  }

  // Build settings object
  const buildSettings = () => {
    const s = {};
    s.stickerTypeRange = [effectiveMin, effectiveMax];
    if (maxDoomInBlank >= 0) s.maxDoomInBlank = maxDoomInBlank;
    return s;
  };

  // Test generate
  const [testResult, setTestResult] = useState(null);
  const handleTest = () => {
    const template = { id, name, description, grid, settings: buildSettings() };
    const result = generateWallFromTemplate(template);
    setTestResult(result.grid);
  };

  // Export JSON
  const handleExport = () => {
    const template = { id, name, description, grid, settings: buildSettings() };
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save to localStorage
  const handleSave = () => {
    if (!id.trim()) {
      alert('请填写关卡 ID');
      return;
    }
    const template = { id, name, description, grid, settings: buildSettings() };
    const saved = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    const idx = saved.findIndex(t => t.id === id);

    const builtinCollision = LEVEL_TEMPLATES.find(t => t.id === id);
    if (builtinCollision && idx < 0) {
      alert(`ID "${id}" 与内置关卡冲突，请换一个 ID`);
      return;
    }

    if (idx >= 0) saved[idx] = template;
    else saved.push(template);
    localStorage.setItem('levelTemplates', JSON.stringify(saved));
    alert('已保存到 localStorage');
  };

  const handleClear = () => setGrid(EMPTY_GRID());

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Nav */}
      <div className="flex gap-4 mb-6 text-sm">
        <Link to="/" className="text-blue-400 hover:underline">← 返回游戏</Link>
        <Link to="/levels" className="text-blue-400 hover:underline">关卡管理</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">关卡编辑器</h1>

      <div className="flex gap-8 flex-wrap">
        {/* Left: Palette */}
        <CellPalette
          activeBrush={activeBrush}
          onBrushChange={setActiveBrush}
          multiplier={multiplier}
          onMultiplierChange={setMultiplier}
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          activeGroupNumber={activeGroupNumber}
          onActiveGroupNumberChange={setActiveGroupNumber}
        />

        {/* Center: Grid */}
        <div className="flex flex-col gap-4">
          <GridPainter
            grid={grid}
            onGridChange={setGrid}
            activeBrush={activeBrush}
            brushExtras={brushExtras}
            groupMode={groupMode}
            activeGroupNumber={activeGroupNumber}
          />
          <div className="flex gap-2">
            <button onClick={handleClear} className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600">清空</button>
            <button onClick={handleTest} className="px-3 py-1.5 bg-blue-700 rounded text-sm hover:bg-blue-600">测试生成</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-green-700 rounded text-sm hover:bg-green-600">保存</button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-purple-700 rounded text-sm hover:bg-purple-600">导出 JSON</button>
          </div>
        </div>

        {/* Right: Metadata + Settings + Test result */}
        <div className="flex flex-col gap-3 min-w-[250px]">
          <div>
            <label className="text-xs text-gray-400">ID</label>
            <input value={id} onChange={e => setId(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" placeholder="bomb_ring" />
          </div>
          <div>
            <label className="text-xs text-gray-400">名称</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" placeholder="炸弹圈" />
          </div>
          <div>
            <label className="text-xs text-gray-400">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm h-16" placeholder="关卡描述..." />
          </div>

          {/* Wall settings */}
          <div className="p-3 bg-gray-900/60 rounded-lg flex flex-col gap-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">墙设置</div>

            {/* Sticker type range */}
            <div>
              <label className="text-xs text-gray-400">贴纸种类数</label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={effectiveMin}
                  onChange={e => setStickerMin(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n} disabled={n < distinctGroups}>
                      {n}{n < distinctGroups ? ` (已用${distinctGroups}组)` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">~</span>
                <select
                  value={effectiveMax}
                  onChange={e => setStickerMax(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n} disabled={n < effectiveMin}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">种</span>
              </div>
              {distinctGroups > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">已使用 {distinctGroups} 个编组，下限自动锁定</p>
              )}
            </div>

            {/* Max doom in blank */}
            <div>
              <label className="text-xs text-gray-400">空白区厄运上限</label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={maxDoomInBlank}
                  onChange={e => setMaxDoomInBlank(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  <option value={-1}>不限</option>
                  {[0,1,2,3,4,5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Test result preview */}
          {testResult && (
            <div>
              <div className="text-xs text-gray-400 mb-1">测试生成结果</div>
              <TemplatePreview grid={testResult} size="md" />
              <button onClick={handleTest} className="mt-2 text-xs text-blue-400 hover:underline">重新生成</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the full editor flow works**

Run: `npm run dev`

Navigate to `/editor`. Verify:
- Paint sticker cells with the sticker brush
- Toggle group mode on, select group 0, click on sticker cells → they get colored border and G0 label
- Select group 1, click other sticker cells → different color, G1 label
- Right-click a grouped cell → group removed
- Sticker type range: min dropdown is auto-clamped (can't go below distinct group count)
- Test generate produces a wall that respects group structure
- Save and export work with new `settings` format

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/LevelEditor.jsx
git commit -m "feat: LevelEditor — structured settings UI, group mode state, auto-clamped sticker type range"
```

---

## Task 6: Update TemplatePreview for Group Borders

**Files:**
- Modify: `src/components/editor/TemplatePreview.jsx`

Add group border colors to the miniature preview, matching GridPainter's color scheme.

- [ ] **Step 1: Update TemplatePreview.jsx**

Read the current file, then replace with:

```jsx
import React from 'react';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const MINI_COLORS = {
  // Template token types
  empty: 'bg-gray-900',
  doom_resolve: 'bg-red-700',
  doom_upgrade: 'bg-red-500',
  any_doom: 'bg-red-600',
  bomb: 'bg-orange-700',
  gold: 'bg-yellow-600',
  order: 'bg-blue-600',
  out_of_game: 'bg-purple-600',
  any_special: 'bg-gray-500',
  any_sticker: 'bg-green-600',
  // Resolved cell types (from generateWallFromTemplate output)
  doom_resolution: 'bg-red-700',
  sticker: 'bg-green-600',
  item: 'bg-green-600',
  order_cell: 'bg-blue-600',
};

const GROUP_BORDER_COLORS = [
  'border-rose-400',
  'border-sky-400',
  'border-amber-400',
  'border-lime-400',
  'border-violet-400',
  'border-teal-400',
  'border-orange-400',
  'border-pink-400',
];

function getCellColor(cell) {
  if (!cell) return 'bg-gray-800/40';
  const type = typeof cell === 'string' ? cell : cell.type;
  return MINI_COLORS[type] || 'bg-gray-600';
}

function getCellGroup(cell) {
  if (typeof cell === 'object' && cell !== null) return cell.group;
  return undefined;
}

export default function TemplatePreview({ grid, size = 'sm', label }) {
  const gridSize = MATRIX_CONFIG.gridSize;
  const cellPx = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="inline-grid gap-px"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const hasMultiplier = typeof cell === 'object' && cell?.multiplier;
            const group = getCellGroup(cell);
            const groupBorder = group !== undefined
              ? `border ${GROUP_BORDER_COLORS[group % GROUP_BORDER_COLORS.length]}`
              : '';
            return (
              <div
                key={`${r}-${c}`}
                className={`${cellPx} ${getCellColor(cell)} rounded-sm relative ${groupBorder}`}
              >
                {hasMultiplier && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-yellow-300">
                    x{cell.multiplier}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/TemplatePreview.jsx
git commit -m "feat: TemplatePreview — show group borders in miniature preview"
```

---

## Task 7: Verify & Build

- [ ] **Step 1: Run production build**

Run: `npm run build`

Fix any build errors.

- [ ] **Step 2: End-to-end verification**

Run: `npm run dev`

Test the complete flow:
1. Open `/editor`, paint several sticker cells
2. Toggle group mode, assign some to group 0, some to group 1
3. Verify the sticker type range min dropdown can't go below 2 (two groups used)
4. Set range to 3-4, set max doom to 0
5. Click "test generate" — verify grouped stickers share same type and form polyominoes, and 3-4 total sticker types appear
6. Save, go to `/levels`, verify template preview shows group borders
7. Enable the template, go play the game
8. Verify the template wall appears correctly in-game — grouped stickers should be one polyomino, ungrouped stickers should be independent 1×1

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: post-verification fixes for sticker system redesign"
```
