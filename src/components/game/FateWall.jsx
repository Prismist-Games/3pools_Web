// src/components/game/FateWall.jsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { CHARM_CONFIGS, getCharmDescription } from '../../data/charms';

/** Portal-based tooltip — same style as CellTooltip in ResourceMatrix */
const CharmTooltip = ({ charm, anchorRef, visible }) => {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!visible || !anchorRef.current) {
      setPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, [visible, anchorRef]);

  if (!visible || !charm || !pos) return null;

  const cfg = CHARM_CONFIGS[charm.type];
  const desc = getCharmDescription(charm);

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 99999,
        pointerEvents: 'none',
      }}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-amber-400/30 min-w-[180px] max-w-[240px]">
        <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700 pb-1.5">
          <span className="text-lg">{cfg?.icon}</span>
          <span className="font-black text-amber-300 text-sm">{cfg?.name}</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">{desc}</p>
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
      </div>
    </div>,
    document.body
  );
};

function CharmCell({ charm, highlight }) {
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

  return (
    <div
      ref={ref}
      className={[
        'relative w-full h-full flex flex-col items-center justify-center rounded-lg border',
        bgClass,
        highlight ? 'ring-2 ring-blue-400 z-10' : '',
      ].filter(Boolean).join(' ')}
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

export function FateWall({ cells, highlightIndices = [], onCellClick, label }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="text-xs text-gray-400 font-semibold text-center">{t(label)}</div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {cells.map((cell, i) => (
          <button
            key={i}
            onClick={() => onCellClick?.(i)}
            className={[
              'relative h-14 w-full rounded-lg transition-all',
              cell
                ? (onCellClick ? 'cursor-pointer hover:scale-105' : 'cursor-default')
                : 'bg-gray-50 border border-dashed border-gray-200 cursor-default',
            ].filter(Boolean).join(' ')}
          >
            {cell ? (
              <CharmCell charm={cell} highlight={highlightIndices.includes(i)} />
            ) : (
              <span className="text-gray-300 text-xs">{i + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
