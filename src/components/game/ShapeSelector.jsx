import React from 'react';
import { RotateCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const renderShapePreview = (shape, orientation) => {
    const cells = shape.hasOrientation
        ? shape.cells[orientation]
        : shape.cells.default;

    if (!cells || cells.length === 0) return null;

    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    const pivot = shape.pivot || [0, 0];

    const filledSet = new Set(cells.map(([r, c]) => `${r},${c}`));

    const gridRows = [];
    for (let r = minRow; r <= maxRow; r++) {
        const gridCols = [];
        for (let c = minCol; c <= maxCol; c++) {
            const filled = filledSet.has(`${r},${c}`);
            const isPivot = r === pivot[0] && c === pivot[1];
            gridCols.push(
                <div
                    key={`${r}-${c}`}
                    className={`w-3 h-3 rounded-sm ${
                        isPivot ? 'bg-blue-500' :
                        filled ? 'bg-slate-500' : 'bg-transparent'
                    }`}
                />
            );
        }
        gridRows.push(
            <div key={r} className="flex gap-0.5">
                {gridCols}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 items-center justify-center">
            {gridRows}
        </div>
    );
};

const ShapeSelector = ({
    shapes,
    orientation,
    onDraw,
    onHoverShape,
    onLeaveShape,
    onToggleOrientation,
    gold,
    disabled,
    hoveredShape,
}) => {
    const { t } = useLanguage();

    // Show orientation toggle when any orientable shape is being hovered
    const showOrientationToggle = shapes.some(s => s.hasOrientation);

    return (
        <div className={`flex items-center gap-3 flex-wrap ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            {shapes.map(shape => {
                const canAfford = gold >= shape.cost;
                const isHovered = hoveredShape && hoveredShape.id === shape.id;

                return (
                    <button
                        key={shape.id}
                        onClick={() => canAfford && onDraw(shape)}
                        onMouseEnter={() => canAfford && onHoverShape(shape)}
                        onMouseLeave={onLeaveShape}
                        disabled={!canAfford}
                        className={`
                            flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2
                            transition-all duration-150 select-none
                            ${isHovered
                                ? 'ring-2 ring-green-400 border-green-400 bg-green-50 scale-105'
                                : 'border-slate-200 bg-white hover:border-slate-300'}
                            ${!canAfford ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                        `}
                    >
                        <div className="min-h-[36px] flex items-center justify-center">
                            {renderShapePreview(shape, orientation)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 leading-tight">
                            {t(shape.name)}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-0.5">
                            🪙 {shape.cost}
                        </span>
                    </button>
                );
            })}

            {showOrientationToggle && (
                <button
                    onClick={onToggleOrientation}
                    className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border-2
                        border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50
                        transition-all duration-150 cursor-pointer active:scale-95 select-none"
                >
                    <RotateCw size={14} className="text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">
                        {orientation === 'h' ? t('横') : t('竖')}
                    </span>
                </button>
            )}
        </div>
    );
};

export default ShapeSelector;
