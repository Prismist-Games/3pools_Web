import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement } from '../../utils/spatialPoolHelpers';
import { MAP_ROWS, MAP_COLS } from '../../data/spatialConstants';

// Rarity background tints for needed-item highlighting (subtle, not full rarity colors)
const RARITY_BG = {
  common: 'bg-slate-100 border-slate-300',
  uncommon: 'bg-green-50 border-green-300',
  rare: 'bg-blue-50 border-blue-300',
  epic: 'bg-purple-50 border-purple-300',
  legendary: 'bg-orange-50 border-orange-300',
  mythic: 'bg-rose-50 border-rose-300',
};

const RARITY_LABEL = {
  common: '普',
  uncommon: '优',
  rare: '稀',
  epic: '史',
  legendary: '传',
  mythic: '神',
};

const RARITY_LABEL_COLOR = {
  common: 'text-slate-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-orange-500',
  mythic: 'text-rose-500',
};

/**
 * ItemMap — renders the 5×4 item grid and handles frame placement interaction.
 *
 * Props:
 *   itemMap, selectedFrame, closureMask, onPlace, onHoverCoverage, disabled
 *   milestone: milestone object with cells array (for needed-item highlighting)
 *   rarityConfig: array of rarity objects from config
 */
function ItemMap({ itemMap, selectedFrame, closureMask, milestone, rarityConfig, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);

  // Compute needed items from milestone (unfilled cells)
  // Map: itemName -> highest requiredRarity ID needed
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
        // Keep the highest required rarity
        const existingIdx = rarityOrder.indexOf(existing);
        const newIdx = rarityOrder.indexOf(cell.requiredRarity);
        if (newIdx > existingIdx) {
          needs.set(cell.itemName, cell.requiredRarity);
        }
      }
    }
    return needs;
  }, [milestone, rarityConfig]);

  const coveredCells = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(selectedFrame.shape, row, col, closureMask)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of selectedFrame.shape.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [selectedFrame, hoverAnchor, closureMask]);

  const isValidHover = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return false;
    return isValidPlacement(selectedFrame.shape, hoverAnchor.row, hoverAnchor.col, closureMask);
  }, [selectedFrame, hoverAnchor, closureMask]);

  const handleCellHover = (row, col) => {
    if (!selectedFrame || disabled) return;
    setHoverAnchor({ row, col });
    if (isValidPlacement(selectedFrame.shape, row, col, closureMask) && onHoverCoverage) {
      const names = selectedFrame.shape.cells
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
    if (!selectedFrame || disabled) return;
    if (!isValidPlacement(selectedFrame.shape, row, col, closureMask)) return;
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
        const isClosed = closureMask && closureMask.has(`${row},${col}`);
        const isCovered = coveredCells.has(`${row},${col}`);
        const neededRarity = neededItems.get(item.name);

        if (isClosed) {
          return (
            <div
              key={`${row}-${col}`}
              className="w-16 h-16 rounded-md bg-slate-200/60 border border-slate-200/40"
            />
          );
        }

        // Determine background: coverage highlight > needed highlight > default
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
              ${selectedFrame && !disabled ? 'cursor-crosshair' : ''}
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
