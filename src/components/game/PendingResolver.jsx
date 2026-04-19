import React from 'react';
import { PRIMARY_BTN, SECONDARY_BTN, DANGER_BTN, IngredientChip, rarityStyle } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * When a container is full and new items arrive, they queue in a pending list.
 * This modal walks the user through replacing or discarding each head-of-queue item.
 */
export default function PendingResolver({
    title,
    containerItems,
    containerCapacity,
    pendingItems,
    onReplace,     // (containerIdx) => void
    onDiscard,     // () => void
    subtitle,
}) {
    const { t } = useLanguage();
    if (!pendingItems.length) return null;
    const incoming = pendingItems[0];

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-kitchen-card rounded-2xl border-2 border-kitchen-gold-border shadow-2xl p-6 max-w-2xl w-full">
                <div className="text-center mb-4">
                    <h3 className="font-black text-xl text-kitchen-text-title">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-kitchen-text-secondary mt-1">{subtitle}</p>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1 mb-4">
                    <div className="text-xs text-kitchen-text-secondary">{t('新来的物品')}</div>
                    <IngredientChip ingredient={incoming} size="lg" titleBehavior="full" />
                    <div className="font-bold text-kitchen-text-title mt-1">{t(incoming.name)}</div>
                    {pendingItems.length > 1 && (
                        <div className="text-xs text-kitchen-text-secondary mt-1">
                            {t('队列中还有')}: {pendingItems.length - 1}
                        </div>
                    )}
                </div>

                <div className="text-xs text-kitchen-text-secondary text-center mb-2">
                    {t('点击下面要被替换的物品，或选择扔掉新物品')}
                </div>
                <div className="grid grid-cols-5 gap-2 justify-items-center mb-4">
                    {Array.from({ length: containerCapacity }).map((_, i) => {
                        const item = containerItems[i];
                        if (!item) return <div key={i} className="w-14 h-14" />;
                        return (
                            <IngredientChip
                                key={item.uid || i}
                                ingredient={item}
                                size="md"
                                onClick={() => onReplace(i)}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-center gap-3">
                    <button onClick={onDiscard} className={DANGER_BTN}>
                        {t('扔掉新物品')}
                    </button>
                </div>
            </div>
        </div>
    );
}
