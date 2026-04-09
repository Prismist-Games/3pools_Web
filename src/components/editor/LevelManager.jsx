// src/components/editor/LevelManager.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LEVEL_TEMPLATES, LEVEL_SCHEDULE } from '../../data/levelTemplates';
import TemplatePreview from './TemplatePreview';

function loadLocalSchedule() {
  try {
    const s = localStorage.getItem('levelScheduleLocal');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function LevelManager() {
  const allTemplates = LEVEL_TEMPLATES.map(t => ({ ...t }));
  const mainTemplates = allTemplates.filter(t => t.role !== 'sub');
  const subTemplates = allTemplates.filter(t => t.role === 'sub');

  // Local mode: overrides are stored in localStorage and used by pickTemplate at runtime
  const [localMode, setLocalMode] = useState(() => !!loadLocalSchedule());
  const initialSchedule = loadLocalSchedule() || LEVEL_SCHEDULE;
  const [proceduralWeight, setProceduralWeight] = useState(initialSchedule.proceduralWeight);
  const [levels, setLevels] = useState({ ...initialSchedule.levels });

  const getSchedule = (templateId) => {
    return levels[templateId] || { enabled: false, weight: 10, minExpedition: 1 };
  };

  const updateSchedule = (templateId, patch) => {
    const newLevels = {
      ...levels,
      [templateId]: { ...getSchedule(templateId), ...patch },
    };
    setLevels(newLevels);
    if (localMode) saveToLocal(proceduralWeight, newLevels);
  };

  const handleProceduralWeightChange = (val) => {
    setProceduralWeight(val);
    if (localMode) saveToLocal(val, levels);
  };

  const saveToLocal = (pw, lvls) => {
    localStorage.setItem('levelScheduleLocal', JSON.stringify({ proceduralWeight: pw, levels: lvls }));
  };

  const toggleLocalMode = () => {
    if (localMode) {
      // Turning off: remove localStorage override, reset to file defaults
      localStorage.removeItem('levelScheduleLocal');
      setProceduralWeight(LEVEL_SCHEDULE.proceduralWeight);
      setLevels({ ...LEVEL_SCHEDULE.levels });
      setLocalMode(false);
    } else {
      // Turning on: save current state to localStorage
      saveToLocal(proceduralWeight, levels);
      setLocalMode(true);
    }
  };

  // Save to file (for committing to Git)
  const handleSaveFile = async () => {
    const config = { proceduralWeight, levels };
    const json = JSON.stringify(config, null, 2);

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'levelSchedule.json',
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'levelSchedule.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex gap-4 mb-6 text-sm">
        <Link to="/" className="text-blue-400 hover:underline">← 返回游戏</Link>
        <Link to="/editor" className="text-blue-400 hover:underline">新建关卡</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">关卡管理</h1>

      {/* Mode toggle + procedural weight */}
      <div className="mb-6 p-4 bg-gray-900/60 rounded-lg flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={localMode} onChange={toggleLocalMode}
              className="w-4 h-4" />
            <span className="text-sm font-bold">本地模式</span>
          </label>
          <span className="text-xs text-gray-500">
            {localMode ? '改动即时生效（存 localStorage），刷新后保留' : '使用文件配置（需保存文件 + 重新部署）'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">纯随机墙权重:</span>
          <input type="range" min={0} max={100} value={proceduralWeight}
            onChange={e => handleProceduralWeightChange(Number(e.target.value))}
            className="w-48" />
          <span className="text-sm font-mono w-8">{proceduralWeight}</span>
          <span className="text-xs text-gray-500">(越高，关卡墙出现概率越低)</span>
        </div>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainTemplates.map(template => {
          const schedule = getSchedule(template.id);
          return (
            <div key={template.id}
              className={`p-4 rounded-lg border transition-all ${
                schedule.enabled
                  ? 'bg-gray-900/80 border-gray-600'
                  : 'bg-gray-900/30 border-gray-800 opacity-60'
              }`}
            >
              <div className="flex gap-3 mb-3">
                <TemplatePreview grid={template.grid} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{template.name || template.id}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                </div>
              </div>

              {/* Schedule controls */}
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={schedule.enabled}
                    onChange={e => updateSchedule(template.id, { enabled: e.target.checked })} />
                  <span>启用</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">权重</span>
                  <input type="range" min={0} max={50} value={schedule.weight}
                    onChange={e => updateSchedule(template.id, { weight: Number(e.target.value) })}
                    className="flex-1" />
                  <span className="font-mono text-xs w-6">{schedule.weight}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">最低探险</span>
                  <select value={schedule.minExpedition}
                    onChange={e => updateSchedule(template.id, { minExpedition: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-0.5">
                    <option value={1}>第1次</option>
                    <option value={2}>第2次</option>
                    <option value={3}>第3次</option>
                  </select>
                </div>
              </div>

              {/* Edit link */}
              <Link to={`/editor/${template.id}`}
                className="block mt-3 text-xs text-blue-400 hover:underline">
                编辑关卡 →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Sub-levels */}
      {subTemplates.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-8 mb-4">子关卡</h2>
          <p className="text-xs text-gray-500 mb-4">子关卡不会出现在 3 选 1 中，而是作为入口格子放置在主关卡上。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subTemplates.map(template => (
              <div key={template.id} className="p-4 rounded-lg border bg-amber-900/20 border-amber-700/40">
                <div className="flex gap-3 mb-3">
                  <TemplatePreview grid={template.grid} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm truncate">{template.name || template.id}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-800 rounded">子关卡</span>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                  </div>
                </div>
                <Link to={`/editor/${template.id}`} className="text-xs text-blue-400 hover:underline">
                  编辑关卡 →
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Save to file button */}
      <div className="mt-6">
        <button onClick={handleSaveFile}
          className="px-4 py-2 bg-green-700 rounded text-sm hover:bg-green-600">
          保存为文件
        </button>
        <span className="text-xs text-gray-500 ml-3">导出 levelSchedule.json（用于提交到 Git）</span>
      </div>
    </div>
  );
}
