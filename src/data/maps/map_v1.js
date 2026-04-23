// map_v1.js — 4×4 market map generator.
// entry_exit is fixed at (0,0); all other node types are shuffled randomly each call.

import { MAP_CONFIG, STALL_MARKET_TYPES } from '../mapConfig';
import { MARKET_TYPES } from '../v2Config';
import { pickMarketIngredients, generateWall } from '../../utils/matrixHelpers';

// All 16 node types — fully shuffled each call
const ALL_TYPES = [
    'entry_exit',
    'stall_seafood',
    'stall_meat',
    'stall_vegetable',
    'stall_grain',
    'stall_dairy',
    'order_region_a',
    'order_region_b',
    'gold_variety',
    'gold_quality',
    'pocket_money',
    'passage',
    'passage',
    'passage',
    'passage',
    'passage',
];

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Generate a randomized set of map nodes. entry_exit is constrained to edge cells. */
export function generateMapNodes() {
    const { priceTable } = MAP_CONFIG.stall;
    const shuffledPrices = shuffle([...priceTable]);
    let stallPriceIdx = 0;

    function makeInitialState(type) {
        switch (type) {
            case 'stall_seafood':
            case 'stall_meat':
            case 'stall_vegetable':
            case 'stall_grain':
            case 'stall_dairy': {
                const price = shuffledPrices[stallPriceIdx++];
                const marketTypeId = STALL_MARKET_TYPES[type];
                const marketType = MARKET_TYPES.find(m => m.id === marketTypeId);
                const marketIngredients = pickMarketIngredients(marketType);
                const { grid, doomCellCount } = generateWall(marketIngredients);
                return { grid, crushCount: doomCellCount.resolution, drawsMadeToday: 0, price };
            }
            case 'order_region_a':
                return { orders: [], incomingQueue: [], regionId: 'a' };
            case 'order_region_b':
                return { orders: [], incomingQueue: [], regionId: 'b' };
            case 'gold_variety':
            case 'gold_quality':
                return {};
            case 'pocket_money':
                return { claimed: false };
            case 'entry_exit':
            case 'passage':
            default:
                return {};
        }
    }

    const isEdge = (x, y) => x === 0 || x === 3 || y === 0 || y === 3;

    // Pick a random edge position for entry_exit
    const edgePositions = [];
    for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
            if (isEdge(x, y)) edgePositions.push({ x, y });
    const entryPos = edgePositions[Math.floor(Math.random() * edgePositions.length)];

    // Shuffle the remaining 15 types into all other positions
    const otherTypes = shuffle(ALL_TYPES.filter(t => t !== 'entry_exit'));
    let idx = 0;

    const nodes = [];
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const isEntry = x === entryPos.x && y === entryPos.y;
            const type = isEntry ? 'entry_exit' : otherTypes[idx++];
            nodes.push({ id: `node_${x}_${y}`, position: { x, y }, type, state: makeInitialState(type) });
        }
    }
    return nodes;
}

// Generate all edges programmatically:
//   - Horizontal: (x, y) ↔ (x+1, y) for x in 0..2, y in 0..3
//   - Vertical:   (x, y) ↔ (x, y+1) for x in 0..3, y in 0..2
function generateEdges(rows, cols) {
    const edges = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (x + 1 < cols) {
                edges.push({
                    id: `edge_${x}_${y}_${x + 1}_${y}`,
                    from: { x, y },
                    to: { x: x + 1, y },
                    hasGrabber: false,
                });
            }
            if (y + 1 < rows) {
                edges.push({
                    id: `edge_${x}_${y}_${x}_${y + 1}`,
                    from: { x, y },
                    to: { x, y: y + 1 },
                    hasGrabber: false,
                });
            }
        }
    }
    return edges;
}

export const MAP_V1_EDGES = generateEdges(4, 4);

// Legacy static export kept for any direct imports that may exist
export const MAP_V1_NODES = generateMapNodes();
