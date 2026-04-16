import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Pick a key from a weights object { key: weight } */
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

/** Roll a weighted random size (1-4) */
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

/** Try to place a shape at (startRow, startCol) on a grid. Returns cell positions or null. */
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
export function pickWallStickers(allStickers, min = 3, max = 3) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a 5×5 wall matrix for one turn using sticker types.
 *
 * Phase 1: Roll doom cells per position (independent)
 * Phase 2: Roll special cells (gold / order / out-of-game) on remaining empty positions
 * Phase 3: Fill remaining empty cells with sticker shapes (polyomino algorithm)
 *
 * Multi-cell stickers share a groupId so drawing any cell obtains the whole sticker.
 *
 * @param {Array} wallStickers — array of sticker type objects from STICKER_TYPES
 */
export function generateWall(wallStickers) {
  const { gridSize, doomCells, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0, upgrade: 0 };

  // Phase 1: Roll doom cells — normal distribution, median ~5
  // Box-Muller approximation for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const totalDoom = Math.max(1, Math.min(9, Math.round(5 + normalSample * 1.5)));
  // Split between resolution (~55%) and upgrade (~45%)
  const resCount = Math.max(0, Math.min(totalDoom, Math.round(totalDoom * (0.5 + (Math.random() - 0.5) * 0.3))));
  const upgCount = totalDoom - resCount;
  // Collect all positions, shuffle, place doom cells
  const allPositions = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allPositions.push([r, c]);
    }
  }
  allPositions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < totalDoom && i < allPositions.length; i++) {
    const [r, c] = allPositions[i];
    if (i < resCount) {
      grid[r][c] = {
        type: 'doom_resolution',
        icon: doomCells.resolution.icon,
        name: doomCells.resolution.name,
        uid: generateUID(),
      };
      doomCellCount.resolution++;
    } else {
      grid[r][c] = {
        type: 'doom_upgrade',
        icon: doomCells.upgrade.icon,
        name: doomCells.upgrade.name,
        uid: generateUID(),
      };
      doomCellCount.upgrade++;
    }
  }

  // Phase 2: Roll special cells on remaining empty positions
  // Cumulative probability check: gold → order → outOfGame
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;

      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const outOfGameChance = orderChance + specialCells.outOfGame.spawnChance;
      const bombChance = outOfGameChance + (specialCells.bomb?.spawnChance || 0);
      const fateCellChance = bombChance + (specialCells.fateCell?.spawnChance || 0);

      if (roll < goldChance) {
        const [min, max] = specialCells.gold.goldRange;
        const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
        grid[row][col] = {
          type: 'gold',
          icon: specialCells.gold.icon,
          name: specialCells.gold.name,
          goldAmount,
          uid: generateUID(),
        };
      } else if (roll < orderChance) {
        grid[row][col] = {
          type: 'order_cell',
          icon: specialCells.order.icon,
          name: specialCells.order.name,
          uid: generateUID(),
        };
      } else if (roll < outOfGameChance) {
        // Pick rarity first (★40%, ★★30%, ★★★20%, ★★★★10%), then uniform within that rarity
        const rarityRoll = Math.random();
        const rarity = rarityRoll < 0.4 ? 1 : rarityRoll < 0.7 ? 2 : rarityRoll < 0.9 ? 3 : 4;
        const pool = INGREDIENTS.filter(i => i.rarity === rarity);
        const item = pool[Math.floor(Math.random() * pool.length)];
        grid[row][col] = {
          type: 'out_of_game',
          icon: item.icon,
          name: item.name,
          item: { ...item },
          uid: generateUID(),
        };
      } else if (roll < bombChance) {
        grid[row][col] = {
          type: 'bomb',
          icon: specialCells.bomb.icon,
          name: specialCells.bomb.name,
          uid: generateUID(),
        };
      } else if (roll < fateCellChance) {
        grid[row][col] = {
          type: 'fate_cell',
          icon: specialCells.fateCell.icon,
          name: specialCells.fateCell.name,
          uid: generateUID(),
        };
      }
    }
  }

  // Phase 3: Fill remaining empty cells with sticker shapes
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
  // Shuffle to avoid placement bias
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    if (grid[startR][startC] !== null) {
      empty.shift();
      continue;
    }

    // Roll sticker size
    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    // Try to place at this position, falling back to smaller sizes
    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
      // Shuffle shapes to randomize which one is tried
      const shuffled = [...shapesForSize].sort(() => Math.random() - 0.5);

      for (const shape of shuffled) {
        const positions = tryPlaceShape(shape, startR, startC, grid, gridSize);
        if (positions) {
          const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'sticker',
              item: { ...sticker },
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

    // If even 1-cell didn't work (shouldn't happen since cell is empty), place single
    if (!placed) {
      const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
      grid[startR][startC] = {
        type: 'sticker',
        item: { ...sticker },
        uid: generateUID(),
        groupId: generateUID(),
        shapeSize: 1,
      };
    }

    // Refresh empty list
    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

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

  // Re-label sticker cells as 'item' so existing downstream code keeps working
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && grid[r][c].type === 'sticker') {
        grid[r][c].type = 'item';
      }
    }
  }

  return { grid, doomCellCount };
}
