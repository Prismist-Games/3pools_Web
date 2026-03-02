---
name: iterating-setting
description: >
  Develops and refines a video game setting through multi-turn dialogue. Use when a user
  has a setting direction and wants to deepen it — diagnosing problems, making concepts
  concrete, designing world elements, or testing internal logic.
---

# Iterating-Setting: Collaborative Setting Development

Takes a setting direction that already exists (however rough) and develops it through
structured dialogue. The goal is a setting with genuine internal logic, a theme that's
felt through play rather than explained, and a narrative core that makes the world compelling.

## Core Principles

**1. Theme is the seed, not decoration.**
Every element of the setting should grow from the theme. If you can remove the theme
and the setting still makes sense, the theme isn't integrated — it's wallpaper. The
theme should determine what kind of world this is, what tensions exist, what the
daily experience feels like.

**2. Internal logic over surface plausibility.**
A setting isn't good because you can explain it. It's good because it *makes sense
without needing to be explained*. Test: "Would someone living in this world do
what the player does, without needing a game designer to tell them to?" If the
answer requires elaborate justification, the setting has a structural problem.

**3. Feel over function.**
When thinking about how mechanics connect to the setting, start from what the
gameplay *feels like*, not what the player literally does. "Frequently choosing
1-of-3" isn't about "picking from three places" — it's about navigating uncertainty,
making imperfect choices with incomplete information. The setting should capture
that emotional texture.

**4. Spiral, don't map.**
Mechanics and setting should evolve together. Don't create a 1:1 mapping table of
mechanics to setting elements. Instead, let the setting suggest how mechanics
should feel, and let mechanics constrain what settings are possible. Each iteration
refines both. Early mapping locks you into rigid, brittle connections.

**5. Plain language for descriptions, depth for thinking.**
When describing a setting, be plain and concise — if the idea needs flowery language
to sound interesting, the idea needs more work. When *working through* an idea together,
depth is the point — follow implications to their end, surface tensions, show reasoning.
The question is always whether a response moves the thinking forward.

## Conversational Discipline

Read `references/collaboration-rules.md` and `references/current-state-protocol.md`
now. The first covers collaboration behavior (avoiding drift/echo/rediscovery, how
to share thinking, when to surface stuckness). The second covers dead-end registry
checking (clear vs. ambiguous match, answer shape priority). Both apply throughout
the session.

The setting-specific discipline below supplements those general rules:

**Understand a constraint fully before proposing directions from it.**
When the user defines a constraint ("the impact must be automatic, no player choice"),
the instinct is to immediately generate directions that satisfy it. Resist this.
Understanding what a constraint means and proposing directions that follow from it are
two separate steps — collapsing them produces directions that sound plausible but
haven't been thought through.

First, push the constraint to its edges: What exactly does it rule out? What does it
require of the world for it to hold? What tension or problem does it create that
didn't exist before? This is the thinking that makes a direction worth proposing.
Only once the constraint is clear should you ask what it opens.

Share your understanding of the constraint as you work it out — don't wait until
you've fully internalized it. The user can correct a wrong understanding mid-process,
which is faster than discovering you misread the constraint after proposing a direction.

**Test every link in a reasoning chain individually.**
When building a setting explanation, you'll naturally construct chains: A causes B,
B leads to C, therefore A leads to C. These chains are dangerous because fluency
masks weak links. A chain that "sounds right" as a whole can be built on a false
first step.

The test: take each link out of the chain and ask "does this hold on its own?"
For example: "you produced X → you're familiar with X → you're specialized in X
→ you're efficient at X" sounds smooth, but the first link (producing ≠ familiarity)
is hollow. The rest of the chain collapses with it.

This is especially likely when explaining WHY a setting rule exists. The urge is to
build a plausible-sounding justification chain. Resist it — check each link. If any
link requires the rest of the chain to seem reasonable (rather than standing on its
own), the whole chain is rationalization, not reasoning.

## Process

### Phase 1: Verify Context

At the start of a new conversation, you've just read current-state. Don't repeat
what's in it — instead, check if anything is unclear or seems inconsistent. If
everything makes sense, move on. If something doesn't add up, ask about that
specific point.

In a continuing conversation, skip this phase entirely.

Only do a full context inventory (direction, theme, mechanics, dead ends, what
works) if no current-state file exists yet.

### Phase 2: Diagnose

Skip if the user comes in with a specific question already — go straight to Phase 3.
This phase is for when the user has a vague feeling ("something feels off") and the
problem needs to be identified before work can start.

Common issues:

| Symptom | Likely Problem |
|---------|---------------|
| "It's logical but boring" | Missing a narrative core — the world has rules but no tension or hook |
| "Something feels off" | Internal logic gap — some element doesn't follow from the rest naturally |
| "Theme feels bolted on" | Theme was added after the setting, not grown from it |
| "Too much explanation needed" | Setting is too convoluted — simplify the foundational premise |
| "Not compelling enough" | Missing specificity — the setting is a category ("a company") not a world |
| "Mechanics feel forced into setting" | Premature mapping — went from mechanic to setting element without going through feel first |

Share your diagnosis honestly. Name the specific problem before proposing fixes.

### Phase 3: Develop

Work on one aspect at a time, based on what needs the most attention. Don't try
to solve everything in one response.

**When dead ends accumulate, synthesize before generating.**

When 3+ dead ends relate to the same open question — even if they're spread across
different failure types in the registry — the generate-and-check approach breaks
down. Each cycle is slow because checking against many negative constraints is
serial work.

The fix: translate the dead ends into a positive description of what the answer
must look like. Group dead ends by failure *reason* (not surface content), extract
what each group categorically excludes, invert each exclusion into a positive
requirement, combine into one description — the answer shape.

Present the synthesis to the user before generating directions. The user may spot
errors (misclassified dead end, wrong inversion, too-tight constraint). Getting
the shape wrong leads to a dead search; getting it right makes the answer obvious.

**Synthesize once, then reuse.** After the user confirms the shape (or corrects
it), write it into current-state's 当前思考链 as a named step (e.g., "答案形状：
..."). From that point on, work directly from the shape — don't re-derive it
each turn. Only re-synthesize if new dead ends invalidate the existing shape.

**When the shape itself is a dead end** — if no direction fits the answer shape,
the shape's requirements may be contradictory. This means one of the inputs is
wrong: either a dead end was misclassified (its failure reason doesn't actually
apply), or a confirmed decision needs to be reopened. Surface this to the user:
show which requirements conflict and which inputs (dead ends or confirmed decisions)
produced them. Don't keep generating directions against an impossible shape.

For the typical development order (theme → premise → logic → narrative core →
specificity → mechanic resonance), see `references/development-order.md`. Always
follow the user's direction over this list.

### Phase 4: Validate

These tests can be used at any point during development as diagnostic tools — not
only at the end. When a direction feels shaky, running one of these tests often
reveals the specific gap faster than continuing to iterate.

- **The elevator test**: Can you describe it in 2 sentences and have someone
  interested? If not, it's not vivid enough.
- **The "why" chain**: Pick any element. Ask "why?" three times. If you hit
  "because the game needs it" before hitting a world-logic reason, there's a gap.
- **The visualization test**: Can you picture a specific scene of someone in this
  world doing what the player does? Not a generic scene — a specific moment with
  specific details. If not, the setting is still too abstract.
- **The theme test**: If you stripped all explicit theme references, would the
  theme still come through in how the world works and what the player does?

## File State Management

Two design documents track the setting:

- **`design_docs/setting-current-state.md`** — Snapshot of all confirmed decisions,
  dead-end registry, open questions, reasoning chain. Read at the start of every NEW
  conversation. For format, writing rules, and dead-end registry usage, read
  `references/current-state-protocol.md`.

- **`design_docs/setting-evolution-log.md`** — Session history in chronological order.
  Read at the start of a NEW conversation only if current-state doesn't give enough
  context. For entry format and maintenance rules, read
  `references/evolution-log-protocol.md`.

Don't re-read routinely during the same conversation. If the session gets long and
you're unsure whether something is confirmed, dead-ended, or open, re-read
current-state rather than guessing — a wrong premise is more costly than a file read.

## Edge Cases

- **User has only a vague feeling** — Help them articulate it through targeted
  questions. "What do you want the player to feel?" is more useful than "describe
  your setting."
- **User keeps changing direction** — Pause and summarize what's been explored.
  Help them see the pattern in their preferences. Often there's a consistent
  underlying desire beneath shifting surface ideas.
- **Setting is getting too complex** — Flag it directly. "This is requiring too
  much explanation. What if we simplify the foundation?" Complexity should
  emerge from a simple core, not be the core.
- **Mechanic conflict** — If a core mechanic genuinely doesn't fit the setting
  direction, say so. Don't paper over the conflict. Either the setting needs
  to shift or the mechanic needs to be acknowledged as a pure game element.
