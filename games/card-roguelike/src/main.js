import * as THREE from 'three';
import { Player } from './player.js';
import { LibraryWorld } from './world.js';
import { CombatEncounter } from './combat.js';
import { AREAS, enemyDefinitions, roomAt } from './areas.mjs';
import { flatDistance } from './spatial.mjs';
import { CHARACTERS, FORGE_MODES, newRun, getCard, recipeFor, getDiscoveryCatalog, getForgePreview, beginForge, setForgeMode, tickCombatResources, startBattle, castCard, basicAttack, basicBlock, endTurn, takeReward, shuffle, corruptionDamageBonus, applyCardDiscovery } from './rules.mjs';
import { cardArtStyle, requestCardDiscovery } from './card-art.mjs';
import './style.css';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let state = newRun(), started = false, freeRoam = false, selectedCharacter = 'binder';
let selected = [], rewardOptions = [], forgeParents = [], cleared = new Set();
let encounter = null, seed = 0, random = Math.random, previousTime = performance.now(), elapsed = 0;
let uiTime = 0, messageTimer, lastPhase = 'explore', lastHand = '', lastInventory = '', dangerFade = 0;

function seededRandom(value) { return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb8c2ce); scene.fog = new THREE.Fog(0xb8c2ce, 17, 43);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 70);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
catch { $('#world').innerHTML = '<p class="webgl-error">WebGL could not start. Enable hardware acceleration or try another desktop browser.</p>'; $('#start-button').disabled = true; throw new Error('WebGL is unavailable.'); }
renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
$('#world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf8eddb, 0x6d748d, 2.8));
const sun = new THREE.DirectionalLight(0xffe8c4, 2.2); sun.position.set(-9, 16, 5); scene.add(sun);
const world = new LibraryWorld(scene);
const player = new Player(camera, () => world.collisionTrees, renderer.domElement,
  () => started && (['explore', 'battle'].includes(state.phase) || freeRoam),
  () => !$('#forge').hidden || !$('#map').hidden || !$('#help').hidden);
player.reset();

function resize() {
  const scale = Math.min(1, 1600 / innerWidth, 900 / innerHeight);
  renderer.setSize(Math.round(innerWidth * scale), Math.round(innerHeight * scale), false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
resize(); window.addEventListener('resize', resize);

function say(message, duration = 3500) { $('#message').textContent = message; clearTimeout(messageTimer); messageTimer = setTimeout(() => { $('#message').textContent = ''; }, duration); }
function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock(); player.keys = {}; }
function closePanels() { for (const id of ['forge', 'map', 'help']) $('#' + id).hidden = true; }
function openDialog(id) { releaseMouse(); closePanels(); if (!$(id).open) $(id).showModal(); }

function effects(card) {
  return [card.damage ? `${card.damage}${card.all ? ' area' : ''} damage` : '', card.block ? `${card.block} block` : '', card.heal ? `${card.heal} heal` : '', card.draw ? `draw ${card.draw}` : ''].filter(Boolean).join(' · ');
}

function cardMarkup(key, index, mode = 'hand') {
  const card = getCard(key); if (!card) return '';
  const action = mode === 'hand' ? `${card.cost} ink. Cast this spell.` : mode === 'inventory' ? 'Choose this owned copy for forging.' : 'Add this card to your deck.';
  const disabled = mode === 'hand' && (state.phase !== 'battle' || Boolean(state.forge) || card.cost > state.energy);
  const marked = mode === 'inventory' && selected.includes(index);
  return `<button type="button" class="card ${esc(card.kind)}${card.fused ? ' fused' : ''}${marked ? ' selected' : ''}" data-index="${index}" ${disabled ? 'disabled' : ''} ${mode === 'inventory' ? `aria-pressed="${marked}"` : ''} aria-label="${esc(card.name)}. ${esc(effects(card))}. ${esc(action)}"><span class="card-top"><span>${card.fused ? 'FOLDED SPELL' : 'ELEMENT'}</span><b class="cost">${card.cost}</b></span><span class="card-art" style="${esc(cardArtStyle(card, key))}"></span><strong title="${esc(card.name)}">${esc(card.name)}</strong><span class="card-effects">${esc(effects(card))}</span><span class="card-text">${esc(card.description || card.text)}</span>${mode === 'hand' ? `<kbd>${index + 1}</kbd>` : ''}</button>`;
}

function renderCharacters() {
  $('#characters').innerHTML = Object.values(CHARACTERS).map(character => `<button type="button" class="character-card${selectedCharacter === character.id ? ' selected' : ''}" data-character="${esc(character.id)}" aria-pressed="${selectedCharacter === character.id}"><span class="character-fold ${esc(character.id)}" aria-hidden="true"></span><strong>${esc(character.name)}</strong><span>${character.hp} HP · ${character.basicDamage} strike · ${character.blockAmount} block</span><small>${Math.round(character.moveSpeed * 100)}% movement</small></button>`).join('');
  $('#character-summary').textContent = CHARACTERS[selectedCharacter].description;
}

function renderModeChoices() {
  const options = Object.values(FORGE_MODES).map(mode => `<option value="${esc(mode.id)}">${esc(mode.label)}</option>`).join('');
  $('#forge-mode').innerHTML = options; $('#run-forge-mode').innerHTML = options;
  $('#forge-mode').value = state.forgeMode; $('#run-forge-mode').value = state.forgeMode;
  $('#mode-copy').textContent = FORGE_MODES[state.forgeMode].description;
  $('#run-mode-copy').textContent = FORGE_MODES[state.forgeMode].description;
}

function renderHand(force = false) {
  const fingerprint = [state.phase, state.handCopyIds.join(','), state.energy, Boolean(state.forge), state.hand.map(key => getCard(key)?.name).join(',')].join('|');
  if (!force && fingerprint === lastHand) return;
  lastHand = fingerprint;
  $('#hand').innerHTML = state.phase === 'battle' ? state.hand.map((key, index) => cardMarkup(key, index)).join('') : '<p class="empty-hand">Your basic strike and block never run out. Spells are drawn when a room wakes.</p>';
}

function renderHud(force = false) {
  document.body.dataset.phase = freeRoam ? 'explore' : state.phase;
  const current = roomAt(camera.position), area = AREAS[current];
  $('#stats').innerHTML = `<span class="hero-name">${esc(state.character.name)}</span><span class="health"><b>${Math.ceil(state.hp)}</b> / ${state.maxHp} HP</span><span class="block-stat">${state.block ? `${state.block} block · ${state.blockRemaining.toFixed(1)}s` : 'no block'}</span><span class="curse-stat">Curse ${state.corruption} · +${corruptionDamageBonus(state)} enemy damage</span>`;
  $('#area-label').textContent = `AREA ${current + 1} / ${AREAS.length} · ${cleared.size} BINDINGS BROKEN`;
  $('#area-title').textContent = area.name;
  $('#objective').textContent = freeRoam ? 'The library is unbound. Its rooms are yours to walk.' : state.phase === 'battle' ? 'Read the tell. Keep moving. Fold something dangerous.' : state.phase === 'explore' ? current === state.floor - 1 ? 'Walk into the room to wake its keepers. You can forge first.' : `The next binding opened. Find ${AREAS[state.floor - 1].name}.` : area.subtitle;
  $('#area-progress').innerHTML = AREAS.map((value, index) => `<span class="${cleared.has(index) ? 'cleared' : ''}${current === index ? ' current' : ''}" title="${esc(value.name)}" aria-label="${esc(value.name)}${cleared.has(index) ? ', cleared' : ''}"></span>`).join('');
  $('#energy').innerHTML = `<strong>${'◆'.repeat(state.energy)}${'◇'.repeat(Math.max(0, state.maxEnergy - state.energy))}</strong><span>${state.energy} / ${state.maxEnergy} ink</span>`;
  $('#deck-count').textContent = `${state.inventory.length} owned · ${state.draw.length} draw · ${state.discard.length} discard · run ${seed}`;
  $('#attack-cooldown').textContent = state.forge ? 'folding' : state.basicAttackCooldown > 0 ? `${state.basicAttackCooldown.toFixed(1)}s` : `${state.character.basicDamage} damage · close range`;
  $('#block-cooldown').textContent = state.forge ? 'folding' : state.basicBlockCooldown > 0 ? `${state.basicBlockCooldown.toFixed(1)}s` : `${state.character.blockAmount} guard · brief`;
  $('#dodge-cooldown').textContent = player.dashCooldown > 0 ? `${player.dashCooldown.toFixed(1)}s` : 'ready · no invincibility';
  $('#basic-attack').disabled = state.phase !== 'battle' || Boolean(state.forge) || state.basicAttackCooldown > 0;
  $('#basic-block').disabled = state.phase !== 'battle' || Boolean(state.forge) || state.basicBlockCooldown > 0;
  $('#dodge-button').disabled = !started || (!['explore', 'battle'].includes(state.phase) && !freeRoam) || player.dashCooldown > 0;
  $('#cycle-hand').disabled = state.phase !== 'battle' || Boolean(state.forge) || state.energy < 1 || state.handCycleCooldown > 0;
  $('#forge-button').disabled = !['explore', 'battle'].includes(state.phase);
  document.body.classList.toggle('low-health', state.hp > 0 && state.hp / state.maxHp < 0.3);
  renderHand(force);
  if (!$('#forge').hidden) renderForge();
  if (!$('#map').hidden) renderMap();
  const warning = encounter?.actors.find(actor => actor.phase === 'windup' && actor.label.hidden && state.enemies[actor.index]?.hp > 0 && flatDistance(actor.position, camera.position) < 15);
  $('#threat-warning').hidden = !warning || state.phase !== 'battle';
  if (warning) {
    const toward = warning.position.clone().sub(camera.position), forward = camera.getWorldDirection(new THREE.Vector3());
    const side = toward.dot(forward) < 0 ? 'Behind you' : 'Offscreen';
    $('#threat-warning').textContent = `${side}: ${warning.definition.name} · ${Math.max(0, warning.remaining).toFixed(1)}s · ${state.enemies[warning.index].damage + corruptionDamageBonus(state)} damage`;
  }
}

function renderMap() {
  const current = roomAt(camera.position);
  $('#map-content').innerHTML = `<svg viewBox="-52 -122 104 138" aria-label="The eight connected library areas"><path d="${AREAS.map((area, index) => `${index ? 'L' : 'M'}${area.x},${area.z}`).join(' ')}" fill="none" stroke="#b49e83" stroke-width="2" stroke-dasharray="2 2"/>${AREAS.map((area, index) => `<g><rect x="${area.x - 10}" y="${area.z - 9}" width="20" height="18" rx="2" fill="${cleared.has(index) ? '#6c9284' : current === index ? '#e7774f' : '#cbb797'}" stroke="#22334b" stroke-width="0.5"/><text x="${area.x}" y="${area.z + 2}" text-anchor="middle" font-size="6" fill="#22334b">${index + 1}</text></g>`).join('')}<circle cx="${camera.position.x}" cy="${camera.position.z}" r="1.7" fill="#22334b"/></svg><ol>${AREAS.map((area, index) => `<li class="${index === current ? 'current' : ''}">${esc(area.name)} <span>${cleared.has(index) ? 'Unbound' : index === state.floor - 1 ? 'Current binding' : index < state.floor ? 'Open' : 'Bound'}</span></li>`).join('')}</ol>`;
}

function renderForge() {
  const inventoryFingerprint = state.inventoryCopyIds.join(',') + '|' + selected.join(',') + '|' + Boolean(state.forge) + '|' + state.inventory.map(key => getCard(key)?.name).join(',');
  $('#inventory-count').textContent = `(${state.inventory.length} owned copies)`;
  if (inventoryFingerprint !== lastInventory) {
    lastInventory = inventoryFingerprint; $('#inventory').innerHTML = state.inventory.map((key, index) => cardMarkup(key, index, 'inventory')).join('');
    const catalog = getDiscoveryCatalog();
    $('#discoveries').textContent = catalog.length ? catalog.slice(-12).map(card => card.name).join(' · ') : 'Your discoveries will stay in this browser. The current run resets when you start again.';
  }
  $('#forge-mode').value = state.forgeMode; $('#forge-mode').disabled = Boolean(state.forge);
  $('#mode-copy').textContent = FORGE_MODES[state.forgeMode].description;
  const first = selected.length ? state.inventory[selected[0]] : null, second = selected.length > 1 ? state.inventory[selected[1]] : null;
  const preview = state.forge ? { ...state.forge, ok: false, reason: 'Channel in progress.' } : first && second ? getForgePreview(state, selected[0], selected[1]) : null;
  const output = preview?.output || (first && second ? recipeFor(first, second) : null);
  const tile = (key, placeholder = 'Choose an owned copy') => { const card = key && getCard(key); return card ? `<span class="fusion-tile"><span class="card-art" style="${esc(cardArtStyle(card, key))}"></span><strong>${esc(card.name)}</strong></span>` : `<span class="fusion-tile empty">${esc(placeholder)}</span>`; };
  const previewKey = [first, second, output].join('|');
  if ($('#fusion-preview').dataset.key !== previewKey) { $('#fusion-preview').dataset.key = previewKey; $('#fusion-preview').innerHTML = `${tile(first)}<b>+</b>${tile(second)}<b>=</b>${tile(output, 'New spell')}`; }
  if (preview?.output && Number.isFinite(preview.duration)) $('#cost-preview').textContent = `Consumes both copies + ${preview.inkCost} ink. Channel ${preview.duration}s${preview.healthCost ? ` · ${preview.healthCost} HP` : ''}${preview.corruptionGain ? ` · curse ${preview.corruptionBefore} → ${preview.corruptionAfter} (enemy damage +${preview.enemyDamageBonusAfter})` : ''}.${preview.ok ? '' : ` ${preview.reason}`}`;
  else if (preview && !preview.ok) $('#cost-preview').textContent = preview.reason;
  else $('#cost-preview').textContent = 'Choose any two distinct copies. Already-forged cards can be folded again, without a depth cap.';
  $('#merge-button').disabled = Boolean(state.forge) || !preview?.ok;
  $('#merge-button').textContent = state.forge ? `Folding · ${state.forge.remaining.toFixed(1)}s` : preview?.ok ? `Forge ${getCard(preview.output).name}` : 'Choose two owned cards';
}

function togglePanel(id) {
  if (!started || (!['explore', 'battle'].includes(state.phase) && !(freeRoam && id !== 'forge'))) return;
  const panel = $('#' + id), opening = panel.hidden;
  closePanels(); panel.hidden = !opening;
  if (opening) { releaseMouse(); if (id === 'forge') { selected = []; lastInventory = ''; renderForge(); } if (id === 'map') renderMap(); }
}

function beginRun() {
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  closePanels(); encounter?.dispose(); encounter = null;
  const chosenMode = $('#run-forge-mode').value;
  state = newRun(selectedCharacter); setForgeMode(state, chosenMode);
  const requested = new URLSearchParams(location.search).get('seed'); seed = requested !== null && Number.isFinite(Number(requested)) ? Number(requested) >>> 0 : Math.floor(Math.random() * 1e9);
  random = seededRandom(seed); started = true; freeRoam = false; selected = []; cleared = new Set(); elapsed = 0; lastPhase = 'explore'; lastHand = ''; lastInventory = ''; dangerFade = 0;
  world.reset(); player.reset(0, 8.5); camera.rotation.x = -0.1; player.speedScale = state.character.moveSpeed; player.dashRecharge = selectedCharacter === 'runner' ? 2.2 : selectedCharacter === 'warden' ? 3.4 : 3;
  renderModeChoices(); renderHud(true); say('WASD walks. J strikes, K blocks, Space dodges. F folds cards — even while you are being chased.', 7000);
}

function enterBattle(index) {
  const definitions = enemyDefinitions(index, random);
  if (!startBattle(state, random, definitions)) return;
  encounter?.dispose(); encounter = new CombatEncounter(scene, world, $('#enemy-label-layer'), state, definitions, (result, name) => {
    if (result.damage) { dangerFade = reducedMotion ? 0 : 0.32; say(`${name}: ${result.damage} damage${result.blocked ? ` · ${result.blocked} blocked` : ''}.`, 1400); }
    else if (result.blocked) say(`Guard held. ${result.blocked} damage blocked.`, 1000);
  });
  lastHand = ''; renderHud(true); say(`${AREAS[index].name}. Move during every windup. Your guard does not last forever.`, 4200);
}

function targetFor(range) {
  if (!encounter) return -1;
  const current = encounter.getTarget(state.target);
  if (current && state.enemies[state.target]?.hp > 0 && flatDistance(current.position, camera.position) <= range && world.canSee({ x: camera.position.x, y: 1.05, z: camera.position.z }, { x: current.position.x, y: 1.05, z: current.position.z })) return state.target;
  const nearest = encounter.nearestTarget(camera.position, range);
  if (nearest >= 0) state.target = nearest;
  return nearest;
}

function strike() {
  if (state.phase !== 'battle') return;
  const target = targetFor(3.5);
  if (target < 0) { say('Too far to strike. Get closer, or cast a spell.', 1200); return; }
  const result = basicAttack(state, target); if (!result.ok) { if (state.forge) say(result.reason); return; }
  say(`Strike · ${result.damage} damage.`, 800); renderHud();
}
function guard() { const result = basicBlock(state); if (result.ok) say(`${result.block} block. Time it for the hit.`, 1100); else if (state.forge) say(result.reason); renderHud(); }
function cast(index) {
  const key = state.hand[index], card = key && getCard(key); if (!card || state.phase !== 'battle') return;
  if (card.damage && targetFor(15) < 0) { say('No clear target within spell range. Move around the cover.', 1400); return; }
  const result = castCard(state, index, state.target, random); if (!result.ok) { say(result.reason, 1500); return; }
  say(`${card.name} · ${effects(card)}`, 1300); renderHud(true);
}
function cycleHand() { const result = endTurn(state, random); if (result) { say('A fresh hand. One ink spent; enemies did not wait.'); renderHud(true); } }

function showReward() {
  const index = state.floor - 1; cleared.add(index); world.unlock(index);
  rewardOptions = shuffle(['ember', 'stone', 'dew', 'gust'], random).slice(0, 3);
  $('#reward-title').textContent = index === AREAS.length - 1 ? 'The last binding tears.' : `${AREAS[index].name}, unbound.`;
  $('#reward-copy').textContent = index === AREAS.length - 1 ? 'Take the final page. You have earned your way back into reality.' : `Choose a copy for your deck and recover just 1 HP. The doorway to ${AREAS[index + 1].name} is now open. You can walk back through cleared areas.`;
  $('#reward-choices').innerHTML = rewardOptions.map((key, index) => cardMarkup(key, index, 'reward')).join(''); openDialog('#reward');
}

function showEnding() {
  const won = state.phase === 'won';
  $('#ending-label').textContent = won ? 'REALITY, MOSTLY RESTORED' : 'THE LIBRARY KEEPS YOUR PLACE';
  $('#ending-title').textContent = won ? 'You wrote your way out.' : 'Another page in the ledger.';
  $('#ending-copy').textContent = `${state.character.name} · ${cleared.size} / ${AREAS.length} bindings · ${state.merges} spells forged · curse ${state.corruption}. ${Math.floor(elapsed / 60)}m ${Math.floor(elapsed % 60)}s. Run ${seed}. Forging price: ${FORGE_MODES[state.forgeMode].label}.`;
  $('#wander-button').hidden = !won; openDialog('#ending');
}

function phaseTransitions() {
  if (state.phase === lastPhase) return;
  lastPhase = state.phase;
  if (state.phase === 'reward') showReward();
  if (state.phase === 'dead' || state.phase === 'won') showEnding();
}

function forgeComplete(key) {
  selected = []; lastInventory = ''; lastHand = ''; const card = getCard(key);
  say(`${card.name} unfolded. Its two ingredient copies are gone.`, 3500);
  requestCardDiscovery(card, key, forgeParents, metadata => { applyCardDiscovery(key, metadata); lastHand = ''; lastInventory = ''; renderHud(true); });
  renderHud(true);
}

$('#characters').addEventListener('click', event => { const button = event.target.closest('[data-character]'); if (!button) return; selectedCharacter = button.dataset.character; renderCharacters(); });
$('#start-button').addEventListener('click', beginRun);
$('#restart-button').addEventListener('click', () => { $('#ending').close(); started = false; closePanels(); renderCharacters(); openDialog('#intro'); });
$('#wander-button').addEventListener('click', () => { $('#ending').close(); freeRoam = true; closePanels(); say('The library is yours. M opens its map.'); });
$('#forge-button').addEventListener('click', () => togglePanel('forge'));
$('#close-forge').addEventListener('click', () => { $('#forge').hidden = true; });
$('#map-button').addEventListener('click', () => togglePanel('map')); $('#close-map').addEventListener('click', () => { $('#map').hidden = true; });
$('#help-button').addEventListener('click', () => togglePanel('help')); $('#close-help').addEventListener('click', () => { $('#help').hidden = true; });
$('#basic-attack').addEventListener('click', strike); $('#basic-block').addEventListener('click', guard); $('#dodge-button').addEventListener('click', () => player.dodge()); $('#cycle-hand').addEventListener('click', cycleHand);
$('#hand').addEventListener('click', event => { const button = event.target.closest('[data-index]'); if (button) cast(Number(button.dataset.index)); });
$('#enemy-label-layer').addEventListener('click', event => { const button = event.target.closest('[data-enemy]'); if (button) state.target = Number(button.dataset.enemy); });
$('#inventory').addEventListener('click', event => {
  const button = event.target.closest('[data-index]'); if (!button || state.forge) return;
  const index = Number(button.dataset.index);
  if (selected.includes(index)) selected = selected.filter(value => value !== index);
  else selected = selected.length < 2 ? [...selected, index] : [selected[1], index];
  lastInventory = ''; renderForge();
});
$('#merge-button').addEventListener('click', () => {
  if (selected.length !== 2) return;
  forgeParents = selected.map(index => getCard(state.inventory[index]));
  const result = beginForge(state, selected[0], selected[1]);
  if (!result.ok) { say(result.reason); return; }
  say(`Folding ${getCard(result.output).name}. Keep dodging; both hands are busy.`, result.duration * 1000 + 500); renderHud(true);
});
$('#forge-mode').addEventListener('change', event => { if (!setForgeMode(state, event.target.value)) event.target.value = state.forgeMode; event.target.blur(); renderForge(); });
$('#run-forge-mode').addEventListener('change', event => { setForgeMode(state, event.target.value); $('#run-mode-copy').textContent = FORGE_MODES[state.forgeMode].description; });
$('#reward-choices').addEventListener('click', event => {
  const button = event.target.closest('[data-index]'); if (!button || !takeReward(state, rewardOptions[Number(button.dataset.index)])) return;
  $('#reward').close(); encounter?.dispose(); encounter = null; lastHand = ''; lastInventory = ''; lastPhase = state.phase;
  if (state.phase === 'won') showEnding(); else say(`Find the open doorway to ${AREAS[state.floor - 1].name}. M shows the route.`, 6000);
  renderHud(true);
});
for (const selector of ['#intro', '#reward', '#ending']) $(selector).addEventListener('cancel', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (event.repeat || !started || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || $('dialog[open]')) return;
  if (event.code === 'Escape') { closePanels(); return; }
  if (event.code === 'KeyF') togglePanel('forge');
  if (event.code === 'KeyM') togglePanel('map');
  if (event.code === 'KeyJ') strike();
  if (event.code === 'KeyK') guard();
  if (event.code === 'KeyR') cycleHand();
  if (/^Digit[1-5]$/.test(event.code)) cast(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyT' && encounter) { const living = state.enemies.map((enemy, index) => enemy.hp > 0 ? index : -1).filter(index => index >= 0); state.target = living[(living.indexOf(state.target) + 1) % living.length] ?? 0; }
});
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
renderer.domElement.addEventListener('mousedown', event => { if (document.pointerLockElement !== renderer.domElement) return; if (event.button === 0) strike(); if (event.button === 2) guard(); });
document.addEventListener('visibilitychange', () => { previousTime = performance.now(); player.keys = {}; });

function animate(now) {
  if (now - previousTime < 1000 / 60) return;
  const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
  if (started && !['dead', 'won'].includes(state.phase)) {
    elapsed += dt;
    const result = tickCombatResources(state, dt); if (result.forged) forgeComplete(result.forged);
    player.update(dt);
    if (state.phase === 'explore' && roomAt(camera.position) === state.floor - 1) {
      const area = AREAS[state.floor - 1];
      if (Math.abs(camera.position.x - area.x) < area.size / 2 - 3.5 && Math.abs(camera.position.z - area.z) < area.size / 2 - 3.5) enterBattle(state.floor - 1);
    }
    encounter?.update(dt, camera.position); phaseTransitions();
  } else if (freeRoam) player.update(dt);
  world.update(dt, elapsed, camera.position, reducedMotion);
  dangerFade = Math.max(0, dangerFade - dt); $('#vignette').style.opacity = String(dangerFade * 2);
  $('#channel-banner').hidden = !state.forge;
  if (state.forge) { $('#channel-copy').textContent = `Folding ${getCard(state.forge.output).name} · ${state.forge.remaining.toFixed(1)}s`; $('#channel-fill').style.width = `${(1 - state.forge.remaining / state.forge.duration) * 100}%`; }
  uiTime += dt;
  if (uiTime >= 0.09) { uiTime = 0; if (started) renderHud(); encounter?.projectLabels(camera, innerWidth, innerHeight); }
  renderer.render(scene, camera);
}

renderCharacters(); renderModeChoices(); renderHud(true); openDialog('#intro'); renderer.setAnimationLoop(animate);
if (import.meta.env.DEV) window.__foldDebug = () => ({ phase: state.phase, area: roomAt(camera.position), targetArea: state.floor - 1, position: camera.position.toArray(), hp: state.hp, character: state.characterId, forge: state.forge ? { ...state.forge } : null, time: state.time, cleared: [...cleared], lockedGates: [...world.locked], enemies: state.enemies.map((enemy, index) => ({ ...enemy, position: encounter?.actors[index]?.position.toArray(), intent: encounter?.actors[index]?.phase, intentRemaining: encounter?.actors[index]?.remaining })), inventory: [...state.inventory], inventoryIds: [...state.inventoryCopyIds], corruption: state.corruption, energy: state.energy, draw: state.draw.length, hand: [...state.hand], renderer: renderer.getSize(new THREE.Vector2()).toArray(), drawCalls: renderer.info.render.calls });
