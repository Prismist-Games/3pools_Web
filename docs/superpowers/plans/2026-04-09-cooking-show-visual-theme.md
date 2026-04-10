# 美食综艺视觉主题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the game's visual identity from generic Tailwind defaults to a warm "kitchen cooking show" theme with CRT effects on special moments.

**Architecture:** Pure CSS/Tailwind reskinning — no structural changes to game logic. Custom Tailwind color palette in config, global CSS for backgrounds/effects/animations, then component-by-component class replacement. Each task is independently deployable.

**Tech Stack:** Tailwind CSS 3 (custom theme), CSS animations/pseudo-elements, React 18 (class changes only)

**Spec:** `docs/superpowers/specs/2026-04-09-cooking-show-visual-theme-design.md`

---

## File Map

| File | Responsibility | Action |
|------|---------------|--------|
| `tailwind.config.js` | Custom kitchen theme colors | Modify |
| `src/index.css` | Global background, CRT effects, new animations | Modify |
| `src/data/constants.js` | Rarity color config (warm palette) | Modify |
| `src/GameCore.jsx` | Header + page layout reskin | Modify |
| `src/components/game/ResourceMatrix.jsx` | Chopping board grid + arrow buttons | Modify |
| `src/components/game/BulletinBoard.jsx` | Cork board shelf styling | Modify |
| `src/components/game/WallPicker.jsx` | Menu card wall selection | Modify |
| `src/components/game/ScoreBoard.jsx` | Warm panel reskin | Modify |
| `src/components/game/OrderCard.jsx` | Warm card reskin | Modify |
| `src/components/game/InventorySlot.jsx` | Warm slot reskin | Modify |
| `src/components/game/PoolCard.jsx` | Warm pool card reskin | Modify |

---

## Task 1: Tailwind Theme + Global CSS Foundation

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

This task lays the color palette and global visual foundation. Everything else builds on it.

- [ ] **Step 1: Extend Tailwind config with kitchen theme colors**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kitchen: {
          // Base
          page: '#FDF6EC',
          card: '#FFFDF8',
          warm: '#FAEBD7',
          // Wood
          'wood-light': '#F5E6D0',
          'wood-dark': '#EDD8BC',
          'wood-border': '#D4B896',
          'wood-shadow': '#C8A880',
          // Gold accent
          gold: '#E8A830',
          'gold-dark': '#D4952A',
          'gold-deep': '#C87A20',
          'gold-border': '#E8C878',
          'gold-border-muted': '#DCC8A0',
          // Text
          'text-title': '#5A3A10',
          'text-body': '#8B5E20',
          'text-secondary': '#A08040',
          'text-muted': '#C8B080',
          // Semantic (desaturated)
          'danger': '#E09080',
          'danger-border': '#C07060',
          'danger-text': '#C05050',
          'success': '#80B890',
          'success-border': '#60A070',
          'info': '#7EB8D0',
          'info-border': '#5EA0B8',
        }
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Add global background, CRT effects, and new animations to index.css**

Add after the existing `@tailwind` directives and before the existing `@keyframes` block:

```css
/* === Kitchen Theme Global === */

/* Page background with tile texture */
body {
  background-color: #FDF6EC;
  background-image: radial-gradient(circle at 20px 20px, rgba(210,160,80,0.06) 2px, transparent 2px);
  background-size: 40px 40px;
}

/* === CRT Effects (special moments only) === */

.crt-light {
  position: relative;
}
.crt-light::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
  );
  pointer-events: none;
  z-index: 50;
  border-radius: inherit;
}

.crt-heavy {
  position: relative;
}
.crt-heavy::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 1px,
    rgba(255,100,80,0.06) 1px, rgba(255,100,80,0.06) 2px
  );
  pointer-events: none;
  z-index: 50;
  border-radius: inherit;
}

.vignette {
  position: relative;
}
.vignette::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%);
  pointer-events: none;
  z-index: 49;
  border-radius: inherit;
}

.vignette-heavy::before {
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%);
}

/* === Transition overlay === */

@keyframes crt-transition-in {
  0% { opacity: 1; }
  15% { opacity: 1; }
  100% { opacity: 0; pointer-events: none; }
}

@keyframes static-noise {
  0%, 100% { background-position: 0 0; }
  10% { background-position: -5% -10%; }
  30% { background-position: 3% 5%; }
  50% { background-position: -2% 3%; }
  70% { background-position: 7% -7%; }
  90% { background-position: -3% 2%; }
}

@keyframes signal-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2px, 1px); }
  30% { transform: translate(1px, -1px); }
  50% { transform: translate(-1px, 2px); }
  70% { transform: translate(2px, -1px); }
  90% { transform: translate(-1px, -1px); }
}

/* Card flip for drawn cells */
@keyframes cell-flip {
  0% { transform: perspective(400px) rotateY(0deg); }
  50% { transform: perspective(400px) rotateY(90deg); }
  100% { transform: perspective(400px) rotateY(0deg); }
}

.animate-cell-flip {
  animation: cell-flip 0.5s ease-in-out;
}

.animate-signal-shake {
  animation: signal-shake 0.3s ease-in-out 3;
}
```

- [ ] **Step 3: Verify dev server runs without errors**

Run: `npm run dev`
Expected: Server starts, no Tailwind compilation errors. Page background should now be cream with subtle dot texture.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "feat: add kitchen theme colors and CRT effect CSS foundation"
```

---

## Task 2: Rarity Colors (constants.js)

**Files:**
- Modify: `src/data/constants.js:344-410` (INITIAL_RARITY_CONFIG)

Update rarity colors to use warm, desaturated tones that fit the kitchen theme. These propagate to InventorySlot, OrderCard, BulletinBoard via `item.rarity.color`.

- [ ] **Step 1: Replace INITIAL_RARITY_CONFIG color fields**

In `src/data/constants.js`, replace each rarity entry's `color`, `dotColor`, `starColor`, and `shadow` fields:

```js
// common
color: 'border-kitchen-gold-border-muted bg-kitchen-card text-kitchen-text-secondary',
dotColor: 'bg-kitchen-text-muted',
starColor: 'text-kitchen-text-muted',
shadow: '',

// uncommon
color: 'border-green-400 bg-green-50 text-green-700',
dotColor: 'bg-green-500',
starColor: 'text-green-500',
shadow: 'shadow-green-200',

// rare
color: 'border-kitchen-info-border bg-blue-50 text-blue-700',
dotColor: 'bg-kitchen-info',
starColor: 'text-kitchen-info',
shadow: 'shadow-blue-200',

// epic
color: 'border-purple-400 bg-purple-50 text-purple-700',
dotColor: 'bg-purple-500',
starColor: 'text-purple-500',
shadow: 'shadow-purple-200',

// legendary
color: 'border-kitchen-gold bg-orange-50 text-orange-700',
dotColor: 'bg-kitchen-gold',
starColor: 'text-kitchen-gold',
shadow: 'shadow-orange-200',

// mythic
color: 'border-kitchen-danger bg-rose-50 text-rose-700',
dotColor: 'bg-kitchen-danger',
starColor: 'text-kitchen-danger',
shadow: 'shadow-rose-200',
```

- [ ] **Step 2: Verify visually**

Run dev server, open any game state with inventory items. Check that rarity borders and backgrounds show warm-toned variants. Common items should use the kitchen muted gold instead of cold slate.

- [ ] **Step 3: Commit**

```bash
git add src/data/constants.js
git commit -m "feat: update rarity colors to warm kitchen palette"
```

---

## Task 3: Header & Page Layout (GameCore.jsx)

**Files:**
- Modify: `src/GameCore.jsx:143-184` (Header), line ~205 (layout container)

- [ ] **Step 1: Reskin page background and main container**

At line ~130 (the outermost `<div>`), change:

```
Old: className="min-h-screen bg-slate-100 p-4"
New: className="min-h-screen p-4"
```

(Page background is now handled by body CSS from Task 1.)

- [ ] **Step 2: Reskin Header container**

At line ~144, change:

```
Old: className="mb-4 bg-white rounded-xl shadow-md border border-gray-200"
New: className="mb-4 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]"
```

- [ ] **Step 3: Reskin Header row 1 (title + badges)**

At line ~146, change border:
```
Old: className="flex items-center justify-between px-4 py-2 border-b border-gray-100"
New: className="flex items-center justify-between px-4 py-2 border-b border-kitchen-gold-border/30"
```

At line ~147, change title style:
```
Old: className="text-base font-black tracking-tight"
New: className="text-base font-black tracking-tight text-kitchen-text-title"
```

Add a 🍳 icon before the title text: `🍳 {t('梦想厨房')}`

At the badge spans (~lines 149-157), replace colors:
```
场次 badge: bg-purple-100 text-purple-700 → bg-[#FFF3E0] text-kitchen-gold-deep border border-kitchen-gold-border
回合 badge: bg-indigo-100 text-indigo-700 → bg-[#FFF3E0] text-kitchen-gold-deep border border-kitchen-gold-border
⭐ score badge: bg-amber-100 text-amber-700 → bg-[#FFF8E0] text-kitchen-gold-deep border border-kitchen-gold-border
```

- [ ] **Step 4: Reskin Header row 2 (resources)**

Replace each resource indicator (~lines 165-183) from plain text to pill badges:

```jsx
// HP
<span className="bg-[#FFF0F0] border border-[#E8A0A0] px-2.5 py-1 rounded-full text-xs font-medium text-kitchen-danger-text">
  ❤️ {hp}/{maxHp}
</span>

// Gold
<span className="bg-[#FFF8E0] border border-[#E8C860] px-2.5 py-1 rounded-full text-xs font-medium text-[#A08020]">
  💰 {gold}
</span>

// Doom
<span className="bg-[#F5F0E8] border border-[#C8B898] px-2.5 py-1 rounded-full text-xs font-medium text-[#706040]">
  💀 Lv.{doomLevel}
</span>

// Backpack
<span className="bg-[#F0FFF8] border border-kitchen-success-border px-2.5 py-1 rounded-full text-xs font-medium text-[#408060]">
  🎒 {inventoryCount}/{inventoryMax}
</span>
```

- [ ] **Step 5: Reskin control buttons**

Replace the control button styles (~lines 158-162):

```
Guide ❓: bg-kitchen-card border border-kitchen-gold-border-muted rounded-lg shadow-[0_1px_0_#D4B896] text-kitchen-text-secondary hover:bg-[#FFF3E0]
Language 🌐: same pattern
Reset: bg-[#FFF0F0] border border-kitchen-danger rounded-lg text-kitchen-danger-text
Debug/Editor: keep existing dark style (dev-only buttons)
```

- [ ] **Step 6: Verify header visually**

Run dev server. Header should show cream-to-warm gradient, gold border, pill-shaped resource badges, 🍳 icon before title.

- [ ] **Step 7: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: reskin header and page layout to kitchen theme"
```

---

## Task 4: Prize Wall — Chopping Board + Arrow Buttons (ResourceMatrix.jsx)

**Files:**
- Modify: `src/components/game/ResourceMatrix.jsx`

This is the biggest single change — the visual core of the game.

- [ ] **Step 1: Reskin grid container to chopping board**

Wrap the grid section (around the `<div>` at line ~412) in a chopping board container. Find the parent container that holds the column buttons + row/grid area and apply:

```
className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark border-[3px] border-kitchen-wood-border rounded-[14px] p-4 shadow-[0_4px_0_#C8A880,0_6px_12px_rgba(0,0,0,0.1)]"
```

Add a title row inside the board, above the column buttons:
```jsx
<div className="text-center mb-2 pb-2 border-b border-dashed border-kitchen-wood-border">
  <span className="text-sm font-bold text-kitchen-text-body">🎯 {t('奖品墙')}</span>
  {/* Show wall modifier tag if applicable */}
</div>
```

- [ ] **Step 2: Replace column selector buttons**

At lines ~361-368, replace column button styling:

```
Old active:   bg-blue-600 text-white hover:bg-blue-700 hover:scale-105
Old disabled: bg-gray-300 text-gray-500

New default:  bg-kitchen-card border-2 border-kitchen-gold-border-muted rounded-lg shadow-[0_2px_0_#D4B896] text-kitchen-text-secondary hover:bg-[#FFF3E0] cursor-pointer
New active (selected): bg-gradient-to-b from-[#FFF3E0] to-[#FFE8CC] border-2 border-kitchen-gold rounded-lg shadow-[0_2px_0_#D4952A,0_0_10px_rgba(232,168,48,0.25)] text-kitchen-gold-deep font-bold
New disabled: bg-[#F5F0E8] border-2 border-kitchen-gold-border-muted/50 text-kitchen-text-muted cursor-not-allowed opacity-60
```

Change button content from text to arrow icon: `⬇`

- [ ] **Step 3: Replace row selector buttons**

At lines ~393-400, same pattern as column buttons but with `➡` arrow and horizontal gradient:

```
New active: bg-gradient-to-r from-[#FFF3E0] to-[#FFE8CC] ...
```

- [ ] **Step 4: Reskin cell backgrounds by type**

At lines ~127-162, replace cell background classes:

```js
// empty
Old: bg-gray-100 border-gray-200
New: bg-[#F8F4EC] border-[#D4C8B0]

// doom_resolution
Old: bg-red-100 border-red-400
New: bg-[#FFF0EE] border-kitchen-danger

// doom_upgrade
Old: bg-amber-100 border-amber-400
New: bg-[#FFF8F0] border-[#E8B860]

// item/sticker
Old: bg-white border-gray-300
New: bg-kitchen-card border-kitchen-gold-border-muted

// gold
Old: bg-yellow-100 border-yellow-400
New: bg-[#FFFCE8] border-[#E8C860]

// order_cell
Old: bg-blue-50 border-blue-300
New: bg-[#F0F8FF] border-kitchen-info

// bomb
Old: bg-gray-800 border-gray-900
New: (keep as-is — bomb should look dark/dangerous)

// heal
Old: bg-pink-100 border-pink-400
New: bg-[#F0FFF8] border-kitchen-success

// backpack_expand
Old: bg-amber-100 border-amber-400
New: bg-[#FFF8E0] border-kitchen-gold

// gravity
Old: bg-sky-100 border-sky-400
New: bg-[#F0F8FF] border-kitchen-info

// entrance
Old: bg-teal-100 border-teal-400
New: bg-[#F0FFF8] border-kitchen-success-border
```

- [ ] **Step 5: Reskin cell highlight effects**

At lines ~164-187, replace highlight classes:

```js
// settled (drawn result)
Old: ring-3 ring-yellow-400 scale-110 z-20 shadow-lg shadow-yellow-200
New: ring-3 ring-kitchen-gold scale-110 z-20 shadow-lg shadow-[rgba(232,168,48,0.3)]

// scanning
Old: ring-2 ring-yellow-300
New: ring-2 ring-kitchen-gold/60

// scan-row (selected row/col highlight)
Old: ring-1 ring-blue-200
New: bg-[rgba(232,168,48,0.08)] border-kitchen-gold shadow-[0_0_8px_rgba(232,168,48,0.15)]

// hover inset ring color
Old: rgba(96,165,250,0.6)
New: rgba(232,168,48,0.5)
```

- [ ] **Step 6: Reskin the draw button**

Find the draw/action button below the grid and apply:

```
className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold rounded-[10px] shadow-[0_3px_0_#D4952A] text-kitchen-text-body font-bold px-7 py-2 hover:from-[#FFF3E0] hover:to-[#FFE8CC] active:shadow-[0_1px_0_#D4952A] active:translate-y-[2px]"
```

- [ ] **Step 7: Verify the prize wall visually**

Run dev server, start a game. The 5×5 grid should appear on a wooden board with arrow buttons for row/col selection. Selected row/col should glow gold. Different cell types should have distinct warm-toned backgrounds.

- [ ] **Step 8: Commit**

```bash
git add src/components/game/ResourceMatrix.jsx
git commit -m "feat: reskin prize wall as chopping board with arrow selectors"
```

---

## Task 5: Shelf / BulletinBoard — Cork Board Style

**Files:**
- Modify: `src/components/game/BulletinBoard.jsx`

- [ ] **Step 1: Reskin panel container**

At line ~64, change:

```
Old: className="bg-white rounded-lg shadow-sm border"
New: className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark rounded-xl border-2 border-kitchen-wood-border shadow-[0_3px_0_#C8A880]"
     style={{ backgroundImage: 'radial-gradient(circle, rgba(180,140,80,0.08) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
```

- [ ] **Step 2: Reskin header**

At line ~66:

```
Old: px-3 py-2 border-b border-gray-100
New: px-3 py-2 border-b border-dashed border-kitchen-wood-border

Title text:
Old: text-xs font-semibold uppercase tracking-wide text-gray-400
New: text-sm font-bold text-kitchen-text-body

Change label to: 📌 {t('货架')}
```

- [ ] **Step 3: Reskin SCORE_STYLE config**

At lines ~12-17, replace:

```js
const SCORE_STYLE = {
  1: { border: 'border-kitchen-success-border', bg: 'from-[#F0FFF8] to-kitchen-card', badge: 'bg-kitchen-success', label: '基础调料', labelColor: 'text-kitchen-success-border' },
  2: { border: 'border-kitchen-info-border',    bg: 'from-[#F0F8FF] to-kitchen-card', badge: 'bg-kitchen-info',    label: '普通食材', labelColor: 'text-kitchen-info-border' },
  3: { border: 'border-purple-400',             bg: 'from-purple-50 to-kitchen-card', badge: 'bg-purple-500',      label: '珍稀食材', labelColor: 'text-purple-400' },
  5: { border: 'border-kitchen-gold',           bg: 'from-[#FFF8E0] to-kitchen-card', badge: 'bg-kitchen-gold',    label: '厨具',     labelColor: 'text-kitchen-gold' },
};
```

- [ ] **Step 4: Reskin DIFFICULTY_STYLE**

At lines ~5-10:

```js
const DIFFICULTY_STYLE = {
  easy:    { bg: 'bg-[#F0FFF8]', text: 'text-[#408060]' },
  medium:  { bg: 'bg-[#F0F8FF]', text: 'text-kitchen-info-border' },
  hard:    { bg: 'bg-purple-50',  text: 'text-purple-700' },
  extreme: { bg: 'bg-[#FFF0F0]', text: 'text-kitchen-danger-text' },
};
```

- [ ] **Step 5: Reskin order card slots in the shelf**

At lines ~105-111, replace:

```
Old: border-gray-100 bg-gray-50/50
New: border-kitchen-gold-border-muted/50 bg-kitchen-card/80

Old (incoming + full): border-amber-400 bg-amber-50
New: border-kitchen-gold bg-[#FFF8E0]

Accept button:
Old: bg-blue-500 text-white hover:bg-blue-600
New: bg-kitchen-gold text-kitchen-text-title hover:bg-kitchen-gold-dark font-bold
```

- [ ] **Step 6: Add slight rotation to order cards**

Add to each order card slot a subtle rotation style to simulate "pinned to board":

```jsx
style={{ transform: `rotate(${index % 2 === 0 ? -1 : 0.5}deg)` }}
```

- [ ] **Step 7: Verify shelf visually**

Run dev server. Left sidebar should show cork-textured background with warm-toned order cards, some slightly rotated.

- [ ] **Step 8: Commit**

```bash
git add src/components/game/BulletinBoard.jsx
git commit -m "feat: reskin shelf as cork bulletin board"
```

---

## Task 6: Wall Picker — Menu Card Style

**Files:**
- Modify: `src/components/game/WallPicker.jsx`

- [ ] **Step 1: Reskin heading and container**

At lines ~51-53:

```
Title:
Old: text-base font-bold
New: text-base font-bold text-kitchen-text-title

Subtitle:
Old: text-[11px] text-gray-400
New: text-[11px] text-kitchen-text-secondary
```

- [ ] **Step 2: Reskin wall card buttons**

At lines ~62:

```
Old: w-52 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
     hover:border-blue-400 hover:shadow-lg
New: w-52 bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border-muted
     shadow-[0_2px_0_#D4B896] hover:border-kitchen-gold hover:shadow-[0_2px_0_#D4952A,0_0_12px_rgba(232,168,48,0.15)]
     hover:-translate-y-1 transition-all duration-150 text-left overflow-hidden
```

- [ ] **Step 3: Add wood-tone header area to each card**

Add a top section inside each card button:

```jsx
<div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark px-4 pt-3 pb-2 -mx-4 -mt-4 mb-3 border-b border-dashed border-kitchen-wood-border">
  <div className="text-sm font-bold text-kitchen-text-body">{icon} {name}</div>
</div>
```

And below it, the existing content (sticker types, doom count, etc.) with updated text colors:

```
Description: text-kitchen-text-secondary
Sticker icons container: border-kitchen-gold-border-muted bg-kitchen-card
Doom count: text-kitchen-danger-text
Special cells tag: bg-[#FFF3E0] text-kitchen-text-secondary border border-kitchen-gold-border
```

- [ ] **Step 4: Add selected state**

When a wall is selected (before confirming), add:

```
border-kitchen-gold shadow-[0_2px_0_#D4952A,0_0_12px_rgba(232,168,48,0.15)] -translate-y-1
```

- [ ] **Step 5: Verify wall picker visually**

Run dev server, advance to wall selection. Three cards should have wooden header areas, warm borders, gold highlight on hover/select.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/WallPicker.jsx
git commit -m "feat: reskin wall picker as menu cards"
```

---

## Task 7: ScoreBoard — Warm Panel

**Files:**
- Modify: `src/components/game/ScoreBoard.jsx`

- [ ] **Step 1: Reskin panel**

At line ~8:

```
Old: className="bg-white rounded-lg shadow-sm border"
New: className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]"
```

Header (line ~10):

```
Old: px-3 py-2 border-b border-gray-100
New: px-3 py-2 border-b border-dashed border-kitchen-gold-border/30

Title:
Old: text-xs font-semibold uppercase tracking-wide text-gray-400
New: text-sm font-bold text-kitchen-text-body

Round number:
Old: text-[10px] text-gray-300
New: text-[10px] text-kitchen-text-muted
```

- [ ] **Step 2: Reskin score rows and total**

Per-expedition score labels (line ~42):
```
Old: text-[11px] text-gray-400
New: text-[11px] text-kitchen-text-secondary
```

Score values (line ~43):
```
Old: text-xs font-bold text-gray-600
New: text-xs font-bold text-kitchen-text-body
```

Bonus score (line ~45):
```
Old: text-yellow-500
New: text-kitchen-gold
```

Total section border (line ~55):
```
Old: border-t border-gray-200
New: border-t border-kitchen-gold-border/30
```

Total label (line ~56):
```
Old: text-xs font-semibold text-gray-500
New: text-xs font-semibold text-kitchen-text-secondary
```

Total value victory check (line ~57):
```
Old: text-green-600 / text-gray-700
New: text-kitchen-success-border / text-kitchen-text-body
```

Victory threshold (line ~58):
```
Old: text-xs font-normal text-gray-400
New: text-xs font-normal text-kitchen-text-muted
```

Bonus items label (line ~19):
```
Old: text-[9px] text-gray-300
New: text-[9px] text-kitchen-text-muted
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/components/game/ScoreBoard.jsx
git commit -m "feat: reskin scoreboard to warm kitchen panel"
```

---

## Task 8: OrderCard — Warm Reskin

**Files:**
- Modify: `src/components/game/OrderCard.jsx`

- [ ] **Step 1: Reskin main card container**

At lines ~120-134, replace:

```
Base:
Old: bg-white rounded-2xl shadow-sm border-2
New: bg-kitchen-card rounded-2xl shadow-sm border-2

Score order:
Old: border-blue-300 bg-blue-50 ring-4 ring-blue-50
New: border-kitchen-info bg-[#F0F8FF] ring-4 ring-[#F0F8FF]

Emergency:
Old: border-red-400 bg-red-50 ring-4 ring-red-50
New: border-kitchen-danger bg-[#FFF0EE] ring-4 ring-[#FFF0EE]

Normal:
Old: border-slate-100 hover:border-slate-300
New: border-kitchen-gold-border-muted/50 hover:border-kitchen-gold-border

Satisfied:
Old: ring-4 ring-green-400 border-green-500 bg-green-50
New: ring-4 ring-kitchen-success border-kitchen-success-border bg-[#F0FFF8]

Being replaced:
Old: !ring-8 !ring-yellow-400 !border-yellow-500 !bg-yellow-100
New: !ring-8 !ring-kitchen-gold !border-kitchen-gold !bg-[#FFF8E0]
```

- [ ] **Step 2: Reskin reward badge**

At line ~198:

```
Satisfied:
Old: bg-blue-500 text-white
New: bg-kitchen-gold text-kitchen-text-title

Not satisfied:
Old: bg-blue-100 text-blue-700
New: bg-[#FFF3E0] text-kitchen-gold-deep
```

- [ ] **Step 3: Reskin replaced highlight**

At line ~151:

```
Old: bg-yellow-500 text-white
New: bg-kitchen-gold text-kitchen-text-title
```

Corner ping animations (lines ~156-159):

```
Old: yellow-400
New: kitchen-gold
```

- [ ] **Step 4: Reskin satisfied indicator**

At line ~492:

```
Old: bg-green-500 text-white
New: bg-kitchen-success text-white
```

- [ ] **Step 5: Reskin refresh button**

At lines ~474:

```
Old disabled: bg-slate-50 text-slate-300
New disabled: bg-[#F5F0E8] text-kitchen-text-muted

Old active: bg-orange-100 text-orange-500 hover:bg-orange-200
New active: bg-[#FFF3E0] text-kitchen-gold-deep hover:bg-[#FFE8CC]
```

- [ ] **Step 6: Verify and commit**

```bash
git add src/components/game/OrderCard.jsx
git commit -m "feat: reskin order cards to warm kitchen theme"
```

---

## Task 9: InventorySlot — Warm Reskin

**Files:**
- Modify: `src/components/game/InventorySlot.jsx`

- [ ] **Step 1: Reskin tool item styling**

At line ~116:

```
Old: border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
     ring-1 ring-amber-200/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]
New: border-kitchen-gold bg-gradient-to-br from-[#FFF8E0] via-[#FFF3E0] to-[#FFE8CC]
     ring-1 ring-kitchen-gold/30 shadow-[0_0_12px_rgba(232,168,48,0.3)]
```

- [ ] **Step 2: Reskin selection states**

At lines ~142-151:

```
Selected (not multiselect):
Old: ring-2 ring-blue-400
New: ring-2 ring-kitchen-gold

isTarget (pending):
Old: ring-2 ring-red-400 hover:bg-red-50
New: ring-2 ring-kitchen-danger hover:bg-[#FFF0EE]

isTarget (not pending):
Old: hover:border-blue-300
New: hover:border-kitchen-gold-border

canSynthesize:
Old: ring-4 ring-yellow-400
New: ring-4 ring-kitchen-gold

isSelected (submit):
Old: border-blue-600 bg-blue-50
New: border-kitchen-info-border bg-[#F0F8FF]

isSelected (recycle):
Old: border-amber-600 bg-amber-50
New: border-kitchen-gold-dark bg-[#FFF8E0]
```

- [ ] **Step 3: Reskin tool badge**

At line ~178:

```
Old: bg-amber-500 text-white
New: bg-kitchen-gold text-kitchen-text-title
```

- [ ] **Step 4: Reskin upgrade pair indicator**

At line ~204:

```
Old: bg-yellow-400 text-yellow-900
New: bg-kitchen-gold text-kitchen-text-title
```

- [ ] **Step 5: Verify and commit**

```bash
git add src/components/game/InventorySlot.jsx
git commit -m "feat: reskin inventory slots to warm kitchen theme"
```

---

## Task 10: PoolCard — Warm Reskin

**Files:**
- Modify: `src/components/game/PoolCard.jsx`

- [ ] **Step 1: Reskin card base**

At lines ~38-43. The card uses `pool.color` dynamically, so the main structural changes are:

```
Base button:
Old: shadow-sm hover:shadow-md
New: shadow-[0_2px_0_#D4B896] hover:shadow-[0_2px_0_#D4952A,0_4px_12px_rgba(0,0,0,0.1)]

Hovered state:
Old: ring-4 ring-white/50
New: ring-4 ring-kitchen-gold/30
```

- [ ] **Step 2: Reskin price pill**

At lines ~55-63:

```
Can afford:
Old: border-yellow-400
New: border-kitchen-gold

Coin icon:
Old: text-yellow-500
New: text-kitchen-gold

Can't afford:
Old: text-slate-400
New: text-kitchen-text-muted
```

- [ ] **Step 3: Reskin affix name badge**

At line ~70:

```
Old: text-slate-800 bg-white/60 border
New: text-kitchen-text-body bg-kitchen-card/60 border-kitchen-gold-border
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/components/game/PoolCard.jsx
git commit -m "feat: reskin pool cards to warm kitchen theme"
```

---

## Task 11: Final Visual Pass + CRT Integration

**Files:**
- Modify: `src/GameCore.jsx` (modal overlays, game-over screens)
- Modify: `src/components/game/ResourceMatrix.jsx` (CRT on draw)

- [ ] **Step 1: Add CRT effect on draw moment**

In ResourceMatrix.jsx, when a cell is in `settled` state (the drawn result display), add `crt-light vignette` classes to the grid container temporarily. This can be done by adding a state-driven class:

```jsx
// In the grid container div:
className={`... ${isSettling ? 'crt-light vignette' : ''}`}
```

Where `isSettling` is true during the settling animation period.

- [ ] **Step 2: Reskin modals in GameCore**

Find the modal overlay and content containers (~lines 585+):

```
Modal backdrop:
Old: bg-black/50 (or similar)
New: bg-black/40

Modal content:
Old: bg-white rounded-xl
New: bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_4px_0_#D4B896]

Modal titles:
Apply text-kitchen-text-title

Modal buttons:
Apply kitchen button styles from spec (§3.2)
```

- [ ] **Step 3: Reskin the start/between-expedition screen**

The "开始第 N 场" button (~line 198):

```
Old: bg-blue-500 text-white hover:bg-blue-600
New: bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body font-bold rounded-xl shadow-[0_3px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC]
```

- [ ] **Step 4: Verify full game flow visually**

Play through a complete game cycle:
1. Start screen → warm themed
2. Wall selection → menu cards
3. Prize wall → chopping board with arrow buttons
4. Draw → CRT flash on the grid
5. Shelf → cork board
6. Orders → warm cards
7. Inventory → warm slots
8. Evacuate → modal with warm styling
9. Score screen → warm panel

- [ ] **Step 5: Commit**

```bash
git add src/GameCore.jsx src/components/game/ResourceMatrix.jsx
git commit -m "feat: add CRT draw effect and reskin modals/screens"
```

---

## Task 12: Doom Trigger CRT Heavy Effect

**Files:**
- Modify: `src/components/game/ResourceMatrix.jsx` or `src/GameCore.jsx` (wherever doom resolution animation is triggered)

- [ ] **Step 1: Add doom CRT effect**

When doom resolution triggers (💀 cell drawn), apply `crt-heavy vignette-heavy animate-signal-shake` to the game area for ~1 second. This can be done with a temporary state:

```jsx
// In parent component or ResourceMatrix:
const [doomFlash, setDoomFlash] = useState(false);

// When doom triggers:
setDoomFlash(true);
setTimeout(() => setDoomFlash(false), 1000);

// On the container:
className={`... ${doomFlash ? 'crt-heavy vignette-heavy animate-signal-shake' : ''}`}
```

- [ ] **Step 2: Add VHS timestamp during evacuation**

In the evacuation modal/screen in GameCore.jsx, add a VHS-style timestamp:

```jsx
<div className="absolute bottom-2 right-3 font-mono text-[10px] text-kitchen-gold/40">
  REC ● {new Date().toLocaleTimeString()}
</div>
```

- [ ] **Step 3: Verify doom and evacuation effects**

Trigger a doom resolution — screen should darken with red scanlines and shake briefly. Evacuate — modal should show VHS timestamp in corner.

- [ ] **Step 4: Commit**

```bash
git add src/GameCore.jsx src/components/game/ResourceMatrix.jsx
git commit -m "feat: add doom CRT heavy effect and evacuation VHS timestamp"
```
