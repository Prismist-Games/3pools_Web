import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { STICKER_TYPES } from '../../data/v2Config';
import { getOrderProgress, isOrderReady } from '../../data/growthOrders';
import GameCard from '../ui/GameCard';

/**
 * Render a requirement group: [icon cards] then count pill.
 * e.g. [☀️][💧] 3/5
 */
const RequirementRow = ({ group, progress }) => {
    const done = progress.have >= progress.need;
    const partial = progress.have > 0 && !done;
    return (
        <div className={`inline-flex items-center gap-1 ${done ? 'opacity-50' : ''}`}>
            {group.stickerIds.map(sid => {
                const def = STICKER_TYPES.find(s => s.id === sid);
                if (!def) return null;
                return (
                    <GameCard key={sid} icon={def.icon} label={def.name} sticker size="sm" />
                );
            })}
            <span className={`text-[10px] font-black tabular-nums px-1 py-0.5 rounded ${
                done
                    ? 'bg-emerald-100 text-emerald-600'
                    : partial
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-400'
            }`}>
                {progress.have}/{progress.need}
            </span>
        </div>
    );
};

/** Single growth-order card */
const OrderCard = ({ entry, inventory, onSubmit, t }) => {
    const { order, completed, ready } = entry;
    const progress = getOrderProgress(order, inventory);
    const [confirming, setConfirming] = useState(false);

    let cardClass;
    if (completed) {
        cardClass = 'bg-gray-50 border-gray-200 opacity-60';
    } else if (ready) {
        cardClass = 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-md';
    } else {
        cardClass = 'bg-white border-gray-300';
    }

    const handleSubmitClick = () => {
        if (!ready) return;
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 4000);
            return;
        }
        onSubmit(order.id);
        setConfirming(false);
    };

    return (
        <div className={`rounded-lg border-2 p-2.5 transition-all ${cardClass}`}>
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
                <span className="font-black text-xs text-gray-800">{order.label}</span>
                {completed && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-600">✓ {t('已完成')}</span>
                )}
            </div>

            {/* Requirements */}
            <div className="flex flex-col gap-1 mb-2">
                {order.groups.map((g, i) => (
                    <RequirementRow key={i} group={g} progress={progress[i]} />
                ))}
            </div>

            {/* Reward preview */}
            <div className="text-[10px] text-gray-500 leading-tight mb-2 border-t border-black/5 pt-1.5">
                <span className="font-bold text-gray-600">{t('奖励')}: </span>
                <span className="text-gray-400 italic">{t('Perk 待实现')}</span>
            </div>

            {/* Submit button */}
            {!completed && (
                <button
                    onClick={handleSubmitClick}
                    disabled={!ready}
                    className={`w-full py-1 rounded-md text-[11px] font-black transition-colors ${
                        !ready
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : confirming
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-amber-400 text-amber-900 hover:bg-amber-500 shadow-sm'
                    }`}
                >
                    {!ready
                        ? t('提交')
                        : confirming
                            ? `⚠ ${t('确认提交')}`
                            : t('提交')
                    }
                </button>
            )}
        </div>
    );
};

/** Single gold-order card — vertical layout */
const GoldOrderCard = ({ order, slotIndex, inventory, onSubmit, t }) => {
    const progress = getOrderProgress(order, inventory);
    const ready = isOrderReady(order, inventory);
    const [confirming, setConfirming] = useState(false);

    let cardClass;
    if (ready) {
        cardClass = 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-md';
    } else {
        cardClass = 'bg-white border-gray-300';
    }

    const handleSubmitClick = () => {
        if (!ready) return;
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 4000);
            return;
        }
        onSubmit(slotIndex);
        setConfirming(false);
    };

    return (
        <div className={`rounded-lg border-2 p-2.5 transition-all ${cardClass}`}>
            {/* Requirements — visual focus, icons first */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
                {order.groups.map((g, i) => (
                    <RequirementRow key={i} group={g} progress={progress[i]} />
                ))}
            </div>

            {/* Footer: reward + submit in one row */}
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-amber-600 bg-amber-100/80 px-1.5 py-0.5 rounded">
                    +{order.goldReward} 💰
                </span>
                <button
                    onClick={handleSubmitClick}
                    disabled={!ready}
                    className={`flex-1 py-1 rounded-md text-[11px] font-black transition-colors ${
                        !ready
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : confirming
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-amber-400 text-amber-900 hover:bg-amber-500 shadow-sm'
                    }`}
                >
                    {!ready
                        ? t('提交')
                        : confirming
                            ? `⚠ ${t('确认提交')}`
                            : t('提交')
                    }
                </button>
            </div>
        </div>
    );
};

/** Full order board — gold orders (vertical) + growth orders */
const OrderBoard = ({ growthOrdersView, goldOrders, inventory, onSubmit, onSubmitGoldOrder }) => {
    const { t } = useLanguage();

    return (
        <div className="w-full">
            {/* Gold Orders — vertical stack, full width */}
            {goldOrders && goldOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-amber-200 w-full">
                    <div className="px-3 py-2 border-b border-amber-100 flex items-center gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                            {t('金币订单')}
                        </h3>
                        <span className="text-[10px] text-amber-400">{t('交印花换金币')}</span>
                    </div>
                    <div className="p-2 flex flex-col gap-2">
                        {goldOrders.map((order, idx) => (
                            <GoldOrderCard
                                key={order.id}
                                order={order}
                                slotIndex={idx}
                                inventory={inventory}
                                onSubmit={onSubmitGoldOrder}
                                t={t}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Growth Orders (future Perk orders) — hidden until perk system is designed */}
        </div>
    );
};

export default OrderBoard;
