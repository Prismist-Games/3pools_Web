import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const GRID_SIZE = 4;

// Portal tooltip for special cells (gold_penalty / bomb), same style as ToolItemTooltip
const SpecialCellTooltip = ({ cell, cellType, anchorRef, visible }) => {
    const { t } = useLanguage();
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        if (!visible || !anchorRef.current) { setPos(null); return; }
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, [visible, anchorRef]);

    if (!visible || !pos) return null;

    const isGold = cellType === 'gold_penalty';
    const icon = isGold ? '🪙' : '💣';
    const name = isGold ? t("金币陷阱") : t("炸弹");
    const desc = isGold
        ? t("扣除{cost}金币").replace('{cost}', cell.goldCost)
        : t("炸弹：摧毁周围8格");

    return createPortal(
        <div
            style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)', zIndex: 99999, pointerEvents: 'none' }}
            className="animate-in fade-in zoom-in-95 duration-150"
        >
            <div className={`bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border ${isGold ? 'border-amber-400/30' : 'border-red-400/30'} min-w-[140px] max-w-[200px]`}>
                <div className="flex items-center gap-2 mb-1 border-b border-slate-700 pb-1">
                    <span className="text-lg">{icon}</span>
                    <span className={`font-black text-sm ${isGold ? 'text-amber-300' : 'text-red-300'}`}>{name}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{desc}</p>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
            </div>
        </div>,
        document.body
    );
};

const RARITY_BG = {
    common: 'bg-slate-100 border-slate-300',
    uncommon: 'bg-green-50 border-green-400',
    rare: 'bg-blue-50 border-blue-400',
    epic: 'bg-purple-50 border-purple-400',
    legendary: 'bg-orange-50 border-orange-400',
    mythic: 'bg-red-50 border-red-400',
};

const SPECIAL_BG = {
    gold_penalty: 'bg-amber-50 border-amber-400',
    bomb: 'bg-red-50 border-red-400',
};

// Wrapper that provides ref + hover state for special cells, pass-through for normal cells
const SpecialCellWrapper = ({ cell, cellType, isSpecial, children }) => {
    const [hovered, setHovered] = useState(false);
    const cellRef = useRef(null);

    if (!isSpecial) {
        return children(undefined, () => {});
    }

    return (
        <>
            {children(cellRef, setHovered)}
            <SpecialCellTooltip cell={cell} cellType={cellType} anchorRef={cellRef} visible={hovered} />
        </>
    );
};

const ResourceMatrix = React.forwardRef(({ matrix, gravityEvent, pickingCell, explodingCells, onSelectRow, onSelectCol, disabled, orders = [], emergencyOrders = [], inventory = [], onHoverItems }, ref) => {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    // Report hovered item names to parent
    useEffect(() => {
        if (!onHoverItems || !matrix) return;
        const names = new Set();
        if (hoveredRow !== null) {
            for (const cell of matrix[hoveredRow]) {
                if (cell.type === 'normal' || !cell.type) names.add(cell.item.name);
            }
        }
        if (hoveredCol !== null) {
            for (const row of matrix) {
                const cell = row[hoveredCol];
                if (cell.type === 'normal' || !cell.type) names.add(cell.item.name);
            }
        }
        onHoverItems(names.size > 0 ? names : null);
    }, [hoveredRow, hoveredCol, matrix, onHoverItems]);

    // Gravity animation state
    const [animatingCells, setAnimatingCells] = useState(new Set());
    const [newTopCells, setNewTopCells] = useState(new Set());
    const lastTickRef = useRef(null);

    useEffect(() => {
        if (!gravityEvent || gravityEvent.tick === lastTickRef.current) return;
        lastTickRef.current = gravityEvent.tick;

        const dropping = new Set();
        const tops = new Set();

        if (gravityEvent.bombExplosion) {
            // Bomb explosion: all cells from row 0 to lowestRow use uniform drop animation.
            // No opacity-based fade-in — prevents flicker when React remounts shifted cells.
            for (const [colStr, info] of Object.entries(gravityEvent.colInfo)) {
                const col = parseInt(colStr);
                for (let r = 0; r <= info.lowestRow; r++) {
                    dropping.add(`${r},${col}`);
                }
            }
        } else {
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
        }

        setAnimatingCells(dropping);
        setNewTopCells(tops);

        const timer = setTimeout(() => {
            setAnimatingCells(new Set());
            setNewTopCells(new Set());
        }, 300);

        return () => clearTimeout(timer);
    }, [gravityEvent]);

    // Needed items from orders (unsatisfied)
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

    const handleRowClick = (rowIdx) => {
        if (disabled) return;
        onSelectRow?.(rowIdx);
    };

    const handleColClick = (colIdx) => {
        if (disabled) return;
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

                @keyframes explode-out {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.6; }
                    100% { transform: scale(0.3); opacity: 0; }
                }
                .anim-explode-content { animation: explode-out 0.3s ease-in forwards; }
            `}</style>

            <div className="matrix-unified" ref={ref}>
                {/* [0,0] empty corner */}
                <div />

                {/* [0, 1..N] column buttons */}
                {Array.from({ length: GRID_SIZE }).map((_, c) => (
                    <button
                        key={`col-${c}`}
                        onClick={() => handleColClick(c)}
                        onMouseEnter={() => setHoveredCol(c)}
                        onMouseLeave={() => setHoveredCol(null)}
                        disabled={disabled}
                        className={`
                            flex items-center justify-center font-black text-xs
                            transition-all duration-150 rounded-t-lg border-2 border-b-0 self-end
                            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
                            ${hoveredCol === c && !disabled
                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                            }
                        `}
                    >
                        {t("列")}{c + 1}
                    </button>
                ))}

                {/* Data rows: [r+1, 0] = row button, [r+1, c+1] = cell */}
                {matrix.map((row, r) => (
                    <React.Fragment key={`row-${r}`}>
                        {/* Row button */}
                        <button
                            onClick={() => handleRowClick(r)}
                            onMouseEnter={() => setHoveredRow(r)}
                            onMouseLeave={() => setHoveredRow(null)}
                            disabled={disabled}
                            className={`
                                flex items-center justify-center font-black text-xs
                                transition-all duration-150 rounded-l-lg border-2 border-r-0 self-center
                                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
                                ${hoveredRow === r && !disabled
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                                }
                            `}
                            style={{ height: 'var(--cell)' }}
                        >
                            {t("行")}{r + 1}
                        </button>

                        {/* Matrix cells for this row */}
                        {row.map((cell, c) => {
                            const cellKey = `${r},${c}`;
                            const isPicking = pickingCell && pickingCell.row === r && pickingCell.col === c;
                            const isExploding = explodingCells && explodingCells.some(ec => ec.row === r && ec.col === c);
                            const isHighlighted = (hoveredRow === r || hoveredCol === c) && !disabled;
                            const cellType = cell.type || 'normal';
                            const bgClass = cellType !== 'normal'
                                ? (SPECIAL_BG[cellType] || RARITY_BG.common)
                                : (RARITY_BG[cell.rarity.id] || RARITY_BG.common);
                            const neededInfo = cellType === 'normal' ? neededItemMap[cell.item.name] : null;
                            const isDropping = animatingCells.has(cellKey) && !newTopCells.has(cellKey);
                            const isNewTop = newTopCells.has(cellKey);
                            const isSpecial = cellType === 'gold_penalty' || cellType === 'bomb';

                            return (
                                <SpecialCellWrapper key={`${r}-${c}-${cell.uid}`} cell={cell} cellType={cellType} isSpecial={isSpecial}>
                                    {(wrapperRef, setHover) => (
                                        <div
                                            ref={wrapperRef}
                                            onMouseEnter={isSpecial ? () => setHover(true) : undefined}
                                            onMouseLeave={isSpecial ? () => setHover(false) : undefined}
                                            className={`
                                                relative flex flex-col items-center justify-center
                                                rounded-lg border-2 select-none w-full h-full
                                                ${(isPicking || isExploding) ? 'bg-slate-200 border-slate-300' : bgClass}
                                                ${isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1 z-10 scale-105' : ''}
                                                ${isDropping ? 'anim-drop' : ''}
                                                ${isNewTop ? 'anim-new-top' : ''}
                                                ${!isDropping && !isNewTop ? 'transition-all duration-150' : ''}
                                            `}
                                        >
                                            {!isPicking && (
                                                <div className={`flex flex-col items-center justify-center ${isExploding ? 'anim-explode-content' : ''}`}>
                                                    <span className="text-lg md:text-xl lg:text-2xl leading-none filter drop-shadow-sm">
                                                        {cell.item.icon}
                                                    </span>
                                                    {cellType === 'gold_penalty' ? (
                                                        <span className="text-[9px] font-black text-amber-600 leading-none mt-0.5">
                                                            -{cell.goldCost} 🪙
                                                        </span>
                                                    ) : cellType === 'bomb' ? (
                                                        <span className="text-[9px] font-black text-red-500 leading-none mt-0.5">
                                                            {t("炸弹")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[8px] md:text-[9px] font-bold leading-none truncate max-w-full text-center text-slate-600 mt-0.5 px-0.5">
                                                            {t(cell.item.name)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Order needed indicator */}
                                            {!isPicking && !isExploding && neededInfo && (
                                                <div className="absolute -top-1 -right-1 z-[2]">
                                                    <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${neededInfo.rarity.dotColor}`} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </SpecialCellWrapper>
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
