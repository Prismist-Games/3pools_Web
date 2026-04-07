import React from 'react';
import { Link } from 'react-router-dom';

export default function LevelEditor() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <Link to="/" className="text-blue-400 hover:underline text-sm">← 返回游戏</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">关卡编辑器（构建中）</h1>
    </div>
  );
}
