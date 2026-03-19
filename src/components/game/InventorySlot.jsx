import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Trash2, ArrowLeftRight, Check, ChevronsUp, Ban, Star, CircleArrowUp, MousePointerClick, Umbrella, TriangleAlert } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// Tooltip 通过 Portal 渲染到 body，避免被父级 overflow/z-index 遮挡
const ToolItemTooltip = ({ item, anchorRef, visible }) => {
    const { t } = useLanguage();
    const [pos, setPos] = useState(null); // null = 未就绪，不渲染

    // useLayoutEffect 在 DOM 更新后、浏览器绘制前同步执行，避免闪烁
    useLayoutEffect(() => {
        if (!visible || !anchorRef.current) {
            setPos(null);
            return;
        }
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, [visible, anchorRef]);

    // pos 未就绪或不可见时不渲染，避免在 (0,0) 闪现
    if (!visible || !item || !pos) return null;

    return createPortal(
        <div
            style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                transform: 'translate(-50%, -100%)',
                zIndex: 99999,
                pointerEvents: 'none',
            }}
            className="animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-amber-400/30 min-w-[180px] max-w-[240px]">
                <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700 pb-1.5">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-black text-amber-300 text-sm">{t(item.name)}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t(item.toolDesc || '')}
                </p>
                <div className="mt-1.5 pt-1 border-t border-slate-700 text-[10px] text-amber-400/80 font-bold">
                    {t("右键点击使用")}
                </div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
            </div>
        </div>,
        document.body
    );
};


export const InventorySlot = ({
    item,
    index,
    isPendingSlot = false,
    isSelected,
    isTarget,
    isHovered,
    isReference,
    onClick,
    onContextMenu,
    onMouseEnter,
    onMouseLeave,

    // Context flags
    isSubmitMode,
    isRecycleMode,
    isSelectionMode,

    // Derived state for visuals
    isNeededForOrder,
    isMaxSatisfied,
    hasUpgradePair,

    // Specific mechanic flags
    canSynthesize,
    isSterile,
    isOverloadTarget,

    // Tool item state
    nextDrawEnhanced,

    // Order slot assignment
    isAssigned,

    // Delivery config
    durabilityPerTier = 0,

    // Style overrides
    className = ""
}) => {
    const { t } = useLanguage();
    const [showTooltip, setShowTooltip] = useState(false);
    const slotRef = useRef(null);

    const isMultiSelectMode = isSubmitMode || isRecycleMode;
    const isTradeInMode = isSelectionMode;
    const isToolItem = item?.isToolItem;
    const isDisabled = isAssigned || (isMultiSelectMode && !item) || (isReference && (!item || item.isScoreItem || item.isToolItem)) || isPendingSlot;

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (isToolItem && onContextMenu) {
            onContextMenu(index);
        }
    };

    // 工具物品独特样式：金色渐变边框 + 发光
    const toolItemStyle = isToolItem
        ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 ring-1 ring-amber-200/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
        : '';

    return (
        // 外层 div 不设 overflow-hidden，tooltip portal 不受此影响
        <div ref={slotRef} className="relative">
            <button
                onClick={() => !isDisabled && onClick(index)}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => {
                    onMouseEnter(index, item);
                    if (isToolItem) setShowTooltip(true);
                }}
                onMouseLeave={() => {
                    onMouseLeave();
                    setShowTooltip(false);
                }}
                aria-disabled={isDisabled}
                className={`
                    relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none overflow-visible
                    ${item
                        ? isToolItem
                            ? toolItemStyle
                            : `${item.rarity?.color || 'bg-slate-100 border-slate-300'} ${item.rarity?.shadow || ''} shadow-sm`
                        : 'bg-slate-50 border-dashed border-slate-200'
                    }
                    ${!isMultiSelectMode && !isTradeInMode && isSelected ? '-translate-y-4 scale-110 z-10 shadow-xl ring-2 ring-blue-400' : ''}
                    ${!isMultiSelectMode && !isTradeInMode && isTarget && isPendingSlot ? 'animate-pulse ring-2 ring-red-400 cursor-pointer hover:bg-red-50' : ''}
                    ${!isMultiSelectMode && !isTradeInMode && isTarget && !isPendingSlot ? 'hover:border-blue-300 cursor-pointer' : ''}
                    ${!isMultiSelectMode && canSynthesize && isTarget ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''}
                    ${!isMultiSelectMode && !canSynthesize && isTarget ? 'hover:scale-105' : ''}
                    ${isMultiSelectMode && item && !isPendingSlot ? 'cursor-pointer hover:scale-105' : ''}
                    ${isSelected && isSubmitMode ? 'border-blue-600 bg-blue-50 border-2 z-10' : ''}
                    ${isSelected && isRecycleMode ? 'border-amber-600 bg-amber-50 border-2 z-10' : ''}
                    ${isMultiSelectMode && !isSelected && item && !isPendingSlot ? 'opacity-70 hover:opacity-100 grayscale-[0.3]' : ''}
                    ${isAssigned ? '!opacity-30 !grayscale cursor-not-allowed !scale-95 pointer-events-none' : ''}
                    ${className}
                `}
            >
                {isPendingSlot && !item && (
                    <div className="text-slate-300 font-bold text-xs uppercase tracking-widest">{t("排队中")}</div>
                )}

                {item && (
                    <>
                        <div className={`flex flex-col items-center justify-center w-full h-full ${(item.sterile && !isToolItem) || (item.decay !== undefined && item.decay <= 0) ? 'grayscale opacity-70' : ''}`}>
                            <span className={`text-2xl lg:text-3xl filter drop-shadow-sm transition-transform duration-300 ${isToolItem ? 'animate-pulse' : ''}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[10px] font-bold leading-none truncate max-w-full px-1 ${isToolItem ? 'text-amber-700' : ''}`}>
                                {t(item.name)}
                            </span>
                            {item.rarity?.bonus > 0 && !isToolItem && (
                                <div className="absolute top-0 right-0 p-0.5 bg-white/50 rounded-bl-lg">
                                    <Star size={8} fill="currentColor" className={item.rarity?.color ? item.rarity.color.split(' ')[2] : 'text-slate-400'} />
                                </div>
                            )}
                        </div>

                        {/* 工具物品标识 */}
                        {isToolItem && (
                            <div className="absolute top-0 left-0 p-0.5 rounded-br-lg z-10">
                                <div className="bg-amber-500 text-white rounded-md px-1 py-0.5 text-[8px] font-black uppercase tracking-wider shadow-sm">
                                    {t("工具")}
                                </div>
                            </div>
                        )}

                        {/* 右键提示（hover 时显示在 slot 底部） */}
                        {isToolItem && isHovered && !isMultiSelectMode && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                <div className="bg-amber-600 text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap shadow-lg flex items-center gap-0.5">
                                    <MousePointerClick size={8} />
                                    {t("右键使用")}
                                </div>
                            </div>
                        )}

                        {/* Status Icons */}
                        {item.sterile && !isToolItem && (
                            <div className="absolute bottom-0 left-0 p-0.5 bg-gray-800/80 rounded-tr-lg text-white z-10 text-[9px] px-1 font-bold">
                                {t("绝育")}
                            </div>
                        )}

                        {/* Upgrade Badge */}
                        {hasUpgradePair && !isPendingSlot && !item.sterile && (
                            <div className="absolute -top-1.5 -right-1.5 z-20 animate-bounce">
                                <div className="bg-yellow-400 text-yellow-900 rounded-full p-0.5 shadow-md ring-1 ring-white">
                                    <ChevronsUp size={12} strokeWidth={3} />
                                </div>
                            </div>
                        )}

                        {/* Entropy Decay Indicator */}
                        {item.decay !== undefined && (
                            <>
                                <div className={`absolute top-0 left-0 p-0.5 rounded-br-lg text-[9px] font-mono font-bold z-10 px-1 leading-none
                                    ${item.decay <= 0 ? 'bg-red-600 text-white' : 'bg-slate-700/80 text-white'}
                                `}>
                                    {item.decay <= 0 ? t("损坏") : item.decay}
                                </div>
                                {item.decay <= 0 && (
                                    <div className="absolute inset-0 bg-slate-500/30 rounded-xl z-20 flex items-center justify-center pointer-events-none">
                                        <Ban size={24} className="text-red-800 opacity-60" />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Delivery Attributes — bottom bar with icons (shows actual quality-adjusted durability) */}
                        {item.durability !== undefined && !isToolItem && (
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-slate-800/50 text-white rounded-b-[10px] py-[2px]">
                                <span className="flex items-center gap-0.5">
                                    <Umbrella size={10} className="text-blue-300" />
                                    <span className="text-[10px] font-mono font-bold">
                                        {item.durability + RARITY_ORDER.indexOf(item.rarity?.id || 'common') * durabilityPerTier}
                                    </span>
                                </span>
                                {((item.deliveryTag === 'angular' ? item.sharpness + 3 : item.sharpness) > 0) && (
                                    <span className="flex items-center gap-0.5">
                                        <TriangleAlert size={10} className={item.deliveryTag === 'angular' ? 'text-red-300' : 'text-amber-300'} />
                                        <span className="text-[10px] font-mono font-bold">{item.deliveryTag === 'angular' ? item.sharpness + 3 : item.sharpness}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        {/* Delivery Tag indicator */}
                        {item.deliveryTag && !isToolItem && (
                            <div className="absolute top-0 left-0 bg-indigo-600/80 text-white text-[8px] font-bold px-1 rounded-br-md rounded-tl-[10px] leading-tight py-[1px]">
                                {item.deliveryTag === 'angular' ? '棱角' : item.deliveryTag === 'protective' ? '保护' : item.deliveryTag === 'explosive' ? '易爆' : item.deliveryTag === 'set_bonus' ? '套装' : item.deliveryTag === 'unidirectional' ? '单向' : ''}
                            </div>
                        )}

                        {/* Select/Trash Overlay Icon */}
                        {isSelected && (isSubmitMode || isRecycleMode) && (
                            <div className={`absolute -top-2 -right-2 text-white rounded-full p-1 shadow-md z-20 animate-in zoom-in ${isRecycleMode ? 'bg-amber-600' : 'bg-blue-600'}`}>
                                {isRecycleMode ? <Trash2 size={16} /> : <Check size={16} strokeWidth={4} />}
                            </div>
                        )}

                        {/* Order Hint Checkmark */}
                        {item && isNeededForOrder && (
                            <div className={`
                                absolute -bottom-1 -right-1 text-white rounded-full p-0.5 shadow-md border-2 border-white z-10
                                ${isMaxSatisfied ? 'bg-green-500' : 'bg-slate-300'}
                            `}>
                                <Check size={12} strokeWidth={4} />
                            </div>
                        )}

                        {/* Action Overlays */}

                        {/* Priority 1: Synthesize */}
                        {(!isSelectionMode && isHovered && isTarget && canSynthesize) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-400/80 rounded-lg transition-opacity z-10 backdrop-blur-[1px] animate-pulse">
                                <ChevronsUp size={36} className="text-white drop-shadow-md" />
                                <span className="text-white text-xs font-black uppercase tracking-wider">{t("升级")}</span>
                            </div>
                        )}

                        {/* Priority 2: Overload */}
                        {(!isSelectionMode && isOverloadTarget && !(isHovered && canSynthesize)) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/60 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                <Trash2 size={32} className="text-white drop-shadow-md" />
                                <span className="text-white text-[10px] font-black uppercase tracking-wider text-center px-1">{t("回收")}</span>
                                {['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity?.id) && (
                                    <span className="text-amber-200 text-xs font-bold whitespace-nowrap drop-shadow-md">
                                        +{item.rarity.recycleValue || 0} 🪙
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Priority 3: Swap */}
                        {(!isMultiSelectMode && !isSelectionMode && isHovered && isTarget && !canSynthesize && !isOverloadTarget) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/40 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                <ArrowLeftRight size={32} className="text-white drop-shadow-md" />
                            </div>
                        )}
                    </>
                )}
            </button>

            {/* Tooltip via Portal — 不受任何父级 z-index/overflow 限制 */}
            <ToolItemTooltip
                item={item}
                anchorRef={slotRef}
                visible={isToolItem && showTooltip && !isMultiSelectMode}
            />
        </div>
    );
};
