import React, { useMemo } from 'react';
import { RefreshCw, Check, Ticket, Coins, Clock, Zap, Crown, Trophy, TrendingUp, Star, AlertCircle, Link, ChevronsUp } from 'lucide-react';
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
    emergencyOrderCompleted, // 限时订单已完成标记
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
    selectedItemNames,
    upgradedOrderItems, // 新增：升级记录

    // 订单槽位系统
    orderSlotAssignments,
    phantomMarks,
    onUnassign,
}) => {
    const { t } = useLanguage();

    // 阶段颜色配置 (对应耐心条刻度效果)
    const stageColors = {
        2: { border: 'border-yellow-400', bg: 'bg-yellow-500', label: 'LV1' },
        3: { border: 'border-orange-400', bg: 'bg-orange-500', label: 'LV2' },
        4: { border: 'border-red-400', bg: 'bg-red-500', label: 'LV3' },
        5: { border: 'border-rose-600', bg: 'bg-rose-600', label: 'LV4' }
    };

    // 检测升级的物品（使用 Map 以包含 upgradeStage）
    const upgradedItemsMap = useMemo(() => {
        if (!order || !upgradedOrderItems) return {};
        const map = {};
        upgradedOrderItems
            .filter(u => {
                // 查找该订单槽位的升级
                return u.orderSlotIndex === index;
            })
            .forEach(u => {
                map[u.itemIndex] = u; // { upgradeStage, itemIndex, orderSlotIndex }
            });
        return map;
    }, [order, upgradedOrderItems, index]);

    if (!order) {
        return (
            <div className="h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm">{t("暂无订单")}</span>
            </div>
        );
    }

    const { id, requirements, basePatienceReward, baseScoreReward, remainingRefreshes } = order;

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
                                    <Trophy size={10} fill="currentColor" /> {t("积分订单")}
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
                                {(config.patience?.enabled !== false) && (
                                    <div className="flex items-center gap-1 opacity-80 scale-90 origin-left">
                                        <span className="bg-pink-100 text-pink-700 px-1.5 rounded font-bold text-[10px]">{order.basePatienceReward}💗</span>
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
                                    <span className="opacity-70">🏆</span>
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
                            const isItemHighlighted = hoveredItemName && req.name === hoveredItemName;

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

                            // 检测是否被升级
                            const upgradeInfo = upgradedItemsMap[rIdx];
                            const isUpgraded = !!upgradeInfo;

                            // 订单槽位：查找已分配的物品或幻影标记
                            const slotKey = `${index}-${rIdx}`;
                            const assignedUid = orderSlotAssignments?.[slotKey];
                            const assignedItem = assignedUid ? inventory.find(i => i && i.uid === assignedUid) : null;
                            const phantom = phantomMarks?.[slotKey];
                            const slotItem = assignedItem || (phantom ? phantom.item : null);
                            const isPhantom = !assignedItem && !!phantom;
                            const slotQualitySatisfied = slotItem && slotItem.rarity.bonus >= req.requiredRarity.bonus;

                            return (
                                <div key={rIdx} className="flex flex-col items-center gap-1">
                                    {/* 原有药丸 */}
                                    <div className={`
                                    relative flex items-center gap-1 border-2 rounded transition-all duration-200 shrink-0
                                    ${isCandidate ? 'text-xs px-1.5 py-0.5' : 'text-xs px-1.5 py-1'}
                                    ${borderStyle} ${borderColorClass} ${bgColorClass} ${textColorClass}
                                    ${isSubmitted ? 'ring-2 ring-blue-500 shadow-md transform scale-105' : ''}
                                    ${(isPoolHighlighted || isItemHighlighted) && !isSubmitMode ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200 border-slate-400' : ''}
                                `}>
                                        <div className={`w-2 h-2 rounded-full ${req.requiredRarity.dotColor} shadow-sm border border-white/50 shrink-0`} title={`${t("需要")}: ${t(req.requiredRarity.name)}`}></div>
                                        <span className={`shrink-0 ${iconFilterClass}`}>{req.icon}</span>
                                        <span className={`font-bold ${iconFilterClass} max-w-[80px] truncate`} title={t(req.name)}>{t(req.name)}</span>

                                        {/* 已提交标记 */}
                                        {isSubmitted && isQualitySatisfied && (
                                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        )}

                                        {/* 升级标记 */}
                                        {isUpgraded && (
                                            <>
                                                <div className={`
                                                    absolute -top-1 -right-1 translate-x-1/2 -translate-y-1/2 text-white rounded px-1.5 py-0.5 shadow-xl z-50 flex items-center gap-0.5
                                                    ${stageColors[upgradeInfo.upgradeStage]?.bg || 'bg-red-500'} ring-2 ring-white
                                                `}>
                                                    <TrendingUp size={10} strokeWidth={3} />
                                                    <span className="text-[9px] font-black italic tracking-tighter">
                                                        {stageColors[upgradeInfo.upgradeStage]?.label || `L${upgradeInfo.upgradeStage}`}
                                                    </span>
                                                </div>
                                                <div className={`
                                                    absolute inset-0 rounded border-2 pointer-events-none z-10
                                                    ${stageColors[upgradeInfo.upgradeStage]?.border || 'border-red-400'} opacity-30
                                                `} />
                                            </>
                                        )}
                                    </div>

                                    {/* 订单槽位：放置物品 / 幻影标记 */}
                                    {slotItem && !isCandidate && (() => {
                                        // 可升级检测：背包中有同名同品质非绝育物品
                                        const slotHasUpgradePair = !isPhantom && slotItem && !slotItem.sterile &&
                                            slotItem.rarity.id !== 'mythic' &&
                                            inventory.some(other =>
                                                other && other.uid !== slotItem.uid &&
                                                other.name === slotItem.name &&
                                                other.rarity.id === slotItem.rarity.id &&
                                                !other.sterile
                                            );

                                        return (
                                            <div className="relative flex flex-col items-center">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isPhantom && onUnassign) {
                                                            onUnassign(index, rIdx);
                                                        }
                                                    }}
                                                    className={`
                                                        relative w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center
                                                        transition-all duration-200 text-[10px]
                                                        ${isPhantom
                                                            ? `border-dashed ${slotItem.rarity.color.split(' ')[0]} bg-transparent cursor-default`
                                                            : slotQualitySatisfied
                                                                ? `border-solid ${slotItem.rarity.color.split(' ')[0]} ${slotItem.rarity.color} cursor-pointer hover:scale-105 hover:shadow-md`
                                                                : `border-solid ${slotItem.rarity.color.split(' ')[0]} bg-slate-50 cursor-pointer hover:scale-105 hover:shadow-md`
                                                        }
                                                        ${(isPoolHighlighted || isItemHighlighted) && !isSubmitMode ? 'scale-110 z-30 shadow-xl ring-2 ring-slate-200 border-slate-400' : ''}
                                                    `}
                                                    title={isPhantom ? t("已在其他订单中使用") : t("点击取回")}
                                                >
                                                    {/* 左上角：要求品质圆形色块 */}
                                                    <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${req.requiredRarity.dotColor} border border-white shadow-sm z-10`} />

                                                    {/* 图标 */}
                                                    <span className={`text-xl leading-none ${slotQualitySatisfied ? '' : 'grayscale opacity-50'}`}>
                                                        {slotItem.icon}
                                                    </span>

                                                    {/* 物品名称 */}
                                                    <span className={`font-bold truncate max-w-[56px] mt-0.5 ${slotQualitySatisfied ? 'text-slate-700' : 'text-slate-400'}`}>
                                                        {t(slotItem.name)}
                                                    </span>

                                                    {/* 右下角：达标✓ */}
                                                    {slotQualitySatisfied && (
                                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow z-10">
                                                            <Check size={8} strokeWidth={4} />
                                                        </div>
                                                    )}

                                                    {/* 可升级角标 */}
                                                    {slotHasUpgradePair && (
                                                        <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-yellow-900 rounded-full p-0.5 shadow-md z-10 ring-1 ring-white animate-bounce">
                                                            <ChevronsUp size={10} strokeWidth={3} />
                                                        </div>
                                                    )}

                                                    {/* 绝育标签 */}
                                                    {slotItem.sterile && (
                                                        <div className="absolute bottom-0 left-0 p-0.5 bg-gray-800/80 rounded-tr-lg text-white z-10 text-[7px] px-1 font-bold">
                                                            {t("绝育")}
                                                        </div>
                                                    )}

                                                    {/* 腐朽计数 */}
                                                    {slotItem.decay !== undefined && (
                                                        <div className={`absolute bottom-0 left-0 text-[7px] px-0.5 rounded-tr font-bold ${slotItem.decay <= 5 ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                            {slotItem.decay}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 幻影链接图标：底部居中，圆心与下边框齐平 */}
                                                {isPhantom && (
                                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-400 text-white rounded-full p-0.5 shadow z-20">
                                                        <Link size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>

                    {/* Star Level Requirement */}
                    <div className="flex items-center gap-1.5 mt-1">
                        {order.minTotalStarLevel > 0 && (
                            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${isSatisfied
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}>
                                <span className="text-amber-500">★</span>
                                <span>≥ {order.minTotalStarLevel}</span>
                                {isSatisfied && <Check size={10} className="text-green-600 ml-0.5" />}
                            </div>
                        )}
                        {order.starDifficultyLevel > 0 && (
                            <div className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border ${isSatisfied
                                ? 'bg-green-500 text-white border-green-600'
                                : 'bg-slate-700 text-slate-100 border-slate-800'
                                }`}>
                                Lv.{order.starDifficultyLevel}
                            </div>
                        )}
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
