/**
 * v2Config.js — 游戏数据层
 * 食材库 (80 × 4 品质 = 320) + Day 1 循环的全部常量。
 */

// --- 食材总表 ---
// Structure: 大类 → 小类 → 品类 (variety) → 品质 (quality tier 1-4).
//   rarity: 1(★绿 普通) 2(★★蓝 精选) 3(★★★紫 优质) 4(★★★★橙 顶级)
//   tags:   [大类, 小类, 品类]   — 3 layers so level rules can target
//                                   any of the three granularities.
//   id:     <variety_id>_<rarity>
// Total: 5 × 4 × 4 × 4 = 320 items, generated from VARIETIES + QUALITY_TIERS.

const QUALITY_TIERS = [
    { rarity: 1, zh: '普通', en: 'Regular' },
    { rarity: 2, zh: '精选', en: 'Choice' },
    { rarity: 3, zh: '优质', en: 'Premium' },
    { rarity: 4, zh: '顶级', en: 'Top-grade' },
];

export const VARIETIES = [
    // ── 肉类 ── (axis: 部位 cut)
    { major: '肉类', sub: '鸡', icon: '🍗', items: [
        { id: 'chicken_breast',     zh: '鸡胸肉', en: 'Chicken Breast' },
        { id: 'chicken_thigh',      zh: '鸡腿肉', en: 'Chicken Thigh' },
        { id: 'chicken_wing',       zh: '鸡翅',   en: 'Chicken Wing' },
        { id: 'chicken_tenderloin', zh: '鸡里脊', en: 'Chicken Tenderloin' },
    ] },
    { major: '肉类', sub: '牛', icon: '🥩', items: [
        { id: 'ground_beef',     zh: '牛肉碎', en: 'Ground Beef' },
        { id: 'beef_brisket',    zh: '牛腩',   en: 'Beef Brisket' },
        { id: 'beef_steak',      zh: '牛排',   en: 'Beef Steak' },
        { id: 'beef_tenderloin', zh: '牛里脊', en: 'Beef Tenderloin' },
    ] },
    { major: '肉类', sub: '猪', icon: '🥓', items: [
        { id: 'ground_pork',     zh: '猪肉碎', en: 'Ground Pork' },
        { id: 'pork_belly',      zh: '五花肉', en: 'Pork Belly' },
        { id: 'pork_ribs',       zh: '排骨',   en: 'Pork Ribs' },
        { id: 'pork_tenderloin', zh: '猪里脊', en: 'Pork Tenderloin' },
    ] },
    { major: '肉类', sub: '羊', icon: '🍖', items: [
        { id: 'ground_lamb',     zh: '羊肉碎', en: 'Ground Lamb' },
        { id: 'lamb_leg',        zh: '羊腿',   en: 'Lamb Leg' },
        { id: 'lamb_chop',       zh: '羊排',   en: 'Lamb Chop' },
        { id: 'lamb_tenderloin', zh: '羊里脊', en: 'Lamb Tenderloin' },
    ] },

    // ── 海鲜 ── (axis: 品种 species)
    { major: '海鲜', sub: '鱼', icon: '🐟', items: [
        { id: 'sardine',  zh: '沙丁鱼', en: 'Sardine' },
        { id: 'sea_bass', zh: '鲈鱼',   en: 'Sea Bass' },
        { id: 'salmon',   zh: '三文鱼', en: 'Salmon' },
        { id: 'tuna',     zh: '金枪鱼', en: 'Tuna' },
    ] },
    { major: '海鲜', sub: '虾', icon: '🦐', items: [
        { id: 'river_shrimp', zh: '河虾',   en: 'River Shrimp' },
        { id: 'white_shrimp', zh: '基围虾', en: 'White Shrimp' },
        { id: 'tiger_prawn',  zh: '明虾',   en: 'Tiger Prawn' },
        { id: 'spot_prawn',   zh: '牡丹虾', en: 'Spot Prawn' },
    ] },
    { major: '海鲜', sub: '贝', icon: '🐚', items: [
        { id: 'clam',    zh: '蛤蜊', en: 'Clam' },
        { id: 'mussel',  zh: '青口', en: 'Mussel' },
        { id: 'scallop', zh: '扇贝', en: 'Scallop' },
        { id: 'abalone', zh: '鲍鱼', en: 'Abalone' },
    ] },
    { major: '海鲜', sub: '蟹', icon: '🦀', items: [
        { id: 'blue_crab',      zh: '花蟹',   en: 'Blue Crab' },
        { id: 'swimming_crab',  zh: '梭子蟹', en: 'Swimming Crab' },
        { id: 'dungeness_crab', zh: '面包蟹', en: 'Dungeness Crab' },
        { id: 'king_crab',      zh: '帝王蟹', en: 'King Crab' },
    ] },

    // ── 蔬菜 ──
    { major: '蔬菜', sub: '青菜', icon: '🥬', items: [
        { id: 'cabbage',  zh: '白菜', en: 'Cabbage' },
        { id: 'spinach',  zh: '菠菜', en: 'Spinach' },
        { id: 'lettuce',  zh: '生菜', en: 'Lettuce' },
        { id: 'bok_choy', zh: '油菜', en: 'Bok Choy' },
    ] },
    { major: '蔬菜', sub: '根茎', icon: '🥔', items: [
        { id: 'potato',       zh: '土豆', en: 'Potato' },
        { id: 'sweet_potato', zh: '红薯', en: 'Sweet Potato' },
        { id: 'taro',         zh: '芋头', en: 'Taro' },
        { id: 'lotus_root',   zh: '莲藕', en: 'Lotus Root' },
    ] },
    { major: '蔬菜', sub: '水果', icon: '🍎', items: [
        { id: 'apple',      zh: '苹果', en: 'Apple' },
        { id: 'lemon',      zh: '柠檬', en: 'Lemon' },
        { id: 'mango',      zh: '芒果', en: 'Mango' },
        { id: 'strawberry', zh: '草莓', en: 'Strawberry' },
    ] },
    { major: '蔬菜', sub: '菌菇', icon: '🍄', items: [
        { id: 'oyster_mushroom', zh: '平菇',   en: 'Oyster Mushroom' },
        { id: 'shiitake',        zh: '香菇',   en: 'Shiitake' },
        { id: 'enoki',           zh: '金针菇', en: 'Enoki' },
        { id: 'king_oyster',     zh: '杏鲍菇', en: 'King Oyster Mushroom' },
    ] },

    // ── 主食 ──
    { major: '主食', sub: '米', icon: '🍚', items: [
        { id: 'white_rice',   zh: '粳米',     en: 'White Rice' },
        { id: 'brown_rice',   zh: '糙米',     en: 'Brown Rice' },
        { id: 'jasmine_rice', zh: '茉莉香米', en: 'Jasmine Rice' },
        { id: 'purple_rice',  zh: '紫米',     en: 'Purple Rice' },
    ] },
    { major: '主食', sub: '面', icon: '🍜', items: [
        { id: 'dried_noodles',     zh: '挂面',   en: 'Dried Noodles' },
        { id: 'egg_noodles',       zh: '鸡蛋面', en: 'Egg Noodles' },
        { id: 'buckwheat_noodles', zh: '荞麦面', en: 'Buckwheat Noodles' },
        { id: 'udon',              zh: '乌冬面', en: 'Udon' },
    ] },
    { major: '主食', sub: '豆', icon: '🫘', items: [
        { id: 'soybean',  zh: '黄豆',   en: 'Soybean' },
        { id: 'red_bean', zh: '红豆',   en: 'Red Bean' },
        { id: 'mung_bean', zh: '绿豆',  en: 'Mung Bean' },
        { id: 'chickpea', zh: '鹰嘴豆', en: 'Chickpea' },
    ] },
    { major: '主食', sub: '面包', icon: '🍞', items: [
        { id: 'white_bread',       zh: '白面包',   en: 'White Bread' },
        { id: 'whole_wheat_bread', zh: '全麦面包', en: 'Whole Wheat Bread' },
        { id: 'sourdough',         zh: '酸面包',   en: 'Sourdough' },
        { id: 'baguette',          zh: '法棍',     en: 'Baguette' },
    ] },

    // ── 蛋奶 ──
    { major: '蛋奶', sub: '蛋', icon: '🥚', items: [
        { id: 'chicken_egg', zh: '鸡蛋',   en: 'Chicken Egg' },
        { id: 'duck_egg',    zh: '鸭蛋',   en: 'Duck Egg' },
        { id: 'quail_egg',   zh: '鹌鹑蛋', en: 'Quail Egg' },
        { id: 'goose_egg',   zh: '鹅蛋',   en: 'Goose Egg' },
    ] },
    { major: '蛋奶', sub: '奶', icon: '🥛', items: [
        { id: 'cow_milk',     zh: '牛奶',   en: 'Cow Milk' },
        { id: 'goat_milk',    zh: '羊奶',   en: 'Goat Milk' },
        { id: 'buffalo_milk', zh: '水牛奶', en: 'Buffalo Milk' },
        { id: 'camel_milk',   zh: '驼奶',   en: 'Camel Milk' },
    ] },
    { major: '蛋奶', sub: '豆腐', icon: '🥣', items: [
        { id: 'silken_tofu', zh: '嫩豆腐', en: 'Silken Tofu' },
        { id: 'firm_tofu',   zh: '老豆腐', en: 'Firm Tofu' },
        { id: 'frozen_tofu', zh: '冻豆腐', en: 'Frozen Tofu' },
        { id: 'yuba',        zh: '腐竹',   en: 'Yuba' },
    ] },
    { major: '蛋奶', sub: '奶酪', icon: '🧀', items: [
        { id: 'mozzarella', zh: '马苏里拉', en: 'Mozzarella' },
        { id: 'cheddar',    zh: '切达',     en: 'Cheddar' },
        { id: 'brie',       zh: '布里',     en: 'Brie' },
        { id: 'parmesan',   zh: '帕玛森',   en: 'Parmesan' },
    ] },
];

export const INGREDIENTS = VARIETIES.flatMap(group =>
    group.items.flatMap(v =>
        QUALITY_TIERS.map(q => ({
            id: `${v.id}_${q.rarity}`,
            icon: group.icon,
            name: `${q.zh}${v.zh}`,
            nameEn: `${q.en} ${v.en}`,
            rarity: q.rarity,
            tags: [group.major, group.sub, v.zh],
        }))
    )
);


// ═══════════════════════════════════════════════════════════════════════
// --- Day 1 循环常量 ---
// "12 小时 × 5 店 × 2×2 框选抽取" 系统。规则见 design_docs/game_rules.md。
// ═══════════════════════════════════════════════════════════════════════

// 80 基础食材（品质维度剥离）——品质在抽取时 roll
export const BASE_INGREDIENTS = VARIETIES.flatMap(group =>
    group.items.map(v => ({
        baseId: v.id,
        name: v.zh,
        nameEn: v.en,
        icon: group.icon,
        category: group.major,
        subcategory: group.sub,
    }))
);

// 按大类分桶（给店内墙生成用）
export const INGREDIENTS_BY_CATEGORY = BASE_INGREDIENTS.reduce((acc, ing) => {
    (acc[ing.category] = acc[ing.category] || []).push(ing);
    return acc;
}, {});

// 5 家店——每家店对应一个大类
export const SHOPS = [
    { id: 'seafood_market', name: '海鲜市场', nameEn: 'Seafood Market',    icon: '🐟', category: '海鲜' },
    { id: 'butcher',        name: '肉铺',     nameEn: 'Butcher Shop',      icon: '🥩', category: '肉类' },
    { id: 'grocer',         name: '粮食店',   nameEn: 'Grocery Store',     icon: '🍞', category: '主食' },
    { id: 'greengrocer',    name: '蔬菜店',   nameEn: 'Vegetable Market',  icon: '🥬', category: '蔬菜' },
    { id: 'dairy',          name: '乳品店',   nameEn: 'Dairy Shop',        icon: '🧀', category: '蛋奶' },
];

// 每日时间预算
export const DAY_CONFIG = {
    hoursPerDay: 12,
    hoursPerShop: 1,
    shopCandidatesPerPick: 3,
};

// 两层菜篮容量
export const BASKET_CONFIG = {
    shopBasketSize: 10,   // 店内临时篮
    fridgeSize: 15,       // 全局冰箱
};

// 香蕉皮
export const BANANA_PEEL_CONFIG = {
    spawnChance: 0.075,
    icon: '🍌',
    name: '香蕉皮',
    nameEn: 'Banana Peel',
    id: 'banana_peel',
};

// 品质概率：index 0 = ★ 普通, 1 = ★★ 精选, 2 = ★★★ 优质, 3 = ★★★★ 顶级
// 硬化 & 提纯 同效（用户确认）
export const QUALITY_WEIGHTS = {
    default:  [0.45, 0.30, 0.175, 0.075],
    hardened: [0,    0.60, 0.30,  0.10],
    purified: [0,    0.60, 0.30,  0.10],
};

// 5 种词缀（等概率 20% 各）
export const AFFIXES = [
    { id: 'precise',    name: '精准',     nameEn: 'Precise',    icon: '🎯', desc: '在 2×2 中随机展示两个候选的品质，你选一个。' },
    { id: 'targeted',   name: '有的放矢', nameEn: 'Targeted',   icon: '👉', desc: '在 2×2 中自选一格抽取（不预览品质）。' },
    { id: 'fragmented', name: '稀碎',     nameEn: 'Fragmented', icon: '💥', desc: '在 2×2 中独立抽三次（可能撞同格），全部为普通品质。' },
    { id: 'hardened',   name: '硬化',     nameEn: 'Hardened',   icon: '🛡️', desc: '品质保底 ★★ 或更高。' },
    { id: 'purified',   name: '提纯',     nameEn: 'Purified',   icon: '💠', desc: '品质保底 ★★ 或更高。' },
];

// 菜品生成
export const DISH_CONFIG = {
    dishesPerDay: 3,
    slotsPerDish: 3,
    baseline: 8,                 // tentative；实装后可能调
    idealMultiplier: 2,
    subcategoryMultiplier: 1,
    defaultMultiplier: 0.5,
};

// 菜品结算阈值（沿用旧 Kitchen.jsx 的 baseline×[0.5/1.0/1.8/2.5] 五档）
export const DISH_SCORING = {
    thresholds: [
        { minRatio: 2.5, rating: '惊艳', ratingEn: 'Stunning',     delta: +2 },
        { minRatio: 1.8, rating: '优秀', ratingEn: 'Excellent',    delta: +1 },
        { minRatio: 1.0, rating: '合格', ratingEn: 'Satisfactory', delta:  0 },
        { minRatio: 0.5, rating: '勉强', ratingEn: 'Barely',       delta: -1 },
        { minRatio: 0,   rating: '翻车', ratingEn: 'Failed',       delta: -2 },
    ],
    unfinishedDelta: -2, // Day 结束时未完成的菜
};

// 满意度
export const SATISFACTION_CONFIG = {
    initial: 5,
    max: 10,
    loseThreshold: 0, // ≤ 此值游戏失败
};
