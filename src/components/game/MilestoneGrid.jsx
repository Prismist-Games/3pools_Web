import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, revealedCellIds, onFillCell, milestoneNumber, hoveredPoolItemNames, canEvacuate, onEvacuate }) => {
  if (!milestone) return null;
  const { cells, tasks, gridBounds } = milestone;

  // Build grid lookup with offset
  const { cellGrid, minRow, minCol } = useMemo(() => {
    let minR = Infinity, minC = Infinity;
    cells.forEach(c => {
      if (c.row < minR) minR = c.row;
      if (c.col < minC) minC = c.col;
    });
    const grid = {};
    cells.forEach((cell, idx) => {
      grid[`${cell.row},${cell.col}`] = { cell, idx };
    });
    return { cellGrid: grid, minRow: minR, minCol: minC };
  }, [cells]);

  // Compute task connection lines (straight-line tasks → colored lines through cell centers)
  // Break task lines into cell-to-cell segments; only show if at least one endpoint is revealed
  const taskSegments = useMemo(() => {
    const segments = [];
    tasks.forEach((task, taskIndex) => {
      const taskCells = task.cellIndices.map(idx => cells[idx]);
      const color = TASK_COLORS[taskIndex % TASK_COLORS.length];
      const isHorizontal = taskCells.length <= 1 || taskCells.every(c => c.row === taskCells[0].row);

      if (taskCells.length <= 1) {
        if (revealedCellIds.has(taskCells[0].id)) {
          const c = taskCells[0];
          segments.push({ key: `${taskIndex}-dot`, color, isDot: true, gridRow: c.row - minRow + 1, gridCol: c.col - minCol + 1, isCompleted: task.isCompleted });
        }
        return;
      }

      const sorted = [...taskCells].sort((a, b) => isHorizontal ? a.col - b.col : a.row - b.row);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (!revealedCellIds.has(a.id) && !revealedCellIds.has(b.id)) continue;
        const rS = a.row - minRow + 1, cS = a.col - minCol + 1;
        const rE = b.row - minRow + 2, cE = b.col - minCol + 2;
        segments.push({
          key: `${taskIndex}-${i}`, color, isDot: false, isHorizontal,
          gridRowStart: rS, gridRowEnd: isHorizontal ? rS + 1 : rE,
          gridColStart: cS, gridColEnd: isHorizontal ? cE : cS + 1,
          isCompleted: task.isCompleted,
        });
      }
    });
    return segments;
  }, [tasks, cells, minRow, minCol, revealedCellIds]);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalTasks = tasks.length;

  return (
    <div className="flex items-start gap-4">
      {/* Grid */}
      <div
        className="relative grid p-3 bg-slate-200 rounded-2xl border border-slate-300 shadow-inner shrink-0"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 6rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 6rem)`,
          gap: '16px',
        }}
      >
        {/* Task connection line segments — only between adjacent cells where at least one is revealed */}
        {taskSegments.map((seg) => {
          if (seg.isDot) {
            return (
              <div key={seg.key} className={`pointer-events-none flex items-center justify-center ${seg.isCompleted ? 'opacity-25' : ''}`}
                style={{ gridRow: seg.gridRow, gridColumn: seg.gridCol, zIndex: 1 }}>
                <div className="rounded-full" style={{ width: 10, height: 10, backgroundColor: seg.color }} />
              </div>
            );
          }
          return (
            <div key={seg.key} className={`pointer-events-none flex items-center justify-center ${seg.isCompleted ? 'opacity-25' : ''}`}
              style={{ gridRow: `${seg.gridRowStart} / ${seg.gridRowEnd}`, gridColumn: `${seg.gridColStart} / ${seg.gridColEnd}`, zIndex: 1 }}>
              <div className="rounded-full" style={{ width: seg.isHorizontal ? '100%' : 5, height: seg.isHorizontal ? 5 : '100%', backgroundColor: seg.color }} />
            </div>
          );
        })}

        {/* Cells — explicitly positioned to avoid auto-flow conflicts with overlays */}
        {Array.from({ length: gridBounds.rows }).map((_, rowIdx) =>
          Array.from({ length: gridBounds.cols }).map((_, colIdx) => {
            const actualRow = rowIdx + minRow;
            const actualCol = colIdx + minCol;
            const key = `${actualRow},${actualCol}`;
            const entry = cellGrid[key];
            const gridStyle = {
              gridRow: rowIdx + 1,
              gridColumn: colIdx + 1,
              zIndex: 2,
            };

            if (!entry) {
              // Empty grid position: show "?" to hide grid shape
              return (
                <div key={`empty-${rowIdx}-${colIdx}`} className="w-24 h-24 rounded-lg flex items-center justify-center border-2 bg-slate-100 border-slate-300 border-dashed" style={gridStyle}>
                  <span className="text-3xl font-bold text-slate-300">?</span>
                </div>
              );
            }

            const { cell } = entry;
            const isRevealed = revealedCellIds.has(cell.id);
            const isFillable = isRevealed && fillableCellIds.includes(String(cell.id));

            // Evacuation cell: hide item info until a neighbor cell is filled
            let hideItemInfo = false;
            if (cell.hasEvacuation && !cell.filledItem) {
              const hasFilledNeighbor = cells.some(c =>
                c.filledItem &&
                ((Math.abs(c.row - cell.row) === 1 && c.col === cell.col) ||
                 (Math.abs(c.col - cell.col) === 1 && c.row === cell.row))
              );
              hideItemInfo = !hasFilledNeighbor;
            }

            const isHighlightedByPool = isRevealed && !hideItemInfo &&
              hoveredPoolItemNames && hoveredPoolItemNames.length > 0 &&
              hoveredPoolItemNames.includes(cell.itemName);

            return (
              <div key={cell.id} style={gridStyle}>
                <GridCell
                  cell={cell}
                  isFillable={isFillable}
                  isHighlighted={isHighlightedByPool}
                  isRevealed={isRevealed}
                  hideItemInfo={hideItemInfo}
                  onClick={onFillCell}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-3 pt-2 min-w-[100px]">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-black text-slate-700 tracking-wide leading-tight">
            里程碑 #{milestoneNumber}
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${completedTasks === totalTasks ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
            任务 {completedTasks}/{totalTasks}
          </span>
        </div>

        {canEvacuate && (
          <button
            onClick={onEvacuate}
            className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow transition-colors active:scale-95"
          >
            🚀 撤离
          </button>
        )}
      </div>
    </div>
  );
};

const MilestoneGrid = React.memo(MilestoneGridBase);
export default MilestoneGrid;
