# Don't Spill the Soup

A short browser game built on Matter.js 0.20.0, adapting the official ballPool, compound and manipulation examples.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

`dist/` is a static site with relative asset URLs, suitable for `/games/soup/`. No accounts, keys or backend.

## Source and license

Exact upstream snapshots in `upstream/` are from [liabru/matter-js](https://github.com/liabru/matter-js) commit `b8ee71cd7f9b49f53639ddaedd6254f1929bcbe5`: `examples/ballPool.js`, `examples/compound.js`, and `examples/manipulation.js`. Liam Brummitt's MIT notice is retained in `upstream/MATTER-LICENSE.txt`.

Adapted mechanisms in `src/engine.js` and `src/main.js`: engine/world creation, adding rigid-body particles, assembling compound bodies, setting pose, and spring constraints for dragging. Matter supplies collision detection and the fixed-step rigid-body solver. Original additions are game rules, input/UI and procedural canvas art. No external images or audio.

Soup is represented by small rigid circles. This is an arcade approximation, **not a fluid simulation**; it has no fluid pressure or viscosity. Spill tracking is irreversible and counts each particle once.

## Validation

`npm run typecheck` runs JavaScript syntax checks (this project is JavaScript, not TypeScript). `npm test` checks the game rules. Desktop Chrome browser checks cover complete success, failure, and restart flows. Mobile viewport layout was checked at 390px; native touch dragging is implemented with pointer events, but has not been tested on physical phone hardware.

Development builds expose `window.__smallGame` for accelerated simulation QA. Production builds remove that hook.
