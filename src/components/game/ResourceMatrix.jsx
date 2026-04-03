import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

/** Tooltip for grid cells — Portal-based, same style as ToolItemTooltip */
const CellTooltip = ({ cell, anchorRef, visible, t }) => {
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

    if (!visible || !cell || !pos) return null;

    let icon, name, desc;
    if (cell.type === 'doom_resolution') {
        icon = cell.icon;
        name = cell.name;
        desc = t('抽中时触发厄运结算，不获得物品');
    } else if (cell.type === 'doom_upgrade') {
        icon = cell.icon;
        name = cell.name;
        desc = t('抽中时厄运等级+1，不获得物品');
    } else {
        return null;
    }

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
                    <span className="text-lg">{icon}</span>
                    <span className="font-black text-amber-300 text-sm">{name}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                    {desc}
                </p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
            </div>
        </div>,
        document.body
    );
};

const CELL_SIZE = 56;
const GAP = 6;
const HALF = GAP / 2;
const TRACK = CELL_SIZE + GAP;

/** Single grid cell */
const GridCell = ({ cell, cellContent, t, rowIndex, colIndex, adjacency }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade');
    const { top, bottom, left, right } = adjacency;

    // Rounded corners — only on external corners
    const isConnected = top || bottom || left || right;
    const rounding = isConnected
        ? [
            (!top && !left) ? 'rounded-tl-lg' : '',
            (!top && !right) ? 'rounded-tr-lg' : '',
            (!bottom && !left) ? 'rounded-bl-lg' : '',
            (!bottom && !right) ? 'rounded-br-lg' : '',
          ].join(' ')
        : 'rounded-lg';

    // Cell background
    let bgClass;
    if (cell === null) {
        bgClass = 'bg-gray-100 border-gray-200';
    } else if (cell.type === 'doom_resolution') {
        bgClass = 'bg-red-100 border-red-400';
    } else if (cell.type === 'doom_upgrade') {
        bgClass = 'bg-amber-100 border-amber-400';
    } else if (cell.type === 'item') {
        const size = cell.shapeSize || 1;
        const bg = size >= 4 ? 'bg-violet-100 border-violet-400'
                 : size >= 3 ? 'bg-sky-100 border-sky-400'
                 : size >= 2 ? 'bg-emerald-100 border-emerald-400'
                 : 'bg-white border-gray-300';
        // Internal borders match background to hide seam
        const bT = top ? 'border-t-transparent' : '';
        const bB = bottom ? 'border-b-transparent' : '';
        const bL = left ? 'border-l-transparent' : '';
        const bR = right ? 'border-r-transparent' : '';
        bgClass = `${bg} ${bT} ${bB} ${bL} ${bR}`;
    } else {
        bgClass = 'bg-white border-gray-300';
    }

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`border flex flex-col items-center justify-center ${rounding} ${bgClass}`}
            style={{
                // Margin creates visual gaps; connected sides = 0 margin → cells truly touch
                margin: `${top ? 0 : HALF}px ${right ? 0 : HALF}px ${bottom ? 0 : HALF}px ${left ? 0 : HALF}px`,
                // Fill remaining space in the track
                width: CELL_SIZE + (left ? HALF : 0) + (right ? HALF : 0),
                height: CELL_SIZE + (top ? HALF : 0) + (bottom ? HALF : 0),
            }}
            onMouseEnter={hasTip ? () => setHovered(true) : undefined}
            onMouseLeave={hasTip ? () => setHovered(false) : undefined}
        >
            {cellContent}
            {cell !== null && cell.type === 'item' && (
                <span className="text-[9px] text-gray-600 leading-none mt-0.5 truncate max-w-[48px] font-medium">
                    {cell.item.name}
                </span>
            )}
            {hasTip && <CellTooltip cell={cell} anchorRef={ref} visible={hovered} t={t} />}
        </div>
    );
};

/**
 * 5×5 grid display for turn-based prototype.
 */
const ResourceMatrix = ({ matrix, onSelectRow, gold, drawCost, phase, disabled }) => {
    const { t } = useLanguage();

    if (!matrix) return null;

    const canDraw = phase === 'drawing' && gold >= drawCost && !disabled;

    const getCellContent = (cell) => {
        if (cell === null) return <span className="text-gray-300">·</span>;
        if (cell.type === 'item') return <span className="text-xl">{cell.item.icon}</span>;
        return <span className="text-xl">{cell.icon}</span>;
    };

    const getRowDoomInfo = (row) => {
        let resolutions = 0, upgrades = 0;
        row.forEach(cell => {
            if (cell?.type === 'doom_resolution') resolutions++;
            if (cell?.type === 'doom_upgrade') upgrades++;
        });
        return { resolutions, upgrades };
    };

    const getAdjacency = (rowIdx, colIdx) => {
        const cell = matrix[rowIdx]?.[colIdx];
        if (!cell || !cell.groupId || (cell.shapeSize || 1) <= 1) {
            return { top: false, bottom: false, left: false, right: false };
        }
        const gid = cell.groupId;
        return {
            top: rowIdx > 0 && matrix[rowIdx - 1]?.[colIdx]?.groupId === gid,
            bottom: rowIdx < matrix.length - 1 && matrix[rowIdx + 1]?.[colIdx]?.groupId === gid,
            left: colIdx > 0 && matrix[rowIdx][colIdx - 1]?.groupId === gid,
            right: colIdx < matrix[rowIdx].length - 1 && matrix[rowIdx][colIdx + 1]?.groupId === gid,
        };
    };

    return (
        <div>
            <div className="text-center text-sm text-gray-500 mb-2 font-bold">
                {t('选择一行抽取')}
            </div>
            <div className="flex items-start">
                {/* Row buttons */}
                <div className="flex flex-col mr-2" style={{ paddingTop: HALF }}>
                    {matrix.map((row, rowIndex) => {
                        const hasActive = row.some(c => c !== null);
                        const rowClickable = canDraw && hasActive;
                        return (
                            <button
                                key={rowIndex}
                                onClick={() => rowClickable && onSelectRow(rowIndex)}
                                disabled={!rowClickable}
                                className={`
                                    rounded-lg text-xs font-black flex-shrink-0
                                    flex items-center justify-center
                                    transition-all duration-150 shadow-sm
                                    ${rowClickable
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }
                                `}
                                style={{ width: 36, height: CELL_SIZE, marginBottom: GAP }}
                                title={rowClickable ? t('抽取此行') : t('无法抽取')}
                            >
                                ▶
                            </button>
                        );
                    })}
                </div>

                {/* 5×5 grid — zero-gap CSS Grid, margins create visual spacing */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(5, ${TRACK}px)`,
                        gridTemplateRows: `repeat(5, ${TRACK}px)`,
                        /* no gap — margins on cells handle spacing */
                    }}
                >
                    {matrix.flatMap((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                            <GridCell
                                key={`${rowIndex}-${colIndex}`}
                                cell={cell}
                                cellContent={getCellContent(cell)}
                                t={t}
                                rowIndex={rowIndex}
                                colIndex={colIndex}
                                adjacency={getAdjacency(rowIndex, colIndex)}
                            />
                        ))
                    )}
                </div>

                {/* Row doom indicators */}
                <div className="flex flex-col ml-1" style={{ paddingTop: HALF }}>
                    {matrix.map((row, rowIndex) => {
                        const doomInfo = getRowDoomInfo(row);
                        return (
                            <div
                                key={rowIndex}
                                className="flex-shrink-0 text-xs font-bold flex items-center"
                                style={{ height: CELL_SIZE, marginBottom: GAP, width: 70 }}
                            >
                                {doomInfo.resolutions > 0 && (
                                    <span className="text-red-600">💀×{doomInfo.resolutions} </span>
                                )}
                                {doomInfo.upgrades > 0 && (
                                    <span className="text-amber-600">⬆️×{doomInfo.upgrades}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResourceMatrix;
