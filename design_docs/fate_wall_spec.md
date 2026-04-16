# Fate Wall (命运网格) - 实现规范

本文档是 fate wall 系统的完整实现规范, 自包含, 可直接用于实现. 基于 v2.1 (回合制原型) 扩展.

---

## 0. 目标与核心概念

### 设计目标

在现有 v2.1 基础上引入一个"玩家侧网格", 作为:
1. **防御层**: 承担原本直接扣 HP 的 Doom 伤害
2. **收益层**: 通过 Luck 抽取提供持续的局内收益
3. **构筑层**: 让玩家能通过空间布局和幸运符组合形成不同的玩法风味

### 核心概念: Fate Wall

- **4×4 网格**, 玩家拥有一个
- **单场内存在**, 每场开始清空 (不跨场保留)
- 网格上放的叫**幸运符 (charm)**, 每个占 1 格
- 每个格子状态: **空 / 含 1 个幸运符**

### 核心机制: 双重抽取

每个幸运符可以通过两种方式被抽到, 触发不同效果:

- **Luck 抽取** (每回合开始): 玩家选 row/col → 从该线已填幸运符随机抽 1 → 触发 luck 效果. **大部分幸运符不消耗**, 少数一次性触发后消失.
- **Doom 抽取** (每次 Doom 事件): 玩家选 row/col → 从该线随机抽 1 格. 命中幸运符 → 消耗挡 1 HP; 命中空格 → 1 HP 过到玩家.

---

## 1. 数据结构

### 1.1 Charm 对象

```js
{
  id: string,              // 唯一 ID, e.g. 'charm_1'
  type: CharmType,         // 见下方 CharmType 枚举
  isPersistent: boolean,   // Luck 后是否保留 (true = 持续, false = 一次性)
  isPassive: boolean,      // 是否被动 (不响应 Luck 直接触发, 如催化石/守护碑/诱饵)
  isBlank: boolean,        // 是否是起手空白 (只挡 doom, 不可覆盖)
  growthCount: number,     // 复利系列用, 追踪被 Luck 抽取次数. 初始 0.
  usesLeft: number,        // 炼金锅用, 初始 3, 用一次 -1, 为 0 则从网格移除.
}
```

### 1.2 CharmType 枚举

```js
const CHARM_TYPES = {
  // 起手
  BLANK: 'blank',

  // 基础 (通过 ✨ 生成)
  DRAW_COUNT: 'draw_count',        // 抽取次数
  STICKER: 'sticker',              // 贴纸
  ORDER: 'order',                  // 订单
  CATALYST: 'catalyst',            // 催化石
  GUARD_STONE: 'guard_stone',      // 守护碑
  COMPOUND: 'compound',            // 复利 (抽取次数成长版)
  DELAY_DOOM: 'delay_doom',        // 延缓厄运
  BAIT: 'bait',                    // 诱饵
  ALCHEMY_POT: 'alchemy_pot',      // 炼金锅
  RESONANCE_BELL: 'resonance_bell',// 共鸣钟
  COPY_MIRROR: 'copy_mirror',      // 复制镜

  // 只能通过炼金锅升级获得 (不由 ✨ 直接生成)
  COMPOUND_STICKER: 'compound_sticker',    // 复利贴纸
  COMPOUND_ORDER: 'compound_order',        // 复利订单
  ENHANCED_DELAY: 'enhanced_delay',        // 强化延缓
}
```

注: 基础的 `COMPOUND` (复利抽取次数) 既可以通过 ✨ 直接生成, 也可以通过炼金锅从 `DRAW_COUNT` 升级得到. 其他三种复利/强化版只能通过炼金锅获得.

### 1.3 Fate Wall State

```js
fateWall: {
  cells: Array(16).fill(null),  // flat 4x4, cells[row*4 + col]. null = 空, Charm 对象 = 占用
}
```

### 1.4 位置辅助函数

```js
// 获取 index 对应的 (row, col)
function indexToRC(index) {
  return { row: Math.floor(index / 4), col: index % 4 };
}

// (row, col) 转 index
function rcToIndex(row, col) {
  return row * 4 + col;
}

// 获取 index 的 4 个相邻格 (上下左右, 不含斜角). 边界外返回 undefined.
function getNeighbors(index) {
  const { row, col } = indexToRC(index);
  const neighbors = [];
  if (row > 0) neighbors.push(rcToIndex(row - 1, col));     // 上
  if (row < 3) neighbors.push(rcToIndex(row + 1, col));     // 下
  if (col > 0) neighbors.push(rcToIndex(row, col - 1));     // 左
  if (col < 3) neighbors.push(rcToIndex(row, col + 1));     // 右
  return neighbors;
}

// 获取某行的 4 个 index
function getRowIndices(row) {
  return [0, 1, 2, 3].map(col => rcToIndex(row, col));
}

// 获取某列的 4 个 index
function getColIndices(col) {
  return [0, 1, 2, 3].map(row => rcToIndex(row, col));
}
```

---

## 2. 幸运符完整目录

共 15 种 (11 种通过 ✨ 生成 + 4 种只能通过炼金锅升级获得).

### 2.1 基础产出类 (持续)

#### 抽取次数幸运符 (`DRAW_COUNT`)
- **Luck 效果**: 本回合获得 +1 次主墙抽取 (本回合总抽取次数 +1, 不跨回合)
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续 (Luck 抽取后保留)
- **生成权重**: 15%

#### 贴纸幸运符 (`STICKER`)
- **Luck 效果**: 从 8 种贴纸中随机 1 个 (均等权重), 加入背包. 背包满时进入 pending 队列.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续
- **生成权重**: 15%

#### 订单幸运符 (`ORDER`)
- **Luck 效果**: 生成 1 个新订单加入公告牌. 公告牌上限 5, 超出时挤掉**最旧**的订单.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续
- **生成权重**: 13%

### 2.2 位置-被动类 (持续)

#### 催化石 (`CATALYST`)
- **Luck 效果**: 催化石本身被 Luck 直接抽到时**无效果** (Luck 抽取浪费, 但催化石仍保留).
- **被动效果**: 当**相邻 4 格** (上下左右) 中任一幸运符被 Luck 抽到时, 该幸运符的 Luck 奖励数值 +1. 规则详见 §3.5.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续
- **生成权重**: 12%
- **叠加规则**: 单个格子受多个催化石影响时, **最多只 +1** (多催化石不叠加).

#### 守护碑 (`GUARD_STONE`)
- **Luck 效果**: 守护碑本身被 Luck 直接抽到时**无效果**.
- **被动效果**: 当玩家在 Doom 抽取阶段选择 row/col 后, 该 row/col 内与守护碑**相邻 4 格**的幸运符**自动排除**, 不会被 Doom 选中. 守护碑**自己**仍可能被选中消耗.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续
- **生成权重**: 12%
- **叠加规则**: 每个格子最多被 1 个守护碑保护.

### 2.3 成长类

#### 复利幸运符 (`COMPOUND`)
- **Luck 效果**: 被 Luck 抽到时, `growthCount += 1` (capped at 4). 然后触发奖励: 本回合获得 +`growthCount` 次主墙抽取 (最多 +4).
  - 第 1 次抽到: +1 draw
  - 第 2 次抽到: +2 draws
  - 第 3 次抽到: +3 draws
  - 第 4 次及以后: +4 draws (封顶)
- **Doom 效果**: 消耗, 挡 1 HP. 消耗时 `growthCount` 清零 (如果这个实例以后被重建, 但通常直接消失).
- **持续性**: 持续 (Luck 不消耗)
- **生成权重**: 8% (通过 ✨) 或通过炼金锅从 `DRAW_COUNT` 升级获得

### 2.4 防御类

#### 延缓厄运幸运符 (`DELAY_DOOM`)
- **Luck 效果**: 本回合末 Doom 抽取次数 **-1** (最低为 0). 如果本回合有多个延缓被触发, 叠加减少.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续
- **生成权重**: 8%

#### 诱饵幸运符 (`BAIT`)
- **Luck 效果**: 诱饵本身被 Luck 直接抽到时**无效果**.
- **被动效果**: 当玩家在 Doom 抽取阶段选择 row/col 后, 如果该 row/col 内存在诱饵, **doom 优先命中诱饵之一** (多个诱饵时在 row/col 内随机选一个). 跨 row/col 不转移.
- **Doom 效果**: 被 Doom 选中时消耗, 挡 1 HP
- **持续性**: 被动持续 (直到被 Doom 吃掉)
- **生成权重**: 7%

### 2.5 稀有枢纽类

#### 炼金锅 (`ALCHEMY_POT`)
- **初始 `usesLeft`: 3**
- **Luck 效果**: 在**相邻 4 格**中随机选一个**可升级**的幸运符升级. 升级映射表见 §2.7. 使用一次后 `usesLeft -= 1`. 当 `usesLeft = 0` 时炼金锅从网格移除.
- **Doom 效果**: 消耗, 挡 1 HP
- **可升级目标**: 只有 4 种类型可以升级 (见 §2.7). 相邻格子必须是这 4 种之一才能作为升级目标.
- **如果相邻 4 格中没有可升级的目标**: 本次 Luck 无效果, **炼金锅也不消耗使用次数**.
- **持续性**: 持续 (直到 usesLeft 用完或被 Doom 吃掉)
- **生成权重**: 4%

### 2.6 一次性触发类

#### 共鸣钟 (`RESONANCE_BELL`)
- **Luck 效果**: 让相邻 4 格中**所有存在的幸运符**各触发一次 Luck 效果 (按某个确定顺序, 比如左上右下依次). 然后共鸣钟**自身从网格移除**.
- **连锁规则**: 共鸣钟触发相邻幸运符时:
  - 相邻被动幸运符 (催化石 / 守护碑 / 诱饵) 按各自规则正常工作 (催化石 +1 等)
  - 相邻复利幸运符正常成长 (growthCount +1)
  - 相邻其他一次性触发类 (炼金锅 / 共鸣钟 / 复制镜) **不触发** (不连锁)
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 一次性 (Luck 后从网格移除)
- **生成权重**: 3%

#### 复制镜 (`COPY_MIRROR`)
- **Luck 效果**: 玩家选相邻 4 格中的 1 个**非一次性**幸运符, 在网格任意空位复制一份新的副本 (新副本的 `growthCount` 从 0 开始, 不继承). 然后复制镜**自身从网格移除**.
- **如果相邻没有可复制的幸运符** (相邻全是空 / 只有一次性触发类): 复制镜**仍然消失**, 本次 Luck 无效果.
- **如果网格已满无空位**: 复制镜**仍然消失**, 本次 Luck 无效果.
- **可复制目标**: 除了 `RESONANCE_BELL`, `COPY_MIRROR`, `BLANK` 以外都可以复制.
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 一次性
- **生成权重**: 3%

### 2.7 炼金锅升级映射

| 原幸运符 | → 升级版 | 升级版效果 |
|---------|---------|----------|
| `DRAW_COUNT` | `COMPOUND` | 第 N 次 Luck → +N draws (cap +4), Doom 吃掉归零 |
| `STICKER` | `COMPOUND_STICKER` | 第 N 次 Luck → +N 随机贴纸 (cap +3) |
| `ORDER` | `COMPOUND_ORDER` | 第 N 次 Luck → +N 订单进公告牌 (cap +3) |
| `DELAY_DOOM` | `ENHANCED_DELAY` | Luck → 本回合末 Doom 次数 -2 (最低 0) |

升级时: 原幸运符从网格移除, 新升级版放在**同一位置**. 新升级版的 `growthCount` 从 0 开始.

**不可升级的类型**: `CATALYST`, `GUARD_STONE`, `BAIT`, `ALCHEMY_POT`, `RESONANCE_BELL`, `COPY_MIRROR`, `BLANK`, 以及所有复利/强化版本身 (不能二次升级). 炼金锅相邻只有这些时, 无效且不消耗使用次数.

### 2.8 复利/强化版 (仅通过升级获得)

#### 复利贴纸幸运符 (`COMPOUND_STICKER`)
- **Luck 效果**: `growthCount += 1` (cap at 3), 获得 +`growthCount` 个随机贴纸 (各自独立随机).
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续

#### 复利订单幸运符 (`COMPOUND_ORDER`)
- **Luck 效果**: `growthCount += 1` (cap at 3), 公告牌获得 +`growthCount` 个新订单 (超出上限顶旧).
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续

#### 强化延缓幸运符 (`ENHANCED_DELAY`)
- **Luck 效果**: 本回合末 Doom 抽取次数 -2 (最低 0).
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 持续

### 2.9 起手空白 (`BLANK`)

- **Luck 效果**: 无效果 (Luck 抽到空白时等于"触发了但什么都没发生", 空白**不被消耗**).
- **Doom 效果**: 消耗, 挡 1 HP
- **持续性**: 特殊 (Luck 不消耗, Doom 消耗)
- **生成方式**: 每场开始时**自动**放置 4 个在中心 2×2 位置 (index 5, 6, 9, 10). 玩家不操作.
- **覆盖规则**: **不能**被新幸运符覆盖. 只有在被 Doom 消耗后, 该位置才能被新幸运符放置.

---

## 3. 核心机制

### 3.1 每场开始

1. `fateWall.cells` 全部置 null
2. 在 index 5, 6, 9, 10 (中心 2×2) 各放置 1 个 `BLANK` charm
3. 重置所有回合级状态 (draws, 延缓计数, 等)

### 3.2 ✨ 潜能格 (主墙格子新类型)

- 主墙生成时, 新增一种格子类型 `FATE_CELL` (显示为 ✨), 形状 1 格
- 生成概率: **8%** (在现有权重池中插入, 按比例压缩其他格子的权重)
- 所有 5 种墙类型 (经典/神秘/乾坤/双倍/交叉) 都生成 ✨
- 神秘面纱的隐藏规则对 ✨ 正常生效 (可以隐藏)
- 双倍惊喜的 ×2 对 ✨ 不生效 (✨ 不加倍, 因为生成的 charm 是单个)

### 3.3 抽到 ✨ 的流程

1. 玩家在主墙抽到 ✨ → 该格从主墙移除 (和其他格子一样)
2. **按 §2 的生成权重表随机抽一个 11 种可生成 charm 之一**
3. **弹出 fate wall 放置模态**, 阻塞式, 玩家必须完成放置才能继续
4. 玩家在模态里选一个位置:
   - 空位 → 直接放置
   - 已占用的非空白 charm → 覆盖 (旧 charm **静默消失**, 不触发任何效果, 不还钱不回血)
   - 空白 (`BLANK`) → **不能选** (界面禁用)
   - 网格 16 格全是空白 (理论上不发生, 因为起手只有 4 个空白) → 必须选非空白的一个覆盖
5. 模态关闭, 玩家继续主墙抽取

### 3.4 Luck 抽取

**触发**: 每回合开始的第 1 步 (在玩家任何主墙抽取之前).

**流程**:
1. 系统弹出 fate wall luck 抽取模态, 阻塞式
2. 玩家选 1 个 row 或 1 个 col (4 行 + 4 列共 8 个选项)
3. 系统检查该 row/col 内**已填的幸运符** (过滤掉 null 空位):
   - 如果该 row/col 内**没有任何已填幸运符** → 弹出 "此行/列为空, 请重选", 玩家重选
   - 如果该 row/col 内有 ≥1 个已填幸运符 → 从中**均等随机**抽 1 个
4. 触发该 charm 的 luck 效果 (见 §3.6)
5. 如果该 charm 是一次性 (`isPersistent === false`) → 从网格移除
6. 如果该 charm 是持续 → 保留在原位 (包括复利的 growthCount 已更新)
7. 模态关闭, 进入主墙抽取阶段

**每回合只执行 1 次 Luck 抽取** (除非共鸣钟触发相邻, 但那不算新的 Luck 事件).

### 3.5 Luck 效果触发的详细顺序

当一个 charm 被 Luck 抽到时, 按以下顺序计算:

1. **基础效果计算**: 按 charm type 确定基础奖励数值 (e.g., `DRAW_COUNT` 给 +1 draw, `COMPOUND` 先 `growthCount += 1` 然后给 +growthCount draws)
2. **催化石加成**: 检查该 charm 的 4 个相邻格子, 如果**存在 ≥1 个 `CATALYST`**, 则该奖励的"数值类" +1:
   - `DRAW_COUNT` / `COMPOUND`: draws +1
   - `STICKER` / `COMPOUND_STICKER`: sticker 数量 +1 (再随机生成 1 个额外贴纸)
   - `ORDER` / `COMPOUND_ORDER`: orders +1
   - `DELAY_DOOM` / `ENHANCED_DELAY`: doom 次数再 -1
   - 其他触发/被动类: 无加成 (催化石对它们无效)
   - **注**: 单个目标最多 +1, 多个催化石相邻也只 +1
3. **Cap 检查 (§4)**: 应用到当前回合的增量数值上
4. **效果执行**: 将最终数值应用到 game state (更新 draws / 背包 / 公告牌 / doom 计数等)
5. **持续性处理**: 如果 `isPersistent === false`, 从网格移除该 charm

### 3.6 Doom 抽取

**触发**:
- 主墙上抽到 `💀` 结算格 → **立即**触发 N 次 Doom 抽取 (N = 当前 doom level), 暂停主墙抽取流程, 处理完再继续
- **回合末**自动触发 N 次 Doom 抽取 (N = 当前 doom level), 和 💀 触发独立计数

**流程** (单次 Doom 抽取):
1. 系统弹出 fate wall doom 抽取模态, 阻塞式
2. 玩家选 1 个 row 或 1 个 col
3. 系统确定该 row/col 内的**可命中目标** (按下列优先级):
   - **守护碑保护**: 先从该 row/col 的 4 个 index 中排除"与某个守护碑相邻"的所有 index. 但守护碑自己不排除.
   - **诱饵优先**: 在剩余可命中的 index 中, 如果**有 ≥1 个诱饵**, 则从诱饵中**均等随机**选 1 个作为命中目标. 跳到步骤 4.
   - **普通随机**: 如果没有诱饵, 则从剩余可命中的 index 中均等随机选 1 个 (包括空位和其他 charm)
4. 处理命中:
   - 空位 (null) → 玩家 HP -1
   - 任何 charm (包括守护碑自己 / 空白 / 诱饵 / 其他) → **该 charm 从网格移除**, HP 不变
5. 模态关闭, 继续下一次 Doom 抽取 (如果还有剩余 N 次), 或回到主流程

**特殊情况**:
- 如果该 row/col **所有 4 格都被守护碑排除**, 则玩家被迫选其他 row/col (重选)
- 如果整个网格都被守护碑保护到没有可命中的 row/col, 则 Doom 抽取自动"打空" (HP -1, 不消耗任何 charm). 这种情况极罕见.

### 3.7 Doom Level 和 ⬆️ / 💀

- **Doom level (抽取次数)**: 整数, 初始 1 (每场开始重置)
- **⬆️ 升级格** (主墙): 抽到时 `doomLevel += 1`
- **💀 结算格** (主墙): 抽到时立即触发 `doomLevel` 次 Doom 抽取 (见 §3.6)
- **回合末**: 自动触发 `doomLevel` 次 Doom 抽取
- **删除**: 10 格 danger grid, 每回合 +1 危险积累, 危险升级, "level = resolution count" 的旧公式

### 3.8 Luck 效果中的特殊机制

#### 共鸣钟 (§2.6) 触发相邻

当 `RESONANCE_BELL` 被 Luck 抽到时:
1. 共鸣钟的 Luck 效果: 获取自身相邻 4 格中所有已填 charm 列表
2. 对列表中每个相邻 charm, 按顺序 (左→右→上→下, 或 index 升序) 执行"模拟 Luck 触发":
   - 相邻 charm 的基础效果计算 (包括复利 growthCount +1, 正常数值)
   - 催化石加成仍然计算 (如果相邻 charm 的某个相邻也是催化石)
   - Cap 检查仍然应用 (全局 cap 按总触发效果计算)
   - **排除的连锁**: 如果相邻 charm 是 `RESONANCE_BELL` / `ALCHEMY_POT` / `COPY_MIRROR`, **跳过不触发** (不连锁)
   - **排除一次性**: 如果相邻 charm 是一次性的其他类型 (当前只有上面三个一次性), 所以全部跳过
   - 被动 charm (催化石 / 守护碑 / 诱饵) 被共鸣钟"触发"时无直接效果 (它们本来就不响应 Luck)
3. 持续性 charm 正常保留, 一次性不会被触发所以不涉及移除
4. 共鸣钟自身从网格移除 (它是一次性)

#### 炼金锅 (§2.5) Luck 触发

1. 获取相邻 4 格中**可升级**的 charm 列表 (只有 `DRAW_COUNT` / `STICKER` / `ORDER` / `DELAY_DOOM`)
2. 如果列表为空 → 本次 Luck 无效果, **炼金锅不消耗使用次数**
3. 否则从列表中**随机**选 1 个, 按 §2.7 映射表升级:
   - 原 charm 从该位置移除
   - 新升级版放在**同一位置**, `growthCount` 初始化为 0
4. 炼金锅 `usesLeft -= 1`
5. 如果 `usesLeft === 0` → 炼金锅从网格移除

#### 复制镜 (§2.6) Luck 触发

1. 获取相邻 4 格中**可复制**的 charm 列表 (排除 `RESONANCE_BELL` / `COPY_MIRROR` / `BLANK`)
2. 如果列表为空 → 本次 Luck 无效果, 复制镜仍然自身移除
3. 否则: 弹出子模态, 玩家从列表中选 1 个作为复制源
4. 获取网格中所有空位 (非 null 的格子排除, 空白也排除), 如果没有空位 → 复制镜无效但仍自身移除
5. 否则: 弹出子模态, 玩家选 1 个空位作为目标
6. 在目标位置生成一个新的 charm 副本 (复制 type, 但 `growthCount = 0`, `usesLeft = 3` for 炼金锅)
7. 复制镜自身从网格移除

---

## 4. 单回合 Cap 规则

单个回合内, 以下数值增加有硬上限:

| 资源 | 单回合最大增量 |
|------|---------------|
| 主墙抽取次数 | **+5** |
| 公告牌订单 | **+3** |
| 背包贴纸 | **+3** |

实现要点:
- 每回合开始时初始化 `turnBonuses = { draws: 0, orders: 0, stickers: 0 }`
- 每次 Luck 效果执行时, 先计算本次效果的数值增量, 再用 `Math.min(increment, cap - turnBonuses.X)` 得到实际可应用的增量
- 把实际应用的增量累加到 `turnBonuses.X`
- 超出 cap 的部分 wasted, 不会"补偿"
- 催化石加成 **也受 cap 限制** (即催化石多给的 +1 如果超 cap, 也 wasted)

---

## 5. 回合流程 (整合后)

```
─────────────────────────────────────
回合开始
  ├─ 重置 turnBonuses = {draws: 0, orders: 0, stickers: 0}
  ├─ 发放基础抽取次数 (5 per turn, 现有逻辑)
  ├─ 触发每回合的延缓厄运减量计数器初始化为 0
  │
  ├─ 【Luck 抽取阶段】 (新)
  │   ├─ 弹出模态
  │   ├─ 玩家选 row/col
  │   ├─ 系统抽取 + 触发效果 (§3.4, §3.5)
  │   ├─ 应用 cap
  │   └─ 关闭模态
  │
  ├─ 【主墙抽取阶段】 (现有 + 扩展)
  │   ├─ 玩家选 row/col, 花 1 金/抽
  │   ├─ 处理抽到的格子类型:
  │   │    ├─ 贴纸 → 背包
  │   │    ├─ 💰 → 金币
  │   │    ├─ 📋 订单 → 公告牌
  │   │    ├─ 局外物品 → 背包
  │   │    ├─ 💣 炸弹 → 爆炸
  │   │    ├─ ⬆️ → doomLevel += 1
  │   │    ├─ 💀 → 立即执行 doomLevel 次 Doom 抽取 (§3.6)
  │   │    └─ ✨ → 生成 charm, 弹出放置模态 (§3.3)
  │   └─ 玩家可随时提交订单
  │
  ├─ 【回合末 Doom 抽取】 (新)
  │   ├─ 计算本回合最终 Doom 次数: baseCount = doomLevel, 减去延缓效果累积 (§2.4, §2.8), 最低 0
  │   ├─ 对每次 Doom 执行:
  │   │    ├─ 弹出模态
  │   │    ├─ 玩家选 row/col
  │   │    ├─ 系统命中判定 (§3.6)
  │   │    └─ 处理命中 (扣 HP 或消耗 charm)
  │   └─ HP 归零 → 强制本场结束 (现有逻辑)
  │
  ├─ 【新订单处理】 (现有)
  │   └─ 生成 1 个新订单, 玩家选择加入/替换/放弃
  │
  ├─ 【三选一选墙】 (现有)
  │
  └─ 【决策: 继续 or 撤离】 (现有)
─────────────────────────────────────
```

---

## 6. UI / 交互要求

### 6.1 Fate Wall 组件

- 4×4 网格显示, 每格显示:
  - 空位: 空 (灰色虚线框)
  - 空白 (`BLANK`): 不同视觉, 明确不可覆盖
  - 已填 charm: icon + 类型名短标签 + (如果是复利/成长) 当前 `growthCount` 角标 + (如果是炼金锅) `usesLeft` 角标
  - 一次性 charm 用边框/颜色区分 (比如金色或闪烁)
- Hover 任意格子显示 tooltip (charm 的完整效果描述)
- 位置: 建议放在主墙旁边的 sidebar (取决于现有布局)

### 6.2 ✨ 放置模态

- 触发时机: 主墙抽到 ✨ 后立即弹出
- 内容:
  - 显示生成的 charm 类型 + 效果描述
  - 4×4 fate wall, 可选的位置高亮 (空位 + 非空白已占用), 不可选的格子 (空白) 变灰
  - 点击位置 → 确认放置 → 模态关闭
- 阻塞式: 玩家必须放置后才能继续

### 6.3 Luck 抽取模态

- 触发时机: 每回合开始
- 内容:
  - 4×4 fate wall 显示
  - 行和列的选择按钮 (4 行 + 4 列) 或点击 row/col header
  - hover row/col 时高亮整行/整列
  - 点击 row/col 后:
    - 如果行/列非空: 展示动画 (随机选一个格子高亮) → 显示触发的效果结果 (gained +X draws, 等)
    - 如果行/列空: 提示"请重选"
- 阻塞式

### 6.4 Doom 抽取模态

- 触发时机: 主墙抽到 💀 时或回合末 (每次 doom 都弹一次)
- 内容:
  - 4×4 fate wall 显示
  - row/col 选择
  - 点击后: 展示命中动画 (高亮命中格) → 显示结果 (blocked / HP -1)
- 阻塞式, 连续多次 Doom 时逐次弹出

### 6.5 共鸣钟 / 复制镜 / 炼金锅的子交互

- **共鸣钟**: Luck 抽到后, 显示"触发了相邻的 X 个幸运符" 动画, 依次展示各个相邻的效果. 无玩家输入.
- **复制镜**: Luck 抽到后, 弹出"选择复制源"模态 (玩家点相邻 4 格中的一个非一次性 charm), 然后弹出"选择目标空位"模态. 两步.
- **炼金锅**: Luck 抽到后, 显示"升级了 [相邻 charm]" 动画. 无玩家输入 (随机选的).

---

## 7. 需要改/新建的文件

### 新建

1. **`src/data/charms.js`** — 所有 15 种 charm 的定义, 权重表, 升级映射表, 效果处理函数
2. **`src/utils/fateWallHelpers.js`** — 位置辅助函数 (getNeighbors 等), row/col 辅助, 命中判定逻辑
3. **`src/components/game/FateWall.jsx`** — fate wall 的 4×4 网格 UI 组件
4. **`src/components/game/FateWallPlacementModal.jsx`** — ✨ 抽到时的放置模态
5. **`src/components/game/FateWallLuckModal.jsx`** — Luck 抽取时的 row/col 选择模态
6. **`src/components/game/FateWallDoomModal.jsx`** — Doom 抽取时的 row/col 选择模态
7. (可选) **`src/components/game/FateWallAlchemyModal.jsx`** — 炼金锅/复制镜的子交互 (如果分离的话)

### 修改

1. **`src/hooks/useGameLogic.js`** — 加入 `fateWall` state, 回合流程插入 Luck/Doom 抽取, charm 效果处理 dispatcher, turnBonuses cap 逻辑
2. **`src/data/constants.js`** 或相关 constants — 加入 ✨ cell type, 调整主墙格子生成权重
3. **`src/utils/matrixHelpers.js`** — 主墙 wall generation 加入 ✨ (8% 概率), 处理 ✨ 抽到的 trigger
4. **现有的 doom 系统逻辑** — 删除 danger grid 累积, 改为 doom level + row/col 抽取. 保留 doomLevel state, ⬆️ 升级, 💀 触发.
5. **`src/components/game/GameCore.jsx`** — 把 FateWall 组件接到布局里, 串联 modal 流程
6. **`src/utils/translations.js`** — 添加中英文字符串 (所有 charm 名字, 效果描述, UI 文本)

### 删除 / 废弃

- Doom grid 的 10 格可视化组件 (如果有) — 替换为只显示 doomLevel 数字的简化组件
- danger 累积逻辑 (每回合 +1 danger) — 删除
- 现有 doom resolution 的 "cursor 落 N 次在 danger grid" 逻辑 — 替换为 fate wall doom 抽取

---

## 8. 生成权重汇总表 (11 种通过 ✨ 生成)

| 类型 | 权重 | 累积 |
|------|------|------|
| `DRAW_COUNT` | 15% | 15% |
| `STICKER` | 15% | 30% |
| `ORDER` | 13% | 43% |
| `CATALYST` | 12% | 55% |
| `GUARD_STONE` | 12% | 67% |
| `COMPOUND` | 8% | 75% |
| `DELAY_DOOM` | 8% | 83% |
| `BAIT` | 7% | 90% |
| `ALCHEMY_POT` | 4% | 94% |
| `RESONANCE_BELL` | 3% | 97% |
| `COPY_MIRROR` | 3% | 100% |

4 种复利/强化版 (`COMPOUND_STICKER`, `COMPOUND_ORDER`, `ENHANCED_DELAY`, 以及通过炼金锅获得的 `COMPOUND`) **不通过 ✨ 生成**, 只能通过炼金锅升级获得.

---

## 9. 实现顺序建议 (MVP 最小可运行切分)

1. **数据层基础**: 新建 `charms.js`, 定义 CharmType 枚举和最基础的 3 种 charm (DRAW_COUNT, STICKER, ORDER) 的数据
2. **State 接入**: 在 `useGameLogic` 加入 `fateWall.cells` state, 每场开始放 4 个 BLANK 到中心
3. **主墙 ✨ cell**: 修改 wall generation 加入 ✨ 格子, 抽到时先 console.log 测试
4. **放置流程**: 实现 charm 生成 + 放置模态 UI + state update
5. **Fate Wall 显示组件**: 先显示 4×4 网格当前状态 (不做动画)
6. **Luck 抽取**: 实现 Luck 模态 + row/col 选择 + 基础 3 种 charm 的效果触发 + turnBonuses cap
7. **Doom 系统重写**: 删除 danger grid 累积, 保留 doomLevel + ⬆️ + 💀, 实现 row/col doom 抽取模态. 先跑通无守护碑无诱饵的简单情况.
8. **守护碑 + 诱饵**: 加入这两种位置被动 charm 和 Doom 命中判定的特殊处理
9. **催化石**: 加入被动 +1 加成逻辑
10. **复利幸运符**: 加入 growthCount 追踪和成长效果
11. **延缓厄运**: 加入本回合延缓累计和 Doom 次数减免
12. **炼金锅**: 加入升级映射表和 Luck 触发升级逻辑
13. **共鸣钟**: 加入连锁触发逻辑 (不连锁一次性)
14. **复制镜**: 加入 2 步子交互 (选源 + 选目标) 和副本生成
15. **UI 打磨**: 动画, tooltip, hover 高亮, 视觉区分 (持续 vs 一次性, 复利 growthCount 角标, 炼金锅 usesLeft 角标)
16. **i18n**: 所有字符串加入 translations.js

前 6 步之后系统已经能跑通最基础的 "获得 charm → 放置 → 回合末 Luck 抽取 → Doom 抽取" 循环, 可以开始初步测试. 后续 7-15 步逐步加入复杂 charm 类型.

---

## 10. 待实现时可能遇到的设计细节 (可用默认值处理)

- **炸弹 + ✨ 相邻**: 炸弹爆炸摧毁周围 8 格时, 如果 ✨ 在爆炸范围内, ✨ **被摧毁, 不生成 charm** (和其他格子一样)
- **神秘面纱墙的 ✨ 隐藏**: ✨ 可以被隐藏, 揭示后正常交互
- **乾坤大挪移墙的 ✨ 移位**: ✨ 像其他格子一样被移位, 移位不影响其功能
- **双倍惊喜墙的 ✨**: 双倍惊喜对 ✨ **不生效** (不产生 2 个 charm)
- **交叉问答墙的 ✨**: 正常抽取 (行列交替规则照旧)
- **Luck 抽取时 row/col 全空**: 玩家必须重选, 不能"跳过" Luck 抽取
- **Doom 抽取时 row/col 全被守护碑排除**: 玩家必须重选. 如果所有 row/col 都被排除 (极罕见), 本次 Doom 无命中, HP 不扣 (相当于完美防御)
- **复利的 growthCount 被炼金锅升级后**: 新升级版 `growthCount` 重置为 0
- **✨ 模态放置时, 玩家能否反悔**: 不能 (一旦 ✨ 抽到, 必须选一个位置). 提供 "取消" 按钮可能导致玩家滥用, 不推荐.
- **Luck 抽取时 "无效果" 的 charm** (空白 / 催化石 / 守护碑 / 诱饵 被 Luck 抽到): 视觉上仍展示"抽到了 X", 但效果是"无事发生", charm 保留在位置上 (除了空白被 Luck 抽取也不消耗, 保留)

---

## 11. 测试关注点

实现完成后需要验证:

1. **基础循环**: 能否每回合 Luck 抽取 → 主墙抽取 → Doom 抽取 跑完整回合
2. **起手防御**: 4 个中心空白能否正确吸收前几次 doom
3. **Cap 执行**: 单回合 +5/+3/+3 是否真正 capped, 超出是否 wasted 而非叠加
4. **覆盖机制**: 玩家能否覆盖现有 charm, 旧 charm 是否静默消失
5. **守护碑**: 相邻 4 格是否真的免疫 doom, 自身是否仍可被消耗
6. **诱饵**: doom 是否优先命中诱饵, 跨 row/col 是否正确不转移
7. **催化石**: 相邻的基础 charm Luck 奖励是否 +1, 多个催化石是否不叠加
8. **复利成长**: growthCount 是否正确递增, Doom 消耗后下次生成是否从 0 开始
9. **炼金锅**: 升级是否生效, 贴纸能否升级成复利贴纸, usesLeft 是否正确扣减
10. **共鸣钟**: 相邻 3-4 个 charm 时能否一次性触发所有, 连锁一次性是否被正确排除
11. **复制镜**: 能否复制成长版 (复制后 growthCount 是否 reset 为 0)
12. **延缓厄运**: 本回合 doom 次数是否真的减少, 强化延缓是否减 2

---

*文档版本: 初版*
*基于: v2.1 回合制原型*
*目标: 在现有 v2.1 主墙系统上叠加 fate wall 作为新层*
