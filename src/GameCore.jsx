import React, { useEffect } from 'react';
import { Settings, Download, Upload, RotateCcw, X, Coins, Ticket, Flag, Power, ChevronsUp, Check, Briefcase, ShoppingBag, Truck, Trash2, Package, RefreshCw, Lock, Star, Hand, Layers, Repeat, Send, AlertCircle, Zap, ListOrdered } from 'lucide-react';

import { useGameLogic } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { SkillSelectionModal } from './components/game/SkillSelectionModal';
import Leaderboard from './components/game/Leaderboard.jsx';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { InventorySlot } from './components/game/InventorySlot';
import { PoolCard } from './components/game/PoolCard';

import { OrderCard } from './components/game/OrderCard';
import { SKILL_DEFINITIONS } from './data/constants';

const GameCore = ({ config, onOpenSettings, onReset, initialSkills = [], initialProgress = 0 }) => {
    const { t, language, toggleLanguage } = useLanguage();

    // Initialize Logic Hook
    const { state, actions, helpers } = useGameLogic(config, initialSkills, onReset, initialProgress);

    const {
        gold, tickets, mainlineProgress, currentStageConfig, maxInventorySize,
        drawCount, activePools, orders, mainlineOrder, inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
        isSubmitMode, isRecycleMode, selectedIndices,
        modalContent, selectionMode,
        skills, skillSelectionCandidates,
        toast, satisfiableOrders, totalRecycleValue, selectedItemNames
    } = state;

    const {
        handleSkillSelect,
        handleSkillReplace,
        handleCloseModal,
        handleSlotClick,
        handleDiscardNew,
        handleRefreshAllOrders,
        handleRefreshSingleOrder,
        handleOrderClick,
        handleConfirmSubmission,
        toggleSubmitMode,
        toggleRecycleMode,
        handleDraw,
        handleSelectionSelect,
        handleSelectionCancel,
        handleConfirmRecycle,
        handleSortInventory,
        handlePoolHover,
        handlePoolLeave
    } = actions;

    const { hasSkill } = helpers;

    // Helper to render modals
    const renderModal = () => {
        try {
            if (skillSelectionCandidates) {
                return (
                    <SkillSelectionModal
                        candidates={skillSelectionCandidates}
                        onSelect={handleSkillSelect}
                        currentSkills={skills}
                        onReplace={handleSkillReplace}
                    />
                );
            }



            if (modalContent) {
                const isVictory = modalContent.type === 'victory';
                const isStageUp = modalContent.type === 'stage_up';

                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className={`bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center border-4 border-white transform scale-100 animate-in zoom-in-95 duration-200
                   ${isVictory ? 'ring-4 ring-yellow-400 bg-white' : ''}
                   ${isStageUp ? 'ring-4 ring-blue-400 bg-blue-50' : ''}
                   ${!isVictory && !isStageUp ? 'ring-4 ring-purple-200' : ''}
                `}>
                            <h3 className="text-2xl font-black text-slate-800">{modalContent.title}</h3>

                            {isVictory ? (
                                <Leaderboard
                                    currentScore={modalContent.score}
                                    onRestart={handleCloseModal}
                                />
                            ) : isStageUp ? (
                                <div className="flex flex-col items-center gap-4 py-4 w-full">
                                    <div className="text-4xl animate-bounce">{modalContent.item?.icon}</div>
                                    <div className="w-full bg-white/50 rounded-xl p-4 border border-blue-200">
                                        <h4 className="font-bold text-blue-800 mb-3 text-left">解锁新内容：</h4>
                                        <ul className="text-left space-y-2">
                                            {modalContent.unlocks.map((text, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm font-bold text-slate-600">
                                                    <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                    <span>{text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="mt-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                                    >
                                        继续挑战
                                    </button>
                                </div>
                            ) : (
                                // Standard Item Modal
                                <>
                                    <div className={`w-32 h-32 rounded-2xl flex items-center justify-center text-6xl shadow-inner bg-slate-50 border-4 ${modalContent.item?.rarity?.color?.split(' ')[0] || 'border-slate-200'}`}>
                                        <div className={`flex flex-col items-center`}>
                                            {modalContent.item?.icon || '📦'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-lg font-bold ${modalContent.item?.rarity?.starColor?.replace('text-', 'text-') || 'text-slate-800'}`}>
                                            {modalContent.item?.rarity?.name} {modalContent.item?.name}
                                        </span>
                                        <p className="text-slate-500 font-medium">{modalContent.message}</p>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="mt-4 font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95 bg-slate-800 text-white hover:bg-slate-700"
                                    >
                                        收下
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                );
            }


            return null;
        } catch (error) {
            console.error("Modal Rendering Error:", error);
            // In case of error, show a toast or just return null to avoid white screen
            // We can also try to force a reset of modalContent here but that's side-effect
            return null;
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 overflow-hidden flex flex-col animate-in fade-in duration-500 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => actions.hideToast()} />}

            {renderModal()}

            <div className="w-full max-w-7xl mx-auto h-full flex flex-col shadow-2xl bg-white border-x border-slate-200 relative">

                {/* HEADER */}
                <header className="p-4 bg-slate-800 text-white flex justify-between items-center shadow-md z-20 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <Coins size={20} />
                            <span className="text-xl font-bold">{gold}</span>
                        </div>


                        {currentStageConfig.mechanics.specialization && (
                            <div className="flex items-center gap-2 text-blue-300 ml-4 border-l border-slate-600 pl-4">
                                <Layers size={20} />
                                <span className={`text-xl font-bold ${new Set(inventory.filter(i => i).map(i => i.name)).size >= 7 ? 'text-red-400 animate-pulse' : ''}`}>
                                    {new Set(inventory.filter(i => i).map(i => i.name)).size}/7
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4 bg-slate-700/50 px-3 py-1.5 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Flag size={18} className="text-purple-400" />
                                <span className="text-lg font-black text-white">{t(currentStageConfig.name)}</span>
                            </div>
                            <span className="text-sm font-semibold text-purple-200">{t(currentStageConfig.mechanicDesc)}</span>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t("累计抽奖")}</span>
                            <span className="text-xl font-bold">{drawCount} {t("次")}</span>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                            <button onClick={toggleLanguage} className="px-2 py-1 hover:bg-slate-600 rounded text-xs font-bold text-slate-300 hover:text-white transition-colors">
                                {language === 'zh' ? 'EN' : '中'}
                            </button>
                            <div className="w-[1px] h-5 bg-slate-600"></div>
                            <button onClick={onReset} title={t("重置")} className="p-1.5 hover:bg-slate-600 rounded transition-colors text-red-300 hover:text-red-100">
                                <Power size={20} />
                            </button>
                            <div className="w-[1px] h-5 bg-slate-600"></div>
                            <button onClick={onOpenSettings} title={t("设置")} className="p-1.5 hover:bg-slate-600 rounded transition-colors text-slate-300 hover:text-white">
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-[400px] lg:pb-[400px]">

                    {/* LEFT COLUMN: ORDERS */}
                    <section className={`
                     flex-none lg:w-1/3 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 transition-all
                     ${selectionMode?.type === 'targeted' ? 'hidden md:block md:w-1/4' : ''}
                  `}>
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-50/95 p-2 rounded-lg z-10 backdrop-blur-sm">
                            <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Package size={16} /> {t("当前订单")}
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRefreshAllOrders(); }}
                                disabled={!!pendingItem || gold < config.global.refreshCost || isSubmitMode || isRecycleMode || !!selectionMode || !currentStageConfig.mechanics.refresh}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-200 text-sm shadow-sm
                          ${pendingItem || gold < config.global.refreshCost || isSubmitMode || isRecycleMode || selectionMode || !currentStageConfig.mechanics.refresh
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100 ring-1 ring-orange-200 hover:ring-orange-300 hover:scale-105'}`}
                            >
                                {!currentStageConfig.mechanics.refresh ? <Lock size={14} /> : <RotateCcw size={14} />}
                                <span>{t("刷新所有订单")} (-{config.global.refreshCost})</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Mainline Order */}
                            {mainlineOrder && (
                                <OrderCard
                                    order={mainlineOrder}
                                    index={-1}
                                    isMainline={true}
                                    isSubmitMode={isSubmitMode}
                                    canSatisfy={satisfiableOrders.find(r => r.isMainline)}
                                    potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.isMainline)} // Pass preview
                                    onClick={handleOrderClick}
                                    currentStageConfig={currentStageConfig}
                                    config={config}
                                    inventory={inventory}
                                    selectedIndices={selectedIndices}
                                    hasSkill={hasSkill}
                                    hoveredPoolId={hoveredPoolId}
                                    hoveredItemName={hoveredItemName}
                                    hoveredPoolItemNames={hoveredPoolItemNames}
                                    selectedItemNames={selectedItemNames}
                                />
                            )}

                            {/* Normal Orders */}
                            {orders.map((order, idx) => (
                                <OrderCard
                                    key={order ? order.id : `empty-${idx}`}
                                    order={order}
                                    index={idx}
                                    isMainline={false}
                                    isSubmitMode={isSubmitMode}
                                    canSatisfy={satisfiableOrders.find(r => r.index === idx)}
                                    potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.index === idx)} // Pass preview
                                    onClick={handleOrderClick}
                                    onRefresh={handleRefreshSingleOrder}
                                    currentStageConfig={currentStageConfig}
                                    config={config}
                                    inventory={inventory}
                                    selectedIndices={selectedIndices}
                                    hasSkill={hasSkill}
                                    hoveredPoolId={hoveredPoolId}
                                    hoveredItemName={hoveredItemName}
                                    hoveredPoolItemNames={hoveredPoolItemNames}
                                    selectedItemNames={selectedItemNames}
                                />
                            ))}
                        </div>
                    </section>

                    {/* RIGHT COLUMN: POOLS */}
                    <section className="flex-1 p-4 lg:p-8 flex flex-col overflow-y-auto relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1">
                                <RefreshCw size={16} /> {t("抽取物品")}
                            </h2>
                            <span className="text-xs text-slate-400">{t("点击卡片购买")}</span>
                        </div>

                        <div className={`
                        flex flex-col gap-4
                        transition-opacity duration-300
                        ${pendingItem || isSubmitMode || isRecycleMode || selectionMode ? 'opacity-100' : 'opacity-100'}
                    `}>
                            {activePools.map((pool) => {
                                const relevantRequirements = [...orders, mainlineOrder]
                                    .filter(Boolean)
                                    .flatMap(o => o.requirements)
                                    .filter(req => {
                                        // 1. Must be in the pool
                                        if (!pool.items.some(pi => pi.name === req.name)) return false;

                                        // 2. Hide if satisfied in inventory
                                        const isSatisfied = inventory.some(item =>
                                            item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus
                                        );
                                        return !isSatisfied;
                                    });

                                return (
                                    <PoolCard
                                        key={pool.id}
                                        pool={pool}
                                        gold={gold}
                                        tickets={tickets}
                                        inventory={inventory}
                                        hasSkill={hasSkill}
                                        onDraw={handleDraw}
                                        onMouseEnter={handlePoolHover}
                                        onMouseLeave={handlePoolLeave}
                                        isHovered={hoveredPoolId === (pool.originalId || pool.id)}
                                        relevantRequirements={relevantRequirements}
                                        disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode}
                                    />
                                )
                            })}
                        </div>

                        {/* SELECTION OVERLAY (Trade-in / Targeted) */}
                        {selectionMode && selectionMode.type !== 'trade_in' && (
                            <div className="absolute inset-0 bg-white z-40 flex flex-col items-center justify-center p-4 animate-in fade-in cursor-default">
                                <h3 className="text-2xl font-black mb-8 text-slate-800 text-center">
                                    {selectionMode.type === 'precise' ? t("精准：二选一 (不可取消)") : t("有的放矢：请选择你想要的")}
                                </h3>

                                <div className={`
                            ${selectionMode.type === 'precise'
                                        ? 'flex gap-6 w-full max-w-xl justify-center items-stretch'
                                        : 'flex flex-wrap gap-4 justify-center max-w-2xl'}
                          `}>
                                    {selectionMode.items.map((item, idx) => {
                                        const isPrecise = selectionMode.type === 'precise';

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectionSelect(item)}
                                                onMouseEnter={() => state.setHoveredItemName(item.name)}
                                                onMouseLeave={() => state.setHoveredItemName(null)}
                                                className={`
                                      relative transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group
                                      flex flex-col items-center justify-center gap-3
                                      ${isPrecise
                                                        ? `flex-1 aspect-[4/5] rounded-3xl border-[4px] ${item.rarity.color}`
                                                        : `w-28 h-36 rounded-2xl border-2 bg-white border-slate-200 hover:border-slate-400 shadow-sm`}
                                   `}
                                            >
                                                <div className={`${isPrecise ? 'text-6xl' : 'text-4xl'} filter drop-shadow-sm transition-transform group-hover:scale-110`}>{item.icon}</div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`font-black ${isPrecise ? 'text-xl' : 'text-sm text-slate-700'}`}>{item.name}</span>
                                                    {item.rarity && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60`}>{item.rarity.name}</span>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>

                                {selectionMode.type === 'targeted' && (
                                    <button onClick={handleSelectionCancel} className="mt-8 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-8 py-2 rounded-full font-bold transition-colors">
                                        {t("取消")}
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                </main>

                {/* FOOTER (FIXED) */}
                <footer className={`
                    absolute bottom-0 w-full p-4 border-t-2 border-slate-200 bg-white/95 backdrop-blur shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-colors duration-300 
                    ${pendingItem ? 'bg-red-50/95 border-red-200' : ''}
                    ${isSubmitMode ? 'bg-blue-50/95 border-blue-200' : ''}
                    ${isRecycleMode ? 'bg-amber-50/95 border-amber-200' : ''}
                    ${selectionMode?.type === 'trade_in' ? 'bg-purple-50/95 border-purple-200' : ''}
                `}>

                    {/* Skill Bar */}
                    <div className="flex items-center justify-center gap-4 mb-2 pb-2 border-b border-slate-100 relative">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest absolute left-0 top-1/2 -translate-y-1/2 hidden md:block">{t("被动技能")}</div>
                        <div className="flex gap-4">
                            {[0, 1, 2].map(i => {
                                const skillId = skills[i];
                                const skill = SKILL_DEFINITIONS.find(s => s.id === skillId);
                                const SkillIcon = skill?.Icon || Zap;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <div title={skill ? `${skill.name}: ${skill.desc}` : '空槽位'} className="group relative w-12 h-12 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center transition-all hover:scale-110">
                                            {skill ? (
                                                <div className={`w-full h-full rounded-full flex items-center justify-center ${skill.color}`}>
                                                    <SkillIcon size={18} />
                                                </div>
                                            ) : (
                                                <div className="text-slate-300"><Zap size={18} /></div>
                                            )}
                                            <div className="absolute -top-1 -right-1 text-[10px] bg-slate-300 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">{i + 1}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rarity Bonuses */}
                    <div className="flex items-center justify-center gap-4 mb-2 pb-2 border-b border-slate-100 flex-wrap">
                        {config.rarity.slice(1).map(rarity => {
                            const weights = currentStageConfig.rarityWeights;
                            if ((weights[rarity.id] || 0) <= 0) return null;
                            return (
                                <div key={rarity.id} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full shadow-sm border border-slate-100 animate-in fade-in">
                                    <Star size={12} fill="currentColor" className={rarity.starColor} />
                                    <span>{t(rarity.name)} +{Math.round(rarity.bonus * 100)}%</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Status Bar */}
                    <div className="flex justify-between items-center mb-2 px-2 max-w-3xl mx-auto">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("背包栏位")} ({inventory.length}/{maxInventorySize})</h2>
                            {!pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSortInventory(); }}
                                    className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                                >
                                    <ListOrdered size={14} />
                                    <span>{t("一键整理")}</span>
                                </button>
                            )}
                        </div>
                        {selectedSlot !== null && !pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && (
                            <span className="text-xs font-bold text-blue-500 animate-pulse bg-blue-50 px-2 py-1 rounded flex items-center gap-2">
                                <Hand size={14} /> {t("整理模式")}
                            </span>
                        )}
                        {isSubmitMode && (
                            <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                                <Layers size={14} /> {t("提交模式: 点击订单卡片可一键选择")}
                            </span>
                        )}
                        {isRecycleMode && (
                            <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                                <Trash2 size={14} /> {t("回收模式: 选择道具换取金币")}
                            </span>
                        )}
                        {selectionMode?.type === 'trade_in' && (
                            <span className="text-xs font-bold text-purple-600 animate-pulse flex items-center gap-1">
                                <Repeat size={14} /> {t("以旧换新: 请点击选择一个物品消耗")}
                            </span>
                        )}
                    </div>

                    {/* Action Buttons (Fixed Bottom Right) */}
                    <div className="absolute bottom-4 right-4 md:right-10 lg:right-20 flex gap-2 z-50">
                        {!isSubmitMode && !isRecycleMode && !pendingItem && !selectionMode && (
                            <>
                                <button onClick={toggleRecycleMode} className="flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 font-bold py-3 px-6 rounded-full shadow-lg hover:bg-amber-200 transition-transform active:scale-95">
                                    <Trash2 size={18} /> {t("回收")}
                                </button>
                                <button onClick={toggleSubmitMode} className="flex items-center gap-2 bg-slate-800 text-white font-bold py-3 px-6 rounded-full shadow-xl hover:bg-slate-700 transition-transform active:scale-95">
                                    <Layers size={18} /> {t("出牌")}
                                </button>
                            </>
                        )}

                        {isSubmitMode && (
                            <>
                                <button onClick={toggleSubmitMode} className="bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-full shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                <button onClick={handleConfirmSubmission} disabled={selectedIndices.length === 0} className={`flex items-center gap-2 font-bold py-2 px-6 rounded-full shadow-lg ${selectedIndices.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                    <Send size={16} /> {t("确认出牌")}
                                </button>
                            </>
                        )}

                        {isRecycleMode && (
                            <>
                                <button onClick={toggleRecycleMode} className="bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-full shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                <button onClick={handleConfirmRecycle} disabled={selectedIndices.length === 0} className={`flex items-center gap-2 font-bold py-2 px-6 rounded-full shadow-lg ${selectedIndices.length > 0 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                    <Trash2 size={16} /> {t("确认回收")} (+{totalRecycleValue}{t("金币")})
                                </button>
                            </>
                        )}

                        {selectionMode?.type === 'trade_in' && (
                            <button onClick={handleSelectionCancel} className="bg-white border border-slate-300 text-slate-600 font-bold py-2 px-6 rounded-full shadow-sm hover:bg-slate-50">{t("取消")}</button>
                        )}
                    </div>

                    {/* Inventory Grid + Pending Queue */}
                    <div className="flex flex-col lg:flex-row gap-4 justify-center items-center lg:items-end relative max-w-3xl mx-auto">

                        {/* Main Inventory */}
                        <div className="flex flex-wrap gap-2 justify-center max-w-full">
                            {Array.from({ length: maxInventorySize }).map((_, idx) => {
                                const item = inventory[idx];
                                const isSelected = selectedSlot === idx || selectedIndices.includes(idx);

                                // Synthesis Logic: Check against Selected Slot OR Pending Item
                                const sourceItem = pendingItem || (selectedSlot !== null ? inventory[selectedSlot] : null);
                                const isSourcePending = !!pendingItem;
                                const isSourceSelf = !pendingItem && selectedSlot === idx; // Don't synth with self

                                // If source existence, check synthesis
                                const canSynthesize = item && sourceItem && !isSourceSelf &&
                                    item.name === sourceItem.name &&
                                    item.rarity.id === sourceItem.rarity.id &&
                                    !item.sterile && !sourceItem.sterile &&
                                    item.rarity.id !== 'mythic' &&
                                    currentStageConfig.mechanics.synthesis;

                                // Badge Logic: Scans all orders
                                const activeReqs = [...orders, mainlineOrder].filter(Boolean).flatMap(o => o.requirements);
                                // Find best requirement? Ideally any requirement that needs this item.
                                // We check if ANY requirement matches name.
                                // isMaxSatisfied if ANY requirement is satisfied by this quality.
                                const matchedReqs = item ? activeReqs.filter(r => r.name === item.name) : [];
                                const isNeeded = matchedReqs.length > 0;
                                const isMaxSatisfied = isNeeded && matchedReqs.some(r => item.rarity.bonus >= r.requiredRarity.bonus);

                                // Upgrade Badge Logic: Check if there is ANOTHER item in inventory that matches this one for synthesis
                                const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                                    otherIdx !== idx && // Not self
                                    other && // Exists
                                    !other.sterile && // Not sterile
                                    other.name === item.name && // Same name
                                    other.rarity.id === item.rarity.id && // Same rarity
                                    item.rarity.id !== 'mythic' // Not max level (mythic usually can't synth)
                                );

                                return (
                                    <InventorySlot
                                        key={idx}
                                        index={idx}
                                        item={item}
                                        isSelected={isSelected}
                                        isTarget={!!sourceItem && !isSourceSelf} // If we are dragging/selecting something, this slot is a target
                                        isSubmitMode={isSubmitMode}
                                        isRecycleMode={isRecycleMode}
                                        isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                                        isReference={selectionMode?.type === 'trade_in'}

                                        canSynthesize={canSynthesize}
                                        isNeededForOrder={isNeeded}
                                        isMaxSatisfied={isMaxSatisfied}
                                        hasUpgradePair={hasUpgradePair} // Pass the new prop
                                        // Fix: Show Red Recycle Overlay for ANY pending item replacement logic
                                        isOverloadTarget={
                                            (pendingItem?.isOverload && item && item.name === hoveredItemName) ||
                                            (pendingItem && !pendingItem.isOverload && hoveredSlotIndex === idx)
                                        }

                                        onClick={handleSlotClick}
                                        onMouseEnter={(i, item) => { state.setHoveredSlotIndex(i); if (item) state.setHoveredItemName(item.name); }}
                                        onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                        isHovered={hoveredSlotIndex === idx}
                                        className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
                                    />
                                )
                            })}
                        </div>

                        {/* Pending Queue Popup */}
                        {pendingItem && (
                            <div className="absolute right-0 bottom-full mb-4 lg:mb-0 lg:static lg:bottom-auto flex flex-col items-end lg:items-start gap-2 animate-in slide-in-from-right-4 fade-in duration-300 z-40 max-w-full">

                                <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-red-200 shadow-2xl flex flex-col gap-2 max-w-[95vw] lg:max-w-xl">

                                    <div className="flex justify-between items-center border-b border-red-100 pb-2">
                                        <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                                            <AlertCircle size={16} />
                                            <span>{pendingItem.isOverload ? t("种类过载：点击下方物品清除同类！") : `${t("背包已满！待处理队列")} (${pendingQueue.length + 1})`}</span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {t("按顺序处理")}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                        <div className="flex flex-col gap-2 shrink-0 snap-center items-center p-2 bg-red-50 rounded-xl border border-red-100 min-w-[100px]">
                                            <div className="text-[10px] font-black text-red-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{t("当前处理")}</div>

                                            <div className="relative transform hover:scale-105 transition-transform">
                                                {(() => {
                                                    // Pending Item Badge Logic
                                                    const activeReqs = [...orders, mainlineOrder].filter(Boolean).flatMap(o => o.requirements);
                                                    const matchedReqs = activeReqs.filter(r => r.name === pendingItem.name);
                                                    const isNeeded = matchedReqs.length > 0;
                                                    const isMaxSatisfied = isNeeded && matchedReqs.some(r => pendingItem.rarity.bonus >= r.requiredRarity.bonus);

                                                    return (
                                                        <InventorySlot
                                                            item={pendingItem}
                                                            index={-1}
                                                            isPendingSlot={true}
                                                            isSelected={false}
                                                            isNeededForOrder={isNeeded}
                                                            isMaxSatisfied={isMaxSatisfied}
                                                            onClick={handleSlotClick}
                                                            onMouseEnter={(i, item) => { state.setHoveredSlotIndex(-1); if (item) state.setHoveredItemName(item.name); }}
                                                            onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                                            isHovered={hoveredSlotIndex === -1}
                                                            className="w-16 h-16"
                                                        />
                                                    )
                                                })()}
                                            </div>
                                            <button
                                                onClick={handleDiscardNew}
                                                className="w-full flex items-center justify-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors shadow-sm"
                                            >
                                                <X size={12} />
                                                {pendingItem.rarity.recycleValue > 0 ? `${t("回收")} +${pendingItem.rarity.recycleValue}` : t("丢弃")}
                                            </button>
                                        </div>

                                        {pendingQueue.map((qItem, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 shrink-0 snap-center items-center opacity-60 grayscale-[0.3]">
                                                <div className="text-[10px] font-bold text-slate-400 mt-2">#{idx + 1}</div>
                                                <InventorySlot
                                                    item={qItem}
                                                    index={-1}
                                                    isPendingSlot={true}
                                                    onClick={() => { }} onMouseEnter={() => { }} onMouseLeave={() => { }}
                                                    className="w-16 h-16 pointer-events-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </footer>
            </div>

            {/* Confirms */}
            {selectionMode?.type === 'trade_in' && (
                <>
                    <div className="fixed inset-0 z-10 bg-black/20 pointer-events-none"></div>
                    <button
                        onClick={handleSelectionCancel}
                        className="fixed bottom-8 right-8 z-50 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-10"
                    >
                        <X size={20} /> {t("取消置换")}
                    </button>
                </>
            )}
        </div>
    );
};

// Utils (icon wrapper)
const SparklesIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

export default GameCore;
