// Guided, explicit-turn adapter. Reuses the original exact-copy/card/crafting model.
import * as base from "./rules.mjs";
export * from "./rules.mjs";
import {
  createLibraryLearning,
  recordSuccessfulCast,
  assignGuardianCopy,
  copiedEnemyIntent,
} from "./library-learning.mjs";
export {
  LIBRARY_LEARNING_POLICY,
  learningSummary,
  drainLibraryEvents,
  forgetLearnedRune,
} from "./library-learning.mjs";
export const GUIDED_FLOOR_COUNT = 3;
export function guidedRewardOptions(state) {
  const novel = base.SYNERGY_RECIPES.map((recipe) => recipe.output).filter(
    (key) => !state.inventory.includes(key),
  );
  return [
    ...novel,
    "memory",
    "silence",
    "mirror",
    "ember",
    "stone",
    "dew",
    "gust",
  ].filter((key) => !state.forgottenRuneKeys?.includes(key));
}
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
  state.libraryLearning = createLibraryLearning();
  state.totalFloors = GUIDED_FLOOR_COUNT;
  state.preparedLimit = 5;
  state.inventory = [
    "ember",
    "stone",
    "dew",
    "gust",
    "memory",
    "silence",
    "mirror",
  ];
  state.inventoryCopyIds = [];
  state.copyKeys = {};
  state.copySerial = 0;
  base.ensureCardCopies(state);
  state.forgePolicy = { ...state.forgePolicy, reusable: true };
  state.reflect = 0;
  state.lastAttack = null;
  state.nextTurnEnergyPenalty = 0;
  state.forgottenRuneKeys = [];
  return state;
}
export function guidedEnemies(areaIndex) {
  const floor = Math.max(0, Math.min(2, Math.floor(areaIndex)));
  return [
    [
      {
        id: "first-question",
        type: "inkling",
        name: "The Unnamed",
        hp: 10,
        damage: 4,
        intentStep: 0,
      },
      {
        id: "first-guard",
        type: "warden",
        name: "The First Question",
        hp: 14,
        damage: 5,
        intentStep: 1,
      },
    ],
    [
      {
        id: "memory-witness",
        type: "scribe",
        name: "The Remembered",
        hp: 17,
        damage: 4,
        intentStep: 0,
      },
      {
        id: "memory-doubt",
        type: "bell",
        name: "The Doubt You Kept",
        hp: 18,
        damage: 5,
        intentStep: 1,
      },
    ],
    [
      {
        id: "mirror-self",
        type: "unbinder",
        name: "Your Unwritten Self",
        hp: 42,
        damage: 9,
        intentStep: 0,
        mirror: true,
      },
    ],
  ][floor].map((enemy) => ({ ...enemy, guard: 0 }));
}
export function enemyIntent(state, enemy) {
  if (enemy.interrupted > 0)
    return {
      type: "interrupted",
      amount: 0,
      damage: 0,
      label: "Interrupted · next move cancelled",
    };
  const copied = copiedEnemyIntent(state, enemy);
  if (copied) return copied;
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
    state.reflect = 0;
    state.lastAttack = null;
    assignGuardianCopy(state);
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
    state.lastAttack = {
      damage: state.character.basicDamage,
      key: null,
      kind: "physical",
    };
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
function applyEnemyGuard(state, before, damage, { pierce = false } = {}) {
  state.enemies.forEach((enemy, i) => {
    if (!damage[i] || before[i] <= 0) return;
    const absorbed = pierce ? 0 : Math.min(enemy.guard || 0, damage[i]);
    enemy.hp = Math.max(0, before[i] - Math.max(0, damage[i] - absorbed));
    enemy.guard = Math.max(0, (enemy.guard || 0) - absorbed);
    const reflected = Math.min(enemy.reflect || 0, absorbed);
    if (reflected) {
      enemy.reflect -= reflected;
      base.applyEnemyDamage(state, reflected, { ignoreCorruption: true });
    }
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
  if (result.ok) {
    applyEnemyGuard(
      state,
      before,
      state.enemies.map((e, i) =>
        result.resolvedDamage && (card.all || i === target)
          ? result.resolvedDamage
          : 0,
      ),
      { pierce: Boolean(card.pierce) },
    );
    if (result.resolvedDamage)
      state.lastAttack = {
        damage: result.resolvedDamage,
        key: result.card,
        kind: card.kind,
      };
    if (card.interrupt && state.enemies[target]?.hp > 0)
      state.enemies[target].interrupted = Math.min(
        1,
        (state.enemies[target].interrupted || 0) + card.interrupt,
      );
    if (card.reflect)
      state.reflect = Math.min(6, (state.reflect || 0) + card.reflect);
    result.extras = {
      effect: card.effect || null,
      replayedDamage: card.replay ? result.resolvedDamage : 0,
      interruptedEnemyId: card.interrupt ? state.enemies[target]?.id : null,
      reflectGranted: card.reflect || 0,
      piercedGuard: Boolean(card.pierce),
    };
    result.libraryEvents = recordSuccessfulCast(state, result);
  }
  return result;
}
function act(state, enemy) {
  const intent = enemyIntent(state, enemy);
  let result = { damage: 0, blocked: 0, dead: false };
  if (intent.amount) {
    result = base.applyEnemyDamage(state, intent.amount, {
      ignoreGuard: Boolean(intent.pierce),
    });
    const reflected = Math.min(state.reflect || 0, result.blocked);
    if (reflected) {
      state.reflect -= reflected;
      const absorbed = Math.min(enemy.guard || 0, reflected);
      enemy.guard = Math.max(0, (enemy.guard || 0) - absorbed);
      enemy.hp = Math.max(0, enemy.hp - (reflected - absorbed));
      result.reflected = reflected;
    }
  }
  if (intent.type === "interrupted")
    enemy.interrupted = Math.max(0, (enemy.interrupted || 0) - 1);
  if (intent.type === "guard") enemy.guard = 3;
  if (intent.type === "copied-spell") {
    if (intent.block)
      enemy.guard = Math.min(12, (enemy.guard || 0) + intent.block);
    if (intent.heal && enemy.hp > 0)
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + intent.heal);
    if (intent.reflect)
      enemy.reflect = Math.min(6, (enemy.reflect || 0) + intent.reflect);
    if (intent.focusDrain)
      state.nextTurnEnergyPenalty = Math.min(
        1,
        (state.nextTurnEnergyPenalty || 0) + intent.focusDrain,
      );
  }
  if (enemy.copiedSpell) enemy.copyStep = ((enemy.copyStep || 0) + 1) % 3;
  enemy.intentStep = (enemy.intentStep || 0) + 1;
  if (state.phase === "battle" && !base.livingEnemies(state).length)
    state.phase = "reward";
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
    state.reflect = 0;
    state.struckThisTurn = false;
    state.guardedThisTurn = false;
    state.basicAttackCooldown = 0;
    state.basicBlockCooldown = 0;
    state.handCycleCooldown = 0;
    state.energy = Math.max(
      0,
      state.maxEnergy - (state.nextTurnEnergyPenalty || 0),
    );
    state.nextTurnEnergyPenalty = 0;
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
  if (!preview.ok)
    return {
      ...preview,
      parents: [state.inventory[a], state.inventory[b]],
      benefit:
        base.getCard(preview.output)?.benefit ||
        base.getCard(preview.output)?.text ||
        "",
      effect: base.getCard(preview.output)?.effect || "power",
    };
  const costsTurn =
    state.phase === "battle" && ["time", "all"].includes(state.forgeMode);
  const enemy = costsTurn ? base.livingEnemies(state)[0] : null;
  return {
    ...preview,
    duration: preview.free ? 0.25 : costsTurn ? 0.7 : 0.35,
    parents: [state.inventory[a], state.inventory[b]],
    effect: base.getCard(preview.output).effect || "power",
    benefit: base.getCard(preview.output).text,
    retainInputs: true,
    replacesPrepared:
      state.phase === "battle" && state.hand.length >= 5
        ? state.hand.at(-1)
        : null,
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
  if (!preview.ok)
    return {
      ...preview,
      parents: [state.inventory[a], state.inventory[b]],
      benefit:
        base.getCard(preview.output)?.benefit ||
        base.getCard(preview.output)?.text ||
        "",
      effect: base.getCard(preview.output)?.effect || "power",
    };
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
