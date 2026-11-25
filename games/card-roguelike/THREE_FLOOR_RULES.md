# Three-floor reusable fusion slice

The guided run now uses `GUIDED_FLOOR_COUNT = 3`: two guardians, a memory encounter that can copy learned magic, then `Your Unwritten Self` (42HP;9attack/11heavy with a charge gap). The original unflagged base run remains8floors for the retained framework/tests. `takeReward(state,null)` completes ONLY the final reusable-guided reward; earlier and legacy null rewards reject.

## Parent hooks

- `newGuidedRun` starts with7 reusable concepts: `ember`, `stone`, `dew`, `gust`, `memory`, `silence`, `mirror`; `preparedLimit=5`; `totalFloors=3`.
- `guidedRewardOptions(state)` returns a **pool** for the parent to shuffle/slice3. It favors novel synergies and includes source concepts, filtering forgotten keys.
- `guidedForgePreview` / `beginGuidedForge` retain the existing index-based API. The same index may be both inputs in reusable mode.
- Previews expose `output`, `parents`, `benefit`, `effect`, `retainInputs:true`, `free`, `inkCost`, normal punishment fields, and `replacesPrepared`. Already-owned/forgotten outputs return `ok:false` with `output`, `benefit`, `alreadyOwned` or `forgotten`, and a clear `reason`.
- Every card has deterministic `text`/`benefit`. Semantic properties are `effect`, `replay`, `interrupt`, `reflect`, `pierce`, `draw`; display names never determine powers.
- `guidedCast` returns `resolvedDamage` and `extras:{effect,replayedDamage,interruptedEnemyId,reflectGranted,piercedGuard}` in addition to existing fields/events.

## Economics and ownership

Combining between battles is free, including all existing price modes. In battle it costs1Focus (`energy`) plus the selected existing punishment. Inputs retain their exact owned IDs. One new output copy is added. An already-owned result is rejected without charging anything; use it as a new ingredient instead.

A new battle-forged output is prepared immediately. If all5slots are occupied, the last prepared copy moves to resting/discard before the output enters the hand. Its ID is retained. `latestForgedKey` is also guaranteed in the next battle's starting hand, so a large recipe collection does not hide the spell just invented. Draw/preparation effects honor the same5-slot cap. Canonical pair caching and fixed-length identities retain unlimited recursive combination; numerical power stays bounded.

## Six distinct synergies

All six are available from the initial source imprints and cost1Focus to cast.

| Inputs | Result | Exact benefit |
| --- | --- | --- |
| Ember + Memory | Afterflame | Replays the previous successful attack as flame, capped6;4if none. |
| Stone + Silence | Hushwall |4guard; cancels the target's next announced move, without stacking skipped actions. |
| Dew + Mirror | Silver Tide |3guard; reflects up to4guarded incoming damage that turn. |
| Gust + Memory | Recall Wind |2damage; prepares up to2inscriptions within5slots. |
| Ember + Silence | Quiet Pyre |5damage that ignores enemy guard without consuming it. |
| Stone + Mirror | Mirror Ward |6guard; reflects up to2guarded incoming damage. |

Arbitrary later fusions deterministically retain a semantic parent's perk rather than falling back to unrelated random stats. The selected perk and parent concept weights are commutative across input order and fresh caches. Damage/guard/healing remain capped; numerical generic fusions improve slot economy without poor damage/guard per Focus. Existing Flare/Bastion become8power for2Focus; Firestorm costs2; Mist costs1.

Guardians learn only successful casts as before. Copied intents include bounded reflection and piercing. A copied Silence-based interruption means **one less Focus next turn**, explicitly announced, since the player does not declare an enemy-style future move. Replayed copies store the attack damage actually observed. Guard and corruption apply exactly once; reflected damage respects guard and adds no second corruption bonus.

## Meaningful forgetting

For reusable guided runs, `forgetLearnedRune` adds the exact key to `state.forgottenRuneKeys` for the rest of this life. This prevents free re-inscription from reusable parents immediately undoing the sacrifice while erasing danger. Its owned copies and learned danger are removed as before. Distinct new fusions remain possible. A new life resets forgotten keys and observations; canonical recipe definitions remain available as metadata.

## Checks

Twelve new focused tests prove all six semantics,250actual consecutive reusable fusions, unique output ownership, preparation limits/latest-output availability, copied effects, paid combat/free exploration economics, permanent-in-life forgetting, final reward omission, and complete legal three-floor runs for all three characters with learned guardian echoes. Legacy base-rule tests remain green. Parent UI/world browser validation is a separate integration step.
