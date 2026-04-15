import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
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
 * Single-pass roll per cell — chances accumulate in a fixed order, the
 * remainder stays null and gets filled with a sticker in phase 3.
 */
export function fillDoomAndSpecials(grid, gridSize) {
  const { specialCells, doomCells } = MATRIX_CONFIG;
  const doomCellCount = { resolution: 0, upgrade: 0 };

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;
      const roll = Math.random();
      const goldChance = specialCells.gold.spawnChance;
      const orderChance = goldChance + specialCells.order.spawnChance;
      const outOfGameChance = orderChance + specialCells.outOfGame.spawnChance;
      const bombChance = outOfGameChance + (specialCells.bomb?.spawnChance || 0);
      const doomResChance = bombChance + (doomCells?.resolution?.spawnChance || 0);
      const doomUpChance = doomResChance + (doomCells?.upgrade?.spawnChance || 0);

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
        // Pick rarity first (★40%, ★★30%, ★★★20%, ★★★★10%), then uniform within that rarity
        const rarityRoll = Math.random();
        const rarity = rarityRoll < 0.4 ? 1 : rarityRoll < 0.7 ? 2 : rarityRoll < 0.9 ? 3 : 4;
        const pool = INGREDIENTS.filter(i => i.rarity === rarity);
        const item = pool[Math.floor(Math.random() * pool.length)];
        grid[row][col] = {
          type: 'out_of_game', icon: item.icon,
          name: item.name, item: { ...item }, uid: generateUID(),
        };
      } else if (roll < bombChance) {
        grid[row][col] = {
          type: 'bomb', icon: specialCells.bomb.icon,
          name: specialCells.bomb.name, uid: generateUID(),
        };
      } else if (roll < doomResChance) {
        grid[row][col] = {
          type: 'doom_resolution', icon: doomCells.resolution.icon,
          name: doomCells.resolution.name, uid: generateUID(),
        };
        doomCellCount.resolution++;
      } else if (roll < doomUpChance) {
        grid[row][col] = {
          type: 'doom_upgrade', icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name, uid: generateUID(),
        };
        doomCellCount.upgrade++;
      }
    }
  }

  return doomCellCount;
}

/**
 * Phase 3: Fill all remaining null cells with independent 1×1 stickers.
 */
export function fillEmptyCellsWithStickers(grid, wallStickers, gridSize) {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== null) continue;
      const sticker = wallStickers[Math.floor(Math.random() * wallStickers.length)];
      grid[r][c] = {
        type: 'sticker',
        item: { ...sticker },
        uid: generateUID(),
      };
    }
  }
}

/**
 * Generate a fully procedural wall (size from MATRIX_CONFIG.gridSize).
 * Each cell is an independent 1×1 sticker or a special/doom cell.
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
