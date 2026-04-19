import React from 'react';
import { Heart, Clock, Languages, RotateCcw } from 'lucide-react';
import { PRIMARY_BTN, SECONDARY_BTN, DANGER_BTN } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TopBar({
    dayNumber,
    hoursRemaining,
    hoursPerDay,
    satisfaction,
    maxSatisfaction,
    canEndDay,
    onEndDay,
    onReset,
}) {
    const { t, toggleLanguage } = useLanguage();
    const hoursPct = (hoursRemaining / hoursPerDay) * 100;
    const satPct = (satisfaction / maxSatisfaction) * 100;

    return (
        <header className="flex items-center justify-between gap-4 px-6 py-3 bg-kitchen-wood-light border-b-2 border-kitchen-wood-border shadow-sm">
            <div className="flex items-center gap-3">
                <h1 className="font-black text-xl text-kitchen-text-title">
                    {t('幸运之墙')} <span className="text-kitchen-text-secondary font-bold text-sm">Day {dayNumber}</span>
                </h1>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-center max-w-3xl">
                {/* Hours */}
                <div className="flex items-center gap-2 min-w-[180px]">
                    <Clock size={18} className="text-kitchen-text-body" />
                    <div className="flex-1">
                        <div className="flex items-baseline gap-1 text-xs text-kitchen-text-secondary">
                            <span>{t('剩余时间')}</span>
                            <span className="font-bold text-kitchen-text-title">{hoursRemaining} / {hoursPerDay} {t('小时')}</span>
                        </div>
                        <div className="h-2 bg-kitchen-wood-dark rounded-full overflow-hidden mt-1">
                            <div
                                className={`h-full transition-all duration-300 ${hoursRemaining <= 3 ? 'bg-kitchen-danger' : 'bg-kitchen-gold'}`}
                                style={{ width: `${hoursPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Satisfaction */}
                <div className="flex items-center gap-2 min-w-[180px]">
                    <Heart size={18} className={satisfaction <= 3 ? 'text-kitchen-danger' : 'text-kitchen-success-border'} />
                    <div className="flex-1">
                        <div className="flex items-baseline gap-1 text-xs text-kitchen-text-secondary">
                            <span>{t('满意度')}</span>
                            <span className="font-bold text-kitchen-text-title">{satisfaction} / {maxSatisfaction}</span>
                        </div>
                        <div className="h-2 bg-kitchen-wood-dark rounded-full overflow-hidden mt-1">
                            <div
                                className={`h-full transition-all duration-300 ${satisfaction <= 3 ? 'bg-kitchen-danger' : 'bg-kitchen-success-border'}`}
                                style={{ width: `${satPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={toggleLanguage} className={SECONDARY_BTN + ' !px-3 !py-1.5 text-xs'} title="Language">
                    <Languages size={14} />
                </button>
                <button onClick={onReset} className={SECONDARY_BTN + ' !px-3 !py-1.5 text-xs'} title={t('重置')}>
                    <RotateCcw size={14} />
                </button>
                <button
                    onClick={onEndDay}
                    disabled={!canEndDay}
                    className={hoursRemaining === 0 ? PRIMARY_BTN : DANGER_BTN}
                >
                    {t('今日结束')}
                </button>
            </div>
        </header>
    );
}
