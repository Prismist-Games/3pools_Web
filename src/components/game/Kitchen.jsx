import React, { useState, useMemo } from 'react';
import { X, ChefHat, Trash2, Plus } from 'lucide-react';
import { DISHES, INGREDIENTS } from '../../data/v2Config';

// Lookup map: item id → item object
const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));
import { RARITY_STYLE, IngredientTip } from './BulletinBoard';
import Tooltip from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Matching & Scoring ──
// Rules-based matching: each slot has rules[], evaluate all, take highest multiplier

function getSlotMatch(ingredient, slot) {
    const tags = ingredient.tags || [];
    // Exclude check
    if (slot.exclude && tags.includes(slot.exclude)) {
        return { multiplier: 0, matchLevel: 'excluded', matchedRule: null };
    }
    const rules = slot.rules || [];
    // No rules = open slot (配料), use defaultMultiplier
    if (rules.length === 0) {
        return { multiplier: slot.defaultMultiplier ?? 1, matchLevel: 'default', matchedRule: null };
    }
    // Evaluate all rules, take the highest multiplier
    let bestMultiplier = slot.defaultMultiplier ?? 0.5;
    let bestRule = null;
    for (const rule of rules) {
        let matches = false;
        if (rule.match.tag) matches = tags.includes(rule.match.tag);
        else if (rule.match.id) matches = ingredient.id === rule.match.id;
        // Future: rule.match.minRarity, rule.match.tags, etc.
        if (matches && rule.multiplier > bestMultiplier) {
            bestMultiplier = rule.multiplier;
            bestRule = rule;
        }
    }
    // Determine match level for styling
    const matchLevel = bestRule ? (bestMultiplier >= 2 ? 'best' : 'good') : 'none';
    return { multiplier: bestMultiplier, matchLevel, matchedRule: bestRule };
}

function canPlaceInSlot(ingredient, slot) {
    if (slot.exclude && (ingredient.tags || []).includes(slot.exclude)) return false;
    return true;
}

function scoreDish(dish, effectiveSlots, placements) {
    // Pre-check which crossBonus conditions are met
    const crossBonusActive = effectiveSlots.map((slot) => {
        if (!slot.crossBonus) return false;
        const { requireSlot, requireTag } = slot.crossBonus;
        const targetIdx = effectiveSlots.findIndex(s => s.name === requireSlot);
        if (targetIdx < 0 || !placements[targetIdx]) return false;
        const targetTags = placements[targetIdx].tags || [];
        return targetTags.includes(requireTag);
    });

    // Single pass: compute each slot's score, applying crossBonus multiplier where active
    const slotScores = effectiveSlots.map((slot, i) => {
        const ing = placements[i];
        if (!ing) return { score: 0, empty: true, required: slot.required, crossBonusActive: crossBonusActive[i] };
        const base = ing.rarity || 1;
        const { multiplier, matchLevel } = getSlotMatch(ing, slot);

        let finalScore = base * multiplier;
        let crossBonusAmount = 0;

        if (crossBonusActive[i]) {
            const cb = slot.crossBonus;
            if (cb.multiplier) {
                // Multiplier-type: multiply the slot's score
                const boosted = finalScore * cb.multiplier;
                crossBonusAmount = boosted - finalScore;
                finalScore = boosted;
            } else if (cb.points) {
                // Flat points-type (legacy support)
                finalScore += cb.points;
                crossBonusAmount = cb.points;
            }
        }

        return {
            score: finalScore,
            matchLevel,
            empty: false,
            required: slot.required,
            crossBonus: crossBonusAmount,
            crossBonusActive: crossBonusActive[i],
        };
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
    best: 'border-yellow-400 bg-yellow-50',
    good: 'border-green-400 bg-green-50',
    default: 'border-blue-300 bg-blue-50',
    none: 'border-gray-300 bg-gray-100',
    excluded: 'border-red-300 bg-red-50',
};

// ── Top-down kitchen scene (RPG style) ──

const T = 26;

// Tile definitions: [background, borderColor, emoji?, emojiSize?]
// Using a simple array for compactness
const _t = (bg, bd, em, sz) => ({ bg, bd, em, sz });
const TL = {
    // Walls
    W:  _t('#5c4033','#4a3228'),
    wn: _t('#5c4033','#4a3228','🪟',14),
    wp: _t('#5c4033','#4a3228','🖼️',12),
    dr: _t('#7a6548','#5c4033'),
    // Floor — single warm tone, no pattern
    F:  _t('#f0e0c0','#eadab8'),
    // Kitchen counter
    ct: _t('#9a8a78','#887868'),
    st: _t('#9a8a78','#887868','🔥',13),
    pt: _t('#9a8a78','#887868','🫕',13),
    kn: _t('#9a8a78','#887868','🔪',11),
    sk: _t('#9a8a78','#887868','💧',11),
    fr: _t('#c8d0d8','#b0b8c0','🧊',13),
    sh: _t('#5c4033','#4a3228','📚',12),
    // Table — warm brown
    tb: _t('#a0782c','#8a6820'),
    td: _t('#a0782c','#8a6820','🍽️',14),
    DS: _t('#a0782c','#8a6820'),
    // Chair — rounded, lighter
    cr: _t('#c8a870','#b89860'),
    // Deco
    pl: _t('#f0e0c0','#eadab8','🌿',14),
    lm: _t('#f0e0c0','#eadab8','🕯️',12),
    rg: _t('#d4b088','#c8a478'),
    // Characters
    CH: _t('#f0e0c0','#eadab8','👨‍🍳',17),
    CU: _t('#f0e0c0','#eadab8','🧑',17),
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
        <div className="inline-block rounded-xl overflow-hidden shadow-lg" style={{ border: '3px solid #4a3228', background: '#4a3228' }}>
            {SC.map((row, ri) => (
                <div key={ri} className="flex">
                    {row.map((cell, ci) => {
                        const t = TL[cell] || TL.F;
                        const isDish = cell === 'DS';
                        const isChair = cell === 'cr';
                        return (
                            <div
                                key={ci}
                                style={{
                                    width: T, height: T,
                                    backgroundColor: t.bg,
                                    borderRight: `1px solid ${t.bd}`,
                                    borderBottom: `1px solid ${t.bd}`,
                                    borderRadius: isChair ? 6 : 0,
                                }}
                                className="flex items-center justify-center"
                            >
                                {isDish && dish?.icon
                                    ? <span style={{ fontSize: 15 }}>{dish.icon}</span>
                                    : t.em && <span style={{ fontSize: t.sz || 13 }}>{t.em}</span>
                                }
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    </div>
);

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
                        <span className="text-[10px] text-pink-500 font-bold ml-1">(🔗 +{slotResult.crossBonus.toFixed(1)})</span>
                    )}
                </div>
            )}

            {/* Rules — rendered from slot.rules[] */}
            <div className="px-3 py-2 border-t border-gray-100 space-y-1">
                {(slot.rules && slot.rules.length > 0) ? (
                    <>
                        {/* Default (non-matching) line */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-gray-400 w-8 text-right font-mono">×{slot.defaultMultiplier ?? 0.5}</span>
                            <span className="text-gray-400">{t('其他')}</span>
                        </div>
                        {/* Each rule, sorted by multiplier ascending */}
                        {[...slot.rules].sort((a, b) => a.multiplier - b.multiplier).map((rule, ri) => {
                            const isTop = rule.multiplier >= 2;
                            const color = isTop ? 'text-yellow-600' : 'text-green-600';
                            // Determine label: tag match shows as badge, id match shows item name
                            let label;
                            if (rule.match.tag) {
                                label = <TagBadge tag={rule.match.tag} className={isTop ? 'bg-yellow-600 text-yellow-100' : ''} />;
                            } else if (rule.match.id) {
                                const item = INGREDIENT_MAP[rule.match.id];
                                label = <span className={`font-bold ${color}`}>{item ? `${item.icon} ${item.name}` : rule.match.id}</span>;
                            }
                            return (
                                <div key={ri} className="flex items-center gap-1.5 text-[10px]">
                                    <span className={`${color} w-8 text-right font-mono font-bold`}>×{rule.multiplier}</span>
                                    {label}
                                </div>
                            );
                        })}
                        {/* Exclude rule */}
                        {slot.exclude && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-red-400 w-8 text-right font-mono font-bold">✗</span>
                                <span className="text-red-400">{t('不可放入')}</span>
                                <TagBadge tag={slot.exclude} className="bg-red-600 text-red-100" />
                            </div>
                        )}
                        {/* Cross bonus */}
                        {slot.crossBonus && (
                            <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-gray-100 mt-1">
                                <span className="text-pink-500 w-8 text-right">🔗</span>
                                <span className="text-pink-600">
                                    {slot.crossBonus.requireSlot}{t('为')} <TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-600 text-pink-100" /> {t('时')}
                                    {slot.crossBonus.multiplier ? ` 倍率 ×${slot.crossBonus.multiplier}` : ` +${slot.crossBonus.points}`}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    /* No rules = open slot */
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-blue-500 w-8 text-right font-mono font-bold">×{slot.defaultMultiplier ?? 1}</span>
                        <span className="text-blue-500">{t('任意食材')}</span>
                    </div>
                )}
                {/* Trigger */}
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

    // Validation: all required slots must be filled
    const missingRequired = effectiveSlots.filter((slot, i) => slot.required && !mergedPlacements[i]);
    const canCook = missingRequired.length === 0;

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
        // Collect UIDs of all placed ingredients
        const usedUids = mergedPlacements.filter(Boolean).map(p => p.uid);
        if (onCook) onCook(result, usedUids);
    };

    const clearAll = () => {
        setPlacements(dish.slots.map(() => null));
        setSpawnedPlacements({});
    };

    const content = (
        <div className={isRestaurantPhase ? 'w-full max-w-3xl mx-auto' : 'bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto'}>
            {/* Header */}
            <div className={`bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between ${isRestaurantPhase ? 'rounded-xl mb-4' : 'rounded-t-2xl'}`}>
                <div className="flex items-center gap-3 text-white">
                    <ChefHat size={24} />
                    <h1 className="font-bold text-xl">{t('厨房')}</h1>
                </div>
                {!isRestaurantPhase && <button onClick={onClose} className="text-white/80 hover:text-white"><X size={22} /></button>}
            </div>

            <div className={isRestaurantPhase ? '' : 'p-6'}>
                    {/* Kitchen scene — top-down tile map */}
                    {isRestaurantPhase && <KitchenScene dish={dish} />}

                    {/* Dish info (compact when inline) */}
                    {!isRestaurantPhase && (
                        <div className="text-center mb-6">
                            <span className="text-4xl">{dish.icon}</span>
                            <h2 className="text-xl font-bold mt-2">{t('今日菜品')}：{dish.name}</h2>
                            <p className="text-sm text-gray-400">{dish.nameEn}</p>
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

                    {/* Score — only number, no rating text */}
                    <div className="mb-6 py-3 px-4 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
                        <div className="text-sm text-gray-500">
                            {t('总分')}: <span className="font-bold text-2xl text-gray-800">{result.total.toFixed(1)}</span>
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

                    {/* Required slots hint */}
                    {!canCook && (
                        <div className="text-center text-xs text-red-500 mt-4">
                            {t('必填槽位未填')}：{missingRequired.map(s => s.name).join('、')}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                        <button onClick={clearAll}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={15} /> {t('清空')}
                        </button>
                        <button onClick={handleCook} disabled={!canCook}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold hover:from-orange-600 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-md">
                            <ChefHat size={15} /> {t('开始烹饪')}
                        </button>
                    </div>
                </div>
            </div>
        );

    // Modal wrapper for toolbar access; inline for restaurant phase
    if (isRestaurantPhase) return content;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            {content}
        </div>
    );
};

export default Kitchen;
export { scoreDish, getSlotMatch };
