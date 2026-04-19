import React from 'react';

// ─── 品质样式（1-4）─────────────────────────────────────────────
export const RARITY_STYLES = {
    1: { border: 'border-kitchen-gold-border-muted', bg: 'bg-kitchen-card',  star: 'text-kitchen-text-muted',  label: '★',    labelEn: '★'    },
    2: { border: 'border-green-400',                 bg: 'bg-green-50',      star: 'text-green-600',          label: '★★',   labelEn: '★★'   },
    3: { border: 'border-purple-400',                bg: 'bg-purple-50',     star: 'text-purple-600',         label: '★★★',  labelEn: '★★★'  },
    4: { border: 'border-kitchen-gold',              bg: 'bg-orange-50',     star: 'text-kitchen-gold-deep',  label: '★★★★', labelEn: '★★★★' },
};

export function rarityStyle(r) {
    return RARITY_STYLES[r] || RARITY_STYLES[1];
}

// ─── 食材卡片 —— 显示在背包/冰箱/篮子 ──────────────────────
export function IngredientChip({ ingredient, size = 'md', selected = false, dimmed = false, onClick, showStars = true, titleBehavior = 'full' }) {
    if (!ingredient) return <EmptySlot size={size} onClick={onClick} />;
    const r = ingredient.rarity || 1;
    const s = rarityStyle(r);
    const sizes = {
        sm: 'w-12 h-12 text-xl',
        md: 'w-14 h-14 text-2xl',
        lg: 'w-16 h-16 text-3xl',
    };
    const title = titleBehavior === 'full'
        ? `${ingredient.name}\n${(ingredient.tags || []).join(' · ')}`
        : ingredient.name;
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`${sizes[size]} relative rounded-xl border-2 ${s.border} ${s.bg} flex items-center justify-center shadow-sm transition
                ${selected ? 'ring-2 ring-kitchen-gold-dark -translate-y-0.5' : ''}
                ${dimmed ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={dimmed || !onClick}
        >
            <span>{ingredient.icon}</span>
            {showStars && (
                <span className={`absolute -bottom-1 -right-1 px-1 text-[9px] font-bold rounded-md bg-white/90 border border-current ${s.star}`}>
                    {s.label}
                </span>
            )}
        </button>
    );
}

export function EmptySlot({ size = 'md', onClick, hint }) {
    const sizes = {
        sm: 'w-12 h-12',
        md: 'w-14 h-14',
        lg: 'w-16 h-16',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${sizes[size]} rounded-xl border-2 border-dashed border-kitchen-gold-border-muted bg-kitchen-wood-light/30 flex items-center justify-center text-kitchen-text-muted text-xs
                ${onClick ? 'hover:border-kitchen-gold hover:bg-kitchen-wood-light cursor-pointer' : 'cursor-default'}`}
        >
            {hint || ''}
        </button>
    );
}

// ─── 香蕉皮格子 ────────────────────────────────────────────
export function BananaPeelCell({ size = 'md', subdued = false, onClick }) {
    const sizes = {
        sm: 'w-12 h-12 text-xl',
        md: 'w-14 h-14 text-2xl',
        lg: 'w-16 h-16 text-3xl',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${sizes[size]} relative rounded-xl border-2 border-yellow-500 bg-yellow-100 flex items-center justify-center shadow-sm
                ${subdued ? 'opacity-60' : ''}
                ${onClick ? 'hover:-translate-y-0.5 hover:shadow' : 'cursor-default'}`}
            disabled={!onClick}
            title="香蕉皮 —— 抽中会被踢出店"
        >
            <span>🍌</span>
        </button>
    );
}

// ─── 普通按钮 ─────────────────────────────────────────────
export const PRIMARY_BTN = `px-5 py-2 rounded-xl font-bold text-white
    bg-gradient-to-b from-kitchen-gold to-kitchen-gold-deep
    border-2 border-kitchen-gold-deep shadow-[0_3px_0_#A67820]
    hover:brightness-105 active:translate-y-0.5 active:shadow-[0_1px_0_#A67820]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
    transition-all duration-100`;

export const SECONDARY_BTN = `px-4 py-2 rounded-xl font-semibold text-kitchen-text-body
    bg-gradient-to-b from-kitchen-card to-kitchen-wood-light
    border-2 border-kitchen-wood-border shadow-[0_2px_0_#C8A880]
    hover:brightness-105 active:translate-y-0.5 active:shadow-[0_0_0_#C8A880]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-100`;

export const DANGER_BTN = `px-4 py-2 rounded-xl font-semibold text-white
    bg-gradient-to-b from-kitchen-danger to-kitchen-danger-border
    border-2 border-kitchen-danger-border shadow-[0_2px_0_#A05040]
    hover:brightness-105 active:translate-y-0.5 active:shadow-[0_0_0_#A05040]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-100`;

// ─── 面板容器 ─────────────────────────────────────────────
export function Panel({ title, children, className = '' }) {
    return (
        <div className={`bg-kitchen-card rounded-2xl border-2 border-kitchen-wood-border shadow-[0_3px_0_#C8A880] p-4 ${className}`}>
            {title && (
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-bold text-kitchen-text-title">{title}</h3>
                </div>
            )}
            {children}
        </div>
    );
}
