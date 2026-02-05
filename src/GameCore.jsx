import React, { useEffect, useState } from 'react';
import { Settings, Download, Upload, RotateCcw, X, Coins, Ticket, Flag, Power, ChevronsUp, ChevronUp, ChevronDown, Check, Briefcase, ShoppingBag, Truck, Trash2, Package, RefreshCw, Lock, Star, Hand, Layers, Repeat, Send, AlertCircle, Zap, ListOrdered, Heart, Timer } from 'lucide-react';

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

const GameCore = ({ config, onOpenSettings, onReset, initialSkills = [], initialScore = 0, debugAddItem, onDebugAddItemHandled }) => {
    const { t, language, toggleLanguage } = useLanguage();
    const [isSkillsCollapsed, setIsSkillsCollapsed] = useState(true);

    // Initialize Logic Hook
    const { state, actions, helpers } = useGameLogic(config, initialSkills, onReset, initialScore);

    // Debug: Handle direct item addition from Config Tool
    useEffect(() => {
        if (debugAddItem) {
            actions.addInventoryItem(debugAddItem.itemName, debugAddItem.rarityId);
            if (onDebugAddItemHandled) onDebugAddItemHandled();
        }
    }, [debugAddItem, actions]);

    const {
        gold, patience, patienceStage, score, upgradedOrderItems, currentStageConfig, maxInventorySize,
        drawCount, activePools, orders, emergencyOrders, health, emergencyDifficulty, inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
        isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
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
        handlePoolLeave,
        handleEvacuate,
        toggleEvacuationMode,
        handleConfirmEvacuation
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
                                        <h4 className="font-bold text-blue-800 mb-3 text-left">{t("解锁新内容")}：</h4>
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
                                        {t("继续挑战")}
                                    </button>
                                </div>
                            ) : modalContent.type === 'game_over' ? (
                                // Game Over Modal
                                <>
                                    <div className={`w-32 h-32 rounded-2xl flex items-center justify-center text-6xl shadow-inner bg-red-50 border-4 border-red-400`}>
                                        <div className={`flex flex-col items-center`}>
                                            {modalContent.item?.icon || '💔'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-lg font-bold text-red-600">
                                            {modalContent.item?.name}
                                        </span>
                                        <p className="text-slate-500 font-medium">{modalContent.message}</p>
                                    </div>
                                    <button
                                        onClick={onReset}
                                        className="mt-4 font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95 bg-red-600 text-white hover:bg-red-700"
                                    >
                                        {t("重新开始")}
                                    </button>
                                </>
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
                                        {t("收下")}
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

                {/* Reorganized Header for better readability */}
                <header className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shadow-lg z-20 shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-8">
                        {/* Game Title & Stage (Left aligned) */}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                                <ListOrdered className="text-white" size={24} />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ORDER GAME</h1>
                                {config.patience?.enabled !== false && (
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <span className={`w-2 h-2 rounded-full ${patience > 60 ? 'bg-green-400' : patience > 30 ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                        <span className="text-[10px] font-bold tracking-widest uppercase">{t("阶段")} {state.patienceStage + 1}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Primary Gameplay Stats (Most Important) */}
                        <div className="flex items-center bg-slate-800/50 rounded-2xl px-5 py-2 border border-slate-700/50 gap-8 shadow-inner">
                            {/* Score Display */}
                            <div className="flex flex-col gap-0.5 items-center">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 text-blue-200 leading-none">{t("当前积分")}</span>
                                <div className="flex items-center gap-2 text-blue-400">
                                    <Star size={18} fill="currentColor" className="drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                    <span className="text-3xl font-black font-mono tracking-tighter leading-none">{score}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-slate-700/50" />

                            {/* Health Display */}
                            {config.emergency?.health?.enabled && (
                                <div className="flex flex-col gap-1 items-center">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 text-rose-200 leading-none">{t("生命值")}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {Array.from({ length: config.emergency.health.maxHealth }).map((_, i) => (
                                                <Heart
                                                    key={i}
                                                    size={16}
                                                    fill={i < health ? "currentColor" : "none"}
                                                    className={`${i < health ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "text-slate-700"} transition-all duration-300`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-2xl font-black font-mono tracking-tighter leading-none text-rose-400">{health}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Secondary Stats Group (Gold & Difficulty) */}
                        <div className="flex items-center gap-6 pr-6 border-r border-slate-800">
                            {/* Gold Display */}
                            <div className="flex flex-col gap-0.5 items-end">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-yellow-100">{t("持有金币")}</span>
                                <div className="flex items-center gap-2 text-yellow-400/90">
                                    <Coins size={16} />
                                    <span className="text-xl font-black font-mono tracking-tighter leading-none">{gold}</span>
                                </div>
                            </div>

                            {/* Difficulty Display */}
                            {emergencyOrders.length > 0 && (
                                <div className="flex flex-col gap-0.5 items-end">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-orange-100">{t("撤离难度")}</span>
                                    <div className="flex items-center gap-1.5 text-orange-400/90">
                                        <ChevronsUp size={16} />
                                        <span className="text-xl font-black font-mono tracking-tighter leading-none">LV.{emergencyDifficulty}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stage Info (Compact) */}
                        <div className="hidden lg:flex flex-col items-end border-r border-slate-800 pr-6">
                            <div className="flex items-center gap-2">
                                <Layers size={14} className="text-purple-400" />
                                <span className="text-[12px] font-black text-white whitespace-nowrap">{t(currentStageConfig.name)}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500">{t(currentStageConfig.mechanicDesc)}</span>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-1 border border-slate-700 shadow-inner">
                            <button onClick={toggleLanguage} className="px-2.5 py-1 hover:bg-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all">
                                {language === 'zh' ? 'EN' : '中'}
                            </button>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <button onClick={onOpenSettings} title={t("设置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
                                <Settings size={18} />
                            </button>
                            <button onClick={onReset} title={t("重置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-red-500/60 hover:text-red-500">
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className={`flex-1 flex flex-col lg:flex-row overflow-hidden transition-all duration-300 ${isSkillsCollapsed ? 'pb-[280px]' : 'pb-[400px]'}`}>

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
                                disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || !currentStageConfig.mechanics.refresh}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-200 text-sm shadow-sm
                          ${pendingItem || isSubmitMode || isRecycleMode || selectionMode || !currentStageConfig.mechanics.refresh
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100 ring-1 ring-orange-200 hover:ring-orange-300 hover:scale-105'}`}
                            >
                                {!currentStageConfig.mechanics.refresh ? <Lock size={14} /> : <RotateCcw size={14} />}
                                <span>{t("刷新所有订单")}</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">

                            {/* Emergency Orders */}
                            {state.emergencyOrders && state.emergencyOrders.length > 0 && (
                                <div className="mb-2 relative flex flex-col gap-2">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 flex items-center gap-1">
                                        <Timer size={10} />
                                        <span>{t("撤离需求")} (完成任意其一)</span>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                        {state.emergencyOrders.map((order, idx) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                index={998 + idx}
                                                isScoreOrder={false}
                                                isEmergency={true}
                                                isSubmitMode={isSubmitMode}
                                                canSatisfy={satisfiableOrders.find(r => r.index === 998 + idx)}
                                                potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.index === 998 + idx)}
                                                // Pass click handler to allow auto-selection
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
                                                upgradedOrderItems={state.upgradedOrderItems}
                                            />
                                        ))}
                                    </div>

                                    {/* Evacuate Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEvacuate(); }}
                                        disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode}
                                        className={`
                                            mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-200 text-sm shadow-sm
                                            ${isEvacuationMode
                                                ? 'bg-orange-600 text-white ring-4 ring-orange-300 scale-[1.02]'
                                                : (pendingItem || isSubmitMode || isRecycleMode || selectionMode
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-95 ring-2 ring-orange-300')
                                            }
                                        `}
                                    >
                                        {isEvacuationMode ? <Check size={16} /> : <Truck size={16} />}
                                        <span>{isEvacuationMode ? t("正在选择撤离物品...") : t("撤离（重置金币）")}</span>
                                    </button>
                                </div>
                            )}

                            {/* Normal Orders (no mainline) */}
                            {orders.map((order, idx) => (
                                <OrderCard
                                    key={order ? order.id : `empty-${idx}`}
                                    order={order}
                                    index={idx}
                                    isScoreOrder={true}
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
                                    upgradedOrderItems={state.upgradedOrderItems}
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
                                const relevantRequirements = [...orders]
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
                                        inventory={inventory}
                                        hasSkill={hasSkill}
                                        config={config}
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
                                                    <span className={`font-black ${isPrecise ? 'text-xl' : 'text-sm text-slate-700'}`}>{t(item.name)}</span>
                                                    {item.rarity && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60`}>{t(item.rarity.name)}</span>
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

                    {/* Skill Bar Area */}
                    <div className="flex flex-col gap-4 items-center mb-4">
                        {config.patience?.enabled !== false && (
                            /* Integrated Patience Bar (Larger but slim) */
                            <div className="w-full max-w-3xl px-8 mt-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Heart size={12} className="text-pink-500 animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("Patience Stability")}</span>
                                    </div>
                                    <span className={`text-base font-black font-mono tracking-tighter ${patience > 60 ? 'text-green-600' : patience > 30 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {patience}%
                                    </span>
                                </div>

                                <div className="h-2.5 bg-slate-100 rounded-full relative border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] group mb-7">
                                    {/* The Actual Progress Fill */}
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${patience > 60 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                            patience > 30 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                                'bg-gradient-to-r from-rose-600 to-red-500'
                                            }`}
                                        style={{ width: `${Math.max(0, Math.min(100, patience))}%` }}
                                    />

                                    {/* Stage Function Threshold Markers */}
                                    {(config.patience?.stages || []).map((threshold, i) => {
                                        const stageEffects = [
                                            { label: t('初始'), color: 'text-cyan-600' },
                                            { label: t('需求品质+'), color: 'text-yellow-600' },
                                            { label: t('需求品质+'), color: 'text-orange-600' },
                                            { label: t('需求品质+'), color: 'text-red-600' },
                                            { label: t('需求品质+'), color: 'text-fuchsia-600' },
                                            { label: t('需求品质+'), color: 'text-slate-600' }
                                        ];
                                        const nextThreshold = (config.patience?.stages || [])[i + 1] || -1;
                                        const effect = stageEffects[i] || { label: '', color: 'text-slate-500' };

                                        // Active: patience is within this stage's range (e.g. <= 80 and > 60 for 80 threshold)
                                        // Special case for top stage (100): active if > next threshold
                                        const isActive = patience <= threshold && patience > nextThreshold;

                                        // Passed: patience has dropped AT OR BELOW this threshold
                                        // We only show checks for hazard stages (i>=1, i.e. 80 and below)
                                        const isPassed = patience <= threshold && i >= 1;

                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 w-px z-10 transition-colors ${patience <= threshold && i > 0 ? 'bg-slate-400' : 'bg-slate-200'}`}
                                                style={{ left: `${threshold}%` }}
                                            >
                                                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1 ${patience <= threshold && i > 0 ? 'bg-slate-600' : 'bg-slate-300'}`} />

                                                <div
                                                    className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all ${effect.color} ${isActive ? 'scale-105' : 'opacity-40'}`}
                                                >
                                                    <div className="h-3 flex items-center justify-center -mb-0.5">
                                                        {isPassed && <Check size={10} strokeWidth={4} className="text-green-500 animate-in zoom-in-50 duration-300" />}
                                                    </div>

                                                    <span className={`text-[8px] font-black whitespace-nowrap`}>
                                                        {effect.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Passive Skills Row */}
                        <div className={`transition-all duration-300 overflow-hidden flex flex-col items-center w-full ${isSkillsCollapsed ? 'h-0 opacity-0' : 'h-24 opacity-100 pt-2 border-t border-slate-100/50'}`}>
                            <div className="flex items-center justify-center gap-4 relative w-full">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] absolute left-4 top-1/2 -translate-y-1/2 hidden md:block">{t("Passive Skills")}</div>
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
                        </div>
                    </div>

                    {/* Permanently Visible Rarity Bonuses */}
                    <div className="flex items-center justify-center gap-3 py-2 border-b border-slate-100 flex-wrap bg-white/50">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2 border-r border-slate-200 pr-3">{t("品质得分加成")}</div>
                        {config.rarity.map(rarity => (
                            <div key={rarity.id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100 animate-in fade-in">
                                <Star size={10} fill="currentColor" className={rarity.starColor} />
                                <span>{t(rarity.name)} +{Math.round(rarity.bonus * 100)}%</span>
                            </div>
                        ))}
                    </div>

                    {/* Collapse Toggle Tab */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40">
                        <button
                            onClick={() => setIsSkillsCollapsed(!isSkillsCollapsed)}
                            className="bg-white border-2 border-slate-200 border-b-0 px-4 py-1 rounded-t-xl shadow-[-5px_-5px_15px_rgba(0,0,0,0.05)] text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                        >
                            {isSkillsCollapsed ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
                            <span className="text-[9px] font-black uppercase tracking-tighter">{isSkillsCollapsed ? t("展开面板") : t("折叠面板")}</span>
                        </button>
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
                        {!isSubmitMode && !isRecycleMode && !isEvacuationMode && !pendingItem && !selectionMode && (
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
                                    <Trash2 size={16} /> {t("确认回收")} (+{totalRecycleValue}🪙)
                                </button>
                            </>
                        )}

                        {isEvacuationMode && (
                            <>
                                <button onClick={() => toggleEvacuationMode()} className="bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-full shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                <button onClick={handleConfirmEvacuation} disabled={satisfiableOrders.filter(o => o.index >= 998).length === 0} className={`flex items-center gap-2 font-bold py-2 px-6 rounded-full shadow-lg ${satisfiableOrders.filter(o => o.index >= 998).length > 0 ? 'bg-orange-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                    <Truck size={16} /> {t("确认撤离")}
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

                                // Badge Logic: Scans all orders (including emergency order)
                                const activeReqs = [
                                    ...orders.filter(Boolean).flatMap(o => o.requirements),
                                    ...emergencyOrders.flatMap(o => o.requirements)
                                ];
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

                                // Fix: Show Red Recycle Overlay for ANY pending item replacement logic
                                const isOverloadTarget =
                                    (pendingItem?.isOverload && item && item.name === hoveredItemName) ||
                                    (pendingItem && !pendingItem.isOverload && hoveredSlotIndex === idx);

                                return (
                                    <InventorySlot
                                        key={idx}
                                        index={idx}
                                        item={item}
                                        isSelected={isSelected}
                                        isTarget={!!sourceItem && !isSourceSelf} // If we are dragging/selecting something, this slot is a target
                                        isSubmitMode={isSubmitMode || isEvacuationMode}
                                        isRecycleMode={isRecycleMode}
                                        isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                                        isReference={selectionMode?.type === 'trade_in'}

                                        canSynthesize={canSynthesize}
                                        isNeededForOrder={isNeeded}
                                        isMaxSatisfied={isMaxSatisfied}
                                        hasUpgradePair={hasUpgradePair} // Pass the new prop
                                        isOverloadTarget={isOverloadTarget}

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
                                                    const activeReqs = [
                                                        ...orders.filter(Boolean).flatMap(o => o.requirements),
                                                        ...emergencyOrders.flatMap(o => o.requirements)
                                                    ];
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

                                        {pendingQueue.map((qItem, idx) => {
                                            // Queue Item Badge Logic
                                            const activeReqs = [
                                                ...orders.filter(Boolean).flatMap(o => o.requirements),
                                                ...emergencyOrders.flatMap(o => o.requirements)
                                            ];
                                            const matchedReqs = activeReqs.filter(r => r.name === qItem.name);
                                            const isNeeded = matchedReqs.length > 0;
                                            const isMaxSatisfied = isNeeded && matchedReqs.some(r => qItem.rarity.bonus >= r.requiredRarity.bonus);

                                            return (
                                                <div key={idx} className="flex flex-col gap-2 shrink-0 snap-center items-center opacity-60 grayscale-[0.3]">
                                                    <div className="text-[10px] font-bold text-slate-400 mt-2">#{idx + 1}</div>
                                                    <InventorySlot
                                                        item={qItem}
                                                        index={-1}
                                                        isPendingSlot={true}
                                                        isNeededForOrder={isNeeded}
                                                        isMaxSatisfied={isMaxSatisfied}
                                                        onClick={() => { }} onMouseEnter={() => { }} onMouseLeave={() => { }}
                                                        className="w-16 h-16 pointer-events-none"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </footer>
            </div >

            {/* Confirms */}
            {
                selectionMode?.type === 'trade_in' && (
                    <>
                        <div className="fixed inset-0 z-10 bg-black/20 pointer-events-none"></div>
                        <button
                            onClick={handleSelectionCancel}
                            className="fixed bottom-8 right-8 z-50 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-10"
                        >
                            <X size={20} /> {t("取消置换")}
                        </button>
                    </>
                )
            }
        </div >
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
