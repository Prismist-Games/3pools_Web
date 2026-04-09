# Sub-Level System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sub-level system where drawing a special "entrance" cell on a main wall pauses that wall, enters a self-contained sub-level board with independent gold, and returns to the parent wall when the player exits.

**Architecture:** Levels gain a `role` field (`"main"` or `"sub"`). Sub-levels generate dynamic entrance cell types (`entrance:{id}`) that appear as editor brushes only when editing main levels. In gameplay, drawing an entrance cell pushes the current wall state onto a stack, loads the sub-level grid with its own gold, and enters a `drawing_sub` phase. Exiting pops the stack and resumes. The UI shows the parent wall shrunk and grayed beside the active sub-level.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3 (existing stack, no new deps)

---

## File Structure

### Modified Files
| File | Changes |
|------|---------|
| `src/data/levelTemplates.js` | Add `CELL_TYPES.ENTRANCE` prefix, export `getSubLevels()` / `getMainLevels()` helpers, filter sub-levels from `pickTemplate` |
| `src/utils/templateGenerator.js` | Handle `entrance:*` cell type in resolver |
| `src/hooks/useGameLogic.js` | Add wall stack state, `enterSubLevel()` / `exitSubLevel()` actions, handle entrance cell in `completeDrawAnim`, add `drawing_sub` phase |
| `src/GameCore.jsx` | Render sub-level UI with parent wall shrunk/grayed, "结束事件" button during `drawing_sub` |
| `src/components/editor/CellPalette.jsx` | Dynamically add entrance brushes for each sub-level when editing a main level |
| `src/components/editor/GridPainter.jsx` | Add display entries for `entrance:*` cell types |
| `src/components/editor/LevelEditor.jsx` | Add `role` toggle (main/sub), pass role to CellPalette to control entrance brush visibility |
| `src/components/editor/TemplatePreview.jsx` | Add entrance cell color |

---

## Task 1: Level Role Field + Data Helpers

**Files:**
- Modify: `src/data/levelTemplates.js`

Add role-based helpers and filter sub-levels from the normal `pickTemplate` candidate pool.

- [ ] **Step 1: Add role helpers and update pickTemplate**

In `src/data/levelTemplates.js`, after the `LEVEL_TEMPLATES` export (line 38), add helper functions. Also update `pickTemplate` to only pick from main levels (sub-levels never appear in 3-choose-1).

After the existing `LEVEL_TEMPLATES` export, add:

```js
// --- Role-based helpers ---

/** Get all levels marked as sub-levels */
export function getSubLevels() {
  return LEVEL_TEMPLATES.filter(t => t.role === 'sub');
}

/** Get all main levels (role is 'main' or unset — backward compatible) */
export function getMainLevels() {
  return LEVEL_TEMPLATES.filter(t => t.role !== 'sub');
}
```

In `pickTemplate`, change the template lookup to only consider main levels. Replace:
```js
const template = LEVEL_TEMPLATES.find(t => t.id === id);
```
with:
```js
const mainLevels = getMainLevels();
const template = mainLevels.find(t => t.id === id);
```

- [ ] **Step 2: Commit**

```bash
git add src/data/levelTemplates.js
git commit -m "feat: level role field — getSubLevels/getMainLevels helpers, sub-levels excluded from pickTemplate"
```

---

## Task 2: Entrance Cell Type in Template Resolver

**Files:**
- Modify: `src/utils/templateGenerator.js`

Entrance cells in templates are stored as `"entrance:some_sub_level_id"` strings. The resolver needs to convert them into concrete cell objects.

- [ ] **Step 1: Add entrance handling to resolveConstrainedCell**

In `src/utils/templateGenerator.js`, add a case at the top of the switch (before the `default` case) to handle entrance cells. The cell type in templates is the string `"entrance:{subLevelId}"`.

Add this code inside `resolveConstrainedCell`, just before `default: return null;`:

```js
    default: {
      // Handle dynamic entrance cells: "entrance:{subLevelId}"
      if (cellType && cellType.startsWith('entrance:')) {
        const subLevelId = cellType.replace('entrance:', '');
        return {
          type: 'entrance',
          subLevelId,
          icon: '🚪',
          name: subLevelId,
          uid: generateUID(),
          ...extras,
        };
      }
      return null;
    }
```

Replace the existing `default: return null;` with this block.

- [ ] **Step 2: Commit**

```bash
git add src/utils/templateGenerator.js
git commit -m "feat: entrance cell type in template resolver — entrance:{subLevelId} → concrete cell"
```

---

## Task 3: Wall Stack + Sub-Level Game Logic

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the core logic change. Add:
1. A `wallStack` state to save/restore parent wall state
2. An `enterSubLevel(subLevelId)` function called when an entrance cell is drawn
3. An `exitSubLevel()` function called when the player clicks "end event"
4. Handle the entrance cell type in `completeDrawAnim`

- [ ] **Step 1: Add wall stack state**

Near the existing state declarations (around line 94, after `const [currentWallType, setCurrentWallType] = useState(null);`), add:

```js
    // --- Sub-Level State ---
    const [wallStack, setWallStack] = useState([]); // stack of { matrix, gold, wallType, level }
    const isInSubLevel = wallStack.length > 0;
```

- [ ] **Step 2: Add import for generateWallFromTemplate and getSubLevels**

At the top of the file, ensure these are imported (some may already exist):

```js
import { generateWallFromTemplate } from '../utils/templateGenerator';
import { pickTemplate, getSubLevels, LEVEL_TEMPLATES } from '../data/levelTemplates';
```

Note: `generateWallFromTemplate` and `pickTemplate` should already be imported. Just add `getSubLevels` and `LEVEL_TEMPLATES` to the existing import.

- [ ] **Step 3: Add enterSubLevel function**

After the `selectWall` function, add:

```js
    /** Enter a sub-level: push current wall state, load sub-level grid */
    const enterSubLevel = (subLevelId) => {
        const subLevel = LEVEL_TEMPLATES.find(t => t.id === subLevelId && t.role === 'sub');
        if (!subLevel) return;

        // Push current state onto stack
        setWallStack(prev => [...prev, {
            matrix,
            gold,
            wallType: currentWallType,
            level: wallCandidates ? null : undefined, // not needed for restore
        }]);

        // Generate and load sub-level
        const result = generateWallFromTemplate(subLevel);
        const subGold = subLevel.settings?.gold ?? turnConfig.goldPerTurn;
        setMatrix(result.grid);
        setGold(subGold);
        setCurrentWallType(null);
        setLastDrawResult(null);
        setPhase('drawing_sub');
    };
```

- [ ] **Step 4: Add exitSubLevel function**

After `enterSubLevel`, add:

```js
    /** Exit sub-level: pop wall stack, restore parent state. No doom resolution. */
    const exitSubLevel = () => {
        if (wallStack.length === 0) return;

        const parent = wallStack[wallStack.length - 1];
        setWallStack(prev => prev.slice(0, -1));
        setMatrix(parent.matrix);
        setGold(parent.gold);
        setCurrentWallType(parent.wallType);
        setLastDrawResult(null);
        setPhase('drawing');
    };
```

- [ ] **Step 5: Handle entrance cell in completeDrawAnim**

In the `completeDrawAnim` function (around line 426), find the block that handles different cell types. After the bomb handler and before the `setMatrix` call, add an entrance handler:

After the line `} else if (drawnCell.type === 'bomb') {` block, add:

```js
        } else if (drawnCell.type === 'entrance') {
            // Remove the entrance cell from the grid first, then enter sub-level
            setMatrix(prev => {
                const newMatrix = prev.map(r => r.map(c => c ? { ...c } : null));
                newMatrix[finalRowIndex][finalColIndex] = null;
                return newMatrix;
            });
            setDrawAnimState(null);
            setLastDrawResult({ obtained: null, row: finalRowIndex, col: finalColIndex, id: Date.now() });
            showToast(`🚪 ${t('进入子关卡')}: ${drawnCell.name}`, 'info');
            // Delay slightly to let state settle before pushing
            setTimeout(() => enterSubLevel(drawnCell.subLevelId), 300);
            return; // Skip the normal post-draw flow
```

- [ ] **Step 6: Make entrance cells skip-able in the draw (they participate like normal cells)**

In the selectRow/selectColumn functions, entrance cells should be normal drawable cells (not skipped like empty). Check that the `activeCols` filter at lines 312 and 360 doesn't exclude them — currently it checks `cell !== null && cell.type !== 'empty'`, which will include entrance cells. No change needed here.

- [ ] **Step 7: Export new functions and state**

Find the return object of `useGameLogic` (near the bottom of the hook). Add to the returned state:

```js
        isInSubLevel, wallStack,
        enterSubLevel, exitSubLevel,
```

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: wall stack + enterSubLevel/exitSubLevel — push/pop wall state for sub-level entry"
```

---

## Task 4: Sub-Level UI in GameCore

**Files:**
- Modify: `src/GameCore.jsx`

Add UI for the `drawing_sub` phase: show the sub-level grid in center, parent wall shrunk on the left, and "结束事件" button instead of "结束回合".

- [ ] **Step 1: Destructure new state from useGameLogic**

In the destructuring of `state` (around line 32-51), add:

```js
        isInSubLevel, wallStack,
        enterSubLevel, exitSubLevel,
```

- [ ] **Step 2: Add drawing_sub phase to the rendering conditions**

Find the condition that renders the drawing phase (line 306: `{phase === 'drawing' && matrix && (`). Change it to also handle `drawing_sub`:

```jsx
{(phase === 'drawing' || phase === 'drawing_sub') && matrix && (
```

- [ ] **Step 3: Add parent wall preview when in sub-level**

Before the `<ResourceMatrix` component inside the drawing block, add a conditional parent wall preview:

```jsx
{phase === 'drawing_sub' && wallStack.length > 0 && (
    <div className="flex items-start gap-4">
        {/* Parent wall — shrunk and grayed */}
        <div className="opacity-40 scale-75 origin-top-left pointer-events-none">
            <div className="text-[9px] text-gray-400 mb-1">{t('主关卡')}</div>
            <ResourceMatrix
                matrix={wallStack[wallStack.length - 1].matrix}
                onSelectRow={() => {}}
                onSelectColumn={() => {}}
                gold={0}
                drawCost={1}
                phase="drawing"
                disabled={true}
                wallType={null}
            />
        </div>
        {/* Active sub-level grid */}
        <div>
```

And after the end-turn button block, close the wrapper:

```jsx
        </div>
    </div>
)}
```

This needs careful placement. The structure should be:
- If `drawing_sub`: wrap in a flex container with parent preview + sub grid
- If `drawing`: render normally as-is

- [ ] **Step 4: Change button text for sub-level**

Find the "结束回合" button (around line 340-349). Change the button to show different text and action when in sub-level:

```jsx
<button
    onClick={phase === 'drawing_sub' ? exitSubLevel : endTurn}
    disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0}
    className={`px-6 py-2 rounded-lg font-bold transition-colors ${
        isDoomResolving || isDrawAnimating || pendingItems.length > 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : phase === 'drawing_sub'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-white hover:bg-gray-800'
    }`}
>
    {phase === 'drawing_sub' ? t('结束事件') : t('结束回合')}
</button>
```

- [ ] **Step 5: Add drawing_sub to the main layout condition**

Find the condition at line 199 that controls when the main game area renders:

```jsx
{(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'drawing' || phase === 'between_turns') && (
```

Add `drawing_sub`:

```jsx
{(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'drawing' || phase === 'drawing_sub' || phase === 'between_turns') && (
```

- [ ] **Step 6: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: sub-level UI — parent wall shrunk/grayed, 结束事件 button, drawing_sub phase"
```

---

## Task 5: Editor — Role Toggle + Dynamic Entrance Brushes

**Files:**
- Modify: `src/components/editor/LevelEditor.jsx`
- Modify: `src/components/editor/CellPalette.jsx`

- [ ] **Step 1: Add role state to LevelEditor**

In `LevelEditor.jsx`, add role state after the description state (around line 38):

```js
  const [role, setRole] = useState(existingTemplate?.role || 'main');
```

Include `role` in the saved template. In `handleSave`, update the template object:

```js
    const template = { id, name, description, role, grid, settings: buildSettings() };
```

Also update `handleTest`:

```js
    const template = { id, name, description, role, grid, settings: buildSettings() };
```

- [ ] **Step 2: Add role toggle UI**

In the metadata section of LevelEditor (after the description textarea, before the wall settings panel), add:

```jsx
          <div>
            <label className="text-xs text-gray-400">关卡类型</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setRole('main')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  role === 'main'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-600'
                }`}
              >
                主关卡
              </button>
              <button
                onClick={() => setRole('sub')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  role === 'sub'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-600'
                }`}
              >
                子关卡
              </button>
            </div>
          </div>
```

- [ ] **Step 3: Pass role to CellPalette**

In the CellPalette component invocation, add the `levelRole` prop:

```jsx
        <CellPalette
          activeBrush={activeBrush}
          onBrushChange={setActiveBrush}
          multiplier={multiplier}
          onMultiplierChange={setMultiplier}
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          activeGroupNumber={activeGroupNumber}
          onActiveGroupNumberChange={setActiveGroupNumber}
          levelRole={role}
        />
```

- [ ] **Step 4: Add dynamic entrance brushes to CellPalette**

In `CellPalette.jsx`, import `getSubLevels`:

```js
import { CELL_TYPES, getSubLevels } from '../../data/levelTemplates';
```

Add `levelRole` to the component props:

```js
export default function CellPalette({
  activeBrush, onBrushChange,
  multiplier, onMultiplierChange,
  groupMode, onGroupModeChange,
  activeGroupNumber, onActiveGroupNumberChange,
  levelRole,
}) {
```

Build dynamic palette items by appending entrance brushes when editing a main level:

After the static `PALETTE_ITEMS` array, inside the component body (before the `groups` computation), add:

```js
  // Dynamic entrance brushes — only show when editing a main level
  const subLevels = levelRole === 'main' ? getSubLevels() : [];
  const entranceBrushes = subLevels.map(sub => ({
    type: `entrance:${sub.id}`,
    icon: '🚪',
    label: `入口: ${sub.name || sub.id}`,
    group: '子关卡入口',
  }));
  const allPaletteItems = [...PALETTE_ITEMS, ...entranceBrushes];
```

Then change all references from `PALETTE_ITEMS` to `allPaletteItems` in the render:

```js
  const groups = [...new Set(allPaletteItems.map(i => i.group))];
```

And in the filter:

```js
{allPaletteItems.filter(i => i.group === group).map(item => (
```

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/LevelEditor.jsx src/components/editor/CellPalette.jsx
git commit -m "feat: editor role toggle (main/sub) + dynamic entrance brushes for sub-levels"
```

---

## Task 6: Display Support for Entrance Cells

**Files:**
- Modify: `src/components/editor/GridPainter.jsx`
- Modify: `src/components/editor/TemplatePreview.jsx`
- Modify: `src/components/game/ResourceMatrix.jsx`

- [ ] **Step 1: GridPainter — entrance cell display**

In `GridPainter.jsx`, the `CELL_DISPLAY` map uses exact type keys. Entrance cells have dynamic types (`entrance:some_id`). Update `getCellDisplay` to handle the `entrance:` prefix:

Replace the `getCellDisplay` function:

```js
function getCellDisplay(cell) {
  const type = getCellType(cell);
  if (!type) return { icon: '🎲', bg: 'bg-gray-800/30', label: '随机填充' };
  if (type.startsWith('entrance:')) {
    const subId = type.replace('entrance:', '');
    return { icon: '🚪', bg: 'bg-teal-800/60', label: `入口: ${subId}` };
  }
  return CELL_DISPLAY[type] || { icon: '?', bg: 'bg-gray-500/60', label: type };
}
```

- [ ] **Step 2: TemplatePreview — entrance cell color**

In `TemplatePreview.jsx`, update `getCellColor` to handle entrance types:

Replace the function:

```js
function getCellColor(cell) {
  if (!cell) return 'bg-gray-800/40';
  const type = typeof cell === 'string' ? cell : cell.type;
  if (type && type.startsWith('entrance:')) return 'bg-teal-700';
  return MINI_COLORS[type] || 'bg-gray-600';
}
```

- [ ] **Step 3: ResourceMatrix — entrance cell rendering in gameplay**

In `src/components/game/ResourceMatrix.jsx`, find the cell background logic (the `if/else if` chain starting around line 107). Add entrance type handling:

After the bomb case (`} else if (cell.type === 'bomb') {`) and before the `else {` fallback, add:

```js
    } else if (cell.type === 'entrance') {
        bgClass = 'bg-teal-100 border-teal-400';
```

Also in the `CellTooltip` component (around line 24-48), add entrance tooltip:

```js
    } else if (cell.type === 'entrance') {
        icon = '🚪';
        name = t('子关卡入口');
        desc = t('抽中时进入子关卡');
```

And in the cell content rendering (around line 109-131 where icons are set), add:

```js
    } else if (cell.type === 'entrance') {
        content = '🚪';
```

Find exactly where cell content/icon is determined and add the entrance case there, following the pattern of existing cell types.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/GridPainter.jsx src/components/editor/TemplatePreview.jsx src/components/game/ResourceMatrix.jsx
git commit -m "feat: entrance cell display in editor, preview, and gameplay grid"
```

---

## Task 7: Update LevelManager + pickTemplate for Role Awareness

**Files:**
- Modify: `src/components/editor/LevelManager.jsx`
- Modify: `src/data/levelSchedule.json`

The level manager should show main and sub levels separately, and only main levels need schedule controls (weight, enabled, minExpedition). Sub-levels don't appear in the 3-choose-1 — they're entered via entrance cells.

- [ ] **Step 1: Update LevelManager to group by role**

In `LevelManager.jsx`, split the template list into main and sub sections:

After `const allTemplates = LEVEL_TEMPLATES.map(t => ({ ...t }));`, add:

```js
  const mainTemplates = allTemplates.filter(t => t.role !== 'sub');
  const subTemplates = allTemplates.filter(t => t.role === 'sub');
```

Render main templates with schedule controls (existing card UI), then sub-templates in a simpler list below:

After the main template grid `</div>`, before the save button, add:

```jsx
      {/* Sub-levels */}
      {subTemplates.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-8 mb-4">子关卡</h2>
          <p className="text-xs text-gray-500 mb-4">子关卡不会出现在 3 选 1 中，而是作为入口格子放置在主关卡上。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subTemplates.map(template => (
              <div key={template.id} className="p-4 rounded-lg border bg-amber-900/20 border-amber-700/40">
                <div className="flex gap-3 mb-3">
                  <TemplatePreview grid={template.grid} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm truncate">{template.name || template.id}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-800 rounded">子关卡</span>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                  </div>
                </div>
                <Link to={`/editor/${template.id}`} className="text-xs text-blue-400 hover:underline">
                  编辑关卡 →
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
```

Also change the main template loop to use `mainTemplates` instead of `allTemplates`:

```jsx
{mainTemplates.map(template => {
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/LevelManager.jsx
git commit -m "feat: LevelManager shows main and sub levels separately"
```

---

## Task 8: Verify & Build

- [ ] **Step 1: Run production build**

Run: `npm run build`

Fix any build errors.

- [ ] **Step 2: End-to-end verification**

Run: `npm run dev`

Test the complete flow:
1. Open `/editor`, create a new level, set role to "子关卡", set gold to 3, design a small grid, save
2. Place the JSON file in `src/data/levels/`, verify Vite picks it up
3. Open `/editor`, create/edit a main level — verify the new sub-level appears as a 🚪 entrance brush
4. Paint an entrance cell on the main level, save
5. Open `/levels` — verify main and sub levels are shown separately
6. Play the game — when the main level with entrance cell appears, draw the entrance
7. Verify: parent wall shrinks/grays, sub-level appears with its own gold
8. Draw from sub-level — verify stickers go to main backpack, doom applies to shared doom system
9. Click "结束事件" — verify parent wall restores, gold restores, can continue drawing
10. Verify "结束回合" still works normally on main walls and procedural walls

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: post-verification fixes for sub-level system"
```
