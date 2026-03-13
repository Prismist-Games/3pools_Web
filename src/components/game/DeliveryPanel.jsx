import React, { useState } from 'react';
import { Umbrella, TriangleAlert, ArrowRight, ArrowLeft, Package, Check, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const DeliveryPanel = ({
    deliveryState,
    onSwap,
    onConfirmPacking,
    onAnimationComplete,
    onProceed,
    rarityConfig,
}) => {
    const { t } = useLanguage();
    const { queue, currentIndex, phase, arrangement, deliveryResult } = deliveryState;
    const currentOrder = queue[currentIndex].order;

    // Packing: track selected slot for swap
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleItemClick = (index) => {
        if (phase !== 'packing') return;

        if (selectedSlot === null) {
            setSelectedSlot(index);
        } else if (selectedSlot === index) {
            setSelectedSlot(null);
        } else {
            onSwap(selectedSlot, index);
            setSelectedSlot(null);
        }
    };

    // Render bump direction sequence
    const renderBumpSequence = () => (
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <Package size={16} />
            <span>{t("运送距离")}:</span>
            {currentOrder.deliveryBumps.map((dir, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-slate-300">→</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono
                        ${dir === '→' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {dir === '→' ? t("右") : t("左")}
                    </span>
                </span>
            ))}
        </div>
    );

    // Render a single item card in the arrangement
    const renderItemCard = (item, index) => {
        const isSelected = selectedSlot === index;
        const rarityColors = item.rarity?.color || 'border-slate-300 bg-slate-50';

        return (
            <div
                key={item.uid}
                onClick={() => handleItemClick(index)}
                className={`
                    relative flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer
                    transition-all duration-200 min-w-[90px]
                    ${rarityColors}
                    ${isSelected ? 'ring-4 ring-blue-400 -translate-y-2 scale-105' : 'hover:scale-102'}
                `}
            >
                <span className="text-3xl mb-1">{item.icon}</span>
                <span className="text-xs font-bold truncate w-full text-center">{item.name}</span>

                {/* Delivery attributes */}
                <div className="flex gap-2 mt-1.5">
                    <span className="flex items-center gap-0.5 text-xs">
                        <Umbrella size={12} className="text-blue-500" />
                        <span className="font-mono font-bold">{item.currentDurability}</span>
                    </span>
                    {(item.sharpness || 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs">
                            <TriangleAlert size={12} className="text-amber-500" />
                            <span className="font-mono font-bold">{item.sharpness}</span>
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (phase === 'packing') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 border-4 border-slate-200">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-800">
                            {t("打包排列")} ({currentIndex + 1}/{queue.length})
                        </h3>
                        {renderBumpSequence()}
                    </div>

                    {/* Order requirements reminder */}
                    <div className="flex gap-2 text-sm text-slate-500">
                        <span>{t("订单要求")}:</span>
                        {currentOrder.requirements.map((req, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded ${req.requiredRarity.color}`}>
                                {req.name} ({req.requiredRarity.name}+)
                            </span>
                        ))}
                    </div>

                    {/* Item arrangement area */}
                    <div className="flex items-center justify-center gap-2 py-4 min-h-[140px]">
                        {arrangement.map((item, i) => (
                            <React.Fragment key={item.uid}>
                                {renderItemCard(item, i)}
                                {i < arrangement.length - 1 && (
                                    <div className="text-slate-300 text-lg">—</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Instructions */}
                    <p className="text-center text-sm text-slate-400">
                        {t("点击两个物品交换位置")}
                    </p>

                    {/* Confirm button */}
                    <button
                        onClick={onConfirmPacking}
                        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl
                            hover:bg-slate-700 transition-colors shadow-lg active:scale-[0.98]"
                    >
                        {t("确认发货")}
                    </button>
                </div>
            </div>
        );
    }

    // Animation and result phases will be added in Tasks 6 and 7
    if (phase === 'animating') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-3xl shadow-2xl text-center">
                    <p className="text-lg font-bold">{t("运送中...")}</p>
                    {/* Placeholder — animation implemented in Task 6 */}
                    <button onClick={onAnimationComplete} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl">
                        {t("跳过")}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        const { passed } = deliveryResult;
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-3xl shadow-2xl text-center">
                    <p className={`text-xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {passed ? t("运送成功！") : t("运送失败")}
                    </p>
                    {/* Placeholder — detailed result view in Task 7 */}
                    <button onClick={onProceed} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl">
                        {t("继续")}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
