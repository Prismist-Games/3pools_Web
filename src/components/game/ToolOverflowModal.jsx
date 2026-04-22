import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

/** Overflow modal — shown when a tool grant arrives while the toolbar is
 *  already at capacity. Player must either replace one of the current tools
 *  or discard the incoming one. Blocks interaction behind the modal until
 *  a choice is made. */
const ToolOverflowModal = ({ tools, pendingTool, onReplace, onDiscard }) => {
    const { t, language } = useLanguage();
    if (!pendingTool) return null;

    const toolName = (tool) => (language === 'en' && tool.nameEn) ? tool.nameEn : t(tool.name);
    const toolDesc = (tool) => (language === 'en' && tool.descEn) ? tool.descEn : t(tool.desc);

    return createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
            <div className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold-border rounded-2xl shadow-2xl max-w-md w-full p-5">
                <h3 className="text-base font-black text-kitchen-gold-deep mb-1 text-center">
                    🧰 {t('获得新道具')}
                </h3>
                <p className="text-xs text-kitchen-text-secondary mb-3 text-center">
                    {t('道具栏已满,请选择替换现有道具,或放弃新道具')}
                </p>

                {/* Incoming tool card */}
                <div className="bg-white border-2 border-amber-500 rounded-lg p-3 mb-4 shadow-[0_0_10px_rgba(232,168,48,0.3)]">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{pendingTool.icon}</span>
                        <div className="flex-1">
                            <div className="text-sm font-black">{toolName(pendingTool)}</div>
                            <div className="text-[11px] text-kitchen-text-muted leading-snug">
                                {toolDesc(pendingTool)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-xs font-bold mb-2 text-kitchen-text-body text-center">
                    {t('替换以下道具之一:')}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {tools.map((tool, i) => (
                        <button
                            key={tool.uid}
                            onClick={() => onReplace(i)}
                            className="bg-white border-2 border-red-300 rounded-lg p-2 hover:border-red-500 hover:bg-red-50 transition-colors text-center"
                        >
                            <div className="text-2xl">{tool.icon}</div>
                            <div className="text-[10px] font-bold mt-1 leading-tight">{toolName(tool)}</div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={onDiscard}
                    className="w-full py-2 bg-gray-100 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                    {t('放弃新道具')}
                </button>
            </div>
        </div>,
        document.body
    );
};

export default ToolOverflowModal;
