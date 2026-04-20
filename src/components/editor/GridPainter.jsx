import React, { useState, useCallback } from 'react';
import { CELL_TYPES, LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const CELL_DISPLAY = {
  empty: { icon: '⬜', bg: 'bg-gray-900/80', label: '空白格' },
  doom_resolve: { icon: '💀', bg: 'bg-red-900/60', label: '厄运结算' },
  any_doom: { icon: '💀?', bg: 'bg-red-800/40', label: '随机厄运' },
  bomb: { icon: '💣', bg: 'bg-orange-900/60', label: '炸弹' },
  gold: { icon: '🎫', bg: 'bg-yellow-700/60', label: '抽数' },
  order: { icon: '📋', bg: 'bg-blue-700/60', label: '订单' },
  out_of_game: { icon: '🎁', bg: 'bg-purple-700/60', label: '出口物品' },
  out_of_game_1: { icon: '🧸', bg: 'bg-green-700/60', label: '1分物品' },
  out_of_game_2: { icon: '⌚', bg: 'bg-blue-700/60', label: '2分物品' },
  out_of_game_3: { icon: '💻', bg: 'bg-purple-700/60', label: '3分物品' },
  out_of_game_5: { icon: '🚗', bg: 'bg-orange-700/60', label: '5分物品' },
  any_special: { icon: '❓', bg: 'bg-gray-600/60', label: '随机特殊' },
  heal: { icon: '❤️‍🩹', bg: 'bg-pink-700/60', label: '生命恢复' },
  backpack_expand: { icon: '🎒', bg: 'bg-amber-700/60', label: '菜篮扩容' },
  gravity: { icon: '⬇️', bg: 'bg-sky-700/60', label: '重力开关' },
  any_sticker: { icon: '🏷️', bg: 'bg-green-700/40', label: '贴纸' },
};

function getCellType(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') return cell;
  return cell.type || null;
}

function getCellDisplay(cell) {
  const type = getCellType(cell);
  if (!type) return { icon: '🎲', bg: 'bg-gray-800/30', label: '随机填充' };
  if (type.startsWith('entrance:')) {
    const subId = type.replace('entrance:', '');
    const subLevel = LEVEL_TEMPLATES.find(t => t.id === subId);
    return { icon: subLevel?.icon || '🚪', bg: 'bg-teal-800/60', label: `入口: ${subLevel?.name || subId}` };
  }
  return CELL_DISPLAY[type] || { icon: '?', bg: 'bg-gray-500/60', label: type };
}

export default function GridPainter({ grid, onGridChange, activeBrush, brushExtras }) {
  const [isPainting, setIsPainting] = useState(false);
  const gridSize = MATRIX_CONFIG.gridSize;

  const applyBrush = useCallback((r, c) => {
    const newGrid = grid.map(row => [...row]);
    if (activeBrush === null) {
      newGrid[r][c] = null;
    } else if (brushExtras && Object.keys(brushExtras).length > 0) {
      newGrid[r][c] = { type: activeBrush, ...brushExtras };
    } else {
      newGrid[r][c] = activeBrush;
    }
    onGridChange(newGrid);
  }, [grid, activeBrush, brushExtras, onGridChange]);

  const handleMouseDown = (r, c, e) => {
    e.preventDefault();
    if (e.button === 2) {
      // Right-click: erase
      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = null;
      onGridChange(newGrid);
    } else {
      setIsPainting(true);
      applyBrush(r, c);
    }
  };

  const handleMouseEnter = (r, c) => {
    if (!isPainting) return;
    applyBrush(r, c);
  };

  const handleMouseUp = () => setIsPainting(false);

  return (
    <div
      className="inline-grid gap-1 select-none"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const display = getCellDisplay(cell);
          const hasMultiplier = typeof cell === 'object' && cell?.multiplier;

          return (
            <div
              key={`${r}-${c}`}
              className={`w-16 h-16 ${display.bg} rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative border border-gray-600`}
              onMouseDown={(e) => handleMouseDown(r, c, e)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              title={`[${r},${c}] ${display.label}`}
            >
              <span className="text-xl">{display.icon}</span>
              {hasMultiplier && (
                <span className="absolute bottom-0.5 right-1 text-xs font-bold text-yellow-300">
                  x{cell.multiplier}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
