import { useState, useMemo } from 'react';
import { MAP_CONFIG } from '../../data/mapConfig';
import { QUALITY_CONFIG } from '../../data/v2Config';

/**
 * GoldExchangeModal — handles both gold exchange node types via `mode` prop.
 *
 * Props:
 *   mode       'variety' | 'quality'
 *   inventory  array of inventory items
 *   gold       current gold (display only)
 *   onSell     (selectedIndices: number[]) => void
 *   onClose    () => void
 */
export default function GoldExchangeModal({ mode, inventory, gold, onSell, onClose }) {
    const [selected, setSelected] = useState(new Set());

    const toggle = (i) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    const priceInfo = useMemo(() => {
        const indices = [...selected];
        const items = indices.map(i => inventory[i]).filter(Boolean);
        if (items.length === 0) return { total: 0 };

        if (mode === 'variety') {
            const tags2 = new Set(items.map(item => item.tags?.[1] ?? item.id));
            const varietyCount = Math.min(tags2.size, 5);
            const pricePerItem = MAP_CONFIG.goldVariety.priceByVariety[varietyCount];
            const total = pricePerItem * items.length;
            return {
                total,
                pricePerItem,
                varietyCount,
                varieties: [...tags2],
            };
        } else {
            let total = 0;
            const breakdown = items.map(item => {
                const q = item.quality ?? 1;
                const price = MAP_CONFIG.goldQuality.priceByQuality[Math.min(q, 5)];
                total += price;
                return { item, price };
            });
            return { total, breakdown };
        }
    }, [selected, inventory, mode]);

    const isVariety = mode === 'variety';
    const title = isVariety ? '🍱 大排档' : '🏮 酒楼';
    const desc = isVariety ? '食材种类越多，每件越值钱' : '品质越高，卖价越贵';

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl p-6 w-[480px] max-h-[80vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                    <p className="text-xs text-gray-400 mt-1">当前金币: {gold}g</p>
                </div>

                {/* Inventory grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2 mb-4 min-h-0">
                    {inventory.map((item, i) => {
                        const isSelected = selected.has(i);
                        const qInfo = QUALITY_CONFIG.find(q => q.id === (item.quality ?? 1));
                        return (
                            <div
                                key={i}
                                onClick={() => toggle(i)}
                                className={`cursor-pointer rounded-lg border-2 p-2 text-center transition-all select-none ${
                                    isSelected
                                        ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                <div className="text-2xl">{item.icon}</div>
                                <div className="text-xs font-medium truncate leading-tight mt-0.5">{item.name}</div>
                                <div className="text-[10px] text-amber-500 font-medium">{qInfo?.stars ?? '★'}</div>
                            </div>
                        );
                    })}
                    {inventory.length === 0 && (
                        <div className="col-span-4 text-center text-gray-400 py-8 text-sm">
                            背包里没有食材
                        </div>
                    )}
                </div>

                {/* Price preview */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm min-h-[72px]">
                    {selected.size === 0 ? (
                        <div className="text-gray-400 text-center py-2">选择食材以查看价格</div>
                    ) : isVariety ? (
                        <div className="space-y-0.5">
                            <div>选中: <b>{[...selected].length} 件</b></div>
                            <div>
                                子类数: <b>{priceInfo.varietyCount} 种</b>
                                <span className="text-gray-500 ml-1">({priceInfo.varieties?.join('、')})</span>
                            </div>
                            <div>每件: <b>{priceInfo.pricePerItem}g</b></div>
                            <div className="text-base font-bold text-yellow-600 pt-1">
                                总计 +{priceInfo.total}g
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="space-y-0.5 max-h-28 overflow-y-auto">
                                {priceInfo.breakdown?.map(({ item, price }, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="truncate">{item.icon} {item.name}</span>
                                        <span className="text-yellow-600 font-medium ml-2 shrink-0">+{price}g</span>
                                    </div>
                                ))}
                            </div>
                            <div className="text-base font-bold text-yellow-600 mt-1 border-t border-gray-200 pt-1">
                                总计 +{priceInfo.total}g
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => selected.size > 0 && onSell([...selected])}
                        disabled={selected.size === 0}
                        className="flex-1 py-2 bg-yellow-400 text-white rounded-lg font-bold disabled:opacity-40 hover:bg-yellow-500 transition-colors"
                    >
                        出售 (+{priceInfo.total}g)
                    </button>
                </div>
            </div>
        </div>
    );
}
