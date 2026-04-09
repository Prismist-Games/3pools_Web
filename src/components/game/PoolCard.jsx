import React, { useMemo } from 'react';
import { Coins, Ticket, Check, RefreshCw, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PoolCardBase = ({
    pool,
    gold,
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
    // Cost Calculation - all pools now use gold
    let finalCost = pool.cost;
    if (hasSkill('vip_discount') && (pool.affixKey === 'precise' || pool.affixKey === 'targeted')) {
        finalCost = Math.max(0, finalCost - 1);
    }

    const canAfford = gold >= finalCost;
    const isEffectiveDisabled = disabled || !canAfford;
    const isScorePool = pool.type === 'score';

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
                ${isHovered ? 'scale-[1.02] shadow-xl z-10 ring-4 ring-kitchen-gold/30' : 'shadow-[0_2px_0_#D4B896] hover:shadow-[0_2px_0_#D4952A,0_4px_12px_rgba(0,0,0,0.1)]'}
                ${isEffectiveDisabled ? 'opacity-60 grayscale-[0.8] cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                flex flex-col gap-2 min-h-[140px]
            `}
        >
            {/* ===== NEW LAYOUT: Centralized Info ===== */}

            {/* Row 1: Icon + Pool Name + Price (all LEFT aligned, grouped together) */}
            <div className="flex items-center gap-3">
                <span className="text-4xl filter drop-shadow-sm">{pool.icon}</span>
                <span className="font-black text-xl leading-tight">{t(pool.name)}</span>

                {/* Price Pill - Gold cost */}
                <div className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-lg border-2 shadow-sm
                    bg-white
                    ${!canAfford ? 'opacity-60 grayscale' : 'text-slate-800 border-kitchen-gold'}
                `}>
                    {finalCost < pool.cost && (
                        <span className="line-through text-xs text-slate-400">{pool.cost}</span>
                    )}
                    {finalCost === 0 ? t("免费") : finalCost}
                    <span className={canAfford ? "text-kitchen-gold" : "text-kitchen-text-muted"}>🪙</span>
                </div>
            </div>

            {/* Row 2: Affix Name (LARGE and prominent) */}
            {pool.affix && (
                <div className="flex items-center gap-2">
                    <span className="text-base font-black text-kitchen-text-body bg-kitchen-card/60 px-3 py-1 rounded-lg shadow-sm border border-kitchen-gold-border">
                        ✨ {t(pool.affix.name)}
                    </span>
                </div>
            )}

            {/* Row 3: Content Area */}
            <div className="flex-1 w-full">
                {isScorePool ? (
                    <div className="flex flex-col gap-1 text-base font-bold opacity-80">
                        <p>🔥 {t("积分目标")}: {t(pool.targetItem?.name)}</p>
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


                    </div>
                )}
            </div>
        </button>
    );
};
export const PoolCard = React.memo(PoolCardBase);
