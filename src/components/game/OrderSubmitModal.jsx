import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { INGREDIENTS, QUALITY_CONFIG } from '../../data/v2Config';
import { computeRewardQuality } from '../../utils/orderReward';

const qualityToScore = (q) => QUALITY_CONFIG.find(c => c.id === q)?.scoreValue ?? q;
import { QUALITY_STYLE } from './BulletinBoard';

const QUALITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };

/** Unified submit modal: player picks which inventory items to consume per
 *  tag2 requirement, and which concrete ingredient to receive per reward. */
const OrderSubmitModal = ({ order, inventory, onConfirm, onCancel }) => {
    const { t, language } = useLanguage();

    const [selections, setSelections] = useState(() => order.requirements.map(() => []));
    const [rewardChoices, setRewardChoices] = useState(() => order.rewards.map(() => null));

    const selectedUids = useMemo(() => new Set(selections.flat()), [selections]);

    // Compute reward quality dynamically from submitted items.
    const computedRewardQualities = useMemo(() => {
        return order.rewards.map((_, rewardIdx) => {
            // Gather all items selected across all requirement slots for this submit.
            const allSelectedUids = selections.flat();
            const submittedItems = allSelectedUids
                .map(uid => inventory.find(item => item.uid === uid))
                .filter(Boolean);
            if (submittedItems.length === 0) return null;
            return computeRewardQuality(submittedItems);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selections, inventory, order.rewards.length]);

    const toggleSelect = (reqIdx, uid) => {
        setSelections(prev => {
            const next = prev.map(s => [...s]);
            const idxInReq = next[reqIdx].indexOf(uid);
            if (idxInReq >= 0) {
                next[reqIdx].splice(idxInReq, 1);
            } else if (next[reqIdx].length < order.requirements[reqIdx].count) {
                next[reqIdx].push(uid);
            }
            return next;
        });
    };

    const pickReward = (rewardIdx, ingredientId) => {
        setRewardChoices(prev => {
            const next = [...prev];
            next[rewardIdx] = ingredientId;
            return next;
        });
    };

    const allReqsFilled = selections.every((sel, i) => sel.length === order.requirements[i].count);
    const allRewardsPicked = rewardChoices.every(id => id !== null);
    const canConfirm = allReqsFilled && allRewardsPicked;

    const handleConfirm = () => {
        if (!canConfirm) return;
        // Pass computed qualities so the caller can attach them to the reward items.
        onConfirm(selections.flat(), rewardChoices, computedRewardQualities);
    };

    // Wrapper is pointer-events-none: clicks pass through so the shelf and
    // inventory behind stay interactive. Only the inner modal captures clicks.
    // Cancel is still reachable via the explicit 取消 button in the footer.
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div onClick={(e) => e.stopPropagation()}
                className="max-w-xl w-full max-h-[85vh] overflow-y-auto bg-kitchen-card rounded-2xl border-2 border-kitchen-gold shadow-2xl pointer-events-auto">

                {/* Header */}
                <div className="px-4 py-3 border-b-2 border-kitchen-gold-border-muted bg-gradient-to-r from-[#FFF8E0] to-[#FFF3E0] sticky top-0 z-10 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-kitchen-gold-deep flex items-center gap-2">
                            📋 {t('提交订单')}
                        </h2>
                    </div>
                </div>

                {/* Consumption section */}
                <div className="px-4 py-3 border-b border-kitchen-gold-border-muted/50">
                    <div className="text-xs font-bold text-kitchen-text-secondary mb-2 uppercase tracking-wide">
                        1. {t('选择要交付的食材')}
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {order.requirements.map((req, reqIdx) => {
                            const candidates = inventory.filter(item =>
                                item?.tags?.[1] === req.tag2
                            );
                            const picked = selections[reqIdx];
                            const needed = req.count;
                            const complete = picked.length === needed;

                            return (
                                <div key={reqIdx} className={`p-2.5 rounded-lg border-2 transition-colors ${complete ? 'border-kitchen-success-border bg-[#F0FFF8]' : 'border-gray-300 bg-kitchen-card'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl leading-none">{req.icon}</span>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-kitchen-text-body">
                                                {t(req.name)}
                                            </div>
                                            <div className="text-[10px] text-kitchen-text-muted">
                                                {t('任意品质均可')} · {picked.length}/{needed}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {candidates.length === 0 && (
                                            <span className="text-xs text-kitchen-text-muted italic">{t('没有合格的食材')}</span>
                                        )}
                                        {candidates.map(item => {
                                            const isPickedHere = picked.includes(item.uid);
                                            const isPickedElsewhere = !isPickedHere && selectedUids.has(item.uid);
                                            const canPick = !isPickedElsewhere && (isPickedHere || picked.length < needed);
                                            const iqs = QUALITY_STYLE[item.quality] || QUALITY_STYLE[1];
                                            const displayName = (language === 'en' && item.nameEn) ? item.nameEn : t(item.name);
                                            return (
                                                <button key={item.uid}
                                                    disabled={!canPick}
                                                    onClick={() => toggleSelect(reqIdx, item.uid)}
                                                    className={`relative w-14 h-14 rounded border-2 flex flex-col items-center justify-center shadow-sm px-0.5 transition-all ${
                                                        isPickedHere ? 'border-kitchen-success ring-2 ring-kitchen-success/40 bg-[#F0FFF8] scale-105' :
                                                        isPickedElsewhere ? 'border-kitchen-gold-border-muted/40 bg-kitchen-card opacity-30 cursor-not-allowed' :
                                                        !canPick ? `${iqs.border} bg-gradient-to-b ${iqs.bg} opacity-50 cursor-not-allowed` :
                                                        `${iqs.border} bg-gradient-to-b ${iqs.bg} hover:scale-105 hover:shadow-md`
                                                    }`}
                                                    title={displayName}
                                                >
                                                    <span className="text-lg leading-none">{item.icon}</span>
                                                    <span className="text-[8px] font-bold leading-tight truncate max-w-full text-slate-700 mt-0.5">
                                                        {displayName}
                                                    </span>
                                                    <span className={`absolute -bottom-1 -right-1 ${iqs.badge} text-white font-black w-3 h-3 text-[7px] rounded-full flex items-center justify-center shadow`}>
                                                        {qualityToScore(item.quality)}
                                                    </span>
                                                    {isPickedHere && (
                                                        <span className="absolute -top-1 -right-1 bg-kitchen-success text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Reward section */}
                <div className="px-4 py-3 border-b border-kitchen-gold-border-muted/50 bg-[#FFFCF5]">
                    <div className="text-xs font-bold text-kitchen-text-secondary mb-2 uppercase tracking-wide">
                        2. {t('选择奖励食材')}
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {order.rewards.map((reward, rewardIdx) => {
                            const computedQuality = computedRewardQualities[rewardIdx];
                            const qs = computedQuality ? (QUALITY_STYLE[computedQuality] || QUALITY_STYLE[1]) : null;
                            const pool = INGREDIENTS.filter(ing => ing.tags?.[1] === reward.tag2);
                            const picked = rewardChoices[rewardIdx];
                            return (
                                <div key={rewardIdx} className={`p-2.5 rounded-lg border-2 transition-colors ${picked ? 'border-kitchen-success-border bg-[#F0FFF8]' : computedQuality ? `${qs.border} bg-kitchen-card` : 'border-gray-300 bg-kitchen-card'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl leading-none">{reward.icon}</span>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-kitchen-text-body flex items-center gap-1.5">
                                                {t(reward.name)}
                                                {computedQuality ? (
                                                    <span className={qs.labelColor}>{QUALITY_STARS[computedQuality]}</span>
                                                ) : (
                                                    <span className="text-gray-400 font-normal text-[11px]">品质待定</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-kitchen-text-muted">
                                                {t('从以下选择一种')}
                                                {computedQuality && (
                                                    <span className={`ml-1 ${qs.labelColor} font-bold`}>
                                                        (scoreValue 合计 → {QUALITY_CONFIG.find(q => q.id === computedQuality)?.scoreValue ?? '?'})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {pool.map(ing => {
                                            const isPicked = picked === ing.id;
                                            const displayName = (language === 'en' && ing.nameEn) ? ing.nameEn : t(ing.name);
                                            const rqs = computedQuality ? (QUALITY_STYLE[computedQuality] || QUALITY_STYLE[1]) : QUALITY_STYLE[1];
                                            return (
                                                <button key={ing.id}
                                                    onClick={() => pickReward(rewardIdx, ing.id)}
                                                    className={`relative w-14 h-14 rounded border-2 flex flex-col items-center justify-center shadow-sm px-0.5 transition-all ${
                                                        isPicked ? 'border-kitchen-gold ring-2 ring-kitchen-gold/40 bg-[#FFF8E0] scale-105' :
                                                        `${rqs.border} bg-gradient-to-b ${rqs.bg} hover:scale-105 hover:shadow-md`
                                                    }`}
                                                    title={displayName}
                                                >
                                                    <span className="text-lg leading-none">{ing.icon}</span>
                                                    <span className="text-[8px] font-bold leading-tight truncate max-w-full text-slate-700 mt-0.5">
                                                        {displayName}
                                                    </span>
                                                    {computedQuality ? (
                                                        <span className={`absolute -bottom-1 -right-1 ${rqs.badge} text-white font-black w-3 h-3 text-[7px] rounded-full flex items-center justify-center shadow`}>
                                                            {qualityToScore(computedQuality)}
                                                        </span>
                                                    ) : (
                                                        <span className="absolute -bottom-1 -right-1 bg-gray-400 text-white font-black w-3 h-3 text-[7px] rounded-full flex items-center justify-center shadow">
                                                            ?
                                                        </span>
                                                    )}
                                                    {isPicked && (
                                                        <span className="absolute -top-1 -right-1 bg-kitchen-gold text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between gap-2 sticky bottom-0 bg-kitchen-card border-t border-kitchen-gold-border-muted/50 rounded-b-2xl">
                    <button onClick={onCancel}
                        className="text-xs px-3 py-1.5 rounded-md border border-kitchen-gold-border-muted bg-kitchen-card font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors">
                        {t('取消')}
                    </button>
                    <button onClick={handleConfirm}
                        disabled={!canConfirm}
                        className={`text-xs px-4 py-1.5 rounded-md font-black transition-all ${
                            canConfirm
                                ? 'bg-kitchen-success text-white hover:brightness-95 shadow-[0_2px_0_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95'
                                : 'bg-kitchen-card/60 text-kitchen-text-muted cursor-not-allowed border border-kitchen-gold-border-muted/60'
                        }`}>
                        {t('确认提交')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSubmitModal;
