import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

/** Tool grant popup — shown whenever one or more tools arrive into the
 *  toolbar. Batches synchronously-granted tools (e.g., the 3 received at
 *  day start) into a single confirm-to-dismiss dialog. */
const ToolGrantPopup = ({ tools, onConfirm }) => {
    const { t, language } = useLanguage();
    if (!tools || tools.length === 0) return null;

    const toolName = (tool) => (language === 'en' && tool.nameEn) ? tool.nameEn : t(tool.name);
    const toolDesc = (tool) => (language === 'en' && tool.descEn) ? tool.descEn : t(tool.desc);

    return createPortal(
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[900] p-4">
            <div className="bg-gradient-to-b from-kitchen-card to-[#FFF3E0] border-2 border-kitchen-gold-border rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-base font-black text-kitchen-gold-deep mb-1 text-center">
                    🧰 {tools.length > 1
                        ? (language === 'en' ? `Obtained ${tools.length} tools` : `获得 ${tools.length} 件道具`)
                        : t('获得新道具')}
                </h3>
                <p className="text-xs text-kitchen-text-secondary mb-3 text-center">
                    {language === 'en' ? 'Ready in your toolbar.' : '已进入你的道具栏'}
                </p>

                <div className="flex flex-col gap-2 mb-4 max-h-[50vh] overflow-y-auto">
                    {tools.map((tool, i) => (
                        <div
                            key={tool.uid || i}
                            className="bg-white border-2 border-amber-300 rounded-lg p-3 flex items-center gap-3 shadow-sm"
                        >
                            <span className="text-4xl leading-none flex-shrink-0">{tool.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-black text-kitchen-text-body">{toolName(tool)}</div>
                                <div className="text-[11px] text-kitchen-text-muted leading-snug">
                                    {toolDesc(tool)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onConfirm}
                    className="w-full py-2 bg-kitchen-gold border-2 border-kitchen-gold-border text-white font-black rounded-lg hover:brightness-95 transition-colors text-sm"
                >
                    {t('确认')}
                </button>
            </div>
        </div>,
        document.body
    );
};

export default ToolGrantPopup;
