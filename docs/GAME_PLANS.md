# First playable plans

These are starting hypotheses to test, not finished designs.

## Don't Spill the Soup

Carry a bowl from the kitchen to a table. Moving or tilting too quickly spills visible soup. A round lasts 60–90 seconds, with immediate restart and a delivery receipt.

First prototype: adapt the existing LiquidFun browser wave-machine/container example after testing compatibility and preserving its notices. Move the bowl with pointer/touch and keyboard controls; count escaped soup once per particle. Start with a short route. Tune the slosh before adding a cat, a door slam, or a phone call.

Check production builds and mobile performance before committing to the older demo toolchain. A Matter circles/container approximation is an alternative for testing the controls, but it must be described honestly in engineering notes: rigid circles are not a fluid solver.

## One More Person

Pack a tiny elevator. Each arrival insists they can fit. Drag and rotate passengers and luggage, then close the doors when ready. Reward passengers safely inside; an obvious doorway obstruction prevents departure.

First prototype: adapt Matter's compound-body, stacking, and dragging examples through Phaser. Use five passenger silhouettes and one fixed elevator. Try top-down packing before ragdoll complexity. Add a visible rotation control, enclosure/doorway checks, scoring, and restart. Add a ladder, bicycle, and wedding cake after packing is fun. Target: 1–3 minutes.

## First-person card roguelike

Explore in first person, survive encounters, collect cards, and merge them into new abilities. A separate development branch is researching licensed first-person starters and implementing a small run.

Start with one arena, readable enemies, a few explicit crafting recipes, and a death/restart loop. Show which cards a recipe consumes and which ability it produces. Expand run length only after movement, combat, and crafting work together.

## Shared constraints

Browser-first, no accounts or API keys, clear controls, and a quick restart. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Proposed hosting is `vihaar.me/games`; it is not live yet.
