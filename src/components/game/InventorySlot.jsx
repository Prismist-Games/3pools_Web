import { useState, useRef } from 'react';
import { Sparkles, Trash2, ArrowLeftRight, Check, ChevronsUp, Ban, Star, CircleArrowUp, Merge } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';


export const InventorySlot = ({
    item,
    index,
    isPendingSlot = false,
    isSelected,
    isTarget,
    isHovered,
    isReference,
    onClick,
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
    isFuseTarget,

    // Skill state
    nextDrawEnhanced,

    // Order slot assignment
    isAssigned,

    // Style overrides
    className = ""
}) => {
    const { t } = useLanguage();
    const slotRef = useRef(null);

    const isMultiSelectMode = isSubmitMode || isRecycleMode;
    const isTradeInMode = isSelectionMode;
    const isDisabled = isAssigned || (isMultiSelectMode && !item) || (isReference && (!item || item.isScoreItem)) || isPendingSlot;

    // Check if item is a composite (fused) item
    const isComposite = item && item.names && item.names.length > 1;

    return (
        <div ref={slotRef} className="relative">
            <button
                onClick={() => !isDisabled && onClick(index)}
                onMouseEnter={() => {
                    onMouseEnter(index, item);
                }}
                onMouseLeave={() => {
                    onMouseLeave();
                }}
                aria-disabled={isDisabled}
                className={`
                    relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none overflow-visible
                    ${item
                        ? `${item.rarity?.color || 'bg-slate-100 border-slate-300'} ${item.rarity?.shadow || ''} shadow-sm`
                        : 'bg-slate-50 border-dashed border-slate-200'
                    }
                    ${!isMultiSelectMode && !isTradeInMode && isSelected ? '-translate-y-4 scale-110 z-10 shadow-xl ring-2 ring-blue-400' : ''}
                    ${!isMultiSelectMode && !isTradeInMode && isTarget && isPendingSlot ? 'animate-pulse ring-2 ring-red-400 cursor-pointer hover:bg-red-50' : ''}
                    ${!isMultiSelectMode && !isTradeInMode && isTarget && !isPendingSlot ? 'hover:border-blue-300 cursor-pointer' : ''}
                    ${!isMultiSelectMode && canSynthesize && isTarget ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''}
                    ${!isMultiSelectMode && isFuseTarget ? 'ring-4 ring-purple-400 scale-105 z-20' : ''}
                    ${!isMultiSelectMode && !canSynthesize && !isFuseTarget && isTarget ? 'hover:scale-105' : ''}
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
                        <div className={`flex flex-col items-center justify-center w-full h-full ${item.sterile || (item.decay !== undefined && item.decay <= 0) ? 'grayscale opacity-70' : ''}`}>
                            {isComposite ? (
                                <>
                                    {/* Composite item: show multiple small icons */}
                                    <div className="flex items-center gap-0.5 flex-wrap justify-center">
                                        {(item.icons || [item.icon]).map((icon, i) => (
                                            <span key={i} className="text-sm lg:text-base filter drop-shadow-sm">
                                                {icon}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[8px] font-bold leading-none truncate max-w-full px-0.5 text-center">
                                        {item.names.map(n => t(n)).join('×')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    {/* Single item: standard display */}
                                    <span className="text-2xl lg:text-3xl filter drop-shadow-sm transition-transform duration-300">
                                        {item.icon}
                                    </span>
                                    <span className="text-[10px] font-bold leading-none truncate max-w-full px-1">
                                        {t(item.name)}
                                    </span>
                                </>
                            )}
                            {item.rarity?.bonus > 0 && (
                                <div className="absolute top-0 right-0 p-0.5 bg-white/50 rounded-bl-lg">
                                    <Star size={8} fill="currentColor" className={item.rarity?.color ? item.rarity.color.split(' ')[2] : 'text-slate-400'} />
                                </div>
                            )}
                        </div>

                        {/* Status Icons */}
                        {item.sterile && (
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

                        {/* Priority 1: Synthesize (merge) */}
                        {(!isSelectionMode && isHovered && isTarget && canSynthesize) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-400/80 rounded-lg transition-opacity z-10 backdrop-blur-[1px] animate-pulse">
                                <ChevronsUp size={36} className="text-white drop-shadow-md" />
                                <span className="text-white text-xs font-black uppercase tracking-wider">{t("升级")}</span>
                            </div>
                        )}

                        {/* Priority 1b: Fuse */}
                        {(!isSelectionMode && isHovered && isTarget && isFuseTarget && !canSynthesize) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-500/80 rounded-lg transition-opacity z-10 backdrop-blur-[1px] animate-pulse">
                                <Merge size={28} className="text-white drop-shadow-md" />
                                <span className="text-white text-[10px] font-black uppercase tracking-wider">{t("融合")}</span>
                            </div>
                        )}

                        {/* Priority 2: Overload */}
                        {(!isSelectionMode && isOverloadTarget && !(isHovered && canSynthesize) && !(isHovered && isFuseTarget)) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/60 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                <Trash2 size={32} className="text-white drop-shadow-md" />
                                <span className="text-white text-[10px] font-black uppercase tracking-wider text-center px-1">{t("回收")}</span>
                                {['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity?.id) && (
                                    <span className="text-amber-200 text-xs font-bold whitespace-nowrap drop-shadow-md">
                                        +{item.rarity.recycleValue || 0}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Priority 3: Swap */}
                        {(!isMultiSelectMode && !isSelectionMode && isHovered && isTarget && !canSynthesize && !isFuseTarget && !isOverloadTarget) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/40 rounded-lg transition-opacity z-10 backdrop-blur-[1px]">
                                <ArrowLeftRight size={32} className="text-white drop-shadow-md" />
                            </div>
                        )}
                    </>
                )}
            </button>
        </div>
    );
};
