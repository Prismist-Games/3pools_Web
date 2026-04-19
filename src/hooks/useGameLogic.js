/**
 * useGameLogicV3.js — Day 1 重构的全局游戏状态 hook
 *
 * 状态机与规则详见 design_docs/game_rules_day1_draft.md。
 *
 * 本 hook 独立于旧的 useGameLogic.js 存在，M3 会把 GameCore 切换过来，
 * M4 删除旧 hook。
 */

import { useState, useCallback, useMemo } from 'react';
import {
    SHOPS,
    DAY_CONFIG,
    BASKET_CONFIG,
    SATISFACTION_CONFIG,
    DISH_SCORING,
} from '../data/v2Config';
import {
    generateShopWall,
    refreshShopRegion,
    rollAffix,
    rollQuality,
    resolveIngredient,
    generateDailyDishes,
    pickShopCandidates,
} from '../utils/shopHelpers';

// ─── 工具 ───────────────────────────────────────────────────────────

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// 与 Kitchen.jsx:getSlotMatch 等效（不含 crossBonus / exclude，当前规则不需要）
function getSlotMultiplier(ingredient, slot) {
    const tags = ingredient.tags || [];
    const rules = slot.rules || [];
    let best = null;
    for (const rule of rules) {
        const ok = rule.match?.tag
            ? tags.includes(rule.match.tag)
            : rule.match?.id === ingredient.id;
        if (ok && (!best || rule.multiplier > best.multiplier)) best = rule;
    }
    return best ? best.multiplier : (slot.defaultMultiplier ?? 0.5);
}

function get2x2Cells(topRow, leftCol, matrix) {
    return [
        { r: topRow,     c: leftCol,     cell: matrix[topRow][leftCol] },
        { r: topRow,     c: leftCol + 1, cell: matrix[topRow][leftCol + 1] },
        { r: topRow + 1, c: leftCol,     cell: matrix[topRow + 1][leftCol] },
        { r: topRow + 1, c: leftCol + 1, cell: matrix[topRow + 1][leftCol + 1] },
    ];
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useGameLogicV3() {
    // Meta
    const [phase, setPhase] = useState('idle');          // 'idle' | 'shop_picking' | 'in_shop' | 'day_end' | 'game_over'
    const [dayNumber, setDayNumber] = useState(1);
    const [satisfaction, setSatisfaction] = useState(SATISFACTION_CONFIG.initial);

    // Day budget & dishes
    const [hoursRemaining, setHoursRemaining] = useState(DAY_CONFIG.hoursPerDay);
    const [dailyDishes, setDailyDishes] = useState([]);
    const [dishPlacements, setDishPlacements] = useState({}); // { [dishId]: (Ing|null)[] }
    const [dishResolved, setDishResolved] = useState({});     // { [dishId]: ResolvedState | null }

    // Shop picking
    const [shopCandidates, setShopCandidates] = useState([]);

    // In shop
    const [currentShop, setCurrentShop] = useState(null);
    const [shopMatrix, setShopMatrix] = useState(null);
    const [shopBasket, setShopBasket] = useState([]);
    const [currentAffix, setCurrentAffix] = useState(null);
    const [shopDrawState, setShopDrawState] = useState({ mode: 'idle' });
    // shopDrawState shapes:
    //   { mode: 'idle' }
    //   { mode: 'precise',  topRow, leftCol, candidates: [{ r, c, cell, isBanana, ingredient, rarity }, ...] }
    //   { mode: 'targeted', topRow, leftCol }
    const [hoveredRegion, setHoveredRegion] = useState(null);  // { topRow, leftCol } | null

    // Global
    const [fridge, setFridge] = useState([]);

    // Pending queues
    const [pendingBasketItems, setPendingBasketItems] = useState([]);
    const [pendingFridgeItems, setPendingFridgeItems] = useState([]);

    // Transient feedback
    const [lastKick, setLastKick] = useState(null);            // { shop, at } | null
    const [lastDishResult, setLastDishResult] = useState(null);// { dishId, total, ... } | null

    // ═════════════════════════════════════════════════════════════════
    // Day lifecycle
    // ═════════════════════════════════════════════════════════════════

    const startDay = useCallback(() => {
        const dishes = generateDailyDishes();
        const placements = {};
        const resolved = {};
        dishes.forEach(d => {
            placements[d.id] = d.slots.map(() => null);
            resolved[d.id] = null;
        });
        setDayNumber(1);
        setSatisfaction(SATISFACTION_CONFIG.initial);
        setHoursRemaining(DAY_CONFIG.hoursPerDay);
        setDailyDishes(dishes);
        setDishPlacements(placements);
        setDishResolved(resolved);
        setShopCandidates(pickShopCandidates());
        setCurrentShop(null);
        setShopMatrix(null);
        setShopBasket([]);
        setCurrentAffix(null);
        setShopDrawState({ mode: 'idle' });
        setHoveredRegion(null);
        setFridge([]);
        setPendingBasketItems([]);
        setPendingFridgeItems([]);
        setLastKick(null);
        setLastDishResult(null);
        setPhase('shop_picking');
    }, []);

    const resetGame = startDay;

    // ═════════════════════════════════════════════════════════════════
    // Shop entry / exit
    // ═════════════════════════════════════════════════════════════════

    const enterShop = useCallback((shopId) => {
        if (phase !== 'shop_picking') return;
        if (hoursRemaining <= 0) return;
        const shop = SHOPS.find(s => s.id === shopId);
        if (!shop) return;
        setCurrentShop(shop);
        setShopMatrix(generateShopWall(shop.category));
        setShopBasket([]);
        setCurrentAffix(rollAffix());
        setShopDrawState({ mode: 'idle' });
        setHoveredRegion(null);
        setHoursRemaining(h => h - DAY_CONFIG.hoursPerShop);
        setPhase('in_shop');
    }, [phase, hoursRemaining]);

    const leaveShop = useCallback(() => {
        if (phase !== 'in_shop') return;
        const maxFridge = BASKET_CONFIG.fridgeSize;
        // Drain basket → fridge; overflow queues as pending fridge items
        setFridge(curr => {
            const next = [...curr];
            const overflow = [];
            for (const item of shopBasket) {
                if (next.length < maxFridge) next.push(item);
                else overflow.push(item);
            }
            if (overflow.length) {
                setPendingFridgeItems(q => [...q, ...overflow]);
            }
            return next;
        });
        setCurrentShop(null);
        setShopMatrix(null);
        setShopBasket([]);
        setCurrentAffix(null);
        setShopDrawState({ mode: 'idle' });
        setHoveredRegion(null);
        setShopCandidates(pickShopCandidates());
        setPhase('shop_picking');
    }, [phase, shopBasket]);

    // 香蕉皮踢出：清空临时篮、返回店选择
    const _handleKick = useCallback(() => {
        setLastKick({ shop: currentShop, at: Date.now() });
        setShopBasket([]);
        setCurrentShop(null);
        setShopMatrix(null);
        setCurrentAffix(null);
        setShopDrawState({ mode: 'idle' });
        setHoveredRegion(null);
        setShopCandidates(pickShopCandidates());
        setPhase('shop_picking');
    }, [currentShop]);

    // ═════════════════════════════════════════════════════════════════
    // Drawing
    // ═════════════════════════════════════════════════════════════════

    const _addToBasket = useCallback((items) => {
        const max = BASKET_CONFIG.shopBasketSize;
        setShopBasket(curr => {
            const next = [...curr];
            const overflow = [];
            for (const item of items) {
                if (!item) continue;
                if (next.length < max) next.push(item);
                else overflow.push(item);
            }
            if (overflow.length) {
                setPendingBasketItems(q => [...q, ...overflow]);
            }
            return next;
        });
    }, []);

    const _finishDraw = useCallback((topRow, leftCol, shopCategory) => {
        setShopMatrix(m => refreshShopRegion(m, topRow, leftCol, shopCategory));
        setCurrentAffix(rollAffix());
        setShopDrawState({ mode: 'idle' });
        setHoveredRegion(null);
    }, []);

    const hoverRegion = useCallback((topRow, leftCol) => {
        if (phase !== 'in_shop') return;
        setHoveredRegion({ topRow, leftCol });
    }, [phase]);

    const clearHover = useCallback(() => {
        setHoveredRegion(null);
    }, []);

    const selectRegion = useCallback((topRow, leftCol) => {
        if (phase !== 'in_shop' || !shopMatrix || !currentAffix || !currentShop) return;
        if (shopDrawState.mode !== 'idle') return;
        if (topRow < 0 || topRow > 2 || leftCol < 0 || leftCol > 2) return;

        const affixId = currentAffix.id;
        const cells = get2x2Cells(topRow, leftCol, shopMatrix);
        const category = currentShop.category;

        if (affixId === 'precise') {
            // 随机抽 2 格作候选，先摇好品质展示
            const shuffled = cells.slice().sort(() => Math.random() - 0.5);
            const two = shuffled.slice(0, 2);
            const candidates = two.map(({ r, c, cell }) => {
                if (cell.type === 'banana_peel') {
                    return { r, c, cell, isBanana: true, ingredient: null, rarity: null };
                }
                const rarity = rollQuality(); // 默认品质权重
                const ingredient = resolveIngredient(cell.baseId, rarity);
                return { r, c, cell, isBanana: false, ingredient, rarity };
            });
            setShopDrawState({ mode: 'precise', topRow, leftCol, candidates });
            setHoveredRegion(null);
            return;
        }

        if (affixId === 'targeted') {
            // 玩家自选 1 格
            setShopDrawState({ mode: 'targeted', topRow, leftCol });
            setHoveredRegion(null);
            return;
        }

        if (affixId === 'fragmented') {
            // 3 次独立随机落点，全 ★；任一落到香蕉皮 → 踢出
            const picks = [];
            for (let i = 0; i < 3; i++) {
                const idx = Math.floor(Math.random() * 4);
                picks.push(cells[idx]);
            }
            for (const { cell } of picks) {
                if (cell.type === 'banana_peel') {
                    _handleKick();
                    return;
                }
            }
            const results = picks
                .map(({ cell }) => resolveIngredient(cell.baseId, 1))
                .filter(Boolean);
            _addToBasket(results);
            _finishDraw(topRow, leftCol, category);
            return;
        }

        // hardened / purified — 默认 1/4 随机落点，品质覆盖
        const idx = Math.floor(Math.random() * 4);
        const { cell } = cells[idx];
        if (cell.type === 'banana_peel') {
            _handleKick();
            return;
        }
        const rarity = rollQuality(affixId);
        const ingredient = resolveIngredient(cell.baseId, rarity);
        _addToBasket([ingredient]);
        _finishDraw(topRow, leftCol, category);
    }, [phase, shopMatrix, currentAffix, currentShop, shopDrawState, _addToBasket, _handleKick, _finishDraw]);

    const pickPreciseCandidate = useCallback((candidateIdx) => {
        if (shopDrawState.mode !== 'precise' || !currentShop) return;
        const { candidates, topRow, leftCol } = shopDrawState;
        const chosen = candidates[candidateIdx];
        if (!chosen) return;
        if (chosen.isBanana) {
            _handleKick();
            return;
        }
        _addToBasket([chosen.ingredient]);
        _finishDraw(topRow, leftCol, currentShop.category);
    }, [shopDrawState, currentShop, _addToBasket, _handleKick, _finishDraw]);

    const pickTargetedCell = useCallback((r, c) => {
        if (shopDrawState.mode !== 'targeted' || !shopMatrix || !currentShop) return;
        const { topRow, leftCol } = shopDrawState;
        if (r < topRow || r > topRow + 1 || c < leftCol || c > leftCol + 1) return;
        const cell = shopMatrix[r][c];
        if (cell.type === 'banana_peel') {
            _handleKick();
            return;
        }
        const rarity = rollQuality();
        const ingredient = resolveIngredient(cell.baseId, rarity);
        _addToBasket([ingredient]);
        _finishDraw(topRow, leftCol, currentShop.category);
    }, [shopDrawState, shopMatrix, currentShop, _addToBasket, _handleKick, _finishDraw]);

    const cancelSubSelection = useCallback(() => {
        // 允许玩家取消 precise / targeted 中间态，回到 idle 重新选 2×2
        if (shopDrawState.mode === 'precise' || shopDrawState.mode === 'targeted') {
            setShopDrawState({ mode: 'idle' });
        }
    }, [shopDrawState]);

    // ═════════════════════════════════════════════════════════════════
    // Pending queue resolutions
    // ═════════════════════════════════════════════════════════════════

    const replaceBasketItem = useCallback((basketIdx) => {
        if (!pendingBasketItems.length) return;
        const incoming = pendingBasketItems[0];
        setShopBasket(curr => {
            if (basketIdx < 0 || basketIdx >= curr.length) return curr;
            const next = [...curr];
            next[basketIdx] = incoming;
            return next;
        });
        setPendingBasketItems(q => q.slice(1));
    }, [pendingBasketItems]);

    const discardPendingBasketItem = useCallback(() => {
        setPendingBasketItems(q => q.slice(1));
    }, []);

    const replaceFridgeItem = useCallback((fridgeIdx) => {
        if (!pendingFridgeItems.length) return;
        const incoming = pendingFridgeItems[0];
        setFridge(curr => {
            if (fridgeIdx < 0 || fridgeIdx >= curr.length) return curr;
            const next = [...curr];
            next[fridgeIdx] = incoming;
            return next;
        });
        setPendingFridgeItems(q => q.slice(1));
    }, [pendingFridgeItems]);

    const discardPendingFridgeItem = useCallback(() => {
        setPendingFridgeItems(q => q.slice(1));
    }, []);

    // ═════════════════════════════════════════════════════════════════
    // Dish slot management
    // ═════════════════════════════════════════════════════════════════

    const placeIngredient = useCallback((dishId, slotIdx, fridgeIdx) => {
        if (dishResolved[dishId]) return;
        if (fridgeIdx < 0 || fridgeIdx >= fridge.length) return;
        const ingredient = fridge[fridgeIdx];
        const currentPlacement = dishPlacements[dishId]?.[slotIdx] || null;

        setFridge(curr => {
            const next = curr.filter((_, i) => i !== fridgeIdx);
            if (currentPlacement) next.push(currentPlacement);
            return next;
        });
        setDishPlacements(curr => {
            const dishArr = [...(curr[dishId] || [])];
            dishArr[slotIdx] = ingredient;
            return { ...curr, [dishId]: dishArr };
        });
    }, [dishResolved, fridge, dishPlacements]);

    const removeFromSlot = useCallback((dishId, slotIdx) => {
        if (dishResolved[dishId]) return;
        const ingredient = dishPlacements[dishId]?.[slotIdx];
        if (!ingredient) return;
        setFridge(curr => [...curr, ingredient]);
        setDishPlacements(curr => {
            const dishArr = [...(curr[dishId] || [])];
            dishArr[slotIdx] = null;
            return { ...curr, [dishId]: dishArr };
        });
    }, [dishResolved, dishPlacements]);

    const confirmDish = useCallback((dishId) => {
        if (dishResolved[dishId]) return;
        const dish = dailyDishes.find(d => d.id === dishId);
        if (!dish) return;
        const placements = dishPlacements[dishId];
        if (!placements || placements.some(p => !p)) return; // 必须填满

        const slotScores = dish.slots.map((slot, i) => {
            const ing = placements[i];
            const multiplier = getSlotMultiplier(ing, slot);
            return { ingredient: ing, multiplier, score: (ing.rarity || 1) * multiplier };
        });
        const total = slotScores.reduce((s, x) => s + x.score, 0);

        const ratio = dish.baseline === 0 ? total : total / dish.baseline;
        let matched = DISH_SCORING.thresholds[DISH_SCORING.thresholds.length - 1];
        for (const t of DISH_SCORING.thresholds) {
            if (ratio >= t.minRatio) { matched = t; break; }
        }

        const resolvedState = {
            total,
            baseline: dish.baseline,
            rating: matched.rating,
            ratingEn: matched.ratingEn,
            delta: matched.delta,
            slotScores,
        };

        setSatisfaction(s => clamp(s + matched.delta, 0, SATISFACTION_CONFIG.max));
        setDishResolved(curr => ({ ...curr, [dishId]: resolvedState }));
        setLastDishResult({ dishId, ...resolvedState });
    }, [dishResolved, dailyDishes, dishPlacements]);

    // ═════════════════════════════════════════════════════════════════
    // Day end
    // ═════════════════════════════════════════════════════════════════

    const endDay = useCallback(() => {
        if (phase === 'game_over' || phase === 'day_end') return;
        let satAcc = satisfaction;
        const updated = { ...dishResolved };
        for (const dish of dailyDishes) {
            if (!updated[dish.id]) {
                satAcc += DISH_SCORING.unfinishedDelta;
                updated[dish.id] = {
                    total: 0, baseline: dish.baseline,
                    rating: '未完成', ratingEn: 'Unfinished',
                    delta: DISH_SCORING.unfinishedDelta,
                    slotScores: [],
                    unfinished: true,
                };
            }
        }
        satAcc = clamp(satAcc, 0, SATISFACTION_CONFIG.max);
        setSatisfaction(satAcc);
        setDishResolved(updated);
        if (satAcc <= SATISFACTION_CONFIG.loseThreshold) {
            setPhase('game_over');
        } else {
            setPhase('day_end');
        }
    }, [phase, satisfaction, dishResolved, dailyDishes]);

    // ═════════════════════════════════════════════════════════════════
    // Debug helpers (M2 冒烟测试用；M3 可接到调试面板)
    // ═════════════════════════════════════════════════════════════════

    const debugAddToFridge = useCallback((ingredient) => {
        setFridge(curr => {
            if (curr.length >= BASKET_CONFIG.fridgeSize) return curr;
            return [...curr, ingredient];
        });
    }, []);

    const debugForceAffix = useCallback((affixId) => {
        // 仅开发用：强制下一个词缀
        const forced = { id: affixId, name: affixId, nameEn: affixId, icon: '', desc: '(debug)' };
        setCurrentAffix(forced);
    }, []);

    // ═════════════════════════════════════════════════════════════════
    // Derived
    // ═════════════════════════════════════════════════════════════════

    const canEnterShop = useMemo(
        () => phase === 'shop_picking' && hoursRemaining > 0,
        [phase, hoursRemaining]
    );
    const canEndDay = useMemo(
        () => phase === 'shop_picking' || phase === 'in_shop',
        [phase]
    );
    const canLeaveShop = useMemo(
        () => phase === 'in_shop' && shopDrawState.mode === 'idle',
        [phase, shopDrawState]
    );
    const canSelectRegion = useMemo(
        () => phase === 'in_shop' && shopDrawState.mode === 'idle',
        [phase, shopDrawState]
    );

    // ═════════════════════════════════════════════════════════════════
    // Return
    // ═════════════════════════════════════════════════════════════════

    return {
        // Meta
        phase, dayNumber, satisfaction,
        maxSatisfaction: SATISFACTION_CONFIG.max,

        // Day
        hoursRemaining,
        hoursPerDay: DAY_CONFIG.hoursPerDay,
        dailyDishes, dishPlacements, dishResolved,
        lastDishResult,

        // Shop picking
        shopCandidates,

        // In shop
        currentShop, shopMatrix, shopBasket, currentAffix,
        shopDrawState, hoveredRegion,
        shopBasketSize: BASKET_CONFIG.shopBasketSize,
        lastKick,

        // Global
        fridge,
        fridgeSize: BASKET_CONFIG.fridgeSize,

        // Pending
        pendingBasketItems, pendingFridgeItems,

        // Derived
        canEnterShop, canEndDay, canLeaveShop, canSelectRegion,

        // Actions
        startDay, resetGame,
        enterShop, leaveShop,
        hoverRegion, clearHover,
        selectRegion, pickPreciseCandidate, pickTargetedCell, cancelSubSelection,
        placeIngredient, removeFromSlot, confirmDish,
        endDay,
        replaceBasketItem, discardPendingBasketItem,
        replaceFridgeItem, discardPendingFridgeItem,

        // Debug
        debugAddToFridge, debugForceAffix,
    };
}
