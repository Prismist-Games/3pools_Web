import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement } from '../../utils/spatialPoolHelpers';
import { FIXED_SHAPE, MAP_ROWS, MAP_COLS, EFFECT_ITEM_ICONS } from '../../data/spatialConstants';

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
function ItemMap({ itemMap, drawAnimInfo, milestone, rarityConfig, onPlace, onHoverCoverage, disabled, activeEffect }) {
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
        const cell = itemMap[r]?.[c];
        if (cell && !cell.isEffect) {
          setFlyingItem({ icon: cell.icon, startRect: rect });
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

  const isTargetedMode = activeEffect?.effectId === 'targeted';

  const coveredCells = useMemo(() => {
    if (!hoverAnchor || isAnimating) return new Set();
    const { row, col } = hoverAnchor;
    if (isTargetedMode) {
      return new Set([`${row},${col}`]);
    }
    if (!isValidPlacement(row, col)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of FIXED_SHAPE.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [hoverAnchor, isAnimating, isTargetedMode]);

  const isValidHover = useMemo(() => {
    if (!hoverAnchor || isAnimating) return false;
    if (isTargetedMode) return true;
    return isValidPlacement(hoverAnchor.row, hoverAnchor.col);
  }, [hoverAnchor, isAnimating, isTargetedMode]);

  const handleCellHover = useCallback((row, col) => {
    if (disabled || isAnimating) return;
    setHoverAnchor({ row, col });
    if (isTargetedMode) {
      const cell = itemMap[row]?.[col];
      if (onHoverCoverage) onHoverCoverage(cell && !cell.isEffect ? [cell.name] : []);
      return;
    }
    if (isValidPlacement(row, col) && onHoverCoverage) {
      const names = FIXED_SHAPE.cells
        .map(([dr, dc]) => {
          const cell = itemMap[row + dr]?.[col + dc];
          return cell && !cell.isEffect ? cell.name : null;
        })
        .filter(Boolean);
      onHoverCoverage(names);
    }
  }, [disabled, isAnimating, itemMap, onHoverCoverage, isTargetedMode]);

  const handleMouseLeave = useCallback(() => {
    if (!isAnimating) setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  }, [isAnimating, onHoverCoverage]);

  const handleCellClick = useCallback((row, col) => {
    if (disabled || isAnimating) return;
    if (!isTargetedMode && !isValidPlacement(row, col)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  }, [disabled, isAnimating, onPlace, isTargetedMode]);

  if (!itemMap) return null;

  const phase = drawAnimInfo?.phase;
  const drawnKey = drawAnimInfo?.drawnKey;
  const coveredKeysAnim = drawAnimInfo?.coveredKeys;

  return (
    <>
      {flyingItem && <FlyingItem icon={flyingItem.icon} startRect={flyingItem.startRect} />}
      <div
        className="relative inline-grid gap-1 p-2 bg-slate-100 rounded-lg border border-slate-200"
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
          const isEffectCell = item.isEffect;
          const cellKey = `${row},${col}`;
          const isCovered = coveredCells.has(cellKey);

          // For effect cells, no rarity highlighting from orders
          const neededRarity = isEffectCell ? null : neededItems.get(item.name);

          const isDrawn = drawnKey === cellKey;
          const isCoveredAnim = coveredKeysAnim?.has(cellKey);
          const isOther = isCoveredAnim && !isDrawn;

          // Per-phase cell states
          let bgClass = '';
          let iconClass = '';
          let textVisible = true;

          if (isEffectCell && (phase === 'exit' || phase === 'enter') && isCoveredAnim) {
            // Effect cell stays visible and stable during animation
            bgClass = 'bg-white border-slate-200';
            iconClass = '';
            textVisible = true;
          } else if (phase === 'highlight' && isDrawn) {
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
            bgClass = isEffectCell
              ? 'bg-slate-100 border-indigo-400 ring-2 ring-indigo-300 scale-105'
              : item.isFateDice
                ? 'bg-indigo-200 border-indigo-400 ring-2 ring-indigo-300 scale-105'
                : 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105';
          } else if (isEffectCell) {
            bgClass = 'bg-white border-slate-200';
          } else if (item.isFateDice) {
            bgClass = 'bg-gradient-to-br from-indigo-100 to-violet-100 border-indigo-300';
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
                ${!disabled && !isAnimating ? 'cursor-crosshair' : 'cursor-default'}
              `}
              onMouseEnter={() => handleCellHover(row, col)}
              onClick={() => handleCellClick(row, col)}
            >
              {isEffectCell ? (
                <>
                  <span className={`text-xl leading-none transition-all duration-300 ${iconClass}`}>
                    {EFFECT_ITEM_ICONS[item.effect.id] || '✨'}
                  </span>
                  <span className={`text-[10px] font-bold text-slate-600 mt-0.5 truncate max-w-[56px] transition-all duration-300 ${
                    textVisible ? '' : 'opacity-0'
                  }`}>
                    {t(item.effect.name)}
                  </span>
                </>
              ) : item.isFateDice ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <span className={`text-xl lg:text-2xl filter drop-shadow-sm transition-all duration-300 ${iconClass}`}>
                    {item.icon}
                  </span>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          );
        })}
      </div>
      {isValidHover && hoverAnchor && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-bold text-amber-600 bg-white border border-amber-300 rounded px-1.5 py-0.5 shadow-sm pointer-events-none z-10">
          <Coins size={12} />1
        </div>
      )}
    </>
  );
}

export default React.memo(ItemMap);
