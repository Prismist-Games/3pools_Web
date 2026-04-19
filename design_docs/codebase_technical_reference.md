# 幸运之墙 Wall of Fortune — 代码技术参考

面向在此 repo 工作的开发者 / AI agent。读完能正确定位修改点。

> **最后更新**：2026-04-19 · Day 1 重构后
> 玩法规则见 `game_rules.md`，进度状态见 `gameplay_progress.md`，设定见 `setting-current-state.md`，v2.5 归档见 `game_rules_v2_5_archive.md`。

---

## 目录

1. [技术栈与构建](#1-技术栈与构建)
2. [目录结构](#2-目录结构)
3. [数据流](#3-数据流)
4. [数据层 `v2Config.js`](#4-数据层-v2configjs)
5. [纯函数层 `shopHelpers.js`](#5-纯函数层-shophelpersjs)
6. [状态 Hook `useGameLogic.js`](#6-状态-hook-usegamelogicjs)
7. [GameCore 与组件](#7-gamecore-与组件)
8. [i18n](#8-i18n)
9. [修改指南](#9-修改指南)

---

## 1. 技术栈与构建

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI |
| Vite | 6.x | 构建 + HMR |
| Tailwind CSS | 3.x | 样式（带 kitchen-* 自定色） |
| Lucide React | 0.469 | 图标 |

部署路径：`base: '/3pools_Web/'`（GitHub Pages）。

```bash
npm run dev     # http://localhost:5173/3pools_Web/
npm run build   # → dist/
npm run preview
```

无测试套件；冒烟靠 Vite build + 手动浏览器验收。

---

## 2. 目录结构

```
1.2Antigravity_attempt/
├── assets/
├── src/
│   ├── main.jsx                     React 入口
│   ├── App.jsx                      路由：Prologue ↔ GameCore
│   ├── GameCore.jsx                 ★ 主游戏布局（消费 useGameLogic）
│   ├── index.css                    Tailwind 指令
│   │
│   ├── data/
│   │   ├── v2Config.js              ★ 食材库 + Day 1 常量
│   │   └── matrixConfig.js          4×4 网格尺寸（gridSize）
│   │
│   ├── hooks/
│   │   └── useGameLogic.js          ★ 全局状态机（~400 行）
│   │
│   ├── utils/
│   │   ├── shopHelpers.js           ★ 墙生成 / 掷骰 / 菜品生成等纯函数
│   │   └── translations.js          中文 → 英文映射
│   │
│   ├── contexts/
│   │   └── LanguageContext.jsx      i18n Provider
│   │
│   └── components/
│       ├── ErrorBoundary.jsx
│       ├── ui/
│       │   ├── Tooltip.jsx
│       │   ├── Toast.jsx
│       │   └── ConfirmDialog.jsx
│       └── game/
│           ├── Prologue.jsx              入场选厨师
│           ├── TopBar.jsx                日/时/满意度/重置/今日结束
│           ├── ShopPicker.jsx            3 店选 1
│           ├── ShopMatrix.jsx            4×4 + 2×2 hover + targeted 分支
│           ├── PrecisePicker.jsx         精准词缀的 2 候选弹窗
│           ├── ShopBasket.jsx            店内临时篮（10 格）
│           ├── Fridge.jsx                全局冰箱（15 格）
│           ├── DishBoard.jsx             3 菜 × 3 槽 + 确定
│           ├── PendingResolver.jsx       临时篮/冰箱满时替换 UX
│           ├── EndScreens.jsx            Start / DayEnd / GameOver
│           └── uiCommon.jsx              共享：IngredientChip / 按钮类 / Panel
│
└── design_docs/
    ├── game_rules.md                    当前规则（Day 1）
    ├── game_rules_v2_5_archive.md       v2.5 归档
    ├── gameplay_progress.md             进度总览
    ├── codebase_technical_reference.md  ← 本文
    ├── setting-current-state.md
    ├── setting-evolution-log.md
    └── reference/                       会话与分析归档
```

---

## 3. 数据流

```
v2Config.js (静态数据)
   │
   ▼
shopHelpers.js (纯函数：generateShopWall / rollAffix / rollQuality / generateDailyDishes / pickShopCandidates / resolveIngredient / refreshShopRegion)
   │
   ▼
useGameLogic.js (所有 React state + actions)
   │
   ▼
GameCore.jsx (解构 state 传给子组件；管理 UI-local 状态 selectedFridgeIdx / toast)
   │
   ▼
组件层 (ShopPicker / ShopMatrix / DishBoard / Fridge / ShopBasket / PrecisePicker / PendingResolver / TopBar / EndScreens)
```

### 核心原则

1. **单向数据流**：数据 → hook → GameCore → 组件
2. **状态单源**：所有游戏 state 在 `useGameLogic`；组件不持有游戏逻辑
3. **纯函数隔离**：所有随机 / 生成 / 查表函数在 `shopHelpers.js`，方便单独冒烟
4. **配置驱动**：改平衡 → 改 `v2Config.js`
5. **i18n**：中文是源；UI 文本用 `t()`；英文进 `translations.js`

---

## 4. 数据层 `v2Config.js`

### 4.1 食材结构（320 条）

```js
QUALITY_TIERS = [{ rarity: 1, zh: '普通', en: 'Regular' }, ...] // 4 档
VARIETIES = [{ major, sub, icon, items: [{ id, zh, en }, ...] }, ...] // 80 基础

// 派生：
INGREDIENTS[i] = { id: 'sea_bass_3', icon, name: '优质鲈鱼', nameEn, rarity, tags: ['海鲜', '鱼', '鲈鱼'] }
//  80 × 4 = 320 条
BASE_INGREDIENTS[i] = { baseId, name, nameEn, icon, category, subcategory }
//  80 条（品质剥离）
INGREDIENTS_BY_CATEGORY = { '海鲜': [...], '肉类': [...], ... }
//  按大类分桶，店内墙用
```

### 4.2 5 家店

```js
SHOPS = [
    { id: 'seafood_market', name: '海鲜市场', category: '海鲜', ... },
    { id: 'butcher',        name: '肉铺',     category: '肉类', ... },
    { id: 'grocer',         name: '粮食店',   category: '主食', ... },
    { id: 'greengrocer',    name: '蔬菜店',   category: '蔬菜', ... },
    { id: 'dairy',          name: '乳品店',   category: '蛋奶', ... },
]
```

### 4.3 主要常量块

| 导出 | 内容 |
|------|------|
| `DAY_CONFIG` | `hoursPerDay: 12 / hoursPerShop: 1 / shopCandidatesPerPick: 3` |
| `BASKET_CONFIG` | `shopBasketSize: 10 / fridgeSize: 15` |
| `BANANA_PEEL_CONFIG` | `spawnChance: 0.075` + 元数据 |
| `QUALITY_WEIGHTS` | `default: [0.45, 0.30, 0.175, 0.075]` / `hardened` / `purified` 同效 `[0, 0.60, 0.30, 0.10]` |
| `AFFIXES` | 5 种词缀数组（precise / targeted / fragmented / hardened / purified） |
| `DISH_CONFIG` | `dishesPerDay: 3 / slotsPerDish: 3 / baseline: 8 (tentative) / 3 档倍率` |
| `DISH_SCORING` | 5 档阈值映射 + `unfinishedDelta: -2` |
| `SATISFACTION_CONFIG` | `initial: 5 / max: 10 / loseThreshold: 0` |

---

## 5. 纯函数层 `shopHelpers.js`

| 导出 | 用途 |
|------|------|
| `generateShopWall(category)` | 4×4 墙，每格 92.5% 该大类基础食材 / 7.5% 香蕉皮 |
| `refreshShopRegion(matrix, topRow, leftCol, category)` | 2×2 区域重 roll，返回新 matrix |
| `rollAffix()` | 等概率 1 个词缀 |
| `rollQuality(affixId?)` | 按词缀覆盖规则 roll 1-4 |
| `resolveIngredient(baseId, rarity)` | `baseId` + `rarity` → 完整 INGREDIENTS 条目（带 uid） |
| `generateDailyDishes()` | 3 菜，每菜 3 槽；理想食材 9 个不重复 |
| `pickShopCandidates(count?)` | 从 5 店洗牌取 3 |

所有都是纯函数，无 React 依赖，可在 Node 环境直接冒烟。

### 槽位 rules 约定

`generateDailyDishes` 为每个槽位生成：

```js
rules: [
    { match: { tag: '<品类名>' }, multiplier: 2 },   // 理想
    { match: { tag: '<小类名>' }, multiplier: 1 },   // 同小类
]
defaultMultiplier: 0.5                              // 其它
```

评估 via 内联的 `getSlotMultiplier`（`useGameLogic.js` 内），与原 `Kitchen.jsx:getSlotMatch` 等效（不含 crossBonus / exclude）。

---

## 6. 状态 Hook `useGameLogic.js`

**签名**：`useGameLogicV3()` —— 返回扁平对象，直接在组件里解构（名字保留 V3 后缀仅为辨识期过渡期，可能在后续迭代时改名为 `useGameLogic`）。

### 6.1 Phase 状态机

```
'idle'          初始态，显示 StartScreen
  │ startDay
  ▼
'shop_picking'  3 店候选可选；hoursRemaining=0 时需手动 endDay
  │ enterShop
  ▼
'in_shop'       店内抽取；shopDrawState 内部细分
  │ leaveShop / 被踢出 → 'shop_picking'
  │ endDay
  ▼
'day_end'       (sat > 0) 展示结算汇总
'game_over'     (sat ≤ 0) 展示失败汇总
```

### 6.2 店内 `shopDrawState`（子状态机）

```
{ mode: 'idle' }                                   // 默认：等 2×2 框选
{ mode: 'precise',  topRow, leftCol, candidates }  // 精准词缀：2 候选带品质
{ mode: 'targeted', topRow, leftCol }              // 有的放矢：自选 1 格
// hardened / purified / fragmented 不进入子状态（立即解决）
```

### 6.3 State 变量

| 组 | 变量 |
|----|------|
| Meta | `phase` / `dayNumber` / `satisfaction` / `maxSatisfaction` |
| Day | `hoursRemaining` / `hoursPerDay` / `dailyDishes` / `dishPlacements` / `dishResolved` / `lastDishResult` |
| Shop 选 | `shopCandidates` |
| Shop 内 | `currentShop` / `shopMatrix` / `shopBasket` / `currentAffix` / `shopDrawState` / `hoveredRegion` / `shopBasketSize` / `lastKick` |
| 全局 | `fridge` / `fridgeSize` |
| Pending | `pendingBasketItems` / `pendingFridgeItems` |
| 派生 | `canEnterShop` / `canEndDay` / `canLeaveShop` / `canSelectRegion` |

### 6.4 Actions

| 函数 | 用途 |
|------|------|
| `startDay()` / `resetGame()` | 初始化全部 state |
| `enterShop(id)` / `leaveShop()` | 进店 -1h / 安全撤（篮入冰箱） |
| `hoverRegion(r, c)` / `clearHover()` | 纯 UI：2×2 预览 |
| `selectRegion(r, c)` | 2×2 锚定 → 按词缀走 precise/targeted/fragmented/hardened/purified |
| `pickPreciseCandidate(idx)` / `pickTargetedCell(r, c)` / `cancelSubSelection()` | 解决子状态 |
| `placeIngredient(dishId, slotIdx, fridgeIdx)` / `removeFromSlot(dishId, slotIdx)` | 冰箱 ↔ 槽位 |
| `confirmDish(dishId)` | 3 槽填满后结算（消耗冰箱、应用 Δ） |
| `endDay()` | 未完成菜 -2 → phase → day_end / game_over |
| `replaceBasketItem / discard…` / `replaceFridgeItem / discard…` | 两层 pending 的 UX 动作 |
| `debugAddToFridge(ingredient)` / `debugForceAffix(id)` | 调试（未接 UI） |

### 6.5 内部约定

- 香蕉皮击中 → `_handleKick()` 清空篮、返回选店
- 2×2 成功抽 → `_finishDraw(topRow, leftCol, category)` 整片 refresh + 摇新词缀
- 临时篮 / 冰箱满 → 溢出进 `pendingBasketItems` / `pendingFridgeItems`

---

## 7. GameCore 与组件

### 7.1 GameCore 职责

- 调用 `useGameLogicV3()` 拿全部 state
- 维护两个 UI-local 状态：`selectedFridgeIdx`（点冰箱→存选中下标） / `toast`（踢出提示）
- 根据 `phase` 在中央切内容；`shop_picking` / `in_shop` 时显示左右侧栏（菜 + 篮子/冰箱）
- 条件渲染 `PendingResolver`（篮满 / 冰箱满）
- `lastKick` 变化时触发 Toast

### 7.2 组件职责

| 组件 | 职责 |
|------|------|
| `TopBar` | 标题 / 小时条 / 满意度条 / 语言切换 / 重置 / 今日结束 |
| `ShopPicker` | 3 店候选卡，点击进店 |
| `ShopMatrix` | 4×4 格子 + 2×2 hover + 店头 / 离开按钮 + 词缀显示；targeted 子模式限制点击 |
| `PrecisePicker` | 居中模态，2 候选带品质，点击返回 |
| `ShopBasket` | 10 格网格（店内） |
| `Fridge` | 15 格网格，点击选中 |
| `DishBoard` | 3 道菜 × 3 槽的展示 / 确定按钮 |
| `PendingResolver` | 满容器的替换/丢弃弹窗 |
| `EndScreens` | `StartScreen` / `DayEndScreen` / `GameOverScreen` |
| `uiCommon` | 共享：`IngredientChip` / `EmptySlot` / `BananaPeelCell` / 三套按钮 class / `Panel` / `rarityStyle` |

---

## 8. i18n

- **Provider**：`LanguageContext.jsx`，持久化到 `localStorage('game_language')`
- **`t(text)`**：中文原文返回；英文查 `EN_TRANSLATIONS`，未命中 fallback 中文
- **已翻译**：所有 UI chrome 字符串、店名、大类、小类、评级名、词缀名
- **未翻译**：320 条食材的完整中文名（英文 fallback 到中文；后续可批量补）

---

## 9. 修改指南

### 改平衡数值
- 食材 / 菜品 / 容量 / 小时预算 / 词缀权重 / 品质权重 → `v2Config.js`
- baseline 和评级阈值 → `v2Config.js` 的 `DISH_CONFIG` / `DISH_SCORING`

### 加新词缀
1. `v2Config.js::AFFIXES` 加条目
2. `shopHelpers.js::rollQuality` 若需覆盖品质，在 `QUALITY_WEIGHTS` 加权重表
3. `useGameLogic.js::selectRegion` 分支逻辑（若非默认"1/4 随机落点"的走法）
4. UI：`ShopMatrix` 的 `AffixBadge`自动展示；若引入子模式，加新 `shopDrawState.mode` 并在 `selectRegion` 中触发 / 添加对应解决 action

### 加新店大类
1. `VARIETIES` 加入该大类的 4 小类 × 4 品类
2. `SHOPS` 加店条目（category 指向大类名）
3. 其它自动跟上（`BASE_INGREDIENTS` / `INGREDIENTS_BY_CATEGORY` 派生）

### 加新菜品结构（比如 4 槽 / 不同 baseline）
- 当前 `generateDailyDishes` 硬编码从 `DISH_CONFIG` 读 3 槽 + baseline 8
- 若要个性化（某些菜 4 槽，某些 baseline 10）→ 重写 `generateDailyDishes`，返回 slots 数组长度/baseline 可变的菜

### 修 UI / 布局
- 所有视觉在 `components/game/*.jsx`
- 配色用 `kitchen-*` Tailwind 变量（见 `tailwind.config.js`）
- 每个组件大小控制在 200 行以内，方便小改

### 加动画
- 当前无动画。可在 `ShopMatrix` 的 cell 上加 CSS transition；抽取结果飞入 basket 可用 portal + 绝对定位模仿老代码
- 若要复杂动画，建议引入 framer-motion（未安装）

---

*文档版本：Day 1 重构后*
*最后更新：2026-04-19*
