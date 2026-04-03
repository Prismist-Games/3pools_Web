import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const GRID_SIZE = 4;

const RARITY_BG = {
    common: 'bg-slate-100 border-slate-300',
    uncommon: 'bg-green-50 border-green-400',
    rare: 'bg-blue-50 border-blue-400',
    epic: 'bg-purple-50 border-purple-400',
    legendary: 'bg-orange-50 border-orange-400',
    mythic: 'bg-red-50 border-red-400',
};

const ResourceMatrix = React.forwardRef(({ matrix, gravityEvent, pickingCell, explodingCells, onSelectRow, onSelectCol, disabled, lastDrawCell, orders = [], emergencyOrders = [], inventory = [], drawAnimation, onDrawAnimationComplete, onHoveredItemsChange }, ref) => {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    // 悬浮行/列时，收集该行/列中的物品名通知上层（用于订单高亮联动）
    useEffect(() => {
        if (!matrix || !onHoveredItemsChange) return;
        const names = [];
        const gridSize = matrix.length;
        if (hoveredRow !== null) {
            for (let c = 0; c < gridSize; c++) {
                const cell = matrix[hoveredRow]?.[c];
                if (cell?.item?.name) names.push(cell.item.name);
            }
        } else if (hoveredCol !== null) {
            for (let r = 0; r < gridSize; r++) {
                const cell = matrix[r]?.[hoveredCol];
                if (cell?.item?.name) names.push(cell.item.name);
            }
        }
        onHoveredItemsChange(names);
    }, [hoveredRow, hoveredCol, matrix, onHoveredItemsChange]);

    // Gravity animation state
    const [animatingCells, setAnimatingCells] = useState(new Set());
    const [newTopCells, setNewTopCells] = useState(new Set());
    const lastTickRef = useRef(null);

    // Draw cycling animation state
    const [cyclingHighlight, setCyclingHighlight] = useState(null); // { row, col } of currently highlighted cell
    const [cyclingLine, setCyclingLine] = useState(null); // { type: 'row'|'col', index } of selected line
    const [cyclingPulse, setCyclingPulse] = useState(null); // { row, col } of final cell during pulse
    const animTickRef = useRef(null);
    const animTimersRef = useRef([]);

    // Cleanup animation timers on unmount
    useEffect(() => {
        return () => {
            animTimersRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

    // Draw cycling animation effect
    useEffect(() => {
        if (!drawAnimation || drawAnimation.tick === animTickRef.current) return;
        animTickRef.current = drawAnimation.tick;

        // Clear any previous animation timers
        animTimersRef.current.forEach(t => clearTimeout(t));
        animTimersRef.current = [];

        const { type, index, targetIdx } = drawAnimation;

        // Set the line highlight (subtle highlight for all cells in the row/col)
        setCyclingLine({ type, index });
        setCyclingPulse(null);

        // Build the sequence of cells to cycle through
        // For rows: columns 0,1,2,3,0,1,2,3,... ; for cols: rows 0,1,2,3,0,1,2,3,...
        // We'll do ~3 full cycles then approach the target
        const fullCycles = 3;
        const sequence = [];
        for (let cycle = 0; cycle < fullCycles; cycle++) {
            for (let i = 0; i < GRID_SIZE; i++) {
                sequence.push(i);
            }
        }
        // After the full cycles, continue from 0 up to and including the target
        for (let i = 0; i <= targetIdx; i++) {
            sequence.push(i);
        }

        // Calculate delays: start fast (~80ms), gradually slow to ~250ms
        // Use an easing curve: each step is slightly slower than the last
        const totalSteps = sequence.length;
        const minDelay = 60;
        const maxDelay = 280;
        const delays = [];
        for (let i = 0; i < totalSteps; i++) {
            // Ease-in curve: slow at the end
            const progress = i / (totalSteps - 1);
            // Use cubic easing for a natural deceleration feel
            const eased = progress * progress * progress;
            delays.push(Math.round(minDelay + (maxDelay - minDelay) * eased));
        }

        // Schedule each highlight step
        let cumulativeDelay = 0;
        for (let step = 0; step < totalSteps; step++) {
            const cellIdx = sequence[step];
            const delay = delays[step];
            cumulativeDelay += delay;

            const timer = setTimeout(() => {
                if (type === 'row') {
                    setCyclingHighlight({ row: index, col: cellIdx });
                } else {
                    setCyclingHighlight({ row: cellIdx, col: index });
                }
            }, cumulativeDelay);
            animTimersRef.current.push(timer);
        }

        // After the last step, wait a beat, then pulse, then complete
        const pauseBeforePulse = 200;
        const pulseDuration = 400;
        const pauseAfterPulse = 150;

        const pulseTimer = setTimeout(() => {
            // Set the pulse effect on the final cell
            if (type === 'row') {
                setCyclingPulse({ row: index, col: targetIdx });
            } else {
                setCyclingPulse({ row: targetIdx, col: index });
            }
        }, cumulativeDelay + pauseBeforePulse);
        animTimersRef.current.push(pulseTimer);

        const completeTimer = setTimeout(() => {
            // Clean up animation state and notify completion
            setCyclingHighlight(null);
            setCyclingLine(null);
            setCyclingPulse(null);
            onDrawAnimationComplete?.();
        }, cumulativeDelay + pauseBeforePulse + pulseDuration + pauseAfterPulse);
        animTimersRef.current.push(completeTimer);

    }, [drawAnimation, onDrawAnimationComplete]);

    useEffect(() => {
        if (!gravityEvent || gravityEvent.tick === lastTickRef.current) return;
        lastTickRef.current = gravityEvent.tick;

        const dropping = new Set();
        const tops = new Set();

        const { col, removedRow } = gravityEvent;
        for (let r = 0; r <= removedRow; r++) {
            dropping.add(`${r},${col}`);
        }
        tops.add(`0,${col}`);

        if (gravityEvent.col2 !== undefined) {
            for (let r = 0; r <= gravityEvent.removedRow2; r++) {
                dropping.add(`${r},${gravityEvent.col2}`);
            }
            tops.add(`0,${gravityEvent.col2}`);
        }

        setAnimatingCells(dropping);
        setNewTopCells(tops);

        const timer = setTimeout(() => {
            setAnimatingCells(new Set());
            setNewTopCells(new Set());
        }, 300);

        return () => clearTimeout(timer);
    }, [gravityEvent]);

    // Needed items from orders (unsatisfied) — for dot indicator
    const neededItemMap = useMemo(() => {
        const map = {};
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

    const isRowDisabled = (rowIdx) => {
        if (disabled) return true;
        if (lastDrawCell && rowIdx !== lastDrawCell.row) return true;
        return false;
    };

    const isColDisabled = (colIdx) => {
        if (disabled) return true;
        if (lastDrawCell && colIdx !== lastDrawCell.col) return true;
        return false;
    };

    const handleRowClick = (rowIdx) => {
        if (isRowDisabled(rowIdx)) return;
        onSelectRow?.(rowIdx);
    };

    const handleColClick = (colIdx) => {
        if (isColDisabled(colIdx)) return;
        onSelectCol?.(colIdx);
    };

    // Single unified grid: (GRID_SIZE+1) columns × (GRID_SIZE+1) rows
    // [0,0] = empty corner, [0,1..N] = col buttons, [1..N,0] = row buttons, [1..N,1..N] = cells
    return (
        <div className="flex flex-col items-center">
            <style>{`
                .matrix-unified {
                    --cell: 3.5rem;
                    --gap: 0.25rem;
                    --btn-w: 2.5rem;
                    --btn-h: 2.5rem;
                    display: grid;
                    grid-template-columns: var(--btn-w) repeat(${GRID_SIZE}, var(--cell));
                    grid-template-rows: var(--btn-h) repeat(${GRID_SIZE}, var(--cell));
                    gap: var(--gap);
                }
                @media (min-width: 768px) { .matrix-unified { --cell: 4rem; } }
                @media (min-width: 1024px) { .matrix-unified { --cell: 4.5rem; } }

                @keyframes gravity-drop {
                    0% { transform: translateY(calc(-1 * (var(--cell) + var(--gap)))); }
                    100% { transform: translateY(0); }
                }
                @keyframes fade-in-top {
                    0% { opacity: 0; transform: translateY(calc(-0.5 * var(--cell))); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .anim-drop { animation: gravity-drop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .anim-new-top { animation: fade-in-top 0.3s ease-out forwards; }

                @keyframes cycling-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
                    50% { box-shadow: 0 0 16px 6px rgba(250, 204, 21, 0.5); }
                    100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
                }
                .anim-cycling-pulse {
                    animation: cycling-pulse 0.4s ease-out forwards;
                }

                @keyframes last-draw-glow {
                    0%, 100% { box-shadow: 0 0 6px 2px rgba(250, 204, 21, 0.4); }
                    50% { box-shadow: 0 0 12px 4px rgba(250, 204, 21, 0.7); }
                }
                .anim-last-draw {
                    animation: last-draw-glow 2s ease-in-out infinite;
                }

            `}</style>

            <div className="matrix-unified" ref={ref}>
                {/* [0,0] empty corner */}
                <div />

                {/* [0, 1..N] column buttons */}
                {Array.from({ length: GRID_SIZE }).map((_, c) => {
                    const colDisabled = isColDisabled(c);
                    const colAvailable = !colDisabled && lastDrawCell && lastDrawCell.col === c;
                    return (
                        <button
                            key={`col-${c}`}
                            onClick={() => handleColClick(c)}
                            onMouseEnter={() => setHoveredCol(c)}
                            onMouseLeave={() => setHoveredCol(null)}
                            disabled={colDisabled}
                            className={`
                                flex items-center justify-center font-black text-xs
                                transition-all duration-150 rounded-t-lg border-2 border-b-0 self-end
                                ${colDisabled ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-300 border-slate-200' : 'cursor-pointer hover:scale-105 active:scale-95'}
                                ${hoveredCol === c && !colDisabled
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                                    : colAvailable
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-400 shadow-md hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-500'
                                        : !colDisabled
                                            ? 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                                            : ''
                                }
                            `}
                        >
                            {t("列")}{c + 1}
                        </button>
                    );
                })}

                {/* Data rows: [r+1, 0] = row button, [r+1, c+1] = cell */}
                {matrix.map((row, r) => (
                    <React.Fragment key={`row-${r}`}>
                        {/* Row button */}
                        {(() => {
                            const rowDisabled = isRowDisabled(r);
                            const rowAvailable = !rowDisabled && lastDrawCell && lastDrawCell.row === r;
                            return (
                                <button
                                    onClick={() => handleRowClick(r)}
                                    onMouseEnter={() => setHoveredRow(r)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    disabled={rowDisabled}
                                    className={`
                                        flex items-center justify-center font-black text-xs
                                        transition-all duration-150 rounded-l-lg border-2 border-r-0 self-center
                                        ${rowDisabled ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-300 border-slate-200' : 'cursor-pointer hover:scale-105 active:scale-95'}
                                        ${hoveredRow === r && !rowDisabled
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                                            : rowAvailable
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-400 shadow-md hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-500'
                                                : !rowDisabled
                                                    ? 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                                                    : ''
                                        }
                                    `}
                                    style={{ height: 'var(--cell)' }}
                                >
                                    {t("行")}{r + 1}
                                </button>
                            );
                        })()}

                        {/* Matrix cells for this row */}
                        {row.map((cell, c) => {
                            const cellKey = `${r},${c}`;
                            const isPicking = pickingCell && pickingCell.row === r && pickingCell.col === c;
                            const isHighlighted = (hoveredRow === r || hoveredCol === c) && !disabled;
                            const cellType = cell.type || 'normal';
                            const isFiller = cellType === 'filler';
                            const bgClass = isFiller
                                ? 'bg-slate-100 border-slate-300'
                                : (RARITY_BG[cell.rarity.id] || RARITY_BG.common);
                            const neededInfo = !isFiller ? neededItemMap[cell.item.name] : null;
                            const isDropping = animatingCells.has(cellKey) && !newTopCells.has(cellKey);
                            const isNewTop = newTopCells.has(cellKey);

                            // Cycling animation highlights
                            const isCyclingTarget = cyclingHighlight && cyclingHighlight.row === r && cyclingHighlight.col === c;
                            const isInCyclingLine = cyclingLine && (
                                (cyclingLine.type === 'row' && cyclingLine.index === r) ||
                                (cyclingLine.type === 'col' && cyclingLine.index === c)
                            );
                            const isPulsing = cyclingPulse && cyclingPulse.row === r && cyclingPulse.col === c;

                            // Persistent highlight for last drawn cell (lower priority than cycling animation)
                            const isLastDrawCell = lastDrawCell && lastDrawCell.row === r && lastDrawCell.col === c;
                            const hasCyclingEffect = isCyclingTarget || isInCyclingLine || isPulsing;
                            const showLastDrawHighlight = isLastDrawCell && !hasCyclingEffect;

                            return (
                                <div
                                    key={`${r}-${c}-${cell.uid}`}
                                    className={`
                                        relative flex flex-col items-center justify-center
                                        rounded-lg border-2 select-none
                                        ${isPicking ? 'bg-slate-200 border-slate-300' : bgClass}
                                        ${isCyclingTarget ? 'ring-4 ring-yellow-400 ring-offset-1 z-20 scale-110 border-yellow-500' : ''}
                                        ${!isCyclingTarget && isInCyclingLine && !isPicking ? 'ring-2 ring-amber-200 ring-offset-1 z-10' : ''}
                                        ${isPulsing ? 'anim-cycling-pulse ring-4 ring-yellow-400 ring-offset-1 z-20 scale-110 border-yellow-500' : ''}
                                        ${showLastDrawHighlight ? 'anim-last-draw ring-3 ring-yellow-400 ring-offset-2 z-10 border-yellow-400 scale-105' : ''}
                                        ${!isCyclingTarget && !isInCyclingLine && !isPulsing && !showLastDrawHighlight && isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1 z-10 scale-105' : ''}
                                        ${isDropping ? 'anim-drop' : ''}
                                        ${isNewTop ? 'anim-new-top' : ''}
                                        ${!isDropping && !isNewTop ? 'transition-all duration-150' : ''}
                                    `}
                                >
                                    {!isPicking && (
                                        <div className={`flex flex-col items-center justify-center ${isFiller ? 'opacity-40' : ''}`}>
                                            <span className="text-lg md:text-xl lg:text-2xl leading-none filter drop-shadow-sm">
                                                {cell.item.icon}
                                            </span>
                                            {!isFiller && (
                                                <span className="text-[8px] md:text-[9px] font-bold leading-none truncate max-w-full text-center text-slate-600 mt-0.5 px-0.5">
                                                    {t(cell.item.name)}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Order needed indicator */}
                                    {!isPicking && neededInfo && (
                                        <div className="absolute -top-1 -right-1 flex items-center gap-px z-[2]">
                                            {neededInfo.isEmergency && <span className="text-[9px] drop-shadow">🚚</span>}
                                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${neededInfo.rarity.dotColor}`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
});

ResourceMatrix.displayName = 'ResourceMatrix';

export default ResourceMatrix;
