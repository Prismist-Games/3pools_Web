/**
 * Matrix Configuration
 * Defines shapes and grid parameters for the 5x5 resource matrix system
 */

export const SHAPE_DEFINITIONS = [
  {
    id: 'short_line',
    name: '短线',
    cells: {
      h: [[0, 0], [0, 1]],
      v: [[0, 0], [1, 0]],
    },
    size: 2,
    cost: 1,
    hasOrientation: true,
    icon: '━',
  },
  {
    id: 'long_line',
    name: '长线',
    cells: {
      h: [[0, 0], [0, 1], [0, 2]],
      v: [[0, 0], [1, 0], [2, 0]],
    },
    size: 3,
    cost: 2,
    hasOrientation: true,
    icon: '━',
  },
  {
    id: 'square',
    name: '方块',
    cells: {
      default: [[0, 0], [0, 1], [1, 0], [1, 1]],
    },
    size: 4,
    cost: 2,
    hasOrientation: false,
    icon: '■',
  },
  {
    id: 'long_rod',
    name: '长杆',
    cells: {
      h: [[0, 0], [0, 1], [0, 2], [0, 3]],
      v: [[0, 0], [1, 0], [2, 0], [3, 0]],
    },
    size: 4,
    cost: 3,
    hasOrientation: true,
    icon: '━',
  },
  {
    id: 'cross',
    name: '十字',
    cells: {
      default: [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]],
    },
    size: 5,
    cost: 3,
    hasOrientation: false,
    icon: '✚',
  },
];

export const MATRIX_CONFIG = {
  gridSize: 5,
  singleCellCount: [6, 7],
  doubleCellCount: [2, 3],
  tripleCellCount: [1, 1],
  anchorCount: 3,
  shapesPerRound: 3,
  totalShapes: 5,
};
