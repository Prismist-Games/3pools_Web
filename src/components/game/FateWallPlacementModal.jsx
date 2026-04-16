// src/components/game/FateWallPlacementModal.jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CHARM_CONFIGS } from '../../data/charms';

export function FateWallPlacementModal({ pendingCharm, fateWallCells, onPlace, queueRemaining = 0 }) {
  const { t } = useLanguage();
  const charm = pendingCharm.charm;
  const cfg = CHARM_CONFIGS[charm.type];
  const totalToPlace = queueRemaining + 1;
  const isInitialSetup = totalToPlace > 1 || queueRemaining > 0;

  const canPlace = (index) => {
    const cell = fateWallCells[index];
    if (cell === null) return true;
    if (cell.isBlank) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-yellow-500 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-yellow-400 text-lg font-bold">{t('放置幸运符')}</h2>
          {isInitialSetup && (
            <span className="text-gray-400 text-sm">{queueRemaining} {t('个待放置')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <div className="text-white font-semibold">{t(cfg.name)}</div>
            <div className="text-gray-400 text-xs">{t('选择一个位置放置')}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {fateWallCells.map((cell, i) => {
            const placeable = canPlace(i);
            const cellCfg = cell ? CHARM_CONFIGS[cell.type] : null;
            return (
              <button
                key={i}
                onClick={() => placeable && onPlace(i)}
                disabled={!placeable}
                className={[
                  'h-14 rounded-lg border text-xs flex flex-col items-center justify-center transition-all',
                  placeable
                    ? 'border-yellow-500 bg-gray-700 hover:bg-yellow-900/40 cursor-pointer'
                    : 'border-gray-700 bg-gray-800 opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                {cell ? (
                  <span className="text-lg">{cellCfg?.icon ?? '?'}</span>
                ) : (
                  <span className="text-gray-600 text-lg">+</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-gray-500 text-xs text-center">{t('必须放置才能继续')}</p>
      </div>
    </div>
  );
}
