import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { INGREDIENTS } from '../../data/v2Config';

const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

const TagBadge = ({ tag, highlight, className = '' }) => {
    const { t } = useLanguage();
    return (
        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${highlight ? 'bg-kitchen-gold text-kitchen-text-title' : 'bg-kitchen-wood-shadow text-kitchen-card'} ${className}`}>
            {t(tag)}
        </span>
    );
};

/** Render a compact rule label: tag → badge, id → item icon+name */
const RuleLabel = ({ rule, highlight }) => {
    const { t, language } = useLanguage();
    if (rule.match?.tag) {
        return <TagBadge tag={rule.match.tag} highlight={highlight} />;
    }
    if (rule.match?.id) {
        const item = INGREDIENT_MAP[rule.match.id];
        const itemName = item ? (language === 'en' && item.nameEn ? item.nameEn : t(item.name)) : rule.match.id;
        return (
            <span className={`text-[10px] font-bold ${highlight ? 'text-kitchen-gold-deep' : 'text-kitchen-text-body'}`}>
                {item ? `${item.icon}${itemName}` : rule.match.id}
            </span>
        );
    }
    return null;
};

/**
 * Read-only dish card — shows the current day's dish with its slot rules.
 * Replaces the older flat-accept/prefer SlotPreview. Renders anywhere:
 * the right sidebar (during play) and the setup screen (during opening).
 */
const DishCard = ({ dish }) => {
    const { t, language } = useLanguage();
    if (!dish) return null;

    const displayName = (language === 'en' && dish.nameEn) ? dish.nameEn : t(dish.name);

    return (
        <div className="bg-gradient-to-br from-kitchen-card to-[#FFF3E0] rounded-xl border-2 border-kitchen-gold-border-muted shadow-[0_2px_0_#D4B896] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark border-b border-dashed border-kitchen-wood-border">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{dish.icon}</span>
                    <div>
                        <h3 className="text-sm font-bold leading-tight text-kitchen-text-title">{displayName}</h3>
                        {language !== 'en' && dish.nameEn && (
                            <p className="text-[10px] italic text-kitchen-text-muted">{dish.nameEn}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Slots */}
            <div className="p-2.5 space-y-2">
                {dish.slots.map((slot, i) => {
                    const rules = slot.rules || [];
                    const hasRules = rules.length > 0;
                    // Sort: lower multiplier first, highest last (the "→ best" target)
                    const sorted = [...rules].sort((a, b) => a.multiplier - b.multiplier);
                    const baseRules = sorted.filter(r => r.multiplier < 2);
                    const topRules = sorted.filter(r => r.multiplier >= 2);

                    return (
                        <div key={i} className="flex items-start gap-2">
                            <div className="w-12 flex-shrink-0 text-right">
                                <span className="text-[11px] font-bold text-kitchen-text-body">{t(slot.name)}</span>
                                {slot.required && <span className="text-kitchen-danger-text text-[9px] ml-0.5">*</span>}
                            </div>

                            <div className="flex-1 min-w-0">
                                {!hasRules ? (
                                    <span className="text-[10px] text-kitchen-info-border">{t('任意食材')}</span>
                                ) : (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {baseRules.map((r, ri) => <RuleLabel key={ri} rule={r} />)}
                                        {topRules.length > 0 && (
                                            <>
                                                <span className="text-kitchen-text-muted text-[10px]">→</span>
                                                {topRules.map((r, ri) => <RuleLabel key={ri} rule={r} highlight />)}
                                            </>
                                        )}
                                    </div>
                                )}

                                {slot.exclude && (
                                    <div className="text-[9px] text-kitchen-danger-text mt-0.5">
                                        ✗ {t('不可放入')} <TagBadge tag={slot.exclude} className="bg-kitchen-danger text-white !text-[9px] !px-1 !py-0" />
                                    </div>
                                )}
                                {slot.trigger && (
                                    <div className="text-[9px] text-kitchen-info-border mt-0.5">
                                        ⚡ <TagBadge tag={slot.trigger.whenTag} className="bg-kitchen-info text-white !text-[9px] !px-1 !py-0" /> {t('开额外栏位')}
                                    </div>
                                )}
                                {slot.crossBonus && (
                                    <div className="text-[9px] text-pink-500 mt-0.5">
                                        🔗 {t(slot.crossBonus.requireSlot)}=
                                        <TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-500 text-white !text-[9px] !px-1 !py-0 ml-0.5" />
                                        {slot.crossBonus.multiplier ? ` ×${slot.crossBonus.multiplier}` : ` +${slot.crossBonus.points}`}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DishCard;
