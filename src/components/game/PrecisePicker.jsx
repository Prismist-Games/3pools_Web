import React from 'react';
import { PRIMARY_BTN, SECONDARY_BTN, rarityStyle } from './uiCommon';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PrecisePicker({ candidates, onPick, onCancel }) {
    const { t } = useLanguage();
    if (!candidates) return null;
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-kitchen-card rounded-2xl border-2 border-kitchen-gold-border shadow-2xl p-6 max-w-lg w-full">
                <div className="text-center mb-4">
                    <h3 className="font-black text-xl text-kitchen-text-title">🎯 {t('精准：2 选 1')}</h3>
                    <p className="text-sm text-kitchen-text-secondary mt-1">
                        {t('你可以看到这两个候选的品质。选一个进篮。')}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {candidates.map((cand, idx) => (
                        <CandidateCard key={idx} candidate={cand} onClick={() => onPick(idx)} />
                    ))}
                </div>
                <div className="flex justify-center mt-4">
                    <button onClick={onCancel} className={SECONDARY_BTN + ' text-sm'}>{t('取消')}</button>
                </div>
            </div>
        </div>
    );
}

function CandidateCard({ candidate, onClick }) {
    const { t } = useLanguage();
    if (candidate.isBanana) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="py-6 px-4 rounded-xl border-2 border-yellow-500 bg-yellow-100 hover:brightness-105 transition"
            >
                <div className="text-5xl">🍌</div>
                <div className="mt-2 font-bold text-yellow-800">{t('香蕉皮')}</div>
                <div className="text-[10px] text-yellow-700">{t('选它会被踢出')}</div>
            </button>
        );
    }
    const ing = candidate.ingredient;
    const rs = rarityStyle(candidate.rarity);
    return (
        <button
            type="button"
            onClick={onClick}
            className={`py-5 px-4 rounded-xl border-2 ${rs.border} ${rs.bg} hover:-translate-y-1 hover:shadow transition`}
        >
            <div className="text-5xl">{ing.icon}</div>
            <div className="mt-2 font-bold text-kitchen-text-title">{t(ing.name)}</div>
            <div className={`text-sm mt-1 font-bold ${rs.star}`}>{rs.label}</div>
            <div className="text-[10px] text-kitchen-text-secondary mt-1">
                {(ing.tags || []).map(x => t(x)).join(' · ')}
            </div>
        </button>
    );
}
