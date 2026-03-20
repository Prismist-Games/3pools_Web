import React, { useState, useMemo } from 'react';
import { Anchor } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getShapeCells, isValidPlacement, getCoveredResourcePoints } from '../../utils/matrixHelpers';

const GRID_SIZE = 5;

const ResourceMatrix = ({ matrix, selectedShape, orientation, onCellClick, disabled, gold }) => {
    const { t } = useLanguage();
    const [hoveredCell, setHoveredCell] = useState(null); // { row, col } | null

    // Build a lookup: resourcePointId -> resourcePoint object
    const resourcePointMap = useMemo(() => {
        if (!matrix) return {};
        return Object.fromEntries(matrix.resourcePoints.map(rp => [rp.id, rp]));
    }, [matrix]);

    // Build a lookup: "r,c" -> first cell index within the resource point (to know if it's the lead cell)
    const leadCellSet = useMemo(() => {
        if (!matrix) return new Set();
        const set = new Set();
        for (const rp of matrix.resourcePoints) {
            if (rp.cells.length > 0) {
                const [r, c] = rp.cells[0];
                set.add(`${r},${c}`);
            }
        }
        return set;
    }, [matrix]);

    // Compute hover preview: which cells are highlighted, and whether placement is valid
    const preview = useMemo(() => {
        if (!hoveredCell || !selectedShape || !matrix || disabled) return null;

        const { row, col } = hoveredCell;
        const shapeCells = getShapeCells(selectedShape, row, col, orientation);

        // Filter to in-bounds cells only for display; validity check uses all cells
        const inBounds = shapeCells.filter(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
        const valid = isValidPlacement(shapeCells, GRID_SIZE, matrix.anchors);
        const coveredResourcePoints = valid
            ? getCoveredResourcePoints(shapeCells, matrix.resourcePoints)
            : [];
        const coveredRpIds = new Set(coveredResourcePoints.map(rp => rp.id));

        const highlightedCells = new Set(inBounds.map(([r, c]) => `${r},${c}`));

        return { highlightedCells, valid, coveredRpIds };
    }, [hoveredCell, selectedShape, orientation, matrix, disabled]);

    if (!matrix) {
        return (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium">
                {t("生成矩阵中...")}
            </div>
        );
    }

    const handleMouseEnter = (row, col) => {
        if (!disabled && selectedShape) {
            setHoveredCell({ row, col });
        }
    };

    const handleMouseLeave = () => {
        setHoveredCell(null);
    };

    const handleClick = (row, col) => {
        if (!disabled && selectedShape && onCellClick) {
            onCellClick(row, col);
        }
    };

    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellKey = `${r},${c}`;
            const cellData = matrix.grid[r][c]; // null | { type, resourcePointId? }

            const isHighlighted = preview?.highlightedCells?.has(cellKey) ?? false;
            const isValidPreview = preview?.valid ?? false;

            // Determine cell type
            const isEmpty = cellData === null;
            const isResourceCell = cellData?.type === 'resource' || cellData?.type === 'resource_anchor';
            const isAnchorCell = cellData?.type === 'anchor' || cellData?.type === 'resource_anchor';

            // Resource point info
            const rpId = cellData?.resourcePointId ?? null;
            const rp = rpId ? resourcePointMap[rpId] : null;
            const isLeadCell = leadCellSet.has(cellKey);
            const isCoveredByPreview = rp && preview?.coveredRpIds?.has(rp.id);

            // Build cell visual classes
            let cellClasses = [
                'relative',
                'w-14 h-14 md:w-16 md:h-16',
                'aspect-square',
                'rounded-lg',
                'border-2',
                'flex items-center justify-center',
                'transition-all duration-150',
                'select-none',
                'overflow-hidden',
            ];

            // Cursor
            if (!disabled && selectedShape) {
                cellClasses.push('cursor-pointer');
            } else {
                cellClasses.push('cursor-default');
            }

            // Base background and border based on cell type
            if (isResourceCell && rp) {
                // Use rarity color classes (e.g. "bg-blue-50 border-blue-400 ...")
                // The rarity.color string contains multiple Tailwind classes
                cellClasses.push(rp.rarity.color);
            } else if (isAnchorCell && !isResourceCell) {
                cellClasses.push('bg-amber-100 border-amber-400');
            } else {
                // Empty cell
                cellClasses.push('bg-slate-100 border-slate-200');
            }

            // Hover preview overlay classes (applied via a separate overlay div)
            let overlayClasses = null;
            if (isHighlighted) {
                overlayClasses = isValidPreview
                    ? 'absolute inset-0 bg-green-200/50 rounded-lg z-10'
                    : 'absolute inset-0 bg-red-200/50 rounded-lg z-10';
            }

            // Extra emphasis for covered resource points
            if (isCoveredByPreview && isHighlighted && isValidPreview) {
                cellClasses.push('ring-2 ring-green-400 ring-offset-1');
            }

            cells.push(
                <div
                    key={cellKey}
                    className={cellClasses.join(' ')}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(r, c)}
                >
                    {/* Resource point content */}
                    {isResourceCell && rp && isLeadCell && (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 px-0.5">
                            <span className="text-xl leading-none filter drop-shadow-sm">
                                {rp.item.icon}
                            </span>
                            <span className="text-[9px] font-bold leading-none truncate max-w-full text-center">
                                {t(rp.item.name)}
                            </span>
                            {/* Rarity dot */}
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${rp.rarity.dotColor}`}
                                title={t(rp.rarity.name)}
                            />
                        </div>
                    )}

                    {/* Non-lead multi-cell resource point: connecting indicator */}
                    {isResourceCell && rp && !isLeadCell && (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className={`w-2 h-2 rounded-full opacity-60 ${rp.rarity.dotColor}`} />
                        </div>
                    )}

                    {/* Anchor indicator (shown on top of resource content when resource_anchor) */}
                    {isAnchorCell && (
                        <div
                            className={`
                                flex items-center justify-center
                                ${isResourceCell
                                    ? 'absolute top-0.5 right-0.5 z-20 bg-amber-200/80 rounded p-0.5'
                                    : 'w-full h-full'
                                }
                            `}
                        >
                            <Anchor
                                size={isResourceCell ? 10 : 20}
                                className="text-amber-600"
                                strokeWidth={2.5}
                            />
                        </div>
                    )}

                    {/* Hover preview overlay */}
                    {overlayClasses && (
                        <div className={overlayClasses} />
                    )}
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                <div className="grid grid-cols-5 gap-1">
                    {cells}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-400" />
                    <Anchor size={8} className="text-amber-600" />
                    {t("锚点")}
                </span>
                {selectedShape && !disabled && (
                    <>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-green-200/80" />
                            {t("有效放置")}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-red-200/80" />
                            {t("无效放置")}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResourceMatrix;
