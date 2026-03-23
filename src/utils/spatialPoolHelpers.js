// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  QUALITY_EFFECTS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  EFFECT_SLOT_COUNT,
} from '../data/spatialConstants.js';

// --- Effect cell helpers ---

/**
 * Pick EFFECT_SLOT_COUNT positions on the grid with spacing constraint:
 * no two positions share a 2×2 block (i.e., for any pair,
 * |row diff| >= 2 OR |col diff| >= 2).
 */
export function generateEffectPositions() {
  const allCells = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      allCells.push([r, c]);
    }
  }
  // Shuffle
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }
  const positions = [];
  for (const [r, c] of allCells) {
    if (positions.length >= EFFECT_SLOT_COUNT) break;
    const valid = positions.every(([pr, pc]) =>
      Math.abs(pr - r) >= 2 || Math.abs(pc - c) >= 2
    );
    if (valid) positions.push([r, c]);
  }
  // Greedy pick can fail with unlucky shuffle order — retry
  if (positions.length < EFFECT_SLOT_COUNT) return generateEffectPositions();
  return positions;
}

/**
 * Pick `count` unique random quality effects from QUALITY_EFFECTS.
 * Returns array of effect config objects.
 */
export function pickRandomEffects(count) {
  const shuffled = [...QUALITY_EFFECTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// --- Item map generation ---

/**
 * Generate a 3×4 item map with effect cells and random items.
 * Effect cells have { isEffect: true, effect: ... }.
 * Called on game start and on evacuation.
 */
export function generateItemMap() {
  // 1. Generate effect slot positions with spacing constraint
  const effectPositions = generateEffectPositions();
  const effects = pickRandomEffects(effectPositions.length);
  const effectSet = new Set(effectPositions.map(([r, c]) => `${r},${c}`));

  // 2. Shuffle items for non-effect cells
  const shuffled = [...ALL_ITEMS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3. Build grid
  const grid = [];
  let itemIdx = 0;
  let effectIdx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (effectSet.has(`${r},${c}`)) {
        row.push({ isEffect: true, effect: effects[effectIdx++] });
      } else {
        row.push(shuffled[itemIdx++ % shuffled.length]);
      }
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Refresh item cells covered by a 2×2 placement.
 * Effect cells are skipped (handled by refreshAllEffects).
 */
export function refreshCoveredCells(itemMap, anchorRow, anchorCol) {
  const newMap = itemMap.map(row => [...row]);
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue;
    if (newMap[r][c].isEffect) continue; // Skip effect cells
    newMap[r][c] = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  }
  return newMap;
}

/**
 * Refresh all effect cell contents on the map (positions unchanged).
 * Returns a new map.
 */
export function refreshAllEffects(itemMap) {
  const newMap = itemMap.map(row => [...row]);
  const newEffects = pickRandomEffects(EFFECT_SLOT_COUNT);
  let idx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (newMap[r][c].isEffect) {
        newMap[r][c] = { isEffect: true, effect: newEffects[idx++] };
      }
    }
  }
  return newMap;
}

// --- Frame generation ---

/**
 * Generate 3 quality effects (no shape variety — always 2×2).
 * Each frame: { qualityEffect, cost }
 */
export function generateFrames() {
  const frames = [];
  const usedIds = new Set();

  for (let i = 0; i < 3; i++) {
    const available = QUALITY_EFFECTS.filter(e => !usedIds.has(e.id));
    const effect = available[Math.floor(Math.random() * available.length)];
    usedIds.add(effect.id);
    frames.push({
      qualityEffect: effect,
      cost: effect.cost,
    });
  }

  return frames;
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
