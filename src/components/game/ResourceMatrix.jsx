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

/** Single grid cell with optional tooltip */
const GridCell = ({ cell, cellStyle, cellContent, t, rowIndex, colIndex, adjacency }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade');

    // Compute rounded corners — only round external corners
    const { top, bottom, left, right } = adjacency;
    const tl = (!top && !left) ? 'rounded-tl' : '';
    const tr = (!top && !right) ? 'rounded-tr' : '';
    const bl = (!bottom && !left) ? 'rounded-bl' : '';
    const br = (!bottom && !right) ? 'rounded-br' : '';
    const rounding = `${tl} ${tr} ${bl} ${br}`;

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`
                w-14 h-14 border-2 flex flex-col items-center justify-center
                ${rounding} ${cellStyle}
            `}
            style={{
                marginTop: top ? -2 : 2,
                marginLeft: left ? -2 : 2,
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

    const getCellStyle = (cell, rowIdx, colIdx) => {
        if (cell === null) return 'bg-gray-100 border-gray-200';
        if (cell.type === 'doom_resolution') return 'bg-red-50 border-red-300';
        if (cell.type === 'doom_upgrade') return 'bg-orange-50 border-orange-300';
        if (cell.type !== 'item') return 'bg-white border-gray-300';

        // Multi-cell items: tint by size, remove borders between connected cells
        const size = cell.shapeSize || 1;
        const gid = cell.groupId;
        const bg = size >= 4 ? 'bg-purple-50' : size >= 3 ? 'bg-blue-50' : size >= 2 ? 'bg-green-50' : 'bg-white';

        // Check adjacency to remove internal borders
        const top = rowIdx > 0 && matrix[rowIdx - 1]?.[colIdx]?.groupId === gid;
        const bottom = rowIdx < matrix.length - 1 && matrix[rowIdx + 1]?.[colIdx]?.groupId === gid;
        const left = colIdx > 0 && matrix[rowIdx][colIdx - 1]?.groupId === gid;
        const right = colIdx < matrix[rowIdx].length - 1 && matrix[rowIdx][colIdx + 1]?.groupId === gid;

        const borderT = top ? 'border-t-transparent' : 'border-t-gray-300';
        const borderB = bottom ? 'border-b-transparent' : 'border-b-gray-300';
        const borderL = left ? 'border-l-transparent' : 'border-l-gray-300';
        const borderR = right ? 'border-r-transparent' : 'border-r-gray-300';

        return `${bg} ${borderT} ${borderB} ${borderL} ${borderR}`;
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

    // Compute adjacency for each cell (same groupId neighbor)
    const getAdjacency = (rowIdx, colIdx) => {
        const cell = matrix[rowIdx]?.[colIdx];
        if (!cell || !cell.groupId || cell.shapeSize <= 1) {
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
        <div className="flex flex-col">
            <div className="text-center text-sm text-gray-500 mb-1">
                {t('选择一行抽取')}
            </div>
            {matrix.map((row, rowIndex) => {
                const doomInfo = getRowDoomInfo(row);
                const activeCount = getRowActiveCount(row);
                const hasActiveCells = activeCount > 0;
                const rowClickable = canDraw && hasActiveCells;

                return (
                    <div key={rowIndex} className="flex items-center">
                        {/* Row select button */}
                        <button
                            onClick={() => rowClickable && onSelectRow(rowIndex)}
                            disabled={!rowClickable}
                            className={`
                                w-8 h-8 rounded text-xs font-bold flex-shrink-0 mr-1
                                transition-all duration-150
                                ${rowClickable
                                    ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                            title={rowClickable ? t('抽取此行') : t('无法抽取')}
                        >
                            ▶
                        </button>

                        {/* Grid cells — no gap, adjacency handled by negative margins */}
                        {row.map((cell, colIndex) => {
                            const adj = getAdjacency(rowIndex, colIndex);
                            return (
                                <GridCell
                                    key={colIndex}
                                    cell={cell}
                                    cellStyle={getCellStyle(cell, rowIndex, colIndex)}
                                    cellContent={getCellContent(cell)}
                                    t={t}
                                    rowIndex={rowIndex}
                                    colIndex={colIndex}
                                    adjacency={adj}
                                />
                            );
                        })}

                        {/* Row doom indicators */}
                        <div className="flex-shrink-0 w-16 text-xs text-gray-400 ml-1">
                            {doomInfo.resolutions > 0 && (
                                <span className="text-red-500">💀×{doomInfo.resolutions} </span>
                            )}
                            {doomInfo.upgrades > 0 && (
                                <span className="text-orange-500">⬆️×{doomInfo.upgrades}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ResourceMatrix;
