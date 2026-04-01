/**
 * matrixHelpers.js v3
 * 4×4 item matrix with row/column selection, gravity, random refill.
 */

import { MATRIX_CONFIG } from '../data/matrixConfig';
import { rollRarity } from './helpers';

const { gridSize } = MATRIX_CONFIG;

// ---------------------------------------------------------------------------
// Helper: random int in [min, max]
// ---------------------------------------------------------------------------
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// ---------------------------------------------------------------------------
// 1. generateNormalCell — always creates a normal item cell
// ---------------------------------------------------------------------------

const generateNormalCell = (allNormalItems, config, currentStageConfig) => {
  const item = allNormalItems[Math.floor(Math.random() * allNormalItems.length)];
  const rarity = rollRarity(config, null, 0, () => false, {}, currentStageConfig);
  return {
    type: 'normal',
    item: { name: item.name, icon: item.icon, poolId: item.poolId, poolName: item.poolName },
    rarity,
    uid: Math.random().toString(36).substr(2, 9),
  };
};

// ---------------------------------------------------------------------------
// 2. generateRandomCell — for gravity refill: always normal
// ---------------------------------------------------------------------------

export const generateRandomCell = (allNormalItems, config, currentStageConfig) => {
  return generateNormalCell(allNormalItems, config, currentStageConfig);
};

// ---------------------------------------------------------------------------
// 3. generateItemMatrix — fill entire grid with normal items
// ---------------------------------------------------------------------------

export const generateItemMatrix = (allNormalItems, config, currentStageConfig) => {
  const matrix = [];
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      row.push(generateNormalCell(allNormalItems, config, currentStageConfig));
    }
    matrix.push(row);
  }
  return matrix;
};

// ---------------------------------------------------------------------------
// 4. applyGravity — after removing a cell at (row, col), drop items above down
//    and fill the top with a new random item
// ---------------------------------------------------------------------------

export const applyGravity = (matrix, row, col, allNormalItems, config, currentStageConfig) => {
  const newMatrix = matrix.map(r => [...r]);

  for (let r = row; r > 0; r--) {
    newMatrix[r][col] = newMatrix[r - 1][col];
  }

  newMatrix[0][col] = generateRandomCell(allNormalItems, config, currentStageConfig);

  return newMatrix;
};
