// src/data/charms.js

export const CHARM_TYPES = {
  BLANK: 'blank',
  DRAW_COUNT: 'draw_count',
  STICKER: 'sticker',
  ORDER: 'order',
  CATALYST: 'catalyst',
  GUARD_STONE: 'guard_stone',
  COMPOUND: 'compound',
  DELAY_DOOM: 'delay_doom',
  BAIT: 'bait',
  ALCHEMY_POT: 'alchemy_pot',
  RESONANCE_BELL: 'resonance_bell',
  COPY_MIRROR: 'copy_mirror',
  COMPOUND_STICKER: 'compound_sticker',
  COMPOUND_ORDER: 'compound_order',
  ENHANCED_DELAY: 'enhanced_delay',
};

// Charms that can be upgraded by ALCHEMY_POT
export const UPGRADEABLE_CHARMS = [
  'draw_count',
  'sticker',
  'order',
  'delay_doom',
];

// Upgrade map: source type → upgraded type
export const CHARM_UPGRADE_MAP = {
  draw_count: 'compound',
  sticker: 'compound_sticker',
  order: 'compound_order',
  delay_doom: 'enhanced_delay',
};

// Charms that COPY_MIRROR cannot copy
export const NON_COPYABLE_CHARMS = [
  'resonance_bell',
  'copy_mirror',
  'blank',
];

// Config for each charm type
export const CHARM_CONFIGS = {
  blank: {
    icon: '⬜',
    name: '空白',
    isPersistent: true,
    isPassive: true,
    isBlank: true,
    canBeOverwritten: false,
  },
  draw_count: {
    icon: '🎯',
    name: '抽取次数',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  sticker: {
    icon: '⭐',
    name: '贴纸',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  order: {
    icon: '📋',
    name: '订单',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  catalyst: {
    icon: '🔮',
    name: '催化石',
    isPersistent: true,
    isPassive: true,
    isBlank: false,
    canBeOverwritten: true,
  },
  guard_stone: {
    icon: '🛡️',
    name: '守护碑',
    isPersistent: true,
    isPassive: true,
    isBlank: false,
    canBeOverwritten: true,
  },
  compound: {
    icon: '📈',
    name: '复利',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  delay_doom: {
    icon: '⏳',
    name: '延缓厄运',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  bait: {
    icon: '🎣',
    name: '诱饵',
    isPersistent: true,
    isPassive: true,
    isBlank: false,
    canBeOverwritten: true,
  },
  alchemy_pot: {
    icon: '⚗️',
    name: '炼金锅',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  resonance_bell: {
    icon: '🔔',
    name: '共鸣钟',
    isPersistent: false,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  copy_mirror: {
    icon: '🪞',
    name: '复制镜',
    isPersistent: false,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  compound_sticker: {
    icon: '⭐+',
    name: '复利贴纸',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  compound_order: {
    icon: '📋+',
    name: '复利订单',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
  enhanced_delay: {
    icon: '⏳⏳',
    name: '强化延缓',
    isPersistent: true,
    isPassive: false,
    isBlank: false,
    canBeOverwritten: true,
  },
};

// Generation weights for ✨ cell draw (only 11 generatable types)
export const CHARM_GENERATION_WEIGHTS = {
  draw_count: 15,
  sticker: 15,
  order: 13,
  catalyst: 12,
  guard_stone: 12,
  compound: 8,
  delay_doom: 8,
  bait: 7,
  alchemy_pot: 4,
  resonance_bell: 3,
  copy_mirror: 3,
};

function generateUID() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Weighted random pick from CHARM_GENERATION_WEIGHTS */
export function rollCharmType() {
  const entries = Object.entries(CHARM_GENERATION_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

/** Create a fresh charm instance of a given type */
export function generateCharm(type) {
  return {
    id: generateUID(),
    type,
    isPersistent: CHARM_CONFIGS[type].isPersistent,
    isPassive: CHARM_CONFIGS[type].isPassive,
    isBlank: CHARM_CONFIGS[type].isBlank ?? false,
    growthCount: 0,
    usesLeft: type === 'alchemy_pot' ? 3 : undefined,
  };
}

/** Returns a short description of the charm's Luck and Doom effects */
export function getCharmDescription(charm) {
  switch (charm.type) {
    case 'blank': return '起手空白 | Doom: 吸收 1 次';
    case 'draw_count': return 'Luck: +1 抽取次数 | Doom: 消耗';
    case 'sticker': return 'Luck: +1 随机贴纸 | Doom: 消耗';
    case 'order': return 'Luck: +1 订单 | Doom: 消耗';
    case 'catalyst': return '被动: 相邻幸运符 Luck 效果 +1 | Doom: 消耗';
    case 'guard_stone': return '被动: 相邻幸运符免疫 Doom 命中 | Doom: 消耗';
    case 'compound': return `Luck: +${charm.growthCount + 1} 抽取次数 (成长, 上限4) | Doom: 消耗`;
    case 'delay_doom': return 'Luck: 本回合末 Doom 次数 -1 | Doom: 消耗';
    case 'bait': return '被动: Doom 优先命中此格 | Doom: 消耗';
    case 'alchemy_pot': return `Luck: 升级相邻幸运符 (剩余 ${charm.usesLeft} 次) | Doom: 消耗`;
    case 'resonance_bell': return 'Luck: 触发所有相邻幸运符效果, 一次性 | Doom: 消耗';
    case 'copy_mirror': return 'Luck: 复制相邻幸运符到空位, 一次性 | Doom: 消耗';
    case 'compound_sticker': return `Luck: +${charm.growthCount + 1} 随机贴纸 (成长, 上限3) | Doom: 消耗`;
    case 'compound_order': return `Luck: +${charm.growthCount + 1} 订单 (成长, 上限3) | Doom: 消耗`;
    case 'enhanced_delay': return 'Luck: 本回合末 Doom 次数 -2 | Doom: 消耗';
    default: return charm.type;
  }
}
