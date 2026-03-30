# 电视节目事件原型 — 实现规格

## 概述

将现有订单系统替换为事件驱动的需求系统。矩阵抽取机制不变，改变的是：物品池内容、左侧面板（订单→事件）、金币逻辑（每天刷新）、天的结构。

## 每天流程

```
Day N 开始
  → 金币刷新为 20
  → 计算当天活跃事件（固定 + 随机roll + 条件触发 + carry-over）
  → 矩阵物品池 = 当天所有活跃事件所需物品的并集
  → 玩家自由抽取（金币=0时不能再抽）
  → 玩家随时可向事件提交物品（同当前订单提交逻辑，但不检查品质）
  → 玩家点击"结束今天"
  → 当天deadline的未完成事件判定为失败，触发onFail效果
  → 跨天事件保留
  → Day N+1 开始（或 Day 3结束后显示总结）
```

**没有 game over。** 金币=0只意味着当天不能再抽。3天结束后显示事件完成/失败总结。

## 物品定义（20种）

替换现有的 `INITIAL_POOLS_DATA`（5池×4物品）。新物品无池归属，是扁平列表。

```javascript
export const EVENT_ITEMS = [
  { itemId: 'rice',        name: '米',     icon: '🍚' },
  { itemId: 'bread',       name: '面包',   icon: '🍞' },
  { itemId: 'water',       name: '水',     icon: '💧' },
  { itemId: 'canned_food', name: '罐头',   icon: '🥫' },
  { itemId: 'medicine',    name: '药片',   icon: '💊' },
  { itemId: 'bandage',     name: '绷带',   icon: '🩹' },
  { itemId: 'scarf',       name: '围巾',   icon: '🧣' },
  { itemId: 'coat',        name: '外套',   icon: '🧥' },
  { itemId: 'candle',      name: '蜡烛',   icon: '🕯️' },
  { itemId: 'flashlight',  name: '手电筒', icon: '🔦' },
  { itemId: 'battery',     name: '电池',   icon: '🔋' },
  { itemId: 'blanket',     name: '毯子',   icon: '🛏️' },
  { itemId: 'wrench',      name: '扳手',   icon: '🔧' },
  { itemId: 'tape',        name: '胶带',   icon: '📎' },
  { itemId: 'wood',        name: '木板',   icon: '🪵' },
  { itemId: 'pen',         name: '纸笔',   icon: '📝' },
  { itemId: 'phone',       name: '手机',   icon: '📱' },
  { itemId: 'envelope',    name: '信封',   icon: '✉️' },
  { itemId: 'soap',        name: '肥皂',   icon: '🧼' },
  { itemId: 'book',        name: '书',     icon: '📖' },
];
```

物品保留品质系统（Common-Mythic）。品质在矩阵上可见，影响合成和回收。**事件匹配只看物品名称，忽略品质。**

## 事件定义（13个）

```javascript
export const EVENT_DEFINITIONS = [
  // ===== DAY 1 =====
  {
    id: 'E1',
    name: '断粮',
    description: '家里好几天没正经吃东西了。',
    type: 'fixed',       // 'fixed' | 'random' | 'conditional'
    day: 1,
    deadline: 1,
    requirements: ['rice', 'water', 'canned_food'],
    onSuccess: {},
    onFail: { triggers: ['E5'] },
  },
  {
    id: 'E2',
    name: '旧伤复发',
    description: '旧伤又开始疼了。不管会越来越严重。',
    type: 'fixed',
    day: 1,
    deadline: 2,         // 跨天：Day 1出现，Day 2截止
    requirements: ['medicine', 'bandage', 'soap'],
    onSuccess: {},
    onFail: { triggers: ['E10'] },
  },
  {
    id: 'E3a',
    name: '停电通知',
    description: '明天区域检修，可能停电一整天。',
    type: 'random',
    randomChance: 0.6,
    excludes: ['E3b'],   // 与E3b互斥
    day: 1,
    deadline: 1,
    requirements: ['candle', 'flashlight', 'battery'],
    onSuccess: {},
    onFail: { setState: { powerOut: true } },
  },
  {
    id: 'E3b',
    name: '水管漏水',
    description: '厨房水管开始渗水。不修的话迟早出事。',
    type: 'random',
    randomChance: 0.4,
    excludes: ['E3a'],   // 与E3a互斥
    day: 1,
    deadline: 2,         // 跨天
    requirements: ['wrench', 'tape', 'wood'],
    onSuccess: {},
    onFail: { triggers: ['E9'] },
  },

  // ===== DAY 2 =====
  {
    id: 'E4',
    name: '降温预警',
    description: '天气预报：明天最低零下十度。',
    type: 'fixed',
    day: 2,
    deadline: 2,
    requirements: ['coat', 'blanket', 'scarf'],
    onSuccess: {},
    onFail: { triggers: ['E11'] },
  },
  {
    id: 'E5',
    name: '饥饿加剧',
    description: '第二天了。头发晕，手在抖。',
    type: 'conditional',
    condition: { eventId: 'E1', result: 'fail' },
    day: 2,
    deadline: 2,
    requirements: ['bread', 'canned_food', 'water'],
    onSuccess: {},
    onFail: { setState: { starving: true } },
    // starving=true → Day 3每个事件额外需要 'water'
  },
  {
    id: 'E6',
    name: '工作面试',
    description: '终于等到面试机会。成了的话一切都会不一样。',
    type: 'fixed',
    day: 2,
    deadline: 2,
    requirements: ['pen', 'phone', 'coat'],
    extraRequirements: { condition: 'powerOut', items: ['battery'] },
    onSuccess: { triggers: ['E8'] },
    onFail: {},
  },
  {
    id: 'E7',
    name: '有人敲门',
    description: '邻居来敲门——她家孩子发烧了。',
    type: 'random',
    randomChance: 0.5,
    day: 2,
    deadline: 2,
    requirements: ['medicine', 'water', 'blanket'],
    onSuccess: { triggers: ['E12'] },
    onFail: {},
  },

  // ===== DAY 3 =====
  {
    id: 'E8',
    name: '入职准备',
    description: '面试过了！下周一上班。',
    type: 'conditional',
    condition: { eventId: 'E6', result: 'success' },
    day: 3,
    deadline: 3,
    requirements: ['envelope', 'book', 'soap'],
    onSuccess: {},
    onFail: {},
  },
  {
    id: 'E9',
    name: '水管爆了',
    description: '水管终于撑不住了，厨房在积水。',
    type: 'conditional',
    condition: { eventId: 'E3b', result: 'fail' },
    day: 3,
    deadline: 3,
    requirements: ['wrench', 'wood', 'water'],
    onSuccess: {},
    onFail: {},
  },
  {
    id: 'E10',
    name: '撑不住了',
    description: '旧伤没处理，现在疼得直不起腰。',
    type: 'conditional',
    condition: { eventId: 'E2', result: 'fail' },
    day: 3,
    deadline: 3,
    requirements: ['medicine', 'bandage', 'water'],
    onSuccess: {},
    onFail: {},
  },
  {
    id: 'E11',
    name: '感冒了',
    description: '昨晚冻了一夜，开始发烧。',
    type: 'conditional',
    condition: { eventId: 'E4', result: 'fail' },
    day: 3,
    deadline: 3,
    requirements: ['medicine', 'blanket', 'scarf'],
    extraRequirements: { condition: 'E2_failed', items: ['water'] },
    // 如果E2也失败了，额外需要水
    onSuccess: {},
    onFail: {},
  },
  {
    id: 'E12',
    name: '邻居回礼',
    description: '邻居提着东西来："上次多亏了你。"',
    type: 'conditional',
    condition: { eventId: 'E7', result: 'success' },
    day: 3,
    deadline: 3,
    requirements: [],    // 无需求，自动完成
    onSuccess: { giveRandomItems: 2 },
    onFail: {},
    autoComplete: true,  // Day 3开始时自动完成，给2个随机物品
  },
  {
    id: 'E13',
    name: '房租到期',
    description: '今天是最后期限。得拿些东西跟房东抵押。',
    type: 'fixed',
    day: 3,
    deadline: 3,
    requirements: ['phone', 'book', 'battery'],
    onSuccess: {},
    onFail: {},
  },
];
```

## 物品池规则

**每天矩阵的物品池 = 当天所有活跃事件的 requirements + extraRequirements 的并集。**

从 `EVENT_ITEMS` 中筛选出池中物品，传给 `generateNormalCell` / `generateRandomCell`。

如果 `state.starving === true`（E5失败），Day 3每个事件的 requirements 动态追加 `'water'`（如果还没有的话）。

### 池子大小参考

- Day 1: 9种物品
- Day 2: 5-12种（取决于carry-over和随机事件）
- Day 3: 5-10种（取决于路径）

## 代码变更

### 1. `src/data/constants.js`

- **新增** `EVENT_ITEMS` 数组（见上方）
- **新增** `EVENT_DEFINITIONS` 数组（见上方）
- **保留** `INITIAL_RARITY_CONFIG`（品质不变）
- **保留** `INITIAL_STAGE_CONFIG`（只用 stage 0 的品质权重、背包大小等）
- `INITIAL_POOLS_DATA` 不再使用（可保留但不引用）

### 2. `src/utils/helpers.js`

- **修改** `getAllNormalItems()`：改为接受物品列表参数，返回适配当前结构的列表
  - 现在返回的item有 `{ name, icon, poolId, poolName }`
  - 新版应返回 `{ name, icon, itemId }`（poolId/poolName 不再需要）
  - 或者：为兼容性保留 poolId 字段但设为固定值如 `'event'`
- **修改** 订单匹配逻辑：事件匹配只比较 `item.name`，**不检查品质**

### 3. `src/utils/matrixHelpers.js`

- **修改** `generateNormalCell`：第一个参数 `allNormalItems` 改为从当天事件池筛选后的物品列表
- **修改** `generateRandomCell`：同上
- 不改变陷阱和炸弹逻辑

### 4. `src/hooks/useGameLogic.js`

**新增状态：**
```javascript
const [currentDay, setCurrentDay] = useState(1);
const [events, setEvents] = useState([]);        // 当前活跃事件列表
const [eventResults, setEventResults] = useState({}); // { E1: 'success', E2: 'fail', ... }
const [gameState, setGameState] = useState({});   // { powerOut: false, starving: false, ... }
const [gamePhase, setGamePhase] = useState('playing'); // 'playing' | 'summary'
```

**新增函数：**
- `initDay(dayNumber)`: 计算当天事件、设置物品池、刷新金币为20
- `endDay()`: 结算当天截止事件、推进到下一天、调用 `initDay`
- `computeActiveEvents(day, eventResults, gameState)`: 根据事件定义、之前结果、状态计算当天活跃事件
- `computeItemPool(activeEvents)`: 从活跃事件的需求中提取物品并集
- `submitToEvent(eventId, itemIndices)`: 提交物品给指定事件

**修改：**
- 初始化时调用 `initDay(1)` 而非生成订单
- 金币刷新：每天开始时设为20（不累加）
- 移除：订单生成、订单刷新、撤离订单、订单候选选择相关逻辑
- 移除：`isEvacuationMode`, `emergencyOrders`, `emergencyDifficulty`, `orderCandidates`, `orderCandidateQueue`, `orderRefreshCount`
- 移除：`score` 相关逻辑（本原型无积分）
- 矩阵生成：把 `allNormalItems` 替换为 `computeItemPool()` 的结果

**提交逻辑改造：**
- 现有 `handleConfirmSubmission` 检查 name + rarity 匹配
- 改为：只检查 name 匹配（忽略 rarity）
- 一次提交只能针对一个事件（移除"关节技"跨订单共享）
- 提交成功后：标记事件为 'success'，触发 onSuccess
- 不生成候选订单，不增加刷新次数

### 5. 组件变更

**替换 `OrderCard.jsx` → `EventCard.jsx`：**
- 显示：事件名称、描述文字、所需物品图标
- 已拥有的物品显示勾号/高亮
- 截止标记："今天截止" / "明天截止"
- 状态标记：进行中 / ✅已完成 / ❌已失败
- 完成的事件灰化但保留显示

**新增 "结束今天" 按钮：**
- 位置：左侧面板底部
- 点击 → 调用 `endDay()`
- Day 3时文案改为"结束游戏"

**新增 天数指示器：**
- 左侧面板顶部显示"第 N 天"

**新增 游戏总结画面：**
- Day 3结束后显示
- 列出所有出现过的事件及其结果（✅/❌）
- 简单文字描述角色最终处境

**修改 `GameCore.jsx`：**
- 传递事件相关 state/actions 给子组件
- 用 EventCard 替代 OrderCard
- 移除撤离订单区域
- 移除订单刷新按钮和候选选择UI
- 添加结束今天按钮和天数指示

**移除/隐藏：**
- `PoolCard.jsx` 的渲染（不再有池子概念）
- 撤离相关UI
- 订单刷新相关UI
- 积分显示（可保留但显示为0或隐藏）

### 6. 不需要改的

- `ResourceMatrix.jsx`：矩阵渲染和交互完全不变
- `InventorySlot.jsx`：背包格子不变
- `ShapeSelector.jsx`：行列选择不变
- 合成逻辑：不变（同名同品质可合成）
- 回收逻辑：不变
- 品质生成权重：不变
- 陷阱和炸弹：不变

## UI布局参考

```
┌─────────────────────────────────────────────────────┐
│  第 1 天                              金币: 20      │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  [事件卡片 E1]       │       4×4 矩阵              │
│  断粮                │       (不变)                 │
│  🍚 💧 🥫            │                              │
│  今天截止            │                              │
│                      │                              │
│  [事件卡片 E2]       │                              │
│  旧伤复发            │                              │
│  💊 🩹 🧼            │                              │
│  明天截止            │                              │
│                      │                              │
│  [事件卡片 E3a]      │                              │
│  停电通知            │                              │
│  🕯️ 🔦 🔋           │                              │
│  今天截止            │                              │
│                      ├──────────────────────────────┤
│                      │       背包 (10格)            │
│  [结束今天]          │       (不变)                 │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

## i18n

所有新增UI文字用 `t()` 包裹。中文为源语言。需要添加的翻译键：

- `event.endDay`: "结束今天" / "End Day"
- `event.endGame`: "结束游戏" / "End Game"
- `event.dayN`: "第 {n} 天" / "Day {n}"
- `event.deadlineToday`: "今天截止" / "Due Today"
- `event.deadlineTomorrow`: "明天截止" / "Due Tomorrow"
- `event.completed`: "已完成" / "Completed"
- `event.failed`: "已失败" / "Failed"
- `event.summary`: "游戏总结" / "Game Summary"
- 每个事件的 name 和 description 也需要翻译键

## 实现优先级

1. 数据层：EVENT_ITEMS + EVENT_DEFINITIONS 定义
2. 逻辑层：useGameLogic 的天结构 + 事件系统 + 物品池
3. UI层：EventCard + 结束按钮 + 天数指示 + 总结画面
4. 清理：移除不需要的订单/撤离/积分相关代码和UI
