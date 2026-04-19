import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';
import Prologue from './components/game/Prologue';

function GameWithPrologue() {
    const [playerInfo, setPlayerInfo] = useState(null);
    return playerInfo ? (
        <GameCore />
    ) : (
        <Prologue onComplete={setPlayerInfo} />
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/" element={<GameWithPrologue />} />
            </Routes>
        </ErrorBoundary>
    );
}
