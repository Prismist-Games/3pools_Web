# Multiplayer LAN Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated 2-4 player LAN prototype where players share orders and pool choices, draw simultaneously, see each other's inventories, and compare scores after all players run out of gold.

**Architecture:** Add a small authoritative WebSocket room server and a separate multiplayer React screen. Keep the existing single-player `useGameLogic` and `GameCore` intact, while reusing config and helper logic for pools, orders, rarity, and item creation.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Node.js ESM, `ws` WebSocket server.

---

### Task 1: Server Game Engine

**Files:**
- Create: `server/multiplayerEngine.js`
- Create: `server/multiplayerServer.js`
- Modify: `package.json`

- [x] Add `ws` as a dependency and scripts for `dev:lan` and `server:lan`.
- [x] Implement one in-memory room with 2-4 player start rules.
- [x] Generate shared orders and three active pools from `INITIAL_GAME_CONFIG`.
- [x] Track per-player gold, score, inventory, pending items, selected draw, readiness, and eliminated state.
- [x] Resolve each round only after all currently available players are ready.
- [x] Auto-refresh a shared order after any player submits it.
- [x] End the game when all players are eliminated.

### Task 2: Multiplayer Client State

**Files:**
- Create: `src/multiplayer/useMultiplayerClient.js`

- [x] Connect to `ws://<current-host>:8787`.
- [x] Send join, start, draw choice, interactive choice, pending item handling, inventory movement, recycling, and order submit messages.
- [x] Maintain latest room snapshot and connection status.
- [x] Expose ergonomic actions for the multiplayer UI.

### Task 3: Multiplayer UI

**Files:**
- Create: `src/multiplayer/MultiplayerGame.jsx`
- Modify: `src/App.jsx`

- [x] Add a `/multiplayer` route selected by `window.location.pathname`.
- [x] Build lobby UI with player list and start button.
- [x] Build play UI with shared orders, shared pools, own controls, public player inventories, visible pending items, and round results.
- [x] Restore key single-player readability affordances in multiplayer: pool hover, order capsules, and order-match inventory icons.
- [x] Support own-inventory organize, synthesis, recycling, pending replacement, and exact-item order submission.
- [x] Disable start for one player and lock the room after the game starts.
- [x] Hide evacuation and manual order refresh entirely from the multiplayer screen.

### Task 4: Verification

**Files:**
- Modify only files needed to fix failures.

- [x] Run `npm run build`.
- [x] Run the LAN server and Vite dev server. Vite used port 5177 because 5176 was occupied.
- [x] Verify server/client smoke paths: join, start, choose pools, resolve rounds, see public inventories, handle pending items, recycle, synthesize, and submit an order with chosen item UIDs.
