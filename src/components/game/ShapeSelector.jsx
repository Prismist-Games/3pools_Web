import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SHAPE_DEFINITIONS } from '../../data/matrixConfig';
import { rotateCells } from '../../utils/matrixHelpers';

const PREVIEW_GRID = 5;

const renderShapePreview = (shape) => {
    // Show shape facing up (base orientation)
    const cells = shape.cells;
    const pivot = shape.pivot || [0, 0];

    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);
    const height = maxRow - minRow + 1, width = maxCol - minCol + 1;
    const offsetR = Math.floor((PREVIEW_GRID - height) / 2) - minRow;
    const offsetC = Math.floor((PREVIEW_GRID - width) / 2) - minCol;

    const filledSet = new Set(cells.map(([r, c]) => `${r + offsetR},${c + offsetC}`));
    const pivotKey = `${pivot[0] + offsetR},${pivot[1] + offsetC}`;

    const gridRows = [];
    for (let r = 0; r < PREVIEW_GRID; r++) {
        const gridCols = [];
        for (let c = 0; c < PREVIEW_GRID; c++) {
            const key = `${r},${c}`;
            const filled = filledSet.has(key);
            const isPivot = key === pivotKey;
            gridCols.push(
                <div key={key} className={`w-2.5 h-2.5 rounded-sm ${
                    isPivot ? 'bg-blue-500' : filled ? 'bg-slate-500' : 'bg-transparent'
                }`} />
            );
        }
        gridRows.push(<div key={r} className="flex gap-px">{gridCols}</div>);
    }

    return <div className="flex flex-col gap-px items-center justify-center">{gridRows}</div>;
};

const ShapeSelector = ({ activeShapeId, onSelect, onCancel }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
                <h3 className="text-lg font-black text-slate-800 text-center mb-4">{t("选择搜刮形状")}</h3>
                <div className="flex flex-wrap justify-center gap-3">
                    {SHAPE_DEFINITIONS.map(shape => (
                        <button
                            key={shape.id}
                            onClick={() => onSelect(shape)}
                            className={`flex flex-col items-center justify-between gap-2
                                w-24 h-32 px-2 py-3 rounded-xl border-2 transition-all duration-150 select-none
                                ${shape.id === activeShapeId
                                    ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'}
                                cursor-pointer active:scale-95
                            `}
                        >
                            <div className="flex items-center justify-center w-full flex-1">
                                {renderShapePreview(shape)}
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-semibold text-slate-700">{t(shape.name)}</span>
                                <span className="text-[10px] text-slate-400">{t(shape.desc)}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <button
                    onClick={onCancel}
                    className="mt-4 w-full py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                    {t("取消")}
                </button>
            </div>
        </div>
    );
};

export default ShapeSelector;
