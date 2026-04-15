# Unified Card Dock & Layout Redesign

> 2026-04-14

## Goal

Unify all "sticker-holding passive-match" cards (danger, profit/voucher, evacuation, future skill cards) into one consistent component, display them in a fixed bottom dock, and rearrange the full game UI to fit on one screen (~1440x900 recommended, 1280x720 minimum) without dynamic resizing.

---

## 1. Unified Card Component: `PassiveCard`

All cards that check "does the player hold these stickers?" share a single component with two visual states.

### Card Types

| Type | Icon | Color Accent | Requirements | Status when unmet |
|------|------|-------------|-------------|-------------------|
| Danger ⚠️ | ⚠️ | Red (border-red-400) | Specific sticker types ×1 each | ✗ -1 ❤️ |
| Profit 💎 | 💎 | Blue (border-blue-400) | Specific sticker types ×N each | ✗ (no penalty) |
| Evacuation 🚪 | 🚪 | Amber (border-amber-400) | Total sticker count ≥ threshold | ✗ (cannot evacuate) |
| Skill (future) | ⚡ | Purple (border-purple-400) | Specific sticker types | ✗ (skill inactive) |

### Collapsed State (default in dock)

Height: ~40px. Horizontal layout:

```
┌─[color border]──────────────────────────────┐
│ [type icon]  [req icons w/ satisfaction]  [status badge] │
└─────────────────────────────────────────────┘
```

- **Left border**: 3px solid, color by card type
- **Type icon**: single emoji, 16px area
- **Requirement icons**: each sticker type shown as a 24×24 rounded square
  - Satisfied: `border-emerald-400 bg-emerald-50`, icon full opacity
  - Not satisfied: `border-dashed border-gray-300 bg-white/50`, icon 40% opacity
  - Count > 1: small "×N" badge at bottom-right
- **Evacuation special case**: progress bar instead of per-type icons (`inventoryStickerCount / threshold`)
- **Status badge** (right-aligned):
  - All satisfied: green pill `bg-emerald-100 text-emerald-700` showing `✓`
  - Not satisfied: type-colored pill showing `✗` + penalty (e.g., `-1 ❤️` for danger)
- **Whole-card color**:
  - Not satisfied: `bg-white border-gray-200`
  - All satisfied: `bg-green-50 border-green-300` with green left border

Clicking a collapsed card opens its expanded popover.

### Expanded State (popover above the card)

A popover floats above the clicked card. Fixed width ~200px. Contains type-specific details:

- **Danger ⚠️**: "回合结束时自动检查。未满足 → -1 ❤️"
- **Profit 💎**: Reward items list ("撤离获得: [item cards]"), remove button
- **Evacuation 🚪**: Evacuate button (enabled only when satisfied), sticker count display
- **Skill (future)**: Effect description, activation conditions

Popover behavior:
- One popover open at a time
- Click same card → close
- Click different card → switch
- Click outside dock → close

---

## 2. Card Dock

A fixed-height bar at the bottom of the game screen.

### Layout

```
┌──────────────────────────────────────────────────┐
│  [⚠️ danger cards] │ [💎 profit cards] │ [🚪 evac] │  ~48px
└──────────────────────────────────────────────────┘
```

### Ordering

Fixed left-to-right priority (not by acquisition time):
1. ⚠️ Danger cards (most urgent)
2. 💎 Profit cards (core loop)
3. ⚡ Skill cards (future)
4. 🚪 Evacuation (persistent)

Within a type, cards appear in order of creation.

### Empty State

If a type has zero cards, it takes no space. If the dock has zero cards total, show a single-line hint: "暂无卡牌".

### Overflow

Cards wrap to a second row if they exceed the dock width. No horizontal scrolling.

---

## 3. Overall Layout

Recommended: 1440×900. Minimum: 1280×720. No dynamic collapsing/accordion. Smaller windows scroll.

### Structure

```
┌──────────────────────────────────────────────────┐
│  Header: single-row resource bar                  │  ~40px
├────────────────────────────┬─────────────────────┤
│                            │                     │
│    Main Action Area        │    Inventory         │
│                            │                     │  ~520px
│                            │                     │
├────────────────────────────┴─────────────────────┤
│  Card Dock                                        │  ~48px (+ popover above)
└──────────────────────────────────────────────────┘
```

Total: ~40 + ~520 + ~48 + gaps = ~640px usable, fits in 720px viewport.

### Header (single row, ~40px)

Merge current 3-row header into one row:

```
[幸运之墙]  [场次 1/3] [回合 2]  ───spacer───  [⚡10/10] [🌡️15] [❤️5]  [结束回合] [🔄] [EN] [重置] [🛠]
```

- Title + meta badges left
- Resource gauges right
- "结束回合" button promoted to header (it's a turn-level action)
- Evacuation bar removed from header (moved to dock)

### Main Action Area (left, flex-1)

**pool_selection phase:**
- Wall shop: 5 pool cards in a horizontal row (existing `PoolCardUI`)
- Voucher shop: 2 displayed profit cards (existing shop cards, keep current rendering — these are shop items, not held cards)
- Danger wall entries (old system): shown below wall shop as compact entry buttons

**drawing phase:**
- 4×4 draw grid (existing `ResourceMatrix`)
- Wall info + exit button above or beside the grid
- Draw result feedback below grid

### Inventory (right, fixed width ~280px)

Simplified from current right sidebar. Contains only:
- Sticker summary (compact icon+count row)
- Item-by-tier summary
- Backpack grid (5 columns)
- Recycle controls
- Pending items queue

Danger cards removed from here (moved to dock).

---

## 4. Changes from Current Code

### Files to modify

| File | Change |
|------|--------|
| `src/GameCore.jsx` | Remove `renderDangerCards()`, `renderProfitCardsPassive()`, `renderEvacuationBar()`. Replace with `<CardDock>`. Restructure layout to 3-row (header/main+inv/dock). Merge header to single row. Move "end turn" to header. |
| `src/components/game/PassiveCard.jsx` | **New file.** Unified card component with collapsed/expanded states. |
| `src/components/game/CardDock.jsx` | **New file.** Bottom dock container: sorts cards by type, renders `PassiveCard` instances, manages popover state. |

### Render functions removed from GameCore

- `renderDangerCards()` → replaced by PassiveCard type="danger" in CardDock
- `renderProfitCardsPassive()` → replaced by PassiveCard type="profit" in CardDock (also remove debug `console.log` on line 898)
- `renderEvacuationBar()` → replaced by PassiveCard type="evacuation" in CardDock

### Props flow

```
GameCore
  ├── Header (inline, resources + controls)
  ├── MainArea (wall shop / grid)
  ├── Inventory (right panel)
  └── CardDock
        ├── props: { dangerCards, profitCards, canEvacuate, inventory,
        │            inventoryStickerCount, evacuationStickerThreshold,
        │            evacuate, removeSlotCard, t }
        └── renders: PassiveCard × N
              └── props: { card, type, inventory, onRemove, onEvacuate, t }
```

### What stays unchanged

- `PoolCardUI` (wall shop cards) — untouched
- Shop profit card display (the 2 cards in voucher shop) — untouched, these are shop items not held cards
- `ResourceMatrix` — untouched
- `useGameLogic` — untouched (no logic changes, only UI restructuring)
- `slotCards.js` — untouched
- Debug modal — untouched

---

## 5. Not In Scope

- Hover cross-highlighting between inventory stickers and dock card icons (future enhancement)
- Skill card implementation (card type defined but no game logic yet)
- Any changes to game logic, state management, or card satisfaction computation
- Responsive/mobile layout
