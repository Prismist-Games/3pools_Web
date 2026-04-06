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
const GridCell = ({ cell, cellContent, t, rowIndex, colIndex, adjacency, highlight }) => {
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
        const bg = size >= 4 ? 'bg-violet-100' : size >= 3 ? 'bg-sky-100' : size >= 2 ? 'bg-emerald-100' : 'bg-white';
        const borderColor = size >= 4 ? 'border-violet-400' : size >= 3 ? 'border-sky-400' : size >= 2 ? 'border-emerald-400' : 'border-gray-300';
        // Internal sides: no border at all
        const bT = top ? 'border-t-0' : borderColor;
        const bB = bottom ? 'border-b-0' : borderColor;
        const bL = left ? 'border-l-0' : borderColor;
        const bR = right ? 'border-r-0' : borderColor;
        bgClass = `${bg} ${bT} ${bB} ${bL} ${bR}`;
    } else {
        bgClass = 'bg-white border-gray-300';
    }

    // Highlight effects
    let highlightClass;
    let extraShadow = undefined;

    if (highlight === 'settled') {
        highlightClass = 'ring-3 ring-yellow-400 scale-110 z-20 shadow-lg shadow-yellow-200 transition-all duration-200';
    } else if (highlight === 'scanning') {
        highlightClass = 'ring-2 ring-yellow-300 z-10 transition-all duration-75';
    } else if (highlight === 'scan-row') {
        highlightClass = 'ring-1 ring-blue-200 transition-all duration-75';
    } else if (highlight === 'hover') {
        highlightClass = 'scale-105 z-10 transition-all duration-150';
        // Build directional ring only on external (non-connected) sides
        const ringColor = 'rgba(96,165,250,0.6)';
        const ringW = 2.5;
        const parts = ['0 4px 6px -1px rgba(0,0,0,0.1)', '0 2px 4px -2px rgba(0,0,0,0.1)']; // shadow-md
        if (!top) parts.push(`inset 0 ${ringW}px 0 0 ${ringColor}`);
        if (!bottom) parts.push(`inset 0 -${ringW}px 0 0 ${ringColor}`);
        if (!left) parts.push(`inset ${ringW}px 0 0 0 ${ringColor}`);
        if (!right) parts.push(`inset -${ringW}px 0 0 0 ${ringColor}`);
        extraShadow = parts.join(', ');
    } else {
        highlightClass = 'transition-all duration-150';
    }

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`border flex flex-col items-center justify-center ${rounding} ${bgClass} ${highlightClass}`}
            style={{
                margin: `${top ? 0 : HALF}px ${right ? 0 : HALF}px ${bottom ? 0 : HALF}px ${left ? 0 : HALF}px`,
                width: CELL_SIZE + (left ? HALF : 0) + (right ? HALF : 0),
                height: CELL_SIZE + (top ? HALF : 0) + (bottom ? HALF : 0),
                boxShadow: extraShadow,
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
const ResourceMatrix = ({ matrix, onSelectRow, onSelectColumn, gold, drawCost, phase, disabled, drawAnimState }) => {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    if (!matrix) return null;

    const canDraw = phase === 'drawing' && gold >= drawCost && !disabled;

    const getCellContent = (cell) => {
        if (cell === null) return <span className="text-gray-300">·</span>;
        if (cell.type === 'item') return <span className="text-xl">{cell.item.icon}</span>;
        return <span className="text-xl">{cell.icon}</span>;
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

    // Row button width
    const ROW_BTN_WIDTH = 36;
    const ROW_BTN_MARGIN = 8; // mr-2

    return (
        <div>
            <div className="text-center text-sm text-gray-500 mb-2 font-bold">
                {t('选择行或列抽取')}
            </div>

            {/* Column buttons row — offset by row-button area */}
            <div className="flex mb-1" style={{ paddingLeft: ROW_BTN_WIDTH + ROW_BTN_MARGIN }}>
                {Array.from({ length: 5 }, (_, colIndex) => {
                    const hasActive = matrix.some(row => row[colIndex] !== null);
                    const colClickable = canDraw && hasActive;
                    return (
                        <button
                            key={colIndex}
                            onClick={() => colClickable && onSelectColumn(colIndex)}
                            onMouseEnter={() => colClickable && setHoveredCol(colIndex)}
                            onMouseLeave={() => setHoveredCol(null)}
                            disabled={!colClickable}
                            className={`
                                rounded-lg text-xs font-black flex-shrink-0
                                flex items-center justify-center
                                transition-all duration-150 shadow-sm
                                ${colClickable
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }
                            `}
                            style={{ width: CELL_SIZE, height: 24, marginRight: GAP }}
                            title={colClickable ? t('抽取此列') : t('无法抽取')}
                        >
                            ▼
                        </button>
                    );
                })}
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
                                onMouseEnter={() => rowClickable && setHoveredRow(rowIndex)}
                                onMouseLeave={() => setHoveredRow(null)}
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
                    {(() => {
                        // Compute groupIds that touch the hovered row or hovered column
                        const hoveredGroupIds = new Set();
                        if (hoveredRow !== null) {
                            matrix[hoveredRow]?.forEach(cell => {
                                if (cell?.groupId) hoveredGroupIds.add(cell.groupId);
                            });
                        }
                        if (hoveredCol !== null) {
                            matrix.forEach(row => {
                                const cell = row[hoveredCol];
                                if (cell?.groupId) hoveredGroupIds.add(cell.groupId);
                            });
                        }

                        return matrix.flatMap((row, rowIndex) =>
                            row.map((cell, colIndex) => {
                                // Hover: cell is in hovered row/col, OR belongs to a group in hovered row/col
                                const isRowHovered = hoveredRow === rowIndex && cell !== null;
                                const isColHovered = hoveredCol === colIndex && cell !== null;
                                const isGroupHovered = cell?.groupId && hoveredGroupIds.has(cell.groupId);
                                const showHover = isRowHovered || isColHovered || isGroupHovered;

                                // Draw animation highlight — row mode
                                const isRowScanning = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === colIndex;
                                const isRowSettled = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'settled' && drawAnimState.finalColIndex === colIndex;
                                const isScanRow = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && cell !== null && drawAnimState.phase === 'scanning';

                                // Draw animation highlight — column mode
                                const isColScanning = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === rowIndex;
                                const isColSettled = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'settled' && drawAnimState.finalRowIndex === rowIndex;
                                const isScanCol = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && cell !== null && drawAnimState.phase === 'scanning';

                                const isScanning = isRowScanning || isColScanning;
                                const isSettled = isRowSettled || isColSettled;
                                const isScanLine = isScanRow || isScanCol;

                                return (
                                    <GridCell
                                        key={`${rowIndex}-${colIndex}`}
                                        cell={cell}
                                        cellContent={getCellContent(cell)}
                                        t={t}
                                        rowIndex={rowIndex}
                                        colIndex={colIndex}
                                        adjacency={getAdjacency(rowIndex, colIndex)}
                                        highlight={isSettled ? 'settled' : isScanning ? 'scanning' : isScanLine ? 'scan-row' : showHover ? 'hover' : null}
                                    />
                                );
                            })
                        );
                    })()}
                </div>

            </div>
        </div>
    );
};

export default ResourceMatrix;
