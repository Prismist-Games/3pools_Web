import React, { useEffect, useState } from 'react';
import { Settings, RotateCcw, X, Coins, Flag, Power, ChevronsUp, ChevronUp, ChevronDown, Check, Truck, Trash2, Package, RefreshCw, Star, Hand, Layers, Repeat, Send, AlertCircle, Zap, ListOrdered, Timer, Merge } from 'lucide-react';

import { useGameLogic } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { SkillSelectionModal } from './components/game/SkillSelectionModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { InventorySlot } from './components/game/InventorySlot';
import { PoolCard } from './components/game/PoolCard';

import { OrderCard } from './components/game/OrderCard';
import { SKILL_DEFINITIONS } from './data/constants';

const GameCore = ({ config, onOpenSettings, showSettings, debugMode, setDebugMode, onReset, initialSkills = [], initialScore = 0, debugAddItem, onDebugAddItemHandled }) => {
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
        gold, score, currentStageConfig, maxInventorySize,
        drawCount, activePools, orders, orderRefreshCount, REFRESH_MAX, orderCandidates, orderCandidateQueue, emergencyOrders, emergencyDifficulty, inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
        isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
        modalContent, selectionMode,
        skills, skillSelectionCandidates, skillState,
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
        handleSelectOrderCandidate,
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
        handleConfirmEvacuation,
        handleEvacuationContinue,
        handleEvacuationExtract,
        debugGetOrderItems,
        canFuse
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
                                <>
                                    <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-5xl shadow-inner mb-2">
                                        🏆
                                    </div>
                                    <p className="text-slate-500 font-medium text-lg">
                                        {modalContent.message}
                                    </p>
                                    <p className="text-3xl font-black text-blue-600 font-mono">
                                        {modalContent.score}
                                    </p>
                                    <button
                                        onClick={onReset}
                                        className="mt-4 font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95 bg-slate-800 text-white hover:bg-slate-700"
                                    >
                                        {t("再来一局")}
                                    </button>
                                </>
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
                            ) : modalContent.type === 'evacuation_success' ? (
                                // Evacuation Success Modal
                                <>
                                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-5xl shadow-inner mb-2">
                                        <Truck size={40} className="text-orange-500" />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {/* Title is already rendered by parent container if strict structure, 
                                            but parent container renders h3 title from modalContent.title. 
                                            Let's just use what's here or rely on parent? 
                                            Parent renders: <h3 ...>{modalContent.title}</h3> at line 95.
                                            Let's rely on that if we set title, or override. 
                                            Wait, line 95 is: <h3 className="text-2xl font-black text-slate-800">{modalContent.title}</h3>
                                            The `evacuation_success` logic I set: setModalContent({ type: 'evacuation_success', score })
                                            I did NOT set title. I should probably set title in useGameLogic or just ignore 
                                            lines 95 if I can't control it easily. 
                                            Actually, line 95 is executed BEFORE these checks. 
                                            So I should ensure modalContent has a title or provide empty string and render my own.
                                            
                                            Let's check useGameLogic again.
                                            setModalContent({ type: 'evacuation_success', score: score });
                                            Title is undefined.
                                            So <h3> will be empty.
                                            I'll add the title manually here.
                                         */}
                                        <h3 className="text-3xl font-black text-slate-800">{t("离开此关卡成功！")}</h3>
                                        <p className="text-slate-500 font-medium text-lg">
                                            {t("当前积分")}: <span className="font-bold text-blue-600 font-mono text-xl">{modalContent.score}</span>
                                        </p>
                                        <p className="text-slate-400 text-sm">
                                            {t("你可以选择继续挑战以获得更高分数，或者现在带着战利品离开。")}
                                        </p>
                                    </div>

                                    <div className="flex flex-col w-full gap-3 mt-4">
                                        <button
                                            onClick={handleEvacuationContinue}
                                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={20} />
                                            {t("继续挑战 (难度提升)")}
                                        </button>

                                        <button
                                            onClick={handleEvacuationExtract}
                                            className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Flag size={20} />
                                            {t("提取分数 (结束游戏)")}
                                        </button>
                                    </div>
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
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Secondary Stats Group (Gold & Difficulty) - Enlarged */}
                        <div className="flex items-center gap-8 pr-6 border-r border-slate-800">
                            {/* Gold Display */}
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-yellow-100">{t("持有金币")}</span>
                                <div className="flex items-center gap-2.5 text-yellow-400">
                                    <Coins size={20} className="drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                                    <span className="text-3xl font-black font-mono tracking-tighter leading-none">{gold}</span>
                                </div>
                            </div>

                            {/* Difficulty Display */}
                            {emergencyOrders.length > 0 && (
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-orange-100">{t("离开关卡难度")}</span>
                                    <div className="flex items-center gap-2 text-orange-400">
                                        <ChevronsUp size={20} className="drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                                        <span className="text-3xl font-black font-mono tracking-tighter leading-none">LV.{emergencyDifficulty}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stage Info (Compact) */}


                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-1 border border-slate-700 shadow-inner">
                            <button onClick={toggleLanguage} className="px-2.5 py-1 hover:bg-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all">
                                {language === 'zh' ? 'EN' : '中'}
                            </button>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <button
                                onClick={() => setDebugMode(!debugMode)}
                                title={t("调试模式")}
                                className={`p-2 rounded-lg transition-all ${debugMode ? 'bg-red-500/20 text-red-500' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                <Zap size={18} fill={debugMode ? "currentColor" : "none"} />
                            </button>
                            <button onClick={onOpenSettings} title={t("设置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
                                <Settings size={18} />
                            </button>
                            <button onClick={onReset} title={t("重置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-red-500/60 hover:text-red-500">
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden transition-all duration-300">

                    {/* LEFT COLUMN: ORDERS */}
                    <section className={`
                     flex-none lg:w-[45%] xl:w-[42%] h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 transition-all
                     ${selectionMode?.type === 'targeted' ? 'hidden md:block md:w-1/4' : ''}
                  `}>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="flex flex-col gap-3">

                                {/* Emergency Orders */}
                                {state.emergencyOrders && state.emergencyOrders.length > 0 && (
                                    <div className="mb-2 relative flex flex-col gap-2 p-3 bg-orange-50/50 rounded-2xl border-2 border-orange-200 shadow-sm">
                                        <div className="flex items-center justify-between gap-4 mb-3 flex-nowrap border-b border-orange-200/50 pb-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="bg-red-600 text-white p-1.5 rounded-lg shadow-lg shrink-0">
                                                    <Timer size={14} className="animate-pulse" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h3 className="text-sm font-black text-slate-800 leading-none truncate uppercase tracking-tight">
                                                        {t("离开关卡需求")}
                                                    </h3>
                                                    <span className="text-[10px] text-slate-500 font-bold leading-none mt-1 opacity-80">
                                                        {t("(完成任意其一)")}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* 离开此关卡按钮 - 嵌入在需求区域 (放大版) */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEvacuate(); }}
                                                    disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || !!orderCandidates}
                                                    className={`
                                                        flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-black transition-all duration-200 text-[10px] sm:text-sm shadow-lg border-2 whitespace-nowrap
                                                        ${isEvacuationMode
                                                            ? 'bg-orange-600 text-white ring-4 ring-orange-300 border-orange-400 animate-pulse scale-105'
                                                            : (pendingItem || isSubmitMode || isRecycleMode || selectionMode || orderCandidates
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                                                : 'bg-orange-500 text-white hover:bg-orange-600 border-orange-600 hover:scale-110 active:scale-95')
                                                        }
                                                    `}
                                                >
                                                    {isEvacuationMode ? <Check size={14} className="sm:size-[18px]" /> : <Truck size={14} className="sm:size-[18px]" />}
                                                    <span>{isEvacuationMode ? t("选择中...") : t("离开关卡")}</span>
                                                </button>

                                                {/* 放弃按钮 - 嵌入在需求区域 (放大版) */}
                                                {!isEvacuationMode && !isSubmitMode && !isRecycleMode && !selectionMode && !orderCandidates && (
                                                    <button
                                                        onClick={onReset}
                                                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl font-black transition-all duration-200 text-[10px] sm:text-xs shadow-md bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-600 hover:scale-105 active:scale-95 whitespace-nowrap"
                                                    >
                                                        <AlertCircle size={14} className="sm:size-[16px]" />
                                                        <span>{t("放弃")}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
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

                                                    isBeingReplaced={false}
                                                    onDebugGetItems={debugMode ? debugGetOrderItems : null}
                                                />
                                            ))}
                                        </div>
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
                                        isEvacuationMode={isEvacuationMode}
                                        canSatisfy={satisfiableOrders.find(r => r.index === idx)}
                                        potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.index === idx)} // Pass preview
                                        onClick={handleOrderClick}
                                        onRefresh={handleRefreshSingleOrder}
                                        orderRefreshCount={orderRefreshCount}
                                        REFRESH_MAX={REFRESH_MAX}
                                        onDebugGetItems={debugMode ? debugGetOrderItems : null}
                                        currentStageConfig={currentStageConfig}
                                        config={config}
                                        inventory={inventory}
                                        selectedIndices={selectedIndices}
                                        hasSkill={hasSkill}
                                        hoveredPoolId={hoveredPoolId}
                                        hoveredItemName={hoveredItemName}
                                        hoveredPoolItemNames={hoveredPoolItemNames}
                                        selectedItemNames={selectedItemNames}
                                        isBeingReplaced={orderCandidates?.slotIndex === idx}
                                    />
                                ))}
                            </div>

                            {/* 候选订单选择区域 - 从订单栏底部升起 */}
                            {orderCandidates && (
                                <div className="mt-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                    {/* 指向箭头 */}
                                    <div className="flex items-center justify-center -mb-2 relative z-10">
                                        <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg border-2 border-yellow-500 animate-bounce">
                                            <ChevronUp size={14} strokeWidth={3} />
                                            <span>{t("替换上方订单")}</span>
                                            <ChevronUp size={14} strokeWidth={3} />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-4 border-blue-300 rounded-2xl p-4 shadow-2xl ring-4 ring-blue-200">
                                        <div className="flex flex-col gap-3">
                                            {/* 标题栏 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                                                        <Package size={16} />
                                                    </div>
                                                    <h3 className="text-base font-black text-slate-800">{t("选择一个订单")}</h3>
                                                </div>
                                                {orderCandidateQueue.length > 0 && (
                                                    <div className="text-xs text-slate-500 font-bold bg-white/60 px-2 py-1 rounded-full">
                                                        {t("待选订单")}: {orderCandidateQueue.length + 1}
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-600 font-medium">{t("请从以下2个订单中选择1个")}</p>

                                            {/* 候选订单卡片 - 使用完整的 OrderCard 组件 */}
                                            <div className="flex flex-col gap-2">
                                                {orderCandidates.candidates.map((candidate, idx) => (
                                                    <div
                                                        key={candidate.id}
                                                        onClick={() => handleSelectOrderCandidate(idx)}
                                                        className="cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                                                    >
                                                        <OrderCard
                                                            order={candidate}
                                                            index={-1}
                                                            isScoreOrder={true}
                                                            isSubmitMode={false}
                                                            isEvacuationMode={false}
                                                            canSatisfy={null}
                                                            potentialSatisfy={null}
                                                            onClick={() => handleSelectOrderCandidate(idx)}
                                                            onRefresh={() => { }}
                                                            currentStageConfig={currentStageConfig}
                                                            config={config}
                                                            inventory={inventory}
                                                            selectedIndices={[]}
                                                            hasSkill={hasSkill}
                                                            hoveredPoolId={hoveredPoolId}
                                                            hoveredItemName={hoveredItemName}
                                                            hoveredPoolItemNames={hoveredPoolItemNames}
                                                            selectedItemNames={[]}
                                                            isBeingReplaced={false}
                                                            isCandidate={true}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* RIGHT COLUMN: POOLS */}
                    <section className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* POOLS SCROLLABLE AREA */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative custom-scrollbar">
                            <div className="flex justify-between items-center mb-4 gap-4">
                                <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <RefreshCw size={16} /> {t("抽取物品")}
                                </h2>

                                <span className="text-xs text-slate-400 hidden md:block">{t("点击卡片购买")}</span>
                            </div>

                            <div className={`
                        flex flex-col gap-4 pb-4
                        transition-opacity duration-300
                        ${pendingItem || isSubmitMode || isRecycleMode || selectionMode ? 'opacity-100' : 'opacity-100'}
                    `}>
                                {activePools.map((pool) => {
                                    const relevantRequirements = [...orders]
                                        .filter(Boolean)
                                        .flatMap(o => o.requirements || [])
                                        .filter(req => {
                                            // 1. Must be in the pool
                                            if (!pool.items.some(pi => pi.name === req.name)) return false;

                                            // 2. Hide if item name already exists in inventory
                                            const isSatisfied = inventory.some(item =>
                                                item && (item.names || [item.name]).includes(req.name)
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
                                            disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || isEvacuationMode || !!orderCandidates}
                                        />
                                    )
                                })}
                            </div>

                            {/* SELECTION OVERLAY (Trade-in / Targeted) */}
                            {selectionMode && selectionMode.type !== 'trade_in' && selectionMode.type !== 'fusion' && (
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
                        </div>

                        {/* BOTTOM UI (Previously Footer) */}
                        <div className={`
                    flex-none w-full p-4 border-t-2 border-slate-200 bg-white/95 backdrop-blur shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-colors duration-300 relative
                    ${pendingItem ? 'bg-red-50/95 border-red-200' : ''}
                    ${isSubmitMode ? 'bg-blue-50/95 border-blue-200' : ''}
                    ${isRecycleMode ? 'bg-amber-50/95 border-amber-200' : ''}
                    ${selectionMode?.type === 'trade_in' ? 'bg-purple-50/95 border-purple-200' : ''}
                `}>

                            {/* Skill Bar Area */}
                            <div className="flex flex-col gap-4 items-center mb-4">
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
                                    {!pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && !isEvacuationMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSortInventory(); }}
                                            className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                                        >
                                            <ListOrdered size={14} />
                                            <span>{t("一键整理")}</span>
                                        </button>
                                    )}
                                </div>
                                {selectedSlot !== null && !pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && !isEvacuationMode && (
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
                                {selectionMode?.type === 'fusion' && (
                                    <span className="text-xs font-bold text-purple-600 animate-pulse flex items-center gap-1">
                                        <Merge size={14} />
                                        {selectionMode.step === 1
                                            ? t("选择第一个物品")
                                            : `${t("选择第二个物品进行融合")} (${selectionMode.firstItem?.icon} ${t(selectionMode.firstItem?.name)})`
                                        }
                                    </span>
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
                                        // Check if any of item's names are needed by any order
                                        const itemNames = item ? (item.names || [item.name]) : [];
                                        const allOrderNames = [
                                            ...orders.filter(Boolean).flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || []),
                                            ...emergencyOrders.flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || [])
                                        ];
                                        const isNeeded = item && itemNames.some(n => allOrderNames.includes(n));
                                        // In the new system, if the item has the name, it satisfies (no rarity check)
                                        const isMaxSatisfied = isNeeded;

                                        // Upgrade Badge Logic (merge - same name, same rarity)
                                        const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                                            otherIdx !== idx &&
                                            other &&
                                            !other.sterile &&
                                            other.name === item.name &&
                                            other.rarity.id === item.rarity.id &&
                                            item.rarity.id !== 'mythic'
                                        );

                                        // Fusion indicator: check if sourceItem can fuse with this item
                                        // In fusion selection mode step 2, highlight items that can fuse with firstItem
                                        const isFusionMode = selectionMode?.type === 'fusion';
                                        const isFuseTarget = isFusionMode && selectionMode.step === 2
                                            ? (item && idx !== selectionMode.firstIndex && canFuse(selectionMode.firstItem, item))
                                            : (item && sourceItem && !isSourceSelf && canFuse(sourceItem, item));

                                        // Is this the first selected item in fusion mode step 2?
                                        const isFusionFirstItem = isFusionMode && selectionMode.step === 2 && idx === selectionMode.firstIndex;

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
                                                isTarget={!!sourceItem && !isSourceSelf}
                                                isSubmitMode={isSubmitMode || isEvacuationMode}
                                                isRecycleMode={isRecycleMode}
                                                isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in' && selectionMode.type !== 'fusion'}
                                                isReference={selectionMode?.type === 'trade_in'}

                                                canSynthesize={canSynthesize}
                                                isFuseTarget={isFuseTarget}
                                                isFusionFirstItem={isFusionFirstItem}
                                                isNeededForOrder={isNeeded}
                                                isMaxSatisfied={isMaxSatisfied}
                                                hasUpgradePair={hasUpgradePair}
                                                isOverloadTarget={isOverloadTarget}

                                                onClick={handleSlotClick}
                                                onMouseEnter={(i, item) => { state.setHoveredSlotIndex(i); if (item) state.setHoveredItemName(item.name); }}
                                                onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                                isHovered={hoveredSlotIndex === idx}
                                                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
                                                nextDrawEnhanced={skillState?.nextDrawEnhanced}
                                            />
                                        )
                                    })}
                                </div>

                                {/* Action Buttons (Moved to prevent overlap) */}
                                <div className={`flex flex-col gap-2 shrink-0 justify-end pb-2 w-40 min-h-[88px] ${pendingItem ? 'hidden' : ''}`}>
                                    {!isSubmitMode && !isRecycleMode && !isEvacuationMode && !pendingItem && !selectionMode && (
                                        <>
                                            <button onClick={toggleRecycleMode} className="w-full flex items-center justify-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 font-bold py-3 px-6 rounded-xl shadow-sm hover:bg-amber-200 transition-transform active:scale-95">
                                                <Trash2 size={18} /> {t("回收")}
                                            </button>
                                            <button onClick={toggleSubmitMode} className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-slate-700 transition-transform active:scale-95">
                                                <Layers size={18} /> {t("出牌")}
                                            </button>
                                        </>
                                    )}

                                    {isSubmitMode && (
                                        <div className="flex flex-col gap-2">
                                            <button onClick={handleConfirmSubmission} disabled={selectedIndices.length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${selectedIndices.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                                <Send size={16} /> {t("确认出牌")}
                                            </button>
                                            <button onClick={toggleSubmitMode} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                        </div>
                                    )}

                                    {isRecycleMode && (
                                        <div className="flex flex-col gap-2">
                                            <button onClick={handleConfirmRecycle} disabled={selectedIndices.length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${selectedIndices.length > 0 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                                <Trash2 size={16} /> {t("确认回收")} (+{totalRecycleValue}🪙)
                                            </button>
                                            <button onClick={toggleRecycleMode} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                        </div>
                                    )}

                                    {isEvacuationMode && (
                                        <div className="flex flex-col gap-2">
                                            <button onClick={handleConfirmEvacuation} disabled={satisfiableOrders.filter(o => o.index >= 998).length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${satisfiableOrders.filter(o => o.index >= 998).length > 0 ? 'bg-orange-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                                <Truck size={16} /> {t("确认离开此关卡")}
                                            </button>
                                            <button onClick={() => toggleEvacuationMode()} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                        </div>
                                    )}

                                    {selectionMode?.type === 'trade_in' && (
                                        <button onClick={handleSelectionCancel} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                    )}

                                    {selectionMode?.type === 'fusion' && (
                                        <button onClick={handleSelectionCancel} className="w-full bg-white border border-purple-300 text-purple-600 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-purple-50">{t("取消")}</button>
                                    )}
                                </div>

                                {/* Pending Queue Popup */}
                                {pendingItem && (
                                    <div className="flex flex-col gap-2 shrink-0 z-40 w-40 animate-in slide-in-from-right-4 fade-in duration-300">

                                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-red-200 shadow-2xl flex flex-col gap-2 w-full max-h-[500px]">

                                            <div className="flex justify-between items-center border-b border-red-100 pb-2">
                                                <div className="flex items-center gap-2 text-red-600 font-bold text-sm w-full">
                                                    <AlertCircle size={16} className="shrink-0" />
                                                    <span className="truncate">{pendingItem.isOverload ? t("种类过载") : `${t("待处理")} (${pendingQueue.length + 1})`}</span>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {t("按顺序处理")}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-3 overflow-y-auto pb-2 scrollbar-thin px-1">
                                                <div className="flex flex-col gap-2 shrink-0 snap-center items-center p-2 bg-red-50 rounded-xl border border-red-100 w-full">
                                                    <div className="text-[10px] font-black text-red-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{t("当前处理")}</div>

                                                    <div className="relative transform hover:scale-105 transition-transform">
                                                        {(() => {
                                                            // Pending Item Badge Logic
                                                            const pendingNames = pendingItem.names || [pendingItem.name];
                                                            const allReqNames = [
                                                                ...orders.filter(Boolean).flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || []),
                                                                ...emergencyOrders.flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || [])
                                                            ];
                                                            const isNeeded = pendingNames.some(n => allReqNames.includes(n));
                                                            const isMaxSatisfied = isNeeded;

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
                                                    const qNames = qItem.names || [qItem.name];
                                                    const allReqNames2 = [
                                                        ...orders.filter(Boolean).flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || []),
                                                        ...emergencyOrders.flatMap(o => o.requiredNames || o.requirements?.map(r => r.name) || [])
                                                    ];
                                                    const isNeeded = qNames.some(n => allReqNames2.includes(n));
                                                    const isMaxSatisfied = isNeeded;

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
                        </div>
                    </section>
                </main>
            </div>

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
