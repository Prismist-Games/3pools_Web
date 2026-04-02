import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement, computeClusterSizes, getDrawCost } from '../../utils/spatialPoolHelpers';
import { FIXED_SHAPE, MAP_ROWS, MAP_COLS, EFFECT_ITEM_ICONS } from '../../data/spatialConstants';

const RARITY_BG = {
  common: 'bg-slate-100 border-slate-300',
  uncommon: 'bg-green-50 border-green-300',
  rare: 'bg-blue-50 border-blue-300',
  epic: 'bg-purple-50 border-purple-300',
  legendary: 'bg-orange-50 border-orange-300',
  mythic: 'bg-rose-50 border-rose-300',
};

const RARITY_DOT_COLOR = {
  common: 'bg-slate-400', uncommon: 'bg-green-500', rare: 'bg-blue-500',
  epic: 'bg-purple-500', legendary: 'bg-orange-500', mythic: 'bg-rose-500',
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
 *   'exit'      — draw executes, covered cells fade out
 *   'enter'     — covered cells refresh with new items scale in
 */
function ItemMap({ itemMap, drawAnimInfo, milestone, rarityConfig, onPlace, onHoverCoverage, disabled, activeEffect, avatarPos }) {
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

  // Covered cells for hover preview
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

  // Cost for the hovered position
  const hoverCost = useMemo(() => {
    if (!isValidHover || !avatarPos || !hoverAnchor || isTargetedMode) return null;
    return getDrawCost(avatarPos.row, avatarPos.col, hoverAnchor.row, hoverAnchor.col);
  }, [isValidHover, avatarPos, hoverAnchor, isTargetedMode]);

  // Free selection: hovered cell = top-left anchor of 2×2
  const handleCellHover = useCallback((row, col) => {
    if (disabled || isAnimating) return;

    if (isTargetedMode) {
      setHoverAnchor({ row, col });
      const cell = itemMap[row]?.[col];
      if (onHoverCoverage) onHoverCoverage(cell && !cell.isEffect && !cell.isEvacuation ? [cell.name] : []);
      return;
    }

    // Use hovered cell as anchor if it makes a valid 2×2 placement
    if (isValidPlacement(row, col)) {
      setHoverAnchor({ row, col });
      if (onHoverCoverage) {
        const names = FIXED_SHAPE.cells
          .map(([dr, dc]) => {
            const cell = itemMap[row + dr]?.[col + dc];
            return cell && !cell.isEffect && !cell.isEvacuation ? cell.name : null;
          })
          .filter(Boolean);
        onHoverCoverage(names);
      }
    } else {
      setHoverAnchor(null);
      if (onHoverCoverage) onHoverCoverage([]);
    }
  }, [disabled, isAnimating, itemMap, onHoverCoverage, isTargetedMode]);

  const handleMouseLeave = useCallback(() => {
    if (!isAnimating) setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  }, [isAnimating, onHoverCoverage]);

  const handleCellClick = useCallback((row, col) => {
    if (disabled || isAnimating) return;

    if (isTargetedMode) {
      onPlace(row, col);
      setHoverAnchor(null);
      return;
    }

    if (!isValidPlacement(row, col)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  }, [disabled, isAnimating, onPlace, isTargetedMode]);

  // Compute cluster adjacency: which neighbors share the same item name
  const clusterAdj = useMemo(() => {
    if (!itemMap) return {};
    const adj = {};
    const getName = (r, c) => {
      if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return null;
      const item = itemMap[r][c];
      if (!item || item.isEffect || item.isEvacuation) return null;
      return item.name;
    };
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const name = getName(r, c);
        if (!name) { adj[`${r},${c}`] = null; continue; }
        adj[`${r},${c}`] = {
          top: getName(r - 1, c) === name,
          bottom: getName(r + 1, c) === name,
          left: getName(r, c - 1) === name,
          right: getName(r, c + 1) === name,
          topLeft: getName(r - 1, c - 1) === name,
          topRight: getName(r - 1, c + 1) === name,
          bottomLeft: getName(r + 1, c - 1) === name,
          bottomRight: getName(r + 1, c + 1) === name,
        };
      }
    }
    return adj;
  }, [itemMap]);

  // Compute cluster sizes for quality indicator
  const clusterSizeMap = useMemo(() => {
    if (!itemMap) return null;
    return computeClusterSizes(itemMap);
  }, [itemMap]);

  if (!itemMap) return null;

  const CLUSTER_RARITY_ID = { 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' };

  const phase = drawAnimInfo?.phase;
  const drawnKey = drawAnimInfo?.drawnKey;
  const coveredKeysAnim = drawAnimInfo?.coveredKeys;

  return (
    <>
      {flyingItem && <FlyingItem icon={flyingItem.icon} startRect={flyingItem.startRect} />}
      <div
        className="relative inline-grid gap-0 p-2 bg-slate-100 rounded-lg border border-slate-200"
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
          const isEvacCell = item.isEvacuation;
          const cellKey = `${row},${col}`;
          const isCovered = coveredCells.has(cellKey);

          // For effect/evacuation cells, no rarity highlighting from orders
          const neededRarity = (isEffectCell || isEvacCell) ? null : neededItems.get(item.name);

          const isDrawn = drawnKey === cellKey;
          const isCoveredAnim = coveredKeysAnim?.has(cellKey);
          const isOther = isCoveredAnim && !isDrawn;

          // Per-phase cell states
          let bgClass = '';
          let iconClass = '';
          let textVisible = true;

          if (isEvacCell) {
            bgClass = 'bg-indigo-50 border-indigo-300';
          } else if (isEffectCell && (phase === 'exit' || phase === 'enter') && isCoveredAnim) {
            bgClass = 'bg-white border-slate-200';
            iconClass = '';
            textVisible = true;
          } else if (phase === 'highlight' && isDrawn) {
            bgClass = 'bg-amber-100 border-amber-400 ring-2 ring-amber-400 scale-110 shadow-lg shadow-amber-200/60';
          } else if (phase === 'fly' && isDrawn) {
            bgClass = 'bg-amber-50 border-amber-300';
            iconClass = 'opacity-0';
            textVisible = false;
          } else if (phase === 'exit' && isDrawn) {
            bgClass = 'bg-slate-200 border-slate-300';
            iconClass = 'opacity-0';
            textVisible = false;
          } else if (phase === 'exit' && isOther) {
            bgClass = 'bg-slate-200 border-slate-300';
            iconClass = 'scale-50 opacity-0';
            textVisible = false;
          } else if (phase === 'enter' && isCoveredAnim) {
            bgClass = 'bg-white border-slate-200';
            iconClass = 'animate-[scaleIn_0.3s_ease-out]';
          } else if (isCovered && isValidHover) {
            bgClass = isEffectCell
              ? 'bg-slate-100 border-indigo-400 ring-2 ring-indigo-300 scale-105'
              : 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105';
          } else if (isEffectCell) {
            bgClass = 'bg-white border-slate-200';
          } else {
            const cs = clusterSizeMap?.[row]?.[col] || 1;
            const clusterRarity = CLUSTER_RARITY_ID[Math.min(cs, 5)] || 'common';
            bgClass = RARITY_BG[clusterRarity] || 'bg-white border-slate-200';
          }

          // Cluster adjacency for metaball effect
          const adj = clusterAdj[cellKey];
          const clusterStyle = adj ? {
            borderTopWidth: adj.top ? 0 : 2,
            borderBottomWidth: adj.bottom ? 0 : 2,
            borderLeftWidth: adj.left ? 0 : 2,
            borderRightWidth: adj.right ? 0 : 2,
            borderTopLeftRadius: (!adj.top && !adj.left && !adj.topLeft) ? 8 : 0,
            borderTopRightRadius: (!adj.top && !adj.right && !adj.topRight) ? 8 : 0,
            borderBottomLeftRadius: (!adj.bottom && !adj.left && !adj.bottomLeft) ? 8 : 0,
            borderBottomRightRadius: (!adj.bottom && !adj.right && !adj.bottomRight) ? 8 : 0,
          } : {};

          return (
            <div
              key={`${row}-${col}`}
              ref={el => { cellRefs.current[cellKey] = el; }}
              className={`
                relative flex flex-col items-center justify-center
                w-16 h-16 border-2 border-solid select-none
                transition-all duration-300
                ${adj ? '' : 'rounded-md'}
                ${bgClass}
                ${!disabled && !isAnimating ? 'cursor-crosshair' : 'cursor-default'}
              `}
              style={adj ? clusterStyle : {}}
              onMouseEnter={() => handleCellHover(row, col)}
              onClick={() => handleCellClick(row, col)}
            >
              {isEvacCell ? (
                <>
                  <span className="text-2xl leading-none">🚀</span>
                  <span className="text-[10px] font-bold text-indigo-600 mt-0.5">
                    {t('撤离点')}
                  </span>
                </>
              ) : isEffectCell ? (
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
                    <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${RARITY_DOT_COLOR[neededRarity] || 'bg-slate-400'}`} />
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Avatar overlay — 2×2 frame, slides smoothly between positions */}
        {avatarPos && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${8 + avatarPos.col * 64}px`,
              top: `${8 + avatarPos.row * 64}px`,
              width: '128px',
              height: '128px',
              transition: 'left 350ms cubic-bezier(0.4, 0, 0.2, 1), top 350ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              className="absolute inset-0 rounded-lg border-[3px] border-cyan-400"
              style={{ animation: 'avatarGlow 2s ease-in-out infinite' }}
            />
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-white shadow-sm" />
          </div>
        )}
        {/* Cost tooltip — pinned to top-right of hover 2×2 */}
        {isValidHover && hoverAnchor && hoverCost !== null && (
          <div
            className="absolute flex items-center gap-1 text-xs font-bold bg-white border border-amber-300 rounded px-1.5 py-0.5 shadow-md pointer-events-none z-30"
            style={{
              left: `${8 + (hoverAnchor.col + 2) * 64 + 4}px`,
              top: `${8 + hoverAnchor.row * 64 - 2}px`,
              color: hoverCost > 1 ? '#d97706' : '#16a34a',
              borderColor: hoverCost > 1 ? '#fbbf24' : '#86efac',
            }}
          >
            <Coins size={12} />{hoverCost}
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(ItemMap);
