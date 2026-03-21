import React, { useEffect, useState } from 'react';
import { Settings, RotateCcw, X, Coins, Flag, Power, ChevronUp, ChevronDown, Check, Truck, Trash2, RefreshCw, Star, Hand, Repeat, AlertCircle, Zap, ListOrdered } from 'lucide-react';

import { useGameLogic } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { SkillSelectionModal } from './components/game/SkillSelectionModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { InventorySlot } from './components/game/InventorySlot';
import { PoolCard } from './components/game/PoolCard';

import MilestoneGrid from './components/game/MilestoneGrid';
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
        drawCount, activePools,
        milestone, milestoneNumber, cellMatches, fillableCellIds, relevantPoolIds,
        inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredPoolId, hoveredItemName, hoveredSlotIndex, hoveredPoolItemNames,
        isSubmitMode, isRecycleMode, isEvacuationMode, selectedIndices,
        modalContent, selectionMode,
        skills, skillSelectionCandidates, skillState,
        toast, totalRecycleValue, selectedItemNames,
        toolSelectionMode, canEvacuate
    } = state;

    const {
        handleSkillSelect,
        handleSkillReplace,
        handleCloseModal,
        handleSlotClick,
        handleDiscardNew,
        handleFillCell,
        handleEvacuate,
        handleEvacuationContinue,
        handleEvacuationExtract,
        handleConfirmRecycle,
        toggleSubmitMode,
        toggleRecycleMode,
        handleDraw,
        handleSelectionSelect,
        handleSelectionCancel,
        handleSortInventory,
        handlePoolHover,
        handlePoolLeave,
        refreshPools,
        addInventoryItem,
        handleToolItemUse,
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
                            ) : modalContent.type === 'evacuation_triggered' ? (
                                // Evacuation Triggered by completing a task with evacuation cell
                                <>
                                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-5xl shadow-inner mb-2">
                                        🚀
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-slate-500 font-medium text-lg">
                                            {t("当前积分")}: <span className="font-bold text-blue-600 font-mono text-xl">{modalContent.score}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col w-full gap-3 mt-4">
                                        <button
                                            onClick={handleEvacuationContinue}
                                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={20} />
                                            {t("继续下一个里程碑")}
                                        </button>
                                        <button
                                            onClick={handleEvacuationExtract}
                                            className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Flag size={20} />
                                            {t("提取积分离开")}
                                        </button>
                                    </div>
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

                            {/* Milestone Display */}
                            {milestone && (
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-orange-100">{t("里程碑")}</span>
                                    <div className="flex items-center gap-2 text-orange-400">
                                        <Flag size={20} className="drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                                        <span className="text-3xl font-black font-mono tracking-tighter leading-none">#{milestoneNumber}</span>
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

                <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-300">

                    {/* TOP: MILESTONE GRID */}
                    <section className="flex-none flex flex-col items-center px-4 py-4 bg-slate-50/50 border-b border-slate-200">
                        <div className="flex flex-col gap-3 w-full max-w-2xl">
                            <MilestoneGrid
                                milestone={milestone}
                                fillableCellIds={fillableCellIds}
                                onFillCell={handleFillCell}
                                milestoneNumber={milestoneNumber}
                                hoveredPoolItemNames={hoveredPoolItemNames}
                                canEvacuate={canEvacuate}
                                onEvacuate={handleEvacuate}
                            />

                        </div>
                    </section>

                    {/* MIDDLE: POOLS (horizontal row) */}
                    <section className="flex-none border-b border-slate-200 relative">
                        <div className="px-4 py-3">
                            <div className={`
                                flex gap-3 overflow-x-auto pb-1 custom-scrollbar
                                transition-opacity duration-300
                            `}>
                                {activePools.map((pool) => {
                                    const relevantRequirements = milestone
                                        ? milestone.cells
                                            .filter(c => !c.filledItem && pool.items.some(pi => pi.name === c.itemName))
                                            .map(c => ({ name: c.itemName, requiredRarity: { bonus: 0 } }))
                                        : [];

                                    return (
                                        <div key={pool.id} className="flex-1 min-w-[200px]">
                                            <PoolCard
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
                                                disabled={!!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || isEvacuationMode}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
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

                    {/* BOTTOM: INVENTORY */}
                    <section className={`
                        flex-none w-full p-4 bg-white/95 backdrop-blur z-30 transition-colors duration-300 relative
                        ${pendingItem ? 'bg-red-50/95' : ''}
                        ${isRecycleMode ? 'bg-amber-50/95' : ''}
                        ${selectionMode?.type === 'trade_in' ? 'bg-purple-50/95' : ''}
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
                                    {!pendingItem && !isRecycleMode && !selectionMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSortInventory(); }}
                                            className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                                        >
                                            <ListOrdered size={14} />
                                            <span>{t("一键整理")}</span>
                                        </button>
                                    )}
                                </div>
                                {selectedSlot !== null && !pendingItem && !isRecycleMode && !selectionMode && (
                                    <span className="text-xs font-bold text-blue-500 animate-pulse bg-blue-50 px-2 py-1 rounded flex items-center gap-2">
                                        <Hand size={14} /> {t("整理模式")}
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
                                {toolSelectionMode && (
                                    <span className="text-xs font-bold text-cyan-600 animate-pulse flex items-center gap-1">
                                        <Zap size={14} /> {t("请点击选择一个目标物品")}
                                    </span>
                                )}




                            </div>

                            {/* Inventory Grid + Pending Queue */}
                            <div className="flex flex-col lg:flex-row gap-4 justify-center items-center lg:items-end relative max-w-3xl mx-auto">

                                {/* Main Inventory */}
                                <div className="flex flex-wrap gap-2 justify-center max-w-full">
                                    {Array.from({ length: maxInventorySize }).map((_, idx) => {
                                        const item = inventory[idx];
                                        const isSelected = selectedSlot === idx || selectedIndices.includes(idx) || (toolSelectionMode?.toolIndex === idx);

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

                                        // Badge Logic: Check if item is needed by unfilled milestone cells
                                        const neededCells = item && milestone
                                            ? milestone.cells.filter(c => !c.filledItem && c.itemName === item.name)
                                            : [];
                                        const isNeeded = neededCells.length > 0;
                                        const isMaxSatisfied = isNeeded && neededCells.some(c => {
                                            const reqRarity = config.rarity.find(r => r.id === c.requiredRarity);
                                            return reqRarity && item.rarity.bonus >= reqRarity.bonus;
                                        });

                                        // Upgrade Badge Logic
                                        const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                                            otherIdx !== idx &&
                                            other &&
                                            !other.sterile &&
                                            other.name === item.name &&
                                            other.rarity.id === item.rarity.id &&
                                            item.rarity.id !== 'mythic'
                                        );

                                        // Fix: Show Red Recycle Overlay for ANY pending item replacement logic
                                        const isOverloadTarget =
                                            (pendingItem?.isOverload && item && item.name === hoveredItemName) ||
                                            (pendingItem && !pendingItem.isOverload && hoveredSlotIndex === idx);

                                        // Tool target: in tool selection mode, non-tool items are valid targets
                                        const isToolTarget = toolSelectionMode && item && !item.isToolItem && toolSelectionMode.toolIndex !== idx;

                                        return (
                                            <InventorySlot
                                                key={idx}
                                                index={idx}
                                                item={item}
                                                isSelected={isSelected}
                                                isTarget={!!sourceItem && !isSourceSelf}
                                                isSubmitMode={false}
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
                                                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
                                                nextDrawEnhanced={skillState?.nextDrawEnhanced}
                                                isAssigned={false}
                                            />
                                        )
                                    })}
                                </div>

                                {/* Action Buttons (Moved to prevent overlap) */}
                                <div className={`flex flex-col gap-2 shrink-0 justify-end pb-2 w-40 min-h-[88px] ${pendingItem ? 'hidden' : ''}`}>
                                    {!isRecycleMode && !pendingItem && !selectionMode && (
                                        <button onClick={toggleRecycleMode} className="w-full flex items-center justify-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 font-bold py-3 px-6 rounded-xl shadow-sm hover:bg-amber-200 transition-transform active:scale-95">
                                            <Trash2 size={18} /> {t("回收")}
                                        </button>
                                    )}

                                    {isRecycleMode && (
                                        <div className="flex flex-col gap-2">
                                            <button onClick={handleConfirmRecycle} disabled={selectedIndices.length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${selectedIndices.length > 0 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                                                <Trash2 size={16} /> {t("确认回收")} (+{totalRecycleValue}🪙)
                                            </button>
                                            <button onClick={toggleRecycleMode} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                        </div>
                                    )}

                                    {selectionMode?.type === 'trade_in' && (
                                        <button onClick={handleSelectionCancel} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                    )}
                                    {toolSelectionMode && (
                                        <button onClick={handleCancelToolSelection} className="w-full bg-white border border-cyan-300 text-cyan-700 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-cyan-50 flex items-center justify-center gap-2">
                                            <X size={14} /> {t("取消工具使用")}
                                        </button>
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
                                                            const pendingNeededCells = milestone
                                                                ? milestone.cells.filter(c => !c.filledItem && c.itemName === pendingItem.name)
                                                                : [];
                                                            const isNeeded = pendingNeededCells.length > 0;
                                                            const isMaxSatisfied = isNeeded && pendingNeededCells.some(c => {
                                                                const reqRarity = config.rarity.find(r => r.id === c.requiredRarity);
                                                                return reqRarity && pendingItem.rarity.bonus >= reqRarity.bonus;
                                                            });

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
                                                    const qNeededCells = milestone
                                                        ? milestone.cells.filter(c => !c.filledItem && c.itemName === qItem.name)
                                                        : [];
                                                    const isNeeded = qNeededCells.length > 0;
                                                    const isMaxSatisfied = isNeeded && qNeededCells.some(c => {
                                                        const reqRarity = config.rarity.find(r => r.id === c.requiredRarity);
                                                        return reqRarity && qItem.rarity.bonus >= reqRarity.bonus;
                                                    });

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
