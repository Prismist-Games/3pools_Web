import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG } from './constants';

// --- Building Definitions ---
export const BUILDING_DEFINITIONS = [
  // Starting buildings (3 available at game start)
  {
    id: 'fruit_stand',
    name: '水果摊',
    buildCost: { category: 'fruit', minRarity: 'common', count: 2 },
    useCondition: { category: 'fruit', count: 1 },
    useOutput: { prosperity: 2 },
    type: 'resource',
    tier: 0,
  },
  {
    id: 'clinic',
    name: '诊所',
    buildCost: { category: 'medicine', minRarity: 'common', count: 2 },
    useCondition: { category: 'medicine', count: 1 },
    useOutput: { satisfaction: 3 },
    type: 'resource',
    tier: 0,
  },
  {
    id: 'print_shop',
    name: '文印店',
    buildCost: { category: 'stationery', minRarity: 'common', count: 2 },
    useCondition: { category: 'stationery', minRarity: 'uncommon', count: 1 },
    useOutput: { prosperity: 3 },
    type: 'resource',
    tier: 0,
  },

  // Draw pool 1 (prosperity 8 threshold, draw 3 pick 1)
  {
    id: 'grocery',
    name: '杂货铺',
    buildCost: { category: 'kitchenware', minRarity: 'common', count: 2 },
    useCondition: { category: 'kitchenware', count: 1 },
    useOutput: { prosperity: 2, satisfaction: 2 },
    type: 'resource',
    tier: 1,
  },
  {
    id: 'repair_shop',
    name: '维修铺',
    buildCost: { category: 'electronics', minRarity: 'common', count: 2 },
    useCondition: { category: 'electronics', count: 1 },
    useOutput: { currency: 3, prosperity: 1 },
    type: 'resource',
    tier: 1,
  },
  {
    id: 'recycling_center',
    name: '回收站',
    buildCost: { anyCategory: true, minRarity: 'common', count: 3 },
    useCondition: { anyCategory: true, count: 2 },
    useOutput: { prosperity: 3 },
    type: 'resource',
    tier: 1,
  },

  // Draw pool 2 (prosperity 16 threshold, draw 3 pick 1)
  {
    id: 'community_plaza',
    name: '社区广场',
    buildCost: { anyCategory: true, minRarity: 'uncommon', count: 2 },
    useCondition: { anyCategory: true, minRarity: 'uncommon', count: 1 },
    useOutput: { satisfaction: 5 },
    type: 'resource',
    tier: 2,
  },
  {
    id: 'trade_guild',
    name: '商会',
    buildCost: { anyCategory: true, minRarity: 'uncommon', count: 2 },
    useCondition: { anyCategory: true, minRarity: 'rare', count: 1 },
    useOutput: { prosperity: 5 },
    type: 'resource',
    tier: 2,
  },
];

// --- Demand Definitions ---
export const DEMAND_DEFINITIONS = {
  basic: [
    {
      id: 'fruit_purchase',
      name: '水果采购',
      requires: [{ category: 'fruit', minRarity: 'common', count: 3 }],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 5 },
    },
    {
      id: 'medicine_restock',
      name: '药品补货',
      requires: [
        { category: 'medicine', minRarity: 'common', count: 2 },
        { category: 'electronics', minRarity: 'common', count: 1 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 5 },
    },
    {
      id: 'stationery_order',
      name: '文具订购',
      requires: [{ category: 'stationery', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 4 },
    },
    {
      id: 'kitchenware_need',
      name: '厨具需求',
      requires: [{ category: 'kitchenware', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 4 },
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
      satisfactionPerRound: -3,
      reward: { currency: 7 },
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
      satisfactionPerRound: -3,
      reward: { currency: 7 },
    },
  ],
};

// --- Round Schedule ---
// Fixed demand generation rounds (1-indexed). Known to player via timeline.
export const DEMAND_SCHEDULE = [1, 4, 7, 10, 13, 16, 18];

// Round at which advanced demands start mixing in
export const ADVANCED_DEMAND_START_ROUND = 9;

// --- Economy Parameters ---
export const PROTOTYPE_CONFIG = {
  startingGold: 15,
  incomePerRound: 5,
  maxActiveBuildings: 5,
  maxActiveDemands: 2,
  startingSatisfaction: 40,
  maxSatisfaction: 100,
  demandExpirePenalty: -10,
  prosperityTarget: 40,
  buildingDrawInterval: 8,
  buildingDrawCount: 3,
  satisfactionTiers: [
    { min: 60, max: 100, name: '繁荣', effect: 'demand_reward_bonus', value: 0.5 },
    { min: 30, max: 59, name: '正常', effect: null, value: 0 },
    { min: 10, max: 29, name: '不满', effect: 'demand_timelimit_reduce', value: 1 },
    { min: 0, max: 9, name: '崩溃', effect: 'game_over', value: 0 },
  ],
};

// Re-export existing configs for convenience
export { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG };
