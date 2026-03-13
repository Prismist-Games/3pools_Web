import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, onFillCell, milestoneNumber }) => {
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
  // Calculate min row/col offset so we render from 0,0
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
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-900 rounded-2xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h3 className="text-sm font-black text-white tracking-wide">
          里程碑 #{milestoneNumber}
        </h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completedTasks === totalTasks ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
          任务: {completedTasks}/{totalTasks}
        </span>
      </div>

      {/* Task legend */}
      <div className="flex flex-wrap gap-2 w-full">
        {tasks.map((task, taskIndex) => (
          <div
            key={task.id}
            className={`flex items-center gap-1 text-[10px] font-bold ${task.isCompleted ? 'line-through opacity-40' : 'text-gray-300'}`}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: TASK_COLORS[taskIndex % TASK_COLORS.length] }}
            />
            <span>{task.cellIndices.length}格</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 4rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 4rem)`,
        }}
      >
        {Array.from({ length: gridBounds.rows }).map((_, rowIdx) =>
          Array.from({ length: gridBounds.cols }).map((_, colIdx) => {
            const actualRow = rowIdx + minRow;
            const actualCol = colIdx + minCol;
            const key = `${actualRow},${actualCol}`;
            const entry = cellGrid[key];

            if (!entry) {
              return <div key={`empty-${rowIdx}-${colIdx}`} className="w-16 h-16" />;
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
