// src/data/spatialConstants.js
// Shape definitions, quality effects, and cost calculation for the spatial pool system.

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

// --- Base shape definitions ---
// cells are [row, col] offsets from anchor (top-left origin)
export const BASE_SHAPES = [
  {
    id: 'single',
    name: '单格',
    cells: [[0, 0]],
  },
  {
    id: 'domino',
    name: '双格',
    cells: [[0, 0], [0, 1]],
  },
  {
    id: 'tromino_line',
    name: '三连',
    cells: [[0, 0], [0, 1], [0, 2]],
  },
  {
    id: 'tromino_l',
    name: 'L形',
    cells: [[0, 0], [1, 0], [1, 1]],
  },
  {
    id: 'tetromino_square',
    name: '方块',
    cells: [[0, 0], [0, 1], [1, 0], [1, 1]],
  },
  {
    id: 'tetromino_t',
    name: 'T形',
    cells: [[0, 0], [0, 1], [0, 2], [1, 1]],
  },
];

// --- Quality effects (adapted from affixes, excluding 'targeted') ---
// 'targeted' is removed — its function is replaced by small shapes.
export const QUALITY_EFFECTS = INITIAL_AFFIXES_CONFIG.filter(a => a.id !== 'targeted');

// --- Cost calculation ---
// Cost = shape base cost (by coverage count) + quality effect premium
export const SHAPE_BASE_COSTS = {
  1: 4, // single cell — maximum name precision
  2: 3,
  3: 2,
  4: 1, // 4 cells — least precision
};

export const QUALITY_PREMIUMS = {
  trade_in: 0,
  volatile: 0,
  fragmented: 0,
  hardened: 1,
  precise: 1,
  purified: 2,
};

export function calculateFrameCost(coverageCount, qualityEffectId) {
  const baseCost = SHAPE_BASE_COSTS[coverageCount] ?? 1;
  const premium = QUALITY_PREMIUMS[qualityEffectId] ?? 0;
  return baseCost + premium;
}

// --- Generation constraints ---
// These quality effects require coverage >= 2
export const MIN_COVERAGE_EFFECTS = new Set(['trade_in', 'precise']);

// --- Map dimensions ---
export const MAP_ROWS = 5;
export const MAP_COLS = 4;

// --- Closure configurations ---
// Each config is an array of [row, col] pairs (8 cells to close).
// Horizontal: close 2 adjacent full rows (4 configs)
// Vertical: close 2 edge columns for 4 consecutive rows, leaving 1 "bridge" row (4 configs)
export const CLOSURE_CONFIGS = [];

// Horizontal: close 2 adjacent rows
for (let startRow = 0; startRow <= 3; startRow++) {
  const cells = [];
  for (let r = startRow; r < startRow + 2; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      cells.push([r, c]);
    }
  }
  CLOSURE_CONFIGS.push(cells);
}

// Vertical: close 2 edge columns for 4 consecutive rows
for (const colPair of [[0, 1], [2, 3]]) {
  for (let startRow = 0; startRow <= 1; startRow++) {
    const cells = [];
    for (let r = startRow; r < startRow + 4; r++) {
      for (const c of colPair) {
        cells.push([r, c]);
      }
    }
    CLOSURE_CONFIGS.push(cells);
  }
}
