/**
 * matrixHelpers.js v3
 * 5×5 item matrix with row/column selection, gravity, and random refill.
 */

import { MATRIX_CONFIG } from '../data/matrixConfig';
import { rollRarity } from './helpers';

const { gridSize } = MATRIX_CONFIG;

// ---------------------------------------------------------------------------
// 1. generateRandomCell — create a single random cell for the matrix
// ---------------------------------------------------------------------------

export const generateRandomCell = (allNormalItems, config, currentStageConfig) => {
  const item = allNormalItems[Math.floor(Math.random() * allNormalItems.length)];
  const rarity = rollRarity(config, null, 0, () => false, {}, currentStageConfig);
  return {
    item: { name: item.name, icon: item.icon, poolId: item.poolId, poolName: item.poolName },
    rarity,
    uid: Math.random().toString(36).substr(2, 9),
  };
};

// ---------------------------------------------------------------------------
// 2. generateItemMatrix — full 5×5 grid, every cell has one item
// ---------------------------------------------------------------------------

export const generateItemMatrix = (allNormalItems, config, currentStageConfig) => {
  const matrix = [];
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      row.push(generateRandomCell(allNormalItems, config, currentStageConfig));
    }
    matrix.push(row);
  }
  return matrix;
};

// ---------------------------------------------------------------------------
// 3. applyGravity — after removing a cell at (row, col), drop items above down
//    and fill the top with a new random item
// ---------------------------------------------------------------------------

export const applyGravity = (matrix, row, col, allNormalItems, config, currentStageConfig) => {
  // Copy the matrix (shallow copy rows, deep copy affected column)
  const newMatrix = matrix.map(r => [...r]);

  // Shift items down in the affected column: from the removed row upward
  for (let r = row; r > 0; r--) {
    newMatrix[r][col] = newMatrix[r - 1][col];
  }

  // Fill the top cell with a new random item
  newMatrix[0][col] = generateRandomCell(allNormalItems, config, currentStageConfig);

  return newMatrix;
};
