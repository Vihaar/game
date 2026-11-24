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

Explore a cursed library consuming reality. The expanded playable run has eight connected areas, three characters, real-time pursuit and telegraphed spatial attacks. Enemy health and next moves appear above them. Repeatable attack and block support the spell deck; healing is scarce.

Any pair of owned cards can be recursively forged, including during combat. Both copies are consumed and recipes have bounded powers. Time, corruption, health and combined costs are selectable for playtesting. Saved discoveries retain lineage, not owned cards. The visual direction is in `games/card-roguelike/ART_DIRECTION.md`; the art is physical layered papercraft. Optional server AI adds presentation only and stays disabled without provider credentials and an operator budget decision.

## Shared constraints

Browser-first, clear controls, and a quick restart. Core games need no account or API key. Keep shared code small. Reuse proven game loops, physics, input, and build systems. Games are hosted at `vihaar.me/games`; optional runtime AI requires a separate configured provider.
