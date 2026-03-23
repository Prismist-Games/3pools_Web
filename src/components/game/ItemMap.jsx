import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 * FlyingItem — portal element that flies from source cell to inventory area.
 */
function FlyingItem({ icon, startRect }) {
  const [style, setStyle] = useState({
    position: 'fixed',
    left: startRect.left + startRect.width / 2,
    top: startRect.top + startRect.height / 2,
    transform: 'translate(-50%, -50%) scale(1.3)',
    opacity: 1,
    fontSize: '1.5rem',
    zIndex: 9999,
    pointerEvents: 'none',
    transition: 'all 500ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  });

  useEffect(() => {
    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight - 80;
    requestAnimationFrame(() => {
      setStyle(prev => ({
        ...prev,
        left: targetX,
        top: targetY,
        transform: 'translate(-50%, -50%) scale(0.6)',
        opacity: 0.3,
      }));
    });
  }, []);

  return createPortal(
    <div style={style}>{icon}</div>,
    document.body
  );
}

/**
 * drawAnimInfo phases:
 *   'highlight' — drawn cell glows, others unchanged
 *   'fly'       — drawn cell icon hidden (portal flies), others unchanged
 *   'exit'      — draw executes, other 3 cells fade out
 *   'enter'     — 4 new items scale in
 */
function ItemMap({ itemMap, hasSelectedEffect, drawAnimInfo, milestone, rarityConfig, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [flyingItem, setFlyingItem] = useState(null);
  const cellRefs = useRef({});

  const isAnimating = !!drawAnimInfo;

  // Launch flying item when entering 'fly' phase
  useEffect(() => {
    if (drawAnimInfo?.phase === 'fly' && drawAnimInfo.drawnKey) {
      const el = cellRefs.current[drawAnimInfo.drawnKey];
      if (el) {
        const rect = el.getBoundingClientRect();
        const [r, c] = drawAnimInfo.drawnKey.split(',').map(Number);
        const item = itemMap[r]?.[c];
        if (item) {
          setFlyingItem({ icon: item.icon, startRect: rect });
          setTimeout(() => setFlyingItem(null), 500);
        }
      }
    }
  }, [drawAnimInfo?.phase, drawAnimInfo?.drawnKey]);

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

  const phase = drawAnimInfo?.phase;
  const drawnKey = drawAnimInfo?.drawnKey;
  const coveredKeysAnim = drawAnimInfo?.coveredKeys;

  return (
    <>
      {flyingItem && <FlyingItem icon={flyingItem.icon} startRect={flyingItem.startRect} />}
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

          const isDrawn = drawnKey === cellKey;
          const isCoveredAnim = coveredKeysAnim?.has(cellKey);
          const isOther = isCoveredAnim && !isDrawn;

          // Per-phase cell states
          let bgClass = '';
          let iconClass = '';
          let textVisible = true;

          if (phase === 'highlight' && isDrawn) {
            // Phase 1: drawn cell glows big
            bgClass = 'bg-amber-100 border-amber-400 ring-2 ring-amber-400 scale-110 shadow-lg shadow-amber-200/60';
          } else if (phase === 'fly' && isDrawn) {
            // Phase 2: drawn cell icon hidden (portal handles it), cell stays amber
            bgClass = 'bg-amber-50 border-amber-300';
            iconClass = 'opacity-0';
            textVisible = false;
          } else if (phase === 'exit' && isDrawn) {
            // Phase 3: drawn cell fades
            bgClass = 'bg-slate-200 border-slate-300';
            iconClass = 'opacity-0';
            textVisible = false;
          } else if (phase === 'exit' && isOther) {
            // Phase 3: other 3 cells shrink and fade
            bgClass = 'bg-slate-200 border-slate-300';
            iconClass = 'scale-50 opacity-0';
            textVisible = false;
          } else if (phase === 'enter' && isCoveredAnim) {
            // Phase 4: new items scale in
            bgClass = 'bg-white border-slate-200';
            iconClass = 'animate-[scaleIn_0.3s_ease-out]';
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
              ref={el => { cellRefs.current[cellKey] = el; }}
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
              <span className={`text-xl leading-none transition-all duration-300 ${iconClass}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px] transition-all duration-300 ${
                textVisible ? '' : 'opacity-0'
              }`}>
                {t(item.name)}
              </span>
              {neededRarity && textVisible && (
                <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${RARITY_LABEL_COLOR[neededRarity]}`}>
                  {RARITY_LABEL[neededRarity]}+
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default React.memo(ItemMap);
