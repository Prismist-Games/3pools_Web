/**
 * Matrix Configuration - Turn-Based Prototype
 * 4×4 grid. Each cell is an independent item or a doom/special cell.
 */

// 抢菜人符号池——非特定职业、有色的人像 Emoji（剔除 👤/👥 黑色剪影）。
// 抽中厄运 / doom grid 的 danger 格都从此池随机一个显示，替代原本的 💀 / ☠。
export const DOOM_EMOJI_POOL = [
    '🧑', '👨', '👩', '🧒', '👦', '👧',
    '👶', '🧓', '👴', '👵', '🧔',
];

export function pickDoomEmoji() {
    return DOOM_EMOJI_POOL[Math.floor(Math.random() * DOOM_EMOJI_POOL.length)];
}

export const MATRIX_CONFIG = {
  gridSize: 4,

  // Doom cells: independent cells on the grid (not items). Rolled in the
  // same per-cell pass as other special cells (gold/order/bomb/etc.).
  doomCells: {
    resolution: {
      spawnChance: 0.15,  // 15% per cell position — ~2.4 per 16-cell wall
      icon: '💀',
      name: '抢菜人',
    },
  },

  // Special cells: gold, order, outOfGame
  specialCells: {
    gold: {
      spawnChance: 0.03,  // 3% per cell position
      icon: '🎫',
      name: '抽数',
      goldRange: [1, 2],  // random draw-count amount [min, max]
    },
    order: {
      spawnChance: 0.07,  // 7% per cell position
      icon: '📋',
      name: '订单',
    },
    outOfGame: {
      spawnChance: 0.02,  // 2% per cell position
      icon: '🎁',
      name: '食材',
    },
    bomb: {
      spawnChance: 0.05,  // 5% per cell position
      icon: '💣',
      name: '炸弹',
    },
    buffField: {
      spawnChance: 0.05,  // 5% per cell position
      icon: '🪧',
      name: '买一送一立牌',
    },
    loudmouth: {
      spawnChance: 0.05,   // 5% per cell position, capped by maxPerWall
      maxPerWall: 1,
      icon: '📢',
      name: '大嗓门',
    },
    slime: {
      spawnChance: 0.05,  // 5% per cell position — 甩不掉的负面占位物
      icon: '🫠',
      name: '黏糊糊的一摊',
    },
  },
};
