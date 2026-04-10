/**
 * Matrix Configuration - Turn-Based Prototype
 * 4×4 grid. Each cell is an independent item or a doom/special cell.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

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

  // Special cells: gold, order, outOfGame
  specialCells: {
    gold: {
      spawnChance: 0.06,  // 6% per cell position
      icon: '💰',
      name: '金币',
      goldRange: [1, 2],  // random gold amount [min, max]
    },
    order: {
      spawnChance: 0.04,  // 4% per cell position
      icon: '📋',
      name: '订单',
    },
    outOfGame: {
      spawnChance: 0.02,  // 2% per cell position
      icon: '🎁',
      name: '食材',
    },
    bomb: {
      spawnChance: 0.04,  // 4% per cell position
      icon: '💣',
      name: '炸弹',
    },
  },
};
