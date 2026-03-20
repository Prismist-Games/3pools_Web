/**
 * matrixHelpers.js
 * Utility functions for the 5x5 resource matrix system:
 * shape placement, coverage checking, and matrix generation.
 */

import { SHAPE_DEFINITIONS, MATRIX_CONFIG } from '../data/matrixConfig';

// ---------------------------------------------------------------------------
// 1. getShapeCells
// ---------------------------------------------------------------------------

/**
 * Returns the absolute [row, col] positions for a shape placed at (row, col).
 *
 * @param {object} shapeDef   - One entry from SHAPE_DEFINITIONS
 * @param {number} row        - Top-left anchor row on the grid
 * @param {number} col        - Top-left anchor col on the grid
 * @param {string} orientation - 'h' | 'v' (ignored when shapeDef.hasOrientation is false)
 * @returns {Array<[number,number]>}
 */
export const getShapeCells = (shapeDef, row, col, orientation) => {
  const key = shapeDef.hasOrientation ? orientation : 'default';
  const offsets = shapeDef.cells[key] || shapeDef.cells.default || [];
  return offsets.map(([dr, dc]) => [row + dr, col + dc]);
};

// ---------------------------------------------------------------------------
// 1b. getShapeCellsAtAnchor
// ---------------------------------------------------------------------------

/**
 * Returns shape cells positioned so the shape's pivot aligns with the anchor.
 * The pivot is the cell within the shape that represents the player's position.
 */
export const getShapeCellsAtAnchor = (shapeDef, anchorRow, anchorCol, orientation) => {
  const pivot = shapeDef.pivot || [0, 0];
  const originRow = anchorRow - pivot[0];
  const originCol = anchorCol - pivot[1];
  return getShapeCells(shapeDef, originRow, originCol, orientation);
};

// ---------------------------------------------------------------------------
// 2. isValidPlacement
// ---------------------------------------------------------------------------

/**
 * Returns true if the shape placement is within bounds AND covers at least
 * one anchor cell.
 *
 * @param {Array<[number,number]>} shapeCells - Absolute cell positions
 * @param {number}                 gridSize   - Size of the square grid
 * @param {Array<{row:number,col:number}>} anchors
 * @returns {boolean}
 */
export const isValidPlacement = (shapeCells, gridSize, anchors) => {
  const inBounds = shapeCells.every(
    ([r, c]) => r >= 0 && r < gridSize && c >= 0 && c < gridSize
  );
  if (!inBounds) return false;

  const coversAnchor = anchors.some(anchor =>
    shapeCells.some(([r, c]) => r === anchor.row && c === anchor.col)
  );
  return coversAnchor;
};

// ---------------------------------------------------------------------------
// 3. getCoveredResourcePoints
// ---------------------------------------------------------------------------

/**
 * Returns resource points that are FULLY covered by the shape cells.
 * "Fully covered" means every cell of the resource point appears in shapeCells.
 *
 * @param {Array<[number,number]>} shapeCells
 * @param {Array<{id, cells, item, rarity, size}>} resourcePoints
 * @returns {Array<object>} Subset of resourcePoints that are fully covered
 */
export const getCoveredResourcePoints = (shapeCells, resourcePoints) => {
  // Build a Set of "r,c" strings for O(1) lookup
  const covered = new Set(shapeCells.map(([r, c]) => `${r},${c}`));

  return resourcePoints.filter(rp =>
    rp.cells.every(([r, c]) => covered.has(`${r},${c}`))
  );
};

// ---------------------------------------------------------------------------
// 4. selectAvailableShapes
// ---------------------------------------------------------------------------

/**
 * Randomly picks `shapesPerRound` shapes from SHAPE_DEFINITIONS without
 * replacement.
 *
 * @param {number} shapesPerRound
 * @returns {Array<object>} Subset of SHAPE_DEFINITIONS
 */
export const selectAvailableShapes = (shapesPerRound = MATRIX_CONFIG.shapesPerRound) => {
  const pool = [...SHAPE_DEFINITIONS];
  const count = Math.min(shapesPerRound, pool.length);
  const result = [];
  while (result.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
};

// ---------------------------------------------------------------------------
// 5. generateResourceMatrix
// ---------------------------------------------------------------------------

/**
 * Generates a complete matrix state: grid, resourcePoints, anchors.
 *
 * @param {Array<{name,icon,poolId,poolName}>} allNormalItems
 * @returns {{ grid: Array<Array>, resourcePoints: Array, anchors: Array }}
 */
export const generateResourceMatrix = (allNormalItems) => {
  const { gridSize, singleCellCount, doubleCellCount, tripleCellCount, anchorCount } = MATRIX_CONFIG;

  // --- helpers ---
  const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const uid = () => Math.random().toString(36).substr(2, 9);
  const cellKey = (r, c) => `${r},${c}`;

  // 5x5 grid initialised to null
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // Tracks which cells are already claimed by a resource point
  const occupiedByResource = new Set();

  const resourcePoints = [];

  // --- pick a random item ---
  const randomItem = () => {
    const idx = Math.floor(Math.random() * allNormalItems.length);
    const src = allNormalItems[idx];
    return { name: src.name, icon: src.icon, poolId: src.poolId, poolName: src.poolName };
  };

  // --- try to place a multi-cell resource point of `size` cells ---
  const tryPlaceMultiCell = (size) => {
    const MAX_RETRIES = 20;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Pick a random empty starting cell
      const startR = Math.floor(Math.random() * gridSize);
      const startC = Math.floor(Math.random() * gridSize);
      if (occupiedByResource.has(cellKey(startR, startC))) continue;

      // Grow the region to `size` cells along H or V direction
      const direction = Math.random() < 0.5 ? 'h' : 'v';
      const cells = [[startR, startC]];

      let ok = true;
      for (let step = 1; step < size; step++) {
        const [pr, pc] = cells[cells.length - 1];
        const nr = direction === 'v' ? pr + 1 : pr;
        const nc = direction === 'h' ? pc + 1 : pc;
        if (nr >= gridSize || nc >= gridSize || occupiedByResource.has(cellKey(nr, nc))) {
          ok = false;
          break;
        }
        cells.push([nr, nc]);
      }

      if (!ok || cells.length < size) continue;

      // Commit
      const id = uid();
      const item = randomItem();

      cells.forEach(([r, c]) => occupiedByResource.add(cellKey(r, c)));

      resourcePoints.push({ id, cells, item, size });
      return true;
    }
    return false; // could not place
  };

  // --- Generate resource points: triple → double → single ---

  const tripleCount = randomInRange(tripleCellCount[0], tripleCellCount[1]);
  for (let i = 0; i < tripleCount; i++) {
    tryPlaceMultiCell(3);
  }

  const doubleCount = randomInRange(doubleCellCount[0], doubleCellCount[1]);
  for (let i = 0; i < doubleCount; i++) {
    tryPlaceMultiCell(2);
  }

  // Single-cell resource points: pick distinct empty cells
  const singleTarget = randomInRange(singleCellCount[0], singleCellCount[1]);
  const emptyCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!occupiedByResource.has(cellKey(r, c))) emptyCells.push([r, c]);
    }
  }
  // Shuffle
  emptyCells.sort(() => Math.random() - 0.5);
  const singleCount = Math.min(singleTarget, emptyCells.length);
  for (let i = 0; i < singleCount; i++) {
    const [r, c] = emptyCells[i];
    const id = uid();
    const item = randomItem();
    occupiedByResource.add(cellKey(r, c));
    resourcePoints.push({ id, cells: [[r, c]], item, size: 1 });
  }

  // --- Place anchors ---
  // Anchors only go on empty cells (never on resource cells)
  const resourceCellKeys = new Set(resourcePoints.flatMap(rp => rp.cells.map(([r, c]) => cellKey(r, c))));

  const anchorCandidates = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!resourceCellKeys.has(cellKey(r, c))) anchorCandidates.push([r, c]);
    }
  }

  const manhattanDist = ([r1, c1], [r2, c2]) => Math.abs(r1 - r2) + Math.abs(c1 - c2);

  const anchors = [];
  const usedAnchorKeys = new Set();

  for (let i = 0; i < anchorCount && anchorCandidates.length > 0; i++) {
    let bestCell = null;
    let bestScore = -1;

    for (const cell of anchorCandidates) {
      if (usedAnchorKeys.has(cellKey(cell[0], cell[1]))) continue;

      // Score = minimum Manhattan distance to any already-placed anchor
      // (First anchor: any cell scores 0 — pick randomly by tracking a simple pick)
      const score =
        anchors.length === 0
          ? Math.random() // randomise first anchor selection
          : Math.min(...anchors.map(a => manhattanDist(cell, [a.row, a.col])));

      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }

    if (!bestCell) break;
    usedAnchorKeys.add(cellKey(bestCell[0], bestCell[1]));
    anchors.push({ row: bestCell[0], col: bestCell[1] });
  }

  // --- Build grid cell map ---
  // First, resource point cells
  for (const rp of resourcePoints) {
    for (const [r, c] of rp.cells) {
      grid[r][c] = { type: 'resource', resourcePointId: rp.id };
    }
  }

  // Then, anchors (always on empty cells, never overlap resources)
  for (const anchor of anchors) {
    grid[anchor.row][anchor.col] = { type: 'anchor' };
  }

  // Player position: randomly assigned to one of the anchors
  const playerPosition = anchors.length > 0
    ? anchors[Math.floor(Math.random() * anchors.length)]
    : { row: 2, col: 2 };

  return { grid, resourcePoints, anchors, playerPosition };
};
