import React from 'react';
import { ArrowUp, ArrowDown, RotateCcw, RotateCw, Crosshair, Play } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ACTION_TYPES, ACTION_CARD_DEFS } from '../../data/matrixConfig';

const CARD_ICONS = {
    [ACTION_TYPES.MOVE_FORWARD]: ArrowUp,
    [ACTION_TYPES.MOVE_BACKWARD]: ArrowDown,
    [ACTION_TYPES.TURN_LEFT]: RotateCcw,
    [ACTION_TYPES.TURN_RIGHT]: RotateCw,
    [ACTION_TYPES.ADJUST]: Crosshair,
};

const CARD_COLORS = {
    [ACTION_TYPES.MOVE_FORWARD]: 'border-kitchen-gold-border bg-[#FFF8E0] hover:border-kitchen-gold hover:bg-[#FFF8F0]',
    [ACTION_TYPES.MOVE_BACKWARD]: 'border-cyan-300 bg-cyan-50 hover:border-cyan-400 hover:bg-cyan-100',
    [ACTION_TYPES.TURN_LEFT]: 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100',
    [ACTION_TYPES.TURN_RIGHT]: 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:bg-orange-100',
    [ACTION_TYPES.ADJUST]: 'border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100',
};

const ActionCards = ({ cards, actionsRemaining, onUseCard, onEndTurn, disabled }) => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2">
                {cards.map(card => {
                    const def = ACTION_CARD_DEFS[card.type];
                    if (!def) return null;
                    const Icon = CARD_ICONS[card.type] || Crosshair;
                    const isUsable = !card.used && actionsRemaining > 0 && !disabled;

                    return (
                        <button
                            key={card.id}
                            onClick={() => isUsable && onUseCard(card.id)}
                            disabled={!isUsable}
                            className={`
                                flex flex-col items-center justify-center gap-1.5
                                w-16 h-20 md:w-20 md:h-24
                                rounded-xl border-2 transition-all duration-150 select-none
                                ${card.used
                                    ? 'bg-[#FFF8F0] border-kitchen-gold-border-muted opacity-30 cursor-default'
                                    : isUsable
                                        ? `${CARD_COLORS[card.type]} cursor-pointer active:scale-95 shadow-sm`
                                        : 'bg-[#FFF8F0] border-kitchen-gold-border-muted opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <Icon size={20} className={card.used ? 'text-kitchen-text-muted' : 'text-kitchen-text-body'} />
                            <span className={`text-[10px] md:text-xs font-bold leading-tight ${card.used ? 'text-kitchen-text-muted' : 'text-kitchen-text-title'}`}>
                                {t(def.name)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-kitchen-text-body">
                    {t("剩余行动")}: {actionsRemaining}
                </span>
                <button
                    onClick={onEndTurn}
                    disabled={disabled}
                    className={`
                        flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 font-bold text-sm
                        transition-all duration-150 select-none
                        ${disabled
                            ? 'bg-[#FFF8F0] border-kitchen-gold-border-muted text-kitchen-text-secondary cursor-not-allowed'
                            : 'bg-green-500 border-green-600 text-white hover:bg-green-600 cursor-pointer active:scale-95 shadow-md'
                        }
                    `}
                >
                    <Play size={16} />
                    {t("结束回合")} <span className="text-white/60 text-xs ml-1">-1🪙</span>
                </button>
            </div>
        </div>
    );
};

export default ActionCards;
