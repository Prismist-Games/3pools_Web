import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    return (
        <div className="text-center py-8">
            <h2 className="text-xl font-bold mb-6">{t('选择下一面奖品墙')}</h2>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(idx)}
                        className="w-48 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                            hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                    >
                        <div className="text-sm font-bold mb-2">{t('奖品墙')} {idx + 1}</div>
                        <div className="flex gap-1 mb-2">
                            {wall.stickers.map(s => (
                                <span key={s.id} className="text-lg" title={s.name}>{s.icon}</span>
                            ))}
                        </div>
                        <div className="text-[11px] text-gray-500">
                            💀 {wall.doomCellCount.resolution + wall.doomCellCount.upgrade} {t('厄运格')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WallPicker;
