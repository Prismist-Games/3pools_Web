/**
 * matrixHelpers.js v4
 * 4×4 item matrix with row/column selection, gravity, random refill,
 * and special cells (bomb). Items have no pre-assigned rarity — rarity
 * is rolled at draw time.
 */

import { MATRIX_CONFIG } from '../data/matrixConfig';

const { gridSize, specialCells } = MATRIX_CONFIG;

// ---------------------------------------------------------------------------
// Helper: random int in [min, max]
// ---------------------------------------------------------------------------
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// ---------------------------------------------------------------------------
// 1. generateNormalCell — creates a normal item cell (no rarity)
// ---------------------------------------------------------------------------

const generateNormalCell = (allNormalItems) => {
  const item = allNormalItems[Math.floor(Math.random() * allNormalItems.length)];
  return {
    type: 'normal',
    item: { name: item.name, icon: item.icon, poolId: item.poolId, poolName: item.poolName },
    uid: Math.random().toString(36).substr(2, 9),
  };
};

// ---------------------------------------------------------------------------
// 2. generateRandomCell — for gravity refill: mostly normal, small chance bomb
// ---------------------------------------------------------------------------

export const generateRandomCell = (allNormalItems) => {
  const roll = Math.random();
  if (roll < 0.08) {
    return {
      type: 'bomb',
      item: { name: specialCells.bomb.name, icon: specialCells.bomb.icon },
      uid: Math.random().toString(36).substr(2, 9),
    };
  }
  return generateNormalCell(allNormalItems);
};

// ---------------------------------------------------------------------------
// 3. generateItemMatrix — controlled bomb counts, then fill normal
// ---------------------------------------------------------------------------

export const generateItemMatrix = (allNormalItems) => {
  const totalCells = gridSize * gridSize;

  // Decide counts
  const bombCount = randInt(specialCells.bomb.min, specialCells.bomb.max);

  // Build a flat array of cell types, then shuffle to assign positions
  const cellTypes = [];
  for (let i = 0; i < bombCount; i++) cellTypes.push('bomb');
  while (cellTypes.length < totalCells) cellTypes.push('normal');

  // Fisher-Yates shuffle
  for (let i = cellTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellTypes[i], cellTypes[j]] = [cellTypes[j], cellTypes[i]];
  }

  // Build matrix
  const matrix = [];
  let idx = 0;
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      const type = cellTypes[idx++];
      if (type === 'bomb') {
        row.push({
          type: 'bomb',
          item: { name: specialCells.bomb.name, icon: specialCells.bomb.icon },
          uid: Math.random().toString(36).substr(2, 9),
        });
      } else {
        row.push(generateNormalCell(allNormalItems));
      }
    }
    matrix.push(row);
  }
  return matrix;
};

// ---------------------------------------------------------------------------
// 4. applyGravity — after removing a cell at (row, col), drop items above down
//    and fill the top with a new random item
// ---------------------------------------------------------------------------

export const applyGravity = (matrix, row, col, allNormalItems) => {
  const newMatrix = matrix.map(r => [...r]);

  for (let r = row; r > 0; r--) {
    newMatrix[r][col] = newMatrix[r - 1][col];
  }

  newMatrix[0][col] = generateRandomCell(allNormalItems);

  return newMatrix;
};

// ---------------------------------------------------------------------------
// 5. applyBombExplosion — remove bomb cell + all 8 neighbors, then gravity.
//    Operates on the ORIGINAL matrix (bomb cell not yet removed).
//    Returns { matrix, removedCells } for animation.
// ---------------------------------------------------------------------------

export const applyBombExplosion = (matrix, row, col, allNormalItems) => {
  // All cells to remove: bomb itself + 8 neighbors
  const allRemoved = [{ row, col }];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
        allRemoved.push({ row: nr, col: nc });
      }
    }
  }
  const neighbors = allRemoved.filter(c => !(c.row === row && c.col === col));

  // Group removed rows by column (as Sets for fast lookup)
  const colRemovedRows = {};
  for (const n of allRemoved) {
    if (!colRemovedRows[n.col]) colRemovedRows[n.col] = new Set();
    colRemovedRows[n.col].add(n.row);
  }

  let newMatrix = matrix.map(r => [...r]);

  // Per column: collect survivors, place at bottom, fill top with new cells
  for (const [colStr, removedRowSet] of Object.entries(colRemovedRows)) {
    const c = parseInt(colStr);

    // Collect surviving cells from top to bottom (preserving order)
    const surviving = [];
    for (let r = 0; r < gridSize; r++) {
      if (!removedRowSet.has(r)) {
        surviving.push(newMatrix[r][c]);
      }
    }

    const removedCount = removedRowSet.size;

    // Fill: new cells at top rows, survivors below
    for (let r = 0; r < removedCount; r++) {
      newMatrix[r][c] = generateRandomCell(allNormalItems);
    }
    for (let r = 0; r < surviving.length; r++) {
      newMatrix[removedCount + r][c] = surviving[r];
    }
  }

  return { matrix: newMatrix, removedCells: neighbors };
};

// ---------------------------------------------------------------------------
// 6. Cluster system — same-name items adjacent (8-dir) form clusters
// ---------------------------------------------------------------------------

// Cluster size → guaranteed minimum rarity id
// Size 1 = no guarantee, size 2 = uncommon, 3 = rare, etc.
const CLUSTER_RARITY_TIERS = [null, null, 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const getClusterGuaranteedRarityId = (clusterSize) => {
  if (clusterSize < 2) return null;
  const index = Math.min(clusterSize, CLUSTER_RARITY_TIERS.length - 1);
  return CLUSTER_RARITY_TIERS[index];
};

/**
 * Get all cells in the cluster containing (row, col) via BFS.
 * Returns array of { row, col }.
 */
export const getClusterCells = (matrix, row, col) => {
  if (!matrix || matrix[row]?.[col]?.type !== 'normal') return [{ row, col }];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const name = matrix[row][col].item.name;
  const visited = new Set([`${row},${col}`]);
  const queue = [[row, col]];
  const cells = [{ row, col }];

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = cr + dr, nc = cc + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) &&
            matrix[nr][nc].type === 'normal' && matrix[nr][nc].item.name === name) {
          visited.add(key);
          cells.push({ row: nr, col: nc });
          queue.push([nr, nc]);
        }
      }
    }
  }
  return cells;
};

/** Convenience: cluster size for a cell. */
export const getClusterSize = (matrix, row, col) => getClusterCells(matrix, row, col).length;

/**
 * Remove a set of cells from the matrix and apply per-column gravity.
 * Returns { matrix, colInfo } where colInfo is { [col]: { count, lowestRow } }.
 */
export const removeCells = (matrix, cellsToRemove, allNormalItems) => {
  const colRemovedRows = {};
  for (const { row, col } of cellsToRemove) {
    if (!colRemovedRows[col]) colRemovedRows[col] = new Set();
    colRemovedRows[col].add(row);
  }

  const newMatrix = matrix.map(r => [...r]);
  const colInfo = {};

  for (const [colStr, removedRowSet] of Object.entries(colRemovedRows)) {
    const c = parseInt(colStr);
    const surviving = [];
    for (let r = 0; r < gridSize; r++) {
      if (!removedRowSet.has(r)) surviving.push(newMatrix[r][c]);
    }
    const removedCount = removedRowSet.size;
    for (let r = 0; r < removedCount; r++) {
      newMatrix[r][c] = generateRandomCell(allNormalItems);
    }
    for (let r = 0; r < surviving.length; r++) {
      newMatrix[removedCount + r][c] = surviving[r];
    }

    let lowestRow = 0;
    for (const row of removedRowSet) { if (row > lowestRow) lowestRow = row; }
    colInfo[c] = { count: removedCount, lowestRow };
  }

  return { matrix: newMatrix, colInfo };
};

/**
 * Compute clusters for the entire matrix.
 * Returns a 2D array where each cell has { id, size } or null.
 */
export const computeClusters = (matrix) => {
  if (!matrix) return null;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clusterMap = Array.from({ length: rows }, () => Array(cols).fill(null));
  let clusterId = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      visited[r][c] = true;
      if (matrix[r][c].type !== 'normal') continue;

      const name = matrix[r][c].item.name;
      const cells = [{ row: r, col: c }];
      const queue = [[r, c]];

      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] &&
                matrix[nr][nc].type === 'normal' && matrix[nr][nc].item.name === name) {
              visited[nr][nc] = true;
              cells.push({ row: nr, col: nc });
              queue.push([nr, nc]);
            }
          }
        }
      }

      const id = clusterId++;
      const size = cells.length;
      cells.forEach(({ row, col }) => {
        clusterMap[row][col] = { id, size };
      });
    }
  }
  return clusterMap;
};
