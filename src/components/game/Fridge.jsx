import React from 'react';
import { IngredientChip, EmptySlot, Panel } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Fridge({ items, capacity, selectedIdx, onSelect }) {
    const { t } = useLanguage();
    const slots = [];
    for (let i = 0; i < capacity; i++) {
        const item = items[i];
        slots.push(
            item ? (
                <IngredientChip
                    key={item.uid || i}
                    ingredient={item}
                    size="sm"
                    selected={selectedIdx === i}
                    onClick={() => onSelect(i === selectedIdx ? null : i)}
                    titleBehavior="full"
                />
            ) : (
                <EmptySlot key={`empty-${i}`} size="sm" />
            )
        );
    }
    return (
        <Panel title={`❄️ ${t('冰箱')} (${items.length}/${capacity})`}>
            <div className="grid grid-cols-5 gap-2">{slots}</div>
            <p className="text-[11px] text-kitchen-text-secondary mt-2">
                {selectedIdx != null
                    ? t('已选中。点击菜上的空槽放入')
                    : t('点击一个食材选中，再点击菜的空槽放入')}
            </p>
        </Panel>
    );
}
