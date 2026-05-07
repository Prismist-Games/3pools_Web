---
name: analyzing-game-mechanic
description: >
  Analyze game mechanics to produce design insights before any design decisions
  are made. Use this skill whenever the team needs to: (1) diagnose why an
  existing design feels wrong — tracing player feedback or designer intuition
  to root causes, or (2) define a new design task before generating solutions —
  establishing purpose, constraints, and evaluation criteria. Trigger whenever
  someone discusses game mechanic problems, player experience issues, wants to
  understand why something isn't working, or is preparing to design something
  new. Also trigger on phrases like "something feels off", "let's figure out
  what's going on", "before we start designing", "why isn't this working",
  "we need to analyze this", "这里感觉不对", "我们分析一下", "这个机制有问题",
  "我们先搞清楚再做", "为什么这里不好玩", "在开始设计之前先想清楚".
  This skill produces understanding and direction, never concrete solutions —
  solution generation belongs to a separate skill.
---

# Analyzing Game Mechanic

## 1. Trigger & Positioning

This skill is the first step in a series of game design skills. It handles
the work that must happen before any design decisions: making sure we truly
understand what we're facing.

**This skill produces design insights — understanding and direction. It does
not produce concrete design solutions.** Solution generation belongs to a
separate, downstream skill.

### How this skill operates

This is not a procedure that runs once and ends. It's a mode of thinking
that stays active throughout a design analysis conversation. Insights
emerge gradually through dialogue — the team may circle back, dig deeper
into something, or shift focus as understanding develops. Sections 2-4
below are tools to draw on throughout the conversation, not sequential
steps to complete.

### Two scenarios

**Scenario A: An existing design has a problem.**
Starting point: a feeling, player feedback, or an observed issue — "this
feels too hard", "this system isn't extensible", "players aren't engaging
with this the way we expected."
Goal: trace the surface-level symptom to its structural root cause, and
identify the direction that future changes should take.

**Scenario B: A new design task needs definition.**
Starting point: a need the game has, or the team's creative drive to build
something new — "we need a new boss", "we want to add a skill system",
"this area of the game feels empty."
Goal: before anyone starts proposing solutions, establish clearly — why do
we need this? What must it accomplish? How does it relate to what already
exists? What criteria will we use to judge whether a proposal is good?

## 2. Establishing Context

Before analyzing anything, understand the game and where the current
discussion fits within it.

### Read the documentation first

- `design_docs/game_rules.md` — the game's mechanics, systems, and rules.
- `design_docs/gameplay_progress.md` — the team's design intent and current
  thinking on each system. This matters because analysis needs to understand
  why each system exists and what the team is open to changing.
- Source code (when rules docs aren't detailed enough for the specific
  area under discussion).

Read what's relevant to the current discussion, not everything. If the
team is talking about the order system, you don't need to deeply understand
the skill system.

### Situate the topic within the whole

For whatever part of the game is being discussed, understand:
- **What it does** in the game — its function and purpose.
- **Where it sits** — what comes before it, what comes after it, what
  depends on it, what it depends on.
- **Why it was designed this way** — the intention behind its current form,
  if known.
- **What surrounds it** — adjacent systems and how they interact with it.
  Changes to one part ripple into others. You can't analyze a mechanic
  in isolation.

### When context is missing, ask

Documentation won't cover everything. If you're unsure about any of the
above — the purpose behind a design choice, why something is the way it
is, whether a system is considered settled or open to change — ask the
team directly. Don't guess. Don't fill gaps with assumptions.

Be specific in your questions. Not "can you tell me more about the pool
system?" but "the pool system currently uses fixed item lists per pool —
was that a deliberate design choice, or is it a placeholder that might
change?"

## 3. Locking Down Intention

### For Scenario A (existing problem)

Pin down what exactly feels wrong, and for whom.
- "The order system has problems" is not an intention.
- "Completing orders doesn't give players a satisfying sense of progress" is.

### For Scenario B (new design task)

Pin down why this needs to exist and what experience it should create.
- "We want to add a skill system" is not an intention.
- "We want to give players long-term growth that the current loop doesn't
  provide" is.

### Don't guess — dig

If the team's intention is vague, don't fill in the blanks. Push back:
- "You said this 'doesn't feel right' — what should it feel like vs. what
  does it actually feel like?"
- "What would change for the player if this were solved?"

If the team struggles to articulate, help them think through it — ask
questions that surface what they sense but haven't put into words yet.

### Anchor

State the intention explicitly before proceeding. All subsequent analysis
serves this intention. If a line of thinking doesn't connect back to it,
flag it as a tangent.

## 4. Analysis

Start from the specific. Work toward structural understanding. Every
claim must show its reasoning.

### Analytical Lenses

Thinking tools, not a checklist. Pick what's relevant, combine freely.

**Decomposition**
Break a complex whole into its constituent parts — a mechanic, an
experience, a feeling, a system flow. The goal is to isolate which
part actually matters for the current question.

**Abstraction**
Strip surface details to reveal underlying structure. Ask "what is
this, really?" A pool draw is evaluating conversion efficiency under
uncertainty. A health bar is remaining tolerance for mistakes. The
right level of abstraction makes the real dynamics visible.

**Experience Tracing**
Follow the causal chain: system structure → player behavior → player
experience. When something "feels off," trace backwards — what is the
player doing, and what structural property drives that behavior?

**Player Perspective**
What is the player actually thinking, feeling, or attending to at a
given moment? Not what the design intends — what actually happens.
Decompose their decision process: what are they evaluating, what
information feeds in, what mental work are they doing, and is that
mental work engaging?

**Reframing**
Look at the same situation from a different angle. A difficulty problem
might actually be a feedback problem. A content shortage might actually
be a structural limitation. Reframing often unlocks analysis that was
stuck.

**Systemic Mapping**
Trace relationships: dependencies, feedback loops, leverage points.
A mechanic sits within a web of connected systems — changes propagate.
Map the connections relevant to the current question.

**Dynamics Over Time**
How does this system behave across a play session, across progression,
across repeated engagement? Look for how the experience evolves — where
it builds, where it flattens, where it breaks down.

**Constraint & Tension**
Identify conflicts, tradeoffs, and hidden limitations. What can't
coexist in the current design? Finding the real constraint often
reframes the entire problem.

**Comparative Analysis**
Analyze other games to understand your own — not to import solutions.
Apply the same analytical rigor to the reference game: decompose its
structure, trace its experience, identify what's structurally similar
and different from yours. Extract principles, not implementations.

Dangers: "they did X so X works" (context differs); letting another
game's framing narrow your own thinking; confusing surface resemblance
with structural similarity.

### Root Cause Discipline

For Scenario A: don't stop at the first plausible explanation.
- Is this the cause, or a symptom of something deeper?
- If addressed directly, would the problem resurface elsewhere?
- Where is the actual leverage — the point where change addresses
  the root, not the surface?

## 5. Collaboration

This skill is not a one-way output. At least half its value is in
thinking together with the team — helping them see their own design
more clearly.

### Ask when unclear

If the team's description is vague or ambiguous, ask immediately.
Don't interpret on their behalf and quietly proceed. A wrong
assumption early compounds into a useless analysis.

### Show your reasoning

Don't present conclusions — present the thinking that led to them.
The team should be able to follow each step, challenge it, and
redirect if you've gone off track.

### Help the team think

When the team is stuck or struggling to articulate something, your
job is to help them get there — not to fill the gap with your own
answer. Ask questions that surface what they sense but haven't yet
put into words. Offer framings they can react to: "Would you say
the issue is more like X or more like Y?"

### Stay connected to the team's actual concern

It's easy for analysis to drift into interesting-but-irrelevant
territory. Regularly check: is this line of thinking still serving
the intention we established? If not, flag it and refocus.

## 6. Guiding Principles

Return to these when the analysis feels stuck or unfocused.

**Experience over system.** Mechanics matter insofar as they produce
experiences. If you're debating system parameters without connecting
them to player experience, you've lost the thread.

**Specificity over generality.** "The progression feels slow" is not
analysis. "Between level 5 and 8, the player has no new decisions,
creating a dead zone" is.

**Name your assumptions.** Every design is built on assumptions about
player behavior and motivation. Make them explicit — that's the first
step to questioning them.

**Respect what play reveals.** When observation contradicts theory,
update the theory.

**Thematic coherence.** A mechanic that's engaging but thematically
disconnected from the game's identity is a liability. Ask not just
"is this interesting?" but "is this the right kind of interesting
for this game?"

**Scope-awareness.** This is a 3-person indie team. A design that
requires 6 months of content creation to work is not viable,
regardless of elegance. Scope-awareness is a design skill, not a
compromise.

## 7. Output: Design Insight

Insights emerge throughout the conversation, not just at the end.
When an insight crystallizes — whether mid-discussion or after extended
analysis — make it explicit so the team can confirm, challenge, or
build on it.

Insights may take different forms depending on the situation:

- **Problem reframing**: "The issue isn't X, it's Y."
- **Structural discovery**: "This system has property Z, which is
  why the experience breaks down here."
- **Experience diagnosis**: "What the player is actually doing/
  thinking here is fundamentally different from what we intended."
- **Constraint identification**: "These two goals are in tension
  under the current structure."
- **Direction**: "Changes should address X rather than Y" — a
  direction, not a specific solution.

An insight is ready when it is:
- **Precise** — points to something specific, not a vague area
- **Grounded** — connected to the analysis with visible reasoning
- **Actionable** — a downstream design process can use it as a
  starting point

## Case Archiving

When the team says "archive this case", save the current analysis to
`design_docs/reference/design_analysis_cases/` as a markdown file.

### What to capture

**The facts:**
- The original intention/question
- Key context (what part of the game, what state it was in)
- The resulting insights and directions

**The thinking process:**
- The analysis path — what lenses were applied, in what order, and why
- Key pivots — moments where understanding shifted, where an initial
  framing was abandoned for a better one
- The team's input that shaped direction — what did they push back on,
  what did they confirm, what distinctions did they draw? These reveal
  the team's design taste and priorities.
- Dead ends — lines of reasoning that were explored and discarded, and
  why. These are as valuable as the conclusions.

The goal is not to transcribe the conversation, but to reconstruct
**how we arrived at the conclusions** — so that future analysis can
build on the team's evolving way of thinking, not just their past
answers.

## References

This section is a directory of documents that support analysis.
Items marked "待填充" need to be created or populated by the team.

| Document | Path                                                                     | Status    |
| -------- | ------------------------------------------------------------------------ | --------- |
| 游戏玩法文档   | `design_docs/game_rules.md`                                              | 已有        |
| 玩法设计进度   | `design_docs/gameplay_progress.md`                                       | 已有        |
| 叙事设定文档   | —                                                                        | 待填充（路径待定） |
| 设计原则     | `.Codex/skills/analyzing-game-mechanic/references/design_principles.md` | 文件已创建，待填充 |
