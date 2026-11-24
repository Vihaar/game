# Spell effects research

Verified 2026-11-24 against GitHub's commit API, pinned raw source, and the installed Three.js module.

## Primary sources and licenses

| Source | Pinned revision | Ownership and license |
| --- | --- | --- |
| [threejs-vfx](https://github.com/majidmanzarpour/threejs-vfx/tree/3d184edec529e5ad8055d8803967ea1f040aede0) | `3d184edec529e5ad8055d8803967ea1f040aede0` | Maintained by [majidmanzarpour](https://github.com/majidmanzarpour); fork of the original below. [MIT license](https://github.com/majidmanzarpour/threejs-vfx/blob/3d184edec529e5ad8055d8803967ea1f040aede0/LICENSE) retains copyright 2026 mohamedachrefelouafi. |
| [LinearAbiltyCastingThreeJS](https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS/tree/97f1de19617e9a2e3af3c8021c8c21c8f58b40f3) | `97f1de19617e9a2e3af3c8021c8c21c8f58b40f3` | Original by [achrefelouafi](https://github.com/achrefelouafi). [MIT license](https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS/blob/97f1de19617e9a2e3af3c8021c8c21c8f58b40f3/LICENSE), same copyright notice. |
| [Three.js r181 bundled tween.module.js](https://github.com/mrdoob/three.js/blob/f265b19cceb299184bcc26653ad53452c4349e70/examples/jsm/libs/tween.module.js) | Three commit `f265b19cceb299184bcc26653ad53452c4349e70` | Bundled module identifies itself as Tween.js **23.1.1** and exports `Group`, `Tween`, `Easing`. [Tween.js v23.1.1 license](https://github.com/tweenjs/tween.js/blob/451041100e54c8cd2472872e307c1895f7ede7db/LICENSE): MIT, copyright 2010–2012 Tween.js authors; easing equations copyright 2001 Robert Penner. |

Preserve the applicable complete MIT copyright and permission notice when distributing copied code. Tween.js has its own notice even though Three.js bundles the file. The existing Three.js notice alone does not replace it.

## Techniques inspected

- **Lifecycle and bounded work.** The fork's [Ability.js](https://github.com/majidmanzarpour/threejs-vfx/blob/3d184edec529e5ad8055d8803967ea1f040aede0/src/abilities/Ability.js) separates travel, impact, fade, and done. The original [AbilityManager.js](https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS/blob/97f1de19617e9a2e3af3c8021c8c21c8f58b40f3/src/abilities/AbilityManager.js) caps concurrent effects and recycles pooled instances. The fork's [ParticleSystem.js](https://github.com/majidmanzarpour/threejs-vfx/blob/3d184edec529e5ad8055d8803967ea1f040aede0/src/particles/ParticleSystem.js) uses fixed-capacity instanced attributes and a ring cursor, with explicit lifetime, reset, and disposal paths.
- **Paper motion and trail read.** [OrigamiAbility.js](https://github.com/majidmanzarpour/threejs-vfx/blob/3d184edec529e5ad8055d8803967ea1f040aede0/src/abilities/ink/OrigamiAbility.js) separates flight, unfold, coast, fall, reveal, and fade; staggered opening makes the flock readable. Matte scraps use ordinary occlusion rather than additive glow. A cast captures a seed, while its current geometry follows normalized phase values. These are useful visual principles, without importing its FoldMesh/Swarm/shader dependency graph.
- **Deterministic geometry.** The original [ProceduralGeometry.js](https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS/blob/97f1de19617e9a2e3af3c8021c8c21c8f58b40f3/src/assets/ProceduralGeometry.js) derives shape variation from a seed and builds typed BufferGeometry attributes. Its non-indexed faces preserve crisp facets; bolt ribbons use normalized path coordinates. A paper effect can instead use a small original triangle/fold mesh and a few tapering trail pieces.

## Implementation decision and reuse boundary

Use the already installed `three/examples/jsm/libs/tween.module.js`: one explicit `Group`, `Tween` transitions for normalized phase progress, and `Easing` for flight and impact. Update the group from the existing render clock. Use original lightweight paper geometry, a deterministic per-cast seed, bounded fragments, and explicit cleanup on completion/reset. Keep gameplay resolution separate from animation completion.

The intended runtime reuse is **Tween.js through Three.js**. The two VFX repositories are technique references; no source, shader, model, texture, or binary asset from either is proposed for copying. If later work copies a substantial implementation, retain that repository's full MIT notice and add its source/path attribution to `THIRD_PARTY.md`. This research-only change does not modify runtime code or assert browser validation.

## Shipped module and validation

`src/spell-effects.js` imports the bundled Tween.js23.1.1 implementation directly: each pooled effect owns a `Tween` in an explicit `Group`, with `Easing.Cubic.InOut` driving its normalized phase and `Easing.Quadratic.InOut` shaping the projectile path. The clock advances from supplied frame deltas, with no wall-clock or gameplay wait. MIT notices are retained in `vendor/upstream/TWEEN-LICENSE.txt` and the distributable `public/licenses/tweenjs.txt`.

`SpellEffects(scene, {camera, renderer, reducedMotion})` exposes `cast(card, origin, target)`, `forge(card, origin)`, `update(dt, elapsed)` and `dispose()`. Cards are existing deterministic rune definitions; names are never parsed for magic families. Pass the enemy's anchor for damage, or a self/grimoire anchor for defensive magic. Optional `.stats` reports current effect/draw budgets for QA. Inputs are cloned; invalid positions are ignored.

Fire has a brief source seal/anticipation, a faceted paper fireball with trailing flame folds, then a burst at the actual target. Water travels in an arc, wind curls, stone unfolds a flattened faceted shield, and light/shadow/lightning/vine use distinct fragment/path behavior. Mixed elements select a derived family while retaining parent colors. Forge reads the output's two parent definitions and orbits/folds their cropped AI seed seals into a third result seal. Every particle, trail and fold is live geometry, not a video or pre-rendered effect.

Six persistent slots each use at most four visible single-pass draws. Folded particles use one InstancedMesh per effect; ribbons use fixed BufferGeometry attributes; seal meshes share one existing AI atlas map and change geometry UVs rather than cloning GPU textures. Completion hides/recycles slots; disposal releases all owned materials, geometries, the shared atlas and tweens. Reduced motion uses a brief quiet response without travel ribbons.

Six Node tests cover element/name independence, eight families, two hundred recursive combinations with bounded lifetime/work, six-slot burst reuse, target-reaching movement, ingredient/result seals, cleanup, and equivalent trajectories under different frame partitions. Muted isolated headless WebGL QA measured **4 actual renderer draw calls** for one effect and **24** for a burst capped at six. No browser JavaScript errors were observed. Integration into gameplay remains the caller's responsibility; this commit does not edit the main UI or resolve gameplay on animation completion.
