# Turn-Based Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the real-time draw + gravity system with a turn-based system: 5×5 grid with visible doom cells, gold economy (5/turn, 1/draw), per-turn doom accumulation, row-only selection.

**Architecture:** Strip the existing `useGameLogic` of gravity, bombs, pools, affixes, orders, and column selection. Replace with turn-based state machine: turn start (generate grid + give gold) → draw phase (spend gold to select rows) → turn end (doom accumulates) → continue/evacuate. Matrix generation produces a 5×5 grid mixing item cells and doom cells. ResourceMatrix renders 5×5 with doom cell icons and row-only selection.

**Tech Stack:** React 18 + Vite 6 + Tailwind CSS 3 + Lucide React. No test suite — manual verification via `npm run dev`.

**Important context:**
- This project uses Chinese as the source language. All UI strings must use `t()` from `useLanguage()`.
- All game state lives in `useGameLogic` hook. Components receive state via props from `GameCore.jsx`.
- Config values live in `src/data/constants.js` and `src/data/matrixConfig.js`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/matrixConfig.js` | Rewrite | 5×5 grid config, doom cell spawn rates |
| `src/data/constants.js` | Modify | HP=5, gold config, doom config updates |
| `src/utils/matrixHelpers.js` | Rewrite | Generate 5×5 grid with items + doom cells, no gravity |
| `src/hooks/useGameLogic.js` | Heavy modify | Turn-based state machine, new draw mechanic, new doom system |
| `src/components/game/ResourceMatrix.jsx` | Rewrite | 5×5 grid display, doom cells, row-only selection |
| `src/GameCore.jsx` | Heavy modify | Turn-based layout, gold/turn display, remove orders/pools UI |

---

## Task 1: Update Configuration

**Files:**
- Rewrite: `src/data/matrixConfig.js`
- Modify: `src/data/constants.js`

- [ ] **Step 1: Rewrite matrixConfig.js**

Replace entire file:

```javascript
/**
 * Matrix Configuration - Turn-Based Prototype
 * 5×5 grid. Each cell is an item or a doom cell.
 * Grid fully refreshes each turn (no gravity).
 */

export const MATRIX_CONFIG = {
  gridSize: 5,

  // Doom cells: independent cells on the grid (not items)
  doomCells: {
    resolution: {
      spawnChance: 0.10,  // 10% per cell position
      icon: '💀',
      name: '厄运结算',
    },
    upgrade: {
      spawnChance: 0.10,  // 10% per cell position
      icon: '⬆️',
      name: '厄运升级',
    },
  },
};
```

- [ ] **Step 2: Update constants.js — DOOM_CONFIG**

Replace the existing `DOOM_CONFIG`:

```javascript
export const DOOM_CONFIG = {
    gridSize: 10,              // 厄运网格格子数
    initialDangerCount: 1,     // 初始"危险"格子数
    initialHP: 5,              // 初始生命值（was 3）
    initialDoomLevel: 1,       // 初始厄运等级
    dangerPerTurn: 1,          // 每回合自动增加的危险格子数
};
```

- [ ] **Step 3: Add TURN_CONFIG to constants.js**

Add after `DOOM_CONFIG`:

```javascript
// --- 回合制配置 ---
export const TURN_CONFIG = {
    goldPerTurn: 5,            // 每回合获得金币
    drawCost: 1,               // 每次抽取花费金币
};
```

- [ ] **Step 4: Update INITIAL_GAME_CONFIG**

Replace the `INITIAL_GAME_CONFIG` export:

```javascript
export const INITIAL_GAME_CONFIG = {
    pools: INITIAL_POOLS_DATA,
    stages: INITIAL_STAGE_CONFIG,
    doom: DOOM_CONFIG,
    turn: TURN_CONFIG,
};
```

- [ ] **Step 5: Verify config loads**

Run: `npm run dev`
Expected: App starts without import errors (game will be broken — that's expected at this stage).

- [ ] **Step 6: Commit**

```bash
git add src/data/matrixConfig.js src/data/constants.js
git commit -m "config: update for turn-based prototype (5x5 grid, HP=5, gold economy, doom cells)"
```

---

## Task 2: Rewrite Matrix Generation

**Files:**
- Rewrite: `src/utils/matrixHelpers.js`

- [ ] **Step 1: Rewrite matrixHelpers.js**

Replace entire file:

```javascript
import { MATRIX_CONFIG } from '../data/matrixConfig';

/**
 * Get a flat list of all normal items from pool data.
 * Each item gets poolId and poolName attached.
 */
function getAllItemsFromPools(pools) {
  const items = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      items.push({
        ...item,
        poolId: pool.id,
        poolName: pool.name,
      });
    }
  }
  return items;
}

/**
 * Generate a single item cell from available items.
 */
function generateItemCell(allItems) {
  const item = allItems[Math.floor(Math.random() * allItems.length)];
  return {
    type: 'item',
    item: item,
    uid: crypto.randomUUID(),
  };
}

/**
 * Generate a 5×5 matrix for one turn.
 * Each cell position independently rolls for doom cells (resolution/upgrade).
 * If no doom cell spawns, the cell is a random item.
 *
 * @param {Array} pools - Pool data from config (INITIAL_POOLS_DATA)
 * @returns {{ grid: Array<Array<object>>, doomCellCount: { resolution: number, upgrade: number } }}
 */
export function generateTurnMatrix(pools) {
  const { gridSize, doomCells } = MATRIX_CONFIG;
  const allItems = getAllItemsFromPools(pools);
  const grid = [];
  const doomCellCount = { resolution: 0, upgrade: 0 };

  for (let row = 0; row < gridSize; row++) {
    const rowCells = [];
    for (let col = 0; col < gridSize; col++) {
      // Roll for doom cells (resolution first, then upgrade)
      const resolutionRoll = Math.random();
      const upgradeRoll = Math.random();

      if (resolutionRoll < doomCells.resolution.spawnChance) {
        rowCells.push({
          type: 'doom_resolution',
          icon: doomCells.resolution.icon,
          name: doomCells.resolution.name,
          uid: crypto.randomUUID(),
        });
        doomCellCount.resolution++;
      } else if (upgradeRoll < doomCells.upgrade.spawnChance) {
        rowCells.push({
          type: 'doom_upgrade',
          icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name,
          uid: crypto.randomUUID(),
        });
        doomCellCount.upgrade++;
      } else {
        rowCells.push(generateItemCell(allItems));
      }
    }
    grid.push(rowCells);
  }

  return { grid, doomCellCount };
}
```

- [ ] **Step 2: Verify no import errors**

Run: `npm run dev`
Expected: App starts (may have runtime errors from useGameLogic — expected).

- [ ] **Step 3: Commit**

```bash
git add src/utils/matrixHelpers.js
git commit -m "feat: rewrite matrix generation for 5x5 turn-based grid with doom cells"
```

---

## Task 3: Turn-Based State Machine

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the largest task. We replace the real-time draw loop with a turn-based state machine. The approach: strip out unused systems first, then add turn state, then wire up the turn flow.

- [ ] **Step 1: Replace imports and initial state**

At the top of `useGameLogic.js`, replace all imports with:

```javascript
import { useState, useMemo } from 'react';
import { generateTurnMatrix } from '../utils/matrixHelpers';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { useLanguage } from '../contexts/LanguageContext';
```

- [ ] **Step 2: Rewrite the entire useGameLogic hook**

Replace the entire `useGameLogic` function body. This is a full rewrite — delete everything inside the function and replace with:

```javascript
export const useGameLogic = (config) => {
    const { t } = useLanguage();

    // --- Configuration ---
    const doomConfig = config.doom || DOOM_CONFIG;
    const turnConfig = config.turn || TURN_CONFIG;
    const maxInventorySize = config.stages[0].inventorySize;

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [gold, setGold] = useState(0);
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);
    const [isDoomResolving, setIsDoomResolving] = useState(false);
    const [doomResolutionResult, setDoomResolutionResult] = useState(null);

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);

    // --- Derived State ---
    const dangerCount = useMemo(() =>
        doomGrid.filter(cell => cell.type === 'danger').length,
        [doomGrid]
    );

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start a new turn: generate grid, give gold */
    const startNewTurn = () => {
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setGold(turnConfig.goldPerTurn);
        setLastDrawResult(null);

        // Generate fresh grid
        const { grid } = generateTurnMatrix(config.pools);
        setMatrix(grid);

        // Doom accumulation (not on first turn)
        if (newTurnNumber > 1) {
            setDoomGrid(prev => {
                const newGrid = [...prev];
                let added = 0;
                for (let i = 0; i < newGrid.length && added < doomConfig.dangerPerTurn; i++) {
                    if (newGrid[i].type === 'empty') {
                        newGrid[i] = { type: 'danger' };
                        added++;
                    }
                }
                return newGrid;
            });
        }

        setPhase('drawing');
    };

    /** Start the game (first turn) */
    const startGame = () => {
        startNewTurn();
    };

    /** End current turn, go to between-turns decision */
    const endTurn = () => {
        setPhase('between_turns');
    };

    /** Continue to next turn */
    const continueToNextTurn = () => {
        startNewTurn();
    };

    // =============================================
    // DRAW MECHANIC
    // =============================================

    /** Select a row to draw from */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing') return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;

        // Get active cells in this row (not yet removed)
        const row = matrix[rowIndex];
        const activeCells = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null) {
                activeCells.push({ cell, colIndex });
            }
        });

        if (activeCells.length === 0) return;

        // Spend gold
        setGold(prev => prev - turnConfig.drawCost);

        // 1. Auto-trigger all doom cells in the row
        const doomEffects = { resolutions: 0, upgrades: 0 };
        const doomCellIndices = [];

        activeCells.forEach(({ cell, colIndex }) => {
            if (cell.type === 'doom_resolution') {
                doomEffects.resolutions++;
                doomCellIndices.push(colIndex);
            } else if (cell.type === 'doom_upgrade') {
                doomEffects.upgrades++;
                doomCellIndices.push(colIndex);
            }
        });

        // 2. Random draw from ALL active cells
        const randomIndex = Math.floor(Math.random() * activeCells.length);
        const drawnEntry = activeCells[randomIndex];
        const drawnCell = drawnEntry.cell;
        const drawnColIndex = drawnEntry.colIndex;

        // 3. Process draw result
        let obtainedItem = null;
        if (drawnCell.type === 'item') {
            obtainedItem = drawnCell;
        }
        // If drawn cell is a doom cell, no item obtained (白抽)

        // 4. Remove drawn cell + all triggered doom cells from matrix
        setMatrix(prev => {
            const newMatrix = prev.map(r => [...r]);
            // Remove the drawn cell
            newMatrix[rowIndex][drawnColIndex] = null;
            // Remove triggered doom cells
            doomCellIndices.forEach(colIdx => {
                newMatrix[rowIndex][colIdx] = null;
            });
            return newMatrix;
        });

        // 5. Add item to inventory if obtained
        if (obtainedItem) {
            addToInventory(obtainedItem);
        }

        // 6. Apply doom effects
        if (doomEffects.upgrades > 0) {
            setDoomLevel(prev => prev + doomEffects.upgrades);
            showToast(t('厄运升级') + ` +${doomEffects.upgrades}`, 'warning');
        }

        if (doomEffects.resolutions > 0) {
            // Queue doom resolutions
            for (let i = 0; i < doomEffects.resolutions; i++) {
                resolveDoom();
            }
        }

        // 7. Set draw result for UI feedback
        setLastDrawResult({
            rowIndex,
            colIndex: drawnColIndex,
            obtained: obtainedItem,
            doomEffects,
        });
    };

    // =============================================
    // INVENTORY
    // =============================================

    const addToInventory = (itemCell) => {
        setInventory(prev => {
            if (prev.length >= maxInventorySize) {
                // Inventory full — for prototype, show toast and discard
                showToast(t('背包已满'), 'error');
                return prev;
            }
            return [...prev, {
                name: itemCell.item.name,
                icon: itemCell.item.icon,
                poolId: itemCell.item.poolId,
                uid: itemCell.uid,
            }];
        });
    };

    // =============================================
    // DOOM RESOLUTION
    // =============================================

    const resolveDoom = () => {
        // Cursor lands on doomLevel random cells in the doom grid
        const hits = [];
        let hpLoss = 0;

        for (let i = 0; i < doomLevel; i++) {
            const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
            const cell = doomGrid[cellIndex];
            if (cell.type === 'danger') {
                hits.push({ index: cellIndex, result: 'danger' });
                hpLoss++;
            } else {
                hits.push({ index: cellIndex, result: 'empty' });
            }
        }

        // Apply HP loss
        if (hpLoss > 0) {
            setHp(prev => {
                const newHp = Math.max(0, prev - hpLoss);
                if (newHp <= 0) {
                    handleGameOver();
                }
                return newHp;
            });
            showToast(t('厄运命中') + ` -${hpLoss} HP`, 'error');
        }

        setDoomResolutionResult({ hits, hpLoss });
    };

    // =============================================
    // EVACUATION & GAME OVER
    // =============================================

    const handleEvacuate = () => {
        setModalContent('evacuated');
        setPhase('game_over');
    };

    const handleGameOver = () => {
        // Lose half inventory
        setInventory(prev => {
            const count = Math.ceil(prev.length / 2);
            const shuffled = [...prev].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, prev.length - count);
        });
        setModalContent('game_over');
        setPhase('game_over');
    };

    const handleReset = () => {
        setTurnNumber(0);
        setGold(0);
        setPhase('pre_game');
        setMatrix(null);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setDoomLevel(doomConfig.initialDoomLevel);
        setIsDoomResolving(false);
        setDoomResolutionResult(null);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
    };

    // =============================================
    // UTILITY
    // =============================================

    const showToast = (message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
    };

    // =============================================
    // RETURN
    // =============================================

    return {
        // Turn state
        turnNumber,
        gold,
        phase,

        // Grid
        matrix,
        lastDrawResult,

        // Doom
        hp,
        doomGrid,
        doomLevel,
        dangerCount,
        isDoomResolving,
        doomResolutionResult,

        // Inventory
        inventory,
        maxInventorySize,

        // UI
        toast,
        modalContent,

        // Actions
        startGame,
        selectRow,
        endTurn,
        continueToNextTurn,
        handleEvacuate,
        handleReset,
    };
};
```

- [ ] **Step 3: Verify hook compiles**

Run: `npm run dev`
Expected: Hook loads without errors. GameCore will have errors because it references removed state/functions — that's expected.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: rewrite useGameLogic as turn-based state machine"
```

---

## Task 4: Rewrite ResourceMatrix Component

**Files:**
- Rewrite: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: Rewrite ResourceMatrix.jsx**

Replace entire file:

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 5×5 grid display for turn-based prototype.
 * Shows item cells and doom cells. Row-only selection.
 */
const ResourceMatrix = ({ matrix, onSelectRow, gold, drawCost, phase }) => {
    const { t } = useLanguage();

    if (!matrix) return null;

    const canDraw = phase === 'drawing' && gold >= drawCost;

    const getCellContent = (cell) => {
        if (cell === null) {
            return <span className="text-gray-300">·</span>;
        }
        if (cell.type === 'item') {
            return <span className="text-xl">{cell.item.icon}</span>;
        }
        if (cell.type === 'doom_resolution') {
            return <span className="text-xl">{cell.icon}</span>;
        }
        if (cell.type === 'doom_upgrade') {
            return <span className="text-xl">{cell.icon}</span>;
        }
        return null;
    };

    const getCellStyle = (cell) => {
        if (cell === null) return 'bg-gray-100 border-gray-200';
        if (cell.type === 'item') return 'bg-white border-gray-300';
        if (cell.type === 'doom_resolution') return 'bg-red-50 border-red-300';
        if (cell.type === 'doom_upgrade') return 'bg-orange-50 border-orange-300';
        return 'bg-white border-gray-300';
    };

    const getCellLabel = (cell) => {
        if (cell === null) return '';
        if (cell.type === 'item') return cell.item.name;
        if (cell.type === 'doom_resolution') return cell.name;
        if (cell.type === 'doom_upgrade') return cell.name;
        return '';
    };

    const getRowDoomInfo = (row) => {
        let resolutions = 0;
        let upgrades = 0;
        row.forEach(cell => {
            if (cell?.type === 'doom_resolution') resolutions++;
            if (cell?.type === 'doom_upgrade') upgrades++;
        });
        return { resolutions, upgrades };
    };

    const getRowActiveCount = (row) => {
        return row.filter(cell => cell !== null).length;
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="text-center text-sm text-gray-500 mb-1">
                {t('选择一行抽取')}
            </div>
            {matrix.map((row, rowIndex) => {
                const doomInfo = getRowDoomInfo(row);
                const activeCount = getRowActiveCount(row);
                const hasActiveCells = activeCount > 0;
                const rowClickable = canDraw && hasActiveCells;

                return (
                    <div key={rowIndex} className="flex items-center gap-1">
                        {/* Row select button */}
                        <button
                            onClick={() => rowClickable && onSelectRow(rowIndex)}
                            disabled={!rowClickable}
                            className={`
                                w-8 h-8 rounded text-xs font-bold flex-shrink-0
                                transition-all duration-150
                                ${rowClickable
                                    ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                            title={rowClickable ? t('抽取此行') : t('无法抽取')}
                        >
                            ▶
                        </button>

                        {/* Grid cells */}
                        {row.map((cell, colIndex) => (
                            <div
                                key={colIndex}
                                className={`
                                    w-14 h-14 border rounded flex flex-col items-center justify-center
                                    ${getCellStyle(cell)}
                                `}
                                title={getCellLabel(cell)}
                            >
                                {getCellContent(cell)}
                                {cell !== null && cell.type === 'item' && (
                                    <span className="text-[9px] text-gray-500 leading-none mt-0.5 truncate max-w-[48px]">
                                        {cell.item.name}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Row doom indicators */}
                        <div className="flex-shrink-0 w-16 text-xs text-gray-400 ml-1">
                            {doomInfo.resolutions > 0 && (
                                <span className="text-red-500">💀×{doomInfo.resolutions} </span>
                            )}
                            {doomInfo.upgrades > 0 && (
                                <span className="text-orange-500">⬆️×{doomInfo.upgrades}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ResourceMatrix;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/ResourceMatrix.jsx
git commit -m "feat: rewrite ResourceMatrix for 5x5 turn-based grid with doom cells"
```

---

## Task 5: Rewrite GameCore Layout

**Files:**
- Modify: `src/GameCore.jsx`

This is the most complex UI task. We strip the existing 3-column layout (orders / matrix / inventory) and replace with a focused turn-based layout.

- [ ] **Step 1: Rewrite GameCore.jsx**

Replace the entire file with:

```jsx
import React from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import { useLanguage } from './contexts/LanguageContext';
import Toast from './components/ui/Toast';

const GameCore = () => {
    const { t } = useLanguage();

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const {
        turnNumber, gold, phase,
        matrix, lastDrawResult,
        hp, doomGrid, doomLevel, dangerCount,
        doomResolutionResult,
        inventory, maxInventorySize,
        toast, modalContent,
        startGame, selectRow, endTurn, continueToNextTurn,
        handleEvacuate, handleReset,
    } = state;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold">{t('三池物语')} <span className="text-sm text-gray-400">— {t('回合制原型')}</span></h1>
                    <button
                        onClick={handleReset}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                        {t('重置')}
                    </button>
                </div>

                {/* Status Bar */}
                <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg shadow-sm border text-sm">
                    <div>❤️ <span className="font-bold">{hp}</span> HP</div>
                    <div>💰 <span className="font-bold">{gold}</span> {t('金币')}</div>
                    <div>📅 {t('回合')} <span className="font-bold">{turnNumber}</span></div>
                    <div>💀 {t('厄运等级')} <span className="font-bold">{doomLevel}</span></div>
                    <div>🎒 <span className="font-bold">{inventory.length}/{maxInventorySize}</span></div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('三池物语')}</h2>
                        <p className="text-gray-500 mb-8">{t('回合制原型')}</p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始游戏')}
                        </button>
                    </div>
                )}

                {/* Drawing phase */}
                {phase === 'drawing' && matrix && (
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                        {/* Left: Grid */}
                        <div>
                            <ResourceMatrix
                                matrix={matrix}
                                onSelectRow={selectRow}
                                gold={gold}
                                drawCost={INITIAL_GAME_CONFIG.turn.goldPerTurn ? 1 : 1}
                                phase={phase}
                            />

                            {/* Draw result feedback */}
                            {lastDrawResult && (
                                <div className={`mt-3 p-2 rounded text-sm ${
                                    lastDrawResult.obtained
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {lastDrawResult.obtained
                                        ? `${t('获得')}: ${lastDrawResult.obtained.item.icon} ${lastDrawResult.obtained.item.name}`
                                        : t('未获得物品')
                                    }
                                </div>
                            )}

                            {/* End turn button */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={endTurn}
                                    className="px-6 py-2 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                                >
                                    {t('结束回合')}
                                </button>
                                {gold <= 0 && (
                                    <span className="text-sm text-gray-400 self-center">{t('金币已用完')}</span>
                                )}
                            </div>
                        </div>

                        {/* Right: Doom Grid + Inventory */}
                        <div className="w-64 flex flex-col gap-4">
                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('厄运网格')}</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {doomGrid.map((cell, i) => (
                                        <div
                                            key={i}
                                            className={`w-10 h-10 rounded flex items-center justify-center text-sm border
                                                ${cell.type === 'danger'
                                                    ? 'bg-red-100 border-red-300 text-red-600 font-bold'
                                                    : 'bg-gray-50 border-gray-200 text-gray-300'
                                                }`}
                                        >
                                            {cell.type === 'danger' ? '☠' : '·'}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {t('危险')}: {dangerCount}/{doomGrid.length}
                                </div>
                            </div>

                            {/* Inventory */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('背包')} ({inventory.length}/{maxInventorySize})</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        return (
                                            <div
                                                key={i}
                                                className={`w-10 h-10 rounded flex items-center justify-center text-lg border
                                                    ${item
                                                        ? 'bg-white border-gray-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                                title={item?.name || ''}
                                            >
                                                {item ? item.icon : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Between turns */}
                {phase === 'between_turns' && (
                    <div className="text-center py-12">
                        <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                        <p className="text-gray-500 mb-2">
                            {t('背包')}: {inventory.length}/{maxInventorySize} | HP: {hp} | {t('厄运等级')}: {doomLevel}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('下回合将增加')} {doomConfig?.dangerPerTurn || 1} {t('个危险格子')}
                        </p>

                        {/* Doom Grid preview */}
                        <div className="inline-block mb-6">
                            <div className="grid grid-cols-5 gap-1">
                                {doomGrid.map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-xs border
                                            ${cell.type === 'danger'
                                                ? 'bg-red-100 border-red-300 text-red-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-300'
                                            }`}
                                    >
                                        {cell.type === 'danger' ? '☠' : '·'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={continueToNextTurn}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('继续下一回合')}
                            </button>
                            <button
                                onClick={handleEvacuate}
                                className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                            >
                                {t('撤离')}（{inventory.length} {t('个物品')}）
                            </button>
                        </div>
                    </div>
                )}

                {/* Game over / Evacuated */}
                {phase === 'game_over' && (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-4">
                            {modalContent === 'evacuated' ? t('安全撤离') : t('游戏结束')}
                        </h2>
                        <p className="text-gray-500 mb-2">
                            {t('回合')}: {turnNumber} | {t('收集物品')}: {inventory.length}
                        </p>
                        {modalContent === 'game_over' && (
                            <p className="text-red-500 mb-4">{t('失去了一半物品')}</p>
                        )}

                        {/* Show inventory */}
                        {inventory.length > 0 && (
                            <div className="inline-block mb-6">
                                <h3 className="text-sm text-gray-500 mb-2">{t('带出的物品')}</h3>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {inventory.map((item, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded border border-gray-300 bg-white flex items-center justify-center text-lg"
                                            title={item.name}
                                        >
                                            {item.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('再来一局')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Doom resolution result */}
                {doomResolutionResult && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg">
                        <div className="text-sm">
                            💀 {t('厄运结算')}:
                            {doomResolutionResult.hits.map((hit, i) => (
                                <span key={i} className={`ml-1 ${hit.result === 'danger' ? 'text-red-400' : 'text-gray-400'}`}>
                                    {hit.result === 'danger' ? '💥' : '·'}
                                </span>
                            ))}
                            {doomResolutionResult.hpLoss > 0 && (
                                <span className="text-red-400 ml-2">-{doomResolutionResult.hpLoss} HP</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
            </div>
        </div>
    );
};

export default GameCore;
```

- [ ] **Step 2: Verify app renders**

Run: `npm run dev`
Expected: App shows "三池物语 — 回合制原型" with "开始游戏" button. Clicking starts the game with a 5×5 grid.

- [ ] **Step 3: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: rewrite GameCore for turn-based layout"
```

---

## Task 6: Update App.jsx Entry Point

**Files:**
- Modify: `src/App.jsx`

The current App.jsx may pass extra props to GameCore that no longer exist. We need to simplify it.

- [ ] **Step 1: Read current App.jsx to understand what it does**

Check how App.jsx wraps GameCore — it likely passes config, handles reset callbacks, or wraps with providers.

- [ ] **Step 2: Simplify App.jsx**

Ensure App.jsx renders GameCore without passing removed props (like `config`, `initialSkills`, `onReset`, `initialScore`). The new `useGameLogic` takes only `config` which GameCore handles internally now.

If App.jsx passes props to GameCore:
```jsx
// Old: <GameCore config={config} onReset={handleReset} initialScore={score} />
// New: <GameCore />
```

GameCore now internally imports `INITIAL_GAME_CONFIG` and calls `useGameLogic(INITIAL_GAME_CONFIG)`.

- [ ] **Step 3: Verify full app flow**

Run: `npm run dev`
Expected: Full game loop works:
1. Click "开始游戏" → 5×5 grid appears with doom cells
2. Click row buttons → draw items, doom cells trigger
3. Click "结束回合" → between-turns screen with continue/evacuate
4. Click "继续下一回合" → new grid, doom accumulates
5. Click "撤离" → game over screen with inventory

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: simplify App.jsx for turn-based prototype"
```

---

## Task 7: Add Missing Translations

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add turn-based prototype translations**

Add to the English translations object:

```javascript
// Turn-based prototype
'回合制原型': 'Turn-Based Prototype',
'开始游戏': 'Start Game',
'回合': 'Turn',
'金币': 'Gold',
'选择一行抽取': 'Select a row to draw',
'抽取此行': 'Draw from this row',
'无法抽取': 'Cannot draw',
'结束回合': 'End Turn',
'金币已用完': 'No gold remaining',
'继续下一回合': 'Continue to Next Turn',
'下回合将增加': 'Next turn will add',
'个危险格子': 'danger cell(s)',
'安全撤离': 'Safe Evacuation',
'收集物品': 'Items Collected',
'失去了一半物品': 'Lost half of your items',
'带出的物品': 'Items Brought Out',
'再来一局': 'Play Again',
'获得': 'Obtained',
'未获得物品': 'No item obtained',
'厄运升级': 'Doom Upgrade',
'厄运命中': 'Doom Hit',
'厄运结算': 'Doom Resolution',
'厄运网格': 'Doom Grid',
'厄运等级': 'Doom Level',
'危险': 'Danger',
'背包已满': 'Inventory Full',
'结束': 'Ended',
'个物品': 'item(s)',
'重置': 'Reset',
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat: add translations for turn-based prototype"
```

---

## Task 8: End-to-End Verification and Cleanup

**Files:**
- Possibly modify: any file with import errors or lint issues

- [ ] **Step 1: Run lint check**

Run: `npm run lint`
Fix any errors (likely: unused imports in files we didn't touch that reference old helpers).

- [ ] **Step 2: Run build check**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 3: Full manual playtest**

Run: `npm run dev` and verify the complete game loop:

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Load page | See "三池物语 — 回合制原型" with Start button |
| 2 | Click "开始游戏" | 5×5 grid appears, 5 gold, Turn 1, HP 5 |
| 3 | Click a row button | Spend 1 gold, get item or blank draw; doom cells in row trigger |
| 4 | Click row with 💀 | Doom resolution fires, see result popup |
| 5 | Click row with ⬆️ | Doom level increases, see toast |
| 6 | Draw 5 times | Gold reaches 0, row buttons disabled |
| 7 | Click "结束回合" | Between-turns screen, see doom grid with +1 danger |
| 8 | Click "继续下一回合" | New grid, Turn 2, 5 gold, doom grid has more danger |
| 9 | Play until HP=0 | Game over screen, inventory halved |
| 10 | Click "再来一局" | Back to start screen |
| 11 | Play and click "撤离" | Evacuation screen, full inventory shown |

- [ ] **Step 4: Fix any issues found during playtest**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: cleanup and verify turn-based prototype"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Update configuration | matrixConfig.js, constants.js |
| 2 | Rewrite matrix generation | matrixHelpers.js |
| 3 | Turn-based state machine | useGameLogic.js |
| 4 | Rewrite grid component | ResourceMatrix.jsx |
| 5 | Rewrite game layout | GameCore.jsx |
| 6 | Update App entry point | App.jsx |
| 7 | Add translations | translations.js |
| 8 | End-to-end verification | any remaining fixes |
