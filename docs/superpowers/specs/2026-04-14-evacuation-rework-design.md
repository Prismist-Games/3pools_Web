# 撤离机制改版 + 背包缩减 + 遗留系统清理

> Date: 2026-04-14
> Branch: `core-draw/prize-board-selection`
> Scope: single expedition only

## Goal

Replace the passive sticker-count evacuation gate with a profit-card-based gate that ties evacuation to the core passive-matching loop. Shrink backpack to tighten the space constraint. Remove accumulated legacy code that no longer contributes to the active design.

## Design decisions

### Evacuation rule

- Evacuation requires **at least 3 currently-held profit cards to be satisfied** (interpretation B from brainstorming).
- Fixed threshold — no scaling across expeditions. Per-expedition tuning only.
- Player may hold more than 3 profit cards (current cap `MAX_PROFIT_CARDS = 5`); only the satisfied count matters.
- New constant: `EVACUATION_PROFIT_REQUIREMENT = 3` in `src/data/slotCards.js`.
- Derived in `useGameLogic`:
  ```js
  const satisfiedProfitCount = profitCards.filter(c => canSatisfyCard(c, inventory)).length;
  const canEvacuate = satisfiedProfitCount >= EVACUATION_PROFIT_REQUIREMENT;
  ```
- Export `satisfiedProfitCount` and `evacuationProfitRequirement` for the UI.

### Evacuation Bar (UI)

Rewrite `renderEvacuationBar` in `src/GameCore.jsx`:

- Label: `🚪 撤离 N/3 ✓` (`N` = satisfied profit card count)
- Progress bar ratio = `satisfiedProfitCount / 3`
- Button still gated on `canEvacuate`
- Replace "需要 8 印花" helper text with "满足 3 张兑换券"
- Add translations in `src/utils/translations.js`

### Backpack

- `INITIAL_GAME_CONFIG.inventorySize`: `15 → 10` in `src/data/constants.js`
- `V3_INITIAL_STATE.backpackCapacity`: `15 → 10` in `src/data/v3Config.js` (documentation parity; not read at runtime)

### Legacy cleanup

**`useGameLogic.js`** — remove state, derived values, functions, and exports for:

- Danger wall system: `dangerWalls`, `generateDangerGrid`, `enterDangerWall`, `exitDangerWallView`, the entire `currentPool.isDangerWall` branch in `completeDrawAnim`, danger-wall draw-limit auto-exit logic.
- Risk/heat chain: `risk`, `wallDepth`, `turnHeat`, `cumulativeExposure`, `getRiskCoeff`, `getRiskTier`, `currentPoolRiskCoeff`, `nextDrawRiskIncrement`, `FLIP_HEAT`, `RISK_CONFIG` import.
- Heat accumulation block inside `completeDrawAnim`.
- Turn-end danger probability check inside `startNextTurn`.
- Score orders: `scoreOrderEncounters`, growth/score-order imports (`GROWTH_ORDERS`, `isOrderReady`, `getOrderProgress`, `generateScoreOrder`), `growthOrdersView`, `completedOrderIds`.
- Gold cell handling in `completeDrawAnim` (currently logs "空格" as a no-op).
- Doom residue: `doomCounter`, `hp` (driven by `doomConfig`, unused after risk removal — keep `lives` from risk config → migrate to a constant).
- `removeEncounter` — function becomes empty after danger-wall + score-order branches removed → delete.
- Old sticker-count evacuation: `inventoryStickerCount`, `evacuationStickerThreshold` export.

**`v3Config.js`** — remove:

- `RISK_CONFIG` (including evacuation encounter placeholders).
- `DRAW_GOLD_COST`, `TURN_GOLD_INCOME`.
- `DOOM_EVENTS`, `DOOM_RESOLUTION_DRAWS`, `getDoomTurnEvents` — verify no importers first; remove if orphan.
- `V3_INITIAL_STATE.doomGridSize`, `initialDanger` — remove if unused.

**`slotCards.js`** — remove:

- `EVACUATION_STICKER_THRESHOLD` constant.
- `evacuation` case in `generateSlotCard`.
- `SLOT_CARD_CONFIG.evacuation` entry.
- Legacy slot-fill helpers: `isCardComplete`, `getCardProgress` — unused after passive matching rewrite.

**`GameCore.jsx`** — remove:

- Destructures / imports of removed state.
- Any danger-wall or score-order rendering blocks.

**Files potentially deletable:**

- `src/data/growthOrders.js` — delete if nothing outside `useGameLogic` imports it.

### Constants migration

`RISK_CONFIG.INITIAL_LIVES = 5` is currently the only live value from `RISK_CONFIG`. Move it to a new `INITIAL_LIVES = 5` constant in `v3Config.js` (or inline into `V3_INITIAL_STATE`) before deleting `RISK_CONFIG`.

## Out of scope

- `design_docs/game_rules.md` sync (separate doc task)
- Skill card system (unstarted)
- Rebalancing `SLOT_CARD_CONFIG.profit` for the tighter backpack — defer to playtest
- Any changes to danger card generation / wall shop generation

## Known risks

- **Profit-card difficulty in a 10-slot backpack.** Three profit cards can each demand up to 3 sticker types × multiple copies. The 10-slot constraint may swing between trivially satisfied and impossibly tight depending on overlap. Playtest before retuning.
- **Reset surface area.** `handleReset`, `startGame`, `startNextTurn` all touch the removed state. All three must be trimmed consistently to avoid stale setters after cleanup.
- **Turn-end flow.** The current `startNextTurn` rolls a danger-wall probability based on `turnHeat`. After removal, turn-end logic reduces to `checkDangerCards()` + reset + new danger cards — verify the happy path still reads naturally.

## Acceptance criteria

1. `npm run build` passes.
2. `npm run lint` passes (or matches baseline, no new warnings).
3. Starting a new game, drawing on walls, and accumulating 3 satisfied profit cards yields a functional evacuate button.
4. No references remain to `dangerWalls`, `turnHeat`, `risk`, `wallDepth`, `RISK_CONFIG`, `GROWTH_ORDERS`, `EVACUATION_STICKER_THRESHOLD`.
5. Backpack is 10 slots; overflow to `pendingItems` still works.
6. Evacuation bar shows `N/3` profit-card progress in both zh and en.
