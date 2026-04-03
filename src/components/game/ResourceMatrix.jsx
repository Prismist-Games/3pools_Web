import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

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

    const getCellLabel = (cell) => {
        if (cell === null) return '';
        if (cell.type === 'item') return cell.item.name;
        if (cell.type === 'doom_resolution') return cell.name;
        if (cell.type === 'doom_upgrade') return cell.name;
        return '';
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
                            <div
                                key={colIndex}
                                className={`
                                    w-14 h-14 border rounded flex flex-col items-center justify-center
                                    ${getCellStyle(cell)}
                                `}
                                title={getCellLabel(cell)}
                            >
                                {getCellContent(cell)}
                                {cell !== null && cell.type === 'item' && (
                                    <span className="text-[9px] text-gray-500 leading-none mt-0.5 truncate max-w-[48px]">
                                        {cell.item.name}
                                    </span>
                                )}
                            </div>
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
