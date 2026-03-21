# Matrix Selection System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pool-based draw system with a 5x5 resource matrix + shape placement system as specified in game_rules.md.

**Architecture:** The matrix system replaces `activePools` + `PoolCard` with a `matrix` state (5x5 grid of resource points + anchors) and `availableShapes` (3 randomly chosen shapes). Players select a shape, place it on the grid (must cover an anchor), and draw from fully-covered resource points. All other systems (inventory, orders, skills, tools, evacuation) remain unchanged.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Lucide React (existing stack)

**No test suite** exists in this project — steps omit TDD.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/matrixConfig.js` | Create | Shape definitions, matrix generation constants |
| `src/utils/matrixHelpers.js` | Create | Matrix generation, shape geometry, coverage detection, anchor validation |
| `src/hooks/useGameLogic.js` | Modify | Replace pool state/logic with matrix state/logic, update draw flow |
| `src/components/game/ResourceMatrix.jsx` | Create | 5x5 interactive grid UI with shape preview, anchor display, resource points |
| `src/components/game/ShapeSelector.jsx` | Create | Shape picker (3 choices) with cost display and orientation toggle |
| `src/GameCore.jsx` | Modify | Replace PoolCard section with ResourceMatrix + ShapeSelector |
| `src/utils/translations.js` | Modify | Add Chinese/English strings for matrix UI |

Files NOT modified: `PoolCard.jsx` (kept but unused — can be removed later), `OrderCard.jsx`, `InventorySlot.jsx`, `helpers.js` (rollRarity, generateOrder etc. stay as-is).

---

### Task 1: Matrix Config Data

**Files:**
- Create: `src/data/matrixConfig.js`

- [ ] **Step 1: Create matrixConfig.js with shape definitions and matrix constants**

```js
// Shape definitions: each shape is an array of [row, col] offsets relative to placement origin
// Linear shapes have horizontal and vertical orientations

export const SHAPE_DEFINITIONS = [
  {
    id: 'short_line',
    name: '短线',
    cells: { h: [[0,0],[0,1]], v: [[0,0],[1,0]] },
    size: 2,
    cost: 1,
    hasOrientation: true,
    icon: '▬',
  },
  {
    id: 'long_line',
    name: '长线',
    cells: { h: [[0,0],[0,1],[0,2]], v: [[0,0],[1,0],[2,0]] },
    size: 3,
    cost: 2,
    hasOrientation: true,
    icon: '━',
  },
  {
    id: 'square',
    name: '方块',
    cells: { default: [[0,0],[0,1],[1,0],[1,1]] },
    size: 4,
    cost: 2,
    hasOrientation: false,
    icon: '⊞',
  },
  {
    id: 'long_rod',
    name: '长杆',
    cells: { h: [[0,0],[0,1],[0,2],[0,3]], v: [[0,0],[1,0],[2,0],[3,0]] },
    size: 4,
    cost: 3,
    hasOrientation: true,
    icon: '┃',
  },
  {
    id: 'cross',
    name: '十字',
    cells: { default: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
    size: 5,
    cost: 3,
    hasOrientation: false,
    icon: '✚',
  },
];

export const MATRIX_CONFIG = {
  gridSize: 5,
  // Resource point count ranges
  singleCellCount: [6, 7],   // 6-7 single-cell resource points
  doubleCellCount: [2, 3],   // 2-3 double-cell resource points
  tripleCellCount: [1, 1],   // exactly 1 triple-cell resource point
  anchorCount: 3,
  shapesPerRound: 3,
  totalShapes: 5,
};
```

- [ ] **Step 2: Commit**

---

### Task 2: Matrix Helper Functions

**Files:**
- Create: `src/utils/matrixHelpers.js`

- [ ] **Step 1: Implement matrix generation logic**

Core functions needed:
1. `generateResourceMatrix(config, pools, stageConfig)` — Creates a 5x5 grid with resource points and anchors
2. `getShapeCells(shapeDef, row, col, orientation)` — Returns absolute cell positions for a shape placement
3. `isValidPlacement(shapeCells, gridSize, anchors)` — Checks bounds and anchor constraint
4. `getCoveredResourcePoints(shapeCells, resourcePoints)` — Returns resource points fully covered by shape
5. `selectAvailableShapes()` — Randomly picks 3 shapes from 5

Key logic for `generateResourceMatrix`:
- Create a 5x5 empty grid
- Place multi-cell resource points first (triple, then double), ensuring they fit and don't overlap
- Place single-cell resource points in remaining empty cells
- Each resource point gets a random item (name from pools) and random rarity (from stage weights)
- Place 3 anchors in non-resource cells if possible, otherwise on single-cell resource cells, spread apart
- Return `{ grid, resourcePoints, anchors }`

Resource point structure:
```js
{
  id: string,
  cells: [[row, col], ...],  // cells this resource point occupies
  item: { name, icon, poolId, poolName },
  rarity: rarityObject,
  size: 1|2|3
}
```

- [ ] **Step 2: Commit**

---

### Task 3: Integrate Matrix into useGameLogic

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Add matrix state variables**

Replace `activePools` with:
```js
const [matrix, setMatrix] = useState(null);            // { grid, resourcePoints, anchors }
const [availableShapes, setAvailableShapes] = useState([]);  // 3 shape defs
const [selectedShape, setSelectedShape] = useState(null);    // currently selected shape
const [shapeOrientation, setShapeOrientation] = useState('h'); // 'h' or 'v'
```

- [ ] **Step 2: Replace generateActivePools with generateMatrix**

Replace `generateActivePools()` and `refreshPools()` with:
```js
const refreshMatrix = (tick = false) => {
    setMatrix(generateResourceMatrix(config, allNormalItems, currentStageConfig));
    setAvailableShapes(selectAvailableShapes());
    setSelectedShape(null);
    setShapeOrientation('h');
    // entropy tick logic stays the same
    if (tick && currentStageConfig.mechanics.entropy) {
        setInventory(prev => prev.map(item => {
            if (!item || item.decay === undefined) return item;
            return { ...item, decay: item.decay - 1 };
        }));
    }
};
```

Update `useEffect` that calls `refreshPools(false)` → `refreshMatrix(false)`.
Update all `refreshPools(true)` calls → `refreshMatrix(true)`.

- [ ] **Step 3: Replace handleDraw with matrix-based draw**

New function `handleMatrixDraw(row, col)`:
1. Check guards (pendingItem, isSubmitMode, etc.)
2. If no `selectedShape`, show toast "请先选择形状"
3. Get shape cells via `getShapeCells(selectedShape, row, col, shapeOrientation)`
4. Validate placement (bounds + anchor)
5. Check gold >= selectedShape.cost
6. Deduct gold
7. Get covered resource points
8. If no resource points covered, refund gold + toast
9. Random pick 1 resource point from covered set → create item
10. Apply skill effects (enhance, consolation prize tracking, etc.)
11. Handle incoming items (same as before)
12. refreshMatrix(true)

Also add shape selection actions:
- `handleSelectShape(shape)` — sets selectedShape
- `handleToggleOrientation()` — flips between 'h' and 'v'

- [ ] **Step 4: Update state/actions exports**

Add matrix-related state and actions to the return object. Remove pool-related exports that are no longer needed (activePools, handleDraw for pools, handlePoolHover/Leave).

- [ ] **Step 5: Clean up affix-related draw code**

The old handleDraw had special handling for affixes (trade_in, precise, targeted, hardened, fragmented, volatile, purified). These are replaced by the matrix system. Remove affix-specific draw branches. Keep `rollRarity` in helpers.js (still used for resource point generation) but remove affix parameters from the matrix draw path.

- [ ] **Step 6: Commit**

---

### Task 4: ResourceMatrix Component

**Files:**
- Create: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: Create the 5x5 grid component**

Props:
```
matrix          — { grid, resourcePoints, anchors }
selectedShape   — currently selected shape definition (or null)
orientation     — 'h' | 'v'
onCellClick     — (row, col) => void
disabled        — boolean
gold            — current gold (for affordability check)
```

Renders a 5x5 CSS grid. Each cell shows:
- Empty cell: subtle background
- Resource point (single): item icon + rarity border color
- Resource point (multi-cell): spans visually across cells with connecting visual, shows item icon on first cell
- Anchor: distinct marker (e.g. pin/anchor icon or diamond shape)

Hover behavior:
- When a shape is selected, hovering over a cell shows the shape preview (highlighted cells)
- Valid placements: green highlight. Invalid: red highlight
- Covered resource points get extra emphasis

- [ ] **Step 2: Commit**

---

### Task 5: ShapeSelector Component

**Files:**
- Create: `src/components/game/ShapeSelector.jsx`

- [ ] **Step 1: Create shape picker UI**

Props:
```
shapes              — array of 3 shape definitions
selectedShape       — currently selected shape (or null)
orientation         — 'h' | 'v'
onSelectShape       — (shape) => void
onToggleOrientation — () => void
gold                — current gold
disabled            — boolean
```

Renders 3 shape buttons showing:
- Shape name and icon
- Cost in gold
- Visual preview of the shape pattern (small grid)
- Selected state highlight
- Affordability state (grayed out if can't afford)

When a shape with orientation is selected, show an orientation toggle button (rotate icon).

- [ ] **Step 2: Commit**

---

### Task 6: Integrate into GameCore

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Replace pool rendering with matrix + shape selector**

In the RIGHT COLUMN section (currently renders `PoolCard` list):
1. Remove `activePools.map(pool => <PoolCard ...>)` block
2. Replace with:
   - `<ShapeSelector>` at the top (shape choices)
   - `<ResourceMatrix>` below (the 5x5 grid)
3. Remove pool-related imports and props destructuring
4. Wire up new state/actions from useGameLogic

- [ ] **Step 2: Clean up selection overlay**

The old selection overlay handled "precise" (2-choose-1) and "targeted" (pick item type) modes. These are affix-specific and no longer apply. Remove the `selectionMode` overlay for precise/targeted. Keep trade_in selection mode if desired, or remove it too (trade_in was an affix).

- [ ] **Step 3: Remove pool hover highlighting from OrderCard**

The old system highlighted order requirements when hovering over pool cards. This can be simplified or removed for the matrix prototype. Remove `hoveredPoolId`, `hoveredPoolItemNames` props from OrderCard calls (set to null/empty).

- [ ] **Step 4: Commit**

---

### Task 7: Translations

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add matrix-related translation strings**

Add entries for:
- Shape names (短线, 长线, 方块, 长杆, 十字)
- UI labels: "选择形状", "放置形状", "资源矩阵", "锚点", "旋转方向", "金币不足", "请先选择形状", "无资源点被覆盖"
- Shape cost display

- [ ] **Step 2: Commit**

---

### Task 8: Verify & Polish

- [ ] **Step 1: Run dev server and test basic flow**

```bash
npm run dev
```

Manual test checklist:
- Matrix generates with resource points and anchors on game start
- 3 shapes appear in selector
- Clicking a shape selects it, clicking again deselects
- Orientation toggle works for linear shapes
- Hovering grid shows shape preview
- Clicking valid placement draws an item
- Matrix refreshes after draw
- Gold deducts correctly per shape cost
- Items go to inventory correctly
- Orders, submit, recycle, evacuation all still work

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**
