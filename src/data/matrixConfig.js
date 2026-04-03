/**
 * Matrix Configuration - Turn-Based Prototype
 * 5×5 grid. Each cell is an item or a doom cell.
 * Items can span 1-4 cells in Tetris-like shapes.
 */

export const MATRIX_CONFIG = {
  gridSize: 5,

  // Doom cells: independent cells on the grid (not items)
  doomCells: {
    resolution: {
      spawnChance: 0.10,  // 10% per cell position
      icon: '💀',
      name: '厄运结算',
    },
    upgrade: {
      spawnChance: 0.10,  // 10% per cell position
      icon: '⬆️',
      name: '厄运升级',
    },
  },

  // Item shape system — Tetris-like polyominoes
  // Weights control spawn probability (higher = more common)
  itemShapes: {
    weights: { 1: 60, 2: 25, 3: 10, 4: 5 },
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
