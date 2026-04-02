/**
 * Matrix Configuration v3
 * 4×4 grid for row/column selection system.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Special cell counts per board (min/max, uniform random)
  specialCells: {
    goldPenalty: {
      min: 1,
      max: 2,           // ~1.5 average (~10% of 16)
      minCost: 1,
      maxCost: 3,
      icon: '🪙',
      name: '金币陷阱',
    },
    bomb: {
      min: 1,
      max: 2,            // ~1.5 average (~10% of 16)
      icon: '💣',
      name: '炸弹',
    },
  },
};
