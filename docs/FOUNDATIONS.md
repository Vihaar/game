# Foundations for two small browser games

Researched 2026-11-24 against upstream source, license files, GitHub REST metadata, and authors' demos. These are reusable templates and physics examples, not ready-made versions of either proposed game. No application code was written for this research.

## Recommendation

Start the shared project from [Phaser's official Vite/TypeScript template](https://github.com/phaserjs/template-vite-ts), retaining its MIT license. Adapt the official Matter examples for the first playable elevator and a deliberately simplified soup prototype. If realistic liquid is central to the soup's appeal, adapt the existing LiquidFun wave-machine demo rather than inventing a fluid solver. Keep that engine separate from Phaser's Matter world.

## Shared starter

- [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts): official MIT template with Vite dev server, TypeScript, and production build. [License](https://github.com/phaserjs/template-vite-ts/blob/main/LICENSE).
- Important version detail: despite its Phaser 3 README/description, the [current package.json](https://github.com/phaserjs/template-vite-ts/blob/main/package.json) pins **Phaser 4.0.0**, Vite ^6.3.1, and TypeScript ~5.7.2. Phaser 4 still includes the [Matter integration in the v4.0.0 source](https://github.com/phaserjs/phaser/tree/v4.0.0/src/physics/matter-js). Run a real smoke test rather than assuming every Phaser 3 example is identical under Phaser 4.
- The starter supplies `dev-nolog` and `build-nolog`; default dev/build also invoke its documented anonymous template telemetry. Prefer the no-log scripts when adapting it.
- GitHub REST snapshot: not archived, pushed 2026-04-21. This is a maintenance signal, not a compatibility guarantee. [Metadata endpoint](https://api.github.com/repos/phaserjs/template-vite-ts).

## One More Person: strongest immediate fit

[liabru/matter-js](https://github.com/liabru/matter-js) supplies runnable examples with [MIT licensing](https://github.com/liabru/matter-js/blob/master/LICENSE). Reuse and retain attribution for these concrete starting points:

| Existing source | Reusable behavior | Proposed adaptation |
| --- | --- | --- |
| [ragdoll.js](https://github.com/liabru/matter-js/blob/master/examples/ragdoll.js) | Jointed human-shaped bodies and constraints | Floppy passengers |
| [compound.js](https://github.com/liabru/matter-js/blob/master/examples/compound.js) | Bodies assembled from multiple shapes | Passenger plus luggage or oddly shaped belongings |
| [compoundStack.js](https://github.com/liabru/matter-js/blob/master/examples/compoundStack.js) | Colliding compound bodies in a stack | Crowded elevator packing |
| [manipulation.js](https://github.com/liabru/matter-js/blob/master/examples/manipulation.js) | Position/rotation/body manipulation | Rotate, squeeze, and settle passengers |
| [ballPool.js](https://github.com/liabru/matter-js/blob/master/examples/ballPool.js) | MouseConstraint dragging and containment | Grab passengers with a spring-like drag |

[Official interactive Matter demo](https://brm.io/matter-js/demo/) exposes these example types. GitHub REST snapshot: not archived, pushed 2026-09-30. [Metadata](https://api.github.com/repos/liabru/matter-js).

Inference: these examples cover the difficult collision/dragging/joint primitives well. We must still add the elevator's rules, doors, scoring, characters, and round progression. An exact licensed elevator-packing game was not established in this search; elevator-dispatch simulators have different mechanics and are weaker starting points.

## Don't Spill the Soup: two honest paths

### A. Fast arcade prototype using the same Matter foundation

Adapt [ballPool.js](https://github.com/liabru/matter-js/blob/master/examples/ballPool.js), [avalanche.js](https://github.com/liabru/matter-js/blob/master/examples/avalanche.js), and [compound.js](https://github.com/liabru/matter-js/blob/master/examples/compound.js): many small colliding circles inside a moving/tilting bowl, with escaped circles counted as spills.

Limit: Matter is a rigid-body engine. These circles are a gameplay approximation, **not** a fluid simulation. Smooth rendering may make them look like soup, but does not create viscosity, pressure, or fluid cohesion. Remove wrapping from the source example so spilled particles cannot re-enter. Reuse Matter's own fixed-step physics rather than writing a solver.

### B. Existing real-liquid demo to adapt

- Runnable author demo: [Fluid simulation in liquidfun-wasm](https://birchlabs.co.uk/liquidfun-wasm/).
- Exact demo source: [Birch-san/liquidfun-play-2](https://github.com/Birch-san/liquidfun-play-2), with [waveMachine.ts](https://github.com/Birch-san/liquidfun-play-2/blob/master/src/demo/waveMachine.ts), [loop.ts](https://github.com/Birch-san/liquidfun-play-2/blob/master/src/loop.ts), and [box2d.ts](https://github.com/Birch-san/liquidfun-play-2/blob/master/src/box2d.ts). A moving container with liquid is directly relevant to the bowl/slosh mechanic.
- Licensing: [Zlib license for Alex Birch's code](https://github.com/Birch-san/liquidfun-play-2/blob/master/LICENSE.zlib.txt), plus [Google's retained LiquidFun notices](https://github.com/Birch-san/liquidfun-play-2/blob/master/LICENSE.liquidfun.txt) for the adapted wave-machine/EyeCandy contributions. Preserve both, mark altered versions, and do not claim authorship of upstream code.
- Uses [Birch-san/box2d-wasm](https://github.com/Birch-san/box2d-wasm)'s LiquidFun distribution. The [release](https://github.com/Birch-san/box2d-wasm/releases/tag/liquidfun-v6.0.4-lf.1) documents `npm i "box2d-wasm@npm:liquidfun-wasm@6.0.4-lf.1"`. The demo's package.json already uses that alias.
- Existing project uses TypeScript, Svelte 3, and Snowpack 3. README says Chromium is required for development while Firefox/Safari work after production bundling. It includes a WebGL water shader adapted from LiquidFun's EyeCandy demo and a SIMD/WASM simulation. This is a fluid showcase, not a finished game.
- GitHub REST snapshots: demo not archived, last pushed 2022-05-23; engine not archived, last pushed 2024-12-29. Their older toolchains merit a build/browser test before selecting them as a whole-app base. [Demo metadata](https://api.github.com/repos/Birch-san/liquidfun-play-2), [engine metadata](https://api.github.com/repos/Birch-san/box2d-wasm).

### Alternatives considered

- [google/liquidfun](https://github.com/google/liquidfun): original fluid/rigid-body engine and JavaScript testbed, but upstream was archived on 2026-02-13. The demo above is a more concrete browser-ready entry point.
- [piqnt/planck.js](https://github.com/piqnt/planck.js): MIT 2D JavaScript rigid-body physics engine, actively pushed as of 2026-11-14. Useful alternative for stable Box2D-style joints and collisions; it is not evidence of LiquidFun particle-fluid support. [License](https://github.com/piqnt/planck.js/blob/master/LICENSE.txt), [metadata](https://api.github.com/repos/piqnt/planck.js).
- [lo-th/Liquid.lab](https://github.com/lo-th/Liquid.lab): relevant liquid/ragdoll showcase, but no explicit license was established in the inspected repository root. Treat as visual research unless its reuse terms are clarified.

## Practical build order

1. Clone the official Phaser template and preserve upstream notices and provenance.
2. Adapt Matter's ragdoll/compound/dragging examples for a 60–90 second elevator round.
3. Adapt Matter's circles/container examples for a short soup handling prototype; label the liquid approximation honestly.
4. If that control loop is fun, run the existing LiquidFun demo and transplant its wave-machine/container behavior plus licensed fluid rendering into the soup scene.

This recommendation reuses established templates, source examples, and solvers. The original work is the two games' rules, presentation, and tuning.
