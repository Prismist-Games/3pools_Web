# Sequential Wall Choice + Voucher Shelf

**Date:** 2026-04-15
**Branch:** `core-draw/prize-board-selection`
**Baseline:** commit `001d2b1` (current HEAD)
**Reference port source:** commit `bcab896` (April 14 build, for flow only)

## Motivation

The current build has a persistent `🏪 商店` panel that shows 5 walls and 2 purchasable vouchers side by side. The bcab896 build (5 commits older) used a different flow: a dedicated `wall_choice` phase with 3 candidates, a persistent left-rail `BulletinBoard` shelf, and an `incoming_order` drafting phase. The designer wants to restore bcab896's *flow* — sequential wall picks, persistent shelf, drafting — while keeping the current build's richer wall content (wall colors, wall functions, cell tags, draw limits — unlock conditions become informational only in the new flow) and the current voucher mechanic (passive sticker-match profit cards).

This is a UX swap on top of preserved mechanics. Wall *content* stays as it is today; wall *flow* returns to sequential picking. Voucher *semantics* stay passive (match inventory, evacuate at 3 satisfied); voucher *surface* moves from a shop row to a persistent 5-slot shelf that starts full and churns via an end-of-turn 2-of-1 replacement draft.

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

- `voucherShelf: SlotCard[]` — fixed length **5**. Always full while the game is in progress; there are no empty slots and no nulls. Only profit vouchers live here.
- `wallCandidates: Wall[]` — length 3, re-rolled whenever the game enters `wall_choice`.
- `voucherDraftCandidates: SlotCard[] | null` — length 2 while a draft is live, `null` otherwise.
- `dangerCards: SlotCard[]` — split out of the existing mixed `slotCards` array so the shelf is vouchers-only.

### Modified state

- `slotCards` is retired as a mixed bucket. Profit cards move to `voucherShelf`, danger cards move to `dangerCards`. Any code reading `slotCards.filter(c => c.type === 'profit')` reads `voucherShelf` directly; any code reading `slotCards.filter(c => c.type === 'danger')` reads `dangerCards` instead.
- `canEvacuate` is derived from `voucherShelf.filter(v => canSatisfyCard(v, inventory)).length >= EVACUATION_PROFIT_REQUIREMENT`.
- `satisfiedProfitCount` derivation moves to the same source.

### Added actions

- `pickWall(index: number)` — replaces the old `enterPool(uid)` call site. Takes the chosen candidate from `wallCandidates`, sets it as `currentPool`, generates its grid, clears `wallCandidates`, transitions to `drawing`.
- `exitWall()` — ends the current wall explicitly (existing "退出奖品墙" button). Clears `currentPool`, re-rolls `wallCandidates`, transitions to `wall_choice`.
- `replaceVoucher(candidateIdx: 0 | 1, targetSlotIdx: 0..4)` — takes the chosen candidate from `voucherDraftCandidates`, overwrites `voucherShelf[targetSlotIdx]` with it, clears `voucherDraftCandidates`, then calls `continueToNextTurn()` internally to finish the turn transition.
- `skipVoucherDraft()` — clears `voucherDraftCandidates` without modifying the shelf, then calls `continueToNextTurn()` internally.

Both actions are the exit points for the `voucher_draft` phase; after either, `continueToNextTurn` runs AP reset + danger spawn + phase transition. `continueToNextTurn` itself transitions to `drawing` only if `currentPool` is non-null — if the player drained a wall and hasn't picked a new one yet, it transitions to `wall_choice` instead (see the corner case below).

### Modified actions

- `startGame()` — pre-rolls 5 vouchers into `voucherShelf` via the existing `generateSlotCard('profit')` factory, sets `dangerCards = [generateSlotCard('danger', { turnCreated: 1 })]`, rolls `wallCandidates` (3), sets `phase = 'wall_choice'`.
- `endTurn()` — end-of-turn danger check reads from `dangerCards` (not the mixed `slotCards`). `dangerCards` is cleared after the check as it is today. After the check, **unconditionally** rolls 2 fresh profit candidates into `voucherDraftCandidates` and transitions to `voucher_draft`. The draft always fires at turn end.
- `continueToNextTurn()` — entered via the draft's replace/skip actions, not directly from `endTurn` anymore. Resets AP, spawns the turn's new danger cards, then transitions to `drawing` if `currentPool` is non-null or to `wall_choice` (with freshly rolled `wallCandidates`) if `currentPool` is null.
- `handleEvacuate()` / final-score snapshot — iterates `voucherShelf` (no filter needed) to compute reward items from satisfied vouchers. Shelf is cleared alongside the existing inventory clear.
- `handleReset()` — clears `voucherShelf`, `wallCandidates`, `voucherDraftCandidates`, `dangerCards` back to empty.
- `startNextExpedition()` — same as `startGame`: pre-rolls 5 fresh vouchers into `voucherShelf`.
- Internal drain detection — when a draw empties the grid (all cells null), auto-call the same logic as `exitWall()` so the player lands in `wall_choice` without a manual press.

## Phase model

```
pre_game → wall_choice → drawing ─────→ voucher_draft ──→ drawing (next turn)
                          │                                   ↑
                          └──→ wall_choice (wall drained OR exitWall)
```

- Rename `'pool_selection'` → `'wall_choice'`. One pass across the codebase; the JSDoc comment on `phase` is updated to the new list: `'pre_game' | 'wall_choice' | 'drawing' | 'voucher_draft' | 'game_over'`.
- `voucher_draft` fires at end of every turn, unconditionally, triggered from `endTurn`. It pre-empts the next turn's `drawing` until the player replaces or skips. There is no "shelf is full, skip the draft" short-circuit — the shelf is always full, so the draft is always a replacement decision.
- `wall_choice` fires on game start, on full drain, and on `exitWall`. Never triggered by a turn boundary — turn transitions don't affect the current wall.

## Components

### New

#### `src/components/game/VoucherShelf.jsx`

Persistent left-rail component, mounted in `GameCore.jsx` for every gameplay phase (`wall_choice`, `drawing`, `voucher_draft`). Not mounted in `pre_game` or `game_over`.

**Props:** `{ shelf, inventory, evacuationProfitRequirement, t, highlightForDraft, onSlotClick }`

**Behavior:**
- Renders 5 slots vertically. Slots are always non-null.
- Each slot uses the same voucher card visual currently embedded in `GameCore.jsx`'s shop row (header with 💎 + `物品兑换券`, sticker requirement chips with typeSatisfied coloring, reward item row with `GameCard`). Green border + gradient when `canSatisfyCard(voucher, inventory)` returns true.
- Shelf header shows `📋 兑换货架` and a progress indicator `N/${evacuationProfitRequirement} satisfied`. When satisfied count ≥ requirement, the header gets a celebratory ring (matches the current evacuation-ready visual from `PassiveCard`).
- **Draft-targeting mode:** when `highlightForDraft` is truthy (set while the player has armed a draft candidate), every slot becomes clickable and gets a hover-ready ring. Clicking a slot calls `onSlotClick(slotIdx)`. Outside of draft mode the shelf is purely informational — no click handlers, no submit behavior.

**Not a port of `BulletinBoard.jsx`.** New file. The visual reference is the left-rail feel of bcab896 but the content is today's vouchers.

#### `src/components/game/VoucherDraftPicker.jsx`

Center-panel component, mounted in `GameCore.jsx` when `phase === 'voucher_draft'`.

**Props:** `{ candidates, inventory, armedCandidateIdx, onArm, onSkip, t }` where `onArm(idx | null)` toggles the armed selection.

**Behavior — two-step interaction:**
1. **Arm phase:** component renders a header `新兑换券` + hint `选择一张替换货架上的兑换券`, then two candidate voucher cards side by side. Clicking a candidate calls `onArm(idx)`. When `armedCandidateIdx` is non-null, that card renders with a persistent ring + highlight.
2. **Target phase (driven externally):** once a candidate is armed, the hint text swaps to `点击要替换的货架栏位`. The actual targeting click happens on `VoucherShelf` (which is rendered by `GameCore`, not by this component). The picker itself doesn't handle shelf clicks — it only owns its own cards and the skip button.
3. **Un-arm:** clicking the currently armed candidate again calls `onArm(null)` (un-arm). Clicking the other candidate calls `onArm(otherIdx)` (switch). No-op clicks elsewhere in the picker.
4. **Skip:** a secondary `放弃` button is always visible and always active, regardless of arm state. Clicking it calls `onSkip()` — no shelf mutation, `phase` returns to `drawing`.

Candidate cards use the same voucher visual as `VoucherShelf` slots. Preview coloring: each candidate highlights with the satisfied visual if the current `inventory` already satisfies its sticker requirements, so the player can judge whether a candidate would immediately improve the satisfied count.

**State ownership:** `armedCandidateIdx` lives in `GameCore` local state, not in `useGameLogic` and not in `VoucherDraftPicker`. Both the picker (for its own highlight) and `VoucherShelf` (for its targeting-mode ring) need to read the armed state, so lifting it to the common parent is the cleanest split. The hook only sees the final `replaceVoucher(candidateIdx, slotIdx)` or `skipVoucherDraft()` call. The shelf is always full of 5 vouchers, so there is no empty-slot fallback state to coordinate.

### Modified

#### `src/components/game/WallPicker.jsx`

- Already has a `compact` flag. Used in non-compact mode (`compact={false}`) for the `wall_choice` phase.
- No visual changes. The existing color/function/unlock/cell-tag rendering all carries over.
- Remove the `onRefresh`, `refreshCount`, `gold`, `drawCount`, `disabled` props that relate to the shop-panel integration. The new call site passes only `{ candidates, onSelect }`. (Unlock conditions based on `drawCount`/`gold` are kept if they still exist on `wall.unlockCondition` — but since the new flow doesn't have "earn draws to unlock walls in a persistent shop," unlock gating may be effectively always-open. Confirmed with designer during brainstorming: this is acceptable for now; unlock conditions can be kept as data but won't gate picks in the sequential flow. Implementation will render unlock badges as informational only, not blocking.)

#### `src/GameCore.jsx`

- Delete the `phase === 'pool_selection'` block containing the `商店` panel (current lines ~275–394 including the shop header, wall row, voucher row, PoolCardUI calls, `displayedProfitCards.map`, and the voucher-take buttons).
- Add `phase === 'wall_choice'` branch rendering `<WallPicker candidates={wallCandidates} onSelect={pickWall} />` centered.
- Add `phase === 'voucher_draft'` branch. `GameCore` owns the "armed candidate" coordination between `VoucherDraftPicker` and `VoucherShelf`: it holds a local `armedCandidateIdx` state, passes it into both components so the picker knows which candidate is highlighted and the shelf knows it should enter targeting mode. The shelf's `onSlotClick(slotIdx)` handler in `GameCore` reads the armed index and calls `replaceVoucher(armedIdx, slotIdx)`, then resets the local state.
- Restructure the gameplay layout to a 3-column flex: left rail `<VoucherShelf ... />`, center phase-content, right panel `renderInventory()` (unchanged). All three visible across `wall_choice`, `drawing`, `voucher_draft`.
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
- `选择一张替换货架上的兑换券` → `Choose one to replace a shelf voucher`
- `点击要替换的货架栏位` → `Click the shelf slot to replace`
- `放弃` → `Skip` (may already exist — check before adding)
- `兑换货架` → `Voucher Shelf`

Existing keys reused unchanged: `选择下一面奖品墙`, `物品兑换券`, `退出奖品墙`, `奖品墙`.

Keys retired (remove from `translations.js` if only referenced by deleted shop UI):

- `商店`, `兑换券商店`, `奖品墙商店`, `兑换券`, `暂无兑换券`, `兑换券已满`, `获取兑换券`, `空栏位` (if it exists)

## Flow walkthroughs

### Fresh game

1. `startGame()` → `voucherShelf = [v0, v1, v2, v3, v4]` (5 fresh profit cards), `dangerCards = [1 danger]`, `wallCandidates = roll3()`, `phase = 'wall_choice'`.
2. Player sees left rail with 5 pre-rolled vouchers (satisfied flags computed against empty inventory — almost certainly all unsatisfied), center `WallPicker` with 3 cards, right inventory empty.
3. Player clicks a wall candidate → `pickWall(i)` → `currentPool` set, grid generated, `wallCandidates = []`, `phase = 'drawing'`.
4. Player draws for the turn, then presses end turn. `endTurn()` runs danger check, clears `dangerCards`, rolls `voucherDraftCandidates = roll2()`, `phase = 'voucher_draft'`.
5. Center flips to `VoucherDraftPicker`. Player clicks candidate 0 → `armedCandidateIdx = 0` → picker highlights card 0, shelf enters targeting mode, hint updates. Player clicks shelf slot 2 → `replaceVoucher(0, 2)` → `voucherShelf[2]` becomes the armed candidate, `voucherDraftCandidates = null`, `armedCandidateIdx = null`, `continueToNextTurn()` runs (AP reset, new danger spawned), `phase = 'drawing'`.

### Skipped draft

1. Turn ends, `voucher_draft` opens.
2. Player reviews both candidates, decides neither is worth swapping in.
3. Player clicks `放弃`. `skipVoucherDraft()` runs, `voucherDraftCandidates = null`, `continueToNextTurn()` runs, `phase = 'drawing'`. Shelf is unchanged.

### Drained wall mid-turn

1. Player draws the last cell of the current wall. The draw handler nulls the cell and detects `grid.every(row => row.every(c => c === null))`.
2. Drain handler clears `currentPool`, re-rolls `wallCandidates` (3), transitions to `wall_choice`. Turn is not ended — remaining AP carries over.
3. Player picks a new wall → `drawing`. No `voucher_draft` fires here because no turn boundary crossed.

### Drained wall + end turn without picking a new wall

1. Player drains their wall mid-turn and lands in `wall_choice`. Instead of picking, they press end turn.
2. `endTurn()` runs danger check from `wall_choice` (allowed), rolls voucher draft candidates, transitions to `voucher_draft`. `currentPool` is still null.
3. Player resolves the draft (replace or skip). Their action calls `continueToNextTurn()`.
4. `continueToNextTurn()` sees `currentPool === null`, re-rolls `wallCandidates` (clearing any previous ones), transitions to `wall_choice` — not `drawing`.
5. Player picks a wall on the next turn and starts drawing fresh.

### Evacuation

1. Player has 3+ satisfied vouchers on the shelf; `canEvacuate` is true.
2. Player presses evacuate. `handleEvacuate()` iterates `voucherShelf`, for each satisfied voucher pushes `reward.items` into the expedition snapshot with `isOutOfGame: true`.
3. Inventory cleared, shelf re-rolled with 5 fresh vouchers for the next expedition (or cleared entirely if the run is over).

## Verification plan

No automated tests exist in this repo (confirmed by `CLAUDE.md`). Verification is manual via `npm run dev`:

1. **Fresh game entry:** start → see `wall_choice` with 3 cards → left rail shows 5 pre-rolled vouchers → right inventory empty. Pick wall → enter `drawing`.
2. **Turn-end draft — replace:** end turn 1 → see `voucher_draft` center panel with 2 candidates → left rail still shows original 5 vouchers → click candidate A → card A rings up, shelf slots get hover rings, hint changes → click shelf slot 2 → slot 2 is now candidate A, shelf still has 5 vouchers total, `phase` returns to `drawing`.
3. **Turn-end draft — skip:** end turn 2 → draft opens → click `放弃` → shelf unchanged, `phase` returns to `drawing`.
4. **Un-arm:** open a draft → click candidate A → click candidate A again → candidate A un-arms, shelf exits targeting mode. Click candidate A → click candidate B → candidate B is armed instead of A.
5. **Shelf satisfaction:** draw stickers that match a shelf voucher → voucher card flips to satisfied visual (green border). Satisfy 3 total → evacuation button becomes enabled, shelf header shows the celebratory ring.
6. **Wall drain:** manually draw until all cells are null → `wall_choice` appears automatically → pick a new wall → drawing continues with the same AP pool.
7. **Explicit exit:** press `退出奖品墙` mid-wall → `wall_choice` appears → pick another wall.
8. **Evacuate:** with 3 satisfied vouchers, click evacuate → expedition summary shows reward items from satisfied vouchers → next expedition starts with 5 fresh vouchers on the shelf.
9. **Reset:** press reset at any point → returns to `pre_game` cleanly → starting a new game shows fresh `wall_choice` and a fresh 5-voucher shelf.
10. **i18n toggle:** switch to EN at each phase → all new strings render in English, no raw Chinese keys leak.

Visual regression: compare `drawing` phase against current HEAD's `drawing` view — the center matrix and right inventory should be pixel-identical. Only the left rail (new) and the absence of the bottom `CardDock` (if deleted) should differ.

## Risks

- **`CardDock.jsx` uncertainty.** The design assumes it's a held-voucher display that gets replaced, but this is unverified. Implementation starts by reading `CardDock.jsx` and adjusting the plan if its role is different.
- **`slotCards` split blast radius.** `slotCards` is referenced across `GameCore.jsx`, `useGameLogic.js`, and possibly `PassiveCard.jsx`. Every read site needs to be classified as "danger" or "profit" and routed to the correct new source. A grep-driven sweep is required during implementation; there's a risk a reference is missed and causes a silent bug.
- **Unlock condition semantics.** The current `wall.unlockCondition` is built around the shop panel's "earn gold/draws to unlock a wall tile" flow. In sequential mode, "unlock" has no clear meaning — all 3 offered walls should be pickable. Plan: render unlock info as informational badges but don't gate `pickWall`. If the designer wants gating later, it's a small follow-up.
- **Wall refresh is gone.** Currently the shop has a refresh button costing AP. Sequential mode has no equivalent. If the 3 candidates are bad, the player is stuck with the best of 3. This is consistent with bcab896 and matches the designer's stated direction, but is a meaningful playability shift worth noting.
- **Forced-interaction friction.** The draft fires unconditionally every single turn, even when the shelf is already well-tuned and the player just wants to keep drawing. Mitigated by the always-available `放弃` button, but it's still one extra click per turn. If playtesting shows this is annoying, a future refinement could auto-skip when the player's shelf is already fully satisfied (≥5 satisfied vouchers) or when both candidates are strictly worse than the current weakest shelf entry. Out of scope for this change.
- **Split-brain state between `GameCore` and `useGameLogic`.** The armed candidate index lives in `GameCore` local state while the candidate array lives in the hook. Two sources of truth for the same interaction. Alternative considered: put `armedCandidateIdx` in the hook. Rejected because it's purely a UI-interaction concept — the hook shouldn't care which card the player is hovering. Consequence: `GameCore` must reset `armedCandidateIdx` on phase exits and on skip, which is a small correctness burden the implementation must track carefully.
- **Duplicate candidates vs current shelf.** Draft candidates are rolled freshly from `generateSlotCard('profit')` with no dedup against `voucherShelf`. The player might see a candidate that's structurally identical (or very similar) to one they already hold. Accepted as-is for simplicity — the player can just skip or replace a different slot. If the generator has very few distinct profit-card shapes this becomes more noticeable, and deduping is a ~5-line follow-up.
