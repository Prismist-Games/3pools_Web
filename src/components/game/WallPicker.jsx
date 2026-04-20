import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-gray-400 mb-5">{t('每面墙只出现对应市场的食材')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(idx)}
                        className="w-52 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                            hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                    >
                        <div className="text-sm font-bold mb-1">{wall.wallType.icon} {t(wall.wallType.name)}</div>
                        <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{t(wall.wallType.desc)}</p>

                        <div className="text-[9px] text-gray-300 uppercase tracking-wide mb-1">{t('食材类型')}</div>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {wall.marketIngredients && wall.marketIngredients.slice(0, 8).map(ing => (
                                <div key={ing.id} className="w-7 h-7 rounded border border-gray-200 bg-white flex items-center justify-center text-sm shadow-sm" title={ing.name}>
                                    {ing.icon}
                                </div>
                            ))}
                            {wall.marketIngredients && wall.marketIngredients.length > 8 && (
                                <div className="w-7 h-7 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400">
                                    +{wall.marketIngredients.length - 8}
                                </div>
                            )}
                        </div>

                        <div className="text-[10px] text-red-500 font-bold">
                            💀 {wall.doomCellCount.resolution + wall.doomCellCount.upgrade} {t('厄运格')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WallPicker;
