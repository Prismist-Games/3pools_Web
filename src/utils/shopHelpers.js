/**
 * shopHelpers.js — v3 Day 1 重构的纯函数层
 *
 * 覆盖：
 * - 店内 4×4 墙生成 + 2×2 区域重刷
 * - 词缀 / 品质掷骰
 * - baseId + rarity → 完整 INGREDIENTS 条目解析
 * - 每日 3 道菜（每菜 3 槽）程序化生成
 * - 每小时 3 店候选刷新
 *
 * 所有函数为纯函数，不依赖 React state。
 */

import {
    BASE_INGREDIENTS,
    INGREDIENTS_BY_CATEGORY,
    INGREDIENTS,
    SHOPS,
    DAY_CONFIG,
    BANANA_PEEL_CONFIG,
    QUALITY_WEIGHTS,
    AFFIXES,
    DISH_CONFIG,
} from '../data/v2Config';
import { MATRIX_CONFIG } from '../data/matrixConfig';

function uid() {
    return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── 墙生成 ────────────────────────────────────────────────────────────

function rollShopCell(pool) {
    if (Math.random() < BANANA_PEEL_CONFIG.spawnChance) {
        return {
            type: 'banana_peel',
            id: BANANA_PEEL_CONFIG.id,
            name: BANANA_PEEL_CONFIG.name,
            nameEn: BANANA_PEEL_CONFIG.nameEn,
            icon: BANANA_PEEL_CONFIG.icon,
            uid: uid(),
        };
    }
    const ing = pool[Math.floor(Math.random() * pool.length)];
    return {
        type: 'ingredient',
        baseId: ing.baseId,
        name: ing.name,
        nameEn: ing.nameEn,
        icon: ing.icon,
        category: ing.category,
        subcategory: ing.subcategory,
        uid: uid(),
    };
}

/**
 * 生成店内 4×4 墙。每格独立 roll：
 *   7.5% 香蕉皮 / 92.5% 该大类基础食材（均匀随机）
 */
export function generateShopWall(category) {
    const { gridSize } = MATRIX_CONFIG;
    const pool = INGREDIENTS_BY_CATEGORY[category] || [];
    const grid = [];
    for (let r = 0; r < gridSize; r++) {
        const row = [];
        for (let c = 0; c < gridSize; c++) {
            row.push(rollShopCell(pool));
        }
        grid.push(row);
    }
    return grid;
}

/**
 * 被抽取的 2×2 整片重 roll。返回新 matrix（不改原引用）。
 * @param {number} topRow  2×2 左上格的行
 * @param {number} leftCol 2×2 左上格的列
 */
export function refreshShopRegion(matrix, topRow, leftCol, category) {
    const pool = INGREDIENTS_BY_CATEGORY[category] || [];
    const next = matrix.map(row => row.slice());
    for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
            const r = topRow + dr;
            const c = leftCol + dc;
            if (r < next.length && c < next[r].length) {
                next[r][c] = rollShopCell(pool);
            }
        }
    }
    return next;
}

// ─── 词缀 & 品质 ───────────────────────────────────────────────────────

/**
 * 等概率选 1 个词缀（目前 5 种，各 20%）
 */
export function rollAffix() {
    return AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
}

/**
 * 根据词缀 roll 品质：
 *   fragmented → 固定 1（全 ★）
 *   hardened / purified → QUALITY_WEIGHTS[affixId]
 *   其它 → QUALITY_WEIGHTS.default
 */
export function rollQuality(affixId) {
    if (affixId === 'fragmented') return 1;
    const weights = QUALITY_WEIGHTS[affixId] || QUALITY_WEIGHTS.default;
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (r < acc) return i + 1;
    }
    return weights.length;
}

/**
 * 根据 baseId + rarity 从 INGREDIENTS 中取完整条目。
 * 产物带 uid，便于放入背包/冰箱。
 */
export function resolveIngredient(baseId, rarity) {
    const id = `${baseId}_${rarity}`;
    const match = INGREDIENTS.find(i => i.id === id);
    return match ? { ...match, uid: uid() } : null;
}

// ─── 菜品生成 ─────────────────────────────────────────────────────────

/**
 * 生成每日 3 道菜，每菜 3 槽。
 * 全天共 9 个槽位，理想食材从 80 种基础食材里抽 9 个不重复。
 *
 * 产出的 slot 结构可直接喂给现有 Kitchen.jsx 的 getSlotMatch / scoreDish：
 *   rules: [
 *     { match: { tag: '鲈鱼' }, multiplier: 2 },   // 理想品类
 *     { match: { tag: '鱼' },   multiplier: 1 },   // 同小类
 *   ]
 *   defaultMultiplier: 0.5                          // 其它
 */
export function generateDailyDishes() {
    const {
        dishesPerDay, slotsPerDish, baseline,
        idealMultiplier, subcategoryMultiplier, defaultMultiplier,
    } = DISH_CONFIG;

    const picks = shuffle(BASE_INGREDIENTS).slice(0, dishesPerDay * slotsPerDish);
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    const dishes = [];
    for (let d = 0; d < dishesPerDay; d++) {
        const slots = [];
        for (let s = 0; s < slotsPerDish; s++) {
            const ideal = picks[d * slotsPerDish + s];
            slots.push({
                name: `槽 ${s + 1}`,
                required: true,
                ideal,
                rules: [
                    { match: { tag: ideal.name }, multiplier: idealMultiplier },
                    { match: { tag: ideal.subcategory }, multiplier: subcategoryMultiplier },
                ],
                defaultMultiplier,
            });
        }
        dishes.push({
            id: `dish_${labels[d].toLowerCase()}`,
            label: `菜 ${labels[d]}`,
            labelEn: `Dish ${labels[d]}`,
            icon: '🍽️',
            baseline,
            slots,
        });
    }
    return dishes;
}

// ─── 店选择 ───────────────────────────────────────────────────────────

/**
 * 从 5 家店中随机刷 N 家作为玩家候选（不重复）。
 */
export function pickShopCandidates(count = DAY_CONFIG.shopCandidatesPerPick) {
    const n = Math.min(count, SHOPS.length);
    return shuffle(SHOPS).slice(0, n);
}
