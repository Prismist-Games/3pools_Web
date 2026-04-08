import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const WALL_COLOR_STYLE = {
    brown:  { bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-700' },
    yellow: { bg: 'bg-yellow-50',   border: 'border-yellow-400',  text: 'text-yellow-700' },
    green:  { bg: 'bg-emerald-50',  border: 'border-emerald-400', text: 'text-emerald-700' },
    red:    { bg: 'bg-red-50',      border: 'border-red-400',     text: 'text-red-700' },
    blue:   { bg: 'bg-blue-50',     border: 'border-blue-400',    text: 'text-blue-700' },
};

const DEFAULT_COLOR_STYLE = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' };

const WallPicker = ({ candidates, onSelect, onRefresh, refreshCount, drawCount, gold }) => {
    const { t } = useLanguage();

    const canUnlock = (wall) => {
        const c = wall.unlockCondition;
        if (!c) return true;
        return (!c.draws || drawCount >= c.draws) && (!c.gold || gold >= c.gold);
    };

    return (
        <div className="text-center py-6">
            <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
            <p className="text-[11px] text-gray-400 mb-3">{t('满足解锁条件即可进入')}</p>

            {onRefresh && refreshCount > 0 && (
                <div className="mb-4">
                    <button
                        onClick={onRefresh}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-600
                            hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm"
                    >
                        🔄 {t('刷新')} ({refreshCount})
                    </button>
                </div>
            )}

            <div className="flex gap-4 justify-center flex-wrap">
                {candidates.map((wall, idx) => {
                    const unlocked = canUnlock(wall);
                    const colorId = wall.wallColor?.id;
                    const colorStyle = WALL_COLOR_STYLE[colorId] || DEFAULT_COLOR_STYLE;
                    const c = wall.unlockCondition;

                    const negativeCount =
                        (wall.cellCounts?.doom_resolution ?? 0) +
                        (wall.cellCounts?.doom_accumulation ?? 0) +
                        (wall.cellCounts?.damage ?? 0);
                    const goldCount = wall.cellCounts?.gold ?? 0;

                    return (
                        <button
                            key={idx}
                            onClick={unlocked ? () => onSelect(idx) : undefined}
                            disabled={!unlocked}
                            className={[
                                'w-52 p-4 rounded-xl shadow-md border-2 text-left transition-all duration-150',
                                colorStyle.bg,
                                colorStyle.border,
                                unlocked
                                    ? 'opacity-100 cursor-pointer hover:shadow-lg hover:brightness-95'
                                    : 'opacity-60 cursor-not-allowed',
                            ].join(' ')}
                        >
                            {/* Wall color icon + name */}
                            <div className={`text-sm font-bold mb-2 ${colorStyle.text}`}>
                                {wall.wallColor?.icon ?? '🧱'} {t(wall.wallColor?.name ?? '奖品墙')}
                            </div>

                            {/* Sticker types */}
                            {wall.stickers && wall.stickers.length > 0 && (
                                <div className="mb-2">
                                    <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">{t('贴纸')}</div>
                                    <div className="flex gap-1 flex-wrap">
                                        {wall.stickers.map(s => (
                                            <div
                                                key={s.id}
                                                className="w-7 h-7 rounded border border-gray-300 bg-white flex items-center justify-center text-sm shadow-sm"
                                                title={t(s.name)}
                                            >
                                                {s.icon}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Negative cell count */}
                            <div className="text-[10px] text-red-500 font-medium mb-1">
                                💀 {negativeCount} {t('厄运格')}
                            </div>

                            {/* Gold cell count */}
                            <div className="text-[10px] text-yellow-600 font-medium mb-2">
                                💰 {goldCount} {t('金币格')}
                            </div>

                            {/* Unlock condition */}
                            {unlocked ? (
                                <div className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                                    ✅ {t('可进入')}
                                </div>
                            ) : (
                                <div className="text-[10px] font-medium px-2 py-1 rounded bg-gray-100 text-gray-500 leading-relaxed">
                                    🔒 {t('抽取')} {drawCount}/{c?.draws ?? 0}
                                    {c?.gold ? ` 💰${c.gold}` : ''}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WallPicker;
