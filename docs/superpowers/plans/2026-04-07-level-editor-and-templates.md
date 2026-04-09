# Level Editor & Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a level template system with visual editor so designers can create semi-handcrafted walls (fixed cells + constraints + procedural fill), and a scheduling layer to control which templates appear and with what weight.

**Architecture:** Two-layer design — template files define wall layouts (fixed/constrained/blank cells), a separate schedule config controls weights and conditions. The existing `generateWall()` gains a new code path: when given a template, it resolves fixed/constrained cells first, then runs procedural fill only on blank cells. A new `/editor` route hosts the visual editor and level management panel.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, react-router-dom (new dependency for routing)

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `src/data/levelTemplates.js` | Template data definitions + schedule config + resolver logic |
| `src/utils/templateGenerator.js` | Resolves a template into a concrete 5x5 grid (fixed → constrained → procedural fill) |
| `src/components/editor/LevelEditor.jsx` | Main editor page — grid painter + cell type picker + template metadata |
| `src/components/editor/LevelManager.jsx` | Browse all templates, preview thumbnails, edit schedule (weight/enabled/conditions) |
| `src/components/editor/GridPainter.jsx` | Interactive 5x5 grid — click to paint cells, drag for polyomino groups |
| `src/components/editor/CellPalette.jsx` | Sidebar palette of paintable cell types (doom, bomb, sticker_A, etc.) |
| `src/components/editor/TemplatePreview.jsx` | Small 5x5 thumbnail rendering of a template (reused in manager + editor) |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.jsx` | Add react-router-dom, route `/` → game, `/editor` → editor |
| `src/hooks/useGameLogic.js:169-181` | Wall candidate generation — sometimes pick a template instead of pure procedural |
| `src/utils/matrixHelpers.js:65-228` | Extract procedural fill into a reusable function that respects pre-filled cells |

---

## Task 1: Template Data Format & Sample Templates

**Files:**
- Create: `src/data/levelTemplates.js`

- [ ] **Step 1: Define the template schema and cell type constants**

```js
// src/data/levelTemplates.js

/**
 * Cell type tokens for template grids.
 * null = blank (procedural fill)
 * String tokens = fixed or constrained cells
 * Object tokens = cell with extra properties (e.g. multiplier)
 */
export const CELL_TYPES = {
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
  ANY_STICKER: 'any_sticker',     // random sticker type, 1x1
  STICKER_A: 'sticker_A',         // bound to a random type, consistent within template
  STICKER_B: 'sticker_B',
  STICKER_C: 'sticker_C',
};

/**
 * A template cell can be:
 * - null                          → procedural fill
 * - string (CELL_TYPES value)     → fixed or constrained, no extras
 * - { type: string, multiplier?: number, goldAmount?: number }  → with properties
 */

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
    constraints: {
      stickerTypeCount: 2,
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
    constraints: {
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
    constraints: {},
  },
];

// --- Schedule config (controls how templates appear in gameplay) ---

export const TEMPLATE_SCHEDULE = [
  { templateId: 'bomb_ring',        weight: 10, enabled: true, minExpedition: 1 },
  { templateId: 'doom_corridor',    weight: 15, enabled: true, minExpedition: 1 },
  { templateId: 'treasure_corners', weight: 10, enabled: true, minExpedition: 2 },
];

// Weight for "no template" (pure procedural wall) — so templates don't dominate
export const PROCEDURAL_WEIGHT = 60;
```

- [ ] **Step 2: Commit**

```bash
git add src/data/levelTemplates.js
git commit -m "feat: level template data format with sample templates and schedule config"
```

---

## Task 2: Template Resolver — Convert Template to Concrete Grid

**Files:**
- Create: `src/utils/templateGenerator.js`
- Modify: `src/utils/matrixHelpers.js`

- [ ] **Step 1: Extract procedural fill from `generateWall` into a reusable function**

In `src/utils/matrixHelpers.js`, extract Phase 3 (sticker polyomino fill, lines 157-225) into a standalone exported function `fillEmptyCellsWithStickers(grid, wallStickers, gridSize)`. This function takes a grid that may already have some cells filled, finds all `null` cells, and fills them with polyomino stickers using the existing algorithm. Also extract Phase 1+2 into a helper `fillDoomAndSpecials(grid, gridSize, constraints)` that respects constraints like `maxDoomInBlank`.

The existing `generateWall()` should call these extracted functions so behavior is unchanged.

Refactored `matrixHelpers.js`:

```js
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { OUT_OF_GAME_ITEMS } from '../data/v2Config';

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

export function pickWallStickers(allStickers, min = 3, max = 4) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Phase 1+2: Place doom cells and special cells on empty positions.
 * Respects constraints.maxDoomInBlank to limit doom count.
 */
export function fillDoomAndSpecials(grid, gridSize, constraints = {}) {
  const { doomCells, specialCells } = MATRIX_CONFIG;
  const doomCellCount = { resolution: 0, upgrade: 0 };

  // Phase 1: Doom cells
  const u1 = Math.random();
  const u2 = Math.random();
  const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let totalDoom = Math.max(1, Math.min(9, Math.round(5 + normalSample * 1.5)));

  // Respect maxDoomInBlank constraint
  if (constraints.maxDoomInBlank !== undefined) {
    totalDoom = Math.min(totalDoom, constraints.maxDoomInBlank);
  }

  if (totalDoom > 0) {
    const resCount = Math.max(0, Math.min(totalDoom, Math.round(totalDoom * (0.5 + (Math.random() - 0.5) * 0.3))));
    const upgCount = totalDoom - resCount;

    const emptyPositions = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === null) emptyPositions.push([r, c]);
      }
    }
    emptyPositions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < totalDoom && i < emptyPositions.length; i++) {
      const [r, c] = emptyPositions[i];
      if (i < resCount) {
        grid[r][c] = {
          type: 'doom_resolution',
          icon: doomCells.resolution.icon,
          name: doomCells.resolution.name,
          uid: generateUID(),
        };
        doomCellCount.resolution++;
      } else {
        grid[r][c] = {
          type: 'doom_upgrade',
          icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name,
          uid: generateUID(),
        };
        doomCellCount.upgrade++;
      }
    }
  }

  // Phase 2: Special cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;

      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const outOfGameChance = orderChance + specialCells.outOfGame.spawnChance;
      const bombChance = outOfGameChance + (specialCells.bomb?.spawnChance || 0);

      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = {
          type: 'gold', icon: specialCells.gold.icon,
          name: specialCells.gold.name, goldAmount, uid: generateUID(),
        };
      } else if (roll < orderChance) {
        grid[row][col] = {
          type: 'order_cell', icon: specialCells.order.icon,
          name: specialCells.order.name, uid: generateUID(),
        };
      } else if (roll < outOfGameChance) {
        const item = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
        grid[row][col] = {
          type: 'out_of_game', icon: item.icon,
          name: item.name, item: { ...item }, uid: generateUID(),
        };
      } else if (roll < bombChance) {
        grid[row][col] = {
          type: 'bomb', icon: specialCells.bomb.icon,
          name: specialCells.bomb.name, uid: generateUID(),
        };
      }
    }
  }

  return doomCellCount;
}

/**
 * Phase 3: Fill all remaining null cells with polyomino sticker shapes.
 */
export function fillEmptyCellsWithStickers(grid, wallStickers, gridSize) {
  const { itemShapes } = MATRIX_CONFIG;

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
    if (grid[startR][startC] !== null) {
      empty.shift();
      continue;
    }

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
              type: 'sticker',
              item: { ...sticker },
              uid: generateUID(),
              groupId,
              shapeSize: size,
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
}

/**
 * Generate a fully procedural 5x5 wall (original behavior, now delegates to extracted helpers).
 */
export function generateWall(wallStickers) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  const doomCellCount = fillDoomAndSpecials(grid, gridSize);
  fillEmptyCellsWithStickers(grid, wallStickers, gridSize);

  return { grid, doomCellCount };
}

/**
 * Legacy export — backward compatibility.
 */
export function generateTurnMatrix(pools) {
  const pseudoStickers = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      pseudoStickers.push({
        id: item.id ?? item.name,
        icon: item.icon,
        name: item.name,
        poolId: pool.id,
        poolName: pool.name,
      });
    }
  }
  const { grid, doomCellCount } = generateWall(pseudoStickers);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && grid[r][c].type === 'sticker') {
        grid[r][c].type = 'item';
      }
    }
  }
  return { grid, doomCellCount };
}
```

- [ ] **Step 2: Verify the refactored `generateWall` still works**

Run: `npm run dev`

Open the game, start a new game, verify walls generate and display correctly. Draw from a wall, verify sticker/doom/special cell behavior is unchanged.

- [ ] **Step 3: Commit the refactor**

```bash
git add src/utils/matrixHelpers.js
git commit -m "refactor: extract doom/special/sticker fill phases into reusable functions"
```

- [ ] **Step 4: Create the template resolver**

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
 * Resolve constrained cell types to concrete cell types.
 * Binds sticker_A/B/C to random sticker types (consistent within one template).
 */
function resolveConstrainedCell(token, stickerBindings) {
  const { doomCells, specialCells } = MATRIX_CONFIG;

  // Handle object tokens (e.g. { type: 'any_sticker', multiplier: 5 })
  let cellType, extras = {};
  if (typeof token === 'object' && token !== null) {
    cellType = token.type;
    const { type: _, ...rest } = token;
    extras = rest;
  } else {
    cellType = token;
  }

  switch (cellType) {
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
      return resolveConstrainedCell(types[Math.floor(Math.random() * types.length)], stickerBindings);
    }
    case CELL_TYPES.ANY_STICKER: {
      const sticker = STICKER_TYPES[Math.floor(Math.random() * STICKER_TYPES.length)];
      return { type: 'sticker', item: { ...sticker }, uid: generateUID(), groupId: generateUID(), shapeSize: 1, ...extras };
    }
    case CELL_TYPES.STICKER_A:
    case CELL_TYPES.STICKER_B:
    case CELL_TYPES.STICKER_C: {
      const sticker = stickerBindings[cellType];
      return { type: 'sticker', item: { ...sticker }, uid: generateUID(), groupId: generateUID(), shapeSize: 1, ...extras };
    }
    default:
      return null;
  }
}

/**
 * Generate a wall from a template.
 *
 * 1. Bind sticker_A/B/C to random distinct sticker types
 * 2. Resolve all fixed/constrained cells
 * 3. Group adjacent same-binding sticker cells into polyomino groups
 * 4. Run procedural fill (doom + specials + stickers) on blank cells, respecting constraints
 */
export function generateWallFromTemplate(template) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const constraints = template.constraints || {};

  // Step 1: Bind sticker slots to random distinct types
  const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
  const stickerBindings = {
    [CELL_TYPES.STICKER_A]: shuffledStickers[0],
    [CELL_TYPES.STICKER_B]: shuffledStickers[1],
    [CELL_TYPES.STICKER_C]: shuffledStickers[2],
  };

  // Step 2: Resolve fixed/constrained cells
  const doomCellCount = { resolution: 0, upgrade: 0 };
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token === null || token === undefined) continue;

      const cell = resolveConstrainedCell(token, stickerBindings);
      if (cell) {
        grid[r][c] = cell;
        if (cell.type === 'doom_resolution') doomCellCount.resolution++;
        if (cell.type === 'doom_upgrade') doomCellCount.upgrade++;
      }
    }
  }

  // Step 3: Group adjacent sticker cells with same binding into polyominos
  // Find all sticker cells placed from template, group connected ones with same item.id
  const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (!cell || cell.type !== 'sticker' || visited[r][c]) continue;

      // BFS to find connected sticker cells with same item.id
      const itemId = cell.item.id;
      const group = [];
      const queue = [[r, c]];
      visited[r][c] = true;

      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        group.push([cr, cc]);
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
          if (visited[nr][nc]) continue;
          const neighbor = grid[nr][nc];
          if (neighbor && neighbor.type === 'sticker' && neighbor.item.id === itemId) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      // Assign shared groupId and shapeSize to the group
      const groupId = generateUID();
      for (const [gr, gc] of group) {
        grid[gr][gc].groupId = groupId;
        grid[gr][gc].shapeSize = group.length;
      }
    }
  }

  // Step 4: Procedural fill on remaining blank cells
  // Add doom/specials to blank cells (respecting constraints)
  const proceduralDoom = fillDoomAndSpecials(grid, gridSize, constraints);
  doomCellCount.resolution += proceduralDoom.resolution;
  doomCellCount.upgrade += proceduralDoom.upgrade;

  // Pick wall stickers for procedural fill
  const stickerCount = constraints.stickerTypeCount || (3 + Math.floor(Math.random() * 2));
  const wallStickers = pickWallStickers(STICKER_TYPES, stickerCount, stickerCount);
  fillEmptyCellsWithStickers(grid, wallStickers, gridSize);

  return { grid, doomCellCount, stickers: wallStickers };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/templateGenerator.js
git commit -m "feat: template resolver — converts template definitions into concrete 5x5 grids"
```

---

## Task 3: Integrate Templates into Game Flow

**Files:**
- Modify: `src/hooks/useGameLogic.js:169-181`
- Modify: `src/data/levelTemplates.js` (add helper)

- [ ] **Step 1: Add a template picker function to `levelTemplates.js`**

Append to `src/data/levelTemplates.js`:

```js
/**
 * Pick a template based on schedule weights, or null for procedural.
 * @param {number} expeditionNumber — current expedition (1-based)
 */
export function pickTemplate(expeditionNumber) {
  const eligible = TEMPLATE_SCHEDULE.filter(
    s => s.enabled && expeditionNumber >= (s.minExpedition || 1)
  );

  // Build weighted pool: eligible templates + procedural fallback
  const entries = eligible.map(s => {
    const template = LEVEL_TEMPLATES.find(t => t.id === s.templateId);
    return template ? { template, weight: s.weight } : null;
  }).filter(Boolean);

  const totalTemplateWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const totalWeight = totalTemplateWeight + PROCEDURAL_WEIGHT;

  const roll = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of entries) {
    acc += entry.weight;
    if (roll < acc) return entry.template;
  }

  return null; // procedural
}
```

- [ ] **Step 2: Modify wall candidate generation in `useGameLogic.js`**

In `useGameLogic.js`, replace the wall candidate generation block (around lines 169-181) with:

```js
// At the top of the file, add import:
import { generateWallFromTemplate } from '../utils/templateGenerator';
import { pickTemplate } from '../data/levelTemplates';

// Replace the candidate generation inside startNewTurn:
const candidates = [];
const usedTypeIds = new Set();
while (candidates.length < 3) {
    const wallType = pickWallType();
    if (usedTypeIds.has(wallType.id)) continue;
    usedTypeIds.add(wallType.id);

    const template = pickTemplate(expeditionNumber);
    let stickers, grid, doomCellCount;

    if (template) {
        const result = generateWallFromTemplate(template);
        stickers = result.stickers;
        grid = result.grid;
        doomCellCount = result.doomCellCount;
    } else {
        stickers = pickWallStickers(STICKER_TYPES);
        ({ grid, doomCellCount } = generateWall(stickers));
    }

    candidates.push({ stickers, grid, doomCellCount, wallType, templateId: template?.id });
}
setWallCandidates(candidates);
setPhase('wall_choice');
```

- [ ] **Step 3: Verify integration**

Run: `npm run dev`

Play through a few turns. Some walls should now be generated from templates (you can temporarily set `PROCEDURAL_WEIGHT` to 0 to force template selection for testing). Verify:
- Template walls render correctly
- Fixed cells appear in the right positions
- Blank cells are filled with procedural stickers
- Drawing from template walls works normally (stickers, doom, bombs all function)
- Wall type mutations (hidden, multiplier, etc.) still apply on top

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGameLogic.js src/data/levelTemplates.js
git commit -m "feat: integrate template system into wall candidate generation"
```

---

## Task 4: Add Routing (Game + Editor)

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx` (wrap with BrowserRouter)

- [ ] **Step 1: Install react-router-dom**

Run: `npm install react-router-dom`

- [ ] **Step 2: Add routing to App.jsx**

```jsx
// src/App.jsx
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';
import LevelEditor from './components/editor/LevelEditor';
import LevelManager from './components/editor/LevelManager';

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/" element={<GameCore />} />
                <Route path="/editor" element={<LevelEditor />} />
                <Route path="/editor/:templateId" element={<LevelEditor />} />
                <Route path="/levels" element={<LevelManager />} />
            </Routes>
        </ErrorBoundary>
    );
}
```

- [ ] **Step 3: Wrap main.jsx with BrowserRouter**

```jsx
// src/main.jsx — add BrowserRouter
import { BrowserRouter } from 'react-router-dom';

// Wrap the App:
<BrowserRouter basename="/3pools_Web/">
  <App />
</BrowserRouter>
```

Read `src/main.jsx` first to see current structure, then apply the edit.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/main.jsx package.json package-lock.json
git commit -m "feat: add react-router-dom routing for game and editor pages"
```

---

## Task 5: Grid Painter Component

**Files:**
- Create: `src/components/editor/GridPainter.jsx`

- [ ] **Step 1: Build the interactive 5x5 grid painter**

This component displays a 5x5 grid where each cell shows its current type. Clicking a cell applies the currently selected brush. Dragging across cells paints multiple cells (for polyomino creation). Right-click clears a cell back to `null`.

```jsx
// src/components/editor/GridPainter.jsx
import React, { useState, useCallback } from 'react';
import { CELL_TYPES } from '../../data/levelTemplates';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const CELL_DISPLAY = {
  doom_resolve: { icon: '💀', bg: 'bg-red-900/60', label: '厄运结算' },
  doom_upgrade: { icon: '⬆️', bg: 'bg-red-700/60', label: '厄运升级' },
  any_doom: { icon: '💀?', bg: 'bg-red-800/40', label: '随机厄运' },
  bomb: { icon: '💣', bg: 'bg-orange-900/60', label: '炸弹' },
  gold: { icon: '💰', bg: 'bg-yellow-700/60', label: '金币' },
  order: { icon: '📋', bg: 'bg-blue-700/60', label: '订单' },
  out_of_game: { icon: '🎁', bg: 'bg-purple-700/60', label: '出口物品' },
  any_special: { icon: '❓', bg: 'bg-gray-600/60', label: '随机特殊' },
  any_sticker: { icon: '🏷️', bg: 'bg-green-700/40', label: '随机贴纸' },
  sticker_A: { icon: 'A', bg: 'bg-emerald-600/60', label: '贴纸A' },
  sticker_B: { icon: 'B', bg: 'bg-cyan-600/60', label: '贴纸B' },
  sticker_C: { icon: 'C', bg: 'bg-indigo-600/60', label: '贴纸C' },
};

function getCellType(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') return cell;
  return cell.type || null;
}

function getCellDisplay(cell) {
  const type = getCellType(cell);
  if (!type) return { icon: '', bg: 'bg-gray-800/30', label: '空白' };
  return CELL_DISPLAY[type] || { icon: '?', bg: 'bg-gray-500/60', label: type };
}

export default function GridPainter({ grid, onGridChange, activeBrush, brushExtras }) {
  const [isPainting, setIsPainting] = useState(false);
  const gridSize = MATRIX_CONFIG.gridSize;

  const applyBrush = useCallback((r, c) => {
    const newGrid = grid.map(row => [...row]);
    if (activeBrush === null) {
      // Eraser
      newGrid[r][c] = null;
    } else if (brushExtras && Object.keys(brushExtras).length > 0) {
      newGrid[r][c] = { type: activeBrush, ...brushExtras };
    } else {
      newGrid[r][c] = activeBrush;
    }
    onGridChange(newGrid);
  }, [grid, activeBrush, brushExtras, onGridChange]);

  const handleMouseDown = (r, c, e) => {
    e.preventDefault();
    if (e.button === 2) {
      // Right-click = erase
      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = null;
      onGridChange(newGrid);
    } else {
      setIsPainting(true);
      applyBrush(r, c);
    }
  };

  const handleMouseEnter = (r, c) => {
    if (isPainting) applyBrush(r, c);
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
          return (
            <div
              key={`${r}-${c}`}
              className={`w-16 h-16 ${display.bg} border border-gray-600 rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative`}
              onMouseDown={(e) => handleMouseDown(r, c, e)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              title={`[${r},${c}] ${display.label}`}
            >
              <span className="text-xl">{display.icon}</span>
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
git commit -m "feat: GridPainter — interactive 5x5 grid with brush painting and erase"
```

---

## Task 6: Cell Palette Component

**Files:**
- Create: `src/components/editor/CellPalette.jsx`

- [ ] **Step 1: Build the palette sidebar**

Shows all available cell types as clickable buttons. Selected brush is highlighted. Includes an eraser button and a multiplier number input that applies to the next painted cell.

```jsx
// src/components/editor/CellPalette.jsx
import React from 'react';
import { CELL_TYPES } from '../../data/levelTemplates';

const PALETTE_ITEMS = [
  { type: null, icon: '🚫', label: '橡皮擦', group: '工具' },
  { type: CELL_TYPES.DOOM_RESOLVE, icon: '💀', label: '厄运结算', group: '厄运' },
  { type: CELL_TYPES.DOOM_UPGRADE, icon: '⬆️', label: '厄运升级', group: '厄运' },
  { type: CELL_TYPES.ANY_DOOM, icon: '💀?', label: '随机厄运', group: '厄运' },
  { type: CELL_TYPES.BOMB, icon: '💣', label: '炸弹', group: '特殊' },
  { type: CELL_TYPES.GOLD, icon: '💰', label: '金币', group: '特殊' },
  { type: CELL_TYPES.ORDER, icon: '📋', label: '订单', group: '特殊' },
  { type: CELL_TYPES.OUT_OF_GAME, icon: '🎁', label: '出口物品', group: '特殊' },
  { type: CELL_TYPES.ANY_SPECIAL, icon: '❓', label: '随机特殊', group: '特殊' },
  { type: CELL_TYPES.ANY_STICKER, icon: '🏷️', label: '随机贴纸', group: '贴纸' },
  { type: CELL_TYPES.STICKER_A, icon: 'A', label: '贴纸A', group: '贴纸' },
  { type: CELL_TYPES.STICKER_B, icon: 'B', label: '贴纸B', group: '贴纸' },
  { type: CELL_TYPES.STICKER_C, icon: 'C', label: '贴纸C', group: '贴纸' },
];

export default function CellPalette({ activeBrush, onBrushChange, multiplier, onMultiplierChange }) {
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
                onClick={() => onBrushChange(item.type)}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-sm transition-all
                  ${activeBrush === item.type
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
          <span className="text-xs text-gray-500">(仅对贴纸生效)</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/CellPalette.jsx
git commit -m "feat: CellPalette — brush selector with all cell types and multiplier input"
```

---

## Task 7: Template Preview Component

**Files:**
- Create: `src/components/editor/TemplatePreview.jsx`

- [ ] **Step 1: Build the miniature 5x5 preview**

A small, non-interactive 5x5 grid that renders a template at thumbnail size. Used in both the editor (to show current state) and the level manager (to browse all templates).

```jsx
// src/components/editor/TemplatePreview.jsx
import React from 'react';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const MINI_COLORS = {
  doom_resolve: 'bg-red-700',
  doom_upgrade: 'bg-red-500',
  any_doom: 'bg-red-600',
  bomb: 'bg-orange-700',
  gold: 'bg-yellow-600',
  order: 'bg-blue-600',
  out_of_game: 'bg-purple-600',
  any_special: 'bg-gray-500',
  any_sticker: 'bg-green-600',
  sticker_A: 'bg-emerald-500',
  sticker_B: 'bg-cyan-500',
  sticker_C: 'bg-indigo-500',
};

function getCellColor(cell) {
  if (!cell) return 'bg-gray-800/40';
  const type = typeof cell === 'string' ? cell : cell.type;
  return MINI_COLORS[type] || 'bg-gray-600';
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
            return (
              <div
                key={`${r}-${c}`}
                className={`${cellPx} ${getCellColor(cell)} rounded-sm relative`}
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
git commit -m "feat: TemplatePreview — miniature 5x5 template thumbnail component"
```

---

## Task 8: Level Editor Page

**Files:**
- Create: `src/components/editor/LevelEditor.jsx`

- [ ] **Step 1: Assemble the editor page**

Combines GridPainter, CellPalette, and metadata fields (id, name, description, constraints). Has "New", "Save" (to in-memory store / localStorage), "Export JSON", and "Test" (generates a concrete wall from this template and shows it) buttons. Also a link to go back to game or to the level manager.

```jsx
// src/components/editor/LevelEditor.jsx
import React, { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MATRIX_CONFIG } from '../../data/matrixConfig';
import { LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { generateWallFromTemplate } from '../../utils/templateGenerator';
import GridPainter from './GridPainter';
import CellPalette from './CellPalette';
import TemplatePreview from './TemplatePreview';

const EMPTY_GRID = () =>
  Array.from({ length: MATRIX_CONFIG.gridSize }, () => Array(MATRIX_CONFIG.gridSize).fill(null));

export default function LevelEditor() {
  const { templateId } = useParams();

  // Load existing template or start blank
  const existingTemplate = templateId
    ? LEVEL_TEMPLATES.find(t => t.id === templateId)
    : null;

  const [id, setId] = useState(existingTemplate?.id || '');
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [grid, setGrid] = useState(
    existingTemplate ? existingTemplate.grid.map(r => [...r]) : EMPTY_GRID()
  );
  const [constraints, setConstraints] = useState(
    existingTemplate?.constraints
      ? JSON.stringify(existingTemplate.constraints, null, 2)
      : '{}'
  );

  const [activeBrush, setActiveBrush] = useState(null);
  const [multiplier, setMultiplier] = useState(1);

  // Compute brushExtras based on current state
  const brushExtras = {};
  if (multiplier > 1 && activeBrush && activeBrush.includes('sticker')) {
    brushExtras.multiplier = multiplier;
  }

  // Test: generate a concrete wall from this template
  const [testResult, setTestResult] = useState(null);
  const handleTest = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const result = generateWallFromTemplate(template);
      setTestResult(result.grid);
    } catch (e) {
      alert('Constraints JSON 格式错误: ' + e.message);
    }
  };

  // Export as JSON
  const handleExport = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const json = JSON.stringify(template, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id || 'template'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Constraints JSON 格式错误: ' + e.message);
    }
  };

  // Save to localStorage
  const handleSave = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const saved = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
      const idx = saved.findIndex(t => t.id === id);
      if (idx >= 0) saved[idx] = template;
      else saved.push(template);
      localStorage.setItem('levelTemplates', JSON.stringify(saved));
      alert('已保存到 localStorage');
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
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
        />

        {/* Center: Grid */}
        <div className="flex flex-col gap-4">
          <GridPainter
            grid={grid}
            onGridChange={setGrid}
            activeBrush={activeBrush}
            brushExtras={brushExtras}
          />
          <div className="flex gap-2">
            <button onClick={handleClear} className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600">清空</button>
            <button onClick={handleTest} className="px-3 py-1.5 bg-blue-700 rounded text-sm hover:bg-blue-600">测试生成</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-green-700 rounded text-sm hover:bg-green-600">保存</button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-purple-700 rounded text-sm hover:bg-purple-600">导出 JSON</button>
          </div>
        </div>

        {/* Right: Metadata + Test result */}
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
          <div>
            <label className="text-xs text-gray-400">约束 (JSON)</label>
            <textarea value={constraints} onChange={e => setConstraints(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm font-mono h-24"
              placeholder='{ "maxDoomInBlank": 0 }' />
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

- [ ] **Step 2: Create a minimal placeholder for LevelManager so routing doesn't break**

```jsx
// src/components/editor/LevelManager.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function LevelManager() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <Link to="/editor" className="text-blue-400 hover:underline text-sm">← 编辑器</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">关卡管理（待实现）</h1>
    </div>
  );
}
```

- [ ] **Step 3: Verify the editor works end-to-end**

Run: `npm run dev`

Navigate to `/editor`. Verify:
- Grid renders as 5x5 clickable cells
- Palette shows all cell types
- Clicking a palette item then clicking grid cells paints them
- Right-click erases a cell
- Setting multiplier > 1 and painting a sticker cell shows the multiplier badge
- "Test Generate" produces a preview with fixed cells in place and blanks filled
- "Export JSON" downloads a valid template file
- "Save" writes to localStorage
- Navigation links to game and level manager work

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/LevelEditor.jsx src/components/editor/LevelManager.jsx
git commit -m "feat: LevelEditor page — visual grid painter with palette, test, save, export"
```

---

## Task 9: Level Manager Page

**Files:**
- Modify: `src/components/editor/LevelManager.jsx`

- [ ] **Step 1: Build the full level manager**

Shows all templates (from `LEVEL_TEMPLATES` constant + localStorage) as preview cards. Each card shows: thumbnail, name, description, and schedule controls (weight slider, enabled toggle, minExpedition). Changes to schedule are saved to localStorage.

```jsx
// src/components/editor/LevelManager.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LEVEL_TEMPLATES, TEMPLATE_SCHEDULE, PROCEDURAL_WEIGHT } from '../../data/levelTemplates';
import TemplatePreview from './TemplatePreview';

function loadCustomTemplates() {
  try { return JSON.parse(localStorage.getItem('levelTemplates') || '[]'); }
  catch { return []; }
}

function loadScheduleOverrides() {
  try { return JSON.parse(localStorage.getItem('templateSchedule') || '{}'); }
  catch { return {}; }
}

function saveScheduleOverrides(overrides) {
  localStorage.setItem('templateSchedule', JSON.stringify(overrides));
}

export default function LevelManager() {
  const customTemplates = loadCustomTemplates();
  const allTemplates = [
    ...LEVEL_TEMPLATES.map(t => ({ ...t, source: 'builtin' })),
    ...customTemplates.map(t => ({ ...t, source: 'custom' })),
  ];

  const [overrides, setOverrides] = useState(loadScheduleOverrides);
  const [proceduralWeight, setProceduralWeight] = useState(
    () => overrides._proceduralWeight ?? PROCEDURAL_WEIGHT
  );

  const getSchedule = (templateId) => {
    const base = TEMPLATE_SCHEDULE.find(s => s.templateId === templateId) ||
      { templateId, weight: 10, enabled: false, minExpedition: 1 };
    return { ...base, ...overrides[templateId] };
  };

  const updateSchedule = (templateId, patch) => {
    const newOverrides = { ...overrides, [templateId]: { ...overrides[templateId], ...patch } };
    setOverrides(newOverrides);
    saveScheduleOverrides(newOverrides);
  };

  const updateProceduralWeight = (val) => {
    setProceduralWeight(val);
    const newOverrides = { ...overrides, _proceduralWeight: val };
    setOverrides(newOverrides);
    saveScheduleOverrides(newOverrides);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex gap-4 mb-6 text-sm">
        <Link to="/" className="text-blue-400 hover:underline">← 返回游戏</Link>
        <Link to="/editor" className="text-blue-400 hover:underline">新建关卡</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">关卡管理</h1>

      {/* Procedural weight */}
      <div className="mb-6 p-4 bg-gray-900/60 rounded-lg flex items-center gap-4">
        <span className="text-sm">纯随机墙权重:</span>
        <input type="range" min={0} max={100} value={proceduralWeight}
          onChange={e => updateProceduralWeight(Number(e.target.value))}
          className="w-48" />
        <span className="text-sm font-mono w-8">{proceduralWeight}</span>
        <span className="text-xs text-gray-500">（越高，模板墙出现概率越低）</span>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTemplates.map(template => {
          const schedule = getSchedule(template.id);
          return (
            <div key={template.id}
              className={`p-4 rounded-lg border transition-all ${
                schedule.enabled
                  ? 'bg-gray-900/80 border-gray-600'
                  : 'bg-gray-900/30 border-gray-800 opacity-60'
              }`}
            >
              <div className="flex gap-3 mb-3">
                <TemplatePreview grid={template.grid} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{template.name || template.id}</span>
                    {template.source === 'custom' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-800 rounded">自定义</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                </div>
              </div>

              {/* Schedule controls */}
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={schedule.enabled}
                    onChange={e => updateSchedule(template.id, { enabled: e.target.checked })} />
                  <span>启用</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">权重</span>
                  <input type="range" min={0} max={50} value={schedule.weight}
                    onChange={e => updateSchedule(template.id, { weight: Number(e.target.value) })}
                    className="flex-1" />
                  <span className="font-mono text-xs w-6">{schedule.weight}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">最低探险</span>
                  <select value={schedule.minExpedition}
                    onChange={e => updateSchedule(template.id, { minExpedition: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-0.5">
                    <option value={1}>第1次</option>
                    <option value={2}>第2次</option>
                    <option value={3}>第3次</option>
                  </select>
                </div>
              </div>

              {/* Edit link */}
              <Link to={`/editor/${template.id}`}
                className="block mt-3 text-xs text-blue-400 hover:underline">
                编辑模板 →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `pickTemplate` in `levelTemplates.js` to respect localStorage overrides**

Add at the end of the `pickTemplate` function, before the weighted roll, load overrides from localStorage:

```js
export function pickTemplate(expeditionNumber) {
  // Load schedule overrides from localStorage (editor saves here)
  let schedule = [...TEMPLATE_SCHEDULE];
  let proceduralWt = PROCEDURAL_WEIGHT;
  try {
    const overrides = JSON.parse(localStorage.getItem('templateSchedule') || '{}');
    if (overrides._proceduralWeight !== undefined) proceduralWt = overrides._proceduralWeight;
    schedule = schedule.map(s => ({ ...s, ...overrides[s.templateId] }));

    // Also include custom templates from localStorage
    const customTemplates = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    for (const ct of customTemplates) {
      if (!schedule.find(s => s.templateId === ct.id)) {
        const override = overrides[ct.id] || {};
        schedule.push({ templateId: ct.id, weight: 10, enabled: false, minExpedition: 1, ...override });
      }
    }
  } catch { /* ignore parse errors */ }

  const eligible = schedule.filter(
    s => s.enabled && expeditionNumber >= (s.minExpedition || 1)
  );

  // Look up templates from both built-in and localStorage
  const allTemplates = [...LEVEL_TEMPLATES];
  try {
    const custom = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    allTemplates.push(...custom);
  } catch { /* ignore */ }

  const entries = eligible.map(s => {
    const template = allTemplates.find(t => t.id === s.templateId);
    return template ? { template, weight: s.weight } : null;
  }).filter(Boolean);

  const totalTemplateWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const totalWeight = totalTemplateWeight + proceduralWt;

  if (totalWeight <= 0) return null;

  const roll = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of entries) {
    acc += entry.weight;
    if (roll < acc) return entry.template;
  }

  return null;
}
```

- [ ] **Step 3: Verify the manager works**

Run: `npm run dev`

Navigate to `/levels`. Verify:
- All 3 built-in templates show with thumbnail previews
- Toggle enabled/disabled works
- Weight slider changes value
- Min expedition dropdown works
- Changes persist after page refresh (localStorage)
- "Edit template" link goes to `/editor/{id}` and loads the template
- Procedural weight slider works
- Play the game — verify that template walls appear when templates are enabled and procedural weight is low

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/LevelManager.jsx src/data/levelTemplates.js
git commit -m "feat: LevelManager — browse templates, configure schedule weights, localStorage persistence"
```

---

## Task 10: Final Polish & Verification

- [ ] **Step 1: Add editor link to game UI**

In `src/GameCore.jsx`, add a small dev-mode link to the editor (near the existing debug panel toggle or language toggle):

```jsx
import { Link } from 'react-router-dom';

// Inside the render, near the language toggle button:
<Link to="/editor" className="text-xs text-gray-500 hover:text-gray-300 ml-2">编辑器</Link>
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Fix any lint errors.

- [ ] **Step 3: Full end-to-end verification**

Run: `npm run dev`

Test the complete flow:
1. Open `/editor`, create a new template (paint some cells, set multiplier, fill metadata)
2. Save to localStorage
3. Open `/levels`, verify the new template appears
4. Enable it, set weight to 50, set procedural weight to 10
5. Go back to game, start playing
6. Verify template walls appear among candidates with correct fixed cells
7. Draw from a template wall — verify all cell types work (doom, bombs, stickers with multiplier, etc.)
8. Verify non-template (procedural) walls still work normally

- [ ] **Step 4: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: add editor link to game UI"
```

- [ ] **Step 5: Run production build**

Run: `npm run build`

Verify no build errors.
