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

/** Single charm in the placement tray — same tooltip as CharmCell */
function TrayCharm({ charm, isCurrent }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const cfg = CHARM_CONFIGS[charm.type];

  return (
    <div
      ref={ref}
      className={`w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-default
        ${isCurrent
          ? 'border-amber-400 bg-amber-50 shadow scale-110'
          : 'border-gray-200 bg-gray-100 opacity-40 scale-95'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-lg leading-none">{cfg?.icon}</span>
      <span className={`text-[8px] leading-none font-semibold ${isCurrent ? 'text-amber-600' : 'text-gray-400'}`}>
        {t(cfg?.name)}
      </span>
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
  // Animation
  fateDrawAnim = null,
  // Placement mode — player picks a cell to place this charm
  placementMode = null, // null | { charm, allCharms: CharmObject[], onPlace }
  // Mirror highlight from prize wall row/col hover
  mirrorHighlight = null, // null | { direction: 'row'|'col', lineIndex: number }
}) {
  const { t } = useLanguage();
  const [hoveredLine, setHoveredLine] = useState(null);
  const [error, setError] = useState(null);

  const isLuckSelecting = luckPhase === 'selecting';
  const isLuckResult   = luckPhase === 'result';
  const isDoomSelecting = doomPhase === 'selecting';
  const isDoomResult   = doomPhase === 'result';
  const isSelecting    = isLuckSelecting || isDoomSelecting;
  const isActive       = luckPhase !== 'idle' || doomPhase !== 'idle' || !!placementMode;

  const isDoom = isDoomSelecting || isDoomResult || doomPhase === 'animating';

  // Buttons visible during luck/doom phases only (not during placement)
  const showButtons      = isActive && !placementMode;
  const buttonsClickable = isSelecting;

  // Hover only works while buttons are clickable
  const hoveredLineCells = (hoveredLine && buttonsClickable)
    ? (hoveredLine.direction === 'row'
        ? getRowIndices(hoveredLine.lineIndex)
        : getColIndices(hoveredLine.lineIndex))
    : [];

  // Result highlight
  const resultHighlight = isLuckResult ? luckResult?.charmIndex : isDoomResult ? doomResult?.hitIndex : null;

  // Mirror highlight — cells in the row/col matching prize wall hover (max index 3)
  const mirrorCells = (mirrorHighlight && mirrorHighlight.lineIndex <= 3)
    ? (mirrorHighlight.direction === 'row'
        ? getRowIndices(mirrorHighlight.lineIndex)
        : getColIndices(mirrorHighlight.lineIndex))
    : [];

  const btnBase = isDoom
    ? 'bg-red-500 text-white'
    : 'bg-purple-500 text-white';
  const btnHover = isDoom ? 'hover:bg-red-600' : 'hover:bg-purple-600';

  const handleLineClick = (direction, lineIndex) => {
    if (!buttonsClickable) return;
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

  // Fixed-height status text (instruction → scanning → result → placement)
  const statusText = (() => {
    if (placementMode) {
      return { text: t('点击空格放置'), cls: 'text-amber-500 font-semibold' };
    }
    if (error) return null; // error shown separately
    if (fateDrawAnim?.phase === 'scanning')
      return { text: fateDrawAnim.type === 'luck' ? t('✨ 抽取中...') : t('💀 命中中...'), cls: 'text-amber-500 font-semibold animate-pulse' };
    if (isLuckResult && luckResult) {
      const cfg = CHARM_CONFIGS[luckResult.charm.type];
      return { text: `${cfg?.icon} ${t(cfg?.name)}: ${luckResult.effectDescription}`, cls: 'text-purple-600 font-semibold' };
    }
    if (isDoomResult && doomResult) {
      return doomResult.blocked
        ? { text: `🛡️ ${t('幸运符吸收了厄运！')}`, cls: 'text-green-600 font-semibold' }
        : { text: `❤️ -${doomResult.hpLoss}`, cls: 'text-red-600 font-semibold' };
    }
    if (isSelecting)
      return { text: isLuckSelecting ? t('选择一行或一列进行幸运抽取') : t('选择一行或一列承受厄运'), cls: 'text-gray-400' };
    return null;
  })();

  const ROW_BTN_W = 28;
  const GAP = 6;

  return (
    <div className="flex flex-col gap-1.5">

      {/* Idle label */}
      {!isActive && label && (
        <p className="text-xs text-gray-400 font-semibold text-center">{t(label)}</p>
      )}

      {/* Charm tray — shows all remaining charms during placement, current highlighted */}
      {placementMode?.allCharms && (
        <div className="flex gap-2 justify-center py-1">
          {placementMode.allCharms.map((charm, idx) => (
            <TrayCharm key={idx} charm={charm} isCurrent={idx === 0} />
          ))}
        </div>
      )}

      {/* Fixed-height status line — same space whether instruction, scanning, or result */}
      {isActive && (
        <div className="h-7 flex items-center justify-center px-1 overflow-hidden">
          {error
            ? <p className="text-red-400 text-[11px] text-center">{error}</p>
            : statusText && (
              <p className={`text-[11px] text-center leading-tight ${statusText.cls}`}>
                {statusText.text}
              </p>
            )
          }
        </div>
      )}

      {/* Column buttons — always visible when active, dimmed when not clickable */}
      {showButtons && (
        <div className="flex gap-1.5" style={{ paddingLeft: ROW_BTN_W + GAP }}>
          {[0, 1, 2, 3].map(col => (
            <button key={col}
              onClick={() => handleLineClick('col', col)}
              onMouseEnter={() => { if (buttonsClickable) { setHoveredLine({ direction: 'col', lineIndex: col }); setError(null); } }}
              onMouseLeave={() => setHoveredLine(null)}
              className={`flex-1 h-6 text-[11px] font-bold rounded transition-colors ${btnBase} ${buttonsClickable ? btnHover : 'opacity-25 cursor-not-allowed'}`}
            >▼</button>
          ))}
        </div>
      )}

      {/* Row buttons + 4×4 grid */}
      <div className="flex gap-1.5">

        {/* Row buttons — always visible when active */}
        {showButtons && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3].map(row => (
              <button key={row}
                onClick={() => handleLineClick('row', row)}
                onMouseEnter={() => { if (buttonsClickable) { setHoveredLine({ direction: 'row', lineIndex: row }); setError(null); } }}
                onMouseLeave={() => setHoveredLine(null)}
                className={`h-14 text-[11px] font-bold rounded transition-colors flex items-center justify-center ${btnBase} ${buttonsClickable ? btnHover : 'opacity-25 cursor-not-allowed'}`}
                style={{ width: ROW_BTN_W }}
              >▶</button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 grid grid-cols-4 gap-1.5">
          {cells.map((cell, i) => {
            // Placement mode: cells are click targets, no luck/doom highlights
            if (placementMode) {
              const canPlace = cell === null || (cell && !cell.isBlank);
              return (
                <div key={i}
                  className={`relative h-14 rounded-lg transition-all duration-75
                    ${canPlace ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-[1.04]' : 'opacity-30'}`}
                  onClick={() => canPlace && placementMode.onPlace(i)}
                >
                  {cell ? (
                    <CharmCell charm={cell} highlight={false} />
                  ) : (
                    <div className="h-full w-full bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center hover:bg-amber-100 hover:border-amber-400 transition-colors">
                      <span className="text-amber-400 text-xl leading-none">+</span>
                    </div>
                  )}
                </div>
              );
            }

            const isSettled   = fateDrawAnim?.phase === 'settled'  && i === fateDrawAnim.finalIndex;
            const isScanning  = fateDrawAnim?.phase === 'scanning' && i === fateDrawAnim.currentHighlight;
            const isHovered   = hoveredLineCells.includes(i);
            const isResult    = i === resultHighlight;
            const isMirror    = mirrorCells.includes(i);
            const scanIsDoom  = fateDrawAnim?.type === 'doom';

            let wrapperExtra = '';
            if (isSettled)        wrapperExtra = 'ring-2 ring-amber-400 scale-105 z-10';
            else if (isScanning)  wrapperExtra = scanIsDoom ? 'ring-2 ring-red-400' : 'ring-2 ring-purple-400';
            else if (isResult)    wrapperExtra = isDoom ? 'ring-2 ring-red-400 z-10' : 'ring-2 ring-purple-400 z-10';
            else if (isMirror)    wrapperExtra = 'ring-1 ring-blue-300';

            const hoverBg = isHovered && !fateDrawAnim
              ? (isDoom ? 'bg-red-50' : 'bg-blue-50')
              : isMirror ? 'bg-blue-50/60'
              : '';

            return (
              <div key={i} className={`relative h-14 rounded-lg transition-all duration-75 ${wrapperExtra} ${hoverBg}`}>
                {cell ? (
                  <CharmCell charm={cell} highlight={false} />
                ) : (
                  <div className={`h-full w-full border border-dashed rounded-lg flex items-center justify-center
                    ${isHovered && !fateDrawAnim
                      ? isDoom ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'
                      : isMirror ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                    }`}>
                    <span className="text-gray-300 text-xs">{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* COPY_MIRROR sub-interactions (these do expand the card, accepted edge case) */}
      {copyMirrorState?.step === 'select_source' && (
        <div className="pt-1.5 border-t border-purple-200">
          <p className="text-yellow-700 text-[11px] mb-1">{t('选择要复制的幸运符')}</p>
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
      {copyMirrorState?.step === 'select_target' && (
        <div className="pt-1.5 border-t border-purple-200">
          <p className="text-green-700 text-[11px] mb-1">{t('选择放置位置')}</p>
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

      {/* Confirm button — always present when active, invisible until result ready */}
      {isActive && (
        <button
          onClick={isLuckResult ? onLuckConfirm : isDoomResult ? onDoomConfirm : undefined}
          disabled={(!isLuckResult && !isDoomResult) || (isLuckResult && !!copyMirrorState)}
          className={`w-full py-1.5 rounded text-xs font-semibold transition-colors
            ${(isLuckResult || isDoomResult)
              ? isDoom
                ? 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              : 'invisible pointer-events-none'
            }`}
        >
          {t('确认')}
        </button>
      )}
    </div>
  );
}
