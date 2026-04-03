import { MATRIX_CONFIG } from '../data/matrixConfig';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getAllItemsFromPools(pools) {
  const items = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      items.push({ ...item, poolId: pool.id, poolName: pool.name });
    }
  }
  return items;
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
 * Generate a 5×5 matrix for one turn.
 *
 * 1. Roll doom cells per position (independent)
 * 2. Fill remaining empty cells with items of varying sizes (1-4 cells)
 *    Larger items are rarer. Uses Tetris-like polyomino shapes.
 *
 * Multi-cell items share a groupId so drawing any cell obtains the whole item.
 */
export function generateTurnMatrix(pools) {
  const { gridSize, doomCells, itemShapes } = MATRIX_CONFIG;
  const allItems = getAllItemsFromPools(pools);
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0, upgrade: 0 };

  // Phase 1: Roll doom cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const resRoll = Math.random();
      const upgRoll = Math.random();
      if (resRoll < doomCells.resolution.spawnChance) {
        grid[row][col] = {
          type: 'doom_resolution',
          icon: doomCells.resolution.icon,
          name: doomCells.resolution.name,
          uid: generateUID(),
        };
        doomCellCount.resolution++;
      } else if (upgRoll < doomCells.upgrade.spawnChance) {
        grid[row][col] = {
          type: 'doom_upgrade',
          icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name,
          uid: generateUID(),
        };
        doomCellCount.upgrade++;
      }
    }
  }

  // Phase 2: Fill empty cells with shaped items
  // Collect empty positions
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

    // Roll item size
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
          // Place the item
          const item = allItems[Math.floor(Math.random() * allItems.length)];
          const groupId = generateUID();
          for (const [r, c] of positions) {
            grid[r][c] = {
              type: 'item',
              item: { ...item },
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
      const item = allItems[Math.floor(Math.random() * allItems.length)];
      grid[startR][startC] = {
        type: 'item',
        item: { ...item },
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
