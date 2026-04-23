import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/** Fixed-capacity toolbar showing the player's tools. Click a slot to start
 *  using that tool. Duplicates are allowed (same tool id can appear in
 *  multiple slots). Empty slots are shown as dashed placeholders. */
const Toolbar = ({ tools, capacity, activeTool, onUseTool, enabled }) => {
    const { t, language } = useLanguage();

    const slots = [];
    for (let i = 0; i < capacity; i++) {
        slots.push(tools[i] || null);
    }

    return (
        <div className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold-border rounded-xl p-2 shadow-[0_3px_0_#D4B896] w-fit mx-auto">
            <div className="text-[10px] font-bold text-kitchen-text-secondary mb-1 text-center tracking-wider">
                🧰 {t('道具栏')}
            </div>
            <div className="flex gap-2">
                {slots.map((tool, i) => {
                    if (!tool) {
                        return (
                            <div
                                key={`empty-${i}`}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-kitchen-gold-border-muted/60 bg-[#F8F4EC]/40 flex items-center justify-center text-kitchen-text-muted text-[10px]"
                            >
                                —
                            </div>
                        );
                    }
                    const isActive = activeTool?.uid === tool.uid;
                    const otherActive = activeTool && !isActive;
                    const displayName = language === 'en' && tool.nameEn ? tool.nameEn : t(tool.name);
                    const displayDesc = language === 'en' && tool.descEn ? tool.descEn : t(tool.desc);
                    const disabled = !enabled || otherActive;
                    return (
                        <button
                            key={tool.uid}
                            data-tutorial={tool.id ? `tool-${tool.id}` : undefined}
                            onClick={() => onUseTool(tool.uid)}
                            disabled={disabled && !isActive}
                            title={displayDesc}
                            className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                isActive
                                    ? 'bg-amber-100 border-amber-500 shadow-[0_0_12px_rgba(232,168,48,0.6)] scale-105 ring-2 ring-amber-400'
                                    : disabled
                                    ? 'bg-white border-kitchen-gold-border-muted opacity-55 cursor-not-allowed'
                                    : 'bg-white border-kitchen-gold-border hover:border-kitchen-gold hover:scale-105 hover:shadow-md cursor-pointer'
                            }`}
                        >
                            <span className="text-2xl leading-none">{tool.icon}</span>
                            <span className="text-[10px] font-bold mt-1 text-center px-0.5 leading-tight">
                                {displayName}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Toolbar;
