import React, { useState, useEffect } from 'react';
import TutorialBottomDialog from './TutorialBottomDialog';
import TutorialFullScreenCard from './TutorialFullScreenCard';
import TutorialIntermission from './TutorialIntermission';
import TutorialCoachmark from './TutorialCoachmark';

/**
 * Tutorial 顶层 orchestrator：根据 currentStep.ui 渲染对应组件，
 * 把组件的 onComplete 接到 onAdvance 上（或仅推进对话进度）。
 *
 * 推进语义：
 * - intermission：autoAdvanceMs 后自动 advance
 * - fullScreenCard：点继续 advance
 * - bottomDialog：所有台词读完后**不一定** advance——许多场景靠玩家做完游戏操作触发 emitTutorialEvent；
 *   但若该 step 没有 fullScreenCard/intermission 等"非交互完成手段"，且 completion.event === 'continue_clicked'，
 *   则 dialog 完成时 advance。
 * - postDialogModal：bottomDialog 完成后弹出，关闭后不 advance（仍等 completion 事件）
 *
 * 还会渲染主角 transient 台词 (tutorialHeroLine) 作为漂浮提示。
 */
export default function TutorialStepController({
    currentStep,
    onAdvance,
    tutorialHeroLine,
    onClearHeroLine,
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
            <FloatingHeroLine line={tutorialHeroLine} />
        ) : null;
    }

    const ui = currentStep.ui ?? {};
    const { intermission, fullScreenCard, bottomDialog, coachmark, postDialogModal } = ui;

    // 判定 dialog 完成是否触发 advance：仅当 step 没有其它非交互推进手段、且 completion.event 是 continue_clicked
    const dialogShouldAdvance =
        currentStep.completion?.event === 'continue_clicked'
        && !fullScreenCard && !intermission;

    return (
        <>
            {intermission && (
                <TutorialIntermission
                    {...intermission}
                    onComplete={onAdvance}
                />
            )}
            {fullScreenCard && (
                <TutorialFullScreenCard
                    {...fullScreenCard}
                    onComplete={onAdvance}
                />
            )}
            {bottomDialog && !dialogDone && (
                <TutorialBottomDialog
                    {...bottomDialog}
                    onComplete={() => {
                        setDialogDone(true);
                        if (postDialogModal) setShowPostModal(true);
                        if (dialogShouldAdvance) onAdvance?.();
                    }}
                />
            )}
            {showPostModal && postDialogModal && (
                <TutorialFullScreenCard
                    {...postDialogModal}
                    onComplete={() => setShowPostModal(false)}
                />
            )}
            {coachmark && (
                <TutorialCoachmark {...coachmark} />
            )}
            {tutorialHeroLine && <FloatingHeroLine line={tutorialHeroLine} />}
        </>
    );
}

/** 主角 transient 台词浮层（场景失败 / off-path / onExit 用） */
function FloatingHeroLine({ line }) {
    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[170] pointer-events-none">
            <div className="bg-kitchen-card/95 border border-kitchen-gold-border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                <span className="text-2xl">🧑‍🍳</span>
                <span className="text-base text-kitchen-text-body whitespace-pre-wrap">{line}</span>
            </div>
        </div>
    );
}
