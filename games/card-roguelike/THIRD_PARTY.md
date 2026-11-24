# Third-party notices

## Three.js and the official FPS example

- Author: three.js authors.
- Repository: https://github.com/mrdoob/three.js
- Example: https://github.com/mrdoob/three.js/blob/r181/examples/games_fps.html
- Source revision: r181, tag object `df85227c7958837ec970c9db562505e04a355d08`.
- Runtime package: `three` 0.181.2.
- License: MIT, full text retained in `vendor/upstream/THREE-LICENSE.txt`.
- Distribution: the same notice is copied into `public/THREE-LICENSE.txt` so every production build includes it beside `LICENSE.txt` and `THIRD_PARTY.txt`.
- Retained original: `vendor/upstream/games_fps.html`.
- Adaptation: `src/player.js` reuses the example's Capsule/Octree controller, directional movement, damping, gravity, pointer-look pattern, and collision substeps. `src/main.js` uses Three.js rendering and geometry APIs.
- The original GLB map, textures, stats module, GUI, and projectile demo are not included in the running app.

## Build tooling

Vite and its transitive dependencies are installed through npm. Their notices remain in package distributions. No source from another game was copied.

## Fonts

The interface requests Fraunces and DM Sans from Google Fonts with local system fallbacks. Both families are distributed under the SIL Open Font License. Font files are not vendored and the game remains usable if the request fails. These requests can be removed by using the fallback font stacks in `src/style.css`.

Original card rules, UI, and geometry contributions are offered under the repository's MIT license.
