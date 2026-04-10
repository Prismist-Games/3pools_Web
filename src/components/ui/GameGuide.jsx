import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const GameGuide = ({ onClose }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div
                className="bg-kitchen-card rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-kitchen-card rounded-t-2xl border-b border-kitchen-gold-border-muted px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-black text-kitchen-text-title">{t('快速指南')}</h2>
                    <button
                        onClick={onClose}
                        className="text-kitchen-text-secondary hover:text-kitchen-text-body text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FFF8F0] transition-colors"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-4 space-y-5 text-sm text-kitchen-text-body">
                    {/* Goal */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            🎯 {t('游戏目标')}
                        </h3>
                        <p>{t('完成 3 场录制，累计获得 ≥30 分即可挽救你的餐厅。每场收集贴纸、完成订单获得食材，选择合适的时机撤离带出分数。')}</p>
                    </section>

                    {/* Turn Flow */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            🔄 {t('回合流程')}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="px-2 py-1 bg-[#FFF8E0] border border-kitchen-gold-border-muted rounded-lg font-bold text-kitchen-gold-deep">
                                1. {t('选墙')}
                            </span>
                            <span className="text-kitchen-text-muted">→</span>
                            <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-700">
                                2. {t('花金币抽取')}
                            </span>
                            <span className="text-kitchen-text-muted">→</span>
                            <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg font-bold text-purple-700">
                                3. {t('厄运积累')}
                            </span>
                            <span className="text-kitchen-text-muted">→</span>
                            <span className="px-2 py-1 bg-[#FFFAF2] border border-kitchen-gold-border-muted rounded-lg font-bold text-kitchen-text-body">
                                4. {t('新订单')}
                            </span>
                            <span className="text-kitchen-text-muted">→</span>
                            <span className="px-2 py-1 bg-green-50 border border-green-200 rounded-lg font-bold text-green-700">
                                5. {t('继续或撤离')}
                            </span>
                        </div>
                    </section>

                    {/* Drawing */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            🎰 {t('抽取规则')}
                        </h3>
                        <p>{t('每回合获得金币，每次抽取花 1 金币。选择面板的一行或一列，随机抽中其中 1 格。不必用完所有金币。')}</p>
                    </section>

                    {/* Cell Types */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            🧩 {t('格子类型')}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">🏔️</span>
                                <span><b>{t('贴纸')}</b> — {t('收集完成订单')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">💀</span>
                                <span><b>{t('厄运结算')}</b> — {t('触发厄运，可能扣血')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">⬆️</span>
                                <span><b>{t('厄运升级')}</b> — {t('厄运更危险')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">🎁</span>
                                <span><b>{t('食材')}</b> — {t('直接获得食材')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">📋</span>
                                <span><b>{t('订单')}</b> — {t('获得新订单')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">💰</span>
                                <span><b>{t('金币')}</b> — {t('获得额外金币')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">💣</span>
                                <span><b>{t('炸弹')}</b> — {t('爆炸摧毁周围格子')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">❤️‍🩹</span>
                                <span><b>{t('生命恢复')}</b> — {t('回复生命值')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">🎒</span>
                                <span><b>{t('菜篮扩容')}</b> — {t('增加菜篮容量')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 text-center">⬇️</span>
                                <span><b>{t('重力开关')}</b> — {t('格子向下坠落')}</span>
                            </div>
                        </div>
                    </section>

                    {/* Orders & Stickers */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            📋 {t('订单与贴纸')}
                        </h3>
                        <ol className="list-decimal list-inside space-y-0.5">
                            <li>{t('从左侧货架接取订单（只显示奖励和难度，接取后才揭示所需贴纸）')}</li>
                            <li>{t('在面板上抽取贴纸，收集订单所需的种类和数量')}</li>
                            <li>{t('随时提交已完成的订单，获得食材放入菜篮')}</li>
                        </ol>
                    </section>

                    {/* Doom */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            💀 {t('厄运系统')}
                        </h3>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>{t('每回合结束，厄运网格自动增加 1 个危险格子')}</li>
                            <li>{t('抽到 💀 触发结算：在厄运网格抽取，命中危险格 = -1 HP')}</li>
                            <li>{t('HP 归零 = 丢失全部菜篮物品，强制撤离，本场 0 分')}</li>
                        </ul>
                    </section>

                    {/* Evacuate */}
                    <section>
                        <h3 className="font-black text-kitchen-text-title mb-1.5 flex items-center gap-1.5">
                            🚪 {t('撤离决策')}
                        </h3>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>{t('回合结束后可选择撤离，菜篮中的食材转化为分数')}</li>
                            <li>{t('继续 = 更多食材，但厄运在不断积累！')}</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};
