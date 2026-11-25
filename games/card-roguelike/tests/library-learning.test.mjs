import test from "node:test";
import assert from "node:assert/strict";
import {
  newGuidedRun,
  startGuidedBattle,
  guidedCast,
  guidedStrike,
  guidedBlock,
  resolveEnemyTurn,
  enemyIntent,
  ensureCardCopies,
  takeReward,
  getCard,
  recipeFor,
  beginGuidedForge,
  guidedForgePreview,
  setForgeMode,
  tickGuidedForge,
  learningSummary,
  drainLibraryEvents,
  forgetLearnedRune,
} from "../src/guided-rules.mjs";
import {
  recordSuccessfulCast,
  LIBRARY_LEARNING_POLICY,
} from "../src/library-learning.mjs";
const rng = () => 0.4;
const guardian = () => [
  {
    id: "witness",
    type: "inkling",
    name: "The Witness",
    hp: 999,
    damage: 0,
    intentStep: 0,
    guard: 0,
  },
];
function fixture(key = "flare", id = "binder") {
  const s = newGuidedRun(id);
  s.inventory = [key, key, key, "stone"];
  s.inventoryCopyIds = [];
  ensureCardCopies(s);
  startGuidedBattle(s, rng, guardian());
  return s;
}
function train(s, key = "flare", count = 3) {
  let result;
  for (let i = 0; i < count; i++) {
    const index = s.hand.indexOf(key);
    assert.ok(index >= 0);
    result = guidedCast(s, index, 0, rng);
    assert.equal(result.ok, true);
    if (i < count - 1) resolveEnemyTurn(s, rng);
  }
  return result;
}
function clearRoom(s) {
  s.enemies.forEach((e) => {
    e.hp = 1;
    e.guard = 0;
  });
  for (let i = 0; i < s.enemies.length; i++) {
    s.struckThisTurn = false;
    guidedStrike(s, i);
  }
  assert.equal(s.phase, "reward");
  takeReward(s, "dew");
  return s;
}
function nextRoom(s) {
  clearRoom(s);
  assert.equal(s.floor, 2);
  startGuidedBattle(s, rng, guardian());
  return s.enemies[0];
}

test("only successful committed casts count; failed casts, basics and duplicate result replay cannot teach", () => {
  const s = fixture();
  const before = structuredClone(s.libraryLearning);
  assert.equal(guidedCast(s, -1).ok, false);
  s.energy = 0;
  assert.equal(guidedCast(s, s.hand.indexOf("flare")).ok, false);
  s.energy = 3;
  guidedStrike(s);
  guidedBlock(s);
  assert.deepEqual(s.libraryLearning, before);
  const result = guidedCast(s, s.hand.indexOf("flare"), 0, rng);
  assert.equal(learningSummary(s)[0].casts, 1);
  assert.deepEqual(recordSuccessfulCast(s, result), []);
  assert.equal(learningSummary(s)[0].casts, 1);
});
test("third cast clearly teaches once and emits structured UI events without resolving a surprise attack", () => {
  const s = fixture(),
    hp = s.hp;
  train(s, "flare", 2);
  assert.equal(learningSummary(s)[0].learned, false);
  assert.equal(learningSummary(s)[0].casts, 2);
  resolveEnemyTurn(s, rng);
  const result = train(s, "flare", 1);
  assert.equal(result.libraryEvents[0].type, "spell-learned");
  assert.equal(result.libraryEvents[0].key, "flare");
  assert.equal(result.libraryEvents[0].casts, 3);
  assert.equal(s.hp, hp);
  assert.equal(learningSummary(s)[0].ownedCopies, 3);
  const events = drainLibraryEvents(s);
  assert.deepEqual(
    events.map((e) => e.type),
    ["spell-observed", "spell-observed", "spell-learned"],
  );
  assert.deepEqual(drainLibraryEvents(s), []);
});
test("a later guardian announces a learned invention, prepares before copying, respects guard and adds corruption exactly once", () => {
  const s = fixture();
  train(s);
  drainLibraryEvents(s);
  const enemy = nextRoom(s);
  const copied = drainLibraryEvents(s).find(
    (e) => e.type === "guardian-copied",
  );
  assert.equal(copied.key, "flare");
  assert.equal(copied.enemyId, "witness");
  assert.equal(copied.sourceCharacterId, "binder");
  assert.equal(enemy.copiedSpell.key, "flare");
  assert.equal(s.enemies.filter((e) => e.copiedSpell).length, 1);
  s.corruption = 3;
  const prepare = enemyIntent(s, enemy);
  assert.equal(prepare.type, "copy-prepare");
  assert.equal(prepare.damage, 0);
  assert.match(prepare.label, /Flare/);
  assert.match(prepare.label, /8 damage/);
  const hp = s.hp;
  resolveEnemyTurn(s, rng);
  assert.equal(s.hp, hp);
  const cast = enemyIntent(s, enemy);
  assert.equal(cast.type, "copied-spell");
  assert.equal(cast.amount, 6);
  assert.equal(cast.damage, 8);
  assert.match(cast.label, /Flare.*8 damage/);
  guidedBlock(s);
  const result = resolveEnemyTurn(s, rng);
  assert.equal(result.actions[0].blocked, 4);
  assert.equal(result.actions[0].damage, 4);
  assert.equal(s.hp, hp - 4);
});
test("copies come from earlier floors only and invented spells outrank familiar ones deterministically", () => {
  const s = fixture();
  train(s);
  s.phase = "explore";
  startGuidedBattle(s, rng, guardian());
  assert.equal(s.enemies[0].copiedSpell, undefined);
  s.phase = "explore";
  s.floor = 2;
  startGuidedBattle(s, rng, guardian());
  assert.equal(s.enemies[0].copiedSpell.key, "flare");
  const base = fixture("ember");
  train(base, "ember");
  clearRoom(base);
  base.libraryLearning.observations.flare = structuredClone(
    s.libraryLearning.observations.flare,
  );
  startGuidedBattle(base, rng, guardian());
  assert.equal(base.enemies[0].copiedSpell.key, "flare");
});
test("copied defensive and mixed spells announce bounded guard/healing as well as damage", () => {
  for (const key of ["bastion", "spring", "obsidian", "mist", "firestorm"]) {
    const s = fixture(key);
    train(s, key);
    const enemy = nextRoom(s);
    resolveEnemyTurn(s, rng);
    enemy.hp = 100;
    const intent = enemyIntent(s, enemy);
    assert.equal(intent.type, "copied-spell");
    assert.match(intent.label, new RegExp(getCard(key).name));
    assert.ok(intent.amount <= LIBRARY_LEARNING_POLICY.maxCopiedDamage);
    assert.ok(intent.block <= 6);
    assert.ok(intent.heal <= 2);
    const before = enemy.hp;
    resolveEnemyTurn(s, rng);
    assert.equal(enemy.hp, Math.min(enemy.maxHp, before + intent.heal));
    assert.equal(enemy.guard, intent.block);
  }
});
test("time-price forging previews and executes the same copied move with the future corruption bonus", () => {
  const s = fixture();
  train(s);
  const enemy = nextRoom(s);
  resolveEnemyTurn(s, rng);
  setForgeMode(s, "all");
  const preview = guidedForgePreview(s, 0, 1);
  assert.equal(preview.enemyAction.type, "copied-spell");
  assert.equal(preview.enemyAction.damage, 7);
  assert.match(preview.enemyAction.label, /Flare.*7 damage/);
  beginGuidedForge(s, 0, 1);
  const hp = s.hp;
  let result;
  for (let i = 0; i < 20 && s.forge; i++) result = tickGuidedForge(s, 0.1);
  assert.ok(result.forged);
  assert.equal(result.action.type, "copied-spell");
  assert.equal(result.action.damage, 7);
  assert.equal(s.hp, hp - 2 - 7);
  assert.equal(enemy.copyStep, 2);
});
test("forgetting sacrifices all exact owned copies in every pile and removes only that spell danger without refunds", () => {
  const s = fixture();
  train(s);
  const enemy = nextRoom(s);
  clearRoom(s); // exploration, prior copied guardian remains as history
  const ids = s.inventoryCopyIds.filter((id, i) => s.inventory[i] === "flare"),
    other = s.inventoryCopyIds.find((id, i) => s.inventory[i] === "stone");
  s.hand = ["flare", "stone"];
  s.handCopyIds = [ids[0], other];
  s.draw = ["flare"];
  s.drawCopyIds = [ids[1]];
  s.discard = ["flare"];
  s.discardCopyIds = [ids[2]];
  s.hp = 8;
  s.energy = 1;
  s.corruption = 2;
  const resources = {
    hp: s.hp,
    energy: s.energy,
    corruption: s.corruption,
    casts: s.casts,
    merges: s.merges,
    turn: s.turn,
  };
  const result = forgetLearnedRune(s, "flare");
  assert.equal(result.ok, true);
  assert.equal(result.removedCount, 3);
  assert.deepEqual(new Set(result.removedCopyIds), new Set(ids));
  for (const zone of ["inventory", "hand", "draw", "discard"]) {
    assert.ok(!s[zone].includes("flare"));
    assert.ok(s[`${zone}CopyIds`].every((id) => !ids.includes(id)));
  }
  assert.ok(ids.every((id) => s.copyKeys[id] === undefined));
  assert.equal(s.copyKeys[other], "stone");
  assert.equal(
    s.enemies.some((e) => e.copiedSpell?.key === "flare"),
    false,
  );
  assert.equal(learningSummary(s).length, 0);
  assert.deepEqual(
    {
      hp: s.hp,
      energy: s.energy,
      corruption: s.corruption,
      casts: s.casts,
      merges: s.merges,
      turn: s.turn,
    },
    resources,
  );
  ensureCardCopies(s);
  assert.ok(!s.draw.includes("flare"));
  startGuidedBattle(s, rng, guardian());
  assert.equal(s.enemies[0].copiedSpell, undefined);
  assert.equal(result.event.type, "spell-forgotten");
  assert.equal(
    drainLibraryEvents(s).filter((e) => e.key === "flare").length,
    1,
  );
});
test("forgetting rejects combat, forging, travel, unlearned, unknown and unowned keys without mutation", () => {
  const s = fixture();
  train(s);
  for (const change of [
    { phase: "battle" },
    { phase: "explore", forge: {} },
    { phase: "explore", travelling: true },
    { phase: "explore", worldBusy: true },
  ]) {
    const copy = structuredClone(s);
    Object.assign(copy, change);
    const before = structuredClone(copy);
    assert.equal(forgetLearnedRune(copy, "flare").ok, false);
    assert.deepEqual(copy, before);
  }
  const exploring = structuredClone(s);
  exploring.phase = "explore";
  for (const [key, options] of [
    ["flare", { travelling: true }],
    ["stone", {}],
    ["unknown", {}],
  ]) {
    const before = structuredClone(exploring);
    assert.equal(forgetLearnedRune(exploring, key, options).ok, false);
    assert.deepEqual(exploring, before);
  }
  exploring.inventory = exploring.inventory.filter((key) => key !== "flare");
  const before = structuredClone(exploring);
  assert.equal(forgetLearnedRune(exploring, "flare").ok, false);
  assert.deepEqual(exploring, before);
});
test("forgetting cannot be refunded or revived by replay and a fresh life resets all learning", () => {
  const s = fixture();
  const cast = train(s);
  clearRoom(s);
  forgetLearnedRune(s, "flare");
  const after = structuredClone(s);
  assert.equal(forgetLearnedRune(s, "flare").ok, false);
  assert.deepEqual(s, after);
  assert.deepEqual(recordSuccessfulCast(s, cast), []);
  assert.equal(learningSummary(s).length, 0);
  const next = newGuidedRun("runner");
  assert.deepEqual(learningSummary(next), []);
  assert.deepEqual(drainLibraryEvents(next), []);
  assert.equal(next.libraryLearning.lastRecordedCast, 0);
  assert.equal(next.inventory.length, 8);
});
