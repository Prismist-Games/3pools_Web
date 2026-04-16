/**
 * Matrix Configuration - Turn-Based Prototype
 * 4×4 grid. Each cell is an independent item or a doom/special cell.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Doom cells: independent cells on the grid (not items). Rolled in the
  // same per-cell pass as other special cells (gold/order/bomb/etc.).
  doomCells: {
    resolution: {
      spawnChance: 0.20,  // 20% per cell position — ~3.2 per 16-cell wall
      icon: '💀',
      name: '厄运结算',
    },
    upgrade: {
      spawnChance: 0,  // disabled — 厄运升级 no longer spawns on random walls
      icon: '⚠️',
      name: '厄运升级',
    },
  },

  // Special cells: gold, order, outOfGame
  specialCells: {
    gold: {
      spawnChance: 0.06,  // 6% per cell position
      icon: '🎫',
      name: '抽数',
      goldRange: [1, 2],  // random draw-count amount [min, max]
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
    buffField: {
      spawnChance: 0,  // not spawned on random walls — only via modifiers
      icon: '🌽',
      name: '膨化格',
    },
  },
};
