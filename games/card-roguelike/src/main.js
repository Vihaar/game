import * as THREE from "three";
import { WalkthroughLibrary } from "./walkthrough-library.js";
import { SpellEffects } from "./spell-effects.js";
import { AREAS } from "./areas.mjs";
import {
  GUIDED_CHARACTERS as CHARACTERS,
  GUIDED_FORGE_MODES as FORGE_MODES,
  newGuidedRun,
  getCard,
  recipeFor,
  getDiscoveryCatalog,
  guidedForgePreview,
  beginGuidedForge,
  setForgeMode,
  tickGuidedForge,
  startGuidedBattle,
  guidedCast,
  guidedStrike,
  guidedBlock,
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
import { bookIcon } from "./book-icons.mjs";
import { spellGlyph, playGlyph } from "./spell-glyphs.mjs";
import "./style.css";
import "./grimoire.css";
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
  ["Language", "Meaning begins when one thing can stand for another."],
  ["Life", "Life changes, adapts, and carries understanding forward."],
  ["Memory", "Memory gives the past a place within the present."],
  [
    "Transformation",
    "Change reveals what can become, not only what already is.",
  ],
  ["Cosmos", "Every small thing belongs to a greater connected whole."],
  [
    "Truth",
    "You see what is true. The comforting answers can no longer shelter you.",
  ],
  [
    "Self",
    "Every guardian was a version of you. You have been fighting the answers you abandoned.",
  ],
  [
    "Everything",
    "Every truth is connected. You understand them all, and cannot unknow them.",
  ],
];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let state = newGuidedRun(),
  selectedCharacter = "binder",
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
  $("#message").textContent = text;
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
    c.damage ? `${c.damage}${c.all ? " to all" : ""} damage` : "",
    c.block ? `${c.block} guard` : "",
    c.heal ? `${c.heal} heal` : "",
    c.draw ? `prepare ${c.draw}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
function runeMarkup(key, index, mode = "hand") {
  const rune = getCard(key);
  if (!rune) return "";
  const disabled =
    mode === "hand" &&
    (state.phase !== "battle" ||
      state.forge ||
      travelling ||
      rune.cost > state.energy);
  const description = (rune.description || rune.text || "")
    .replace(/briefly/g, "this turn")
    .replace(/nearby enemies/g, "all enemies")
    .replace(/Draw a card/g, "Prepare a rune");
  return `<button class="rune ${esc(rune.kind)}${rune.fused ? " inscribed" : ""}${mode === "inventory" && selected.includes(index) ? " selected" : ""}" data-index="${index}" ${disabled ? "disabled" : ""} ${mode === "inventory" ? `aria-pressed="${selected.includes(index)}"` : ""} aria-label="${esc(rune.name)}. ${esc(effects(rune))}. ${rune.cost} ink. ${esc(description)}" title="${esc(rune.name)}: ${esc(description)}"><span class="rune-seal">${spellGlyph(rune)}</span><strong>${esc(rune.name)}</strong><span class="rune-effects">${esc(effects(rune))}</span><span class="rune-cost"><span><b>${rune.cost}</b>${bookIcon("ink")}</span>${mode === "hand" ? `<kbd>${index + 1}</kbd>` : ""}</span></button>`;
}
function renderCharacters() {
  $("#characters").innerHTML = Object.values(CHARACTERS)
    .map(
      (c) =>
        `<button class="character-card${selectedCharacter === c.id ? " selected" : ""}" data-character="${c.id}" aria-pressed="${selectedCharacter === c.id}"><span class="character-fold ${c.id}"></span><strong>${esc(c.name)}</strong><span>${c.hp} HP · ${c.basicDamage} strike · ${c.blockAmount} guard</span><small>${c.id === "runner" ? 4 : 3} ink each turn</small></button>`,
    )
    .join("");
  $("#character-summary").textContent =
    CHARACTERS[selectedCharacter].description;
}
function renderModes() {
  const options = Object.values(FORGE_MODES)
    .map((m) => `<option value="${m.id}">${esc(m.label)}</option>`)
    .join("");
  for (const id of ["forge-mode", "run-forge-mode"]) {
    $("#" + id).innerHTML = options;
    $("#" + id).value = state.forgeMode;
  }
  $("#run-mode-copy").textContent = FORGE_MODES[state.forgeMode].description;
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
}
function render() {
  document.body.dataset.phase = travelling ? "travel" : state.phase;
  document.body.classList.toggle("deep-library", areaIndex >= 4);
  const area = AREAS[areaIndex];
  $("#area-label").textContent = `FLOOR ${areaIndex + 1} / 8`;
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
    `<span class="book-resource"><small>${bookIcon("vitality")}Vitality</small><strong>${state.hp}<span> / ${state.maxHp}</span></strong></span><span class="book-resource"><small>${bookIcon("guard")}Guard</small><strong>${state.block}</strong></span><span class="book-resource" id="energy"><small>${bookIcon("ink")}Ink</small><strong>${state.energy}<span> / ${state.maxEnergy}</span></strong></span>`;
  $("#turn-number").textContent = `TURN ${state.turn}`;
  $("#grimoire-count").textContent =
    `${state.inventory.length} bound runes · ${state.hand.length} prepared · ${state.draw.length} unread · ${state.discard.length} resting`;
  $("#hand").innerHTML =
    state.phase === "battle"
      ? state.hand.map((k, i) => runeMarkup(k, i)).join("")
      : '<p class="empty-hand">Your grimoire is quiet. Connect two runes before the next question.</p>';
  $("#basic-attack").disabled =
    state.phase !== "battle" ||
    state.struckThisTurn ||
    Boolean(state.forge) ||
    travelling;
  $("#basic-block").disabled =
    state.phase !== "battle" ||
    state.guardedThisTurn ||
    Boolean(state.forge) ||
    travelling;
  $("#basic-attack small").textContent = state.struckThisTurn
    ? "Used this turn"
    : `${state.character.basicDamage} damage · once`;
  $("#basic-block small").textContent = state.guardedThisTurn
    ? "Used this turn"
    : `${state.character.blockAmount} guard · once`;
  $("#end-turn").disabled =
    state.phase !== "battle" || Boolean(state.forge) || travelling;
  $("#advance-button").hidden = state.phase !== "explore" || !started;
  $("#advance-button").disabled = travelling || Boolean(state.forge);
  $("#advance-button").textContent = travelling
    ? "Turning the page…"
    : `Enter ${AREAS[state.floor - 1].name}`;
  $("#forge-button").disabled =
    !started || !["explore", "battle"].includes(state.phase) || travelling;
  $("#channel-banner").hidden = !state.forge;
  if (state.forge)
    $("#channel-copy").textContent =
      `Folding ${getCard(state.forge.output).name}…`;
  renderEnemies();
  if (!$("#forge").hidden) renderForge();
  if (!$("#map").hidden) renderMap();
}
function renderMap() {
  const learned = state.phase === "won" ? 8 : state.floor - 1;
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
          return `<div class="library-rune"><span>${spellGlyph(getCard(entry.key))}</span><div><strong>${esc(entry.name)}</strong><small>${entry.learned ? "Learned by the library" : `Observed ${entry.casts} / 3 casts`}</small></div><button data-forget="${esc(entry.key)}" ${canForget ? "" : "disabled"} aria-label="Forget ${esc(entry.name)}, losing all ${copies} owned copies">Forget<small>Lose ${copies} ${copies === 1 ? "copy" : "copies"}</small></button></div>`;
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
  $("#forge-mode").value = state.forgeMode;
  $("#forge-mode").disabled = Boolean(state.forge);
  $("#mode-copy").textContent = FORGE_MODES[state.forgeMode].description;
  $("#inventory-count").textContent =
    `(${state.inventory.length} rune imprints)`;
  $("#inventory").innerHTML = state.inventory
    .map((k, i) => runeMarkup(k, i, "inventory"))
    .join("");
  const first = selected.length ? state.inventory[selected[0]] : null,
    second = selected.length > 1 ? state.inventory[selected[1]] : null;
  const preview = state.forge
    ? { ...state.forge, ok: false }
    : first && second
      ? guidedForgePreview(state, selected[0], selected[1])
      : null;
  const output =
    preview?.output || (first && second ? recipeFor(first, second) : null);
  const tile = (k, empty) => {
    const c = k && getCard(k);
    return c
      ? `<span class="fusion-tile"><span class="rune-seal fusion-seal">${spellGlyph(c)}</span><strong>${esc(c.name)}</strong></span>`
      : `<span class="fusion-tile empty">${empty}</span>`;
  };
  $("#fusion-preview").innerHTML =
    `${tile(first, "First rune")}<b>+</b>${tile(second, "Second rune")}<b>=</b>${tile(output, "New inscription")}`;
  $("#cost-preview").textContent = preview?.output
    ? `Consumes both runes + ${preview.inkCost} ink${preview.healthCost ? ` + ${preview.healthCost} HP` : ""}${preview.corruptionGain ? ` + 1 curse (enemy damage +${preview.enemyDamageBonusAfter})` : ""}. ${preview.enemyAction ? `${preview.enemyAction.name} immediately: ${preview.enemyAction.label}.` : "No extra enemy move."}`
    : preview?.reason?.replace(
        /Keep moving while it refills\./g,
        "Enter a question or end your turn to refill ink.",
      ) ||
      "Choose two distinct rune imprints. A forged inscription can become an ingredient again.";
  $("#merge-button").disabled = !preview?.ok || Boolean(state.forge);
  $("#merge-button").textContent = state.forge
    ? "Folding…"
    : preview?.ok
      ? `Forge ${getCard(preview.output).name}`
      : "Choose two rune imprints";
  $("#discoveries").textContent =
    getDiscoveryCatalog()
      .slice(-12)
      .map((c) => c.name)
      .join(" · ") ||
    "New discoveries stay in this browser. Your run does not.";
}
function chooseTarget(index) {
  if (casting) return;
  if (state.phase !== "battle" || state.enemies[index]?.hp <= 0) return;
  state.target = index;
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
function strike() {
  if (casting) return;
  actionResult(guidedStrike(state));
}
function guard() {
  if (casting) return;
  actionResult(guidedBlock(state));
}
function cast(index) {
  if (casting) return;
  const c = getCard(state.hand[index]);
  const target = diorama
    .getEnemyAnchor(state.target)
    ?.add(new THREE.Vector3(0, -1.0, 0));
  const origin = camera.position
    .clone()
    .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.8));
  origin.y -= 0.6;
  const result = guidedCast(state, index, state.target, random);
  if (result.ok) {
    playGlyph($('#hand [data-index="' + index + '"]'), { reducedMotion });
    spellEffects.cast(
      c,
      origin,
      c.damage && target
        ? target
        : origin.clone().add(new THREE.Vector3(0, 0.3, -0.2)),
    );
    say(`${c.name}: ${effects(c)}. ${libraryNotice()}`);
    casting = reducedMotion ? 0.08 : 0.52;
    for (const button of document.querySelectorAll(".grimoire button"))
      button.disabled = true;
    return;
  }
  actionResult(result);
}
function endTurn() {
  if (casting) return;
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
async function advance({ focused = false } = {}) {
  if (worldBusy || travelling || state.phase !== "explore" || state.forge)
    return;
  const epoch = runEpoch;
  closePanels();
  if (!focused) {
    worldBusy = true;
    try {
      await diorama.focusWorld?.("binding", { reducedMotion });
    } finally {
      worldBusy = false;
    }
  }
  if (epoch !== runEpoch || !started || state.phase !== "explore") return;
  travelling = true;
  render();
  await diorama.travelTo(areaIndex, { reducedMotion });
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  clearTimeout(messageTimer);
  $("#message").textContent = "";
  startGuidedBattle(state, random);
  lastPhase = state.phase;
  render();
  const notice = libraryNotice();
  if (notice) say(notice);
}
async function beginRun() {
  casting = 0;
  runEpoch++;
  for (const d of document.querySelectorAll("dialog[open]")) d.close();
  closePanels();
  const mode = $("#run-forge-mode").value;
  state = newGuidedRun(selectedCharacter);
  setForgeMode(state, mode);
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
  diorama.setArea(0);
  renderModes();
  render();
  const epoch = runEpoch;
  await diorama.enterLibrary({ reducedMotion });
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  render();
  $("#message").textContent = "";
}
function showReward() {
  rewardOptions = shuffle(["ember", "stone", "dew", "gust"], random).slice(
    0,
    3,
  );
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
    ? "ALL EIGHT TRUTHS, UNDERSTOOD"
    : "FULL PERMADEATH";
  $("#ending-title").textContent = won
    ? "The last answer."
    : "The library keeps this life.";
  $("#ending-copy").textContent =
    `${state.character.name} · ${won ? 8 : state.floor - 1} / 8 bindings · ${state.merges} spells forged · curse ${state.corruption}. ${won ? "The hand that wrote your grimoire wrote every guardian. Their spells were yours. Their faces were yours. You have been fighting yourself the whole way up. Now you remember every life and understand every answer. You know everything, and you cannot unknow it. The library is silent. Your mind never will be." : "Your runes, forged inscriptions, health and progress are gone. A new run starts from the first binding."} Recipe discoveries remain in this browser.`;
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

$("#characters").onclick = (e) => {
  const b = e.target.closest("[data-character]");
  if (b) {
    selectedCharacter = b.dataset.character;
    renderCharacters();
  }
};
for (const [id, icon] of [
  ["basic-attack", "strike"],
  ["basic-block", "guard"],
  ["forge-button", "forge"],
])
  $("#" + id).insertAdjacentHTML("afterbegin", bookIcon(icon));
$("#start-button").onclick = beginRun;
$("#advance-button").onclick = advance;
$("#basic-attack").onclick = strike;
$("#basic-block").onclick = guard;
$("#end-turn").onclick = endTurn;
$("#enemy-targets").onclick = (e) => {
  const b = e.target.closest("[data-enemy]");
  if (b) chooseTarget(Number(b.dataset.enemy));
};
$("#hand").onclick = (e) => {
  const b = e.target.closest("[data-index]");
  if (b) cast(Number(b.dataset.index));
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
  selected = selected.includes(i)
    ? selected.filter((v) => v !== i)
    : selected.length < 2
      ? [...selected, i]
      : [selected[1], i];
  renderForge();
};
$("#merge-button").onclick = () => {
  if (selected.length !== 2) return;
  forgeParents = selected.map((i) => getCard(state.inventory[i]));
  const result = beginGuidedForge(state, selected[0], selected[1]);
  if (!result.ok) say(result.reason);
  render();
};
$("#forge-mode").onchange = (e) => {
  setForgeMode(state, e.target.value);
  e.target.blur();
  renderForge();
};
$("#run-forge-mode").onchange = (e) => {
  setForgeMode(state, e.target.value);
  $("#run-mode-copy").textContent = FORGE_MODES[state.forgeMode].description;
};
$("#reward-choices").onclick = async (e) => {
  const b = e.target.closest("[data-index]");
  if (!b || !takeReward(state, rewardOptions[Number(b.dataset.index)])) return;
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
  await diorama.travelTo(areaIndex, { reducedMotion });
  if (epoch !== runEpoch || !started) return;
  travelling = false;
  render();
  say(`${AREAS[areaIndex].name}. An open page is waiting.`);
};
$("#restart-button").onclick = () => {
  runEpoch++;
  worldBusy = false;
  readChapters = new Set();
  $("#ending").close();
  started = false;
  travelling = false;
  selected = [];
  state = newGuidedRun(selectedCharacter);
  diorama.setEnemies([]);
  diorama.setArea(0);
  renderCharacters();
  renderModes();
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
  if (e.code === "KeyJ") strike();
  if (e.code === "KeyK") guard();
  if (e.code === "Enter" && e.target.tagName !== "BUTTON") endTurn();
  if (/^Digit[1-5]$/.test(e.code)) cast(Number(e.code.slice(-1)) - 1);
});

function syncWorldUI() {
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
    await diorama.focusWorld?.(id, { reducedMotion });
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
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  elapsed += dt;
  const result = tickGuidedForge(state, dt);
  if (result.forged) {
    selected = [];
    const c = getCard(result.forged);
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
  diorama.update(dt, elapsed, { reducedMotion });
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
renderCharacters();
renderModes();
render();
dialog("#intro");
if (import.meta.env.DEV) window.__foldWorld = diorama;
if (import.meta.env.DEV)
  window.__foldDebug = () => ({
    phase: state.phase,
    floor: state.floor,
    hp: state.hp,
    maxHp: state.maxHp,
    energy: state.energy,
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
