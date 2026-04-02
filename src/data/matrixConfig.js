/**
 * Matrix Configuration v3
 * 4×4 grid for row/column selection system.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Special cell counts per board (min/max, uniform random)
  specialCells: {
    goldPenalty: {
      min: 2,
      max: 3,           // ~2.5 average (~15% of 16)
      minCost: 1,
      maxCost: 3,
      icon: '🪙',
      name: '金币陷阱',
    },
    bomb: {
      min: 2,
      max: 3,            // ~2.5 average (~15% of 16)
      icon: '💣',
      name: '炸弹',
    },
  },
};
