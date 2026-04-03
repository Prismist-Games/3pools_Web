import React from 'react';
import GameCore from './GameCore';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
            <GameCore />
        </ErrorBoundary>
    );
}
