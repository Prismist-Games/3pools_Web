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
const GridCell = ({ cell, cellStyle, cellContent, t }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade');

    return (
        <div
            ref={ref}
            className={`
                w-14 h-14 border rounded flex flex-col items-center justify-center
                ${cellStyle}
            `}
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
const ResourceMatrix = ({ matrix, onSelectRow, gold, drawCost, phase }) => {
    const { t } = useLanguage();

    if (!matrix) return null;

    const canDraw = phase === 'drawing' && gold >= drawCost;

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

    const getCellStyle = (cell) => {
        if (cell === null) return 'bg-gray-100 border-gray-200';
        if (cell.type === 'item') return 'bg-white border-gray-300';
        if (cell.type === 'doom_resolution') return 'bg-red-50 border-red-300';
        if (cell.type === 'doom_upgrade') return 'bg-orange-50 border-orange-300';
        return 'bg-white border-gray-300';
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

    return (
        <div className="flex flex-col gap-1">
            <div className="text-center text-sm text-gray-500 mb-1">
                {t('选择一行抽取')}
            </div>
            {matrix.map((row, rowIndex) => {
                const doomInfo = getRowDoomInfo(row);
                const activeCount = getRowActiveCount(row);
                const hasActiveCells = activeCount > 0;
                const rowClickable = canDraw && hasActiveCells;

                return (
                    <div key={rowIndex} className="flex items-center gap-1">
                        {/* Row select button */}
                        <button
                            onClick={() => rowClickable && onSelectRow(rowIndex)}
                            disabled={!rowClickable}
                            className={`
                                w-8 h-8 rounded text-xs font-bold flex-shrink-0
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

                        {/* Grid cells */}
                        {row.map((cell, colIndex) => (
                            <GridCell
                                key={colIndex}
                                cell={cell}
                                cellStyle={getCellStyle(cell)}
                                cellContent={getCellContent(cell)}
                                t={t}
                            />
                        ))}

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
