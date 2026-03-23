import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement } from '../../utils/spatialPoolHelpers';
import { FIXED_SHAPE, MAP_ROWS, MAP_COLS } from '../../data/spatialConstants';

const RARITY_BG = {
  common: 'bg-slate-100 border-slate-300',
  uncommon: 'bg-green-50 border-green-300',
  rare: 'bg-blue-50 border-blue-300',
  epic: 'bg-purple-50 border-purple-300',
  legendary: 'bg-orange-50 border-orange-300',
  mythic: 'bg-rose-50 border-rose-300',
};

const RARITY_LABEL = {
  common: '普', uncommon: '优', rare: '稀',
  epic: '史', legendary: '传', mythic: '神',
};

const RARITY_LABEL_COLOR = {
  common: 'text-slate-400', uncommon: 'text-green-500', rare: 'text-blue-500',
  epic: 'text-purple-500', legendary: 'text-orange-500', mythic: 'text-rose-500',
};

// Animation duration constants (ms)
const DRAW_ANIM_DELAY = 350; // pulse before draw executes

function ItemMap({ itemMap, hasSelectedEffect, milestone, rarityConfig, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [drawingCells, setDrawingCells] = useState(null); // Set of "r,c" keys being animated

  const neededItems = useMemo(() => {
    if (!milestone || !rarityConfig) return new Map();
    const rarityOrder = rarityConfig.map(r => r.id);
    const needs = new Map();
    for (const cell of milestone.cells) {
      if (cell.filledItem) continue;
      const existing = needs.get(cell.itemName);
      if (!existing) {
        needs.set(cell.itemName, cell.requiredRarity);
      } else {
        const existingIdx = rarityOrder.indexOf(existing);
        const newIdx = rarityOrder.indexOf(cell.requiredRarity);
        if (newIdx > existingIdx) needs.set(cell.itemName, cell.requiredRarity);
      }
    }
    return needs;
  }, [milestone, rarityConfig]);

  const coveredCells = useMemo(() => {
    if (!hasSelectedEffect || !hoverAnchor || drawingCells) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(row, col)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of FIXED_SHAPE.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [hasSelectedEffect, hoverAnchor, drawingCells]);

  const isValidHover = useMemo(() => {
    if (!hasSelectedEffect || !hoverAnchor || drawingCells) return false;
    return isValidPlacement(hoverAnchor.row, hoverAnchor.col);
  }, [hasSelectedEffect, hoverAnchor, drawingCells]);

  const handleCellHover = useCallback((row, col) => {
    if (!hasSelectedEffect || disabled || drawingCells) return;
    setHoverAnchor({ row, col });
    if (isValidPlacement(row, col) && onHoverCoverage) {
      const names = FIXED_SHAPE.cells
        .map(([dr, dc]) => itemMap[row + dr]?.[col + dc]?.name)
        .filter(Boolean);
      onHoverCoverage(names);
    }
  }, [hasSelectedEffect, disabled, drawingCells, itemMap, onHoverCoverage]);

  const handleMouseLeave = useCallback(() => {
    if (!drawingCells) setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  }, [drawingCells, onHoverCoverage]);

  const handleCellClick = useCallback((row, col) => {
    if (!hasSelectedEffect || disabled || drawingCells) return;
    if (!isValidPlacement(row, col)) return;

    // Mark the covered cells as "drawing" for animation
    const cells = new Set();
    for (const [dr, dc] of FIXED_SHAPE.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    setDrawingCells(cells);
    setHoverAnchor(null);

    // After animation, execute the actual draw
    setTimeout(() => {
      onPlace(row, col);
      setDrawingCells(null);
    }, DRAW_ANIM_DELAY);
  }, [hasSelectedEffect, disabled, drawingCells, onPlace]);

  if (!itemMap) return null;

  return (
    <div
      className="inline-grid gap-1 p-2 bg-slate-100 rounded-lg border border-slate-200"
      style={{
        gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)`,
      }}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: MAP_ROWS * MAP_COLS }, (_, i) => {
        const row = Math.floor(i / MAP_COLS);
        const col = i % MAP_COLS;
        const item = itemMap[row][col];
        const isCovered = coveredCells.has(`${row},${col}`);
        const isDrawing = drawingCells && drawingCells.has(`${row},${col}`);
        const neededRarity = neededItems.get(item.name);

        let bgClass;
        if (isDrawing) {
          // Drawing animation: bright glow + scale up
          bgClass = 'bg-amber-100 border-amber-400 ring-2 ring-amber-300 scale-110 shadow-lg shadow-amber-200/50';
        } else if (isCovered && isValidHover) {
          bgClass = 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105';
        } else if (neededRarity) {
          bgClass = RARITY_BG[neededRarity] || 'bg-white border-slate-200';
        } else {
          bgClass = 'bg-white border-slate-200';
        }

        return (
          <div
            key={`${row}-${col}`}
            className={`
              relative flex flex-col items-center justify-center
              w-16 h-16 rounded-md border select-none
              transition-all duration-200
              ${bgClass}
              ${hasSelectedEffect && !disabled && !drawingCells ? 'cursor-crosshair' : 'cursor-default'}
            `}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          >
            <span className={`text-xl leading-none transition-all duration-300 ${
              isDrawing ? '-translate-y-3 scale-125 opacity-0' : ''
            }`}>
              {item.icon}
            </span>
            <span className={`text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px] transition-opacity duration-200 ${
              isDrawing ? 'opacity-0' : ''
            }`}>
              {t(item.name)}
            </span>
            {neededRarity && !isDrawing && (
              <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${RARITY_LABEL_COLOR[neededRarity]}`}>
                {RARITY_LABEL[neededRarity]}+
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ItemMap);
