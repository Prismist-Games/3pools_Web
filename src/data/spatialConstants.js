// src/data/spatialConstants.js
// Spatial pool system constants.

import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, FATE_DICE_CONFIG } from './constants.js';

// --- Flat item list (all 20 items) ---
export const ALL_ITEMS = INITIAL_POOLS_DATA.flatMap(pool =>
  pool.items.map(item => ({
    name: item.name,
    icon: item.icon,
    poolId: pool.id,
    poolName: pool.name,
  }))
);

// --- Fixed 2×2 shape ---
// All draws use a fixed 2×2 square. No shape variety.
export const FIXED_SHAPE = {
  cells: [[0, 0], [0, 1], [1, 0], [1, 1]],
  coverageCount: 4,
};

// --- Quality effects (from affixes, excluding 'targeted') ---
export const QUALITY_EFFECTS = INITIAL_AFFIXES_CONFIG.filter(a => a.id !== 'targeted');

// --- Cost = affix cost (same as original system) ---
// With fixed 2×2, cost is purely determined by quality effect.

// --- Map dimensions ---
// 3×4 grid: 12 random items from 20.
// Only the 4 cells covered by the 2×2 placement refresh each draw.
export const MAP_ROWS = 3;
export const MAP_COLS = 4;

// --- Effect cells ---
// Number of effect slots placed on the map.
export const EFFECT_SLOT_COUNT = 3;

/** Default draw config when no effect cell is in the 2×2 frame */
export const DEFAULT_DRAW = { id: null, cost: 1 };

// --- Fate dice config re-export for spatial system ---
export { FATE_DICE_CONFIG };
