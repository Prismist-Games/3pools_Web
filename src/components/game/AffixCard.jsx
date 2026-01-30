import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const AffixCardBase = ({
    affix,
    pool,
    gold,
    hasSkill,
    onSelect,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    disabled = false
}) => {
    const { t } = useLanguage();

    let finalCost = affix.cost;

    // 应用技能折扣
    if (hasSkill('vip_discount') && (affix.id === 'precise' || affix.id === 'targeted')) {
        finalCost = Math.max(0, finalCost - 1);
    }
    if (hasSkill('calculated') && gold < 10) {
        finalCost = Math.max(1, finalCost - 2);
    }

    const canAfford = gold >= finalCost;
    const isEffectiveDisabled = disabled || !canAfford;

    return (
        <button
            onClick={() => !isEffectiveDisabled && onSelect(affix)}
            onMouseEnter={() => onMouseEnter?.(affix)}
            onMouseLeave={onMouseLeave}
            aria-disabled={isEffectiveDisabled}
            className={`
                relative w-full text-left group
                rounded-2xl border-2 p-4 transition-all duration-200
                transform-gpu will-change-transform backface-hidden subpixel-antialiased
                bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200
                ${isHovered ? 'scale-[1.02] shadow-xl z-10 ring-4 ring-purple-300' : 'shadow-sm hover:shadow-md'}
                ${isEffectiveDisabled ? 'opacity-60 grayscale-[0.8] cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:border-purple-400'}
                flex flex-col gap-3 min-h-[120px]
            `}
        >
            {/* Row 1: 词缀名称 + 价格 */}
            <div className="flex items-center gap-3">
                <span className="text-3xl filter drop-shadow-sm">✨</span>
                <span className="font-black text-xl leading-tight text-purple-900">{t(affix.name)}</span>

                {/* 价格 */}
                <div className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-lg border-2 shadow-sm
                    bg-white
                    ${!canAfford ? 'opacity-60 grayscale' : 'text-slate-800 border-slate-200'}
                `}>
                    {finalCost < affix.cost && (
                        <span className="line-through text-xs text-slate-400">{affix.cost}</span>
                    )}
                    {finalCost === 0 ? t("免费") : finalCost}
                    <Coins size={20} className={canAfford ? "text-yellow-500" : "text-slate-400"} />
                </div>
            </div>

            {/* Row 2: 词缀描述 */}
            <p className="text-base font-semibold opacity-90 leading-relaxed text-slate-700">
                {t(affix.desc)}
            </p>

            {/* Row 3: 目标池子预览 */}
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/50 px-3 py-2 rounded-lg border border-white/80">
                <span className="font-medium">{t("目标")}：</span>
                <span className="text-2xl">{pool.icon}</span>
                <span className="font-bold text-slate-700">{t(pool.name)}</span>
            </div>
        </button>
    );
};

export const AffixCard = React.memo(AffixCardBase);
