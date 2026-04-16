# 幸运之墙 Wall of Fortune — 代码技术参考

本文档面向需要在此 repo 工作的开发者/AI agent，记录架构、数据组织、关键模块与扩展点。读完后能正确定位修改点。

> **最后更新**: 2026-04-16 · v2 + 烹饪系统接入分支 + 簇 / setup / 3-选-1 合并
> 玩法规则见 `game_rules.md`，进度状态见 `gameplay_progress.md`，设定见 `setting-current-state.md`。
>
> **合并队友 97c29f81 之后的新增**（本文以下小节尚未全部反映这些更新，详见 `game_rules.md` v2.5 小节）：
> - **Cluster 系统**：`src/utils/matrixHelpers.js::getClusterMembers()`；`useGameLogic.completeDrawAnim` 按整簇消除，按 `1 + Σ(multiplier-1) + Σ buff_邻接` 公式产出；`ResourceMatrix.jsx` 加桥接矩形 + hover 高亮 + 飞行 ×N 角标
> - **开局 Setup**：新 phase `setup`；`useGameLogic` 新增 `dishIntroPending` / `currentDish` / `dismissDishIntro` + 驱动 setup → drawing 的 useEffect；5 次二选一填充货架（`SETUP_CONFIG.pickCount`）
> - **3-选-1 隐藏 modifier + 揭晓**：`WallPicker.jsx` 隐藏 modifier/level 信息；新 phase `wall_choice` / `wall_reveal`；`useGameLogic` 新增 `wallCandidates` / `pendingWallCandidate` / `selectWall` / `confirmWallReveal`；`finalizeProceduralCandidate` 把 modifier 改格前移到候选生成阶段
> - **订单队列重建**：`incomingOrder` 单槽 → `incomingQueue` FIFO 数组；`REFRESH_CONFIG.initialCharges` 0（曾是 3），`maxCharges` 5；订单格 +1 刷新次数（不再直接生成订单）；货架顶 🔄 手动刷新按钮
> - **Modifier 扩展**：WALL_TYPES 9 种（移除阴阳轮转）；shuffle bag 选取（`pickWallType` 模块级 `_modifierBag`）；`MATRIX_CONFIG.doomCells.resolution/upgrade.spawnChance` 启用到 5%/5% 每格（厄运格回归随机墙）
> - **UI 组件**：`DishCard.jsx`（右侧边栏 + setup 中央展示，读 rules[]）；`SpritePreview.jsx` 动画预览；Kitchen 增 `isRestaurantPhase` prop；SlotPreview 删除

---

## 目录

1. [技术栈与构建](#1-技术栈与构建)
2. [目录结构](#2-目录结构)
3. [数据流总览](#3-数据流总览)
4. [配置层：v2Config.js（活跃）](#4-配置层v2configjs活跃)
5. [其它配置文件](#5-其它配置文件)
6. [核心 Hook：useGameLogic.js](#6-核心-hookusegamelogicjs)
7. [布局层：App.jsx & GameCore.jsx](#7-布局层appjsx--gamecorejsx)
8. [游戏组件清单](#8-游戏组件清单)
9. [关键算法](#9-关键算法)
10. [国际化](#10-国际化)
11. [冷冻系统（v1 遗留）](#11-冷冻系统v1-遗留)
12. [修改指南](#12-修改指南)

---

## 1. 技术栈与构建

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| Vite | 6.x | 构建 + HMR |
| Tailwind CSS | 3.x | 样式 |
| Lucide React | 0.469 | 图标 |
| ESLint | 9.x | 代码检查 |

部署路径：`base: '/3pools_Web/'`（GitHub Pages）。

```bash
npm run dev       # http://localhost:5173/3pools_Web/
npm run build     # → dist/
npm run preview
npm run lint
```

无测试套件。

---

## 2. 目录结构

```
1.2Antigravity_attempt/
├── assets/                          ← 美术资源（sprite sheet 等）
│   └── chef_backhome.png
├── src/
│   ├── main.jsx                     ← React 渲染入口
│   ├── App.jsx                      ← 顶层路由（Prologue ↔ GameCore）
│   ├── GameCore.jsx                 ← 主游戏布局 + 模态调度
│   ├── index.css                    ← Tailwind 指令 + 自定义动画
│   │
│   ├── data/
│   │   ├── v2Config.js              ★ 活跃数据：贴纸/食材/订单/墙/菜品
│   │   ├── constants.js             ◯ 冷冻：v1 阶段/技能/词缀/工具/池/品质
│   │   └── matrixConfig.js          ★ 4×4 网格生成参数
│   │
│   ├── hooks/
│   │   └── useGameLogic.js          ★ 全局游戏状态 + 业务逻辑（~2000 行）
│   │
│   ├── utils/
│   │   ├── helpers.js               v1 遗留纯函数（部分活跃）
│   │   ├── matrixHelpers.js         ★ 墙生成、贴纸选择、UID
│   │   └── translations.js          中英映射
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
│           ├── Prologue.jsx              入场介绍
│           ├── ResourceMatrix.jsx        奖品墙渲染 + 抽取交互
│           ├── WallPicker.jsx            3 选 1 候选墙
│           ├── BulletinBoard.jsx         订单货架
│           ├── ActiveOrders.jsx          已废弃（v2 中 BulletinBoard 直接管理）
│           ├── ScoreBoard.jsx            分数显示
│           ├── InventorySlot.jsx         背包格子
│           ├── OrderCard.jsx             订单卡片
│           ├── DishCard.jsx              菜品卡片
│           ├── Kitchen.jsx               局外烹饪结算
│           ├── DispatchJudgment.jsx      五维派遣判定（独立工具）
│           ├── AICooking.jsx             AI 辅助菜品测试
│           ├── SpritePreview.jsx         sprite sheet 预览工具
│           ├── ShapeSelector.jsx         形状选择器（v1 遗留）
│           ├── ActiveShapeDisplay.jsx    形状显示（v1 遗留）
│           ├── ActionCards.jsx           动作卡片
│           ├── PoolCard.jsx              v1 奖池卡片（冷冻）
│           └── SkillSelectionModal.jsx   v1 技能选择（冷冻）
│
├── design_docs/
│   ├── game_rules.md
│   ├── gameplay_progress.md
│   ├── codebase_technical_reference.md  ← 本文档
│   ├── setting-current-state.md
│   ├── setting-evolution-log.md
│   └── reference/                       会话与分析归档
│
└── .claude/
    ├── CLAUDE.md                        协作指令
    └── lessons/                         经验沉淀
```

---

## 3. 数据流总览

```
v2Config.js (静态数据：STICKER_TYPES, INGREDIENTS, DISHES, ORDER_TEMPLATES, WALL_TYPES, ...)
   │
   ▼
matrixHelpers.js (generateWall, pickWallStickers — 纯函数)
   │
   ▼
useGameLogic.js (全部 React state + 业务逻辑 + actions)
   │
   ▼
GameCore.jsx (布局 + state 解构传递 + 模态调度)
   │
   ▼
组件层 (ResourceMatrix / BulletinBoard / Kitchen / DispatchJudgment / ...)
```

### 核心原则

1. **单向数据流**：数据 → useGameLogic → GameCore → 子组件
2. **单一状态源**：所有游戏状态集中在 `useGameLogic`，组件不持有游戏逻辑状态
3. **配置驱动**：要改平衡数值，改 `v2Config.js` 或 `matrixConfig.js`
4. **i18n**：中文是源语言，UI 文本用 `t()` 包裹，英文翻译加到 `translations.js`

---

## 4. 配置层：v2Config.js（活跃）

文件位置：`src/data/v2Config.js`。所有 v2 静态数据集中在此。

### 4.1 STICKER_TYPES — 贴纸（20 种）
```js
{ id, icon, name }
```
20 种主题贴纸（山/海/田/林/空/岛/沙/雪/火/电/星/月/花/风/雨/日/河/岩/虹/晶）。

### 4.2 INGREDIENTS — 食材（60+ 种）
```js
{ id, icon, name, nameEn, rarity: 1-4, tags: [大类, 小类] }
```
按"大类·小类"分组（肉类·鸡/牛/猪/羊；海鲜·鱼/虾/贝/蟹；蔬菜·青菜/根茎/水果/菌菇；主食·米/面/豆/面包）。每个小类下 4 个不同稀有度。

### 4.3 DISHES — 菜品定义
```js
{
  id, name, nameEn, icon,
  baseline: <基础分>,
  slots: [
    {
      name: '主料',
      required: true,
      rules: [
        { match: { tag: '肉类' }, multiplier: 1 },
        { match: { tag: '牛' }, multiplier: 2 }
      ],
      defaultMultiplier: 0.5,
      crossBonus?: { requireSlot, requireTag, multiplier }  // 可选跨槽加成
    },
    ...
  ]
}
```

### 4.4 ORDER_TEMPLATES — 订单模板（4 种）
```js
[
  { id: 'a', difficulty: 'easy',    rewardTiers: [1], totalStickers: 2, stickerTypes: 1, weight: 40 },
  { id: 'b', difficulty: 'medium',  rewardTiers: [2], totalStickers: 3, stickerTypes: 2, weight: 30 },
  { id: 'c', difficulty: 'hard',    rewardTiers: [3], totalStickers: 4, stickerTypes: 3, weight: 20 },
  { id: 'd', difficulty: 'extreme', rewardTiers: [4], totalStickers: 6, stickerTypes: 4, weight: 10 },
]
```

### 4.5 WALL_TYPES — 墙类型（5 种）
```js
{ id, name, icon, desc, weight, [extras: hiddenRatio | multiplierRatio] }
```
基础/神秘面纱/乾坤大挪移/双倍惊喜/交叉问答。⚠️ 当前仅类型选择生效，行为差异未实装。

### 4.6 ORDER_CONFIG
```js
{ bulletinCapacity: 5, maxActive: 3, newPerTurn: 1, initialCount: 4 }
```

### 4.7 EXPEDITION_CONFIG
```js
{ expeditionCount: 3, scoreToWin: 30 }
```

### 4.8 WALL_STICKER_COUNT
```js
{ min: 3, max: 3 }  // 每面墙固定 3 种贴纸
```

---

## 5. 其它配置文件

### `data/matrixConfig.js`
4×4 网格生成参数：
```js
{
  gridSize: 4,
  doomCells: { resolution: {...}, upgrade: {...} },
  specialCells: {
    gold:      { spawnChance: 0.06, goldRange: [1, 2], ... },
    order:     { spawnChance: 0.04, ... },
    outOfGame: { spawnChance: 0.02, ... },
    bomb:      { spawnChance: 0.04, ... }
  },
  itemShapes: { weights: {1:40, 2:30, 3:20, 4:10}, shapes: { 1:[...], 2:[...], ... } }
}
```

### `data/constants.js`
**冷冻**：v1 阶段/技能/词缀/工具/池/品质等定义，v2 主流程不调用。详见 §11。

### `utils/matrixHelpers.js`
- `generateUID()` — 不依赖 `crypto.randomUUID`，兼容 file:// 加载
- `pickWallStickers(allStickers, min=3, max=3)` — 从 STICKER_TYPES 随机选种类
- `generateWall(wallStickers)` — 三阶段填充：厄运 → 特殊格 → 贴纸（polyomino）
  - Phase 1: Box-Muller 正态分布生成厄运格总数（均值 5，标准差 1.5）
  - Phase 2: 累积概率法判定金币/订单/食材/炸弹
  - Phase 3: 剩余空格按形状权重 (1:40, 2:30, 3:20, 4:10) 放贴纸
  - 食材格按稀有度 40/30/20/10 加权

---

## 6. 核心 Hook：useGameLogic.js

**位置**：`src/hooks/useGameLogic.js`，约 2000 行。

**签名**：`useGameLogic(config)`，返回扁平状态对象（直接解构使用）。

### 6.1 主要 state 变量

#### Day / 大局
| 变量 | 类型 | 说明 |
|------|------|------|
| `dayNumber` | number | 当前天数 |
| `expeditionNumber` | alias | = `dayNumber`（v1 字段保留兼容） |
| `expeditionScores` | array | 各天得分记录 |
| `totalScore` | number | 累计总分 |
| `bonusItems` | array | 开局随机 3 个加分食材（+1/+2/+3） |
| `popularity` | number | 人气值（设计中） |
| `lastCookResult` | object \| null | 上次做菜结算结果，用于结算屏 |

#### 回合
| 变量 | 类型 | 说明 |
|------|------|------|
| `turnNumber` | number | 当前天内回合数 |
| `gold` | number | 当前金币（v2 中使用范围有限） |
| `phase` | string | `pre_game` / `wall_choice` / `drawing` / `between_turns` / `restaurant` / `cook_result` / `game_over` |

#### 网格 & 抽取
| 变量 | 说明 |
|------|------|
| `matrix` | 当前奖品墙 |
| `wallCandidates` | 3 选 1 候选墙 |
| `currentWallType` | 当前墙类型对象 |
| `lastDrawDirection` / `lastDrawResult` | 抽取动画与反馈 |
| `drawAnimState` | 扫描动画状态机 |

#### 厄运
| 变量 | 说明 |
|------|------|
| `hp` | 生命值 |
| `doomGrid` | 10 格厄运网格状态 |
| `doomLevel` | 当前厄运等级 |
| `dangerCount` | 危险格数量 |
| `doomAnimState` / `isDoomResolving` / `doomResolutionResult` | 结算动画与结果 |

#### 背包
| 变量 | 说明 |
|------|------|
| `inventory` | 背包数组 |
| `maxInventorySize` | 容量（15） |
| `pendingItem` / `pendingItems` | 待处理队列 |
| `flyingItem` | 飞入动画临时态 |

#### 订单（v2 货架）
| 变量 | 说明 |
|------|------|
| `bulletinBoard` | 当前货架订单数组 |
| `incomingOrder` | 当前 2 选 1 候选 |
| `pendingAcceptOrder` | 货架满时的"替换哪一个"待定状态 |

### 6.2 核心 actions

| 函数 | 用途 |
|------|------|
| `startGame()` | 开局，生成初始订单与 bonusItems |
| `selectRow(idx)` / `selectColumn(idx)` | 行/列抽取 |
| `endTurn()` / `continueToNextTurn()` | 回合结束 / 继续 |
| `selectWall(idx)` | 3 选 1 选墙 |
| `handleEvacuate()` | 撤离（进入 restaurant 阶段） |
| `handleReset()` | 重置 |
| `tickDoomResolution()` / `completeDoomResolution()` | 厄运结算动画驱动 |
| `tickDrawAnim()` / `completeDrawAnim()` | 抽取扫描动画驱动 |
| `acceptOrder(id)` / `submitOrder(id)` / `canSubmitOrder(id)` | 订单接取/提交/查询 |
| `confirmIncomingOrder(order)` / `discardIncomingOrder()` | 处理候选订单 |
| `replaceBulletinOrder(orderId)` | 货架满时替换 |
| `replaceInventoryItem` / `discardInventoryItem` / `discardPendingItem` | 背包操作 |
| `debugAddItem` / `debugAddStorageItems` | 调试工具 |

### 6.3 内部辅助函数

- `pickWeightedTemplate()` — 按 weight 选订单模板
- `pickWallType()` — 按 weight 选墙类型
- `generateOrder()` — 完整订单生成（模板 → 食材 → 贴纸种类与数量分配）

---

## 7. 布局层：App.jsx & GameCore.jsx

### App.jsx
极简——根据 `playerInfo` 状态在 `Prologue` 与 `GameCore` 之间切换。包 `ErrorBoundary` 和 `LanguageProvider`（在 `main.jsx`）。

```jsx
{playerInfo ? <GameCore playerInfo={...} /> : <Prologue onComplete={setPlayerInfo} />}
```

### GameCore.jsx
- 调用 `useGameLogic`，解构所有 state 和 actions
- 头部按钮：语言切换、重置、🛠 调试、派遣、🍳 AI 炼菜、🍳 厨房、🎬 动画
- 根据 `phase` 切换中央内容（`pre_game` / `wall_choice` / `drawing` / `between_turns` / ...）
- 左侧边栏：BulletinBoard
- 模态调度：Debug / Dispatch / AICooking / Kitchen / SpritePreview / Toast

新增模态的标准模式：
1. 在 GameCore.jsx 头部加 `useState(false)` 控制开关
2. 加按钮触发开关
3. 在 modal 区域条件渲染组件，传 `onClose`

---

## 8. 游戏组件清单

| 组件 | 用途 | 状态 |
|------|------|------|
| `Prologue.jsx` | 入场介绍 | ✅ 活跃 |
| `ResourceMatrix.jsx` | 奖品墙渲染 + 行/列抽取交互 | ✅ 核心 |
| `WallPicker.jsx` | 3 选 1 候选墙展示 | ✅ 活跃 |
| `BulletinBoard.jsx` | 订单货架 + 提交按钮（含 `RewardCard` / `IngredientTip`） | ✅ 核心 |
| `ScoreBoard.jsx` | 分数与进度显示 | ✅ 活跃 |
| `InventorySlot.jsx` | 背包格子（多状态视觉） | ✅ 核心 |
| `OrderCard.jsx` | 订单卡片（v1 遗留较多，v2 部分使用） | ⚠️ 半活跃 |
| `DishCard.jsx` | 菜品卡片（局外） | ✅ 活跃 |
| `Kitchen.jsx` | 局外烹饪结算（槽位匹配 + 评分） | ✅ 核心 |
| `DispatchJudgment.jsx` | 派遣五维评分（独立工具） | ✅ 工具 |
| `AICooking.jsx` | AI 辅助菜品测试 | 🔧 调试用 |
| `SpritePreview.jsx` | sprite sheet 帧动画预览 | 🔧 调试用 |
| `ActiveOrders.jsx` | v1 已激活订单列表 | ❌ 已废弃 |
| `ShapeSelector.jsx` / `ActiveShapeDisplay.jsx` | v1 形状选择 | ❌ 冷冻 |
| `PoolCard.jsx` | v1 奖池卡片 | ❌ 冷冻 |
| `SkillSelectionModal.jsx` | v1 技能选择 | ❌ 冷冻 |
| `ActionCards.jsx` | 动作卡片 | ⚠️ 用途待核实 |

UI 基础组件（`components/ui/`）：
- `Tooltip.jsx`：portal-based 跟随鼠标
- `Toast.jsx`：顶部居中浮入，2s 自动关闭
- `ConfirmDialog.jsx`：通用确认对话框

---

## 9. 关键算法

### 9.1 奖品墙生成（`generateWall`）
三阶段填充：
1. **厄运 Phase 1**：Box-Muller 正态分布得出总数（μ=5, σ=1.5, clamp 1-9），按各自概率随机分布到格子
2. **特殊格 Phase 2**：对剩余空格逐个 roll，累积概率：金币 6% → 订单 4% → 食材 2% → 炸弹 4%
   - 食材格触发时：按 ★/★★/★★★/★★★★ = 40/30/20/10 选稀有度，再均匀随机选具体食材
3. **贴纸 Phase 3**：剩余空格按 polyomino 形状（权重 1:40, 2:30, 3:20, 4:10）填充，多格共享 `groupId`，从 `wallStickers`（3 种）中均匀随机选种

### 9.2 订单生成（`generateOrder`）
1. 按 weight 选模板（a/b/c/d）
2. 每个 `rewardTier` 从对应稀有度的食材中均匀随机选 1
3. 从 20 种贴纸里洗牌取前 N 种（N = `template.stickerTypes`）
4. 数量分配：前 N-1 种用 `1 + random(0, remaining-(N-i-1)-1)`，最后一种拿剩余

### 9.3 菜品评分（`scoreDish` in `Kitchen.jsx`）
1. 预扫描 `crossBonus` 哪些激活
2. 每槽位：
   - `getSlotMatch(食材, 槽位)`：评估所有 rules，取最高 multiplier
   - `slot.exclude` 命中 → 0
   - 没规则的槽 → `defaultMultiplier`
3. 各槽得分 × cross bonus → 汇总 + `dish.baseline`

### 9.4 派遣判定动画（`DispatchJudgment.jsx`）
- 5 维度：健康/香气/口感/味道/外观
- 球在**菜品数值多边形**内弹跳，最终判定是否落在与**任务要求多边形**的重叠区
- 物理：比例摩擦（×0.994/帧），碰壁恢复系数 0.94，停止阈值 0.12 px/帧

### 9.5 sprite 动画（`SpritePreview.jsx`）
逐帧 `setInterval` 推进 `frame % frameCount`，用 `background-position` 偏移呈现。`image-rendering: pixelated` 保持像素锐利。

---

## 10. 国际化

- **Provider**：`LanguageContext.jsx`，`language` 持久化到 `localStorage('game_language')`
- **`t(text)`**：中文返回原文，英文查 `EN_TRANSLATIONS[text]`，未找到 fallback 中文
- **写法**：JSX 里直接 `{t('中文')}`；新文本必须在 `translations.js` 加英文映射
- **测试**：修改 UI 后用语言切换按钮在两种语言下都看一遍

---

## 11. 冷冻系统（v1 遗留）

`src/data/constants.js` 中保留以下完整定义但 v2 主流程不调用：

| 系统 | 含义 | 处置建议 |
|------|------|----------|
| `INITIAL_STAGE_CONFIG` | 4 阶段难度递进 | 保留，未来重启 |
| `SKILL_DEFINITIONS` | 13 个技能 | 保留，未来重启 |
| `INITIAL_AFFIXES_CONFIG` | 7 种词缀 | 保留，未来可能复用 |
| `TOOL_ITEMS` / `TOOL_ITEM_CONFIG` | 命运熔炉等工具 | 保留 |
| `INITIAL_POOLS_DATA` | 5 个奖池 | 已被 INGREDIENTS 替代 |
| `INITIAL_RARITY_CONFIG` | 6 级品质 | 已被食材 4 级稀有度替代 |
| `EMERGENCY_ORDER_CONFIG` | 撤离订单系统 | 已被新撤离流程替代 |

**修改时不要触碰这些**，除非明确要重启对应系统。

---

## 12. 修改指南

### 改平衡数值
- 贴纸/食材/订单：`v2Config.js`
- 网格生成（厄运密度、特殊格概率、形状权重）：`matrixConfig.js`
- 派遣判定物理参数：`DispatchJudgment.jsx` 顶部常量

### 加新菜品
1. 在 `v2Config.js` 的 `DISHES` 数组追加菜品对象
2. 槽位 `rules` 用 `{ match: { tag: '...' } }` 或 `{ match: { id: '...' } }`
3. 跨槽加成用 `crossBonus: { requireSlot, requireTag, multiplier }`
4. 加 i18n 翻译

### 加新组件
1. 放 `src/components/game/` 或 `src/components/ui/`
2. **不要**在组件里持有游戏逻辑状态——通过 props 从 GameCore 传
3. 文本用 `t()` 包裹
4. 模态：在 GameCore.jsx 加 useState + 头部按钮 + 条件渲染

### 加新工具/调试面板
模板见 `DispatchJudgment.jsx` 或 `SpritePreview.jsx`：
- 全屏 fixed 覆盖层（`fixed inset-0 z-[100] bg-black/70`）
- 点击背景关闭
- 接收 `onClose` prop

### 添加 sprite 动画
1. 把 PNG 放到 `assets/`
2. 在 `SpritePreview.jsx` 的 `SPRITE_ASSETS` 数组追加：`{ name, label, src, frames, frameWidth, frameHeight }`
3. 用 import 语法引入：`import myAsset from '../../../assets/my.png'`

### 启用奖品墙类型差异化
当前 `generateWall(wallStickers)` 不接 wallType 参数。要让 5 种墙生效：
1. 改签名为 `generateWall(wallStickers, wallType)`
2. 根据 `wallType.id` 在 Phase 2/3 分支：
   - `hidden`：用 `hiddenRatio` 标记部分格子为隐藏
   - `multiplier`：用 `multiplierRatio` 标记部分格子效果翻倍
   - `drift` / `alternating`：在 useGameLogic 抽取逻辑里另加分支
3. 调用处（`useGameLogic.js` 里 `generateWall(stickers)`）传入 wallType

### 启用 v1 子系统
冷冻系统的接线流程见 §11 列表与历史版本。技术上需要：
1. 在 `useGameLogic` 加对应 state 与触发点
2. 把 v1 helpers.js 中的纯函数重新接入
3. UI 已有的 v1 组件（PoolCard / SkillSelectionModal）可复用

---

*文档版本：v2 + 烹饪系统接入分支*
*最后更新：2026-04-16*
