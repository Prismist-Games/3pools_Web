import React, { useState } from 'react';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';
import Prologue from './components/game/Prologue';

export default function App() {
    const [playerInfo, setPlayerInfo] = useState(null);

    return (
        <ErrorBoundary>
            {playerInfo ? (
                <GameCore playerInfo={playerInfo} />
            ) : (
                <Prologue onComplete={setPlayerInfo} />
            )}
        </ErrorBoundary>
    );
}
