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
    // Map item name → { rarity, isEmergency } for unsatisfied order needs
    const neededItemMap = useMemo(() => {
        const map = {}; // name → { rarity, isEmergency }
        // Normal orders
        for (const order of orders.filter(Boolean)) {
            for (const req of order.requirements) {
                const satisfied = inventory.some(item =>
                    item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus
                );
                if (!satisfied) {
                    const existing = map[req.name];
                    if (!existing || req.requiredRarity.bonus > existing.rarity.bonus) {
                        map[req.name] = { rarity: req.requiredRarity, isEmergency: existing?.isEmergency || false };
                    }
                }
            }
        }
        // Emergency orders (override isEmergency flag)
        for (const order of emergencyOrders.filter(Boolean)) {
            for (const req of order.requirements) {
                const satisfied = inventory.some(item =>
                    item && item.name === req.name && item.rarity.bonus >= req.requiredRarity.bonus
                );
                if (!satisfied) {
                    const existing = map[req.name];
                    if (!existing || req.requiredRarity.bonus > existing.rarity.bonus) {
                        map[req.name] = { rarity: req.requiredRarity, isEmergency: true };
                    } else if (existing) {
                        existing.isEmergency = true;
                    }
                }
            }
        }
        return map;
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
            const isExitCell = cellData?.type === 'exit';
            const isMultiCellPart = multiCellSet.has(cellKey);
            const isCovered = coverage?.cells?.has(cellKey) ?? false;

            const rpId = cellData?.resourcePointId ?? null;
            const rp = rpId ? resourcePointMap[rpId] : null;
            const isLeadCell = rp ? (rp.cells[0][0] === r && rp.cells[0][1] === c) : false;
            const neededInfo = rp ? neededItemMap[rp.item.name] : null;
            const rpCovered = rp && coverage?.rpIds?.has(rp.id);

            let cls = [
                'relative',
                'w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16',
                'rounded-lg border-2',
                'flex items-center justify-center',
                'transition-all duration-150 select-none',
            ];

            if (isMultiCellPart) {
                cls.push('bg-transparent border-transparent');
            } else if (isExitCell) {
                cls.push('bg-yellow-100 border-yellow-500');
            } else if (isResourceCell && rp) {
                cls.push(rp.rarity.color);
            } else {
                cls.push('bg-slate-100 border-slate-200');
            }

            if (!isMultiCellPart && rpCovered && isCovered) {
                cls.push('ring-2 ring-blue-400 ring-offset-1 z-10');
            }

            gridCells.push(
                <div key={cellKey} className={cls.join(' ')}>
                    {/* Machine indicator — small corner badge, doesn't cover item */}
                    {isMachine && (
                        <div className="absolute top-0 left-0 z-20 w-5 h-5 md:w-6 md:h-6 rounded-br-lg bg-blue-500 text-white flex items-center justify-center text-[10px] md:text-xs font-black shadow border-r border-b border-blue-300">
                            {DIRECTION_ARROWS[machineDir]}
                        </div>
                    )}

                    {/* Exit tile */}
                    {isExitCell && (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                            <span className="text-lg md:text-xl">🚪</span>
                            <span className="text-[7px] md:text-[8px] font-black text-yellow-700 leading-none">{t("出口")}</span>
                        </div>
                    )}

                    {/* Single-cell resource */}
                    {isResourceCell && rp && !isMultiCellPart && (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 px-1">
                            <span className="text-lg md:text-xl lg:text-2xl leading-none filter drop-shadow-sm">{rp.item.icon}</span>
                            {isLeadCell && (
                                <span className="text-[9px] md:text-[10px] font-bold leading-none truncate max-w-full text-center text-slate-600">
                                    {t(rp.item.name)}
                                </span>
                            )}
                            {neededInfo && (
                                <div className="absolute -top-1 -right-1 flex items-center gap-px z-[2]">
                                    {neededInfo.isEmergency && <span className="text-[9px] drop-shadow">🚚</span>}
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${neededInfo.rarity.dotColor}`} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Coverage overlay */}
                    {isCovered && !isMultiCellPart && (
                        <div className="absolute inset-0 bg-blue-300/40 rounded-lg z-10" />
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
            const neededInfoMulti = neededItemMap[rp.item.name];
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
                    className={`rounded-lg border-2 flex ${rp.rarity.color} ${
                        rpCovered ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                    }`}
                    style={style}
                >
                    {neededInfoMulti && (
                        <div className="absolute -top-1 -right-1 flex items-center gap-px z-[6]">
                            {neededInfoMulti.isEmergency && <span className="text-[9px] drop-shadow">🚚</span>}
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${neededInfoMulti.rarity.dotColor}`} />
                        </div>
                    )}
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
                            <span className="text-lg md:text-xl lg:text-2xl leading-none filter drop-shadow-sm">{rp.item.icon}</span>
                            {idx === 0 && (
                                <span className="text-[9px] md:text-[10px] font-bold leading-none truncate max-w-full text-center text-slate-600">
                                    {t(rp.item.name)}
                                </span>
                            )}
                        </div>
                    ))}
                    {rpCovered && <div className="absolute inset-0 bg-blue-300/40 rounded-lg z-10" />}
                </div>
            );
        });

    return (
        <div className="flex flex-col items-center gap-3">
            <style>{`
                .matrix-grid { --cell: 3rem; --gap: 0.375rem; }
                @media (min-width: 768px) { .matrix-grid { --cell: 3.5rem; } }
                @media (min-width: 1024px) { .matrix-grid { --cell: 4rem; } }
            `}</style>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
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
