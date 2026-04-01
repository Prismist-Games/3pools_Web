import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { computeClusters, getClusterGuaranteedRarityId } from '../../utils/matrixHelpers';

const GRID_SIZE = 4;

const NORMAL_BG = 'bg-slate-100 border-slate-300';

const SPECIAL_BG = {
    bomb: 'bg-red-50 border-red-400',
};

// Cluster visual styles keyed by guaranteed rarity id
const CLUSTER_STYLES = {
    uncommon:  { bg: 'bg-green-50',  border: 'border-green-400',  shadowColor: '#bbf7d0' },
    rare:      { bg: 'bg-blue-50',   border: 'border-blue-400',   shadowColor: '#bfdbfe' },
    epic:      { bg: 'bg-purple-50', border: 'border-purple-400', shadowColor: '#e9d5ff' },
    legendary: { bg: 'bg-orange-50', border: 'border-orange-400', shadowColor: '#fed7aa' },
    mythic:    { bg: 'bg-red-50',    border: 'border-red-400',    shadowColor: '#fecaca' },
};

/**
 * Compute inline style (box-shadow + border-radius) for a cluster cell
 * to visually connect it with adjacent same-cluster cells.
 */
const getClusterCellStyle = (clusterMap, r, c) => {
    const info = clusterMap?.[r]?.[c];
    if (!info || info.size < 2) return null;

    const rarityId = getClusterGuaranteedRarityId(info.size);
    if (!rarityId) return null;

    const colors = CLUSTER_STYLES[rarityId];
    if (!colors) return null;

    const id = info.id;
    const has = (dr, dc) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && clusterMap[nr]?.[nc]?.id === id;
    };

    const top = has(-1, 0), bottom = has(1, 0), left = has(0, -1), right = has(0, 1);
    const tl = has(-1, -1), tr = has(-1, 1), bl = has(1, -1), br = has(1, 1);

    // Box-shadow to fill gap space toward adjacent cluster cells
    const sc = colors.shadowColor;
    const g = 'var(--gap)';
    const ng = 'calc(-1 * var(--gap))';
    const shadows = [];
    // Cardinal shadows
    if (right)  shadows.push(`${g} 0 0 0 ${sc}`);
    if (bottom) shadows.push(`0 ${g} 0 0 ${sc}`);
    if (left)   shadows.push(`${ng} 0 0 0 ${sc}`);
    if (top)    shadows.push(`0 ${ng} 0 0 ${sc}`);
    // Diagonal shadows — only require the diagonal neighbor itself
    if (br) shadows.push(`${g} ${g} 0 0 ${sc}`);
    if (bl) shadows.push(`${ng} ${g} 0 0 ${sc}`);
    if (tr) shadows.push(`${g} ${ng} 0 0 ${sc}`);
    if (tl) shadows.push(`${ng} ${ng} 0 0 ${sc}`);

    // Border-radius: flatten corner whenever diagonal neighbor is in cluster
    const rd = '0.5rem';
    const borderRadius = [
        tl ? '0' : rd,
        tr ? '0' : rd,
        br ? '0' : rd,
        bl ? '0' : rd,
    ].join(' ');

    return {
        classes: `${colors.bg} ${colors.border}`,
        style: {
            boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
            borderRadius,
        },
    };
};

const ResourceMatrix = React.forwardRef(({ matrix, gravityEvent, pickingCell, explodingCells, onSelectRow, onSelectCol, disabled, orders = [], emergencyOrders = [], inventory = [] }, ref) => {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

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

    // Cluster map for visual display
    const clusterMap = useMemo(() => computeClusters(matrix), [matrix]);

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
                            const neededInfo = cellType === 'normal' ? neededItemMap[cell.item.name] : null;
                            const isDropping = animatingCells.has(cellKey) && !newTopCells.has(cellKey);
                            const isNewTop = newTopCells.has(cellKey);

                            // Cluster visuals
                            const clusterStyle = cellType === 'normal' ? getClusterCellStyle(clusterMap, r, c) : null;
                            const bgClass = (isPicking || isExploding)
                                ? 'bg-slate-200 border-slate-300'
                                : clusterStyle
                                    ? clusterStyle.classes
                                    : cellType !== 'normal'
                                        ? (SPECIAL_BG[cellType] || NORMAL_BG)
                                        : NORMAL_BG;

                            return (
                                <div
                                    key={`${r}-${c}-${cell.uid}`}
                                    className={`
                                        relative flex flex-col items-center justify-center
                                        rounded-lg border-2 select-none
                                        ${bgClass}
                                        ${isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1 z-10 scale-105' : (clusterStyle ? 'z-[1]' : '')}
                                        ${isDropping ? 'anim-drop' : ''}
                                        ${isNewTop ? 'anim-new-top' : ''}
                                        ${!isDropping && !isNewTop ? 'transition-all duration-150' : ''}
                                    `}
                                    style={(!isPicking && !isExploding && !isHighlighted && clusterStyle) ? clusterStyle.style : undefined}
                                >
                                    {!isPicking && (
                                        <div className={`flex flex-col items-center justify-center ${isExploding ? 'anim-explode-content' : ''}`}>
                                            <span className="text-lg md:text-xl lg:text-2xl leading-none filter drop-shadow-sm">
                                                {cell.item.icon}
                                            </span>
                                            <span className="text-[8px] md:text-[9px] font-bold leading-none truncate max-w-full text-center text-slate-600 mt-0.5 px-0.5">
                                                {t(cell.item.name)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Order needed indicator */}
                                    {!isPicking && !isExploding && neededInfo && (
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
