// src/components/game/FateWall.jsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { CHARM_CONFIGS, getCharmDescription } from '../../data/charms';
import { getRowIndices, getColIndices, lineHasCharm, isLineFullyProtected } from '../../utils/fateWallHelpers';

/** Portal tooltip — same dark style as Prize Wall CellTooltip */
const CharmTooltip = ({ charm, anchorRef, visible }) => {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!visible || !anchorRef.current) { setPos(null); return; }
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.top + window.scrollY - 8, left: rect.left + window.scrollX + rect.width / 2 });
  }, [visible, anchorRef]);

  if (!visible || !charm || !pos) return null;

  const cfg = CHARM_CONFIGS[charm.type];
  const desc = getCharmDescription(charm);

  return createPortal(
    <div style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)', zIndex: 99999, pointerEvents: 'none' }}
         className="animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-amber-400/30 min-w-[180px] max-w-[240px]">
        <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700 pb-1.5">
          <span className="text-lg">{cfg?.icon}</span>
          <span className="font-black text-amber-300 text-sm">{cfg?.name}</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">{desc}</p>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
      </div>
    </div>,
    document.body
  );
};

/** Single charm cell — light card, portal tooltip */
function CharmCell({ charm, highlight, highlightColor = 'blue' }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const cfg = CHARM_CONFIGS[charm.type];
  const isOneShot = !cfg?.isPersistent;

  const bgClass = charm.isBlank
    ? 'bg-gray-100 border-gray-300'
    : isOneShot
      ? 'bg-amber-50 border-amber-400'
      : 'bg-white border-gray-200';

  const ringClass = highlight
    ? highlightColor === 'red' ? 'ring-2 ring-red-400 z-10' : 'ring-2 ring-blue-400 z-10'
    : '';

  return (
    <div ref={ref}
      className={`relative w-full h-full flex flex-col items-center justify-center rounded-lg border ${bgClass} ${ringClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-xl leading-none">{cfg?.icon}</span>
      <span className="text-[9px] text-gray-500 leading-tight mt-0.5 text-center px-0.5 truncate max-w-full">
        {t(cfg?.name)}
      </span>
      {charm.growthCount > 0 && (
        <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-blue-500 text-white shadow">
          {charm.growthCount}
        </span>
      )}
      {charm.usesLeft !== undefined && (
        <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-orange-500 text-white shadow">
          {charm.usesLeft}
        </span>
      )}
      <CharmTooltip charm={charm} anchorRef={ref} visible={hovered} />
    </div>
  );
}

/**
 * Fate Wall — 4×4 grid with inline Luck/Doom row-col selection.
 *
 * During luck_draw or doom draw phases, row/col buttons appear directly on
 * the grid (same pattern as the Prize Wall). No separate modal needed.
 */
export function FateWall({
  cells,
  highlightIndices = [],
  label,
  // Luck draw
  luckPhase = 'idle',
  luckResult = null,
  onLuckSelect,
  onLuckConfirm,
  copyMirrorState,
  onCopyMirrorSelectSource,
  onCopyMirrorSelectTarget,
  // Doom draw
  doomPhase = 'idle',
  doomResult = null,
  doomIndex,
  doomTotal,
  doomLevel,
  onDoomSelect,
  onDoomConfirm,
}) {
  const { t } = useLanguage();
  const [hoveredLine, setHoveredLine] = useState(null);
  const [error, setError] = useState(null);

  const isLuckSelecting = luckPhase === 'selecting';
  const isLuckResult   = luckPhase === 'result';
  const isDoomSelecting = doomPhase === 'selecting';
  const isDoomResult   = doomPhase === 'result';
  const isSelecting    = isLuckSelecting || isDoomSelecting;

  const isDoom = isDoomSelecting || isDoomResult;

  // Highlight cells: result highlight > hover highlight > external highlight
  const activeHighlights = (() => {
    if (isLuckResult && luckResult?.charmIndex != null)  return [luckResult.charmIndex];
    if (isDoomResult && doomResult?.hitIndex != null)    return [doomResult.hitIndex];
    if (hoveredLine && isSelecting) {
      return hoveredLine.direction === 'row'
        ? getRowIndices(hoveredLine.lineIndex)
        : getColIndices(hoveredLine.lineIndex);
    }
    return highlightIndices;
  })();

  const highlightColor = isDoom ? 'red' : 'blue';

  const btnCls = isDoom
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-purple-500 hover:bg-purple-600 text-white';

  const handleLineClick = (direction, lineIndex) => {
    setError(null);
    if (isLuckSelecting) {
      if (!lineHasCharm(cells, direction, lineIndex)) {
        setError(t('此行/列为空，请重选'));
        return;
      }
      onLuckSelect({ direction, lineIndex });
    } else if (isDoomSelecting) {
      if (isLineFullyProtected(cells, direction, lineIndex)) {
        setError(t('此行/列被完全保护，请重选'));
        return;
      }
      onDoomSelect({ direction, lineIndex });
    }
  };

  // Row-button width + gap offset so col buttons align with the grid columns
  const ROW_BTN_W = 28; // w-7
  const GAP = 6;        // gap-1.5
  const colOffset = isSelecting ? ROW_BTN_W + GAP : 0;

  return (
    <div className="flex flex-col gap-1.5">

      {/* Label (idle only) */}
      {label && !isSelecting && !isLuckResult && !isDoomResult && (
        <p className="text-xs text-gray-400 font-semibold text-center">{t(label)}</p>
      )}

      {/* Instruction (selecting only) */}
      {isSelecting && (
        <p className="text-[11px] text-center text-gray-400">
          {isLuckSelecting ? t('选择一行或一列进行幸运抽取') : t('选择一行或一列承受厄运')}
        </p>
      )}

      {/* Column buttons — only while selecting, aligned to grid columns */}
      {isSelecting && (
        <div className="flex gap-1.5" style={{ paddingLeft: colOffset }}>
          {[0, 1, 2, 3].map(col => (
            <button key={col}
              onClick={() => handleLineClick('col', col)}
              onMouseEnter={() => { setHoveredLine({ direction: 'col', lineIndex: col }); setError(null); }}
              onMouseLeave={() => setHoveredLine(null)}
              className={`flex-1 h-6 text-[11px] font-bold rounded transition-colors ${btnCls}`}
            >▼</button>
          ))}
        </div>
      )}

      {/* Row buttons + 4×4 grid */}
      <div className="flex gap-1.5">

        {/* Row buttons */}
        {isSelecting && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3].map(row => (
              <button key={row}
                onClick={() => handleLineClick('row', row)}
                onMouseEnter={() => { setHoveredLine({ direction: 'row', lineIndex: row }); setError(null); }}
                onMouseLeave={() => setHoveredLine(null)}
                className={`h-14 text-[11px] font-bold rounded transition-colors flex items-center justify-center ${btnCls}`}
                style={{ width: ROW_BTN_W }}
              >▶</button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 grid grid-cols-4 gap-1.5">
          {cells.map((cell, i) => (
            <div key={i} className="relative h-14">
              {cell ? (
                <CharmCell charm={cell} highlight={activeHighlights.includes(i)} highlightColor={highlightColor} />
              ) : (
                <div className="h-full w-full bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-300 text-xs">{i + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Validation error */}
      {error && (
        <p className="text-red-400 text-[11px] text-center">{error}</p>
      )}

      {/* Luck result panel */}
      {isLuckResult && luckResult && (
        <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{CHARM_CONFIGS[luckResult.charm.type]?.icon}</span>
            <span className="text-sm font-semibold text-gray-800">
              {t(CHARM_CONFIGS[luckResult.charm.type]?.name)}
            </span>
          </div>
          <p className="text-purple-700 text-xs mb-2">{luckResult.effectDescription}</p>

          {/* COPY_MIRROR — pick source */}
          {copyMirrorState?.step === 'select_source' && (
            <div className="mb-2 pt-2 border-t border-purple-200">
              <p className="text-yellow-700 text-[11px] mb-1.5">{t('选择要复制的幸运符')}</p>
              <div className="grid grid-cols-4 gap-1">
                {cells.map((cell, i) => {
                  const ok = copyMirrorState.sourceOptions.includes(i);
                  const cfg = cell ? CHARM_CONFIGS[cell.type] : null;
                  return (
                    <button key={i} onClick={() => ok && onCopyMirrorSelectSource(i)} disabled={!ok}
                      className={`h-9 rounded border text-sm ${ok ? 'bg-yellow-50 border-yellow-400 hover:bg-yellow-100 cursor-pointer' : 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'}`}>
                      {cell ? cfg?.icon : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COPY_MIRROR — pick target */}
          {copyMirrorState?.step === 'select_target' && (
            <div className="mb-2 pt-2 border-t border-purple-200">
              <p className="text-green-700 text-[11px] mb-1.5">{t('选择放置位置')}</p>
              <div className="grid grid-cols-4 gap-1">
                {cells.map((cell, i) => {
                  const ok = copyMirrorState.emptySlots.includes(i);
                  const cfg = cell ? CHARM_CONFIGS[cell.type] : null;
                  return (
                    <button key={i} onClick={() => ok && onCopyMirrorSelectTarget(i)} disabled={!ok}
                      className={`h-9 rounded border text-sm ${ok ? 'bg-green-50 border-green-400 hover:bg-green-100 cursor-pointer' : 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'}`}>
                      {ok ? '+' : (cell ? cfg?.icon : '')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={onLuckConfirm} disabled={!!copyMirrorState}
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold">
            {t('确认')}
          </button>
        </div>
      )}

      {/* Doom result panel */}
      {isDoomResult && doomResult && (
        <div className="p-2.5 bg-red-50 rounded-lg border border-red-200">
          {doomResult.blocked
            ? <p className="text-green-700 text-xs font-semibold">🛡️ {t('幸运符吸收了厄运！')}</p>
            : <p className="text-red-700 text-xs font-semibold">❤️ -{doomResult.hpLoss}</p>
          }
          <button onClick={onDoomConfirm}
            className="mt-2 w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold">
            {t('确认')}
          </button>
        </div>
      )}
    </div>
  );
}
