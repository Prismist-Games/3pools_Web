import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

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
                            onClick={() => onSelect(idx)}
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

                            <div className="text-[10px] text-red-500 font-bold">
                                🧑 {wall.doomCellCount.resolution} {t('抢菜人')}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WallPicker;
