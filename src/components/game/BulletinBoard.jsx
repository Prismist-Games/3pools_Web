import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const DIFFICULTY_STYLE = {
    easy:    { bg: 'bg-green-100', text: 'text-green-700' },
    medium:  { bg: 'bg-blue-100',  text: 'text-blue-700' },
    hard:    { bg: 'bg-purple-100', text: 'text-purple-700' },
    extreme: { bg: 'bg-red-100',   text: 'text-red-700' },
};

const ORDER_GOLD_COST = { easy: 1, medium: 2, hard: 3, extreme: 4 };

// Out-of-game items use a uniform amber-tinted card; tier is shown via the
// star glyph count above the icon. No per-tier background colors.
const REWARD_CARD_STYLE = 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100';

const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
    const iconSize = size === 'sm' ? 'text-base' : 'text-lg';
    const starSize = size === 'sm' ? 'text-[6px]' : 'text-[7px]';
    const stars = reward.stars || 0;
    const starText = '★'.repeat(Math.min(stars, 3)) + (stars > 3 ? '+' : '');
    return (
        <div className={`relative ${dim} rounded border-2 ${REWARD_CARD_STYLE} flex flex-col items-center justify-center shadow-sm leading-none`}>
            <span className={`${starSize} font-black text-amber-500 tracking-tighter`}>{starText}</span>
            <span className={iconSize}>{reward.icon}</span>
            {bonusValue && (
                <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusValue}</span>
            )}
        </div>
    );
};

const BulletinBoard = ({ orders, onAccept, onRefresh, gold, bonusItemMap }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('可接取订单')}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={onRefresh} disabled={gold < 3}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                            gold >= 3 ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}>
                        🔄 3💰
                    </button>
                </div>
            </div>

            <div className="p-2">
                {orders.length === 0 ? (
                    <p className="text-[11px] text-gray-300 text-center py-3">{t('暂无订单')}</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {orders.map(order => {
                            const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                            const cost = ORDER_GOLD_COST[order.difficulty] || 3;
                            const canAfford = gold >= cost;
                            return (
                                <div key={order.id} className="p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                                    {/* Row 1: difficulty + buy button with cost */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>
                                            {t(order.difficulty)}
                                        </span>
                                        <button
                                            onClick={() => onAccept(order.id)}
                                            disabled={!canAfford}
                                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                                                canAfford
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {t('接取')} 💰{cost}
                                        </button>
                                    </div>
                                    {/* Row 2: rewards */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">{t('奖励')}</span>
                                        {order.rewards.map((r, i) => (
                                            <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulletinBoard;
export { RewardCard, DIFFICULTY_STYLE };
