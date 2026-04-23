import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 底部对话小框：用于场景内主角独白 / NPC 对白。
 * - 不阻断玩家观察上方游戏 UI
 * - 多行台词通过点击"继续"逐行推进
 * - 全部台词读完后调 onComplete
 *
 * Props:
 *   speaker: 说话人名（i18n 通过 t()）
 *   emoji:   左侧头像 emoji
 *   lines:   台词数组（每条可包含 \n）
 *   onComplete: 全部台词读完后回调
 */
export default function TutorialBottomDialog({ speaker, emoji, lines, onComplete }) {
    const { t } = useLanguage();
    const [lineIdx, setLineIdx] = useState(0);

    // 切换 lines 内容（step 切换时）→ 重置进度
    useEffect(() => {
        setLineIdx(0);
    }, [lines]);

    if (!lines || lines.length === 0) return null;

    const isLast = lineIdx >= lines.length - 1;

    const next = () => {
        if (isLast) onComplete?.();
        else setLineIdx(i => i + 1);
    };

    return (
        <div className="fixed bottom-4 inset-x-4 z-[150] pointer-events-none">
            <div
                className="bg-kitchen-card/95 border-2 border-kitchen-gold-border rounded-lg shadow-xl p-4 flex items-start gap-4 max-w-3xl mx-auto pointer-events-auto"
            >
                <div className="text-5xl flex-shrink-0 leading-none">{emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-kitchen-gold-deep mb-1">{t(speaker)}</div>
                    <div className="text-base text-kitchen-text-body whitespace-pre-wrap leading-relaxed">{t(lines[lineIdx])}</div>
                </div>
                <button
                    onClick={next}
                    className="flex-shrink-0 px-3 py-1 rounded bg-kitchen-wood-light border border-kitchen-wood-border text-kitchen-text-title hover:brightness-105 text-sm font-bold self-end"
                >
                    {isLast ? t('继续') : '▶'}
                </button>
            </div>
        </div>
    );
}
