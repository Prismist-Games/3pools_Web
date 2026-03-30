import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Settings, X, Coins, Power, Trash2, Layers, Send, Zap, ListOrdered, Calendar, ArrowRight } from 'lucide-react';

import { useGameLogic } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { InventorySlot } from './components/game/InventorySlot';
import ResourceMatrix from './components/game/ResourceMatrix';
import { EventCard } from './components/game/EventCard';
import { EVENT_ITEMS } from './data/constants';

const GameCore = ({ config, onOpenSettings, showSettings, debugMode, setDebugMode, onReset, initialSkills, initialProgress, debugAddItem, onDebugAddItemHandled, initialScore }) => {
    const { t, language, toggleLanguage } = useLanguage();

    // Refs for fly animation
    const matrixRef = useRef(null);
    const inventoryRef = useRef(null);
    const [flyingItem, setFlyingItem] = useState(null);

    // Initialize Logic Hook
    const { state, actions, helpers } = useGameLogic(config);

    const {
        gold, currentStageConfig, maxInventorySize,
        drawCount, matrix, gravityEvent, lastDraw, isDrawing, explodingCells, goldFlash,
        inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredItemName, hoveredSlotIndex,
        isSubmitMode, isRecycleMode, selectedIndices,
        modalContent, selectionMode,
        skillState,
        toast, totalRecycleValue, selectedItemNames,
        // Event system
        currentDay, events, eventResults, gameState: eventGameState, gamePhase,
        submitTargetEventId, currentItemPool, drawsRemaining, dayFailed,
    } = state;

    const {
        handleCloseModal,
        handleSlotClick,
        handleDiscardNew,
        handleConfirmSubmission,
        toggleSubmitMode,
        toggleRecycleMode,
        selectRowOrColumn,
        handleConfirmRecycle,
        handleSortInventory,
        handleEventClick,
        endDay,
        debugGetEventItems,
        resetGame,
    } = actions;

    const { canCompleteEvent } = helpers;

    // Build fake "orders" from events for ResourceMatrix compatibility
    // ResourceMatrix expects: orders[].requirements[].name and .requiredRarity
    const matrixOrders = useMemo(() => {
        return events
            .filter(evt => evt.status === 'active')
            .map(evt => ({
                id: evt.id,
                requirements: evt.requirements.map(reqItemId => {
                    const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
                    return {
                        name: eventItem ? eventItem.name : reqItemId,
                        requiredRarity: { id: 'common', bonus: 0, name: '普通' },
                    };
                }),
            }));
    }, [events]);

    // Fly animation
    const lastDrawTickRef = useRef(null);
    useEffect(() => {
        if (!lastDraw || lastDraw.tick === lastDrawTickRef.current) return;
        lastDrawTickRef.current = lastDraw.tick;

        if (lastDraw.cellType && lastDraw.cellType !== 'normal') return;

        const matrixEl = matrixRef.current;
        const invEl = inventoryRef.current;
        if (!matrixEl || !invEl) return;

        const gridSize = 4;
        const childIndex = (gridSize + 1)
            + lastDraw.row * (gridSize + 1)
            + 1
            + lastDraw.col;
        const cellEl = matrixEl.children[childIndex];
        if (!cellEl) return;

        const cellRect = cellEl.getBoundingClientRect();
        const invRect = invEl.getBoundingClientRect();

        setFlyingItem({
            item: lastDraw.item,
            rarity: lastDraw.rarity,
            startX: cellRect.left + cellRect.width / 2,
            startY: cellRect.top + cellRect.height / 2,
            endX: invRect.left + invRect.width / 2,
            endY: invRect.top + 20,
            tick: lastDraw.tick,
        });

        const clearTimer = setTimeout(() => setFlyingItem(null), 550);
        return () => clearTimeout(clearTimer);
    }, [lastDraw]);

    // Handle reset
    const handleReset = () => {
        resetGame();
        if (onReset) onReset();
    };

    // === Game Summary Screen ===
    if (gamePhase === 'summary') {
        // Collect all events that appeared
        const allEventIds = new Set([...Object.keys(eventResults), ...events.map(e => e.id)]);
        const allEvents = [];
        for (const id of allEventIds) {
            const def = events.find(e => e.id === id) || { id, name: id };
            allEvents.push({
                id,
                name: def.name || id,
                result: eventResults[id] || (def.status === 'success' ? 'success' : def.status === 'fail' ? 'fail' : 'incomplete'),
            });
        }

        const successCount = allEvents.filter(e => e.result === 'success').length;
        const failCount = allEvents.filter(e => e.result === 'fail').length;

        return (
            <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 flex flex-col items-center gap-6 border-4 border-slate-200">
                    <h1 className="text-3xl font-black text-slate-800">{t("游戏总结")}</h1>

                    <div className="w-full flex flex-col gap-3">
                        {allEvents.map(evt => (
                            <div key={evt.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${
                                evt.result === 'success' ? 'bg-green-50 border-green-300' :
                                evt.result === 'fail' ? 'bg-red-50 border-red-300' :
                                'bg-slate-50 border-slate-200'
                            }`}>
                                <span className="font-bold text-sm">{t(evt.name)}</span>
                                <span className={`text-sm font-black ${
                                    evt.result === 'success' ? 'text-green-600' :
                                    evt.result === 'fail' ? 'text-red-600' :
                                    'text-slate-400'
                                }`}>
                                    {evt.result === 'success' ? t("已完成") : evt.result === 'fail' ? t("已失败") : '---'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="text-slate-500 text-sm mb-1">{`${successCount} ${t("个完成")}，${failCount} ${t("个失败")}`}</p>
                        {successCount >= allEvents.length * 0.7 && (
                            <p className="text-green-600 font-bold">{t("这三天挺过来了。事情在好转。")}</p>
                        )}
                        {successCount < allEvents.length * 0.3 && (
                            <p className="text-red-600 font-bold">{t("这三天很难熬。但明天又是新的一天。")}</p>
                        )}
                        {successCount >= allEvents.length * 0.3 && successCount < allEvents.length * 0.7 && (
                            <p className="text-amber-600 font-bold">{t("不容易，但活下来了。有些事成了，有些没有。")}</p>
                        )}
                    </div>

                    <button
                        onClick={handleReset}
                        className="mt-4 font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95 bg-slate-800 text-white hover:bg-slate-700"
                    >
                        {t("再来一局")}
                    </button>
                </div>
            </div>
        );
    }

    // === Main Game UI ===
    return (
        <div className="h-screen w-full bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 overflow-hidden flex flex-col animate-in fade-in duration-500 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => actions.hideToast()} />}

            {/* Flying item animation */}
            {flyingItem && (
                <div
                    key={flyingItem.tick}
                    className="fixed pointer-events-none z-[300]"
                    style={{
                        left: flyingItem.startX,
                        top: flyingItem.startY,
                        transform: 'translate(-50%, -50%)',
                        animation: 'fly-to-inventory 0.5s cubic-bezier(0.2, 0, 0.2, 1) forwards',
                        '--fly-dx': `${flyingItem.endX - flyingItem.startX}px`,
                        '--fly-dy': `${flyingItem.endY - flyingItem.startY}px`,
                    }}
                >
                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-3 shadow-2xl ${
                        flyingItem.rarity.id === 'common' ? 'bg-slate-100 border-slate-400' :
                        flyingItem.rarity.id === 'uncommon' ? 'bg-green-100 border-green-500' :
                        flyingItem.rarity.id === 'rare' ? 'bg-blue-100 border-blue-500' :
                        flyingItem.rarity.id === 'epic' ? 'bg-purple-100 border-purple-500' :
                        flyingItem.rarity.id === 'legendary' ? 'bg-orange-100 border-orange-500' :
                        'bg-red-100 border-red-500'
                    }`}>
                        <span className="text-2xl">{flyingItem.item.icon}</span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fly-to-inventory {
                    0% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
                    20% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                    100% { transform: translate(calc(-50% + var(--fly-dx)), calc(-50% + var(--fly-dy))) scale(0.6); opacity: 0.3; }
                }
            `}</style>

            <div className="w-full max-w-7xl mx-auto h-full flex flex-col shadow-2xl bg-white border-x border-slate-200 relative">

                {/* Header */}
                <header className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shadow-lg z-20 shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-8">
                        {/* Day Counter */}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                                <Calendar className="text-white" size={24} />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    {`${t("第")} ${currentDay} ${t("天")}`}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Draws Remaining */}
                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-blue-100">{t("剩余抽取")}</span>
                            <div className={`flex items-center gap-2 ${drawsRemaining <= 2 ? 'text-orange-400' : drawsRemaining === 0 ? 'text-red-500' : 'text-blue-400'}`}>
                                <Zap size={18} />
                                <span className="text-2xl font-black font-mono tracking-tighter leading-none">{drawsRemaining}</span>
                            </div>
                        </div>
                        {/* Gold Display */}
                        <div className={`flex flex-col gap-1 items-end transition-all duration-300 ${goldFlash ? 'scale-110' : ''}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-yellow-100">{t("持有金币")}</span>
                            <div className={`flex items-center gap-2.5 ${gold <= 5 ? 'text-red-400' : gold === 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                                <Coins size={20} className={`${gold <= 5 ? 'drop-shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse' : 'drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'}`} />
                                <span className={`text-3xl font-black font-mono tracking-tighter leading-none ${goldFlash ? 'text-red-300' : ''}`}>{gold}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-1 border border-slate-700 shadow-inner">
                            <button onClick={toggleLanguage} className="px-2.5 py-1 hover:bg-slate-700 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-all">
                                {language === 'zh' ? 'EN' : '中'}
                            </button>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <button
                                onClick={() => setDebugMode(!debugMode)}
                                title="Debug"
                                className={`p-2 rounded-lg transition-all ${debugMode ? 'bg-red-500/20 text-red-500' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                <Zap size={18} fill={debugMode ? "currentColor" : "none"} />
                            </button>
                            <button onClick={onOpenSettings} title={t("设置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
                                <Settings size={18} />
                            </button>
                            <button onClick={handleReset} title={t("重置")} className="p-2 hover:bg-slate-700 rounded-lg transition-all text-red-500/60 hover:text-red-500">
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden transition-all duration-300">

                    {/* LEFT COLUMN: EVENTS */}
                    <section className="flex-none lg:w-[45%] xl:w-[42%] h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="flex flex-col gap-3">
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg">
                                            <Calendar size={14} />
                                        </div>
                                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                            {t("今日事件")}
                                        </h2>
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold">
                                        {events.filter(e => e.status === 'active').length} {t("进行中")}
                                    </span>
                                </div>

                                {/* Event Cards */}
                                {events.map(evt => (
                                    <EventCard
                                        key={evt.id}
                                        event={evt}
                                        currentDay={currentDay}
                                        inventory={inventory}
                                        isSubmitMode={isSubmitMode}
                                        isTargeted={submitTargetEventId === evt.id}
                                        canComplete={canCompleteEvent(evt.id)}
                                        onClick={handleEventClick}
                                        onDebugGetItems={debugMode ? debugGetEventItems : null}
                                        selectedIndices={selectedIndices}
                                    />
                                ))}

                                {events.length === 0 && (
                                    <div className="text-center text-slate-300 py-8 font-bold">
                                        {t("暂无事件")}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Day Failed Warning */}
                        {dayFailed && (
                            <div className="mx-4 mt-2 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-center">
                                <span className="text-red-700 font-bold text-sm">⚠️ {t("撤离失败！今天的物品无法提交。")}</span>
                            </div>
                        )}

                        {/* End Day Button */}
                        <div className="p-4 border-t border-slate-200 bg-white/80">
                            <button
                                onClick={endDay}
                                disabled={!!pendingItem || isSubmitMode || isRecycleMode}
                                className={`
                                    w-full flex items-center justify-center gap-2 font-black py-3 px-6 rounded-xl shadow-md transition-all duration-200 text-sm
                                    ${pendingItem || isSubmitMode || isRecycleMode
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : currentDay >= 3
                                            ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95 border-2 border-red-700'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 border-2 border-indigo-700'
                                    }
                                `}
                            >
                                <ArrowRight size={18} />
                                {currentDay >= 3 ? t("结束游戏") : t("结束今天")}
                            </button>
                        </div>
                    </section>

                    {/* RIGHT COLUMN: MATRIX + INVENTORY */}
                    <section className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* MATRIX */}
                        <div className="flex-1 flex flex-col p-3 lg:p-4 relative overflow-hidden">
                            <div className="flex flex-col gap-2 flex-1 justify-center">
                                <ResourceMatrix
                                    ref={matrixRef}
                                    matrix={matrix}
                                    gravityEvent={gravityEvent}
                                    pickingCell={isDrawing && lastDraw ? { row: lastDraw.row, col: lastDraw.col } : null}
                                    explodingCells={explodingCells}
                                    onSelectRow={(rowIdx) => selectRowOrColumn('row', rowIdx)}
                                    onSelectCol={(colIdx) => selectRowOrColumn('col', colIdx)}
                                    disabled={isDrawing || !!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || gold <= 0 || drawsRemaining <= 0}
                                    orders={matrixOrders}
                                    emergencyOrders={[]}
                                    inventory={inventory}
                                />
                            </div>
                        </div>

                        {/* BOTTOM UI: Inventory */}
                        <div className={`
                            flex-none w-full p-4 border-t-2 border-slate-200 bg-white/95 backdrop-blur shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-colors duration-300 relative
                            ${pendingItem ? 'bg-red-50/95 border-red-200' : ''}
                            ${isSubmitMode ? 'bg-blue-50/95 border-blue-200' : ''}
                            ${isRecycleMode ? 'bg-amber-50/95 border-amber-200' : ''}
                        `}>

                            {/* Rarity Bonuses Bar */}
                            <div className="flex items-center justify-center gap-3 py-2 border-b border-slate-100 flex-wrap bg-white/50 mb-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2 border-r border-slate-200 pr-3">{t("品质得分加成")}</div>
                                {config.rarity.map(rarity => (
                                    <div key={rarity.id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                                        <span className={`w-2 h-2 rounded-full ${rarity.dotColor}`}></span>
                                        <span>{t(rarity.name)}</span>
                                    </div>
                                ))}
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
                                {isSubmitMode && (
                                    <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                                        <Layers size={14} /> {t("提交模式：点击事件卡片选择物品")}
                                    </span>
                                )}
                                {isRecycleMode && (
                                    <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                                        <Trash2 size={14} /> {t("回收模式: 选择道具换取金币")}
                                    </span>
                                )}
                            </div>

                            {/* Inventory Grid */}
                            <div className="flex flex-col lg:flex-row gap-4 justify-center items-center lg:items-end relative max-w-3xl mx-auto">

                                <div ref={inventoryRef} className="flex flex-wrap gap-2 justify-center max-w-full">
                                    {Array.from({ length: maxInventorySize }).map((_, idx) => {
                                        const item = inventory[idx];
                                        const isSelected = selectedSlot === idx || selectedIndices.includes(idx);

                                        const sourceItem = pendingItem || (selectedSlot !== null ? inventory[selectedSlot] : null);
                                        const isSourceSelf = !pendingItem && selectedSlot === idx;

                                        const canSynthesize = item && sourceItem && !isSourceSelf &&
                                            item.name === sourceItem.name &&
                                            item.rarity.id === sourceItem.rarity.id &&
                                            !item.sterile && !sourceItem.sterile &&
                                            item.rarity.id !== 'mythic';

                                        // Check if item is needed by any active event
                                        const isNeeded = item && events.some(evt =>
                                            evt.status === 'active' && evt.requirements.some(reqId => {
                                                const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqId);
                                                return eventItem && eventItem.name === item.name;
                                            })
                                        );

                                        const hasUpgradePair = item && !item.sterile && inventory.some((other, otherIdx) =>
                                            otherIdx !== idx &&
                                            other &&
                                            !other.sterile &&
                                            other.name === item.name &&
                                            other.rarity.id === item.rarity.id &&
                                            item.rarity.id !== 'mythic'
                                        );

                                        return (
                                            <InventorySlot
                                                key={idx}
                                                index={idx}
                                                item={item}
                                                isSelected={isSelected}
                                                isTarget={!!sourceItem && !isSourceSelf}
                                                isSubmitMode={isSubmitMode}
                                                isRecycleMode={isRecycleMode}
                                                isSelectionMode={false}
                                                isReference={false}
                                                canSynthesize={canSynthesize}
                                                isNeededForOrder={isNeeded}
                                                isMaxSatisfied={isNeeded}
                                                hasUpgradePair={hasUpgradePair}
                                                isOverloadTarget={false}
                                                onClick={handleSlotClick}
                                                onContextMenu={() => {}}
                                                onMouseEnter={(i, item) => { state.setHoveredSlotIndex(i); if (item) state.setHoveredItemName(item.name); }}
                                                onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                                isHovered={hoveredSlotIndex === idx}
                                                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
                                            />
                                        );
                                    })}
                                </div>

                                {/* Action Buttons */}
                                <div className={`flex flex-col gap-2 shrink-0 justify-end pb-2 w-40 min-h-[88px] ${pendingItem ? 'hidden' : ''}`}>
                                    {!isSubmitMode && !isRecycleMode && !pendingItem && !selectionMode && (
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
                                            <button onClick={handleConfirmSubmission} disabled={!submitTargetEventId || selectedIndices.length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${submitTargetEventId && selectedIndices.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
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
                                </div>

                                {/* Pending Item Queue */}
                                {pendingItem && (
                                    <div className="flex flex-col gap-2 shrink-0 z-40 w-40 animate-in slide-in-from-right-4 fade-in duration-300">
                                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-red-200 shadow-2xl flex flex-col gap-2 w-full max-h-[500px]">
                                            <div className="flex justify-between items-center border-b border-red-100 pb-2">
                                                <div className="flex items-center gap-2 text-red-600 font-bold text-sm w-full">
                                                    <span className="truncate">{`${t("待处理")} (${pendingQueue.length + 1})`}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-3 overflow-y-auto pb-2 px-1">
                                                <div className="flex flex-col gap-2 shrink-0 items-center p-2 bg-red-50 rounded-xl border border-red-100 w-full">
                                                    <div className="text-[10px] font-black text-red-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{t("当前处理")}</div>
                                                    <InventorySlot
                                                        item={pendingItem}
                                                        index={-1}
                                                        isPendingSlot={true}
                                                        isSelected={false}
                                                        isNeededForOrder={false}
                                                        isMaxSatisfied={false}
                                                        onClick={handleSlotClick}
                                                        onMouseEnter={() => {}}
                                                        onMouseLeave={() => {}}
                                                        className="w-16 h-16"
                                                    />
                                                    <button
                                                        onClick={handleDiscardNew}
                                                        className="w-full flex items-center justify-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors shadow-sm"
                                                    >
                                                        <X size={12} />
                                                        {pendingItem.rarity.recycleValue > 0 ? `${t("回收")} +${pendingItem.rarity.recycleValue}` : t("丢弃")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default GameCore;
