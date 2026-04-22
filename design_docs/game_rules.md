# 幸运之墙 Wall of Fortune — 游戏规则文档

> **最后更新**：2026-04-21 · `ingredient-trade-flex-io` 分支
> 本文记录**当前代码**的已实装规则（基于 `src/data/v2Config.js` / `matrixConfig.js` / `runtimeConfig.js` / `hooks/useGameLogic.js` / `utils/matrixHelpers.js`）。设定背景见 `setting-current-state.md`，进度状态见 `gameplay_progress.md`。

---

## 目录

1. [游戏概述](#游戏概述)
2. [一天循环（Day Loop）](#一天循环day-loop)
3. [市场与奖品墙](#市场与奖品墙)
4. [格子类型与墙生成](#格子类型与墙生成)
5. [抽取与品质系统](#抽取与品质系统)
6. [人群系统（doom）](#人群系统doom)
7. [订单系统](#订单系统)
8. [菜篮与冰箱](#菜篮与冰箱)
9. [菜品与结算](#菜品与结算)
10. [配置面板（LIVE_CONFIG）](#配置面板live_config)
11. [附录：数值汇总表](#附录数值汇总表)

---

## 游戏概述

**主题**：参赛厨师拯救餐厅。局内玩家进入菜市场"抢菜"，局外把食材做成菜。

**核心张力**：
- 局内：在有限抽取次数里凑齐订单需求，同时避开被"抢菜人"挤出店铺
- 局外：把食材合理分配到菜里，分数影响人气值

---

## 一天循环（Day Loop）

```
[Day N 开始]
   │
   ▼
setup → 今日菜品揭晓（DishCard 浮层 + 菜品要求）
   │
   ▼
每回合：
  wall_choice  3 店随机刷选 1 家进入（修 modifier-hidden）
  wall_reveal  揭晓墙面 modifier（当前无生效 modifier——纯市场）
  drawing      4×4 墙面抽取（见下）
  between_turns 抽奖结束；累积 doom；刷 1 个 2 选 1 订单事件
   │
   ▼
restaurant → 回家做菜（Kitchen 结算）
   │
   ▼
cook_result → 人气值涨跌 → 下一天
```

状态机：`pre_game → setup → wall_choice → wall_reveal → drawing → drawing_sub/exiting_sub → between_turns → restaurant → cook_result → pre_game`（下一天）。

---

## 市场与奖品墙

### 5 种市场（MARKET_TYPES）

每家市场只出现对应大类的食材。

| id | 名称 | 大类 | 图标 |
|----|------|------|------|
| `seafood_market` | 海鲜市场 | 海鲜 | 🦐 |
| `butcher` | 肉铺 | 肉类 | 🍖 |
| `grain_store` | 粮食店 | 主食 | 🍚 |
| `vegetable_shop` | 蔬菜店 | 蔬菜 | 🥬 |
| `dairy_store` | 乳品店 | 蛋奶制品 | 🧀 |

权重都是 20（等权）。

### 3 选 1

每回合开始先在 3 家候选市场中选 1 家进入。候选卡显示图标 + 名称 + 描述（"只能抢到 X 类食材"）+ 子类 tag + 抢菜人数量。**hover 卡片**会让左侧交换区中、本市场所有食材 tag2 对应的订单需求卡发金色呼吸光晕突显（见"突显"小节）。

选墙界面标题："**接下来去哪儿？**"，没有副标题。

---

## 格子类型与墙生成

### 4×4 墙，逐格 roll（`MATRIX_CONFIG.gridSize = 4`）

Phase 1 + 2（`LIVE_CONFIG.cellSpawn`，当前默认）：

| 累积门限 | 类型 | 概率 | 图标 |
|---------|------|------|------|
| `[0, 0.15)` | 抢菜人（doom_resolution） | **15%** | 随机人像（见下） |
| `[0.15, 0.18)` | 抽数（gold） | **3%** | 🎫 |
| `[0.18, 0.25)` | 订单（order_cell） | **7%** | 📋 |
| `[0.25, 0.30)` | 炸弹（bomb） | **5%** | 💣 |
| `[0.30, 1.0)` | 留空 → 食材格（Phase 3） | **70%** |  |

### Phase 3：食材格

每个剩余空格独立放 1 个食材，彼此之间没有分组或形状关系。食材从**进入市场的大类下 16 个基础食材**均匀随机挑。食材格在墙上只显**品类名 + shortLabel**，**不显示品质**（品质在抽取时 roll）。

### 抢菜人头像池

`DOOM_EMOJI_POOL`（去掉黑色剪影，11 个）：
```
🧑 👨 👩 🧒 👦 👧 👶 🧓 👴 👵 🧔
```
每个抢菜人格、`人群` panel 的 danger 格、抽取动画 hit 格都独立 roll 一个。

---

## 抽取与品质系统

### 抽法

- 每次**选一行或一列**抽取（`selectRow` / `selectColumn`）
- 在选中的行/列里随机命中 1 格
- 消耗 1 抽数（`TURN_CONFIG.drawCost = 1`）；**每次进市场给 3 抽**（`TURN_CONFIG.goldPerTurn = 3`）
- 抽完 / 抽到抢菜人 → 进 between_turns

### 品质系统（5 档）

`QUALITY_CONFIG`：

| id | 名字 | 颜色 | stars | scoreValue |
|----|------|------|-------|-----------|
| 1 | 普通 | 白(灰) | ★ | **1** |
| 2 | 精选 | 绿 | ★★ | **2** |
| 3 | 优质 | 蓝 | ★★★ | **3** |
| 4 | 顶级 | 紫 | ★★★★ | **5** |
| 5 | 传说 | 橙 | ★★★★★ | **8** |

默认抽取的品质概率 `LIVE_CONFIG.qualityWeights` = `{1:0.40, 2:0.30, 3:0.18, 4:0.08, 5:0.04}`。

UI 上**所有"价值 badge"显示 scoreValue**（1/2/3/5/8），而不是 quality id。这样橙色传说显示"8"，紫色顶级显示"5"，跟玩家放到菜里的分值一致。

### 抽中效果

| 格类型 | 效果 |
|--------|------|
| 食材 | roll 品质（若已被透视预 roll 过则使用预 roll 值）→ 进菜篮（若满 → pendingItems） |
| 抢菜人 | 触发 **人挤人**（人群结算动画），可能扣 HP |
| 抽数 🎫 | 获得 1-2 抽数 |
| 订单 📋 | 在 incomingQueue 里追加一个 2 选 1 事件（between_turns 弹出） |
| 炸弹 💣 | 摧毁周围 8 格 |

**兜底 flag**：墙上还存在 `out_of_game` / `heal` / `backpack_expand` / `gravity` / `entrance` / `buff_field` 等类型的代码路径（legacy），但当前墙生成不会产出这些格。

---

## 人群系统（doom）

### 面板（"人群"）

旧"厄运"面板整体改名为 **人群**：

- 10 格危险网格（初始 1 格 danger，其余 empty）
- header 右上指示：`{dangerCount}LV{doomLevel}`（如 `3LV1`）
- 无脚栏统计行
- 每回合 end turn 时在网格空格里 +1 danger

### 人挤人（结算）

抽到抢菜人格 / 墙面 `doom_resolution` → 触发 **人挤人**：

1. 光标在 10 格里随机落 N 次（N = `doomLevel`，当前初始 1）
2. 命中 danger = -1 HP（UI 文案："菜篮 -1 耐久"）
3. 命中 empty = 无事（✅）
4. 结算动画里每个 hit 显示该 danger 格生成时 roll 的人像 emoji

### HP（耐久度）

- 初始 5，最大 5，显示在菜篮 header 左侧 ❤️×N + 🤍×(5-N)
- 归零 → 丢失菜篮（"菜篮只剩个把儿"）→ 强制结束
- 每进市场前复位？（见 `useGameLogic.js` doom 重置路径——按当前代码是每天开局复位）

### 抢菜人 tooltip

墙上 hover 抢菜人格：
- 名字："**抢菜人**"
- 描述："**抽中时触发人挤人**"

---

## 订单系统

### 订单模板（`ORDER_TEMPLATES`）

| id | 难度 | 权重 | 奖励品质 | 需求 | 类型数 |
|----|------|------|---------|------|-------|
| easy | easy | 30 | ★★（绿） | reqBudget = 2 | 2 |
| medium | medium | 40 | ★★★（蓝） | reqBudget = 3 | 2 |
| hard | hard | 20 | ★★★★（紫） | qualityDist [3, 2, 1] | 3 |
| extreme | extreme | 10 | ★★★★★（橙） | qualityDist [3, 3, 2] | 3 |

**reqBudget** 表示"需求总品质分值 ≈ N"，分布到槽位时每槽按 `avgScore × [0.75, 1.25]` 随机（±25%）。
**qualityDist** 直接写死每槽的品质（洗牌后 1:1 填到 slot）。

### 需求的类型随机性

订单的 N 个需求 tag2 从 20 个二级 tag（5 大类 × 4 小类）里随机洗牌取前 N 个。**彼此之间允许同大类**（2026-04-20 之前是强制跨大类，后移除了这个约束）。奖励 tag2 从**非需求**的 tag2 里随机选。

### 交换区（旧"货架"）

- 容量 4（`ORDER_CONFIG.bulletinCapacity = 4`）
- 满员后若新订单要进入 → **交换区已满**，玩家在现有订单中选一个替换
- 显示 "N/4" 在 header 右上

### 刷新渠道（`incomingQueue` FIFO）

| 渠道 | 触发 |
|------|------|
| between_turns（每回合结束） | 每回合自动追加 1 个 2 选 1 事件 |
| 抽中订单格 📋 | 立刻追加 1 个 2 选 1 |
| 完成订单提交 | 提交成功后追加 1 个 2 选 1 |
| 手动刷新（`🔄` 按钮） | 消耗 1 次 refreshCharges（初始 0，上限 5）追加 1 |

所有事件走同一队列，FIFO 排队。

### 2 选 1 picker

两处渲染：
- `between_turns` phase → **内联**在中央面板
- 其他 phase（`drawing` / `wall_choice` / `wall_reveal` / `restaurant` 等）→ **全屏 modal overlay**

两处都有**跳过**按钮（右下），调 `discardIncomingOrder()` 直接 pop 队列头。

### 提交订单

- `canSubmitOrder`：按 tag2 逐个配对库存，每项数量 count=1，品质 ≥ 订单要求
- 提交后：消耗选中食材 → 弹 **OrderSubmitModal**
  - wrapper `pointer-events-none` → **点击可穿透到交换区/菜篮，两边都能继续看和交互**
  - 最多 max-w-xl，max-h 85vh
  - 两段："选择要交付的食材"、"选择奖励食材"
  - 底部"取消" + "确认提交"
- 确认后：获得奖励食材（实际 id 从 reward tag2 内的 16 条里玩家挑 1 个）进菜篮

### Hover 突显（2026-04-21 修）

鼠标 hover WallPicker 卡片 → 该市场的 16 个食材 id 向 BulletinBoard 报告 → 订单需求卡中 tag2 命中的那些按以下方式突显：
- **外层** `scale-110 z-10`
- **内层卡身**加 `animate-[req-highlight-pulse_1.4s_ease-in-out_infinite]`（金色呼吸光晕）
- **品质边框 / 底色保留不变**，只叠阴影效果

原通道曾在 `3dc84fd` 重写时断开，已恢复（WallPicker 重新 report `onHoverIngredientIds`）。

---

## 菜篮与冰箱

### 菜篮（inventory）

- 容量 10（`INITIAL_GAME_CONFIG.inventorySize = 10`）
- header 显示 "🧺 菜篮 + 耐久度 + ❤️×N 🤍×M + N/10"
- 左击食材 = 拿起（金色光晕）→ 点另一格 = 交换位置；点同一格 = 放下
- **pending 合成快捷**：菜篮满、有 pending 头部物品，若菜篮里某格和 pending 同 id + 同品质 + 品质 <5 → 该格 hover 显蓝色 info ring，点一下**直接合成**（而不是替换）
- 合成 = 2 件同 id 同品质 → 品质 +1（最多到 5）

### 冰箱（fridge）

注：当前代码里 `fridge` 字段存在但**基本不用**——是之前重构时计划引入的"跨店持有"概念的残留。主要的"存东西"地方仍是 inventory（菜篮）。GameCore 里 Kitchen modal 的 `inventory` prop 接的是 `fridge`，但 `fridge` 很少有内容。实际玩法中菜篮 = 唯一的食材容器。

### pendingItems 队列

当抽到食材但菜篮满 → 入 `pendingItems` 队列头 → 浮层提示"菜篮已满"→ 点菜篮某格替换 / 点"丢弃当前物品"扔掉 / 或点可合成格直接合成。

---

## 菜品与结算

### 菜品（`DISHES`，2 道手作）

#### 海洋线条 🍝（baseline 10）

| 槽位 | rules（大类 × 0.5 / 小类 × 1 / 具体 × 2） | 其它 |
|------|------------------------------------------|------|
| 主料（required） | 海鲜×0.5 / 虾×1 / **明虾** ×2 | default 0；`trigger` 贝 → spawn 副主料槽 |
| 基底（required） | 主食×0.5 / 面×1 / **鸡蛋面** ×2 | default 0 |
| 汤汁（required） | 蔬菜×0.5 / 菌菇×1 / **香菇** ×2 | default 0 |
| 配料（not required） | — | default 1（万用）|

#### 炉火慢歌 🍛（baseline 10）

| 槽位 | rules | 其它 |
|------|-------|------|
| 主料（required） | 肉类×0.5 / 牛×1 / **牛腩** ×2 | default 0 |
| 底（required） | 主食×0.5 / 米×1 / **粳米** ×2 | default 0 |
| 炖料（not required） | 蔬菜×0.5 / 根茎×1 / **土豆** ×2 | default 0；`crossBonus`：底是面包时 ×2 |
| 配料 | — | default 1 |

### 评分阈值（Kitchen.jsx）

每槽 `score = rarity × multiplier`（非线性：rarity 用 QUALITY_CONFIG.scoreValue）。全槽求和，按 baseline 映射：

| 条件 | 评级 | 人气值 Δ |
|------|------|---------|
| `total ≥ baseline × 2.5` | 惊艳 | +2 |
| `total ≥ baseline × 1.8` | 优秀 | +1 |
| `total ≥ baseline × 1.0` | 合格 | 0 |
| `total ≥ baseline × 0.5` | 勉强 | -1 |
| `total < baseline × 0.5` | 翻车 | -2 |

"default 0" 的槽位意味着**必须放该大类食材**：放其它大类 → 倍率 0 → 该槽 0 分。

---

## 配置面板（LIVE_CONFIG）

GameCore header 的 **⚙ 按钮**打开 `ConfigPanel`（2026-04-20 加）。可调：

- **品质 roll 概率**：5 档 weight（合计显示）
- **墙面符号比例**：doom/gold/order/bomb/道具 spawnChance
- **局面布局 & 抽取**：3×3 ↔ 4×4 切换；进店抽取次数（goldPerTurn）
- **订单模板**：每个模板的 weight / rewardQuality / ingredientTypes / qualityDist 或 reqBudget

底部：
- 重置默认（DEFAULTS 深拷贝复位）
- 导出 JSON（复制到剪贴板 + 填到文本框）
- 导入 JSON（文本框粘贴 + 点导入）

**不持久化**：F5 回默认。仅开发/调试用。

实装：`src/data/runtimeConfig.js` 的 `LIVE_CONFIG` 对象 + 订阅者（`useSyncExternalStore`）；消费者（`rollQuality` / `pickWeightedTemplate` / `generateWall` / `startNewTurn` 的 goldPerTurn）在 call time 读，写入后 version bump 触发重渲。

---

## 附录：数值汇总表

### Day 结构
| 项目 | 值 |
|------|------|
| 每次进市场抽数 | 3 |
| 进市场前 3 选 1 | 有 |
| 菜篮容量 | 10 |
| 交换区容量 | 4 |
| HP（耐久度） | 5（初始 5，上限 5） |
| 人群初始 danger | 1 |

### 墙生成
| 项目 | 值 |
|------|------|
| 墙大小 | 4×4 |
| 抢菜人 | 15% / 格 |
| 抽数 🎫 | 3% / 格 |
| 订单 📋 | 7% / 格 |
| 炸弹 💣 | 5% / 格 |
| 食材格 | 70% / 格（余下）|
| 形状权重 | 1:60 / 2:30 / 3:10 |

### 品质
| 档 | 名 | scoreValue | roll 概率 |
|---|------|-----------|----------|
| 1 | 普通 | 1 | 40% |
| 2 | 精选 | 2 | 30% |
| 3 | 优质 | 3 | 18% |
| 4 | 顶级 | 5 | 8% |
| 5 | 传说 | 8 | 4% |

### 订单模板
| id | weight | rewardQuality | types | 需求 |
|----|--------|--------------|-------|------|
| easy | 30 | 2 | 2 | reqBudget 2 |
| medium | 40 | 3 | 2 | reqBudget 3 |
| hard | 20 | 4 | 3 | qualityDist [3,2,1] |
| extreme | 10 | 5 | 3 | qualityDist [3,3,2] |

### 菜品评级
| 条件 | 评级 | Δ 人气 |
|------|------|--------|
| total ≥ baseline × 2.5 | 惊艳 | +2 |
| total ≥ baseline × 1.8 | 优秀 | +1 |
| total ≥ baseline × 1.0 | 合格 | 0 |
| total ≥ baseline × 0.5 | 勉强 | -1 |
| total < baseline × 0.5 | 翻车 | -2 |

---

*文档版本：2026-04-21 ingredient-trade-flex-io 分支*
