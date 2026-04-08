import { MATRIX_CONFIG } from '../data/matrixConfig';
import { OUT_OF_GAME_ITEMS } from '../data/v2Config';

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

/** Apply ±1 variance to a base count, clamped to ≥0 */
function variedCount(base) {
  return Math.max(0, Math.round(base + (Math.random() - 0.5) * 2));
}

/**
 * Randomly pick min–max sticker types from the full sticker array.
 */
export function pickWallStickers(allStickers, min = 2, max = 4) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...allStickers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a 5×5 wall matrix for one turn using sticker types and a wallColor config.
 *
 * Phase 1: Determine cell counts from wallColor.baseDistribution with ±1 variance
 * Phase 2: Shuffle all 25 positions, place negative/gold/evacuation cells in order
 * Phase 3: Fill remaining empty cells with sticker shapes (polyomino algorithm)
 *
 * Multi-cell stickers share a groupId so drawing any cell obtains the whole sticker.
 *
 * @param {Array} wallStickers — array of sticker type objects from STICKER_TYPES
 * @param {Object} wallColor — color config object from WALL_COLORS with baseDistribution, negativeBreakdown, stickerRange
 */
export function generateWall(wallStickers, wallColor) {
  const { gridSize, doomCells, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // Phase 1: Determine cell counts from wallColor config
  const { baseDistribution, negativeBreakdown } = wallColor;

  // Total negative cells
  const totalNegative = variedCount(baseDistribution.negative);

  // Negative breakdown — proportion-based, then apply variance
  const nbEntries = Object.entries(negativeBreakdown);
  const nbTotal = nbEntries.reduce((sum, [, v]) => sum + v, 0);
  const negativeCounts = {};
  let allocatedNegative = 0;
  for (let i = 0; i < nbEntries.length; i++) {
    const [key, weight] = nbEntries[i];
    if (i === nbEntries.length - 1) {
      // Last entry gets remainder to avoid rounding drift
      negativeCounts[key] = Math.max(0, totalNegative - allocatedNegative);
    } else {
      const base = (weight / nbTotal) * totalNegative;
      negativeCounts[key] = variedCount(base);
      allocatedNegative += negativeCounts[key];
    }
  }

  // Gold cells
  const goldCount = variedCount(baseDistribution.gold);

  // Evacuation cells
  const evacValue = baseDistribution.evacuation;
  const evacCount = evacValue >= 1 ? 1 : (Math.random() < evacValue ? 1 : 0);

  // Phase 2: Shuffle all grid positions and place cells in order
  const allPositions = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allPositions.push([r, c]);
    }
  }
  allPositions.sort(() => Math.random() - 0.5);

  let posIdx = 0;
  const cellCounts = {
    doom_resolution: 0,
    doom_accumulation: 0,
    damage: 0,
    gold: 0,
    evacuation: 0,
    sticker: 0,
  };

  // Place doom_resolution cells
  for (let i = 0; i < negativeCounts.doom_resolution && posIdx < allPositions.length; i++, posIdx++) {
    const [r, c] = allPositions[posIdx];
    grid[r][c] = {
      type: 'doom_resolution',
      icon: doomCells.resolution.icon,
      name: doomCells.resolution.name,
      uid: generateUID(),
    };
    cellCounts.doom_resolution++;
  }

  // Place doom_accumulation cells
  for (let i = 0; i < negativeCounts.doom_accumulation && posIdx < allPositions.length; i++, posIdx++) {
    const [r, c] = allPositions[posIdx];
    grid[r][c] = {
      type: 'doom_accumulation',
      icon: doomCells.accumulation.icon,
      name: doomCells.accumulation.name,
      uid: generateUID(),
    };
    cellCounts.doom_accumulation++;
  }

  // Place damage cells
  for (let i = 0; i < negativeCounts.damage && posIdx < allPositions.length; i++, posIdx++) {
    const [r, c] = allPositions[posIdx];
    grid[r][c] = {
      type: 'damage',
      icon: doomCells.damage.icon,
      name: doomCells.damage.name,
      uid: generateUID(),
    };
    cellCounts.damage++;
  }

  // Place gold cells
  for (let i = 0; i < goldCount && posIdx < allPositions.length; i++, posIdx++) {
    const [r, c] = allPositions[posIdx];
    const goldAmount = 1 + Math.floor(Math.random() * 2); // 1–2
    grid[r][c] = {
      type: 'gold',
      icon: specialCells.gold.icon,
      name: specialCells.gold.name,
      goldAmount,
      uid: generateUID(),
    };
    cellCounts.gold++;
  }

  // Place evacuation cells
  for (let i = 0; i < evacCount && posIdx < allPositions.length; i++, posIdx++) {
    const [r, c] = allPositions[posIdx];
    grid[r][c] = {
      type: 'evacuation',
      icon: specialCells.evacuation.icon,
      name: specialCells.evacuation.name,
      uid: generateUID(),
    };
    cellCounts.evacuation++;
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
          cellCounts.sticker += positions.length;
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
      cellCounts.sticker++;
    }

    // Refresh empty list
    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

  return { grid, cellCounts };
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

  // Legacy fallback wallColor for backward compatibility
  const legacyWallColor = {
    baseDistribution: { sticker: 10, gold: 3, negative: 7, evacuation: 0 },
    negativeBreakdown: { doom_resolution: 4, doom_accumulation: 3, damage: 0 },
  };

  const { grid, cellCounts } = generateWall(pseudoStickers, legacyWallColor);

  // Re-label sticker cells as 'item' so existing downstream code keeps working
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && grid[r][c].type === 'sticker') {
        grid[r][c].type = 'item';
      }
    }
  }

  // Return doomCellCount for backward compatibility
  const doomCellCount = {
    resolution: cellCounts.doom_resolution,
    upgrade: cellCounts.doom_accumulation,
  };

  return { grid, doomCellCount };
}
