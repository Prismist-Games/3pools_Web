import React, { useState } from 'react';
import { Coins, Heart, SkipForward, AlertCircle, X, Trash2, ArrowDownUp } from 'lucide-react';

import { usePrototypeGameLogic } from './hooks/usePrototypeGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Toast } from './components/ui/Toast';
import { PoolCard } from './components/game/PoolCard';
import { InventorySlot } from './components/game/InventorySlot';
import { BuildingCard } from './components/game/BuildingCard';
import { DemandCard } from './components/game/DemandCard';
import { Timeline } from './components/game/Timeline';
import { BuildingSelectionModal } from './components/game/BuildingSelectionModal';
import { BUILDING_DEFINITIONS, PROTOTYPE_CONFIG, ITEM_LOOKUP, DEMAND_SATISFACTION_RECOVERY, DEMAND_BONUS_ITEM_EXTRA, DEMAND_SCALING } from './data/prototypeConstants';

const PrototypeGameCore = ({ config, onReset }) => {
  const { t } = useLanguage();
  const { state, actions, config: gameConfig } = usePrototypeGameLogic(config);

  const {
    round, gold, prosperity, satisfaction, satisfactionTier, gameStatus,
    activePools, inventory, pendingItem, pendingQueue, selectedSlot,
    selectedIndices, selectionMode, buildings, availableBuildings,
    buildingCandidates, activeDemands, bonusItems, maxInventorySize, toast,
    modalContent, pendingBuildingId, pendingDemandIndex, pendingBuildingUseIndex,
    pendingRecipeIndex,
  } = state;

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
  const [hoveredItemName, setHoveredItemName] = useState(null);
  const [hoveredPool, setHoveredPool] = useState(null);
  const [endRoundConfirmOpen, setEndRoundConfirmOpen] = useState(false);
  const [recycleMode, setRecycleMode] = useState(false);
  const [recycleSelectedIndices, setRecycleSelectedIndices] = useState([]);

  // Item names in the currently hovered pool
  const hoveredPoolItemNames = hoveredPool
    ? new Set(hoveredPool.items.map(item => item.name))
    : null;

  const isInSelectionAction = pendingBuildingId !== null || pendingDemandIndex !== null || pendingBuildingUseIndex !== null || recycleMode;
  const actionLabel = pendingBuildingId ? t('选择建造材料')
    : pendingDemandIndex !== null ? t('选择提交物品')
    : pendingBuildingUseIndex !== null ? t('选择使用物品')
    : recycleMode ? t('选择回收物品')
    : null;

  // Calculate recycle value for selected items
  const recycleValue = React.useMemo(() => {
    return recycleSelectedIndices.reduce((sum, idx) => {
      const item = inventory[idx];
      return sum + (item?.rarity?.recycleValue || 0);
    }, 0);
  }, [recycleSelectedIndices, inventory]);

  // Collect all requirements: built buildings' recipes, available buildings' build costs
  const neededItemReqs = React.useMemo(() => {
    const rarities = config.rarity || [];
    const getRIdx = (id) => rarities.findIndex(r => r.id === id);
    const reqs = new Map();
    const collect = (reqList) => {
      for (const req of reqList) {
        if (!req.name) continue;
        const minIdx = req.minRarity ? getRIdx(req.minRarity) : 0;
        if (!reqs.has(req.name) || minIdx > reqs.get(req.name)) {
          reqs.set(req.name, minIdx);
        }
      }
    };
    // Built buildings' recipe conditions
    for (const building of buildings) {
      if (building.recipes) {
        for (const recipe of building.recipes) {
          collect(Array.isArray(recipe.useCondition) ? recipe.useCondition : [recipe.useCondition]);
        }
      }
    }
    // Available (unbuilt) buildings' build costs
    for (const id of availableBuildings) {
      const def = BUILDING_DEFINITIONS.find(b => b.id === id);
      if (def?.buildCost) {
        collect(Array.isArray(def.buildCost) ? def.buildCost : [def.buildCost]);
      }
    }
    // Demand category items (any rarity works, so minIdx = 0)
    for (const demand of activeDemands) {
      const demandCats = new Set(demand.categories);
      for (const [name, info] of Object.entries(ITEM_LOOKUP)) {
        if (demandCats.has(info.category) && !reqs.has(name)) {
          reqs.set(name, 0);
        }
      }
    }
    return reqs;
  }, [buildings, availableBuildings, activeDemands, config.rarity]);

  // Check if demand can be fulfilled (has at least 1 matching item and not yet complete)
  const canFulfillDemand = (demand) => {
    if (demand.progress >= demand.target) return false;
    const validCategories = new Set(demand.categories);
    for (const item of inventory) {
      if (!item) continue;
      const itemInfo = ITEM_LOOKUP[item.name];
      if (itemInfo && validCategories.has(itemInfo.category)) return true;
    }
    return false;
  };

  const noop = () => {};
  const currentStageConfig = config.stages[0];

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
            <span className="text-xs opacity-70 mr-0.5">{t('金币')}</span>
            <span className="font-mono font-bold">{gold}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: satisfaction > 14 ? '#4ade80' : satisfaction > 7 ? '#fbbf24' : '#ef4444' }}>
            <Heart size={16} />
            <span className="text-xs opacity-70 mr-0.5">{t('满意度')}</span>
            <span className="font-mono font-bold">{satisfaction}/{PROTOTYPE_CONFIG.maxSatisfaction}</span>
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
        <Timeline
          currentRound={round}
          prosperityMilestones={gameConfig.buildingDrawThresholds}
          currentProsperity={prosperity}
          prosperityTarget={gameConfig.prosperityTarget}
        />
        {/* Debug: prosperity */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-500">Debug {t('繁荣')}:</span>
          <button onClick={() => actions.debugSetProsperity(prosperity - 1)}
            className="text-[10px] px-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">-1</button>
          <button onClick={() => actions.debugSetProsperity(prosperity + 1)}
            className="text-[10px] px-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">+1</button>
          <button onClick={() => actions.debugSetProsperity(prosperity + 5)}
            className="text-[10px] px-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">+5</button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex px-4 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
        {/* LEFT: Demands + Available Buildings */}
        <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 py-2">
          {/* Permanent Demands */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-2">{t('需求')}</h3>
            <div className="flex flex-col gap-2">
              {activeDemands.map((demand, i) => (
                <DemandCard
                  key={demand.instanceId}
                  demand={demand}
                  onFulfill={() => actions.startFulfillDemand(i)}
                  disabled={gameStatus !== 'playing' || isInSelectionAction}
                  canFulfill={canFulfillDemand(demand)}
                  inventory={inventory}
                  bonusItems={bonusItems}
                  qualityValues={DEMAND_SATISFACTION_RECOVERY}
                  bonusExtra={DEMAND_BONUS_ITEM_EXTRA}
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
                    disabled={gameStatus !== 'playing' || isInSelectionAction}
                    highlightedItems={hoveredPoolItemNames}
                    hoveredItemName={hoveredItemName}
                    inventory={inventory}
                    rarityConfig={config.rarity}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Pools + Inventory + Pending */}
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
                  onMouseEnter={(pool) => setHoveredPool(pool)}
                  onMouseLeave={() => setHoveredPool(null)}
                  isHovered={hoveredPool?.id === pool.id}
                  disabled={gameStatus !== 'playing' || !!pendingItem || !!selectionMode || isInSelectionAction}
                />
              </div>
            ))}
          </div>

          {/* Selection overlay: precise / targeted */}
          {selectionMode && selectionMode.type !== 'trade_in' && (
            <div className="bg-slate-700/90 border border-slate-500 rounded-xl p-5 flex flex-col items-center">
              <h3 className="text-lg font-bold mb-4 text-center">
                {selectionMode.type === 'precise' ? t("精准：二选一") : t("有的放矢：请选择你想要的")}
              </h3>
              <div className="flex gap-4 justify-center">
                {selectionMode.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => actions.handleSelectionSelect(item)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg
                      ${item.rarity?.color || 'bg-slate-600 border-slate-400'}`}
                    style={{ minWidth: '120px' }}
                  >
                    <div className="text-4xl filter drop-shadow-sm">{item.icon}</div>
                    <span className="font-bold text-sm">{t(item.name)}</span>
                    {item.rarity && <span className="text-[10px] font-bold opacity-70">{t(item.rarity.name)}</span>}
                  </button>
                ))}
              </div>
              {selectionMode.type === 'targeted' && (
                <button onClick={actions.handleSelectionCancel} className="mt-4 text-sm text-gray-400 hover:text-white px-4 py-1.5 rounded border border-gray-500">
                  {t("取消")}
                </button>
              )}
            </div>
          )}

          {/* Trade-in hint */}
          {selectionMode?.type === 'trade_in' && (
            <div className="bg-purple-900/40 border border-purple-400 rounded-lg p-3 text-sm flex items-center justify-between">
              <span>{t('以旧换新: 请点击选择一个物品消耗')}</span>
              <button onClick={actions.handleSelectionCancel} className="text-purple-300 hover:text-white text-xs px-3 py-1 rounded border border-purple-500">
                {t("取消")}
              </button>
            </div>
          )}

          {/* Action mode banner */}
          {isInSelectionAction && (
            <div className={`${recycleMode ? 'bg-amber-900/30 border-amber-500' : 'bg-blue-900/30 border-blue-500'} border rounded-lg p-3 flex items-center justify-between`}>
              <span className="text-sm font-medium">
                {actionLabel} - {t('从背包中选择物品')}
                {recycleMode && recycleSelectedIndices.length > 0 && (
                  <span className="text-amber-400 ml-2">+{recycleValue} {t('金币')}</span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={
                    recycleMode ? () => { actions.handleRecycle(recycleSelectedIndices); setRecycleMode(false); setRecycleSelectedIndices([]); }
                    : pendingBuildingId ? actions.confirmBuilding
                    : pendingDemandIndex !== null ? actions.confirmFulfillDemand
                    : actions.confirmUseBuilding
                  }
                  disabled={recycleMode ? recycleSelectedIndices.length === 0 : selectedIndices.length === 0}
                  className={`px-3 py-1 text-white rounded text-sm font-medium disabled:opacity-40 ${recycleMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {recycleMode ? t('回收') : t('确认')}
                </button>
                <button
                  onClick={
                    recycleMode ? () => { setRecycleMode(false); setRecycleSelectedIndices([]); }
                    : pendingBuildingId ? actions.cancelBuilding
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

          {/* Inventory + Pending sidebar */}
          <div className="flex gap-3">
            {/* Inventory */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {t('库存')} ({inventory.filter(Boolean).length}/{maxInventorySize})
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setRecycleMode(!recycleMode); setRecycleSelectedIndices([]); }}
                    disabled={isInSelectionAction && !recycleMode}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      recycleMode
                        ? 'text-white bg-amber-500 shadow'
                        : 'text-amber-300 hover:text-white bg-amber-800/50 hover:bg-amber-700/60 border border-amber-600/50'
                    } disabled:opacity-40`}
                  >
                    <Trash2 size={12} />
                    {t('回收')}
                  </button>
                  <button
                    onClick={actions.handleSortInventory}
                    disabled={isInSelectionAction}
                    className="text-xs font-medium text-blue-300 hover:text-white bg-blue-800/50 hover:bg-blue-700/60 border border-blue-600/50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <ArrowDownUp size={12} />
                    {t('整理')}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {inventory.map((item, idx) => {
                  const sourceItem = pendingItem || (selectedSlot !== null ? inventory[selectedSlot] : null);
                  const isSourceSelf = !pendingItem && selectedSlot === idx;

                  const canSynthesize = item && sourceItem && !isSourceSelf &&
                    item.name === sourceItem.name &&
                    item.rarity.id === sourceItem.rarity.id &&
                    !item.sterile && !sourceItem.sterile &&
                    item.rarity.id !== 'mythic' &&
                    currentStageConfig.mechanics.synthesis;

                  const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                    otherIdx !== idx && other && !other.sterile &&
                    other.name === item.name && other.rarity.id === item.rarity.id &&
                    item.rarity.id !== 'mythic'
                  );

                  const isOverloadTarget =
                    (pendingItem?.isOverload && item && item.name === hoveredItemName) ||
                    (pendingItem && !pendingItem.isOverload && hoveredSlotIndex === idx);

                  return (
                    <InventorySlot
                      key={idx}
                      index={idx}
                      item={item}
                      onClick={recycleMode
                        ? () => setRecycleSelectedIndices(prev =>
                            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                          )
                        : actions.handleSlotClick
                      }
                      isSelected={recycleMode ? recycleSelectedIndices.includes(idx) : (selectedSlot === idx || selectedIndices.includes(idx))}
                      isTarget={!!sourceItem && !isSourceSelf}
                      isSubmitMode={isInSelectionAction && !recycleMode}
                      isRecycleMode={recycleMode}
                      isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                      isReference={selectionMode?.type === 'trade_in'}
                      canSynthesize={canSynthesize}
                      hasUpgradePair={hasUpgradePair}
                      isOverloadTarget={isOverloadTarget}
                      isNeededForOrder={item && neededItemReqs.has(item.name)}
                      isMaxSatisfied={item && neededItemReqs.has(item.name) &&
                        (config.rarity || []).findIndex(r => r.id === item.rarity.id) >= neededItemReqs.get(item.name)}
                      isHovered={hoveredSlotIndex === idx}
                      onMouseEnter={(i, item) => { setHoveredSlotIndex(i); if (item) setHoveredItemName(item.name); }}
                      onMouseLeave={() => { setHoveredSlotIndex(null); setHoveredItemName(null); }}
                      className="w-full aspect-square"
                    />
                  );
                })}
              </div>
            </div>

            {/* Pending item panel */}
            {pendingItem && (
              <div className="shrink-0 w-40 flex flex-col gap-2">
                <div className="bg-slate-700 border border-red-500/50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs border-b border-slate-600 pb-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="truncate">{t("待处理")} ({pendingQueue.length + 1})</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <InventorySlot
                      item={pendingItem}
                      index={-1}
                      isPendingSlot={true}
                      isSelected={false}
                      onClick={actions.handleSlotClick}
                      onMouseEnter={(i, item) => { setHoveredSlotIndex(-1); if (item) setHoveredItemName(item.name); }}
                      onMouseLeave={() => { setHoveredSlotIndex(null); setHoveredItemName(null); }}
                      isHovered={hoveredSlotIndex === -1}
                      className="w-16 h-16"
                    />
                    <span className="text-[10px] text-gray-400 text-center">{t('点击背包格子放置')}</span>
                    <button
                      onClick={actions.handleDiscardNew}
                      className="w-full flex items-center justify-center gap-1 bg-slate-600 hover:bg-slate-500 border border-slate-500 text-gray-300 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors"
                    >
                      <X size={12} />
                      {pendingItem.rarity?.recycleValue > 0 ? `${t("回收")} +${pendingItem.rarity.recycleValue}` : t("丢弃")}
                    </button>
                  </div>

                  {pendingQueue.length > 0 && (
                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-600 max-h-[200px] overflow-y-auto">
                      {pendingQueue.map((qItem, idx) => (
                        <div key={idx} className="flex flex-col items-center opacity-50 grayscale-[0.3]">
                          <div className="text-[10px] text-slate-500">#{idx + 1}</div>
                          <InventorySlot
                            item={qItem}
                            index={-1}
                            isPendingSlot={true}
                            onClick={noop}
                            onMouseEnter={noop}
                            onMouseLeave={noop}
                            className="w-14 h-14 pointer-events-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Built Buildings */}
          {buildings.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 mb-2">{t('已建造')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {buildings.map((building, i) => (
                  <BuildingCard
                    key={building.id + '-' + i}
                    building={building}
                    isBuilt={true}
                    isActive={pendingBuildingUseIndex === i}
                    activeRecipeIndex={pendingBuildingUseIndex === i ? pendingRecipeIndex : null}
                    onUse={(recipeIndex) => actions.startUseBuilding(i, recipeIndex)}
                    disabled={gameStatus !== 'playing' || isInSelectionAction}
                    highlightedItems={hoveredPoolItemNames}
                    hoveredItemName={hoveredItemName}
                    inventory={inventory}
                    rarityConfig={config.rarity}
                  />
                ))}
              </div>
            </div>
          )}

          {/* End Round button */}
          <button
            onClick={() => setEndRoundConfirmOpen(true)}
            disabled={gameStatus !== 'playing' || !!pendingItem || !!buildingCandidates || isInSelectionAction}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SkipForward size={20} />
            {t('结束回合')}
          </button>

          {endRoundConfirmOpen && (
            <ConfirmDialog
              title={t('结束回合')}
              message={t('确定结束当前回合？')}
              onConfirm={() => { setEndRoundConfirmOpen(false); actions.endRound(); }}
              onCancel={() => setEndRoundConfirmOpen(false)}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default PrototypeGameCore;
