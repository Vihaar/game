import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, RECIPES, CHARACTERS, CARD_LIMITS, FORGE_POLICY, FORGE_MODES, setForgeMode, getForgePreview, corruptionDamageBonus, newRun, getCard, recipeFor, mergeCards, beginForge, craft, tickCombatResources, cancelForge, ensureCardCopies, startBattle, castCard, basicAttack, basicBlock, applyEnemyDamage, endTurn, takeReward, drawCards } from '../src/rules.mjs';
import { createCraftingSystem, canonicalPair, recipeIdentity } from '../src/crafting.mjs';
const rng = () => 0.3;
function tick(state, seconds) { let forged = null; for (let i = 0; i < Math.ceil(seconds * 60); i++) forged = tickCombatResources(state, 1 / 60).forged || forged; return forged; }
function battle(character = 'binder') { const state = newRun(character); startBattle(state, rng, [{ id: 'training', type: 'chaser', name: 'Training warden', hp: 200, maxHp: 200, damage: 3 }]); return state; }
function allInHand(state) { ensureCardCopies(state); state.hand = [...state.inventory]; state.handCopyIds = [...state.inventoryCopyIds]; state.draw = []; state.drawCopyIds = []; state.discard = []; state.discardCopyIds = []; }
function assertOwned(state) { const ids = [...state.handCopyIds, ...state.drawCopyIds, ...state.discardCopyIds]; assert.equal(new Set(ids).size, ids.length, 'no copy exists in two piles'); assert.deepEqual(ids.toSorted(), state.inventoryCopyIds.toSorted(), 'the battle piles equal the owned inventory exactly'); for (const zone of ['hand', 'draw', 'discard']) assert.deepEqual(state[zone], state[`${zone}CopyIds`].map(id => state.copyKeys[id])); }

test('existing named recipes still match both orders and never mutate a merge preview deck', () => {
  for (const { inputs, output } of RECIPES) {
    const original = ['gust', ...inputs, 'dew'], snapshot = [...original];
    assert.equal(recipeFor(...inputs), output); assert.equal(recipeFor(...inputs.toReversed()), output);
    assert.deepEqual(mergeCards(original, 1, 2), { inventory: ['gust', 'dew', output], output }); assert.deepEqual(original, snapshot);
  }
});
test('every pair of known or forged cards combines, with stable unordered identities', () => {
  for (const a of ['ember', 'stone', 'dew', 'gust', 'flare', 'bastion', 'spring', 'mist']) for (const b of ['ember', 'stone', 'dew', 'gust', 'obsidian']) {
    const output = recipeFor(a, b); assert.ok(output); assert.equal(output, recipeFor(b, a)); assert.ok(getCard(output));
  }
  const steam = recipeFor('ember', 'dew'), deeper = recipeFor(steam, 'bastion');
  assert.ok(getCard(deeper).depth > getCard(steam).depth); assert.equal(deeper, recipeFor('bastion', steam));
  assert.deepEqual(canonicalPair('stone', 'ember'), ['ember', 'stone']); assert.equal(recipeIdentity('dew', 'ember'), recipeIdentity('ember', 'dew'));
  assert.equal(recipeFor('__proto__', 'ember'), null); assert.equal(getCard('constructor'), null); assert.equal(recipeFor('missing', 'dew'), null);
});
test('repeated deep forging has no tier limit or exponential combat stats', () => {
  let previous = 'flare';
  for (let depth = 0; depth < 1500; depth++) {
    const output = recipeFor(previous, depth % 4 === 0 ? 'dew' : 'ember'), card = getCard(output);
    assert.notEqual(output, previous); assert.ok(card.depth > getCard(previous).depth);
    assert.ok((card.damage || 0) <= CARD_LIMITS.damage); assert.ok((card.block || 0) <= CARD_LIMITS.block);
    assert.ok((card.heal || 0) <= 2); assert.ok((card.draw || 0) <= 1); assert.ok(card.cost <= 3);
    if (card.all) assert.ok(card.damage <= CARD_LIMITS.areaDamage);
    previous = output;
  }
  assert.ok(getCard(previous).depth > 1500); assert.equal(previous.length, 37);
});
test('same-copy, invalid index and unknown-card merges leave ownership and ink unchanged', () => {
  const state = newRun(), before = structuredClone(state);
  for (const pair of [[0, 0], [-1, 1], [0, 99], [0, 0.5], [NaN, 1]]) assert.equal(beginForge(state, ...pair).ok, false);
  assert.deepEqual(state, before);
  assert.equal(mergeCards(['ember'], 0, 0), null); assert.equal(mergeCards(['ember', 'unknown'], 0, 1), null);
});
test('forge channel has a real duration and consumes exactly two distinct copies and one ink', () => {
  const state = newRun(), inputs = state.inventoryCopyIds.slice(0, 2), originalLength = state.inventory.length;
  const started = beginForge(state, 0, 1); assert.equal(started.duration, FORGE_POLICY.duration); assert.equal(started.output, 'flare');
  assert.equal(state.inventory.length, originalLength); tick(state, 1); assert.ok(state.forge);
  assert.equal(tick(state, 1.1), 'flare'); assert.equal(state.inventory.length, originalLength - 1); assert.equal(state.energy, 2);
  assert.ok(inputs.every(id => !state.inventoryCopyIds.includes(id))); assert.equal(state.inventory.at(-1), 'flare'); assert.equal(state.merges, 1);
});
test('mid-fight forging removes exact selected hand/draw copies and immediately puts the output in hand', () => {
  const state = battle(), chosen = [state.handCopyIds[0], state.drawCopyIds[0]], indices = chosen.map(id => state.inventoryCopyIds.indexOf(id));
  const { output } = beginForge(state, ...indices), oldHp = state.hp;
  assert.equal(basicAttack(state).ok, false); assert.equal(basicBlock(state).ok, false); assert.equal(castCard(state, 0).ok, false);
  assert.equal(applyEnemyDamage(state, 3).damage, 3, 'enemies continue hurting a forging player');
  tick(state, 2.1); assert.equal(state.hp, oldHp - 3); assert.ok(state.hand.includes(output));
  for (const zone of ['inventory', 'hand', 'draw', 'discard']) assert.ok(chosen.every(id => !state[`${zone}CopyIds`].includes(id)));
  assertOwned(state); drawCards(state, 50, rng); assertOwned(state);
});
test('a consumed discard copy can never return through reshuffling', () => {
  const state = battle(); allInHand(state); const castId = state.handCopyIds[0];
  assert.equal(castCard(state, 0, 0, rng).ok, true); assert.ok(state.discardCopyIds.includes(castId));
  const first = state.inventoryCopyIds.indexOf(castId), second = state.inventoryCopyIds.indexOf(state.handCopyIds[0]);
  assert.equal(beginForge(state, first, second).ok, true); tick(state, 2.1); drawCards(state, 50, rng);
  assert.ok(![...state.handCopyIds, ...state.drawCopyIds, ...state.discardCopyIds].includes(castId)); assertOwned(state);
});
test('a pending forge cannot double-spend, produce output after death, or use ownership removed mid-channel', () => {
  const state = battle(); assert.equal(beginForge(state, 0, 1).ok, true); const pending = structuredClone(state.forge);
  assert.equal(beginForge(state, 0, 2).ok, false); assert.deepEqual(state.forge, pending);
  applyEnemyDamage(state, 999); assert.equal(state.phase, 'dead'); assert.equal(state.forge, null); tick(state, 3); assert.equal(state.merges, 0);
  const changed = newRun(); beginForge(changed, 0, 1); changed.inventory.splice(0, 1); changed.inventoryCopyIds.splice(0, 1); tick(changed, 3);
  assert.equal(changed.merges, 0); assert.equal(changed.forge, null);
});
test('cancel is not a free output and insufficient ink does not begin a forge', () => {
  const state = newRun(); state.energy = 0; const length = state.inventory.length;
  assert.equal(beginForge(state, 0, 1).ok, false); assert.equal(state.forge, null); state.energy = 2;
  assert.equal(craft(state, 0, 1), 'flare'); assert.equal(cancelForge(state), true); tick(state, 3); assert.equal(state.inventory.length, length); assert.equal(state.merges, 0);
});
test('default attack and block remain reusable even when crafting leaves only one card', () => {
  const state = battle(); state.inventory = ['ember', 'stone']; state.inventoryCopyIds = []; ensureCardCopies(state);
  beginForge(state, 0, 1); tick(state, 2.1); assert.equal(state.inventory.length, 1);
  const owned = [...state.inventoryCopyIds]; assert.equal(basicAttack(state).ok, true); assert.equal(basicAttack(state).ok, false);
  tick(state, 0.8); assert.equal(basicAttack(state).ok, true); assert.equal(basicBlock(state).ok, true);
  assert.deepEqual(state.inventoryCopyIds, owned); assertOwned(state);
});
test('block absorbs a spatially resolved hit, expires with time, and does not heal', () => {
  const state = battle('warden'), before = state.hp; basicBlock(state);
  assert.deepEqual(applyEnemyDamage(state, 9), { damage: 3, blocked: 6, dead: false }); assert.equal(state.hp, before - 3);
  tick(state, 3); assert.equal(state.block, 0); assert.equal(basicBlock(state).ok, true); tick(state, 1.3); assert.equal(state.block, 0);
  assert.equal(applyEnemyDamage(state, 2).damage, 2);
});
test('healing is one HP at baseline, two at the rare cap, with no automatic large room heal', () => {
  const state = battle(); state.inventory = ['dew', 'spring']; state.inventoryCopyIds = []; ensureCardCopies(state); allInHand(state); state.hp = 10;
  assert.equal(castCard(state, 0).ok, true); assert.equal(state.hp, 11); assert.equal(castCard(state, 0).ok, true); assert.equal(state.hp, 13);
  state.phase = 'reward'; takeReward(state, 'ember'); assert.equal(state.hp, 14);
});
test('ink regenerates over real time; hand cycling does not grant free resources or enemy retaliation', () => {
  const state = battle(); state.energy = 0; tick(state, 1.7); assert.equal(state.energy, 0); tick(state, 0.2); assert.equal(state.energy, 1);
  const hp = state.hp; assert.deepEqual(endTurn(state, rng), { damage: 0, absorbed: 0, cycled: true }); assert.equal(state.energy, 0); assert.equal(state.hp, hp);
  assert.equal(endTurn(state, rng), null); assertOwned(state);
});
test('unknown cards and insufficient ink reject casts without resource changes', () => {
  const state = battle(); allInHand(state); state.energy = 0; const before = structuredClone(state);
  assert.equal(castCard(state, 0).ok, false); assert.deepEqual(state, before);
});
test('character and enemy definitions remain distinct while the pure model preserves runtime IDs/types', () => {
  const runs = Object.keys(CHARACTERS).map(newRun); assert.equal(new Set(runs.map(s => s.hp)).size, 3); assert.equal(new Set(runs.map(s => s.character.moveSpeed)).size, 3);
  const state = newRun('runner'); startBattle(state, rng, [{ id: 'archer-7', type: 'archer', name: 'Archer', hp: 17, maxHp: 25, damage: 6, custom: true }]);
  assert.equal(state.enemies[0].id, 'archer-7'); assert.equal(state.enemies[0].type, 'archer'); assert.equal(state.enemies[0].hp, 17); assert.equal(state.enemies[0].maxHp, 25); assert.equal(state.enemies[0].custom, true);
});
test('reward is single-use, heals only one, and the eighth clear wins', () => {
  const state = newRun(); assert.equal(state.totalFloors, 8); state.hp = 20; state.phase = 'reward';
  assert.equal(takeReward(state, 'missing'), false); assert.equal(takeReward(state, 'ember'), true); assert.equal(state.hp, 21); assert.equal(state.floor, 2);
  assert.equal(takeReward(state, 'ember'), false); state.floor = 8; state.phase = 'reward'; assert.equal(takeReward(state, 'gust'), true); assert.equal(state.phase, 'won');
});
function freshSystem() { const base = Object.fromEntries(Object.entries(CARDS).filter(([, card]) => !card.generated).map(([key, card]) => [key, structuredClone(card)])); return createCraftingSystem(base, RECIPES); }
function memoryStorage() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map }; }
test('AI metadata is bounded plain text and cannot alter stats, identities, ownership or named recipes', () => {
  const system = freshSystem(), key = system.recipeFor('ember', 'dew'), card = system.getCard(key), before = structuredClone(card);
  system.remember(key); const storage = memoryStorage();
  assert.equal(system.applyCardDiscovery(key, { name: 'Steam Dragon', description: 'A small cloud with enormous ambition.', damage: 999, heal: 999, cost: 0, parents: ['x', 'y'] }, storage), true);
  assert.equal(card.name, 'Steam Dragon'); assert.equal(card.damage, before.damage); assert.equal(card.heal, before.heal); assert.equal(card.cost, before.cost); assert.deepEqual(card.parents, before.parents); assert.equal(card.text, before.text);
  assert.equal(system.recipeFor('dew', 'ember'), key); assert.equal(system.applyCardDiscovery('flare', { name: 'Renamed' }, storage), false);
  const now = structuredClone(card); assert.equal(system.applyCardDiscovery(key, { name: '<img src=x>', description: '\u0000' }, storage), false); assert.deepEqual(card, now);
});
test('local discovery lineage restores even in reverse order and stored stats are never trusted', () => {
  const system = freshSystem(), storage = memoryStorage(); let previous = system.recipeFor('ember', 'dew'); system.remember(previous);
  for (let i = 0; i < 40; i++) { previous = system.recipeFor(previous, 'stone'); system.remember(previous); }
  system.applyCardDiscovery(previous, { name: 'Remembered Tower' }, null); system.remember(previous); assert.equal(system.saveDiscoveries(storage), true);
  const payload = JSON.parse(storage.getItem(system.storageKey)); payload.cards.reverse(); payload.cards[0].damage = 9999; payload.cards[0].cost = 0; storage.setItem(system.storageKey, JSON.stringify(payload));
  const restored = freshSystem(); assert.equal(restored.loadDiscoveries(storage), 41); const card = restored.getCard(previous); assert.equal(card.name, 'Remembered Tower'); assert.ok((card.damage || 0) <= 9); assert.ok(card.cost >= 2); assert.equal(restored.getDiscoveryCatalog().length, 41);
});
test('storage failure never blocks local crafting and corrupt/cyclic lineage cannot register arbitrary cards', () => {
  const system = freshSystem(); assert.equal(system.saveDiscoveries({ setItem() { throw new Error('quota'); } }), false);
  const storage = memoryStorage(); storage.setItem(system.storageKey, JSON.stringify({ version: 2, cards: [{ key: 'fold_bad', parents: ['fold_bad', 'ember'], name: 'Corrupt' }, { key: '__proto__', parents: ['ember', 'dew'] }] }));
  assert.equal(system.loadDiscoveries(storage), 0); assert.equal(system.getCard('fold_bad'), null); assert.ok(system.recipeFor('gust', 'stone'));
});

test('all four forge modes preview their exact punishment and only charge on completion', () => {
  assert.deepEqual(Object.keys(FORGE_MODES), ['time', 'corruption', 'health', 'all']);
  for (const mode of Object.keys(FORGE_MODES)) {
    const state = newRun(); assert.equal(setForgeMode(state, mode), true);
    const preview = getForgePreview(state, 0, 1); assert.equal(preview.ok, true); assert.equal(preview.inkCost, 1);
    assert.equal(preview.healthCost, ['health', 'all'].includes(mode) ? 2 : 0);
    assert.equal(preview.corruptionGain, ['corruption', 'all'].includes(mode) ? 1 : 0);
    assert.equal(preview.duration, ['time', 'all'].includes(mode) ? 2 : 0.35);
    const hp = state.hp, length = state.inventory.length; beginForge(state, 0, 1);
    assert.equal(state.hp, hp); assert.equal(state.corruption, 0); assert.equal(state.inventory.length, length);
    assert.equal(setForgeMode(state, 'time'), false, 'mode is locked during a channel');
    tick(state, preview.duration + 0.1);
    assert.equal(state.hp, hp - preview.healthCost); assert.equal(state.corruption, preview.corruptionAfter);
    assert.equal(state.inventory.length, length - 1); assert.equal(state.energy, 2);
  }
});
test('corruption lasts across floors, affects real hits once, and stops at its advertised cap', () => {
  const state = battle(); state.corruption = 8; assert.equal(corruptionDamageBonus(state), 4);
  assert.equal(applyEnemyDamage(state, 3).damage, 7); state.phase = 'reward'; takeReward(state, 'dew');
  assert.equal(state.corruption, 8); setForgeMode(state, 'corruption'); const preview = getForgePreview(state, 0, 1);
  assert.equal(preview.corruptionGain, 0); assert.equal(preview.enemyDamageBonusBefore, 4); assert.equal(preview.enemyDamageBonusAfter, 4);
  beginForge(state, 0, 1); tick(state, 0.5); assert.equal(state.corruption, 8);
  const low = newRun(); setForgeMode(low, 'corruption'); assert.equal(getForgePreview(low, 0, 1).enemyDamageBonusAfter, 1);
});
test('health payment is nonlethal and a wound during the channel cancels every forge charge', () => {
  const state = battle(); state.hp = 2; setForgeMode(state, 'health');
  assert.equal(getForgePreview(state, 0, 1).ok, false); assert.equal(beginForge(state, 0, 1).ok, false);
  state.hp = 3; setForgeMode(state, 'all'); const ids = [...state.inventoryCopyIds], ink = state.energy;
  beginForge(state, 0, 1); applyEnemyDamage(state, 1); tick(state, 2.1);
  assert.equal(state.hp, 2); assert.equal(state.merges, 0); assert.equal(state.corruption, 0); assert.deepEqual(state.inventoryCopyIds, ids); assert.ok(state.energy >= ink);
  setForgeMode(state, 'health'); state.hp = 3; beginForge(state, 0, 1); tick(state, 0.5); assert.equal(state.hp, 1); assert.notEqual(state.phase, 'dead');
});
test('cancel and invalid selection cannot secretly charge health, ink, corruption or copies', () => {
  const state = newRun(); setForgeMode(state, 'all'); const hp = state.hp, energy = state.energy, ids = [...state.inventoryCopyIds];
  assert.equal(beginForge(state, 0, 0).ok, false); beginForge(state, 0, 1); tick(state, 0.5); cancelForge(state); tick(state, 3);
  assert.equal(state.hp, hp); assert.equal(state.energy, energy); assert.equal(state.corruption, 0); assert.deepEqual(state.inventoryCopyIds, ids);
  assert.equal(setForgeMode(state, 'unknown'), false); assert.equal(state.forgeMode, 'all');
});
test('an actually forged output can immediately be forged again using its unique copy', () => {
  const state = battle(); const first = beginForge(state, 0, 5); tick(state, 2.1);
  const fusedIndex = state.inventory.lastIndexOf(first.output), fusedId = state.inventoryCopyIds[fusedIndex];
  const second = beginForge(state, fusedIndex, 0); assert.equal(second.ok, true); tick(state, 2.1);
  assert.ok(getCard(second.output).depth > getCard(first.output).depth); assert.ok(!state.inventoryCopyIds.includes(fusedId)); assertOwned(state);
});
test('metadata accepts ordinary Unicode words, caps display strings and rejects actual controls', () => {
  const system = freshSystem(), key = system.recipeFor('ember', 'dew');
  assert.equal(system.applyCardDiscovery(key, { name: 'Unique Rumor — Δ', description: 'A useful cloud under a curious moon.' }, null), true);
  assert.equal(system.getCard(key).name, 'Unique Rumor — Δ'); assert.equal(system.getCard(key).description, 'A useful cloud under a curious moon.');
  assert.equal(system.applyCardDiscovery(key, { name: 'A'.repeat(100), description: 'B'.repeat(500) }, null), true);
  assert.equal(system.getCard(key).name.length, 48); assert.equal(system.getCard(key).description.length, 180);
  assert.equal(system.applyCardDiscovery(key, { name: String.fromCharCode(0), description: String.fromCharCode(7) }, null), false);
});
