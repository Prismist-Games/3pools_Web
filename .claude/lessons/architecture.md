# Architecture

- Do NOT use `crypto.randomUUID()` — it is not available in all browser environments (e.g. non-HTTPS contexts, older WebViews). Use `Math.random().toString(36)` based UID generation instead.

- **React 18 state updater 回调是异步的**：在 `setState(prev => {...})` 的回调里设置闭包变量，然后在外面立即读——读到的是初值（闭包还没执行）。React 18 的 updater 函数在下一次 render 时才被调用，不在 `setState` 之后立即同步执行。
  - ❌ 错：`let x = null; setMatrix(prev => { x = ...; return next; }); if (x) { ... }` —— `if (x)` 永远拿不到值
  - ✅ 对：决策**在** `setState` **之前**同步计算（用闭包里的旧 state 即可），setState 里只做"应用已算好的结果"
  - 真实例子：[useGameLogic.js](../../src/hooks/useGameLogic.js) 的抢菜达人决策——先在外面算出 `snatcherPlannedMove` + `snatchedItem`，setMatrix 里只按计划移动格子，toast 在 setMatrix 前同步发出
