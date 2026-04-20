/**
 * Cell type tokens for template grids.
 * null = blank (procedural fill)
 * String tokens = fixed or constrained cells
 * Object tokens = cell with extra properties (e.g. multiplier)
 */
export const CELL_TYPES = {
  // Structural
  EMPTY: 'empty',                // true blank — skipped during draw, not filled by procedural
  // Fixed types
  DOOM_RESOLVE: 'doom_resolve',
  BOMB: 'bomb',
  GOLD: 'gold',
  ORDER: 'order',
  OUT_OF_GAME: 'out_of_game',
  OUT_OF_GAME_1: 'out_of_game_1',   // 1分物品
  OUT_OF_GAME_2: 'out_of_game_2',   // 2分物品
  OUT_OF_GAME_3: 'out_of_game_3',   // 3分物品
  OUT_OF_GAME_5: 'out_of_game_5',   // 5分物品
  // Effect types
  HEAL: 'heal',                     // restore HP
  BACKPACK_EXPAND: 'backpack_expand', // +backpack slots
  GRAVITY: 'gravity',               // triggers gravity — all cells fall down
  // Constrained types (resolved at generation time)
  ANY_DOOM: 'any_doom',           // alias for doom_resolve
  ANY_SPECIAL: 'any_special',     // randomly gold/order/out_of_game/bomb
  ANY_STICKER: 'any_sticker',     // random sticker type (1×1)
};

// --- Levels: auto-imported from src/data/levels/*.json ---

const levelModules = import.meta.glob('./levels/*.json', { eager: true });
export const LEVEL_TEMPLATES = Object.values(levelModules)
  .map(m => m.default)
  .filter(t => t && Array.isArray(t.grid)); // skip non-level JSONs that may end up in the folder

// --- Role-based helpers ---

/** Get all levels marked as sub-levels */
export function getSubLevels() {
  return LEVEL_TEMPLATES.filter(t => t.role === 'sub');
}

/** Get all main levels (role is 'main' or unset — backward compatible) */
export function getMainLevels() {
  return LEVEL_TEMPLATES.filter(t => t.role !== 'sub');
}

// --- Schedule config: imported from levelSchedule.json ---

import scheduleConfig from './levelSchedule.json';

export const LEVEL_SCHEDULE = scheduleConfig;

/**
 * Get the active schedule config.
 * If localStorage has an override (local mode from Level Manager), use that.
 * Otherwise fall back to the JSON file defaults.
 */
export function getActiveSchedule() {
  try {
    const local = localStorage.getItem('levelScheduleLocal');
    if (local) return JSON.parse(local);
  } catch { /* ignore */ }
  return LEVEL_SCHEDULE;
}

/**
 * Pick a level template based on schedule weights, or null for procedural.
 * @param {number} expeditionNumber — current expedition (1-based)
 */
export function pickTemplate(expeditionNumber) {
  const { proceduralWeight, levels } = getActiveSchedule();

  const mainLevels = getMainLevels();
  const eligible = Object.entries(levels)
    .filter(([, cfg]) => cfg.enabled && expeditionNumber >= (cfg.minExpedition || 1))
    .map(([id, cfg]) => {
      const template = mainLevels.find(t => t.id === id);
      return template ? { template, weight: cfg.weight } : null;
    })
    .filter(Boolean);

  const totalLevelWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  const totalWeight = totalLevelWeight + proceduralWeight;

  if (totalWeight <= 0) return null;

  const roll = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of eligible) {
    acc += entry.weight;
    if (roll < acc) return entry.template;
  }

  return null;
}
