---
name: mechanic-to-setting
description: >
  Generates thematic settings from video game mechanics. Trigger when users describe gameplay
  systems and ask what the game could be "about", want to re-theme, or need narrative-mechanics
  fusion. Digital games only.
---

# Mechanic-to-Setting: Deriving Theme from Gameplay

Takes mechanics that already exist (or are being prototyped) and generates setting concepts
where the theme *emerges from* what the game mechanically does. The goal is narrative-mechanics
fusion: settings where every mechanic feels like a natural expression of the fiction.

Scope ends at setting concept generation. If the user already has a chosen direction and wants
to deepen it, help them directly rather than generating more options.

Read `references/principles.md` before generating settings — it contains the core thinking
framework (feel over function, internal logic, spiral not map, pillars generate questions,
mechanics as narrative levers). Read `references/examples.md` to calibrate output format and
depth.

## Process

### Step 1: Understand the Game

Before generating settings, build a foundation. Write this analysis as the first section of
your output.

**Feel & Tone** — Inhabit the player's experience. What's the emotional texture (anxious
decision-making? meditative sorting?)? What's the emotional rhythm (choose → hope → react →
adapt)? What does the player *feel like* they're doing when the game works?

Then make tone concrete: pacing, mood, and atmosphere as *directorial direction*. Not "tense
atmosphere" but "oppressively bright, never 100% safe." The tone should be specific enough that
an art director could start working from it.

**Thematic Pillars** — If the user provides a theme, treat it as the single most important
constraint. Understand it deeply — "uncertainty" could mean existential dread, playful chaos,
or quiet resignation. If no theme is provided, identify what the gameplay feel already
suggests. Express the theme as 2-4 short pillar statements — decision-making tools, not
descriptions. "The sea is dangerous" is a description. "Every interaction with the sea costs
something" is a pillar. Everything that follows is tested against these.

**Verb Inventory** — List every player action. For each verb, note what thematic weight it
*could* carry. "Draw from a pool" isn't just a mechanic — it could mean gambling, foraging,
choosing who to trust. Ask: "What verbs would reinforce the themes and tone?" Don't create
mapping tables. Mechanics will evolve; feel and core loop won't.

**Constraints** — Platform, scope, team size, art pipeline. Frame these as creative inputs, not
limitations.

### Step 2: Design Questions

After understanding feel/tone/theme/verbs, generate 4-6 design questions the setting must
answer. Derive them from the thematic pillars and verb inventory. Examples:

- "Why does the player draw from *these* sources rather than others?"
- "What makes the time pressure feel natural, not arbitrary?"
- "Why can't the player just take everything?"

A good setting answers these questions so naturally you forget they were questions. If a setting
requires elaborate justification to answer any of them, it's the wrong setting. See "Pillars
Generate Questions, Not Answers" in `references/principles.md`.

### Step 3: Generate Settings

Generate 5-8 setting concepts.

**For each concept:**

1. **Setting Name** — Evocative, 2-4 words.
2. **Elevator Pitch** — One sentence. Emotional experience, not mechanical description.
3. **Why This Fits** — How do key mechanics become narrative levers in this world? For each
   core verb, show how it serves the thematic pillars — not as a mapping table, but as a brief
   explanation of why someone in this world naturally does what the player does. Apply the verb
   test: when the player performs each gameplay verb, does it carry narrative meaning here? If
   the answer requires elaborate justification, the setting fails. See "Mechanics as Narrative
   Levers" in `references/principles.md`.
4. **A Day in This World** — What decisions, in what order, what makes them hard.
5. **Sensory Identity** — Visual style, color palette, soundscape, music, screen feel. Include
   at least one concrete directorial statement — not just vibes. "Oppressively bright white,
   camp feels safer but never 100% safe" is the level of specificity to aim for.
6. **Implied Systems** — What new storytelling systems or features does this setting *suggest*?
   If the setting naturally implies a journaling system, a reputation mechanic, a fear/sanity
   tracker — note it in 1-2 sentences. This reveals narrative depth AND scope implications.
7. **What Could Go Wrong** — The most likely dead end or tension during development. One
   sentence. Tone mismatch, playability conflict, and "logical but not interactive" are the
   three most common patterns. See "Anticipate Dead Ends" in `references/principles.md`.

### Step 4: Audit and Rank

**Theme audit** — For each concept, ask:

1. "If I strip away all narrative wrapper and lore, does the theme still come through in what
   the player does and feels?" Flag any concept where the theme lives only in backstory.
2. Mechanical storytelling: "If you watched someone play silently with no text, would the theme
   come through in what they're doing?"
3. Narrative lever coverage: "Do ALL key mechanics serve at least one pillar, or are some
   mechanics narratively orphaned?" If a mechanic doesn't serve a pillar, ask whether it
   *could* in this setting.

Be honest — at least one concept should get a conditional or failed rating if you're being
rigorous.

**Rank** by: naturalness (least explanation needed), thematic depth (felt through play),
vividness (immediately imaginable).

For each ranked concept, note:
- **How It Speaks** — which channels carry narrative: *mechanical*, *environmental/visual*,
  *audio*, *text*. One line: "Speaks primarily through [channel]."
- **Narrative depth** — what questions does the setting raise? How much is there beneath the
  surface for the designer to explore?
- **Feasibility** — art pipeline, audio identity, scope alignment for indie context.
- Flag settings that open interesting design space or where mechanics would feel awkward.

Frame rankings as starting points with known tensions, not "best to worst." Note genuine
uncertainties and what debates the team will face. See "No Right Answers" in
`references/principles.md`.

### Step 5: Design Pillars (Top Concept)

For the top recommendation, generate 3-5 thematic pillars. Each pillar is a one-sentence
decision-making tool. When the team faces any design question — from combat balance to menu
aesthetics — they consult these pillars.

Frame: "These are not descriptions of the game. They are decision-making tools. When you're
unsure about a design choice, ask which option better serves these pillars."

## Output Format

```
## The Feel of This Game
[Feel & tone]
**Thematic Pillars:** [...]
**Verb Inventory:** [...]
**Constraints:** [...]

## Design Questions
[4-6 questions]

## Setting Explorations
### [Setting Name]
**Elevator Pitch** — ...
**Why This Fits** — ...
**A Day in This World** — ...
**Sensory Identity** — ...
**Implied Systems** — ...
**What Could Go Wrong** — ...
(×5-8 concepts)

## Theme Audit
[Per-concept]

## Recommendations
[Ranked]

## Design Pillars ([Top Concept Name])
[3-5 pillars]
```

## Reminders

- **Avoid the obvious.** Push past the first association. Hades, Papers Please, Unpacking —
  unexpected thematic homes for familiar mechanics.
- **Present, don't sell.** No meta-commentary ("this transforms a simple mechanic into...").
  Plain, concrete language. If you write "echoes of possibility," ask what that actually means.
- **Respect the scope.** A cozy shop is complete at small scale; a galactic empire is not.
- **Consider failure.** What does losing *mean* in this setting? The best settings make failure
  feel thematic rather than punitive.
- **Settings must have internal logic.** If any gameplay constraint requires "because the game
  mechanic requires it" as justification, the setting is a skin, not a setting. See Internal
  Logic in `references/principles.md` for the two-level test.

## Edge Cases

- **One or two mechanics only** — Ask what other systems exist before generating.
- **Very generic mechanics** — Focus on how systems interact and what that *feels like*.
- **Reference games as input** — Extract the referenced games' *feel*, not their surface
  mechanics. Aim for this game's own thematic identity.
- **User wants to iterate on a chosen setting** — Acknowledge the choice, summarize what's
  established, and help them directly. Setting exploration is done.
