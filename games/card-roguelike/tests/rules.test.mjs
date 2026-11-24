import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, RECIPES, newRun, recipeFor, mergeCards, craft, startBattle, castCard, endTurn, takeReward, drawCards } from '../src/rules.mjs';

const deterministic = () => 0.3;

test('every recipe consumes exactly its two selected copies and adds the previewed output', () => {
  for (const { inputs, output } of RECIPES) {
    const original = ['gust', ...inputs, 'dew'];
    const snapshot = [...original];
    assert.equal(recipeFor(inputs[0], inputs[1]), output);
    assert.equal(recipeFor(inputs[1], inputs[0]), output);
    assert.deepEqual(mergeCards(original, 1, 2), { inventory: ['gust', 'dew', output], output });
    assert.deepEqual(original, snapshot, 'merge preview must not mutate the source deck');
    assert.ok(CARDS[output]);
  }
});

test('one copy cannot satisfy both merge inputs; invalid selections leave the deck unchanged', () => {
  const inventory = ['ember', 'dew'];
  for (const pair of [[0, 0], [-1, 0], [0, 2], [0, 0.5], [0, 1], [NaN, 1]]) assert.equal(mergeCards(inventory, ...pair), null);
  assert.deepEqual(inventory, ['ember', 'dew']);
});

test('crafting is permanent between rooms and cannot rewrite a live battle draw pile', () => {
  const run = newRun();
  assert.equal(craft(run, 0, 1), 'flare');
  assert.equal(run.inventory.length, 7);
  assert.equal(run.inventory.filter(key => key === 'ember').length, 1);
  assert.equal(run.inventory.filter(key => key === 'flare').length, 1);
  startBattle(run, deterministic);
  const before = structuredClone(run);
  assert.equal(craft(run, 0, 1), null);
  assert.deepEqual(run, before);
  assert.deepEqual([...run.hand, ...run.draw].sort(), run.inventory.toSorted());
});

test('insufficient ink and dead targets reject a cast without consuming resources', () => {
  const run = newRun();
  startBattle(run, deterministic);
  run.hand = ['firestorm', 'ember'];
  run.energy = 1;
  let snapshot = structuredClone(run);
  assert.equal(castCard(run, 0, 0).ok, false);
  assert.deepEqual(run, snapshot);
  run.enemies[0].hp = 0;
  snapshot = structuredClone(run);
  assert.equal(castCard(run, 1, 0).ok, false);
  assert.deepEqual(run, snapshot);
});

test('an area spell hits each living enemy once and finishes an encounter without retaliation', () => {
  const run = newRun();
  startBattle(run, deterministic);
  run.hand = ['firestorm'];
  run.enemies.forEach(enemy => { enemy.hp = 8; });
  assert.equal(castCard(run, 0).ok, true);
  assert.deepEqual(run.enemies.map(enemy => enemy.hp), [0, 0]);
  assert.equal(run.energy, 1);
  assert.equal(run.phase, 'reward');
  const hp = run.hp;
  assert.equal(endTurn(run), null);
  assert.equal(run.hp, hp);
});

test('block absorbs aggregate enemy attacks then expires; death cannot redraw', () => {
  const run = newRun();
  startBattle(run, deterministic);
  run.enemies = [{ hp: 5, damage: 3 }, { hp: 5, damage: 4 }];
  run.block = 5;
  const result = endTurn(run, deterministic);
  assert.deepEqual(result, { damage: 2, absorbed: 5 });
  assert.equal(run.hp, 30);
  assert.equal(run.block, 0);
  assert.equal(run.energy, 3);
  run.hp = 1;
  const hand = [...run.hand];
  endTurn(run, deterministic);
  assert.equal(run.phase, 'dead');
  assert.equal(run.hp, 0);
  assert.deepEqual(run.hand, hand);
});

test('drawing recycles only discard and never duplicates an owned card', () => {
  const run = newRun();
  run.draw = ['flare'];
  run.discard = ['dew', 'stone'];
  drawCards(run, 6, deterministic);
  assert.deepEqual(run.hand.toSorted(), ['dew', 'flare', 'stone']);
  assert.deepEqual(run.draw, []);
  assert.deepEqual(run.discard, []);
});

test('reward cannot be claimed twice, healing is capped, and the third clear wins', () => {
  const run = newRun();
  assert.equal(takeReward(run, 'ember'), false);
  run.phase = 'reward';
  assert.equal(takeReward(run, 'unknown'), false);
  assert.equal(takeReward(run, 'ember'), true);
  assert.equal(run.floor, 2);
  assert.equal(run.hp, run.maxHp);
  assert.equal(run.inventory.length, 9);
  assert.equal(takeReward(run, 'ember'), false);
  run.phase = 'reward'; run.floor = 3;
  assert.equal(takeReward(run, 'gust'), true);
  assert.equal(run.phase, 'won');
});
