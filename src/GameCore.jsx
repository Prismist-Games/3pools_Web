import React, { useEffect, useState } from 'react';
import { useGameLogicV3 } from './hooks/useGameLogic';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';

import TopBar from './components/game/TopBar';
import ShopPicker from './components/game/ShopPicker';
import ShopMatrix from './components/game/ShopMatrix';
import PrecisePicker from './components/game/PrecisePicker';
import ShopBasket from './components/game/ShopBasket';
import Fridge from './components/game/Fridge';
import DishBoard from './components/game/DishBoard';
import PendingResolver from './components/game/PendingResolver';
import { StartScreen, DayEndScreen, GameOverScreen } from './components/game/EndScreens';

export default function GameCore() {
    const { t } = useLanguage();
    const state = useGameLogicV3();

    // Local UI state: which fridge slot is selected (for placing into dish slot)
    const [selectedFridgeIdx, setSelectedFridgeIdx] = useState(null);
    // Toast message (kick, etc.)
    const [toast, setToast] = useState(null);

    // Banana peel kick → toast
    useEffect(() => {
        if (state.lastKick) {
            setToast(`🍌 ${t('被踢出')}: ${t(state.lastKick.shop?.name || '')}，${t('临时篮全部损失')}`);
        }
    }, [state.lastKick, t]);

    // Clear fridge selection if selected item is gone (e.g., placed → removed)
    useEffect(() => {
        if (selectedFridgeIdx != null && selectedFridgeIdx >= state.fridge.length) {
            setSelectedFridgeIdx(null);
        }
    }, [state.fridge.length, selectedFridgeIdx]);

    function handlePlaceIntoSlot(dishId, slotIdx) {
        if (selectedFridgeIdx == null) return;
        state.placeIngredient(dishId, slotIdx, selectedFridgeIdx);
        setSelectedFridgeIdx(null);
    }

    const {
        phase,
        dayNumber, satisfaction, maxSatisfaction,
        hoursRemaining, hoursPerDay,
        dailyDishes, dishPlacements, dishResolved,
        shopCandidates, canEnterShop,
        currentShop, shopMatrix, shopBasket, currentAffix, shopDrawState, hoveredRegion,
        shopBasketSize,
        fridge, fridgeSize,
        pendingBasketItems, pendingFridgeItems,
        canEndDay, canLeaveShop,
        startDay, resetGame,
        enterShop, leaveShop,
        hoverRegion, clearHover,
        selectRegion, pickPreciseCandidate, pickTargetedCell, cancelSubSelection,
        placeIngredient: _placeIngredient, removeFromSlot, confirmDish,
        endDay,
        replaceBasketItem, discardPendingBasketItem,
        replaceFridgeItem, discardPendingFridgeItem,
    } = state;

    // ═══════════════════════════════════════════════════════════════
    // Phase-switched central content
    // ═══════════════════════════════════════════════════════════════
    let centerContent;
    if (phase === 'idle') {
        centerContent = <StartScreen onStart={startDay} />;
    } else if (phase === 'shop_picking') {
        centerContent = (
            <ShopPicker
                candidates={shopCandidates}
                canEnter={canEnterShop}
                onEnter={enterShop}
                hoursRemaining={hoursRemaining}
            />
        );
    } else if (phase === 'in_shop') {
        centerContent = (
            <div className="flex flex-col items-center gap-4 py-4">
                <ShopMatrix
                    matrix={shopMatrix}
                    currentAffix={currentAffix}
                    shopDrawState={shopDrawState}
                    hoveredRegion={hoveredRegion}
                    onHover={hoverRegion}
                    onLeaveHover={clearHover}
                    onSelectRegion={selectRegion}
                    onPickTargetedCell={pickTargetedCell}
                    onCancelSub={cancelSubSelection}
                    leaveShopAction={leaveShop}
                    canLeaveShop={canLeaveShop}
                    shop={currentShop}
                />
                {shopDrawState.mode === 'precise' && (
                    <PrecisePicker
                        candidates={shopDrawState.candidates}
                        onPick={pickPreciseCandidate}
                        onCancel={cancelSubSelection}
                    />
                )}
            </div>
        );
    } else if (phase === 'day_end') {
        centerContent = (
            <DayEndScreen
                satisfaction={satisfaction}
                maxSatisfaction={maxSatisfaction}
                dishes={dailyDishes}
                resolved={dishResolved}
                onReset={resetGame}
            />
        );
    } else if (phase === 'game_over') {
        centerContent = (
            <GameOverScreen
                dishes={dailyDishes}
                resolved={dishResolved}
                onReset={resetGame}
            />
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // Layout
    // ═══════════════════════════════════════════════════════════════
    const showSidebars = phase === 'shop_picking' || phase === 'in_shop';

    return (
        <div className="min-h-screen bg-kitchen-page">
            <TopBar
                dayNumber={dayNumber}
                hoursRemaining={hoursRemaining}
                hoursPerDay={hoursPerDay}
                satisfaction={satisfaction}
                maxSatisfaction={maxSatisfaction}
                canEndDay={canEndDay}
                onEndDay={endDay}
                onReset={resetGame}
            />

            <main className="max-w-[1400px] mx-auto p-4 grid gap-4"
                  style={{ gridTemplateColumns: showSidebars ? '320px 1fr 320px' : '1fr' }}>
                {showSidebars && (
                    <aside className="flex flex-col gap-3">
                        <DishBoard
                            dishes={dailyDishes}
                            placements={dishPlacements}
                            resolved={dishResolved}
                            fridgeSelectedIdx={selectedFridgeIdx}
                            onPlace={handlePlaceIntoSlot}
                            onRemove={removeFromSlot}
                            onConfirm={confirmDish}
                        />
                    </aside>
                )}

                <section>{centerContent}</section>

                {showSidebars && (
                    <aside className="flex flex-col gap-3">
                        {phase === 'in_shop' && (
                            <ShopBasket items={shopBasket} capacity={shopBasketSize} />
                        )}
                        <Fridge
                            items={fridge}
                            capacity={fridgeSize}
                            selectedIdx={selectedFridgeIdx}
                            onSelect={setSelectedFridgeIdx}
                        />
                    </aside>
                )}
            </main>

            {/* Pending resolvers */}
            {pendingBasketItems.length > 0 && (
                <PendingResolver
                    title={`🧺 ${t('临时篮已满')}`}
                    subtitle={t('替换一个旧物品，或扔掉新的')}
                    containerItems={shopBasket}
                    containerCapacity={shopBasketSize}
                    pendingItems={pendingBasketItems}
                    onReplace={replaceBasketItem}
                    onDiscard={discardPendingBasketItem}
                />
            )}
            {pendingFridgeItems.length > 0 && pendingBasketItems.length === 0 && (
                <PendingResolver
                    title={`❄️ ${t('冰箱已满')}`}
                    subtitle={t('替换一个冰箱里的物品，或扔掉新的')}
                    containerItems={fridge}
                    containerCapacity={fridgeSize}
                    pendingItems={pendingFridgeItems}
                    onReplace={replaceFridgeItem}
                    onDiscard={discardPendingFridgeItem}
                />
            )}

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
