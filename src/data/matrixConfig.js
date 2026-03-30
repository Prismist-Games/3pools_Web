/**
 * Matrix Configuration v4
 * 4×4 grid for row/column selection system.
 * All cells are normal items. Some may carry doom marks.
 */

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Doom mark: probability that a generated item carries a danger mark
  doomMarkChance: 0.15, // ~15% of items get a danger mark

  // Bomb: independent special cell
  bomb: {
    min: 1,
    max: 3,            // ~2 average per initial board
    refillChance: 0.08, // 8% chance on gravity refill
    icon: '💣',
    name: '炸弹',
  },
};
