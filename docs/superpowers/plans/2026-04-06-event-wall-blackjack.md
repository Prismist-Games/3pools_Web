# Event Wall + Blackjack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "event wall" framework to the 3-choose-1 wall selection, and implement the first event: a Blackjack (21点) mini-game played on the 5×5 board with doom grid danger cells as stakes.

**Architecture:** Event walls are a new wall category alongside normal walls. When selected, they replace the normal drawing phase with event-specific logic and UI. The blackjack event reuses the 5×5 grid (filled with number cells 1-5), lets the player select row/column to draw numbers, accumulate a score targeting 21, then compares against a random dealer number. Win = -1 doom danger, Lose/Bust = +2 doom danger.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, existing useGameLogic hook pattern

**Spec:** `docs/superpowers/specs/2026-04-06-event-wall-blackjack-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/v2Config.js` | Modify | Add event wall types array + blackjack config constants |
| `src/utils/matrixHelpers.js` | Modify | Add `generateBlackjackWall()` — fills 5×5 with random 1-5 numbers |
| `src/hooks/useGameLogic.js` | Modify | Blackjack state, phase flow, candidate generation with event walls |
| `src/components/game/WallPicker.jsx` | Modify | Render event wall cards with different styling |
| `src/components/game/BlackjackEvent.jsx` | Create | Blackjack board + score + hit/stand UI + result display |
| `src/GameCore.jsx` | Modify | Wire blackjack phase rendering + animation intervals |
| `src/utils/translations.js` | Modify | Add Chinese→English translations for blackjack UI strings |

---

### Task 1: Config — Event Wall Types & Blackjack Constants

**Files:**
- Modify: `src/data/v2Config.js`

- [ ] **Step 1: Add event wall type definitions and blackjack config to v2Config.js**

At the end of `src/data/v2Config.js`, add:

```javascript
// --- 事件墙类型定义 ---
export const EVENT_WALL_TYPES = [
    {
        id: 'blackjack',
        name: '21点',
        icon: '🃏',
        desc: '凑点数挑战庄家，赢了减厄运，输了加厄��',
        weight: 15,
        category: 'event',
    },
];

// --- 21点事件配置 ---
export const BLACKJACK_CONFIG = {
    bustThreshold: 21,          // 爆掉阈值
    numberRange: [1, 5],        // 每格数字范围
    dealerRange: [12, 19],      // 庄家点数范围 (uniform random)
    winReward: -1,              // 赢：厄运网格减少危险格子数
    loseOrBustPenalty: 2,       // 输/爆掉：厄运网格增加危险格子数
};
```

- [ ] **Step 2: Commit**

```bash
git add src/data/v2Config.js
git commit -m "feat: add event wall type config and blackjack constants"
```

---

### Task 2: Board Generation — Blackjack Wall

**Files:**
- Modify: `src/utils/matrixHelpers.js`

- [ ] **Step 1: Add generateBlackjackWall function**

At the bottom of `src/utils/matrixHelpers.js`, before the `generateTurnMatrix` legacy export, add:

```javascript
/**
 * Generate a 5×5 blackjack wall — every cell is a number 1-5.
 * @param {number} min — minimum number (inclusive)
 * @param {number} max — maximum number (inclusive)
 * @returns {{ grid: Array[][] }} — grid of number cells
 */
export function generateBlackjackWall(min = 1, max = 5) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({
      type: 'number',
      value: min + Math.floor(Math.random() * (max - min + 1)),
      uid: generateUID(),
    }))
  );
  return { grid };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/matrixHelpers.js
git commit -m "feat: add generateBlackjackWall for number-filled 5x5 grid"
```

---

### Task 3: Game Logic — Blackjack State & Candidate Generation

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the largest task. It adds: (a) event wall injection into candidates, (b) blackjack-specific state, (c) blackjack phase flow.

- [ ] **Step 1: Add imports**

At the top of `useGameLogic.js`, update imports:

```javascript
import { generateWall, pickWallStickers, generateBlackjackWall } from '../utils/matrixHelpers';
```

And add to the v2Config import:

```javascript
import { STICKER_TYPES, OUT_OF_GAME_ITEMS, ORDER_TEMPLATES, WALL_TYPES, EVENT_WALL_TYPES, BLACKJACK_CONFIG } from '../data/v2Config';
```

- [ ] **Step 2: Update pickWallType to support event walls**

Replace the existing `pickWallType` function with a version that can include event walls:

```javascript
function pickWallType(includeEvents = false) {
    const pool = includeEvents
        ? [...WALL_TYPES, ...EVENT_WALL_TYPES]
        : [...WALL_TYPES];
    const total = pool.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    for (const t of pool) {
        roll -= t.weight;
        if (roll <= 0) return t;
    }
    return pool[0];
}
```

- [ ] **Step 3: Update startNewTurn candidate generation**

In `startNewTurn()`, replace the candidate generation loop to enforce the rule: max 1 event wall among 3 candidates.

Replace:
```javascript
        // 3-choose-1 wall selection — no duplicate wall types
        const candidates = [];
        const usedTypeIds = new Set();
        while (candidates.length < 3) {
            const wallType = pickWallType();
            if (usedTypeIds.has(wallType.id)) continue;
            usedTypeIds.add(wallType.id);
            const stickers = pickWallStickers(STICKER_TYPES);
            const { grid, doomCellCount } = generateWall(stickers);
            candidates.push({ stickers, grid, doomCellCount, wallType });
        }
```

With:
```javascript
        // 3-choose-1 wall selection — no duplicate types, max 1 event wall
        const candidates = [];
        const usedTypeIds = new Set();
        let hasEvent = false;
        while (candidates.length < 3) {
            const wallType = pickWallType(!hasEvent); // only include events if we don't have one yet
            if (usedTypeIds.has(wallType.id)) continue;
            usedTypeIds.add(wallType.id);

            if (wallType.category === 'event') {
                hasEvent = true;
                // Event walls generate their own board on selection, not here
                candidates.push({ wallType, isEvent: true });
            } else {
                const stickers = pickWallStickers(STICKER_TYPES);
                const { grid, doomCellCount } = generateWall(stickers);
                candidates.push({ stickers, grid, doomCellCount, wallType });
            }
        }
```

- [ ] **Step 4: Add blackjack state variables**

Inside `useGameLogic`, after the existing UI state declarations (around line 131), add:

```javascript
    // --- Blackjack Event State ---
    const [blackjackState, setBlackjackState] = useState(null);
    // { score: number, dealerScore: number|null, result: 'playing'|'bust'|'win'|'lose', matrix: grid }
```

- [ ] **Step 5: Update selectWall to handle event walls**

In the `selectWall` function, add an early branch for event walls before the existing grid mutation logic:

```javascript
    const selectWall = (index) => {
        if (!wallCandidates || !wallCandidates[index]) return;
        const chosen = wallCandidates[index];
        const wallType = chosen.wallType;
        setCurrentWallType(wallType);

        // --- Event wall: enter event-specific phase ---
        if (chosen.isEvent) {
            if (wallType.id === 'blackjack') {
                const [min, max] = BLACKJACK_CONFIG.numberRange;
                const { grid } = generateBlackjackWall(min, max);
                setMatrix(grid);
                setBlackjackState({ score: 0, dealerScore: null, result: 'playing' });
                setWallCandidates(null);
                setPhase('event_blackjack');
                return;
            }
        }

        // --- Normal wall: existing logic below ---
        const grid = chosen.grid.map(r => r.map(c => c ? { ...c } : null));
        // ... (rest of existing selectWall stays unchanged)
```

- [ ] **Step 6: Add blackjack draw functions**

After the existing `completeDrawAnim` function, add:

```javascript
    // =============================================
    // BLACKJACK EVENT
    // =============================================

    /** Draw a number from a row in blackjack */
    const blackjackSelectRow = (rowIndex) => {
        if (phase !== 'event_blackjack' || !blackjackState || blackjackState.result !== 'playing') return;
        if (isDrawAnimating) return;
        if (!matrix || !matrix[rowIndex]) return;

        const row = matrix[rowIndex];
        const activeCols = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null) activeCols.push(colIndex);
        });
        if (activeCols.length === 0) return;

        const finalColIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = row[finalColIndex];

        const finalIdx = activeCols.indexOf(finalColIndex);
        const totalTicks = activeCols.length + finalIdx + 1;

        setDrawAnimState({
            direction: 'row',
            rowIndex,
            colIndex: null,
            activeCols,
            finalColIndex,
            finalRowIndex: rowIndex,
            finalHighlight: finalColIndex,
            drawnCell,
            tick: 0,
            totalTicks,
            currentHighlight: activeCols[0],
            phase: 'scanning',
        });
    };

    /** Draw a number from a column in blackjack */
    const blackjackSelectColumn = (colIndex) => {
        if (phase !== 'event_blackjack' || !blackjackState || blackjackState.result !== 'playing') return;
        if (isDrawAnimating) return;
        if (!matrix) return;

        const activeCols = [];
        matrix.forEach((row, rowIndex) => {
            if (row[colIndex] !== null) activeCols.push(rowIndex);
        });
        if (activeCols.length === 0) return;

        const finalRowIndex = activeCols[Math.floor(Math.random() * activeCols.length)];
        const drawnCell = matrix[finalRowIndex][colIndex];

        const finalIdx = activeCols.indexOf(finalRowIndex);
        const totalTicks = activeCols.length + finalIdx + 1;

        setDrawAnimState({
            direction: 'column',
            rowIndex: null,
            colIndex,
            activeCols,
            finalColIndex: colIndex,
            finalRowIndex,
            finalHighlight: finalRowIndex,
            drawnCell,
            tick: 0,
            totalTicks,
            currentHighlight: activeCols[0],
            phase: 'scanning',
        });
    };

    /** Apply blackjack draw result after animation settles */
    const completeBlackjackDraw = () => {
        if (!drawAnimState || phase !== 'event_blackjack') return;
        const { finalRowIndex, finalColIndex, drawnCell } = drawAnimState;
        const value = drawnCell.value;

        // Remove drawn cell from matrix
        setMatrix(prev => {
            const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
            newMatrix[finalRowIndex][finalColIndex] = null;
            return newMatrix;
        });

        // Update score
        const newScore = blackjackState.score + value;
        if (newScore > BLACKJACK_CONFIG.bustThreshold) {
            setBlackjackState(prev => ({ ...prev, score: newScore, result: 'bust' }));
        } else {
            setBlackjackState(prev => ({ ...prev, score: newScore }));
        }

        setDrawAnimState(null);
    };

    /** Player stands — generate dealer score and compare */
    const blackjackStand = () => {
        if (phase !== 'event_blackjack' || !blackjackState || blackjackState.result !== 'playing') return;
        const [min, max] = BLACKJACK_CONFIG.dealerRange;
        const dealerScore = min + Math.floor(Math.random() * (max - min + 1));
        const result = blackjackState.score > dealerScore ? 'win' : 'lose';
        setBlackjackState(prev => ({ ...prev, dealerScore, result }));
    };

    /** Finish blackjack event — apply doom effect and return to between_turns */
    const blackjackFinish = () => {
        if (!blackjackState) return;
        const { result } = blackjackState;

        // Apply doom grid changes
        if (result === 'win') {
            const change = BLACKJACK_CONFIG.winReward; // negative = remove danger
            setDoomGrid(prev => {
                const newGrid = [...prev];
                let toRemove = Math.abs(change);
                // Remove danger cells from the end
                for (let i = newGrid.length - 1; i >= 0 && toRemove > 0; i--) {
                    if (newGrid[i].type === 'danger') {
                        newGrid[i] = { type: 'empty' };
                        toRemove--;
                    }
                }
                return newGrid;
            });
            showToast(t('21点获胜！厄运') + ` ${change}`, 'success');
        } else {
            const change = BLACKJACK_CONFIG.loseOrBustPenalty;
            setDoomGrid(prev => {
                const newGrid = [...prev];
                let toAdd = change;
                for (let i = 0; i < newGrid.length && toAdd > 0; i++) {
                    if (newGrid[i].type === 'empty') {
                        newGrid[i] = { type: 'danger' };
                        toAdd--;
                    }
                }
                return newGrid;
            });
            const msg = result === 'bust' ? t('爆掉了！厄运') : t('庄家赢了！厄运');
            showToast(`${msg} +${change}`, 'error');
        }

        // Clean up and proceed to between_turns
        setBlackjackState(null);
        setMatrix(null);
        setPhase('between_turns');
    };
```

- [ ] **Step 7: Export blackjack functions and state**

In the return object at the bottom of `useGameLogic`, add:

```javascript
        // Blackjack event
        blackjackState,
        blackjackSelectRow,
        blackjackSelectColumn,
        completeBlackjackDraw,
        blackjackStand,
        blackjackFinish,
```

- [ ] **Step 8: Update handleReset and startNextExpedition**

In both `handleReset()` and `startNextExpedition()`, add cleanup:

```javascript
        setBlackjackState(null);
```

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: blackjack event state, phase flow, and candidate generation"
```

---

### Task 4: WallPicker — Event Wall Cards

**Files:**
- Modify: `src/components/game/WallPicker.jsx`

- [ ] **Step 1: Update WallPicker to render event walls differently**

Event wall candidates don't have stickers or doomCellCount. Replace the card rendering to handle both:

```jsx
const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-gray-400 mb-5">{t('每面墙有不同的规则和贴纸')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(idx)}
                        className={`w-52 p-4 rounded-xl shadow-md border-2 transition-all duration-150 text-left ${
                            wall.isEvent
                                ? 'bg-amber-50 border-amber-300 hover:border-amber-500 hover:shadow-lg'
                                : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-lg'
                        }`}
                    >
                        <div className="text-sm font-bold mb-1">{wall.wallType.icon} {t(wall.wallType.name)}</div>
                        <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{t(wall.wallType.desc)}</p>

                        {wall.isEvent ? (
                            <div className="text-[10px] text-amber-600 font-bold">
                                🎲 {t('事件墙')}
                            </div>
                        ) : (
                            <>
                                <div className="text-[9px] text-gray-300 uppercase tracking-wide mb-1">{t('贴纸')}</div>
                                <div className="flex gap-1 mb-3">
                                    {wall.stickers.map(s => (
                                        <div key={s.id} className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-base shadow-sm" title={s.name}>
                                            {s.icon}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[10px] text-red-500 font-bold">
                                    💀 {wall.doomCellCount.resolution + wall.doomCellCount.upgrade} {t('厄运格')}
                                </div>
                            </>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/WallPicker.jsx
git commit -m "feat: event wall card styling in WallPicker"
```

---

### Task 5: BlackjackEvent Component

**Files:**
- Create: `src/components/game/BlackjackEvent.jsx`

- [ ] **Step 1: Create BlackjackEvent component**

This component renders the 5×5 number grid, the player's accumulated score, hit/stand buttons, and the result screen.

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BLACKJACK_CONFIG } from '../../data/v2Config';

const CELL_SIZE = 56;
const GAP = 6;

const BlackjackEvent = ({
    matrix,
    blackjackState,
    onSelectRow,
    onSelectColumn,
    onStand,
    onFinish,
    drawAnimState,
    isDrawAnimating,
}) => {
    const { t } = useLanguage();
    const { score, dealerScore, result } = blackjackState;
    const isPlaying = result === 'playing';
    const gridSize = matrix.length;

    // Check if board is empty (all cells null)
    const boardEmpty = matrix.every(row => row.every(cell => cell === null));

    return (
        <div className="flex flex-col items-center">
            {/* Score display */}
            <div className="mb-4 text-center">
                <div className="text-xs text-gray-400 mb-1">{t('当前点数')}</div>
                <div className={`text-4xl font-black ${
                    result === 'bust' ? 'text-red-500' :
                    score > 17 ? 'text-amber-500' :
                    'text-gray-800'
                }`}>
                    {score} <span className="text-lg text-gray-400">/ {BLACKJACK_CONFIG.bustThreshold}</span>
                </div>
            </div>

            {/* 5×5 number grid */}
            {isPlaying && (
                <div className="relative">
                    {/* Column click areas (top) */}
                    <div className="flex ml-[62px]" style={{ gap: GAP }}>
                        {Array.from({ length: gridSize }, (_, c) => {
                            const hasCell = matrix.some(row => row[c] !== null);
                            return (
                                <button
                                    key={`col-${c}`}
                                    onClick={() => hasCell && onSelectColumn(c)}
                                    disabled={!hasCell || isDrawAnimating}
                                    className={`flex items-center justify-center text-[10px] font-bold rounded transition-colors ${
                                        hasCell && !isDrawAnimating
                                            ? 'text-blue-400 hover:bg-blue-50 cursor-pointer'
                                            : 'text-gray-200 cursor-default'
                                    }`}
                                    style={{ width: CELL_SIZE, height: 20 }}
                                >
                                    {hasCell ? '▼' : ''}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex">
                        {/* Row click areas (left) */}
                        <div className="flex flex-col mr-1" style={{ gap: GAP }}>
                            {Array.from({ length: gridSize }, (_, r) => {
                                const hasCell = matrix[r].some(cell => cell !== null);
                                return (
                                    <button
                                        key={`row-${r}`}
                                        onClick={() => hasCell && onSelectRow(r)}
                                        disabled={!hasCell || isDrawAnimating}
                                        className={`flex items-center justify-center text-[10px] font-bold rounded transition-colors ${
                                            hasCell && !isDrawAnimating
                                                ? 'text-blue-400 hover:bg-blue-50 cursor-pointer'
                                                : 'text-gray-200 cursor-default'
                                        }`}
                                        style={{ width: 20, height: CELL_SIZE }}
                                    >
                                        {hasCell ? '▶' : ''}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Grid */}
                        <div
                            className="grid"
                            style={{
                                gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
                                gap: GAP,
                            }}
                        >
                            {matrix.flat().map((cell, i) => {
                                const r = Math.floor(i / gridSize);
                                const c = i % gridSize;
                                const isAnimHighlight = drawAnimState &&
                                    ((drawAnimState.direction === 'row' && drawAnimState.rowIndex === r && drawAnimState.currentHighlight === c) ||
                                     (drawAnimState.direction === 'column' && drawAnimState.colIndex === c && drawAnimState.currentHighlight === r));
                                const isSettled = drawAnimState?.phase === 'settled' &&
                                    drawAnimState.finalRowIndex === r && drawAnimState.finalColIndex === c;

                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-center rounded-lg font-black text-xl transition-all duration-100 ${
                                            cell === null
                                                ? 'bg-gray-100 border border-gray-200'
                                                : isSettled
                                                    ? 'bg-amber-400 text-white border-2 border-amber-500 scale-110'
                                                    : isAnimHighlight
                                                        ? 'bg-blue-100 border-2 border-blue-400'
                                                        : 'bg-white border border-gray-300 shadow-sm'
                                        }`}
                                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                    >
                                        {cell !== null ? cell.value : ''}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {isPlaying && !isDrawAnimating && (
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={onStand}
                        disabled={score === 0}
                        className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                            score === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                    >
                        {t('停手')}（{score} {t('点')}）
                    </button>
                    {boardEmpty && (
                        <span className="text-sm text-gray-400 self-center">{t('板上已无格子')}</span>
                    )}
                </div>
            )}

            {/* Result display */}
            {result !== 'playing' && (
                <div className="mt-6 text-center">
                    {result === 'bust' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-red-500 mb-1">💥 {t('爆掉了')}!</div>
                            <div className="text-sm text-gray-500">{score} &gt; {BLACKJACK_CONFIG.bustThreshold}</div>
                            <div className="text-sm text-red-500 font-bold mt-2">
                                {t('厄运')} +{BLACKJACK_CONFIG.loseOrBustPenalty}
                            </div>
                        </div>
                    )}
                    {result === 'win' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-green-500 mb-1">🎉 {t('你赢了')}!</div>
                            <div className="text-sm text-gray-500">
                                {t('你')}: {score} vs {t('庄家')}: {dealerScore}
                            </div>
                            <div className="text-sm text-green-500 font-bold mt-2">
                                {t('厄运')} {BLACKJACK_CONFIG.winReward}
                            </div>
                        </div>
                    )}
                    {result === 'lose' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-red-500 mb-1">😞 {t('庄家赢了')}</div>
                            <div className="text-sm text-gray-500">
                                {t('你')}: {score} vs {t('庄家')}: {dealerScore}
                            </div>
                            <div className="text-sm text-red-500 font-bold mt-2">
                                {t('厄运')} +{BLACKJACK_CONFIG.loseOrBustPenalty}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onFinish}
                        className="px-8 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                    >
                        {t('继续')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BlackjackEvent;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/BlackjackEvent.jsx
git commit -m "feat: BlackjackEvent component — board, score, and result UI"
```

---

### Task 6: GameCore — Wire Blackjack Phase

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Import BlackjackEvent component**

Add to the imports at the top of `GameCore.jsx`:

```javascript
import BlackjackEvent from './components/game/BlackjackEvent';
```

- [ ] **Step 2: Destructure blackjack state and actions from useGameLogic**

In the destructuring block (around line 29-48), add:

```javascript
        blackjackState,
        blackjackSelectRow, blackjackSelectColumn,
        completeBlackjackDraw, blackjackStand, blackjackFinish,
```

- [ ] **Step 3: Update draw animation completion to handle blackjack**

In the existing draw animation `useEffect` that calls `completeDrawAnim` when the animation settles (around line 60-75), add a branch:

Find the existing block:
```javascript
        if (drawAnimState.phase === 'settled') {
```

Inside that settled handler, before calling `completeDrawAnim()`, add:

```javascript
            if (phase === 'event_blackjack') {
                const timer = setTimeout(completeBlackjackDraw, 550);
                return () => clearTimeout(timer);
            }
```

This ensures the blackjack draw result is applied after the settled pause, using the same animation timing as normal draws.

- [ ] **Step 4: Add blackjack phase rendering**

After the `{phase === 'drawing' && matrix && (` block (ends around line 348) and before `{phase === 'between_turns' && (`, add:

```jsx
                            {/* Blackjack event phase */}
                            {phase === 'event_blackjack' && matrix && blackjackState && (
                                <BlackjackEvent
                                    matrix={matrix}
                                    blackjackState={blackjackState}
                                    onSelectRow={blackjackSelectRow}
                                    onSelectColumn={blackjackSelectColumn}
                                    onStand={blackjackStand}
                                    onFinish={blackjackFinish}
                                    drawAnimState={drawAnimState}
                                    isDrawAnimating={isDrawAnimating}
                                />
                            )}
```

- [ ] **Step 5: Ensure sidebars render during blackjack phase**

Find the condition that controls sidebar visibility (line ~192):

```javascript
{(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'drawing' || phase === 'between_turns') && (
```

Add `'event_blackjack'` to this condition:

```javascript
{(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'drawing' || phase === 'event_blackjack' || phase === 'between_turns') && (
```

- [ ] **Step 6: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: wire blackjack event phase into GameCore rendering"
```

---

### Task 7: Translations

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add blackjack-related translations**

Add the following entries to the English translations object in `translations.js`:

```javascript
    "21点": "Blackjack",
    "凑点数挑战庄家，赢了减厄运，输了加厄运": "Hit numbers to beat the dealer — win to reduce doom, lose to increase it",
    "事件墙": "Event Wall",
    "当前点数": "Current Score",
    "停手": "Stand",
    "点": "pts",
    "爆掉了": "Busted",
    "你赢了": "You Win",
    "庄家赢了": "Dealer Wins",
    "你": "You",
    "庄家": "Dealer",
    "21点获胜！厄运": "Blackjack win! Doom",
    "爆掉了！厄运": "Busted! Doom",
    "庄家赢了！厄运": "Dealer wins! Doom",
    "板上已无格子": "No cells left on board",
    "继续": "Continue",
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat: add blackjack event i18n translations"
```

---

### Task 8: Smoke Test & Edge Case Fix

**Files:**
- Possibly modify: `src/hooks/useGameLogic.js`, `src/components/game/BlackjackEvent.jsx`

- [ ] **Step 1: Run dev server and manual test**

Run: `npm run dev`

Test checklist:
1. Start a new game, play until wall choice appears
2. Verify event wall sometimes appears among candidates (may need several tries due to weight)
3. Select the blackjack event wall
4. Verify 5×5 grid shows numbers 1-5
5. Select a row/column, verify animation plays and number adds to score
6. Continue drawing until close to 21
7. Click "Stand" — verify dealer score appears and result is shown
8. Draw until score > 21 — verify "Busted" result
9. Click "Continue" — verify returns to between_turns phase
10. Verify doom grid changes correctly after win/loss

- [ ] **Step 2: Handle edge case — board empty before stand**

If the player draws all 25 cells without busting (unlikely but possible), auto-trigger stand. In `completeBlackjackDraw`, after updating the score, add a check:

```javascript
        // Check if board is now empty — auto-stand
        setMatrix(prev => {
            const isEmpty = prev.every(row => row.every(cell => cell === null));
            if (isEmpty && newScore <= BLACKJACK_CONFIG.bustThreshold) {
                // Schedule auto-stand on next tick
                setTimeout(() => blackjackStand(), 0);
            }
            return prev;
        });
```

Note: This should be integrated into the `completeBlackjackDraw` function from Task 3 Step 6 rather than being a separate addition. If the implementer already included it in Task 3, skip this.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: blackjack edge cases and smoke test fixes"
```

(Only if there were actual fixes needed. Skip if smoke test passed clean.)
