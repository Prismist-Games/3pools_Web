// mapConfig.js — All map system configuration. Edit values here, not in logic code.

export const MAP_CONFIG = {
    gold: {
        startingAmount: 20,
        drawBaseCost: 3,          // base cost per stall draw
        pocketMoneyBonus: 2,      // +2g from pocket_money node
    },
    stall: {
        drawCostMin: 1,           // minimum draw cost regardless of grabbers
        // price = max(drawCostMin, drawBaseCost - crushCount)
    },
    goldVariety: {
        // pricing by distinct tag2 count in the batch
        priceByVariety: [0, 1, 2, 3, 5, 8],  // index = variety count (index 0 unused)
    },
    goldQuality: {
        // pricing by quality tier (q1=1g ... q5=8g)
        priceByQuality: [0, 1, 2, 3, 5, 8],  // index = quality level (index 0 unused)
    },
    clock: {
        actionsPerTick: 3,        // every N actions, clock advances 1 tick
    },
    map: {
        rows: 4,
        cols: 4,
        entryPosition: { x: 0, y: 0 },
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
