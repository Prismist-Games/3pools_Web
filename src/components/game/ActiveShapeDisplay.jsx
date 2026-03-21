import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { rotateCells } from '../../utils/matrixHelpers';
import { DIRECTION_ARROWS } from '../../data/matrixConfig';

const PREVIEW_SIZE = 5;

const ActiveShapeDisplay = ({ shape, direction }) => {
    const { t } = useLanguage();
    if (!shape) return null;

    // Rotate shape cells by current direction
    const pivot = shape.pivot || [0, 0];
    const cells = rotateCells(shape.cells, pivot, direction);

    // Center in preview grid
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const minR = Math.min(...rows), maxR = Math.max(...rows);
    const minC = Math.min(...cols), maxC = Math.max(...cols);
    const height = maxR - minR + 1, width = maxC - minC + 1;
    const offsetR = Math.floor((PREVIEW_SIZE - height) / 2) - minR;
    const offsetC = Math.floor((PREVIEW_SIZE - width) / 2) - minC;

    const filledSet = new Set(cells.map(([r, c]) => `${r + offsetR},${c + offsetC}`));
    const pivotKey = `${pivot[0] + offsetR},${pivot[1] + offsetC}`;

    const gridRows = [];
    for (let r = 0; r < PREVIEW_SIZE; r++) {
        const gridCols = [];
        for (let c = 0; c < PREVIEW_SIZE; c++) {
            const key = `${r},${c}`;
            const filled = filledSet.has(key);
            const isPivot = key === pivotKey;
            gridCols.push(
                <div
                    key={key}
                    className={`w-3 h-3 rounded-sm ${
                        isPivot ? 'bg-blue-500' :
                        filled ? 'bg-blue-300' : 'bg-transparent'
                    }`}
                />
            );
        }
        gridRows.push(<div key={r} className="flex gap-px">{gridCols}</div>);
    }

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex flex-col gap-px items-center">
                {gridRows}
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-700 leading-tight">{t(shape.name)} {DIRECTION_ARROWS[direction]}</span>
                <span className="text-[9px] text-slate-400 leading-tight">{t(shape.desc)}</span>
            </div>
        </div>
    );
};

export default ActiveShapeDisplay;
