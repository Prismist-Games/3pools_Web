import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 跳过教程按钮：固定显示在 GameCore header 区域，
 * 点击弹出确认 modal，确认后调 onSkip。
 */
export default function TutorialSkipButton({ onSkip }) {
    const { t } = useLanguage();
    const [confirming, setConfirming] = useState(false);

    return (
        <>
            <button
                onClick={() => setConfirming(true)}
                className="px-3 py-1 rounded bg-kitchen-card/80 border border-kitchen-gold-border text-kitchen-text-secondary text-sm hover:brightness-110 hover:text-kitchen-text-title"
                title={t('跳过教程')}
            >
                {t('跳过教程')}
            </button>
            {confirming && (
                <div
                    className="fixed inset-0 z-[250] bg-black/70 flex items-center justify-center p-6"
                    onClick={() => setConfirming(false)}
                >
                    <div
                        className="bg-kitchen-card border-2 border-kitchen-gold-border rounded-2xl p-6 max-w-md flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-base text-kitchen-text-body whitespace-pre-wrap">
                            {t('将跳过开场与新手教程，直接从第二天开始。')}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirming(false)}
                                className="px-4 py-1 rounded border border-kitchen-gold-border-muted text-kitchen-text-secondary hover:bg-kitchen-warm"
                            >
                                {t('取消')}
                            </button>
                            <button
                                onClick={() => { setConfirming(false); onSkip?.(); }}
                                className="px-4 py-1 rounded bg-kitchen-wood-light border border-kitchen-wood-border text-kitchen-text-title font-bold hover:brightness-105"
                            >
                                {t('确认跳过')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
