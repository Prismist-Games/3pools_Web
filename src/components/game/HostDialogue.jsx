import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const HOST_INTROS = [
    '各位观众朋友们好！欢迎收看「幸运大抽奖」！今天又有丰厚的大奖等着我们的幸运选手，您准备好了吗？',
    '欢迎回到「幸运大抽奖」！昨天的大奖得主们可都乐坏了，今天轮到您啦！',
    '又是全新的一期「幸运大抽奖」！据说今天的奖池格外丰厚，机会难得，千万别错过！',
    '老观众们好！收视率节节攀升，都是因为您的支持！废话不多说，今天的大奖已经就位！',
    '「幸运大抽奖」第五天！连续参与的选手往往运气最好——至少我们的统计是这么说的！',
    '又见面了！有观众来信说昨天的奖品改变了他们的生活，今天也许改变您的就在眼前！',
    '一周特别节目！为了感谢忠实观众，今天的奖池我们做了特别准备！来吧！',
    '老朋友！「幸运大抽奖」风雨无阻，和您一样。今天的大奖，非您莫属！',
];

const HOST_OUTROS = [
    '感谢您的参与！带好您的物品，我们下期节目再见！',
    '今天的节目到此结束。好好利用这些物品吧，明天见！',
    '又是收获满满的一天！回去好好休息，明天我们继续。',
    '辛苦了！这些东西虽然随机，但总会有用的。下期再见！',
    '今天就到这里了。别忘了，每一样东西都可能在关键时刻派上用场。',
];

// 用commentKey做稳定选择，避免每次渲染随机变化
const pickStable = (arr, key) => arr[key % arr.length];

// 节目进行中：根据玩家行为动态选台词（只在commentKey变化时改变）
const getShowComment = (showContext) => {
    const { drawCount, lastDrawnItem, inventoryCount, lastDrawRarity, commentKey } = showContext;

    // 第一次抽取前
    if (drawCount === 0) {
        const openers = [
            '选一行或一列，试试运气吧！',
            '观众朋友们都在看着呢，大胆选！',
            '今天会抽到什么呢？我也很期待！',
            '来吧，第一抽往往决定了今天的基调！',
        ];
        return pickStable(openers, commentKey);
    }

    // 抽到稀有以上
    if (lastDrawRarity && ['rare', 'epic', 'legendary', 'mythic'].includes(lastDrawRarity)) {
        const rareReactions = [
            '哇哦！这可是个好东西！',
            '观众朋友们，看到了吗！运气来了！',
            '不错不错，今天运气很好嘛！',
            '这个可不常见，恭喜恭喜！',
            '漂亮！就是这种感觉！',
        ];
        return pickStable(rareReactions, commentKey);
    }

    // 抽到普通物品
    if (lastDrawRarity === 'common') {
        const commonReactions = [
            '嗯...普普通通，但也许正好需要呢。',
            '别灰心，好运总会来的！',
            '平平无奇，但生活不就是这样嘛。',
            '没关系，下一个说不定就是大奖！',
        ];
        return pickStable(commonReactions, commentKey);
    }

    // 背包渐满
    if (inventoryCount >= 4) {
        const fullReactions = [
            '收获不少了！要见好就收吗？',
            '背包快满了，要不要考虑停下来？',
            '积攒了不少东西了呢！',
        ];
        return pickStable(fullReactions, commentKey);
    }

    // 一般反应
    const general = [
        '继续继续，看看还能抽到什么！',
        '每一次选择都是一次机会！',
        '观众朋友们，为我们的选手加油！',
        '好的好的，接下来会更精彩！',
    ];
    return pickStable(general, commentKey);
};

const HostDialogue = ({ phase, day, drawsRemaining, onStartShow, onContinue, showContext }) => {
    const { t } = useLanguage();

    const getDialogue = () => {
        switch (phase) {
            case 'show_intro': {
                const idx = Math.min(day - 1, HOST_INTROS.length - 1);
                return {
                    speaker: '主持人',
                    text: HOST_INTROS[idx],
                    action: onStartShow,
                    actionText: '开始',
                };
            }
            case 'show':
                return {
                    speaker: '主持人',
                    text: showContext ? getShowComment(showContext) : '选一行或一列，试试运气吧！',
                    action: null,
                    actionText: null,
                };
            case 'show_outro': {
                const outroIdx = (day - 1) % HOST_OUTROS.length;
                return {
                    speaker: '主持人',
                    text: HOST_OUTROS[outroIdx],
                    action: onContinue,
                    actionText: '关掉电视',
                };
            }
            case 'home':
                return null;
            default:
                return null;
        }
    };

    const dialogue = getDialogue();
    if (!dialogue) return null;

    return (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-xl shrink-0 shadow-sm">
                🎤
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-amber-700 mb-1">{t(dialogue.speaker)}</div>
                <p className="text-sm text-slate-700 leading-relaxed">{t(dialogue.text)}</p>
                {dialogue.action && (
                    <button
                        onClick={dialogue.action}
                        className="mt-3 bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-sm"
                    >
                        {t(dialogue.actionText)}
                    </button>
                )}
            </div>
        </div>
    );
};

export default HostDialogue;
