import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import WallPicker from './components/game/WallPicker';
import BulletinBoard, { SCORE_STYLE, RewardCard, DIFFICULTY_STYLE } from './components/game/BulletinBoard';
import ActiveOrders from './components/game/ActiveOrders';
import ScoreBoard from './components/game/ScoreBoard';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import GameTooltip from './components/ui/GameTooltip';
import WallFunctionPanel from './components/game/WallFunctionPanel';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from './data/v2Config';
import { DOOM_RESOLUTION_DRAWS, getDoomTurnEvents } from './data/v3Config';

const GameCore = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const inventoryRef = useRef(null);
    const bulletinRef = useRef(null);
    const [hoveredStickerIds, setHoveredStickerIds] = useState(null);
    const [recycleMode, setRecycleMode] = useState(false);
    const [recycleSelected, setRecycleSelected] = useState(new Set());
    const [debugOpen, setDebugOpen] = useState(false);
    const [debugSelectedItem, setDebugSelectedItem] = useState(null);
    const [evacOpen, setEvacOpen] = useState(false);
    const [effectsOpen, setEffectsOpen] = useState(true);

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    // Compute bonus item IDs as a Set (stable reference via useMemo)
    // Map of item ID → bonus value
    const bonusItemMap = React.useMemo(
        () => new Map(state.bonusItems?.map(b => [b.id, b.bonusValue || 2]) || []),
        [state.bonusItems]
    );

    const normalEvacWait = Math.max(1, 3 - (state.fastPassCount ?? 0));

    const {
        expeditionNumber, expeditionScores, totalScore, expeditionConfig, bonusItems,
        turnNumber, gold, phase,
        drawCount, totalDrawCount, refreshCount, wallDrawLimit, drawLimitReached,
        currentWallColor, currentWallFunction,
        canUnlockWall, refreshWallCandidates, getDoomDraws,
        matrix, wallCandidates, lastDrawResult, currentWallType, lastDrawDirection,
        hp, doomGrid, dangerCount, maxDangerCount,
        isDoomResolving, doomAnimState, doomResolutionResult,
        inventory, maxInventorySize, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        drawAnimState, isDrawAnimating,
        startGame, selectRow, selectColumn, endTurn, continueToNextTurn, selectWall,
        handleEvacuate, handleDrawEvacuate, handleGoldEvacuate, handleNormalEvacuate, handleEmergencyEvacuate,
        evacuationCountdown,
        acquiredLongTerms, acquiredPersistents, shieldCount, fastPassCount,
        safetyNetCount, emergencyEvacMode, emergencyEvacProtected,
        toggleEmergencyEvacItem, confirmEmergencyEvacuate, cancelEmergencyEvacuate,
        pawnshopMode, pawnshopSelected, startPawnshop, togglePawnshopItem, confirmPawnshop, cancelPawnshop,
        useClinic, clinicUsed, useBlackmarket, blackmarketSold, blackmarketStock,
        shopStock, buyShopItem,
        handleReset, startNextExpedition,
        tickDoomResolution, completeDoomResolution,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        bulletinBoard, activeOrders,
        acceptOrder, refreshBulletin, submitOrder, canSubmitOrder,
        incomingOrder, confirmIncomingOrder, discardIncomingOrder, replaceBulletinOrder,
        pendingAcceptOrder, confirmReplaceOrder, cancelReplaceOrder,
    } = state;

    // --- Doom animation interval ---
    useEffect(() => {
        if (!doomAnimState) return;
        if (doomAnimState.phase === 'spinning') {
            const progress = doomAnimState.tick / doomAnimState.totalTicks;
            const interval = 40 + progress * 80;
            const timer = setTimeout(tickDoomResolution, interval);
            return () => clearTimeout(timer);
        }
        if (doomAnimState.phase === 'settled') {
            const timer = setTimeout(completeDoomResolution, 600);
            return () => clearTimeout(timer);
        }
    }, [doomAnimState]);

    // --- Draw scanning animation interval ---
    useEffect(() => {
        if (!drawAnimState) return;
        if (drawAnimState.phase === 'scanning') {
            const progress = drawAnimState.tick / drawAnimState.totalTicks;
            // Ease out: fast at start, slow near end
            const interval = 50 + progress * progress * 200;
            const timer = setTimeout(tickDrawAnim, interval);
            return () => clearTimeout(timer);
        }
        if (drawAnimState.phase === 'settled') {
            // Brief pause on result, then auto-complete
            const timer = setTimeout(completeDrawAnim, 300);
            return () => clearTimeout(timer);
        }
    }, [drawAnimState]);

    // --- Flying item cleanup ---
    useEffect(() => {
        if (!flyingItem) return;
        const timer = setTimeout(() => setFlyingItem(null), 550);
        return () => clearTimeout(timer);
    }, [flyingItem]);

    // --- Doom grid cell style (with animation highlights) ---
    const getDoomCellClass = (cell, cellIndex) => {
        const level = cell.level || 0;
        const base = cell.type === 'danger'
            ? (level >= 2 ? 'bg-red-300 border-red-600 text-red-900 font-bold'
                : level >= 1 ? 'bg-red-200 border-red-500 text-red-800 font-bold'
                : 'bg-red-100 border-red-300 text-red-600 font-bold')
            : 'bg-gray-50 border-gray-200 text-gray-300';

        if (!doomAnimState) return base;

        // Count how many cursors are on this cell
        const cursorCount = doomAnimState.spinningPositions.filter(p => p === cellIndex).length;
        if (cursorCount === 0) return base;

        if (doomAnimState.phase === 'spinning') {
            return `${base} ring-2 ring-yellow-400 scale-110 z-10 transition-all duration-75`;
        }
        // Settled — check result
        const isHit = doomAnimState.finalSelections.some(s => s.index === cellIndex && s.isHit);
        if (isHit) {
            return 'bg-red-200 border-red-500 text-red-700 font-bold ring-3 ring-red-400 scale-125 z-10 transition-all duration-300';
        }
        return 'bg-green-200 border-green-500 text-green-700 font-bold ring-3 ring-green-400 scale-125 z-10 transition-all duration-300';
    };

    // --- Cursor count bubble on doom cells ---
    const getDoomCellCursors = (cellIndex) => {
        if (!doomAnimState) return 0;
        return doomAnimState.spinningPositions.filter(p => p === cellIndex).length;
    };

    // --- Compute fly animation position ---
    const flyStyle = (() => {
        if (!flyingItem) return null;
        // Approximate cell position from grid layout
        const cellEl = document.querySelector(`[data-cell="${flyingItem.rowIndex}-${flyingItem.colIndex}"]`);
        const invEl = inventoryRef.current;
        if (!cellEl || !invEl) return null;
        const cellRect = cellEl.getBoundingClientRect();
        const invRect = invEl.getBoundingClientRect();
        return {
            '--fly-dx': `${invRect.left + invRect.width / 2 - (cellRect.left + cellRect.width / 2)}px`,
            '--fly-dy': `${invRect.top + 20 - (cellRect.top + cellRect.height / 2)}px`,
            position: 'fixed',
            left: cellRect.left + cellRect.width / 2,
            top: cellRect.top + cellRect.height / 2,
            zIndex: 300,
            pointerEvents: 'none',
        };
    })();

    return (
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-4 bg-white rounded-xl shadow-md border border-gray-200">
                    {/* Row 1: Title + Progress */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                        <h1 className="text-base font-black tracking-tight">{t('幸运之墙')}</h1>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                                {t('场次')} {expeditionNumber}/{expeditionConfig.expeditionCount}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                                {t('回合')} {turnNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                                ⭐ {totalScore}/{expeditionConfig.scoreToWin}
                            </span>
                            <button onClick={toggleLanguage} className="text-[11px] font-bold ml-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
                            <button onClick={handleReset} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-500 border border-red-200 hover:bg-red-200 transition-colors">{t('重置')}</button>
                            <button onClick={() => setDebugOpen(prev => !prev)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
                        </div>
                    </div>
                    {/* Row 2: Resources */}
                    <div className="flex items-center gap-4 px-4 py-2">
                        <GameTooltip icon="❤️" title={t('生命值')} text={t('归零时撤离失败，失去全部物品')}>
                            <span className="text-sm font-black text-rose-600">❤️ {hp}</span>
                        </GameTooltip>
                        <GameTooltip icon="💰" title={t('金币')} text={t('用于解锁墙、解锁订单')}>
                            <span className="text-sm font-black text-amber-600">💰 {gold}</span>
                        </GameTooltip>
                        <GameTooltip icon="🛡️" title={t('护盾')} text={t('抵消厄运格效果，当前') + ` ${shieldCount} ` + t('次')}>
                            <span className="text-sm font-black text-violet-600">🛡️ {shieldCount}</span>
                        </GameTooltip>
                    </div>
                    {/* Row 3: Doom Timeline — centered */}
                    {turnNumber > 0 && (
                        <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 border-t border-gray-100">
                            <span className="text-[10px] text-gray-400 font-bold mr-1">☠ {t('厄运预报')}</span>
                            {[0, 1, 2, 3, 4].map(offset => {
                                const tn = turnNumber + offset;
                                const isCurrent = offset === 0;
                                const events = getDoomTurnEvents(tn);
                                const resEntry = DOOM_RESOLUTION_DRAWS.find(e => tn >= e.turnRange[0] && tn <= e.turnRange[1]);
                                const draws = resEntry?.draws || 3;
                                // Markers
                                const markers = [];
                                if (events.accumulate) markers.push('☠');
                                if (events.resolve) markers.push('🎲');
                                const hasThreat = events.accumulate || events.resolve;
                                const bgColor = hasThreat
                                    ? 'bg-red-100 border-red-400 text-red-700'
                                    : 'bg-gray-100 border-gray-300 text-gray-500';
                                // Tooltip — only actual events
                                const tooltipLines = [];
                                if (events.accumulate) tooltipLines.push(language === 'zh' ? '☠ 厄运+1' : '☠ Doom +1');
                                if (events.resolve) tooltipLines.push((language === 'zh' ? '🎲 自动结算 ×' : '🎲 Auto resolve ×') + draws);

                                return tooltipLines.length > 0 ? (
                                    <GameTooltip key={tn} icon="☠" title={`${language === 'zh' ? '回合' : 'Turn'} ${tn}`} text={tooltipLines.join('\n')}>
                                        <div className={`w-8 h-8 rounded-md border-2 flex flex-col items-center justify-center text-[9px] font-bold transition-all ${bgColor} ${
                                            isCurrent ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-60'
                                        }`}>
                                            <span className="leading-none">{tn}</span>
                                            <span className="leading-none text-[8px]">{markers.join('')}</span>
                                        </div>
                                    </GameTooltip>
                                ) : (
                                    <div key={tn} className={`w-8 h-8 rounded-md border-2 flex items-center justify-center text-[9px] font-bold transition-all ${bgColor} ${
                                        isCurrent ? 'ring-2 ring-offset-1 ring-slate-500 scale-110' : 'opacity-60'
                                    }`}>
                                        <span>{tn}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('幸运之墙')}</h2>
                        <p className="text-gray-500 mb-2">{t('回合制原型')} v3</p>
                        {expeditionNumber > 0 && (
                            <p className="text-sm text-gray-400 mb-4">{t('累计')}: {totalScore} {t('分')}</p>
                        )}
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始第')} {expeditionNumber + 1} {t('场')}
                        </button>
                    </div>
                )}

                {/* Gameplay phases — single persistent sidebar layout */}
                {(phase === 'wall_choice' || phase === 'drawing' || phase === 'between_turns') && (
                    <div className="flex gap-4">
                        {/* LEFT SIDEBAR */}
                        <div className="w-60 flex-shrink-0 flex flex-col gap-4 self-start" ref={bulletinRef}>
                            {bulletinBoard && (
                                <BulletinBoard
                                    orders={bulletinBoard}
                                    onAccept={acceptOrder}
                                    onRefresh={refreshBulletin}
                                    gold={gold}
                                    bonusItemMap={bonusItemMap}
                                />
                            )}
                            {activeOrders && (
                                <ActiveOrders
                                    orders={activeOrders}
                                    inventory={inventory}
                                    onSubmit={submitOrder}
                                    canSubmitOrder={canSubmitOrder}
                                    pendingAcceptOrder={pendingAcceptOrder}
                                    onConfirmReplace={confirmReplaceOrder}
                                    onCancelReplace={cancelReplaceOrder}
                                    hoveredStickerIds={hoveredStickerIds}
                                    bonusItemMap={bonusItemMap}
                                />
                            )}

                            {/* Evacuation — collapsible */}
                            {phase === 'drawing' && (
                                <div className="bg-white rounded-lg shadow-sm border">
                                    <button onClick={() => setEvacOpen(o => !o)}
                                        className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('撤离')}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-500">
                                                📦 {inventory.filter(i => i.isOutOfGame).reduce((s, i) => s + i.score, 0)} {t('分')}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{evacOpen ? '▲' : '▼'}</span>
                                        </div>
                                    </button>
                                    {evacOpen && (
                                        <div className="p-2">
                                            {/* 🚪 cell evacuation offer */}
                                            {lastDrawResult?.isEvacuationOffer && !isDoomResolving && !isDrawAnimating && (
                                                <div className="mb-2 p-2 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                                                    <span className="text-xs font-bold text-emerald-700">🚪 {t('撤离机会')}</span>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={handleEvacuate}
                                                            className="px-3 py-1 bg-emerald-500 text-white rounded-md text-[11px] font-bold hover:bg-emerald-600 transition-colors">
                                                            {t('撤离')}
                                                        </button>
                                                        <button onClick={() => {}}
                                                            className="px-3 py-1 bg-gray-200 text-gray-500 rounded-md text-[11px] font-bold hover:bg-gray-300 transition-colors">
                                                            {t('继续')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Countdown banner */}
                                            {evacuationCountdown > 0 && (
                                                <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-center">
                                                    <span className="text-xs font-bold text-amber-600">
                                                        ⏳ {t('普通撤离倒计时')} {evacuationCountdown} {t('回合')}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Emergency evac picker prompt */}
                                            {emergencyEvacMode && (
                                                <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded-lg">
                                                    <p className="text-[11px] font-bold text-red-700 mb-1.5 leading-snug">
                                                        🛟 {t('安全网')}: {t('选择保护物品')} ({emergencyEvacProtected.size}/{safetyNetCount})
                                                    </p>
                                                    <p className="text-[10px] text-red-500 mb-2 leading-snug">{t('未选物品将随机失去一半')}</p>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={confirmEmergencyEvacuate}
                                                            className="flex-1 px-2 py-1 bg-red-500 text-white rounded-md text-[11px] font-bold hover:bg-red-600 transition-colors">
                                                            {t('确认撤离')}
                                                        </button>
                                                        <button onClick={cancelEmergencyEvacuate}
                                                            className="flex-1 px-2 py-1 bg-gray-200 text-gray-600 rounded-md text-[11px] font-bold hover:bg-gray-300 transition-colors">
                                                            {t('取消')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Evacuation buttons: 普通 → 金币 → 紧急 */}
                                            {evacuationCountdown <= 0 && (
                                                <div className="flex gap-2">
                                                    <GameTooltip icon="🕐" title={t('普通撤离')} text={
                                                        fastPassCount > 0
                                                            ? `${normalEvacWait} ${t('回合后自动撤离，不可取消')} (⏩ ×${fastPassCount})`
                                                            : t('3回合后自动撤离，不可取消')
                                                    }>
                                                        <button onClick={handleNormalEvacuate}
                                                            disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0}
                                                            className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex flex-col items-center leading-tight ${
                                                                !isDoomResolving && !isDrawAnimating
                                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}>
                                                            <span className="text-[11px] font-bold">{t('普通撤离')}</span>
                                                            <span className="text-[9px] font-semibold opacity-90">
                                                                {normalEvacWait}{t('回合')}
                                                                {fastPassCount > 0 && <span className="ml-0.5">⏩</span>}
                                                            </span>
                                                        </button>
                                                    </GameTooltip>
                                                    <GameTooltip icon="💰" title={t('金币撤离')} text={t('立即撤离，花费12金币')}>
                                                        <button onClick={handleGoldEvacuate}
                                                            disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0 || gold < 12}
                                                            className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex flex-col items-center leading-tight ${
                                                                gold >= 12 && !isDoomResolving && !isDrawAnimating
                                                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}>
                                                            <span className="text-[11px] font-bold">{t('金币撤离')}</span>
                                                            <span className="text-[9px] font-semibold opacity-90">-12💰</span>
                                                        </button>
                                                    </GameTooltip>
                                                    <GameTooltip icon="⚠️" title={t('紧急撤离')} text={
                                                        safetyNetCount > 0
                                                            ? `${t('立即撤离，随机失去一半物品')} (🛟 ${t('安全网')} ×${safetyNetCount}: ${t('可保护')} ${safetyNetCount} ${t('个物品')})`
                                                            : t('立即撤离，随机失去一半物品')
                                                    }>
                                                        <button onClick={handleEmergencyEvacuate}
                                                            disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0 || emergencyEvacMode}
                                                            className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex flex-col items-center leading-tight ${
                                                                !isDoomResolving && !isDrawAnimating && !emergencyEvacMode
                                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}>
                                                            <span className="text-[11px] font-bold">{t('紧急撤离')}</span>
                                                            <span className="text-[9px] font-semibold opacity-90">
                                                                {safetyNetCount > 0 ? <>-1/2 <span className="ml-0.5">🛟×{safetyNetCount}</span></> : <>-1/2</>}
                                                            </span>
                                                        </button>
                                                    </GameTooltip>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CENTER — changes by phase */}
                        <div className="flex-1 min-w-0">
                            {/* Incoming order phase */}
                            {phase === 'incoming_order' && incomingOrder && (
                                <div className="flex justify-center py-8">
                                    <div className="bg-white rounded-xl shadow-lg border-2 border-blue-300 p-6 max-w-sm text-center self-start">
                                        <h2 className="text-base font-bold mb-1">{t('新订单')}</h2>
                                        <p className="text-[11px] text-gray-400 mb-4">{t('选择是否加入公告牌')}</p>
                                        <div className="flex items-center justify-center gap-2 mb-4">
                                            {incomingOrder.rewards.map((r, i) => {
                                                const sc = SCORE_STYLE[r.score] || SCORE_STYLE[1];
                                                return (
                                                    <div key={i} className={`relative w-14 h-14 rounded-lg border-2 ${sc.border} bg-gradient-to-b ${sc.bg} flex items-center justify-center text-2xl shadow-sm`}>
                                                        {r.icon}
                                                        <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow`}>+{r.score}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="text-[11px] text-gray-400 mb-3">
                                            <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                                                incomingOrder.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                incomingOrder.difficulty === 'medium' ? 'bg-blue-100 text-blue-700' :
                                                incomingOrder.difficulty === 'hard' ? 'bg-purple-100 text-purple-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{t(incomingOrder.difficulty)}</span>
                                        </div>
                                        {bulletinBoard.length < 5 ? (
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={confirmIncomingOrder}
                                                    className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors">
                                                    {t('加入公告牌')}
                                                </button>
                                                <button onClick={discardIncomingOrder}
                                                    className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">
                                                    {t('放弃')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs text-amber-600 mb-3">{t('公告牌已满，选择一个替换')}</p>
                                                <div className="flex flex-wrap gap-2 mb-3 text-left">
                                                    {bulletinBoard.map(order => {
                                                        const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                                                        return (
                                                            <button key={order.id} onClick={() => replaceBulletinOrder(order.id)}
                                                                className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-400 transition-colors text-left">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <span className="text-[9px] text-gray-300">{t('难度')}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>{t(order.difficulty)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">{t('奖励')}</span>
                                                                    {order.rewards.map((r, i) => (
                                                                        <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                                                                    ))}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button onClick={discardIncomingOrder}
                                                    className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">
                                                    {t('放弃')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Wall choice phase */}
                            {phase === 'wall_choice' && wallCandidates && (
                                <WallPicker
                                    candidates={wallCandidates}
                                    onSelect={selectWall}
                                    onRefresh={refreshWallCandidates}
                                    refreshCount={refreshCount}
                                    drawCount={drawCount}
                                    gold={gold}
                                    disabled={isDoomResolving || isDrawAnimating}
                                />
                            )}

                            {/* Drawing phase */}
                            {phase === 'drawing' && matrix && (
                                <div className="flex flex-col items-center">
                                    {/* Candidate walls shown above grid during drawing */}
                                    {wallCandidates && (
                                        <WallPicker
                                            candidates={wallCandidates}
                                            onSelect={selectWall}
                                            onRefresh={refreshWallCandidates}
                                            refreshCount={refreshCount}
                                            drawCount={drawCount}
                                            gold={gold}
                                            compact
                                            disabled={isDoomResolving || isDrawAnimating}
                                        />
                                    )}
                                    {/* Current wall info (left) + Grid (right) */}
                                    <div className="flex items-start gap-4">
                                        {/* Left: wall info panel */}
                                        {currentWallColor && (
                                            <div className="w-44 flex-shrink-0 flex flex-col gap-2">
                                                {/* Wall name */}
                                                <div className={`px-3 py-2 rounded-lg border-2 ${
                                                    currentWallFunction
                                                        ? ({ brown: 'bg-[#ead8bf] border-[#8b5a2b]', yellow: 'bg-yellow-50 border-yellow-400', green: 'bg-emerald-50 border-emerald-400', red: 'bg-red-50 border-red-400', blue: 'bg-blue-50 border-blue-400' }[currentWallColor.id] || 'bg-gray-50 border-gray-300')
                                                        : 'bg-gray-50 border-gray-300'
                                                }`}>
                                                    <div className="text-sm font-black mb-0.5">{currentWallFunction ? currentWallColor.icon : '🧱'} {currentWallFunction ? t(currentWallFunction.name) : t('普通奖品墙')}</div>
                                                    {currentWallFunction?.desc && (
                                                        <div className="text-[10px] text-gray-500 font-medium leading-snug">{t(currentWallFunction.desc)}</div>
                                                    )}
                                                </div>
                                                {/* Draw count */}
                                                <div className={`px-3 py-1.5 rounded-lg border text-center ${drawLimitReached ? 'bg-red-50 border-red-300 text-red-500' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                                    <div className="text-[10px] font-medium opacity-70">{t('剩余抽取')}</div>
                                                    <div className="text-sm font-bold">🎯 {Math.max(0, wallDrawLimit - drawCount)} / {wallDrawLimit}</div>
                                                    {drawLimitReached && <div className="text-[10px] text-red-400 font-medium">{t('已达上限')}</div>}
                                                </div>
                                                {/* Wall function panel */}
                                                <WallFunctionPanel
                                                    wallFunction={currentWallFunction}
                                                    gold={gold} hp={hp} inventory={inventory}
                                                    pawnshopMode={pawnshopMode} pawnshopSelected={pawnshopSelected}
                                                    startPawnshop={startPawnshop} togglePawnshopItem={togglePawnshopItem}
                                                    confirmPawnshop={confirmPawnshop} cancelPawnshop={cancelPawnshop}
                                                    useClinic={useClinic} clinicUsed={clinicUsed}
                                                    useBlackmarket={useBlackmarket} blackmarketSold={blackmarketSold} blackmarketStock={blackmarketStock}
                                                    shopStock={shopStock} buyShopItem={buyShopItem}
                                                />
                                            </div>
                                        )}
                                        {/* Right: grid */}
                                        <ResourceMatrix
                                            matrix={matrix}
                                            onSelectRow={selectRow}
                                            onSelectColumn={selectColumn}
                                            phase={phase}
                                            disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0 || drawLimitReached}
                                            drawAnimState={drawAnimState}
                                            wallType={currentWallType}
                                            lastDrawDirection={lastDrawDirection}
                                            onHoverStickerIds={setHoveredStickerIds}
                                            bonusItemMap={bonusItemMap}
                                        />
                                    </div>

                                    {/* Draw result feedback */}
                                    {lastDrawResult && !isDoomResolving && !isDrawAnimating && (
                                        <div className={`mt-3 p-2 rounded text-sm ${
                                            lastDrawResult.obtained
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {lastDrawResult.obtained
                                                ? `${t('获得')}: ${lastDrawResult.obtained.item.icon} ${t(lastDrawResult.obtained.item.name)}`
                                                : t('未获得物品')
                                            }
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* Between turns */}
                            {phase === 'between_turns' && (
                                <div className="text-center py-8">
                                    <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                                    <p className="text-gray-500 mb-2">
                                        {t('背包')}: {inventory.length}/{maxInventorySize} | HP: {hp}
                                    </p>
                                    <p className="text-gray-400 text-sm mb-6">
                                        {t('抽取次数')}: {drawCount} | 💀 ×{getDoomDraws(turnNumber)}
                                    </p>

                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={continueToNextTurn}
                                            className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                                        >
                                            {t('继续下一回合')}
                                        </button>
                                        <button
                                            onClick={handleEvacuate}
                                            className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                                        >
                                            {t('撤离')}（{inventory.filter(i => i.isOutOfGame).reduce((s, i) => s + i.score, 0)} {t('分')}）
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-4 self-start">
                            <ScoreBoard
                                expeditionNumber={expeditionNumber}
                                expeditionScores={expeditionScores}
                                totalScore={totalScore}
                                victoryScore={expeditionConfig.scoreToWin}
                                bonusItems={bonusItems}
                            />

                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('厄运')}</h3>
                                    <span className="text-[11px] font-bold text-red-500">{t('抽取')} ×{getDoomDraws(turnNumber)}</span>
                                </div>
                                <div className="p-2">
                                    <div className="grid grid-cols-5 gap-1">
                                        {doomGrid.map((cell, i) => {
                                            const cursors = getDoomCellCursors(i);
                                            const level = cell.level || 0;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`w-10 h-10 rounded flex items-center justify-center text-sm border relative
                                                        ${getDoomCellClass(cell, i)}`}
                                                >
                                                    {cell.type === 'danger' ? '☠' : '·'}
                                                    {cell.type === 'danger' && level > 0 && (
                                                        <span className="absolute -bottom-1 -right-1 bg-red-700 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white leading-none">
                                                            {level + 1}
                                                        </span>
                                                    )}
                                                    {cursors > 0 && (
                                                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                            {cursors}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-1.5 text-[10px] text-gray-300">
                                        <span>{t('危险')} {dangerCount}/{maxDangerCount}</span>
                                        <span>{t('抽取')} ×{getDoomDraws(turnNumber)}</span>
                                    </div>

                                    {/* Doom animation result + confirm */}
                                    {doomAnimState?.phase === 'settled' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                {doomAnimState.finalSelections.map((s, i) => (
                                                    <span key={i} className={`text-lg ${s.isHit ? 'animate-bounce' : ''}`}>
                                                        {s.isHit ? '💀' : '✅'}
                                                    </span>
                                                ))}
                                                {doomAnimState.hpLoss > 0 && (
                                                    <span className="text-red-500 font-bold text-xs ml-1">-{doomAnimState.hpLoss} HP</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Acquired Effects */}
                            {(acquiredLongTerms.length > 0 || acquiredPersistents.length > 0 || fastPassCount > 0 || safetyNetCount > 0) && (
                                <div className="bg-white rounded-lg shadow-sm border">
                                    <button onClick={() => setEffectsOpen(o => !o)}
                                        className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('已获得效果')}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 font-medium">{acquiredLongTerms.length + acquiredPersistents.length + (fastPassCount > 0 ? 1 : 0) + (safetyNetCount > 0 ? 1 : 0)}</span>
                                            <span className="text-[10px] text-gray-400">{effectsOpen ? '▲' : '▼'}</span>
                                        </div>
                                    </button>
                                    {effectsOpen && (
                                        <div className="p-2 flex flex-col gap-1">
                                            {acquiredLongTerms.map(fn => (
                                                <div key={fn.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                                                    <span className="text-xs">🏪</span>
                                                    <span className="text-[11px] font-bold text-amber-700">{t(fn.name)}</span>
                                                    <span className="text-[9px] text-amber-500 truncate">{t(fn.desc)}</span>
                                                </div>
                                            ))}
                                            {acquiredPersistents.map(fn => (
                                                <div key={fn.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200">
                                                    <span className="text-xs">✨</span>
                                                    <span className="text-[11px] font-bold text-indigo-700">{t(fn.name)}</span>
                                                    <span className="text-[9px] text-indigo-500 truncate">{t(fn.desc)}</span>
                                                </div>
                                            ))}
                                            {fastPassCount > 0 && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200">
                                                    <span className="text-xs">⏩</span>
                                                    <span className="text-[11px] font-bold text-emerald-700">
                                                        {t('快速通道')}
                                                        {fastPassCount > 1 && <span className="ml-1 text-emerald-500">×{fastPassCount}</span>}
                                                    </span>
                                                    <span className="text-[9px] text-emerald-500 truncate">{t('普通撤离等待')} {normalEvacWait}{t('回合')}</span>
                                                </div>
                                            )}
                                            {safetyNetCount > 0 && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 border border-rose-200">
                                                    <span className="text-xs">🛟</span>
                                                    <span className="text-[11px] font-bold text-rose-700">
                                                        {t('安全网')}
                                                        <span className="ml-1 text-rose-500">×{safetyNetCount}</span>
                                                    </span>
                                                    <span className="text-[9px] text-rose-500 truncate">{t('紧急撤离可保护')} {safetyNetCount} {t('个物品')}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inventory */}
                            <div ref={inventoryRef} className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('背包')}</h3>
                                    <span className="text-[10px] text-gray-300 font-medium">{inventory.length}/{maxInventorySize}</span>
                                </div>
                                <div className="p-2">
                                    {/* Recycle card — always visible */}
                                    {recycleMode ? (
                                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-[11px] text-red-600 mb-1.5">{t('点击选择要回收的物品')}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    if (recycleSelected.size > 0) {
                                                        discardInventoryItem([...recycleSelected]);
                                                    }
                                                    setRecycleMode(false); setRecycleSelected(new Set());
                                                }}
                                                    disabled={recycleSelected.size === 0}
                                                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${recycleSelected.size > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                                    {t('确认回收')} {recycleSelected.size > 0 && `(${recycleSelected.size})`}
                                                </button>
                                                <button onClick={() => { setRecycleMode(false); setRecycleSelected(new Set()); }}
                                                    className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">{t('取消')}</button>
                                            </div>
                                        </div>
                                    ) : !pendingItem && (
                                        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                            <span className="text-[11px] text-gray-400">{t('回收不需要的物品')}</span>
                                            <button onClick={() => { setRecycleMode(true); setRecycleSelected(new Set()); }}
                                                className="text-[10px] px-2 py-1 rounded-md font-bold text-gray-500 bg-gray-200 hover:bg-red-100 hover:text-red-500 transition-colors">{t('回收')}</button>
                                        </div>
                                    )}
                                    {/* Pending items queue */}
                                    {pendingItems.length > 0 && !recycleMode && (
                                        <div className="mb-2 p-2 bg-amber-50 border-2 border-amber-300 rounded-lg">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[11px] font-bold text-amber-700">{t('待处理物品')}</span>
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-200 px-1.5 py-0.5 rounded-full">{pendingItems.length}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {pendingItems.map((pItem, idx) => {
                                                    const pSc = pItem.isOutOfGame ? (SCORE_STYLE[pItem.score] || SCORE_STYLE[1]) : null;
                                                    return (
                                                        <div key={pItem.uid || idx} className={`relative w-9 h-9 rounded border-2 flex items-center justify-center text-lg shadow-sm
                                                            ${idx === 0 ? 'ring-2 ring-amber-400' : 'opacity-60'}
                                                            ${pSc ? `${pSc.border} bg-gradient-to-b ${pSc.bg}` : 'border-gray-300 bg-white'}`}>
                                                            {pItem.icon}
                                                            {pSc && <span className={`absolute -bottom-1 -right-1 ${pSc.badge} text-white text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center shadow`}>{pItem.score}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-amber-600 mb-1.5">{t('背包已满，点击下方物品替换')}</p>
                                            <button onClick={discardPendingItem} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">{t('丢弃当前物品')}</button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-5 gap-1">
                                        {Array.from({ length: maxInventorySize }).map((_, i) => {
                                            const item = inventory[i];
                                            const canReplace = pendingItem && item && !recycleMode && !pawnshopMode && !emergencyEvacMode;
                                            const isRecycleSelected = recycleMode && recycleSelected.has(i);
                                            const isPawnshopSelected = pawnshopMode && pawnshopSelected.has(i);
                                            const isPawnshopEligible = pawnshopMode && item?.isSticker;
                                            const isEvacProtected = emergencyEvacMode && emergencyEvacProtected.has(i);
                                            const isEvacEligible = emergencyEvacMode && item;
                                            const sc = item?.isOutOfGame ? (SCORE_STYLE[item.score] || SCORE_STYLE[1]) : null;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (emergencyEvacMode && item) {
                                                            toggleEmergencyEvacItem(i);
                                                        } else if (pawnshopMode && item?.isSticker) {
                                                            togglePawnshopItem(i);
                                                        } else if (recycleMode && item) {
                                                            setRecycleSelected(prev => {
                                                                const next = new Set(prev);
                                                                next.has(i) ? next.delete(i) : next.add(i);
                                                                return next;
                                                            });
                                                        } else if (canReplace) {
                                                            replaceInventoryItem(i);
                                                        }
                                                    }}
                                                    className={`w-10 h-10 rounded flex items-center justify-center text-lg border-2 relative transition-all duration-150
                                                        ${isEvacProtected ? 'bg-emerald-100 border-emerald-500 scale-95 ring-2 ring-emerald-400'
                                                            : isPawnshopSelected ? 'bg-amber-200 border-amber-500 scale-95 ring-2 ring-amber-400'
                                                            : isRecycleSelected ? 'bg-red-100 border-red-400 scale-95 opacity-60'
                                                            : !item ? 'bg-gray-50 border-gray-200'
                                                            : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}`
                                                            : 'bg-white border-gray-300'}
                                                        ${isEvacEligible && !isEvacProtected ? 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50'
                                                            : isPawnshopEligible && !isPawnshopSelected ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50'
                                                            : canReplace ? 'cursor-pointer hover:bg-red-50 hover:border-red-400 hover:scale-110'
                                                            : recycleMode && item ? 'cursor-pointer hover:border-red-400' : ''}`}
                                                    title={item ? t(item.name) : ''}
                                                >
                                                    {item ? item.icon : ''}
                                                    {sc && (
                                                        <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>
                                                            {item.score}
                                                        </span>
                                                    )}
                                                    {item?.isOutOfGame && bonusItemMap.has(item.id) && (
                                                        <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusItemMap.get(item.id)}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Game over / Evacuated */}
                {phase === 'game_over' && (
                    <div className="text-center py-12">
                        {modalContent === 'evacuated' ? (
                            <h2 className="text-xl font-bold mb-4">{t('安全撤离')}</h2>
                        ) : modalContent === 'emergency_evacuated' ? (
                            <>
                                <h2 className="text-xl font-bold mb-2 text-amber-600">⚠️ {t('紧急撤离')}</h2>
                                <p className="text-amber-500 mb-4">{t('失去了一半物品')}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold mb-2 text-red-600">{t('游戏结束')}</h2>
                                <p className="text-red-500 mb-4">{t('失去了全部物品，本场得 0 分')}</p>
                            </>
                        )}

                        {/* All expedition results — item showcase */}
                        <div className="inline-block mb-6 text-left">
                            {expeditionScores.map((exp, i) => (
                                <div key={i} className="mb-4">
                                    <div className="text-xs text-gray-500 font-bold mb-2">
                                        {t('第')} {i + 1} {t('场')} — {exp.score} {t('分')}
                                    </div>
                                    {exp.items.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {exp.items.map((item, j) => {
                                                const sc = SCORE_STYLE[item.score] || SCORE_STYLE[1];
                                                return (
                                                    <div key={j} className="relative flex flex-col items-center">
                                                        <div className={`w-14 h-14 rounded-lg border-2 ${sc.border} bg-gradient-to-b ${sc.bg} shadow-sm flex items-center justify-center text-2xl`}>
                                                            {item.icon}
                                                        </div>
                                                        <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow`}>
                                                            +{item.score}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[56px] text-center">{t(item.name)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            {t('累计')}: {totalScore} / {expeditionConfig.scoreToWin} {t('分')}
                        </p>

                        {expeditionNumber < expeditionConfig.expeditionCount ? (
                            <button onClick={() => { startNextExpedition(); }}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('开始第')} {expeditionNumber + 1} {t('场')}
                            </button>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">
                                    {totalScore >= expeditionConfig.scoreToWin ? `🎉 ${t('胜利')}!` : t('挑战失败')}
                                </h2>
                                <p className="text-gray-500 mb-6">
                                    {t('最终得分')}: {totalScore} / {expeditionConfig.scoreToWin}
                                </p>
                                <button onClick={handleReset}
                                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                                >
                                    {t('再来一局')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Doom resolution result (persistent after confirm) */}
                {doomResolutionResult && !isDoomResolving && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg">
                        <div className="text-sm">
                            💀 {t('厄运结算')}:
                            {doomResolutionResult.hits.map((hit, i) => (
                                <span key={i} className={`ml-1 ${hit.result === 'danger' ? 'text-red-400' : 'text-gray-400'}`}>
                                    {hit.result === 'danger'
                                        ? (hit.damage > 1 ? `💥×${hit.damage}` : '💥')
                                        : '·'}
                                </span>
                            ))}
                            {doomResolutionResult.hpLoss > 0 && (
                                <span className="text-red-400 ml-2">-{doomResolutionResult.hpLoss} HP</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Flying item animation */}
                {flyingItem && flyStyle && (
                    <div
                        key={flyingItem.id}
                        style={flyStyle}
                        className="fly-to-inventory w-16 h-16 rounded-xl bg-white border-2 border-gray-300 shadow-2xl flex items-center justify-center text-2xl"
                    >
                        {flyingItem.icon}
                    </div>
                )}


                {/* Debug Modal */}
                {debugOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none">
                        <div className="pointer-events-auto bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-72 mt-12">
                            <div className="px-4 py-2.5 border-b border-gray-700 flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-200">🛠 Debug</span>
                                <button onClick={() => setDebugOpen(false)} className="text-gray-500 hover:text-gray-200 text-lg leading-none">×</button>
                            </div>
                            <div className="p-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Stickers</div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {STICKER_TYPES.map(s => (
                                        <button key={s.id} onClick={() => setDebugSelectedItem({ ...s, isSticker: true })}
                                            className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-colors
                                                ${debugSelectedItem?.id === s.id && debugSelectedItem?.isSticker ? 'border-blue-400 bg-blue-900 ring-2 ring-blue-500' : 'border-gray-600 bg-gray-800 hover:border-gray-400'}`}>
                                            {s.icon}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Out-of-game Items</div>
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {OUT_OF_GAME_ITEMS.map(item => (
                                        <button key={item.id} onClick={() => setDebugSelectedItem(item)}
                                            className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-colors
                                                ${debugSelectedItem?.id === item.id && !debugSelectedItem?.isSticker ? 'border-blue-400 bg-blue-900 ring-2 ring-blue-500' : 'border-gray-600 bg-gray-800 hover:border-gray-400'}`}>
                                            {item.icon}
                                        </button>
                                    ))}
                                </div>
                                {debugSelectedItem ? (
                                    <div>
                                        <div className="text-xs text-gray-300 mb-2 text-center">
                                            {debugSelectedItem.icon} {t(debugSelectedItem.name)}
                                            {debugSelectedItem.score && <span className="text-gray-500 ml-1">({debugSelectedItem.score}pts)</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => debugAddItem(debugSelectedItem, 1)}
                                                className="flex-1 py-1.5 rounded-lg bg-green-700 text-green-100 text-xs font-bold hover:bg-green-600 transition-colors">+1</button>
                                            <button onClick={() => debugAddItem(debugSelectedItem, 5)}
                                                className="flex-1 py-1.5 rounded-lg bg-blue-700 text-blue-100 text-xs font-bold hover:bg-blue-600 transition-colors">+5</button>
                                            <button onClick={() => debugAddItem(debugSelectedItem, maxInventorySize)}
                                                className="flex-1 py-1.5 rounded-lg bg-purple-700 text-purple-100 text-xs font-bold hover:bg-purple-600 transition-colors">Fill</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-gray-600 text-center">Select an item above</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </div>
    );
};

export default GameCore;
