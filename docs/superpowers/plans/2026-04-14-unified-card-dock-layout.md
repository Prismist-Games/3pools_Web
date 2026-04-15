# Unified Card Dock & Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all passive-match card UIs into one component, display in a bottom dock, and restructure the full game layout to fit one screen.

**Architecture:** Two new components (`PassiveCard`, `CardDock`) replace three inline render functions in GameCore. GameCore's layout is restructured from sidebar-based to a 3-row layout (header / main+inventory / dock). No game logic changes.

**Tech Stack:** React 18, Tailwind CSS 3, Lucide React (for icons in popover close), existing `slotCards.js` helpers.

**Note:** This project has no test suite. Verification is visual via `npm run dev` + `npm run build` for compilation checks.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/game/PassiveCard.jsx` | Create | Single card: collapsed row + expanded popover. Handles danger/profit/evacuation types. |
| `src/components/game/CardDock.jsx` | Create | Bottom dock container: sorts cards by type, renders PassiveCard instances, manages which popover is open. |
| `src/GameCore.jsx` | Modify | Remove 3 render functions, restructure layout to 3-row, merge header to single row, integrate CardDock. |
| `src/utils/translations.js` | Modify | Add new i18n strings for dock UI. |

---

### Task 1: Add i18n strings

**Files:**
- Modify: `src/utils/translations.js`

- [ ] **Step 1: Add translation entries**

Add these entries to `EN_TRANSLATIONS` (Chinese is the source language, used directly in code; only English translations are needed):

```js
// In EN_TRANSLATIONS object, add near the existing card-related entries:
"暂无卡牌": "No cards",
"回合结束自动检查": "Auto-checked at turn end",
"撤离获得": "Earn on evacuation",
"移除此卡": "Remove card",
"印花": "Stickers",
```

Note: many strings already exist (`已满足`, `未满足`, `撤离`, `需要`, `持有`, `撤离时自动兑换`, etc.). Only add what's missing.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/translations.js
git commit -m "feat(i18n): add card dock translation strings"
```

---

### Task 2: Create PassiveCard component

**Files:**
- Create: `src/components/game/PassiveCard.jsx`

- [ ] **Step 1: Create the component file**

```jsx
import React from 'react';
import { X } from 'lucide-react';
import { getRequirements, canSatisfyCard, getStickerTypeInfo } from '../../data/slotCards';
import GameCard from '../ui/GameCard';

/**
 * PassiveCard — unified display for all sticker-matching cards.
 *
 * Props:
 *   card       — slot card object (from slotCards.js) with .type and .slots. null for evacuation.
 *   type       — 'danger' | 'profit' | 'evacuation'
 *   inventory  — current inventory array
 *   isExpanded — whether the popover is showing
 *   onToggle   — () => void, toggle expand/collapse
 *   onRemove   — (cardId) => void, remove a profit card (optional)
 *   onEvacuate — () => void, trigger evacuation (optional, evacuation only)
 *   canEvacuate — boolean (evacuation only)
 *   inventoryStickerCount — number (evacuation only)
 *   evacuationStickerThreshold — number (evacuation only)
 *   t          — translation function
 */

const TYPE_CONFIG = {
    danger: {
        icon: '⚠️',
        borderColor: 'border-l-red-400',
        penaltyLabel: '-1 ❤️',
    },
    profit: {
        icon: '💎',
        borderColor: 'border-l-blue-400',
        penaltyLabel: null,
    },
    evacuation: {
        icon: '🚪',
        borderColor: 'border-l-amber-400',
        penaltyLabel: null,
    },
};

function PassiveCardBase({
    card,
    type,
    inventory,
    isExpanded,
    onToggle,
    onRemove,
    onEvacuate,
    canEvacuate,
    inventoryStickerCount,
    evacuationStickerThreshold,
    t,
}) {
    const config = TYPE_CONFIG[type];
    const isEvacuation = type === 'evacuation';

    // Satisfaction check
    let satisfied;
    let reqs = {};
    if (isEvacuation) {
        satisfied = !!canEvacuate;
    } else {
        reqs = getRequirements(card);
        satisfied = canSatisfyCard(card, inventory);
    }

    // Build per-type satisfaction for requirement icons
    const reqEntries = Object.entries(reqs);

    return (
        <div className="relative">
            {/* Collapsed row */}
            <div
                onClick={onToggle}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-l-[3px] cursor-pointer
                    transition-all select-none
                    ${config.borderColor}
                    ${satisfied
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                    ${isExpanded ? 'ring-2 ring-blue-300' : ''}
                `}
            >
                {/* Type icon */}
                <span className="text-base leading-none shrink-0">{config.icon}</span>

                {/* Requirements area */}
                {isEvacuation ? (
                    /* Evacuation: progress bar */
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-amber-700 tabular-nums whitespace-nowrap">
                            {inventoryStickerCount}/{evacuationStickerThreshold}
                        </span>
                        <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${satisfied ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, (inventoryStickerCount / evacuationStickerThreshold) * 100)}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    /* Danger / Profit: per-type sticker icons */
                    <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                        {reqEntries.map(([stickerType, count]) => {
                            const info = getStickerTypeInfo(stickerType);
                            const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                            const typeSatisfied = invCount >= count;
                            return (
                                <div
                                    key={stickerType}
                                    className={`relative w-6 h-6 rounded border-2 flex items-center justify-center text-sm
                                        ${typeSatisfied
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-dashed border-gray-300 bg-white/50'
                                        }
                                    `}
                                >
                                    <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                    {count > 1 && (
                                        <span className="absolute -bottom-1 -right-1 text-[7px] font-black text-gray-500 bg-white rounded-full px-0.5 leading-tight">
                                            x{count}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Status badge */}
                <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap
                    ${satisfied
                        ? 'bg-emerald-100 text-emerald-700'
                        : type === 'danger'
                            ? 'bg-red-100 text-red-700'
                            : type === 'evacuation'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                    }
                `}>
                    {satisfied ? '✓' : `✗${config.penaltyLabel ? ` ${config.penaltyLabel}` : ''}`}
                </span>
            </div>

            {/* Expanded popover (above the card) */}
            {isExpanded && (
                <div className="absolute bottom-full left-0 mb-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-30">
                    {type === 'danger' && (
                        <p className="text-[11px] text-gray-600">
                            {t('回合结束自动检查')}。{t('未满足')} → {config.penaltyLabel}
                        </p>
                    )}

                    {type === 'profit' && (
                        <>
                            {card.reward?.items && (
                                <div className="mb-2">
                                    <div className="text-[9px] font-bold text-amber-500 mb-1">{t('撤离获得')}</div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {card.reward.items.map((item, i) => (
                                            <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="sm" />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {satisfied && (
                                <p className="text-[10px] text-emerald-600 font-bold mb-2">{t('撤离时自动兑换')}</p>
                            )}
                            {onRemove && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                                    className="w-full text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors font-bold"
                                >
                                    {t('移除此卡')}
                                </button>
                            )}
                        </>
                    )}

                    {type === 'evacuation' && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[11px] text-gray-600">
                                {t('需要')} {evacuationStickerThreshold} {t('印花')}
                            </p>
                            {satisfied && onEvacuate && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEvacuate(); }}
                                    className="w-full px-3 py-1.5 rounded-lg text-xs font-black bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                >
                                    🚪 {t('撤离')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const PassiveCard = React.memo(PassiveCardBase);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors (component not yet used, but should compile)

- [ ] **Step 3: Commit**

```bash
git add src/components/game/PassiveCard.jsx
git commit -m "feat: add PassiveCard unified sticker-match card component"
```

---

### Task 3: Create CardDock component

**Files:**
- Create: `src/components/game/CardDock.jsx`

- [ ] **Step 1: Create the component file**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { PassiveCard } from './PassiveCard';

/**
 * CardDock — bottom dock showing all held passive-match cards.
 *
 * Ordering: danger → profit → evacuation.
 * Manages popover state (one open at a time, click-outside closes).
 *
 * Props:
 *   dangerCards     — array of danger slot cards
 *   profitCards     — array of profit slot cards
 *   inventory       — current inventory array
 *   canEvacuate     — boolean
 *   inventoryStickerCount — number
 *   evacuationStickerThreshold — number
 *   evacuate        — () => void
 *   removeSlotCard  — (cardId) => void
 *   phase           — current game phase string
 *   t               — translation function
 */
export default function CardDock({
    dangerCards,
    profitCards,
    inventory,
    canEvacuate,
    inventoryStickerCount,
    evacuationStickerThreshold,
    evacuate,
    removeSlotCard,
    phase,
    t,
}) {
    const [expandedId, setExpandedId] = useState(null);
    const dockRef = useRef(null);

    // Close popover on click outside
    useEffect(() => {
        if (!expandedId) return;
        const handleClick = (e) => {
            if (dockRef.current && !dockRef.current.contains(e.target)) {
                setExpandedId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [expandedId]);

    const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

    const showDock = phase === 'pool_selection' || phase === 'drawing';
    if (!showDock) return null;

    const hasCards = dangerCards.length > 0 || profitCards.length > 0;
    const showEvac = true; // always show evacuation in dock during gameplay

    return (
        <div ref={dockRef} className="bg-white rounded-xl shadow-md border border-gray-200 px-3 py-2">
            {!hasCards && !showEvac ? (
                <p className="text-[11px] text-gray-300 text-center py-1">{t('暂无卡牌')}</p>
            ) : (
                <div className="flex items-start gap-2 flex-wrap">
                    {/* Danger cards */}
                    {dangerCards.map(card => (
                        <PassiveCard
                            key={card.id}
                            card={card}
                            type="danger"
                            inventory={inventory}
                            isExpanded={expandedId === card.id}
                            onToggle={() => toggle(card.id)}
                            t={t}
                        />
                    ))}

                    {/* Separator between danger and profit (if both exist) */}
                    {dangerCards.length > 0 && profitCards.length > 0 && (
                        <div className="w-px h-8 bg-gray-200 self-center shrink-0" />
                    )}

                    {/* Profit cards */}
                    {profitCards.map(card => (
                        <PassiveCard
                            key={card.id}
                            card={card}
                            type="profit"
                            inventory={inventory}
                            isExpanded={expandedId === card.id}
                            onToggle={() => toggle(card.id)}
                            onRemove={removeSlotCard}
                            t={t}
                        />
                    ))}

                    {/* Separator before evacuation */}
                    {(dangerCards.length > 0 || profitCards.length > 0) && (
                        <div className="w-px h-8 bg-gray-200 self-center shrink-0" />
                    )}

                    {/* Evacuation card (always present during gameplay) */}
                    <PassiveCard
                        card={null}
                        type="evacuation"
                        inventory={inventory}
                        isExpanded={expandedId === '__evac__'}
                        onToggle={() => toggle('__evac__')}
                        canEvacuate={canEvacuate}
                        onEvacuate={evacuate}
                        inventoryStickerCount={inventoryStickerCount}
                        evacuationStickerThreshold={evacuationStickerThreshold}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/game/CardDock.jsx
git commit -m "feat: add CardDock bottom dock container component"
```

---

### Task 4: Restructure GameCore layout

This is the largest task. It removes three render functions, merges the header, removes sidebars, and wires up CardDock.

**Files:**
- Modify: `src/GameCore.jsx`

- [ ] **Step 1: Add CardDock import**

At the top of `src/GameCore.jsx`, add the import alongside existing ones:

```js
import CardDock from './components/game/CardDock';
```

- [ ] **Step 2: Remove the three render functions**

Delete these three functions entirely from GameCore (they are defined after the main `return` statement, before the closing `};`):

1. `function renderEvacuationBar()` (lines ~768–809)
2. `function renderDangerCards()` (lines ~812–882)
3. `function renderProfitCardsPassive()` (lines ~884–979, includes the debug `console.log`)

- [ ] **Step 3: Rewrite the header to a single row**

Replace the current header block (the `{/* ===== Header ===== */}` div, lines ~188–274) with:

```jsx
{/* ===== Header — single-row resource bar ===== */}
<div className="mb-2 bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center gap-3 px-4 py-2">
        {/* Left: title + meta */}
        <h1 className="text-sm font-black tracking-tight">{t('幸运之墙')}</h1>
        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">
            {t('场次')} {expeditionNumber}/{expeditionConfig.expeditionCount}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
            {t('回合')} {turnNumber}
        </span>

        <div className="flex-1" />

        {/* Right: resources + actions */}
        <span className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
            Math.max(0, actionPoints) > 5
                ? 'bg-sky-50 border-sky-400 text-sky-700'
                : Math.max(0, actionPoints) > 0
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-red-50 border-red-400 text-red-600 animate-pulse'
        }`}>
            <span>⚡</span>
            <span className="tabular-nums">{Math.max(0, actionPoints)}</span>
            <span className="text-[10px] font-medium opacity-60">/{maxAP}</span>
            {apDelta && (
                <span
                    key={apDelta.id}
                    className="absolute left-1/2 -translate-x-1/2 -top-5 text-sm font-black pointer-events-none text-rose-500"
                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}
                >
                    {apDelta.value}
                </span>
            )}
        </span>

        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
            turnHeat >= 50 ? 'bg-red-50 border-red-300 text-red-600' :
            turnHeat >= 25 ? 'bg-amber-50 border-amber-300 text-amber-600' :
            'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
            <span>🌡️</span>
            <span className="tabular-nums">{turnHeat}</span>
        </span>

        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-sm ${
            lives <= 2 ? 'bg-red-50 border-red-300 text-red-600' : 'bg-rose-50 border-rose-200 text-rose-600'
        }`}>
            <span>❤️</span>
            <span className="tabular-nums">{lives}</span>
        </span>

        {(phase === 'pool_selection' || phase === 'drawing') && (
            <button
                onClick={endTurn}
                disabled={isDrawAnimating}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
                {t('结束回合')}
            </button>
        )}

        <button onClick={toggleLanguage} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors">{language === 'zh' ? 'EN' : '中'}</button>
        <button onClick={handleReset} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-500 border border-red-200 hover:bg-red-200 transition-colors">{t('重置')}</button>
        <button onClick={() => setDebugOpen(prev => !prev)} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors">🛠</button>
    </div>
</div>
```

- [ ] **Step 4: Rewrite pool_selection phase layout**

Replace the entire `{phase === 'pool_selection' && (...)}` block with a two-column layout (no sidebars) + CardDock below:

```jsx
{phase === 'pool_selection' && (
    <div className="flex flex-col gap-2">
        <div className="flex gap-3">
            {/* Main Action Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
                {/* Wall Shop */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black uppercase tracking-wide text-gray-600">🏪 {t('奖品墙商店')}</h3>
                        <button
                            onClick={refreshWalls}
                            disabled={!canRefreshWalls}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                canRefreshWalls
                                    ? 'bg-sky-500 text-white hover:bg-sky-600'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            🔄 {t('刷新奖品墙')} ({AP_CONFIG.refreshCost}⚡)
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {revealedPools.map(pool => (
                            <PoolCardUI
                                key={pool.uid}
                                pool={pool}
                                canEnter={canEnterPool(pool)}
                                onEnter={() => enterPool(pool.uid)}
                                actionPoints={actionPoints}
                                t={t}
                            />
                        ))}
                        {revealedPools.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm w-full">{t('没有奖品墙')}</div>
                        )}
                    </div>
                </div>

                {/* Voucher Shop */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black uppercase tracking-wide text-blue-500">💎 {t('兑换券商店')}</h3>
                        <span className="text-[10px] text-blue-400 font-medium">{t('获取')} {AP_CONFIG.takeCardCost}⚡</span>
                    </div>
                    <div className="flex gap-3">
                        {displayedProfitCards.map(card => {
                            const reqs = getRequirements(card);
                            const satisfied = canSatisfyCard(card, inventory);
                            const canTake = canTakeCard(card.id);
                            return (
                                <div key={card.id} className={`flex-1 min-w-0 rounded-lg border-2 p-2.5 flex flex-col gap-1.5 ${
                                    satisfied
                                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-green-50'
                                        : 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50'
                                }`}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base leading-none">💎</span>
                                        <span className="font-black text-[11px] text-blue-800">{t('物品兑换券')}</span>
                                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                            satisfied
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                : 'bg-blue-100 text-blue-600 border-blue-200'
                                        }`}>
                                            {satisfied ? `✓ ${t('已满足')}` : `✗ ${t('未满足')}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {Object.entries(reqs).map(([stickerType, count]) => {
                                            const info = getStickerTypeInfo(stickerType);
                                            const invCount = inventory.filter(i => i?.isSticker && i.stickerId === stickerType).length;
                                            const typeSatisfied = invCount >= count;
                                            return (
                                                <div key={stickerType} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-sm relative ${
                                                    typeSatisfied
                                                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                                        : 'border-dashed border-gray-300 bg-white/50 opacity-60'
                                                }`}>
                                                    <span className={typeSatisfied ? '' : 'opacity-40'}>{info?.icon || '?'}</span>
                                                    {count > 1 && (
                                                        <span className="text-[7px] font-black text-gray-500 absolute -bottom-0.5 -right-0.5">x{count}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {card.reward?.items && (
                                        <div className="bg-amber-50/60 border border-amber-200 rounded px-1.5 py-1">
                                            <div className="text-[8px] font-bold text-amber-500 mb-0.5">{t('撤离获得')}</div>
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {card.reward.items.map((item, i) => (
                                                    <GameCard key={i} icon={item.icon} label={t(item.name)} stars={item.stars} size="sm" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => takeDisplayCard(card.id)}
                                        disabled={!canTake}
                                        className={`w-full px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                            canTake
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {t('获取')} ({AP_CONFIG.takeCardCost}⚡)
                                    </button>
                                </div>
                            );
                        })}
                        {displayedProfitCards.length === 0 && (
                            <div className="text-center py-3 text-gray-400 text-sm w-full">{t('暂无兑换券')}</div>
                        )}
                    </div>
                </div>

                {/* Danger wall entries (old system) */}
                {dangerWalls.length > 0 && (
                    <div className="bg-red-50 rounded-lg border border-red-200 p-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">🔥 {t('危险墙')}</span>
                            {dangerWalls.map(dw => (
                                <button
                                    key={dw.id}
                                    onClick={() => enterDangerWall(dw.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    {dw.grid[0].map((cell, ci) => (
                                        <span key={ci} className="text-xs">{cell.icon}</span>
                                    ))}
                                    {t('进入')}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory (right panel) */}
            <div className="w-72 flex-shrink-0 self-start">
                {renderInventory()}
            </div>
        </div>

        {/* Card Dock */}
        <CardDock
            dangerCards={dangerCards}
            profitCards={profitCards}
            inventory={inventory}
            canEvacuate={canEvacuate}
            inventoryStickerCount={inventoryStickerCount}
            evacuationStickerThreshold={evacuationStickerThreshold}
            evacuate={evacuate}
            removeSlotCard={removeSlotCard}
            phase={phase}
            t={t}
        />
    </div>
)}
```

- [ ] **Step 5: Rewrite drawing phase layout**

Replace the entire `{phase === 'drawing' && matrix && (...)}` block with a similar two-column + dock layout:

```jsx
{phase === 'drawing' && matrix && (
    <div className="flex flex-col gap-2">
        <div className="flex gap-3">
            {/* Main: grid area */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
                {/* Wall info bar */}
                {currentPool && !currentPool.isDangerWall && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-green-300 bg-green-50">
                        <span className="text-xl">{currentPool.poolType?.icon || '🏷️'}</span>
                        <span className="font-black text-sm">{t(currentPool.poolType?.name || '奖品墙')}</span>
                        {currentPool.poolType?._bias && (
                            <div className="flex items-center gap-0.5">
                                {currentPool.poolType._bias.map(biasId => {
                                    const info = getStickerTypeInfo(biasId);
                                    return info ? <span key={biasId} className="text-sm">{info.icon}</span> : null;
                                })}
                            </div>
                        )}
                        <span className="text-[11px] text-gray-500 font-medium">
                            {t('抽取')}: {drawCount}/{currentPool.poolType?.drawLimit ?? '∞'}
                        </span>
                        {drawLimitReached && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {t('已达上限')}
                            </span>
                        )}
                        <div className="flex-1" />
                        <button
                            onClick={exitPool}
                            disabled={isDrawAnimating}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold border-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            {t('退出奖品墙')}
                        </button>
                    </div>
                )}
                {currentPool?.isDangerWall && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-red-400 bg-red-50">
                        <span className="text-xl">🔥</span>
                        <span className="font-black text-sm text-red-800">{t('危险墙')}</span>
                        <span className="text-[11px] text-red-500 font-medium">
                            {t('抽取')}: {drawCount}/{currentPool.poolType.drawLimit}
                        </span>
                        <div className="flex-1" />
                        <button
                            onClick={exitDangerWallView}
                            disabled={isDrawAnimating}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold border-2 border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                            {t('退出危险墙')}
                        </button>
                    </div>
                )}

                {/* Draw grid */}
                <div className="flex justify-center">
                    <ResourceMatrix
                        matrix={matrix}
                        onSelectRow={selectRow}
                        onSelectColumn={selectColumn}
                        phase={phase}
                        disabled={isDrawAnimating || pendingItems.length > 0 || !canDraw}
                        disabledReason={drawLimitReached ? t('已达上限') : !canDraw ? t('行动点不足') : null}
                        drawAnimState={drawAnimState}
                        wallType={null}
                        lastDrawDirection={lastDrawDirection}
                        bonusItemMap={bonusItemMap}
                    />
                </div>

                {lastDrawResult && !isDrawAnimating && (
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        lastDrawResult.obtained
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-400 border border-gray-200'
                    }`}>
                        {lastDrawResult.obtained
                            ? `${t('获得')}: ${lastDrawResult.obtained.item?.icon || ''} ${t(lastDrawResult.obtained.item?.name || '')}`
                            : t('未获得物品')
                        }
                    </div>
                )}

                {/* Danger wall entries during drawing (if not inside one) */}
                {dangerWalls.length > 0 && !currentPool?.isDangerWall && (
                    <div className="bg-red-50 rounded-lg border border-red-200 p-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">🔥 {t('危险墙')}</span>
                            {dangerWalls.map(dw => (
                                <button
                                    key={dw.id}
                                    onClick={() => enterDangerWall(dw.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    {dw.grid[0].map((cell, ci) => (
                                        <span key={ci} className="text-xs">{cell.icon}</span>
                                    ))}
                                    {t('进入')}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory (right panel) */}
            <div className="w-72 flex-shrink-0 self-start">
                {renderInventory()}
            </div>
        </div>

        {/* Card Dock */}
        <CardDock
            dangerCards={dangerCards}
            profitCards={profitCards}
            inventory={inventory}
            canEvacuate={canEvacuate}
            inventoryStickerCount={inventoryStickerCount}
            evacuationStickerThreshold={evacuationStickerThreshold}
            evacuate={evacuate}
            removeSlotCard={removeSlotCard}
            phase={phase}
            t={t}
        />
    </div>
)}
```

- [ ] **Step 6: Remove the old bottom bar call and the left sidebar duplicate code**

Delete the line that called the old profit cards bottom bar:

```jsx
// DELETE this line (was after the drawing phase block, before flying item):
{(phase === 'pool_selection' || phase === 'drawing') && renderProfitCardsPassive()}
```

Also remove the danger walls count badge from the header (the `{dangerWalls.length > 0 && (...)}` span) since it's no longer needed — danger walls are now in the main area and danger cards are in the dock.

- [ ] **Step 7: Remove the duplicate "第 X 场" badge from header**

The current header has both `场次 1/3` and `第 1 场` badges — they show the same info. The new header only has `场次 1/3`. Verify the second badge is not in the new header code (it shouldn't be — Step 3 already handles this).

- [ ] **Step 8: Verify build and visual check**

Run: `npm run build`
Expected: no errors

Run: `npm run dev`
Open browser and verify:
- Header is one compact row with all resources and controls
- Pool selection shows wall shop + voucher shop (center) and inventory (right), no sidebars
- Drawing phase shows grid (center) and inventory (right)
- Bottom dock shows danger cards, profit cards, and evacuation card as uniform chips
- Clicking a dock card opens a popover above it
- Clicking outside closes the popover
- Satisfied cards show green styling, unsatisfied show type-appropriate styling

- [ ] **Step 9: Commit**

```bash
git add src/GameCore.jsx
git commit -m "feat: restructure layout — single-row header, no sidebars, unified card dock"
```

---

### Task 5: Clean up and final verification

**Files:**
- Modify: `src/GameCore.jsx` (minor cleanup only)

- [ ] **Step 1: Remove unused imports**

Check if `GameTooltip` is still used in the new header. The new header doesn't use `GameTooltip` wrappers (the old header wrapped AP/heat/lives in tooltips). If no other usage remains in GameCore, remove the import:

```js
// Remove if unused:
import GameTooltip from './components/ui/GameTooltip';
```

Also check if `ScoreBoard` import is used — the current code imports it but it may not be rendered. Remove if unused.

- [ ] **Step 2: Full build verification**

Run: `npm run build`
Expected: no errors, no warnings about unused imports

Run: `npm run lint`
Expected: clean or only pre-existing warnings

- [ ] **Step 3: Commit**

```bash
git add src/GameCore.jsx
git commit -m "chore: remove unused imports after layout restructure"
```
