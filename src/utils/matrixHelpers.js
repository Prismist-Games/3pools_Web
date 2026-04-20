import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// itemShapes not yet in matrixConfig.js — defined locally until config is extended.
// Weights: probability of trying each polyomino size first (falls back to 1 on failure).
const ITEM_SHAPES = {
  weights: { 1: 60, 2: 30, 3: 10 },
  shapes: {
    1: [[[0, 0]]],
    2: [
      [[0, 0], [0, 1]],
      [[0, 0], [1, 0]],
    ],
    3: [
      [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [1, 1]],
    ],
  },
};

function rollItemSize(weights) {
  // Object.entries on integer-keyed objects iterates in ascending numeric order (ES2015+),
  // so the fallback `return 1` covers float-drift on the last (largest) entry, not an arbitrary size.
  const entries = Object.entries(weights).map(([k, v]) => [Number(k), v]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [size, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return size;
  }
  return 1;
}

function tryPlaceShape(shape, startRow, startCol, grid, gridSize) {
  const positions = [];
  for (const [dr, dc] of shape) {
    const r = startRow + dr;
    const c = startCol + dc;
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null;
    if (grid[r][c] !== null) return null;
    positions.push([r, c]);
  }
  return positions;
}

/**
 * Pick all ingredients belonging to a market type's category.
 * @param {Object} marketType — from MARKET_TYPES, has .category
 */
export function pickMarketIngredients(marketType) {
  return INGREDIENTS.filter(i => i.tags[0] === marketType.category);
}

/**
 * Generate a wall matrix using ingredient types from the given pool.
 *
 * Phase 1: Place doom cells (normal distribution, median ~5)
 * Phase 2: Roll special cells (gold / order_cell / bomb)
 * Phase 3: Fill remaining cells with ingredient shapes
 *
 * Grid cells do NOT store quality — quality is assigned at draw time.
 *
 * @param {Array} marketIngredients — ingredient objects filtered by market category
 */
export function generateWall(marketIngredients) {
  if (!marketIngredients?.length) {
    throw new Error('generateWall: marketIngredients is empty or undefined');
  }
  const { gridSize, doomCells, specialCells } = MATRIX_CONFIG;
  const itemShapes = ITEM_SHAPES;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0 };

  // Phase 1 + 2: Doom and special cells — per-cell probability roll
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;

      const roll = Math.random();
      const doomChance = doomCells.resolution.spawnChance;
      const goldChance = doomChance + specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const bombChance = orderChance + (specialCells.bomb?.spawnChance || 0);

      if (roll < doomChance) {
        grid[row][col] = { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID() };
        doomCellCount.resolution++;
        continue;
      }

      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID() };
      } else if (roll < orderChance) {
        grid[row][col] = { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID() };
      } else if (roll < bombChance) {
        grid[row][col] = { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID() };
      }
    }
  }

  // Phase 3: Fill remaining cells with ingredient shapes
  const getEmptyPositions = () => {
    const empty = [];
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (grid[r][c] === null) empty.push([r, c]);
    return empty;
  };

  let empty = getEmptyPositions();
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    // Cell was already filled by a multi-cell shape in the previous iteration — skip without re-query.
    if (grid[startR][startC] !== null) { empty.shift(); continue; }

    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
      const shuffled = [...shapesForSize].sort(() => Math.random() - 0.5);

      for (const shape of shuffled) {
        const positions = tryPlaceShape(shape, startR, startC, grid, gridSize);
        if (positions) {
          const ingredient = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'ingredient',
              item: { ...ingredient },
              uid: generateUID(),
              groupId,
              shapeSize: size,
            };
          }
          placed = true;
          break;
        }
      }
      if (!placed) size--;
    }

    if (!placed) {
      const ingredient = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
      grid[startR][startC] = {
        type: 'ingredient',
        item: { ...ingredient },
        uid: generateUID(),
        groupId: generateUID(),
        shapeSize: 1,
      };
    }

    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

  return { grid, doomCellCount };
}

// ---------------------------------------------------------------------------
// Legacy stubs — kept for backward compatibility while Tasks 3 & 4 migrate
// useGameLogic.js, ResourceMatrix.jsx, and templateGenerator.js away from
// these APIs. Remove once those files no longer import them.
// ---------------------------------------------------------------------------

/** @deprecated Use generateWall(marketIngredients) instead */
export function pickWallStickers(allStickers, min = 3, max = 4) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** @deprecated No longer used in new wall generation */
export function fillDoomAndSpecials(grid, gridSize) {
  const { specialCells, doomCells } = MATRIX_CONFIG;
  const doomCellCount = { resolution: 0 };
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;
      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const bombChance = orderChance + (specialCells.bomb?.spawnChance || 0);
      const doomResChance = bombChance + (doomCells?.resolution?.spawnChance || 0);
      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID() };
      } else if (roll < orderChance) {
        grid[row][col] = { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID() };
      } else if (roll < bombChance) {
        grid[row][col] = { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID() };
      } else if (roll < doomResChance) {
        grid[row][col] = { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID() };
        doomCellCount.resolution++;
      }
    }
  }
  return doomCellCount;
}

/** @deprecated Use generateWall(marketIngredients) instead */
export function fillEmptyCellsWithStickers(grid, wallStickers, gridSize) {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== null) continue;
      const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
      grid[r][c] = { type: 'sticker', item: { ...sticker }, uid: generateUID() };
    }
  }
}

/** @deprecated Flood-fill for sticker clusters — used by ResourceMatrix until Task 4 */
export function getClusterMembers(matrix, r, c) {
  const seed = matrix?.[r]?.[c];
  if (!seed || (seed.type !== 'sticker' && seed.type !== 'ingredient')) return [];
  const targetId = seed.item?.id;
  if (!targetId) return [];
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;
  const visited = new Set();
  const stack = [[r, c]];
  const members = [];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = `${cr}-${cc}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const cur = matrix[cr]?.[cc];
    if (!cur || (cur.type !== 'sticker' && cur.type !== 'ingredient') || cur.item?.id !== targetId) continue;
    members.push([cr, cc]);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr}-${nc}`)) {
        stack.push([nr, nc]);
      }
    }
  }
  return members;
}
