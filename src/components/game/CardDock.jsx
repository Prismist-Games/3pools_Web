import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PassiveCard } from './PassiveCard';

/**
 * CardDock — collapsible bottom section showing all held passive-match cards.
 * Click header to expand/collapse the card row.
 * Ordering: danger → profit → evacuation.
 */
export default function CardDock({
    dangerCards,
    profitCards,
    inventory,
    canEvacuate,
    satisfiedProfitCount,
    evacuationProfitRequirement,
    evacuate,
    removeSlotCard,
    phase,
    t,
}) {
    const [expanded, setExpanded] = useState(true);

    const showDock = phase === 'pool_selection' || phase === 'drawing';
    if (!showDock) return null;

    const totalCards = dangerCards.length + profitCards.length + 1; // +1 for evacuation

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Clickable header bar */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-500">{t('持有卡牌')}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{totalCards}</span>
                </div>
                {expanded
                    ? <ChevronDown size={14} className="text-gray-400" />
                    : <ChevronUp size={14} className="text-gray-400" />
                }
            </button>

            {/* Collapsible card row */}
            {expanded && (
                <div className="px-3 py-2">
                    <div className="flex items-start gap-2 flex-wrap">
                        {/* Danger cards */}
                        {dangerCards.map(card => (
                            <PassiveCard
                                key={card.id}
                                card={card}
                                type="danger"
                                inventory={inventory}
                                t={t}
                            />
                        ))}

                        {/* Separator */}
                        {dangerCards.length > 0 && profitCards.length > 0 && (
                            <div className="w-px self-stretch bg-gray-200 shrink-0" />
                        )}

                        {/* Profit cards */}
                        {profitCards.map(card => (
                            <PassiveCard
                                key={card.id}
                                card={card}
                                type="profit"
                                inventory={inventory}
                                onRemove={removeSlotCard}
                                t={t}
                            />
                        ))}

                        {/* Separator */}
                        {(dangerCards.length > 0 || profitCards.length > 0) && (
                            <div className="w-px self-stretch bg-gray-200 shrink-0" />
                        )}

                        {/* Evacuation */}
                        <PassiveCard
                            card={null}
                            type="evacuation"
                            inventory={inventory}
                            canEvacuate={canEvacuate}
                            onEvacuate={evacuate}
                            satisfiedProfitCount={satisfiedProfitCount}
                            evacuationProfitRequirement={evacuationProfitRequirement}
                            t={t}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
