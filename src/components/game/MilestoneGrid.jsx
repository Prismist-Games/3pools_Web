import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, onFillCell, milestoneNumber, hoveredPoolItemNames, canEvacuate, onEvacuate }) => {
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
  const taskLines = useMemo(() => {
    return tasks.map((task, taskIndex) => {
      const taskCells = task.cellIndices.map(idx => cells[idx]);
      const color = TASK_COLORS[taskIndex % TASK_COLORS.length];
      const isHorizontal = taskCells.length <= 1 || taskCells.every(c => c.row === taskCells[0].row);

      let gridRowStart, gridRowEnd, gridColStart, gridColEnd;
      if (isHorizontal) {
        const row = taskCells[0].row - minRow + 1;
        const cols = taskCells.map(c => c.col - minCol + 1).sort((a, b) => a - b);
        gridRowStart = row;
        gridRowEnd = row + 1;
        gridColStart = cols[0];
        gridColEnd = cols[cols.length - 1] + 1;
      } else {
        const col = taskCells[0].col - minCol + 1;
        const rows = taskCells.map(c => c.row - minRow + 1).sort((a, b) => a - b);
        gridRowStart = rows[0];
        gridRowEnd = rows[rows.length - 1] + 1;
        gridColStart = col;
        gridColEnd = col + 1;
      }

      return { taskIndex, color, isHorizontal, gridRowStart, gridRowEnd, gridColStart, gridColEnd, isCompleted: task.isCompleted, cellCount: taskCells.length };
    });
  }, [tasks, cells, minRow, minCol]);

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
        {/* Task connection lines — colored lines through cell centers */}
        {taskLines.map(({ taskIndex, color, isHorizontal, gridRowStart, gridRowEnd, gridColStart, gridColEnd, isCompleted, cellCount }) => (
          <div
            key={`task-line-${taskIndex}`}
            className={`pointer-events-none flex items-center justify-center ${isCompleted ? 'opacity-25' : ''}`}
            style={{
              gridRow: `${gridRowStart} / ${gridRowEnd}`,
              gridColumn: `${gridColStart} / ${gridColEnd}`,
              zIndex: 1,
            }}
          >
            {cellCount <= 1 ? (
              <div
                className="rounded-full"
                style={{ width: 10, height: 10, backgroundColor: color }}
              />
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: isHorizontal ? '100%' : 5,
                  height: isHorizontal ? 5 : '100%',
                  backgroundColor: color,
                }}
              />
            )}
          </div>
        ))}

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
              return <div key={`empty-${rowIdx}-${colIdx}`} className="w-24 h-24" style={gridStyle} />;
            }

            const { cell } = entry;
            const isFillable = fillableCellIds.includes(String(cell.id));

            const isHighlightedByPool = !cell.filledItem &&
              hoveredPoolItemNames && hoveredPoolItemNames.length > 0 &&
              hoveredPoolItemNames.includes(cell.itemName);

            return (
              <div key={cell.id} style={gridStyle}>
                <GridCell
                  cell={cell}
                  isFillable={isFillable}
                  isHighlighted={isHighlightedByPool}
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

        <div className="flex flex-col gap-2">
          {tasks.map((task, taskIndex) => (
            <div
              key={task.id}
              className={`flex items-center gap-1.5 text-xs font-bold ${task.isCompleted ? 'line-through opacity-40' : 'text-slate-600'}`}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: TASK_COLORS[taskIndex % TASK_COLORS.length] + '30',
                  border: `2px solid ${TASK_COLORS[taskIndex % TASK_COLORS.length]}`,
                }}
              />
              <span>{task.cellIndices.length}格</span>
            </div>
          ))}
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
