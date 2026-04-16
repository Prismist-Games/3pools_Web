// src/components/game/FateWall.jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CHARM_CONFIGS, getCharmDescription } from '../../data/charms';

function CharmCell({ charm, highlight }) {
  const { t } = useLanguage();
  const cfg = CHARM_CONFIGS[charm.type];
  return (
    <div
      title={getCharmDescription(charm)}
      className={[
        'relative w-full h-full flex flex-col items-center justify-center rounded',
        charm.isBlank
          ? 'bg-gray-700 border border-gray-600'
          : 'bg-gray-800 border border-gray-500',
        highlight ? 'ring-2 ring-yellow-400' : '',
        !cfg.isPersistent ? 'border-yellow-600 shadow-inner shadow-yellow-900/50' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="text-lg leading-none">{cfg.icon}</span>
      <span className="text-[9px] text-gray-400 leading-tight mt-0.5 text-center px-0.5 truncate max-w-full">
        {t(cfg.name)}
      </span>
      {charm.growthCount > 0 && (
        <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-blue-500 text-white">
          {charm.growthCount}
        </span>
      )}
      {charm.usesLeft !== undefined && (
        <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-orange-500 text-white">
          {charm.usesLeft}
        </span>
      )}
    </div>
  );
}

export function FateWall({ cells, highlightIndices = [], onCellClick, label }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="text-xs text-gray-400 font-semibold text-center">{t(label)}</div>
      )}
      <div className="grid grid-cols-4 gap-1">
        {cells.map((cell, i) => (
          <button
            key={i}
            onClick={() => onCellClick?.(i)}
            className={[
              'relative h-14 w-full rounded transition-all',
              cell ? '' : 'bg-gray-800 border border-dashed border-gray-700',
              onCellClick && cell ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
            ].filter(Boolean).join(' ')}
          >
            {cell ? (
              <CharmCell charm={cell} highlight={highlightIndices.includes(i)} />
            ) : (
              <span className="text-gray-700 text-xs">{i + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
