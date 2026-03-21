import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getMachineCoverage, getCoveredResourcePoints } from '../../utils/matrixHelpers';
import { DIRECTION_ARROWS } from '../../data/matrixConfig';

const GRID_SIZE = 5;

const ResourceMatrix = ({ matrix, machinePos, machineDir, activeShape, orders = [], emergencyOrders = [], inventory = [] }) => {
    const { t } = useLanguage();

    const resourcePointMap = useMemo(() => {
        if (!matrix) return {};
        return Object.fromEntries(matrix.resourcePoints.map(rp => [rp.id, rp]));
    }, [matrix]);

    // Which cells belong to multi-cell resource points
    const multiCellSet = useMemo(() => {
        if (!matrix) return new Set();
        const set = new Set();
        for (const rp of matrix.resourcePoints) {
            if (rp.size > 1) {
                for (const [r, c] of rp.cells) set.add(`${r},${c}`);
            }
        }
        return set;
    }, [matrix]);

    // Current scan coverage
    const coverage = useMemo(() => {
        if (!matrix || !activeShape || machinePos == null) return null;
        const shapeCells = getMachineCoverage(activeShape, machinePos.row, machinePos.col, machineDir);
        const inBounds = shapeCells.filter(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
        const coveredRps = getCoveredResourcePoints(shapeCells, matrix.resourcePoints);
        return {
            cells: new Set(inBounds.map(([r, c]) => `${r},${c}`)),
            rpIds: new Set(coveredRps.map(rp => rp.id)),
            items: coveredRps.map(rp => rp.item),
        };
    }, [matrix, activeShape, machinePos, machineDir]);

    // Needed items
    const neededItemNames = useMemo(() => {
        const allOrders = [...orders.filter(Boolean), ...emergencyOrders.filter(Boolean)];
        const needed = new Set();
        for (const order of allOrders) {
            for (const req of order.requirements) {
                const satisfied = inventory.some(item =>
                    item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus
                );
                if (!satisfied) needed.add(req.name);
            }
        }
        return needed;
    }, [orders, emergencyOrders, inventory]);

    if (!matrix) {
        return <div className="flex items-center justify-center py-12 text-slate-400 text-sm">{t("生成矩阵中...")}</div>;
    }

    const machineKey = `${machinePos.row},${machinePos.col}`;

    // --- Grid cells ---
    const gridCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cellKey = `${r},${c}`;
            const cellData = matrix.grid[r][c];
            const isMachine = cellKey === machineKey;
            const isResourceCell = cellData?.type === 'resource';
            const isMultiCellPart = multiCellSet.has(cellKey);
            const isCovered = coverage?.cells?.has(cellKey) ?? false;

            const rpId = cellData?.resourcePointId ?? null;
            const rp = rpId ? resourcePointMap[rpId] : null;
            const isLeadCell = rp ? (rp.cells[0][0] === r && rp.cells[0][1] === c) : false;
            const isNeeded = rp && neededItemNames.has(rp.item.name);
            const rpCovered = rp && coverage?.rpIds?.has(rp.id);

            let cls = [
                'relative',
                'w-16 h-16 md:w-20 md:h-20',
                'rounded-lg border-2',
                'flex items-center justify-center',
                'transition-all duration-150 select-none',
            ];

            if (isMultiCellPart) {
                cls.push('bg-transparent border-transparent');
            } else if (isResourceCell && isNeeded) {
                cls.push('bg-white border-dashed border-green-500');
            } else if (isResourceCell) {
                cls.push('bg-white border-slate-200');
            } else {
                cls.push('bg-slate-100 border-slate-200');
            }

            if (!isMultiCellPart && rpCovered && isCovered) {
                cls.push('ring-2 ring-blue-400 ring-offset-1 z-10');
            }

            gridCells.push(
                <div key={cellKey} className={cls.join(' ')}>
                    {/* Machine */}
                    {isMachine && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl md:text-2xl font-black shadow-lg border-2 border-blue-300">
                                {DIRECTION_ARROWS[machineDir]}
                            </div>
                        </div>
                    )}

                    {/* Single-cell resource */}
                    {isResourceCell && rp && !isMultiCellPart && (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 px-1">
                            <span className="text-2xl md:text-3xl leading-none filter drop-shadow-sm">{rp.item.icon}</span>
                            {isLeadCell && (
                                <span className="text-[9px] md:text-[10px] font-bold leading-none truncate max-w-full text-center text-slate-600">
                                    {t(rp.item.name)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Coverage overlay */}
                    {isCovered && !isMultiCellPart && (
                        <div className="absolute inset-0 bg-blue-200/30 rounded-lg z-10" />
                    )}
                </div>
            );
        }
    }

    // --- Multi-cell overlays ---
    const multiCellOverlays = matrix.resourcePoints
        .filter(rp => rp.size > 1)
        .map(rp => {
            const rows = rp.cells.map(([r]) => r);
            const cols = rp.cells.map(([, c]) => c);
            const minR = Math.min(...rows), maxR = Math.max(...rows);
            const minC = Math.min(...cols), maxC = Math.max(...cols);
            const rowSpan = maxR - minR + 1, colSpan = maxC - minC + 1;
            const isNeededMulti = neededItemNames.has(rp.item.name);
            const rpCovered = coverage?.rpIds?.has(rp.id);

            const style = {
                position: 'absolute',
                top: `calc(${minR} * (var(--cell) + var(--gap)))`,
                left: `calc(${minC} * (var(--cell) + var(--gap)))`,
                width: `calc(${colSpan} * var(--cell) + ${colSpan - 1} * var(--gap))`,
                height: `calc(${rowSpan} * var(--cell) + ${rowSpan - 1} * var(--gap))`,
                zIndex: 5,
            };

            return (
                <div
                    key={rp.id}
                    className={`rounded-lg border-2 bg-white flex ${
                        isNeededMulti ? 'border-dashed border-green-500' : 'border-slate-200'
                    } ${rpCovered ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                    style={style}
                >
                    {rp.cells.map(([cr, cc], idx) => (
                        <div
                            key={`${cr},${cc}`}
                            className="flex flex-col items-center justify-center gap-0.5 px-1"
                            style={{
                                position: 'absolute',
                                top: `calc(${cr - minR} * (var(--cell) + var(--gap)))`,
                                left: `calc(${cc - minC} * (var(--cell) + var(--gap)))`,
                                width: 'var(--cell)',
                                height: 'var(--cell)',
                            }}
                        >
                            <span className="text-2xl md:text-3xl leading-none filter drop-shadow-sm">{rp.item.icon}</span>
                            {idx === 0 && (
                                <span className="text-[9px] md:text-[10px] font-bold leading-none truncate max-w-full text-center text-slate-600">
                                    {t(rp.item.name)}
                                </span>
                            )}
                        </div>
                    ))}
                    {rpCovered && <div className="absolute inset-0 bg-blue-200/30 rounded-lg z-10" />}
                </div>
            );
        });

    return (
        <div className="flex flex-col items-center gap-3">
            <style>{`
                .matrix-grid { --cell: 4rem; --gap: 0.5rem; }
                @media (min-width: 768px) { .matrix-grid { --cell: 5rem; } }
            `}</style>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div className="matrix-grid grid grid-cols-5 relative" style={{ gap: 'var(--gap)' }}>
                    {gridCells}
                    {multiCellOverlays}
                </div>
            </div>

            {/* Coverage info */}
            {coverage && coverage.items.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="font-bold text-blue-700">{t("扫描范围")}:</span>
                    {coverage.items.map((item, i) => (
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
