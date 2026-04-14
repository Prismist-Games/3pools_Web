/**
 * v3Config.js — v3 data foundations
 * Wall colors, wall functions, unlock templates, AP config, initial lives
 */

// --- 墙颜色配置 ---
// 每种颜色定义格子数量分布（总计 25 格）
// negative 拆分为：resolution(💀) + accumulation(⬛) + damage(💥)
export const WALL_COLORS = {
    brown: {
        id: 'brown',
        icon: '🟫',
        name: '棕色',
        system: '长期功能',
        stickerRange: [3, 4],
    },
    yellow: {
        id: 'yellow',
        icon: '🟨',
        name: '黄色',
        system: '金币经济',
        stickerRange: [3, 4],
    },
    green: {
        id: 'green',
        icon: '🟩',
        name: '绿色',
        system: '收集与订单',
        stickerRange: [3, 4],
    },
    red: {
        id: 'red',
        icon: '🟥',
        name: '红色',
        system: '生存与撤离',
        stickerRange: [3, 4],
    },
    blue: {
        id: 'blue',
        icon: '🟦',
        name: '蓝色',
        system: '导航与探索',
        stickerRange: [3, 4],
    },
};

// --- 墙功能定义 ---
// 每面墙随机分配一个对应颜色的功能
// type: 'long_term' | 'persistent' | 'instant'
export const WALL_FUNCTIONS = {
    brown: [
        { id: 'shop',       name: '杂货铺', desc: '在此墙上可花金币购买贴纸和刷新次数', type: 'wall_active', gridCells: {}, drawLimit: 3 },
        { id: 'pawnshop',   name: '典当行', desc: '在此墙上可将贴纸兑换为金币（1贴纸=1金币）', type: 'wall_active', gridCells: {}, drawLimit: 3 },
        { id: 'blackmarket', name: '黑市',  desc: '在此墙上可花金币直接购买局外物品', type: 'wall_active', gridCells: {}, drawLimit: 2 },
        { id: 'clinic',     name: '急救站', desc: '在此墙上可花3金币回复1点生命，限1次', type: 'wall_active', gridCells: {}, drawLimit: 3 },
    ],
    yellow: [
        { id: 'gold_rush_brown', name: '投资回报', desc: '选择棕色墙时+2金币', type: 'persistent', gridCells: {}, targetColor: 'brown', goldBonus: 2, drawLimit: 4 },
        { id: 'gold_rush_green', name: '绿野宝藏', desc: '选择绿色墙时+2金币', type: 'persistent', gridCells: {}, targetColor: 'green', goldBonus: 2, drawLimit: 4 },
        { id: 'gold_rush_red',   name: '火中取栗', desc: '选择红色墙时+2金币', type: 'persistent', gridCells: {}, targetColor: 'red', goldBonus: 2, drawLimit: 4 },
        { id: 'gold_rush_blue',  name: '蔚蓝红利', desc: '选择蓝色墙时+2金币', type: 'persistent', gridCells: {}, targetColor: 'blue', goldBonus: 2, drawLimit: 4 },
        { id: 'small_vault',     name: '小金库',    desc: '网格含4-5个金币格', type: 'instant', gridCells: { gold: [4, 5] }, drawLimit: 3 },
        { id: 'vault',           name: '金库',      desc: '网格含7-8个金币格', type: 'instant', gridCells: { gold: [7, 8] }, drawLimit: 5 },
        { id: 'big_vault',       name: '大金库',    desc: '网格含10-12个金币格', type: 'instant', gridCells: { gold: [10, 12] }, drawLimit: 7 },
    ],
    green: [
        { id: 'harvest_brown', name: '匠心传承', desc: '选择棕色墙时随机获得1个贴纸', type: 'persistent', gridCells: {}, targetColor: 'brown', stickerBonus: true, drawLimit: 5 },
        { id: 'harvest_yellow', name: '点石成金', desc: '选择黄色墙时随机获得1个贴纸', type: 'persistent', gridCells: {}, targetColor: 'yellow', stickerBonus: true, drawLimit: 5 },
        { id: 'harvest_red',   name: '浴火重生', desc: '选择红色墙时随机获得1个贴纸', type: 'persistent', gridCells: {}, targetColor: 'red', stickerBonus: true, drawLimit: 5 },
        { id: 'harvest_blue',  name: '海底拾贝', desc: '选择蓝色墙时随机获得1个贴纸', type: 'persistent', gridCells: {}, targetColor: 'blue', stickerBonus: true, drawLimit: 5 },
        { id: 'big_pocket',   name: '大口袋',   desc: '网格含3个背包扩容格', type: 'instant', gridCells: { backpack: [3, 3] }, drawLimit: 8 },
        { id: 'special_order', name: '特约订单', desc: '网格含2个订单格', type: 'instant', gridCells: { order: [2, 2] }, drawLimit: 4 },
        { id: 'premium_order', name: '优选订单', desc: '网格含3个订单格', type: 'instant', gridCells: { order: [3, 3] }, drawLimit: 5 },
    ],
    red: [
        { id: 'fast_pass',   name: '快速通道', desc: '网格含1个快速通道格', type: 'instant', gridCells: { fast_pass: [1, 1] }, drawLimit: 4 },
        { id: 'safety_net',  name: '安全网',   desc: '紧急撤离时可选1个物品免于丢失（可叠加）', type: 'persistent', gridCells: {}, drawLimit: 3 },
        { id: 'escape_hatch', name: '逃生口',  desc: '网格含2个撤离格', type: 'instant', gridCells: { evacuation: [2, 2] }, drawLimit: 3 },
        { id: 'shield',      name: '护盾',     desc: '网格含4个护盾格', type: 'instant', gridCells: { shield: [4, 4] }, drawLimit: 5 },
    ],
    blue: [
        { id: 'kaleidoscope',  name: '万花筒',   desc: '每3回合自动获得1次刷新次数', type: 'persistent', gridCells: {}, drawLimit: 4 },
        { id: 'spark',         name: '灵光',     desc: '网格含2个刷新格', type: 'instant', gridCells: { refresh: [2, 2] }, drawLimit: 3 },
        { id: 'inspiration',   name: '灵感',     desc: '网格含4个刷新格', type: 'instant', gridCells: { refresh: [4, 4] }, drawLimit: 4 },
        { id: 'pass',          name: '通行证',   desc: '网格含4个通行证格', type: 'instant', gridCells: { pass: [4, 4] }, drawLimit: 5 },
    ],
};

// --- 解锁条件模板 ---
// drawOnly: 仅需抽取次数
// drawAndGold: 需要抽取次数 + 金币
export const UNLOCK_TEMPLATES = {
    drawOnly: [
        { draws: 3 },
        { draws: 4 },
        { draws: 5 },
        { draws: 6 },
        { draws: 7 },
        { draws: 8 },
        { draws: 10 },
    ],
    drawAndGold: [
        { draws: 3, gold: 3 },
        { draws: 4, gold: 3 },
        { draws: 5, gold: 5 },
        { draws: 8, gold: 5 },
    ],
};

// --- Action Point (AP) 系统 ---
export const AP_CONFIG = {
    maxAP: 10,          // AP per turn
    drawCost: 0,        // AP cost per draw (free)
    flipCost: 3,        // AP cost to reveal a new pool (legacy — kept for backward compat)
    refreshCost: 2,     // AP cost to refresh the wall shop (replaces all 5 walls)
    takeCardCost: 2,    // AP cost to take a profit card from the display
    wallShopSize: 5,    // number of walls always visible in the shop
    displayCardCount: 2, // number of profit cards displayed in the shop
    maxRevealedPools: 5, // max visible pools at once (wall area) — kept for backward compat
    maxRevealedOrders: 3, // max visible orders at once (order area)
};

// --- v3 初始状态 ---
export const INITIAL_LIVES = 5;
