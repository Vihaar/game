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

Seven source spells are reusable. Pick two, preview a meaningful benefit and Combine. Same-spell inputs work, new spells remain ingredients, and there is no depth cap. Combining is free between encounters; during fights it uses Focus and a previewed price. Six concept synergies supply replay, interruption, reflection, preparation and piercing. Repeated casts teach later guardians; forgetting sacrifices that power for this life. Fire discoveries leave code-layered scorch/ash marks. The older eight-chapter outline remains in the narrative document for later expansion.

The book and art use separate code-composed layers, hand-drawn/painted SVG spell illustrations, readable manuscript headings and explicit Focus labels. See games/card-roguelike/ART_DIRECTION.md, THREE_FLOOR_RULES.md and NARRATIVE.md.

## Shared constraints

Browser-first, clear controls, and a quick restart. Core games need no account or API key. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Games are hosted at `vihaar.me/games`; optional runtime AI requires a separate configured provider.
