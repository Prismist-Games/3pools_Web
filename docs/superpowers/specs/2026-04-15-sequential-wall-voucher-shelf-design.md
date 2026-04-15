# Sequential Wall Choice + Voucher Shelf

**Date:** 2026-04-15
**Branch:** `core-draw/prize-board-selection`
**Baseline:** commit `001d2b1` (current HEAD)
**Reference port source:** commit `bcab896` (April 14 build, for flow only)

## Motivation

The current build has a persistent `🏪 商店` panel that shows 5 walls and 2 purchasable vouchers side by side. The bcab896 build (5 commits older) used a different flow: a dedicated `wall_choice` phase with 3 candidates, a persistent left-rail `BulletinBoard` shelf, and an `incoming_order` drafting phase. The designer wants to restore bcab896's *flow* — sequential wall picks, persistent shelf, drafting — while keeping the current build's richer wall content (wall colors, wall functions, unlock conditions, cell tags) and the current voucher mechanic (passive sticker-match profit cards).

This is a UX swap on top of preserved mechanics. Wall *content* stays as it is today; wall *flow* returns to sequential picking. Voucher *semantics* stay passive (match inventory, evacuate at 3 satisfied); voucher *surface* moves from a shop row to a persistent shelf with draft acquisition.

## Non-goals

- No changes to `ResourceMatrix` drawing behavior, AP economy, inventory, recycling, Kitchen, evacuation scoring, or danger-card semantics.
- No port of `bcab896`'s `BulletinBoard.jsx` code — the shelf is a new component that borrows the visual frame, not the submission logic.
- No port of `bcab896`'s order-submission, order-rarity, or item-tag-requirements systems — those are gone for good.
- No redesign of `WallPicker`'s card visuals; the current cards render unchanged in the new phase.

## State model changes (`src/hooks/useGameLogic.js`)

### Removed state

- `revealedPools`, `setRevealedPools`
- `displayedProfitCards`, `setDisplayedProfitCards`

### Removed actions

- `refreshWalls`
- `takeDisplayCard`
- `canRefreshWalls` (derived)

### Removed config keys (`src/data/v3Config.js`)

- `AP_CONFIG.wallShopSize`
- `AP_CONFIG.displayCardCount`
- `AP_CONFIG.takeCardCost`
- `AP_CONFIG.refreshCost`

### Added state

- `voucherShelf: (SlotCard | null)[]` — fixed length 4, nulls are empty slots. Only profit vouchers live here.
- `wallCandidates: Wall[]` — length 3, re-rolled whenever the game enters `wall_choice`.
- `incomingVoucherCandidates: SlotCard[] | null` — length 2 while a draft is live, `null` otherwise.
- `dangerCards: SlotCard[]` — split out of the existing mixed `slotCards` array so the shelf is vouchers-only.

### Modified state

- `slotCards` is retired as a mixed bucket. Profit cards move to `voucherShelf`, danger cards move to `dangerCards`. Any code reading `slotCards.filter(c => c.type === 'profit')` reads `voucherShelf.filter(Boolean)` instead; any code reading `slotCards.filter(c => c.type === 'danger')` reads `dangerCards` instead.
- `canEvacuate` is derived from `voucherShelf.filter(Boolean).filter(v => canSatisfyCard(v, inventory)).length >= EVACUATION_PROFIT_REQUIREMENT`.
- `satisfiedProfitCount` derivation moves to the same source.

### Added actions

- `pickWall(index: number)` — replaces the old `enterPool(uid)` call site. Takes the chosen candidate from `wallCandidates`, sets it as `currentPool`, generates its grid, clears `wallCandidates`, transitions to `drawing`.
- `exitWall()` — ends the current wall explicitly (existing "退出奖品墙" button). Clears `currentPool`, re-rolls `wallCandidates`, transitions to `wall_choice`.
- `pickVoucher(index: 0 | 1)` — takes a candidate from `incomingVoucherCandidates`, writes it into the first null slot of `voucherShelf`, clears `incomingVoucherCandidates`, transitions to `drawing`.
- `skipVoucher()` — clears `incomingVoucherCandidates` without filling a slot, transitions to `drawing`.

### Modified actions

- `startGame()` — sets `voucherShelf = [null, null, null, null]`, `dangerCards = [generateSlotCard('danger', { turnCreated: 1 })]`, rolls `wallCandidates` (3), sets `phase = 'wall_choice'`.
- `continueToNextTurn()` — after resetting AP and spawning the turn's new danger cards, checks `voucherShelf.some(s => s === null)`. If an empty slot exists, generates 2 candidates and transitions to `incoming_voucher`. Otherwise transitions to `drawing`.
- `endTurn()` — end-of-turn danger check reads from `dangerCards` (not the mixed `slotCards`). `dangerCards` is cleared after the check as it is today.
- `handleEvacuate()` / final-score snapshot — iterates `voucherShelf.filter(Boolean)` to compute reward items. Shelf is cleared alongside the existing inventory clear.
- `handleReset()` and `startNextExpedition()` — clear `voucherShelf`, `wallCandidates`, `incomingVoucherCandidates`, `dangerCards`.
- Internal drain detection — when a draw empties the grid (all cells null), auto-call the same logic as `exitWall()` so the player lands in `wall_choice` without a manual press.

## Phase model

```
pre_game → wall_choice → drawing ↘
                          ↓      → wall_choice   (wall drained OR exitWall)
                   incoming_voucher
                          ↓
                       drawing
```

- Rename `'pool_selection'` → `'wall_choice'`. One pass across the codebase; the JSDoc comment on `phase` is updated to the new list: `'pre_game' | 'wall_choice' | 'drawing' | 'incoming_voucher' | 'game_over'`.
- `incoming_voucher` fires at most once per turn, only when the shelf has at least one empty slot, only via `continueToNextTurn`. It pre-empts `drawing` until the player picks or skips.
- `wall_choice` fires on game start, on full drain, and on `exitWall`. Never triggered by a turn boundary — turn transitions don't affect the current wall.

## Components

### New

#### `src/components/game/VoucherShelf.jsx`

Persistent left-rail component, mounted in `GameCore.jsx` for every gameplay phase (`wall_choice`, `drawing`, `incoming_voucher`). Not mounted in `pre_game` or `game_over`.

**Props:** `{ shelf, inventory, evacuationProfitRequirement, t }`

**Behavior:**
- Renders 4 slots vertically.
- Filled slot: uses the same voucher card visual currently embedded in `GameCore.jsx`'s shop row (header with 💎 + `物品兑换券`, sticker requirement chips with typeSatisfied coloring, reward item row with `GameCard`). Green border + gradient when `canSatisfyCard(voucher, inventory)` returns true.
- Empty slot: dashed border placeholder with muted `空栏位` text.
- Shelf header shows `📋 兑换货架` and a progress indicator `N/${evacuationProfitRequirement} satisfied`. When satisfied count ≥ requirement, the header gets a celebratory ring (matches the current evacuation-ready visual from `PassiveCard`).
- No interactive submit behavior. Vouchers are passive.

**Not a port of `BulletinBoard.jsx`.** New file. The visual reference is the left-rail feel of bcab896 but the content is today's vouchers.

#### `src/components/game/IncomingVoucherPicker.jsx`

Center-panel component, mounted in `GameCore.jsx` when `phase === 'incoming_voucher'`.

**Props:** `{ candidates, inventory, onPick, onSkip, t }`

**Behavior:**
- Renders a header `新兑换券` + hint `选择一张加入货架`.
- Two voucher cards side by side (same visual as `VoucherShelf` filled slots). Each card is a button that calls `onPick(index)`.
- Below the cards, a secondary button `放弃` (Skip) that calls `onSkip()`.
- Preview: each candidate card highlights with the satisfied visual if current `inventory` already matches it. Gives the player a basis for choosing.

### Modified

#### `src/components/game/WallPicker.jsx`

- Already has a `compact` flag. Used in non-compact mode (`compact={false}`) for the `wall_choice` phase.
- No visual changes. The existing color/function/unlock/cell-tag rendering all carries over.
- Remove the `onRefresh`, `refreshCount`, `gold`, `drawCount`, `disabled` props that relate to the shop-panel integration. The new call site passes only `{ candidates, onSelect }`. (Unlock conditions based on `drawCount`/`gold` are kept if they still exist on `wall.unlockCondition` — but since the new flow doesn't have "earn draws to unlock walls in a persistent shop," unlock gating may be effectively always-open. Confirmed with designer during brainstorming: this is acceptable for now; unlock conditions can be kept as data but won't gate picks in the sequential flow. Implementation will render unlock badges as informational only, not blocking.)

#### `src/GameCore.jsx`

- Delete the `phase === 'pool_selection'` block containing the `商店` panel (current lines ~275–394 including the shop header, wall row, voucher row, PoolCardUI calls, `displayedProfitCards.map`, and the voucher-take buttons).
- Add `phase === 'wall_choice'` branch rendering `<WallPicker candidates={wallCandidates} onSelect={pickWall} />` centered.
- Add `phase === 'incoming_voucher'` branch rendering `<IncomingVoucherPicker candidates={incomingVoucherCandidates} inventory={inventory} onPick={pickVoucher} onSkip={skipVoucher} t={t} />`.
- Restructure the gameplay layout to a 3-column flex: left rail `<VoucherShelf ... />`, center phase-content, right panel `renderInventory()` (unchanged). All three visible across `wall_choice`, `drawing`, `incoming_voucher`.
- Import cleanup: remove unused imports tied to the shop panel (`displayedProfitCards` bindings, `refreshWalls`, etc.).

#### `src/components/game/CardDock.jsx`

Investigated during implementation. If it is the bottom dock that currently displays held profit cards or the pool-selection card dock, it is deleted (its responsibility moves to `VoucherShelf`). If it turns out to serve another purpose, it stays and this section is revised.

### Deleted

- The 100+ line shop panel JSX in `GameCore.jsx`.
- `generateDisplayCards` helper in `useGameLogic.js` (if it exists only for the shop row).
- Shop-related `AP_CONFIG` keys listed above.
- `CardDock.jsx` pending the check above.

## i18n

New keys to add to `src/utils/translations.js`:

- `新兑换券` → `New Voucher`
- `选择一张加入货架` → `Choose one for the shelf`
- `放弃` → `Skip` (may already exist — check before adding)
- `兑换货架` → `Voucher Shelf`
- `空栏位` → `Empty slot`

Existing keys reused unchanged: `选择下一面奖品墙`, `物品兑换券`, `退出奖品墙`, `奖品墙`.

Keys retired (remove from `translations.js` if only referenced by deleted shop UI):

- `商店`, `兑换券商店`, `奖品墙商店`, `兑换券`, `暂无兑换券`, `兑换券已满`, `获取兑换券`

## Flow walkthroughs

### Fresh game

1. `startGame()` → `voucherShelf = [null, null, null, null]`, `dangerCards = [1 danger]`, `wallCandidates = roll3()`, `phase = 'wall_choice'`.
2. Player sees left rail with 4 empty slots, center `WallPicker` with 3 cards, right inventory empty.
3. Player clicks a wall candidate → `pickWall(i)` → `currentPool` set, grid generated, `wallCandidates = []`, `phase = 'drawing'`.
4. Player draws. After the first turn ends, `continueToNextTurn` fires: AP reset, new danger card spawned, shelf has nulls → `incomingVoucherCandidates = roll2()`, `phase = 'incoming_voucher'`.
5. Player sees the center flip to `IncomingVoucherPicker` with 2 candidates. Picks one → slot 0 filled → `phase = 'drawing'`.

### Drained wall mid-turn

1. Player draws the last cell of the current wall. The draw handler nulls the cell and detects `grid.every(row => row.every(c => c === null))`.
2. Drain handler clears `currentPool`, re-rolls `wallCandidates` (3), transitions to `wall_choice`. Turn is not ended — remaining AP carries over.
3. Player picks a new wall → `drawing`. No `incoming_voucher` fires here because no turn boundary crossed.

### Shelf full

1. Turn ends with all 4 shelf slots filled.
2. `continueToNextTurn`: `voucherShelf.some(s => s === null)` is false → skip draft → `phase = 'drawing'`.
3. No `incoming_voucher` pre-emption, player continues drawing.

### Evacuation

1. Player has 3+ satisfied vouchers on the shelf; `canEvacuate` is true.
2. Player presses evacuate. `handleEvacuate()` iterates `voucherShelf.filter(Boolean)`, for each satisfied voucher pushes `reward.items` into the expedition snapshot with `isOutOfGame: true`.
3. Inventory cleared, shelf cleared, next expedition setup (or final game summary).

## Verification plan

No automated tests exist in this repo (confirmed by `CLAUDE.md`). Verification is manual via `npm run dev`:

1. **Fresh game entry:** start → see `wall_choice` with 3 cards → left rail shows 4 empty slots → right inventory empty. Pick wall → enter `drawing`.
2. **First turn draft:** end turn 1 → see `incoming_voucher` center panel with 2 candidates → left rail still shows 4 empty slots → pick one → slot 0 filled, shelf shows the voucher.
3. **Draft skip:** end turn 2 → draft appears → click `放弃` → no slot fills → shelf still has 3 empties → next turn draft reappears.
4. **Shelf satisfaction:** draw stickers that match a shelf voucher → voucher card flips to satisfied visual (green border). Satisfy 3 total → evacuation button becomes enabled.
5. **Wall drain:** manually draw until all cells are null → `wall_choice` appears automatically → pick a new wall → drawing continues with the same AP pool.
6. **Explicit exit:** press `退出奖品墙` mid-wall → `wall_choice` appears → pick another wall.
7. **Full shelf:** fill all 4 slots via consecutive drafts → end a turn with shelf full → no draft fires, lands directly in `drawing`.
8. **Evacuate:** with 3 satisfied vouchers, click evacuate → expedition summary shows reward items from satisfied vouchers → shelf is empty on next expedition.
9. **Reset:** press reset at any point → returns to `pre_game` cleanly → starting a new game shows fresh `wall_choice`.
10. **i18n toggle:** switch to EN at each phase → all new strings render in English, no raw Chinese keys leak.

Visual regression: compare `drawing` phase against current HEAD's `drawing` view — the center matrix and right inventory should be pixel-identical. Only the left rail (new) and the absence of the bottom `CardDock` (if deleted) should differ.

## Risks

- **`CardDock.jsx` uncertainty.** The design assumes it's a held-voucher display that gets replaced, but this is unverified. Implementation starts by reading `CardDock.jsx` and adjusting the plan if its role is different.
- **`slotCards` split blast radius.** `slotCards` is referenced across `GameCore.jsx`, `useGameLogic.js`, and possibly `PassiveCard.jsx`. Every read site needs to be classified as "danger" or "profit" and routed to the correct new source. A grep-driven sweep is required during implementation; there's a risk a reference is missed and causes a silent bug.
- **Unlock condition semantics.** The current `wall.unlockCondition` is built around the shop panel's "earn gold/draws to unlock a wall tile" flow. In sequential mode, "unlock" has no clear meaning — all 3 offered walls should be pickable. Plan: render unlock info as informational badges but don't gate `pickWall`. If the designer wants gating later, it's a small follow-up.
- **Wall refresh is gone.** Currently the shop has a refresh button costing AP. Sequential mode has no equivalent. If the 3 candidates are bad, the player is stuck with the best of 3. This is consistent with bcab896 and matches the designer's stated direction, but is a meaningful playability shift worth noting.
