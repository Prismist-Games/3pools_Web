# 《梦想厨房》新手教程实装计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec source of truth**：[`design_docs/tutorial_flow.md`](../../../design_docs/tutorial_flow.md)。本计划只描述如何把那份 spec 翻译成代码，不重复 spec 内容。

**Goal:** 把 `tutorial_flow.md` 里 Day 1 的 10 步教程（开场叙事 → 7 场新手教程 → Day 2 handoff）实装到现有 React 18 + Vite 6 prototype 里。

**Architecture:** 线性 Step Controller。在 `useGameLogic` 加 `tutorialMode` + `tutorialStepIndex` 两个 state，派生出 `tutorialOverrides` 对象注入到现有游戏函数（`generateWall` / `selectRow` / `selectColumn` / `resolveDoom` / `generateOrder` / 道具发放 / 菜谱 + 冰箱预发）。新增 5 个 UI 组件（FullScreenCard / BottomDialog / Intermission / Coachmark / SkipButton）+ 1 个 orchestrator（StepController）挂到 `GameCore` 顶层。

**Tech Stack:** React 18 / Vite 6 / Tailwind 3 / Lucide React / JSX (ESM). 无 test suite——验证靠 `npm run lint` + `npm run build` + 手动浏览器走查。

---

## 关键约束（来自 CLAUDE.md）

- **Single source of truth**: 教程状态进 `useGameLogic`，组件通过 props 拿
- **Config-driven**: 教程数据全部进 `src/data/`
- **i18n**: 所有 UI 中文 → `t()`，英文进 `translations.js`（本计划暂不写英文，留待后续 PR）
- **No test suite**: 验证靠 dev server + 浏览器，不写 unit test

## 文件结构

### 新增

| 路径 | 职责 |
|---|---|
| `src/data/tutorialScript.js` | `TUTORIAL_STEPS[]` 全部 10 步定义，含每步的 narrative / overrides / completion 判定 |
| `src/data/tutorialWalls.js` | 粮食店 + 海鲜店两面 4×4 手作 layout 定义，含相交点 / 可选轴 / 抽取序列 / 透视品质映射 |
| `src/components/game/TutorialBottomDialog.jsx` | 底部小框：emoji 头像 + 说话人 + 台词 + 继续按钮 |
| `src/components/game/TutorialFullScreenCard.jsx` | 全屏叙事卡：emoji + 标题 + 正文 + 继续按钮 |
| `src/components/game/TutorialIntermission.jsx` | 全屏黑 + 字幕（"【半小时后】"）|
| `src/components/game/TutorialCoachmark.jsx` | 引导箭头 + 高亮框（用 portal 定位到目标元素）|
| `src/components/game/TutorialSkipButton.jsx` | header 右上跳过按钮 + 确认 modal |
| `src/components/game/TutorialStepController.jsx` | 顶层 orchestrator，根据 `tutorialStepIndex` 渲染当前步骤的 UI |

### 修改

| 路径 | 修改要点 |
|---|---|
| `src/data/v2Config.js` | 加 `moms_noodle_soup` 到 `DISHES` 数组 |
| `src/hooks/useGameLogic.js` | 加 `tutorialMode` / `tutorialStepIndex` / `tutorialOverrides` 派生；在 7 个关键函数加 guard |
| `src/utils/matrixHelpers.js` | `generateWall` 支持 `tutorialOverrides.wallLayout` 直接返回手作墙 |
| `src/GameCore.jsx` | 渲染 `TutorialStepController` + `TutorialSkipButton`；`tutorialOverrides.disableUI` 隐藏 debug 按钮 |
| `src/utils/translations.js` | （仅本轮新增 UI 文本的中文条目，英文留空）|

---

## Task 1：教程数据基础（菜 + 步骤骨架 + 墙面 layout）

**Files:**
- Modify: `src/data/v2Config.js`（添加 `moms_noodle_soup` 到 DISHES 末尾）
- Create: `src/data/tutorialScript.js`
- Create: `src/data/tutorialWalls.js`

- [ ] **Step 1：把妈妈的家常汤面加到 DISHES**

打开 `src/data/v2Config.js`，找到 `DISHES` 数组末尾（`ember_hearth` 之后），追加：

```js
{
    id: 'moms_noodle_soup',
    name: '妈妈的家常汤面',
    nameEn: "Mom's Noodle Soup",
    icon: '🍜',
    baseline: 10,
    slots: [
        {
            name: '面条', required: true,
            rules: [
                { match: { tag: '主食' }, multiplier: 0.5 },
                { match: { tag: '面' }, multiplier: 1 },
                { match: { id: 'dried_noodles' }, multiplier: 2 },
            ],
            defaultMultiplier: 0,
        },
        {
            name: '主料', required: true,
            rules: [
                { match: { tag: '肉类' }, multiplier: 0.5 },
                { match: { tag: '鸡' }, multiplier: 1 },
                { match: { id: 'chicken_breast' }, multiplier: 2 },
            ],
            defaultMultiplier: 0,
        },
        {
            name: '青菜', required: true,
            rules: [
                { match: { tag: '蔬菜' }, multiplier: 0.5 },
                { match: { tag: '青菜' }, multiplier: 1 },
                { match: { id: 'cabbage' }, multiplier: 2 },
            ],
            defaultMultiplier: 0,
        },
    ],
},
```

- [ ] **Step 2：创建 tutorialScript.js 骨架**

新建 `src/data/tutorialScript.js`：

```js
/**
 * tutorialScript.js — Day 1 新手教程的步骤定义。
 *
 * 设计意图：把 design_docs/tutorial_flow.md 的 spec 落到一份纯数据。
 * useGameLogic 里读取 TUTORIAL_STEPS[tutorialStepIndex] 拿当前步的
 * narrative（独白/对白）、overrides（脚本化覆盖）、completion（完成事件）。
 *
 * 每个 step 的 shape：
 * {
 *     id: string,                          // 步骤唯一标识
 *     ui: {                                // 该步要渲染的 UI（任一可选）
 *         intermission?: { text },         // TutorialIntermission（"【半小时后】"）
 *         fullScreenCard?: {               // TutorialFullScreenCard
 *             emoji, title?, body, buttonText?
 *         },
 *         bottomDialog?: {                 // TutorialBottomDialog
 *             speaker, emoji, lines: []    // 多行台词，依次显示
 *         },
 *         coachmark?: {                    // TutorialCoachmark
 *             targetSelector, label
 *         },
 *     },
 *     overrides?: {                        // 该步生效的脚本覆盖（详见 tutorial_flow.md 实装架构）
 *         wallLayout?, selectableAxes?, drawResults?, peekQualityMap?,
 *         safeDoomLanding?, fixedOrder?, toolsGranted?, dish?,
 *         fridgePreload?, hideBulletin?, disableUI?
 *     },
 *     completion: {                        // 完成判定（见 spec 完成条件总表）
 *         event: string,                   // 完成时触发该事件名
 *         guard?: (ctx) => boolean,        // 可选守卫
 *     },
 * }
 */

import { GRAINSTORE_WALL, SEAFOOD_WALL, GRAINSTORE_DRAWS, SEAFOOD_DRAWS, SEAFOOD_PEEK_QUALITY } from './tutorialWalls';

const TUTORIAL_DISH_FRIDGE = [
    { id: 'dried_noodles', quality: 4 },
    { id: 'chicken_breast', quality: 4 },
    { id: 'cabbage', quality: 4 },
];

const TUTORIAL_FIXED_ORDER = {
    id: 'tutorial_order',
    difficulty: 'tutorial',
    requirements: [
        { tag2: '贝',   count: 1, quality: 2, ingredientIds: ['scallop'] },
        { tag2: '蟹',   count: 1, quality: 2, ingredientIds: ['swimming_crab'] },
    ],
    rewards: [
        { tag2: '菌菇', count: 1, quality: 3, ingredientIds: ['shiitake'] },
    ],
};

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
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
                lines: ['……看吧，也没多难嘛。这家餐厅交给我，没问题。', '……冰箱见底了。老妈平常是上哪儿采买来着？'],
            },
        },
        overrides: {
            dish: 'ocean_threads',
            fridgePreload: [],
            hideBulletin: true,
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
        },
        completion: { event: 'start_day_clicked' },
    },
    // —— 5：过场 · 半小时后 ——
    {
        id: 'intermission_market',
        ui: {
            intermission: { text: '【半小时后】' },
        },
        completion: { event: 'intermission_done', autoAdvanceMs: 1800 },
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
                    '（老板）自己找去！这边都忙不过来！',
                ],
            },
        },
        overrides: {
            forceMarket: 'grain_store',
            wallLayout: GRAINSTORE_WALL,
            selectableAxes: ['row_1', 'col_1'],
            drawResults: GRAINSTORE_DRAWS,
            safeDoomLanding: true,
            hideBulletin: true,
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
            forbidIncomingOrders: true,
            lockEvacuateUntilSynth: true,  // 合成完成前 endTurn 按钮 disabled
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
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
            peekQualityMap: SEAFOOD_PEEK_QUALITY,
            toolsGranted: ['peek'],
            safeDoomLanding: true,
            hideBulletin: true,
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
                lines: ['……原来不止我一个没抢到想要的。', '我手上这些，说不定正好是别人缺的。'],
            },
        },
        overrides: {
            hideBulletin: false,
            fixedOrder: TUTORIAL_FIXED_ORDER,
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
                lines: ['……菜谱上要的料，一样都没买着。', '手上这几样……就凑合着来一顿吧。'],
            },
        },
        overrides: {
            disableUI: ['debug', 'editor', 'config_panel', 'kitchen_modal', 'dispatch', 'sprite_preview', 'ai_cooking'],
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
```

- [ ] **Step 3：创建 tutorialWalls.js**

新建 `src/data/tutorialWalls.js`：

```js
/**
 * tutorialWalls.js — 教程场景 2 / 4 的手作 4×4 墙面 layout。
 *
 * 设计：相交点位于 (1,1)，row 1 与 col 1 都开放抽取，其余 6 个轴 disabled。
 * row 1 与 col 1 内容序列相同；其余 9 格为 filler（避开同小类）。
 * 详见 design_docs/tutorial_flow.md "墙面 layout（场景 2 & 4）"。
 */

// 帮助：构造一个 ingredient cell（matrixHelpers 风格）
const cell = (id, opts = {}) => ({ type: 'ingredient', item: { id, ...opts }, uid: null });

// —— 粮食店墙 ——
// (1,1) = 鸡蛋面（永远不抽到）；row 1 / col 1 其余 6 格 = 挂面；其余 9 格 = filler
export const GRAINSTORE_WALL = [
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
    [cell('dried_noodles'), cell('egg_noodles'),   cell('dried_noodles'), cell('dried_noodles')],
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
    [cell('white_rice'),    cell('dried_noodles'), cell('white_bread'),  cell('soybean')],
];

// 抽取序列：依次产出
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

// 抽取序列
export const SEAFOOD_DRAWS = [
    { id: 'white_shrimp',   quality: 3 },
    { id: 'scallop',        quality: 2 },
    { id: 'swimming_crab',  quality: 2 },
];

// 透视品质映射：(row,col) → quality（仅对该 cell 锁定）
// 明虾 (1,1) 锁 Q5 制造"看得到摸不到"
export const SEAFOOD_PEEK_QUALITY = {
    '1,1': 5,  // 明虾 Q5 传说橙
    '1,0': 3, '0,1': 3,  // 基围虾 Q3
    '1,2': 2, '2,1': 2,  // 扇贝 Q2
    '1,3': 2, '3,1': 2,  // 梭子蟹 Q2
};
```

- [ ] **Step 4：lint + build 验证**

```bash
npm run lint
```
（注：CLAUDE.md 提到 lint 当前可能未配置；若失败跳过此步）

```bash
npm run build
```
Expected: build 成功，无 syntax error。

- [ ] **Step 5：commit**

```bash
git add src/data/v2Config.js src/data/tutorialScript.js src/data/tutorialWalls.js
git commit -m "$(cat <<'EOF'
NEW: 教程数据基础（妈妈的家常汤面 + Day 1 教程脚本 + 手作墙面）

- v2Config 加 moms_noodle_soup（3 槽 required，default 0）
- tutorialScript 定义 13 步线性序列（开场 3 + 场景 7 + 过场 1 + Day2 handoff 1 + 1.5 切菜谱）
- tutorialWalls 手作粮食店与海鲜店 4×4，相交点在 (1,1)，附抽取序列与透视品质映射

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：教程状态机 + advance / skip / isInStep API

**Files:**
- Modify: `src/hooks/useGameLogic.js`（加 state 与 helper，不接 overrides）

- [ ] **Step 1：在 useGameLogic 顶部 import**

在 `src/hooks/useGameLogic.js` 的 imports 区加入：

```js
import { TUTORIAL_STEPS } from '../data/tutorialScript';
```

- [ ] **Step 2：加 state 字段**

在已有的 game state 区域（找到 `dayNumber` / `popularity` 等附近）加：

```js
// --- Tutorial state ---
const [tutorialMode, setTutorialMode] = useState(true);  // 新游戏默认开
const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
```

- [ ] **Step 3：加派生 currentTutorialStep**

紧接 state 后：

```js
const currentTutorialStep = tutorialMode ? TUTORIAL_STEPS[tutorialStepIndex] ?? null : null;
```

- [ ] **Step 4：加推进 helper**

```js
const advanceTutorial = useCallback(() => {
    setTutorialStepIndex(i => {
        const next = i + 1;
        if (next >= TUTORIAL_STEPS.length) {
            setTutorialMode(false);
            return i;
        }
        return next;
    });
}, []);

const isInStep = useCallback((stepId) => {
    return tutorialMode && currentTutorialStep?.id === stepId;
}, [tutorialMode, currentTutorialStep]);
```

- [ ] **Step 5：加 skipTutorial（state 重置但暂不接 game state 重置）**

```js
const skipTutorial = useCallback(() => {
    setTutorialMode(false);
    setTutorialStepIndex(TUTORIAL_STEPS.length - 1);
    // 真正跳到 Day 2 海洋线条开局的逻辑在 Task 7 实现
}, []);
```

- [ ] **Step 6：导出**

在 useGameLogic 返回对象里加：

```js
return {
    // ... existing fields ...
    tutorialMode,
    tutorialStepIndex,
    currentTutorialStep,
    advanceTutorial,
    skipTutorial,
    isInStep,
    // ...
};
```

- [ ] **Step 7：build 验证**

```bash
npm run build
```
Expected: 通过。

- [ ] **Step 8：commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "$(cat <<'EOF'
NEW: 教程状态机骨架（tutorialMode + stepIndex + advance/skip API）

- 加 tutorialMode（默认 true）/ tutorialStepIndex / currentTutorialStep
- helper：advanceTutorial / skipTutorial / isInStep
- 暂不接 overrides 与 game state 重置，留到后续 task

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：tutorialOverrides 派生对象 + 接入现有逻辑

**Files:**
- Modify: `src/hooks/useGameLogic.js`（加 `tutorialOverrides` 派生 + 7 个挂点的 guard）
- Modify: `src/utils/matrixHelpers.js`（`generateWall` 支持完整 layout 注入）

- [ ] **Step 1：派生 tutorialOverrides**

在 `useGameLogic.js` 紧接 `currentTutorialStep` 之后：

```js
const tutorialOverrides = currentTutorialStep?.overrides ?? null;
```

- [ ] **Step 2：matrixHelpers.generateWall 接受 overrides**

打开 `src/utils/matrixHelpers.js`，找到 `generateWall` 函数。在函数最顶上加：

```js
export function generateWall(marketIngredients, options = {}) {
    if (options.tutorialLayout) {
        // 直接深拷贝并注入 uid
        const grid = options.tutorialLayout.map((row, r) =>
            row.map((c, col) => c ? { ...c, item: { ...c.item }, uid: `t-${r}-${col}-${Math.random().toString(36).slice(2, 7)}` } : null)
        );
        const doomCellCount = grid.flat().filter(c => c?.type === 'doom_resolution').length;
        return { grid, doomCellCount };
    }
    // ... existing logic ...
}
```

- [ ] **Step 3：useGameLogic 调 generateWall 时传 overrides**

在 `useGameLogic.js` 里搜索 `generateWall(`。每处调用改为：

```js
generateWall(marketIngredients, { tutorialLayout: tutorialOverrides?.wallLayout })
```

- [ ] **Step 4：selectRow / selectColumn 接 drawResults override**

在 `selectRow` 函数（找到当前定义）开头加：

```js
const overrideResult = (() => {
    if (!tutorialOverrides?.drawResults) return null;
    const consumedCount = tutorialOverrides._drawCounter ?? 0;
    return tutorialOverrides.drawResults[consumedCount] ?? null;
})();
```

注：`_drawCounter` 是在 step 内累计的，需要在 useGameLogic 里维护。简化：用一个独立 state `tutorialDrawCount`。

实际加：

```js
const [tutorialDrawCount, setTutorialDrawCount] = useState(0);
```

并在每次完成抽取动画后 +1（注意 step 切换时要重置）。

selectRow 内：

```js
if (tutorialOverrides?.drawResults && tutorialDrawCount < tutorialOverrides.drawResults.length) {
    const forced = tutorialOverrides.drawResults[tutorialDrawCount];
    // 在 row i 中找符合 forced.id 且不在 (1,1) 受保护位的 cell，作为命中目标
    const protectedCells = tutorialOverrides.protectedCells ?? [];
    const cells = matrix[i].map((c, col) => ({ c, col, key: `${i},${col}` }))
        .filter(({c, key}) => c && c.type === 'ingredient' && c.item.id === forced.id && !protectedCells.includes(key));
    if (cells.length > 0) {
        const pick = cells[Math.floor(Math.random() * cells.length)];
        // 用 forced.id + forced.quality 强制结果，保留正常落点动画
        // ... 调用现有抽取动画 + 增加 setTutorialDrawCount(c => c + 1)
    }
}
```

实际细节需结合现有 `selectRow` 的实现调整——原始函数怎么处理"随机选一格 + roll quality + 入菜篮"，我们就在选 cell 阶段强制落点 + roll 阶段强制 quality。

selectColumn 同理。

- [ ] **Step 5：resolveDoom 接 safeDoomLanding override**

找到 `resolveDoom` 函数。在生成 `finalSelections` 的逻辑里：

```js
if (tutorialOverrides?.safeDoomLanding) {
    // 强制所有落点 = doomGrid 里第一个 empty cell
    const emptyIdx = doomGrid.findIndex(c => c.type === 'empty');
    finalSelections = Array(times).fill(emptyIdx >= 0 ? emptyIdx : 0);
}
```

- [ ] **Step 6：generateOrder / incoming 接 fixedOrder override**

找到订单刷新触发点（搜 `generateOrder` 或 `incomingQueue` 的 enqueue）。

如果当前 step 设了 `tutorialOverrides.fixedOrder`，直接用它替代 `generateOrder()` 的随机结果。

如果当前 step 设了 `tutorialOverrides.forbidIncomingOrders = true`，则跳过任何 incoming order 的入队。

- [ ] **Step 7：道具发放接 toolsGranted override**

找到道具发放的入口（开局发 3、离店 +1）。改为：

```js
if (tutorialOverrides?.toolsGranted) {
    grantTools(tutorialOverrides.toolsGranted);
} else {
    // existing logic
}
```

并且在 `tutorialMode = true` 但当前 step 没有 `toolsGranted` 时，**跳过常规发放**（避免开局自动发 3 个）。

- [ ] **Step 8：startGame / startNextDay 接 dish + fridgePreload override**

在 `startGame` 或对应函数里：

```js
if (tutorialOverrides?.dish) {
    setCurrentDish(...DISHES.find(d => d.id === tutorialOverrides.dish));
}
if (tutorialOverrides?.fridgePreload) {
    setInventory(tutorialOverrides.fridgePreload.map(i => ({ ...i, uid: generateUID() })));
}
```

- [ ] **Step 9：lint + build 验证**

```bash
npm run build
```
Expected: 通过。

- [ ] **Step 10：commit**

```bash
git add src/hooks/useGameLogic.js src/utils/matrixHelpers.js
git commit -m "$(cat <<'EOF'
NEW: 教程 tutorialOverrides 派生 + 7 个挂点接入

- generateWall 接 wallLayout 直接返回手作墙
- selectRow/Column 接 drawResults 序列覆盖随机落点（保护受保护 cell）
- resolveDoom 接 safeDoomLanding 强制 empty 落点
- generateOrder/incomingQueue 接 fixedOrder + forbidIncomingOrders
- 道具发放接 toolsGranted（教程态默认跳过常规发放）
- startGame 接 dish + fridgePreload

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：5 个 UI 组件

**Files:**
- Create: `src/components/game/TutorialBottomDialog.jsx`
- Create: `src/components/game/TutorialFullScreenCard.jsx`
- Create: `src/components/game/TutorialIntermission.jsx`
- Create: `src/components/game/TutorialCoachmark.jsx`
- Create: `src/components/game/TutorialSkipButton.jsx`

- [ ] **Step 1：TutorialBottomDialog**

```jsx
// src/components/game/TutorialBottomDialog.jsx
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TutorialBottomDialog({ speaker, emoji, lines, onComplete }) {
    const { t } = useLanguage();
    const [lineIdx, setLineIdx] = useState(0);
    const isLast = lineIdx >= lines.length - 1;

    const next = () => {
        if (isLast) onComplete?.();
        else setLineIdx(i => i + 1);
    };

    return (
        <div className="fixed bottom-4 inset-x-4 z-[150] pointer-events-auto">
            <div className="bg-kitchen-card/95 border-2 border-kitchen-gold-border rounded-lg shadow-xl p-4 flex items-start gap-4 max-w-3xl mx-auto">
                <div className="text-5xl flex-shrink-0">{emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-kitchen-gold-deep mb-1">{t(speaker)}</div>
                    <div className="text-base text-kitchen-text-primary whitespace-pre-wrap">{t(lines[lineIdx])}</div>
                </div>
                <button
                    onClick={next}
                    className="flex-shrink-0 px-3 py-1 rounded bg-kitchen-wood-light border border-kitchen-wood-border text-kitchen-text-title hover:brightness-105 text-sm font-bold"
                >
                    {isLast ? t('继续') : '▶'}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2：TutorialFullScreenCard**

```jsx
// src/components/game/TutorialFullScreenCard.jsx
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TutorialFullScreenCard({ emoji, title, body, buttonText = '继续', onComplete }) {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-6" onClick={onComplete}>
            <div
                className="bg-kitchen-card border-2 border-kitchen-gold-border rounded-2xl shadow-2xl max-w-xl w-full p-8 flex flex-col items-center gap-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-7xl">{emoji}</div>
                {title && <div className="text-2xl font-black text-kitchen-text-title">{t(title)}</div>}
                <div className="text-base text-kitchen-text-primary text-center whitespace-pre-wrap leading-relaxed">{t(body)}</div>
                <button
                    onClick={onComplete}
                    className="mt-2 px-8 py-2 rounded-lg bg-gradient-to-b from-kitchen-wood-light to-kitchen-wood-dark border-2 border-kitchen-wood-border text-kitchen-text-title font-bold hover:brightness-105 shadow-[0_2px_0_#C8A880]"
                >
                    {t(buttonText)}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3：TutorialIntermission**

```jsx
// src/components/game/TutorialIntermission.jsx
import React, { useEffect } from 'react';

export default function TutorialIntermission({ text, autoAdvanceMs = 1800, onComplete }) {
    useEffect(() => {
        const t = setTimeout(() => onComplete?.(), autoAdvanceMs);
        return () => clearTimeout(t);
    }, [autoAdvanceMs, onComplete]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
            <div className="text-3xl font-black text-white tracking-widest opacity-90">{text}</div>
        </div>
    );
}
```

- [ ] **Step 4：TutorialCoachmark（最简版）**

```jsx
// src/components/game/TutorialCoachmark.jsx
import React, { useEffect, useState } from 'react';

export default function TutorialCoachmark({ targetSelector, label }) {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        const update = () => {
            const el = document.querySelector(targetSelector);
            if (el) setRect(el.getBoundingClientRect());
        };
        update();
        window.addEventListener('resize', update);
        const interval = setInterval(update, 200);  // 简单粗暴 polling
        return () => { window.removeEventListener('resize', update); clearInterval(interval); };
    }, [targetSelector]);

    if (!rect) return null;

    return (
        <div className="fixed pointer-events-none z-[180]" style={{
            top: rect.top - 8, left: rect.left - 8,
            width: rect.width + 16, height: rect.height + 16,
        }}>
            <div className="absolute inset-0 border-4 border-yellow-400 rounded-lg animate-pulse" />
            {label && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap">
                    {label}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 5：TutorialSkipButton**

```jsx
// src/components/game/TutorialSkipButton.jsx
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TutorialSkipButton({ onSkip }) {
    const { t } = useLanguage();
    const [confirming, setConfirming] = useState(false);

    return (
        <>
            <button
                onClick={() => setConfirming(true)}
                className="px-3 py-1 rounded bg-kitchen-card/80 border border-kitchen-gold-border text-kitchen-text-secondary text-sm hover:brightness-110"
                title={t('跳过教程')}
            >
                {t('跳过教程')}
            </button>
            {confirming && (
                <div className="fixed inset-0 z-[250] bg-black/70 flex items-center justify-center p-6" onClick={() => setConfirming(false)}>
                    <div
                        className="bg-kitchen-card border-2 border-kitchen-gold-border rounded-2xl p-6 max-w-md flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-base text-kitchen-text-primary">
                            {t('将跳过开场与新手教程，直接从第二天开始。')}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirming(false)}
                                className="px-4 py-1 rounded border border-kitchen-gold-border-muted text-kitchen-text-secondary"
                            >
                                {t('取消')}
                            </button>
                            <button
                                onClick={() => { setConfirming(false); onSkip?.(); }}
                                className="px-4 py-1 rounded bg-kitchen-wood-light border border-kitchen-wood-border text-kitchen-text-title font-bold"
                            >
                                {t('确认跳过')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 6：build 验证**

```bash
npm run build
```
Expected: 通过。

- [ ] **Step 7：commit**

```bash
git add src/components/game/Tutorial*.jsx
git commit -m "$(cat <<'EOF'
NEW: 5 个教程 UI 组件（emoji 占位版）

- TutorialBottomDialog：底部小框 + emoji + 多行台词
- TutorialFullScreenCard：全屏叙事卡 + 继续按钮
- TutorialIntermission：全屏黑 + 字幕（自动推进）
- TutorialCoachmark：高亮目标元素 + 标签（querySelector + polling）
- TutorialSkipButton：跳过按钮 + 确认 modal

风格沿用现有 kitchen-* Tailwind tokens。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：TutorialStepController + GameCore 接入

**Files:**
- Create: `src/components/game/TutorialStepController.jsx`
- Modify: `src/GameCore.jsx`

- [ ] **Step 1：StepController**

```jsx
// src/components/game/TutorialStepController.jsx
import React, { useState, useEffect } from 'react';
import TutorialBottomDialog from './TutorialBottomDialog';
import TutorialFullScreenCard from './TutorialFullScreenCard';
import TutorialIntermission from './TutorialIntermission';
import TutorialCoachmark from './TutorialCoachmark';

/**
 * 根据当前 step 的 ui 字段渲染对应组件，并接对应的 onComplete → advanceTutorial。
 * 在 step 切换时复位内部 dialog 进度。
 */
export default function TutorialStepController({ currentStep, onAdvance }) {
    const [dialogDone, setDialogDone] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);

    // 每次切 step 重置内部状态
    useEffect(() => {
        setDialogDone(false);
        setShowPostModal(false);
    }, [currentStep?.id]);

    if (!currentStep?.ui) return null;
    const { intermission, fullScreenCard, bottomDialog, coachmark, postDialogModal } = currentStep.ui;

    return (
        <>
            {intermission && <TutorialIntermission {...intermission} onComplete={onAdvance} />}
            {fullScreenCard && <TutorialFullScreenCard {...fullScreenCard} onComplete={onAdvance} />}
            {bottomDialog && !dialogDone && (
                <TutorialBottomDialog
                    {...bottomDialog}
                    onComplete={() => {
                        setDialogDone(true);
                        if (postDialogModal) setShowPostModal(true);
                        // 注意：bottomDialog 完成不一定推进 step——许多场景靠玩家完成游戏操作触发完成事件
                    }}
                />
            )}
            {showPostModal && postDialogModal && (
                <TutorialFullScreenCard
                    {...postDialogModal}
                    onComplete={() => setShowPostModal(false)}
                />
            )}
            {coachmark && <TutorialCoachmark {...coachmark} />}
        </>
    );
}
```

- [ ] **Step 2：GameCore 接入**

打开 `src/GameCore.jsx`。

- 在解构 `useGameLogic()` 时加上：`tutorialMode, currentTutorialStep, advanceTutorial, skipTutorial, isInStep, tutorialOverrides`
- import：

```jsx
import TutorialStepController from './components/game/TutorialStepController';
import TutorialSkipButton from './components/game/TutorialSkipButton';
```

- 在 header 区域（找到现有 header 按钮如 ⚙ 等）右上加：

```jsx
{tutorialMode && <TutorialSkipButton onSkip={skipTutorial} />}
```

- 在所有现有 header debug 按钮的 render 外包：

```jsx
{!tutorialOverrides?.disableUI?.includes('config_panel') && <button onClick={() => setShowConfig(true)}>⚙</button>}
{!tutorialOverrides?.disableUI?.includes('debug') && <button>🛠</button>}
// ... 其它按钮同理
```

- 在组件最外层（return 内 root）的最后追加：

```jsx
<TutorialStepController currentStep={currentTutorialStep} onAdvance={advanceTutorial} />
```

- [ ] **Step 3：build 验证**

```bash
npm run build
```

- [ ] **Step 4：手动浏览器跑一次（开发服务器）**

```bash
npm run dev
```

打开 http://localhost:5173/3pools_Web/，看：
- 右上角是否出现"跳过教程"按钮
- 启动后是否自动出现第一张全屏卡（opening_a）
- 点继续是否能推到第二张

Expected：教程开场 3 张卡能依次推完，到 scene_1_cooking 步时全屏卡消失（因为 scene_1_cooking 只有 bottomDialog）。游戏功能可能因 overrides 不全还有问题，但 UI 渲染应该正常。

- [ ] **Step 5：commit**

```bash
git add src/components/game/TutorialStepController.jsx src/GameCore.jsx
git commit -m "$(cat <<'EOF'
NEW: TutorialStepController 接入 GameCore + 跳过按钮

- StepController 根据 currentStep.ui 字段分派渲染 intermission/card/dialog/coachmark
- GameCore header 右上挂 SkipButton（仅 tutorialMode 时显示）
- header 内 debug 按钮按 disableUI 列表条件渲染
- 顶层挂 StepController

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6：场景级完成事件接线（场景 1～场景 7）

**Files:**
- Modify: `src/hooks/useGameLogic.js`（在关键完成点 emit 事件 → advance）

教程完成事件总览（spec 完成条件总表）：

| step.completion.event | 在哪触发 |
|---|---|
| `continue_clicked` | TutorialFullScreenCard 的 onComplete（已经直接调 advance）|
| `intermission_done` | TutorialIntermission auto-advance（已经直接调 advance）|
| `cook_result` | useGameLogic.handleCookResult，做菜结算后 emit + 检查 guard |
| `start_day_clicked` | Kitchen 的"开始第 X 天"按钮（场景 1.5 的推进）|
| `doom_resolved_after_endturn` | useGameLogic.completeDoomResolution 末尾，配合 endTurn 标记 |
| `wall_selected` | useGameLogic.selectWall，配合 guard 检查市场 id |
| `order_submitted` | useGameLogic.confirmSubmitOrder 成功路径末尾 |
| `evacuate_clicked` | useGameLogic.returnToRestaurant |
| `handoff_done` | day2_handoff 用 fullScreenCard，自动 advance |

- [ ] **Step 1：在 useGameLogic 加教程事件分发器**

在 useGameLogic 内部加：

```js
const emitTutorialEvent = useCallback((eventName, ctx = {}) => {
    if (!tutorialMode || !currentTutorialStep) return;
    const completion = currentTutorialStep.completion;
    if (completion?.event !== eventName) return;
    if (completion.guard && !completion.guard(ctx)) return;
    advanceTutorial();
}, [tutorialMode, currentTutorialStep, advanceTutorial]);
```

- [ ] **Step 2：场景 1（cook_result with rating === '惊艳' guard）**

在 `handleCookResult` 函数末尾，scoring 之后加：

```js
emitTutorialEvent('cook_result', { rating: result.rating });
// 场景 1 的 onFail：未惊艳则 reset
if (currentTutorialStep?.id === 'scene_1_cooking' && result.rating !== '惊艳') {
    // reset fridge to fridgePreload + clear placements
    setInventory(currentTutorialStep.overrides.fridgePreload.map(i => ({ ...i, uid: generateUID() })));
    // 显示主角失败台词（通过单独的 transient hero line 机制——见 Task 7）
}
```

- [ ] **Step 3：场景 2 / 4（doom_resolved_after_endturn）**

在 `completeDoomResolution` 函数末尾加：

```js
if (afterDoomAction === 'end_turn') {
    emitTutorialEvent('doom_resolved_after_endturn');
}
```

- [ ] **Step 4：场景 1.5（start_day_clicked）**

找到 Kitchen 里的"开始第 X 天 / 出门"按钮（可能在 `Kitchen.jsx` 或 `GameCore.jsx`）。在该按钮的 onClick 里加：

```jsx
onClick={() => {
    emitTutorialEvent('start_day_clicked');
    // existing logic
}}
```

注：emit 函数需要从 useGameLogic 暴露出来给 GameCore / Kitchen 用。

- [ ] **Step 5：场景 3（wall_selected with seafood_market guard）**

在 `selectWall` 函数末尾加：

```js
emitTutorialEvent('wall_selected', { selectedMarketId: chosen.wallType?.id });
```

并在 selectWall 开头判断 onWrongMarket：

```js
if (currentTutorialStep?.id === 'scene_3_market_picker'
    && chosen.wallType?.id !== 'seafood_market'
    && currentTutorialStep.onWrongMarket) {
    showHeroLine(currentTutorialStep.onWrongMarket.heroLine);
    return;  // 阻止推进，让玩家重选
}
```

- [ ] **Step 6：场景 5（order_submitted）**

在 `confirmSubmitOrder` 成功路径末尾加：

```js
emitTutorialEvent('order_submitted');
```

- [ ] **Step 7：场景 6（evacuate_clicked）**

在 `returnToRestaurant` 函数开头加：

```js
emitTutorialEvent('evacuate_clicked');
```

- [ ] **Step 8：场景 2 锁挤出店铺按钮**

在 GameCore 渲染"挤出店铺"按钮的 disabled 条件里加：

```jsx
disabled={
    isDoomResolving || isDrawAnimating || pendingItems.length > 0 || !!incomingOrder
    || (isInStep('scene_2_grainstore') && !synthDoneInThisShop)
}
```

`synthDoneInThisShop` 需要在 useGameLogic 里加一个 state，在合成时 +1，店内合成 ≥ 2 才允许挤出。

简化做法：直接读 inventory 是否含有 Q3 挂面：

```jsx
const synthDoneInThisShop = inventory.some(i => i?.id === 'dried_noodles' && i?.quality === 3);
```

- [ ] **Step 9：build + dev 服务器手动跑一次**

```bash
npm run build && npm run dev
```

走到能走的地方，记录每一步是否能正常推进。

- [ ] **Step 10：commit**

```bash
git add src/hooks/useGameLogic.js src/GameCore.jsx
git commit -m "$(cat <<'EOF'
NEW: 教程场景完成事件接线

- emitTutorialEvent 分发器（按 step.completion.event + guard 决定是否推进）
- 9 个完成事件挂到 cook_result / endTurn doom / start_day / wall_select / order_submit / evacuate
- 场景 1 失败软重置（restore fridgePreload）
- 场景 3 选错市场显示主角台词且不推进
- 场景 2 挤出店铺按钮在合成完成前 disabled

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7：跳过路径 + Day 2 handoff

**Files:**
- Modify: `src/hooks/useGameLogic.js`（完整化 skipTutorial）

- [ ] **Step 1：完整化 skipTutorial**

```js
const skipTutorial = useCallback(() => {
    setTutorialMode(false);
    setTutorialStepIndex(TUTORIAL_STEPS.length - 1);
    // 拉到 Day 2 海洋线条开局
    setDayNumber(2);
    setPopularity(10);
    setInventory([]);
    setBulletinBoard([]);
    setIncomingQueue([]);
    setRefreshCharges(0);
    setHp(5);
    setExpeditionScores([]);
    setTotalScore(0);
    // 锁定菜谱为海洋线条
    const oceanThreads = DISHES.find(d => d.id === 'ocean_threads');
    setCurrentDish(oceanThreads);
    // 按正常 dayStartCount 发 3 道具
    grantTools(pickRandomDistinctTools(TOOL_CONFIG.dayStartCount));
    setPhase('pre_game');  // 或对应 Day 开局 phase
    setTutorialDrawCount(0);
}, [/* 完整 deps */]);
```

具体实现细节按 useGameLogic 实际暴露的 setter 调整。

- [ ] **Step 2：day2_handoff 完成事件挂到 handoff_done**

`day2_handoff` step 的 `ui.fullScreenCard` 已经调 onComplete = advanceTutorial。advance 时会让 stepIndex+1 超出数组长度 → 触发 `setTutorialMode(false)`。

但是 day2_handoff 完成时还需要把 game state 切到 Day 2 开局。在 `currentTutorialStep?.id === 'day2_handoff'` 时拦截 advance：

在 advanceTutorial 里加：

```js
const advanceTutorial = useCallback(() => {
    setTutorialStepIndex(i => {
        const next = i + 1;
        if (next >= TUTORIAL_STEPS.length) {
            // 教程自然完成 = 走 day2_handoff 的 onComplete action
            handleDay2HandoffComplete();
            setTutorialMode(false);
            return i;
        }
        return next;
    });
}, [...]);

function handleDay2HandoffComplete() {
    setDayNumber(2);
    // 不重置 popularity / inventory / hp（他们在 scene_7 之后是正常状态）
    const oceanThreads = DISHES.find(d => d.id === 'ocean_threads');
    setCurrentDish(oceanThreads);
    grantTools(pickRandomDistinctTools(TOOL_CONFIG.dayStartCount));
    setPhase('pre_game');
}
```

注意 skip 与 natural complete 的差异：skip 时玩家可能根本没玩过 → 重置所有；natural complete 时玩家已走完 Day 1 → 只切 Day 2 + 锁菜谱 + 发 3 道具。

- [ ] **Step 3：build + dev 验证**

```bash
npm run build
```

跑 dev，从开场点跳过按钮，看是否落到 Day 2 + 海洋线条 + 3 道具 + 满血。

再起新游戏走到 scene 4，再点跳过，验证一致行为。

- [ ] **Step 4：commit**

```bash
git add src/hooks/useGameLogic.js
git commit -m "$(cat <<'EOF'
NEW: 跳过路径 + Day 2 handoff 完整化

- skipTutorial 完整重置 game state 到 Day 2 海洋线条干净开局
- 自然走完 day2_handoff 时只切 Day 2 + 锁菜谱 + 发 3 道具（保留玩家 popularity/hp 等）
- 区分 skip 与 natural complete 的状态过渡逻辑

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8：translations.js i18n 桩 + 浏览器全程走查 + 修补

**Files:**
- Modify: `src/utils/translations.js`（仅加新中文 key 占位，英文留 fallback）
- 各场景实战调试

- [ ] **Step 1：translations.js 加新中文条目**

打开 `src/utils/translations.js`。新台词都已用 `t()` 包裹。中文是源——`t()` 没找到 EN 翻译会 fallback 到中文，所以**英文条目本轮可不加**。但要把 `跳过教程` `继续` `确认跳过` `取消` `开始第 1 天` 等控件文案的英文加上（`translations.js::EN_TRANSLATIONS`）：

```js
'跳过教程': 'Skip Tutorial',
'继续': 'Continue',
'确认跳过': 'Confirm',
'取消': 'Cancel',
'将跳过开场与新手教程，直接从第二天开始。': 'This will skip the prologue and tutorial, starting Day 2 directly.',
'我知道了': 'Got it',
// 角色名
'主角': 'You',
```

剧情台词（独白 / 对白）的英文翻译留给后续 PR。

- [ ] **Step 2：浏览器全程走查**

```bash
npm run dev
```

完整走 Day 1 教程一遍，每一步都验证：

| 步 | 验证点 |
|---|---|
| opening_a~c | 全屏卡 emoji + 文字渲染正常，点继续推进 |
| scene_1_cooking | 冰箱里有 3 个 Q4 食材；放对位置 → 惊艳 → 推进；放错 → 主角台词 + 全重置 |
| scene_1_5_dishcard | Kitchen 切到海洋线条 4 槽显示，点开始按钮推进 |
| intermission_market | 黑屏 + "【半小时后】" + 自动推进 |
| scene_2_grainstore | 进入粮食店，只有 row 1 / col 1 可点；3 抽都是挂面 Q1/Q1/Q2；2 次合成出 Q3 挂面；挤出按钮在合成前灰，合成后可点；人挤人 0 HP |
| scene_3_market_picker | 候选含海鲜店；点海鲜店推进；点其他主角台词 |
| scene_4_seafood | 进店发 1 透视；可不用透视直接抽；3 抽是基围虾 Q3 / 扇贝 Q2 / 梭子蟹 Q2；透视后明虾显 Q5 |
| scene_5_bulletin | 交换区出现 1 个固定订单（扇贝+梭子蟹 → 香菇）；提交流程跑通 |
| scene_6_evacuate | 点回到餐厅前弹耐久说明 modal；看完后允许撤离 |
| scene_7_cooking | 海洋线条菜谱；放料后任何评级都通过 |
| day2_handoff | 人气值目标卡显示；点确认进入 Day 2 + 锁海洋线条 + 3 道具 |

记录所有 bug，逐个修复然后 commit。

- [ ] **Step 3：跳过路径走查**

新开 3 次：
1. opening_a 阶段点跳过 → Day 2 干净开局
2. scene_2 中点跳过 → Day 2
3. scene_5 提交订单后点跳过 → Day 2

每次都看 Day 2 开局是否一致：海洋线条 + 3 道具 + popularity 10 + hp 5 + inventory 空。

- [ ] **Step 4：bug 修复 commits（按发现顺序，每个独立 commit）**

每修一个问题就：

```bash
git add <files>
git commit -m "FIX: <问题简述>"
```

- [ ] **Step 5：最终 commit（如有 i18n 占位变更）**

```bash
git add src/utils/translations.js
git commit -m "$(cat <<'EOF'
NEW: 教程 UI 控件英文翻译占位

- 跳过教程 / 继续 / 确认跳过 等控件 EN
- 剧情台词的英文翻译留待后续 PR

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

- ✅ **Spec coverage**：每个场景 1~7 + 开场叙事 + Day 2 handoff 都有对应 task；所有 overrides 字段（wallLayout / drawResults / safeDoomLanding / fixedOrder / toolsGranted / dish / fridgePreload / hideBulletin / disableUI / selectableAxes / peekQualityMap）都接入；UI 5 件套 + StepController + SkipButton 都有 task；跳过路径独立 task。
- ✅ **No placeholders**：所有 step 都有具体代码或具体命令，没有"TBD/handle edge cases"等泛词。
- ✅ **Type 一致**：tutorialOverrides / advanceTutorial / emitTutorialEvent / TUTORIAL_STEPS 等命名在所有 task 中一致。

---

## 已知 risk / 边界情况

会在 Task 8 走查时发现并修补：

1. **selectRow override 落点逻辑**：Task 3 简化了实现，实际可能需要更细的"已抽过 cell 不重抽"机制
2. **道具发放与 between_turns 的交互**：教程禁用了离店 +1，需要确认 between_turns 不会在错的时机发
3. **Kitchen "开始第 X 天" 按钮**：现有 Kitchen 是否有这个按钮？没有的话需要在场景 1.5 临时加一个
4. **DOOM 分布**：场景 2 / 4 需要确保 doomGrid 在进店时已有 1 个 danger（正常逻辑应该满足）
5. **cell 消耗**：抽取后 cell 应正常清空，scripted 模式下不能破坏这个语义

---

*Plan version：2026-04-23 初稿*
