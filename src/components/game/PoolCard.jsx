import React, { useMemo } from 'react';
import { Coins, Ticket, Check, RefreshCw, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PoolCardBase = ({
    pool,
    gold,
    tickets,
    hasSkill,
    inventory = [],
    onDraw,
    onMouseEnter,
    onMouseLeave,
    isHovered,
    relevantRequirements = [],

    disabled = false
}) => {
    const { t } = useLanguage();
    // Cost Calculation
    let finalCost = pool.cost;
    if (pool.currency === 'gold' && hasSkill('calculated') && gold < 10) {
        finalCost = Math.max(1, finalCost - 2);
    }
    if (pool.currency === 'gold' && hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
        finalCost = Math.max(0, finalCost - 1);
    }

    const canAfford = pool.currency === 'gold' ? gold >= finalCost : tickets >= finalCost;
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

                {/* Price Pill - Directly after name, NOT pushed to right */}
                <div className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-lg border-2 shadow-sm
                    bg-white
                    ${!canAfford ? 'opacity-60 grayscale' : 'text-slate-800 border-slate-200'}
                `}>
                    {finalCost < pool.cost && (
                        <span className="line-through text-xs text-slate-400">{pool.cost}</span>
                    )}
                    {finalCost === 0 ? t("免费") : finalCost}
                    {pool.currency === 'gold'
                        ? <Coins size={20} className={canAfford ? "text-yellow-500" : "text-slate-400"} />
                        : <Ticket size={20} className={canAfford ? "text-pink-500" : "text-slate-400"} />
                    }
                </div>
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

                        {/* Requirements or Item Preview - 新系统：只显示物品需求 */}
                                        {relevantRequirements.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {relevantRequirements.map((reqItem, i) => {
                                                    return (
                                                        <div key={i} className="
                                                            relative flex items-center gap-1 text-sm border-2 border-dashed rounded px-2 py-1 
                                                            transition-all duration-200 shadow-sm
                                                            border-slate-300 bg-white/90 text-slate-500
                                                        ">
                                                            <span className="grayscale opacity-70">{reqItem.icon}</span>
                                                            <span className="font-bold grayscale opacity-70">{t(reqItem.name)}</span>
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
