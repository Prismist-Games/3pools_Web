# 美食综艺视觉主题 — Addendum Plan

> Follow-up to `2026-04-09-cooking-show-visual-theme.md`. Fixes gaps discovered after initial implementation: missing components, missing animations, and spec requirements not covered by original tasks.

**Goal:** Complete the kitchen theme coverage across all UI surfaces that were missed in the first pass.

**Architecture:** Same reskinning approach — class replacements + CSS animation wiring.

---

## Gaps identified

| Spec §       | Gap                                                       |
|--------------|-----------------------------------------------------------|
| §4.3         | Hidden cell stripe pattern never applied                  |
| §4.4         | Cell flip animation defined in CSS, never applied         |
| §7.2         | `ActiveOrders.jsx` was never reskinned                    |
| §7.2         | Doom grid in `GameCore.jsx` still cold-tone               |
| §7.2         | Gold gradient progress bar on active orders missing       |
| §8.1         | Round transition overlay (`crt-transition-in`, `static-noise`) never implemented |
| (missed)     | `GameGuide.jsx` never reskinned                           |
| (missed)     | `SkillSelectionModal.jsx` never reskinned                 |
| (missed)     | `ConfirmDialog.jsx` never reskinned                       |
| (missed)     | `Toast.jsx` never reskinned                               |
| (missed)     | `ActionCards.jsx`, `ShapeSelector.jsx`, `ActiveShapeDisplay.jsx` never reskinned |
| (missed)     | `GameCore.jsx` inventory panel, recycle bar, pending items bar, doom result confirm button — still cold-tone |
| (missed)     | `GameCore.jsx` game-over screen (`phase === 'game_over'`) — still cold-tone |

---

## Task 13a: ActiveOrders.jsx reskin

**Files:**
- Modify: `src/components/game/ActiveOrders.jsx`

- [ ] **Step 1: Reskin panel container and header**

```
Panel: bg-white rounded-lg shadow-sm border
  → bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]

Header border: border-b border-gray-100
  → border-b border-dashed border-kitchen-gold-border/30

Title: text-xs font-semibold uppercase tracking-wide text-gray-400
  → text-sm font-bold text-kitchen-text-body (change label to: 📋 {t('已接订单')})

Count badge: text-[10px] text-gray-300
  → text-[10px] text-kitchen-text-muted
```

- [ ] **Step 2: Reskin replace mode hint**

```
Container: bg-amber-50 border-2 border-amber-300
  → bg-[#FFF8E0] border-2 border-kitchen-gold

Title: text-amber-600
  → text-kitchen-gold-deep

Cancel button: border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500
  → border-kitchen-gold-border-muted bg-kitchen-card text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text
```

- [ ] **Step 3: Reskin empty state**

```
text-[11px] text-gray-300 → text-[11px] text-kitchen-text-muted
```

- [ ] **Step 4: Reskin order card states**

```
Replace mode active: border-amber-400 bg-amber-50 hover:bg-red-50 hover:border-red-400
  → border-kitchen-gold bg-[#FFF8E0] hover:bg-[#FFF0EE] hover:border-kitchen-danger

Submittable: border-green-300 bg-green-50/50
  → border-kitchen-success bg-[#F0FFF8]

Default: border-gray-100 bg-gray-50/50
  → border-kitchen-gold-border-muted/50 bg-kitchen-card/80
```

- [ ] **Step 5: Reskin difficulty label, submit button, requirements**

```
"难度" label: text-gray-300 → text-kitchen-text-muted
Submit button (submittable): bg-green-500 text-white hover:bg-green-600
  → bg-kitchen-gold text-kitchen-text-title hover:bg-kitchen-gold-dark
Submit button (disabled): bg-gray-200 text-gray-400
  → bg-[#F5F0E8] text-kitchen-text-muted
"需要" label: text-gray-300 → text-kitchen-text-muted
Requirement slot hovered: border-blue-400 bg-blue-50 ring-2 ring-blue-300
  → border-kitchen-gold bg-[#FFF8E0] ring-2 ring-kitchen-gold/40
Requirement slot enough: border-green-400 bg-green-50
  → border-kitchen-success bg-[#F0FFF8]
Requirement slot default: border-gray-300 bg-white
  → border-kitchen-gold-border-muted bg-kitchen-card
Count text hovered: text-blue-600 → text-kitchen-gold-deep
Count text enough: text-green-600 → text-kitchen-success-border
Count text default: text-gray-400 → text-kitchen-text-muted
Fraction denominator: text-gray-300 → text-kitchen-text-muted
```

- [ ] **Step 6: Add gold gradient progress bar**

Per spec §7.2, active orders should show a gold gradient progress bar. Add it inside each order card, below the requirements row:

```jsx
{/* Progress bar — filled stickers vs total */}
{(() => {
    const total = order.requirements.reduce((s, r) => s + r.count, 0);
    const owned = order.requirements.reduce((s, r) => {
        const have = inventory.filter(item => item.stickerId === r.stickerId).length;
        return s + Math.min(have, r.count);
    }, 0);
    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
    return (
        <div className="mt-1.5 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-kitchen-gold to-[#F2C040] transition-all duration-300"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
})()}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/game/ActiveOrders.jsx
git commit -m "feat: reskin active orders panel to kitchen theme with progress bar"
```

---

## Task 13b: Doom grid + confirm button in GameCore.jsx

**Files:**
- Modify: `src/GameCore.jsx` (doom grid section, `getDoomCellClass` function, confirm button)

- [ ] **Step 1: Reskin doom grid panel container**

Find `{/* Doom Grid */}` (around line 412):

```
Old: className="bg-white rounded-lg shadow-sm border"
New: className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]"
```

Header:
```
border-b border-gray-100 → border-b border-dashed border-kitchen-gold-border/30
Title: text-xs font-semibold uppercase tracking-wide text-gray-400
  → text-sm font-bold text-kitchen-text-body (change label to: 💀 {t('厄运')})
Level badge: text-red-500 → text-kitchen-danger-text
```

- [ ] **Step 2: Reskin `getDoomCellClass` function**

Find the function (around line 92):

```js
const base = cell.type === 'danger'
    ? 'bg-[#FFE8E2] border-kitchen-danger text-kitchen-danger-text font-bold'
    : 'bg-[#F5F0E8] border-kitchen-gold-border-muted text-kitchen-text-muted';

if (!doomAnimState) return base;

const cursorCount = doomAnimState.spinningPositions.filter(p => p === cellIndex).length;
if (cursorCount === 0) return base;

if (doomAnimState.phase === 'spinning') {
    return `${base} ring-2 ring-kitchen-gold scale-110 z-10 transition-all duration-75`;
}
const isHit = doomAnimState.finalSelections.some(s => s.index === cellIndex && s.isHit);
if (isHit) {
    return 'bg-[#FFD4C8] border-kitchen-danger-border text-kitchen-danger-text font-bold ring-3 ring-kitchen-danger scale-125 z-10 transition-all duration-300';
}
return 'bg-[#D4F0DC] border-kitchen-success-border text-[#408060] font-bold ring-3 ring-kitchen-success scale-125 z-10 transition-all duration-300';
```

- [ ] **Step 3: Reskin doom grid subtext and confirm button**

```
"危险" / "结算" text: text-gray-300 → text-kitchen-text-muted
Cursor badge: bg-yellow-400 text-black → bg-kitchen-gold text-kitchen-text-title
Doom result border: border-gray-100 → border-dashed border-kitchen-gold-border/30
Confirm button: bg-slate-700 text-white hover:bg-slate-800
  → bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body font-bold shadow-[0_2px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC]
```

- [ ] **Step 4: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: reskin doom grid to kitchen theme"
```

---

## Task 13c: Inventory panel + recycle/pending bars in GameCore.jsx

**Files:**
- Modify: `src/GameCore.jsx` (inventory section around line 467-567)

- [ ] **Step 1: Reskin inventory panel container**

```
Container: bg-white rounded-lg shadow-sm border
  → bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]

Header border: border-b border-gray-100
  → border-b border-dashed border-kitchen-gold-border/30

Title: text-xs font-semibold uppercase tracking-wide text-gray-400
  → text-sm font-bold text-kitchen-text-body (prefix: 🧺 {t('菜篮')})

Count: text-[10px] text-gray-300 → text-[10px] text-kitchen-text-muted
```

- [ ] **Step 2: Reskin recycle mode bar**

Active state:
```
Container: bg-red-50 border border-red-200
  → bg-[#FFF0EE] border-2 border-kitchen-danger

Instructions: text-red-600 → text-kitchen-danger-text

Confirm button (enabled): bg-red-500 text-white hover:bg-red-600
  → bg-kitchen-danger text-white hover:bg-kitchen-danger-border

Confirm button (disabled): bg-gray-200 text-gray-400
  → bg-[#F5F0E8] text-kitchen-text-muted

Cancel button: border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500
  → border-kitchen-gold-border-muted bg-kitchen-card text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text
```

Inactive state:
```
Container: bg-gray-50 border border-gray-200
  → bg-[#FFF8F0] border border-kitchen-gold-border-muted

Hint text: text-gray-400 → text-kitchen-text-secondary

Recycle button: text-gray-500 bg-gray-200 hover:bg-red-100 hover:text-red-500
  → text-kitchen-text-body bg-[#FFF3E0] border border-kitchen-gold-border hover:bg-[#FFF0EE] hover:text-kitchen-danger-text
```

- [ ] **Step 3: Reskin pending items bar**

```
Container: bg-amber-50 border-2 border-amber-300
  → bg-[#FFF8E0] border-2 border-kitchen-gold

Title: text-amber-700 → text-kitchen-gold-deep

Count pill: bg-amber-200 text-amber-500
  → bg-kitchen-gold text-kitchen-text-title

Pending item slot first: ring-2 ring-amber-400
  → ring-2 ring-kitchen-gold

Pending item default border: border-gray-300 bg-white
  → border-kitchen-gold-border-muted bg-kitchen-card

Instruction text: text-amber-600 → text-kitchen-gold-deep

Discard button: border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500
  → border-kitchen-gold-border-muted bg-kitchen-card text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text
```

- [ ] **Step 4: Reskin inventory slot grid (in GameCore, not InventorySlot component)**

These are simplified inventory cells rendered inline in GameCore (around line 525-562):

```
Recycle selected: bg-red-100 border-red-400
  → bg-[#FFF0EE] border-kitchen-danger

Empty: bg-gray-50 border-gray-200
  → bg-[#F8F4EC] border-kitchen-gold-border-muted

Default (no sc): bg-white border-gray-300
  → bg-kitchen-card border-kitchen-gold-border-muted

Can replace hover: hover:bg-red-50 hover:border-red-400
  → hover:bg-[#FFF0EE] hover:border-kitchen-danger

Recycle mode hover: hover:border-red-400
  → hover:border-kitchen-danger
```

- [ ] **Step 5: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: reskin inventory panel and recycle/pending bars"
```

---

## Task 13d: Game-over screen in GameCore.jsx

**Files:**
- Modify: `src/GameCore.jsx` (game_over phase section around line 574-650)

- [ ] **Step 1: Reskin game over screen**

```
Safe evacuation title: text-xl font-bold → text-xl font-bold text-kitchen-text-title
Game over title: text-red-600 → text-kitchen-danger-text
Game over subtitle: text-red-500 → text-kitchen-danger-text
Round label: text-gray-500 → text-kitchen-text-secondary
Empty items dash: text-gray-400 → text-kitchen-text-muted
Item name: text-gray-500 → text-kitchen-text-secondary
Total score line: text-gray-500 → text-kitchen-text-secondary
Victory title: text-green-600 → text-kitchen-success-border
Failure title: text-red-500 → text-kitchen-danger-text
Final score: text-gray-500 → text-kitchen-text-secondary
```

- [ ] **Step 2: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: reskin game-over screen to kitchen theme"
```

---

## Task 13e: GameGuide.jsx

**Files:**
- Modify: `src/components/ui/GameGuide.jsx`

- [ ] **Step 1: Systematic color replacement**

Read the full file. Replace every occurrence of cold-tone classes with kitchen equivalents:

```
bg-white                → bg-kitchen-card
bg-slate-100, bg-gray-100 → bg-[#FFF8F0]
bg-slate-50,  bg-gray-50  → bg-[#FFFAF2]
bg-blue-50                → bg-[#FFF8E0]
bg-blue-500, bg-blue-600  → bg-kitchen-gold (button), or bg-kitchen-gold-dark (hover)
text-slate-800, text-gray-800, text-gray-700 → text-kitchen-text-title
text-slate-600, text-gray-600, text-gray-500 → text-kitchen-text-body
text-gray-400, text-slate-400                → text-kitchen-text-secondary
text-gray-300                                 → text-kitchen-text-muted
text-blue-500, text-blue-600, text-blue-700   → text-kitchen-gold-deep
border-gray-200, border-slate-200             → border-kitchen-gold-border-muted
border-gray-300, border-slate-300             → border-kitchen-gold-border-muted
border-blue-300, border-blue-400              → border-kitchen-gold-border
```

Preserve the modal backdrop (keep `bg-black/XX`), preserve emoji-based content, preserve layout classes (flex, grid, padding, margin, text sizes, etc.).

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/GameGuide.jsx
git commit -m "feat: reskin game guide to kitchen theme"
```

---

## Task 13f: Small components (ConfirmDialog, Toast, ActionCards, ShapeSelector, ActiveShapeDisplay)

**Files:**
- Modify: `src/components/ui/ConfirmDialog.jsx`
- Modify: `src/components/ui/Toast.jsx`
- Modify: `src/components/game/ActionCards.jsx`
- Modify: `src/components/game/ShapeSelector.jsx`
- Modify: `src/components/game/ActiveShapeDisplay.jsx`

- [ ] **Step 1: Systematic color replacement across all 5 files**

Apply the same mapping as Task 13e:

```
bg-white → bg-kitchen-card
bg-gray-50/100 → bg-[#FFFAF2] / bg-[#FFF8F0]
bg-slate-50/100 → bg-[#FFFAF2] / bg-[#FFF8F0]
bg-blue-50 → bg-[#FFF8E0]
bg-blue-500/600 → bg-kitchen-gold / bg-kitchen-gold-dark (for buttons)
text-gray-300/400/500/600/700/800 → text-kitchen-text-muted/secondary/secondary/body/body/title
text-slate-*               → corresponding kitchen-text tier
text-blue-500/600/700      → text-kitchen-gold-deep
border-gray-*              → border-kitchen-gold-border-muted
border-blue-*              → border-kitchen-gold-border
```

For Toast specifically:
- Success toast: `bg-green-500` → `bg-kitchen-success`
- Error toast: `bg-red-500` → `bg-kitchen-danger`
- Info toast: `bg-blue-500` → `bg-kitchen-gold`

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ConfirmDialog.jsx src/components/ui/Toast.jsx \
        src/components/game/ActionCards.jsx src/components/game/ShapeSelector.jsx \
        src/components/game/ActiveShapeDisplay.jsx
git commit -m "feat: reskin small UI components to kitchen theme"
```

---

## Task 13g: SkillSelectionModal.jsx

**Files:**
- Modify: `src/components/game/SkillSelectionModal.jsx`

This modal currently uses a dark backdrop with white cards. The kitchen theme is light, so we'll shift the backdrop to a warm darkened-cream and the cards to kitchen-card.

- [ ] **Step 1: Reskin backdrop and main container**

```
Backdrop: bg-black/80 backdrop-blur-md
  → bg-[#2D1810]/70 backdrop-blur-md  (warm dark brown instead of black)

Title: text-white → text-kitchen-card
Subtitle: text-slate-300 → text-[#E8D8B0]
Section labels: text-slate-400 → text-[#E8D8B0]
Peek button: bg-white text-slate-800 ring-slate-200 hover:bg-slate-100
  → bg-kitchen-card text-kitchen-text-title ring-kitchen-gold-border hover:bg-[#FFF3E0]
```

- [ ] **Step 2: Reskin skill candidate cards**

```
Card base: bg-white → bg-kitchen-card
Selected ring (green): ring-green-500 bg-green-50
  → ring-kitchen-gold bg-[#FFF8E0]
```

- [ ] **Step 3: Reskin any remaining blue/green/red accents**

Do a systematic pass:
```
bg-blue-*          → kitchen-gold variants
bg-green-*         → kitchen-success / kitchen-gold (for "confirm" actions use gold)
text-slate-*       → kitchen-text-* tiers
border-*           → kitchen-gold-border variants
```

Preserve icon colors (Lucide icons) and scale/hover animations.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/SkillSelectionModal.jsx
git commit -m "feat: reskin skill selection modal to kitchen theme"
```

---

## Task 13h: Cell flip animation + hidden cell stripe pattern

**Files:**
- Modify: `src/components/game/ResourceMatrix.jsx`
- Modify: `src/index.css` (add stripe pattern CSS)

- [ ] **Step 1: Add hidden cell stripe pattern to index.css**

Add after the CRT section:

```css
/* Hidden cell — kitchen towel stripe pattern */
.cell-hidden-pattern {
  background-image: repeating-linear-gradient(
    45deg,
    #F5E6D0,
    #F5E6D0 4px,
    #E8D8B8 4px,
    #E8D8B8 8px
  );
}
```

- [ ] **Step 2: Apply hidden pattern in ResourceMatrix.jsx**

In the bgClass logic (around line 127), before the `cell.type === 'item'` branch, add a check for `cell.hidden`:

```js
// Hidden cell: stripe pattern overrides normal background
if (cell.hidden) {
    bgClass = 'cell-hidden-pattern border-kitchen-gold-border-muted';
} else if (cell === null || cell.type === 'empty') {
    bgClass = 'bg-[#F8F4EC] border-[#D4C8B0]';
}
// ... rest of the existing branches
```

Note: `cell.hidden` is a pre-existing property — the component already checks for it at line 262 for content display. This extends it to background styling.

- [ ] **Step 3: Apply cell flip animation on settled cells**

Find the `highlight === 'settled'` branch in ResourceMatrix.jsx (around line 168):

```js
// Old:
if (highlight === 'settled') {
    highlightClass = 'ring-3 ring-kitchen-gold scale-110 z-20 shadow-lg shadow-[rgba(232,168,48,0.3)] transition-all duration-200';
}

// New (add animate-cell-flip):
if (highlight === 'settled') {
    highlightClass = 'ring-3 ring-kitchen-gold scale-110 z-20 shadow-lg shadow-[rgba(232,168,48,0.3)] transition-all duration-200 animate-cell-flip';
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/game/ResourceMatrix.jsx src/index.css
git commit -m "feat: add hidden cell stripe pattern and cell flip animation"
```

---

## Task 13i: Round transition overlay

**Files:**
- Create: `src/components/ui/RoundTransition.jsx`
- Modify: `src/GameCore.jsx` (mount the component)
- Modify: `src/index.css` (complete static-noise styling if needed)

- [ ] **Step 1: Create RoundTransition component**

Create `src/components/ui/RoundTransition.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Brief black-screen + static noise + channel-switch transition.
 * Shows for ~0.8s when `trigger` changes to a truthy value.
 * Displays the round/expedition number during the flash.
 */
const RoundTransition = ({ trigger, label }) => {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!trigger) return;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 800);
        return () => clearTimeout(timer);
    }, [trigger]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center"
            style={{
                background: '#1A1A1A',
                animation: 'crt-transition-in 0.8s ease-out forwards',
            }}
        >
            {/* Static noise overlay */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
                    animation: 'static-noise 0.15s steps(5) infinite',
                }}
            />
            {/* Red/blue scanline hint */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,100,80,0.05) 3px, rgba(255,100,80,0.05) 4px)',
                }}
            />
            {/* Round label */}
            <div
                className="relative z-10 text-center"
                style={{
                    color: '#E8C878',
                    textShadow: '0 0 20px rgba(232,200,120,0.5)',
                }}
            >
                <div className="text-xs font-mono text-[#888] mb-2 tracking-widest">— 信号切换 —</div>
                <div className="text-4xl font-black tracking-wide">{label}</div>
            </div>
        </div>
    );
};

export default RoundTransition;
```

- [ ] **Step 2: Mount in GameCore.jsx**

Add the import at the top:

```jsx
import RoundTransition from './components/ui/RoundTransition';
```

Add state to track transition trigger. Near other useState declarations at the top of GameCore:

```jsx
const [transitionKey, setTransitionKey] = useState(0);
const [transitionLabel, setTransitionLabel] = useState('');
```

Watch `expeditionNumber` changes with a useEffect:

```jsx
useEffect(() => {
    if (expeditionNumber > 0 && phase === 'drawing') {
        setTransitionLabel(language === 'en' ? `Round ${expeditionNumber}` : `第 ${expeditionNumber} 场`);
        setTransitionKey(k => k + 1);
    }
}, [expeditionNumber, phase, language]);
```

Render the overlay at the end of the main return (just before closing):

```jsx
<RoundTransition trigger={transitionKey} label={transitionLabel} />
```

- [ ] **Step 3: Verify the animation runs**

Start game → proceed from pre_game to drawing → transition should briefly flash.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/RoundTransition.jsx src/GameCore.jsx
git commit -m "feat: add round transition overlay with static noise effect"
```

---

## Final verification

- [ ] Run `npm run build` — should complete without errors
- [ ] Run `npm run dev` — manually click through: prologue → game → guide → draw → doom trigger → shelf → accept order → submit → evacuate → game over screen
- [ ] No cold-tone colors should remain visible in the main gameplay flow
