# Fold: 3D direction and reusable foundations

## Actual 3D asset kits verified and downloaded (2026-11-24 follow-up)

The user's latest requirement is a genuine3D walkable world with guided camera movement; images are an art baseline, not the playable room. Two primary-source Kenney downloads were fetched and inspected in an isolated research directory. No optional model files were copied into the root game.

- **[Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit)**: actual archive `License.txt` says Furniture Kit2.0, CC0, personal/educational/commercial use, optional attribution. Includes DAE/FBX/GLB/OBJ/STL versions. The site's release metadata says1.0; prefer the downloaded artifact's own2.0 identifier for the manifest.
- **[Kenney Castle Kit](https://kenney.nl/assets/castle-kit)**: archive `License.txt` says Castle Kit2.0, CC0, created2024-03-27, optional attribution. Includes FBX/GLB/OBJ and palette textures.
- Quaternius was considered but not downloaded or represented as verified CC0 for a specific pack. Its current [official FAQ](https://quaternius.com/faq.html) says packs may be CC0 **or QAL**, so verify each pack's included license rather than assuming all assets are CC0.

Isolated preserved source directory:
`C:/Users/Owner/.codex/visualizations/2026/11/24/01a20f1e-8c57-7240-a681-973cdf15716e/kart-prediction/assets/kenney-3d/`

Both original zip archives and extracted `License.txt` are retained. Useful inspected files:

| Relative path beneath research directory | Size | Practical notes |
|---|---:|---|
| `furniture/Models/GLTF format/bookcaseOpen.glb` |18,020B|400position entries, one wood material, no external images. Bounds x0–0.4,y0–0.88,z−0.25–0. |
| `furniture/Models/GLTF format/bookcaseClosedWide.glb` |23,140B|540position entries, one wood material, no external images. Bounds x0–0.8,y0–0.79,z−0.25–0. |
| `furniture/Models/GLTF format/books.glb` |6,864B|Four material groups, no external images. Bounds approx0.15×0.104×0.095. Separate paper/cover colors suitable for restyling. |
| `furniture/Models/GLTF format/desk.glb` |15,048B|Two meshes, wood/metal materials, no external images; additional drawer mesh is present. |
| `castle/Models/GLB format/tower-square-arch.glb` |29,724B|544position entries, bounds approx0.93×1.01×0.93; uses external `Textures/colormap.png`. |
| `castle/Models/GLB format/wall-doorway.glb` |37,560B|684position entries, bounds approx0.5×1.31×1.0; external palette texture. |
| `castle/Models/GLB format/gate.glb` |13,880B|244position entries, bounds approx0.152×0.91×0.662; external palette texture. |
| `castle/Models/GLB format/wall-narrow-gate.glb` |17,092B|296position entries; external palette texture. |

The geometry/material/image/buffer data above were read from actual downloaded GLB JSON chunks, not inferred from preview pictures. Counts are glTF position accessor entries, not unique welded vertices or a frame-rate measurement. The furniture GLBs have embedded geometry and plain-color materials; castle GLBs retain an external image URI even though their geometry is embedded.

**Practical integration guidance (engineering inference):** use Three's existing GLTFLoader, measure each loaded model with Box3 and normalize it once. These assets have different origins and scales; do not assume a bookshelf is already a2m centered object. Clone materials before recoloring individual instances so one chapter's curse palette cannot mutate another model. Reuse geometry and instance repeated shelf/book meshes rather than load a fresh file for each item. Keep a stable root scale, +Y up, and simplified collision boxes separate from decorative book geometry. Retain palette texture directory structure or remove the map deliberately when substituting authored paper materials.

The selected source assets are practical optional bases for shelves/books/arches. They are not being shipped merely because they were downloaded: the active visual implementation can continue using original papercraft geometry and AI-generated material textures. No full mesh kit import is required to implement genuinely3D traversal.

### Camera and navigation acceptance guidance

These are proposed checks, not claims that a new world already passed them:

1. One movement solver owns the player/camera anchor. Camera rails interpolate presentation toward it and never teleport the player through a collision wall.
2. Validate every authored route endpoint and intermediate segment against floor/collider bounds, including the capsule radius. Raycast hit distance alone is insufficient if the camera/player has width.
3. Give stairs separate walkable collision ramps or tested step handling; prevent downward floor probes from accepting undersides, side faces or a distant lower floor.
4. Clamp movement timestep/accumulate fixed solver ticks; focus or travel promises must resolve on completion and cancellation, including reset and disposal.
5. Keep the camera above the floor and outside walls at narrow turns; use a swept sphere/raycast fallback for occlusion, with a bounded near target rather than unbounded forward movement.
6. Re-test route reachability at each chapter change, low/high frame rates, mobile aspect ratios, mid-travel restart, resizing during focus, and on failed texture/model loads. Pictures must not become collision or progression authority.


Research checked 2026-11-24 against the repositories and first-party documentation below. No packages or skills installed and no game code changed for this research. This document separates inspected source evidence from recommendations.

## Recommendation

Latest user clarification: Bruno is a reference for smooth movement and gameplay responsiveness only; keep Fold's papercraft art direction. Grimoire runes are accepted. No full Bruno-style art/world overhaul is required. Prioritize bounded camera motion, responsive turns, readable hotspots and smooth transitions using the existing browser Three.js implementation.

Keep Fold as a browser game using its existing Three.js integration. Build actual modular papercraft geometry for the walkable foreground and use the generated art for distant scenery, palette, and room staging. Reuse selected Bruno Simon world/interaction patterns and official Rapier/Three.js examples; do not transplant a whole portfolio or rewrite the game in a new engine during this iteration. This is an engineering recommendation for the existing browser project, not a benchmark result.

The core loop should make knowledge change the world: warm entrance → fungal/aqueous/astral discoveries → increasingly ink-stained mechanisms → shattered archive → forbidden binding. Treat room unlocks, curse level, interactables and exits as data; validate route reachability before adding detailed mesh dressing. The inspected level-design skill explicitly supplies a room/gate graph, real-controller measurements, pacing checks and soft-lock checks. [Level-design source](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/level-design/SKILL.md)

## Bruno Simon's actual current portfolio

Inspected upstream `brunosimon/folio-2025` at commit `70764a94756cc4de564e493c8ba46c4b5fe03ed1` (2026-11-04), rather than assuming the old2019 site architecture. [Pinned source](https://github.com/brunosimon/folio-2025/tree/70764a94756cc4de564e493c8ba46c4b5fe03ed1)

- `sources/Game/Rendering.js` imports `three/webgpu` and TSL, instantiates `WebGPURenderer`, awaits initialization, and uses a render pipeline with bloom and optional cheap depth of field. Quality changes alter the postprocessing path. [Renderer source](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Rendering.js)
- `Game.js` wires independent input, ticker/time, resource loading, rendering, view, physics, world, quality, interaction and audio modules. World areas and vegetation are separate modules. The README documents ordered pre-physics→physics→post-physics→camera→world→render ticks. This modularity is the useful transferable pattern. [Game source](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/Game.js), [game-loop documentation](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/readme.md)
- Declared dependencies include Three.js0.187, Rapier0.19.3, GSAP3.15.1, Vite, Howler, and glTF-transform tooling. Models are not generated from flat screenshots: the repo includes Blender source and GLBs; its resource loader handles GLTF, Draco and KTX2. [Package](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/package.json), [resource loader](https://github.com/brunosimon/folio-2025/blob/70764a94756cc4de564e493c8ba46c4b5fe03ed1/sources/Game/ResourcesLoader.js), [Blender resources](https://github.com/brunosimon/folio-2025/tree/70764a94756cc4de564e493c8ba46c4b5fe03ed1/resources)
- The author says the public portfolio works without unpublished server code and invites use of its Blender files. [Author's source-code note](https://github.com/brunosimon/folio-2025/blob/main/sources/index.html)

### Licensing observations

The repository's explicit `license.md` is MIT and the author's own page says MIT. Its package metadata says ISC: this is an upstream metadata mismatch. Preserve the explicit MIT notice when reusing code. Do not describe all dependencies or every embedded asset as MIT: GSAP has its own standard no-charge license; Rapier.js is Apache2.0. [MIT file](https://github.com/brunosimon/folio-2025/blob/main/license.md), [package metadata](https://github.com/brunosimon/folio-2025/blob/main/package.json), [GSAP terms](https://gsap.com/community/standard-license/), [Rapier.js license](https://github.com/dimforge/rapier.js/blob/master/LICENSE)

The music folder contains a CC0 declaration, but raw GarageBand sound resources contain third-party-named recordings, including a commercial-song-named clip. A root software license is insufficient evidence that each external recording was cleared. Recommendation: reuse code patterns and our own papercraft art; exclude Bruno's raw audio, logos, personal identity and portfolio content. [Music declaration](https://github.com/brunosimon/folio-2025/blob/main/static/sounds/musics/license.md), [raw sound resources](https://github.com/brunosimon/folio-2025/tree/main/resources/sounds)

## Reusable 3D options

| Source | Verified reusable foundation | Fit and limit |
|---|---|---|
| [Bruno folio2025](https://github.com/brunosimon/folio-2025) | MIT code; complete interactive vehicle world, modular camera/physics/areas/loading/quality | Best architecture inspiration, but a large themed portfolio with many unrelated systems, rather than a small dungeon starter. Adapt selected modules and author original Fold geometry. |
| [Rapier.js](https://github.com/dimforge/rapier.js) | Apache2.0 physics, official JS examples and testbed | Best direct physics layer for plain Three.js: controllers, colliders and scene queries. Rapier has no renderer, and WASM initialization is asynchronous. [Official getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/) |
| [react-three-rapier](https://github.com/pmndrs/react-three-rapier) | MIT React integration with runnable demo sources including kinematics, sensors, car, collision events and manual stepping | Useful example implementations; adopting its component runtime would add React Three Fiber to a plain Three.js project. Prefer direct Rapier unless already using R3F. [License](https://github.com/pmndrs/react-three-rapier/blob/main/LICENSE), [examples](https://github.com/pmndrs/react-three-rapier/tree/main/demo/src/examples) |
| [PlayCanvas engine](https://github.com/playcanvas/engine) | MIT web engine, actual physics examples: vehicle, raycast, joints and compound collision | Good alternative when editor-authored scenes and engine systems are desired. It is an engine migration, not a missing visual-polish dependency. Recheck each imported sample asset's provenance. [Engine docs](https://developer.playcanvas.com/user-manual/engine/), [license](https://github.com/playcanvas/engine/blob/main/LICENSE), [physics examples](https://github.com/playcanvas/engine/tree/main/examples/src/examples/physics) |
| [Godot demo projects](https://github.com/godotengine/godot-demo-projects) | MIT demo code and actual3D kinematic character, navigation, platformer, lights/shadows, physics interpolation examples | Strong choice for a future native-first project and editor workflow. Existing Fold JS mechanics would require migration. The3D platformer README uses Forward+, so it must be adjusted for browser export. [License](https://github.com/godotengine/godot-demo-projects/blob/master/LICENSE.md), [character demo](https://github.com/godotengine/godot-demo-projects/tree/master/3d/kinematic_character), [platformer renderer](https://github.com/godotengine/godot-demo-projects/blob/master/3d/platformer/README.md) |

For current browser reach, Three.js WebGPURenderer automatically falls back to WebGL2. Godot4 web export currently uses WebGL2 Compatibility (not Forward+/Mobile or WebGPU), requires WebAssembly, cannot export C# projects, and defaults to single-threaded export to avoid cross-origin-isolation requirements. Native mobile can perform better, but browser distribution avoids installation. These official limits support staying on the existing web stack for the current shareable game. [Three renderer docs](https://threejs.org/docs/pages/WebGPURenderer.html), [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

## Agent skill candidates: evidence, not installation

| Pack | Inspected evidence | Recommendation |
|---|---|---|
| [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache2.0; Three scene, materials/lighting, glTF loading plus camera, level-design, game-feel and performance disciplines. Scene skill pins r187, checks installed version first, caps DPR, clamps delta, separates state from meshes, and cites official sources. [Scene skill](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/web-engines/threejs-scene-setup/SKILL.md) | Strongest narrow reference set for this project. Inspect only selected skills and reconcile with installed Three version before any future installation. |
| [same pack: validation evidence](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/evals/RESULTS.md) | Author reports engine snippet runs and model-judged trigger evaluations, with explicit one-run/model-judge limits. The inspected Three tests execute snippets with renderer/timer doubles, covering negative/stalled deltas and DPR caps. [Actual test](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/tests/test_threejs_examples.py) | Useful reproducibility and honest limits; it does not establish attractive art or enjoyable gameplay. No tests were independently rerun in this research. |
| [threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | MIT; director routes gameplay/art/UI/audio/QA. QA specifies real input, progression/retry, target viewport captures, console/network errors and canvas measurements. Pack includes inspector/evidence tests and a game scaffold. [Director](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-game-director/SKILL.md), [QA](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-qa-release/SKILL.md) | Good release-check reference, but its premium rubric and external generation defaults are opinionated and cannot substitute for the user's game brief. No installs or credential probes performed. |
| [wolffe/three.js-skills](https://github.com/wolffe/three.js-skills) | MIT; readme targets Three0.187 WebGPU/TSL only and Jolt physics. Explicitly says no WebGL fallback; many source examples are syntax/CPU checked rather than fully rendered or run as an extracted unit. [Author's scope and tested limits](https://github.com/wolffe/three.js-skills/blob/master/README.md) | Useful procedural geometry reference; poor default fit if retaining WebGL compatibility and Rapier. Avoid silently switching the game's physics/render stack. |

None of these packs is an official Three.js engine package, and self-reported evaluations are not independent evidence of game quality. No skills were installed.

## Optional magic and generation references

[threejs-vfx](https://github.com/majidmanzarpour/threejs-vfx) is a runnable Three.js/Vite/GLSL elemental sandbox with line/area targeting, lazy ability loading, particle/light budgets and live parameters. Its code license is MIT; bundled Mixamo character FBXs and HDR probe explicitly retain separate licenses. Useful selective reuse: paper-rune targeting, impact timing and bounded effect pools, recolored and simplified for Fold. Its flat-floor aiming assumptions and GLSL effects need compatibility review before copying into a TSL/WebGPU renderer. No bundled character/HDR assets were copied. [License](https://github.com/majidmanzarpour/threejs-vfx/blob/main/LICENSE), [asset caveats and performance notes](https://github.com/majidmanzarpour/threejs-vfx/blob/main/README.md)

[OpenGame](https://github.com/leigest519/OpenGame) is an agent framework for generating web games, not a reusable3D world kit. Its README describes template/debug skills, external model/provider credentials, and a benchmark whose evaluation pipeline is still listed as forthcoming. The authors' [paper2604.18394](https://arxiv.org/abs/2604.18394) is primary research, but its claims were not independently reproduced here. It is not needed to keep iterating our already playable project, and the current built-in image pipeline requires no switch. No install, model run, API billing or external generation was performed. [Framework source and setup](https://github.com/leigest519/OpenGame/blob/main/README.md)

## Art pipeline: what the new images do

The three delivered atlases are1672×941 WebPs optimized quality88 from preserved native-generated PNGs. Each is a2×2 four-environment contact sheet; no images were physically cropped. The eight-world set is original intake + A's four interiors + B-cursed's first three interiors. B/BR is an optional warm exterior. Warm B remains available as a separate original. Exact prompts and source paths are in `games/card-roguelike/public/art/WORLD_GENERATION.md`.

These files contain color pixels, not collision, navigable floors, depth, side/back surfaces, rigging, or gameplay semantics. A plane mapped with one panel can produce a beautiful fixed-view backdrop; camera movement beyond that viewpoint exposes its flatness. Recommendation: use the image as backdrop/set dressing with restrained camera travel, while actual floor/shelves/arches/bridges are reusable low-poly or layered-cardstock mesh modules with separate collision proxies. This is a pipeline inference from the artifact format and inspected model/physics sources, not a claim that generation produced3D models.

For a Bruno-like navigable world, the next reusable kit should be a floor tile, shelf, book-door arch, paper tree, bridge, press, lantern and book-pedestal, with shared palette/materials, instancing for repeated books, authored light landmarks and a bounded follow/orbit camera. Make one complete warm-to-cursed room transition before expanding every room; reuse that proven kit across the room graph.

