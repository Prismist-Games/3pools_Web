import React, { useMemo } from 'react';
import { RefreshCw, Check, Ticket, Coins, Clock, Zap, Crown, Trophy } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const OrderCardBase = ({
    order,
    index,
    isMainline,

    // State
    isSubmitMode,
    canSatisfy, // { index, finalReward, rewardType, isMainline, reqCount, requirements }
    potentialSatisfy, // { index, finalReward ... } (Preview)

    // Interactions
    onClick,
    onRefresh,

    // Context
    currentStageConfig,
    config,
    inventory,
    selectedIndices,
    hasSkill,
    hoveredPoolId,
    hoveredItemName,
    hoveredPoolItemNames,
    selectedItemNames,
}) => {
    const { t } = useLanguage();
    if (!order) {
        return (
            <div className="h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm">{t("暂无订单")}</span>
            </div>
        );
    }

    const { id, requirements, basePatienceReward, baseProgressReward, remainingRefreshes } = order;

    // Calculate visualization states
    const isSatisfied = !!canSatisfy;

    return (
        <div
            onClick={() => onClick(index, isMainline)}
            className={`
                relative bg-white rounded-2xl p-3 shadow-sm border-2 transition-all duration-200
                ${isMainline
                    ? 'border-yellow-300 bg-yellow-50 ring-4 ring-yellow-50'
                    : 'border-slate-100 hover:border-slate-300'
                }
                ${isSubmitMode ? 'cursor-pointer hover:shadow-md' : ''}
                ${isSatisfied
                    ? (isMainline ? 'ring-4 ring-green-400 border-green-500 bg-green-50' : 'ring-4 ring-green-400 border-green-500 bg-green-50 transform scale-[1.02]')
                    : ((isSubmitMode && !isMainline) ? 'opacity-60 grayscale-[0.8] scale-95' : '')
                }
            `}
        >
            {/* Content Container */}
            <div className="flex justify-between items-center w-full gap-2">

                {/* Left Side: Info & Reqs */}
                <div className="flex flex-col gap-1.5 flex-1">

                    {/* Header / Reward Badge */}
                    <div className="flex items-center gap-2">
                        {isMainline ? (
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-yellow-700 uppercase tracking-wider flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-yellow-200">
                                    <Crown size={12} /> {t("主线订单")}
                                </span>
                            </div>
                        ) : (
                            // Normal Order: Show Dual Reward Badge
                            <div className="flex items-center gap-2">
                                {/* Patience Reward */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-black text-xs shadow-sm ${canSatisfy ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-700'}`}>
                                    <span>{basePatienceReward}</span>
                                    {canSatisfy && (
                                        <>
                                            <span className="opacity-60">→</span>
                                            <span className="text-sm">{canSatisfy.finalPatienceReward}</span>
                                        </>
                                    )}
                                    <span className="opacity-70">💗</span>
                                </div>
                                {/* Progress Reward */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-black text-xs shadow-sm ${canSatisfy ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                    <span>{baseProgressReward}</span>
                                    {canSatisfy && (
                                        <>
                                            <span className="opacity-60">→</span>
                                            <span className="text-sm">{canSatisfy.finalProgressReward}</span>
                                        </>
                                    )}
                                    <span className="opacity-70">⭐</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Requirements */}
                    <div className="flex flex-wrap gap-2">
                        {requirements.map((req, rIdx) => {
                            let matchedItem = null;

                            if (isSubmitMode) {
                                const selectedCandidates = selectedIndices
                                    .map(idx => inventory[idx])
                                    .filter(item => item && item.name === req.name);
                                if (selectedCandidates.length > 0) {
                                    selectedCandidates.sort((a, b) => b.rarity.bonus - a.rarity.bonus);
                                    matchedItem = selectedCandidates[0];
                                }
                            }

                            // Calculate progress for this requirement
                            const count = inventory.filter(i => i && i.name === req.name && i.rarity.bonus >= req.requiredRarity.bonus).length;
                            const isMet = count >= 1; // Simplification: we need 1 matching item per requirement slot? Or generally? 
                            // Current logic implies 1-to-1 mapping in UI but count check here.

                            // Visual State: Is selected?
                            const isSelected = selectedIndices.some(idx => {
                                const item = inventory[idx];
                                return item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus;
                            });
                            const isSubmitted = isSubmitMode && selectedItemNames && selectedItemNames.includes(req.name);

                            // Helpers for UI styling (restored)
                            // Find "best" candidate to show quality match status if not selected
                            const allCandidates = inventory.filter(i => i && i.name === req.name);
                            allCandidates.sort((a, b) => (b.rarity.bonus || 0) - (a.rarity.bonus || 0));
                            const bestCandidate = allCandidates[0];

                            // If we are selecting, we might have a specific matchedItem
                            if (!matchedItem) {
                                matchedItem = bestCandidate;
                            }

                            const hasItem = !!matchedItem;
                            const isQualitySatisfied = matchedItem && matchedItem.rarity.bonus >= req.requiredRarity.bonus;

                            const isPoolHighlighted = hoveredPoolId && !req.isMainlineItem && hoveredPoolItemNames && hoveredPoolItemNames.includes(req.name);
                            const isItemHighlighted = hoveredItemName && req.name === hoveredItemName;

                            const borderStyle = hasItem ? 'border-solid' : 'border-dashed';
                            let bgColorClass = 'bg-slate-50';
                            if (isMainline) bgColorClass = 'bg-white/60';

                            let iconFilterClass = 'grayscale opacity-50';
                            let textColorClass = 'text-slate-400';

                            if (hasItem && isQualitySatisfied) {
                                bgColorClass = matchedItem.rarity.color;
                                iconFilterClass = '';
                                textColorClass = 'text-slate-700';
                            } else if (hasItem && !isQualitySatisfied) {
                                bgColorClass = isMainline ? 'bg-white' : 'bg-slate-50';
                                iconFilterClass = 'grayscale opacity-50';
                                textColorClass = 'text-slate-500';
                            }

                            const borderColorClass = hasItem ? matchedItem.rarity.color.split(' ')[0] : (isMainline ? 'border-yellow-300' : 'border-slate-300');

                            return (
                                <div key={rIdx} className={`
                                relative flex items-center gap-1 text-sm border-2 rounded px-2 py-1 transition-all duration-200
                                ${borderStyle} ${borderColorClass} ${bgColorClass} ${textColorClass}
                                ${isSubmitted ? 'ring-2 ring-blue-500 shadow-md transform scale-105' : ''}
                                ${(isPoolHighlighted || isItemHighlighted) && !isSubmitMode ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200 border-slate-400' : ''}
                            `}>
                                    <div className={`w-2 h-2 rounded-full ${req.requiredRarity.dotColor} shadow-sm border border-white/50 shrink-0`} title={`${t("需要")}: ${t(req.requiredRarity.name)}`}></div>
                                    <span className={`${iconFilterClass}`}>{req.icon}</span>
                                    <span className={`font-bold ${iconFilterClass}`}>{t(req.name)}</span>
                                    {isSubmitted && isQualitySatisfied && (
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                            <Check size={10} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Refresh Button (Centered) */}
                {!isMainline && !isSubmitMode && currentStageConfig.mechanics.refresh && (
                    <div className="flex-none pl-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onRefresh(index); }}
                            disabled={remainingRefreshes <= 0}
                            className={`
                                relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm
                                ${remainingRefreshes > 0
                                    ? 'bg-orange-100 text-orange-500 hover:bg-orange-200 hover:scale-105 active:scale-95'
                                    : 'bg-slate-50 text-slate-300 cursor-not-allowed'}
                            `}
                            title={t("刷新此订单")}
                        >
                            <RefreshCw size={18} />
                            <div className="absolute -bottom-1 -right-1 bg-white text-[10px] font-black text-slate-500 px-1.5 py-0.5 rounded-full shadow border border-slate-100">
                                {remainingRefreshes}
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {isSatisfied && (
                <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm animate-bounce flex items-center gap-1">
                    <Check size={12} /> {t("可提交")}
                </div>
            )}
        </div>
    );
};
export const OrderCard = React.memo(OrderCardBase);
