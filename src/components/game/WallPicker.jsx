import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({
    candidates,
    onSelect,
    onHoverIngredientIds,
    onReturnToRestaurant,
    returnLockReason,        // 教程态：传入 reason 字符串则禁用"回到餐厅"，hover 显示 reason
    candidatesLockReason,    // 教程态：传入 reason 字符串则禁用所有市场候选卡，hover 显示 reason
}) => {
    const { t, language } = useLanguage();

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

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-5">{t('接下来去哪儿？')}</h2>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => {
                    const subcategories = wall.marketIngredients
                        ? [...new Set(wall.marketIngredients.map(i => i.tags[1]))]
                        : [];
                    return (
                        <button
                            key={idx}
                            data-tutorial={wall.wallType?.id ? `market-card-${wall.wallType.id}` : undefined}
                            onClick={() => onSelect(idx)}
                            onMouseEnter={() => reportHover(wall)}
                            onMouseLeave={() => reportHover(null)}
                            disabled={!!candidatesLockReason}
                            title={candidatesLockReason ? t(candidatesLockReason) : undefined}
                            className={`w-48 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                                ${candidatesLockReason
                                    ? 'opacity-60 cursor-not-allowed'
                                    : 'hover:border-blue-400 hover:shadow-lg'}
                                transition-all duration-150 text-left`}
                        >
                            <div className="text-sm font-bold mb-1">{wall.wallType.icon} {language === 'en' && wall.wallType.nameEn ? wall.wallType.nameEn : t(wall.wallType.name)}</div>
                            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{language === 'en' && wall.wallType.descEn ? wall.wallType.descEn : t(wall.wallType.desc)}</p>

                            <div className="flex flex-wrap gap-1 mb-3">
                                {subcategories.map(sub => (
                                    <span key={sub} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                        {t(sub)}
                                    </span>
                                ))}
                            </div>

                            <div className="text-[10px] text-red-500 font-bold">
                                🧑 {wall.doomCellCount.resolution} {t('抢菜人')}
                            </div>
                        </button>
                    );
                })}
            </div>
            {onReturnToRestaurant && (
                <div className="mt-6 flex justify-center">
                    <button
                        data-tutorial="return-restaurant"
                        onClick={onReturnToRestaurant}
                        disabled={!!returnLockReason}
                        title={returnLockReason ? t(returnLockReason) : undefined}
                        className={`px-8 py-3 border-2 font-bold rounded-xl transition-colors ${
                            returnLockReason
                                ? 'bg-kitchen-card border-kitchen-gold-border-muted text-kitchen-text-muted opacity-60 cursor-not-allowed'
                                : 'bg-kitchen-success border-kitchen-success-border text-white shadow-[0_3px_0_rgba(96,160,112,0.5)] hover:brightness-95'
                        }`}
                    >
                        {t('回到餐厅')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WallPicker;
