import { MATRIX_CONFIG } from '../data/matrixConfig';
import { STICKER_TYPES, OUT_OF_GAME_ITEMS } from '../data/v2Config';
import { CELL_TYPES } from '../data/levelTemplates';
import { pickWallStickers, fillDoomAndSpecials, fillEmptyCellsWithStickers } from './matrixHelpers';

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Resolve constrained cell types to concrete cell objects.
 * Binds sticker_A/B/C to random sticker types (consistent within one template).
 */
function resolveConstrainedCell(token, stickerBindings) {
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
    case CELL_TYPES.ANY_SPECIAL: {
      const types = [CELL_TYPES.GOLD, CELL_TYPES.ORDER, CELL_TYPES.OUT_OF_GAME, CELL_TYPES.BOMB];
      return resolveConstrainedCell(types[Math.floor(Math.random() * types.length)], stickerBindings);
    }
    case CELL_TYPES.ANY_STICKER: {
      const sticker = STICKER_TYPES[Math.floor(Math.random() * STICKER_TYPES.length)];
      return { type: 'sticker', item: { ...sticker }, uid: generateUID(), groupId: generateUID(), shapeSize: 1, ...extras };
    }
    case CELL_TYPES.STICKER_A:
    case CELL_TYPES.STICKER_B:
    case CELL_TYPES.STICKER_C: {
      const sticker = stickerBindings[cellType];
      return { type: 'sticker', item: { ...sticker }, uid: generateUID(), groupId: generateUID(), shapeSize: 1, ...extras };
    }
    default:
      return null;
  }
}

/**
 * Generate a wall from a template.
 *
 * 1. Bind sticker_A/B/C to random distinct sticker types
 * 2. Resolve all fixed/constrained cells
 * 3. Group adjacent same-binding sticker cells into polyomino groups
 * 4. Run procedural fill (doom + specials + stickers) on blank cells, respecting constraints
 */
export function generateWallFromTemplate(template) {
  const { gridSize } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const constraints = template.constraints || {};

  // Step 1: Bind sticker slots to random distinct types
  const shuffledStickers = [...STICKER_TYPES].sort(() => Math.random() - 0.5);
  const stickerBindings = {
    [CELL_TYPES.STICKER_A]: shuffledStickers[0],
    [CELL_TYPES.STICKER_B]: shuffledStickers[1],
    [CELL_TYPES.STICKER_C]: shuffledStickers[2],
  };

  // Step 2: Resolve fixed/constrained cells
  const doomCellCount = { resolution: 0, upgrade: 0 };
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const token = template.grid[r]?.[c];
      if (token === null || token === undefined) continue;

      const cell = resolveConstrainedCell(token, stickerBindings);
      if (cell) {
        grid[r][c] = cell;
        if (cell.type === 'doom_resolution') doomCellCount.resolution++;
        if (cell.type === 'doom_upgrade') doomCellCount.upgrade++;
      }
    }
  }

  // Step 3: Group adjacent sticker cells with same item.id into polyominos
  const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (!cell || cell.type !== 'sticker' || visited[r][c]) continue;

      const itemId = cell.item.id;
      const group = [];
      const queue = [[r, c]];
      visited[r][c] = true;

      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        group.push([cr, cc]);
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
          if (visited[nr][nc]) continue;
          const neighbor = grid[nr][nc];
          if (neighbor && neighbor.type === 'sticker' && neighbor.item.id === itemId) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      const groupId = generateUID();
      for (const [gr, gc] of group) {
        grid[gr][gc].groupId = groupId;
        grid[gr][gc].shapeSize = group.length;
      }
    }
  }

  // Step 4: Procedural fill on remaining blank cells
  const proceduralDoom = fillDoomAndSpecials(grid, gridSize, constraints);
  doomCellCount.resolution += proceduralDoom.resolution;
  doomCellCount.upgrade += proceduralDoom.upgrade;

  const stickerCount = constraints.stickerTypeCount || (3 + Math.floor(Math.random() * 2));
  const wallStickers = pickWallStickers(STICKER_TYPES, stickerCount, stickerCount);
  fillEmptyCellsWithStickers(grid, wallStickers, gridSize);

  // Collect all unique sticker types actually present on the grid
  const stickerMap = new Map();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell && cell.type === 'sticker' && cell.item) {
        stickerMap.set(cell.item.id, cell.item);
      }
    }
  }
  const allStickers = [...stickerMap.values()];

  return { grid, doomCellCount, stickers: allStickers };
}
