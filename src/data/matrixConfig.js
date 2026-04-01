/**
 * Matrix Configuration v3
 * 4×4 grid for row/column selection system.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Special cell counts per board (min/max, uniform random)
  specialCells: {
    bomb: {
      min: 1,
      max: 3,            // ~2 average
      icon: '💣',
      name: '炸弹',
    },
  },
};
