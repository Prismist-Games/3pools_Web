# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

We are a 3-person indie game dev team building a PC game for Steam. The game — "幸运之墙 Wall of Fortune" — is a light-medium strategy game capturing strategic fun amid uncertainty in a way that's accessible to a broad audience.

This repo is separate from the main Godot project. It serves as a Web prototype for rapid gameplay validation and design iteration, following a "try fast, iterate fast" approach.

### Design Values

We pursue elegance, simplicity, and holistic consistency. We design from player experience — understanding the essence of experiences, problems, and systems before generating solutions. We favor original and unique experiences; we'll absorb existing mechanics only when they genuinely serve our game's needs and fit its identity.

### Design Documentation

| Document | Path | Description |
|----------|------|-------------|
| Game setting | `design_docs/setting-current-state.md` | Game setting and narrative. Reference when design work needs to consider theme or story. |
| Game rules | `design_docs/game_rules.md` | Complete gameplay rules and mechanics. |
| Gameplay progress | `design_docs/gameplay_progress.md` | Module status, design history, what's core vs. scaffolding, what's carefully designed vs. placeholder. (To be created) |
| Codebase reference | `design_docs/codebase_technical_reference.md` | Code structure and technical reference. |

## Communication Mindset

Your objective is the quality of this game, not our satisfaction. We are seeking understanding, advancement, and productivity — treat every interaction as an opportunity to make the game better, even when that means telling us something we don't want to hear.

- **Lead with honest assessment.** If you see a flaw in our thinking, raise it immediately — don't soften it, don't bury it, and don't save it for when we explicitly ask. The first response should contain your real judgment, every time.
- **Don't default to agreement.** Evaluate ideas on their merits. Agreement should be a conclusion you reach, not a starting position you retreat from later.
- **Don't fold under pressure — re-examine instead.** When we push back, treat it as a prompt to re-evaluate your reasoning, not as a signal that you were wrong. If re-examination reveals a genuine flaw, change your position and explain what was wrong. If it doesn't, say so — even if we seem unconvinced.
- **Be calibrated, not confident.** State your certainty level honestly. "I think X but I'm not sure because Y" is far more useful than false confidence that collapses under questioning. Over-confidence and sycophancy are two sides of the same problem — both hide the truth.
- **Make mind-changes transparent.** When you do change your position, name what actually changed your mind. If you can't point to a specific new consideration, you're probably just yielding to social pressure — catch yourself and say so.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173/3pools_Web/)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test suite exists in this project.

## Architecture Overview

React 18 + Vite 6 + Tailwind CSS 3 browser-based game "幸运之墙 Wall of Fortune", deployed to GitHub Pages at `/3pools_Web/`.

### Development Rules

- **Single source of truth**: All game state lives in `useGameLogic` hook (`src/hooks/useGameLogic.js`). Components receive state via props from `GameCore.jsx`. Do not put game logic in components.
- **Config-driven**: Game balance, items, skills — all defined in `src/data/constants.js`. Edit config values, not logic.
- **i18n**: Chinese is the source language. Wrap all UI strings with `t()` from `useLanguage()`. Add English translations to `src/utils/translations.js`. Never hardcode English in components.

### Game Concepts (branch: ingredient-trade-flex-io)

- **Setting**: Dawn 菜市场. Protagonist's restaurant is on the brink — each day they rush the morning market to grab scarce ingredients, fight off rival 抢菜人, then cook a named dish back home to defend popularity. See `design_docs/game_rules.md` for authoritative rules and `design_docs/setting-current-state.md` for narrative.
- **Day Loop**: Dish reveal → bulletin auto-fills with 4 orders → enter market (draw, fill orders, dodge 抢菜人) → evacuate → cook (slot-based scoring) → popularity delta → next day. `phase` state machine: `pre_game → setup → wall_choice → drawing → between_turns → restaurant → cook_result`.
- **Victory**: Current prototype — 3 days, cumulative score ≥ 30. Final "评审 Boss" planned, not implemented.
- **Market (奖品墙)**: 4×4 grid. Each turn the player picks a row OR column; one random cell in it is drawn and removed. Default 3 draws per market (was "gold", now 抽数).
- **Market Types**: 5 stall types, each supplying one food category — 🦐 海鲜市场, 🍖 肉铺, 🍚 粮食店, 🥬 蔬菜店, 🧀 乳品店. The wall's 抽数/doom/cell distribution is shared; the type only gates which ingredients can appear.
- **Wall Selection**: Currently **3-choose-1 from the 5 market types** (equal weight, no repeats) with type/description/subcategories fully visible — no hidden reveal step. **Under active redesign**: design direction is to replace 3-choose-1 with a market map where stalls are spatial nodes; see `setting-current-state.md` 当前思考链.
- **Ingredients**: 80 total, organized 5 大类 × 4 小类 × 4 items (肉 / 海鲜 / 蔬菜 / 主食 / 蛋奶). Each has `tags: [大类, 小类]`. Quality is **not** stored on the cell — it's rolled at draw time.
- **Quality Tiers**: 5 levels — 普通★(1pt, 40%) / 精选★★(2pt, 30%) / 优质★★★(3pt, 18%) / 顶级★★★★(5pt, 8%) / 传说★★★★★(8pt, 4%). Used for order matching (≥ requirement) and cooking score.
- **Polyomino Cells**: Ingredient cells generate as 1-cell (60%) / 2-cell domino (30%) / 3-cell tromino (10%) shapes. All cells in a group share ingredient id + `groupId`; drawing removes only the one cell hit, siblings remain.
- **Procedural Cell Types & Per-Cell Rates**: 🧑 抢菜人 (doom resolution) 15%, 📋 order cell 7%, 💣 bomb (destroys 8-neighborhood) 5%, 🎫 抽数 cell (+1–2 draws) 3%, ingredient cell ~70%. 🎒 backpack-expand, ❤️‍🩹 heal, ⬇️ gravity, 🚪 sub-level, ⬜ empty, ⬆️ doom-upgrade — **no longer placed on procedural walls** (⬆️ fully removed; rest are dormant code paths).
- **Orders**: Bulletin board of **4, always full**. Templates roll by weighted difficulty — easy:medium:hard:extreme = 30:40:20:10 — each specifying requirement slots (`tag2` subcategory + quality threshold + count) and one reward slot (tag2 + fixed quality). Submitting consumes matching ingredients; player picks which specific ingredient to consume and which specific item to receive as reward. Refresh sources: initial 4 at day start (auto), 1 on each completion (auto), 1 per 📋 cell, 1 per manual refresh. All refreshes funnel through a FIFO `incomingQueue` that becomes 2-choose-1 events when the shelf is full. Initial refresh charges = 0.
- **Synthesis**: Any 2 items with same id + same quality can combine into 1 item at quality +1 (cap = 传说 5).
- **Doom System**: 10-cell doom grid, +1 danger/turn. 🧑 triggers resolution — cursor lands N times (N = doom level, currently **fixed at 1** since the upgrade path was removed). Each landing on a danger cell = −1 HP. HP starts at 5/day; at 0 the whole backpack is lost and evacuation is forced. **Doom-level upgrade mechanic is intentionally missing — pending redesign.**
- **Backpack**: 10 shared slots (`INITIAL_STAGE_CONFIG[0].inventorySize`). Overflow drops into a `pendingItems` queue that the player resolves one-by-one (replace / discard). No in-game expansion currently.
- **Cooking (restaurant phase)**: Each day has a target dish with slots; each slot has `rules[]` of `{ match: {tag|id}, multiplier }` plus optional `trigger` (dynamic slot spawn on matching tag) and `crossBonus` (another slot's content boosts this slot's multiplier). Score = Σ(ingredient.scoreValue × slot multiplier × crossBonus) + dish `baseline`.
- **Dispatch 5-axis scoring**: 健康 / 香气 / 口感 / 味道 / 外观 pentagon overlap with a bouncing-ball animation. Exists as a standalone tool page; **not yet wired into cooking flow**.
- **Popularity**: HP + economy engine (rises/falls on daily cook rating; 0 = lose). Formula and initial value still TBD — `popularity` state field exists but is placeholder.
- **i18n**: Chinese is source. Wrap UI strings with `t()` from `useLanguage()`; English strings live in `src/utils/translations.js`. Ingredient/dish data carries `nameEn` inline.
- **Legacy / frozen in code** (do not reason about as active): original 9 modifiers (镜花水月 / 爆裂愈合 / 传送带 / …) and the later 5 modifiers (Basic / Hidden / Drift / Multiplier / Alternating) — logic remains in `useGameLogic.js` but `currentWallType` now stores market-type ids, so nothing triggers. Export-item system, hand-crafted levels (`src/data/levels/`, `/editor`, `/levels`), sub-level 🚪 push/pop, gravity polyomino drop, cluster-elimination helpers (`getClusterMembers` marked `@deprecated`), v1 stage/skill/affix/tool/pool configs in `constants.js` — all dormant.

### Workflow Rules

- **Design discussions → doc sync**: When a conversation produces design decisions, rule changes, or new conclusions about any game system, proactively ask the user whether to update the relevant design documents (`game_rules.md`, `gameplay_progress.md`, etc.) before moving on.
- **Implementation → read docs first**: When the user asks to implement or modify a gameplay feature, always read the relevant design documents first to understand the current design intent, status, and constraints — then proceed.

### Lessons Learned

Project-specific lessons and conventions are stored in `.claude/lessons/` as categorized markdown files (e.g., `ui-conventions.md`, `architecture.md`). When `/reflect` captures new learnings, they should be appended to the appropriate file under `.claude/lessons/` rather than added directly to this file.

**IMPORTANT**: Before tackling any problem or task, check `.claude/lessons/` for relevant prior experience in that domain. Read the appropriate lesson file(s) before proceeding. The same mistake must never be made twice.
