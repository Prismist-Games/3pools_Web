// src/components/editor/LevelEditor.jsx
import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MATRIX_CONFIG } from '../../data/matrixConfig';
import { LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { generateWallFromTemplate } from '../../utils/templateGenerator';
import GridPainter from './GridPainter';
import CellPalette from './CellPalette';
import TemplatePreview from './TemplatePreview';

const EMPTY_GRID = () =>
  Array.from({ length: MATRIX_CONFIG.gridSize }, () => Array(MATRIX_CONFIG.gridSize).fill(null));

/** Count distinct group numbers used on sticker cells in the grid */
function countDistinctGroups(grid) {
  const groups = new Set();
  for (const row of grid) {
    for (const cell of row) {
      if (typeof cell === 'object' && cell !== null && cell.group !== undefined) {
        groups.add(cell.group);
      }
    }
  }
  return groups.size;
}

export default function LevelEditor() {
  const { templateId } = useParams();

  const existingTemplate = templateId
    ? LEVEL_TEMPLATES.find(t => t.id === templateId)
    : null;

  const existingSettings = existingTemplate?.settings || existingTemplate?.constraints || {};

  const [id, setId] = useState(existingTemplate?.id || '');
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [grid, setGrid] = useState(
    existingTemplate ? existingTemplate.grid.map(r => [...r]) : EMPTY_GRID()
  );

  // Settings state (structured, not JSON)
  const [stickerMin, setStickerMin] = useState(existingSettings.stickerTypeRange?.[0] ?? 3);
  const [stickerMax, setStickerMax] = useState(existingSettings.stickerTypeRange?.[1] ?? 4);
  const [maxDoomInBlank, setMaxDoomInBlank] = useState(existingSettings.maxDoomInBlank ?? -1); // -1 = no limit

  // Brush state
  const [activeBrush, setActiveBrush] = useState(null);
  const [multiplier, setMultiplier] = useState(1);

  // Group mode state
  const [groupMode, setGroupMode] = useState(false);
  const [activeGroupNumber, setActiveGroupNumber] = useState(0);

  // Auto-compute lower bound for sticker types
  const distinctGroups = useMemo(() => countDistinctGroups(grid), [grid]);
  const effectiveMin = Math.max(stickerMin, distinctGroups);
  const effectiveMax = Math.max(stickerMax, effectiveMin);

  // Brush extras
  const brushExtras = {};
  if (multiplier > 1 && activeBrush) {
    brushExtras.multiplier = multiplier;
  }

  // Build settings object
  const buildSettings = () => {
    const s = {};
    s.stickerTypeRange = [effectiveMin, effectiveMax];
    if (maxDoomInBlank >= 0) s.maxDoomInBlank = maxDoomInBlank;
    return s;
  };

  // Test generate
  const [testResult, setTestResult] = useState(null);
  const handleTest = () => {
    const template = { id, name, description, grid, settings: buildSettings() };
    const result = generateWallFromTemplate(template);
    setTestResult(result.grid);
  };

  // Save as JSON file (download to disk, then place in src/data/levels/)
  const handleSave = () => {
    if (!id.trim()) {
      alert('请填写关卡 ID');
      return;
    }
    const template = { id, name, description, grid, settings: buildSettings() };
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => setGrid(EMPTY_GRID());

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Nav */}
      <div className="flex gap-4 mb-6 text-sm">
        <Link to="/" className="text-blue-400 hover:underline">← 返回游戏</Link>
        <Link to="/levels" className="text-blue-400 hover:underline">关卡管理</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">关卡编辑器</h1>

      <div className="flex gap-8 flex-wrap">
        {/* Left: Palette */}
        <CellPalette
          activeBrush={activeBrush}
          onBrushChange={setActiveBrush}
          multiplier={multiplier}
          onMultiplierChange={setMultiplier}
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          activeGroupNumber={activeGroupNumber}
          onActiveGroupNumberChange={setActiveGroupNumber}
        />

        {/* Center: Grid */}
        <div className="flex flex-col gap-4">
          <GridPainter
            grid={grid}
            onGridChange={setGrid}
            activeBrush={activeBrush}
            brushExtras={brushExtras}
            groupMode={groupMode}
            activeGroupNumber={activeGroupNumber}
          />
          <div className="flex gap-2">
            <button onClick={handleClear} className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600">清空</button>
            <button onClick={handleTest} className="px-3 py-1.5 bg-blue-700 rounded text-sm hover:bg-blue-600">测试生成</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-green-700 rounded text-sm hover:bg-green-600">保存 JSON</button>
          </div>
        </div>

        {/* Right: Metadata + Settings + Test result */}
        <div className="flex flex-col gap-3 min-w-[250px]">
          <div>
            <label className="text-xs text-gray-400">ID</label>
            <input value={id} onChange={e => setId(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" placeholder="bomb_ring" />
          </div>
          <div>
            <label className="text-xs text-gray-400">名称</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm" placeholder="炸弹圈" />
          </div>
          <div>
            <label className="text-xs text-gray-400">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm h-16" placeholder="关卡描述..." />
          </div>

          {/* Wall settings */}
          <div className="p-3 bg-gray-900/60 rounded-lg flex flex-col gap-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">墙设置</div>

            {/* Sticker type range */}
            <div>
              <label className="text-xs text-gray-400">贴纸种类数</label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={effectiveMin}
                  onChange={e => setStickerMin(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n} disabled={n < distinctGroups}>
                      {n}{n < distinctGroups ? ` (已用${distinctGroups}组)` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">~</span>
                <select
                  value={effectiveMax}
                  onChange={e => setStickerMax(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n} disabled={n < effectiveMin}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">种</span>
              </div>
              {distinctGroups > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">已使用 {distinctGroups} 个编组，下限自动锁定</p>
              )}
            </div>

            {/* Max doom in blank */}
            <div>
              <label className="text-xs text-gray-400">空白区厄运上限</label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={maxDoomInBlank}
                  onChange={e => setMaxDoomInBlank(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded text-xs px-1.5 py-1"
                >
                  <option value={-1}>不限</option>
                  {[0,1,2,3,4,5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Test result preview */}
          {testResult && (
            <div>
              <div className="text-xs text-gray-400 mb-1">测试生成结果</div>
              <TemplatePreview grid={testResult} size="md" />
              <button onClick={handleTest} className="mt-2 text-xs text-blue-400 hover:underline">重新生成</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
