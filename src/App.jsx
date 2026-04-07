import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';
import LevelEditor from './components/editor/LevelEditor';
import LevelManager from './components/editor/LevelManager';

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/" element={<GameCore />} />
                <Route path="/editor" element={<LevelEditor />} />
                <Route path="/editor/:templateId" element={<LevelEditor />} />
                <Route path="/levels" element={<LevelManager />} />
            </Routes>
        </ErrorBoundary>
    );
}
