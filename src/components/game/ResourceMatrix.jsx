import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { RewardCard, DIFFICULTY_STYLE } from './BulletinBoard';

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
        name = t(cell.name);
        desc = t('抽中时触发厄运结算，不获得物品');
    } else if (cell.type === 'gold') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时获得金币');
    } else if (cell.type === 'out_of_game') {
        icon = cell.item?.icon || cell.icon;
        name = cell.item?.name ? t(cell.item.name) : t(cell.name);
        desc = t('抽中时直接获得局外物品');
    } else if (cell.type === 'doom_accumulation') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时厄运网格+1危险符号');
    } else if (cell.type === 'evacuation') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时可选择立即撤离');
    } else if (cell.type === 'refresh') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时获得1次刷新次数');
    } else if (cell.type === 'order') {
        icon = cell.icon;
        name = t(cell.name);
        // Show pre-generated order info if available
        if (cell.order) {
            const order = cell.order;
            const ds = DIFFICULTY_STYLE[order.difficulty] || DIFFICULTY_STYLE.easy;
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
                    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-amber-400/30 min-w-[180px] max-w-[260px]">
                        <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700 pb-1.5">
                            <span className="text-lg">{icon}</span>
                            <span className="font-black text-amber-300 text-sm">{name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ds.bg} ${ds.text}`}>{t(order.difficulty)}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] text-slate-400 mr-0.5">{t('奖励')}</span>
                            {order.rewards.map((r, i) => (
                                <RewardCard key={i} reward={r} size="sm" />
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400">{t('抽中时免费获得此订单')}</p>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
                    </div>
                </div>,
                document.body
            );
        }
        desc = t('抽中时获得一个免费订单');
    } else if (cell.type === 'pass') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('立即给当前三选一中随机1面墙抽取次数+1');
    } else if (cell.type === 'shield') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中后抵消1次厄运格效果');
    } else if (cell.type === 'bomb') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时爆炸，摧毁周围所有格子');
    } else if (cell.type === 'fast_pass') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('普通撤离等待回合数-1');
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

const CELL_SIZE = 56;
const GAP = 6;
const HALF = GAP / 2;
const TRACK = CELL_SIZE + GAP;

/** Single grid cell */
const GridCell = ({ cell, cellContent, t, rowIndex, colIndex, adjacency, highlight }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && (cell.type === 'doom_resolution' || cell.type === 'doom_accumulation'
        || cell.type === 'gold' || cell.type === 'evacuation' || cell.type === 'out_of_game'
        || cell.type === 'refresh' || cell.type === 'order' || cell.type === 'pass' || cell.type === 'shield' || cell.type === 'bomb'
        || cell.type === 'backpack' || cell.type === 'fast_pass');
    const { top, bottom, left, right } = adjacency;

    // Fall animation: when cell has fallDistance, start offset upward, then animate to 0.
    // We use direct DOM manipulation via ref to avoid React batching issues:
    // 1. useLayoutEffect sets the initial offset (before paint)
    // 2. Double-rAF triggers the transition (after browser paints the offset)
    const cellFallDistance = cell?.fallDistance || 0;
    const cellUid = cell?.uid;

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (cellFallDistance > 0) {
            // Phase 1: position above, no transition
            el.style.transition = 'none';
            el.style.transform = `translateY(${-cellFallDistance * TRACK}px)`;
            // Phase 2: double-rAF ensures browser has painted the offset
            let raf2, cleanup;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    el.style.transition = 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                    el.style.transform = '';
                    // Phase 3: clear inline styles after animation so Tailwind transitions work
                    cleanup = setTimeout(() => {
                        el.style.transition = '';
                        el.style.transform = '';
                    }, 300);
                });
            });
            return () => {
                cancelAnimationFrame(raf1);
                if (raf2) cancelAnimationFrame(raf2);
                if (cleanup) clearTimeout(cleanup);
            };
        } else {
            el.style.transition = '';
            el.style.transform = '';
        }
    }, [cellUid, cellFallDistance]);

    // Rounded corners — only on external corners
    const isConnected = top || bottom || left || right;
    const rounding = isConnected
        ? [
            (!top && !left) ? 'rounded-tl-lg' : '',
            (!top && !right) ? 'rounded-tr-lg' : '',
            (!bottom && !left) ? 'rounded-bl-lg' : '',
            (!bottom && !right) ? 'rounded-br-lg' : '',
          ].join(' ')
        : 'rounded-lg';

    // Cell background
    let bgClass;
    if (cell === null || cell.type === 'blank') {
        bgClass = 'bg-gray-100 border-gray-200';
    } else if (cell.type === 'doom_resolution') {
        bgClass = 'bg-red-100 border-red-400';
    } else if (cell.type === 'item' || cell.type === 'sticker') {
        // Stickers are always white
        const borderColor = 'border-gray-300';
        const bT = top ? 'border-t-0' : borderColor;
        const bB = bottom ? 'border-b-0' : borderColor;
        const bL = left ? 'border-l-0' : borderColor;
        const bR = right ? 'border-r-0' : borderColor;
        bgClass = `bg-white ${bT} ${bB} ${bL} ${bR}`;
    } else if (cell.type === 'gold') {
        bgClass = 'bg-yellow-100 border-yellow-400';
    } else if (cell.type === 'out_of_game') {
        // Uniform amber-tinted card — tier is communicated via the star glyphs above the icon.
        bgClass = 'bg-amber-50 border-amber-300';
    } else if (cell.type === 'doom_accumulation') {
        bgClass = 'bg-red-100 border-red-400';
    } else if (cell.type === 'evacuation') {
        bgClass = 'bg-emerald-100 border-emerald-400';
    } else if (cell.type === 'refresh') {
        bgClass = 'bg-indigo-100 border-indigo-400';
    } else if (cell.type === 'order') {
        bgClass = 'bg-blue-50 border-blue-300';
    } else if (cell.type === 'pass') {
        bgClass = 'bg-cyan-100 border-cyan-400';
    } else if (cell.type === 'shield') {
        bgClass = 'bg-violet-100 border-violet-400';
    } else if (cell.type === 'bomb') {
        bgClass = 'bg-gray-800 border-gray-900';
    } else if (cell.type === 'backpack') {
        bgClass = 'bg-amber-100 border-amber-300';
    } else if (cell.type === 'fast_pass') {
        bgClass = 'bg-emerald-100 border-emerald-400';
    } else {
        bgClass = 'bg-white border-gray-300';
    }

    // Highlight effects
    let highlightClass;
    let extraShadow = undefined;

    if (highlight === 'settled') {
        highlightClass = 'ring-3 ring-yellow-400 scale-110 z-20 shadow-lg shadow-yellow-200 transition-all duration-200';
    } else if (highlight === 'scanning') {
        highlightClass = 'ring-2 ring-yellow-300 z-10 transition-all duration-75';
    } else if (highlight === 'scan-row') {
        highlightClass = 'ring-1 ring-blue-200 transition-all duration-75';
    } else if (highlight === 'hover-row' || highlight === 'hover-col') {
        highlightClass = 'scale-105 z-10 transition-all duration-150';
        // Axis-specific ring color: rows = warm orange, columns = cool sky blue
        const ringColor = highlight === 'hover-row'
            ? 'rgba(249,115,22,0.75)'   // orange-500
            : 'rgba(14,165,233,0.75)';  // sky-500
        const ringW = 2.5;
        const parts = ['0 4px 6px -1px rgba(0,0,0,0.1)', '0 2px 4px -2px rgba(0,0,0,0.1)']; // shadow-md
        if (!top) parts.push(`inset 0 ${ringW}px 0 0 ${ringColor}`);
        if (!bottom) parts.push(`inset 0 -${ringW}px 0 0 ${ringColor}`);
        if (!left) parts.push(`inset ${ringW}px 0 0 0 ${ringColor}`);
        if (!right) parts.push(`inset -${ringW}px 0 0 0 ${ringColor}`);
        extraShadow = parts.join(', ');
    } else {
        highlightClass = 'transition-all duration-150';
    }

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`relative border flex flex-col items-center justify-center ${rounding} ${bgClass} ${highlightClass}`}
            style={{
                margin: `${top ? 0 : HALF}px ${right ? 0 : HALF}px ${bottom ? 0 : HALF}px ${left ? 0 : HALF}px`,
                width: CELL_SIZE + (left ? HALF : 0) + (right ? HALF : 0),
                height: CELL_SIZE + (top ? HALF : 0) + (bottom ? HALF : 0),
                boxShadow: extraShadow,
            }}
            onMouseEnter={hasTip ? () => setHovered(true) : undefined}
            onMouseLeave={hasTip ? () => setHovered(false) : undefined}
        >
            {cellContent}
            {cell !== null && (cell.type === 'item' || cell.type === 'sticker') && !cell.hidden && (
                <span className="text-[9px] text-gray-600 leading-none mt-0.5 truncate max-w-[48px] font-medium">
                    {t(cell.item.name)}
                </span>
            )}
            {cell !== null && cell.type === 'out_of_game' && cell.item?.name && (
                <span className="text-[8px] text-gray-700 leading-none mt-0.5 truncate max-w-[48px] font-medium">
                    {t(cell.item.name)}
                </span>
            )}
            {cell !== null && cell.type !== 'item' && cell.type !== 'sticker' && cell.type !== 'out_of_game' && cell.name && (
                <span className="text-[8px] text-gray-500 leading-none mt-0.5 truncate max-w-[48px]">
                    {t(cell.name)}
                </span>
            )}
            {hasTip && <CellTooltip cell={cell} anchorRef={ref} visible={hovered} t={t} />}
        </div>
    );
};

/**
 * 5×5 grid display for turn-based prototype.
 */
const ResourceMatrix = ({ matrix, onSelectRow, onSelectColumn, phase, disabled, disabledReason, drawAnimState, wallType, lastDrawDirection, onHoverStickerIds, bonusItemMap }) => {
    const { t } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    // Report hovered sticker IDs to parent
    const reportHover = (row, col) => {
        if (!onHoverStickerIds) return;
        const ids = new Set();
        if (row !== null) {
            matrix[row]?.forEach(cell => {
                if (cell?.type === 'sticker' && cell.item?.id) ids.add(cell.item.id);
            });
        }
        if (col !== null) {
            matrix.forEach(r => {
                const cell = r[col];
                if (cell?.type === 'sticker' && cell.item?.id) ids.add(cell.item.id);
            });
        }
        onHoverStickerIds(ids.size > 0 ? ids : null);
    };

    if (!matrix) return null;

    const canDraw = (phase === 'playing' || phase === 'drawing') && !disabled;
    const numRows = matrix.length;
    const numCols = matrix[0]?.length || 0;

    const getCellContent = (cell) => {
        if (cell === null || cell.type === 'blank') return <span className="text-gray-300">·</span>;
        // Hidden cell: show mystery icon
        if (cell.hidden) {
            return <span className="text-xl">❓</span>;
        }
        if (cell.type === 'item' || cell.type === 'sticker') {
            return (
                <>
                    <span className="text-xl">{cell.item?.icon || cell.icon}</span>
                    {cell.multiplier && cell.multiplier > 1 && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10">×{cell.multiplier}</span>
                    )}
                </>
            );
        }
        if (cell.type === 'out_of_game') {
            const bonusVal = bonusItemMap?.get(cell.item?.id);
            const stars = cell.item?.stars || 0;
            const starText = '★'.repeat(Math.min(stars, 3)) + (stars > 3 ? '+' : '');
            return (
                <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[8px] font-black text-amber-500 tracking-tighter">{starText}</span>
                    <span className="text-xl">{cell.item?.icon || cell.icon}</span>
                    {bonusVal && (
                        <span className="absolute -top-1 -left-1 bg-yellow-400 text-black text-[7px] font-black w-3 h-3 rounded-full flex items-center justify-center z-10">+{bonusVal}</span>
                    )}
                    {cell.multiplier && cell.multiplier > 1 && !bonusVal && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10">×{cell.multiplier}</span>
                    )}
                </div>
            );
        }
        if (cell.type === 'gold') {
            return (
                <>
                    <span className="text-xl">{cell.icon}</span>
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[8px] font-black px-1 rounded shadow z-10">
                        +{cell.goldAmount}
                    </span>
                    {cell.multiplier && cell.multiplier > 1 && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10">×{cell.multiplier}</span>
                    )}
                </>
            );
        }
        return (
            <>
                <span className="text-xl">{cell.icon}</span>
                {cell.multiplier && cell.multiplier > 1 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10">×{cell.multiplier}</span>
                )}
            </>
        );
    };

    const getAdjacency = (rowIdx, colIdx) => {
        const cell = matrix[rowIdx]?.[colIdx];
        if (!cell || !cell.groupId || (cell.shapeSize || 1) <= 1) {
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

    // Row button width
    const ROW_BTN_WIDTH = 36;
    const ROW_BTN_MARGIN = 8; // mr-2

    return (
        <div>
            {wallType && (
                <div className="text-center mb-2">
                    <span className="text-sm font-bold">{wallType.icon} {t(wallType.name)}</span>
                    {wallType.id !== 'basic' && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{t(wallType.desc)}</p>
                    )}
                </div>
            )}

            {/* Column buttons row — offset by row-button area */}
            <div className="flex mb-1" style={{ paddingLeft: ROW_BTN_WIDTH + ROW_BTN_MARGIN }}>
                {Array.from({ length: numCols }, (_, colIndex) => {
                    // Empty cells are drawable too — column is always active while draws remain.
                    const altBlocked = wallType?.id === 'alternating' && lastDrawDirection === 'column';
                    const colClickable = canDraw && !altBlocked;
                    return (
                        <button
                            key={colIndex}
                            onClick={() => colClickable && onSelectColumn(colIndex)}
                            onMouseEnter={() => { if (colClickable) { setHoveredCol(colIndex); reportHover(null, colIndex); } }}
                            onMouseLeave={() => { setHoveredCol(null); reportHover(null, null); }}
                            disabled={!colClickable}
                            className={`
                                rounded-lg text-xs font-black flex-shrink-0
                                flex items-center justify-center
                                transition-all duration-150 shadow-sm
                                ${colClickable
                                    ? 'bg-sky-500 text-white hover:bg-sky-600 hover:scale-105 cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }
                            `}
                            style={{ width: CELL_SIZE, height: 24, marginRight: GAP }}
                            title={colClickable ? t('抽取此列') : (disabledReason || t('无法抽取'))}
                        >
                            ▼
                        </button>
                    );
                })}
            </div>

            <div className="flex items-start">
                {/* Row buttons */}
                <div className="flex flex-col mr-2" style={{ paddingTop: HALF }}>
                    {matrix.map((row, rowIndex) => {
                        // Empty cells are drawable too — row is always active while draws remain.
                        const altBlockedRow = wallType?.id === 'alternating' && lastDrawDirection === 'row';
                        const rowClickable = canDraw && !altBlockedRow;
                        return (
                            <button
                                key={rowIndex}
                                onClick={() => rowClickable && onSelectRow(rowIndex)}
                                onMouseEnter={() => { if (rowClickable) { setHoveredRow(rowIndex); reportHover(rowIndex, null); } }}
                                onMouseLeave={() => { setHoveredRow(null); reportHover(null, null); }}
                                disabled={!rowClickable}
                                className={`
                                    rounded-lg text-xs font-black flex-shrink-0
                                    flex items-center justify-center
                                    transition-all duration-150 shadow-sm
                                    ${rowClickable
                                        ? 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }
                                `}
                                style={{ width: 36, height: CELL_SIZE, marginBottom: GAP }}
                                title={rowClickable ? t('抽取此行') : (disabledReason || t('无法抽取'))}
                            >
                                ▶
                            </button>
                        );
                    })}
                </div>

                {/* Wall grid — zero-gap CSS Grid, margins create visual spacing */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${numCols}, ${TRACK}px)`,
                        gridTemplateRows: `repeat(${numRows}, ${TRACK}px)`,
                        /* no gap — margins on cells handle spacing */
                    }}
                >
                    {(() => {
                        // Compute groupIds that touch the hovered row or hovered column
                        const hoveredGroupIds = new Set();
                        if (hoveredRow !== null) {
                            matrix[hoveredRow]?.forEach(cell => {
                                if (cell?.groupId) hoveredGroupIds.add(cell.groupId);
                            });
                        }
                        if (hoveredCol !== null) {
                            matrix.forEach(row => {
                                const cell = row[hoveredCol];
                                if (cell?.groupId) hoveredGroupIds.add(cell.groupId);
                            });
                        }

                        return matrix.flatMap((row, rowIndex) =>
                            row.map((cell, colIndex) => {
                                // Hover: cell is in hovered row/col (empty cells included), OR belongs to a group in hovered row/col
                                const isRowHovered = hoveredRow === rowIndex;
                                const isColHovered = hoveredCol === colIndex;
                                const isGroupHovered = cell?.groupId && hoveredGroupIds.has(cell.groupId);
                                const showHover = isRowHovered || isColHovered || isGroupHovered;

                                // Draw animation highlight — row mode
                                const isRowScanning = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === colIndex;
                                const isRowSettled = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'settled' && drawAnimState.finalColIndex === colIndex;
                                const isScanRow = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'scanning';

                                // Draw animation highlight — column mode
                                const isColScanning = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === rowIndex;
                                const isColSettled = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'settled' && drawAnimState.finalRowIndex === rowIndex;
                                const isScanCol = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'scanning';

                                const isScanning = isRowScanning || isColScanning;
                                const isSettled = isRowSettled || isColSettled;
                                const isScanLine = isScanRow || isScanCol;

                                // Axis-aware hover: row hover takes precedence if both set
                                // (in practice only one is ever set at a time)
                                const hoverKind = showHover
                                    ? (hoveredRow !== null ? 'hover-row' : 'hover-col')
                                    : null;

                                return (
                                    <GridCell
                                        key={`${rowIndex}-${colIndex}`}
                                        cell={cell}
                                        cellContent={getCellContent(cell)}
                                        t={t}
                                        rowIndex={rowIndex}
                                        colIndex={colIndex}
                                        adjacency={getAdjacency(rowIndex, colIndex)}
                                        highlight={isSettled ? 'settled' : isScanning ? 'scanning' : isScanLine ? 'scan-row' : hoverKind}
                                    />
                                );
                            })
                        );
                    })()}
                </div>

            </div>
        </div>
    );
};

export default ResourceMatrix;
