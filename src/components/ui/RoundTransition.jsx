import React, { useEffect, useState } from 'react';

/**
 * Black-screen CRT "signal switch" overlay shown at the start of each turn.
 * Displays the upcoming wall's modifier (or hand-crafted level) info and
 * requires a click to dismiss — giving the player a beat to register the
 * incoming modifier before drawing begins.
 *
 * Props:
 *   reveal    — { icon, name, desc, subtitle? } or null (null = hidden)
 *   onDismiss — called after the fade-out animation finishes
 */
const RoundTransition = ({ reveal, onDismiss }) => {
    const [dismissing, setDismissing] = useState(false);

    // Reset dismissing state when a new reveal arrives
    useEffect(() => {
        if (reveal) setDismissing(false);
    }, [reveal]);

    if (!reveal) return null;

    const handleClick = () => {
        if (dismissing) return;
        setDismissing(true);
        setTimeout(() => onDismiss?.(), 350);
    };

    return (
        <div
            onClick={handleClick}
            className="fixed inset-0 z-[300] flex items-center justify-center cursor-pointer select-none"
            style={{
                background: '#1A1A1A',
                animation: dismissing
                    ? 'crt-transition-out 0.35s ease-in forwards'
                    : 'crt-transition-in 0.5s ease-out forwards',
            }}
        >
            {/* Static noise overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
                    animation: 'static-noise 0.15s steps(5) infinite',
                }}
            />
            {/* Red scanline hint */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,100,80,0.05) 3px, rgba(255,100,80,0.05) 4px)',
                }}
            />

            {/* Reveal content */}
            <div
                className="relative z-10 text-center max-w-md px-8 pointer-events-none"
                style={{
                    color: '#E8C878',
                    textShadow: '0 0 20px rgba(232,200,120,0.5)',
                }}
            >
                <div className="text-xs font-mono text-[#888] mb-4 tracking-widest">— 信号切换 —</div>
                {reveal.subtitle && (
                    <div className="text-xs font-mono text-[#AAA] mb-2 tracking-wide">{reveal.subtitle}</div>
                )}
                <div className="text-6xl mb-3 leading-none">{reveal.icon}</div>
                <div className="text-3xl font-black tracking-wide mb-4">{reveal.name}</div>
                {reveal.desc && (
                    <p
                        className="text-sm leading-relaxed px-4 py-3 rounded-md"
                        style={{
                            color: '#E8DCC0',
                            background: 'rgba(232,200,120,0.06)',
                            border: '1px solid rgba(232,200,120,0.2)',
                            textShadow: 'none',
                        }}
                    >
                        {reveal.desc}
                    </p>
                )}
                <div
                    className="text-[11px] font-mono text-[#888] mt-6 tracking-widest animate-pulse"
                    style={{ textShadow: 'none' }}
                >
                    ▸ 点击继续 ◂
                </div>
            </div>
        </div>
    );
};

export default RoundTransition;
