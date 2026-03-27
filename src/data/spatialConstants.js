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

// --- Quality effects (from affixes, excluding 'targeted') ---
export const QUALITY_EFFECTS = INITIAL_AFFIXES_CONFIG.filter(a => a.id !== 'targeted');

// --- Map dimensions ---
// 4×4 grid: 13 items + 3 effects from 20.
// Only the 4 cells covered by the 2×2 placement refresh each draw.
export const MAP_ROWS = 4;
export const MAP_COLS = 4;

// --- Effect cells ---
// Number of effect slots placed on the map.
export const EFFECT_SLOT_COUNT = 3;

/** Default draw config when no effect cell is in the 2×2 frame */
export const DEFAULT_DRAW = { id: null };

// --- Bad Luck Token ---
export const BAD_LUCK_TOKEN = {
  name: 'BAD LUCK TOKEN',
  icon: '💀',
  isBadLuck: true,
};

/** Number of BAD LUCK TOKEN cells on initial map generation */
export const BAD_LUCK_TOKEN_INITIAL_COUNT = 2;

/** Chance that a refreshed item cell becomes a BAD LUCK TOKEN */
export const BAD_LUCK_TOKEN_REFRESH_CHANCE = 0.12;

/** Collecting this many tokens triggers forced evacuation check */
export const BAD_LUCK_TOKEN_MAX = 6;
