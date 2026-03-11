import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG } from './constants';

// --- Build item lookup from pool data for transformation building outputs ---
const ITEM_LOOKUP = {};
for (const pool of INITIAL_POOLS_DATA) {
  for (const item of pool.items) {
    ITEM_LOOKUP[item.name] = { ...item, category: pool.id };
  }
}
export { ITEM_LOOKUP };

// --- Building Definitions ---
// ALL buildings use multi-recipe system.
// Production buildings: recipes produce prosperity (flat value)
// Transformation buildings: recipes produce items
export const BUILDING_DEFINITIONS = [
  // === Production T0 (build cost: uncommon x2) ===
  {
    id: 'fruit_stand', name: '水果摊', tier: 0, type: 'production',
    buildCost: [{ name: '苹果', minRarity: 'uncommon' }, { name: '芒果', minRarity: 'uncommon' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '芒果', minRarity: 'uncommon' }, { name: '砧板' }], useOutput: { prosperity: 1 } },
      { stars: 1, useCondition: [{ name: '苹果' }, { name: '菜刀' }], useOutput: { prosperity: 1 } },
      { stars: 2, useCondition: [{ name: '西瓜' }, { name: '汤勺' }], useOutput: { prosperity: 2 } },
    ],
  },
  {
    id: 'clinic', name: '诊所', tier: 0, type: 'production',
    buildCost: [{ name: '胶囊', minRarity: 'uncommon' }, { name: '滴眼液', minRarity: 'uncommon' }],
    recipes: [
      { stars: 2, useCondition: [{ name: '胶囊', minRarity: 'uncommon' }, { name: '柠檬' }], useOutput: { prosperity: 3 } },
    ],
  },
  {
    id: 'herbal_kitchen', name: '药膳坊', tier: 0, type: 'production',
    buildCost: [{ name: '芒果', minRarity: 'uncommon' }, { name: '注射器', minRarity: 'uncommon' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '芒果', minRarity: 'uncommon' }, { name: '冲剂' }], useOutput: { prosperity: 1 } },
      { stars: 2, useCondition: [{ name: '冲剂', minRarity: 'uncommon' }, { name: '注射器' }], useOutput: { prosperity: 2 } },
    ],
  },

  // === Transformation T0 (build cost: uncommon x2) ===
  {
    id: 'juice_shop', name: '榨汁坊', tier: 0, type: 'transformation',
    buildCost: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '汤勺', minRarity: 'uncommon' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '苹果' }, { name: '冲剂' }], useOutput: { item: { name: '西瓜', category: 'fruit', rarity: 'uncommon' } } },
      { stars: 2, useCondition: [{ name: '柠檬', minRarity: 'uncommon' }], useOutput: { item: { name: '芒果', category: 'fruit', rarity: 'rare' } } },
    ],
  },
  {
    id: 'processing_room', name: '炮制房', tier: 0, type: 'transformation',
    buildCost: [{ name: '冲剂', minRarity: 'uncommon' }, { name: '胶囊', minRarity: 'uncommon' }],
    recipes: [
      { stars: 2, useCondition: [{ name: '注射器', minRarity: 'uncommon' }], useOutput: { item: { name: '胶囊', category: 'medicine', rarity: 'rare' } } },
      { stars: 2, useCondition: [{ name: '滴眼液', minRarity: 'uncommon' }], useOutput: { item: { name: '冲剂', category: 'medicine', rarity: 'rare' } } },
    ],
  },
  {
    id: 'sharpening_shop', name: '磨刀铺', tier: 0, type: 'transformation',
    buildCost: [{ name: '平底锅', minRarity: 'uncommon' }, { name: '汤勺', minRarity: 'uncommon' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '菜刀' }, { name: '砧板' }], useOutput: { item: { name: '平底锅', category: 'kitchenware', rarity: 'uncommon' } } },
    ],
  },

  // === Production T1 (build cost: rare x2) ===
  {
    id: 'food_stall', name: '大排档', tier: 1, type: 'production',
    buildCost: [{ name: '芒果', minRarity: 'rare' }, { name: '注射器', minRarity: 'rare' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '菜刀' }, { name: '芒果' }], useOutput: { prosperity: 1 } },
      { stars: 3, useCondition: [{ name: '平底锅', minRarity: 'uncommon' }, { name: '汤勺' }], useOutput: { prosperity: 3 } },
    ],
  },
  {
    id: 'print_shop', name: '文印店', tier: 1, type: 'production',
    buildCost: [{ name: '橡皮', minRarity: 'rare' }, { name: '订书机', minRarity: 'rare' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '橡皮', minRarity: 'uncommon' }, { name: '手机' }], useOutput: { prosperity: 1 } },
      { stars: 2, useCondition: [{ name: '耳机', minRarity: 'rare' }, { name: '订书机', minRarity: 'uncommon' }], useOutput: { prosperity: 4 } },
      { stars: 3, useCondition: [{ name: '铅笔', minRarity: 'uncommon' }, { name: '笔记本' }], useOutput: { prosperity: 3 } },
    ],
  },
  {
    id: 'office', name: '办公室', tier: 1, type: 'production',
    buildCost: [{ name: '手机', minRarity: 'rare' }, { name: '电脑', minRarity: 'rare' }],
    recipes: [
      { stars: 3, useCondition: [{ name: '电脑', minRarity: 'uncommon' }, { name: '手机' }], useOutput: { prosperity: 3 } },
    ],
  },

  // === Transformation T1 (build cost: rare x2) ===
  {
    id: 'craft_workshop', name: '工艺坊', tier: 1, type: 'transformation',
    buildCost: [{ name: '芒果', minRarity: 'rare' }, { name: '笔记本', minRarity: 'rare' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '橡皮' }, { name: '耳机' }], useOutput: { item: { name: '笔记本', category: 'stationery', rarity: 'uncommon' } } },
      { stars: 1, useCondition: [{ name: '铅笔' }, { name: '手机' }], useOutput: { item: { name: '订书机', category: 'stationery', rarity: 'uncommon' } } },
      { stars: 2, useCondition: [{ name: '订书机', minRarity: 'uncommon' }], useOutput: { item: { name: '铅笔', category: 'stationery', rarity: 'rare' } } },
    ],
  },
  {
    id: 'electronics_mod', name: '电器改装铺', tier: 1, type: 'transformation',
    buildCost: [{ name: '胶囊', minRarity: 'rare' }, { name: '耳机', minRarity: 'rare' }],
    recipes: [
      { stars: 2, useCondition: [{ name: '耳机', minRarity: 'uncommon' }], useOutput: { item: { name: '电脑', category: 'electronics', rarity: 'rare' } } },
      { stars: 2, useCondition: [{ name: '手机', minRarity: 'uncommon' }], useOutput: { item: { name: '空调', category: 'electronics', rarity: 'rare' } } },
    ],
  },

  // === Production T2 (build cost: epic x2) ===
  {
    id: 'winery', name: '果酒庄', tier: 2, type: 'production',
    buildCost: [{ name: '铅笔', minRarity: 'epic' }, { name: '电脑', minRarity: 'epic' }],
    recipes: [
      { stars: 2, useCondition: [{ name: '柠檬', minRarity: 'rare' }, { name: '注射器', minRarity: 'rare' }], useOutput: { prosperity: 5 } },
      { stars: 3, useCondition: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '冲剂', minRarity: 'uncommon' }], useOutput: { prosperity: 6 } },
    ],
  },
  {
    id: 'maker_space', name: '创客空间', tier: 2, type: 'production',
    buildCost: [{ name: '笔记本', minRarity: 'epic' }, { name: '空调', minRarity: 'epic' }],
    recipes: [
      { stars: 1, useCondition: [{ name: '耳机', minRarity: 'rare' }, { name: '铅笔', minRarity: 'uncommon' }], useOutput: { prosperity: 3 } },
      { stars: 1, useCondition: [{ name: '橡皮', minRarity: 'uncommon' }, { name: '电脑' }], useOutput: { prosperity: 1 } },
      { stars: 3, useCondition: [{ name: '订书机', minRarity: 'uncommon' }, { name: '空调', minRarity: 'uncommon' }], useOutput: { prosperity: 6 } },
    ],
  },

  // === Transformation T2 (build cost: epic x2) ===
  {
    id: 'laboratory', name: '实验室', tier: 2, type: 'transformation',
    buildCost: [{ name: '芒果', minRarity: 'epic' }, { name: '胶囊', minRarity: 'epic' }],
    recipes: [
      { stars: 3, useCondition: [{ name: '冲剂', minRarity: 'rare' }], useOutput: { item: { name: '电脑', category: 'electronics', rarity: 'epic' } } },
    ],
  },
];

// --- Building Draw Thresholds ---
export const BUILDING_DRAW_THRESHOLDS = [4, 8, 14, 22, 32];

// --- Tier Weight Ranges ---
export const BUILDING_TIER_WEIGHTS = [
  { maxProsperity: 12, weights: { 0: 85, 1: 15, 2: 0 } },
  { maxProsperity: 24, weights: { 0: 35, 1: 50, 2: 15 } },
  { maxProsperity: 40, weights: { 0: 10, 1: 40, 2: 50 } },
];

// --- Demand: eligible categories (kitchenware excluded, consumed by buildings) ---
export const DEMAND_ELIGIBLE_CATEGORIES = [
  { id: 'fruit', name: '水果' },
  { id: 'medicine', name: '药物' },
  { id: 'stationery', name: '文具' },
  { id: 'electronics', name: '电器' },
];

// --- Satisfaction recovery per item quality when fulfilling demands ---
export const DEMAND_SATISFACTION_RECOVERY = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 6,
  legendary: 8,
  mythic: 10,
};

// --- Demand scaling by round (timed demand system) ---
export const DEMAND_SCALING = [
  { maxRound: 5, duration: 3, target: 4, penalty: 3 },
  { maxRound: 10, duration: 3, target: 8, penalty: 5 },
  { maxRound: 15, duration: 3, target: 12, penalty: 7 },
  { maxRound: Infinity, duration: 3, target: 16, penalty: 10 },
];

// --- Bonus item extra satisfaction when fulfilling demands ---
export const DEMAND_BONUS_ITEM_EXTRA = 2;

// --- Economy Parameters ---
export const PROTOTYPE_CONFIG = {
  startingGold: 10,
  incomePerRound: 10,
  startingSatisfaction: 10,
  maxSatisfaction: 20,
  prosperityTarget: 40,
  satisfactionTiers: [
    { min: 15, max: 20, name: '繁荣', effect: null, value: 0 },
    { min: 8, max: 14, name: '正常', effect: null, value: 0 },
    { min: 3, max: 7, name: '不满', effect: null, value: 0 },
    { min: 0, max: 2, name: '崩溃', effect: 'game_over', value: 0 },
  ],
};

// Re-export existing configs for convenience
export { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG };
