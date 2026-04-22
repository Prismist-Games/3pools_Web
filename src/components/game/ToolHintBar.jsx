import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TOOLS } from '../../data/v2Config';

/** Hint bar shown while a tool is active. Tells the player what to click
 *  next. For stateful tools (swap), updates mid-use. */
const HINT_ZH = {
    peek: '点击一行或一列的按钮',
    swap: '点击第一格',
    swap_stage2: '点击第二格进行交换',
    disperse: '点击墙上任意 1 格丢弃其内容',
    bomb_wall: '点击墙上任意 1 格作为爆炸中心',
    clear_inventory: '点击菜篮里 1 格食材丢弃换抽数',
};

const HINT_EN = {
    peek: 'Click a row or column button',
    swap: 'Click the first cell',
    swap_stage2: 'Click the second cell to swap',
    disperse: 'Click any cell on the wall to discard its contents',
    bomb_wall: 'Click any cell as the blast center',
    clear_inventory: 'Click a basket item to trade for a draw',
};

const ToolHintBar = ({ activeTool, onCancel }) => {
    const { t, language } = useLanguage();
    if (!activeTool) return null;

    const tool = TOOLS.find(x => x.id === activeTool.id);
    if (!tool) return null;

    const toolName = (language === 'en' && tool.nameEn) ? tool.nameEn : t(tool.name);

    let hintKey = activeTool.id;
    if (activeTool.id === 'swap' && activeTool.selections?.length >= 1) {
        hintKey = 'swap_stage2';
    }
    const hint = (language === 'en' ? HINT_EN : HINT_ZH)[hintKey] || '';

    return (
        <div className="bg-gradient-to-r from-amber-100 to-yellow-50 border-2 border-amber-400 rounded-xl px-4 py-2 shadow-md flex items-center gap-3 w-full max-w-xl mx-auto">
            <span className="text-2xl leading-none">{tool.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-amber-800 leading-tight">
                    {language === 'en' ? 'Using' : '使用'} · {toolName}
                </div>
                <div className="text-[11px] text-amber-700 leading-tight truncate">{hint}</div>
            </div>
            <button
                onClick={onCancel}
                className="px-3 py-1 bg-white border-2 border-amber-400 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50 transition-colors flex-shrink-0"
            >
                {t('取消')}
            </button>
        </div>
    );
};

export default ToolHintBar;
