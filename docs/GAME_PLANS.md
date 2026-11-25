# First playable plans

These are starting hypotheses to test, not finished designs.

## Don't Spill the Soup

Carry a bowl from the kitchen to a table. Moving or tilting too quickly spills visible soup. A round lasts 60–90 seconds, with immediate restart and a delivery receipt.

First prototype: adapt the existing LiquidFun browser wave-machine/container example after testing compatibility and preserving its notices. Move the bowl with pointer/touch and keyboard controls; count escaped soup once per particle. Start with a short route. Tune the slosh before adding a cat, a door slam, or a phone call.

Check production builds and mobile performance before committing to the older demo toolchain. A Matter circles/container approximation is an alternative for testing the controls, but it must be described honestly in engineering notes: rigid circles are not a fluid solver.

## One More Person

Pack a tiny elevator. Each arrival insists they can fit. Drag and rotate passengers and luggage, then close the doors when ready. Reward passengers safely inside; an obvious doorway obstruction prevents departure.

First prototype: adapt Matter's compound-body, stacking, and dragging examples through Phaser. Use five passenger silhouettes and one fixed elevator. Try top-down packing before ragdoll complexity. Add a visible rotation control, enclosure/doorway checks, scoring, and restart. Add a ladder, bicycle, and wedding cake after packing is fun. Target: 1–3 minutes.

## The Fold: the library before you

The current playable slice is three floors: a welcoming IntakeHall, the AbandonedStacks and the threatening MirrorArchive. Guided paths connect exploration to turn-based fights. Learn Language, Memory and Self; the final guardian echoes the player's invented spells. Full permadeath resets owned power and learning while recipe metadata may persist.

Seven source spells are reusable. Pick two, preview a meaningful benefit and Combine. Same-spell inputs work, new spells remain ingredients, and there is no depth cap. Every new combination costs 2 HP, in or out of battle, with no Focus cost or extra enemy action. Six concept synergies supply replay, interruption, reflection, preparation and piercing. Repeated casts teach later guardians; forgetting sacrifices that power for this life. Fire discoveries leave code-layered scorch/ash marks. The older eight-chapter outline remains in the narrative document for later expansion.

Play one nameless apprentice; all attack and defense comes from spells. Each floor offers an archive route with an immediate relic or a stronger guardian route with two victory relics. Encounters and relics vary by seed. The book, enemies and library use separate code-composed layers with painted shading, hand-drawn contours, readable manuscript headings and explicit Focus labels. See games/card-roguelike/ART_DIRECTION.md, THREE_FLOOR_RULES.md and NARRATIVE.md.

## Shared constraints

Browser-first, clear controls, and a quick restart. Core games need no account or API key. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Games are hosted at `vihaar.me/games`; optional runtime AI requires a separate configured provider.


## Six friend-game prototypes

- Friend Market: a five-day solo roster economy with interacting friend talents and seeded price events.
- Group Chat Court: three fictional cases, evidence and closing arguments, named AI jurors, solo defense or two-person same-device hotseat.
- One Brain Cell: shared roles controlling one physics character through a short delivery task, with AI filling unused roles.
- Airport Impostor: behavior-based social deduction among thirty travelers. Objectives involve harmless fictional contraband; identity, religion and appearance never determine suspicion.
- Friend Patch Notes: draft buffs and nerfs, then watch short deterministic animated battles between the friend cast.
- Trust Me, Bro: a walker and a navigator solve short mazes with limited views and clearly announced unreliable-map twists.

Each game is independently packaged under games/, with its own rules, controls, notices and validation. Keep first versions small and honest about solo, local co-op and online support. The website publishes only built, tested source pins.
