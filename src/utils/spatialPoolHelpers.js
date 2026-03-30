// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  QUALITY_EFFECTS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  FATE_DICE_CONFIG,
} from '../data/spatialConstants.js';

// --- Cell generation helper ---

/** Pick a random effect cell. */
function randomEffectCell() {
  const effect = QUALITY_EFFECTS[Math.floor(Math.random() * QUALITY_EFFECTS.length)];
  return { isEffect: true, effect };
}

/**
 * Generate a single random cell.
 * @param {Set<string>|null} neededNames - if provided, items not in this set are replaced with effects.
 */
export function randomCell(neededNames = null) {
  // Fate dice chance first (unchanged)
  if (Math.random() < FATE_DICE_CONFIG.spawnChance) {
    return { isFateDice: true, icon: FATE_DICE_CONFIG.icon, name: FATE_DICE_CONFIG.name };
  }
  // Pick a random item
  const item = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  // If we have needed names and this item isn't needed, replace with effect
  if (neededNames && !neededNames.has(item.name)) {
    return randomEffectCell();
  }
  return item;
}

// --- Item map generation ---

/**
 * Generate the item map grid.
 * @param {Set<string>|null} neededNames - items not needed are replaced with effects.
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
 * @param {Set<string>|null} neededNames - items not needed are replaced with effects.
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
