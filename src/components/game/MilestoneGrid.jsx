import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, onFillCell, milestoneNumber }) => {
  if (!milestone) return null;
  const { cells, tasks, gridBounds } = milestone;

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
    <div className="flex items-start gap-4">
      {/* Grid */}
      <div
        className="grid gap-1.5 p-3 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner shrink-0"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 6rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 6rem)`,
        }}
      >
        {Array.from({ length: gridBounds.rows }).map((_, rowIdx) =>
          Array.from({ length: gridBounds.cols }).map((_, colIdx) => {
            const actualRow = rowIdx + minRow;
            const actualCol = colIdx + minCol;
            const key = `${actualRow},${actualCol}`;
            const entry = cellGrid[key];

            if (!entry) {
              return <div key={`empty-${rowIdx}-${colIdx}`} className="w-24 h-24" />;
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

      {/* Side panel: header + task legend */}
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
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: TASK_COLORS[taskIndex % TASK_COLORS.length] }}
              />
              <span>{task.cellIndices.length}格</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MilestoneGrid = React.memo(MilestoneGridBase);
export default MilestoneGrid;
