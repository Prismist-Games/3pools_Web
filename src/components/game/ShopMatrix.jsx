import React from 'react';
import { PRIMARY_BTN, SECONDARY_BTN } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

// Cell: shows baseId name (no quality prefix) for ingredients, 🍌 for banana peels.
function MatrixCell({ cell, highlighted, targetedHighlight, targetedPickable, onClick, dimmed }) {
    const { t } = useLanguage();
    const isBanana = cell.type === 'banana_peel';
    const ringCls = targetedHighlight
        ? 'ring-4 ring-kitchen-gold ring-offset-2 ring-offset-kitchen-page'
        : highlighted
            ? 'ring-2 ring-kitchen-gold-dark'
            : '';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={dimmed}
            className={`h-20 rounded-xl border-2 flex flex-col items-center justify-center text-center px-1 py-1 relative transition-all
                ${isBanana ? 'border-yellow-500 bg-yellow-100' : 'border-kitchen-wood-border bg-kitchen-card'}
                ${ringCls}
                ${dimmed ? 'opacity-30' : ''}
                ${!dimmed && (targetedPickable || highlighted) ? 'hover:-translate-y-0.5 hover:shadow' : ''}
            `}
        >
            <div className="text-2xl leading-none">{cell.icon}</div>
            <div className="text-[10px] font-bold text-kitchen-text-title mt-0.5 leading-tight line-clamp-2">
                {isBanana ? t('香蕉皮') : t(cell.name)}
            </div>
        </button>
    );
}

export default function ShopMatrix({
    matrix,
    currentAffix,
    shopDrawState,
    hoveredRegion,
    onHover,
    onLeaveHover,
    onSelectRegion,
    onPickTargetedCell,
    onCancelSub,
    leaveShopAction,
    canLeaveShop,
    shop,
}) {
    const { t } = useLanguage();
    if (!matrix) return null;
    const gridSize = matrix.length;

    const inTargeted = shopDrawState.mode === 'targeted';
    const targetedRegion = inTargeted ? { topRow: shopDrawState.topRow, leftCol: shopDrawState.leftCol } : null;

    function cellInRegion(r, c, region) {
        if (!region) return false;
        return r >= region.topRow && r <= region.topRow + 1 && c >= region.leftCol && c <= region.leftCol + 1;
    }

    function handleMouseEnter(r, c) {
        if (inTargeted) return; // hover disabled while targeting
        // Only valid 2×2 if top-left is within [0, gridSize-2]
        if (r > gridSize - 2 || c > gridSize - 2) {
            onLeaveHover();
            return;
        }
        onHover(r, c);
    }

    function handleCellClick(r, c) {
        if (inTargeted) {
            if (cellInRegion(r, c, targetedRegion)) {
                onPickTargetedCell(r, c);
            }
            return;
        }
        // Commit selection from top-left anchor of the 2×2
        const topRow = Math.min(r, gridSize - 2);
        const leftCol = Math.min(c, gridSize - 2);
        onSelectRegion(topRow, leftCol);
    }

    const highlightRegion = inTargeted ? null : hoveredRegion;

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Shop + affix header */}
            <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-kitchen-text-title">
                    {shop?.icon} {t(shop?.name || '')}
                </div>
                <button
                    onClick={leaveShopAction}
                    disabled={!canLeaveShop}
                    className={SECONDARY_BTN + ' !px-3 !py-1.5 text-sm'}
                    title={t('所有已入篮的东西会并入冰箱')}
                >
                    {t('离开店')}
                </button>
            </div>

            <AffixBadge affix={currentAffix} />

            {/* 4×4 grid */}
            <div
                className="grid gap-2 p-3 bg-kitchen-wood-light rounded-2xl border-2 border-kitchen-wood-border shadow-inner"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                onMouseLeave={onLeaveHover}
            >
                {matrix.flatMap((row, r) =>
                    row.map((cell, c) => {
                        const inHover = cellInRegion(r, c, highlightRegion);
                        const inTarget = cellInRegion(r, c, targetedRegion);
                        const dimmed = inTargeted && !inTarget;
                        const pickable = inTargeted && inTarget;
                        return (
                            <div
                                key={cell.uid || `${r}-${c}`}
                                onMouseEnter={() => handleMouseEnter(r, c)}
                            >
                                <MatrixCell
                                    cell={cell}
                                    highlighted={inHover}
                                    targetedHighlight={inTarget}
                                    targetedPickable={pickable}
                                    dimmed={dimmed}
                                    onClick={() => handleCellClick(r, c)}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Sub-mode footer */}
            {inTargeted && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-kitchen-text-body">{t('从高亮的 2×2 中点击一格抽取')}</span>
                    <button onClick={onCancelSub} className={SECONDARY_BTN + ' !px-3 !py-1 text-xs'}>
                        {t('取消')}
                    </button>
                </div>
            )}

            {!inTargeted && shopDrawState.mode === 'idle' && (
                <div className="text-xs text-kitchen-text-secondary">
                    {t('鼠标悬停预览 2×2，点击任一格即以其为左上角抽取')}
                </div>
            )}
        </div>
    );
}

function AffixBadge({ affix }) {
    const { t } = useLanguage();
    if (!affix) return null;
    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border-2 border-kitchen-gold-border bg-orange-50 shadow-sm">
            <span className="text-xl">{affix.icon}</span>
            <div className="text-left">
                <div className="font-bold text-kitchen-text-title text-sm">
                    {t('本次词缀')}: {t(affix.name)}
                </div>
                <div className="text-xs text-kitchen-text-secondary max-w-md">
                    {t(affix.desc)}
                </div>
            </div>
        </div>
    );
}
