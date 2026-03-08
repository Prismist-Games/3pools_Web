# Building + Satisfaction Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the order/score/emergency system with a building system (prosperity/win) + satisfaction system (demands/survival), creating a two-layer consumption prototype on top of the existing pool system.

**Architecture:** Create a new game hook `usePrototypeGameLogic.js` that reuses pool/inventory/draw mechanics from the existing codebase but replaces orders/score/emergency with buildings, demands, satisfaction, prosperity, and round-based flow. A new `PrototypeGameCore.jsx` renders the new UI. A mode toggle in `App.jsx` switches between the existing game and the prototype. All prototype config data lives in a new `prototypeConstants.js`.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Lucide React icons, existing pool/item/affix infrastructure.

**Key spec:** `design_docs/prototype-building-satisfaction-spec.md`

---

## Overview of Tasks

1. **Prototype config data** (`prototypeConstants.js`) - buildings, demands, round schedule, economy params
2. **Game logic hook** (`usePrototypeGameLogic.js`) - round system, buildings, satisfaction, prosperity, demands
3. **Building card component** (`BuildingCard.jsx`) - display + use buildings
4. **Demand card component** (`DemandCard.jsx`) - display active demands
5. **Timeline component** (`Timeline.jsx`) - round timeline with demand markers
6. **Building selection modal** (`BuildingSelectionModal.jsx`) - pick from building candidates
7. **Prototype game core** (`PrototypeGameCore.jsx`) - layout + wire everything
8. **App mode toggle** - switch between existing game and prototype
9. **Translations** - add Chinese UI strings with `t()`, add English to `translations.js`
10. **Smoke test** - verify full playthrough

---

### Task 1: Prototype Config Data

**Files:**
- Create: `src/data/prototypeConstants.js`

**Step 1: Create the prototype config file**

This file defines all buildings, demands, round schedule, and economy parameters. It imports pool/rarity/affix data from the existing `constants.js`.

```js
import { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG } from './constants';

// --- Building Definitions ---
// Types: 'resource' (consume items -> prosperity/satisfaction/currency),
//        'conversion' (consume items -> specific item),
//        'upgrade' (consume items -> quality upgrade)
export const BUILDING_DEFINITIONS = [
  // Starting buildings (3 available at game start, pick 2 to build first)
  {
    id: 'fruit_stand',
    name: '水果摊',
    buildCost: { category: 'fruit', minRarity: 'common', count: 2 },
    useCondition: { category: 'fruit', count: 1 },
    useOutput: { prosperity: 2 },
    type: 'resource',
    tier: 0,
  },
  {
    id: 'clinic',
    name: '诊所',
    buildCost: { category: 'medicine', minRarity: 'common', count: 2 },
    useCondition: { category: 'medicine', count: 1 },
    useOutput: { satisfaction: 3 },
    type: 'resource',
    tier: 0,
  },
  {
    id: 'print_shop',
    name: '文印店',
    buildCost: { category: 'stationery', minRarity: 'common', count: 2 },
    useCondition: { category: 'stationery', minRarity: 'uncommon', count: 1 },
    useOutput: { prosperity: 3 },
    type: 'resource',
    tier: 0,
  },

  // Draw pool 1 (prosperity 8 threshold, draw 3 pick 1)
  {
    id: 'grocery',
    name: '杂货铺',
    buildCost: { category: 'kitchenware', minRarity: 'common', count: 2 },
    useCondition: { category: 'kitchenware', count: 1 },
    useOutput: { prosperity: 2, satisfaction: 2 },
    type: 'resource',
    tier: 1,
  },
  {
    id: 'repair_shop',
    name: '维修铺',
    buildCost: { category: 'electronics', minRarity: 'common', count: 2 },
    useCondition: { category: 'electronics', count: 1 },
    useOutput: { currency: 3, prosperity: 1 },
    type: 'resource',
    tier: 1,
  },
  {
    id: 'recycling_center',
    name: '回收站',
    buildCost: { anyCategory: true, minRarity: 'common', count: 3 },
    useCondition: { anyCategory: true, count: 2 },
    useOutput: { prosperity: 3 },
    type: 'resource',
    tier: 1,
  },

  // Draw pool 2 (prosperity 16 threshold, draw 3 pick 1)
  {
    id: 'community_plaza',
    name: '社区广场',
    buildCost: { anyCategory: true, minRarity: 'uncommon', count: 2 },
    useCondition: { anyCategory: true, minRarity: 'uncommon', count: 1 },
    useOutput: { satisfaction: 5 },
    type: 'resource',
    tier: 2,
  },
  {
    id: 'trade_guild',
    name: '商会',
    buildCost: { anyCategory: true, minRarity: 'uncommon', count: 2 },
    useCondition: { anyCategory: true, minRarity: 'rare', count: 1 },
    useOutput: { prosperity: 5 },
    type: 'resource',
    tier: 2,
  },
];

// --- Demand Definitions ---
export const DEMAND_DEFINITIONS = {
  basic: [
    {
      id: 'fruit_purchase',
      name: '水果采购',
      requires: [{ category: 'fruit', minRarity: 'common', count: 3 }],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 5 },
    },
    {
      id: 'medicine_restock',
      name: '药品补货',
      requires: [
        { category: 'medicine', minRarity: 'common', count: 2 },
        { category: 'electronics', minRarity: 'common', count: 1 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -2,
      reward: { currency: 5 },
    },
    {
      id: 'stationery_order',
      name: '文具订购',
      requires: [{ category: 'stationery', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 4 },
    },
    {
      id: 'kitchenware_need',
      name: '厨具需求',
      requires: [{ category: 'kitchenware', minRarity: 'common', count: 2 }],
      timeLimit: 3,
      satisfactionPerRound: -1,
      reward: { currency: 4 },
    },
  ],
  advanced: [
    {
      id: 'community_feast',
      name: '社区聚餐',
      requires: [
        { category: 'fruit', minRarity: 'uncommon', count: 1 },
        { category: 'kitchenware', minRarity: 'common', count: 2 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -3,
      reward: { currency: 7 },
    },
    {
      id: 'health_check',
      name: '健康检查',
      requires: [
        { category: 'medicine', minRarity: 'uncommon', count: 1 },
        { category: 'electronics', minRarity: 'common', count: 1 },
        { category: 'stationery', minRarity: 'common', count: 1 },
      ],
      timeLimit: 3,
      satisfactionPerRound: -3,
      reward: { currency: 7 },
    },
  ],
};

// --- Round Schedule ---
// Fixed demand generation rounds (1-indexed). Known to player via timeline.
export const DEMAND_SCHEDULE = [1, 4, 7, 10, 13, 16, 18];

// Round at which advanced demands start mixing in
export const ADVANCED_DEMAND_START_ROUND = 9;

// --- Economy Parameters ---
export const PROTOTYPE_CONFIG = {
  startingGold: 15,
  incomePerRound: 5,
  maxActiveBuildings: 5,
  maxActiveDemands: 2,
  startingSatisfaction: 40,
  maxSatisfaction: 100,
  demandExpirePenalty: -10,       // satisfaction penalty when demand expires
  prosperityTarget: 40,
  buildingDrawInterval: 8,        // every 8 prosperity, draw 3 pick 1
  buildingDrawCount: 3,           // candidates shown per draw
  satisfactionTiers: [
    { min: 60, max: 100, name: '繁荣', effect: 'demand_reward_bonus', value: 0.5 },
    { min: 30, max: 59, name: '正常', effect: null, value: 0 },
    { min: 10, max: 29, name: '不满', effect: 'demand_timelimit_reduce', value: 1 },
    { min: 0, max: 9, name: '崩溃', effect: 'game_over', value: 0 },
  ],
};

// Re-export existing configs for convenience
export { INITIAL_POOLS_DATA, INITIAL_AFFIXES_CONFIG, INITIAL_RARITY_CONFIG };
```

**Step 2: Verify the file loads without errors**

Run: `cd /Users/ziggy/GitHub/3pools_Web && npm run dev`
Open browser, check console for import errors.

**Step 3: Commit**

```bash
git add src/data/prototypeConstants.js
git commit -m "feat: add prototype config data for building + satisfaction system"
```

---

### Task 2: Prototype Game Logic Hook

**Files:**
- Create: `src/hooks/usePrototypeGameLogic.js`

This is the largest task. The hook manages: round counter, gold/income, pools (reuse existing generation), inventory (reuse existing), buildings (build/use), demands (generate/fulfill/expire), satisfaction, prosperity, building unlock draws, win/lose conditions.

**Step 1: Create the hook file**

The hook reuses pool generation and draw mechanics from the existing `helpers.js` and adapts the inventory system. It replaces orders/score/emergency with the new systems.

Key state variables:
- `round` (number) - current round
- `gold` (number) - currency
- `prosperity` (number) - win condition counter
- `satisfaction` (number) - lose condition counter
- `buildings` (array) - built buildings (max 5)
- `availableBuildings` (array) - buildings available to build
- `activeDemands` (array) - current active demands with remaining time
- `inventory` (array) - reuse existing pattern
- `activePools` (array) - reuse existing pattern
- `buildingCandidates` (object|null) - {candidates: [...], triggered: bool} for building selection modal
- `nextBuildingDrawAt` (number) - next prosperity threshold for building draw
- `gameStatus` ('playing'|'won'|'lost')

Key actions:
- `endRound()` - advance round, give income, tick demand timers, apply satisfaction changes, check demand generation, check win/lose
- `handleDraw(pool)` - reuse existing draw logic (simplified: no orders, no skills, no emergency)
- `buildBuilding(buildingId)` - consume items, add building, gain prosperity if applicable
- `useBuilding(buildingIndex, itemIndices)` - consume items from inventory, apply building output
- `fulfillDemand(demandIndex, itemIndices)` - consume items, stop demand drain, gain currency reward
- `demolishBuilding(buildingIndex)` - remove building, free slot
- `selectBuildingCandidate(index)` - pick from building draw candidates

```js
// NOTE: This is the skeleton structure. Full implementation follows.
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllNormalItems, rollRarity, getNextRarity, getRandomAffix, getRandomItems
} from '../utils/helpers';
import { INITIAL_RARITY_CONFIG } from '../data/constants';
import {
  BUILDING_DEFINITIONS, DEMAND_DEFINITIONS, DEMAND_SCHEDULE,
  ADVANCED_DEMAND_START_ROUND, PROTOTYPE_CONFIG
} from '../data/prototypeConstants';
import { useLanguage } from '../contexts/LanguageContext';

export const usePrototypeGameLogic = (config) => {
  const { t } = useLanguage();
  const currentStageConfig = config.stages[0];
  const maxInventorySize = currentStageConfig.inventorySize;

  // --- Core State ---
  const [round, setRound] = useState(0); // 0 = before first round
  const [gold, setGold] = useState(PROTOTYPE_CONFIG.startingGold);
  const [prosperity, setProsperity] = useState(0);
  const [satisfaction, setSatisfaction] = useState(PROTOTYPE_CONFIG.startingSatisfaction);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing' | 'won' | 'lost'

  // --- Pool/Inventory (reuse patterns from useGameLogic) ---
  const [activePools, setActivePools] = useState([]);
  const [inventory, setInventory] = useState(Array(maxInventorySize).fill(null));
  const [pendingItem, setPendingItem] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [selectionMode, setSelectionMode] = useState(null);

  // --- Building State ---
  const [buildings, setBuildings] = useState([]); // built buildings
  const [availableBuildings, setAvailableBuildings] = useState([]); // can be built
  const [buildingCandidates, setBuildingCandidates] = useState(null); // draw selection
  const [nextBuildingDrawAt, setNextBuildingDrawAt] = useState(PROTOTYPE_CONFIG.buildingDrawInterval);

  // --- Demand State ---
  const [activeDemands, setActiveDemands] = useState([]);

  // --- UI State ---
  const [toast, setToast] = useState(null);
  const [pendingBuildingId, setPendingBuildingId] = useState(null); // building being constructed
  const [pendingDemandIndex, setPendingDemandIndex] = useState(null); // demand being fulfilled
  const [pendingBuildingUseIndex, setPendingBuildingUseIndex] = useState(null); // building being used
  const [modalContent, setModalContent] = useState(null);

  const showToast = (message, type = 'info') => setToast({ message, type });
  const hideToast = () => setToast(null);

  const allNormalItems = useMemo(
    () => getAllNormalItems(config.pools, currentStageConfig),
    [config.pools, currentStageConfig]
  );

  // --- Pool Generation (reuse from existing) ---
  const generateActivePools = useCallback(() => {
    const result = [];
    const usedAffixIds = new Set();
    let tempPools = [...config.pools.slice(0, currentStageConfig.allowedPoolCount)];

    for (let i = 0; i < 3; i++) {
      if (tempPools.length === 0) break;
      const totalWeight = tempPools.reduce((sum, p) => sum + (p.weight || 1), 0);
      let r = Math.random() * totalWeight;
      let selectedIndex = -1;
      for (let j = 0; j < tempPools.length; j++) {
        r -= (tempPools[j].weight || 1);
        if (r <= 0) { selectedIndex = j; break; }
      }
      if (selectedIndex === -1) selectedIndex = tempPools.length - 1;
      const selectedPool = JSON.parse(JSON.stringify(tempPools[selectedIndex]));
      selectedPool.items = selectedPool.items.slice(0, currentStageConfig.poolSize);
      if (currentStageConfig.mechanics.affixes) {
        const availableAffixes = config.affixes.filter(a => !usedAffixIds.has(a.id));
        const affixPool = availableAffixes.length > 0 ? availableAffixes : config.affixes;
        const affix = getRandomAffix(affixPool);
        selectedPool.affixKey = affix.id;
        selectedPool.affix = affix;
        selectedPool.cost = affix.cost || 2;
        usedAffixIds.add(affix.id);
      } else {
        selectedPool.cost = 2;
      }
      result.push(selectedPool);
      tempPools.splice(selectedIndex, 1);
    }
    return result;
  }, [config.pools, config.affixes, currentStageConfig]);

  const refreshPools = useCallback(() => {
    setActivePools(generateActivePools());
  }, [generateActivePools]);

  // --- Initialize ---
  useEffect(() => {
    refreshPools();
    // Set starting available buildings (tier 0)
    const tier0 = BUILDING_DEFINITIONS.filter(b => b.tier === 0);
    setAvailableBuildings(tier0.map(b => b.id));
  }, []);

  // --- Pending queue processing ---
  useEffect(() => {
    if (!pendingItem && pendingQueue.length > 0) {
      setPendingItem(pendingQueue[0]);
      setPendingQueue(prev => prev.slice(1));
    }
  }, [pendingItem, pendingQueue]);

  // --- Helper: find rarity object ---
  const getRarity = (rarityId) => {
    return config.rarity.find(r => r.id === rarityId) || config.rarity[0];
  };

  const getRarityIndex = (rarityId) => {
    return config.rarity.findIndex(r => r.id === rarityId);
  };

  // --- Helper: check if items in inventory match a requirement ---
  const findMatchingItems = (inv, requirement, excludeIndices = new Set()) => {
    const matches = [];
    const minRarityIdx = requirement.minRarity ? getRarityIndex(requirement.minRarity) : 0;

    for (let i = 0; i < inv.length; i++) {
      if (excludeIndices.has(i)) continue;
      const item = inv[i];
      if (!item) continue;
      if (!requirement.anyCategory && item.poolId !== requirement.category) continue;
      const itemRarityIdx = getRarityIndex(item.rarity.id);
      if (itemRarityIdx < minRarityIdx) continue;
      matches.push(i);
    }
    return matches;
  };

  // --- Helper: check if inventory can satisfy a set of requirements ---
  const canSatisfyRequirements = (inv, requirements) => {
    const used = new Set();
    for (const req of requirements) {
      const needed = req.count || 1;
      const matches = findMatchingItems(inv, req, used);
      if (matches.length < needed) return false;
      // Use first N matches
      for (let i = 0; i < needed; i++) {
        used.add(matches[i]);
      }
    }
    return true;
  };

  // --- Helper: get indices that satisfy requirements ---
  const getItemIndicesForRequirements = (inv, requirements) => {
    const used = new Set();
    const result = [];
    for (const req of requirements) {
      const needed = req.count || 1;
      const matches = findMatchingItems(inv, req, used);
      for (let i = 0; i < needed && i < matches.length; i++) {
        used.add(matches[i]);
        result.push(matches[i]);
      }
    }
    return result;
  };

  // --- Helper: remove items at indices from inventory ---
  const removeItemsAtIndices = (inv, indices) => {
    const newInv = [...inv];
    for (const idx of indices) {
      newInv[idx] = null;
    }
    return newInv;
  };

  // --- Satisfaction tier ---
  const satisfactionTier = useMemo(() => {
    return PROTOTYPE_CONFIG.satisfactionTiers.find(
      t => satisfaction >= t.min && satisfaction <= t.max
    ) || PROTOTYPE_CONFIG.satisfactionTiers[PROTOTYPE_CONFIG.satisfactionTiers.length - 1];
  }, [satisfaction]);

  // --- Draw (simplified from existing, no skills/tools/orders) ---
  const handleDraw = useCallback((pool) => {
    if (gameStatus !== 'playing') return;
    if (pendingItem) { showToast(t('请先处理待定物品'), 'error'); return; }
    if (selectionMode) return;

    const cost = pool.cost || 2;
    if (gold < cost) { showToast(t('金币不足'), 'error'); return; }

    // Handle interaction affixes
    if (pool.affix?.type === 'interaction') {
      setGold(prev => prev - cost);
      if (pool.affixKey === 'precise') {
        const items = pool.items;
        const candidates = getRandomItems(items, 2).map(item => {
          const rarity = rollRarity(config, pool.affixKey, gold - cost, () => false, {}, currentStageConfig);
          return { ...item, rarity, poolId: pool.id, poolName: pool.name, uid: Math.random().toString(36).substr(2, 9) };
        });
        setSelectionMode({ type: 'precise', pool, items: candidates, cost });
        return;
      }
      if (pool.affixKey === 'targeted') {
        setSelectionMode({ type: 'targeted', pool, items: pool.items, cost });
        return;
      }
      if (pool.affixKey === 'trade_in') {
        setSelectionMode({ type: 'trade_in', pool, cost });
        return;
      }
    }

    // Passive affix draw
    setGold(prev => prev - cost);
    let newItems = [];

    if (pool.affixKey === 'fragmented') {
      // 3 common items
      for (let i = 0; i < 3; i++) {
        const item = pool.items[Math.floor(Math.random() * pool.items.length)];
        const rarity = getRarity('common');
        newItems.push({ ...item, rarity, poolId: pool.id, poolName: pool.name, uid: Math.random().toString(36).substr(2, 9) });
      }
    } else {
      const item = pool.items[Math.floor(Math.random() * pool.items.length)];
      const rarity = rollRarity(config, pool.affixKey, gold - cost, () => false, {}, currentStageConfig);
      const sterile = pool.affixKey === 'hardened';
      newItems.push({ ...item, rarity, poolId: pool.id, poolName: pool.name, sterile, uid: Math.random().toString(36).substr(2, 9) });
    }

    // Place items
    handleIncomingItems(newItems);
    refreshPools();
  }, [gameStatus, gold, pendingItem, selectionMode, config, currentStageConfig, refreshPools]);

  // --- Selection mode handlers ---
  const handleSelectionSelect = useCallback((selectedItem) => {
    if (!selectionMode) return;
    const item = {
      ...selectedItem,
      uid: selectedItem.uid || Math.random().toString(36).substr(2, 9),
      poolId: selectionMode.pool.id,
      poolName: selectionMode.pool.name,
    };
    if (!item.rarity) {
      item.rarity = rollRarity(config, selectionMode.pool.affixKey, gold, () => false, {}, currentStageConfig);
    }
    handleIncomingItems([item]);
    setSelectionMode(null);
    refreshPools();
  }, [selectionMode, config, gold, currentStageConfig, refreshPools]);

  const handleSelectionCancel = useCallback(() => {
    if (!selectionMode) return;
    setGold(prev => prev + selectionMode.cost);
    setSelectionMode(null);
  }, [selectionMode]);

  // --- Incoming items (simplified) ---
  const handleIncomingItems = (newItems) => {
    setInventory(prev => {
      let inv = [...prev];
      const overflow = [];
      for (const item of newItems) {
        const emptyIdx = inv.findIndex(slot => slot === null);
        if (emptyIdx !== -1) {
          inv[emptyIdx] = item;
        } else {
          overflow.push(item);
        }
      }
      if (overflow.length > 0) {
        setPendingItem(overflow[0]);
        if (overflow.length > 1) {
          setPendingQueue(prev => [...prev, ...overflow.slice(1)]);
        }
      }
      return inv;
    });
  };

  // --- Slot click (simplified from existing - merge, move, place pending) ---
  const handleSlotClick = useCallback((index) => {
    if (gameStatus !== 'playing') return;

    // Trade-in selection mode
    if (selectionMode?.type === 'trade_in') {
      const item = inventory[index];
      if (!item) return;
      // Consume item, get new same-quality item from pool
      const pool = selectionMode.pool;
      const otherItems = pool.items.filter(i => i.name !== item.name);
      if (otherItems.length === 0) return;
      const newItemBase = otherItems[Math.floor(Math.random() * otherItems.length)];
      const upgradeChance = Math.random() < 0.05;
      let newRarity = item.rarity;
      if (upgradeChance) {
        const next = getNextRarity(item.rarity.id, config);
        if (next) newRarity = next;
      }
      const newItem = { ...newItemBase, rarity: newRarity, poolId: pool.id, poolName: pool.name, sterile: item.sterile, uid: Math.random().toString(36).substr(2, 9) };
      setInventory(prev => { const n = [...prev]; n[index] = newItem; return n; });
      setSelectionMode(null);
      refreshPools();
      return;
    }

    // Item selection for building use or demand fulfillment
    if (pendingBuildingUseIndex !== null || pendingDemandIndex !== null || pendingBuildingId !== null) {
      const item = inventory[index];
      if (!item) return;
      // Toggle selection
      setSelectedIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
      return;
    }

    // Pending item placement
    if (pendingItem) {
      const targetItem = inventory[index];
      if (!targetItem) {
        // Place in empty slot
        setInventory(prev => { const n = [...prev]; n[index] = pendingItem; return n; });
        setPendingItem(null);
        return;
      }
      // Try merge
      if (targetItem.name === pendingItem.name &&
          targetItem.rarity.id === pendingItem.rarity.id &&
          targetItem.rarity.id !== 'mythic' &&
          !targetItem.sterile && !pendingItem.sterile) {
        const nextRarity = getNextRarity(targetItem.rarity.id, config);
        if (nextRarity) {
          const merged = { ...targetItem, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
          setInventory(prev => { const n = [...prev]; n[index] = merged; return n; });
          setPendingItem(null);
          return;
        }
      }
      // Replace (recycle old)
      const recycleValue = targetItem.rarity.recycleValue || 0;
      setGold(prev => prev + recycleValue);
      setInventory(prev => { const n = [...prev]; n[index] = pendingItem; return n; });
      setPendingItem(null);
      return;
    }

    // Normal selection
    if (selectedSlot === null) {
      if (inventory[index]) setSelectedSlot(index);
      return;
    }

    if (selectedSlot === index) {
      setSelectedSlot(null);
      return;
    }

    const srcItem = inventory[selectedSlot];
    const dstItem = inventory[index];

    if (!dstItem) {
      // Move to empty
      setInventory(prev => { const n = [...prev]; n[index] = srcItem; n[selectedSlot] = null; return n; });
      setSelectedSlot(null);
      return;
    }

    // Try merge
    if (srcItem && dstItem &&
        srcItem.name === dstItem.name &&
        srcItem.rarity.id === dstItem.rarity.id &&
        srcItem.rarity.id !== 'mythic' &&
        !srcItem.sterile && !dstItem.sterile) {
      const nextRarity = getNextRarity(srcItem.rarity.id, config);
      if (nextRarity) {
        const merged = { ...srcItem, rarity: nextRarity, uid: Math.random().toString(36).substr(2, 9) };
        setInventory(prev => { const n = [...prev]; n[index] = merged; n[selectedSlot] = null; return n; });
        setSelectedSlot(null);
        return;
      }
    }

    // Swap
    setInventory(prev => { const n = [...prev]; n[index] = srcItem; n[selectedSlot] = dstItem; return n; });
    setSelectedSlot(null);
  }, [gameStatus, inventory, selectedSlot, pendingItem, selectionMode, pendingBuildingUseIndex, pendingDemandIndex, pendingBuildingId, config, refreshPools]);

  // --- Discard pending item ---
  const handleDiscardNew = useCallback(() => {
    if (!pendingItem) return;
    const recycleValue = pendingItem.rarity?.recycleValue || 0;
    setGold(prev => prev + recycleValue);
    setPendingItem(null);
  }, [pendingItem]);

  // --- Recycle selected items ---
  const handleRecycle = useCallback((indices) => {
    let totalValue = 0;
    setInventory(prev => {
      const n = [...prev];
      for (const idx of indices) {
        if (n[idx]) {
          totalValue += n[idx].rarity?.recycleValue || 0;
          n[idx] = null;
        }
      }
      return n;
    });
    setGold(prev => prev + totalValue);
    setSelectedIndices([]);
    setSelectedSlot(null);
  }, []);

  // --- Building: start building ---
  const startBuilding = useCallback((buildingId) => {
    if (gameStatus !== 'playing') return;
    const def = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
    if (!def) return;
    if (buildings.length >= PROTOTYPE_CONFIG.maxActiveBuildings) {
      showToast(t('建筑槽位已满'), 'error');
      return;
    }
    // Enter building mode - player selects items
    setPendingBuildingId(buildingId);
    setSelectedIndices([]);
  }, [gameStatus, buildings]);

  // --- Building: confirm build ---
  const confirmBuilding = useCallback(() => {
    if (!pendingBuildingId) return;
    const def = BUILDING_DEFINITIONS.find(b => b.id === pendingBuildingId);
    if (!def) return;

    // Validate selected items match build cost
    const requirements = Array.isArray(def.buildCost) ? def.buildCost : [def.buildCost];
    const selectedItems = selectedIndices.map(i => inventory[i]).filter(Boolean);

    // Check requirements
    const tempInv = selectedIndices.map(i => inventory[i]);
    const used = new Set();
    let valid = true;
    for (const req of requirements) {
      const needed = req.count || 1;
      let found = 0;
      for (let i = 0; i < tempInv.length; i++) {
        if (used.has(i)) continue;
        const item = tempInv[i];
        if (!item) continue;
        if (!req.anyCategory && item.poolId !== req.category) continue;
        const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
        if (getRarityIndex(item.rarity.id) < minIdx) continue;
        found++;
        used.add(i);
        if (found >= needed) break;
      }
      if (found < needed) { valid = false; break; }
    }

    if (!valid) {
      showToast(t('所选物品不满足建造需求'), 'error');
      return;
    }

    // Remove items and add building
    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));
    setBuildings(prev => [...prev, { ...def, builtAtRound: round }]);
    setAvailableBuildings(prev => prev.filter(id => id !== pendingBuildingId));
    setPendingBuildingId(null);
    setSelectedIndices([]);
    showToast(`${def.name} ${t('建造完成')}!`);
  }, [pendingBuildingId, selectedIndices, inventory, round]);

  const cancelBuilding = useCallback(() => {
    setPendingBuildingId(null);
    setSelectedIndices([]);
  }, []);

  // --- Building: use ---
  const startUseBuilding = useCallback((buildingIndex) => {
    if (gameStatus !== 'playing') return;
    setPendingBuildingUseIndex(buildingIndex);
    setSelectedIndices([]);
  }, [gameStatus]);

  const confirmUseBuilding = useCallback(() => {
    if (pendingBuildingUseIndex === null) return;
    const building = buildings[pendingBuildingUseIndex];
    if (!building) return;

    // Validate
    const requirements = Array.isArray(building.useCondition) ? building.useCondition : [building.useCondition];
    const tempInv = selectedIndices.map(i => inventory[i]);
    const used = new Set();
    let valid = true;
    for (const req of requirements) {
      const needed = req.count || 1;
      let found = 0;
      for (let i = 0; i < tempInv.length; i++) {
        if (used.has(i)) continue;
        const item = tempInv[i];
        if (!item) continue;
        if (!req.anyCategory && item.poolId !== req.category) continue;
        const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
        if (getRarityIndex(item.rarity.id) < minIdx) continue;
        found++;
        used.add(i);
        if (found >= needed) break;
      }
      if (found < needed) { valid = false; break; }
    }

    if (!valid) {
      showToast(t('所选物品不满足使用条件'), 'error');
      return;
    }

    // Remove items and apply output
    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));
    const output = building.useOutput;
    if (output.prosperity) {
      setProsperity(prev => {
        const next = prev + output.prosperity;
        // Check building draw threshold
        if (next >= nextBuildingDrawAt) {
          triggerBuildingDraw();
          setNextBuildingDrawAt(nextBuildingDrawAt + PROTOTYPE_CONFIG.buildingDrawInterval);
        }
        return next;
      });
    }
    if (output.satisfaction) {
      setSatisfaction(prev => Math.min(PROTOTYPE_CONFIG.maxSatisfaction, prev + output.satisfaction));
    }
    if (output.currency) {
      setGold(prev => prev + output.currency);
    }

    setPendingBuildingUseIndex(null);
    setSelectedIndices([]);
  }, [pendingBuildingUseIndex, buildings, selectedIndices, inventory, nextBuildingDrawAt]);

  const cancelUseBuilding = useCallback(() => {
    setPendingBuildingUseIndex(null);
    setSelectedIndices([]);
  }, []);

  // --- Building: demolish ---
  const demolishBuilding = useCallback((buildingIndex) => {
    setBuildings(prev => prev.filter((_, i) => i !== buildingIndex));
  }, []);

  // --- Building: draw ---
  const triggerBuildingDraw = useCallback(() => {
    const builtIds = new Set(buildings.map(b => b.id));
    const availableIds = new Set(availableBuildings);
    const unbuiltUnavailable = BUILDING_DEFINITIONS.filter(
      b => !builtIds.has(b.id) && !availableIds.has(b.id)
    );
    if (unbuiltUnavailable.length === 0) return;

    const count = Math.min(PROTOTYPE_CONFIG.buildingDrawCount, unbuiltUnavailable.length);
    const shuffled = [...unbuiltUnavailable].sort(() => Math.random() - 0.5);
    const candidates = shuffled.slice(0, count);
    setBuildingCandidates({ candidates });
  }, [buildings, availableBuildings]);

  const selectBuildingCandidate = useCallback((candidateId) => {
    setAvailableBuildings(prev => [...prev, candidateId]);
    setBuildingCandidates(null);
  }, []);

  // --- Demand: fulfill ---
  const startFulfillDemand = useCallback((demandIndex) => {
    if (gameStatus !== 'playing') return;
    setPendingDemandIndex(demandIndex);
    setSelectedIndices([]);
  }, [gameStatus]);

  const confirmFulfillDemand = useCallback(() => {
    if (pendingDemandIndex === null) return;
    const demand = activeDemands[pendingDemandIndex];
    if (!demand) return;

    // Validate
    const tempInv = selectedIndices.map(i => inventory[i]);
    const used = new Set();
    let valid = true;
    for (const req of demand.requires) {
      const needed = req.count || 1;
      let found = 0;
      for (let i = 0; i < tempInv.length; i++) {
        if (used.has(i)) continue;
        const item = tempInv[i];
        if (!item) continue;
        if (item.poolId !== req.category) continue;
        const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
        if (getRarityIndex(item.rarity.id) < minIdx) continue;
        found++;
        used.add(i);
        if (found >= needed) break;
      }
      if (found < needed) { valid = false; break; }
    }

    if (!valid) {
      showToast(t('所选物品不满足需求'), 'error');
      return;
    }

    // Remove items, give reward
    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));
    let currencyReward = demand.reward.currency || 0;

    // Satisfaction tier bonus
    if (satisfactionTier.effect === 'demand_reward_bonus') {
      currencyReward = Math.floor(currencyReward * (1 + satisfactionTier.value));
    }

    setGold(prev => prev + currencyReward);
    setActiveDemands(prev => prev.filter((_, i) => i !== pendingDemandIndex));
    setPendingDemandIndex(null);
    setSelectedIndices([]);
    showToast(`${demand.name} ${t('已满足')}! +${currencyReward} ${t('金币')}`);
  }, [pendingDemandIndex, activeDemands, selectedIndices, inventory, satisfactionTier]);

  const cancelFulfillDemand = useCallback(() => {
    setPendingDemandIndex(null);
    setSelectedIndices([]);
  }, []);

  // --- Demand generation ---
  const generateDemand = useCallback((roundNum) => {
    const pool = roundNum >= ADVANCED_DEMAND_START_ROUND
      ? [...DEMAND_DEFINITIONS.basic, ...DEMAND_DEFINITIONS.advanced]
      : [...DEMAND_DEFINITIONS.basic];

    // Don't generate if at max
    if (activeDemands.length >= PROTOTYPE_CONFIG.maxActiveDemands) return null;

    const def = pool[Math.floor(Math.random() * pool.length)];
    let timeLimit = def.timeLimit;

    // Satisfaction tier: reduce time limit
    if (satisfactionTier.effect === 'demand_timelimit_reduce') {
      timeLimit = Math.max(1, timeLimit - satisfactionTier.value);
    }

    return {
      ...def,
      instanceId: Math.random().toString(36).substr(2, 9),
      remainingTime: timeLimit,
      generatedAtRound: roundNum,
    };
  }, [activeDemands.length, satisfactionTier]);

  // --- End Round ---
  const endRound = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (pendingItem) { showToast(t('请先处理待定物品'), 'error'); return; }
    if (buildingCandidates) { showToast(t('请先选择建筑'), 'error'); return; }

    const newRound = round + 1;

    // 1. Income
    setGold(prev => prev + PROTOTYPE_CONFIG.incomePerRound);

    // 2. Tick demand timers and apply satisfaction drain
    let satChange = 0;
    const expiredDemands = [];
    const updatedDemands = activeDemands.map(d => {
      const updated = { ...d, remainingTime: d.remainingTime - 1 };
      satChange += d.satisfactionPerRound; // negative value
      if (updated.remainingTime <= 0) {
        expiredDemands.push(updated);
      }
      return updated;
    }).filter(d => d.remainingTime > 0);

    // Apply expired penalties
    for (const expired of expiredDemands) {
      satChange += PROTOTYPE_CONFIG.demandExpirePenalty;
      showToast(`${expired.name} ${t('已过期')}! ${PROTOTYPE_CONFIG.demandExpirePenalty} ${t('满意度')}`);
    }

    const newSatisfaction = Math.max(0, Math.min(PROTOTYPE_CONFIG.maxSatisfaction, satisfaction + satChange));
    setSatisfaction(newSatisfaction);

    // 3. Generate new demand if scheduled
    let newDemands = updatedDemands;
    if (DEMAND_SCHEDULE.includes(newRound)) {
      const newDemand = generateDemand(newRound);
      if (newDemand) {
        newDemands = [...newDemands, newDemand];
      }
    }
    setActiveDemands(newDemands);

    // 4. Check win/lose
    if (prosperity >= PROTOTYPE_CONFIG.prosperityTarget) {
      setGameStatus('won');
      setModalContent({ type: 'victory' });
    } else if (newSatisfaction <= 0) {
      setGameStatus('lost');
      setModalContent({ type: 'game_over' });
    }

    setRound(newRound);
    setSelectedSlot(null);
    setSelectedIndices([]);
  }, [gameStatus, round, activeDemands, satisfaction, prosperity, pendingItem, buildingCandidates, generateDemand]);

  // --- Start game (first round) ---
  const startGame = useCallback(() => {
    setRound(1);
    setGold(PROTOTYPE_CONFIG.startingGold);
    // Generate demand if round 1 is in schedule
    if (DEMAND_SCHEDULE.includes(1)) {
      const demand = generateDemand(1);
      if (demand) setActiveDemands([demand]);
    }
  }, [generateDemand]);

  // Auto-start on mount
  useEffect(() => {
    if (round === 0) startGame();
  }, []);

  // --- Prosperity check for building draw (triggered on prosperity change) ---
  useEffect(() => {
    if (prosperity >= nextBuildingDrawAt && !buildingCandidates) {
      triggerBuildingDraw();
      setNextBuildingDrawAt(prev => prev + PROTOTYPE_CONFIG.buildingDrawInterval);
    }
  }, [prosperity, nextBuildingDrawAt, buildingCandidates]);

  // --- Close modal ---
  const handleCloseModal = useCallback(() => {
    setModalContent(null);
  }, []);

  // --- Sort inventory ---
  const handleSortInventory = useCallback(() => {
    setInventory(prev => {
      const items = prev.filter(Boolean);
      items.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, 'zh-CN');
        if (nameCompare !== 0) return nameCompare;
        const rarityA = getRarityIndex(a.rarity.id);
        const rarityB = getRarityIndex(b.rarity.id);
        return rarityB - rarityA;
      });
      const sorted = Array(maxInventorySize).fill(null);
      items.forEach((item, i) => { sorted[i] = item; });
      return sorted;
    });
    setSelectedSlot(null);
  }, [maxInventorySize]);

  // --- Return ---
  return {
    state: {
      round,
      gold,
      prosperity,
      satisfaction,
      satisfactionTier,
      gameStatus,
      activePools,
      inventory,
      pendingItem,
      pendingQueue,
      selectedSlot,
      selectedIndices,
      selectionMode,
      buildings,
      availableBuildings,
      buildingCandidates,
      activeDemands,
      maxInventorySize,
      toast,
      modalContent,
      pendingBuildingId,
      pendingDemandIndex,
      pendingBuildingUseIndex,
      nextBuildingDrawAt,
    },
    actions: {
      handleDraw,
      handleSlotClick,
      handleSelectionSelect,
      handleSelectionCancel,
      handleDiscardNew,
      handleSortInventory,
      handleRecycle,
      startBuilding,
      confirmBuilding,
      cancelBuilding,
      startUseBuilding,
      confirmUseBuilding,
      cancelUseBuilding,
      demolishBuilding,
      selectBuildingCandidate,
      startFulfillDemand,
      confirmFulfillDemand,
      cancelFulfillDemand,
      endRound,
      showToast,
      hideToast,
      handleCloseModal,
    },
    config: {
      demandSchedule: DEMAND_SCHEDULE,
      prosperityTarget: PROTOTYPE_CONFIG.prosperityTarget,
      maxActiveBuildings: PROTOTYPE_CONFIG.maxActiveBuildings,
    },
  };
};
```

**Step 2: Verify no syntax errors**

Run: `npm run dev` and check console.

**Step 3: Commit**

```bash
git add src/hooks/usePrototypeGameLogic.js
git commit -m "feat: add prototype game logic hook with buildings, satisfaction, round system"
```

---

### Task 3: Building Card Component

**Files:**
- Create: `src/components/game/BuildingCard.jsx`

A card displaying a built building: name, use condition, output, and "use" button. Also used for "available to build" cards with a "build" button.

**Step 1: Create the component**

```jsx
import React from 'react';
import { Hammer, Play, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORY_LABELS = {
  fruit: '水果', medicine: '药物', stationery: '文具',
  kitchenware: '厨具', electronics: '电器',
};

const formatRequirement = (req, t) => {
  const category = req.anyCategory ? t('任意') : t(CATEGORY_LABELS[req.category] || req.category);
  const rarity = req.minRarity && req.minRarity !== 'common' ? t(req.minRarity) : '';
  return `${rarity}${category}x${req.count || 1}`;
};

const formatOutput = (output, t) => {
  const parts = [];
  if (output.prosperity) parts.push(`+${output.prosperity} ${t('繁荣')}`);
  if (output.satisfaction) parts.push(`+${output.satisfaction} ${t('满意度')}`);
  if (output.currency) parts.push(`+${output.currency} ${t('金币')}`);
  return parts.join(', ');
};

export const BuildingCard = ({ building, isBuilt, onBuild, onUse, onDemolish, disabled, isActive }) => {
  const { t } = useLanguage();
  const reqs = Array.isArray(building.buildCost) ? building.buildCost : [building.buildCost];
  const useReqs = Array.isArray(building.useCondition) ? building.useCondition : [building.useCondition];

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all ${
      isBuilt
        ? isActive ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
        : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-base">{t(building.name)}</span>
        {isBuilt && (
          <button onClick={onDemolish} className="text-red-400 hover:text-red-600 p-1" title={t('拆除')}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {isBuilt ? (
        <>
          <div className="text-gray-500 mb-1">
            {t('使用')}: {useReqs.map(r => formatRequirement(r, t)).join(' + ')}
          </div>
          <div className="text-green-700 font-medium mb-2">
            {formatOutput(building.useOutput, t)}
          </div>
          <button
            onClick={onUse}
            disabled={disabled}
            className="w-full py-1.5 rounded bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Play size={14} /> {t('使用')}
          </button>
        </>
      ) : (
        <>
          <div className="text-gray-500 mb-1">
            {t('建造')}: {reqs.map(r => formatRequirement(r, t)).join(' + ')}
          </div>
          <div className="text-green-700 font-medium text-xs mb-2">
            {t('使用效果')}: {formatOutput(building.useOutput, t)}
          </div>
          <button
            onClick={onBuild}
            disabled={disabled}
            className="w-full py-1.5 rounded bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Hammer size={14} /> {t('建造')}
          </button>
        </>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/game/BuildingCard.jsx
git commit -m "feat: add BuildingCard component for prototype"
```

---

### Task 4: Demand Card Component

**Files:**
- Create: `src/components/game/DemandCard.jsx`

Displays an active demand: name, requirements, remaining time, satisfaction drain rate, reward.

**Step 1: Create the component**

```jsx
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORY_ICONS = {
  fruit: '🍎', medicine: '💊', stationery: '✏️',
  kitchenware: '🍳', electronics: '⚡️',
};
const CATEGORY_LABELS = {
  fruit: '水果', medicine: '药物', stationery: '文具',
  kitchenware: '厨具', electronics: '电器',
};
const RARITY_LABELS = {
  common: '普通', uncommon: '优秀', rare: '稀有',
  epic: '史诗', legendary: '传说', mythic: '神话',
};

export const DemandCard = ({ demand, onFulfill, disabled, canFulfill }) => {
  const { t } = useLanguage();
  const isUrgent = demand.remainingTime <= 1;

  return (
    <div className={`rounded-lg border-2 p-3 text-sm transition-all ${
      isUrgent ? 'border-red-400 bg-red-50 animate-pulse' : 'border-orange-300 bg-orange-50'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold">{t(demand.name)}</span>
        <div className="flex items-center gap-1 text-xs">
          <Clock size={12} />
          <span className={isUrgent ? 'text-red-600 font-bold' : 'text-gray-600'}>
            {demand.remainingTime} {t('回合')}
          </span>
        </div>
      </div>

      <div className="text-xs text-red-500 mb-1">
        {demand.satisfactionPerRound}/{t('回合')} {t('满意度')}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {demand.requires.map((req, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border text-xs">
            {CATEGORY_ICONS[req.category]}
            {req.minRarity && req.minRarity !== 'common' && (
              <span className="text-purple-600">{t(RARITY_LABELS[req.minRarity])}</span>
            )}
            {t(CATEGORY_LABELS[req.category])}x{req.count}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-green-700 text-xs font-medium">
          {t('奖励')}: +{demand.reward.currency} {t('金币')}
        </span>
        <button
          onClick={onFulfill}
          disabled={disabled}
          className={`px-3 py-1 rounded text-xs font-medium ${
            canFulfill
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('满足')}
        </button>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/game/DemandCard.jsx
git commit -m "feat: add DemandCard component for prototype"
```

---

### Task 5: Timeline Component

**Files:**
- Create: `src/components/game/Timeline.jsx`

A horizontal bar showing rounds 1-18, current round highlighted, and demand markers on scheduled rounds.

**Step 1: Create the component**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Timeline = ({ currentRound, demandSchedule, totalRounds = 18 }) => {
  const { t } = useLanguage();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-100 rounded-lg overflow-x-auto">
      <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">{t('回合')}:</span>
      {rounds.map(r => {
        const isCurrent = r === currentRound;
        const hasDemand = demandSchedule.includes(r);
        const isPast = r < currentRound;

        return (
          <div
            key={r}
            className={`w-7 h-7 flex flex-col items-center justify-center rounded text-xs font-medium transition-all ${
              isCurrent
                ? 'bg-blue-500 text-white scale-110 shadow'
                : isPast
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-white text-gray-700 border'
            }`}
            title={hasDemand ? `${t('回合')} ${r}: ${t('需求出现')}` : `${t('回合')} ${r}`}
          >
            <span>{r}</span>
            {hasDemand && (
              <div className={`w-1.5 h-1.5 rounded-full ${
                isPast ? 'bg-gray-400' : isCurrent ? 'bg-yellow-300' : 'bg-orange-400'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/game/Timeline.jsx
git commit -m "feat: add Timeline component for round visualization"
```

---

### Task 6: Building Selection Modal

**Files:**
- Create: `src/components/game/BuildingSelectionModal.jsx`

Modal that shows 2-3 building candidates when prosperity threshold is reached. Player picks one.

**Step 1: Create the component**

```jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BuildingCard } from './BuildingCard';

export const BuildingSelectionModal = ({ candidates, onSelect }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-1">{t('新建筑可用')}</h2>
        <p className="text-sm text-gray-500 text-center mb-4">{t('选择一个建筑加入可建列表')}</p>
        <div className="flex flex-col gap-3">
          {candidates.map(building => (
            <div
              key={building.id}
              onClick={() => onSelect(building.id)}
              className="cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <BuildingCard building={building} isBuilt={false} disabled={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/game/BuildingSelectionModal.jsx
git commit -m "feat: add BuildingSelectionModal for prosperity threshold draws"
```

---

### Task 7: Prototype Game Core

**Files:**
- Create: `src/PrototypeGameCore.jsx`

The main layout component that wires together pools, inventory, buildings, demands, timeline, and modals. Replaces `GameCore.jsx` for the prototype.

**Step 1: Create the component**

This is the largest UI file. Layout:
```
┌──────────────────────────────────────────────┐
│ HEADER: Round | Gold | Prosperity | Satisf.  │
├──────────────────────────────────────────────┤
│ TIMELINE: round 1-18 with demand markers     │
├──────────────┬───────────────────────────────┤
│ LEFT (40%)   │ RIGHT (60%)                   │
│              │                               │
│ Demands      │ Pools (3x PoolCard)           │
│ (active)     │                               │
│              │ Selection overlay              │
│ Buildings    │                               │
│ (built)      │ Inventory grid                │
│              │ + action buttons              │
│ Available    │ + pending item                │
│ (to build)   │                               │
└──────────────┴───────────────────────────────┘
```

```jsx
import React from 'react';
import { Coins, Star, Heart, SkipForward, Layers, ArrowDown } from 'lucide-react';

import { usePrototypeGameLogic } from './hooks/usePrototypeGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { PoolCard } from './components/game/PoolCard';
import { InventorySlot } from './components/game/InventorySlot';
import { BuildingCard } from './components/game/BuildingCard';
import { DemandCard } from './components/game/DemandCard';
import { Timeline } from './components/game/Timeline';
import { BuildingSelectionModal } from './components/game/BuildingSelectionModal';
import { BUILDING_DEFINITIONS } from './data/prototypeConstants';

const PrototypeGameCore = ({ config, onReset }) => {
  const { t } = useLanguage();
  const { state, actions, config: gameConfig } = usePrototypeGameLogic(config);

  const {
    round, gold, prosperity, satisfaction, satisfactionTier, gameStatus,
    activePools, inventory, pendingItem, pendingQueue, selectedSlot,
    selectedIndices, selectionMode, buildings, availableBuildings,
    buildingCandidates, activeDemands, maxInventorySize, toast,
    modalContent, pendingBuildingId, pendingDemandIndex, pendingBuildingUseIndex,
  } = state;

  const isInSelectionAction = pendingBuildingId !== null || pendingDemandIndex !== null || pendingBuildingUseIndex !== null;
  const actionLabel = pendingBuildingId ? t('选择建造材料')
    : pendingDemandIndex !== null ? t('选择提交物品')
    : pendingBuildingUseIndex !== null ? t('选择使用物品')
    : null;

  // Check which demands can be fulfilled
  const canFulfillDemand = (demand) => {
    const used = new Set();
    for (const req of demand.requires) {
      const needed = req.count || 1;
      let found = 0;
      for (let i = 0; i < inventory.length; i++) {
        if (used.has(i)) continue;
        const item = inventory[i];
        if (!item) continue;
        if (item.poolId !== req.category) continue;
        const rarities = config.rarity || [];
        const minIdx = req.minRarity ? rarities.findIndex(r => r.id === req.minRarity) : 0;
        const itemIdx = rarities.findIndex(r => r.id === item.rarity.id);
        if (itemIdx < minIdx) continue;
        found++;
        used.add(i);
        if (found >= needed) break;
      }
      if (found < needed) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={actions.hideToast} />}

      {/* Building Selection Modal */}
      {buildingCandidates && (
        <BuildingSelectionModal
          candidates={buildingCandidates.candidates}
          onSelect={actions.selectBuildingCandidate}
        />
      )}

      {/* Win/Lose Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white text-gray-900 rounded-xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            {modalContent.type === 'victory' ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">{t('胜利')}</h2>
                <p className="text-gray-600 mb-4">{t('繁荣达到目标')}! {t('回合')}: {round}</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">💔</div>
                <h2 className="text-2xl font-bold mb-2 text-red-600">{t('失败')}</h2>
                <p className="text-gray-600 mb-4">{t('满意度降至零')}</p>
              </>
            )}
            <button onClick={onReset} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
              {t('重新开始')}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">{t('三池物语')}</span>
          <div className="flex items-center gap-1 text-yellow-400">
            <Coins size={16} />
            <span className="font-mono font-bold">{gold}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Star size={16} />
            <span className="font-mono font-bold">{prosperity}/{gameConfig.prosperityTarget}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: satisfaction > 30 ? '#4ade80' : satisfaction > 10 ? '#fbbf24' : '#ef4444' }}>
            <Heart size={16} />
            <span className="font-mono font-bold">{satisfaction}</span>
            <span className="text-xs opacity-60">({t(satisfactionTier.name)})</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{t('回合')} {round}</span>
          <button onClick={onReset} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600">
            {t('重置')}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-2">
        <Timeline currentRound={round} demandSchedule={gameConfig.demandSchedule} />
      </div>

      {/* Main layout */}
      <div className="flex px-4 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
        {/* LEFT: Demands + Buildings */}
        <div className="w-2/5 flex flex-col gap-3 overflow-y-auto pr-2 py-2">
          {/* Active Demands */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">{t('活跃需求')} ({activeDemands.length}/{gameConfig.maxActiveDemands})</h3>
            {activeDemands.length === 0 ? (
              <div className="text-xs text-gray-500 italic">{t('当前无需求')}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeDemands.map((demand, i) => (
                  <DemandCard
                    key={demand.instanceId}
                    demand={demand}
                    onFulfill={() => actions.startFulfillDemand(i)}
                    disabled={gameStatus !== 'playing' || isInSelectionAction}
                    canFulfill={canFulfillDemand(demand)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Built Buildings */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">{t('已建造')} ({buildings.length}/{gameConfig.maxActiveBuildings})</h3>
            <div className="flex flex-col gap-2">
              {buildings.map((building, i) => (
                <BuildingCard
                  key={building.id + '-' + i}
                  building={building}
                  isBuilt={true}
                  isActive={pendingBuildingUseIndex === i}
                  onUse={() => actions.startUseBuilding(i)}
                  onDemolish={() => actions.demolishBuilding(i)}
                  disabled={gameStatus !== 'playing' || isInSelectionAction}
                />
              ))}
            </div>
          </div>

          {/* Available Buildings */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">{t('可建造')}</h3>
            <div className="flex flex-col gap-2">
              {availableBuildings.map(id => {
                const def = BUILDING_DEFINITIONS.find(b => b.id === id);
                if (!def) return null;
                return (
                  <BuildingCard
                    key={id}
                    building={def}
                    isBuilt={false}
                    onBuild={() => actions.startBuilding(id)}
                    disabled={gameStatus !== 'playing' || isInSelectionAction || buildings.length >= gameConfig.maxActiveBuildings}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Pools + Inventory */}
        <div className="flex-1 flex flex-col gap-3 py-2">
          {/* Pools */}
          <div className="flex gap-3">
            {activePools.map((pool, i) => (
              <div key={pool.id + '-' + i} className="flex-1">
                <PoolCard
                  pool={pool}
                  gold={gold}
                  hasSkill={() => false}
                  config={config}
                  inventory={inventory}
                  onDraw={() => actions.handleDraw(pool)}
                  disabled={gameStatus !== 'playing' || !!pendingItem || !!selectionMode || isInSelectionAction}
                />
              </div>
            ))}
          </div>

          {/* Selection overlay for precise/targeted */}
          {selectionMode && selectionMode.type !== 'trade_in' && (
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-bold mb-2">
                {selectionMode.type === 'precise' ? t('选择一个物品') : t('选择想要的物品')}
              </h3>
              <div className="flex gap-2">
                {selectionMode.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => actions.handleSelectionSelect(item)}
                    className="flex-1 p-3 bg-slate-600 rounded-lg hover:bg-slate-500 text-center"
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <div className="text-sm">{item.name}</div>
                    {item.rarity && <div className="text-xs opacity-60">{item.rarity.name}</div>}
                  </button>
                ))}
              </div>
              <button onClick={actions.handleSelectionCancel} className="mt-2 text-sm text-gray-400 hover:text-white">
                {t('取消')}
              </button>
            </div>
          )}

          {/* Trade-in overlay */}
          {selectionMode?.type === 'trade_in' && (
            <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-3 text-sm">
              <span>{t('选择背包中要置换的物品')}</span>
              <button onClick={actions.handleSelectionCancel} className="ml-3 text-amber-400 hover:text-amber-300 text-xs">
                {t('取消')}
              </button>
            </div>
          )}

          {/* Action mode banner */}
          {isInSelectionAction && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{actionLabel} - {t('从背包中选择物品')}</span>
              <div className="flex gap-2">
                <button
                  onClick={
                    pendingBuildingId ? actions.confirmBuilding
                    : pendingDemandIndex !== null ? actions.confirmFulfillDemand
                    : actions.confirmUseBuilding
                  }
                  disabled={selectedIndices.length === 0}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:opacity-40"
                >
                  {t('确认')}
                </button>
                <button
                  onClick={
                    pendingBuildingId ? actions.cancelBuilding
                    : pendingDemandIndex !== null ? actions.cancelFulfillDemand
                    : actions.cancelUseBuilding
                  }
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600"
                >
                  {t('取消')}
                </button>
              </div>
            </div>
          )}

          {/* Inventory */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {t('库存')} ({inventory.filter(Boolean).length}/{maxInventorySize})
              </span>
              <div className="flex gap-1">
                <button onClick={actions.handleSortInventory} className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded border border-gray-600">
                  {t('整理')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {inventory.map((item, i) => (
                <InventorySlot
                  key={i}
                  index={i}
                  item={item}
                  onSlotClick={actions.handleSlotClick}
                  isSelected={selectedSlot === i || selectedIndices.includes(i)}
                  canSynthesize={false}
                  isSubmitMode={isInSelectionAction}
                  isRecycleMode={false}
                  selectedIndices={selectedIndices}
                />
              ))}
            </div>

            {/* Pending item */}
            {pendingItem && (
              <div className="mt-2 flex items-center gap-2 bg-slate-700 rounded-lg p-2">
                <div className="text-2xl">{pendingItem.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{pendingItem.name}</div>
                  <div className="text-xs opacity-60">{pendingItem.rarity?.name}</div>
                </div>
                <span className="text-xs text-gray-400">{t('点击背包格子放置')}</span>
                <button onClick={actions.handleDiscardNew} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-800 rounded">
                  {t('回收')}
                </button>
              </div>
            )}
          </div>

          {/* End Round button */}
          <button
            onClick={actions.endRound}
            disabled={gameStatus !== 'playing' || !!pendingItem || !!buildingCandidates || isInSelectionAction}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SkipForward size={20} />
            {t('结束回合')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrototypeGameCore;
```

**Step 2: Commit**

```bash
git add src/PrototypeGameCore.jsx
git commit -m "feat: add PrototypeGameCore layout component"
```

---

### Task 8: App Mode Toggle

**Files:**
- Modify: `src/App.jsx`

Add a toggle to switch between the existing game (`GameCore`) and the prototype (`PrototypeGameCore`).

**Step 1: Add import and state**

At the top of `App.jsx`, add:
```js
import PrototypeGameCore from './PrototypeGameCore';
```

Add state:
```js
const [isPrototypeMode, setIsPrototypeMode] = useState(true); // default to prototype
```

**Step 2: Add toggle button and conditional rendering**

In the render, before the `GameCore` component, add a toggle button. Replace the `GameCore` rendering with a conditional:

```jsx
{isPrototypeMode ? (
  <PrototypeGameCore
    key={gameId}
    config={config}
    onReset={() => setGameId(prev => prev + 1)}
  />
) : (
  <GameCore key={gameId} config={config} ... />
)}
```

Add a floating toggle button:
```jsx
<button
  onClick={() => { setIsPrototypeMode(prev => !prev); setGameId(prev => prev + 1); }}
  className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-lg"
>
  {isPrototypeMode ? '切换到旧版' : '切换到原型'}
</button>
```

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add mode toggle between existing game and prototype"
```

---

### Task 9: Translations

**Files:**
- Modify: `src/utils/translations.js`

**Step 1: Add English translations for all new prototype strings**

Add to `EN_TRANSLATIONS`:
```js
// Prototype
'回合': 'Round',
'结束回合': 'End Round',
'繁荣': 'Prosperity',
'满意度': 'Satisfaction',
'活跃需求': 'Active Demands',
'当前无需求': 'No active demands',
'已建造': 'Built',
'可建造': 'Available',
'建造': 'Build',
'使用': 'Use',
'使用效果': 'Effect',
'拆除': 'Demolish',
'满足': 'Fulfill',
'奖励': 'Reward',
'新建筑可用': 'New Building Available',
'选择一个建筑加入可建列表': 'Choose a building to add to your build list',
'建筑槽位已满': 'Building slots full',
'所选物品不满足建造需求': 'Selected items don\'t meet build requirements',
'建造完成': 'built',
'所选物品不满足使用条件': 'Selected items don\'t meet use requirements',
'所选物品不满足需求': 'Selected items don\'t meet demand',
'已满足': 'fulfilled',
'已过期': 'expired',
'胜利': 'Victory',
'失败': 'Defeat',
'繁荣达到目标': 'Prosperity target reached',
'满意度降至零': 'Satisfaction dropped to zero',
'重新开始': 'Restart',
'请先处理待定物品': 'Handle pending items first',
'请先选择建筑': 'Select a building first',
'选择建造材料': 'Select build materials',
'选择提交物品': 'Select items to submit',
'选择使用物品': 'Select items to use',
'从背包中选择物品': 'Select items from inventory',
'需求出现': 'Demand appears',
'整理': 'Sort',
'库存': 'Inventory',
'点击背包格子放置': 'Click a slot to place',
'切换到旧版': 'Switch to Classic',
'切换到原型': 'Switch to Prototype',
'繁荣': 'Prosperity',
'正常': 'Normal',
'不满': 'Unhappy',
'崩溃': 'Collapse',
'任意': 'Any',
```

**Step 2: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat: add English translations for prototype UI"
```

---

### Task 10: Smoke Test

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual playthrough checklist**

Open `http://localhost:5173/3pools_Web/` in browser.

- [ ] Prototype mode loads by default
- [ ] Header shows round, gold (15), prosperity (0/40), satisfaction (40)
- [ ] Timeline shows 18 rounds with demand markers at 1,4,7,10,13,16,18
- [ ] 3 pools are displayed with affixes
- [ ] Round 1 has demand visible
- [ ] Can draw from pools, items appear in inventory
- [ ] Can merge same-name same-quality items
- [ ] 3 available buildings (水果摊, 诊所, 文印店) shown
- [ ] Can click "建造" → select items from inventory → confirm → building appears in "已建造"
- [ ] Can click "使用" on built building → select items → confirm → prosperity/satisfaction/currency changes
- [ ] Can click "满足" on demand → select items → confirm → demand removed, gold gained
- [ ] Click "结束回合" → round advances, gold +5, demand timers tick
- [ ] Demands expire after time limit → satisfaction drops
- [ ] Prosperity reaches 8 → building draw modal appears
- [ ] Prosperity reaches 40 → victory modal
- [ ] Satisfaction reaches 0 → defeat modal
- [ ] Mode toggle button works

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: address smoke test issues for building+satisfaction prototype"
```

---

## Notes for Implementation

- **InventorySlot reuse**: The existing `InventorySlot.jsx` has many props for features we don't use (orders, tools, hover states). Pass minimal props and let unused features gracefully not render. May need minor adjustments if it crashes on missing props.
- **PoolCard reuse**: Pass `hasSkill={() => false}` and empty/default values for unused props. The component should work without modification.
- **Config object**: The prototype hook receives the same `config` object from `App.jsx`. It uses `config.stages[0]`, `config.pools`, `config.affixes`, `config.rarity` from the existing config. No changes needed to `constants.js`.
- **Leave room for iteration**: Building definitions, demand definitions, and economy numbers are all in `prototypeConstants.js` as simple data. Easy to adjust without touching logic.
