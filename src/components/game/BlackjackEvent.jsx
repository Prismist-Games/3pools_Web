import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BLACKJACK_CONFIG } from '../../data/v2Config';

const CELL_SIZE = 56;
const GAP = 6;
const HALF = GAP / 2;
const TRACK = CELL_SIZE + GAP;
const ROW_BTN_WIDTH = 36;
const ROW_BTN_MARGIN = 8;

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
                <div>
                    {/* Column buttons — offset by row button area */}
                    <div className="flex mb-1" style={{ paddingLeft: ROW_BTN_WIDTH + ROW_BTN_MARGIN }}>
                        {Array.from({ length: gridSize }, (_, c) => {
                            const hasCell = matrix.some(row => row[c] !== null);
                            const clickable = hasCell && !isDrawAnimating;
                            return (
                                <button
                                    key={`col-${c}`}
                                    onClick={() => clickable && onSelectColumn(c)}
                                    disabled={!clickable}
                                    className={`
                                        rounded-lg text-xs font-black flex-shrink-0
                                        flex items-center justify-center
                                        transition-all duration-150 shadow-sm
                                        ${clickable
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 cursor-pointer'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }
                                    `}
                                    style={{ width: CELL_SIZE, height: 24, marginRight: GAP }}
                                >
                                    ▼
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-start">
                        {/* Row buttons */}
                        <div className="flex flex-col mr-2" style={{ paddingTop: HALF }}>
                            {Array.from({ length: gridSize }, (_, r) => {
                                const hasCell = matrix[r].some(cell => cell !== null);
                                const clickable = hasCell && !isDrawAnimating;
                                return (
                                    <button
                                        key={`row-${r}`}
                                        onClick={() => clickable && onSelectRow(r)}
                                        disabled={!clickable}
                                        className={`
                                            rounded-lg text-xs font-black flex-shrink-0
                                            flex items-center justify-center
                                            transition-all duration-150 shadow-sm
                                            ${clickable
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 cursor-pointer'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }
                                        `}
                                        style={{ width: ROW_BTN_WIDTH, height: CELL_SIZE, marginBottom: GAP }}
                                    >
                                        ▶
                                    </button>
                                );
                            })}
                        </div>

                        {/* Grid */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${gridSize}, ${TRACK}px)`,
                                gridTemplateRows: `repeat(${gridSize}, ${TRACK}px)`,
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
                                        style={{
                                            width: CELL_SIZE,
                                            height: CELL_SIZE,
                                            margin: `${HALF}px`,
                                        }}
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
