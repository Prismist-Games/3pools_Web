// src/utils/spatialPoolHelpers.js
// Pure functions for spatial pool system.

import {
  ALL_ITEMS,
  QUALITY_EFFECTS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
} from '../data/spatialConstants.js';

// --- Item map generation ---

/**
 * Generate a 3×4 item map with 12 random items from all 20.
 * Called on game start and on evacuation.
 */
export function generateItemMap() {
  const shuffled = [...ALL_ITEMS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const grid = [];
  let idx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      row.push(shuffled[idx++]);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Refresh only the cells covered by a 2×2 placement.
 * Replaced cells get random items from the full 20-item pool.
 * Returns a new map (does not mutate).
 */
export function refreshCoveredCells(itemMap, anchorRow, anchorCol) {
  const newMap = itemMap.map(row => [...row]);
  for (const [dr, dc] of FIXED_SHAPE.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
      newMap[r][c] = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
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
