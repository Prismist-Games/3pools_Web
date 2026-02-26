# Mechanic-to-Setting: Post-Apocalyptic Crew Roguelike

## Mechanical Identity

**Core loops:**
- Moment-to-moment: turn-based tactical positioning and combat, using ammo as a scarce resource that changes how aggressively you can act
- Session loop: mission (structured objective) → optional scavenge site (dangerous, branching, risk/reward) → prep/rest phase (manage resources, morale, gear) → next mission
- Run arc: squad degrades and evolves; surviving crew grow (implicitly or explicitly); meta-unlocks open new options across runs

**Resource dynamics:**
- Food: attrition resource — runs down passively over time/missions, forces forward momentum, controls how long you can sustain the campaign
- Ammo: combat currency — spent during engagements, recovered via scavenging, creates risk/reward calculus (spend aggressively now vs. conserve for unknown future)
- Morale: psychological pressure valve — degrades from loss (crew death, mission failure, food shortage), recovers from success and rest; affects performance or available actions
- Implicit resource: the crew themselves — each member is a unit of capacity, skill, and emotional investment; crew death is permanent resource loss

**Tension structure:**
- Risk/reward of scavenge sites: high-value resources, but crew danger is real and permanent
- Who do you risk? Experienced crew are more effective but their loss is more costly
- Three resources compete: spending ammo to protect food supply; sacrificing morale to secure ammo; going hungry to boost morale
- Meta-tension: run-level squad attachment vs. run-ending desperation

**Progression arc:**
- Within run: crew either survives and deepens (invested) or depletes; difficulty escalates
- Across runs: meta-unlocks persist — new crew archetypes, starting equipment, site options, or mechanics; each run is slightly richer than the last
- Permadeath scope: a crew member dying permanently changes the roster but continues the run

**Interaction model:** Single-player, contemplative. Players have full information over their own state; enemy/environment information is incomplete (fog of war on scavenge sites).

**Perspective and pacing:** Turn-based tactical, likely top-down or isometric. Slow and deliberate — each decision carries weight. This is a "think before you act" game.

---

*Confirming mechanical identity... proceeding to setting exploration.*

---

## Setting Explorations

---

### 1. The Long Road Home — ★★★★★

**Elevator Pitch:** You are the last functioning bus driver in the midwest, carrying a busload of survivors toward a rumored resettlement zone — every stop could save you or end you.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is literal — rationing meals from a dwindling pantry under the bus seats. Ammo is scavenged from gas stations and gun shops along the route. Morale is the fragile social cohesion of people trapped together in a moving vehicle: it breaks when someone dies in the seat next to you, recovers when you find a working radio station playing music or someone's kid draws something on the fogged window.
- **Permadeath (crew)**: Each survivor is named, has a history, maybe a destination they mentioned. When they die at a roadside stop, the bus is quieter. Their seat is empty. This isn't abstracted — the game *shows* the empty seat.
- **Scavenge sites**: Highway rest stops, collapsed overpasses, flooded strip malls, a farmhouse with lights still on. You park the bus and send 1-3 people in. The map is hand-drawn on a paper napkin (diegetic UI). Getting back to the bus is the goal.
- **Tactical combat**: Tight, claustrophobic engagements in parking lots and convenience store aisles. Cover is cars, shelving units, bathroom doors. Turn-based movement measured in the geometry of mundane American space.
- **Meta-progression**: The bus itself improves across runs — storage upgrades, armor plating, a CB radio that lets you learn what's ahead. Each run you learn the route better. The map doesn't change; your knowledge of it does.
- **Mission structure**: Checkpoints along a linear route. Each "mission" is reaching the next waypoint safely — a bridge, a town, a fuel depot.

**Sensory Identity:**
- Visual: muted Midwestern palette — washed-out grays and faded yellows, cracked pavement, rust-red. Dawn and dusk lighting. Sparse, hand-drawn UI elements layered over a clean isometric grid.
- Sound: CB radio static, distant thunder, the diesel engine's hum, footsteps on gravel. Music is Americana — finger-picked acoustic guitar, occasional slide guitar, silence as a deliberate choice.
- Screen feel: Slow, deliberate. The bus is always visible at the edge of the scavenge map — a reminder of what you're protecting and what you're returning to.

**UI/UX Hooks:**
- The main hub view *is* the bus interior — you manage crew from their seats, click people to talk to them or assign them
- Resource displays are physical: a Polaroid board for crew portraits, a mason jar for food rations count, a crate with ammo tally scratched in marker
- Scavenge maps are drawn on paper, imprecise, with handwritten annotations that persist and accumulate across runs
- Morale displayed as ambient sound mix — quieter interior audio when morale is low, small sounds of conversation and laughter when it's high

**Narrative Hooks:**
- The run ends when you reach the resettlement zone — or run out of people. The meta-progression is you learning (as the driver) what roads are safe, what the warning signs mean. Player mastery = institutional knowledge.
- Crew member permadeath lands as it should: someone you've kept alive for three sessions dies at a rest stop in New Mexico because you made one wrong call. The empty seat stays.
- Failure state: you abandon the route, or the bus stops moving. In fiction, that means everyone you were responsible for is stranded. The game acknowledges this explicitly — a final postcard showing where everyone ended up.
- Meta-unlock framing: "You remembered the way to the fuel depot this time." The player's growing knowledge is the driver's growing knowledge.

**Fusion Rating: ★★★★★** — Every mechanic is natural. Rationing food on a bus trip. Scavenging highway stops. Morale as the social physics of frightened people in a small space. Permadeath as an empty seat. The tactical combat (people fighting in parking lots and aisles) is grounded and spatially coherent. The meta-progression (learning the route) is diegetically elegant.

---

### 2. Tide Runners — ★★★★★

**Elevator Pitch:** You captain a small fishing boat and its crew through international waters during the collapse of global supply chains — every port is a negotiation, every open sea is a threat.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is fish and preserved stores — the boat is also the source, which creates a beautiful loop (the thing that sustains you also needs to be protected). Ammo is barter goods and weapons scavenged from derelict ships. Morale is sea morale: being at sea for too long without port, losing crewmates to storms or pirates, the psychological weight of the horizon with nothing beyond it.
- **Permadeath (crew)**: Sailors are specialists (navigator, engineer, cook, fighter). Losing your navigator makes certain routes inaccessible. Losing your cook means food spoils faster. Each death is both emotional and mechanically specific.
- **Scavenge sites**: Derelict cargo ships, flooded coastal towns, offshore platforms, fishing cooperative remnants. You anchor nearby and send a dive team. The scavenge area is the partially-flooded interior of a ship or structure — cramped, dark, rising water as time pressure.
- **Tactical combat**: Boarding actions. Fighting in ship corridors and deck spaces. Visibility limited by fog, smoke, night. Cover is crates, bulkheads, machinery. The spatial constraints of nautical architecture make for natural tactical puzzles.
- **Meta-progression**: The boat itself upgrades — hull reinforcement, storage capacity, navigation tools. But also: routes open up across runs. You discover safe ports. You learn which derelicts are worth approaching.
- **Mission structure**: Each "mission" is reaching a destination port and completing a trade run. Between ports, scavenge opportunities arise.

**Sensory Identity:**
- Visual: desaturated blues and sea-greens, rust orange, the brown of waterlogged interiors. Rain-streaked screens, fogged portholes as UI frames.
- Sound: creaking hull, water against the sides, wind, radio chatter, silence when a crew member doesn't come back from the dive. Shanty-influenced music — sparse, minor key, with accordion and fiddle.
- Screen feel: The overworld is a top-down nautical chart. Scavenge maps are interior deck plans — schematic and angular. The contrast between vast open sea and tight corridors reinforces the tension.

**UI/UX Hooks:**
- Main hub is the wheelhouse — you manage crew from the navigation table, resources shown on hand-marked charts
- Morale displayed as the ambient sound below deck — conversation vs. silence
- A ship's log that auto-generates entries based on what happened, creating a run narrative you can read at the end

**Narrative Hooks:**
- The collapse of global shipping is the setting's implied catastrophe — you exist in the aftermath of a system so complex it couldn't be held together. Meta-progression is rebuilding a tiny, personal version of that network.
- Failure means the sea takes the boat. The game's fail screen is just the ocean — the boat is gone.
- Player mastery represents the transition from desperate survival to something like a small economy. The best players aren't just surviving — they're building something.

**Fusion Rating: ★★★★★** — Maritime survival has natural resource scarcity. Crew specialists map directly to tactical roles. Scavenging derelict ships is thrilling and coherent. The tactical constraint of fighting in confined ship interiors is genuinely interesting. The meta-progression (discovering safe routes, improving the vessel) is narratively clean.

---

### 3. Remnant Chorus — ★★★★

**Elevator Pitch:** You lead the last touring band — musicians traveling an irradiated America in a converted tour bus, playing for communities that have nothing left but the need to hear something beautiful.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is provisions traded for performances. Ammo — reframed as "leverage" or "tools" — is the physical equipment, strings, batteries, recording gear that keeps the band functional. Morale is literal: the band's creative cohesion, their belief that what they're doing matters. It breaks when they can't play, when a member dies, when they're forced to barter away an instrument.
- **Permadeath (crew)**: Each band member has an instrument and a musical role. The guitarist who dies leaves silence in the arrangement. You can find replacement musicians, but the sound changes. The music the band makes shifts across the run based on who's alive.
- **Scavenge sites**: Abandoned venues, recording studios, instrument shops, radio stations. Send crew to raid for strings, amps, batteries — but also for recordings, instruments, sheet music (the equivalent of "rare drops").
- **Tactical combat**: Reframed as conflict management — physical altercations at dangerous venues, protecting equipment during raids, navigating hostile communities. Turn-based confrontation (negotiation/intimidation before escalating to violence) gives players options that match the setting.
- **Meta-progression**: Songs unlocked across runs. Each complete run adds to a catalog — the music exists in the world. New instruments, new genres available, new community connections.
- **Mission structure**: Booked shows at distant communities. Each show is a "mission" with resource payoffs and story moments.

**Sensory Identity:**
- Visual: warm amber and deep blue, neon signs in the dark, the stage as the bright center of the world. Distressed textures, cassette-tape aesthetic.
- Sound: This game has the most distinctive audio identity of any concept — the music the band plays actually changes based on who's in your crew. An acoustic-heavy band sounds different than a full electric setup.
- Screen feel: The band's van/bus as hub, club stages as mission maps, abandoned buildings as scavenge sites.

**UI/UX Hooks:**
- Crew management displayed as a band lineup — who's playing what
- Resources shown as tour rider items (food on the rider, gear in the equipment manifest)
- Morale displayed as setlist quality — when morale is high, you have your best songs available; low morale means you're playing your worst

**Narrative Hooks:**
- The question the game asks: is art worth risking your life for? Meta-progression answers yes — the songs persist across runs, outliving the individual members who played them.
- Permadeath as losing a voice in the arrangement. The music gets sparser, stranger, more desperate.
- The fail state: the band breaks up. The final run's setlist is the game's eulogy for itself.

**Note on combat coherence**: "Turn-based tactical combat" in a band-on-tour setting needs some reframing — violence should feel reluctant and contextual, not the primary mode. This is the one mechanic that needs a light thematic wrapper (security, venue protection, territorial disputes). It works, but it's the weakest fusion point.

**Fusion Rating: ★★★★** — Extraordinarily strong on morale, permadeath, and meta-progression. The food/ammo/morale triad maps beautifully. Combat needs a sentence of explanation. The audio identity is genuinely unique and potentially a major differentiator. Indie teams with any musical interest should seriously consider this.

---

### 4. The Excavation — ★★★★

**Elevator Pitch:** You lead a team of archaeologists and armed escorts on digs through a collapsed civilization's ruins — every site has knowledge worth dying for, and some of them don't want to be found.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is expedition rations — you're in the field for weeks. Ammo is literal (armed escorts, hostile site conditions, looters and territorial survivors). Morale is academic and spiritual: the excavation team's belief that the past is worth recovering. It degrades when discoveries are lost or destroyed, when colleagues die, when the site is dangerous beyond what anyone signed up for.
- **Permadeath (crew)**: Your team is composed of specialists: a languages expert, a structural engineer, an archivist, a medic, an escort officer. Each death removes a capability. The languages expert's death means inscriptions can no longer be translated. The structural engineer's absence means you can't assess unstable zones.
- **Scavenge sites**: The sites ARE the game. Each excavation is a turn-based exploration of a collapsed building, a buried complex, a flooded archive. Dangerous and rewarding by design.
- **Tactical combat**: Confrontations with hostile groups occupying ruins, unstable structures requiring careful navigation, traps (ancient or modern). Turn-based movement through decaying architecture is naturally tactical.
- **Meta-progression**: The archive you're building. Each run recovers artifacts, texts, maps. The meta-layer is literally constructing a picture of what civilization looked like — and each new run unlocks new understanding of sites.
- **Mission structure**: Each site is a mission. Between sites, you manage the expedition base.

**Sensory Identity:**
- Visual: warm amber of electric lanterns against cold stone, dust-motes, deep shadow. Indiana Jones tone but more austere and melancholy.
- Sound: wind in ruins, careful footsteps on unstable floors, the echo of large spaces. Music is sparse orchestral — strings and solo winds.
- Screen feel: Grid-based movement through ruins with fog of war. Clean, detailed environmental art for ruins is achievable with stylization.

**UI/UX Hooks:**
- The "inventory" is the archive — artifacts displayed in a field notebook
- Maps drawn during exploration become resources (you reveal the site map as you move through it)
- Morale displayed as journal entries — the expedition log shows the team's psychological state through prose

**Narrative Hooks:**
- What you're excavating is your own civilization's ruins — this is near-future or far-future. The meta-progression is literally reconstructing history. Player mastery = archaeologist's expertise.
- Permadeath is "losing the person who knew how to do that" — the knowledge lives in the people, and when they die, specific capabilities are gone forever.
- The fail state: the expedition collapses, the site is lost, the knowledge is gone. The game's final screen shows what you recovered — even from a failed run, something persists.

**Fusion Rating: ★★★★** — Very strong. The "scavenge site" IS the core activity, which is elegant — no reframing needed. Permadeath as losing specialist knowledge is thematically resonant. Food and morale map naturally. Ammo (armed escorts in hostile ruins) is the lightest fit but still coherent. The meta-progression as building an archive is beautiful and slightly underutilized in other games.

---

### 5. Threshold Station — ★★★★

**Elevator Pitch:** You manage a team of rangers maintaining the last habitable mountain stations as a slow climate disaster makes the lowlands uninhabitable — every supply run down the mountain is a gamble.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is preserved stores and what grows at altitude — rationing against a short growing season. Ammo is equipment, fuel, and tools needed to keep the stations running (the "ammo" of survival infrastructure). Morale is isolation morale: months above the snowline, watching the world below become unlivable, the question of whether staying up here was the right call.
- **Permadeath (crew)**: Rangers are specialists — a mechanic keeps the generator running, a doctor keeps the crew healthy, a scout navigates the supply routes. Each death degrades the station's capability.
- **Scavenge sites**: Supply runs down the mountain into the increasingly dangerous lowlands. You send rangers into evacuated towns, collapsed supply depots, abandoned research stations. The scavenge is the danger — going down is easy; coming back up in the cold is where people die.
- **Tactical combat**: Hostile climate-refugees who've made the desperate climb, territorial lowland survivors at scavenge sites, wildlife driven uphill by habitat collapse. Turn-based encounters in snowfields, mountain passes, collapsed structures.
- **Meta-progression**: The station network expands across runs. New stations become reachable. Better equipment becomes available. The mountain itself opens up.
- **Mission structure**: Each resupply mission is a structured objective. Between missions, you manage the station and its people.

**Sensory Identity:**
- Visual: deep blues and whites of high altitude, the warmth of the station interior as sanctuary. Exposed to elements vs. sheltered inside — visual language of cold and warmth.
- Sound: howling wind vs. the creak of the station's structure. Silence at altitude. Music is sparse and high — strings, minimalist piano, long held notes.
- Screen feel: The overworld is a topographic map. Scavenge maps are low-resolution lowland environments, procedurally generated. The contrast between clean mountain geometry and cluttered lowland ruins.

**UI/UX Hooks:**
- Station hub displayed as a cross-section of the building — crew visible in their roles
- Resource displays use physical metaphors: food shown as pantry inventory, fuel shown as a gauge on the generator
- Weather system affects both combat and movement — another resource-like pressure

**Narrative Hooks:**
- The central tension: staying vs. going. The mountain is safe but isolated; the lowlands have resources and refugees who need help. Player mastery = learning which risks are worth taking.
- Permadeath in the context of isolation: no one can come to replace them. The station gets quieter.
- The meta-progression asks: are you building something permanent? Each run gets closer to making the station network self-sustaining.

**Fusion Rating: ★★★★** — Strong across all mechanics. The scavenge mechanic (going down = dangerous) is spatially and narratively clear. Morale as isolation pressure is psychologically grounded. The station-as-hub is a natural game architecture. Light on the "post-apocalyptic wasteland" energy compared to others — more quiet catastrophe than active collapse.

---

### 6. The Night Markets — ★★★★

**Elevator Pitch:** You run a caravan of traders through the night-side economies of collapsed cities — where the black market, the mutual aid network, and the survival economy blur into one.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is literal — you're feeding your crew and what you trade in. Ammo is protection money, actual weapons, and the credibility to move through dangerous territory. Morale is crew loyalty and community trust: the night market economy runs on relationships, and when you lose someone the caravan trusted, the relationships fray.
- **Permadeath (crew)**: Each caravan member has a specialty (negotiator, lookout, medic, muscle). Their deaths affect your trading capacity and your reputation with specific factions.
- **Scavenge sites**: Abandoned warehouses, collapsed malls, flooded basements — the stash sites and dead drops of the economy. You send crew in to recover goods or intelligence. Danger is rival groups and structural collapse.
- **Tactical combat**: Territory negotiation that escalates to violence. Fighting in market spaces, warehouses, alley intersections. The city is the tactical map.
- **Meta-progression**: Faction relationships and trade routes persist. Each run expands your network. Unlocked contacts give you starting advantages in the next run.
- **Mission structure**: Trade runs are missions — getting specific goods to specific people in a specific time window.

**Sensory Identity:**
- Visual: neon against darkness, market stalls lit by lanterns and LEDs salvaged from before. Warm and crowded versus dangerous and empty. High contrast.
- Sound: market noise, distant gunshots, negotiation and argument, the sound of a city that still has some life in it.
- Screen feel: Urban, dense, layered. The contrast between the crowded market and the empty scavenge site.

**UI/UX Hooks:**
- A contact ledger as crew/relationship tracker — physical book aesthetic
- Resources displayed as manifest inventory — what you're carrying
- Faction reputation shown as a relationship web

**Narrative Hooks:**
- The world is dark but not dead — people have rebuilt informal economies. The meta-progression is formalizing them.
- Permadeath means a contact you cultivated is gone — and so is the relationship network they carried.
- Player mastery = understanding the political economy of the night markets well enough to route around any loss.

**Fusion Rating: ★★★★** — Strong. The economy-as-survival framing gives ammo and food thematic weight. Combat is coherent (territorial disputes). Morale as community trust is a reframe that adds something new. Slightly more complex thematic territory than the others — "you're part of what's rebuilding" rather than "you're trying to survive" adds a layer of ambiguity that some players will love and some will find muddying.

---

### 7. Ghost Protocol — ★★★★

**Elevator Pitch:** You command the last remnants of a state intelligence agency, running operations in a world where governments have collapsed and information is the only currency that still holds value.

**Mechanical Mapping:**

- **Food/Ammo/Morale**: Food is operational budget (framed as "funds" or "cover resources"). Ammo is literal and figurative — weapons and the political/social ammunition of intelligence work (leverage, blackmail, data). Morale is operative loyalty and ideological coherence: why are they still doing this? Who are they serving? As the run progresses and losses accumulate, the question of "for what?" becomes pressing.
- **Permadeath (crew)**: Operatives are burned — captured, killed, compromised. Each is a specialist (cryptographer, field agent, analyst, forger). Their loss affects your intelligence capability.
- **Scavenge sites**: Denied areas — former government facilities, rival faction bases, corporate data centers. You send operatives in to extract intelligence or assets. High risk, high reward.
- **Tactical combat**: Covert operations that escalate to direct action. Turn-based stealth and combat in facility floor plans. The tactical geometry is office spaces, server rooms, loading docks.
- **Meta-progression**: Intelligence unlocked across runs. Each run reveals more of the network — who the real players are, what the mission actually means. Across runs, you're assembling a picture of the post-collapse political landscape.
- **Mission structure**: Ops are missions. Between ops, you manage the safe house.

**Sensory Identity:**
- Visual: minimal, functional. Concrete safe house, green-on-black terminal displays, manila folders and photographs pinned to boards. Cold and procedural.
- Sound: ambient electronics, encrypted radio chatter, silence. Music is synthetic — low, tense.
- Screen feel: A thriller. Information-dense UI that rewards close reading.

**UI/UX Hooks:**
- The safe house as hub — a spartan room with a situation board
- Intel displayed as a dossier system — physical folders, photographs, surveillance feeds
- Morale shown through operative status updates — text logs that shift in tone

**Narrative Hooks:**
- The central question: loyalty to what? Across runs, as you uncover more, the agency's original mission becomes increasingly ambiguous.
- Permadeath as a burned operative is clean — they're gone, their tradecraft is gone, and the enemy knows their face.
- Meta-progression as assembling intelligence across runs is genuinely game-native: you literally know more about the game world each run.

**Fusion Rating: ★★★★** — Strong. Every mechanic has a clean spy/intelligence mapping. The morale system as "why are we still doing this" is emotionally resonant. The scavenge sites as denied-area operations are tactically interesting. Slightly narrative-heavy for the "sensory first, lore second" principle — this setting rewards reading.

---

## Recommendations

**Ranked by fusion quality and overall fit:**

### 1. The Long Road Home (★★★★★) — Top Recommendation

Every mechanic maps without explanation. The bus creates a perfect hub that is also the thing you're protecting. The scavenge sites are familiar (American highway infrastructure) which lowers cognitive load and lets players focus on decisions rather than learning fiction. Permadeath as an empty seat is the best death metaphor in this list. The meta-progression (learning the route) is elegant because it's also literally what you'd do.

**For the indie context:** A washed-out Midwest road trip aesthetic is achievable with stylization. The art pipeline is focused: a few environments (highway, rest stop, small town, farmhouse) that recombine. The store page writes itself — "bus full of strangers you'll come to know, highway you can't leave, destination you might never reach."

**Design space it opens:** Weather system that affects movement and scavenge risk. A CB radio as meta-progression tool (learning what's ahead). Crew bonding moments during transit. A "road log" that generates narrative text you can read at the end of each run.

### 2. Tide Runners (★★★★★) — Strong Alternative

Equally clean fusion. The maritime setting's natural constraint (you're on a boat, you can't just walk away) creates intrinsic tension. Specialist crew with nautical roles is mechanically clean. The visual identity (fog, rust, open water) is striking and achievable.

**For the indie context:** Maritime aesthetics have strong market identity and stand out from the apocalyptic urban norm. The art pipeline is focused: boat interior, coastal ruins, flooded structures. Slightly less immediately legible than the highway game — "you're on a boat" requires a moment of setting establishment.

**Comparative note:** Choose Long Road Home for broader accessibility; Tide Runners for stronger aesthetic differentiation and a slightly more unusual market position.

### 3. The Excavation (★★★★) — Strongest Thematic Depth

The permadeath-as-lost-knowledge mechanic is the most emotionally and intellectually resonant in the list. The meta-progression as archive-building is genuinely novel. This is the setting that most rewards repeat play and player investment.

**For the indie context:** Archaeological aesthetics (warm amber, hand-drawn maps, field notebooks) are charming and achievable. The main constraint is that "ruins" art is common — you'd need a distinctive stylization to stand out. The store page hook ("recovering what came before") is emotionally clear.

**Flag:** This setting is the most thematically ambitious. It rewards players who engage with its ideas. Players who want pure tactics may find it quiet. It's the right choice if narrative resonance is a design priority.

### 4. Remnant Chorus (★★★★) — Highest Differentiation Potential

The most unusual concept on this list. If the team has musical capability (or access to it), the audio identity is a legitimate market differentiator — a game where the music changes based on who's in your crew is a concept that gets attention.

**For the indie context:** High risk, high reward. The combat framing needs work. But "the last touring band" is a store page concept that gets wishlisted without being played.

**Flag:** Only pursue this if the team is willing to commit to the audio vision. Half-baked music in this setting is worse than no music.

### 5-7. Threshold Station, Night Markets, Ghost Protocol (★★★★) — Solid but Secondary

All three work cleanly. Threshold Station has the strongest environmental mood but the narrowest emotional register. Night Markets has the richest thematic complexity but the hardest store-page pitch. Ghost Protocol has the cleanest tactical justification but rewards reading more than playing.

**Ludonarrative dissonance flags:**
- Remnant Chorus: players may feel confused about why combat is necessary — "I'm a musician, why am I shooting people?" needs preemptive narrative setup.
- Night Markets: "you're the good guys" vs. "you're trading in survival economies" creates ambiguity that can feel like dissonance if not handled deliberately.
- Ghost Protocol: if the meta-narrative doesn't pay off satisfactorily, the morale resource ("why are we doing this?") becomes mechanically orphaned.

**Scope alignment:**
All concepts are appropriate for an indie team. None demand open worlds or high-fidelity realism. All support stylized art. The Long Road Home and Tide Runners are slightly more scope-conservative (clear spatial constraints for procedural generation). The Excavation requires the most environmental art variety.

---

## Next Steps

1. **Pick your top two and go deeper.** I can develop either Long Road Home or Tide Runners into a fuller setting document with art direction notes, UI mockup language, sound design direction, and a concrete world-state description for the opening moments of Run 1.

2. **Name your crew.** The permadeath mechanic lives or dies on crew attachment — if any of these settings resonates, the next design step is defining what crew archetypes look like in that fiction. I can draft a full crew roster (names, specialties, personality notes) for your top pick.

3. **Examine the meta-progression framing.** The strongest design question these settings surface is: what does the player actually *know* across runs, and how is that represented on screen? Several of these settings have unusually strong answers to this (the route in Long Road Home, the archive in The Excavation). If you want, we can explore how the meta-progression layer could itself become a narrative experience rather than a menu.
