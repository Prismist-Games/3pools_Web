# 幸运之墙 Wall of Fortune — 代码技术知识文档

本文档是项目代码的完整技术参考，涵盖架构、数据流、每个文件的职责与实现细节、状态管理、UI 渲染逻辑和外部集成。阅读本文档后，无需再阅读源代码即可对项目做出正确修改。

> **最后更新**: 2026-04-07 · 基于 `core-draw/board-type-experiments-designed-levels` 分支

---

## 目录

1. [技术栈与构建](#1-技术栈与构建)
2. [目录结构](#2-目录结构)
3. [数据流总览](#3-数据流总览)
4. [配置层：constants.js](#4-配置层constantsjs)
5. [纯工具函数：helpers.js](#5-纯工具函数helpersjs)
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
│   ├── main.jsx                   ← ReactDOM 渲染入口（BrowserRouter）
│   ├── App.jsx                    ← 路由配置（/ → 游戏, /editor → 编辑器, /levels → 关卡管理）
│   ├── GameCore.jsx               ← 游戏布局 + 组件编排
│   ├── index.css                  ← Tailwind 指令 + 自定义滚动条隐藏
│   │
│   ├── data/
│   │   ├── constants.js           ← 游戏配置数据 (~20KB)
│   │   ├── v2Config.js            ← v2 贴纸/订单/墙类型/远征配置
│   │   ├── matrixConfig.js        ← 5×5 网格生成参数（厄运/特殊格/形状权重）
│   │   ├── levelTemplates.js      ← 关卡系统：CELL_TYPES、glob 导入关卡、pickTemplate()
│   │   └── levels/                ← 关卡 JSON 文件（自动导入，编辑器保存至此）
│   │       ├── bomb_cross.json
│   │       ├── cow_level_sticker.json
│   │       └── select_prize.json
│   │
│   ├── hooks/
│   │   └── useGameLogic.js        ← 游戏全部状态与逻辑
│   │
│   ├── utils/
│   │   ├── helpers.js             ← 纯函数工具
│   │   ├── matrixHelpers.js       ← 墙生成（fillDoomAndSpecials, fillEmptyCellsWithStickers）
│   │   ├── templateGenerator.js   ← 关卡模板解析（generateWallFromTemplate）
│   │   ├── translations.js        ← 英文翻译映射
│   │
│   ├── contexts/
│   │   └── LanguageContext.jsx     ← 语言切换 Context + t() 翻译函数
│   │
│   └── components/
│       ├── ErrorBoundary.jsx       ← 错误边界（类组件）
│       ├── game/
│       │   ├── ResourceMatrix.jsx  ← 5×5 奖品墙渲染
│       │   ├── WallPicker.jsx      ← 3 选 1 墙选择界面
│       │   ├── InventorySlot.jsx   ← 背包格子
│       │   ├── OrderCard.jsx       ← 订单卡片
│       │   ├── BulletinBoard.jsx   ← 公告牌
│       │   ├── ActiveOrders.jsx    ← 已接订单
│       │   ├── ScoreBoard.jsx      ← 分数面板
│       │   └── ...
│       ├── editor/
│       │   ├── LevelEditor.jsx     ← 关卡编辑器页面（画板 + 设置 + 保存）
│       │   ├── LevelManager.jsx    ← 关卡管理页面（浏览 + 权重配置）
│       │   ├── GridPainter.jsx     ← 可交互 5×5 编辑网格（画笔 + 编组模式）
│       │   ├── CellPalette.jsx     ← 格子类型画笔选择器
│       │   └── TemplatePreview.jsx ← 关卡缩略图预览
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
        ├── 内部使用 helpers.js 的纯函数
        ├── 返回 { state, actions, helpers }
        │
        ▼
   GameCore.jsx ─── 解构 state/actions/helpers，传给子组件
        │
        ├── PoolCard ← 奖池展示 + 抽卡入口
        ├── OrderCard ← 订单展示 + 提交入口
        ├── InventorySlot ← 背包格子交互
        ├── SkillSelectionModal ← 技能选择
```

### 核心原则

1. **单向数据流**：Config → App → GameCore → useGameLogic → 子组件。
2. **单一状态源**：所有游戏状态集中在 `useGameLogic` 中，组件不持有游戏逻辑状态。
3. **配置驱动**：数值、物品、词缀、技能等全部由 `INITIAL_GAME_CONFIG` 定义，修改平衡时编辑 `constants.js`。

---

## 4. 配置层：constants.js

此文件导出所有游戏数据。以下列出每个导出的结构和用途。

### 4.1 `INITIAL_STAGE_CONFIG`（4 个阶段）

```js
[
  { // Stage 0: 普通模式
    inventorySize: 10, orderSlots: 3, poolSize: 4, allowedPoolCount: 5,
    initialGold: 20,
    mechanics: { refresh: true, affixes: true, synthesis: true, variablePrice: true },
    rarityWeights: { common: 0.37, uncommon: 0.3, rare: 0.2, epic: 0.1, legendary: 0.03, mythic: 0 },
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

### 4.2 `SKILL_DEFINITIONS`（13 个技能）

每个技能对象：`{ id, name, desc, Icon, type, color }`

| id | 名称 | 简述 |
|----|------|------|
| `poverty_relief` | 贫困救济 | 金币<20 完成订单 +5 金币 |
| `lucky_7` | 幸运7 | 金币尾数7或7倍数时传说概率×2 |
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

Icon 字段引用 `lucide-react` 组件。技能效果在 `useGameLogic` 中通过 `hasSkill(id)` 检查后以条件分支实现。

### 4.3 `TOOL_ITEMS`（3 种工具物品）

| id | 名称 | 图标 | effectType | 行为 |
|----|------|------|------------|------|
| `tool_reforge` | 命运熔炉 | 🔥 | `reforge_left` | 右键→选目标→随机重置品质 |
| `tool_transmute` | 万象棱镜 | 🔮 | `transmute_left` | 右键→选目标→变同池其他物品 |
| `tool_enhance` | 星辉祝福 | ✨ | `enhance_next` | 右键→直接激活→下次抽卡品质+1 |

### 4.4 `TOOL_ITEM_CONFIG`

```js
{ dropChance: 0.2, weights: { each: 1 },
  reforgeRarityWeights: { common:0.4, uncommon:0.3, rare:0.2, epic:0.08, legendary:0.02, mythic:0 } }
```

### 4.5 `INITIAL_AFFIXES_CONFIG`（7 种词缀）

| id | 名称 | 类型 | cost | 特殊权重 |
|----|------|------|------|----------|
| `trade_in` | 以旧换新的 | interaction | 1 | — |
| `hardened` | 硬化的 | passive | 2 | uncommon:0.2, rare:0.7, epic:0.09, legendary:0.01 |
| `purified` | 提纯的 | passive | 3 | rare:0.67, epic:0.3, legendary:0.03 |
| `volatile` | 波动的 | passive | 1 | — (逻辑约束只出 common/legendary) |
| `fragmented` | 稀碎的 | passive | 1 | — (逻辑约束全 common) |
| `precise` | 精准的 | interaction | 2 | — |
| `targeted` | 有的放矢的 | interaction | 4 | — |

每个词缀对象还包含 `name`、`desc`、`weight`（用于随机选取）等字段。

### 4.6 `INITIAL_RARITY_CONFIG`（6 级品质）

| id | name | bonus | recycleValue | color (Tailwind) |
|----|------|-------|-------------|-----------------|
| `common` | 普通 | 0 | 0 | gray-400 |
| `uncommon` | 优秀 | 0.1 | 0 | green-400 |
| `rare` | 稀有 | 0.25 | 1 | blue-400 |
| `epic` | 史诗 | 0.5 | 2 | purple-400 |
| `legendary` | 传说 | 1.0 | 4 | orange-400 |
| `mythic` | 神话 | 2.0 | 10 | red-400 |

> 注意：`constants.js` 默认值可能被 JSON 配置覆盖（通过 App.jsx 的导入功能）。`game_rules.md` 中的数值以 JSON 配置为准。

### 4.7 `INITIAL_POOLS_DATA`（5 个物品池）

| poolId | 池名 | 图标 | 物品 (4个) |
|--------|------|------|-----------|
| `fruit` | 水果 | 🍎 | 西瓜🍉 柠檬🍋 芒果🥭 苹果🍎 |
| `medicine` | 药物 | 💊 | 冲剂🍵 滴眼液💧 注射器💉 胶囊💊 |
| `stationery` | 文具 | ✏️ | 铅笔✏️ 橡皮🧼 订书机📎 笔记本📒 |
| `kitchenware` | 厨具 | 🍳 | 平底锅🍳 菜刀🔪 砧板🪵 汤勺🥄 |
| `electronics` | 电器 | ⚡️ | 手机📱 耳机🎧 空调❄️ 电脑💻 |

### 4.8 `EMERGENCY_ORDER_CONFIG`（撤离订单配置）

```js
{
  difficulty: { initial: 1, increaseOnNewOrder: 1, decreaseOnScoreOrder: 0, min: 1, max: 4 },
  reqCountMin: 1, reqCountMax: 4,
  baseRarityWeights: { ... },
  difficultyReqCountWeights: { 1-10: { 2-4: weight } },
  difficultyRarityWeights: { 1-10: { rarities } },
  difficultyRequirements: { 1: [{uncommon,1},{rare,1}], 2: [{rare,1},{rare,1}], 3: [{rare,1},{epic,1}], 4: [{epic,1},{epic,1}] }
}
```

> 撤离订单没有时限和生命值系统。胜负由"金币耗尽前能否完成撤离订单"决定。

### 4.9 `SCORE_PROGRESS_CONFIG`

```js
{ targetProgress: null, progressOffset: 0,
  rarityWeights: { common:2, uncommon:2.5, rare:4, epic:8, legendary:16, mythic:32 } }
```

### 4.10 `INITIAL_GAME_CONFIG`（总配置对象）

将以上所有配置聚合：

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
  global: { refreshCost: 5, initialGold: 30, initialRefreshCount: 3, maxRefreshCount: 3 }
}
```

---

## 5. 纯工具函数：helpers.js

所有函数为纯函数，不依赖 React，不持有状态。

### `getAllNormalItems(pools, currentStageConfig) → Item[]`

根据 `allowedPoolCount`（限制池子数量）和 `poolSize`（限制每池物品数）从 `pools` 中取出扁平物品列表。每个物品附加 `poolId` 和 `poolName`。

### `getRandomAffix(affixes) → Affix`

按 `weight` 字段加权随机选取一个词缀。

### `getRandomItems(array, count) → Item[]`

Fisher-Yates 洗牌后取前 `count` 个。

### `rollRequirementRarity(config, stageConfig, isEmergency, difficulty) → RarityId`

确定订单需求的品质：
- 撤离订单：先查 `difficultyRarityWeights[difficulty]`，fallback 到 `baseRarityWeights`，再 fallback 到 `stageConfig.orderRarityWeights`
- 普通订单：使用 `stageConfig.orderRarityWeights`
- 累积概率法随机选取

### `generateOrder(allItems, config, hasSkill, stageConfig, isEmergency, difficulty) → Order`

完整订单生成流程：
1. 检查 `difficultyRequirements[difficulty]` 是否存在精确模式（固定品质列表）
2. 否则随机模式：按权重选需求数量 → 为每个需求选物品 + 品质
3. 撤离订单强制不同池子（`getUniquePoolItems` 辅助函数）
4. `cut_corners` 技能：20% 概率减少1个需求
5. 计算 `baseScoreReward = max(1, floor(Σ rarityWeights + offset))`
6. 返回 `{ id, requirements, baseScoreReward, isScoreOrder }`

### `rollRarity(config, affixKey, gold, hasSkill, skillState, stageConfig) → Rarity`

抽卡品质判定核心：
1. 根据词缀确定 `allowedRarityIds`（volatile → [common, legendary]，fragmented → [common] 等）
2. 优先使用词缀自定义权重，否则使用阶段权重
3. `lucky_7` 技能：`gold % 10 === 7` 时传说权重 ×2
4. `nextDrawGuaranteedRare`：从允许的 Rare+ 中随机选
5. 累积概率随机选取
6. Fallback → common

### `getNextRarity(currentRarityId, config) → Rarity | null`

返回比当前品质高一级的品质对象，mythic 返回 null。

---

## 6. 核心状态：useGameLogic.js

**签名**: `useGameLogic(config, initialSkills, onReset, initialScore)`

**返回**: `{ state, actions, helpers }` — GameCore 解构后分发给子组件。

此 hook 约 2200 行，是整个游戏的"大脑"。以下逐一说明。

### 6.1 State 变量

#### 核心游戏数值
| 变量 | 类型 | 说明 |
|------|------|------|
| `score` | number | 当前积分 |
| `gold` | number | 当前金币 |
| `drawCount` | number | 累计抽卡次数 |
| `emergencyDifficulty` | number | 当前撤离订单难度 |
| `orderRefreshCount` | number | 剩余订单刷新次数 |
| `REFRESH_MAX` | number | 最大刷新次数（来自 config） |

#### 配置衍生
| 变量 | 类型 | 说明 |
|------|------|------|
| `currentStageConfig` | object | 始终为 `config.stages[0]` |
| `maxInventorySize` | number | `currentStageConfig.inventorySize` |

#### 集合状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `activePools` | Pool[3] | 当前3个活跃奖池（含词缀） |
| `orders` | Order[3] | 普通订单数组 |
| `emergencyOrders` | Order[2] | 撤离订单数组 |
| `inventory` | (Item\|null)[] | 背包数组（null 为空格） |
| `skills` | string[] | 已拥有技能 ID（最多3个） |

#### 交互状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `pendingItem` | Item\|null | 等待放置的物品 |
| `pendingQueue` | Item[] | 待处理物品队列 |
| `selectedSlot` | number\|null | 选中的背包格子索引 |
| `selectedIndices` | number[] | 多选模式选中的格子索引 |
| `isSubmitMode` | boolean | 提交模式 |
| `isRecycleMode` | boolean | 回收模式 |
| `isEvacuationMode` | boolean | 撤离模式 |
| `selectionMode` | object\|null | 交互词缀选择模式 `{ type, pool, items, cost }` |
| `toolSelectionMode` | object\|null | 工具物品使用模式 `{ toolIndex, effectType }` |
| `orderSlotAssignments` | object | 订单槽位分配映射 `{ "orderIdx-reqIdx": itemUid }` |
| `orderCandidates` | object\|null | 当前候选订单 `{ slotIndex, candidates[] }` |
| `orderCandidateQueue` | object[] | 候选订单队列 |
| `modalContent` | object\|null | 模态框数据 |
| `skillSelectionCandidates` | Skill[]\|null | 技能选择候选列表 |
| `toast` | object\|null | 浮动提示数据 |

#### 悬停状态（UI高亮用）
| 变量 | 说明 |
|------|------|
| `hoveredPoolId` | 鼠标悬停的池子 ID |
| `hoveredItemName` | 鼠标悬停的物品名称 |
| `hoveredSlotIndex` | 鼠标悬停的背包格子索引 |
| `hoveredPoolItemNames` | 鼠标悬停池子的物品名称列表 |

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
| `maxRequirementRarityMap` | `orders`, `emergencyOrders`, `config.rarity` | 物品名→所有订单中该物品最高需求品质的 bonus |
| `assignedItemUids` | `orderSlotAssignments` | 已分配物品 UID 集合 |
| `phantomMarks` | `orders`, `emergencyOrders`, `orderSlotAssignments`, `inventory` | 交叉订单幻影标记：`{ "orderIdx-reqIdx": { orderIndex, reqIndex, itemUid }[] }` |
| `satisfiableOrders` | `selectedIndices`, `inventory`, `orders`, `emergencyOrders` | 当前选中物品可满足的订单列表（仅在提交/撤离模式计算） |
| `potentialSatisfiableOrders` | `inventory`, `orders`, `emergencyOrders` | 全背包物品可满足的订单（始终计算，用于预览） |
| `totalRecycleValue` | `selectedIndices`, `inventory` | 回收模式下选中物品的总回收金币值 |
| `selectedItemNames` | `selectedIndices`, `inventory` | 选中物品名称集合 |

### 6.3 Effects（副作用）

1. **订单初始化**：组件挂载时填充 `orders` 至 `orderSlots` 个，初始化 2 个撤离订单。
2. **奖池初始化**：`config` 变化时调用 `refreshPools(false)`。
3. **待定队列处理**：`pendingItem` 为 null 且 `pendingQueue` 非空时，自动取出队首设为 `pendingItem`。
4. **候选队列处理**：`orderCandidates` 为 null 且 `orderCandidateQueue` 非空时，自动取出队首设为当前候选。

### 6.4 核心函数详解

#### 奖池管理

**`generateActivePools()`**
1. 从 `config.pools` 中随机选 3 个不重复池子
2. 为每个池子随机分配不重复词缀（`getRandomAffix`）
3. 每个活跃池子对象 = `{ ...pool, affix, cost: affix.cost }`

**`refreshPools(tick: boolean)`**
- 调用 `generateActivePools()` 更新 `activePools`
- `tick=true` 时应用熵增衰减（`applyEntropy`）

**`applyEntropy(inv)`**
- 遍历背包所有物品，`decay` 值 -1（仅在 entropy 机制启用时执行）

#### 抽卡流程

**`handleDraw(pool)`** — 抽卡入口：
1. 守卫检查（非 submitMode、非 recycleMode、非 evacuationMode、非 selectionMode、非 toolSelectionMode、非 pendingItem）
2. `vip_discount` 技能：precise/targeted 词缀费用 -1
3. 金币不足 → toast 提示，return
4. 交互词缀 → `setSelectionMode(...)` 进入交互流程，return
5. 被动词缀 → 扣金币 → `handleNormalDraw(pool)`

**`handleNormalDraw(pool)`** — 实际抽卡执行：
1. `drawCount++`
2. 根据词缀决定物品数和品质：
   - `fragmented`：3 个 common 物品
   - 其他：1 个随机品质物品
3. `nextDrawExtraItem`（auto_restock 技能）→ 额外复制第一个物品
4. `nextDrawEnhanced`（enhance 工具）→ 品质 +1（`getNextRarity`）
5. 更新 `skillState`（连续 common 计数、安慰奖触发等）
6. 对当前背包应用熵增衰减
7. `tryDropToolItem(items)` → 20% 概率追加一个工具物品
8. `handleIncomingItems(items, decayedInventory)`
9. `refreshPools(true)`

**`handleIncomingItems(newItems, overrideInventory)`**：
1. 检查 `negotiator` 技能（Epic+ 物品 → 刷新次数 +1）
2. 对每个新物品：
   - 检查种类限制（specialization: 背包中唯一名称 ≥7 且新名称是新种类）
   - 背包有空位 → 放入第一个 null 槽位
   - 背包满 → 设为 `pendingItem`（或加入 `pendingQueue`）
   - 超载 → 设为 `pendingItem`

**`tryDropToolItem(items)`**：以 `dropChance`（0.2）概率调用 `rollToolItem` 并 push 到 items 数组。

**`rollToolItem(config)`**：加权随机选择工具类型，创建工具物品实例（`isTool: true`, `sterile: true`）。

#### 交互词缀处理

**`handleSelectionSelect(selectedItem)`**：
- `precise`/`targeted`：以选中物品创建 item，应用 enhancement，`handleIncomingItems`
- 之后清除 `selectionMode`

**`handleSelectionCancel()`**：
- 退还金币（`targeted`/`precise`/`trade_in` 各自退还对应 cost）
- 清除 `selectionMode`

#### 背包交互

**`handleSlotClick(index)`** — 最复杂的函数，约 200 行，根据当前模式分派：

| 当前模式 | 点击目标 | 行为 |
|----------|----------|------|
| `toolSelectionMode` | 任意物品 | `reforge`: 重新 roll 品质；`transmute`: 变同池其他物品 |
| `trade_in` selectionMode | 任意物品 | 消耗该物品，从对应池子生成新物品（同品质，5% 升级，不同名称） |
| submit/recycle/evacuation | 任意物品 | 切换 `selectedIndices` 中该索引 |
| `pendingItem` + 空格 | null | 放入 pendingItem |
| `pendingItem` + 物品 | item | 可合成→合成；不可合成→替换（回收旧物品） |
| `selectedSlot` + 空格 | null | 移动物品到空格 |
| `selectedSlot` + 物品 | item | 可合成→合成；不可合成→交换位置 |
| 无模式 + 物品 | item | 选中该格子 (`selectedSlot = index`) |
| 无模式 + 空格 | null | 无操作 |

**合成逻辑**：
- 条件：同名、同品质、非 mythic、双方非 sterile、衰变非 0
- 结果：消耗两个物品，生成一个品质 +1 的新物品

**被分配物品的保护**：已分配到订单槽位的物品（`assignedItemUids` 包含其 uid）在大部分模式下不可交互（显示灰色+不透明），例外情况：trade_in、recycle mode、pendingItem 替换、selectedSlot 合成。

#### 订单交互

**`handleOrderClick(orderIndex)`**：
- 若 `selectedSlot` 有值：自动分配物品到该订单匹配的需求槽位
- 撤离订单（index ≥ 998）：自动从背包选择物品
- 普通订单：自动进入 submit 模式，用算法填充 `selectedIndices` 为最佳候选

**`handleAssignToOrder(orderIdx, reqIdx)` / `handleUnassignFromOrder(orderIdx, reqIdx)`**：
管理 `orderSlotAssignments` 字典。

**`handleOrderSlotClick(orderIdx, reqIdx)`**：
- 根据当前模式分派（toolSelectionMode、trade_in、recycle/submit/evacuation、pendingItem、selectedSlot、默认=取消分配）

**`handleRefreshAllOrders()`**：
为每个订单槽位生成 2 个候选，排入 `orderCandidateQueue` 供顺序选择。

**`handleRefreshSingleOrder(index)`**：
单个订单刷新，生成 2 候选，`time_freeze` 技能 20% 概率不消耗刷新次数。

**`handleSelectOrderCandidate(candidateIndex)`**：
将选中的候选订单放入目标槽位。

#### 提交与回收

**`handleConfirmSubmission()`**：
1. 验证 `satisfiableOrders.length > 0`
2. 对每个可满足的订单计算奖励：
   - `baseScoreReward` × `multiplier`（1 + Σ 物品品质 bonus）
   - `ocd` 技能：同池物品时 multiplier ×2
   - `big_order_expert`：4 需求 +5 金币
   - `hard_order_expert`：含 Epic+ 需求 +10 金币
   - `poverty_relief`：金币 <20 时 +5 金币
   - `auto_restock` / `turn_fortune`：激活 skillState 标记
3. 更新 score、gold
4. 每完成一个订单 → `orderRefreshCount` +1
5. 完成积分订单 → `emergencyDifficulty` 递减（不低于 min）
6. 为完成的普通订单生成候选队列
7. 从背包移除已提交物品
8. 清除相关 `orderSlotAssignments`
9. 退出 submit 模式

**`handleConfirmRecycle()`**：
- 移除选中物品，金币 += Σ recycleValue
- `alchemy` 技能：Rare+ 物品 25% 概率 +5 金币
- 清除相关 `orderSlotAssignments`

#### 撤离流程

**`handleEvacuate()`** → `toggleEvacuationMode()` — 进入撤离模式

**`handleConfirmEvacuation()`**：
- 验证至少1个撤离订单可满足
- 设 `modalContent = { type: 'evacuation_success' }`

**`handleEvacuationContinue()`**：
- 难度 +1
- 生成新撤离订单（新难度）
- 重置金币为 `currentStageConfig.initialGold`
- 移除已提交物品

**`handleEvacuationExtract()`**：
- 设 `modalContent = { type: 'victory' }`（触发胜利结算显示）

#### 工具物品使用

**`handleToolItemUse(index)`** — 右键点击工具触发：
- `enhance_next`：直接激活 `skillState.nextDrawEnhanced = true`，从背包移除工具
- `reforge_left` / `transmute_left`：设 `toolSelectionMode = { toolIndex, effectType }`，等待玩家点击目标

工具效果在 `handleSlotClick` 的 `toolSelectionMode` 分支中实现。

#### 技能选择

**`triggerSkillSelection()`**：
- 过滤可用技能（未拥有、满足积分门槛）
- 随机取 3 个设为 `skillSelectionCandidates`

**`handleSkillSelect(skill)` / `handleSkillReplace(oldId, newSkill)`**：
- 添加/替换 skills 数组中的技能

#### 杂项

**`handleSortInventory()`**：按名称（zh-CN locale）→ poolName → 品质降序排列。

**`addInventoryItem(itemName, rarityId)`**：调试函数，直接添加物品到背包。

**`debugGetOrderItems(orderIndex)`**：调试函数，直接将订单所需物品全部加入背包。

### 6.5 返回值结构

```js
{
  state: {
    // 核心数值
    gold, score, emergencyDifficulty, drawCount, orderRefreshCount, REFRESH_MAX,
    currentStageConfig, maxInventorySize,
    // 集合
    activePools, orders, emergencyOrders, inventory, skills,
    // 交互状态
    pendingItem, pendingQueue, selectedSlot,
    isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
    selectionMode, toolSelectionMode,
    orderSlotAssignments, assignedItemUids, phantomMarks,
    orderCandidates, orderCandidateQueue,
    modalContent, skillSelectionCandidates, toast,
    skillState,
    // 悬停状态（含 setter）
    hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
    setHoveredPoolId, setHoveredItemName, setHoveredSlotIndex, setHoveredPoolItemNames,
    // 衍生数据
    satisfiableOrders, potentialSatisfiableOrders, totalRecycleValue, selectedItemNames,
  },
  actions: {
    showToast, hideToast,
    // 抽卡
    handleDraw, handleSelectionSelect, handleSelectionCancel,
    // 背包
    handleSlotClick, handleDiscardNew, handleSortInventory,
    // 订单
    handleOrderClick, handleRefreshAllOrders, handleRefreshSingleOrder,
    handleSelectOrderCandidate, handleUnassignFromOrder, handleOrderSlotClick,
    // 模式切换
    toggleSubmitMode, toggleRecycleMode, toggleEvacuationMode,
    // 确认操作
    handleConfirmSubmission, handleConfirmRecycle, handleConfirmEvacuation,
    // 撤离
    handleEvacuate, handleEvacuationContinue, handleEvacuationExtract,
    // 工具
    handleToolItemUse, handleCancelToolSelection,
    // 奖池
    refreshPools, handlePoolHover, handlePoolLeave,
    // 技能
    triggerSkillSelection, handleSkillSelect, handleSkillReplace,
    // 模态
    handleCloseModal,
    // 调试
    addInventoryItem, debugGetOrderItems,
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
| `initialStage` | number | 未使用 |
| `selectedSpawnPoolId/ItemName/RarityId` | string | 调试物品生成选择器 |
| `debugAddItemPulse` | number | 脉冲信号触发 GameCore 添加物品 |

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

一个 85vh 可滚动模态框，包含以下配置区：
1. 调试物品生成（选择池/物品/品质，点击添加）
2. 撤离订单配置（难度系统）
3. 撤离订单难度精确需求配置（1-10级折叠面板）
4. 品质概率表（`rarityWeights` + `orderRarityWeights`）
5. 订单数量权重与奖励
6. 杂项参数（刷新费用、初始金币等）
7. 词缀配置（每个词缀的费用和自定义品质权重）
8. 工具物品配置（掉落率、各工具权重、重铸品质分布）
9. 技能启用/禁用
10. 调试技能选择
11. 品质详情（bonus 和 recycleValue）

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
│ HEADER: 标题 | 积分 | 金币 | 撤离难度 | 语言/调试/设置/重置 │
├────────────────────┬────────────────────────────────┤
│  LEFT (45%)        │  RIGHT (flex-1)                │
│                    │                                │
│  ┌──────────────┐  │  ┌─────────────────────────┐   │
│  │ 撤离订单区域 │  │  │ 奖池区域 (3× PoolCard)  │   │
│  │ (2× OrderCard│  │  └─────────────────────────┘   │
│  │  idx 998,999)│  │                                │
│  └──────────────┘  │  ┌─────────────────────────┐   │
│                    │  │ 选择覆盖层               │   │
│  ┌──────────────┐  │  │ (precise/targeted)       │   │
│  │ 普通订单     │  │  └─────────────────────────┘   │
│  │ (3× OrderCard│  │                                │
│  │  idx 0,1,2)  │  │  ┌─────────────────────────┐   │
│  └──────────────┘  │  │ 底部固定区域             │   │
│                    │  │ ├ 技能面板 (可折叠)       │   │
│  ┌──────────────┐  │  │ ├ 品质加成行             │   │
│  │ 候选面板     │  │  │ ├ 背包状态栏             │   │
│  │ (2个选项)    │  │  │ ├ 模式状态标签           │   │
│  └──────────────┘  │  │ ├ 背包网格               │   │
│                    │  │ │  (maxSize× InventorySlot│   │
│                    │  │ ├ 操作按钮 (提交/回收)    │   │
│                    │  │ └ 待定物品面板            │   │
│                    │  └─────────────────────────┘   │
└────────────────────┴────────────────────────────────┘
```

### 组件向子组件传递的计算属性

在渲染 `InventorySlot` 时，GameCore 会为每个格子计算：

| 属性 | 说明 |
|------|------|
| `canSynthesize` | 与当前 selectedSlot/pendingItem 可否合成 |
| `isNeededForOrder` | 是否被某个订单需要（名称匹配） |
| `isMaxSatisfied` | 品质是否已达到/超过最高订单需求 |
| `hasUpgradePair` | 背包中是否存在同名同品质的配对物品 |
| `isOverloadTarget` | specialization 模式下是否为超载替换目标 |
| `isToolTarget` | 工具选择模式下是否为有效目标 |
| `isAssigned` | 是否已分配到某个订单槽位 |

在渲染 `OrderCard` 时，传递 `orderSlotAssignments`、`phantomMarks`、`potentialSatisfy` 等。

### 模态框渲染（`renderModal`）

优先级顺序：
1. `skillSelectionCandidates` 非空 → `SkillSelectionModal`
2. `modalContent.type === 'victory'` → 奖杯 + 最终积分 + 重开按钮
3. `modalContent.type === 'stage_up'` → 阶段提升提示
4. `modalContent.type === 'game_over'` → 游戏结束
5. `modalContent.type === 'evacuation_success'` → 撤离成功（继续/提取按钮）
6. 其他 → 标准物品模态

### Trade-in 覆盖层

当 `selectionMode.type === 'trade_in'` 时，渲染全屏半透明覆盖层 + 浮动取消按钮。

---

## 9. 游戏组件详解

### 9.1 PoolCard.jsx

**Props**: `pool, gold, hasSkill, config, inventory, onDraw, onMouseEnter, onMouseLeave, isHovered, relevantRequirements, disabled`

**逻辑**：
- 计算 `finalCost`：`vip_discount` 技能对 precise/targeted 减 1
- `canAfford = gold >= finalCost`
- `isEffectiveDisabled = disabled || !canAfford`

**布局（3行）**：
1. 池子图标(4xl) + 名称(bold xl) + 价格胶囊（黄色硬币图标，折扣时划线原价）
2. 词缀名称（大号加粗 + ✨ 前缀）
3. 词缀描述

**视觉状态**：
- 悬停：`scale-[1.02]`、`ring-4 ring-white/50`
- 禁用：`opacity-60 grayscale-[0.8]`
- 点击：`active:scale-95`

### 9.2 OrderCard.jsx

**Props**（约 25 个）：完整的订单数据 + 所有交互回调 + UI 状态。

**核心特性**：

**奖励预览 memo（`rewardInfo`）**：
- `minReward`：基础积分（无品质加成）
- `expectedReward`：基于已分配/幻影物品品质计算的预期积分
- 两者不同时显示范围

**需求项双模式渲染**：
- **胶囊模式**（未分配）：小药丸形状，显示品质色点 + 图标 + 名称
- **槽位模式**（已分配）：64×64 卡片，显示物品图标 + 名称，CSS 动画过渡

**槽位视觉状态**：

| 状态             | 样式                     |
| -------------- | ---------------------- |
| 可合成            | 黄色 ring-4              |
| 工具目标           | 青色 ring-4              |
| 回收/trade-in 目标 | 琥珀色 ring-4             |
| 被选中            | 红色 ring-4              |
| 绝育             | "绝育" 暗色 badge          |
| 衰变             | 左上角数字；≤0 时 "损坏" + 红色覆盖 |
| 幻影链接           | 链接图标                   |
| 品质升级           | 升级 badge               |

**刷新按钮**：右侧橙色圆按钮 + 剩余次数 badge。在 submit/evacuation/candidate 模式隐藏。

**可提交指示器**：`isSatisfied` 时绿色 "可提交" badge 带动画。

**被替换动画**：黄色脉冲环 + 弹跳角点。

### 9.3 InventorySlot.jsx

**Props**（约 23 个）：物品数据 + 所有视觉状态标志 + 交互回调。

**内嵌组件 `ToolItemTooltip`**：
- 使用 `createPortal(…, document.body)` 渲染到 body
- `useLayoutEffect` 中基于 anchor `ref.getBoundingClientRect()` 计算绝对定位
- 显示工具名称、描述、"右键点击使用"提示
- 避免溢出/z-index 裁剪

**物品槽视觉状态**：

| 状态 | 样式 |
|------|------|
| 空格 | 虚线灰色边框 |
| 有物品 | 品质色 + 阴影 + 图标(2xl/3xl) + 名称(10px 截断) |
| 工具物品 | 琥珀渐变边框 + 脉冲图标 + "TOOL" badge |
| 被选中（常规） | translate-y-4 上移 + scale |
| 被选中（submit） | 蓝色边框 |
| 被选中（recycle） | 琥珀色边框 |
| 合成目标 | 黄色 ring-4 + scale-105 |
| 超载目标 | 红色覆盖 + 垃圾桶图标 |
| 交换目标 | 蓝色覆盖 + 箭头图标 |
| 已分配到订单 | 30% 不透明 + 灰度 + pointer-events-none |
| 升级配对 | 右上角黄色弹跳 ChevronsUp badge |
| 订单需求提示 | 右下角绿色/灰色对勾 |
| 绝育标记 | 左下角 "绝育" 暗色 badge |
| 衰变计数 | 左上角等宽数字；≤0 时 "损坏" + 红覆盖 |
| 工具悬停 | 底部 "R-Click" 指示器 + portal tooltip |

### 9.4 SkillSelectionModal.jsx

**Props**: `candidates, onSelect, currentSkills, onReplace`

**两种模式**：
- **普通模式**（技能 <3 个）：显示 3 候选，点击直接选中
- **替换模式**（技能 =3 个）：两步操作 — 点击新技能暂存 → 点击旧技能为目标 → 确认

**特殊功能**：
- "按住查看"按钮：`isPeeking` 状态使弹窗背景透明、隐藏内容，方便查看游戏状态
- "放弃新技能"按钮始终可用

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

`EN_TRANSLATIONS` 扁平对象，约 120+ 条目。覆盖：
- UI 通用术语、品质名称、池子/物品名称（全部 20 种）
- 词缀名称和描述
- 13 个技能名称和描述
- Toast/错误消息
- 模态框标题和按钮
- 工具物品、候选订单、撤离流程相关文案

**惯例**：中文是源语言。所有新增 UI 文本必须先用中文硬编码，然后在 `translations.js` 中添加英文翻译，组件中使用 `t()` 包裹。

---

## 12. 关键算法与流程

### 12.1 抽卡完整流程

```
用户点击 PoolCard
  → PoolCard.onDraw(pool)
    → actions.handleDraw(pool)
      ├── 守卫检查（模式冲突）
      ├── 计算 finalCost（VIP折扣）
      ├── 金币不足 → toast + return
      ├── 交互词缀 → setSelectionMode + return
      └── 被动词缀 → 扣金币 → handleNormalDraw(pool)
            ├── drawCount++
            ├── 按词缀生成物品
            │   ├── fragmented → 3× common
            │   └── 其他 → 1× rollRarity(...)
            ├── auto_restock → 额外复制1个
            ├── enhance → 品质+1
            ├── 更新 skillState
            ├── applyEntropy(inventory)
            ├── tryDropToolItem(20%)
            ├── handleIncomingItems(items, decayed)
            │   ├── negotiator check (Epic+ → refresh+1)
            │   ├── specialization check
            │   ├── 有空位 → 放入
            │   └── 无空位 → pendingItem/pendingQueue
            └── refreshPools(true) → generateActivePools()
```

### 12.2 订单满足算法

`satisfiableOrders` 计算（在 `useMemo` 中）：

```
输入: selectedIndices（选中的背包格子）, inventory, orders+emergencyOrders
输出: { orderIndex, matchedItems[], isScoreOrder }[]

对每个订单:
  1. 收集该订单所有需求: [{ name, minRarityBonus }]
  2. 收集可用物品: selectedIndices 中名称匹配 + 品质 >= 需求的物品
  3. 使用贪心匹配（每个物品只能用一次）
  4. 若所有需求满足 → 加入结果
```

### 12.3 幻影标记算法

`phantomMarks` 计算：

```
对每个订单的每个已分配需求:
  找到对应的背包物品
  检查该物品是否也能满足其他订单的某个需求
  如果能 → 标记为幻影（显示链接图标）
```

### 12.4 积分计算公式

```
baseScoreReward = max(1, floor(Σ req.rarityScoreWeight + progressOffset))
multiplier = 1 + Σ submittedItem.rarity.bonus
if (ocd && 全部同池) multiplier *= 2
finalScore = ceil(baseScoreReward × multiplier)
```

---

## 13. 状态交互矩阵

此矩阵显示不同模式下各种交互的行为：

| 操作\模式 | 默认       | submit | recycle | evacuation | pendingItem | selectedSlot | selectionMode | toolSelection |
| ----- | -------- | ------ | ------- | ---------- | ----------- | ------------ | ------------- | ------------- |
| 点击空格  | 无        | 无      | 无       | 无          | 放入物品        | 移动到空格        | 无             | 无             |
| 点击物品  | 选中       | 切换选择   | 切换选择    | 切换选择       | 合成/替换       | 合成/交换        | trade_in消耗    | 应用工具效果        |
| 点击奖池  | 抽卡       | 阻止     | 阻止      | 阻止         | 阻止          | 抽卡           | 阻止            | 阻止            |
| 点击订单  | 自动选物     | 无      | 无       | 无          | 无           | 分配到槽位        | 无             | 无             |
| 点击订单槽 | 取消分配     | 切换选择   | 切换选择    | 切换选择       | 合成/替换       | 合成           | trade_in      | 应用工具          |
| 右键物品  | 无（工具→使用） | 无      | 无       | 无          | 无           | 无            | 无             | 无             |
| 确认按钮  | —        | 提交     | 回收      | 撤离确认       | —           | —            | —             | —             |

**互斥规则**：进入任何模式会清除其他模式。`pendingItem` 阻止抽卡和模式切换。

---

## 14. 已知设计债务与休眠系统

### 休眠系统

1. **阶段系统**：4 个阶段完整定义在 `INITIAL_STAGE_CONFIG`，但 `useGameLogic` 硬编码 `config.stages[0]`，无阶段切换触发器。
2. **技能获取流程**：`triggerSkillSelection()` 存在但无自动触发点。技能只能通过调试工具或未来代码手动触发。
3. **积分进度**：`targetProgress: null`，进度系统框架存在但无具体目标。

### 代码规模

- `useGameLogic.js` 约 2200 行，是单一巨型 hook，无子 hook 拆分。
- `App.jsx` 和 `GameCore.jsx` 各自约 1000+ 行，设置 UI 内联在 App 中。

---

## 15. 修改指南

### 修改游戏数值

编辑 `src/data/constants.js` 中的对应配置。所有数值集中在此文件。

### 添加新词缀

1. 在 `constants.js` 的 `INITIAL_AFFIXES_CONFIG` 数组中添加新词缀对象
2. 在 `helpers.js` 的 `rollRarity` 中添加品质约束逻辑（如果需要）
3. 在 `useGameLogic.js` 的 `handleDraw`/`handleNormalDraw` 中添加行为分支
4. 在 `translations.js` 中添加英文翻译

### 添加新技能

1. 在 `constants.js` 的 `SKILL_DEFINITIONS` 添加技能定义
2. 在 `useGameLogic.js` 中使用 `hasSkill('skill_id')` 在对应事件点添加条件逻辑
3. 如需状态追踪，在 `skillState` 中添加字段
4. 在 `translations.js` 中添加翻译

### 添加新工具物品

1. 在 `constants.js` 的 `TOOL_ITEMS` 添加定义
2. 在 `useGameLogic.js` 的 `handleToolItemUse` 添加激活逻辑
3. 如果是选择型（非直接激活），在 `handleSlotClick` 的 `toolSelectionMode` 分支添加效果
4. 在 `InventorySlot.jsx` 中确保工具外观正确

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
1. 在合适时机（如完成订单后、积分达标时）调用 `actions.triggerSkillSelection()`
2. `SkillSelectionModal` 的 UI 已完整实现，无需额外 UI 工作

### i18n 注意事项

- 中文是源语言，直接硬编码在 JSX 中
- 英文翻译在 `translations.js` 的扁平映射中
- 修改任何 UI 文本后须在 zh 和 en 下测试，确保无溢出和换行问题

---

*文档版本：基于 `code_simplify` 分支 commit `4c22ee4` 全量源码分析生成*
*最后更新：2026-03-05*
