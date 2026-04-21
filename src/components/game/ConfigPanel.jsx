import React, { useState, useSyncExternalStore } from 'react';
import { X, Download, Upload, RotateCcw } from 'lucide-react';
import { LIVE_CONFIG, bumpConfig, resetConfig, exportConfigJSON, importConfigJSON, subscribeConfig, getConfigVersion } from '../../data/runtimeConfig';
import { QUALITY_CONFIG } from '../../data/v2Config';

// Subscribe hook — re-renders whenever LIVE_CONFIG is mutated via bumpConfig / resetConfig / importConfigJSON.
function useLiveConfigVersion() {
    return useSyncExternalStore(subscribeConfig, getConfigVersion, getConfigVersion);
}

// ─── Small controlled number input ────────────────────────────────
function NumInput({ value, onChange, step = 0.01, min = 0, max = 1, width = 'w-20' }) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className={`${width} px-1.5 py-0.5 text-xs border border-gray-600 bg-gray-800 text-gray-100 rounded`}
        />
    );
}

function IntInput({ value, onChange, min = 0, max = 999, width = 'w-16' }) {
    return (
        <input
            type="number"
            value={value}
            step={1}
            min={min}
            max={max}
            onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
            className={`${width} px-1.5 py-0.5 text-xs border border-gray-600 bg-gray-800 text-gray-100 rounded`}
        />
    );
}

// ─── Section A: 品质 roll ─────────────────────────────────────────
function QualityWeightsSection() {
    const qw = LIVE_CONFIG.qualityWeights;
    const keys = Object.keys(qw).map(Number).sort((a, b) => a - b);
    const sum = keys.reduce((s, k) => s + qw[k], 0);
    const colors = { 1: '白', 2: '绿', 3: '蓝', 4: '紫', 5: '橙' };
    return (
        <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-100 mb-2">A. 品质 roll 概率</h3>
            <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1.5 items-center text-xs text-gray-300">
                {keys.map(k => {
                    const qd = QUALITY_CONFIG.find(q => q.id === k);
                    return (
                        <React.Fragment key={k}>
                            <span>{qd?.stars || '?'} ({colors[k] || k})</span>
                            <NumInput value={qw[k]} onChange={v => { qw[k] = v; bumpConfig(); }} step={0.01} max={1} />
                            <span className="text-gray-500">{(qw[k] * 100).toFixed(1)}%</span>
                        </React.Fragment>
                    );
                })}
            </div>
            <div className={`text-[11px] mt-1 ${Math.abs(sum - 1) < 0.001 ? 'text-green-400' : 'text-orange-400'}`}>
                合计: {(sum * 100).toFixed(1)}% {Math.abs(sum - 1) < 0.001 ? '' : '(应为 100%)'}
            </div>
        </section>
    );
}

// ─── Section B: 墙面符号比例 ───────────────────────────────────────
function CellSpawnSection() {
    const cs = LIVE_CONFIG.cellSpawn;
    const sw = LIVE_CONFIG.shapeWeights;
    const specialTotal = cs.doom + cs.gold + cs.order + cs.bomb;
    const ingredientPct = (1 - specialTotal) * 100;
    const shapeKeys = Object.keys(sw).map(Number).sort((a, b) => a - b);
    const shapeTotal = shapeKeys.reduce((s, k) => s + sw[k], 0);
    return (
        <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-100 mb-2">B. 墙面符号比例</h3>
            <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1.5 items-center text-xs text-gray-300">
                <span>🧑 厄运</span>
                <NumInput value={cs.doom} onChange={v => { cs.doom = v; bumpConfig(); }} />
                <span className="text-gray-500">{(cs.doom * 100).toFixed(1)}%</span>

                <span>🎫 抽数</span>
                <NumInput value={cs.gold} onChange={v => { cs.gold = v; bumpConfig(); }} />
                <span className="text-gray-500">{(cs.gold * 100).toFixed(1)}%</span>

                <span>📋 订单</span>
                <NumInput value={cs.order} onChange={v => { cs.order = v; bumpConfig(); }} />
                <span className="text-gray-500">{(cs.order * 100).toFixed(1)}%</span>

                <span>💣 炸弹</span>
                <NumInput value={cs.bomb} onChange={v => { cs.bomb = v; bumpConfig(); }} />
                <span className="text-gray-500">{(cs.bomb * 100).toFixed(1)}%</span>

                <span className="text-gray-400 italic">🍴 食材格</span>
                <span className="text-gray-500">(余下)</span>
                <span className={`${ingredientPct < 40 ? 'text-orange-400' : 'text-green-400'}`}>{ingredientPct.toFixed(1)}%</span>
            </div>
            {specialTotal > 1 && (
                <div className="text-[11px] text-red-400 mt-1">
                    ⚠ 特殊格合计 {(specialTotal * 100).toFixed(1)}% 已 &gt; 100%
                </div>
            )}

            <h4 className="text-xs font-bold text-gray-200 mt-3 mb-1">食材形状权重（1/2/3 格）</h4>
            <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1.5 items-center text-xs text-gray-300">
                {shapeKeys.map(k => (
                    <React.Fragment key={k}>
                        <span>{k} 格</span>
                        <IntInput value={sw[k]} onChange={v => { sw[k] = v; bumpConfig(); }} min={0} max={999} />
                        <span className="text-gray-500">{shapeTotal > 0 ? ((sw[k] / shapeTotal) * 100).toFixed(0) : 0}%</span>
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
}

// ─── Section C: 订单模板 ───────────────────────────────────────────
function OrderTemplatesSection() {
    const tpls = LIVE_CONFIG.orderTemplates;
    const totalW = tpls.reduce((s, t) => s + t.weight, 0);
    return (
        <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-100 mb-2">C. 订单模板</h3>
            <div className="flex flex-col gap-2">
                {tpls.map((t, i) => (
                    <div key={t.id} className="border border-gray-700 rounded p-2 bg-gray-900/50">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-gray-200">{t.id}</span>
                            <span className="text-[10px] text-gray-500">
                                选中概率 {totalW > 0 ? ((t.weight / totalW) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 items-center text-[11px] text-gray-300">
                            <span>weight</span>
                            <IntInput value={t.weight} onChange={v => { tpls[i].weight = v; bumpConfig(); }} />

                            <span>reward quality</span>
                            <IntInput value={t.rewardQuality} onChange={v => { tpls[i].rewardQuality = Math.max(1, Math.min(5, v)); bumpConfig(); }} min={1} max={5} />

                            <span>ingredient types</span>
                            <IntInput value={t.ingredientTypes} onChange={v => { tpls[i].ingredientTypes = Math.max(1, Math.min(20, v)); bumpConfig(); }} min={1} max={20} />

                            {t.qualityDist ? (
                                <>
                                    <span>qualityDist</span>
                                    <div className="flex gap-1">
                                        {t.qualityDist.map((q, j) => (
                                            <IntInput key={j} value={q} onChange={v => { tpls[i].qualityDist[j] = Math.max(1, Math.min(5, v)); bumpConfig(); }} min={1} max={5} width="w-12" />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span>reqBudget</span>
                                    <IntInput value={t.reqBudget || 0} onChange={v => { tpls[i].reqBudget = Math.max(1, v); bumpConfig(); }} min={1} max={50} />
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Section D: 最低品质食材格 ────────────────────────────────────
function MinQualitySection() {
    const mq = LIVE_CONFIG.minQuality;
    const weightKeys = Object.keys(mq.weights).map(Number).sort((a, b) => a - b);
    const sum = weightKeys.reduce((s, k) => s + mq.weights[k], 0);
    const colors = { 2: '绿', 3: '蓝', 4: '紫' };
    return (
        <section className="mb-5">
            <h3 className="text-sm font-bold text-gray-100 mb-2">D. 最低品质食材格</h3>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5 items-center text-xs text-gray-300 mb-3">
                <span>每墙数量范围</span>
                <div className="flex items-center gap-1">
                    <IntInput value={mq.countRange[0]} onChange={v => { mq.countRange[0] = Math.max(0, Math.min(v, mq.countRange[1])); bumpConfig(); }} min={0} max={16} width="w-12" />
                    <span className="text-gray-500">–</span>
                    <IntInput value={mq.countRange[1]} onChange={v => { mq.countRange[1] = Math.max(mq.countRange[0], v); bumpConfig(); }} min={0} max={16} width="w-12" />
                </div>
                <span className="text-gray-500">组</span>
            </div>
            <div className="text-xs text-gray-400 mb-1.5">最低品质档次分布：</div>
            <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1.5 items-center text-xs text-gray-300">
                {weightKeys.map(k => {
                    const qd = QUALITY_CONFIG.find(q => q.id === k);
                    return (
                        <React.Fragment key={k}>
                            <span>{qd?.stars || '?'} ({colors[k] || k})</span>
                            <NumInput value={mq.weights[k]} onChange={v => { mq.weights[k] = v; bumpConfig(); }} step={0.01} max={1} />
                            <span className="text-gray-500">{(mq.weights[k] * 100).toFixed(1)}%</span>
                        </React.Fragment>
                    );
                })}
            </div>
            <div className={`text-[11px] mt-1 ${Math.abs(sum - 1) < 0.001 ? 'text-green-400' : 'text-orange-400'}`}>
                合计: {(sum * 100).toFixed(1)}% {Math.abs(sum - 1) < 0.001 ? '' : '(应为 100%)'}
            </div>
        </section>
    );
}

// ─── Panel root ───────────────────────────────────────────────────
export default function ConfigPanel({ onClose }) {
    useLiveConfigVersion();
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState(null);

    const handleExport = () => {
        const text = exportConfigJSON();
        navigator.clipboard.writeText(text).catch(() => {});
        setImportText(text);
        setImportError('已复制到剪贴板（也显示在下方文本框）');
        setTimeout(() => setImportError(null), 2000);
    };

    const handleImport = () => {
        try {
            importConfigJSON(importText);
            setImportError('导入成功');
            setTimeout(() => setImportError(null), 2000);
        } catch (e) {
            setImportError('导入失败：' + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-xl my-8 text-gray-100">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
                    <span className="text-sm font-bold">⚙ 配置面板（实时生效，不持久化）</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4">
                    <QualityWeightsSection />
                    <CellSpawnSection />
                    <MinQualitySection />
                    <OrderTemplatesSection />

                    <div className="border-t border-gray-700 pt-3 mt-2">
                        <div className="flex gap-2 mb-2">
                            <button onClick={resetConfig} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded">
                                <RotateCcw size={12} /> 重置默认
                            </button>
                            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 rounded">
                                <Download size={12} /> 导出 JSON
                            </button>
                            <button onClick={handleImport} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 rounded">
                                <Upload size={12} /> 导入
                            </button>
                        </div>
                        <textarea
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            placeholder="粘贴导出的 JSON 到这里再点「导入」"
                            className="w-full h-28 text-[10px] font-mono px-2 py-1 border border-gray-700 bg-gray-800 text-gray-200 rounded resize-none"
                        />
                        {importError && (
                            <div className={`text-[11px] mt-1 ${importError.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>
                                {importError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
