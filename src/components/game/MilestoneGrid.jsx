import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, onFillCell, milestoneNumber }) => {
  if (!milestone) return null;
  const { cells, tasks, gridBounds } = milestone;

  // Build cell-to-task membership map: cellIndex -> [{ taskIndex, isCompleted }]
  const cellTaskMap = useMemo(() => {
    const map = {};
    tasks.forEach((task, taskIndex) => {
      task.cellIndices.forEach(cellIdx => {
        if (!map[cellIdx]) map[cellIdx] = [];
        map[cellIdx].push({ taskIndex, isCompleted: task.isCompleted });
      });
    });
    return map;
  }, [tasks]);

  // Build grid lookup: "row,col" -> { cell, idx }
  const { cellGrid, minRow, minCol } = useMemo(() => {
    let minR = Infinity, minC = Infinity;
    cells.forEach(c => {
      if (c.row < minR) minR = c.row;
      if (c.col < minC) minC = c.col;
    });
    const grid = {};
    cells.forEach((cell, idx) => {
      const key = `${cell.row},${cell.col}`;
      grid[key] = { cell, idx };
    });
    return { cellGrid: grid, minRow: minR, minCol: minC };
  }, [cells]);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalTasks = tasks.length;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1">
        <h3 className="text-base font-black text-slate-700 tracking-wide">
          里程碑 #{milestoneNumber}
        </h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${completedTasks === totalTasks ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
          任务 {completedTasks}/{totalTasks}
        </span>
      </div>

      {/* Task legend */}
      <div className="flex flex-wrap gap-3 w-full px-1">
        {tasks.map((task, taskIndex) => (
          <div
            key={task.id}
            className={`flex items-center gap-1.5 text-xs font-bold ${task.isCompleted ? 'line-through opacity-40' : 'text-slate-600'}`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: TASK_COLORS[taskIndex % TASK_COLORS.length] }}
            />
            <span>{task.cellIndices.length}格</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5 p-3 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 5rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 5rem)`,
        }}
      >
        {Array.from({ length: gridBounds.rows }).map((_, rowIdx) =>
          Array.from({ length: gridBounds.cols }).map((_, colIdx) => {
            const actualRow = rowIdx + minRow;
            const actualCol = colIdx + minCol;
            const key = `${actualRow},${actualCol}`;
            const entry = cellGrid[key];

            if (!entry) {
              return <div key={`empty-${rowIdx}-${colIdx}`} className="w-20 h-20" />;
            }

            const { cell } = entry;
            const isFillable = fillableCellIds.includes(String(cell.id));

            return (
              <GridCell
                key={cell.id}
                cell={cell}
                taskMemberships={cellTaskMap[cell.id] || []}
                isFillable={isFillable}
                onClick={onFillCell}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const MilestoneGrid = React.memo(MilestoneGridBase);
export default MilestoneGrid;
