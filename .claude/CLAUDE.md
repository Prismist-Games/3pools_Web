# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

We are a 3-person indie game dev team building a PC game for Steam. The game — "三池物语" (3 Pools Tales) — is a light-medium strategy game built around the core idea of "strategic choice before a lottery among 3 pools," capturing strategic fun amid uncertainty in a way that's accessible to a broad audience.

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
- **Config-driven**: Game balance, items, affixes, skills — all defined in `src/data/constants.js`. Edit config values, not logic.
- **i18n**: Chinese is the source language. Wrap all UI strings with `t()` from `useLanguage()`. Add English translations to `src/utils/translations.js`. Never hardcode English in components.

### Game Concepts

- **Pools**: 3 active draw pools at a time, each with a random affix and gold cost. Drawing spends gold to add items to inventory.
- **Inventory**: Fixed-size grid (10 slots default). Items can be merged if same name + same rarity → upgrades to next rarity.
- **Orders**: 3 active regular orders + 2 emergency orders. Submit inventory items to fulfill requirements and earn score.
- **Stages** (`INITIAL_STAGE_CONFIG`): 4 stages with escalating mechanics (volatility, specialization, entropy/decay). Currently `useGameLogic` always uses `stages[0]` — stage progression is managed externally.
- **Skills**: Passive bonuses selected 3-from-3 at stage transitions. Defined in `SKILL_DEFINITIONS`. Skill effects are implemented as event hooks inside `useGameLogic` (`draw_requested`, `draw_finished`, order completion, recycle events).
- **Tool Items**: Special items (`tool_reforge`, `tool_transmute`, `tool_enhance`) that drop randomly on draws and are activated via right-click in inventory.
- **Emergency Orders (撤离订单)**: 2 evacuation orders that must be completed before gold runs out. No timer or health system — win by completing them, lose if gold is exhausted first. Configured via `EMERGENCY_ORDER_CONFIG`.

### Lessons Learned

Project-specific lessons and conventions are stored in `.claude/lessons/` as categorized markdown files (e.g., `ui-conventions.md`, `architecture.md`). When `/reflect` captures new learnings, they should be appended to the appropriate file under `.claude/lessons/` rather than added directly to this file.

**IMPORTANT**: Before tackling any problem or task, check `.claude/lessons/` for relevant prior experience in that domain. Read the appropriate lesson file(s) before proceeding. The same mistake must never be made twice.
