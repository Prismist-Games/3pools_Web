import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';
import LevelEditor from './components/editor/LevelEditor';
import LevelManager from './components/editor/LevelManager';
import Prologue from './components/game/Prologue';

function GameWithPrologue() {
    const [playerInfo, setPlayerInfo] = useState(null);
    return playerInfo ? (
        <GameCore playerInfo={playerInfo} />
    ) : (
        <Prologue onComplete={setPlayerInfo} />
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/" element={<GameWithPrologue />} />
                <Route path="/editor" element={<LevelEditor />} />
                <Route path="/editor/:templateId" element={<LevelEditor />} />
                <Route path="/levels" element={<LevelManager />} />
            </Routes>
        </ErrorBoundary>
    );
}
