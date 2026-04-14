import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import GameCard from '../ui/GameCard';

const ScoreBoard = ({ expeditionNumber, expeditionScores, bonusItems }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white rounded-lg shadow-sm border">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('收集')}</h3>
                <span className="text-[10px] text-gray-300 font-medium">{t('第')} {expeditionNumber} {t('场')}</span>
            </div>

            <div className="p-3">
                {/* Per-expedition results */}
                {expeditionScores.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2.5">
                        {expeditionScores.map((exp, i) => (
                            <div key={i} className="flex justify-between items-baseline">
                                <span className="text-[11px] text-gray-400">{t('第')} {i + 1} {t('场')}</span>
                                <span className="text-xs font-bold text-gray-600">
                                    {exp.items?.length || 0} {t('食材')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScoreBoard;
