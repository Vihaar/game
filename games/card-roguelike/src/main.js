import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Player } from './player.js';
import { CARDS, RECIPES, newRun, recipeFor, craft, startBattle, castCard, endTurn, takeReward, shuffle } from './rules.mjs';
import './style.css';

const $ = selector => document.querySelector(selector);
const worldElement = $('#world');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let state = newRun();
let started = false;
let selected = [];
let rewardOptions = [];
let messageTimer;
let seed;
let random;
let previousTime = performance.now();
let elapsed = 0;
let pulse = 0;
let lastEffect = null;
const enemyViews = [];
const floorNames = ['The loose leaf', 'The crossed-out chapter', 'The last binding'];
const floorDescriptions = ['The ink is still wet. Make something of it.', 'A stronger spell needs a smaller deck.', 'The Unbinder has something of yours.'];

function seededRandom(value) {
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8daac5);
scene.fog = new THREE.Fog(0x8daac5, 14, 34);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 65);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  worldElement.innerHTML = '<p class="webgl-error">WebGL could not start. Enable hardware acceleration or try another desktop browser.</p>';
  $('#start-button').disabled = true;
  $('#start-button').textContent = 'WebGL is required';
  throw new Error('WebGL is unavailable. See the on-screen browser instructions.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
worldElement.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9e9ff, 0x354064, 3));
const keyLight = new THREE.DirectionalLight(0xffddb5, 3);
keyLight.position.set(-4, 9, 5);
scene.add(keyLight);
const magicalLight = new THREE.PointLight(0xc4a7ff, 50, 18, 2);
magicalLight.position.set(0, 3, -8);
scene.add(magicalLight);
const spellLight = new THREE.PointLight(0xffba7b, 0, 14, 2);
scene.add(spellLight);

function paperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#72778e'; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#5e647e'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#83889e' : '#626a86'; ctx.fillRect(14, 16 + i * 11, 70 + (i % 3) * 12, 2); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 7);
  return texture;
}

const staticWorld = new THREE.Group();
scene.add(staticWorld);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x7185a6, roughness: 0.95 });
const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xa2acc0, roughness: 0.9 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x384665, roughness: 0.8 });
const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xe0bb86, metalness: 0.5, roughness: 0.5 });
function box(w, h, d, x, y, z, material, parent = staticWorld) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

box(16, 0.4, 28, 0, -0.2, 0, new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 1 }));
box(0.6, 5.4, 28, -8, 2.5, 0, wallMaterial);
box(0.6, 5.4, 28, 8, 2.5, 0, wallMaterial);
box(16, 5.4, 0.6, 0, 2.5, -14, wallMaterial);
box(16, 5.4, 0.6, 0, 2.5, 14, wallMaterial);
for (const x of [-6.5, 6.5]) for (const z of [-9, -2, 5, 12]) {
  box(0.8, 5.5, 0.8, x, 2.6, z, stoneMaterial);
  box(1.2, 0.2, 1.2, x, 0.1, z, darkMaterial);
  box(1.3, 0.2, 1.3, x, 4.8, z, goldMaterial);
}
// Bookshelves are original geometry/content; FPS collisions come from the reused Octree.
for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
  const z = 7 - row * 7;
  box(0.8, 3.8, 4.6, side * 7.25, 2.1, z, darkMaterial);
  for (let shelf = 0; shelf < 4; shelf++) {
    box(1, 0.1, 4.5, side * 7, 0.7 + shelf * 0.9, z, goldMaterial);
    for (let book = 0; book < 8; book++) {
      const colors = [0xa59cc5, 0xc7ad8f, 0x8cabb7, 0x6f809d];
      box(0.7, 0.5 + (book % 3) * 0.1, 0.35, side * 6.95, 1.0 + shelf * 0.9, z - 1.8 + book * 0.5, new THREE.MeshStandardMaterial({ color: colors[(book + shelf) % colors.length] }));
    }
  }
}

const portalGroup = new THREE.Group();
scene.add(portalGroup);
box(0.55, 4.5, 0.6, -2.5, 2.25, -11.5, stoneMaterial);
box(0.55, 4.5, 0.6, 2.5, 2.25, -11.5, stoneMaterial);
box(5.6, 0.55, 0.6, 0, 4.5, -11.5, goldMaterial);
const portal = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.3), new THREE.MeshBasicMaterial({ color: 0xb6a0e8, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
portal.position.set(0, 2.1, -11.4); portalGroup.add(portal);
for (let i = 0; i < 5; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + i * 0.12, 0.015, 4, 6), new THREE.MeshBasicMaterial({ color: 0xe6d0a4, transparent: true, opacity: 0.3 }));
  ring.position.set(0, 2.15, -11.3 + i * 0.03); ring.rotation.z = i * 0.16; portalGroup.add(ring);
}

const forgeMesh = new THREE.Group();
forgeMesh.position.set(-3.8, 1.0, 4);
box(1.2, 0.3, 1.2, 0, 0, 0, darkMaterial, forgeMesh);
const floatingPage = new THREE.Mesh(new THREE.OctahedronGeometry(0.48), new THREE.MeshStandardMaterial({ color: 0xf5c48a, emissive: 0x7c3f2a, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.3 }));
floatingPage.position.y = 0.9; forgeMesh.add(floatingPage); scene.add(forgeMesh);
const worldOctree = new Octree();
staticWorld.updateMatrixWorld(true);
worldOctree.fromGraphNode(staticWorld);
const player = new Player(camera, worldOctree, renderer.domElement, () => started && state.phase === 'explore' && !$('dialog[open]'));
player.reset();

function makeEnemy(index) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: index ? 0x8b8fc0 : 0xbaa3c7, roughness: 0.5, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(index ? 0.65 : 0.78, 0), bodyMat);
  body.scale.y = 1.4;
  group.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0xf9d493 }));
  face.position.set(0, 0.15, 0.57); group.add(face);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xe8d7b9, roughness: 1 }));
    wing.position.set(side * 0.6, -0.35, 0.2); wing.rotation.z = side * 0.3; group.add(wing);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 5, 48), new THREE.MeshBasicMaterial({ color: 0xffd18c }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.2; group.add(ring);
  group.position.set(index ? 2.2 : -2.2, 1.7, index ? -7.2 : -6.2);
  group.traverse(child => { child.userData.enemyIndex = index; });
  scene.add(group);
  return { group, body, ring, baseY: 1.7, material: bodyMat };
}
enemyViews.push(makeEnemy(0), makeEnemy(1));

function say(message) {
  $('#message').textContent = message;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { $('#message').textContent = ''; }, 5000);
}

function openDialog(selector) {
  if (document.pointerLockElement) document.exitPointerLock();
  player.keys = {};
  $(selector).showModal();
}

function cardMarkup(key, index, mode = 'hand') {
  const card = CARDS[key];
  const selectedClass = mode === 'inventory' && selected.includes(index) ? ' selected' : '';
  const disabled = mode === 'hand' && card.cost > state.energy;
  const action = mode === 'hand' ? `Costs ${card.cost} ink.` : mode === 'inventory' ? 'Select for forging.' : 'Add this card to your deck.';
  return `<button type="button" class="card ${card.kind}${card.fused ? ' fused' : ''}${selectedClass}" data-index="${index}" ${disabled ? 'disabled' : ''} ${mode === 'inventory' ? `aria-pressed="${selected.includes(index)}"` : ''} aria-label="${card.name}. ${card.text} ${action}"><span class="card-top"><span>${card.fused ? 'FUSED SPELL' : 'ELEMENT'}</span><span class="cost">${card.cost}</span></span><span class="card-glyph" aria-hidden="true">${card.glyph}</span><strong>${card.name}</strong><span class="card-text">${card.text}</span>${mode === 'hand' ? `<kbd>${index + 1}</kbd>` : ''}</button>`;
}

function render() {
  $('#stats').innerHTML = `<span class="health">♥ <b>${state.hp}</b><span> / ${state.maxHp}</span></span><span class="chamber-stat">Chamber <b>${state.floor}</b> / 3</span>`;
  $('#chapter-label').textContent = `CHAMBER ${state.floor} / 3`;
  $('#chapter-title').textContent = floorNames[state.floor - 1];
  $('#objective').textContent = state.phase === 'explore' ? 'Forge a spell, then walk toward the wardens.' : state.phase === 'battle' ? 'Choose a target. Spend your ink. Survive their reply.' : 'A little less lost.';
  $('#combat').hidden = state.phase !== 'battle';
  $('#explore-controls').hidden = state.phase !== 'explore';
  $('#crosshair').hidden = state.phase !== 'explore';
  $('#targets').hidden = state.phase !== 'battle';
  $('#targets').innerHTML = state.enemies.map((enemy, i) => `<button class="enemy-target${state.target === i ? ' targeted' : ''}" data-target="${i}" ${enemy.hp <= 0 ? 'disabled' : ''}><span>${enemy.name}</span><strong>${enemy.hp > 0 ? `${enemy.hp} / ${enemy.maxHp}` : 'Unbound'}</strong><small>${enemy.hp > 0 ? `Next turn: ${enemy.damage} damage` : 'No attack'}</small></button>`).join('');
  $('#energy').innerHTML = `<strong>${'◆'.repeat(state.energy)}${'◇'.repeat(3 - state.energy)}</strong> ${state.energy} ink <span class="block">${state.block ? `· ${state.block} block` : ''}</span>`;
  $('#deck-count').textContent = `${state.draw.length} draw · ${state.discard.length} discard · turn ${state.turn}`;
  $('#hand').innerHTML = state.hand.map((key, index) => cardMarkup(key, index)).join('');
  enemyViews.forEach((view, index) => {
    const enemy = state.enemies[index];
    view.group.visible = state.phase === 'explore' || Boolean(enemy && enemy.hp > 0);
    view.ring.visible = state.phase === 'battle' && state.target === index;
    const scale = state.floor === 3 && index === 0 ? 1.35 : 1;
    view.group.scale.setScalar(scale);
  });
}

function prepareFloor() {
  player.reset();
  state.enemies = [];
  state.hand = [];
  magicalLight.color.setHex([0xc4a7ff, 0x91d3d0, 0xf6b296][state.floor - 1]);
  portal.material.color.copy(magicalLight.color);
  render();
  say(floorDescriptions[state.floor - 1]);
}

function beginRun() {
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  state = newRun();
  const requestedSeed = new URLSearchParams(location.search).get('seed');
  seed = requestedSeed !== null && Number.isFinite(Number(requestedSeed)) ? Number(requestedSeed) >>> 0 : Math.floor(Math.random() * 1e9);
  random = seededRandom(seed);
  started = true;
  selected = [];
  elapsed = 0;
  prepareFloor();
  say('Try the forge first: Ember + Ember makes Flare. Then walk forward.');
}

function enterBattle() {
  if (!startBattle(state, random)) return;
  if (document.pointerLockElement) document.exitPointerLock();
  player.velocity.set(0, 0, 0);
  camera.lookAt(0, 1.7, -6.5);
  render();
  say('Movement pauses for battle. Play cards, then end your turn. Q / E chooses a target.');
}

function showEnding() {
  const won = state.phase === 'won';
  $('#ending-label').textContent = won ? 'THE BINDING BREAKS' : 'ANOTHER LOOSE LEAF';
  $('#ending-title').textContent = won ? 'You wrote your way out.' : 'The library keeps your place.';
  $('#ending-copy').textContent = `${won ? 'Three chambers unbound.' : `Your run ended in chamber ${state.floor}.`} ${state.merges} spells forged. ${state.casts} cards cast. ${Math.floor(elapsed / 60)}m ${Math.floor(elapsed % 60)}s. Run seed: ${seed}.`;
  openDialog('#ending');
}

function showReward() {
  rewardOptions = shuffle(['ember', 'stone', 'dew', 'gust'], random).slice(0, 3);
  $('#reward-title').textContent = state.floor === 3 ? 'The last page is yours.' : 'The room exhales.';
  $('#reward-copy').textContent = state.floor === 3 ? 'Take one last card. The binding is broken.' : 'Choose a card for your deck. Recover 4 health, then visit the forge before the next encounter.';
  $('#reward-choices').innerHTML = rewardOptions.map((key, index) => cardMarkup(key, index, 'reward')).join('');
  openDialog('#reward');
}

function cast(index) {
  if ($('dialog[open]')) return;
  const result = castCard(state, index, state.target, random);
  if (!result.ok) { say(result.reason); return; }
  const definition = CARDS[result.card];
  lastEffect = { start: performance.now(), color: new THREE.Color({ ember: 0xf7a66f, stone: 0xe9d2a6, dew: 0xa6e6d3, gust: 0xc2b5ff }[definition.kind]) };
  pulse = 1;
  say(`${definition.name}. ${definition.text}`);
  render();
  if (state.phase === 'reward') showReward();
}

function finishTurn() {
  if ($('dialog[open]')) return;
  const result = endTurn(state, random);
  if (!result) return;
  say(result.damage ? `The wardens deal ${result.damage} damage.${result.absorbed ? ` Your block stopped ${result.absorbed}.` : ''}` : `Your block stopped all ${result.absorbed} damage.`);
  document.body.classList.remove('damage');
  if (result.damage) { document.body.classList.add('damage'); setTimeout(() => document.body.classList.remove('damage'), 240); }
  render();
  if (state.phase === 'dead') showEnding();
}

function renderForge() {
  $('#inventory-count').textContent = `(${state.inventory.length} cards)`;
  $('#inventory').innerHTML = state.inventory.map((key, index) => cardMarkup(key, index, 'inventory')).join('');
  const first = selected.length > 0 ? state.inventory[selected[0]] : null;
  const second = selected.length > 1 ? state.inventory[selected[1]] : null;
  const output = first && second ? recipeFor(first, second) : null;
  const describe = key => key ? `<span class="fusion-tile ${CARDS[key].kind}"><b>${CARDS[key].glyph}</b><strong>${CARDS[key].name}</strong></span>` : '<span class="fusion-tile empty">Choose a card</span>';
  $('#fusion-preview').innerHTML = `${describe(first)}<span>+</span>${describe(second)}<span>=</span>${output ? describe(output) : '<span class="fusion-tile empty">' + (first && second ? 'No known recipe' : 'A new spell') + '</span>'}`;
  $('#merge-button').disabled = !output;
  $('#merge-button').textContent = output ? `Consume ${CARDS[first].name} + ${CARDS[second].name} · forge ${CARDS[output].name}` : first && second ? 'These cards do not combine' : 'Choose two cards';
  $('#recipes').innerHTML = RECIPES.map(({ inputs, output: key }) => `<p>${CARDS[inputs[0]].name} + ${CARDS[inputs[1]].name} = <strong>${CARDS[key].name}</strong><small>${CARDS[key].text}</small></p>`).join('');
}

function openForge() {
  if (!started || state.phase !== 'explore' || $('dialog[open]')) return;
  selected = [];
  renderForge();
  openDialog('#forge');
}

$('#start-button').addEventListener('click', beginRun);
$('#restart-button').addEventListener('click', beginRun);
$('#forge-button').addEventListener('click', openForge);
$('#close-forge').addEventListener('click', () => $('#forge').close());
$('#help-button').addEventListener('click', () => { if (!$('dialog[open]')) openDialog('#help'); });
$('#close-help').addEventListener('click', () => $('#help').close());
$('#end-turn').addEventListener('click', finishTurn);
$('#hand').addEventListener('click', event => { const button = event.target.closest('[data-index]'); if (button) cast(Number(button.dataset.index)); });
$('#targets').addEventListener('click', event => { const button = event.target.closest('[data-target]'); if (button) { state.target = Number(button.dataset.target); render(); } });
$('#inventory').addEventListener('click', event => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (selected.includes(index)) selected = selected.filter(value => value !== index);
  else if (selected.length < 2) selected.push(index);
  else selected = [selected[1], index];
  renderForge();
});
$('#merge-button').addEventListener('click', () => {
  if (selected.length !== 2) return;
  const output = craft(state, selected[0], selected[1]);
  if (!output) return;
  selected = [];
  renderForge();
  say(`${CARDS[output].name} forged. Both input cards are gone; the new spell is in your deck.`);
});
$('#reward-choices').addEventListener('click', event => {
  const button = event.target.closest('[data-index]');
  if (!button || !takeReward(state, rewardOptions[Number(button.dataset.index)])) return;
  $('#reward').close();
  if (state.phase === 'won') { render(); showEnding(); }
  else prepareFloor();
});

for (const selector of ['#intro', '#reward', '#ending']) $(selector).addEventListener('cancel', event => event.preventDefault());
document.addEventListener('keydown', event => {
  if (event.repeat || $('dialog[open]') || !started) return;
  if (event.code === 'KeyF') openForge();
  if (state.phase === 'battle') {
    // Enter is always end-turn, including when a card/button holds focus.
    // Cancel its native click so a keyboard turn cannot fire twice.
    if (/^Digit[1-5]$/.test(event.code) || ['Enter', 'KeyQ', 'KeyE'].includes(event.code)) event.preventDefault();
    if (/^Digit[1-5]$/.test(event.code)) cast(Number(event.code.slice(-1)) - 1);
    if (event.code === 'Enter') finishTurn();
    if (event.code === 'KeyQ' || event.code === 'KeyE') {
      const living = state.enemies.map((enemy, index) => enemy.hp > 0 ? index : -1).filter(index => index >= 0);
      state.target = living[(living.indexOf(state.target) + 1) % living.length];
      render();
    }
  }
});
const raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('click', event => {
  if (state.phase !== 'battle' || $('dialog[open]')) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
  const hit = raycaster.intersectObjects(enemyViews.filter(view => view.group.visible).map(view => view.group), true)[0];
  if (hit) { state.target = hit.object.userData.enemyIndex; render(); }
});
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function animate(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!document.hidden && started && !['won', 'dead'].includes(state.phase) && !$('dialog[open]')) elapsed += delta;
  player.update(delta);
  if (started && state.phase === 'explore' && camera.position.z < 0 && !$('dialog[open]')) enterBattle();
  const animationTime = time / 1000;
  if (!reducedMotion) {
    floatingPage.rotation.y += delta * 0.6;
    floatingPage.position.y = 0.9 + Math.sin(animationTime * 1.3) * 0.08;
    enemyViews.forEach((view, index) => { view.group.position.y = view.baseY + Math.sin(animationTime * 1.4 + index * 2) * 0.12; view.body.rotation.y += delta * 0.2; });
    portal.material.opacity = 0.2 + Math.sin(animationTime * 0.7) * 0.04;
  }
  if (lastEffect) {
    pulse = Math.max(0, 1 - (time - lastEffect.start) / 500);
    spellLight.position.copy(camera.position).add(new THREE.Vector3(0, 0, -2));
    spellLight.color.copy(lastEffect.color);
    spellLight.intensity = reducedMotion ? 0 : pulse * 35;
    if (pulse === 0) lastEffect = null;
  }
  renderer.render(scene, camera);
}
render();
openDialog('#intro');
renderer.setAnimationLoop(animate);

// Read-only development snapshot; stripped from production builds by Vite.
if (import.meta.env.DEV) window.__foldDebug = () => ({
  phase: state.phase, camera: camera.position.toArray(), velocity: player.velocity.toArray(),
  keys: { ...player.keys }, onFloor: player.onFloor, started,
});
