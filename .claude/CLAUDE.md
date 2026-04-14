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

### Game Concepts (Turn-Based Prototype v2.3)

- **Setting**: TV game show. Player faces a Prize Wall (奖品墙) each turn.
- **Game Structure**: 3 expeditions per game. Each expedition: multiple turns of drawing → evacuate. Victory: ≥30 points across 3 evacuations.
- **Turn Structure**: Prize Wall ready → draw using gold (5/turn default, configurable per level) → doom accumulates → bulletin board adds order → 3-choose-1 next wall → continue or evacuate.
- **Prize Wall**: 4×4 wall, player selects row OR column, random draw 1 cell. Every cell is an independent 1×1 entity (no polyomino / group system). Cell types: stickers (main), export items (1/2/3/5 pt tiers), order cells, gold cells, 💣 bomb, ❤️‍🩹 heal, 🎒 backpack expand, ⬇️ gravity switch, 🚪 sub-level entrance, ⬜ empty (structural). 💀 doom resolution and ⬆️ doom upgrade cells exist in code but are no longer placed on random walls.
- **Stickers**: 8 types of local-only materials (⭐🌸⚡🔥🌙🍀🎵🦋). Each wall has configurable types (stickerTypeRange). Consumed when submitting orders.
- **Orders**: Bulletin board shows 5 orders (reward + difficulty only). Accept to reveal requirements. Max 3 held. Orders need specific sticker types/quantities. Submit anytime, no cost.
- **Export Items**: Score items from completing orders (1/2/3/5 pts, 3 items per tier). Also rarely appear on wall. Evacuate to convert to score.
- **Doom System**: 10-cell Doom Grid, +1 danger/turn. 💀 triggers resolution (cursor hits N cells, N = doom level). ⬆️ increases doom level. HP = 5; at 0 = lose entire backpack, forced evacuation.
- **Backpack**: 15 base slots (expandable via 🎒 cells) shared by stickers and export items.
- **Wall Selection**: 3-choose-1 per turn. Each candidate is EITHER a modifier (procedural) OR a hand-crafted level (no modifier). Mutually exclusive.
- **Wall Modifiers**: Basic, Hidden, Drift, Multiplier, Alternating. Only apply to procedural walls.
- **Level System**: Hand-crafted levels stored as JSON in `src/data/levels/`. Main levels appear in 3-choose-1. Sub-levels entered via 🚪 entrance cells (push/pop wall state, independent gold, shared backpack/doom). Level editor at `/editor`, management at `/levels`.
- **Gravity**: ⬇️ gravity switch activates persistent downward gravity for the rest of the turn. Polyominos fall as units.
- **Localization**: Chinese source, English via `name_en`/`description_en` in level JSON + `translations.js` for UI strings.
- **Planned systems (not in prototype)**: Sticker exchange system, functional wall types (shop), item abilities, doom expansion, evacuation expansion.

### Workflow Rules

- **Design discussions → doc sync**: When a conversation produces design decisions, rule changes, or new conclusions about any game system, proactively ask the user whether to update the relevant design documents (`game_rules.md`, `gameplay_progress.md`, etc.) before moving on.
- **Implementation → read docs first**: When the user asks to implement or modify a gameplay feature, always read the relevant design documents first to understand the current design intent, status, and constraints — then proceed.

### Lessons Learned

Project-specific lessons and conventions are stored in `.claude/lessons/` as categorized markdown files (e.g., `ui-conventions.md`, `architecture.md`). When `/reflect` captures new learnings, they should be appended to the appropriate file under `.claude/lessons/` rather than added directly to this file.

**IMPORTANT**: Before tackling any problem or task, check `.claude/lessons/` for relevant prior experience in that domain. Read the appropriate lesson file(s) before proceeding. The same mistake must never be made twice.
