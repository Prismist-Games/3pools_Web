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

// --- Outside-item cells on the wall ---
// Probability and count for spawning out-of-game items directly as wall cells.
// Each wall rolls against OUTSIDE_ITEM_WALL_CHANCE; on hit, 1–2 items are placed.
// Drawing the cell adds the item directly to the inventory.
const OUTSIDE_ITEM_WALL_CHANCE = 0.3; // 20–40% target: using 30%
const OUTSIDE_ITEM_MIN = 1;
const OUTSIDE_ITEM_MAX = 2;

/**
 * Generate a wall matrix for one turn using sticker types and a wallColor config.
 *
 * Phase 1: Place bombs + extra cells from the wall function
 * Phase 2: Fill remaining empty cells with sticker shapes (polyomino algorithm)
 *
 * Walls start fully populated; drawn cells become "blanks" in the hook layer.
 * Multi-cell stickers share a groupId so drawing any cell obtains the whole sticker.
 *
 * @param {Array} wallStickers — array of sticker type objects from STICKER_TYPES
 * @param {Object} wallColor — color config object
 * @param {Object} [extraCells] — instant effect extra cells, e.g. { gold: [4, 5], refresh: [2, 2] }
 */
export function generateWall(wallStickers, wallColor, extraCells) {
  const { gridSize, itemShapes, specialCells } = MATRIX_CONFIG;
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // Doom cells are no longer placed on walls. Doom accumulation happens
  // purely through the turn-based phase timeline.
  const cellCounts = {
    doom_resolution: 0,
    doom_accumulation: 0,
    sticker: 0,
    out_of_game: 0,
  };

  // Phase 2: Shuffle empty positions for bomb + extraCells + stickers
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

  // Place 1–2 out-of-game item cells (30% chance per wall).
  // Drawing the cell adds the item directly to the inventory.
  if (Math.random() < OUTSIDE_ITEM_WALL_CHANCE) {
    const count = OUTSIDE_ITEM_MIN
      + Math.floor(Math.random() * (OUTSIDE_ITEM_MAX - OUTSIDE_ITEM_MIN + 1));
    for (let i = 0; i < count && posIdx < emptyAfterDoom.length; i++, posIdx++) {
      const [r, c] = emptyAfterDoom[posIdx];
      const itemDef = OUT_OF_GAME_ITEMS[Math.floor(Math.random() * OUT_OF_GAME_ITEMS.length)];
      grid[r][c] = {
        type: 'out_of_game',
        icon: itemDef.icon,
        name: itemDef.name,
        item: { ...itemDef },
        uid: generateUID(),
      };
      cellCounts.out_of_game++;
    }
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
  empty.sort(() => Math.random() - 0.5);

  while (empty.length > 0) {
    const [startR, startC] = empty[0];
    if (grid[startR][startC] !== null) {
      empty.shift();
      continue;
    }

    let size = rollItemSize(itemShapes.weights);
    let placed = false;

    while (size >= 1 && !placed) {
      const shapesForSize = itemShapes.shapes[size];
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

    empty = getEmptyPositions();
    empty.sort(() => Math.random() - 0.5);
  }

  return { grid, cellCounts };
}

/**
 * Generate a grid for a specific pool type.
 * Uses the pool's gridRules, stickerFilter, itemFilter, and itemTierFilter/Bias.
 *
 * @param {Object} poolType — pool type definition from poolTypes.js
 * @param {Array} allStickers — STICKER_TYPES array
 * @param {Array} allItems — OUT_OF_GAME_ITEMS array
 * @param {Object} [stickerWeightsOverride] — optional { stickerId: weight } map that
 *   overrides poolType.stickerWeights for this call. Used for per-instance sticker bias
 *   (see buildBiasedStickerWeights in poolTypes.js).
 * @returns {{ grid, cellCounts }}
 */
export function generatePoolGrid(poolType, allStickers, allItems, stickerWeightsOverride) {
    const { gridSize, specialCells } = MATRIX_CONFIG;
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    const cellCounts = { sticker: 0, out_of_game: 0, gold: 0, empty: 0 };

    const rules = poolType.gridRules;

    // Determine which stickers this pool uses — prefer weighted map if present
    // (stickerWeights = { stickerId: weight }); falls back to stickerFilter array.
    // stickerWeightsOverride (if supplied) takes precedence over poolType.stickerWeights.
    const stickerWeights = stickerWeightsOverride || poolType.stickerWeights || null;
    let poolStickers;
    if (stickerWeights && Object.keys(stickerWeights).length > 0) {
        poolStickers = allStickers.filter(s => stickerWeights[s.id] > 0);
    } else if (poolType.stickerFilter && poolType.stickerFilter.length > 0) {
        poolStickers = allStickers.filter(s => poolType.stickerFilter.includes(s.id));
    } else if (poolType.stickerFilter === null) {
        // allow all — for walls like general
        poolStickers = [...allStickers];
    } else {
        // stickerFilter is [] (e.g. L3 walls) — no stickers allowed
        poolStickers = [];
    }

    // Helper: pick a sticker respecting weights (if provided) or uniformly.
    const pickSticker = () => {
        if (poolStickers.length === 0) return null;
        if (stickerWeights && Object.keys(stickerWeights).length > 0) {
            const entries = poolStickers
                .map(s => [s, stickerWeights[s.id] || 0])
                .filter(([, w]) => w > 0);
            if (entries.length === 0) return poolStickers[Math.floor(Math.random() * poolStickers.length)];
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let roll = Math.random() * total;
            for (const [s, w] of entries) {
                roll -= w;
                if (roll <= 0) return s;
            }
            return entries[entries.length - 1][0];
        }
        return poolStickers[Math.floor(Math.random() * poolStickers.length)];
    };

    // Determine which items this pool can contain
    let poolItems = [];
    if (poolType.itemFilter === null) {
        // All items matching tier filter
        if (poolType.itemTierFilter && poolType.itemTierFilter.length > 0) {
            poolItems = allItems.filter(i => poolType.itemTierFilter.includes(i.stars));
        } else {
            poolItems = [...allItems];
        }
    } else if (poolType.itemFilter && poolType.itemFilter.length > 0) {
        poolItems = allItems.filter(i => poolType.itemFilter.includes(i.id));
    }
    // If itemFilter is undefined (walls that don't produce items), poolItems stays empty.

    // Shuffle positions
    const positions = [];
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            positions.push([r, c]);
        }
    }
    positions.sort(() => Math.random() - 0.5);
    let posIdx = 0;

    // Reserve empty cells — leave as null (finite wall content, no auto-refill)
    const emptyCount = Math.max(0, rules.empty || 0);
    for (let i = 0; i < emptyCount && posIdx < positions.length; i++, posIdx++) {
        // Leave grid[r][c] as null (already initialized to null)
        cellCounts.empty++;
    }

    // Place gold cells
    const goldCount = Math.max(0, rules.gold + Math.floor((Math.random() - 0.5) * 2));
    for (let i = 0; i < goldCount && posIdx < positions.length; i++, posIdx++) {
        const [r, c] = positions[posIdx];
        const goldAmount = 1 + Math.floor(Math.random() * 3); // 1-3 gold
        grid[r][c] = {
            type: 'gold',
            icon: specialCells.gold.icon,
            name: specialCells.gold.name,
            goldAmount,
            uid: generateUID(),
        };
        cellCounts.gold++;
    }

    // Place item cells (out_of_game)
    const itemCount = Math.max(0, rules.items + Math.floor((Math.random() - 0.5) * 2));
    if (poolItems.length > 0) {
        for (let i = 0; i < itemCount && posIdx < positions.length; i++, posIdx++) {
            const [r, c] = positions[posIdx];
            let itemDef;
            if (poolType.itemTierBias) {
                // Weighted random by tier
                const entries = Object.entries(poolType.itemTierBias);
                const total = entries.reduce((sum, [, w]) => sum + w, 0);
                let roll = Math.random() * total;
                let chosenTier = Number(entries[0][0]);
                for (const [tier, weight] of entries) {
                    roll -= weight;
                    if (roll <= 0) { chosenTier = Number(tier); break; }
                }
                const tierItems = poolItems.filter(it => it.stars === chosenTier);
                itemDef = tierItems.length > 0
                    ? tierItems[Math.floor(Math.random() * tierItems.length)]
                    : poolItems[Math.floor(Math.random() * poolItems.length)];
            } else {
                itemDef = poolItems[Math.floor(Math.random() * poolItems.length)];
            }
            grid[r][c] = {
                type: 'out_of_game',
                icon: itemDef.icon,
                name: itemDef.name,
                item: { ...itemDef },
                uid: generateUID(),
            };
            cellCounts.out_of_game++;
        }
    }

    // Fill remaining NON-empty cells — stickers if allowed, otherwise gold.
    // Empty cells (reserved above) stay as null — wall content is finite.
    const noStickers = poolStickers.length === 0;

    for (; posIdx < positions.length; posIdx++) {
        const [r, c] = positions[posIdx];
        if (grid[r][c] !== null) continue;
        if (noStickers) {
            grid[r][c] = {
                type: 'gold',
                icon: specialCells.gold.icon,
                name: specialCells.gold.name,
                goldAmount: 1 + Math.floor(Math.random() * 3),
                uid: generateUID(),
            };
            cellCounts.gold++;
        } else {
            const sticker = pickSticker();
            grid[r][c] = {
                type: 'sticker',
                item: { ...sticker },
                uid: generateUID(),
                groupId: generateUID(),
                shapeSize: 1,
            };
            cellCounts.sticker++;
        }
    }

    // NOTE: remaining null cells are intentional empty cells (finite wall content).
    // Do NOT fill them — they represent depleted / absent slots.

    return { grid, cellCounts };
}

/** Internal: get filtered items list for a pool type */
function _getPoolItems(poolType, allItems) {
    if (poolType.itemFilter === null) {
        if (poolType.itemTierFilter && poolType.itemTierFilter.length > 0) {
            return allItems.filter(i => poolType.itemTierFilter.includes(i.stars));
        }
        return [...allItems];
    } else if (poolType.itemFilter && poolType.itemFilter.length > 0) {
        return allItems.filter(i => poolType.itemFilter.includes(i.id));
    }
    return [];
}

/** Internal: make a random sticker cell respecting the pool's sticker filter/weights.
 *  Returns null if this pool has no stickers at all (e.g. L3 walls) — caller should
 *  fall back to gold instead. */
function _makeRandomSticker(poolType, allStickers, stickerWeightsOverride) {
    const stickerWeights = stickerWeightsOverride || poolType.stickerWeights || null;
    let poolStickers;
    if (stickerWeights && Object.keys(stickerWeights).length > 0) {
        poolStickers = allStickers.filter(s => stickerWeights[s.id] > 0);
    } else if (poolType.stickerFilter && poolType.stickerFilter.length > 0) {
        poolStickers = allStickers.filter(s => poolType.stickerFilter.includes(s.id));
    } else if (poolType.stickerFilter === null) {
        poolStickers = [...allStickers];
    } else {
        poolStickers = [];
    }
    if (poolStickers.length === 0) return null;

    let sticker;
    if (stickerWeights && Object.keys(stickerWeights).length > 0) {
        const entries = poolStickers
            .map(s => [s, stickerWeights[s.id] || 0])
            .filter(([, w]) => w > 0);
        if (entries.length === 0) {
            sticker = poolStickers[Math.floor(Math.random() * poolStickers.length)];
        } else {
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let roll = Math.random() * total;
            sticker = entries[entries.length - 1][0];
            for (const [s, w] of entries) {
                roll -= w;
                if (roll <= 0) { sticker = s; break; }
            }
        }
    } else {
        sticker = poolStickers[Math.floor(Math.random() * poolStickers.length)];
    }

    return {
        type: 'sticker',
        item: { ...sticker },
        uid: generateUID(),
        groupId: generateUID(),
        shapeSize: 1,
    };
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
