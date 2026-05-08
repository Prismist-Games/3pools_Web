# 代码技术参考 - LAN 多人原型

最后更新：2026-05-08

本文档描述当前 worktree 的真实代码结构。当前分支保留原单人 React 原型，同时新增一个 Node WebSocket 多人服务器和 `/multiplayer` 前端界面。

---

## 1. 技术栈

| 技术 | 用途 |
| --- | --- |
| React 18 | 前端 UI |
| Vite 6 | 本地开发与构建 |
| Tailwind CSS 3 | 样式 |
| Lucide React | 图标 |
| Node.js ESM | LAN 多人服务器 |
| `ws` | WebSocket 通信 |

---

## 2. 启动命令

```bash
npm run dev       # 原单人前端开发服务
npm run dev:lan   # 局域网前端服务，host 0.0.0.0，默认端口 5176
npm run server:lan # WebSocket 多人服务器，默认端口 8787
npm run test:multiplayer # 多人服务器规则测试
npm run build     # 生产构建
npm run lint      # ESLint；当前项目缺少 ESLint 9 配置文件，会失败
```

多人版需要同时运行 `dev:lan` 与 `server:lan`。访问路径为：

```text
http://<主机 IP>:<Vite 端口>/3pools_Web/multiplayer
```

---

## 3. 目录结构

```text
server/
  multiplayerEngine.js   # 权威房间状态与多人规则
  multiplayerServer.js   # WebSocket 连接、消息分发、广播 snapshot

src/
  App.jsx                # 根据 URL 路径切换单人或多人入口
  multiplayer/
    MultiplayerGame.jsx  # 多人大厅、桌面、背包、订单、结算 UI
    useMultiplayerClient.js # WebSocket 客户端 hook
  data/constants.js      # 复用原物品池、品质、词缀、阶段配置
  utils/helpers.js       # 复用订单生成、品质随机、词缀随机等纯函数
  utils/translations.js  # 中英 UI 翻译
```

旧单人主线仍在：

- `src/hooks/useGameLogic.js`
- `src/GameCore.jsx`
- `src/components/game/*`

多人版没有复用单人的 `useGameLogic`，而是在服务端实现了一个更小的权威状态机。

---

## 4. 入口路由

`src/App.jsx` 中的顶层 `App` 根据路径判断：

```js
if (window.location.pathname.includes('multiplayer')) {
    return <MultiplayerGame />;
}

return <SinglePlayerApp />;
```

这不是正式路由系统，而是为了快速原型保持改动最小。GitHub Pages 的 `base: '/3pools_Web/'` 仍由 `vite.config.js` 控制。

---

## 5. 多人服务器

### 5.1 `server/multiplayerServer.js`

职责：

- 在 `0.0.0.0:8787` 启动 WebSocketServer。
- 维护一个内存中的 `MultiplayerRoom`。
- 记录 WebSocket 到 `playerId` 的映射。
- 收到客户端消息后调用房间方法。
- 每次操作后向所有客户端广播各自视角的 `snapshot`。
- 如果所有客户端离开，重建空房间。

支持的消息类型：

| message.type | 参数 | 行为 |
| --- | --- | --- |
| `join` | `name` | 加入大厅 |
| `start` | - | 房主开始游戏 |
| `choosePool` | `poolId` | 选择奖池 |
| `chooseInteractive` | `itemUid` 或 `itemName` | 完成交互词缀选择 |
| `handlePending` | `action`, `index` | 处理背包满的待处理物品 |
| `moveItem` | `from`, `to` | 移动、交换或合成背包物品 |
| `recycleItems` | `indices` | 回收一组背包物品 |
| `submitOrder` | `orderId`, `itemUids` | 用指定物品提交订单 |
| `stopDrawing` | - | 玩家主动结束后续抽奖 |
| `resetRoom` | - | 结算后把在线玩家带回大厅并重置本局状态 |

### 5.2 `server/multiplayerEngine.js`

这是多人版的权威规则源。核心常量：

```js
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const ROUND_RESULT_LIMIT = 8;
```

房间状态：

- `players: Map<playerId, PlayerState>`
- `hostId`
- `status: 'lobby' | 'playing' | 'finished'`
- `orders`
- `activePools`
- `round`
- `roundResults`
- `log`

玩家状态：

- `gold`
- `score`
- `inventory`
- `pendingItem`
- `pendingQueue`
- `selectedDraw`
- `interaction`
- `ready`
- `eliminated`
- `connected`

---

## 6. 多人规则实现要点

### 6.1 房间开始

`start(playerId)`：

- 检查房间仍在大厅。
- 检查玩家是房主。
- 检查玩家数不少于 2。
- 创建共享订单。
- 调用 `beginRound()` 生成第一轮奖池。

### 6.2 生成奖池

`generateActivePools()`：

- 从当前阶段允许的物品池中抽取 3 个不重复池子。
- 每个池子只保留当前阶段 `poolSize` 数量的物品。
- 为每个池子随机分配一个本轮未使用的词缀。
- 费用来自词缀 `cost`。

### 6.3 选择奖池

`choosePool(playerId, poolId)`：

- 阻止待处理物品、待处理队列、交互词缀、已 ready 的玩家重复选择。
- 校验金币是否足够。
- `trade_in` 需要背包非空。
- `precise` / `targeted` / `trade_in` 会写入 `player.interaction`，等待本人补充选择。
- 被动词缀直接写入 `selectedDraw` 并设置 `ready = true`。

### 6.4 交互词缀

`chooseInteractive(playerId, payload)`：

- `precise`：从服务器生成的 2 个候选物品中选一个。
- `targeted`：指定该池中的物品名称。
- `trade_in`：指定自己背包中要消耗的物品 uid。
- 完成后清空 `interaction`，写入 `selectedDraw`，设置 `ready = true`。

`snapshot(viewerId)` 只把 `interaction` 发给本人：

```js
interaction: player.id === viewerId ? player.interaction : null
```

同时会给 UI 派生：

- `canDraw`：当前可直接选择奖池；
- `needsCashout`：当前支付不起任何奖池，但还没有停止抽奖，可先回收或手动结束。

### 6.5 开奖

`tryResolveRound()`：

- 找出当前可参与玩家：未停止抽奖、无 `pendingItem`、无 `pendingQueue`，且当前能支付至少一个可用奖池。
- 如果可参与玩家中还有人未 ready，则不开奖。
- 如果全部 ready，则逐个调用 `resolvePlayerDraw()`。
- 开奖前调用 `retireCompletedOrders()`，清理上一决策窗口中已完成、等待退场的旧订单。
- 开奖后把结果放进 `roundResults`。
- 立即调用 `beginRound()` 进入下一轮。

这保证背包满的玩家不会阻塞全局下一轮。

### 6.6 扣费与生成物品

`resolvePlayerDraw(player)`：

- 在开奖时扣除奖池费用。
- 根据词缀生成物品：
  - `precise` 使用玩家已选择的候选物品；
  - `targeted` 使用玩家指定名称并随机品质；
  - `trade_in` 消耗指定背包物品并生成继承品质的新物品；
  - `fragmented` 生成 3 个 Common 物品；
  - 其他词缀生成 1 个物品。

品质随机复用 `src/utils/helpers.js` 中的 `rollRarity()`。多人版传入的 `hasSkill` 固定为 `false`。

### 6.7 背包满

`handleIncomingItems()` 和 `processPendingQueue()`：

- 背包有空位时直接 push。
- 背包满时放入 `pendingQueue`。
- 若当前没有 `pendingItem`，从队列取一个作为待处理物品。

`handlePending()`：

- `discard`：回收待处理物品，给金币。
- `replace`：点击一个已有物品；若可合成则升级，否则回收旧物品并替换为待处理物品。

### 6.8 背包整理与回收

`moveItem()`：

- 等待开奖、交互词缀中、待处理物品时禁止整理。
- 点击可合成目标时合成。
- 点击空位时移动。
- 点击不可合成物品时交换。

`recycleItems()`：

- 等待开奖、交互词缀中、待处理物品时禁止回收。
- 按索引删除物品并累计回收金币。

### 6.9 提交订单

`submitOrder(playerId, orderId, itemUids)`：

- 只能在非等待开奖、非交互、非待处理状态提交。
- 根据 `orderId` 找共享订单。
- 如果传入 `itemUids`，使用 `findOrderMatchByUids()` 精确校验玩家选择的物品。
- 校验成功后：
  - 计算分数；
  - 消耗所选物品；
  - 标记该订单被该玩家完成；
  - 如果这是该订单第一次被完成，追加一个新订单；
  - 被完成的旧订单保留到下一次开奖开始，期间其他玩家仍可完成。

同一名玩家不能重复完成同一个已缓冲的旧订单。旧订单的生命周期由 `retireOnNextDraw` 和 `completedBy` 标记维护。

### 6.10 停止抽奖、结算与回房

`updateElimination(player)`：

- 这是历史命名，现在不再自动淘汰玩家。
- 如果当前没有任何可支付奖池，只清空 `ready` / `interaction` / `selectedDraw`，让玩家回到可整理、回收、提交订单或手动结束的状态。
- `trade_in` 需要背包非空才算可支付。

`stopDrawing(playerId)`：

- 只能在 `playing` 状态调用。
- 玩家不能处于待处理物品、待处理队列、交互词缀选择、已 ready 等中间状态。
- 将 `eliminated = true`，清空选择状态，然后触发 `tryResolveRound()` 和 `checkGameEnd()`。

`checkGameEnd()`：

- 所有玩家都停止抽奖时调用 `finishGame()`。

`resetToLobby(playerId)`：

- 只能在 `finished` 状态调用。
- 保留仍在线玩家，移除断线玩家。
- 重置金币、分数、背包、待处理物品、ready、订单、奖池、回合与开奖结果。
- 状态回到 `lobby`，由当前在线玩家重新开始。

---

## 7. 多人客户端

### 7.1 `src/multiplayer/useMultiplayerClient.js`

职责：

- 根据当前 hostname 连接 `ws://<hostname>:8787`。
- 支持 URL 参数 `?server=ws://...` 覆盖服务器地址。
- 保存最新 `snapshot`、本人 `playerId`、连接状态、错误信息。
- 暴露 UI 调用的动作方法。

动作方法：

```js
join(name)
start()
choosePool(poolId)
chooseInteractive(payload)
handlePending(payload)
moveItem(payload)
recycleItems(indices)
submitOrder(orderId, itemUids)
stopDrawing()
resetRoom()
```

### 7.2 `src/multiplayer/MultiplayerGame.jsx`

主要组件：

| 组件 | 职责 |
| --- | --- |
| `MultiplayerGame` | 根据 snapshot 状态渲染大厅、游戏桌或结算 |
| `Lobby` | 加入房间、玩家列表、房主开始 |
| `GameTable` | 共享订单、奖池、自己背包、其他玩家、最近开奖结果 |
| `MyInventoryWorkbench` | 自己背包的整理、合成、回收、提交订单、待处理物品 |
| `PublicPlayerCard` | 其他玩家公开状态和背包 |
| `PoolCardMulti` | 多人奖池卡片 |
| `OrderCardMini` | 共享订单卡片与提交入口 |
| `InteractionPanel` | 精准/有的放矢/以旧换新的私人选择面板 |
| `ItemTile` | 物品格，包含品质、绝育、合成提示、订单角标 |

UI 交互特性：

- 奖池 hover 会高亮订单中可能产出的物品。
- 背包物品 hover 会高亮同名订单需求。
- 自己和他人的背包都会显示订单匹配角标。
- 自己背包保持完整操作能力；其他玩家背包只读。

---

## 8. 国际化

中文仍是源语言。多人 UI 中新增的中文字符串需要通过 `t()` 包裹，并在 `src/utils/translations.js` 中增加英文翻译。

当前多人相关翻译包括：

- 大厅文案；
- 共享订单、奖池、最近开奖结果；
- 背包操作；
- 回收、提交、待处理物品；
- 玩家状态标签。

---

## 9. 已知技术限制

- 只有一个全局房间。
- 没有房间码。
- 没有持久化。
- 没有断线重连。
- 没有正式认证或反作弊。
- 没有服务端测试套件。
- ESLint 9 当前缺少 `eslint.config.js`，所以 `npm run lint` 会因配置缺失失败。
- 多人服务和前端是两个进程，需要分别启动。

---

## 10. 修改指南

### 修改多人规则

优先修改 `server/multiplayerEngine.js`。多人规则必须以服务端状态为准，前端只发意图和渲染 snapshot。

### 修改多人 UI

修改 `src/multiplayer/MultiplayerGame.jsx`。注意保持：

- 自己背包是主操作区；
- 他人背包只读；
- 交互词缀选择只展示给本人；
- 等待开奖时禁止整理、回收、提交订单。

### 修改 WebSocket 协议

同时修改：

- `server/multiplayerServer.js` 的消息分发；
- `src/multiplayer/useMultiplayerClient.js` 的动作方法；
- 必要时修改 `MultiplayerGame.jsx` 调用参数。

### 修改基础数值

物品池、品质、词缀、阶段配置仍来自 `src/data/constants.js`。多人服务器通过 `INITIAL_GAME_CONFIG` 读取这些数据。

### 保持单人版本

这个 worktree 保留单人入口。除非明确要同步单人玩法，否则多人改动不要重构 `useGameLogic.js` 或 `GameCore.jsx`。
