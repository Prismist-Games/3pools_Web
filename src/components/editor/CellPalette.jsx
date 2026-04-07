import React from 'react';
import { CELL_TYPES } from '../../data/levelTemplates';

const PALETTE_ITEMS = [
  { type: null, icon: '🚫', label: '橡皮擦（随机填充）', group: '工具' },
  { type: CELL_TYPES.EMPTY, icon: '⬜', label: '空白格（不填充）', group: '工具' },
  { type: CELL_TYPES.DOOM_RESOLVE, icon: '💀', label: '厄运结算', group: '厄运' },
  { type: CELL_TYPES.DOOM_UPGRADE, icon: '⬆️', label: '厄运升级', group: '厄运' },
  { type: CELL_TYPES.ANY_DOOM, icon: '💀?', label: '随机厄运', group: '厄运' },
  { type: CELL_TYPES.BOMB, icon: '💣', label: '炸弹', group: '特殊' },
  { type: CELL_TYPES.GOLD, icon: '💰', label: '金币', group: '特殊' },
  { type: CELL_TYPES.ORDER, icon: '📋', label: '订单', group: '特殊' },
  { type: CELL_TYPES.OUT_OF_GAME, icon: '🎁', label: '出口物品', group: '特殊' },
  { type: CELL_TYPES.ANY_SPECIAL, icon: '❓', label: '随机特殊', group: '特殊' },
  { type: CELL_TYPES.ANY_STICKER, icon: '🏷️', label: '贴纸', group: '贴纸' },
];

const GROUP_COLORS = [
  'bg-rose-400/30 border-rose-400',
  'bg-sky-400/30 border-sky-400',
  'bg-amber-400/30 border-amber-400',
  'bg-lime-400/30 border-lime-400',
  'bg-violet-400/30 border-violet-400',
  'bg-teal-400/30 border-teal-400',
  'bg-orange-400/30 border-orange-400',
  'bg-pink-400/30 border-pink-400',
];

export default function CellPalette({
  activeBrush, onBrushChange,
  multiplier, onMultiplierChange,
  groupMode, onGroupModeChange,
  activeGroupNumber, onActiveGroupNumberChange,
}) {
  const groups = [...new Set(PALETTE_ITEMS.map(i => i.group))];

  return (
    <div className="flex flex-col gap-4 p-3 bg-gray-900/80 rounded-lg min-w-[180px]">
      {groups.map(group => (
        <div key={group}>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">{group}</div>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE_ITEMS.filter(i => i.group === group).map(item => (
              <button
                key={item.type ?? 'eraser'}
                onClick={() => { onBrushChange(item.type); if (groupMode) onGroupModeChange(false); }}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-sm transition-all
                  ${!groupMode && activeBrush === item.type
                    ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50'
                    : 'border-gray-600 bg-gray-800/60 hover:border-gray-400'
                  }`}
                title={item.label}
              >
                <span className="text-lg">{item.icon}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Group brush */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">编组</div>
        <button
          onClick={() => onGroupModeChange(!groupMode)}
          className={`w-full px-3 py-1.5 rounded border text-sm mb-2 transition-all
            ${groupMode
              ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50 text-yellow-300'
              : 'border-gray-600 bg-gray-800/60 hover:border-gray-400 text-gray-300'
            }`}
        >
          🔗 编组画笔 {groupMode ? '(开)' : '(关)'}
        </button>
        {groupMode && (
          <div className="flex flex-wrap gap-1.5">
            {GROUP_COLORS.map((color, i) => (
              <button
                key={i}
                onClick={() => onActiveGroupNumberChange(i)}
                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold transition-all
                  ${color}
                  ${activeGroupNumber === i ? 'ring-2 ring-white/60 scale-110' : 'opacity-70 hover:opacity-100'}`}
              >
                {i}
              </button>
            ))}
          </div>
        )}
        {groupMode && (
          <p className="text-[10px] text-gray-500 mt-1.5">点击贴纸格子分配到组 {activeGroupNumber}。右键移除。同组 = 同种类 + 同 polyomino。</p>
        )}
      </div>

      {/* Multiplier input */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">倍率</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">x</span>
          <input
            type="number"
            min={1}
            max={10}
            value={multiplier}
            onChange={(e) => onMultiplierChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-center text-sm text-white"
          />
          <span className="text-xs text-gray-500">(对所有格子生效)</span>
        </div>
      </div>
    </div>
  );
}
