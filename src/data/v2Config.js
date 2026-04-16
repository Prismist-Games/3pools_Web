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
    { id: 'hidden',      name: '神秘面纱', icon: '🎭', desc: '有些格子被面纱盖住。抽它们旁边的东西，面纱就会被掀开。', weight: 20, hiddenRatio: 0.3 },
    { id: 'multiplier',  name: '双倍惊喜', icon: '✨', desc: '有些格子上画着加倍标记——抽到它们，收获变成两份！', weight: 15, multiplierRatio: 0.2 },
    { id: 'alternating', name: '交叉问答', icon: '🔀', desc: '行和列不能连抽。抽完一行就得挑一列，反过来也一样。', weight: 20 },
    { id: 'center_rotate', name: '转盘中心', icon: '🎡', desc: '中间四个格子是个小转盘。你每抽一次，它就顺时针转一格。', weight: 15 },
    { id: 'conveyor',      name: '传送带',   icon: '➡️', desc: '其中一排像上了传送带——每抽一次就往前挪一格，走到尽头会从另一头绕回来。', weight: 15 },
    { id: 'savage_growth', name: '野蛮生长', icon: '🌱', desc: '抽到什么东西，它旁边四个格子就会跟着变成一模一样的。', weight: 15 },
    { id: 'blast_heal',    name: '爆裂愈合', icon: '💣', desc: '抽完之后，原地会冒出一颗新炸弹。越抽越多，越抽越危险！', weight: 15 },
    { id: 'mirror',        name: '镜花水月', icon: '🪞', desc: '左右两半像镜子里的倒影。抽一格，对面那格也一起到手。', weight: 15, goldOverride: 3 },
    { id: 'blessing_heal', name: '祝福愈合', icon: '🙏', desc: '抽完之后，原地会爆出一颗膨化格。膨化格周围的东西，抽到都会变多哦！', weight: 15 },
    { id: 'channel_flow',  name: '开渠引流', icon: '💧', desc: '抽到的格子只是被挖成水渠。回合结束时水从一条边涌入，沿水渠流过的格子才结算。', weight: 15 },
];

// --- 远征配置 ---
export const EXPEDITION_CONFIG = {
    expeditionCount: 3,     // 每局游戏远征次数
    scoreToWin: 30,         // 胜利所需总分
};

// --- 订单配置 ---
// 货架固定 5 槽，始终保持满员：完成订单会自动补 1（2 选 1），也可通过
// 刷新按钮主动替换。每回合自动补 1 的老机制已移除。
export const ORDER_CONFIG = {
    bulletinCapacity: 5,
    initialCount: 5,
};

// --- 刷新配置 ---
// 开局订单通过"5 次二选一"环节手动拼凑，不再预留免费刷新。
// 局中可通过 📋 订单格累积刷新次数，上限 5。
export const REFRESH_CONFIG = {
    initialCharges: 0,
    maxCharges: 5,
};

// --- 开局订单组建 ---
// 每场开始时展示今日菜品，然后给玩家 N 次二选一来填满货架。
export const SETUP_CONFIG = {
    pickCount: 5,
};

// --- 墙贴纸数量范围 ---
// 每面墙随机刷出 min..max 种贴纸，从全部 STICKER_TYPES 中均匀抽取。
export const WALL_STICKER_COUNT = {
    min: 3,
    max: 4,
};
