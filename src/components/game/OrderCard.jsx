import React, { useMemo } from 'react';
import { RefreshCw, Check, Zap, Star, AlertCircle, Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const OrderCardBase = ({
    order,
    index,
    isScoreOrder,

    // State
    isSubmitMode,
    isEvacuationMode,
    canSatisfy, // { index, finalScoreReward, matchedItemUid, requiredNames }
    potentialSatisfy, // { index, finalScoreReward, matchedItemUid, requiredNames }
    emergencyOrderCompleted,
    isBeingReplaced,
    isCandidate,

    // Interactions
    onClick,
    onRefresh,
    orderRefreshCount,
    REFRESH_MAX,
    onDebugGetItems,

    // Context
    currentStageConfig,
    config,
    inventory,
    selectedIndices,
    hasSkill,
    hoveredPoolId,
    hoveredItemName,
    hoveredPoolItemNames,
}) => {
    const { t } = useLanguage();

    if (!order) {
        return (
            <div className="h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm">{t("暂无订单")}</span>
            </div>
        );
    }

    const { id, requiredNames, requiredIcons, requirements, baseScoreReward, requiredValue } = order;

    // Get the display names and icons from the order
    const displayNames = requiredNames || requirements?.map(r => r.name) || [];
    const displayIcons = requiredIcons || requirements?.map(r => r.icon) || [];

    const isSatisfied = !!canSatisfy;

    // Check which required names the player has in inventory, and track best rarity
    const nameAvailability = useMemo(() => {
        if (!displayNames.length) return [];
        return displayNames.map(name => {
            let bestRarity = null;
            for (const item of inventory) {
                if (!item) continue;
                const itemNames = item.names || [item.name];
                if (itemNames.includes(name)) {
                    if (!bestRarity || item.rarity.bonus > bestRarity.bonus) {
                        bestRarity = item.rarity;
                    }
                }
            }
            return { hasIt: !!bestRarity, bestRarity };
        });
    }, [displayNames, inventory]);

    // Check if any required name is highlighted (from pool hover or item hover)
    const nameHighlights = useMemo(() => {
        return displayNames.map(name => {
            const isPoolHighlighted = hoveredPoolItemNames && hoveredPoolItemNames.includes(name);
            const isItemHighlighted = hoveredItemName === name;
            return isPoolHighlighted || isItemHighlighted;
        });
    }, [displayNames, hoveredPoolItemNames, hoveredItemName]);

    return (
        <div
            onClick={() => onClick(index, isScoreOrder)}
            className={`
                relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-200
                ${isCandidate ? 'p-2' : 'p-3'}
                ${isCandidate ? 'hover:border-blue-500 hover:shadow-lg cursor-pointer' : ''}
                ${isScoreOrder
                    ? 'border-blue-300 bg-blue-50 ring-4 ring-blue-50'
                    : order.isEmergency
                        ? 'border-red-400 bg-red-50 ring-4 ring-red-50'
                        : 'border-slate-100 hover:border-slate-300'
                }
                ${isSubmitMode ? (canSatisfy || potentialSatisfy ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed') : ''}
                ${isSatisfied
                    ? (isScoreOrder ? 'ring-4 ring-green-400 border-green-500 bg-green-50' : 'ring-4 ring-green-400 border-green-500 bg-green-50 transform scale-[1.02]')
                    : ((isSubmitMode && !isScoreOrder) ? 'opacity-60 grayscale-[0.8] scale-95' : '')
                }
                ${isBeingReplaced ? '!ring-8 !ring-yellow-400 !border-yellow-500 !border-4 !bg-yellow-100 animate-pulse shadow-2xl !scale-[1.05] relative z-20' : ''}
            `}
        >
            {/* Debug button */}
            {onDebugGetItems && index !== -1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDebugGetItems(index); }}
                    className="absolute -top-2 -left-2 z-50 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all"
                    title="Debug: get required items"
                >
                    <Zap size={14} fill="currentColor" />
                </button>
            )}

            {/* Being replaced highlight */}
            {isBeingReplaced && (
                <>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg z-30 animate-bounce flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>{t("正在替换")}</span>
                    </div>
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                </>
            )}

            {/* Content Container */}
            <div className="flex justify-between items-center w-full gap-2">

                {/* Left Side: Info & Requirements */}
                <div className={`flex flex-col flex-1 ${isCandidate ? 'gap-1' : 'gap-1.5'}`}>

                    {/* Header / Reward Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Score Order label */}
                        {isScoreOrder && !isCandidate && (
                            <div className="flex items-center">
                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                                    <Star size={10} fill="currentColor" /> {t("积分订单")}
                                </span>
                            </div>
                        )}

                        {order.isEmergency ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {emergencyOrderCompleted && (
                                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black text-xs shadow-sm border border-green-300">
                                        <Check size={12} />
                                        <span>{t("已完成")}</span>
                                    </div>
                                )}
                                {order.difficulty && (
                                    <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-black text-xs shadow-sm border border-orange-200">
                                        <span>LV.{order.difficulty}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Rewards Badge for Normal/Score Orders */
                            <div className={`flex items-center ${isCandidate ? 'gap-1' : 'gap-2'}`}>
                                <div className={`flex items-center gap-1 rounded-lg font-black text-[10px] shadow-sm ${isCandidate ? 'px-1.5 py-0.5' : 'px-2 py-1'} ${canSatisfy ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                    <span>{baseScoreReward}</span>
                                    {potentialSatisfy && !canSatisfy && (
                                        <>
                                            <span className="opacity-60">~</span>
                                            <span className="text-xs font-black">{potentialSatisfy.finalScoreReward}</span>
                                        </>
                                    )}
                                    {canSatisfy && (
                                        <>
                                            <span className="opacity-60">→</span>
                                            <span className="text-xs">{canSatisfy.finalScoreReward}</span>
                                        </>
                                    )}
                                    <span className="opacity-70">⭐</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Required Names Display */}
                    <div className={`flex flex-wrap items-center ${isCandidate ? 'gap-1' : 'gap-1.5'}`}>
                        {displayNames.map((name, rIdx) => {
                            const icon = displayIcons[rIdx] || '';
                            const { hasIt, bestRarity } = nameAvailability[rIdx] || {};
                            const isHighlighted = nameHighlights[rIdx];

                            return (
                                <React.Fragment key={rIdx}>
                                    {rIdx > 0 && (
                                        <span className={`text-slate-300 font-black ${isCandidate ? 'text-[10px]' : 'text-xs'}`}>×</span>
                                    )}
                                    <div className={`
                                        flex items-center gap-1 rounded border-2 transition-all duration-200
                                        ${isCandidate ? 'px-1.5 py-0.5' : 'px-2 py-1'}
                                        ${hasIt
                                            ? bestRarity.color
                                            : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                                        }
                                        ${isHighlighted && !isSubmitMode ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200 border-slate-400' : ''}
                                    `}>
                                        <span className={`${isCandidate ? 'text-[10px]' : 'text-sm'} ${hasIt ? '' : 'grayscale opacity-50'}`}>{icon}</span>
                                        <span className={`font-bold ${isCandidate ? 'text-[10px]' : 'text-xs'} max-w-[80px] truncate`}>{t(name)}</span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        {/* Value requirement badge */}
                        {requiredValue > 0 && (
                            <>
                                <span className={`text-slate-300 font-black ${isCandidate ? 'text-[10px]' : 'text-xs'}`}>≥</span>
                                <div className={`
                                    flex items-center gap-1 rounded border-2 transition-all duration-200
                                    ${isCandidate ? 'px-1.5 py-0.5' : 'px-2 py-1'}
                                    border-amber-400 bg-amber-50 text-amber-700
                                `}>
                                    <span className={`font-black ${isCandidate ? 'text-[10px]' : 'text-xs'}`}>{t("价值")} {requiredValue}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Refresh Button */}
                {!order.isEmergency && !isSubmitMode && !isEvacuationMode && !isCandidate && currentStageConfig?.mechanics?.refresh && (
                    <div className="flex-none pl-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onRefresh(index); }}
                            disabled={orderRefreshCount <= 0}
                            className={`
                                relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm
                                ${orderRefreshCount > 0
                                    ? 'bg-orange-100 text-orange-500 hover:bg-orange-200 hover:scale-105 active:scale-95'
                                    : 'bg-slate-50 text-slate-300 cursor-not-allowed'}
                            `}
                            title={t("刷新此订单")}
                        >
                            <RefreshCw size={18} />
                            <div className="absolute -bottom-1 -right-1 bg-white text-[10px] font-black text-slate-500 px-1.5 py-0.5 rounded-full shadow border border-slate-100">
                                {orderRefreshCount}
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {isSatisfied && !isCandidate && (
                <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm animate-bounce flex items-center gap-1">
                    <Check size={12} /> {t("可提交")}
                </div>
            )}
        </div>
    );
};
export const OrderCard = React.memo(OrderCardBase);
