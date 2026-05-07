function scoreCandidateNeeds(candidate, state) {
  const needed = state.openNeedTags;
  const stallHits = candidate.wall.stalls.filter(stall => needed.has(stall.tag2)).length;
  const categoryHits = candidate.wall.stalls.filter(stall => state.openNeedCategories.has(stall.categoryTag)).length;
  return stallHits * 4 + categoryHits;
}

function bestMarket(candidates, state) {
  return candidates
    .map((candidate, index) => ({ index, score: scoreCandidateNeeds(candidate, state) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0].index;
}

function bestNeedRow(wall, state) {
  const scored = wall.stalls.map((stall, index) => {
    const exact = state.openNeedTags.has(stall.tag2) ? 10 : 0;
    const category = state.openNeedCategories.has(stall.categoryTag) ? 2 : 0;
    return { type: 'row', index, score: exact + category, reasonTag: exact ? 'need-stall' : 'category-stall' };
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index)[0];
}

function bestMethodColumn(wall, wantedIds) {
  const candidates = wall.methods
    .map((method, index) => ({ type: 'column', index, method, score: wantedIds.includes(method.id) ? 10 : 0 }))
    .filter(choice => choice.score > 0);
  return candidates.sort((a, b) => b.score - a.score || a.index - b.index)[0] || null;
}

function lineReason(line, wall) {
  if (line.type === 'row') {
    const stall = wall.stalls[line.index];
    return { text: `追 ${stall.name} 摊位，优先补当前需求`, tag: line.reasonTag || 'need-stall' };
  }
  const method = wall.methods[line.index];
  return { text: `走 ${method.name} 采购法：${method.desc}`, tag: `method-${method.id}` };
}

export const PLAYER_MODELS = {
  intuitive: {
    id: 'intuitive',
    name: '直觉玩家',
    chooseMarket: bestMarket,
    chooseLine(state) {
      const line = bestNeedRow(state.wall, state);
      return { ...line, reason: lineReason(line, state.wall) };
    },
  },

  cautious: {
    id: 'cautious',
    name: '保守玩家',
    chooseMarket: bestMarket,
    chooseLine(state) {
      if (state.hp <= 2 || state.danger >= 5) {
        const safe = bestMethodColumn(state.wall, ['detour']);
        if (safe) return { ...safe, reason: lineReason(safe, state.wall) };
      }
      const line = bestNeedRow(state.wall, state);
      return { ...line, reason: lineReason(line, state.wall) };
    },
  },

  quality: {
    id: 'quality',
    name: '品质玩家',
    chooseMarket: bestMarket,
    chooseLine(state) {
      const quality = bestMethodColumn(state.wall, ['fresh_rush', 'selective']);
      if (quality && state.hp > 1) return { ...quality, reason: lineReason(quality, state.wall) };
      const line = bestNeedRow(state.wall, state);
      return { ...line, reason: lineReason(line, state.wall) };
    },
  },

  strategic: {
    id: 'strategic',
    name: '策略玩家',
    chooseMarket: bestMarket,
    chooseLine(state) {
      const options = [];
      const row = bestNeedRow(state.wall, state);
      options.push({ ...row, score: row.score + (state.inventory.length > 8 ? -2 : 0) });

      for (const [index, method] of state.wall.methods.entries()) {
        let score = 0;
        let reasonTag = `method-${method.id}`;
        if (method.id === 'detour') score += state.hp <= 2 || state.danger >= 5 ? 12 : 1;
        if (method.id === 'fresh_rush') score += state.hp > 2 && state.cookPressure > 0 ? 8 : -2;
        if (method.id === 'selective') score += state.cookPressure > 0 ? 6 : 1;
        if (method.id === 'bargain') score += state.gold <= 1 ? 8 : 2;
        if (method.id === 'bulk') score += state.inventory.length <= 7 && state.openNeedTags.size <= 2 ? 5 : -3;
        if (method.id === 'ask_around') score += state.submittableOrders === 0 ? 5 : 0;
        options.push({ type: 'column', index, score, method, reasonTag });
      }

      const line = options.sort((a, b) => b.score - a.score || (a.type === 'column' ? -1 : 1))[0];
      return { ...line, reason: lineReason(line, state.wall) };
    },
  },
};
