// Guided, explicit-turn adapter. Reuses the original exact-copy/card/crafting model.
import * as base from "./rules.mjs";
export * from "./rules.mjs";
import { grantGuidedRelics } from "./guided-progression.mjs";
export {
  GUIDED_RELICS,
  guidedRelicInfo,
  guidedRelics,
  guidedRouteOptions,
  guidedChooseRoute,
} from "./guided-progression.mjs";
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
    name: "The Nameless Apprentice",
    description:
      "32 HP · 3 Focus each turn. Discover who you were through the spells you learn.",
  },
};
export const GUIDED_FORGE_MODES = {
  health: {
    ...base.FORGE_MODES.health,
    label: "2 HP",
    description:
      "Every combination costs 2 HP. No Focus or extra enemy turn. Never lethal.",
  },
};
export function newGuidedRun(id = "binder") {
  const state = base.newRun("binder");
  state.combatMode = "guided";
  state.character = { ...GUIDED_CHARACTERS[state.characterId] };
  state.maxEnergy = 3;
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
  state.forgePolicy = {
    ...state.forgePolicy,
    reusable: true,
    fixedHealthCost: 2,
    inkCost: 0,
  };
  state.forgeMode = "health";
  state.relics = [];
  state.routeChoice = null;
  state.lastRelics = [];
  state.relicUses = {};
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
export function startGuidedBattle(state, rng = Math.random, defs = null) {
  if (!defs) {
    defs = guidedEnemies(state.floor - 1);
    if (
      state.routeChoice?.floor === state.floor &&
      rng() >= 0.5 &&
      state.floor < 3
    ) {
      defs = defs.map((enemy, i) => ({
        ...enemy,
        name:
          state.floor === 1
            ? ["The Unread", "Keeper of Lost Names"][i]
            : ["The Redacted", "The Unfinished Thought"][i],
        type: i ? "scribe" : "eater",
        hp: enemy.hp + (i ? -1 : 1),
        intentStep: i ? 0 : 1,
      }));
    }
    if (
      state.routeChoice?.floor === state.floor &&
      state.routeChoice.id === "guardian"
    )
      defs = defs.map((enemy) => ({
        ...enemy,
        name: "Sealed " + enemy.name,
        hp: Math.ceil(enemy.hp * 1.2),
        damage: enemy.damage + 1,
        elite: true,
      }));
  }
  const ok = base.startBattle(state, rng, defs);
  if (ok) {
    state.struckThisTurn = false;
    state.guardedThisTurn = false;
    state.basicAttackCooldown = 0;
    state.basicBlockCooldown = 0;
    state.reflect = 0;
    state.lastAttack = null;
    state.relicUses = {};
    prepareEssentials(state, true);
    assignGuardianCopy(state);
  }
  return ok;
}
export function guidedStrike() {
  return { ok: false, reason: "Choose a spell from your grimoire." };
}
export function guidedBlock() {
  return { ok: false, reason: "Cast a guard spell from your grimoire." };
}
function prepareEssentials(state, firstHand = false) {
  // Preserve both core spells and the newest invention within the five-slot hand.
  const desired = [
    ...new Set(
      ["ember", "stone", firstHand ? state.latestForgedKey : null].filter(
        Boolean,
      ),
    ),
  ]
    .map((key) =>
      state.inventoryCopyIds.find((id) => state.copyKeys[id] === key),
    )
    .filter(Boolean);
  for (const id of desired) {
    if (state.handCopyIds.includes(id)) continue;
    if (state.hand.length >= state.preparedLimit) {
      const at = state.handCopyIds.findIndex(
        (candidate) => !desired.includes(candidate),
      );
      if (at >= 0) {
        state.discard.push(state.hand.splice(at, 1)[0]);
        state.discardCopyIds.push(state.handCopyIds.splice(at, 1)[0]);
      }
    }
    base.prepareCopy(state, id);
  }
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
    state.relicUses ||= {};
    const has = (id) => state.relics?.includes(id);
    if (
      result.resolvedDamage &&
      has("emberseal") &&
      !state.relicUses.emberseal
    ) {
      result.resolvedDamage += 2;
      state.relicUses.emberseal = true;
    }
    if (
      card.block &&
      has("marginward") &&
      state.relicUses.marginward !== state.turn
    ) {
      state.block = Math.min(base.COMBAT_POLICY.blockCap, state.block + 2);
      state.relicUses.marginward = state.turn;
    }
    if (card.block && has("mirrorthread"))
      state.reflect = Math.min(6, (state.reflect || 0) + 1);
    if (card.draw && has("dogear") && !state.relicUses.dogear) {
      state.energy = Math.min(state.maxEnergy, state.energy + 1);
      state.relicUses.dogear = true;
    }
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
    prepareEssentials(state);
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
  return {
    ...preview,
    duration: 0.35,
    parents: [state.inventory[a], state.inventory[b]],
    effect: base.getCard(preview.output).effect || "power",
    benefit: base.getCard(preview.output).text,
    retainInputs: true,
    replacesPrepared:
      state.phase === "battle" && state.hand.length >= 5
        ? state.hand.at(-1)
        : null,
    enemyAction: null,
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
  if (
    forged &&
    state.phase === "battle" &&
    state.relics?.includes("bloodbookmark")
  )
    state.block = Math.min(base.COMBAT_POLICY.blockCap, state.block + 3);
  return { forged, action };
}

export function takeReward(state, reward, rng = Math.random) {
  const route = state.routeChoice;
  const ok = base.takeReward(state, reward);
  if (!ok) return false;
  state.lastRelics =
    route?.id === "guardian" && !route.rewardGranted
      ? grantGuidedRelics(state, 2, rng)
      : [];
  if (state.relics?.includes("quietlamp"))
    state.hp = Math.min(state.maxHp, state.hp + 1);
  state.routeChoice = null;
  return true;
}
