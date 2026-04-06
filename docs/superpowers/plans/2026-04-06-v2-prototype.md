# V2 Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the turn-based prototype from v1 (pool items, row-only, single run) to v2 (stickers, orders, column selection, 3-expedition meta-loop with scoring).

**Architecture:** Replace pool-based items with 8 sticker types as grid content. Add order system (bulletin board + active orders) that converts stickers into out-of-game score items. Wrap the existing turn loop in a 3-expedition meta-loop with cumulative scoring. Add column selection alongside row selection. Add wall 3-choose-1 between turns.

**Tech Stack:** React 18 + Vite 6 + Tailwind CSS 3, no test suite (verify via `npm run build` + browser).

**No test suite exists.** Verification is `npm run build` (syntax) + `npm run dev` (browser). Each task ends with a build check and commit.

---

## File Structure

### New Files
- `src/data/v2Config.js` — All v2 config: sticker definitions, out-of-game items, order templates, wall type configs
- `src/components/game/BulletinBoard.jsx` — Bulletin board UI (available orders)
- `src/components/game/ActiveOrders.jsx` — Active/accepted orders UI with submit
- `src/components/game/WallPicker.jsx` — 3-choose-1 wall selection UI
- `src/components/game/ScoreBoard.jsx` — Expedition scores + cumulative total

### Modified Files
- `src/data/matrixConfig.js` — Add new cell types (gold, order, out-of-game item), sticker distribution config
- `src/data/constants.js` — Update `INITIAL_GAME_CONFIG` to reference v2 config, inventory size 15
- `src/utils/matrixHelpers.js` — New `generateWall()` function using stickers instead of pools, new cell types
- `src/hooks/useGameLogic.js` — Add: column selection, order state, expedition meta-loop, scoring, wall choice
- `src/components/game/ResourceMatrix.jsx` — Add column buttons, new cell type rendering (sticker/gold/order/item)
- `src/GameCore.jsx` — New layout sections: bulletin board, active orders, wall picker, score display, expedition flow
- `src/utils/translations.js` — All new strings
- `src/index.css` — Any new animations

---

## Task 1: V2 Data Foundation

**Files:**
- Create: `src/data/v2Config.js`
- Modify: `src/data/constants.js`
- Modify: `src/data/matrixConfig.js`

- [ ] **Step 1: Create v2Config.js with stickers, items, orders**

```javascript
// src/data/v2Config.js

/** 8 sticker types — in-run materials for completing orders */
export const STICKERS = [
  { id: 'star',    icon: '⭐', name: '星星' },
  { id: 'flower',  icon: '🌸', name: '花朵' },
  { id: 'bolt',    icon: '⚡', name: '闪电' },
  { id: 'flame',   icon: '🔥', name: '火焰' },
  { id: 'moon',    icon: '🌙', name: '月亮' },
  { id: 'clover',  icon: '🍀', name: '四叶草' },
  { id: 'note',    icon: '🎵', name: '音符' },
  { id: 'butterfly', icon: '🦋', name: '蝴蝶' },
];

/** Out-of-game items — score items, obtained via orders or rarely on wall */
export const OUT_OF_GAME_ITEMS = [
  // 1 point (easy)
  { id: 'teddy',   icon: '🧸', name: '玩偶', score: 1 },
  { id: 'headset', icon: '🎧', name: '耳机', score: 1 },
  { id: 'shades',  icon: '🕶️', name: '墨镜', score: 1 },
  // 2 points (medium)
  { id: 'watch',   icon: '⌚', name: '手表', score: 2 },
  { id: 'bag',     icon: '👜', name: '手包', score: 2 },
  { id: 'camera',  icon: '📷', name: '相机', score: 2 },
  // 3 points (hard)
  { id: 'laptop',  icon: '💻', name: '笔记本', score: 3 },
  { id: 'dress',   icon: '👗', name: '礼服', score: 3 },
  { id: 'ring',    icon: '💍', name: '戒指', score: 3 },
  // 5 points (extreme)
  { id: 'car',     icon: '🚗', name: '汽车', score: 5 },
  { id: 'trip',    icon: '🏝️', name: '旅行', score: 5 },
  { id: 'house',   icon: '🏠', name: '房产', score: 5 },
];

/** Order difficulty → requirements mapping */
export const ORDER_TEMPLATES = {
  easy:    { score: 1, stickerCount: 2, stickerTypes: 2 },
  medium:  { score: 2, stickerCount: 3, stickerTypes: 2 },
  hard:    { score: 3, stickerCount: 4, stickerTypes: 3 },
  extreme: { score: 5, stickerCount: 6, stickerTypes: 4 },
};

/** Order generation weights (probability of each difficulty) */
export const ORDER_DIFFICULTY_WEIGHTS = {
  easy: 40,
  medium: 35,
  hard: 20,
  extreme: 5,
};

/** Wall type definitions */
export const WALL_TYPES = {
  basic:      { id: 'basic',      name: '基础墙',   desc: '标准规则' },
  hidden:     { id: 'hidden',     name: '隐藏墙',   desc: '大量隐藏格' },
  drift:      { id: 'drift',      name: '漂移墙',   desc: '抽取后格子随机移位' },
  doubled:    { id: 'doubled',    name: '加倍墙',   desc: '部分格子有倍率标记' },
  alternating:{ id: 'alternating', name: '交替墙',  desc: '行列交替选择' },
};

/** Expedition / meta-game config */
export const EXPEDITION_CONFIG = {
  totalExpeditions: 3,
  victoryScore: 30,
};

/** Order system config */
export const ORDER_CONFIG = {
  bulletinCapacity: 5,       // max orders on bulletin board
  maxActiveOrders: 3,        // max accepted orders
  ordersPerTurn: 1,          // auto-add per turn end
  initialBulletinCount: 2,   // orders at expedition start
};

/** New cell type spawn rates (per cell position, after doom check) */
export const CELL_SPAWN_RATES = {
  gold:       0.06,  // 6% chance — gives 1-2 gold
  order:      0.04,  // 4% chance — adds order to bulletin
  outOfGame:  0.02,  // 2% chance — rare direct score item
};

/** How many sticker types per wall */
export const WALL_STICKER_COUNT = { min: 2, max: 3 };
```

- [ ] **Step 2: Update constants.js — inventory size 15, reference v2 config**

In `src/data/constants.js`, change `INITIAL_GAME_CONFIG`:

```javascript
// At top, add import:
import { EXPEDITION_CONFIG, ORDER_CONFIG } from './v2Config';

// Change INITIAL_GAME_CONFIG:
export const INITIAL_GAME_CONFIG = {
    pools: INITIAL_POOLS_DATA,    // kept for legacy, not used by v2 grid gen
    stages: INITIAL_STAGE_CONFIG,
    doom: DOOM_CONFIG,
    turn: TURN_CONFIG,
    expedition: EXPEDITION_CONFIG,
    order: ORDER_CONFIG,
    inventorySize: 15,
};
```

- [ ] **Step 3: Update matrixConfig.js — add new cell type config**

Add to `MATRIX_CONFIG`:

```javascript
// After doomCells section, add:
specialCells: {
    gold: {
      spawnChance: 0.06,
      icon: '💰',
      name: '金币',
      goldRange: [1, 2],  // random 1-2 gold
    },
    order: {
      spawnChance: 0.04,
      icon: '📋',
      name: '订单',
    },
    outOfGame: {
      spawnChance: 0.02,
      icon: '🎁',
      name: '局外物品',
    },
  },
```

- [ ] **Step 4: Build check + commit**

Run: `npm run build`
Expected: Success

```bash
git add src/data/v2Config.js src/data/constants.js src/data/matrixConfig.js
git commit -m "feat: v2 data foundation — stickers, orders, items, wall config"
```

---

## Task 2: Sticker-Based Grid Generation

**Files:**
- Modify: `src/utils/matrixHelpers.js`

Replace pool-based item generation with sticker-based generation. Each wall picks 2-3 sticker types, fills cells with those stickers. Also generates gold/order/outOfGame cells.

- [ ] **Step 1: Rewrite generateTurnMatrix to use stickers**

Replace the entire `generateTurnMatrix` function. New signature: `generateWall(wallStickerTypes)` where `wallStickerTypes` is an array of sticker objects (pre-selected 2-3 types).

```javascript
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { OUT_OF_GAME_ITEMS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function rollItemSize(weights) {
  const entries = Object.entries(weights).map(([k, v]) => [Number(k), v]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [size, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return size;
  }
  return 1;
}

function tryPlaceShape(shape, startRow, startCol, grid, gridSize) {
  const positions = [];
  for (const [dr, dc] of shape) {
    const r = startRow + dr;
    const c = startCol + dc;
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null;
    if (grid[r][c] !== null) return null;
    positions.push([r, c]);
  }
  return positions;
}

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Generate a 5x5 wall for one turn.
 * @param {Array} wallStickers — 2-3 sticker type objects for this wall
 * @returns {{ grid, doomCellCount, meta }}
 */
export function generateWall(wallStickers) {
  const { gridSize, doomCells, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0, upgrade: 0 };

  // Phase 1: Roll doom cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (Math.random() < doomCells.resolution.spawnChance) {
        grid[row][col] = {
          type: 'doom_resolution', icon: doomCells.resolution.icon,
          name: doomCells.resolution.name, uid: generateUID(),
        };
        doomCellCount.resolution++;
      } else if (Math.random() < doomCells.upgrade.spawnChance) {
        grid[row][col] = {
          type: 'doom_upgrade', icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name, uid: generateUID(),
        };
        doomCellCount.upgrade++;
      }
    }
  }

  // Phase 2: Roll special cells (gold, order, outOfGame) on remaining empty
  if (specialCells) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col] !== null) continue;
        const roll = Math.random();
        let cumulative = 0;
        if (specialCells.gold && (cumulative += specialCells.gold.spawnChance) > roll) {
          const goldAmount = specialCells.gold.goldRange[0] +
            Math.floor(Math.random() * (specialCells.gold.goldRange[1] - specialCells.gold.goldRange[0] + 1));
          grid[row][col] = {
            type: 'gold', icon: specialCells.gold.icon,
            name: `${goldAmount} ${specialCells.gold.name}`,
            goldAmount, uid: generateUID(),
          };
          continue;
        }
        if (specialCells.order && (cumulative += specialCells.order.spawnChance) > roll) {
          grid[row][col] = {
            type: 'order_cell', icon: specialCells.order.icon,
            name: specialCells.order.name, uid: generateUID(),
          };
          continue;
        }
        if (specialCells.outOfGame && (cumulative += specialCells.outOfGame.spawnChance) > roll) {
          const item = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
          grid[row][col] = {
            type: 'out_of_game', icon: item.icon,
            name: item.name, item: { ...item },
            uid: generateUID(),
          };
          continue;
        }
      }
    }
  }

  // Phase 3: Fill remaining empty cells with sticker shapes
  const getEmptyPositions = () => {
    const empty = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === null) empty.push([r, c]);
      }
    }
    return empty;
  };

  let empty = getEmptyPositions();
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    if (grid[startR][startC] !== null) { empty.shift(); continue; }

    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
      const shuffled = [...shapesForSize].sort(() => Math.random() - 0.5);
      for (const shape of shuffled) {
        const positions = tryPlaceShape(shape, startR, startC, grid, gridSize);
        if (positions) {
          const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'sticker', item: { ...sticker },
              uid: generateUID(), groupId, shapeSize: size,
            };
          }
          placed = true;
          break;
        }
      }
      if (!placed) size--;
    }

    if (!placed) {
      const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
      grid[startR][startC] = {
        type: 'sticker', item: { ...sticker },
        uid: generateUID(), groupId: generateUID(), shapeSize: 1,
      };
    }

    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

  return { grid, doomCellCount };
}

/** Pick 2-3 random sticker types for a wall */
export function pickWallStickers(allStickers, min = 2, max = 3) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Keep legacy export for compatibility during migration
export function generateTurnMatrix(pools) {
  // Fallback: use legacy pools as pseudo-stickers
  const items = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      items.push({ id: item.name, icon: item.icon, name: item.name, poolId: pool.id });
    }
  }
  const picked = items.sort(() => Math.random() - 0.5).slice(0, 3);
  return generateWall(picked);
}
```

- [ ] **Step 2: Build check + commit**

Run: `npm run build`
Expected: Success

```bash
git add src/utils/matrixHelpers.js
git commit -m "feat: sticker-based wall generation with gold/order/outOfGame cells"
```

---

## Task 3: Column Selection

**Files:**
- Modify: `src/hooks/useGameLogic.js`
- Modify: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: Add selectColumn to useGameLogic.js**

Add after the existing `selectRow` function, a `selectColumn` that works identically but picks from column cells:

```javascript
/** Select a column — same as selectRow but vertical */
const selectColumn = (colIndex) => {
    if (phase !== 'drawing') return;
    if (isDoomResolving || isDrawAnimating) return;
    if (gold < turnConfig.drawCost) return;
    if (!matrix) return;

    setDoomResolutionResult(null);
    setFlyingItem(null);
    setLastDrawResult(null);

    // Collect active cells in this column
    const activeCols = []; // reusing name for animation compat — these are row indices
    matrix.forEach((row, rowIndex) => {
        if (row[colIndex] !== null) activeCols.push(rowIndex);
    });
    if (activeCols.length === 0) return;

    setGold(prev => prev - turnConfig.drawCost);

    const finalRowIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
    const drawnCell = matrix[finalRowIndex][colIndex];

    const finalIdx = activeCols.indexOf(finalRowIndex);
    const fullPasses = 1;
    const totalTicks = fullPasses * activeCols.length + finalIdx + 1;

    setDrawAnimState({
        direction: 'column',
        colIndex,            // which column
        rowIndex: null,      // not a row selection
        activeCols,          // active row indices in this column
        finalColIndex: colIndex,
        finalRowIndex,
        drawnCell,
        tick: 0,
        totalTicks,
        currentHighlight: activeCols[0],
        phase: 'scanning',
    });
};
```

Also update `selectRow` to add `direction: 'row'` to its `drawAnimState`:

```javascript
setDrawAnimState({
    direction: 'row',
    rowIndex,
    colIndex: null,
    activeCols,
    finalColIndex,
    finalRowIndex: rowIndex,
    drawnCell,
    tick: 0,
    totalTicks,
    currentHighlight: activeCols[0],
    phase: 'scanning',
});
```

Update `completeDrawAnim` to use `finalRowIndex` and `finalColIndex` from drawAnimState (instead of just `rowIndex` and `finalColIndex`).

Add `selectColumn` to the return object.

- [ ] **Step 2: Update ResourceMatrix — add column buttons across top**

Add a row of column buttons above the grid. Update highlight logic to support column hover + column scanning.

In `ResourceMatrix.jsx`, add `onSelectColumn` prop. Add `hoveredCol` state alongside `hoveredRow`. Add column buttons:

```jsx
{/* Column buttons — row across the top */}
<div className="flex ml-[44px] mb-2" style={{ paddingLeft: HALF }}>
    {Array.from({ length: 5 }).map((_, colIndex) => {
        const hasActive = matrix.some(row => row[colIndex] !== null);
        const colClickable = canDraw && hasActive;
        return (
            <button
                key={colIndex}
                onClick={() => colClickable && onSelectColumn(colIndex)}
                onMouseEnter={() => colClickable && setHoveredCol(colIndex)}
                onMouseLeave={() => setHoveredCol(null)}
                disabled={!colClickable}
                className={`rounded-lg text-xs font-black flex-shrink-0
                    flex items-center justify-center transition-all duration-150 shadow-sm
                    ${colClickable
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                style={{ width: CELL_SIZE, height: 28, marginRight: GAP }}
                title={colClickable ? t('抽取此列') : t('无法抽取')}
            >
                ▼
            </button>
        );
    })}
</div>
```

Update highlight logic: cells in `hoveredCol` get 'hover', column scanning highlights based on `drawAnimState.direction === 'column'`.

- [ ] **Step 3: Update tickDrawAnim for column direction**

The existing `tickDrawAnim` already cycles through `activeCols` sequentially — it works for both directions since `activeCols` contains the relevant indices in both cases. No change needed to the tick logic.

Update the highlight computation in `ResourceMatrix.jsx` render:

```javascript
// Column scanning highlight
const isColScanning = drawAnimState?.direction === 'column'
    && drawAnimState.colIndex === colIndex
    && drawAnimState.phase === 'scanning'
    && drawAnimState.currentHighlight === rowIndex;
const isColSettled = drawAnimState?.direction === 'column'
    && drawAnimState.colIndex === colIndex
    && drawAnimState.phase === 'settled'
    && drawAnimState.finalRowIndex === rowIndex;
const isColScanCol = drawAnimState?.direction === 'column'
    && drawAnimState.colIndex === colIndex
    && cell !== null
    && drawAnimState.phase === 'scanning';

// Combine with existing row scanning
const isScanning = isRowScanning || isColScanning;
const isSettled = isRowSettled || isColSettled;
const isScanRow = isRowScanRow || isColScanCol;
```

- [ ] **Step 4: Build check + commit**

Run: `npm run build`

```bash
git add src/hooks/useGameLogic.js src/components/game/ResourceMatrix.jsx
git commit -m "feat: column selection — select rows or columns to draw"
```

---

## Task 4: Update Cell Rendering for New Types

**Files:**
- Modify: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: Update getCellContent for sticker/gold/order/outOfGame cells**

```javascript
const getCellContent = (cell) => {
    if (cell === null) return <span className="text-gray-300">·</span>;
    if (cell.type === 'sticker') return <span className="text-xl">{cell.item.icon}</span>;
    if (cell.type === 'gold') return <span className="text-xl">{cell.icon}</span>;
    if (cell.type === 'order_cell') return <span className="text-xl">{cell.icon}</span>;
    if (cell.type === 'out_of_game') return <span className="text-xl">{cell.icon}</span>;
    // doom cells + legacy item cells
    return <span className="text-xl">{cell.icon || cell.item?.icon}</span>;
};
```

- [ ] **Step 2: Update GridCell bgClass for new cell types**

Add cases in the background color logic:

```javascript
} else if (cell.type === 'sticker') {
    // Same shape-size coloring as before
    const size = cell.shapeSize || 1;
    const bg = size >= 4 ? 'bg-violet-100' : size >= 3 ? 'bg-sky-100' : size >= 2 ? 'bg-emerald-100' : 'bg-white';
    const borderColor = size >= 4 ? 'border-violet-400' : size >= 3 ? 'border-sky-400' : size >= 2 ? 'border-emerald-400' : 'border-gray-300';
    const bT = top ? 'border-t-0' : borderColor;
    const bB = bottom ? 'border-b-0' : borderColor;
    const bL = left ? 'border-l-0' : borderColor;
    const bR = right ? 'border-r-0' : borderColor;
    bgClass = `${bg} ${bT} ${bB} ${bL} ${bR}`;
} else if (cell.type === 'gold') {
    bgClass = 'bg-yellow-100 border-yellow-400';
} else if (cell.type === 'order_cell') {
    bgClass = 'bg-blue-50 border-blue-300';
} else if (cell.type === 'out_of_game') {
    bgClass = 'bg-pink-100 border-pink-400';
}
```

- [ ] **Step 3: Update cell name display for sticker type**

Change the item name display condition:

```javascript
{cell !== null && (cell.type === 'sticker' || cell.type === 'item') && (
    <span className="text-[9px] text-gray-600 leading-none mt-0.5 truncate max-w-[48px] font-medium">
        {cell.item.name}
    </span>
)}
```

- [ ] **Step 4: Update CellTooltip for new cell types**

Add tooltip support for gold/order/outOfGame cells:

```javascript
const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade'
    || cell.type === 'gold' || cell.type === 'order_cell' || cell.type === 'out_of_game');
```

In `CellTooltip`, add cases:

```javascript
} else if (cell.type === 'gold') {
    icon = cell.icon; name = cell.name;
    desc = t('抽中时获得金币');
} else if (cell.type === 'order_cell') {
    icon = cell.icon; name = cell.name;
    desc = t('抽中时获得一个新订单');
} else if (cell.type === 'out_of_game') {
    icon = cell.icon; name = cell.name;
    desc = t('抽中时直接获得局外物品');
}
```

- [ ] **Step 5: Build check + commit**

Run: `npm run build`

```bash
git add src/components/game/ResourceMatrix.jsx
git commit -m "feat: render sticker/gold/order/outOfGame cells on wall"
```

---

## Task 5: Order System — State & Logic

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Add order state and generation logic**

Add imports at top:

```javascript
import { STICKERS, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES, ORDER_DIFFICULTY_WEIGHTS, ORDER_CONFIG } from '../data/v2Config';
```

Add helper function before the hook:

```javascript
function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** Generate a random order */
function generateOrder() {
  const difficulty = weightedRandom(ORDER_DIFFICULTY_WEIGHTS);
  const template = ORDER_TEMPLATES[difficulty];
  // Pick reward item matching score
  const matchingItems = OUT_OF_GAME_ITEMS.filter(i => i.score === template.score);
  const reward = matchingItems[Math.floor(Math.random() * matchingItems.length)];
  // Generate sticker requirements (hidden until accepted)
  const shuffledStickers = [...STICKERS].sort(() => Math.random() - 0.5);
  const selectedTypes = shuffledStickers.slice(0, template.stickerTypes);
  const requirements = [];
  let remaining = template.stickerCount;
  for (let i = 0; i < selectedTypes.length; i++) {
    const count = i === selectedTypes.length - 1
      ? remaining
      : 1 + Math.floor(Math.random() * (remaining - (selectedTypes.length - i - 1)));
    requirements.push({ stickerId: selectedTypes[i].id, icon: selectedTypes[i].icon, name: selectedTypes[i].name, count });
    remaining -= count;
  }
  return {
    id: generateUID(),
    difficulty,
    reward: { ...reward },
    requirements, // hidden until accepted
    accepted: false,
  };
}
```

- [ ] **Step 2: Add order state variables**

Inside the hook, add:

```javascript
// --- Order State ---
const [bulletinBoard, setBulletinBoard] = useState([]); // available orders (max 5)
const [activeOrders, setActiveOrders] = useState([]);    // accepted orders (max 3)
```

- [ ] **Step 3: Add order actions**

```javascript
// =============================================
// ORDER SYSTEM
// =============================================

/** Accept an order from bulletin board */
const acceptOrder = (orderId) => {
    const order = bulletinBoard.find(o => o.id === orderId);
    if (!order) return;
    if (activeOrders.length >= orderConfig.maxActiveOrders) {
        showToast(t('已接取的订单已满'), 'warning');
        return;
    }
    setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
    setActiveOrders(prev => [...prev, { ...order, accepted: true }]);
};

/** Replace an active order with a new one from bulletin */
const replaceActiveOrder = (activeOrderId, bulletinOrderId) => {
    const newOrder = bulletinBoard.find(o => o.id === bulletinOrderId);
    if (!newOrder) return;
    setBulletinBoard(prev => prev.filter(o => o.id !== bulletinOrderId));
    setActiveOrders(prev => prev.map(o =>
        o.id === activeOrderId ? { ...newOrder, accepted: true } : o
    ));
};

/** Submit a completed order — consume stickers, get reward */
const submitOrder = (orderId) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;
    // Check if player has enough stickers
    const inv = [...inventory];
    const toRemove = [];
    for (const req of order.requirements) {
        let found = 0;
        for (let i = 0; i < inv.length; i++) {
            if (inv[i] && inv[i].stickerId === req.stickerId && !toRemove.includes(i)) {
                toRemove.push(i);
                found++;
                if (found >= req.count) break;
            }
        }
        if (found < req.count) {
            showToast(t('贴纸不足'), 'error');
            return;
        }
    }
    // Remove stickers (indices in reverse to avoid shift)
    toRemove.sort((a, b) => b - a);
    const newInv = [...inventory];
    for (const idx of toRemove) {
        newInv.splice(idx, 1);
    }
    // Add reward to inventory
    newInv.push({
        name: order.reward.name,
        icon: order.reward.icon,
        score: order.reward.score,
        isOutOfGame: true,
        uid: generateUID(),
    });
    setInventory(newInv);
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
    showToast(`${t('订单完成')}! ${order.reward.icon} ${order.reward.name} (+${order.reward.score})`, 'success');
};

/** Check if an order can be submitted */
const canSubmitOrder = (orderId) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return false;
    for (const req of order.requirements) {
        const count = inventory.filter(i => i.stickerId === req.stickerId).length;
        if (count < req.count) return false;
    }
    return true;
};

/** Add random order to bulletin (called at turn end) */
const addBulletinOrder = () => {
    setBulletinBoard(prev => {
        const newBoard = [...prev];
        if (newBoard.length >= orderConfig.bulletinCapacity) {
            newBoard.shift(); // remove oldest
        }
        newBoard.push(generateOrder());
        return newBoard;
    });
};
```

- [ ] **Step 4: Integrate orders into turn flow**

In `startNewTurn`, after doom accumulation, add bulletin order:

```javascript
// Add order to bulletin (not on first turn)
if (newTurnNumber > 1) {
    addBulletinOrder();
}
```

In expedition start (or `startGame`), seed initial bulletin:

```javascript
// Seed initial bulletin board
for (let i = 0; i < orderConfig.initialBulletinCount; i++) {
    setBulletinBoard(prev => [...prev, generateOrder()]);
}
```

- [ ] **Step 5: Update addToInventory for sticker items**

When a sticker cell is drawn, store it as a sticker in inventory:

```javascript
const addToInventory = (cell) => {
    let newItem;
    if (cell.type === 'sticker') {
        newItem = {
            name: cell.item.name,
            icon: cell.item.icon,
            stickerId: cell.item.id,
            isSticker: true,
            uid: cell.uid,
        };
    } else if (cell.type === 'out_of_game') {
        newItem = {
            name: cell.item.name,
            icon: cell.item.icon,
            score: cell.item.score,
            isOutOfGame: true,
            uid: cell.uid,
        };
    } else {
        // Legacy item fallback
        newItem = {
            name: cell.item.name,
            icon: cell.item.icon,
            poolId: cell.item.poolId,
            uid: cell.uid,
        };
    }
    if (inventory.length >= maxInventorySize) {
        setPendingItem(newItem);
        return;
    }
    setInventory(prev => [...prev, newItem]);
};
```

- [ ] **Step 6: Handle gold and order cell draw effects in completeDrawAnim**

In `completeDrawAnim`, add handling for new cell types:

```javascript
if (drawnCell.type === 'sticker') {
    obtainedItem = drawnCell;
} else if (drawnCell.type === 'gold') {
    setGold(prev => prev + drawnCell.goldAmount);
    showToast(`+${drawnCell.goldAmount} ${t('金币')}`, 'info');
} else if (drawnCell.type === 'order_cell') {
    addBulletinOrder();
    showToast(t('获得新订单'), 'info');
} else if (drawnCell.type === 'out_of_game') {
    obtainedItem = drawnCell;
} else if (drawnCell.type === 'doom_resolution') {
    doomEffects.resolutions = 1;
} else if (drawnCell.type === 'doom_upgrade') {
    doomEffects.upgrades = 1;
}
```

- [ ] **Step 7: Add order state to return + reset**

Add to return object:

```javascript
bulletinBoard,
activeOrders,
acceptOrder,
replaceActiveOrder,
submitOrder,
canSubmitOrder,
```

Add to `handleReset`:

```javascript
setBulletinBoard([]);
setActiveOrders([]);
```

- [ ] **Step 8: Build check + commit**

Run: `npm run build`

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: order system — bulletin board, accept, submit, sticker inventory"
```

---

## Task 6: Order System — UI Components

**Files:**
- Create: `src/components/game/BulletinBoard.jsx`
- Create: `src/components/game/ActiveOrders.jsx`
- Modify: `src/GameCore.jsx`
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Create BulletinBoard.jsx**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const BulletinBoard = ({ orders, onAccept, canAccept }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('公告牌')} ({orders.length}/5)</h3>
            {orders.length === 0 ? (
                <p className="text-xs text-gray-400">{t('暂无订单')}</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {orders.map(order => (
                        <div key={order.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-gray-50"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{order.reward.icon}</span>
                                <div>
                                    <div className="text-xs font-bold">{order.reward.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                        {t(order.difficulty)} · +{order.reward.score}{t('分')}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onAccept(order.id)}
                                disabled={!canAccept}
                                className={`text-xs px-2 py-1 rounded font-bold transition-colors
                                    ${canAccept
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {t('接取')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulletinBoard;
```

- [ ] **Step 2: Create ActiveOrders.jsx**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ActiveOrders = ({ orders, inventory, onSubmit, canSubmitOrder }) => {
    const { t } = useLanguage();

    if (orders.length === 0) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('已接订单')} ({orders.length}/3)</h3>
            <div className="flex flex-col gap-2">
                {orders.map(order => {
                    const submittable = canSubmitOrder(order.id);
                    return (
                        <div key={order.id}
                            className={`p-2 rounded-lg border ${submittable ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg">{order.reward.icon}</span>
                                    <span className="text-xs font-bold">{order.reward.name}</span>
                                    <span className="text-[10px] text-gray-400">+{order.reward.score}{t('分')}</span>
                                </div>
                                <button
                                    onClick={() => onSubmit(order.id)}
                                    disabled={!submittable}
                                    className={`text-xs px-2 py-1 rounded font-bold transition-colors
                                        ${submittable
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {t('提交')}
                                </button>
                            </div>
                            {/* Show required stickers */}
                            <div className="flex gap-2 flex-wrap">
                                {order.requirements.map((req, i) => {
                                    const owned = inventory.filter(item => item.stickerId === req.stickerId).length;
                                    const enough = owned >= req.count;
                                    return (
                                        <div key={i} className={`flex items-center gap-0.5 text-xs ${enough ? 'text-green-600' : 'text-gray-500'}`}>
                                            <span>{req.icon}</span>
                                            <span className="font-bold">{owned}/{req.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActiveOrders;
```

- [ ] **Step 3: Add translations**

Add to `src/utils/translations.js`:

```javascript
// --- V2: Orders & Stickers ---
"公告牌": "Bulletin Board",
"暂无订单": "No orders available",
"接取": "Accept",
"已接订单": "Active Orders",
"提交": "Submit",
"分": " pts",
"easy": "Easy",
"medium": "Medium",
"hard": "Hard",
"extreme": "Extreme",
"贴纸不足": "Not enough stickers",
"订单完成": "Order Complete",
"已接取的订单已满": "Active orders full",
"获得新订单": "New order received",
"抽中时获得金币": "Gain gold when drawn",
"抽中时获得一个新订单": "Gain a new order when drawn",
"抽中时直接获得局外物品": "Directly obtain an out-of-game item",
"抽取此列": "Draw this column",
"无法抽取": "Cannot draw",
"选择行或列抽取": "Select a row or column to draw",
```

- [ ] **Step 4: Integrate into GameCore.jsx**

Import new components and wire up the order UI in the right sidebar, below doom grid and above inventory:

```jsx
import BulletinBoard from './components/game/BulletinBoard';
import ActiveOrders from './components/game/ActiveOrders';
```

Destructure new state:

```javascript
bulletinBoard, activeOrders,
acceptOrder, replaceActiveOrder, submitOrder, canSubmitOrder,
```

Add between doom grid and inventory in the right sidebar:

```jsx
{/* Bulletin Board */}
<BulletinBoard
    orders={bulletinBoard}
    onAccept={acceptOrder}
    canAccept={activeOrders.length < 3}
/>

{/* Active Orders */}
<ActiveOrders
    orders={activeOrders}
    inventory={inventory}
    onSubmit={submitOrder}
    canSubmitOrder={canSubmitOrder}
/>
```

- [ ] **Step 5: Build check + commit**

Run: `npm run build`

```bash
git add src/components/game/BulletinBoard.jsx src/components/game/ActiveOrders.jsx src/GameCore.jsx src/utils/translations.js
git commit -m "feat: order system UI — bulletin board + active orders with submit"
```

---

## Task 7: Wire Up Sticker Grid in Game Logic

**Files:**
- Modify: `src/hooks/useGameLogic.js`

Connect the new `generateWall` to the turn flow instead of `generateTurnMatrix`.

- [ ] **Step 1: Use generateWall + pickWallStickers in startNewTurn**

```javascript
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
import { STICKERS } from '../data/v2Config';

// In startNewTurn:
const { grid } = generateWall(pickWallStickers(STICKERS));
setMatrix(grid);
```

Remove the old `generateTurnMatrix` import.

- [ ] **Step 2: Update grid header text**

In `ResourceMatrix.jsx`, update the header:

```jsx
<div className="text-center text-sm text-gray-500 mb-2 font-bold">
    {t('选择行或列抽取')}
</div>
```

- [ ] **Step 3: Build check + verify in browser + commit**

Run: `npm run build` then `npm run dev`
Verify: Grid shows sticker icons (⭐🌸⚡ etc.), gold cells (💰), occasional order/item cells. Column buttons appear above grid.

```bash
git add src/hooks/useGameLogic.js src/components/game/ResourceMatrix.jsx
git commit -m "feat: wire sticker wall generation into turn flow"
```

---

## Task 8: Expedition Meta-Loop & Scoring

**Files:**
- Modify: `src/hooks/useGameLogic.js`
- Create: `src/components/game/ScoreBoard.jsx`
- Modify: `src/GameCore.jsx`
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add expedition state to useGameLogic**

```javascript
// --- Expedition State ---
const [expeditionNumber, setExpeditionNumber] = useState(0); // 0 = not started, 1-3
const [expeditionScores, setExpeditionScores] = useState([]); // scores per expedition
const [totalScore, setTotalScore] = useState(0);
const expeditionConfig = config.expedition || { totalExpeditions: 3, victoryScore: 30 };
```

- [ ] **Step 2: Update handleEvacuate to calculate score from out-of-game items**

```javascript
const handleEvacuate = () => {
    // Calculate score from out-of-game items in inventory
    const score = inventory.reduce((sum, item) => sum + (item.score || 0), 0);
    const newScores = [...expeditionScores, score];
    setExpeditionScores(newScores);
    setTotalScore(prev => prev + score);
    setModalContent('evacuated');
    setPhase('game_over');
};
```

- [ ] **Step 3: Add startNextExpedition + reset expedition state**

```javascript
const startNextExpedition = () => {
    // Reset expedition state but keep meta state
    setTurnNumber(0);
    setGold(0);
    setMatrix(null);
    setHp(doomConfig.initialHP);
    setDoomGrid(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    setDoomLevel(doomConfig.initialDoomLevel);
    setIsDoomResolving(false);
    setDoomAnimState(null);
    setDoomResolutionResult(null);
    setAfterDoomAction(null);
    setInventory([]);
    setToast(null);
    setLastDrawResult(null);
    setModalContent(null);
    setFlyingItem(null);
    setDrawAnimState(null);
    setPendingItem(null);
    setBulletinBoard([]);
    setActiveOrders([]);
    setPhase('pre_game');
};

const startGame = () => {
    setExpeditionNumber(prev => prev + 1);
    // Seed initial bulletin
    const initial = [];
    for (let i = 0; i < (config.order?.initialBulletinCount || 2); i++) {
        initial.push(generateOrder());
    }
    setBulletinBoard(initial);
    startNewTurn();
};
```

- [ ] **Step 4: Update game_over phase — show expedition score, continue or final**

In the return, add expedition state:

```javascript
expeditionNumber,
expeditionScores,
totalScore,
startNextExpedition,
```

- [ ] **Step 5: Create ScoreBoard.jsx**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ScoreBoard = ({ expeditionNumber, expeditionScores, totalScore, victoryScore }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('得分')} — {t('探险')} {expeditionNumber}/3</h3>
            <div className="flex flex-col gap-1 text-xs">
                {expeditionScores.map((score, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{t('探险')} {i + 1}</span>
                        <span className="font-bold">{score} {t('分')}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
                <span>{t('累计')}</span>
                <span className={totalScore >= victoryScore ? 'text-green-600' : ''}>{totalScore}/{victoryScore}</span>
            </div>
        </div>
    );
};

export default ScoreBoard;
```

- [ ] **Step 6: Update GameCore game_over screen for expedition flow**

Show score from this expedition. If expeditions < 3, show "continue to next expedition" button. If 3 done, show final result (win/lose).

```jsx
{phase === 'game_over' && (
    <div className="text-center py-12">
        {modalContent === 'evacuated' ? (
            <>
                <h2 className="text-xl font-bold mb-2">{t('安全撤离')}</h2>
                <p className="text-gray-500 mb-4">
                    {t('探险')} {expeditionNumber} — {t('得分')}: {expeditionScores[expeditionScores.length - 1] || 0}
                </p>
            </>
        ) : (
            <>
                <h2 className="text-xl font-bold mb-2 text-red-600">{t('游戏结束')}</h2>
                <p className="text-red-500 mb-4">{t('失去了全部物品，本次探险得 0 分')}</p>
            </>
        )}

        <p className="text-sm text-gray-500 mb-6">
            {t('累计')}: {totalScore} / {expeditionConfig.victoryScore} {t('分')}
        </p>

        {expeditionNumber < expeditionConfig.totalExpeditions ? (
            <button onClick={() => { startNextExpedition(); }}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
            >
                {t('开始探险')} {expeditionNumber + 1}
            </button>
        ) : (
            <div>
                <h2 className="text-2xl font-bold mb-4">
                    {totalScore >= expeditionConfig.victoryScore
                        ? `🎉 ${t('胜利')}!`
                        : `${t('挑战失败')}`}
                </h2>
                <button onClick={handleReset}
                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                >
                    {t('再来一局')}
                </button>
            </div>
        )}
    </div>
)}
```

- [ ] **Step 7: Add expedition translations**

```javascript
"得分": "Score",
"探险": "Expedition",
"累计": "Total",
"开始探险": "Start Expedition",
"胜利": "Victory",
"挑战失败": "Challenge Failed",
"失去了全部物品，本次探险得 0 分": "Lost all items, 0 points for this expedition",
```

- [ ] **Step 8: Update handleReset to clear expedition state**

```javascript
setExpeditionNumber(0);
setExpeditionScores([]);
setTotalScore(0);
```

- [ ] **Step 9: Build check + commit**

Run: `npm run build`

```bash
git add src/hooks/useGameLogic.js src/components/game/ScoreBoard.jsx src/GameCore.jsx src/utils/translations.js
git commit -m "feat: 3-expedition meta-loop with scoring and victory condition"
```

---

## Task 9: Wall 3-Choose-1

**Files:**
- Create: `src/components/game/WallPicker.jsx`
- Modify: `src/hooks/useGameLogic.js`
- Modify: `src/GameCore.jsx`
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add wall choice state and logic in useGameLogic**

```javascript
// --- Wall Choice State ---
const [wallCandidates, setWallCandidates] = useState(null);
// Array of 3: { stickers, grid, doomCellCount, wallType }
```

Update `startNewTurn` to NOT immediately generate the grid. Instead, on turn > 1, generate 3 candidates and go to `wall_choice` phase:

```javascript
const startNewTurn = () => {
    const newTurnNumber = turnNumber + 1;
    setTurnNumber(newTurnNumber);
    setGold(turnConfig.goldPerTurn);
    setLastDrawResult(null);
    setDoomResolutionResult(null);

    // Doom accumulation (not on first turn)
    if (newTurnNumber > 1) {
        setDoomGrid(prev => {
            const newGrid = [...prev];
            let added = 0;
            for (let i = 0; i < newGrid.length && added < doomConfig.dangerPerTurn; i++) {
                if (newGrid[i].type === 'empty') {
                    newGrid[i] = { type: 'danger' };
                    added++;
                }
            }
            return newGrid;
        });
        addBulletinOrder();
    }

    if (newTurnNumber === 1) {
        // First turn: generate directly
        const stickers = pickWallStickers(STICKERS);
        const { grid } = generateWall(stickers);
        setMatrix(grid);
        setPhase('drawing');
    } else {
        // Subsequent turns: 3-choose-1
        const candidates = [0, 1, 2].map(() => {
            const stickers = pickWallStickers(STICKERS);
            const { grid, doomCellCount } = generateWall(stickers);
            return { stickers, grid, doomCellCount };
        });
        setWallCandidates(candidates);
        setPhase('wall_choice');
    }
};

const selectWall = (index) => {
    if (!wallCandidates || !wallCandidates[index]) return;
    setMatrix(wallCandidates[index].grid);
    setWallCandidates(null);
    setPhase('drawing');
};
```

Add `'wall_choice'` to the phase type comments.

- [ ] **Step 2: Create WallPicker.jsx**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    return (
        <div className="text-center py-8">
            <h2 className="text-xl font-bold mb-6">{t('选择下一面奖品墙')}</h2>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(idx)}
                        className="w-48 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                            hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                    >
                        <div className="text-sm font-bold mb-2">{t('奖品墙')} {idx + 1}</div>
                        <div className="flex gap-1 mb-2">
                            {wall.stickers.map(s => (
                                <span key={s.id} className="text-lg" title={s.name}>{s.icon}</span>
                            ))}
                        </div>
                        <div className="text-[11px] text-gray-500">
                            💀 {wall.doomCellCount.resolution + wall.doomCellCount.upgrade} {t('厄运格')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WallPicker;
```

- [ ] **Step 3: Wire into GameCore**

Import `WallPicker`. Add phase rendering:

```jsx
{phase === 'wall_choice' && wallCandidates && (
    <WallPicker candidates={wallCandidates} onSelect={selectWall} />
)}
```

Destructure: `wallCandidates, selectWall`

- [ ] **Step 4: Add translations**

```javascript
"选择下一面奖品墙": "Choose Next Prize Wall",
"奖品墙": "Wall",
"厄运格": "doom cells",
```

- [ ] **Step 5: Build check + commit**

Run: `npm run build`

```bash
git add src/hooks/useGameLogic.js src/components/game/WallPicker.jsx src/GameCore.jsx src/utils/translations.js
git commit -m "feat: wall 3-choose-1 between turns"
```

---

## Task 10: Layout Adjustments & Polish

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Reorganize right sidebar layout**

The right sidebar now needs more space. Restructure to:

```
┌─────────┬─────────────┐
│  Grid   │  Score       │
│         │  Doom Grid   │
│         │  Bulletin    │
│         │  Orders      │
│         │  Inventory   │
└─────────┴─────────────┘
```

Widen the sidebar from `w-64` to `w-72`. Add `ScoreBoard` above doom grid. Show bulletin + active orders between doom and inventory.

- [ ] **Step 2: Update pre_game screen**

Show "探险 1/3" instead of just "开始游戏":

```jsx
{phase === 'pre_game' && (
    <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">{t('三池物语')}</h2>
        <p className="text-gray-500 mb-2">{t('回合制原型')} v2</p>
        {expeditionNumber > 0 && (
            <p className="text-sm text-gray-400 mb-4">{t('累计')}: {totalScore} {t('分')}</p>
        )}
        <button onClick={startGame}
            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
        >
            {t('开始探险')} {expeditionNumber + 1}
        </button>
    </div>
)}
```

- [ ] **Step 3: Update status bar**

Add expedition indicator and score:

```jsx
<div className="flex gap-4 mb-4 p-3 bg-white rounded-xl shadow-md border border-gray-200 text-sm font-bold">
    <div className="text-rose-600">❤️ {hp} HP</div>
    <div className="text-amber-600">💰 {gold} {t('金币')}</div>
    <div className="text-indigo-600">📅 {t('回合')} {turnNumber}</div>
    <div className="text-purple-600">🗺️ {t('探险')} {expeditionNumber}/3</div>
    <div className="text-teal-600">🎒 {inventory.length}/{maxInventorySize}</div>
    <div className="text-orange-600">⭐ {totalScore}{t('分')}</div>
</div>
```

- [ ] **Step 4: Update between_turns screen to show endTurn → doom → wall_choice flow**

The `endTurn` action should trigger doom, then on completion go to `wall_choice` (not `between_turns`). Update `completeDoomResolution`:

In `useGameLogic.js`, when `afterDoomAction === 'end_turn'`:
- If turn > 0, go to `between_turns` (player decides continue/evacuate)
- In `continueToNextTurn`, call `startNewTurn` which goes to `wall_choice`

This already works with the existing flow — `between_turns` shows continue/evacuate, and `continueToNextTurn` calls `startNewTurn` which now shows `wall_choice` on turn > 1.

- [ ] **Step 5: Build check + verify everything in browser + commit**

Run: `npm run build` then `npm run dev`

Full playthrough verification:
1. Start → Expedition 1 begins, grid shows stickers
2. Can select rows AND columns
3. Stickers go to inventory with stickerId
4. Gold cells give gold
5. Bulletin board shows orders, can accept, can submit when stickers match
6. End turn → doom → between turns → continue → wall 3-choose-1
7. Evacuate → score calculated from out-of-game items → start expedition 2
8. After 3 expeditions → victory/defeat screen

```bash
git add src/GameCore.jsx src/hooks/useGameLogic.js
git commit -m "feat: v2 layout, status bar, expedition flow polish"
```

---

## Task 11: Inventory Display Update

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Differentiate stickers vs out-of-game items in inventory display**

Stickers get a subtle sticker-like style, out-of-game items get a gold border:

```jsx
<div className="grid grid-cols-5 gap-1">
    {Array.from({ length: maxInventorySize }).map((_, i) => {
        const item = inventory[i];
        const canReplace = pendingItem && item;
        let borderClass = 'border-gray-200';
        let bgClass = 'bg-gray-50';
        if (item) {
            if (item.isOutOfGame) {
                borderClass = 'border-amber-400';
                bgClass = 'bg-amber-50';
            } else {
                borderClass = 'border-gray-300';
                bgClass = 'bg-white';
            }
        }
        if (canReplace) {
            borderClass = 'border-amber-400';
        }
        return (
            <div
                key={i}
                onClick={() => canReplace && replaceInventoryItem(i)}
                className={`w-10 h-10 rounded flex items-center justify-center text-lg border
                    ${bgClass} ${borderClass}
                    ${canReplace ? 'cursor-pointer hover:bg-red-50 hover:border-red-400 hover:scale-110 transition-all duration-150' : ''}`}
                title={item ? `${item.name}${item.score ? ` (+${item.score})` : ''}` : ''}
            >
                {item ? item.icon : ''}
            </div>
        );
    })}
</div>
```

- [ ] **Step 2: Build check + commit**

Run: `npm run build`

```bash
git add src/GameCore.jsx
git commit -m "feat: inventory display — stickers vs out-of-game items visual distinction"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Column selection | Task 3 |
| Sticker system (8 types) | Task 1 (config), Task 2 (generation), Task 7 (wiring) |
| Order system (bulletin + accept + submit) | Task 5 (logic), Task 6 (UI) |
| Out-of-game items (score items) | Task 1 (config), Task 5 (draw handling) |
| 3 expeditions meta-loop | Task 8 |
| Victory at 30 pts | Task 8 |
| Inventory 15 slots | Task 1 |
| Gold cells | Task 2 (generation), Task 4 (rendering), Task 5 (draw effect) |
| Order cells on wall | Task 2, Task 4, Task 5 |
| Out-of-game item cells on wall | Task 2, Task 4, Task 5 |
| Wall 3-choose-1 | Task 9 |
| New cell type rendering | Task 4 |
| Expedition scoring | Task 8 |

### Not covered (marked as future/stretch in spec)

| Feature | Reason |
|---|---|
| Hidden cells | Design direction, complexity; can be added in a follow-up |
| Wall types (hidden/drift/double/alternating) | Only basic wall implemented; types are modifiers on top of basic |
| Bonus scoring for designated items | Minor, can be added after core loop works |
| Order cells on wall generating specific orders | Current impl generates random order; could be refined |

### Placeholder scan
No TBD/TODO markers found.

### Type consistency check
- `stickerId` used consistently for sticker identification in inventory and order requirements
- `isOutOfGame` / `isSticker` flags consistent
- `drawAnimState.direction` ('row'/'column') used consistently
- `generateWall` / `pickWallStickers` naming consistent
- `order.id` / `order.reward` / `order.requirements` structure consistent across generation, state, and UI
