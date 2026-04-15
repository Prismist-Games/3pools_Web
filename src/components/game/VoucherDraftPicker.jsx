import React from 'react';
import { canSatisfyCard, getRequirements, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * VoucherDraftPicker — center-panel 2-of-1 replacement draft.
 *
 * Props:
 *   candidates: SlotCard[]           (length 2)
 *   inventory: InventoryItem[]
 *   armedCandidateIdx: number | null (owned by GameCore, not this component)
 *   onArm: (idx: number | null) => void
 *   onSkip: () => void
 *   t: (key: string) => string
 *
 * Interaction: click a candidate → arms it (or un-arms if already armed / switches if other is armed).
 * The actual replacement commit happens when the player clicks a slot in VoucherShelf —
 * that click is handled by GameCore, not this component. This component only owns the
 * candidate cards and the skip button.
 */
export default function VoucherDraftPicker({
    candidates,
    inventory,
    armedCandidateIdx,
    onArm,
    onSkip,
    t,
}) {
    if (!candidates || candidates.length === 0) return null;

    const hint = armedCandidateIdx !== null
        ? t('点击要替换的货架栏位')
        : t('选择一张替换货架上的兑换券');

    return (
        <div className="flex justify-center py-6">
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-300 p-6 max-w-xl text-center">
                <h2 className="text-base font-bold mb-1">{t('新兑换券')}</h2>
                <p className="text-[11px] text-gray-400 mb-4">{hint}</p>

                <div className="flex gap-4 justify-center mb-4">
                    {candidates.map((voucher, idx) => {
                        const satisfied = canSatisfyCard(voucher, inventory);
                        const reqs = getRequirements(voucher);
                        const reqEntries = Object.entries(reqs);
                        const isArmed = armedCandidateIdx === idx;

                        const nextArm = isArmed ? null : idx;

                        return (
                            <button
                                key={voucher.id ?? idx}
                                type="button"
                                onClick={() => onArm(nextArm)}
                                className={`w-48 p-3 rounded-xl border-2 flex flex-col gap-1.5 transition-all text-left cursor-pointer ${
                                    satisfied
                                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50'
                                } ${isArmed ? 'ring-4 ring-amber-400 ring-offset-2 scale-[1.03] shadow-lg' : 'hover:shadow-md'}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg leading-none">💎</span>
                                    <span className="font-black text-xs truncate">{t('物品兑换券')}</span>
                                </div>

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

                                {voucher.reward?.items && (
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

                <button
                    type="button"
                    onClick={onSkip}
                    className="px-5 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
                >
                    {t('放弃')}
                </button>
            </div>
        </div>
    );
}
