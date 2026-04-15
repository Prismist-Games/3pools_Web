import React from 'react';
import GameTooltip from './GameTooltip';

/**
 * GameCard — reusable card-style display for stickers and items.
 *
 * Sizes:
 *   'sm'  — 24x24, for inline display (e.g. entry cost requirements)
 *   'md'  — 40x40, for inventory grid
 *   'lg'  — 56x56, for featured display
 *
 * Props:
 *   icon     — emoji/icon string
 *   label    — optional text label (shown below on lg, tooltip on sm/md)
 *   stars    — optional star rating (for out-of-game items). Rendered as
 *              a small row of yellow stars above the icon, inside the card.
 *   sticker  — if true, uses sticker-themed styling
 *   size     — 'sm' | 'md' | 'lg' (default 'md')
 *   count    — optional count badge (e.g. "x2" for sticker requirements)
 *   className — additional classes
 */
const SIZE_CONFIG = {
    sm: {
        wrapper: 'w-6 h-6 rounded',
        icon: 'text-sm',
        starText: 'text-[6px]',
        countBadge: 'text-[7px] -top-1 -right-1.5 px-0.5',
    },
    md: {
        wrapper: 'w-10 h-10 rounded-lg',
        icon: 'text-lg',
        starText: 'text-[8px]',
        countBadge: 'text-[9px] -top-1 -right-2 px-1',
    },
    lg: {
        wrapper: 'w-14 h-14 rounded-xl',
        icon: 'text-2xl',
        starText: 'text-[10px]',
        countBadge: 'text-[10px] -top-1.5 -right-2.5 px-1',
    },
};

const STICKER_STYLE = {
    border: 'border-indigo-300',
    bg: 'bg-gradient-to-b from-indigo-50 to-violet-50',
};

// Out-of-game items: uniform amber-tinted card (no per-tier coloring).
// Tier is communicated via the star count glyphs above the icon.
const STAR_STYLE = {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-b from-amber-50 to-amber-100',
};

const GameCard = ({
    icon,
    label,
    stars,
    tags,
    sticker = false,
    size = 'md',
    count,
    className = '',
}) => {
    const sz = SIZE_CONFIG[size] || SIZE_CONFIG.md;
    const hasStars = stars != null && stars > 0;
    const style = sticker
        ? STICKER_STYLE
        : hasStars
            ? STAR_STYLE
            : { border: 'border-gray-300', bg: 'bg-white' };

    const starText = hasStars
        ? '★'.repeat(Math.min(stars, 3)) + (stars > 3 ? '+' : '')
        : null;

    const card = (
        <div
            className={`relative inline-flex flex-col items-center justify-center border-2 shadow-sm ${style.border} ${style.bg} ${sz.wrapper} ${className}`}
        >
            {starText && (
                <span className={`${sz.starText} text-amber-500 font-black leading-none tracking-tighter`}>
                    {starText}
                </span>
            )}
            <span className={`${sz.icon} leading-none`}>{icon}</span>
            {count != null && count > 1 && (
                <span className={`absolute bg-gray-700 text-white font-bold rounded-full ${sz.countBadge}`}>
                    x{count}
                </span>
            )}
        </div>
    );

    if (!label) return card;

    return hasStars
        ? <GameTooltip icon={icon} title={label} text={starText} tags={tags}>{card}</GameTooltip>
        : <GameTooltip text={label}>{card}</GameTooltip>;
};

export default GameCard;
