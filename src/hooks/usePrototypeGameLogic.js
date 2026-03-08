import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllNormalItems, rollRarity, getNextRarity, getRandomAffix, getRandomItems
} from '../utils/helpers';
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
  const [pendingBuildingId, setPendingBuildingId] = useState(null);
  const [pendingDemandIndex, setPendingDemandIndex] = useState(null);
  const [pendingBuildingUseIndex, setPendingBuildingUseIndex] = useState(null);
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

  // --- Satisfaction tier ---
  const satisfactionTier = useMemo(() => {
    return PROTOTYPE_CONFIG.satisfactionTiers.find(
      tier => satisfaction >= tier.min && satisfaction <= tier.max
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
    if (buildings.length >= PROTOTYPE_CONFIG.maxActiveBuildings) {
      showToast(t('建筑槽位已满'), 'error');
      return;
    }
    setPendingBuildingId(buildingId);
    setSelectedIndices([]);
  }, [gameStatus, buildings]);

  // --- Building: confirm build ---
  const confirmBuilding = useCallback(() => {
    if (!pendingBuildingId) return;
    const def = BUILDING_DEFINITIONS.find(b => b.id === pendingBuildingId);
    if (!def) return;

    const requirements = Array.isArray(def.buildCost) ? def.buildCost : [def.buildCost];
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

    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));
    const output = building.useOutput;
    if (output.prosperity) {
      setProsperity(prev => {
        const next = prev + output.prosperity;
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
  }, [pendingBuildingUseIndex, buildings, selectedIndices, inventory]);

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

    setInventory(prev => removeItemsAtIndices(prev, selectedIndices));
    let currencyReward = demand.reward.currency || 0;

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

    if (activeDemands.length >= PROTOTYPE_CONFIG.maxActiveDemands) return null;

    const def = pool[Math.floor(Math.random() * pool.length)];
    let timeLimit = def.timeLimit;

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
    if (DEMAND_SCHEDULE.includes(1)) {
      const demand = generateDemand(1);
      if (demand) setActiveDemands([demand]);
    }
  }, [generateDemand]);

  // Auto-start on mount
  useEffect(() => {
    if (round === 0) startGame();
  }, []);

  // --- Prosperity check for building draw ---
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
      maxActiveDemands: PROTOTYPE_CONFIG.maxActiveDemands,
    },
  };
};
