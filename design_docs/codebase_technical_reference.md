# 幸运之墙 Wall of Fortune — 代码技术参考

面向需要在此 repo 工作的开发者 / AI agent。读完后能正确定位修改点。

> **最后更新**：2026-04-21 · `core-draw/ingredient-trade-flex-io` 分支
> 玩法规则见 `game_rules.md`，进度状态见 `gameplay_progress.md`，设定见 `setting-current-state.md`。

---

## 目录

1. [技术栈与构建](#1-技术栈与构建)
2. [目录结构](#2-目录结构)
3. [数据流](#3-数据流)
4. [数据层](#4-数据层)
5. [`runtimeConfig.js` 与配置面板](#5-runtimeconfigjs-与配置面板)
6. [核心 Hook `useGameLogic.js`](#6-核心-hook-usegamelogicjs)
7. [GameCore.jsx 与组件](#7-gamecorejsx-与组件)
8. [关键算法](#8-关键算法)
9. [i18n](#9-i18n)
10. [冷冻 / 辅助系统](#10-冷冻--辅助系统)
11. [修改指南](#11-修改指南)

---

## 1. 技术栈与构建

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI |
| Vite | 6.x | 构建 + HMR |
| Tailwind CSS | 3.x | 样式（`kitchen-*` 自定色） |
| Lucide React | 0.469 | 图标 |
| react-router-dom | 7.x | `/` / `/editor` / `/levels` 路由 |

部署路径：`base: '/3pools_Web/'`（GitHub Pages）。

```bash
npm run dev     # http://localhost:5173/3pools_Web/
npm run build   # → dist/
npm run preview
npm run lint    # ESLint 9 配置当前缺失，需要迁移才能跑
```

无测试套件；冒烟主要靠 Vite build + 手动浏览器验收。

---

## 2. 目录结构

```
1.2Antigravity_attempt/
├── assets/                          ← 美术资源
│   └── chef_backhome.png
├── src/
│   ├── main.jsx                     React 入口
│   ├── App.jsx                      路由：Prologue ↔ GameCore / LevelEditor / LevelManager
│   ├── GameCore.jsx                 ★ 主游戏布局 + 模态调度
│   ├── index.css                    Tailwind + 自定义 @keyframes
│   │
│   ├── data/
│   │   ├── v2Config.js              ★ 活跃数据：食材/品质/市场/菜品/订单/MIN_QUALITY
│   │   ├── runtimeConfig.js         ★ LIVE_CONFIG 可变镜像 + subscribe 机制
│   │   ├── matrixConfig.js          ★ 4×4 网格尺寸 + 特殊格 icon/name + 人像池
│   │   ├── constants.js             ◯ 半活跃：INITIAL_GAME_CONFIG / TURN_CONFIG / v1 冷冻数据
│   │   └── levelTemplates.js        LevelEditor 模板枚举
│   │
│   ├── hooks/
│   │   └── useGameLogic.js          ★ 全局状态 + actions（~2200 行）
│   │
│   ├── utils/
│   │   ├── matrixHelpers.js         ★ 墙生成、形状填充
│   │   ├── helpers.js               v1 遗留（旧 generateOrder 等，活跃使用者少）
│   │   ├── templateGenerator.js     LevelEditor 辅助
│   │   └── translations.js          中英映射
│   │
│   ├── contexts/
│   │   └── LanguageContext.jsx      i18n Provider
│   │
│   └── components/
│       ├── ErrorBoundary.jsx
│       ├── ui/
│       │   ├── Tooltip.jsx          portal-based 跟随鼠标
│       │   ├── Toast.jsx            顶部浮入 2s
│       │   ├── ConfirmDialog.jsx
│       │   ├── GameGuide.jsx
│       │   └── RoundTransition.jsx  菜品揭晓浮层
│       ├── game/
│       │   ├── Prologue.jsx              入场选角色
│       │   ├── ResourceMatrix.jsx        4×4 墙渲染 + 行/列抽取
│       │   ├── WallPicker.jsx            3 市场候选卡 + onHoverIngredientIds 报告
│       │   ├── BulletinBoard.jsx         交换区 + hoveredTag2 突显
│       │   ├── OrderCard.jsx             订单卡（历史遗留；BulletinBoard 直渲）
│       │   ├── OrderSubmitModal.jsx      订单提交浮层（穿透式）
│       │   ├── ConfigPanel.jsx           ★ 配置面板
│       │   ├── InventorySlot.jsx         菜篮格子
│       │   ├── DishCard.jsx              菜品卡片（右侧 + setup 揭晓）
│       │   ├── Kitchen.jsx               做菜结算 + Dispatch 接口
│       │   ├── DispatchJudgment.jsx      五维评分工具（独立 modal）
│       │   ├── AICooking.jsx             AI 菜品组合测试
│       │   ├── SpritePreview.jsx         动画预览
│       │   ├── ScoreBoard.jsx / ActiveOrders.jsx / ActionCards.jsx / ShapeSelector.jsx /
│       │   │   ActiveShapeDisplay.jsx / PoolCard.jsx / SkillSelectionModal.jsx
│       │   │                             —— 历史遗留，当前玩法不走
│       └── editor/                   LevelEditor 相关（4 文件，/editor 路由消费）
│
├── design_docs/
│   ├── game_rules.md                 当前规则
│   ├── gameplay_progress.md          进度总览
│   ├── codebase_technical_reference.md  ← 本文
│   ├── setting-current-state.md
│   ├── setting-evolution-log.md
│   └── reference/                    会话与分析归档
│
└── .claude/
    ├── CLAUDE.md                     协作指令
    └── lessons/                      经验沉淀
```

---

## 3. 数据流

```
v2Config.js + matrixConfig.js (静态 const)
   │
   ▼
runtimeConfig.js :: LIVE_CONFIG (可变镜像，深拷贝自静态数据)
   │   subscribe / bumpConfig / resetConfig / importConfigJSON
   ▼
matrixHelpers.js  (generateWall 读 LIVE_CONFIG)
utils 层         (pickWeightedTemplate / rollQuality 等纯函数)
   │
   ▼
useGameLogic.js  (全部 React state + actions；调 utils)
   │
   ▼
GameCore.jsx  (布局 + 模态调度；维护 UI-local state 如 hoveredIngredientIds / swapFromIdx)
   │
   ▼
组件层 (ResourceMatrix / BulletinBoard / WallPicker / Kitchen / ConfigPanel / OrderSubmitModal / ...)
```

### 核心原则

1. **单向数据流**：`LIVE_CONFIG` → hook → GameCore → 子组件
2. **单一状态源**：所有游戏 state 在 `useGameLogic`；组件不持有游戏逻辑
3. **配置实时**：改数值 → 改 `LIVE_CONFIG` → 下一次消费者调用立即生效；**不需要重启 dev server**
4. **配置面板**：`ConfigPanel.jsx` 直接修改 `LIVE_CONFIG` 并 `bumpConfig()` 通知订阅者
5. **i18n**：中文是源；UI 文本用 `t()`；英文进 `translations.js`

---

## 4. 数据层

### 4.1 `v2Config.js`

| 导出 | 内容 |
|------|------|
| `INGREDIENTS` | 80 个基础食材（`id / icon / name / nameEn / shortLabel / shortLabelEn / tags:[大类, 小类]`）。品质**不预设**，在抽取时 roll |
| `QUALITY_CONFIG` | 5 档：普通/精选/优质/顶级/传说；每档有 `stars` 和 `scoreValue`（1/2/3/5/8） |
| `QUALITY_WEIGHTS` | 默认 roll 权重 `{1:0.40, 2:0.30, 3:0.18, 4:0.08, 5:0.04}` |
| `MIN_QUALITY_CONFIG` | `countRange:[2,4]`，`weights:{2:0.70,3:0.25,4:0.05}` —— 每墙标记 2-4 个品类有保底品质 |
| `MARKET_TYPES` | 5 家店，每家指向一个大类 |
| `DISHES` | 2 道手作菜（ocean_threads / ember_hearth） |
| `ORDER_TEMPLATES` | 4 模板（easy/medium/hard/extreme），hard/extreme 有 `qualityDist`，easy/medium 用 `reqBudget` |
| `ORDER_CONFIG` | `bulletinCapacity: 4` / `maxActive: 3` / `newPerTurn: 1` / `initialCount: 4` |

### 4.2 `matrixConfig.js`

| 导出 | 内容 |
|------|------|
| `MATRIX_CONFIG` | `gridSize: 4` + `doomCells` / `specialCells` 的 icon/name（**概率从 LIVE_CONFIG 读**） |
| `DOOM_EMOJI_POOL` | 11 个非职业人像 emoji（🧑 👨 👩 🧒 👦 👧 👶 🧓 👴 👵 🧔） |
| `pickDoomEmoji()` | 从池里随机抽一个 |

### 4.3 `constants.js`

| 活跃 | 冷冻 |
|------|------|
| `INITIAL_GAME_CONFIG`（`inventorySize:10`, `stages`, `order: ORDER_CONFIG`, `turn: TURN_CONFIG`, ...） | `INITIAL_POOLS_DATA`（5 奖池），`INITIAL_STAGE_CONFIG`（4 阶段），`SKILL_DEFINITIONS`（13 技能），`INITIAL_AFFIXES_CONFIG`（7 词缀），`TOOL_ITEMS`（工具），`INITIAL_RARITY_CONFIG`（6 级品质） |
| `TURN_CONFIG`（`goldPerTurn:3` = 每次进市场 3 抽；`drawCost:1`） | `DOOM_CONFIG` 的初始参数（仍活跃：gridSize/initialHP/initialDangerCount/dangerPerTurn/initialDoomLevel）|
| `EXPEDITION_CONFIG`（expeditionCount:3, scoreToWin:30） | `EMERGENCY_ORDER_CONFIG` 等 v1 残留 |

---

## 5. `runtimeConfig.js` 与配置面板

### 5.1 `LIVE_CONFIG` 对象

```js
export const LIVE_CONFIG = {
    qualityWeights:  { ...QUALITY_WEIGHTS },                  // 1-5 档品质 roll 权重
    orderTemplates:  deepClone(ORDER_TEMPLATES),              // 订单模板（weight / rewardQuality / ingredientTypes / qualityDist 或 reqBudget）
    cellSpawn:       { doom, gold, order, bomb },             // 墙面特殊格概率
    shapeWeights:    { 1:60, 2:30, 3:10 },                    // polyomino 1/2/3 格权重
    minQuality:      deepClone(MIN_QUALITY_CONFIG),           // { countRange, weights } 保底品质规则
};
```

深拷贝自 v2Config / matrixConfig，初始值在 `DEFAULTS` 常量里冻结。

### 5.2 消费者

| 消费点 | 读取字段 |
|--------|---------|
| `useGameLogic.rollQuality` | `LIVE_CONFIG.qualityWeights` |
| `useGameLogic.pickWeightedTemplate` | `LIVE_CONFIG.orderTemplates` |
| `matrixHelpers.generateWall` Phase 1+2 | `LIVE_CONFIG.cellSpawn` |
| `matrixHelpers.generateWall` Phase 3 | `LIVE_CONFIG.shapeWeights` |
| `matrixHelpers.generateWall` 末尾 MIN_QUALITY 标记 | `LIVE_CONFIG.minQuality` |

### 5.3 通知机制

```js
subscribeConfig(fn)     // 注册 listener
getConfigVersion()      // 当前版本号
bumpConfig()            // 版本号 +1 并通知所有 listener
resetConfig()           // 深拷贝 DEFAULTS 覆盖，bump
exportConfigJSON()      // JSON.stringify(LIVE_CONFIG)
importConfigJSON(json)  // 解析覆盖，bump
```

`ConfigPanel.jsx` 用 `useSyncExternalStore(subscribeConfig, getConfigVersion)` 自动重渲。

### 5.4 面板 UI（`src/components/game/ConfigPanel.jsx`）

GameCore header 的 **⚙ 按钮**打开 modal，3 个分区：
- **A. 品质 roll 概率**：5 档 weight + 合计显示
- **B. 墙面符号 + 形状权重**：4 种特殊格 spawnChance + 1/2/3 格权重 + MIN_QUALITY（countRange + Q2/Q3/Q4 weights）
- **C. 订单模板**：4 条，每条 weight / rewardQuality / ingredientTypes / qualityDist 或 reqBudget

底部：重置默认 / 导出 JSON / 导入 JSON。不持久化。

---

## 6. 核心 Hook `useGameLogic.js`

**位置**：`src/hooks/useGameLogic.js`（~2200 行）
**签名**：`useGameLogic(INITIAL_GAME_CONFIG)` 返回扁平对象

### 6.1 主要 state

#### Day / 大局
| 字段 | 说明 |
|------|------|
| `dayNumber` | 当前天 |
| `expeditionScores` / `totalScore` | 累积得分 |
| `popularity` | 人气值（未定型）|
| `lastCookResult` | 上次做菜结果 |
| `phase` | 状态机：`pre_game` / `setup` / `wall_choice` / `wall_reveal` / `drawing` / `drawing_sub` / `exiting_sub` / `between_turns` / `restaurant` / `cook_result` / `game_over` |

#### 回合
| 字段 | 说明 |
|------|------|
| `turnNumber` | 天内回合数 |
| `gold` | 当前剩余抽数 |
| `currentWallType` / `currentLevel` | 当前墙 modifier 信息（市场信息）|
| `matrix` | 4×4 墙 |
| `lastDrawResult` / `lastDrawDirection` | 抽取结果 / 行列方向 |
| `drawAnimState` | 抽取扫描动画状态机 |
| `wallCandidates` / `pendingWallCandidate` | 3 选 1 状态 |

#### 人群 / 耐久
| 字段 | 说明 |
|------|------|
| `hp` | 0-5 耐久度 |
| `doomGrid` | 10 格数组，每格 `{type: 'danger'/'empty', emoji?}` |
| `doomLevel` / `dangerCount` | level / danger 计数 |
| `doomAnimState` | 结算动画状态 |
| `isDoomResolving` | 锁 |

#### 菜篮
| 字段 | 说明 |
|------|------|
| `inventory` | 菜篮数组 |
| `maxInventorySize` | 10（from INITIAL_GAME_CONFIG.inventorySize） |
| `pendingItem` / `pendingItems` | 菜篮满的 pending 队列 |
| `fridge` | 占位，基本不用 |
| `flyingItem` | 飞入动画临时态 |

#### 订单
| 字段 | 说明 |
|------|------|
| `bulletinBoard` | 交换区订单数组（max 4）|
| `incomingQueue` | FIFO，每项 `{id, candidates:[orderA, orderB]}` |
| `pendingChosenOrder` | 交换区满时玩家已选但未替换的订单 |
| `refreshCharges` | 手动刷新次数 |
| `submittingOrderId` | 提交 modal 状态 |

### 6.2 核心 actions

| 函数 | 用途 |
|------|------|
| `startGame()` | 开新局 / 天 |
| `selectWall(idx)` / `confirmWallReveal()` | 选店 / 揭晓 |
| `selectRow(i)` / `selectColumn(i)` | 抽取 |
| `endTurn()` / `continueToNextTurn()` | 收回合 → between_turns |
| `handleEvacuate()` / `returnToRestaurant()` | 撤离 / 去厨房 |
| `tickDoomResolution()` / `completeDoomResolution()` | 人群结算动画 |
| `tickDrawAnim()` / `completeDrawAnim()` | 抽取动画 |
| `confirmIncomingOrder(order)` / `discardIncomingOrder()` / `replaceBulletinOrder(id)` | 订单 2 选 1 流程 |
| `submitOrder(id)` / `confirmSubmitOrder(id, consumeUids, rewardChoices)` / `cancelSubmitOrder()` | 提交订单 |
| `triggerRefresh()` | 手动刷订单 |
| `replaceInventoryItem(i)` / `discardInventoryItem(i)` / `swapInventoryItems(i, j)` / `synthesizeItems(i, j)` / `synthesizeWithPending(i)` | 菜篮操作 |
| `discardPendingItem()` | 丢弃菜篮 pending 头部 |
| `enterSubLevel() / exitSubLevel()` | 子关卡（历史机制） |
| `handleReset()` / `startNextExpedition()` / `startNextDay()` | 重置 / 进下一场 |
| `handleCookResult()` | 厨房结算回 |
| `debugAddItem(itemDef, count)` | 调试面板用 |

### 6.3 内部辅助

- `pickWeightedTemplate()` → 选订单模板
- `rollQuality()` → 品质掷骰
- `assignQualitiesFromBudget(budget, slotCount)` → reqBudget → 每槽品质
- `pickMarketType()` → 市场抽取
- `TAG2_INDEX` / `TAG2_ENTRIES` → 二级 tag 索引
- `generateOrder()` → 完整订单（qualityDist 优先于 reqBudget）
- `countBuffFieldCoverage()` → 膨化格邻接计数（legacy）

---

## 7. GameCore.jsx 与组件

### 7.1 GameCore 职责

- 调用 `useGameLogic(INITIAL_GAME_CONFIG)` 拿全部 state
- 顶部 header：标题、语言切换、重置、派遣 / 厨房 / 动画 / 🛠 debug / **⚙ ConfigPanel** / 📐 editor
- 中央按 `phase` 切内容（pre_game / setup / wall_choice / drawing / between_turns / restaurant / cook_result）
- 左侧 sidebar：`BulletinBoard`（交换区 + 订单 + pending picker）
- 右侧 sidebar：`DishCard` + 人群面板 + 菜篮
- UI-local state：`hoveredIngredientIds` / `swapFromIdx` / 各 modal 开关 / `itemScoreValue()` helper

### 7.2 组件速览

| 组件 | 职责 |
|------|------|
| `WallPicker` | 3 市场候选；`onHoverIngredientIds` 上报→ BulletinBoard 突显 |
| `ResourceMatrix` | 4×4 墙渲染 + 行/列按钮 + 抽取动画 + MIN_QUALITY 角标 + modifier overlay（center_rotate/mirror/conveyor 还在代码里但当前墙类型为 market，不会触发） |
| `BulletinBoard` | 交换区容器，显示 N/4 + 订单卡 + 可提交状态 + **hoveredTag2 + 金色呼吸光晕突显** |
| `OrderSubmitModal` | 穿透式 modal（`pointer-events-none` wrapper），消耗 + 奖励两段式 |
| `ConfigPanel` | **核心调试**：实时改数值 + 导入导出 JSON |
| `Kitchen` | 做菜结算入口 + 独立 modal 两用 |
| `DispatchJudgment` | 五维评分工具（未接线） |
| `DishCard` | 菜品卡片 |
| `Prologue` | 入场角色选择 |
| `InventorySlot` | 菜篮格子 |

UI 工具（`components/ui/`）：Tooltip / Toast / ConfirmDialog / GameGuide / RoundTransition。

---

## 8. 关键算法

### 8.1 `generateWall(marketIngredients)` 流程

1. **Phase 1+2**：对每个空格按 `LIVE_CONFIG.cellSpawn` 累积概率 roll。顺序：doom → gold → order → bomb → 留空（食材）
2. **Phase 3**：剩余空格按 `LIVE_CONFIG.shapeWeights` roll 形状大小；按 `SHAPE_GEOMETRY[size]` 选几个变体之一；尝试放置，放不下缩小；同形状共享 `groupId` + 同食材
3. **MIN_QUALITY 标记**：收集所有 groupId 对应的 item，洗牌取 2-4 个，每个赋 `item.minQuality = rollMinQualityLevel()`（Q2/Q3/Q4）
4. 返回 `{ grid, doomCellCount }`

### 8.2 `rollQuality()`（`useGameLogic`）

```
entries = Object.entries(LIVE_CONFIG.qualityWeights)
total = sum(weights)
累积 roll → 返回品质 id 1-5
```

抽取食材时：
```
quality = rollQuality()
if (cell.item.minQuality && quality < cell.item.minQuality)
    quality = cell.item.minQuality  // clamp 到底
find INGREDIENTS[id=`${baseId}_${quality}-like`]  // 或直接走 scoreValue lookup
```

（注：因为 `INGREDIENTS` 现在是 80 基础不带品质，落点到食材后的"找具体食材"其实是**直接用 baseId + 品质信息附着到 item**，而不是从 INGREDIENTS 表里查 id）

### 8.3 `generateOrder()`（`useGameLogic`）

1. `pickWeightedTemplate()` 按 weight 选一模板
2. 洗牌 `TAG2_ENTRIES`，取前 `ingredientTypes` 个作为需求
3. 奖励 tag2：排除所有需求 tag2 后随机选
4. 品质分配：
   - 若 `template.qualityDist` 存在 → 洗牌该数组
   - 否则 → `assignQualitiesFromBudget(reqBudget, slotCount)` ±25%
5. 构造 `requirements[]`（每个 `count: 1`）+ `rewards[0]`

### 8.4 人群结算（`resolveDoom` / `tickDoomResolution`）

1. 按 `doomLevel` 次，每次在 doomGrid（长度 10）里均匀随机落点
2. 命中 danger → hpLoss++
3. 动画阶段：`spinningPositions` 每 tick 重 roll → 最后 settle 到 `finalSelections`
4. `finalSelections.emoji = doomGrid[cellIndex].emoji`（从 danger 格生成时 roll 的人像）
5. `completeDoomResolution` → 扣 HP / reset 动画

### 8.5 `scoreDish(dish, effectiveSlots, placements)`（`Kitchen.jsx`）

1. 每槽：
   - `score = ingredient.rarity × multiplier`（rarity 实际是 scoreValue：1/2/3/5/8）
   - multiplier 从 `getSlotMatch` 取最高匹配 rule，未命中走 defaultMultiplier
2. `crossBonus` 处理（当前只有"炉火慢歌"的炖料走这条）
3. total = sum + crossBonus
4. 映射 `baseline × [2.5/1.8/1.0/0.5]` → 翻车/勉强/合格/优秀/惊艳

### 8.6 Hover 突显（BulletinBoard）

1. `hoveredIngredientIds: Set<string>` 从 GameCore 传入
2. `useMemo` 映射 → `hoveredTag2Set: Set<string>`（通过 `INGREDIENT_TAG2` map）
3. 每个需求卡 `const isHovered = hoveredTag2Set?.has(req.tag2)`
4. Hover 样式：外层 `scale-110 z-10` + 内层 `animate-[req-highlight-pulse_1.4s_ease-in-out_infinite]`（index.css 的 @keyframes）

---

## 9. i18n

- **Provider**：`LanguageContext.jsx`，持久化到 `localStorage('game_language')`
- **`t(text)`**：中文 → 返回；英文 → 查 `EN_TRANSLATIONS`，未命中 fallback 中文
- **覆盖情况**：UI chrome 全覆盖；80 食材中文名 + `nameEn` 字段在 `INGREDIENTS` 里直存，UI 里根据 `language === 'en'` 择名（不走 t() 通道）
- **残留**：`translations.js` 里有大量 v1 条目（奖池/技能/词缀/6 级品质）—— 未清理但无害

---

## 10. 冷冻 / 辅助系统

### `constants.js` 冷冻段

| 系统 | 状态 |
|------|------|
| `INITIAL_STAGE_CONFIG`（4 阶段） | 冷冻 |
| `SKILL_DEFINITIONS`（13 技能） | 冷冻 |
| `INITIAL_AFFIXES_CONFIG`（7 词缀） | 冷冻；未来可能作为"模式切换"复用 |
| `TOOL_ITEMS` + `TOOL_ITEM_CONFIG` | 冷冻 |
| `INITIAL_POOLS_DATA`（5 奖池） | 已被 INGREDIENTS 替代 |
| `INITIAL_RARITY_CONFIG`（6 级品质） | 被 5 档品质替代 |
| `EMERGENCY_ORDER_CONFIG` | 冷冻 |

### LevelEditor（`/editor` 路由）

`components/editor/` 下的 `LevelEditor.jsx` / `LevelManager.jsx` / `GridPainter.jsx` / `CellPalette.jsx` / `TemplatePreview.jsx` 仍然可访问。**当前主玩法不消费 level 数据**（`wallCandidates` 全部是 market 类型），但编辑器可用于设计 sub-level 或将来的手作关卡。

### 历史墙 modifier 余响

`useGameLogic.completeDrawAnim` 里仍然有 `mirror` / `center_rotate` / `conveyor` / `blessing_heal` 等分支代码。当前 market 类型的 `currentWallType` 不触发这些，但逻辑留着便于未来重启。

---

## 11. 修改指南

### 改平衡数值（局内实时）

**走 ConfigPanel（⚙）** —— 不改代码：
- 品质 roll 概率（5 档 weight）
- 墙面 4 类特殊格 spawnChance + 形状 1/2/3 格权重
- 订单 4 模板（weight / rewardQuality / ingredientTypes / qualityDist / reqBudget）
- MIN_QUALITY 的 countRange + Q2/Q3/Q4 权重

### 改平衡数值（固化到代码）

- 食材列表 / 分类 / shortLabel：`v2Config.js::INGREDIENTS`
- 品质 scoreValue 或新增一档：`v2Config.js::QUALITY_CONFIG` + 相应 UI（`BulletinBoard.jsx::QUALITY_STYLE` + `OrderSubmitModal.jsx::QUALITY_STARS`）
- 菜品：`v2Config.js::DISHES`（rules / defaultMultiplier / crossBonus / trigger）
- 菜篮容量：`INITIAL_GAME_CONFIG.inventorySize`（`constants.js`）
- 每市场抽数：`TURN_CONFIG.goldPerTurn`（`constants.js`）
- 市场列表：`v2Config.js::MARKET_TYPES`
- 人群池：`matrixConfig.js::DOOM_EMOJI_POOL`

### 加新菜品

1. `v2Config.js::DISHES` push：
```js
{
    id, name, nameEn, icon,
    baseline: 10,
    slots: [
        {
            name: '主料', required: true,
            rules: [
                { match: { tag: '肉类' }, multiplier: 0.5 },
                { match: { tag: '牛' }, multiplier: 1 },
                { match: { id: 'beef_brisket' }, multiplier: 2 },
            ],
            defaultMultiplier: 0,  // 0 = 必须同大类
        },
        ...
        { name: '配料', required: false, rules: [], defaultMultiplier: 1 },
    ],
}
```
2. 翻译：`translations.js` 加英文 + 特殊字符串

### 改市场（大类）数量

1. `MARKET_TYPES` 加条目（指向 INGREDIENTS 里存在的大类）
2. `INGREDIENTS` 填充对应大类下的小类 × 品类
3. `pickMarketType()` 自动适应 weight 总和

### 新增配置面板项

1. `runtimeConfig.js::LIVE_CONFIG` 加字段（深拷贝默认值）
2. 消费点改读 `LIVE_CONFIG.X`（不要直接 import 静态数据）
3. `ConfigPanel.jsx` 加 Section 渲染 + `onChange` 调 `bumpConfig()` 即可

### 加 sprite 动画 / debug modal

参考现有 `SpritePreview.jsx` 模板：
- 全屏 `fixed inset-0 z-[100] bg-black/70`
- 点击背景关闭；接 `onClose` prop
- GameCore header 加 useState + 按钮触发

### 改 i18n

- 新文本 → JSX 里 `t('中文')`，在 `translations.js::EN_TRANSLATIONS` 加 `'中文': 'English'`
- 改现有文本 → 改 JSX 源字符串 + 加对应新 entry
- 测试：切换语言看两种下都 OK

---

*文档版本：2026-04-21 core-draw/ingredient-trade-flex-io 分支*
