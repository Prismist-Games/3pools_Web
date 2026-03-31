// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  FATE_DICE_CONFIG,
} from '../data/spatialConstants.js';

// --- Cell generation helper ---

/**
 * Pick a random needed item (or fate dice).
 * Only generates items from neededNames. No effect cells.
 */
export function randomCell(neededNames = null) {
  // Fate dice chance
  if (Math.random() < FATE_DICE_CONFIG.spawnChance) {
    return { isFateDice: true, icon: FATE_DICE_CONFIG.icon, name: FATE_DICE_CONFIG.name };
  }
  // Pick from needed items only (if provided)
  if (neededNames && neededNames.size > 0) {
    const needed = ALL_ITEMS.filter(i => neededNames.has(i.name));
    if (needed.length > 0) {
      return needed[Math.floor(Math.random() * needed.length)];
    }
  }
  // Fallback: any item
  return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
}

// --- Item map generation ---

/**
 * Generate the item map grid.
 * Only needed items appear (+ fate dice). No effect cells.
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
    newMap[r][c] = randomCell(neededNames);
  }
  return newMap;
}

// --- Cluster calculation ---

/**
 * Compute cluster size for every cell on the map.
 * A cluster = group of adjacent cells (up/down/left/right) with the same item name.
 * Returns a 2D array of cluster sizes matching the grid dimensions.
 */
export function computeClusterSizes(itemMap) {
  const rows = itemMap.length;
  const cols = itemMap[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const sizes = Array.from({ length: rows }, () => Array(cols).fill(1));

  const getName = (r, c) => {
    const item = itemMap[r][c];
    if (!item || item.isEffect || item.isFateDice) return null;
    return item.name;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      const name = getName(r, c);
      if (!name) { visited[r][c] = true; continue; }

      // BFS to find all cells in this cluster
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

      // Set cluster size for all cells in this cluster
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
