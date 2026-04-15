import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * WallPicker — 3-of-1 picker shown in wall_choice phase.
 *
 * Each candidate carries { stickers, grid, wallType }. We render the
 * wallType metadata (icon, name, desc) plus the sticker row so the
 * player can judge both the rule variant and the sticker palette.
 */
const WallPicker = ({ candidates, onSelect }) => {
    const { t } = useLanguage();

    if (!candidates || candidates.length === 0) return null;

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-gray-400 mb-5">{t('每面墙有不同的规则和贴纸')}</p>
            <div className="flex gap-4 justify-center">
                {candidates.map((wall, idx) => (
                    <button
                        key={wall.uid ?? idx}
                        onClick={() => onSelect(idx)}
                        className="w-52 p-4 bg-white rounded-xl shadow-md border-2 border-gray-200
                            hover:border-blue-400 hover:shadow-lg transition-all duration-150 text-left"
                    >
                        <div className="text-sm font-bold mb-1">
                            {wall.wallType.icon} {t(wall.wallType.name)}
                        </div>
                        <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                            {t(wall.wallType.desc)}
                        </p>

                        {(() => {
                            const dangerCount = wall.grid.flat().filter(c => c?.type === 'danger_cell').length;
                            return dangerCount > 0 ? (
                                <div className="text-[10px] text-orange-400 mb-2">
                                    ⚠️ {dangerCount} {t('危险格')}
                                </div>
                            ) : null;
                        })()}

                        <div className="text-[9px] text-gray-300 uppercase tracking-wide mb-1">
                            {t('贴纸')}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            {wall.stickers.map(s => (
                                <div
                                    key={s.id}
                                    className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-base shadow-sm"
                                    title={t(s.name)}
                                >
                                    {s.icon}
                                </div>
                            ))}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WallPicker;
