import React from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { INITIAL_GAME_CONFIG } from './data/constants';
import ResourceMatrix from './components/game/ResourceMatrix';
import { useLanguage } from './contexts/LanguageContext';
import { Toast } from './components/ui/Toast';

const GameCore = () => {
    const { t } = useLanguage();

    const state = useGameLogic(INITIAL_GAME_CONFIG);

    const {
        turnNumber, gold, phase,
        matrix, lastDrawResult,
        hp, doomGrid, doomLevel, dangerCount,
        doomResolutionResult,
        inventory, maxInventorySize,
        toast, modalContent,
        startGame, selectRow, endTurn, continueToNextTurn,
        handleEvacuate, handleReset,
    } = state;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold">{t('三池物语')} <span className="text-sm text-gray-400">— {t('回合制原型')}</span></h1>
                    <button
                        onClick={handleReset}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                        {t('重置')}
                    </button>
                </div>

                {/* Status Bar */}
                <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg shadow-sm border text-sm">
                    <div>❤️ <span className="font-bold">{hp}</span> HP</div>
                    <div>💰 <span className="font-bold">{gold}</span> {t('金币')}</div>
                    <div>📅 {t('回合')} <span className="font-bold">{turnNumber}</span></div>
                    <div>💀 {t('厄运等级')} <span className="font-bold">{doomLevel}</span></div>
                    <div>🎒 <span className="font-bold">{inventory.length}/{maxInventorySize}</span></div>
                </div>

                {/* Pre-game state */}
                {phase === 'pre_game' && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">{t('三池物语')}</h2>
                        <p className="text-gray-500 mb-8">{t('回合制原型')}</p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                            {t('开始游戏')}
                        </button>
                    </div>
                )}

                {/* Drawing phase */}
                {phase === 'drawing' && matrix && (
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                        {/* Left: Grid */}
                        <div>
                            <ResourceMatrix
                                matrix={matrix}
                                onSelectRow={selectRow}
                                gold={gold}
                                drawCost={INITIAL_GAME_CONFIG.turn.drawCost}
                                phase={phase}
                            />

                            {/* Draw result feedback */}
                            {lastDrawResult && (
                                <div className={`mt-3 p-2 rounded text-sm ${
                                    lastDrawResult.obtained
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {lastDrawResult.obtained
                                        ? `${t('获得')}: ${lastDrawResult.obtained.item.icon} ${lastDrawResult.obtained.item.name}`
                                        : t('未获得物品')
                                    }
                                </div>
                            )}

                            {/* End turn button */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={endTurn}
                                    className="px-6 py-2 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                                >
                                    {t('结束回合')}
                                </button>
                                {gold <= 0 && (
                                    <span className="text-sm text-gray-400 self-center">{t('金币已用完')}</span>
                                )}
                            </div>
                        </div>

                        {/* Right: Doom Grid + Inventory */}
                        <div className="w-64 flex flex-col gap-4">
                            {/* Doom Grid */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('厄运网格')}</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {doomGrid.map((cell, i) => (
                                        <div
                                            key={i}
                                            className={`w-10 h-10 rounded flex items-center justify-center text-sm border
                                                ${cell.type === 'danger'
                                                    ? 'bg-red-100 border-red-300 text-red-600 font-bold'
                                                    : 'bg-gray-50 border-gray-200 text-gray-300'
                                                }`}
                                        >
                                            {cell.type === 'danger' ? '☠' : '·'}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {t('危险')}: {dangerCount}/{doomGrid.length}
                                </div>
                            </div>

                            {/* Inventory */}
                            <div className="bg-white rounded-lg shadow-sm border p-3">
                                <h3 className="text-sm font-bold mb-2">{t('背包')} ({inventory.length}/{maxInventorySize})</h3>
                                <div className="grid grid-cols-5 gap-1">
                                    {Array.from({ length: maxInventorySize }).map((_, i) => {
                                        const item = inventory[i];
                                        return (
                                            <div
                                                key={i}
                                                className={`w-10 h-10 rounded flex items-center justify-center text-lg border
                                                    ${item
                                                        ? 'bg-white border-gray-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                                title={item?.name || ''}
                                            >
                                                {item ? item.icon : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Between turns */}
                {phase === 'between_turns' && (
                    <div className="text-center py-12">
                        <h2 className="text-xl font-bold mb-2">{t('回合')} {turnNumber} {t('结束')}</h2>
                        <p className="text-gray-500 mb-2">
                            {t('背包')}: {inventory.length}/{maxInventorySize} | HP: {hp} | {t('厄运等级')}: {doomLevel}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            {t('下回合将增加')} 1 {t('个危险格子')}
                        </p>

                        {/* Doom Grid preview */}
                        <div className="inline-block mb-6">
                            <div className="grid grid-cols-5 gap-1">
                                {doomGrid.map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-xs border
                                            ${cell.type === 'danger'
                                                ? 'bg-red-100 border-red-300 text-red-600'
                                                : 'bg-gray-50 border-gray-200 text-gray-300'
                                            }`}
                                    >
                                        {cell.type === 'danger' ? '☠' : '·'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={continueToNextTurn}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('继续下一回合')}
                            </button>
                            <button
                                onClick={handleEvacuate}
                                className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                            >
                                {t('撤离')}（{inventory.length} {t('个物品')}）
                            </button>
                        </div>
                    </div>
                )}

                {/* Game over / Evacuated */}
                {phase === 'game_over' && (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-4">
                            {modalContent === 'evacuated' ? t('安全撤离') : t('游戏结束')}
                        </h2>
                        <p className="text-gray-500 mb-2">
                            {t('回合')}: {turnNumber} | {t('收集物品')}: {inventory.length}
                        </p>
                        {modalContent === 'game_over' && (
                            <p className="text-red-500 mb-4">{t('失去了一半物品')}</p>
                        )}

                        {/* Show inventory */}
                        {inventory.length > 0 && (
                            <div className="inline-block mb-6">
                                <h3 className="text-sm text-gray-500 mb-2">{t('带出的物品')}</h3>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {inventory.map((item, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded border border-gray-300 bg-white flex items-center justify-center text-lg"
                                            title={item.name}
                                        >
                                            {item.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                            >
                                {t('再来一局')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Doom resolution result */}
                {doomResolutionResult && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg">
                        <div className="text-sm">
                            💀 {t('厄运结算')}:
                            {doomResolutionResult.hits.map((hit, i) => (
                                <span key={i} className={`ml-1 ${hit.result === 'danger' ? 'text-red-400' : 'text-gray-400'}`}>
                                    {hit.result === 'danger' ? '💥' : '·'}
                                </span>
                            ))}
                            {doomResolutionResult.hpLoss > 0 && (
                                <span className="text-red-400 ml-2">-{doomResolutionResult.hpLoss} HP</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
            </div>
        </div>
    );
};

export default GameCore;
