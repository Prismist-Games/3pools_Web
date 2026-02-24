---
name: mechanic-to-setting
description: >
  Derives thematic settings from existing video game mechanics. Given mechanics (resource systems,
  progression loops, win/fail conditions, player interactions), generates a ranked list of setting
  concepts where theme emerges organically from gameplay. Use whenever a user has game mechanics,
  prototypes, or gameplay loops and wants a fitting theme, setting, or narrative wrapper. Trigger
  on "re-theming", "finding a theme for my mechanics", "narrative-mechanics fusion", "what setting
  fits this gameplay", or when users describe abstract systems and ask what the game could be
  "about". Activate even for casual mechanic mentions (e.g., "I have a roguelike with deckbuilding
  and fatigue"). Focused on digital/video games, not board games or tabletop.
---

# Mechanic-to-Setting: Deriving Theme from Gameplay

## Purpose

Most game design advice starts with theme and bolts mechanics on top. This skill works the
other direction — it takes mechanics that already exist (or are being prototyped) and generates
setting concepts where the theme *emerges from* what the game mechanically does. The goal is
narrative-mechanics fusion: settings where every mechanic feels like a natural expression of the
fiction, not an abstraction layered on top.

This is particularly valuable for indie developers working on light strategy or systems-driven
games, where a small number of core mechanics need to carry both strategic depth and thematic
resonance — and where the setting shapes everything from art direction to audio design to UI
language.

## Context: Video Games, Not Board Games

This skill is designed for digital games. This matters because:

- **Dynamic systems**: Video games can have real-time feedback, procedural content, ambient
  systems running in the background, and state that persists across sessions. Settings should
  leverage what digital medium uniquely enables.
- **Sensory palette**: Theme in video games isn't just visual — it's sound design, music,
  screen feel (juice/feedback), lighting, camera behavior, particle effects. A good setting
  suggestion should evoke a *sensory experience*, not just a visual concept.
- **UI as fiction**: Menus, HUD elements, resource displays, and transitions are all part of
  the thematic experience. The best settings suggest diegetic or semi-diegetic UI approaches
  where the interface feels like part of the world.
- **No physical constraints**: Unlike tabletop, there are no component costs, no box size limits,
  no "how does this look on a shelf" concerns. But there ARE production constraints for indie
  teams — art pipeline complexity, animation requirements, technical scope.
- **Player embodiment**: Video game players typically inhabit a perspective (first-person, isometric,
  side-view, etc.). The setting needs to work with how the player sees and moves through the game.

When generating settings, always think in terms of *how this feels to play on a screen* — not
how it looks on a table.

## Input Handling

Users will provide mechanics in varied formats. Adapt to whatever they give you:

**Casual description** — "I have a game where you manage resources, build up a base, and defend
against waves." Extract the core mechanical verbs and structures before proceeding.

**Rules/systems list** — A structured set of systems or a prototype design doc. Identify the
mechanical pillars (the 3-5 systems that define the gameplay identity).

**Reference games** — "It plays like Into the Breach meets Slay the Spire." Research/recall the
referenced games' core mechanics and use those as the mechanical foundation.

**Design documents** — GDDs with mechanics specified. Read the document, extract the mechanical
pillars, and confirm your understanding with the user before generating settings.

**Prototype builds or code** — If the user describes or shares what they've built, focus on the
systems that are already functional — these are the mechanical commitments.

Regardless of input format, your first step is always to **identify and confirm the mechanical
pillars** — the core systems that define what players actually *do* in the game.

## Process

### Step 1: Mechanical Decomposition

Analyze the provided mechanics and extract:

1. **Core loops** — What does the player do repeatedly? What's the moment-to-moment gameplay?
   What's the session-level loop? (e.g., "explore → gather → craft → upgrade → explore deeper")
2. **Resource dynamics** — What do players accumulate, spend, convert, risk, or lose? Include
   both explicit resources (gold, health, mana) and implicit ones (time, positioning, information).
3. **Tension structure** — Where does the interesting friction come from? (scarcity, risk/reward,
   time pressure, incomplete information, competing priorities, escalating difficulty, etc.)
4. **Progression arc** — How does the player's power/capability/situation change over a run or
   across sessions? (linear growth, escalating challenge, unlock-based, narrative branching, etc.)
5. **Interaction model** — Single-player or multiplayer? If multiplayer: cooperative, competitive,
   asymmetric, indirect? How do players affect each other's game state?
6. **Perspective and pacing** — Real-time or turn-based? What camera/view? Fast and twitchy or
   slow and contemplative? This shapes what settings are even viable.

Present this decomposition to the user as a brief summary and ask for confirmation. Getting
the mechanical identity right is essential — everything downstream depends on it.

### Step 2: Thematic Resonance Mapping

For each mechanical element, brainstorm *what real or fictional activities naturally involve
this dynamic*. This is the creative core of the skill.

The key question for each mechanic: **"In what world does this action make intuitive sense?"**

Examples of the reasoning pattern (video game specific):
- Roguelike permadeath + incremental meta-progression → reincarnation, time loops, generational
  sagas, simulated realities, recurring nightmares
- Resource conversion chains → alchemy, cooking, industrial manufacturing, ecosystem food webs,
  language/translation
- Stealth + information gathering → espionage, wildlife photography, journalism, archaeology
  (careful excavation), deep-sea exploration
- Tower defense + resource management → immune system response, city infrastructure during crisis,
  ecosystem management, signal routing
- Deckbuilding + narrative choices → building a reputation, curating memories, evolving a language,
  assembling a case (legal/detective)

The goal isn't to find one-to-one metaphors for individual mechanics, but to find *settings
where multiple mechanics converge into a single coherent fiction*.

Also consider: what does this game *feel like* at the sensory level? A fast resource-conversion
game feels different themed as a bustling kitchen vs. a chemical lab — even if the mechanics
are identical. The setting determines the *vibe*.

### Step 3: Setting Generation

Generate **5-8 setting concepts**, each structured as:

**Setting Name** — An evocative 2-4 word title

**Elevator Pitch** — One sentence capturing the player fantasy. What does the player *feel like*
they're doing?

**Mechanical Mapping** — For each core mechanic/loop, explain how it manifests in this setting.
This is the most important part. Every mechanic should feel like a *natural consequence* of the
fiction, not an arbitrary rule.

**Sensory Identity** — What does this game look, sound, and feel like? Describe the visual style,
color palette, soundscape, music genre, and screen feel. This is where video game settings diverge
most from tabletop — a setting isn't just a concept, it's an aesthetic experience.

**UI/UX Hooks** — How might the interface express this setting? Diegetic UI possibilities (HUD
elements that exist in the game world), menu aesthetics, transition styles, how resources are
visually represented on screen.

**Narrative Hooks** — 2-3 specific thematic elements that could deepen the experience: how the
progression arc tells a story, what the fail state *means* in fiction, what player mastery
represents thematically.

**Fusion Rating** — Rate how naturally the mechanics map to this setting:
- ★★★★★ Perfect fusion — every mechanic feels inevitable in this setting
- ★★★★ Strong fusion — most mechanics map naturally, one or two need light reframing
- ★★★ Workable — the theme works but some mechanics feel like "game mechanics" rather than fiction
- ★★ Stretch — requires significant abstraction to connect mechanics to theme
- ★ Surface only — theme is just a coat of paint

### Step 4: Ranked Recommendation

After presenting all concepts, provide a **ranked summary** with brief reasoning:

1. Rank by fusion quality (how naturally do mechanics become fiction?)
2. Note which settings best serve the game's **feel** — the moment-to-moment sensory experience
3. Flag any settings that open up interesting design space (mechanics the setting *suggests* adding)
4. Flag any settings that create ludonarrative dissonance (where the theme might confuse players
   about what they should do)

For indie context specifically, also consider:
- **Art pipeline feasibility** — Can a small team produce this? Does the setting allow for
  stylized/minimal art, or does it demand high-fidelity realism? Consider procedural generation
  potential, asset reuse, and whether AI art tools could assist.
- **Audio identity** — Does the setting suggest a clear, achievable soundscape? A distinctive
  music direction?
- **Market differentiation** — Does this setting help the game stand out on Steam/itch.io?
  Consider how the capsule image, trailer, and store description would read.
- **Scope alignment** — Does the setting's implied scope match the actual game's scope? A "vast
  open world" setting is dangerous for a small puzzle game. The setting should make the game
  feel *complete*, not *incomplete*.

## Important Principles

**Mechanics-first, always.** Never suggest changing core mechanics to fit a theme. The whole
point is to find themes that fit the mechanics. You *can* suggest minor thematic reframings
(e.g., "if you called this resource 'influence' instead of 'gold', the conversion mechanic
reads as social maneuvering"), but the mechanical function should stay the same.

**Avoid the obvious.** "Medieval fantasy" and "sci-fi space" are fine if they genuinely fit,
but push beyond the first association. The most memorable indie games find unexpected thematic
homes for familiar mechanics (Hades made roguelike death a literal escape from the underworld;
Papers, Please made document checking a moral experience; Unpacking made inventory management
a narrative device).

**Respect the scope.** Indie games — especially light strategy games — succeed by being focused.
The setting should make a small game feel *intentionally* small, not "we ran out of budget."
A cozy shop is complete at small scale; a galactic empire is not.

**Think about the verbs.** What will players say when they describe this game to friends? "You
manage a lighthouse and decide which ships to guide in during storms" is more compelling than
"you allocate resources and optimize throughput." The setting gives players language for the
experience.

**Consider the fail state.** In video games, players fail and retry. What does failure *mean*
in this setting? The best settings make failure feel thematic rather than punitive (Hades: you
die and return home; Outer Wilds: the time loop resets; FTL: your crew doesn't make it).

**Sensory first, lore second.** For light strategy games especially, the *feeling* of the
setting matters more than the worldbuilding depth. Players should feel the setting through
visuals, audio, and interaction feedback — not through reading text boxes.

**Diverge before converging.** Generate a wide range before narrowing down. Include at least
one setting that's unexpected or unusual — sometimes the weird idea is the right one.

## Output Format

Structure the full response as:

```
## Mechanical Identity
[Brief decomposition summary from Step 1]

## Setting Explorations
[5-8 setting concepts from Step 3, each with all components]

## Recommendations
[Ranked list from Step 4 with reasoning]

## Next Steps
[Suggest 2-3 directions for the user to explore further — e.g., "pick your top 2
and I can develop them into fuller setting documents with art direction notes",
"want me to draft how the UI might look in your top pick?",
"if any setting sparked a new mechanic idea, we can explore that", etc.]
```

## Edge Cases

- **If the user only provides one or two mechanics**: Ask what other systems exist in the game,
  even informal ones. Even "it's real-time" and "there's a map you move around" are meaningful
  mechanical details.

- **If the mechanics are very generic** (e.g., "collect resources, upgrade stuff"): Focus on
  the *specific* way these systems interact. The setting emerges from the combination and the
  pacing, not the individual parts.

- **If the user already has a partial theme**: Acknowledge it, then still do the full exploration.
  They might find something better, or the exercise might deepen their understanding of why
  their current theme works (or doesn't). Specifically analyze what the current theme captures
  well and what it misses mechanically.

- **If the user provides reference games**: Use the reference games' themes as context for what
  the player already understands, but aim to find this game's own thematic identity rather than
  cloning an existing game's setting.

- **If the game has a specific platform or technical constraint** (mobile, web, pixel art, etc.):
  Factor this into setting recommendations. A setting that demands fluid 3D animation won't
  work for a pixel art game.
