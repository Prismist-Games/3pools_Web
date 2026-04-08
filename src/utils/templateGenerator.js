// src/utils/templateGenerator.js
import { MATRIX_CONFIG } from '../data/matrixConfig';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { CELL_TYPES, LEVEL_TEMPLATES } from '../data/levelTemplates';
import { pickWallStickers, fillDoomAndSpecials, fillEmptyCellsWithStickers } from './matrixHelpers';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Resolve a single template cell token to a concrete cell object.
 * Does NOT handle grouping — that's done at the template level.
 */
function resolveConstrainedCell(token) {
  const { doomCells, specialCells } = MATRIX_CONFIG;

  let cellType, extras = {};
  if (typeof token === 'object' && token !== null) {
    cellType = token.type;
    const { type: _, group: _g, ...rest } = token;
    extras = rest;
  } else {
    cellType = token;
  }

  switch (cellType) {
    case CELL_TYPES.EMPTY:
      return { type: 'empty', uid: generateUID() };
    case CELL_TYPES.DOOM_RESOLVE:
      return { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras };
    case CELL_TYPES.DOOM_UPGRADE:
      return { type: 'doom_upgrade', icon: doomCells.upgrade.icon, name: doomCells.upgrade.name, uid: generateUID(), ...extras };
    case CELL_TYPES.ANY_DOOM:
      return Math.random() < 0.5
        ? { type: 'doom_resolution', icon: doomCells.resolution.icon, name: doomCells.resolution.name, uid: generateUID(), ...extras }
        : { type: 'doom_upgrade', icon: doomCells.upgrade.icon, name: doomCells.upgrade.name, uid: generateUID(), ...extras };
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
      const item = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
      return { type: 'out_of_game', icon: item.icon, name: item.name, item: { ...item }, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.OUT_OF_GAME_1:
    case CELL_TYPES.OUT_OF_GAME_2:
    case CELL_TYPES.OUT_OF_GAME_3:
    case CELL_TYPES.OUT_OF_GAME_5: {
      const tier = parseInt(cellType.split('_').pop());
      const pool = OUT_OF_GAME_ITEMS.filter(i => i.score === tier);
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'out_of_game', icon: item.icon, name: item.name, item: { ...item }, uid: generateUID(), ...extras };
    }
    case CELL_TYPES.ANY_SPECIAL: {
      const types = [CELL_TYPES.GOLD, CELL_TYPES.ORDER, CELL_TYPES.OUT_OF_GAME, CELL_TYPES.BOMB];
      return resolveConstrainedCell(types[Math.floor(Math.random() * types.length)]);
    }
    case CELL_TYPES.HEAL:
      return { type: 'heal', icon: '❤️‍🩹', name: '生命恢复', healAmount: extras.healAmount ?? 1, uid: generateUID(), ...extras };
    case CELL_TYPES.BACKPACK_EXPAND:
      return { type: 'backpack_expand', icon: '🎒', name: '背包扩容', expandAmount: extras.expandAmount ?? 1, uid: generateUID(), ...extras };
    case CELL_TYPES.GRAVITY:
      return { type: 'gravity', icon: '⬇️', name: '重力开关', uid: generateUID(), ...extras };
    case CELL_TYPES.ANY_STICKER:
      // Sticker type will be assigned later during group binding
      return { type: 'sticker', item: null, uid: generateUID(), groupId: null, shapeSize: 1, ...extras };
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
 * 2. Assign sticker types: group-based binding (same group = same type = same polyomino)
 * 3. Procedural fill on blank cells, respecting settings
 */
export function generateWallFromTemplate(template) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const settings = template.settings || template.constraints || {};

  // Step 1: Resolve all template cells
  const doomCellCount = { resolution: 0, upgrade: 0 };
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token === null || token === undefined) continue;

      const cell = resolveConstrainedCell(token);
      if (cell) {
        grid[r][c] = cell;
        if (cell.type === 'doom_resolution') doomCellCount.resolution++;
        if (cell.type === 'doom_upgrade') doomCellCount.upgrade++;
      }
    }
  }

  // Step 2: Determine the wall's sticker type pool (respects stickerTypeRange globally)
  const [rangeMin, rangeMax] = settings.stickerTypeRange || [3, 4];

  // Collect all group numbers and identify which are sticker groups
  const groupNumbers = new Set();
  const stickerGroupNumbers = new Set();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token && typeof token === 'object' && token.group !== undefined) {
        groupNumbers.add(token.group);
        const cell = grid[r][c];
        if (cell && cell.type === 'sticker') stickerGroupNumbers.add(token.group);
      }
    }
  }

  // Total sticker types for the entire wall
  const distinctStickerGroups = stickerGroupNumbers.size;
  const totalMin = Math.max(rangeMin, distinctStickerGroups);
  const totalMax = Math.max(rangeMax, totalMin);
  const totalTypeCount = totalMin + Math.floor(Math.random() * (totalMax - totalMin + 1));

  // Shuffle and pick sticker types as the wall's pool
  const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
  const wallStickerPool = shuffledStickers.slice(0, Math.min(totalTypeCount, shuffledStickers.length));

  // Generate groupIds for ALL groups, sticker type binding only for sticker groups
  const groupToSticker = new Map();
  const groupToGroupId = new Map();
  let poolIdx = 0;
  for (const gNum of groupNumbers) {
    groupToGroupId.set(gNum, generateUID());
    if (stickerGroupNumbers.has(gNum)) {
      groupToSticker.set(gNum, wallStickerPool[poolIdx % wallStickerPool.length]);
      poolIdx++;
    }
  }

  // Apply groupIds to ALL grouped cells, sticker types only to sticker cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      const token = template.grid[r]?.[c];
      const gNum = (typeof token === 'object' && token !== null) ? token.group : undefined;

      if (cell.type === 'sticker') {
        // Sticker cells: assign type + groupId
        if (gNum !== undefined && groupToSticker.has(gNum)) {
          cell.item = { ...groupToSticker.get(gNum) };
          cell.groupId = groupToGroupId.get(gNum);
        } else {
          cell.item = { ...wallStickerPool[Math.floor(Math.random() * wallStickerPool.length)] };
          cell.groupId = generateUID();
        }
      } else if (gNum !== undefined && groupToGroupId.has(gNum)) {
        // Non-sticker grouped cells: only assign groupId
        cell.groupId = groupToGroupId.get(gNum);
      }
    }
  }

  // Count shape sizes for each group (ALL types, not just stickers)
  const groupCellCounts = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.groupId) {
        groupCellCounts.set(cell.groupId, (groupCellCounts.get(cell.groupId) || 0) + 1);
      }
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.groupId) {
        cell.shapeSize = groupCellCounts.get(cell.groupId) || 1;
      }
    }
  }

  // Step 3: Procedural fill on blank cells
  const proceduralDoom = fillDoomAndSpecials(grid, gridSize, {
    maxDoomInBlank: settings.maxDoomInBlank,
  });
  doomCellCount.resolution += proceduralDoom.resolution;
  doomCellCount.upgrade += proceduralDoom.upgrade;

  // Procedural sticker fill uses the same wall pool
  fillEmptyCellsWithStickers(grid, wallStickerPool, gridSize);

  // Collect all unique sticker types on the grid for preview
  const stickerMap = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'sticker' && cell.item) {
        stickerMap.set(cell.item.id, cell.item);
      }
    }
  }

  return { grid, doomCellCount, stickers: [...stickerMap.values()] };
}
