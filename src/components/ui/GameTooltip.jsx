import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Portal-based tooltip matching the CellTooltip style:
 * dark bg, amber title, arrow, hover triggered.
 *
 * Usage:
 *   <GameTooltip text="描述文字">
 *     <button>按钮</button>
 *   </GameTooltip>
 *
 *   <GameTooltip title="标题" text="描述文字">
 *     <button>按钮</button>
 *   </GameTooltip>
 */
const GameTooltip = ({ children, title, text, icon, tags }) => {
    const { t } = useLanguage();
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        if (!visible || !ref.current) { setPos(null); return; }
        const rect = ref.current.getBoundingClientRect();
        setPos({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, [visible]);

    return (
        <>
            <span
                ref={ref}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                className="inline-flex"
            >
                {children}
            </span>
            {visible && pos && createPortal(
                <div
                    style={{
                        position: 'absolute',
                        top: pos.top,
                        left: pos.left,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 99999,
                        pointerEvents: 'none',
                    }}
                    className="animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl border border-amber-400/30 min-w-[160px] max-w-[260px]">
                        {(title || icon) && (
                            <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700 pb-1.5">
                                {icon && <span className="text-lg">{icon}</span>}
                                {title && <span className="font-black text-amber-300 text-sm">{title}</span>}
                            </div>
                        )}
                        {text && <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>}
                        {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {tags.map(tag => (
                                    <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
                                        {t(tag)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900" />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default GameTooltip;
