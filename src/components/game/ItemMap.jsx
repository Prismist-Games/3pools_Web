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

/**
 * Props:
 *   itemMap, hasSelectedEffect, drawAnimInfo, milestone, rarityConfig,
 *   onPlace, onHoverCoverage, disabled
 *
 * drawAnimInfo: { drawnKey, coveredKeys, phase } from useGameLogic
 *   phase 'fly': drawn item flies down, others shrink/fade
 *   phase 'enter': new items scale up into place
 */
function ItemMap({ itemMap, hasSelectedEffect, drawAnimInfo, milestone, rarityConfig, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);

  const isAnimating = !!drawAnimInfo;

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
    if (!hasSelectedEffect || !hoverAnchor || isAnimating) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(row, col)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of FIXED_SHAPE.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [hasSelectedEffect, hoverAnchor, isAnimating]);

  const isValidHover = useMemo(() => {
    if (!hasSelectedEffect || !hoverAnchor || isAnimating) return false;
    return isValidPlacement(hoverAnchor.row, hoverAnchor.col);
  }, [hasSelectedEffect, hoverAnchor, isAnimating]);

  const handleCellHover = useCallback((row, col) => {
    if (!hasSelectedEffect || disabled || isAnimating) return;
    setHoverAnchor({ row, col });
    if (isValidPlacement(row, col) && onHoverCoverage) {
      const names = FIXED_SHAPE.cells
        .map(([dr, dc]) => itemMap[row + dr]?.[col + dc]?.name)
        .filter(Boolean);
      onHoverCoverage(names);
    }
  }, [hasSelectedEffect, disabled, isAnimating, itemMap, onHoverCoverage]);

  const handleMouseLeave = useCallback(() => {
    if (!isAnimating) setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  }, [isAnimating, onHoverCoverage]);

  const handleCellClick = useCallback((row, col) => {
    if (!hasSelectedEffect || disabled || isAnimating) return;
    if (!isValidPlacement(row, col)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  }, [hasSelectedEffect, disabled, isAnimating, onPlace]);

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
        const cellKey = `${row},${col}`;
        const isCovered = coveredCells.has(cellKey);
        const neededRarity = neededItems.get(item.name);

        // Animation states
        const isDrawnCell = drawAnimInfo?.phase === 'fly' && drawAnimInfo.drawnKey === cellKey;
        const isExitCell = drawAnimInfo?.phase === 'fly' && !isDrawnCell && drawAnimInfo.coveredKeys.has(cellKey);
        const isEnterCell = drawAnimInfo?.phase === 'enter' && drawAnimInfo.coveredKeys.has(cellKey);

        // Background
        let bgClass;
        if (isDrawnCell) {
          bgClass = 'bg-amber-100 border-amber-400 ring-2 ring-amber-300';
        } else if (isExitCell) {
          bgClass = 'bg-slate-200 border-slate-300';
        } else if (isCovered && isValidHover) {
          bgClass = 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105';
        } else if (neededRarity) {
          bgClass = RARITY_BG[neededRarity] || 'bg-white border-slate-200';
        } else {
          bgClass = 'bg-white border-slate-200';
        }

        // Icon animation classes
        let iconAnim = '';
        if (isDrawnCell) {
          // Fly downward toward inventory
          iconAnim = 'translate-y-10 scale-150 opacity-0';
        } else if (isExitCell) {
          // Shrink and fade
          iconAnim = 'scale-50 opacity-0';
        } else if (isEnterCell) {
          // Scale up from nothing (entry animation)
          iconAnim = 'animate-[scaleIn_0.3s_ease-out]';
        }

        return (
          <div
            key={`${row}-${col}`}
            className={`
              relative flex flex-col items-center justify-center
              w-16 h-16 rounded-md border select-none
              transition-all duration-300
              ${bgClass}
              ${hasSelectedEffect && !disabled && !isAnimating ? 'cursor-crosshair' : 'cursor-default'}
            `}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          >
            <span className={`text-xl leading-none transition-all duration-400 ${iconAnim}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px] transition-all duration-300 ${
              isDrawnCell || isExitCell ? 'opacity-0' : ''
            }`}>
              {t(item.name)}
            </span>
            {neededRarity && !isDrawnCell && !isExitCell && (
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
