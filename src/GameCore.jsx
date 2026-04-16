import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import WallPicker from './components/game/WallPicker';
import BulletinBoard, { SCORE_STYLE, RewardCard, IngredientTip, DIFFICULTY_STYLE } from './components/game/BulletinBoard';
import Tooltip from './components/ui/Tooltip';
// ActiveOrders removed — order submit is now on BulletinBoard directly
import ScoreBoard from './components/game/ScoreBoard';
import DispatchJudgment from './components/game/DispatchJudgment';
import AICooking, { pickRandomCustomer } from './components/game/AICooking';
import Kitchen from './components/game/Kitchen';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';
import { STICKER_TYPES, INGREDIENTS, DISHES } from './data/v2Config';
import { FateWall } from './components/game/FateWall';
import { FateWallPlacementModal } from './components/game/FateWallPlacementModal';
import { FateWallLuckModal } from './components/game/FateWallLuckModal';

const GameCore = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const inventoryRef = useRef(null);
    const bulletinRef = useRef(null);
    const [hoveredStickerIds, setHoveredStickerIds] = useState(null);
    const [recycleMode, setRecycleMode] = useState(false);
    const [recycleSelected, setRecycleSelected] = useState(new Set());
    const [synthesizeMode, setSynthesizeMode] = useState(false);
    const [synthesizeSelected, setSynthesizeSelected] = useState(new Set());
    const [actionHint, setActionHint] = useState('recycle');
    const [debugOpen, setDebugOpen] = useState(false);
    const [debugSelectedItem, setDebugSelectedItem] = useState(null);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [aiCookingOpen, setAiCookingOpen] = useState(false);
    const [aiCustomer, setAiCustomer] = useState(pickRandomCustomer);
    const [kitchenOpen, setKitchenOpen] = useState(false);
    const [kitchenDishIdx, setKitchenDishIdx] = useState(0);

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
        hp, doomLevel,
        inventory, maxInventorySize, pendingItem, pendingItems,
        toast, clearToast, modalContent,
        flyingItem, setFlyingItem,
        drawAnimState, isDrawAnimating,
        startGame, selectRow, selectColumn, endTurn, continueToNextTurn, selectWall,
        handleEvacuate, handleReset, startNextExpedition,
        tickDrawAnim, completeDrawAnim,
        replaceInventoryItem, discardInventoryItem, synthesizeItems, discardPendingItem, debugAddItem,
        bulletinBoard, pendingChosenOrder,
        submitOrder, canSubmitOrder,
        incomingOrder, confirmIncomingOrder, discardIncomingOrder, replaceBulletinOrder,
        debugAddStorageItems,
        fateWall, pendingCharm, confirmCharmPlacement,
        luckPhase, luckResult, handleLuckSelect, confirmLuck,
    } = state;

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
                        <h1 className="text-base font-black tracking-tight">{t('梦想厨房')}</h1>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                                Day {expeditionNumber}
                            </span>
                            <button onClick={toggleLanguage} className="text-[11px] font-bold ml-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
                            <button onClick={handleReset} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-500 border border-red-200 hover:bg-red-200 transition-colors">{t('重置')}</button>
                            <button onClick={() => setDispatchOpen(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-800 text-amber-200 border border-amber-600 hover:bg-amber-700 transition-colors">{t('派遣')}</button>
                            <button onClick={() => setAiCookingOpen(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-600 text-orange-100 border border-orange-500 hover:bg-orange-500 transition-colors">🍳 AI炼菜</button>
                            <button onClick={() => setKitchenOpen(true)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-red-100 border border-red-500 hover:bg-red-500 transition-colors">🍳 厨房</button>
                            <button onClick={() => setDebugOpen(prev => !prev)} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
                        </div>
                    </div>
                    {/* Row 2: HP as hearts */}
                    <div className="flex items-center gap-1 px-4 py-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-base">{i < hp ? '❤️' : '🤍'}</span>
                        ))}
                    </div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('梦想厨房')}</h2>
                        <p className="text-gray-500 mb-6">{t('回合制原型')} v2</p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始')} Day {expeditionNumber + 1}
                        </button>
                    </div>
                )}

                {/* Gameplay phases — single persistent sidebar layout */}
                {(phase === 'incoming_order' || phase === 'wall_choice' || phase === 'luck_draw' || phase === 'drawing' || phase === 'between_turns') && (
                    <div className="flex gap-4">
                        {/* LEFT SIDEBAR */}
                        <div className="w-60 flex-shrink-0 flex flex-col gap-4 self-start" ref={bulletinRef}>
                            {bulletinBoard && (
                                <BulletinBoard
                                    orders={bulletinBoard}
                                    inventory={inventory}
                                    onSubmit={submitOrder}
                                    canSubmitOrder={canSubmitOrder}
                                    incomingOrder={phase !== 'incoming_order' ? incomingOrder : null}
                                    onConfirmIncoming={confirmIncomingOrder}
                                    onDiscardIncoming={discardIncomingOrder}
                                    pendingChosenOrder={pendingChosenOrder}
                                    onReplaceIncoming={replaceBulletinOrder}
                                    hoveredStickerIds={hoveredStickerIds}
                                    bonusItemMap={bonusItemMap}
                                />
                            )}
                        </div>

                        {/* CENTER — changes by phase */}
                        <div className="flex-1 min-w-0">
                            {/* Incoming order phase — two candidates to choose from */}
                            {phase === 'incoming_order' && incomingOrder && incomingOrder.candidates && (
                                <div className="flex justify-center py-8">
                                    <div className="bg-white rounded-xl shadow-lg border-2 border-blue-300 p-6 max-w-lg text-center self-start">
                                        <h2 className="text-base font-bold mb-1">{t('新订单')}</h2>
                                        <p className="text-[11px] text-gray-400 mb-4">{t('选择一个加入货架')}</p>
                                        <div className="flex gap-4 mb-4">
                                            {incomingOrder.candidates.map((candidate, ci) => {
                                                const ds = DIFFICULTY_STYLE[candidate.difficulty] || DIFFICULTY_STYLE.easy;
                                                return (
                                                    <button key={candidate.id}
                                                        onClick={() => confirmIncomingOrder(candidate)}
                                                        className="flex-1 p-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="text-[9px] text-gray-300">{t('难度')}</span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>{t(candidate.difficulty)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mb-2">
                                                            <span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">{t('奖励')}</span>
                                                            {candidate.rewards.map((r, i) => (
                                                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                                                            ))}
                                                        </div>
                                                        {candidate.requirements && candidate.requirements.length > 0 && (
                                                            <div className="flex gap-1.5 flex-wrap items-center">
                                                                <span className="text-[9px] text-gray-300 uppercase tracking-wide">{t('需要')}</span>
                                                                {candidate.requirements.map((req, i) => (
                                                                    <div key={i} className="flex items-center gap-0.5">
                                                                        <div className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-xs shadow-sm">
                                                                            {req.icon}
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-gray-500">x{req.count}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button onClick={discardIncomingOrder}
                                            className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">
                                            {t('放弃')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Wall choice phase */}
                            {phase === 'wall_choice' && wallCandidates && (
                                <WallPicker candidates={wallCandidates} onSelect={selectWall} />
                            )}

                            {/* Drawing phase */}
                            {phase === 'drawing' && matrix && (
                                <div className="flex flex-col items-center">
                                    <ResourceMatrix
                                        matrix={matrix}
                                        onSelectRow={selectRow}
                                        onSelectColumn={selectColumn}
                                        gold={gold}
                                        drawCost={INITIAL_GAME_CONFIG.turn.drawCost}
                                        phase={phase}
                                        disabled={isDrawAnimating || pendingItems.length > 0}
                                        drawAnimState={drawAnimState}
                                        wallType={currentWallType}
                                        lastDrawDirection={lastDrawDirection}
                                        onHoverStickerIds={setHoveredStickerIds}
                                        bonusItemMap={bonusItemMap}
                                    />

                                    {/* Draw result feedback */}
                                    {lastDrawResult && !isDrawAnimating && (
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

                                    {/* Remaining draws + end button */}
                                    <div className="mt-4">
                                        <div className="mb-2 text-center">
                                            <span className="text-sm font-bold text-gray-600">{t('剩余抽取')}: </span>
                                            <span className="text-lg font-black text-amber-600">{gold}</span>
                                            <span className="text-sm text-gray-400"> / 5</span>
                                        </div>
                                        <button
                                            onClick={endTurn}
                                            disabled={isDrawAnimating || pendingItems.length > 0}
                                            className={`w-full px-6 py-2 rounded-lg font-bold transition-colors ${
                                                isDrawAnimating || pendingItems.length > 0
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-gray-700 text-white hover:bg-gray-800'
                                            }`}
                                        >
                                            {t('结束抽奖')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Between turns */}
                            {phase === 'between_turns' && (
                                <div className="text-center py-8">
                                    <h2 className="text-xl font-bold mb-3">{t('抽奖结束')}</h2>
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i} className="text-lg">{i < hp ? '❤️' : '🤍'}</span>
                                        ))}
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4">
                                        {t('厄运等级')}: 💀 Lv.{doomLevel}
                                    </p>
                                    <p className="text-gray-400 text-sm mb-6">
                                        {t('下次进入抽奖将添加一个厄运标记')}
                                    </p>

                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={continueToNextTurn}
                                            className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                                        >
                                            {t('继续')}
                                        </button>
                                        <button
                                            onClick={handleEvacuate}
                                            className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                                        >
                                            {t('回到餐厅')}
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

                            {/* Doom Status */}
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('厄运')}</h3>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-center gap-3 text-sm py-1">
                                        <span>❤️ <span className="text-green-400 font-bold">{hp}</span></span>
                                        <span>💀 <span className="text-red-400 font-bold">{doomLevel}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Fate Wall */}
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('命运网格')}</h3>
                                </div>
                                <div className="p-2">
                                    <FateWall
                                        cells={fateWall.cells}
                                        label={null}
                                    />
                                </div>
                            </div>

                            {/* Inventory */}
                            <div ref={inventoryRef} className="bg-white rounded-lg shadow-sm border">
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('菜篮')}</h3>
                                    <span className="text-[10px] text-gray-300 font-medium">{inventory.length}/{maxInventorySize}</span>
                                </div>
                                <div className="p-2">
                                    {/* Recycle / Synthesize controls */}
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
                                    ) : synthesizeMode ? (
                                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-[11px] text-blue-600 mb-1.5">{t('选择2个相同物品进行合成')}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => {
                                                    const synIndices = [...synthesizeSelected];
                                                    if (synIndices.length === 2) {
                                                        synthesizeItems(synIndices[0], synIndices[1]);
                                                    }
                                                    setSynthesizeMode(false); setSynthesizeSelected(new Set());
                                                }}
                                                    disabled={!(synthesizeSelected.size === 2 && (() => {
                                                        const [a, b] = [...synthesizeSelected];
                                                        return inventory[a]?.id === inventory[b]?.id && inventory[a]?.isOutOfGame;
                                                    })())}
                                                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${synthesizeSelected.size === 2 && (() => { const [a, b] = [...synthesizeSelected]; return inventory[a]?.id === inventory[b]?.id && inventory[a]?.isOutOfGame; })() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                                    {t('确认合成')} {synthesizeSelected.size > 0 && `(${synthesizeSelected.size}/2)`}
                                                </button>
                                                <button onClick={() => { setSynthesizeMode(false); setSynthesizeSelected(new Set()); }}
                                                    className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-colors">{t('取消')}</button>
                                            </div>
                                        </div>
                                    ) : !pendingItem && (
                                        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                            <span className="text-[11px] text-gray-400">{actionHint === 'synthesize' ? t('合成为高品质物品') : t('回收不需要的物品')}</span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onMouseEnter={() => setActionHint('recycle')}
                                                    onClick={() => { setRecycleMode(true); setRecycleSelected(new Set()); setSynthesizeMode(false); setSynthesizeSelected(new Set()); }}
                                                    className="text-[10px] px-2 py-1 rounded-md font-bold text-gray-500 bg-gray-200 hover:bg-red-100 hover:text-red-500 transition-colors">{t('回收')}</button>
                                                <button
                                                    onMouseEnter={() => setActionHint('synthesize')}
                                                    onClick={() => { setSynthesizeMode(true); setSynthesizeSelected(new Set()); setRecycleMode(false); setRecycleSelected(new Set()); }}
                                                    className="text-[10px] px-2 py-1 rounded-md font-bold text-gray-500 bg-gray-200 hover:bg-blue-100 hover:text-blue-500 transition-colors">{t('合成')}</button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Pending items queue */}
                                    {pendingItems.length > 0 && !recycleMode && !synthesizeMode && (
                                        <div className="mb-2 p-2 bg-amber-50 border-2 border-amber-300 rounded-lg">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[11px] font-bold text-amber-700">{t('待处理物品')}</span>
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-200 px-1.5 py-0.5 rounded-full">{pendingItems.length}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {pendingItems.map((pItem, idx) => {
                                                    const pSc = pItem.isOutOfGame ? (SCORE_STYLE[pItem.rarity || pItem.score] || SCORE_STYLE[1]) : null;
                                                    const inner = (
                                                        <div className={`relative w-9 h-9 rounded border-2 flex items-center justify-center text-lg shadow-sm
                                                            ${idx === 0 ? 'ring-2 ring-amber-400' : 'opacity-60'}
                                                            ${pSc ? `${pSc.border} bg-gradient-to-b ${pSc.bg}` : 'border-gray-300 bg-white'}`}>
                                                            {pItem.icon}
                                                            {pSc && <span className={`absolute -bottom-1 -right-1 ${pSc.badge} text-white text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center shadow`}>{pItem.rarity || pItem.score}</span>}
                                                        </div>
                                                    );
                                                    return pItem.isOutOfGame
                                                        ? <Tooltip key={pItem.uid || idx} content={<IngredientTip item={pItem} />}>{inner}</Tooltip>
                                                        : <div key={pItem.uid || idx}>{inner}</div>;
                                                })}
                                            </div>
                                            <p className="text-[11px] text-amber-600 mb-1.5">{t('菜篮已满，点击下方物品替换')}</p>
                                            <button onClick={discardPendingItem} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">{t('丢弃当前物品')}</button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-5 gap-1">
                                        {Array.from({ length: maxInventorySize }).map((_, i) => {
                                            const item = inventory[i];
                                            const canReplace = pendingItem && item && !recycleMode && !synthesizeMode;
                                            const isRecycleSelected = recycleMode && recycleSelected.has(i);
                                            const isSynthesizeSelected = synthesizeMode && synthesizeSelected.has(i);
                                            const sc = item?.isOutOfGame ? (SCORE_STYLE[item.rarity || item.score] || SCORE_STYLE[1]) : null;
                                            const cell = (
                                                <div
                                                    onClick={() => {
                                                        if (recycleMode && item) {
                                                            setRecycleSelected(prev => {
                                                                const next = new Set(prev);
                                                                next.has(i) ? next.delete(i) : next.add(i);
                                                                return next;
                                                            });
                                                        } else if (synthesizeMode && item && item.isOutOfGame) {
                                                            setSynthesizeSelected(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(i)) {
                                                                    next.delete(i);
                                                                } else {
                                                                    next.add(i);
                                                                    // Limit to 2 selections
                                                                    if (next.size > 2) {
                                                                        const arr = [...next];
                                                                        arr.shift();
                                                                        return new Set(arr);
                                                                    }
                                                                }
                                                                return next;
                                                            });
                                                        } else if (canReplace) {
                                                            replaceInventoryItem(i);
                                                        }
                                                    }}
                                                    className={`w-10 h-10 rounded flex items-center justify-center text-lg border-2 relative transition-all duration-150
                                                        ${isRecycleSelected ? 'bg-red-100 border-red-400 scale-95 opacity-60'
                                                            : isSynthesizeSelected ? 'bg-blue-100 border-blue-400 scale-95'
                                                            : !item ? 'bg-gray-50 border-gray-200'
                                                            : sc ? `bg-gradient-to-b ${sc.bg} ${sc.border}`
                                                            : 'bg-white border-gray-300'}
                                                        ${canReplace ? 'cursor-pointer hover:bg-red-50 hover:border-red-400 hover:scale-110'
                                                            : recycleMode && item ? 'cursor-pointer hover:border-red-400'
                                                            : synthesizeMode && item?.isOutOfGame ? 'cursor-pointer hover:border-blue-400' : ''}`}
                                                >
                                                    {item ? item.icon : ''}
                                                    {sc && (
                                                        <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow`}>
                                                            {item.rarity || item.score}
                                                        </span>
                                                    )}
                                                    {item?.isOutOfGame && bonusItemMap.has(item.id) && (
                                                        <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusItemMap.get(item.id)}</span>
                                                    )}
                                                </div>
                                            );
                                            return item?.isOutOfGame
                                                ? <Tooltip key={i} content={<IngredientTip item={item} />}>{cell}</Tooltip>
                                                : <div key={i}>{cell}</div>;
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
                                                const sc = SCORE_STYLE[item.rarity || item.score] || SCORE_STYLE[1];
                                                return (
                                                    <div key={j} className="relative flex flex-col items-center">
                                                        <div className={`w-14 h-14 rounded-lg border-2 ${sc.border} bg-gradient-to-b ${sc.bg} shadow-sm flex items-center justify-center text-2xl`}>
                                                            {item.icon}
                                                        </div>
                                                        <span className={`absolute -bottom-1 -right-1 ${sc.badge} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow`}>
                                                            +{item.rarity || item.score}
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
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Ingredients</div>
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {INGREDIENTS.map(item => (
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
                                            {(debugSelectedItem.rarity || debugSelectedItem.score) && <span className="text-gray-500 ml-1">({'★'.repeat(debugSelectedItem.rarity || debugSelectedItem.score)})</span>}
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

                {/* Dispatch Judgment Modal */}
                {dispatchOpen && <DispatchJudgment onClose={() => setDispatchOpen(false)} />}

                {/* AI Cooking Modal */}
                {aiCookingOpen && <AICooking onClose={() => setAiCookingOpen(false)} expeditionScores={expeditionScores} onUpdateStorage={debugAddStorageItems} customer={aiCustomer} onNewCustomer={() => setAiCustomer(pickRandomCustomer())} />}

                {/* Kitchen Modal */}
                {kitchenOpen && <Kitchen inventory={inventory} dish={DISHES[kitchenDishIdx]} onCook={(result) => { setKitchenOpen(false); }} onClose={() => setKitchenOpen(false)} />}

                {/* Fate Wall Placement Modal */}
                {pendingCharm && (
                    <FateWallPlacementModal
                        pendingCharm={pendingCharm}
                        fateWallCells={fateWall.cells}
                        onPlace={confirmCharmPlacement}
                    />
                )}

                {/* Fate Wall Luck Modal */}
                {(phase === 'luck_draw') && (
                    <FateWallLuckModal
                        fateWallCells={fateWall.cells}
                        onSelect={handleLuckSelect}
                        result={luckResult}
                        onConfirm={confirmLuck}
                    />
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </div>
    );
};

export default GameCore;
