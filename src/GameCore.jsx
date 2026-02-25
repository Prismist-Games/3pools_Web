import React, { useEffect, useState } from 'react';
import { Settings, RotateCcw, X, Coins, Flag, Power, ChevronsUp, Check, Truck, Trash2, Package, Star, Hand, Layers, Repeat, Send, AlertCircle, Zap, ListOrdered, Timer } from 'lucide-react';

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

const GameCore = ({ config, onOpenSettings, showSettings, debugMode, setDebugMode, onReset, initialSkills = [], initialScore = 0, debugAddItem, onDebugAddItemHandled }) => {
    const { t, language, toggleLanguage } = useLanguage();
    // Skills are always visible in the new layout (no collapse toggle needed)

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
        drawCount, activePools, orders, orderRefreshCount, REFRESH_MAX, orderCandidates, orderCandidateQueue, emergencyOrders, health, emergencyDifficulty, inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
        isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
        modalContent, selectionMode,
        skills, skillSelectionCandidates, skillState,
        toast, satisfiableOrders, totalRecycleValue, selectedItemNames,
        orderSlotAssignments, assignedItemUids, phantomMarks,
        toolSelectionMode
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
        handleToolItemUse,
        handleUnassignFromOrder,
        handleOrderSlotClick,
        handleCancelToolSelection
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
                   ${isStageUp ? 'ring-4 ring-sky-400 bg-sky-50' : ''}
                   ${!isVictory && !isStageUp ? 'ring-4 ring-purple-200' : ''}
                `}>
                            <h3 className="text-2xl font-black text-stone-800">{modalContent.title}</h3>

                            {isVictory ? (
                                <Leaderboard
                                    currentScore={modalContent.score}
                                    onRestart={onReset}
                                />
                            ) : isStageUp ? (
                                <div className="flex flex-col items-center gap-4 py-4 w-full">
                                    <div className="text-4xl animate-bounce">{modalContent.item?.icon}</div>
                                    <div className="w-full bg-white/50 rounded-xl p-4 border border-sky-200">
                                        <h4 className="font-bold text-sky-800 mb-3 text-left">{t("解锁新内容")}：</h4>
                                        <ul className="text-left space-y-2">
                                            {modalContent.unlocks.map((text, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm font-bold text-stone-600">
                                                    <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                    <span>{text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="mt-2 w-full bg-sky-600 text-white font-bold py-3 rounded-xl hover:bg-sky-700 transition-colors shadow-lg active:scale-95"
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
                                        <p className="text-stone-500 font-medium">{modalContent.message}</p>
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
                                        <h3 className="text-3xl font-black text-stone-800">{t("离开此关卡成功！")}</h3>
                                        <p className="text-stone-500 font-medium text-lg">
                                            {t("当前积分")}: <span className="font-bold text-sky-600 font-mono text-xl">{modalContent.score}</span>
                                        </p>
                                        <p className="text-stone-400 text-sm">
                                            {t("你可以选择继续挑战以获得更高分数，或者现在带着战利品离开。")}
                                        </p>
                                    </div>

                                    <div className="flex flex-col w-full gap-3 mt-4">
                                        <button
                                            onClick={handleEvacuationContinue}
                                            className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl hover:bg-sky-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={20} />
                                            {t("继续挑战 (难度提升)")}
                                        </button>

                                        <button
                                            onClick={handleEvacuationExtract}
                                            className="w-full bg-white border-2 border-stone-200 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-50 hover:text-stone-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Flag size={20} />
                                            {t("提取分数 (结束游戏)")}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // Standard Item Modal
                                <>
                                    <div className={`w-32 h-32 rounded-2xl flex items-center justify-center text-6xl shadow-inner bg-stone-50 border-4 ${modalContent.item?.rarity?.color?.split(' ')[0] || 'border-stone-200'}`}>
                                        <div className={`flex flex-col items-center`}>
                                            {modalContent.item?.icon || '📦'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-lg font-bold ${modalContent.item?.rarity?.starColor?.replace('text-', 'text-') || 'text-stone-800'}`}>
                                            {modalContent.item?.rarity?.name} {modalContent.item?.name}
                                        </span>
                                        <p className="text-stone-500 font-medium">{modalContent.message}</p>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="mt-4 font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95 bg-[#2D2A26] text-white hover:bg-stone-700"
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
        <div className="h-screen w-full bg-[#FBF8F3] text-[#2D2A26] font-sans selection:bg-amber-100 overflow-hidden flex flex-col animate-in fade-in duration-500 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => actions.hideToast()} />}

            {renderModal()}

            <div className="w-full max-w-[1920px] mx-auto h-full flex flex-col shadow-2xl bg-[#FBF8F3] border-x border-[#E8E4DF] relative">

                {/* Reorganized Header for better readability */}
                <header className="px-5 py-2 bg-[#2D2A26] text-white flex justify-between items-center shadow-lg z-20 shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        {/* Game Title & Stage (Left aligned) */}
                        <div className="flex items-center gap-3">
                            <div className="bg-[#E60012] p-2 rounded-lg">
                                <ListOrdered className="text-white" size={24} />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-white tracking-tight leading-tight">三池物语</h1>
                                {config.patience?.enabled !== false && (
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <span className={`w-2 h-2 rounded-full ${patience > 60 ? 'bg-green-400' : patience > 30 ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                        <span className="text-[10px] font-bold tracking-widest uppercase">{t("阶段")} {state.patienceStage + 1}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Primary Gameplay Stats (Most Important) */}
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                            <Star size={16} fill="currentColor" className="text-sky-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                            <span className="text-xl font-black font-mono tracking-tighter leading-none text-sky-400">{score}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Secondary Stats Group (Gold & Difficulty) - Enlarged */}
                        <div className="flex items-center gap-4 pr-4 border-r border-white/10">
                            {/* Gold Display */}
                            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                                <Coins size={16} className="text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                                <span className="text-xl font-black font-mono tracking-tighter leading-none text-amber-400">{gold}</span>
                            </div>

                            {/* Difficulty Display */}
                            {emergencyOrders.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                                    <ChevronsUp size={16} className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                                    <span className="text-xl font-black font-mono tracking-tighter leading-none text-orange-400">LV.{emergencyDifficulty}</span>
                                </div>
                            )}
                        </div>

                        {/* Stage Info (Compact) */}


                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-0.5 border border-white/10">
                            <button onClick={toggleLanguage} className="px-2.5 py-1 hover:bg-white/10 rounded-lg text-[11px] font-black text-white/40 hover:text-white transition-all">
                                {language === 'zh' ? 'EN' : '中'}
                            </button>
                            <div className="w-[1px] h-4 bg-white/10"></div>
                            <button
                                onClick={() => setDebugMode(!debugMode)}
                                title={t("调试模式")}
                                className={`p-2 rounded-lg transition-all ${debugMode ? 'bg-red-500/20 text-red-500' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Zap size={18} fill={debugMode ? "currentColor" : "none"} />
                            </button>
                            <button onClick={onOpenSettings} title={t("设置")} className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white">
                                <Settings size={18} />
                            </button>
                            <button onClick={onReset} title={t("重置")} className="p-2 hover:bg-white/10 rounded-lg transition-all text-red-500/60 hover:text-red-500">
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300">

                    {/* ROW 1: POOLS - Horizontal 3-column layout */}
                    <section className="px-6 py-4 border-b border-[#E8E4DF] bg-[#FBF8F3] shrink-0">
                        <div className="grid grid-cols-3 gap-4">
                            {activePools.map((pool) => {
                                const relevantRequirements = [...orders]
                                    .filter(Boolean)
                                    .flatMap(o => o.requirements)
                                    .filter(req => {
                                        if (!pool.items.some(pi => pi.name === req.name)) return false;
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
                                        disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || isEvacuationMode || !!orderCandidates}
                                    />
                                )
                            })}
                        </div>
                    </section>

                    {/* ROW 2: EMERGENCY ORDERS - Full width */}
                    {state.emergencyOrders && state.emergencyOrders.length > 0 && (
                        <section className="px-6 py-3 border-b border-[#E8E4DF] bg-orange-50/20 shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="bg-red-600 text-white p-2 rounded-lg shadow-lg shrink-0">
                                        <Timer size={18} className="animate-pulse" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-black text-[#2D2A26] leading-none uppercase tracking-tight">
                                            {t("离开关卡需求")}
                                        </h3>
                                        <span className="text-xs text-stone-500 font-bold leading-none mt-1 opacity-80">
                                            {t("(完成任意其一)")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 flex gap-4">
                                    {state.emergencyOrders.map((order, idx) => (
                                        <div key={order.id} className="flex-1">
                                            <OrderCard
                                                order={order}
                                                index={998 + idx}
                                                isScoreOrder={false}
                                                isEmergency={true}
                                                isSubmitMode={isSubmitMode}
                                                canSatisfy={satisfiableOrders.find(r => r.index === 998 + idx)}
                                                potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.index === 998 + idx)}
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
                                                isBeingReplaced={false}
                                                onDebugGetItems={debugMode ? debugGetOrderItems : null}
                                                orderSlotAssignments={orderSlotAssignments}
                                                phantomMarks={phantomMarks}
                                                onUnassign={handleUnassignFromOrder}
                                                onSlotClick={handleOrderSlotClick}
                                                pendingItem={pendingItem}
                                                selectedSlotItem={selectedSlot !== null ? inventory[selectedSlot] : null}
                                                toolSelectionMode={toolSelectionMode}
                                                isRecycleMode={isRecycleMode}
                                                selectionMode={selectionMode}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEvacuate(); }}
                                        disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || !!orderCandidates}
                                        className={`
                                            flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black transition-all duration-200 text-base shadow-lg border-2 whitespace-nowrap
                                            ${isEvacuationMode
                                                ? 'bg-orange-600 text-white ring-4 ring-orange-300 border-orange-400 animate-pulse scale-105'
                                                : (pendingItem || isSubmitMode || isRecycleMode || selectionMode || orderCandidates
                                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                                                    : 'bg-orange-500 text-white hover:bg-orange-600 border-orange-600 hover:scale-105 active:scale-95')
                                            }
                                        `}
                                    >
                                        {isEvacuationMode ? <Check size={20} /> : <Truck size={20} />}
                                        <span>{isEvacuationMode ? t("选择中...") : t("离开关卡")}</span>
                                    </button>

                                    {!isEvacuationMode && !isSubmitMode && !isRecycleMode && !selectionMode && !orderCandidates && (
                                        <button
                                            onClick={onReset}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black transition-all duration-200 text-sm shadow-md bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-600 hover:scale-105 active:scale-95 whitespace-nowrap"
                                        >
                                            <AlertCircle size={18} />
                                            <span>{t("放弃")}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="flex items-center gap-3 px-6 py-1.5">
                      <div className="h-px flex-1 bg-[#E8E4DF]"></div>
                      <span className="text-[10px] font-bold text-[#B5B0AA] uppercase tracking-[0.2em]">{t("订单")}</span>
                      <div className="h-px flex-1 bg-[#E8E4DF]"></div>
                    </div>

                    {/* ROW 3: NORMAL ORDERS - 3-column grid */}
                    <section className="px-6 py-3 shrink-0">
                        <div className="grid grid-cols-3 gap-5">
                            {orders.map((order, idx) => (
                                <div key={order ? order.id : `empty-${idx}`}>
                                    <OrderCard
                                        order={order}
                                        index={idx}
                                        isScoreOrder={true}
                                        isSubmitMode={isSubmitMode}
                                        isEvacuationMode={isEvacuationMode}
                                        canSatisfy={satisfiableOrders.find(r => r.index === idx)}
                                        potentialSatisfy={state.potentialSatisfiableOrders.find(r => r.index === idx)}
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
                                        upgradedOrderItems={state.upgradedOrderItems}
                                        isBeingReplaced={orderCandidates?.slotIndex === idx}
                                        orderSlotAssignments={orderSlotAssignments}
                                        phantomMarks={phantomMarks}
                                        onUnassign={handleUnassignFromOrder}
                                        onSlotClick={handleOrderSlotClick}
                                        pendingItem={pendingItem}
                                        selectedSlotItem={selectedSlot !== null ? inventory[selectedSlot] : null}
                                        toolSelectionMode={toolSelectionMode}
                                        isRecycleMode={isRecycleMode}
                                        selectionMode={selectionMode}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Skills + Rarity + Status bar (below orders) */}
                        {!selectionMode && !orderCandidates && (
                            <div className="flex items-center gap-6 flex-wrap justify-center mt-3">
                                {/* Skills */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-stone-300 uppercase tracking-wider">{t("Passive Skills")}</span>
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map(i => {
                                            const skillId = skills[i];
                                            const skill = SKILL_DEFINITIONS.find(s => s.id === skillId);
                                            const SkillIcon = skill?.Icon || Zap;
                                            return (
                                                <div key={i} title={skill ? `${skill.name}: ${skill.desc}` : '空槽位'} className="group relative w-10 h-10 rounded-full border-2 border-stone-200 bg-stone-100 flex items-center justify-center transition-all hover:scale-110">
                                                    {skill ? (
                                                        <div className={`w-full h-full rounded-full flex items-center justify-center ${skill.color}`}>
                                                            <SkillIcon size={16} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-stone-300"><Zap size={16} /></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="w-px h-6 bg-stone-200" />

                                {/* Rarity Bonuses */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-stone-400 uppercase tracking-wider">{t("品质得分加成")}</span>
                                    {config.rarity.map(rarity => (
                                        <div key={rarity.id} className="flex items-center gap-1 text-xs font-bold text-stone-500 bg-white px-2 py-1 rounded-full shadow-sm border border-stone-100">
                                            <Star size={10} fill="currentColor" className={rarity.starColor} />
                                            <span>{t(rarity.name)} +{Math.round(rarity.bonus * 100)}%</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-px h-6 bg-stone-200" />

                                {/* Status Messages */}
                                <div className="flex items-center gap-2">
                                    {selectedSlot !== null && !pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && !isEvacuationMode && (
                                        <span className="text-sm font-bold text-sky-500 animate-pulse bg-sky-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                            <Hand size={14} /> {t("整理模式")}
                                        </span>
                                    )}
                                    {isSubmitMode && (
                                        <span className="text-sm font-bold text-sky-600 animate-pulse flex items-center gap-2">
                                            <Layers size={14} /> {t("提交模式: 点击订单卡片可一键选择")}
                                        </span>
                                    )}
                                    {isRecycleMode && (
                                        <span className="text-sm font-bold text-amber-600 animate-pulse flex items-center gap-2">
                                            <Trash2 size={14} /> {t("回收模式: 选择道具换取金币")}
                                        </span>
                                    )}
                                    {toolSelectionMode && (
                                        <span className="text-sm font-bold text-cyan-600 animate-pulse flex items-center gap-2">
                                            <Zap size={14} /> {t("请点击选择一个目标物品")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ROW 4: MIDDLE AREA - only renders when selection UI or candidates are active */}
                    {(selectionMode && selectionMode.type !== 'trade_in' || orderCandidates) && (
                    <section className="flex flex-col items-center justify-start overflow-hidden px-6 py-2">

                        {/* Selection Overlay (精准 / 有的放矢) */}
                        {selectionMode && selectionMode.type !== 'trade_in' && (
                            <div className="flex flex-col items-center justify-center gap-6 py-4 animate-in fade-in cursor-default w-full">
                                <h3 className="text-2xl font-black text-[#2D2A26] text-center">
                                    {selectionMode.type === 'precise' ? t("精准：二选一 (不可取消)") : t("有的放矢：请选择你想要的")}
                                </h3>

                                <div className={`
                                    ${selectionMode.type === 'precise'
                                        ? 'flex gap-8 w-full max-w-2xl justify-center items-stretch'
                                        : 'flex flex-wrap gap-5 justify-center max-w-3xl'}
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
                                                    relative transition-all duration-300 hover:scale-[1.03] hover:shadow-xl group
                                                    flex flex-col items-center justify-center gap-4
                                                    ${isPrecise
                                                        ? `flex-1 aspect-[4/5] rounded-3xl border-[4px] ${item.rarity.color} max-w-[240px]`
                                                        : `w-32 h-44 rounded-2xl border-2 bg-white border-stone-200 hover:border-stone-400 shadow-sm`}
                                                `}
                                            >
                                                <div className={`${isPrecise ? 'text-7xl' : 'text-5xl'} filter drop-shadow-sm transition-transform group-hover:scale-110`}>{item.icon}</div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`font-black ${isPrecise ? 'text-2xl' : 'text-base text-stone-700'}`}>{t(item.name)}</span>
                                                    {item.rarity && (
                                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60`}>{t(item.rarity.name)}</span>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Cancel button rendered in unified position below */}
                            </div>
                        )}

                        {/* Order Candidates (2选1) */}
                        {orderCandidates && (
                            <div className="flex flex-col items-center justify-center gap-4 py-4 animate-in fade-in duration-300 w-full">
                                <div className="flex items-center gap-3">
                                    <div className="bg-sky-500 text-white rounded-full p-2 shadow-lg">
                                        <Package size={18} />
                                    </div>
                                    <h3 className="text-lg font-black text-[#2D2A26]">{t("选择一个订单")}</h3>
                                    {orderCandidateQueue.length > 0 && (
                                        <div className="text-sm text-stone-500 font-bold bg-stone-100 px-3 py-1 rounded-full">
                                            {t("待选订单")}: {orderCandidateQueue.length + 1}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-stone-600 font-medium">{t("请从以下2个订单中选择1个")}</p>
                                <div className="flex gap-5 justify-center w-full">
                                    {orderCandidates.candidates.map((candidate, cidx) => (
                                        <div
                                            key={candidate.id}
                                            onClick={() => handleSelectOrderCandidate(cidx)}
                                            className="cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                                            style={{ width: 'calc((100% - 2 * 1.25rem) / 3)' }}
                                        >
                                            <OrderCard
                                                order={candidate}
                                                index={-1}
                                                isScoreOrder={true}
                                                isSubmitMode={false}
                                                isEvacuationMode={false}
                                                canSatisfy={null}
                                                potentialSatisfy={null}
                                                onClick={() => handleSelectOrderCandidate(cidx)}
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
                                                upgradedOrderItems={[]}
                                                isBeingReplaced={false}
                                                isCandidate={false}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                    )}

                    <div className="flex items-center gap-3 px-6 py-1.5">
                      <div className="h-px flex-1 bg-[#E8E4DF]"></div>
                      <span className="text-[10px] font-bold text-[#B5B0AA] uppercase tracking-[0.2em]">{t("仓库")}</span>
                      <div className="h-px flex-1 bg-[#E8E4DF]"></div>
                    </div>

                    {/* ROW 5: INVENTORY - 2x5 grid at bottom */}
                    <section className={`
                        px-6 py-3 border-t border-[#E8E4DF] bg-white/95 backdrop-blur shadow-[0_-4px_15px_rgba(45,42,38,0.05)] z-30 shrink-0 transition-colors duration-300 mt-auto
                        ${pendingItem ? 'bg-rose-50/95 border-rose-200' : ''}
                        ${isSubmitMode ? 'bg-sky-50/95 border-sky-200' : ''}
                        ${isRecycleMode ? 'bg-amber-50/95 border-amber-200' : ''}
                        ${selectionMode?.type === 'trade_in' ? 'bg-purple-50/95 border-purple-200' : ''}
                    `}>
                        <div className="flex items-center gap-3 mb-2 justify-center">
                            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t("背包栏位")} ({inventory.length}/{maxInventorySize})</h2>
                            {!pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && !isEvacuationMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSortInventory(); }}
                                    className="flex items-center gap-1.5 bg-white border border-stone-200 shadow-sm text-stone-600 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all active:scale-95"
                                >
                                    <ListOrdered size={14} />
                                    <span>{t("一键整理")}</span>
                                </button>
                            )}
                        </div>

                        {/* Action Buttons - centered row above grid */}
                        <div className={`flex gap-3 justify-center mb-2 ${pendingItem ? 'hidden' : ''}`}>
                            {!isSubmitMode && !isRecycleMode && !isEvacuationMode && !pendingItem && !selectionMode && (
                                <>
                                    <button onClick={toggleRecycleMode} className="flex items-center justify-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 font-bold py-3 px-5 rounded-xl shadow-sm hover:bg-amber-200 transition-transform active:scale-95 text-base">
                                        <Trash2 size={18} /> {t("回收")}
                                    </button>
                                    <button onClick={toggleSubmitMode} className="flex items-center justify-center gap-2 bg-[#2D2A26] text-white font-bold py-3 px-5 rounded-xl shadow-md hover:bg-stone-700 transition-transform active:scale-95 text-base">
                                        <Layers size={18} /> {t("出牌")}
                                    </button>
                                </>
                            )}

                            {isSubmitMode && (
                                <button onClick={handleConfirmSubmission} disabled={selectedIndices.length === 0} className={`flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-xl shadow-md text-base ${selectedIndices.length > 0 ? 'bg-sky-600 text-white' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
                                    <Send size={16} /> {t("确认出牌")}
                                </button>
                            )}

                            {isRecycleMode && (
                                <button onClick={handleConfirmRecycle} disabled={selectedIndices.length === 0} className={`flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-xl shadow-md text-base ${selectedIndices.length > 0 ? 'bg-amber-600 text-white' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
                                    <Trash2 size={16} /> {t("确认回收")} (+{totalRecycleValue}🪙)
                                </button>
                            )}

                            {isEvacuationMode && (
                                <button onClick={handleConfirmEvacuation} disabled={satisfiableOrders.filter(o => o.index >= 998).length === 0} className={`flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-xl shadow-md text-base ${satisfiableOrders.filter(o => o.index >= 998).length > 0 ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
                                    <Truck size={16} /> {t("确认离开此关卡")}
                                </button>
                            )}

                            {/* Unified Cancel Button */}
                            {(isSubmitMode || isRecycleMode || isEvacuationMode || selectionMode?.type === 'trade_in' || selectionMode?.type === 'targeted' || toolSelectionMode) && (
                                <button
                                    onClick={() => {
                                        if (isSubmitMode) toggleSubmitMode();
                                        else if (isRecycleMode) toggleRecycleMode();
                                        else if (isEvacuationMode) toggleEvacuationMode();
                                        else if (selectionMode) handleSelectionCancel();
                                        else if (toolSelectionMode) handleCancelToolSelection();
                                    }}
                                    className="bg-red-500 text-white hover:bg-red-600 px-8 py-3 rounded-xl font-black transition-all shadow-lg flex items-center gap-2 text-base active:scale-95"
                                >
                                    <X size={18} />
                                    {isSubmitMode ? t("取消出牌")
                                        : isRecycleMode ? t("取消回收")
                                        : isEvacuationMode ? t("取消离开")
                                        : selectionMode?.type === 'trade_in' ? t("取消置换")
                                        : selectionMode?.type === 'targeted' ? t("取消选择")
                                        : toolSelectionMode ? t("取消工具使用")
                                        : t("取消")}
                                </button>
                            )}
                        </div>

                        <div className="flex gap-6 items-end justify-center">
                            {/* Main Inventory - 2x5 Grid */}
                            <div className="grid grid-cols-5 gap-2" style={{ width: 'fit-content' }}>
                                {Array.from({ length: maxInventorySize }).map((_, idx) => {
                                    const item = inventory[idx];
                                    const isSelected = selectedSlot === idx || selectedIndices.includes(idx) || (toolSelectionMode?.toolIndex === idx);

                                    const sourceItem = pendingItem || (selectedSlot !== null ? inventory[selectedSlot] : null);
                                    const isSourceSelf = !pendingItem && selectedSlot === idx;

                                    const canSynthesize = item && sourceItem && !isSourceSelf &&
                                        item.name === sourceItem.name &&
                                        item.rarity.id === sourceItem.rarity.id &&
                                        !item.sterile && !sourceItem.sterile &&
                                        item.rarity.id !== 'mythic' &&
                                        currentStageConfig.mechanics.synthesis;

                                    const activeReqs = [
                                        ...orders.filter(Boolean).flatMap(o => o.requirements),
                                        ...emergencyOrders.flatMap(o => o.requirements)
                                    ];
                                    const matchedReqs = item ? activeReqs.filter(r => r.name === item.name) : [];
                                    const isNeeded = matchedReqs.length > 0;
                                    const isMaxSatisfied = isNeeded && matchedReqs.some(r => item.rarity.bonus >= r.requiredRarity.bonus);

                                    const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                                        otherIdx !== idx &&
                                        other &&
                                        !other.sterile &&
                                        other.name === item.name &&
                                        other.rarity.id === item.rarity.id &&
                                        item.rarity.id !== 'mythic'
                                    );

                                    const isOverloadTarget =
                                        (pendingItem?.isOverload && item && item.name === hoveredItemName) ||
                                        (pendingItem && !pendingItem.isOverload && hoveredSlotIndex === idx);

                                    const isToolTarget = toolSelectionMode && item && !item.isToolItem && toolSelectionMode.toolIndex !== idx;

                                    return (
                                        <InventorySlot
                                            key={idx}
                                            index={idx}
                                            item={item}
                                            isSelected={isSelected}
                                            isTarget={!!sourceItem && !isSourceSelf}
                                            isSubmitMode={isSubmitMode || isEvacuationMode}
                                            isRecycleMode={isRecycleMode}
                                            isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                                            isReference={selectionMode?.type === 'trade_in' || !!toolSelectionMode}
                                            canSynthesize={canSynthesize || isToolTarget}
                                            isNeededForOrder={isNeeded}
                                            isMaxSatisfied={isMaxSatisfied}
                                            hasUpgradePair={hasUpgradePair}
                                            isOverloadTarget={isOverloadTarget}
                                            onClick={handleSlotClick}
                                            onContextMenu={handleToolItemUse}
                                            onMouseEnter={(i, item) => { state.setHoveredSlotIndex(i); if (item) state.setHoveredItemName(item.name); }}
                                            onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                            isHovered={hoveredSlotIndex === idx}
                                            className="inventory-slot"
                                            nextDrawEnhanced={skillState?.nextDrawEnhanced}
                                            isAssigned={item && assignedItemUids.has(item.uid)}
                                        />
                                    )
                                })}
                            </div>

                            {/* Pending Queue */}
                            {pendingItem && (
                                <div className="flex items-end gap-3 shrink-0 z-40 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-rose-200 shadow-2xl flex items-center gap-3">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="flex items-center gap-1 text-red-600 font-bold text-xs">
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span className="truncate">{pendingItem.isOverload ? t("种类过载") : `${t("待处理")} (${pendingQueue.length + 1})`}</span>
                                            </div>
                                            <div className="relative transform hover:scale-105 transition-transform">
                                                {(() => {
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
                                                            className="inventory-slot"
                                                        />
                                                    )
                                                })()}
                                            </div>
                                            <button
                                                onClick={handleDiscardNew}
                                                className="flex items-center justify-center gap-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                                            >
                                                <X size={12} />
                                                {pendingItem.rarity.recycleValue > 0 ? `${t("回收")} +${pendingItem.rarity.recycleValue}` : t("丢弃")}
                                            </button>
                                        </div>

                                        {pendingQueue.map((qItem, idx) => {
                                            const activeReqs = [
                                                ...orders.filter(Boolean).flatMap(o => o.requirements),
                                                ...emergencyOrders.flatMap(o => o.requirements)
                                            ];
                                            const matchedReqs = activeReqs.filter(r => r.name === qItem.name);
                                            const isNeeded = matchedReqs.length > 0;
                                            const isMaxSatisfied = isNeeded && matchedReqs.some(r => qItem.rarity.bonus >= r.requiredRarity.bonus);

                                            return (
                                                <div key={idx} className="flex flex-col items-center gap-1 opacity-60 grayscale-[0.3]">
                                                    <div className="text-xs font-bold text-stone-400">#{idx + 1}</div>
                                                    <InventorySlot
                                                        item={qItem}
                                                        index={-1}
                                                        isPendingSlot={true}
                                                        isNeededForOrder={isNeeded}
                                                        isMaxSatisfied={isMaxSatisfied}
                                                        onClick={() => { }} onMouseEnter={() => { }} onMouseLeave={() => { }}
                                                        className="inventory-slot pointer-events-none"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    </section>
                </main>
            </div>

            {/* Trade-in overlay */}
            {selectionMode?.type === 'trade_in' && (
                <div className="fixed inset-0 z-10 bg-black/20 pointer-events-none"></div>
            )}
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
