import React, { useState, useMemo } from 'react';
import { X, ChefHat, Trash2, Plus } from 'lucide-react';
import { DISHES } from '../../data/v2Config';
import { RARITY_STYLE, IngredientTip } from './IngredientTip';
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
    prefer: 'border-kitchen-gold bg-[#FFF8E0]',
    accept: 'border-kitchen-success-border bg-[#F0FFF8]',
    any: 'border-kitchen-info-border bg-[#F0F8FF]',
    none: 'border-kitchen-gold-border-muted bg-[#F5F0E8]',
    excluded: 'border-kitchen-danger bg-[#FFF0F0]',
};

const RATING_STYLE = {
    '惊艳': 'text-kitchen-gold-deep',
    '优秀': 'text-purple-500',
    '合格': 'text-kitchen-success-border',
    '勉强': 'text-[#B8803C]',
    '翻车': 'text-kitchen-danger-text',
};

const TagBadge = ({ tag, className = '' }) => {
    const { t } = useLanguage();
    return (
        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-kitchen-wood-dark text-kitchen-card ${className}`}>
            {t(tag)}
        </span>
    );
};

// ── Slot Card ──

const SlotCard = ({ slot, placed, slotResult, isTargeted, isSpawned, onPlace, onRemove }) => {
    const { t } = useLanguage();
    const matchStyle = placed ? (MATCH_BORDER[slotResult.matchLevel] || MATCH_BORDER.none) : '';

    return (
        <div className={`flex flex-col bg-kitchen-card rounded-xl border-2 shadow-[0_3px_0_#B8996C] overflow-hidden min-w-[140px]
            ${isSpawned ? 'border-kitchen-info-border ring-1 ring-kitchen-info/40' : 'border-kitchen-wood-border'}`}>
            {/* Header */}
            <div className={`px-3 py-1.5 border-b border-dashed flex items-center justify-between
                ${isSpawned ? 'bg-[#F0F8FF] border-kitchen-info-border/60' : 'bg-gradient-to-b from-[#FFF3E0] to-[#FFE8C8] border-kitchen-wood-border/60'}`}>
                <span className="text-xs font-bold text-kitchen-text-body">
                    {isSpawned && <Plus size={10} className="inline mr-0.5 text-kitchen-info-border" />}
                    {t(slot.name)}
                </span>
                {slot.required && <span className="text-[9px] text-kitchen-danger-text font-bold">{t('必填')}</span>}
            </div>

            {/* Drop zone */}
            <div
                onClick={() => placed ? onRemove() : onPlace()}
                className={`mx-2 my-2 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all
                    ${placed ? `${matchStyle} border-solid` : 'border-kitchen-gold-border-muted bg-[#F5F0E8] hover:border-kitchen-gold hover:bg-[#FFF8E0]'}
                    ${!placed && isTargeted ? 'ring-2 ring-kitchen-gold border-kitchen-gold bg-[#FFF8E0]' : ''}`}
            >
                {placed ? (
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{placed.icon}</span>
                        <div>
                            <div className="text-xs font-bold text-kitchen-text-title leading-tight">{t(placed.name)}</div>
                            <div className="text-[10px] text-kitchen-text-muted">{'★'.repeat(placed.rarity || 1)}</div>
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-kitchen-text-muted">{t('点击放入食材')}</span>
                )}
            </div>

            {/* Score */}
            {placed && (
                <div className="mx-2 mb-1 text-center">
                    <span className="text-sm font-black text-kitchen-text-title">{slotResult.score.toFixed(1)}</span>
                    <span className="text-[10px] text-kitchen-text-muted ml-1">{t('分')}</span>
                    {slotResult.crossBonus > 0 && (
                        <span className="text-[10px] text-pink-500 font-bold ml-1">(🔗+{slotResult.crossBonus})</span>
                    )}
                </div>
            )}

            {/* Rules */}
            <div className="px-3 py-2 border-t border-kitchen-wood-border/50 bg-[#FFFAEF] space-y-1">
                {slot.accept ? (
                    <>
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-kitchen-text-muted w-8 text-right font-mono">×0.5</span>
                            <span className="text-kitchen-text-muted">{t('其他')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-kitchen-success-border w-8 text-right font-mono font-bold">×1</span>
                            <TagBadge tag={slot.accept} />
                        </div>
                        {slot.prefer && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-kitchen-gold-deep w-8 text-right font-mono font-bold">×2</span>
                                <span className="flex gap-1 flex-wrap">
                                    {(Array.isArray(slot.prefer) ? slot.prefer : [slot.prefer]).map(p => (
                                        <TagBadge key={p} tag={p} className="bg-kitchen-gold text-kitchen-text-title" />
                                    ))}
                                </span>
                            </div>
                        )}
                        {slot.exclude && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-kitchen-danger-text w-8 text-right font-mono font-bold">✗</span>
                                <span className="text-kitchen-danger-text">{t('不可放入')}</span>
                                <TagBadge tag={slot.exclude} className="bg-kitchen-danger text-white" />
                            </div>
                        )}
                        {slot.crossBonus && (
                            <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-kitchen-wood-border/40 mt-1">
                                <span className="text-pink-500 w-8 text-right">🔗</span>
                                <span className="text-pink-600">
                                    {t(slot.crossBonus.requireSlot)}{t('为')} <TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-600 text-pink-100" /> {t('时')} +{slot.crossBonus.points}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-kitchen-info-border w-8 text-right font-mono font-bold">×1</span>
                        <span className="text-kitchen-info-border">{t('任意食材')}</span>
                    </div>
                )}
                {/* Trigger rule display */}
                {slot.trigger && (
                    <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-kitchen-wood-border/40 mt-1">
                        <span className="text-kitchen-info-border w-8 text-right">⚡</span>
                        <span className="text-kitchen-info-border">
                            {t('放入')} <TagBadge tag={slot.trigger.whenTag} className="bg-kitchen-info text-white" /> {t('时额外开启一个栏位')}
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
            if (slot.trigger && placements[i]) {
                const tags = placements[i].tags || [];
                if (tags.includes(slot.trigger.whenTag)) {
                    slots.push(slot.trigger.spawnSlot);
                    placed.push(null);
                    spawned.push(true);
                }
            }
        }
        return { effectiveSlots: slots, effectivePlacements: placed, spawnedFlags: spawned };
    }, [dish.slots, placements]);

    const [spawnedPlacements, setSpawnedPlacements] = useState({});

    const mergedPlacements = useMemo(() => {
        const result = [...effectivePlacements];
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
        if (!canPlaceInSlot(ing, effectiveSlots[slotIdx])) return;

        if (spawnedFlags[slotIdx]) {
            setSpawnedPlacements(prev => ({ ...prev, [slotIdx]: ing }));
        } else {
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
            <div className="bg-[#E8D4B0] rounded-2xl shadow-2xl border-2 border-kitchen-wood-shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark border-b-2 border-kitchen-wood-border px-6 py-4 flex items-center justify-between rounded-t-2xl"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(180,140,80,0.1) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
                    <div className="flex items-center gap-3 text-kitchen-text-title">
                        <ChefHat size={24} />
                        <h1 className="font-bold text-xl">{t('厨房')}</h1>
                    </div>
                    <button onClick={onClose} className="text-kitchen-text-body hover:text-kitchen-danger-text"><X size={22} /></button>
                </div>

                <div className="p-6">
                    {/* Dish info */}
                    <div className="text-center mb-6">
                        <span className="text-4xl">{dish.icon}</span>
                        <h2 className="text-xl font-bold mt-2 text-kitchen-text-title">{t('今日菜品')}:{t(dish.name)}</h2>
                        {dish.nameEn && <p className="text-sm text-kitchen-text-muted italic">{dish.nameEn}</p>}
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
                    <div className="mb-6 py-3 px-4 bg-[#FFF3D0] rounded-xl border-2 border-kitchen-gold shadow-[0_3px_0_#D4952A]">
                        <div className="text-center text-sm text-kitchen-text-secondary">
                            {t('总分')}: <span className="font-bold text-lg text-kitchen-text-title">{result.total.toFixed(1)}</span>
                            <span className="text-kitchen-text-muted mx-2">/</span>
                            <span className="text-kitchen-text-muted">{t('基准')} {result.baseline}</span>
                        </div>
                        {result.total > 0 && (
                            <div className={`text-center text-xl font-black mt-1 ${RATING_STYLE[result.rating]}`}>
                                {t(result.rating)}
                                <span className="text-sm ml-2 font-bold">
                                    {result.popularityDelta > 0 ? `${t('人气')} +${result.popularityDelta}` : `${t('人气')} ${result.popularityDelta}`}
                                </span>
                            </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-kitchen-gold/50 grid grid-cols-5 gap-1 text-center text-[10px]">
                            {[
                                { label: '翻车', delta: -2, min: 0, max: dish.baseline * 0.5, color: 'text-kitchen-danger-text' },
                                { label: '勉强', delta: -1, min: dish.baseline * 0.5, max: dish.baseline, color: 'text-[#B8803C]' },
                                { label: '合格', delta: 0, min: dish.baseline, max: dish.baseline * 1.8, color: 'text-kitchen-success-border' },
                                { label: '优秀', delta: +1, min: dish.baseline * 1.8, max: dish.baseline * 2.5, color: 'text-purple-500' },
                                { label: '惊艳', delta: +2, min: dish.baseline * 2.5, max: null, color: 'text-kitchen-gold-deep' },
                            ].map((tier, idx) => {
                                const isActive = result.total > 0 && result.rating === tier.label;
                                return (
                                    <div key={idx} className={`py-1 rounded ${isActive ? 'bg-[#FFF8E0] ring-1 ring-kitchen-gold' : ''}`}>
                                        <div className={`font-black ${tier.color}`}>{t(tier.label)}</div>
                                        <div className="text-kitchen-text-muted">
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

                    {/* Fridge — cool-tinted to signal "cold storage" and separate it from the warm slot/score panels */}
                    <div className="bg-[#E8F4FC] rounded-xl border-2 border-kitchen-info-border shadow-[0_3px_0_#4A8EA6] p-4">
                        <div className="text-xs font-bold text-kitchen-info-border uppercase tracking-wide mb-3">
                            🧊 {t('冰箱')} ({fridgeItems.length})
                        </div>
                        {fridgeItems.length === 0 ? (
                            <p className="text-sm text-kitchen-text-muted text-center py-4">{t('没有可用食材')}</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {fridgeItems.map((item, idx) => {
                                    const rarity = item.rarity || item.score || item.stars || 1;
                                    const rs = RARITY_STYLE[rarity] || RARITY_STYLE[1];
                                    const isSelected = selectedFridgeIdx === idx;
                                    return (
                                        <Tooltip key={item.uid} content={<IngredientTip item={item} />}>
                                            <div
                                                onClick={() => setSelectedFridgeIdx(isSelected ? null : idx)}
                                                className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl cursor-pointer transition-all
                                                    ${isSelected ? 'border-kitchen-gold bg-[#FFF8E0] ring-2 ring-kitchen-gold/50 scale-110' : `${rs.border} bg-gradient-to-b ${rs.bg} hover:scale-105`}`}
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
                            className="flex-1 py-2.5 rounded-xl border-2 border-kitchen-wood-border bg-kitchen-card text-sm font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors flex items-center justify-center gap-1.5 shadow-[0_3px_0_#B8996C]">
                            <Trash2 size={15} /> {t('清空')}
                        </button>
                        <button onClick={handleCook} disabled={mergedPlacements.every(p => !p)}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-sm font-bold text-kitchen-text-body hover:from-[#FFF3E0] hover:to-[#FFE8CC] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-[0_3px_0_#D4952A]">
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
