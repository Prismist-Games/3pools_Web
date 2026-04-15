import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';

import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';

import GameCard from './components/ui/GameCard';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from './data/v2Config';
import { AP_CONFIG } from './data/v3Config';
import { canSatisfyCard, getRequirements, getStickerTypeInfo } from './data/slotCards';
import CardDock from './components/game/CardDock';


/** Wall card for the shop — compact layout for 5-in-a-row */
const PoolCardUI = ({ pool, canEnter, onEnter, actionPoints, t }) => {
    const bias = pool.poolType?._bias || [];
    const biasInfo = bias.map(id => getStickerTypeInfo(id)).filter(Boolean);
    const tierLabel = pool.poolType?.tier || 'common';

    // Tier badge color
    const tierColors = {
        common: 'bg-green-100 text-green-700',
        uncommon: 'bg-blue-100 text-blue-700',
        rare: 'bg-purple-100 text-purple-700',
        epic: 'bg-amber-100 text-amber-700',
        legendary: 'bg-orange-100 text-orange-700',
    };

    return (
        <div className={`flex-shrink-0 w-36 rounded-lg border-2 p-2 flex flex-col gap-1 transition-all ${
            canEnter
                ? 'border-green-300 bg-gradient-to-b from-white to-green-50 hover:shadow-md'
                : 'border-gray-200 bg-gray-50 opacity-70'
        }`}>
            {/* Name + icon */}
            <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{pool.poolType?.icon || '🏷️'}</span>
                <span className="font-black text-xs truncate">{t(pool.poolType?.name || '奖品墙')}</span>
            </div>

            {/* Tier badge */}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded self-start ${tierColors[tierLabel] || tierColors.common}`}>
                {t(tierLabel === 'common' ? '★' : tierLabel === 'uncommon' ? '★★' : tierLabel === 'rare' ? '★★★' : tierLabel === 'epic' ? '★★★★' : '★★★★★')}
            </span>

            {/* Bias stickers */}
            {biasInfo.length > 0 && (
                <div className="flex items-center gap-0.5">
                    <span className="text-[9px] text-gray-400 font-bold">{t('偏好')}:</span>
                    {biasInfo.map(info => (
                        <span key={info.id} className="text-sm" title={t(info.name)}>{info.icon}</span>
                    ))}
                </div>
            )}

            {/* Draw limit */}
            <div className="flex items-center text-[10px] font-bold text-gray-500">
                <span>🎯{pool.drawLimit}</span>
            </div>

            {/* Enter button */}
            <button
                onClick={onEnter}
                disabled={!canEnter}
                className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                    canEnter
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                {canEnter ? `${t('进入')} (${pool.entryCost}⚡)` : (actionPoints < pool.entryCost ? t('行动点不足') : t('无法进入'))}
            </button>
        </div>
    );
};

const GameCore = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const inventoryRef = useRef(null);
    const [recycleMode, setRecycleMode] = useState(false);
    const [recycleSelected, setRecycleSelected] = useState(new Set());
    const [debugOpen, setDebugOpen] = useState(false);
    const [debugSelectedItem, setDebugSelectedItem] = useState(null);

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const bonusItemMap = React.useMemo(
        () => new Map(state.bonusItems?.map(b => [b.id, b.bonusValue || 2]) || []),
        [state.bonusItems]
    );

    const {
        expeditionNumber, expeditionScores, expeditionConfig, bonusItems,
        turnNumber, phase,
        actionPoints, maxAP, apDrawCost,
        // Wall shop
        revealedPools, displayedProfitCards, canRefreshWalls, refreshWalls,
        enterPool, exitPool, canEnterPool, takeDisplayCard, canTakeCard,
        // Pool state
        currentPool, drawLimitReached,
        lives,
        matrix, lastDrawResult, lastDrawDirection,
        drawCount, totalDrawCount, canDraw,
        drawAnimState, isDrawAnimating,
        inventory, maxInventorySize, usedCapacity, freeCapacity, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        startGame, selectRow, selectColumn, endTurn,
        handleReset, startNextExpedition,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        // Slot cards (passive matching)
        slotCards, profitCards, dangerCards, canEvacuate,
        satisfiedProfitCount, evacuationProfitRequirement,
        addSlotCard, removeSlotCard, evacuate,
    } = state;

    // --- Draw scanning animation interval ---
    useEffect(() => {
        if (!drawAnimState) return;
        if (drawAnimState.phase === 'scanning') {
            const progress = drawAnimState.tick / drawAnimState.totalTicks;
            const interval = 50 + progress * progress * 200;
            const timer = setTimeout(tickDrawAnim, interval);
            return () => clearTimeout(timer);
        }
        if (drawAnimState.phase === 'settled') {
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

    // --- AP delta floater ---
    const prevAPRef = useRef(actionPoints);
    const [apDelta, setAPDelta] = useState(null);
    useEffect(() => {
        const prev = prevAPRef.current;
        if (actionPoints !== prev) {
            const diff = actionPoints - prev;
            if (diff !== 0 && diff < 0) {
                setAPDelta({ value: diff, id: Date.now() });
            }
            prevAPRef.current = actionPoints;
        }
    }, [actionPoints]);
    useEffect(() => {
        if (!apDelta) return;
        const timer = setTimeout(() => setAPDelta(null), 900);
        return () => clearTimeout(timer);
    }, [apDelta]);

    // --- Compute fly animation position ---
    const flyStyle = (() => {
        if (!flyingItem) return null;
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

    // Compute sticker count for CardDock evacuation display


    return (
        <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-6xl mx-auto">
                {/* ===== Header — single-row resource bar ===== */}
                <div className="mb-2 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 px-4 py-2">
                        {/* Left: title + meta */}
                        <h1 className="text-sm font-black tracking-tight">{t('幸运之墙')}</h1>
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">
                            {t('场次')} {expeditionNumber}/{expeditionConfig.expeditionCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            {t('回合')} {turnNumber}
                        </span>

                        <div className="flex-1" />

                        {/* Right: resources + actions */}
                        <span className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
                            Math.max(0, actionPoints) > 5
                                ? 'bg-sky-50 border-sky-400 text-sky-700'
                                : Math.max(0, actionPoints) > 0
                                ? 'bg-amber-50 border-amber-400 text-amber-700'
                                : 'bg-red-50 border-red-400 text-red-600 animate-pulse'
                        }`}>
                            <span>⚡</span>
                            <span className="tabular-nums">{Math.max(0, actionPoints)}</span>
                            <span className="text-[10px] font-medium opacity-60">/{maxAP}</span>
                            {apDelta && (
                                <span
                                    key={apDelta.id}
                                    className="absolute left-1/2 -translate-x-1/2 -top-5 text-sm font-black pointer-events-none text-rose-500"
                                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}
                                >
                                    {apDelta.value}
                                </span>
                            )}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
                            lives <= 2 ? 'bg-red-50 border-red-300 text-red-600' : 'bg-rose-50 border-rose-200 text-rose-600'
                        }`}>
                            <span>❤️</span>
                            <span className="tabular-nums">{lives}</span>
                        </span>

                        {(phase === 'pool_selection' || phase === 'drawing') && (
                            <button
                                onClick={endTurn}
                                disabled={isDrawAnimating}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50"
                            >
                                {t('结束回合')}
                            </button>
                        )}

                        <button onClick={toggleLanguage} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
                        <button onClick={handleReset} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-500 border border-red-200 hover:bg-red-200 transition-colors">{t('重置')}</button>
                        <button onClick={() => setDebugOpen(prev => !prev)} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
                    </div>
                </div>

                {/* ===== Pre-game ===== */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('幸运之墙')}</h2>
                        <p className="text-gray-500 mb-2">{t('行动点 + 奖品墙系统')}</p>
                        {expeditionNumber > 0 && (
                            <p className="text-sm text-gray-400 mb-4">{t('已完成')} {expeditionNumber} {t('场')}</p>
                        )}
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始第')} {expeditionNumber + 1} {t('场')}
                        </button>
                    </div>
                )}

                {/* ===== Pool Selection Phase ===== */}
                {phase === 'pool_selection' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                            {/* Main Action Area */}
                            <div className="flex-1 min-w-0">
                                {/* Shop Section — walls + vouchers in one panel */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-black uppercase tracking-wide text-gray-600">🏪 {t('商店')}</h3>
                                        <button
                                            onClick={refreshWalls}
                                            disabled={!canRefreshWalls}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                canRefreshWalls
                                                    ? 'bg-sky-500 text-white hover:bg-sky-600'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            🔄 {t('刷新')} ({AP_CONFIG.refreshCost}⚡)
                                        </button>
                                    </div>

                                    {/* Wall row */}
                                    <div className="mb-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">🧱 {t('奖品墙')}</div>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {revealedPools.map(pool => (
                                                <PoolCardUI
                                                    key={pool.uid}
                                                    pool={pool}
                                                    canEnter={canEnterPool(pool)}
                                                    onEnter={() => enterPool(pool.uid)}
                                                    actionPoints={actionPoints}
                                                    t={t}
                                                />
                                            ))}
                                            {revealedPools.length === 0 && (
                                                <div className="text-center py-4 text-gray-400 text-sm w-full">{t('没有奖品墙')}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Voucher row */}
                                    <div>
                                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1.5">💎 {t('兑换券')}</div>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {displayedProfitCards.map(card => {
                                                const reqs = getRequirements(card);
                                                const satisfied = canSatisfyCard(card, inventory);
                                                const canTake = canTakeCard(card.id);
                                                return (
                                                    <div key={card.id} className={`flex-shrink-0 w-44 rounded-lg border-2 p-2 flex flex-col gap-1.5 ${
                                                        satisfied
                                                            ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                                                            : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50'
                                                    }`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-lg leading-none">💎</span>
                                                            <span className="font-black text-xs truncate">{t('物品兑换券')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {Object.entries(reqs).map(([stickerType, count]) => {
                                                                const info = getStickerTypeInfo(stickerType);
                                                                const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                                                const typeSatisfied = invCount >= count;
                                                                return (
                                                                    <div key={stickerType} className={`relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                                                                        typeSatisfied
                                                                            ? 'border-emerald-400 bg-emerald-50'
                                                                            : 'border-dashed border-gray-300 bg-white/50'
                                                                    }`}>
                                                                        <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                                                        {count > 1 && (
                                                                            <span className="absolute -top-1 -right-2 text-[9px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">x{count}</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {card.reward?.items && (
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {card.reward.items.map((item, i) => (
                                                                    <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="md" />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => takeDisplayCard(card.id)}
                                                            disabled={!canTake}
                                                            className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                                                                canTake
                                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {canTake
                                                                ? `${t('获取')} (${AP_CONFIG.takeCardCost}⚡)`
                                                                : actionPoints < AP_CONFIG.takeCardCost
                                                                    ? t('行动点不足')
                                                                    : (satisfied ? `✓ ${t('已满足')}` : `✗ ${t('未满足')}`)}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {displayedProfitCards.length === 0 && (
                                                <div className="text-center py-3 text-gray-400 text-sm w-full">{t('暂无兑换券')}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Inventory (right panel) */}
                            <div className="w-72 flex-shrink-0 self-start">
                                {renderInventory()}
                            </div>
                        </div>

                    </div>
                )}

                {/* ===== Drawing Phase ===== */}
                {phase === 'drawing' && matrix && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                            {/* Main: grid area */}
                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                                {/* Wall info bar */}
                                {currentPool && (
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-green-300 bg-green-50">
                                        <span className="text-xl">{currentPool.poolType?.icon || '🏷️'}</span>
                                        <span className="font-black text-sm">{t(currentPool.poolType?.name || '奖品墙')}</span>
                                        {currentPool.poolType?._bias && (
                                            <div className="flex items-center gap-0.5">
                                                {currentPool.poolType._bias.map(biasId => {
                                                    const info = getStickerTypeInfo(biasId);
                                                    return info ? <span key={biasId} className="text-sm">{info.icon}</span> : null;
                                                })}
                                            </div>
                                        )}
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            {t('抽取')}: {drawCount}/{currentPool.poolType?.drawLimit ?? '∞'}
                                        </span>
                                        {drawLimitReached && (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                {t('已达上限')}
                                            </span>
                                        )}
                                        <div className="flex-1" />
                                        <button
                                            onClick={exitPool}
                                            disabled={isDrawAnimating}
                                            className="px-3 py-1 rounded-lg text-[11px] font-bold border-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        >
                                            {t('退出奖品墙')}
                                        </button>
                                    </div>
                                )}
                                {/* Draw grid */}
                                <div className="flex justify-center">
                                    <ResourceMatrix
                                        matrix={matrix}
                                        onSelectRow={selectRow}
                                        onSelectColumn={selectColumn}
                                        phase={phase}
                                        disabled={isDrawAnimating || pendingItems.length > 0 || !canDraw}
                                        disabledReason={drawLimitReached ? t('已达上限') : !canDraw ? t('行动点不足') : null}
                                        drawAnimState={drawAnimState}
                                        wallType={null}
                                        lastDrawDirection={lastDrawDirection}
                                        bonusItemMap={bonusItemMap}
                                    />
                                </div>

                                {lastDrawResult && !isDrawAnimating && (
                                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                        lastDrawResult.obtained
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-gray-50 text-gray-400 border border-gray-200'
                                    }`}>
                                        {lastDrawResult.obtained
                                            ? `${t('获得')}: ${lastDrawResult.obtained.item?.icon || ''} ${t(lastDrawResult.obtained.item?.name || '')}`
                                            : t('未获得物品')
                                        }
                                    </div>
                                )}

                            </div>

                            {/* Inventory (right panel) */}
                            <div className="w-72 flex-shrink-0 self-start">
                                {renderInventory()}
                            </div>
                        </div>

                    </div>
                )}

                {/* ===== Game Over / Evacuated ===== */}
                {phase === 'game_over' && (
                    <div className="text-center py-12">
                        {modalContent === 'evacuated' ? (
                            <h2 className="text-xl font-bold mb-4">{t('满载而归')}</h2>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold mb-2 text-red-600">{t('游戏结束')}</h2>
                                <p className="text-red-500 mb-4">{t('失去了全部物品，本场得 0 分')}</p>
                            </>
                        )}

                        {/* Expedition results */}
                        <div className="inline-block mb-6 text-left">
                            {expeditionScores.map((exp, i) => (
                                <div key={i} className="mb-4">
                                    <div className="text-xs text-gray-500 font-bold mb-2">
                                        {t('第')} {i + 1} {t('场')} — {exp.items?.length || 0} {t('食材')}
                                    </div>
                                    {exp.items && exp.items.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {exp.items.map((item, j) => (
                                                <div key={j} className="flex flex-col items-center">
                                                    <GameCard icon={item.icon} label={t(item.name)} stars={item.stars} size="lg" />
                                                    <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[56px] text-center">{t(item.name)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {expeditionNumber < expeditionConfig.expeditionCount ? (
                            <button onClick={() => { startNextExpedition(); }}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('开始第')} {expeditionNumber + 1} {t('场')}
                            </button>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">
                                    {t('游戏结束')}
                                </h2>
                                <button onClick={handleReset}
                                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                                >
                                    {t('再来一局')}
                                </button>
                            </div>
                        )}
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
                                <button onClick={() => setDebugOpen(false)} className="text-gray-500 hover:text-gray-200 text-lg leading-none">&times;</button>
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
                                            {debugSelectedItem.stars && <span className="text-gray-500 ml-1">({'★'.repeat(debugSelectedItem.stars)})</span>}
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
                                {/* Slot Card test buttons */}
                                <div className="mt-4 pt-3 border-t border-gray-700">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">{t('插槽卡')}</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => addSlotCard('profit')}
                                            className="flex-1 py-1.5 rounded-lg bg-blue-800 text-blue-200 text-xs font-bold hover:bg-blue-700 transition-colors">
                                            + {t('物品兑换券')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
            </div>{/* end scrollable area */}

            {/* Card Dock — fixed at bottom of viewport */}
            <CardDock
                dangerCards={dangerCards}
                profitCards={profitCards}
                inventory={inventory}
                canEvacuate={canEvacuate}
                satisfiedProfitCount={satisfiedProfitCount}
                evacuationProfitRequirement={evacuationProfitRequirement}
                evacuate={evacuate}
                removeSlotCard={removeSlotCard}
                phase={phase}
                t={t}
            />
        </div>
    );

    // --- Inventory render helper (simplified — no drag, no ghost items) ---
    function renderInventory() {
        // Compute sticker counts for quick reference (keyed by stickerId)
        const stickerCounts = {};
        // Compute item counts by score tier
        const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        inventory.forEach(item => {
            if (item?.isSticker && item.stickerId) {
                stickerCounts[item.stickerId] = (stickerCounts[item.stickerId] || 0) + 1;
            } else if (item?.isOutOfGame && item.stars != null) {
                tierCounts[item.stars] = (tierCounts[item.stars] || 0) + 1;
            }
        });
        const hasStickerItems = Object.keys(stickerCounts).length > 0;
        const hasTierItems = Object.values(tierCounts).some(n => n > 0);

        return (
            <div ref={inventoryRef} className="bg-white rounded-lg shadow-sm border">
                <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('背包')}</h3>
                        <span className="text-[10px] font-medium">
                            <span className="text-blue-400">{inventory.length}</span>
                            <span className="text-gray-300"> /{maxInventorySize}</span>
                        </span>
                    </div>
                    {/* Capacity bar — simple blue */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        {inventory.length > 0 && (
                            <div className="bg-blue-300 transition-all h-full rounded-full" style={{ width: `${(inventory.length / maxInventorySize) * 100}%` }} />
                        )}
                    </div>
                </div>
                <div className="p-2">
                    {/* Sticker summary */}
                    {hasStickerItems && (
                        <div className="mb-2 px-2 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-indigo-400 font-bold uppercase mr-1">{t('印花')}</span>
                            {STICKER_TYPES.map(st => {
                                const count = stickerCounts[st.id] || 0;
                                if (count === 0) return null;
                                return (
                                    <GameCard key={st.id} icon={st.icon} label={t(st.name)} sticker size="sm" count={count} />
                                );
                            })}
                        </div>
                    )}

                    {/* Item-by-tier summary */}
                    {hasTierItems && (
                        <div className="mb-2 px-2 py-1.5 bg-amber-50/50 border border-amber-100 rounded-lg flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-amber-500 font-bold uppercase mr-1">{t('食材')}</span>
                            {[1, 2, 3, 4, 5].map(tier => {
                                const count = tierCounts[tier] || 0;
                                if (count === 0) return null;
                                return (
                                    <span key={tier} className="inline-flex items-center gap-0.5 text-[10px] font-black px-1 py-0.5 rounded text-amber-700 bg-amber-100">
                                        <span className="text-amber-500">{'★'.repeat(tier)}</span>
                                        <span>x{count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Recycle card */}
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
                                {pendingItems.map((pItem, idx) => (
                                    <div key={pItem.uid || idx} className={`${idx === 0 ? 'ring-2 ring-amber-400 rounded-lg' : 'opacity-60'}`}>
                                        <GameCard
                                            icon={pItem.icon}
                                            label={pItem.name}
                                            stars={pItem.isOutOfGame ? pItem.stars : undefined}
                                            sticker={pItem.isSticker}
                                            size="md"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-amber-600 mb-1.5">{t('背包已满，点击下方物品替换')}</p>
                            <button onClick={discardPendingItem} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">{t('丢弃当前物品')}</button>
                        </div>
                    )}
                    {/* Inventory grid — simple, no draggable */}
                    <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: maxInventorySize }).map((_, i) => {
                            const item = inventory[i];
                            const canReplace = pendingItem && item && !recycleMode;
                            const isRecycleSelected = recycleMode && recycleSelected.has(i);

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
                                    className={`relative transition-all duration-150 select-none
                                        ${isRecycleSelected ? 'scale-95 opacity-60' : ''}
                                        ${canReplace ? 'cursor-pointer hover:scale-110'
                                            : recycleMode && item ? 'cursor-pointer' : ''}`}
                                >
                                    {item ? (
                                        <GameCard
                                            icon={item.icon}
                                            label={t(item.name)}
                                            stars={item.isOutOfGame ? item.stars : undefined}
                                            sticker={item.isSticker}
                                            size="md"
                                            className={`${isRecycleSelected ? 'border-red-400 bg-red-100' : ''}
                                                ${canReplace ? 'hover:border-red-400' : ''}
                                                ${recycleMode && item ? 'hover:border-red-400' : ''}`}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50" />
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
        );
    }
};

export default GameCore;
