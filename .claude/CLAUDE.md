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

### Game Concepts (Current Prototype — Hand-building + Passive Matching)

> Authoritative design doc: `design_docs/game_rules.md`. This section is a quick reference; read the doc before any gameplay work.

- **Core loop**: Draw stickers from walls → hold them in inventory (not consumed) → passively satisfy danger cards (survive) and profit cards (rewards) → evacuate.
- **Core tension**: Backpack space. Stickers aren't consumed, so everything held occupies slots. Player must choose which combinations to maintain.
- **Stickers**: 8 types (☀️阳光 💧水滴 🔥火焰 💨清风 🌱种子 🪨矿石 ❄️冰霜 🌀漩涡). **Not consumed.** One sticker simultaneously satisfies all cards that need it.
- **Wall shop**: 5 walls displayed at once, each with 2-3 random sticker biases (~65-70% concentration). Entry fee 1-3 AP, draws 3/5/7 (cost-linked). Refresh all 5 for 2 AP.
- **Drawing**: Free (0 AP). Pick one row or column in a 4×4 grid, randomly get one cell. Used cells stay empty until wall refreshes.
- **Card types** (all passive-match — check inventory, don't consume):
  - **Danger cards** ⚠️ — auto-generated each turn (1/2/3/4 by turn range), each needs 1 sticker type, checked at turn end. Unmet = −1 life.
  - **Profit cards** 💎 — bought from voucher shop (2 displayed, 2 AP each, max 5 held). Each needs 2-3 sticker types. Satisfied ones grant out-of-game items on evacuation.
  - **Evacuation card** 🚪 — held from start. Activates when ≥3 profit cards are currently satisfied (`EVACUATION_PROFIT_REQUIREMENT = 3`).
- **Resources**: 10 AP/turn (reset), 5 starting lives (0 = forced evacuation, lose inventory), **10-slot backpack** (stickers + items share).
- **Game structure**: 3 expeditions per game, each = multiple turns → evacuate. Score from items won via profit cards.
- **Planned but not implemented**: Skill cards (passive-match for combo effects), wall decision depth beyond bias/cost/draws, intermittent evacuation windows.

### Workflow Rules

- **Design discussions → doc sync**: When a conversation produces design decisions, rule changes, or new conclusions about any game system, proactively ask the user whether to update the relevant design documents (`game_rules.md`, `gameplay_progress.md`, etc.) before moving on.
- **Implementation → read docs first**: When the user asks to implement or modify a gameplay feature, always read the relevant design documents first to understand the current design intent, status, and constraints — then proceed.
- **Doc before code**: When asked to implement something that differs from the current design documents, **always update the design docs first**, then implement. Never leave docs and code out of sync.

### Lessons Learned

Project-specific lessons and conventions are stored in `.claude/lessons/` as categorized markdown files (e.g., `ui-conventions.md`, `architecture.md`). When `/reflect` captures new learnings, they should be appended to the appropriate file under `.claude/lessons/` rather than added directly to this file.

**IMPORTANT**: Before tackling any problem or task, check `.claude/lessons/` for relevant prior experience in that domain. Read the appropriate lesson file(s) before proceeding. The same mistake must never be made twice.
