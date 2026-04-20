import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Tooltip from '../ui/Tooltip';
import { INGREDIENTS } from '../../data/v2Config';

// ingredientId → 二级 tag; used to translate hover highlights (which come
// in as concrete ids from the wall) into tag2-level matches against order reqs.
const INGREDIENT_TAG2 = new Map(INGREDIENTS.map(ing => [ing.id, ing.tags[1]]));

const DIFFICULTY_STYLE = {
    easy:    { bg: 'bg-[#F0FFF8]', text: 'text-[#408060]' },
    medium:  { bg: 'bg-[#F0F8FF]', text: 'text-kitchen-info-border' },
    hard:    { bg: 'bg-purple-50', text: 'text-purple-700' },
    extreme: { bg: 'bg-[#FFF0F0]', text: 'text-kitchen-danger-text' },
};

const QUALITY_STYLE = {
    1: { border: 'border-gray-400',   bg: 'from-gray-50 to-white',   badge: 'bg-gray-500',   label: '★',     labelColor: 'text-gray-400',   tagBg: 'bg-gray-100 text-gray-600'     },
    2: { border: 'border-green-400',  bg: 'from-green-50 to-white',  badge: 'bg-green-500',  label: '★★',    labelColor: 'text-green-400',  tagBg: 'bg-green-100 text-green-700'   },
    3: { border: 'border-blue-400',   bg: 'from-blue-50 to-white',   badge: 'bg-blue-500',   label: '★★★',   labelColor: 'text-blue-400',   tagBg: 'bg-blue-100 text-blue-700'     },
    4: { border: 'border-purple-400', bg: 'from-purple-50 to-white', badge: 'bg-purple-500', label: '★★★★',  labelColor: 'text-purple-400', tagBg: 'bg-purple-100 text-purple-700' },
    5: { border: 'border-orange-400', bg: 'from-orange-50 to-white', badge: 'bg-orange-500', label: '★★★★★', labelColor: 'text-orange-400', tagBg: 'bg-orange-100 text-orange-700' },
};
// Backward compat aliases
const RARITY_STYLE = QUALITY_STYLE;
const SCORE_STYLE = QUALITY_STYLE;
const QUALITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' };
const RARITY_STARS = QUALITY_STARS;

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
    const quality = item.quality || item.score || 1;
    const s = QUALITY_STYLE[quality] || QUALITY_STYLE[1];
    const displayName = (language === 'en' && item.nameEn) ? item.nameEn : t(item.name);
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{displayName}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{QUALITY_STARS[quality]}</div>
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
    const { t, language } = useLanguage();
    const quality = reward.quality || reward.score || 1;
    const s = QUALITY_STYLE[quality] || QUALITY_STYLE[1];
    const dim = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
    const iconSize = size === 'sm' ? 'text-lg' : 'text-xl';
    const badgeDim = size === 'sm' ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]';
    const displayName = (language === 'en' && reward.nameEn) ? reward.nameEn : t(reward.name);

    const tipContent = <IngredientTip item={reward} />;

    return (
        <Tooltip content={tipContent}>
            <div className={`relative ${dim} rounded border-2 ${s.border} bg-gradient-to-b ${s.bg} flex flex-col items-center justify-center shadow-sm px-0.5`}>
                <span className={`${iconSize} leading-none`}>{reward.icon}</span>
                <span className="text-[8px] font-bold leading-tight truncate max-w-full text-slate-700 mt-0.5">
                    {displayName}
                </span>
                <span className={`absolute -bottom-1 -right-1 ${s.badge} text-white font-black ${badgeDim} rounded-full flex items-center justify-center shadow`}>
                    {quality}
                </span>
            </div>
        </Tooltip>
    );
};

const BulletinBoard = ({
    orders, inventory, onSubmit, canSubmitOrder,
    incomingOrder, onConfirmIncoming, onDiscardIncoming,
    pendingChosenOrder, onReplaceIncoming,
    refreshCharges, onRefresh,
    hoveredIngredientIds,
    setupMode = false,
}) => {
    const { t, language } = useLanguage();
    const isReplacing = !!pendingChosenOrder;
    // Convert wall-hovered ingredient ids into the set of 二级 tag they cover,
    // so order requirements (which now live at tag2 level) can highlight.
    const hoveredTag2Set = useMemo(() => {
        if (!hoveredIngredientIds) return null;
        const out = new Set();
        hoveredIngredientIds.forEach(id => {
            const tag2 = INGREDIENT_TAG2.get(id);
            if (tag2) out.add(tag2);
        });
        return out;
    }, [hoveredIngredientIds]);
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
                <span className="text-[10px] text-kitchen-text-muted font-medium">{orders.length}/5</span>
            </div>

            <div className="p-2">
                {/* Inline incoming picker removed — new orders are now chosen
                    via the centered picker in GameCore's between_turns view. */}

                {/* Replace mode hint (shelf full, player chose an incoming candidate) */}
                {isReplacing && (
                    <div className="mb-2 p-2.5 bg-[#FFF3E0] border-2 border-kitchen-gold rounded-lg">
                        <div className="text-[11px] font-bold text-kitchen-gold-deep mb-1.5">{t('货架已满，选择下方订单替换')}</div>
                        <div className="flex items-center gap-1 mb-1.5">
                            {pendingChosenOrder.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" />
                            ))}
                        </div>
                        {pendingChosenOrder.requirements && pendingChosenOrder.requirements.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap items-center mb-2">
                                <span className="text-[9px] text-kitchen-text-muted uppercase tracking-wide">{t('需要')}</span>
                                {pendingChosenOrder.requirements.map((req, i) => (
                                    <div key={i} className="flex items-center gap-0.5">
                                        <div className="relative w-12 h-12 rounded border border-kitchen-gold-border-muted bg-kitchen-card flex flex-col items-center justify-center shadow-sm px-0.5">
                                            <span className="text-base leading-none">{req.icon}</span>
                                            <span className="text-[8px] font-bold leading-tight truncate max-w-full text-slate-700 mt-0.5">
                                                {language === 'en' && req.nameEn ? req.nameEn : t(req.name)}
                                            </span>
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
                                                    <RewardCard key={i} reward={r} size="sm" />
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
                                    {/* Row 2: ingredient requirements */}
                                    <div className="flex gap-1.5 flex-wrap items-center">
                                        <span className="text-[9px] text-kitchen-text-muted uppercase tracking-wide">{t('需要')}</span>
                                        {order.requirements.map((req, i) => {
                                            const owned = inventory ? inventory.filter(item =>
                                                item?.tags?.[1] === req.tag2 && item.quality >= req.quality
                                            ).length : 0;
                                            const enough = owned >= req.count;
                                            const isHovered = hoveredTag2Set?.has(req.tag2);
                                            const qs = QUALITY_STYLE[req.quality] || QUALITY_STYLE[1];
                                            return (
                                                <Tooltip key={i} content={
                                                    <>
                                                        <IngredientTip item={{ icon: req.icon, name: req.name, tags: req.tags, quality: req.quality }} />
                                                        <div className="border-t border-gray-700/50 pt-1.5 mt-1">
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-gray-400">{t('持有')} / {t('需要')}</span>
                                                                <span className={`font-bold ${enough ? 'text-green-400' : 'text-red-400'}`}>{owned} / {req.count}</span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-1">{t('品质大于等于即可')}</div>
                                                        </div>
                                                    </>
                                                }>
                                                    <div className={`flex items-center gap-0.5 transition-all duration-150 ${isHovered ? 'scale-110 z-10' : ''}`}>
                                                        <div className={`relative w-12 h-12 rounded border-2 ${
                                                            isHovered ? 'border-kitchen-info-border bg-[#F0F8FF] ring-2 ring-kitchen-info/40'
                                                            : enough ? 'border-kitchen-success-border bg-[#F0FFF8]'
                                                            : qs.border + ' bg-kitchen-card'
                                                        } flex flex-col items-center justify-center shadow-sm px-0.5`}>
                                                            <span className="text-lg leading-none">{req.icon}</span>
                                                            <span className="text-[8px] font-bold leading-tight truncate max-w-full text-slate-700 mt-0.5">
                                                                {t(req.name)}
                                                            </span>
                                                            <span className={`absolute -bottom-1 -right-1 ${qs.badge} text-white font-black w-3 h-3 text-[7px] rounded-full flex items-center justify-center shadow`}>
                                                                {req.quality}
                                                            </span>
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
export { RewardCard, IngredientTip, StickerTip, QUALITY_STYLE, RARITY_STYLE, SCORE_STYLE, DIFFICULTY_STYLE };
