/**
 * v2Config.js — v2 data foundations
 * Ingredients, quality system, market types, orders, dishes, expeditions
 */

// --- 食材总表 (80 types, no rarity — quality assigned at draw time) ---
// tags: [大类, 小类]
// shortLabel / shortLabelEn: 角标文字，用于在同一小类（共用 emoji）内快速区分个体
export const INGREDIENTS = [
    // ── 肉类 · 鸡 ──
    { id: 'chicken_breast',    icon: '🍗', name: '鸡胸肉',   nameEn: 'Chicken Breast',      shortLabel: '胸', shortLabelEn: 'Br', tags: ['肉类', '鸡'] },
    { id: 'chicken_thigh',     icon: '🍗', name: '鸡腿肉',   nameEn: 'Chicken Thigh',       shortLabel: '腿', shortLabelEn: 'Th', tags: ['肉类', '鸡'] },
    { id: 'chicken_wing',      icon: '🍗', name: '鸡翅',     nameEn: 'Chicken Wing',        shortLabel: '翅', shortLabelEn: 'Wg', tags: ['肉类', '鸡'] },
    { id: 'chicken_tenderloin',icon: '🍗', name: '鸡里脊',   nameEn: 'Chicken Tenderloin',  shortLabel: '脊', shortLabelEn: 'Tl', tags: ['肉类', '鸡'] },
    // ── 肉类 · 牛 ──
    { id: 'ground_beef',       icon: '🥩', name: '牛肉碎',   nameEn: 'Ground Beef',         shortLabel: '碎', shortLabelEn: 'Gd', tags: ['肉类', '牛'] },
    { id: 'beef_brisket',      icon: '🥩', name: '牛腩',     nameEn: 'Beef Brisket',        shortLabel: '腩', shortLabelEn: 'Bk', tags: ['肉类', '牛'] },
    { id: 'beef_steak',        icon: '🥩', name: '牛排',     nameEn: 'Beef Steak',          shortLabel: '排', shortLabelEn: 'Sk', tags: ['肉类', '牛'] },
    { id: 'beef_tenderloin',   icon: '🥩', name: '牛里脊',   nameEn: 'Beef Tenderloin',     shortLabel: '脊', shortLabelEn: 'Tl', tags: ['肉类', '牛'] },
    // ── 肉类 · 猪 ──
    { id: 'ground_pork',       icon: '🥓', name: '猪肉碎',   nameEn: 'Ground Pork',         shortLabel: '碎', shortLabelEn: 'Gd', tags: ['肉类', '猪'] },
    { id: 'pork_belly',        icon: '🥓', name: '五花肉',   nameEn: 'Pork Belly',          shortLabel: '花', shortLabelEn: 'Bl', tags: ['肉类', '猪'] },
    { id: 'pork_ribs',         icon: '🥓', name: '排骨',     nameEn: 'Pork Ribs',           shortLabel: '骨', shortLabelEn: 'Rb', tags: ['肉类', '猪'] },
    { id: 'pork_tenderloin',   icon: '🥓', name: '猪里脊',   nameEn: 'Pork Tenderloin',     shortLabel: '脊', shortLabelEn: 'Tl', tags: ['肉类', '猪'] },
    // ── 肉类 · 羊 ──
    { id: 'ground_lamb',       icon: '🍖', name: '羊肉碎',   nameEn: 'Ground Lamb',         shortLabel: '碎', shortLabelEn: 'Gd', tags: ['肉类', '羊'] },
    { id: 'lamb_leg',          icon: '🍖', name: '羊腿',     nameEn: 'Lamb Leg',            shortLabel: '腿', shortLabelEn: 'Lg', tags: ['肉类', '羊'] },
    { id: 'lamb_chop',         icon: '🍖', name: '羊排',     nameEn: 'Lamb Chop',           shortLabel: '排', shortLabelEn: 'Ch', tags: ['肉类', '羊'] },
    { id: 'lamb_tenderloin',   icon: '🍖', name: '羊里脊',   nameEn: 'Lamb Tenderloin',     shortLabel: '脊', shortLabelEn: 'Tl', tags: ['肉类', '羊'] },

    // ── 海鲜 · 鱼 ──
    { id: 'sardine',           icon: '🐟', name: '沙丁鱼',   nameEn: 'Sardine',             shortLabel: '沙', shortLabelEn: 'Sd', tags: ['海鲜', '鱼'] },
    { id: 'sea_bass',          icon: '🐟', name: '鲈鱼',     nameEn: 'Sea Bass',            shortLabel: '鲈', shortLabelEn: 'Bs', tags: ['海鲜', '鱼'] },
    { id: 'salmon',            icon: '🐟', name: '三文鱼',   nameEn: 'Salmon',              shortLabel: '文', shortLabelEn: 'Sm', tags: ['海鲜', '鱼'] },
    { id: 'tuna',              icon: '🐟', name: '金枪鱼',   nameEn: 'Tuna',                shortLabel: '金', shortLabelEn: 'Tn', tags: ['海鲜', '鱼'] },
    // ── 海鲜 · 虾 ──
    { id: 'river_shrimp',      icon: '🦐', name: '河虾',     nameEn: 'River Shrimp',        shortLabel: '河', shortLabelEn: 'Rv', tags: ['海鲜', '虾'] },
    { id: 'white_shrimp',      icon: '🦐', name: '基围虾',   nameEn: 'White Shrimp',        shortLabel: '基', shortLabelEn: 'Wh', tags: ['海鲜', '虾'] },
    { id: 'tiger_prawn',       icon: '🦐', name: '明虾',     nameEn: 'Tiger Prawn',         shortLabel: '明', shortLabelEn: 'Tg', tags: ['海鲜', '虾'] },
    { id: 'spot_prawn',        icon: '🦐', name: '牡丹虾',   nameEn: 'Spot Prawn',          shortLabel: '丹', shortLabelEn: 'Sp', tags: ['海鲜', '虾'] },
    // ── 海鲜 · 贝 ──
    { id: 'clam',              icon: '🐚', name: '蛤蜊',     nameEn: 'Clam',                shortLabel: '蜊', shortLabelEn: 'Cl', tags: ['海鲜', '贝'] },
    { id: 'mussel',            icon: '🐚', name: '青口',     nameEn: 'Mussel',              shortLabel: '青', shortLabelEn: 'Ms', tags: ['海鲜', '贝'] },
    { id: 'scallop',           icon: '🐚', name: '扇贝',     nameEn: 'Scallop',             shortLabel: '扇', shortLabelEn: 'Sc', tags: ['海鲜', '贝'] },
    { id: 'abalone',           icon: '🐚', name: '鲍鱼',     nameEn: 'Abalone',             shortLabel: '鲍', shortLabelEn: 'Ab', tags: ['海鲜', '贝'] },
    // ── 海鲜 · 蟹 ──
    { id: 'blue_crab',         icon: '🦀', name: '花蟹',     nameEn: 'Blue Crab',           shortLabel: '花', shortLabelEn: 'Bl', tags: ['海鲜', '蟹'] },
    { id: 'swimming_crab',     icon: '🦀', name: '梭子蟹',   nameEn: 'Swimming Crab',       shortLabel: '梭', shortLabelEn: 'Sw', tags: ['海鲜', '蟹'] },
    { id: 'dungeness_crab',    icon: '🦀', name: '面包蟹',   nameEn: 'Dungeness Crab',      shortLabel: '包', shortLabelEn: 'Du', tags: ['海鲜', '蟹'] },
    { id: 'king_crab',         icon: '🦀', name: '帝王蟹',   nameEn: 'King Crab',           shortLabel: '帝', shortLabelEn: 'Ki', tags: ['海鲜', '蟹'] },

    // ── 蔬菜 · 青菜 ──
    { id: 'cabbage',           icon: '🥬', name: '白菜',     nameEn: 'Cabbage',             shortLabel: '白', shortLabelEn: 'Cb', tags: ['蔬菜', '青菜'] },
    { id: 'spinach',           icon: '🥬', name: '菠菜',     nameEn: 'Spinach',             shortLabel: '菠', shortLabelEn: 'Sp', tags: ['蔬菜', '青菜'] },
    { id: 'lettuce',           icon: '🥬', name: '生菜',     nameEn: 'Lettuce',             shortLabel: '生', shortLabelEn: 'Le', tags: ['蔬菜', '青菜'] },
    { id: 'rapeseed',          icon: '🥬', name: '油菜',     nameEn: 'Rapeseed',            shortLabel: '油', shortLabelEn: 'Ra', tags: ['蔬菜', '青菜'] },
    // ── 蔬菜 · 根茎 ──
    { id: 'potato',            icon: '🥔', name: '土豆',     nameEn: 'Potato',              shortLabel: '土', shortLabelEn: 'Pt', tags: ['蔬菜', '根茎'] },
    { id: 'sweet_potato',      icon: '🥔', name: '红薯',     nameEn: 'Sweet Potato',        shortLabel: '薯', shortLabelEn: 'Sw', tags: ['蔬菜', '根茎'] },
    { id: 'taro',              icon: '🥔', name: '芋头',     nameEn: 'Taro',                shortLabel: '芋', shortLabelEn: 'Ta', tags: ['蔬菜', '根茎'] },
    { id: 'lotus_root',        icon: '🥔', name: '莲藕',     nameEn: 'Lotus Root',          shortLabel: '藕', shortLabelEn: 'Lo', tags: ['蔬菜', '根茎'] },
    // ── 蔬菜 · 水果 ──
    { id: 'apple',             icon: '🍎', name: '苹果',     nameEn: 'Apple',               shortLabel: '苹', shortLabelEn: 'Ap', tags: ['蔬菜', '水果'] },
    { id: 'lemon',             icon: '🍋', name: '柠檬',     nameEn: 'Lemon',               shortLabel: '柠', shortLabelEn: 'Lm', tags: ['蔬菜', '水果'] },
    { id: 'mango',             icon: '🥭', name: '芒果',     nameEn: 'Mango',               shortLabel: '芒', shortLabelEn: 'Mn', tags: ['蔬菜', '水果'] },
    { id: 'strawberry',        icon: '🍓', name: '草莓',     nameEn: 'Strawberry',          shortLabel: '莓', shortLabelEn: 'St', tags: ['蔬菜', '水果'] },
    // ── 蔬菜 · 菌菇 ──
    { id: 'oyster_mushroom',   icon: '🍄', name: '平菇',     nameEn: 'Oyster Mushroom',     shortLabel: '平', shortLabelEn: 'Oy', tags: ['蔬菜', '菌菇'] },
    { id: 'shiitake',          icon: '🍄', name: '香菇',     nameEn: 'Shiitake',            shortLabel: '香', shortLabelEn: 'Sh', tags: ['蔬菜', '菌菇'] },
    { id: 'enoki',             icon: '🍄', name: '金针菇',   nameEn: 'Enoki',               shortLabel: '针', shortLabelEn: 'En', tags: ['蔬菜', '菌菇'] },
    { id: 'king_oyster',       icon: '🍄', name: '杏鲍菇',   nameEn: 'King Oyster Mushroom',shortLabel: '杏', shortLabelEn: 'KO', tags: ['蔬菜', '菌菇'] },

    // ── 主食 · 米 ──
    { id: 'white_rice',        icon: '🍚', name: '粳米',     nameEn: 'White Rice',          shortLabel: '粳', shortLabelEn: 'Wh', tags: ['主食', '米'] },
    { id: 'brown_rice',        icon: '🍚', name: '糙米',     nameEn: 'Brown Rice',          shortLabel: '糙', shortLabelEn: 'Br', tags: ['主食', '米'] },
    { id: 'jasmine_rice',      icon: '🍚', name: '茉莉香米', nameEn: 'Jasmine Rice',        shortLabel: '莉', shortLabelEn: 'Ja', tags: ['主食', '米'] },
    { id: 'black_rice',        icon: '🍚', name: '紫米',     nameEn: 'Black Rice',          shortLabel: '紫', shortLabelEn: 'Bk', tags: ['主食', '米'] },
    // ── 主食 · 面 ──
    { id: 'dried_noodles',     icon: '🍜', name: '挂面',     nameEn: 'Dried Noodles',       shortLabel: '挂', shortLabelEn: 'Dr', tags: ['主食', '面'] },
    { id: 'egg_noodles',       icon: '🍜', name: '鸡蛋面',   nameEn: 'Egg Noodles',         shortLabel: '蛋', shortLabelEn: 'Eg', tags: ['主食', '面'] },
    { id: 'buckwheat_noodles', icon: '🍜', name: '荞麦面',   nameEn: 'Buckwheat Noodles',   shortLabel: '荞', shortLabelEn: 'Bu', tags: ['主食', '面'] },
    { id: 'udon',              icon: '🍜', name: '乌冬面',   nameEn: 'Udon',                shortLabel: '冬', shortLabelEn: 'Ud', tags: ['主食', '面'] },
    // ── 主食 · 豆 ──
    { id: 'soybean',           icon: '🫘', name: '黄豆',     nameEn: 'Soybean',             shortLabel: '黄', shortLabelEn: 'Sy', tags: ['主食', '豆'] },
    { id: 'red_bean',          icon: '🫘', name: '红豆',     nameEn: 'Red Bean',            shortLabel: '红', shortLabelEn: 'Rd', tags: ['主食', '豆'] },
    { id: 'mung_bean',         icon: '🫘', name: '绿豆',     nameEn: 'Mung Bean',           shortLabel: '绿', shortLabelEn: 'Mu', tags: ['主食', '豆'] },
    { id: 'chickpea',          icon: '🫘', name: '鹰嘴豆',   nameEn: 'Chickpea',            shortLabel: '鹰', shortLabelEn: 'Ck', tags: ['主食', '豆'] },
    // ── 主食 · 面包 ──
    { id: 'white_bread',       icon: '🍞', name: '白面包',   nameEn: 'White Bread',         shortLabel: '白', shortLabelEn: 'Wt', tags: ['主食', '面包'] },
    { id: 'whole_wheat_bread', icon: '🍞', name: '全麦面包', nameEn: 'Whole Wheat Bread',   shortLabel: '麦', shortLabelEn: 'Ww', tags: ['主食', '面包'] },
    { id: 'sourdough',         icon: '🍞', name: '酸面包',   nameEn: 'Sourdough',           shortLabel: '酸', shortLabelEn: 'So', tags: ['主食', '面包'] },
    { id: 'baguette',          icon: '🍞', name: '法棍',     nameEn: 'Baguette',            shortLabel: '棍', shortLabelEn: 'Bg', tags: ['主食', '面包'] },

    // ── 蛋奶制品 · 蛋 ──
    { id: 'chicken_egg',       icon: '🥚', name: '鸡蛋',     nameEn: 'Chicken Egg',         shortLabel: '鸡', shortLabelEn: 'Ch', tags: ['蛋奶制品', '蛋'] },
    { id: 'duck_egg',          icon: '🥚', name: '鸭蛋',     nameEn: 'Duck Egg',            shortLabel: '鸭', shortLabelEn: 'Du', tags: ['蛋奶制品', '蛋'] },
    { id: 'quail_egg',         icon: '🥚', name: '鹌鹑蛋',   nameEn: 'Quail Egg',           shortLabel: '鹑', shortLabelEn: 'Qu', tags: ['蛋奶制品', '蛋'] },
    { id: 'goose_egg',         icon: '🥚', name: '鹅蛋',     nameEn: 'Goose Egg',           shortLabel: '鹅', shortLabelEn: 'Go', tags: ['蛋奶制品', '蛋'] },
    // ── 蛋奶制品 · 奶 ──
    { id: 'cow_milk',          icon: '🥛', name: '牛奶',     nameEn: 'Cow Milk',            shortLabel: '牛', shortLabelEn: 'Co', tags: ['蛋奶制品', '奶'] },
    { id: 'goat_milk',         icon: '🥛', name: '羊奶',     nameEn: 'Goat Milk',           shortLabel: '羊', shortLabelEn: 'Gt', tags: ['蛋奶制品', '奶'] },
    { id: 'buffalo_milk',      icon: '🥛', name: '水牛奶',   nameEn: 'Buffalo Milk',        shortLabel: '水', shortLabelEn: 'Bu', tags: ['蛋奶制品', '奶'] },
    { id: 'camel_milk',        icon: '🥛', name: '驼奶',     nameEn: 'Camel Milk',          shortLabel: '驼', shortLabelEn: 'Cm', tags: ['蛋奶制品', '奶'] },
    // ── 蛋奶制品 · 豆腐 ── (🥣 used to distinguish from 主食·豆 which uses 🫘)
    { id: 'soft_tofu',         icon: '🥣', name: '嫩豆腐',   nameEn: 'Soft Tofu',           shortLabel: '嫩', shortLabelEn: 'Sf', tags: ['蛋奶制品', '豆腐'] },
    { id: 'firm_tofu',         icon: '🥣', name: '老豆腐',   nameEn: 'Firm Tofu',           shortLabel: '老', shortLabelEn: 'Fm', tags: ['蛋奶制品', '豆腐'] },
    { id: 'frozen_tofu',       icon: '🥣', name: '冻豆腐',   nameEn: 'Frozen Tofu',         shortLabel: '冻', shortLabelEn: 'Fz', tags: ['蛋奶制品', '豆腐'] },
    { id: 'tofu_skin',         icon: '🥣', name: '腐竹',     nameEn: 'Tofu Skin',           shortLabel: '竹', shortLabelEn: 'Tk', tags: ['蛋奶制品', '豆腐'] },
    // ── 蛋奶制品 · 奶酪 ──
    { id: 'mozzarella',        icon: '🧀', name: '马苏里拉', nameEn: 'Mozzarella',          shortLabel: '马', shortLabelEn: 'Mz', tags: ['蛋奶制品', '奶酪'] },
    { id: 'cheddar',           icon: '🧀', name: '切达',     nameEn: 'Cheddar',             shortLabel: '切', shortLabelEn: 'Cd', tags: ['蛋奶制品', '奶酪'] },
    { id: 'brie',              icon: '🧀', name: '布里',     nameEn: 'Brie',                shortLabel: '布', shortLabelEn: 'Bi', tags: ['蛋奶制品', '奶酪'] },
    { id: 'parmesan',          icon: '🧀', name: '帕玛森',   nameEn: 'Parmesan',            shortLabel: '帕', shortLabelEn: 'Pm', tags: ['蛋奶制品', '奶酪'] },
];

// --- 品质系统 ---
// quality 1=普通(白) 2=精选(绿) 3=优质(蓝) 4=顶级(紫) 5=传说(橙)
// stars=颜色=scoreValue 一一对应
export const QUALITY_CONFIG = [
    { id: 1, name: '普通', stars: '★',     scoreValue: 1 },
    { id: 2, name: '精选', stars: '★★',    scoreValue: 2 },
    { id: 3, name: '优质', stars: '★★★',   scoreValue: 3 },
    { id: 4, name: '顶级', stars: '★★★★',  scoreValue: 5 },
    { id: 5, name: '传说', stars: '★★★★★', scoreValue: 8 },
];

// Probability weights for random quality roll on draw — must sum to 1.0
export const QUALITY_WEIGHTS = { 1: 0.40, 2: 0.30, 3: 0.18, 4: 0.09, 5: 0.03 };

// --- 市场类型（替换原墙类型）---
// 每种市场只出现对应大类的食材
export const MARKET_TYPES = [
    { id: 'seafood_market',  name: '海鲜市场', icon: '🦐', desc: '只能抢到海鲜类食材',        category: '海鲜',    weight: 20 },
    { id: 'butcher',         name: '肉铺',     icon: '🍖', desc: '只能抢到肉类食材',          category: '肉类',    weight: 20 },
    { id: 'grain_store',     name: '粮食店',   icon: '🍚', desc: '只能抢到主食类食材',        category: '主食',    weight: 20 },
    { id: 'vegetable_shop',  name: '蔬菜店',   icon: '🥬', desc: '只能抢到蔬菜·水果·菌菇类食材', category: '蔬菜',    weight: 20 },
    { id: 'dairy_store',     name: '乳品店',   icon: '🧀', desc: '只能抢到蛋奶制品',          category: '蛋奶制品', weight: 20 },
];

// --- 菜品关卡 ---
export const DISHES = [
    {
        id: 'ocean_threads',
        name: '海洋线条',
        nameEn: 'Lines of the Sea',
        icon: '🍝',
        baseline: 10,
        slots: [
            {
                name: '主料', required: true,
                rules: [
                    { match: { tag: '海鲜' }, multiplier: 0.5 },
                    { match: { tag: '虾' }, multiplier: 1 },
                    { match: { id: 'tiger_prawn' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
                trigger: {
                    whenTag: '贝',
                    spawnSlot: {
                        name: '主料', required: false,
                        rules: [
                            { match: { tag: '海鲜' }, multiplier: 0.5 },
                            { match: { tag: '虾' }, multiplier: 1 },
                            { match: { id: 'tiger_prawn' }, multiplier: 2 },
                        ],
                        defaultMultiplier: 0,
                        exclude: '贝',
                    },
                },
            },
            {
                name: '基底', required: true,
                rules: [
                    { match: { tag: '主食' }, multiplier: 0.5 },
                    { match: { tag: '面' }, multiplier: 1 },
                    { match: { id: 'egg_noodles' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
            },
            {
                name: '汤汁', required: true,
                rules: [
                    { match: { tag: '蔬菜' }, multiplier: 0.5 },
                    { match: { tag: '菌菇' }, multiplier: 1 },
                    { match: { id: 'shiitake' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
            },
            {
                name: '配料', required: false,
                rules: [],
                defaultMultiplier: 1,
            },
        ],
    },
    {
        id: 'ember_hearth',
        name: '炉火慢歌',
        nameEn: 'Ballad of the Ember Hearth',
        icon: '🍛',
        baseline: 10,
        slots: [
            {
                name: '主料', required: true,
                rules: [
                    { match: { tag: '肉类' }, multiplier: 0.5 },
                    { match: { tag: '牛' }, multiplier: 1 },
                    { match: { id: 'beef_brisket' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
            },
            {
                name: '底', required: true,
                rules: [
                    { match: { tag: '主食' }, multiplier: 0.5 },
                    { match: { tag: '米' }, multiplier: 1 },
                    { match: { id: 'white_rice' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
            },
            {
                name: '炖料', required: false,
                rules: [
                    { match: { tag: '蔬菜' }, multiplier: 0.5 },
                    { match: { tag: '根茎' }, multiplier: 1 },
                    { match: { id: 'potato' }, multiplier: 2 },
                ],
                defaultMultiplier: 0,
                crossBonus: { requireSlot: '底', requireTag: '面包', multiplier: 2 },
            },
            {
                name: '配料', required: false,
                rules: [],
                defaultMultiplier: 1,
            },
        ],
    },
];

// --- 订单模板 ---
// 两种需求模式（二选一）：
//   qualityDist: 固定品质数组（每个元素是该 slot 要求的品质 id）——
//                优先使用；长度 = 槽位数；每个 slot count 仍 = 1。
//   reqBudget:   legacy 预算法 —— 把总 scoreValue 分布到 ingredientTypes
//                个 slot 上，品质带 ±25% 方差。仅在未设 qualityDist 时生效。
export const ORDER_TEMPLATES = [
    { id: 'easy',    difficulty: 'easy',    reqBudget: 2,                   rewardQuality: 2, ingredientTypes: 2, weight: 30 },
    { id: 'medium',  difficulty: 'medium',  reqBudget: 3,                   rewardQuality: 3, ingredientTypes: 2, weight: 40 },
    { id: 'hard',    difficulty: 'hard',    qualityDist: [3, 2, 1],         rewardQuality: 4, ingredientTypes: 3, weight: 20 },
    { id: 'extreme', difficulty: 'extreme', qualityDist: [3, 3, 2],         rewardQuality: 5, ingredientTypes: 3, weight: 10 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,
    scoreToWin: 30,
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 4,
    maxActive: 3,
    newPerTurn: 1,
    initialCount: 4,
};

// --- 道具系统 ---
// 5 个道具共享一个骨架:"抽取前塑形"。所有道具都在抽取之前修改情境
// (信息 / 墙面 / 资源),但不改变抽取本身的规则。
export const TOOLS = [
    {
        id: 'peek',
        name: '透视',
        nameEn: 'Peek',
        icon: '👁',
        desc: '揭示一行或一列所有食材的品质',
        descEn: 'Reveal ingredient qualities in a row or column',
        // 使用流程:使用 → 点击一行或一列 → 该行/列所有 ingredient 格子的 quality 预 roll 并显示
        targetKind: 'row_or_col',
    },
    {
        id: 'swap',
        name: '换位',
        nameEn: 'Swap',
        icon: '🔄',
        desc: '选择墙上任意 2 格交换位置',
        descEn: 'Swap any 2 cells on the wall',
        targetKind: 'two_cells',
    },
    {
        id: 'disperse',
        name: '驱散',
        nameEn: 'Disperse',
        icon: '💨',
        desc: '丢弃墙上任意 1 格的内容',
        descEn: 'Discard any 1 cell on the wall',
        targetKind: 'any_cell',
    },
    {
        id: 'bomb_wall',
        name: '炸墙',
        nameEn: 'Blast Wall',
        icon: '💥',
        desc: '炸掉一个 3×3 区域,重新填充',
        descEn: 'Blast a 3×3 region and refill',
        targetKind: 'center_cell',
    },
    {
        id: 'clear_inventory',
        name: '清库换抽',
        nameEn: 'Trade-in Draw',
        icon: '🗑',
        desc: '丢弃 1 格菜篮食材,换 1 抽数',
        descEn: 'Discard 1 basket item for +1 draw',
        targetKind: 'inventory_slot',
    },
];

export const TOOL_CONFIG = {
    capacity: 3,           // toolbar slots
    dayStartCount: 3,      // granted at startGame (distinct)
    perWallExitCount: 1,   // granted on entering between_turns
    allowDuplicates: true, // same tool id can appear in multiple slots
};
