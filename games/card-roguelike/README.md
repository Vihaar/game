# The Fold

A first-person action roguelike inside a cursed papercraft library that is consuming reality. Walk eight physically connected areas, dodge living paper, and combine any two owned cards into a new spell. Forged spells can become ingredients again without a recipe-depth limit.

## Run

Requires Node.js 22 LTS and a desktop browser with WebGL.

```sh
cd games/card-roguelike
npm ci
npm run dev
```

Append `?seed=42` for repeatable hands, rewards and encounters. The route is authored, not procedurally generated. Run `npm run check`, `npm test` and `npm run build` before contributing. Static output is `dist/`; relative assets support `/games/the-fold/` or another subpath. `GAME_BASE` can override the build base.

## Play

- **Walk:** WASD. Click the scene for mouse look; Esc releases the mouse. Arrows also move/turn without capture. Space dodges spatially, with no invincibility.
- **Fight:** J or captured left click strikes without spending cards. K or captured right click raises a brief block. Click spells or press 1–5. T cycles targets. R redraws for 1 ink; ink regenerates over time.
- **Read enemies:** HP, next move, countdown and damage sit above each enemy. Ground marks lock during windup. Leave the mark before impact. Quills travel after the countdown and stop at cover. Offscreen attackers also produce a warning.
- **Forge:** F opens the sheet anywhere, including combat. Choose two different owned copies, inspect the result and costs, then confirm. WASD, Space and F remain usable. Enemies keep moving; attacking, casting and blocking are unavailable during the channel.
- **Explore:** M opens the map. Clear a room, take one reward, and walk through its newly opened doorway. Previous rooms stay open. Rewards restore only 1 HP. Break eight bindings and defeat the Unbinder.

Choose the balanced Binder, durable Warden or fast Runner. Their HP, movement, strike, guard and dodge recovery differ. Choose a forging price at the start or in the forge:

| Price | Channel | Additional completed cost |
| --- | --- | --- |
| Time | 2 seconds | None |
| Corruption | 0.35 seconds | +1 corruption for the run |
| Health | 0.35 seconds | 2 HP, never lethal |
| All three | 2 seconds | 2 HP and +1 corruption |

Every completed forge also consumes both exact copies and 1 ink. Costs apply only on completion; invalid or cancelled channels consume nothing. Corruption caps at 8 and adds `ceil(corruption / 2)` incoming damage, capped at +4. Warnings include that bonus. Wounds during a channel can make its HP price unaffordable and cancel it.

Keyboard/mouse are supported. Narrow layouts adapt, but touch movement is not implemented. Current runs are not saved. Discovered recipe metadata stays in this browser.

## Foundation and contribution

The controller adapts the MIT-licensed official **Three.js r181 FPS example**, retaining Capsule/Octree collisions and five simulation substeps. Original source/license remain in `vendor/upstream/`. See [RESEARCH.md](RESEARCH.md), [THIRD_PARTY.md](THIRD_PARTY.md), [DESIGN.md](DESIGN.md) and [ART_DIRECTION.md](ART_DIRECTION.md).

The included original papercraft atlas supplies every card without an AI account. Optional `/api/fold/discovery` metadata/art is disabled when the backend is unconfigured and never changes combat stats. No client API keys or required paid calls.

- `areas.mjs`: authored route, enemies, difficulty.
- `world.js`: scenery, physical doorways, static and gate Octrees.
- `player.js`: FPS foundation and spatial dodge.
- `combat.js` / `spatial.mjs`: chase, locked tells, projectiles and hit geometry.
- `rules.mjs` / `crafting.mjs`: resources, exact copies, deterministic any-pair recipes and forge prices.
- `main.js`: lifecycle/interface. Keep modeless panels from pausing combat.

Preserve readable telegraphs, scarce healing and bounded deterministic stats. More enemy moves, sound, difficulty tuning and accessibility are useful next contributions.

## Verification and limits

29 Node tests cover recipes, ownership, price modes, resources, combat rules, locked footprints, swept projectiles and all seven real-Octree gates in both directions, including unlocking/backtracking/reset. Browser QA covers normal walking/chase, overhead warnings, all four visible forging prices, movement/dodge during an active combat forge, exact consumption and the output entering the hand. A controlled development-page harness shortened fights to execute all eight areas/rewards, winning, free exploration and restart; this was not a manual full-difficulty campaign victory. Idle combat death and a controlled lethal hit both reached the death ending.

Rendering uses pixel ratio 1, at most 1600×900 internally, a 60 Hz cap, adjacent-area visibility and no dynamic shadows/postprocessing. Difficulty is intentionally high and needs player feedback. No multiplayer, touch movement or saved runs yet.
