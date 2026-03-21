/**
 * Matrix Configuration v2
 * Shapes defined relative to machine position with "facing up" as base orientation.
 * Machine direction (0=up, 1=right, 2=down, 3=left) is used as rotation.
 * Pivot is always [0,0] = machine's position.
 */

// Shapes: cells defined as [row, col] offsets from machine, facing UP.
// "Forward" = [-1, 0] (up), "Right" = [0, 1], etc.
// When machine faces right/down/left, cells are rotated accordingly.
export const SHAPE_DEFINITIONS = [
  {
    id: 'short_line',
    name: '短线',
    desc: '机器 + 前方1格',
    cells: [[0, 0], [-1, 0]],
    pivot: [0, 0],
    size: 2,
    icon: '━',
  },
  {
    id: 'long_line',
    name: '长线',
    desc: '机器 + 前方2格',
    cells: [[0, 0], [-1, 0], [-2, 0]],
    pivot: [0, 0],
    size: 3,
    icon: '━',
  },
  {
    id: 'square',
    name: '方块',
    desc: '机器 + 前+右+前右 (2×2)',
    cells: [[0, 0], [-1, 0], [0, 1], [-1, 1]],
    pivot: [0, 0],
    size: 4,
    icon: '■',
  },
  {
    id: 'long_rod',
    name: '长杆',
    desc: '机器 + 前方3格',
    cells: [[0, 0], [-1, 0], [-2, 0], [-3, 0]],
    pivot: [0, 0],
    size: 4,
    icon: '┃',
  },
  {
    id: 'cross',
    name: '十字',
    desc: '机器 + 前后左右各1格',
    cells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
    pivot: [0, 0],
    size: 5,
    icon: '✚',
  },
];

export const MATRIX_CONFIG = {
  gridSize: 5,
  // v2: full density — every cell has a resource, but some are multi-cell
  doubleCellCount: [2, 3],
  tripleCellCount: [0, 1],
};

// Action card system
export const ACTION_TYPES = {
  MOVE: 'move',
  TURN: 'turn',
  ADJUST: 'adjust',
};

export const ACTION_CARD_CONFIG = {
  cardsPerTurn: 5,
  actionsPerTurn: 3,
  probabilities: {
    [ACTION_TYPES.MOVE]: 0.5,
    [ACTION_TYPES.TURN]: 0.3,
    [ACTION_TYPES.ADJUST]: 0.2,
  },
};

export const ACTION_CARD_DEFS = {
  [ACTION_TYPES.MOVE]: {
    name: '前进',
    desc: '沿朝向移动1格',
    icon: '⬆️',
  },
  [ACTION_TYPES.TURN]: {
    name: '转向',
    desc: '顺时针旋转90°',
    icon: '↩️',
  },
  [ACTION_TYPES.ADJUST]: {
    name: '调整范围',
    desc: '切换搜刮形状',
    icon: '🔄',
  },
};

// Direction constants
export const DIRECTIONS = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
};

export const DIRECTION_NAMES = ['上', '右', '下', '左'];
export const DIRECTION_ARROWS = ['↑', '→', '↓', '←'];
// Movement delta per direction: [dRow, dCol]
export const DIRECTION_DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]];
