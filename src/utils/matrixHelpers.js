/**
 * matrixHelpers.js v5
 * 4×4 item matrix with row/column selection, gravity, random refill.
 * 50% order-needed items, 50% filler items.
 */

import { MATRIX_CONFIG } from '../data/matrixConfig';
import { FILLER_ITEMS } from '../data/constants';
import { rollRarity } from './helpers';

const { gridSize } = MATRIX_CONFIG;

// ---------------------------------------------------------------------------
// generateCell — 50% order item, 50% filler
// ---------------------------------------------------------------------------

const generateCell = (config, currentStageConfig, orderNeededItems = []) => {
  const orderChance = config.global?.matrixOrderItemChance ?? 0.5;
  if (orderNeededItems.length > 0 && Math.random() < orderChance) {
    // 有用物品：从订单需求中随机选一个
    const item = orderNeededItems[Math.floor(Math.random() * orderNeededItems.length)];
    const rarity = rollRarity(config, null, 0, () => false, {}, currentStageConfig);
    return {
      type: 'normal',
      item: { name: item.name, icon: item.icon, poolId: item.poolId || item.name, poolName: item.poolName || item.name },
      rarity,
      uid: Math.random().toString(36).substr(2, 9),
    };
  } else {
    // 填充物品：从 FILLER_ITEMS 中等概率选一个
    const filler = FILLER_ITEMS[Math.floor(Math.random() * FILLER_ITEMS.length)];
    const rarity = rollRarity(config, null, 0, () => false, {}, currentStageConfig);
    return {
      type: 'filler',
      item: { name: filler.name, icon: filler.icon },
      rarity,
      uid: Math.random().toString(36).substr(2, 9),
    };
  }
};

// ---------------------------------------------------------------------------
// generateRandomCell — for gravity refill
// ---------------------------------------------------------------------------

export const generateRandomCell = (allNormalItems, config, currentStageConfig, orderNeededItems = []) => {
  return generateCell(config, currentStageConfig, orderNeededItems);
};

// ---------------------------------------------------------------------------
// generateItemMatrix — fill entire grid
// ---------------------------------------------------------------------------

export const generateItemMatrix = (allNormalItems, config, currentStageConfig, orderNeededItems = []) => {
  const matrix = [];
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      row.push(generateCell(config, currentStageConfig, orderNeededItems));
    }
    matrix.push(row);
  }
  return matrix;
};

// ---------------------------------------------------------------------------
// applyGravity — after removing a cell, drop items above and fill top
// ---------------------------------------------------------------------------

export const applyGravity = (matrix, row, col, allNormalItems, config, currentStageConfig, orderNeededItems = []) => {
  const newMatrix = matrix.map(r => [...r]);

  for (let r = row; r > 0; r--) {
    newMatrix[r][col] = newMatrix[r - 1][col];
  }

  newMatrix[0][col] = generateRandomCell(allNormalItems, config, currentStageConfig, orderNeededItems);

  return newMatrix;
};
