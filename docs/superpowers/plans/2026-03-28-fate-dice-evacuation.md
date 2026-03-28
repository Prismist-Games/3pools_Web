# Fate Dice Evacuation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple evacuation from milestones, introduce fate dice as a new evacuation trigger on the spatial item map, and preserve inventory across evacuations.

**Architecture:** Three interlinked changes: (1) Remove evacuation cells from milestone generation and decouple milestone refresh to trigger only on full completion. (2) Change evacuation settlement to reset gold but keep inventory. (3) Add fate dice as a new item type that spawns on the spatial map, rolls 1–6 when drawn, and can be submitted from inventory to trigger evacuation when the sum meets a threshold.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, existing hook-based game logic architecture.

**No test suite** exists in this project. Verification is manual via `npm run dev`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/data/constants.js` | Add `FATE_DICE_CONFIG` |
| Modify | `src/data/gridConstants.js` | Remove `evacuationCellCount` |
| Modify | `src/data/spatialConstants.js` | Export fate dice config for spatial system |
| Modify | `src/utils/gridGenerator.js` | Remove evacuation cell placement (Step 4) |
| Modify | `src/utils/spatialPoolHelpers.js` | Add fate dice spawning to item cells |
| Modify | `src/hooks/useGameLogic.js` | Core logic: milestone completion, fate dice drawing, dice evacuation mode, inventory preservation |
| Modify | `src/components/game/GridCell.jsx` | Remove evacuation marker (🚀) rendering |
| Modify | `src/components/game/ItemMap.jsx` | Render fate dice cells with distinct visuals |
| Modify | `src/components/game/InventorySlot.jsx` | Render fate dice items with dice value badge |
| Modify | `src/GameCore.jsx` | Fate dice evacuation UI (button, selection mode, confirm) |
| Modify | `src/utils/translations.js` | English translations for new strings |

---

## Task 1: Add Fate Dice Configuration

**Files:**
- Modify: `src/data/constants.js` (after TOOL_ITEM_CONFIG, ~line 261)
- Modify: `src/data/spatialConstants.js` (add export)

- [ ] **Step 1: Add FATE_DICE_CONFIG to constants.js**

Add after the `TOOL_ITEM_CONFIG` block (~line 261):

```js
// --- 命运骰子配置 ---
export const FATE_DICE_CONFIG = {
    spawnChance: 0.15,          // 每个物品格子刷新为命运骰子的概率
    icon: '🎲',
    name: '命运骰子',
    minValue: 1,
    maxValue: 6,
    evacuationThreshold: 7,    // 撤离所需的点数总和
};
```

- [ ] **Step 2: Export fate dice config from spatialConstants.js**

Add import at top of `src/data/spatialConstants.js`:

```js
import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, FATE_DICE_CONFIG } from './constants.js';
```

Add at bottom of `src/data/spatialConstants.js`:

```js
// --- Fate dice config re-export for spatial system ---
export { FATE_DICE_CONFIG };
```

- [ ] **Step 3: Verify** — `npm run dev` compiles without errors.

- [ ] **Step 4: Commit**

```
feat: add fate dice configuration
```

---

## Task 2: Remove Evacuation from Milestones

**Files:**
- Modify: `src/data/gridConstants.js:8` — remove `evacuationCellCount`
- Modify: `src/utils/gridGenerator.js:440-515` — remove evacuation placement code
- Modify: `src/components/game/GridCell.jsx:50-52` — remove 🚀 rendering

- [ ] **Step 1: Remove evacuationCellCount from gridConstants.js**

In `src/data/gridConstants.js`, remove line 8:

```js
// REMOVE this line:
evacuationCellCount: 1,
```

The `GRID_CONFIG` object should now be:

```js
export const GRID_CONFIG = {
  canvasSize: 5,
  cellCount: { min: 8, max: 12 },
  taskCount: { min: 3, max: 5 },
  taskSize: { min: 2, max: 4 },
};
```

- [ ] **Step 2: Remove evacuation placement from gridGenerator.js**

In `generateMilestone()` function (`src/utils/gridGenerator.js`), the destructure on line 441 currently reads:

```js
const { canvasSize, cellCount, taskCount, taskSize, evacuationCellCount } = GRID_CONFIG;
```

Change to:

```js
const { canvasSize, cellCount, taskCount, taskSize } = GRID_CONFIG;
```

Then **delete the entire Step 4 block** (lines 481–515) — the evacuation marker placement code. This is the block starting with:

```js
// Step 4: Place evacuation marker(s) — only on cells belonging to ≥2 tasks
```

and ending before:

```js
// Step 5: Compute grid bounds
```

Also remove `evacuationIndices` from the return value. Change the return (line 531-537) from:

```js
return {
    cells,
    tasks,
    gridBounds,
    evacuationIndices,
    isComplete: false,
};
```

to:

```js
return {
    cells,
    tasks,
    gridBounds,
    isComplete: false,
};
```

- [ ] **Step 3: Remove evacuation marker rendering from GridCell.jsx**

In `src/components/game/GridCell.jsx`, remove the evacuation marker JSX (lines 50-52):

```jsx
{cell.hasEvacuation && (
  <span className="text-xs leading-none">🚀</span>
)}
```

- [ ] **Step 4: Verify** — `npm run dev`, open game, milestone grid should render without 🚀 markers.

- [ ] **Step 5: Commit**

```
feat: remove evacuation cells from milestone generation
```

---

## Task 3: Add Fate Dice Spawning to Spatial Item Map

**Files:**
- Modify: `src/utils/spatialPoolHelpers.js:65-93` — `generateItemMap()` and `refreshCoveredCells()`
- Modify: `src/data/spatialConstants.js` — import fate dice config

- [ ] **Step 1: Modify generateItemMap() to spawn fate dice**

In `src/utils/spatialPoolHelpers.js`, add import at top:

```js
import {
  ALL_ITEMS,
  QUALITY_EFFECTS,
  FIXED_SHAPE,
  MAP_ROWS,
  MAP_COLS,
  EFFECT_SLOT_COUNT,
  FATE_DICE_CONFIG,
} from '../data/spatialConstants.js';
```

In `generateItemMap()`, modify the grid-building loop (line 82-92). Replace:

```js
  // 3. Build grid
  const grid = [];
  let itemIdx = 0;
  let effectIdx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (effectSet.has(`${r},${c}`)) {
        row.push({ isEffect: true, effect: effects[effectIdx++] });
      } else {
        row.push(shuffled[itemIdx++ % shuffled.length]);
      }
    }
    grid.push(row);
  }
  return grid;
```

With:

```js
  // 3. Build grid
  const grid = [];
  let itemIdx = 0;
  let effectIdx = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (effectSet.has(`${r},${c}`)) {
        row.push({ isEffect: true, effect: effects[effectIdx++] });
      } else if (Math.random() < FATE_DICE_CONFIG.spawnChance) {
        row.push({ isFateDice: true, icon: FATE_DICE_CONFIG.icon, name: FATE_DICE_CONFIG.name });
      } else {
        row.push(shuffled[itemIdx++ % shuffled.length]);
      }
    }
    grid.push(row);
  }
  return grid;
```

- [ ] **Step 2: Modify refreshCoveredCells() to respect fate dice spawn chance**

In `refreshCoveredCells()`, replace the item refresh line:

```js
    newMap[r][c] = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
```

With:

```js
    if (Math.random() < FATE_DICE_CONFIG.spawnChance) {
      newMap[r][c] = { isFateDice: true, icon: FATE_DICE_CONFIG.icon, name: FATE_DICE_CONFIG.name };
    } else {
      newMap[r][c] = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
    }
```

- [ ] **Step 3: Verify** — `npm run dev`, observe item map. Some cells should occasionally show dice data (may not be visible yet without UI changes — confirm no errors in console).

- [ ] **Step 4: Commit**

```
feat: add fate dice spawning to spatial item map
```

---

## Task 4: Render Fate Dice on Item Map

**Files:**
- Modify: `src/components/game/ItemMap.jsx` — render fate dice cells with distinct visuals

- [ ] **Step 1: Add fate dice cell rendering in ItemMap.jsx**

Find the cell rendering code inside ItemMap.jsx where each grid cell is rendered. The cell currently checks `cell.isEffect` for effect cells and renders item icon + name for regular cells.

Add a fate dice branch. In the cell content rendering, add a check for `cell.isFateDice` alongside the existing `cell.isEffect` check. Fate dice cells should have:
- A distinctive background (e.g., indigo/violet gradient)
- The dice icon (🎲) displayed prominently
- A small label like "命运" or the dice icon

The exact location depends on the JSX structure, but the pattern is:

```jsx
{cell.isFateDice ? (
  // Fate dice cell
  <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 rounded-lg border-2 border-indigo-300">
    <span className="text-xl">{cell.icon}</span>
  </div>
) : cell.isEffect ? (
  // ... existing effect cell rendering
) : (
  // ... existing item cell rendering
)}
```

- [ ] **Step 2: Ensure fate dice cells participate in draw highlighting**

In the draw animation logic, fate dice cells should behave like item cells (not effect cells). They can be the "drawn" cell in the 2×2 frame. No special animation handling needed — the existing item cell animation applies.

The `drawAnimInfo` highlight/fly/exit/enter phases should work for fate dice cells the same as item cells since they occupy item cell positions.

- [ ] **Step 3: Verify** — `npm run dev`, fate dice cells should appear on the item map with distinct visuals. Approximately 15% of non-effect cells should be dice.

- [ ] **Step 4: Commit**

```
feat: render fate dice cells on spatial item map
```

---

## Task 5: Handle Fate Dice Drawing in Game Logic

**Files:**
- Modify: `src/hooks/useGameLogic.js:551-644` — `handleMapPlace()`
- Modify: `src/hooks/useGameLogic.js:259-270` — near `createItem()`

- [ ] **Step 1: Add createFateDice helper in useGameLogic.js**

Add after the `createItem` function (~line 270):

```js
const createFateDice = () => {
    const value = Math.floor(Math.random() * FATE_DICE_CONFIG.maxValue) + FATE_DICE_CONFIG.minValue;
    const DICE_ICONS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return {
        name: FATE_DICE_CONFIG.name,
        icon: DICE_ICONS[value - 1],
        uid: Math.random().toString(36).substr(2, 9),
        isFateDice: true,
        diceValue: value,
        rarity: config.rarity.find(r => r.id === 'common') || config.rarity[0],
        sterile: true,
    };
};
```

Also add the import at the top of the file:

```js
import { FATE_DICE_CONFIG } from '../data/constants';
```

(Add `FATE_DICE_CONFIG` to the existing import from `'../data/constants'`.)

- [ ] **Step 2: Modify handleMapPlace() to handle fate dice cells**

In `handleMapPlace()` (line 551), the code currently separates `itemCells` and `effectCell`:

```js
const itemCells = coverage.filter(c => !c.item.isEffect);
const effectCell = coverage.find(c => c.item.isEffect);
```

Change to also filter out fate dice from item cells, and collect them separately:

```js
const itemCells = coverage.filter(c => !c.item.isEffect && !c.item.isFateDice);
const fateDiceCells = coverage.filter(c => c.item.isFateDice);
const effectCell = coverage.find(c => c.item.isEffect);
```

Then, after the existing draw executes (in the Phase 3 setTimeout at line 627), add fate dice processing. The fate dice items should be added to inventory alongside the normal draw.

In the passive-effect branch (after line 596), modify to handle fate dice. Replace the block:

```js
// For passive effects (or no effect): pick random item from item cells
if (itemCells.length === 0) return;

const drawnIndex = Math.floor(Math.random() * itemCells.length);
const drawnCell = itemCells[drawnIndex];
```

With:

```js
// Combine item cells and fate dice cells for random draw
const drawableCells = [...itemCells, ...fateDiceCells];
if (drawableCells.length === 0) return;

const drawnIndex = Math.floor(Math.random() * drawableCells.length);
const drawnCell = drawableCells[drawnIndex];
const drawnIsFateDice = drawnCell.item.isFateDice;
```

Then modify the `makePool` function to handle the fate dice case. When the drawn cell is a fate dice, we bypass the normal pool/draw flow and directly create a fate dice item:

```js
const makePool = () => {
    if (drawnIsFateDice) return null; // fate dice bypasses pool system
    const items = affixKey === 'fragmented' ? poolItems : [drawnCell.item];
    return {
        name: 'spatial',
        items,
        affixKey,
        affix: affixConfig,
        cost,
        originalId: 'spatial',
        id: 'spatial',
    };
};
```

In Phase 3 (the setTimeout where `handleDraw(makePool())` is called), replace:

```js
handleDraw(makePool());
```

With:

```js
if (drawnIsFateDice) {
    // Fate dice: deduct cost, create dice, add to inventory
    const finalCost = affixConfig ? affixConfig.cost : DEFAULT_DRAW.cost;
    if (gold < finalCost) {
        showToast(t("金币不足！"), "error");
        setDrawAnimInfo(null);
        return;
    }
    setGold(prev => prev - finalCost);
    const dice = createFateDice();
    handleIncomingItems([dice]);
    showToast(`${t("获得命运骰子")}: ${dice.icon} (${dice.diceValue}${t("点")})`, 'info');
} else {
    handleDraw(makePool());
}
```

- [ ] **Step 3: Update poolItems to exclude fate dice cells**

In the `makePool` function, `poolItems` is derived from `itemCells.map(c => c.item)`. Since we already filter fate dice out of `itemCells`, this is already correct. No extra change needed.

- [ ] **Step 4: Verify** — `npm run dev`, draw on a fate dice cell. A dice with random value should appear in inventory. Console should show no errors.

- [ ] **Step 5: Commit**

```
feat: handle fate dice drawing from spatial map
```

---

## Task 6: Render Fate Dice in Inventory

**Files:**
- Modify: `src/components/game/InventorySlot.jsx`

- [ ] **Step 1: Add fate dice visual treatment in InventorySlot.jsx**

Add a `isFateDice` check alongside the existing `isToolItem` check. In the component body, add:

```js
const isFateDice = item?.isFateDice;
```

Add a dice item style string (similar to `toolItemStyle`):

```js
const fateDiceStyle = isFateDice
    ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 ring-1 ring-indigo-200/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
    : '';
```

In the button's className, add the fate dice style. Change the item styling conditional from:

```jsx
? isToolItem
    ? toolItemStyle
    : `${item.rarity?.color || ...}`
```

To:

```jsx
? isFateDice
    ? fateDiceStyle
    : isToolItem
        ? toolItemStyle
        : `${item.rarity?.color || ...}`
```

- [ ] **Step 2: Add dice value badge**

After the tool item badge (`{isToolItem && (...)}`), add a fate dice badge:

```jsx
{isFateDice && (
    <div className="absolute top-0 right-0 p-0.5 rounded-bl-lg z-10">
        <div className="bg-indigo-600 text-white rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-sm">
            {item.diceValue}
        </div>
    </div>
)}
```

- [ ] **Step 3: Exclude fate dice from synthesis, recycling, and tool targeting**

In the `isDisabled` logic (line 105), add fate dice to the exclusion for trade-in selection:

```js
const isDisabled = isAssigned || (isMultiSelectMode && !item) || (isReference && (!item || item.isScoreItem || item.isToolItem || item.isFateDice)) || isPendingSlot;
```

- [ ] **Step 4: Verify** — `npm run dev`, draw a fate dice, it should appear in inventory with indigo styling and a value badge.

- [ ] **Step 5: Commit**

```
feat: render fate dice items in inventory with distinct visuals
```

---

## Task 7: Decouple Milestone Refresh from Evacuation

**Files:**
- Modify: `src/hooks/useGameLogic.js:1081-1188` — `handleFillCell()`, `handleEvacuationContinue()`

- [ ] **Step 1: Add milestone completion detection in handleFillCell()**

In `handleFillCell()`, after the task completion check and reward calculation (after line 1125), add full-milestone completion detection:

```js
// Check if ALL tasks are now completed → refresh milestone
const allTasksComplete = updatedTasks.every(task => task.isCompleted);
```

Then, after all state updates are applied (after line 1141), add:

```js
if (allTasksComplete) {
    // Milestone fully completed — generate new milestone after brief delay
    showToast(t('里程碑完成！进入下一个里程碑'), 'epic');
    setTimeout(() => {
        setMilestoneNumber(prev => prev + 1);
        setMilestone(null); // triggers re-generation via useEffect
    }, 800);
}
```

- [ ] **Step 2: Remove evacuation trigger from handleFillCell()**

Remove the evacuation-related code from `handleFillCell()`. Delete:

```js
let triggerEvacuation = false;
```

And inside the `for (const task of newlyCompleted)` loop, delete:

```js
if (task.cellIndices.some(idx => updatedCells[idx].hasEvacuation)) {
    triggerEvacuation = true;
}
```

And at the bottom, delete:

```js
if (triggerEvacuation) {
    setEvacuationReady(true);
    showToast(t('撤离已就绪！点击撤离按钮离开'), 'info');
}
```

- [ ] **Step 3: Modify handleEvacuationContinue() to keep inventory**

Change `handleEvacuationContinue()` from:

```js
const handleEvacuationContinue = () => {
    setGold(config.global?.initialGold || currentStageConfig.initialGold);
    setMilestoneNumber(prev => prev + 1);
    setMilestone(null);
    setModalContent(null);
    setInventory([]);
    setPendingItem(null);
    setPendingQueue([]);
    setSelectedSlot(null);
    setSelectedIndices([]);
    setIsSubmitMode(false);
    setIsEvacuationMode(false);
    setEvacuationReady(false);
    setItemMap(generateItemMap());
};
```

To a simpler gold-reset-only function (will be called by fate dice submission):

```js
const handleEvacuationContinue = () => {
    setGold(config.global?.initialGold || currentStageConfig.initialGold);
    setModalContent(null);
    setSelectedSlot(null);
    setSelectedIndices([]);
    setIsSubmitMode(false);
    setIsEvacuationMode(false);
    setEvacuationReady(false);
    // Inventory is preserved — no clearing
    // Milestone is preserved — no regeneration
    // Item map is preserved
};
```

- [ ] **Step 4: Verify** — `npm run dev`, complete all tasks in a milestone. A new milestone should auto-generate. Inventory should be preserved.

- [ ] **Step 5: Commit**

```
feat: decouple milestone refresh from evacuation, auto-refresh on full completion
```

---

## Task 8: Implement Fate Dice Evacuation Mode

**Files:**
- Modify: `src/hooks/useGameLogic.js` — add dice submission state and logic

- [ ] **Step 1: Add dice submission state**

In the state declarations area (~line 46-51), add:

```js
const [isDiceSubmitMode, setIsDiceSubmitMode] = useState(false);
```

- [ ] **Step 2: Add computed values for dice submission**

After the existing `useMemo` blocks (~line 220), add:

```js
// Fate dice in inventory
const fateDiceIndices = useMemo(() => {
    return inventory
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item && item.isFateDice)
        .map(({ idx }) => idx);
}, [inventory]);

const selectedDiceSum = useMemo(() => {
    if (!isDiceSubmitMode || selectedIndices.length === 0) return 0;
    return selectedIndices.reduce((sum, idx) => {
        const item = inventory[idx];
        return sum + (item?.isFateDice ? item.diceValue : 0);
    }, 0);
}, [isDiceSubmitMode, selectedIndices, inventory]);

const canEvacuate = isDiceSubmitMode && selectedDiceSum >= FATE_DICE_CONFIG.evacuationThreshold;
```

- [ ] **Step 3: Add toggleDiceSubmitMode()**

Add after the existing `toggleRecycleMode` function:

```js
const toggleDiceSubmitMode = () => {
    if (isDiceSubmitMode) {
        setIsDiceSubmitMode(false);
        setSelectedIndices([]);
    } else {
        if (fateDiceIndices.length === 0) {
            showToast(t("背包中没有命运骰子！"), 'error');
            return;
        }
        setIsDiceSubmitMode(true);
        setSelectedSlot(null);
        setSelectedIndices([]);
        setIsRecycleMode(false);
        setIsSubmitMode(false);
    }
};
```

- [ ] **Step 4: Add handleConfirmDiceEvacuation()**

```js
const handleConfirmDiceEvacuation = () => {
    if (!canEvacuate) return;

    // Remove submitted dice from inventory
    const submittedSet = new Set(selectedIndices);
    const newInventory = inventory.filter((_, idx) => !submittedSet.has(idx));
    setInventory(newInventory);

    // Reset gold
    setGold(config.global?.initialGold || currentStageConfig.initialGold);

    // Clean up mode state
    setIsDiceSubmitMode(false);
    setSelectedIndices([]);
    setSelectedSlot(null);

    showToast(t('撤离成功！金币已重置'), 'epic');
};
```

- [ ] **Step 5: Modify handleSlotClick to support dice selection mode**

In the existing `handleSlotClick` function, add a branch for `isDiceSubmitMode`. The dice submit mode should only allow selecting fate dice items. Find where `handleSlotClick` handles `isRecycleMode` and add a similar branch before it:

```js
// Dice submit mode: toggle selection of fate dice items
if (isDiceSubmitMode) {
    const item = inventory[index];
    if (!item || !item.isFateDice) return;
    setSelectedIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
    return;
}
```

- [ ] **Step 6: Export new state and actions**

In the return statement, add to `state`:

```js
isDiceSubmitMode,
fateDiceIndices,
selectedDiceSum,
canEvacuate,
```

Add to `actions`:

```js
toggleDiceSubmitMode,
handleConfirmDiceEvacuation,
```

- [ ] **Step 7: Block other modes when dice submit is active**

In `handleDraw()` (line 647), add `isDiceSubmitMode` to the guard:

```js
if (pendingItem || isSubmitMode || isRecycleMode || isDiceSubmitMode || selectionMode || pendingQueue.length > 0) return;
```

In `handleMapPlace()` (line 552), add the same guard. After `if (drawAnimInfo) return;`:

```js
if (isDiceSubmitMode) return;
```

- [ ] **Step 8: Verify** — `npm run dev`, draw some fate dice, toggle dice submit mode via code or console. Selection and sum calculation should work.

- [ ] **Step 9: Commit**

```
feat: implement fate dice evacuation mode with selection and submission
```

---

## Task 9: Fate Dice Evacuation UI in GameCore

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Destructure new state and actions**

In the state destructure block (~line 30-43), add:

```js
isDiceSubmitMode, fateDiceIndices, selectedDiceSum, canEvacuate,
```

In the actions destructure block (~line 45-68), add:

```js
toggleDiceSubmitMode,
handleConfirmDiceEvacuation,
```

- [ ] **Step 2: Remove old evacuation button**

Remove the old evacuation button block (lines 376-383):

```jsx
{evacuationReady && (
    <button
        onClick={handleTriggerEvacuation}
        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all animate-pulse"
    >
        🚀 {t('撤离')}
    </button>
)}
```

- [ ] **Step 3: Add fate dice evacuation button to action buttons area**

In the action buttons section (~line 641-665), add the fate dice evacuation button. After the recycle mode buttons and before the trade-in cancel button, add:

```jsx
{!isDiceSubmitMode && !isRecycleMode && !pendingItem && !selectionMode && fateDiceIndices.length > 0 && (
    <button
        onClick={toggleDiceSubmitMode}
        className="w-full flex items-center justify-center gap-2 bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold py-3 px-6 rounded-xl shadow-sm hover:bg-indigo-200 transition-transform active:scale-95"
    >
        🎲 {t("撤离")}
    </button>
)}

{isDiceSubmitMode && (
    <div className="flex flex-col gap-2">
        <div className="text-center text-sm font-bold text-indigo-700 bg-indigo-50 rounded-lg py-2 px-3 border border-indigo-200">
            🎲 {selectedDiceSum} / {FATE_DICE_CONFIG.evacuationThreshold}
        </div>
        <button
            onClick={handleConfirmDiceEvacuation}
            disabled={!canEvacuate}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${
                canEvacuate
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
        >
            🚀 {t("确认撤离")}
        </button>
        <button
            onClick={toggleDiceSubmitMode}
            className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50"
        >
            {t("取消")}
        </button>
    </div>
)}
```

Also import `FATE_DICE_CONFIG` at the top of GameCore.jsx:

```js
import { SKILL_DEFINITIONS, FATE_DICE_CONFIG } from './data/constants';
```

- [ ] **Step 4: Add dice submit mode status indicator**

In the status bar area (~line 539-553), after the `toolSelectionMode` indicator, add:

```jsx
{isDiceSubmitMode && (
    <span className="text-xs font-bold text-indigo-600 animate-pulse flex items-center gap-1">
        🎲 {t("撤离模式: 选择命运骰子")} ({selectedDiceSum}/{FATE_DICE_CONFIG.evacuationThreshold})
    </span>
)}
```

- [ ] **Step 5: Update inventory slot isSubmitMode prop for dice mode**

In the `InventorySlot` rendering (~line 611-636), the `isSubmitMode` prop is currently hardcoded to `false`. Change it to reflect dice submit mode for fate dice items:

```jsx
isSubmitMode={isDiceSubmitMode}
```

This enables the blue selection styling on selected dice items.

- [ ] **Step 6: Style dice submit mode background**

In the inventory section className (~line 460-465), add:

```jsx
${isDiceSubmitMode ? 'bg-indigo-50/95' : ''}
```

- [ ] **Step 7: Disable map interaction during dice submit mode**

In the ItemMap `disabled` prop (~line 398):

```jsx
disabled={!!pendingItem || isSubmitMode || isRecycleMode || isDiceSubmitMode || !!selectionMode}
```

- [ ] **Step 8: Remove old evacuation modal content**

The `evacuation_triggered` and `evacuation_success` modal branches in `renderModal()` (lines 161-240) are no longer triggered by the new flow. They can be kept for now (dead code) or removed. Recommend removing to keep the code clean:

Remove the entire `modalContent.type === 'evacuation_triggered'` branch (lines 161-188) and the `modalContent.type === 'evacuation_success'` branch (lines 189-240).

- [ ] **Step 9: Verify** — `npm run dev`. Draw fate dice, the "撤离" button should appear when dice are in inventory. Click it to enter selection mode, select dice, confirm when sum >= threshold. Gold should reset, items should be preserved.

- [ ] **Step 10: Commit**

```
feat: add fate dice evacuation UI with selection and submission
```

---

## Task 10: Clean Up and Translations

**Files:**
- Modify: `src/utils/translations.js` — add English translations
- Modify: `src/hooks/useGameLogic.js` — clean up unused evacuation state

- [ ] **Step 1: Add English translations**

In `src/utils/translations.js`, add these entries to the `EN_TRANSLATIONS` object:

```js
"命运骰子": "Fate Dice",
"获得命运骰子": "Obtained Fate Dice",
"点": "pts",
"背包中没有命运骰子！": "No fate dice in inventory!",
"撤离模式: 选择命运骰子": "Evacuation: Select Fate Dice",
"确认撤离": "Confirm Evacuation",
"撤离成功！金币已重置": "Evacuation successful! Gold reset",
"里程碑完成！进入下一个里程碑": "Milestone complete! Moving to next",
```

- [ ] **Step 2: Clean up unused evacuation state**

In `useGameLogic.js`, the following state/actions may now be unused and can be removed or kept as dead code:
- `isEvacuationMode` / `setIsEvacuationMode` — if no longer used (check references)
- `evacuationReady` / `setEvacuationReady` — no longer set by anything
- `handleTriggerEvacuation` — no longer called
- `handleEvacuationExtract` — no longer called (unless "extract score" kept elsewhere)

Remove `evacuationReady` and `isEvacuationMode` state declarations. Remove `handleTriggerEvacuation` and `handleEvacuationExtract` functions. Remove them from the return object's `state` and `actions`.

Also remove their destructuring in `GameCore.jsx`.

- [ ] **Step 3: Final verification** — `npm run dev` + `npm run lint`. Full playthrough:

1. Start game, see milestone and item map
2. Draw items, some cells are fate dice (🎲)
3. Drawing a fate dice cell gives a dice item with value 1-6
4. Fill milestone cells, complete tasks
5. When all tasks done → new milestone auto-generates, inventory preserved
6. When gold runs low, click "撤离" button (visible when dice in inventory)
7. Select fate dice, see sum/threshold counter
8. Confirm when sum >= 7 → gold resets, inventory preserved, milestone stays

- [ ] **Step 4: Commit**

```
feat: add translations and clean up legacy evacuation code
```

---

## Design Notes

### Tuning Parameters (in FATE_DICE_CONFIG)
- `spawnChance: 0.15` — ~15% of non-effect cells are dice. Adjust if dice are too rare/common.
- `evacuationThreshold: 7` — requires ~2-3 dice (average value 3.5). Adjust for difficulty.

### Items NOT consumed by milestone cell filling
Fate dice have `isFateDice: true` and their name ("命运骰子") won't match any milestone cell `itemName`, so they'll never be placed into milestone cells. No extra guard needed.

### Fate dice and synthesis
Fate dice have `sterile: true`, preventing synthesis. They also have a unique name, so they won't match other items for upgrade pairing.
