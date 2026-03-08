import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Timeline = ({ currentRound, demandSchedule, totalRounds = 18 }) => {
  const { t } = useLanguage();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-100 rounded-lg overflow-x-auto text-gray-700">
      <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">{t('回合')}:</span>
      {rounds.map(r => {
        const isCurrent = r === currentRound;
        const hasDemand = demandSchedule.includes(r);
        const isPast = r < currentRound;

        return (
          <div
            key={r}
            className={`w-7 h-7 flex flex-col items-center justify-center rounded text-xs font-medium transition-all ${
              isCurrent
                ? 'bg-blue-500 text-white scale-110 shadow'
                : isPast
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-white text-gray-700 border'
            }`}
            title={hasDemand ? `${t('回合')} ${r}: ${t('需求出现')}` : `${t('回合')} ${r}`}
          >
            <span>{r}</span>
            {hasDemand && (
              <div className={`w-1.5 h-1.5 rounded-full ${
                isPast ? 'bg-gray-400' : isCurrent ? 'bg-yellow-300' : 'bg-orange-400'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
