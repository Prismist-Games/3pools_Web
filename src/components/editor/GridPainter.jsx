import React, { useState, useCallback } from 'react';
import { CELL_TYPES, LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { MATRIX_CONFIG } from '../../data/matrixConfig';

const CELL_DISPLAY = {
  empty: { icon: '⬜', bg: 'bg-gray-900/80', label: '空白格' },
  doom_resolve: { icon: '💀', bg: 'bg-red-900/60', label: '厄运结算' },
  doom_upgrade: { icon: '⬆️', bg: 'bg-red-700/60', label: '厄运升级' },
  any_doom: { icon: '💀?', bg: 'bg-red-800/40', label: '随机厄运' },
  bomb: { icon: '💣', bg: 'bg-orange-900/60', label: '炸弹' },
  gold: { icon: '💰', bg: 'bg-yellow-700/60', label: '金币' },
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

// Distinct colors for group borders
const GROUP_COLORS = [
  'border-rose-400',
  'border-sky-400',
  'border-amber-400',
  'border-lime-400',
  'border-violet-400',
  'border-teal-400',
  'border-orange-400',
  'border-pink-400',
];

function getCellType(cell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'string') return cell;
  return cell.type || null;
}

function getCellGroup(cell) {
  if (typeof cell === 'object' && cell !== null) return cell.group;
  return undefined;
}

/** Find the cell type already used in a group number (for same-type validation) */
function getGroupCellType(grid, groupNumber) {
  for (const row of grid) {
    for (const cell of row) {
      if (getCellGroup(cell) === groupNumber) return getCellType(cell);
    }
  }
  return null;
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

export default function GridPainter({ grid, onGridChange, activeBrush, brushExtras, groupMode, activeGroupNumber }) {
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

  const applyGroup = useCallback((r, c) => {
    const cell = grid[r][c];
    const type = getCellType(cell);
    // Empty and null cells can't be grouped
    if (!type || type === 'empty') return;

    // Validate same-type constraint within group
    const existingType = getGroupCellType(grid, activeGroupNumber);
    if (existingType && existingType !== type) return; // different type, reject

    const newGrid = grid.map(row => [...row]);
    const currentGroup = getCellGroup(cell);

    if (currentGroup === activeGroupNumber) {
      // Clicking same group = remove from group
      if (typeof cell === 'object') {
        const { group: _, ...rest } = cell;
        // If only type remains, simplify to string
        const keys = Object.keys(rest);
        newGrid[r][c] = keys.length === 1 && keys[0] === 'type' ? rest.type : rest;
      }
    } else {
      // Assign to active group
      if (typeof cell === 'string') {
        newGrid[r][c] = { type: cell, group: activeGroupNumber };
      } else {
        newGrid[r][c] = { ...cell, group: activeGroupNumber };
      }
    }
    onGridChange(newGrid);
  }, [grid, activeGroupNumber, onGridChange]);

  const handleMouseDown = (r, c, e) => {
    e.preventDefault();
    if (e.button === 2) {
      // Right-click: erase in paint mode, remove group in group mode
      if (groupMode) {
        const cell = grid[r][c];
        if (typeof cell === 'object' && cell?.group !== undefined) {
          const newGrid = grid.map(row => [...row]);
          const { group: _, ...rest } = cell;
          const keys = Object.keys(rest);
          newGrid[r][c] = keys.length === 1 && keys[0] === 'type' ? rest.type : rest;
          onGridChange(newGrid);
        }
      } else {
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = null;
        onGridChange(newGrid);
      }
    } else {
      setIsPainting(true);
      if (groupMode) {
        applyGroup(r, c);
      } else {
        applyBrush(r, c);
      }
    }
  };

  const handleMouseEnter = (r, c) => {
    if (!isPainting) return;
    if (groupMode) {
      applyGroup(r, c);
    } else {
      applyBrush(r, c);
    }
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
          const group = getCellGroup(cell);
          const groupColor = group !== undefined ? GROUP_COLORS[group % GROUP_COLORS.length] : null;

          return (
            <div
              key={`${r}-${c}`}
              className={`w-16 h-16 ${display.bg} rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative
                ${groupColor ? `border-2 ${groupColor}` : 'border border-gray-600'}
                ${groupMode && getCellType(cell) === 'any_sticker' ? 'ring-1 ring-white/20' : ''}`}
              onMouseDown={(e) => handleMouseDown(r, c, e)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              title={`[${r},${c}] ${display.label}${group !== undefined ? ` (组${group})` : ''}`}
            >
              <span className="text-xl">{display.icon}</span>
              {group !== undefined && (
                <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${groupColor ? groupColor.replace('border-', 'text-') : 'text-gray-400'}`}>
                  G{group}
                </span>
              )}
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
