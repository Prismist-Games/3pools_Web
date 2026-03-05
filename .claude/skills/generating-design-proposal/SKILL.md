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
Structural insight → Find Directions → Decompose → Design → Write Rules → Stress-Test
```

Steps 1-4 each take the previous step's output and make it more
concrete. Step 5 tests the result. If a step gets stuck, it
usually means the previous step's output wasn't clear enough —
go back and sharpen it.

**When to pause for the team:**
- After presenting directions (Step 1): which direction?
- After presenting conditions (Step 2): confirm, adjust, or add?
- After presenting candidates (Step 3): react — choose, adjust,
  or ask to explore more
- Steps 4-5 flow together: write rules then stress-test, present
  the combined result. The team reacts to the finished proposal.

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

### Step 3: Design

**Input:** The conditions from Step 2.

**What to do:** Design a concrete modification that satisfies the
conditions.

Filter ideas against the game's design positioning — target
audience, design values, complexity budget.

**Method:**

1. **Match conditions to elements.**
   *Focused:* For each condition, ask: can an existing
   element be modified or removed to satisfy this? Only
   introduce something new if nothing existing can serve.
   *Exploratory:* For each condition, find the element —
   existing or new — that best satisfies it. If the direction
   requires new elements, don't force existing ones to serve.
   In both modes, elements that appear across multiple
   conditions are strong candidates.

2. **Define candidates.** For each candidate:
   - Existing element → what exactly changes, when?
   - New element → what is it, what does it connect to, when?

3. **If no single mechanism covers all conditions**, combine —
   minimize moving parts.

When multiple candidates could each serve as the core, sketch
a design for each.

**Present each candidate** with:
- Which game element changes (or is introduced) and how it works
- How it solves the original problem (one-sentence summary)
- For each condition, trace the causal path from design element
  to condition. If no clear path exists, it's not covered.
- Potential risks — what might not work, what's uncertain

If notable ideas were considered but filtered out, briefly list
them with the reason (e.g., too complex, conflicts with design
positioning). This gives the team visibility into what was
explored.

**Example:**
- Conditions: pattern, telegraph, payoff, variation
- **Candidate A:** Spawns follow zone-weighted tables instead
  of flat random (zones already weight enemy types differently).
  - **Solves the problem because:** spawn composition becomes
    predictable from zone type → player can prepare loadout →
    encounters feel different based on preparation quality
  - pattern: zones already weight enemy types → making spawn
    tables follow zone weights gives spawns a learnable pattern
  - telegraph: scouting phase reveals zone type → player sees
    zone before choosing loadout → pattern is visible in advance
  - payoff: matching loadout to expected enemies gives damage
    bonus → correct reads produce better outcomes than guessing
  - variation: zone weights shift each run via existing proc-gen
    → pattern changes between runs, preventing memorization
  - **Risks:** if zone types are too few, patterns become
    trivially memorized; damage bonus needs tuning to feel
    meaningful without being mandatory

**Output:** A concrete design with: what changes, how it solves
the problem, condition coverage, and identified risks.

### Step 4: Write Rules

**Input:** The concrete design from Step 3.

Translate the design into standalone rule text — review Step 2
and check nothing was dropped.

Each rule should be specific enough that:
- A programmer can implement without clarifying questions
- A playtester can verify: "if this works, the player should
  observe [specific behavior]"

If rules come out vague, the design in Step 3 wasn't concrete
enough — go back.

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

**Deepen** ("this is the one, flesh it out") — Re-run Steps 3-5
with more edge cases in stress-test, more specificity in rules.
Produce a version clear enough to prototype from.
