import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getShapeCellsAtAnchor, getCoveredResourcePoints } from '../../utils/matrixHelpers';

const GRID_SIZE = 5;

const ResourceMatrix = ({ matrix, hoveredShape, orientation, disabled }) => {
    const { t } = useLanguage();

    // Build a lookup: resourcePointId -> resourcePoint object
    const resourcePointMap = useMemo(() => {
        if (!matrix) return {};
        return Object.fromEntries(matrix.resourcePoints.map(rp => [rp.id, rp]));
    }, [matrix]);

    // Compute preview: shape placement from player position when a shape is hovered
    const preview = useMemo(() => {
        if (!hoveredShape || !matrix || !matrix.playerPosition || disabled) return null;

        const { row, col } = matrix.playerPosition;
        const shapeCells = getShapeCellsAtAnchor(hoveredShape, row, col, orientation);

        const inBounds = shapeCells.every(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
        const inBoundsCells = shapeCells.filter(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);

        const coveredResourcePoints = inBounds
            ? getCoveredResourcePoints(shapeCells, matrix.resourcePoints)
            : [];
        const coveredRpIds = new Set(coveredResourcePoints.map(rp => rp.id));

        const highlightedCells = new Set(inBoundsCells.map(([r, c]) => `${r},${c}`));

        return { highlightedCells, valid: inBounds, coveredRpIds, coveredResourcePoints };
    }, [hoveredShape, orientation, matrix, disabled]);

    if (!matrix) {
        return (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium">
                {t("生成矩阵中...")}
            </div>
        );
    }

    const playerKey = `${matrix.playerPosition.row},${matrix.playerPosition.col}`;

    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellKey = `${r},${c}`;
            const cellData = matrix.grid[r][c];
            const isPlayerCell = cellKey === playerKey;

            const isHighlighted = preview?.highlightedCells?.has(cellKey) ?? false;
            const isValidPreview = preview?.valid ?? false;

            const isResourceCell = cellData?.type === 'resource';
            const isAnchorCell = cellData?.type === 'anchor';

            const rpId = cellData?.resourcePointId ?? null;
            const rp = rpId ? resourcePointMap[rpId] : null;
            const isCoveredByPreview = rp && preview?.coveredRpIds?.has(rp.id);

            // Build cell classes
            let cellClasses = [
                'relative',
                'w-14 h-14 md:w-16 md:h-16',
                'rounded-lg',
                'border-2',
                'flex items-center justify-center',
                'transition-all duration-150',
                'select-none',
                'overflow-hidden',
                'cursor-default',
            ];

            // Base styling
            if (isPlayerCell) {
                cellClasses.push('bg-blue-100 border-blue-400 shadow-md');
            } else if (isAnchorCell) {
                cellClasses.push('bg-amber-50 border-amber-300');
            } else if (isResourceCell) {
                cellClasses.push('bg-white border-slate-200');
            } else {
                cellClasses.push('bg-slate-100 border-slate-200');
            }

            // Hover preview emphasis for covered resource points
            if (isCoveredByPreview && isHighlighted && isValidPreview) {
                cellClasses.push('ring-2 ring-green-400 ring-offset-1 z-10');
            }

            // Hover preview overlay
            let overlayClasses = null;
            if (isHighlighted) {
                overlayClasses = isValidPreview
                    ? 'absolute inset-0 bg-green-300/40 rounded-lg z-10'
                    : 'absolute inset-0 bg-red-300/40 rounded-lg z-10';
            }

            cells.push(
                <div key={cellKey} className={cellClasses.join(' ')}>
                    {/* Player marker */}
                    {isPlayerCell && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <User size={28} className="text-blue-500" strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Resource point: show icon + name on ALL cells of the resource */}
                    {isResourceCell && rp && (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 px-0.5">
                            <span className="text-xl leading-none filter drop-shadow-sm">
                                {rp.item.icon}
                            </span>
                            <span className="text-[8px] font-bold leading-none truncate max-w-full text-center text-slate-600">
                                {t(rp.item.name)}
                            </span>
                        </div>
                    )}

                    {/* Anchor marker (non-player anchors) */}
                    {isAnchorCell && !isPlayerCell && (
                        <div className="flex items-center justify-center w-full h-full opacity-40">
                            <div className="w-3 h-3 rounded-full bg-amber-400" />
                        </div>
                    )}

                    {/* Hover preview overlay */}
                    {overlayClasses && <div className={overlayClasses} />}
                </div>
            );
        }
    }

    // List covered items for display below the grid
    const coveredItems = preview?.coveredResourcePoints?.map(rp => rp.item) ?? [];

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                <div className="grid grid-cols-5 gap-1.5">
                    {cells}
                </div>
            </div>

            {/* Covered items display */}
            {coveredItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <span className="font-bold text-green-700">{t("覆盖资源点")}:</span>
                    {coveredItems.map((item, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                            <span>{item.icon}</span>
                            <span className="font-medium">{t(item.name)}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResourceMatrix;
