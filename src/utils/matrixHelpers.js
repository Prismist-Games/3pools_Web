import { MATRIX_CONFIG } from '../data/matrixConfig';

/**
 * Get a flat list of all normal items from pool data.
 * Each item gets poolId and poolName attached.
 */
function getAllItemsFromPools(pools) {
  const items = [];
  for (const pool of pools) {
    for (const item of pool.items) {
      items.push({
        ...item,
        poolId: pool.id,
        poolName: pool.name,
      });
    }
  }
  return items;
}

/**
 * Generate a single item cell from available items.
 */
function generateItemCell(allItems) {
  const item = allItems[Math.floor(Math.random() * allItems.length)];
  return {
    type: 'item',
    item: item,
    uid: crypto.randomUUID(),
  };
}

/**
 * Generate a 5×5 matrix for one turn.
 * Each cell position independently rolls for doom cells (resolution/upgrade).
 * If no doom cell spawns, the cell is a random item.
 *
 * @param {Array} pools - Pool data from config (INITIAL_POOLS_DATA)
 * @returns {{ grid: Array<Array<object>>, doomCellCount: { resolution: number, upgrade: number } }}
 */
export function generateTurnMatrix(pools) {
  const { gridSize, doomCells } = MATRIX_CONFIG;
  const allItems = getAllItemsFromPools(pools);
  const grid = [];
  const doomCellCount = { resolution: 0, upgrade: 0 };

  for (let row = 0; row < gridSize; row++) {
    const rowCells = [];
    for (let col = 0; col < gridSize; col++) {
      // Roll for doom cells (resolution first, then upgrade)
      const resolutionRoll = Math.random();
      const upgradeRoll = Math.random();

      if (resolutionRoll < doomCells.resolution.spawnChance) {
        rowCells.push({
          type: 'doom_resolution',
          icon: doomCells.resolution.icon,
          name: doomCells.resolution.name,
          uid: crypto.randomUUID(),
        });
        doomCellCount.resolution++;
      } else if (upgradeRoll < doomCells.upgrade.spawnChance) {
        rowCells.push({
          type: 'doom_upgrade',
          icon: doomCells.upgrade.icon,
          name: doomCells.upgrade.name,
          uid: crypto.randomUUID(),
        });
        doomCellCount.upgrade++;
      } else {
        rowCells.push(generateItemCell(allItems));
      }
    }
    grid.push(rowCells);
  }

  return { grid, doomCellCount };
}
