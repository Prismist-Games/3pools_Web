# Kitchen / Cooking System

- A dish is a **level** (关卡), not just a recipe. Slots are the carriers of level logic — they can have rules, triggers, cross-bonuses, exclusions, and future mechanics we haven't designed yet.
- The current rules-based matching (`{ match: { tag/id }, multiplier }`) is the simplest starting point. The architecture must stay open for more complex slot behaviors: conditional triggers, inter-slot dependencies, placement order effects, combo mechanics, etc.
- Tags on ingredients describe what the ingredient IS — never add tags to serve a specific dish/level's needs. Use `match: { id }` to target specific items from level config.
- The cooking evaluation system should remain a simple settlement process — the real gameplay happens in the show (局内). The kitchen provides meaning and context, not depth.
