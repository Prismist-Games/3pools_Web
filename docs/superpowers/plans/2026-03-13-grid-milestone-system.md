# Grid Milestone System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat order system (3 normal orders + 2 evacuation orders) with a grid-based "project milestone" system where cells are tasks arranged in irregular shapes with overlapping task groups.

**Architecture:** New procedural generation system creates irregular grid milestones. Game state replaces `orders`/`emergencyOrders` arrays with a single `milestone` object containing cells and tasks. New UI renders the grid with task overlays. Cell filling replaces order submission. Evacuation is triggered by completing tasks that cover evacuation-marked cells.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, JavaScript (ESM/.jsx). No test framework — verification via dev server (`npm run dev`).

**Note:** This project has no test suite. All verification steps use manual browser testing via the Vite dev server at `http://localhost:5173/3pools_Web/`.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/data/gridConstants.js` | Grid generation parameters (canvas size, cell count range, task count, overlap rules) |
| `src/utils/gridGenerator.js` | Pure functions: `generateMilestone`, `generateMilestoneShape`, `generateTasks`, `assignItemsToCells` |
| `src/components/game/MilestoneGrid.jsx` | Main grid component: renders cells on a CSS grid canvas, shows task overlays and evacuation markers |
| `src/components/game/GridCell.jsx` | Single cell component: shows item requirement, reward, fill state, task membership indicators |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useGameLogic.js` | Replace order/emergency state with milestone state. Replace order submission with cell filling. Replace evacuation order flow with evacuation cell trigger. Remove order refresh, candidates, slot assignments. |
| `src/GameCore.jsx` | Replace order panel (lines 350-547) with MilestoneGrid. Update submission/evacuation buttons. Update pool relevance calculation. |
| `src/utils/helpers.js` | Remove `generateOrder` function and order-related helpers. |
| `src/data/constants.js` | No structural changes needed — grid constants go in new file. May remove unused order config later. |
| `src/utils/translations.js` | Add grid-related i18n strings, keep old ones for now. |

### Files to Remove (Cleanup)
| File | Reason |
|------|--------|
| `src/components/game/OrderCard.jsx` | Fully replaced by MilestoneGrid/GridCell |

---

## Chunk 1: Data Model & Generation Algorithm

### Task 1: Grid Constants

**Files:**
- Create: `src/data/gridConstants.js`

- [ ] **Step 1: Create grid constants file**

```js
// src/data/gridConstants.js

// Milestone shape generation
export const GRID_CONFIG = {
  canvasSize: 5,          // 5x5 canvas for cell placement
  cellCount: { min: 8, max: 12 },
  taskCount: { min: 3, max: 5 },
  taskSize: { min: 2, max: 4 },
  evacuationCellCount: 1,
};

// Cell reward values (score) — same as current SCORE_PROGRESS_CONFIG weights
export const CELL_SCORE_WEIGHTS = {
  common: 2,
  uncommon: 2.5,
  rare: 4,
  epic: 8,
  legendary: 16,
  mythic: 32,
};

// Gold reward per task completion
export const TASK_GOLD_REWARD = 3;

// Quality weights for cell requirements (same as current orderRarityWeights)
export const CELL_RARITY_WEIGHTS = {
  common: 0.40,
  uncommon: 0.35,
  rare: 0.20,
  epic: 0.05,
  legendary: 0,
  mythic: 0,
};

// Task overlay colors for visual distinction
export const TASK_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
];
```

- [ ] **Step 2: Verify file loads without errors**

Run: `npm run dev` — check browser console for import errors.

---

### Task 2: Milestone Generation Algorithm

**Files:**
- Create: `src/utils/gridGenerator.js`

- [ ] **Step 1: Implement shape generation**

The core algorithm: grow an irregular connected region on a grid canvas by random flood-fill.

```js
// src/utils/gridGenerator.js
import { GRID_CONFIG, CELL_SCORE_WEIGHTS, CELL_RARITY_WEIGHTS } from '../data/gridConstants.js';

/**
 * Get orthogonal neighbors of a cell on the canvas
 */
function getNeighbors(row, col, canvasSize) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs
    .map(([dr,dc]) => [row+dr, col+dc])
    .filter(([r,c]) => r >= 0 && r < canvasSize && c >= 0 && c < canvasSize);
}

/**
 * Generate an irregular connected region of cells on the canvas.
 * Uses random flood-fill growth from a starting cell.
 * Returns array of {row, col} objects.
 */
export function generateMilestoneShape(canvasSize, targetCellCount) {
  const startRow = Math.floor(Math.random() * canvasSize);
  const startCol = Math.floor(Math.random() * canvasSize);

  const shape = new Set();
  const shapeKey = (r,c) => `${r},${c}`;
  shape.add(shapeKey(startRow, startCol));

  const candidates = new Set();
  for (const [nr, nc] of getNeighbors(startRow, startCol, canvasSize)) {
    candidates.add(shapeKey(nr, nc));
  }

  while (shape.size < targetCellCount && candidates.size > 0) {
    const candidateArr = [...candidates];
    const pick = candidateArr[Math.floor(Math.random() * candidateArr.length)];
    candidates.delete(pick);
    shape.add(pick);

    const [pr, pc] = pick.split(',').map(Number);
    for (const [nr, nc] of getNeighbors(pr, pc, canvasSize)) {
      const nk = shapeKey(nr, nc);
      if (!shape.has(nk)) {
        candidates.add(nk);
      }
    }
  }

  return [...shape].map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });
}
```

- [ ] **Step 2: Implement task generation within a milestone**

Tasks are connected subsets of cells that overlap with each other. All cells must be covered.

```js
/**
 * Generate overlapping tasks within a milestone shape.
 * Each task is a connected group of cells.
 * Tasks overlap by starting new tasks from cells already in existing tasks.
 * Uncovered cells are assigned to adjacent tasks.
 */
export function generateTasks(cells, numTasks, minSize, maxSize) {
  const cellMap = new Map(); // "row,col" -> cell index
  cells.forEach((cell, idx) => {
    cellMap.set(`${cell.row},${cell.col}`, idx);
  });

  const tasks = [];
  const coveredCells = new Set();

  for (let t = 0; t < numTasks; t++) {
    let startIdx;
    if (t === 0) {
      // First task: random cell
      startIdx = Math.floor(Math.random() * cells.length);
    } else {
      // Subsequent tasks: prefer starting from a cell already in a task (for overlap)
      const overlapCandidates = [...coveredCells];
      if (overlapCandidates.length > 0) {
        startIdx = overlapCandidates[Math.floor(Math.random() * overlapCandidates.length)];
      } else {
        startIdx = Math.floor(Math.random() * cells.length);
      }
    }

    const taskSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
    const taskCellIndices = new Set([startIdx]);
    const growCandidates = new Set();

    // Add neighbors of start cell as growth candidates
    const startCell = cells[startIdx];
    for (const [nr, nc] of getNeighbors(startCell.row, startCell.col, GRID_CONFIG.canvasSize)) {
      const nIdx = cellMap.get(`${nr},${nc}`);
      if (nIdx !== undefined && !taskCellIndices.has(nIdx)) {
        growCandidates.add(nIdx);
      }
    }

    while (taskCellIndices.size < taskSize && growCandidates.size > 0) {
      const candidateArr = [...growCandidates];
      const pick = candidateArr[Math.floor(Math.random() * candidateArr.length)];
      growCandidates.delete(pick);
      taskCellIndices.add(pick);

      const pickedCell = cells[pick];
      for (const [nr, nc] of getNeighbors(pickedCell.row, pickedCell.col, GRID_CONFIG.canvasSize)) {
        const nIdx = cellMap.get(`${nr},${nc}`);
        if (nIdx !== undefined && !taskCellIndices.has(nIdx)) {
          growCandidates.add(nIdx);
        }
      }
    }

    tasks.push({ cellIndices: [...taskCellIndices] });
    taskCellIndices.forEach(idx => coveredCells.add(idx));
  }

  // Assign uncovered cells to the nearest adjacent task
  const uncovered = cells.map((_, idx) => idx).filter(idx => !coveredCells.has(idx));
  for (const idx of uncovered) {
    const cell = cells[idx];
    // Find a task that has an adjacent cell
    let assigned = false;
    for (const [nr, nc] of getNeighbors(cell.row, cell.col, GRID_CONFIG.canvasSize)) {
      const nIdx = cellMap.get(`${nr},${nc}`);
      if (nIdx !== undefined) {
        for (const task of tasks) {
          if (task.cellIndices.includes(nIdx)) {
            task.cellIndices.push(idx);
            coveredCells.add(idx);
            assigned = true;
            break;
          }
        }
      }
      if (assigned) break;
    }
    // Fallback: add to random task
    if (!assigned) {
      tasks[Math.floor(Math.random() * tasks.length)].cellIndices.push(idx);
      coveredCells.add(idx);
    }
  }

  return tasks.map((task, idx) => ({
    id: `task-${idx}`,
    cellIndices: [...new Set(task.cellIndices)], // deduplicate
    isCompleted: false,
  }));
}
```

- [ ] **Step 3: Implement item and quality assignment**

```js
/**
 * Roll a rarity for a cell requirement using weighted random.
 */
function rollCellRarity(rarities, weights) {
  const entries = rarities.filter(r => weights[r.id] > 0);
  const totalWeight = entries.reduce((sum, r) => sum + weights[r.id], 0);
  let roll = Math.random() * totalWeight;
  for (const r of entries) {
    roll -= weights[r.id];
    if (roll <= 0) return r;
  }
  return entries[entries.length - 1];
}

/**
 * Assign unique items and quality requirements to milestone cells.
 * Ensures: unique names, at least 3 pools, no task is single-pool.
 */
export function assignItemsToCells(cells, tasks, allItems, rarities) {
  const poolGroups = {};
  allItems.forEach(item => {
    if (!poolGroups[item.poolId]) poolGroups[item.poolId] = [];
    poolGroups[item.poolId].push(item);
  });
  const poolIds = Object.keys(poolGroups);

  // Select cells.length unique items from at least 3 pools
  let selectedItems;
  let attempts = 0;
  do {
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    selectedItems = shuffled.slice(0, cells.length);
    const pools = new Set(selectedItems.map(i => i.poolId));
    attempts++;
    if (attempts > 100) break; // safety
  } while (new Set(selectedItems.map(i => i.poolId)).size < Math.min(3, poolIds.length));

  return cells.map((cell, idx) => {
    const item = selectedItems[idx];
    const rarity = rollCellRarity(rarities, CELL_RARITY_WEIGHTS);
    return {
      ...cell,
      id: `cell-${idx}`,
      itemName: item.name,
      itemIcon: item.icon,
      poolId: item.poolId,
      poolName: item.poolName,
      requiredRarity: rarity,
      scoreReward: CELL_SCORE_WEIGHTS[rarity.id],
      hasEvacuation: false,
      filledItem: null,
    };
  });
}
```

- [ ] **Step 4: Implement the main generateMilestone orchestrator**

```js
/**
 * Generate a complete milestone: shape, tasks, items, evacuation.
 * @param {Array} allItems - all available items from all pools
 * @param {Array} rarities - rarity config array
 * @param {number} difficulty - affects quality distribution (future use)
 * @returns {Object} milestone object
 */
export function generateMilestone(allItems, rarities, difficulty = 1) {
  const { canvasSize, cellCount, taskCount, taskSize, evacuationCellCount } = GRID_CONFIG;

  // 1. Generate irregular shape
  const targetCells = cellCount.min + Math.floor(Math.random() * (cellCount.max - cellCount.min + 1));
  const shape = generateMilestoneShape(canvasSize, targetCells);

  // 2. Generate tasks
  const numTasks = taskCount.min + Math.floor(Math.random() * (taskCount.max - taskCount.min + 1));
  const tasks = generateTasks(shape, numTasks, taskSize.min, taskSize.max);

  // 3. Assign items and qualities
  const cells = assignItemsToCells(shape, tasks, allItems, rarities);

  // 4. Place evacuation marker(s)
  const evacuationIndices = [];
  const availableIndices = cells.map((_, i) => i);
  for (let e = 0; e < evacuationCellCount; e++) {
    const pick = Math.floor(Math.random() * availableIndices.length);
    const idx = availableIndices.splice(pick, 1)[0];
    cells[idx].hasEvacuation = true;
    evacuationIndices.push(idx);
  }

  // 5. Compute grid bounds for rendering
  const rows = Math.max(...cells.map(c => c.row)) + 1;
  const cols = Math.max(...cells.map(c => c.col)) + 1;

  return {
    cells,
    tasks,
    gridBounds: { rows, cols },
    evacuationIndices,
    isComplete: false,
  };
}
```

- [ ] **Step 5: Verify generation works**

Temporarily add a `console.log(generateMilestone(...))` call in `useGameLogic.js` or a test page. Check browser console for a valid milestone object with:
- 8-12 cells with unique item names
- 3-5 tasks with overlapping cell indices
- 1 evacuation cell
- All cells covered by at least one task

Remove the temporary log after verification.

- [ ] **Step 6: Commit**

```bash
git add src/data/gridConstants.js src/utils/gridGenerator.js
git commit -m "feat: add grid milestone generation algorithm

Procedural generation of irregular connected shapes, overlapping tasks,
item/quality assignment, and evacuation cell placement."
```

---

## Chunk 2: Game State Management

### Task 3: Replace Order State with Milestone State

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the largest task. It replaces the order system in the game's single source of truth.

**Strategy:** Remove order-related state and functions. Add milestone state and new handlers. Keep changes focused — UI integration is a separate task.

- [ ] **Step 1: Add milestone state and initialization**

At the top of `useGameLogic`, replace order-related state declarations with:

```js
// REMOVE these state declarations:
// - orders, setOrders
// - emergencyOrders, setEmergencyOrders
// - orderRefreshCount, setOrderRefreshCount
// - orderCandidates, setOrderCandidates
// - orderCandidateQueue, setOrderCandidateQueue
// - orderSlotAssignments, setOrderSlotAssignments

// ADD:
import { generateMilestone } from '../utils/gridGenerator.js';
import { TASK_GOLD_REWARD, CELL_SCORE_WEIGHTS } from '../data/gridConstants.js';

const [milestone, setMilestone] = useState(null);
const [milestoneNumber, setMilestoneNumber] = useState(1); // tracks progression
```

- [ ] **Step 2: Add milestone initialization useEffect**

Replace the order initialization `useEffect` (currently lines ~93-121) with:

```js
// Initialize milestone when null (game start or after evacuation)
useEffect(() => {
  if (!milestone && allNormalItems.length > 0) {
    const newMilestone = generateMilestone(
      allNormalItems,
      config.rarities,
      milestoneNumber
    );
    setMilestone(newMilestone);
  }
}, [milestone, allNormalItems, config.rarities, milestoneNumber]);
```

- [ ] **Step 3: Add cell matching memo**

Replace `satisfiableOrders` and related memos with a cell matching system:

```js
// For each unfilled cell, check if inventory has a matching item
const cellMatches = useMemo(() => {
  if (!milestone) return {};
  const matches = {}; // cellId -> array of inventory indices that can fill it
  milestone.cells.forEach((cell) => {
    if (cell.filledItem) return; // already filled
    const matchingItems = inventory
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) =>
        item &&
        item.item_data.name === cell.itemName &&
        config.rarities.findIndex(r => r.id === item.rarity.id) >=
        config.rarities.findIndex(r => r.id === cell.requiredRarity.id)
      );
    if (matchingItems.length > 0) {
      matches[cell.id] = matchingItems.map(m => m.idx);
    }
  });
  return matches;
}, [milestone, inventory, config.rarities]);

// Which cells can currently be filled
const fillableCellIds = useMemo(() => Object.keys(cellMatches), [cellMatches]);
```

- [ ] **Step 4: Add cell fill handler**

```js
const handleFillCell = useCallback((cellId) => {
  if (!milestone) return;

  const cell = milestone.cells.find(c => c.id === cellId);
  if (!cell || cell.filledItem) return;

  const matchingIndices = cellMatches[cellId];
  if (!matchingIndices || matchingIndices.length === 0) return;

  // Use the first matching item (lowest index)
  const invIdx = matchingIndices[0];
  const item = inventory[invIdx];

  // Fill the cell
  const updatedCells = milestone.cells.map(c =>
    c.id === cellId ? { ...c, filledItem: item } : c
  );

  // Check task completions
  const updatedTasks = milestone.tasks.map(task => {
    if (task.isCompleted) return task;
    const allFilled = task.cellIndices.every(idx => updatedCells[idx].filledItem !== null);
    return allFilled ? { ...task, isCompleted: true } : task;
  });

  // Calculate rewards for newly completed tasks
  const newlyCompleted = updatedTasks.filter(
    (task, idx) => task.isCompleted && !milestone.tasks[idx].isCompleted
  );

  let scoreGain = 0;
  let goldGain = 0;
  let triggerEvacuation = false;

  for (const task of newlyCompleted) {
    // Score = sum of covered cells' score rewards
    const taskScore = task.cellIndices.reduce(
      (sum, idx) => sum + updatedCells[idx].scoreReward, 0
    );
    scoreGain += taskScore;
    goldGain += TASK_GOLD_REWARD;

    // Check if any covered cell has evacuation marker
    if (task.cellIndices.some(idx => updatedCells[idx].hasEvacuation)) {
      triggerEvacuation = true;
    }
  }

  // Remove consumed item from inventory
  const newInventory = [...inventory];
  newInventory[invIdx] = null;

  // Apply state updates
  setMilestone({
    ...milestone,
    cells: updatedCells,
    tasks: updatedTasks,
  });
  setInventory(newInventory);
  setScore(prev => prev + scoreGain);
  setGold(prev => prev + goldGain);

  // Show reward toast if any
  if (newlyCompleted.length > 0) {
    addToast(
      `任务完成！+${scoreGain} 积分 +${goldGain} 金币`,
      newlyCompleted.length > 1 ? 'legendary' : 'epic'
    );
  }

  // Handle evacuation
  if (triggerEvacuation) {
    // Delay slightly to let player see the completion
    setTimeout(() => {
      handleEvacuationTriggered();
    }, 800);
  }
}, [milestone, cellMatches, inventory, score, gold]);
```

- [ ] **Step 5: Add evacuation trigger handler**

Replace the old evacuation handlers with:

```js
const handleEvacuationTriggered = useCallback(() => {
  setModalContent({
    type: 'evacuation_triggered',
    title: '里程碑完成',
    message: '触发了撤离节点！',
    choices: [
      { label: '继续下一个里程碑', action: 'continue' },
      { label: '提取积分离开', action: 'extract' },
    ],
  });
}, []);

const handleEvacuationContinue = useCallback(() => {
  setGold(config.global?.initialGold || currentStageConfig.initialGold);
  setMilestoneNumber(prev => prev + 1);
  setMilestone(null); // triggers re-generation via useEffect
  setModalContent(null);
}, [config, currentStageConfig]);

const handleEvacuationExtract = useCallback(() => {
  setModalContent({
    type: 'victory',
    title: '提取成功',
    message: `最终积分: ${score}`,
  });
}, [score]);
```

- [ ] **Step 6: Update pool relevance calculation**

Replace the order-based pool relevance with grid-based:

```js
// Which pools have items needed by unfilled cells
const relevantPoolIds = useMemo(() => {
  if (!milestone) return new Set();
  return new Set(
    milestone.cells
      .filter(c => !c.filledItem)
      .map(c => c.poolId)
  );
}, [milestone]);
```

- [ ] **Step 7: Remove old order functions**

Remove these functions from useGameLogic:
- `handleOrderClick`
- `handleRefreshSingleOrder`
- `handleRefreshAllOrders`
- `handleSelectOrderCandidate`
- `handleConfirmSubmission` (the order-based version)
- `handleEvacuate`
- `handleConfirmEvacuation`
- `clearAssignmentsForOrders`

Remove these memos:
- `satisfiableOrders`
- `potentialSatisfiableOrders`
- `assignedItemUids`
- `phantomMarks`

Remove these from the returned `state` and `actions` objects, and add the new ones:

```js
// In the return statement, update state:
milestone,
milestoneNumber,
cellMatches,
fillableCellIds,

// Update actions:
handleFillCell,
handleEvacuationContinue,
handleEvacuationExtract,
```

- [ ] **Step 8: Verify state works**

Run `npm run dev`. The game will likely show a blank orders area (since UI isn't updated yet), but check console for:
- No errors on page load
- Milestone object generated (add temporary console.log if needed)
- Pools still render and are interactive

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: replace order state with milestone grid state

Add milestone generation, cell filling, task completion detection,
reward calculation, and evacuation trigger. Remove order-related
state and handlers."
```

---

## Chunk 3: UI Components

### Task 4: GridCell Component

**Files:**
- Create: `src/components/game/GridCell.jsx`

- [ ] **Step 1: Create GridCell component**

```jsx
// src/components/game/GridCell.jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TASK_COLORS } from '../../data/gridConstants';

const GridCell = React.memo(function GridCell({
  cell,
  taskMemberships,  // array of { taskIndex, isCompleted }
  isFillable,
  onClick,
}) {
  const { t } = useLanguage();

  const isFilled = cell.filledItem !== null;
  const allTasksComplete = taskMemberships.every(tm => tm.isCompleted);

  return (
    <div
      className={`
        relative w-16 h-16 rounded-lg border-2 cursor-pointer
        flex flex-col items-center justify-center gap-0.5
        transition-all duration-200
        ${isFilled
          ? allTasksComplete
            ? 'border-green-400 bg-green-900/30'
            : 'border-gray-500 bg-gray-700/50'
          : isFillable
            ? 'border-yellow-400 bg-yellow-900/30 hover:bg-yellow-900/50 animate-pulse'
            : 'border-gray-600 bg-gray-800/50'
        }
        ${cell.hasEvacuation ? 'ring-2 ring-red-500/50' : ''}
      `}
      onClick={() => !isFilled && isFillable && onClick(cell.id)}
      title={`${cell.itemName} (${cell.requiredRarity.name}+)`}
    >
      {/* Item icon and name */}
      <span className="text-lg leading-none">{isFilled ? cell.filledItem.item_data.icon : cell.itemIcon}</span>
      <span className="text-[10px] text-gray-300 truncate max-w-full px-1">
        {cell.itemName}
      </span>

      {/* Quality requirement badge */}
      <span
        className="text-[9px] px-1 rounded"
        style={{ color: cell.requiredRarity.color }}
      >
        {cell.requiredRarity.name}+
      </span>

      {/* Score reward */}
      <span className="absolute top-0.5 right-1 text-[9px] text-yellow-400">
        {cell.scoreReward}
      </span>

      {/* Evacuation marker */}
      {cell.hasEvacuation && (
        <span className="absolute top-0.5 left-1 text-[9px]">🚀</span>
      )}

      {/* Task membership indicators */}
      <div className="absolute bottom-0.5 left-1 flex gap-0.5">
        {taskMemberships.map((tm) => (
          <span
            key={tm.taskIndex}
            className={`w-2 h-2 rounded-full ${tm.isCompleted ? 'opacity-30' : ''}`}
            style={{ backgroundColor: TASK_COLORS[tm.taskIndex % TASK_COLORS.length] }}
          />
        ))}
      </div>

      {/* Filled overlay */}
      {isFilled && (
        <div className="absolute inset-0 bg-green-500/10 rounded-lg flex items-center justify-center">
          <span className="text-green-400 text-xs">✓</span>
        </div>
      )}
    </div>
  );
});

export default GridCell;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/GridCell.jsx
git commit -m "feat: add GridCell component for milestone grid"
```

---

### Task 5: MilestoneGrid Component

**Files:**
- Create: `src/components/game/MilestoneGrid.jsx`

- [ ] **Step 1: Create MilestoneGrid component**

```jsx
// src/components/game/MilestoneGrid.jsx
import React from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';
import { useLanguage } from '../../contexts/LanguageContext';

const MilestoneGrid = React.memo(function MilestoneGrid({
  milestone,
  fillableCellIds,
  onFillCell,
  milestoneNumber,
}) {
  const { t } = useLanguage();

  if (!milestone) return null;

  const { cells, tasks, gridBounds } = milestone;

  // Build a lookup: cellIndex -> [{taskIndex, isCompleted}]
  const cellTaskMap = {};
  cells.forEach((_, idx) => { cellTaskMap[idx] = []; });
  tasks.forEach((task, taskIdx) => {
    task.cellIndices.forEach(cellIdx => {
      if (cellTaskMap[cellIdx]) {
        cellTaskMap[cellIdx].push({
          taskIndex: taskIdx,
          isCompleted: task.isCompleted,
        });
      }
    });
  });

  // Build grid position lookup
  const cellGrid = {};
  cells.forEach((cell, idx) => {
    cellGrid[`${cell.row},${cell.col}`] = { cell, idx };
  });

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalTasks = tasks.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          里程碑 #{milestoneNumber}
        </h3>
        <span className="text-xs text-gray-400">
          任务: {completedTasks}/{totalTasks}
        </span>
      </div>

      {/* Task legend */}
      <div className="flex flex-wrap gap-2">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded
              ${task.isCompleted ? 'opacity-40 line-through' : ''}
            `}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: TASK_COLORS[idx % TASK_COLORS.length] }}
            />
            <span className="text-gray-300">
              {task.cellIndices.length}格
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5 w-fit"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 4rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 4rem)`,
        }}
      >
        {Array.from({ length: gridBounds.rows }).map((_, row) =>
          Array.from({ length: gridBounds.cols }).map((_, col) => {
            const entry = cellGrid[`${row},${col}`];
            if (!entry) {
              // Empty canvas position
              return <div key={`${row},${col}`} className="w-16 h-16" />;
            }
            const { cell, idx } = entry;
            return (
              <GridCell
                key={cell.id}
                cell={cell}
                taskMemberships={cellTaskMap[idx] || []}
                isFillable={fillableCellIds.includes(cell.id)}
                onClick={onFillCell}
              />
            );
          })
        )}
      </div>
    </div>
  );
});

export default MilestoneGrid;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/MilestoneGrid.jsx
git commit -m "feat: add MilestoneGrid component with irregular grid rendering"
```

---

## Chunk 4: Integration & Cleanup

### Task 6: Integrate Grid into GameCore

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Replace order panel with milestone grid**

In GameCore.jsx, replace the entire orders section (approximately lines 350-547, including both emergency orders and normal orders rendering) with the MilestoneGrid:

```jsx
// Add import at top of GameCore.jsx:
import MilestoneGrid from './components/game/MilestoneGrid';

// Replace the orders rendering section with:
<MilestoneGrid
  milestone={milestone}
  fillableCellIds={fillableCellIds}
  onFillCell={handleFillCell}
  milestoneNumber={milestoneNumber}
/>
```

- [ ] **Step 2: Update state/action destructuring**

Update the destructured values from `useGameLogic` to use the new names:

```jsx
// Remove from state destructuring:
// orders, emergencyOrders, orderRefreshCount, orderCandidates,
// orderCandidateQueue, orderSlotAssignments, assignedItemUids,
// phantomMarks, satisfiableOrders, potentialSatisfiableOrders

// Add to state destructuring:
const { milestone, milestoneNumber, cellMatches, fillableCellIds, /* ...existing... */ } = state;

// Remove from actions destructuring:
// handleOrderClick, handleRefreshSingleOrder, handleRefreshAllOrders,
// handleSelectOrderCandidate, handleConfirmSubmission,
// handleEvacuate, handleConfirmEvacuation

// Add to actions destructuring:
const { handleFillCell, handleEvacuationContinue, handleEvacuationExtract, /* ...existing... */ } = actions;
```

- [ ] **Step 3: Update submit/evacuation buttons**

Remove or simplify the submission mode buttons. Cell filling replaces batch submission — cells are filled directly by clicking. Remove:
- "出牌" (submit) button
- "确认出牌" (confirm submission) button
- "离开关卡" (evacuate) button
- "确认离开" (confirm evacuation) button

Add an "提取积分" (extract score) button that's always available:

```jsx
<button
  onClick={handleEvacuationExtract}
  className="px-3 py-1.5 rounded text-sm bg-orange-600 hover:bg-orange-700 text-white"
>
  提取积分离开
</button>
```

- [ ] **Step 4: Update pool relevance highlighting**

In the pool cards section, replace the order-based `relevantRequirements` calculation with:

```jsx
// Pool cards should highlight when they contain items needed by unfilled cells
const poolHighlight = useMemo(() => {
  if (!milestone) return {};
  const highlights = {};
  milestone.cells.forEach(cell => {
    if (!cell.filledItem) {
      highlights[cell.poolId] = true;
    }
  });
  return highlights;
}, [milestone]);
```

Pass `poolHighlight` to pool card components to show which pools have relevant items.

- [ ] **Step 5: Handle evacuation modal**

Update the modal rendering to handle the new `evacuation_triggered` modal type:

```jsx
{modalContent?.type === 'evacuation_triggered' && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center">
      <h2 className="text-xl font-bold text-white mb-2">{modalContent.title}</h2>
      <p className="text-gray-300 mb-4">{modalContent.message}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleEvacuationContinue}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          继续下一个里程碑
        </button>
        <button
          onClick={handleEvacuationExtract}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white"
        >
          提取积分离开
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Remove order candidate selection panel**

Remove the order candidate selection UI (the "pick 1 of 2" panel, approximately lines 481-547 in original GameCore).

- [ ] **Step 7: Verify full game flow**

Run `npm run dev` and test:
1. Game loads → milestone grid appears with irregular shape
2. Cells show item requirements with quality and task color indicators
3. Drawing from pools produces items in inventory
4. Cells with matching items highlight as fillable
5. Clicking a fillable cell consumes the item and fills the cell
6. When all cells in a task are filled → toast shows reward
7. When a task covering the evacuation cell completes → modal appears
8. "继续" → gold resets, new milestone appears
9. "提取" → victory screen
10. Gold depletion → game over

- [ ] **Step 8: Commit**

```bash
git add src/GameCore.jsx src/hooks/useGameLogic.js
git commit -m "feat: integrate milestone grid into GameCore

Replace order panel with MilestoneGrid component, update
submission flow to cell filling, add evacuation modal."
```

---

### Task 7: Cleanup

**Files:**
- Modify: `src/hooks/useGameLogic.js` (remove any remaining order references)
- Modify: `src/utils/helpers.js` (remove `generateOrder` and related)
- Remove: `src/components/game/OrderCard.jsx`
- Modify: `src/utils/translations.js` (add grid strings)

- [ ] **Step 1: Remove OrderCard component**

Delete `src/components/game/OrderCard.jsx` — it's fully replaced.

- [ ] **Step 2: Clean up helpers.js**

Remove `generateOrder` function and any order-specific helpers from `src/utils/helpers.js`. Keep `rollRarity`, `getAllNormalItems`, and other utility functions that are still used.

- [ ] **Step 3: Add translations**

Add to `src/utils/translations.js`:

```js
// Add to both zh and en translation objects:
milestone: { zh: '里程碑', en: 'Milestone' },
task_complete: { zh: '任务完成', en: 'Task Complete' },
evacuation_triggered: { zh: '撤离触发', en: 'Evacuation Triggered' },
continue_milestone: { zh: '继续下一个里程碑', en: 'Continue' },
extract_score: { zh: '提取积分离开', en: 'Extract & Leave' },
cells: { zh: '格', en: 'cells' },
```

- [ ] **Step 4: Remove unused imports and state**

Search for remaining references to removed state/functions:
- `orders` (as state variable, not the word in comments)
- `emergencyOrders`
- `orderRefreshCount`
- `orderCandidates`
- `OrderCard`
- `handleOrderClick`

Remove any remaining dead references.

- [ ] **Step 5: Verify clean build**

```bash
npm run build
```

Should complete with no errors. Warnings about unused variables are OK to investigate and clean.

- [ ] **Step 6: Final integration test**

Run `npm run dev` and play through a complete game cycle:
1. Start → first milestone
2. Draw items, fill cells, complete tasks
3. Trigger evacuation → new milestone
4. Play second milestone with increased difficulty
5. Extract or fail

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove old order system, clean up unused code

Remove OrderCard, generateOrder, order-related state remnants.
Add grid-related translations."
```

---

## Risk Notes

1. **Generation quality**: The random generation may occasionally produce degenerate milestones (all items from one pool, or tasks with no overlap). The generation algorithm includes constraints but edge cases are possible. Tune after playtesting.

2. **Cell filling UX**: Direct click-to-fill is simpler than batch submission but loses the "strategic timing" of when to submit. This is an intentional simplification for the prototype. If it's a problem, add back batch mode later.

3. **Gold economy**: 3 gold per task completion is a starting value. With 3-5 tasks per milestone, that's 9-15 gold return. Combined with 20 starting gold and draw costs of 1-4, this may need tuning.

4. **Irregular shape rendering**: CSS Grid with empty cells works but may look sparse. Consider adding visual connectors or background shapes to make the milestone feel cohesive.

5. **No refresh mechanism**: Players stuck with bad milestone have no recourse. Intentional for prototype — add cell refresh if playtesting shows this is a pain point.
