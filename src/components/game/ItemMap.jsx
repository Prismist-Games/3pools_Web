import React, { useState, useMemo } from 'react';
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

/**
 * ItemMap — 5×4 item grid with fixed 2×2 placement.
 *
 * Props:
 *   itemMap: 2D array [row][col]
 *   hasSelectedEffect: boolean — whether a quality effect is selected
 *   milestone, rarityConfig: for needed-item highlighting
 *   onPlace: (anchorRow, anchorCol) => void
 *   onHoverCoverage: (itemNames[]) => void
 *   disabled: boolean
 */
function ItemMap({ itemMap, hasSelectedEffect, milestone, rarityConfig, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);

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
    if (!hasSelectedEffect || !hoverAnchor) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(row, col)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of FIXED_SHAPE.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [hasSelectedEffect, hoverAnchor]);

  const isValidHover = useMemo(() => {
    if (!hasSelectedEffect || !hoverAnchor) return false;
    return isValidPlacement(hoverAnchor.row, hoverAnchor.col);
  }, [hasSelectedEffect, hoverAnchor]);

  const handleCellHover = (row, col) => {
    if (!hasSelectedEffect || disabled) return;
    setHoverAnchor({ row, col });
    if (isValidPlacement(row, col) && onHoverCoverage) {
      const names = FIXED_SHAPE.cells
        .map(([dr, dc]) => itemMap[row + dr]?.[col + dc]?.name)
        .filter(Boolean);
      onHoverCoverage(names);
    }
  };

  const handleMouseLeave = () => {
    setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  };

  const handleCellClick = (row, col) => {
    if (!hasSelectedEffect || disabled) return;
    if (!isValidPlacement(row, col)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  };

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
        const neededRarity = neededItems.get(item.name);

        let bgClass;
        if (isCovered && isValidHover) {
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
              w-16 h-16 rounded-md border transition-all cursor-default select-none
              ${bgClass}
              ${hasSelectedEffect && !disabled ? 'cursor-crosshair' : ''}
            `}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px]">
              {t(item.name)}
            </span>
            {neededRarity && (
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
