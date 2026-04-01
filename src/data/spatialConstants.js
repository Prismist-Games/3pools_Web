// src/data/spatialConstants.js
// Spatial pool system constants.

import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG } from './constants.js';

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

// --- Quality effects (all affixes available in spatial system) ---
export const QUALITY_EFFECTS = INITIAL_AFFIXES_CONFIG;

// --- Map dimensions ---
// 4×4 grid: 16 cells with random items from needed pool.
// Only the 4 cells covered by the 2×2 placement refresh each draw.
export const MAP_ROWS = 3;
export const MAP_COLS = 4;

/** Default draw config when no effect cell is in the 2×2 frame */
export const DEFAULT_DRAW = { id: null, cost: 1 };

// --- Effect item icons (for inventory display) ---
export const EFFECT_ITEM_ICONS = {
  trade_in: '🔄',
  hardened: '🛡️',
  purified: '💎',
  fragmented: '💥',
  precise: '🎯',
  targeted: '🎯',
};
