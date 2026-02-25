# UI Redesign: Gacha Corp Operating System

## Aesthetic Direction

"Corporate Gacha" — A gacha machine company's internal operations system, gamified by Nintendo's designers. Warm ivory base, rounded card UI, corporate information architecture with playful game accents.

**References**: Nintendo eShop card layout, corporate SaaS dashboards, gacha machine toy aesthetics.

## Color System

### Base Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#FBF8F3` | Page background (cream white) |
| `--bg-card` | `#FFFFFF` | Card surfaces |
| `--bg-section` | `#F5F2ED` | Section divider bars |
| `--text-primary` | `#2D2A26` | Primary text (warm dark) |
| `--text-secondary` | `#8A8580` | Secondary text |
| `--text-muted` | `#B5B0AA` | Placeholder/disabled text |
| `--border` | `#E8E4DF` | Card borders, dividers |
| `--accent-red` | `#E60012` | Primary CTA, Nintendo red |
| `--accent-gold` | `#D4940A` | Currency, gold displays |
| `--accent-green` | `#34A853` | Success, order fulfilled |
| `--shadow-warm` | `rgba(45,42,38,0.08)` | All box-shadows |

### Pool Theme Colors (soft, distinguishable)

| Pool | Primary | Background | Border |
|------|---------|------------|--------|
| Pool A | `#7C6CCC` lavender | `#F3F0FF` | `#D8D0F8` |
| Pool B | `#2BA88C` mint | `#EDFBF6` | `#C0EDDF` |
| Pool C | `#E8804A` peach | `#FFF4ED` | `#F5D4BD` |

### Rarity Colors (semantic order preserved: white > green > blue > purple > orange > red)

Adjusted for warmth on ivory background. Same hue families, tuned saturation/lightness:

| Rarity | ID | Border | Background | Text | Dot |
|--------|----|--------|------------|------|-----|
| Common | `common` | `border-stone-300` | `bg-stone-50` | `text-stone-500` | `bg-stone-400` |
| Uncommon | `uncommon` | `border-emerald-400` | `bg-emerald-50` | `text-emerald-700` | `bg-emerald-500` |
| Rare | `rare` | `border-sky-400` | `bg-sky-50` | `text-sky-700` | `bg-sky-500` |
| Epic | `epic` | `border-violet-400` | `bg-violet-50` | `text-violet-700` | `bg-violet-500` |
| Legendary | `legendary` | `border-amber-400` | `bg-amber-50` | `text-amber-700` | `bg-amber-500` |
| Mythic | `mythic` | `border-rose-500` | `bg-rose-50` | `text-rose-700` | `bg-rose-500` |

Key change: `slate` → `stone` (warmer gray), `green` → `emerald`, `blue` → `sky`, `purple` → `violet`, `orange` → `amber`. Same semantic meaning, warmer tone.

## Typography

- **Headings/buttons**: `"DM Sans"`, weight 700/800
- **Data numbers** (score, gold, prices): `"JetBrains Mono"`, monospace
- **Chinese body text**: `system-ui` (OS default for best CJK rendering)
- **Tiny labels**: `"DM Sans"` uppercase tracking-wider

Load via Google Fonts CDN in index.html.

## Layout (Vertical, Optimized)

Keep vertical stacking but compress header, tighten spacing, add section labels.

```
┌──────────────────────────────────────────────────┐
│ ● 三池物语    ⭐ 98  💰 234  ⚡3    ⚙ 🌐 🔄  │ 48px header
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ Pool cards:
│ │ 🎱 神秘池 │ │ 🎰 幸运池 │ │ 🎪 狂野池 │          │ - Larger, prominent
│ │  ¥15     │ │  ¥20     │ │  ¥25     │          │ - Individual theme bg
│ │ ✨精准   │ │ ✨交易   │ │ ✨连锁   │          │ - Affix as pill tag
│ └──────────┘ └──────────┘ └──────────┘          │
│                                                  │
│ ─── 紧急订单 ─────────────────── (conditional) │ Emergency section
│                                                  │
│ ─── 订单 ───────────────────────────────────── │ Section label
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ Order cards:
│ │▎req req  │ │▎req req  │ │▎req      │          │ - White card + left accent
│ │▎   ⭐+50 │ │▎   ⭐+30 │ │▎   ⭐+80 │          │ - Capsule requirements
│ └──────────┘ └──────────┘ └──────────┘          │
│                                                  │
│ [interaction area: compact, collapses when idle] │ Affix interaction zone
│                                                  │
│ ─── 仓库 ───────────────────────────────────── │ Section label
│ [🔮][⚗️][💎][🎭][ ][ ][ ][ ][ ][ ]             │ Inventory grid
│                                                  │
│ [skill1] [skill2] [skill3]  rarity info          │ Skills + status bar
└──────────────────────────────────────────────────┘
```

### Layout Changes

1. **Header**: 80-100px → 48-56px. Pill-shaped stat badges inline. Remove title gradient text, use clean bold white.
2. **Section dividers**: Replace large padding gaps with thin `1px` lines + small category labels (`─── 订单 ───`).
3. **Pool cards**: Slightly larger, more visual weight. Individual soft-colored backgrounds.
4. **Interaction area**: Keep functional space between orders and inventory but make it compact/collapsible when no affix interaction active.
5. **Inventory**: Tighter grid gap. Warmer empty-slot styling.
6. **Skills bar**: Move to bottom as small pill tags, not large flex items.

## Component-Level Design Specifications

### Header Bar

- Height: `h-14` (56px)
- Background: `--text-primary` (#2D2A26 warm dark)
- Logo: Simple circle with company icon, no gradient — clean white icon on accent-red circle
- Stats: Pill badges (`rounded-full px-3 py-1 bg-white/10`) with monospace numbers
- Actions: Ghost icon buttons, `hover:bg-white/10`

### Pool Cards

- Container: `rounded-2xl border border-[--border] bg-[pool-theme-bg] p-5`
- Shadow: `0 2px 8px var(--shadow-warm)`, hover: `0 4px 16px var(--shadow-warm)` + `translateY(-2px)`
- Icon: Large emoji `text-4xl`
- Name: `DM Sans` 700, `text-xl`
- Price: Pill badge with accent-red text on white background
- Affix: Small pill tag below name, muted style
- Disabled: `opacity-50 grayscale-[0.3]` (less harsh than current 0.8)

### Order Cards

- Container: `rounded-xl bg-white border border-[--border] p-4`
- Left accent bar: `4px` wide colored stripe on left edge (matches order type)
- Score order: left bar = sky-500, Emergency: left bar = rose-500, Regular: left bar = stone-300
- Reward badge: top-right, pill shape
- Requirements (capsule mode): Preserve ALL current visual semantics:
  - Dashed/solid border for item presence
  - Rarity color fills when quality matched
  - Grayscale+opacity when unmatched
  - Quality dot positioned identically
  - All hover highlights, synthesis overlays, recycle overlays unchanged
- Requirements (slot mode): Preserve all ring states, overlay states, badges

### Inventory Slots

- Size: Keep `clamp(4rem, 5.5vw, 6.5rem)` fluid sizing
- Empty: `rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50`
- Filled: Rarity color classes (updated to warm palette) + `shadow-sm`
- Tool items: Keep amber glow, adjust to warmer amber tones
- All interactive states (selected, synthesis, recycle, swap) preserved with same ring/scale patterns

### Skill Selection Modal

- Backdrop: Keep `bg-black/80 backdrop-blur-md`
- Cards: `rounded-2xl bg-white p-6` with warm shadow
- Skill icon circles: Keep current color mappings
- Replace mode: Keep red/green ring semantics

### Confirm Dialog & Toast

- Dialog: `rounded-2xl bg-white shadow-2xl` with warm shadow
- Toast: Keep `rounded-full` pill shape, adjust bg colors to warm palette

### Section Dividers

New element — thin horizontal rule with inline label:
```
<div class="flex items-center gap-3 px-6 py-2">
  <div class="h-px flex-1 bg-[--border]"></div>
  <span class="text-xs font-bold text-[--text-muted] uppercase tracking-widest">订单</span>
  <div class="h-px flex-1 bg-[--border]"></div>
</div>
```

## Preserved Visual Semantics

These must NOT change in the redesign:

1. **Rarity color order**: common(gray) → uncommon(green) → rare(blue) → epic(purple) → legendary(orange) → mythic(red/rose)
2. **Order capsule states**: dashed=empty, solid=filled, grayscale=wrong quality, full color=matched
3. **Quality dots**: Always show required rarity color, positioned at left (capsule) or top-left (slot)
4. **Ring colors**: yellow=synthesis, cyan=tool, amber=recycle, red=replace/selected
5. **Overlay semantics**: yellow overlay=upgrade, red overlay=recycle with coin value
6. **Status badges**: sterile (bottom-left dark), decay (bottom-left with threshold color), phantom (bottom-center link)
7. **Upgrade stage colors**: LV1=yellow, LV2=orange, LV3=red, LV4=rose

## Animation Adjustments

- Keep all current transition durations and easing curves
- Pool hover: Add subtle `translateY(-2px)` lift instead of `scale(1.02)`
- Card interactions: Maintain `active:scale-95` press feedback
- Add subtle entrance animation for section reveals (staggered `opacity` + `translateY`)
