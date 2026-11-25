# The Fold

Wake with no name before a strange library. This playtest is a complete run through three floors: the warm Intake Hall, the Abandoned Stacks, and the dark Mirror Archive. Guided camera paths connect the rooms; battles wait for your turn. The last guardian learns from the spells you cast.

## Run

Use Node.js 22 LTS and a browser with WebGL.

```sh
cd games/card-roguelike
npm ci
npm run dev
npm run check
npm test
npm run build
```

Use `?seed=42` for repeatable starting spells and rewards. Static builds support `/games/the-fold/`; `GAME_BASE` sets another base path.

## Play

Begin the climb, then choose **Face the first guardian**. Read a room's book or combine spells before entering its encounter. The path offers a skip control and recovers from stalled presentation.

Select an attack spell on the left page, then click an enemy to cast it. You can also select a target and use the Cast button on the right. Escape cancels aiming. **Focus**, shown by a crystal/star and a visible label, pays for spells and refills on **End turn**. There are no separate Strike or Guard actions: choose damage, guard, silence and reflection spells. You play one nameless apprentice. Enemy health and its exact next move appear above it. Nothing attacks while you think.

Keys: 1-5 cast, F combines, M opens the journal, Esc closes a page. Mouse/touch buttons support every action. Combat shortcuts pause behind open utility pages.

## Simple, reusable combining

Pick two owned spells, including the same one twice. See the result, then press **Combine**. Both originals remain yours. The result is another ingredient, with no recipe-depth cap.

Every new combination costs exactly 2 HP, both between battles and during combat. It costs no Focus and triggers no extra enemy action. A combination that would kill you is rejected without payment. A duplicate owned result costs nothing and creates no extra copy. Newly forged spells are prepared immediately in battle and the latest is guaranteed in the next starting hand. Only five spells can be prepared at once. Each turn includes Ember and Stone so a random preparation cannot remove all attack or defense.

Seven starting concepts are available: Ember, Stone, Dew, Gust, Memory, Silence and Mirror. Nine useful discoveries are:

| Combine         | Discover    | Benefit                               |
| --------------- | ----------- | ------------------------------------- |
| Ember + Memory  | Afterflame  | Repeat the previous attack as flame   |
| Stone + Silence | Hushwall    | Guard and interrupt an announced move |
| Dew + Mirror    | Silver Tide | Guard and reflect incoming damage     |
| Gust + Memory   | Recall Wind | Damage and prepare two spells         |
| Ember + Silence | Quiet Pyre  | Damage that bypasses guard            |
| Stone + Mirror  | Mirror Ward | Strong guard with reflection          |
| Ember + Mirror | Ricochet | Three sparks; chosen target first, then random living targets |
| Memory + Mirror | Stolen Sentence | Use the enemy's announced attack against it |
| Dew + Memory | Borrowed Dawn | Borrow Focus now and repay it next turn |

Ricochet, Stolen Sentence and Borrowed Dawn each have a distinct live cast/impact animation, using the resolved target positions. Reduced motion keeps a short static effect. Further combinations retain meaningful parent mechanics and bounded strengths. See THREE_FLOOR_RULES.md for exact rules and ownership guarantees; SPELL_AUTHORING.md explains how contributors add concepts, recipes and mechanics.

## Choose your risk

Before each encounter, choose an archive or a guardian route. The archive gives one random relic before a normal battle. The guardian has stronger enemies and gives two relics after victory. On the last floor those relics arrive before the final fight. Relics can strengthen first attacks, improve guard, reflect damage, restore limited Focus, reward combat combining, or add a small victory heal. Exact effects appear in the Journal. Seeded encounters and relics vary each run; full permadeath resets them.

## The library learns

Three successful casts teach a spell to the library. Later guardians announce copied magic before using it. Between battles, the journal can **Forget** a learned spell: surrender every owned copy and erase that danger. In this run that exact forgotten result cannot be re-created for free. A new life resets this restriction.

Invented fire magic leaves separate scorch and ash layers in the rooms. The later floors also lose books, lamps and shelf sections. The third guardian ends the run immediately. Full permadeath loses owned spells, resources, learning and progress. Recipe metadata alone can remain in the browser.

## Art and verification

The book, world, enemies and spells remain separate code-composed layers. Library objects carry their own pigment shading and irregular ink contours. Enemies are original curved drawings assembled from separate body, hood, face, eyes, arms and prop geometry, with gentle hit responses; complete enemy sprites are not used. Spell illustrations use original SVG silhouettes, paint shading, ink edges and animated outlines. The book still has only Spells and Combine tabs. Almendra's bundled manuscript type and its OFL notice are under `public/fonts` and `public/licenses`. ART_DIRECTION.md is the visual contract; source and license notices are in THIRD_PARTY.md.

The base engine's older eight-floor data remains for future expansion and regression coverage. The playable guided run ends at three. Rule tests cover recursive fusion, semantic effects, ownership, copied spells, forgetting, permadeath and legal three-floor victories. World tests cover progressive abandonment, routes, startup recovery and bounded discovery scars. Browser QA covers the actual three-floor run, combining, Focus, the ending/restart, and desktop/mobile layouts. Human difficulty feedback is still needed.
