# 幸运之墙 / Wall of Fortune - LAN 多人原型

这个 worktree 是独立的多人迭代分支：`codex/multiplayer-lan-prototype`。它保留原有单人原型，同时新增 `/multiplayer` 路由，用于在同一局域网内进行 2-4 人对局验证。

## 快速启动

需要同时启动两个服务：

```bash
npm run server:lan
npm run dev:lan
```

- 前端默认端口：`5176`，如果被占用，Vite 会自动换到下一个可用端口。
- 多人房间服务器：`ws://<主机局域网 IP>:8787`
- 访问路径：`http://<主机局域网 IP>:5176/3pools_Web/multiplayer`
- 如果前端端口被 Vite 改成 `5177`，访问路径也对应改为 `http://<主机局域网 IP>:5177/3pools_Web/multiplayer`

## 当前玩法摘要

- 2-4 人房间；1 人不能开始。
- 每名玩家开局 30 金币、0 分、10 格背包。
- 所有人共享同一批订单和同一轮的 3 个奖池。
- 每名玩家独立选择奖池；所有可行动玩家都选完后同时开奖。
- 玩家背包、待处理物品、金币、分数对所有人可见；交互词缀的具体选择只对本人可见。
- 背包满时，玩家在本地处理待处理物品，其他玩家可以继续下一轮。
- 订单需要手动选择具体背包物品提交；完成后该共享订单立即被新订单替换。
- 手动刷新订单、撤离、离开关卡在多人版本中取消。
- 当玩家无法负担任何可用奖池时停止后续抽奖；所有玩家都停止抽奖后结算分数。

## 文档

- 当前规则：`design_docs/game_rules.md`
- 设计进度：`design_docs/gameplay_progress.md`
- 代码参考：`design_docs/codebase_technical_reference.md`
- 桌游机制调研：`design_docs/reference/competitive-random-set-collection-boardgame-research.md`
