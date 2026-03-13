import { GRID_CONFIG, CELL_SCORE_WEIGHTS, CELL_RARITY_WEIGHTS, CELL_REWARD_CHANCE } from '../data/gridConstants.js';

// --- Helper Functions ---

/**
 * Get orthogonal neighbors of a cell within canvas bounds.
 * @param {number} row
 * @param {number} col
 * @param {number} canvasSize
 * @returns {{row: number, col: number}[]}
 */
export function getNeighbors(row, col, canvasSize) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const neighbors = [];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < canvasSize && nc >= 0 && nc < canvasSize) {
      neighbors.push({ row: nr, col: nc });
    }
  }
  return neighbors;
}

/**
 * Weighted random rarity selection from available rarities.
 * @param {{id: string}[]} rarities - Array of rarity config objects
 * @param {Object} weights - Map of rarity id to weight
 * @returns {string} Selected rarity id
 */
export function rollCellRarity(rarities, weights) {
  const eligible = rarities.filter(r => (weights[r.id] || 0) > 0);
  if (eligible.length === 0) {
    // Fallback: return the first rarity if all weights are zero
    return rarities[0].id;
  }

  const totalWeight = eligible.reduce((sum, r) => sum + weights[r.id], 0);
  let roll = Math.random() * totalWeight;

  for (const r of eligible) {
    roll -= weights[r.id];
    if (roll <= 0) return r.id;
  }

  return eligible[eligible.length - 1].id;
}

// --- Core Generation Functions ---

/**
 * Create a coordinate key string for set lookups.
 */
function cellKey(row, col) {
  return `${row},${col}`;
}

/**
 * Generate an irregular connected region by random flood-fill growth.
 * Starts from a random cell near the center and grows outward by
 * repeatedly picking a random frontier neighbor.
 *
 * @param {number} canvasSize
 * @param {number} targetCellCount
 * @returns {{row: number, col: number}[]}
 */
export function generateMilestoneShape(canvasSize, targetCellCount) {
  // Start near center for a more natural shape
  const center = Math.floor(canvasSize / 2);
  const startRow = center + Math.floor(Math.random() * 2) - (canvasSize > 2 ? 1 : 0);
  const startCol = center + Math.floor(Math.random() * 2) - (canvasSize > 2 ? 1 : 0);

  const cells = [{ row: startRow, col: startCol }];
  const cellSet = new Set([cellKey(startRow, startCol)]);

  // Build frontier: neighbors of current shape that aren't in shape
  const frontierSet = new Set();
  const frontier = [];

  const addToFrontier = (row, col) => {
    for (const n of getNeighbors(row, col, canvasSize)) {
      const key = cellKey(n.row, n.col);
      if (!cellSet.has(key) && !frontierSet.has(key)) {
        frontierSet.add(key);
        frontier.push(n);
      }
    }
  };

  addToFrontier(startRow, startCol);

  while (cells.length < targetCellCount && frontier.length > 0) {
    // Pick a random frontier cell
    const idx = Math.floor(Math.random() * frontier.length);
    const next = frontier[idx];

    // Remove from frontier (swap with last for O(1) removal)
    frontier[idx] = frontier[frontier.length - 1];
    frontier.pop();

    const key = cellKey(next.row, next.col);
    frontierSet.delete(key);

    // Skip if somehow already in shape
    if (cellSet.has(key)) continue;

    cells.push(next);
    cellSet.add(key);
    addToFrontier(next.row, next.col);
  }

  return cells;
}

/**
 * Find the longest contiguous straight line of milestone cells passing
 * through a given cell in a given direction (horizontal or vertical).
 * Returns an array of cell indices in order.
 */
function findContiguousLine(cells, cellIndexMap, startIdx, isHorizontal) {
  const startCell = cells[startIdx];
  const dr = isHorizontal ? 0 : 1;
  const dc = isHorizontal ? 1 : 0;

  // Extend in positive direction
  const forward = [];
  for (let step = 1; ; step++) {
    const idx = cellIndexMap.get(cellKey(startCell.row + dr * step, startCell.col + dc * step));
    if (idx === undefined) break;
    forward.push(idx);
  }

  // Extend in negative direction
  const backward = [];
  for (let step = 1; ; step++) {
    const idx = cellIndexMap.get(cellKey(startCell.row - dr * step, startCell.col - dc * step));
    if (idx === undefined) break;
    backward.push(idx);
  }

  // Full contiguous line: [...backward (reversed), start, ...forward]
  return [...backward.reverse(), startIdx, ...forward];
}

/**
 * Generate tasks as straight lines (horizontal or vertical) of consecutive cells.
 *
 * Each task is a contiguous segment of a row or column within the milestone shape.
 * Subsequent tasks prefer starting from already-covered cells for overlap.
 * Uncovered cells are assigned to adjacent existing tasks.
 *
 * @param {{row: number, col: number}[]} cells
 * @param {number} numTasks
 * @param {number} minSize
 * @param {number} maxSize
 * @returns {{id: number, cellIndices: number[], isCompleted: boolean}[]}
 */
export function generateTasks(cells, numTasks, minSize, maxSize) {
  const cellIndexMap = new Map();
  cells.forEach((c, i) => cellIndexMap.set(cellKey(c.row, c.col), i));

  const coveredIndices = new Set();
  const tasks = [];

  for (let t = 0; t < numTasks; t++) {
    let bestSegment = null;

    for (let attempt = 0; attempt < 60 && !bestSegment; attempt++) {
      // Pick a starting cell — prefer covered cells for overlap
      let startIdx;
      if (t > 0 && coveredIndices.size > 0 && Math.random() < 0.7) {
        const arr = [...coveredIndices];
        startIdx = arr[Math.floor(Math.random() * arr.length)];
      } else {
        startIdx = Math.floor(Math.random() * cells.length);
      }

      // Pick direction
      const isHorizontal = Math.random() < 0.5;

      // Find full contiguous line through this cell
      const fullLine = findContiguousLine(cells, cellIndexMap, startIdx, isHorizontal);
      if (fullLine.length < minSize) continue;

      // Pick a random sub-segment of valid length
      const segmentLen = minSize + Math.floor(Math.random() * (Math.min(maxSize, fullLine.length) - minSize + 1));
      const maxStart = fullLine.length - segmentLen;
      const segStart = Math.floor(Math.random() * (maxStart + 1));
      bestSegment = fullLine.slice(segStart, segStart + segmentLen);
    }

    if (bestSegment) {
      tasks.push({
        id: t,
        cellIndices: bestSegment,
        isCompleted: false,
      });
      bestSegment.forEach(idx => coveredIndices.add(idx));
    }
  }

  // Assign uncovered cells to adjacent existing tasks
  for (let i = 0; i < cells.length; i++) {
    if (coveredIndices.has(i)) continue;

    const cell = cells[i];
    let assigned = false;

    // Check all 4 neighbors for a cell that belongs to a task
    for (const n of getNeighbors(cell.row, cell.col, GRID_CONFIG.canvasSize)) {
      const nIdx = cellIndexMap.get(cellKey(n.row, n.col));
      if (nIdx !== undefined && coveredIndices.has(nIdx)) {
        // Find the task and check if adding this cell keeps it as a straight line
        for (const task of tasks) {
          if (!task.cellIndices.includes(nIdx)) continue;
          // Check line property: all cells in task must share a row or a column
          const taskCells = task.cellIndices.map(idx => cells[idx]);
          const allSameRow = taskCells.every(c => c.row === cell.row);
          const allSameCol = taskCells.every(c => c.col === cell.col);
          if (allSameRow || allSameCol) {
            task.cellIndices.push(i);
            coveredIndices.add(i);
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
    }

    // Fallback: create a single-cell "task" or add to first task
    if (!assigned) {
      tasks[0].cellIndices.push(i);
      coveredIndices.add(i);
    }
  }

  return tasks;
}

/**
 * Assign item names, icons, pool info, and quality requirements to cells.
 *
 * Ensures items come from at least 3 pools. Each cell gets a unique
 * item assignment (unique within the milestone, with recycling through
 * the pool when there are more cells than unique items).
 *
 * @param {{row: number, col: number}[]} cells
 * @param {{id: number, cellIndices: number[], isCompleted: boolean}[]} tasks
 * @param {{name: string, icon: string, poolId: string, poolName: string}[]} allItems
 * @param {{id: string}[]} rarities
 * @returns {Object[]} Cell objects with full properties
 */
export function assignItemsToCells(cells, tasks, allItems, rarities) {
  const numCells = cells.length;

  // Ensure items come from at least 3 pools
  const poolGroups = new Map();
  for (const item of allItems) {
    if (!poolGroups.has(item.poolId)) {
      poolGroups.set(item.poolId, []);
    }
    poolGroups.get(item.poolId).push(item);
  }

  const poolIds = [...poolGroups.keys()];
  const minPools = Math.min(3, poolIds.length);

  // Shuffle all items, but ensure minimum pool diversity
  let selectedItems = [];

  // First, pick at least one item from each of the first `minPools` pools
  const shuffledPoolIds = [...poolIds];
  for (let i = shuffledPoolIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPoolIds[i], shuffledPoolIds[j]] = [shuffledPoolIds[j], shuffledPoolIds[i]];
  }

  const usedPools = new Set();
  for (let p = 0; p < minPools; p++) {
    const poolItems = poolGroups.get(shuffledPoolIds[p]);
    const item = poolItems[Math.floor(Math.random() * poolItems.length)];
    selectedItems.push(item);
    usedPools.add(shuffledPoolIds[p]);
  }

  // Fill remaining slots from all items (shuffled), avoiding duplicates of already selected
  const remainingItems = allItems.filter(
    it => !selectedItems.some(s => s.name === it.name)
  );
  // Shuffle remaining
  for (let i = remainingItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingItems[i], remainingItems[j]] = [remainingItems[j], remainingItems[i]];
  }

  selectedItems = [...selectedItems, ...remainingItems];

  // If we need more cells than unique items, cycle through
  const itemAssignments = [];
  for (let i = 0; i < numCells; i++) {
    itemAssignments.push(selectedItems[i % selectedItems.length]);
  }

  // Shuffle the assignments so the order isn't predictable
  for (let i = itemAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [itemAssignments[i], itemAssignments[j]] = [itemAssignments[j], itemAssignments[i]];
  }

  // Build cell objects — only some cells get rewards
  return cells.map((cell, idx) => {
    const item = itemAssignments[idx];
    const requiredRarity = rollCellRarity(rarities, CELL_RARITY_WEIGHTS);
    const hasReward = Math.random() < CELL_REWARD_CHANCE;
    const scoreReward = hasReward ? (CELL_SCORE_WEIGHTS[requiredRarity] || CELL_SCORE_WEIGHTS.common) : 0;

    return {
      id: idx,
      row: cell.row,
      col: cell.col,
      itemName: item.name,
      itemIcon: item.icon,
      poolId: item.poolId,
      poolName: item.poolName,
      requiredRarity,
      scoreReward,
      hasEvacuation: false,
      filledItem: null,
    };
  });
}

/**
 * Orchestrator: generate a complete milestone with cells, tasks,
 * evacuation marker, and grid bounds.
 *
 * @param {{name: string, icon: string, poolId: string, poolName: string}[]} allItems
 * @param {{id: string}[]} rarities
 * @param {number} [difficulty=1] - Unused for now, reserved for future scaling
 * @returns {{cells: Object[], tasks: Object[], gridBounds: {rows: number, cols: number}, evacuationIndices: number[], isComplete: boolean}}
 */
export function generateMilestone(allItems, rarities, difficulty = 1) {
  const { canvasSize, cellCount, taskCount, taskSize, evacuationCellCount } = GRID_CONFIG;

  // Determine random counts within configured ranges
  const targetCellCount = cellCount.min + Math.floor(Math.random() * (cellCount.max - cellCount.min + 1));
  const numTasks = taskCount.min + Math.floor(Math.random() * (taskCount.max - taskCount.min + 1));

  // Step 1: Generate the milestone shape
  const shapeCells = generateMilestoneShape(canvasSize, targetCellCount);

  // Step 2: Generate overlapping tasks
  const tasks = generateTasks(shapeCells, numTasks, taskSize.min, taskSize.max);

  // Step 3: Assign items and quality requirements to cells
  const cells = assignItemsToCells(shapeCells, tasks, allItems, rarities);

  // Step 4: Place evacuation marker(s) on random cell(s)
  const evacuationIndices = [];
  const availableIndices = cells.map((_, i) => i);
  for (let i = availableIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
  }
  const numEvac = Math.min(evacuationCellCount, cells.length);
  for (let i = 0; i < numEvac; i++) {
    const evacIdx = availableIndices[i];
    cells[evacIdx].hasEvacuation = true;
    evacuationIndices.push(evacIdx);
  }

  // Step 5: Compute grid bounds (bounding box of actual cells)
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  for (const cell of cells) {
    if (cell.row < minRow) minRow = cell.row;
    if (cell.row > maxRow) maxRow = cell.row;
    if (cell.col < minCol) minCol = cell.col;
    if (cell.col > maxCol) maxCol = cell.col;
  }

  const gridBounds = {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };

  return {
    cells,
    tasks,
    gridBounds,
    evacuationIndices,
    isComplete: false,
  };
}
