import React, { useState, useMemo } from 'react';
import { Settings, Download, Upload, RotateCcw, X, Coins, Ticket, Flag, Power, ChevronsUp, Check, Sparkles, Package, Zap, Timer } from 'lucide-react';
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

    // Item Spawn State
    const [selectedSpawnPoolId, setSelectedSpawnPoolId] = useState(config.pools[0]?.id);
    const [selectedSpawnItemName, setSelectedSpawnItemName] = useState(config.pools[0]?.items[0]?.name);
    const [selectedSpawnRarityId, setSelectedSpawnRarityId] = useState('common');
    const [debugAddItemPulse, setDebugAddItemPulse] = useState(null);

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

    const handleSpawnItem = () => {
        setDebugAddItemPulse({
            itemName: selectedSpawnItemName,
            rarityId: selectedSpawnRarityId,
            timestamp: Date.now()
        });
    };

    const spawnItemsPool = useMemo(() => {
        return config.pools.find(p => p.id === selectedSpawnPoolId) || config.pools[0];
    }, [config.pools, selectedSpawnPoolId]);

    return (
        <LanguageProvider>
            <ErrorBoundary key={gameId}>
                <GameCore
                    key={gameId}
                    config={config}
                    initialSkills={initialSkills}
                    initialProgress={initialStage}
                    onOpenSettings={() => setShowSettings(true)}
                    onReset={() => setResetConfirmOpen(true)}
                    debugAddItem={debugAddItemPulse}
                    onDebugAddItemHandled={() => setDebugAddItemPulse(null)}
                />
            </ErrorBoundary>

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

                            {/* 1. 开发者工具：实时添加物品 */}
                            <section className="bg-red-50 p-4 rounded-xl border-2 border-red-100">
                                <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-700">
                                    <Zap size={20} /> 实时调试：直接获取物品
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-red-600">选择奖池</label>
                                        <select
                                            className="p-2 border rounded bg-white"
                                            value={selectedSpawnPoolId}
                                            onChange={(e) => {
                                                const pid = e.target.value;
                                                setSelectedSpawnPoolId(pid);
                                                const pool = config.pools.find(p => p.id === pid);
                                                if (pool) setSelectedSpawnItemName(pool.items[0]?.name);
                                            }}
                                        >
                                            {config.pools.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-red-600">选择物品</label>
                                        <select
                                            className="p-2 border rounded bg-white"
                                            value={selectedSpawnItemName}
                                            onChange={(e) => setSelectedSpawnItemName(e.target.value)}
                                        >
                                            {spawnItemsPool?.items.map(item => <option key={item.name} value={item.name}>{item.icon} {item.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-red-600">选择品质</label>
                                        <select
                                            className="p-2 border rounded bg-white font-bold"
                                            value={selectedSpawnRarityId}
                                            onChange={(e) => setSelectedSpawnRarityId(e.target.value)}
                                        >
                                            {config.rarity.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleSpawnItem}
                                            className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-shadow shadow-md active:scale-95"
                                        >
                                            直接获取物品
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* 2. 核心规则配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-emerald-500 pl-3">核心均衡配置 (Balance)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Patience Config */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h5 className="text-sm font-bold text-emerald-700 flex items-center gap-1"><Sparkles size={14} /> 耐心值系统</h5>
                                            <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded border border-emerald-200 shadow-sm hover:bg-emerald-50">
                                                <input
                                                    type="checkbox"
                                                    checked={config.patience?.enabled !== false}
                                                    onChange={(e) => setConfig({ ...config, patience: { ...config.patience, enabled: e.target.checked } })}
                                                    className="accent-emerald-600 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-[10px] font-bold text-emerald-800">启用</span>
                                            </label>
                                        </div>
                                        <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${config.patience?.enabled === false ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">初始耐心值</label>
                                                <input
                                                    type="number"
                                                    className="p-2 border rounded font-mono"
                                                    value={config.patience.initialPatience}
                                                    onChange={(e) => setConfig({ ...config, patience: { ...config.patience, initialPatience: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">抽取消耗</label>
                                                <input
                                                    type="number"
                                                    className="p-2 border rounded font-mono"
                                                    value={config.patience.drawCost}
                                                    onChange={(e) => setConfig({ ...config, patience: { ...config.patience, drawCost: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase text-green-600">订单奖励</label>
                                                <input
                                                    type="number"
                                                    className="p-2 border border-green-200 bg-green-50 rounded font-mono font-bold text-green-600"
                                                    value={config.patience.orderCompletionReward || 15}
                                                    onChange={(e) => setConfig({ ...config, patience: { ...config.patience, orderCompletionReward: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">阶段阈值 (降序，例如 100, 80, 60...)</label>
                                            <input
                                                type="text"
                                                className="p-2 border rounded font-mono text-xs"
                                                value={config.patience.stages.join(', ')}
                                                onChange={(e) => {
                                                    const vals = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                                                    setConfig({ ...config, patience: { ...config.patience, stages: vals } });
                                                }}
                                            />
                                        </div>

                                        {/* Emergency Order Config */}
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <h5 className="text-sm font-bold text-red-700 flex items-center gap-1 mb-3"><Timer size={14} /> 限时急单配置</h5>

                                            {/* Deadline */}
                                            <div className="mb-3">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">时限 (回合)</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border rounded font-mono"
                                                    value={config.emergency?.deadline || 15}
                                                    onChange={(e) => setConfig({ ...config, emergency: { ...config.emergency, deadline: parseInt(e.target.value) || 15 } })}
                                                />
                                            </div>

                                            {/* Impatience System */}
                                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-amber-700">😡 顾客急躁值系统</label>
                                                    <input
                                                        type="checkbox"
                                                        checked={config.emergency?.impatience?.enabled !== false}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            emergency: {
                                                                ...config.emergency,
                                                                impatience: { ...(config.emergency?.impatience || {}), enabled: e.target.checked }
                                                            }
                                                        })}
                                                        className="accent-amber-600 w-4 h-4"
                                                    />
                                                </div>
                                                <div className={`grid grid-cols-2 gap-2 ${config.emergency?.impatience?.enabled === false ? 'opacity-40 pointer-events-none' : ''}`}>
                                                    <div>
                                                        <label className="text-[8px] text-amber-600 block mb-1">最大急躁值</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.impatience?.maxValue || 5}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    impatience: { ...(config.emergency?.impatience || {}), maxValue: parseInt(e.target.value) || 5 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] text-amber-600 block mb-1">超时增加值</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.impatience?.increaseOnTimeout || 1}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    impatience: { ...(config.emergency?.impatience || {}), increaseOnTimeout: parseInt(e.target.value) || 1 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Difficulty System */}
                                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <label className="text-xs font-bold text-red-700 block mb-2">🔥 难度系统</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[8px] text-red-600 block mb-1">初始难度</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="10"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.difficulty?.initial || 1}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    difficulty: { ...(config.emergency?.difficulty || {}), initial: parseInt(e.target.value) || 1 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] text-red-600 block mb-1">最大难度</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="20"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.difficulty?.maxDifficulty || 10}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    difficulty: { ...(config.emergency?.difficulty || {}), maxDifficulty: parseInt(e.target.value) || 10 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] text-red-600 block mb-1">完成限时订单难度+</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.difficulty?.increaseOnNewOrder || 1}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    difficulty: { ...(config.emergency?.difficulty || {}), increaseOnNewOrder: parseInt(e.target.value) || 1 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] text-green-600 block mb-1">完成主线订单难度-</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full p-1 border rounded font-mono text-sm bg-green-50"
                                                            value={config.emergency?.difficulty?.decreaseOnMainline || 1}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    difficulty: { ...(config.emergency?.difficulty || {}), decreaseOnMainline: parseInt(e.target.value) || 1 }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note about difficulty */}
                                            <div className="text-[9px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                                                💡 提示：难度等级的详细配置（每个难度的需求数量和品质）在 <code className="bg-white px-1 rounded">constants.js</code> 中的 <code className="bg-white px-1 rounded">difficultyReqCountWeights</code> 和 <code className="bg-white px-1 rounded">difficultyRarityWeights</code> 里配置
                                            </div>

                                            {/* Fallback configs - collapsed by default */}
                                            <details className="mb-3 border border-slate-200 rounded-lg overflow-hidden">
                                                <summary className="text-[10px] font-bold text-slate-500 uppercase p-2 bg-slate-50 cursor-pointer hover:bg-slate-100 select-none">
                                                    ⚙️ 高级：Fallback配置（仅当难度未配置时使用）
                                                </summary>
                                                <div className="p-3 space-y-3 bg-white">
                                                    {/* Requirement Count Range (fallback) */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">基础需求数量范围</label>
                                                        <div className="text-[9px] text-slate-400 mb-2">
                                                            当某个难度等级未在下方配置时，使用此范围随机生成
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[8px] text-slate-400 block">最小</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="4"
                                                                    className="w-full p-2 border rounded font-mono text-sm"
                                                                    value={config.emergency?.reqCountMin || 1}
                                                                    onChange={(e) => setConfig({
                                                                        ...config,
                                                                        emergency: {
                                                                            ...config.emergency,
                                                                            reqCountMin: Math.max(1, Math.min(4, parseInt(e.target.value) || 1))
                                                                        }
                                                                    })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[8px] text-slate-400 block">最大</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="4"
                                                                    className="w-full p-2 border rounded font-mono text-sm"
                                                                    value={config.emergency?.reqCountMax || 4}
                                                                    onChange={(e) => setConfig({
                                                                        ...config,
                                                                        emergency: {
                                                                            ...config.emergency,
                                                                            reqCountMax: Math.max(1, Math.min(4, parseInt(e.target.value) || 4))
                                                                        }
                                                                    })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Base Rarity Weights (fallback) */}
                                                    <div className="pt-3 border-t">
                                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">基础品质概率</label>
                                                        <div className="text-[9px] text-slate-400 mb-2">
                                                            当某个难度等级未在下方配置时，使用此品质分布
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rKey => (
                                                                <div key={rKey} className="flex flex-col gap-0.5">
                                                                    <span className="text-[8px] font-black uppercase opacity-60 text-center">{rKey}</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.05"
                                                                        className="p-1 border rounded font-mono text-xs text-center"
                                                                        value={config.emergency?.baseRarityWeights?.[rKey] || 0}
                                                                        onChange={(e) => {
                                                                            const newWeights = {
                                                                                ...(config.emergency?.baseRarityWeights || {}),
                                                                                [rKey]: parseFloat(e.target.value) || 0
                                                                            };
                                                                            setConfig({
                                                                                ...config,
                                                                                emergency: {
                                                                                    ...config.emergency,
                                                                                    baseRarityWeights: newWeights
                                                                                }
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </details>
                                        </div>

                                    </div>


                                    {/* Progress Config */}
                                    <div className="space-y-4">
                                        <h5 className="text-sm font-bold text-blue-700 flex items-center gap-1"><Flag size={14} /> 游戏进度获取公式</h5>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">计算偏移 (Offset)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="p-2 border rounded font-mono text-sm"
                                                    value={config.progress.progressOffset || 0}
                                                    onChange={(e) => setConfig({ ...config, progress: { ...config.progress, progressOffset: parseFloat(e.target.value) || 0 } })}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">胜利目标积分</label>
                                                <input
                                                    type="number"
                                                    className="p-2 border rounded font-mono text-sm"
                                                    value={config.progress.targetProgress}
                                                    onChange={(e) => setConfig({ ...config, progress: { ...config.progress, targetProgress: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">每个需求物品的进度贡献 (Rarity Weights)</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rKey => (
                                                    <div key={rKey} className="flex flex-col gap-0.5">
                                                        <span className="text-[8px] font-black uppercase opacity-60 text-center">{rKey}</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="p-1 border rounded font-mono text-xs text-center"
                                                            value={config.progress.rarityWeights?.[rKey] || 0}
                                                            onChange={(e) => {
                                                                const newWeights = { ...config.progress.rarityWeights, [rKey]: parseFloat(e.target.value) || 0 };
                                                                setConfig({ ...config, progress: { ...config.progress, rarityWeights: newWeights } });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded leading-relaxed border border-slate-100">
                                            公式: floor(∑(每个需求物品对应权重) + Offset)
                                            <br /><span className="text-blue-500 italic">产出范围: 1 - 4 (整数)</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Emergency Order Difficulty Levels Config */}
                            <section className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border-2 border-orange-200">
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-orange-500 pl-3 flex items-center gap-2">
                                    🎚️ 限时订单难度等级配置 (1-{config.emergency?.difficulty?.maxDifficulty || 10})
                                </h4>
                                <div className="text-xs text-slate-600 mb-4 bg-white/60 p-3 rounded-lg border border-orange-100">
                                    为每个难度等级单独配置需求数量概率和品质概率。难度越高，可以设置更多物品和更高品质的概率。
                                    <br />
                                    <span className="text-orange-600 font-bold">💡 当前最大难度: {config.emergency?.difficulty?.maxDifficulty || 10}，可在上方"难度系统"中调整</span>
                                </div>

                                {Array.from({ length: config.emergency?.difficulty?.maxDifficulty || 10 }, (_, i) => i + 1).map(difficulty => {
                                    const difficultyReqCountWeights = config.emergency?.difficultyReqCountWeights || {};
                                    const difficultyRarityWeights = config.emergency?.difficultyRarityWeights || {};
                                    const currentReqWeights = difficultyReqCountWeights[difficulty] || { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };
                                    const currentRarityWeights = difficultyRarityWeights[difficulty] || { common: 0.5, uncommon: 0.3, rare: 0.15, epic: 0.04, legendary: 0.01 };

                                    return (
                                        <details key={difficulty} className="mb-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                                            <summary className="p-3 cursor-pointer hover:bg-orange-50 rounded-lg font-bold text-sm flex items-center gap-2 select-none">
                                                <span className={`px-2 py-1 rounded-full text-xs font-black ${difficulty <= 3 ? 'bg-green-100 text-green-700' :
                                                    difficulty <= 6 ? 'bg-yellow-100 text-yellow-700' :
                                                        difficulty <= 8 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    难度 {difficulty}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-normal">
                                                    (点击展开编辑)
                                                </span>
                                            </summary>

                                            <div className="p-4 border-t border-orange-100 space-y-4">
                                                {/* Requirement Count Weights */}
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 block mb-2">📦 需求物品数量概率</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[1, 2, 3, 4].map(count => (
                                                            <div key={count} className="flex flex-col gap-1 bg-slate-50 p-2 rounded border">
                                                                <label className="text-[10px] font-bold text-center text-slate-600">{count}个物品</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.05"
                                                                    min="0"
                                                                    max="1"
                                                                    className="p-1.5 border rounded font-mono text-sm text-center focus:ring-2 focus:ring-orange-300"
                                                                    value={currentReqWeights[count] || 0}
                                                                    onChange={(e) => {
                                                                        const newWeight = parseFloat(e.target.value) || 0;
                                                                        const newReqWeights = {
                                                                            ...currentReqWeights,
                                                                            [count]: Math.max(0, Math.min(1, newWeight))
                                                                        };
                                                                        setConfig({
                                                                            ...config,
                                                                            emergency: {
                                                                                ...config.emergency,
                                                                                difficultyReqCountWeights: {
                                                                                    ...difficultyReqCountWeights,
                                                                                    [difficulty]: newReqWeights
                                                                                }
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-1 text-right">
                                                        总和: {Object.values(currentReqWeights).reduce((sum, v) => sum + v, 0).toFixed(2)} (建议=1.00)
                                                    </div>
                                                </div>

                                                {/* Rarity Weights */}
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 block mb-2">✨ 需求物品品质概率</label>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {[
                                                            { id: 'common', name: '普通', color: 'slate' },
                                                            { id: 'uncommon', name: '优秀', color: 'green' },
                                                            { id: 'rare', name: '稀有', color: 'blue' },
                                                            { id: 'epic', name: '史诗', color: 'purple' },
                                                            { id: 'legendary', name: '传说', color: 'amber' }
                                                        ].map(rarity => (
                                                            <div key={rarity.id} className={`flex flex-col gap-1 bg-${rarity.color}-50 p-2 rounded border border-${rarity.color}-200`}>
                                                                <label className={`text-[10px] font-bold text-center text-${rarity.color}-700`}>{rarity.name}</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.05"
                                                                    min="0"
                                                                    max="1"
                                                                    className="p-1.5 border rounded font-mono text-sm text-center focus:ring-2 focus:ring-orange-300"
                                                                    value={currentRarityWeights[rarity.id] || 0}
                                                                    onChange={(e) => {
                                                                        const newWeight = parseFloat(e.target.value) || 0;
                                                                        const newRarityWeights = {
                                                                            ...currentRarityWeights,
                                                                            [rarity.id]: Math.max(0, Math.min(1, newWeight))
                                                                        };
                                                                        setConfig({
                                                                            ...config,
                                                                            emergency: {
                                                                                ...config.emergency,
                                                                                difficultyRarityWeights: {
                                                                                    ...difficultyRarityWeights,
                                                                                    [difficulty]: newRarityWeights
                                                                                }
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-1 text-right">
                                                        总和: {Object.values(currentRarityWeights).reduce((sum, v) => sum + v, 0).toFixed(2)} (建议=1.00)
                                                    </div>
                                                </div>

                                                {/* Quick preset buttons */}
                                                <div className="pt-2 border-t flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => {
                                                            // 恢复默认
                                                            const defaults = {
                                                                1: { reqCount: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 }, rarity: { common: 0.5, uncommon: 0.3, rare: 0.15, epic: 0.04, legendary: 0.01 } },
                                                                5: { reqCount: { 1: 0.1, 2: 0.25, 3: 0.35, 4: 0.3 }, rarity: { common: 0.3, uncommon: 0.28, rare: 0.25, epic: 0.12, legendary: 0.05 } },
                                                                10: { reqCount: { 1: 0, 2: 0, 3: 0.2, 4: 0.8 }, rarity: { common: 0.05, uncommon: 0.1, rare: 0.35, epic: 0.3, legendary: 0.2 } }
                                                            };
                                                            const preset = defaults[difficulty] || defaults[1];
                                                            setConfig({
                                                                ...config,
                                                                emergency: {
                                                                    ...config.emergency,
                                                                    difficultyReqCountWeights: {
                                                                        ...difficultyReqCountWeights,
                                                                        [difficulty]: preset.reqCount
                                                                    },
                                                                    difficultyRarityWeights: {
                                                                        ...difficultyRarityWeights,
                                                                        [difficulty]: preset.rarity
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-bold"
                                                    >
                                                        恢复默认
                                                    </button>
                                                </div>
                                            </div>
                                        </details>
                                    );
                                })}
                            </section>

                            {/* 3. 概率权重配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-blue-500 pl-3">掉落与需求概率 (Quality Rates)</h4>
                                <div className="text-xs text-slate-500 mb-2">配置物品掉落和订单需求的品质分布权重。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-separate border-spacing-y-2">
                                        <thead className="text-slate-500 text-left">
                                            <tr>
                                                <th className="p-2">类别</th>
                                                <th className="p-2 text-center">普通</th>
                                                <th className="p-2 text-center">优秀</th>
                                                <th className="p-2 text-center">稀有</th>
                                                <th className="p-2 text-center">史诗</th>
                                                <th className="p-2 text-center">传说</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Rarity Drop Rates */}
                                            <tr className="bg-slate-50 rounded-lg overflow-hidden">
                                                <td className="p-3">
                                                    <div className="font-bold flex items-center gap-2">
                                                        <Package size={16} className="text-orange-500" /> 物品掉落概率
                                                    </div>
                                                </td>
                                                {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rKey => (
                                                    <td key={rKey} className="p-2 text-center">
                                                        <input
                                                            type="number" step="0.05"
                                                            className="w-16 p-1 border rounded text-center bg-white"
                                                            value={config.stages[0].rarityWeights[rKey]}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const newStages = [...config.stages];
                                                                newStages[0] = { ...newStages[0], rarityWeights: { ...newStages[0].rarityWeights, [rKey]: val } };
                                                                setConfig({ ...config, stages: newStages });
                                                            }}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                            {/* Order Req Rates */}
                                            <tr className="bg-slate-50 rounded-lg overflow-hidden">
                                                <td className="p-3">
                                                    <div className="font-bold flex items-center gap-2">
                                                        <Flag size={16} className="text-blue-500" /> 订单需求概率
                                                    </div>
                                                </td>
                                                {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(rKey => (
                                                    <td key={rKey} className="p-2 text-center">
                                                        <input
                                                            type="number" step="0.05"
                                                            className="w-16 p-1 border rounded text-center bg-white"
                                                            value={config.stages[0].orderRarityWeights?.[rKey] || config.stages[0].rarityWeights[rKey]}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const newStages = [...config.stages];
                                                                newStages[0] = { ...newStages[0], orderRarityWeights: { ...(newStages[0].orderRarityWeights || newStages[0].rarityWeights), [rKey]: val } };
                                                                setConfig({ ...config, stages: newStages });
                                                            }}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 4. 订单详情配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-cyan-500 pl-3">订单数量与奖励 (Order Size & Rewards)</h4>
                                <div className="text-xs text-slate-500 mb-4">设定不同物品数量订单的出现权重，以及完成后的基础耐心值奖励。</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[2, 3, 4].map(count => {
                                        const stage = config.stages[0];
                                        const rewards = stage.baseRewards || { 2: 15, 3: 15, 4: 15 };
                                        return (
                                            <div key={count} className="p-4 border rounded-xl bg-slate-50 space-y-3">
                                                <div className="font-bold text-center text-slate-700 underline underline-offset-4">{count} 个物品订单</div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-500">出现权重%</label>
                                                    <input
                                                        type="number"
                                                        className="w-16 p-1 border rounded text-center bg-white font-mono"
                                                        value={stage.orderCountWeights?.[count] || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newStages = [...config.stages];
                                                            newStages[0] = { ...newStages[0], orderCountWeights: { ...newStages[0].orderCountWeights, [count]: val } };
                                                            setConfig({ ...config, stages: newStages });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-yellow-600">奖励系数</label>
                                                    <input
                                                        type="number"
                                                        className="w-16 p-1 border border-yellow-200 bg-yellow-50 rounded text-center font-mono font-bold text-yellow-700"
                                                        value={rewards[count] || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newStages = [...config.stages];
                                                            newStages[0] = { ...newStages[0], baseRewards: { ...(newStages[0].baseRewards || defaultBaseRewards), [count]: val } };
                                                            setConfig({ ...config, stages: newStages });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-pink-500 pl-3">其他参数 (Misc)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">刷新单个订单消耗</label>
                                        <input
                                            type="number"
                                            value={config.global.refreshCost}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, refreshCost: parseInt(e.target.value) || 0 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">主线道具出现概率 (0-1)</label>
                                        <input
                                            type="number" step="0.05"
                                            value={config.global.mainlineDropRate || 0.3}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, mainlineDropRate: parseFloat(e.target.value) } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">熵增模式周期</label>
                                        <input
                                            type="number"
                                            value={config.stages[0].entropyDecayValue || 40}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                const newStages = [...config.stages];
                                                newStages[0] = { ...newStages[0], entropyDecayValue: val };
                                                setConfig({ ...config, stages: newStages });
                                            }}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 技能配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-indigo-500 pl-3">可用技能 (勾选以启用掉落)</h4>
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
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-red-500 pl-3">开发者工具: 直接获取技能</h4>
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
                                            覆盖当前所有技能 ({devSkillsSelected.length})
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDevSkillsSelected([]);
                                                setInitialSkills([]);
                                                handleHardReset();
                                            }}
                                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2"
                                        >
                                            <RotateCcw size={14} /> 清空并重启
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* 品质基础参数 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-purple-500 pl-3">品质属性 (Rarity Details)</h4>
                                <div className="text-xs text-slate-500 mb-2">配置各品质的加成倍率和回收价值。</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500 rounded-t-lg">
                                            <tr>
                                                <th className="p-2 text-left">品质名称</th>
                                                <th className="p-2 text-left">奖励加成 (Bonus)</th>
                                                <th className="p-2 text-left">回收耐心值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {config.rarity.map((r, idx) => (
                                                <tr key={r.id} className="border-b">
                                                    <td className="p-2 font-bold">{r.name}</td>
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
                                                                newRarity[idx] = { ...r, recycleValue: parseInt(e.target.value) || 0 };
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

                        </div >

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
                    </div >
                </div >
            )
            }
        </LanguageProvider >
    );
}
