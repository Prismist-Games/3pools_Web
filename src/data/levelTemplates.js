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

// --- Sample templates ---

export const LEVEL_TEMPLATES = [
  {
    id: 'bomb_ring',
    name: '炸弹圈',
    description: '外圈炸弹包围，中心高倍贴纸',
    grid: [
      ['bomb', 'bomb', 'bomb', 'bomb', 'bomb'],
      ['bomb', null,   null,   null,   'bomb'],
      ['bomb', null,   { type: 'any_sticker', multiplier: 5 }, null, 'bomb'],
      ['bomb', null,   null,   null,   'bomb'],
      ['bomb', 'bomb', 'bomb', 'bomb', 'bomb'],
    ],
    settings: {
      stickerTypeRange: [2, 2],
    },
  },
  {
    id: 'doom_corridor',
    name: '死亡走廊',
    description: '厄运格集中在中间列，两侧是安全贴纸区',
    grid: [
      [null, null, 'doom_resolve', null, null],
      [null, null, 'any_doom',     null, null],
      [null, null, 'doom_upgrade', null, null],
      [null, null, 'any_doom',     null, null],
      [null, null, 'doom_resolve', null, null],
    ],
    settings: {
      maxDoomInBlank: 0,
    },
  },
  {
    id: 'treasure_corners',
    name: '四角宝藏',
    description: '四角放高价值物品，中间是风险区',
    grid: [
      [{ type: 'out_of_game' }, null, null, null, { type: 'out_of_game' }],
      [null, 'any_doom', null, 'any_doom', null],
      [null, null, 'bomb', null, null],
      [null, 'any_doom', null, 'any_doom', null],
      [{ type: 'out_of_game' }, null, null, null, { type: 'out_of_game' }],
    ],
    settings: {},
  },
];

// --- Schedule config (controls how templates appear in gameplay) ---

export const TEMPLATE_SCHEDULE = [
  { templateId: 'bomb_ring',        weight: 10, enabled: true, minExpedition: 1 },
  { templateId: 'doom_corridor',    weight: 15, enabled: true, minExpedition: 1 },
  { templateId: 'treasure_corners', weight: 10, enabled: true, minExpedition: 2 },
];

// Weight for "no template" (pure procedural wall) — so templates don't dominate
export const PROCEDURAL_WEIGHT = 60;

/**
 * Pick a template based on schedule weights, or null for procedural.
 * Respects localStorage overrides from the Level Manager.
 * @param {number} expeditionNumber — current expedition (1-based)
 */
export function pickTemplate(expeditionNumber) {
  // Load schedule overrides from localStorage (editor saves here)
  let schedule = [...TEMPLATE_SCHEDULE];
  let proceduralWt = PROCEDURAL_WEIGHT;
  try {
    const overrides = JSON.parse(localStorage.getItem('templateSchedule') || '{}');
    if (overrides._proceduralWeight !== undefined) proceduralWt = overrides._proceduralWeight;
    schedule = schedule.map(s => ({ ...s, ...overrides[s.templateId] }));

    // Also include custom templates from localStorage
    const customTemplates = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    for (const ct of customTemplates) {
      if (!schedule.find(s => s.templateId === ct.id)) {
        const override = overrides[ct.id] || {};
        schedule.push({ templateId: ct.id, weight: 10, enabled: false, minExpedition: 1, ...override });
      }
    }
  } catch { /* ignore parse errors */ }

  const eligible = schedule.filter(
    s => s.enabled && expeditionNumber >= (s.minExpedition || 1)
  );

  // Look up templates from both built-in and localStorage (built-in wins on ID collision)
  const allTemplates = [...LEVEL_TEMPLATES];
  const builtinIds = new Set(LEVEL_TEMPLATES.map(t => t.id));
  try {
    const custom = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    allTemplates.push(...custom.filter(t => !builtinIds.has(t.id)));
  } catch { /* ignore */ }

  const entries = eligible.map(s => {
    const template = allTemplates.find(t => t.id === s.templateId);
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
