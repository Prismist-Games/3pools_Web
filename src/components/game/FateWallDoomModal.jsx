// src/components/game/FateWallDoomModal.jsx
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FateWall } from './FateWall';
import { getRowIndices, getColIndices, isLineFullyProtected } from '../../utils/fateWallHelpers';

/**
 * FateWallDoomModal
 * Props:
 *   fateWallCells: Array(16) — current fate wall state
 *   doomIndex: number — current draw number (1-based)
 *   doomTotal: number — total draws this sequence
 *   onSelect: ({ direction: 'row'|'col', lineIndex: number }) => void
 *   result: null | { hitIndex: number | null, blocked: boolean, hpLoss: number }
 *   onConfirm: () => void
 */
export function FateWallDoomModal({
  fateWallCells, doomIndex, doomTotal, doomLevel, onSelect, result, onConfirm
}) {
  const { t } = useLanguage();
  const [hoveredLine, setHoveredLine] = useState(null);
  const [error, setError] = useState(null);

  const highlightIndices = (() => {
    if (result) return result.hitIndex !== null ? [result.hitIndex] : [];
    if (!hoveredLine) return [];
    return hoveredLine.direction === 'row'
      ? getRowIndices(hoveredLine.lineIndex)
      : getColIndices(hoveredLine.lineIndex);
  })();

  const handleLineClick = (direction, lineIndex) => {
    if (result) return;
    if (isLineFullyProtected(fateWallCells, direction, lineIndex)) {
      setError(t('此行/列被完全保护，请重选'));
      return;
    }
    setError(null);
    onSelect({ direction, lineIndex });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-red-600 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-red-400 text-lg font-bold mb-1">
          💀 {t('厄运抽取')} {doomIndex}/{doomTotal}
        </h2>
        <p className="text-gray-500 text-xs">{t('厄运等级')}: {doomLevel}</p>
        <p className="text-gray-400 text-xs mb-4">{t('选择一行或一列承受厄运')}</p>

        {/* Col buttons */}
        <div className="flex gap-1 mb-1 ml-7">
          {[0, 1, 2, 3].map(col => (
            <button
              key={col}
              onMouseEnter={() => setHoveredLine({ direction: 'col', lineIndex: col })}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() => handleLineClick('col', col)}
              disabled={!!result}
              className="w-14 h-7 text-xs bg-gray-700 hover:bg-red-900 text-gray-300 rounded transition-colors"
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
                className="w-6 h-14 text-[10px] bg-gray-700 hover:bg-red-900 text-gray-300 rounded transition-colors flex items-center justify-center"
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
            {result.blocked ? (
              <p className="text-green-400 text-sm font-semibold">🛡️ {t('幸运符吸收了厄运！')}</p>
            ) : (
              <p className="text-red-400 text-sm font-semibold">❤️ {t('HP')} -{result.hpLoss}</p>
            )}
            <button
              onClick={onConfirm}
              className="mt-3 w-full py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm font-semibold"
            >
              {t('确认')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
