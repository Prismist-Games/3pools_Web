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

  // Doom events (during gravity refill)
  doom: {
    markChance: 0.15,      // 15% per new cell: doom mark → triggers doom resolution (开枪)
    autoLoadChance: 0.10,  // 10% per new cell: auto-add danger to doom grid (装弹)
  },
};
