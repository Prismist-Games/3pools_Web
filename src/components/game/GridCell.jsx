import React from 'react';
import { Check } from 'lucide-react';

// Match rarity styles from INITIAL_RARITY_CONFIG in constants.js
const RARITY_STYLES = {
  common: 'bg-slate-50 border-slate-300',
  uncommon: 'bg-green-50 border-green-400',
  rare: 'bg-blue-50 border-blue-400',
  epic: 'bg-purple-50 border-purple-400',
  legendary: 'bg-orange-50 border-orange-400',
  mythic: 'bg-rose-50 border-rose-500',
};

const RARITY_NAMES = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythic: '神话',
};

const GridCellBase = ({ cell, isFillable, isHighlighted, onClick }) => {
  const isFilled = !!cell.filledItem;
  const rarityStyle = RARITY_STYLES[cell.requiredRarity] || RARITY_STYLES.common;
  const displayIcon = isFilled ? cell.filledItem.icon : cell.itemIcon;
  const hasReward = cell.scoreReward > 0;

  const handleClick = () => {
    if (!isFilled && isFillable && onClick) {
      onClick(cell.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-24 h-24 rounded-lg flex flex-col items-center justify-center
        transition-all duration-200 select-none overflow-hidden z-10
        border-2 ${rarityStyle}
        ${isFillable && !isFilled ? 'cursor-pointer ring-2 ring-yellow-400 animate-pulse' : ''}
        ${isHighlighted && !isFilled ? 'ring-2 ring-sky-400 scale-105 shadow-lg shadow-sky-200/50' : ''}
        ${!isFillable && !isHighlighted && !isFilled ? 'cursor-default' : ''}
        ${isFilled ? 'bg-green-50 border-green-300' : ''}
      `}
    >
      {/* Top-left: rewards */}
      <div className="absolute top-1 left-1 flex flex-col gap-0.5">
        {cell.hasEvacuation && (
          <span className="text-xs leading-none">🚀</span>
        )}
        {hasReward && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1 rounded leading-tight">
            +{Math.round(cell.scoreReward)}分
          </span>
        )}
      </div>

      {/* Center: item icon + name */}
      <span className={`text-3xl leading-none ${isFilled ? '' : isHighlighted ? 'opacity-80' : 'grayscale opacity-40'}`}>
        {displayIcon}
      </span>
      <span className="text-xs font-medium leading-tight truncate max-w-full px-1 mt-1 text-slate-500">
        {cell.itemName}
      </span>

      {/* Bottom-left: rarity name */}
      <span className="absolute bottom-1 left-1 text-[9px] font-bold text-slate-400 leading-none">
        {RARITY_NAMES[cell.requiredRarity]}+
      </span>

      {/* Filled checkmark overlay */}
      {isFilled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full p-0.5 bg-green-500/70">
            <Check size={16} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
};

const GridCell = React.memo(GridCellBase);
export default GridCell;
