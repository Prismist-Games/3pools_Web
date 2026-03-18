import React from 'react';
import { TRAIT_DEFINITIONS } from '../../data/constants';
import { getItemValue, getBaseValue } from '../../utils/helpers';
import { useLanguage } from '../../contexts/LanguageContext';

const ItemDetailPanel = ({ item, config, inventory }) => {
    const { t } = useLanguage();

    if (!item) {
        return (
            <div className="bg-white/60 rounded-2xl border-2 border-dashed border-slate-200 p-6 flex items-center justify-center min-h-[100px]">
                <span className="text-sm text-slate-300 font-bold select-none">{t("悬浮物品查看详情")}</span>
            </div>
        );
    }

    const displayNames = item.names || [item.name];
    const displayIcons = item.icons || [item.icon];
    const traits = item.traits || [];
    const maxTraits = item.maxTraits || 1;

    const baseValue = getBaseValue(item.rarity?.id, config);
    const permanentBonus = item.permanentBonus || 0;
    const totalValue = getItemValue(item, config, inventory);

    let additiveAura = 0;
    let multiplicativeAura = 1;
    for (const traitId of traits) {
        const trait = TRAIT_DEFINITIONS[traitId];
        if (!trait || trait.effectType !== 'aura') continue;
        if (trait.auraType === 'additive') {
            additiveAura += trait.calcAdditive(item, inventory);
        } else if (trait.auraType === 'multiplicative') {
            multiplicativeAura *= trait.calcMultiplicative(item, inventory);
        }
    }
    const hasMultiplier = multiplicativeAura !== 1;

    const infusionHistory = item.infusionHistory || [];
    const historySummary = {};
    infusionHistory.forEach(h => {
        historySummary[h.name] = (historySummary[h.name] || 0) + 1;
    });

    const rarityColor = item.rarity?.color || 'border-slate-300 bg-slate-50 text-slate-600';
    const borderColor = rarityColor.split(' ')[0] || 'border-slate-300';

    return (
        <div className={`rounded-2xl border-2 ${borderColor} bg-white shadow-sm overflow-hidden transition-all duration-150`}>
            {/* Title bar */}
            <div className={`px-4 py-1.5 ${rarityColor} flex items-center justify-between gap-2`}>
                <span className="text-lg font-black truncate leading-tight">
                    {displayNames.map(n => t(n)).join(' × ')}
                </span>
                <span className="text-sm font-bold opacity-70 shrink-0">{t(item.rarity?.name || '普通')}</span>
            </div>

            <div className="px-4 pt-3 pb-3 flex flex-col gap-2">
                {/* Value (left fixed) + Icons (right-aligned, grow left) */}
                <div className="flex items-stretch gap-2">
                    {/* Value block — fixed width */}
                    <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-200 flex items-end gap-2 w-40 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-amber-600">{t("价值")}</span>
                            <span className="text-[11px] text-amber-600/60 font-mono leading-snug">
                                {t("基础")} {baseValue}
                                {permanentBonus !== 0 && <>{permanentBonus > 0 ? ` +${permanentBonus}` : ` ${permanentBonus}`}</>}
                                {additiveAura !== 0 && <> +{additiveAura}</>}
                                {hasMultiplier && <> ×{multiplicativeAura.toFixed(1)}</>}
                            </span>
                        </div>
                        <span className="text-5xl font-black text-amber-600 leading-none tabular-nums ml-auto">{totalValue}</span>
                    </div>

                    {/* Component icons — right-aligned, expand leftward */}
                    <div className="flex-1 flex items-stretch gap-1.5 justify-end">
                        {displayIcons.map((icon, i) => (
                            <div key={i} className={`w-[76px] rounded-xl border-2 ${borderColor} bg-white flex items-center justify-center shadow-sm`}>
                                <span className="text-4xl leading-none">{icon}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Traits (no header — moved to bottom row) */}
                <div className="flex flex-col gap-1.5">
                    {traits.length === 0 && (
                        <div className="text-sm text-slate-300 italic">{t("无特质")}</div>
                    )}
                    {traits.map((traitId, i) => {
                        const trait = TRAIT_DEFINITIONS[traitId];
                        if (!trait) return null;
                        return (
                            <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-purple-50/70 border border-purple-100">
                                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                <span className="text-sm font-bold text-purple-700 shrink-0">{t(trait.name)}</span>
                                <span className="text-xs text-slate-500">{t(trait.desc)}</span>
                            </div>
                        );
                    })}
                    {Array.from({ length: Math.max(0, maxTraits - traits.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="py-2 px-3 rounded-lg border border-dashed border-slate-200 text-xs text-slate-300 italic">
                            {t("空槽位")}
                        </div>
                    ))}
                </div>

                {/* Bottom row: Infusion info + Trait count */}
                <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-600">{t("剩余注入")}</span>
                            <span className="text-sm font-black text-purple-600 tabular-nums">{item.remainingInfusions ?? 3}/{item.maxInfusions ?? 3}</span>
                        </div>
                        <span className="text-sm font-black text-slate-400">{t("特质")} ({traits.length}/{maxTraits})</span>
                    </div>
                    {Object.keys(historySummary).length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap justify-end">
                            <span>{t("已注入")}:</span>
                            {Object.entries(historySummary).map(([name, count], i) => (
                                <span key={name}>{i > 0 && ', '}{t(name)}×{count}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemDetailPanel;
