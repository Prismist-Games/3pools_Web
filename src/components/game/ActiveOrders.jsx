import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ActiveOrders = ({ orders, inventory, onSubmit, canSubmitOrder }) => {
    const { t } = useLanguage();
    if (orders.length === 0) return null;
    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('已接订单')} ({orders.length}/3)</h3>
            <div className="flex flex-col gap-2">
                {orders.map(order => {
                    const submittable = canSubmitOrder(order.id);
                    return (
                        <div key={order.id} className={`p-2 rounded-lg border ${submittable ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg">{order.reward.icon}</span>
                                    <span className="text-xs font-bold">{order.reward.name}</span>
                                    <span className="text-[10px] text-gray-400">+{order.reward.score}{t('分')}</span>
                                </div>
                                <button
                                    onClick={() => onSubmit(order.id)}
                                    disabled={!submittable}
                                    className={`text-xs px-2 py-1 rounded font-bold transition-colors
                                        ${submittable ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                >
                                    {t('提交')}
                                </button>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {order.requirements.map((req, i) => {
                                    const owned = inventory.filter(item => item.stickerId === req.stickerId).length;
                                    const enough = owned >= req.count;
                                    return (
                                        <div key={i} className={`flex items-center gap-0.5 text-xs ${enough ? 'text-green-600' : 'text-gray-500'}`}>
                                            <span>{req.icon}</span>
                                            <span className="font-bold">{owned}/{req.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActiveOrders;
