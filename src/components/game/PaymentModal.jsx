import React from 'react';
import { Coins, Package, X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RARITY_COIN_VALUE } from '../../data/constants';

/**
 * 支付方式选择弹窗
 * paymentMode: 'selecting' | 'item_select'
 */
export const PaymentModal = ({
    pool,
    paymentMode,
    gold,
    inventory,
    onPayWithGold,
    onSelectItemPayment,
    onPayWithItem,
    onCancel
}) => {
    const { t } = useLanguage();

    if (!pool) return null;

    const cost = pool.cost;
    const canAffordGold = gold >= cost;

    // 筛选出可用于支付的道具（同类型 + 等值 >= 所需价格）
    // 使用 pool.originalId 或 pool.id 作为池子类型标识
    const poolType = pool.originalId || pool.id;
    const eligibleItems = inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            if (!item) return false;
            // 检查道具类型是否匹配奖池类型
            if (item.poolId !== poolType) return false;
            const itemValue = RARITY_COIN_VALUE[item.rarity.id] || 1;
            return itemValue >= cost;
        });

    const hasEligibleItems = eligibleItems.length > 0;

    // 品质等值显示
    const getRarityValueText = (rarityId) => {
        const value = RARITY_COIN_VALUE[rarityId] || 1;
        return `≥${value}`;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{pool.icon}</span>
                        <div>
                            <h3 className="font-bold text-lg">{t(pool.name)}</h3>
                            {pool.affix && (
                                <span className="text-xs text-slate-300">{t(pool.affix.name)}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {paymentMode === 'selecting' ? (
                        <>
                            <div className="text-center mb-6">
                                <div className="text-3xl font-black text-yellow-600 flex items-center justify-center gap-2">
                                    <Coins size={28} />
                                    <span>{cost}</span>
                                </div>
                                <p className="text-slate-500 mt-2">{t("选择支付方式")}</p>
                            </div>

                            <div className="space-y-3">
                                {/* 金币支付按钮 */}
                                <button
                                    onClick={onPayWithGold}
                                    disabled={!canAffordGold}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${canAffordGold
                                        ? 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-800'
                                        : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Coins size={24} className={canAffordGold ? 'text-yellow-600' : 'text-slate-400'} />
                                        <span className="font-bold">{t("用金币支付")}</span>
                                    </div>
                                    <span className="text-sm">
                                        {gold} / {cost}
                                    </span>
                                </button>

                                {/* 道具支付按钮 */}
                                <button
                                    onClick={onSelectItemPayment}
                                    disabled={!hasEligibleItems}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${hasEligibleItems
                                        ? 'border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-800'
                                        : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Package size={24} className={hasEligibleItems ? 'text-purple-600' : 'text-slate-400'} />
                                        <span className="font-bold">{t("用道具支付")}</span>
                                    </div>
                                    <span className="text-sm">
                                        {eligibleItems.length} {t("个可用")}
                                    </span>
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 text-center mt-4">
                                {t("需要同类型道具，无找零")}
                            </p>
                        </>
                    ) : (
                        <>
                            {/* 道具选择模式 */}
                            <div className="flex items-center gap-2 mb-4">
                                <button
                                    onClick={() => onCancel()}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <span className="font-bold">{t("选择要消耗的道具")}</span>
                                <span className="text-sm text-slate-500">
                                    ({t("需要")} {pool.icon} ≥{cost})
                                </span>
                            </div>

                            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                                {eligibleItems.map(({ item, index }) => {
                                    const itemValue = RARITY_COIN_VALUE[item.rarity.id] || 1;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => onPayWithItem(index)}
                                            className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-all hover:scale-105 ${item.rarity.color}`}
                                        >
                                            <span className="text-2xl">{item.icon}</span>
                                            <span className="text-[10px] font-bold flex items-center gap-0.5">
                                                <Coins size={10} className="text-yellow-600" />
                                                {itemValue}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {eligibleItems.length === 0 && (
                                <div className="text-center text-slate-400 py-8">
                                    {t("没有足够品质的同类型道具")}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
