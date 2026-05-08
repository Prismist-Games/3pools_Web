import { ArrowLeftRight, Check, ChevronsUp, Crown, Hand, Loader2, Play, Radio, Recycle, RotateCcw, Send, Star, Trophy, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useMultiplayerClient } from './useMultiplayerClient';

const rarityName = (item) => item?.rarity?.name || '';

function ItemTile({
    item,
    index,
    size = 'md',
    selected = false,
    hinted = false,
    disabled = false,
    isNeededForOrder = false,
    isMaxSatisfied = false,
    hasUpgradePair = false,
    isTarget = false,
    canSynthesize = false,
    onClick,
    onMouseEnter,
    onMouseLeave,
}) {
    const { t } = useLanguage();
    const sizeClass = size === 'lg' ? 'min-h-20 rounded-xl' : 'min-h-12 rounded-lg';
    const iconClass = size === 'lg' ? 'text-3xl' : 'text-xl';
    const nameClass = size === 'lg' ? 'text-[11px]' : 'text-[10px]';

    if (!item) {
        return (
            <button
                type="button"
                onClick={() => onClick?.(index)}
                onMouseEnter={() => onMouseEnter?.(index, item)}
                onMouseLeave={onMouseLeave}
                disabled={disabled || !onClick}
                className={`${sizeClass} border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-blue-300 disabled:cursor-default disabled:hover:border-slate-200`}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => onClick?.(index)}
            onMouseEnter={() => onMouseEnter?.(index, item)}
            onMouseLeave={onMouseLeave}
            disabled={disabled || !onClick}
            className={`
                ${sizeClass} relative flex min-w-0 flex-col items-center justify-center border-2 p-1.5 text-center shadow-sm transition
                ${item.rarity?.color || 'border-slate-200 bg-white'}
                ${selected ? '-translate-y-1 scale-105 ring-4 ring-blue-400' : ''}
                ${hinted ? 'ring-4 ring-yellow-300' : ''}
                ${isTarget && canSynthesize ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''}
                ${isTarget && !canSynthesize ? 'hover:ring-2 hover:ring-blue-300' : ''}
                ${onClick && !disabled ? 'hover:-translate-y-0.5 hover:shadow-md active:scale-95' : ''}
                ${disabled ? 'cursor-not-allowed opacity-60' : ''}
            `}
            title={`${t(item.name)} / ${t(rarityName(item))}`}
        >
            <span className={`${iconClass} leading-none drop-shadow-sm`}>{item.icon}</span>
            <span className={`${nameClass} mt-1 max-w-full truncate font-black leading-none text-slate-800`}>{t(item.name)}</span>
            <span className="mt-0.5 max-w-full truncate text-[9px] font-bold leading-none text-slate-500">{t(rarityName(item))}</span>
            {item.sterile && <span className="absolute right-1 top-1 rounded bg-slate-900/70 px-1 text-[8px] font-black text-white">{t('绝育')}</span>}
            {item.rarity?.bonus > 0 && (
                <div className="absolute right-1 top-1 rounded-bl-lg bg-white/60 p-0.5">
                    <Star size={9} fill="currentColor" className={item.rarity?.color ? item.rarity.color.split(' ')[2] : 'text-slate-400'} />
                </div>
            )}
            {hasUpgradePair && !item.sterile && (
                <div className="absolute -right-1 -top-1 z-20 rounded-full bg-yellow-400 p-0.5 text-yellow-900 shadow-md ring-1 ring-white">
                    <ChevronsUp size={12} strokeWidth={3} />
                </div>
            )}
            {isNeededForOrder && (
                <div className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white p-0.5 text-white shadow-md ${isMaxSatisfied ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <Check size={12} strokeWidth={4} />
                </div>
            )}
            {isTarget && !canSynthesize && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-blue-500/35 opacity-0 transition-opacity hover:opacity-100">
                    <ArrowLeftRight size={24} className="text-white drop-shadow-md" />
                </div>
            )}
            {isTarget && canSynthesize && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-yellow-400/80 opacity-0 backdrop-blur-[1px] transition-opacity hover:opacity-100">
                    <ChevronsUp size={28} className="text-white drop-shadow-md" />
                    <span className="text-[10px] font-black text-white">{t('升级')}</span>
                </div>
            )}
        </button>
    );
}

function selectedItemsSatisfyOrder(order, selectedItems) {
    if (!order || selectedItems.length !== order.requirements.length) return false;
    const used = new Set();
    return order.requirements.every((req) => {
        const matchIndex = selectedItems.findIndex((item, index) => (
            item
            && !used.has(index)
            && item.name === req.name
            && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)
        ));
        if (matchIndex === -1) return false;
        used.add(matchIndex);
        return true;
    });
}

function calculateSelectedReward(order, selectedItems) {
    if (!selectedItemsSatisfyOrder(order, selectedItems)) return order?.baseScoreReward || 0;
    const used = new Set();
    const bonus = order.requirements.reduce((sum, req) => {
        const matchIndex = selectedItems.findIndex((item, index) => (
            item && !used.has(index) && item.name === req.name && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)
        ));
        used.add(matchIndex);
        return sum + Math.max(req.requiredRarity?.bonus || 0, selectedItems[matchIndex].rarity?.bonus || 0);
    }, 0);
    return Math.ceil(order.baseScoreReward * (1 + bonus));
}

function OrderCardMini({
    order,
    inventory,
    selfId,
    isSubmitTarget,
    selectedSubmitIndices,
    hoveredPoolItemNames,
    hoveredItemName,
    onBeginSubmit,
    disabled,
}) {
    const { t } = useLanguage();
    const selectedItems = selectedSubmitIndices.map((index) => inventory[index]).filter(Boolean);
    const canSubmit = isSubmitTarget && selectedItemsSatisfyOrder(order, selectedItems);
    const selectedReward = calculateSelectedReward(order, selectedItems);
    const completionEntries = order.completedBy || [];
    const completedBySelf = !!selfId && completionEntries.some((entry) => entry.playerId === selfId);
    const hasBufferedCompletion = completionEntries.length > 0 || order.retireOnNextDraw;
    const buttonDisabled = disabled || completedBySelf;
    const buttonClass = completedBySelf
        ? 'bg-slate-300 text-slate-600'
        : isSubmitTarget
            ? 'bg-green-600 text-white hover:bg-green-700'
            : hasBufferedCompletion
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-blue-600 text-white hover:bg-blue-700';

    return (
        <article className={`relative rounded-2xl border-2 p-3 shadow-sm transition-all duration-200 ${isSubmitTarget ? 'border-green-500 bg-green-50 ring-4 ring-green-100' : hasBufferedCompletion ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className={`rounded-lg px-2 py-1 text-xs font-black shadow-sm ${canSubmit ? 'bg-green-500 text-white' : 'bg-white text-blue-700'}`}>
                    {isSubmitTarget ? selectedReward : order.baseScoreReward} ⭐
                </div>
                <button
                    type="button"
                    onClick={() => onBeginSubmit(order.id)}
                    disabled={buttonDisabled}
                    className={`rounded-xl px-3 py-2 text-xs font-black shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${buttonClass}`}
                >
                    {completedBySelf ? t('已提交') : isSubmitTarget ? t('选择中') : hasBufferedCompletion ? t('追单提交') : t('选择提交')}
                </button>
            </div>
            {hasBufferedCompletion && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-black">
                    <span className="rounded-full bg-amber-200 px-2 py-1 text-amber-800">{t('本轮已完成')}</span>
                    {completionEntries.length > 0 && (
                        <span className="max-w-full truncate rounded-full bg-white px-2 py-1 text-amber-700">
                            {completionEntries.map((entry) => entry.playerName).join('、')}
                        </span>
                    )}
                    <span className="rounded-full bg-white px-2 py-1 text-slate-500">{t('下次开奖后移除')}</span>
                </div>
            )}
            <div className="flex flex-wrap gap-1.5">
                {order.requirements.map((req, index) => {
                    const matching = inventory.find((item) => item?.name === req.name);
                    const qualified = inventory.find((item) => item?.name === req.name && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0));
                    const selected = selectedItems.some((item) => item?.name === req.name && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0));
                    const highlighted = hoveredPoolItemNames.includes(req.name) || hoveredItemName === req.name;
                    return (
                        <div
                            key={`${order.id}-${index}`}
                            className={`
                                relative flex h-7 items-center gap-1 rounded border-2 px-2 text-[11px] font-black shadow-sm transition-all duration-200
                                ${qualified ? 'border-solid bg-white text-slate-700' : matching ? 'border-solid border-slate-300 bg-white text-slate-500' : 'border-dashed border-blue-300 bg-white/60 text-slate-400'}
                                ${selected ? 'scale-105 border-green-500 bg-green-100 text-green-800 ring-2 ring-green-300' : ''}
                                ${highlighted ? 'scale-110 border-slate-500 shadow-xl ring-2 ring-slate-200' : ''}
                            `}
                            title={`${t(req.name)} / ${t(req.requiredRarity?.name)}`}
                        >
                            <span className={`absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-white/60 ${req.requiredRarity?.dotColor || 'bg-slate-300'}`} />
                            <span className="ml-3">{req.icon}</span>
                            <span className="max-w-20 truncate">{t(req.name)}</span>
                            {selected && (
                                <span className="absolute -right-2 -top-2 rounded-full bg-green-500 p-0.5 text-white shadow">
                                    <Check size={10} strokeWidth={4} />
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

function PoolCardMulti({ pool, self, isHovered, onChoose, onMouseEnter, onMouseLeave }) {
    const { t } = useLanguage();
    const needsInventory = pool.affixKey === 'trade_in';
    const blocked = !self || self.eliminated || self.ready || self.pendingItem || self.pendingQueueCount > 0 || self.interaction;
    const disabled = blocked || self.gold < pool.cost || (needsInventory && self.inventory.length === 0);

    return (
        <button
            type="button"
            onClick={() => onChoose(pool.id)}
            onMouseEnter={() => onMouseEnter(pool)}
            onMouseLeave={onMouseLeave}
            disabled={disabled}
            className={`
                group flex min-h-40 flex-col gap-2 rounded-2xl border-2 p-4 text-left shadow-sm transition
                ${pool.color || 'border-slate-200 bg-white'}
                ${isHovered ? 'scale-[1.02] shadow-xl ring-4 ring-white/70' : ''}
                ${disabled ? 'cursor-not-allowed opacity-60 grayscale-[0.5]' : 'hover:-translate-y-1 hover:shadow-xl active:scale-95'}
            `}
        >
            <div className="flex items-center gap-3">
                <span className="text-4xl drop-shadow-sm">{pool.icon}</span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-black text-slate-900">{t(pool.name)}</div>
                    <div className="mt-1 inline-flex rounded-lg bg-white/70 px-2 py-1 text-sm font-black text-slate-800 shadow-sm">
                        ✨ {t(pool.affix?.name)}
                    </div>
                </div>
                <div className="rounded-full border-2 border-yellow-400 bg-white px-3 py-1 text-lg font-black text-slate-800 shadow-sm">
                    {pool.cost} <span className="text-yellow-500">🪙</span>
                </div>
            </div>
            <p className="text-sm font-bold leading-relaxed text-slate-700">{t(pool.affix?.desc)}</p>
            {needsInventory && self?.inventory.length === 0 && (
                <p className="mt-auto text-xs font-black text-red-500">{t('需要先有背包物品')}</p>
            )}
        </button>
    );
}

function PublicPlayerCard({ player, inventorySize, orders = [] }) {
    const { t } = useLanguage();
    return (
        <article className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {player.isHost && <Crown size={16} className="text-yellow-500" />}
                    <span className="truncate text-sm font-black text-slate-900">{player.name}</span>
                </div>
                <div className="flex gap-2 text-xs font-black text-slate-600">
                    <span>{player.gold} 🪙</span>
                    <span>{player.score} ⭐</span>
                </div>
            </div>
            <div className="mb-2 flex flex-wrap gap-1 text-[10px] font-black">
                {player.ready && <span className="rounded bg-green-100 px-2 py-1 text-green-700">{t('已选择')}</span>}
                {player.interaction && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">{t('选择词缀中')}</span>}
                {player.pendingItem && <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">{t('处理中')}</span>}
                {player.eliminated && <span className="rounded bg-slate-200 px-2 py-1 text-slate-600">{t('已停止抽奖')}</span>}
            </div>
            {player.pendingItem && (
                <div className="mb-2 rounded-xl border border-purple-200 bg-purple-50 p-2">
                    <div className="mb-1 text-[10px] font-black text-purple-700">{t('待处理物品')}</div>
                    <ItemTile item={player.pendingItem} size="sm" />
                </div>
            )}
            <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: inventorySize }).map((_, index) => {
                    const item = player.inventory[index];
                    const isNeededForOrder = !!item && orders.some((order) => order.requirements.some((req) => req.name === item.name));
                    const isMaxSatisfied = !!item && orders.some((order) => order.requirements.some((req) => (
                        req.name === item.name
                        && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)
                    )));

                    return (
                        <ItemTile
                            key={index}
                            item={item}
                            size="sm"
                            isNeededForOrder={isNeededForOrder}
                            isMaxSatisfied={isMaxSatisfied}
                        />
                    );
                })}
            </div>
        </article>
    );
}

function InteractionPanel({ self, actions }) {
    const { t } = useLanguage();
    if (!self?.interaction) return null;

    const title = {
        precise: '精准：二选一',
        targeted: '有的放矢：选择目标',
        trade_in: '以旧换新：选择消耗物品',
    }[self.interaction.type];

    return (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-black text-amber-800">{t(title)}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {self.interaction.items.map((item) => (
                    <ItemTile
                        key={item.uid || item.name}
                        item={item}
                        size="lg"
                        onClick={() => {
                            if (self.interaction.type === 'precise') actions.chooseInteractive({ itemUid: item.uid });
                            if (self.interaction.type === 'targeted') actions.chooseInteractive({ itemName: item.name });
                            if (self.interaction.type === 'trade_in') actions.chooseInteractive({ itemUid: item.uid });
                        }}
                    />
                ))}
            </div>
        </section>
    );
}

function MyInventoryWorkbench({
    self,
    inventorySize,
    orders,
    actions,
    submitOrderId,
    selectedSubmitIndices,
    onToggleSubmitItem,
    onCancelSubmit,
    onConfirmSubmit,
    onHoverItem,
    onLeaveItem,
}) {
    const { t } = useLanguage();
    const [mode, setMode] = useState('organize');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [recycleIndices, setRecycleIndices] = useState([]);

    const selectedItem = selectedIndex !== null ? self?.inventory[selectedIndex] : null;
    const recycleValue = recycleIndices.reduce((sum, index) => sum + (self?.inventory[index]?.rarity?.recycleValue || 0), 0);
    const submitOrder = orders.find((order) => order.id === submitOrderId);
    const submitSelectedItems = selectedSubmitIndices.map((index) => self?.inventory[index]).filter(Boolean);
    const canSubmitOrder = selectedItemsSatisfyOrder(submitOrder, submitSelectedItems);
    const submitReward = calculateSelectedReward(submitOrder, submitSelectedItems);

    const slots = useMemo(() => Array.from({ length: inventorySize }, (_, index) => self?.inventory[index] || null), [inventorySize, self]);

    const clickSlot = (index) => {
        if (!self || self.eliminated) return;

        if (self.pendingItem) {
            if (self.inventory[index]) actions.handlePending({ action: 'replace', index });
            return;
        }

        if (submitOrderId) {
            if (!self.inventory[index]) return;
            onToggleSubmitItem(index);
            return;
        }

        if (mode === 'recycle') {
            if (!self.inventory[index]) return;
            setRecycleIndices((prev) => prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]);
            return;
        }

        if (!self.inventory[index] && selectedIndex === null) return;
        if (selectedIndex === null) {
            setSelectedIndex(index);
            return;
        }
        if (selectedIndex === index) {
            setSelectedIndex(null);
            return;
        }
        actions.moveItem({ from: selectedIndex, to: index });
        setSelectedIndex(null);
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setSelectedIndex(null);
        setRecycleIndices([]);
        onCancelSubmit();
    };

    return (
        <section className="rounded-3xl border-4 border-white bg-white p-4 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900">{t('我的背包')}</h2>
                    <p className="text-xs font-bold text-slate-400">
                        {self?.inventory.length || 0}/{inventorySize} · {self?.gold || 0} 🪙 · {self?.score || 0} ⭐
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => switchMode('organize')}
                        className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black shadow-sm ${mode === 'organize' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Hand size={14} />
                        {t('整理')}
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode('recycle')}
                        className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black shadow-sm ${mode === 'recycle' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Recycle size={14} />
                        {t('回收')}
                    </button>
                </div>
            </div>

            {self?.pendingItem && (
                <div className="mb-4 rounded-2xl border-2 border-purple-200 bg-purple-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-black text-purple-800">{t('处理待放入物品')}</div>
                            <div className="text-xs font-bold text-purple-600">{t('点击背包物品替换或合成；也可以直接回收新物品。')}</div>
                        </div>
                        <ItemTile item={self.pendingItem} size="lg" />
                    </div>
                    <button
                        type="button"
                        onClick={() => actions.handlePending({ action: 'discard' })}
                        className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100"
                    >
                        {t('回收新物品')}
                    </button>
                </div>
            )}

            {mode === 'organize' && selectedItem && (
                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                    {t('已选中')}: {selectedItem.icon} {t(selectedItem.name)} · {t('点击另一格交换或合成')}
                </div>
            )}

            {submitOrder && (
                <div className="mb-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-black text-green-800">
                            {t('选择要提交的背包物品')} · {selectedSubmitIndices.length}/{submitOrder.requirements.length} · {submitReward} ⭐
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={!canSubmitOrder}
                                onClick={onConfirmSubmit}
                                className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                <Send size={14} />
                                {t('确认提交')}
                            </button>
                            <button
                                type="button"
                                onClick={onCancelSubmit}
                                className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <X size={14} />
                                {t('取消')}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {submitOrder.requirements.map((req, index) => (
                            <div
                                key={`${submitOrder.id}-submit-${index}`}
                                className="relative rounded-lg border border-green-200 bg-white py-1 pl-5 pr-2 text-[11px] font-black text-green-800"
                                title={`${t(req.name)} / ${t(req.requiredRarity?.name)}`}
                            >
                                <span className={`absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-white/60 ${req.requiredRarity?.dotColor || 'bg-slate-300'}`} />
                                {req.icon} {t(req.name)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {mode === 'recycle' && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <span className="text-xs font-black text-amber-700">
                        {t('已选择')} {recycleIndices.length} · {t('可回收价值')} {recycleValue} 🪙
                    </span>
                    <button
                        type="button"
                        disabled={recycleIndices.length === 0}
                        onClick={() => {
                            actions.recycleItems(recycleIndices);
                            setRecycleIndices([]);
                        }}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        {t('确认回收')}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {slots.map((item, index) => (
                    (() => {
                        const isNeededForOrder = !!item && orders.some((order) => order.requirements.some((req) => req.name === item.name));
                        const isMaxSatisfied = !!item && orders.some((order) => order.requirements.some((req) => req.name === item.name && (item.rarity?.bonus || 0) >= (req.requiredRarity?.bonus || 0)));
                        const hasUpgradePair = !!item && !item.sterile && self.inventory.some((other, otherIndex) => otherIndex !== index && other?.name === item.name && other?.rarity?.id === item.rarity?.id && item.rarity?.id !== 'mythic' && !other.sterile);
                        const sourceItem = selectedIndex !== null ? self.inventory[selectedIndex] : null;
                        const canSynthesize = !!sourceItem && !!item && sourceItem.name === item.name && sourceItem.rarity?.id === item.rarity?.id && sourceItem.rarity?.id !== 'mythic' && !sourceItem.sterile && !item.sterile;
                        return (
                    <ItemTile
                        key={item?.uid || `empty-${index}`}
                        item={item}
                        index={index}
                        size="lg"
                                selected={(mode === 'organize' && selectedIndex === index) || selectedSubmitIndices.includes(index)}
                                hinted={(mode === 'recycle' && recycleIndices.includes(index)) || selectedSubmitIndices.includes(index)}
                                isNeededForOrder={isNeededForOrder}
                                isMaxSatisfied={isMaxSatisfied}
                                hasUpgradePair={hasUpgradePair}
                                isTarget={selectedIndex !== null && selectedIndex !== index}
                                canSynthesize={canSynthesize}
                        disabled={!!self?.interaction || !!self?.ready}
                        onClick={clickSlot}
                                onMouseEnter={onHoverItem}
                                onMouseLeave={onLeaveItem}
                    />
                        );
                    })()
                ))}
            </div>
        </section>
    );
}

function Lobby({ snapshot, actions, connectionStatus, error }) {
    const { t } = useLanguage();
    const [name, setName] = useState(localStorage.getItem('multiplayer_name') || '');
    const self = snapshot?.players?.find((player) => player.isSelf);
    const canStart = self?.isHost && snapshot.players.length >= snapshot.minPlayers;

    const join = () => {
        localStorage.setItem('multiplayer_name', name);
        actions.join(name || t('玩家'));
    };

    return (
        <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-4">
                    <div>
                        <h1 className="text-2xl font-black">{t('幸运之墙 LAN 多人原型')}</h1>
                        <p className="text-sm font-semibold text-slate-500">{t('2 到 4 人房间')}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm">
                        {connectionStatus === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                        <span>{connectionStatus}</span>
                    </div>
                </header>

                {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

                {!self ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-black text-slate-700">{t('玩家名')}</label>
                        <div className="flex gap-2">
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                                maxLength={12}
                            />
                            <button onClick={join} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">
                                {t('加入房间')}
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                            <Users size={18} />
                            <span>{snapshot.players.length}/{snapshot.maxPlayers}</span>
                        </div>
                        <div className="mb-4 grid gap-2 sm:grid-cols-2">
                            {snapshot.players.map((player) => <PublicPlayerCard key={player.id} player={player} inventorySize={snapshot.inventorySize} orders={snapshot.orders || []} />)}
                        </div>
                        <button
                            type="button"
                            disabled={!canStart}
                            onClick={actions.start}
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            <Play size={18} />
                            {t('开始游戏')}
                        </button>
                    </section>
                )}
            </div>
        </main>
    );
}

function GameTable({ snapshot, self, actions, error }) {
    const { t } = useLanguage();
    const otherPlayers = snapshot.players.filter((player) => !player.isSelf);
    const [hoveredPoolId, setHoveredPoolId] = useState(null);
    const [hoveredPoolItemNames, setHoveredPoolItemNames] = useState([]);
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const [submitOrderId, setSubmitOrderId] = useState(null);
    const [selectedSubmitIndices, setSelectedSubmitIndices] = useState([]);

    const startSubmit = (orderId) => {
        setSubmitOrderId(orderId);
        setSelectedSubmitIndices([]);
    };

    const cancelSubmit = () => {
        setSubmitOrderId(null);
        setSelectedSubmitIndices([]);
    };

    const toggleSubmitItem = (index) => {
        setSelectedSubmitIndices((prev) => (
            prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
        ));
    };

    const confirmSubmit = () => {
        const itemUids = selectedSubmitIndices.map((index) => self?.inventory[index]?.uid).filter(Boolean);
        actions.submitOrder(submitOrderId, itemUids);
        cancelSubmit();
    };

    const hoverPool = (pool) => {
        setHoveredPoolId(pool.originalId || pool.id);
        setHoveredPoolItemNames(pool.items.map((item) => item.name));
    };

    const leavePool = () => {
        setHoveredPoolId(null);
        setHoveredPoolItemNames([]);
    };

    const hoverItem = (_, item) => {
        setHoveredItemName(item?.name || null);
    };

    const leaveItem = () => {
        setHoveredItemName(null);
    };

    return (
        <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-4">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
                <header className="grid gap-3 lg:grid-cols-[280px_1fr_320px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-black uppercase text-slate-400">{t('回合')}</div>
                                <div className="text-4xl font-black text-slate-900">{snapshot.round}</div>
                            </div>
                            <div className="text-right text-sm font-black text-slate-700">
                                <div>{self?.gold ?? 0} 🪙</div>
                                <div>{self?.score ?? 0} ⭐</div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <h2 className="mb-2 text-xs font-black uppercase text-slate-400">{t('最近开奖')}</h2>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {snapshot.roundResults.length === 0 && <div className="text-sm font-bold text-slate-400">{t('等待第一次开奖')}</div>}
                            {snapshot.roundResults.map((result) => (
                                <div key={`${result.round}-${result.playerId}`} className="min-w-48 rounded-xl border border-slate-100 bg-slate-50 p-2">
                                    <div className="mb-1 truncate text-xs font-black text-slate-700">{result.playerName} · {t(result.poolName)}</div>
                                    <div className="flex gap-1">
                                        {result.items.map((item) => <ItemTile key={item.uid} item={item} size="sm" />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <h2 className="mb-2 text-xs font-black uppercase text-slate-400">{t('状态')}</h2>
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
                            {self?.ready && <span className="rounded bg-green-100 px-2 py-1 text-green-700">{t('等待其他玩家')}</span>}
                            {self?.interaction && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">{t('选择词缀中')}</span>}
                            {self?.pendingItem && <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">{t('处理中')}</span>}
                            {self?.eliminated && <span className="rounded bg-slate-200 px-2 py-1 text-slate-600">{t('已停止抽奖')}</span>}
                            {self?.needsCashout && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">{t('资金告急')}</span>}
                            {!self?.ready && !self?.interaction && !self?.pendingItem && !self?.eliminated && !self?.needsCashout && <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{t('可以行动')}</span>}
                        </div>
                        {self?.needsCashout && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <p className="mb-2 text-xs font-bold leading-relaxed text-amber-800">
                                    {t('你现在支付不起任何奖池。可以回收物品后继续，或结束抽奖。')}
                                </p>
                                <button
                                    type="button"
                                    onClick={actions.stopDrawing}
                                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-700"
                                >
                                    <Hand size={14} />
                                    {t('结束抽奖')}
                                </button>
                            </div>
                        )}
                    </section>
                </header>

                {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

                <div className="grid gap-4 xl:grid-cols-[300px_1fr_330px]">
                    <aside className="flex flex-col gap-3">
                        <h2 className="text-xs font-black uppercase text-slate-400">{t('共享订单')}</h2>
                        {snapshot.orders.map((order) => (
                            <OrderCardMini
                                key={order.id}
                                order={order}
                                inventory={self?.inventory || []}
                                selfId={self?.id}
                                isSubmitTarget={submitOrderId === order.id}
                                selectedSubmitIndices={selectedSubmitIndices}
                                hoveredPoolItemNames={hoveredPoolItemNames}
                                hoveredItemName={hoveredItemName}
                                onBeginSubmit={startSubmit}
                                disabled={!self || self.eliminated || !!self.pendingItem || !!self.ready || !!self.interaction}
                            />
                        ))}
                    </aside>

                    <section className="flex flex-col gap-4">
                        <InteractionPanel self={self} actions={actions} />

                        <section>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className="text-xs font-black uppercase text-slate-400">{t('本回合奖池')}</h2>
                                {self?.pendingItem && <span className="text-xs font-black text-purple-600">{t('你可以先处理背包，其他玩家可继续选择')}</span>}
                                {self?.needsCashout && <span className="text-xs font-black text-amber-600">{t('先回收物品即可继续抽奖')}</span>}
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                {snapshot.activePools.map((pool) => (
                                    <PoolCardMulti
                                        key={pool.id}
                                        pool={pool}
                                        self={self}
                                        isHovered={hoveredPoolId === (pool.originalId || pool.id)}
                                        onChoose={actions.choosePool}
                                        onMouseEnter={hoverPool}
                                        onMouseLeave={leavePool}
                                    />
                                ))}
                            </div>
                        </section>

                        <MyInventoryWorkbench
                            self={self}
                            inventorySize={snapshot.inventorySize}
                            orders={snapshot.orders}
                            actions={actions}
                            submitOrderId={submitOrderId}
                            selectedSubmitIndices={selectedSubmitIndices}
                            onToggleSubmitItem={toggleSubmitItem}
                            onCancelSubmit={cancelSubmit}
                            onConfirmSubmit={confirmSubmit}
                            onHoverItem={hoverItem}
                            onLeaveItem={leaveItem}
                        />
                    </section>

                    <aside className="flex flex-col gap-3">
                        <h2 className="text-xs font-black uppercase text-slate-400">{t('其他玩家')}</h2>
                        {otherPlayers.map((player) => <PublicPlayerCard key={player.id} player={player} inventorySize={snapshot.inventorySize} orders={snapshot.orders} />)}
                    </aside>
                </div>
            </div>
        </main>
    );
}

function Finished({ snapshot, actions }) {
    const { t } = useLanguage();
    const self = snapshot.players.find((player) => player.isSelf);
    return (
        <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <Trophy className="text-yellow-500" size={28} />
                    <h1 className="text-2xl font-black">{t('游戏结束')}</h1>
                </div>
                <div className="space-y-2">
                    {snapshot.rankings.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span className="font-black">{index + 1}. {player.name}</span>
                            <span className="font-black text-blue-700">{player.score} ⭐</span>
                        </div>
                    ))}
                </div>
                {self && (
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="mb-3 text-sm font-bold text-blue-800">{t('所有在线玩家会回到同一个房间，可重新开始。')}</p>
                        <button
                            type="button"
                            onClick={actions.resetRoom}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                        >
                            <RotateCcw size={18} />
                            {t('回到房间')}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function MultiplayerGame() {
    const { snapshot, self, actions, connectionStatus, error } = useMultiplayerClient();

    if (!snapshot) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
                <Loader2 className="animate-spin" />
            </main>
        );
    }

    if (snapshot.status === 'finished') return <Finished snapshot={snapshot} actions={actions} />;
    if (snapshot.status === 'lobby') return <Lobby snapshot={snapshot} actions={actions} connectionStatus={connectionStatus} error={error} />;
    return <GameTable snapshot={snapshot} self={self} actions={actions} error={error} />;
}
