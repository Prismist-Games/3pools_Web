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

/**
 * Get all cells belonging to the same cluster as (row, col).
 * A cluster = connected component of same-name cells (8-direction adjacency).
 * Returns array of [row, col] pairs. For effect cells, returns just the cell itself.
 */
export function getClusterCells(itemMap, row, col) {
  const rows = itemMap.length;
  const cols = itemMap[0].length;
  const item = itemMap[row]?.[col];
  if (!item || item.isEffect || item.isEvacuation) return [[row, col]];

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
        if (nItem && !nItem.isEffect && !nItem.isEvacuation && nItem.name === name) {
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
      if (newMap[r][c]?.isEvacuation) continue; // never refresh evacuation cell
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
 * 8-direction anchor offsets from avatar position.
 * The 2×2 block never includes the avatar cell itself.
 *
 *   上左  上右          ↑↑
 *   左上       右上    ←← [A] →→
 *   左下       右下     ↓↓
 *   下左  下右
 */
const DIRECTION_ANCHORS = [
  { dr: -2, dc: -1, direction: 'upLeft' },     // 上左
  { dr: -2, dc:  0, direction: 'upRight' },    // 上右
  { dr: -1, dc:  1, direction: 'rightUp' },    // 右上
  { dr:  0, dc:  1, direction: 'rightDown' },  // 右下
  { dr:  1, dc:  0, direction: 'downRight' },  // 下右
  { dr:  1, dc: -1, direction: 'downLeft' },   // 下左
  { dr:  0, dc: -2, direction: 'leftDown' },   // 左下
  { dr: -1, dc: -2, direction: 'leftUp' },     // 左上
];

/**
 * Given a hovered cell and the avatar position, determine the valid 2×2 anchor.
 * Uses 8 directions — the avatar cell is never part of the 2×2.
 * Returns { row, col } anchor or null if no valid placement exists.
 */
export function getDirectionAnchor(cellRow, cellCol, avatarRow, avatarCol) {
  if (cellRow === avatarRow && cellCol === avatarCol) return null;

  for (const { dr, dc } of DIRECTION_ANCHORS) {
    const anchorRow = avatarRow + dr;
    const anchorCol = avatarCol + dc;
    if (!isValidPlacement(anchorRow, anchorCol)) continue;

    const inRange = FIXED_SHAPE.cells.some(([sdr, sdc]) =>
      anchorRow + sdr === cellRow && anchorCol + sdc === cellCol
    );
    if (inRange) return { row: anchorRow, col: anchorCol };
  }

  return null;
}

/**
 * Get all valid 2×2 anchors reachable from the avatar position (8 directions).
 * Returns array of { row, col, direction } objects.
 */
export function getValidAvatarAnchors(avatarRow, avatarCol) {
  return DIRECTION_ANCHORS
    .map(({ dr, dc, direction }) => ({
      row: avatarRow + dr,
      col: avatarCol + dc,
      direction,
    }))
    .filter(c => isValidPlacement(c.row, c.col));
}

/** Default avatar starting position (center of grid). Computed dynamically for mutable MAP_ROWS/MAP_COLS. */
export function getDefaultAvatarPos() {
  return {
    row: Math.floor((MAP_ROWS - 1) / 2),
    col: Math.floor((MAP_COLS - 1) / 2),
  };
}
