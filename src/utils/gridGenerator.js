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
      if (t > 0 && coveredIndices.size > 0 && Math.random() < 0.3) {
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
      const candidate = fullLine.slice(segStart, segStart + segmentLen);

      // Reject if this candidate fully overlaps with any existing task
      // (identical set, or one is a subset of the other)
      const candidateSet = new Set(candidate);
      const isDuplicate = tasks.some(existing => {
        const existingSet = new Set(existing.cellIndices);
        const candidateInExisting = candidate.every(idx => existingSet.has(idx));
        const existingInCandidate = existing.cellIndices.every(idx => candidateSet.has(idx));
        return candidateInExisting || existingInCandidate;
      });

      if (!isDuplicate) {
        bestSegment = candidate;
      }
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

  // --- Ensure full connectivity ---
  // 1. Cover all uncovered cells by extending tasks or creating bridge tasks
  // 2. Ensure the task graph is fully connected (no isolated clusters)

  const cellNeighborMap = new Map();
  cells.forEach((c, i) => {
    const neighbors = [];
    cells.forEach((other, j) => {
      if (i !== j && Math.abs(c.row - other.row) + Math.abs(c.col - other.col) === 1) {
        neighbors.push(j);
      }
    });
    cellNeighborMap.set(i, neighbors);
  });

  // Union-Find helpers
  const parent = Array.from({ length: cells.length }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Build initial connectivity from existing tasks
  function rebuildUnions() {
    for (let i = 0; i < cells.length; i++) parent[i] = i;
    for (const task of tasks) {
      for (let i = 0; i < task.cellIndices.length - 1; i++) {
        union(task.cellIndices[i], task.cellIndices[i + 1]);
      }
    }
  }

  // Step 1: Assign uncovered cells — extend existing tasks or create 2-cell bridges
  const getUncovered = () => {
    const covered = new Set();
    for (const task of tasks) for (const idx of task.cellIndices) covered.add(idx);
    return cells.map((_, i) => i).filter(i => !covered.has(i));
  };

  let uncovered = getUncovered();
  for (const i of uncovered) {
    const cell = cells[i];
    let assigned = false;

    // Try extending existing task at its ends
    for (const task of tasks) {
      const taskCells = task.cellIndices.map(idx => cells[idx]);
      const isHorizontal = taskCells.length <= 1 || taskCells.every(c => c.row === taskCells[0].row);

      if (isHorizontal && cell.row === taskCells[0].row) {
        const cols = taskCells.map(c => c.col).sort((a, b) => a - b);
        if (cell.col === cols[0] - 1 || cell.col === cols[cols.length - 1] + 1) {
          task.cellIndices.push(i);
          assigned = true;
          break;
        }
      } else if (!isHorizontal && cell.col === taskCells[0].col) {
        const rows = taskCells.map(c => c.row).sort((a, b) => a - b);
        if (cell.row === rows[0] - 1 || cell.row === rows[rows.length - 1] + 1) {
          task.cellIndices.push(i);
          assigned = true;
          break;
        }
      }
    }

    // If can't extend, create a 2-cell bridge task with an adjacent covered cell
    if (!assigned) {
      const covered = new Set();
      for (const task of tasks) for (const idx of task.cellIndices) covered.add(idx);
      const neighbor = cellNeighborMap.get(i).find(j => covered.has(j));
      if (neighbor !== undefined) {
        tasks.push({
          id: tasks.length,
          cellIndices: [neighbor, i],
          isCompleted: false,
        });
      }
    }
  }

  // Step 2: Bridge disconnected components
  rebuildUnions();

  let safetyLimit = cells.length;
  while (safetyLimit-- > 0) {
    const roots = new Set(cells.map((_, i) => find(i)));
    if (roots.size <= 1) break;

    // Find a pair of adjacent cells in different components
    let bridged = false;
    for (let i = 0; i < cells.length && !bridged; i++) {
      for (const j of cellNeighborMap.get(i)) {
        if (find(i) !== find(j)) {
          tasks.push({
            id: tasks.length,
            cellIndices: [i, j],
            isCompleted: false,
          });
          union(i, j);
          bridged = true;
          break;
        }
      }
    }
    if (!bridged) break;
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

  // Find intersection cells (belonging to ≥2 tasks) — no rewards on these
  const memberCount = new Array(numCells).fill(0);
  for (const task of tasks) {
    for (const idx of task.cellIndices) memberCount[idx]++;
  }
  const isIntersection = new Set(memberCount.map((c, i) => c >= 2 ? i : -1).filter(i => i >= 0));

  // Build cell objects — only some cells get rewards (never on intersections)
  return cells.map((cell, idx) => {
    const item = itemAssignments[idx];
    const requiredRarity = rollCellRarity(rarities, CELL_RARITY_WEIGHTS);
    const hasReward = !isIntersection.has(idx) && Math.random() < CELL_REWARD_CHANCE;
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
      filledItem: null,
    };
  });
}

/**
 * Orchestrator: generate a complete milestone with cells, tasks, and grid bounds.
 *
 * @param {{name: string, icon: string, poolId: string, poolName: string}[]} allItems
 * @param {{id: string}[]} rarities
 * @param {number} [difficulty=1] - Unused for now, reserved for future scaling
 * @returns {{cells: Object[], tasks: Object[], gridBounds: {rows: number, cols: number}, isComplete: boolean}}
 */
export function generateMilestone(allItems, rarities, difficulty = 1) {
  const { canvasSize, cellCount, taskCount, taskSize } = GRID_CONFIG;

  // Determine random counts within configured ranges
  const targetCellCount = cellCount.min + Math.floor(Math.random() * (cellCount.max - cellCount.min + 1));
  const numTasks = taskCount.min + Math.floor(Math.random() * (taskCount.max - taskCount.min + 1));

  // Step 1: Generate the milestone shape
  const shapeCells = generateMilestoneShape(canvasSize, targetCellCount);

  // Step 2: Generate overlapping tasks
  const tasks = generateTasks(shapeCells, numTasks, taskSize.min, taskSize.max);

  // Step 3: Assign items and quality requirements to cells
  const cells = assignItemsToCells(shapeCells, tasks, allItems, rarities);

  // Step 3.5: Ensure each task has at least one cell with a reward (prefer non-intersection cells)
  const intersectionIndices = new Set();
  for (const task of tasks) {
    for (const idx of task.cellIndices) {
      // Count across all tasks
      if (tasks.filter(t => t.cellIndices.includes(idx)).length >= 2) {
        intersectionIndices.add(idx);
      }
    }
  }
  for (const task of tasks) {
    const hasReward = task.cellIndices.some(idx => cells[idx].scoreReward > 0);
    if (!hasReward) {
      // Prefer non-intersection cells
      const nonIntersection = task.cellIndices.filter(idx => !intersectionIndices.has(idx));
      const pool = nonIntersection.length > 0 ? nonIntersection : task.cellIndices;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const cell = cells[pick];
      cells[pick] = {
        ...cell,
        scoreReward: Math.round(CELL_SCORE_WEIGHTS[cell.requiredRarity] || CELL_SCORE_WEIGHTS.common),
      };
    }
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
    isComplete: false,
  };
}
