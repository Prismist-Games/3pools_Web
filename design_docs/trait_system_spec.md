# 特质系统设计文档 v1.0

本文档描述特质系统的完整规则、数值和实现需求。实现范围：特质 + 注入 + 融合交互 + 订单价值调整 + UI。**暂不修改词缀**——物品抽出时随机赋予特质。

---

## 0. 前置信息

### 0.1 必读文档

实现前**必须**先阅读以下两份文档：

1. **`design_docs/game_rules.md`** — 完整游戏规则。理解当前的物品、奖池、词缀、订单、融合、背包等所有机制。
2. **`design_docs/codebase_technical_reference.md`** — 完整代码架构。理解文件结构、数据流、状态管理、每个文件的职责。

### 0.2 当前代码中已有的价值系统基础设施

以下代码**已存在**，本次实现需要在其基础上扩展：

- **`helpers.js`**:
  - `getBaseValue(rarityId, config)` — 从 `config.valueSystem.baseValues` 查品质基础价值（当前未配置默认值，返回 0）
  - `getCompositeRarity(totalValue, componentCount, config)` — 根据总价值查阈值表返回显示品质
  - `getItemValue(item, config)` — 如果 `item.value !== undefined` 返回它，否则从品质计算。**需要重写**以支持特质
  - `rollRequiredValue(config)` — 从 `config.progress.orderValueWeights` 加权随机生成订单价值需求。当前权重是 `{0:0.4, 1:0.35, 2:0.2, 3:0.05}`（索引值），**需要替换**为本文档的实际价值数值

- **物品对象当前结构**（在 `useGameLogic.js` 中创建）：
  ```javascript
  {
    item_data: { name: "苹果", icon: "🍎", poolId: "fruit", poolName: "水果" },
    rarity: { id: "rare", name: "稀有", bonus: 0.25, recycleValue: 1, ... },
    sterile: false,
    decay: undefined,
    uid: "随机UUID"
  }
  ```

- **融合（合成）逻辑**（在 `useGameLogic.js` 的 `handleSlotClick` 中）：
  - 条件：同名、同品质、非 mythic、双方非 sterile、衰变非 0
  - 结果：消耗两个物品，生成品质+1 的新物品
  - **需要扩展**：继承特质、合并注入次数、追踪组件数

### 0.3 需要修改的文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/data/constants.js` | 新增 `TRAIT_DEFINITIONS`；在 `INITIAL_GAME_CONFIG` 中添加 `valueSystem.baseValues`、`traitSystem` 配置、更新 `progress.orderValueWeights` |
| `src/utils/helpers.js` | 重写 `getItemValue` 支持特质；新增特质工具函数（`rollTrait`、`applyInfusion`、`getTraitDefinition` 等）；更新 `rollRequiredValue` |
| `src/hooks/useGameLogic.js` | 新增 `handleInfuse` 动作；修改物品创建逻辑添加特质字段；修改合成逻辑处理特质继承；新增 `infuseMode` 交互状态；在抽卡后触发每回合特质效果 |
| `src/components/game/InventorySlot.jsx` | 显示特质标记；扩展 tooltip 显示特质详情和价值分解；新增注入模式视觉状态 |
| `src/components/game/OrderCard.jsx` | 显示数值价值需求（替代品质需求）；显示当前价值 vs 需求对比 |
| `src/App.jsx` | 在设置 UI 中添加 `valueSystem.baseValues` 编辑器 |
| `src/utils/translations.js` | 添加所有特质名称和描述的英文翻译 |
| `GameCore.jsx` | 传递注入相关 state/actions 给子组件；新增特质选择弹窗（融合时）和注入预览 UI |

### 0.4 现有提交流程说明

当前游戏的提交流程：玩家在提交模式中选择背包物品 → 系统自动匹配所有可满足的订单 → 一次性提交。每个订单有多个需求（2-4个物品），每个需求指定物品名字。

**本次修改后**：每个订单需求增加一个最低价值要求（替代原来的品质要求）。提交逻辑中的品质匹配检查改为价值匹配检查：`getItemValue(item) >= requirement.requiredValue`。

---

## 1. 物品价值体系

### 1.1 一阶物品基础价值

每个品质等级对应一个基础价值，配置于 `config.valueSystem.baseValues`：

| 品质 | ID | 基础价值 |
|------|----|----------|
| 普通 | common | 0 |
| 优秀 | uncommon | 2 |
| 稀有 | rare | 4 |
| 史诗 | epic | 7 |
| 传说 | legendary | 12 |
| 神话 | mythic | 20 |

### 1.2 融合体品质（价值反推）

融合体不使用品质等级，而是根据总价值查阈值表显示对应品质颜色/名称。

`config.valueSystem.compositeQualityThresholds` 默认值：

```json
{ "default": [0, 2, 4, 7, 12, 20] }
```

即：价值 0-1 显示普通，2-3 显示优秀，4-6 显示稀有，7-11 显示史诗，12-19 显示传说，20+ 显示神话。

### 1.3 物品价值计算

```
总价值 = floor((基础价值 + 永久加值) × 条件乘区)  + 条件加区

其中：
- 基础价值：由品质决定（见 1.1）
- 永久加值：由触发型特质效果累积（注入触发、每回合触发等），永久存在
- 条件乘区：由当前激活的乘法型光环特质决定（多个相乘），无乘法特质时 = 1
- 条件加区：由当前激活的加法型光环特质决定（多个相加），无加法特质时 = 0
```

**重要**：总价值最低为 0，不会出现负数。

---

## 2. 特质系统

### 2.1 基本概念

特质是附着在物品上的一句话效果。每条特质有一个唯一 ID 和效果描述。

### 2.2 特质获取

- **抽取时**：优秀（绿色）及以上品质的物品抽出时，随机获得 1 条特质。普通（白色）物品不带特质。
- **白色合成时**：两个同名普通物品合成为优秀时，结果自动获得 1 条随机特质。
- **注入时**：材料的特质转移到目标上（详见注入系统）。
- **融合时**：结果继承双方所有特质（详见融合与特质）。

### 2.3 特质上限

| 物品类型 | 特质上限 |
|----------|----------|
| 单物品（未融合） | 1 |
| 双物品融合体 | 2 |
| 三物品及以上融合体 | 3 |

"组件数"指构成该物品的原始（未融合）物品总数。`componentCount` 已在现有代码中追踪。

上限上限为 3，无论组件数多少。

**特质 `extra_trait_1`（特质条目上限+1）可永久增加上限**（详见特质列表）。

### 2.4 特质效果类型

| 类型 | 触发时机 | 移除特质后 |
|------|----------|------------|
| 永久触发型 | 条件满足时立即永久改变 `永久加值` | 已生效的加值不消失 |
| 持续光环型（加法） | 特质存在时持续计入 `条件加区` | 效果消失 |
| 持续光环型（乘法） | 特质存在时持续计入 `条件乘区` | 效果消失 |
| 永久容量型 | 获得特质时立即永久改变容量参数 | 容量不回退 |

---

## 3. 完整特质列表

### 3.1 被动光环型

| ID | 效果 | 类型 | 数值说明 |
|----|------|------|----------|
| `flat_value_2` | 价值+2 | 光环-加法 | 条件加区 +2 |
| `multiplier_1_5` | 价值×1.5 | 光环-乘法 | 条件乘区 ×1.5 |
| `virgin_double` | 从未被注入过时，价值×2 | 光环-乘法（条件） | 当 `infusionHistory.length === 0` 时条件乘区 ×2，否则 ×1 |
| `same_pool_synergy` | 背包中每有一个其他同类型池物品，价值+1 | 光环-加法（动态） | 条件加区 += 背包中同 poolId 物品数（不含自身） |
| `decay_infuse` | 价值每回合-1，每次被注入时+3 | 永久触发（双触发） | 每回合（每次抽奖后）永久加值 -1；每次被注入时永久加值 +3 |

### 3.2 注入触发型——类型池条件（5条）

当本物品**被注入**时，若**材料**属于指定类型池，永久加值 +1。

| ID | 触发条件 | 加值 |
|----|----------|------|
| `infuse_fruit` | 材料来自水果池 | +1 |
| `infuse_medicine` | 材料来自药物池 | +1 |
| `infuse_electronics` | 材料来自电器池 | +1 |
| `infuse_kitchenware` | 材料来自厨具池 | +1 |
| `infuse_stationery` | 材料来自文具池 | +1 |

### 3.3 注入触发型——具体名字条件（20条）

当本物品**被注入**时，若**材料**是指定名字的物品，永久加值 +2。

| ID | 触发条件（材料名字） | 加值 |
|----|----------------------|------|
| `infuse_watermelon` | 西瓜 | +2 |
| `infuse_lemon` | 柠檬 | +2 |
| `infuse_mango` | 芒果 | +2 |
| `infuse_apple` | 苹果 | +2 |
| `infuse_powder_drink` | 冲剂 | +2 |
| `infuse_eye_drops` | 滴眼液 | +2 |
| `infuse_syringe` | 注射器 | +2 |
| `infuse_capsule` | 胶囊 | +2 |
| `infuse_pencil` | 铅笔 | +2 |
| `infuse_eraser` | 橡皮 | +2 |
| `infuse_stapler` | 订书机 | +2 |
| `infuse_notebook` | 笔记本 | +2 |
| `infuse_frying_pan` | 平底锅 | +2 |
| `infuse_kitchen_knife` | 菜刀 | +2 |
| `infuse_cutting_board` | 砧板 | +2 |
| `infuse_soup_spoon` | 汤勺 | +2 |
| `infuse_phone` | 手机 | +2 |
| `infuse_earphones` | 耳机 | +2 |
| `infuse_ac` | 空调 | +2 |
| `infuse_computer` | 电脑 | +2 |

### 3.4 注入触发型——品质条件（2条）

| ID | 效果 | 类型 | 加值 |
|----|------|------|------|
| `infuse_uncommon_plus` | 注入优秀以上品质物品时+1 | 永久触发 | 材料品质 ≥ uncommon 时 +1 |
| `infuse_rare_plus` | 注入稀有以上品质物品时+3 | 永久触发 | 材料品质 ≥ rare 时 +3 |

### 3.5 注入触发型——其他条件（4条）

| ID | 效果 | 类型 | 说明 |
|----|------|------|------|
| `infuse_same_name` | 注入同名物品时+3 | 永久触发 | 材料名字 === 目标名字时，永久加值 +3 |
| `infuse_different_pool` | 注入不同类型池物品时+2 | 永久触发 | 材料 poolId !== 目标 poolId 时，永久加值 +2 |
| `infuse_common_free` | 注入白色物品时，不消耗注入次数 | 特殊规则 | 材料品质 === common 时，本次注入不扣减 `remainingInfusions` |
| `infuse_order_match` | 注入满足活跃订单名字需求的物品时+3 | 永久触发 | 材料的名字出现在当前任一活跃订单（普通+撤离）的需求列表中时，永久加值 +3 |

### 3.6 材料型（被消耗时触发）

当本物品作为注入**材料被消耗**时触发。效果作用于目标物品或全局。

| ID | 效果 | 说明 |
|----|------|------|
| `material_full_value` | 目标获得本物品全部当前价值 | 目标永久加值 += 本物品当前总价值 |
| `material_infuse_count` | 目标注入次数上限+1 | 目标 `maxInfusions` 永久 +1 |
| `material_inventory_boost` | 背包中所有物品各+1价值 | 背包中每个物品的永久加值 +1（包括目标） |
| `material_refund` | 获得本物品品质对应的回收金币 | 玩家获得 `recycleValue` 对应金币（消耗仍然发生） |

### 3.7 融合型

| ID | 效果 | 说明 |
|----|------|------|
| `fusion_value_3` | 融合时，结果物品价值+3 | 当本物品参与融合时，结果物品的永久加值 +3。若双方都有此特质，+6。 |

### 3.8 容量型（永久生效）

获得此特质时立即永久修改对应容量参数。即使之后此特质被替换/移除，容量不回退。

| ID | 效果 | 说明 |
|----|------|------|
| `extra_infuse_3` | 注入次数上限+3 | `maxInfusions` 永久 +3 |
| `extra_trait_1` | 特质条目上限+1 | `maxTraits` 永久 +1 |

### 3.9 特殊型

| ID | 效果 | 说明 |
|----|------|------|
| `recycle_double` | 回收本物品时，获得双倍金币 | `recycleValue × 2` |
| `infuse_burst` | 首次被注入时+5价值，之后本特质消失 | 第一次被注入时永久加值 +5（在其他触发之后），然后移除本特质，特质槽位变空 |

### 3.10 特质汇总

| 类别 | 数量 |
|------|------|
| 被动光环 | 5 |
| 类型池触发 | 5 |
| 名字触发 | 20 |
| 品质触发 | 2 |
| 其他注入触发 | 4 |
| 材料型 | 4 |
| 融合型 | 1 |
| 容量型 | 2 |
| 特殊型 | 2 |
| **总计** | **45** |

---

## 4. 特质出现概率

物品获得特质时（抽取、白色合成）的加权随机：

1. **40% 概率**进入"类型池/名字"大类：
   - 其中 **50%**（即总概率 20%）从 5 条类型池触发中等权随机选 1 条
   - 其中 **50%**（即总概率 20%）从 20 条名字触发中等权随机选 1 条
2. **60% 概率**从剩余 20 条特质中等权随机选 1 条（每条 3%）

"剩余 20 条" = 5 被动光环 + 2 品质触发 + 4 其他注入触发 + 4 材料型 + 1 融合型 + 2 容量型 + 2 特殊型 = 20。

---

## 5. 注入系统

### 5.1 基本规则

- **材料限制**：只有**单物品**（未融合，`componentCount === 1`）可以作为注入材料。融合体不能作为材料。
- **目标限制**：任何物品（单物品或融合体）都可以作为注入目标，只要有剩余注入次数。
- **消耗**：注入完成后材料物品被销毁。
- **注入次数**：每个单物品初始有 **3 次**注入上限（`maxInfusions = 3`）。每次被注入消耗 1 次。剩余次数为 0 时不能被注入。

### 5.2 注入流程

```
玩家选择 材料（单物品） 和 目标 → 执行以下步骤：

1. 检查目标 remainingInfusions > 0，否则失败
2. 记录材料信息到目标的 infusionHistory：
   { name, poolId, rarityId }
3. 触发目标特质中所有注入触发型效果（按条件判定）
4. 触发材料特质中所有材料型效果
5. 处理特质转移：
   a. 如果材料没有特质（普通品质物品）→ 跳过转移
   b. 如果目标特质数 < 目标特质上限 → 材料特质填入空槽
   c. 如果目标特质数 ≥ 目标特质上限 → 弹出选择界面：
      - 玩家可选择用材料特质替换一条已有特质
      - 或者放弃材料特质（不替换）
6. 扣减目标 remainingInfusions -= 1
   （除非触发了 infuse_common_free：材料品质为普通时不扣减）
7. 销毁材料物品
```

**注意**：步骤 3 和 4 的触发效果是即时永久的。即使步骤 5 中玩家选择放弃材料特质，触发效果仍然生效。

### 5.3 注入历史

每个物品维护一个 `infusionHistory` 数组，记录每次被注入时材料的 `{ name, poolId, rarityId }`。此历史是永久的，不会因特质变化而改变。用于判定条件型特质（如 `virgin_double` 检查历史是否为空）。

### 5.4 注入次数继承（融合时）

融合时，结果物品的 `remainingInfusions = 双方 remainingInfusions 之和`。

示例：物品A（剩余2次）+ 物品B（剩余3次）→ 结果（剩余5次）。

---

## 6. 融合与特质

### 6.1 特质继承

融合时，结果物品**自动继承双方所有特质**。

- 如果合并后特质总数 ≤ 结果的特质上限：全部保留。
- 如果超出上限：弹出选择界面，玩家选择**丢弃**超出的特质，直到等于上限。
- **重复特质**：如果双方有相同 ID 的特质，去重保留 1 条（不叠加）。

### 6.2 白色合成特殊规则

两个普通物品合成为优秀时（双方都无特质），结果自动获得 1 条随机特质（按第 4 节概率）。结果的特质上限为 2（因为是双物品融合体），所以有 1 个空特质槽位。

### 6.3 融合型特质触发

如果参与融合的物品带有 `fusion_value_3`，在融合完成后触发：结果物品的永久加值 +3（每个带此特质的亲本各触发一次）。

### 6.4 注入历史继承

融合时，结果的 `infusionHistory = 双方 infusionHistory 合并`。

### 6.5 容量计算

```
结果 componentCount = 双方 componentCount 之和
结果 maxTraits = min(componentCount, 3) + 永久容量加成
结果 maxInfusions = 双方 remainingInfusions 之和 + 永久容量加成
```

---

## 7. 订单系统调整

### 7.1 订单需求

每个订单需求指定**物品名字**和**最低价值**。提交的物品必须：
- 名字匹配
- 总价值 ≥ 需求的最低价值

### 7.2 订单价值需求生成

每个需求的最低价值从以下加权分布随机生成：

```json
"orderValueWeights": {
  "3": 0.15,
  "4": 0.25,
  "5": 0.25,
  "6": 0.15,
  "7": 0.10,
  "8": 0.05,
  "10": 0.03,
  "12": 0.02
}
```

平均需求价值 ≈ 5.1。

### 7.3 订单奖励

```
订单积分奖励 = ceil(订单所有需求价值之和 × rewardMultiplier)
订单金币奖励 = floor(订单所有需求价值之和 × 0.5)
```

`rewardMultiplier` 默认为 1，可在配置中调整。

### 7.4 设计意图验证

| 场景 | 基础价值 | 特质/注入贡献 | 总价值 | 可满足需求 |
|------|----------|--------------|--------|------------|
| 优秀物品，无注入 | 2 | 被动 +2 | 4 | 简单 (3-4) |
| 优秀物品，3次类型匹配注入 | 2 | +3 | 5 | 简单-中等 |
| 稀有物品（融合），2条特质 | 4 | 被动+2, 注入+3 | 9 | 中等-困难 |
| 史诗物品，无注入 | 7 | 被动 +2 | 9 | 中等-困难 |
| 稀有物品，最优化注入 | 4 | 多触发叠加 +8 | 12 | 困难-极难 |
| 传说物品 + 少量注入 | 12 | +3 | 15 | 极难 |

**结论**：多数情况下需要 1-3 次注入才能满足订单；纯融合升品质路线对简单订单可行但不足以应对中高难度。

---

## 8. 物品数据结构变更

在现有物品对象上新增以下字段：

```javascript
{
  // --- 已有字段 ---
  item_data: { name, icon, poolId },
  rarity: { id, bonus, recycleValue, ... },
  sterile: false,
  uid: "xxx",

  // --- 新增字段 ---
  traits: [],                  // 当前特质 ID 数组，如 ["infuse_fruit", "flat_value_2"]
  permanentBonus: 0,           // 永久加值（由触发型效果累积）
  infusionHistory: [],         // 注入历史，每条为 { name, poolId, rarityId }
  remainingInfusions: 3,       // 剩余可注入次数
  maxInfusions: 3,             // 注入次数上限（可被特质/融合修改）
  maxTraits: 1,                // 特质上限（由 componentCount 和容量特质决定）
  componentCount: 1,           // 组件数（融合时相加）
  value: undefined,            // 缓存的总价值（每次相关变化时重算）
}
```

### 8.1 价值计算函数（更新 getItemValue）

```javascript
export const getItemValue = (item, config, inventoryItems = []) => {
  if (!item) return 0;

  const baseValue = getBaseValue(item.rarity?.id, config);
  const permanentBonus = item.permanentBonus || 0;

  // 计算条件加区和条件乘区（由当前激活的特质决定）
  let additiveAura = 0;
  let multiplicativeAura = 1;

  for (const traitId of (item.traits || [])) {
    const trait = TRAIT_DEFINITIONS[traitId];
    if (!trait || trait.effectType !== 'aura') continue;

    if (trait.auraType === 'additive') {
      additiveAura += trait.calcAdditive(item, inventoryItems);
    } else if (trait.auraType === 'multiplicative') {
      multiplicativeAura *= trait.calcMultiplicative(item, inventoryItems);
    }
  }

  return Math.max(0, Math.floor(
    (baseValue + permanentBonus + additiveAura) * multiplicativeAura
  ));
};
```

---

## 9. 注入在游戏流程中的位置

### 9.1 何时可以注入

注入是一个**背包管理动作**，和现有的合成、回收、工具使用平级。玩家在**非模式状态**下（非提交、非回收、非撤离、非待定物品、非词缀交互、非工具选择）随时可以发起注入。

### 9.2 注入交互流程（遵循现有 toolSelectionMode 模式）

注入使用和工具物品相同的交互模式：

1. **发起**：玩家**右键点击**一个单物品（`componentCount === 1`，非工具物品）→ 进入 `infuseMode`
   - 在 `useGameLogic` 中新增 state：`infuseMode: { materialIndex: number } | null`
   - 类似 `toolSelectionMode` 的实现方式
2. **选择目标**：背包中所有 `remainingInfusions > 0` 的物品高亮（紫色 ring-4），其余物品灰化
   - 被选为材料的物品自身显示"材料"标签，不可作为目标
3. **点击目标**：
   - 如果材料有特质且目标特质已满 → 弹出特质选择弹窗（见 9.5）
   - 否则 → 直接执行注入（第 5 节流程）
4. **取消**：点击空格或按 Escape → 退出 infuseMode

### 9.3 互斥规则

`infuseMode` 与所有其他模式互斥（和 `toolSelectionMode` 的互斥规则一致）。进入 `infuseMode` 时清除 `selectedSlot`。`pendingItem` 存在时不能进入 `infuseMode`。

### 9.4 注入的状态管理

在 `useGameLogic.js` 中新增：

```javascript
// State
const [infuseMode, setInfuseMode] = useState(null); // { materialIndex }

// Action: 右键触发
const handleStartInfuse = (index) => {
  const item = inventory[index];
  // 守卫: 非空、非工具、componentCount === 1、非模式中
  if (!item || item.isTool || (item.componentCount || 1) > 1) return;
  if (isSubmitMode || isRecycleMode || isEvacuationMode || pendingItem || selectionMode || toolSelectionMode) return;
  setInfuseMode({ materialIndex: index });
  setSelectedSlot(null);
};

// Action: 选择目标执行注入
const handleInfuseTarget = (targetIndex) => { /* 第5节完整流程 */ };

// Action: 取消
const handleCancelInfuse = () => setInfuseMode(null);
```

在返回的 `state` 中添加 `infuseMode`，在 `actions` 中添加 `handleStartInfuse`、`handleInfuseTarget`、`handleCancelInfuse`。

### 9.5 特质选择弹窗（注入和融合共用）

当需要玩家在特质间做选择时（注入导致超限、融合导致超限），弹出模态框：

- 显示所有候选特质（每条特质的名称 + 完整效果描述）
- 显示当前物品的特质上限
- 玩家点击选择要保留的特质（高亮已选），或点击已选特质取消选择
- 确认按钮在选中数量 ≤ 上限时可用
- 如果是注入场景，还显示"放弃新特质"选项

实现方式：类似 `orderCandidates` 的弹窗机制，新增 `traitSelectionPending` state。

---

## 10. UI 需求

### 10.1 物品显示（修改 InventorySlot.jsx）

在现有物品卡片上新增：

- **价值数字**：物品卡片右上角显示总价值数字（白色描边小字）
- **特质标记**：物品图标下方显示 1-3 个小色点，表示特质数量。悬停色点显示特质名称
- **注入次数**：左下角小数字（如 "3/3"），仅当物品有注入历史或特质时显示

**Tooltip 扩展**（使用现有 ToolItemTooltip 的 portal 模式）：
- 物品名字 + 显示品质
- **价值分解**：`基础 X + 永久 Y + 光环 Z = 总价值 W`
- 每条特质：名称 + 效果描述（一行一条）
- 注入信息：`剩余注入 N/M` + 历史摘要（"已注入：水果×2"）

### 10.2 注入模式视觉状态

| 元素 | 注入模式下的表现 |
|------|-----------------|
| 材料物品 | 紫色边框 + "材料" 标签 + 不可点击 |
| 可注入目标（remainingInfusions > 0） | 紫色 ring-4 + 可点击 |
| 不可注入物品（无剩余次数/工具/材料自身） | 灰度 50% + pointer-events-none |
| 奖池区域 | 灰度禁用（和 toolSelectionMode 一致） |
| 底部状态栏 | 显示 "注入模式：选择目标物品" 提示文字 |

### 10.3 融合特质选择界面

融合发生在 `handleSlotClick` 的合成分支中。如果合成后特质超限：
1. 合成结果暂存
2. 弹出特质选择弹窗（9.5）
3. 玩家选择后，将选定的特质写入结果物品
4. 将结果物品放入背包

### 10.4 订单显示（修改 OrderCard.jsx）

每个订单需求项当前显示品质色点 + 物品图标 + 名称。修改为：
- 物品图标 + 名称 + **价值需求数字**（如 "≥5"）
- 已分配物品时：显示该物品的当前总价值。**价值 ≥ 需求时绿色**，**不足时红色**
- 订单奖励显示：更新为基于价值需求之和计算

---

## 10. 边界情况

### 10.1 普通物品作为注入材料

普通物品没有特质。作为材料时：
- 目标的注入触发型效果正常判定（基于材料的名字、类型池、品质）
- 材料型效果不触发（材料无特质）
- 特质转移步骤跳过（无特质可转移）
- 消耗注入次数（除非 `infuse_common_free` 生效）

**设计意图**：普通物品是廉价的注入燃料，能触发目标的条件型特质，且不会带来不需要的特质。

### 10.2 `virgin_double` 与注入的交互

- 条件检查 `infusionHistory.length === 0`
- 一旦物品被注入过（即使注入的是普通物品），条件永久不满足
- 特质仍占槽位，但乘区贡献变为 ×1（无效果）
- 玩家可通过后续注入替换掉此特质

### 10.3 `infuse_common_free` 与注入次数

- 材料品质为 common 时，步骤 6 中不扣减 `remainingInfusions`
- 可以用无限个普通物品注入（只受背包空间和材料供应限制）
- 注入历史仍然记录（影响 `virgin_double` 等条件）

### 10.4 `extra_infuse_3` 和 `extra_trait_1` 的永久性

- 获得这些特质时，立即且永久修改 `maxInfusions` 或 `maxTraits`
- 之后即使该特质被替换/移除，容量不回退
- 这意味着玩家可以获得容量特质 → 享受容量增加 → 再把特质替换为其他效果

### 10.5 `infuse_burst` 后的空槽

- 触发后特质被移除，对应槽位变空
- 空槽可通过后续注入填充

### 10.6 `material_full_value` 的价值计算

- "本物品全部当前价值"指本物品在被消耗**瞬间**的总价值（含基础、永久加值、光环）
- 此值加入目标的 `permanentBonus`

### 10.7 `material_inventory_boost` 范围

- "背包中所有物品"包括目标物品自身
- 不包括待定队列中的物品

### 10.8 `decay_infuse` 的回合计数

- "每回合"定义为**每次玩家从奖池抽取后**（与现有衰变系统一致）
- 永久加值可能变为负数，但总价值 floor 为 0

### 10.9 融合时的重复特质

- 如果双方有相同 ID 的特质（如都有 `infuse_fruit`），结果只保留 1 条
- 去重在选择之前进行：玩家看到的是去重后的特质列表

### 10.10 `fusion_value_3` 的触发

- 在融合的第 6.3 步触发（继承和选择完成后）
- 如果此特质在选择阶段被玩家丢弃，则不触发
- 如果此特质被保留在结果中，则触发

### 10.11 绝育物品

- 带 `sterile` 标记的物品不能融合，但可以正常参与注入（作为材料或目标）
- 绝育物品的特质上限始终为 1（无法通过融合提升）

### 10.12 工具物品

- 工具物品（命运熔炉、万象棱镜、星辉祝福）不带特质，不参与注入系统
- 命运熔炉改变品质时，不影响物品的特质、永久加值或注入历史
- 万象棱镜改变名字时，不影响特质（但可能使某些名字相关特质的条件改变）

### 10.13 注入同名物品的判定

- `infuse_same_name`：材料的 `item_data.name === 目标的 item_data.name`
- 融合体的名字取其原始名字（融合前双方必须同名）

---

## 11. 配置结构

以下配置需要添加/修改到 `config`（可通过 settings UI 或 JSON 配置）：

```javascript
// 在 valueSystem 下新增
valueSystem: {
  baseValues: {
    common: 0,
    uncommon: 2,
    rare: 4,
    epic: 7,
    legendary: 12,
    mythic: 20
  },
  compositeQualityThresholds: {
    default: [0, 2, 4, 7, 12, 20]
  },
  rewardMultiplier: 1
},

// 特质系统配置
traitSystem: {
  enabled: true,
  baseInfusionCount: 3,         // 单物品初始注入上限
  maxTraitSlots: 3,             // 特质上限的硬上限
  minRarityForTrait: "uncommon", // 最低获得特质的品质
  traitWeights: {
    categoryPool: 0.4,           // 类型池/名字类大类总权重
    categoryPoolSplit: 0.5,      // 大类内：类型池 vs 名字 的分割
    otherTraits: 0.6             // 其他特质总权重（内部等权）
  }
},

// 订单价值需求
progress: {
  orderValueWeights: {
    3: 0.15,
    4: 0.25,
    5: 0.25,
    6: 0.15,
    7: 0.10,
    8: 0.05,
    10: 0.03,
    12: 0.02
  }
}
```

---

## 12. TRAIT_DEFINITIONS 数据结构

每条特质在代码中的定义格式：

```javascript
// src/data/constants.js 中新增
export const TRAIT_DEFINITIONS = {
  flat_value_2: {
    id: 'flat_value_2',
    name: '坚固',           // 中文显示名
    desc: '价值+2',         // 中文效果描述（显示在tooltip中）
    category: 'passive',    // 分类：passive | infuse_trigger | material | fusion | capacity | special
    effectType: 'aura',     // 效果类型：aura（光环）| trigger（触发）| permanent_capacity（永久容量）| special
    auraType: 'additive',   // 仅 aura 类型：additive | multiplicative
    // 光环计算函数：返回加值或乘值
    calcAdditive: (item, inventoryItems) => 2,
    // 不需要的函数字段可省略
  },

  infuse_fruit: {
    id: 'infuse_fruit',
    name: '水果亲和',
    desc: '注入水果时，价值+1',
    category: 'infuse_trigger',
    effectType: 'trigger',
    // 注入触发函数：接收材料信息，返回要加到 permanentBonus 的值
    onInfuse: (material, targetItem) => {
      return material.poolId === 'fruit' ? 1 : 0;
    },
  },

  material_full_value: {
    id: 'material_full_value',
    name: '精华转移',
    desc: '被消耗时，目标获得本物品全部当前价值',
    category: 'material',
    effectType: 'trigger',
    // 材料触发函数：接收材料物品和目标物品，返回 { targetBonusAdd, goldAdd, inventoryBonusAdd }
    onConsumed: (materialItem, targetItem, config, inventoryItems) => {
      const materialValue = getItemValue(materialItem, config, inventoryItems);
      return { targetBonusAdd: materialValue };
    },
  },

  // ... 其余特质按此格式定义
};
```

每条特质**必须**有：`id`, `name`, `desc`, `category`, `effectType`。
根据 effectType 不同，额外需要：
- `aura` → `auraType` + `calcAdditive` 或 `calcMultiplicative`
- `trigger` (infuse) → `onInfuse(material, targetItem) → number`
- `trigger` (material) → `onConsumed(materialItem, targetItem, config, inventory) → { targetBonusAdd?, goldAdd?, inventoryBonusAdd? }`
- `trigger` (fusion) → `onFusion(thisItem, otherItem, resultItem) → number`
- `trigger` (per_round) → `onRound(item) → number`（永久加值变化量）
- `permanent_capacity` → `capacityEffect: { maxInfusions?: number, maxTraits?: number }`
- `special` → 按具体逻辑在注入流程中特殊处理

---

## 13. 实现优先级

严格按此顺序实现，每步完成后验证：

### 第 1 步：配置和数据（不涉及游戏逻辑）
- 在 `constants.js` 中添加 `TRAIT_DEFINITIONS`（全部 45 条）
- 在 `INITIAL_GAME_CONFIG` 中添加 `valueSystem.baseValues`、`traitSystem` 配置
- 更新 `progress.orderValueWeights` 为新的价值分布
- 验证：`npm run dev` 不报错

### 第 2 步：物品数据结构和价值计算
- 在物品创建逻辑中添加新字段（traits, permanentBonus, infusionHistory, remainingInfusions, maxInfusions, maxTraits, componentCount）
- 重写 `getItemValue` 支持特质效果
- 新增 `rollTrait(config)` 函数
- 在抽卡逻辑中：uncommon+ 物品自动获得 1 条随机特质
- 验证：抽出的绿色物品应在 tooltip 中显示特质

### 第 3 步：订单系统更新
- 修改订单生成：每个需求使用 `rollRequiredValue` 的新权重
- 修改订单满足判定：用 `getItemValue(item) >= req.requiredValue` 替代品质比较
- 修改订单显示：显示价值需求数字
- 验证：订单显示价值需求，提交时正确判定价值是否达标

### 第 4 步：融合特质交互
- 修改合成逻辑：继承双方特质、合并 infusionHistory、累加 remainingInfusions、累加 componentCount
- 白色合成时自动赋予特质
- 超限时弹出特质选择
- 融合型特质触发（fusion_value_3）
- 验证：两个有不同特质的物品合成后，结果有正确的特质组合

### 第 5 步：注入系统
- 新增 `infuseMode` state 和相关 actions
- 实现完整注入流程（第 5 节 7 步）
- 右键菜单/交互入口
- 注入模式视觉状态
- 特质转移/替换选择
- 验证：能选择材料→选择目标→看到价值变化→特质正确转移

### 第 6 步：每回合触发
- 在 `handleNormalDraw` 的末尾（`refreshPools` 之前），遍历背包所有物品，触发 `per_round` 型特质效果
- 验证：有 `decay_infuse` 特质的物品每次抽卡后价值 -1

### 第 7 步：UI 完善
- 物品卡片显示价值数字和特质标记
- 完善 tooltip 显示价值分解
- 注入预览（点击目标前预览效果）
- 验证：UI 信息完整、清晰

---

## 14. 验收标准

完成实现后，以下场景必须全部可正确执行：

### 基础验证
- [ ] 抽出 uncommon+ 物品时显示 1 条特质
- [ ] 抽出 common 物品时无特质
- [ ] 物品 tooltip 显示特质描述和价值分解
- [ ] 订单显示数值价值需求（如 "≥5"）

### 融合验证
- [ ] 两个 common 合成为 uncommon 后，结果自动获得 1 条随机特质，有 2 个特质槽位（1 已用，1 空）
- [ ] 两个 uncommon（各有 1 特质）合成后，结果继承双方特质（2 条）
- [ ] 合成导致特质超限时弹出选择界面
- [ ] 两个有相同特质的物品合成时，去重后只保留 1 条
- [ ] `fusion_value_3` 特质参与合成时，结果获得 +3 永久加值

### 注入验证
- [ ] 右键单物品（非工具、非融合体）进入注入模式
- [ ] 注入模式下：可注入目标高亮紫色，不可注入物品灰化
- [ ] 注入 common 物品（无特质）到有 `infuse_fruit` 特质的目标：如果是水果类材料，价值 +1
- [ ] 注入 uncommon 物品到特质已满的目标：弹出替换选择
- [ ] 注入消耗后 `remainingInfusions` 减少 1
- [ ] `remainingInfusions` 为 0 时不能被注入
- [ ] `infuse_common_free` 特质：注入 common 材料不消耗注入次数

### 价值验证
- [ ] `flat_value_2` 光环：物品价值比基础值多 2
- [ ] `multiplier_1_5` 光环：物品价值为 floor(基础 × 1.5)
- [ ] `virgin_double`：未被注入的物品价值 ×2；被注入后变为 ×1（价值下降）
- [ ] `material_full_value`：消耗材料时，目标永久加值增加材料的总价值
- [ ] 价值不会为负数（floor at 0）

### 提交验证
- [ ] 物品总价值 ≥ 订单需求价值时可以提交
- [ ] 物品总价值 < 订单需求价值时不能提交（显示红色）

---

*文档版本：v1.1*
*日期：2026-03-17*
