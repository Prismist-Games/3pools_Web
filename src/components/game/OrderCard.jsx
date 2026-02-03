import React, { useMemo } from 'react';
import { RefreshCw, Check, Ticket, Coins, Clock, Zap, Crown, Trophy } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { checkQualitySatisfaction } from '../../utils/helpers';

const OrderCardBase = ({
    order,
    index,
    isMainline,

    // State
    isSubmitMode,
    canSatisfy, // { index, finalReward, rewardType, isMainline, reqCount, items, qualityRequirements, matchedItems }
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

    const { id, baseReward, rewardType, remainingRefreshes } = order;
    
    // 新系统：物品与品质解耦
    const orderItems = order.items || order.requirements?.map(r => ({ name: r.name, icon: r.icon, poolId: r.poolId })) || [];
    const qualityRequirements = order.qualityRequirements || [];

    // Calculate visualization states
    const isSatisfied = !!canSatisfy;

    // 检查每个物品在背包中的状态
    const itemStates = useMemo(() => {
        return orderItems.map(reqItem => {
            // 背包中是否有此物品
            const inventoryItems = inventory.filter(i => i && i.name === reqItem.name);
            const hasItem = inventoryItems.length > 0;
            
            // 选中的物品中是否有此物品
            const selectedItems = selectedIndices
                .map(idx => inventory[idx])
                .filter(i => i && i.name === reqItem.name);
            const isSelected = selectedItems.length > 0;
            
            // 获取最佳物品（品质最高的）
            const bestItem = hasItem ? 
                inventoryItems.reduce((best, item) => 
                    !best || item.rarity.bonus > best.rarity.bonus ? item : best, null) 
                : null;
            
            const selectedBestItem = isSelected ?
                selectedItems.reduce((best, item) =>
                    !best || item.rarity.bonus > best.rarity.bonus ? item : best, null)
                : null;

            return {
                ...reqItem,
                hasItem,
                isSelected,
                bestItem,
                selectedBestItem
            };
        });
    }, [orderItems, inventory, selectedIndices]);

    // 检查品质要求的满足状态
    const qualityStates = useMemo(() => {
        if (qualityRequirements.length === 0) {
            return { allSatisfied: true, requirements: [] };
        }

        // 获取选中的物品或背包中对应的物品
        const relevantItems = isSubmitMode
            ? selectedIndices.map(idx => inventory[idx]).filter(i => i && orderItems.some(oi => oi.name === i.name))
            : inventory.filter(i => i && orderItems.some(oi => oi.name === i.name));

        if (relevantItems.length < orderItems.length) {
            // 物品数量不足，无法满足
            return {
                allSatisfied: false,
                requirements: qualityRequirements.map(req => ({
                    ...req,
                    currentCount: 0,
                    satisfied: false
                }))
            };
        }

        // 使用贪心算法检查品质满足情况
        const checkResult = checkQualitySatisfaction(relevantItems, qualityRequirements, config);
        
        return {
            allSatisfied: checkResult.satisfied,
            requirements: qualityRequirements.map((req, idx) => ({
                ...req,
                currentCount: checkResult.matchResult[idx]?.matchedItems?.length || 0,
                satisfied: checkResult.matchResult[idx]?.satisfied || false
            }))
        };
    }, [qualityRequirements, inventory, selectedIndices, orderItems, isSubmitMode, config]);

    // 品质名称简写
    const getRarityShortName = (rarityId) => {
        const map = {
            'common': '白',
            'uncommon': '绿',
            'rare': '蓝',
            'epic': '紫',
            'legendary': '橙',
            'mythic': '红'
        };
        return map[rarityId] || rarityId;
    };

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
            <div className="flex flex-col gap-1.5 w-full">

                {/* Header Row: Title & Reward + Refresh */}
                <div className="flex items-center justify-between gap-2 min-h-[32px]">
                    <div className="flex items-center gap-2">
                        {isMainline ? (
                            <span className="text-xs font-black text-yellow-700 uppercase tracking-wider flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-yellow-200">
                                <Crown size={12} /> {t("主线订单")}
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{index + 1}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Reward Badge */}
                        {!isMainline && rewardType !== 'none' && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-black text-xs shadow-sm transition-all ${canSatisfy ? 'bg-orange-500 text-white ring-2 ring-orange-200' : 'bg-yellow-400 text-slate-900'}`}>
                                <span className="text-sm leading-none">{baseReward}</span>
                                {canSatisfy && (
                                    <>
                                        <span className="text-white/80 mx-0.5">→</span>
                                        <span className="text-sm leading-none text-white drop-shadow-sm">{canSatisfy.finalReward}</span>
                                    </>
                                )}
                                <Coins size={12} fill="currentColor" className="opacity-80" />
                            </div>
                        )}

                        {/* Refresh Button (Now inside the flex flow to avoid overlap) */}
                        {!isMainline && !isSubmitMode && currentStageConfig.mechanics.refresh && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRefresh(index); }}
                                disabled={remainingRefreshes <= 0}
                                className={`
                                    relative w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm
                                    ${remainingRefreshes > 0
                                        ? 'bg-orange-100 text-orange-500 hover:bg-orange-200 hover:scale-105 active:scale-95'
                                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'}
                                `}
                                title={t("刷新此订单")}
                            >
                                <RefreshCw size={12} />
                                <div className="absolute -bottom-1 -right-1 bg-white text-[8px] font-black text-slate-500 px-1 py-0.5 rounded-full shadow border border-slate-100">
                                    {remainingRefreshes}
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Items Row: 物品需求（紧凑化） */}
                <div className="flex flex-wrap gap-1">
                    {itemStates.map((itemState, rIdx) => {
                        const { name, icon, hasItem, isSelected, bestItem, selectedBestItem } = itemState;
                        
                        const displayItem = isSubmitMode ? selectedBestItem : bestItem;
                        const isPoolHighlighted = hoveredPoolId && hoveredPoolItemNames && hoveredPoolItemNames.includes(name);
                        const isItemHighlighted = hoveredItemName && name === hoveredItemName;

                        const borderStyle = hasItem ? 'border-solid' : 'border-dashed';
                        let bgColorClass = 'bg-slate-50';
                        if (isMainline) bgColorClass = 'bg-white/60';

                        let iconFilterClass = 'grayscale opacity-50';
                        let textColorClass = 'text-slate-400';

                        if (displayItem) {
                            bgColorClass = displayItem.rarity.color;
                            iconFilterClass = '';
                            textColorClass = 'text-slate-700';
                        } else if (hasItem) {
                            bgColorClass = 'bg-slate-50';
                            iconFilterClass = 'opacity-60';
                            textColorClass = 'text-slate-600';
                        }

                        const borderColorClass = displayItem 
                            ? displayItem.rarity.color.split(' ')[0] 
                            : (hasItem ? bestItem.rarity.color.split(' ')[0] : (isMainline ? 'border-yellow-300' : 'border-slate-300'));

                        return (
                            <div key={rIdx} className={`
                                relative flex items-center gap-1 text-sm border-2 rounded-lg px-2 py-0.1 transition-all duration-200
                                ${borderStyle} ${borderColorClass} ${bgColorClass} ${textColorClass}
                                ${isSelected && isSubmitMode ? 'ring-2 ring-blue-500 shadow-md transform scale-105' : ''}
                                ${(isPoolHighlighted || isItemHighlighted) && !isSubmitMode ? 'scale-105 z-30 shadow-md ring-1 ring-slate-200 border-slate-400' : ''}
                            `}>
                                <span className={`text-lg ${iconFilterClass}`}>{icon}</span>
                                <span className={`font-bold text-xs ${iconFilterClass}`}>{t(name)}</span>
                                {isSelected && isSubmitMode && (
                                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                        <Check size={8} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Quality Requirements Row: 品质要求（新系统） */}
                {qualityRequirements.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{t("品质")}</span>
                        <div className="flex flex-wrap gap-1">
                            {qualityStates.requirements.map((req, idx) => {
                                const rarityConfig = config.rarity.find(r => r.id === req.rarityId);
                                const isSatisfied = req.satisfied;
                                
                                return (
                                    <div
                                        key={idx}
                                        className={`
                                            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                                            border transition-all
                                            ${isSatisfied 
                                                ? 'bg-green-100 border-green-300 text-green-700' 
                                                : `${rarityConfig?.color || 'bg-slate-100'} border-current opacity-80`
                                            }
                                        `}
                                        title={`需要 ${req.count} 个 ${rarityConfig?.name || req.rarityId} 或更高品质`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${rarityConfig?.dotColor || 'bg-slate-400'} shadow-sm`}></div>
                                        <span>{req.count}×{getRarityShortName(req.rarityId)}+</span>
                                        {isSatisfied && <Check size={10} strokeWidth={3} className="text-green-600" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Satisfaction Badge */}
            {isSatisfied && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm animate-bounce flex items-center gap-1">
                    <Check size={8} /> {t("可提交")}
                </div>
            )}
        </div>
    );
};
export const OrderCard = React.memo(OrderCardBase);
