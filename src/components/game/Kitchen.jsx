import React, { useState, useMemo } from 'react';
import { X, ChefHat, Trash2, Plus } from 'lucide-react';
import { DISHES, INGREDIENTS } from '../../data/v2Config';
import { RARITY_STYLE, IngredientTip } from './BulletinBoard';

const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));
import Tooltip from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Matching & Scoring ──
// Rules-based matching: each slot has rules[], each rule has
// { match: { tag | id }, multiplier }. Evaluate all rules, take the
// highest multiplier among matches. No matches → defaultMultiplier.
// exclude (optional) hard-blocks placement.

function ruleMatches(ingredient, rule) {
    if (rule.match?.tag) return (ingredient.tags || []).includes(rule.match.tag);
    if (rule.match?.id) return ingredient.id === rule.match.id;
    return false;
}

function getSlotMatch(ingredient, slot) {
    const tags = ingredient.tags || [];
    if (slot.exclude && tags.includes(slot.exclude)) {
        return { multiplier: 0, matchLevel: 'excluded', matchedRule: null };
    }
    const rules = slot.rules || [];
    if (rules.length === 0) {
        return { multiplier: slot.defaultMultiplier ?? 1, matchLevel: 'default', matchedRule: null };
    }
    let best = null;
    for (const rule of rules) {
        if (!ruleMatches(ingredient, rule)) continue;
        if (!best || rule.multiplier > best.multiplier) best = rule;
    }
    if (best) {
        const level = best.multiplier >= 2 ? 'prefer' : best.multiplier >= 1 ? 'accept' : 'none';
        return { multiplier: best.multiplier, matchLevel: level, matchedRule: best };
    }
    return { multiplier: slot.defaultMultiplier ?? 0.5, matchLevel: 'none', matchedRule: null };
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

    // Second pass: cross-slot bonuses. Supports both legacy points (flat
    // addition) and new multiplier (multiplicative on slot score).
    effectiveSlots.forEach((slot, i) => {
        if (!slot.crossBonus || !placements[i]) return;
        const { requireSlot, requireTag, points, multiplier } = slot.crossBonus;
        const targetIdx = effectiveSlots.findIndex(s => s.name === requireSlot);
        if (targetIdx < 0 || !placements[targetIdx]) return;
        const targetTags = placements[targetIdx].tags || [];
        if (!targetTags.includes(requireTag)) return;
        if (multiplier) {
            const bonusScore = slotScores[i].score * (multiplier - 1);
            slotScores[i].score += bonusScore;
            slotScores[i].crossBonus = bonusScore;
        } else if (points) {
            slotScores[i].score += points;
            slotScores[i].crossBonus = points;
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
        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-kitchen-wood-shadow text-kitchen-card ${className}`}>
            {t(tag)}
        </span>
    );
};

// SlotPreview removed — DishCard (components/game/DishCard.jsx) now handles
// the read-only dish+slot display with rules[]-aware rendering.

// ── Slot Card ──

const SlotCard = ({ slot, placed, slotResult, isTargeted, isSpawned, onPlace, onRemove }) => {
    const { t, language } = useLanguage();
    const matchStyle = placed ? (MATCH_BORDER[slotResult.matchLevel] || MATCH_BORDER.none) : '';
    const placedName = placed ? (language === 'en' && placed.nameEn ? placed.nameEn : t(placed.name)) : '';

    return (
        <div className={`flex flex-col bg-kitchen-card rounded-xl border-2 shadow-[0_2px_0_#D4B896] overflow-hidden min-w-[140px]
            ${isSpawned ? 'border-kitchen-info-border ring-1 ring-kitchen-info/40' : 'border-kitchen-gold-border-muted'}`}>
            {/* Header */}
            <div className={`px-3 py-1.5 border-b border-dashed flex items-center justify-between
                ${isSpawned ? 'bg-[#F0F8FF] border-kitchen-info-border/60' : 'bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-kitchen-gold-border-muted'}`}>
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
                            <div className="text-xs font-bold text-kitchen-text-title leading-tight">{placedName}</div>
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

            {/* Rules — rendered from slot.rules[] */}
            <div className="px-3 py-2 border-t border-kitchen-gold-border-muted/50 space-y-1">
                {(slot.rules && slot.rules.length > 0) ? (
                    <>
                        {/* Default (non-matching) line */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-kitchen-text-muted w-8 text-right font-mono">×{slot.defaultMultiplier ?? 0.5}</span>
                            <span className="text-kitchen-text-muted">{t('其他')}</span>
                        </div>
                        {/* Each rule, sorted by multiplier ascending */}
                        {[...slot.rules].sort((a, b) => a.multiplier - b.multiplier).map((rule, ri) => {
                            const isTop = rule.multiplier >= 2;
                            const color = isTop ? 'text-kitchen-gold-deep' : 'text-kitchen-success-border';
                            let label;
                            if (rule.match?.tag) {
                                label = <TagBadge tag={rule.match.tag} className={isTop ? 'bg-kitchen-gold text-kitchen-text-title' : ''} />;
                            } else if (rule.match?.id) {
                                const item = INGREDIENT_MAP[rule.match.id];
                                const itemName = item ? (language === 'en' && item.nameEn ? item.nameEn : t(item.name)) : rule.match.id;
                                label = <span className={`font-bold ${color}`}>{item ? `${item.icon} ${itemName}` : rule.match.id}</span>;
                            }
                            return (
                                <div key={ri} className="flex items-center gap-1.5 text-[10px]">
                                    <span className={`${color} w-8 text-right font-mono font-bold`}>×{rule.multiplier}</span>
                                    {label}
                                </div>
                            );
                        })}
                        {slot.exclude && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-kitchen-danger-text w-8 text-right font-mono font-bold">✗</span>
                                <span className="text-kitchen-danger-text">{t('不可放入')}</span>
                                <TagBadge tag={slot.exclude} className="bg-kitchen-danger text-white" />
                            </div>
                        )}
                        {slot.crossBonus && (
                            <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-kitchen-gold-border-muted/50 mt-1">
                                <span className="text-pink-500 w-8 text-right">🔗</span>
                                <span className="text-pink-600">
                                    {t(slot.crossBonus.requireSlot)}{t('为')} <TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-600 text-pink-100" /> {t('时')}
                                    {slot.crossBonus.multiplier ? ` ×${slot.crossBonus.multiplier}` : ` +${slot.crossBonus.points}`}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    /* No rules = open slot */
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-kitchen-info-border w-8 text-right font-mono font-bold">×{slot.defaultMultiplier ?? 1}</span>
                        <span className="text-kitchen-info-border">{t('任意食材')}</span>
                    </div>
                )}
                {/* Trigger rule display */}
                {slot.trigger && (
                    <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-kitchen-gold-border-muted/50 mt-1">
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

// ── Top-down kitchen scene (tile map, restaurant phase only) ──

const T = 26;
const _t = (bg, bd, em, sz) => ({ bg, bd, em, sz });

// Tiles re-tinted toward the kitchen palette (wood/warm tones match page bg)
const TL = {
    // Walls — deep wood
    W:  _t('#6a4a2f','#523824'),
    wn: _t('#6a4a2f','#523824','🪟',14),
    wp: _t('#6a4a2f','#523824','🖼️',12),
    dr: _t('#8a6e50','#6a4a2f'),
    // Floor — warm cream (matches kitchen-card / F5E6D0 vibes)
    F:  _t('#F5E6D0','#EDD8BC'),
    // Kitchen counter
    ct: _t('#A08060','#907050'),
    st: _t('#A08060','#907050','🔥',13),
    pt: _t('#A08060','#907050','🫕',13),
    kn: _t('#A08060','#907050','🔪',11),
    sk: _t('#A08060','#907050','💧',11),
    fr: _t('#D0D8E0','#B8C0C8','🧊',13),
    sh: _t('#6a4a2f','#523824','📚',12),
    // Dining table — kitchen gold
    tb: _t('#C89058','#B07838'),
    td: _t('#C89058','#B07838','🍽️',14),
    DS: _t('#C89058','#B07838'),
    // Chair — light gold
    cr: _t('#E8C878','#D4B060'),
    // Deco
    pl: _t('#F5E6D0','#EDD8BC','🌿',14),
    lm: _t('#F5E6D0','#EDD8BC','🕯️',12),
    rg: _t('#D4B088','#C8A478'),
    // Characters
    CH: _t('#F5E6D0','#EDD8BC','👨‍🍳',17),
    CU: _t('#F5E6D0','#EDD8BC','🧑',17),
};

const SC = [
    'W  W  W  wn W  W  W  W  wn W  W  wp W  W',
    'W  fr ct st pt kn sk ct F  F  F  sh F  W',
    'W  F  F  F  F  F  F  F  F  F  F  F  F  W',
    'W  F  CH F  F  F  cr tb td tb cr F  lm W',
    'W  F  F  F  rg rg F  tb DS tb F  CU F  W',
    'W  F  F  F  rg rg cr tb tb tb cr F  pl W',
    'W  F  F  F  F  F  F  F  F  F  F  F  F  W',
    'W  W  W  W  dr dr W  W  W  W  W  W  W  W',
].map(row => row.split(/\s+/));

const KitchenScene = ({ dish }) => (
    <div className="mb-4 flex justify-center">
        <div className="inline-block rounded-xl overflow-hidden shadow-[0_4px_0_#C8A880,0_6px_12px_rgba(0,0,0,0.1)]"
            style={{ border: '3px solid #523824', background: '#523824' }}>
            {SC.map((row, ri) => (
                <div key={ri} className="flex">
                    {row.map((cell, ci) => {
                        const tile = TL[cell] || TL.F;
                        const isDish = cell === 'DS';
                        const isChair = cell === 'cr';
                        return (
                            <div
                                key={ci}
                                style={{
                                    width: T, height: T,
                                    backgroundColor: tile.bg,
                                    borderRight: `1px solid ${tile.bd}`,
                                    borderBottom: `1px solid ${tile.bd}`,
                                    borderRadius: isChair ? 6 : 0,
                                }}
                                className="flex items-center justify-center"
                            >
                                {isDish && dish?.icon
                                    ? <span style={{ fontSize: 15 }}>{dish.icon}</span>
                                    : tile.em && <span style={{ fontSize: tile.sz || 13 }}>{tile.em}</span>
                                }
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    </div>
);

// ── Kitchen Component ──

const Kitchen = ({ inventory, dish: dishOverride, onCook, onClose, isRestaurantPhase = false }) => {
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
        const usedUids = mergedPlacements.filter(Boolean).map(p => p.uid);
        if (onCook) onCook(result, usedUids);
    };

    // Validation: restaurant phase requires all `required` slots to be filled
    // before the cook button enables. In modal mode any non-empty placement
    // is enough, preserving the earlier preview-only ergonomics.
    const missingRequired = effectiveSlots.filter((slot, i) => slot.required && !mergedPlacements[i]);
    const canCook = isRestaurantPhase
        ? missingRequired.length === 0
        : mergedPlacements.some(p => p);

    const clearAll = () => {
        setPlacements(dish.slots.map(() => null));
        setSpawnedPlacements({});
    };

    const content = (
        <div className={isRestaurantPhase
            ? 'w-full max-w-3xl mx-auto'
            : 'bg-[#F5F0E8] rounded-2xl shadow-2xl border-2 border-kitchen-gold-border w-full max-w-3xl max-h-[90vh] overflow-y-auto'
        }>
            {/* Header */}
            <div className={`bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark border-b-2 border-kitchen-wood-border px-6 py-4 flex items-center justify-between ${isRestaurantPhase ? 'rounded-xl mb-4' : 'rounded-t-2xl'}`}
                style={{ backgroundImage: 'radial-gradient(circle, rgba(180,140,80,0.1) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
                <div className="flex items-center gap-3 text-kitchen-text-title">
                    <ChefHat size={24} />
                    <h1 className="font-bold text-xl">{t('厨房')}</h1>
                </div>
                {!isRestaurantPhase && <button onClick={onClose} className="text-kitchen-text-body hover:text-kitchen-danger-text"><X size={22} /></button>}
            </div>

            <div className={isRestaurantPhase ? '' : 'p-6'}>
                    {/* Kitchen scene — tile map, restaurant phase only */}
                    {isRestaurantPhase && <KitchenScene dish={dish} />}

                    {/* Dish info — only in modal; restaurant phase shows via sidebar DishCard */}
                    {!isRestaurantPhase && (
                        <div className="text-center mb-6">
                            <span className="text-4xl">{dish.icon}</span>
                            <h2 className="text-xl font-bold mt-2 text-kitchen-text-title">{t('今日菜品')}：{t(dish.name)}</h2>
                            {dish.nameEn && <p className="text-sm text-kitchen-text-muted italic">{dish.nameEn}</p>}
                        </div>
                    )}

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

                    {/* Score — only number, no baseline / thresholds / rating during preview */}
                    <div className="mb-6 py-3 px-4 bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border-muted shadow-[0_2px_0_#D4B896] text-center">
                        <div className="text-sm text-kitchen-text-secondary">
                            {t('总分')}: <span className="font-bold text-2xl text-kitchen-text-title">{result.total.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Fridge */}
                    <div className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border-muted shadow-[0_2px_0_#D4B896] p-4">
                        <div className="text-xs font-bold text-kitchen-text-body uppercase tracking-wide mb-3">
                            🧊 {t('冰箱')} ({fridgeItems.length})
                        </div>
                        {fridgeItems.length === 0 ? (
                            <p className="text-sm text-kitchen-text-muted text-center py-4">{t('没有可用食材')}</p>
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

                    {/* Required-slots hint (restaurant phase only) */}
                    {isRestaurantPhase && !canCook && (
                        <div className="text-center text-xs text-kitchen-danger-text mt-4">
                            {t('必填槽位未填')}：{missingRequired.map(s => t(s.name)).join('、')}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button onClick={clearAll}
                            className="flex-1 py-2.5 rounded-xl border-2 border-kitchen-gold-border-muted bg-kitchen-card text-sm font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors flex items-center justify-center gap-1.5 shadow-[0_2px_0_#D4B896]">
                            <Trash2 size={15} /> {t('清空')}
                        </button>
                        <button onClick={handleCook} disabled={!canCook}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold text-sm font-bold text-kitchen-text-body hover:from-[#FFF3E0] hover:to-[#FFE8CC] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-[0_3px_0_#D4952A]">
                            <ChefHat size={15} /> {t('开始烹饪')}
                        </button>
                    </div>
                </div>
            </div>
    );

    // Restaurant phase: render inline (GameCore wraps in a full-screen phase).
    // Modal mode: fixed overlay over the rest of the page.
    if (isRestaurantPhase) return content;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            {content}
        </div>
    );
};

export default Kitchen;
export { scoreDish, getSlotMatch };
