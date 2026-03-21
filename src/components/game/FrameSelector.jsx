import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Renders a mini-preview of a shape's geometry.
 * Shows a small grid with filled cells matching the shape.
 */
function ShapePreview({ cells }) {
  const maxR = Math.max(...cells.map(([r]) => r)) + 1;
  const maxC = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  return (
    <div
      className="inline-grid gap-0.5"
      style={{
        gridTemplateRows: `repeat(${maxR}, 1rem)`,
        gridTemplateColumns: `repeat(${maxC}, 1rem)`,
      }}
    >
      {Array.from({ length: maxR * maxC }, (_, i) => {
        const r = Math.floor(i / maxC);
        const c = i % maxC;
        const filled = cellSet.has(`${r},${c}`);
        return (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${
              filled ? 'bg-indigo-400' : 'bg-slate-100'
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * FrameSelector — displays 3 available frames for the player to choose from.
 *
 * Props:
 *   frames: array of 3 frame objects { shape, qualityEffect, cost }
 *   selectedIndex: currently selected frame index (null if none)
 *   gold: current gold amount
 *   onSelect: (index) => void
 *   disabled: boolean — block interaction during pending/modes
 */
function FrameSelector({ frames, selectedIndex, gold, onSelect, disabled }) {
  const { t } = useLanguage();

  if (!frames || frames.length === 0) return null;

  return (
    <div className="flex gap-2 justify-center">
      {frames.map((frame, index) => {
        const canAfford = gold >= frame.cost;
        const isSelected = selectedIndex === index;

        return (
          <button
            key={index}
            onClick={() => !disabled && canAfford && onSelect(index)}
            disabled={disabled || !canAfford}
            className={`
              relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all
              min-w-[120px]
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 scale-105'
                : canAfford
                  ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Shape preview */}
            <ShapePreview cells={frame.shape.cells} />

            {/* Quality effect name */}
            <span className="text-sm font-medium text-slate-700">
              {t(frame.qualityEffect.name)}
            </span>

            {/* Cost */}
            <span className={`flex items-center gap-1 text-sm font-bold ${
              canAfford ? 'text-amber-600' : 'text-red-400'
            }`}>
              <Coins size={14} />
              {frame.cost}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(FrameSelector);
