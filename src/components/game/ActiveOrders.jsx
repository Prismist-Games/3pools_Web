import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RewardCard, DIFFICULTY_STYLE } from './BulletinBoard';
import Tooltip from '../ui/Tooltip';

const ActiveOrders = ({ orders, inventory, onSubmit, canSubmitOrder, pendingAcceptOrder, onConfirmReplace, onCancelReplace, hoveredStickerIds, bonusItemMap }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('已接订单')}</h3>
                <span className="text-[10px] text-gray-300 font-medium">{orders.length}/3</span>
            </div>

            <div className="p-2">
                {/* Replace mode hint */}
                {pendingAcceptOrder && (
                    <div className="mb-2 p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg">
                        <div className="text-[11px] font-bold text-amber-600 mb-1.5">{t('选择要替换的订单')}</div>
                        <div className="flex items-center gap-1 mb-2">
                            {pendingAcceptOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                            ))}
                        </div>
                        <button onClick={onCancelReplace} className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 font-bold text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
                            {t('取消')}
                        </button>
                    </div>
                )}

                {orders.length === 0 && !pendingAcceptOrder && (
                    <p className="text-[11px] text-gray-300 text-center py-3">{t('暂无已接订单')}</p>
                )}

                <div className="flex flex-col gap-1.5">
                    {orders.map(order => {
                        const submittable = canSubmitOrder(order.id);
                        const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                        return (
                            <div
                                key={order.id}
                                onClick={() => pendingAcceptOrder && onConfirmReplace(order.id)}
                                className={`p-2 rounded-lg border ${
                                    pendingAcceptOrder
                                        ? 'border-amber-400 bg-amber-50 cursor-pointer hover:bg-red-50 hover:border-red-400 transition-colors'
                                        : submittable ? 'border-green-300 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'
                                }`}
                            >
                                {/* Row 1: difficulty + rewards + action */}
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
                                    {!pendingAcceptOrder && (
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
                                        const owned = inventory.filter(item => item.stickerId === req.stickerId).length;
                                        const enough = owned >= req.count;
                                        const isHovered = hoveredStickerIds?.has(req.stickerId);
                                        return (
                                            <Tooltip key={i} content={
                                                <>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-2xl leading-none">{req.icon}</span>
                                                        <div>
                                                            <div className="font-bold text-sm leading-tight">{req.name}</div>
                                                            <div className="text-[10px] text-cyan-400">风土之源</div>
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
            </div>
        </div>
    );
};

export default ActiveOrders;
