import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RewardCard, DIFFICULTY_STYLE } from './BulletinBoard';
import Tooltip from '../ui/Tooltip';

const ActiveOrders = ({ orders, inventory, onSubmit, canSubmitOrder, pendingAcceptOrder, onConfirmReplace, onCancelReplace, hoveredStickerIds, bonusItemMap }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-dashed border-kitchen-gold-border/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-kitchen-text-body">📋 {t('已接订单')}</h3>
                <span className="text-[10px] text-kitchen-text-muted font-medium">{orders.length}/3</span>
            </div>

            <div className="p-2">
                {/* Replace mode hint */}
                {pendingAcceptOrder && (
                    <div className="mb-2 p-2.5 bg-[#FFF8E0] border-2 border-kitchen-gold rounded-lg">
                        <div className="text-[11px] font-bold text-kitchen-gold-deep mb-1.5">{t('选择要替换的订单')}</div>
                        <div className="flex items-center gap-1 mb-2">
                            {pendingAcceptOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                            ))}
                        </div>
                        <button onClick={onCancelReplace} className="text-[10px] px-2 py-1 rounded-md border border-kitchen-gold-border-muted bg-kitchen-card font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors">
                            {t('取消')}
                        </button>
                    </div>
                )}

                {orders.length === 0 && !pendingAcceptOrder && (
                    <p className="text-[11px] text-kitchen-text-muted text-center py-3">{t('暂无已接订单')}</p>
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
                                        ? 'border-kitchen-gold bg-[#FFF8E0] cursor-pointer hover:bg-[#FFF0EE] hover:border-kitchen-danger transition-colors'
                                        : submittable ? 'border-kitchen-success bg-[#F0FFF8]' : 'border-kitchen-gold-border-muted/50 bg-kitchen-card/80'
                                }`}
                            >
                                {/* Row 1: difficulty + rewards + action */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-kitchen-text-muted">{t('难度')}</span>
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
                                                ${submittable ? 'bg-kitchen-gold text-kitchen-text-title hover:bg-kitchen-gold-dark' : 'bg-[#F5F0E8] text-kitchen-text-muted cursor-not-allowed'}`}
                                        >
                                            {t('提交')}
                                        </button>
                                    )}
                                </div>
                                {/* Row 2: sticker requirements */}
                                <div className="flex gap-1.5 flex-wrap items-center">
                                    <span className="text-[9px] text-kitchen-text-muted uppercase tracking-wide">{t('需要')}</span>
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
                                                            <div className="font-bold text-sm leading-tight">{t(req.name)}</div>
                                                            <div className="text-[10px] text-cyan-400">{t('贴纸')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-gray-400">{t('持有 / 需要')}</span>
                                                            <span className={`font-bold ${enough ? 'text-green-400' : 'text-red-400'}`}>{owned} / {req.count}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            }>
                                                <div className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                    <div className={`w-7 h-7 rounded border ${
                                                        isHovered ? 'border-kitchen-gold bg-[#FFF8E0] ring-2 ring-kitchen-gold/40'
                                                        : enough ? 'border-kitchen-success bg-[#F0FFF8]'
                                                        : 'border-kitchen-gold-border-muted bg-kitchen-card'
                                                    } flex items-center justify-center text-sm shadow-sm`}>
                                                        {req.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${isHovered ? 'text-kitchen-gold-deep' : enough ? 'text-kitchen-success-border' : 'text-kitchen-text-muted'}`}>{owned}<span className={`font-normal text-kitchen-text-muted`}>/{req.count}</span></span>
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                {/* Progress bar */}
                                {(() => {
                                    const total = order.requirements.reduce((s, r) => s + r.count, 0);
                                    const owned = order.requirements.reduce((s, r) => {
                                        const have = inventory.filter(item => item.stickerId === r.stickerId).length;
                                        return s + Math.min(have, r.count);
                                    }, 0);
                                    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
                                    return (
                                        <div className="mt-1.5 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-kitchen-gold to-[#F2C040] transition-all duration-300"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ActiveOrders;
