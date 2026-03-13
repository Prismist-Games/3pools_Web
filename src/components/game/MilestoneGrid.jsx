import React, { useMemo } from 'react';
import GridCell from './GridCell';
import { TASK_COLORS } from '../../data/gridConstants';

const MilestoneGridBase = ({ milestone, fillableCellIds, onFillCell, milestoneNumber }) => {
  if (!milestone) return null;
  const { cells, tasks, gridBounds } = milestone;

  // Build cell-to-task membership map
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

  // Compute task border edges for each cell
  // For each cell, for each task it belongs to, determine which edges are task boundaries
  // Then merge into a single border spec per cell edge (first task wins per edge)
  const cellBorders = useMemo(() => {
    const result = {}; // cellIdx -> { top, right, bottom, left } each is {color, width} or null

    cells.forEach((cell, cellIdx) => {
      const memberships = cellTaskMap[cellIdx] || [];
      const edges = { top: null, right: null, bottom: null, left: null };

      for (const { taskIndex } of memberships) {
        const task = tasks[taskIndex];
        const taskCellSet = new Set(task.cellIndices);
        const color = TASK_COLORS[taskIndex % TASK_COLORS.length];

        const directions = [
          { name: 'top', dr: -1, dc: 0 },
          { name: 'bottom', dr: 1, dc: 0 },
          { name: 'left', dr: 0, dc: -1 },
          { name: 'right', dr: 0, dc: 1 },
        ];

        for (const dir of directions) {
          if (edges[dir.name]) continue; // already claimed by another task
          const neighborKey = `${cell.row + dir.dr},${cell.col + dir.dc}`;
          const neighbor = cellGrid[neighborKey];
          const neighborInSameTask = neighbor && taskCellSet.has(neighbor.idx);
          if (!neighborInSameTask) {
            edges[dir.name] = { color, taskIndex };
          }
        }
      }

      result[cellIdx] = edges;
    });

    return result;
  }, [cells, tasks, cellTaskMap, cellGrid]);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const totalTasks = tasks.length;

  return (
    <div className="flex items-start gap-4">
      {/* Grid */}
      <div
        className="grid p-2 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner shrink-0"
        style={{
          gridTemplateColumns: `repeat(${gridBounds.cols}, 6rem)`,
          gridTemplateRows: `repeat(${gridBounds.rows}, 6rem)`,
          gap: '2px',
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

            const { cell, idx } = entry;
            const isFillable = fillableCellIds.includes(String(cell.id));

            return (
              <GridCell
                key={cell.id}
                cell={cell}
                taskMemberships={cellTaskMap[cell.id] || []}
                taskBorders={cellBorders[cell.id]}
                isFillable={isFillable}
                onClick={onFillCell}
              />
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
                className="w-3 h-3 rounded-sm shrink-0 border-2"
                style={{ borderColor: TASK_COLORS[taskIndex % TASK_COLORS.length] }}
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
