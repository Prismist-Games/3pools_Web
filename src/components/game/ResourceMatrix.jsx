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

// Background colors by item shape size (for box-shadow bridges)
const SIZE_BG = { 1: null, 2: '#f0fdf4', 3: '#eff6ff', 4: '#faf5ff' };
const CELL_SIZE = 56; // w-14 = 56px
const GAP = 6;        // gap between cells in px

/** Single grid cell with optional tooltip */
const GridCell = ({ cell, cellContent, t, rowIndex, colIndex, adjacency }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade');

    // Compute rounded corners — only round external corners of multi-cell items
    const { top, bottom, left, right } = adjacency;
    const isConnected = top || bottom || left || right;
    const rounding = isConnected
        ? [
            (!top && !left) ? 'rounded-tl-lg' : '',
            (!top && !right) ? 'rounded-tr-lg' : '',
            (!bottom && !left) ? 'rounded-bl-lg' : '',
            (!bottom && !right) ? 'rounded-br-lg' : '',
          ].join(' ')
        : 'rounded-lg';

    // Box-shadow to fill gaps between connected cells
    const shadows = [];
    const color = cell?.type === 'item' ? SIZE_BG[cell.shapeSize || 1] : null;
    if (color) {
        const half = GAP / 2;
        if (right) shadows.push(`${half}px 0 0 0 ${color}`);
        if (bottom) shadows.push(`0 ${half}px 0 0 ${color}`);
        if (right && bottom) {
            // Check diagonal — fill corner if both right and bottom neighbors are same group
            shadows.push(`${half}px ${half}px 0 0 ${color}`);
        }
    }

    // Cell background class
    let bgClass;
    if (cell === null) {
        bgClass = 'bg-gray-100 border-gray-200';
    } else if (cell.type === 'doom_resolution') {
        bgClass = 'bg-red-50 border-red-300';
    } else if (cell.type === 'doom_upgrade') {
        bgClass = 'bg-orange-50 border-orange-300';
    } else if (cell.type === 'item') {
        const size = cell.shapeSize || 1;
        const bg = size >= 4 ? 'bg-purple-50' : size >= 3 ? 'bg-blue-50' : size >= 2 ? 'bg-green-50' : 'bg-white';
        // Internal borders transparent, external borders gray
        const bT = top ? 'border-t-transparent' : 'border-t-gray-300';
        const bB = bottom ? 'border-b-transparent' : 'border-b-gray-300';
        const bL = left ? 'border-l-transparent' : 'border-l-gray-300';
        const bR = right ? 'border-r-transparent' : 'border-r-gray-300';
        bgClass = `${bg} ${bT} ${bB} ${bL} ${bR}`;
    } else {
        bgClass = 'bg-white border-gray-300';
    }

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`border flex flex-col items-center justify-center relative ${rounding} ${bgClass}`}
            style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
                zIndex: isConnected ? 1 : 0,
            }}
            onMouseEnter={hasTip ? () => setHovered(true) : undefined}
            onMouseLeave={hasTip ? () => setHovered(false) : undefined}
        >
            {cellContent}
            {cell !== null && cell.type === 'item' && (
                <span className="text-[9px] text-gray-500 leading-none mt-0.5 truncate max-w-[48px]">
                    {cell.item.name}
                </span>
            )}
            {hasTip && <CellTooltip cell={cell} anchorRef={ref} visible={hovered} t={t} />}
        </div>
    );
};

/**
 * 5×5 grid display for turn-based prototype.
 * Shows item cells and doom cells. Row-only selection.
 */
const ResourceMatrix = ({ matrix, onSelectRow, gold, drawCost, phase, disabled }) => {
    const { t } = useLanguage();

    if (!matrix) return null;

    const canDraw = phase === 'drawing' && gold >= drawCost && !disabled;

    const getCellContent = (cell) => {
        if (cell === null) {
            return <span className="text-gray-300">·</span>;
        }
        if (cell.type === 'item') {
            return <span className="text-xl">{cell.item.icon}</span>;
        }
        if (cell.type === 'doom_resolution') {
            return <span className="text-xl">{cell.icon}</span>;
        }
        if (cell.type === 'doom_upgrade') {
            return <span className="text-xl">{cell.icon}</span>;
        }
        return null;
    };

    const getRowDoomInfo = (row) => {
        let resolutions = 0;
        let upgrades = 0;
        row.forEach(cell => {
            if (cell?.type === 'doom_resolution') resolutions++;
            if (cell?.type === 'doom_upgrade') upgrades++;
        });
        return { resolutions, upgrades };
    };

    const getRowActiveCount = (row) => {
        return row.filter(cell => cell !== null).length;
    };

    // Compute adjacency for a cell (same groupId neighbor)
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
            <div className="text-center text-sm text-gray-500 mb-2">
                {t('选择一行抽取')}
            </div>
            <div className="flex items-start gap-2">
                {/* Row buttons column */}
                <div className="flex flex-col" style={{ gap: GAP }}>
                    {matrix.map((row, rowIndex) => {
                        const activeCount = getRowActiveCount(row);
                        const hasActiveCells = activeCount > 0;
                        const rowClickable = canDraw && hasActiveCells;
                        return (
                            <button
                                key={rowIndex}
                                onClick={() => rowClickable && onSelectRow(rowIndex)}
                                disabled={!rowClickable}
                                className={`
                                    rounded text-xs font-bold flex-shrink-0
                                    transition-all duration-150 flex items-center justify-center
                                    ${rowClickable
                                        ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                                style={{ width: 32, height: CELL_SIZE }}
                                title={rowClickable ? t('抽取此行') : t('无法抽取')}
                            >
                                ▶
                            </button>
                        );
                    })}
                </div>

                {/* 5×5 grid — single CSS Grid for perfect alignment */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(5, ${CELL_SIZE}px)`,
                        gridTemplateRows: `repeat(5, ${CELL_SIZE}px)`,
                        gap: GAP,
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

                {/* Row doom indicators column */}
                <div className="flex flex-col" style={{ gap: GAP }}>
                    {matrix.map((row, rowIndex) => {
                        const doomInfo = getRowDoomInfo(row);
                        return (
                            <div
                                key={rowIndex}
                                className="flex-shrink-0 text-xs text-gray-400 flex items-center"
                                style={{ height: CELL_SIZE, width: 64 }}
                            >
                                {doomInfo.resolutions > 0 && (
                                    <span className="text-red-500">💀×{doomInfo.resolutions} </span>
                                )}
                                {doomInfo.upgrades > 0 && (
                                    <span className="text-orange-500">⬆️×{doomInfo.upgrades}</span>
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
