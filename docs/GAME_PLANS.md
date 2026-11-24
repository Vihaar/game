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

You wake without a name or memories before an open library and begin its climb. Eight floors reveal Language, Life, Memory, Transformation, Cosmos, Truth, Self and Everything. The urge to learn emerges during play. Every floor becomes darker, emptier and more eerie. At the summit, complete understanding reveals that knowledge is a curse. Full permadeath resets the run's spells, resources and progress; only recipe knowledge persists.

The selected warm storybook papercraft style becomes a guided interactive 2.5D world: actual folded path and book props against distinct illustrated rooms. Inspect a book, approach the forge or enter the next binding with visible controls. Smooth bounded camera rails settle before turn-based battles; no free walking or dodge timing. A clean open grimoire holds rune inscriptions. Combine any two owned rune imprints into a spell, including previously forged spells, and cast prepared runes on your turn. Strike/Guard and End turn remain explicit. Forge prices remain previewed, powers bounded and healing scarce. The renderer and rule engine are reused. See games/card-roguelike/NARRATIVE.md, ART_DIRECTION.md and docs/FOLD_3D_RESEARCH.md.

## Shared constraints

Browser-first, clear controls, and a quick restart. Core games need no account or API key. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Games are hosted at `vihaar.me/games`; optional runtime AI requires a separate configured provider.
