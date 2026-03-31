/**
 * matrixHelpers.js v4
 * 4×4 item matrix with row/column selection, gravity, random refill.
 * All cells are normal items (some with doom marks), plus bomb special cells.
 */

import { MATRIX_CONFIG } from '../data/matrixConfig';
import { rollRarity } from './helpers';

const { gridSize } = MATRIX_CONFIG;

// ---------------------------------------------------------------------------
// Helper: random int in [min, max]
// ---------------------------------------------------------------------------
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// ---------------------------------------------------------------------------
// 1. generateNormalCell — creates an item cell, possibly with a doom mark
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
// 2. generateRandomCell — for gravity refill: mostly normal, small chance bomb
// ---------------------------------------------------------------------------

export const generateRandomCell = (allNormalItems, config, currentStageConfig) => {
  // Bomb chance on refill
  if (Math.random() < (MATRIX_CONFIG.bomb?.refillChance || 0.08)) {
    return {
      type: 'bomb',
      item: { name: MATRIX_CONFIG.bomb.name, icon: MATRIX_CONFIG.bomb.icon },
      rarity: { id: 'common', bonus: 0 },
      uid: Math.random().toString(36).substr(2, 9),
    };
  }
  return generateNormalCell(allNormalItems, config, currentStageConfig);
};

// ---------------------------------------------------------------------------
// 3. generateItemMatrix — controlled bomb counts, rest are normal items
// ---------------------------------------------------------------------------

export const generateItemMatrix = (allNormalItems, config, currentStageConfig) => {
  const totalCells = gridSize * gridSize;
  const bombCfg = MATRIX_CONFIG.bomb;
  const bombCount = bombCfg ? randInt(bombCfg.min, bombCfg.max) : 0;

  // Build flat array of cell types, then shuffle
  const cellTypes = [];
  for (let i = 0; i < bombCount; i++) cellTypes.push('bomb');
  while (cellTypes.length < totalCells) cellTypes.push('normal');

  // Fisher-Yates shuffle
  for (let i = cellTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellTypes[i], cellTypes[j]] = [cellTypes[j], cellTypes[i]];
  }

  const matrix = [];
  let idx = 0;
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      const type = cellTypes[idx++];
      if (type === 'bomb') {
        row.push({
          type: 'bomb',
          item: { name: bombCfg.name, icon: bombCfg.icon },
          rarity: { id: 'common', bonus: 0 },
          uid: Math.random().toString(36).substr(2, 9),
        });
      } else {
        row.push(generateNormalCell(allNormalItems, config, currentStageConfig));
      }
    }
    matrix.push(row);
  }
  return matrix;
};

// ---------------------------------------------------------------------------
// 4. applyGravity — after removing a cell at (row, col), drop items above down
//    and fill the top with a new random cell
// ---------------------------------------------------------------------------

export const applyGravity = (matrix, row, col, allNormalItems, config, currentStageConfig) => {
  const newMatrix = matrix.map(r => [...r]);

  for (let r = row; r > 0; r--) {
    newMatrix[r][col] = newMatrix[r - 1][col];
  }

  newMatrix[0][col] = generateRandomCell(allNormalItems, config, currentStageConfig);

  return newMatrix;
};

// ---------------------------------------------------------------------------
// 5. applyBombExplosion — remove bomb cell + all 8 neighbors, then gravity.
//    Returns { matrix, removedCells } for animation.
// ---------------------------------------------------------------------------

export const applyBombExplosion = (matrix, row, col, allNormalItems, config, currentStageConfig) => {
  const allRemoved = [{ row, col }];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
        allRemoved.push({ row: nr, col: nc });
      }
    }
  }
  const neighbors = allRemoved.filter(c => !(c.row === row && c.col === col));

  const colRemovedRows = {};
  for (const n of allRemoved) {
    if (!colRemovedRows[n.col]) colRemovedRows[n.col] = new Set();
    colRemovedRows[n.col].add(n.row);
  }

  let newMatrix = matrix.map(r => [...r]);

  for (const [colStr, removedRowSet] of Object.entries(colRemovedRows)) {
    const c = parseInt(colStr);
    const surviving = [];
    for (let r = 0; r < gridSize; r++) {
      if (!removedRowSet.has(r)) {
        surviving.push(newMatrix[r][c]);
      }
    }
    const removedCount = removedRowSet.size;
    for (let r = 0; r < removedCount; r++) {
      newMatrix[r][c] = generateRandomCell(allNormalItems, config, currentStageConfig);
    }
    for (let r = 0; r < surviving.length; r++) {
      newMatrix[removedCount + r][c] = surviving[r];
    }
  }

  return { matrix: newMatrix, removedCells: neighbors };
};
