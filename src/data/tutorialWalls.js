/**
 * tutorialWalls.js — 教程场景 2 / 4 的手作 4×4 墙面 layout。
 *
 * 设计：相交点位于 (1,1)，row 1 与 col 1 都开放抽取，其余 6 个轴 disabled。
 * row 1 与 col 1 内容序列相同；其余 9 格为 filler（避开同小类）。
 * 详见 design_docs/tutorial_flow.md "墙面 layout（场景 2 & 4）"。
 *
 * cell shape 与 matrixHelpers.generateWall 一致：
 *   { type: 'ingredient', item: { id }, uid }
 * uid 在注入到 useGameLogic 时由 generateWall 填充。
 */

const cell = (id) => ({ type: 'ingredient', item: { id } });

// —— 粮食店墙 ——
// (1,1) = 鸡蛋面（永远不抽到）；row 1 / col 1 其余 6 格 = 挂面；其余 9 格 = filler
export const GRAINSTORE_WALL = [
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
    [cell('dried_noodles'), cell('egg_noodles'),   cell('dried_noodles'), cell('dried_noodles')],
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
];

// 抽取序列：依次产出（无论玩家选 row 1 还是 col 1，命中结果一致）
export const GRAINSTORE_DRAWS = [
    { id: 'dried_noodles', quality: 1 },
    { id: 'dried_noodles', quality: 1 },
    { id: 'dried_noodles', quality: 2 },
];

// —— 海鲜店墙 ——
// (1,1) = 明虾（永远不抽到）；row 1 / col 1 其余 6 格 = 基围虾 / 扇贝 / 梭子蟹 各 2 格
export const SEAFOOD_WALL = [
    [cell('sea_bass'),     cell('white_shrimp'),  cell('mussel'),     cell('blue_crab')],
    [cell('white_shrimp'), cell('tiger_prawn'),   cell('scallop'),    cell('swimming_crab')],
    [cell('sea_bass'),     cell('scallop'),       cell('mussel'),     cell('blue_crab')],
    [cell('sea_bass'),     cell('swimming_crab'), cell('mussel'),     cell('blue_crab')],
];

export const SEAFOOD_DRAWS = [
    { id: 'white_shrimp',   quality: 3 },
    { id: 'scallop',        quality: 2 },
    { id: 'swimming_crab',  quality: 2 },
];

// 透视品质映射：'r,c' → quality
// 明虾 (1,1) 锁 Q5 制造"看得到摸不到"
export const SEAFOOD_PEEK_QUALITY = {
    '1,1': 5,           // 明虾 Q5 传说橙
    '1,0': 3, '0,1': 3, // 基围虾 Q3
    '1,2': 2, '2,1': 2, // 扇贝 Q2
    '1,3': 2, '3,1': 2, // 梭子蟹 Q2
};

// 受保护 cell（抽取时落点必须跳过）
export const GRAINSTORE_PROTECTED = ['1,1'];
export const SEAFOOD_PROTECTED   = ['1,1'];
