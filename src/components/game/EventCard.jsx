import React from 'react';
import { Check, X, Clock, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { EVENT_ITEMS } from '../../data/constants';

const EventCardBase = ({
    event,
    currentDay,
    inventory,
    isSubmitMode,
    isTargeted, // This event is the current submit target
    canComplete, // Boolean: can the player complete this event right now
    onClick,
    onDebugGetItems,
    selectedIndices,
}) => {
    const { t } = useLanguage();

    if (!event) return null;

    const { id, name, description, requirements, deadline, status } = event;
    const isCompleted = status === 'success';
    const isFailed = status === 'fail';
    const isActive = status === 'active';

    // Deadline display
    const deadlineText = deadline === currentDay
        ? t("今天截止")
        : deadline === currentDay + 1
            ? t("明天截止")
            : `${t("第")} ${deadline} ${t("天截止")}`;

    // Check which requirements the player has items for
    const reqStatus = requirements.map(reqItemId => {
        const eventItem = EVENT_ITEMS.find(ei => ei.itemId === reqItemId);
        if (!eventItem) return { itemId: reqItemId, name: '???', icon: '?', hasItem: false };
        const hasItem = inventory.some(item => item && item.name === eventItem.name);

        // Check if this item is selected in submit mode
        const isSelected = isSubmitMode && isTargeted && selectedIndices.some(idx => {
            const invItem = inventory[idx];
            return invItem && invItem.name === eventItem.name;
        });

        return {
            itemId: reqItemId,
            name: eventItem.name,
            icon: eventItem.icon,
            hasItem,
            isSelected,
        };
    });

    return (
        <div
            onClick={() => isActive && onClick(id)}
            className={`
                relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 p-3
                ${isCompleted
                    ? 'border-green-300 bg-green-50/50 opacity-75'
                    : isFailed
                        ? 'border-red-300 bg-red-50/50 opacity-60'
                        : isTargeted
                            ? 'border-blue-400 bg-blue-50 ring-4 ring-blue-200 shadow-lg'
                            : canComplete
                                ? 'border-green-400 bg-green-50 hover:shadow-md cursor-pointer'
                                : isActive
                                    ? 'border-slate-200 hover:border-slate-300 cursor-pointer'
                                    : 'border-slate-100'
                }
            `}
        >
            {/* Debug button */}
            {onDebugGetItems && isActive && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDebugGetItems(id); }}
                    className="absolute -top-2 -left-2 z-50 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all"
                    title="Debug: get required items"
                >
                    <Zap size={14} fill="currentColor" />
                </button>
            )}

            <div className="flex flex-col gap-2">
                {/* Header: Name + Status */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`text-sm font-black leading-tight truncate ${isCompleted ? 'text-green-700' : isFailed ? 'text-red-600' : 'text-slate-800'}`}>
                            {t(name)}
                        </h3>
                        {isCompleted && (
                            <span className="shrink-0 flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                                <Check size={10} /> {t("已完成")}
                            </span>
                        )}
                        {isFailed && (
                            <span className="shrink-0 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                                <X size={10} /> {t("已失败")}
                            </span>
                        )}
                    </div>

                    {/* Deadline badge */}
                    {isActive && (
                        <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            deadline === currentDay
                                ? 'bg-red-100 text-red-600 border border-red-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                            <Clock size={10} />
                            {deadlineText}
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed ${isCompleted || isFailed ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(description)}
                </p>

                {/* Requirements */}
                {requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {reqStatus.map((req, idx) => (
                            <div
                                key={idx}
                                className={`
                                    flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all
                                    ${isCompleted
                                        ? 'bg-green-100 border-green-300 text-green-700'
                                        : isFailed
                                            ? 'bg-red-50 border-red-200 text-red-400 line-through'
                                            : req.isSelected
                                                ? 'bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-300 scale-105'
                                                : req.hasItem
                                                    ? 'bg-green-50 border-green-300 text-green-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }
                                `}
                            >
                                <span>{req.icon}</span>
                                <span>{t(req.name)}</span>
                                {(isCompleted || (req.hasItem && isActive)) && (
                                    <Check size={12} className={isCompleted ? 'text-green-500' : 'text-green-400'} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Auto-complete badge (E12) */}
                {event.autoComplete && isCompleted && requirements.length === 0 && (
                    <div className="text-xs text-green-600 font-bold italic">
                        {t("自动完成")}
                    </div>
                )}
            </div>

            {/* Can complete indicator */}
            {isActive && canComplete && !isTargeted && (
                <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-sm animate-bounce flex items-center gap-1">
                    <Check size={10} /> {t("可提交")}
                </div>
            )}
        </div>
    );
};

export const EventCard = React.memo(EventCardBase);
