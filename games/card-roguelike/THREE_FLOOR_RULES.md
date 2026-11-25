# Three-floor reusable fusion slice

The guided run now uses `GUIDED_FLOOR_COUNT = 3`: two guardians, a memory encounter that can copy learned magic, then `Your Unwritten Self` (42HP;9attack/11heavy with a charge gap). The original unflagged base run remains8floors for the retained framework/tests. `takeReward(state,null)` completes ONLY the final reusable-guided reward; earlier and legacy null rewards reject.

## Parent hooks

- `newGuidedRun` starts one nameless apprentice with 32 HP and 3 Focus, and 7 reusable concepts: `ember`, `stone`, `dew`, `gust`, `memory`, `silence`, `mirror`; `preparedLimit=5`; `totalFloors=3`.
- `guidedRewardOptions(state)` returns a **pool** for the parent to shuffle/slice3. It favors novel synergies and includes source concepts, filtering forgotten keys.
- `guidedForgePreview` / `beginGuidedForge` retain the existing index-based API. The same index may be both inputs in reusable mode.
- Previews expose `output`, `parents`, `benefit`, `effect`, `retainInputs:true`, `free`, `inkCost`, normal punishment fields, and `replacesPrepared`. Already-owned/forgotten outputs return `ok:false` with `output`, `benefit`, `alreadyOwned` or `forgotten`, and a clear `reason`.
- Every card has deterministic `text`/`benefit`. Semantic properties are `effect`, `replay`, `interrupt`, `reflect`, `pierce`, `draw`; display names never determine powers.
- `guidedCast` returns `resolvedDamage` and `extras:{effect,replayedDamage,interruptedEnemyId,reflectGranted,piercedGuard}` in addition to existing fields/events.

## Economics and ownership

Every successful combination costs exactly 2 HP, both between encounters and during battle. It consumes no Focus, adds no corruption, and triggers no enemy action. It rejects if the sacrifice would kill the apprentice. The old base-engine price modes remain for regression coverage, but cannot change the guided run’s fixed health price. Inputs retain their exact owned IDs. One new output copy is added. An already-owned result is rejected without charging anything; use it as a new ingredient instead.

A new battle-forged output is prepared immediately. If all5slots are occupied, the last prepared copy moves to resting/discard before the output enters the hand. Its ID is retained. `latestForgedKey` is also guaranteed in the next battle's starting hand, so a large recipe collection does not hide the spell just invented. It is not forced into later hands: guaranteed repeated Hushwall would lock a solo boss indefinitely. Ember and Stone are prepared each turn as the core attack and defense; the other three slots vary. Draw/preparation effects honor the same5-slot cap. Canonical pair caching and fixed-length identities retain unlimited recursive combination; numerical power stays bounded.

## Spells-only turns

There is one playable character, The Nameless Apprentice. `newGuidedRun` ignores older class selections. Free Strike and Guard actions are unavailable; `guidedStrike` and `guidedBlock` reject without mutation. Cast spells, then end the turn. Focus refills to 3 and the book prepares five spells. Defensive Stone, Silence and their combinations remain normal Focus-paid spells. Thinking and combining never trigger unannounced enemy turns.

## Branching routes and relics

Before each battle, choose one of two routes. `guidedRouteOptions(state)` returns objects with `id`, `title`, `description`, `risk` and `reward`. `guidedChooseRoute(state, id, rng)` returns `{ok,route,relics}` and records `state.routeChoice={id,floor,rewardGranted}`. Invalid/repeated choices reject. Seeded choices can select a different guardian pair on the first two floors.

- `archive`: discover one unique relic immediately; normal encounter.
- `guardian`: enemies have 20% more HP (rounded up) and +1 damage; discover two relics after victory. On the final floor the two relics arrive before the stronger boss, so their power is useful.

`state.relics` contains unique IDs. `guidedRelics(state)` returns readable `{id,name,description}` objects; `guidedRelicInfo(id)` resolves one. The last grant is also exposed in `state.lastRelics`. `takeReward(state,reward,rng)` grants earned relics exactly once, clears the route and retains owned relics for this life. Pass the game’s seeded RNG for reproducible grants. A fresh run resets relics and routes.

| ID | Relic | Rule |
| --- | --- | --- |
| emberseal | Charcoal Seal | First damaging spell each battle deals +2 damage. |
| marginward | Silver Margin | First guard spell each turn grants +2 guard. |
| mirrorthread | Mirror Thread | Guard spells also reflect 1 guarded damage this turn. |
| dogear | The Dog-Eared Page | First preparation spell each battle restores 1 Focus. |
| bloodbookmark | Red Bookmark | A battle combination grants 3 guard, still costing 2 HP. |
| quietlamp | The Last Reading Lamp | Recover 1 extra HP after victory. |

## Nine distinct synergies

All nine are available from the initial source imprints and cost1Focus to cast.

| Inputs | Result | Exact benefit |
| --- | --- | --- |
| Ember + Memory | Afterflame | Replays the previous successful attack as flame, capped6;4if none. |
| Stone + Silence | Hushwall |4guard; cancels the target's next announced move, without stacking skipped actions. |
| Dew + Mirror | Silver Tide |3guard; reflects up to4guarded incoming damage that turn. |
| Gust + Memory | Recall Wind |2damage; prepares up to2inscriptions within5slots. |
| Ember + Silence | Quiet Pyre |5damage that ignores enemy guard without consuming it. |
| Stone + Mirror | Mirror Ward |6guard; reflects up to2guarded incoming damage. |
| Ember + Mirror | Ricochet | Three 2-damage sparks: chosen enemy first, then two seeded-random living targets. Guard applies per hit. |
| Memory + Mirror | Stolen Sentence | Deal selected enemy’s announced attack damage, clamped2–8;3for a non-attack. |
| Dew + Memory | Borrowed Dawn | Restore2Focus (maximum3), prepare1; next turn loses1Focus. Once per turn across all descendants. |

Arbitrary later fusions deterministically retain a semantic parent's perk rather than falling back to unrelated random stats. The selected perk and parent concept weights are commutative across input order and fresh caches. Damage/guard/healing remain capped; numerical generic fusions improve slot economy without poor damage/guard per Focus. Existing Flare/Bastion become8power for2Focus; Firestorm costs2; Mist costs1.

Guardians learn only successful casts as before. Copied intents include bounded reflection and piercing. A copied Silence-based interruption means **one less Focus next turn**, explicitly announced, since the player does not declare an enemy-style future move. Replayed copies store the attack damage actually observed. Guard and corruption apply exactly once; reflected damage respects guard and adds no second corruption bonus.

## Meaningful forgetting

For reusable guided runs, `forgetLearnedRune` adds the exact key to `state.forgottenRuneKeys` for the rest of this life. This prevents free re-inscription from reusable parents immediately undoing the sacrifice while erasing danger. Its owned copies and learned danger are removed as before. Distinct new fusions remain possible. A new life resets forgotten keys and observations; canonical recipe definitions remain available as metadata.

## Checks

The Fold suite proves all nine spell semantics, 250 consecutive fusions with a deliberately enlarged test health budget, unique ownership, preparation limits, copied effects, fixed 2 HP economics, nonlethal rejection, permanent-in-life forgetting, route risk/reward, all six relic mechanics, final reward timing, and a complete legal spells-only three-floor run through an elite encounter with learned guardian echoes. No combat-state cheats or free basics are used in that win test. Legacy base-rule tests remain green. Parent UI/world browser validation is a separate integration step.

## Extending magic

See SPELL_AUTHORING.md for exact integration steps, deterministic recipes, three distinctive newer mechanics, copied adaptations, cast result hit logs and loop-prevention tests. Every new rule must survive recursive combination without turning into unrelated generic stats.
