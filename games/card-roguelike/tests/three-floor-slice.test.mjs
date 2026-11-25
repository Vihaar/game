import test from "node:test";
import assert from "node:assert/strict";
import { createCraftingSystem } from "../src/crafting.mjs";
import {
  CARDS,
  RECIPES,
  SYNERGY_RECIPES,
  newRun,
  newGuidedRun,
  GUIDED_FLOOR_COUNT,
  guidedRewardOptions,
  ensureCardCopies,
  prepareCopy,
  startGuidedBattle,
  guidedCast,
  guidedStrike,
  guidedBlock,
  resolveEnemyTurn,
  enemyIntent,
  beginGuidedForge,
  guidedForgePreview,
  tickGuidedForge,
  getCard,
  recipeFor,
  takeReward,
  forgetLearnedRune,
} from "../src/guided-rules.mjs";
const rng = () => 0.4;
function owned(s) {
  const ids = [...s.handCopyIds, ...s.drawCopyIds, ...s.discardCopyIds];
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.toSorted(), s.inventoryCopyIds.toSorted());
  for (const zone of ["hand", "draw", "discard"])
    assert.deepEqual(
      s[zone],
      s[zone + "CopyIds"].map((id) => s.copyKeys[id]),
    );
  assert.ok(s.hand.length <= 5);
}
function finish(s) {
  let result;
  for (let i = 0; i < 100 && s.forge; i++) result = tickGuidedForge(s, 0.1);
  return result;
}
function forge(s, a, b = a) {
  const result = beginGuidedForge(
    s,
    s.inventory.indexOf(a),
    s.inventory.indexOf(b),
  );
  assert.equal(result.ok, true, result.reason);
  assert.ok(finish(s).forged);
  return result.output;
}
function battle(keys) {
  const s = newGuidedRun();
  s.inventory = keys;
  s.inventoryCopyIds = [];
  s.hand = [];
  s.handCopyIds = [];
  s.draw = [];
  s.drawCopyIds = [];
  s.discard = [];
  s.discardCopyIds = [];
  ensureCardCopies(s);
  startGuidedBattle(s, rng, [
    {
      id: "test",
      type: "inkling",
      name: "Test guardian",
      hp: 200,
      damage: 8,
      intentStep: 0,
    },
  ]);
  return s;
}
function cast(s, key) {
  const result = guidedCast(s, s.hand.indexOf(key), 0, rng);
  assert.equal(result.ok, true, result.reason);
  return result;
}
test("six concept recipes are accessible from the starter imprints, commutative, distinct and describe their benefit", () => {
  const s = newGuidedRun();
  assert.equal(s.totalFloors, 3);
  assert.equal(GUIDED_FLOOR_COUNT, 3);
  for (const recipe of SYNERGY_RECIPES) {
    assert.ok(recipe.inputs.every((key) => s.inventory.includes(key)));
    assert.equal(recipeFor(...recipe.inputs.toReversed()), recipe.output);
    assert.ok(getCard(recipe.output).benefit);
    assert.equal(getCard(recipe.output).cost, 1);
  }
  assert.equal(
    new Set(SYNERGY_RECIPES.map((r) => getCard(r.output).effect)).size,
    6,
  );
});
test("free exploration combinations keep every source ID and allow A+A from one imprint", () => {
  const s = newGuidedRun();
  s.energy = 0;
  setMode(s, "all");
  const original = [...s.inventoryCopyIds],
    hp = s.hp;
  const p = guidedForgePreview(s, 0, 0);
  assert.equal(p.free, true);
  assert.equal(p.retainInputs, true);
  assert.equal(p.inkCost, 0);
  assert.equal(p.healthCost, 0);
  assert.equal(p.corruptionGain, 0);
  assert.equal(p.enemyAction, null);
  forge(s, "ember");
  assert.equal(s.energy, 0);
  assert.equal(s.hp, hp);
  assert.equal(s.corruption, 0);
  assert.ok(original.every((id) => s.inventoryCopyIds.includes(id)));
  assert.equal(s.inventory.length, 8);
  const before = structuredClone(s);
  const again = beginGuidedForge(s, 0, 0);
  assert.equal(again.ok, false);
  assert.equal(again.alreadyOwned, true);
  assert.match(again.reason, /ingredient/);
  assert.deepEqual(s, before);
});
function setMode(s, mode) {
  s.forgeMode = mode;
}
test("real repeated fusion can continue indefinitely without shrinking the grimoire, duplicating outputs or losing semantic perks", () => {
  const s = newGuidedRun();
  let key = forge(s, "ember", "memory");
  const baseIds = [...s.inventoryCopyIds];
  for (let i = 0; i < 250; i++) {
    const previous = key;
    key = forge(s, key, i % 2 ? "stone" : "dew");
    assert.notEqual(key, previous);
    assert.equal(getCard(key).replay, true);
    assert.ok(getCard(key).depth > getCard(previous).depth);
    assert.ok(getCard(key).cost <= 2);
    assert.ok((getCard(key).damage || 0) <= 9);
    assert.equal(s.inventory.filter((k) => k === key).length, 1);
  }
  assert.ok(baseIds.every((id) => s.inventoryCopyIds.includes(id)));
  assert.equal(s.inventory.length, 258);
  startGuidedBattle(s, rng);
  assert.ok(s.hand.includes(key));
  owned(s);
});
test("generated perk selection and powers are independent of input order or a fresh recipe cache", () => {
  const bases = () =>
    Object.fromEntries(
      Object.entries(CARDS)
        .filter(([, c]) => !c.generated)
        .map(([k, c]) => [k, structuredClone(c)]),
    );
  const a = createCraftingSystem(bases(), RECIPES),
    b = createCraftingSystem(bases(), RECIPES);
  const x = a.recipeFor("afterflame", "quietpyre"),
    y = b.recipeFor("quietpyre", "afterflame");
  assert.equal(x, y);
  assert.deepEqual(a.getCard(x), b.getCard(y));
});
test("battle forging charges one Focus plus the chosen punishment, keeps sources and prepares output within five slots", () => {
  for (const mode of ["time", "health", "corruption", "all"]) {
    const s = newGuidedRun();
    startGuidedBattle(s, rng);
    s.forgeMode = mode;
    const before = [...s.inventoryCopyIds],
      p = guidedForgePreview(s, 0, 0);
    assert.equal(p.inkCost, 1);
    assert.ok(p.benefit);
    assert.equal(Boolean(p.enemyAction), ["time", "all"].includes(mode));
    forge(s, "ember");
    assert.equal(s.energy, 2);
    assert.ok(before.every((id) => s.inventoryCopyIds.includes(id)));
    assert.ok(s.hand.includes("flare"));
    owned(s);
  }
});
test("Fire + Memory replays the prior attack as bounded flame, not an invented static damage number", () => {
  const s = battle(["afterflame", "flare", "ember"]);
  const first = cast(s, "flare");
  assert.equal(first.resolvedDamage, 8);
  const replay = cast(s, "afterflame");
  assert.equal(replay.resolvedDamage, 6);
  assert.equal(replay.extras.replayedDamage, 6);
  const fallback = battle(["afterflame"]);
  assert.equal(cast(fallback, "afterflame").resolvedDamage, 4);
});
test("Stone + Silence cancels the currently announced move and Water + Mirror returns guarded damage", () => {
  const hush = battle(["hushwall"]);
  assert.equal(enemyIntent(hush, hush.enemies[0]).amount, 8);
  cast(hush, "hushwall");
  assert.equal(enemyIntent(hush, hush.enemies[0]).type, "interrupted");
  const hp = hush.hp;
  resolveEnemyTurn(hush, rng);
  assert.equal(hush.hp, hp);
  assert.equal(hush.enemies[0].interrupted, 0);
  const water = battle(["silvertide", "stone"]);
  cast(water, "silvertide");
  cast(water, "stone");
  const enemyHp = water.enemies[0].hp;
  const turn = resolveEnemyTurn(water, rng);
  assert.equal(turn.actions[0].reflected, 4);
  assert.equal(water.enemies[0].hp, enemyHp - 4);
  assert.equal(water.reflect, 0);
});
test("recall prepares up to two within five slots, quiet fire bypasses guard, and mirror ward favors protection", () => {
  const s = battle([
    "recallwind",
    "ember",
    "stone",
    "dew",
    "memory",
    "silence",
    "mirror",
  ]);
  prepareCopy(s, s.inventoryCopyIds[s.inventory.indexOf("recallwind")]);
  prepareCopy(s, s.inventoryCopyIds[s.inventory.indexOf("ember")]);
  cast(s, "ember");
  assert.equal(s.hand.length, 4);
  cast(s, "recallwind");
  assert.equal(s.hand.length, 5);
  owned(s);
  const q = battle(["quietpyre"]);
  q.enemies[0].guard = 8;
  cast(q, "quietpyre");
  assert.equal(q.enemies[0].hp, 195);
  assert.equal(q.enemies[0].guard, 8);
  const m = battle(["mirrorward"]);
  cast(m, "mirrorward");
  assert.equal(m.block, 6);
  assert.equal(m.reflect, 2);
});
test("learned concept spells are honestly telegraphed and copied with bounded reflection, piercing and Focus interruption", () => {
  for (const key of ["hushwall", "silvertide", "quietpyre", "afterflame"]) {
    const s = battle([key, key, key]);
    for (let i = 0; i < 3; i++) {
      cast(s, key);
      if (i < 2) resolveEnemyTurn(s, rng);
    }
    s.phase = "explore";
    s.floor = 2;
    startGuidedBattle(s, rng, [
      { id: "copy", name: "Copy", type: "inkling", hp: 100, damage: 0 },
    ]);
    const enemy = s.enemies[0],
      prepare = enemyIntent(s, enemy);
    assert.equal(prepare.type, "copy-prepare");
    assert.match(prepare.label, new RegExp(getCard(key).name));
    const beforeCopy = s.hp;
    resolveEnemyTurn(s, rng);
    const intent = enemyIntent(s, enemy);
    guidedBlock(s);
    resolveEnemyTurn(s, rng);
    if (key === "hushwall") assert.equal(s.energy, s.maxEnergy - 1);
    if (key === "silvertide") assert.equal(enemy.reflect, 4);
    if (key === "quietpyre") {
      assert.equal(intent.pierce, true);
      assert.equal(beforeCopy - s.hp, intent.damage);
      assert.equal(s.block, 0);
    }
    if (key === "afterflame") assert.equal(intent.amount, 4);
  }
});
test("forgetting an owned learned output sacrifices it for this life without blocking distinct future combinations", () => {
  const s = newGuidedRun();
  forge(s, "ember", "memory");
  startGuidedBattle(s, rng);
  for (let i = 0; i < 3; i++) {
    const id = s.inventoryCopyIds[s.inventory.indexOf("afterflame")];
    for (const zone of ["draw", "discard"]) {
      const at = s[zone + "CopyIds"].indexOf(id);
      if (at >= 0) {
        s[zone].splice(at, 1);
        s[zone + "CopyIds"].splice(at, 1);
      }
    }
    if (!s.hand.includes("afterflame")) {
      if (s.hand.length >= 5) {
        s.discard.push(s.hand.pop());
        s.discardCopyIds.push(s.handCopyIds.pop());
      }
      s.hand.push("afterflame");
      s.handCopyIds.push(id);
    }
    s.energy = 3;
    cast(s, "afterflame");
  }
  s.phase = "explore";
  assert.equal(forgetLearnedRune(s, "afterflame").ok, true);
  assert.ok(s.forgottenRuneKeys.includes("afterflame"));
  const p = guidedForgePreview(
    s,
    s.inventory.indexOf("ember"),
    s.inventory.indexOf("memory"),
  );
  assert.equal(p.ok, false);
  assert.equal(p.forgotten, true);
  assert.ok(p.benefit);
  assert.ok(!guidedRewardOptions(s).includes("afterflame"));
  assert.ok(forge(s, "memory", "stone"));
  assert.deepEqual(newGuidedRun().forgottenRuneKeys, []);
});
test("the third mirror boss ends the run without an irrelevant final reward, while earlier null rewards reject", () => {
  const s = newGuidedRun();
  s.phase = "reward";
  assert.equal(takeReward(s, null), false);
  s.floor = 3;
  const length = s.inventory.length;
  assert.equal(takeReward(s, null), true);
  assert.equal(s.phase, "won");
  assert.equal(s.inventory.length, length);
  const legacy = newRun();
  legacy.floor = 8;
  legacy.phase = "reward";
  assert.equal(takeReward(legacy, null), false);
});

test("all three classes can complete a legal three-floor fusion run, with a learned spell mirrored by a later guardian", () => {
  for (const character of ["binder", "warden", "runner"]) {
    const s = newGuidedRun(character);
    forge(s, "stone", "mirror");
    forge(s, "ember", "memory");
    forge(s, "ember", "silence");
    let steps = 0,
      copied = false;
    while (!["won", "dead"].includes(s.phase) && steps++ < 100) {
      if (s.phase === "explore") {
        startGuidedBattle(s, rng);
        copied ||= s.enemies.some((enemy) => enemy.copiedSpell);
        assert.ok(s.hand.includes(s.latestForgedKey));
        owned(s);
      }
      if (s.phase === "battle") {
        let target = s.enemies
          .map((e, i) => ({ ...e, i }))
          .filter((e) => e.hp > 0)
          .sort((a, b) => a.hp - b.hp)[0].i;
        guidedStrike(s, target);
        if (s.phase === "battle") guidedBlock(s);
        for (let n = 0; n < 12 && s.phase === "battle"; n++) {
          target = s.enemies
            .map((e, i) => ({ ...e, i }))
            .filter((e) => e.hp > 0)
            .sort((a, b) => a.hp - b.hp)[0].i;
          const incoming = s.enemies
            .filter((e) => e.hp > 0)
            .reduce((sum, e) => sum + enemyIntent(s, e).damage, 0);
          const available = s.hand
            .map((key, i) => ({ ...getCard(key), i }))
            .filter((card) => card.cost <= s.energy);
          const chosen =
            available.find((card) => card.interrupt && incoming > s.block) ||
            available.find((card) => card.block && s.block < incoming) ||
            available
              .filter((card) => card.damage || card.replay)
              .sort(
                (a, b) =>
                  (b.replay
                    ? Math.min(6, s.lastAttack?.damage || 4)
                    : b.damage) /
                    b.cost -
                  (a.replay
                    ? Math.min(6, s.lastAttack?.damage || 4)
                    : a.damage) /
                    a.cost,
              )[0] ||
            available.find((card) => card.heal && s.hp < s.maxHp);
          if (!chosen) break;
          assert.equal(guidedCast(s, chosen.i, target, rng).ok, true);
          owned(s);
        }
        if (s.phase === "battle") resolveEnemyTurn(s, rng);
      }
      if (s.phase === "reward")
        assert.equal(takeReward(s, s.floor === 3 ? null : "ember"), true);
    }
    assert.equal(s.phase, "won", character + " wins with actual spell choices");
    assert.equal(s.floor, 3);
    assert.ok(copied, character + " encounters an echo of learned magic");
    assert.ok(s.hp > 0);
  }
});

test('an interrupt needs a living target and cannot consume Focus or teach on an invalid selection',()=>{const s=battle(['hushwall']);const before=structuredClone(s);assert.equal(guidedCast(s,0,999,rng).ok,false);assert.deepEqual(s,before)});
