import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ACTION_CONFIG, POSITION_CONFIG } from '../../data/v2Config';
import Tooltip from '../ui/Tooltip';

const ACTIONS = [
    {
        id: 'draw',
        icon: '🎲',
        nameZh: '抽取',
        nameEn: 'Draw',
        tooltipZh: '选一行或一列，行/列内随机命中 1 格，获取该格内容。',
        tooltipEn: 'Select a row or column. One cell in that line is drawn at random.',
    },
    {
        id: 'swap',
        icon: '🔄',
        nameZh: '换位',
        nameEn: 'Swap',
        tooltipZh: '选墙上任意 2 格，交换位置（内容不变）。',
        tooltipEn: 'Pick 2 cells on the wall and swap their positions.',
    },
    {
        id: 'disperse',
        icon: '💨',
        nameZh: '驱散',
        nameEn: 'Disperse',
        tooltipZh: '选 1 格，将其变为空格。之后抽取命中该格 = 无效果。',
        tooltipEn: 'Remove one cell, leaving an empty slot. Hitting it later gives nothing.',
    },
    {
        id: 'bomb',
        icon: '💥',
        nameZh: '炸墙',
        nameEn: 'Blast',
        tooltipZh: '选 3×3 区域的中心格，区域内所有格子重新随机生成。',
        tooltipEn: 'Pick a center cell. All 9 cells in the 3×3 area are re-rolled.',
    },
    {
        id: 'push_in',
        icon: '🏃',
        nameZh: '冲进去',
        nameEn: 'Push In',
        tooltipZh: '立即向摊位方向移动 2 格（下限：最深处）。',
        tooltipEn: 'Immediately move 2 steps toward the stall (minimum: innermost).',
    },
    {
        id: 'haggle',
        icon: '🤝',
        nameZh: '讨价还价',
        nameEn: 'Haggle',
        tooltipZh: '从菜篮中丢弃 1 件食材，向摊位方向移动 1 格（下限：最深处）。',
        tooltipEn: 'Discard 1 basket item to move 1 step toward the stall.',
    },
];

const dirBadge = (posDelta) => {
    if (posDelta === 0) return null;
    const steps = Math.abs(posDelta);
    return posDelta < 0
        ? { label: `←${steps}`, cls: 'bg-green-500' }
        : { label: `→${steps}`, cls: 'bg-kitchen-danger' };
};

const ActionMenu = ({ ap, position, activeAction, inventory, onAction, enabled }) => {
    const { t, language } = useLanguage();

    return (
        <div className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold-border rounded-xl p-2 shadow-[0_3px_0_#D4B896]">
            <div className="text-[10px] font-bold text-kitchen-text-secondary mb-1.5 text-center tracking-wider">
                ⚡ {t('动作菜单')}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {ACTIONS.map(action => {
                    const cfg = ACTION_CONFIG[action.id];
                    const isActive = activeAction?.id === action.id;
                    const otherActive = activeAction && !isActive;

                    let disabled = !enabled || otherActive;
                    if (!disabled && ap < cfg.ap) disabled = true;
                    if (!disabled && action.id === 'push_in' && position <= POSITION_CONFIG.min) disabled = true;
                    if (!disabled && action.id === 'haggle' && inventory.length === 0) disabled = true;

                    const name = language === 'en' ? action.nameEn : t(action.nameZh);
                    const tooltipText = language === 'en' ? action.tooltipEn : t(action.tooltipZh);
                    const badge = dirBadge(cfg.posDelta);

                    const btn = (
                        <button
                            onClick={() => !disabled || isActive ? onAction(action.id) : undefined}
                            disabled={disabled && !isActive}
                            className={`
                                relative flex flex-col items-center justify-center w-full
                                rounded-lg border-2 px-1 py-1.5 min-w-0
                                transition-all duration-150 text-center
                                ${isActive
                                    ? 'bg-amber-100 border-amber-500 shadow-[0_0_12px_rgba(232,168,48,0.6)] scale-105 ring-2 ring-amber-400'
                                    : disabled
                                    ? 'bg-white border-kitchen-gold-border-muted opacity-50 cursor-not-allowed'
                                    : 'bg-white border-kitchen-gold-border hover:border-kitchen-gold hover:scale-105 hover:shadow-md cursor-pointer'
                                }
                            `}
                        >
                            <span className="text-xl leading-none">{action.icon}</span>
                            <span className="text-[9px] font-bold mt-0.5 leading-tight text-center">{name}</span>
                            {/* AP badge */}
                            <span className={`
                                absolute -top-1 -left-1 text-[8px] font-black w-4 h-4 rounded-full
                                flex items-center justify-center shadow
                                ${cfg.ap === 0 ? 'bg-green-500 text-white' : 'bg-kitchen-gold text-white'}
                            `}>
                                {cfg.ap}
                            </span>
                            {/* Direction badge */}
                            {badge && (
                                <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1 h-4 rounded-full ${badge.cls} text-white flex items-center justify-center shadow`}>
                                    {badge.label}
                                </span>
                            )}
                        </button>
                    );

                    return (
                        <Tooltip key={action.id} content={
                            <div>
                                <div className="font-bold mb-1">{name} <span className="font-normal opacity-70">({cfg.ap} AP{badge ? ` · ${badge.label}格` : ''})</span></div>
                                <div className="leading-snug">{tooltipText}</div>
                            </div>
                        }>
                            {btn}
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
};

export default ActionMenu;
