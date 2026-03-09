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
export const BUILDING_DEFINITIONS = [
  // --- Basic Production (tier 0, build cost: common x2) ---
  {
    id: 'fruit_stand', name: '水果摊', tier: 0, type: 'production',
    buildCost: [{ name: '苹果' }, { name: '芒果' }],
    useCondition: [{ name: '西瓜' }, { name: '汤勺' }],
    useOutput: { prosperity: 1, satisfaction: 1 },
  },
  {
    id: 'clinic', name: '诊所', tier: 0, type: 'production',
    buildCost: [{ name: '胶囊' }, { name: '滴眼液' }],
    useCondition: [{ name: '冲剂' }, { name: '注射器' }],
    useOutput: { satisfaction: 2 },
  },
  {
    id: 'herbal_kitchen', name: '药膳坊', tier: 0, type: 'production',
    buildCost: [{ name: '芒果' }, { name: '注射器' }],
    useCondition: [{ name: '柠檬' }, { name: '胶囊' }],
    useOutput: { satisfaction: 1, prosperity: 1 },
  },

  // --- Transformation (tier 0, build cost: common x2) ---
  {
    id: 'juice_shop', name: '榨汁坊', tier: 0, type: 'transformation',
    buildCost: [{ name: '西瓜' }, { name: '汤勺' }],
    useCondition: [{ name: '苹果' }, { name: '冲剂' }],
    useOutput: { item: { name: '西瓜', category: 'fruit', rarity: 'uncommon' } },
  },
  {
    id: 'processing_room', name: '炮制房', tier: 0, type: 'transformation',
    buildCost: [{ name: '冲剂' }, { name: '胶囊' }],
    useCondition: [{ name: '滴眼液' }, { name: '柠檬' }],
    useOutput: { item: { name: '冲剂', category: 'medicine', rarity: 'uncommon' } },
  },
  {
    id: 'sharpening_shop', name: '磨刀铺', tier: 0, type: 'transformation',
    buildCost: [{ name: '平底锅' }, { name: '汤勺' }],
    useCondition: [{ name: '菜刀' }, { name: '砧板' }, { name: '芒果' }],
    useOutput: { item: { name: '平底锅', category: 'kitchenware', rarity: 'uncommon' } },
  },
  {
    id: 'craft_workshop', name: '工艺坊', tier: 0, type: 'transformation',
    buildCost: [{ name: '笔记本' }, { name: '铅笔' }],
    useCondition: [{ name: '橡皮' }, { name: '耳机' }],
    useOutput: { item: { name: '笔记本', category: 'stationery', rarity: 'uncommon' } },
  },
  {
    id: 'electronics_mod', name: '电器改装铺', tier: 0, type: 'transformation',
    buildCost: [{ name: '耳机' }, { name: '空调' }],
    useCondition: [{ name: '手机' }, { name: '电脑' }],
    useOutput: { item: { name: '空调', category: 'electronics', rarity: 'uncommon' } },
  },

  // --- Advanced Production (tier 1, build cost: uncommon x2) ---
  {
    id: 'food_stall', name: '大排档', tier: 1, type: 'production',
    buildCost: [{ name: '芒果', minRarity: 'uncommon' }, { name: '注射器', minRarity: 'uncommon' }],
    useCondition: [{ name: '平底锅', minRarity: 'uncommon' }, { name: '西瓜' }],
    useOutput: { prosperity: 2, satisfaction: 2 },
  },
  {
    id: 'print_shop', name: '文印店', tier: 1, type: 'production',
    buildCost: [{ name: '橡皮', minRarity: 'uncommon' }, { name: '订书机', minRarity: 'uncommon' }],
    useCondition: [{ name: '笔记本', minRarity: 'uncommon' }, { name: '铅笔' }],
    useOutput: { prosperity: 3 },
  },
  {
    id: 'office', name: '办公室', tier: 1, type: 'production',
    buildCost: [{ name: '手机', minRarity: 'uncommon' }, { name: '电脑', minRarity: 'uncommon' }],
    useCondition: [{ name: '空调', minRarity: 'uncommon' }, { name: '订书机' }],
    useOutput: { prosperity: 2, satisfaction: 1 },
  },

  // --- Endgame (tier 2, build cost: rare x2) ---
  {
    id: 'winery', name: '果酒庄', tier: 2, type: 'production',
    buildCost: [{ name: '铅笔', minRarity: 'rare' }, { name: '电脑', minRarity: 'rare' }],
    useCondition: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '冲剂', minRarity: 'uncommon' }],
    useOutput: { prosperity: 3, satisfaction: 3 },
  },
];

// --- Building Draw Thresholds (front-loaded) ---
export const BUILDING_DRAW_THRESHOLDS = [2, 4, 7, 11, 16];

// --- Tier Weight Ranges ---
export const BUILDING_TIER_WEIGHTS = [
  { maxProsperity: 6,  weights: { 0: 85, 1: 15, 2: 0 } },
  { maxProsperity: 12, weights: { 0: 40, 1: 50, 2: 10 } },
  { maxProsperity: 20, weights: { 0: 10, 1: 40, 2: 50 } },
];

// --- Demand Definitions ---
export const DEMAND_DEFINITIONS = {
  basic: [
    {
      id: 'fruit_purchase',
      name: '水果采购',
      requires: [{ category: 'fruit', minRarity: 'common', count: 3 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 0 },
    },
    {
      id: 'medicine_restock',
      name: '药品补货',
      requires: [
        { category: 'medicine', minRarity: 'common', count: 2 },
        { category: 'electronics', minRarity: 'common', count: 1 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 0 },
    },
    {
      id: 'stationery_order',
      name: '文具订购',
      requires: [{ category: 'stationery', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 0 },
    },
    {
      id: 'kitchenware_need',
      name: '厨具需求',
      requires: [{ category: 'kitchenware', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 0 },
    },
  ],
  advanced: [
    {
      id: 'community_feast',
      name: '社区聚餐',
      requires: [
        { category: 'fruit', minRarity: 'uncommon', count: 1 },
        { category: 'kitchenware', minRarity: 'common', count: 2 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 0 },
    },
    {
      id: 'health_check',
      name: '健康检查',
      requires: [
        { category: 'medicine', minRarity: 'uncommon', count: 1 },
        { category: 'electronics', minRarity: 'common', count: 1 },
        { category: 'stationery', minRarity: 'common', count: 1 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 0 },
    },
  ],
};

// --- Round Schedule ---
export const DEMAND_SCHEDULE = [1, 4, 7, 10, 13, 16, 18];

// Round at which advanced demands start mixing in
export const ADVANCED_DEMAND_START_ROUND = 9;

// --- Economy Parameters ---
export const PROTOTYPE_CONFIG = {
  startingGold: 10,
  incomePerRound: 10,
  maxActiveDemands: 2,
  startingSatisfaction: 20,
  maxSatisfaction: 50,
  demandExpirePenalty: -5,
  prosperityTarget: 20,
  satisfactionTiers: [
    { min: 30, max: 50, name: '繁荣', effect: null, value: 0 },
    { min: 15, max: 29, name: '正常', effect: null, value: 0 },
    { min: 5, max: 14, name: '不满', effect: 'demand_timelimit_reduce', value: 1 },
    { min: 0, max: 4, name: '崩溃', effect: 'game_over', value: 0 },
  ],
};

// Re-export existing configs for convenience
export { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG };
