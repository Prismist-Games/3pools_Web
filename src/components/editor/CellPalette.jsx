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
  { type: CELL_TYPES.ANY_STICKER, icon: '🏷️', label: '随机贴纸', group: '贴纸' },
  { type: CELL_TYPES.STICKER_A, icon: 'A', label: '贴纸A', group: '贴纸' },
  { type: CELL_TYPES.STICKER_B, icon: 'B', label: '贴纸B', group: '贴纸' },
  { type: CELL_TYPES.STICKER_C, icon: 'C', label: '贴纸C', group: '贴纸' },
];

export default function CellPalette({ activeBrush, onBrushChange, multiplier, onMultiplierChange }) {
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
                onClick={() => onBrushChange(item.type)}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-sm transition-all
                  ${activeBrush === item.type
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
