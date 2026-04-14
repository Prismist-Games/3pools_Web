import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Tooltip from '../ui/Tooltip';

const DIFFICULTY_STYLE = {
    easy:    { bg: 'bg-green-100', text: 'text-green-700' },
    medium:  { bg: 'bg-blue-100',  text: 'text-blue-700' },
    hard:    { bg: 'bg-purple-100', text: 'text-purple-700' },
    extreme: { bg: 'bg-red-100',   text: 'text-red-700' },
};

const RARITY_STYLE = {
    1: { border: 'border-green-400',  bg: 'from-green-50 to-white',  badge: 'bg-green-500', label: '★',       labelColor: 'text-green-400',  tagBg: 'bg-green-100 text-green-700' },
    2: { border: 'border-blue-400',   bg: 'from-blue-50 to-white',   badge: 'bg-blue-500',  label: '★★',      labelColor: 'text-blue-400',   tagBg: 'bg-blue-100 text-blue-700' },
    3: { border: 'border-purple-400', bg: 'from-purple-50 to-white', badge: 'bg-purple-500', label: '★★★',     labelColor: 'text-purple-400', tagBg: 'bg-purple-100 text-purple-700' },
    4: { border: 'border-orange-400', bg: 'from-orange-50 to-white', badge: 'bg-orange-500', label: '★★★★',    labelColor: 'text-orange-400', tagBg: 'bg-orange-100 text-orange-700' },
};
// Backward compat alias
const SCORE_STYLE = RARITY_STYLE;

const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };

const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const rarity = reward.rarity || reward.score || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
    const dim = size === 'sm' ? 'w-8 h-8 text-base' : 'w-9 h-9 text-lg';
    const badgeDim = size === 'sm' ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]';

    const tipContent = (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{reward.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{reward.name}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{RARITY_STARS[rarity]}</div>
                </div>
            </div>
            {reward.tags && reward.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {reward.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">{tag}</span>
                    ))}
                </div>
            )}
            {reward.nameEn && (
                <p className="text-[10px] text-gray-500 italic mt-1.5">{reward.nameEn}</p>
            )}
        </>
    );

    return (
        <Tooltip content={tipContent}>
            <div className={`relative ${dim} rounded border-2 ${s.border} bg-gradient-to-b ${s.bg} flex items-center justify-center shadow-sm`}>
                {reward.icon}
                <span className={`absolute -bottom-1 -right-1 ${s.badge} text-white font-black ${badgeDim} rounded-full flex items-center justify-center shadow`}>
                    {rarity}
                </span>
                {bonusValue && (
                    <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusValue}</span>
                )}
            </div>
        </Tooltip>
    );
};

const BulletinBoard = ({
    orders, inventory, onSubmit, canSubmitOrder,
    incomingOrder, onConfirmIncoming, onDiscardIncoming,
    pendingChosenOrder, onReplaceIncoming,
    hoveredStickerIds, bonusItemMap,
}) => {
    const { t } = useLanguage();
    const isReplacing = !!pendingChosenOrder;
    const hasInlinePicker = !!incomingOrder && incomingOrder.candidates;

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('货架')}</h3>
                <span className="text-[10px] text-gray-300 font-medium">{orders.length}/5</span>
            </div>

            <div className="p-2">
                {/* Inline incoming order picker (shown when order_cell is drawn during play) */}
                {hasInlinePicker && !isReplacing && (
                    <div className="mb-2 p-2.5 bg-blue-50 border-2 border-blue-300 rounded-lg">
                        <div className="text-[11px] font-bold text-blue-600 mb-1.5">{t('新订单')} — {t('选择一个加入货架')}</div>
                        <div className="flex flex-col gap-1.5 mb-2">
                            {incomingOrder.candidates.map((candidate) => {
                                const ds = DIFFICULTY_STYLE[candidate.difficulty] || DIFFICULTY_STYLE.easy;
                                return (
                                    <button key={candidate.id}
                                        onClick={() => onConfirmIncoming(candidate)}
                                        className="p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>{t(candidate.difficulty)}</span>
                                            <div className="flex gap-0.5">
                                                {candidate.rewards.map((r, i) => (
                                                    <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                                                ))}
                                            </div>
                                        </div>
                                        {candidate.requirements && candidate.requirements.length > 0 && (
                                            <div className="flex gap-1 flex-wrap items-center">
                                                <span className="text-[9px] text-gray-300">{t('需要')}</span>
                                                {candidate.requirements.map((req, i) => (
                                                    <div key={i} className="flex items-center gap-0.5">
                                                        <div className="w-5 h-5 rounded border border-gray-300 bg-white flex items-center justify-center text-[10px] shadow-sm">
                                                            {req.icon}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-500">x{req.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={onDiscardIncoming}
                            className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
                            {t('放弃')}
                        </button>
                    </div>
                )}

                {/* Replace mode hint (shelf full, player chose an incoming candidate) */}
                {isReplacing && (
                    <div className="mb-2 p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg">
                        <div className="text-[11px] font-bold text-amber-600 mb-1.5">{t('货架已满，选择下方订单替换')}</div>
                        <div className="flex items-center gap-1 mb-1.5">
                            {pendingChosenOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                            ))}
                        </div>
                        {pendingChosenOrder.requirements && pendingChosenOrder.requirements.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap items-center mb-2">
                                <span className="text-[9px] text-gray-300 uppercase tracking-wide">{t('需要')}</span>
                                {pendingChosenOrder.requirements.map((req, i) => (
                                    <div key={i} className="flex items-center gap-0.5">
                                        <div className="w-6 h-6 rounded border border-amber-300 bg-amber-50 flex items-center justify-center text-xs shadow-sm">
                                            {req.icon}
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-600">x{req.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={onDiscardIncoming}
                            className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
                            {t('取消')}
                        </button>
                    </div>
                )}

                {orders.length === 0 && !isReplacing ? (
                    <p className="text-[11px] text-gray-300 text-center py-3">{t('暂无订单')}</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {orders.map(order => {
                            const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                            const submittable = canSubmitOrder ? canSubmitOrder(order.id) : false;
                            return (
                                <div key={order.id}
                                    onClick={() => isReplacing && onReplaceIncoming(order.id)}
                                    className={`p-2 rounded-lg border ${
                                        isReplacing
                                            ? 'border-amber-400 bg-amber-50 cursor-pointer hover:bg-red-50 hover:border-red-400 transition-colors'
                                            : submittable ? 'border-green-300 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'
                                    }`}>
                                    {/* Row 1: difficulty + action */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] text-gray-300">{t('难度')}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>
                                                {t(order.difficulty)}
                                            </span>
                                            <div className="flex gap-0.5">
                                                {order.rewards.map((r, i) => (
                                                    <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                                                ))}
                                            </div>
                                        </div>
                                        {!isReplacing && (
                                            <button
                                                onClick={() => onSubmit(order.id)}
                                                disabled={!submittable}
                                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors
                                                    ${submittable ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                            >
                                                {t('提交')}
                                            </button>
                                        )}
                                    </div>
                                    {/* Row 2: sticker requirements */}
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                        <span className="text-[9px] text-gray-300 uppercase tracking-wide">{t('需要')}</span>
                                        {order.requirements.map((req, i) => {
                                            const owned = inventory ? inventory.filter(item => item.stickerId === req.stickerId).length : 0;
                                            const enough = owned >= req.count;
                                            const isHovered = hoveredStickerIds?.has(req.stickerId);
                                            return (
                                                <Tooltip key={i} content={
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-2xl leading-none">{req.icon}</span>
                                                            <div>
                                                                <div className="font-bold text-sm leading-tight">{req.name}</div>
                                                                <div className="text-[10px] text-cyan-400">贴纸</div>
                                                            </div>
                                                        </div>
                                                        <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-gray-400">持有 / 需要</span>
                                                                <span className={`font-bold ${enough ? 'text-green-400' : 'text-red-400'}`}>{owned} / {req.count}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 italic mt-1.5">详细描述待填写...</p>
                                                    </>
                                                }>
                                                    <div className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                        <div className={`w-7 h-7 rounded border ${
                                                            isHovered ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300'
                                                            : enough ? 'border-green-400 bg-green-50'
                                                            : 'border-gray-300 bg-white'
                                                        } flex items-center justify-center text-sm shadow-sm`}>
                                                            {req.icon}
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${isHovered ? 'text-blue-600' : enough ? 'text-green-600' : 'text-gray-400'}`}>{owned}<span className="font-normal text-gray-300">/{req.count}</span></span>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
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
export { RewardCard, RARITY_STYLE, SCORE_STYLE, DIFFICULTY_STYLE };
