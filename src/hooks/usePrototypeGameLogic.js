import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllNormalItems, rollRarity, getNextRarity, getRandomAffix, getRandomItems
} from '../utils/helpers';
import {
  BUILDING_DEFINITIONS, PROTOTYPE_CONFIG,
  BUILDING_DRAW_THRESHOLDS, BUILDING_TIER_WEIGHTS, ITEM_LOOKUP,
  DEMAND_ELIGIBLE_CATEGORIES, DEMAND_SATISFACTION_RECOVERY,
  DEMAND_SCALING, DEMAND_BONUS_ITEM_EXTRA,
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
  const [nextDrawIndex, setNextDrawIndex] = useState(0); // index into BUILDING_DRAW_THRESHOLDS

  // --- Demand State (2 permanent demands) ---
  const [activeDemands, setActiveDemands] = useState([]);
  const [bonusItems, setBonusItems] = useState([]); // bonus item names for +1 satisfaction

  // --- UI State ---
  const [toast, setToast] = useState(null);
  const [pendingBuildingId, setPendingBuildingId] = useState(null);
  const [pendingDemandIndex, setPendingDemandIndex] = useState(null);
  const [pendingBuildingUseIndex, setPendingBuildingUseIndex] = useState(null);
  const [pendingRecipeIndex, setPendingRecipeIndex] = useState(null);
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

  // --- Helper: find rarity object ---
  const getRarity = (rarityId) => {
    return config.rarity.find(r => r.id === rarityId) || config.rarity[0];
  };

  const getRarityIndex = (rarityId) => {
    return config.rarity.findIndex(r => r.id === rarityId);
  };

  // --- Satisfaction tier ---
  const satisfactionTier = useMemo(() => {
    return PROTOTYPE_CONFIG.satisfactionTiers.find(
      tier => satisfaction >= tier.min && satisfaction <= tier.max
    ) || PROTOTYPE_CONFIG.satisfactionTiers[PROTOTYPE_CONFIG.satisfactionTiers.length - 1];
  }, [satisfaction]);

  // --- Helper: get demand scaling for a round ---
  const getDemandScaling = (r) => {
    for (const ds of DEMAND_SCALING) {
      if (r <= ds.maxRound) return ds;
    }
    return DEMAND_SCALING[DEMAND_SCALING.length - 1];
  };

  // --- Helper: generate a new demand with current round's scaling ---
  const generateDemand = (r, categories, categoryNames) => {
    const scaling = getDemandScaling(r);
    return {
      id: 'daily_supplies',
      name: '日常物资',
      categories,
      categoryNames,
      instanceId: Math.random().toString(36).substr(2, 9),
      target: scaling.target,
      progress: 0,
      remainingRounds: scaling.duration,
      penalty: scaling.penalty,
    };
  };

  // --- Initialize ---
  useEffect(() => {
    refreshPools();
    // Start with 1 pre-built basic prosperity building (水果摊 or 药膳坊)
    const prosperityBuildings = BUILDING_DEFINITIONS.filter(
      b => b.id === 'fruit_stand' || b.id === 'herbal_kitchen'
    );
    const preBuilt = prosperityBuildings[Math.floor(Math.random() * prosperityBuildings.length)];
    setBuildings([{ ...preBuilt, builtAtRound: 0 }]);

    // Start with 1 additional available transformation building (complements the pre-built production building)
    const tier0Transformations = BUILDING_DEFINITIONS.filter(
      b => b.tier === 0 && b.type === 'transformation'
    );
    const startAvailable = tier0Transformations[Math.floor(Math.random() * tier0Transformations.length)];
    setAvailableBuildings([startAvailable.id]);

    // Pick 2 random categories for the demand
    const shuffled = [...DEMAND_ELIGIBLE_CATEGORIES].sort(() => Math.random() - 0.5);
    const pickedCategories = shuffled.slice(0, 2);
    const cats = pickedCategories.map(c => c.id);
    const catNames = pickedCategories.map(c => c.name);
    setActiveDemands([generateDemand(1, cats, catNames)]);

    // Generate bonus items (1 random item from each picked category)
    const bonusItemNames = [];
    for (const cat of pickedCategories) {
      const catPool = config.pools.find(p => p.id === cat.id);
      if (catPool && catPool.items.length > 0) {
        const randomItem = catPool.items[Math.floor(Math.random() * catPool.items.length)];
        bonusItemNames.push(randomItem.name);
      }
    }
    setBonusItems(bonusItemNames);
  }, []);

  // --- Pending queue processing ---
  useEffect(() => {
    if (!pendingItem && pendingQueue.length > 0) {
      setPendingItem(pendingQueue[0]);
      setPendingQueue(prev => prev.slice(1));
    }
  }, [pendingItem, pendingQueue]);

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
      setSelectedIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
      return;
    }

    // Pending item placement
    if (pendingItem) {
      const targetItem = inventory[index];
      if (!targetItem) {
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

  // --- Helper: remove items at indices from inventory ---
  const removeItemsAtIndices = (inv, indices) => {
    const newInv = [...inv];
    for (const idx of indices) {
      newInv[idx] = null;
    }
    return newInv;
  };

  // --- Building: start building ---
  const startBuilding = useCallback((buildingId) => {
    if (gameStatus !== 'playing') return;
    const def = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
    if (!def) return;
    setPendingBuildingId(buildingId);
    setSelectedIndices([]);
  }, [gameStatus]);

  // --- Building: confirm build (name-based matching) ---
  const confirmBuilding = useCallback(() => {
    if (!pendingBuildingId) return;
    const def = BUILDING_DEFINITIONS.find(b => b.id === pendingBuildingId);
    if (!def) return;

    const requirements = Array.isArray(def.buildCost) ? def.buildCost : [def.buildCost];
    const tempInv = selectedIndices.map(i => inventory[i]);
    const used = new Set();
    let valid = true;
    for (const req of requirements) {
      let found = false;
      for (let i = 0; i < tempInv.length; i++) {
        if (used.has(i)) continue;
        const item = tempInv[i];
        if (!item) continue;
        if (req.name && item.name !== req.name) continue;
        const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
        if (getRarityIndex(item.rarity.id) < minIdx) continue;
        found = true;
        used.add(i);
        break;
      }
      if (!found) { valid = false; break; }
    }

    if (!valid) {
      showToast(t('所选物品不满足建造需求'), 'error');
      return;
    }

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

  // --- Building: use (supports multi-recipe transformation buildings) ---
  const startUseBuilding = useCallback((buildingIndex, recipeIndex = null) => {
    if (gameStatus !== 'playing') return;
    setPendingBuildingUseIndex(buildingIndex);
    setPendingRecipeIndex(recipeIndex);
    setSelectedIndices([]);
  }, [gameStatus]);

  const confirmUseBuilding = useCallback(() => {
    if (pendingBuildingUseIndex === null) return;
    const building = buildings[pendingBuildingUseIndex];
    if (!building) return;

    // All buildings use recipes
    if (pendingRecipeIndex === null) return;
    const recipe = building.recipes[pendingRecipeIndex];
    if (!recipe) return;
    const useCondition = recipe.useCondition;
    const useOutput = recipe.useOutput;

    const requirements = Array.isArray(useCondition) ? useCondition : [useCondition];
    const tempInv = selectedIndices.map(i => inventory[i]);
    const used = new Set();
    let valid = true;
    for (const req of requirements) {
      let found = false;
      for (let i = 0; i < tempInv.length; i++) {
        if (used.has(i)) continue;
        const item = tempInv[i];
        if (!item) continue;
        if (req.name && item.name !== req.name) continue;
        const minIdx = req.minRarity ? getRarityIndex(req.minRarity) : 0;
        if (getRarityIndex(item.rarity.id) < minIdx) continue;
        found = true;
        used.add(i);
        break;
      }
      if (!found) { valid = false; break; }
    }

    if (!valid) {
      showToast(t('所选物品不满足使用条件'), 'error');
      return;
    }

    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));

    // Transformation building: produce output item
    if (useOutput.item) {
      const baseItem = ITEM_LOOKUP[useOutput.item.name];
      const rarity = getRarity(useOutput.item.rarity);
      const newItem = {
        ...baseItem,
        rarity,
        poolId: useOutput.item.category,
        poolName: config.pools.find(p => p.id === useOutput.item.category)?.name || '',
        uid: Math.random().toString(36).substr(2, 9),
        sterile: false,
      };
      handleIncomingItems([newItem]);
    }

    // Production building: add prosperity
    if (useOutput.prosperity) {
      setProsperity(prev => prev + useOutput.prosperity);
    }

    setPendingBuildingUseIndex(null);
    setPendingRecipeIndex(null);
    setSelectedIndices([]);
  }, [pendingBuildingUseIndex, pendingRecipeIndex, buildings, selectedIndices, inventory, config]);

  const cancelUseBuilding = useCallback(() => {
    setPendingBuildingUseIndex(null);
    setPendingRecipeIndex(null);
    setSelectedIndices([]);
  }, []);

  // --- Building: draw (tier-weighted) ---
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

  const selectBuildingCandidate = useCallback((candidateId) => {
    setAvailableBuildings(prev => [...prev, candidateId]);
    setBuildingCandidates(null);
  }, []);

  // --- Demand: fulfill (satisfaction recovery based on item quality, then refresh) ---
  const startFulfillDemand = useCallback((demandIndex) => {
    if (gameStatus !== 'playing') return;
    setPendingDemandIndex(demandIndex);
    setSelectedIndices([]);
  }, [gameStatus]);

  const confirmFulfillDemand = useCallback(() => {
    if (pendingDemandIndex === null) return;
    const demand = activeDemands[pendingDemandIndex];
    if (!demand) return;

    if (selectedIndices.length === 0) return;

    // All selected items must belong to demand's categories
    const submittedItems = selectedIndices.map(i => inventory[i]).filter(Boolean);
    const validCategories = new Set(demand.categories);
    const allValid = submittedItems.every(item => {
      const itemInfo = ITEM_LOOKUP[item.name];
      return itemInfo && validCategories.has(itemInfo.category);
    });

    if (!allValid || submittedItems.length === 0) {
      showToast(t('所选物品不属于该需求类别'), 'error');
      return;
    }

    // Calculate contribution (quality value + bonus extra)
    let contribution = 0;
    for (const item of submittedItems) {
      contribution += DEMAND_SATISFACTION_RECOVERY[item.rarity.id] || DEMAND_SATISFACTION_RECOVERY.common;
      if (bonusItems.includes(item.name)) {
        contribution += DEMAND_BONUS_ITEM_EXTRA;
      }
    }

    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));

    // Update demand progress
    const newProgress = demand.progress + contribution;
    if (newProgress >= demand.target) {
      // Demand completed — generate new demand immediately, no reward
      const newDemand = generateDemand(round, demand.categories, demand.categoryNames);
      setActiveDemands([newDemand]);
      showToast(`${t('需求达成')}! ${t('新需求已生成')}`, 'info');
    } else {
      // Update progress
      setActiveDemands(prev => prev.map((d, i) =>
        i === pendingDemandIndex ? { ...d, progress: newProgress } : d
      ));
      showToast(`+${contribution} ${t('进度')} (${newProgress}/${demand.target})`);
    }

    setPendingDemandIndex(null);
    setSelectedIndices([]);
  }, [pendingDemandIndex, activeDemands, selectedIndices, inventory, bonusItems, round]);

  const cancelFulfillDemand = useCallback(() => {
    setPendingDemandIndex(null);
    setSelectedIndices([]);
  }, []);

  // --- End Round ---
  const endRound = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (pendingItem) { showToast(t('请先处理待定物品'), 'error'); return; }
    if (buildingCandidates) { showToast(t('请先选择建筑'), 'error'); return; }

    const newRound = round + 1;

    // 1. Income (gold does not carry over between rounds)
    setGold(PROTOTYPE_CONFIG.incomePerRound);

    // 2. Check demand expiry
    let newSatisfaction = satisfaction;
    const currentDemand = activeDemands[0];
    if (currentDemand) {
      const newRemaining = currentDemand.remainingRounds - 1;
      if (newRemaining <= 0) {
        // Demand expired — apply penalty, generate new
        if (currentDemand.progress < currentDemand.target) {
          newSatisfaction = Math.max(0, satisfaction - currentDemand.penalty);
          setSatisfaction(newSatisfaction);
          showToast(`${t('需求未达成')}! -${currentDemand.penalty} ${t('满意度')}`, 'error');
        }
        const newDemand = generateDemand(newRound, currentDemand.categories, currentDemand.categoryNames);
        setActiveDemands([newDemand]);
      } else {
        // Decrement remaining rounds
        setActiveDemands(prev => prev.map(d => ({ ...d, remainingRounds: newRemaining })));
      }
    }

    // 3. Check win/lose
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
  }, [gameStatus, round, satisfaction, prosperity, pendingItem, buildingCandidates, activeDemands]);

  // --- Start game (first round) ---
  const startGame = useCallback(() => {
    setRound(1);
    setGold(PROTOTYPE_CONFIG.startingGold);
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (round === 0) startGame();
  }, []);

  // --- Prosperity check for building draw (threshold-based) ---
  useEffect(() => {
    if (nextDrawIndex < BUILDING_DRAW_THRESHOLDS.length &&
        prosperity >= BUILDING_DRAW_THRESHOLDS[nextDrawIndex] &&
        !buildingCandidates) {
      triggerBuildingDraw();
      setNextDrawIndex(prev => prev + 1);
    }
  }, [prosperity, nextDrawIndex, buildingCandidates]);

  // --- Debug: set prosperity ---
  const debugSetProsperity = useCallback((value) => {
    setProsperity(Math.max(0, Math.min(PROTOTYPE_CONFIG.prosperityTarget, value)));
  }, []);

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
      bonusItems,
      maxInventorySize,
      toast,
      modalContent,
      pendingBuildingId,
      pendingDemandIndex,
      pendingBuildingUseIndex,
      pendingRecipeIndex,
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
      selectBuildingCandidate,
      startFulfillDemand,
      confirmFulfillDemand,
      cancelFulfillDemand,
      endRound,
      showToast,
      hideToast,
      handleCloseModal,
      debugSetProsperity,
    },
    config: {
      prosperityTarget: PROTOTYPE_CONFIG.prosperityTarget,
      buildingDrawThresholds: BUILDING_DRAW_THRESHOLDS,
    },
  };
};
