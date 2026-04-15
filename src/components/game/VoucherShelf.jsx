import React from 'react';
import { canSatisfyCard, getRequirements, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * VoucherShelf — persistent left-rail column of 5 voucher slots.
 *
 * Props:
 *   shelf: SlotCard[]                (length 5, always non-null during gameplay)
 *   inventory: InventoryItem[]
 *   evacuationProfitRequirement: number
 *   highlightForDraft: boolean       (true while player has armed a draft candidate)
 *   onSlotClick: (slotIdx: number) => void  (only called when highlightForDraft is true)
 *   t: (key: string) => string
 */
export default function VoucherShelf({
    shelf,
    inventory,
    evacuationProfitRequirement,
    highlightForDraft = false,
    onSlotClick,
    t,
}) {
    const filledCount = shelf.filter(v => v).length;
    const satisfiedCount = shelf.filter(v => v && canSatisfyCard(v, inventory)).length;
    const evacReady = satisfiedCount >= evacuationProfitRequirement;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-56 flex-shrink-0 self-start">
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
                evacReady
                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 border-emerald-200 ring-1 ring-emerald-300'
                    : 'bg-gray-50 border-gray-100'
            }`}>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                        📋 {t('兑换货架')}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        evacReady ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                        {filledCount}/{shelf.length}
                    </span>
                </div>
            </div>

            {/* Slot column */}
            <div className="p-2 flex flex-col gap-2">
                {shelf.map((voucher, slotIdx) => {
                    const satisfied = voucher ? canSatisfyCard(voucher, inventory) : false;
                    const reqs = voucher ? getRequirements(voucher) : {};
                    const reqEntries = Object.entries(reqs);
                    const clickable = highlightForDraft && !!onSlotClick;

                    // Empty slot
                    if (!voucher) {
                        return (
                            <button
                                key={slotIdx}
                                type="button"
                                onClick={clickable ? () => onSlotClick(slotIdx) : undefined}
                                disabled={!clickable}
                                className={`w-full rounded-lg border-2 border-dashed p-2 h-12 flex items-center justify-center transition-all ${
                                    clickable
                                        ? 'border-amber-400 bg-amber-50 cursor-pointer hover:border-amber-500 hover:bg-amber-100 ring-2 ring-amber-400 ring-offset-1'
                                        : 'border-gray-200 bg-gray-50 cursor-default'
                                }`}
                            >
                                <span className={`text-xs font-medium ${clickable ? 'text-amber-500' : 'text-gray-300'}`}>
                                    {clickable ? t('+ 放置') : t('空槽')}
                                </span>
                            </button>
                        );
                    }

                    const borderClass = satisfied
                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50';

                    const targetRing = clickable
                        ? 'ring-2 ring-amber-400 ring-offset-1 cursor-pointer hover:ring-amber-500 hover:scale-[1.02]'
                        : '';

                    return (
                        <button
                            key={slotIdx}
                            type="button"
                            onClick={clickable ? () => onSlotClick(slotIdx) : undefined}
                            disabled={!clickable}
                            className={`w-full rounded-lg border-2 p-2 flex flex-col gap-1.5 transition-all text-left ${borderClass} ${targetRing} ${!clickable ? 'cursor-default' : ''}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-lg leading-none">💎</span>
                                <span className="font-black text-xs truncate">{t('物品兑换券')}</span>
                            </div>

                            {/* Sticker requirements */}
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
                                            <span className={typeSatisfied ? '' : 'opacity-40'}>
                                                {info?.icon || '?'}
                                            </span>
                                            {count > 1 && (
                                                <span className="absolute -top-1 -right-2 text-[9px] font-bold text-white bg-gray-700 rounded-full px-1 leading-tight">
                                                    ×{count}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reward preview */}
                            {voucher?.reward?.items && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    {voucher.reward.items.map((item, i) => (
                                        <GameCard
                                            key={i}
                                            icon={item.icon}
                                            label={t(item.name)}
                                            stars={item.stars}
                                            tags={item.tags}
                                            size="md"
                                        />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
