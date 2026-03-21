// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system: map generation, shape rotation,
// frame generation, and coverage calculation.

import {
  ALL_ITEMS,
  BASE_SHAPES,
  QUALITY_EFFECTS,
  MAP_ROWS,
  MAP_COLS,
  MAP_ITEMS,
  MIN_COVERAGE_EFFECTS,
  calculateFrameCost,
} from '../data/spatialConstants.js';

// --- Shape rotation ---

/**
 * Rotate shape cells 90° clockwise: [r, c] → [c, -r]
 * Then normalize so min row/col is 0.
 */
function rotateCells90(cells) {
  const rotated = cells.map(([r, c]) => [c, -r]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC]);
}

/**
 * Generate a canonical string key for a set of cells (for dedup).
 */
function cellsKey(cells) {
  const sorted = [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return sorted.map(([r, c]) => `${r},${c}`).join('|');
}

/**
 * Get all unique rotations of a base shape.
 * Returns array of cell arrays.
 */
export function getUniqueRotations(baseCells) {
  const seen = new Set();
  const rotations = [];
  let current = baseCells;
  for (let i = 0; i < 4; i++) {
    const key = cellsKey(current);
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push([...current.map(c => [...c])]);
    }
    current = rotateCells90(current);
  }
  return rotations;
}

// --- Pre-computed shape variants ---
let _allShapeVariants = null;

export function getAllShapeVariants() {
  if (_allShapeVariants) return _allShapeVariants;
  _allShapeVariants = [];
  for (const base of BASE_SHAPES) {
    const rotations = getUniqueRotations(base.cells);
    for (let ri = 0; ri < rotations.length; ri++) {
      const raw = rotations[ri];
      // Re-anchor: make cells[0] the origin [0,0].
      const anchor = raw[0];
      const cells = raw.map(([r, c]) => [r - anchor[0], c - anchor[1]]);
      _allShapeVariants.push({
        baseId: base.id,
        name: base.name,
        cells,
        coverageCount: cells.length,
        rotationIndex: ri,
      });
    }
  }
  return _allShapeVariants;
}

// --- Item map generation ---

/**
 * Generate a random 3×4 item map by picking 12 random items from all 20.
 * Returns a 2D array [row][col] of item objects.
 * Regenerated every draw — each item has 12/20 = 60% equal appearance chance.
 */
export function generateItemMap() {
  const shuffled = [...ALL_ITEMS];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Take first 12
  const selected = shuffled.slice(0, MAP_ITEMS);
  const grid = [];
  let idx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push(selected[idx++]);
    }
    grid.push(row);
  }
  return grid;
}

// --- Frame generation ---

/**
 * Generate 3 random frames with unique quality effects.
 */
export function generateFrames() {
  const allVariants = getAllShapeVariants();
  const frames = [];
  const usedEffectIds = new Set();

  for (let i = 0; i < 3; i++) {
    let shape = allVariants[Math.floor(Math.random() * allVariants.length)];

    let availableEffects = QUALITY_EFFECTS.filter(e => {
      if (usedEffectIds.has(e.id)) return false;
      if (MIN_COVERAGE_EFFECTS.has(e.id) && shape.coverageCount < 2) return false;
      return true;
    });

    if (availableEffects.length === 0) {
      const bigVariants = allVariants.filter(v => v.coverageCount >= 2);
      shape = bigVariants[Math.floor(Math.random() * bigVariants.length)];
      availableEffects = QUALITY_EFFECTS.filter(e => !usedEffectIds.has(e.id));
    }

    const effect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
    usedEffectIds.add(effect.id);
    frames.push({
      shape,
      qualityEffect: effect,
      cost: calculateFrameCost(shape.coverageCount, effect.id),
    });
  }

  return frames;
}

// --- Coverage calculation ---

/**
 * Given a shape and an anchor position, return the grid cells covered.
 * Returns null if any cell would be out of bounds.
 */
export function getFrameCoverage(shape, anchorRow, anchorCol, itemMap) {
  const covered = [];
  for (const [dr, dc] of shape.cells) {
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
 * Check if a placement is valid (all shape cells within grid bounds).
 */
export function isValidPlacement(shape, anchorRow, anchorCol) {
  for (const [dr, dc] of shape.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) {
      return false;
    }
  }
  return true;
}
