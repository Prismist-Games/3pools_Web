import React, { useEffect, useState } from 'react';

/**
 * Brief black-screen + static noise + channel-switch transition.
 * Shows for ~0.8s when `trigger` changes to a new value.
 * Displays the round/expedition label during the flash.
 */
const RoundTransition = ({ trigger, label }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!trigger) return;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 800);
        return () => clearTimeout(timer);
    }, [trigger]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center"
            style={{
                background: '#1A1A1A',
                animation: 'crt-transition-in 0.8s ease-out forwards',
            }}
        >
            {/* Static noise overlay */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)',
                    animation: 'static-noise 0.15s steps(5) infinite',
                }}
            />
            {/* Red scanline hint */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,100,80,0.05) 3px, rgba(255,100,80,0.05) 4px)',
                }}
            />
            {/* Label */}
            <div
                className="relative z-10 text-center"
                style={{
                    color: '#E8C878',
                    textShadow: '0 0 20px rgba(232,200,120,0.5)',
                }}
            >
                <div className="text-xs font-mono text-[#888] mb-2 tracking-widest">— 信号切换 —</div>
                <div className="text-4xl font-black tracking-wide">{label}</div>
            </div>
        </div>
    );
};

export default RoundTransition;
