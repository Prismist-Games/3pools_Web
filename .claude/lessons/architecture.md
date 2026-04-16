# Architecture

- Do NOT use `crypto.randomUUID()` — it is not available in all browser environments (e.g. non-HTTPS contexts, older WebViews). Use `Math.random().toString(36)` based UID generation instead.

- **Never use `addBulletinOrder()` inside Luck/charm effects** — it triggers the `incomingOrder` modal flow (2-candidate pick), which interrupts the Luck phase mid-flow. Use `setBulletinBoard(prev => [...prev, generateOrder()])` directly instead.

- **Charms that manage their own removal need an early `return`** — ALCHEMY_POT and COPY_MIRROR call `setFateWall` directly to remove themselves (or handle usesLeft). These cases must `return effectDescription` before the generic `if (!charm.isPersistent) removeCharm(charmIndex)` block at the end of `applyLuckEffect`, otherwise removal fires twice.

- **RESONANCE_BELL recursive `applyLuckEffect` is safe** — because we explicitly skip RESONANCE_BELL, ALCHEMY_POT, and COPY_MIRROR from the neighbor loop, there is no infinite chain risk. The exclusion list must match exactly (all one-shot/complex types).

- **Queue-based doom draw state** — replacing a danger-grid with a player-facing row/col selection requires `doomDrawQueue` (remaining), `doomDrawTotal` (for display), and `doomDrawPhase` ('idle'|'selecting'|'result'). Each confirmation decrements the queue; when queue hits 0, transition to the post-doom phase.

- **Turn-level accumulation state (`doomDelayCount`, `turnBonuses`)** — reset in `startNewTurn()`, consumed at the end of the turn in `resolveDoom()`. Pattern: accumulate during Luck phase, apply when the relevant event fires. Always reset at turn start, not turn end (to avoid carrying state into the next turn if the game advances via a different path).
