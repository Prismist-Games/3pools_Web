/**
 * Matrix Configuration v3
 * 4×4 grid for row/column selection system.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Special cell counts per board (min/max, uniform random)
  specialCells: {
    goldPenalty: {
      min: 3,
      max: 5,           // ~4 average
      minCost: 1,
      maxCost: 3,
      icon: '🪙',
      name: '金币陷阱',
    },
    bomb: {
      min: 1,
      max: 3,            // ~2 average
      icon: '💣',
      name: '炸弹',
    },
  },
};
