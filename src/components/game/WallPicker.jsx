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
                gold: { icon: '🎫', label: language === 'en' ? 'Draws' : '抽数' },
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

/**
 * Wall picker: 3 candidates surfaced as mystery cards. The modifier (or
 * hand-crafted level) identity is deliberately hidden — only basic info
 * (stickers, doom counts, specials) is exposed, so the player bets on
 * cell composition rather than pre-reading the rule. Selection commits:
 * a confirmation reveal with the modifier follows in the wall_reveal
 * phase before drawing starts.
 */
const WallPicker = ({ candidates, onSelect, onHoverStickerIds }) => {
    const { t, language } = useLanguage();

    const reportHover = (wall) => {
        if (!onHoverStickerIds) return;
        if (!wall) { onHoverStickerIds(null); return; }
        const ids = new Set(wall.stickers.map(s => s.id));
        onHoverStickerIds(ids.size > 0 ? ids : null);
    };

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold text-kitchen-text-title mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-kitchen-text-secondary mb-5">{t('规则会在进入后揭晓')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => {
                    const specials = getSpecialCells(wall.grid, language);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(idx)}
                            onMouseEnter={() => reportHover(wall)}
                            onMouseLeave={() => reportHover(null)}
                            className="w-52 bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border-muted
                                shadow-[0_2px_0_#D4B896] hover:border-kitchen-gold hover:shadow-[0_2px_0_#D4952A,0_0_12px_rgba(232,168,48,0.15)]
                                hover:-translate-y-1 transition-all duration-150 text-left overflow-hidden
                                flex flex-col items-stretch"
                        >
                            <div className="bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark px-4 py-2 mb-3 border-b border-dashed border-kitchen-wood-border">
                                <div className="text-sm font-bold text-kitchen-text-body">❓ {language === 'en' ? `Wall ${idx + 1}` : `第 ${idx + 1} 号墙`}</div>
                            </div>

                            <div className="px-4 pb-4">
                                <div className="text-[9px] text-kitchen-text-muted uppercase tracking-wide mb-1">{t('贴纸')}</div>
                                <div className="flex gap-1 mb-3 items-center flex-wrap">
                                    {wall.stickers.map((s) => (
                                        <div key={s.id} className="w-8 h-8 rounded border border-kitchen-gold-border-muted bg-kitchen-card flex items-center justify-center text-base shadow-sm" title={t(s.name)}>
                                            {s.icon}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {(wall.doomCellCount?.resolution || 0) > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-[#FFF0F0] rounded-full text-kitchen-danger-text border border-kitchen-danger" title={language === 'en' ? 'Doom Resolution' : '厄运结算'}>
                                            💀 ×{wall.doomCellCount.resolution}
                                        </span>
                                    )}
                                    {(wall.doomCellCount?.upgrade || 0) > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-[#FFF0F0] rounded-full text-kitchen-danger-text border border-kitchen-danger" title={language === 'en' ? 'Doom Upgrade' : '厄运升级'}>
                                            ⚠️ ×{wall.doomCellCount.upgrade}
                                        </span>
                                    )}
                                    {specials.map((s, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#FFF3E0] rounded-full text-kitchen-text-secondary border border-kitchen-gold-border" title={s.label}>
                                            {s.icon} {s.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WallPicker;
