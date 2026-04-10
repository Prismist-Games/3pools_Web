import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import GameTooltip from '../ui/GameTooltip';

const WALL_COLOR_STYLE = {
    brown:  { bg: 'bg-[#ead8bf]',   border: 'border-[#8b5a2b]',   text: 'text-[#5c3b1e]',   badgeBg: 'bg-[#d4b896]' },
    yellow: { bg: 'bg-yellow-50',   border: 'border-yellow-400',  text: 'text-yellow-700',  badgeBg: 'bg-yellow-100' },
    green:  { bg: 'bg-emerald-50',  border: 'border-emerald-400', text: 'text-emerald-700', badgeBg: 'bg-emerald-100' },
    red:    { bg: 'bg-red-50',      border: 'border-red-400',     text: 'text-red-700',     badgeBg: 'bg-red-100' },
    blue:   { bg: 'bg-blue-50',     border: 'border-blue-400',    text: 'text-blue-700',    badgeBg: 'bg-blue-100' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badgeBg: 'bg-gray-100' };

// Strip specific cell counts from wall function descriptions so the
// three-choice picker only communicates *which* special cells exist,
// not how many. The cell-tag row below already shows the concrete count.
//   "网格含4-5个金币格"      → "网格含金币格"
//   "Grid has 4-5 extra gold cells" → "Grid has gold cells"
// Full-count info is preserved in other surfaces (current wall panel, etc.).
const stripCellCounts = (s) => {
    if (typeof s !== 'string') return s;
    return s
        .replace(/\d+(?:-\d+)?个/g, '')                  // zh: "4-5个" / "3个"
        .replace(/\d+(?:-\d+)?\s+(extra\s+)?/gi, '')     // en: "4-5 extra " / "3 "
        .replace(/\s{2,}/g, ' ')                          // collapse stray whitespace
        .trim();
};

// Cell tag catalog — order controls rendering order on the button.
// `tone: 'danger'` tags render with a red background; others are neutral.
const CELL_TAG_META = [
    { key: 'doom_resolution',   icon: '🎲',  name: '厄运结算',   desc: '触发厄运结算：从厄运网格抽取数格，命中危险 -1 HP', tone: 'danger' },
    { key: 'doom_accumulation', icon: '☠',  name: '厄运积累',   desc: '厄运网格 +1 危险符号',                          tone: 'danger' },
    { key: 'bomb',              icon: '💣',  name: '炸弹',       desc: '爆炸：摧毁周围 8 格内所有格子',                 tone: 'danger' },
    { key: 'gold',              icon: '💰',  name: '金币',       desc: '抽中获得 1-2 金币' },
    { key: 'refresh',           icon: '🔄',  name: '刷新',       desc: '刷新次数 +1' },
    { key: 'order',             icon: '📋',  name: '订单',       desc: '获得 1 个随机订单（不花金币）' },
    { key: 'pass',              icon: '🎫',  name: '通行证',     desc: '立即给当前三选一中随机 1 面墙抽取次数 +1' },
    { key: 'shield',            icon: '🛡️', name: '护盾',       desc: '护盾次数 +1（可抵消 1 次厄运格）' },
    { key: 'backpack',          icon: '🎒',  name: '背包扩容',   desc: '背包容量 +1' },
    { key: 'fast_pass',         icon: '⏩',  name: '快速通道',   desc: '普通撤离等待回合数 -1（最低 1）' },
    { key: 'evacuation',        icon: '🚪',  name: '撤离',       desc: '可选择立即撤离（可拒绝）' },
];

const WallPicker = ({ candidates, onSelect, onRefresh, refreshCount, drawCount, gold, compact, disabled }) => {
    const { t } = useLanguage();

    const canUnlock = (wall) => {
        if (disabled) return false;
        const c = wall.unlockCondition;
        if (!c) return true;
        return (!c.draws || drawCount >= c.draws) && (!c.gold || gold >= c.gold);
    };

    return (
        <div className={compact ? 'mb-4' : 'text-center py-4'}>
            {!compact && (
                <>
                    <h2 className="text-base font-bold mb-1">{t('选择下一面奖品墙')}</h2>
                    <p className="text-[11px] text-gray-400 mb-3">{t('满足解锁条件即可进入')}</p>
                </>
            )}

            <div className="flex items-stretch gap-3 justify-center">
                {candidates.map((wall, idx) => {
                    const unlocked = canUnlock(wall);
                    const colorId = wall.wallColor?.id;
                    const hasFunction = !!wall.wallFunction;
                    const cs = hasFunction ? (WALL_COLOR_STYLE[colorId] || DEFAULT_STYLE) : DEFAULT_STYLE;
                    const c = wall.unlockCondition;

                    return (
                        <button
                            key={idx}
                            onClick={unlocked ? () => onSelect(idx) : undefined}
                            disabled={!unlocked}
                            className={[
                                'rounded-xl border-2 text-left transition-all duration-150',
                                'w-48 p-3 shadow-sm',
                                cs.bg, cs.border,
                                unlocked
                                    ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
                                    : 'opacity-50 cursor-not-allowed',
                            ].join(' ')}
                        >
                            {/* Row 1: Function name + desc */}
                            <div className={`text-base font-black mb-1 ${cs.text}`}>
                                {hasFunction ? t(wall.wallFunction.name) : t('普通奖品墙')}
                            </div>
                            {wall.wallFunction?.desc && (
                                <div className={`text-[11px] font-medium leading-snug mb-2 px-2 py-1 rounded-md ${cs.badgeBg || 'bg-gray-100'} ${cs.text}`}>
                                    {stripCellCounts(t(wall.wallFunction.desc))}
                                </div>
                            )}

                            {/* Row 2: Sticker types */}
                            <div className="flex gap-1 mb-2">
                                {wall.stickers?.map(s => (
                                    <div key={s.id}
                                        className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center text-sm shadow-sm"
                                        title={t(s.name)}>
                                        {s.icon}
                                    </div>
                                ))}
                            </div>

                            {/* Row 3: Draw limit */}
                            <div className="flex items-center gap-3 text-[10px] font-medium mb-1.5">
                                {(() => {
                                    const base = wall.wallFunction?.drawLimit ?? 5;
                                    const actual = wall.drawLimit ?? base;
                                    const boosted = actual > base;
                                    return (
                                        <span className={boosted ? 'text-cyan-600 font-bold' : 'text-blue-500'}>
                                            🎯 {t('抽取次数')}{' '}
                                            {boosted ? (
                                                <>
                                                    <span className="line-through opacity-50 mr-1 text-gray-500 font-medium">{base}</span>
                                                    <span>{actual}</span>
                                                    <span className="ml-0.5">🎫</span>
                                                </>
                                            ) : (
                                                actual
                                            )}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Special cell tags — icon only, no count. Doom + bomb omitted. */}
                            <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
                                {CELL_TAG_META.filter(m => m.key !== 'doom_resolution' && m.key !== 'doom_accumulation' && m.key !== 'bomb').map(meta => {
                                    const count = wall.cellCounts?.[meta.key] ?? 0;
                                    if (count === 0) return null;
                                    const toneClass = meta.tone === 'danger'
                                        ? 'bg-red-50 border-red-300 text-red-700'
                                        : 'bg-white border-gray-300 text-gray-700';
                                    return (
                                        <GameTooltip
                                            key={meta.key}
                                            icon={meta.icon}
                                            title={t(meta.name)}
                                            text={t(meta.desc)}
                                        >
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold leading-none ${toneClass}`}>
                                                <span>{meta.icon}</span>
                                            </span>
                                        </GameTooltip>
                                    );
                                })}
                            </div>

                            {/* Row 4: Unlock condition */}
                            {unlocked ? (
                                <div className="text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-center">
                                    ✅ {t('可进入')}
                                </div>
                            ) : (
                                <div className="text-[11px] font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-center">
                                    🔒 {t('抽取')} {drawCount}/{c?.draws ?? 0}
                                    {c?.gold ? ` | 💰 ${c.gold}` : ''}
                                </div>
                            )}
                        </button>
                    );
                })}

                {/* Refresh button */}
                {onRefresh && refreshCount > 0 && (
                    <button
                        onClick={disabled ? undefined : onRefresh}
                        disabled={disabled}
                        className={`self-center px-3 py-2 border rounded-lg text-xs font-medium transition-all shadow-sm ${
                            disabled ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                    >
                        🔄 {refreshCount}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WallPicker;
