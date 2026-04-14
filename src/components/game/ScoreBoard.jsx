import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RARITY_STYLE } from './BulletinBoard';

const ScoreBoard = ({ expeditionNumber, expeditionScores, totalScore, victoryScore, bonusItems }) => {
    const { t, language } = useLanguage();
    return (
        <div className="bg-kitchen-card rounded-xl border-2 border-kitchen-gold-border shadow-[0_3px_0_#D4B896]">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-dashed border-kitchen-gold-border/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-kitchen-text-body">{t('今日食材')}</h3>
                <span className="text-[10px] text-kitchen-text-muted font-medium">{language === 'en' ? `Round ${expeditionNumber}` : `第 ${expeditionNumber} 场`}</span>
            </div>

            <div className="p-3">
                {/* Bonus items */}
                {bonusItems && bonusItems.length > 0 && (
                    <div className="mb-2.5 pb-2.5 border-b border-gray-100">
                        <div className="text-[9px] text-kitchen-text-muted uppercase tracking-wide mb-1.5">{t('额外加分')}</div>
                        <div className="flex gap-1.5">
                            {bonusItems.map((item, i) => {
                                const sc = RARITY_STYLE[item.rarity || item.score] || RARITY_STYLE[1];
                                return (
                                    <div key={i} className={`relative w-7 h-7 rounded border ${sc.border} bg-gradient-to-b ${sc.bg} flex items-center justify-center text-sm`}
                                        title={`${t(item.name)} (+${item.bonusValue || 2})`}>
                                        {item.icon}
                                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center">
                                            +{item.bonusValue || 2}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Per-expedition scores */}
                {expeditionScores.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2.5">
                        {expeditionScores.map((exp, i) => (
                            <div key={i} className="flex justify-between items-baseline">
                                <span className="text-[11px] text-kitchen-text-secondary">{language === 'en' ? `Round ${i + 1}` : `第 ${i + 1} 场`}</span>
                                <span className="text-xs font-bold text-kitchen-text-body">
                                    {exp.score}
                                    {exp.bonusScore > 0 && (
                                        <span className="text-kitchen-gold font-normal ml-0.5 text-[10px]">+{exp.bonusScore}</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Total */}
                <div className="pt-2 border-t border-kitchen-gold-border/30 flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-kitchen-text-secondary">{t('累计')}</span>
                    <span className={`text-base font-black ${totalScore >= victoryScore ? 'text-kitchen-success-border' : 'text-kitchen-text-body'}`}>
                        {totalScore}<span className="text-xs font-normal text-kitchen-text-muted">/{victoryScore}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ScoreBoard;
