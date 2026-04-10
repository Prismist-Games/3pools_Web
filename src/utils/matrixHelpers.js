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
  if (base <= 0) return 0;
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
 * @param {Object} wallColor — color config object with baseDistribution, negativeBreakdown
 * @param {Object} [extraCells] — instant effect extra cells, e.g. { gold: [4, 5], refresh: [2, 2] }
 */
export function generateWall(wallStickers, wallColor, extraCells) {
  const { gridSize, doomCells, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // Phase 1: Doom cells — normal distribution (Box-Muller), median 6, stddev 1.5, range 2-10
  const u1 = Math.random();
  const u2 = Math.random();
  const normalSample = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const totalDoom = Math.max(2, Math.min(10, Math.round(6 + normalSample * 1.5)));
  const resCount = Math.max(0, Math.min(totalDoom, Math.round(totalDoom * (0.5 + (Math.random() - 0.5) * 0.3))));
  const accCount = totalDoom - resCount;

  // Spread doom: guarantee coverage of rows and columns, then greedy fill
  const rowDoomCount = Array(gridSize).fill(0);
  const colDoomCount = Array(gridSize).fill(0);

  const cellCounts = {
    doom_resolution: 0,
    doom_accumulation: 0,
    sticker: 0,
  };

  // Build shuffled doom type list
  const doomTypes = [];
  for (let i = 0; i < resCount; i++) doomTypes.push('res');
  for (let i = 0; i < accCount; i++) doomTypes.push('acc');
  doomTypes.sort(() => Math.random() - 0.5);

  const placeDoomAt = (row, col, dt) => {
    const type = dt === 'res' ? 'doom_resolution' : 'doom_accumulation';
    const cfg = dt === 'res' ? doomCells.resolution : doomCells.accumulation;
    grid[row][col] = { type, icon: cfg.icon, name: cfg.name, uid: generateUID() };
    rowDoomCount[row]++;
    colDoomCount[col]++;
    cellCounts[type]++;
  };

  // Phase 1a: Cover all 5 rows — one doom per row, prefer uncovered columns
  const shuffledRows = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  let doomIdx = 0;
  for (const row of shuffledRows) {
    if (doomIdx >= doomTypes.length) break;
    const emptyCols = [];
    for (let c = 0; c < gridSize; c++) {
      if (grid[row][c] === null) emptyCols.push(c);
    }
    if (emptyCols.length === 0) continue;
    // Prefer columns with no doom yet
    const uncoveredCols = emptyCols.filter(c => colDoomCount[c] === 0);
    const pool = uncoveredCols.length > 0 ? uncoveredCols : emptyCols;
    const col = pool[Math.floor(Math.random() * pool.length)];
    placeDoomAt(row, col, doomTypes[doomIdx++]);
  }

  // Phase 1b: If any columns still uncovered, place doom there
  for (let c = 0; c < gridSize; c++) {
    if (doomIdx >= doomTypes.length) break;
    if (colDoomCount[c] > 0) continue;
    // Find a row with fewest doom that has this column empty
    const validRows = [];
    for (let r = 0; r < gridSize; r++) {
      if (grid[r][c] === null) validRows.push(r);
    }
    if (validRows.length === 0) continue;
    const minDoom = Math.min(...validRows.map(r => rowDoomCount[r]));
    const bestRows = validRows.filter(r => rowDoomCount[r] === minDoom);
    const row = bestRows[Math.floor(Math.random() * bestRows.length)];
    placeDoomAt(row, c, doomTypes[doomIdx++]);
  }

  // Phase 1c: Place remaining doom cells with greedy spread
  while (doomIdx < doomTypes.length) {
    const minRowDoom = Math.min(...rowDoomCount);
    const candidateRows = [];
    for (let r = 0; r < gridSize; r++) {
      if (rowDoomCount[r] === minRowDoom) candidateRows.push(r);
    }
    const row = candidateRows[Math.floor(Math.random() * candidateRows.length)];
    const emptyCols = [];
    for (let c = 0; c < gridSize; c++) {
      if (grid[row][c] === null) emptyCols.push(c);
    }
    if (emptyCols.length === 0) break;
    const minColDoom = Math.min(...emptyCols.map(c => colDoomCount[c]));
    const bestCols = emptyCols.filter(c => colDoomCount[c] === minColDoom);
    const col = bestCols[Math.floor(Math.random() * bestCols.length)];
    placeDoomAt(row, col, doomTypes[doomIdx++]);
  }

  // Phase 2: Remaining cells — shuffle empty positions for bomb + extraCells + stickers
  const emptyAfterDoom = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === null) emptyAfterDoom.push([r, c]);
    }
  }
  emptyAfterDoom.sort(() => Math.random() - 0.5);
  let posIdx = 0;

  // Place bomb cells: 15% → 0, 70% → 1, 15% → 2
  const bombRoll = Math.random();
  const bombCount = bombRoll < 0.15 ? 0 : bombRoll < 0.85 ? 1 : 2;
  for (let i = 0; i < bombCount && posIdx < emptyAfterDoom.length; i++, posIdx++) {
    const [r, c] = emptyAfterDoom[posIdx];
    grid[r][c] = {
      type: 'bomb',
      icon: specialCells.bomb.icon,
      name: specialCells.bomb.name,
      uid: generateUID(),
    };
    cellCounts.bomb = (cellCounts.bomb || 0) + 1;
  }

  // Place instant-effect extra cells (from wall function)
  if (extraCells) {
    for (const [cellType, range] of Object.entries(extraCells)) {
      const [min, max] = range;
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const cellConfig = specialCells[cellType];
      if (!cellConfig) continue;
      for (let i = 0; i < count && posIdx < emptyAfterDoom.length; i++, posIdx++) {
        const [r, c] = emptyAfterDoom[posIdx];
        if (cellType === 'gold') {
          const goldAmount = 1 + Math.floor(Math.random() * 2);
          grid[r][c] = { type: 'gold', icon: cellConfig.icon, name: cellConfig.name, goldAmount, uid: generateUID() };
          cellCounts.gold++;
        } else {
          grid[r][c] = { type: cellType, icon: cellConfig.icon, name: cellConfig.name, uid: generateUID() };
          cellCounts[cellType] = (cellCounts[cellType] || 0) + 1;
        }
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
    negativeBreakdown: { doom_resolution: 4, doom_accumulation: 3 },
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
