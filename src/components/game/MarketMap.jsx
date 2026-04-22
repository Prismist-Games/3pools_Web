// MarketMap.jsx — 4×4 market map UI for the 'map' phase.
// Player can see the grid, click valid nodes to move, and click current node to enter.

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MAP_CONFIG } from '../../data/mapConfig';

// Short display labels for each node type
const NODE_LABELS = {
    stall_seafood:   '海鲜市场',
    stall_meat:      '肉铺',
    stall_vegetable: '蔬菜店',
    stall_grain:     '粮食店',
    stall_dairy:     '乳品店',
    order_region_a:  '食材交换区 A',
    order_region_b:  '食材交换区 B',
    gold_variety:    '大排档',
    gold_quality:    '酒楼',
    pocket_money:    'ATM',
    entry_exit:      '入口',
    passage:         '过道',
};

// Icon fallback by type (used when nodeBehaviors icon is unavailable)
const NODE_ICONS = {
    stall_seafood:   '🦐',
    stall_meat:      '🍖',
    stall_vegetable: '🥬',
    stall_grain:     '🍚',
    stall_dairy:     '🧀',
    order_region_a:  '📋',
    order_region_b:  '📋',
    gold_variety:    '🍱',
    gold_quality:    '🏮',
    pocket_money:    '🏧',
    entry_exit:      '🚪',
    passage:         '·',
};

// Tooltip descriptions for each node type (supports JSX)
const NODE_DESCRIPTIONS = {
    stall_seafood:   '供应海鲜类食材（虾、贝、鱼等）。进入后从奖品墙抽取。',
    stall_meat:      '供应肉类食材（猪、牛、羊等）。进入后从奖品墙抽取。',
    stall_vegetable: '供应蔬菜类食材（叶菜、根茎、瓜果等）。进入后从奖品墙抽取。',
    stall_grain:     '供应粮食类食材（米、面、豆等）。进入后从奖品墙抽取。',
    stall_dairy:     '供应蛋奶类食材（鸡蛋、牛奶、乳酪等）。进入后从奖品墙抽取。',
    order_region_a:  '用背包中的食材完成订单，换取指定奖励食材。',
    order_region_b:  '用背包中的食材完成订单，换取指定奖励食材。',
    gold_variety: (
        <span>
            根据提交食材的子类多样性定价，同批次越多样越值钱。
            <br />
            <span className="text-yellow-300 font-bold">1种→1g · 2种→2g · 3种→3g · 4种→5g · 5种+→8g</span>（每件）
        </span>
    ),
    gold_quality: (
        <span>
            根据提交食材的品质逐件结算，品质越高单价越高。
            <br />
            <span className="text-yellow-300 font-bold">★→1g · ★★→2g · ★★★→3g · ★★★★→5g · ★★★★★→8g</span>
        </span>
    ),
    pocket_money:    '取出少量现金备用。',
    entry_exit:      '菜市场出入口。回到这里后点击可收摊回家。',
    passage:         '普通过道，可自由通行，无特殊功能。',
};

// Background color classes by node type category
const NODE_BG = {
    stall_seafood:   'bg-blue-50 border-blue-300',
    stall_meat:      'bg-red-50 border-red-300',
    stall_vegetable: 'bg-green-50 border-green-300',
    stall_grain:     'bg-yellow-50 border-yellow-300',
    stall_dairy:     'bg-orange-50 border-orange-300',
    order_region_a:  'bg-purple-50 border-purple-300',
    order_region_b:  'bg-purple-50 border-purple-300',
    gold_variety:    'bg-amber-50 border-amber-300',
    gold_quality:    'bg-amber-50 border-amber-300',
    pocket_money:    'bg-yellow-50 border-yellow-400',
    entry_exit:      'bg-gray-100 border-gray-400',
    passage:         'bg-gray-50 border-gray-200',
};

const STALL_TYPES = new Set([
    'stall_seafood', 'stall_meat', 'stall_vegetable', 'stall_grain', 'stall_dairy',
]);

/** Compute all valid move targets from current player position. */
function getValidMoves(playerPos) {
    const { x, y } = playerPos;
    const targets = [];
    // Straight moves: same row or column, 1–2 steps
    for (const dx of [-2, -1, 1, 2]) {
        const nx = x + dx;
        if (nx >= 0 && nx <= 3) targets.push({ x: nx, y });
    }
    for (const dy of [-2, -1, 1, 2]) {
        const ny = y + dy;
        if (ny >= 0 && ny <= 3) targets.push({ x, y: ny });
    }
    // Diagonal moves: 1 step in each direction
    for (const [dx, dy] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx <= 3 && ny >= 0 && ny <= 3) targets.push({ x: nx, y: ny });
    }
    return targets;
}

/** Check if pos1 and pos2 match. */
function posEq(pos1, pos2) {
    return pos1.x === pos2.x && pos1.y === pos2.y;
}

const MarketMap = ({
    mapState,
    onMove,
    onEnterNode,
    gold,
    hp,
    evacuationPending,
    onConfirmEvacuation,
    onCancelEvacuation,
    isMoving,
}) => {
    const [tooltip, setTooltip] = useState(null);
    // Pending diagonal move: player clicked a diagonal target but hasn't chosen the intermediate yet.
    const [diagonalPending, setDiagonalPending] = useState(null); // null | { to: {x,y} }

    const onNodeMouseEnter = useCallback((e, nodeType) => {
        const desc = NODE_DESCRIPTIONS[nodeType];
        if (!desc) return;
        setTooltip({ title: NODE_LABELS[nodeType] || nodeType, content: desc, x: e.clientX, y: e.clientY });
    }, []);

    const onNodeMouseMove = useCallback((e) => {
        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
    }, []);

    const onNodeMouseLeave = useCallback(() => setTooltip(null), []);

    if (!mapState) return null;

    const { nodes, edges, playerPosition } = mapState;
    const validMoves = getValidMoves(playerPosition);

    // Clear pending diagonal if movement starts externally.
    if (isMoving && diagonalPending) setDiagonalPending(null);

    const isValidTarget = (x, y) => validMoves.some(m => m.x === x && m.y === y);
    const isCurrentPos = (x, y) => posEq(playerPosition, { x, y });
    const isDiagonal = (x, y) =>
        Math.abs(x - playerPosition.x) === 1 && Math.abs(y - playerPosition.y) === 1;

    // When a diagonal destination is pending, compute the two intermediate options.
    const interA = diagonalPending ? { x: diagonalPending.to.x, y: playerPosition.y } : null;
    const interB = diagonalPending ? { x: playerPosition.x, y: diagonalPending.to.y } : null;
    const isIntermediate = (x, y) =>
        (interA && x === interA.x && y === interA.y) ||
        (interB && x === interB.x && y === interB.y);

    const getNode = (x, y) => nodes.find(n => n.position.x === x && n.position.y === y);

    // Find edge between two adjacent positions (any direction)
    const getEdge = (x1, y1, x2, y2) => edges.find(e =>
        (e.from.x === x1 && e.from.y === y1 && e.to.x === x2 && e.to.y === y2) ||
        (e.from.x === x2 && e.from.y === y2 && e.to.x === x1 && e.to.y === y1)
    );

    // 7×7 grid: positions 1-7 (CSS), even = node, odd = edge/gap
    // Node (x, y) → col: 2x+1, row: 2y+1 (1-indexed)
    // H-edge (x,y)↔(x+1,y) → col: 2x+2, row: 2y+1
    // V-edge (x,y)↔(x,y+1) → col: 2x+1, row: 2y+2

    const gridItems = [];

    // Render nodes (even grid positions)
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const node = getNode(x, y);
            if (!node) continue;

            const isCurrent = isCurrentPos(x, y);
            const isTarget = isValidTarget(x, y);
            const label = NODE_LABELS[node.type] || node.type;
            const icon = NODE_ICONS[node.type] || '?';
            const bgClass = NODE_BG[node.type] || 'bg-white border-gray-300';
            const isClaimed = node.state?.claimed;

            const isThisIntermediate = isIntermediate(x, y);
            const isThisDiagDest = diagonalPending && x === diagonalPending.to.x && y === diagonalPending.to.y;

            let ringClass = '';
            if (isMoving) {
                // no rings during animation
            } else if (diagonalPending) {
                if (isThisIntermediate) {
                    ringClass = 'ring-2 ring-orange-400 ring-offset-1 cursor-pointer hover:ring-orange-500 hover:brightness-95';
                } else if (isThisDiagDest) {
                    ringClass = 'ring-2 ring-purple-400 ring-offset-1';
                }
                // current node keeps gold ring
                if (isCurrent) ringClass = 'ring-2 ring-kitchen-gold ring-offset-1';
            } else {
                if (isCurrent) {
                    ringClass = 'ring-2 ring-kitchen-gold ring-offset-1';
                } else if (isTarget) {
                    ringClass = 'ring-2 ring-blue-400 ring-offset-1 cursor-pointer hover:ring-blue-500 hover:brightness-95';
                }
            }

            // Entry/exit current: show special label
            const actionLabel = !diagonalPending && isCurrent && node.type === 'entry_exit'
                ? '点击收摊'
                : !diagonalPending && isCurrent
                    ? '点击进入'
                    : diagonalPending && isThisIntermediate
                        ? '经此前往'
                        : null;

            const col = 2 * x + 1;
            const row = 2 * y + 1;

            gridItems.push(
                <div
                    key={`node_${x}_${y}`}
                    style={{ gridColumn: col, gridRow: row }}
                    onMouseEnter={(e) => onNodeMouseEnter(e, node.type)}
                    onMouseMove={onNodeMouseMove}
                    onMouseLeave={onNodeMouseLeave}
                    onClick={() => {
                        if (isMoving) return;
                        if (diagonalPending) {
                            if (isThisIntermediate) {
                                onMove(diagonalPending.to.x, diagonalPending.to.y, { x, y });
                            }
                            setDiagonalPending(null);
                            return;
                        }
                        if (isCurrent) {
                            onEnterNode();
                        } else if (isTarget) {
                            if (isDiagonal(x, y)) {
                                setDiagonalPending({ to: { x, y } });
                            } else {
                                onMove(x, y);
                            }
                        }
                    }}
                    className={`
                        w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center
                        relative select-none transition-all duration-150
                        ${bgClass} ${ringClass}
                        ${isMoving ? 'cursor-not-allowed' : (diagonalPending ? (isThisIntermediate ? 'cursor-pointer' : 'cursor-default') : isCurrent ? 'cursor-pointer' : isTarget ? 'cursor-pointer' : 'cursor-default')}
                        ${isClaimed ? 'opacity-50' : ''}
                    `}
                >
                    {/* Player marker */}
                    {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg leading-none z-10 drop-shadow">
                            🧑‍🍳
                        </span>
                    )}

                    <span className="text-2xl leading-none">{icon}</span>
                    <span className="text-[10px] font-bold text-center leading-tight mt-0.5 px-0.5 text-gray-700 truncate max-w-full">
                        {label}
                    </span>
                    {STALL_TYPES.has(node.type) && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 leading-tight">
                                💰{node.state?.price ?? MAP_CONFIG.gold.drawBaseCost}g
                            </span>
                            {(node.state?.crushCount ?? 0) > 0 && (
                                <span className="text-[9px] font-bold text-red-700 bg-red-100 border border-red-300 rounded px-1 leading-tight">
                                    🧑{node.state.crushCount}
                                </span>
                            )}
                        </div>
                    )}
                    {node.type === 'passage' && (node.state?.grabberCount ?? 0) > 0 && (
                        <span className="text-[9px] font-bold text-red-700 bg-red-100 border border-red-300 rounded px-1 mt-0.5 leading-tight">
                            🧑{node.state.grabberCount}
                        </span>
                    )}
                    {(node.type === 'gold_variety') && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 mt-0.5 leading-tight">
                            多样性 1~8g/件
                        </span>
                    )}
                    {(node.type === 'gold_quality') && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 mt-0.5 leading-tight">
                            品质 1~8g/件
                        </span>
                    )}

                    {/* Action label overlay */}
                    {actionLabel && (
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-kitchen-gold-deep bg-white border border-kitchen-gold-border rounded px-1 whitespace-nowrap shadow-sm z-10">
                            {actionLabel}
                        </span>
                    )}

                    {/* Valid target highlight arrow */}
                    {isTarget && !isCurrent && (
                        <span className="absolute inset-0 rounded-lg border-2 border-blue-400 opacity-40 pointer-events-none" />
                    )}
                </div>
            );
        }
    }

    // Render horizontal edges: (x,y)↔(x+1,y) for x in 0..2, y in 0..3
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 3; x++) {
            const edge = getEdge(x, y, x + 1, y);
            const col = 2 * x + 2;
            const row = 2 * y + 1;
            const hasGrabber = edge?.hasGrabber;

            gridItems.push(
                <div
                    key={`hedge_${x}_${y}`}
                    style={{ gridColumn: col, gridRow: row }}
                    className="relative flex items-center justify-center w-6 h-20"
                >
                    <div className={`h-1 w-full rounded-full ${hasGrabber ? 'bg-red-500' : 'bg-gray-300'}`} />
                    {hasGrabber && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs leading-none">🧑</span>
                    )}
                </div>
            );
        }
    }

    // Render vertical edges: (x,y)↔(x,y+1) for x in 0..3, y in 0..2
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 4; x++) {
            const edge = getEdge(x, y, x, y + 1);
            const col = 2 * x + 1;
            const row = 2 * y + 2;
            const hasGrabber = edge?.hasGrabber;

            gridItems.push(
                <div
                    key={`vedge_${x}_${y}`}
                    style={{ gridColumn: col, gridRow: row }}
                    className="relative flex items-center justify-center w-20 h-6"
                >
                    <div className={`w-1 h-full rounded-full ${hasGrabber ? 'bg-red-500' : 'bg-gray-300'}`} />
                    {hasGrabber && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs leading-none">🧑</span>
                    )}
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {tooltip && createPortal(
                <div
                    style={{ position: 'fixed', top: tooltip.y + 18, left: tooltip.x + 14 }}
                    className="max-w-[220px] px-3 py-2 bg-gray-900/95 text-white text-xs rounded-lg z-[9999] pointer-events-none shadow-xl border border-gray-700/50 leading-snug"
                >
                    <div className="font-bold text-white mb-1">{tooltip.title}</div>
                    <div className="text-gray-300">{tooltip.content}</div>
                </div>,
                document.body
            )}
            {/* Status bar */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gradient-to-b from-kitchen-card to-[#FFF3E0] rounded-xl border-2 border-kitchen-gold-border shadow-[0_2px_0_#D4B896] text-sm font-bold">
                <span className="text-kitchen-gold-deep">💰 {gold}g</span>
                <span className="text-kitchen-danger-text">
                    {Array.from({ length: 5 }).map((_, i) => i < hp ? '❤️' : '🤍').join('')}
                </span>
                <span className="text-kitchen-text-muted text-xs">
                    行动: {mapState.actionCounter} | 时钟: {mapState.clockTicks}
                </span>
            </div>

            {/* Map grid */}
            <div
                className="relative"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, auto)',
                    gridTemplateRows: 'repeat(7, auto)',
                    gap: '0px',
                    padding: '16px',
                    background: 'linear-gradient(to bottom, #FFFBF2, #FFF3E0)',
                    borderRadius: '16px',
                    border: '2px solid #D4B896',
                    boxShadow: '0 3px 0 #D4B896',
                }}
            >
                {gridItems}
            </div>

            {/* Instructions */}
            <div className="text-xs text-kitchen-text-muted text-center">
                点击蓝色节点移动 · 点击当前节点进入 · 走回入口后点击收摊
            </div>

            {/* Evacuation confirm dialog */}
            {evacuationPending && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] rounded-2xl border-2 border-kitchen-gold shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="text-4xl mb-4">🚪</div>
                        <h2 className="text-xl font-black text-kitchen-text-title mb-2">收摊回家？</h2>
                        <p className="text-sm text-kitchen-text-muted mb-6">
                            结束今天的采购，回去烹饪吧。
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onConfirmEvacuation}
                                className="px-6 py-2.5 bg-kitchen-success border-2 border-kitchen-success-border text-white font-bold rounded-xl shadow-[0_2px_0_rgba(96,160,112,0.5)] hover:brightness-95 transition-colors"
                            >
                                确认收摊
                            </button>
                            <button
                                onClick={onCancelEvacuation}
                                className="px-6 py-2.5 bg-kitchen-card border-2 border-kitchen-gold-border text-kitchen-text-body font-bold rounded-xl shadow-[0_2px_0_#D4B896] hover:bg-[#FFF3E0] transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketMap;
