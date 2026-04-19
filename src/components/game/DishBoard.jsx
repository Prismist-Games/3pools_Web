import React from 'react';
import { IngredientChip, EmptySlot, PRIMARY_BTN, SECONDARY_BTN, Panel, rarityStyle } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DishBoard({
    dishes,
    placements,
    resolved,
    fridgeSelectedIdx,
    onPlace,
    onRemove,
    onConfirm,
}) {
    const { t } = useLanguage();
    if (!dishes.length) return null;
    return (
        <div className="flex flex-col gap-3">
            {dishes.map(dish => {
                const slotArr = placements[dish.id] || [];
                const res = resolved[dish.id];
                return (
                    <DishCard
                        key={dish.id}
                        dish={dish}
                        placements={slotArr}
                        resolved={res}
                        fridgeSelectedIdx={fridgeSelectedIdx}
                        onPlace={onPlace}
                        onRemove={onRemove}
                        onConfirm={onConfirm}
                    />
                );
            })}
        </div>
    );
}

function DishCard({ dish, placements, resolved, fridgeSelectedIdx, onPlace, onRemove, onConfirm }) {
    const { t } = useLanguage();
    const allFilled = placements.every(p => !!p);
    const isResolved = !!resolved;
    const canConfirm = allFilled && !isResolved;

    return (
        <div className={`rounded-2xl border-2 ${isResolved ? 'border-kitchen-text-muted bg-kitchen-wood-light/40' : 'border-kitchen-wood-border bg-kitchen-card'} shadow-[0_3px_0_#C8A880] p-3`}>
            <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl">{dish.icon || '🍽️'}</span>
                    <h4 className="font-black text-kitchen-text-title">{t(dish.label)}</h4>
                </div>
                {isResolved ? (
                    <ResolvedBadge resolved={resolved} />
                ) : (
                    <button
                        onClick={() => canConfirm && onConfirm(dish.id)}
                        disabled={!canConfirm}
                        className={PRIMARY_BTN + ' !px-3 !py-1 text-xs'}
                        title={allFilled ? '' : t('三格全填才能确定')}
                    >
                        {t('确定')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {dish.slots.map((slot, idx) => (
                    <DishSlot
                        key={idx}
                        slot={slot}
                        ingredient={placements[idx]}
                        resolvedScore={resolved?.slotScores?.[idx]}
                        isLocked={isResolved}
                        canPlace={!isResolved && fridgeSelectedIdx != null}
                        onPlace={() => onPlace(dish.id, idx)}
                        onRemove={() => onRemove(dish.id, idx)}
                    />
                ))}
            </div>
        </div>
    );
}

function DishSlot({ slot, ingredient, resolvedScore, isLocked, canPlace, onPlace, onRemove }) {
    const { t } = useLanguage();
    const idealName = slot.ideal?.name;
    const subcategory = slot.ideal?.subcategory;
    const category = slot.ideal?.category;
    return (
        <div className="flex flex-col items-center gap-1 py-2">
            <div>
                {ingredient ? (
                    <IngredientChip
                        ingredient={ingredient}
                        size="md"
                        onClick={isLocked ? undefined : onRemove}
                        dimmed={isLocked}
                    />
                ) : (
                    <EmptySlot size="md" onClick={canPlace ? onPlace : undefined} hint="+" />
                )}
            </div>
            <div className="text-center leading-tight">
                <div className="flex flex-wrap justify-center gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded-full bg-kitchen-wood-dark/40 text-kitchen-text-body border border-kitchen-wood-border">
                        {t(category)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-kitchen-gold-deep border border-kitchen-gold-border">
                        {t(subcategory)} ({t(idealName)})
                    </span>
                </div>
                {resolvedScore && (
                    <div className="mt-1 text-[11px] font-bold text-kitchen-text-title">
                        +{resolvedScore.score.toFixed(1)}
                    </div>
                )}
            </div>
        </div>
    );
}

function ResolvedBadge({ resolved }) {
    const { t } = useLanguage();
    const delta = resolved.delta;
    const color = delta > 0 ? 'text-kitchen-success-border' : delta < 0 ? 'text-kitchen-danger-text' : 'text-kitchen-text-body';
    return (
        <div className="flex items-baseline gap-2">
            <span className={`font-bold text-sm ${color}`}>{t(resolved.rating)}</span>
            <span className={`font-black ${color}`}>
                {delta > 0 ? `+${delta}` : delta}
            </span>
            <span className="text-xs text-kitchen-text-secondary">
                ({resolved.total?.toFixed?.(1) ?? resolved.total})
            </span>
        </div>
    );
}
