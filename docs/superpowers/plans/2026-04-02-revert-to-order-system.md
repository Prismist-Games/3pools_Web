# Revert Milestone System to Order System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the milestone grid system with the old order-based system from commit `b1d68f6`, while keeping the current spatial map draw system intact.

**Architecture:** The order system is independent of the draw system — orders consume items from inventory, regardless of how they got there. The milestone-specific `neededNames` (used to filter the spatial map) will be derived from active orders instead of milestone cells. The old `generateOrder`, `OrderCard`, order state management, submission/refresh/evacuation logic are all restored from commit `b1d68f6`.

**Tech Stack:** React 18, Vite, Tailwind CSS

**Compatibility note:** The old system at `b1d68f6` used a matrix-based draw system. We keep the current spatial map (ItemMap) draw system and only restore the ORDER side. The `neededNames` memo will derive from orders instead of milestone cells, so the spatial map shows items relevant to active orders.

---

### Task 1: Restore `generateOrder` and `rollRequirementRarity` to helpers.js

**Files:**
- Modify: `src/utils/helpers.js`

The current `helpers.js` is missing `generateOrder` and `rollRequirementRarity`. These must be restored from `b1d68f6:src/utils/helpers.js`.

- [ ] **Step 1: Add `rollRequirementRarity` function**

Add after the existing `getRandomAffix` function. Full source at `git show b1d68f6:src/utils/helpers.js` lines 34-86.

- [ ] **Step 2: Add `generateOrder` function**

Add after `rollRequirementRarity`. Full source at `git show b1d68f6:src/utils/helpers.js` lines 88-225.

- [ ] **Step 3: Add `generateOrder` to the exports**

Ensure `generateOrder` and `rollRequirementRarity` are both exported.

- [ ] **Step 4: Verify no import errors**

Run: `npm run dev` — check console for import errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/helpers.js
git commit -m "feat: restore generateOrder and rollRequirementRarity to helpers.js"
```

---

### Task 2: Restore OrderCard component

**Files:**
- Create: `src/components/game/OrderCard.jsx`

- [ ] **Step 1: Restore OrderCard.jsx**

Copy full content from `git show b1d68f6:src/components/game/OrderCard.jsx` (499 lines).

- [ ] **Step 2: Verify no import errors**

Run: `npm run dev` — check console.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/OrderCard.jsx
git commit -m "feat: restore OrderCard component from old order system"
```

---

### Task 3: Replace milestone state with order state in useGameLogic.js

**Files:**
- Modify: `src/hooks/useGameLogic.js`

This is the largest task. Replace milestone-related state, derived values, and initialization with order-related equivalents.

- [ ] **Step 1: Update imports**

Replace:
```javascript
import { generateMilestone } from '../utils/gridGenerator.js';
import { TASK_GOLD_REWARD } from '../data/gridConstants.js';
```

Add `generateOrder` to helpers import:
```javascript
import { getAllNormalItems, generateOrder, rollRarity, getNextRarity, getRandomAffix, getRandomItems } from '../utils/helpers';
```

- [ ] **Step 2: Replace milestone state with order state**

Remove:
```javascript
const [milestone, setMilestone] = useState(null);
const [milestoneNumber, setMilestoneNumber] = useState(1);
```

Add (from `b1d68f6` lines 30-67):
```javascript
const [emergencyDifficulty, setEmergencyDifficulty] = useState(config.emergency?.difficulty?.initial || 1);
const [orderRefreshCount, setOrderRefreshCount] = useState(config.global?.initialRefreshCount ?? 4);
const REFRESH_MAX = config.global?.maxRefreshCount ?? 4;
const [orders, setOrders] = useState([]);
const [emergencyOrders, setEmergencyOrders] = useState([]);
const [isEvacuationMode, setIsEvacuationMode] = useState(false);
const [orderCandidates, setOrderCandidates] = useState(null);
const [orderCandidateQueue, setOrderCandidateQueue] = useState([]);
const [orderSlotAssignments, setOrderSlotAssignments] = useState({});
```

- [ ] **Step 3: Replace milestone initialization with order initialization**

Remove the milestone initialization `useEffect` blocks (the `generateMilestone` calls and `neededNames`-based map regen).

Add order initialization effect from `b1d68f6` lines 100-129.

- [ ] **Step 4: Derive `neededNames` from orders instead of milestone**

Replace the milestone-based `neededNames` memo with an order-based one:
```javascript
const neededNames = useMemo(() => {
    const names = new Set();
    orders.forEach(order => {
        if (!order) return;
        order.requirements.forEach(req => names.add(req.name));
    });
    emergencyOrders.forEach(order => {
        if (!order) return;
        order.requirements.forEach(req => names.add(req.name));
    });
    return names.size > 0 ? names : null;
}, [orders, emergencyOrders]);
```

Keep the map regeneration effect but trigger on order changes instead of milestone changes:
```javascript
useEffect(() => {
    if (neededNames) {
        setItemMap(generateItemMap(neededNames));
    }
}, [neededNames]);
```

- [ ] **Step 5: Add order candidate queue processing effect**

From `b1d68f6` lines 575-583:
```javascript
useEffect(() => {
    if (!orderCandidates && orderCandidateQueue.length > 0) {
        const [next, ...rest] = orderCandidateQueue;
        setOrderCandidates(next);
        setOrderCandidateQueue(rest);
    }
}, [orderCandidates, orderCandidateQueue]);
```

- [ ] **Step 6: Remove milestone-derived state, add order-derived state**

Remove: `cellMatches`, `fillableCellIds`, `relevantPoolIds` memos.

Add from `b1d68f6`:
- `maxRequirementRarityMap` memo
- `assignedItemUids` memo
- `phantomMarks` memo
- `clearAssignmentsForOrders` function
- `updateAssignmentUid` function
- `removeAssignmentByUid` function
- `satisfiableOrders` memo
- `potentialSatisfiableOrders` memo

- [ ] **Step 7: Add order interaction functions**

From `b1d68f6`, add:
- `handleAssignToOrder`
- `handleUnassignFromOrder`
- `handleOrderSlotClick`
- `handleOrderClick`
- `handleRefreshAllOrders`
- `handleRefreshSingleOrder`
- `handleSelectOrderCandidate`
- `debugGetOrderItems`

- [ ] **Step 8: Add submission and evacuation functions**

From `b1d68f6`, add:
- `handleConfirmSubmission`
- `toggleSubmitMode` (update existing)
- `toggleEvacuationMode`
- `handleEvacuate` (replace existing simple version)
- `handleConfirmEvacuation`
- `handleEvacuationContinue`
- `handleEvacuationExtract`

- [ ] **Step 9: Replace handleFillCell with order-aware handleSlotClick**

Remove `handleFillCell`. Update `handleSlotClick` to include order-aware logic (assignment awareness from `b1d68f6`).

Update `handleConfirmRecycle` to clear order assignments for recycled items.

- [ ] **Step 10: Update the return object**

Update the `return { state, actions, helpers }` to expose order-related state and actions instead of milestone ones. Match the structure from `b1d68f6` return block, but keeping spatial map state (`itemMap`, `drawAnimInfo`, `activeEffect`).

- [ ] **Step 11: Verify compilation**

Run: `npm run dev` — fix any errors.

- [ ] **Step 12: Commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "feat: replace milestone grid state with old order system in useGameLogic"
```

---

### Task 4: Update GameCore.jsx to use order UI

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Update imports**

Remove `MilestoneGrid` import. Add `OrderCard` import:
```javascript
import { OrderCard } from './components/game/OrderCard';
```

- [ ] **Step 2: Update state destructuring**

Replace milestone-related state (`milestone`, `milestoneNumber`, `cellMatches`, `fillableCellIds`, `relevantPoolIds`) with order state (`orders`, `emergencyOrders`, `emergencyDifficulty`, `orderRefreshCount`, `REFRESH_MAX`, `orderCandidates`, `orderCandidateQueue`, `isEvacuationMode`, `satisfiableOrders`, `potentialSatisfiableOrders`, `orderSlotAssignments`, `assignedItemUids`, `phantomMarks`).

Replace milestone-related actions (`handleFillCell`) with order actions (`handleRefreshAllOrders`, `handleRefreshSingleOrder`, `handleSelectOrderCandidate`, `handleOrderClick`, `handleConfirmSubmission`, `toggleEvacuationMode`, `handleConfirmEvacuation`, `handleEvacuationContinue`, `handleEvacuationExtract`, `handleUnassignFromOrder`, `handleOrderSlotClick`, `debugGetOrderItems`).

- [ ] **Step 3: Replace header milestone display with order refresh count**

Replace the milestone `#{milestoneNumber}` display with emergency difficulty and order refresh count displays.

- [ ] **Step 4: Replace MilestoneGrid with OrderCard list**

Replace the `<MilestoneGrid>` section with order cards:
- 3 normal orders rendered as `<OrderCard>` with score order props
- Emergency orders section with evacuation button
- Order candidate selection overlay (2-choice UI)

- [ ] **Step 5: Add submit/evacuation action buttons**

Add buttons for:
- Submit mode toggle (提交订单)
- Confirm submission (when in submit mode)
- Evacuation mode toggle (离开关卡)
- Confirm evacuation (when in evacuation mode)
- Refresh all orders

- [ ] **Step 6: Update inventory slot badge logic**

Replace milestone-based `neededCells` badge logic with order-based logic using `maxRequirementRarityMap`:
```javascript
const isNeeded = item && maxRequirementRarityMap[item.name] !== undefined;
const isMaxSatisfied = isNeeded && item.rarity.bonus >= maxRequirementRarityMap[item.name];
```

Also update `isAssigned` prop: `isAssigned={item && assignedItemUids.has(item.uid)}`

- [ ] **Step 7: Update pending item badge logic**

Same as above — replace milestone-based neededCells with order-based logic.

- [ ] **Step 8: Add evacuation success modal handling**

Add modal cases for `evacuation_success` type with "继续" and "带走战利品" buttons.

- [ ] **Step 9: Verify full functionality**

Run: `npm run dev` — test order generation, refresh, submission, evacuation flow.

- [ ] **Step 10: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: replace MilestoneGrid UI with OrderCard-based order system"
```

---

### Task 5: Cleanup

**Files:**
- Optionally remove: `src/components/game/MilestoneGrid.jsx`, `src/components/game/GridCell.jsx`, `src/utils/gridGenerator.js`, `src/data/gridConstants.js`

- [ ] **Step 1: Remove unused milestone files**

Delete the 4 milestone-specific files that are no longer imported.

- [ ] **Step 2: Verify no broken imports**

Run: `npm run dev` and `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused milestone grid files"
```
