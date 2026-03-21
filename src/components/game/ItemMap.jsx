import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isValidPlacement } from '../../utils/spatialPoolHelpers';
import { MAP_ROWS, MAP_COLS } from '../../data/spatialConstants';

/**
 * ItemMap — renders the 5×4 item grid and handles frame placement interaction.
 *
 * Props:
 *   itemMap: 2D array [row][col] of { name, icon, poolId, poolName }
 *   selectedFrame: the currently selected frame object (or null)
 *   closureMask: Set of "row,col" strings for closed cells
 *   onPlace: (anchorRow, anchorCol) => void
 *   onHoverCoverage: (itemNames[]) => void
 *   disabled: boolean
 */
function ItemMap({ itemMap, selectedFrame, closureMask, onPlace, onHoverCoverage, disabled }) {
  const { t } = useLanguage();
  const [hoverAnchor, setHoverAnchor] = useState(null);

  const coveredCells = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return new Set();
    const { row, col } = hoverAnchor;
    if (!isValidPlacement(selectedFrame.shape, row, col, closureMask)) return new Set();
    const cells = new Set();
    for (const [dr, dc] of selectedFrame.shape.cells) {
      cells.add(`${row + dr},${col + dc}`);
    }
    return cells;
  }, [selectedFrame, hoverAnchor, closureMask]);

  const isValidHover = useMemo(() => {
    if (!selectedFrame || !hoverAnchor) return false;
    return isValidPlacement(selectedFrame.shape, hoverAnchor.row, hoverAnchor.col, closureMask);
  }, [selectedFrame, hoverAnchor, closureMask]);

  const handleCellHover = (row, col) => {
    if (!selectedFrame || disabled) return;
    setHoverAnchor({ row, col });
    if (isValidPlacement(selectedFrame.shape, row, col, closureMask) && onHoverCoverage) {
      const names = selectedFrame.shape.cells
        .map(([dr, dc]) => itemMap[row + dr]?.[col + dc]?.name)
        .filter(Boolean);
      onHoverCoverage(names);
    }
  };

  const handleMouseLeave = () => {
    setHoverAnchor(null);
    if (onHoverCoverage) onHoverCoverage([]);
  };

  const handleCellClick = (row, col) => {
    if (!selectedFrame || disabled) return;
    if (!isValidPlacement(selectedFrame.shape, row, col, closureMask)) return;
    onPlace(row, col);
    setHoverAnchor(null);
  };

  if (!itemMap) return null;

  return (
    <div
      className="inline-grid gap-1 p-2 bg-slate-100 rounded-lg border border-slate-200"
      style={{
        gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)`,
      }}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: MAP_ROWS * MAP_COLS }, (_, i) => {
        const row = Math.floor(i / MAP_COLS);
        const col = i % MAP_COLS;
        const item = itemMap[row][col];
        const isClosed = closureMask && closureMask.has(`${row},${col}`);
        const isCovered = coveredCells.has(`${row},${col}`);

        if (isClosed) {
          return (
            <div
              key={`${row}-${col}`}
              className="w-16 h-16 rounded-md bg-slate-200/60 border border-slate-200/40"
            />
          );
        }

        return (
          <div
            key={`${row}-${col}`}
            className={`
              flex flex-col items-center justify-center
              w-16 h-16 rounded-md border transition-all cursor-default select-none
              ${isCovered && isValidHover
                ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 scale-105'
                : 'bg-white border-slate-200'
              }
              ${selectedFrame && !disabled ? 'cursor-crosshair' : ''}
            `}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[56px]">
              {t(item.name)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ItemMap);
