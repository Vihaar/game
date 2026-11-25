import test from "node:test";
import assert from "node:assert/strict";
import {
  newGuidedRun,
  startGuidedBattle,
  ensureCardCopies,
  prepareCopy,
  guidedCast,
  resolveEnemyTurn,
  enemyIntent,
  getCard,
  recipeFor,
  learningSummary,
} from "../src/guided-rules.mjs";
const seed = () => 0.4;
function fixture(keys, definitions) {
  const s = newGuidedRun();
  s.inventory = keys;
  s.inventoryCopyIds = [];
  ensureCardCopies(s);
  startGuidedBattle(
    s,
    seed,
    definitions ||
      [0, 1, 2].map((i) => ({
        id: `keeper-${i}`,
        type: "inkling",
        name: `Keeper ${i}`,
        hp: 50,
        damage: 4,
        intentStep: 0,
      })),
  );
  return s;
}
const cast = (s, key, target = 0, rng = seed) => {
  const id = s.inventoryCopyIds.find((id) => s.copyKeys[id] === key);
  prepareCopy(s, id);
  return guidedCast(s, s.hand.indexOf(key), target, rng);
};
test("Ricochet commits its selected first target, then seeded random living targets, with per-spark guard", () => {
  const s = fixture(["ricochet"]);
  s.enemies[1].guard = 1;
  const rolls = [0, 0.99];
  const result = cast(s, "ricochet", 1, () => rolls.shift());
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.extras.hits.map((h) => h.targetIndex),
    [1, 0, 2],
  );
  assert.deepEqual(
    result.extras.hits.map((h) => h.hpDamage),
    [1, 2, 2],
  );
  assert.deepEqual(
    result.extras.hits.map((h) => h.blocked),
    [1, 0, 0],
  );
  assert.equal(result.resolvedDamage, 6);
  assert.equal(s.energy, 2);
  assert.equal(s.casts, 1);
  assert.equal(learningSummary(s)[0].casts, 1);
});
test("Ricochet skips defeated enemies, can bounce back, and resolves the final spark as victory", () => {
  const s = fixture(
    ["ricochet"],
    [
      { id: "first", hp: 1, damage: 0 },
      { id: "last", hp: 4, damage: 0 },
    ],
  );
  const r = cast(s, "ricochet", 0, () => 0);
  assert.deepEqual(
    r.extras.hits.map((h) => h.enemyId),
    ["first", "last", "last"],
  );
  assert.equal(s.phase, "reward");
  assert.equal(s.enemies[1].hp, 0);
});
test("Ricochet and Stolen Sentence reject invalid or defeated first targets without payment, learning or RNG use", () => {
  for (const key of ["ricochet", "stolensentence"]) {
    const s = fixture([key]);
    const before = structuredClone(s);
    const rng = () => {
      throw Error("failed casts cannot roll targets");
    };
    assert.equal(guidedCast(s, s.hand.indexOf(key), 999, rng).ok, false);
    assert.deepEqual(s, before);
    s.enemies[0].hp = 0;
    const dead = structuredClone(s);
    assert.equal(guidedCast(s, s.hand.indexOf(key), 0, rng).ok, false);
    assert.deepEqual(s, dead);
  }
});
test("Ricochet sparks spend guard and reflect each guarded hit without a hidden damage multiplier", () => {
  const s = fixture(
    ["ricochet"],
    [{ id: "mirror", hp: 20, damage: 0, guard: 5, reflect: 4 }],
  );
  s.enemies[0].guard = 5;
  s.enemies[0].reflect = 4;
  const hp = s.hp;
  const r = cast(s, "ricochet", 0, () => 0);
  assert.deepEqual(
    r.extras.hits.map((h) => h.blocked),
    [2, 2, 1],
  );
  assert.equal(s.enemies[0].hp, 19);
  assert.equal(s.hp, hp - 4);
  assert.equal(s.enemies[0].guard, 0);
});
test("Stolen Sentence snapshots the chosen next attack, caps it, and falls back for non-attacks", () => {
  for (const [damage, intentStep, expected] of [
    [7, 0, 7],
    [20, 0, 8],
    [1, 0, 2],
    [7, 1, 3],
  ]) {
    const s = fixture(
      ["stolensentence"],
      [{ id: "read", hp: 50, damage, type: "inkling", intentStep }],
    );
    const r = cast(s, "stolensentence");
    assert.equal(r.resolvedDamage, expected);
    assert.equal(r.extras.stolenDamage, expected);
    assert.equal(s.enemies[0].hp, 50 - expected);
    assert.equal(s.enemies[0].intentStep, intentStep);
    assert.equal(s.lastAttack.damage, expected);
  }
  const guarded = fixture(["stolensentence"]);
  guarded.enemies[1].damage = 7;
  guarded.enemies[1].guard = 5;
  cast(guarded, "stolensentence", 1);
  assert.equal(guarded.enemies[1].hp, 48);
  assert.equal(guarded.enemies[0].hp, 50);
});
test("Borrowed Dawn advances Focus and preparation once per turn, repaying debt exactly once", () => {
  const derived = recipeFor("borroweddawn", "stone"),
    s = fixture(["borroweddawn", derived, "ember", "stone", "gust", "dew"]);
  s.energy = 1;
  const r = cast(s, "borroweddawn");
  assert.equal(r.ok, true);
  assert.equal(r.extras.focusGained, 2);
  assert.equal(r.extras.focusDebt, 1);
  assert.equal(s.energy, 2);
  assert.equal(s.hand.length, 5);
  const id = s.inventoryCopyIds.find((id) => s.copyKeys[id] === derived);
  prepareCopy(s, id);
  const before = structuredClone(s);
  assert.equal(guidedCast(s, s.hand.indexOf(derived), 0, seed).ok, false);
  assert.deepEqual(s, before);
  resolveEnemyTurn(s, seed);
  assert.equal(s.energy, 2);
  assert.equal(s.nextTurnEnergyPenalty, 0);
  resolveEnemyTurn(s, seed);
  assert.equal(s.energy, 3);
  assert.equal(cast(s, derived).ok, true);
});
test("Borrowed Dawn debt survives victory and applies to the next battle opening turn", () => {
  const s = fixture(
    ["borroweddawn", "ember"],
    [{ id: "last", hp: 4, damage: 0 }],
  );
  cast(s, "borroweddawn");
  cast(s, "ember");
  assert.equal(s.phase, "reward");
  s.phase = "explore";
  s.floor = 2;
  startGuidedBattle(s, seed, [{ id: "next", hp: 30, damage: 0 }]);
  assert.equal(s.energy, 2);
  assert.equal(s.nextTurnEnergyPenalty, 0);
  resolveEnemyTurn(s, seed);
  assert.equal(s.energy, 3);
});
test("each new mechanic survives recursive composition and keeps bounded exact semantics", () => {
  for (const [key, effect, property] of [
    ["ricochet", "ricochet", "ricochet"],
    ["stolensentence", "stolensentence", "stealIntent"],
    ["borroweddawn", "focusdebt", "borrowFocus"],
  ]) {
    let next = key;
    for (let n = 0; n < 15; n++) {
      const left = recipeFor(next, "stone"),
        right = recipeFor("stone", next);
      assert.equal(left, right);
      const card = getCard(left);
      assert.equal(card.effect, effect);
      assert.ok(card[property]);
      assert.equal(card.cost, 1);
      assert.ok(card.text.length);
      next = left;
    }
  }
});
test("later guardians announce bounded observed sparks, stolen damage, and borrowed Focus before copying", () => {
  for (const key of ["ricochet", "stolensentence", "borroweddawn"]) {
    const s = fixture(
      [key, key, key],
      [{ id: "witness", type: "inkling", hp: 999, damage: 7 }],
    );
    for (let i = 0; i < 3; i++) {
      const r = cast(s, key);
      assert.equal(r.ok, true);
      resolveEnemyTurn(s, seed);
      s.hp = 32;
    }
    s.phase = "explore";
    s.floor = 2;
    startGuidedBattle(s, seed, [
      { id: "echo", type: "inkling", hp: 999, damage: 0 },
    ]);
    const prepare = enemyIntent(s, s.enemies[0]);
    assert.equal(prepare.type, "copy-prepare");
    assert.match(prepare.label, new RegExp(getCard(key).name));
    resolveEnemyTurn(s, seed);
    const actual = enemyIntent(s, s.enemies[0]);
    assert.equal(actual.type, "copied-spell");
    assert.ok(actual.damage <= 6);
    if (key === "borroweddawn") {
      assert.equal(actual.focusDrain, 1);
      assert.match(actual.label, /-1 Focus/);
      resolveEnemyTurn(s, seed);
      assert.equal(s.energy, 2);
    } else assert.ok(actual.damage > 0);
  }
});
