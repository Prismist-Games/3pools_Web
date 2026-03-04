---
name: generating-design-proposal
description: >
  Generates concrete, rule-level game design proposals when the design
  problem is already defined and the team needs mechanic solutions —
  not exploration or diagnosis, but specific rule changes to evaluate.
  Use this skill when the user knows what they want to solve and is
  asking how to solve it as concrete mechanics. "Knows what they want
  to solve" means the user can name the problem — it does NOT require
  prior formal analysis. If the user states the problem clearly in
  their own words (e.g. "核心玩法缺乏扩展性", "订单系统没有深度"),
  that's sufficient to trigger this skill.
  PRIORITY RULE: When the user describes a problem AND requests
  solutions in the same message, this skill takes priority over
  analyzing-game-mechanic. The signal "give me proposals" outweighs
  "here's what feels wrong." Analyzing is only preferred when the
  user is explicitly asking to understand/diagnose WITHOUT requesting
  solutions.
  Trigger on "给我一些方案", "给我几个具体方案", "有哪些做法",
  "怎么改这个规则", "这个方向具体怎么实现", "有什么办法能",
  "怎么解决", "怎么改善", "怎么让...更...", "generate proposals
  for X", "what are some ways to do X", "give me ideas for", or
  when analysis has just concluded and the team is ready to generate
  solutions. Do NOT trigger when the user is only describing a problem
  without asking for solutions (use analyzing-game-mechanic instead),
  or exploring a feature direction broadly (use brainstorming instead).
---

# Generating Design Proposals

Generate concrete, rule-level design proposals for indie game projects.
Each proposal specifies exactly what changes in the game's rules — not
abstract concepts, but modifications a developer can evaluate and prototype.

## Before Generating

1. **Understand the relevant mechanics.** You need to know how the
   systems being designed for actually work — but only those systems.
   If the task is about emergency orders, understand emergency orders,
   not every rule in the game. If docs exist, read only the sections
   relevant to the design task. If not, ask the user to describe the
   affected mechanics briefly. Proposals built on misunderstood rules
   waste everyone's time.

2. **Understand the design task.** What problem or opportunity? What
   constraints? If the user arrives from prior analysis, build on that
   direction. If they arrive with a direct need, ask at most 1-2
   clarifying questions only if the need is genuinely ambiguous —
   generating proposals and letting the user react is faster than
   a long interview.

## Two-Pass Process

The process has two passes with different weights. Pass 1 is fast
— it finds directions worth pursuing. Pass 2 is thorough — it
designs specific rules for selected directions.

The reason for this split: designing specific rules and verifying
them against existing game systems is the most time-consuming part
of proposal generation. Doing this for 4-5 directions when the
team will only pursue 1-2 wastes most of the effort. Pass 1 lets
the team filter directions quickly based on structural reasoning,
so Pass 2's heavy work is focused where it matters.

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
的行为" — you know what changes (category behavior rules), where
they apply (merge/recycle), and the granularity (per-category, so
5 rules). You don't know the specific rules.

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

If you find yourself writing a risk that says the proposal would
break a core system, stop — that's a fatal flaw, not a risk. Go
back and fix the rules or try a different implementation of the
same direction. Risks that belong here:
- Tuning sensitivity (works in theory but numbers might be hard
  to balance)
- Perception challenges (the effect might be too subtle for players
  to notice or learn)
- Implementation cost for a small team (feasible but expensive)
- Interaction uncertainty with other systems (might create
  unforeseen dynamics that need testing)

If a proposal has no significant risk, simply omit this section.

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

**Effectiveness first, side effects second.** Judge every proposal
primarily on how directly and completely it solves the stated problem.
Judge it secondarily on its costs — added complexity, risk to existing
fun, maintenance burden. A new system that cleanly solves the problem
beats a tortured reworking of an existing mechanic. A small tweak to
existing rules that fully addresses the issue beats an elaborate new
system that also addresses it. Don't prefer one approach over another
on principle — prefer whichever solves the problem more effectively
with fewer side effects.

**Push for range.** Include at least one conservative proposal (small
change, high confidence) and one ambitious proposal (bigger change,
higher payoff but more risk). The team needs real choices.

**Be concrete, not clever.** Name the actual game objects, quantities,
and triggers — not abstract concepts or coined terms. "Add a resource
called Tension that rises when players skip pools" is concrete.
"Introduce a dynamic pressure system" is not. Don't invent compound
nouns like "回声队列", "池子生态", "世界状态板" — they sound like
established vocabulary but are made up on the spot, adding cognitive
load. "Each pool remembers what was drawn recently and shifts the odds
away from repeats" is clearer than "回声队列机制." If a concept
genuinely needs a shorthand for repeated reference within one proposal,
introduce it explicitly as a convenience label — don't present it as
though it's an established term.

**Don't add complexity the problem doesn't demand.** Every new system,
state variable, or rule has a cost — players must learn it, designers
must balance it, developers must build it. Before including any new
element in a proposal, ask: does this serve the stated problem, or
am I adding it because it feels like a feature? If a simpler version
solves the same problem, use the simpler version. When a proposal does
require added complexity, name what's being added and why the problem
can't be solved without it.

**Check against known dead ends.** If the project has a dead-end
registry or documented failed approaches, check proposals against it.
Don't walk into territory the team has already explored and rejected
unless you can explain why this approach avoids the same trap.

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
