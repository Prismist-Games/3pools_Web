/**
 * tutorialScript.js — Day 1 新手教程的步骤定义。
 *
 * 设计意图：把 design_docs/tutorial_flow.md 的 spec 落到一份纯数据。
 * useGameLogic 里读取 TUTORIAL_STEPS[tutorialStepIndex] 拿当前步的
 * narrative（独白/对白）、overrides（脚本化覆盖）、completion（完成事件）。
 *
 * step shape：
 * {
 *     id: string,
 *     ui?: {
 *         intermission?: { text, autoAdvanceMs },
 *         fullScreenCard?: { emoji, title?, body, buttonText? },
 *         bottomDialog?: { speaker, emoji, lines: [] },
 *         postDialogModal?: { emoji, title?, body, buttonText? },
 *         coachmark?: { targetSelector, label },
 *     },
 *     overrides?: { ... },     // 见 design_docs/tutorial_flow.md 实装架构
 *     completion: { event, guard?, autoAdvanceMs? },
 *     onFail?: { heroLine, action },
 *     onWrongMarket?: { heroLine },
 *     onExit?: { heroLine },
 *     onComplete?: { heroLines?, action? },
 * }
 */

import {
    GRAINSTORE_WALL, SEAFOOD_WALL,
    GRAINSTORE_DRAWS, SEAFOOD_DRAWS,
    SEAFOOD_PEEK_QUALITY,
    GRAINSTORE_PROTECTED, SEAFOOD_PROTECTED,
} from './tutorialWalls';

const TUTORIAL_DISH_FRIDGE = [
    { id: 'dried_noodles', quality: 4 },
    { id: 'chicken_breast', quality: 4 },
    { id: 'cabbage', quality: 4 },
];

// 教程固定订单：消耗任一 贝Q2 + 任一 蟹Q2（玩家手上正好是扇贝Q2 + 梭子蟹Q2），奖励 菌菇Q3
// 字段结构对齐 useGameLogic.js 的 generateOrder 输出，使 BulletinBoard / OrderCard 能正常渲染。
const TUTORIAL_FIXED_ORDER = {
    id: 'tutorial_order',
    difficulty: 'medium',
    requirements: [
        { tag2: '贝',   categoryTag: '海鲜', icon: '🐚', name: '贝',   tags: ['海鲜', '贝'],   quality: 2, count: 1 },
        { tag2: '蟹',   categoryTag: '海鲜', icon: '🦀', name: '蟹',   tags: ['海鲜', '蟹'],   quality: 2, count: 1 },
    ],
    rewards: [
        { tag2: '菌菇', categoryTag: '蔬菜', icon: '🍄', name: '菌菇', tags: ['蔬菜', '菌菇'], quality: 3, score: 3, isOutOfGame: true },
    ],
    totalScore: 3,
};

// 默认 disableUI 列表：教程期间隐藏所有 debug 入口
const DEFAULT_DISABLE_UI = [
    'debug', 'editor', 'config_panel', 'kitchen_modal',
    'dispatch', 'sprite_preview', 'ai_cooking',
];

export const TUTORIAL_STEPS = [
    // —— 0：开场叙事 A · 老妈的餐厅 ——
    {
        id: 'opening_a',
        ui: {
            fullScreenCard: {
                emoji: '👩‍🍳🍽️',
                body: '从我记事起，妈妈就是这家餐厅的主厨。她对料理的执着，让这家不大的小店在街坊间小有名气。',
                buttonText: '继续',
            },
        },
        overrides: { disableUI: DEFAULT_DISABLE_UI },
        completion: { event: 'continue_clicked' },
    },
    // —— 1：开场叙事 B · 我的跟班 ——
    {
        id: 'opening_b',
        ui: {
            fullScreenCard: {
                emoji: '👩‍🍳🧑‍🍳',
                body: '你从小展现出对料理的天赋，跟着老妈打下手、学烹饪——总有一天，这家餐厅会交到你手上。',
                buttonText: '继续',
            },
        },
        overrides: { disableUI: DEFAULT_DISABLE_UI },
        completion: { event: 'continue_clicked' },
    },
    // —— 2：变故 · 接班 ——
    {
        id: 'opening_c',
        ui: {
            fullScreenCard: {
                emoji: '🏥🛏️',
                body: '可世事无常，老妈突然病倒了。\n尚未准备好的你，不得不匆匆接过她的大旗，承担起经营家族餐厅的任务。',
                buttonText: '上灶',
            },
        },
        overrides: { disableUI: DEFAULT_DISABLE_UI },
        completion: { event: 'continue_clicked' },
    },
    // —— 3：场景 1 · 第一次厨房 ——
    {
        id: 'scene_1_cooking',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: ['这道菜老妈做了多少遍，我闭着眼都记得料该怎么摆。——先开冰箱。'],
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial^="kitchen-slot-"]', label: '把食材放进对应槽位' },
            ],
        },
        onPlacementsReady: { heroLine: '——成了。这下就跟老妈做的一个味儿。' },
        overrides: {
            dish: 'moms_noodle_soup',
            fridgePreload: TUTORIAL_DISH_FRIDGE,
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
        },
        completion: {
            event: 'cook_result',
            guard: (ctx) => ctx.rating === '惊艳',
        },
        onFail: {
            heroLine: '嗯？……好像哪儿放错了。',
            action: 'reset_fridge_and_dish',
        },
    },
    // —— 4：场景 1.5 · Kitchen 切到海洋线条 ——
    {
        id: 'scene_1_5_dishcard',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: [
                    '……看吧，也没多难嘛。这家餐厅交给我，没问题。',
                    '……冰箱见底了。老妈平常是上哪儿采买来着？',
                ],
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial="start-day-button"]', label: '点击前往菜市场' },
            ],
        },
        overrides: {
            dish: 'ocean_threads',
            fridgePreload: [],
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
        },
        completion: { event: 'start_day_clicked' },
    },
    // —— 5：过场 · 半小时后 ——
    {
        id: 'intermission_market',
        ui: {
            intermission: { text: '【半小时后】', autoAdvanceMs: 1800 },
        },
        overrides: { disableUI: DEFAULT_DISABLE_UI },
        completion: { event: 'intermission_done' },
    },
    // —— 6：场景 2 · 粮食店 ——
    {
        id: 'scene_2_grainstore',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: [
                    '这就是老妈常念叨的菜市场？——人怎么这么多。',
                    '老板！鸡蛋面有没有？今晚的海洋线条等着下锅呢！',
                    { speaker: '老板', emoji: '👨', text: '自己找去！这边都忙不过来！' },
                ],
            },
            coachmarks: [
                { when: 'dialog_done',     targetSelector: '[data-tutorial="row-1"], [data-tutorial="col-1"]', label: '点击抽取这一行或这一列抽取鸡蛋面' },
                { when: 'first_draw_done', targetSelector: '[data-tutorial="basket-slot-0"]',                  label: '抽到的食材是这一行（或列）4 格里随机选 1 个；\n品质也是抽到之后才随机决定。' },
                { when: 'draws_done',      targetSelector: '[data-tutorial="basket-area"]',                    label: '相同品质的同名食材可以合成，尝试合成到三星挂面' },
                { when: 'synth_done',      targetSelector: '[data-tutorial="evacuate-button"]',                label: '点击此处穿过人潮' },
                { when: 'synth_done',      targetSelector: '[data-tutorial="doom-grid"]',                      label: '穿过人潮时运气不好的话，菜篮可能会被挤到' },
            ],
        },
        overrides: {
            forceMarket: 'grain_store',
            wallLayout: GRAINSTORE_WALL,
            selectableAxes: ['row_1', 'col_1'],
            drawResults: GRAINSTORE_DRAWS,
            protectedCells: GRAINSTORE_PROTECTED,
            safeDoomLanding: true,
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
            lockEvacuateUntilSynth: true,
        },
        completion: { event: 'doom_resolved_after_endturn' },
        onAllDrawsDone: { heroLine: '怎么只有挂面啊？算了，也能凑合凑合。' },
        onSynthDone: { heroLine: '好了，现在该穿过这拥挤的人潮了。' },
        onExit: { heroLine: '……抢个菜也这么费劲。' },
    },
    // —— 7：场景 3 · 市场 3 选 1 ——
    {
        id: 'scene_3_market_picker',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: ['算了。先去海鲜店碰碰运气——明虾说不定还剩几只。'],
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial="market-card-seafood_market"]', label: '去海鲜店' },
            ],
        },
        overrides: {
            forceCandidatesInclude: ['seafood_market'],
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
            lockReturnRestaurant: { reason: '要先去买明虾' },
        },
        completion: {
            event: 'wall_selected',
            guard: (ctx) => ctx.selectedMarketId === 'seafood_market',
        },
        onWrongMarket: { heroLine: '明虾得先买到手，别的回头再说。' },
    },
    // —— 8：场景 4 · 海鲜店 + 透视 ——
    {
        id: 'scene_4_seafood',
        ui: {
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial="tool-peek"]',                       label: '先用透视看品质' },
                { when: 'peek_used',   targetSelector: '[data-tutorial="row-1"], [data-tutorial="col-1"]',  label: '点击抽取这一行或这一列抽取明虾' },
            ],
        },
        overrides: {
            wallLayout: SEAFOOD_WALL,
            selectableAxes: ['row_1', 'col_1'],
            drawResults: SEAFOOD_DRAWS,
            protectedCells: SEAFOOD_PROTECTED,
            peekQualityMap: SEAFOOD_PEEK_QUALITY,
            toolsGranted: ['peek'],
            safeDoomLanding: true,
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
            lockEvacuateUntilDrawsExhausted: { reason: '把抽数用完再走' },
        },
        completion: { event: 'doom_resolved_after_endturn' },
    },
    // —— 9：场景 5 · 交换区登场 + 固定订单 ——
    {
        id: 'scene_5_bulletin',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: [
                    '面也没抢到，虾也没抢到。',
                    '……原来不止我一个没抢到想要的。',
                    '我手上这些，说不定正好是别人缺的。',
                ],
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial="order-submit-tutorial_order"]', label: '点击此处进行食材交换' },
            ],
        },
        overrides: {
            hideBulletin: false,
            fixedOrder: TUTORIAL_FIXED_ORDER,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
            lockReturnRestaurant: { reason: '先把订单提交了再走' },
            lockMarketCandidates: { reason: '先把订单提交了再走' },
        },
        completion: { event: 'order_submitted' },
    },
    // —— 10：场景 6 · 撤离 + 耐久归零规则 ——
    {
        id: 'scene_6_evacuate',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: ['天色不早了，回厨房吧——手头这点东西，也得凑一顿出来。'],
            },
            postDialogModal: {
                emoji: '❤️🧺',
                title: '提示',
                body: '菜篮耐久度（❤️）归零 = 失去菜篮内的所有食材、被迫结束一天。\n你的菜篮还结实，按理说还能够再抢点食材，但今天先到这里吧。',
                buttonText: '我知道了',
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial="return-restaurant"]', label: '回餐厅' },
            ],
        },
        overrides: {
            hideBulletin: false,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
            lockMarketCandidates: { reason: '今天先回餐厅' },
        },
        completion: { event: 'evacuate_clicked' },
    },
    // —— 11：场景 7 · 第二次厨房（任何评级通过）——
    {
        id: 'scene_7_cooking',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: [
                    '……菜谱上要的料，一样都没买着。',
                    '手上这几样……就凑合着来一顿吧。',
                ],
            },
            coachmarks: [
                { when: 'dialog_done', targetSelector: '[data-tutorial^="kitchen-slot-"]', label: '凑一顿出来\n没有完全匹配的食材，靠匹配度和品质也能拿分\n未标"必填"的槽位可以留空' },
            ],
        },
        overrides: {
            disableUI: DEFAULT_DISABLE_UI,
        },
        completion: { event: 'cook_result' },
        onComplete: {
            heroLines: ['……嗯，起码能吃。', '明天再来一遍。总能做得更像样些。'],
        },
    },
    // —— 12：Day 2 handoff · 人气值目标卡 ——
    {
        id: 'day2_handoff',
        ui: {
            fullScreenCard: {
                emoji: '❤️‍🔥🏪',
                title: '老妈的餐厅，交给你了',
                body: '从今天起，餐厅靠"人气值"维持。\n每天做菜的评价决定人气值的涨跌：惊艳 +2 / 优秀 +1 / 合格 0 / 勉强 -1 / 翻车 -2。\n人气值归零 = 失败。',
                buttonText: '开始第 2 天',
            },
        },
        completion: { event: 'handoff_done' },
        onComplete: { action: 'exit_tutorial_to_normal_play' },
    },
];
