import React, { useState, useMemo } from 'react';
import { Settings, Download, Upload, RotateCcw, X, Flag, Package, Zap, Timer } from 'lucide-react';
import GameCore from './GameCore';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { INITIAL_GAME_CONFIG, SKILL_DEFINITIONS } from './data/constants';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

export default function App() {
    const { t } = useLanguage();
    const [config, setConfig] = useState(INITIAL_GAME_CONFIG);
    const [gameId, setGameId] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [defaultResetConfirmOpen, setDefaultResetConfirmOpen] = useState(false);

    // Dev tools state
    const [devSkillsSelected, setDevSkillsSelected] = useState([]);
    const [initialSkills, setInitialSkills] = useState([]);
    const [initialStage, setInitialStage] = useState(0);

    // Item Spawn State
    const [selectedSpawnItemName, setSelectedSpawnItemName] = useState(config.catalog?.[0]?.name);
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
                const imported = JSON.parse(event.target.result);

                setConfig(prev => {
                    const next = { ...prev };

                    // 1. 保护性合并：阶段数值 (Stages)
                    // 只继承掉落概率、权重和奖励数值，不改变阶段的基础结构
                    if (imported.stages && imported.stages[0]) {
                        const impStage = imported.stages[0];
                        next.stages = prev.stages.map((s, i) => {
                            if (i > 0) return s; // 目前主要配置 stage 0
                            return {
                                ...s,
                                rarityWeights: impStage.rarityWeights || s.rarityWeights,
                                orderRarityWeights: impStage.orderRarityWeights || s.orderRarityWeights,
                                orderCountWeights: impStage.orderCountWeights || s.orderCountWeights,
                                baseRewards: impStage.baseRewards || s.baseRewards,
                                entropyDecayValue: impStage.entropyDecayValue || s.entropyDecayValue,
                                orderSlots: impStage.orderSlots ?? s.orderSlots
                            };
                        });
                    }

                    // 2. 保护性合并：词缀数值 (Affixes)
                    // 只继承金币消耗和自定义权重，不改变词缀的名称、描述或逻辑 ID
                    if (imported.affixes) {
                        next.affixes = prev.affixes.map(defAffix => {
                            const impAffix = imported.affixes.find(a => a.id === defAffix.id);
                            if (impAffix) {
                                return {
                                    ...defAffix,
                                    cost: impAffix.cost !== undefined ? impAffix.cost : defAffix.cost,
                                    rarityWeights: impAffix.rarityWeights || defAffix.rarityWeights
                                };
                            }
                            return defAffix;
                        });
                    }

                    // 3. 继承平衡性参数 (Progress, Emergency, Global)
                    // 这些通常全是数值，可以较安全地合并
                    if (imported.progress) next.progress = { ...prev.progress, ...imported.progress };
                    if (imported.emergency) next.emergency = { ...prev.emergency, ...imported.emergency };
                    if (imported.global) next.global = { ...prev.global, ...imported.global };
                    if (imported.toolItems) next.toolItems = { ...prev.toolItems, ...imported.toolItems };

                    // 4. 特殊字段：品质属性 (Rarity Details)
                    // 只继承加成（bonus）和回收价值（recycleValue），不继承 id, name, color
                    if (imported.rarity) {
                        next.rarity = prev.rarity.map(defR => {
                            const impR = imported.rarity.find(r => r.id === defR.id);
                            if (impR) {
                                return {
                                    ...defR,
                                    bonus: impR.bonus !== undefined ? impR.bonus : defR.bonus,
                                    recycleValue: impR.recycleValue !== undefined ? impR.recycleValue : defR.recycleValue
                                };
                            }
                            return defR;
                        });
                    }

                    // --- 绝对禁止覆盖的字段 ---
                    // next.pools = prev.pools; // 保持当前物品列表
                    // next.enabledSkillIds = prev.enabledSkillIds; // 保持当前技能列表

                    return next;
                });
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

    const spawnCatalog = config.catalog || [];

    return (
        <>
            <ErrorBoundary key={gameId}>
                <GameCore
                    key={gameId}
                    config={config}
                    initialSkills={initialSkills}
                    initialProgress={initialStage}
                    onOpenSettings={() => setShowSettings(true)}
                    showSettings={showSettings}
                    debugMode={debugMode}
                    setDebugMode={setDebugMode}
                    onReset={() => setResetConfirmOpen(true)}
                    debugAddItem={debugAddItemPulse}
                    onDebugAddItemHandled={() => setDebugAddItemPulse(null)}
                />
            </ErrorBoundary>

            {resetConfirmOpen && (
                <ConfirmDialog
                    title={t("重新开始游戏？")}
                    message={t("确定要重新开始游戏吗？当前进度（金币、背包、技能）将丢失。")}
                    onConfirm={handleHardReset}
                    onCancel={() => setResetConfirmOpen(false)}
                />
            )}

            {defaultResetConfirmOpen && (
                <ConfirmDialog
                    title={t("恢复默认配置？")}
                    message={t("确定要将所有配置参数恢复为默认值吗？此操作不可撤销。")}
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
                                    <div className="flex flex-col gap-1 md:col-span-2">
                                        <label className="text-xs font-bold text-red-600">选择物品</label>
                                        <select
                                            className="p-2 border rounded bg-white"
                                            value={selectedSpawnItemName}
                                            onChange={(e) => setSelectedSpawnItemName(e.target.value)}
                                        >
                                            {spawnCatalog.map(item => <option key={item.name} value={item.name}>{item.icon} {item.name}</option>)}
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
                                    <div className="space-y-4">
                                        {/* Emergency Order Config */}
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <h5><Timer size={14} /> {t("离开关卡需求配置")}</h5>

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
                                                        <label className="text-[8px] text-red-600 block mb-1">离开关卡难度提升+</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full p-1 border rounded font-mono text-sm"
                                                            value={config.emergency?.difficulty?.increaseOnNewOrder !== undefined ? config.emergency.difficulty.increaseOnNewOrder : 1}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                setConfig({
                                                                    ...config,
                                                                    emergency: {
                                                                        ...config.emergency,
                                                                        difficulty: {
                                                                            ...(config.emergency?.difficulty || {}),
                                                                            increaseOnNewOrder: isNaN(val) ? 1 : val
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] text-green-600 block mb-1">完成积分订单难度-</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full p-1 border rounded font-mono text-sm bg-green-50"
                                                            value={config.emergency?.difficulty?.decreaseOnScoreOrder !== undefined ? config.emergency.difficulty.decreaseOnScoreOrder : 1}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                setConfig({
                                                                    ...config,
                                                                    emergency: {
                                                                        ...config.emergency,
                                                                        difficulty: {
                                                                            ...(config.emergency?.difficulty || {}),
                                                                            decreaseOnScoreOrder: isNaN(val) ? 1 : val
                                                                        }
                                                                    }
                                                                });
                                                            }}
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


                                    {/* Score Config */}
                                    <div className="space-y-4">
                                        <h5 className="text-sm font-bold text-blue-700 flex items-center gap-1"><Flag size={14} /> 积分订单获取公式</h5>

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
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Emergency Order Difficulty Levels Config */}
                            <section className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border-2 border-orange-200">
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-orange-500 pl-3 flex items-center gap-2">
                                    🎚️ 离开关卡难度等级配置 (1-{config.emergency?.difficulty?.maxDifficulty || 10})
                                </h4>
                                <div className="text-xs text-slate-600 mb-4 bg-white/60 p-3 rounded-lg border border-orange-100">
                                    为每个难度等级配置精确的品质需求。难度越高，可以设置更高品质的要求。
                                    <br />
                                    <span className="text-orange-600 font-bold">💡 当前最大难度: {config.emergency?.difficulty?.maxDifficulty || 10}，可在上方"难度系统"中调整</span>
                                </div>

                                {Array.from({ length: config.emergency?.difficulty?.maxDifficulty || 10 }, (_, i) => i + 1).map(difficulty => {
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
                                                {/* Exact Requirements Configuration */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-bold text-purple-700 flex items-center gap-2">
                                                            🎯 精确品质需求配置
                                                        </label>
                                                        <button
                                                            onClick={() => {
                                                                const currentRequirements = config.emergency?.difficultyRequirements || {};
                                                                if (currentRequirements[difficulty]) {
                                                                    // 清除配置
                                                                    const newRequirements = { ...currentRequirements };
                                                                    delete newRequirements[difficulty];
                                                                    setConfig({
                                                                        ...config,
                                                                        emergency: {
                                                                            ...config.emergency,
                                                                            difficultyRequirements: newRequirements
                                                                        }
                                                                    });
                                                                } else {
                                                                    // 初始化配置
                                                                    setConfig({
                                                                        ...config,
                                                                        emergency: {
                                                                            ...config.emergency,
                                                                            difficultyRequirements: {
                                                                                ...currentRequirements,
                                                                                [difficulty]: [{ rarity: 'common', count: 2 }]
                                                                            }
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            className={`text-[10px] px-3 py-1 rounded font-bold transition-all ${(config.emergency?.difficultyRequirements?.[difficulty])
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                                }`}
                                                        >
                                                            {(config.emergency?.difficultyRequirements?.[difficulty]) ? '清除配置' : '添加配置'}
                                                        </button>
                                                    </div>

                                                    {(config.emergency?.difficultyRequirements?.[difficulty]) && (
                                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-2">
                                                            <div className="text-[9px] text-purple-600 mb-2">
                                                                配置此难度需要的具体品质和数量，订单会随机选择物品但固定品质。
                                                            </div>

                                                            {/* Requirement Items List */}
                                                            {(config.emergency?.difficultyRequirements?.[difficulty] || []).map((req, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                                    <select
                                                                        value={req.rarity}
                                                                        onChange={(e) => {
                                                                            const newReqs = [...(config.emergency?.difficultyRequirements?.[difficulty] || [])];
                                                                            newReqs[idx] = { ...newReqs[idx], rarity: e.target.value };
                                                                            setConfig({
                                                                                ...config,
                                                                                emergency: {
                                                                                    ...config.emergency,
                                                                                    difficultyRequirements: {
                                                                                        ...(config.emergency?.difficultyRequirements || {}),
                                                                                        [difficulty]: newReqs
                                                                                    }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="flex-1 p-1.5 border rounded text-xs font-bold"
                                                                    >
                                                                        <option value="common">普通</option>
                                                                        <option value="uncommon">优秀</option>
                                                                        <option value="rare">稀有</option>
                                                                        <option value="epic">史诗</option>
                                                                        <option value="legendary">传说</option>
                                                                    </select>
                                                                    <span className="text-xs text-slate-500">×</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="4"
                                                                        value={req.count}
                                                                        onChange={(e) => {
                                                                            const newReqs = [...(config.emergency?.difficultyRequirements?.[difficulty] || [])];
                                                                            newReqs[idx] = { ...newReqs[idx], count: parseInt(e.target.value) || 1 };
                                                                            setConfig({
                                                                                ...config,
                                                                                emergency: {
                                                                                    ...config.emergency,
                                                                                    difficultyRequirements: {
                                                                                        ...(config.emergency?.difficultyRequirements || {}),
                                                                                        [difficulty]: newReqs
                                                                                    }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="w-16 p-1.5 border rounded text-center font-mono text-sm"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newReqs = (config.emergency?.difficultyRequirements?.[difficulty] || []).filter((_, i) => i !== idx);
                                                                            setConfig({
                                                                                ...config,
                                                                                emergency: {
                                                                                    ...config.emergency,
                                                                                    difficultyRequirements: {
                                                                                        ...(config.emergency?.difficultyRequirements || {}),
                                                                                        [difficulty]: newReqs.length > 0 ? newReqs : undefined
                                                                                    }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {/* Add Button */}
                                                            <button
                                                                onClick={() => {
                                                                    const newReqs = [...(config.emergency?.difficultyRequirements?.[difficulty] || []), { rarity: 'common', count: 1 }];
                                                                    setConfig({
                                                                        ...config,
                                                                        emergency: {
                                                                            ...config.emergency,
                                                                            difficultyRequirements: {
                                                                                ...(config.emergency?.difficultyRequirements || {}),
                                                                                [difficulty]: newReqs
                                                                            }
                                                                        }
                                                                    });
                                                                }}
                                                                className="w-full text-[10px] px-2 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded font-bold"
                                                            >
                                                                + 添加品质需求
                                                            </button>

                                                            {/* Preview */}
                                                            <div className="text-[9px] text-slate-500 bg-white p-2 rounded border border-purple-100">
                                                                <strong>预览:</strong> 总共需要 {(config.emergency?.difficultyRequirements?.[difficulty] || []).reduce((sum, r) => sum + r.count, 0)} 个物品
                                                            </div>
                                                        </div>
                                                    )}
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
                                                <th className="p-2 text-center">神话</th>
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
                                                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rKey => (
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
                                                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rKey => (
                                                    <td key={rKey} className="p-2 text-center">
                                                        <input
                                                            type="number" step="0.05"
                                                            className="w-16 p-1 border rounded text-center bg-white"
                                                            value={config.stages[0].orderRarityWeights?.[rKey] !== undefined
                                                                ? config.stages[0].orderRarityWeights[rKey]
                                                                : config.stages[0].rarityWeights[rKey]}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                const newStages = [...config.stages];
                                                                // 确保 orderRarityWeights 存在并包含所有品质
                                                                const currentOrderWeights = newStages[0].orderRarityWeights || { ...newStages[0].rarityWeights };
                                                                newStages[0] = {
                                                                    ...newStages[0],
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
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* 4. 订单详情配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-cyan-500 pl-3">订单数量与奖励 (Order Size & Rewards)</h4>
                                <div className="text-xs text-slate-500 mb-4">设定不同物品数量订单的出现权重，以及完成后的基础积分奖励。</div>
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
                                        <label className="text-xs font-bold text-slate-500">初始金币</label>
                                        <input
                                            type="number"
                                            value={config.global.initialGold || 30}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, initialGold: parseInt(e.target.value) || 30 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">初始订单刷新次数</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={config.global.initialRefreshCount ?? 4}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, initialRefreshCount: parseInt(e.target.value) || 0 } })}
                                            className="border rounded px-3 py-2 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">订单刷新次数上限</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={config.global.maxRefreshCount ?? 4}
                                            onChange={(e) => setConfig({ ...config, global: { ...config.global, maxRefreshCount: parseInt(e.target.value) || 0 } })}
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
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">订单槽数量</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="8"
                                            value={config.stages[0].orderSlots ?? 3}
                                            onChange={(e) => {
                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                const newStages = config.stages.map(s => ({ ...s, orderSlots: val }));
                                                setConfig({ ...config, stages: newStages });
                                            }}
                                            className="border rounded px-3 py-2 font-mono w-20"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 奖池词缀配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-yellow-500 pl-3">奖池词缀配置</h4>
                                <div className="space-y-3">
                                    {config.affixes.map((affix, idx) => {
                                        // 判断此词缀是否支持自定义品质配置（稀碎的固定100%普通，不可配置）
                                        const supportsCustomRarity = affix.id !== 'fragmented';

                                        return (
                                            <details key={affix.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                                <summary className="p-3 cursor-pointer hover:bg-slate-50 font-bold text-sm flex items-center justify-between select-none">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-base">{affix.name}</span>
                                                        <span className="text-xs text-slate-400 font-normal">({affix.desc})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500">消耗:</span>
                                                        <span className="font-mono text-yellow-600">{affix.cost}🪙</span>
                                                    </div>
                                                </summary>

                                                <div className="p-4 border-t bg-slate-50 space-y-4">
                                                    {/* 消耗配置 */}
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-600 block mb-2">💰 金币消耗</label>
                                                        <input
                                                            type="number"
                                                            value={affix.cost || 2}
                                                            onChange={(e) => {
                                                                const newAffixes = [...config.affixes];
                                                                newAffixes[idx] = { ...newAffixes[idx], cost: parseInt(e.target.value) || 0 };
                                                                setConfig({ ...config, affixes: newAffixes });
                                                            }}
                                                            className="w-24 border rounded px-3 py-2 font-mono text-sm"
                                                        />
                                                    </div>

                                                    {/* 品质权重配置 (仅支持的词缀显示) */}
                                                    {supportsCustomRarity && (
                                                        <div className="pt-3 border-t">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <label className="text-xs font-bold text-purple-600">✨ 自定义品质概率</label>
                                                                {affix.rarityWeights ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const newAffixes = [...config.affixes];
                                                                            const { rarityWeights, ...rest } = newAffixes[idx];
                                                                            newAffixes[idx] = rest;
                                                                            setConfig({ ...config, affixes: newAffixes });
                                                                        }}
                                                                        className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold"
                                                                    >
                                                                        禁用自定义
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const newAffixes = [...config.affixes];
                                                                            newAffixes[idx] = {
                                                                                ...newAffixes[idx],
                                                                                rarityWeights: { ...config.stages[0].rarityWeights }
                                                                            };
                                                                            setConfig({ ...config, affixes: newAffixes });
                                                                        }}
                                                                        className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 font-bold"
                                                                    >
                                                                        启用自定义
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {affix.rarityWeights && (
                                                                <div className="bg-white p-3 rounded-lg border border-purple-200">
                                                                    <div className="text-xs text-purple-600 mb-2">
                                                                        自定义此词缀的品质概率分布（未启用时使用全局掉落概率）
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rKey => (
                                                                            <div key={rKey} className="flex flex-col gap-1">
                                                                                <span className="text-xs font-bold uppercase opacity-60 text-center">{rKey}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.05"
                                                                                    className="p-1.5 border rounded font-mono text-sm text-center"
                                                                                    value={affix.rarityWeights[rKey] || 0}
                                                                                    onChange={(e) => {
                                                                                        const newAffixes = [...config.affixes];
                                                                                        newAffixes[idx] = {
                                                                                            ...newAffixes[idx],
                                                                                            rarityWeights: {
                                                                                                ...affix.rarityWeights,
                                                                                                [rKey]: parseFloat(e.target.value) || 0
                                                                                            }
                                                                                        };
                                                                                        setConfig({ ...config, affixes: newAffixes });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 mt-2 text-right">
                                                                        总和: {Object.values(affix.rarityWeights).reduce((sum, v) => sum + v, 0).toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!affix.rarityWeights && (
                                                                <div className="text-xs text-slate-400 bg-white p-2 rounded border">
                                                                    当前使用全局物品掉落概率
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {!supportsCustomRarity && (
                                                        <div className="text-xs text-slate-400 bg-yellow-50 p-2 rounded border border-yellow-200">
                                                            ℹ️ 此词缀有固定的品质逻辑，无法自定义
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 工具物品配置 */}
                            <section>
                                <h4 className="text-lg font-bold mb-4 border-l-4 border-amber-500 pl-3">🔧 工具物品配置</h4>
                                <div className="space-y-4 bg-amber-50/30 p-4 rounded-xl border border-amber-200">
                                    {/* 掉落概率 */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500">每次抽取掉落工具物品概率</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                value={config.toolItems?.dropChance || 0}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    toolItems: { ...config.toolItems, dropChance: parseFloat(e.target.value) || 0 }
                                                })}
                                                className="border rounded px-3 py-2 font-mono w-24"
                                            />
                                            <span className="text-sm text-slate-500 font-bold">{((config.toolItems?.dropChance || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    {/* 各工具物品权重 */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500">各工具物品相对权重</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'tool_reforge', name: '🔥 命运熔炉', desc: '重roll品质' },
                                                { id: 'tool_transmute', name: '🔮 万象棱镜', desc: '同类替换' },
                                                { id: 'tool_enhance', name: '✨ 星辉祝福', desc: '品质+1' },
                                            ].map(tool => (
                                                <div key={tool.id} className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                                                    <span className="text-xs font-bold text-amber-700">{tool.name}</span>
                                                    <span className="text-[10px] text-slate-400">{tool.desc}</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={config.toolItems?.weights?.[tool.id] || 0}
                                                        onChange={(e) => {
                                                            const newWeights = { ...config.toolItems?.weights, [tool.id]: parseFloat(e.target.value) || 0 };
                                                            setConfig({
                                                                ...config,
                                                                toolItems: { ...config.toolItems, weights: newWeights }
                                                            });
                                                        }}
                                                        className="border rounded px-2 py-1 font-mono text-sm w-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 命运熔炉品质分布 */}
                                    <details className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                        <summary className="p-3 cursor-pointer hover:bg-slate-50 font-bold text-sm flex items-center gap-2 select-none">
                                            🔥 命运熔炉 - 品质概率分布
                                        </summary>
                                        <div className="p-3 space-y-2 bg-slate-50">
                                            {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rKey => (
                                                <div key={rKey} className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-slate-600 w-20 capitalize">{rKey}</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="1"
                                                        value={config.toolItems?.reforgeRarityWeights?.[rKey] || 0}
                                                        onChange={(e) => {
                                                            const newWeights = {
                                                                ...config.toolItems?.reforgeRarityWeights,
                                                                [rKey]: parseFloat(e.target.value) || 0
                                                            };
                                                            setConfig({
                                                                ...config,
                                                                toolItems: { ...config.toolItems, reforgeRarityWeights: newWeights }
                                                            });
                                                        }}
                                                        className="border rounded px-2 py-1 font-mono text-sm flex-1"
                                                    />
                                                </div>
                                            ))}
                                            <div className="text-xs text-slate-400 mt-1">
                                                总和: {Object.values(config.toolItems?.reforgeRarityWeights || {}).reduce((sum, v) => sum + v, 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </section>

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
                                                <th className="p-2 text-left">回收金币</th>
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
                    </div>
                </div>
            )}
        </>
    );
}
