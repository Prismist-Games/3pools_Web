import React from 'react';
import { PRIMARY_BTN, SECONDARY_BTN } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export function StartScreen({ onStart }) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-6xl">🍳</div>
            <h2 className="text-3xl font-black text-kitchen-text-title">{t('幸运之墙')}</h2>
            <p className="text-sm text-kitchen-text-secondary">{t('Day 1 · 厨师的一天')}</p>
            <button onClick={onStart} className={PRIMARY_BTN + ' mt-4 text-base'}>
                {t('开始')}
            </button>
        </div>
    );
}

export function DayEndScreen({ satisfaction, maxSatisfaction, dishes, resolved, onReset }) {
    const { t } = useLanguage();
    const totalDelta = dishes.reduce((s, d) => s + (resolved[d.id]?.delta || 0), 0);
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <h2 className="text-2xl font-black text-kitchen-text-title">{t('今日结束')}</h2>
            <div className="text-center">
                <div className="text-sm text-kitchen-text-secondary">{t('满意度')}</div>
                <div className="text-5xl font-black text-kitchen-text-title">{satisfaction} / {maxSatisfaction}</div>
                <div className={`text-sm font-bold mt-1 ${totalDelta > 0 ? 'text-kitchen-success-border' : totalDelta < 0 ? 'text-kitchen-danger-text' : 'text-kitchen-text-body'}`}>
                    {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                </div>
            </div>

            <div className="w-full max-w-lg flex flex-col gap-2 mt-4">
                {dishes.map(d => {
                    const r = resolved[d.id];
                    if (!r) return null;
                    const color = r.delta > 0 ? 'text-kitchen-success-border' : r.delta < 0 ? 'text-kitchen-danger-text' : 'text-kitchen-text-body';
                    return (
                        <div key={d.id} className="flex items-center justify-between px-4 py-2 bg-kitchen-card border border-kitchen-wood-border rounded-lg">
                            <span className="font-bold text-kitchen-text-title">{t(d.label)}</span>
                            <span className={`font-bold ${color}`}>
                                {t(r.rating)} ({r.delta > 0 ? `+${r.delta}` : r.delta})
                            </span>
                        </div>
                    );
                })}
            </div>

            <button onClick={onReset} className={SECONDARY_BTN + ' mt-6'}>
                {t('再玩一次')}
            </button>
        </div>
    );
}

export function GameOverScreen({ dishes, resolved, onReset }) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-5xl">💔</div>
            <h2 className="text-2xl font-black text-kitchen-danger-text">{t('满意度归零 —— 餐厅关门了')}</h2>
            <div className="w-full max-w-lg flex flex-col gap-2 mt-4">
                {dishes.map(d => {
                    const r = resolved[d.id];
                    if (!r) return null;
                    return (
                        <div key={d.id} className="flex items-center justify-between px-4 py-2 bg-kitchen-card border border-kitchen-wood-border rounded-lg">
                            <span className="font-bold text-kitchen-text-title">{t(d.label)}</span>
                            <span className="font-bold text-kitchen-danger-text">
                                {t(r.rating)} ({r.delta > 0 ? `+${r.delta}` : r.delta})
                            </span>
                        </div>
                    );
                })}
            </div>
            <button onClick={onReset} className={PRIMARY_BTN + ' mt-6'}>
                {t('再来一局')}
            </button>
        </div>
    );
}
