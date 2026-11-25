# The library learns — rule slice

This extends the existing guided card/ownership engine. It adds no UI, assets, persistence service or new combat clock. A cast is an observation only after the existing cast transaction succeeds. Strike, Guard, failed casts and forging do not teach the library.

## Parent integration

Import these from `src/guided-rules.mjs`:

- `learningSummary(state)` → entries with `key`, `name`, `casts`, `learned`, `learnedAtFloor`, `firstFloor`, `lastFloor`, `invented`, `ownedCopies`, `copiedBy` (living enemy IDs). Reading does not mutate the model.
- `drainLibraryEvents(state)` → queued events, then clears the queue. Call after successful casts, battle entry and forgetting. Events contain `id`, `type`, `floor`, `key`, `name`; observation events add `casts`/`learned`, guardian events add `enemyId`/`enemyName`/`sourceCharacterId`, forgetting adds `removedCount`/`removedCopyIds`.
- `forgetLearnedRune(state, key, {travelling})` → `{ok, key, removedCount, removedCopyIds, event}` or `{ok:false, reason}`. Pass the UI's actual travelling flag. State-level `travelling` and `worldBusy` also block it.
- `LIBRARY_LEARNING_POLICY` documents the threshold and caps.

`guidedCast` records successful casts automatically and adds `result.libraryEvents`. At cast three, the event is `spell-learned`; other successful casts emit `spell-observed`. The run's `state.libraryLearning` holds observations, a bounded event queue, its sequence, and a successful-cast serial used to reject replay. A fresh `newGuidedRun` starts completely empty.

## Announced echoes

`startGuidedBattle` automatically selects one guardian on a later floor, from spells learned on an earlier floor. Invented spells take priority; then selection is deterministic by learning floor, usage and canonical key. Learning a spell never makes a current guardian attack unexpectedly.

`enemy.copiedSpell` contains `{key,name,kind,elements,invented,sourceCharacterId,damage,block,heal,learnedAtFloor}`. Its copied base power caps at6damage/6guard/2heal. The identity field supports the eventual recognition that the guardian echoes the same character; this module adds no reveal text.

`enemyIntent` supplies a three-action cycle: `copy-prepare` → `copied-spell` → normal move. Preparation is harmless and names the spell and exact upcoming effects. Actual copied intents include `spellKey`, `spellName`, `sourceCharacterId`, `copied:true`, `amount` (base incoming damage), `damage` (including current corruption), `block`, `heal`, `effectLabel` and `label`. Preparation additionally includes the actual next intent's amounts under `next`. Normal moves keep the existing shape.

`resolveEnemyTurn(...).actions` and a completed Time-price forge action retain that structured intent data, so the parent can animate `getCard(action.spellKey)` from the guardian's anchor. Copies replace an ordinary action; they are never a bonus hidden attack. Damage uses the existing guard/corruption resolver exactly once. Forge previews include their future corruption bonus before confirmation.

## Forgetting is a sacrifice

Forgetting is permitted only during exploration, with no active forge/travel/focus, after the library learned the spell and while at least one copy is owned. It removes **all** exact copies of that key from inventory, prepared/draw/resting arrays, their ID arrays and copyKeys. Other spell ownership is unchanged. It removes that observation, stale queued notices for the key and any historical guardian copy, so future guardians cannot select it. No ink, HP, corruption, cooldown, turn, cast-count or merge-count refund occurs. Repeated forgetting is rejected.

Canonical recipe definitions and decorative discovery metadata are not deleted from the shared catalog. Recrafting costs the normal ingredients and ink, and the library must observe three fresh casts to learn the spell again. A previously merged-away spell with zero owned copies cannot be forgotten for free; the summary exposes zero `ownedCopies` for that case. New lives reset the entire run-local memory regardless of the persistent recipe catalog.

## Validation

Nine integration tests use the real guided casting/ownership model: invalid casts and replay, third-cast announcement, later-floor preparation and guarded copying, invented-spell selection, bounded mixed/defensive effects, Time-price forge preview accuracy, all-pile exact-copy removal without refunds, rejected phases without mutation, and fresh-life reset. Existing guided tests remain unchanged. Browser/UI integration is the parent's separate validation step.
