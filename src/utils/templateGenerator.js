// src/utils/templateGenerator.js
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { INGREDIENTS } from '../data/v2Config';
import { CELL_TYPES, LEVEL_TEMPLATES } from '../data/levelTemplates';
import { fillDoomAndSpecials } from './matrixHelpers';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Resolve a single template cell token to a concrete cell object.
 */
function resolveConstrainedCell(token) {
  const { doomCells, specialCells } = MATRIX_CONFIG;

  let cellType, extras = {};
  if (typeof token === 'object' && token !== null) {
    cellType = token.type;
    const { type: _, ...rest } = token;
    extras = rest;
  } else {
    cellType = token;
  }

  switch (cellType) {
    case CELL_TYPES.EMPTY:
      return { type: 'empty', uid: generateUID() };
    case CELL_TYPES.DOOM_RESOLVE:
      return { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras };
    case CELL_TYPES.ANY_DOOM:
      return { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras };
    case CELL_TYPES.BOMB:
      return { type: 'bomb', icon: specialCells.bomb.icon, name: specialCells.bomb.name, uid: generateUID(), ...extras };
    case CELL_TYPES.GOLD: {
      const [min, max] = specialCells.gold.goldRange;
      const goldAmount = extras.goldAmount ?? (min + Math.floor(Math.random() * (max - min + 1)));
      return { type: 'gold', icon: specialCells.gold.icon, name: specialCells.gold.name, goldAmount, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.ORDER:
      return { type: 'order_cell', icon: specialCells.order.icon, name: specialCells.order.name, uid: generateUID(), ...extras };
    case CELL_TYPES.OUT_OF_GAME: {
      const item = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
      return { type: 'out_of_game', icon: item.icon, name: item.name, item: { ...item }, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.OUT_OF_GAME_1:
    case CELL_TYPES.OUT_OF_GAME_2:
    case CELL_TYPES.OUT_OF_GAME_3:
    case CELL_TYPES.OUT_OF_GAME_5: {
      // Ingredients no longer have rarity — pick randomly from full pool.
      const item = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
      return { type: 'out_of_game', icon: item.icon, name: item.name, item: { ...item }, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.ANY_SPECIAL: {
      const types = [CELL_TYPES.GOLD, CELL_TYPES.ORDER, CELL_TYPES.OUT_OF_GAME, CELL_TYPES.BOMB];
      return resolveConstrainedCell(types[Math.floor(Math.random() * types.length)]);
    }
    case CELL_TYPES.HEAL:
      return { type: 'heal', icon: '❤️‍🩹', name: '生命恢复', healAmount: extras.healAmount ?? 1, uid: generateUID(), ...extras };
    case CELL_TYPES.BACKPACK_EXPAND:
      return { type: 'backpack_expand', icon: '🎒', name: '菜篮扩容', expandAmount: extras.expandAmount ?? 1, uid: generateUID(), ...extras };
    case CELL_TYPES.GRAVITY:
      return { type: 'gravity', icon: '⬇️', name: '重力开关', uid: generateUID(), ...extras };
    case CELL_TYPES.ANY_STICKER:
      // Ingredient type is assigned later from the wall's ingredient pool.
      return { type: 'ingredient', item: null, uid: generateUID(), ...extras };
    default: {
      // Handle dynamic entrance cells: "entrance:{subLevelId}"
      if (cellType && cellType.startsWith('entrance:')) {
        const subLevelId = cellType.replace('entrance:', '');
        const subLevel = LEVEL_TEMPLATES.find(t => t.id === subLevelId);
        return {
          type: 'entrance',
          subLevelId,
          icon: subLevel?.icon || '🚪',
          name: subLevel?.name || subLevelId,
          name_en: subLevel?.name_en,
          description_en: subLevel?.description_en,
          uid: generateUID(),
          ...extras,
        };
      }
      return null;
    }
  }
}

/**
 * Generate a wall from a template.
 *
 * 1. Resolve all fixed/constrained cells
 * 2. Assign sticker types from the wall's sticker pool (each sticker cell independent)
 * 3. Procedural fill on blank cells, respecting settings
 */
export function generateWallFromTemplate(template) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const settings = template.settings || template.constraints || {};

  // Step 1: Resolve all template cells
  const doomCellCount = { resolution: 0 };
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token === null || token === undefined) continue;

      const cell = resolveConstrainedCell(token);
      if (cell) {
        grid[r][c] = cell;
        if (cell.type === 'doom_resolution') doomCellCount.resolution++;
      }
    }
  }

  // Step 2: Assign random ingredient to each placeholder ingredient cell
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'ingredient' && !cell.item) {
        const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
        cell.item = { ...ing };
        cell.groupId = cell.uid;
        cell.shapeSize = 1;
      }
    }
  }

  // Step 3: Procedural fill on blank cells
  const proceduralDoom = fillDoomAndSpecials(grid, gridSize);
  doomCellCount.resolution += proceduralDoom.resolution;

  // Fill remaining empty cells with random ingredients
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== null) continue;
      const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
      grid[r][c] = { type: 'ingredient', item: { ...ing }, uid: generateUID(), groupId: generateUID(), shapeSize: 1 };
    }
  }

  // Collect all unique ingredient types on the grid for preview
  const ingredientMap = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'ingredient' && cell.item) {
        ingredientMap.set(cell.item.id, cell.item);
      }
    }
  }

  return { grid, doomCellCount, stickers: [...ingredientMap.values()] };
}
