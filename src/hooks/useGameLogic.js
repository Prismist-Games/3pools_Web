import { useState, useMemo } from 'react';
import { generateTurnMatrix } from '../utils/matrixHelpers';
import { DOOM_CONFIG, TURN_CONFIG } from '../data/constants';

import { useLanguage } from '../contexts/LanguageContext';

export const useGameLogic = (config) => {
    const { t } = useLanguage();

    // --- Configuration ---
    const doomConfig = config.doom || DOOM_CONFIG;
    const turnConfig = config.turn || TURN_CONFIG;
    const maxInventorySize = config.stages[0].inventorySize;

    // --- Turn State ---
    const [turnNumber, setTurnNumber] = useState(0);
    const [gold, setGold] = useState(0);
    const [phase, setPhase] = useState('pre_game'); // 'pre_game' | 'drawing' | 'between_turns' | 'game_over'

    // --- Grid State ---
    const [matrix, setMatrix] = useState(null);

    // --- Doom State ---
    const [hp, setHp] = useState(doomConfig.initialHP);
    const [doomGrid, setDoomGrid] = useState(() => {
        const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
        for (let i = 0; i < doomConfig.initialDangerCount; i++) {
            grid[i] = { type: 'danger' };
        }
        return grid;
    });
    const [doomLevel, setDoomLevel] = useState(doomConfig.initialDoomLevel);
    const [isDoomResolving, setIsDoomResolving] = useState(false);
    const [doomAnimState, setDoomAnimState] = useState(null);
    const [doomResolutionResult, setDoomResolutionResult] = useState(null);
    const [afterDoomAction, setAfterDoomAction] = useState(null); // null | 'end_turn'

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [flyingItem, setFlyingItem] = useState(null);

    // --- Derived State ---
    const dangerCount = useMemo(() =>
        doomGrid.filter(cell => cell.type === 'danger').length,
        [doomGrid]
    );

    // =============================================
    // TURN FLOW
    // =============================================

    /** Start a new turn: generate grid, give gold */
    const startNewTurn = () => {
        const newTurnNumber = turnNumber + 1;
        setTurnNumber(newTurnNumber);
        setGold(turnConfig.goldPerTurn);
        setLastDrawResult(null);

        // Generate fresh grid
        const { grid } = generateTurnMatrix(config.pools);
        setMatrix(grid);

        // Doom accumulation (not on first turn)
        if (newTurnNumber > 1) {
            setDoomGrid(prev => {
                const newGrid = [...prev];
                let added = 0;
                for (let i = 0; i < newGrid.length && added < doomConfig.dangerPerTurn; i++) {
                    if (newGrid[i].type === 'empty') {
                        newGrid[i] = { type: 'danger' };
                        added++;
                    }
                }
                return newGrid;
            });
        }

        setPhase('drawing');
    };

    /** Start the game (first turn) */
    const startGame = () => {
        startNewTurn();
    };

    /** End current turn: resolve doom once, then go to between-turns decision */
    const endTurn = () => {
        resolveDoom('end_turn');
    };

    /** Continue to next turn */
    const continueToNextTurn = () => {
        startNewTurn();
    };

    // =============================================
    // DRAW MECHANIC
    // =============================================

    /** Select a row to draw from */
    const selectRow = (rowIndex) => {
        if (phase !== 'drawing') return;
        if (isDoomResolving) return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;

        // Clear previous displays
        setDoomResolutionResult(null);
        setFlyingItem(null);

        // Get active cells in this row (not yet removed)
        const row = matrix[rowIndex];
        const activeCells = [];
        row.forEach((cell, colIndex) => {
            if (cell !== null) {
                activeCells.push({ cell, colIndex });
            }
        });

        if (activeCells.length === 0) return;

        // Spend gold
        setGold(prev => prev - turnConfig.drawCost);

        // 1. Random draw from active cells
        const randomIndex = Math.floor(Math.random() * activeCells.length);
        const drawnEntry = activeCells[randomIndex];
        const drawnCell = drawnEntry.cell;
        const drawnColIndex = drawnEntry.colIndex;

        // 2. Process draw result based on cell type
        let obtainedItem = null;
        const doomEffects = { resolutions: 0, upgrades: 0 };

        if (drawnCell.type === 'item') {
            obtainedItem = drawnCell;
        } else if (drawnCell.type === 'doom_resolution') {
            doomEffects.resolutions = 1;
        } else if (drawnCell.type === 'doom_upgrade') {
            doomEffects.upgrades = 1;
        }

        // 3. Remove drawn cell from matrix
        setMatrix(prev => {
            const newMatrix = prev.map(r => [...r]);
            newMatrix[rowIndex][drawnColIndex] = null;
            return newMatrix;
        });

        // 4. Add item to inventory if obtained + trigger fly animation
        if (obtainedItem) {
            setFlyingItem({
                icon: obtainedItem.item.icon,
                name: obtainedItem.item.name,
                rowIndex,
                colIndex: drawnColIndex,
                id: Date.now(),
            });
            addToInventory(obtainedItem);
        }

        // 5. Apply doom effects (only if drawn)
        if (doomEffects.upgrades > 0) {
            setDoomLevel(prev => prev + doomEffects.upgrades);
            showToast(t('厄运升级') + ` +${doomEffects.upgrades}`, 'warning');
        }

        if (doomEffects.resolutions > 0) {
            resolveDoom();
        }

        // 6. Set draw result for UI feedback
        setLastDrawResult({
            rowIndex,
            colIndex: drawnColIndex,
            obtained: obtainedItem,
            doomEffects,
        });
    };

    // =============================================
    // INVENTORY
    // =============================================

    const addToInventory = (itemCell) => {
        if (inventory.length >= maxInventorySize) {
            showToast(t('背包已满'), 'error');
            return;
        }
        setInventory(prev => [...prev, {
            name: itemCell.item.name,
            icon: itemCell.item.icon,
            poolId: itemCell.item.poolId,
            uid: itemCell.uid,
        }]);
    };

    // =============================================
    // DOOM RESOLUTION
    // =============================================

    /** Start animated doom resolution */
    const resolveDoom = (action = null) => {
        if (action) setAfterDoomAction(action);

        // Pre-calculate final selections
        const finalSelections = [];
        let hpLoss = 0;
        for (let i = 0; i < doomLevel; i++) {
            const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
            const isHit = doomGrid[cellIndex].type === 'danger';
            if (isHit) hpLoss++;
            finalSelections.push({ index: cellIndex, isHit });
        }

        // Start with random spinning positions
        const spinningPositions = finalSelections.map(() =>
            Math.floor(Math.random() * doomConfig.gridSize)
        );

        setIsDoomResolving(true);
        setDoomAnimState({
            phase: 'spinning',
            tick: 0,
            totalTicks: 20,
            spinningPositions,
            finalSelections,
            hpLoss,
        });
    };

    /** Advance doom animation by one tick (called by GameCore interval) */
    const tickDoomResolution = () => {
        setDoomAnimState(prev => {
            if (!prev || prev.phase !== 'spinning') return prev;
            const newTick = prev.tick + 1;

            const newPositions = prev.spinningPositions.map((pos, i) => {
                const settleAt = prev.totalTicks - prev.finalSelections.length + i;
                if (newTick >= settleAt) return prev.finalSelections[i].index;
                return Math.floor(Math.random() * doomConfig.gridSize);
            });

            if (newTick >= prev.totalTicks) {
                return { ...prev, phase: 'settled', spinningPositions: newPositions, tick: newTick };
            }
            return { ...prev, spinningPositions: newPositions, tick: newTick };
        });
    };

    /** Apply doom results after animation completes */
    const completeDoomResolution = () => {
        if (!doomAnimState) return;
        const { hpLoss, finalSelections } = doomAnimState;

        if (hpLoss > 0) {
            const newHp = Math.max(0, hp - hpLoss);
            setHp(newHp);
            if (newHp <= 0) {
                handleGameOver();
            }
            showToast(t('厄运命中') + ` -${hpLoss} HP`, 'error');
        }

        setDoomResolutionResult({
            hits: finalSelections.map(s => ({ index: s.index, result: s.isHit ? 'danger' : 'empty' })),
            hpLoss,
        });
        setDoomAnimState(null);
        setIsDoomResolving(false);

        if (afterDoomAction === 'end_turn') {
            setAfterDoomAction(null);
            setPhase('between_turns');
        }
    };

    // =============================================
    // EVACUATION & GAME OVER
    // =============================================

    const handleEvacuate = () => {
        setModalContent('evacuated');
        setPhase('game_over');
    };

    const handleGameOver = () => {
        // Lose half inventory
        setInventory(prev => {
            const count = Math.ceil(prev.length / 2);
            const shuffled = [...prev].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, prev.length - count);
        });
        setModalContent('game_over');
        setPhase('game_over');
    };

    const handleReset = () => {
        setTurnNumber(0);
        setGold(0);
        setPhase('pre_game');
        setMatrix(null);
        setHp(doomConfig.initialHP);
        setDoomGrid(() => {
            const grid = Array(doomConfig.gridSize).fill(null).map(() => ({ type: 'empty' }));
            for (let i = 0; i < doomConfig.initialDangerCount; i++) {
                grid[i] = { type: 'danger' };
            }
            return grid;
        });
        setDoomLevel(doomConfig.initialDoomLevel);
        setIsDoomResolving(false);
        setDoomAnimState(null);
        setDoomResolutionResult(null);
        setAfterDoomAction(null);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
        setFlyingItem(null);
    };

    // =============================================
    // UTILITY
    // =============================================

    const showToast = (message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
    };

    const clearToast = () => {
        setToast(null);
    };

    // =============================================
    // RETURN
    // =============================================

    return {
        // Turn state
        turnNumber,
        gold,
        phase,

        // Grid
        matrix,
        lastDrawResult,

        // Doom
        hp,
        doomGrid,
        doomLevel,
        dangerCount,
        isDoomResolving,
        doomAnimState,
        doomResolutionResult,

        // Inventory
        inventory,
        maxInventorySize,

        // UI
        toast,
        clearToast,
        modalContent,
        flyingItem,
        setFlyingItem,

        // Actions
        startGame,
        selectRow,
        endTurn,
        continueToNextTurn,
        handleEvacuate,
        handleReset,
        tickDoomResolution,
        completeDoomResolution,
    };
};
