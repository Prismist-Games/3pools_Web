import React, { useState } from 'react';
import { Settings, Download, Upload, RotateCcw, X, Coins, Ticket, Flag, Power, ChevronsUp, Check } from 'lucide-react';
import GameCore from './GameCore';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { INITIAL_GAME_CONFIG, SKILL_DEFINITIONS } from './data/constants';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
    const [config, setConfig] = useState(INITIAL_GAME_CONFIG);
    const [gameId, setGameId] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [defaultResetConfirmOpen, setDefaultResetConfirmOpen] = useState(false);

    // Dev tools state
    const [devSkillsSelected, setDevSkillsSelected] = useState([]);
    const [initialSkills, setInitialSkills] = useState([]);
    const [initialStage, setInitialStage] = useState(0);

    const handleHardReset = () => {
        setGameId(prev => prev + 1);
        setInitialSkills([]); // Reset skills too
        setResetConfirmOpen(false);
    };

    const handleResetDefaults = () => {
        setConfig(INITIAL_GAME_CONFIG);
        setDefaultResetConfirmOpen(false);
    };

    const handleExportConfig = () => {
        const dataStr = JSON.stringify(config, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `order-game-config-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedConfig = JSON.parse(event.target.result);
                if (importedConfig.rarity && importedConfig.pools && importedConfig.global && importedConfig.affixes) {
                    setConfig(importedConfig);
                }
            } catch (err) {
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    return (
        <>
            <LanguageProvider>
                <ErrorBoundary>
                    <GameCore
                        key={gameId}
                        config={config}
                        initialSkills={initialSkills}
                        initialProgress={initialStage}
                        onOpenSettings={() => setShowSettings(true)}
                        onReset={() => setResetConfirmOpen(true)}
                    />
                </ErrorBoundary>
            </LanguageProvider>

            {resetConfirmOpen && (
                <ConfirmDialog
                    title="重新开始游戏？"
                    message="确定要重新开始游戏吗？当前进度（金币、背包、技能）将丢失。"
                    onConfirm={handleHardReset}
                    onCancel={() => setResetConfirmOpen(false)}
                />
            )}

            {defaultResetConfirmOpen && (
                <ConfirmDialog
                    title="恢复默认配置？"
                    message="确定要将所有配置参数恢复为默认值吗？此操作不可撤销。"
                    onConfirm={handleResetDefaults}
                    onCancel={() => setDefaultResetConfirmOpen(false)}
                />
            )}

            {showSettings && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black flex items-center gap-2 text-slate-700">
                                <Settings size={24} /> 游戏配置 & 开发者工具
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* 1. 道具掉落概率配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-emerald-500 pl-3">道具掉落概率配置 (Props Drop Rate)</h4>
                                <div className="text-xs text-slate-500 mb-2">决定每次抽奖或刷新出物品时的品质分布。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">阶段名称</th>
                                                <th className="p-2 text-center w-20">普通</th>
                                                <th className="p-2 text-center w-20">优秀</th>
                                                <th className="p-2 text-center w-20">稀有</th>
                                                <th className="p-2 text-center w-20">史诗</th>
                                                <th className="p-2 text-center w-20">传说</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.stages.map((stage, sIdx) => (
                                                <tr key={stage.id} className="border-b hover:bg-slate-50">
                                                    <td className="p-2 font-bold">
                                                        <div className="flex flex-col">
                                                            <span>{stage.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">{stage.desc}</span>
                                                        </div>
                                                    </td>
                                                    {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rKey => (
                                                        <td key={rKey} className="p-2 text-center">
                                                            <input
                                                                type="number"
                                                                step="0.05"
                                                                min="0" max="1"
                                                                className={`w-16 p-1 border rounded text-center font-mono ${stage.rarityWeights[rKey] > 0 ? 'bg-white font-bold' : 'bg-slate-50 text-slate-400'}`}
                                                                value={stage.rarityWeights[rKey]}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) return;
                                                                    const newStages = [...config.stages];
                                                                    newStages[sIdx] = {
                                                                        ...newStages[sIdx],
                                                                        rarityWeights: {
                                                                            ...newStages[sIdx].rarityWeights,
                                                                            [rKey]: val
                                                                        }
                                                                    };
                                                                    setConfig({ ...config, stages: newStages });
                                                                }}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 2. 订单需求概率配置 (新增) */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-blue-500 pl-3">订单需求概率配置 (Order Requirement Rates)</h4>
                                <div className="text-xs text-slate-500 mb-2">决定新生成订单时，所需的物品品质分布。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">阶段名称</th>
                                                <th className="p-2 text-center w-20">普通</th>
                                                <th className="p-2 text-center w-20">优秀</th>
                                                <th className="p-2 text-center w-20">稀有</th>
                                                <th className="p-2 text-center w-20">史诗</th>
                                                <th className="p-2 text-center w-20">传说</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.stages.map((stage, sIdx) => {
                                                // 兼容性处理：如果 orderRarityWeights 不存在，使用 rarityWeights
                                                const weights = stage.orderRarityWeights || stage.rarityWeights;
                                                return (
                                                    <tr key={stage.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-2 font-bold">{sIdx + 1}. {stage.name}</td>
                                                        {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rKey => (
                                                            <td key={rKey} className="p-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    step="0.05"
                                                                    min="0" max="1"
                                                                    className={`w-16 p-1 border rounded text-center font-mono ${weights[rKey] > 0 ? 'bg-white font-bold' : 'bg-slate-50 text-slate-400'}`}
                                                                    value={weights[rKey]}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        if (isNaN(val)) return;
                                                                        const newStages = [...config.stages];
                                                                        // 确保对象存在
                                                                        const currentOrderWeights = newStages[sIdx].orderRarityWeights || { ...newStages[sIdx].rarityWeights };
                                                                        newStages[sIdx] = {
                                                                            ...newStages[sIdx],
                                                                            orderRarityWeights: {
                                                                                ...currentOrderWeights,
                                                                                [rKey]: val
                                                                            }
                                                                        };
                                                                        setConfig({ ...config, stages: newStages });
                                                                    }}
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 2.5 Stage Basic Config (Gold, Entropy, Mainline) */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-pink-500 pl-3">阶段基础配置 (Basic Config)</h4>
                                <div className="text-xs text-slate-500 mb-2">配置阶段初始金币、熵增腐烂周期（仅在熵增模式生效）、主线需求参数。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">阶段名称</th>
                                                <th className="p-2 text-left w-24">初始金币</th>
                                                <th className="p-2 text-left w-24">腐烂周期 (Entropy)</th>
                                                <th className="p-2 text-left w-24">主线需求数量</th>
                                                <th className="p-2 text-left w-32">主线需求品质</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.stages.map((stage, sIdx) => {
                                                return (
                                                    <tr key={stage.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-2 font-bold">{stage.name}</td>
                                                        {/* Initial Gold */}
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                className="w-20 p-1 border rounded text-center font-mono bg-white font-bold text-yellow-700"
                                                                value={stage.initialGold}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const newStages = [...config.stages];
                                                                    newStages[sIdx] = { ...newStages[sIdx], initialGold: val };
                                                                    setConfig({ ...config, stages: newStages });
                                                                }}
                                                            />
                                                        </td>
                                                        {/* Entropy Decay */}
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                disabled={!stage.mechanics.entropy}
                                                                className={`w-20 p-1 border rounded text-center font-mono ${stage.mechanics.entropy ? 'bg-white font-bold text-slate-700' : 'bg-slate-50 text-slate-300'}`}
                                                                value={stage.entropyDecayValue || 40}
                                                                placeholder="N/A"
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const newStages = [...config.stages];
                                                                    newStages[sIdx] = { ...newStages[sIdx], entropyDecayValue: val };
                                                                    setConfig({ ...config, stages: newStages });
                                                                }}
                                                            />
                                                        </td>
                                                        {/* Mainline Req Count */}
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                min="1" max="5"
                                                                className="w-20 p-1 border rounded text-center font-mono bg-white font-bold text-slate-700"
                                                                value={stage.mainlineReqCount || 2}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 1;
                                                                    const newStages = [...config.stages];
                                                                    newStages[sIdx] = { ...newStages[sIdx], mainlineReqCount: val };
                                                                    setConfig({ ...config, stages: newStages });
                                                                }}
                                                            />
                                                        </td>
                                                        {/* Mainline Req Rarity */}
                                                        <td className="p-2">
                                                            <select
                                                                className="w-28 p-1 border rounded text-xs font-bold"
                                                                value={stage.mainlineReqRarity || 'epic'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const newStages = [...config.stages];
                                                                    newStages[sIdx] = { ...newStages[sIdx], mainlineReqRarity: val };
                                                                    setConfig({ ...config, stages: newStages });
                                                                }}
                                                            >
                                                                {config.rarity.map(r => (
                                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-cyan-500 pl-3">订单数量与奖励配置 (Order Count & Rewards)</h4>
                                <div className="text-xs text-slate-500 mb-2">配置订单物品数量的权重，以及对应的基础金币奖励。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">阶段名称</th>
                                                <th className="p-2 text-center w-32">2个物品 (权重 / 奖励)</th>
                                                <th className="p-2 text-center w-32">3个物品 (权重 / 奖励)</th>
                                                <th className="p-2 text-center w-32">4个物品 (权重 / 奖励)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.stages.map((stage, sIdx) => {
                                                const counts = [2, 3, 4];
                                                // Fallback if baseRewards missing (old config)
                                                const rewards = stage.baseRewards || { 2: 7, 3: 10, 4: 15 };

                                                return (
                                                    <tr key={stage.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-2 font-bold">{stage.name}</td>
                                                        {counts.map(count => (
                                                            <td key={count} className="p-2 text-center">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-[10px] text-slate-400">权重%</span>
                                                                        <input
                                                                            type="number"
                                                                            className={`w-12 p-1 border rounded text-center font-mono ${stage.orderCountWeights?.[count] > 0 ? 'bg-white font-bold' : 'bg-slate-50 text-slate-400'}`}
                                                                            value={stage.orderCountWeights?.[count] || 0}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                const newStages = [...config.stages];
                                                                                const currentWeights = newStages[sIdx].orderCountWeights || { 2: 0, 3: 0, 4: 0 };
                                                                                newStages[sIdx] = {
                                                                                    ...newStages[sIdx],
                                                                                    orderCountWeights: {
                                                                                        ...currentWeights,
                                                                                        [count]: val
                                                                                    }
                                                                                };
                                                                                setConfig({ ...config, stages: newStages });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-[10px] text-yellow-600 font-bold">金币</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-12 p-1 border border-yellow-200 bg-yellow-50 rounded text-center font-mono text-yellow-700 font-bold"
                                                                            value={rewards[count] || 0}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                const newStages = [...config.stages];
                                                                                const currentRewards = newStages[sIdx].baseRewards || { 2: 7, 3: 10, 4: 15 };
                                                                                newStages[sIdx] = {
                                                                                    ...newStages[sIdx],
                                                                                    baseRewards: {
                                                                                        ...currentRewards,
                                                                                        [count]: val
                                                                                    }
                                                                                };
                                                                                setConfig({ ...config, stages: newStages });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 技能配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-indigo-500 pl-3">技能配置 (勾选以启用掉落)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {SKILL_DEFINITIONS.map(skill => (
                                        <label key={skill.id} className="flex items-start gap-2 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.enabledSkillIds?.includes(skill.id)}
                                                onChange={(e) => {
                                                    const current = config.enabledSkillIds || [];
                                                    let next;
                                                    if (e.target.checked) next = [...current, skill.id];
                                                    else next = current.filter(id => id !== skill.id);
                                                    setConfig({ ...config, enabledSkillIds: next });
                                                }}
                                                className="mt-1"
                                            />
                                            <div className="text-sm">
                                                <div className="font-bold flex items-center gap-1"><skill.Icon size={14} /> {skill.name}</div>
                                                <div className="text-xs text-slate-500">{skill.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* 开发者工具：直接添加技能 (新版多选) */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-red-500 pl-3">开发者工具: 直接获取技能 (实时生效)</h4>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                                        {SKILL_DEFINITIONS.map(s => {
                                            const isSelected = devSkillsSelected.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        setDevSkillsSelected(prev =>
                                                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                                        );
                                                    }}
                                                    className={`
                                            text-xs p-2 rounded border flex items-center gap-2 transition-all
                                            ${isSelected ? 'bg-red-100 border-red-400 text-red-800 ring-1 ring-red-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-white'}
                                        `}
                                                >
                                                    <s.Icon size={14} />
                                                    <span className="font-bold truncate">{s.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (devSkillsSelected.length > 0) {
                                                    setInitialSkills(devSkillsSelected); // 直接覆盖模式
                                                    setDevSkillsSelected([]);
                                                }
                                            }}
                                            disabled={devSkillsSelected.length === 0}
                                            className={`
                                    px-4 py-2 rounded-lg font-bold text-sm shadow transition-all
                                    ${devSkillsSelected.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                                `}
                                        >
                                            覆盖当前所有技能 ({devSkillsSelected.length}) - 不重启
                                        </button>
                                        <button
                                            onClick={() => setDevSkillsSelected([])}
                                            className="px-3 py-2 text-slate-500 hover:text-slate-800 text-sm underline"
                                        >
                                            清空选择
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDevSkillsSelected([]);
                                                setInitialSkills([]);
                                                setInitialStage(0);
                                                handleHardReset();
                                            }}
                                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2"
                                        >
                                            <RotateCcw size={14} /> Reset Dev State
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Dev Tool: Stage Selector */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-orange-500 pl-3">开发者工具: 初始时代设置 (需重开游戏)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {config.stages.map((stage, idx) => (
                                        <button
                                            key={stage.id}
                                            onClick={() => {
                                                setInitialStage(idx);
                                                handleHardReset();
                                            }}
                                            className={`
                                                px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all flex flex-col items-center min-w-[100px]
                                                ${initialStage === idx ? 'bg-orange-100 border-orange-500 text-orange-800 ring-2 ring-orange-300' : 'bg-white border-slate-200 hover:border-orange-200'}
                                            `}
                                        >
                                            <span>Stage {stage.id}</span>
                                            <span className="text-xs opacity-75">{stage.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* 词缀设置 (恢复) */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-orange-500 pl-3">词缀参数配置</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">词缀名称</th>
                                                <th className="p-2 text-left">出现权重</th>
                                                <th className="p-2 text-left">金币消耗</th>
                                                <th className="p-2 text-left">描述</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.affixes.map((affix, idx) => (
                                                <tr key={affix.id} className="border-b">
                                                    <td className="p-2 font-bold">{affix.name}</td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={affix.weight}
                                                            onChange={(e) => {
                                                                const newAffixes = [...config.affixes];
                                                                newAffixes[idx] = { ...affix, weight: parseInt(e.target.value) || 0 };
                                                                setConfig({ ...config, affixes: newAffixes });
                                                            }}
                                                            className="border rounded w-20 px-1 py-0.5"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={affix.cost}
                                                            onChange={(e) => {
                                                                const newAffixes = [...config.affixes];
                                                                newAffixes[idx] = { ...affix, cost: parseInt(e.target.value) || 0 };
                                                                setConfig({ ...config, affixes: newAffixes });
                                                            }}
                                                            className="border rounded w-20 px-1 py-0.5"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            value={affix.desc}
                                                            onChange={(e) => {
                                                                const newAffixes = [...config.affixes];
                                                                newAffixes[idx] = { ...affix, desc: e.target.value };
                                                                setConfig({ ...config, affixes: newAffixes });
                                                            }}
                                                            className="border rounded w-full px-1 py-0.5 text-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 4. 品质基础参数 (重构) */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-purple-500 pl-3">品质属性 (Bonus & Recycle)</h4>
                                <div className="text-xs text-slate-500 mb-2">配置各品质的金币加成倍率和回收价值。注意："Default Fallback Prob" 仅在某些特殊逻辑中作为保底使用，主要掉率请在上方配置。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-2 text-left">品质名称</th>
                                                <th className="p-2 text-left text-xs">Default Fallback Prob</th>
                                                <th className="p-2 text-left">加成倍率 (Bonus)</th>
                                                <th className="p-2 text-left">回收价值 (Gold)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.rarity.map((r, idx) => (
                                                <tr key={r.id} className="border-b">
                                                    <td className="p-2 font-bold">{r.name}</td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number" step="0.01"
                                                            value={r.prob}
                                                            onChange={(e) => {
                                                                const newRarity = [...config.rarity];
                                                                newRarity[idx] = { ...r, prob: parseFloat(e.target.value) };
                                                                setConfig({ ...config, rarity: newRarity });
                                                            }}
                                                            className="border rounded w-20 px-1 py-0.5 bg-slate-50 text-slate-400"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number" step="0.1"
                                                            value={r.bonus}
                                                            onChange={(e) => {
                                                                const newRarity = [...config.rarity];
                                                                newRarity[idx] = { ...r, bonus: parseFloat(e.target.value) };
                                                                setConfig({ ...config, rarity: newRarity });
                                                            }}
                                                            className="border rounded w-20 px-1 py-0.5"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={r.recycleValue}
                                                            onChange={(e) => {
                                                                const newRarity = [...config.rarity];
                                                                newRarity[idx] = { ...r, recycleValue: parseInt(e.target.value) };
                                                                setConfig({ ...config, rarity: newRarity });
                                                            }}
                                                            className="border rounded w-20 px-1 py-0.5"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>



                            {/* 全局设置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-blue-500 pl-3">全局参数</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">刷新订单消耗 (金币)</label>
                                        <input
                                            type="number"
                                            value={config.global.refreshCost}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, refreshCost: parseInt(e.target.value) || 0 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">初始金币</label>
                                        <input
                                            type="number"
                                            value={config.global.initialGold}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, initialGold: parseInt(e.target.value) || 0 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">初始奖券</label>
                                        <input
                                            type="number"
                                            value={config.global.initialTickets}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, initialTickets: parseInt(e.target.value) || 0 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">主线池出现概率 (0-1)</label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0" max="1"
                                            value={config.global.mainlineChance !== undefined ? config.global.mainlineChance : 0.5}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, mainlineChance: parseFloat(e.target.value) } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">主线道具掉率 (0-1)</label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0" max="1"
                                            value={config.global.mainlineDropRate !== undefined ? config.global.mainlineDropRate : 0.3}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, mainlineDropRate: parseFloat(e.target.value) } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">主线填充物传说概率 (0-1)</label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0" max="1"
                                            value={config.global.mainlineFillerLegendaryRate !== undefined ? config.global.mainlineFillerLegendaryRate : 0.1}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, mainlineFillerLegendaryRate: parseFloat(e.target.value) } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                </div>
                            </section>

                        </div>

                        <div className="p-4 bg-slate-100 border-t flex justify-between items-center">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDefaultResetConfirmOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition-colors font-bold text-sm"
                                >
                                    <RotateCcw size={16} /> 重置默认
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors font-bold shadow-sm">
                                    <Upload size={18} />
                                    <span>导入配置</span>
                                    <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
                                </label>

                                <button
                                    onClick={handleExportConfig}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg"
                                >
                                    <Download size={18} /> 导出配置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
