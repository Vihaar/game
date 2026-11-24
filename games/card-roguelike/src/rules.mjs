// Original card/turn rules. Rendering and controls are separate from this model.
export const CARDS = {
  ember: { name: 'Ember', glyph: '✦', kind: 'ember', cost: 1, damage: 4, text: 'Deal 4 damage.' },
  stone: { name: 'Stone', glyph: '⬡', kind: 'stone', cost: 1, block: 5, text: 'Gain 5 block this turn.' },
  dew: { name: 'Dew', glyph: '◒', kind: 'dew', cost: 1, heal: 5, text: 'Restore 5 health.' },
  gust: { name: 'Gust', glyph: '≋', kind: 'gust', cost: 1, damage: 2, draw: 1, text: 'Deal 2 damage. Draw a card.' },
  flare: { name: 'Flare', glyph: '☀', kind: 'ember', cost: 1, damage: 10, text: 'Deal 10 damage.', fused: true },
  bastion: { name: 'Bastion', glyph: '▣', kind: 'stone', cost: 1, block: 12, text: 'Gain 12 block this turn.', fused: true },
  spring: { name: 'Spring', glyph: '❋', kind: 'dew', cost: 1, heal: 11, text: 'Restore 11 health.', fused: true },
  firestorm: { name: 'Firestorm', glyph: '✺', kind: 'ember', cost: 2, damage: 8, all: true, text: 'Deal 8 damage to every enemy.', fused: true },
  obsidian: { name: 'Obsidian', glyph: '◈', kind: 'stone', cost: 2, damage: 8, block: 6, text: 'Deal 8 damage. Gain 6 block.', fused: true },
  mist: { name: 'Mist', glyph: '❈', kind: 'gust', cost: 1, heal: 5, block: 5, text: 'Restore 5 health. Gain 5 block.', fused: true },
};

export const RECIPES = [
  { inputs: ['ember', 'ember'], output: 'flare' },
  { inputs: ['stone', 'stone'], output: 'bastion' },
  { inputs: ['dew', 'dew'], output: 'spring' },
  { inputs: ['ember', 'gust'], output: 'firestorm' },
  { inputs: ['ember', 'stone'], output: 'obsidian' },
  { inputs: ['dew', 'gust'], output: 'mist' },
];

export function recipeFor(a, b) {
  return RECIPES.find(({ inputs }) => (inputs[0] === a && inputs[1] === b) || (inputs[0] === b && inputs[1] === a))?.output ?? null;
}

export function mergeCards(inventory, firstIndex, secondIndex) {
  if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex) || firstIndex === secondIndex || firstIndex < 0 || secondIndex < 0 || firstIndex >= inventory.length || secondIndex >= inventory.length) return null;
  const output = recipeFor(inventory[firstIndex], inventory[secondIndex]);
  if (!output) return null;
  return { inventory: inventory.filter((_, index) => index !== firstIndex && index !== secondIndex).concat(output), output };
}

export function shuffle(cards, rng = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newRun() {
  return { hp: 32, maxHp: 32, floor: 1, phase: 'explore', inventory: ['ember', 'ember', 'ember', 'stone', 'stone', 'dew', 'dew', 'gust'], hand: [], draw: [], discard: [], enemies: [], energy: 3, block: 0, turn: 1, merges: 0, casts: 0, target: 0 };
}

export function drawCards(state, count, rng = Math.random) {
  for (let i = 0; i < count; i++) {
    if (!state.draw.length) {
      state.draw = shuffle(state.discard, rng);
      state.discard = [];
    }
    if (!state.draw.length) break;
    state.hand.push(state.draw.pop());
  }
}

export function startBattle(state, rng = Math.random) {
  if (state.phase !== 'explore') return false;
  const names = shuffle(['Paper Warden', 'Inkling', 'Margin Eater'], rng);
  state.enemies = state.floor === 3
    ? [{ name: 'The Unbinder', hp: 25, maxHp: 25, damage: 6 }, { name: names[0], hp: 12, maxHp: 12, damage: 3 }]
    : Array.from({ length: 2 }, (_, i) => { const hp = 9 + state.floor * 2 + i * 2; return { name: names[i], hp, maxHp: hp, damage: 2 + state.floor }; });
  state.phase = 'battle';
  state.draw = shuffle(state.inventory, rng);
  state.discard = [];
  state.hand = [];
  state.energy = 3;
  state.block = 0;
  state.turn = 1;
  state.target = 0;
  drawCards(state, 5, rng);
  return true;
}

export function livingEnemies(state) { return state.enemies.filter(enemy => enemy.hp > 0); }

export function castCard(state, handIndex, targetIndex = state.target, rng = Math.random) {
  if (state.phase !== 'battle' || !Number.isInteger(handIndex) || handIndex < 0 || handIndex >= state.hand.length) return { ok: false, reason: 'Choose a card in your hand.' };
  const key = state.hand[handIndex];
  const card = CARDS[key];
  if (state.energy < card.cost) return { ok: false, reason: 'Not enough ink. End your turn to refill.' };
  const target = state.enemies[targetIndex];
  if (card.damage && !card.all && (!target || target.hp <= 0)) return { ok: false, reason: 'Choose a living enemy first.' };
  state.energy -= card.cost;
  state.hand.splice(handIndex, 1);
  state.discard.push(key);
  if (card.damage) {
    const targets = card.all ? livingEnemies(state) : [target];
    targets.forEach(enemy => { enemy.hp = Math.max(0, enemy.hp - card.damage); });
  }
  state.block += card.block || 0;
  state.hp = Math.min(state.maxHp, state.hp + (card.heal || 0));
  if (card.draw) drawCards(state, card.draw, rng);
  state.casts++;
  if (!livingEnemies(state).length) state.phase = 'reward';
  if (!state.enemies[state.target] || state.enemies[state.target].hp <= 0) state.target = Math.max(0, state.enemies.findIndex(enemy => enemy.hp > 0));
  return { ok: true, card: key };
}

export function endTurn(state, rng = Math.random) {
  if (state.phase !== 'battle') return null;
  const incoming = livingEnemies(state).reduce((sum, enemy) => sum + enemy.damage, 0);
  const absorbed = Math.min(incoming, state.block);
  const damage = incoming - absorbed;
  state.hp = Math.max(0, state.hp - damage);
  state.block = 0;
  if (state.hp === 0) { state.phase = 'dead'; return { damage, absorbed }; }
  state.discard.push(...state.hand);
  state.hand = [];
  state.energy = 3;
  state.turn++;
  drawCards(state, 5, rng);
  return { damage, absorbed };
}

export function craft(state, firstIndex, secondIndex) {
  if (state.phase !== 'explore') return null;
  const result = mergeCards(state.inventory, firstIndex, secondIndex);
  if (!result) return null;
  state.inventory = result.inventory;
  state.merges++;
  return result.output;
}

export function takeReward(state, reward) {
  if (state.phase !== 'reward' || !['ember', 'stone', 'dew', 'gust'].includes(reward)) return false;
  state.inventory.push(reward);
  state.hp = Math.min(state.maxHp, state.hp + 4);
  if (state.floor === 3) state.phase = 'won';
  else { state.floor++; state.phase = 'explore'; }
  return true;
}
