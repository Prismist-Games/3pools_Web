import React, { useEffect, useState } from 'react';

/**
 * 引导箭头 + 高亮框：通过 querySelector 定位目标 DOM 元素，
 * 在其周围绘制一个金色 pulse 框 + 顶部 label。
 *
 * Props:
 *   targetSelector: CSS 选择器
 *   label:          顶部标签文字（可选）
 *
 * 实装：每 200ms 重测目标位置（应对 layout 变化）。pointer-events: none，不影响交互。
 */
export default function TutorialCoachmark({ targetSelector, label }) {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        if (!targetSelector) return;
        const update = () => {
            const el = document.querySelector(targetSelector);
            if (el) {
                const r = el.getBoundingClientRect();
                setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
            } else {
                setRect(null);
            }
        };
        update();
        window.addEventListener('resize', update);
        const interval = setInterval(update, 200);
        return () => {
            window.removeEventListener('resize', update);
            clearInterval(interval);
        };
    }, [targetSelector]);

    if (!rect) return null;

    return (
        <div
            className="fixed pointer-events-none z-[180]"
            style={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
            }}
        >
            <div className="absolute inset-0 border-4 border-kitchen-gold rounded-lg animate-pulse shadow-[0_0_16px_rgba(232,168,48,0.6)]" />
            {label && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-kitchen-gold text-kitchen-text-title text-sm font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap">
                    {label}
                </div>
            )}
        </div>
    );
}
