import { MATRIX_CONFIG, pickDoomEmoji } from '../data/matrixConfig';
import { TOOLS } from '../data/v2Config';
import { LIVE_CONFIG } from '../data/runtimeConfig';
import { getActiveIngredients } from './activePool';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Pick all ingredients belonging to a market type's category.
 * @param {Object} marketType — from MARKET_TYPES, has .category
 */
export function pickMarketIngredients(marketType) {
  return getActiveIngredients().filter(i => i.tags[0] === marketType.category);
}

/**
 * Roll a single cell — same semantics as generateWall's Phase 1+2+3 but for
 * one position. Used by bomb_wall tool refill. Returns a fully formed cell
 * (doom / gold / order_cell / bomb / tool / ingredient).
 *
 * @param {Array} marketIngredients — ingredient pool to pull from for ingredient fallthrough
 */
export function rollSingleCell(marketIngredients) {
  const { doomCells, specialCells } = MATRIX_CONFIG;
  const cs = LIVE_CONFIG.cellSpawn;
  const doomChance = cs.doom;
  const goldChance = doomChance + cs.gold;
  const orderChance = goldChance + cs.order;
  const bombChance = orderChance + (cs.bomb || 0);
  const toolChance = bombChance + (cs.tool || 0);

  const roll = Math.random();

  if (roll < doomChance) {
    return { type: 'doom_resolution', icon: pickDoomEmoji(), name: doomCells.resolution.name, uid: generateUID() };
  }
  if (roll < goldChance) {
    const [min, max] = specialCells.gold.goldRange;
    const goldAmount = min + Math.floor(Math.random() * (max - min + 1));
    return { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID() };
  }
  if (roll < orderChance) {
    return { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID() };
  }
  if (roll < bombChance) {
    return { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID() };
  }
  if (roll < toolChance) {
    const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
    return {
      type: 'tool',
      toolId: tool.id,
      name: tool.name,
      nameEn: tool.nameEn,
      icon: tool.icon,
      uid: generateUID(),
    };
  }
  const ing = marketIngredients[Math.floor(Math.random() * marketIngredients.length)];
  return {
    type: 'ingredient',
    item: { ...ing },
    uid: generateUID(),
  };
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
      const toolChance = bombChance + (LIVE_CONFIG.cellSpawn.tool || 0);

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
      } else if (roll < toolChance) {
        const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
        grid[row][col] = {
          type: 'tool',
          toolId: tool.id,
          name: tool.name,
          nameEn: tool.nameEn,
          icon: tool.icon,
          uid: generateUID(),
        };
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

