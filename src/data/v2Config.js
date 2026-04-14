/**
 * v2Config.js — v2 data foundations
 * Stickers, out-of-game items, orders, walls, expeditions
 */

// --- 贴纸类型 ---
export const STICKER_TYPES = [
    { id: 'mountain',  icon: '🏔️', name: '山' },
    { id: 'sea',       icon: '🌊', name: '海' },
    { id: 'field',     icon: '🌾', name: '田' },
    { id: 'forest',    icon: '🌲', name: '林' },
    { id: 'sky',       icon: '🌤️', name: '空' },
    { id: 'island',    icon: '🏝️', name: '岛' },
    { id: 'desert',    icon: '🏜️', name: '沙' },
    { id: 'snow',      icon: '❄️', name: '雪' },
    { id: 'fire',      icon: '🔥', name: '火' },
    { id: 'lightning', icon: '⚡', name: '电' },
    { id: 'star',      icon: '⭐', name: '星' },
    { id: 'moon',      icon: '🌙', name: '月' },
    { id: 'flower',    icon: '🌸', name: '花' },
    { id: 'wind',      icon: '🌪️', name: '风' },
    { id: 'rain',      icon: '🌧️', name: '雨' },
    { id: 'sun',       icon: '☀️', name: '日' },
    { id: 'river',     icon: '🏞️', name: '河' },
    { id: 'volcano',   icon: '🌋', name: '岩' },
    { id: 'rainbow',   icon: '🌈', name: '虹' },
    { id: 'crystal',   icon: '💎', name: '晶' },
];

// --- 食材总表 ---
// rarity: 1(★绿) 2(★★蓝) 3(★★★紫) 4(★★★★橙)
// tags: 扁平属性标签数组，用于槽位过滤/加成/风味效果
export const INGREDIENTS = [
    // ── 肉类 · 鸡 ──
    { id: 'chicken_breast',     icon: '🍗', name: '鸡胸肉',         nameEn: 'Chicken Breast',      rarity: 1, tags: ['肉类', '鸡'] },
    { id: 'chicken_thigh',      icon: '🍗', name: '鸡腿肉',         nameEn: 'Chicken Thigh',       rarity: 2, tags: ['肉类', '鸡'] },
    { id: 'free_range_chicken', icon: '🍗', name: '走地鸡肉',       nameEn: 'Free-Range Chicken',  rarity: 3, tags: ['肉类', '鸡'] },
    { id: 'silkie_chicken',     icon: '🍗', name: '乌骨鸡肉',       nameEn: 'Silkie Chicken',      rarity: 4, tags: ['肉类', '鸡'] },
    // ── 肉类 · 牛 ──
    { id: 'ground_beef',        icon: '🥩', name: '牛肉碎',         nameEn: 'Ground Beef',         rarity: 1, tags: ['肉类', '牛'] },
    { id: 'beef_shank',         icon: '🥩', name: '牛腱肉',         nameEn: 'Beef Shank',          rarity: 2, tags: ['肉类', '牛'] },
    { id: 'angus_beef',         icon: '🥩', name: '安格斯牛肉',     nameEn: 'Angus Beef',          rarity: 3, tags: ['肉类', '牛'] },
    { id: 'wagyu',              icon: '🥩', name: '和牛',           nameEn: 'Wagyu Beef',          rarity: 4, tags: ['肉类', '牛'] },
    // ── 肉类 · 猪 ──
    { id: 'ground_pork',        icon: '🥓', name: '猪肉碎',         nameEn: 'Ground Pork',         rarity: 1, tags: ['肉类', '猪'] },
    { id: 'pork_belly',         icon: '🥓', name: '五花肉',         nameEn: 'Pork Belly',          rarity: 2, tags: ['肉类', '猪'] },
    { id: 'berkshire_pork',     icon: '🥓', name: '黑猪肉',         nameEn: 'Berkshire Pork',      rarity: 3, tags: ['肉类', '猪'] },
    { id: 'iberico_pork',       icon: '🥓', name: '伊比利亚猪肉',   nameEn: 'Ibérico Pork',        rarity: 4, tags: ['肉类', '猪'] },
    // ── 肉类 · 羊 ──
    { id: 'ground_lamb',        icon: '🍖', name: '羊肉碎',         nameEn: 'Ground Lamb',         rarity: 1, tags: ['肉类', '羊'] },
    { id: 'lamb_leg',           icon: '🍖', name: '羊腿肉',         nameEn: 'Lamb Leg',            rarity: 2, tags: ['肉类', '羊'] },
    { id: 'lamb_chop',          icon: '🍖', name: '羊排肉',         nameEn: 'Lamb Chop',           rarity: 3, tags: ['肉类', '羊'] },
    { id: 'spring_lamb',        icon: '🍖', name: '羊羔肉',         nameEn: 'Spring Lamb',         rarity: 4, tags: ['肉类', '羊'] },

    // ── 海鲜 · 鱼 ──
    { id: 'sardine',            icon: '🐟', name: '沙丁鱼',         nameEn: 'Sardine',             rarity: 1, tags: ['海鲜', '鱼'] },
    { id: 'sea_bass',           icon: '🐟', name: '鲈鱼',           nameEn: 'Sea Bass',            rarity: 2, tags: ['海鲜', '鱼'] },
    { id: 'salmon',             icon: '🐟', name: '三文鱼',         nameEn: 'Salmon',              rarity: 3, tags: ['海鲜', '鱼'] },
    { id: 'bluefin_tuna',       icon: '🐟', name: '蓝鳍金枪鱼',    nameEn: 'Bluefin Tuna',        rarity: 4, tags: ['海鲜', '鱼'] },
    // ── 海鲜 · 虾 ──
    { id: 'river_shrimp',       icon: '🦐', name: '河虾',           nameEn: 'River Shrimp',        rarity: 1, tags: ['海鲜', '虾'] },
    { id: 'white_shrimp',       icon: '🦐', name: '基围虾',         nameEn: 'White Shrimp',        rarity: 2, tags: ['海鲜', '虾'] },
    { id: 'tiger_prawn',        icon: '🦐', name: '明虾',           nameEn: 'Tiger Prawn',         rarity: 3, tags: ['海鲜', '虾'] },
    { id: 'spot_prawn',         icon: '🦐', name: '牡丹虾',         nameEn: 'Spot Prawn',          rarity: 4, tags: ['海鲜', '虾'] },
    // ── 海鲜 · 贝 ──
    { id: 'clam',               icon: '🐚', name: '蛤蜊',           nameEn: 'Clam',                rarity: 1, tags: ['海鲜', '贝'] },
    { id: 'mussel',             icon: '🐚', name: '青口',           nameEn: 'Mussel',              rarity: 2, tags: ['海鲜', '贝'] },
    { id: 'scallop',            icon: '🐚', name: '扇贝',           nameEn: 'Scallop',             rarity: 3, tags: ['海鲜', '贝'] },
    { id: 'abalone',            icon: '🐚', name: '鲍鱼',           nameEn: 'Abalone',             rarity: 4, tags: ['海鲜', '贝'] },
    // ── 海鲜 · 蟹 ──
    { id: 'blue_crab',          icon: '🦀', name: '花蟹',           nameEn: 'Blue Crab',           rarity: 1, tags: ['海鲜', '蟹'] },
    { id: 'swimming_crab',      icon: '🦀', name: '梭子蟹',         nameEn: 'Swimming Crab',       rarity: 2, tags: ['海鲜', '蟹'] },
    { id: 'dungeness_crab',     icon: '🦀', name: '面包蟹',         nameEn: 'Dungeness Crab',      rarity: 3, tags: ['海鲜', '蟹'] },
    { id: 'king_crab',          icon: '🦀', name: '帝王蟹',         nameEn: 'King Crab',           rarity: 4, tags: ['海鲜', '蟹'] },

    // ── 蔬菜 · 青菜 ──
    { id: 'cabbage',            icon: '🥬', name: '白菜',           nameEn: 'Cabbage',             rarity: 1, tags: ['蔬菜', '青菜'] },
    { id: 'spinach',            icon: '🥬', name: '菠菜',           nameEn: 'Spinach',             rarity: 2, tags: ['蔬菜', '青菜'] },
    { id: 'asparagus',          icon: '🥬', name: '芦笋',           nameEn: 'Asparagus',           rarity: 3, tags: ['蔬菜', '青菜'] },
    { id: 'artichoke',          icon: '🥬', name: '朝鲜蓟',         nameEn: 'Artichoke',           rarity: 4, tags: ['蔬菜', '青菜'] },
    // ── 蔬菜 · 根茎 ──
    { id: 'potato',             icon: '🥔', name: '土豆',           nameEn: 'Potato',              rarity: 1, tags: ['蔬菜', '根茎'] },
    { id: 'sweet_potato',       icon: '🥔', name: '红薯',           nameEn: 'Sweet Potato',        rarity: 2, tags: ['蔬菜', '根茎'] },
    { id: 'taro',               icon: '🥔', name: '芋头',           nameEn: 'Taro',                rarity: 3, tags: ['蔬菜', '根茎'] },
    { id: 'lotus_root',         icon: '🥔', name: '莲藕',           nameEn: 'Lotus Root',          rarity: 4, tags: ['蔬菜', '根茎'] },
    // ── 蔬菜 · 水果 ──
    { id: 'apple',              icon: '🍎', name: '苹果',           nameEn: 'Apple',               rarity: 1, tags: ['蔬菜', '水果'] },
    { id: 'lemon',              icon: '🍎', name: '柠檬',           nameEn: 'Lemon',               rarity: 2, tags: ['蔬菜', '水果'] },
    { id: 'mango',              icon: '🍎', name: '芒果',           nameEn: 'Mango',               rarity: 3, tags: ['蔬菜', '水果'] },
    { id: 'passion_fruit',      icon: '🍎', name: '百香果',         nameEn: 'Passion Fruit',       rarity: 4, tags: ['蔬菜', '水果'] },
    // ── 蔬菜 · 菌菇 ──
    { id: 'oyster_mushroom',    icon: '🍄', name: '平菇',           nameEn: 'Oyster Mushroom',     rarity: 1, tags: ['蔬菜', '菌菇'] },
    { id: 'shiitake',           icon: '🍄', name: '香菇',           nameEn: 'Shiitake',            rarity: 2, tags: ['蔬菜', '菌菇'] },
    { id: 'porcini',            icon: '🍄', name: '牛肝菌',         nameEn: 'Porcini',             rarity: 3, tags: ['蔬菜', '菌菇'] },
    { id: 'truffle',            icon: '🍄', name: '松露',           nameEn: 'Truffle',             rarity: 4, tags: ['蔬菜', '菌菇'] },

    // ── 主食 · 米 ──
    { id: 'white_rice',         icon: '🍚', name: '粳米',           nameEn: 'White Rice',          rarity: 1, tags: ['主食', '米'] },
    { id: 'brown_rice',         icon: '🍚', name: '糙米',           nameEn: 'Brown Rice',          rarity: 2, tags: ['主食', '米'] },
    { id: 'jasmine_rice',       icon: '🍚', name: '茉莉香米',       nameEn: 'Jasmine Rice',        rarity: 3, tags: ['主食', '米'] },
    { id: 'pearl_rice',         icon: '🍚', name: '珍珠米',         nameEn: 'Pearl Rice',          rarity: 4, tags: ['主食', '米'] },
    // ── 主食 · 面 ──
    { id: 'dried_noodles',      icon: '🍜', name: '挂面',           nameEn: 'Dried Noodles',       rarity: 1, tags: ['主食', '面'] },
    { id: 'egg_noodles',        icon: '🍜', name: '鸡蛋面',         nameEn: 'Egg Noodles',         rarity: 2, tags: ['主食', '面'] },
    { id: 'buckwheat_noodles',  icon: '🍜', name: '荞麦面',         nameEn: 'Buckwheat Noodles',   rarity: 3, tags: ['主食', '面'] },
    { id: 'handmade_noodles',   icon: '🍜', name: '手擀面',         nameEn: 'Handmade Noodles',    rarity: 4, tags: ['主食', '面'] },
    // ── 主食 · 豆 ──
    { id: 'soybean',            icon: '🫘', name: '黄豆',           nameEn: 'Soybean',             rarity: 1, tags: ['主食', '豆'] },
    { id: 'red_bean',           icon: '🫘', name: '红豆',           nameEn: 'Red Bean',            rarity: 2, tags: ['主食', '豆'] },
    { id: 'mung_bean',          icon: '🫘', name: '绿豆',           nameEn: 'Mung Bean',           rarity: 3, tags: ['主食', '豆'] },
    { id: 'chickpea',           icon: '🫘', name: '鹰嘴豆',         nameEn: 'Chickpea',            rarity: 4, tags: ['主食', '豆'] },
    // ── 主食 · 面包 ──
    { id: 'white_bread',        icon: '🍞', name: '白面包',         nameEn: 'White Bread',         rarity: 1, tags: ['主食', '面包'] },
    { id: 'whole_wheat_bread',  icon: '🍞', name: '全麦面包',       nameEn: 'Whole Wheat Bread',   rarity: 2, tags: ['主食', '面包'] },
    { id: 'sourdough',          icon: '🍞', name: '酸面包',         nameEn: 'Sourdough',           rarity: 3, tags: ['主食', '面包'] },
    { id: 'brioche',            icon: '🍞', name: '布里欧修',       nameEn: 'Brioche',             rarity: 4, tags: ['主食', '面包'] },
];

// --- 菜品关卡 ---
// 匹配逻辑：小类匹配 ×2, 大类匹配 ×1, 不匹配 ×0.5
// 基础分 = rarity (暂定，后续调整)
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
                    spawnSlot: { name: '主料', required: false, accept: '海鲜', prefer: '', exclude: '贝' },
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
// 每个订单奖励 1 个对应稀有度的食材
export const ORDER_TEMPLATES = [
    { id: 'a', difficulty: 'easy',    rewardTiers: [1], totalStickers: 2, stickerTypes: 1, weight: 40 },
    { id: 'b', difficulty: 'medium',  rewardTiers: [2], totalStickers: 3, stickerTypes: 2, weight: 30 },
    { id: 'c', difficulty: 'hard',    rewardTiers: [3], totalStickers: 4, stickerTypes: 3, weight: 20 },
    { id: 'd', difficulty: 'extreme', rewardTiers: [4], totalStickers: 6, stickerTypes: 4, weight: 10 },
];

// --- 墙类型定义 ---
export const WALL_TYPES = [
    { id: 'basic',       name: '经典赛道', icon: '🎯', desc: '标准规则，行列自由选择', weight: 30 },
    { id: 'hidden',      name: '神秘面纱', icon: '🎭', desc: '部分格子内容隐藏，抽到相邻格时揭示', weight: 20, hiddenRatio: 0.3 },
    { id: 'drift',       name: '乾坤大挪移', icon: '🌀', desc: '每次抽取后，剩余格子随机移位', weight: 15 },
    { id: 'multiplier',  name: '双倍惊喜', icon: '✨', desc: '部分格子效果翻倍（贴纸×2，厄运×2）', weight: 15, multiplierRatio: 0.2 },
    { id: 'alternating', name: '交叉问答', icon: '🔀', desc: '必须行列交替选择', weight: 20 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,     // 每局游戏远征次数
    scoreToWin: 30,         // 胜利所需总分
};

// --- 订单配置 ---
export const ORDER_CONFIG = {
    bulletinCapacity: 5,    // 货架最大订单数
    maxActive: 3,           // 玩家最多持有订单数
    newPerTurn: 1,          // 每回合新增订单数
    initialCount: 4,        // 游戏开始时的初始订单数
};

// --- 墙贴纸数量范围 ---
export const WALL_STICKER_COUNT = {
    min: 3,
    max: 3,
};
