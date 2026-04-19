import React from 'react';
import { PRIMARY_BTN, Panel } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ShopPicker({ candidates, canEnter, onEnter, hoursRemaining }) {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
                <h2 className="text-2xl font-black text-kitchen-text-title">{t('下一站去哪里？')}</h2>
                <p className="text-sm text-kitchen-text-secondary mt-1">
                    {t('进入一家店将消耗 1 小时')}
                </p>
            </div>

            <div className="grid grid-cols-3 gap-5">
                {candidates.map(shop => (
                    <button
                        key={shop.id}
                        type="button"
                        onClick={() => canEnter && onEnter(shop.id)}
                        disabled={!canEnter}
                        className={`group min-w-[180px] py-6 px-4 rounded-2xl border-2 shadow-[0_4px_0_#C8A880]
                            bg-gradient-to-b from-kitchen-card to-kitchen-wood-light
                            border-kitchen-wood-border
                            ${canEnter ? 'hover:-translate-y-1 hover:shadow-[0_6px_0_#C8A880] active:translate-y-0 active:shadow-[0_2px_0_#C8A880]' : 'opacity-50 cursor-not-allowed'}
                            transition-all`}
                    >
                        <div className="text-5xl mb-2">{shop.icon}</div>
                        <div className="font-bold text-kitchen-text-title text-lg">{t(shop.name)}</div>
                        <div className="text-xs text-kitchen-text-secondary mt-1">
                            {t('主营')}: {t(shop.category)}
                        </div>
                    </button>
                ))}
            </div>

            {hoursRemaining === 0 && (
                <div className="mt-4 px-4 py-2 rounded-lg bg-kitchen-danger/10 border border-kitchen-danger-border text-kitchen-danger-text text-sm">
                    {t('12 小时已用完。点击右上角「今日结束」开始结算。')}
                </div>
            )}
        </div>
    );
}
