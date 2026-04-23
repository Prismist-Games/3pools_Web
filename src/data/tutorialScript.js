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

// 教程固定订单：消耗扇贝Q2 + 梭子蟹Q2，奖励香菇Q3
const TUTORIAL_FIXED_ORDER = {
    id: 'tutorial_order',
    difficulty: 'medium',  // 借现有 difficulty 视觉
    requirements: [
        { tag2: '贝', count: 1, quality: 2, ingredientIds: ['scallop'] },
        { tag2: '蟹', count: 1, quality: 2, ingredientIds: ['swimming_crab'] },
    ],
    rewards: [
        { tag2: '菌菇', count: 1, quality: 3, ingredientIds: ['shiitake'] },
    ],
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
                body: '老妈是某家餐厅的主厨。在她的坚持和对料理的追求下，餐厅经营得蒸蒸日上，在美食界小有名气。',
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
                title: '变故',
                body: '世事无常——老妈病倒了。\n尚未准备好的你，不得不匆匆接过她的大旗，承担起经营家族餐厅的任务。',
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
        },
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
                ],
            },
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
        },
        overrides: {
            forceCandidatesInclude: ['seafood_market'],
            hideBulletin: true,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
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
        ui: {},
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
        },
        completion: { event: 'doom_resolved_after_endturn' },
        onExit: { heroLine: '……一样都没抢到。这可怎么办啊。' },
    },
    // —— 9：场景 5 · 交换区登场 + 固定订单 ——
    {
        id: 'scene_5_bulletin',
        ui: {
            bottomDialog: {
                speaker: '主角', emoji: '🧑‍🍳',
                lines: [
                    '……原来不止我一个没抢到想要的。',
                    '我手上这些，说不定正好是别人缺的。',
                ],
            },
        },
        overrides: {
            hideBulletin: false,
            fixedOrder: TUTORIAL_FIXED_ORDER,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
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
                body: '菜篮耐久度（❤️）归零 = 菜篮丢失、被迫结束一天。\n今天你还有满血，可以放心做菜。',
                buttonText: '我知道了',
            },
        },
        overrides: {
            hideBulletin: false,
            disableUI: DEFAULT_DISABLE_UI,
            forbidIncomingOrders: true,
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
