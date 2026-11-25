import * as THREE from "three";
import { WalkthroughLibrary } from "./walkthrough-library.js";
import { SpellEffects } from "./spell-effects.js";
import { AREAS } from "./areas.mjs";
import {
  newGuidedRun,
  GUIDED_FLOOR_COUNT,
  guidedRewardOptions,
  guidedChooseRoute,
  guidedRouteOptions,
  guidedRelics,
  getCard,
  recipeFor,
  getDiscoveryCatalog,
  guidedForgePreview,
  beginGuidedForge,
  tickGuidedForge,
  startGuidedBattle,
  guidedCast,
  resolveEnemyTurn,
  enemyIntent,
  takeReward,
  shuffle,
  applyCardDiscovery,
  learningSummary,
  drainLibraryEvents,
  forgetLearnedRune,
} from "./guided-rules.mjs";
import { requestCardDiscovery } from "./card-art.mjs";
import { chapterBook, worldAvailable } from "./world-interactions.mjs";
import { settleTransition } from "./presentation-transition.mjs";
import { effectProfile } from "./effectprofile.mjs";
import { spellIllustration } from "./spell-illustrations.mjs";
import { bookIcon } from "./book-icons.mjs";
import { playGlyph } from "./spell-glyphs.mjs";
import "./style.css";
import "./grimoire.css";
import "./typography.css";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const KNOWLEDGE = [
  ["Language", "You can name the world. It has begun to answer."],
  ["Memory", "The dust holds your footprints. You have walked here before."],
  [
    "Self",
    "Every guardian was an answer you abandoned. The library learned to become you.",
  ],
];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let state = newGuidedRun(),
  selected = [],
  forgeParents = [],
  rewardOptions = [],
  seed = 42,
  random = Math.random,
  started = false,
  travelling = false,
  areaIndex = 0,
  lastPhase = "explore",
  messageTimer;
let worldBusy = false,
  readChapters = new Set(),
  panelTrigger = null,
  runEpoch = 0;
let casting = 0;
let preparedIndex = 0;
let aimingSpellIndex = -1;
let pendingRelicNotice = "";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  100,
);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "low-power",
    alpha: true,
  });
} catch {
  document.body.innerHTML =
    '<p class="webgl-error">WebGL could not start. Enable hardware acceleration or try another browser.</p>';
  throw Error("WebGL unavailable");
}
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$("#world").appendChild(renderer.domElement);
const diorama = new WalkthroughLibrary(scene, camera, renderer, {
  style: "storybook",
  onEnemyClick: (index) => chooseTarget(index),
});
const spellEffects = new SpellEffects(scene, {
  camera,
  renderer,
  reducedMotion,
});
function resize() {
  const s = Math.min(1, 1600 / innerWidth, 900 / innerHeight);
  renderer.setSize(
    Math.round(innerWidth * s),
    Math.round(innerHeight * s),
    false,
  );
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);
function seededRandom(value) {
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function say(text) {
  $("#message").textContent = String(text).replace(/\bink\b/gi, "Focus");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => ($("#message").textContent = ""), 6500);
}
function closePanels() {
  for (const id of ["forge", "help", "map", "book"]) $("#" + id).hidden = true;
}
function dialog(id) {
  closePanels();
  if (!$(id).open) $(id).showModal();
}
function effects(c) {
  return [
    c.damage && !c.ricochet && !c.stealIntent
      ? `${c.damage} damage${c.all ? " to all" : ""}${c.pierce ? ", bypasses guard" : ""}`
      : "",
    c.ricochet ? `${c.ricochet} sparks of ${c.damage} damage; random bounces` : "",
    c.stealIntent ? "steal the announced attack" : "",
    c.borrowFocus ? `borrow ${c.borrowFocus} Focus; next turn -1` : "",
    c.block ? `${c.block} guard` : "",
    c.heal ? `${c.heal} heal` : "",
    c.draw ? `prepare ${c.draw}` : "",
    c.replay ? "repeat last attack as flame" : "",
    c.interrupt ? "interrupt next move" : "",
    c.reflect ? `reflect up to ${c.reflect} guarded damage` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
function runeMarkup(key, index, mode = "hand") {
  const rune = getCard(key);
  if (!rune) return "";
  const disabled =
    mode === "hand" && (state.phase !== "battle" || state.forge || travelling);
  const description = (rune.description || rune.text || "")
    .replace(/briefly/g, "this turn")
    .replace(/nearby enemies/g, "all enemies")
    .replace(/Draw a card/g, "Prepare a rune");
  return `<button class="rune ${esc(rune.kind)}${rune.fused ? " inscribed" : ""}${mode === "inventory" && selected.includes(index) ? " selected" : ""}${mode === "hand" && preparedIndex === index ? " prepared-selected" : ""}" data-index="${index}" ${disabled ? "disabled" : ""} ${mode === "inventory" ? `aria-pressed="${selected.includes(index)}"` : mode === "hand" ? `aria-pressed="${preparedIndex === index}"` : ""} aria-label="${esc(rune.name)}. ${esc(effects(rune))}. ${rune.cost} Focus. ${esc(description)}" title="${esc(rune.name)}: ${esc(description)}"><span class="rune-seal">${spellIllustration(rune)}</span><strong>${esc(rune.name)}</strong><span class="rune-effects">${esc(effects(rune))}</span><span class="rune-cost"><span><b>${rune.cost}</b>${bookIcon("focus")}</span>${mode === "hand" ? `<kbd>${index + 1}</kbd>` : ""}</span></button>`;
}
function targetsEnemy(spell) {
  return Boolean(spell && (spell.damage || spell.replay || spell.interrupt ||
    ["ricochet", "stolensentence"].includes(spell.effect)));
}
function renderPreparedSpell() {
  $("#spell-focus").classList.remove("glyph-casting", "glyph-lit");
  const spell = getCard(state.hand[preparedIndex]);
  const aiming = aimingSpellIndex === preparedIndex && targetsEnemy(spell);
  document.body.classList.toggle("spell-aiming", aiming);
  $("#spell-art").innerHTML = spell
    ? spellIllustration(spell, { detailed: true })
    : "";
  $("#active-spell-name").textContent = spell?.name || "An unwritten page";
  $("#active-spell-effects").textContent = spell
    ? effects(spell)
    : "End your turn to prepare fresh spells.";
  $("#active-spell-description").textContent = spell
    ? spell.benefit || spell.description || ""
    : "Fresh spells arrive next turn.";
  const button = $("#cast-prepared");
  button.innerHTML = spell
    ? `${aiming ? "Choose an enemy" : "Cast spell"} <span>${spell.cost} Focus ${bookIcon("focus")}</span>`
    : "No spell prepared";
  button.setAttribute(
    "aria-label",
    spell ? `Cast ${spell.name}, ${spell.cost} Focus` : "No spell prepared",
  );
  button.disabled =
    !spell ||
    spell.cost > state.energy ||
    state.phase !== "battle" ||
    Boolean(state.forge) ||
    travelling ||
    Boolean(casting);
  for (const rune of document.querySelectorAll("#hand .rune")) {
    const active = Number(rune.dataset.index) === preparedIndex;
    rune.classList.toggle("prepared-selected", active);
    rune.setAttribute("aria-pressed", String(active));
  }
}
function renderEnemies() {
  $("#enemy-targets").innerHTML =
    state.phase === "battle"
      ? state.enemies
          .map((e, i) => {
            const intent = enemyIntent(state, e);
            return `<button class="enemy-target${i === state.target ? " targeted" : ""}${e.hp <= 0 ? " defeated" : ""}" data-enemy="${i}" ${e.hp <= 0 ? "disabled" : ""} aria-pressed="${i === state.target}"><span class="target-marker">${i === state.target ? "TARGET" : "KEEPER"}</span><strong>${esc(e.name)}</strong><span class="hp-track"><i style="width:${(100 * Math.max(0, e.hp)) / e.maxHp}%"></i></span><span>${e.hp} / ${e.maxHp} HP${e.guard ? ` · ${e.guard} guard` : ""}</span><b>${e.hp > 0 ? esc(intent.label) : "Unbound"}</b></button>`;
          })
          .join("")
      : "";
  diorama.setEnemies(state.phase === "battle" ? state.enemies : []);
  diorama.setTarget(state.target);
  state.enemies.forEach((enemy, index) =>
    diorama.setIntent(index, enemyIntent(state, enemy).type),
  );
}
function render() {
  document.body.dataset.phase = travelling ? "travel" : state.phase;
  document.body.classList.toggle("deep-library", areaIndex >= 1);
  const area = AREAS[areaIndex];
  $("#run-floor").hidden = !started;
  $("#run-floor").textContent =
    `${areaIndex + 1} / ${GUIDED_FLOOR_COUNT} · ${area.name}`;
  $("#area-label").textContent =
    `FLOOR ${areaIndex + 1} / ${GUIDED_FLOOR_COUNT}`;
  $("#area-title").textContent = area.name;
  $("#journey-caption").textContent =
    state.floor >= 3 ? "A thirst for knowledge" : "The library awaits";
  $("#objective").textContent = travelling
    ? "Follow the paper path."
    : state.phase === "battle"
      ? "Your turn. Take your time; nothing attacks until you commit."
      : area.subtitle;
  $("#knowledge-progress").textContent =
    state.floor >= 3 ? `${state.floor - 1} truths understood` : "";
  $("#stats").innerHTML =
    `<span class="book-resource"><small>${bookIcon("vitality")}HP</small><strong>${state.hp}<span> / ${state.maxHp}</span></strong></span><span class="book-resource"><small>${bookIcon("guard")}Guard</small><strong>${state.block}</strong></span><span class="book-resource" id="energy" title="Focus powers spells. It refills when you end your turn."><small>${bookIcon("focus")}<span>Focus</span></small><strong>${state.energy}<span> / ${state.maxEnergy}</span></strong></span>`;
  $("#turn-number").textContent = `TURN ${state.turn}`;
  $("#grimoire-count").textContent =
    `${state.inventory.length} bound runes · ${state.hand.length} prepared · ${state.draw.length} unread · ${state.discard.length} resting`;
  preparedIndex = Math.min(preparedIndex, Math.max(0, state.hand.length - 1));
  $("#hand").innerHTML =
    state.phase === "battle"
      ? state.hand.map((k, i) => runeMarkup(k, i)).join("")
      : '<p class="empty-hand">Your grimoire is quiet. Connect two runes before the next question.</p>';
  renderPreparedSpell();
  $("#journey-status").hidden = !travelling;
  $("#end-turn").disabled =
    state.phase !== "battle" || Boolean(state.forge) || travelling;
  $("#spells-tab").disabled = Boolean(casting) || travelling;
  $("#advance-button").hidden = state.phase !== "explore" || !started;
  $("#advance-button").disabled = travelling || Boolean(state.forge);
  $("#advance-button").textContent = travelling
    ? "Turning the page…"
    : state.floor === 1
      ? "Face the first guardian"
      : "Continue the climb";
  $("#forge-button").disabled =
    !started || !["explore", "battle"].includes(state.phase) || travelling;
  $("#channel-banner").hidden = !state.forge;
  if (state.forge)
    $("#channel-copy").textContent =
      `Folding ${getCard(state.forge.output).name}…`;
  diorama.setDiscoveries?.({
    families: [
      ...new Set(
        state.inventory
          .map((key) => getCard(key))
          .filter((card) => card?.fused || card?.generated)
          .flatMap((card) => effectProfile(card).families),
      ),
    ],
  });
  renderEnemies();
  if (!$("#forge").hidden) renderForge();
  if (!$("#map").hidden) renderMap();
}
function renderMap() {
  $("#relic-list").innerHTML = guidedRelics(state).map((relic) =>
    `<li><strong>${esc(relic.name)}</strong><span>${esc(relic.description)}</span></li>`,
  ).join("") || "<li>No relics found yet.</li>";
  const learned = state.phase === "won" ? GUIDED_FLOOR_COUNT : state.floor - 1;
  $("#map-content").innerHTML = KNOWLEDGE.map(
    (truth, i) =>
      `<li class="${i === areaIndex ? "current" : ""}"><span>${i + 1}</span><strong>${esc(truth[0])}</strong><small>${esc(AREAS[i].name)} · ${i < learned ? "Understood" : i === state.floor - 1 ? "A question awaits" : "Not yet learned"}</small><p>${i < learned ? esc(truth[1]) : "An unanswered page."}</p></li>`,
  ).join("");
  const entries = learningSummary(state);
  $("#library-memory-list").innerHTML = entries.length
    ? entries
        .map((entry) => {
          const copies = state.inventory.filter(
            (key) => key === entry.key,
          ).length;
          const canForget =
            entry.learned &&
            state.phase === "explore" &&
            !travelling &&
            !state.forge &&
            copies > 0;
          return `<div class="library-rune"><span>${spellIllustration(getCard(entry.key))}</span><div><strong>${esc(entry.name)}</strong><small>${entry.learned ? "Learned by the library" : `Observed ${entry.casts} / 3 casts`}</small></div><button data-forget="${esc(entry.key)}" ${canForget ? "" : "disabled"} aria-label="Forget ${esc(entry.name)}, losing all ${copies} owned copies">Forget<small>Lose ${copies} ${copies === 1 ? "copy" : "copies"}</small></button></div>`;
        })
        .join("")
    : '<p class="memory-empty">No spells observed yet.</p>';
}
function libraryNotice() {
  return drainLibraryEvents(state)
    .map((event) => {
      if (event.type === "spell-learned")
        return `The library has learned ${event.name}. A later guardian may use it.`;
      if (event.type === "guardian-copied")
        return `This guardian remembers ${event.name}. Read its next move.`;
      return "";
    })
    .filter(Boolean)
    .join(" ");
}
function renderForge() {
  const inBattle = state.phase === "battle";
  $("#inventory-count").textContent = `(${state.inventory.length})`;
  $("#inventory").innerHTML = state.inventory
    .map((k, i) => runeMarkup(k, i, "inventory"))
    .join("");
  const first = selected.length ? state.inventory[selected[0]] : null;
  const second = selected.length > 1 ? state.inventory[selected[1]] : null;
  const preview = state.forge
    ? { ...state.forge, ok: false }
    : first && second
      ? guidedForgePreview(state, selected[0], selected[1])
      : null;
  const output =
    preview?.output || (first && second ? recipeFor(first, second) : null);
  const card = output && getCard(output);
  const tile = (key, empty, slot) => {
    const rune = key && getCard(key);
    const contents = rune
      ? `<span class="rune-seal fusion-seal">${spellIllustration(rune)}</span><strong>${esc(rune.name)}</strong>`
      : `<span>${empty}</span>`;
    return slot === undefined
      ? `<span class="fusion-tile${rune ? "" : " empty"}">${contents}</span>`
      : `<button class="fusion-tile ingredient-well${rune ? "" : " empty"}" data-clear-ingredient="${slot}" aria-label="${rune ? `Remove ${esc(rune.name)} from ingredient ${slot + 1}` : empty}">${contents}</button>`;
  };
  $("#fusion-preview").innerHTML =
    `${tile(first, "First spell", 0)}<b>+</b>${tile(second, "Second spell", 1)}<b>=</b>${tile(output, "New spell")}`;
  $("#fusion-benefit").innerHTML = card
    ? `<p class="fusion-powers">${esc(preview?.benefit || card.benefit || effects(card))}</p><small>Keep the originals. Combine this spell again.</small>`
    : "<p>Pick two spells, or pick the same spell twice.</p>";
  if (preview?.reason && !preview.ok && !state.forge)
    $("#cost-preview").textContent = preview.reason;
  else $("#cost-preview").textContent = preview?.output
    ? "Cost: 2 HP. Keep both originals and use the new spell again."
    : "Each new combination costs 2 HP. Choose two spells to see the result.";
  $("#merge-button").disabled = !preview?.ok || Boolean(state.forge);
  $("#merge-button").textContent = state.forge
    ? "Inscribing..."
    : preview?.forgotten
      ? "Forgotten this run"
      : preview?.alreadyOwned
        ? "Already in your grimoire"
        : preview?.ok
          ? `Combine`
          : "Choose two spells";
  $("#discoveries").textContent =
    getDiscoveryCatalog()
      .slice(-12)
      .map((c) => c.name)
      .join(" / ") || "Recipe knowledge survives. This run's imprints do not.";
}

function chooseTarget(index) {
  if (casting) return;
  if (state.phase !== "battle" || state.enemies[index]?.hp <= 0) return;
  state.target = index;
  if (aimingSpellIndex >= 0) {
    const aimed = aimingSpellIndex;
    aimingSpellIndex = -1;
    cast(aimed);
    return;
  }
  render();
}
function actionResult(result) {
  if (!result?.ok) {
    if (result?.reason) say(result.reason);
    return;
  }
  checkPhase();
  render();
}
function cast(index) {
  if (casting) return;
  aimingSpellIndex = -1;
  document.body.classList.remove("spell-aiming");
  const c = getCard(state.hand[index]);
  const target = diorama
    .getEnemyAnchor(state.target)
    ?.add(new THREE.Vector3(0, -1.0, 0));
  const origin = camera.position
    .clone()
    .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.8));
  origin.y -= 0.6;
  const hitAnchors = state.enemies.map((_, i) =>
    diorama.getEnemyAnchor(i)?.add(new THREE.Vector3(0, -1.0, 0)),
  );
  const result = guidedCast(state, index, state.target, random);
  if (result.ok) {
    playGlyph($('#hand [data-index="' + index + '"]'), { reducedMotion });
    playGlyph($("#spell-focus"), { reducedMotion });
    spellEffects.cast(
      c,
      origin,
      targetsEnemy(c) && target
        ? target
        : origin.clone().add(new THREE.Vector3(0, 0.3, -0.2)),
      {hits: (result.extras?.hits || []).map((hit) => hitAnchors[hit.targetIndex]).filter(Boolean)},
    );
    if (c.replay && target) {
      const epoch = runEpoch;
      setTimeout(
        () => {
          if (epoch === runEpoch && started)
            spellEffects.cast(c, origin, target);
        },
        reducedMotion ? 0 : 130,
      );
    }
    say(
      `${c.name}: ${c.replay && Number.isFinite(result.resolvedDamage) ? `${result.resolvedDamage} damage with the repeated attack` : effects(c)}. ${libraryNotice()}`,
    );
    casting = reducedMotion ? 0.08 : effectProfile(c).choreography ? 1.0 : 0.52;
    for (const button of document.querySelectorAll(".grimoire button"))
      button.disabled = true;
    return;
  }
  actionResult(result);
}
function endTurn() {
  if (casting) return;
  aimingSpellIndex = -1;
  const result = resolveEnemyTurn(state, random);
  if (!result.ok) {
    say(result.reason);
    return;
  }
  showCopiedMagic(result.actions);
  say(
    result.actions
      .map(
        (a) =>
          `${a.name}: ${a.type === "copied-spell" ? `${a.label}${a.blocked ? `, ${a.blocked} guarded` : ""}` : a.damage ? `${a.damage} damage${a.blocked ? `, ${a.blocked} guarded` : ""}` : a.label}`,
      )
      .join(" · "),
  );
  checkPhase();
  render();
}
function showCopiedMagic(actions) {
  for (const action of actions) {
    if (action.type !== "copied-spell") continue;
    const index = state.enemies.findIndex(
      (enemy) =>
        enemy.name === action.name &&
        enemy.copiedSpell?.key === action.spellKey,
    );
    const origin =
      index >= 0 &&
      diorama.getEnemyAnchor(index)?.add(new THREE.Vector3(0, -0.7, 0));
    const spell = getCard(action.spellKey);
    if (!origin || !spell) continue;
    spellEffects.cast(
      spell,
      origin,
      action.amount
        ? camera.position.clone().add(new THREE.Vector3(0, -0.4, 0))
        : origin.clone().add(new THREE.Vector3(0, 0.3, 0)),
    );
  }
}
function checkPhase() {
  if (state.phase === lastPhase) return;
  lastPhase = state.phase;
  if (state.phase === "reward") showReward();
  if (["dead", "won"].includes(state.phase)) showEnding();
}
async function settleWalk(animate, timeoutMs = 12000) {
  const epoch = runEpoch;
  try {
    await settleTransition(
      animate,
      () => {
        if (epoch === runEpoch) diorama.rail.update(0, true);
      },
      { timeoutMs },
    );
  } catch {
    if (epoch === runEpoch) {
      diorama.setArea(areaIndex);
      say("The path is ready. Continue when you are ready.");
    }
  }
}
async function advance({ focused = false } = {}) {
  if (worldBusy || travelling || state.phase !== "explore" || state.forge)
    return;
  const epoch = runEpoch;
  closePanels();
  if (state.routeChoice?.floor !== state.floor) {
    showRouteChoice();
    return;
  }
  if (!focused) {
    worldBusy = true;
    try {
      await settleWalk(
        () => diorama.focusWorld?.("binding", { reducedMotion }),
        6000,
      );
    } finally {
      worldBusy = false;
    }
  }
  if (epoch !== runEpoch || !started || state.phase !== "explore") return;
  travelling = true;
  render();
  await settleWalk(() => diorama.travelTo(areaIndex, { reducedMotion }), 18000);
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  clearTimeout(messageTimer);
  $("#message").textContent = "";
  startGuidedBattle(state, random);
  lastPhase = state.phase;
  render();
  const notice = [pendingRelicNotice, libraryNotice()].filter(Boolean).join(" ");
  pendingRelicNotice = "";
  if (notice) say(notice);
}
function showRouteChoice() {
  $("#route-floor").textContent = `Floor ${state.floor} / ${GUIDED_FLOOR_COUNT}`;
  $("#route-choices").innerHTML = guidedRouteOptions(state).map((route) =>
    `<button data-route="${esc(route.id)}"><strong>${esc(route.title)}</strong><span>${esc(route.description)}</span><small>${esc(route.reward)} &middot; ${esc(route.risk)}</small></button>`,
  ).join("");
  dialog("#route");
}
$("#route-choices").onclick = async (event) => {
  const button = event.target.closest("[data-route]");
  if (!button || state.phase !== "explore") return;
  const result = guidedChooseRoute(state, button.dataset.route, random);
  if (!result.ok) return;
  $("#route").close();
  pendingRelicNotice = (result.relics || []).map((relic) =>
    `${relic.name}. ${relic.description}`,
  ).join(" ");
  await advance();
};
async function beginRun() {
  casting = 0;
  aimingSpellIndex = -1;
  pendingRelicNotice = "";
  runEpoch++;
  for (const d of document.querySelectorAll("dialog[open]")) d.close();
  closePanels();
  state = newGuidedRun();
  seed =
    Number(new URLSearchParams(location.search).get("seed")) ||
    Math.floor(Math.random() * 1e9);
  random = seededRandom(seed);
  started = true;
  worldBusy = false;
  readChapters = new Set();
  travelling = true;
  areaIndex = 0;
  selected = [];
  lastPhase = "explore";
  diorama.resetDiscoveries?.();
  diorama.setArea(0);
  render();
  const epoch = runEpoch;
  await settleWalk(() => diorama.enterLibrary({ reducedMotion }), 6000);
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  render();
  $("#message").textContent = "";
}
function showReward() {
  if (state.floor >= GUIDED_FLOOR_COUNT) {
    takeReward(state, null, random);
    lastPhase = state.phase;
    return;
  }
  rewardOptions = shuffle(guidedRewardOptions(state), random).slice(0, 3);
  $("#reward-title").textContent = `${KNOWLEDGE[areaIndex][0]}, understood.`;
  $("#reward-copy").textContent =
    `${KNOWLEDGE[areaIndex][1]} Choose a rune for your grimoire and recover 1 health.`;
  $("#reward-choices").innerHTML = rewardOptions
    .map((k, i) => runeMarkup(k, i, "reward"))
    .join("");
  dialog("#reward");
}
function showEnding() {
  const won = state.phase === "won";
  $("#ending-label").textContent = won
    ? "THREE FLOORS. ONE REFLECTION."
    : "FULL PERMADEATH";
  $("#ending-title").textContent = won
    ? "The reader on the other side."
    : "The library keeps this life.";
  $("#ending-copy").textContent =
    `${state.character.name} · ${won ? GUIDED_FLOOR_COUNT : state.floor - 1} / ${GUIDED_FLOOR_COUNT} floors · ${state.merges} spells forged. ${won ? "Your reflection traces the spell you invented. The hand that wrote this grimoire wrote every guardian. You came here to learn; the library learned you. Knowledge is a curse. You have completed this three-floor journey." : "Your runes, forged inscriptions, health and progress are gone. A new run starts from the first binding."} Recipe discoveries remain in this browser.`;
  dialog("#ending");
}
function togglePanel(id) {
  if (!started || travelling || worldBusy || casting) return;
  const open = $("#" + id).hidden;
  closePanels();
  $("#" + id).hidden = !open;
  if (open) {
    panelTrigger = document.activeElement;
    if (id === "forge") {
      selected = [];
      renderForge();
    }
    if (id === "map") renderMap();
  }
}

$("#forge-button").insertAdjacentHTML("afterbegin", bookIcon("forge"));
$("#start-button").onclick = beginRun;
$("#advance-button").onclick = advance;
$("#end-turn").onclick = endTurn;
$("#cast-prepared").onclick = () => cast(preparedIndex);
$("#spells-tab").onclick = closePanels;
$("#skip-journey").onclick = () => diorama.rail.update(0, true);
$("#enemy-targets").onclick = (e) => {
  const b = e.target.closest("[data-enemy]");
  if (b) chooseTarget(Number(b.dataset.enemy));
};
$("#hand").onclick = (e) => {
  const b = e.target.closest("[data-index]");
  if (b && !casting) {
    preparedIndex = Number(b.dataset.index);
    aimingSpellIndex = targetsEnemy(getCard(state.hand[preparedIndex])) && aimingSpellIndex !== preparedIndex
      ? preparedIndex : -1;
    renderPreparedSpell();
  }
};
$("#library-memory-list").onclick = (e) => {
  const button = e.target.closest("[data-forget]");
  if (!button || button.disabled || casting || worldBusy) return;
  const name = getCard(button.dataset.forget)?.name || "the spell";
  const result = forgetLearnedRune(state, button.dataset.forget, {
    travelling,
  });
  if (!result.ok) {
    say(result.reason);
    return;
  }
  drainLibraryEvents(state);
  say(
    `You tear out ${name}, losing ${result.removedCount} ${result.removedCount === 1 ? "copy" : "copies"}. The library forgets it too.`,
  );
  render();
  renderMap();
  $("#library-memory-title").tabIndex = -1;
  $("#library-memory-title").focus();
};
for (const id of ["forge", "help", "map"]) {
  $("#" + id + "-button").onclick = () => togglePanel(id);
  $("#close-" + id).onclick = () => closeWorldPanel(id);
}
$("#inventory").onclick = (e) => {
  const b = e.target.closest("[data-index]");
  if (!b || state.forge) return;
  const i = Number(b.dataset.index);
  selected = selected.length < 2 ? [...selected, i] : [i];
  renderForge();
};
$("#fusion-preview").onclick = (e) => {
  const well = e.target.closest("[data-clear-ingredient]");
  if (!well || state.forge) return;
  const slot = Number(well.dataset.clearIngredient);
  selected.splice(slot, 1);
  renderForge();
};
$("#merge-button").onclick = () => {
  if (selected.length !== 2) return;
  forgeParents = selected.map((i) => getCard(state.inventory[i]));
  const result = beginGuidedForge(state, selected[0], selected[1]);
  if (!result.ok) say(result.reason);
  render();
};
$("#reward-choices").onclick = async (e) => {
  const b = e.target.closest("[data-index]");
  if (!b || !takeReward(state, rewardOptions[Number(b.dataset.index)], random)) return;
  const relicNotice = (state.lastRelics || []).map((relic) => `${relic.name}. ${relic.description}`).join(" ");
  const epoch = runEpoch;
  $("#reward").close();
  lastPhase = state.phase;
  diorama.setEnemies([]);
  if (state.phase === "won") {
    showEnding();
    render();
    return;
  }
  travelling = true;
  areaIndex = state.floor - 1;
  render();
  await settleWalk(() => diorama.travelTo(areaIndex, { reducedMotion }), 18000);
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  render();
  say([`${AREAS[areaIndex].name}. An open page is waiting.`, relicNotice].filter(Boolean).join(" "));
};
$("#restart-button").onclick = () => {
  runEpoch++;
  worldBusy = false;
  readChapters = new Set();
  $("#ending").close();
  started = false;
  travelling = false;
  selected = [];
  state = newGuidedRun();
  diorama.setEnemies([]);
  diorama.resetDiscoveries?.();
  diorama.setArea(0);
  render();
  dialog("#intro");
};
for (const d of document.querySelectorAll("dialog"))
  d.addEventListener("cancel", (e) => e.preventDefault());
addEventListener("keydown", (e) => {
  if (
    e.repeat ||
    !started ||
    travelling ||
    document.querySelector("dialog[open]") ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
  )
    return;
  if (worldBusy) return;
  if (e.code === "Escape") {
    if (aimingSpellIndex >= 0) {
      aimingSpellIndex = -1;
      renderPreparedSpell();
      return;
    }
    const panel = ["book", "forge", "help", "map"].find(
      (id) => !$("#" + id).hidden,
    );
    if (panel) closeWorldPanel(panel);
    return;
  }
  if (e.code === "KeyF") {
    togglePanel("forge");
    return;
  }
  if (e.code === "KeyM") {
    togglePanel("map");
    return;
  }
  if (["book", "forge", "help", "map"].some((id) => !$("#" + id).hidden))
    return;
  if (e.code === "Enter" && e.target.tagName !== "BUTTON") {
    if (state.phase === "explore") advance();
    else endTurn();
  }
  if (/^Digit[1-5]$/.test(e.code)) cast(Number(e.code.slice(-1)) - 1);
});

function syncWorldUI() {
  $("#journey-status").hidden = !(travelling || worldBusy);
  $("#journey-status span").textContent = travelling
    ? "Following the library's path..."
    : "Approaching the open page...";
  const visible = worldAvailable({
    started,
    phase: state.phase,
    travelling,
    modal: Boolean(document.querySelector("dialog[open]")),
  });
  diorama.setWorldVisible?.(visible);
  const panelOpen = ["forge", "help", "map", "book"].some(
    (id) => !$("#" + id).hidden,
  );
  $("#world-hotspots").hidden = !visible || panelOpen || worldBusy;
  $(".explore-tools").hidden = !visible || panelOpen;
  $("#advance-button").hidden = !visible || panelOpen;
  $("#advance-button").disabled = worldBusy || Boolean(state.forge);
  $("#explore-forge-button").disabled = worldBusy;
  $("#world-read").classList.toggle("visited", readChapters.has(areaIndex));
  const fallback = {
    read: [0.25, 0.58],
    forge: [0.51, 0.7],
    binding: [0.78, 0.48],
  };
  for (const [id, point] of Object.entries(fallback)) {
    const button = $("#world-" + id);
    const anchor = diorama.getWorldAnchor?.(id);
    let x = point[0] * innerWidth,
      y = point[1] * innerHeight;
    if (anchor) {
      anchor.project(camera);
      x = (anchor.x * 0.5 + 0.5) * innerWidth;
      y = (-anchor.y * 0.5 + 0.5) * innerHeight;
    }
    button.style.left = `${Math.max(75, Math.min(innerWidth - 75, x))}px`;
    button.style.top = `${Math.max(225, Math.min(innerHeight - 145, y))}px`;
    button.disabled = worldBusy || (id === "binding" && Boolean(state.forge));
  }
}
async function useWorld(id) {
  if (
    !worldAvailable({
      started,
      phase: state.phase,
      travelling,
      modal: Boolean(document.querySelector("dialog[open]")),
    }) ||
    worldBusy ||
    (id === "binding" && state.forge)
  )
    return;
  const epoch = runEpoch;
  panelTrigger = $("#world-" + id);
  worldBusy = true;
  syncWorldUI();
  try {
    await settleWalk(() => diorama.focusWorld?.(id, { reducedMotion }), 6000);
  } finally {
    worldBusy = false;
  }
  if (epoch !== runEpoch || state.phase !== "explore" || !started) return;
  if (id === "binding") {
    advance({ focused: true });
    return;
  }
  if (id === "forge") {
    togglePanel("forge");
    $("#forge-title").focus();
    return;
  }
  const book = chapterBook(areaIndex);
  closePanels();
  $("#book-title").textContent = book.title;
  $("#book-question").textContent = book.question;
  $("#book-passage").textContent = book.passage;
  $("#book-truth").hidden = state.floor - 1 <= areaIndex;
  $("#book-truth").textContent = KNOWLEDGE[areaIndex][1];
  $("#book").hidden = false;
  readChapters.add(areaIndex);
  $("#book-title").focus();
}
function closeWorldPanel(id) {
  $("#" + id).hidden = true;
  syncWorldUI();
  if (panelTrigger?.isConnected && !panelTrigger.disabled) panelTrigger.focus();
  panelTrigger = null;
}
for (const id of ["read", "forge", "binding"])
  $("#world-" + id).onclick = () => useWorld(id);
$("#close-book").onclick = () => closeWorldPanel("book");
$("#explore-forge-button").onclick = () => {
  panelTrigger = document.activeElement;
  togglePanel("forge");
};

function positionTargets() {
  const positions = [...document.querySelectorAll("[data-enemy]")]
    .filter((button) => !button.disabled)
    .map((button) => {
      const anchor = diorama.getEnemyAnchor(Number(button.dataset.enemy));
      if (!anchor) return null;
      anchor.project(camera);
      return {
        button,
        x: (anchor.x * 0.5 + 0.5) * innerWidth,
        y: Math.max(
          170,
          Math.min(innerHeight - 280, (-anchor.y * 0.5 + 0.5) * innerHeight),
        ),
        width: button.offsetWidth,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);
  let edge = 8;
  for (const p of positions) {
    p.x = Math.max(p.x, edge + p.width / 2);
    edge = p.x + p.width / 2 + 8;
  }
  const overflow = Math.max(0, edge - innerWidth);
  for (const p of positions) {
    p.button.style.left = `${p.x - overflow}px`;
    p.button.style.top = `${p.y}px`;
  }
}
let previous = performance.now(),
  elapsed = 0;
renderer.setAnimationLoop((now) => {
  // The browser already paces this to display refresh. A second 60Hz threshold
  // skips ordinary frames when timestamps round just below 16.667ms.
  const presentationDelta = Math.max(0, (now - previous) / 1000);
  const dt = Math.min(0.05, presentationDelta);
  previous = now;
  elapsed += dt;
  const result = tickGuidedForge(state, dt);
  if (result.forged) {
    selected = [];
    const c = getCard(result.forged);
    preparedIndex = Math.max(0, state.hand.indexOf(result.forged));
    if (result.action) showCopiedMagic([result.action]);
    const origin = camera.position
      .clone()
      .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.35));
    origin.y -= 0.25;
    spellEffects.forge(c, origin);
    say(
      `${c.name} folded.${result.action ? ` ${result.action.name}: ${result.action.label}${result.action.blocked ? `, ${result.action.blocked} guarded` : ""}.` : ""}`,
    );
    requestCardDiscovery(c, result.forged, forgeParents, (metadata) => {
      applyCardDiscovery(result.forged, metadata);
      render();
    });
    checkPhase();
    render();
  }
  diorama.update(dt, elapsed, { reducedMotion, presentationDelta });
  spellEffects.update(dt, elapsed);
  if (casting) {
    casting = Math.max(0, casting - dt);
    if (!casting) {
      checkPhase();
      render();
    }
  }
  positionTargets();
  syncWorldUI();
  renderer.render(scene, camera);
});
render();
dialog("#intro");
if (import.meta.env.DEV) window.__foldWorld = diorama;
if (import.meta.env.DEV)
  window.__foldDebug = () => ({
    phase: state.phase,
    floor: state.floor,
    totalFloors: state.totalFloors,
    hp: state.hp,
    block: state.block,
    lastAttack: state.lastAttack,
    maxHp: state.maxHp,
    energy: state.energy,
    maxEnergy: state.maxEnergy,
    merges: state.merges,
    latestForgedKey: state.latestForgedKey,
    turn: state.turn,
    character: state.characterId,
    inventory: [...state.inventory],
    inventoryIds: [...state.inventoryCopyIds],
    hand: [...state.hand],
    learning: learningSummary(state),
    enemies: state.enemies.map((e) => ({
      ...e,
      intent: enemyIntent(state, e),
    })),
    forge: state.forge ? { ...state.forge } : null,
    corruption: state.corruption,
    travelling,
    worldBusy,
    casting,
    readChapters: [...readChapters],
    drawCalls: renderer.info.render.calls,
  });
