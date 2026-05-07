import { INGREDIENTS, MARKET_TYPES, QUALITY_CONFIG } from '../../src/data/v2Config.js';

const PURCHASE_METHODS = [
  { id: 'selective', name: '精挑', icon: '🔎', desc: '抽中食材时，品质至少为精选' },
  { id: 'fresh_rush', name: '抢鲜', icon: '⚡', desc: '抽中食材时品质+1，但人群压力+1' },
  { id: 'bargain', name: '捡漏', icon: '🪙', desc: '抽中普通或精选食材时，返还1抽' },
  { id: 'bulk', name: '囤货', icon: '📦', desc: '抽中食材时，额外获得1个同名普通副本' },
  { id: 'detour', name: '绕路', icon: '🛡️', desc: '抽中抢菜人时取消人挤人结算' },
  { id: 'ask_around', name: '打听', icon: '📣', desc: '抽中订单格时，多获得1次手动刷新' },
];

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(rng, list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function qualityValue(quality) {
  return QUALITY_CONFIG.find(q => q.id === quality)?.scoreValue || 1;
}

function rollQuality(rng) {
  const roll = rng();
  if (roll < 0.40) return 1;
  if (roll < 0.70) return 2;
  if (roll < 0.88) return 3;
  if (roll < 0.97) return 4;
  return 5;
}

function buildTagEntries() {
  const map = new Map();
  for (const ing of INGREDIENTS) {
    const [categoryTag, tag2] = ing.tags;
    if (!map.has(tag2)) map.set(tag2, { tag2, categoryTag, icon: ing.icon });
  }
  return [...map.values()];
}

function generateOrder(rng, tagEntries) {
  const requirements = shuffle(rng, tagEntries).slice(0, rng() < 0.55 ? 2 : 3).map(entry => ({
    requirementKind: 'tag2',
    tag2: entry.tag2,
    categoryTag: entry.categoryTag,
    icon: entry.icon,
    name: entry.tag2,
    count: 1,
  }));
  const reqTags = new Set(requirements.map(req => req.tag2));
  const rewardPool = tagEntries.filter(entry => !reqTags.has(entry.tag2));
  const reward = pick(rng, rewardPool.length ? rewardPool : tagEntries);
  return { id: `o_${Math.floor(rng() * 1e9)}`, requirements, rewardTag2: reward.tag2 };
}

function buildWall(rng, market) {
  const marketIngredients = INGREDIENTS.filter(ing => ing.tags[0] === market.category);
  const tagGroups = new Map();
  for (const ing of marketIngredients) {
    const tag2 = ing.tags[1];
    if (!tagGroups.has(tag2)) tagGroups.set(tag2, []);
    tagGroups.get(tag2).push(ing);
  }
  const tagEntries = shuffle(rng, [...tagGroups.entries()]);
  const stalls = Array.from({ length: 4 }, (_, row) => {
    const [tag2, list] = tagEntries[row % tagEntries.length];
    return { name: tag2, tag2, categoryTag: market.category, icon: list[0].icon };
  });
  const methods = shuffle(rng, PURCHASE_METHODS).slice(0, 4);
  const grid = Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, () => {
    const roll = rng();
    if (roll < 0.14) return { type: 'doom' };
    if (roll < 0.20) return { type: 'order' };
    if (roll < 0.25) return { type: 'gold', amount: 1 };
    const stallIngredients = tagGroups.get(stalls[row].tag2);
    const pool = rng() < 0.78 ? stallIngredients : marketIngredients;
    return { type: 'ingredient', item: pick(rng, pool) };
  }));
  return { market, stalls, methods, grid };
}

function itemMatchesRequirement(item, req) {
  return item?.tags?.[1] === req.tag2;
}

function submittableOrders(state) {
  return state.orders.filter(order => canSubmit(state.inventory, order));
}

function canSubmit(inventory, order) {
  const used = new Set();
  for (const req of order.requirements) {
    let found = false;
    for (let i = 0; i < inventory.length; i++) {
      if (used.has(i)) continue;
      if (itemMatchesRequirement(inventory[i], req)) {
        used.add(i);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function submitOrders(rng, state, transcript) {
  let submitted = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const order of [...state.orders]) {
      if (!canSubmit(state.inventory, order)) continue;
      const used = new Set();
      for (const req of order.requirements) {
        const idx = state.inventory.findIndex((item, i) => !used.has(i) && itemMatchesRequirement(item, req));
        if (idx >= 0) used.add(idx);
      }
      const spent = [...used].map(i => state.inventory[i]);
      state.inventory = state.inventory.filter((_, i) => !used.has(i));
      const rewardBase = INGREDIENTS.find(ing => ing.tags[1] === order.rewardTag2) || pick(rng, INGREDIENTS);
      const rewardQuality = Math.max(1, Math.min(5, spent.reduce((sum, item) => sum + qualityValue(item.quality), 0)));
      state.inventory.push({ ...rewardBase, quality: rewardQuality });
      state.orders = state.orders.filter(o => o.id !== order.id);
      state.orders.push(generateOrder(rng, state.tagEntries));
      submitted++;
      changed = true;
      transcript.push({
        turn: state.turn,
        event: 'submit',
        order: order.requirements.map(req => req.tag2).join('+'),
        reward: order.rewardTag2,
        reason: '满足订单后立即提交，腾出菜篮并换取新食材',
      });
      break;
    }
  }
  return submitted;
}

function deriveDecisionState(state, wall) {
  const openNeedTags = new Set(state.orders.flatMap(order => order.requirements.map(req => req.tag2)));
  const openNeedCategories = new Set(state.orders.flatMap(order => order.requirements.map(req => req.categoryTag)));
  return {
    ...state,
    wall,
    openNeedTags,
    openNeedCategories,
    submittableOrders: submittableOrders(state).length,
    cookPressure: state.inventory.filter(item => openNeedTags.has(item.tags?.[1])).length < 2 ? 1 : 0,
  };
}

function drawLine(rng, state, choice, transcript) {
  const cells = choice.type === 'row'
    ? state.wall.grid[choice.index].map((cell, col) => ({ cell, row: choice.index, col }))
    : state.wall.grid.map((row, rowIndex) => ({ cell: row[choice.index], row: rowIndex, col: choice.index }));
  const target = pick(rng, cells.filter(entry => entry.cell));
  const method = choice.type === 'column' ? state.wall.methods[choice.index] : null;
  const result = { type: target.cell.type };

  if (target.cell.type === 'ingredient') {
    let quality = rollQuality(rng);
    if (method?.id === 'selective') quality = Math.max(2, quality);
    if (method?.id === 'fresh_rush') {
      quality = Math.min(5, quality + 1);
      state.danger += 1;
    }
    const item = { ...target.cell.item, quality };
    state.inventory.push(item);
    result.item = `${item.tags[1]}:${quality}`;
    if (method?.id === 'bargain' && quality <= 2) state.gold += 1;
    if (method?.id === 'bulk' && state.inventory.length < 12) state.inventory.push({ ...target.cell.item, quality: 1 });
  } else if (target.cell.type === 'doom') {
    if (method?.id !== 'detour') state.hp -= state.danger >= 5 ? 2 : 1;
  } else if (target.cell.type === 'order') {
    state.orders.push(generateOrder(rng, state.tagEntries));
    if (method?.id === 'ask_around') state.refresh += 1;
  } else if (target.cell.type === 'gold') {
    state.gold += target.cell.amount;
  }

  transcript.push({
    turn: state.turn,
    event: 'draw',
    market: state.wall.market.name,
    action: { type: choice.type, index: choice.index, label: choice.type === 'row' ? state.wall.stalls[choice.index].name : state.wall.methods[choice.index].name },
    reason: choice.reason.text,
    reasonTag: choice.reason.tag,
    result,
    hp: state.hp,
    gold: state.gold,
    inventory: state.inventory.length,
  });
  target.cell = null;
}

export function runSinglePlaytest({ seed, turnsPerRun = 8, player }) {
  const rng = createRng(seed);
  const tagEntries = buildTagEntries();
  const state = {
    seed,
    player: player.id,
    turn: 0,
    hp: 5,
    danger: 1,
    gold: 3,
    refresh: 0,
    inventory: [],
    orders: Array.from({ length: 4 }, () => generateOrder(rng, tagEntries)),
    tagEntries,
    wall: null,
  };
  const transcript = [];

  for (let turn = 1; turn <= turnsPerRun && state.hp > 0; turn++) {
    state.turn = turn;
    state.gold = Math.max(state.gold, 3);
    state.danger = Math.min(10, state.danger + (turn > 1 ? 1 : 0));
    const markets = shuffle(rng, MARKET_TYPES).slice(0, 3).map(market => ({ market, wall: buildWall(rng, market) }));
    const marketIndex = player.chooseMarket(markets, deriveDecisionState(state, markets[0].wall));
    state.wall = markets[marketIndex].wall;

    while (state.gold > 0 && state.hp > 0) {
      const decisionState = deriveDecisionState(state, state.wall);
      const choice = player.chooseLine(decisionState);
      state.gold -= 1;
      drawLine(rng, state, choice, transcript);
      submitOrders(rng, state, transcript);
      if (state.inventory.length >= 12) break;
    }
  }

  return {
    seed,
    player: player.id,
    transcript,
    final: {
      hp: state.hp,
      inventory: state.inventory.length,
      orders: state.orders.length,
      danger: state.danger,
    },
  };
}

function summarizeRun(run) {
  const draws = run.transcript.filter(step => step.event === 'draw');
  const reasonTags = new Set(draws.map(step => step.reasonTag).filter(Boolean));
  return {
    rowChoices: draws.filter(step => step.action.type === 'row').length,
    columnChoices: draws.filter(step => step.action.type === 'column').length,
    uniqueReasonTags: reasonTags.size,
    submissions: run.transcript.filter(step => step.event === 'submit').length,
  };
}

export function runBatchPlaytest({ seeds, turnsPerRun = 8, players }) {
  const runs = [];
  for (const player of players) {
    for (const seed of seeds) {
      runs.push(runSinglePlaytest({ seed, turnsPerRun, player }));
    }
  }

  const summary = { players: {} };
  for (const player of players) {
    const ownRuns = runs.filter(run => run.player === player.id);
    const totals = ownRuns.map(summarizeRun).reduce((acc, item) => {
      for (const [key, value] of Object.entries(item)) acc[key] = (acc[key] || 0) + value;
      return acc;
    }, {});
    summary.players[player.id] = totals;
  }

  return { runs, summary };
}
