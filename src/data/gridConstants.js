// --- 里程碑网格系统配置 ---

export const GRID_CONFIG = {
  canvasSize: 5,
  cellCount: { min: 8, max: 12 },
  taskCount: { min: 3, max: 5 },
  taskSize: { min: 2, max: 4 },
  evacuationCellCount: 1,
  initialRevealCount: 2,
};

export const CELL_SCORE_WEIGHTS = {
  common: 2,
  uncommon: 2.5,
  rare: 4,
  epic: 8,
  legendary: 16,
  mythic: 32,
};

export const TASK_GOLD_REWARD = 3;

export const CELL_RARITY_WEIGHTS = {
  common: 0.40,
  uncommon: 0.35,
  rare: 0.20,
  epic: 0.05,
  legendary: 0,
  mythic: 0,
};

export const TASK_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

// Probability that a cell gets a reward
export const CELL_REWARD_CHANCE = 0.3;

// Rarity background colors (subtle, for cell backgrounds)
export const RARITY_BG_COLORS = {
  common: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)' },
  uncommon: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
  rare: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
  epic: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)' },
  legendary: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
  mythic: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
};
