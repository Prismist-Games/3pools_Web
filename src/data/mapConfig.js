// mapConfig.js — All map system configuration. Edit values here, not in logic code.

export const MAP_CONFIG = {
    gold: {
        startingAmount: 10,
        drawBaseCost: 3,          // base cost per stall draw
        pocketMoneyBonus: 1,      // +1g from pocket_money node
    },
    stall: {
        drawCostMin: 1,
        priceTable: [1, 2, 3, 3, 4],  // weighted random: 1×1, 1×2, 2×3, 1×4
        grabberMin: 0,
        grabberMax: 4,
        drawsPerVisit: 3,
    },
    goldVariety: {
        // pricing per item by distinct tag2 count; index 0 unused
        priceByVariety: [0, 0, 2, 4, 6, 8],  // 1种→0g, 2→2g, 3→4g, 4→6g, 5+→8g
    },
    goldQuality: {
        // pricing per item by quality tier; index 0 unused
        priceByQuality: [0, 0, 1, 3, 5, 7],  // ★→0g, ★★→1g, ★★★→3g, ★★★★→5g, ★★★★★→7g
    },
    clock: {
        actionsPerTick: 10,       // every N actions, clock advances 1 tick
    },
    map: {
        rows: 4,
        cols: 4,
        entryPosition: { x: 0, y: 0 },
        grabberDriftChance: 0.25,
    },
};

// Stall node type → market type id binding
export const STALL_MARKET_TYPES = {
    stall_seafood:   'seafood_market',
    stall_meat:      'butcher',
    stall_vegetable: 'vegetable_shop',
    stall_grain:     'grain_store',
    stall_dairy:     'dairy_store',
};
