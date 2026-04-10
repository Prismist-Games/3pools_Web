import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const SCORE_BG = { 1: 'bg-green-50 border-green-400', 2: 'bg-blue-50 border-blue-400', 3: 'bg-purple-50 border-purple-400' };

const WallFunctionPanel = ({
    wallFunction, gold, hp, inventory,
    // pawnshop
    pawnshopMode, pawnshopSelected, startPawnshop, togglePawnshopItem, confirmPawnshop, cancelPawnshop,
    // clinic
    useClinic, clinicUsed,
    // blackmarket
    useBlackmarket, blackmarketSold, blackmarketStock,
    // shop
    shopStock, buyShopItem,
}) => {
    const { t } = useLanguage();
    const [open, setOpen] = useState(true);

    if (!wallFunction || wallFunction.type !== 'wall_active') return null;

    const stickerCount = inventory.filter(i => i.isSticker).length;

    return (
        <div>
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors">
                <span>🏪 {t(wallFunction.name)}</span>
                <span className="text-xs">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="mt-1 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                    {/* Pawnshop */}
                    {wallFunction.id === 'pawnshop' && !pawnshopMode && (
                        <div className="text-center">
                            <p className="text-[11px] text-gray-500 mb-2">{t('选择贴纸兑换为金币（1贴纸=1金币）')}</p>
                            <button onClick={startPawnshop}
                                disabled={stickerCount < 1}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    stickerCount >= 1
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                🏪 {t('贴纸')} → 💰（1:1）
                            </button>
                        </div>
                    )}
                    {wallFunction.id === 'pawnshop' && pawnshopMode && (
                        <div className="text-center">
                            <p className="text-[11px] text-amber-700 font-medium mb-2">
                                {t('选择贴纸')} ({pawnshopSelected.size} → {pawnshopSelected.size}💰)
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button onClick={confirmPawnshop}
                                    disabled={pawnshopSelected.size === 0}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        pawnshopSelected.size > 0
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                    {t('确认')}
                                </button>
                                <button onClick={cancelPawnshop}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">
                                    {t('取消')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Clinic */}
                    {wallFunction.id === 'clinic' && (
                        <div className="text-center">
                            {clinicUsed ? (
                                <p className="text-[11px] text-gray-400">{t('已使用过')}</p>
                            ) : (
                                <>
                                    <p className="text-[11px] text-gray-500 mb-2">{t('消耗3金币，回复1点生命（限1次）')}</p>
                                    <button onClick={useClinic}
                                        disabled={gold < 3 || hp >= 5}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            gold >= 3 && hp < 5
                                                ? 'bg-rose-500 text-white hover:bg-rose-600'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                        🏥 3💰 → 1❤️
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Blackmarket — grid-style items, consistent with wall cells */}
                    {wallFunction.id === 'blackmarket' && (
                        <div>
                            <p className="text-[11px] text-gray-500 mb-2 text-center">{t('每种限购1个，售完即止')}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(blackmarketStock || []).map(item => {
                                    const prices = { 1: 8, 2: 14, 3: 20 };
                                    const cost = prices[item.score];
                                    const sold = blackmarketSold.has(item.id);
                                    const canBuy = !sold && gold >= cost;
                                    const cellBg = SCORE_BG[item.score] || 'bg-gray-50 border-gray-300';
                                    return (
                                        <button key={item.id}
                                            onClick={() => useBlackmarket(item)}
                                            disabled={!canBuy}
                                            className={`relative flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all ${
                                                sold
                                                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                    : canBuy
                                                        ? `${cellBg} hover:scale-105 cursor-pointer`
                                                        : `${cellBg} opacity-60 cursor-not-allowed`
                                            }`}>
                                            <span className="text-xl">{item.icon}</span>
                                            <span className="text-[10px] font-bold text-gray-700">{t(item.name)}</span>
                                            <span className="text-[10px] font-bold text-amber-600">{cost}💰 → {item.score}{t('分')}</span>
                                            {sold && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-200/70">
                                                    <span className="text-xs font-bold text-gray-500">{t('已售罄')}</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Shop (杂货铺) */}
                    {wallFunction.id === 'shop' && (
                        <div>
                            <div className="flex flex-col gap-2">
                                {(shopStock || []).map((item, idx) => {
                                    const canBuy = !item.sold && gold >= item.cost;
                                    if (item.type === 'pack') {
                                        return (
                                            <button key={idx}
                                                onClick={() => buyShopItem(idx)}
                                                disabled={!canBuy}
                                                className={`relative flex items-center justify-between p-1.5 rounded-lg border-2 transition-all ${
                                                    item.sold
                                                        ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                        : canBuy
                                                            ? 'bg-white border-gray-300 hover:scale-[1.02] cursor-pointer'
                                                            : 'bg-white border-gray-300 opacity-60 cursor-not-allowed'
                                                }`}>
                                                <div className="flex gap-0.5 flex-wrap">
                                                    {item.stickers.map((s, i) => (
                                                        <div key={i} className="w-9 h-9 rounded border border-gray-200 bg-white flex flex-col items-center justify-center shadow-sm">
                                                            <span className="text-sm leading-none">{s.icon}</span>
                                                            <span className="text-[6px] text-gray-500 leading-none mt-0.5 truncate max-w-[32px]">{t(s.name)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-[11px] font-bold text-amber-600 flex-shrink-0 ml-1">{item.cost}💰</span>
                                                {item.sold && (
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-200/70">
                                                        <span className="text-xs font-bold text-gray-500">{t('已售罄')}</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    }
                                    // Refresh item
                                    return (
                                        <button key={idx}
                                            onClick={() => buyShopItem(idx)}
                                            disabled={!canBuy}
                                            className={`relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                                                item.sold
                                                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                                    : canBuy
                                                        ? 'bg-white border-gray-300 hover:scale-[1.02] cursor-pointer'
                                                        : 'bg-white border-gray-300 opacity-60 cursor-not-allowed'
                                            }`}>
                                            <div className="w-8 h-8 rounded border border-indigo-200 bg-indigo-50 flex items-center justify-center text-base shadow-sm">
                                                🔄
                                            </div>
                                            <span className="text-[10px] text-gray-500">{t('刷新')} ×1</span>
                                            <span className="ml-auto text-xs font-bold text-amber-600">{item.cost}💰</span>
                                            {item.sold && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-200/70">
                                                    <span className="text-xs font-bold text-gray-500">{t('已售罄')}</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WallFunctionPanel;
