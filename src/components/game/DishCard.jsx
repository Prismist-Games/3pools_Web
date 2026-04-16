import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { INGREDIENTS } from '../../data/v2Config';

const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

const TagBadge = ({ tag, highlight, className = '' }) => (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full
        ${highlight ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600'} ${className}`}>
        {tag}
    </span>
);

/** Render a compact rule label: tag → badge, id → item icon+name */
const RuleLabel = ({ rule, highlight }) => {
    if (rule.match.tag) {
        return <TagBadge tag={rule.match.tag} highlight={highlight} />;
    }
    if (rule.match.id) {
        const item = INGREDIENT_MAP[rule.match.id];
        return <span className={`text-[10px] font-bold ${highlight ? 'text-yellow-600' : 'text-gray-600'}`}>
            {item ? `${item.icon}${item.name}` : rule.match.id}
        </span>;
    }
    return null;
};

const DishCard = ({ dish }) => {
    const { t } = useLanguage();
    if (!dish) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{dish.icon}</span>
                    <div>
                        <h3 className="text-sm font-bold leading-tight">{dish.name}</h3>
                        <p className="text-[10px] text-gray-400">{dish.nameEn}</p>
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
                            <div className="w-10 flex-shrink-0 text-right">
                                <span className="text-[11px] font-bold text-gray-600">{slot.name}</span>
                                {slot.required && <span className="text-red-400 text-[9px]">*</span>}
                            </div>

                            <div className="flex-1">
                                {!hasRules ? (
                                    <span className="text-[10px] text-blue-400">{t('任意食材')}</span>
                                ) : (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {baseRules.map((r, ri) => <RuleLabel key={ri} rule={r} />)}
                                        {topRules.length > 0 && (
                                            <>
                                                <span className="text-gray-300 text-[10px]">→</span>
                                                {topRules.map((r, ri) => <RuleLabel key={ri} rule={r} highlight />)}
                                            </>
                                        )}
                                    </div>
                                )}

                                {slot.trigger && (
                                    <div className="text-[9px] text-cyan-500 mt-0.5">
                                        ⚡ <TagBadge tag={slot.trigger.whenTag} className="bg-cyan-100 text-cyan-600 !text-[9px] !px-1 !py-0" /> {t('开额外栏位')}
                                    </div>
                                )}
                                {slot.crossBonus && (
                                    <div className="text-[9px] text-pink-500 mt-0.5">
                                        🔗 {slot.crossBonus.requireSlot}=<TagBadge tag={slot.crossBonus.requireTag} className="bg-pink-100 text-pink-600 !text-[9px] !px-1 !py-0" />
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
