---
name: generating-design-proposal
description: >
  The primary skill for game design problem-solving. Generates concrete,
  rule-level game design proposals. Trigger when the user names a design
  problem and asks for solutions, or after prior analysis concludes.
  Formal analysis is NOT required — a clearly stated problem suffices.
  This is NOT software development brainstorming — it is structured game
  design work that produces playable rule proposals, not implementation
  plans or design docs.
---

# Generating Design Proposals

## Before Generating

1. **Check the input is specific enough.** The input should point
   to a specific system, identify a specific problem, and explain
   why it causes the deficiency.

   Ready: "enemy spawns are purely random, so the player can't
   prepare or adapt — every encounter feels the same."

   Not ready: "combat lacks depth" — could mean multiple different
   structural problems.

   If not at this level, use analyzing-game-mechanic first, then
   continue into proposal generation. One continuous flow, not a
   redirect.

   **Do NOT read game docs first and then fill in what the user
   probably means.** The check must happen on the user's words alone.

2. **Understand the context** — read docs for the systems the task
   touches (not everything). Clarify constraints and scope. If no
   docs, ask the user to describe the affected mechanics briefly.

## Thinking Mode

Ask the user which mode to use before proceeding:

- **Focused** (default) — work within the current system's
  framework. Modify, adjust, or remove existing elements.
- **Exploratory** — question hidden premises to find
  directions beyond the current framework.

The mode shapes how directions are generated (Step 1) and how
design candidates are constructed (Step 3). Mode switching is
possible mid-process — see below.

### Mode Switching

During any step, if a mode switch would serve the problem
better, flag it and ask the team before switching.

**Focused → Exploratory**

Trigger: in Step 1, all intervention points are blocked —
change is too costly, doesn't fully solve the problem, or
conflicts with constraints.

What to carry: which intervention points were tried and why
they failed. This directly scopes Exploratory's premise
search — you already know which parts of the framework
are blocking progress.

Entry point: Exploratory Step 1, but skip blind enumeration.
Start from "why did Focused fail?" to find the limiting
premises.

**Exploratory → Focused**

Trigger: challenging a premise or drawing an analogy has
opened new design space — new elements or connections become
available that weren't before.

What to carry: the challenged premise and the new space
it opens.

Entry point: Focused logic applied to the expanded framework.
"Current system" = original system + newly available space.
Find the smallest effective change within this larger frame.

**In both cases:** state what triggered the switch and what
you're carrying into the other mode. Proceed only after team
approval.

## From Insight to Rules

```
Structural insight → Find Directions → Decompose → Generate Candidates → [team chooses] → Develop into Rules → Stress-Test
```

Each step takes the previous step's output and makes it more
concrete. If a step gets stuck, it usually means the previous
step's output wasn't clear enough — go back and sharpen it.

**When to pause for the team:**
- After presenting directions (Step 1): which direction?
- After presenting conditions (Step 2): confirm, adjust, or add?
- After generating candidates (Step 3): choose, adjust, or
  ask to explore more
- Steps 4-5 flow together: design, write rules, then
  stress-test. The team reacts to the finished proposal.

**Use the game's own vocabulary.** Name actual game objects and
triggers. Don't coin compound nouns or abstract jargon — think
from this game's structure, not from other games.

**Let quantity follow substance.** Whether it's directions,
candidates, or conditions — present as many as genuinely exist.
Don't pad to hit a number or force pairs for comparison.

**Design for decisions, not systems.** Check what the player
is doing differently because of this change. If there's no new
decision, or the right answer is always obvious, the design
adds complexity without adding gameplay. This is a structural
check — whether decisions exist and are meaningful. Whether
they feel good is a playtesting question.

**If the user arrives with prior analysis**, figure out which steps
it already covers. Use those answers as given and start from the
first step not yet covered.

### Step 1: Find Directions

**Input:** A structural insight — a specific problem in a
specific system with an explanation of why it causes the
deficiency. If prior analysis exists, also take its findings.

*Focused:* If the input already identifies causes, use that
chain directly. If not, trace backwards from the symptom to
its causes. Each cause is a potential intervention point. At
each point, ask: can this be modified, adjusted, or removed
to solve the problem? Prefer the smallest effective change
closest to the root cause.

*Exploratory:*

1. **Locate hidden premises.** The problem describes a
   specific deficiency in a specific system. Around that
   system, the current design takes things for granted —
   premises that, if changed, would make the problem
   solvable in ways the current framework doesn't allow.

   To find them, look at the system the problem lives in
   and ask three questions:
   - **Structure:** what elements exist and how are they
     connected? What's treated as fixed?
   - **Scope:** what's considered part of this system and
     what's considered outside it?
   - **Logic:** why does the system work the way it does?
     What reasoning justifies the current design?

   For each premise found, ask: if this were different,
   could it change how the problem works? Drop premises
   that have no connection to the problem. For the rest,
   articulate what direction challenging it would open.

2. **Cross-domain analogy** (optional). If challenging
   premises hasn't produced a strong direction, or if the
   problem resembles a tension seen in other systems —
   ask: how do those systems resolve it? Import the
   structural principle, not the specific mechanism.

For each direction, state what it changes (or what premise
it challenges) and how that addresses the problem. If multiple
viable directions exist, present them and let the team choose —
different directions lead to fundamentally different designs.
Don't evaluate or rank; the team decides. If only one direction
is viable, state it and move on.

**Exploratory example:**
- Problem: "enemy spawns are purely random, so the player
  can't prepare or adapt"
- Premises located (around the spawn system):
  - Spawns must be determined at encounter start
  - The player's only response is pre-encounter loadout
  - Spawn composition is the main variable
  - Encounters are self-contained (no carry-over between them)
- Filtering: "encounters are self-contained" — changing this
  doesn't affect how spawns feel random. Dropped.
  The other three are connected to the problem.
- Challenging premise "player's only response is
  pre-encounter loadout" → what if the player could
  influence spawns during the encounter? Direction: give
  the player mid-encounter tools to redirect or filter
  what spawns.

**Output:** A chosen direction.

### Step 2: Decompose

**Input:** The chosen direction from Step 1.

Break the direction into the conditions that must be
simultaneously satisfied for it to actually work.

1. **Walk forward from the change.** Start from "the change
   is made" and step toward "the problem no longer exists."
   At each step, ask: does this automatically lead to the
   next step, or is something else needed? Each gap is a
   condition.

2. **Check completeness.** If every condition were perfectly
   satisfied, would the problem definitely be solved? Try to
   imagine a scenario where all conditions hold but the problem
   persists. If you can, a condition is missing.

3. **Check relationships.** Dependencies (A needs B to work)?
   Conflicts (satisfying A makes B harder)?
   Note these — they constrain Step 3's design space.

**Example:**
- Insight: "enemy spawns are purely random, so the player can't
  prepare or adapt — every encounter feels the same"
- Possible directions: make spawns follow readable patterns /
  give players tools to influence what spawns / make encounters
  feel different even with random spawns
- Team chose: make spawns follow readable patterns
- Conditions:
  - Spawns have a pattern the player can learn (**pattern**)
  - The pattern is visible before the encounter starts
    (**telegraph**)
  - Correct reads lead to meaningfully better outcomes than
    guessing (**payoff**)
  - The pattern varies enough to stay interesting
    (**variation** — found via completeness check: without
    this, once learned the pattern becomes autopilot)
- Telegraph depends on pattern; payoff depends on both.
  No conflicts.

**Output:** Conditions with noted dependencies and conflicts.

### Step 3: Generate Candidates

**Input:** The conditions from Step 2.

Find candidate mechanisms that could satisfy the conditions.
Filter against the game's design positioning — target audience,
design values, complexity budget.

*Focused:* Look at existing elements first. Can something be
modified or removed to satisfy the conditions? Only introduce
something new if nothing existing can serve.
*Exploratory:* Find the element — existing or new — that best
satisfies the conditions. If the direction requires new
elements, don't force existing ones to serve.

**Present each candidate** with:
- What it is — which game element changes or is introduced,
  and the core mechanism
- How it solves the problem — the logic from this change
  to the problem being resolved

Keep candidates lean. The goal is to give the team enough
to choose a direction, not to fully design each option.

**Output:** The team's chosen candidate.

### Step 4: Develop into Rules

**Input:** The chosen candidate from Step 3 and the conditions
from Step 2.

Flesh out the chosen candidate into a complete design, then
translate it into standalone rule text.

1. **Deepen the design.** For each condition, trace how the
   candidate satisfies it. If a condition isn't covered,
   extend the design or combine with another mechanism —
   minimize moving parts.

2. **Write rules.** Each rule should be specific enough that:
   - A programmer can implement without clarifying questions
   - A playtester can verify: "if this works, the player
     should observe [specific behavior]"

   If rules come out vague, the design isn't concrete enough
   — go back and sharpen it.

3. **Present the proposal** with:
   - The complete design and rule text
   - For each condition, how the design satisfies it
   - Potential risks — what might not work, what's uncertain

**Output:** A concrete proposal with rule text, condition
coverage, and identified risks.

### Step 5: Stress-Test

**Input:** The rule text from Step 4.

**What to do:** Pressure-test the precise rules, not the concept
in your head. You designed and wrote this — your instinct is to
confirm it works. Fight that. Look for how it breaks.

1. **Condition coverage.** Go back to Step 2's conditions. Does
   each rule actually deliver what was claimed? Check against the
   rules as written, not your memory of the design intent.

2. **Edge cases and degenerate states.** What happens at extremes?
   Does the mechanism break down, become trivial, or produce
   unintended outcomes?

3. **System interactions.** Which adjacent systems does the change
   touch? Does it create unintended loops, exploits, or conflicts?

4. **Strategy check.** Under different player strategies, do the
   rules still work?
   - The player always picks the safest option
   - The player purely maximizes efficiency
   - The player ignores or misreads the new information

**If issues found:** Locate what broke. Go back to Step 3 to
adjust the design or Step 2 to check the conditions.

Flag what can only be confirmed through playtesting — feel,
pacing, whether information is actually noticeable. List these
as open questions, not validated claims.

## Iterating on Proposals

Proposals are conversation starters. Expect the user to react.

Before revising, figure out what the feedback targets — the
conditions, the design, or a specific rule? If unclear, ask.
A wrong interpretation wastes a revision cycle.

Identify which step is affected and revise from that step
downward — changes cascade. Always restate rule text in full,
not as diffs.

### Patterns worth noting

**Simplify** ("too complex") — Remove elements, then check: does
the simplified version still solve the problem?

**Combine** ("combine A and C") — State as a fresh proposal with
full rule text. Check for conflicts.

**Reject all** ("none of these work") — Don't generate more of the
same. Ask what was missing, then start fresh from Step 1.

**Deepen** ("this is the one, flesh it out") — Re-run Steps 4-5
with more edge cases in stress-test, more specificity in rules.
Produce a version clear enough to prototype from.
