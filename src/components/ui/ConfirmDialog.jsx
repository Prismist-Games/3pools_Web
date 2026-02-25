import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95">
                <h3 className="text-xl font-black text-[#2D2A26] mb-2">{title}</h3>
                <p className="text-stone-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg font-bold text-stone-500 hover:bg-stone-100"
                    >
                        {t("取消")}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 rounded-lg font-bold bg-red-500 text-white hover:bg-red-600 shadow-md"
                    >
                        {t("确认")}
                    </button>
                </div>
            </div>
        </div>
    );
};
