# Adding a spell to The Fold

Spells are code-defined mechanics, separate from their names and artwork. Combinations resolve locally and deterministically. An AI-written name must never supply executable rules, alter damage or change recipe identity.

## Add a concept or a known discovery

1. Add an entry to `CARDS` in `src/rules.mjs`. Use a stable lowercase key. Include `name`, a visual `kind`, `cost`, exact plain-language `text`, and the numeric/semantic properties the implementation needs. Source concepts may specify `concept` separately from the visual family.
2. For a known two-ingredient discovery, add `{ inputs: ["first", "second"], output: "yourkey" }` to `SYNERGY_RECIPES`. Input order is canonicalized. Both ingredients must exist before `createCraftingSystem` initializes the catalog. All nine named concept discoveries currently cost 1 Focus to cast. Crafting any new output costs 2 HP through the guided forge policy.
3. To make a new source concept available from the beginning, add it to `newGuidedRun`’s inventory. Keep five prepared slots and a small readable starting pool. A recipe does not need a new starting concept: the existing seven already support many combinations.
4. Put presentation in the separate art/effect modules. `src/spell-illustrations.mjs` selects original layered SVG shapes by `card.key`; it must not flatten the book or room. `src/effectprofile.mjs` and `src/spell-effects.js` own animation. Art does not define powers.

## Give it a mechanic, not just a bigger number

Use `effect` as a stable mechanic identifier and explicit properties as its parameters. The guided turn adapter (`src/guided-rules.mjs`) validates/commits casts and implements rules that need announced intentions or seeded random targets. Ordinary damage, guard, healing and preparation reuse the base `castCard`. Never spend resources or advance RNG before validating the required living target.

Current special examples:

| Ingredients | Key / effect | Rule |
| --- | --- | --- |
| Ember + Mirror | `ricochet` / `ricochet` | Three 2-damage sparks: selected target first, then seeded random living enemies. Guard and reflection settle separately on each hit. Stop if no target remains. |
| Memory + Mirror | `stolensentence` / `stolensentence` | Snapshot the selected enemy’s current announced damage, clamp it to 2–8, or use 3 for a non-attack. Guard still applies; the enemy’s intention is not consumed. |
| Dew + Memory | `borroweddawn` / `focusdebt` | Restore up to 2 Focus after paying the cast cost and prepare one spell. Owe 1 Focus next turn. Only one borrowed-Focus spell, including derived versions, may be cast each turn. |

Borrowed Focus cannot exceed the apprentice’s maximum. Debt is consumed once on the next player turn, including the next battle’s opening turn if victory came first. A library-copied Focus interruption can combine with the debt, capped at 2 Focus lost. A fresh run clears all debt.

`guidedCast` returns `extras.hits`, ordered by impact, for Ricochet. Each entry has `targetIndex`, `enemyId`, raw `damage`, `blocked` and actual `hpDamage`. A missing/dead first target rejects without a charge or RNG call. Later spark rolls only choose currently living targets and may bounce back. It also returns `extras.stolenDamage`, `focusGained` and `focusDebt`. `resolvedDamage` is the total raw committed damage before guard, used by Afterflame and bounded library observation; use the hit log for individual impact visuals.

## Make it survive arbitrary combining

`src/crafting.mjs` chooses one semantic parent deterministically when generating a deeper recipe. Add the effect’s inheritance branch there, copy only allowed properties, remove conflicting generated powers, keep bounded values, and generate exact effect text. The same pair in reverse order and a fresh cache must create the same definition. Do not use a display name to decide rules. The three mechanics above retain their behavior at arbitrary recipe depth, while the once-per-turn borrowing restriction is shared across all derived cards.

## Let the library learn it fairly

Add bounded metadata in `src/library-learning.mjs` if the new power needs it. Every copied effect must be announced during a preparation move before it acts. Ricochet and Stolen Sentence copies use observed damage capped at 6. Borrowed Dawn’s enemy adaptation announces one less player Focus next turn, because guardians do not have the player’s Focus pool. There is no hidden extra enemy action.

## Verify the player contract

Write focused tests for a normal cast, invalid target/no-payment, guard/reflection interactions, deterministic random outcomes, inheritance, copied intent and restart/debt reset. For effects that grant actions or resources, test the loop-prevention limit across generated descendants. `tests/spell-inventions.test.mjs` is a complete example. Keep global recipe definitions immutable during a cast; runtime choices belong in run state and the cast result.

Run `npm --prefix games/card-roguelike test`, `npm --prefix games/card-roguelike run check`, and `npm --prefix games/card-roguelike run build`. The parent integration then checks enemy clicking, touch, animation sequencing and a legal complete run in the browser.
