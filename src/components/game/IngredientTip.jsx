import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// Rarity-tier styles for out-of-game ingredients / items (1-4).
export const RARITY_STYLE = {
    1: { border: 'border-kitchen-success-border', bg: 'from-[#F0FFF8] to-kitchen-card', badge: 'bg-kitchen-success', label: '★',    labelColor: 'text-kitchen-success-border', tagBg: 'bg-[#F0FFF8] text-[#408060]' },
    2: { border: 'border-kitchen-info-border',    bg: 'from-[#F0F8FF] to-kitchen-card', badge: 'bg-kitchen-info',    label: '★★',   labelColor: 'text-kitchen-info-border',    tagBg: 'bg-[#F0F8FF] text-kitchen-info-border' },
    3: { border: 'border-purple-400',             bg: 'from-purple-50 to-kitchen-card', badge: 'bg-purple-500',      label: '★★★',  labelColor: 'text-purple-400',             tagBg: 'bg-purple-50 text-purple-700' },
    4: { border: 'border-kitchen-gold',           bg: 'from-[#FFF8E0] to-kitchen-card', badge: 'bg-kitchen-gold',    label: '★★★★', labelColor: 'text-kitchen-gold',           tagBg: 'bg-[#FFF8E0] text-kitchen-gold-deep' },
};

export const RARITY_STARS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };

/** Shared tooltip content for any ingredient/food item. */
export const IngredientTip = ({ item }) => {
    const { t } = useLanguage();
    const rarity = item.rarity || item.score || item.stars || 1;
    const s = RARITY_STYLE[rarity] || RARITY_STYLE[1];
    return (
        <>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                    <div className="font-bold text-sm leading-tight">{t(item.name)}</div>
                    <div className={`text-[10px] ${s.labelColor}`}>{RARITY_STARS[rarity] || '★'}</div>
                </div>
            </div>
            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">{t(tag)}</span>
                    ))}
                </div>
            )}
            {item.nameEn && (
                <p className="text-[10px] text-gray-500 italic mt-1.5">{item.nameEn}</p>
            )}
        </>
    );
};
