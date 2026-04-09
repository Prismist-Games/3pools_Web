import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Tooltip from '../ui/Tooltip';

const DIFFICULTY_STYLE = {
    easy:    { bg: 'bg-green-100', text: 'text-green-700' },
    medium:  { bg: 'bg-blue-100',  text: 'text-blue-700' },
    hard:    { bg: 'bg-purple-100', text: 'text-purple-700' },
    extreme: { bg: 'bg-red-100',   text: 'text-red-700' },
};

const SCORE_STYLE = {
    1: { border: 'border-green-400',  bg: 'from-green-50 to-white',  badge: 'bg-green-500', label: '基础调料', labelColor: 'text-green-400' },
    2: { border: 'border-blue-400',   bg: 'from-blue-50 to-white',   badge: 'bg-blue-500',  label: '普通食材', labelColor: 'text-blue-400' },
    3: { border: 'border-purple-400', bg: 'from-purple-50 to-white', badge: 'bg-purple-500', label: '珍稀食材', labelColor: 'text-purple-400' },
    5: { border: 'border-orange-400', bg: 'from-orange-50 to-white', badge: 'bg-orange-500', label: '厨具',     labelColor: 'text-orange-400' },
};

const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const { t } = useLanguage();
    const s = SCORE_STYLE[reward.score] || SCORE_STYLE[1];
    const dim = size === 'sm' ? 'w-8 h-8 text-base' : 'w-9 h-9 text-lg';
    const badgeDim = size === 'sm' ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]';

    const tipContent = (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{reward.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{t(reward.name)}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{t(s.label)}</div>
                </div>
            </div>
            <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400">{t('撤离价值')}</span>
                    <span className="font-bold text-yellow-300">{reward.score} {t('分')}</span>
                </div>
            </div>
        </>
    );

    return (
        <Tooltip content={tipContent}>
            <div className={`relative ${dim} rounded border-2 ${s.border} bg-gradient-to-b ${s.bg} flex items-center justify-center shadow-sm`}>
                {reward.icon}
                <span className={`absolute -bottom-1 -right-1 ${s.badge} text-white font-black ${badgeDim} rounded-full flex items-center justify-center shadow`}>
                    {reward.score}
                </span>
                {bonusValue && (
                    <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusValue}</span>
                )}
            </div>
        </Tooltip>
    );
};

const BulletinBoard = ({ orders, onAccept, incomingOrder, onConfirmIncoming, onDiscardIncoming, onReplaceIncoming, bonusItemMap }) => {
    const { t } = useLanguage();
    const isFull = orders.length >= 5;
    const hasIncoming = !!incomingOrder;

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('公告牌')}</h3>
                <span className="text-[10px] text-gray-300 font-medium">{orders.length}/5</span>
            </div>

            <div className="p-2">
                {/* Incoming order banner */}
                {hasIncoming && (
                    <div className="mb-2 p-2.5 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <div className="text-[11px] font-bold text-blue-600 mb-1.5">{t('新订单')}</div>
                        <div className="flex items-center gap-1 mb-2">
                            {incomingOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            {isFull ? (
                                <span className="text-[10px] text-amber-600">{t('公告牌已满，选择下方订单替换')}</span>
                            ) : (
                                <button onClick={onConfirmIncoming}
                                    className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                                    {t('加入公告牌')}
                                </button>
                            )}
                            <button onClick={onDiscardIncoming}
                                className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
                                {t('放弃')}
                            </button>
                        </div>
                    </div>
                )}

                {orders.length === 0 && !hasIncoming ? (
                    <p className="text-[11px] text-gray-300 text-center py-3">{t('暂无订单')}</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {orders.map(order => {
                            const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                            return (
                                <div key={order.id}
                                    onClick={() => hasIncoming && isFull && onReplaceIncoming(order.id)}
                                    className={`p-2 rounded-lg border ${
                                        hasIncoming && isFull
                                            ? 'border-amber-400 bg-amber-50 cursor-pointer hover:bg-red-50 hover:border-red-400 transition-colors'
                                            : 'border-gray-100 bg-gray-50/50'
                                    }`}>
                                    {/* Row 1: difficulty + action */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-gray-300">{t('难度')}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>
                                                {t(order.difficulty)}
                                            </span>
                                        </div>
                                        {!hasIncoming && (
                                            <button onClick={() => onAccept(order.id)}
                                                className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                                                {t('接取')}
                                            </button>
                                        )}
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
export { RewardCard, SCORE_STYLE, DIFFICULTY_STYLE };
