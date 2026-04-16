import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { MATRIX_CONFIG } from '../../data/matrixConfig';
import { getClusterMembers } from '../../utils/matrixHelpers';

/** Tooltip for grid cells — Portal-based, same style as ToolItemTooltip */
const CellTooltip = ({ cell, anchorRef, visible, t, language }) => {
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
    } else if (cell.type === 'doom_upgrade') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时厄运等级+1，不获得物品');
    } else if (cell.type === 'gold') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时获得抽数');
    } else if (cell.type === 'order_cell') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时获得一个新订单');
    } else if (cell.type === 'out_of_game') {
        icon = cell.icon;
        name = cell.item ? (language === 'en' && cell.item.nameEn ? cell.item.nameEn : t(cell.item.name)) : t(cell.name);
        const rarityStars = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★' };
        const r = cell.item?.rarity || cell.item?.score || 1;
        const tags = cell.item?.tags || [];
        desc = (
            <>
                <span>{rarityStars[r]}</span>
                {tags.length > 0 && (
                    <span className="ml-2">
                        {tags.map(tag => (
                            <span key={tag} className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 mr-1">{t(tag)}</span>
                        ))}
                    </span>
                )}
                {language !== 'en' && cell.item?.nameEn && (
                    <span className="block text-[10px] text-slate-400 italic mt-1">{cell.item.nameEn}</span>
                )}
            </>
        );
    } else if (cell.type === 'bomb') {
        icon = cell.icon;
        name = t(cell.name);
        desc = t('抽中时爆炸，摧毁周围所有格子');
    } else if (cell.type === 'heal') {
        icon = '❤️‍🩹';
        name = t('生命恢复');
        desc = t('抽中时恢复生命值');
    } else if (cell.type === 'backpack_expand') {
        icon = '🎒';
        name = t('菜篮扩容');
        desc = t('抽中时增加菜篮容量');
    } else if (cell.type === 'gravity') {
        icon = '⬇️';
        name = t('重力开关');
        desc = t('抽中时所有格子向下坠落');
    } else if (cell.type === 'entrance') {
        const subLevel = LEVEL_TEMPLATES.find(t => t.id === cell.subLevelId);
        icon = cell.icon || '🚪';
        const useName = language === 'en' && subLevel?.name_en ? subLevel.name_en : subLevel?.name;
        name = useName || cell.subLevelId;
        const useDesc = language === 'en' && subLevel?.description_en ? subLevel.description_en : subLevel?.description;
        desc = useDesc || t('抽中时进入子关卡');
    } else if (cell.type === 'buff_field') {
        icon = cell.icon || '🌽';
        name = t(cell.name || '膨化格');
        desc = t('抽中时无效果，周围的增益消失');
    } else if (cell.type === 'sticker' || cell.type === 'item') {
        icon = cell.item?.icon || cell.icon;
        name = cell.item ? t(cell.item.name) : t(cell.name);
        desc = t('抽中时获得此贴纸');
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

/** Count how many buff_field cells are within the 4-neighbor (orthogonal) range
 *  of (r, c). The buff_field cell itself does not count as covering itself. */
function countBuffFieldCoverage(matrix, r, c) {
    if (!matrix) return 0;
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let count = 0;
    for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (matrix[nr][nc]?.type === 'buff_field') count++;
    }
    return count;
}

/** Single grid cell */
const GridCell = ({ cell, cellContent, t, language, rowIndex, colIndex, highlight, gravityDrop, rotationMove, growthFlash, buffCoverage, sameNeighbors, inHoveredCluster, onClusterHover }) => {
    const ref = useRef(null);
    const [hovered, setHovered] = useState(false);
    const hasTip = cell && !cell.hidden && (cell.type === 'doom_resolution' || cell.type === 'doom_upgrade'
        || cell.type === 'gold' || cell.type === 'order_cell' || cell.type === 'out_of_game' || cell.type === 'bomb'
        || cell.type === 'heal' || cell.type === 'backpack_expand' || cell.type === 'gravity' || cell.type === 'entrance'
        || cell.type === 'buff_field' || cell.type === 'sticker' || cell.type === 'item');

    // Cell background
    let bgClass;
    if (cell && cell.hidden) {
        bgClass = 'cell-hidden-pattern border-kitchen-gold-border-muted';
    } else if (cell === null || cell.type === 'empty') {
        bgClass = 'bg-[#F8F4EC] border-[#D4C8B0]';
    } else if (cell.type === 'doom_resolution') {
        bgClass = 'bg-[#FFB8A8] border-[#D04020]';
    } else if (cell.type === 'doom_upgrade') {
        // Stronger red background so the ⚠️ warning reads clearly as danger.
        bgClass = 'bg-[#FFB8A8] border-[#D04020]';
    } else if (cell.type === 'item' || cell.type === 'sticker') {
        bgClass = 'bg-kitchen-card border-kitchen-gold-border-muted';
    } else if (cell.type === 'gold') {
        bgClass = 'bg-[#FFFCE8] border-[#E8C860]';
    } else if (cell.type === 'order_cell') {
        bgClass = 'bg-[#F0F8FF] border-kitchen-info';
    } else if (cell.type === 'out_of_game') {
        // Score-based colors matching order reward cards
        const sc = { 1: 'bg-green-50 border-green-400', 2: 'bg-blue-50 border-blue-400', 3: 'bg-purple-50 border-purple-400', 5: 'bg-orange-50 border-orange-400' };
        bgClass = sc[cell.item?.score] || 'bg-pink-100 border-pink-400';
    } else if (cell.type === 'bomb') {
        bgClass = 'bg-gray-800 border-gray-900';
    } else if (cell.type === 'heal') {
        bgClass = 'bg-[#F0FFF8] border-kitchen-success';
    } else if (cell.type === 'backpack_expand') {
        bgClass = 'bg-[#FFF8E0] border-kitchen-gold';
    } else if (cell.type === 'gravity') {
        bgClass = 'bg-[#F0F8FF] border-kitchen-info';
    } else if (cell.type === 'entrance') {
        bgClass = 'bg-[#F0FFF8] border-kitchen-success-border';
    } else if (cell.type === 'buff_field') {
        bgClass = 'bg-[#FFFAE8] border-[#E8B840]';
    } else {
        bgClass = 'bg-kitchen-card border-kitchen-gold-border-muted';
    }

    // Highlight effects
    let highlightClass;
    let extraShadow = undefined;

    if (highlight === 'settled') {
        highlightClass = 'ring-3 ring-kitchen-gold scale-110 z-20 shadow-lg shadow-[rgba(232,168,48,0.3)] transition-all duration-200 animate-cell-flip';
    } else if (highlight === 'scanning') {
        // Cursor cell — extends scan-row styling so the row tint stays steady
        // as the cursor sweeps. Ring + stronger glow + z-10 mark the cursor.
        highlightClass = 'bg-[rgba(232,168,48,0.18)] border-kitchen-gold shadow-[0_0_10px_rgba(232,168,48,0.35)] ring-2 ring-kitchen-gold z-10 transition-all duration-75';
    } else if (highlight === 'scan-row') {
        highlightClass = 'bg-[rgba(232,168,48,0.08)] border-kitchen-gold shadow-[0_0_8px_rgba(232,168,48,0.15)] transition-all duration-75';
    } else if (highlight === 'hover') {
        highlightClass = 'scale-105 z-10 transition-all duration-150 ring-2 ring-[rgba(232,168,48,0.5)] shadow-md';
    } else {
        highlightClass = 'transition-all duration-150';
    }

    const gravityStyle = gravityDrop ? {
        animation: `gravity-fall 0.3s cubic-bezier(0.2, 0, 0.6, 1) forwards`,
        '--gravity-from': `${-gravityDrop * TRACK}px`,
    } : {};

    const rotationStyle = rotationMove ? {
        animation: `rotation-move 0.3s cubic-bezier(0.2, 0, 0.6, 1) forwards`,
        '--rot-from-x': `${(rotationMove.fromCol - colIndex) * TRACK}px`,
        '--rot-from-y': `${(rotationMove.fromRow - rowIndex) * TRACK}px`,
        zIndex: 15,
    } : {};

    const growthStyle = growthFlash ? {
        animation: `growth-flash 0.4s cubic-bezier(0.2, 0, 0.4, 1) forwards`,
        zIndex: 12,
    } : {};

    // Buff field aura — only applies to cells that are NOT buff_field themselves,
    // NOT empty, and covered by at least one buff_field.
    const isBuffed = cell && cell.type !== 'buff_field' && cell.type !== 'empty' && buffCoverage > 0;
    const mergedBoxShadow = isBuffed
        ? `${extraShadow ? extraShadow + ', ' : ''}0 0 ${6 + buffCoverage * 4}px ${2 + buffCoverage}px rgba(232, 184, 64, ${0.35 + buffCoverage * 0.12})`
        : extraShadow;

    // Cluster styling: when a sticker shares an edge with a same-id
    // sticker, re-color that edge's border to the sticker bg (#FFFDF8).
    // Bridge rectangles rendered in the grid container fill the 6px
    // inter-cell gap with the same color, so the cluster reads as one
    // contiguous shape with a continuous outline around the perimeter.
    const borderStyle = {};
    if (sameNeighbors) {
        const fill = '#FFFDF8';
        if (sameNeighbors.top)    borderStyle.borderTopColor = fill;
        if (sameNeighbors.right)  borderStyle.borderRightColor = fill;
        if (sameNeighbors.bottom) borderStyle.borderBottomColor = fill;
        if (sameNeighbors.left)   borderStyle.borderLeftColor = fill;
        if (sameNeighbors.top)    borderStyle.borderTopLeftRadius = 0;
        if (sameNeighbors.top)    borderStyle.borderTopRightRadius = 0;
        if (sameNeighbors.bottom) borderStyle.borderBottomLeftRadius = 0;
        if (sameNeighbors.bottom) borderStyle.borderBottomRightRadius = 0;
        if (sameNeighbors.left)   borderStyle.borderTopLeftRadius = 0;
        if (sameNeighbors.left)   borderStyle.borderBottomLeftRadius = 0;
        if (sameNeighbors.right)  borderStyle.borderTopRightRadius = 0;
        if (sameNeighbors.right)  borderStyle.borderBottomRightRadius = 0;
    }
    const clusterRing = inHoveredCluster
        ? '0 0 0 2px rgba(232,168,48,0.55), 0 0 8px rgba(232,168,48,0.35)'
        : '';
    const finalShadow = clusterRing
        ? (mergedBoxShadow ? `${clusterRing}, ${mergedBoxShadow}` : clusterRing)
        : mergedBoxShadow;

    const isStickerCell = cell?.type === 'sticker';

    return (
        <div
            ref={ref}
            data-cell={`${rowIndex}-${colIndex}`}
            className={`relative border rounded-lg flex flex-col items-center justify-center ${bgClass} ${highlightClass}`}
            style={{
                margin: `${HALF}px`,
                width: CELL_SIZE,
                height: CELL_SIZE,
                boxShadow: finalShadow,
                ...borderStyle,
                ...gravityStyle,
                ...rotationStyle,
                ...growthStyle,
            }}
            onMouseEnter={() => {
                if (hasTip) setHovered(true);
                if (isStickerCell && onClusterHover) onClusterHover(rowIndex, colIndex);
            }}
            onMouseLeave={() => {
                if (hasTip) setHovered(false);
                if (isStickerCell && onClusterHover) onClusterHover(null, null);
            }}
        >
            {cellContent}
            {isBuffed && (
                <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-20">
                    ×{buffCoverage + 1}
                </span>
            )}
            {hasTip && <CellTooltip cell={cell} anchorRef={ref} visible={hovered} t={t} language={language} />}
        </div>
    );
};

/**
 * Wall grid display for turn-based prototype (size from MATRIX_CONFIG.gridSize).
 */
const ResourceMatrix = ({ matrix, onSelectRow, onSelectColumn, gold, drawCost, phase, disabled, drawAnimState, wallType, lastDrawDirection, onHoverStickerIds, gravityDrops, rotationMoves, growthFlashes }) => {
    const { t, language } = useLanguage();
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);
    const [doomFlash, setDoomFlash] = useState(false);
    const [hoveredClusterPos, setHoveredClusterPos] = useState(null); // [r, c] of seed

    // Per-cell same-id 4-neighbor map (sticker only). Drives the inner-edge
    // fade so contiguous same-id stickers render as one connected blob.
    const sameNeighborsMap = useMemo(() => {
        if (!matrix) return null;
        const map = new Map();
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = matrix[r][c];
                if (cell?.type !== 'sticker' || !cell.item?.id) continue;
                const id = cell.item.id;
                const same = (rr, cc) => matrix[rr]?.[cc]?.type === 'sticker' && matrix[rr][cc].item?.id === id;
                map.set(`${r}-${c}`, {
                    top: same(r - 1, c),
                    right: same(r, c + 1),
                    bottom: same(r + 1, c),
                    left: same(r, c - 1),
                });
            }
        }
        return map;
    }, [matrix]);

    // Cluster bridges: rectangles that fill the 6px inter-cell gaps
    // between adjacent same-id stickers, so a cluster renders as one
    // contiguous painted shape. right-bridges fill horizontal gaps,
    // bottom-bridges fill vertical gaps, corner-bridges fill the 6×6
    // square where 4 same-cluster cells meet (otherwise the cluster has
    // a tiny hole in its center).
    const clusterBridges = useMemo(() => {
        if (!matrix) return { right: [], bottom: [], corner: [] };
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        const sameId = (r1, c1, r2, c2) => {
            const a = matrix[r1]?.[c1];
            const b = matrix[r2]?.[c2];
            if (!a || !b) return false;
            if (a.type !== 'sticker' || b.type !== 'sticker') return false;
            if (a.hidden || b.hidden) return false;
            return !!a.item?.id && a.item.id === b.item?.id;
        };
        const right = [];
        const bottom = [];
        const corner = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (c + 1 < cols && sameId(r, c, r, c + 1)) right.push({ r, c });
                if (r + 1 < rows && sameId(r, c, r + 1, c)) bottom.push({ r, c });
                if (r + 1 < rows && c + 1 < cols
                    && sameId(r, c, r, c + 1)
                    && sameId(r, c, r + 1, c)
                    && sameId(r + 1, c, r + 1, c + 1)
                    && sameId(r, c + 1, r + 1, c + 1)) {
                    corner.push({ r, c });
                }
            }
        }
        return { right, bottom, corner };
    }, [matrix]);

    // Set of cluster member keys for the currently hovered sticker cell.
    const hoveredClusterSet = useMemo(() => {
        if (!matrix || !hoveredClusterPos) return null;
        const members = getClusterMembers(matrix, hoveredClusterPos[0], hoveredClusterPos[1]);
        if (members.length <= 1) return null; // don't bother highlighting singletons
        return new Set(members.map(([r, c]) => `${r}-${c}`));
    }, [matrix, hoveredClusterPos]);

    const handleClusterHover = (r, c) => {
        if (r === null) setHoveredClusterPos(null);
        else setHoveredClusterPos([r, c]);
    };

    useEffect(() => {
        if (drawAnimState?.phase === 'settled' && drawAnimState?.drawnCell?.type === 'doom_resolution') {
            setDoomFlash(true);
            // Intentionally no cleanup: drawAnimState clears to null ~300ms
            // after settle (completeDrawAnim), but the doom flash is meant
            // to last a full 1s. Returning a clearTimeout cleanup made the
            // dep change cancel the timer mid-flight, leaving doomFlash
            // stuck true and the CRT/vignette permanently on the wall.
            setTimeout(() => setDoomFlash(false), 1000);
        }
    }, [drawAnimState]);

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

    const canDraw = (phase === 'drawing' || phase === 'drawing_sub') && gold >= drawCost && !disabled;

    const getCellContent = (cell) => {
        if (cell === null) return <span className="text-gray-300">·</span>;
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
            const badgeColor = { 1: 'bg-green-500', 2: 'bg-blue-500', 3: 'bg-purple-500', 4: 'bg-orange-500' };
            const r = cell.item?.rarity || cell.item?.score || 1;
            return (
                <>
                    <span className="text-xl">{cell.item?.icon || cell.icon}</span>
                    <span className={`absolute -bottom-1 -right-1 ${badgeColor[r] || 'bg-amber-500'} text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10`}>
                        {r}
                    </span>
                    {cell.multiplier && cell.multiplier > 1 && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-10">×{cell.multiplier}</span>
                    )}
                </>
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
        if (cell.type === 'heal') {
            return <span className="text-xl">❤️‍🩹</span>;
        }
        if (cell.type === 'backpack_expand') {
            return <span className="text-xl">🎒</span>;
        }
        if (cell.type === 'gravity') {
            return <span className="text-xl">⬇️</span>;
        }
        if (cell.type === 'entrance') {
            return <span className="text-xl">{cell.icon || '🚪'}</span>;
        }
        if (cell.type === 'buff_field') {
            return <span className="text-xl">{cell.icon || '🌽'}</span>;
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

    // Row button width
    const ROW_BTN_WIDTH = 36;
    const ROW_BTN_MARGIN = 8; // mr-2

    // Fix container width to grid natural width so long modifier descriptions
    // wrap instead of stretching the wall asymmetrically.
    const FIXED_WALL_WIDTH = (matrix[0]?.length || 4) * CELL_SIZE
        + ((matrix[0]?.length || 4) - 1) * GAP
        + ROW_BTN_WIDTH + ROW_BTN_MARGIN
        + 32; // p-4 padding

    return (
        <div
            style={{ width: FIXED_WALL_WIDTH }}
            className={`bg-gradient-to-br from-kitchen-wood-light to-kitchen-wood-dark border-[3px] border-kitchen-wood-border rounded-[14px] p-4 shadow-[0_4px_0_#C8A880,0_6px_12px_rgba(0,0,0,0.1)] transition-all duration-300${doomFlash ? ' crt-heavy vignette-heavy animate-signal-shake' : ''}`}
        >
            <div className="text-center mb-2 pb-2 border-b border-dashed border-kitchen-wood-border">
                <span className="text-sm font-bold text-kitchen-text-body">🎯 {t('奖品墙')}</span>
            </div>

            {wallType && (
                <div className="text-center mb-2">
                    <span className="text-sm font-bold">{wallType.icon} {t(wallType.name)}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5 break-words">{t(wallType.desc)}</p>
                </div>
            )}

            {/* Column buttons row — offset by row-button area */}
            <div className="flex mb-1" style={{ paddingLeft: ROW_BTN_WIDTH + ROW_BTN_MARGIN }}>
                {Array.from({ length: matrix[0]?.length || 4 }, (_, colIndex) => {
                    const hasActive = matrix.some(row => row[colIndex] !== null);
                    const altBlocked = wallType?.id === 'alternating' && lastDrawDirection === 'column';
                    const colClickable = canDraw && hasActive && !altBlocked;
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
                                transition-all duration-150
                                ${colClickable
                                    ? 'bg-gradient-to-b from-[#FFF3E0] to-[#FFE8CC] border-2 border-kitchen-gold rounded-lg shadow-[0_2px_0_#D4952A,0_0_10px_rgba(232,168,48,0.25)] text-kitchen-gold-deep font-bold cursor-pointer'
                                    : 'bg-[#F5F0E8] border-2 border-kitchen-gold-border-muted/50 text-kitchen-text-muted cursor-not-allowed opacity-60'
                                }
                            `}
                            style={{ width: CELL_SIZE, height: 24, marginRight: GAP }}
                            title={colClickable ? t('抽取此列') : t('无法抽取')}
                        >
                            ⬇
                        </button>
                    );
                })}
            </div>

            <div className="flex items-start">
                {/* Row buttons */}
                <div className="flex flex-col mr-2" style={{ paddingTop: HALF }}>
                    {matrix.map((row, rowIndex) => {
                        const hasActive = row.some(c => c !== null);
                        const altBlockedRow = wallType?.id === 'alternating' && lastDrawDirection === 'row';
                        const rowClickable = canDraw && hasActive && !altBlockedRow;
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
                                    transition-all duration-150
                                    ${rowClickable
                                        ? 'bg-gradient-to-r from-[#FFF3E0] to-[#FFE8CC] border-2 border-kitchen-gold rounded-lg shadow-[0_2px_0_#D4952A,0_0_10px_rgba(232,168,48,0.25)] text-kitchen-gold-deep font-bold cursor-pointer'
                                        : 'bg-[#F5F0E8] border-2 border-kitchen-gold-border-muted/50 text-kitchen-text-muted cursor-not-allowed opacity-60'
                                    }
                                `}
                                style={{ width: 36, height: CELL_SIZE, marginBottom: GAP }}
                                title={rowClickable ? t('抽取此行') : t('无法抽取')}
                            >
                                ➡
                            </button>
                        );
                    })}
                </div>

                {/* Wall grid — zero-gap CSS Grid, margins create visual spacing */}
                <div
                    style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${matrix[0]?.length || 4}, ${TRACK}px)`,
                        gridTemplateRows: `repeat(${matrix.length || 4}, ${TRACK}px)`,
                        /* no gap — margins on cells handle spacing */
                    }}
                >
                    {/* Cluster bridges — fill the 6px gaps between same-id
                        stickers so clusters render as contiguous shapes with
                        continuous outlines. Rendered below cells (zIndex 1)
                        so cell tooltips / highlights remain on top. */}
                    {clusterBridges.right.map(({ r, c }) => {
                        const key = `rb-${r}-${c}`;
                        const inHovered = hoveredClusterSet?.has(`${r}-${c}`) && hoveredClusterSet?.has(`${r}-${c + 1}`);
                        return (
                            <div
                                key={key}
                                className="pointer-events-none absolute"
                                style={{
                                    top: `${r * TRACK + HALF}px`,
                                    left: `${(c + 1) * TRACK - HALF}px`,
                                    width: `${GAP}px`,
                                    height: `${CELL_SIZE}px`,
                                    background: '#FFFDF8',
                                    borderTop: '1px solid #DCC8A0',
                                    borderBottom: '1px solid #DCC8A0',
                                    boxSizing: 'border-box',
                                    zIndex: 1,
                                    boxShadow: inHovered ? '0 0 0 2px rgba(232,168,48,0.55)' : undefined,
                                }}
                            />
                        );
                    })}
                    {clusterBridges.bottom.map(({ r, c }) => {
                        const key = `bb-${r}-${c}`;
                        const inHovered = hoveredClusterSet?.has(`${r}-${c}`) && hoveredClusterSet?.has(`${r + 1}-${c}`);
                        return (
                            <div
                                key={key}
                                className="pointer-events-none absolute"
                                style={{
                                    top: `${(r + 1) * TRACK - HALF}px`,
                                    left: `${c * TRACK + HALF}px`,
                                    width: `${CELL_SIZE}px`,
                                    height: `${GAP}px`,
                                    background: '#FFFDF8',
                                    borderLeft: '1px solid #DCC8A0',
                                    borderRight: '1px solid #DCC8A0',
                                    boxSizing: 'border-box',
                                    zIndex: 1,
                                    boxShadow: inHovered ? '0 0 0 2px rgba(232,168,48,0.55)' : undefined,
                                }}
                            />
                        );
                    })}
                    {clusterBridges.corner.map(({ r, c }) => {
                        const key = `cb-${r}-${c}`;
                        return (
                            <div
                                key={key}
                                className="pointer-events-none absolute"
                                style={{
                                    top: `${(r + 1) * TRACK - HALF}px`,
                                    left: `${(c + 1) * TRACK - HALF}px`,
                                    width: `${GAP}px`,
                                    height: `${GAP}px`,
                                    background: '#FFFDF8',
                                    zIndex: 1,
                                }}
                            />
                        );
                    })}

                    {/* Center rotate modifier: pulsing frame around the 2×2 + rotating ↻ hint */}
                    {wallType?.id === 'center_rotate' && (() => {
                        const r0 = Math.floor(MATRIX_CONFIG.gridSize / 2) - 1;
                        return (
                            <div
                                className="pointer-events-none absolute flex items-center justify-center"
                                style={{
                                    top: `${r0 * TRACK + HALF}px`,
                                    left: `${r0 * TRACK + HALF}px`,
                                    width: `${2 * TRACK - GAP}px`,
                                    height: `${2 * TRACK - GAP}px`,
                                    border: '2px dashed rgba(232, 168, 48, 0.6)',
                                    borderRadius: '10px',
                                    animation: 'center-rotate-frame-pulse 1.8s ease-in-out infinite',
                                    zIndex: 5,
                                }}
                            >
                                <div
                                    className="text-[72px] leading-none text-kitchen-gold/25 font-black select-none"
                                    style={{
                                        animation: 'center-rotate-idle 6s linear infinite',
                                        textShadow: '0 0 8px rgba(232,168,48,0.2)',
                                    }}
                                >
                                    ↻
                                </div>
                            </div>
                        );
                    })()}

                    {/* Mirror modifier: vertical divider between left and right halves */}
                    {wallType?.id === 'mirror' && (() => {
                        const size = MATRIX_CONFIG.gridSize;
                        const midX = (size / 2) * TRACK; // boundary between col 1 and col 2 for size=4
                        return (
                            <div
                                className="pointer-events-none absolute flex flex-col items-center justify-between"
                                style={{
                                    top: '0px',
                                    left: `${midX - 9}px`,
                                    width: '18px',
                                    height: `${size * TRACK}px`,
                                    zIndex: 4,
                                }}
                            >
                                <span className="text-base leading-none text-kitchen-gold/70 select-none" style={{ marginTop: '-4px' }}>🪞</span>
                                <div
                                    style={{
                                        flex: 1,
                                        width: '0',
                                        borderLeft: '2px dashed rgba(232, 168, 48, 0.55)',
                                        margin: '2px 0',
                                    }}
                                />
                                <span className="text-base leading-none text-kitchen-gold/70 select-none" style={{ marginBottom: '-4px' }}>🪞</span>
                            </div>
                        );
                    })()}

                    {/* Conveyor modifier: animated stripe + arrow overlay on the chosen row/column */}
                    {wallType?.id === 'conveyor' && (() => {
                        const isRow = wallType.conveyorAxis === 'row';
                        const idx = wallType.conveyorIndex;
                        const dir = wallType.conveyorDirection;
                        const size = MATRIX_CONFIG.gridSize;
                        const arrowChar = isRow ? (dir > 0 ? '→' : '←') : (dir > 0 ? '↓' : '↑');
                        const gradientAngle = isRow ? '60deg' : '150deg';
                        const OVERFLOW = 40; // extra margin so the translating layer never exposes its edge
                        return (
                            <div
                                className="pointer-events-none absolute"
                                style={{
                                    top: isRow ? `${idx * TRACK}px` : '0px',
                                    left: isRow ? '0px' : `${idx * TRACK}px`,
                                    width: isRow ? `${size * TRACK}px` : `${TRACK}px`,
                                    height: isRow ? `${TRACK}px` : `${size * TRACK}px`,
                                    overflow: 'hidden',
                                    borderRadius: '6px',
                                    zIndex: 3,
                                }}
                            >
                                {/* Inner layer: oversized stripe background translated via GPU transform */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: `-${OVERFLOW}px`,
                                        left: `-${OVERFLOW}px`,
                                        right: `-${OVERFLOW}px`,
                                        bottom: `-${OVERFLOW}px`,
                                        background: `repeating-linear-gradient(${gradientAngle}, rgba(232,168,48,0.20) 0 10px, transparent 10px 28px)`,
                                        animation: `${isRow ? 'conveyor-slide-h' : 'conveyor-slide-v'} 1.2s linear infinite${dir < 0 ? ' reverse' : ''}`,
                                        willChange: 'transform',
                                    }}
                                />
                                {/* Arrow: static, not affected by the sliding transform */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <span
                                        className="text-kitchen-gold/40 font-black select-none"
                                        style={{
                                            fontSize: '40px',
                                            lineHeight: 1,
                                            textShadow: '0 0 6px rgba(232,168,48,0.25)',
                                        }}
                                    >
                                        {arrowChar}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}
                    {matrix.flatMap((row, rowIndex) =>
                        row.map((cell, colIndex) => {
                            // Hover: cell is in hovered row or hovered column
                            const isRowHovered = hoveredRow === rowIndex && cell !== null;
                            const isColHovered = hoveredCol === colIndex && cell !== null;
                            const showHover = isRowHovered || isColHovered;

                            // Draw animation highlight — row mode
                            const isRowScanning = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === colIndex;
                            const isRowSettled = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && drawAnimState.phase === 'settled' && drawAnimState.finalColIndex === colIndex;
                            const isScanRow = drawAnimState?.direction === 'row' && drawAnimState.rowIndex === rowIndex && cell !== null && drawAnimState.phase === 'scanning';

                            // Draw animation highlight — column mode
                            const isColScanning = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'scanning' && drawAnimState.currentHighlight === rowIndex;
                            const isColSettled = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && drawAnimState.phase === 'settled' && drawAnimState.finalRowIndex === rowIndex;
                            const isScanCol = drawAnimState?.direction === 'column' && drawAnimState.colIndex === colIndex && cell !== null && drawAnimState.phase === 'scanning';

                            const isScanning = isRowScanning || isColScanning;
                            const isSettled = isRowSettled || isColSettled;
                            const isScanLine = isScanRow || isScanCol;

                            const dropDist = gravityDrops?.[`${rowIndex}-${colIndex}`] || 0;
                            const rotMove = rotationMoves?.[`${rowIndex}-${colIndex}`] || null;
                            const flash = growthFlashes?.has(`${rowIndex}-${colIndex}`) || false;
                            const buffCov = countBuffFieldCoverage(matrix, rowIndex, colIndex);

                            const cellKey = `${rowIndex}-${colIndex}`;
                            return (
                                <GridCell
                                    key={cellKey}
                                    cell={cell}
                                    cellContent={getCellContent(cell)}
                                    t={t}
                                    language={language}
                                    rowIndex={rowIndex}
                                    colIndex={colIndex}
                                    highlight={isSettled ? 'settled' : isScanning ? 'scanning' : isScanLine ? 'scan-row' : showHover ? 'hover' : null}
                                    gravityDrop={dropDist}
                                    rotationMove={rotMove}
                                    growthFlash={flash}
                                    buffCoverage={buffCov}
                                    sameNeighbors={sameNeighborsMap?.get(cellKey)}
                                    inHoveredCluster={hoveredClusterSet?.has(cellKey) || false}
                                    onClusterHover={handleClusterHover}
                                />
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
};

export default ResourceMatrix;
