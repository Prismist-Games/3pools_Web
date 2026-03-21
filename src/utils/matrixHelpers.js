/**
 * matrixHelpers.js v2
 * Machine-based matrix system with direction, action cards, full density grid.
 */

import { SHAPE_DEFINITIONS, MATRIX_CONFIG, ACTION_CARD_CONFIG, ACTION_TYPES } from '../data/matrixConfig';
import { rollRarity } from './helpers';

// ---------------------------------------------------------------------------
// 1. rotateCells — rotate cell offsets around pivot by direction (0=up,1=right,2=down,3=left)
// ---------------------------------------------------------------------------

export const rotateCells = (cells, pivot, rotation) => {
  if (rotation === 0) return cells;
  const [pr, pc] = pivot;
  return cells.map(([r, c]) => {
    const dr = r - pr;
    const dc = c - pc;
    switch (rotation) {
      case 1: return [pr + dc, pc - dr];   // 90° CW (facing right)
      case 2: return [pr - dr, pc - dc];   // 180° (facing down)
      case 3: return [pr - dc, pc + dr];   // 270° CW (facing left)
      default: return [r, c];
    }
  });
};

// ---------------------------------------------------------------------------
// 2. getMachineCoverage — get cells covered by machine's shape at position + direction
// ---------------------------------------------------------------------------

export const getMachineCoverage = (shapeDef, machineRow, machineCol, direction) => {
  const pivot = shapeDef.pivot || [0, 0];
  const rotated = rotateCells(shapeDef.cells, pivot, direction);
  return rotated.map(([r, c]) => [machineRow + r - pivot[0], machineCol + c - pivot[1]]);
};

// ---------------------------------------------------------------------------
// 3. getCoveredResourcePoints — resource points fully covered by shape cells
// ---------------------------------------------------------------------------

export const getCoveredResourcePoints = (shapeCells, resourcePoints) => {
  const covered = new Set(
    shapeCells
      .filter(([r, c]) => r >= 0 && r < 5 && c >= 0 && c < 5)
      .map(([r, c]) => `${r},${c}`)
  );
  return resourcePoints.filter(rp =>
    rp.cells.every(([r, c]) => covered.has(`${r},${c}`))
  );
};

// ---------------------------------------------------------------------------
// 4. generateActionCards — draw action cards for one turn
// ---------------------------------------------------------------------------

export const generateActionCards = () => {
  const { cardsPerTurn, probabilities } = ACTION_CARD_CONFIG;
  const types = Object.entries(probabilities);
  const cards = [];

  for (let i = 0; i < cardsPerTurn; i++) {
    const r = Math.random();
    let acc = 0;
    let type = ACTION_TYPES.MOVE_FORWARD;
    for (const [t, prob] of types) {
      acc += prob;
      if (r <= acc) { type = t; break; }
    }
    cards.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      used: false,
    });
  }
  return cards;
};

// ---------------------------------------------------------------------------
// 5. generateResourceMatrix — full density grid, every cell has a resource
// ---------------------------------------------------------------------------

export const generateResourceMatrix = (allNormalItems, config, currentStageConfig) => {
  const { gridSize, doubleCellCount, tripleCellCount } = MATRIX_CONFIG;
  const uid = () => Math.random().toString(36).substr(2, 9);
  const cellKey = (r, c) => `${r},${c}`;
  const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const occupiedByMulti = new Set(); // cells claimed by multi-cell resource points
  const resourcePoints = [];

  // --- Phase 1: Place multi-cell resource points first ---
  const tryPlaceMultiCell = (size) => {
    const MAX_RETRIES = 30;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const startR = Math.floor(Math.random() * gridSize);
      const startC = Math.floor(Math.random() * gridSize);
      if (occupiedByMulti.has(cellKey(startR, startC))) continue;

      const direction = Math.random() < 0.5 ? 'h' : 'v';
      const cells = [[startR, startC]];
      let ok = true;
      for (let step = 1; step < size; step++) {
        const [pr, pc] = cells[cells.length - 1];
        const nr = direction === 'v' ? pr + 1 : pr;
        const nc = direction === 'h' ? pc + 1 : pc;
        if (nr >= gridSize || nc >= gridSize || occupiedByMulti.has(cellKey(nr, nc))) {
          ok = false; break;
        }
        cells.push([nr, nc]);
      }
      if (!ok || cells.length < size) continue;

      cells.forEach(([r, c]) => occupiedByMulti.add(cellKey(r, c)));
      resourcePoints.push({ id: uid(), cells, size });
      return true;
    }
    return false;
  };

  const tripleCount = randomInRange(tripleCellCount[0], tripleCellCount[1]);
  for (let i = 0; i < tripleCount; i++) tryPlaceMultiCell(3);

  const doubleCount = randomInRange(doubleCellCount[0], doubleCellCount[1]);
  for (let i = 0; i < doubleCount; i++) tryPlaceMultiCell(2);

  // --- Phase 2: Fill remaining cells, leaving some empty ---
  const remainingCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!occupiedByMulti.has(cellKey(r, c))) remainingCells.push([r, c]);
    }
  }
  // Shuffle and reserve some as empty
  for (let i = remainingCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingCells[i], remainingCells[j]] = [remainingCells[j], remainingCells[i]];
  }
  const emptyTarget = randomInRange(
    (MATRIX_CONFIG.emptyCellCount || [0,0])[0],
    (MATRIX_CONFIG.emptyCellCount || [0,0])[1]
  );
  const emptyCount = Math.min(emptyTarget, remainingCells.length);
  const emptyCells = new Set(remainingCells.slice(0, emptyCount).map(([r, c]) => cellKey(r, c)));

  for (const [r, c] of remainingCells) {
    if (!emptyCells.has(cellKey(r, c))) {
      resourcePoints.push({ id: uid(), cells: [[r, c]], size: 1 });
    }
  }

  // --- Phase 3: Assign unique items to resource points ---
  const totalSlots = resourcePoints.length;
  const uniqueByName = [];
  const seenNames = new Set();
  for (const src of allNormalItems) {
    if (!seenNames.has(src.name)) {
      seenNames.add(src.name);
      uniqueByName.push({ name: src.name, icon: src.icon, poolId: src.poolId, poolName: src.poolName });
    }
  }

  // Full density: 20-25 resource points for 20 unique items.
  // Build pool: first round unique, second round allows 2nd copy
  const pool = [];
  const round1 = [...uniqueByName];
  for (let i = round1.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round1[i], round1[j]] = [round1[j], round1[i]];
  }
  pool.push(...round1);

  if (pool.length < totalSlots) {
    const round2 = [...uniqueByName];
    for (let i = round2.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [round2[i], round2[j]] = [round2[j], round2[i]];
    }
    pool.push(...round2);
  }

  // Assign items, avoiding grid-adjacent same-name
  const slotNeighbors = resourcePoints.map((slot, i) => {
    const myCells = new Set(slot.cells.map(([r, c]) => cellKey(r, c)));
    const neighbors = [];
    for (let j = 0; j < resourcePoints.length; j++) {
      if (i === j) continue;
      const adjacent = resourcePoints[j].cells.some(([r, c]) =>
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([nr, nc]) => myCells.has(cellKey(nr, nc)))
      );
      if (adjacent) neighbors.push(j);
    }
    return neighbors;
  });

  // Process in random order
  const order = resourcePoints.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const assigned = new Array(totalSlots).fill(null);
  const nameCount = {};
  const usedPool = new Array(pool.length).fill(false);

  for (const i of order) {
    const bannedNames = new Set(
      slotNeighbors[i].map(j => assigned[j]?.name).filter(Boolean)
    );
    let picked = -1;
    for (let p = 0; p < pool.length; p++) {
      if (usedPool[p]) continue;
      if (bannedNames.has(pool[p].name)) continue;
      if ((nameCount[pool[p].name] || 0) >= 2) continue;
      picked = p; break;
    }
    if (picked === -1) {
      for (let p = 0; p < pool.length; p++) {
        if (usedPool[p]) continue;
        if ((nameCount[pool[p].name] || 0) >= 2) continue;
        picked = p; break;
      }
    }
    if (picked === -1) {
      // Emergency: all used up, pick any
      const src = uniqueByName[Math.floor(Math.random() * uniqueByName.length)];
      assigned[i] = src;
    } else {
      assigned[i] = pool[picked];
      usedPool[picked] = true;
    }
    nameCount[assigned[i].name] = (nameCount[assigned[i].name] || 0) + 1;
  }

  const finalResourcePoints = resourcePoints.map((slot, i) => ({
    ...slot,
    item: assigned[i],
    rarity: rollRarity(config, null, 0, () => false, {}, currentStageConfig),
  }));

  // --- Build grid ---
  for (const rp of finalResourcePoints) {
    for (const [r, c] of rp.cells) {
      grid[r][c] = { type: 'resource', resourcePointId: rp.id };
    }
  }

  // --- Place exit tile on a random empty cell ---
  const emptyForExit = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!grid[r][c]) emptyForExit.push([r, c]);
    }
  }
  let exitPos = null;
  if (emptyForExit.length > 0) {
    const [er, ec] = emptyForExit[Math.floor(Math.random() * emptyForExit.length)];
    grid[er][ec] = { type: 'exit' };
    exitPos = { row: er, col: ec };
  }

  return { grid, resourcePoints: finalResourcePoints, exitPos };
};

// ---------------------------------------------------------------------------
// 6. selectAvailableShapes — for shape selection UI when using "adjust" action
// ---------------------------------------------------------------------------

export const selectAvailableShapes = () => [...SHAPE_DEFINITIONS];
