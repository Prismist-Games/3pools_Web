/**
 * Matrix Configuration - Turn-Based Prototype
 * 4×4 grid. Walls start fully populated with stickers + special cells.
 * Drawn cells become blanks (drawable but no effect) — handled in the hook layer.
 * Items can span 1-4 cells in Tetris-like shapes.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Doom cells: independent cells on the grid (not items)
  doomCells: {
    resolution: {
      icon: '🎲',
      name: '厄运结算',
    },
    accumulation: {
      icon: '☠',
      name: '厄运积累',
    },
  },

  // Special cells: gold, outOfGame, evacuation
  specialCells: {
    gold: {
      icon: '💰',
      name: '金币',
      goldRange: [1, 2],  // random gold amount [min, max]
    },
    outOfGame: {
      icon: '🎁',
      name: '出口物品',
    },
    evacuation: {
      icon: '🚪',
      name: '撤离',
    },
    // --- Instant effect special cells ---
    refresh: {
      icon: '🔄',
      name: '刷新',
    },
    order: {
      icon: '📋',
      name: '订单',
    },
    pass: {
      icon: '🎫',
      name: '通行证',
    },
    shield: {
      icon: '🛡️',
      name: '护盾',
    },
    bomb: {
      icon: '💣',
      name: '炸弹',
    },
    danger_cell: {
      icon: '⚠️',
      name: '危险格',
    },
    backpack: {
      icon: '🎒',
      name: '背包扩容',
    },
    fast_pass: {
      icon: '⏩',
      name: '快速通道',
    },
  },

  // Item shape system — Tetris-like polyominoes
  // Weights control spawn probability (higher = more common)
  // Currently all items are single-cell; multi-cell shapes are kept for future use.
  itemShapes: {
    weights: { 1: 1 },
    // Shapes as [row, col] offsets from origin
    shapes: {
      1: [
        [[0,0]],
      ],
      2: [
        [[0,0],[0,1]],
        [[0,0],[1,0]],
      ],
      3: [
        [[0,0],[0,1],[0,2]],
        [[0,0],[1,0],[2,0]],
        [[0,0],[1,0],[1,1]],
        [[0,0],[0,1],[1,0]],
        [[0,0],[0,1],[1,1]],
        [[0,1],[1,0],[1,1]],
      ],
      4: [
        [[0,0],[0,1],[0,2],[0,3]],  // I
        [[0,0],[1,0],[2,0],[3,0]],  // I vertical
        [[0,0],[0,1],[1,0],[1,1]],  // O
        [[0,0],[0,1],[0,2],[1,1]],  // T
        [[0,0],[1,0],[1,1],[2,0]],  // T rot
        [[0,1],[1,0],[1,1],[1,2]],  // T rot
        [[0,1],[1,0],[1,1],[2,1]],  // T rot
        [[0,1],[0,2],[1,0],[1,1]],  // S
        [[0,0],[0,1],[1,1],[1,2]],  // Z
        [[0,0],[1,0],[2,0],[2,1]],  // L
        [[0,0],[0,1],[0,2],[1,0]],  // L rot
        [[0,0],[0,1],[1,1],[2,1]],  // L rot
        [[0,2],[1,0],[1,1],[1,2]],  // L rot
        [[0,1],[1,1],[2,0],[2,1]],  // J
        [[0,0],[1,0],[1,1],[1,2]],  // J rot
        [[0,0],[0,1],[1,0],[2,0]],  // J rot
        [[0,0],[0,1],[0,2],[1,2]],  // J rot
      ],
    },
  },
};
