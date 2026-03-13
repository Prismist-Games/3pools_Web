import React from 'react';
import { Check } from 'lucide-react';
import { RARITY_BG_COLORS } from '../../data/gridConstants';

const RARITY_NAMES = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythic: '神话',
};

const TASK_BORDER_WIDTH = '3px';

const GridCellBase = ({ cell, taskMemberships, taskBorders, isFillable, onClick }) => {
  const isFilled = !!cell.filledItem;
  const allTasksCompleted = isFilled && taskMemberships.length > 0 && taskMemberships.every(t => t.isCompleted);
  const rarityBg = RARITY_BG_COLORS[cell.requiredRarity] || RARITY_BG_COLORS.common;
  const displayIcon = isFilled ? cell.filledItem.icon : cell.itemIcon;
  const hasReward = cell.scoreReward > 0;

  const handleClick = () => {
    if (!isFilled && isFillable && onClick) {
      onClick(cell.id);
    }
  };

  // Build border style from task borders
  const borderStyle = {};
  if (taskBorders) {
    borderStyle.borderTopWidth = taskBorders.top ? TASK_BORDER_WIDTH : '1px';
    borderStyle.borderRightWidth = taskBorders.right ? TASK_BORDER_WIDTH : '1px';
    borderStyle.borderBottomWidth = taskBorders.bottom ? TASK_BORDER_WIDTH : '1px';
    borderStyle.borderLeftWidth = taskBorders.left ? TASK_BORDER_WIDTH : '1px';
    borderStyle.borderTopColor = taskBorders.top?.color || 'rgba(100,116,139,0.3)';
    borderStyle.borderRightColor = taskBorders.right?.color || 'rgba(100,116,139,0.3)';
    borderStyle.borderBottomColor = taskBorders.bottom?.color || 'rgba(100,116,139,0.3)';
    borderStyle.borderLeftColor = taskBorders.left?.color || 'rgba(100,116,139,0.3)';
    borderStyle.borderStyle = 'solid';
  }

  // Cell background based on rarity
  if (isFilled) {
    borderStyle.backgroundColor = allTasksCompleted
      ? 'rgba(34,197,94,0.2)'
      : 'rgba(34,197,94,0.1)';
  } else {
    borderStyle.backgroundColor = rarityBg.bg;
  }

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-24 h-24 rounded-lg flex flex-col items-center justify-center
        transition-all duration-200 select-none overflow-hidden
        ${isFillable && !isFilled ? 'cursor-pointer ring-2 ring-yellow-400 ring-inset animate-pulse' : ''}
        ${!isFillable && !isFilled ? 'cursor-default' : ''}
        ${isFilled ? 'opacity-80' : ''}
      `}
      style={borderStyle}
    >
      {/* Top-left: rewards */}
      <div className="absolute top-1 left-1 flex flex-col gap-0.5">
        {cell.hasEvacuation && (
          <span className="text-xs leading-none">🚀</span>
        )}
        {hasReward && (
          <span className="text-[10px] font-bold text-yellow-300 bg-yellow-900/50 px-1 rounded leading-tight">
            +{cell.scoreReward}分
          </span>
        )}
      </div>

      {/* Center: item icon + name */}
      <span className={`text-3xl leading-none ${isFilled ? '' : 'grayscale opacity-50'}`}>
        {displayIcon}
      </span>
      <span className={`text-xs font-medium leading-tight truncate max-w-full px-1 mt-1 ${isFilled ? 'text-gray-300' : 'text-gray-400'}`}>
        {cell.itemName}
      </span>

      {/* Bottom-left: rarity name (subtle, since bg already shows it) */}
      <span className="absolute bottom-1 left-1 text-[9px] font-bold text-gray-400/60 leading-none">
        {RARITY_NAMES[cell.requiredRarity]}+
      </span>

      {/* Filled checkmark overlay */}
      {isFilled && (
        <div className={`absolute inset-0 flex items-center justify-center ${allTasksCompleted ? 'bg-green-500/20' : ''}`}>
          <div className={`rounded-full p-0.5 ${allTasksCompleted ? 'bg-green-400' : 'bg-green-600/60'}`}>
            <Check size={16} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
};

const GridCell = React.memo(GridCellBase);
export default GridCell;
