import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import WallPicker from './components/game/WallPicker';
import BulletinBoard, { SCORE_STYLE } from './components/game/BulletinBoard';
import ActiveOrders from './components/game/ActiveOrders';
import ScoreBoard from './components/game/ScoreBoard';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';

const GameCore = () => {
    const { t } = useLanguage();
    const inventoryRef = useRef(null);
    const bulletinRef = useRef(null);
    const [flyingOrder, setFlyingOrder] = useState(null); // { order, phase: 'showing'|'flying' }

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const {
        expeditionNumber, expeditionScores, totalScore, expeditionConfig, bonusItems,
        turnNumber, gold, phase,
        matrix, wallCandidates, lastDrawResult, currentWallType, lastDrawDirection,
        hp, doomGrid, doomLevel, dangerCount,
        isDoomResolving, doomAnimState, doomResolutionResult,
        inventory, maxInventorySize, pendingItem,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        drawAnimState, isDrawAnimating,
        startGame, selectRow, selectColumn, endTurn, continueToNextTurn, selectWall,
        handleEvacuate, handleReset, startNextExpedition,
        tickDoomResolution, completeDoomResolution,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardPendingItem,
        bulletinBoard, activeOrders,
        acceptOrder, submitOrder, canSubmitOrder,
        incomingOrder, confirmIncomingOrder,
        pendingAcceptOrder, confirmReplaceOrder, cancelReplaceOrder,
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

    // --- Incoming order animation: show → fly → land ---
    useEffect(() => {
        if (!incomingOrder || flyingOrder) return;
        // Start showing phase
        setFlyingOrder({ order: incomingOrder, phase: 'showing' });
        const flyTimer = setTimeout(() => {
            setFlyingOrder(prev => prev ? { ...prev, phase: 'flying' } : null);
        }, 800);
        return () => clearTimeout(flyTimer);
    }, [incomingOrder]);

    useEffect(() => {
        if (!flyingOrder || flyingOrder.phase !== 'flying') return;
        const landTimer = setTimeout(() => {
            confirmIncomingOrder();
            setFlyingOrder(null);
        }, 600);
        return () => clearTimeout(landTimer);
    }, [flyingOrder?.phase]);

    // Compute fly style for incoming order
    const orderFlyStyle = (() => {
        if (!flyingOrder || flyingOrder.phase !== 'flying') return null;
        const bulletinEl = bulletinRef.current;
        if (!bulletinEl) return null;
        const bulletinRect = bulletinEl.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        return {
            '--fly-dx': `${bulletinRect.left + bulletinRect.width / 2 - centerX}px`,
            '--fly-dy': `${bulletinRect.top + 30 - centerY}px`,
            position: 'fixed',
            left: centerX,
            top: centerY,
            zIndex: 300,
            pointerEvents: 'none',
        };
    })();

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
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold">{t('幸运之墙')} <span className="text-sm text-gray-400">— {t('回合制原型')}</span></h1>
                    <button
                        onClick={handleReset}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                        {t('重置')}
                    </button>
                </div>

                {/* Status Bar */}
                <div className="flex gap-4 mb-4 p-3 bg-white rounded-xl shadow-md border border-gray-200 text-sm font-bold">
                    <div className="text-purple-600">🎬 {t('场次')} {expeditionNumber}/{expeditionConfig.expeditionCount}</div>
                    <div className="text-orange-600">⭐ {totalScore}{t('分')}</div>
                    <div className="text-rose-600">❤️ {hp} HP</div>
                    <div className="text-amber-600">💰 {gold} {t('金币')}</div>
                    <div className="text-indigo-600">📅 {t('回合')} {turnNumber}</div>
                    <div className="text-teal-600">🎒 {inventory.length}/{maxInventorySize}</div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('幸运之墙')}</h2>
                        <p className="text-gray-500 mb-2">{t('回合制原型')} v2</p>
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

                {/* Wall choice phase */}
                {phase === 'wall_choice' && wallCandidates && (
                    <div className="flex gap-4 justify-center">
                        <div className="w-52 flex-shrink-0 flex flex-col gap-4 self-start">
                            {bulletinBoard && <BulletinBoard orders={bulletinBoard} onAccept={acceptOrder} />}
                            {activeOrders && (
                                <ActiveOrders orders={activeOrders} inventory={inventory} onSubmit={submitOrder} canSubmitOrder={canSubmitOrder}
                                    pendingAcceptOrder={pendingAcceptOrder} onConfirmReplace={confirmReplaceOrder} onCancelReplace={cancelReplaceOrder} />
                            )}
                        </div>
                        <div className="flex-1">
                            <WallPicker candidates={wallCandidates} onSelect={selectWall} />
                        </div>
                        <div className="w-64 flex-shrink-0 flex flex-col gap-4 self-start">>
                            <ScoreBoard expeditionNumber={expeditionNumber} expeditionScores={expeditionScores} totalScore={totalScore} victoryScore={expeditionConfig.scoreToWin} bonusItems={bonusItems} />
                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold">{t('厄运')}</h3>
                                    <span className="text-xs text-red-500 font-bold">💀 Lv.{doomLevel}</span>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {doomGrid.map((cell, i) => (
                                        <div key={i} className={`w-10 h-10 rounded flex items-center justify-center text-sm border ${cell.type === 'danger' ? 'bg-red-100 border-red-300 text-red-600 font-bold' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                                            {cell.type === 'danger' ? '☠' : '·'}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {t('危险')}: {dangerCount}/{doomGrid.length} | {t('结算')}: ×{doomLevel}
                                </div>
                            </div>
                            {/* Inventory */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('背包')} ({inventory.length}/{maxInventorySize})</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        const sc = item?.isOutOfGame ? (SCORE_STYLE[item.score] || SCORE_STYLE[1]) : null;
                                        return (
                                            <div key={i} className={`w-10 h-10 rounded flex items-center justify-center text-lg border-2 relative
                                                ${!item ? 'bg-gray-50 border-gray-200' : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}` : 'bg-white border-gray-300'}`}
                                                title={item ? `${item.name}${item.score ? ` (+${item.score})` : ''}` : ''}>
                                                {item ? item.icon : ''}
                                                {sc && (
                                                    <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>{item.score}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drawing phase */}
                {phase === 'drawing' && matrix && (
                    <div className="flex gap-4 justify-center">
                        {/* Left: Bulletin Board + Active Orders */}
                        <div className="w-52 flex-shrink-0 flex flex-col gap-4 self-start">
                            {bulletinBoard && (
                                <BulletinBoard
                                    orders={bulletinBoard}
                                    onAccept={acceptOrder}
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
                                />
                            )}
                        </div>

                        {/* Center: Grid */}
                        <div>
                            <ResourceMatrix
                                matrix={matrix}
                                onSelectRow={selectRow}
                                onSelectColumn={selectColumn}
                                gold={gold}
                                drawCost={INITIAL_GAME_CONFIG.turn.drawCost}
                                phase={phase}
                                disabled={isDoomResolving || isDrawAnimating}
                                drawAnimState={drawAnimState}
                                wallType={currentWallType}
                                lastDrawDirection={lastDrawDirection}
                            />

                            {/* Draw result feedback */}
                            {lastDrawResult && !isDoomResolving && !isDrawAnimating && (
                                <div className={`mt-3 p-2 rounded text-sm ${
                                    lastDrawResult.obtained
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {lastDrawResult.obtained
                                        ? `${t('获得')}: ${lastDrawResult.obtained.item.icon} ${lastDrawResult.obtained.item.name}`
                                        : t('未获得物品')
                                    }
                                </div>
                            )}

                            {/* End turn button */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={endTurn}
                                    disabled={isDoomResolving || isDrawAnimating}
                                    className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                                        isDoomResolving || isDrawAnimating
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-700 text-white hover:bg-gray-800'
                                    }`}
                                >
                                    {t('结束回合')}
                                </button>
                                {gold <= 0 && !isDoomResolving && (
                                    <span className="text-sm text-gray-400 self-center">{t('金币已用完')}</span>
                                )}
                            </div>
                        </div>

                        {/* Right: ScoreBoard + Doom Grid + Inventory */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-4 self-start">>
                            {/* ScoreBoard */}
                            <ScoreBoard
                                expeditionNumber={expeditionNumber}
                                expeditionScores={expeditionScores}
                                totalScore={totalScore}
                                victoryScore={expeditionConfig.scoreToWin} bonusItems={bonusItems}
                            />

                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold">{t('厄运')}</h3>
                                    <span className="text-xs text-red-500 font-bold">💀 Lv.{doomLevel}</span>
                                </div>
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
                                <div className="text-xs text-gray-400 mt-2">
                                    {t('危险')}: {dangerCount}/{doomGrid.length} | {t('结算')}: ×{doomLevel}
                                </div>

                                {/* Doom animation result + confirm */}
                                {doomAnimState?.phase === 'settled' && (
                                    <div className="mt-3 pt-2 border-t border-gray-200">
                                        <div className="flex items-center gap-1 mb-2">
                                            {doomAnimState.finalSelections.map((s, i) => (
                                                <span key={i} className={`text-lg ${s.isHit ? 'animate-bounce' : ''}`}>
                                                    {s.isHit ? '💀' : '✅'}
                                                </span>
                                            ))}
                                            {doomAnimState.hpLoss > 0 && (
                                                <span className="text-red-500 font-bold text-sm ml-1">-{doomAnimState.hpLoss} HP</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={completeDoomResolution}
                                            className="w-full py-1.5 bg-slate-700 text-white rounded text-sm font-bold hover:bg-slate-800 transition-colors"
                                        >
                                            {t('确认')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Inventory */}
                            <div ref={inventoryRef} className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('背包')} ({inventory.length}/{maxInventorySize})</h3>
                                {pendingItem && (
                                    <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-lg">{pendingItem.icon}</span>
                                            <span className="text-xs font-bold text-amber-700">{pendingItem.name}</span>
                                        </div>
                                        <p className="text-[11px] text-amber-600 mb-1.5">{t('背包已满，点击下方物品替换')}</p>
                                        <button
                                            onClick={discardPendingItem}
                                            className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            {t('丢弃新物品')}
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        const canReplace = pendingItem && item;
                                        const sc = item?.isOutOfGame ? (SCORE_STYLE[item.score] || SCORE_STYLE[1]) : null;
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => canReplace && replaceInventoryItem(i)}
                                                className={`w-10 h-10 rounded flex items-center justify-center text-lg border-2 relative
                                                    ${!item ? 'bg-gray-50 border-gray-200'
                                                        : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}`
                                                        : 'bg-white border-gray-300'}
                                                    ${canReplace ? 'cursor-pointer hover:bg-red-50 hover:border-red-400 hover:scale-110 transition-all duration-150' : ''}`}
                                                title={item ? `${item.name}${item.score ? ` (+${item.score})` : ''}` : ''}
                                            >
                                                {item ? item.icon : ''}
                                                {sc && (
                                                    <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>
                                                        {item.score}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Between turns */}
                {phase === 'between_turns' && (
                    <div className="flex gap-4 justify-center">
                        <div className="w-52 flex flex-col gap-4" ref={bulletinRef}>
                            {bulletinBoard && <BulletinBoard orders={bulletinBoard} onAccept={acceptOrder} />}
                            {activeOrders && (
                                <ActiveOrders orders={activeOrders} inventory={inventory} onSubmit={submitOrder} canSubmitOrder={canSubmitOrder}
                                    pendingAcceptOrder={pendingAcceptOrder} onConfirmReplace={confirmReplaceOrder} onCancelReplace={cancelReplaceOrder} />
                            )}
                        </div>
                        <div className="flex-1 text-center py-8">
                            <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                            <p className="text-gray-500 mb-2">
                                {t('背包')}: {inventory.length}/{maxInventorySize} | HP: {hp} | 💀 Lv.{doomLevel}
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
                        <div className="w-64 flex-shrink-0 flex flex-col gap-4 self-start">>
                            <ScoreBoard expeditionNumber={expeditionNumber} expeditionScores={expeditionScores} totalScore={totalScore} victoryScore={expeditionConfig.scoreToWin} bonusItems={bonusItems} />
                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold">{t('厄运')}</h3>
                                    <span className="text-xs text-red-500 font-bold">💀 Lv.{doomLevel}</span>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {doomGrid.map((cell, i) => (
                                        <div key={i} className={`w-10 h-10 rounded flex items-center justify-center text-sm border ${cell.type === 'danger' ? 'bg-red-100 border-red-300 text-red-600 font-bold' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                                            {cell.type === 'danger' ? '☠' : '·'}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {t('危险')}: {dangerCount}/{doomGrid.length} | {t('结算')}: ×{doomLevel}
                                </div>
                            </div>
                            {/* Inventory */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('背包')} ({inventory.length}/{maxInventorySize})</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        const sc = item?.isOutOfGame ? (SCORE_STYLE[item.score] || SCORE_STYLE[1]) : null;
                                        return (
                                            <div key={i} className={`w-10 h-10 rounded flex items-center justify-center text-lg border-2 relative
                                                ${!item ? 'bg-gray-50 border-gray-200' : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}` : 'bg-white border-gray-300'}`}
                                                title={item ? `${item.name}${item.score ? ` (+${item.score})` : ''}` : ''}>
                                                {item ? item.icon : ''}
                                                {sc && (
                                                    <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>{item.score}</span>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                                        <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[56px] text-center">{item.name}</span>
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

                {/* Incoming order — show in center then fly to bulletin */}
                {flyingOrder && flyingOrder.phase === 'showing' && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-xs font-bold text-center text-gray-500 mb-2">{t('新订单')}</div>
                            <div className="flex items-center gap-2">
                                {flyingOrder.order.rewards.map((r, i) => {
                                    const sc = SCORE_STYLE[r.score] || SCORE_STYLE[1];
                                    return (
                                        <div key={i} className={`relative w-12 h-12 rounded-lg border-2 ${sc.border} bg-gradient-to-b ${sc.bg} flex items-center justify-center text-xl shadow-sm`}>
                                            {r.icon}
                                            <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>{r.score}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                {flyingOrder && flyingOrder.phase === 'flying' && orderFlyStyle && (
                    <div style={orderFlyStyle} className="fly-to-bulletin bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-3 flex items-center gap-1">
                        {flyingOrder.order.rewards.map((r, i) => (
                            <span key={i} className="text-lg">{r.icon}</span>
                        ))}
                    </div>
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </div>
    );
};

export default GameCore;
