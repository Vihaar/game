// Guided, explicit-turn adapter. Reuses the original exact-copy/card/crafting model.
import * as base from "./rules.mjs";
export * from "./rules.mjs";
export const GUIDED_CHARACTERS = {
  binder: {
    ...base.CHARACTERS.binder,
    description:
      "32 health · 3 ink each turn · 3 strike · 4 guard. A balanced spellbinder.",
  },
  warden: {
    ...base.CHARACTERS.warden,
    description:
      "40 health · 3 ink each turn · 2 strike · 6 guard. A patient defender.",
  },
  runner: {
    ...base.CHARACTERS.runner,
    description:
      "26 health · 4 ink each turn · 3 strike · 3 guard. More spells, less room for mistakes.",
  },
};
export const GUIDED_FORGE_MODES = {
  time: {
    ...base.FORGE_MODES.time,
    description:
      "In battle, one enemy immediately performs its shown move after the fold. Outside battle, a short safe animation.",
  },
  corruption: {
    ...base.FORGE_MODES.corruption,
    description:
      "No extra enemy move. Gain 1 corruption: enemy attacks grow stronger for this run.",
  },
  health: {
    ...base.FORGE_MODES.health,
    description: "No extra enemy move. Pay 2 health, never lethal.",
  },
  all: {
    ...base.FORGE_MODES.all,
    description: "One extra enemy move in battle, 2 health and 1 corruption.",
  },
};
export function newGuidedRun(id = "binder") {
  const state = base.newRun(id);
  state.combatMode = "guided";
  state.character = { ...GUIDED_CHARACTERS[state.characterId] };
  state.maxEnergy = id === "runner" ? 4 : 3;
  state.energy = state.maxEnergy;
  state.struckThisTurn = false;
  state.guardedThisTurn = false;
  state.enemyActions = 0;
  return state;
}
export function guidedEnemies(areaIndex) {
  const types = [
    ["inkling", "warden"],
    ["eater", "scribe"],
    ["scribe", "warden"],
    ["bell", "eater"],
    ["scribe", "bell", "inkling"],
    ["warden", "eater", "scribe"],
    ["bell", "warden", "eater"],
    ["unbinder", "scribe"],
  ][areaIndex];
  const names = {
    inkling: "Inkling",
    warden: "Paper Warden",
    eater: "Margin Eater",
    scribe: "Quill Scribe",
    bell: "Bell Keeper",
    unbinder: "The Unbinder",
  };
  const health = {
    inkling: 10,
    warden: 17,
    eater: 13,
    scribe: 11,
    bell: 16,
    unbinder: 72,
  };
  const questions = [
    ["The Unnamed", "The First Question"],
    ["Doubt in Bloom", "The Unwritten Root"],
    ["The Forgotten", "The Unremembered"],
    ["The Unchanged", "The Impossible Form"],
    ["The Distant Why", "The Unseen Law", "The Missing Star"],
    ["The Contradiction", "The Assumption", "The Unproven"],
    ["The Stranger Within", "The Unasked Self", "The Mirror Question"],
    ["The Final Question", "The Missing Connection"],
  ];
  return types.map((type, i) => ({
    id: `guided-${areaIndex}-${i}`,
    type,
    name: questions[areaIndex][i] || names[type],
    hp: health[type] + (type === "unbinder" ? 0 : Math.floor(areaIndex / 2)),
    damage:
      (type === "unbinder" ? 10 : type === "warden" ? 5 : 4) +
      Math.floor(areaIndex / 4),
    intentStep: i % 2,
    guard: 0,
  }));
}
export function enemyIntent(state, enemy) {
  const step = enemy.intentStep || 0;
  const pattern =
    enemy.type === "unbinder"
      ? ["attack", "charge", "heavy"]
      : enemy.type === "warden"
        ? ["attack", "guard", "heavy"]
        : ["attack", "prepare"];
  const type = pattern[step % pattern.length];
  const amount =
    type === "heavy" ? enemy.damage + 2 : type === "attack" ? enemy.damage : 0;
  return {
    type,
    amount,
    damage: amount ? amount + base.corruptionDamageBonus(state) : 0,
    label:
      type === "guard"
        ? "Brace · 3 guard"
        : type === "prepare"
          ? "Gather ink · no damage"
          : type === "charge"
            ? "Wind up · no damage"
            : `${type === "heavy" ? "Heavy strike" : "Attack"} · ${amount + base.corruptionDamageBonus(state)} damage`,
  };
}
export function startGuidedBattle(
  state,
  rng = Math.random,
  defs = guidedEnemies(state.floor - 1),
) {
  const ok = base.startBattle(state, rng, defs);
  if (ok) {
    state.struckThisTurn = false;
    state.guardedThisTurn = false;
    state.basicAttackCooldown = 0;
    state.basicBlockCooldown = 0;
  }
  return ok;
}
export function guidedStrike(state, target = state.target) {
  if (state.struckThisTurn)
    return {
      ok: false,
      reason: "Your strike is used. End the turn to ready it.",
    };
  state.basicAttackCooldown = 0;
  const before = state.enemies.map((e) => e.hp);
  const result = base.basicAttack(state, target);
  if (result.ok) {
    state.struckThisTurn = true;
    applyEnemyGuard(
      state,
      before,
      state.enemies.map((e, i) =>
        i === target ? state.character.basicDamage || 3 : 0,
      ),
    );
  }
  return result;
}
export function guidedBlock(state) {
  if (state.guardedThisTurn)
    return {
      ok: false,
      reason: "Your guard is used. End the turn to ready it.",
    };
  state.basicBlockCooldown = 0;
  const result = base.basicBlock(state);
  if (result.ok) state.guardedThisTurn = true;
  return result;
}
function applyEnemyGuard(state, before, damage) {
  state.enemies.forEach((enemy, i) => {
    if (!damage[i] || before[i] <= 0) return;
    const absorbed = Math.min(enemy.guard || 0, damage[i]);
    enemy.hp = Math.max(0, before[i] - Math.max(0, damage[i] - absorbed));
    enemy.guard = Math.max(0, (enemy.guard || 0) - absorbed);
  });
  if (state.phase === "reward" && base.livingEnemies(state).length)
    state.phase = "battle";
}
export function guidedCast(
  state,
  index,
  target = state.target,
  rng = Math.random,
) {
  const before = state.enemies.map((e) => e.hp),
    card = base.getCard(state.hand[index]);
  const result = base.castCard(state, index, target, rng);
  if (result.ok)
    applyEnemyGuard(
      state,
      before,
      state.enemies.map((e, i) =>
        card.damage && (card.all || i === target)
          ? Math.min(card.all ? 5 : 9, card.damage)
          : 0,
      ),
    );
  return result;
}
function act(state, enemy) {
  const intent = enemyIntent(state, enemy);
  let result = { damage: 0, blocked: 0, dead: false };
  if (intent.amount) result = base.applyEnemyDamage(state, intent.amount);
  if (intent.type === "guard") enemy.guard = 3;
  enemy.intentStep = (enemy.intentStep || 0) + 1;
  state.enemyActions++;
  return { name: enemy.name, ...intent, ...result };
}
export function resolveEnemyTurn(state, rng = Math.random) {
  if (state.phase !== "battle" || state.forge)
    return { ok: false, reason: "Finish the current fold first." };
  const actions = [];
  for (const enemy of base.livingEnemies(state)) {
    if (state.phase !== "battle") break;
    actions.push(act(state, enemy));
  }
  if (state.phase === "battle") {
    state.block = 0;
    state.blockRemaining = 0;
    state.struckThisTurn = false;
    state.guardedThisTurn = false;
    state.basicAttackCooldown = 0;
    state.basicBlockCooldown = 0;
    state.handCycleCooldown = 0;
    state.energy = state.maxEnergy;
    state.turn++;
    state.discard.push(...state.hand);
    state.discardCopyIds.push(...state.handCopyIds);
    state.hand = [];
    state.handCopyIds = [];
    base.drawCards(state, 5, rng);
  }
  return { ok: true, actions, dead: state.phase === "dead" };
}
export function guidedForgePreview(state, a, b) {
  const preview = base.getForgePreview(state, a, b);
  if (!preview.ok) return preview;
  const costsTurn =
    state.phase === "battle" && ["time", "all"].includes(state.forgeMode);
  const enemy = costsTurn ? base.livingEnemies(state)[0] : null;
  return {
    ...preview,
    duration: costsTurn ? 0.7 : 0.5,
    enemyAction: enemy
      ? {
          id: enemy.id,
          name: enemy.name,
          ...enemyIntent(
            { ...state, corruption: preview.corruptionAfter },
            enemy,
          ),
        }
      : null,
  };
}
export function beginGuidedForge(state, a, b) {
  const preview = guidedForgePreview(state, a, b);
  if (!preview.ok) return preview;
  const result = base.beginForge(state, a, b);
  if (!result.ok) return result;
  Object.assign(state.forge, preview, { remaining: preview.duration });
  return preview;
}
export function tickGuidedForge(state, dt) {
  // Thinking never refills resources, expires guard, or triggers enemy turns.
  if (!state.forge) return { forged: null, action: null };
  const extra = state.forge.enemyAction;
  const forged = base.advanceForge(state, dt);
  let action = null;
  if (forged && extra && state.phase === "battle") {
    const enemy = state.enemies.find((e) => e.id === extra.id && e.hp > 0);
    if (enemy) action = act(state, enemy);
  }
  return { forged, action };
}
