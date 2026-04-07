/**
 * Cell type tokens for template grids.
 * null = blank (procedural fill)
 * String tokens = fixed or constrained cells
 * Object tokens = cell with extra properties (e.g. multiplier)
 */
export const CELL_TYPES = {
  // Fixed types
  DOOM_RESOLVE: 'doom_resolve',
  DOOM_UPGRADE: 'doom_upgrade',
  BOMB: 'bomb',
  GOLD: 'gold',
  ORDER: 'order',
  OUT_OF_GAME: 'out_of_game',
  // Constrained types (resolved at generation time)
  ANY_DOOM: 'any_doom',
  ANY_SPECIAL: 'any_special',
  ANY_STICKER: 'any_sticker',
  STICKER_A: 'sticker_A',
  STICKER_B: 'sticker_B',
  STICKER_C: 'sticker_C',
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
    constraints: {
      stickerTypeCount: 2,
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
    constraints: {
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
    constraints: {},
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

  // Look up templates from both built-in and localStorage
  const allTemplates = [...LEVEL_TEMPLATES];
  try {
    const custom = JSON.parse(localStorage.getItem('levelTemplates') || '[]');
    allTemplates.push(...custom);
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
