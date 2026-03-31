/**
 * Matrix Configuration v5
 * 4×4 grid for row/column selection system.
 * All cells are normal items or bombs. Doom events are invisible auto-events during refresh.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Bomb: independent special cell
  bomb: {
    min: 1,
    max: 3,            // ~2 average per initial board
    refillChance: 0.08, // 8% chance on gravity refill
    icon: '💣',
    name: '炸弹',
  },

  // Doom events (invisible, during gravity refill)
  doom: {
    loadChance: 0.05,    // 5% per new cell: add danger to doom grid (装弹)
    triggerChance: 0.10,  // 10% per refresh event: trigger doom resolution (开枪)
  },
};
