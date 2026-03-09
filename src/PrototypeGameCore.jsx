import React, { useState } from 'react';
import { Coins, Star, Heart, SkipForward, AlertCircle, X } from 'lucide-react';

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

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
  const [hoveredItemName, setHoveredItemName] = useState(null);
  const [endRoundConfirmOpen, setEndRoundConfirmOpen] = useState(false);

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
          demandSchedule={gameConfig.demandSchedule}
          prosperityMilestones={gameConfig.buildingDrawThresholds}
          currentProsperity={prosperity}
          prosperityTarget={gameConfig.prosperityTarget}
        />
      </div>

      {/* Main layout */}
      <div className="flex px-4 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
        {/* LEFT: Demands + Available Buildings */}
        <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 py-2">
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
                  onMouseEnter={noop}
                  onMouseLeave={noop}
                  isHovered={false}
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

          {/* Inventory + Pending sidebar */}
          <div className="flex gap-3">
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
                      onClick={actions.handleSlotClick}
                      isSelected={selectedSlot === idx || selectedIndices.includes(idx)}
                      isTarget={!!sourceItem && !isSourceSelf}
                      isSubmitMode={isInSelectionAction}
                      isRecycleMode={false}
                      isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                      isReference={selectionMode?.type === 'trade_in'}
                      canSynthesize={canSynthesize}
                      hasUpgradePair={hasUpgradePair}
                      isOverloadTarget={isOverloadTarget}
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
                    onUse={() => actions.startUseBuilding(i)}
                    disabled={gameStatus !== 'playing' || isInSelectionAction}
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
