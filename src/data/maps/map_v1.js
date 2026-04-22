// map_v1.js — First hand-crafted 4×4 market map.
// Origin: top-left. x = column, y = row.
//
// Layout:
//   y=0: entry_exit    stall_seafood  passage        stall_meat
//   y=1: passage       order_region_a order_region_b passage
//   y=2: stall_dairy   gold_variety   gold_quality   stall_grain
//   y=3: passage       pocket_money   passage        stall_vegetable

// Per-type initial state factories (keeps the node array readable)
function makeStallState() {
    return { grid: null, crushCount: 0, drawsMadeToday: 0 };
}

// Raw layout: [y][x] = type string
const LAYOUT = [
    ['entry_exit',    'stall_seafood',  'passage',       'stall_meat'],
    ['passage',       'order_region_a', 'order_region_b', 'passage'],
    ['stall_dairy',   'gold_variety',   'gold_quality',  'stall_grain'],
    ['passage',       'pocket_money',   'passage',       'stall_vegetable'],
];

// Initial state per type
function makeInitialState(type) {
    switch (type) {
        case 'stall_seafood':
        case 'stall_meat':
        case 'stall_vegetable':
        case 'stall_grain':
        case 'stall_dairy':
            return makeStallState();
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

// Generate nodes from the layout
export const MAP_V1_NODES = LAYOUT.flatMap((row, y) =>
    row.map((type, x) => ({
        id: `node_${x}_${y}`,
        position: { x, y },
        type,
        state: makeInitialState(type),
    }))
);

// Generate all edges programmatically:
//   - Horizontal: (x, y) ↔ (x+1, y) for x in 0..2, y in 0..3
//   - Vertical:   (x, y) ↔ (x, y+1) for x in 0..3, y in 0..2
// Total: 3×4 + 4×3 = 12 + 12 = 24 edges
function generateEdges(rows, cols) {
    const edges = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Horizontal edge: (x, y) → (x+1, y)
            if (x + 1 < cols) {
                edges.push({
                    id: `edge_${x}_${y}_${x + 1}_${y}`,
                    from: { x, y },
                    to: { x: x + 1, y },
                    hasGrabber: false,
                });
            }
            // Vertical edge: (x, y) → (x, y+1)
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
