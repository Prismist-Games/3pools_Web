import React, { useMemo } from 'react';
import { Coins, Ticket, Check, RefreshCw, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PoolCardBase = ({
    pool,
    patience,
    hasSkill,
    config = {}, // Add default empty obj safety
    inventory = [],
    onDraw,
    onMouseEnter,
    onMouseLeave,
    isHovered,
    relevantRequirements = [],

    disabled = false
}) => {
    const { t } = useLanguage();
    // Cost Calculation - all pools now use patience
    let finalCost = pool.cost;
    if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
        finalCost = Math.max(0, finalCost - 1);
    }

    const canAfford = patience >= finalCost;
    const isEffectiveDisabled = disabled || !canAfford;
    const isMainline = pool.type === 'mainline';

    return (
        <button
            onClick={() => !isEffectiveDisabled && onDraw(pool)}
            onMouseEnter={() => onMouseEnter(pool)}
            onMouseLeave={onMouseLeave}
            aria-disabled={isEffectiveDisabled}
            className={`
                relative w-full text-left group
                rounded-2xl border-2 p-4 transition-all duration-200
                transform-gpu will-change-transform backface-hidden subpixel-antialiased
                ${pool.color} 
                ${isHovered ? 'scale-[1.02] shadow-xl z-10 ring-4 ring-white/50' : 'shadow-sm hover:shadow-md'}
                ${isEffectiveDisabled ? 'opacity-60 grayscale-[0.8] cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                flex flex-col gap-2 min-h-[140px]
            `}
        >
            {/* ===== NEW LAYOUT: Centralized Info ===== */}

            {/* Row 1: Icon + Pool Name + Price (all LEFT aligned, grouped together) */}
            <div className="flex items-center gap-3">
                <span className="text-4xl filter drop-shadow-sm">{pool.icon}</span>
                <span className="font-black text-xl leading-tight">{t(pool.name)}</span>

                {/* Price Pill - Patience cost */}
                {(config.patience?.enabled !== false) && (
                    <div className={`
                        flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-lg border-2 shadow-sm
                        bg-white
                        ${!canAfford ? 'opacity-60 grayscale' : 'text-slate-800 border-slate-200'}
                    `}>
                        {finalCost < pool.cost && (
                            <span className="line-through text-xs text-slate-400">{pool.cost}</span>
                        )}
                        {finalCost === 0 ? t("免费") : finalCost}
                        <span className={canAfford ? "text-pink-500" : "text-slate-400"}>💗</span>
                    </div>
                )}
            </div>

            {/* Row 2: Affix Name (LARGE and prominent) */}
            {pool.affix && (
                <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-800 bg-white/60 px-3 py-1 rounded-lg shadow-sm border border-white/50">
                        ✨ {t(pool.affix.name)}
                    </span>
                </div>
            )}

            {/* Row 3: Content Area */}
            <div className="flex-1 w-full">
                {isMainline ? (
                    <div className="flex flex-col gap-1 text-base font-bold opacity-80">
                        <p>🔥 {t("主线目标")}: {t(pool.targetItem?.name)}</p>
                        <p className="text-sm opacity-60">{t("可能是 90% 普通物品...")}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* Affix Description - LARGE readable text */}
                        {pool.affix && (
                            <p className="text-base font-semibold opacity-90 leading-relaxed text-slate-700">
                                {t(pool.affix.desc)}
                            </p>
                        )}

                        {/* Requirements or Item Preview */}
                        {relevantRequirements.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {relevantRequirements.map((req, i) => {
                                    const candidates = inventory.filter(item => item && item.name === req.name);
                                    candidates.sort((a, b) => b.rarity.bonus - a.rarity.bonus);
                                    const matchedItem = candidates[0];

                                    const hasItem = !!matchedItem;
                                    const isQualitySatisfied = matchedItem && matchedItem.rarity.bonus >= req.requiredRarity.bonus;

                                    const borderStyle = hasItem ? 'border-solid' : 'border-dashed';

                                    let bgColorClass = 'bg-white/90';
                                    let iconFilterClass = 'grayscale opacity-70';
                                    let textColorClass = 'text-slate-500';
                                    let borderColorClass = 'border-slate-300';

                                    if (hasItem && isQualitySatisfied) {
                                        bgColorClass = matchedItem.rarity.color;
                                        iconFilterClass = '';
                                        textColorClass = 'text-slate-700';
                                        borderColorClass = matchedItem.rarity.color.split(' ')[0];
                                    } else if (hasItem) {
                                        bgColorClass = 'bg-slate-50';
                                        borderColorClass = matchedItem.rarity.color.split(' ')[0];
                                    }

                                    return (
                                        <div key={i} className={`
                                            relative flex items-center gap-1 text-sm border-2 rounded px-2 py-1 transition-all duration-200 shadow-sm
                                            ${borderStyle} ${borderColorClass} ${bgColorClass} ${textColorClass}
                                        `}>
                                            <div className={`w-2 h-2 rounded-full ${req.requiredRarity.dotColor} shadow-sm border border-black/10 shrink-0`} title={`${t("需要")}: ${t(req.requiredRarity.name)}`}></div>
                                            <span className={`${iconFilterClass}`}>{req.icon}</span>
                                            <span className={`font-bold ${iconFilterClass} opacity-90`}>{t(req.name)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 mt-1 opacity-80">
                                {pool.items.slice(0, 4).map(item => (
                                    <div key={item.name} className="w-8 h-8 flex items-center justify-center bg-white/50 rounded-lg border border-white/40 text-lg shadow-sm">
                                        {item.icon}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
};
export const PoolCard = React.memo(PoolCardBase);
