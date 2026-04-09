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
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from './data/v2Config';
import { Link } from 'react-router-dom';
import { GameGuide } from './components/ui/GameGuide';

const GameCore = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const inventoryRef = useRef(null);
    const bulletinRef = useRef(null);
    const [hoveredStickerIds, setHoveredStickerIds] = useState(null);
    const [recycleMode, setRecycleMode] = useState(false);
    const [recycleSelected, setRecycleSelected] = useState(new Set());
    const [debugOpen, setDebugOpen] = useState(false);
    const [debugSelectedItem, setDebugSelectedItem] = useState(null);
    const [guideOpen, setGuideOpen] = useState(false);

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    // Compute bonus item IDs as a Set (stable reference via useMemo)
    // Map of item ID → bonus value
    const bonusItemMap = React.useMemo(
        () => new Map(state.bonusItems?.map(b => [b.id, b.bonusValue || 2]) || []),
        [state.bonusItems]
    );

    const {
        expeditionNumber, expeditionScores, totalScore, expeditionConfig, bonusItems,
        turnNumber, gold, phase,
        matrix, wallCandidates, lastDrawResult, currentWallType, lastDrawDirection,
        hp, doomGrid, doomLevel, dangerCount,
        isDoomResolving, doomAnimState, doomResolutionResult,
        inventory, maxInventorySize, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        drawAnimState, isDrawAnimating, gravityDrops,
        startGame, selectRow, selectColumn, endTurn, continueToNextTurn, selectWall,
        handleEvacuate, handleReset, startNextExpedition,
        tickDoomResolution, completeDoomResolution,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        bulletinBoard, activeOrders,
        acceptOrder, submitOrder, canSubmitOrder,
        incomingOrder, confirmIncomingOrder, discardIncomingOrder, replaceBulletinOrder,
        pendingAcceptOrder, confirmReplaceOrder, cancelReplaceOrder,
        isInSubLevel, wallStack,
        enterSubLevel, exitSubLevel,
    } = state;

    // --- Doom animation interval ---
    useEffect(() => {
        if (!doomAnimState || doomAnimState.phase !== 'spinning') return;
        const progress = doomAnimState.tick / doomAnimState.totalTicks;
        const interval = 60 + progress * 120;
        const timer = setTimeout(tickDoomResolution, interval);
        return () => clearTimeout(timer);
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
        const base = cell.type === 'danger'
            ? 'bg-red-100 border-red-300 text-red-600 font-bold'
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
        <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-4 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]">
                    {/* Row 1: Title + Progress */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-kitchen-gold-border/30">
                        <h1 className="text-base font-black tracking-tight text-kitchen-text-title">🍳 {t('梦想厨房')}</h1>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-[#FFF3E0] text-kitchen-gold-deep border border-kitchen-gold-border text-[11px] font-bold">
                                {t('场次')} {expeditionNumber}/{expeditionConfig.expeditionCount}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FFF3E0] text-kitchen-gold-deep border border-kitchen-gold-border text-[11px] font-bold">
                                {t('回合')} {turnNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FFF8E0] text-kitchen-gold-deep border border-kitchen-gold-border text-[11px] font-bold">
                                ⭐ {totalScore}/{expeditionConfig.scoreToWin}
                            </span>
                            <button onClick={() => setGuideOpen(true)} className="text-[11px] font-bold ml-1 px-2 py-0.5 rounded-md bg-kitchen-card border border-kitchen-gold-border-muted shadow-[0_1px_0_#D4B896] text-kitchen-text-secondary hover:bg-[#FFF3E0] transition-colors">❓</button>
                            <button onClick={toggleLanguage} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-kitchen-card border border-kitchen-gold-border-muted shadow-[0_1px_0_#D4B896] text-kitchen-text-secondary hover:bg-[#FFF3E0] transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
                            <button onClick={handleReset} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FFF0F0] border border-kitchen-danger text-kitchen-danger-text hover:bg-red-100 transition-colors">{t('重置')}</button>
                            <button onClick={() => setDebugOpen(prev => !prev)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
                            <Link to="/editor" className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors no-underline">📐</Link>
                        </div>
                    </div>
                    {/* Row 2: In-game Resources */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <span className="bg-[#FFF0F0] border border-[#E8A0A0] px-2.5 py-1 rounded-full text-xs font-medium text-kitchen-danger-text">❤️ {hp}</span>
                        <span className="bg-[#FFF8E0] border border-[#E8C860] px-2.5 py-1 rounded-full text-xs font-medium text-[#A08020]">💰 {gold}</span>
                        <span className="bg-[#F5F0E8] border border-[#C8B898] px-2.5 py-1 rounded-full text-xs font-medium text-[#706040]">💀 Lv.{doomLevel}</span>
                        <span className="bg-[#F0FFF8] border border-kitchen-success-border px-2.5 py-1 rounded-full text-xs font-medium text-[#408060]">🎒 {inventory.length}/{maxInventorySize}</span>
                    </div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4 text-kitchen-text-title">{t('梦想厨房')}</h2>
                        <p className="text-kitchen-text-body mb-2">{t('回合制原型')} v2</p>
                        {expeditionNumber > 0 && (
                            <p className="text-sm text-kitchen-text-secondary mb-4">{t('累计')}: {totalScore} {t('分')}</p>
                        )}
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body text-lg font-bold rounded-xl shadow-[0_3px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC] transition-colors"
                        >
                            {language === 'en' ? `Start Round ${expeditionNumber + 1}` : `开始第 ${expeditionNumber + 1} 场`}
                        </button>
                    </div>
                )}

                {/* Gameplay phases — single persistent sidebar layout */}
                {(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'drawing' || phase === 'drawing_sub' || phase === 'exiting_sub' || phase === 'between_turns') && (
                    <div className="flex gap-4">
                        {/* LEFT SIDEBAR */}
                        <div className="w-60 flex-shrink-0 flex flex-col gap-4 self-start" ref={bulletinRef}>
                            {bulletinBoard && (
                                <BulletinBoard
                                    orders={bulletinBoard}
                                    onAccept={acceptOrder}
                                    incomingOrder={phase === 'incoming_order' ? null : incomingOrder}
                                    onConfirmIncoming={confirmIncomingOrder}
                                    onDiscardIncoming={discardIncomingOrder}
                                    onReplaceIncoming={replaceBulletinOrder}
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
                        </div>

                        {/* CENTER — changes by phase */}
                        <div className="flex-1 min-w-0">
                            {/* Incoming order phase */}
                            {phase === 'incoming_order' && incomingOrder && (
                                <div className="flex justify-center py-8">
                                    <div className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_4px_0_#D4B896] p-6 max-w-sm text-center self-start">
                                        <h2 className="text-base font-bold mb-1 text-kitchen-text-title">{t('新订单')}</h2>
                                        <p className="text-[11px] text-kitchen-text-body mb-4">{t('选择是否加入货架')}</p>
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
                                                    className="px-5 py-2 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body text-sm font-bold rounded-xl shadow-[0_3px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC] transition-colors">
                                                    {t('加入货架')}
                                                </button>
                                                <button onClick={discardIncomingOrder}
                                                    className="px-5 py-2 bg-[#F5F0E8] border-2 border-kitchen-gold-border-muted text-kitchen-text-secondary text-sm font-bold rounded-xl shadow-[0_2px_0_#D4B896] hover:bg-[#EDE8E0] transition-colors">
                                                    {t('放弃')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs text-amber-600 mb-3">{t('货架已满，选择一个替换')}</p>
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
                                <WallPicker candidates={wallCandidates} onSelect={selectWall} />
                            )}

                            {/* Drawing phase */}
                            {(phase === 'drawing' || phase === 'drawing_sub' || phase === 'exiting_sub') && matrix && (
                                <div className="flex flex-col items-center">
                                    {/* Parent wall preview — only visible during sub-level */}
                                    {(phase === 'drawing_sub' || phase === 'exiting_sub') && wallStack && wallStack.length > 0 && (
                                        <div className={`mb-4 pointer-events-none ${phase === 'exiting_sub' ? 'parent-restore' : 'parent-shrink'}`} style={{ overflow: 'hidden' }}>
                                            <div className="text-[9px] text-gray-400 mb-1 text-center">主关卡（暂停中）</div>
                                            <div className="transform scale-[0.5] origin-top">
                                                <ResourceMatrix
                                                    matrix={wallStack[wallStack.length - 1].matrix}
                                                    onSelectRow={() => {}}
                                                    onSelectColumn={() => {}}
                                                    gold={0}
                                                    drawCost={1}
                                                    phase="drawing"
                                                    disabled={true}
                                                    wallType={null}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className={`flex flex-col items-center ${phase === 'drawing_sub' ? 'sub-level-enter' : phase === 'exiting_sub' ? 'sub-level-exit pointer-events-none' : ''}`}>
                                        <ResourceMatrix
                                            matrix={matrix}
                                            onSelectRow={selectRow}
                                            onSelectColumn={selectColumn}
                                            gold={gold}
                                            drawCost={INITIAL_GAME_CONFIG.turn.drawCost}
                                            phase={phase}
                                            disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0}
                                            drawAnimState={drawAnimState}
                                            wallType={currentWallType}
                                            lastDrawDirection={lastDrawDirection}
                                            onHoverStickerIds={setHoveredStickerIds}
                                            bonusItemMap={bonusItemMap}
                                            gravityDrops={gravityDrops}
                                        />

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

                                        {/* End turn button */}
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={phase === 'drawing_sub' ? exitSubLevel : endTurn}
                                                disabled={isDoomResolving || isDrawAnimating || pendingItems.length > 0}
                                                className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                                                    isDoomResolving || isDrawAnimating || pendingItems.length > 0
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : phase === 'drawing_sub'
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                            : 'bg-gray-700 text-white hover:bg-gray-800'
                                                }`}
                                            >
                                                {phase === 'drawing_sub' ? t('结束事件') : t('结束回合')}
                                            </button>
                                            {gold <= 0 && !isDoomResolving && (
                                                <span className="text-sm text-gray-400 self-center">{t('金币已用完')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Between turns */}
                            {phase === 'between_turns' && (
                                <div className="text-center py-8">
                                    <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                                    <p className="text-gray-500 mb-2">
                                        {t('菜篮')}: {inventory.length}/{maxInventorySize} | HP: {hp} | 💀 Lv.{doomLevel}
                                    </p>
                                    <p className="text-gray-400 text-sm mb-6">
                                        {t('下回合将增加')} 1 {t('个危险格子')}
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
                                    <span className="text-[11px] font-bold text-red-500">Lv.{doomLevel}</span>
                                </div>
                                <div className="p-2">
                                    <div className="grid grid-cols-5 gap-1">
                                        {doomGrid.map((cell, i) => {
                                            const cursors = getDoomCellCursors(i);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`w-10 h-10 rounded flex items-center justify-center text-sm border relative
                                                        ${getDoomCellClass(cell, i)}`}
                                                >
                                                    {cell.type === 'danger' ? '☠' : '·'}
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
                                        <span>{t('危险')} {dangerCount}/{doomGrid.length}</span>
                                        <span>{t('结算')} ×{doomLevel}</span>
                                    </div>

                                    {/* Doom animation result + confirm */}
                                    {doomAnimState?.phase === 'settled' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1 mb-2">
                                                {doomAnimState.finalSelections.map((s, i) => (
                                                    <span key={i} className={`text-lg ${s.isHit ? 'animate-bounce' : ''}`}>
                                                        {s.isHit ? '💀' : '✅'}
                                                    </span>
                                                ))}
                                                {doomAnimState.hpLoss > 0 && (
                                                    <span className="text-red-500 font-bold text-xs ml-1">-{doomAnimState.hpLoss} HP</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={completeDoomResolution}
                                                className="w-full py-1.5 bg-slate-700 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors"
                                            >
                                                {t('确认')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inventory */}
                            <div ref={inventoryRef} className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('菜篮')}</h3>
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
                                            <p className="text-[11px] text-amber-600 mb-1.5">{t('菜篮已满，点击下方物品替换')}</p>
                                            <button onClick={discardPendingItem} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">{t('丢弃当前物品')}</button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-5 gap-1">
                                        {Array.from({ length: maxInventorySize }).map((_, i) => {
                                            const item = inventory[i];
                                            const canReplace = pendingItem && item && !recycleMode;
                                            const isRecycleSelected = recycleMode && recycleSelected.has(i);
                                            const sc = item?.isOutOfGame ? (SCORE_STYLE[item.score] || SCORE_STYLE[1]) : null;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (recycleMode && item) {
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
                                                        ${isRecycleSelected ? 'bg-red-100 border-red-400 scale-95 opacity-60'
                                                            : !item ? 'bg-gray-50 border-gray-200'
                                                            : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}`
                                                            : 'bg-white border-gray-300'}
                                                        ${canReplace ? 'cursor-pointer hover:bg-red-50 hover:border-red-400 hover:scale-110'
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
                    <div className="relative text-center py-12">
                        {modalContent === 'evacuated' && (
                            <div className="absolute bottom-2 right-3 font-mono text-[10px] text-kitchen-gold/40">
                                REC ● {new Date().toLocaleTimeString()}
                            </div>
                        )}
                        {modalContent === 'evacuated' ? (
                            <h2 className="text-xl font-bold mb-4">{t('安全撤离')}</h2>
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
                                        {language === 'en' ? `Round ${i + 1}` : `第 ${i + 1} 场`} — {exp.score} {t('分')}
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
                                className="px-8 py-3 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body font-bold rounded-xl shadow-[0_3px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC] transition-colors"
                            >
                                {language === 'en' ? `Start Round ${expeditionNumber + 1}` : `开始第 ${expeditionNumber + 1} 场`}
                            </button>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-kitchen-text-title">
                                    {totalScore >= expeditionConfig.scoreToWin ? `🎉 ${t('胜利')}!` : t('挑战失败')}
                                </h2>
                                <p className="text-kitchen-text-body mb-6">
                                    {t('最终得分')}: {totalScore} / {expeditionConfig.scoreToWin}
                                </p>
                                <button onClick={handleReset}
                                    className="px-8 py-3 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-kitchen-text-body font-bold rounded-xl shadow-[0_3px_0_#D4952A] hover:from-[#FFF3E0] hover:to-[#FFE8CC] transition-colors"
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
                                    {hit.result === 'danger' ? '💥' : '·'}
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

                {/* Game Guide */}
                {guideOpen && <GameGuide onClose={() => setGuideOpen(false)} />}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </div>
    );
};

export default GameCore;
