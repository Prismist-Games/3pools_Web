import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * FrameSelector — displays 3 quality effects for the player to choose from.
 * Shape is always 2×2 (fixed), so only effect + cost are shown.
 *
 * Props:
 *   frames: array of 3 frame objects { qualityEffect, cost }
 *   selectedIndex: currently selected frame index (null if none)
 *   gold: current gold amount
 *   onSelect: (index) => void
 *   disabled: boolean
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
              relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
              min-w-[140px] max-w-[180px]
              ${isSelected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 scale-105'
                : canAfford
                  ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Effect name */}
            <span className="text-sm font-bold text-slate-800">
              {t(frame.qualityEffect.name)}
            </span>

            {/* Effect description */}
            <span className="text-[11px] text-slate-500 text-center leading-tight">
              {t(frame.qualityEffect.desc)}
            </span>

            {/* Cost */}
            <span className={`flex items-center gap-1 text-sm font-bold mt-1 ${
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
