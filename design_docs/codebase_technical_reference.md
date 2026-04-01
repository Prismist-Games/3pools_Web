# 三池物语 — 代码技术知识文档

本文档是项目代码的完整技术参考，涵盖架构、数据流、每个文件的职责与实现细节、状态管理、UI 渲染逻辑和外部集成。阅读本文档后，无需再阅读源代码即可对项目做出正确修改。

> **最后更新**: 2026-04-01 · 基于 `feature/cluster-based-effect` 分支

---

## 目录

1. [技术栈与构建](#1-技术栈与构建)
2. [目录结构](#2-目录结构)
3. [数据流总览](#3-数据流总览)
4. [配置层](#4-配置层)
5. [纯工具函数](#5-纯工具函数)
6. [核心状态：useGameLogic.js](#6-核心状态usegamelogicjs)
7. [顶层组件：App.jsx](#7-顶层组件appjsx)
8. [布局渲染层：GameCore.jsx](#8-布局渲染层gamecorejsx)
9. [游戏组件详解](#9-游戏组件详解)
10. [UI 基础组件](#10-ui-基础组件)
11. [国际化系统](#11-国际化系统)
12. [关键算法与流程](#12-关键算法与流程)
13. [状态交互矩阵](#13-状态交互矩阵)
14. [已知设计债务与休眠系统](#14-已知设计债务与休眠系统)
15. [修改指南](#15-修改指南)

---

## 1. 技术栈与构建

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| Vite | 6.x | 构建工具 + HMR 开发服务器 |
| Tailwind CSS | 3.x | 原子化样式 |
| Lucide React | 0.469 | 图标库 |
| ESLint | 9.x | 代码检查 |

### 构建配置

**`vite.config.js`**: 唯一自定义项是 `base: '/3pools_Web/'`，用于 GitHub Pages 部署路径。

**`tailwind.config.js`**: 扫描 `index.html` 和 `src/**/*.{js,ts,jsx,tsx}`，无自定义 theme 扩展。

**`postcss.config.js`**: 标准 Tailwind + Autoprefixer 管道。

### 命令

```bash
npm run dev       # 启动 Vite 开发服务器 http://localhost:5173/3pools_Web/
npm run build     # 生产构建到 dist/
npm run preview   # 预览生产构建
npm run lint      # ESLint 检查
```

**无测试套件。**

---

## 2. 目录结构

```
3pools_Web/
├── index.html                     ← SPA 入口，挂载 #root
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
│
├── src/
│   ├── main.jsx                   ← ReactDOM 渲染入口
│   ├── App.jsx                    ← 配置管理 + 设置 UI + 调试工具 (~1127行)
│   ├── GameCore.jsx               ← 游戏布局 + 组件编排 (~729行)
│   ├── index.css                  ← Tailwind 指令 + 自定义滚动条隐藏
│   │
│   ├── data/
│   │   ├── constants.js           ← 核心游戏配置数据 (~566行)
│   │   ├── spatialConstants.js    ← 空间地图系统常量 (~44行)
│   │   └── gridConstants.js       ← 里程碑网格系统常量 (~47行)
│   │
│   ├── hooks/
│   │   └── useGameLogic.js        ← 游戏全部状态与逻辑 (~1424行)
│   │
│   ├── utils/
│   │   ├── helpers.js             ← 纯函数工具 (~355行)
│   │   ├── spatialPoolHelpers.js  ← 空间地图纯函数 (~139行)
│   │   ├── gridGenerator.js       ← 里程碑生成算法 (~518行)
│   │   └── translations.js        ← 英文翻译映射
│   │
│   ├── contexts/
│   │   └── LanguageContext.jsx     ← 语言切换 Context + t() 翻译函数
│   │
│   └── components/
│       ├── ErrorBoundary.jsx       ← 错误边界（类组件）
│       ├── game/
│       │   ├── ItemMap.jsx         ← 空间物品地图 (~344行)
│       │   ├── MilestoneGrid.jsx   ← 里程碑网格 (~166行)
│       │   ├── GridCell.jsx        ← 里程碑格子 (~97行)
│       │   ├── InventorySlot.jsx   ← 背包格子 (~301行)
│       │   ├── SkillSelectionModal.jsx ← 技能选择弹窗
│       │   ├── PoolCard.jsx        ← 奖池卡片（已弃用，保留文件）
│       │   └── FrameSelector.jsx   ← 框选器（已弃用，保留文件）
│       └── ui/
│           ├── ConfirmDialog.jsx   ← 通用确认对话框
│           └── Toast.jsx           ← 浮动提示
│
└── design_docs/
    ├── game_rules.md               ← 完整游戏规则文档
    └── codebase_technical_reference.md ← 本文档
```

---

## 3. 数据流总览

```
INITIAL_GAME_CONFIG (constants.js)
  + GRID_CONFIG (gridConstants.js)
  + MAP_ROWS/COLS, ALL_ITEMS (spatialConstants.js)
        │
        ▼
   App.jsx ─── config state (可通过设置 UI 修改)
        │
        ├── gameId (重置用 key)
        ├── initialSkills (调试预设)
        ├── debugAddItem (脉冲触发)
        │
        ▼
   GameCore.jsx ─── 接收 config，调用 useGameLogic(config, ...)
        │
        ▼
   useGameLogic(config, initialSkills, onReset, initialScore)
        │
        ├── 内部使用 helpers.js / spatialPoolHelpers.js / gridGenerator.js
        ├── 返回 { state, actions, helpers }
        │
        ▼
   GameCore.jsx ─── 解构 state/actions/helpers，传给子组件
        │
        ├── ItemMap ← 空间物品地图 (3×4网格 + 2×2框选抽卡)
        ├── MilestoneGrid ← 里程碑网格 (需求侧)
        ├── InventorySlot ← 背包格子交互
        ├── SkillSelectionModal ← 技能选择（休眠中）
```

### 核心原则

1. **单向数据流**：Config → App → GameCore → useGameLogic → 子组件。
2. **单一状态源**：所有游戏状态集中在 `useGameLogic` 中，组件不持有游戏逻辑状态。
3. **配置驱动**：数值、物品、词缀、技能等全部由配置文件定义，修改平衡时编辑配置。
4. **供需分离**：ItemMap 是供给侧（物品来源），MilestoneGrid 是需求侧（物品去向），背包是中间缓冲区。

---

## 4. 配置层

配置分布在 3 个文件中：`constants.js`（核心配置）、`spatialConstants.js`（空间地图）、`gridConstants.js`（里程碑网格）。

### 4.1 `constants.js`

#### `INITIAL_STAGE_CONFIG`（4 个阶段）

```js
[
  { // Stage 0: 普通模式 — 当前唯一使用的阶段
    inventorySize: 10, orderSlots: 3, poolSize: 4, allowedPoolCount: 5,
    initialGold: 20,
    mechanics: { refresh: true, affixes: true, synthesis: true, variablePrice: true },
    rarityWeights: { common: 0.8, uncommon: 0.19, rare: 0.01, epic: 0.005, legendary: 0.001, mythic: 0 },
    orderRarityWeights: { common: 0.4, uncommon: 0.35, rare: 0.2, epic: 0.05 },
    orderCountWeights: { 2: 20, 3: 65, 4: 15 },
    baseRewards: { 2: 15, 3: 15, 4: 15 }
  },
  { /* Stage 1: 波动模式 - mechanics 增加 volatility: true */ },
  { /* Stage 2: 专业化 - inventorySize: 20, specialization: true */ },
  { /* Stage 3: 熵增 - entropyDecayValue: 25, entropy: true */ }
]
```

> **重要**：当前 `useGameLogic` 硬编码使用 `config.stages[0]`，阶段切换系统尚未启用。

#### `SKILL_DEFINITIONS`（13 个技能）

每个技能对象：`{ id, name, desc, Icon, type, color }`

| id | 名称 | 简述 |
|----|------|------|
| `poverty_relief` | 贫困救济 | 金币<20 完成订单 +5 金币 |
| `lucky_7` | 幸运7 | 金币尾数7时传说概率×2 |
| `alchemy` | 炼金术 | 回收 Rare+ 25% 概率 +5 金币 |
| `vip_discount` | 贵宾折扣 | precise/targeted 费用 -1 |
| `negotiator` | 谈判专家 | 抽到 Epic+ 时订单刷新次数 +1 |
| `consolation_prize` | 安慰奖 | 连续5次 Common 后保底 Rare+ |
| `cut_corners` | 偷工减料 | 20% 概率订单需求数 -1 |
| `time_freeze` | 时间冻结 | 20% 概率刷新不消耗次数 |
| `ocd` | 强迫症 | 同池物品提交乘数 ×2 |
| `auto_restock` | 自动补货 | 完成订单后下次抽卡多1个物品 |
| `turn_fortune` | 时来运转 | 完成订单后下次抽卡保底 Rare+ |
| `big_order_expert` | 大订单专家 | 4需求订单完成 +5 金币 |
| `hard_order_expert` | 困难订单专家 | 含 Epic+ 需求订单完成 +10 金币 |

> 技能系统代码完整但当前未启用。`triggerSkillSelection()` 存在但无自动触发点。

#### `TOOL_ITEMS`（已废弃）

`TOOL_ITEMS` 数组为空 `[]`。工具物品掉落已禁用（`tryDropToolItem` 直接返回原数组）。`TOOL_ITEM_CONFIG` 配置保留但不生效。

#### `INITIAL_AFFIXES_CONFIG`（6 种词缀）

当前 6 种词缀用作效果物品（从地图上获取后放入背包，激活后影响下次抽取）：

| id | 名称 | 类型 | cost | 特殊权重 |
|----|------|------|------|----------|
| `trade_in` | 以旧换新的 | interaction | 0 | — |
| `hardened` | 硬化的 | passive | 0 | uncommon:0.2, rare:0.7, epic:0.09, legendary:0.01 |
| `purified` | 提纯的 | passive | 0 | rare:0.67, epic:0.3, legendary:0.03 |
| `fragmented` | 稀碎的 | passive | 0 | — (逻辑约束全 common, 出 3 个) |
| `precise` | 精准的 | interaction | 0 | — (二选一) |
| `targeted` | 有的放矢的 | interaction | 0 | — (1×1 精确选取) |

> 注意：旧的 `volatile`（波动的）词缀已移除。所有词缀 cost 当前为 0，费用由地图抽取的基础 cost（1 金币）统一承担。

#### `INITIAL_RARITY_CONFIG`（6 级品质）

| id | name | bonus | recycleValue |
|----|------|-------|-------------|
| `common` | 普通 | 0 | 1 |
| `uncommon` | 优秀 | 0.1 | 2 |
| `rare` | 稀有 | 0.25 | 5 |
| `epic` | 史诗 | 0.5 | 15 |
| `legendary` | 传说 | 1.0 | 50 |
| `mythic` | 神话 | 2.0 | 200 |

#### `INITIAL_POOLS_DATA`（5 个物品池）

| poolId | 池名 | 图标 | 物品 (4个) |
|--------|------|------|-----------|
| `fruit` | 水果 | 🍎 | 西瓜🍉 柠檬🍋 芒果🥭 苹果🍎 |
| `medicine` | 药物 | 💊 | 冲剂🍵 滴眼液💧 注射器💉 胶囊💊 |
| `stationery` | 文具 | ✏️ | 铅笔✏️ 橡皮🧼 订书机📎 笔记本📒 |
| `kitchenware` | 厨具 | 🍳 | 平底锅🍳 菜刀🔪 砧板🪵 汤勺🥄 |
| `electronics` | 电器 | ⚡️ | 手机📱 耳机🎧 空调❄️ 电脑💻 |

5 池 × 4 物品 = 20 种物品。

#### `EMERGENCY_ORDER_CONFIG`（撤离订单配置，已部分废弃）

配置仍然存在于代码中，但当前撤离系统通过里程碑网格实现，不再使用独立的撤离订单。此配置为历史遗留。

#### `SCORE_PROGRESS_CONFIG`

```js
{ targetProgress: Infinity, progressOffset: 0,
  rarityWeights: { common:0.5, uncommon:1.0, rare:1.5, epic:2.0, legendary:3.0, mythic:4.0 } }
```

#### `INITIAL_GAME_CONFIG`（总配置对象）

```js
{
  affixes: INITIAL_AFFIXES_CONFIG,
  rarity: INITIAL_RARITY_CONFIG,
  pools: INITIAL_POOLS_DATA,
  stages: INITIAL_STAGE_CONFIG,
  progress: SCORE_PROGRESS_CONFIG,
  emergency: EMERGENCY_ORDER_CONFIG,
  toolItems: TOOL_ITEM_CONFIG,
  enabledSkillIds: [/* 全部13个技能ID */],
  global: { refreshCost: 5, initialGold: 30, initialRefreshCount: 4, maxRefreshCount: 4 }
}
```

### 4.2 `spatialConstants.js`

空间物品地图的配置常量。

| 导出 | 说明 |
|------|------|
| `ALL_ITEMS` | 从 `INITIAL_POOLS_DATA` 扁平化的全部 20 个物品列表，每项含 `{ name, icon, poolId, poolName }` |
| `FIXED_SHAPE` | 固定 2×2 框选形状 `{ cells: [[0,0],[0,1],[1,0],[1,1]], coverageCount: 4 }` |
| `QUALITY_EFFECTS` | 等于 `INITIAL_AFFIXES_CONFIG`（全部词缀可在空间系统中作为效果出现） |
| `MAP_ROWS` | 3（地图行数） |
| `MAP_COLS` | 4（地图列数） |
| `DEFAULT_DRAW` | `{ id: null, cost: 1 }`（无效果时的默认抽取配置） |
| `EFFECT_ITEM_ICONS` | 效果物品的图标映射：`trade_in→🔄, hardened→🛡️, purified→💎, fragmented→💥, precise→🎯, targeted→🎯` |

### 4.3 `gridConstants.js`

里程碑网格系统的配置常量。

| 导出 | 说明 |
|------|------|
| `GRID_CONFIG` | `{ canvasSize: 5, cellCount: {min:8, max:12}, taskCount: {min:3, max:5}, taskSize: {min:2, max:4} }` |
| `CELL_SCORE_WEIGHTS` | 各品质的分数权重：`common:2, uncommon:2.5, rare:4, epic:8, legendary:16, mythic:32` |
| `TASK_GOLD_REWARD` | 任务完成金币奖励：`3`（当前代码中未使用此常量） |
| `CELL_RARITY_WEIGHTS` | 格子品质需求的随机权重：`common:0.40, uncommon:0.35, rare:0.20, epic:0.05` |
| `TASK_COLORS` | 10 种任务颜色（CSS hex） |
| `CELL_REWARD_CHANCE` | 格子有奖励的概率：`0.3` |
| `RARITY_BG_COLORS` | 各品质的背景/边框颜色（rgba 格式） |

---

## 5. 纯工具函数

### 5.1 `helpers.js`

所有函数为纯函数，不依赖 React，不持有状态。

#### `getAllNormalItems(pools, currentStageConfig) → Item[]`

根据 `allowedPoolCount`（限制池子数量）和 `poolSize`（限制每池物品数）从 `pools` 中取出扁平物品列表。每个物品附加 `poolId` 和 `poolName`。

#### `getRandomAffix(affixes) → Affix`

按 `weight` 字段加权随机选取一个词缀。

#### `getRandomItems(array, count) → Item[]`

Fisher-Yates 洗牌后取前 `count` 个。

#### `rollRequirementRarity(config, stageConfig, isEmergency, difficulty) → Rarity`

确定订单需求的品质（历史遗留，里程碑系统中由 `gridGenerator.js` 的 `rollCellRarity` 替代）。

#### `generateOrder(allItems, config, hasSkill, stageConfig, isEmergency, difficulty) → Order`

完整订单生成流程（历史遗留，里程碑系统中不使用）。

#### `rollRarity(config, affixKey, gold, hasSkill, skillState, stageConfig) → Rarity`

**抽卡品质判定核心**（仍在使用）：
1. 根据词缀确定 `allowedRarityIds`（fragmented → [common]，hardened/purified → [rare+] 等）
2. 优先使用词缀自定义权重，否则使用阶段权重
3. `lucky_7` 技能：`gold % 10 === 7` 时传说权重 ×2
4. `nextDrawGuaranteedRare`：从允许的 Rare+ 中随机选
5. 累积概率随机选取
6. Fallback → common

#### `getNextRarity(currentRarityId, config) → Rarity | null`

返回比当前品质高一级的品质对象，mythic 返回 null。用于合成升级。

### 5.2 `spatialPoolHelpers.js`

空间物品地图的纯函数。

#### `randomCell(neededNames) → ItemData`

从 `ALL_ITEMS` 中随机选取一个物品。如果提供了 `neededNames`（Set），则只从匹配的物品中选取。

#### `generateItemMap(neededNames) → ItemData[][]`

生成 `MAP_ROWS × MAP_COLS` 的二维数组，每个格子调用 `randomCell`。

#### `refreshCoveredCells(itemMap, anchorRow, anchorCol, neededNames) → ItemData[][]`

刷新 2×2 区域覆盖的格子，其余格子不变。返回新地图（不可变更新）。

#### `computeClusterSizes(itemMap) → number[][]`

**簇大小计算**（核心算法）：使用 BFS 遍历整个地图，将同名相邻物品（8 方向）归为同一簇。返回与网格同尺寸的二维数组，每个格子的值为其所在簇的大小。

- 效果格（`isEffect: true`）不参与簇计算
- 簇大小直接影响抽取品质下限

#### `getFrameCoverage(anchorRow, anchorCol, itemMap) → CoveredCell[] | null`

获取 2×2 框选覆盖的格子信息。越界返回 null。

#### `isValidPlacement(anchorRow, anchorCol) → boolean`

检查 2×2 放置是否完全在网格范围内。有效锚点范围：row ∈ [0, MAP_ROWS-2]，col ∈ [0, MAP_COLS-2]。

### 5.3 `gridGenerator.js`

里程碑网格生成算法。

#### `getNeighbors(row, col, canvasSize) → {row, col}[]`

获取四邻域邻居（上下左右），不超出画布边界。

#### `rollCellRarity(rarities, weights) → string`

按权重随机选择一个品质 ID，用于里程碑格子的品质需求。

#### `generateMilestoneShape(canvasSize, targetCellCount) → {row, col}[]`

**不规则形状生成**：从画布中心附近开始，通过随机 flood-fill 扩展生成连通区域。结果是一组连通的格子坐标。

#### `generateTasks(cells, numTasks, minSize, maxSize) → Task[]`

**任务生成**：在里程碑形状上生成直线型任务（水平或垂直方向的连续格子段）。

关键逻辑：
1. 每个任务是一条连续直线（行或列的子段）
2. 后续任务倾向从已覆盖格子开始，产生重叠
3. 拒绝与已有任务完全重复的候选
4. 生成后确保所有格子至少属于一个任务（未覆盖格子通过扩展已有任务或创建桥接任务解决）
5. 使用 Union-Find 确保任务图完全连通（桥接断开的组件）

#### `assignItemsToCells(cells, tasks, allItems, rarities) → Cell[]`

为每个格子分配物品和品质需求：
1. 确保物品来自至少 3 个池子
2. 格子数超过物品种类数时循环分配
3. 交叉格子（≥2 任务共享）不获得奖励
4. 按 `CELL_RARITY_WEIGHTS` 随机选取品质需求
5. 按 `CELL_REWARD_CHANCE`（0.3）决定是否有分数奖励

#### `generateMilestone(allItems, rarities, difficulty) → Milestone`

**里程碑生成主函数**：
1. 在 `GRID_CONFIG` 范围内随机确定格子数和任务数
2. 调用 `generateMilestoneShape` → `generateTasks` → `assignItemsToCells`
3. 指定撤离格：选择交叉格子，品质至少 rare，标记 `isEvacuation: true`
4. 确保每个任务至少有一个带奖励的格子
5. 计算网格边界

返回 `{ cells, tasks, gridBounds, isComplete }`

---

## 6. 核心状态：useGameLogic.js

**签名**: `useGameLogic(config, initialSkills, onReset, initialScore)`

**返回**: `{ state, actions, helpers }` — GameCore 解构后分发给子组件。

此 hook 约 1424 行，是整个游戏的"大脑"。

### 6.1 State 变量

#### 核心游戏数值
| 变量 | 类型 | 说明 |
|------|------|------|
| `score` | number | 当前积分 |
| `gold` | number | 当前金币（初始由 `config.global.initialGold` 决定） |
| `drawCount` | number | 累计抽卡次数 |

#### 配置衍生
| 变量 | 类型 | 说明 |
|------|------|------|
| `currentStageConfig` | object | 始终为 `config.stages[0]` |
| `maxInventorySize` | number | `currentStageConfig.inventorySize`（默认 10） |

#### 空间地图状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `itemMap` | ItemData[][] | 3×4 物品地图二维数组 |
| `drawAnimInfo` | object\|null | 抽取动画状态 `{ drawnKey, coveredKeys, phase }` |

#### 里程碑状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `milestone` | Milestone\|null | 当前里程碑数据 `{ cells, tasks, gridBounds, evacuationAvailable }` |
| `milestoneNumber` | number | 当前里程碑编号（从 1 开始） |

#### 集合状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `inventory` | (Item\|null)[] | 背包数组（null 为空格） |
| `skills` | string[] | 已拥有技能 ID（最多3个，当前未启用获取流程） |

#### 交互状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `pendingItem` | Item\|null | 等待放置的物品（背包满或超载时） |
| `pendingQueue` | Item[] | 待处理物品队列 |
| `selectedSlot` | number\|null | 选中的背包格子索引 |
| `selectedIndices` | number[] | 多选模式选中的格子索引 |
| `isSubmitMode` | boolean | 提交模式（当前未使用，保留代码） |
| `isRecycleMode` | boolean | 回收模式 |
| `selectionMode` | object\|null | 交互词缀选择模式 `{ type, pool, items }` |
| `toolSelectionMode` | object\|null | 工具物品使用模式 `{ toolIndex, effectType }`（历史遗留） |
| `activeEffect` | object\|null | 已激活的效果物品 `{ effectId, effectConfig, itemUid }` |
| `modalContent` | object\|null | 模态框数据 |
| `skillSelectionCandidates` | Skill[]\|null | 技能选择候选列表 |
| `toast` | object\|null | 浮动提示数据 |

#### 悬停状态（UI高亮用）
| 变量 | 说明 |
|------|------|
| `hoveredPoolId` | 鼠标悬停的池子 ID |
| `hoveredItemName` | 鼠标悬停的物品名称 |
| `hoveredSlotIndex` | 鼠标悬停的背包格子索引 |
| `hoveredPoolItemNames` | 鼠标悬停地图区域的物品名称列表（用于里程碑高亮） |

#### 技能状态追踪
```js
skillState = {
  consecutiveCommons: 0,     // 连续抽到 Common 计数（安慰奖技能）
  nextDrawGuaranteedRare: false, // 下次抽卡保底 Rare+
  nextDrawExtraItem: false,   // 下次抽卡额外获得1个物品
  nextDrawEnhanced: false     // 下次抽卡品质提升1级
}
```

### 6.2 Memoized 衍生数据

| 名称 | 依赖 | 说明 |
|------|------|------|
| `allNormalItems` | `config.pools`, `currentStageConfig` | 所有可用物品扁平列表 |
| `neededNames` | `milestone` | 当前里程碑所有格子的物品名称集合（包括已填充的，保持地图物品池稳定） |
| `cellMatches` | `milestone`, `inventory`, `config.rarity` | 每个未填充格子可以匹配的背包物品索引映射 `{ cellId: [invIdx, ...] }` |
| `fillableCellIds` | `cellMatches` | 当前可填充的格子 ID 列表 |
| `relevantPoolIds` | `milestone` | 未填充格子涉及的池子 ID 集合 |
| `totalRecycleValue` | `selectedIndices`, `inventory` | 回收模式下选中物品的总回收金币值 |
| `selectedItemNames` | `selectedIndices`, `inventory` | 选中物品名称集合 |

### 6.3 Effects（副作用）

1. **里程碑初始化**：`milestone` 为 null 且 `allNormalItems` 非空时，自动调用 `generateMilestone` 生成新里程碑。
2. **地图重新生成**：`milestoneNumber` 变化或里程碑创建时，调用 `generateItemMap(neededNames)` 重建地图。
3. **待定队列处理**：`pendingItem` 为 null 且 `pendingQueue` 非空时，自动取出队首设为 `pendingItem`。检查超载（specialization）和背包空间。
4. **技能同步**：`initialSkills` 变化时同步到 `skills` state。

### 6.4 核心函数详解

#### 簇品质映射

```js
CLUSTER_MIN_RARITY = { 1: null, 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' }
```

簇大小 ≥5 按 5 处理（品质下限为 legendary）。

#### 物品创建

**`createItem(pool, itemTemplate, affixKey, clusterSize)`**：
1. 调用 `rollRarity` 获取基础品质
2. 根据簇大小查 `CLUSTER_MIN_RARITY` 获取品质下限
3. 如果下限高于 roll 结果，提升到下限
4. 返回完整物品对象（含 uid、rarity、sterile、decay 等）

**`createEffectItem(effectConfig)`**：
创建效果物品（从地图效果格获取），标记 `isEffectItem: true`，品质固定为 common（仅用于显示）。

**`createItemOrEffect(pool, tpl, affixKey, clusterSize)`**：
分派函数：模板有 `isEffect` 标记时创建效果物品，否则创建普通物品。

#### 地图放置与抽取

**`handleMapPlace(anchorRow, anchorCol)`** — 核心抽取入口：

1. **有的放矢模式**（`activeEffect.effectId === 'targeted'`）：
   - 1×1 单格抽取
   - 扣费 → 移除效果物品 → 创建物品/效果 → 刷新该格

2. **标准 2×2 模式**：
   - 获取 4 格覆盖信息，分离物品格和效果格
   - 检查是否有 `activeEffect`（从背包激活的效果物品）
   - **交互效果**（trade_in/precise）：立即执行对应流程，跳过动画
   - **其他情况**：进入 4 阶段动画序列

**4 阶段抽取动画**：
```
Phase 1 (highlight, 300ms): 从可抽取格中随机选一格高亮
Phase 2 (fly, 500ms): 选中格图标飞向背包区域（Portal 动画）
Phase 3 (exit, 400ms): 执行实际抽取逻辑 + 4 格淡出
Phase 4 (enter, 350ms): 4 格刷新新物品并缩放进入
```

抽取逻辑（Phase 3 中执行）：
- `fragmented` 效果：通过 `handleDraw` 处理（3 个物品）
- 效果格被抽中：创建效果物品加入背包
- 普通物品：通过 `handleNormalDraw` 处理

**`handleDraw(pool)`** — 词缀处理入口：
1. 守卫检查（非各种特殊模式、非 pendingItem）
2. `vip_discount` 技能：precise 费用 -1
3. 金币不足 → toast 提示
4. `trade_in` → 进入 `selectionMode`（选择背包物品消耗）
5. `precise` → 进入 `selectionMode`（二选一）
6. 其他 → 扣金币 → `handleNormalDraw`

**`handleNormalDraw(pool, overrideBaseInventory)`** — 实际抽卡执行：
1. `drawCount++`
2. 根据词缀决定物品数和品质：
   - `fragmented`：3 个 common 物品（簇大小影响下限）
   - 其他：1 个随机品质物品（簇大小影响下限）
3. `nextDrawEnhanced`：品质 +1（`getNextRarity`）
4. `nextDrawExtraItem`：额外 1 个物品
5. 更新 `skillState`（连续 common 计数、安慰奖触发等）
6. 对当前背包应用熵增衰减（如启用）
7. `handleIncomingItems(items, decayedInventory)`
8. `refreshPools(true)`（当前为空操作，仅处理熵增）

**`handleIncomingItems(newItems, overrideInventory)`**：
逐个处理新物品：
1. 检查种类限制（specialization: 唯一名称 ≥7 且新名称是新种类 → 超载）
2. 背包有空位 → 放入第一个 null 槽位
3. 背包满 → 设为 `pendingItem`
4. 超载 → 设为 `pendingItem`（标记 `isOverload`）
5. 已有 pendingItem → 加入 `pendingQueue`

#### 效果物品系统

**`handleEffectItemUse(index)`** — 右键激活效果物品：
- 守卫检查（非特殊模式）
- 再次点击已激活的效果 → 取消激活
- 设置 `activeEffect = { effectId, effectConfig, itemUid }`
- 效果在下次抽取时消耗（抽取后从背包移除）

**`consumeActiveEffect()`**：从背包移除已激活的效果物品并清除 `activeEffect`。

#### 里程碑交互

**`handleFillCell(cellId)`** — 点击里程碑格子填充物品：
1. 查找匹配的背包物品（`cellMatches`）
2. 使用第一个匹配物品填充格子
3. 检查任务完成（任务所有格子已填充）
4. 计算分数奖励（已完成任务格子的 `scoreReward` 之和）
5. 从背包移除消耗的物品
6. 检查撤离可用性（覆盖撤离格的任务已完成）
7. 更新里程碑状态

**`handleEvacuate()`** — 撤离操作：
1. 检查 `milestone.evacuationAvailable`
2. 重置金币为初始值
3. 递增 `milestoneNumber`
4. 清空 `milestone`（触发新里程碑生成）

#### 背包交互

**`handleSlotClick(index)`** — 背包点击分派（约 250 行）：

| 当前模式 | 点击目标 | 行为 |
|----------|----------|------|
| `toolSelectionMode` | 任意物品 | `reforge`: 重新 roll 品质；`transmute`: 变同池其他物品 |
| `trade_in` selectionMode | 任意物品 | 消耗该物品，从对应池子生成新物品（同品质，5% 升级概率） |
| submit/recycle | 任意物品 | 切换 `selectedIndices` 中该索引 |
| `pendingItem` + 空格 | null | 放入 pendingItem |
| `pendingItem` + 物品 | item | 可合成→合成；超载→替换该类所有物品；普通→替换（回收旧物品） |
| `selectedSlot` + 空格 | null | 移动物品到空格 |
| `selectedSlot` + 物品 | item | 可合成→合成；不可合成→交换位置 |
| 无模式 + 物品 | item | 选中该格子 (`selectedSlot = index`) |
| 无模式 + 空格 | null | 无操作 |

**合成逻辑**：
- 条件：同名、同品质、非 mythic、双方非 sterile、衰变非 0（如启用）
- 结果：消耗两个物品，生成一个品质 +1 的新物品

#### 回收

**`handleConfirmRecycle()`**：
- 移除选中物品，金币 += Σ recycleValue
- `alchemy` 技能：Rare+ 物品 25% 概率 +5 金币

#### 地图刷新

**`handleRefreshMap()`**：
- 花费 1 金币
- 调用 `generateItemMap(neededNames)` 重建整个地图

#### 杂项

**`handleSortInventory()`**：按名称（zh-CN locale）→ poolName → 品质降序排列。

**`addInventoryItem(itemName, rarityId)`**：调试函数，直接添加物品到背包。

**`handleDiscardNew()`**：丢弃 pendingItem，回收其 recycleValue 为金币。

### 6.5 返回值结构

```js
{
  state: {
    // 核心数值
    gold, score, drawCount,
    currentStageConfig, maxInventorySize,
    // 空间地图
    itemMap, drawAnimInfo,
    // 里程碑
    milestone, milestoneNumber, cellMatches, fillableCellIds, relevantPoolIds,
    // 背包
    inventory,
    // 交互状态
    pendingItem, pendingQueue, selectedSlot,
    isSubmitMode, isRecycleMode, selectedIndices,
    selectionMode, toolSelectionMode,
    activeEffect,
    modalContent, skillSelectionCandidates, toast,
    skills, skillState,
    // 悬停状态（含 setter）
    hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
    setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
    // 衍生数据
    totalRecycleValue, selectedItemNames,
  },
  actions: {
    showToast, hideToast,
    // 抽卡
    handleDraw, handleMapPlace, handleRefreshMap,
    handleSelectionSelect, handleSelectionCancel,
    // 背包
    handleSlotClick, handleDiscardNew, handleSortInventory,
    // 里程碑
    handleFillCell, handleEvacuate,
    // 模式切换
    toggleSubmitMode, toggleRecycleMode,
    // 确认操作
    handleConfirmRecycle,
    // 效果/工具
    handleEffectItemUse, handleToolItemUse, handleCancelToolSelection,
    // 奖池（历史遗留接口）
    refreshPools, handlePoolHover, handlePoolLeave,
    // 技能
    triggerSkillSelection, handleSkillSelect, handleSkillReplace,
    // 模态
    handleCloseModal,
    // 调试
    addInventoryItem,
  },
  helpers: {
    hasSkill  // (skillId) => boolean
  }
}
```

---

## 7. 顶层组件：App.jsx

**职责**：管理游戏配置、设置 UI、调试工具、游戏重置。

### State

| 变量 | 类型 | 说明 |
|------|------|------|
| `config` | object | 当前游戏配置（初始为 `INITIAL_GAME_CONFIG`） |
| `gameId` | number | 递增 key，变化时强制 GameCore 重新挂载 |
| `showSettings` | boolean | 设置面板开关 |
| `debugMode` | boolean | 调试模式开关 |
| `resetConfirmOpen` | boolean | 重置确认对话框 |
| `defaultResetConfirmOpen` | boolean | 恢复默认确认对话框 |
| `initialSkills` | string[] | 调试用预设技能 |
| `initialStage` | number | 初始阶段（当前未使用） |
| `selectedSpawnPoolId/ItemName/RarityId` | string | 调试物品生成选择器 |
| `debugAddItemPulse` | object\|null | 脉冲信号触发 GameCore 添加物品 `{ itemName, rarityId, timestamp }` |

### 关键函数

**`handleHardReset()`**：`gameId++` 强制完全重置。

**`handleResetDefaults()`**：将 `config` 重置为 `INITIAL_GAME_CONFIG`。

**`handleExportConfig()`**：将 config 序列化为 JSON 并触发浏览器下载。

**`handleImportConfig(e)`**：解析上传的 JSON，**保护性合并**：
- `stages`：仅合并 `rarityWeights`、`orderRarityWeights`、`orderCountWeights`、`baseRewards`、`entropyDecayValue`
- `affixes`：按 key 匹配，仅合并 `cost` 和 `rarityWeights`
- `progress`、`emergency`、`global`、`toolItems`：浅层 spread 合并
- `rarity`：按 id 匹配，仅合并 `bonus` 和 `recycleValue`
- **不覆盖**：`pools`、`enabledSkillIds`

### 设置 UI 结构

一个 85vh 可滚动模态框，包含配置区：调试物品生成、撤离订单配置、品质概率表、订单数量权重与奖励、杂项参数、词缀配置、工具物品配置、技能启用/禁用、调试技能选择、品质详情。

### 渲染结构

```jsx
<ErrorBoundary>
  {showSettings && <SettingsModal />}
  {resetConfirmOpen && <ConfirmDialog />}
  {defaultResetConfirmOpen && <ConfirmDialog />}
  <GameCore key={gameId} config={config} ... />
</ErrorBoundary>
```

`key={gameId}` 确保重置时完全重建组件树。

---

## 8. 布局渲染层：GameCore.jsx

**职责**：连接 `useGameLogic` 返回的 state/actions 到 UI 组件。不包含游戏逻辑。

### Props

```
config, onOpenSettings, showSettings, debugMode, setDebugMode,
onReset, initialSkills, initialScore, debugAddItem, onDebugAddItemHandled
```

### 主要布局

```
┌─────────────────────────────────────────────────────┐
│ HEADER: 标题 | 积分 | 金币 | 里程碑# | 语言/调试/设置/重置  │
├─────────────────────────────────────────────────────┤
│  TOP SECTION (flex-row, 水平居中)                     │
│                                                     │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │ MilestoneGrid    │  │ ItemMap (3×4)            │  │
│  │ (需求侧)         │  │ (供给侧)                 │  │
│  │ 里程碑网格        │  │ + 刷新按钮               │  │
│  │ + 任务进度面板    │  │ + 效果激活指示器          │  │
│  │                  │  │ + 精准二选一覆盖层        │  │
│  └──────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  BOTTOM SECTION                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 技能面板 (可折叠)                             │    │
│  │ 品质加成行                                    │    │
│  │ 背包状态栏 + 一键整理                          │    │
│  │ 模式状态标签 (回收/以旧换新/工具选择)           │    │
│  │ 背包网格 (maxSize × InventorySlot)           │    │
│  │ 操作按钮 (回收/撤离)    │  待定物品面板         │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 组件向子组件传递的计算属性

在渲染 `InventorySlot` 时，GameCore 会为每个格子计算：

| 属性 | 说明 |
|------|------|
| `canSynthesize` | 与当前 selectedSlot/pendingItem 可否合成 |
| `isNeededForOrder` | 是否被里程碑未填充格子需要（名称匹配） |
| `isMaxSatisfied` | 品质是否已达到/超过里程碑格子最高品质需求 |
| `hasUpgradePair` | 背包中是否存在同名同品质的配对物品（可合成提示） |
| `isOverloadTarget` | specialization 模式下是否为超载替换目标 |
| `isToolTarget` | 工具选择模式下是否为有效目标 |

### 模态框渲染（`renderModal`）

优先级顺序：
1. `skillSelectionCandidates` 非空 → `SkillSelectionModal`
2. `modalContent.type === 'victory'` → 奖杯 + 最终积分 + 重开按钮
3. `modalContent.type === 'stage_up'` → 阶段提升提示
4. `modalContent.type === 'game_over'` → 游戏结束
5. 其他 → 标准物品模态

### Trade-in 覆盖层

当 `selectionMode.type === 'trade_in'` 时，渲染全屏半透明覆盖层 + 浮动取消按钮。

---

## 9. 游戏组件详解

### 9.1 ItemMap.jsx

空间物品地图组件 — 游戏的核心供给侧 UI。

**Props**: `itemMap, drawAnimInfo, milestone, rarityConfig, onPlace, onHoverCoverage, disabled, activeEffect`

**核心特性**：

**悬停交互**：
- 标准模式：鼠标悬停显示 2×2 框选高亮（indigo 色 ring + scale-105）
- 有的放矢模式：悬停单个格子高亮
- `onHoverCoverage` 回调传递覆盖区域的物品名称，用于里程碑高亮联动

**簇可视化**（metaball 风格）：
- 每个格子计算与 8 方向邻居的同名关系 (`clusterAdj`)
- 同名相邻格子之间的边框移除，角的圆角根据邻接关系调整
- 簇内格子共享品质色背景（由 `CLUSTER_RARITY_ID` 映射）
- 簇内格子有呼吸动画 (`clusterPulse 3s ease-in-out infinite`)

**品质指示器**：
- 簇大小决定背景色：1=slate, 2=green(uncommon), 3=blue(rare), 4=purple(epic), 5+=orange(legendary)
- 里程碑需要的物品在右上角显示品质色点

**抽取动画**（`drawAnimInfo` 4 阶段）：
- `highlight`：选中格高亮放大 + 琥珀色光环
- `fly`：选中格图标隐藏，`FlyingItem` portal 从格子飞向屏幕底部
- `exit`：选中格和其他 3 格淡出缩小
- `enter`：4 个新物品缩放进入

**`FlyingItem` 内嵌组件**：
- 使用 `createPortal(…, document.body)` 渲染飞行中的物品图标
- CSS transition 从源格子位置飞到 `(window.innerWidth/2, window.innerHeight-80)`

**效果格渲染**：
- 效果格（`isEffect: true`）使用白色背景，显示效果图标和名称
- 不参与簇计算和品质着色

### 9.2 MilestoneGrid.jsx

里程碑网格组件 — 游戏的核心需求侧 UI。

**Props**: `milestone, fillableCellIds, onFillCell, milestoneNumber, hoveredPoolItemNames`

**布局**：
- 左侧：CSS Grid 网格，格子大小 6rem，间距 16px
- 右侧：侧面板显示里程碑编号、任务进度（已完成/总数）、每个任务的颜色标识和格子数

**任务连线**：
- 每个任务渲染为一条彩色直线（水平或垂直），通过 CSS Grid 定位
- 已完成任务连线透明度降低 (`opacity-25`)
- 单格任务显示为圆点（10×10px）

**格子渲染**：
- 使用 `GridCell` 组件
- `fillableCellIds` 控制哪些格子可点击（绿色光环）
- `hoveredPoolItemNames` 控制地图悬停时的联动高亮

### 9.3 GridCell.jsx

里程碑网格中的单个格子组件。

**Props**: `cell, isFillable, isHighlighted, onClick`

**视觉元素**：
- 品质色边框和背景（由 `requiredRarity` 决定）
- 左上角：分数奖励标签 (`+N分`)
- 中间：物品图标（未填充时灰度 + 透明，填充后全色）+ 物品名称
- 左下角：品质名称 + "+" 后缀
- 右上角：撤离标记 🚀（`isEvacuation` 格子）
- 填充后：绿色勾号覆盖
- 可填充时：绿色光环 + 右上角绿色勾号

### 9.4 InventorySlot.jsx

背包格子组件。

**Props**（约 23 个）：物品数据 + 所有视觉状态标志 + 交互回调。

**内嵌组件 `ToolItemTooltip`**：
- 使用 `createPortal(…, document.body)` 渲染到 body
- `useLayoutEffect` 中基于 anchor `ref.getBoundingClientRect()` 计算绝对定位
- 显示工具/效果名称、描述、"右键点击使用"提示
- 避免溢出/z-index 裁剪

**物品槽视觉状态**：

| 状态 | 样式 |
|------|------|
| 空格 | 虚线灰色边框 |
| 有物品 | 品质色 + 阴影 + 图标(2xl/3xl) + 名称(10px 截断) |
| 工具物品 | 琥珀渐变边框 + 脉冲图标 + "工具" badge |
| 效果物品 | 翡翠渐变边框 + "效果" badge |
| 被选中（常规） | translate-y-4 上移 + scale |
| 被选中（recycle） | 琥珀色边框 |
| 合成目标 | 黄色 ring-4 + scale-105 |
| 超载目标 | 红色覆盖 + 垃圾桶图标 |
| 交换目标 | 蓝色覆盖 + 箭头图标 |
| 升级配对 | 右上角黄色弹跳 ChevronsUp badge |
| 里程碑需求提示 | 右下角绿色/灰色对勾 |
| 绝育标记 | 左下角 "绝育" 暗色 badge |
| 衰变计数 | 左上角等宽数字；≤0 时 "损坏" + 红覆盖 |
| 工具/效果悬停 | 底部 "右键使用/激活" 指示器 + portal tooltip |

**右键交互**：
- 工具物品：触发 `handleToolItemUse`
- 效果物品：触发 `handleEffectItemUse`（激活/取消激活效果）

### 9.5 SkillSelectionModal.jsx

**Props**: `candidates, onSelect, currentSkills, onReplace`

**两种模式**：
- **普通模式**（技能 <3 个）：显示 3 候选，点击直接选中
- **替换模式**（技能 =3 个）：两步操作 — 点击新技能暂存 → 点击旧技能为目标 → 确认

**特殊功能**：
- "按住查看"按钮：`isPeeking` 状态使弹窗背景透明、隐藏内容，方便查看游戏状态
- "放弃新技能"按钮始终可用

> 当前技能系统未启用，此组件处于休眠状态。

---

## 10. UI 基础组件

### 10.1 ConfirmDialog.jsx

简单模态：标题 + 消息 + 取消（灰色）/ 确认（红色）按钮。

**Props**: `title, message, onCancel, onConfirm`

### 10.2 Toast.jsx

顶部居中浮入的通知条，2000ms 后通过 `useEffect` 自动关闭。

**Props**: `message, type, onClose`

- `type === 'error'` → 红色背景
- 其他 → slate-800 背景

### 10.3 ErrorBoundary.jsx

React 类组件错误边界。捕获 `componentDidCatch` 错误，显示错误消息 + 堆栈 + "Reload Game" 按钮（`window.location.reload()`）。

---

## 11. 国际化系统

### LanguageContext.jsx

**Provider state**：`language`（`'zh'` | `'en'`），持久化到 `localStorage('game_language')`。

**`t(text)` 函数**：
1. `language === 'zh'` → 原样返回
2. `language === 'en'` → 查找 `EN_TRANSLATIONS[text]`，找到返回翻译，否则返回原文

**`toggleLanguage()`**：zh ↔ en 切换。

**`useLanguage()` hook**：从 context 获取 `{ language, t, toggleLanguage }`。在 Provider 外使用会 throw。

### translations.js

`EN_TRANSLATIONS` 扁平对象。覆盖：
- UI 通用术语、品质名称、池子/物品名称（全部 20 种）
- 词缀名称和描述
- 13 个技能名称和描述
- Toast/错误消息、模态框标题和按钮
- 里程碑、效果物品相关文案

**惯例**：中文是源语言。所有新增 UI 文本必须先用中文硬编码，然后在 `translations.js` 中添加英文翻译，组件中使用 `t()` 包裹。

---

## 12. 关键算法与流程

### 12.1 地图抽取完整流程

```
用户点击 ItemMap 格子
  → ItemMap.handleCellClick(row, col)
    → actions.handleMapPlace(anchorRow, anchorCol)
      │
      ├── targeted 模式？
      │   → 1×1 单格抽取，立即执行
      │
      └── 标准 2×2 模式
            ├── 获取 4 格覆盖信息
            ├── 检查 activeEffect（背包中激活的效果）
            ├── 交互效果 (trade_in/precise)?
            │   → 立即进入 selectionMode，跳过动画
            │
            └── 常规抽取
                  ├── 计算 clusterSizes（簇大小）
                  ├── 从覆盖格中随机选 1 格
                  │
                  ├── Phase 1: highlight (300ms)
                  ├── Phase 2: fly (500ms) — portal 动画
                  ├── Phase 3: exit (400ms)
                  │   ├── fragmented → handleDraw → 3 个物品
                  │   ├── 效果格 → createEffectItem → 加入背包
                  │   └── 普通格 → handleNormalDraw
                  │         ├── createItem(簇大小影响品质下限)
                  │         ├── enhancement/extra item（技能效果）
                  │         ├── 更新 skillState
                  │         ├── applyEntropy（如启用）
                  │         └── handleIncomingItems → 背包/pendingItem
                  │
                  ├── Phase 4: enter (350ms) — 4 格刷新
                  └── refreshCoveredCells
```

### 12.2 簇品质系统

```
1. computeClusterSizes(itemMap)
   BFS 遍历全图，8 方向相邻同名物品归为一簇
   → 每个格子获得簇大小值

2. 抽取时查表:
   簇大小 1 → 无品质下限（正常 roll）
   簇大小 2 → 品质下限 uncommon
   簇大小 3 → 品质下限 rare
   簇大小 4 → 品质下限 epic
   簇大小 5+ → 品质下限 legendary

3. 如果 rollRarity 结果低于下限 → 提升到下限
```

### 12.3 里程碑生成流程

```
generateMilestone(allItems, rarities, difficulty)
  │
  ├── generateMilestoneShape(canvasSize=5, targetCellCount=8~12)
  │   └── 从中心开始随机 flood-fill 扩展连通区域
  │
  ├── generateTasks(cells, numTasks=3~5, minSize=2, maxSize=4)
  │   ├── 寻找直线段（水平/垂直连续格子）
  │   ├── 确保所有格子被覆盖
  │   └── Union-Find 确保任务图连通
  │
  ├── assignItemsToCells(cells, tasks, allItems, rarities)
  │   ├── 从 ≥3 个池子分配物品
  │   ├── 按 CELL_RARITY_WEIGHTS 随机品质需求
  │   └── 30% 概率有分数奖励（交叉格无奖励）
  │
  ├── 指定撤离格（交叉格，品质≥rare，标记 🚀）
  └── 确保每个任务至少 1 个有奖励的格子
```

### 12.4 里程碑填充与撤离流程

```
用户点击可填充的 GridCell
  → handleFillCell(cellId)
    ├── 匹配背包物品（名称 + 品质 ≥ 需求）
    ├── 填充格子，从背包移除物品
    ├── 检查任务完成 → 累加分数奖励
    └── 检查撤离可用性

撤离条件：覆盖撤离格的任何任务已完成
  → handleEvacuate()
    ├── 重置金币
    ├── milestoneNumber++
    └── milestone = null（触发新里程碑生成 + 地图重建）
```

---

## 13. 状态交互矩阵

此矩阵显示不同模式下各种交互的行为：

| 操作\模式 | 默认 | recycle | pendingItem | selectedSlot | selectionMode | toolSelection |
|-----------|------|---------|-------------|--------------|---------------|---------------|
| 点击地图格子 | 2×2抽取 | 阻止 | 阻止 | 2×2抽取 | 阻止 | 阻止 |
| 点击背包空格 | 无 | 无 | 放入物品 | 移动到空格 | 无 | 无 |
| 点击背包物品 | 选中 | 切换选择 | 合成/替换 | 合成/交换 | trade_in消耗 | 应用工具效果 |
| 点击里程碑格 | 填充(如可) | 填充(如可) | — | — | — | — |
| 右键效果物品 | 激活/取消 | 阻止 | 阻止 | 阻止 | 阻止 | 阻止 |
| 确认按钮 | — | 回收 | — | — | — | — |
| 刷新地图 | 花1金币 | 阻止 | 阻止 | 花1金币 | 阻止 | 阻止 |

**互斥规则**：进入任何模式会清除其他模式。`pendingItem` 阻止抽卡和模式切换。动画进行中阻止所有地图交互。

---

## 14. 已知设计债务与休眠系统

### 休眠系统

1. **阶段系统**：4 个阶段完整定义在 `INITIAL_STAGE_CONFIG`，但 `useGameLogic` 硬编码 `config.stages[0]`，无阶段切换触发器。
2. **技能获取流程**：`triggerSkillSelection()` 存在但无自动触发点。`SkillSelectionModal` UI 完整但不会被激活。技能只能通过调试工具或未来代码手动触发。
3. **积分进度**：`targetProgress: Infinity`，进度系统框架存在但无具体目标。

### 已废弃但保留的代码

1. **工具物品系统**：`TOOL_ITEMS` 为空数组，`tryDropToolItem` 为空操作，但 `handleToolItemUse`、`toolSelectionMode` 相关逻辑仍保留在代码中。
2. **订单系统**：`generateOrder`、`OrderCard`（如存在）等为历史遗留。当前需求侧完全由里程碑网格系统承担。
3. **PoolCard / FrameSelector**：文件保留但不在 GameCore 中使用。
4. **命运骰子系统**：已完全移除，撤离通过里程碑网格的撤离格实现。
5. **EMERGENCY_ORDER_CONFIG**：配置保留但不影响当前游戏流程。

### 代码规模

- `useGameLogic.js` 约 1424 行，是单一巨型 hook，无子 hook 拆分。
- `App.jsx` 约 1127 行，设置 UI 内联在 App 中。
- `GameCore.jsx` 约 729 行。

---

## 15. 修改指南

### 修改游戏数值

- 抽取品质权重 → `constants.js` 中 `INITIAL_STAGE_CONFIG[0].rarityWeights`
- 里程碑参数 → `gridConstants.js` 中 `GRID_CONFIG`、`CELL_RARITY_WEIGHTS`、`CELL_SCORE_WEIGHTS`
- 簇品质映射 → `useGameLogic.js` 中 `CLUSTER_MIN_RARITY` 常量
- 地图尺寸 → `spatialConstants.js` 中 `MAP_ROWS`、`MAP_COLS`
- 抽取费用 → `spatialConstants.js` 中 `DEFAULT_DRAW.cost`
- 品质回收价值 → `constants.js` 中 `INITIAL_RARITY_CONFIG`

### 添加新效果（词缀）

1. 在 `constants.js` 的 `INITIAL_AFFIXES_CONFIG` 数组中添加新词缀对象
2. 在 `spatialConstants.js` 的 `EFFECT_ITEM_ICONS` 中添加图标
3. 在 `helpers.js` 的 `rollRarity` 中添加品质约束逻辑（如果需要）
4. 在 `useGameLogic.js` 的 `handleMapPlace`/`handleDraw`/`handleNormalDraw` 中添加行为分支
5. 在 `translations.js` 中添加英文翻译

### 修改里程碑生成

编辑 `gridConstants.js` 中的 `GRID_CONFIG`：
- `canvasSize`：画布大小（影响里程碑最大范围）
- `cellCount.min/max`：格子数量范围
- `taskCount.min/max`：任务数量范围
- `taskSize.min/max`：每个任务的格子数范围

### 修改簇品质系统

在 `useGameLogic.js` 中修改 `CLUSTER_MIN_RARITY` 映射即可。如需改变簇计算方式（如只用 4 方向而非 8 方向），修改 `spatialPoolHelpers.js` 中 `computeClusterSizes` 的方向数组。

### 添加新 UI 组件

1. 在 `src/components/game/` 或 `src/components/ui/` 下创建
2. 不要在组件中持有游戏逻辑状态，所有状态通过 props 从 GameCore 传入
3. 所有文本用 `t()` 包裹，先写中文，再在 `translations.js` 中添加英文

### 启用阶段系统

需要：
1. 在 `useGameLogic` 中添加 `currentStageIndex` state
2. 添加阶段切换触发条件（如积分阈值）
3. 将 `config.stages[0]` 改为 `config.stages[currentStageIndex]`
4. 为每个阶段的特殊机制确保逻辑正确（volatility/specialization/entropy 的代码已存在但部分未激活）

### 启用技能获取流程

需要：
1. 在合适时机（如完成任务后、撤离时）调用 `actions.triggerSkillSelection()`
2. `SkillSelectionModal` 的 UI 已完整实现，无需额外 UI 工作

### i18n 注意事项

- 中文是源语言，直接硬编码在 JSX 中
- 英文翻译在 `translations.js` 的扁平映射中
- 修改任何 UI 文本后须在 zh 和 en 下测试，确保无溢出和换行问题

---

*文档版本：基于 `feature/cluster-based-effect` 分支全量源码分析生成*
*最后更新：2026-04-01*
