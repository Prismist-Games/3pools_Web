/**
 * Cell type tokens for template grids.
 * null = blank (procedural fill)
 * String tokens = fixed or constrained cells
 * Object tokens = cell with extra properties (e.g. multiplier, group)
 *
 * Sticker grouping:
 *   { type: 'any_sticker', group: 1 } — belongs to polyomino group 1
 *   'any_sticker' or { type: 'any_sticker' } — independent 1×1 sticker
 *   Same group number → same polyomino → same randomly-bound sticker type
 *   Different group numbers → different polyominoes (may or may not be same type)
 */
export const CELL_TYPES = {
  // Structural
  EMPTY: 'empty',                // true blank — skipped during draw, not filled by procedural
  // Fixed types
  DOOM_RESOLVE: 'doom_resolve',
  DOOM_UPGRADE: 'doom_upgrade',
  BOMB: 'bomb',
  GOLD: 'gold',
  ORDER: 'order',
  OUT_OF_GAME: 'out_of_game',
  // Constrained types (resolved at generation time)
  ANY_DOOM: 'any_doom',           // randomly doom_resolve or doom_upgrade
  ANY_SPECIAL: 'any_special',     // randomly gold/order/out_of_game/bomb
  ANY_STICKER: 'any_sticker',     // random sticker type, 1×1 unless grouped
};

// --- Levels: auto-imported from src/data/levels/*.json ---

const levelModules = import.meta.glob('./levels/*.json', { eager: true });
export const LEVEL_TEMPLATES = Object.values(levelModules).map(m => m.default);

// --- Schedule config (controls how levels appear in gameplay) ---

// Default schedule for built-in levels (overridable via localStorage in Level Manager)
export const TEMPLATE_SCHEDULE = LEVEL_TEMPLATES.map(t => ({
  templateId: t.id,
  weight: 10,
  enabled: true,
  minExpedition: 1,
}));

// Weight for "no template" (pure procedural wall) — so levels don't dominate
export const PROCEDURAL_WEIGHT = 60;

/**
 * Pick a level template based on schedule weights, or null for procedural.
 * Respects localStorage overrides from the Level Manager.
 * @param {number} expeditionNumber — current expedition (1-based)
 */
export function pickTemplate(expeditionNumber) {
  // Load schedule overrides from localStorage (Level Manager saves here)
  let schedule = [...TEMPLATE_SCHEDULE];
  let proceduralWt = PROCEDURAL_WEIGHT;
  try {
    const overrides = JSON.parse(localStorage.getItem('templateSchedule') || '{}');
    if (overrides._proceduralWeight !== undefined) proceduralWt = overrides._proceduralWeight;
    schedule = schedule.map(s => ({ ...s, ...overrides[s.templateId] }));
  } catch { /* ignore parse errors */ }

  const eligible = schedule.filter(
    s => s.enabled && expeditionNumber >= (s.minExpedition || 1)
  );

  const entries = eligible.map(s => {
    const template = LEVEL_TEMPLATES.find(t => t.id === s.templateId);
    return template ? { template, weight: s.weight } : null;
  }).filter(Boolean);

  const totalTemplateWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const totalWeight = totalTemplateWeight + proceduralWt;

  if (totalWeight <= 0) return null;

  const roll = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of entries) {
    acc += entry.weight;
    if (roll < acc) return entry.template;
  }

  return null;
}
