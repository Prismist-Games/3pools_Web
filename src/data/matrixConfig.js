/**
 * Matrix Configuration v3
 * 4×4 grid for row/column selection system.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Special cell counts per board (min/max, uniform random)
  specialCells: {
    doomDanger: {
      min: 1,
      max: 2,           // ~1.5 average, ~10% of 16 cells
      icon: '☠️',
      name: '危险',
      desc: '抽到时加入厄运网格，增加一个危险格子',
    },
    bomb: {
      min: 1,
      max: 3,            // ~2 average
      icon: '💣',
      name: '炸弹',
    },
  },
};
