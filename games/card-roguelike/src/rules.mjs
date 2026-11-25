// Pure real-time card ownership, combat resources and forging rules.
import { createCraftingSystem, CARD_LIMITS } from "./crafting.mjs";
export { CARD_LIMITS } from "./crafting.mjs";
export const CARDS = {
  ember: {
    name: "Ember",
    glyph: "✦",
    kind: "ember",
    cost: 1,
    damage: 4,
    text: "Deal 4 damage.",
  },
  stone: {
    name: "Stone",
    glyph: "⬡",
    kind: "stone",
    cost: 1,
    block: 4,
    text: "Gain 4 block briefly.",
  },
  dew: {
    name: "Dew",
    glyph: "◒",
    kind: "dew",
    cost: 1,
    heal: 1,
    text: "Restore 1 health.",
  },
  gust: {
    name: "Gust",
    glyph: "≋",
    kind: "gust",
    cost: 1,
    damage: 2,
    draw: 1,
    text: "Deal 2 damage. Draw a card.",
  },
  flare: {
    name: "Flare",
    glyph: "☀",
    kind: "ember",
    cost: 2,
    damage: 8,
    text: "Deal 8 damage.",
    fused: true,
  },
  bastion: {
    name: "Bastion",
    glyph: "▣",
    kind: "stone",
    cost: 2,
    block: 8,
    text: "Gain 8 block briefly.",
    fused: true,
  },
  spring: {
    name: "Spring",
    glyph: "❋",
    kind: "dew",
    cost: 2,
    heal: 2,
    text: "Restore 2 health.",
    fused: true,
  },
  firestorm: {
    name: "Firestorm",
    glyph: "✺",
    kind: "ember",
    cost: 2,
    damage: 5,
    all: true,
    text: "Deal 5 damage to nearby enemies.",
    fused: true,
  },
  obsidian: {
    name: "Obsidian",
    glyph: "◈",
    kind: "stone",
    cost: 2,
    damage: 5,
    block: 3,
    text: "Deal 5 damage. Gain 3 block briefly.",
    fused: true,
  },
  mist: {
    name: "Mist",
    glyph: "❈",
    kind: "gust",
    cost: 1,
    heal: 1,
    block: 3,
    text: "Restore 1 health. Gain 3 block briefly.",
    fused: true,
  },
};
Object.assign(CARDS, {
  memory: {
    name: "Memory",
    glyph: "↶",
    kind: "gust",
    concept: "memory",
    cost: 1,
    damage: 3,
    draw: 1,
    text: "Deal 3 damage. Prepare one inscription.",
  },
  silence: {
    name: "Silence",
    glyph: "◌",
    kind: "stone",
    concept: "silence",
    cost: 1,
    block: 4,
    text: "Gain 4 guard.",
  },
  mirror: {
    name: "Mirror",
    glyph: "◇",
    kind: "dew",
    concept: "mirror",
    cost: 1,
    block: 3,
    reflect: 2,
    text: "Gain 3 guard. Reflect up to 2 guarded damage.",
  },
  afterflame: {
    name: "Afterflame",
    glyph: "↶",
    kind: "ember",
    cost: 1,
    replay: true,
    effect: "replay",
    fused: true,
    text: "Replay your previous attack as flame (up to 6 damage; 4 if none).",
  },
  hushwall: {
    name: "Hushwall",
    glyph: "◌",
    kind: "stone",
    cost: 1,
    block: 4,
    interrupt: 1,
    effect: "interrupt",
    fused: true,
    text: "Gain 4 guard. Interrupt the target’s next announced move.",
  },
  silvertide: {
    name: "Silver Tide",
    glyph: "◇",
    kind: "dew",
    cost: 1,
    block: 3,
    reflect: 4,
    effect: "reflect",
    fused: true,
    text: "Gain 3 guard. Reflect up to 4 guarded damage this turn.",
  },
  recallwind: {
    name: "Recall Wind",
    glyph: "↶",
    kind: "gust",
    cost: 1,
    damage: 2,
    draw: 2,
    effect: "recall",
    fused: true,
    text: "Deal 2 damage. Prepare up to 2 inscriptions (5-slot limit).",
  },
  quietpyre: {
    name: "Quiet Pyre",
    glyph: "✦",
    kind: "ember",
    cost: 1,
    damage: 5,
    pierce: true,
    effect: "pierce",
    fused: true,
    text: "Deal 5 damage, ignoring enemy guard.",
  },
  mirrorward: {
    name: "Mirror Ward",
    glyph: "⬡",
    kind: "stone",
    cost: 1,
    block: 6,
    reflect: 2,
    effect: "mirrorward",
    fused: true,
    text: "Gain 6 guard. Reflect up to 2 guarded damage this turn.",
  },
});
export const SYNERGY_RECIPES = [
  { inputs: ["ember", "memory"], output: "afterflame" },
  { inputs: ["stone", "silence"], output: "hushwall" },
  { inputs: ["dew", "mirror"], output: "silvertide" },
  { inputs: ["gust", "memory"], output: "recallwind" },
  { inputs: ["ember", "silence"], output: "quietpyre" },
  { inputs: ["stone", "mirror"], output: "mirrorward" },
];
export const RECIPES = [
  ...SYNERGY_RECIPES,
  { inputs: ["ember", "ember"], output: "flare" },
  { inputs: ["stone", "stone"], output: "bastion" },
  { inputs: ["dew", "dew"], output: "spring" },
  { inputs: ["ember", "gust"], output: "firestorm" },
  { inputs: ["ember", "stone"], output: "obsidian" },
  { inputs: ["dew", "gust"], output: "mist" },
];
const crafting = createCraftingSystem(CARDS, RECIPES);
export const {
  getCard,
  recipeFor,
  getDiscoveryCatalog,
  saveDiscoveries,
  loadDiscoveries,
  applyCardDiscovery,
} = crafting;
export const FORGE_POLICY = Object.freeze({ duration: 2, inkCost: 1 });
export const FORGE_MODES = Object.freeze({
  time: Object.freeze({
    id: "time",
    label: "Time",
    duration: 2,
    healthCost: 0,
    corruptionGain: 0,
    description: "Channel for 2 seconds while enemies keep moving.",
  }),
  corruption: Object.freeze({
    id: "corruption",
    label: "Corruption",
    duration: 0.35,
    healthCost: 0,
    corruptionGain: 1,
    description:
      "A fast forge makes enemy hits stronger for the rest of this run.",
  }),
  health: Object.freeze({
    id: "health",
    label: "Health",
    duration: 0.35,
    healthCost: 2,
    corruptionGain: 0,
    description: "A fast forge costs 2 health and cannot kill you.",
  }),
  all: Object.freeze({
    id: "all",
    label: "All three",
    duration: 2,
    healthCost: 2,
    corruptionGain: 1,
    description:
      "Channel, sacrifice health, and strengthen the curse together.",
  }),
});
export function corruptionDamageBonus(stateOrLevel) {
  const level =
    typeof stateOrLevel === "number"
      ? stateOrLevel
      : stateOrLevel.corruption || 0;
  return Math.min(4, Math.ceil(Math.max(0, Math.min(8, level)) / 2));
}
export function setForgeMode(state, mode) {
  if (state.forge || !Object.hasOwn(FORGE_MODES, mode)) return false;
  state.forgeMode = mode;
  return true;
}
export const COMBAT_POLICY = Object.freeze({
  inkInterval: 1.8,
  blockDuration: 1.25,
  cardBlockDuration: 1.8,
  blockCap: 12,
  attackCooldown: 0.75,
  blockCooldown: 2.6,
});
export const CHARACTERS = Object.freeze({
  binder: Object.freeze({
    id: "binder",
    name: "The Binder",
    glyph: "✦",
    hp: 32,
    maxHp: 32,
    moveSpeed: 1,
    basicDamage: 3,
    blockAmount: 4,
    description: "Balanced movement, health and repeatable attacks.",
  }),
  warden: Object.freeze({
    id: "warden",
    name: "The Warden",
    glyph: "⬡",
    hp: 40,
    maxHp: 40,
    moveSpeed: 0.82,
    basicDamage: 2,
    blockAmount: 6,
    description: "More health and stronger blocking; slower on your feet.",
  }),
  runner: Object.freeze({
    id: "runner",
    name: "The Runner",
    glyph: "≋",
    hp: 26,
    maxHp: 26,
    moveSpeed: 1.25,
    basicDamage: 3,
    blockAmount: 3,
    description: "Fast movement with less health and lighter blocking.",
  }),
});
let runSerial = 0;
const ZONES = ["hand", "draw", "discard"];
const validIndex = (array, index) =>
  Number.isInteger(index) && index >= 0 && index < array.length;
function nextCopy(state, key) {
  const id = `${state.runId || "run"}:card:${++state.copySerial}`;
  state.copyKeys[id] = key;
  return id;
}
/** Reconcile older saves without ever making two active copies of one owned ID. */
export function ensureCardCopies(state) {
  state.inventory ||= [];
  state.inventoryCopyIds ||= [];
  state.copyKeys ||= {};
  state.copySerial ||= 0;
  const seen = new Set(),
    keys = {};
  state.inventoryCopyIds = state.inventory.map((key, i) => {
    let id = state.inventoryCopyIds[i];
    if (typeof id !== "string" || seen.has(id) || state.copyKeys[id] !== key)
      id = nextCopy(state, key);
    seen.add(id);
    keys[id] = key;
    return id;
  });
  state.copyKeys = keys;
  const placed = new Set();
  for (const zone of ZONES) {
    const values = state[zone] || [],
      ids = state[`${zone}CopyIds`] || [],
      nextKeys = [],
      nextIds = [];
    for (let i = 0; i < values.length; i++) {
      const key = values[i];
      let id = ids[i];
      if (!seen.has(id) || placed.has(id) || keys[id] !== key)
        id = state.inventoryCopyIds.find(
          (candidate) => keys[candidate] === key && !placed.has(candidate),
        );
      if (!id) continue;
      placed.add(id);
      nextKeys.push(key);
      nextIds.push(id);
    }
    state[zone] = nextKeys;
    state[`${zone}CopyIds`] = nextIds;
  }
  if (state.phase === "battle")
    for (const id of state.inventoryCopyIds)
      if (!placed.has(id)) {
        state.draw.push(keys[id]);
        state.drawCopyIds.push(id);
      }
  return state.inventoryCopyIds;
}
export function inventoryCopies(state) {
  ensureCardCopies(state);
  return state.inventoryCopyIds.map((id, index) => ({
    id,
    key: state.inventory[index],
    index,
  }));
}
export function mergeCards(inventory, firstIndex, secondIndex) {
  if (
    !Array.isArray(inventory) ||
    firstIndex === secondIndex ||
    !validIndex(inventory, firstIndex) ||
    !validIndex(inventory, secondIndex)
  )
    return null;
  const output = recipeFor(inventory[firstIndex], inventory[secondIndex]);
  return output
    ? {
        inventory: inventory
          .filter((_, index) => index !== firstIndex && index !== secondIndex)
          .concat(output),
        output,
      }
    : null;
}
export function shuffle(cards, rng = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const random = Number(rng());
    const j = Math.max(
      0,
      Math.min(i, Math.floor((Number.isFinite(random) ? random : 0) * (i + 1))),
    );
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function newRun(characterId = "binder") {
  loadDiscoveries();
  const character = CHARACTERS[characterId] || CHARACTERS.binder;
  const state = {
    runId: `run-${++runSerial}`,
    characterId: character.id,
    character: { ...character },
    hp: character.hp,
    maxHp: character.hp,
    floor: 1,
    totalFloors: 8,
    phase: "explore",
    inventory: [
      "ember",
      "ember",
      "ember",
      "stone",
      "stone",
      "dew",
      "dew",
      "gust",
    ],
    inventoryCopyIds: [],
    copyKeys: {},
    copySerial: 0,
    hand: [],
    handCopyIds: [],
    draw: [],
    drawCopyIds: [],
    discard: [],
    discardCopyIds: [],
    enemies: [],
    energy: 3,
    maxEnergy: 3,
    energyRecharge: 0,
    block: 0,
    blockRemaining: 0,
    turn: 1,
    merges: 0,
    casts: 0,
    attacks: 0,
    target: 0,
    time: 0,
    basicAttackCooldown: 0,
    basicBlockCooldown: 0,
    handCycleCooldown: 0,
    forge: null,
    forgeMode: "time",
    corruption: 0,
    forgePolicy: { ...FORGE_POLICY },
  };
  ensureCardCopies(state);
  return state;
}
export function prepareCopy(state, id) {
  if (state.handCopyIds.includes(id)) return true;
  const key = state.copyKeys[id];
  if (!key) return false;
  for (const zone of ["draw", "discard"]) {
    const i = state[`${zone}CopyIds`].indexOf(id);
    if (i >= 0) {
      state[zone].splice(i, 1);
      state[`${zone}CopyIds`].splice(i, 1);
    }
  }
  const limit = state.preparedLimit || Infinity;
  if (state.hand.length >= limit) {
    state.discard.push(state.hand.pop());
    state.discardCopyIds.push(state.handCopyIds.pop());
  }
  state.hand.push(key);
  state.handCopyIds.push(id);
  return true;
}
export function drawCards(state, count, rng = Math.random) {
  ensureCardCopies(state);
  for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
    if (state.hand.length >= (state.preparedLimit || Infinity)) break;
    if (!state.draw.length) {
      const recycled = shuffle(
        state.discard.map((key, index) => ({
          key,
          id: state.discardCopyIds[index],
        })),
        rng,
      );
      state.draw = recycled.map((card) => card.key);
      state.drawCopyIds = recycled.map((card) => card.id);
      state.discard = [];
      state.discardCopyIds = [];
    }
    if (!state.draw.length) break;
    state.hand.push(state.draw.pop());
    state.handCopyIds.push(state.drawCopyIds.pop());
  }
}
export function startBattle(state, rng = Math.random, enemyDefinitions = null) {
  if (state.phase !== "explore") return false;
  if (Array.isArray(rng)) {
    enemyDefinitions = rng;
    rng = Math.random;
  }
  ensureCardCopies(state);
  const definitions =
    enemyDefinitions ||
    Array.from({ length: state.floor > 3 ? 3 : 2 }, (_, i) => ({
      id: `enemy-${state.floor}-${i}`,
      type: i ? "ranged" : "chaser",
      name: ["Paper Warden", "Inkling", "Margin Eater"][i],
      hp: 9 + state.floor * 2 + i * 2,
      damage: 2 + Math.floor(state.floor / 2),
    }));
  if (!Array.isArray(definitions) || !definitions.length) return false;
  state.enemies = definitions.map((enemy, index) => {
    const maxHp = Math.max(
      1,
      Math.min(999, Number(enemy.maxHp || enemy.hp) || 12),
    );
    return {
      ...enemy,
      id: enemy.id ?? `enemy-${index}`,
      type: enemy.type || "chaser",
      name: enemy.name || "Paper Warden",
      maxHp,
      hp: Math.max(
        0,
        Math.min(
          maxHp,
          Number.isFinite(Number(enemy.hp ?? maxHp))
            ? Number(enemy.hp ?? maxHp)
            : maxHp,
        ),
      ),
      damage: Math.max(0, Math.min(50, Number(enemy.damage) || 0)),
    };
  });
  const deck = shuffle(
    state.inventory.map((key, index) => ({
      key,
      id: state.inventoryCopyIds[index],
    })),
    rng,
  );
  state.phase = "battle";
  state.draw = deck.map((card) => card.key);
  state.drawCopyIds = deck.map((card) => card.id);
  state.hand = [];
  state.handCopyIds = [];
  state.discard = [];
  state.discardCopyIds = [];
  state.energy = state.maxEnergy || 3;
  state.energyRecharge = 0;
  state.block = 0;
  state.blockRemaining = 0;
  state.turn = 1;
  state.target = 0;
  drawCards(state, 5, rng);
  if (state.latestForgedKey) {
    const id = state.inventoryCopyIds.find(
      (id) => state.copyKeys[id] === state.latestForgedKey,
    );
    if (id) prepareCopy(state, id);
  }
  return true;
}
export function livingEnemies(state) {
  return state.enemies.filter((enemy) => enemy.hp > 0);
}
function battleEnd(state) {
  if (!livingEnemies(state).length) state.phase = "reward";
  if (!state.enemies[state.target] || state.enemies[state.target].hp <= 0)
    state.target = Math.max(
      0,
      state.enemies.findIndex((enemy) => enemy.hp > 0),
    );
}
function actionReady(state) {
  return state.phase === "battle" && !state.forge && state.hp > 0;
}
function actionFailure(state) {
  return {
    ok: false,
    reason: state.forge
      ? "Forging takes both hands. Keep moving until it finishes."
      : "No live encounter.",
  };
}
export function castCard(
  state,
  handIndex,
  targetIndex = state.target,
  rng = Math.random,
) {
  if (!actionReady(state)) return actionFailure(state);
  ensureCardCopies(state);
  if (!validIndex(state.hand, handIndex))
    return { ok: false, reason: "Choose a card in your hand." };
  const key = state.hand[handIndex],
    card = getCard(key);
  if (!card)
    return { ok: false, reason: "This card is not in the discovered catalog." };
  if (state.energy < card.cost)
    return {
      ok: false,
      reason: "Not enough ink. Keep moving while it refills.",
    };
  const target = state.enemies[targetIndex];
  const resolvedDamage = card.replay
    ? Math.min(6, Math.max(0, state.lastAttack?.damage || 4))
    : Math.min(
        card.all ? CARD_LIMITS.areaDamage : CARD_LIMITS.damage,
        Math.max(0, card.damage || 0),
      );
  if ((resolvedDamage || card.interrupt) && !card.all && (!target || target.hp <= 0))
    return { ok: false, reason: "Choose a living enemy first." };
  state.energy -= card.cost;
  const copyId = state.handCopyIds.splice(handIndex, 1)[0];
  state.hand.splice(handIndex, 1);
  state.discard.push(key);
  state.discardCopyIds.push(copyId);
  if (resolvedDamage) {
    const damage = resolvedDamage;
    for (const enemy of card.all ? livingEnemies(state) : [target])
      enemy.hp = Math.max(0, enemy.hp - damage);
  }
  if (card.block) {
    state.block = Math.min(
      COMBAT_POLICY.blockCap,
      state.block + Math.min(CARD_LIMITS.block, card.block),
    );
    state.blockRemaining = COMBAT_POLICY.cardBlockDuration;
  }
  state.hp = Math.min(
    state.maxHp,
    state.hp + Math.min(CARD_LIMITS.healing, Math.max(0, card.heal || 0)),
  );
  if (card.draw) drawCards(state, Math.min(CARD_LIMITS.draw, card.draw), rng);
  state.casts++;
  battleEnd(state);
  return { ok: true, card: key, copyId, resolvedDamage };
}
export function basicAttack(state, targetIndex = state.target) {
  if (!actionReady(state)) return actionFailure(state);
  if (state.basicAttackCooldown > 0)
    return { ok: false, reason: "Your attack is recovering." };
  const target = state.enemies[targetIndex];
  if (!target || target.hp <= 0)
    return { ok: false, reason: "Choose a living enemy first." };
  const damage = Math.min(target.hp, state.character?.basicDamage || 3);
  target.hp = Math.max(0, target.hp - damage);
  state.basicAttackCooldown = COMBAT_POLICY.attackCooldown;
  state.attacks++;
  battleEnd(state);
  return { ok: true, damage };
}
export function basicBlock(state) {
  if (!actionReady(state)) return actionFailure(state);
  if (state.basicBlockCooldown > 0)
    return { ok: false, reason: "Your guard is recovering." };
  state.block = Math.min(
    COMBAT_POLICY.blockCap,
    Math.max(state.block, state.character?.blockAmount || 4),
  );
  state.blockRemaining = COMBAT_POLICY.blockDuration;
  state.basicBlockCooldown = COMBAT_POLICY.blockCooldown;
  return { ok: true, block: state.block, duration: state.blockRemaining };
}
export function applyEnemyDamage(
  state,
  amount,
  { ignoreCorruption = false, ignoreGuard = false } = {},
) {
  if (
    state.phase !== "battle" ||
    state.hp <= 0 ||
    !Number.isFinite(amount) ||
    amount <= 0
  )
    return { damage: 0, blocked: 0, dead: state.hp <= 0 };
  const incoming = Math.min(
      999,
      Math.max(0, amount) +
        (ignoreCorruption ? 0 : corruptionDamageBonus(state)),
    ),
    blocked = ignoreGuard ? 0 : Math.min(incoming, state.block || 0),
    damage = Math.min(state.hp, incoming - blocked);
  state.block = Math.max(0, (state.block || 0) - blocked);
  state.hp = Math.max(0, state.hp - damage);
  if (state.hp === 0) {
    state.phase = "dead";
    state.forge = null;
  }
  return { damage, blocked, dead: state.hp === 0 };
}
function forgeSelection(state, firstIndex, secondIndex) {
  if (!["explore", "battle"].includes(state.phase) || state.hp <= 0)
    return { ok: false, reason: "Forge while exploring or fighting." };
  if (state.forge)
    return { ok: false, reason: "A forge is already in progress." };
  const retainInputs = Boolean(state.forgePolicy?.reusable);
  if (
    (!retainInputs && firstIndex === secondIndex) ||
    !validIndex(state.inventory, firstIndex) ||
    !validIndex(state.inventory, secondIndex)
  )
    return { ok: false, reason: "Choose two different owned copies." };
  const output = recipeFor(
    state.inventory[firstIndex],
    state.inventory[secondIndex],
  );
  if (!output) return { ok: false, reason: "Choose two discovered cards." };
  if (retainInputs && state.forgottenRuneKeys?.includes(output))
    return {
      ok: false,
      output,
      retainInputs: true,
      forgotten: true,
      reason: "You forgot this inscription. It cannot return in this life.",
    };
  if (retainInputs && state.inventory.includes(output))
    return {
      ok: false,
      output,
      alreadyOwned: true,
      retainInputs: true,
      reason: "Already inscribed; use it as an ingredient. Nothing spent.",
    };
  const fixedHealthCost = state.forgePolicy?.fixedHealthCost;
  const mode = fixedHealthCost ? "health" : Object.hasOwn(FORGE_MODES, state.forgeMode)
      ? state.forgeMode
      : "time",
    policy = FORGE_MODES[mode];
  const free = retainInputs && state.phase === "explore" && !fixedHealthCost;
  const inkCost = free
    ? 0
    : Math.max(
        0,
        Math.min(3, Number(state.forgePolicy?.inkCost ?? FORGE_POLICY.inkCost)),
      );
  const duration =
    mode === "time" || mode === "all"
      ? Math.max(
          0.5,
          Math.min(
            8,
            Number(state.forgePolicy?.duration ?? FORGE_POLICY.duration),
          ),
        )
      : policy.duration;
  const healthCost = fixedHealthCost || (free ? 0 : policy.healthCost),
    corruptionBefore = Math.max(0, Math.min(8, state.corruption || 0)),
    corruptionAfter = Math.min(
      8,
      corruptionBefore + (free ? 0 : policy.corruptionGain),
    );
  if (state.hp <= healthCost)
    return {
      ok: false,
      reason: `Forging needs more than ${healthCost} health so the sacrifice cannot kill you.`,
      mode,
      healthCost,
    };
  if (!Number.isFinite(inkCost) || !Number.isFinite(duration))
    return { ok: false, reason: "Invalid forge policy." };
  if (state.energy < inkCost)
    return {
      ok: false,
      reason: `Forging needs ${inkCost} ink. Keep moving while it refills.`,
    };
  return {
    ok: true,
    output,
    duration: free ? 0.25 : duration,
    inkCost,
    mode,
    free,
    retainInputs,
    healthCost,
    corruptionGain: corruptionAfter - corruptionBefore,
    corruptionBefore,
    corruptionAfter,
    enemyDamageBonusBefore: corruptionDamageBonus(corruptionBefore),
    enemyDamageBonusAfter: corruptionDamageBonus(corruptionAfter),
    inputIds: [
      state.inventoryCopyIds[firstIndex],
      state.inventoryCopyIds[secondIndex],
    ],
  };
}
export function getForgePreview(state, firstIndex, secondIndex) {
  ensureCardCopies(state);
  return forgeSelection(state, firstIndex, secondIndex);
}
export function beginForge(state, firstIndex, secondIndex) {
  const selection = getForgePreview(state, firstIndex, secondIndex);
  if (!selection.ok) return selection;
  state.forge = {
    ...selection,
    remaining: selection.duration,
    inputIds: [...selection.inputIds],
  };
  return { ...selection, inputIds: [...selection.inputIds] };
}
function completeForge(state) {
  const forge = state.forge;
  if (!forge) return null;
  const inputs = new Set(forge.inputIds);
  if (
    !["explore", "battle"].includes(state.phase) ||
    (!forge.retainInputs && inputs.size !== 2) ||
    !forge.inputIds.every((id) => state.inventoryCopyIds.includes(id)) ||
    state.energy < forge.inkCost ||
    state.hp <= forge.healthCost
  ) {
    state.forge = null;
    return null;
  }
  if (forge.retainInputs && state.inventory.includes(forge.output)) {
    state.forge = null;
    return null;
  }
  if (!forge.retainInputs) {
    // Remove exact IDs from every active pile, so neither casting nor shuffling can resurrect them.
    const keepInventory = state.inventoryCopyIds
      .map((id, index) => ({ id, key: state.inventory[index] }))
      .filter((copy) => !inputs.has(copy.id));
    state.inventory = keepInventory.map((copy) => copy.key);
    state.inventoryCopyIds = keepInventory.map((copy) => copy.id);
    for (const zone of ZONES) {
      const keep = state[`${zone}CopyIds`]
        .map((id, index) => ({ id, key: state[zone][index] }))
        .filter((copy) => !inputs.has(copy.id));
      state[zone] = keep.map((copy) => copy.key);
      state[`${zone}CopyIds`] = keep.map((copy) => copy.id);
    }
    for (const id of inputs) delete state.copyKeys[id];
  }
  const copyId = nextCopy(state, forge.output);
  state.inventory.push(forge.output);
  state.inventoryCopyIds.push(copyId);
  if (state.phase === "battle") {
    if (forge.retainInputs) prepareCopy(state, copyId);
    else {
      state.hand.push(forge.output);
      state.handCopyIds.push(copyId);
    }
  }
  if (forge.retainInputs) state.latestForgedKey = forge.output;
  state.energy -= forge.inkCost;
  state.hp -= forge.healthCost;
  state.corruption = Math.min(
    8,
    (state.corruption || 0) + forge.corruptionGain,
  );
  state.merges++;
  state.forge = null;
  crafting.remember(forge.output);
  saveDiscoveries();
  return forge.output;
}
export function advanceForge(state, dt) {
  if (!state.forge) return null;
  if (!["explore", "battle"].includes(state.phase) || state.hp <= 0) {
    state.forge = null;
    return null;
  }
  if (!Number.isFinite(dt) || dt <= 0) return null;
  state.forge.remaining = Math.max(
    0,
    state.forge.remaining - Math.min(dt, 0.25),
  );
  return state.forge.remaining <= 1e-8 ? completeForge(state) : null;
}
/** Compatibility entry point: starts a channel and returns its preview key, not an instant item. */
export function craft(state, firstIndex, secondIndex) {
  const result = beginForge(state, firstIndex, secondIndex);
  return result.ok ? result.output : null;
}
export function cancelForge(state) {
  const active = Boolean(state.forge);
  state.forge = null;
  return active;
}
export function tickCombatResources(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || ["dead", "won"].includes(state.phase))
    return { forged: null };
  const elapsed = Math.min(dt, 0.25);
  state.time = (state.time || 0) + elapsed;
  for (const key of [
    "basicAttackCooldown",
    "basicBlockCooldown",
    "handCycleCooldown",
  ])
    state[key] = Math.max(0, (state[key] || 0) - elapsed);
  state.blockRemaining = Math.max(0, (state.blockRemaining || 0) - elapsed);
  if (state.blockRemaining === 0) state.block = 0;
  if (state.energy < state.maxEnergy) {
    state.energyRecharge = (state.energyRecharge || 0) + elapsed;
    while (
      state.energyRecharge >= COMBAT_POLICY.inkInterval &&
      state.energy < state.maxEnergy
    ) {
      state.energy++;
      state.energyRecharge -= COMBAT_POLICY.inkInterval;
    }
  } else state.energyRecharge = 0;
  return { forged: advanceForge(state, elapsed) };
}
/** Legacy control is now a paid hand cycle: it never causes enemy retaliation or grants free ink. */
export function endTurn(state, rng = Math.random) {
  if (!actionReady(state) || state.handCycleCooldown > 0 || state.energy < 1)
    return null;
  state.energy--;
  state.discard.push(...state.hand);
  state.discardCopyIds.push(...state.handCopyIds);
  state.hand = [];
  state.handCopyIds = [];
  state.turn++;
  state.handCycleCooldown = 1;
  drawCards(state, 5, rng);
  return { damage: 0, absorbed: 0, cycled: true };
}
export function takeReward(state, reward) {
  const finishOnly =
    reward === null &&
    state.forgePolicy?.reusable &&
    state.floor >= (state.totalFloors || 8);
  if (
    state.phase !== "reward" ||
    (!finishOnly &&
      (!getCard(reward) ||
        (state.forgePolicy?.reusable &&
          state.forgottenRuneKeys?.includes(reward))))
  )
    return false;
  if (!finishOnly) {
    state.inventory.push(reward);
    state.hp = Math.min(state.maxHp, state.hp + 1);
  }
  for (const zone of ZONES) {
    state[zone] = [];
    state[`${zone}CopyIds`] = [];
  }
  state.block = 0;
  state.blockRemaining = 0;
  state.forge = null;
  state.energy = state.maxEnergy;
  state.phase = state.floor >= (state.totalFloors || 8) ? "won" : "explore";
  if (state.phase !== "won") state.floor++;
  ensureCardCopies(state);
  return true;
}
