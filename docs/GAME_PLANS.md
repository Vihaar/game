# First playable plans

These are starting hypotheses to test, not finished designs.

## Don't Spill the Soup

Carry a bowl from the kitchen to a table. Moving or tilting too quickly spills visible soup. A round lasts 60–90 seconds, with immediate restart and a delivery receipt.

First prototype: adapt the existing LiquidFun browser wave-machine/container example after testing compatibility and preserving its notices. Move the bowl with pointer/touch and keyboard controls; count escaped soup once per particle. Start with a short route. Tune the slosh before adding a cat, a door slam, or a phone call.

Check production builds and mobile performance before committing to the older demo toolchain. A Matter circles/container approximation is an alternative for testing the controls, but it must be described honestly in engineering notes: rigid circles are not a fluid solver.

## One More Person

Pack a tiny elevator. Each arrival insists they can fit. Drag and rotate passengers and luggage, then close the doors when ready. Reward passengers safely inside; an obvious doorway obstruction prevents departure.

First prototype: adapt Matter's compound-body, stacking, and dragging examples through Phaser. Use five passenger silhouettes and one fixed elevator. Try top-down packing before ragdoll complexity. Add a visible rotation control, enclosure/doorway checks, scoring, and restart. Add a ladder, bicycle, and wedding cake after packing is fun. Target: 1–3 minutes.

## The Fold: guided card roguelike

Enter a magical paper library knowing nothing, thirsty to learn everything. Eight guided chapters teach Language, Life, Memory, Transformation, Cosmos, Truth, Self and Everything. The ending grants sincere complete understanding. Full permadeath resets a failed run's deck, forged cards, resources and progress; only recipe knowledge persists.

Battles are deliberate turns with visible intentions, once-per-turn basic attack/guard and an explicit End turn. There is no free walking, aiming, dodge timing or automatic damage while thinking. The game leads the camera between illustrated paper stages. Any two owned cards can be recursively forged during battle. Time clearly previews one extra enemy action; corruption, health and combined prices remain selectable. Powers and healing stay bounded. Three generated art directions are available for comparison before a final world palette is chosen. See `games/card-roguelike/NARRATIVE.md` and `ART_DIRECTION.md`. Optional runtime AI decorates cards only and stays disabled without configured credentials.

## Shared constraints

Browser-first, clear controls, and a quick restart. Core games need no account or API key. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Games are hosted at `vihaar.me/games`; optional runtime AI requires a separate configured provider.
