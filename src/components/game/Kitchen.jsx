import React, { useState, useMemo } from 'react';
import { X, ChefHat, Trash2, Plus } from 'lucide-react';
import { DISHES } from '../../data/v2Config';
import { RARITY_STYLE, IngredientTip } from './BulletinBoard';
import Tooltip from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Matching & Scoring ──

function getSlotMatch(ingredient, slot) {
    if (!slot.accept) {
        return { multiplier: 1, matchLevel: 'any' };
    }
    const tags = ingredient.tags || [];
    if (slot.exclude && tags.includes(slot.exclude)) {
        return { multiplier: 0, matchLevel: 'excluded' };
    }
    // prefer can be string or array
    const preferList = !slot.prefer ? [] : Array.isArray(slot.prefer) ? slot.prefer : [slot.prefer];
    if (preferList.length > 0 && preferList.some(p => tags.includes(p))) {
        return { multiplier: 2, matchLevel: 'prefer' };
    }
    if (tags.includes(slot.accept)) {
        return { multiplier: 1, matchLevel: 'accept' };
    }
    return { multiplier: 0.5, matchLevel: 'none' };
}

function canPlaceInSlot(ingredient, slot) {
    if (slot.exclude && (ingredient.tags || []).includes(slot.exclude)) return false;
    return true;
}

function scoreDish(dish, effectiveSlots, placements) {
    // First pass: base scores
    const slotScores = effectiveSlots.map((slot, i) => {
        const ing = placements[i];
        if (!ing) return { score: 0, empty: true, required: slot.required, crossBonus: 0 };
        const base = ing.rarity || 1;
        const { multiplier, matchLevel } = getSlotMatch(ing, slot);
        return { score: base * multiplier, matchLevel, empty: false, required: slot.required, crossBonus: 0 };
    });

    // Second pass: cross-slot bonuses
    effectiveSlots.forEach((slot, i) => {
        if (!slot.crossBonus || !placements[i]) return;
        const { requireSlot, requireTag, points } = slot.crossBonus;
        // Find the target slot by name and check if its ingredient has the required tag
        const targetIdx = effectiveSlots.findIndex(s => s.name === requireSlot);
        if (targetIdx >= 0 && placements[targetIdx]) {
            const targetTags = placements[targetIdx].tags || [];
            if (targetTags.includes(requireTag)) {
                slotScores[i].score += points;
                slotScores[i].crossBonus = points;
            }
        }
    });

    const total = slotScores.reduce((s, x) => s + x.score, 0);

    let rating, popularityDelta;
    if (total >= dish.baseline * 2.5) {
        rating = '惊艳'; popularityDelta = 2;
    } else if (total >= dish.baseline * 1.8) {
        rating = '优秀'; popularityDelta = 1;
    } else if (total >= dish.baseline) {
        rating = '合格'; popularityDelta = 0;
    } else if (total >= dish.baseline * 0.5) {
        rating = '勉强'; popularityDelta = -1;
    } else {
        rating = '翻车'; popularityDelta = -2;
    }
    return { slotScores, total, baseline: dish.baseline, rating, popularityDelta };
}

// ── Styling ──

const MATCH_BORDER = {
    prefer: 'border-yellow-400 bg-yellow-50',
    accept: 'border-green-400 bg-green-50',
    any: 'border-blue-300 bg-blue-50',
    none: 'border-gray-300 bg-gray-100',
    excluded: 'border-red-300 bg-red-50',
};

const RATING_STYLE = {
    '惊艳': 'text-yellow-500',
    '优秀': 'text-purple-500',
    '合格': 'text-green-500',
    '勉强': 'text-orange-500',
    '翻车': 'text-red-500',
};

const TagBadge = ({ tag, className = '' }) => (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200 ${className}`}>
        {tag}
    </span>
);

// ── Slot Card ──

const SlotCard = ({ slot, placed, slotResult, isTargeted, isSpawned, onPlace, onRemove }) => {
    const { t } = useLanguage();
    const matchStyle = placed ? (MATCH_BORDER[slotResult.matchLevel] || MATCH_BORDER.none) : '';

    return (
        <div className={`flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden min-w-[140px]
            ${isSpawned ? 'border-cyan-300 ring-1 ring-cyan-200' : 'border-gray-200'}`}>
            {/* Header */}
            <div className={`px-3 py-1.5 border-b flex items-center justify-between
                ${isSpawned ? 'bg-cyan-50 border-cyan-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-xs font-bold text-gray-600">
                    {isSpawned && <Plus size={10} className="inline mr-0.5 text-cyan-500" />}
                    {slot.name}
                </span>
                {slot.required && <span className="text-[9px] text-red-400 font-bold">{t('必填')}</span>}
            </div>

            {/* Drop zone */}
            <div
                onClick={() => placed ? onRemove() : onPlace()}
                className={`mx-2 my-2 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all
                    ${placed ? `${matchStyle} border-solid` : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'}
                    ${!placed && isTargeted ? 'ring-2 ring-blue-300 border-blue-400 bg-blue-50' : ''}`}
            >
                {placed ? (
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{placed.icon}</span>
                        <div>
                            <div className="text-xs font-bold text-gray-700 leading-tight">{placed.name}</div>
                            <div className="text-[10px] text-gray-400">{'★'.repeat(placed.rarity || 1)}</div>
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">{t('点击放入食材')}</span>
                )}
            </div>

            {/* Score */}
            {placed && (
                <div className="mx-2 mb-1 text-center">
                    <span className="text-sm font-black text-gray-800">{slotResult.score.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">{t('分')}</span>
                    {slotResult.crossBonus > 0 && (
                        <span className="text-[10px] text-pink-500 font-bold ml-1">(🔗+{slotResult.crossBonus})</span>
                    )}
                </div>
            )}

            {/* Rules */}
            <div className="px-3 py-2 border-t border-gray-100 space-y-1">
                {slot.accept ? (
                    <>
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-gray-400 w-8 text-right font-mono">×0.5</span>
                            <span className="text-gray-400">{t('其他')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-green-600 w-8 text-right font-mono font-bold">×1</span>
                            <TagBadge tag={slot.accept} />
                        </div>
                        {slot.prefer && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-yellow-600 w-8 text-right font-mono font-bold">×2</span>
                                <span className="flex gap-1 flex-wrap">
                                    {(Array.isArray(slot.prefer) ? slot.prefer : [slot.prefer]).map(p => (
                                        <TagBadge key={p} tag={p} className="bg-yellow-600 text-yellow-100" />
                                    ))}
                                </span>
                            </div>
                        )}
                        {slot.exclude && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-red-400 w-8 text-right font-mono font-bold">✗</span>
                                <span className="text-red-400">{t('不可放入')}</span>
                                <TagBadge tag={slot.exclude} className="bg-red-600 text-red-100" />
                            </div>
                        )}
                        {slot.crossBonus && (
                            <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-gray-100 mt-1">
                                <span className="text-pink-500 w-8 text-right">🔗</span>
                                <span className="text-pink-600">
                                    {slot.crossBonus.requireSlot}为 <TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-600 text-pink-100" /> 时 +{slot.crossBonus.points}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-blue-500 w-8 text-right font-mono font-bold">×1</span>
                        <span className="text-blue-500">{t('任意食材')}</span>
                    </div>
                )}
                {/* Trigger rule display */}
                {slot.trigger && (
                    <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-gray-100 mt-1">
                        <span className="text-cyan-500 w-8 text-right">⚡</span>
                        <span className="text-cyan-600">
                            {t('放入')} <TagBadge tag={slot.trigger.whenTag} className="bg-cyan-600 text-cyan-100" /> {t('时额外开启一个栏位')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Kitchen Component ──

const Kitchen = ({ inventory, dish: dishOverride, onCook, onClose }) => {
    const { t } = useLanguage();
    const dish = dishOverride || DISHES[0];

    const [placements, setPlacements] = useState(() => dish.slots.map(() => null));
    const [selectedFridgeIdx, setSelectedFridgeIdx] = useState(null);

    // Build effective slots: base slots + any triggered bonus slots
    const { effectiveSlots, effectivePlacements, spawnedFlags } = useMemo(() => {
        const slots = [];
        const placed = [];
        const spawned = [];
        for (let i = 0; i < dish.slots.length; i++) {
            const slot = dish.slots[i];
            slots.push(slot);
            placed.push(placements[i]);
            spawned.push(false);
            // Check trigger
            if (slot.trigger && placements[i]) {
                const tags = placements[i].tags || [];
                if (tags.includes(slot.trigger.whenTag)) {
                    slots.push(slot.trigger.spawnSlot);
                    placed.push(null); // new slot starts empty
                    spawned.push(true);
                }
            }
        }
        return { effectiveSlots: slots, effectivePlacements: placed, spawnedFlags: spawned };
    }, [dish.slots, placements]);

    // Separate state for spawned slot placements
    const [spawnedPlacements, setSpawnedPlacements] = useState({});

    // Merge placements: base placements + spawned placements
    const mergedPlacements = useMemo(() => {
        const result = [...effectivePlacements];
        // Fill in spawned slot placements
        Object.entries(spawnedPlacements).forEach(([key, val]) => {
            const idx = parseInt(key);
            if (idx < result.length && spawnedFlags[idx]) {
                result[idx] = val;
            }
        });
        return result;
    }, [effectivePlacements, spawnedPlacements, spawnedFlags]);

    const placedUids = useMemo(
        () => new Set(mergedPlacements.filter(Boolean).map(p => p.uid)),
        [mergedPlacements]
    );
    const fridgeItems = useMemo(
        () => (inventory || []).filter(item => item.isOutOfGame && !placedUids.has(item.uid)),
        [inventory, placedUids]
    );

    const result = useMemo(() => scoreDish(dish, effectiveSlots, mergedPlacements), [dish, effectiveSlots, mergedPlacements]);

    const placeIngredient = (slotIdx) => {
        if (selectedFridgeIdx === null) return;
        const ing = fridgeItems[selectedFridgeIdx];
        if (!ing) return;
        // Check exclude
        if (!canPlaceInSlot(ing, effectiveSlots[slotIdx])) return;

        if (spawnedFlags[slotIdx]) {
            setSpawnedPlacements(prev => ({ ...prev, [slotIdx]: ing }));
        } else {
            // Map back to base slot index
            let baseIdx = 0;
            for (let i = 0; i < slotIdx; i++) {
                if (!spawnedFlags[i]) baseIdx++;
            }
            // Wait, we need the actual base index. Let's compute it differently.
            // The slotIdx in effectiveSlots corresponds to base slots + spawned slots interleaved.
            // For base slots, we track which base index they map to.
            let bi = -1;
            for (let i = 0; i <= slotIdx; i++) {
                if (!spawnedFlags[i]) bi++;
            }
            setPlacements(prev => {
                const next = [...prev];
                next[bi] = ing;
                return next;
            });
        }
        setSelectedFridgeIdx(null);
    };

    const removeFromSlot = (slotIdx) => {
        if (spawnedFlags[slotIdx]) {
            setSpawnedPlacements(prev => {
                const next = { ...prev };
                delete next[slotIdx];
                return next;
            });
        } else {
            let bi = -1;
            for (let i = 0; i <= slotIdx; i++) {
                if (!spawnedFlags[i]) bi++;
            }
            setPlacements(prev => {
                const next = [...prev];
                next[bi] = null;
                return next;
            });
        }
    };

    const handleCook = () => {
        if (onCook) onCook(result);
    };

    const clearAll = () => {
        setPlacements(dish.slots.map(() => null));
        setSpawnedPlacements({});
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-3 text-white">
                        <ChefHat size={24} />
                        <h1 className="font-bold text-xl">{t('厨房')}</h1>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><X size={22} /></button>
                </div>

                <div className="p-6">
                    {/* Dish info */}
                    <div className="text-center mb-6">
                        <span className="text-4xl">{dish.icon}</span>
                        <h2 className="text-xl font-bold mt-2">{t('今日菜品')}：{dish.name}</h2>
                        <p className="text-sm text-gray-400">{dish.nameEn}</p>
                    </div>

                    {/* Slots */}
                    <div className="flex gap-3 justify-center flex-wrap mb-6">
                        {effectiveSlots.map((slot, i) => (
                            <SlotCard
                                key={`${i}-${slot.name}-${spawnedFlags[i]}`}
                                slot={slot}
                                placed={mergedPlacements[i]}
                                slotResult={result.slotScores[i]}
                                isTargeted={selectedFridgeIdx !== null && !mergedPlacements[i]}
                                isSpawned={spawnedFlags[i]}
                                onPlace={() => placeIngredient(i)}
                                onRemove={() => removeFromSlot(i)}
                            />
                        ))}
                    </div>

                    {/* Score summary + thresholds */}
                    <div className="mb-6 py-3 px-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-center text-sm text-gray-500">
                            {t('总分')}: <span className="font-bold text-lg text-gray-800">{result.total.toFixed(1)}</span>
                            <span className="text-gray-300 mx-2">/</span>
                            <span className="text-gray-400">{t('基准')} {result.baseline}</span>
                        </div>
                        {result.total > 0 && (
                            <div className={`text-center text-xl font-black mt-1 ${RATING_STYLE[result.rating]}`}>
                                {result.rating}
                                <span className="text-sm ml-2 font-bold">
                                    {result.popularityDelta > 0 ? `人气 +${result.popularityDelta}` : `人气 ${result.popularityDelta}`}
                                </span>
                            </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-5 gap-1 text-center text-[10px]">
                            {[
                                { label: '翻车', delta: -2, min: 0, max: dish.baseline * 0.5, color: 'text-red-500' },
                                { label: '勉强', delta: -1, min: dish.baseline * 0.5, max: dish.baseline, color: 'text-orange-500' },
                                { label: '合格', delta: 0, min: dish.baseline, max: dish.baseline * 1.8, color: 'text-green-500' },
                                { label: '优秀', delta: +1, min: dish.baseline * 1.8, max: dish.baseline * 2.5, color: 'text-purple-500' },
                                { label: '惊艳', delta: +2, min: dish.baseline * 2.5, max: null, color: 'text-yellow-500' },
                            ].map((tier, idx) => {
                                const isActive = result.total > 0 && result.rating === tier.label;
                                return (
                                    <div key={idx} className={`py-1 rounded ${isActive ? 'bg-gray-100 ring-1 ring-gray-300' : ''}`}>
                                        <div className={`font-black ${tier.color}`}>{tier.label}</div>
                                        <div className="text-gray-400">
                                            {tier.max ? `${tier.min}–${tier.max}` : `≥${tier.min}`}
                                        </div>
                                        <div className={`font-bold ${tier.color}`}>
                                            {tier.delta > 0 ? `+${tier.delta}` : tier.delta}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fridge */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                            🧊 {t('冰箱')} ({fridgeItems.length})
                        </div>
                        {fridgeItems.length === 0 ? (
                            <p className="text-sm text-gray-300 text-center py-4">{t('没有可用食材')}</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {fridgeItems.map((item, idx) => {
                                    const rarity = item.rarity || item.score || 1;
                                    const rs = RARITY_STYLE[rarity] || RARITY_STYLE[1];
                                    const isSelected = selectedFridgeIdx === idx;
                                    return (
                                        <Tooltip key={item.uid} content={<IngredientTip item={item} />}>
                                            <div
                                                onClick={() => setSelectedFridgeIdx(isSelected ? null : idx)}
                                                className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl cursor-pointer transition-all
                                                    ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300 scale-110' : `${rs.border} bg-gradient-to-b ${rs.bg} hover:scale-105`}`}
                                            >
                                                {item.icon}
                                                <span className={`absolute -bottom-1 -right-1 ${rs.badge} text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow`}>
                                                    {rarity}
                                                </span>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button onClick={clearAll}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={15} /> {t('清空')}
                        </button>
                        <button onClick={handleCook} disabled={mergedPlacements.every(p => !p)}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold hover:from-orange-600 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-md">
                            <ChefHat size={15} /> {t('开始烹饪')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Kitchen;
export { scoreDish, getSlotMatch };
