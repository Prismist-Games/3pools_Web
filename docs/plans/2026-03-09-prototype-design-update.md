# Prototype Design Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the building+satisfaction prototype to match the confirmed design spec (name-based building requirements, new economy, building unlock mechanism, UI indicators, debug controls).

**Architecture:** Update data layer (prototypeConstants.js) with new building definitions and config, update game logic (usePrototypeGameLogic.js) for name-based matching and new mechanics, update UI components for new display needs.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Lucide React

---

## Summary of Changes

### What's changing:
1. **Buildings**: 8 category-based → 12 name-based, no slot limit, no demolition, transformation buildings produce items
2. **Economy**: income 5→10, starting gold 15→10, gold doesn't carry over (already done), demands give no rewards
3. **Prosperity**: target 40→20, building draw at variable intervals (front-loaded)
4. **Satisfaction**: range 0-100→0-50, start 40→20, updated tiers, drain -1/-2
5. **Building unlock**: start with 1 pre-built prosperity building, draw-3-pick-1 at increasing prosperity thresholds, tier-weighted probability
6. **UI**: prosperity milestones on timeline, debug prosperity button, no demolish, no rewards on demands

### Data format change for building requirements:
```js
// OLD: category-based
buildCost: { category: 'fruit', minRarity: 'common', count: 2 }

// NEW: name-based, each array entry = 1 item
buildCost: [
  { name: '苹果', minRarity: 'common' },
  { name: '芒果', minRarity: 'common' },
]
```

### Item lookup for transformation output:
```js
// Build from INITIAL_POOLS_DATA at module level
const ITEM_LOOKUP = {};
// { '西瓜': { name: '西瓜', icon: '🍉', category: 'fruit' }, ... }
```

---

## Task 1: Update prototypeConstants.js

**Files:**
- Modify: `src/data/prototypeConstants.js`

**Step 1: Rewrite BUILDING_DEFINITIONS**

Replace all 8 buildings with the 12 new buildings. New format uses `name` instead of `category` for requirements. Add `type: 'production' | 'transformation'`. For transformation buildings, `useOutput` contains `{ item: { name, category, rarity } }`.

```js
export const BUILDING_DEFINITIONS = [
  // --- Basic Production (tier 0, build cost: common x2) ---
  {
    id: 'fruit_stand', name: '水果摊', tier: 0, type: 'production',
    buildCost: [{ name: '苹果' }, { name: '芒果' }],
    useCondition: [{ name: '西瓜' }, { name: '汤勺' }],
    useOutput: { prosperity: 1, satisfaction: 1 },
  },
  {
    id: 'clinic', name: '诊所', tier: 0, type: 'production',
    buildCost: [{ name: '胶囊' }, { name: '滴眼液' }],
    useCondition: [{ name: '冲剂' }, { name: '注射器' }],
    useOutput: { satisfaction: 2 },
  },
  {
    id: 'herbal_kitchen', name: '药膳坊', tier: 0, type: 'production',
    buildCost: [{ name: '芒果' }, { name: '注射器' }],
    useCondition: [{ name: '柠檬' }, { name: '胶囊' }],
    useOutput: { satisfaction: 1, prosperity: 1 },
  },

  // --- Transformation (tier 0, build cost: common x2) ---
  {
    id: 'juice_shop', name: '榨汁坊', tier: 0, type: 'transformation',
    buildCost: [{ name: '西瓜' }, { name: '汤勺' }],
    useCondition: [{ name: '苹果' }, { name: '冲剂' }],
    useOutput: { item: { name: '西瓜', category: 'fruit', rarity: 'uncommon' } },
  },
  {
    id: 'processing_room', name: '炮制房', tier: 0, type: 'transformation',
    buildCost: [{ name: '冲剂' }, { name: '胶囊' }],
    useCondition: [{ name: '滴眼液' }, { name: '柠檬' }],
    useOutput: { item: { name: '冲剂', category: 'medicine', rarity: 'uncommon' } },
  },
  {
    id: 'sharpening_shop', name: '磨刀铺', tier: 0, type: 'transformation',
    buildCost: [{ name: '平底锅' }, { name: '汤勺' }],
    useCondition: [{ name: '菜刀' }, { name: '砧板' }, { name: '芒果' }],
    useOutput: { item: { name: '平底锅', category: 'kitchenware', rarity: 'uncommon' } },
  },
  {
    id: 'craft_workshop', name: '工艺坊', tier: 0, type: 'transformation',
    buildCost: [{ name: '笔记本' }, { name: '铅笔' }],
    useCondition: [{ name: '橡皮' }, { name: '耳机' }],
    useOutput: { item: { name: '笔记本', category: 'stationery', rarity: 'uncommon' } },
  },
  {
    id: 'electronics_mod', name: '电器改装铺', tier: 0, type: 'transformation',
    buildCost: [{ name: '耳机' }, { name: '空调' }],
    useCondition: [{ name: '手机' }, { name: '电脑' }],
    useOutput: { item: { name: '空调', category: 'electronics', rarity: 'uncommon' } },
  },

  // --- Advanced Production (tier 1, build cost: uncommon x2) ---
  {
    id: 'food_stall', name: '大排档', tier: 1, type: 'production',
    buildCost: [{ name: '芒果', minRarity: 'uncommon' }, { name: '注射器', minRarity: 'uncommon' }],
    useCondition: [{ name: '平底锅', minRarity: 'uncommon' }, { name: '西瓜' }],
    useOutput: { prosperity: 2, satisfaction: 2 },
  },
  {
    id: 'print_shop', name: '文印店', tier: 1, type: 'production',
    buildCost: [{ name: '橡皮', minRarity: 'uncommon' }, { name: '订书机', minRarity: 'uncommon' }],
    useCondition: [{ name: '笔记本', minRarity: 'uncommon' }, { name: '铅笔' }],
    useOutput: { prosperity: 3 },
  },
  {
    id: 'office', name: '办公室', tier: 1, type: 'production',
    buildCost: [{ name: '手机', minRarity: 'uncommon' }, { name: '电脑', minRarity: 'uncommon' }],
    useCondition: [{ name: '空调', minRarity: 'uncommon' }, { name: '订书机' }],
    useOutput: { prosperity: 2, satisfaction: 1 },
  },

  // --- Endgame (tier 2, build cost: rare x2) ---
  {
    id: 'winery', name: '果酒庄', tier: 2, type: 'production',
    buildCost: [{ name: '铅笔', minRarity: 'rare' }, { name: '电脑', minRarity: 'rare' }],
    useCondition: [{ name: '西瓜', minRarity: 'uncommon' }, { name: '冲剂', minRarity: 'uncommon' }],
    useOutput: { prosperity: 3, satisfaction: 3 },
  },
];
```

**Step 2: Add building draw thresholds and tier weights**

```js
// Variable prosperity thresholds for building draws (front-loaded)
export const BUILDING_DRAW_THRESHOLDS = [2, 4, 7, 11, 16];

// Tier weight ranges based on prosperity
export const BUILDING_TIER_WEIGHTS = [
  { maxProsperity: 6,  weights: { 0: 85, 1: 15, 2: 0 } },
  { maxProsperity: 12, weights: { 0: 40, 1: 50, 2: 10 } },
  { maxProsperity: 20, weights: { 0: 10, 1: 40, 2: 50 } },
];
```

**Step 3: Update PROTOTYPE_CONFIG**

```js
export const PROTOTYPE_CONFIG = {
  startingGold: 10,
  incomePerRound: 10,
  maxActiveDemands: 2,
  startingSatisfaction: 20,
  maxSatisfaction: 50,
  demandExpirePenalty: -5,
  prosperityTarget: 20,
  satisfactionTiers: [
    { min: 30, max: 50, name: '繁荣', effect: null, value: 0 },
    { min: 15, max: 29, name: '正常', effect: null, value: 0 },
    { min: 5, max: 14, name: '不满', effect: 'demand_timelimit_reduce', value: 1 },
    { min: 0, max: 4, name: '崩溃', effect: 'game_over', value: 0 },
  ],
};
```

**Step 4: Update DEMAND_DEFINITIONS - remove rewards, update drain values**

Keep existing category-based demands for now (demand redesign is deferred), but:
- Set all `reward: { currency: 0 }`
- Update `satisfactionPerRound`: basic = -1, advanced = -2

**Step 5: Add ITEM_LOOKUP helper**

```js
// Build item lookup from pool data for transformation building outputs
const ITEM_LOOKUP = {};
for (const pool of INITIAL_POOLS_DATA) {
  for (const item of pool.items) {
    ITEM_LOOKUP[item.name] = { ...item, category: pool.id };
  }
}
export { ITEM_LOOKUP };
```

**Step 6: Remove obsolete config**

Remove `maxActiveBuildings`, `buildingDrawInterval`, `buildingDrawCount` from PROTOTYPE_CONFIG.

**Step 7: Commit**

```bash
git add src/data/prototypeConstants.js
git commit -m "refactor: update prototypeConstants for new building design"
```

---

## Task 2: Update usePrototypeGameLogic.js - Core Logic

**Files:**
- Modify: `src/hooks/usePrototypeGameLogic.js`

**Step 1: Update imports and initialization**

- Import new constants: `BUILDING_DRAW_THRESHOLDS`, `BUILDING_TIER_WEIGHTS`, `ITEM_LOOKUP`
- Remove `maxActiveBuildings` references
- Change initial state: no `nextBuildingDrawAt` single value, track `nextDrawIndex` (index into BUILDING_DRAW_THRESHOLDS)
- On mount: randomly pick one basic prosperity building (水果摊 or 药膳坊), add it to `buildings` as pre-built

**Step 2: Rewrite building matching logic**

Change `confirmBuilding` and `confirmUseBuilding` validation from category-based to name-based:

```js
// OLD: if (!req.anyCategory && item.poolId !== req.category) continue;
// NEW: if (req.name && item.name !== req.name) continue;
```

minRarity check stays the same, but default to 'common' when not specified:
```js
const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
```

**Step 3: Add transformation building output**

In `confirmUseBuilding`, after consuming items, check if building type is 'transformation':

```js
if (building.type === 'transformation' && output.item) {
  const baseItem = ITEM_LOOKUP[output.item.name];
  const rarity = getRarity(output.item.rarity);
  const newItem = {
    ...baseItem,
    rarity,
    poolId: output.item.category,
    poolName: config.pools.find(p => p.id === output.item.category)?.name || '',
    uid: Math.random().toString(36).substr(2, 9),
    sterile: false,
  };
  handleIncomingItems([newItem]);
}
```

**Step 4: Update building draw mechanism**

Replace fixed-interval check with threshold-based:

```js
const [nextDrawIndex, setNextDrawIndex] = useState(0);

// In prosperity effect or after prosperity change:
useEffect(() => {
  if (nextDrawIndex < BUILDING_DRAW_THRESHOLDS.length &&
      prosperity >= BUILDING_DRAW_THRESHOLDS[nextDrawIndex] &&
      !buildingCandidates) {
    triggerBuildingDraw();
    setNextDrawIndex(prev => prev + 1);
  }
}, [prosperity, nextDrawIndex, buildingCandidates]);
```

**Step 5: Update triggerBuildingDraw with tier weights**

When drawing 3 candidates, weight by tier based on current prosperity:

```js
const triggerBuildingDraw = useCallback(() => {
  const builtIds = new Set(buildings.map(b => b.id));
  const availableIds = new Set(availableBuildings);
  const remaining = BUILDING_DEFINITIONS.filter(
    b => !builtIds.has(b.id) && !availableIds.has(b.id)
  );
  if (remaining.length === 0) return;

  // Get tier weights based on prosperity
  const tierConfig = BUILDING_TIER_WEIGHTS.find(tw => prosperity <= tw.maxProsperity)
    || BUILDING_TIER_WEIGHTS[BUILDING_TIER_WEIGHTS.length - 1];

  // Weighted random selection of 3 candidates
  const candidates = [];
  const pool = [...remaining];
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const weighted = pool.map(b => ({
      building: b,
      weight: tierConfig.weights[b.tier] || 1,
    }));
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = weighted[weighted.length - 1].building;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) { selected = w.building; break; }
    }
    candidates.push(selected);
    pool.splice(pool.indexOf(selected), 1);
  }

  setBuildingCandidates({ candidates });
}, [buildings, availableBuildings, prosperity]);
```

**Step 6: Remove demolition and slot limit**

- Remove `demolishBuilding` function
- Remove slot limit check in `startBuilding`
- Remove `maxActiveBuildings` from config export

**Step 7: Update economy**

- `endRound`: remove demand reward logic from `confirmFulfillDemand`
- `confirmFulfillDemand`: remove currency reward, just show "{name} 已满足!"
- Keep gold reset to incomePerRound (already done)

**Step 8: Add debug setProsperity action**

```js
const debugSetProsperity = useCallback((value) => {
  setProsperity(Math.max(0, Math.min(PROTOTYPE_CONFIG.prosperityTarget, value)));
}, []);
```

Export in `actions`.

**Step 9: Export updated config**

Update the returned `config` object to include `buildingDrawThresholds` instead of old values.

**Step 10: Commit**

```bash
git add src/hooks/usePrototypeGameLogic.js
git commit -m "refactor: update game logic for new building design + economy"
```

---

## Task 3: Update UI Components

**Files:**
- Modify: `src/components/game/BuildingCard.jsx`
- Modify: `src/components/game/DemandCard.jsx`
- Modify: `src/components/game/Timeline.jsx`
- Modify: `src/PrototypeGameCore.jsx`

**Step 1: Update BuildingCard.jsx**

Change `formatRequirement` to show item names instead of categories:

```js
const formatRequirement = (req, t) => {
  const name = t(req.name || '任意');
  const rarity = req.minRarity && req.minRarity !== 'common' ? t(RARITY_LABELS[req.minRarity]) : '';
  return `${rarity}${name}`;
};
```

For transformation buildings, show the output item instead of prosperity/satisfaction:

```js
const formatOutput = (output, t) => {
  if (output.item) {
    const rarity = output.item.rarity !== 'common' ? t(RARITY_LABELS[output.item.rarity]) : '';
    return `→ ${rarity}${t(output.item.name)}`;
  }
  const parts = [];
  if (output.prosperity) parts.push(`+${output.prosperity} ${t('繁荣')}`);
  if (output.satisfaction) parts.push(`+${output.satisfaction} ${t('满意度')}`);
  if (output.currency) parts.push(`+${output.currency} ${t('金币')}`);
  return parts.join(', ');
};
```

Remove demolish button (no `onDemolish` prop).

**Step 2: Update DemandCard.jsx**

Remove the reward display section. Remove the "奖励: +X 金币" line.

**Step 3: Update Timeline.jsx**

Add `buildingDrawThresholds` prop and show prosperity milestone indicators alongside demand schedule:

```jsx
export const Timeline = ({ currentRound, demandSchedule,
                           prosperityMilestones, currentProsperity,
                           totalRounds = 18 }) => {
```

Show small star/building icons at rounds where prosperity thresholds might trigger. Actually, prosperity milestones aren't round-based — they're prosperity-based. Better to show them as a separate indicator bar above or below the round timeline.

Instead, add a simple prosperity progress bar with milestone markers below the timeline:

```jsx
{prosperityMilestones && (
  <div className="flex items-center gap-1 mt-1">
    <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">繁荣:</span>
    <div className="flex-1 h-4 bg-gray-200 rounded relative">
      {/* Progress fill */}
      <div className="h-full bg-emerald-400 rounded"
           style={{ width: `${(currentProsperity / prosperityTarget) * 100}%` }} />
      {/* Milestone markers */}
      {prosperityMilestones.map(m => (
        <div key={m} className="absolute top-0 h-full w-0.5 bg-emerald-700"
             style={{ left: `${(m / prosperityTarget) * 100}%` }}
             title={`繁荣 ${m}: 建筑抽选`} />
      ))}
    </div>
  </div>
)}
```

**Step 4: Update PrototypeGameCore.jsx**

- Remove `demolishBuilding` action usage and `onDemolish` prop
- Remove `maxActiveBuildings` references
- Remove slot limit checks in disabled conditions
- Pass `buildingDrawThresholds` and `currentProsperity` to Timeline
- Add debug button:

```jsx
{/* Debug Controls */}
<div className="flex items-center gap-1 ml-2 border-l border-gray-600 pl-2">
  <span className="text-xs text-gray-500">Debug:</span>
  <button onClick={() => actions.debugSetProsperity(prosperity - 1)}
    className="text-xs px-1 bg-gray-700 rounded hover:bg-gray-600">-1</button>
  <button onClick={() => actions.debugSetProsperity(prosperity + 1)}
    className="text-xs px-1 bg-gray-700 rounded hover:bg-gray-600">+1</button>
  <button onClick={() => actions.debugSetProsperity(prosperity + 5)}
    className="text-xs px-1 bg-gray-700 rounded hover:bg-gray-600">+5</button>
</div>
```

**Step 5: Commit**

```bash
git add src/components/game/BuildingCard.jsx src/components/game/DemandCard.jsx src/components/game/Timeline.jsx src/PrototypeGameCore.jsx
git commit -m "refactor: update UI for new building design + debug controls"
```

---

## Task 4: Verify and Fix

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual verification checklist**

- [ ] Game starts with 1 pre-built prosperity building (水果摊 or 药膳坊)
- [ ] Prosperity milestones visible on timeline
- [ ] Building draw triggers at correct prosperity thresholds (2, 4, 7, 11, 16)
- [ ] Building draw shows tier-weighted candidates
- [ ] Building card shows item names (not categories)
- [ ] Building can be built by selecting correctly named items
- [ ] Transformation building produces output item into inventory
- [ ] No demolish button on built buildings
- [ ] No slot limit warning
- [ ] Demands don't show rewards
- [ ] Economy: 10 gold per round, resets each round
- [ ] Satisfaction starts at 20, max 50
- [ ] Prosperity target is 20
- [ ] Debug buttons change prosperity
- [ ] Building draw triggers when debug-increasing prosperity past thresholds

**Step 3: Fix any issues found**

**Step 4: Final commit if fixes needed**
