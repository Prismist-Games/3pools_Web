import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import ScoreBoard from './components/game/ScoreBoard';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import GameTooltip from './components/ui/GameTooltip';
import GameCard from './components/ui/GameCard';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from './data/v2Config';
import { RISK_CONFIG } from './data/v3Config';
// getOrderProgress, isOrderReady kept in useGameLogic but no longer rendered in UI
import { getCardProgress, getStickerTypeInfo, isCardComplete } from './data/slotCards';


/** SlotCardUI — renders a single profit, danger, or evacuation slot card with fill/unfill interaction */
const SlotCardUI = ({ card, inventory, onFillSlot, onUnfillSlot, onRemove, onEvacuate, canEvacuate, t, dragState, onDragStart, onSlotDragOver, onSlotDrop, onSlotDragLeave, dragOverSlot }) => {
    const isDanger = card.type === 'danger';
    const isEvacuation = card.type === 'evacuation';
    const progress = getCardProgress(card);
    const complete = progress.filled === progress.total;
    const didDragRef = React.useRef(false);

    // Click on an empty slot: find a matching sticker in inventory and auto-fill it
    // For filled slots: only unfill if it wasn't a drag operation
    const handleSlotClick = (slotIndex) => {
        if (didDragRef.current) { didDragRef.current = false; return; }
        const slot = card.slots[slotIndex];
        if (slot.filled) {
            onUnfillSlot(card.id, slotIndex);
        } else {
            // For 'any' type slots, match any sticker in inventory
            const match = slot.stickerType === 'any'
                ? inventory.find(item => item.isSticker)
                : inventory.find(item => item.isSticker && item.stickerId === slot.stickerType);
            if (match) {
                onFillSlot(card.id, slotIndex, match.uid);
            }
        }
    };

    // Drag start for filled stickers in slots
    const handleFilledDragStart = (e, slotIndex, slot) => {
        didDragRef.current = true;
        // For 'any' slots, use the actual filled sticker type
        const actualType = slot.stickerType === 'any' ? slot.filledStickerType : slot.stickerType;
        const stickerInfo = getStickerTypeInfo(actualType);
        onDragStart({
            stickerUid: slot.filledStickerUid,
            stickerId: actualType,
            stickerIcon: stickerInfo?.icon || '?',
            source: { cardId: card.id, slotIndex },
        });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', stickerInfo?.icon || '?');
    };

    // Slot icon display helper
    const getSlotIcon = (slot) => {
        if (slot.filled) {
            // Show actual sticker icon for filled slots
            const actualType = slot.stickerType === 'any' ? slot.filledStickerType : slot.stickerType;
            const info = getStickerTypeInfo(actualType);
            return info?.icon || '?';
        }
        // Empty slot: show required type icon, or generic icon for 'any'
        if (slot.stickerType === 'any') return '✦';
        const info = getStickerTypeInfo(slot.stickerType);
        return info?.icon || '?';
    };

    const borderColor = isEvacuation
        ? (complete ? 'border-amber-500 border-l-amber-600' : 'border-amber-300 border-l-amber-500')
        : isDanger
            ? 'border-red-400 border-l-red-600'
            : complete
                ? 'border-emerald-400 border-l-emerald-500'
                : 'border-blue-300 border-l-blue-500';
    const bgColor = isEvacuation
        ? (complete ? 'bg-gradient-to-b from-amber-100 to-yellow-100' : 'bg-gradient-to-b from-amber-50 to-yellow-50')
        : isDanger
            ? 'bg-gradient-to-b from-red-50 to-red-100'
            : complete
                ? 'bg-gradient-to-b from-emerald-50 to-green-50'
                : 'bg-gradient-to-b from-blue-50 to-indigo-50';

    return (
        <div className={`relative group rounded-lg border-2 border-l-4 ${borderColor} ${bgColor} p-2 flex flex-col gap-1.5 ${isDanger && !complete ? 'animate-pulse' : ''}`}>
            {/* Remove button — not shown for evacuation cards */}
            {!isEvacuation && (
                <button
                    onClick={() => onRemove(card.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10 shadow"
                    title={t('移除')}
                >
                    ✕
                </button>
            )}

            {/* Header: type label + progress */}
            <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{isEvacuation ? '🚪' : isDanger ? '⚠️' : '💎'}</span>
                <span className={`font-black text-xs ${isEvacuation ? 'text-amber-800' : isDanger ? 'text-red-800' : 'text-blue-800'}`}>
                    {isEvacuation ? t('撤离卡') : isDanger ? t('危险卡') : t('利润卡')}
                </span>
                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    complete
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : isEvacuation
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : isDanger
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : 'bg-blue-100 text-blue-600 border-blue-200'
                }`}>
                    {progress.filled}/{progress.total}
                </span>
            </div>

            {/* Evacuation hint */}
            {isEvacuation && !complete && (
                <div className="text-[9px] text-amber-600 font-bold">
                    {t('填满后可以撤离')}
                </div>
            )}

            {/* Danger warning */}
            {isDanger && !complete && (
                <div className="text-[9px] text-red-600 font-bold">
                    {t('回合结束前填满!')}
                </div>
            )}

            {/* Slots row */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {card.slots.map((slot, i) => {
                    const isAnySlot = slot.stickerType === 'any';
                    const stickerInfo = isAnySlot ? null : getStickerTypeInfo(slot.stickerType);
                    // For 'any' slots, any sticker in inventory is a match
                    const hasMatch = !slot.filled && (isAnySlot
                        ? inventory.some(item => item.isSticker)
                        : inventory.some(item => item.isSticker && item.stickerId === slot.stickerType)
                    );

                    // Drag-over highlight: is a valid sticker being dragged over this empty slot?
                    const isDropTarget = dragOverSlot?.cardId === card.id && dragOverSlot?.slotIndex === i;
                    const isDragValid = isDropTarget && dragState && !slot.filled && (isAnySlot || dragState.stickerId === slot.stickerType);
                    const isDragInvalid = isDropTarget && dragState && (!slot.filled ? (!isAnySlot && dragState.stickerId !== slot.stickerType) : true);

                    return (
                        <div
                            key={i}
                            draggable={slot.filled}
                            onDragStart={slot.filled ? (e) => handleFilledDragStart(e, i, slot) : undefined}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                onSlotDragOver?.(card.id, i);
                            }}
                            onDragLeave={() => onSlotDragLeave?.()}
                            onDrop={(e) => {
                                e.preventDefault();
                                onSlotDrop?.(card.id, i);
                            }}
                            onClick={() => handleSlotClick(i)}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-base transition-all select-none ${
                                isDragValid
                                    ? 'border-emerald-400 bg-emerald-100 scale-110 shadow-md ring-2 ring-emerald-300'
                                    : isDragInvalid
                                        ? 'border-red-300 bg-red-50'
                                        : slot.filled
                                            ? 'border-emerald-400 bg-emerald-50 shadow-sm cursor-grab hover:border-red-300 hover:bg-red-50 active:cursor-grabbing'
                                            : hasMatch
                                                ? `border-dashed ${isEvacuation ? 'border-amber-400 bg-amber-50/50' : 'border-amber-400 bg-amber-50/50'} cursor-pointer hover:border-amber-500 hover:bg-amber-100 hover:scale-110`
                                                : dragState && !slot.filled && (isAnySlot || dragState.stickerId === slot.stickerType)
                                                    ? 'border-dashed border-emerald-400 bg-emerald-50/50 scale-105'
                                                    : 'border-dashed border-gray-300 bg-white/50 cursor-not-allowed opacity-60'
                            }`}
                            title={slot.filled
                                ? t('拖拽移动或点击取回')
                                : hasMatch
                                    ? isAnySlot
                                        ? t('任意印花')
                                        : `${t('拖拽填入或点击填入')} ${stickerInfo?.icon || ''} ${t(stickerInfo?.name || '')}`
                                    : isAnySlot
                                        ? t('任意印花')
                                        : `${t('需要')} ${stickerInfo?.icon || ''} ${t(stickerInfo?.name || '')}`
                            }
                        >
                            <span className={slot.filled ? '' : 'opacity-40'}>
                                {getSlotIcon(slot)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Reward section — only for profit cards */}
            {card.type === 'profit' && card.reward?.items && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-md px-1.5 py-1">
                    <div className="text-[8px] font-bold text-amber-500 mb-0.5">{t('完成获得')}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                        {card.reward.items.map((item, i) => (
                            <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="sm" />
                        ))}
                    </div>
                </div>
            )}

            {/* Evacuate button — only for evacuation cards when complete */}
            {isEvacuation && complete && onEvacuate && (
                <button
                    onClick={onEvacuate}
                    className="w-full py-2 rounded-lg text-sm font-black bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-md"
                >
                    🚪 {t('撤离')}
                </button>
            )}

            {/* Complete badge — for non-evacuation cards */}
            {complete && !isEvacuation && (
                <div className={`text-[9px] font-bold text-center py-0.5 rounded ${
                    isDanger
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-emerald-100 text-emerald-700'
                }`}>
                    {isDanger ? t('已化解') : t('已完成')}
                </div>
            )}
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

    // --- Drag & Drop State ---
    // dragState: { stickerUid, stickerId, stickerIcon, source: 'inventory' | { cardId, slotIndex } } | null
    const [dragState, setDragState] = useState(null);
    // dragOverSlot: { cardId, slotIndex } | null — which slot the cursor is hovering over
    const [dragOverSlot, setDragOverSlot] = useState(null);
    // dragOverInventory: boolean — is cursor hovering over inventory area
    const [dragOverInventory, setDragOverInventory] = useState(false);

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const bonusItemMap = React.useMemo(
        () => new Map(state.bonusItems?.map(b => [b.id, b.bonusValue || 2]) || []),
        [state.bonusItems]
    );

    const {
        expeditionNumber, expeditionScores, expeditionConfig, bonusItems,
        turnNumber, phase,
        actionPoints, maxAP, apDrawCost,
        currentPool, enterDangerWall, exitDangerWallView, pendingFlippedPool, resolvePoolOverflow,
        growthOrdersView, submitGrowthOrder,
        doomCounter, hp,
        risk, lives, wallDepth, turnHeat, cumulativeExposure, dangerWalls, nextDrawRiskIncrement,
        removeEncounter,
        matrix, lastDrawResult, lastDrawDirection,
        drawCount, totalDrawCount, canDraw,
        drawAnimState, isDrawAnimating,
        inventory, maxInventorySize, usedCapacity, freeCapacity, filledSlotCount, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        startGame, selectRow, selectColumn, endTurn,
        handleReset, startNextExpedition,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, discardPendingItem, debugAddItem,
        // Slot cards
        slotCards, profitCards, dangerCards, evacuationCards, canEvacuate,
        addSlotCard, fillSlot, unfillSlot, removeSlotCard, moveSlot, evacuate,
    } = state;

    // (Wall shop replace mode removed — single wall system)

    // --- Drag & Drop Handlers ---
    const dragInfoRef = React.useRef(null);
    const handleDragStart = useCallback((info) => {
        dragInfoRef.current = info;
        // Defer state update to avoid re-render cancelling the browser drag
        requestAnimationFrame(() => {
            setDragState(info);
            setDragOverSlot(null);
            setDragOverInventory(false);
        });
    }, []);

    const handleDragEnd = useCallback(() => {
        dragInfoRef.current = null;
        setDragState(null);
        setDragOverSlot(null);
        setDragOverInventory(false);
    }, []);

    const handleSlotDragOver = useCallback((cardId, slotIndex) => {
        setDragOverSlot(prev => {
            if (prev?.cardId === cardId && prev?.slotIndex === slotIndex) return prev;
            return { cardId, slotIndex };
        });
    }, []);

    const handleSlotDragLeave = useCallback(() => {
        setDragOverSlot(null);
    }, []);

    const handleSlotDrop = useCallback((targetCardId, targetSlotIndex) => {
        const drag = dragState || dragInfoRef.current;
        if (!drag) return;

        const targetCard = slotCards.find(c => c.id === targetCardId);
        if (!targetCard) { handleDragEnd(); return; }

        const targetSlot = targetCard.slots[targetSlotIndex];
        if (!targetSlot || targetSlot.filled) { handleDragEnd(); return; }

        // 'any' type slots accept any sticker; otherwise types must match
        if (targetSlot.stickerType !== 'any' && drag.stickerId !== targetSlot.stickerType) { handleDragEnd(); return; }

        if (drag.source === 'inventory') {
            fillSlot(targetCardId, targetSlotIndex, drag.stickerUid);
        } else {
            moveSlot(drag.source.cardId, drag.source.slotIndex, targetCardId, targetSlotIndex);
        }
        handleDragEnd();
    }, [dragState, slotCards, fillSlot, moveSlot, handleDragEnd]);

    const handleInventoryDrop = useCallback(() => {
        const drag = dragState || dragInfoRef.current;
        if (!drag) return;
        if (drag.source !== 'inventory' && drag.source?.cardId) {
            unfillSlot(drag.source.cardId, drag.source.slotIndex);
        }
        handleDragEnd();
    }, [dragState, unfillSlot, handleDragEnd]);

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

                        {/* Spacer — push heat/lives to the right for visual grouping */}
                        <div className="flex-1" />

                        {/* Heat gauge — shows current turn heat */}
                        <GameTooltip icon="🌡️" title={t('热度')} text={t('回合结束时，热度越高越可能出现危险墙')}>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
                                turnHeat >= 50 ? 'bg-red-50 border-red-300 text-red-600' :
                                turnHeat >= 25 ? 'bg-amber-50 border-amber-300 text-amber-600' :
                                'bg-gray-50 border-gray-200 text-gray-500'
                            }`}>
                                <span>🌡️</span>
                                <span className="tabular-nums">{turnHeat}</span>
                            </span>
                        </GameTooltip>

                        {/* Danger walls count — shown if any active */}
                        {dangerWalls.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm bg-orange-50 border-orange-300 text-orange-600">
                                <span>🔥</span>
                                <span className="tabular-nums">{dangerWalls.length}</span>
                            </span>
                        )}

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
                    {/* Row 3: Evacuation Card — progress bar toward escape */}
                    {phase !== 'pre_game' && phase !== 'game_over' && evacuationCards.length > 0 && (
                        <div className="px-4 py-1.5 border-t border-gray-100">
                            {renderEvacuationCard()}
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

                {/* ===== Playing Phase (single wall always visible) ===== */}
                {phase === 'playing' && matrix && (
                    <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        {/* LEFT SIDEBAR — danger walls + end turn */}
                        <div className="w-52 flex-shrink-0 flex flex-col gap-3 self-start">
                            {/* Wall info — draw count */}
                            {currentPool && !currentPool.isDangerWall && (
                                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">🏷️</span>
                                        <span className="font-black text-base">{t('奖品墙')}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 font-medium">
                                        {t('抽取')}: {drawCount}
                                    </div>
                                </div>
                            )}

                            {/* Danger wall info — when inside a danger wall */}
                            {currentPool?.isDangerWall && (
                                <div className="rounded-xl border-2 border-red-400 bg-red-50 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">🔥</span>
                                        <span className="font-black text-base text-red-800">{t('危险墙')}</span>
                                    </div>
                                    <div className="text-[11px] text-red-500 font-medium">
                                        {t('抽取')}: {drawCount}/{currentPool.poolType.drawLimit}
                                    </div>
                                    <button
                                        onClick={exitDangerWallView}
                                        disabled={isDrawAnimating}
                                        className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                                    >
                                        {t('退出危险墙')}
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

                            {/* Danger walls — compact sidebar view */}
                            {dangerWalls.length > 0 && !currentPool?.isDangerWall && (
                                <div className="bg-red-50 rounded-lg border border-red-200 shadow-sm">
                                    <div className="px-2.5 py-1.5 border-b border-red-100">
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
                                            🔥 {t('危险墙')} ({dangerWalls.length})
                                        </span>
                                    </div>
                                    <div className="p-2 flex flex-col gap-1.5">
                                        {dangerWalls.map(dw => (
                                            <div key={dw.id} className="relative group rounded-md border border-red-300 bg-white px-2 py-1.5">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(t('移除危险将扣 1 条命'))) {
                                                            removeEncounter('danger_wall', dw.id);
                                                        }
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all z-10 shadow"
                                                    title={t('移除危险将扣 1 条命')}
                                                >
                                                    ✕
                                                </button>
                                                <div className="flex items-center gap-1 mb-1">
                                                    {dw.grid[0].map((cell, ci) => (
                                                        <span key={ci} className="text-xs">{cell.icon}</span>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => enterDangerWall(dw.id)}
                                                    className="w-full px-2 py-1 rounded text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                >
                                                    {t('进入危险墙')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CENTER: Grid */}
                        <div className="flex-1 min-w-0 flex flex-col items-center">
                            <ResourceMatrix
                                matrix={matrix}
                                onSelectRow={selectRow}
                                onSelectColumn={selectColumn}
                                phase={phase}
                                disabled={isDrawAnimating || pendingItems.length > 0 || !canDraw}
                                disabledReason={!canDraw ? t('行动点不足') : null}
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

                {/* ===== Bottom Bar — Profit Cards ===== */}
                {phase !== 'pre_game' && phase !== 'game_over' && renderProfitCards()}

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
                                            + {t('利润卡')}
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

    // --- Evacuation Card — compact header bar (always visible) ---
    function renderEvacuationCard() {
        if (evacuationCards.length === 0) return null;
        const card = evacuationCards[0]; // only one evacuation card per expedition
        const progress = getCardProgress(card);
        const complete = progress.filled === progress.total;

        // Click handler for evacuation slots
        const handleEvacSlotClick = (slotIndex) => {
            const slot = card.slots[slotIndex];
            if (slot.filled) {
                unfillSlot(card.id, slotIndex);
            } else {
                const match = inventory.find(item => item.isSticker);
                if (match) fillSlot(card.id, slotIndex, match.uid);
            }
        };

        // Drag start for filled evacuation slots
        const handleEvacDragStart = (e, slotIndex, slot) => {
            const actualType = slot.stickerType === 'any' ? slot.filledStickerType : slot.stickerType;
            const stickerInfo = getStickerTypeInfo(actualType);
            handleDragStart({
                stickerUid: slot.filledStickerUid,
                stickerId: actualType,
                stickerIcon: stickerInfo?.icon || '?',
                source: { cardId: card.id, slotIndex },
            });
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', stickerInfo?.icon || '?');
        };

        return (
            <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                    complete
                        ? 'border-amber-500 bg-gradient-to-r from-amber-100 to-yellow-100 shadow-md'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                }`}
                onDragEnd={handleDragEnd}
            >
                <span className="text-lg leading-none">🚪</span>
                <span className="text-[10px] font-black text-amber-800 whitespace-nowrap">{t('撤离卡')}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    complete ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                    {progress.filled}/{progress.total}
                </span>

                {/* Slots row */}
                <div className="flex items-center gap-1">
                    {card.slots.map((slot, i) => {
                        const hasMatch = !slot.filled && inventory.some(item => item.isSticker);
                        const isDropTarget = dragOverSlot?.cardId === card.id && dragOverSlot?.slotIndex === i;
                        const isDragValid = isDropTarget && dragState && !slot.filled;
                        const isDragInvalid = isDropTarget && dragState && slot.filled;

                        // Get display icon
                        let icon;
                        if (slot.filled) {
                            const actualType = slot.filledStickerType || slot.stickerType;
                            const info = getStickerTypeInfo(actualType);
                            icon = info?.icon || '?';
                        } else {
                            icon = '✦';
                        }

                        return (
                            <div
                                key={i}
                                draggable={slot.filled}
                                onDragStart={slot.filled ? (e) => handleEvacDragStart(e, i, slot) : undefined}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; handleSlotDragOver(card.id, i); }}
                                onDragLeave={() => handleSlotDragLeave()}
                                onDrop={(e) => { e.preventDefault(); handleSlotDrop(card.id, i); }}
                                onClick={() => handleEvacSlotClick(i)}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center text-sm transition-all select-none ${
                                    isDragValid
                                        ? 'border-emerald-400 bg-emerald-100 scale-110 shadow-md ring-2 ring-emerald-300'
                                        : isDragInvalid
                                            ? 'border-red-300 bg-red-50'
                                            : slot.filled
                                                ? 'border-emerald-400 bg-emerald-50 shadow-sm cursor-grab hover:border-red-300 hover:bg-red-50 active:cursor-grabbing'
                                                : hasMatch
                                                    ? 'border-dashed border-amber-400 bg-amber-50/50 cursor-pointer hover:border-amber-500 hover:bg-amber-100 hover:scale-110'
                                                    : dragState && !slot.filled
                                                        ? 'border-dashed border-emerald-400 bg-emerald-50/50 scale-105'
                                                        : 'border-dashed border-gray-300 bg-white/50 opacity-60'
                                }`}
                                title={slot.filled ? t('拖拽移动或点击取回') : hasMatch ? t('任意印花') : t('任意印花')}
                            >
                                <span className={`text-xs ${slot.filled ? '' : 'opacity-40'}`}>{icon}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Evacuate button */}
                {complete && (
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

    // --- Danger Cards — urgent row above wall shop ---
    function renderDangerCards() {
        if (dangerCards.length === 0) return null;

        return (
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50"
                onDragEnd={handleDragEnd}
            >
                <span className="text-base leading-none">⚠️</span>
                <span className="text-[10px] font-black text-red-800 whitespace-nowrap">{t('本回合威胁')}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                    lives <= 2 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                    ❤️ {lives}
                </span>

                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                    {dangerCards.map(card => {
                        const slot = card.slots[0]; // danger cards have 1 slot
                        if (!slot) return null;
                        const stickerInfo = getStickerTypeInfo(slot.stickerType);
                        const hasMatch = !slot.filled && inventory.some(item => item.isSticker && item.stickerId === slot.stickerType);
                        const isDropTarget = dragOverSlot?.cardId === card.id && dragOverSlot?.slotIndex === 0;
                        const isDragValid = isDropTarget && dragState && !slot.filled && dragState.stickerId === slot.stickerType;
                        const isDragInvalid = isDropTarget && dragState && (!slot.filled ? dragState.stickerId !== slot.stickerType : true);

                        // Get display icon
                        let icon;
                        if (slot.filled) {
                            const actualType = slot.filledStickerType || slot.stickerType;
                            const info = getStickerTypeInfo(actualType);
                            icon = info?.icon || '?';
                        } else {
                            icon = stickerInfo?.icon || '?';
                        }

                        // Click handler
                        const handleClick = () => {
                            if (slot.filled) {
                                unfillSlot(card.id, 0);
                            } else {
                                const match = inventory.find(item => item.isSticker && item.stickerId === slot.stickerType);
                                if (match) fillSlot(card.id, 0, match.uid);
                            }
                        };

                        // Drag start for filled danger slot
                        const handleFilledDragStartDanger = (e) => {
                            const actualType = slot.filledStickerType || slot.stickerType;
                            const info = getStickerTypeInfo(actualType);
                            handleDragStart({
                                stickerUid: slot.filledStickerUid,
                                stickerId: actualType,
                                stickerIcon: info?.icon || '?',
                                source: { cardId: card.id, slotIndex: 0 },
                            });
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', info?.icon || '?');
                        };

                        return (
                            <div
                                key={card.id}
                                draggable={slot.filled}
                                onDragStart={slot.filled ? handleFilledDragStartDanger : undefined}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; handleSlotDragOver(card.id, 0); }}
                                onDragLeave={() => handleSlotDragLeave()}
                                onDrop={(e) => { e.preventDefault(); handleSlotDrop(card.id, 0); }}
                                onClick={handleClick}
                                className={`relative w-8 h-8 rounded-lg border-2 flex items-center justify-center text-base transition-all select-none ${
                                    slot.filled
                                        ? 'border-emerald-400 bg-emerald-50 shadow-sm cursor-grab hover:border-red-300 hover:bg-red-50 active:cursor-grabbing'
                                        : isDragValid
                                            ? 'border-emerald-400 bg-emerald-100 scale-110 shadow-md ring-2 ring-emerald-300'
                                            : isDragInvalid
                                                ? 'border-red-300 bg-red-50'
                                                : hasMatch
                                                    ? 'border-dashed border-amber-400 bg-amber-50/50 cursor-pointer hover:border-amber-500 hover:bg-amber-100 hover:scale-110 animate-pulse'
                                                    : dragState && !slot.filled && dragState.stickerId === slot.stickerType
                                                        ? 'border-dashed border-emerald-400 bg-emerald-50/50 scale-105'
                                                        : 'border-dashed border-red-300 bg-red-50/50 cursor-not-allowed animate-pulse'
                                }`}
                                title={slot.filled
                                    ? t('拖拽移动或点击取回')
                                    : hasMatch
                                        ? `${t('拖拽填入或点击填入')} ${stickerInfo?.icon || ''} ${t(stickerInfo?.name || '')}`
                                        : `${t('需要')} ${stickerInfo?.icon || ''} ${t(stickerInfo?.name || '')}`
                                }
                            >
                                <span className={slot.filled ? '' : 'opacity-40'}>{icon}</span>
                                {slot.filled && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                                        <span className="text-white text-[6px] font-black">✓</span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Status summary */}
                {dangerCards.every(c => isCardComplete(c)) && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">{t('已化解')}</span>
                )}
            </div>
        );
    }

    // --- Profit Cards — bottom persistent bar ---
    function renderProfitCards() {
        if (profitCards.length === 0) return null;
        return (
            <div className="mt-4 bg-white rounded-xl shadow-md border border-blue-200" onDragEnd={handleDragEnd}>
                <div className="px-4 py-2 border-b border-blue-100 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-400">💎 {t('利润卡')}</h3>
                    <span className="text-[10px] text-blue-300 font-medium">{profitCards.length}</span>
                </div>
                <div className="p-3 flex gap-3 overflow-x-auto">
                    {profitCards.map(card => (
                        <div key={card.id} className="flex-shrink-0 w-48">
                            <SlotCardUI
                                card={card}
                                inventory={inventory}
                                onFillSlot={fillSlot}
                                onUnfillSlot={unfillSlot}
                                onRemove={removeSlotCard}
                                t={t}
                                dragState={dragState}
                                onDragStart={handleDragStart}
                                onSlotDragOver={handleSlotDragOver}
                                onSlotDrop={handleSlotDrop}
                                onSlotDragLeave={handleSlotDragLeave}
                                dragOverSlot={dragOverSlot}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Inventory render helper ---
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
            <div
                ref={inventoryRef}
                className={`bg-white rounded-lg shadow-sm border transition-all ${
                    dragOverInventory && dragState?.source !== 'inventory'
                        ? 'ring-2 ring-blue-300 bg-blue-50/30'
                        : ''
                }`}
                onDragOver={(e) => {
                    if (dragState && dragState.source !== 'inventory') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverInventory(true);
                    }
                }}
                onDragLeave={(e) => {
                    // Only clear if leaving the container, not entering a child
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverInventory(false);
                    }
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOverInventory(false);
                    handleInventoryDrop();
                }}
                onDragEnd={handleDragEnd}
            >
                <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('背包')}</h3>
                        <span className="text-[10px] font-medium">
                            <span className="text-blue-400">{inventory.length}</span>
                            {filledSlotCount > 0 && <span className="text-amber-400"> +{filledSlotCount}</span>}
                            <span className="text-gray-300"> /{maxInventorySize}</span>
                        </span>
                    </div>
                    {/* Capacity bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                        {inventory.length > 0 && (
                            <div className="bg-blue-300 transition-all" style={{ width: `${(inventory.length / maxInventorySize) * 100}%` }} />
                        )}
                        {filledSlotCount > 0 && (
                            <div className="bg-amber-300 transition-all" style={{ width: `${(filledSlotCount / maxInventorySize) * 100}%` }} />
                        )}
                    </div>
                </div>
                <div className="p-2">
                    {/* Drop-here hint when dragging from a slot */}
                    {dragState && dragState.source !== 'inventory' && (
                        <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <span className="text-[10px] text-blue-500 font-bold">{t('拖到此处取回印花')}</span>
                        </div>
                    )}
                    {/* Sticker summary — quick check for pool entry affordability */}
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
                                        <span>×{count}</span>
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
                    <div className="grid grid-cols-5 gap-1">
                        {(() => {
                            // Build ghost items from filled slots across all cards
                            const ghostItems = [];
                            slotCards.forEach(card => {
                                card.slots.forEach(slot => {
                                    if (slot.filled) {
                                        const stickerType = slot.filledStickerType || slot.stickerType;
                                        const info = STICKER_TYPES.find(s => s.id === stickerType);
                                        ghostItems.push({
                                            icon: info?.icon || '?',
                                            name: info?.name || stickerType,
                                            isGhost: true,
                                        });
                                    }
                                });
                            });

                            return Array.from({ length: maxInventorySize }).map((_, i) => {
                                const item = inventory[i];
                                const ghostIdx = i - inventory.length;
                                const ghost = !item && ghostIdx >= 0 && ghostIdx < ghostItems.length ? ghostItems[ghostIdx] : null;
                                const canReplace = pendingItem && item && !recycleMode;
                                const isRecycleSelected = recycleMode && recycleSelected.has(i);
                                const isDraggableSticker = item?.isSticker && !recycleMode && !pendingItem;
                                const isBeingDragged = dragState?.source === 'inventory' && dragState?.stickerUid === item?.uid;

                                if (ghost) {
                                    return (
                                        <div key={i} className="relative opacity-30 pointer-events-none select-none" title={`${t(ghost.name)} (${t('在卡槽中')})`}>
                                            <GameCard icon={ghost.icon} label={t(ghost.name)} sticker size="md"
                                                className="border-amber-300 bg-amber-50/50" />
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={i}
                                        draggable={isDraggableSticker}
                                        onDragStart={isDraggableSticker ? (e) => {
                                            handleDragStart({
                                                stickerUid: item.uid,
                                                stickerId: item.stickerId,
                                                stickerIcon: item.icon,
                                                source: 'inventory',
                                            });
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setData('text/plain', item.icon);
                                        } : undefined}
                                        onDragEnd={handleDragEnd}
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
                                            ${isBeingDragged ? 'opacity-40 scale-95' : ''}
                                            ${isRecycleSelected ? 'scale-95 opacity-60' : ''}
                                            ${isDraggableSticker ? 'cursor-grab active:cursor-grabbing' : ''}
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
                            });
                        })()}
                    </div>
                </div>
            </div>
        );
    }
};

export default GameCore;
