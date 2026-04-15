import React from 'react';
import { getRequirements, canSatisfyCard, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * PassiveCard — unified w-44 vertical card for all sticker-matching cards.
 * Sticker/item cells match the inventory slot size (40x40) for visual parity.
 */

const TYPE_CONFIG = {
    danger: {
        icon: '⚠️',
        label: '危险卡',
        borderSatisfied: 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50',
        borderDefault: 'border-red-300 bg-gradient-to-b from-red-50 to-rose-50',
    },
    profit: {
        icon: '💎',
        label: '物品兑换券',
        borderSatisfied: 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50',
        borderDefault: 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50',
    },
    evacuation: {
        icon: '🚪',
        label: '撤离',
        borderSatisfied: 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50',
        borderDefault: 'border-amber-300 bg-gradient-to-b from-amber-50 to-yellow-50',
    },
};

function PassiveCardBase({
    card,
    type,
    inventory,
    onRemove,
    onEvacuate,
    canEvacuate,
    satisfiedProfitCount,
    evacuationProfitRequirement,
    t,
}) {
    const config = TYPE_CONFIG[type];
    const isEvacuation = type === 'evacuation';

    let satisfied;
    let reqs = {};
    if (isEvacuation) {
        satisfied = !!canEvacuate;
    } else {
        reqs = getRequirements(card);
        satisfied = canSatisfyCard(card, inventory);
    }

    const reqEntries = Object.entries(reqs);

    return (
        <div className={`relative group flex-shrink-0 w-full min-h-[140px] rounded-lg border-2 p-2 flex flex-col gap-1.5 transition-all ${
            satisfied ? config.borderSatisfied : config.borderDefault
        }`}>
            {/* Remove button (profit only, on hover) */}
            {type === 'profit' && onRemove && (
                <button
                    onClick={() => onRemove(card.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-400 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10 shadow"
                >
                    ✕
                </button>
            )}

            {/* Header: icon + label */}
            <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{config.icon}</span>
                <span className="font-black text-xs truncate">{t(config.label)}</span>
            </div>

            {/* Card body */}
            {isEvacuation ? (
                <>
                    {/* Effect description */}
                    <p className="text-[9px] text-amber-600 leading-tight">
                        {t('需要')} {evacuationProfitRequirement} {t('张兑换券满足')}
                    </p>

                    {/* Progress */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-700 tabular-nums">
                            {satisfiedProfitCount}/{evacuationProfitRequirement} 💎
                        </span>
                    </div>
                    <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${satisfied ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, (satisfiedProfitCount / evacuationProfitRequirement) * 100)}%` }}
                        />
                    </div>

                    {/* Spacer + button */}
                    <div className="flex-1" />
                    {satisfied && onEvacuate ? (
                        <button
                            onClick={onEvacuate}
                            className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                            🚪 {t('撤离')}
                        </button>
                    ) : (
                        <div className="text-[10px] font-bold text-amber-600">
                            ✗ {t('未满足')}
                        </div>
                    )}
                </>
            ) : type === 'danger' ? (
                <>
                    {/* Effect description */}
                    <p className="text-[9px] text-red-500 leading-tight">
                        {t('回合结束自动检查')}
                    </p>

                    {/* Sticker requirement icons */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {reqEntries.map(([stickerType, count]) => {
                            const info = getStickerTypeInfo(stickerType);
                            const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                            const typeSatisfied = invCount >= count;
                            return (
                                <div
                                    key={stickerType}
                                    className={`relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                                        typeSatisfied
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-dashed border-gray-300 bg-white/50'
                                    }`}
                                >
                                    <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                    {count > 1 && (
                                        <span className="absolute -top-1 -right-2 text-[9px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">
                                            x{count}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Spacer + status */}
                    <div className="flex-1" />
                    <div className={`text-[10px] font-bold ${satisfied ? 'text-emerald-600' : 'text-red-600'}`}>
                        {satisfied ? `✓ ${t('已化解')}` : `✗ -1 ❤️`}
                    </div>
                </>
            ) : (
                /* profit */
                <>
                    {/* Effect description */}
                    <p className="text-[9px] text-blue-500 leading-tight">
                        {t('撤离时自动兑换')}
                    </p>

                    {/* Sticker requirement icons */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {reqEntries.map(([stickerType, count]) => {
                            const info = getStickerTypeInfo(stickerType);
                            const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                            const typeSatisfied = invCount >= count;
                            return (
                                <div
                                    key={stickerType}
                                    className={`relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                                        typeSatisfied
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-dashed border-gray-300 bg-white/50'
                                    }`}
                                >
                                    <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                    {count > 1 && (
                                        <span className="absolute -top-1 -right-2 text-[9px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">
                                            x{count}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Reward items */}
                    {card.reward?.items && (
                        <div className="flex items-center gap-1 flex-wrap">
                            {card.reward.items.map((item, i) => (
                                <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} tags={item.tags} size="md" />
                            ))}
                        </div>
                    )}

                    {/* Spacer + status */}
                    <div className="flex-1" />
                    <div className={`text-[10px] font-bold ${satisfied ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {satisfied ? `✓ ${t('已满足')}` : `✗ ${t('未满足')}`}
                    </div>
                </>
            )}
        </div>
    );
}

export const PassiveCard = React.memo(PassiveCardBase);
