// src/components/editor/LevelEditor.jsx
import React, { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MATRIX_CONFIG } from '../../data/matrixConfig';
import { LEVEL_TEMPLATES } from '../../data/levelTemplates';
import { generateWallFromTemplate } from '../../utils/templateGenerator';
import GridPainter from './GridPainter';
import CellPalette from './CellPalette';
import TemplatePreview from './TemplatePreview';

const EMPTY_GRID = () =>
  Array.from({ length: MATRIX_CONFIG.gridSize }, () => Array(MATRIX_CONFIG.gridSize).fill(null));

export default function LevelEditor() {
  const { templateId } = useParams();

  // Load existing template or start blank
  const existingTemplate = templateId
    ? LEVEL_TEMPLATES.find(t => t.id === templateId)
    : null;

  const [id, setId] = useState(existingTemplate?.id || '');
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [grid, setGrid] = useState(
    existingTemplate ? existingTemplate.grid.map(r => [...r]) : EMPTY_GRID()
  );
  const [constraints, setConstraints] = useState(
    existingTemplate?.constraints
      ? JSON.stringify(existingTemplate.constraints, null, 2)
      : '{}'
  );

  const [activeBrush, setActiveBrush] = useState(null);
  const [multiplier, setMultiplier] = useState(1);

  // Compute brushExtras based on current state
  const brushExtras = {};
  if (multiplier > 1 && activeBrush && activeBrush.includes('sticker')) {
    brushExtras.multiplier = multiplier;
  }

  // Test: generate a concrete wall from this template
  const [testResult, setTestResult] = useState(null);
  const handleTest = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const result = generateWallFromTemplate(template);
      setTestResult(result.grid);
    } catch (e) {
      alert('Constraints JSON 格式错误: ' + e.message);
    }
  };

  // Export as JSON
  const handleExport = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const json = JSON.stringify(template, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id || 'template'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Constraints JSON 格式错误: ' + e.message);
    }
  };

  // Save to localStorage
  const handleSave = () => {
    try {
      const parsedConstraints = JSON.parse(constraints);
      const template = { id, name, description, grid, constraints: parsedConstraints };
      const saved = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
      const idx = saved.findIndex(t => t.id === id);
      if (idx >= 0) saved[idx] = template;
      else saved.push(template);
      localStorage.setItem('levelTemplates', JSON.stringify(saved));
      alert('已保存到 localStorage');
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
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
        />

        {/* Center: Grid */}
        <div className="flex flex-col gap-4">
          <GridPainter
            grid={grid}
            onGridChange={setGrid}
            activeBrush={activeBrush}
            brushExtras={brushExtras}
          />
          <div className="flex gap-2">
            <button onClick={handleClear} className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600">清空</button>
            <button onClick={handleTest} className="px-3 py-1.5 bg-blue-700 rounded text-sm hover:bg-blue-600">测试生成</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-green-700 rounded text-sm hover:bg-green-600">保存</button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-purple-700 rounded text-sm hover:bg-purple-600">导出 JSON</button>
          </div>
        </div>

        {/* Right: Metadata + Test result */}
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
          <div>
            <label className="text-xs text-gray-400">约束 (JSON)</label>
            <textarea value={constraints} onChange={e => setConstraints(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm font-mono h-24"
              placeholder='{ "maxDoomInBlank": 0 }' />
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
