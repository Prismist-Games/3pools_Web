/**
 * v2Config.js — v2 data foundations
 * Ingredients, quality system, market types, orders, dishes, expeditions
 */

// --- 食材总表 (80 types, no rarity — quality assigned at draw time) ---
// tags: [大类, 小类]
export const INGREDIENTS = [
    // ── 肉类 · 鸡 ──
    { id: 'chicken_breast',    icon: '🍗', name: '鸡胸肉',   nameEn: 'Chicken Breast',      tags: ['肉类', '鸡'] },
    { id: 'chicken_thigh',     icon: '🍗', name: '鸡腿肉',   nameEn: 'Chicken Thigh',       tags: ['肉类', '鸡'] },
    { id: 'chicken_wing',      icon: '🍗', name: '鸡翅',     nameEn: 'Chicken Wing',        tags: ['肉类', '鸡'] },
    { id: 'chicken_tenderloin',icon: '🍗', name: '鸡里脊',   nameEn: 'Chicken Tenderloin',  tags: ['肉类', '鸡'] },
    // ── 肉类 · 牛 ──
    { id: 'ground_beef',       icon: '🥩', name: '牛肉碎',   nameEn: 'Ground Beef',         tags: ['肉类', '牛'] },
    { id: 'beef_brisket',      icon: '🥩', name: '牛腩',     nameEn: 'Beef Brisket',        tags: ['肉类', '牛'] },
    { id: 'beef_steak',        icon: '🥩', name: '牛排',     nameEn: 'Beef Steak',          tags: ['肉类', '牛'] },
    { id: 'beef_tenderloin',   icon: '🥩', name: '牛里脊',   nameEn: 'Beef Tenderloin',     tags: ['肉类', '牛'] },
    // ── 肉类 · 猪 ──
    { id: 'ground_pork',       icon: '🥓', name: '猪肉碎',   nameEn: 'Ground Pork',         tags: ['肉类', '猪'] },
    { id: 'pork_belly',        icon: '🥓', name: '五花肉',   nameEn: 'Pork Belly',          tags: ['肉类', '猪'] },
    { id: 'pork_ribs',         icon: '🥓', name: '排骨',     nameEn: 'Pork Ribs',           tags: ['肉类', '猪'] },
    { id: 'pork_tenderloin',   icon: '🥓', name: '猪里脊',   nameEn: 'Pork Tenderloin',     tags: ['肉类', '猪'] },
    // ── 肉类 · 羊 ──
    { id: 'ground_lamb',       icon: '🍖', name: '羊肉碎',   nameEn: 'Ground Lamb',         tags: ['肉类', '羊'] },
    { id: 'lamb_leg',          icon: '🍖', name: '羊腿',     nameEn: 'Lamb Leg',            tags: ['肉类', '羊'] },
    { id: 'lamb_chop',         icon: '🍖', name: '羊排',     nameEn: 'Lamb Chop',           tags: ['肉类', '羊'] },
    { id: 'lamb_tenderloin',   icon: '🍖', name: '羊里脊',   nameEn: 'Lamb Tenderloin',     tags: ['肉类', '羊'] },

    // ── 海鲜 · 鱼 ──
    { id: 'sardine',           icon: '🐟', name: '沙丁鱼',   nameEn: 'Sardine',             tags: ['海鲜', '鱼'] },
    { id: 'sea_bass',          icon: '🐟', name: '鲈鱼',     nameEn: 'Sea Bass',            tags: ['海鲜', '鱼'] },
    { id: 'salmon',            icon: '🐟', name: '三文鱼',   nameEn: 'Salmon',              tags: ['海鲜', '鱼'] },
    { id: 'tuna',              icon: '🐟', name: '金枪鱼',   nameEn: 'Tuna',                tags: ['海鲜', '鱼'] },
    // ── 海鲜 · 虾 ──
    { id: 'river_shrimp',      icon: '🦐', name: '河虾',     nameEn: 'River Shrimp',        tags: ['海鲜', '虾'] },
    { id: 'white_shrimp',      icon: '🦐', name: '基围虾',   nameEn: 'White Shrimp',        tags: ['海鲜', '虾'] },
    { id: 'tiger_prawn',       icon: '🦐', name: '明虾',     nameEn: 'Tiger Prawn',         tags: ['海鲜', '虾'] },
    { id: 'spot_prawn',        icon: '🦐', name: '牡丹虾',   nameEn: 'Spot Prawn',          tags: ['海鲜', '虾'] },
    // ── 海鲜 · 贝 ──
    { id: 'clam',              icon: '🐚', name: '蛤蜊',     nameEn: 'Clam',                tags: ['海鲜', '贝'] },
    { id: 'mussel',            icon: '🐚', name: '青口',     nameEn: 'Mussel',              tags: ['海鲜', '贝'] },
    { id: 'scallop',           icon: '🐚', name: '扇贝',     nameEn: 'Scallop',             tags: ['海鲜', '贝'] },
    { id: 'abalone',           icon: '🐚', name: '鲍鱼',     nameEn: 'Abalone',             tags: ['海鲜', '贝'] },
    // ── 海鲜 · 蟹 ──
    { id: 'blue_crab',         icon: '🦀', name: '花蟹',     nameEn: 'Blue Crab',           tags: ['海鲜', '蟹'] },
    { id: 'swimming_crab',     icon: '🦀', name: '梭子蟹',   nameEn: 'Swimming Crab',       tags: ['海鲜', '蟹'] },
    { id: 'dungeness_crab',    icon: '🦀', name: '面包蟹',   nameEn: 'Dungeness Crab',      tags: ['海鲜', '蟹'] },
    { id: 'king_crab',         icon: '🦀', name: '帝王蟹',   nameEn: 'King Crab',           tags: ['海鲜', '蟹'] },

    // ── 蔬菜 · 青菜 ──
    { id: 'cabbage',           icon: '🥬', name: '白菜',     nameEn: 'Cabbage',             tags: ['蔬菜', '青菜'] },
    { id: 'spinach',           icon: '🥬', name: '菠菜',     nameEn: 'Spinach',             tags: ['蔬菜', '青菜'] },
    { id: 'lettuce',           icon: '🥬', name: '生菜',     nameEn: 'Lettuce',             tags: ['蔬菜', '青菜'] },
    { id: 'rapeseed',          icon: '🥬', name: '油菜',     nameEn: 'Rapeseed',            tags: ['蔬菜', '青菜'] },
    // ── 蔬菜 · 根茎 ──
    { id: 'potato',            icon: '🥔', name: '土豆',     nameEn: 'Potato',              tags: ['蔬菜', '根茎'] },
    { id: 'sweet_potato',      icon: '🥔', name: '红薯',     nameEn: 'Sweet Potato',        tags: ['蔬菜', '根茎'] },
    { id: 'taro',              icon: '🥔', name: '芋头',     nameEn: 'Taro',                tags: ['蔬菜', '根茎'] },
    { id: 'lotus_root',        icon: '🥔', name: '莲藕',     nameEn: 'Lotus Root',          tags: ['蔬菜', '根茎'] },
    // ── 蔬菜 · 水果 ──
    { id: 'apple',             icon: '🍎', name: '苹果',     nameEn: 'Apple',               tags: ['蔬菜', '水果'] },
    { id: 'lemon',             icon: '🍋', name: '柠檬',     nameEn: 'Lemon',               tags: ['蔬菜', '水果'] },
    { id: 'mango',             icon: '🥭', name: '芒果',     nameEn: 'Mango',               tags: ['蔬菜', '水果'] },
    { id: 'strawberry',        icon: '🍓', name: '草莓',     nameEn: 'Strawberry',          tags: ['蔬菜', '水果'] },
    // ── 蔬菜 · 菌菇 ──
    { id: 'oyster_mushroom',   icon: '🍄', name: '平菇',     nameEn: 'Oyster Mushroom',     tags: ['蔬菜', '菌菇'] },
    { id: 'shiitake',          icon: '🍄', name: '香菇',     nameEn: 'Shiitake',            tags: ['蔬菜', '菌菇'] },
    { id: 'enoki',             icon: '🍄', name: '金针菇',   nameEn: 'Enoki',               tags: ['蔬菜', '菌菇'] },
    { id: 'king_oyster',       icon: '🍄', name: '杏鲍菇',   nameEn: 'King Oyster Mushroom',tags: ['蔬菜', '菌菇'] },

    // ── 主食 · 米 ──
    { id: 'white_rice',        icon: '🍚', name: '粳米',     nameEn: 'White Rice',          tags: ['主食', '米'] },
    { id: 'brown_rice',        icon: '🍚', name: '糙米',     nameEn: 'Brown Rice',          tags: ['主食', '米'] },
    { id: 'jasmine_rice',      icon: '🍚', name: '茉莉香米', nameEn: 'Jasmine Rice',        tags: ['主食', '米'] },
    { id: 'black_rice',        icon: '🍚', name: '紫米',     nameEn: 'Black Rice',          tags: ['主食', '米'] },
    // ── 主食 · 面 ──
    { id: 'dried_noodles',     icon: '🍜', name: '挂面',     nameEn: 'Dried Noodles',       tags: ['主食', '面'] },
    { id: 'egg_noodles',       icon: '🍜', name: '鸡蛋面',   nameEn: 'Egg Noodles',         tags: ['主食', '面'] },
    { id: 'buckwheat_noodles', icon: '🍜', name: '荞麦面',   nameEn: 'Buckwheat Noodles',   tags: ['主食', '面'] },
    { id: 'udon',              icon: '🍜', name: '乌冬面',   nameEn: 'Udon',                tags: ['主食', '面'] },
    // ── 主食 · 豆 ──
    { id: 'soybean',           icon: '🫘', name: '黄豆',     nameEn: 'Soybean',             tags: ['主食', '豆'] },
    { id: 'red_bean',          icon: '🫘', name: '红豆',     nameEn: 'Red Bean',            tags: ['主食', '豆'] },
    { id: 'mung_bean',         icon: '🫘', name: '绿豆',     nameEn: 'Mung Bean',           tags: ['主食', '豆'] },
    { id: 'chickpea',          icon: '🫘', name: '鹰嘴豆',   nameEn: 'Chickpea',            tags: ['主食', '豆'] },
    // ── 主食 · 面包 ──
    { id: 'white_bread',       icon: '🍞', name: '白面包',   nameEn: 'White Bread',         tags: ['主食', '面包'] },
    { id: 'whole_wheat_bread', icon: '🍞', name: '全麦面包', nameEn: 'Whole Wheat Bread',   tags: ['主食', '面包'] },
    { id: 'sourdough',         icon: '🍞', name: '酸面包',   nameEn: 'Sourdough',           tags: ['主食', '面包'] },
    { id: 'baguette',          icon: '🍞', name: '法棍',     nameEn: 'Baguette',            tags: ['主食', '面包'] },

    // ── 蛋奶制品 · 蛋 ──
    { id: 'chicken_egg',       icon: '🥚', name: '鸡蛋',     nameEn: 'Chicken Egg',         tags: ['蛋奶制品', '蛋'] },
    { id: 'duck_egg',          icon: '🥚', name: '鸭蛋',     nameEn: 'Duck Egg',            tags: ['蛋奶制品', '蛋'] },
    { id: 'quail_egg',         icon: '🥚', name: '鹌鹑蛋',   nameEn: 'Quail Egg',           tags: ['蛋奶制品', '蛋'] },
    { id: 'goose_egg',         icon: '🥚', name: '鹅蛋',     nameEn: 'Goose Egg',           tags: ['蛋奶制品', '蛋'] },
    // ── 蛋奶制品 · 奶 ──
    { id: 'cow_milk',          icon: '🥛', name: '牛奶',     nameEn: 'Cow Milk',            tags: ['蛋奶制品', '奶'] },
    { id: 'goat_milk',         icon: '🥛', name: '羊奶',     nameEn: 'Goat Milk',           tags: ['蛋奶制品', '奶'] },
    { id: 'buffalo_milk',      icon: '🥛', name: '水牛奶',   nameEn: 'Buffalo Milk',        tags: ['蛋奶制品', '奶'] },
    { id: 'camel_milk',        icon: '🥛', name: '驼奶',     nameEn: 'Camel Milk',          tags: ['蛋奶制品', '奶'] },
    // ── 蛋奶制品 · 豆腐 ──
    { id: 'soft_tofu',         icon: '🫘', name: '嫩豆腐',   nameEn: 'Soft Tofu',           tags: ['蛋奶制品', '豆腐'] },
    { id: 'firm_tofu',         icon: '🫘', name: '老豆腐',   nameEn: 'Firm Tofu',           tags: ['蛋奶制品', '豆腐'] },
    { id: 'frozen_tofu',       icon: '🫘', name: '冻豆腐',   nameEn: 'Frozen Tofu',         tags: ['蛋奶制品', '豆腐'] },
    { id: 'tofu_skin',         icon: '🫘', name: '腐竹',     nameEn: 'Tofu Skin',           tags: ['蛋奶制品', '豆腐'] },
    // ── 蛋奶制品 · 奶酪 ──
    { id: 'mozzarella',        icon: '🧀', name: '马苏里拉', nameEn: 'Mozzarella',          tags: ['蛋奶制品', '奶酪'] },
    { id: 'cheddar',           icon: '🧀', name: '切达',     nameEn: 'Cheddar',             tags: ['蛋奶制品', '奶酪'] },
    { id: 'brie',              icon: '🧀', name: '布里',     nameEn: 'Brie',                tags: ['蛋奶制品', '奶酪'] },
    { id: 'parmesan',          icon: '🧀', name: '帕玛森',   nameEn: 'Parmesan',            tags: ['蛋奶制品', '奶酪'] },
];

// --- 品质系统 ---
// quality 1=普通 2=精选 3=优质 4=顶级
export const QUALITY_CONFIG = [
    { id: 1, name: '普通', stars: '★',    scoreValue: 1 },
    { id: 2, name: '精选', stars: '★★',   scoreValue: 2 },
    { id: 3, name: '优质', stars: '★★★',  scoreValue: 3 },
    { id: 4, name: '顶级', stars: '★★★★', scoreValue: 5 },
];

// Probability weights for random quality roll on draw
export const QUALITY_WEIGHTS = { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 };

// --- 市场类型（替换原墙类型）---
// 每种市场只出现对应大类的食材
export const MARKET_TYPES = [
    { id: 'seafood_market',  name: '海鲜市场', icon: '🦐', desc: '只出现海鲜类食材', category: '海鲜',    weight: 20 },
    { id: 'butcher',         name: '肉铺',     icon: '🍖', desc: '只出现肉类食材',   category: '肉类',    weight: 20 },
    { id: 'grain_store',     name: '粮食店',   icon: '🍚', desc: '只出现主食类食材', category: '主食',    weight: 20 },
    { id: 'vegetable_shop',  name: '蔬菜店',   icon: '🥬', desc: '只出现蔬菜类食材', category: '蔬菜',    weight: 20 },
    { id: 'dairy_store',     name: '乳品店',   icon: '🧀', desc: '只出现蛋奶制品',   category: '蛋奶制品', weight: 20 },
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
                name: '主料', required: true, accept: '海鲜', prefer: '虾',
                trigger: {
                    whenTag: '贝',
                    spawnSlot: { name: '主料', required: false, accept: '海鲜', prefer: '虾', exclude: '贝' },
                },
            },
            { name: '基底', required: true,  accept: '主食', prefer: '面' },
            { name: '汤汁', required: false, accept: '蔬菜', prefer: '菌菇' },
            { name: '配料', required: false, accept: '', prefer: '' },
        ],
    },
    {
        id: 'ember_hearth',
        name: '炉火慢歌',
        nameEn: 'Ballad of the Ember Hearth',
        icon: '🍛',
        baseline: 10,
        slots: [
            { name: '主料', required: true, accept: '肉类', prefer: '牛' },
            { name: '底',   required: true, accept: '主食', prefer: ['米', '面包'] },
            {
                name: '炖料', required: false, accept: '蔬菜', prefer: '根茎',
                crossBonus: { requireSlot: '主料', requireTag: '牛', points: 3 },
            },
            { name: '配料', required: false, accept: '', prefer: '' },
        ],
    },
];

// --- 订单模板 ---
export const ORDER_TEMPLATES = [
    { id: 'a', difficulty: 'easy',    reqQuality: 1, rewardQuality: 2, totalIngredients: 2, ingredientTypes: 1, weight: 40 },
    { id: 'b', difficulty: 'medium',  reqQuality: 2, rewardQuality: 3, totalIngredients: 3, ingredientTypes: 2, weight: 30 },
    { id: 'c', difficulty: 'hard',    reqQuality: 3, rewardQuality: 4, totalIngredients: 4, ingredientTypes: 3, weight: 20 },
    { id: 'd', difficulty: 'extreme', reqQuality: 2, rewardQuality: 4, totalIngredients: 6, ingredientTypes: 4, weight: 10 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,
    scoreToWin: 30,
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 5,
    maxActive: 3,
    newPerTurn: 1,
    initialCount: 4,
};
