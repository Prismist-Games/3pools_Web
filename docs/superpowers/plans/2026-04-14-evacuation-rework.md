# Evacuation Rework + Backpack Shrink + Legacy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive sticker-count evacuation gate with a profit-card gate (3 satisfied profit cards), shrink backpack 15→10, and fully remove the danger-wall / risk-heat / growth-order / gold residue.

**Architecture:** Single source of truth (`useGameLogic`) pattern is preserved. All game logic edits concentrated in `src/hooks/useGameLogic.js`; config in `src/data/{constants,v3Config,slotCards}.js`; UI surface in `src/GameCore.jsx`; i18n in `src/utils/translations.js`. No new files. Cleanup is done after the feature change so the new behavior is verifiable before we remove the machinery that might hide regressions.

**Tech Stack:** React 18 + Vite 6 + Tailwind 3 + JavaScript ESM. No test suite — each task verifies via `npm run lint` and `npm run build`, plus manual smoke checks where behavior changes.

**Project conventions reminder:**
- `crypto.randomUUID()` is banned (see `.claude/lessons/architecture.md`). All UIDs go through the existing `generateUID()` helper.
- All UI strings wrap in `t()`. Add zh→en pairs in `src/utils/translations.js` (Chinese is the source language).
- UI changes must read correctly in both zh and en (see `.claude/lessons/ui-conventions.md`).

**Verification commands (used throughout):**
```bash
cd /Users/ziggy/GitHub/3pools_Web
npm run lint
npm run build
```

---

## Task 1: Add `EVACUATION_PROFIT_REQUIREMENT` constant to slotCards.js

**Files:**
- Modify: `src/data/slotCards.js:14-22`

- [ ] **Step 1: Add the new constant next to the old one**

In `src/data/slotCards.js`, locate the `CONFIGURATION` section (around line 14). Add the new constant **below** `EVACUATION_STICKER_THRESHOLD` (we will delete the old one in Task 12 after downstream code stops referencing it):

```javascript
// =============================================
// CONFIGURATION
// =============================================

/** Sticker threshold for evacuation (passive check: inventory sticker count >= this) */
export const EVACUATION_STICKER_THRESHOLD = 8;

/** Number of satisfied profit cards required to evacuate. */
export const EVACUATION_PROFIT_REQUIREMENT = 3;
```

- [ ] **Step 2: Verify lint still passes**

Run:
```bash
npm run lint
```
Expected: no new warnings relative to baseline.

- [ ] **Step 3: No commit yet** — batch with Task 2 (related change).

---

## Task 2: Switch `useGameLogic` evacuation gate to profit-card-based rule

**Files:**
- Modify: `src/hooks/useGameLogic.js:8` (import)
- Modify: `src/hooks/useGameLogic.js:526-536` (derived evacuation state)
- Modify: `src/hooks/useGameLogic.js:~1280-1300` (returned hook object)

- [ ] **Step 1: Update import**

Find the current import (line 8):
```javascript
import { generateSlotCard, canSatisfyCard, EVACUATION_STICKER_THRESHOLD } from '../data/slotCards';
```
Replace with:
```javascript
import { generateSlotCard, canSatisfyCard, EVACUATION_PROFIT_REQUIREMENT } from '../data/slotCards';
```

- [ ] **Step 2: Replace the derived evacuation calculation**

Locate this block (around line 530-532):
```javascript
    // Evacuation: passive check — enough stickers in inventory?
    const inventoryStickerCount = inventory.filter(i => i?.isSticker).length;
    const canEvacuate = inventoryStickerCount >= EVACUATION_STICKER_THRESHOLD;
```

Replace with:
```javascript
    // Evacuation: player must currently hold at least N satisfied profit cards.
    const satisfiedProfitCount = profitCards.filter(c => canSatisfyCard(c, inventory)).length;
    const canEvacuate = satisfiedProfitCount >= EVACUATION_PROFIT_REQUIREMENT;
```

Note: `profitCards` is already derived earlier in the file (around line 527: `const profitCards = slotCards.filter(c => c.type === 'profit');`). Confirm it sits above the new block; if not, move the new block below the `profitCards` definition.

- [ ] **Step 3: Update hook return object**

Locate the return object (around line 1280-1300). Find:
```javascript
        inventoryStickerCount,
        evacuationStickerThreshold: EVACUATION_STICKER_THRESHOLD,
```
Replace with:
```javascript
        satisfiedProfitCount,
        evacuationProfitRequirement: EVACUATION_PROFIT_REQUIREMENT,
```

- [ ] **Step 4: Verify lint**

Run:
```bash
npm run lint
```
Expected: the file still compiles. `npm run build` at this stage will fail in `GameCore.jsx` because the UI still destructures `inventoryStickerCount` / `evacuationStickerThreshold` — that is fixed in Task 3.

- [ ] **Step 5: No commit** — batch with Task 3 (UI follows the hook).

---

## Task 3: Rewrite Evacuation Bar UI in GameCore.jsx

**Files:**
- Modify: `src/GameCore.jsx:118-119` (destructure)
- Modify: `src/GameCore.jsx:767-809` (`renderEvacuationBar` function body)

- [ ] **Step 1: Update destructure**

In the `state` destructure block (around line 118-119), find:
```javascript
        slotCards, profitCards, dangerCards, canEvacuate,
```
and
```javascript
        inventoryStickerCount, evacuationStickerThreshold,
```

Replace the second line with:
```javascript
        satisfiedProfitCount, evacuationProfitRequirement,
```

- [ ] **Step 2: Rewrite `renderEvacuationBar`**

Locate `function renderEvacuationBar()` (around line 767). Replace the **entire function body** with:

```javascript
    function renderEvacuationBar() {
        const satisfied = canEvacuate;
        const required = evacuationProfitRequirement;
        const current = satisfiedProfitCount;
        const percent = Math.min(100, (current / required) * 100);
        return (
            <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                    satisfied
                        ? 'border-amber-500 bg-gradient-to-r from-amber-100 to-yellow-100 shadow-md'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                }`}
            >
                <span className="text-lg leading-none">🚪</span>
                <span className="text-[10px] font-black text-amber-800 whitespace-nowrap">{t('撤离')}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    satisfied ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                    {current}/{required} {satisfied ? '✓' : ''}
                </span>

                {/* Progress bar */}
                <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all rounded-full ${satisfied ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap">
                    {t('满足')} {required} {t('张兑换券')}
                </span>

                {/* Evacuate button */}
                {satisfied && (
                    <button
                        onClick={evacuate}
                        className="ml-1 px-3 py-1 rounded-lg text-xs font-black bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-md whitespace-nowrap"
                    >
                        🚪 {t('撤离')}
                    </button>
                )}
            </div>
        );
    }
```

- [ ] **Step 3: Add missing translations**

Open `src/utils/translations.js`. Find the alphabetical-ish "满足" / "撤离" cluster (search for `"撤离": "Evacuate"` around line 363). Add these entries anywhere sensible in `EN_TRANSLATIONS`:

```javascript
    "满足": "Satisfy",
    "张兑换券": "vouchers",
```

(`满足` may already exist as a fragment; if the key `"满足"` already exists, leave it — `t()` only uses exact-match keys.)

Verify no duplicate keys:
```bash
grep -c '"满足":' src/utils/translations.js
grep -c '"张兑换券":' src/utils/translations.js
```
Expected: each prints `1`.

- [ ] **Step 4: Verify build**

Run:
```bash
npm run lint
npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 5: Smoke test the new evacuation gate**

Start dev server in the background and verify manually:
```bash
npm run dev
```
Open `http://localhost:5173/3pools_Web/`. Start a new game. Confirm:
1. Evacuation bar shows `0/3` initially.
2. Taking profit cards from display and filling the backpack with matching stickers increases the count.
3. Button appears at `3/3` and clicking it ends the expedition.

Stop the dev server when done.

- [ ] **Step 6: Commit Tasks 1-3 as one feature unit**

```bash
git add src/data/slotCards.js src/hooks/useGameLogic.js src/GameCore.jsx src/utils/translations.js
git commit -m "$(cat <<'EOF'
feat(evacuation): gate on 3 satisfied profit cards

Replace passive sticker-count evacuation check with a profit-card
based gate: player must currently hold ≥3 satisfied profit cards
to evacuate. Rewrites the evacuation bar UI to reflect the new
N/3 progress.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Shrink backpack 15 → 10

**Files:**
- Modify: `src/data/constants.js:589`
- Modify: `src/data/v3Config.js:190` (`V3_INITIAL_STATE.backpackCapacity`)

- [ ] **Step 1: Update `INITIAL_GAME_CONFIG.inventorySize`**

In `src/data/constants.js` around line 589, find:
```javascript
    inventorySize: 15,
```
Replace with:
```javascript
    inventorySize: 10,
```

Do **not** touch the four other `"inventorySize": 10` / `20` entries earlier in the file — those belong to mode presets that are unrelated.

- [ ] **Step 2: Update `V3_INITIAL_STATE.backpackCapacity`**

In `src/data/v3Config.js` around line 190, find:
```javascript
export const V3_INITIAL_STATE = {
    hp: 5,
    refreshCount: 1,
    backpackCapacity: 15,
    doomGridSize: 10,
    initialDanger: 1,
};
```
Replace with:
```javascript
export const V3_INITIAL_STATE = {
    hp: 5,
    refreshCount: 1,
    backpackCapacity: 10,
    doomGridSize: 10,
    initialDanger: 1,
};
```

(We'll trim `doomGridSize` / `initialDanger` / `hp` in Task 10 after confirming they have no live readers.)

- [ ] **Step 3: Verify and smoke-test**

Run:
```bash
npm run lint
npm run build
```
Expected: clean.

Start dev server, start a new game, verify the inventory grid renders exactly 10 slots:
```bash
npm run dev
```
Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/data/constants.js src/data/v3Config.js
git commit -m "$(cat <<'EOF'
feat(backpack): shrink inventory 15→10

Tightens the backpack constraint to push stronger competition between
sticker types and profit-card requirements.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Remove danger-wall system from `useGameLogic`

The danger-wall chain spans three call sites: state declaration, generation + enter/exit handlers, draw-handling branch inside `completeDrawAnim`, `startNextTurn` probability roll, and `removeEncounter`. We rip all of it out in this task.

**Files:**
- Modify: `src/hooks/useGameLogic.js` — multiple regions

- [ ] **Step 1: Delete the `dangerWalls` state declaration**

Find (around line 59-62):
```javascript
    // --- Heat / Danger Wall System (replaces danger cards) ---
    const [turnHeat, setTurnHeat] = useState(0);                 // accumulates per turn, resets each turn
    const [cumulativeExposure, setCumulativeExposure] = useState(0); // accumulates per expedition, resets on evacuation
    const [dangerWalls, setDangerWalls] = useState([]);           // array of danger wall encounters
```
Delete the entire block.

(`turnHeat` and `cumulativeExposure` are removed here too — they only exist to feed the danger wall generator.)

- [ ] **Step 2: Delete the DANGER WALL SYSTEM section**

Locate the banner comment and all three helpers that follow (around line 538-617):

```javascript
    // =============================================
    // DANGER WALL SYSTEM
    // =============================================

    const generateDangerGrid = (exposure) => { ... };
    const enterDangerWall = (dangerWallId) => { ... };
    const exitDangerWallView = () => { ... };
```

Delete the entire section from the banner through `exitDangerWallView` inclusive.

- [ ] **Step 3: Remove danger-wall branch from `completeDrawAnim`**

In `completeDrawAnim` (around line 839), locate:
```javascript
        // --- Danger wall draw handling ---
        if (currentPool?.isDangerWall) {
            ...
            return;
        }
```
Delete the entire `if (currentPool?.isDangerWall)` block (roughly lines 847-909).

- [ ] **Step 4: Remove heat accumulation block**

Still inside `completeDrawAnim`, locate (around line 923-932):
```javascript
        // --- Heat accumulation on draw ---
        // Add risk-based heat to turnHeat
        setWallDepth(prev => {
            const newDepth = prev + 1;
            const poolType = currentPool?.poolType;
            const coeff = getRiskCoeff(poolType);
            const increment = getRiskTier(newDepth) * coeff;
            setTurnHeat(prevHeat => prevHeat + increment);
            return newDepth;
        });
```
Delete the entire block.

- [ ] **Step 5: Simplify `startNextTurn`**

Locate `startNextTurn` (around line 675-728). Find the turn-end danger check block:
```javascript
    const startNextTurn = () => {
        // --- Turn-end danger check using turnHeat ---
        // P(danger) = turnHeat / (turnHeat + RISK_K)
        const currentHeat = turnHeat;
        const dangerProb = currentHeat / (currentHeat + RISK_CONFIG.RISK_K);

        // Update cumulative exposure before resetting heat
        setCumulativeExposure(prev => prev + currentHeat);

        if (Math.random() < dangerProb) {
            // Generate a danger wall based on cumulative exposure
            const grid = generateDangerGrid(cumulativeExposure + currentHeat);
            const drawLimit = grid[0].length;
            const dw = {
                type: 'danger_wall',
                id: generateUID(),
                grid,
                drawLimit,
                resolved: false,
            };
            setDangerWalls(prev => [...prev, dw]);
            showToast(`⚠️ ${t('危险墙出现')}!`, 'warning');
        }

        // Reset turn heat
        setTurnHeat(0);

        const nextTurn = turnNumber + 1;
        ...
```

Delete everything from `// --- Turn-end danger check using turnHeat ---` through the `setTurnHeat(0);` line inclusive. The function should now start with `const nextTurn = turnNumber + 1;` directly after `const startNextTurn = () => {`.

- [ ] **Step 6: Simplify `removeEncounter` → delete it**

Locate `removeEncounter` (around line 1122-1141):
```javascript
    const removeEncounter = (type, id) => {
        if (type === 'danger_wall') { ... }
        else if (type === 'score_order') { ... }
    };
```

With both branches going away (score orders handled in Task 6), this function becomes empty. **Delete the entire function definition.**

Also remove `removeEncounter` from the returned hook object (around line 1314).

- [ ] **Step 7: Clean up reset/init sites**

`startGame` (around line 624-664): delete the lines
```javascript
        setTurnHeat(0);
        setCumulativeExposure(0);
        setDangerWalls([]);
```

`handleReset` (around line 1150-1190): delete all references to the removed setters (`setTurnHeat`, `setCumulativeExposure`, `setDangerWalls`, `setWallDepth` — the latter is removed in Task 6).

- [ ] **Step 8: Remove from hook return object**

Around line 1270-1315, delete these keys from the returned object:
```javascript
        enterDangerWall,
        exitDangerWallView,
```
and:
```javascript
        dangerWalls,
```
and:
```javascript
        turnHeat,
        cumulativeExposure,
```
(Other related returns — `risk`, `wallDepth`, `nextDrawRiskIncrement` — are removed in Task 6.)

- [ ] **Step 9: Lint check**

Run:
```bash
npm run lint
```
Expected: lint surfaces any straggling references. `npm run build` will fail — `GameCore.jsx` still reads these symbols until Task 7. That's expected.

- [ ] **Step 10: No commit** — batch with Tasks 6-7 (all cleanup lands in one commit per subsystem).

---

## Task 6: Remove risk/heat chain + doom residue from `useGameLogic`

**Files:**
- Modify: `src/hooks/useGameLogic.js` — multiple regions

- [ ] **Step 1: Drop unused imports**

At the top of the file (around line 3-5), find:
```javascript
import { DOOM_CONFIG } from '../data/constants';
```
and
```javascript
import { V3_INITIAL_STATE, AP_CONFIG, RISK_CONFIG } from '../data/v3Config';
```

Replace with:
```javascript
import { V3_INITIAL_STATE, AP_CONFIG } from '../data/v3Config';
```
(`DOOM_CONFIG` import removed entirely; `RISK_CONFIG` import removed.)

- [ ] **Step 2: Delete doom residue state**

Around line 50-52:
```javascript
    // --- Doom State (legacy — kept for backward compat, ignored by new risk system) ---
    const [doomCounter, setDoomCounter] = useState(0);
    const [hp, setHp] = useState(doomConfig.initialHP);
```
Delete the entire block, plus the earlier:
```javascript
    const doomConfig = config.doom || DOOM_CONFIG;
```
around line 24.

- [ ] **Step 3: Delete risk state**

Around line 54-57:
```javascript
    // --- Risk System State ---
    const [risk, setRisk] = useState(RISK_CONFIG.RISK_FLOOR);
    const [wallDepth, setWallDepth] = useState(0);
    const [lives, setLives] = useState(RISK_CONFIG.INITIAL_LIVES);
```
Replace with:
```javascript
    // --- Lives ---
    const INITIAL_LIVES = 5;
    const [lives, setLives] = useState(INITIAL_LIVES);
```
(`risk` and `wallDepth` deleted; `INITIAL_LIVES` is now a local constant since `RISK_CONFIG` is gone.)

- [ ] **Step 4: Delete risk-derived values**

Around line 109-122:
```javascript
    // Risk system: derive coefficient from riskLabel via config lookup
    const getRiskCoeff = (poolType) => {
        const label = poolType?.riskLabel || '低';
        return RISK_CONFIG.RISK_COEFFICIENTS[label] || 1;
    };
    // Risk tier: plateau shrinks as you draw deeper (4, 3, 2, 1, 1, 1...)
    const getRiskTier = (depth) => {
        if (depth <= 4) return 1;
        if (depth <= 7) return 2;
        if (depth <= 9) return 3;
        return depth - 6;
    };
    const currentPoolRiskCoeff = getRiskCoeff(currentPool?.poolType);
    const nextDrawRiskIncrement = getRiskTier(wallDepth + 1) * currentPoolRiskCoeff;
```
Delete the entire block.

- [ ] **Step 5: Clean reset/init sites**

`startGame` (around line 624-664): replace
```javascript
        setRisk(RISK_CONFIG.RISK_FLOOR);
        setWallDepth(0);
        setLives(RISK_CONFIG.INITIAL_LIVES);
```
with:
```javascript
        setLives(INITIAL_LIVES);
```

Also delete `setDoomCounter(0);` elsewhere in the same function. Similarly delete the `setHp(...)` call if present.

`handleReset` (around line 1150-1190): replace
```javascript
        setDoomCounter(0);
        ...
        setHp(doomConfig.initialHP);
        ...
        setRisk(RISK_CONFIG.RISK_FLOOR);
        setWallDepth(0);
        setLives(RISK_CONFIG.INITIAL_LIVES);
```
with:
```javascript
        setLives(INITIAL_LIVES);
```

- [ ] **Step 6: Remove from hook return object**

Around line 1270-1315, delete:
```javascript
        risk,
        wallDepth,
        nextDrawRiskIncrement,
        doomCounter,
        hp,
```
(keep `lives`).

- [ ] **Step 7: No commit** — batch with Task 7.

---

## Task 7: Remove growth/score orders + gold residue from `useGameLogic`

**Files:**
- Modify: `src/hooks/useGameLogic.js` — multiple regions

- [ ] **Step 1: Drop the growthOrders import**

Around line 7, find:
```javascript
import { GROWTH_ORDERS, isOrderReady, getOrderProgress, generateScoreOrder } from '../data/growthOrders';
```
Delete the entire line.

- [ ] **Step 2: Delete `scoreOrderEncounters` and `completedOrderIds` state**

Around lines 64-65 and 93-94:
```javascript
    // --- Score Order Encounters State ---
    const [scoreOrderEncounters, setScoreOrderEncounters] = useState([]);
```
and
```javascript
    // --- Growth Orders State ---
    // completedOrderIds: Set-like array of order ids that have been submitted
    const [completedOrderIds, setCompletedOrderIds] = useState([]);
```
Delete both blocks.

- [ ] **Step 3: Delete `growthOrdersView`**

Around line 125-130:
```javascript
    // --- Growth Orders: derived view ---
    const growthOrdersView = GROWTH_ORDERS.map(order => {
        const completed = completedOrderIds.includes(order.id);
        const locked = false;
        const ready = !completed && isOrderReady(order, inventory);
        return { order, completed, locked, ready };
    });
```
Delete the entire block.

- [ ] **Step 4: Delete all other references in the hook body**

Search the file for the symbols `GROWTH_ORDERS`, `scoreOrderEncounters`, `completedOrderIds`, `generateScoreOrder`, `submitGrowthOrder`, and `isOrderReady`. Delete each definition and call site. In particular:

- Lines around 265-275: `const orderAreaCount = scoreOrderEncounters.length;` and any code using it (check the surrounding function — if an entire function is dedicated to orders, delete it).
- Lines around 305-360: any `submitGrowthOrder` / gold-order handler functions — delete them.

(If you find a call site that cannot be cleanly deleted without breaking surrounding logic, pause and re-read the function to decide whether the whole function goes. Growth-order code is isolated — nothing else should depend on it.)

- [ ] **Step 5: Remove gold-cell handling from `completeDrawAnim`**

Locate (around line 916-918):
```javascript
        } else if (drawnCell.type === 'gold') {
            // Gold cells no longer grant gold (gold removed). Treat as empty.
            showToast(t('空格'), 'info');
        }
```
Delete this `else if` branch entirely.

- [ ] **Step 6: Clean reset/init sites**

`startGame`: delete lines `setCompletedOrderIds([]);` and `setScoreOrderEncounters([]);`.
`handleReset`: delete the same lines.

- [ ] **Step 7: Remove from hook return object**

Delete these keys from the returned object:
```javascript
        growthOrdersView,
        submitGrowthOrder,
        completedOrderIds,
        scoreOrderEncounters,
```

- [ ] **Step 8: Lint check**

Run:
```bash
npm run lint
```
Expected: the hook file is now clean. `npm run build` will still fail because `GameCore.jsx` and `OrderBoard.jsx` still import removed things. Task 8 fixes that.

---

## Task 8: Clean up `GameCore.jsx` destructures + danger-wall rendering

**Files:**
- Modify: `src/GameCore.jsx` — destructure block and two render regions

- [ ] **Step 1: Trim the destructure block**

Locate the `const { ... } = state;` block around lines 100-120. Find and delete these entries:
```javascript
        enterDangerWall, exitDangerWallView,
        growthOrdersView, submitGrowthOrder,
        doomCounter, hp,
        risk, wallDepth, turnHeat, cumulativeExposure, dangerWalls, nextDrawRiskIncrement,
        removeEncounter,
```

The resulting destructure should keep only still-exported state: `lives`, `canEvacuate`, `evacuate`, `slotCards`, `profitCards`, `dangerCards`, `satisfiedProfitCount`, `evacuationProfitRequirement`, and everything else unrelated to the removed systems.

If in doubt, check the current return object of `useGameLogic` — everything in the destructure must exist there.

- [ ] **Step 2: Delete the `turnHeat` / `dangerWalls` header badges**

Locate the header-bar JSX around lines 238-260:
```javascript
                            turnHeat >= 50 ? 'bg-red-50 border-red-300 text-red-600' :
                            turnHeat >= 25 ? 'bg-amber-50 border-amber-300 text-amber-600' :
                            ...
                            <span className="tabular-nums">{turnHeat}</span>
                            ...
                            {dangerWalls.length > 0 && (
                                ...
                                <span className="tabular-nums">{dangerWalls.length}</span>
                                ...
```
Delete the wrapping `<div>` (or `<span>`) that renders these badges. If you are unsure which closing tag belongs to the delete region, take a conservative approach: delete ~25 lines containing these references and then run `npm run build` to confirm the JSX parses.

- [ ] **Step 3: Delete danger-wall encounter renderings**

Two blocks exist (around lines 308-345 and 551-600). Both follow the shape:
```javascript
                            {dangerWalls.length > 0 && (
                                ...
                                {dangerWalls.map(dw => (
                                    ...
                                    onClick={() => removeEncounter('danger_wall', dw.id)}
                                    ...
                                    onClick={() => enterDangerWall(dw.id)}
                                    ...
                                ))}
                                ...
                            )}
```
Delete both blocks entirely.

Also find the currentPool-is-danger-wall rendering around line 530:
```javascript
                                        onClick={exitDangerWallView}
```
and delete the containing conditional (`{currentPool?.isDangerWall && (...)}` or equivalent).

- [ ] **Step 4: Verify build**

Run:
```bash
npm run lint
npm run build
```
Expected: both clean. If errors remain, fix them inline — they will point at references to removed symbols.

- [ ] **Step 5: Smoke test the cleaned game**

```bash
npm run dev
```
Start a new game. Draw on several walls, cycle multiple turns, and confirm:
1. No danger-wall UI appears.
2. No console errors in browser devtools.
3. Danger cards still auto-generate at turn start and auto-resolve at turn end.
4. Evacuation on 3 satisfied profit cards still works.

Stop the dev server.

- [ ] **Step 6: Commit Tasks 5-8 together**

```bash
git add src/hooks/useGameLogic.js src/GameCore.jsx
git commit -m "$(cat <<'EOF'
refactor: remove danger-wall, risk-heat, growth-order residue

Deletes the dead danger-wall subsystem (redundant with danger cards),
the risk/heat chain that existed only to feed it, the growth/score
order system that was already hidden from the UI, and stale doom/gold
residue. Behavior unchanged for the active prototype loop.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Trim `v3Config.js`

**Files:**
- Modify: `src/data/v3Config.js`

- [ ] **Step 1: Check for orphan doom helper importers**

Run:
```bash
grep -rn "DOOM_EVENTS\|DOOM_RESOLUTION_DRAWS\|getDoomTurnEvents" src/ 2>/dev/null
```
Expected: all matches are inside `src/data/v3Config.js` itself. If any other file imports these, pause and report before deleting.

- [ ] **Step 2: Delete doom constants + helper**

Locate (around line 110-143) this section:
```javascript
// --- 厄运事件配置 ---
export const DOOM_EVENTS = { ... };

// --- 厄运结算抽取数（按回合数）---
export const DOOM_RESOLUTION_DRAWS = [ ... ];

// Helper: get doom events for a given turn
export function getDoomTurnEvents(turn) { ... }
```
Delete everything from the `// --- 厄运事件配置 ---` banner through the closing brace of `getDoomTurnEvents` inclusive.

- [ ] **Step 3: Delete gold residue**

Around line 145-147:
```javascript
// --- 金币经济常量 (DEPRECATED — gold system removed) ---
export const DRAW_GOLD_COST = 0;
export const TURN_GOLD_INCOME = 0;
```
Delete the entire block.

- [ ] **Step 4: Delete `RISK_CONFIG`**

Around line 162-184:
```javascript
// --- Risk System Configuration ---
export const RISK_CONFIG = { ... };
```
Delete the entire block (comments + const). The file now has no risk machinery.

- [ ] **Step 5: Trim `V3_INITIAL_STATE`**

The remaining `V3_INITIAL_STATE` uses `hp`, `doomGridSize`, `initialDanger` which no longer drive the hook. Since `V3_INITIAL_STATE` is documentation-only (the hook reads from `INITIAL_GAME_CONFIG`), trim it to:
```javascript
export const V3_INITIAL_STATE = {
    refreshCount: 1,
    backpackCapacity: 10,
};
```

- [ ] **Step 6: Verify**

```bash
npm run lint
npm run build
```
Expected: both clean.

- [ ] **Step 7: No commit** — batch with Tasks 10-11.

---

## Task 10: Delete `growthOrders.js` + `OrderBoard.jsx`

**Files:**
- Delete: `src/data/growthOrders.js`
- Delete: `src/components/game/OrderBoard.jsx`

- [ ] **Step 1: Re-verify OrderBoard is dead**

Run:
```bash
grep -rn "OrderBoard" src/ 2>/dev/null
```
Expected: the only matches are `src/components/game/OrderBoard.jsx` itself. If any non-self import remains, stop and report.

- [ ] **Step 2: Re-verify growthOrders.js is orphaned**

```bash
grep -rn "from.*growthOrders\|require.*growthOrders" src/ 2>/dev/null
```
Expected: no matches (Task 7 already removed the import in `useGameLogic.js`, and OrderBoard is being deleted in step 3).

- [ ] **Step 3: Delete the files**

```bash
rm src/components/game/OrderBoard.jsx
rm src/data/growthOrders.js
```

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run build
```
Expected: both clean.

- [ ] **Step 5: No commit** — batch with Task 11.

---

## Task 11: Strip legacy helpers from `slotCards.js`

**Files:**
- Modify: `src/data/slotCards.js`

- [ ] **Step 1: Delete `EVACUATION_STICKER_THRESHOLD` + stale doc line**

Around line 5-21:
```javascript
 *   - 撤离卡 (evacuation): evacuate when inventory has >= EVACUATION_STICKER_THRESHOLD stickers
```
Replace with:
```javascript
 *   - 撤离条件在 useGameLogic 中检查 (need EVACUATION_PROFIT_REQUIREMENT satisfied profit cards)
```

Then delete:
```javascript
/** Sticker threshold for evacuation (passive check: inventory sticker count >= this) */
export const EVACUATION_STICKER_THRESHOLD = 8;
```

- [ ] **Step 2: Delete `SLOT_CARD_CONFIG.evacuation` entry**

Around line 24-38, find:
```javascript
export const SLOT_CARD_CONFIG = {
    profit: { ... },
    danger: { ... },
    evacuation: {
        // No longer used for slot-based evacuation; kept for backward compat
        minSlots: 8,
        maxSlots: 8,
    },
};
```
Delete the `evacuation` sub-object only; keep `profit` and `danger`.

- [ ] **Step 3: Delete the `evacuation` type branch in `generateSlotCard`**

Around line 125-141:
```javascript
    // Evacuation cards: all slots accept any sticker type
    if (type === 'evacuation') {
        const slots = [];
        for (let i = 0; i < slotCount; i++) {
            slots.push({
                stickerType: 'any',
                filled: false,
                filledStickerUid: null,
                filledStickerType: null,
            });
        }
        return {
            id: `slot_${type}_${generateUID()}`,
            type,
            slots,
        };
    }
```
Delete the entire `if` block.

- [ ] **Step 4: Delete `isCardComplete` and `getCardProgress`**

Around line 253-262:
```javascript
/** Check if all slots on a card are filled (legacy — kept for backward compat) */
export function isCardComplete(card) {
    return card.slots.every(s => s.filled);
}

/** Count filled / total slots (legacy — kept for backward compat) */
export function getCardProgress(card) {
    const filled = card.slots.filter(s => s.filled).length;
    return { filled, total: card.slots.length };
}
```
Delete both functions.

- [ ] **Step 5: Update the JSDoc at the top of `generateSlotCard`**

Around line 103-113, find:
```javascript
 * @param {'profit' | 'danger' | 'evacuation'} type - Card type
```
Replace with:
```javascript
 * @param {'profit' | 'danger'} type - Card type
```

- [ ] **Step 6: Verify**

```bash
npm run lint
npm run build
```
Expected: both clean.

- [ ] **Step 7: Commit Tasks 9-11 as one cleanup commit**

```bash
git add src/data/v3Config.js src/data/slotCards.js src/data/growthOrders.js src/components/game/OrderBoard.jsx
git commit -m "$(cat <<'EOF'
chore: delete growthOrders/OrderBoard and trim config residue

Removes growth-order module, the dead OrderBoard component,
RISK_CONFIG, doom helpers, and the legacy evacuation slot-card type.
All were dead after the danger-wall / evacuation-rework cleanup.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Final verification pass

**Files:**
- None modified.

- [ ] **Step 1: Confirm no stragglers**

```bash
grep -rn "dangerWalls\|turnHeat\|cumulativeExposure\|wallDepth\|RISK_CONFIG\|GROWTH_ORDERS\|EVACUATION_STICKER_THRESHOLD\|doomCounter\|scoreOrderEncounters\|evacuationStickerThreshold\|inventoryStickerCount\|getRiskCoeff\|getRiskTier\|generateDangerGrid\|enterDangerWall\|exitDangerWallView\|removeEncounter\|isCardComplete\|getCardProgress\|growthOrdersView\|submitGrowthOrder" src/ 2>/dev/null
```
Expected: no output.

- [ ] **Step 2: Run full verification**

```bash
npm run lint
npm run build
```
Expected: both clean.

- [ ] **Step 3: Manual smoke test in both languages**

```bash
npm run dev
```

Check zh (default) then switch to en via the in-game language toggle. For each language, verify:
1. New game starts; inventory has 10 slots.
2. Evacuation bar shows `0/3` in both languages (label "撤离 / Evacuate", helper text "满足 3 张兑换券 / Satisfy 3 vouchers").
3. Taking 3 profit cards and filling their sticker requirements turns the bar green and enables the evacuate button.
4. Clicking evacuate ends the expedition normally.
5. No console errors in devtools.
6. No text overflow or broken layout in either language.

Stop the dev server.

- [ ] **Step 4: Confirm git state is clean**

```bash
git status
git log --oneline -5
```
Expected:
- Working tree clean (no stray diffs).
- Three commits on top of the pre-task HEAD: feat(evacuation), feat(backpack), refactor: cleanup, chore: cleanup residue. (Four commits if you count them individually.)

---

## Self-Review Notes

**Spec coverage check:**
- Evacuation rule → Tasks 1-3 ✓
- Evacuation Bar UI → Task 3 ✓
- Backpack 15→10 → Task 4 ✓
- Danger wall cleanup → Task 5 ✓
- Risk/heat chain cleanup → Task 6 ✓
- Growth/score orders cleanup → Task 7 ✓
- Gold residue cleanup → Task 7 (step 5) + Task 9 (step 3) ✓
- GameCore destructure cleanup → Task 8 ✓
- v3Config trimming → Task 9 ✓
- Delete growthOrders.js / OrderBoard.jsx → Task 10 ✓
- slotCards legacy helpers cleanup → Task 11 ✓
- Translations → Task 3 ✓
- INITIAL_LIVES migration → Task 6 ✓
- Known risks (playtesting profit-card difficulty) → acknowledged in spec, not acted on ✓

**Out of scope confirmed:** `game_rules.md` sync, skill cards, profit-card rebalancing — none have tasks, matching the spec.

**Placeholder scan:** No TBD/TODO/"add error handling"/etc. Every code step shows the exact code.

**Type consistency:** `satisfiedProfitCount` and `evacuationProfitRequirement` used identically between Task 2 (hook return) and Task 3 (UI destructure). `EVACUATION_PROFIT_REQUIREMENT` the same constant name in slotCards.js and the import in useGameLogic.js. `INITIAL_LIVES` defined and referenced consistently.
