// useNodeBehaviors.js — Node behavior engine for the market map.
// Adding a new node type only requires a new entry in nodeBehaviors.
// No changes to core dispatch logic needed.

import { MAP_CONFIG, STALL_MARKET_TYPES } from '../data/mapConfig';
import { MARKET_TYPES } from '../data/v2Config';

// Build a lookup from market type id → MARKET_TYPES entry for O(1) access
const MARKET_TYPE_BY_ID = Object.fromEntries(MARKET_TYPES.map(t => [t.id, t]));

// ---------------------------------------------------------------------------
// Stall behaviors (factory: one behavior object per stall type)
// ---------------------------------------------------------------------------
function makeStallBehavior(stallType) {
    const marketTypeId = STALL_MARKET_TYPES[stallType];
    const marketType = MARKET_TYPE_BY_ID[marketTypeId] || {};

    return {
        getDisplayIcon(_node) {
            return marketType.icon || '🏪';
        },

        getPeekInfo(node, _gameState) {
            const crushCount = node.state?.crushCount ?? 0;
            const drawCost = Math.max(
                MAP_CONFIG.stall.drawCostMin,
                MAP_CONFIG.gold.drawBaseCost - crushCount
            );
            const gridCellsRemaining = node.state?.grid
                ? node.state.grid.flat().filter(Boolean).length
                : '?';

            return {
                label: marketType.name || stallType,
                icon: marketType.icon || '🏪',
                description: marketType.desc || '',
                details: [
                    `抢菜人: ${crushCount}个`,
                    `每抽 ${drawCost}g`,
                    `剩余 ${gridCellsRemaining}格`,
                ],
            };
        },

        onEnter(node, _gameState) {
            return {
                type: 'OPEN_STALL',
                stallType,
                marketTypeId,
            };
        },

        canEnter(_node, _gameState) {
            return true;
        },

        onTick(_node, _gameState) {
            return null;
        },
    };
}

// ---------------------------------------------------------------------------
// Order region behavior (shared for 'a' and 'b')
// ---------------------------------------------------------------------------
const orderRegionBehavior = {
    getDisplayIcon(_node) {
        return '📋';
    },

    getPeekInfo(node, _gameState) {
        const regionId = node.state?.regionId ?? '?';
        const orderCount = node.state?.orders?.length ?? 0;
        const label = regionId === 'a' ? 'A区订单' : regionId === 'b' ? 'B区订单' : `${regionId.toUpperCase()}区订单`;

        return {
            label,
            icon: '📋',
            description: '',
            details: [`当前订单: ${orderCount}个`],
        };
    },

    onEnter(node, _gameState) {
        return {
            type: 'OPEN_ORDER_REGION',
            regionId: node.state?.regionId,
        };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Gold variety behavior (大排档)
// ---------------------------------------------------------------------------
const goldVarietyBehavior = {
    getDisplayIcon(_node) {
        return '🍱';
    },

    getPeekInfo(_node, _gameState) {
        return {
            label: '大排档',
            icon: '🍱',
            description: '食材多样→更值钱',
            details: ['按批次子类数定价'],
        };
    },

    onEnter(_node, _gameState) {
        return { type: 'OPEN_GOLD_VARIETY' };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Gold quality behavior (酒楼)
// ---------------------------------------------------------------------------
const goldQualityBehavior = {
    getDisplayIcon(_node) {
        return '🏮';
    },

    getPeekInfo(_node, _gameState) {
        return {
            label: '酒楼',
            icon: '🏮',
            description: '精品→更值钱',
            details: ['按品质定价'],
        };
    },

    onEnter(_node, _gameState) {
        return { type: 'OPEN_GOLD_QUALITY' };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Pocket money behavior
// ---------------------------------------------------------------------------
const pocketMoneyBehavior = {
    getDisplayIcon(_node) {
        return '💰';
    },

    getPeekInfo(node, _gameState) {
        const claimed = node.state?.claimed ?? false;
        return {
            label: '零花钱',
            icon: '💰',
            description: claimed ? '已领取' : `+${MAP_CONFIG.gold.pocketMoneyBonus}g`,
            details: claimed ? ['今日已领取'] : [`领取 ${MAP_CONFIG.gold.pocketMoneyBonus}g`],
        };
    },

    onEnter(node, _gameState) {
        if (node.state?.claimed) {
            return { type: 'ALREADY_CLAIMED' };
        }
        return {
            type: 'CLAIM_POCKET_MONEY',
            amount: MAP_CONFIG.gold.pocketMoneyBonus,
        };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Entry/exit behavior
// ---------------------------------------------------------------------------
const entryExitBehavior = {
    getDisplayIcon(_node) {
        return '🚪';
    },

    getPeekInfo(_node, _gameState) {
        return {
            label: '市场入口',
            icon: '🚪',
            description: '走回来→收摊回家',
            details: [],
        };
    },

    onEnter(_node, _gameState) {
        return { type: 'CONFIRM_EVACUATION' };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Passage behavior
// ---------------------------------------------------------------------------
const passageBehavior = {
    getDisplayIcon(_node) {
        return '·';
    },

    getPeekInfo(_node, _gameState) {
        return {
            label: '过道',
            icon: '·',
            description: '',
            details: [],
        };
    },

    onEnter(_node, _gameState) {
        return { type: 'PASSAGE' };
    },

    canEnter(_node, _gameState) {
        return true;
    },

    onTick(_node, _gameState) {
        return null;
    },
};

// ---------------------------------------------------------------------------
// Plain constant (no hook calls — safe to import anywhere)
// ---------------------------------------------------------------------------
export const nodeBehaviors = {
    stall_seafood:   makeStallBehavior('stall_seafood'),
    stall_meat:      makeStallBehavior('stall_meat'),
    stall_vegetable: makeStallBehavior('stall_vegetable'),
    stall_grain:     makeStallBehavior('stall_grain'),
    stall_dairy:     makeStallBehavior('stall_dairy'),
    order_region_a:  orderRegionBehavior,
    order_region_b:  orderRegionBehavior,
    gold_variety:    goldVarietyBehavior,
    gold_quality:    goldQualityBehavior,
    pocket_money:    pocketMoneyBehavior,
    entry_exit:      entryExitBehavior,
    passage:         passageBehavior,
};
