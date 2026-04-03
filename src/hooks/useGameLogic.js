import { useState, useMemo, useRef } from 'react';
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
    const [doomResolutionResult, setDoomResolutionResult] = useState(null);

    // --- Inventory State ---
    const [inventory, setInventory] = useState([]);

    // --- UI State ---
    const [toast, setToast] = useState(null);
    const [lastDrawResult, setLastDrawResult] = useState(null);
    const [modalContent, setModalContent] = useState(null);

    // --- Processing lock (prevents rapid-click double draws) ---
    const isDrawing = useRef(false);

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

    /** End current turn, go to between-turns decision */
    const endTurn = () => {
        setPhase('between_turns');
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
        if (isDrawing.current) return;
        if (phase !== 'drawing') return;
        if (gold < turnConfig.drawCost) return;
        if (!matrix || !matrix[rowIndex]) return;

        isDrawing.current = true;
        // Release lock after React processes state updates
        setTimeout(() => { isDrawing.current = false; }, 0);

        // Clear previous doom resolution display
        setDoomResolutionResult(null);

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

        // 1. Auto-trigger all doom cells in the row
        const doomEffects = { resolutions: 0, upgrades: 0 };
        const doomCellIndices = [];

        activeCells.forEach(({ cell, colIndex }) => {
            if (cell.type === 'doom_resolution') {
                doomEffects.resolutions++;
                doomCellIndices.push(colIndex);
            } else if (cell.type === 'doom_upgrade') {
                doomEffects.upgrades++;
                doomCellIndices.push(colIndex);
            }
        });

        // 2. Random draw from ALL active cells
        const randomIndex = Math.floor(Math.random() * activeCells.length);
        const drawnEntry = activeCells[randomIndex];
        const drawnCell = drawnEntry.cell;
        const drawnColIndex = drawnEntry.colIndex;

        // 3. Process draw result
        let obtainedItem = null;
        if (drawnCell.type === 'item') {
            obtainedItem = drawnCell;
        }
        // If drawn cell is a doom cell, no item obtained

        // 4. Remove drawn cell + all triggered doom cells from matrix
        setMatrix(prev => {
            const newMatrix = prev.map(r => [...r]);
            // Remove the drawn cell
            newMatrix[rowIndex][drawnColIndex] = null;
            // Remove triggered doom cells
            doomCellIndices.forEach(colIdx => {
                newMatrix[rowIndex][colIdx] = null;
            });
            return newMatrix;
        });

        // 5. Add item to inventory if obtained
        if (obtainedItem) {
            addToInventory(obtainedItem);
        }

        // 6. Apply doom effects
        if (doomEffects.upgrades > 0) {
            setDoomLevel(prev => prev + doomEffects.upgrades);
            showToast(t('厄运升级') + ` +${doomEffects.upgrades}`, 'warning');
        }

        if (doomEffects.resolutions > 0) {
            // Queue doom resolutions
            for (let i = 0; i < doomEffects.resolutions; i++) {
                resolveDoom();
            }
        }

        // 7. Set draw result for UI feedback
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

    const resolveDoom = () => {
        // Cursor lands on doomLevel random cells in the doom grid
        const hits = [];
        let hpLoss = 0;

        for (let i = 0; i < doomLevel; i++) {
            const cellIndex = Math.floor(Math.random() * doomConfig.gridSize);
            const cell = doomGrid[cellIndex];
            if (cell.type === 'danger') {
                hits.push({ index: cellIndex, result: 'danger' });
                hpLoss++;
            } else {
                hits.push({ index: cellIndex, result: 'empty' });
            }
        }

        // Apply HP loss
        if (hpLoss > 0) {
            setHp(prev => {
                const newHp = Math.max(0, prev - hpLoss);
                if (newHp <= 0) {
                    handleGameOver();
                }
                return newHp;
            });
            showToast(t('厄运命中') + ` -${hpLoss} HP`, 'error');
        }

        setDoomResolutionResult({ hits, hpLoss });
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
        setDoomResolutionResult(null);
        setInventory([]);
        setToast(null);
        setLastDrawResult(null);
        setModalContent(null);
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
        doomResolutionResult,

        // Inventory
        inventory,
        maxInventorySize,

        // UI
        toast,
        clearToast,
        modalContent,

        // Actions
        startGame,
        selectRow,
        endTurn,
        continueToNextTurn,
        handleEvacuate,
        handleReset,
    };
};
