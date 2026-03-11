import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Timeline = ({ currentRound, prosperityMilestones, currentProsperity, prosperityTarget }) => {
  const { t } = useLanguage();
  const totalRounds = Math.max(20, currentRound + 5);
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-100 rounded-lg text-gray-700">
        <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">{t('回合')}:</span>
        {rounds.map(r => {
          const isCurrent = r === currentRound;
          const isPast = r < currentRound;

          return (
            <div key={r} className="flex-1 min-w-0 flex flex-col items-center gap-0">
              <div
                className={`w-full aspect-square max-w-7 flex items-center justify-center rounded text-[10px] font-medium transition-all ${
                  isCurrent
                    ? 'bg-blue-500 text-white scale-110 shadow'
                    : isPast
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-white text-gray-700 border'
                }`}
                title={`${t('回合')} ${r}`}
              >
                <span>{r}</span>
              </div>
            </div>
          );
        })}
      </div>

      {prosperityMilestones && prosperityTarget > 0 && (
        <div className="flex items-center gap-1 px-2">
          <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">{t('繁荣')}: <span className="font-mono font-bold text-emerald-400">{currentProsperity}</span>/{prosperityTarget}</span>
          <div className="flex-1 relative" style={{ height: '36px' }}>
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gray-200 rounded">
              <div className="h-full bg-emerald-400 rounded transition-all"
                   style={{ width: `${Math.min(100, (currentProsperity / prosperityTarget) * 100)}%` }} />
            </div>
            {/* Milestone markers with labels */}
            {prosperityMilestones.map((m, i) => {
              const reached = currentProsperity >= m;
              return (
                <div key={m} className="absolute flex flex-col items-center"
                     style={{ left: `${(m / prosperityTarget) * 100}%`, top: 0, transform: 'translateX(-50%)' }}>
                  <div className={`w-0.5 h-4 ${reached ? 'bg-emerald-700' : 'bg-gray-400'}`} />
                  <div className={`flex flex-col items-center mt-0.5 cursor-default ${reached ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <span className={`text-[9px] leading-none ${reached ? 'font-bold' : ''}`}>{m}</span>
                    <span className="text-[8px] leading-none mt-px">{t('抽建筑')}</span>
                  </div>
                </div>
              );
            })}
            {/* Target marker */}
            <div className="absolute flex flex-col items-center"
                 style={{ left: '100%', top: 0, transform: 'translateX(-50%)' }}>
              <div className="w-0.5 h-4 bg-yellow-500" />
              <div className="flex flex-col items-center mt-0.5 cursor-default text-yellow-600 font-bold">
                <span className="text-[9px] leading-none">{prosperityTarget}</span>
                <span className="text-[8px] leading-none mt-px">{t('胜利')}</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-emerald-400 ml-2 font-mono whitespace-nowrap">{currentProsperity}</span>
        </div>
      )}
    </div>
  );
};
