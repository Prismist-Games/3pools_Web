import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect, onHoverIngredientIds }) => {
    const { t } = useLanguage();

    // Hovering a market card reports that market's full ingredient id set up
    // to the shared `hoveredIngredientIds` channel — BulletinBoard listens and
    // rings order requirements whose tag2 matches. Restores pre-sticker-era
    // behavior that was dropped during the 贴纸→食材 refactor (commit 3dc84fd).
    const reportHover = (wall) => {
        if (!onHoverIngredientIds) return;
        if (!wall || !wall.marketIngredients) { onHoverIngredientIds(null); return; }
        const ids = new Set(wall.marketIngredients.map(i => i.id));
        onHoverIngredientIds(ids.size > 0 ? ids : null);
    };

    // 统计墙面"危险"类格子——分两组展示：
    // 1) 抢菜人类（人形干扰者）：doom_resolution + snatcher + loudmouth
    // 2) 脏乱程度：slime
    const countDangers = (grid) => {
        let snatchers = 0;
        let mess = 0;
        if (!grid) return { snatchers, mess };
        for (const row of grid) {
            for (const cell of row) {
                if (!cell) continue;
                if (cell.type === 'doom_resolution' || cell.type === 'snatcher' || cell.type === 'loudmouth') snatchers++;
                else if (cell.type === 'slime') mess++;
            }
        }
        return { snatchers, mess };
    };

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-5">{t('接下来去哪儿？')}</h2>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => {
                    const subcategories = wall.marketIngredients
                        ? [...new Set(wall.marketIngredients.map(i => i.tags[1]))]
                        : [];
                    const { snatchers, mess } = countDangers(wall.grid);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(idx)}
                            onMouseEnter={() => reportHover(wall)}
                            onMouseLeave={() => reportHover(null)}
                            className="w-48 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                                hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                        >
                            <div className="text-sm font-bold mb-1">{wall.wallType.icon} {t(wall.wallType.name)}</div>
                            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{wall.wallType.desc}</p>

                            <div className="flex flex-wrap gap-1 mb-3">
                                {subcategories.map(sub => (
                                    <span key={sub} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                        {sub}
                                    </span>
                                ))}
                            </div>

                            <div className="text-[10px] text-red-500 font-bold leading-tight">
                                <div>🧑 {snatchers} {t('人在抢菜')}</div>
                                <div>🫠 {t('脏乱程度')} ×{mess}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WallPicker;
