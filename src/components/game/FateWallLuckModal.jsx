// src/components/game/FateWallLuckModal.jsx
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FateWall } from './FateWall';
import { CHARM_CONFIGS } from '../../data/charms';
import { getRowIndices, getColIndices, lineHasCharm } from '../../utils/fateWallHelpers';

export function FateWallLuckModal({ fateWallCells, onSelect, result, onConfirm }) {
  const { t } = useLanguage();
  const [hoveredLine, setHoveredLine] = useState(null);
  const [error, setError] = useState(null);

  const highlightIndices = (() => {
    if (result) return result.charmIndex !== undefined ? [result.charmIndex] : [];
    if (!hoveredLine) return [];
    return hoveredLine.direction === 'row'
      ? getRowIndices(hoveredLine.lineIndex)
      : getColIndices(hoveredLine.lineIndex);
  })();

  const handleLineClick = (direction, lineIndex) => {
    if (result) return;
    if (!lineHasCharm(fateWallCells, direction, lineIndex)) {
      setError(t('此行/列为空，请重选'));
      return;
    }
    setError(null);
    onSelect({ direction, lineIndex });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-purple-500 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-purple-400 text-lg font-bold mb-1">{t('幸运抽取')}</h2>
        <p className="text-gray-400 text-xs mb-4">{t('选择一行或一列进行幸运抽取')}</p>

        {/* Col buttons */}
        <div className="flex gap-1 mb-1 ml-7">
          {[0, 1, 2, 3].map(col => (
            <button
              key={col}
              onMouseEnter={() => setHoveredLine({ direction: 'col', lineIndex: col })}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() => handleLineClick('col', col)}
              disabled={!!result}
              className="w-14 h-7 text-xs bg-gray-700 hover:bg-purple-800 text-gray-300 rounded transition-colors"
            >
              {t('列')}{col + 1}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Row buttons */}
          <div className="flex flex-col gap-1">
            {[0, 1, 2, 3].map(row => (
              <button
                key={row}
                onMouseEnter={() => setHoveredLine({ direction: 'row', lineIndex: row })}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleLineClick('row', row)}
                disabled={!!result}
                className="w-6 h-14 text-[10px] bg-gray-700 hover:bg-purple-800 text-gray-300 rounded transition-colors flex items-center justify-center"
                style={{ writingMode: 'vertical-lr' }}
              >
                {t('行')}{row + 1}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <FateWall
              cells={fateWallCells}
              highlightIndices={highlightIndices}
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
        )}

        {result && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{CHARM_CONFIGS[result.charm.type]?.icon}</span>
              <span className="text-white text-sm font-semibold">
                {t(CHARM_CONFIGS[result.charm.type]?.name)}
              </span>
            </div>
            <p className="text-green-400 text-sm">{result.effectDescription}</p>
            <button
              onClick={onConfirm}
              className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-semibold"
            >
              {t('确认')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
