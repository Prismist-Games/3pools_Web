---
name: generating-design-proposal
description: >
  Generates concrete, rule-level game design proposals. Trigger when
  the user names a design problem and asks for solutions, or after
  prior analysis concludes. Formal analysis is NOT required — a clearly
  stated problem suffices. When a message both describes a problem AND
  requests solutions, this skill wins over analyzing-game-mechanic.
  Defer to analyzing-game-mechanic for diagnosis-only, brainstorming
  for broad exploration.
---

# Generating Design Proposals

## Before Generating

1. **Understand the relevant mechanics** — only the systems the task
   touches. Read relevant doc sections, not everything. If no docs,
   ask the user to describe the affected mechanics briefly.

2. **Understand the design task** — problem, constraints, prior context.
   If the user arrives from analysis, build on that direction. Otherwise,
   ask at most 1-2 clarifying questions if genuinely ambiguous —
   generating and reacting is faster than interviewing.

## Two-Pass Process

Pass 1 finds directions worth pursuing (fast, structural reasoning).
Pass 2 designs specific rules for the 1-2 directions the team selects
(thorough, heavy validation). This split avoids wasting detailed
design work on directions the team won't pursue.

### Pass 1: Directions

Before generating directions, think through the problem's structure
— not to find THE answer, but to see the shape of the solution space.
Jumping straight to directions without this step tends to anchor on
the first idea that comes to mind, then produce surface variations
of it.

**Where does the problem live in the game's structure?** Not which
feature feels broken, but which objects, relationships, or flows
are producing (or failing to produce) the current experience?
"Orders lack depth" could mean order requirements don't create
meaningful differentiation, fulfilling orders requires no real
choice, or the pool-to-order relationship is too loose. Different
structural locations open up different solution spaces entirely.

**What property is the structure missing?** Not what feature to add,
but what structural property would resolve the problem if it existed.
"Items need a dimension of strategic distinction" is a missing
property. "Items need category effects" is already one specific
solution — jumping there collapses the space before you've seen it.

**Think from this game's structure, not from other games' solutions.**
Don't start with "how have other games solved this type of problem?"
and adapt their answers. That path produces directions structurally
foreign to this game — they assume different objects, relationships,
and player flows. Instead, look at where in THIS game's existing
structure a change could introduce the missing property. Use game
design knowledge as structural principles ("information that's
useful but not decisive creates interesting decisions"), not as a
solution catalog ("add drafting like Slay the Spire"). The game's
own objects and relationships are the raw material; directions should
grow out of them.

**Survey leverage points before committing.** The missing property
can usually be introduced at multiple structural locations —
different objects to modify, different relationships to create or
change, different phases of play to affect. Each leverage point is
a potential direction. If all your directions modify the same object
or relationship, you're likely exploring variations within one small
region of the solution space rather than surveying it.

Now generate 3-5 distinct directions. "Distinct" means they differ
in their core design insight AND the player behavior they're betting
on — not surface variations of the same underlying assumption.

For each direction, give it a descriptive title that says **what
changes**, not a coined name for a new system. "完成订单后影响后续
订单的类型分布" is clear. "订单倾向系统" is a coined label that hides
what's actually happening. The title should let someone who hasn't
read the details understand the gist.

Each direction in Pass 1 contains:

**方向概述** — What type of change, targeting which core object, at
what granularity. Describe the CATEGORY of change, not specific
rules. The reader should understand what WOULD change and at what
level, without knowing the exact rules yet.

Good: "每个物品品类拥有一条独特规则，改变该品类物品在合成或回收时
的行为" — clear what changes and at what granularity, without
revealing specific rules.

Bad: "水果合成时额外产出一个Common物品，药物合成不要求同名..."
— these are specific rules, which belong in Pass 2.

Also bad: "给核心对象增加机械差异"
— too vague to evaluate as a direction.

**如何解决问题** — The structural reasoning: why does this type of
change address the stated problem? What property does it add to
the game's structure?

That's it for Pass 1. No specific rules, no concrete examples, no
risk analysis. Present all directions concisely, then ask the user
which directions interest them.

**Direction-level self-check**: Before presenting each direction,
verify two things quickly:

1. **Is this direction compatible with the game's design
   positioning?** Check the direction's inherent complexity against
   the game's target audience and complexity budget. "Give each of
   20 items a unique effect" is a direction-level conflict with a
   broad-audience game — you don't need specific effects to know
   the information load is too high. Discard incompatible directions.

2. **Is there a plausible path to rules that don't break core
   systems?** You don't need to design the rules — just do a quick
   sanity check. If every obvious implementation of a direction
   hits the same structural wall (e.g., any category rule strong
   enough to matter would create dominance over other categories),
   the direction may be a dead end. Either find a way around the
   wall or discard. But don't spend time designing and validating
   specific rules here — that's Pass 2 work.

### Pass 2: Full Development

After the user selects 1-2 directions, develop them into complete
proposals with specific rules. This is where the heavy design and
validation work happens.

For each selected direction, produce:

**方案概述** — Expand the direction into specific rules described
in plain language. One paragraph per major rule change.

**规则变更** — Each change as:
**[触发条件]** → **[效果]** → **[影响的系统]**.

Good: "当玩家提交订单时 [触发] → 所用物品的来源池子获得增强词缀持续下一
回合 [效果] → 影响奖池系统，不改变订单逻辑 [影响范围]"

Bad: "引入动态反馈系统，根据玩家行为模式调整游戏节奏"

Specific enough that someone could implement it without follow-up
questions.

**实际游戏中的样子** — A 2-3 step example showing how this plays out
in an actual game turn sequence. Describe what the player **sees on
screen** and what they're **weighing in their head** — not hidden
math. "You see pool costs went up and decide whether it's still worth
drawing" is good. "Rare probability dropped from 20% to 12%" is
not — players don't see hidden probabilities.

**风险** — Bullet-pointed list of genuine uncertainties — things
that can't be resolved on paper and need playtesting, tuning, or
further design work. Not a place for known deal-breakers.

If a risk says the proposal would break a core system, that's a
fatal flaw — go back and fix the rules. Risks belong here when they
can't be resolved on paper: tuning sensitivity, perception challenges,
implementation cost, interaction uncertainty with other systems.
Omit this section if no significant risks exist.

**Full self-check before presenting**: After designing specific
rules, run them through these filters:

1. **Does this break an existing core system?** List every system
   the proposed rules touch — directly (the rules reference it)
   and indirectly (the rules change inputs or incentives that feed
   into it). Then for each listed system, check: does this rule
   undermine or invalidate something that currently works? E.g.,
   making order matching trivial, removing the incentive to merge,
   or eliminating meaningful pool selection. If yes, that's a fatal
   flaw — rework the rules. Writing out the affected systems
   explicitly is the point: an implicit "I thought about it" misses
   cross-system effects that enumeration catches.

2. **Does this contradict the game's design positioning?** Check
   the specific rules (not just the direction) against the game's
   target audience, complexity budget, and design values.

3. **Do the concrete examples hold up?** Verify each example
   against the existing game rules. A sound direction illustrated
   with a broken example will make the entire proposal look
   unsound. If you can't find examples that work without breaking
   something, try different rules for the same direction.

The direction was already validated in Pass 1, so if specific
rules keep failing, the issue is in the implementation — try a
different approach to the same direction before giving up. If
after reasonable effort no set of rules works, tell the team
honestly: "This direction's specific rules kept hitting [X
problem]. It may need a different approach than what I tried."

### After Pass 2

End with a brief cross-proposal comparison (only if 2+ proposals
were expanded) along the dimensions that matter for small teams:

| 维度 | A | B | ... |
|------|---|---|-----|
| 解决问题的直接程度 | | | |
| 做错了代价多大（可逆性）| | | |
| 后续维护/平衡负担 | | | |
| 能否与其他方案组合 | | | |

Also note: which proposals are mutually exclusive? Which could layer?

## How to Generate Good Proposals

**Solve the problem directly, without excess.** Prefer whichever
approach solves the problem most directly. Every new system, state
variable, or rule has a cost — don't add elements the problem doesn't
demand. If a simpler version works, use it. Don't favor one pattern
over another on principle.

**Push for range.** Include at least one conservative proposal (small
change, high confidence) and one ambitious one (bigger change, higher
payoff but more risk). The team needs real choices.

**Be concrete, not clever.** Name actual game objects, quantities, and
triggers. Don't invent compound nouns ("回声队列", "池子生态") that
sound like established vocabulary but are coined on the spot. "Each
pool remembers what was drawn recently and shifts the odds away from
repeats" is clearer than "回声队列机制."

**Check against known dead ends.** If the project has documented failed
approaches, check proposals against them.

## Iterating on Proposals

Proposals are conversation starters. Expect the user to react, and
be ready to revise.

### First: understand what the user is responding to

Before revising, figure out what they want changed:
- The core idea? ("方向不对")
- The scope or complexity? ("太重了")
- A specific rule? ("这条规则有问题")
- The tradeoff? ("风险太大")
If unclear, ask — a wrong interpretation wastes a revision cycle.

### Revision format

Iteration can happen at either pass. If the user reacts during Pass 1
(before selecting directions), revise using Pass 1 sections only —
方向概述, 如何解决问题. Don't escalate to full development just
because the user has feedback on a direction.

If the user reacts during or after Pass 2, use the full sections
(方案概述 → 规则变更 → 实际游戏中的样子 → 风险), but only rewrite
sections that actually changed. For unchanged sections, omit or say
"同上." Two sections must always be restated in full:
- **规则变更** — if any rule changed, restate the complete rule set,
  not just the diff. Partial diffs are hard to mentally merge.
- **风险** — revisions change the risk profile. Always re-evaluate.

### Common iteration patterns

**Simplify** ("太复杂了") — Remove elements, then check: does the
simplified version still solve the problem? If yes, show what was
removed and why it wasn't needed. If no, explain what breaks.

**Combine** ("把A和C结合") — State the combined version as a fresh
proposal with full 规则变更. Check for conflicts — two proposals
that work individually might contradict when merged.

**Redirect** ("方向对但规则不好") — Keep 方案概述, rewrite 规则变更.
Re-check 如何解决问题 — the causal link may have changed.

**Reject all** ("都不太行") — Don't generate more of the same. Ask
what was missing or wrong, then generate a fresh batch from the new
understanding.

**Deepen** ("就这个了，细化") — Full detail pass on one proposal:
- Walk through rules turn by turn, covering edge cases
- What if a player ignores it? Exploits it?
- What can only be answered through playtesting?
- Produce a version clear enough to prototype from
