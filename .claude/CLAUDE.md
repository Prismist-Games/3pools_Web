# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

We are a 3-person indie game dev team building a PC game for Steam. The game — "三池物语" — is a light-medium strategy game capturing strategic fun amid uncertainty in a way that's accessible to a broad audience.

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

React 18 + Vite 6 + Tailwind CSS 3 browser-based game "三池物语", deployed to GitHub Pages at `/3pools_Web/`.

### Development Rules

- **Single source of truth**: All game state lives in `useGameLogic` hook (`src/hooks/useGameLogic.js`). Components receive state via props from `GameCore.jsx`. Do not put game logic in components.
- **Config-driven**: Game balance, items, skills — all defined in `src/data/constants.js`. Edit config values, not logic.
- **i18n**: Chinese is the source language. Wrap all UI strings with `t()` from `useLanguage()`. Add English translations to `src/utils/translations.js`. Never hardcode English in components.

### Game Concepts

- **Item Matrix**: 4×4 grid of cells. Player selects a row or column, randomly draws 1 cell. Normal items go to inventory; gold traps (🪙, ~4/board) deduct 1-3 gold; bombs (💣, ~1.5/board) destroy surrounding 8 cells. Gravity drops items down, top refills randomly. Draws are free — gold is lost via traps. This is the new core draw mechanic (replacing the old pool/affix system), in prototype validation.
- **Inventory**: Fixed-size grid (10 slots default). Items can be merged if same name + same rarity → upgrades to next rarity.
- **Orders**: 3 active regular orders + 2 evacuation orders. Submit inventory items to fulfill requirements and earn score.
- **Stages** (`INITIAL_STAGE_CONFIG`): 4 stages with escalating mechanics. Currently `useGameLogic` always uses `stages[0]` — stage progression not active.
- **Skills**: Passive bonuses defined in `SKILL_DEFINITIONS`. Not active in current version.
- **Tool Items**: Special items (`tool_reforge`, `tool_transmute`, `tool_enhance`) activated via right-click in inventory. Currently not dropping from draws.
- **Evacuation Orders**: Orders with escalating difficulty. No time limit — must complete before gold runs out.

### Workflow Rules

- **Design discussions → doc sync**: When a conversation produces design decisions, rule changes, or new conclusions about any game system, proactively ask the user whether to update the relevant design documents (`game_rules.md`, `gameplay_progress.md`, etc.) before moving on.
- **Implementation → read docs first**: When the user asks to implement or modify a gameplay feature, always read the relevant design documents first to understand the current design intent, status, and constraints — then proceed.

### Lessons Learned

Project-specific lessons and conventions are stored in `.claude/lessons/` as categorized markdown files (e.g., `ui-conventions.md`, `architecture.md`). When `/reflect` captures new learnings, they should be appended to the appropriate file under `.claude/lessons/` rather than added directly to this file.

**IMPORTANT**: Before tackling any problem or task, check `.claude/lessons/` for relevant prior experience in that domain. Read the appropriate lesson file(s) before proceeding. The same mistake must never be made twice.
