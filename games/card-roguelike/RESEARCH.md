# First-person card roguelike foundations

Researched 2026-11-24 against primary source repositories. The user's constraint is to reuse established code/frameworks instead of inventing a renderer, engine, or controller.

## Selected: official Three.js FPS example

- [Official example source, pinned r181](https://github.com/mrdoob/three.js/blob/r181/examples/games_fps.html).
- [Official MIT license at r181](https://github.com/mrdoob/three.js/blob/r181/LICENSE).
- [Live official example](https://threejs.org/examples/#games_fps).
- [Octree source](https://github.com/mrdoob/three.js/blob/r181/examples/jsm/math/Octree.js) and [Capsule source](https://github.com/mrdoob/three.js/blob/r181/examples/jsm/math/Capsule.js).

The example supplies a first-person camera, directional movement, gravity, damping, multiple collision substeps, pointer look, and capsule-against-triangle-world collision. Those controller patterns are adapted in `src/player.js`; Octree and Capsule are imported from the actual Three.js package. Original source and license are retained in `vendor/upstream/`.

The game pins Three.js 0.181.2 rather than floating on repository development HEAD. We use original primitive room geometry rather than copying the example's separate GLB map or its assets, so only the code's MIT license applies to the copied example. Vite supplies the existing build tooling. Root Phaser setup is left untouched.

## Considered: THREE LANES

- [epicever/three-lanes](https://github.com/epicever/three-lanes) is a close conceptual match: a first-person, turn-based roguelike deckbuilder with an existing browser implementation.
- At inspection, its root contained no license file and its GitHub repository metadata reported no license. Public availability alone does not establish permission to reuse.
- **Decision:** do not copy its code or assets. This prototype contains none of them.

## Considered: Dungeon Scoundrel

- [ehgzao/DungeonScoundrel](https://github.com/ehgzao/DungeonScoundrel) describes an MIT-licensed browser roguelike card game.
- Its presentation and combat are not a first-person controller foundation. It was not copied into this prototype.

## Scope of reuse

This is a new card-crafting game built on a reused, licensed first-person example and established Three.js modules. It is not a claim that a complete matching card-crafting roguelike was found. Neither a custom renderer nor a custom collision solver was written.

## Recursive crafting expansion

[Infinite Alchemy](https://github.com/sshh12/llm_alchemy/tree/e9d6937d8b2fc999976e45bd49fdc6d32fc54d99) supplies a licensed canonical-pair/cache pattern and FNV-1a helper. Those small parts are adapted in `src/crafting.mjs` with the MIT notice retained. The game's own rules derive bounded combat effects from elemental lineage and permit further combinations without a fixed recipe table. Discovery identity stays stable when cosmetic names change. A local catalog saves lineage; it does not grant ownership of cards.

The initial six named recipes are preserved. Additional combinations work offline, and optional server-side AI may supply names/illustrations only. We do not call Neal.fun or claim to have reproduced its private model pipeline. The expanded world and enemy attacks continue to reuse Three.js Octree/Capsule collision and rendering.
