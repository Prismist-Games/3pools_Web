import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Timeline = ({ currentRound, demandSchedule, prosperityMilestones, currentProsperity, prosperityTarget, totalRounds = 18 }) => {
  const { t } = useLanguage();
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-1">
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

      {prosperityMilestones && prosperityTarget > 0 && (
        <div className="flex items-center gap-1 px-2">
          <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">{t('繁荣')}:</span>
          <div className="flex-1 h-4 bg-gray-200 rounded relative">
            <div className="h-full bg-emerald-400 rounded transition-all"
                 style={{ width: `${Math.min(100, (currentProsperity / prosperityTarget) * 100)}%` }} />
            {prosperityMilestones.map(m => (
              <div key={m} className="absolute top-0 h-full w-0.5 bg-emerald-700 opacity-60"
                   style={{ left: `${(m / prosperityTarget) * 100}%` }}
                   title={`${t('繁荣')} ${m}: ${t('建筑抽选')}`} />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">{currentProsperity}/{prosperityTarget}</span>
        </div>
      )}
    </div>
  );
};
