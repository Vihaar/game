// Run-local memory: canonical spell definitions stay in the existing crafting catalog.
import { getCard, ensureCardCopies, corruptionDamageBonus } from "./rules.mjs";

export const LIBRARY_LEARNING_POLICY = Object.freeze({
  castsToLearn: 3,
  firstCopyFloor: 2,
  maxCopiedDamage: 6,
  maxCopiedBlock: 6,
  maxCopiedHeal: 2,
  maxEvents: 64,
});
export function createLibraryLearning() {
  return { observations: {}, events: [], sequence: 0, lastRecordedCast: 0 };
}
function memory(state) {
  return (state.libraryLearning ||= createLibraryLearning());
}
function emit(state, event) {
  const learning = memory(state);
  const next = { ...event, id: ++learning.sequence, floor: state.floor };
  learning.events.push(next);
  if (learning.events.length > LIBRARY_LEARNING_POLICY.maxEvents)
    learning.events.splice(
      0,
      learning.events.length - LIBRARY_LEARNING_POLICY.maxEvents,
    );
  return {
    ...next,
    ...(next.removedCopyIds
      ? { removedCopyIds: [...next.removedCopyIds] }
      : {}),
  };
}
const bounded = (value, cap) =>
  Number.isFinite(value) ? Math.max(0, Math.min(cap, Math.floor(value))) : 0;
function snapshot(card, characterId) {
  return {
    key: card.key || card.id,
    name: String(card.name || "Unknown inscription").slice(0, 48),
    kind: card.kind,
    elements: [...(card.elements || [card.kind])],
    invented: Boolean(card.fused || card.generated),
    sourceCharacterId: characterId,
    damage: bounded(card.damage, LIBRARY_LEARNING_POLICY.maxCopiedDamage),
    block: bounded(card.block, LIBRARY_LEARNING_POLICY.maxCopiedBlock),
    heal: bounded(card.heal, LIBRARY_LEARNING_POLICY.maxCopiedHeal),
  };
}
/** Internal integration hook: guidedCast passes its committed base cast result exactly once. */
export function recordSuccessfulCast(state, result) {
  if (
    !result?.ok ||
    !result.card ||
    !Number.isInteger(state.casts) ||
    state.casts < 1
  )
    return [];
  const card = getCard(result.card);
  if (!card) return [];
  const learning = memory(state);
  if (state.casts <= learning.lastRecordedCast) return [];
  learning.lastRecordedCast = state.casts;
  const previous = learning.observations[result.card];
  const casts = Math.min(Number.MAX_SAFE_INTEGER, (previous?.casts || 0) + 1);
  const justLearned = casts === LIBRARY_LEARNING_POLICY.castsToLearn;
  const observation = {
    casts,
    learned: casts >= LIBRARY_LEARNING_POLICY.castsToLearn,
    firstFloor: previous?.firstFloor ?? state.floor,
    lastFloor: state.floor,
    learnedAtFloor:
      previous?.learnedAtFloor ?? (justLearned ? state.floor : null),
    spellSnapshot: snapshot(card, state.characterId),
  };
  learning.observations[result.card] = observation;
  return [
    emit(state, {
      type: justLearned ? "spell-learned" : "spell-observed",
      key: result.card,
      name: observation.spellSnapshot.name,
      casts,
      learned: observation.learned,
    }),
  ];
}
export function learningSummary(state) {
  const observations = state.libraryLearning?.observations || {};
  return Object.entries(observations).map(([key, observation]) => ({
    key,
    name: getCard(key)?.name || observation.spellSnapshot.name,
    casts: observation.casts,
    learned: observation.learned,
    learnedAtFloor: observation.learnedAtFloor,
    firstFloor: observation.firstFloor,
    lastFloor: observation.lastFloor,
    invented: observation.spellSnapshot.invented,
    ownedCopies: (state.inventory || []).filter((owned) => owned === key)
      .length,
    copiedBy: (state.enemies || [])
      .filter((enemy) => enemy.hp > 0 && enemy.copiedSpell?.key === key)
      .map((enemy) => enemy.id),
  }));
}
export function drainLibraryEvents(state) {
  if (!state.libraryLearning) return [];
  const events = state.libraryLearning.events.map((event) => ({
    ...event,
    ...(event.removedCopyIds
      ? { removedCopyIds: [...event.removedCopyIds] }
      : {}),
  }));
  state.libraryLearning.events = [];
  return events;
}
/** One later-floor guardian echoes a prior learned spell; no additional enemy action. */
export function assignGuardianCopy(state) {
  for (const enemy of state.enemies) {
    delete enemy.copiedSpell;
    delete enemy.copyStep;
  }
  if (state.floor < LIBRARY_LEARNING_POLICY.firstCopyFloor) return null;
  const candidates = Object.entries(memory(state).observations).filter(
    ([, observation]) =>
      observation.learned && observation.learnedAtFloor < state.floor,
  );
  candidates.sort(
    (a, b) =>
      Number(b[1].spellSnapshot.invented) -
        Number(a[1].spellSnapshot.invented) ||
      b[1].learnedAtFloor - a[1].learnedAtFloor ||
      b[1].casts - a[1].casts ||
      a[0].localeCompare(b[0]),
  );
  const enemy = state.enemies.find((enemy) => enemy.hp > 0);
  if (!enemy || !candidates.length) return null;
  const [key, observation] = candidates[0];
  enemy.copiedSpell = {
    ...observation.spellSnapshot,
    key,
    name: getCard(key)?.name || observation.spellSnapshot.name,
    elements: [...observation.spellSnapshot.elements],
    learnedAtFloor: observation.learnedAtFloor,
  };
  enemy.copyStep = 0;
  return emit(state, {
    type: "guardian-copied",
    key,
    name: enemy.copiedSpell.name,
    casts: observation.casts,
    enemyId: enemy.id,
    enemyName: enemy.name,
    sourceCharacterId: enemy.copiedSpell.sourceCharacterId,
  });
}
function copyDetails(state, spell) {
  const amount = bounded(spell.damage, LIBRARY_LEARNING_POLICY.maxCopiedDamage),
    block = bounded(spell.block, LIBRARY_LEARNING_POLICY.maxCopiedBlock),
    heal = bounded(spell.heal, LIBRARY_LEARNING_POLICY.maxCopiedHeal);
  const damage = amount ? amount + corruptionDamageBonus(state) : 0;
  const effects = [
    damage ? `${damage} damage` : "",
    block ? `${block} guard` : "",
    heal ? `${heal} heal` : "",
  ].filter(Boolean);
  return {
    amount,
    damage,
    block,
    heal,
    effectLabel: effects.join(" + ") || "no damage",
  };
}
export function copiedEnemyIntent(state, enemy) {
  const spell = enemy.copiedSpell;
  if (!spell || !state.libraryLearning?.observations[spell.key]?.learned)
    return null;
  const step = (enemy.copyStep || 0) % 3,
    details = copyDetails(state, spell);
  const identity = {
    spellKey: spell.key,
    spellName: spell.name,
    sourceCharacterId: spell.sourceCharacterId,
    copied: true,
  };
  if (step === 0)
    return {
      ...identity,
      type: "copy-prepare",
      amount: 0,
      damage: 0,
      block: 0,
      heal: 0,
      next: { type: "copied-spell", ...details },
      label: `Studies your ${spell.name} · next: ${details.effectLabel}`,
    };
  if (step === 1)
    return {
      ...identity,
      type: "copied-spell",
      ...details,
      label: `Copies your ${spell.name} · ${details.effectLabel}`,
    };
  return null;
}
export function forgetLearnedRune(state, key, { travelling = false } = {}) {
  if (state.phase !== "explore" || state.hp <= 0)
    return {
      ok: false,
      reason: "Forget an inscription between encounters only.",
    };
  if (state.forge || travelling || state.travelling || state.worldBusy)
    return {
      ok: false,
      reason: "Finish travelling or inscribing before forgetting.",
    };
  const observation = state.libraryLearning?.observations[key];
  if (!observation?.learned)
    return {
      ok: false,
      reason: "The library has not learned this inscription.",
    };
  if (!(state.inventory || []).includes(key))
    return {
      ok: false,
      reason: "Forgetting requires an owned rune to surrender.",
    };
  ensureCardCopies(state);
  const removedCopyIds = state.inventoryCopyIds.filter(
      (_, index) => state.inventory[index] === key,
    ),
    removed = new Set(removedCopyIds);
  for (const zone of ["inventory", "hand", "draw", "discard"]) {
    const ids = state[`${zone}CopyIds`];
    const kept = state[zone]
      .map((owned, index) => ({ key: owned, id: ids[index] }))
      .filter((copy) => copy.key !== key && !removed.has(copy.id));
    state[zone] = kept.map((copy) => copy.key);
    state[`${zone}CopyIds`] = kept.map((copy) => copy.id);
  }
  for (const id of Object.keys(state.copyKeys))
    if (removed.has(id) || state.copyKeys[id] === key)
      delete state.copyKeys[id];
  delete state.libraryLearning.observations[key];
  // Already queued observation/copy notices cannot contradict the completed sacrifice.
  state.libraryLearning.events = state.libraryLearning.events.filter(
    (event) => event.key !== key,
  );
  for (const enemy of state.enemies || [])
    if (enemy.copiedSpell?.key === key) {
      delete enemy.copiedSpell;
      delete enemy.copyStep;
    }
  const event = emit(state, {
    type: "spell-forgotten",
    key,
    name: getCard(key)?.name || observation.spellSnapshot.name,
    removedCount: removedCopyIds.length,
    removedCopyIds,
  });
  return {
    ok: true,
    key,
    removedCount: removedCopyIds.length,
    removedCopyIds: [...removedCopyIds],
    event,
  };
}
