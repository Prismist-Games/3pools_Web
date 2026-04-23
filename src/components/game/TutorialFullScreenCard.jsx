import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 全屏叙事卡：用于开场叙事 / 变故 / 过场提示 / 人气值目标卡 / 规则说明 modal。
 * 形态：半透黑遮罩 + 中央 kitchen-card 风格卡片，emoji + 标题 + 正文 + 继续按钮。
 * 点击背景或继续按钮触发 onComplete。
 */
export default function TutorialFullScreenCard({ emoji, title, body, buttonText = '继续', onComplete }) {
    const { t } = useLanguage();
    return (
        <div
            className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-6"
            onClick={onComplete}
        >
            <div
                className="bg-kitchen-card border-2 border-kitchen-gold-border rounded-2xl shadow-2xl max-w-xl w-full p-8 flex flex-col items-center gap-5"
                onClick={(e) => e.stopPropagation()}
            >
                {emoji && <div className="text-7xl">{emoji}</div>}
                {title && <div className="text-2xl font-black text-kitchen-text-title">{t(title)}</div>}
                <div className="text-base text-kitchen-text-body text-center whitespace-pre-wrap leading-relaxed">{t(body)}</div>
                <button
                    onClick={onComplete}
                    className="mt-2 px-8 py-2 rounded-lg bg-gradient-to-b from-kitchen-wood-light to-kitchen-wood-dark border-2 border-kitchen-wood-border text-kitchen-text-title font-bold hover:brightness-105 shadow-[0_2px_0_#C8A880]"
                >
                    {t(buttonText)}
                </button>
            </div>
        </div>
    );
}
