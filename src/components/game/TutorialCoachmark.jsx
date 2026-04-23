import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 引导箭头 + 高亮框：通过 querySelectorAll 定位 1..N 个目标 DOM 元素，
 * 在每个目标周围绘制一个金色 pulse 框；label 显示在第一个框上方。
 *
 * Props:
 *   targetSelector: CSS 选择器（支持逗号分隔多目标，如 "[data-tutorial=row-1], [data-tutorial=col-1]"）
 *   label:          顶部标签文字（可选）
 *
 * 实装：每 200ms 重测目标位置（应对 layout 变化）。pointer-events: none，不影响交互。
 */
export default function TutorialCoachmark({ targetSelector, label }) {
    const { t } = useLanguage();
    const [rects, setRects] = useState([]);

    useEffect(() => {
        if (!targetSelector) return;
        const update = () => {
            const els = document.querySelectorAll(targetSelector);
            const next = Array.from(els).map(el => {
                const r = el.getBoundingClientRect();
                return { top: r.top, left: r.left, width: r.width, height: r.height };
            });
            setRects(next);
        };
        update();
        window.addEventListener('resize', update);
        const interval = setInterval(update, 200);
        return () => {
            window.removeEventListener('resize', update);
            clearInterval(interval);
        };
    }, [targetSelector]);

    if (rects.length === 0) return null;

    return (
        <>
            {rects.map((rect, i) => (
                <div
                    key={i}
                    className="fixed pointer-events-none z-[180]"
                    style={{
                        top: rect.top - 8,
                        left: rect.left - 8,
                        width: rect.width + 16,
                        height: rect.height + 16,
                    }}
                >
                    <div className="absolute inset-0 border-4 border-kitchen-gold rounded-lg animate-pulse shadow-[0_0_16px_rgba(232,168,48,0.6)]" />
                    {label && i === 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-kitchen-gold text-kitchen-text-title text-sm font-bold px-3 py-1 rounded shadow-lg whitespace-pre text-center leading-snug">
                            {t(label)}
                        </div>
                    )}
                </div>
            ))}
        </>
    );
}
