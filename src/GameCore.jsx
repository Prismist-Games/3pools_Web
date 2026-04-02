import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, RotateCcw, X, Flag, Power, ChevronsUp, ChevronUp, ChevronDown, Check, Trash2, Package, RefreshCw, Star, Hand, Layers, Repeat, Send, AlertCircle, Zap, ListOrdered } from 'lucide-react';

import { useGameLogic } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { SkillSelectionModal } from './components/game/SkillSelectionModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { InventorySlot } from './components/game/InventorySlot';
import ResourceMatrix from './components/game/ResourceMatrix';

import { OrderCard } from './components/game/OrderCard';
import HostDialogue from './components/game/HostDialogue';
import { SKILL_DEFINITIONS, HOME_STATS } from './data/constants';

// --- Doom Grid Tooltip (Portal, same style as ToolItemTooltip) ---
const DoomGridTooltip = ({ isDanger, anchorRef, visible }) => {
    const { t } = useLanguage();
    const [pos, setPos] = useState(null);
    useLayoutEffect(() => {
        if (!visible || !anchorRef.current) { setPos(null); return; }
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({ top: rect.top + window.scrollY - 8, left: rect.left + window.scrollX + rect.width / 2 });
    }, [visible, anchorRef]);
    if (!visible || !pos) return null;
    return createPortal(
        <div style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)', zIndex: 99999, pointerEvents: 'none' }}
            className="animate-in fade-in zoom-in-95 duration-150">
            <div className={`bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border ${isDanger ? 'border-red-400/30' : 'border-slate-600'} min-w-[140px] max-w-[200px]`}>
                <div className="flex items-center gap-2 mb-1 border-b border-slate-700 pb-1">
                    <span className="text-lg">{isDanger ? '☠️' : '·'}</span>
                    <span className={`font-black text-sm ${isDanger ? 'text-red-300' : 'text-slate-400'}`}>{isDanger ? t("危险") : t("空格")}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isDanger ? t("厄运结算命中时 -1 生命值") : t("厄运结算命中时无效果")}
                </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
            </div>
        </div>,
        document.body
    );
};

const DoomGridCell = ({ cell, children }) => {
    const ref = useRef(null);
    const [show, setShow] = useState(false);
    return children(ref, show, setShow);
};

// --- Header stat tooltip (Portal, same dark style) ---
const HeaderTooltip = ({ text, children, className }) => {
    const ref = useRef(null);
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        if (!show || !ref.current) { setPos(null); return; }
        const rect = ref.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }, [show]);

    return (
        <div ref={ref} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className={className}>
            {children}
            {show && pos && createPortal(
                <div style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 99999, pointerEvents: 'none' }}
                    className="animate-in fade-in zoom-in-95 duration-150">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0">
                        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-slate-900" />
                    </div>
                    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-slate-700 max-w-[220px]">
                        <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const GameCore = ({ config, onOpenSettings, showSettings, debugMode, setDebugMode, onReset, initialSkills = [], initialScore = 0, debugAddItem, onDebugAddItemHandled }) => {
    const { t, language, toggleLanguage } = useLanguage();
    const [isSkillsCollapsed, setIsSkillsCollapsed] = useState(true);
    const [gridRefreshMode, setGridRefreshMode] = useState(false);
    const [storageOpen, setStorageOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null); // 'kitchen' | 'bathroom' | 'garden' | 'living' | null

    // Refs for fly animation
    const matrixRef = useRef(null);
    const inventoryRef = useRef(null);
    const [flyingItem, setFlyingItem] = useState(null);

    // Refs for room popup positioning
    const roomRefs = useRef({});

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
        hp, doomGrid, doomLevel, doomHitCount, isDoomResolving, doomResolutionState, doomGridHighlight,
        score, currentStageConfig, maxInventorySize,
        drawCount, matrix, gravityEvent, lastDraw, isDrawing, explodingCells, orders, orderRefreshCount, REFRESH_MAX, orderCandidates, orderCandidateQueue, inventory,
        pendingItem, pendingQueue, selectedSlot,
        hoveredItemName, hoveredSlotIndex,
        isSubmitMode, isRecycleMode, selectedIndices,
        modalContent, selectionMode,
        skills, skillSelectionCandidates, skillState,
        toast, satisfiableOrders, totalRecycleValue, selectedItemNames,
        orderSlotAssignments, assignedItemUids, phantomMarks,
        toolSelectionMode,
        gamePhase, showDrawsThisRound, DRAWS_PER_ROUND,
        day, tvWatchedToday,
        deliveryItems, deliveryRevealed,
        hostCommentKey,
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
        selectRowOrColumn,
        handleSelectionSelect,
        handleSelectionCancel,
        handleConfirmRecycle,
        handleSortInventory,
        handleEvacuate,
        debugGetOrderItems,
        handleToolItemUse,
        handleUnassignFromOrder,
        handleOrderSlotClick,
        handleCancelToolSelection,
        handleGridRefresh,
        tickDoomResolution,
        completeDoomResolution,
        startShow,
        beginDrawing,
        goHome,
        confirmGoHome,
        openDelivery,
        collectDelivery,
        sleep,
    } = actions;

    // Grid refresh mode: intercept inventory clicks
    const wrappedSlotClick = useCallback((index) => {
        if (gridRefreshMode) {
            const item = inventory[index];
            if (item && item.rarity.bonus >= 0.25) {
                handleGridRefresh(index);
                setGridRefreshMode(false);
            } else {
                actions.showToast(t("需要稀有及以上品质的物品"), "error");
            }
            return;
        }
        handleSlotClick(index);
    }, [gridRefreshMode, inventory, handleGridRefresh, handleSlotClick]);

    const { hasSkill } = helpers;

    // Room labels
    const ROOM_LABELS = {
        kitchen: '厨房',
        bathroom: '厕所',
        garden: '花园',
        living: '客厅',
        bedroom: '卧室',
        storage: '仓库',
    };
    // Filter orders by room (using roomId field from ROOM_NEEDS)
    const getOrdersForRoom = (roomId) => {
        if (!roomId) return [];
        return orders
            .map((order, idx) => ({ order, idx }))
            .filter(({ order }) => {
                if (!order) return false;
                return order.roomId === roomId;
            });
    };
    const roomOrderCounts = {
        kitchen: getOrdersForRoom('kitchen').length,
        bathroom: getOrdersForRoom('bathroom').length,
        garden: getOrdersForRoom('garden').length,
        living: getOrdersForRoom('living').length,
        bedroom: getOrdersForRoom('bedroom').length,
        storage: getOrdersForRoom('storage').length,
    };

    // Doom resolution spinning animation
    useEffect(() => {
        if (!doomResolutionState || doomResolutionState.phase !== 'spinning') return;
        // Speed: starts fast (80ms), slows to 200ms near end
        const progress = doomResolutionState.tick / doomResolutionState.totalTicks;
        const interval = 80 + progress * 160; // 80ms → 240ms
        const timer = setTimeout(() => {
            tickDoomResolution();
        }, interval);
        return () => clearTimeout(timer);
    }, [doomResolutionState]);

    // Fly animation: starts immediately from the picked cell, gravity follows after
    const lastDrawTickRef = useRef(null);
    useEffect(() => {
        if (!lastDraw || lastDraw.tick === lastDrawTickRef.current) return;
        lastDrawTickRef.current = lastDraw.tick;

        // Special cells don't fly to inventory
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

    // Room click handler
    const handleRoomClick = (roomId, e) => {
        e?.stopPropagation();
        if (selectedRoom === roomId) {
            setSelectedRoom(null);
        } else {
            setSelectedRoom(roomId);
            // Store clicked element rect for popup positioning
            if (e?.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                roomRefs.current[roomId] = rect;
            }
        }
    };

    // Render room needs floating popup (portal)
    const renderRoomPopup = () => {
        if (!selectedRoom || !roomRefs.current[selectedRoom]) return null;
        const rect = roomRefs.current[selectedRoom];
        const roomOrders = getOrdersForRoom(selectedRoom);
        if (roomOrders.length === 0) return null;

        return createPortal(
            <div
                style={{
                    position: 'fixed',
                    top: rect.bottom + 8,
                    left: rect.left + rect.width / 2,
                    transform: 'translateX(-50%)',
                    zIndex: 99990,
                }}
                className="animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Arrow */}
                <div className="absolute -top-[6px] left-1/2 -translate-x-1/2">
                    <div className="w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-white" />
                </div>
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 min-w-[220px] max-w-[320px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-600">{t(ROOM_LABELS[selectedRoom])}</span>
                        <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {/* Group orders by func */}
                        {Object.entries(
                            roomOrders.reduce((groups, { order, idx }) => {
                                const func = order.func || '其他';
                                if (!groups[func]) groups[func] = [];
                                groups[func].push({ order, idx });
                                return groups;
                            }, {})
                        ).map(([func, items]) => (
                            <div key={func} className="flex flex-col gap-1.5">
                                <div className="text-[11px] font-black text-slate-700 border-b border-slate-100 pb-1">{t(func)}</div>
                                {items.map(({ order, idx }) => (
                                    <div key={order.id} className="flex flex-col gap-1 pl-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {order.requirements.map((req, rIdx) => (
                                                <div key={rIdx} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-xs">
                                                    <span>{req.icon}</span>
                                                    <span className="font-bold text-slate-700">{t(req.name)}</span>
                                                </div>
                                            ))}
                                            <span className="text-[9px] text-slate-400">→</span>
                                            <span className="text-[10px] text-emerald-600 font-bold">{order.effect}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    // Render floor plan (used in both show and home phases)
    const renderFloorPlan = () => {
        const isShow = gamePhase === 'show';
        const s = 1;
        const mockValues = { vitality: 70, warmth: 55, cleanliness: 40, health: 75, hunger: 45, garden_slots: 2, storage_size: 10 };
        const barStats = ['vitality', 'warmth', 'cleanliness', 'health', 'hunger'];
        const countStats = ['garden_slots', 'storage_size'];
        return (
            <div className={`flex flex-col items-center gap-2 ${isShow ? 'py-0' : 'py-2'}`}>
                {gamePhase === 'home' && (
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t("第")} {day} {t("天")}
                    </div>
                )}

                {/* Stats bar */}
                <div className="flex items-center gap-3 flex-wrap justify-center py-1">
                    {Object.entries(HOME_STATS).filter(([k]) => barStats.includes(k)).map(([key, stat]) => {
                        const val = mockValues[key] ?? 50;
                        const barColor = val > 60 ? 'bg-emerald-400' : val > 30 ? 'bg-amber-400' : 'bg-red-400';
                        return (
                            <div key={key} className="flex items-center gap-1.5" title={stat.desc}>
                                <span className="text-sm">{stat.icon}</span>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-500">{stat.name}</span>
                                    <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${val}%` }} />
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">{val}</span>
                            </div>
                        );
                    })}
                    <div className="w-px h-6 bg-slate-200" />
                    {Object.entries(HOME_STATS).filter(([k]) => countStats.includes(k)).map(([key, stat]) => {
                        const val = mockValues[key] ?? 0;
                        return (
                            <div key={key} className="flex items-center gap-1" title={stat.desc}>
                                <span className="text-xs">{stat.icon}</span>
                                <span className="text-[9px] font-bold text-slate-500">{stat.name} {val}{stat.max <= 20 ? `/${stat.max}` : ''}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="relative w-[500px] h-[380px]" style={{ transform: `scale(${s})`, transformOrigin: 'top center', marginBottom: -(380 * (1 - s)) }}>
                    {/* Living room */}
                    <div className="absolute top-0 left-[100px] w-[280px] h-[210px] border-[3px] border-slate-700 bg-stone-100">
                        <div className="absolute inset-0 opacity-[0.03]" style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 12px)',
                        }} />
                        <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-wider">{t("客厅")}</div>
                        {/* TV */}
                        {gamePhase === 'home' && (
                            <button onClick={startShow} disabled={tvWatchedToday}
                                title={tvWatchedToday ? t("今天已经看过节目了") : t("打开电视观看抽奖节目")}
                                className={`absolute top-2 left-[60px] flex flex-col items-center gap-0.5 px-3 py-1 rounded transition-all ${tvWatchedToday ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-amber-200/50 hover:scale-110 active:scale-95 cursor-pointer'}`}>
                                <span className="text-2xl">📺</span>
                                <span className="text-[9px] font-bold">{tvWatchedToday ? t("已看过") : t("电视")}</span>
                            </button>
                        )}
                        {/* Sofa area (living room needs) */}
                        <div onClick={(e) => handleRoomClick('living', e)}
                            className={`absolute top-[70px] left-[50px] w-20 h-16 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-slate-200/50 ${selectedRoom === 'living' ? 'bg-slate-200/50 ring-1 ring-slate-400' : ''}`}>
                            <span className="text-lg">🪑</span>
                            {roomOrderCounts.living > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow">{roomOrderCounts.living}</div>
                            )}
                        </div>
                        {/* Door */}
                        <div className="absolute top-[-3px] right-[40px] w-12 h-[3px] bg-stone-100" />
                        <div className="absolute top-[-16px] right-[32px] text-[9px] font-black text-slate-500 tracking-wider">🚪 {t("家门")}</div>
                        {/* Window */}
                        <div className="absolute bottom-[-3px] left-[120px] w-14 h-[3px] bg-sky-300/60" />
                    </div>

                    {/* Bedroom (room clickable for needs) */}
                    <div onClick={(e) => handleRoomClick('bedroom', e)}
                        className={`absolute top-0 left-0 w-[103px] h-[140px] border-[3px] border-slate-700 bg-blue-50/50 cursor-pointer transition-all hover:bg-blue-100/60 ${selectedRoom === 'bedroom' ? 'ring-2 ring-blue-400' : ''}`}>
                        <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-wider whitespace-nowrap">{t("卧室")}</div>
                        <div className="absolute top-[40px] right-[-3px] w-[3px] h-10 bg-blue-50/50" />
                        {/* Bed (click = sleep, separate from room click) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); if (tvWatchedToday && gamePhase === 'home') sleep(); }}
                            disabled={!tvWatchedToday || gamePhase !== 'home'}
                            className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-all ${
                                tvWatchedToday && gamePhase === 'home'
                                    ? 'text-slate-700 hover:bg-indigo-200/50 hover:scale-110 active:scale-95 cursor-pointer'
                                    : 'text-slate-300 cursor-default'
                            }`}
                        >
                            <span className="text-xl">🛏️</span>
                            {gamePhase === 'home' && <span className="text-[8px] font-bold">{t("睡觉")}</span>}
                        </button>
                        {roomOrderCounts.bedroom > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">{roomOrderCounts.bedroom}</div>
                        )}
                    </div>

                    {/* Storage */}
                    <div onClick={() => { if (gamePhase === 'home') setStorageOpen(!storageOpen); }}
                        title={gamePhase === 'home' ? (storageOpen ? t("点击关闭仓库") : t("点击查看仓库中的物品")) : ''}
                        className={`absolute top-0 left-[377px] w-[120px] h-[210px] border-[3px] border-slate-700 bg-amber-50/50 ${gamePhase === 'home' ? 'cursor-pointer hover:bg-amber-100/60' : ''} transition-all ${storageOpen ? 'ring-2 ring-amber-400' : ''}`}>
                        <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-wider">{t("仓库")}</div>
                        <div className="absolute top-[80px] left-[-3px] w-[3px] h-10 bg-amber-50/50" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <span className="text-2xl">📦</span>
                            <span className="text-[9px] font-bold text-slate-500">{inventory.filter(Boolean).length} {t("件")}</span>
                        </div>
                        {roomOrderCounts.storage > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">{roomOrderCounts.storage}</div>
                        )}
                    </div>

                    {/* Kitchen */}
                    <div onClick={(e) => handleRoomClick('kitchen', e)}
                        className={`absolute top-[207px] left-[240px] w-[140px] h-[120px] border-[3px] border-slate-700 bg-orange-50/50 cursor-pointer transition-all hover:bg-orange-100/60 ${selectedRoom === 'kitchen' ? 'ring-2 ring-orange-400' : ''}`}>
                        <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-wider">{t("厨房")}</div>
                        <div className="absolute top-[-3px] left-[30px] w-10 h-[3px] bg-orange-50/50" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"><span className="text-2xl">🍳</span></div>
                        {roomOrderCounts.kitchen > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">{roomOrderCounts.kitchen}</div>
                        )}
                    </div>

                    {/* Bathroom */}
                    <div onClick={(e) => handleRoomClick('bathroom', e)}
                        className={`absolute top-[207px] left-[100px] w-[143px] h-[120px] border-[3px] border-slate-700 bg-cyan-50/50 cursor-pointer transition-all hover:bg-cyan-100/60 ${selectedRoom === 'bathroom' ? 'ring-2 ring-cyan-400' : ''}`}>
                        <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-wider">{t("厕所")}</div>
                        <div className="absolute top-[-3px] right-[30px] w-10 h-[3px] bg-cyan-50/50" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"><span className="text-2xl">🚿</span></div>
                        {roomOrderCounts.bathroom > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">{roomOrderCounts.bathroom}</div>
                        )}
                    </div>

                    {/* Garden */}
                    <div onClick={(e) => handleRoomClick('garden', e)}
                        className={`absolute top-[137px] left-0 w-[103px] h-[240px] border-[3px] border-dashed border-green-600/50 bg-green-50/30 rounded-sm cursor-pointer transition-all hover:bg-green-100/40 ${selectedRoom === 'garden' ? 'ring-2 ring-green-400' : ''}`}>
                        <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[8px] text-green-600/60 font-bold tracking-wider">{t("花园")}</div>
                        <div className="absolute top-[-3px] left-[25px] w-10 h-[3px] bg-green-50/30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"><span className="text-2xl">🌱</span></div>
                        {roomOrderCounts.garden > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">{roomOrderCounts.garden}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

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
        <div className={`h-screen w-full text-slate-800 font-sans selection:bg-blue-100 overflow-hidden flex flex-col animate-in fade-in duration-500 relative transition-all duration-500 ${
            ['show_intro', 'show', 'show_outro'].includes(gamePhase) ? 'phase-show' : 'phase-home'
        }`}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => actions.hideToast()} />}

            {renderModal()}
            {renderRoomPopup()}

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

                        {/* Debug Phase Switcher */}
                        {debugMode && (
                            <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-red-500/30">
                                {['show_intro', 'show', 'show_outro', 'delivery_knock', 'delivery_open', 'home'].map(phase => (
                                    <button
                                        key={phase}
                                        onClick={() => actions.setGamePhase(phase)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                            gamePhase === phase
                                                ? 'bg-red-500 text-white'
                                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {phase}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden transition-all duration-300">

                    {/* SHOW INTRO OVERLAY */}
                    {gamePhase === 'show_intro' && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="max-w-md w-full">
                                <HostDialogue
                                    phase="show_intro"
                                    day={day}
                                    onStartShow={beginDrawing}
                                />
                            </div>
                        </div>
                    )}


                    {/* SHOW OUTRO OVERLAY */}
                    {gamePhase === 'show_outro' && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="max-w-md w-full">
                                <HostDialogue
                                    phase="show_outro"
                                    day={day}
                                    onContinue={confirmGoHome}
                                />
                            </div>
                        </div>
                    )}

                    {/* DELIVERY KNOCK */}
                    {gamePhase === 'delivery_knock' && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="max-w-md w-full flex flex-col gap-4">
                                <div className="text-center text-3xl animate-bounce">🚪</div>
                                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-xl shrink-0">🧑</div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-slate-500 mb-1">{t("敲门声")}</div>
                                        <p className="text-sm text-slate-700">{t("您好，今天的配给到了。请签收。")}</p>
                                        <button
                                            onClick={() => { openDelivery(); actions.setGamePhase('delivery_open'); }}
                                            className="mt-3 bg-slate-700 text-white font-bold px-6 py-2 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
                                        >
                                            {t("开门签收")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DELIVERY OPEN - unboxing */}
                    {gamePhase === 'delivery_open' && (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="max-w-md w-full flex flex-col items-center gap-6">
                                <div className="text-sm font-bold text-slate-500">{t("今日配给")}</div>
                                {!deliveryRevealed ? (
                                    <button
                                        onClick={openDelivery}
                                        className="w-24 h-24 bg-amber-100 border-2 border-amber-300 rounded-2xl flex items-center justify-center text-5xl hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
                                    >
                                        📦
                                    </button>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            {deliveryItems.map((item, idx) => (
                                                <div key={idx}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 shadow-sm animate-in zoom-in-50 fade-in duration-300 ${item.rarity.color}`}
                                                    style={{ animationDelay: `${idx * 150}ms` }}
                                                >
                                                    <span className="text-3xl">{item.icon}</span>
                                                    <span className="text-[10px] font-bold">{t(item.name)}</span>
                                                    <span className="text-[9px] opacity-60">{t(item.rarity.name)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={collectDelivery}
                                            className="bg-emerald-500 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                                        >
                                            📥 {t("放入仓库")}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MAIN CONTENT AREA */}
                    {(gamePhase === 'show' || gamePhase === 'home') && (
                    <section className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* MAIN SCROLLABLE AREA */}
                        <div className={`flex-1 flex p-3 lg:p-4 relative overflow-hidden ${gamePhase === 'show' ? 'flex-row gap-3' : 'flex-col'}`}>

                            {/* Show: Left = floor plan (separate from TV) */}
                            {gamePhase === 'show' && (
                                <div className="flex-none flex flex-col items-center gap-2 overflow-y-auto pr-3 border-r border-slate-200/50 w-[520px]">
                                    {renderFloorPlan()}
                                </div>
                            )}

                            {/* Main content column */}
                            <div className={`flex flex-col gap-3 flex-1 justify-center items-center ${gamePhase === 'show' ? 'overflow-y-auto' : ''}`}>

                                {/* Show: HP + Doom + host + stop button */}
                                {gamePhase === 'show' && (
                                    <div className="w-full flex flex-col gap-2 items-center">
                                        {/* HP & Doom inline */}
                                        <div className="flex items-center gap-6 bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700">
                                            <div className="flex items-center gap-1.5">
                                                {Array.from({ length: config.doom?.initialHP || 3 }).map((_, i) => (
                                                    <span key={i} className={`text-lg transition-all duration-300 ${i < hp ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'opacity-30'}`}>
                                                        {i < hp ? '❤️' : '🖤'}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="w-px h-6 bg-slate-600" />
                                            <div className="flex items-center gap-1.5 text-violet-400">
                                                <ChevronsUp size={16} />
                                                <span className="text-sm font-black font-mono">LV.{doomLevel}</span>
                                                <span className="text-[9px] text-red-400 font-bold">({(config.doom?.hitsPerLevelUp || 3) - doomHitCount})</span>
                                            </div>
                                        </div>
                                        <HostDialogue
                                            phase="show"
                                            day={day}
                                            showContext={{
                                                drawCount: showDrawsThisRound,
                                                lastDrawnItem: lastDraw?.item,
                                                lastDrawRarity: lastDraw?.rarity?.id,
                                                inventoryCount: inventory.filter(Boolean).length,
                                                commentKey: hostCommentKey,
                                            }}
                                        />
                                        <button
                                            onClick={goHome}
                                            disabled={isDrawing || !!pendingItem || isDoomResolving || pendingQueue.length > 0}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {t("停止抽取")}
                                        </button>
                                    </div>
                                )}

                                {/* Room floor plan (home only - show uses left panel) */}
                                {gamePhase === 'home' && renderFloorPlan()}

                                {/* Doom Grid Display (show phase only) */}
                                {gamePhase === 'show' && (<>
                                {/* Doom Grid Display */}
                                <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isDoomResolving ? 'scale-110' : ''}`}>
                                    {/* Doom resolution banner */}
                                    {isDoomResolving && (
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 text-white rounded-full font-black text-sm animate-pulse shadow-lg shadow-violet-300">
                                            <span>⚡ {t("厄运结算")} LV.{doomLevel}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                        {doomGrid.map((cell, i) => {
                                            const cursorCount = doomResolutionState
                                                ? doomResolutionState.spinningPositions.filter(p => p === i).length
                                                : 0;
                                            const isSettled = doomResolutionState?.phase === 'settled';
                                            const isSpinning = doomResolutionState?.phase === 'spinning';
                                            const isDanger = cell.type === 'danger';
                                            const isNewlyLoaded = doomGridHighlight && doomGridHighlight.has(i);
                                            return (
                                                <DoomGridCell key={i} cell={cell}>
                                                    {(cellRef, showTip, setShowTip) => (
                                                        <div
                                                            ref={cellRef}
                                                            onMouseEnter={() => setShowTip(true)}
                                                            onMouseLeave={() => setShowTip(false)}
                                                            className={`relative w-9 h-9 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                                                isSpinning ? 'duration-75' : 'duration-300'
                                                            } ${
                                                                cursorCount > 0
                                                                    ? isSettled
                                                                        ? isDanger
                                                                            ? 'ring-3 ring-red-400 scale-125 z-10 bg-red-200 border-red-500'
                                                                            : 'ring-3 ring-green-400 scale-125 z-10 bg-green-200 border-green-500'
                                                                        : 'ring-2 ring-yellow-400 scale-110 z-10'
                                                                    : ''
                                                            } ${
                                                                isNewlyLoaded
                                                                    ? 'bg-red-300 border-red-600 scale-110 ring-2 ring-red-400 animate-pulse z-10'
                                                                    : isDanger
                                                                        ? 'bg-red-50 border-red-400'
                                                                        : 'bg-slate-50 border-slate-200'
                                                            }`}
                                                        >
                                                            <span className="text-sm leading-none">{isDanger ? '☠️' : ''}</span>
                                                            {isDanger && <span className="text-[7px] font-black text-red-500 leading-none">{t("危险")}</span>}
                                                            {cursorCount > 0 && (
                                                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 rounded-full text-[8px] font-black text-yellow-900 flex items-center justify-center shadow border border-yellow-500">
                                                                    {cursorCount > 1 ? cursorCount : '▼'}
                                                                </div>
                                                            )}
                                                            <DoomGridTooltip isDanger={isDanger} anchorRef={cellRef} visible={showTip && !isDoomResolving} />
                                                        </div>
                                                    )}
                                                </DoomGridCell>
                                            );
                                        })}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t("厄运网格")}</span>
                                    {/* Settled: show results and confirm button */}
                                    {doomResolutionState?.phase === 'settled' && (
                                        <div className="flex flex-col items-center gap-2 mt-1">
                                            <div className="flex gap-1.5">
                                                {doomResolutionState.finalSelections.map((sel, i) => (
                                                    <span key={i} className={`text-lg ${sel.type === 'danger' ? 'animate-bounce' : ''}`}>
                                                        {sel.type === 'danger' ? '💀' : '✅'}
                                                    </span>
                                                ))}
                                            </div>
                                            <button onClick={completeDoomResolution}
                                                className="px-5 py-1.5 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow">
                                                {t("确认")}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Item Matrix with Row/Column Selection */}
                                <ResourceMatrix
                                    ref={matrixRef}
                                    matrix={matrix}
                                    gravityEvent={gravityEvent}
                                    pickingCell={isDrawing && lastDraw ? { row: lastDraw.row, col: lastDraw.col } : null}
                                    explodingCells={explodingCells}
                                    onSelectRow={(rowIdx) => selectRowOrColumn('row', rowIdx)}
                                    onSelectCol={(colIdx) => selectRowOrColumn('col', colIdx)}
                                    disabled={isDrawing || !!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || !!orderCandidates || isDoomResolving}
                                    orders={orders}
                                    inventory={inventory}
                                />

                                {/* Grid Refresh Button */}
                                <div className="flex justify-center mt-2">
                                    {!gridRefreshMode ? (
                                        <button
                                            onClick={() => {
                                                if (inventory.some(i => i && i.rarity.bonus >= 0.25)) {
                                                    setGridRefreshMode(true);
                                                } else {
                                                    actions.showToast(t("没有稀有及以上品质的物品可用"), "error");
                                                }
                                            }}
                                            disabled={isDrawing || !!pendingItem || isSubmitMode || isRecycleMode || !!selectionMode || !!orderCandidates || isDoomResolving}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw size={14} />
                                            {t("刷新网格")}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-blue-600 animate-pulse">{t("选择一个稀有+物品消耗")}</span>
                                            <button onClick={() => setGridRefreshMode(false)}
                                                className="px-2 py-1 rounded text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
                                                {t("取消")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>)}
                            </div>

                        </div>

                        {/* BOTTOM UI - Storage/Inventory (always in show, toggle in home) */}
                        {(gamePhase === 'show' || storageOpen) && (
                        <div className={`
                    flex-none w-full p-4 border-t-2 border-slate-200 bg-white/95 backdrop-blur shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-colors duration-300 relative
                    ${pendingItem ? 'bg-red-50/95 border-red-200' : ''}
                    ${isSubmitMode ? 'bg-blue-50/95 border-blue-200' : ''}
                    ${isRecycleMode ? 'bg-amber-50/95 border-amber-200' : ''}
                    ${selectionMode?.type === 'trade_in' ? 'bg-purple-50/95 border-purple-200' : ''}
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
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("仓库")} ({inventory.length}/{maxInventorySize})</h2>
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
                                {selectedSlot !== null && !pendingItem && !isSubmitMode && !isRecycleMode && !selectionMode && (
                                    <span className="text-xs font-bold text-blue-500 animate-pulse bg-blue-50 px-2 py-1 rounded flex items-center gap-2">
                                        <Hand size={14} /> {t("整理模式")}
                                    </span>
                                )}
                                {isSubmitMode && (
                                    <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                                        <Layers size={14} /> {t("提交模式: 点击订单卡片可一键选择")}
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
                                <div ref={inventoryRef} className="flex flex-wrap gap-2 justify-center max-w-full">
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

                                        // Badge Logic: Scans all orders (including emergency order)
                                        const activeReqs = [
                                            ...orders.filter(Boolean).flatMap(o => o.requirements),
                                                                                    ];
                                        const matchedReqs = item ? activeReqs.filter(r => r.name === item.name) : [];
                                        const isNeeded = matchedReqs.length > 0;
                                        const isMaxSatisfied = isNeeded && matchedReqs.some(r => item.rarity.bonus >= r.requiredRarity.bonus);

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
                                                isSubmitMode={isSubmitMode}
                                                isRecycleMode={isRecycleMode}
                                                isSelectionMode={!!selectionMode && selectionMode.type !== 'trade_in'}
                                                isReference={selectionMode?.type === 'trade_in' || !!toolSelectionMode}

                                                canSynthesize={canSynthesize || isToolTarget}
                                                isNeededForOrder={isNeeded}
                                                isMaxSatisfied={isMaxSatisfied}
                                                hasUpgradePair={hasUpgradePair}
                                                isOverloadTarget={isOverloadTarget}

                                                onClick={wrappedSlotClick}
                                                onContextMenu={handleToolItemUse}
                                                onMouseEnter={(i, item) => { state.setHoveredSlotIndex(i); if (item) state.setHoveredItemName(item.name); }}
                                                onMouseLeave={() => { state.setHoveredSlotIndex(null); state.setHoveredItemName(null); }}
                                                isHovered={hoveredSlotIndex === idx}
                                                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
                                                nextDrawEnhanced={skillState?.nextDrawEnhanced}
                                                isAssigned={item && assignedItemUids.has(item.uid)}
                                            />
                                        )
                                    })}
                                </div>

                                {/* Action Buttons (home only) */}
                                {gamePhase !== 'show' && (
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
                                            <button onClick={handleConfirmSubmission} disabled={selectedIndices.length === 0} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl shadow-md ${selectedIndices.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
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

                                    {selectionMode?.type === 'trade_in' && (
                                        <button onClick={handleSelectionCancel} className="w-full bg-white border border-slate-300 text-slate-600 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-slate-50">{t("取消")}</button>
                                    )}
                                    {toolSelectionMode && (
                                        <button onClick={handleCancelToolSelection} className="w-full bg-white border border-cyan-300 text-cyan-700 font-bold py-2 px-6 rounded-xl shadow-sm hover:bg-cyan-50 flex items-center justify-center gap-2">
                                            <X size={14} /> {t("取消工具使用")}
                                        </button>
                                    )}
                                </div>
                                )}

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
                                                            const activeReqs = [
                                                                ...orders.filter(Boolean).flatMap(o => o.requirements),
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
                                                                    onClick={wrappedSlotClick}
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
                                                    const activeReqs = [
                                                        ...orders.filter(Boolean).flatMap(o => o.requirements),
                                                                                                            ];
                                                    const matchedReqs = activeReqs.filter(r => r.name === qItem.name);
                                                    const isNeeded = matchedReqs.length > 0;
                                                    const isMaxSatisfied = isNeeded && matchedReqs.some(r => qItem.rarity.bonus >= r.requiredRarity.bonus);

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
                        </div>
                        )}
                    </section>
                    )}
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
