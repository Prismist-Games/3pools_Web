import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Tooltip from '../ui/Tooltip';

const DIFFICULTY_STYLE = {
    easy:    { bg: 'bg-[#F0FFF8]', text: 'text-[#408060]' },
    medium:  { bg: 'bg-[#F0F8FF]', text: 'text-kitchen-info-border' },
    hard:    { bg: 'bg-purple-50', text: 'text-purple-700' },
    extreme: { bg: 'bg-[#FFF0F0]', text: 'text-kitchen-danger-text' },
};

const RARITY_STYLE = {
    1: { border: 'border-green-600',              bg: 'from-green-100 to-kitchen-card', badge: 'bg-green-600',       label: '★',    labelColor: 'text-green-700',              tagBg: 'bg-green-100 text-green-800' },
    2: { border: 'border-blue-600',               bg: 'from-blue-100 to-kitchen-card',  badge: 'bg-blue-600',        label: '★★',   labelColor: 'text-blue-700',               tagBg: 'bg-blue-100 text-blue-800' },
    3: { border: 'border-purple-400',             bg: 'from-purple-50 to-kitchen-card', badge: 'bg-purple-500',      label: '★★★',  labelColor: 'text-purple-400',             tagBg: 'bg-purple-50 text-purple-700' },
    4: { border: 'border-kitchen-gold',           bg: 'from-[#FFF8E0] to-kitchen-card', badge: 'bg-kitchen-gold',    label: '★★★★', labelColor: 'text-kitchen-gold',           tagBg: 'bg-[#FFF8E0] text-kitchen-gold-deep' },
};
// Backward compat alias
const SCORE_STYLE = RARITY_STYLE;

const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };

/** Shared tooltip content for a sticker. Pass inventory + stickerId to
 *  show Have/Need if used in an order-requirement context; pass only the
 *  sticker object (stickerId, name, icon) + inventory for inventory tooltip. */
const StickerTip = ({ sticker, inventory, requiredCount }) => {
    const { t } = useLanguage();
    const stickerId = sticker.stickerId || sticker.id;
    const owned = inventory ? inventory.filter(i => i.stickerId === stickerId).length : 0;
    const showCount = requiredCount !== undefined;
    const enough = showCount && owned >= requiredCount;
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{sticker.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{t(sticker.name)}</div>
                    <div className="text-[10px] text-cyan-400">{t('贴纸')}</div>
                </div>
            </div>
            {showCount && (
                <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">{t('持有 / 需要')}</span>
                        <span className={`font-bold ${enough ? 'text-green-400' : 'text-red-400'}`}>{owned} / {requiredCount}</span>
                    </div>
                </div>
            )}
            {!showCount && inventory && (
                <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">{t('持有')}</span>
                        <span className="font-bold text-gray-200">{owned}</span>
                    </div>
                </div>
            )}
        </>
    );
};

/** Shared tooltip content for any ingredient/food item */
const IngredientTip = ({ item }) => {
    const { t, language } = useLanguage();
    const rarity = item.rarity || item.score || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
    const displayName = (language === 'en' && item.nameEn) ? item.nameEn : t(item.name);
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{displayName}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{RARITY_STARS[rarity]}</div>
                </div>
            </div>
            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">{t(tag)}</span>
                    ))}
                </div>
            )}
            {language !== 'en' && item.nameEn && (
                <p className="text-[10px] text-gray-500 italic mt-1.5">{item.nameEn}</p>
            )}
        </>
    );
};

const RewardCard = ({ reward, size = 'md', bonusValue }) => {
    const { t } = useLanguage();
    const rarity = reward.rarity || reward.score || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
    const dim = size === 'sm' ? 'w-8 h-8 text-base' : 'w-9 h-9 text-lg';
    const badgeDim = size === 'sm' ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]';

    const tipContent = <IngredientTip item={reward} />;

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
    refreshCharges, onRefresh,
    hoveredStickerIds, bonusItemMap,
    setupMode = false,
}) => {
    const { t } = useLanguage();
    const isReplacing = !!pendingChosenOrder;
    const hasInlinePicker = !!incomingOrder && incomingOrder.candidates;
    // Refresh may be queued while a picker is shown — it just pushes another
    // pick-1-of-2 to the back of the queue. Only block during an active
    // replacement step (shelf full, player still choosing which to swap).
    const refreshDisabled = !onRefresh || (refreshCharges ?? 0) <= 0 || isReplacing || setupMode;

    return (
        <div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark rounded-xl border-2 border-kitchen-wood-border shadow-[0_3px_0_#C8A880]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(180,140,80,0.08) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-dashed border-kitchen-wood-border flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-kitchen-text-body">📌 {t('货架')}</h3>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={refreshDisabled}
                            title={t('刷新订单')}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors
                                ${refreshDisabled
                                    ? 'bg-kitchen-card/60 border-kitchen-gold-border-muted/60 text-kitchen-text-muted cursor-not-allowed'
                                    : 'bg-[#FFF8E0] border-kitchen-gold text-kitchen-gold-deep hover:bg-[#FFF3E0]'}`}
                        >
                            🔄 ×{refreshCharges ?? 0}
                        </button>
                    )}
                    <span className="text-[10px] text-kitchen-text-muted font-medium">{orders.length}/5</span>
                </div>
            </div>

            <div className="p-2">
                {/* Inline incoming order picker (shown when order_cell is drawn during play) */}
                {hasInlinePicker && !isReplacing && (
                    <div className="mb-2 p-2.5 bg-[#FFF8E0] border-2 border-kitchen-gold rounded-lg">
                        <div className="text-[11px] font-bold text-kitchen-gold-deep mb-1.5">
                            {setupMode
                                ? `${t('组建今日订单')} · ${orders.length + 1} / 5`
                                : `${t('新订单')} — ${t('选择一个加入货架')}`}
                        </div>
                        <div className="flex flex-col gap-1.5 mb-2">
                            {incomingOrder.candidates.map((candidate) => {
                                const ds = DIFFICULTY_STYLE[candidate.difficulty] || DIFFICULTY_STYLE.easy;
                                return (
                                    <button key={candidate.id}
                                        onClick={() => onConfirmIncoming(candidate)}
                                        className="p-2 rounded-lg border border-kitchen-gold-border-muted bg-kitchen-card hover:border-kitchen-gold hover:bg-[#FFF3E0] transition-colors text-left">
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
                                                <span className="text-[9px] text-kitchen-text-muted">{t('需要')}</span>
                                                {candidate.requirements.map((req, i) => (
                                                    <div key={i} className="flex items-center gap-0.5">
                                                        <div className="w-5 h-5 rounded border border-kitchen-gold-border-muted bg-kitchen-card flex items-center justify-center text-[10px] shadow-sm">
                                                            {req.icon}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-kitchen-text-secondary">x{req.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {!setupMode && (
                            <button onClick={onDiscardIncoming}
                                className="text-[10px] px-2 py-1 rounded-md border border-kitchen-gold-border-muted bg-kitchen-card font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors">
                                {t('放弃')}
                            </button>
                        )}
                    </div>
                )}

                {/* Replace mode hint (shelf full, player chose an incoming candidate) */}
                {isReplacing && (
                    <div className="mb-2 p-2.5 bg-[#FFF3E0] border-2 border-kitchen-gold rounded-lg">
                        <div className="text-[11px] font-bold text-kitchen-gold-deep mb-1.5">{t('货架已满，选择下方订单替换')}</div>
                        <div className="flex items-center gap-1 mb-1.5">
                            {pendingChosenOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" bonusValue={bonusItemMap?.get(r.id)} />
                            ))}
                        </div>
                        {pendingChosenOrder.requirements && pendingChosenOrder.requirements.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap items-center mb-2">
                                <span className="text-[9px] text-kitchen-text-muted uppercase tracking-wide">{t('需要')}</span>
                                {pendingChosenOrder.requirements.map((req, i) => (
                                    <div key={i} className="flex items-center gap-0.5">
                                        <div className="w-6 h-6 rounded border border-kitchen-gold-border-muted bg-kitchen-card flex items-center justify-center text-xs shadow-sm">
                                            {req.icon}
                                        </div>
                                        <span className="text-[10px] font-bold text-kitchen-gold-deep">x{req.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={onDiscardIncoming}
                            className="text-[10px] px-2 py-1 rounded-md border border-kitchen-gold-border-muted bg-kitchen-card font-bold text-kitchen-text-secondary hover:bg-[#FFF0EE] hover:border-kitchen-danger hover:text-kitchen-danger-text transition-colors">
                            {t('取消')}
                        </button>
                    </div>
                )}

                {orders.length === 0 && !isReplacing ? (
                    <p className="text-[11px] text-kitchen-text-muted text-center py-3">{t('暂无订单')}</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {orders.map((order, index) => {
                            const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
                            const submittable = canSubmitOrder ? canSubmitOrder(order.id) : false;
                            return (
                                <div key={order.id}
                                    onClick={() => isReplacing && onReplaceIncoming(order.id)}
                                    style={{ transform: `rotate(${index % 2 === 0 ? -1 : 0.5}deg)` }}
                                    className={`p-2 rounded-lg border ${
                                        isReplacing
                                            ? 'border-kitchen-gold bg-[#FFF8E0] cursor-pointer hover:bg-[#FFF0EE] hover:border-kitchen-danger transition-colors'
                                            : submittable ? 'border-kitchen-success-border bg-[#F0FFF8]' : 'border-kitchen-gold-border-muted/50 bg-kitchen-card/80'
                                    }`}>
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
                                        {!isReplacing && (
                                            <button
                                                onClick={() => onSubmit(order.id)}
                                                disabled={!submittable}
                                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors
                                                    ${submittable
                                                        ? 'bg-kitchen-success text-white hover:brightness-95 shadow-[0_1px_0_rgba(0,0,0,0.1)]'
                                                        : 'bg-kitchen-card/60 text-kitchen-text-muted cursor-not-allowed border border-kitchen-gold-border-muted/60'}`}
                                            >
                                                {t('提交')}
                                            </button>
                                        )}
                                    </div>
                                    {/* Row 2: sticker requirements */}
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                        <span className="text-[9px] text-kitchen-text-muted uppercase tracking-wide">{t('需要')}</span>
                                        {order.requirements.map((req, i) => {
                                            const owned = inventory ? inventory.filter(item => item.stickerId === req.stickerId).length : 0;
                                            const enough = owned >= req.count;
                                            const isHovered = hoveredStickerIds?.has(req.stickerId);
                                            return (
                                                <Tooltip key={i} content={
                                                    <StickerTip sticker={req} inventory={inventory} requiredCount={req.count} />
                                                }>
                                                    <div className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                        <div className={`w-7 h-7 rounded border ${
                                                            isHovered ? 'border-kitchen-info-border bg-[#F0F8FF] ring-2 ring-kitchen-info/40'
                                                            : enough ? 'border-kitchen-success-border bg-[#F0FFF8]'
                                                            : 'border-kitchen-gold-border-muted bg-kitchen-card'
                                                        } flex items-center justify-center text-sm shadow-sm`}>
                                                            {req.icon}
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${
                                                            isHovered ? 'text-kitchen-info-border'
                                                            : enough ? 'text-[#408060]'
                                                            : 'text-kitchen-text-muted'
                                                        }`}>{owned}<span className="font-normal text-kitchen-text-muted/60">/{req.count}</span></span>
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
export { RewardCard, IngredientTip, StickerTip, RARITY_STYLE, SCORE_STYLE, DIFFICULTY_STYLE };
