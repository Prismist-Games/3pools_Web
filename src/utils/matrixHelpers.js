import { MATRIX_CONFIG, pickDoomEmoji } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';
import { LIVE_CONFIG } from '../data/runtimeConfig';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function rollMinQualityLevel() {
  const weights = LIVE_CONFIG.minQuality.weights;
  const r = Math.random();
  let cum = 0;
  for (const [q, w] of Object.entries(weights)) {
    cum += w;
    if (r < cum) return Number(q);
  }
  return 2;
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
 * Phase 1 + 2: Per-cell roll for doom / gold / order / bomb
 * Phase 3: Fill every remaining cell with one independent ingredient
 *
 * Grid cells do NOT store quality — quality is assigned at draw time.
 * Each ingredient cell is a standalone 1×1 entity.
 *
 * @param {Array} marketIngredients — ingredient objects filtered by market category
 */
export function generateWall(marketIngredients) {
  if (!marketIngredients?.length) {
    throw new Error('generateWall: marketIngredients is empty or undefined');
  }
  const { gridSize, doomCells, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const doomCellCount = { resolution: 0 };

  // Phase 1 + 2: Doom and special cells — per-cell probability roll.
  // Rates read from LIVE_CONFIG.cellSpawn so ConfigPanel tweaks take effect
  // on the next-generated wall.
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] !== null) continue;

      const roll = Math.random();
      const doomChance = LIVE_CONFIG.cellSpawn.doom;
      const goldChance = doomChance + LIVE_CONFIG.cellSpawn.gold;
      const orderChance = goldChance + LIVE_CONFIG.cellSpawn.order;
      const bombChance = orderChance + (LIVE_CONFIG.cellSpawn.bomb || 0);

      if (roll < doomChance) {
        grid[row][col] = { type: 'doom_resolution', icon: pickDoomEmoji(), name: doomCells.resolution.name, uid: generateUID() };
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

  // Phase 3: Fill each remaining cell with one independent ingredient.
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== null) continue;
      const ingredient = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
      grid[r][c] = {
        type: 'ingredient',
        item: { ...ingredient },
        uid: generateUID(),
      };
    }
  }

  // Assign minQuality to 2-4 ingredient types present on the grid. Each
  // cell owns its own clone of an ingredient, so we key by item.id and
  // stamp minQuality onto every cell whose item matches a selected id.
  const idToCells = new Map(); // item.id -> array of cell refs
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell?.type !== 'ingredient' || !cell.item?.id) continue;
      const list = idToCells.get(cell.item.id);
      if (list) list.push(cell);
      else idToCells.set(cell.item.id, [cell]);
    }
  }
  const ids = [...idToCells.keys()];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const [minCount, maxCount] = LIVE_CONFIG.minQuality.countRange;
  const variantCount = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  for (let i = 0; i < Math.min(variantCount, ids.length); i++) {
    const q = rollMinQualityLevel();
    for (const cell of idToCells.get(ids[i])) {
      cell.item.minQuality = q;
    }
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
        grid[row][col] = { type: 'doom_resolution', icon: pickDoomEmoji(), name: doomCells.resolution.name, uid: generateUID() };
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

