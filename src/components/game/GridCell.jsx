import React from 'react';
import { Check } from 'lucide-react';

const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: '#EF4444',
};
const RARITY_NAMES = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythic: '神话',
};

const TASK_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

const GridCellBase = ({ cell, taskMemberships, isFillable, onClick }) => {
  const isFilled = !!cell.filledItem;
  const allTasksCompleted = isFilled && taskMemberships.length > 0 && taskMemberships.every(t => t.isCompleted);
  const rarityColor = RARITY_COLORS[cell.requiredRarity] || '#9CA3AF';
  const rarityName = RARITY_NAMES[cell.requiredRarity] || cell.requiredRarity;

  const displayIcon = isFilled ? cell.filledItem.item_data.icon : cell.itemIcon;

  const handleClick = () => {
    if (!isFilled && isFillable && onClick) {
      onClick(cell.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center
        transition-all duration-200 select-none overflow-hidden
        ${isFilled
          ? allTasksCompleted
            ? 'border-green-400 bg-green-900/40'
            : 'border-green-600/60 bg-green-900/20 opacity-80'
          : isFillable
            ? 'border-yellow-400 bg-gray-700 cursor-pointer hover:bg-gray-600 animate-pulse'
            : 'border-gray-600 bg-gray-800 cursor-default'
        }
      `}
    >
      {/* Evacuation marker — top-left */}
      {cell.hasEvacuation && (
        <div className="absolute top-0 left-0 text-[10px] leading-none p-0.5">
          🚀
        </div>
      )}

      {/* Score reward — top-right */}
      <div className="absolute top-0 right-0 p-0.5 text-[9px] font-bold text-yellow-400 leading-none">
        +{cell.scoreReward}
      </div>

      {/* Item icon */}
      <span className={`text-xl leading-none ${isFilled ? '' : 'grayscale opacity-60'}`}>
        {displayIcon}
      </span>

      {/* Item name */}
      <span className="text-[8px] text-gray-300 font-medium leading-none truncate max-w-full px-0.5 mt-0.5">
        {cell.itemName}
      </span>

      {/* Rarity badge — bottom-right */}
      <div
        className="absolute bottom-0 right-0 px-1 py-px text-[7px] font-bold leading-none rounded-tl-md"
        style={{ backgroundColor: rarityColor + '33', color: rarityColor }}
      >
        {rarityName}+
      </div>

      {/* Task membership dots — bottom-left */}
      {taskMemberships.length > 0 && (
        <div className="absolute bottom-0.5 left-0.5 flex gap-px">
          {taskMemberships.map(({ taskIndex, isCompleted }) => (
            <div
              key={taskIndex}
              className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'opacity-40' : ''}`}
              style={{ backgroundColor: TASK_COLORS[taskIndex % TASK_COLORS.length] }}
            />
          ))}
        </div>
      )}

      {/* Filled checkmark overlay */}
      {isFilled && (
        <div className={`absolute inset-0 flex items-center justify-center ${allTasksCompleted ? 'bg-green-500/20' : 'bg-green-900/10'}`}>
          <div className={`rounded-full p-0.5 ${allTasksCompleted ? 'bg-green-400' : 'bg-green-600/70'}`}>
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
};

const GridCell = React.memo(GridCellBase);
export default GridCell;
