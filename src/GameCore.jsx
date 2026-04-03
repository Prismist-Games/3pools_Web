import React, { useEffect, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';

const GameCore = () => {
    const { t } = useLanguage();
    const inventoryRef = useRef(null);

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const {
        turnNumber, gold, phase,
        matrix, lastDrawResult,
        hp, doomGrid, doomLevel, dangerCount,
        isDoomResolving, doomAnimState, doomResolutionResult,
        inventory, maxInventorySize,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        drawAnimState, isDrawAnimating,
        startGame, selectRow, endTurn, continueToNextTurn,
        handleEvacuate, handleReset,
        tickDoomResolution, completeDoomResolution,
        tickDrawAnim, completeDrawAnim,
    } = state;

    // --- Doom animation interval ---
    useEffect(() => {
        if (!doomAnimState || doomAnimState.phase !== 'spinning') return;
        const progress = doomAnimState.tick / doomAnimState.totalTicks;
        const interval = 80 + progress * 160;
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
            const timer = setTimeout(completeDrawAnim, 400);
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
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold">{t('三池物语')} <span className="text-sm text-gray-400">— {t('回合制原型')}</span></h1>
                    <button
                        onClick={handleReset}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                        {t('重置')}
                    </button>
                </div>

                {/* Status Bar */}
                <div className="flex gap-4 mb-4 p-3 bg-white rounded-xl shadow-md border border-gray-200 text-sm font-bold">
                    <div className="text-rose-600">❤️ {hp} HP</div>
                    <div className="text-amber-600">💰 {gold} {t('金币')}</div>
                    <div className="text-indigo-600">📅 {t('回合')} {turnNumber}</div>
                    <div className="text-teal-600">🎒 {inventory.length}/{maxInventorySize}</div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('三池物语')}</h2>
                        <p className="text-gray-500 mb-8">{t('回合制原型')}</p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始游戏')}
                        </button>
                    </div>
                )}

                {/* Drawing phase */}
                {phase === 'drawing' && matrix && (
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                        {/* Left: Grid */}
                        <div>
                            <ResourceMatrix
                                matrix={matrix}
                                onSelectRow={selectRow}
                                gold={gold}
                                drawCost={INITIAL_GAME_CONFIG.turn.drawCost}
                                phase={phase}
                                disabled={isDoomResolving || isDrawAnimating}
                                drawAnimState={drawAnimState}
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

                        {/* Right: Doom Grid + Inventory */}
                        <div className="w-64 flex flex-col gap-4">
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
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        return (
                                            <div
                                                key={i}
                                                className={`w-10 h-10 rounded flex items-center justify-center text-lg border
                                                    ${item
                                                        ? 'bg-white border-gray-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                                title={item?.name || ''}
                                            >
                                                {item ? item.icon : ''}
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
                    <div className="text-center py-12">
                        <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                        <p className="text-gray-500 mb-2">
                            {t('背包')}: {inventory.length}/{maxInventorySize} | HP: {hp} | 💀 Lv.{doomLevel}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('下回合将增加')} 1 {t('个危险格子')}
                        </p>

                        {/* Doom Grid preview */}
                        <div className="inline-block mb-6">
                            <div className="grid grid-cols-5 gap-1">
                                {doomGrid.map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-xs border
                                            ${cell.type === 'danger'
                                                ? 'bg-red-100 border-red-300 text-red-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-300'
                                            }`}
                                    >
                                        {cell.type === 'danger' ? '☠' : '·'}
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                {t('撤离')}（{inventory.length} {t('个物品')}）
                            </button>
                        </div>
                    </div>
                )}

                {/* Game over / Evacuated */}
                {phase === 'game_over' && (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-4">
                            {modalContent === 'evacuated' ? t('安全撤离') : t('游戏结束')}
                        </h2>
                        <p className="text-gray-500 mb-2">
                            {t('回合')}: {turnNumber} | {t('收集物品')}: {inventory.length}
                        </p>
                        {modalContent === 'game_over' && (
                            <p className="text-red-500 mb-4">{t('失去了一半物品')}</p>
                        )}

                        {/* Show inventory */}
                        {inventory.length > 0 && (
                            <div className="inline-block mb-6">
                                <h3 className="text-sm text-gray-500 mb-2">{t('带出的物品')}</h3>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {inventory.map((item, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded border border-gray-300 bg-white flex items-center justify-center text-lg"
                                            title={item.name}
                                        >
                                            {item.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('再来一局')}
                            </button>
                        </div>
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

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </div>
    );
};

export default GameCore;
