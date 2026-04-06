import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ScoreBoard = ({ expeditionNumber, expeditionScores, totalScore, victoryScore }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('得分')} — {t('探险')} {expeditionNumber}/3</h3>
            {expeditionScores.length > 0 && (
                <div className="flex flex-col gap-1 text-xs mb-2">
                    {expeditionScores.map((score, i) => (
                        <div key={i} className="flex justify-between">
                            <span>{t('探险')} {i + 1}</span>
                            <span className="font-bold">{score} {t('分')}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
                <span>{t('累计')}</span>
                <span className={totalScore >= victoryScore ? 'text-green-600' : ''}>{totalScore}/{victoryScore}</span>
            </div>
        </div>
    );
};

export default ScoreBoard;
