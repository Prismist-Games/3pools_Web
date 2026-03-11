# 多配方建筑 + 类别需求 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现所有建筑（生产+转化）的多配方系统、类别需求系统（含加成物品）、繁荣目标50。

**设计文档:** `design_docs/prototype-building-satisfaction-spec.md`

**Architecture:** 数据层改动最大（所有建筑统一为多配方格式），逻辑层需要统一配方选择和新需求系统，UI 需支持配方展示和类别需求。

> **注意：** 设计文档已更新为14栋建筑（+创客空间、+实验室）、3星制、工艺坊/电器改装铺提升至T1。
> 下方 Task 1 的建筑数据代码是旧版12栋结构，**配方数值待定**，需等配方设计最终确认后再更新。

---

## 代码与设计文档的差异总览

| 差异点 | 当前代码 | 设计文档要求 |
|--------|---------|------------|
| 生产建筑格式 | 单 useCondition + rarity-keyed useOutput | **多配方** recipes 数组，每个配方有 stars/useCondition/useOutput |
| 生产建筑产出 | prosperity（按品质缩放） | **固定 prosperity**（每个配方产出固定值，不按品质缩放） |
| 转化建筑格式 | 多配方 recipes 数组 | 多配方 recipes 数组（已对齐） |
| 需求系统 | DEMAND_POOLS + 随机生成具体物品需求 | **类别需求**：始终接受指定类别的任意物品 |
| 需求刷新 | 满足后随机刷新为新物品需求 | **不刷新**：2个常驻类别需求，永久存在 |
| 需求满足次数 | 每个需求满足1次后刷新 | **无限次**：每回合可反复满足 |
| 加成物品 | 不存在 | **开局随机4个**（每子类别1个），提交时额外+1满意度 |
| 繁荣目标 | 20 | **50** |
| 建筑抽选阈值 | [2, 4, 7, 11, 16] | **[5, 10, 18, 28, 40]** |
| 层级权重范围 | 0-6/7-12/13-20 | **0-15/16-30/31-50** |
| 满意度分档效果 | satisfactionTiers 数组（繁荣/正常/不满/崩溃） | **删除**：不再有分档效果，满意度=0即失败 |

---

## Task 1: 更新 prototypeConstants.js — 数据结构

**Files:** `src/data/prototypeConstants.js`

### Step 1: 生产建筑改为多配方格式

所有生产建筑从 `useCondition` + rarity-keyed `useOutput` 改为 `recipes` 数组。每个 recipe 有 `stars`, `useCondition`, `useOutput: { prosperity: N }`。

```js
// --- 基础生产建筑 (T0, 建造费用: 优秀x2) ---

// 水果摊
{
  id: 'fruit_stand', name: '水果摊', tier: 0, type: 'production',
  buildCost: [{ name: '苹果', minRarity: 'uncommon' }, { name: '芒果', minRarity: 'uncommon' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '芒果', minRarity: 'uncommon' }, { name: '砧板' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '苹果', minRarity: 'rare' }, { name: '菜刀', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 3,
      useCondition: [{ name: '西瓜' }, { name: '汤勺' }],
      useOutput: { prosperity: 2 },
    },
  ],
},

// 诊所
{
  id: 'clinic', name: '诊所', tier: 0, type: 'production',
  buildCost: [{ name: '胶囊', minRarity: 'uncommon' }, { name: '滴眼液', minRarity: 'uncommon' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '胶囊', minRarity: 'uncommon' }, { name: '柠檬' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '滴眼液', minRarity: 'rare' }, { name: '苹果' }],
      useOutput: { prosperity: 3 },
    },
    {
      stars: 3,
      useCondition: [{ name: '冲剂' }, { name: '注射器' }],
      useOutput: { prosperity: 2 },
    },
  ],
},

// 药膳坊
{
  id: 'herbal_kitchen', name: '药膳坊', tier: 0, type: 'production',
  buildCost: [{ name: '芒果', minRarity: 'uncommon' }, { name: '注射器', minRarity: 'uncommon' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '注射器' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '冲剂', minRarity: 'rare' }, { name: '苹果', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 3,
      useCondition: [{ name: '胶囊' }, { name: '芒果' }],
      useOutput: { prosperity: 2 },
    },
  ],
},

// --- 高级生产建筑 (T1, 建造费用: 稀有x2) ---

// 大排档
{
  id: 'food_stall', name: '大排档', tier: 1, type: 'production',
  buildCost: [{ name: '芒果', minRarity: 'rare' }, { name: '注射器', minRarity: 'rare' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '菜刀', minRarity: 'uncommon' }, { name: '汤勺' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '西瓜', minRarity: 'rare' }, { name: '砧板', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 3,
      useCondition: [{ name: '平底锅', minRarity: 'uncommon' }, { name: '芒果' }],
      useOutput: { prosperity: 3 },
    },
  ],
},

// 文印店
{
  id: 'print_shop', name: '文印店', tier: 1, type: 'production',
  buildCost: [{ name: '橡皮', minRarity: 'rare' }, { name: '订书机', minRarity: 'rare' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '橡皮', minRarity: 'uncommon' }, { name: '订书机' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '耳机', minRarity: 'rare' }, { name: '笔记本', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 3,
      useCondition: [{ name: '铅笔', minRarity: 'uncommon' }, { name: '手机' }],
      useOutput: { prosperity: 3 },
    },
  ],
},

// 办公室
{
  id: 'office', name: '办公室', tier: 1, type: 'production',
  buildCost: [{ name: '手机', minRarity: 'rare' }, { name: '电脑', minRarity: 'rare' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '耳机', minRarity: 'uncommon' }, { name: '笔记本' }],
      useOutput: { prosperity: 1 },
    },
    {
      stars: 2,
      useCondition: [{ name: '空调', minRarity: 'rare' }, { name: '铅笔', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 3,
      useCondition: [{ name: '电脑', minRarity: 'uncommon' }, { name: '手机' }],
      useOutput: { prosperity: 3 },
    },
  ],
},

// --- 终极建筑 (T2, 建造费用: 史诗x2) ---

// 果酒庄
{
  id: 'winery', name: '果酒庄', tier: 2, type: 'production',
  buildCost: [{ name: '铅笔', minRarity: 'epic' }, { name: '电脑', minRarity: 'epic' }],
  recipes: [
    {
      stars: 1,
      useCondition: [{ name: '芒果', minRarity: 'rare' }, { name: '胶囊', minRarity: 'rare' }, { name: '汤勺', minRarity: 'uncommon' }],
      useOutput: { prosperity: 4 },
    },
    {
      stars: 2,
      useCondition: [{ name: '柠檬', minRarity: 'rare' }, { name: '注射器', minRarity: 'rare' }],
      useOutput: { prosperity: 5 },
    },
    {
      stars: 4,
      useCondition: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '冲剂', minRarity: 'uncommon' }],
      useOutput: { prosperity: 6 },
    },
  ],
},
```

转化建筑已有 `recipes` 格式——保持不变。

### Step 2: 替换需求系统数据

删除旧的 `DEMAND_POOLS`、`DEMAND_QUALITY_CHANCE`。新增类别需求配置：

```js
// --- Standing Demand System (category-based) ---
export const STANDING_DEMANDS = [
  {
    id: 'living_supplies',
    name: '生活物资',
    categories: ['fruit', 'medicine'],
    minItems: 2,
  },
  {
    id: 'office_supplies',
    name: '办公用品',
    categories: ['stationery', 'electronics'],
    minItems: 2,
  },
];

// Bonus items: 1 per sub-category (fruit, medicine, stationery, electronics)
// Randomly assigned at game start, fixed for entire game
export const BONUS_ITEMS_PER_SUBCATEGORY = 1;
export const BONUS_SATISFACTION = 1;

// Satisfaction recovery per item quality
export const SATISFACTION_PER_QUALITY = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 4, mythic: 4,
};

// Satisfaction decay per round range (unchanged)
export const SATISFACTION_DECAY = [
  { maxRound: 5,  decay: 1 },
  { maxRound: 10, decay: 2 },
  { maxRound: 15, decay: 3 },
  { maxRound: Infinity, decay: 4 },
];
```

### Step 3: 更新繁荣目标和建筑抽选阈值

```js
export const PROTOTYPE_CONFIG = {
  ...existing,
  prosperityTarget: 50,  // was 20
};

export const BUILDING_DRAW_THRESHOLDS = [5, 10, 18, 28, 40];  // was [2, 4, 7, 11, 16]

export const BUILDING_TIER_WEIGHTS = [
  { maxProsperity: 15, weights: { 0: 85, 1: 15, 2: 0 } },   // was 6
  { maxProsperity: 30, weights: { 0: 40, 1: 50, 2: 10 } },  // was 12
  { maxProsperity: 50, weights: { 0: 10, 1: 40, 2: 50 } },  // was 20
];
```

### Step 4: 清理 resolveOutput

`resolveOutput` 不再被生产建筑使用（产出现在是配方内的固定值）。如果仅被生产建筑的 rarity-keyed 输出使用，可以删除。检查是否有其他引用再决定。

### Step 5: Commit

```bash
git add src/data/prototypeConstants.js
git commit -m "refactor: all buildings to multi-recipe + category demands + prosperity 50"
```

---

## Task 2: 更新 usePrototypeGameLogic.js — 核心逻辑

**Files:** `src/hooks/usePrototypeGameLogic.js`

### Step 1: 更新 imports

```js
import {
  BUILDING_DEFINITIONS, PROTOTYPE_CONFIG,
  BUILDING_DRAW_THRESHOLDS, BUILDING_TIER_WEIGHTS, ITEM_LOOKUP,
  STANDING_DEMANDS, BONUS_ITEMS_PER_SUBCATEGORY, BONUS_SATISFACTION,
  SATISFACTION_PER_QUALITY, SATISFACTION_DECAY,
} from '../data/prototypeConstants';
```

删除 `DEMAND_POOLS`, `DEMAND_QUALITY_CHANCE`, `DEMAND_SATISFACTION_RECOVERY`, `resolveOutput` 的导入。

### Step 2: 新增状态

```js
// Bonus items for demand system (set at game start, array of item names)
const [bonusItems, setBonusItems] = useState([]);

// Selected recipe index for building use (applies to ALL buildings now)
const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
```

### Step 3: 初始化加成物品

在 `startGame` 中，从每个非厨具子类别随机选1个物品作为加成：

```js
const initBonusItems = () => {
  const nonKitchenCategories = ['fruit', 'medicine', 'stationery', 'electronics'];
  const bonus = [];
  for (const catId of nonKitchenCategories) {
    const pool = config.pools.find(p => p.id === catId);
    if (pool) {
      const items = pool.items;
      const pick = items[Math.floor(Math.random() * items.length)];
      bonus.push(pick.name);
    }
  }
  return bonus;
};

// In startGame:
const bonusItemList = initBonusItems();
setBonusItems(bonusItemList);
```

### Step 4: 统一 confirmUseBuilding — 所有建筑使用配方

所有建筑（生产+转化）现在都有 `recipes` 数组。使用逻辑统一：

```js
const confirmUseBuilding = useCallback(() => {
  if (pendingBuildingUseIndex === null) return;
  const building = buildings[pendingBuildingUseIndex];
  if (!building || !building.recipes) return;

  if (selectedRecipeIndex === null) {
    showToast(t('请先选择配方'), 'error');
    return;
  }

  const recipe = building.recipes[selectedRecipeIndex];
  const requirements = Array.isArray(recipe.useCondition)
    ? recipe.useCondition : [recipe.useCondition];

  // Validate selected items match requirements
  // ... (same greedy matching logic as current code)

  // Remove consumed items
  setInventory(prev => removeItemsAtIndices(prev, selectedIndices));

  // Apply output based on building type
  if (building.type === 'transformation') {
    // Produce output item
    const output = recipe.useOutput;
    const baseItem = ITEM_LOOKUP[output.item.name];
    const rarity = getRarity(output.item.rarity);
    const newItem = {
      ...baseItem, rarity,
      poolId: output.item.category,
      poolName: config.pools.find(p => p.id === output.item.category)?.name || '',
      uid: Math.random().toString(36).substr(2, 9),
      sterile: false,
    };
    handleIncomingItems([newItem]);
  } else {
    // Production: add fixed prosperity from recipe
    if (recipe.useOutput.prosperity) {
      setProsperity(prev => prev + recipe.useOutput.prosperity);
    }
    // No satisfaction from buildings
  }

  setPendingBuildingUseIndex(null);
  setSelectedRecipeIndex(null);
  setSelectedIndices([]);
}, [...]);
```

**关键变化：** 不再调用 `resolveOutput`，不再计算 effectiveRarity。每个配方的产出是固定值。

### Step 5: 实现类别需求满足

需求是永久的类别需求。不需要 `generateStandingDemand`。

```js
const confirmFulfillDemand = useCallback((demandId, selectedItemIndices) => {
  const demand = STANDING_DEMANDS.find(d => d.id === demandId);
  if (!demand) return;

  // Validate: enough items
  const items = selectedItemIndices.map(i => inventory[i]).filter(Boolean);
  if (items.length < demand.minItems) {
    showToast(t('至少提交') + demand.minItems + t('个物品'), 'error');
    return;
  }

  // Validate: all items belong to demand's categories
  for (const item of items) {
    const itemCategory = ITEM_LOOKUP[item.name]?.category;
    if (!demand.categories.includes(itemCategory)) {
      showToast(t('物品不属于该需求类别'), 'error');
      return;
    }
  }

  // Calculate satisfaction recovery
  let satGain = 0;
  for (const item of items) {
    satGain += SATISFACTION_PER_QUALITY[item.rarity.id] || 1;
    if (bonusItems.includes(item.name)) {
      satGain += BONUS_SATISFACTION;
    }
  }

  setInventory(prev => removeItemsAtIndices(prev, selectedItemIndices));
  setSatisfaction(prev => Math.min(PROTOTYPE_CONFIG.maxSatisfaction, prev + satGain));
  showToast(`${demand.name} +${satGain} ${t('满意度')}`);
  setSelectedIndices([]);
}, [inventory, bonusItems]);
```

### Step 6: 简化 endRound

满意度衰减逻辑不变。删除所有需求过期/刷新/定时生成逻辑。

```js
const endRound = useCallback(() => {
  // ... existing checks ...

  const newRound = round + 1;
  setGold(PROTOTYPE_CONFIG.incomePerRound);

  // Satisfaction decay (unchanged)
  const decayConfig = SATISFACTION_DECAY.find(d => newRound <= d.maxRound)
    || SATISFACTION_DECAY[SATISFACTION_DECAY.length - 1];
  const newSatisfaction = Math.max(0, satisfaction - decayConfig.decay);
  setSatisfaction(newSatisfaction);

  // Win/lose check
  if (prosperity >= PROTOTYPE_CONFIG.prosperityTarget) {
    setGameStatus('won');
  } else if (newSatisfaction <= 0) {
    setGameStatus('lost');
  }

  // No demand refresh needed — demands are permanent categories

  setRound(newRound);
}, [...]);
```

### Step 7: 删除旧需求相关代码

删除以下：
- `generateDemand` / `generateStandingDemand` 函数
- 需求定时器/过期检查逻辑
- `activeDemands` 状态中的具体物品需求（改为始终使用 `STANDING_DEMANDS`）
- 旧的 `confirmFulfillDemand`（替换为新版）

### Step 8: Export 新状态

```js
return {
  // ... existing ...
  bonusItems,
  selectedRecipeIndex,
  actions: {
    ...existing,
    setSelectedRecipeIndex,
    confirmFulfillDemand,
  },
};
```

### Step 9: Commit

```bash
git add src/hooks/usePrototypeGameLogic.js
git commit -m "refactor: unified recipe system + category demands + bonus items"
```

---

## Task 3: 更新 UI 组件

**Files:**
- `src/components/game/BuildingCard.jsx` — 统一配方展示
- `src/components/game/DemandCard.jsx` — 类别需求 + 加成物品标记
- `src/PrototypeGameCore.jsx` — 传递新 props
- `src/components/game/Timeline.jsx` — 繁荣目标50

### Step 1: BuildingCard — 统一多配方展示

所有建筑都有 `recipes`，统一展示逻辑：

- **已建造**：显示所有配方行（★星级 + 投入胶囊 + 产出），可点击选择
- 生产建筑配方产出显示为 "N繁荣"
- 转化建筑配方产出显示为物品胶囊
- **未建造**：简略预览所有配方（灰色）
- **移除旧的非 recipes 路径**（`useCondition`/`useOutput`/`resolveOutput` 分支）

关键简化：不再需要区分"有 recipes"和"没有 recipes"——所有建筑统一走 recipes 路径。RecipeRow 组件已处理两种产出格式。

### Step 2: DemandCard — 类别需求 + 加成物品

- 需求不显示具体物品名要求，改为显示类别名（"生活物资：水果+药物"）
- 显示加成物品列表（带高亮标记）
- 显示预估满意度回复（根据选中物品计算）
- 去掉倒计时/过期 UI
- 满足按钮：选择库存中属于对应类别的物品（2个以上），提交

### Step 3: PrototypeGameCore — 传递新 props

- 传递 `bonusItems` 给 DemandCard 和库存区域（标记加成物品）
- BuildingCard 统一使用 `recipes` 渲染
- 传递 `selectedRecipeIndex`, `onSelectRecipe`

### Step 4: Timeline — 繁荣目标50

确保 Timeline 组件中的进度条和目标值反映 prosperityTarget: 50。

### Step 5: Commit

```bash
git add src/components/game/BuildingCard.jsx src/components/game/DemandCard.jsx src/PrototypeGameCore.jsx src/components/game/Timeline.jsx
git commit -m "refactor: UI for unified recipes + category demands + bonus items"
```

---

## Task 4: 验证和修复

### Step 1: 运行 dev server

```bash
npm run dev
```

### Step 2: 验证清单

**建筑系统：**
- [ ] 所有建筑（生产+转化）显示多个配方，含星级
- [ ] 选择配方后，提交物品，正确触发产出
- [ ] 生产建筑配方产出固定繁荣值（不按品质缩放）
- [ ] 转化建筑配方产出正确品质物品

**具体配方验证（抽样）：**
- [ ] 水果摊 ★★★：普通西瓜+普通汤勺 → 2繁荣
- [ ] 果酒庄 ★★★★：优秀西瓜+优秀冲剂 → 6繁荣
- [ ] 榨汁坊 ★★★：优秀柠檬 → 稀有芒果
- [ ] 工艺坊 ★★★★：稀有橡皮 → 史诗铅笔

**需求系统：**
- [ ] 开局有2个常驻需求（生活物资 + 办公用品）
- [ ] 需求显示类别名称和接受的物品类别
- [ ] 可以提交2+个对应类别物品满足需求
- [ ] 同一回合可以多次满足同一需求
- [ ] 需求永远不消失
- [ ] 满足需求回复满意度（普+1, 优+2, 稀+3, 史+4）
- [ ] 加成物品提交时额外+1满意度
- [ ] 加成物品在 UI 中有标记
- [ ] 开局随机4个加成物品（每子类别1个）

**经济参数：**
- [ ] 繁荣目标 = 50
- [ ] 建筑抽选阈值 = [5, 10, 18, 28, 40]
- [ ] 层级权重范围正确（0-15/16-30/31-50）
- [ ] 每回合满意度自然衰减（1-5: -1, 6-10: -2, 11-15: -3, 16+: -4）
- [ ] 满意度降到0时游戏结束
- [ ] 繁荣达到50时胜利

### Step 3: 修复发现的问题

### Step 4: Final commit
