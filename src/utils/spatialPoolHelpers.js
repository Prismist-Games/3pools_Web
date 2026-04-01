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

/**
 * Generate the item map grid.
 * Only needed items appear if neededNames is provided.
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
    if (!item || item.isEffect) return null;
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

/**
 * Get all cells belonging to the same cluster as (row, col).
 * A cluster = connected component of same-name cells (8-direction adjacency).
 * Returns array of [row, col] pairs. For effect cells, returns just the cell itself.
 */
export function getClusterCells(itemMap, row, col) {
  const rows = itemMap.length;
  const cols = itemMap[0].length;
  const item = itemMap[row]?.[col];
  if (!item || item.isEffect) return [[row, col]];

  const name = item.name;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cluster = [];
  const queue = [[row, col]];
  visited[row][col] = true;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    cluster.push([cr, cc]);
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        const nItem = itemMap[nr][nc];
        if (nItem && !nItem.isEffect && nItem.name === name) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }
  return cluster;
}

/**
 * Refresh cells: expand each "seed" cell into its full cluster, union with extra cells,
 * then replace all of them with new random items.
 *
 * @param itemMap       Current grid
 * @param clusterSeeds  Array of [row, col] — each seed's entire cluster will be refreshed
 * @param extraCells    Array of [row, col] — additional cells to refresh (not cluster-expanded)
 * @param neededNames   Set of needed item names (for randomCell)
 */
export function refreshWithClusters(itemMap, clusterSeeds, extraCells = [], neededNames = null) {
  const toRefresh = new Set();

  for (const [r, c] of clusterSeeds) {
    for (const [cr, cc] of getClusterCells(itemMap, r, c)) {
      toRefresh.add(`${cr},${cc}`);
    }
  }
  for (const [r, c] of extraCells) {
    toRefresh.add(`${r},${c}`);
  }

  const newMap = itemMap.map(row => [...row]);
  for (const key of toRefresh) {
    const [r, c] = key.split(',').map(Number);
    if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
      newMap[r][c] = randomCell(neededNames);
    }
  }
  return newMap;
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
 * Given a hovered cell and the avatar position, determine the valid 2×2 anchor.
 * The avatar is always included in the 2×2. The hovered cell's position relative
 * to the avatar determines the exploration direction (one of 4 diagonals).
 * Returns { row, col } anchor or null if no valid placement exists.
 */
export function getDirectionAnchor(cellRow, cellCol, avatarRow, avatarCol) {
  // Hovering the avatar cell itself doesn't select a direction
  if (cellRow === avatarRow && cellCol === avatarCol) return null;

  // Determine anchor based on which quadrant the cell is in relative to avatar
  const anchorRow = cellRow < avatarRow ? avatarRow - 1 : avatarRow;
  const anchorCol = cellCol < avatarCol ? avatarCol - 1 : avatarCol;

  if (!isValidPlacement(anchorRow, anchorCol)) return null;

  // Verify the hovered cell is actually within this 2×2
  const inRange = FIXED_SHAPE.cells.some(([dr, dc]) =>
    anchorRow + dr === cellRow && anchorCol + dc === cellCol
  );
  if (!inRange) return null;

  return { row: anchorRow, col: anchorCol };
}

/**
 * Get all valid 2×2 anchors reachable from the avatar position.
 * Returns array of { row, col, direction } objects.
 */
export function getValidAvatarAnchors(avatarRow, avatarCol) {
  const candidates = [
    { row: avatarRow - 1, col: avatarCol - 1, direction: 'topLeft' },
    { row: avatarRow - 1, col: avatarCol, direction: 'topRight' },
    { row: avatarRow, col: avatarCol - 1, direction: 'bottomLeft' },
    { row: avatarRow, col: avatarCol, direction: 'bottomRight' },
  ];
  return candidates.filter(c => isValidPlacement(c.row, c.col));
}

/** Default avatar starting position (center of grid). Computed dynamically for mutable MAP_ROWS/MAP_COLS. */
export function getDefaultAvatarPos() {
  return {
    row: Math.floor((MAP_ROWS - 1) / 2),
    col: Math.floor((MAP_COLS - 1) / 2),
  };
}
