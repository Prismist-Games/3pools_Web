// --- 里程碑网格系统配置 ---

export const GRID_CONFIG = {
  canvasSize: 5,
  cellCount: { min: 8, max: 12 },
  taskCount: { min: 3, max: 5 },
  taskSize: { min: 2, max: 4 },
  evacuationCellCount: 1,
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
];
