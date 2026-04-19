import React from 'react';
import { IngredientChip, EmptySlot, Panel } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ShopBasket({ items, capacity }) {
    const { t } = useLanguage();
    const slots = [];
    for (let i = 0; i < capacity; i++) {
        const item = items[i];
        slots.push(
            item
                ? <IngredientChip key={item.uid || i} ingredient={item} size="sm" titleBehavior="full" />
                : <EmptySlot key={`empty-${i}`} size="sm" />
        );
    }
    return (
        <Panel title={`🧺 ${t('临时篮')} (${items.length}/${capacity})`}>
            <div className="grid grid-cols-5 gap-2">{slots}</div>
            <p className="text-[11px] text-kitchen-text-secondary mt-2">
                {t('安全撤离时合并到冰箱；抽到香蕉皮会全部丢失')}
            </p>
        </Panel>
    );
}
