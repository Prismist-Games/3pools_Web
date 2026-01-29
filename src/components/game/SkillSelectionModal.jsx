import React, { useState } from 'react';
import { Eye, Sparkles, Zap, Check, Trash2, Info, ArrowRight } from 'lucide-react';
import { SKILL_DEFINITIONS } from '../../data/constants';
import { useLanguage } from '../../contexts/LanguageContext';

export const SkillSelectionModal = ({ candidates, onSelect, currentSkills, onReplace }) => {
    const { t } = useLanguage();
    const isReplacing = currentSkills && currentSkills.length >= 3;
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [targetOldSkillId, setTargetOldSkillId] = useState(null);
    const [isPeeking, setIsPeeking] = useState(false); // 偷看状态

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center transition-colors duration-200 ${isPeeking ? 'bg-transparent' : 'bg-black/80 backdrop-blur-md'}`}>
            {/* 偷看按钮 - 始终可见 */}
            <button
                className="absolute top-4 right-4 z-[210] bg-white text-slate-800 p-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer ring-2 ring-slate-200"
                onMouseDown={() => setIsPeeking(true)}
                onMouseUp={() => setIsPeeking(false)}
                onMouseLeave={() => setIsPeeking(false)}
                onTouchStart={() => setIsPeeking(true)}
                onTouchEnd={() => setIsPeeking(false)}
                title={t("按住查看底部内容")}
            >
                <Eye size={20} />
                <span className="hidden md:inline">{t("按住查看")}</span>
            </button>

            {/* 弹窗主体 - 偷看时隐藏 */}
            <div className={`w-full max-w-5xl p-6 lg:p-8 flex flex-col items-center h-[90vh] overflow-y-auto transition-opacity duration-200 ${isPeeking ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <h2 className="text-3xl font-black text-white mb-2 tracking-wider uppercase">
                    {isReplacing ? t("技能槽已满！") : t("选择一个技能")}
                </h2>
                <p className="text-slate-300 mb-8 font-bold text-center">
                    {isReplacing ? t("请分别选择一个【新技能】和一个【旧技能】进行替换") : t("主线任务奖励")}
                </p>

                <div className="flex flex-col gap-8 w-full">
                    {/* 新技能候选区 */}
                    <div className="w-full">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles size={16} /> {t("新技能候选 (点击选择)")}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {candidates.map((skill) => {
                                // Safe render for Icon
                                const SkillIcon = skill.Icon || Zap;
                                return (
                                    <button
                                        key={skill.id}
                                        onClick={() => {
                                            if (!isReplacing) onSelect(skill);
                                            else setSelectedCandidate(skill);
                                        }}
                                        className={`
                                        bg-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 relative group
                                        ${!isReplacing ? 'hover:scale-105 hover:shadow-2xl cursor-pointer' : ''}
                                        ${isReplacing && selectedCandidate?.id === skill.id ? 'ring-4 ring-green-500 scale-105 shadow-xl bg-green-50' : 'opacity-90 hover:opacity-100'}
                                    `}
                                    >
                                        {isReplacing && selectedCandidate?.id === skill.id && (
                                            <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full font-black text-xs shadow-lg z-10 flex items-center gap-1">
                                                <Check size={12} /> {t("学习")}
                                            </div>
                                        )}
                                        <div className={`w-14 h-14 rounded-full ${skill.color} flex items-center justify-center shadow-inner`}>
                                            <SkillIcon size={28} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold text-slate-800">{t(skill.name)}</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed mt-1">{t(skill.desc)}</p>
                                        </div>
                                        {!isReplacing && <span className="mt-2 text-xs font-bold text-blue-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">{t("点击获取")}</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 旧技能区 (替换模式下为可交互，非替换模式下为只读展示) */}
                    <div className="w-full p-6 rounded-3xl bg-slate-800/50 border border-slate-700">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            {isReplacing ? <><Trash2 size={16} /> {t("选择要遗忘的旧技能")}</> : <><Info size={16} /> {t("当前已拥有技能")}</>}
                        </div>

                        {currentSkills.length === 0 ? (
                            <div className="text-slate-500 italic text-center py-4">{t("暂无技能")}</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {currentSkills.map(skillId => {
                                    const skill = SKILL_DEFINITIONS.find(s => s.id === skillId);
                                    const SkillIcon = skill?.Icon || Zap;
                                    return (
                                        <button
                                            key={skill?.id || Math.random()}
                                            onClick={() => isReplacing && setTargetOldSkillId(skill?.id)}
                                            disabled={!isReplacing}
                                            className={`
                                                flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all relative
                                                ${isReplacing
                                                    ? (targetOldSkillId === skill?.id
                                                        ? 'bg-red-500/20 border-red-500 text-white ring-2 ring-red-500 shadow-lg scale-105 cursor-pointer'
                                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 cursor-pointer')
                                                    : 'bg-slate-700/50 border-slate-600 text-slate-400 cursor-default opacity-80' // 只读样式
                                                }
                                            `}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${skill?.color || 'bg-slate-500'} bg-opacity-90 shadow-sm`}>
                                                <SkillIcon size={24} />
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold">{t(skill?.name) || t('未知技能')}</div>
                                                <div className="text-[10px] opacity-70 mt-1">{t(skill?.desc)}</div>
                                            </div>
                                            {isReplacing && targetOldSkillId === skill?.id && (
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 rounded-full font-bold text-[10px] shadow-sm">
                                                    {t("遗忘")}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 操作栏 */}
                <div className="mt-8 flex gap-4 w-full justify-center">
                    <button
                        onClick={() => onSelect(null)}
                        className="px-8 py-3 rounded-full border-2 border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white transition-all font-bold uppercase tracking-wider"
                    >
                        {t("放弃新技能")}
                    </button>

                    {isReplacing && (
                        <button
                            disabled={!selectedCandidate || !targetOldSkillId}
                            onClick={() => onReplace(targetOldSkillId, selectedCandidate)}
                            className={`
                                px-8 py-3 rounded-full font-black text-lg shadow-xl flex items-center gap-2 transition-all
                                ${selectedCandidate && targetOldSkillId
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 hover:shadow-green-500/50'
                                    : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                }
                            `}
                        >
                            <span>{t("确认替换")}</span>
                            {selectedCandidate && targetOldSkillId && <ArrowRight size={20} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
