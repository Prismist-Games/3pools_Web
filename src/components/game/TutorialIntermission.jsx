import React, { useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 全屏黑过场：用于"【半小时后】"等时间过场。
 * 自动 autoAdvanceMs 后触发 onComplete。
 */
export default function TutorialIntermission({ text, autoAdvanceMs = 1800, onComplete }) {
    const { t } = useLanguage();
    useEffect(() => {
        const timer = setTimeout(() => onComplete?.(), autoAdvanceMs);
        return () => clearTimeout(timer);
    }, [autoAdvanceMs, onComplete]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
            <div className="text-3xl font-black text-white tracking-widest opacity-90">{t(text)}</div>
        </div>
    );
}
