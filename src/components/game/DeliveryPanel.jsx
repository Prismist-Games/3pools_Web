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
                        <Umbrella size={12} className={item.deliveryTag === 'fortified' ? 'text-green-500' : item.deliveryTag === 'fragile' ? 'text-red-500' : 'text-blue-500'} />
                        <span className="font-mono font-bold">{item.currentDurability}</span>
                    </span>
                    {(item.effectiveSharpness ?? item.sharpness ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs">
                            <TriangleAlert size={12} className={item.deliveryTag === 'angular' ? 'text-red-500' : 'text-amber-500'} />
                            <span className="font-mono font-bold">{item.effectiveSharpness ?? item.sharpness}</span>
                            {item.deliveryTag === 'unidirectional' && <span className="text-[9px] ml-0.5">→0/←×2</span>}
                        </span>
                    )}
                </div>
                {/* Delivery tag badge */}
                {item.deliveryTag && (
                    <div className="text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {item.deliveryTag === 'fortified' ? '加固' : item.deliveryTag === 'fragile' ? '易碎' : item.deliveryTag === 'angular' ? '棱角' : item.deliveryTag === 'protective' ? '保护' : item.deliveryTag === 'explosive' ? '易爆' : item.deliveryTag === 'set_bonus' ? '套装' : item.deliveryTag === 'unidirectional' ? '单向' : ''}
                    </div>
                )}
            </div>
        );
    };

    // Animation state
    const [animState, setAnimState] = useState({
        currentBump: 0,
        currentCollision: 0,
        step: 'focus', // 'focus' | 'impact' | 'resolve' | 'reset'
        isPaused: false,
        displayItems: null,
    });

    const [bumpSnapshots, setBumpSnapshots] = useState([]);

    // Default animation speed (from config prop or fallback)
    const animationSpeed = rarityConfig?._animationSpeed || {
        focusDuration: 300,
        impactDuration: 400,
        resolveDuration: 500,
        resetDuration: 300,
        bumpTransitionDuration: 600,
    };

    // Initialize animation when entering animating phase
    React.useEffect(() => {
        if (phase === 'animating' && deliveryResult && !animState.displayItems) {
            const initialSnapshot = arrangement.map(item => ({
                ...item,
                rarity: item.rarity ? { ...item.rarity } : null,
            }));
            setBumpSnapshots([initialSnapshot]);
            setAnimState(prev => ({
                ...prev,
                currentBump: 0,
                currentCollision: 0,
                step: 'focus',
                displayItems: initialSnapshot,
            }));
        }
    }, [phase]);

    // Auto-advance animation
    React.useEffect(() => {
        if (phase !== 'animating' || animState.isPaused || !animState.displayItems) return;
        if (!deliveryResult) return;

        const { bumpHistory } = deliveryResult;
        const { currentBump, currentCollision, step } = animState;

        if (currentBump >= bumpHistory.length) {
            onAnimationComplete();
            return;
        }

        const bump = bumpHistory[currentBump];
        const collisions = bump.collisions.filter(c => c.type !== 'no_damage');

        if (collisions.length === 0) {
            const timer = setTimeout(() => {
                advanceToBump(currentBump + 1);
            }, 400);
            return () => clearTimeout(timer);
        }

        if (currentCollision >= collisions.length) {
            const timer = setTimeout(() => {
                advanceToBump(currentBump + 1);
            }, animationSpeed.bumpTransitionDuration);
            return () => clearTimeout(timer);
        }

        const durations = {
            focus: animationSpeed.focusDuration,
            impact: animationSpeed.impactDuration,
            resolve: animationSpeed.resolveDuration,
            reset: animationSpeed.resetDuration,
        };

        const timer = setTimeout(() => {
            const nextStep = { focus: 'impact', impact: 'resolve', resolve: 'reset', reset: 'focus' }[step];

            if (nextStep === 'focus') {
                applyCollisionToDisplay(collisions[currentCollision]);
                setAnimState(prev => ({
                    ...prev,
                    currentCollision: prev.currentCollision + 1,
                    step: 'focus',
                }));
            } else {
                setAnimState(prev => ({ ...prev, step: nextStep }));
            }
        }, durations[step]);

        return () => clearTimeout(timer);
    }, [phase, animState.currentBump, animState.currentCollision, animState.step, animState.isPaused, animState.displayItems]);

    const advanceToBump = (nextBump) => {
        if (nextBump >= deliveryResult.bumpHistory.length) {
            onAnimationComplete();
            return;
        }
        const snapshot = deliveryResult.bumpHistory[nextBump - 1]?.itemsSnapshot
            || arrangement.map(item => ({ ...item }));

        setBumpSnapshots(prev => [...prev, snapshot]);
        setAnimState(prev => ({
            ...prev,
            currentBump: nextBump,
            currentCollision: 0,
            step: 'focus',
            displayItems: snapshot,
        }));
    };

    const applyCollisionToDisplay = (collision) => {
        setAnimState(prev => {
            const newItems = prev.displayItems.map(item => {
                if (item.uid === collision.defenderUid) {
                    return {
                        ...item,
                        currentDurability: collision.durabilityAfter,
                        rarity: collision.rarityAfter
                            ? rarityConfig.find(r => r.id === collision.rarityAfter)
                            : null,
                        destroyed: collision.type === 'destroy',
                    };
                }
                return item;
            });
            return { ...prev, displayItems: newItems };
        });
    };

    const handlePause = () => setAnimState(prev => ({ ...prev, isPaused: !prev.isPaused }));

    const handleStepBump = (delta) => {
        const targetBump = animState.currentBump + delta;
        if (targetBump < 0 || targetBump >= deliveryResult.bumpHistory.length) return;

        const snapshot = targetBump === 0
            ? arrangement.map(item => ({ ...item }))
            : deliveryResult.bumpHistory[targetBump - 1].itemsSnapshot;

        setAnimState(prev => ({
            ...prev,
            currentBump: targetBump,
            currentCollision: 0,
            step: 'focus',
            displayItems: snapshot,
            isPaused: true,
        }));
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

    if (phase === 'animating' && animState.displayItems) {
        const { currentBump, currentCollision, step, isPaused, displayItems } = animState;
        const { bumpHistory } = deliveryResult;
        const bump = bumpHistory[currentBump];
        const collisions = bump?.collisions.filter(c => c.type !== 'no_damage') || [];
        const collision = collisions[currentCollision];

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 border-4 border-slate-200">
                    {/* Header with bump progress */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-800">
                            {t("运送中")} — {t("颠簸")} {currentBump + 1}/{bumpHistory.length}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold
                            ${bump?.direction === '→' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {t("方向")}: {bump?.direction}
                        </span>
                    </div>

                    {/* Items display */}
                    <div className="flex items-center justify-center gap-2 py-4 min-h-[140px]">
                        {displayItems.filter(item => !item.destroyed).map((item, i, arr) => {
                            const isAttacker = collision && item.uid === collision.attackerUid && (step === 'impact' || step === 'resolve');
                            const isDefender = collision && item.uid === collision.defenderUid && (step === 'impact' || step === 'resolve');

                            return (
                                <React.Fragment key={item.uid}>
                                    <div className={`
                                        relative flex flex-col items-center p-3 rounded-xl border-2 min-w-[90px]
                                        transition-all duration-300
                                        ${item.rarity?.color || 'border-slate-300 bg-slate-50'}
                                        ${isAttacker && step === 'impact' ? (bump?.direction === '→' ? 'translate-x-3' : '-translate-x-3') : ''}
                                        ${isDefender && step === 'impact' ? 'animate-pulse scale-95' : ''}
                                        ${isAttacker || isDefender ? 'ring-2 ring-yellow-400 z-10' : 'opacity-50'}
                                        ${!isAttacker && !isDefender && !collision ? 'opacity-100' : ''}
                                    `}>
                                        <span className="text-3xl mb-1">{item.icon}</span>
                                        <span className="text-xs font-bold">{item.name}</span>
                                        <div className="flex gap-2 mt-1.5">
                                            <span className="flex items-center gap-0.5 text-xs">
                                                <Umbrella size={12} className={item.deliveryTag === 'fortified' ? 'text-green-500' : item.deliveryTag === 'fragile' ? 'text-red-500' : 'text-blue-500'} />
                                                <span className="font-mono font-bold">{item.currentDurability}</span>
                                            </span>
                                            {(item.effectiveSharpness ?? item.sharpness ?? 0) > 0 && (
                                                <span className="flex items-center gap-0.5 text-xs">
                                                    <TriangleAlert size={12} className={item.deliveryTag === 'angular' ? 'text-red-500' : 'text-amber-500'} />
                                                    <span className="font-mono font-bold">{item.effectiveSharpness ?? item.sharpness}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Damage popup */}
                                        {isDefender && step === 'resolve' && collision.damage > 0 && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 font-black text-sm animate-bounce">
                                                -{collision.damage}
                                            </div>
                                        )}
                                    </div>

                                    {i < arr.length - 1 && (
                                        <div className="text-slate-300 text-lg">—</div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleStepBump(-1)} disabled={currentBump === 0}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-sm font-bold">
                            <ArrowLeft size={16} />
                        </button>
                        <button onClick={handlePause}
                            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-bold">
                            {isPaused ? t("播放") : t("暂停")}
                        </button>
                        <button onClick={() => handleStepBump(1)}
                            disabled={currentBump >= bumpHistory.length - 1}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-sm font-bold">
                            <ArrowRight size={16} />
                        </button>
                        <button onClick={onAnimationComplete}
                            className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-sm font-bold ml-4">
                            {t("跳过")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        const { passed, slotResults, finalItems } = deliveryResult;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`bg-white p-6 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col gap-4 border-4
                    ${passed ? 'border-green-300' : 'border-red-300'}`}>

                    {/* Result header */}
                    <div className="text-center">
                        <div className="text-4xl mb-2">{passed ? '📦✓' : '📦✗'}</div>
                        <h3 className={`text-2xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {passed ? t("运送成功！") : t("运送失败")}
                        </h3>
                        {!passed && (
                            <p className="text-sm text-slate-500 mt-1">
                                {t("部分物品未能满足订单要求")}
                            </p>
                        )}
                    </div>

                    {/* Per-item results */}
                    <div className="flex flex-col gap-2">
                        {currentOrder.requirements.map((req, i) => {
                            const result = slotResults[i];
                            const item = finalItems.find(fi => fi.uid === result.uid);

                            return (
                                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg
                                    ${result.met ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <span className="text-2xl">{req.icon}</span>
                                    <div className="flex-1">
                                        <span className="text-sm font-bold">{req.name}</span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {t("要求")}: {req.requiredRarity.name}+
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {result.reason === 'destroyed' ? (
                                            <span className="text-xs font-bold text-red-600">{t("已损坏")}</span>
                                        ) : result.reason === 'degraded' ? (
                                            <span className="text-xs font-bold text-red-600">
                                                {t("降至")} {rarityConfig.find(r => r.id === result.actualRarity)?.name}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-green-600">
                                                {rarityConfig.find(r => r.id === result.actualRarity)?.name} ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Proceed button */}
                    <button
                        onClick={() => {
                            setSelectedSlot(null);
                            setAnimState({ currentBump: 0, currentCollision: 0, step: 'focus', isPaused: false, displayItems: null });
                            onProceed();
                        }}
                        className={`w-full font-bold py-3 rounded-xl shadow-lg active:scale-[0.98]
                            ${passed
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                    >
                        {currentIndex < queue.length - 1 ? t("下一个订单") : t("继续")}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
