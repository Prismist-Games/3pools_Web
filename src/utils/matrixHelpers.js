import { MATRIX_CONFIG } from '../data/matrixConfig';
import { OUT_OF_GAME_ITEMS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function rollItemSize(weights) {
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
 * Randomly pick min–max sticker types from the full sticker array.
 */
export function pickWallStickers(allStickers, min = 3, max = 4) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Phase 1+2: Place doom cells and special cells on empty positions.
 * Respects constraints.maxDoomInBlank to limit doom count.
 */
export function fillDoomAndSpecials(grid, gridSize, constraints = {}) {
  const { doomCells, specialCells } = MATRIX_CONFIG;
  const doomCellCount = { resolution: 0, upgrade: 0 };

  const u1 = Math.random();
  const u2 = Math.random();
  const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let totalDoom = Math.max(1, Math.min(9, Math.round(5 + normalSample * 1.5)));

  if (constraints.maxDoomInBlank !== undefined) {
    totalDoom = Math.min(totalDoom, constraints.maxDoomInBlank);
  }

  if (totalDoom > 0) {
    const resCount = Math.max(0, Math.min(totalDoom, Math.round(totalDoom * (0.5 + (Math.random() - 0.5) * 0.3))));
    const upgCount = totalDoom - resCount;

    const emptyPositions = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === null) emptyPositions.push([r, c]);
      }
    }
    emptyPositions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < totalDoom && i < emptyPositions.length; i++) {
      const [r, c] = emptyPositions[i];
      if (i < resCount) {
        grid[r][c] = {
          type: 'doom_resolution', icon: doomCells.resolution.icon,
          name: doomCells.resolution.name, uid: generateUID(),
        };
        doomCellCount.resolution++;
      } else {
        grid[r][c] = {
          type: 'doom_upgrade', icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name, uid: generateUID(),
        };
        doomCellCount.upgrade++;
      }
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;
      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const outOfGameChance = orderChance + specialCells.outOfGame.spawnChance;
      const bombChance = outOfGameChance + (specialCells.bomb?.spawnChance || 0);

      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = {
          type: 'gold', icon: specialCells.gold.icon,
          name: specialCells.gold.name, goldAmount, uid: generateUID(),
        };
      } else if (roll < orderChance) {
        grid[row][col] = {
          type: 'order_cell', icon: specialCells.order.icon,
          name: specialCells.order.name, uid: generateUID(),
        };
      } else if (roll < outOfGameChance) {
        const item = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
        grid[row][col] = {
          type: 'out_of_game', icon: item.icon,
          name: item.name, item: { ...item }, uid: generateUID(),
        };
      } else if (roll < bombChance) {
        grid[row][col] = {
          type: 'bomb', icon: specialCells.bomb.icon,
          name: specialCells.bomb.name, uid: generateUID(),
        };
      }
    }
  }

  return doomCellCount;
}

/**
 * Phase 3: Fill all remaining null cells with polyomino sticker shapes.
 */
export function fillEmptyCellsWithStickers(grid, wallStickers, gridSize) {
  const { itemShapes } = MATRIX_CONFIG;

  const getEmptyPositions = () => {
    const empty = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === null) empty.push([r, c]);
      }
    }
    return empty;
  };

  let empty = getEmptyPositions();
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    if (grid[startR][startC] !== null) {
      empty.shift();
      continue;
    }

    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
      const shuffled = [...shapesForSize].sort(() => Math.random() - 0.5);
      for (const shape of shuffled) {
        const positions = tryPlaceShape(shape, startR, startC, grid, gridSize);
        if (positions) {
          const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'sticker', item: { ...sticker },
              uid: generateUID(), groupId, shapeSize: size,
            };
          }
          placed = true;
          break;
        }
      }
      if (!placed) size--;
    }

    if (!placed) {
      const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
      grid[startR][startC] = {
        type: 'sticker', item: { ...sticker },
        uid: generateUID(), groupId: generateUID(), shapeSize: 1,
      };
    }

    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }
}

/**
 * Generate a fully procedural wall (size from MATRIX_CONFIG.gridSize; delegates to extracted helpers).
 */
export function generateWall(wallStickers) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  const doomCellCount = fillDoomAndSpecials(grid, gridSize);
  fillEmptyCellsWithStickers(grid, wallStickers, gridSize);

  return { grid, doomCellCount };
}

/**
 * Legacy export — backward compatibility during migration.
 * Derives pseudo-stickers from pool items and calls generateWall.
 */
export function generateTurnMatrix(pools) {
  const pseudoStickers = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      pseudoStickers.push({
        id: item.id ?? item.name,
        icon: item.icon,
        name: item.name,
        poolId: pool.id,
        poolName: pool.name,
      });
    }
  }
  const { grid, doomCellCount } = generateWall(pseudoStickers);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && grid[r][c].type === 'sticker') {
        grid[r][c].type = 'item';
      }
    }
  }
  return { grid, doomCellCount };
}
