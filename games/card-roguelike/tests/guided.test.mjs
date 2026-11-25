import test from "node:test";
import assert from "node:assert/strict";
import {
  newGuidedRun,
  startGuidedBattle,
  guidedStrike,
  guidedBlock,
  guidedCast,
  resolveEnemyTurn,
  enemyIntent,
  guidedForgePreview,
  beginGuidedForge,
  tickGuidedForge,
  prepareCopy,
  guidedRouteOptions,
  guidedChooseRoute,
  guidedRelics,
  takeReward,
} from "../src/guided-rules.mjs";
const rng = () => 0.4;
const battle = () => {
  const s = newGuidedRun();
  startGuidedBattle(s, rng);
  return s;
};
const finish = (s) => {
  for (let n = 0; n < 20 && s.forge; n++) tickGuidedForge(s, 0.1);
};
function cast(s, key) {
  const id = s.inventoryCopyIds.find((id) => s.copyKeys[id] === key);
  prepareCopy(s, id);
  return guidedCast(s, s.hand.indexOf(key), 0, rng);
}
test("the apprentice is the only character, combat uses spells, and thinking never advances it", () => {
  const s = battle();
  assert.equal(newGuidedRun("warden").maxHp, 32);
  assert.equal(newGuidedRun("runner").maxEnergy, 3);
  assert.equal(guidedStrike(s).ok, false);
  assert.equal(guidedBlock(s).ok, false);
  const before = structuredClone(s);
  for (let n = 0; n < 100; n++) tickGuidedForge(s, 0.1);
  assert.deepEqual(s, before);
  assert.ok(s.hand.includes("ember"));
  assert.ok(s.hand.includes("stone"));
});
test("end turn resolves the announced damage, refills Focus and prepares core attack and defense", () => {
  const s = battle();
  cast(s, "stone");
  const hp = s.hp,
    guard = s.block,
    incoming = s.enemies.reduce((n, e) => n + enemyIntent(s, e).damage, 0);
  const r = resolveEnemyTurn(s, rng);
  assert.equal(hp - s.hp, Math.max(0, incoming - guard));
  assert.equal(r.actions.length, 2);
  assert.equal(s.energy, 3);
  assert.equal(s.hand.length, 5);
  assert.equal(s.block, 0);
  assert.ok(s.hand.includes("ember"));
  assert.ok(s.hand.includes("stone"));
});
test("every successful combination costs exactly two HP in either phase and every legacy mode", () => {
  for (const phase of ["explore", "battle"])
    for (const mode of ["time", "health", "all", "corruption"]) {
      const s = phase === "battle" ? battle() : newGuidedRun();
      s.forgeMode = mode;
      s.energy = 0;
      const hp = s.hp,
        ids = [...s.inventoryCopyIds];
      const p = guidedForgePreview(s, 0, 1);
      assert.equal(p.ok, true);
      assert.equal(p.healthCost, 2);
      assert.equal(p.inkCost, 0);
      assert.equal(p.enemyAction, null);
      assert.equal(p.corruptionGain, 0);
      assert.equal(p.free, false);
      beginGuidedForge(s, 0, 1);
      assert.equal(resolveEnemyTurn(s).ok, false);
      finish(s);
      assert.equal(s.hp, hp - 2);
      assert.equal(s.energy, 0);
      assert.equal(s.corruption, 0);
      assert.equal(s.enemyActions, 0);
      assert.ok(ids.every((id) => s.inventoryCopyIds.includes(id)));
    }
});
test("a combination cannot kill, duplicate, or charge a failed attempt", () => {
  const s = newGuidedRun();
  s.hp = 2;
  const before = structuredClone(s);
  assert.equal(beginGuidedForge(s, 0, 1).ok, false);
  assert.deepEqual(s, before);
  s.hp = 4;
  beginGuidedForge(s, 0, 1);
  finish(s);
  const after = structuredClone(s);
  assert.equal(beginGuidedForge(s, 0, 1).ok, false);
  assert.deepEqual(s, after);
});
test("archive and sealed-wing routes create distinct seeded risks and unique run relics", () => {
  const a = newGuidedRun(),
    b = newGuidedRun();
  assert.equal(guidedRouteOptions(a).length, 2);
  const choice = guidedChooseRoute(a, "archive", () => 0);
  assert.equal(choice.ok, true);
  assert.equal(choice.relics[0].id, "emberseal");
  assert.equal(guidedRouteOptions(a).length, 0);
  assert.equal(guidedChooseRoute(a, "guardian").ok, false);
  guidedChooseRoute(b, "guardian", rng);
  startGuidedBattle(a, rng);
  startGuidedBattle(b, rng);
  assert.equal(b.enemies[0].hp, Math.ceil(a.enemies[0].hp * 1.2));
  assert.equal(b.enemies[0].damage, a.enemies[0].damage + 1);
  b.enemies.forEach((e) => (e.hp = 0));
  b.phase = "reward";
  assert.equal(takeReward(b, "ember", rng), true);
  assert.equal(b.relics.length, 2);
  assert.equal(new Set(b.relics).size, 2);
  assert.equal(guidedRelics(b).length, 2);
  assert.equal(b.routeChoice, null);
  assert.equal(takeReward(b, "ember", rng), false);
  assert.equal(b.relics.length, 2);
  const variant = newGuidedRun();
  guidedChooseRoute(variant, "archive", () => 0.99);
  startGuidedBattle(variant, () => 0.99);
  assert.notEqual(variant.enemies[0].name, a.enemies[0].name);
});
test("the six relics change spell combat and crafting without refunding its health price", () => {
  const s = battle();
  s.relics = [
    "emberseal",
    "marginward",
    "mirrorthread",
    "dogear",
    "bloodbookmark",
    "quietlamp",
  ];
  const first = s.enemies[0].hp;
  assert.equal(cast(s, "ember").resolvedDamage, 6);
  assert.equal(s.enemies[0].hp, first - 6);
  cast(s, "stone");
  assert.equal(s.block, 6);
  assert.equal(s.reflect, 1);
  const focus = s.energy;
  cast(s, "gust");
  assert.equal(s.energy, focus);
  const hp = s.hp;
  beginGuidedForge(s, 0, 1);
  finish(s);
  assert.equal(s.hp, hp - 2);
  assert.equal(s.block, 9);
  s.phase = "reward";
  const before = s.hp;
  takeReward(s, "ember", rng);
  assert.equal(s.hp, before + 2);
  assert.deepEqual(newGuidedRun().relics, []);
});
test("enemy guard absorbs spell damage even at a lethal edge", () => {
  const s = battle(),
    e = s.enemies[0];
  e.hp = 4;
  e.guard = 3;
  cast(s, "ember");
  assert.equal(e.hp, 3);
  assert.equal(e.guard, 0);
  assert.equal(s.phase, "battle");
});
test("announced attacks can cause permanent death and a fresh life loses relics and route choices", () => {
  const s = battle();
  s.hp = 1;
  resolveEnemyTurn(s, rng);
  assert.equal(s.phase, "dead");
  const fresh = newGuidedRun();
  assert.equal(fresh.floor, 1);
  assert.equal(fresh.merges, 0);
  assert.equal(fresh.inventory.length, 7);
  assert.deepEqual(fresh.relics, []);
  assert.equal(fresh.routeChoice, null);
});

test("the final sealed path grants useful relics before the boss, never twice", () => {
  const s = newGuidedRun();
  s.floor = 3;
  const choice = guidedChooseRoute(s, "guardian", rng);
  assert.equal(choice.relics.length, 2);
  startGuidedBattle(s, rng);
  assert.equal(s.enemies[0].maxHp, 51);
  s.phase = "reward";
  s.enemies.forEach((e) => (e.hp = 0));
  takeReward(s, null, rng);
  assert.equal(s.relics.length, 2);
  assert.equal(s.phase, "won");
});
test("every new turn preserves attack and defense without duplicating owned copies", () => {
  const s = newGuidedRun();
  beginGuidedForge(s, 0, 4);
  finish(s);
  startGuidedBattle(s, rng);
  for (let n = 0; n < 3; n++) {
    for (const key of ["ember", "stone"]) assert.ok(s.hand.includes(key));
    resolveEnemyTurn(s, rng);
  }
  const ids = [...s.handCopyIds, ...s.drawCopyIds, ...s.discardCopyIds];
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.toSorted(), s.inventoryCopyIds.toSorted());
});

test("a newly forged interruption is guaranteed only in the opening hand, not an endless forced lock", () => {
  const s = newGuidedRun();
  s.inventory.push("hushwall", "afterflame", "quietpyre", "mirrorward");
  s.latestForgedKey = "hushwall";
  const seeded = () => 0.01;
  startGuidedBattle(s, seeded);
  assert.ok(s.hand.includes("hushwall"));
  resolveEnemyTurn(s, seeded);
  assert.ok(!s.hand.includes("hushwall"));
  assert.ok(s.hand.includes("ember"));
  assert.ok(s.hand.includes("stone"));
});
