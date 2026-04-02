import React, { useMemo, useState } from 'react';
import { RefreshCw, Check, Zap, Star, AlertCircle, Link, ChevronsUp, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const OrderCardBase = ({
    order,
    index,
    isScoreOrder,

    // State
    isSubmitMode,
    isEvacuationMode,
    canSatisfy, // { index, finalReward, rewardType, isScoreOrder, reqCount, requirements }
    potentialSatisfy, // { index, finalReward ... } (Preview)
    emergencyOrderCompleted, // 撤离订单已完成标记
    isBeingReplaced, // 新增：是否正在被二选一替换
    isCandidate, // 新增：是否是候选订单（用于压缩显示）

    // Interactions
    onClick,
    onRefresh,
    orderRefreshCount,
    REFRESH_MAX,
    onDebugGetItems, // 新增：调试获取物品

    // Context
    currentStageConfig,
    config,
    inventory,
    selectedIndices,
    hasSkill,
    hoveredPoolId,
    hoveredItemName,
    hoveredPoolItemNames,
    matrixHoveredItems,
    selectedItemNames,
    // 订单槽位系统
    orderSlotAssignments,
    phantomMarks,
    onUnassign,
    onSlotClick,

    // 交互状态（用于槽位交互）
    pendingItem,
    selectedSlotItem,
    toolSelectionMode,
    isRecycleMode,
    selectionMode,
}) => {
    const { t } = useLanguage();
    const [hoveredReqIndex, setHoveredReqIndex] = useState(null);

    if (!order) {
        return (
            <div className="h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm">{t("暂无订单")}</span>
            </div>
        );
    }

    const { id, requirements, baseScoreReward, remainingRefreshes } = order;

    // Calculate visualization states
    const isSatisfied = !!canSatisfy;

    // === 动态奖励计算 ===
    const rewardInfo = useMemo(() => {
        if (!requirements || order.isEmergency) return null;

        // OCD 技能：所有需求来自同一池子时翻倍
        let isSameType = false;
        if (hasSkill && hasSkill('ocd') && requirements.length > 1) {
            const firstPool = requirements[0].poolId;
            isSameType = requirements.every(r => r.poolId === firstPool);
        }

        // 1. 最低品质奖励：按所有需求的最低品质 bonus 计算
        const minBonus = requirements.reduce((sum, req) => sum + req.requiredRarity.bonus, 0);
        let minMultiplier = 1 + minBonus;
        if (isSameType) minMultiplier *= 2;
        const minScoreReward = Math.ceil(baseScoreReward * minMultiplier);

        // 2. 槽位预期奖励：根据已放入物品和幻影物品的品质实时计算
        let hasAnySlot = false;
        const slotBonus = requirements.reduce((sum, req, rIdx) => {
            const key = `${index}-${rIdx}`;
            // 优先检查直接分配的物品
            const assignedUid = orderSlotAssignments?.[key];
            if (assignedUid) {
                const assignedItem = inventory.find(i => i && i.uid === assignedUid);
                if (assignedItem) {
                    hasAnySlot = true;
                    return sum + Math.max(req.requiredRarity.bonus, assignedItem.rarity.bonus);
                }
            }
            // 其次检查幻影物品
            const phantom = phantomMarks?.[key];
            if (phantom?.item) {
                hasAnySlot = true;
                return sum + Math.max(req.requiredRarity.bonus, phantom.item.rarity.bonus);
            }
            // 未放入物品：使用最低需求品质
            return sum + req.requiredRarity.bonus;
        }, 0);
        let slotMultiplier = 1 + slotBonus;
        if (isSameType) slotMultiplier *= 2;
        const slotScoreReward = Math.ceil(baseScoreReward * slotMultiplier);

        return {
            minScoreReward,
            slotScoreReward,
            hasAnySlot,
            isDifferent: hasAnySlot && slotScoreReward !== minScoreReward
        };
    }, [requirements, baseScoreReward, index, orderSlotAssignments, phantomMarks, inventory, hasSkill, order.isEmergency]);

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
            {/* 调试获取物品按钮 - 仅在 index !== -1 且 onDebugGetItems 存在时显示 */}
            {onDebugGetItems && index !== -1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDebugGetItems(index); }}
                    className="absolute -top-2 -left-2 z-50 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all"
                    title="调试：获取所需物品"
                >
                    <Zap size={14} fill="currentColor" />
                </button>
            )}
            {/* 被替换订单的额外高亮标记 */}
            {isBeingReplaced && (
                <>
                    {/* 顶部闪烁标签 */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg z-30 animate-bounce flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>{t("正在替换")}</span>
                    </div>
                    {/* 四角光效 */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                </>
            )}

            {/* Content Container */}
            <div className="flex justify-between items-center w-full gap-2">

                {/* Left Side: Info & Reqs */}
                <div className={`flex flex-col flex-1 ${isCandidate ? 'gap-1' : 'gap-1.5'}`}>

                    {/* Header / Reward Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Label & Status */}
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
                                        <span>✅ {t("已完成")}</span>
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
                                {/* Score Reward */}
                                <div className={`flex items-center gap-1 rounded-lg font-black text-[10px] shadow-sm ${isCandidate ? 'px-1.5 py-0.5' : 'px-2 py-1'} ${canSatisfy ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                    <span>{rewardInfo?.minScoreReward ?? baseScoreReward}</span>
                                    {rewardInfo?.isDifferent && !canSatisfy && (
                                        <>
                                            <span className="opacity-60">→</span>
                                            <span className="text-xs font-black">{rewardInfo.slotScoreReward}</span>
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

                    {/* Requirements */}
                    <div className={`flex ${isCandidate ? 'flex-wrap gap-1.5' : 'flex-nowrap gap-1.5'}`}>
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
                            const isMet = count >= 1;

                            // Visual State: Is selected?
                            const isSelected = selectedIndices.some(idx => {
                                const item = inventory[idx];
                                return item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus;
                            });
                            const isSubmitted = isSubmitMode && selectedItemNames && selectedItemNames.includes(req.name);

                            const allCandidates = inventory.filter(i => i && i.name === req.name);
                            allCandidates.sort((a, b) => (b.rarity.bonus || 0) - (a.rarity.bonus || 0));
                            const bestCandidate = allCandidates[0];

                            if (!matchedItem) {
                                matchedItem = bestCandidate;
                            }

                            const hasItem = !!matchedItem;
                            const isQualitySatisfied = matchedItem && matchedItem.rarity.bonus >= req.requiredRarity.bonus;

                            const isPoolHighlighted = hoveredPoolId && !req.isScoreItem && hoveredPoolItemNames && hoveredPoolItemNames.includes(req.name);
                            const isItemHighlighted = (hoveredItemName && req.name === hoveredItemName) || (matrixHoveredItems && matrixHoveredItems.has(req.name));

                            const borderStyle = hasItem ? 'border-solid' : 'border-dashed';
                            let bgColorClass = 'bg-slate-50';
                            if (isScoreOrder) bgColorClass = 'bg-white/60';

                            let iconFilterClass = 'grayscale opacity-50';
                            let textColorClass = 'text-slate-400';

                            if (hasItem && isQualitySatisfied) {
                                bgColorClass = matchedItem.rarity.color;
                                iconFilterClass = '';
                                textColorClass = 'text-slate-700';
                            } else if (hasItem && !isQualitySatisfied) {
                                bgColorClass = isScoreOrder ? 'bg-white' : 'bg-slate-50';
                                iconFilterClass = 'grayscale opacity-50';
                                textColorClass = 'text-slate-500';
                            }

                            const borderColorClass = hasItem ? matchedItem.rarity.color.split(' ')[0] : (isScoreOrder ? 'border-blue-300' : 'border-slate-300');

                            // 订单槽位：查找已分配的物品或幻影标记
                            const slotKey = `${index}-${rIdx}`;
                            const assignedUid = orderSlotAssignments?.[slotKey];
                            const assignedItem = assignedUid ? inventory.find(i => i && i.uid === assignedUid) : null;
                            const phantom = phantomMarks?.[slotKey];
                            const slotItem = assignedItem || (phantom ? phantom.item : null);
                            const isPhantom = !assignedItem && !!phantom;
                            const slotQualitySatisfied = slotItem && slotItem.rarity.bonus >= req.requiredRarity.bonus;

                            const isSlotMode = !!slotItem && !isCandidate;
                            const slotHasUpgradePair = !isPhantom && slotItem && !slotItem.sterile &&
                                slotItem.rarity.id !== 'mythic' &&
                                inventory.some(other =>
                                    other && other.uid !== slotItem.uid &&
                                    other.name === slotItem.name &&
                                    other.rarity.id === slotItem.rarity.id &&
                                    !other.sterile
                                );

                            // 合成高亮计算：检查 pendingItem 或 selectedSlotItem 是否可与当前槽位物品合成
                            const sourceItem = pendingItem || selectedSlotItem;
                            const canSynthesizeWithSlot = isSlotMode && !isPhantom && slotItem && sourceItem &&
                                !slotItem.sterile && !sourceItem.sterile &&
                                slotItem.name === sourceItem.name &&
                                slotItem.rarity.id === sourceItem.rarity.id &&
                                slotItem.rarity.id !== 'mythic' &&
                                currentStageConfig?.mechanics?.synthesis;

                            // 工具目标高亮：工具选择模式下可作用的槽位
                            const isToolTarget = isSlotMode && !isPhantom && slotItem && toolSelectionMode && !slotItem.isToolItem;

                            // 回收/以旧换新状态
                            const isRecycleTarget = isSlotMode && !isPhantom && slotItem && isRecycleMode;
                            const isTradeInTarget = isSlotMode && !isPhantom && slotItem && selectionMode?.type === 'trade_in' && !slotItem.isToolItem && !slotItem.isScoreItem;
                            const slotInvIndex = slotItem ? inventory.findIndex(i => i && i.uid === slotItem.uid) : -1;
                            const isSlotSelected = isRecycleMode && slotInvIndex !== -1 && selectedIndices?.includes(slotInvIndex);

                            // Overload/Replace 目标
                            const isOverloadTarget = isSlotMode && !isPhantom && slotItem && pendingItem?.isOverload && slotItem.name === pendingItem?.name;
                            const isReplaceTarget = isSlotMode && !isPhantom && slotItem && pendingItem && !pendingItem.isOverload && !canSynthesizeWithSlot;

                            const displayIcon = isSlotMode ? slotItem.icon : req.icon;
                            const displayName = isSlotMode ? t(slotItem.name) : t(req.name);

                            return (
                                <div key={rIdx} className="flex flex-col items-stretch gap-1 relative">
                                    <div
                                        onClick={(e) => {
                                            if (isSlotMode && !isPhantom) {
                                                e.stopPropagation();
                                                if (onSlotClick) {
                                                    onSlotClick(index, rIdx);
                                                } else if (onUnassign) {
                                                    onUnassign(index, rIdx);
                                                }
                                            }
                                        }}
                                        onMouseEnter={() => isSlotMode && !isPhantom && setHoveredReqIndex(rIdx)}
                                        onMouseLeave={() => setHoveredReqIndex(null)}
                                        className={`
                                            relative flex items-center shrink-0 overflow-visible
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            ${isSlotMode
                                                ? `w-16 h-16 rounded-xl flex-col justify-center border-2 ${isPhantom ? 'border-dashed ' + slotItem.rarity.color.split(' ')[0] + ' bg-transparent' : 'border-solid ' + slotItem.rarity.color.split(' ')[0] + ' ' + (slotQualitySatisfied ? slotItem.rarity.color : 'bg-slate-50')} ${!isPhantom ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}
                                                    ${canSynthesizeWithSlot ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''}
                                                    ${isToolTarget ? 'ring-2 ring-cyan-400 ring-offset-1 shadow-lg shadow-cyan-200/50' : ''}
                                                    ${isRecycleTarget || isTradeInTarget ? 'ring-2 ring-amber-400 ring-offset-1 shadow-amber-200/50' : ''}
                                                    ${isSlotSelected ? 'ring-2 ring-red-500 ring-offset-1 scale-110 shadow-lg' : ''}
                                                    ${isOverloadTarget ? 'ring-2 ring-red-400 ring-offset-1 shadow-lg shadow-red-200/50' : ''}
                                                    ${isReplaceTarget ? 'ring-2 ring-red-300 ring-offset-1 opacity-80' : ''}
                                                `
                                                : `h-[28px] ${isCandidate ? 'h-[24px]' : ''} rounded border-2 ${isCandidate ? 'px-1.5' : 'px-1.5'} ${borderStyle} ${borderColorClass} ${bgColorClass} ${isSubmitted ? 'ring-2 ring-blue-500 shadow-md transform scale-105' : ''}`
                                            }
                                            ${(isPoolHighlighted || isItemHighlighted) && !isSubmitMode ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200 border-slate-400' : ''}
                                        `}
                                        title={isSlotMode ? (isPhantom ? t("已在其他订单中使用") : (canSynthesizeWithSlot ? t("点击合成") : (isToolTarget ? t("点击使用工具") : t("点击取回")))) : ''}
                                    >
                                        {/* Invisible layout ghost to hold natural width in Capsule Mode */}
                                        <div className={`flex items-center gap-1 opacity-0 pointer-events-none transition-all ${isSlotMode ? 'hidden' : ''}`}>
                                            <div className="w-2 h-2 shrink-0" />
                                            <span className={`shrink-0 ${isCandidate ? 'text-[10px]' : 'text-xs'}`}>{req.icon}</span>
                                            <span className={`font-bold ${isCandidate ? 'text-[10px]' : 'text-xs'} max-w-[80px] truncate`}>{t(req.name)}</span>
                                        </div>

                                        {/* Shared Animated Dot */}
                                        <div className={`
                                            absolute rounded-full shadow-sm border
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20
                                            ${req.requiredRarity.dotColor}
                                            ${isSlotMode
                                                ? '-top-1 -left-1 w-3 h-3 border-white scale-100'
                                                : `left-[7px] top-[50%] -translate-y-1/2 w-2 h-2 border-white/50`
                                            }
                                        `} title={`${t("需要")}: ${t(req.requiredRarity.name)}`} />

                                        {/* Shared Animated Icon */}
                                        <div className={`
                                            absolute flex items-center justify-center pointer-events-none
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            ${isSlotMode
                                                ? `left-[50%] top-[4px] -translate-x-1/2 translate-y-0 text-[26px] scale-100 origin-top ${slotQualitySatisfied ? '' : 'grayscale opacity-50'}`
                                                : `left-[20px] top-[50%] translate-x-0 -translate-y-1/2 ${isCandidate ? 'text-[10px]' : 'text-xs'} scale-100 origin-center ${iconFilterClass}`
                                            }
                                        `}>
                                            {displayIcon}
                                        </div>

                                        {/* Shared Animated Text */}
                                        <span className={`
                                            absolute font-bold truncate pointer-events-none
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            ${isSlotMode
                                                ? `left-[50%] top-[42px] -translate-x-1/2 translate-y-0 text-[10px] w-full text-center px-1 ${slotQualitySatisfied ? 'text-slate-700' : 'text-slate-400'}`
                                                : `left-[38px] top-[50%] translate-x-0 -translate-y-1/2 ${isCandidate ? 'text-[10px]' : 'text-xs'} max-w-[80px] text-left ${textColorClass}`
                                            }
                                        `}>
                                            {displayName}
                                        </span>

                                        {/* Capsule-Specific Modifiers (fade out in slot mode) */}
                                        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isSlotMode ? 'opacity-0' : 'opacity-100'}`}>
                                            {isSubmitted && isQualitySatisfied && (
                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Slot-Specific Modifiers (fade in in slot mode) */}
                                        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isSlotMode ? 'opacity-100' : 'opacity-0'}`}>
                                            {isSlotMode && slotQualitySatisfied && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow z-10 pointer-events-auto">
                                                    <Check size={8} strokeWidth={4} />
                                                </div>
                                            )}
                                            {isSlotMode && slotHasUpgradePair && !canSynthesizeWithSlot && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 rounded-full p-0.5 shadow-md z-10 ring-1 ring-white animate-bounce pointer-events-auto">
                                                    <ChevronsUp size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                            {isSlotMode && canSynthesizeWithSlot && hoveredReqIndex === rIdx && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-400/80 rounded-lg transition-opacity z-10 backdrop-blur-[1px] animate-pulse">
                                                    <ChevronsUp size={36} className="text-white drop-shadow-md" />
                                                    <span className="text-white text-xs font-black uppercase tracking-wider">{t("升级")}</span>
                                                </div>
                                            )}
                                            {isSlotMode && hoveredReqIndex === rIdx && !canSynthesizeWithSlot && (isOverloadTarget || isReplaceTarget) && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/60 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                                    <Trash2 size={32} className="text-white drop-shadow-md" />
                                                    <span className="text-white text-[10px] font-black uppercase tracking-wider text-center px-1">{t("回收")}</span>
                                                    {['rare', 'epic', 'legendary', 'mythic'].includes(slotItem?.rarity?.id) && (
                                                        <span className="text-amber-200 text-xs font-bold whitespace-nowrap drop-shadow-md">
                                                            +{slotItem.rarity.recycleValue || 0} 🪙
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {isSlotMode && hoveredReqIndex === rIdx && isRecycleTarget && !isOverloadTarget && !isReplaceTarget && !canSynthesizeWithSlot && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/60 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                                    <Trash2 size={32} className="text-white drop-shadow-md" />
                                                    <span className="text-white text-[10px] font-black uppercase tracking-wider text-center px-1">{t("回收")}</span>
                                                    {['rare', 'epic', 'legendary', 'mythic'].includes(slotItem?.rarity?.id) && (
                                                        <span className="text-amber-200 text-xs font-bold whitespace-nowrap drop-shadow-md">
                                                            +{slotItem.rarity.recycleValue || 0} 🪙
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {isSlotMode && slotItem?.sterile && (
                                                <div className="absolute bottom-0 left-0 p-0.5 bg-gray-800/80 rounded-tr-lg text-white z-10 text-[7px] px-1 font-bold pointer-events-auto">
                                                    {t("绝育")}
                                                </div>
                                            )}
                                            {isSlotMode && slotItem?.decay !== undefined && (
                                                <div className={`absolute bottom-0 left-0 text-[7px] px-0.5 rounded-tr font-bold pointer-events-auto ${slotItem.decay <= 5 ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {slotItem.decay}
                                                </div>
                                            )}
                                            {isSlotMode && isPhantom && (
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-400 text-white rounded-full p-0.5 shadow z-20 pointer-events-auto">
                                                    <Link size={12} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Refresh Button (Centered) */}
                {!order.isEmergency && !isSubmitMode && !isEvacuationMode && !isCandidate && currentStageConfig.mechanics.refresh && (
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
