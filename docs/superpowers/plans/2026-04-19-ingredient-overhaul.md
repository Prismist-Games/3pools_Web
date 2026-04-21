# Ingredient Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sticker system with a 80-type ingredient system (5 categories × 4 subcategories × 4 types), where quality (普通/精选/优质/顶级) is randomly revealed on draw. Replace the 5 wall types with 5 market types (each showing only its category's ingredients). Update orders to require ingredients instead of stickers.

**Architecture:** Data model change radiates outward: v2Config.js defines new ingredient types + quality config → matrixHelpers.js generates walls using market ingredient pools → useGameLogic.js assigns quality on draw and matches ingredients for orders → UI components display quality-aware ingredients.

**Tech Stack:** React 18, Vite 6, JavaScript (no TypeScript, no test suite — verify by running `npm run dev` after each task).

---

## Key Data Model Changes

**Ingredient type** (no `rarity` field):
```javascript
{ id: 'chicken_thigh', icon: '🍗', name: '鸡腿肉', nameEn: 'Chicken Thigh', tags: ['肉类', '鸡'] }
```

**Inventory item** (quality assigned on draw):
```javascript
{ id: 'chicken_thigh', icon: '🍗', name: '鸡腿肉', tags: ['肉类', '鸡'], quality: 2, score: 2, isOutOfGame: true, uid: '...' }
```

**Order requirement** (by ingredient type + quality):
```javascript
{ ingredientId: 'chicken_thigh', icon: '🍗', name: '鸡腿肉', quality: 1, count: 2 }
```

**Grid cell type** changes from `'sticker'` to `'ingredient'`. No quality on the cell — quality only on the inventory item after drawing.

---

## Task 1: Update `src/data/v2Config.js`

**Files:**
- Modify: `src/data/v2Config.js`

- [ ] **Step 1: Replace the entire v2Config.js with the new data**

Replace the full file with:

```javascript
/**
 * v2Config.js — v2 data foundations
 * Ingredients, quality system, market types, orders, dishes, expeditions
 */

// --- 食材总表 (80 types, no rarity — quality assigned at draw time) ---
// tags: [大类, 小类]
export const INGREDIENTS = [
    // ── 肉类 · 鸡 ──
    { id: 'chicken_breast',    icon: '🍗', name: '鸡胸肉',   nameEn: 'Chicken Breast',      tags: ['肉类', '鸡'] },
    { id: 'chicken_thigh',     icon: '🍗', name: '鸡腿肉',   nameEn: 'Chicken Thigh',       tags: ['肉类', '鸡'] },
    { id: 'chicken_wing',      icon: '🍗', name: '鸡翅',     nameEn: 'Chicken Wing',        tags: ['肉类', '鸡'] },
    { id: 'chicken_tenderloin',icon: '🍗', name: '鸡里脊',   nameEn: 'Chicken Tenderloin',  tags: ['肉类', '鸡'] },
    // ── 肉类 · 牛 ──
    { id: 'ground_beef',       icon: '🥩', name: '牛肉碎',   nameEn: 'Ground Beef',         tags: ['肉类', '牛'] },
    { id: 'beef_brisket',      icon: '🥩', name: '牛腩',     nameEn: 'Beef Brisket',        tags: ['肉类', '牛'] },
    { id: 'beef_steak',        icon: '🥩', name: '牛排',     nameEn: 'Beef Steak',          tags: ['肉类', '牛'] },
    { id: 'beef_tenderloin',   icon: '🥩', name: '牛里脊',   nameEn: 'Beef Tenderloin',     tags: ['肉类', '牛'] },
    // ── 肉类 · 猪 ──
    { id: 'ground_pork',       icon: '🥓', name: '猪肉碎',   nameEn: 'Ground Pork',         tags: ['肉类', '猪'] },
    { id: 'pork_belly',        icon: '🥓', name: '五花肉',   nameEn: 'Pork Belly',          tags: ['肉类', '猪'] },
    { id: 'pork_ribs',         icon: '🥓', name: '排骨',     nameEn: 'Pork Ribs',           tags: ['肉类', '猪'] },
    { id: 'pork_tenderloin',   icon: '🥓', name: '猪里脊',   nameEn: 'Pork Tenderloin',     tags: ['肉类', '猪'] },
    // ── 肉类 · 羊 ──
    { id: 'ground_lamb',       icon: '🍖', name: '羊肉碎',   nameEn: 'Ground Lamb',         tags: ['肉类', '羊'] },
    { id: 'lamb_leg',          icon: '🍖', name: '羊腿',     nameEn: 'Lamb Leg',            tags: ['肉类', '羊'] },
    { id: 'lamb_chop',         icon: '🍖', name: '羊排',     nameEn: 'Lamb Chop',           tags: ['肉类', '羊'] },
    { id: 'lamb_tenderloin',   icon: '🍖', name: '羊里脊',   nameEn: 'Lamb Tenderloin',     tags: ['肉类', '羊'] },

    // ── 海鲜 · 鱼 ──
    { id: 'sardine',           icon: '🐟', name: '沙丁鱼',   nameEn: 'Sardine',             tags: ['海鲜', '鱼'] },
    { id: 'sea_bass',          icon: '🐟', name: '鲈鱼',     nameEn: 'Sea Bass',            tags: ['海鲜', '鱼'] },
    { id: 'salmon',            icon: '🐟', name: '三文鱼',   nameEn: 'Salmon',              tags: ['海鲜', '鱼'] },
    { id: 'tuna',              icon: '🐟', name: '金枪鱼',   nameEn: 'Tuna',                tags: ['海鲜', '鱼'] },
    // ── 海鲜 · 虾 ──
    { id: 'river_shrimp',      icon: '🦐', name: '河虾',     nameEn: 'River Shrimp',        tags: ['海鲜', '虾'] },
    { id: 'white_shrimp',      icon: '🦐', name: '基围虾',   nameEn: 'White Shrimp',        tags: ['海鲜', '虾'] },
    { id: 'tiger_prawn',       icon: '🦐', name: '明虾',     nameEn: 'Tiger Prawn',         tags: ['海鲜', '虾'] },
    { id: 'spot_prawn',        icon: '🦐', name: '牡丹虾',   nameEn: 'Spot Prawn',          tags: ['海鲜', '虾'] },
    // ── 海鲜 · 贝 ──
    { id: 'clam',              icon: '🐚', name: '蛤蜊',     nameEn: 'Clam',                tags: ['海鲜', '贝'] },
    { id: 'mussel',            icon: '🐚', name: '青口',     nameEn: 'Mussel',              tags: ['海鲜', '贝'] },
    { id: 'scallop',           icon: '🐚', name: '扇贝',     nameEn: 'Scallop',             tags: ['海鲜', '贝'] },
    { id: 'abalone',           icon: '🐚', name: '鲍鱼',     nameEn: 'Abalone',             tags: ['海鲜', '贝'] },
    // ── 海鲜 · 蟹 ──
    { id: 'blue_crab',         icon: '🦀', name: '花蟹',     nameEn: 'Blue Crab',           tags: ['海鲜', '蟹'] },
    { id: 'swimming_crab',     icon: '🦀', name: '梭子蟹',   nameEn: 'Swimming Crab',       tags: ['海鲜', '蟹'] },
    { id: 'dungeness_crab',    icon: '🦀', name: '面包蟹',   nameEn: 'Dungeness Crab',      tags: ['海鲜', '蟹'] },
    { id: 'king_crab',         icon: '🦀', name: '帝王蟹',   nameEn: 'King Crab',           tags: ['海鲜', '蟹'] },

    // ── 蔬菜 · 青菜 ──
    { id: 'cabbage',           icon: '🥬', name: '白菜',     nameEn: 'Cabbage',             tags: ['蔬菜', '青菜'] },
    { id: 'spinach',           icon: '🥬', name: '菠菜',     nameEn: 'Spinach',             tags: ['蔬菜', '青菜'] },
    { id: 'lettuce',           icon: '🥬', name: '生菜',     nameEn: 'Lettuce',             tags: ['蔬菜', '青菜'] },
    { id: 'rapeseed',          icon: '🥬', name: '油菜',     nameEn: 'Rapeseed',            tags: ['蔬菜', '青菜'] },
    // ── 蔬菜 · 根茎 ──
    { id: 'potato',            icon: '🥔', name: '土豆',     nameEn: 'Potato',              tags: ['蔬菜', '根茎'] },
    { id: 'sweet_potato',      icon: '🥔', name: '红薯',     nameEn: 'Sweet Potato',        tags: ['蔬菜', '根茎'] },
    { id: 'taro',              icon: '🥔', name: '芋头',     nameEn: 'Taro',                tags: ['蔬菜', '根茎'] },
    { id: 'lotus_root',        icon: '🥔', name: '莲藕',     nameEn: 'Lotus Root',          tags: ['蔬菜', '根茎'] },
    // ── 蔬菜 · 水果 ──
    { id: 'apple',             icon: '🍎', name: '苹果',     nameEn: 'Apple',               tags: ['蔬菜', '水果'] },
    { id: 'lemon',             icon: '🍋', name: '柠檬',     nameEn: 'Lemon',               tags: ['蔬菜', '水果'] },
    { id: 'mango',             icon: '🥭', name: '芒果',     nameEn: 'Mango',               tags: ['蔬菜', '水果'] },
    { id: 'strawberry',        icon: '🍓', name: '草莓',     nameEn: 'Strawberry',          tags: ['蔬菜', '水果'] },
    // ── 蔬菜 · 菌菇 ──
    { id: 'oyster_mushroom',   icon: '🍄', name: '平菇',     nameEn: 'Oyster Mushroom',     tags: ['蔬菜', '菌菇'] },
    { id: 'shiitake',          icon: '🍄', name: '香菇',     nameEn: 'Shiitake',            tags: ['蔬菜', '菌菇'] },
    { id: 'enoki',             icon: '🍄', name: '金针菇',   nameEn: 'Enoki',               tags: ['蔬菜', '菌菇'] },
    { id: 'king_oyster',       icon: '🍄', name: '杏鲍菇',   nameEn: 'King Oyster Mushroom',tags: ['蔬菜', '菌菇'] },

    // ── 主食 · 米 ──
    { id: 'white_rice',        icon: '🍚', name: '粳米',     nameEn: 'White Rice',          tags: ['主食', '米'] },
    { id: 'brown_rice',        icon: '🍚', name: '糙米',     nameEn: 'Brown Rice',          tags: ['主食', '米'] },
    { id: 'jasmine_rice',      icon: '🍚', name: '茉莉香米', nameEn: 'Jasmine Rice',        tags: ['主食', '米'] },
    { id: 'black_rice',        icon: '🍚', name: '紫米',     nameEn: 'Black Rice',          tags: ['主食', '米'] },
    // ── 主食 · 面 ──
    { id: 'dried_noodles',     icon: '🍜', name: '挂面',     nameEn: 'Dried Noodles',       tags: ['主食', '面'] },
    { id: 'egg_noodles',       icon: '🍜', name: '鸡蛋面',   nameEn: 'Egg Noodles',         tags: ['主食', '面'] },
    { id: 'buckwheat_noodles', icon: '🍜', name: '荞麦面',   nameEn: 'Buckwheat Noodles',   tags: ['主食', '面'] },
    { id: 'udon',              icon: '🍜', name: '乌冬面',   nameEn: 'Udon',                tags: ['主食', '面'] },
    // ── 主食 · 豆 ──
    { id: 'soybean',           icon: '🫘', name: '黄豆',     nameEn: 'Soybean',             tags: ['主食', '豆'] },
    { id: 'red_bean',          icon: '🫘', name: '红豆',     nameEn: 'Red Bean',            tags: ['主食', '豆'] },
    { id: 'mung_bean',         icon: '🫘', name: '绿豆',     nameEn: 'Mung Bean',           tags: ['主食', '豆'] },
    { id: 'chickpea',          icon: '🫘', name: '鹰嘴豆',   nameEn: 'Chickpea',            tags: ['主食', '豆'] },
    // ── 主食 · 面包 ──
    { id: 'white_bread',       icon: '🍞', name: '白面包',   nameEn: 'White Bread',         tags: ['主食', '面包'] },
    { id: 'whole_wheat_bread', icon: '🍞', name: '全麦面包', nameEn: 'Whole Wheat Bread',   tags: ['主食', '面包'] },
    { id: 'sourdough',         icon: '🍞', name: '酸面包',   nameEn: 'Sourdough',           tags: ['主食', '面包'] },
    { id: 'baguette',          icon: '🍞', name: '法棍',     nameEn: 'Baguette',            tags: ['主食', '面包'] },

    // ── 蛋奶制品 · 蛋 ──
    { id: 'chicken_egg',       icon: '🥚', name: '鸡蛋',     nameEn: 'Chicken Egg',         tags: ['蛋奶制品', '蛋'] },
    { id: 'duck_egg',          icon: '🥚', name: '鸭蛋',     nameEn: 'Duck Egg',            tags: ['蛋奶制品', '蛋'] },
    { id: 'quail_egg',         icon: '🥚', name: '鹌鹑蛋',   nameEn: 'Quail Egg',           tags: ['蛋奶制品', '蛋'] },
    { id: 'goose_egg',         icon: '🥚', name: '鹅蛋',     nameEn: 'Goose Egg',           tags: ['蛋奶制品', '蛋'] },
    // ── 蛋奶制品 · 奶 ──
    { id: 'cow_milk',          icon: '🥛', name: '牛奶',     nameEn: 'Cow Milk',            tags: ['蛋奶制品', '奶'] },
    { id: 'goat_milk',         icon: '🥛', name: '羊奶',     nameEn: 'Goat Milk',           tags: ['蛋奶制品', '奶'] },
    { id: 'buffalo_milk',      icon: '🥛', name: '水牛奶',   nameEn: 'Buffalo Milk',        tags: ['蛋奶制品', '奶'] },
    { id: 'camel_milk',        icon: '🥛', name: '驼奶',     nameEn: 'Camel Milk',          tags: ['蛋奶制品', '奶'] },
    // ── 蛋奶制品 · 豆腐 ──
    { id: 'soft_tofu',         icon: '🫘', name: '嫩豆腐',   nameEn: 'Soft Tofu',           tags: ['蛋奶制品', '豆腐'] },
    { id: 'firm_tofu',         icon: '🫘', name: '老豆腐',   nameEn: 'Firm Tofu',           tags: ['蛋奶制品', '豆腐'] },
    { id: 'frozen_tofu',       icon: '🫘', name: '冻豆腐',   nameEn: 'Frozen Tofu',         tags: ['蛋奶制品', '豆腐'] },
    { id: 'tofu_skin',         icon: '🫘', name: '腐竹',     nameEn: 'Tofu Skin',           tags: ['蛋奶制品', '豆腐'] },
    // ── 蛋奶制品 · 奶酪 ──
    { id: 'mozzarella',        icon: '🧀', name: '马苏里拉', nameEn: 'Mozzarella',          tags: ['蛋奶制品', '奶酪'] },
    { id: 'cheddar',           icon: '🧀', name: '切达',     nameEn: 'Cheddar',             tags: ['蛋奶制品', '奶酪'] },
    { id: 'brie',              icon: '🧀', name: '布里',     nameEn: 'Brie',                tags: ['蛋奶制品', '奶酪'] },
    { id: 'parmesan',          icon: '🧀', name: '帕玛森',   nameEn: 'Parmesan',            tags: ['蛋奶制品', '奶酪'] },
];

// --- 品质系统 ---
// quality 1=普通 2=精选 3=优质 4=顶级
export const QUALITY_CONFIG = [
    { id: 1, name: '普通', stars: '★',    scoreValue: 1 },
    { id: 2, name: '精选', stars: '★★',   scoreValue: 2 },
    { id: 3, name: '优质', stars: '★★★',  scoreValue: 3 },
    { id: 4, name: '顶级', stars: '★★★★', scoreValue: 5 },
];

// Probability weights for random quality roll on draw
export const QUALITY_WEIGHTS = { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 };

// --- 市场类型（替换原墙类型）---
// 每种市场只出现对应大类的食材
export const MARKET_TYPES = [
    { id: 'seafood_market',  name: '海鲜市场', icon: '🦐', desc: '只出现海鲜类食材', category: '海鲜',    weight: 20 },
    { id: 'butcher',         name: '肉铺',     icon: '🍖', desc: '只出现肉类食材',   category: '肉类',    weight: 20 },
    { id: 'grain_store',     name: '粮食店',   icon: '🍚', desc: '只出现主食类食材', category: '主食',    weight: 20 },
    { id: 'vegetable_shop',  name: '蔬菜店',   icon: '🥬', desc: '只出现蔬菜类食材', category: '蔬菜',    weight: 20 },
    { id: 'dairy_store',     name: '乳品店',   icon: '🧀', desc: '只出现蛋奶制品',   category: '蛋奶制品', weight: 20 },
];

// --- 菜品关卡 ---
export const DISHES = [
    {
        id: 'ocean_threads',
        name: '海洋线条',
        nameEn: 'Lines of the Sea',
        icon: '🍝',
        baseline: 10,
        slots: [
            {
                name: '主料', required: true, accept: '海鲜', prefer: '虾',
                trigger: {
                    whenTag: '贝',
                    spawnSlot: { name: '主料', required: false, accept: '海鲜', prefer: '虾', exclude: '贝' },
                },
            },
            { name: '基底', required: true,  accept: '主食', prefer: '面' },
            { name: '汤汁', required: false, accept: '蔬菜', prefer: '菌菇' },
            { name: '配料', required: false, accept: '', prefer: '' },
        ],
    },
    {
        id: 'ember_hearth',
        name: '炉火慢歌',
        nameEn: 'Ballad of the Ember Hearth',
        icon: '🍛',
        baseline: 10,
        slots: [
            { name: '主料', required: true, accept: '肉类', prefer: '牛' },
            { name: '底',   required: true, accept: '主食', prefer: ['米', '面包'] },
            {
                name: '炖料', required: false, accept: '蔬菜', prefer: '根茎',
                crossBonus: { requireSlot: '主料', requireTag: '牛', points: 3 },
            },
            { name: '配料', required: false, accept: '', prefer: '' },
        ],
    },
];

// --- 订单模板 ---
// reqQuality: 需求食材的品质等级
// rewardQuality: 奖励食材的品质等级（比需求高）
export const ORDER_TEMPLATES = [
    { id: 'a', difficulty: 'easy',    reqQuality: 1, rewardQuality: 2, totalIngredients: 2, ingredientTypes: 1, weight: 40 },
    { id: 'b', difficulty: 'medium',  reqQuality: 2, rewardQuality: 3, totalIngredients: 3, ingredientTypes: 2, weight: 30 },
    { id: 'c', difficulty: 'hard',    reqQuality: 3, rewardQuality: 4, totalIngredients: 4, ingredientTypes: 3, weight: 20 },
    { id: 'd', difficulty: 'extreme', reqQuality: 2, rewardQuality: 4, totalIngredients: 6, ingredientTypes: 4, weight: 10 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,
    scoreToWin: 30,
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 5,
    maxActive: 3,
    newPerTurn: 1,
    initialCount: 4,
};
```

- [ ] **Step 2: Start dev server and verify no import errors**

Run: `npm run dev`
Expected: Server starts without errors. Open browser console — no import errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/v2Config.js
git commit -m "CHANGE: 食材体系重构 — 删除贴纸，添加80种食材类型+品质系统+市场类型"
```

---

## Task 2: Update `src/utils/matrixHelpers.js`

**Files:**
- Modify: `src/utils/matrixHelpers.js`

The goal: walls now use `ingredient` cells (not `sticker`). Grid shows ingredient type, no quality. The `out_of_game` phase still exists but no longer pre-assigns rarity.

- [ ] **Step 1: Replace matrixHelpers.js**

Replace the full file:

```javascript
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function rollItemSize(weights) {
  const entries = Object.entries(weights).map(([k, v]) => [Number(k), v]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [size, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return size;
  }
  return 1;
}

function tryPlaceShape(shape, startRow, startCol, grid, gridSize) {
  const positions = [];
  for (const [dr, dc] of shape) {
    const r = startRow + dr;
    const c = startCol + dc;
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null;
    if (grid[r][c] !== null) return null;
    positions.push([r, c]);
  }
  return positions;
}

/**
 * Pick all ingredients belonging to a market type's category.
 * @param {Object} marketType — from MARKET_TYPES, has .category
 */
export function pickMarketIngredients(marketType) {
  return INGREDIENTS.filter(i => i.tags[0] === marketType.category);
}

/**
 * Generate a 4×4 wall matrix using ingredient types from the given pool.
 *
 * Phase 1: Roll doom cells (normal distribution)
 * Phase 2: Roll special cells (gold / order_cell / out_of_game / bomb)
 * Phase 3: Fill remaining empty cells with ingredient shapes (polyomino)
 *
 * Grid cells do NOT store quality — quality is assigned at draw time.
 *
 * @param {Array} marketIngredients — ingredient objects filtered by market category
 */
export function generateWall(marketIngredients) {
  const { gridSize, doomCells, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0, upgrade: 0 };

  // Phase 1: Doom cells — normal distribution, median ~5
  const u1 = Math.random();
  const u2 = Math.random();
  const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const totalDoom = Math.max(1, Math.min(9, Math.round(5 + normalSample * 1.5)));
  const resCount = Math.max(0, Math.min(totalDoom, Math.round(totalDoom * (0.5 + (Math.random() - 0.5) * 0.3))));
  const upgCount = totalDoom - resCount;

  const allPositions = [];
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      allPositions.push([r, c]);
  allPositions.sort(() => Math.random() - 0.5);

  for (let i = 0; i < totalDoom && i < allPositions.length; i++) {
    const [r, c] = allPositions[i];
    if (i < resCount) {
      grid[r][c] = { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID() };
      doomCellCount.resolution++;
    } else {
      grid[r][c] = { type: 'doom_upgrade', icon: doomCells.upgrade.icon, name: doomCells.upgrade.name, uid: generateUID() };
      doomCellCount.upgrade++;
    }
  }

  // Phase 2: Special cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;

      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const outOfGameChance = orderChance + specialCells.outOfGame.spawnChance;
      const bombChance = outOfGameChance + (specialCells.bomb?.spawnChance || 0);

      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID() };
      } else if (roll < orderChance) {
        grid[row][col] = { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID() };
      } else if (roll < outOfGameChance) {
        // Pick random ingredient — no quality pre-assigned, revealed on draw
        const item = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
        grid[row][col] = {
          type: 'out_of_game',
          icon: item.icon,
          name: item.name,
          item: { ...item },
          uid: generateUID(),
        };
      } else if (roll < bombChance) {
        grid[row][col] = { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID() };
      }
    }
  }

  // Phase 3: Fill remaining cells with ingredient shapes
  const getEmptyPositions = () => {
    const empty = [];
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (grid[r][c] === null) empty.push([r, c]);
    return empty;
  };

  let empty = getEmptyPositions();
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    if (grid[startR][startC] !== null) { empty.shift(); continue; }

    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
      const shuffled = [...shapesForSize].sort(() => Math.random() - 0.5);

      for (const shape of shuffled) {
        const positions = tryPlaceShape(shape, startR, startC, grid, gridSize);
        if (positions) {
          const ingredient = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'ingredient',
              item: { ...ingredient },
              uid: generateUID(),
              groupId,
              shapeSize: size,
            };
          }
          placed = true;
          break;
        }
      }
      if (!placed) size--;
    }

    if (!placed) {
      const ingredient = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
      grid[startR][startC] = {
        type: 'ingredient',
        item: { ...ingredient },
        uid: generateUID(),
        groupId: generateUID(),
        shapeSize: 1,
      };
    }

    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

  return { grid, doomCellCount };
}
```

- [ ] **Step 2: Start dev server, verify no import errors**

Run: `npm run dev`
Expected: Server starts. Console may show React warnings but no import errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/matrixHelpers.js
git commit -m "CHANGE: matrixHelpers — 墙格子从sticker改为ingredient，去除品质预分配"
```

---

## Task 3: Update `src/hooks/useGameLogic.js`

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the largest change. Apply the following edits in order.

- [ ] **Step 1: Update imports (line 4)**

Replace:
```javascript
import { STICKER_TYPES, INGREDIENTS, ORDER_TEMPLATES, WALL_TYPES } from '../data/v2Config';
```
With:
```javascript
import { INGREDIENTS, ORDER_TEMPLATES, MARKET_TYPES, QUALITY_CONFIG, QUALITY_WEIGHTS } from '../data/v2Config';
```

- [ ] **Step 2: Update matrixHelpers import (line 2)**

Replace:
```javascript
import { generateWall, pickWallStickers } from '../utils/matrixHelpers';
```
With:
```javascript
import { generateWall, pickMarketIngredients } from '../utils/matrixHelpers';
```

- [ ] **Step 3: Add rollQuality helper — add after weightedRandom function (around line 25)**

Add this function:
```javascript
function rollQuality() {
    const entries = Object.entries(QUALITY_WEIGHTS);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [qId, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return Number(qId);
    }
    return 1;
}
```

- [ ] **Step 4: Replace pickWallType function (around line 37)**

Replace:
```javascript
function pickWallType() {
    const total = WALL_TYPES.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of WALL_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return WALL_TYPES[0];
}
```
With:
```javascript
function pickMarketType() {
    const total = MARKET_TYPES.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of MARKET_TYPES) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return MARKET_TYPES[0];
}
```

- [ ] **Step 5: Replace generateOrder function (lines 47–69)**

Replace the entire `generateOrder` function:
```javascript
function generateOrder() {
    const template = pickWeightedTemplate();

    // Reward: random ingredient at rewardQuality
    const rewardIng = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
    const rewardQualityDef = QUALITY_CONFIG.find(q => q.id === template.rewardQuality) || QUALITY_CONFIG[0];
    const reward = {
        ...rewardIng,
        quality: template.rewardQuality,
        score: rewardQualityDef.scoreValue,
        isOutOfGame: true,
    };

    // Requirements: N different ingredient types at reqQuality
    const shuffledIngredients = [...INGREDIENTS].sort(() => Math.random() - 0.5);
    const selectedIngredients = shuffledIngredients.slice(0, template.ingredientTypes);
    const requirements = [];
    let remaining = template.totalIngredients;
    for (let i = 0; i < selectedIngredients.length; i++) {
        const count = i === selectedIngredients.length - 1
            ? remaining
            : 1 + Math.floor(Math.random() * (remaining - (selectedIngredients.length - i - 1)));
        requirements.push({
            ingredientId: selectedIngredients[i].id,
            icon: selectedIngredients[i].icon,
            name: selectedIngredients[i].name,
            quality: template.reqQuality,
            count,
        });
        remaining -= count;
    }

    return { id: generateUID(), difficulty: template.difficulty, rewards: [reward], totalScore: reward.score, requirements };
}
```

- [ ] **Step 6: Update startNewTurn — wall candidate generation (around lines 170–180)**

Replace:
```javascript
        const candidates = [];
        const usedTypeIds = new Set();
        while (candidates.length < 3) {
            const wallType = pickWallType();
            if (usedTypeIds.has(wallType.id)) continue;
            usedTypeIds.add(wallType.id);
            const stickers = pickWallStickers(STICKER_TYPES);
            const { grid, doomCellCount } = generateWall(stickers);
            candidates.push({ stickers, grid, doomCellCount, wallType });
        }
```
With:
```javascript
        const candidates = [];
        const usedTypeIds = new Set();
        while (candidates.length < 3) {
            const marketType = pickMarketType();
            if (usedTypeIds.has(marketType.id)) continue;
            usedTypeIds.add(marketType.id);
            const marketIngredients = pickMarketIngredients(marketType);
            const { grid, doomCellCount } = generateWall(marketIngredients);
            candidates.push({ marketIngredients, grid, doomCellCount, wallType: marketType });
        }
```

- [ ] **Step 7: Simplify selectWall — remove hidden/multiplier mutations (around lines 224–275)**

Replace the entire `selectWall` function with a simplified version (market walls have no special mechanics):
```javascript
    const selectWall = (index) => {
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        setCurrentWallType(chosen.wallType);
        setMatrix(chosen.grid.map(r => r.map(c => c ? { ...c } : null)));
        setWallCandidates(null);
        setPhase('drawing');
    };
```

- [ ] **Step 8: Remove alternating wall restriction in selectRow (around line 289)**

Remove this line from `selectRow`:
```javascript
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'row') return;
```

- [ ] **Step 9: Remove alternating wall restriction in selectColumn (around line 338)**

Remove this line from `selectColumn`:
```javascript
        if (currentWallType?.id === 'alternating' && lastDrawDirection === 'column') return;
```

- [ ] **Step 10: Update completeDrawAnim — handle ingredient cells (around line 404)**

Replace:
```javascript
        if (drawnCell.type === 'item' || drawnCell.type === 'sticker' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
```
With:
```javascript
        if (drawnCell.type === 'ingredient' || drawnCell.type === 'out_of_game') {
            obtainedItem = drawnCell;
```

- [ ] **Step 11: Update completeDrawAnim — multiplier check (around line 549)**

Replace:
```javascript
            if (mult > 1 && (obtainedItem.type === 'sticker' || obtainedItem.type === 'item')) {
```
With:
```javascript
            if (mult > 1 && obtainedItem.type === 'ingredient') {
```

- [ ] **Step 12: Remove hidden reveal logic from completeDrawAnim (around lines 467–494)**

Delete the entire hidden wall reveal block:
```javascript
            // Hidden wall: reveal adjacent hidden cells (whole group reveals together)
            if (currentWallType?.id === 'hidden') {
                // ... entire block through closing }
            }
```

- [ ] **Step 13: Remove drift shuffle logic from completeDrawAnim (around lines 497–534)**

Delete the entire drift wall shuffle block:
```javascript
            // Drift wall: shuffle remaining non-null cells to random positions
            if (currentWallType?.id === 'drift') {
                // ... entire block through closing }
            }
```

- [ ] **Step 14: Update addToInventory — replace sticker case with ingredient (around lines 582–613)**

Replace the entire `addToInventory` function:
```javascript
    const addToInventory = (itemCell) => {
        const quality = rollQuality();
        const qualityDef = QUALITY_CONFIG.find(q => q.id === quality) || QUALITY_CONFIG[0];
        const newItem = {
            ...itemCell.item,
            quality,
            score: qualityDef.scoreValue,
            isOutOfGame: true,
            uid: itemCell.uid,
        };
        if (inventory.length >= maxInventorySize) {
            setPendingItems(prev => [...prev, newItem]);
            return;
        }
        setInventory(prev => [...prev, newItem]);
    };
```

- [ ] **Step 15: Update synthesizeItems — use quality instead of rarity lookup (around lines 638–669)**

Replace the `synthesizeItems` function:
```javascript
    const synthesizeItems = (index1, index2) => {
        const item1 = inventory[index1];
        const item2 = inventory[index2];
        if (!item1 || !item2) return false;
        if (item1.id !== item2.id || item1.quality !== item2.quality) return false;
        if (item1.quality >= 4) return false;

        const newQuality = item1.quality + 1;
        const newQualityDef = QUALITY_CONFIG.find(q => q.id === newQuality) || QUALITY_CONFIG[QUALITY_CONFIG.length - 1];

        setInventory(prev => {
            const next = [...prev];
            const [lo, hi] = index1 < index2 ? [index1, index2] : [index2, index1];
            next.splice(hi, 1);
            next.splice(lo, 1);
            next.push({ ...item1, quality: newQuality, score: newQualityDef.scoreValue, uid: generateUID() });
            return next;
        });

        showToast(`${t('合成成功')}: ${item1.icon} ${item1.name} (${newQualityDef.name})`, 'success');
        return true;
    };
```

- [ ] **Step 16: Update debugAddItem — remove isSticker path (around lines 672–688)**

Replace the `debugAddItem` function:
```javascript
    const debugAddItem = (itemDef, count) => {
        const quality = itemDef.quality || 1;
        const qualityDef = QUALITY_CONFIG.find(q => q.id === quality) || QUALITY_CONFIG[0];
        const makeItem = () => ({
            ...itemDef,
            quality,
            score: qualityDef.scoreValue,
            isOutOfGame: true,
            uid: generateUID(),
        });

        const toInventory = [];
        const toPending = [];
        for (let i = 0; i < count; i++) {
            if (inventory.length + toInventory.length < maxInventorySize) {
                toInventory.push(makeItem());
            } else {
                toPending.push(makeItem());
            }
        }
        if (toInventory.length > 0) setInventory(prev => [...prev, ...toInventory]);
        if (toPending.length > 0) setPendingItems(prev => [...prev, ...toPending]);
    };
```

- [ ] **Step 17: Update canSubmitOrder — match by ingredientId + quality (around lines 738–748)**

Replace:
```javascript
    const canSubmitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return false;
        const stickerCounts = {};
        for (const item of inventory) {
            if (item.isSticker && item.stickerId) {
                stickerCounts[item.stickerId] = (stickerCounts[item.stickerId] || 0) + 1;
            }
        }
        return order.requirements.every(req => (stickerCounts[req.stickerId] || 0) >= req.count);
    };
```
With:
```javascript
    const canSubmitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return false;
        const ingCounts = {};
        for (const item of inventory) {
            if (item.id && item.quality != null) {
                const key = `${item.id}:${item.quality}`;
                ingCounts[key] = (ingCounts[key] || 0) + 1;
            }
        }
        return order.requirements.every(req => {
            const key = `${req.ingredientId}:${req.quality}`;
            return (ingCounts[key] || 0) >= req.count;
        });
    };
```

- [ ] **Step 18: Update submitOrder — replace sticker removal with ingredient removal (around lines 751–790)**

Replace:
```javascript
    const submitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;
        if (!canSubmitOrder(orderId)) {
            showToast(t('贴纸不足'), 'warning');
            return;
        }

        // Remove required stickers from inventory
        const toRemove = {};
        for (const req of order.requirements) {
            toRemove[req.stickerId] = (toRemove[req.stickerId] || 0) + req.count;
        }
        setInventory(prev => {
            const remaining = [...prev];
            for (const [stickerId, count] of Object.entries(toRemove)) {
                let removed = 0;
                for (let i = remaining.length - 1; i >= 0 && removed < count; i--) {
                    if (remaining[i].isSticker && remaining[i].stickerId === stickerId) {
                        remaining.splice(i, 1);
                        removed++;
                    }
                }
            }
            // Add all reward items
            for (const reward of order.rewards) {
                remaining.push({
                    ...reward,
                    score: reward.rarity || reward.score,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
            return remaining;
        });

        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        showToast(t('订单完成'), 'success');
    };
```
With:
```javascript
    const submitOrder = (orderId) => {
        const order = bulletinBoard.find(o => o.id === orderId);
        if (!order) return;
        if (!canSubmitOrder(orderId)) {
            showToast(t('食材不足'), 'warning');
            return;
        }

        // Build removal counts keyed by ingredientId:quality
        const toRemove = {};
        for (const req of order.requirements) {
            const key = `${req.ingredientId}:${req.quality}`;
            toRemove[key] = (toRemove[key] || 0) + req.count;
        }
        setInventory(prev => {
            const remaining = [...prev];
            for (const [key, count] of Object.entries(toRemove)) {
                const [ingId, qStr] = key.split(':');
                const quality = Number(qStr);
                let removed = 0;
                for (let i = remaining.length - 1; i >= 0 && removed < count; i--) {
                    if (remaining[i].id === ingId && remaining[i].quality === quality) {
                        remaining.splice(i, 1);
                        removed++;
                    }
                }
            }
            for (const reward of order.rewards) {
                remaining.push({ ...reward, uid: generateUID() });
            }
            return remaining;
        });

        setBulletinBoard(prev => prev.filter(o => o.id !== orderId));
        showToast(t('订单完成'), 'success');
    };
```

- [ ] **Step 19: Check for any remaining sticker references in useGameLogic.js**

Run: `grep -n "sticker\|isSticker\|STICKER" src/hooks/useGameLogic.js`
Expected: Only comments (if any). Fix any remaining references.

- [ ] **Step 20: Verify dev server starts without errors, test basic flow**

Run: `npm run dev`
Open browser: Start game → pick a wall → draw a cell → verify ingredient appears in inventory with quality stars.

- [ ] **Step 21: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "CHANGE: useGameLogic — 贴纸逻辑→食材逻辑，抽取时随机分配品质，订单需求改为食材"
```

---

## Task 4: Update UI Components

**Files:**
- Modify: `src/components/game/BulletinBoard.jsx`
- Modify: `src/components/game/ActiveOrders.jsx`
- Modify: `src/components/game/WallPicker.jsx`
- Modify: `src/components/game/ResourceMatrix.jsx`
- Modify: `src/components/game/ScoreBoard.jsx`
- Modify: `src/components/game/Kitchen.jsx`

### 4a: BulletinBoard.jsx

- [ ] **Step 1: Replace RARITY_STYLE with QUALITY_STYLE (lines 12–17)**

Replace:
```javascript
const RARITY_STYLE = {
    1: { border: 'border-green-400',  bg: 'from-green-50 to-white',   badge: 'bg-green-500', label: '★',       labelColor: 'text-green-400',  tagBg: 'bg-green-100 text-green-700' },
    2: { border: 'border-blue-400',   bg: 'from-blue-50 to-white',   badge: 'bg-blue-500',  label: '★★',      labelColor: 'text-blue-400',   tagBg: 'bg-blue-100 text-blue-700' },
    3: { border: 'border-purple-400', bg: 'from-purple-50 to-white', badge: 'bg-purple-500', label: '★★★',     labelColor: 'text-purple-400', tagBg: 'bg-purple-100 text-purple-700' },
    4: { border: 'border-orange-400', bg: 'from-orange-50 to-white', badge: 'bg-orange-500', label: '★★★★',    labelColor: 'text-orange-400', tagBg: 'bg-orange-100 text-orange-700' },
};
// Backward compat alias
const SCORE_STYLE = RARITY_STYLE;

const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };
```
With:
```javascript
const QUALITY_STYLE = {
    1: { border: 'border-gray-400',   bg: 'from-gray-50 to-white',   badge: 'bg-gray-500',   label: '★',    labelColor: 'text-gray-400',   tagBg: 'bg-gray-100 text-gray-600'   },
    2: { border: 'border-green-400',  bg: 'from-green-50 to-white',  badge: 'bg-green-500',  label: '★★',   labelColor: 'text-green-400',  tagBg: 'bg-green-100 text-green-700'  },
    3: { border: 'border-blue-400',   bg: 'from-blue-50 to-white',   badge: 'bg-blue-500',   label: '★★★',  labelColor: 'text-blue-400',   tagBg: 'bg-blue-100 text-blue-700'    },
    4: { border: 'border-orange-400', bg: 'from-orange-50 to-white', badge: 'bg-orange-500', label: '★★★★', labelColor: 'text-orange-400', tagBg: 'bg-orange-100 text-orange-700' },
};
// Backward compat aliases
const RARITY_STYLE = QUALITY_STYLE;
const SCORE_STYLE = QUALITY_STYLE;

const QUALITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };
const RARITY_STARS = QUALITY_STARS;
```

- [ ] **Step 2: Update IngredientTip to use quality (lines 24–48)**

Replace:
```javascript
const IngredientTip = ({ item }) => {
    const rarity = item.rarity || item.score || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{item.name}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{RARITY_STARS[rarity]}</div>
                </div>
            </div>
```
With:
```javascript
const IngredientTip = ({ item }) => {
    const quality = item.quality || item.score || 1;
    const s = QUALITY_STYLE[quality] || QUALITY_STYLE[1];
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{item.name}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{QUALITY_STARS[quality]}</div>
                </div>
            </div>
```

- [ ] **Step 3: Update RewardCard to use quality (lines 50–71)**

Replace:
```javascript
const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const rarity = reward.rarity || reward.score || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
```
With:
```javascript
const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const quality = reward.quality || reward.score || 1;
    const s = QUALITY_STYLE[quality] || QUALITY_STYLE[1];
```

And replace the badge number from `{rarity}` to `{quality}`:
```javascript
                <span className={`absolute -bottom-1 -right-1 ${s.badge} text-white font-black ${badgeDim} rounded-full flex items-center justify-center shadow`}>
                    {quality}
                </span>
```

- [ ] **Step 4: Update BulletinBoard props — rename hoveredStickerIds (line 73–78)**

Replace `hoveredStickerIds` with `hoveredIngredientIds` in the component signature and all usages within BulletinBoard.jsx:

```javascript
const BulletinBoard = ({
    orders, inventory, onSubmit, canSubmitOrder,
    incomingOrder, onConfirmIncoming, onDiscardIncoming,
    pendingChosenOrder, onReplaceIncoming,
    hoveredIngredientIds, bonusItemMap,
}) => {
```

- [ ] **Step 5: Update order requirements display in BulletinBoard (around lines 203–243)**

Replace the sticker requirements block with ingredient requirements:
```javascript
                                    {/* Row 2: ingredient requirements */}
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                        <span className="text-[9px] text-gray-300 uppercase tracking-wide">{t('需要')}</span>
                                        {order.requirements.map((req, i) => {
                                            const owned = inventory ? inventory.filter(item =>
                                                item.id === req.ingredientId && item.quality === req.quality
                                            ).length : 0;
                                            const enough = owned >= req.count;
                                            const isHovered = hoveredIngredientIds?.has(req.ingredientId);
                                            const qs = QUALITY_STYLE[req.quality] || QUALITY_STYLE[1];
                                            return (
                                                <Tooltip key={i} content={
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-2xl leading-none">{req.icon}</span>
                                                            <div>
                                                                <div className="font-bold text-sm leading-tight">{req.name}</div>
                                                                <div className={`text-[10px] ${qs.labelColor}`}>{QUALITY_STARS[req.quality]}</div>
                                                            </div>
                                                        </div>
                                                        <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-gray-400">持有 / 需要</span>
                                                                <span className={`font-bold ${enough ? 'text-green-400' : 'text-red-400'}`}>{owned} / {req.count}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                }>
                                                    <div className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                        <div className={`w-7 h-7 rounded border-2 ${
                                                            isHovered ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300'
                                                            : enough ? qs.border + ' bg-white'
                                                            : 'border-gray-300 bg-white'
                                                        } flex items-center justify-center text-sm shadow-sm`}>
                                                            {req.icon}
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${isHovered ? 'text-blue-600' : enough ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {owned}<span className="font-normal text-gray-300">/{req.count}</span>
                                                        </span>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
```

- [ ] **Step 6: Update export line (last line)**

Replace:
```javascript
export { RewardCard, IngredientTip, RARITY_STYLE, SCORE_STYLE, DIFFICULTY_STYLE };
```
With:
```javascript
export { RewardCard, IngredientTip, QUALITY_STYLE, RARITY_STYLE, SCORE_STYLE, DIFFICULTY_STYLE };
```

### 4b: ActiveOrders.jsx

- [ ] **Step 7: Rename hoveredStickerIds → hoveredIngredientIds in ActiveOrders.jsx**

Replace the prop in the function signature (line 6):
```javascript
const ActiveOrders = ({ orders, inventory, onSubmit, canSubmitOrder, pendingAcceptOrder, onConfirmReplace, onCancelReplace, hoveredIngredientIds, bonusItemMap }) => {
```

- [ ] **Step 8: Update sticker requirements display in ActiveOrders.jsx (around lines 88–130)**

Replace the sticker requirements block with:
```javascript
                                {/* Row 2: ingredient requirements */}
                                <div className="flex gap-1.5 flex-wrap items-center">
                                    <span className="text-[9px] text-gray-300 uppercase tracking-wide">{t('需要')}</span>
                                    {order.requirements.map((req, i) => {
                                        const owned = inventory.filter(item =>
                                            item.id === req.ingredientId && item.quality === req.quality
                                        ).length;
                                        const enough = owned >= req.count;
                                        const isHovered = hoveredIngredientIds?.has(req.ingredientId);
                                        return (
                                            <div key={i} className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                <div className={`w-7 h-7 rounded border ${
                                                    isHovered ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300'
                                                    : enough ? 'border-green-400 bg-green-50'
                                                    : 'border-gray-300 bg-white'
                                                } flex items-center justify-center text-sm shadow-sm`}>
                                                    {req.icon}
                                                </div>
                                                <span className={`text-[10px] font-bold ${isHovered ? 'text-blue-600' : enough ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {owned}<span className="font-normal text-gray-300">/{req.count}</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
```

### 4c: WallPicker.jsx

- [ ] **Step 9: Update WallPicker to show market type info**

Replace the entire WallPicker.jsx content:
```javascript
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-gray-400 mb-5">{t('每面墙只出现对应市场的食材')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(idx)}
                        className="w-52 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                            hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                    >
                        <div className="text-sm font-bold mb-1">{wall.wallType.icon} {t(wall.wallType.name)}</div>
                        <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{t(wall.wallType.desc)}</p>

                        <div className="text-[9px] text-gray-300 uppercase tracking-wide mb-1">{t('食材类型')}</div>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {wall.marketIngredients && wall.marketIngredients.slice(0, 8).map(ing => (
                                <div key={ing.id} className="w-7 h-7 rounded border border-gray-200 bg-white flex items-center justify-center text-sm shadow-sm" title={ing.name}>
                                    {ing.icon}
                                </div>
                            ))}
                            {wall.marketIngredients && wall.marketIngredients.length > 8 && (
                                <div className="w-7 h-7 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400">
                                    +{wall.marketIngredients.length - 8}
                                </div>
                            )}
                        </div>

                        <div className="text-[10px] text-red-500 font-bold">
                            💀 {wall.doomCellCount.resolution + wall.doomCellCount.upgrade} {t('厄运格')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WallPicker;
```

### 4d: ResourceMatrix.jsx

- [ ] **Step 10: Update cell tooltip — handle ingredient type (around lines 24–67)**

Replace the `out_of_game` case tooltip to not show rarity (quality unknown):
```javascript
    } else if (cell.type === 'out_of_game') {
        icon = cell.icon;
        name = cell.item?.name || t(cell.name);
        const tags = cell.item?.tags || [];
        desc = (
            <>
                <span className="text-[10px] text-gray-400 italic">{t('品质未知，抽到后揭示')}</span>
                {tags.length > 0 && (
                    <span className="ml-2">
                        {tags.map(tag => (
                            <span key={tag} className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 mr-1">{tag}</span>
                        ))}
                    </span>
                )}
                {cell.item?.nameEn && (
                    <span className="block text-[10px] text-slate-400 italic mt-1">{cell.item.nameEn}</span>
                )}
            </>
        );
```

Add a new case for `ingredient` type right before the final `else { return null; }`:
```javascript
    } else if (cell.type === 'ingredient') {
        icon = cell.icon;
        name = cell.item?.name || '';
        const tags = cell.item?.tags || [];
        desc = (
            <>
                <span className="text-[10px] text-gray-400 italic">{t('品质未知，抽到后揭示')}</span>
                {tags.length > 0 && (
                    <span className="ml-2">
                        {tags.map(tag => (
                            <span key={tag} className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 mr-1">{tag}</span>
                        ))}
                    </span>
                )}
            </>
        );
```

- [ ] **Step 11: Update ResourceMatrix cell rendering — add ingredient type (around lines 130 and 192)**

Replace:
```javascript
    } else if (cell.type === 'item' || cell.type === 'sticker') {
```
With:
```javascript
    } else if (cell.type === 'ingredient' || cell.type === 'item') {
```

And:
```javascript
            {cell !== null && (cell.type === 'item' || cell.type === 'sticker') && !cell.hidden && (
```
With:
```javascript
            {cell !== null && (cell.type === 'ingredient' || cell.type === 'item') && !cell.hidden && (
```

And the draw handler:
```javascript
            if (cell.type === 'item' || cell.type === 'sticker') {
```
With:
```javascript
            if (cell.type === 'ingredient' || cell.type === 'item') {
```

- [ ] **Step 12: Update hover tracking in ResourceMatrix — collect ingredient IDs (around lines 210–222)**

Replace all occurrences of sticker hover collection:
```javascript
                if (cell?.type === 'sticker' && cell.item?.id) ids.add(cell.item.id);
```
With:
```javascript
                if ((cell?.type === 'ingredient' || cell?.type === 'item') && cell.item?.id) ids.add(cell.item.id);
```

Also update any prop name passed from ResourceMatrix that was `onHoveredStickersChange` or similar — rename to `onHoveredIngredientsChange`.

### 4e: ScoreBoard.jsx

- [ ] **Step 13: Update ScoreBoard to use quality for styling**

Replace (line 23):
```javascript
                                const sc = RARITY_STYLE[item.rarity || item.score] || RARITY_STYLE[1];
```
With:
```javascript
                                const sc = RARITY_STYLE[item.quality || item.score] || RARITY_STYLE[1];
```

### 4f: Kitchen.jsx

- [ ] **Step 14: Update scoreDish to use quality (line 39)**

Replace:
```javascript
        const base = ing.rarity || 1;
```
With:
```javascript
        const base = ing.quality || 1;
```

### 4g: Check GameCore.jsx for prop name updates

- [ ] **Step 15: Check and update GameCore.jsx**

Run: `grep -n "hoveredSticker\|hoveredIngredient" src/components/game/*.jsx src/*.jsx`

Find where `hoveredStickerIds` is declared/passed in GameCore or parent components. Rename the state variable and all prop passings from `hoveredStickerIds` to `hoveredIngredientIds`. The state is likely in `ResourceMatrix` or wherever the row/col hover is tracked.

- [ ] **Step 16: Final verification in browser**

Run: `npm run dev` and test the full flow:
1. Start game → 3 market walls appear in wall picker (e.g., 肉铺, 海鲜市场, 粮食店)
2. Select a wall → grid shows ingredient icons of that category
3. Draw a cell → ingredient appears in inventory WITH quality stars (e.g., "精选 鸡腿肉 ★★")
4. Draw more → accumulate ingredients
5. Check bulletin board → orders show ingredient requirements with quality icons
6. Accumulate required ingredients → submit order → reward ingredient (higher quality) added to inventory
7. Synthesize two identical quality items → one higher quality item
8. Evacuate → score calculated from inventory `item.score` values

- [ ] **Step 17: Commit**

```bash
git add src/components/game/BulletinBoard.jsx src/components/game/ActiveOrders.jsx src/components/game/WallPicker.jsx src/components/game/ResourceMatrix.jsx src/components/game/ScoreBoard.jsx src/components/game/Kitchen.jsx
git commit -m "CHANGE: UI组件更新 — 贴纸→食材显示，品质样式，市场选择界面"
```

---

## Self-Review

### Spec Coverage Checklist
- [x] Delete all stickers (STICKER_TYPES removed, no isSticker logic)
- [x] 5 categories × 4 subcategories × 4 types = 80 ingredient types in INGREDIENTS
- [x] No rarity on ingredient definitions
- [x] Quality (普通/精选/优质/顶级) assigned randomly on draw via rollQuality()
- [x] Grid shows ingredient type, no quality (tooltip says "品质未知")
- [x] 5 market types replace 5 wall types (each market filters by category)
- [x] 3-choose-1 wall picker shows market types
- [x] Orders require ingredients (different types), rewards are higher-quality ingredients
- [x] Synthesis: 2 same id + same quality → 1 next quality (updated synthesizeItems)
- [x] Evacuation scoring: item.score = QUALITY_CONFIG scoreValue (unchanged logic)

### Potential Gaps
- GameCore.jsx prop name `hoveredStickerIds` → `hoveredIngredientIds` — covered in Step 15, but the exact location needs to be confirmed at runtime
- The `WALL_STICKER_COUNT` export was removed — check if anything imports it: `grep -r "WALL_STICKER_COUNT" src/`
- The `generateTurnMatrix` legacy export in matrixHelpers was removed — check if anything uses it: `grep -r "generateTurnMatrix" src/`
