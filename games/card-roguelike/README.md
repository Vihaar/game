# The Fold

You wake with no name and no memories. Only a paper library stands before you, and a stairway leads up. Begin the climb. This is a guided, turn-based rune roguelike; the opening deliberately leaves your motive and the journey's ending unexplained.

## Run

Use Node.js22 LTS and a browser with WebGL.

```sh
cd games/card-roguelike
npm ci
npm run dev
npm run check
npm test
npm run build
```

Append `?seed=42` for repeatable prepared runes and rewards. `dist/` is static; relative assets support `/games/the-fold/` or another subpath. `GAME_BASE` overrides the build base.

## Explore the illustrated world

Warm storybook papercraft is the chosen style. Dimensional paper props and short guided camera movements connect eight floors. There is no free walking or mouse capture.

- **Read the open book:** focus a paper book and read a short floor-specific passage. Reading is optional and never awards resources or blocks progress.
- **Connect two ideas:** open your spellbook to combine rune imprints.
- **Ask the next question:** focus the next binding and begin its encounter. A clear Enter button remains available as a fallback.

The battle grimoire disappears between encounters so the world has room to breathe. Choosing a reward carries you into the next floor before its book and interactions become available. The journal remains accessible from the header. Keyboard focus returns to the world button after closing a book.

## The open grimoire

Your battle interface is a two-page spellbook. The left leaf holds Strike, Guard, ink and End turn. The right leaf contains prepared rune seals, their names, effects and costs. Choose a guardian, then cast a prepared rune for ink. You may Strike once and Guard once each turn without spending a rune.

**End turn** resolves every living guardian's displayed move, consumes remaining guard, refills ink and prepares fresh inscriptions. Nothing attacks, refills or expires while you think. Guard remains until resolution. Preparation, guard and heavy attacks are announced in advance. Presentation follows the browser's display refresh with capped resolution; combat has no reaction timer.

Binder:32HP/3ink/3strike/4guard. Warden:40HP/3ink/2strike/6guard. Runner:26HP/4ink/3strike/3guard. Optional opening settings are collapsed under Choose your path, with Binder/Time as defaults.

Keys:1–5 casts, J strikes, K guards, F opens the spellbook, M opens the journal, Esc closes a panel. Visible buttons support every action. Combat shortcuts do not fire behind an open reading/help/journal/forge panel. Rune seals support touch selection; narrow layouts retain all five initial prepared inscriptions.

## Combine runes

Two distinct owned rune imprints combine into a new inscription, which can become an ingredient again without a depth cap. The spellbook previews the result and exact price. Every completed combination consumes both exact imprints and1ink:

| Price | Additional cost |
| --- | --- |
| Time | In battle, one named enemy immediately performs its shown move after inscription. Outside battle, a short safe animation. |
| Corruption | +1 corruption for this run; no extra move. |
| Health | 2HP, never lethal; no extra move. |
| All three | One shown move in battle,2HP and1corruption. |

Corruption caps at8 and adds `ceil(corruption/2)` incoming damage, capped at+4. Intent labels and previews include the bonus. The extra inscription action advances only that guardian's intent, without resetting your turn or ink. Exact-copy ownership prevents spent ingredients returning through preparation/resting piles.

Every floor reward restores only1HP. **Full permadeath:** death loses bound runes, forged inscriptions, resources and floor progress. A new life starts from the first floor with the class's initial grimoire. Recipe metadata stays in this browser without granting combat power. Current runs are not saved.

## Narrative and foundation

Later floors reveal the thirst for knowledge and the price of understanding. The welcoming library darkens as you learn. The final answer grants complete knowledge as a curse; it never erases what was learned. Keep that revelation out of the awakening screen. See [NARRATIVE.md](NARRATIVE.md), [DESIGN.md](DESIGN.md) and [ART_DIRECTION.md](ART_DIRECTION.md).

Three.js renders actual stair-connected library geometry with separate illustrated shelves, canopies and props placed at different depths; `guided-rules.mjs` adapts the tested card/ownership engine and deterministic recipe system. Internal draw/discard names remain for compatibility, while the interface presents prepared/resting rune inscriptions. The original MIT Three.js FPS source stays available for provenance but is not imported by this entry point. Infinite Alchemy pair-caching notices remain intact. See [RESEARCH.md](RESEARCH.md) and [THIRD_PARTY.md](THIRD_PARTY.md).

Included original artwork works without accounts. Optional `/api/fold/discovery` decorates metadata/art only, remains off when unconfigured, and never changes combat statistics. No client API keys or required paid calls.

## Verification

Rule tests cover frozen thinking, explicit turns, held guard, classes, four inscription prices, exact copies, recursive combinations, death and eight rewards. A regression confirms free Strike/Guard alone cannot win with any class. World-interaction tests cover eight distinct optional books and phase gating without reading prerequisites.

Muted browser QA covers the minimal opening, actual read/forge/binding buttons, focus return, a first-floor victory through visible rune controls, guided arrival on floor2 and its matching book, hidden exploration grimoire, blocked combat shortcuts behind panels, and desktop/narrow open-spellbook layouts. Earlier guided QA also exercised all eight rewards/endings with shortened encounters and real turn-driven death/restart. Difficulty still needs human playtesting; no multiplayer or saved runs yet.

The new renderer is `walkthrough-library.js`, backed by `library-architecture.mjs`, `illustrated-library.mjs` and finite `camera-rail.mjs` routes. It never loads full-room concept images. `spell-effects.js` reuses the bundled MIT Tween.js for pooled paper spell animations. Fireballs have anticipation, travel and impact; eight element families and arbitrary fusions remain bounded. Generated surface textures and separated objects are documented in `public/art/MODEL_ASSETS.md` and `SCENE_PARTS.md`.
