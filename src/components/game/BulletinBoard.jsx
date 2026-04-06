import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const BulletinBoard = ({ orders, onAccept, canAccept }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white rounded-lg shadow-sm border p-3">
            <h3 className="text-sm font-bold mb-2">{t('公告牌')} ({orders.length}/5)</h3>
            {orders.length === 0 ? (
                <p className="text-xs text-gray-400">{t('暂无订单')}</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {orders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{order.reward.icon}</span>
                                <div>
                                    <div className="text-xs font-bold">{order.reward.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                        {t(order.difficulty)} · +{order.reward.score}{t('分')}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onAccept(order.id)}
                                disabled={!canAccept}
                                className={`text-xs px-2 py-1 rounded font-bold transition-colors
                                    ${canAccept ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                {t('接取')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulletinBoard;
