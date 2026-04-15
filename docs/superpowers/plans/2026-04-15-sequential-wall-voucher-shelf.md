# Sequential Wall Choice + Voucher Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent `🏪 商店` panel (5 walls + 2 purchasable vouchers) with bcab896's sequential flow — `wall_choice` picker with 3 candidates, a left-rail `VoucherShelf` of 5 passive vouchers, and an end-of-turn `voucher_draft` 2-of-1 replacement picker.

**Architecture:** UX swap on top of preserved mechanics. The `useGameLogic` hook gains `voucherShelf` / `wallCandidates` / `voucherDraftCandidates` state and loses `revealedPools` / `displayedProfitCards`. `GameCore.jsx` replaces the shop block with two new phase branches (`wall_choice`, `voucher_draft`) and a persistent left rail mounting a new `VoucherShelf` component. Draw mechanics, AP economy, inventory, danger cards, Kitchen, and evacuation logic stay unchanged.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Lucide React, JavaScript (ESM/.jsx). No test suite — verification is `npm run lint` + manual walkthrough via `npm run dev` on http://localhost:5173/3pools_Web/.

**Spec:** `docs/superpowers/specs/2026-04-15-sequential-wall-voucher-shelf-design.md`

**Baseline:** commit `2a6c066` (spec) on branch `core-draw/prize-board-selection`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/game/VoucherShelf.jsx` | **Create** | Left-rail component, 5 always-full voucher slots, supports draft-targeting mode |
| `src/components/game/VoucherDraftPicker.jsx` | **Create** | Center-panel 2-candidate picker with arm/skip interaction |
| `src/components/game/CardDock.jsx` | Modify | Shrink to danger + evacuation only (profit section removed) |
| `src/components/game/WallPicker.jsx` | Modify (minimal) | Drop shop-panel props from the call site; visuals unchanged |
| `src/hooks/useGameLogic.js` | Modify (large) | Add new state/actions, retire shop state, rename phase, rewrite turn flow |
| `src/GameCore.jsx` | Modify (large) | Delete shop block, add `wall_choice` + `voucher_draft` branches, mount `VoucherShelf` in left rail, own armed-candidate local state |
| `src/data/v3Config.js` | Modify (small) | Delete dead `AP_CONFIG` keys |
| `src/utils/translations.js` | Modify (small) | Add new strings, retire shop-only strings |

**Task order rationale:** Additive changes first (new components, i18n additions), then the atomic hook + GameCore cutover, then cleanup. The two big cutover tasks (T5 and T6) happen back-to-back so the build is only briefly broken between them.

**Deviation from spec:** The spec calls for splitting `slotCards` into `voucherShelf` (new) + `dangerCards` (new state). The plan keeps `slotCards` as a state variable but drains it down to dangers-only (profit cards move to `voucherShelf`). The hook's derived export is still called `dangerCards`, so `GameCore` and `CardDock` don't see the difference. This is a smaller, safer migration that preserves the existing danger-card rotation logic verbatim.

---

## Task 1: Create `VoucherShelf` component

**Files:**
- Create: `src/components/game/VoucherShelf.jsx`

This task is pure additive — a new file, no existing code is touched, the app keeps working.

- [ ] **Step 1: Create the file**

Write `src/components/game/VoucherShelf.jsx`:

```jsx
import React from 'react';
import { canSatisfyCard, getRequirements, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * VoucherShelf — persistent left-rail column of 5 voucher slots.
 *
 * Props:
 *   shelf: SlotCard[]                (length 5, always non-null during gameplay)
 *   inventory: InventoryItem[]
 *   evacuationProfitRequirement: number
 *   highlightForDraft: boolean       (true while player has armed a draft candidate)
 *   onSlotClick: (slotIdx: number) => void  (only called when highlightForDraft is true)
 *   t: (key: string) => string
 */
export default function VoucherShelf({
    shelf,
    inventory,
    evacuationProfitRequirement,
    highlightForDraft = false,
    onSlotClick,
    t,
}) {
    const satisfiedCount = shelf.filter(v => v && canSatisfyCard(v, inventory)).length;
    const evacReady = satisfiedCount >= evacuationProfitRequirement;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-56 flex-shrink-0 self-start">
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
                evacReady
                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 border-emerald-200 ring-1 ring-emerald-300'
                    : 'bg-gray-50 border-gray-100'
            }`}>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                        📋 {t('兑换货架')}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        evacReady ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                        {satisfiedCount}/{evacuationProfitRequirement}
                    </span>
                </div>
            </div>

            {/* Slot column */}
            <div className="p-2 flex flex-col gap-2">
                {shelf.map((voucher, slotIdx) => {
                    const satisfied = voucher ? canSatisfyCard(voucher, inventory) : false;
                    const reqs = voucher ? getRequirements(voucher) : {};
                    const reqEntries = Object.entries(reqs);
                    const clickable = highlightForDraft && !!onSlotClick;

                    const borderClass = satisfied
                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50';

                    const targetRing = clickable
                        ? 'ring-2 ring-amber-400 ring-offset-1 cursor-pointer hover:ring-amber-500 hover:scale-[1.02]'
                        : '';

                    return (
                        <button
                            key={slotIdx}
                            type="button"
                            onClick={clickable ? () => onSlotClick(slotIdx) : undefined}
                            disabled={!clickable}
                            className={`w-full rounded-lg border-2 p-2 flex flex-col gap-1.5 transition-all text-left ${borderClass} ${targetRing} ${!clickable ? 'cursor-default' : ''}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-lg leading-none">💎</span>
                                <span className="font-black text-xs truncate">{t('物品兑换券')}</span>
                            </div>

                            {/* Sticker requirements */}
                            <div className="flex items-center gap-1 flex-wrap">
                                {reqEntries.map(([stickerType, count]) => {
                                    const info = getStickerTypeInfo(stickerType);
                                    const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                    const typeSatisfied = invCount >= count;
                                    return (
                                        <div
                                            key={stickerType}
                                            className={`relative w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm ${
                                                typeSatisfied
                                                    ? 'border-emerald-400 bg-emerald-50'
                                                    : 'border-dashed border-gray-300 bg-white/50'
                                            }`}
                                        >
                                            <span className={typeSatisfied ? '' : 'opacity-40'}>
                                                {info?.icon || '?'}
                                            </span>
                                            {count > 1 && (
                                                <span className="absolute -top-1 -right-1.5 text-[8px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">
                                                    ×{count}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reward preview */}
                            {voucher?.reward?.items && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    {voucher.reward.items.map((item, i) => (
                                        <GameCard
                                            key={i}
                                            icon={item.icon}
                                            label={t(item.name)}
                                            stars={item.stars}
                                            tags={item.tags}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Run lint to verify the file parses**

Run: `npm run lint`
Expected: PASS (no new errors from `VoucherShelf.jsx`). Pre-existing warnings in unrelated files are OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/VoucherShelf.jsx
git commit -m "$(cat <<'EOF'
feat(shelf): add VoucherShelf left-rail component

Persistent 5-slot column showing held vouchers. Supports a
draft-targeting mode (highlightForDraft prop) where each slot
becomes a click target, used by the upcoming voucher_draft phase.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `VoucherDraftPicker` component

**Files:**
- Create: `src/components/game/VoucherDraftPicker.jsx`

Pure additive — new file, no existing code touched.

- [ ] **Step 1: Create the file**

Write `src/components/game/VoucherDraftPicker.jsx`:

```jsx
import React from 'react';
import { canSatisfyCard, getRequirements, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * VoucherDraftPicker — center-panel 2-of-1 replacement draft.
 *
 * Props:
 *   candidates: SlotCard[]           (length 2)
 *   inventory: InventoryItem[]
 *   armedCandidateIdx: number | null (owned by GameCore, not this component)
 *   onArm: (idx: number | null) => void
 *   onSkip: () => void
 *   t: (key: string) => string
 *
 * Interaction: click a candidate → arms it (or un-arms if already armed / switches if other is armed).
 * The actual replacement commit happens when the player clicks a slot in VoucherShelf —
 * that click is handled by GameCore, not this component. This component only owns the
 * candidate cards and the skip button.
 */
export default function VoucherDraftPicker({
    candidates,
    inventory,
    armedCandidateIdx,
    onArm,
    onSkip,
    t,
}) {
    if (!candidates || candidates.length === 0) return null;

    const hint = armedCandidateIdx !== null
        ? t('点击要替换的货架栏位')
        : t('选择一张替换货架上的兑换券');

    return (
        <div className="flex justify-center py-6">
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-300 p-6 max-w-xl text-center">
                <h2 className="text-base font-bold mb-1">{t('新兑换券')}</h2>
                <p className="text-[11px] text-gray-400 mb-4">{hint}</p>

                <div className="flex gap-4 justify-center mb-4">
                    {candidates.map((voucher, idx) => {
                        const satisfied = canSatisfyCard(voucher, inventory);
                        const reqs = getRequirements(voucher);
                        const reqEntries = Object.entries(reqs);
                        const isArmed = armedCandidateIdx === idx;

                        const nextArm = isArmed ? null : idx;

                        return (
                            <button
                                key={voucher.id ?? idx}
                                type="button"
                                onClick={() => onArm(nextArm)}
                                className={`w-48 p-3 rounded-xl border-2 flex flex-col gap-1.5 transition-all text-left cursor-pointer ${
                                    satisfied
                                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50'
                                } ${isArmed ? 'ring-4 ring-amber-400 ring-offset-2 scale-[1.03] shadow-lg' : 'hover:shadow-md'}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg leading-none">💎</span>
                                    <span className="font-black text-xs truncate">{t('物品兑换券')}</span>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                    {reqEntries.map(([stickerType, count]) => {
                                        const info = getStickerTypeInfo(stickerType);
                                        const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                        const typeSatisfied = invCount >= count;
                                        return (
                                            <div
                                                key={stickerType}
                                                className={`relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                                                    typeSatisfied
                                                        ? 'border-emerald-400 bg-emerald-50'
                                                        : 'border-dashed border-gray-300 bg-white/50'
                                                }`}
                                            >
                                                <span className={typeSatisfied ? '' : 'opacity-40'}>
                                                    {info?.icon || '?'}
                                                </span>
                                                {count > 1 && (
                                                    <span className="absolute -top-1 -right-2 text-[9px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">
                                                        ×{count}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {voucher.reward?.items && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {voucher.reward.items.map((item, i) => (
                                            <GameCard
                                                key={i}
                                                icon={item.icon}
                                                label={t(item.name)}
                                                stars={item.stars}
                                                tags={item.tags}
                                                size="md"
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={onSkip}
                    className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
                >
                    {t('放弃')}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Run lint to verify the file parses**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/VoucherDraftPicker.jsx
git commit -m "$(cat <<'EOF'
feat(voucher-draft): add VoucherDraftPicker center-panel component

Two-step interaction picker for end-of-turn voucher replacement.
Clicking a candidate arms it; the actual commit click lands on a
VoucherShelf slot and is handled by GameCore. Skip button always
available regardless of arm state.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Shrink `CardDock` to danger + evacuation only

**Files:**
- Modify: `src/components/game/CardDock.jsx`

The current `CardDock` renders danger + profit + evacuation in a bottom row. In the new design, profit cards move to the left-rail `VoucherShelf` — `CardDock` keeps danger and evacuation only. This task is compatible with current `GameCore.jsx` (which still passes `profitCards` as a now-ignored prop) — safe to commit standalone.

It also updates the phase guard from `pool_selection` to `wall_choice` (the rename lands in Task 5; until then `CardDock` will be hidden during the shop phase, which is fine because we're about to delete the shop anyway).

- [ ] **Step 1: Overwrite the file with the shrunken version**

Replace the entire contents of `src/components/game/CardDock.jsx` with:

```jsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PassiveCard } from './PassiveCard';

/**
 * CardDock — collapsible bottom section showing danger cards + evacuation button.
 * Profit cards (vouchers) are now rendered in VoucherShelf (left rail), not here.
 */
export default function CardDock({
    dangerCards,
    inventory,
    canEvacuate,
    satisfiedProfitCount,
    evacuationProfitRequirement,
    evacuate,
    phase,
    t,
}) {
    const [expanded, setExpanded] = useState(true);

    const showDock = phase === 'wall_choice' || phase === 'drawing' || phase === 'voucher_draft';
    if (!showDock) return null;

    const totalCards = dangerCards.length + 1; // +1 for evacuation

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Clickable header bar */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-500">{t('持有卡牌')}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{totalCards}</span>
                </div>
                {expanded
                    ? <ChevronDown size={14} className="text-gray-400" />
                    : <ChevronUp size={14} className="text-gray-400" />
                }
            </button>

            {/* Collapsible card row */}
            {expanded && (
                <div className="px-3 py-2">
                    <div className="flex items-start gap-2 flex-wrap">
                        {/* Danger cards */}
                        {dangerCards.map(card => (
                            <PassiveCard
                                key={card.id}
                                card={card}
                                type="danger"
                                inventory={inventory}
                                t={t}
                            />
                        ))}

                        {/* Separator before evacuation */}
                        {dangerCards.length > 0 && (
                            <div className="w-px self-stretch bg-gray-200 shrink-0" />
                        )}

                        {/* Evacuation */}
                        <PassiveCard
                            card={null}
                            type="evacuation"
                            inventory={inventory}
                            canEvacuate={canEvacuate}
                            onEvacuate={evacuate}
                            satisfiedProfitCount={satisfiedProfitCount}
                            evacuationProfitRequirement={evacuationProfitRequirement}
                            t={t}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS. `GameCore.jsx` is still passing the old `profitCards` and `removeSlotCard` props — JavaScript will silently ignore them. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/CardDock.jsx
git commit -m "$(cat <<'EOF'
refactor(card-dock): remove profit rendering; danger + evacuate only

Profit cards move to the new VoucherShelf component. CardDock keeps
its danger and evacuation responsibilities. Phase guard updated for
the upcoming phase rename (wall_choice / voucher_draft).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add new i18n strings

**Files:**
- Modify: `src/utils/translations.js`

Add new translation keys. Retirement of dead shop strings happens later in Task 8, after the shop UI is gone.

- [ ] **Step 1: Find the right place to add keys**

Run: `grep -n '"物品兑换券"' src/utils/translations.js`
Expected: one line like `"物品兑换券": "Exchange Voucher",`

- [ ] **Step 2: Add new keys after `"物品兑换券"`**

Using the Edit tool, find the line `"物品兑换券": "Exchange Voucher",` and add these keys immediately after it (one block, exact Chinese keys):

```js
    "兑换货架": "Voucher Shelf",
    "新兑换券": "New Voucher",
    "选择一张替换货架上的兑换券": "Choose one to replace a shelf voucher",
    "点击要替换的货架栏位": "Click the shelf slot to replace",
```

- [ ] **Step 3: Verify `放弃` already exists (it does from the bcab896-era code)**

Run: `grep -n '"放弃"' src/utils/translations.js`
Expected: at least one match showing `"放弃": "..."`. If no match, add `"放弃": "Skip",` in the same insertion block. If it exists, move on.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/translations.js
git commit -m "$(cat <<'EOF'
i18n: add voucher shelf + draft strings

Adds translation keys for the new VoucherShelf header and the
VoucherDraftPicker hint text. Retirement of dead shop strings
lands in a later cleanup task.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Rewrite `useGameLogic` — state, actions, turn flow

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the big hook refactor. After this task, `GameCore.jsx` will fail to compile because it destructures names that no longer exist (`revealedPools`, `displayedProfitCards`, `refreshWalls`, `takeDisplayCard`, `enterPool`, `exitPool`, etc.). **Task 6 fixes `GameCore.jsx`** — commit this task's changes, immediately move to Task 6, don't try to run `npm run dev` in between.

**Strategy:** do targeted edits, not a full rewrite — the file is 874 lines long. Each sub-step is one logical change.

### 5.1 Update the phase comment

- [ ] **Step 1: Update the phase JSDoc comment**

Find line 35:
```js
    // phases: 'pre_game' | 'pool_selection' | 'drawing' | 'game_over'
```

Replace with:
```js
    // phases: 'pre_game' | 'wall_choice' | 'drawing' | 'voucher_draft' | 'game_over'
```

### 5.2 Replace wall-shop / display-card state with new state

- [ ] **Step 2: Replace the wall-shop state block**

Find lines 40–42:
```js
    // --- Wall Shop State ---
    const [revealedPools, setRevealedPools] = useState([]);   // shop wall instances (count: AP_CONFIG.wallShopSize)
    const [displayedProfitCards, setDisplayedProfitCards] = useState([]); // displayed profit cards (count: AP_CONFIG.displayCardCount)
```

Replace with:
```js
    // --- Wall Choice State ---
    const [wallCandidates, setWallCandidates] = useState([]); // 3 candidates for wall_choice phase

    // --- Voucher Shelf State ---
    const [voucherShelf, setVoucherShelf] = useState([]); // length 5 during gameplay, empty outside
    const [voucherDraftCandidates, setVoucherDraftCandidates] = useState(null); // null or length-2 array

    // --- Turn Transition Context ---
    // Snapshot of danger-card rotation info captured in endTurn and consumed in
    // continueToNextTurn after the voucher_draft phase resolves.
    const [pendingTurnContext, setPendingTurnContext] = useState(null);
```

### 5.3 Update derived `canDraw` / remove `canRefreshWalls`

- [ ] **Step 3: Replace the derived canDraw/canRefreshWalls block**

Find lines 80–81:
```js
    const canDraw = actionPoints >= AP_CONFIG.drawCost && phase === 'drawing' && !drawLimitReached;
    const canRefreshWalls = actionPoints >= AP_CONFIG.refreshCost && phase === 'pool_selection';
```

Replace with:
```js
    const canDraw = actionPoints >= AP_CONFIG.drawCost && phase === 'drawing' && !drawLimitReached;
```

### 5.4 Replace shop generator helpers

- [ ] **Step 4: Replace `generateShopWalls` with `generateWallChoiceCandidates`**

Find lines 83–115 — the block starting with `// WALL SHOP` and ending after `generateDisplayCards`:

```js
    // =============================================
    // WALL SHOP
    // =============================================

    // --- Slot card constants ---
    const MAX_PROFIT_CARDS = 5;

    // Cost-to-drawLimit mapping for wall shop
    const COST_DRAW_LIMIT = { 1: 3, 2: 5, 3: 7 };

    /** Generate shop walls with random entry costs and draw limits */
    const generateShopWalls = () => {
        const shopWalls = generateWallShop(AP_CONFIG.wallShopSize);
        return shopWalls.map(poolType => {
            const entryCost = 1 + Math.floor(Math.random() * 3); // 1-3 AP
            const drawLimit = COST_DRAW_LIMIT[entryCost] || 5;
            return {
                uid: generateUID(),
                poolType: { ...poolType, drawLimit },
                entryCost,
                drawLimit,
            };
        });
    };

    /** Generate profit cards for the display */
    const generateDisplayCards = () => {
        const cards = [];
        for (let i = 0; i < AP_CONFIG.displayCardCount; i++) {
            cards.push(generateSlotCard('profit', { turnCreated: turnNumber }));
        }
        return cards;
    };
```

Replace with:
```js
    // =============================================
    // WALL CHOICE + VOUCHER SHELF
    // =============================================

    // Cost-to-drawLimit mapping for wall candidates (reused from old shop — same wall shape)
    const COST_DRAW_LIMIT = { 1: 3, 2: 5, 3: 7 };

    /** Roll a fresh set of 3 wall candidates for wall_choice phase */
    const generateWallChoiceCandidates = () => {
        const walls = generateWallShop(3);
        return walls.map(poolType => {
            const entryCost = 1 + Math.floor(Math.random() * 3); // 1-3 AP
            const drawLimit = COST_DRAW_LIMIT[entryCost] || 5;
            return {
                uid: generateUID(),
                poolType: { ...poolType, drawLimit },
                entryCost,
                drawLimit,
            };
        });
    };

    /** Roll a fresh full 5-voucher shelf */
    const generateFullVoucherShelf = (turn) => {
        const shelf = [];
        for (let i = 0; i < 5; i++) {
            shelf.push(generateSlotCard('profit', { turnCreated: turn }));
        }
        return shelf;
    };

    /** Roll 2 voucher candidates for voucher_draft phase */
    const generateVoucherDraftCandidates = (turn) => {
        return [
            generateSlotCard('profit', { turnCreated: turn }),
            generateSlotCard('profit', { turnCreated: turn }),
        ];
    };
```

### 5.5 Replace `refreshWalls`, `canEnterPool`, `enterPool`, `exitPool`, `takeDisplayCard`, `canTakeCard`

- [ ] **Step 5: Delete the shop interaction block and replace with wall_choice + voucher_draft actions**

Find lines 117–201 — the block starting with `/** Refresh wall shop` and ending at the closing `};` of `canTakeCard`:

```js
    /** Refresh wall shop — costs AP, replaces all walls + profit cards */
    const refreshWalls = () => {
        if (!canRefreshWalls) return;
        setActionPoints(prev => prev - AP_CONFIG.refreshCost);
        const newWalls = generateShopWalls();
        setRevealedPools(newWalls);
        setDisplayedProfitCards(generateDisplayCards());
        showToast(`🔄 ${t('奖品墙已刷新')}`, 'info');
    };

    /** Check if player can enter a specific pool */
    const canEnterPool = (pool) => {
        return actionPoints >= pool.entryCost && phase === 'pool_selection';
    };

    /** Enter a pool — pay AP, generate grid with biased weights, switch to drawing */
    const enterPool = (poolUid) => {
        const pool = revealedPools.find(p => p.uid === poolUid);
        if (!pool) return;
        if (!canEnterPool(pool)) {
            showToast(t('行动点不足'), 'warning');
            return;
        }

        setActionPoints(prev => prev - pool.entryCost);

        // Generate grid with biased sticker weights
        const stickerWeightsOverride = pool.poolType._bias
            ? buildBiasedStickerWeights(pool.poolType._bias)
            : undefined;
        const { grid, cellCounts } = generatePoolGrid(pool.poolType, STICKER_TYPES, OUT_OF_GAME_ITEMS, stickerWeightsOverride);

        setCurrentPool({
            uid: pool.uid,
            poolType: pool.poolType,
            cellCounts,
            entryCost: pool.entryCost,
        });
        setMatrix(grid);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setPhase('drawing');
    };

    /** Exit current pool — remove wall from shop, return to pool_selection */
    const exitPool = () => {
        if (!currentPool) return;
        // Remove the wall from the shop
        setRevealedPools(prev => prev.filter(p => p.uid !== currentPool.uid));
        setCurrentPool(null);
        setMatrix(null);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setPhase('pool_selection');
    };

    /** Take a displayed profit card — costs AP, adds to player's slot cards */
    const takeDisplayCard = (cardId) => {
        if (actionPoints < AP_CONFIG.takeCardCost) {
            showToast(t('行动点不足'), 'warning');
            return;
        }
        const profitCount = slotCards.filter(c => c.type === 'profit').length;
        if (profitCount >= MAX_PROFIT_CARDS) {
            showToast(t('兑换券已满'), 'warning');
            return;
        }
        const card = displayedProfitCards.find(c => c.id === cardId);
        if (!card) return;

        setActionPoints(prev => prev - AP_CONFIG.takeCardCost);
        setDisplayedProfitCards(prev => prev.filter(c => c.id !== cardId));
        setSlotCards(prev => [...prev, card]);
        showToast(`💎 ${t('获取兑换券')}`, 'success');
    };

    /** Check if a displayed card can be taken */
    const canTakeCard = (cardId) => {
        const profitCount = slotCards.filter(c => c.type === 'profit').length;
        return actionPoints >= AP_CONFIG.takeCardCost
            && profitCount < MAX_PROFIT_CARDS
            && phase === 'pool_selection';
    };
```

Replace with:
```js
    /**
     * pickWall — called from WallPicker in wall_choice phase. Pays entry AP cost,
     * builds the grid, switches to drawing.
     */
    const pickWall = (index) => {
        if (phase !== 'wall_choice') return;
        const pool = wallCandidates[index];
        if (!pool) return;
        if (actionPoints < pool.entryCost) {
            showToast(t('行动点不足'), 'warning');
            return;
        }

        setActionPoints(prev => prev - pool.entryCost);

        const stickerWeightsOverride = pool.poolType._bias
            ? buildBiasedStickerWeights(pool.poolType._bias)
            : undefined;
        const { grid, cellCounts } = generatePoolGrid(pool.poolType, STICKER_TYPES, OUT_OF_GAME_ITEMS, stickerWeightsOverride);

        setCurrentPool({
            uid: pool.uid,
            poolType: pool.poolType,
            cellCounts,
            entryCost: pool.entryCost,
        });
        setMatrix(grid);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setWallCandidates([]);
        setPhase('drawing');
    };

    /**
     * exitWall — clear currentPool, re-roll wall candidates, return to wall_choice.
     * Turn is NOT ended — remaining AP carries over.
     */
    const exitWall = () => {
        setCurrentPool(null);
        setMatrix(null);
        setDrawCount(0);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setWallCandidates(generateWallChoiceCandidates());
        setPhase('wall_choice');
    };

    /**
     * replaceVoucher — commit a draft candidate into a shelf slot, then finish
     * the turn transition via continueToNextTurn.
     */
    const replaceVoucher = (candidateIdx, targetSlotIdx) => {
        if (phase !== 'voucher_draft') return;
        if (!voucherDraftCandidates) return;
        const candidate = voucherDraftCandidates[candidateIdx];
        if (!candidate) return;
        if (targetSlotIdx < 0 || targetSlotIdx >= voucherShelf.length) return;

        setVoucherShelf(prev => {
            const next = [...prev];
            next[targetSlotIdx] = candidate;
            return next;
        });
        setVoucherDraftCandidates(null);
        continueToNextTurn();
    };

    /**
     * skipVoucherDraft — shelf unchanged, finish the turn transition.
     */
    const skipVoucherDraft = () => {
        if (phase !== 'voucher_draft') return;
        setVoucherDraftCandidates(null);
        continueToNextTurn();
    };
```

### 5.6 Verify `checkDangerCards` still works after the cutover

This function currently reads `slotCards.filter(c => c.type === 'danger')`. After the cutover, `slotCards` only holds dangers (profits moved to `voucherShelf`). The code still works as-is because the filter is a no-op on a pure-danger array, BUT `setSlotCards(prev => prev.filter(c => c.type !== 'danger'))` now correctly clears everything. No change needed to `checkDangerCards` — it's incidentally correct.

- [ ] **Step 6: Verify `checkDangerCards` still works after the cutover**

Read lines 228–264 of `src/hooks/useGameLogic.js`. Confirm the function still compiles — it references `slotCards`, `canSatisfyCard`, `showToast`, `setLives`, `setInventory`, `finishEvacuation`, `setSlotCards`. All of these still exist. No edit needed.

Expected: no edit in this step. Just confirmation.

### 5.6b Add drain detection to `completeDrawAnim`

When a draw empties the grid, the player should land in `wall_choice` automatically instead of staring at an empty matrix. Hook into the existing `setMatrix(prev => nullDrawnCells(prev))` call and schedule `exitWall()` if the post-null matrix is fully null.

- [ ] **Step 6b: Replace the `setMatrix` call in `completeDrawAnim`**

Find the line inside `completeDrawAnim` (around line 579):
```js
        setMatrix(prev => nullDrawnCells(prev));
```

Replace with:
```js
        // Null the drawn cells and check if the wall is now fully drained.
        // If so, schedule a transition to wall_choice on the next tick —
        // doing it here (not in a setTimeout before setMatrix) keeps the
        // order deterministic and avoids flicker.
        let drainedAfterThisDraw = false;
        setMatrix(prev => {
            const next = nullDrawnCells(prev);
            drainedAfterThisDraw = next.every(row => row.every(c => c === null));
            return next;
        });
        if (drainedAfterThisDraw) {
            setTimeout(() => exitWall(), 400);
        }
```

Note: `drainedAfterThisDraw` is a local `let` set synchronously inside the updater callback. React runs the updater immediately during the state write, so the flag is set before the `if` executes. The 400ms delay lets the player see the final draw result before the phase transition.

### 5.7 Rewrite `collectEvacuationRewards` to read from `voucherShelf`

- [ ] **Step 7: Rewrite `collectEvacuationRewards`**

Find lines 266–288 (the function body):

```js
    /**
     * Collect reward items from all satisfied profit cards. Stickers NOT consumed.
     * Backpack capacity does NOT apply at evacuation — every satisfied reward
     * counts toward the final score.
     * @returns {object[]} reward items minted from satisfied profit cards
     */
    const collectEvacuationRewards = () => {
        const rewardItems = [];
        for (const card of slotCards) {
            if (card.type !== 'profit') continue;
            if (!canSatisfyCard(card, inventory)) continue;
            if (!card.reward?.items) continue;
            for (const item of card.reward.items) {
                // Spread to preserve rarity/tags/nameEn (needed by Kitchen scoring).
                rewardItems.push({
                    ...item,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
        }
        return rewardItems;
    };
```

Replace with:
```js
    /**
     * Collect reward items from all satisfied vouchers on the shelf.
     * Stickers are NOT consumed. Backpack capacity does NOT apply at
     * evacuation — every satisfied reward counts toward the final score.
     */
    const collectEvacuationRewards = () => {
        const rewardItems = [];
        for (const voucher of voucherShelf) {
            if (!voucher) continue;
            if (!canSatisfyCard(voucher, inventory)) continue;
            if (!voucher.reward?.items) continue;
            for (const item of voucher.reward.items) {
                // Spread to preserve rarity/tags/nameEn (needed by Kitchen scoring).
                rewardItems.push({
                    ...item,
                    isOutOfGame: true,
                    uid: generateUID(),
                });
            }
        }
        return rewardItems;
    };
```

### 5.8 Rewrite derived `profitCards` / `satisfiedProfitCount` / `canEvacuate`

- [ ] **Step 8: Rewrite the derived card/evacuation block**

Find lines 295–301:
```js
    // Derived: separate card types for easy access
    const profitCards = slotCards.filter(c => c.type === 'profit');
    const dangerCards_slot = slotCards.filter(c => c.type === 'danger');

    // Evacuation: player must currently hold at least N satisfied profit cards.
    const satisfiedProfitCount = profitCards.filter(c => canSatisfyCard(c, inventory)).length;
    const canEvacuate = satisfiedProfitCount >= EVACUATION_PROFIT_REQUIREMENT;
```

Replace with:
```js
    // Derived: danger cards come from slotCards (which is now pure-danger since
    // profits moved to voucherShelf). Evacuation reads from the shelf.
    const dangerCards_slot = slotCards.filter(c => c.type === 'danger');

    const satisfiedProfitCount = voucherShelf.filter(v => v && canSatisfyCard(v, inventory)).length;
    const canEvacuate = satisfiedProfitCount >= EVACUATION_PROFIT_REQUIREMENT;
```

### 5.9 Rewrite `startGame`

- [ ] **Step 9: Rewrite `startGame`**

Find lines 311–344:
```js
    /** Start the game */
    const startGame = () => {
        // Pick bonus items on first expedition
        if (expeditionNumber === 0) {
            const shuffled = [...OUT_OF_GAME_ITEMS].sort(() => Math.random() - 0.5);
            const bonusValues = [1, 2, 3];
            setBonusItems(shuffled.slice(0, 3).map((item, i) => ({ ...item, bonusValue: bonusValues[i] })));
        }
        setExpeditionNumber(prev => prev + 1);
        setActionPoints(AP_CONFIG.maxAP);
        setDrawCount(0);
        setTotalDrawCount(0);
        setTurnNumber(1);

        // Reset lives
        setLives(INITIAL_LIVES);

        // Create initial slot cards: turn 1 danger only (profit cards now come from display)
        const turn1DangerCount = Math.ceil(1 / 2); // Turn 1: 1 danger card
        const turn1DangerCards = [];
        for (let i = 0; i < turn1DangerCount; i++) {
            turn1DangerCards.push(generateSlotCard('danger', { turnCreated: 1 }));
        }
        setSlotCards([...turn1DangerCards]);

        // Generate wall shop + displayed profit cards
        const shopWalls = generateShopWalls();
        setRevealedPools(shopWalls);
        setDisplayedProfitCards(generateDisplayCards());

        setCurrentPool(null);
        setMatrix(null);
        setPhase('pool_selection');
    };
```

Replace with:
```js
    /** Start the game */
    const startGame = () => {
        // Pick bonus items on first expedition
        if (expeditionNumber === 0) {
            const shuffled = [...OUT_OF_GAME_ITEMS].sort(() => Math.random() - 0.5);
            const bonusValues = [1, 2, 3];
            setBonusItems(shuffled.slice(0, 3).map((item, i) => ({ ...item, bonusValue: bonusValues[i] })));
        }
        setExpeditionNumber(prev => prev + 1);
        setActionPoints(AP_CONFIG.maxAP);
        setDrawCount(0);
        setTotalDrawCount(0);
        setTurnNumber(1);
        setLives(INITIAL_LIVES);

        // Turn 1 danger card (rotation scaling starts at 1, same as before).
        const turn1Dangers = [generateSlotCard('danger', { turnCreated: 1 })];
        setSlotCards(turn1Dangers);

        // Pre-roll a full 5-voucher shelf and a fresh 3-candidate wall choice.
        setVoucherShelf(generateFullVoucherShelf(1));
        setVoucherDraftCandidates(null);
        setWallCandidates(generateWallChoiceCandidates());

        setCurrentPool(null);
        setMatrix(null);
        setPhase('wall_choice');
    };
```

### 5.10 Rewrite `endTurn` and `startNextTurn` as `endTurn` + `continueToNextTurn`

- [ ] **Step 10: Rewrite the turn flow**

Find lines 346–394:
```js
    /** End current turn manually (forfeits remaining AP) */
    const endTurn = () => {
        // Snapshot sticker types required by current danger cards so the next turn's
        // danger cards can exclude them (rotation rule — see game_rules.md).
        const prevDangerStickerTypes = Array.from(new Set(
            slotCards
                .filter(c => c.type === 'danger')
                .flatMap(c => Object.keys(getRequirements(c)))
        ));

        // Check danger slot cards before moving to next turn
        checkDangerCards();

        startNextTurn(prevDangerStickerTypes);
    };

    /** Start a new turn — reset AP, generate new danger cards */
    const startNextTurn = (excludeStickerTypes = []) => {
        const nextTurn = turnNumber + 1;
        setTurnNumber(nextTurn);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setDrawCount(0);

        // Auto-generate danger cards — count scales with turn number
        // TODO (tuning): adjust scaling formula after playtesting
        const dangerCardCount = Math.ceil(nextTurn / 2);
        const newDangerCards = [];
        for (let i = 0; i < dangerCardCount; i++) {
            newDangerCards.push(generateSlotCard('danger', {
                turnCreated: nextTurn,
                excludeStickerTypes,
            }));
        }

        // No auto-generate profit cards — they only come from the display
        setSlotCards(prev => [...prev, ...newDangerCards]);

        // Return to pool selection — clear current pool/matrix
        setCurrentPool(null);
        setMatrix(null);

        // Refill + refresh wall shop and profit card display for new turn
        setRevealedPools(generateShopWalls());
        setDisplayedProfitCards(generateDisplayCards());

        setPhase('pool_selection');
    };
```

Replace with:
```js
    /** End current turn manually (forfeits remaining AP) */
    const endTurn = () => {
        // Snapshot sticker types required by current danger cards so the next turn's
        // danger cards can exclude them (rotation rule — see game_rules.md).
        const prevDangerStickerTypes = Array.from(new Set(
            slotCards
                .filter(c => c.type === 'danger')
                .flatMap(c => Object.keys(getRequirements(c)))
        ));

        // Check danger slot cards before opening the voucher draft
        checkDangerCards();

        // Stash rotation context so continueToNextTurn can honor it after the draft
        setPendingTurnContext({ excludeStickerTypes: prevDangerStickerTypes });

        // Every turn end unconditionally opens a voucher draft
        setVoucherDraftCandidates(generateVoucherDraftCandidates(turnNumber + 1));
        setPhase('voucher_draft');
    };

    /**
     * continueToNextTurn — entered from replaceVoucher or skipVoucherDraft after
     * the draft is resolved. Resets AP, spawns new danger cards, routes to
     * drawing (if a wall is held) or wall_choice (if not).
     */
    const continueToNextTurn = () => {
        const excludeStickerTypes = pendingTurnContext?.excludeStickerTypes ?? [];
        setPendingTurnContext(null);

        const nextTurn = turnNumber + 1;
        setTurnNumber(nextTurn);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawResult(null);
        setLastDrawDirection(null);
        setDrawCount(0);

        // Danger card count scales with turn number (unchanged from previous flow).
        const dangerCardCount = Math.ceil(nextTurn / 2);
        const newDangerCards = [];
        for (let i = 0; i < dangerCardCount; i++) {
            newDangerCards.push(generateSlotCard('danger', {
                turnCreated: nextTurn,
                excludeStickerTypes,
            }));
        }
        setSlotCards(prev => [...prev, ...newDangerCards]);

        // If the player still holds a wall, resume drawing. Otherwise roll fresh
        // wall candidates — this covers the "drained wall then ended turn" case.
        if (currentPool) {
            setPhase('drawing');
        } else {
            setWallCandidates(generateWallChoiceCandidates());
            setPhase('wall_choice');
        }
    };
```

### 5.11 Delete `addSlotCard` if it's only used for the debug button (check first)

- [ ] **Step 11: Leave `addSlotCard` in place**

Read lines 207–215 (`addSlotCard`). It's generic — it can still add dangers. Leave it exported as-is. The GameCore debug button that calls `addSlotCard('profit')` will be removed in Task 6; until then, calling it adds a stray profit card to `slotCards` that will be ignored by `checkDangerCards` and `collectEvacuationRewards` (both reference different state now). Harmless during the broken-build interval.

No edit. Move on.

### 5.12 Rewrite `handleReset` and `startNextExpedition`

- [ ] **Step 12: Update `handleReset`**

Find lines 720–744:
```js
    const handleReset = () => {
        setTurnNumber(0);
        setPhase('pre_game');
        setMatrix(null);
        setCurrentPool(null);
        setRevealedPools([]);
        setDisplayedProfitCards([]);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setExpeditionNumber(0);
        setExpeditionScores([]);
        setBonusItems([]);
        setLives(INITIAL_LIVES);
        setSlotCards([]);
    };
```

Replace with:
```js
    const handleReset = () => {
        setTurnNumber(0);
        setPhase('pre_game');
        setMatrix(null);
        setCurrentPool(null);
        setWallCandidates([]);
        setVoucherShelf([]);
        setVoucherDraftCandidates(null);
        setPendingTurnContext(null);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setExpeditionNumber(0);
        setExpeditionScores([]);
        setBonusItems([]);
        setLives(INITIAL_LIVES);
        setSlotCards([]);
    };
```

- [ ] **Step 13: Update `startNextExpedition`**

Find lines 746–769:
```js
    const startNextExpedition = () => {
        setTurnNumber(0);
        setMatrix(null);
        setCurrentPool(null);
        setRevealedPools([]);
        setDisplayedProfitCards([]);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setLives(INITIAL_LIVES);

        setSlotCards([]);

        setPhase('pre_game');
    };
```

Replace with:
```js
    const startNextExpedition = () => {
        setTurnNumber(0);
        setMatrix(null);
        setCurrentPool(null);
        setWallCandidates([]);
        setVoucherShelf([]);
        setVoucherDraftCandidates(null);
        setPendingTurnContext(null);
        setActionPoints(AP_CONFIG.maxAP);
        setLastDrawDirection(null);
        setDrawCount(0);
        setTotalDrawCount(0);
        setInventoryBonus(0);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
        setDrawAnimState(null);
        setPendingItems([]);
        setLives(INITIAL_LIVES);

        setSlotCards([]);

        setPhase('pre_game');
    };
```

### 5.13 Update the return block — remove old exports, add new ones

- [ ] **Step 14: Rewrite the return object**

Find lines 787–873 — the entire `return { ... };` block:

```js
    return {
        // Expedition state
        expeditionNumber,
        expeditionScores,
        expeditionConfig,
        bonusItems,

        // Turn state
        turnNumber,
        phase,

        // AP
        actionPoints,
        maxAP: AP_CONFIG.maxAP,
        apDrawCost: AP_CONFIG.drawCost,

        // Wall Shop
        revealedPools,
        displayedProfitCards,
        canRefreshWalls,
        refreshWalls,
        enterPool,
        exitPool,
        canEnterPool,
        takeDisplayCard,
        canTakeCard,

        // Pool state
        currentPool,
        drawLimitReached,

        // Slot cards (passive matching)
        slotCards,
        profitCards,
        dangerCards: dangerCards_slot,
        canEvacuate,
        satisfiedProfitCount,
        evacuationProfitRequirement: EVACUATION_PROFIT_REQUIREMENT,
        addSlotCard,
        removeSlotCard,
        evacuate,

        // Lives
        lives,

        // Grid
        matrix,
        lastDrawResult,
        lastDrawDirection,
        drawCount,
        totalDrawCount,
        canDraw,

        // Draw animation
        drawAnimState,
        isDrawAnimating,

        // Inventory
        inventory,
        maxInventorySize,
        usedCapacity,
        freeCapacity,
        pendingItem,
        pendingItems,

        // UI
        toast,
        clearToast,
        modalContent,
        flyingItem,
        setFlyingItem,

        // Actions
        startGame,
        selectRow,
        selectColumn,
        endTurn,
        handleReset,
        startNextExpedition,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        discardPendingItem,
        debugAddItem,
    };
};
```

Replace with:
```js
    return {
        // Expedition state
        expeditionNumber,
        expeditionScores,
        expeditionConfig,
        bonusItems,

        // Turn state
        turnNumber,
        phase,

        // AP
        actionPoints,
        maxAP: AP_CONFIG.maxAP,
        apDrawCost: AP_CONFIG.drawCost,

        // Wall Choice
        wallCandidates,
        pickWall,
        exitWall,

        // Voucher Shelf + Draft
        voucherShelf,
        voucherDraftCandidates,
        replaceVoucher,
        skipVoucherDraft,

        // Pool state
        currentPool,
        drawLimitReached,

        // Danger cards + evacuation (passive matching)
        dangerCards: dangerCards_slot,
        canEvacuate,
        satisfiedProfitCount,
        evacuationProfitRequirement: EVACUATION_PROFIT_REQUIREMENT,
        addSlotCard,
        removeSlotCard,
        evacuate,

        // Lives
        lives,

        // Grid
        matrix,
        lastDrawResult,
        lastDrawDirection,
        drawCount,
        totalDrawCount,
        canDraw,

        // Draw animation
        drawAnimState,
        isDrawAnimating,

        // Inventory
        inventory,
        maxInventorySize,
        usedCapacity,
        freeCapacity,
        pendingItem,
        pendingItems,

        // UI
        toast,
        clearToast,
        modalContent,
        flyingItem,
        setFlyingItem,

        // Actions
        startGame,
        selectRow,
        selectColumn,
        endTurn,
        handleReset,
        startNextExpedition,
        tickDrawAnim,
        completeDrawAnim,
        replaceInventoryItem,
        discardInventoryItem,
        discardPendingItem,
        debugAddItem,
    };
};
```

### 5.14 Lint check (GameCore will error — that's expected)

- [ ] **Step 15: Run lint on useGameLogic only**

Run: `npx eslint src/hooks/useGameLogic.js`
Expected: PASS (no errors in the hook itself). `GameCore.jsx` will have errors — those are addressed in Task 6.

- [ ] **Step 16: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "$(cat <<'EOF'
refactor(hook): sequential wall + voucher shelf state model

Rewrites useGameLogic to support the new flow:
- voucherShelf (5 always-full), wallCandidates (3), voucherDraftCandidates
- pickWall / exitWall / replaceVoucher / skipVoucherDraft actions
- endTurn now opens voucher_draft; continueToNextTurn resumes via
  drawing or wall_choice based on currentPool
- evacuation rewards read from voucherShelf
- phase enum: pre_game | wall_choice | drawing | voucher_draft | game_over

Drops revealedPools / displayedProfitCards / refreshWalls /
takeDisplayCard / enterPool / exitPool. GameCore.jsx is temporarily
broken against this change — the next commit fixes it.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Rewrite `GameCore.jsx` to match the new hook API

**Files:**
- Modify: `src/GameCore.jsx`

After this task, `npm run dev` must work end-to-end. This is the largest single edit in the plan — follow the sub-steps in order.

**Note on WallPicker unlock gating:** the plan passes `drawCount={Infinity}` and `gold={Infinity}` to `WallPicker` so its internal `canUnlock` check short-circuits to true for every candidate. Unlock badges still render (informational), but no wall is actually gated — matching the spec's "unlock conditions become informational in sequential mode" decision.

### 6.1 Update imports

- [ ] **Step 1: Add imports for the new components**

Find the import block at the top (lines 1–15). Add these two imports below the existing `import Kitchen from './components/game/Kitchen';` line (line 15):

```js
import WallPicker from './components/game/WallPicker';
import VoucherShelf from './components/game/VoucherShelf';
import VoucherDraftPicker from './components/game/VoucherDraftPicker';
```

### 6.2 Delete the `PoolCardUI` component

- [ ] **Step 2: Delete the inline `PoolCardUI` component**

Find lines 18–79 (the `/** Wall card for the shop — compact layout for 5-in-a-row */` block through the closing `};` of `PoolCardUI`). Delete the entire block, including the trailing blank line.

The file should now go directly from the imports to `const GameCore = () => {`.

### 6.3 Add `armedCandidateIdx` local state

- [ ] **Step 3: Add local armed-candidate state**

Find the block of `useState` calls near the top of `GameCore` (lines 84–89 in the original, now renumbered after Step 2):

```jsx
    const [recycleMode, setRecycleMode] = useState(false);
    const [recycleSelected, setRecycleSelected] = useState(new Set());
    const [debugOpen, setDebugOpen] = useState(false);
    const [debugSelectedItem, setDebugSelectedItem] = useState(null);
    const [kitchenOpen, setKitchenOpen] = useState(false);
    const [kitchenDishIdx, setKitchenDishIdx] = useState(0);
```

Add after these lines:
```jsx
    const [armedCandidateIdx, setArmedCandidateIdx] = useState(null);
```

### 6.4 Update the hook destructure

- [ ] **Step 4: Rewrite the destructure block**

Find the destructure (was lines 98–122):

```jsx
    const {
        expeditionNumber, expeditionScores, expeditionConfig, bonusItems,
        turnNumber, phase,
        actionPoints, maxAP, apDrawCost,
        // Wall shop
        revealedPools, displayedProfitCards, canRefreshWalls, refreshWalls,
        enterPool, exitPool, canEnterPool, takeDisplayCard, canTakeCard,
        // Pool state
        currentPool, drawLimitReached,
        lives,
        matrix, lastDrawResult, lastDrawDirection,
        drawCount, totalDrawCount, canDraw,
        drawAnimState, isDrawAnimating,
        inventory, maxInventorySize, usedCapacity, freeCapacity, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        startGame, selectRow, selectColumn, endTurn,
        handleReset, startNextExpedition,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        // Slot cards (passive matching)
        slotCards, profitCards, dangerCards, canEvacuate,
        satisfiedProfitCount, evacuationProfitRequirement,
        addSlotCard, removeSlotCard, evacuate,
    } = state;
```

Replace with:
```jsx
    const {
        expeditionNumber, expeditionScores, expeditionConfig, bonusItems,
        turnNumber, phase,
        actionPoints, maxAP, apDrawCost,
        // Wall choice
        wallCandidates, pickWall, exitWall,
        // Voucher shelf + draft
        voucherShelf, voucherDraftCandidates, replaceVoucher, skipVoucherDraft,
        // Pool state
        currentPool, drawLimitReached,
        lives,
        matrix, lastDrawResult, lastDrawDirection,
        drawCount, totalDrawCount, canDraw,
        drawAnimState, isDrawAnimating,
        inventory, maxInventorySize, usedCapacity, freeCapacity, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        startGame, selectRow, selectColumn, endTurn,
        handleReset, startNextExpedition,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        // Danger cards + evacuation (passive matching)
        dangerCards, canEvacuate,
        satisfiedProfitCount, evacuationProfitRequirement,
        addSlotCard, removeSlotCard, evacuate,
    } = state;
```

### 6.5 Add shelf-slot click handler

- [ ] **Step 5: Add the click handler right after the destructure**

Immediately after the closing `} = state;` line, add:

```jsx
    // Shelf-slot click handler used during voucher_draft: commits the armed candidate
    // into the targeted shelf slot, then resets the armed state.
    const handleShelfSlotClick = (slotIdx) => {
        if (phase !== 'voucher_draft') return;
        if (armedCandidateIdx === null) return;
        replaceVoucher(armedCandidateIdx, slotIdx);
        setArmedCandidateIdx(null);
    };

    // Wrap skip so the local armed state is also cleared.
    const handleSkipDraft = () => {
        skipVoucherDraft();
        setArmedCandidateIdx(null);
    };
```

### 6.6 Rename the end-turn phase guard

- [ ] **Step 6: Update the end-turn button guard**

Find the line (was line 235):
```jsx
                        {(phase === 'pool_selection' || phase === 'drawing') && (
```

Replace with:
```jsx
                        {(phase === 'wall_choice' || phase === 'drawing') && (
```

Rationale: the end-turn button should show during `wall_choice` (player can end turn without picking a wall — covered by the drained-wall corner case) and `drawing` (normal case), but NOT during `voucher_draft` (player is mid-draft, can't end a turn that's already ending).

### 6.7 Delete the shop panel block

- [ ] **Step 7: Delete the entire `pool_selection` JSX branch**

Find the block starting with `{phase === 'pool_selection' && (` (was around line 275) and ending at the matching closing `)}` before `{/* ===== Drawing Phase ===== */}`.

This block is approximately 120 lines. Delete it entirely. After deletion, the `{/* ===== Drawing Phase ===== */}` comment and its `{phase === 'drawing' && matrix && (` line should come directly after the `inPlay`-guarded opening.

Visual landmark: look for the outer `{phase === 'pool_selection' && (` and the comment `{/* ===== Drawing Phase ===== */}` — delete everything between the opener and the comment.

### 6.8 Add the `wall_choice` and `voucher_draft` phase branches

- [ ] **Step 8: Add the new phase branches before the `drawing` branch**

Immediately before the `{/* ===== Drawing Phase ===== */}` comment, insert:

```jsx
                {/* ===== Wall Choice Phase ===== */}
                {phase === 'wall_choice' && (
                    <div className="flex gap-3">
                        <VoucherShelf
                            shelf={voucherShelf}
                            inventory={inventory}
                            evacuationProfitRequirement={evacuationProfitRequirement}
                            highlightForDraft={false}
                            t={t}
                        />
                        <div className="flex-1 min-w-0">
                            <WallPicker
                                candidates={wallCandidates}
                                onSelect={pickWall}
                                drawCount={Infinity}
                                gold={Infinity}
                            />
                        </div>
                        <div className="w-72 flex-shrink-0 self-start">
                            {renderInventory()}
                        </div>
                    </div>
                )}

                {/* ===== Voucher Draft Phase ===== */}
                {phase === 'voucher_draft' && (
                    <div className="flex gap-3">
                        <VoucherShelf
                            shelf={voucherShelf}
                            inventory={inventory}
                            evacuationProfitRequirement={evacuationProfitRequirement}
                            highlightForDraft={armedCandidateIdx !== null}
                            onSlotClick={handleShelfSlotClick}
                            t={t}
                        />
                        <div className="flex-1 min-w-0">
                            <VoucherDraftPicker
                                candidates={voucherDraftCandidates || []}
                                inventory={inventory}
                                armedCandidateIdx={armedCandidateIdx}
                                onArm={setArmedCandidateIdx}
                                onSkip={handleSkipDraft}
                                t={t}
                            />
                        </div>
                        <div className="w-72 flex-shrink-0 self-start">
                            {renderInventory()}
                        </div>
                    </div>
                )}
```

### 6.9 Update the `drawing` phase branch to mount `VoucherShelf` in a left rail

- [ ] **Step 9: Add the left rail to the drawing phase**

Find the drawing-phase wrapper (was around line 397):
```jsx
                {/* ===== Drawing Phase ===== */}
                {phase === 'drawing' && matrix && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                            {/* Main: grid area */}
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
```

Replace with:
```jsx
                {/* ===== Drawing Phase ===== */}
                {phase === 'drawing' && matrix && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                            <VoucherShelf
                                shelf={voucherShelf}
                                inventory={inventory}
                                evacuationProfitRequirement={evacuationProfitRequirement}
                                highlightForDraft={false}
                                t={t}
                            />
                            {/* Main: grid area */}
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
```

### 6.10 Update the "exit wall" button

- [ ] **Step 10: Update the exit button handler**

Find the `exitPool` button (was around line 425):
```jsx
                                        <button
                                            onClick={exitPool}
                                            disabled={isDrawAnimating}
                                            className="px-3 py-1 rounded-lg text-[11px] font-bold border-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        >
                                            {t('退出奖品墙')}
                                        </button>
```

Replace with:
```jsx
                                        <button
                                            onClick={exitWall}
                                            disabled={isDrawAnimating}
                                            className="px-3 py-1 rounded-lg text-[11px] font-bold border-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        >
                                            {t('退出奖品墙')}
                                        </button>
```

(Only `exitPool` → `exitWall`.)

### 6.11 Update the `CardDock` mount

- [ ] **Step 11: Remove `profitCards` and `removeSlotCard` props from `CardDock`**

Find the `CardDock` element (was around line 618):
```jsx
            <CardDock
                dangerCards={dangerCards}
                profitCards={profitCards}
                inventory={inventory}
                canEvacuate={canEvacuate}
                satisfiedProfitCount={satisfiedProfitCount}
                evacuationProfitRequirement={evacuationProfitRequirement}
                evacuate={evacuate}
                removeSlotCard={removeSlotCard}
                phase={phase}
                t={t}
            />
```

Replace with:
```jsx
            <CardDock
                dangerCards={dangerCards}
                inventory={inventory}
                canEvacuate={canEvacuate}
                satisfiedProfitCount={satisfiedProfitCount}
                evacuationProfitRequirement={evacuationProfitRequirement}
                evacuate={evacuate}
                phase={phase}
                t={t}
            />
```

### 6.12 Update `renderInventory`'s `neededStickerIds` computation

- [ ] **Step 12: Update neededStickerIds to read from voucherShelf + dangerCards**

Find the `neededStickerIds` block in `renderInventory` (was around lines 649–657):
```jsx
        // Sticker types referenced by any held profit/danger card — marks inventory
        // stickers as "load-bearing" so players don't recycle them blindly.
        const neededStickerIds = new Set();
        for (const card of slotCards) {
            const reqs = getRequirements(card);
            for (const key of Object.keys(reqs)) {
                if (key !== 'any') neededStickerIds.add(key);
            }
        }
```

Replace with:
```jsx
        // Sticker types referenced by any voucher on the shelf or any active danger
        // card — marks inventory stickers as "load-bearing" so players don't recycle
        // them blindly.
        const neededStickerIds = new Set();
        const needSources = [...voucherShelf.filter(Boolean), ...dangerCards];
        for (const card of needSources) {
            const reqs = getRequirements(card);
            for (const key of Object.keys(reqs)) {
                if (key !== 'any') neededStickerIds.add(key);
            }
        }
```

### 6.13 Remove the `addSlotCard('profit')` debug button

- [ ] **Step 13: Delete the profit voucher debug button**

Find the block (was around lines 598–605):
```jsx
                                    <div className="flex gap-2">
                                        <button onClick={() => addSlotCard('profit')}
                                            className="flex-1 py-1.5 rounded-lg bg-blue-800 text-blue-200 text-xs font-bold hover:bg-blue-700 transition-colors">
                                            + {t('物品兑换券')}
                                        </button>
                                    </div>
```

Delete the entire `<div className="flex gap-2">` block including its button. (If the debug panel has other buttons nearby, leave those — only remove the one that spawns profit vouchers.)

### 6.14 Lint check

- [ ] **Step 14: Run lint**

Run: `npm run lint`
Expected: PASS. If there are errors:
- `profitCards` referenced somewhere: search with `grep -n profitCards src/GameCore.jsx` and remove the remaining references.
- `slotCards` referenced somewhere in `renderInventory` or elsewhere in GameCore: replace with `voucherShelf` + `dangerCards` pattern or delete.
- `pool_selection` still present: search with `grep -n pool_selection src/GameCore.jsx` and rename to `wall_choice`.
- `enterPool`, `exitPool`, `refreshWalls`, `takeDisplayCard`, `canEnterPool`, `canTakeCard`, `canRefreshWalls`, `revealedPools`, `displayedProfitCards`: any lingering reference means a missed deletion — find and remove.

### 6.15 Smoke test in the browser

- [ ] **Step 15: Start the dev server**

Run: `npm run dev`
Expected: server comes up at `http://localhost:5173/3pools_Web/` without errors.

- [ ] **Step 16: Load the page and start a game**

Open the page in a browser. Click `开始第 1 场`.
Expected:
1. Page loads without console errors.
2. Game opens in `wall_choice` phase: left rail shows 5 voucher cards, center shows `WallPicker` with 3 candidates, right shows empty inventory, bottom `CardDock` shows the turn-1 danger card + evacuation card.
3. Clicking a wall candidate enters `drawing` phase: center becomes the grid, left rail still shows the 5 vouchers, `退出奖品墙` button is visible.

- [ ] **Step 17: Stop the dev server (Ctrl+C) and commit**

```bash
git add src/GameCore.jsx
git commit -m "$(cat <<'EOF'
feat(core): sequential wall_choice + voucher_draft flow

Rewrites GameCore.jsx to match the new hook API:
- Delete the shop panel and PoolCardUI
- Add wall_choice and voucher_draft phase branches
- Mount VoucherShelf in a left rail across gameplay phases
- Own armed-candidate local state and route shelf-slot clicks to
  replaceVoucher
- Update CardDock mount (no more profitCards)
- Drop the "add profit voucher" debug button

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Clean up dead `AP_CONFIG` keys

**Files:**
- Modify: `src/data/v3Config.js`

After Task 6, `refreshCost`, `takeCardCost`, `wallShopSize`, and `displayCardCount` are unreferenced. Remove them.

- [ ] **Step 1: Confirm no references remain**

Run: `grep -n "AP_CONFIG\.refreshCost\|AP_CONFIG\.takeCardCost\|AP_CONFIG\.wallShopSize\|AP_CONFIG\.displayCardCount" src/`
Expected: empty output. If anything is found, fix that reference first (likely a missed deletion in Task 5 or 6).

- [ ] **Step 2: Remove the dead keys**

Find lines 110–121 in `src/data/v3Config.js`:
```js
// --- Action Point (AP) 系统 ---
export const AP_CONFIG = {
    maxAP: 10,          // AP per turn
    drawCost: 0,        // AP cost per draw (free)
    flipCost: 3,        // AP cost to reveal a new pool (legacy — kept for backward compat)
    refreshCost: 2,     // AP cost to refresh the wall shop (replaces all walls + vouchers)
    takeCardCost: 2,    // AP cost to take a profit card from the display
    wallShopSize: 3,    // number of walls always visible in the shop
    displayCardCount: 3, // number of profit cards displayed in the shop
    maxRevealedPools: 5, // max visible pools at once (wall area) — kept for backward compat
    maxRevealedOrders: 3, // max visible orders at once (order area)
};
```

Replace with:
```js
// --- Action Point (AP) 系统 ---
export const AP_CONFIG = {
    maxAP: 10,          // AP per turn
    drawCost: 0,        // AP cost per draw (free)
};
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test again**

Run: `npm run dev` and click into the game. Confirm no runtime errors about missing AP_CONFIG keys.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/data/v3Config.js
git commit -m "$(cat <<'EOF'
chore(config): drop dead AP_CONFIG shop keys

refreshCost, takeCardCost, wallShopSize, displayCardCount,
maxRevealedPools, maxRevealedOrders, flipCost — none referenced after
the sequential-flow rewrite.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Retire dead i18n strings

**Files:**
- Modify: `src/utils/translations.js`

The shop panel is gone — its translation keys are now unreferenced. Remove them.

- [ ] **Step 1: Confirm each key is truly unreferenced**

For each key below, run a grep and confirm zero hits in `src/` (outside `translations.js` itself):

```
grep -rn --include='*.jsx' --include='*.js' --exclude=translations.js "奖品墙商店\|兑换券商店\|暂无兑换券\|兑换券已满\|获取兑换券\|奖品墙已刷新" src/
```

Expected: empty output. (The key `"兑换券"` may still be referenced elsewhere — skip retiring that one unless grep shows it's unused.)

- [ ] **Step 2: Delete the retired keys from `translations.js`**

Using the Edit tool, find each of these lines and delete them (both the Chinese key and its English value line):

```
"奖品墙商店": "Wall Shop",
"兑换券商店": "Voucher Shop",
"暂无兑换券": "No vouchers",
"兑换券已满": "Vouchers full",
"获取兑换券": "Acquire Voucher",
"奖品墙已刷新": "Prize wall refreshed",
```

Leave `"商店"`, `"兑换券"`, `"物品兑换券"`, `"物品兑换券兑换"` in place — they're either still used or too ambiguous to retire without a broader sweep.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/utils/translations.js
git commit -m "$(cat <<'EOF'
i18n: drop retired shop panel strings

Removes translation keys that only the deleted shop UI used.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: End-to-end manual verification

**Files:** none (verification only)

Walk through the entire verification plan from the spec. Fix any issues found inline before committing fixes.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open: `http://localhost:5173/3pools_Web/`

- [ ] **Step 2: Verification scenario 1 — Fresh game entry**

1. Click `开始第 1 场`.
2. Confirm: `wall_choice` phase shows 3 wall candidates in the center, 5 pre-rolled vouchers in the left rail, empty inventory on the right, `CardDock` at the bottom with 1 danger card + evacuation button.
3. No console errors.

- [ ] **Step 3: Verification scenario 2 — Pick a wall and draw**

1. Click a wall candidate.
2. Confirm: transitions to `drawing` phase. Center shows the `ResourceMatrix` grid. Left rail still shows the 5 vouchers. Inventory still empty. `退出奖品墙` button visible.
3. Click several rows/columns to draw stickers. Confirm stickers land in the inventory.

- [ ] **Step 4: Verification scenario 3 — End turn, see the voucher draft**

1. Click end turn (or whatever the existing end-turn control is — look for `结束回合` or similar).
2. Confirm: transitions to `voucher_draft` phase. Center shows `VoucherDraftPicker` with 2 candidate cards and a `放弃` button. Left rail still shows the 5 vouchers (no highlight yet). Hint text reads `选择一张替换货架上的兑换券`.

- [ ] **Step 5: Verification scenario 4 — Arm, target, commit**

1. Click candidate A. Confirm: candidate A gets a ring highlight. Shelf slots enter targeting mode (amber ring on hover). Hint text swaps to `点击要替换的货架栏位`.
2. Click shelf slot 2. Confirm: slot 2's voucher is replaced with candidate A. Transitions to `drawing` phase with fresh AP.

- [ ] **Step 6: Verification scenario 5 — Skip draft**

1. End another turn.
2. Confirm: `voucher_draft` opens again.
3. Click `放弃`. Confirm: shelf unchanged, returns to `drawing` with fresh AP.

- [ ] **Step 7: Verification scenario 6 — Un-arm and switch**

1. End another turn.
2. Click candidate A → armed. Click candidate A again → un-armed (no ring). Click candidate A → armed again. Click candidate B → candidate B armed (candidate A no longer armed).
3. Click `放弃` to exit without committing.

- [ ] **Step 8: Verification scenario 7 — Shelf satisfaction + evacuation**

1. Use the debug panel to add stickers matching several vouchers on the shelf. (Open the 🛠 debug panel if present.)
2. Confirm: satisfied vouchers on the shelf flip to green border. When 3 are satisfied, the shelf header shows the emerald ring and the evacuation button becomes active.
3. Click evacuate. Confirm: `game_over` screen shows the expedition's rewards, including items from the satisfied vouchers.
4. Click `开始第 2 场`. Confirm: next expedition starts with 5 fresh vouchers.

- [ ] **Step 9: Verification scenario 8 — Wall drain**

1. In a new wall, draw cells until the grid is fully null. (Use the debug panel to add AP if needed.)
2. Confirm: transitions automatically to `wall_choice` with 3 new candidates. No `voucher_draft` fired in between (no turn boundary crossed). Left rail and current shelf state preserved.

- [ ] **Step 10: Verification scenario 9 — Drained wall + end turn edge case**

1. Drain a wall mid-turn so you're in `wall_choice`.
2. Without picking a new wall, end the turn.
3. Confirm: `voucher_draft` opens. Resolve it (pick or skip).
4. Confirm: after resolution, returns to `wall_choice` (not `drawing`) with a fresh set of 3 candidates and new-turn AP.

- [ ] **Step 11: Verification scenario 10 — Reset mid-game**

1. Click the `重置` button.
2. Confirm: returns to `pre_game` cleanly. Click `开始第 1 场`. Confirm: fresh game with 5 fresh vouchers and 3 fresh walls.

- [ ] **Step 12: Verification scenario 11 — i18n toggle**

1. At any gameplay phase, click the `EN`/`中` toggle.
2. Confirm: all new strings render in English (`Voucher Shelf`, `New Voucher`, `Choose one to replace a shelf voucher`, `Click the shelf slot to replace`, `Skip`).
3. Toggle back to Chinese. Confirm: Chinese strings render.

- [ ] **Step 13: Stop the dev server**

Press Ctrl+C.

- [ ] **Step 14: Sanity commit (optional)**

If any issues were found and fixed during verification, commit those fixes now with a `fix(...)` commit per issue. If no issues were found, no commit needed for this task — the work is done.

- [ ] **Step 15: Final verification on `npm run build`**

Run: `npm run build`
Expected: production build succeeds with no errors.

---

## Post-plan checklist

After all 9 tasks complete:

- All verification scenarios pass manually.
- `npm run lint` clean.
- `npm run build` succeeds.
- No references remain in `src/` to: `revealedPools`, `displayedProfitCards`, `refreshWalls`, `takeDisplayCard`, `enterPool`, `exitPool`, `canEnterPool`, `canTakeCard`, `canRefreshWalls`, `pool_selection`, `PoolCardUI`, `generateShopWalls`, `generateDisplayCards`, `MAX_PROFIT_CARDS`.
- Spec corner cases (wall-drained-then-end-turn, shelf-satisfied-ready-to-evacuate) all behave as the spec walkthrough describes.

The `CardDock.jsx`, `useGameLogic.js`, and `GameCore.jsx` files should be noticeably shorter than before the plan.
