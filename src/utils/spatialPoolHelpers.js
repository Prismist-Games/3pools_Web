// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  FUNCTIONAL_TILE_TYPES,
  FUNCTIONAL_TILE_CHANCE,
} from '../data/spatialConstants.js';

// --- Cell generation helper ---

/**
 * Pick a random needed item (never a functional tile — use randomCellOrFunctional for that).
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

/** Create a random functional tile cell object. */
function randomFunctionalTile() {
  const type = FUNCTIONAL_TILE_TYPES[Math.floor(Math.random() * FUNCTIONAL_TILE_TYPES.length)];
  return { name: type.name, icon: type.icon, isFunctional: true, functionalId: type.id };
}

/**
 * Generate a cell that may be a functional tile (with FUNCTIONAL_TILE_CHANCE probability).
 * Returns a functional tile or a regular item cell.
 */
export function randomCellOrFunctional(neededNames = null) {
  if (Math.random() < FUNCTIONAL_TILE_CHANCE) {
    return randomFunctionalTile();
  }
  return randomCell(neededNames);
}

/**
 * Check whether placing a non-item cell at (row, col) would violate the spacing constraint.
 * Constraint: no 2×2 block may cover more than one non-item cell.
 * Two cells share a possible 2×2 iff Chebyshev distance <= 1 (|dr| <= 1 AND |dc| <= 1).
 */
export function hasNonItemNeighbor(grid, row, col) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS) continue;
      const cell = grid[nr][nc];
      if (cell && (cell.isEvacuation || cell.isFunctional || cell.isEffect)) return true;
    }
  }
  return false;
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
 * Places one evacuation cell and functional tiles (with spacing constraint).
 */
export function generateItemMap(neededNames = null) {
  // 1. Fill grid with regular items
  const grid = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push(randomCell(neededNames));
    }
    grid.push(row);
  }
  // 2. Place evacuation cell (avoid center where avatar spawns)
  const center = getDefaultAvatarPos();
  let er, ec;
  do {
    er = Math.floor(Math.random() * MAP_ROWS);
    ec = Math.floor(Math.random() * MAP_COLS);
  } while (er === center.row && ec === center.col);
  grid[er][ec] = { ...EVACUATION_CELL };

  // 3. Place functional tiles with spacing constraint
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const cell = grid[r][c];
      if (cell.isEvacuation || cell.isFunctional) continue;
      if (Math.random() < FUNCTIONAL_TILE_CHANCE && !hasNonItemNeighbor(grid, r, c)) {
        grid[r][c] = randomFunctionalTile();
      }
    }
  }
  return grid;
}

/**
 * Refresh all cells covered by a 2×2 placement.
 * May generate functional tiles with spacing constraint.
 */
export function refreshCoveredCells(itemMap, anchorRow, anchorCol, neededNames = null) {
  const newMap = itemMap.map(row => [...row]);
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue;
    if (newMap[r][c]?.isEvacuation) continue; // never refresh evacuation cell
    // Try functional tile, fall back to regular item if spacing violated
    const candidate = randomCellOrFunctional(neededNames);
    if (candidate.isFunctional && hasNonItemNeighbor(newMap, r, c)) {
      newMap[r][c] = randomCell(neededNames);
    } else {
      newMap[r][c] = candidate;
    }
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
    if (!item || item.isEffect || item.isEvacuation || item.isFunctional) return null;
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

/** Draw cost is always 1 gold. */
export function getDrawCost() {
  return 1;
}

/** Default avatar starting position (center of grid). Computed dynamically for mutable MAP_ROWS/MAP_COLS. */
export function getDefaultAvatarPos() {
  return {
    row: Math.floor((MAP_ROWS - 2) / 2),
    col: Math.floor((MAP_COLS - 2) / 2),
  };
}
