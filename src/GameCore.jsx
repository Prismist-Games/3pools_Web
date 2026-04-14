import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import ScoreBoard from './components/game/ScoreBoard';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import GameTooltip from './components/ui/GameTooltip';
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

            {/* Entry cost + draw limit */}
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                <span>⚡{pool.entryCost} AP</span>
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
                {canEnter ? t('进入') : (actionPoints < pool.entryCost ? `${t('行动点不足')}` : t('无法进入'))}
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

    return (
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* ===== Header ===== */}
                <div className="mb-4 bg-white rounded-xl shadow-md border border-gray-200">
                    {/* Row 1: Title + Meta */}
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
                                {t('第')} {expeditionNumber} {t('场')}
                            </span>
                            <button onClick={toggleLanguage} className="text-[11px] font-bold ml-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
                            <button onClick={handleReset} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-500 border border-red-200 hover:bg-red-200 transition-colors">{t('重置')}</button>
                            <button onClick={() => setDebugOpen(prev => !prev)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
                        </div>
                    </div>
                    {/* Row 2: Resources — AP, Heat, Lives */}
                    <div className="flex items-center gap-4 px-4 py-2">
                        {/* AP Display — adapts size: smaller in header when drawing (big contextual AP shown near grid) */}
                        <GameTooltip icon="⚡" title={t('行动点')} text={`${t('每回合')} ${maxAP}。${t('抽取消耗')} ${apDrawCost}。`}>
                            <span
                                className={`relative inline-flex items-center gap-1 px-3 py-1 rounded-lg border-2 shadow-sm font-black transition-all text-lg ${
                                    Math.max(0, actionPoints) > 5
                                        ? 'bg-sky-50 border-sky-400 text-sky-700'
                                        : Math.max(0, actionPoints) > 0
                                        ? 'bg-amber-50 border-amber-400 text-amber-700'
                                        : 'bg-red-50 border-red-400 text-red-600 animate-pulse'
                                }`}
                            >
                                <span>⚡</span>
                                <span className="tabular-nums">{Math.max(0, actionPoints)}</span>
                                <span className="text-xs font-medium opacity-60">/{maxAP}</span>
                                {apDelta && (
                                    <span
                                        key={apDelta.id}
                                        className="absolute left-1/2 -translate-x-1/2 -top-5 text-sm font-black pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-200 text-rose-500"
                                        style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}
                                    >
                                        {apDelta.value}
                                    </span>
                                )}
                            </span>
                        </GameTooltip>

                        {/* Spacer — push lives to the right for visual grouping */}
                        <div className="flex-1" />

                        {/* Lives */}
                        <GameTooltip icon="❤️" title={t('生命')} text={t('归零时失去全部物品，强制离场')}>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
                                lives <= 2 ? 'bg-red-50 border-red-300 text-red-600' : 'bg-rose-50 border-rose-200 text-rose-600'
                            }`}>
                                <span>❤️</span>
                                <span className="tabular-nums">{lives}</span>
                            </span>
                        </GameTooltip>
                    </div>
                    {/* Row 3: Evacuation — passive sticker count check */}
                    {(phase === 'pool_selection' || phase === 'drawing') && (
                        <div className="px-4 py-1.5 border-t border-gray-100">
                            {renderEvacuationBar()}
                        </div>
                    )}
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
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            {/* LEFT SIDEBAR — end turn + danger walls */}
                            <div className="w-52 flex-shrink-0 flex flex-col gap-3 self-start">
                                {/* End Turn */}
                                <button
                                    onClick={endTurn}
                                    className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-gray-400 text-white hover:bg-gray-500 transition-colors"
                                >
                                    {t('结束回合')}
                                </button>

                            </div>

                            {/* CENTER: Wall Shop + Profit Card Display */}
                            <div className="flex-1 min-w-0 flex flex-col gap-4">
                                {/* Wall Shop */}
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-600">🏪 {t('奖品墙商店')}</h3>
                                        <button
                                            onClick={refreshWalls}
                                            disabled={!canRefreshWalls}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                canRefreshWalls
                                                    ? 'bg-sky-500 text-white hover:bg-sky-600'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            🔄 {t('刷新奖品墙')} ({AP_CONFIG.refreshCost}⚡)
                                        </button>
                                    </div>
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
                                            <div className="text-center py-8 text-gray-400 text-sm w-full">{t('没有奖品墙')}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Profit Card Display */}
                                <div className="bg-white rounded-xl shadow-md border border-blue-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-black uppercase tracking-wide text-blue-500">💎 {t('兑换券商店')}</h3>
                                        <span className="text-[10px] text-blue-400 font-medium">{t('获取')} {AP_CONFIG.takeCardCost}⚡</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {displayedProfitCards.map(card => {
                                            const reqs = getRequirements(card);
                                            const satisfied = canSatisfyCard(card, inventory);
                                            const canTake = canTakeCard(card.id);

                                            return (
                                                <div key={card.id} className={`flex-1 min-w-0 rounded-lg border-2 p-3 flex flex-col gap-2 ${
                                                    satisfied
                                                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                                                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50'
                                                }`}>
                                                    {/* Header */}
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-lg leading-none">💎</span>
                                                        <span className="font-black text-xs text-blue-800">{t('物品兑换券')}</span>
                                                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                            satisfied
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                                : 'bg-blue-100 text-blue-600 border-blue-200'
                                                        }`}>
                                                            {satisfied ? `✓ ${t('已满足')}` : `✗ ${t('未满足')}`}
                                                        </span>
                                                    </div>

                                                    {/* Requirements */}
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {Object.entries(reqs).map(([stickerType, count]) => {
                                                            const info = getStickerTypeInfo(stickerType);
                                                            const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                                            const typeSatisfied = invCount >= count;
                                                            return (
                                                                <div
                                                                    key={stickerType}
                                                                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-base relative ${
                                                                        typeSatisfied
                                                                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                                                            : 'border-dashed border-gray-300 bg-white/50 opacity-60'
                                                                    }`}
                                                                >
                                                                    <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                                                    {count > 1 && (
                                                                        <span className="text-[8px] font-black text-gray-500 absolute -bottom-0.5 -right-0.5">x{count}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Reward section */}
                                                    {card.reward?.items && (
                                                        <div className="bg-amber-50/60 border border-amber-200 rounded-md px-1.5 py-1">
                                                            <div className="text-[8px] font-bold text-amber-500 mb-0.5">{t('撤离获得')}</div>
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {card.reward.items.map((item, i) => (
                                                                    <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="sm" />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Take button */}
                                                    <button
                                                        onClick={() => takeDisplayCard(card.id)}
                                                        disabled={!canTake}
                                                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                            canTake
                                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {t('获取')} ({AP_CONFIG.takeCardCost}⚡)
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {displayedProfitCards.length === 0 && (
                                            <div className="text-center py-4 text-gray-400 text-sm w-full">{t('暂无兑换券')}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR — inventory + danger */}
                            <div className="w-72 flex-shrink-0 flex flex-col gap-3 self-start">
                                {renderInventory()}
                                {renderDangerCards()}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== Drawing Phase ===== */}
                {phase === 'drawing' && matrix && (
                    <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        {/* LEFT SIDEBAR — wall info + exit + end turn */}
                        <div className="w-52 flex-shrink-0 flex flex-col gap-3 self-start">
                            {/* Wall info — draw count / limit */}
                            {currentPool && (
                                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">{currentPool.poolType?.icon || '🏷️'}</span>
                                        <span className="font-black text-base">{t(currentPool.poolType?.name || '奖品墙')}</span>
                                    </div>
                                    {/* Sticker bias */}
                                    {currentPool.poolType?._bias && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[10px] text-gray-400 font-bold">{t('偏好')}:</span>
                                            {currentPool.poolType._bias.map(biasId => {
                                                const info = getStickerTypeInfo(biasId);
                                                return info ? <span key={biasId} className="text-sm">{info.icon}</span> : null;
                                            })}
                                        </div>
                                    )}
                                    <div className="text-[11px] text-gray-500 font-medium">
                                        {t('抽取')}: {drawCount}/{currentPool.poolType?.drawLimit ?? '∞'}
                                    </div>
                                    {drawLimitReached && (
                                        <div className="mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                            {t('已达上限')}
                                        </div>
                                    )}
                                    <button
                                        onClick={exitPool}
                                        disabled={isDrawAnimating}
                                        className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                    >
                                        {t('退出奖品墙')}
                                    </button>
                                </div>
                            )}

                            {/* End Turn */}
                            <button
                                onClick={endTurn}
                                disabled={isDrawAnimating}
                                className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50"
                            >
                                {t('结束回合')}
                            </button>
                        </div>

                        {/* CENTER: Grid */}
                        <div className="flex-1 min-w-0 flex flex-col items-center">
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

                            {/* Draw result feedback */}
                            {lastDrawResult && !isDrawAnimating && (
                                <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
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

                        {/* RIGHT SIDEBAR — inventory + danger */}
                        <div className="w-72 flex-shrink-0 flex flex-col gap-3 self-start">
                            {renderInventory()}
                            {renderDangerCards()}
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

                {/* ===== Bottom Bar — Profit Cards (passive) ===== */}
                {(phase === 'pool_selection' || phase === 'drawing') && renderProfitCardsPassive()}

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
        </div>
    );

    // --- Evacuation Bar — passive sticker count (header) ---
    function renderEvacuationBar() {
        const satisfied = canEvacuate;
        const required = evacuationProfitRequirement;
        const current = satisfiedProfitCount;
        const percent = Math.min(100, (current / required) * 100);
        return (
            <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                    satisfied
                        ? 'border-amber-500 bg-gradient-to-r from-amber-100 to-yellow-100 shadow-md'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                }`}
            >
                <span className="text-lg leading-none">🚪</span>
                <span className="text-[10px] font-black text-amber-800 whitespace-nowrap">{t('撤离')}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    satisfied ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                    {current}/{required} {satisfied ? '✓' : ''}
                </span>

                {/* Progress bar */}
                <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all rounded-full ${satisfied ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap">
                    {t('满足')} {required} {t('张兑换券')}
                </span>

                {/* Evacuate button */}
                {satisfied && (
                    <button
                        onClick={evacuate}
                        className="ml-1 px-3 py-1 rounded-lg text-xs font-black bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-md whitespace-nowrap"
                    >
                        🚪 {t('撤离')}
                    </button>
                )}
            </div>
        );
    }

    // --- Danger Cards — passive matching (right sidebar) ---
    function renderDangerCards() {
        if (dangerCards.length === 0) return null;

        return (
            <div className="rounded-lg border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-red-200">
                    <span className="text-base leading-none">⚠️</span>
                    <span className="text-[10px] font-black text-red-800 whitespace-nowrap">{t('本回合威胁')}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                        lives <= 2 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                        ❤️ {lives}
                    </span>
                    {/* All-resolved badge */}
                    {dangerCards.every(c => canSatisfyCard(c, inventory)) && (
                        <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">{t('已化解')}</span>
                    )}
                </div>
                <div className="p-2 flex flex-col gap-1.5">
                    {dangerCards.map(card => {
                        const reqs = getRequirements(card);
                        const satisfied = canSatisfyCard(card, inventory);

                        return (
                            <div
                                key={card.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all ${
                                    satisfied
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-red-300 bg-red-50 animate-pulse'
                                }`}
                            >
                                {/* Requirement icons */}
                                <div className="flex items-center gap-1">
                                    {Object.entries(reqs).map(([stickerType, count]) => {
                                        const info = getStickerTypeInfo(stickerType);
                                        const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                        const typeSatisfied = invCount >= count;
                                        return (
                                            <div
                                                key={stickerType}
                                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-base ${
                                                    typeSatisfied
                                                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                                        : 'border-dashed border-gray-300 bg-white/50 opacity-60'
                                                }`}
                                            >
                                                <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                                {count > 1 && (
                                                    <span className="text-[8px] font-black text-gray-500 absolute -bottom-0.5 -right-0.5">x{count}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Status badge */}
                                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    satisfied
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {satisfied ? '✓' : `✗ -1 ❤️`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- Profit Cards — passive matching (bottom bar) ---
    function renderProfitCardsPassive() {
        if (profitCards.length === 0) return null;
        return (
            <div className="mt-4 bg-white rounded-xl shadow-md border border-blue-200">
                <div className="px-4 py-2 border-b border-blue-100 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-400">💎 {t('物品兑换券')}</h3>
                    <span className="text-[10px] text-blue-300 font-medium">{profitCards.length}</span>
                </div>
                <div className="p-3 flex gap-3 overflow-x-auto">
                    {profitCards.map(card => {
                        const reqs = getRequirements(card);
                        const satisfied = canSatisfyCard(card, inventory);
                        // DEBUG: log matching for each card
                        console.log(`Card ${card.id}:`, JSON.stringify(reqs), `satisfied=${satisfied}`, `inv stickers:`, inventory.filter(i => i?.isSticker).map(i => i.stickerId));

                        return (
                            <div key={card.id} className={`relative group flex-shrink-0 w-44 rounded-lg border-2 border-l-4 p-2 flex flex-col gap-1.5 ${
                                satisfied
                                    ? 'border-emerald-400 border-l-emerald-500 bg-gradient-to-b from-emerald-50 to-green-50'
                                    : 'border-blue-300 border-l-blue-500 bg-gradient-to-b from-blue-50 to-indigo-50'
                            }`}>
                                {/* Remove button */}
                                <button
                                    onClick={() => removeSlotCard(card.id)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10 shadow"
                                    title={t('移除')}
                                >
                                    ✕
                                </button>

                                {/* Header */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg leading-none">💎</span>
                                    <span className="font-black text-xs text-blue-800">{t('物品兑换券')}</span>
                                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                        satisfied
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                            : 'bg-blue-100 text-blue-600 border-blue-200'
                                    }`}>
                                        {satisfied ? `✓ ${t('已满足')}` : `✗ ${t('未满足')}`}
                                    </span>
                                </div>

                                {/* Requirements — passive display */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {Object.entries(reqs).map(([stickerType, count]) => {
                                        const info = getStickerTypeInfo(stickerType);
                                        // Check if this specific type has enough in inventory
                                        const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                        const typeSatisfied = invCount >= count;

                                        return (
                                            <div
                                                key={stickerType}
                                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-base transition-all select-none ${
                                                    typeSatisfied
                                                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                                        : 'border-dashed border-gray-300 bg-white/50 opacity-60'
                                                }`}
                                                title={`${t('需要')} ${count} ${info?.icon || ''} ${t(info?.name || '')} (${t('持有')} ${invCount})`}
                                            >
                                                <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                                {count > 1 && (
                                                    <span className="text-[8px] font-black text-gray-500 absolute -bottom-0.5 -right-0.5">x{count}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reward section */}
                                {card.reward?.items && (
                                    <div className="bg-amber-50/60 border border-amber-200 rounded-md px-1.5 py-1">
                                        <div className="text-[8px] font-bold text-amber-500 mb-0.5">{t('撤离获得')}</div>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {card.reward.items.map((item, i) => (
                                                <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="sm" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Satisfied badge */}
                                {satisfied && (
                                    <div className="text-[9px] font-bold text-center py-0.5 rounded bg-emerald-100 text-emerald-700">
                                        {t('撤离时自动兑换')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

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
                                    title={item ? t(item.name) : ''}
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
