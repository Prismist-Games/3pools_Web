import React from 'react';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const MINI_COLORS = {
  // Template token types
  doom_resolve: 'bg-red-700',
  doom_upgrade: 'bg-red-500',
  any_doom: 'bg-red-600',
  bomb: 'bg-orange-700',
  gold: 'bg-yellow-600',
  order: 'bg-blue-600',
  out_of_game: 'bg-purple-600',
  any_special: 'bg-gray-500',
  any_sticker: 'bg-green-600',
  sticker_A: 'bg-emerald-500',
  sticker_B: 'bg-cyan-500',
  sticker_C: 'bg-indigo-500',
  // Resolved cell types (from generateWallFromTemplate output)
  doom_resolution: 'bg-red-700',
  sticker: 'bg-green-600',
  item: 'bg-green-600',
  order_cell: 'bg-blue-600',
};

function getCellColor(cell) {
  if (!cell) return 'bg-gray-800/40';
  const type = typeof cell === 'string' ? cell : cell.type;
  return MINI_COLORS[type] || 'bg-gray-600';
}

export default function TemplatePreview({ grid, size = 'sm', label }) {
  const gridSize = MATRIX_CONFIG.gridSize;
  const cellPx = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="inline-grid gap-px"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const hasMultiplier = typeof cell === 'object' && cell?.multiplier;
            return (
              <div
                key={`${r}-${c}`}
                className={`${cellPx} ${getCellColor(cell)} rounded-sm relative`}
              >
                {hasMultiplier && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-yellow-300">
                    x{cell.multiplier}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
}
