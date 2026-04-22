# 4×4 菜市场地图 MVP — 实施计划

本文档是针对"把 3 选 1 选墙替换为 4×4 菜市场地图"的实施规格。设计已经在上一轮会话中收敛,本文档用于交接给另一个实现 session。

---

## 0. 上下文与前置阅读

**目的**:把当前的"3 选 1 选墙 → 进入一面墙抽奖"的流程替换成"在 4×4 菜市场地图上自由移动 → 在具体摊位节点抽奖"。同时验证两点:
1. **策略抽奖**:每次抽取都有可感的取舍(金币、背包、菜谱、路径)
2. **扩展性接口**:节点类型 schema 能支持未来新节点类型无改核心代码

**前置阅读**:
- `.claude/CLAUDE.md`(项目指南)
- `design_docs/setting-current-state.md`(菜市场抢菜设定,电视节目已废)
- `design_docs/game_rules.md`(现行规则;本计划替代其中"3 选 1 选墙"和"回合"相关部分)
- `design_docs/codebase_technical_reference.md`(代码结构)

**分支**:当前在 `core-draw/board-level-experiments`,父分支是 `core-draw/ingredient-trade-flex-io`。新工作建议开子分支 `core-draw/4x4-market-map`。

**保留不改的底层系统**:80 食材、品质 5 级、多联格形状、合成、背包溢出队列、订单模板与二选一队列、刷新次数、菜谱、做菜结算、派遣五维、人气值、跨天结构(dayNumber / expeditionScores)。

---

## 1. 术语统一(全局改名)

全项目把"厄运"相关术语重命名为"人挤人"。这是一次批量字符串替换 + 函数重命名。

| 旧 | 新 |
|----|----|
| 厄运网格 | 人挤人网格 |
| 厄运危险格 | 人挤人格 |
| 厄运结算 | 人挤人结算 |
| 厄运等级 | 人挤人等级 |
| `doomGrid` (state) | `crushGrid` |
| `doomLevel` | `crushLevel` |
| `triggerDoomResolution()` | `triggerCrushResolution()` |
| `💀 doom_resolution` cell type | 保留为 `crowd_grabber` 类型,显示仍用人物 emoji(🧑👩 等),文案改 |
| UI 文案 "厄运"、"doom" 等 | "人挤人"、"crowd crush" |

**保留不改的名字**:
- **抢菜人**(🧑)是"实体/NPC",不改名。它是**触发器**,触发的**事件**是人挤人(事件)。
- 语义区分必须贯穿全文和代码注释:
  - 抢菜人 = entity(摊位网格里某个格子 / 地图边上某条边上)
  - 人挤人 = event(抢菜人被触发后,在人挤人网格上滚骰子扣 HP)

---

## 2. 游戏流程的变化

### 删除

- `wall_choice` phase(3 选 1 选墙)
- `currentWallType` 相关的 3 候选随机逻辑
- 每墙固定 3 抽的免费抽次
- "回合"概念及其边界事件(如"每回合 +1 人挤人格")

### 新增

- 地图 phase:玩家在 4×4 地图上自由移动,选节点进入交互
- 金币作为**全日持续的抽奖货币**(替代每墙 3 抽的免费额度)
- 市场时钟:每 3 次动作推进 1 tick,驱动边上抢菜人生成 + 人挤人网格危险格生成
- 撤离方式:**走回入口=出口节点**触发(替代撤离按钮)

### 保留但迁移

- 抢菜人 / 炸弹 / 订单格 / 抽数格 / 金币格 等,继续在摊位的 4×4 网格里生成
- 人挤人网格、HP 机制、HP=0 丢背包强制撤离 —— 逻辑不变,只是换名
- 订单货架的 UI 拆分成地图上的 2 个节点(订单 A 区 / B 区)

### phase 状态机(建议)

```
pre_game → setup → map → stall_drawing → map → 
  (走回入口 OR HP=0) → restaurant → cook_result → pre_game (下一天)
```

`map` phase:玩家在地图上自由移动和选节点。  
`stall_drawing` phase:进入摊位节点时,临时切换到现有的抽奖 UI。抽完退出回到 `map` phase。订单提交、金币交易、零钱领取等也是临时弹窗,不进入独立 phase。

---

## 3. 地图与节点(16 节点)

### 布局(4×4 网格)

16 个节点按 4×4 排布,坐标 `(x, y)`,`x, y ∈ {0, 1, 2, 3}`。

### 节点清单

| 节点类型 | 数量 | 说明 |
|---------|------|------|
| 大摊位(5 种市场) | 5 | 海鲜 / 肉 / 蔬菜 / 主食 / 蛋奶 各 1 |
| 订单区 | 2 | A 区 + B 区,各展示 2 单 |
| 大排档(金币收购 - 品类计价) | 1 | 食材 → 金币,按批次子类数计价 |
| 酒楼(金币收购 - 品质计价) | 1 | 食材 → 金币,按单件品质计价 |
| 零钱袋 | 1 | 踩到一次性 +2g |
| 入口=出口 | 1 | 固定位置(建议 (0,0)),走回触发撤离 |
| 空通道 | 5 | 纯过路节点,无交互 |

**首版布局**:手工设计 1 张地图。建议让 5 大摊分散在四角区域、2 订单区 + 2 金币区放在地图中段、零钱袋放偏远、入口角落、空通道填间隙。实现者可以按此意图排版。

### 节点类型详细规则

#### `stall_*`(5 种大摊位)

- 玩家进入 → 打开现有摊位 4×4 抽奖 UI
- **网格内容**:和现有系统一致(食材按 `currentMarketType` 过滤生成、多联格形状、抢菜人、炸弹、订单格、抽数格、金币格)
- **抽奖金币成本**:见 §6
- **离开**:抽完自主返回地图,或网格空了自动返回
- **状态**:`{ grid: Cell[16], crushCount: number, drawsMadeToday: number }`

5 种大摊的 `currentMarketType` 硬绑定到节点类型:
- `stall_seafood` → `seafood_market`
- `stall_meat` → `butcher`
- `stall_vegetable` → `vegetable_shop`
- `stall_grain` → `grain_store`
- `stall_dairy` → `dairy_store`

#### `order_region_a` / `order_region_b`

- 进入 → 弹出该区的 2 张订单 UI(复用现有 `BulletinBoard` 组件,按区过滤)
- 可在此区:
  - 查看 2 张订单详情
  - 提交订单(食材备齐才可)
  - 主动刷新某张订单(消耗 1 次刷新次数)
- **订单分配**:每天开局生成 4 单,随机 2 单绑 A、2 单绑 B
- **自动补单**:完成 A 区某单 → 新单生成到 A 区(A 区的 `incomingQueue` 入队)
- **📋 格触发**:摊位抽中 📋 格时,二选一事件入**随机一个区**的队列
- **状态**:`{ orders: Order[2], regionId: 'a' | 'b', incomingQueue: Event[] }`

#### `gold_variety`(大排档)

- 进入 → 弹出批量卖食材 UI(复用背包选择组件)
- 玩家勾选背包中任意若干件食材 → 一次性结算
- **定价**:按批次中**独立子类数**(`tag2`)× 件数
- 子类数 1: 1g/件 | 2: 2g/件 | 3: 3g/件 | 4: 5g/件 | 5: 8g/件
- 计算:`总收入 = 件数 × 单价(子类数)`
- 品质不影响定价
- 可重复进入、重复卖(无次数限制)

#### `gold_quality`(酒楼)

- 进入 → 弹出卖食材 UI(可单件可批量)
- 每件独立结算,按品质定价:q1=1g / q2=2g / q3=3g / q4=5g / q5=8g
- 子类不影响定价
- 可重复进入

#### `pocket_money`(零钱袋)

- 玩家首次踩到 → 自动 +2g,节点状态标记已领取(当日不再给)
- 次日重置
- **状态**:`{ claimed: boolean }`

#### `entry_exit`

- 游戏开始时玩家 spawn 在此
- 玩家走回此节点触发确认:"收摊回家?"
- 不可抽奖、不可交互其他

#### `passage`

- 纯过路,无任何交互
- 仅作为路径上的一步

### 节点 Schema(TypeScript 风格接口)

```ts
interface Node {
  id: string;              // 'node_0_1'
  position: { x: number; y: number };
  type: NodeType;
  state: NodeState;        // type-specific shape
}

type NodeType =
  | 'stall_seafood' | 'stall_meat' | 'stall_vegetable'
  | 'stall_grain' | 'stall_dairy'
  | 'order_region_a' | 'order_region_b'
  | 'gold_variety' | 'gold_quality'
  | 'pocket_money' | 'entry_exit' | 'passage';

// 每种类型实现五个 hook(建议用策略模式,一个 nodeBehaviors map)
interface NodeBehavior {
  getPeekInfo(node, gameState): PeekInfo;     // 玩家相邻时看到什么
  onEnter(node, gameState): EnterResult;      // 进入时触发(打开 UI / 结算 / ...)
  onTick(node, gameState): StateUpdate;       // 市场时钟推进时的响应(如摊位流失?MVP 阶段可留空)
  canEnter(node, gameState): boolean;         // 能否进入(MVP 下始终 true,留扩展位)
  getDisplayIcon(node): string;               // 地图上显示的 emoji / icon
}
```

`nodeBehaviors: Record<NodeType, NodeBehavior>` 是本次重构的**扩展性接口核心**。验证扩展性 = 新增一种节点类型时,只需往这个 map 里加一项,不需要改 useGameLogic 的核心分发逻辑。

---

## 4. 移动与边

### 移动规则

- 玩家有一个 `playerPosition: { x, y }` state
- 每次移动:**1 格或 2 格**,**只能横或竖**(不含斜向)
- 可移动到的目标 = 当前位置 ±(1 或 2)在 x 或 y 方向
- 每次移动消耗 1 动作(推进市场时钟的计数)

### 边结构

- 地图上每个相邻的 1 格对都有一条边,共 24 条(4 行 × 3 + 4 列 × 3)
- 2 格移动 = 跨越 2 条边(经过中间格,但**不在中间格停留**)
- 每条边有 `hasGrabber: boolean` 属性

### 边上的抢菜人(动态)

- **开局**:所有边 `hasGrabber = false`(24 条全部为 0)
- **市场时钟推进**(每 3 动作):
  - 随机挑 1 条 `hasGrabber = false` 的边 → 标记为 `true`
  - 同时人挤人网格随机安全格 → 变危险格(等同原"每回合 +1 危险格"逻辑)
- **触发条件**:玩家移动时经过的每条边(1 格移动 1 条边,2 格移动 2 条边),若该边 `hasGrabber = true`:
  - 立即触发一次**人挤人结算**(复用现有 `triggerDoomResolution` → `triggerCrushResolution`)
  - 滚 N 次(N = `crushLevel`,当前固定 1)
  - 落到危险格 → HP -1
- **边上的抢菜人不消失**,玩家再次路过同一条边会再次触发
- 边上抢菜人**不参与摊位定价**,只存在于移动触发

### 可见性

- 玩家始终能看到**所有边**的 `hasGrabber` 状态(图标提示)
- 这使得"找安全路径"成为可玩决策

---

## 5. 市场时钟(统一事件时钟)

**核心规则**:每 3 次动作,市场时钟推进 1 tick。

**动作的定义**(消耗时钟计数的行为):
- 移动一步(无论 1 格或 2 格)
- 在摊位抽奖一次
- 在订单区提交一张订单
- 在订单区主动刷新
- 在金币区完成一次交易
- 在零钱袋领取一次

**不消耗时钟的行为**:
- 查看地图 / 查看摊位详情 / 合成背包内物品(UI 层面的无代价操作)
- 进入节点本身(进节点不是动作,"在节点上做的第一件事"才是)

**tick 效果**(每 tick 同时发生):
1. 随机挑 1 条尚未有抢菜人的边 → 生成抢菜人
2. 人挤人网格的随机 1 个安全格 → 变成危险格(等同原厄运网格每回合 +1)

当 24 条边全部有抢菜人 / 人挤人网格全危险时,对应的生成停止。

**实现建议**:新加一个 state `actionCounter: number`。每次发生"动作"则 `actionCounter++`。当 `actionCounter % 3 === 0` 时触发 tick。

---

## 6. 摊位金币定价(动态)

**基础价**:3g/抽,全摊位统一(与市场类别无关)。

**折扣机制**:按摊位网格中当前的抢菜人格数量递减。

```
price_per_draw = max(1, 3 - crushCount)
```

| 抢菜人数 | 每抽金币 |
|---------|---------|
| 0 | 3g |
| 1 | 2g |
| 2 | 1g |
| 3+ | 1g(下限) |

**当前抢菜人数定义**:摊位 4×4 网格中当前**存活未抽中**的抢菜人格数量。玩家抽掉一个抢菜人后,该摊位的价格下次进入时会**上升一档**。

**显示**:玩家相邻该摊位节点时,peek info 显示:
- 摊位类型
- 当前抢菜人数
- 本次进入的抽奖单价
- 剩余总格子数

**策略意义**:抢菜人多 = 抽奖便宜,但抽到人挤人风险高。便宜和危险绑在一起,不是纯亏或纯赚。

---

## 7. 金币交易节点

### 大排档(`gold_variety`)

**定价**:批次的独立子类数决定单价,按件结算。

| 本批独立子类数 | 每件单价 |
|--------------|---------|
| 1 | 1g |
| 2 | 2g |
| 3 | 3g |
| 4 | 5g |
| 5 | 8g |

**子类**指食材的 `tags[1]`(例:"虾"、"鸡"、"青菜"、"米" 等,当前系统有 4 个子类 × 5 大类 = 20 子类)。

**结算公式**:`总收入 = 勾选件数 × 单价(独立子类数)`

**示例**:
- 5 件食材全是"虾"(1 子类):5 × 1 = 5g
- 5 件食材覆盖 3 子类:5 × 3 = 15g
- 3 件食材覆盖 3 子类:3 × 3 = 9g

**品质无关**。

### 酒楼(`gold_quality`)

**定价**:每件独立按品质计价。

| 品质 | 单价 |
|------|------|
| q1 ★ | 1g |
| q2 ★★ | 2g |
| q3 ★★★ | 3g |
| q4 ★★★★ | 5g |
| q5 ★★★★★ | 8g |

**子类无关**。

**两者并存时**,玩家根据当前背包状态选择去哪家:
- 杂乱多品类的低品质背包 → 去大排档
- 少量高品质背包 → 去酒楼

---

## 8. 订单区(空间化)

### 订单生成

- 每天开局(`setup` phase 结束时)自动生成 **4 张订单**
- 随机分 2 张到 A 区、2 张到 B 区(每区永远 2 张起步)
- 订单模板权重、要求 / 奖励结构 **不变**(easy/medium/hard/extreme 按 30/40/20/10)

### 提交 / 刷新的空间化

- 只能在订单对应的**区节点**提交该订单
- 只能在对应区刷新该区的订单
- 背包内合成不需要去特定节点(任意时刻都可操作,符合当前行为)

### 订单队列

- 每个区有独立的 `incomingQueue`
- 完成某区一张单 → 新单入该区队列(自动提示玩家二选一替换)
- 📋 格触发的二选一事件 → **随机选一个区**入队(随机算法:各 50%)
- 货架容量 = 2/区(两区共 4),和现有 `bulletinCapacity: 4` 保持一致

---

## 9. 数据 Schema

### MapState(新增)

```ts
interface MapState {
  nodes: Node[];                     // 16 个节点
  edges: Edge[];                     // 24 条边
  playerPosition: { x: number; y: number };
  actionCounter: number;             // 每次动作 +1
  clockTicks: number;                // actionCounter / 3 向下取整
}

interface Edge {
  id: string;                        // 'edge_0_1_1_1' (from (0,1) to (1,1))
  from: { x: number; y: number };
  to: { x: number; y: number };
  hasGrabber: boolean;               // 边上是否有抢菜人
}

interface Node {
  id: string;
  position: { x: number; y: number };
  type: NodeType;
  state: NodeState;
}

// NodeState 按 type 分
type NodeState =
  | StallState
  | OrderRegionState
  | GoldExchangeState
  | PocketMoneyState
  | SimpleState;

interface StallState {
  grid: Cell[];                      // 16 格,复用现有 Cell 结构
  crushCount: number;                // 当前存活抢菜人格数(动态计算或缓存)
}

interface OrderRegionState {
  orders: Order[];                   // 长度 2
  incomingQueue: OrderEvent[];
  regionId: 'a' | 'b';
}

interface GoldExchangeState { /* 无状态 */ }
interface PocketMoneyState { claimed: boolean; }
interface SimpleState { /* entry_exit, passage */ }
```

### 玩家全局状态新增

`useGameLogic` 中加:
```ts
gold: number;                        // 金币,起始 20
mapState: MapState;
actionCounter: number;               // 用于时钟
crushGrid: CrushCell[];              // 原 doomGrid 改名
crushLevel: number;                  // 原 doomLevel 改名
// 其他保留
```

### 需要删除的状态

- `wallState.currentWallType`(3 选 1 机制,全删)
- `wallState.wallCandidates`(3 候选列表)
- `drawsRemaining` 相关的"每墙 3 抽"逻辑(改为基于金币)

---

## 10. UI 设计

### 主地图组件(新)

`src/components/v2/MarketMap.jsx`:
- 4×4 网格 SVG 或 div grid
- 每节点一个图标 + 标签 + peek info hover
- 玩家位置用角色 emoji 标记(🧑‍🍳 或类似)
- 可移动的节点高亮(1-2 格横竖)
- 边以线段绘制,`hasGrabber = true` 的边用红色 + 抢菜人 emoji
- 点击节点触发移动;点击当前节点触发 `onEnter`

### UI 流程

- `map` phase:显示地图组件
- 玩家点合法目标节点 → 执行移动 → 动画 → 若经过抢菜人边 → 人挤人结算动画 → 到达
- 玩家点当前节点 → 触发该节点的交互(打开摊位 / 订单 UI / 金币交易 / 领钱 / 收摊确认)

### 信息层级(peek info)

玩家鼠标悬停或相邻一节点时,显示:
- 摊位:类型、当前抢菜人数、本次抽奖单价、剩余格数
- 订单区:该区 2 张订单的概要
- 金币区:定价规则(大排档 / 酒楼的简短说明)
- 零钱袋:+2g,`claimed` 状态
- 入口=出口:"收摊回家"
- 通道:无信息

### 菜谱 + 背包 + HP + 金币的持续可见

沿用现有 side panel,新增金币数显示。HP 改成"菜篮耐久度"或保留 HP(显示沿用)。

---

## 11. 保留的旧系统(不改)

以下系统实现时**不要触碰**,只按需调用:

- `src/data/v2Config.js`:食材库、品质分布、订单模板、多联格权重
- `src/utils/matrixHelpers.js`:网格生成、随机抽取(除 `getClusterMembers` 已 deprecated)
- 背包 / 合成 / 溢出队列逻辑
- 菜谱 / 做菜结算 / 派遣五维 / `scoreDish`
- 人气值、dayNumber、跨天结构

**可复用的已有组件**:
- `ResourceMatrix`(摊位 4×4 网格 UI)
- `BulletinBoard`(订单货架,需改成按区过滤的 2 订单版)
- `Inventory`(背包 UI)
- `RoundTransition`(菜品揭晓浮层,保留)

**建议改造但不重写**:
- `BulletinBoard` 加 `regionId` prop,同组件跑两次(一次 A 区、一次 B 区)

---

## 12. 实施顺序(建议里程碑)

### Milestone 1:术语改名 + 数据结构
- 全局把 doom → crush 重命名(字符串替换 + 变量名 + 函数名)
- 加 `gold: number`(starting 20)、`mapState`、`actionCounter` 到 useGameLogic
- 定义 Node / Edge / MapState 的类型
- 首版手工地图的 JSON/literal 定义

### Milestone 2:节点行为分发引擎
- 实现 `nodeBehaviors` map 和每种类型的 hook
- `onEnter` 分发 → 切换 phase 或弹 UI
- 单元测试(可选):每种 NodeType 的 hook 调用正确

### Milestone 3:地图 UI + 移动
- `MarketMap` 组件,显示节点 + 边 + 玩家位置
- 移动逻辑:合法目标高亮、点击移动、边穿越判定
- 动作计数 + 市场时钟 tick 触发

### Milestone 4:摊位节点 + 动态定价
- 进入摊位节点 → 打开现有 4×4 抽奖 UI
- 抽奖消耗金币(按动态定价)
- 抽完/金币不足 → 返回地图

### Milestone 5:金币交易节点
- 大排档 / 酒楼 的 UI + 定价结算

### Milestone 6:订单区空间化
- `BulletinBoard` 加 regionId
- 订单分配到 A/B 区
- 提交/刷新要求在对应区

### Milestone 7:边抢菜人 + 人挤人触发
- 时钟 tick → 生成边抢菜人
- 移动穿越边 → 触发 `triggerCrushResolution`
- 视觉反馈

### Milestone 8:零钱袋 + 入口撤离
- 零钱袋节点
- 入口=出口,走回触发撤离确认

### Milestone 9:整合 + 删除旧逻辑
- 删除 `wall_choice` phase、3 选 1 逻辑
- 删除 `drawsRemaining`(每墙 3 抽)相关
- phase 状态机调整

### Milestone 10:试玩调优
- 内部试玩
- 数值调整(金币成本、零钱袋数量、定价曲线等)

---

## 13. MVP 验证标准

### 策略抽奖验证通过

- 3 个同事各玩一把,能清晰讲出各自的日内策略差异
- 同一张地图两局走法路径和抽奖点明显不同
- 每次进摊位前玩家有可感的决策暂停(至少 2-3 秒思考)
- 玩家在同一次试玩中会至少一次改变原计划路径(响应抽奖结果或边抢菜人生成)

### 扩展性验证通过

- 新增一种节点类型的工程成本 ≤ 4 小时
- 新增节点类型只需:实现 NodeBehavior + 添加 type 到 NodeType union + 更新地图数据(若想放到地图上)
- 不修改 `useGameLogic` 的核心动作分发逻辑

---

## 14. 完整参数总表

### 金币
| 项 | 值 |
|---|---|
| 起始金币 | 20 |
| 摊位抽奖基础价 | 3g |
| 抽奖折扣 | 每抢菜人 -1g,最低 1g |
| 金币格奖励(摊位网格) | +1g |
| 零钱袋节点 | +2g/day |
| 大排档定价(每件) | 1/2/3/5/8 by 子类数 1~5 |
| 酒楼定价(每件) | 1/2/3/5/8 by q1~q5 |

### HP / 人挤人
| 项 | 值 |
|---|---|
| 初始 HP | 5 |
| HP=0 效果 | 丢弃背包 + 强制撤离 |
| 人挤人网格 | 10 格,初始 1 危险 + 9 安全(不变) |
| 人挤人等级 | 1(不变) |
| 人挤人结算滚骰次数 | = 人挤人等级(当前固定 1) |

### 时钟
| 项 | 值 |
|---|---|
| 时钟推进频率 | 每 3 次动作 |
| 每 tick 效果 | +1 随机边抢菜人 + +1 随机人挤人危险格 |
| 边总数 | 24 |
| 人挤人网格总格 | 10 |

### 订单
| 项 | 值 |
|---|---|
| 每天订单数 | 4(2 区 × 2) |
| 货架容量 | 4(总)/ 2(每区) |
| 初始刷新次数 | 0 |
| 刷新上限 | 5 |
| 模板权重(不变) | easy:medium:hard:extreme = 30:40:20:10 |

### 地图
| 项 | 值 |
|---|---|
| 地图大小 | 4×4 = 16 节点 |
| 移动范围 | 1-2 格,仅横竖 |
| 入口位置 | (0, 0) 建议 |

### 摊位内部(不变)
| 项 | 值 |
|---|---|
| 网格大小 | 4×4 |
| 抢菜人格概率 | 15%/格 |
| 订单格概率 | 7%/格 |
| 炸弹格概率 | 5%/格 |
| 抽数格概率 | 3%/格 |
| 金币格概率 | (新增,建议 3%) |
| 食材格概率 | 余下 ~67% |
| 多联格形状权重 | 1 格:60% / 2 格:30% / 3 格:10% |

---

## 15. 实施时要反复确认的事

1. **术语**:"抢菜人"是实体,"人挤人"是事件。任何注释、UI 文案、变量命名都应遵循。
2. **动作的定义**:哪些行为推进市场时钟,要在代码里统一抽象一个 `performAction()` 调用,所有推进时钟的行为都走这个入口,避免遗漏。
3. **节点扩展性**:加新节点类型时,**不要**往 `useGameLogic` 加新 if/switch 分支。应该统一通过 `nodeBehaviors[type].onEnter(...)` 分发。
4. **保留旧组件的复用**:`ResourceMatrix`、`BulletinBoard` 这些组件不要 fork,通过 props 改造复用。
5. **数值是待调的**:本文档所有数字都是起手值,试玩后会调。不要硬编码到组件里,放 `src/data/mapConfig.js` 或类似集中配置文件。
6. **视觉/UX**:地图和抽奖两个层需要清晰切换,不要让玩家误以为自己还在摊位里。

---

## 附录:文件位置建议

- 新建 `src/data/mapConfig.js`:金币定价、边数据、节点默认数据
- 新建 `src/data/maps/map_v1.js`:首版手工地图定义
- 新建 `src/components/v2/MarketMap.jsx`:主地图组件
- 新建 `src/components/v2/map/NodeIcon.jsx`:节点图标
- 新建 `src/components/v2/map/EdgeLine.jsx`:边可视化
- 新建 `src/hooks/useNodeBehaviors.js` 或直接在 `useGameLogic` 中加入 behaviors map
- 改造 `src/components/v2/BulletinBoard.jsx`:加 regionId
- 修改 `src/hooks/useGameLogic.js`:核心 state 和 phase 逻辑
- 修改 `src/components/v2/GameCore.jsx`:phase 渲染分发加入 map phase

---

*计划文档版本 v1,最后更新:对应本轮设计会话。实施中发现规格不明可回查本文件;如需修订规格,请更新本文件后再继续。*
