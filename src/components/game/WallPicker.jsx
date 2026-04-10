import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/** Scan a grid for special (non-sticker, non-doom) cell types and entrances */
function getSpecialCells(grid, language) {
    const specials = [];
    const seen = new Set();
    if (!grid) return specials;

    for (const row of grid) {
        for (const cell of row) {
            if (!cell) continue;
            const type = cell.type;
            if (!type || type === 'sticker' || type === 'item' || type === 'empty'
                || type === 'doom_resolution' || type === 'doom_upgrade') continue;

            const key = type === 'entrance' ? `entrance:${cell.subLevelId}` : type;
            if (seen.has(key)) continue;
            seen.add(key);

            const info = {
                bomb: { icon: '💣', label: language === 'en' ? 'Bomb' : '炸弹' },
                gold: { icon: '💰', label: language === 'en' ? 'Gold' : '金币' },
                order_cell: { icon: '📋', label: language === 'en' ? 'Order' : '订单' },
                out_of_game: { icon: '🎁', label: language === 'en' ? 'Item' : '物品' },
                heal: { icon: '❤️‍🩹', label: language === 'en' ? 'Heal' : '生命恢复' },
                backpack_expand: { icon: '🎒', label: language === 'en' ? 'Basket Expand' : '菜篮扩容' },
                gravity: { icon: '⬇️', label: language === 'en' ? 'Gravity' : '重力开关' },
            }[type];

            if (type === 'entrance') {
                const label = (language === 'en' && cell.name_en) ? cell.name_en : (cell.name || cell.subLevelId);
                specials.push({ icon: cell.icon || '🚪', label });
            } else if (info) {
                specials.push(info);
            }
        }
    }
    return specials;
}

const WallPicker = ({ candidates, onSelect }) => {
    const { t, language } = useLanguage();
    /** Get localized level field — uses _en if available in English mode, falls back to t() */
    const tl = (level, field) => {
        if (language === 'en' && level[field + '_en']) return level[field + '_en'];
        return t(level[field]);
    };

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold text-kitchen-text-title mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-kitchen-text-secondary mb-5">{t('每面墙有不同的规则和贴纸')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => {
                    const isLevel = !wall.wallType && wall.level;
                    const specials = getSpecialCells(wall.grid, language);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(idx)}
                            className="w-52 bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border-muted
                                shadow-[0_2px_0_#D4B896] hover:border-kitchen-gold hover:shadow-[0_2px_0_#D4952A,0_0_12px_rgba(232,168,48,0.15)]
                                hover:-translate-y-1 transition-all duration-150 text-left overflow-hidden
                                flex flex-col items-stretch"
                        >
                            {isLevel ? (
                                <>
                                    <div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark px-4 py-2 mb-3 border-b border-dashed border-kitchen-wood-border">
                                        <div className="text-sm font-bold text-kitchen-text-body">{wall.level.icon || '📐'} {tl(wall.level, 'name') || wall.level.id}</div>
                                    </div>
                                    <p className="text-[10px] text-kitchen-text-secondary mb-3 leading-relaxed px-4">{tl(wall.level, 'description') || t('特殊地形关卡')}</p>
                                </>
                            ) : (
                                <>
                                    <div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark px-4 py-2 mb-3 border-b border-dashed border-kitchen-wood-border">
                                        <div className="text-sm font-bold text-kitchen-text-body">{wall.wallType.icon} {t(wall.wallType.name)}</div>
                                    </div>
                                    <p className="text-[10px] text-kitchen-text-secondary mb-3 leading-relaxed px-4">{t(wall.wallType.desc)}</p>
                                </>
                            )}

                            <div className="px-4 pb-4">
                                <div className="text-[9px] text-kitchen-text-muted uppercase tracking-wide mb-1">{t('贴纸')}</div>
                                <div className="flex gap-1 mb-3">
                                    {wall.stickers.map(s => (
                                        <div key={s.id} className="w-8 h-8 rounded border border-kitchen-gold-border-muted bg-kitchen-card flex items-center justify-center text-base shadow-sm" title={t(s.name)}>
                                            {s.icon}
                                        </div>
                                    ))}
                                </div>

                                {specials.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {specials.map((s, i) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#FFF3E0] rounded-full text-kitchen-text-secondary border border-kitchen-gold-border" title={s.label}>
                                                {s.icon} {s.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WallPicker;
