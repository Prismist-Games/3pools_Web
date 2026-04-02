// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
} from '../data/spatialConstants.js';

// --- Cell generation helper ---

/**
 * Pick a random needed item.
 * Only generates items from neededNames if provided.
 */
export function randomCell(neededNames = null) {
  if (neededNames && neededNames.size > 0) {
    const needed = ALL_ITEMS.filter(i => neededNames.has(i.name));
    if (needed.length > 0) {
      return needed[Math.floor(Math.random() * needed.length)];
    }
  }
  return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
}

// --- Item map generation ---

/** The evacuation cell object placed on the map. */
export const EVACUATION_CELL = {
  name: '撤离点',
  icon: '🚀',
  isEvacuation: true,
};

/**
 * Generate the item map grid.
 * Only needed items appear if neededNames is provided.
 * Places one fixed evacuation cell at a random position.
 */
export function generateItemMap(neededNames = null) {
  const grid = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push(randomCell(neededNames));
    }
    grid.push(row);
  }
  // Place evacuation cell at a random position (avoid center where avatar spawns)
  const center = getDefaultAvatarPos();
  let er, ec;
  do {
    er = Math.floor(Math.random() * MAP_ROWS);
    ec = Math.floor(Math.random() * MAP_COLS);
  } while (er === center.row && ec === center.col);
  grid[er][ec] = { ...EVACUATION_CELL };
  return grid;
}

/**
 * Refresh all cells covered by a 2×2 placement.
 */
export function refreshCoveredCells(itemMap, anchorRow, anchorCol, neededNames = null) {
  const newMap = itemMap.map(row => [...row]);
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue;
    if (newMap[r][c]?.isEvacuation) continue; // never refresh evacuation cell
    newMap[r][c] = randomCell(neededNames);
  }
  return newMap;
}

// --- Cluster calculation ---

/**
 * Compute cluster size for every cell on the map.
 * A cluster = group of adjacent cells (8-direction) with the same item name.
 * Returns a 2D array of cluster sizes matching the grid dimensions.
 */
export function computeClusterSizes(itemMap) {
  const rows = itemMap.length;
  const cols = itemMap[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const sizes = Array.from({ length: rows }, () => Array(cols).fill(1));

  const getName = (r, c) => {
    const item = itemMap[r][c];
    if (!item || item.isEffect || item.isEvacuation) return null;
    return item.name;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      const name = getName(r, c);
      if (!name) { visited[r][c] = true; continue; }

      const cluster = [];
      const queue = [[r, c]];
      visited[r][c] = true;
      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        cluster.push([cr, cc]);
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && getName(nr, nc) === name) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      const size = cluster.length;
      for (const [cr, cc] of cluster) {
        sizes[cr][cc] = size;
      }
    }
  }
  return sizes;
}

// --- Coverage calculation (fixed 2×2) ---

/**
 * Get the items covered by a 2×2 placement at (anchorRow, anchorCol).
 * Returns null if any cell would be out of bounds.
 */
export function getFrameCoverage(anchorRow, anchorCol, itemMap) {
  const covered = [];
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
      return null;
    }
    covered.push({ row: r, col: c, item: itemMap[r][c] });
  }
  return covered;
}

/**
 * Check if a 2×2 placement is valid (within grid bounds).
 */
export function isValidPlacement(anchorRow, anchorCol) {
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
      return false;
    }
  }
  return true;
}

/**
 * Manhattan distance between two 2×2 blocks (nearest edges).
 * Returns 0 if they overlap or are adjacent.
 */
export function getMovementDistance(fromRow, fromCol, toRow, toCol) {
  const rowDist = Math.max(0, toRow - (fromRow + 1), fromRow - (toRow + 1));
  const colDist = Math.max(0, toCol - (fromCol + 1), fromCol - (toCol + 1));
  return rowDist + colDist;
}

/** Total draw cost = base 1 + distance. */
export function getDrawCost(fromRow, fromCol, toRow, toCol) {
  return 1 + getMovementDistance(fromRow, fromCol, toRow, toCol);
}

/** Default avatar starting position (center of grid). Computed dynamically for mutable MAP_ROWS/MAP_COLS. */
export function getDefaultAvatarPos() {
  return {
    row: Math.floor((MAP_ROWS - 2) / 2),
    col: Math.floor((MAP_COLS - 2) / 2),
  };
}
