# V3 Core Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core v3 prototype systems — free draws, wall color system with unlock conditions, phase-based doom, new cell types — transforming v2 into the v3 gameplay feel.

**Architecture:** Data-first approach. Create v3Config.js as the new data source for wall colors, cell distributions, and doom phases. Modify matrixHelpers.js to generate walls by color. Update useGameLogic.js for free draws, gold economy, draw count tracking, wall unlocks, and new doom system. Update UI components for new wall selection, cell types, and resource display.

**Tech Stack:** React 18, Vite, Tailwind CSS 3, existing hooks/component architecture.

**Spec Document:** `design_docs/v3_prototype_rules.md`

---

## Scope

### In Scope (this plan)
- Free draws (remove gold-per-draw cost)
- Gold as persistent strategic resource (carries over turns)
- Wall color system (5 colors with content ratio differences)
- Wall unlock conditions (draw count + optional gold cost)
- Draw count tracking per wall
- Refresh count resource (re-roll 3 candidate walls)
- Phase-based doom accumulation (safe/slow/fast/danger periods)
- Auto-increment doom resolution N by turn range
- New cell types: ⬛ doom accumulation, 💥 damage, 🚪 evacuation
- Remove old cell types: 💣 bomb, 📋 order cell, ⬆️ doom upgrade
- Updated wall generation by color (content ratios from v3 spec)
- Sticker count per wall: 2-4 (was 3-4)
- game_rules.md update to v3

### Deferred (follow-up plans)
- Wall functions (long-term: shop, pawnshop, storage, etc.)
- Persistent effects (bag expansion, gold rush, harvest, etc.)
- Instant effects (gold vault, inspiration, special order, etc.)
- Order system gold cost (buy orders with gold instead of free accept)
- 4 evacuation types (draw/gold/normal countdown/emergency)
- Order auto-refill on bulletin

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/data/v3Config.js` | Create | Wall colors, content ratios, unlock templates, doom phases, cell configs |
| `src/data/matrixConfig.js` | Modify | Update cell types (remove bomb/order/doom_upgrade, add damage/doom_accum/evacuation) |
| `src/data/constants.js` | Modify | Update DOOM_CONFIG, TURN_CONFIG, INITIAL_GAME_CONFIG for v3 |
| `src/data/v2Config.js` | Modify | Remove WALL_TYPES, update WALL_STICKER_COUNT |
| `src/utils/matrixHelpers.js` | Modify | Generate walls by color with content ratios |
| `src/hooks/useGameLogic.js` | Modify | Free draws, gold economy, draw count, wall unlocks, doom phases, refresh count |
| `src/components/game/WallPicker.jsx` | Modify | Color-coded walls, unlock conditions, refresh button |
| `src/components/game/ResourceMatrix.jsx` | Modify | New cell type rendering |
| `src/GameCore.jsx` | Modify | New resource display (refresh count), remove gold-per-draw UI, updated doom info |
| `src/utils/translations.js` | Modify | New translation strings |
| `design_docs/game_rules.md` | Modify | Replace v2 rules with v3 |

---

### Task 1: v3 Data Configuration

**Files:**
- Create: `src/data/v3Config.js`
- Modify: `src/data/matrixConfig.js`
- Modify: `src/data/constants.js`
- Modify: `src/data/v2Config.js`

- [ ] **Step 1: Create v3Config.js with wall colors and unlock templates**

```js
/**
 * v3Config.js — v3 data foundations
 * Wall colors, content ratios, unlock conditions, doom phases
 */

// --- Wall Color Definitions ---
export const WALL_COLORS = [
    {
        id: 'brown',
        name: '棕色墙',
        icon: '🟫',
        system: '长期功能',
        // Content ratios for 25-cell wall (base values, ±1-2 random)
        baseDistribution: { sticker: 10, gold: 6, negative: 5, evacuation: 0.5 },
        // Negative breakdown: doom_resolution, doom_accumulation, damage
        negativeBreakdown: { doom_resolution: 2, doom_accumulation: 2, damage: 1 },
        stickerRange: [2, 3],
    },
    {
        id: 'yellow',
        name: '黄色墙',
        icon: '🟨',
        system: '金币经济',
        baseDistribution: { sticker: 8, gold: 9, negative: 5, evacuation: 0.5 },
        negativeBreakdown: { doom_resolution: 2, doom_accumulation: 2, damage: 1 },
        stickerRange: [2, 3],
    },
    {
        id: 'green',
        name: '绿色墙',
        icon: '🟩',
        system: '收集与订单',
        baseDistribution: { sticker: 15, gold: 2, negative: 5, evacuation: 0.5 },
        negativeBreakdown: { doom_resolution: 2, doom_accumulation: 2, damage: 1 },
        stickerRange: [3, 4],
    },
    {
        id: 'red',
        name: '红色墙',
        icon: '🟥',
        system: '生存与撤离',
        baseDistribution: { sticker: 9, gold: 3, negative: 9, evacuation: 1 },
        negativeBreakdown: { doom_resolution: 3, doom_accumulation: 3, damage: 3 },
        stickerRange: [2, 3],
    },
    {
        id: 'blue',
        name: '蓝色墙',
        icon: '🟦',
        system: '导航与探索',
        baseDistribution: { sticker: 13, gold: 3, negative: 3, evacuation: 0.5 },
        negativeBreakdown: { doom_resolution: 1, doom_accumulation: 1, damage: 1 },
        stickerRange: [2, 4],
    },
];

// --- Unlock Condition Templates ---
// Each wall gets a random unlock condition from its pool
export const UNLOCK_TEMPLATES = {
    drawOnly: [
        { draws: 3 },
        { draws: 4 },
        { draws: 5 },
        { draws: 6 },
        { draws: 7 },
        { draws: 8 },
        { draws: 10 },
    ],
    drawAndGold: [
        { draws: 3, gold: 3 },
        { draws: 4, gold: 3 },
        { draws: 5, gold: 5 },
        { draws: 8, gold: 5 },
    ],
};

// --- Doom Phase Configuration ---
export const DOOM_PHASES = [
    { name: '安全期', turnRange: [1, 4],  interval: Infinity },  // no accumulation
    { name: '缓慢期', turnRange: [5, 8],  interval: 2 },         // every 2 turns
    { name: '加速期', turnRange: [9, 12], interval: 1 },         // every turn
    { name: '危险期', turnRange: [13, Infinity], interval: 1 },   // every turn
];

// --- Doom Resolution Draws by Turn ---
export const DOOM_RESOLUTION_DRAWS = [
    { turnRange: [1, 6],  draws: 1 },
    { turnRange: [7, 12], draws: 2 },
    { turnRange: [13, Infinity], draws: 3 },
];

// --- Initial Per-Expedition State ---
export const V3_INITIAL_STATE = {
    hp: 5,
    gold: 5,
    refreshCount: 1,
    backpackCapacity: 15,
    bulletinOrders: 5,
    doomGrid: { size: 10, initialDanger: 0 },
};
```

- [ ] **Step 2: Update matrixConfig.js for v3 cell types**

Replace the doom cells and special cells sections:

```js
export const MATRIX_CONFIG = {
  gridSize: 5,

  // Doom/negative cells on the grid
  doomCells: {
    resolution: {
      icon: '💀',
      name: '厄运结算',
    },
    accumulation: {
      icon: '⬛',
      name: '厄运积累',
    },
    damage: {
      icon: '💥',
      name: '伤害',
    },
  },

  // Special cells
  specialCells: {
    gold: {
      icon: '💰',
      name: '金币',
      goldRange: [1, 2],
    },
    evacuation: {
      icon: '🚪',
      name: '撤离',
    },
  },

  // Item shape system unchanged
  itemShapes: { /* ... keep existing ... */ },
};
```

- [ ] **Step 3: Update constants.js — DOOM_CONFIG and TURN_CONFIG for v3**

```js
export const DOOM_CONFIG = {
    gridSize: 10,
    initialDangerCount: 0,     // v3: starts at 0
    initialHP: 5,
};

export const TURN_CONFIG = {
    initialGold: 5,            // v3: starting gold per expedition
    // drawCost removed — draws are free in v3
};
```

- [ ] **Step 4: Update v2Config.js — remove WALL_TYPES, update sticker count**

Remove `WALL_TYPES` export. Update `WALL_STICKER_COUNT`:

```js
export const WALL_STICKER_COUNT = {
    min: 2,
    max: 4,
};
```

- [ ] **Step 5: Commit**

```bash
git add src/data/v3Config.js src/data/matrixConfig.js src/data/constants.js src/data/v2Config.js
git commit -m "feat(v3): data config — wall colors, doom phases, cell types, economy constants"
```

---

### Task 2: Wall Generation by Color

**Files:**
- Modify: `src/utils/matrixHelpers.js`

- [ ] **Step 1: Rewrite generateWall to accept wallColor config**

The function should:
1. Accept a wallColor object (from WALL_COLORS) and sticker types
2. Use wallColor.baseDistribution to determine cell counts (with ±1-2 random variance)
3. Use wallColor.negativeBreakdown for doom/damage cell distribution
4. Place negative cells first (doom_resolution, doom_accumulation, damage)
5. Place gold cells
6. Place evacuation cells (probability-based from distribution)
7. Fill remaining with stickers

```js
export function generateWall(wallStickers, wallColor) {
  const { gridSize, doomCells, specialCells, itemShapes } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const cellCounts = { doom_resolution: 0, doom_accumulation: 0, damage: 0, gold: 0, evacuation: 0, sticker: 0 };

  const dist = wallColor.baseDistribution;
  const neg = wallColor.negativeBreakdown;

  // Apply ±1-2 random variance
  const vary = (base) => Math.max(0, base + Math.round((Math.random() - 0.5) * 3));

  const targetNeg = {
    doom_resolution: vary(neg.doom_resolution),
    doom_accumulation: vary(neg.doom_accumulation),
    damage: vary(neg.damage),
  };
  const targetGold = vary(dist.gold);
  const targetEvac = Math.random() < dist.evacuation ? 1 : 0;

  // Shuffle all positions
  const allPositions = [];
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      allPositions.push([r, c]);
  allPositions.sort(() => Math.random() - 0.5);

  let posIdx = 0;

  // Place negative cells
  for (const [type, count] of Object.entries(targetNeg)) {
    for (let i = 0; i < count && posIdx < allPositions.length; i++) {
      const [r, c] = allPositions[posIdx++];
      const cellConfig = type === 'doom_resolution' ? doomCells.resolution
        : type === 'doom_accumulation' ? doomCells.accumulation
        : doomCells.damage;
      grid[r][c] = { type, icon: cellConfig.icon, name: cellConfig.name, uid: generateUID() };
      cellCounts[type]++;
    }
  }

  // Place gold cells
  for (let i = 0; i < targetGold && posIdx < allPositions.length; i++) {
    const [r, c] = allPositions[posIdx++];
    const [min, max] = specialCells.gold.goldRange;
    grid[r][c] = {
      type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name,
      goldAmount: min + Math.floor(Math.random() * (max - min + 1)), uid: generateUID(),
    };
    cellCounts.gold++;
  }

  // Place evacuation cells
  for (let i = 0; i < targetEvac && posIdx < allPositions.length; i++) {
    const [r, c] = allPositions[posIdx++];
    grid[r][c] = {
      type: 'evacuation', icon: specialCells.evacuation.icon, name: specialCells.evacuation.name,
      uid: generateUID(),
    };
    cellCounts.evacuation++;
  }

  // Fill remaining with sticker shapes (reuse existing polyomino algorithm)
  // ... (keep existing Phase 3 logic)

  return { grid, cellCounts };
}
```

- [ ] **Step 2: Update pickWallStickers to support 2-4 range**

```js
export function pickWallStickers(allStickers, min = 2, max = 4) {
  // ... same logic, just default min changed from 3 to 2
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/matrixHelpers.js
git commit -m "feat(v3): wall generation by color — content ratios, new cell types"
```

---

### Task 3: Core Game Logic — Free Draws, Gold Economy, Draw Count

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Add new state variables**

```js
// --- v3 State ---
const [drawCount, setDrawCount] = useState(0);       // draws on current wall
const [totalDrawCount, setTotalDrawCount] = useState(0); // total draws this expedition
const [refreshCount, setRefreshCount] = useState(1);  // wall refresh resource
const [currentWallColor, setCurrentWallColor] = useState(null); // wall color config
```

- [ ] **Step 2: Remove gold-per-draw cost from selectRow/selectColumn**

In both `selectRow` and `selectColumn`:
- Remove the gold check: `if (gold < turnConfig.drawCost) return;`
- Remove gold deduction: `setGold(prev => prev - turnConfig.drawCost);`
- Add draw count increment: `setDrawCount(prev => prev + 1); setTotalDrawCount(prev => prev + 1);`

- [ ] **Step 3: Update startNewTurn — remove gold refresh, add doom phase logic**

```js
const startNewTurn = () => {
    const newTurnNumber = turnNumber + 1;
    setTurnNumber(newTurnNumber);
    setLastDrawResult(null);
    setDoomResolutionResult(null);
    setDrawCount(0); // reset per-wall draw count

    // v3 Doom accumulation — phase-based
    if (newTurnNumber > 1) {
        const phase = DOOM_PHASES.find(p => newTurnNumber >= p.turnRange[0] && newTurnNumber <= p.turnRange[1]);
        if (phase && phase.interval !== Infinity) {
            // Check if this turn triggers accumulation
            const turnsInPhase = newTurnNumber - phase.turnRange[0];
            if (turnsInPhase % phase.interval === 0) {
                setDoomGrid(prev => {
                    const newGrid = [...prev];
                    for (let i = 0; i < newGrid.length; i++) {
                        if (newGrid[i].type === 'empty') {
                            newGrid[i] = { type: 'danger' };
                            break;
                        }
                    }
                    return newGrid;
                });
            }
        }
    }

    setLastDrawDirection(null);
    // Generate 3 candidate walls with colors
    generateWallCandidates();
    setPhase('wall_choice');
};
```

- [ ] **Step 4: Add wall candidate generation with unlock conditions**

```js
const generateWallCandidates = () => {
    const candidates = [];
    for (let i = 0; i < 3; i++) {
        const wallColor = WALL_COLORS[Math.floor(Math.random() * WALL_COLORS.length)];
        const stickerRange = wallColor.stickerRange || [2, 4];
        const stickers = pickWallStickers(STICKER_TYPES, stickerRange[0], stickerRange[1]);
        const { grid, cellCounts } = generateWall(stickers, wallColor);

        // Generate unlock condition
        const templates = Math.random() < 0.5 ? UNLOCK_TEMPLATES.drawOnly : UNLOCK_TEMPLATES.drawAndGold;
        const unlock = templates[Math.floor(Math.random() * templates.length)];

        candidates.push({ stickers, grid, cellCounts, wallColor, unlockCondition: { ...unlock } });
    }
    setWallCandidates(candidates);
};
```

- [ ] **Step 5: Add wall unlock check + refresh logic**

```js
const canUnlockWall = (candidate) => {
    const cond = candidate.unlockCondition;
    if (cond.draws && drawCount < cond.draws) return false;
    if (cond.gold && gold < cond.gold) return false;
    return true;
};

const selectWall = (index) => {
    if (!wallCandidates || !wallCandidates[index]) return;
    const chosen = wallCandidates[index];
    if (!canUnlockWall(chosen)) return;

    // Pay gold cost if any
    if (chosen.unlockCondition.gold) {
        setGold(prev => prev - chosen.unlockCondition.gold);
    }

    setCurrentWallColor(chosen.wallColor);
    setCurrentWallType(null); // wall types removed in v3
    setMatrix(chosen.grid);
    setWallCandidates(null);
    setDrawCount(0);
    setPhase('drawing');
};

const refreshWallCandidates = () => {
    if (refreshCount <= 0) return;
    setRefreshCount(prev => prev - 1);
    generateWallCandidates();
};
```

- [ ] **Step 6: Update startGame for v3 initial state**

```js
const startGame = () => {
    // ... existing bonus items logic ...
    setExpeditionNumber(prev => prev + 1);
    setGold(V3_INITIAL_STATE.gold);       // v3: 5 starting gold
    setRefreshCount(V3_INITIAL_STATE.refreshCount); // v3: 1 starting refresh

    // Seed initial bulletin (keep existing logic)
    // ...

    startNewTurn();
};
```

- [ ] **Step 7: Update handleReset and startNextExpedition for v3 state**

Reset drawCount, totalDrawCount, refreshCount, currentWallColor in both functions.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat(v3): free draws, gold economy, draw count tracking, wall unlock conditions"
```

---

### Task 4: Doom System Overhaul

**Files:**
- Modify: `src/hooks/useGameLogic.js`

- [ ] **Step 1: Update doom initial state**

```js
const [doomGrid, setDoomGrid] = useState(() => {
    const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
    // v3: start with 0 danger (was 1 in v2)
    return grid;
});
// Remove doomLevel state — v3 uses turn-based auto N instead
```

- [ ] **Step 2: Replace doomLevel with getDoomDraws function**

```js
const getDoomDraws = (turn) => {
    for (const phase of DOOM_RESOLUTION_DRAWS) {
        if (turn >= phase.turnRange[0] && turn <= phase.turnRange[1]) {
            return phase.draws;
        }
    }
    return 3; // fallback for very late turns
};
```

- [ ] **Step 3: Update completeDrawAnim for new cell types**

Handle new cell types:
- `doom_accumulation`: Add 1 danger to doom grid (was doom_upgrade which increased doom level)
- `damage`: -1 HP directly
- `evacuation`: Offer player choice to evacuate (can refuse)
- Remove `bomb` and `order_cell` handling

```js
if (drawnCell.type === 'doom_accumulation') {
    setDoomGrid(prev => {
        const newGrid = [...prev];
        for (let i = 0; i < newGrid.length; i++) {
            if (newGrid[i].type === 'empty') {
                newGrid[i] = { type: 'danger' };
                break;
            }
        }
        return newGrid;
    });
    showToast(t('厄运积累') + ' +1', 'warning');
} else if (drawnCell.type === 'damage') {
    const newHp = Math.max(0, hp - 1);
    setHp(newHp);
    showToast('💥 -1 HP', 'error');
    if (newHp <= 0) {
        handleGameOver();
        return;
    }
} else if (drawnCell.type === 'evacuation') {
    // Set a flag for the UI to show evacuation option
    setLastDrawResult({
        rowIndex: finalRowIndex, colIndex: finalColIndex,
        obtained: null, doomEffects: {}, isEvacuationOffer: true,
    });
}
```

- [ ] **Step 4: Update resolveDoom to use turn-based draws**

```js
const resolveDoom = (action = null) => {
    if (action) setAfterDoomAction(action);
    const draws = getDoomDraws(turnNumber);
    const finalSelections = [];
    for (let i = 0; i < draws; i++) {
        const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
        const isHit = doomGrid[cellIndex].type === 'danger';
        finalSelections.push({ index: cellIndex, isHit });
    }
    // ... rest of animation setup same as before
};
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat(v3): doom overhaul — phase-based accumulation, turn-based draws, new cell types"
```

---

### Task 5: Wall Picker UI — Colors & Unlock Conditions

**Files:**
- Modify: `src/components/game/WallPicker.jsx`

- [ ] **Step 1: Redesign WallPicker for color-coded walls with unlock progress**

```jsx
const WALL_COLOR_STYLE = {
    brown:  { bg: 'bg-amber-50',  border: 'border-amber-400', ring: 'ring-amber-300',  badge: 'bg-amber-600' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-400', ring: 'ring-yellow-300', badge: 'bg-yellow-500' },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-400', ring: 'ring-emerald-300', badge: 'bg-emerald-600' },
    red:    { bg: 'bg-red-50',    border: 'border-red-400', ring: 'ring-red-300',    badge: 'bg-red-600' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-400', ring: 'ring-blue-300',  badge: 'bg-blue-600' },
};

const WallPicker = ({ candidates, onSelect, onRefresh, refreshCount, drawCount, gold }) => {
    const { t } = useLanguage();

    const canUnlock = (wall) => {
        const c = wall.unlockCondition;
        return (!c.draws || drawCount >= c.draws) && (!c.gold || gold >= c.gold);
    };

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <div className="flex items-center justify-center gap-2 mb-5">
                <p className="text-[11px] text-gray-400">{t('满足解锁条件即可进入')}</p>
                {refreshCount > 0 && (
                    <button onClick={onRefresh}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600 font-bold border border-indigo-200 hover:bg-indigo-200">
                        🔄 {t('刷新')} ({refreshCount})
                    </button>
                )}
            </div>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => {
                    const style = WALL_COLOR_STYLE[wall.wallColor.id] || WALL_COLOR_STYLE.blue;
                    const unlocked = canUnlock(wall);
                    return (
                        <button key={idx} onClick={() => unlocked && onSelect(idx)}
                            disabled={!unlocked}
                            className={`w-56 p-4 rounded-xl shadow-md border-2 transition-all duration-150 text-left
                                ${unlocked
                                    ? `${style.bg} ${style.border} hover:shadow-lg hover:scale-[1.02] cursor-pointer`
                                    : 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{wall.wallColor.icon}</span>
                                <span className="text-sm font-bold">{t(wall.wallColor.name)}</span>
                            </div>

                            {/* Stickers */}
                            <div className="text-[9px] text-gray-300 uppercase tracking-wide mb-1">{t('贴纸')}</div>
                            <div className="flex gap-1 mb-3">
                                {wall.stickers.map(s => (
                                    <div key={s.id} className="w-7 h-7 rounded border border-gray-300 bg-white flex items-center justify-center text-sm shadow-sm" title={t(s.name)}>
                                        {s.icon}
                                    </div>
                                ))}
                            </div>

                            {/* Negative cells count */}
                            <div className="text-[10px] text-red-500 font-bold mb-2">
                                💀 {(wall.cellCounts.doom_resolution || 0) + (wall.cellCounts.doom_accumulation || 0) + (wall.cellCounts.damage || 0)} {t('负面格')}
                            </div>

                            {/* Unlock condition */}
                            <div className={`text-[10px] font-bold p-1.5 rounded-md ${unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                {unlocked ? '✅ ' + t('可进入') : (
                                    <>
                                        🔒 {wall.unlockCondition.draws && `${t('抽取')} ${drawCount}/${wall.unlockCondition.draws}`}
                                        {wall.unlockCondition.gold && ` + 💰${wall.unlockCondition.gold}`}
                                    </>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/WallPicker.jsx
git commit -m "feat(v3): wall picker UI — color-coded walls with unlock conditions"
```

---

### Task 6: ResourceMatrix — New Cell Types

**Files:**
- Modify: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: Add tooltip and style support for new cell types**

In `CellTooltip`:
```js
} else if (cell.type === 'doom_accumulation') {
    icon = cell.icon; name = t(cell.name);
    desc = t('抽中时厄运网格+1危险符号');
} else if (cell.type === 'damage') {
    icon = cell.icon; name = t(cell.name);
    desc = t('抽中时直接-1生命值');
} else if (cell.type === 'evacuation') {
    icon = cell.icon; name = t(cell.name);
    desc = t('抽中时可选择立即撤离');
}
```

In `GridCell` — hasTip check:
```js
const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_accumulation'
    || cell.type === 'damage' || cell.type === 'gold' || cell.type === 'evacuation'
    || cell.type === 'out_of_game');
```

In cell background:
```js
} else if (cell.type === 'doom_accumulation') {
    bgClass = 'bg-gray-800 border-gray-600';
} else if (cell.type === 'damage') {
    bgClass = 'bg-orange-100 border-orange-400';
} else if (cell.type === 'evacuation') {
    bgClass = 'bg-emerald-100 border-emerald-400';
}
```

Remove bomb and order_cell handling.

- [ ] **Step 2: Update getCellContent for new cell types**

Remove bomb rendering. Add evacuation rendering. Update doom_upgrade → doom_accumulation.

- [ ] **Step 3: Update draw availability check — remove gold requirement**

```js
const canDraw = phase === 'drawing' && !disabled;
// Remove: gold >= drawCost check
```

- [ ] **Step 4: Commit**

```bash
git add src/components/game/ResourceMatrix.jsx
git commit -m "feat(v3): grid display — new cell types, remove bomb/order cells, free draw"
```

---

### Task 7: GameCore UI Updates

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Add refresh count to resource bar**

```jsx
<div className="flex items-center gap-1">
    <span className="text-indigo-400 text-xs">🔄</span>
    <span className="text-sm font-black text-indigo-600">{refreshCount}</span>
</div>
```

- [ ] **Step 2: Update WallPicker props**

```jsx
{phase === 'wall_choice' && wallCandidates && (
    <WallPicker
        candidates={wallCandidates}
        onSelect={selectWall}
        onRefresh={refreshWallCandidates}
        refreshCount={refreshCount}
        drawCount={drawCount}
        gold={gold}
    />
)}
```

- [ ] **Step 3: Remove gold-per-draw display in drawing phase**

Remove `drawCost` prop from ResourceMatrix. Remove "金币已用完" message since draws are free.

- [ ] **Step 4: Update doom display — show turn-based draws instead of doom level**

Replace `×{doomLevel}` with draws from current turn: `×{getDoomDraws(turnNumber)}`.

- [ ] **Step 5: Update between-turns display for v3**

Show doom phase info. Remove "下回合将增加 1 个危险格子" (now phase-dependent). Add draw count display.

- [ ] **Step 6: Handle evacuation offer from 🚪 cell**

When `lastDrawResult?.isEvacuationOffer`, show a modal/inline prompt asking player to evacuate or continue.

- [ ] **Step 7: Update version label**

Change "v2" to "v3" in pre_game screen.

- [ ] **Step 8: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat(v3): GameCore UI — refresh count, free draws, doom phases, evacuation offer"
```

---

### Task 8: Translations

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add new v3 translation strings**

```js
// --- V3 Wall Colors ---
"棕色墙": "Brown Wall",
"黄色墙": "Yellow Wall",
"绿色墙": "Green Wall",
"红色墙": "Red Wall",
"蓝色墙": "Blue Wall",
"满足解锁条件即可进入": "Unlock conditions met to enter",
"可进入": "Unlocked",
"负面格": "negative cells",
"刷新": "Refresh",
"抽中时厄运网格+1危险符号": "Draws: +1 danger to Doom Grid",
"抽中时直接-1生命值": "Draws: -1 HP directly",
"抽中时可选择立即撤离": "Draws: option to evacuate immediately",
"厄运积累": "Doom Accumulation",
"伤害": "Damage",
"撤离格": "Evacuation Cell",
"是否撤离？": "Evacuate?",
"继续": "Continue",
"抽取次数": "Draw Count",
// --- V3 Doom phases ---
"安全期": "Safe Phase",
"缓慢期": "Slow Phase",
"加速期": "Accelerating",
"危险期": "Danger Phase",
```

- [ ] **Step 2: Remove obsolete v2 strings**

Remove translations for bomb, order cell, doom upgrade, alternating wall, etc.

- [ ] **Step 3: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat(v3): translations — wall colors, new cell types, doom phases"
```

---

### Task 9: Update game_rules.md

**Files:**
- Modify: `design_docs/game_rules.md`

- [ ] **Step 1: Replace game_rules.md content with v3 rules**

Copy the content from `design_docs/v3_prototype_rules.md` into `design_docs/game_rules.md`, updating the header to indicate it is now the canonical rules document (not a prototype draft).

Update version label: "回合制原型 v3"

- [ ] **Step 2: Add "已移除/未启用系统" section**

Add note about v2 systems that were removed: wall types (basic/hidden/drift/multiplier/alternating), bomb cells, order cells on wall, per-draw gold cost, doom upgrade cells, doom level system.

- [ ] **Step 3: Commit**

```bash
git add design_docs/game_rules.md
git commit -m "docs: update game_rules.md to v3 — wall colors, free draws, doom phases"
```

---

## Verification

After all tasks:
1. `npm run dev` — verify app loads without errors
2. Start a new game — verify wall color selection with unlock conditions
3. Draw freely (no gold cost) — verify draw count increments
4. Observe doom phase transitions across turns
5. Verify new cell types (⬛ 💥 🚪) appear and function
6. Verify gold carries over between turns
7. Test wall refresh button
