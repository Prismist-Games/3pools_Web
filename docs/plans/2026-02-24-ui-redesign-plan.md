# UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all UI from cold slate aesthetic to warm "Corporate Gacha" theme (Nintendo eShop + enterprise SaaS + gacha machine company).

**Architecture:** Purely visual changes — CSS variables, Tailwind classes, font loading, and layout spacing adjustments. No game logic changes. Work bottom-up from foundations (CSS vars, fonts, config) to components, then layout.

**Tech Stack:** React 18, Tailwind CSS 3, Vite 6, Google Fonts (DM Sans, JetBrains Mono)

**Design doc:** `docs/plans/2026-02-24-ui-redesign-design.md`

**CRITICAL RULE — Preserved Semantics:**
- Rarity color ORDER: common(gray) > uncommon(green) > rare(blue) > epic(purple) > legendary(orange) > mythic(red/rose)
- Order capsule states: dashed=empty, solid=filled, grayscale=wrong quality, full color=matched
- Ring colors: yellow=synthesis, cyan=tool, amber=recycle, red=replace
- Overlay semantics: yellow=upgrade, red=recycle
- All functional interaction areas preserved (affix selection, order candidates, etc.)

**No test suite exists.** Verify each task by running `npm run dev` and visually inspecting.

---

### Task 1: Foundation — Fonts & CSS Variables

**Files:**
- Modify: `index.html` (add Google Fonts links)
- Modify: `src/index.css` (add CSS custom properties, font-family overrides)
- Modify: `tailwind.config.js` (extend theme with custom fonts and colors)

**Step 1: Add Google Fonts to index.html**

Add to `<head>` before `</head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

Also update `<title>` from "Vite + React Game" to "三池物语".

**Step 2: Add CSS custom properties to index.css**

Add `:root` block before `@tailwind` directives with all design tokens:
```css
:root {
  --bg-base: #FBF8F3;
  --bg-card: #FFFFFF;
  --bg-section: #F5F2ED;
  --text-primary: #2D2A26;
  --text-secondary: #8A8580;
  --text-muted: #B5B0AA;
  --border: #E8E4DF;
  --accent-red: #E60012;
  --accent-gold: #D4940A;
  --accent-green: #34A853;
  --shadow-warm: 0 2px 8px rgba(45,42,38,0.08);
  --shadow-warm-lg: 0 4px 16px rgba(45,42,38,0.12);
}
```

**Step 3: Extend tailwind.config.js**

Add font families and extend colors:
```js
theme: {
  extend: {
    fontFamily: {
      sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
    colors: {
      cream: { 50: '#FBF8F3', 100: '#F5F2ED', 200: '#E8E4DF' },
      warm: { 700: '#2D2A26', 500: '#8A8580', 300: '#B5B0AA' },
    },
    screens: { '3xl': '1920px' },
    boxShadow: {
      'warm': '0 2px 8px rgba(45,42,38,0.08)',
      'warm-lg': '0 4px 16px rgba(45,42,38,0.12)',
      'warm-xl': '0 8px 24px rgba(45,42,38,0.15)',
    },
  },
}
```

**Step 4: Verify** — `npm run dev`, confirm fonts load, page renders without errors.

**Step 5: Commit** — `git commit -m "feat(ui): add design system foundations — fonts, CSS vars, Tailwind theme"`

---

### Task 2: Rarity Config — Update Color Classes

**Files:**
- Modify: `src/data/constants.js` (INITIAL_RARITY_CONFIG color/dotColor/starColor/shadow values)

**Step 1: Update rarity color classes**

Change `slate` → `stone`, `green` → `emerald`, `blue` → `sky`, `purple` → `violet`, keep `amber` and `rose`:

| Rarity | color | dotColor | starColor | shadow |
|--------|-------|----------|-----------|--------|
| common | `border-stone-300 bg-stone-50 text-stone-500` | `bg-stone-400` | `text-stone-400` | `` |
| uncommon | `border-emerald-400 bg-emerald-50 text-emerald-700` | `bg-emerald-500` | `text-emerald-500` | `shadow-emerald-200` |
| rare | `border-sky-400 bg-sky-50 text-sky-700` | `bg-sky-500` | `text-sky-500` | `shadow-sky-200` |
| epic | `border-violet-400 bg-violet-50 text-violet-700` | `bg-violet-500` | `text-violet-500` | `shadow-violet-200` |
| legendary | `border-amber-400 bg-amber-50 text-amber-700` | `bg-amber-500` | `text-amber-500` | `shadow-amber-200` |
| mythic | `border-rose-500 bg-rose-50 text-rose-700` | `bg-rose-500` | `text-rose-600` | `shadow-rose-200` |

**Step 2: Verify** — Start game, draw items, confirm all 6 rarity colors display correctly in inventory and order capsules. Verify capsule matching states still work.

**Step 3: Commit** — `git commit -m "feat(ui): update rarity colors to warm palette (stone/emerald/sky/violet/amber/rose)"`

---

### Task 3: Pool Config — Update Pool Color Classes

**Files:**
- Modify: `src/data/constants.js` (INITIAL_POOLS_DATA color fields)

**Step 1: Update pool color classes**

Map each pool to its theme. The pools use format `bg-{color}-100 text-{color}-800 border-{color}-200`. Shift to warmer tones and ensure distinguishability. Keep each pool's hue recognizable but warmer:

- `fruit`: `bg-emerald-100 text-emerald-800 border-emerald-200` (was green)
- `medicine`: `bg-rose-100 text-rose-800 border-rose-200` (was red)
- `stationery`: `bg-amber-100 text-amber-800 border-amber-200` (was yellow)
- `kitchenware`: `bg-orange-100 text-orange-800 border-orange-200` (keep orange)
- `electronics`: `bg-sky-100 text-sky-800 border-sky-200` (was blue)

**Step 2: Verify** — Pool cards display with updated colors, hover states work.

**Step 3: Commit** — `git commit -m "feat(ui): update pool colors to warm palette"`

---

### Task 4: GameCore Layout — Header Redesign

**Files:**
- Modify: `src/GameCore.jsx` (lines ~252-331, header section)

**Step 1: Redesign header**

Replace the current header with a compact 56px bar:

Key changes:
- `bg-slate-900` → `bg-[#2D2A26]` (warm dark)
- `px-6 py-4` → `px-5 py-2` (compact)
- Remove gradient logo → simple red circle with icon
- Title: Remove `bg-clip-text text-transparent bg-gradient-to-r` → clean `text-white font-bold`
- Stats: Use `rounded-full bg-white/10 px-3 py-1` pill badges
- Score/gold numbers: Add `font-mono` class
- Remove the `bg-slate-800/50 rounded-2xl` stat container → inline pills
- Actions container: `bg-slate-800/80` → `bg-white/5`
- All `border-slate-700` → `border-white/10`
- All `text-slate-400` → `text-white/40`
- All `hover:bg-slate-700` → `hover:bg-white/10`

**Step 2: Verify** — Header is visually compact (~56px), warm dark background, stats readable, all buttons functional.

**Step 3: Commit** — `git commit -m "feat(ui): redesign header — compact warm dark bar with pill stats"`

---

### Task 5: GameCore Layout — Page Container & Section Styling

**Files:**
- Modify: `src/GameCore.jsx` (outer container, all section wrappers)

**Step 1: Update page-level container**

- `bg-slate-50` → `bg-cream-50` (or `bg-[#FBF8F3]`)
- `text-slate-800` → `text-[#2D2A26]`
- `selection:bg-blue-100` → `selection:bg-amber-100`
- `bg-white border-x border-slate-200` → `bg-[#FBF8F3] border-x border-cream-200`

**Step 2: Update pool section wrapper**

- `border-b border-slate-200 bg-white` → `border-b border-cream-200 bg-[#FBF8F3]`
- Pool grid: keep `grid grid-cols-3 gap-4`

**Step 3: Add section dividers**

Before orders section and before inventory section, add divider elements:
```jsx
<div className="flex items-center gap-3 px-6 py-1.5">
  <div className="h-px flex-1 bg-cream-200"></div>
  <span className="text-[10px] font-bold text-warm-300 uppercase tracking-[0.2em]">订单</span>
  <div className="h-px flex-1 bg-cream-200"></div>
</div>
```

**Step 4: Update orders section**

- `px-6 py-4` → `px-6 py-3` (tighter)
- Remove `shrink-0` only if vertical space is tight

**Step 5: Update emergency section**

- `bg-orange-50/30 border-slate-200` → `bg-orange-50/20 border-cream-200`

**Step 6: Update inventory section**

- `border-t-2 border-slate-200 bg-white/95` → `border-t border-cream-200 bg-white/95`
- `shadow-[0_-4px_15px_rgba(0,0,0,0.05)]` → `shadow-[0_-4px_15px_rgba(45,42,38,0.05)]`
- Mode backgrounds: `bg-red-50/95` → `bg-rose-50/95`, `bg-blue-50/95` → `bg-sky-50/95`, keep amber and purple

**Step 7: Update skills/status bar**

- All `text-slate-*` references → corresponding `text-warm-*` or `text-stone-*`
- `bg-slate-100` skill empty → `bg-stone-100`
- `border-slate-200` → `border-stone-200`
- Status mode labels: `text-blue-500` → `text-sky-500`, etc.

**Step 8: Verify** — Full page has cream background, warm dividers, sections clearly separated. All functional areas still work.

**Step 9: Commit** — `git commit -m "feat(ui): update page container, sections, and dividers to warm theme"`

---

### Task 6: PoolCard Component Redesign

**Files:**
- Modify: `src/components/game/PoolCard.jsx`

**Step 1: Update card container**

- Replace all `slate-*` references with `stone-*` equivalents
- Update shadow to `shadow-warm` on base, `shadow-warm-lg` on hover
- Hover effect: replace `scale-[1.02]` with `hover:-translate-y-0.5 hover:shadow-warm-lg`
- Disabled: `grayscale-[0.8]` → `grayscale-[0.3] opacity-50`
- `ring-4 ring-white/50` on hover → `ring-2 ring-white/60`

**Step 2: Update content styling**

- Price badge: keep white bg, ensure text is `text-[#E60012]` (accent red) for the price number
- Affix name: `text-slate-800 bg-white/60` → `text-stone-700 bg-white/70`
- Affix description: `text-slate-700` → `text-stone-600`
- All `opacity-90` → `opacity-80` for subtler secondary text

**Step 3: Verify** — Pool cards have warm feel, hover lift works, disabled state is softer. Draw action still functional.

**Step 4: Commit** — `git commit -m "feat(ui): restyle PoolCard with warm shadows and softer states"`

---

### Task 7: OrderCard Component — Warm Palette Swap

**Files:**
- Modify: `src/components/game/OrderCard.jsx`

**CRITICAL: Preserve ALL capsule visual semantics. Only change base color references.**

**Step 1: Add left accent bar**

Add a `before:` pseudo-element or a literal div for the left colored stripe:
- Add `overflow-hidden relative` to card container
- Add a 4px left bar via: `before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-xl`
- Score order: `before:bg-sky-500`
- Emergency: `before:bg-rose-500`
- Regular: `before:bg-stone-300`

**Step 2: Update card container colors**

- `border-slate-100` → `border-cream-200`
- `hover:border-slate-300` → `hover:border-stone-300`
- Score order: `border-blue-300 bg-blue-50` → `border-sky-300 bg-sky-50`
- Emergency: `border-red-400 bg-red-50` → `border-rose-400 bg-rose-50`
- Satisfied: `ring-green-400 border-green-500 bg-green-50` → `ring-emerald-400 border-emerald-500 bg-emerald-50`
- Being replaced: `ring-yellow-400 border-yellow-500 bg-yellow-100` → keep yellow (it's a semantic action color)

**Step 3: Update non-capsule text/icon colors**

- All `text-slate-*` → `text-stone-*`
- `bg-slate-*` → `bg-stone-*`
- Reward badge: `bg-blue-500` → `bg-sky-500`, `bg-blue-100 text-blue-700` → `bg-sky-100 text-sky-700`

**Step 4: Update refresh button**

- `bg-slate-50 text-slate-300` → `bg-stone-50 text-stone-300`
- `border-slate-100` → `border-stone-100`

**Step 5: Update capsule base colors (NON-RARITY ONLY)**

These are the default/unfilled state colors — rarity colors come from config (already updated in Task 2):
- Capsule unfilled border: `border-slate-300` → `border-stone-300`
- Capsule unfilled bg: `bg-slate-50` → `bg-stone-50`
- Unfilled text: `text-slate-400` → `text-stone-400`
- Partially met text: `text-slate-500` → `text-stone-500`
- Score order capsule border: `border-blue-300` → `border-sky-300`

**Step 6: Update slot mode ring/shadow references**

Only update non-semantic slate references. Keep ALL ring colors (yellow, cyan, amber, red) as-is:
- `shadow-cyan-200/50` → keep (semantic)
- `shadow-amber-200/50` → keep (semantic)
- `shadow-red-200/50` → keep (semantic)

**Step 7: Update overlays and badges**

- Synthesis overlay: keep `bg-yellow-400/80` (semantic)
- Recycle overlay: keep `bg-red-500/60` (semantic)
- Check badges: `bg-blue-500` → `bg-sky-500` (submit check), keep `bg-green-500` → `bg-emerald-500` (quality check)
- Sterile badge: keep `bg-gray-800/80` → `bg-stone-800/80`
- Decay badge: `bg-slate-200 text-slate-600` → `bg-stone-200 text-stone-600`
- Phantom badge: `bg-slate-400` → `bg-stone-400`

**Step 8: Update stage colors**

- Keep yellow/orange/red/rose stage progression (these are semantic)
- `stageColors` object: no changes needed (already uses warm hues)

**Step 9: Update highlight states**

- `ring-slate-200 border-slate-400` → `ring-stone-200 border-stone-400`

**Step 10: Verify** — Play through several orders. Confirm:
- Capsules show correct dashed/solid states
- Quality dots display correctly
- Matching/unmatching visual distinction works
- Synthesis overlay appears on hover
- Recycle overlay shows coin values
- Refresh button works
- Submit mode highlights correctly

**Step 11: Commit** — `git commit -m "feat(ui): restyle OrderCard with warm palette and left accent bar"`

---

### Task 8: InventorySlot Component — Warm Palette

**Files:**
- Modify: `src/components/game/InventorySlot.jsx`

**Step 1: Update base slot colors**

- Empty: `bg-slate-50 border-dashed border-slate-200` → `bg-stone-50/50 border-dashed border-stone-200`
- Selected: `ring-2 ring-blue-400` → `ring-2 ring-sky-400`
- Target hover: `hover:border-blue-300` → `hover:border-sky-300`
- Assigned opacity: keep `!opacity-30 !grayscale`

**Step 2: Update text/label colors**

- Item name: `text-slate-*` → `text-stone-*`
- Tool label: keep amber styling
- All `bg-slate-*` → `bg-stone-*`

**Step 3: Update submit/recycle mode colors**

- Submit selected: `border-blue-600 bg-blue-50` → `border-sky-600 bg-sky-50`
- Recycle selected: keep `border-amber-600 bg-amber-50`

**Step 4: Update tooltip colors**

- `bg-slate-900` → `bg-[#2D2A26]`
- `border-amber-400/30` → keep
- `border-t-slate-900` (arrow) → `border-t-[#2D2A26]`

**Step 5: Verify** — Inventory slots display with warm colors, tool items glow correctly, all selection modes work, tooltips appear properly.

**Step 6: Commit** — `git commit -m "feat(ui): restyle InventorySlot with warm palette"`

---

### Task 9: SkillSelectionModal — Warm Palette

**Files:**
- Modify: `src/components/game/SkillSelectionModal.jsx`

**Step 1: Update text/container colors**

- All `text-slate-*` → `text-stone-*`
- `bg-slate-700`, `bg-slate-800` containers → `bg-[#2D2A26]/80`, `bg-[#2D2A26]/50`
- `border-slate-*` → `border-stone-*`
- Card: `bg-white rounded-2xl` — keep white, ensure shadow uses warm tone
- Replace action button: keep green gradient
- Abandon button: `border-slate-500 text-slate-300 hover:bg-slate-700` → `border-stone-500 text-stone-300 hover:bg-stone-700`

**Step 2: Verify** — Trigger skill selection (via debug or stage transition). Cards display properly, replace mode works.

**Step 3: Commit** — `git commit -m "feat(ui): restyle SkillSelectionModal with warm palette"`

---

### Task 10: Small Components — ConfirmDialog, Toast, Leaderboard, ErrorBoundary

**Files:**
- Modify: `src/components/ui/ConfirmDialog.jsx`
- Modify: `src/components/ui/Toast.jsx`
- Modify: `src/components/game/Leaderboard.jsx`
- Modify: `src/components/ErrorBoundary.jsx`

**Step 1: ConfirmDialog**

- `text-slate-800` → `text-[#2D2A26]`
- `text-slate-600` → `text-stone-600`
- `text-slate-500 hover:bg-slate-100` → `text-stone-500 hover:bg-stone-100`
- Shadow: ensure warm tone

**Step 2: Toast**

- `bg-slate-800` → `bg-[#2D2A26]`
- Keep `bg-red-500` for error type

**Step 3: Leaderboard**

- All `text-slate-*` → `text-stone-*`
- `bg-slate-*` → `bg-stone-*`
- `border-slate-*` → `border-stone-*`
- `divide-slate-100` → `divide-stone-100`
- `hover:bg-slate-50` → `hover:bg-stone-50`

**Step 4: ErrorBoundary**

- Update any `slate-*` references to `stone-*`

**Step 5: Verify** — Trigger toast (draw something), open leaderboard (game over), trigger confirm dialog (reset). All render with warm palette.

**Step 6: Commit** — `git commit -m "feat(ui): restyle ConfirmDialog, Toast, Leaderboard with warm palette"`

---

### Task 11: GameCore Middle Area — Selection UI & Interaction Zone

**Files:**
- Modify: `src/GameCore.jsx` (lines ~571-669, selection/candidate area)

**Step 1: Update selection overlay colors**

- `text-slate-800` → `text-[#2D2A26]`
- Precise selection cards: rarity colors come from config (already updated). Only update non-rarity refs.
- `bg-white` for targeted cards → keep white
- `border-slate-*` → `border-stone-*`

**Step 2: Update order candidates area**

- `bg-blue-500 text-white` icon circle → `bg-sky-500 text-white`
- `text-slate-800` → `text-[#2D2A26]`
- `text-slate-600` → `text-stone-600`

**Step 3: Verify** — Test precise affix (二选一), targeted affix, and order refresh candidate selection. All display correctly.

**Step 4: Commit** — `git commit -m "feat(ui): restyle selection UI and interaction zone"`

---

### Task 12: App.jsx Settings Modal — Warm Palette

**Files:**
- Modify: `src/App.jsx` (settings modal, lines ~183-1400)

**Step 1: Global slate→stone swap in settings modal**

This is a large file with many `slate-*` references. Systematically replace:
- `bg-slate-*` → `bg-stone-*`
- `text-slate-*` → `text-stone-*`
- `border-slate-*` → `border-stone-*`
- `hover:bg-slate-*` → `hover:bg-stone-*`
- `divide-slate-*` → `divide-stone-*`
- `ring-slate-*` → `ring-stone-*`
- `from-slate-*` → `from-stone-*`

Also update:
- `bg-blue-*` → `bg-sky-*` (for non-semantic blue)
- `text-blue-*` → `text-sky-*`
- Section borders: `border-l-4 border-red-500` → keep (semantic danger)
- Backdrop: `bg-black/70` → keep

**Step 2: Verify** — Open settings modal, check all sections render with warm colors. Toggle settings, verify functionality.

**Step 3: Commit** — `git commit -m "feat(ui): restyle settings modal with warm palette"`

---

### Task 13: Final Polish — Spacing, Shadows, Consistency Pass

**Files:**
- Review all modified files for remaining cold-color references

**Step 1: Search for remaining `slate` references**

Run `grep -r "slate" src/` and replace any missed references.

**Step 2: Search for remaining cold shadows**

Replace any `rgba(0,0,0,...)` shadows with `rgba(45,42,38,...)` warm equivalents.

**Step 3: Verify overall consistency**

- Play a full game cycle: draw from pools → manage inventory → submit orders → handle emergency
- Confirm all transitions are smooth
- Check that no jarring cold-color elements remain
- Verify header is compact and functional
- Confirm section dividers display properly

**Step 4: Commit** — `git commit -m "feat(ui): final polish — consistency pass and remaining warm color fixes"`

---

## Task Dependency Order

```
Task 1 (foundations)
  → Task 2 (rarity config) + Task 3 (pool config)  [parallel]
    → Task 4 (header) + Task 5 (page/sections) + Task 6 (PoolCard)  [parallel]
      → Task 7 (OrderCard) + Task 8 (InventorySlot)  [parallel]
        → Task 9 (SkillModal) + Task 10 (small components) + Task 11 (selection UI) + Task 12 (settings)  [parallel]
          → Task 13 (final polish)
```

Tasks within the same level can be executed in parallel. Each task is independently committable.
