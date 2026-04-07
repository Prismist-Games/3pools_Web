import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BLACKJACK_CONFIG } from '../../data/v2Config';

const CELL_SIZE = 56;
const GAP = 6;

const BlackjackEvent = ({
    matrix,
    blackjackState,
    onSelectRow,
    onSelectColumn,
    onStand,
    onFinish,
    drawAnimState,
    isDrawAnimating,
}) => {
    const { t } = useLanguage();
    const { score, dealerScore, result } = blackjackState;
    const isPlaying = result === 'playing';
    const gridSize = matrix.length;

    // Check if board is empty (all cells null)
    const boardEmpty = matrix.every(row => row.every(cell => cell === null));

    return (
        <div className="flex flex-col items-center">
            {/* Score display */}
            <div className="mb-4 text-center">
                <div className="text-xs text-gray-400 mb-1">{t('当前点数')}</div>
                <div className={`text-4xl font-black ${
                    result === 'bust' ? 'text-red-500' :
                    score > 17 ? 'text-amber-500' :
                    'text-gray-800'
                }`}>
                    {score} <span className="text-lg text-gray-400">/ {BLACKJACK_CONFIG.bustThreshold}</span>
                </div>
            </div>

            {/* 5×5 number grid */}
            {isPlaying && (
                <div className="relative">
                    {/* Column click areas (top) */}
                    <div className="flex ml-[62px]" style={{ gap: GAP }}>
                        {Array.from({ length: gridSize }, (_, c) => {
                            const hasCell = matrix.some(row => row[c] !== null);
                            return (
                                <button
                                    key={`col-${c}`}
                                    onClick={() => hasCell && onSelectColumn(c)}
                                    disabled={!hasCell || isDrawAnimating}
                                    className={`flex items-center justify-center text-[10px] font-bold rounded transition-colors ${
                                        hasCell && !isDrawAnimating
                                            ? 'text-blue-400 hover:bg-blue-50 cursor-pointer'
                                            : 'text-gray-200 cursor-default'
                                    }`}
                                    style={{ width: CELL_SIZE, height: 20 }}
                                >
                                    {hasCell ? '▼' : ''}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex">
                        {/* Row click areas (left) */}
                        <div className="flex flex-col mr-1" style={{ gap: GAP }}>
                            {Array.from({ length: gridSize }, (_, r) => {
                                const hasCell = matrix[r].some(cell => cell !== null);
                                return (
                                    <button
                                        key={`row-${r}`}
                                        onClick={() => hasCell && onSelectRow(r)}
                                        disabled={!hasCell || isDrawAnimating}
                                        className={`flex items-center justify-center text-[10px] font-bold rounded transition-colors ${
                                            hasCell && !isDrawAnimating
                                                ? 'text-blue-400 hover:bg-blue-50 cursor-pointer'
                                                : 'text-gray-200 cursor-default'
                                        }`}
                                        style={{ width: 20, height: CELL_SIZE }}
                                    >
                                        {hasCell ? '▶' : ''}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Grid */}
                        <div
                            className="grid"
                            style={{
                                gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
                                gap: GAP,
                            }}
                        >
                            {matrix.flat().map((cell, i) => {
                                const r = Math.floor(i / gridSize);
                                const c = i % gridSize;
                                const isAnimHighlight = drawAnimState &&
                                    ((drawAnimState.direction === 'row' && drawAnimState.rowIndex === r && drawAnimState.currentHighlight === c) ||
                                     (drawAnimState.direction === 'column' && drawAnimState.colIndex === c && drawAnimState.currentHighlight === r));
                                const isSettled = drawAnimState?.phase === 'settled' &&
                                    drawAnimState.finalRowIndex === r && drawAnimState.finalColIndex === c;

                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-center rounded-lg font-black text-xl transition-all duration-100 ${
                                            cell === null
                                                ? 'bg-gray-100 border border-gray-200'
                                                : isSettled
                                                    ? 'bg-amber-400 text-white border-2 border-amber-500 scale-110'
                                                    : isAnimHighlight
                                                        ? 'bg-blue-100 border-2 border-blue-400'
                                                        : 'bg-white border border-gray-300 shadow-sm'
                                        }`}
                                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                    >
                                        {cell !== null ? cell.value : ''}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {isPlaying && !isDrawAnimating && (
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={onStand}
                        disabled={score === 0}
                        className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                            score === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                    >
                        {t('停手')}（{score} {t('点')}）
                    </button>
                    {boardEmpty && (
                        <span className="text-sm text-gray-400 self-center">{t('板上已无格子')}</span>
                    )}
                </div>
            )}

            {/* Result display */}
            {result !== 'playing' && (
                <div className="mt-6 text-center">
                    {result === 'bust' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-red-500 mb-1">💥 {t('爆掉了')}!</div>
                            <div className="text-sm text-gray-500">{score} &gt; {BLACKJACK_CONFIG.bustThreshold}</div>
                            <div className="text-sm text-red-500 font-bold mt-2">
                                {t('厄运')} +{BLACKJACK_CONFIG.loseOrBustPenalty}
                            </div>
                        </div>
                    )}
                    {result === 'win' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-green-500 mb-1">🎉 {t('你赢了')}!</div>
                            <div className="text-sm text-gray-500">
                                {t('你')}: {score} vs {t('庄家')}: {dealerScore}
                            </div>
                            <div className="text-sm text-green-500 font-bold mt-2">
                                {t('厄运')} {BLACKJACK_CONFIG.winReward}
                            </div>
                        </div>
                    )}
                    {result === 'lose' && (
                        <div className="mb-4">
                            <div className="text-2xl font-black text-red-500 mb-1">😞 {t('庄家赢了')}</div>
                            <div className="text-sm text-gray-500">
                                {t('你')}: {score} vs {t('庄家')}: {dealerScore}
                            </div>
                            <div className="text-sm text-red-500 font-bold mt-2">
                                {t('厄运')} +{BLACKJACK_CONFIG.loseOrBustPenalty}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onFinish}
                        className="px-8 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                    >
                        {t('继续')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BlackjackEvent;
