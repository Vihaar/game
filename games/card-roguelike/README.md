# The Fold

A guided, turn-based card roguelike in an illustrated paper library. You enter knowing nothing, driven by a thirst for knowledge. Its guardians personify unanswered questions. Across eight chapters—Language, Life, Memory, Transformation, Cosmos, Truth, Self and Everything—you connect discoveries into complete understanding and restore reality.

## Run and check

Node.js22 LTS and a WebGL browser are required.

```sh
cd games/card-roguelike
npm ci
npm run dev
npm run check
npm test
npm run build
```

Append `?seed=42` for repeatable cards and rewards. Output is static `dist/`; relative assets support `/games/the-fold/` or another subpath. Set `GAME_BASE` for an explicit base.

## Your turn, your pace

Click **Enter** between chapters for a guided paper-stage transition. The camera stays fixed during battles. There is no walking, aiming, pointer capture, dodging or automatic enemy damage.

Choose a guardian to target. Cast cards for ink, strike once and guard once each turn. **End turn** resolves every living guardian's displayed move, consumes remaining guard, refills ink and draws a new hand. Nothing refills or expires while you think. Guard cards remain useful until resolution. Enemy preparation and heavy attacks alternate; every move and its current damage is shown before commitment.

Three starting characters differ: Binder32HP/3ink/3strike/4guard; Warden40HP/3ink/2strike/6guard; Runner26HP/4ink/3strike/3guard. Every room reward heals only1HP.

Keys: **1–5** casts, **J** strikes, **K** guards, **F** opens the forge, **M** opens the knowledge journal. Visible buttons support every action. The interface adapts to narrow screens; a keyboard is optional for the guided game.

## Connect ideas

Any two distinct owned copies can merge, including already-forged spells, without a depth cap. The preview shows the result, exact consumed copies and price. All modes consume both copies and1ink on successful completion:

| Price | Additional cost |
| --- | --- |
| Time | In battle, one named enemy immediately performs its shown move after folding. Outside battle, a short safe animation. |
| Corruption | +1 corruption for this run; no extra move. |
| Health | 2HP, never lethal; no extra move. |
| All three | One immediate shown move in battle,2HP and1corruption. |

Corruption caps at8 and adds `ceil(corruption/2)` incoming damage, capped at+4. Both enemy labels and forge previews include that bonus. An immediate forge action advances only that enemy's intent, without resetting your turn or ink. Forge animations are brief feedback, not reaction challenges. Thinking never triggers an enemy move.

**Full permadeath:** death loses your deck, forged cards, resources and chapter progress. New runs begin from chapter1 with the class's original deck. Recipe metadata stays in this browser without granting combat power. Current runs are not saved. Winning sincerely delivers complete understanding; there is no punishment twist.

## Foundation and contributions

`guided-rules.mjs` adapts the existing tested card/ownership model in `rules.mjs` and deterministic recipe system in `crafting.mjs`. Exact copy IDs prevent consumed ingredients returning through draw/discard. The Infinite Alchemy pair-caching adaptation retains its MIT notices. Three.js remains the renderer; `diorama.js` supplies illustrated layered stages and guided transitions. The original MIT Three.js FPS controller/world remain in the source for provenance and reference, but are not imported by this guided entry point. See [RESEARCH.md](RESEARCH.md), [THIRD_PARTY.md](THIRD_PARTY.md), [NARRATIVE.md](NARRATIVE.md), [DESIGN.md](DESIGN.md) and [ART_DIRECTION.md](ART_DIRECTION.md).

Original included card art works without an AI account. Optional `/api/fold/discovery` decorates recipe metadata/art only and stays off when its hosting backend is unconfigured. Deterministic combat statistics never come from a model. No client API keys or required paid calls.

Good contributions include new announced move patterns, character tuning, more knowledge dialogue and accessibility improvements. Keep turn decisions explicit, healing scarce, and any cost visible before confirmation.

## Verification and limits

The existing29 rule/spatial tests remain green. Nine guided tests cover frozen thinking, turn resolution, held guard, once-per-turn basics, classes, every forge price, exact extra actions, enemy guard, full permadeath and eight rewards. A regression confirms free strike+guard alone cannot win the campaign with any class. A deterministic card-playing pilot can win with all three classes; this is balance evidence, not a substitute for human playtesting.

Muted headless browser checks cover normal turns, target controls, unchanged state while thinking, all four visible forge prices, recursively merging actual outputs, exact copy reduction, and output cards entering the hand. An accelerated browser harness reduced guardian HP to exercise all eight chapter/reward/win flows; it was not a manual campaign victory. Real repeated End-turn inputs reached death, then restart restored floor1/eight copies/full class HP/zero curse. No browser JavaScript errors were observed.

Rendering caps pixel ratio1, internal size1600×900 and45Hz with no dynamic shadows/postprocessing. Art style previews are available before the run. No multiplayer or saved runs yet.
