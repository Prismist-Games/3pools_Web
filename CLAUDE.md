# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173/3pools_Web/)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test suite exists in this project.

## Architecture Overview

This is a React 18 + Vite 6 + Tailwind CSS 3 browser-based resource management game called "反重力游戏" (Antigravity Game / 三池物语). Deployed to GitHub Pages at `/3pools_Web/` (configured in `vite.config.js`).

### Data Flow

```
src/data/constants.js        ← All game configuration (pools, rarities, stages, skills, affixes)
        ↓
src/App.jsx                  ← Top-level: game config state, debug tools, settings UI
        ↓
src/GameCore.jsx             ← Game layout/rendering, connects logic hook to UI
        ↓
src/hooks/useGameLogic.js    ← ALL game state and actions (the brain of the game)
        ↓
src/utils/helpers.js         ← Pure utility functions (roll rarities, generate orders, etc.)
```

### Key Architectural Patterns

**`useGameLogic` hook** (`src/hooks/useGameLogic.js`) is the single source of truth for all game state. It exposes `{ state, actions, helpers }`. `GameCore.jsx` destructures these and passes them down to components. Do not put game logic in components.

**Config-driven design**: Nearly everything is data-driven from `INITIAL_GAME_CONFIG` in `constants.js`. The config is passed from `App.jsx` down through `GameCore` into `useGameLogic`. To change game balance, edit values in `constants.js` rather than logic code.

**Internationalization**: Chinese (zh) is the source of truth for all UI strings. English translations live in `src/utils/translations.js` as a flat key-value map. Wrap any displayed string with `t()` from `useLanguage()`. Never hardcode English strings in components.

**Pool Affixes** (`affixes` in config): Each draw pool gets one random affix that modifies draw behavior. Affix types: `passive` (modifies rarity weights automatically) vs `interaction` (requires player to choose before/after drawing). The `interaction` affixes (`precise`, `targeted`, `trade_in`) set state in `useGameLogic` to prompt a UI selection flow.

### Component Structure

```
src/components/
  game/
    InventorySlot.jsx    ← Single inventory grid cell (complex: handles tooltips, tool items, animations)
    OrderCard.jsx        ← Individual order display and interaction
    PoolCard.jsx         ← Draw pool card with affix display
    SkillSelectionModal  ← 3-option skill picker shown on era transition
    Leaderboard.jsx      ← Supabase-backed high score table
  ui/
    ConfirmDialog.jsx    ← Reusable modal confirmation
    Toast.jsx            ← Transient notification display
  ErrorBoundary.jsx
src/contexts/
  LanguageContext.jsx    ← zh/en toggle, `t()` translation function, persisted to localStorage
```

### Game Concepts (for context when modifying logic)

- **Pools**: 3 active draw pools at a time, each with a random affix and gold cost. Drawing spends gold to add items to inventory.
- **Inventory**: Fixed-size grid (10 slots default). Items can be merged if same name + same rarity → upgrades to next rarity.
- **Orders**: 3 active regular orders + 1 mainline order. Submit inventory items to fulfill requirements and earn gold.
- **Stages** (`INITIAL_STAGE_CONFIG`): 4 stages with escalating mechanics (volatility, specialization, entropy/decay). Currently `useGameLogic` always uses `stages[0]` — stage progression is managed externally.
- **Skills**: Passive bonuses selected 3-from-3 at stage transitions. Defined in `SKILL_DEFINITIONS`. Skill effects are implemented as event hooks inside `useGameLogic` (`draw_requested`, `draw_finished`, order completion, recycle events).
- **Tool Items**: Special items (`tool_reforge`, `tool_transmute`, `tool_enhance`) that drop randomly on draws and are activated via right-click in inventory.
- **Emergency Orders**: Time-limited orders with a health/difficulty system (`EMERGENCY_ORDER_CONFIG`).

### External Services

- **Supabase** (`src/utils/supabaseClient.js`): Used only for the leaderboard feature. The URL and publishable key are hardcoded (this is intentional — it's a public anon key).
