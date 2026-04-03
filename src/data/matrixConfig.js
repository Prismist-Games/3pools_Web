/**
 * Matrix Configuration - Turn-Based Prototype
 * 5×5 grid. Each cell is an item or a doom cell.
 * Grid fully refreshes each turn (no gravity).
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
};
