import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import TutorialBottomDialog from './TutorialBottomDialog';
import TutorialFullScreenCard from './TutorialFullScreenCard';
import TutorialIntermission from './TutorialIntermission';
import TutorialCoachmark from './TutorialCoachmark';

// 用于识别"主角"占位符的常量：脚本里 speaker/emoji 用这两个值表示"玩家自己"
const PLAYER_EMOJI_PLACEHOLDER = '🧑‍🍳';
const PLAYER_NAME_PLACEHOLDER = '主角';

// 将 ui 字段（bottomDialog / fullScreenCard / postDialogModal）中的主角占位符
// 替换为玩家实际选择的姓名和形象。字段可能为 undefined，直接返回原值。
function applyPlayerInfo(field, playerInfo) {
    if (!field || !playerInfo?.emoji) return field;
    const result = { ...field };
    if (typeof result.emoji === 'string') {
        result.emoji = result.emoji.replaceAll(PLAYER_EMOJI_PLACEHOLDER, playerInfo.emoji);
    }
    if (result.speaker === PLAYER_NAME_PLACEHOLDER && playerInfo.name) {
        result.speaker = playerInfo.name;
    }
    return result;
}

/**
 * Tutorial 顶层 orchestrator：根据 currentStep.ui 渲染对应组件，
 * 把组件的 onComplete 接到 onAdvance 上（或仅推进对话进度）。
 *
 * Coachmark 推进：
 * - 旧 schema: ui.coachmark = { targetSelector, label } (单个，dialog 完成后显示)
 * - 新 schema: ui.coachmarks = [{ when, targetSelector, label }, ...]
 *   - when ∈ { 'dialog_done', 'placements_done', 'draws_done', 'synth_done', 'peek_used' }
 *   - 算法：遍历数组 + 评估各 when 的谓词；找到"最后一个谓词为 true 的 when"作为当前 active 阶段；
 *     渲染所有 when 等于该值的 coachmark（支持同阶段多 highlight）
 *
 * 谓词依赖外部传入的 tutorialState（drawCount / synthDone / peekUsed / placementsDone）
 */

const PHASE_PREDICATES = {
    'dialog_done':     (s) => s.dialogDone,
    'placements_done': (s) => s.dialogDone && s.placementsDone,
    'first_draw_done': (s) => s.dialogDone && s.tutorialDrawCount >= 1,
    'draws_done':      (s) => s.dialogDone && s.allDrawsDone,
    'synth_done':      (s) => s.dialogDone && s.synthDone,
    'peek_used':       (s) => s.dialogDone && s.peekUsed,
};

function pickActiveCoachmarks(coachmarks, state) {
    if (!Array.isArray(coachmarks) || coachmarks.length === 0) return [];
    let activeWhen = null;
    for (const cm of coachmarks) {
        const pred = PHASE_PREDICATES[cm.when];
        if (pred && pred(state)) activeWhen = cm.when;
    }
    if (!activeWhen) return [];
    return coachmarks.filter(cm => cm.when === activeWhen);
}

export default function TutorialStepController({
    currentStep,
    onAdvance,
    tutorialHeroLine,
    onClearHeroLine,
    playerInfo,
    // 派生状态：用于 coachmark 阶段判定
    tutorialDrawCount = 0,
    synthDone = false,
    peekUsed = false,
    placementsDone = false,
    allDrawsDone = false,
}) {
    const [dialogDone, setDialogDone] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);

    // step 切换时复位
    useEffect(() => {
        setDialogDone(false);
        setShowPostModal(false);
    }, [currentStep?.id]);

    // tutorialHeroLine 自动消失
    useEffect(() => {
        if (!tutorialHeroLine) return;
        const t = setTimeout(() => onClearHeroLine?.(), 3000);
        return () => clearTimeout(t);
    }, [tutorialHeroLine, onClearHeroLine]);

    if (!currentStep) {
        // 教程结束态：仅可能还有漂浮 heroLine 残留
        return tutorialHeroLine ? (
            <FloatingHeroLine line={tutorialHeroLine} playerEmoji={playerInfo?.emoji} />
        ) : null;
    }

    const ui = currentStep.ui ?? {};
    const { intermission, fullScreenCard, bottomDialog, coachmark, coachmarks, postDialogModal } = ui;

    // 把脚本里的"主角"占位符替换为实际玩家形象/姓名
    const resolvedCard = applyPlayerInfo(fullScreenCard, playerInfo);
    const resolvedDialog = applyPlayerInfo(bottomDialog, playerInfo);
    const resolvedPostModal = applyPlayerInfo(postDialogModal, playerInfo);

    // 判定 dialog 完成是否触发 advance：仅当 step 没有其它非交互推进手段、且 completion.event 是 continue_clicked
    const dialogShouldAdvance =
        currentStep.completion?.event === 'continue_clicked'
        && !fullScreenCard && !intermission;

    // 没有 dialog 时视为 dialogDone=true（无需等待）
    const effectiveDialogDone = bottomDialog ? dialogDone : true;

    // 兼容旧 coachmark 单字段：等价于 [{ when: 'dialog_done', ... }]
    const coachmarkList = coachmarks
        ?? (coachmark ? [{ when: 'dialog_done', ...coachmark }] : []);
    const activeCoachmarks = pickActiveCoachmarks(coachmarkList, {
        dialogDone: effectiveDialogDone,
        tutorialDrawCount,
        allDrawsDone,
        synthDone,
        peekUsed,
        placementsDone,
    });

    return (
        <>
            {intermission && (
                <TutorialIntermission
                    {...intermission}
                    onComplete={onAdvance}
                />
            )}
            {resolvedCard && (
                <TutorialFullScreenCard
                    {...resolvedCard}
                    onComplete={onAdvance}
                />
            )}
            {resolvedDialog && !dialogDone && (
                <TutorialBottomDialog
                    {...resolvedDialog}
                    onComplete={() => {
                        setDialogDone(true);
                        if (postDialogModal) setShowPostModal(true);
                        if (dialogShouldAdvance) onAdvance?.();
                    }}
                />
            )}
            {showPostModal && resolvedPostModal && (
                <TutorialFullScreenCard
                    {...resolvedPostModal}
                    onComplete={() => setShowPostModal(false)}
                />
            )}
            {activeCoachmarks.map((cm, i) => (
                <TutorialCoachmark
                    key={`${cm.when}-${i}-${cm.targetSelector}`}
                    targetSelector={cm.targetSelector}
                    label={cm.label}
                />
            ))}
            {tutorialHeroLine && <FloatingHeroLine line={tutorialHeroLine} playerEmoji={playerInfo?.emoji} />}
        </>
    );
}

/** 主角 transient 台词浮层（场景失败 / off-path / onExit 用） */
function FloatingHeroLine({ line, playerEmoji }) {
    const { t } = useLanguage();
    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[170] pointer-events-none">
            <div className="bg-kitchen-card/95 border border-kitchen-gold-border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                <span className="text-2xl">{playerEmoji ?? PLAYER_EMOJI_PLACEHOLDER}</span>
                <span className="text-base text-kitchen-text-body whitespace-pre-wrap">{t(line)}</span>
            </div>
        </div>
    );
}
