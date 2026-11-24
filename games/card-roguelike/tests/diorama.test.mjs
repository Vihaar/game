import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Texture, TextureLoader, Vector3 } from 'three';
import { GuidedDiorama } from '../src/diorama.js';
import { atlasRegion, sceneBackdrop, ENEMY_ATLAS } from '../src/diorama-scenes.mjs';

test('atlas crops remain inside their own cells and top-row images use top-row UVs', () => {
  for (let index = 0; index < 6; index++) {
    const region = atlasRegion(index, 3, 2);
    const column = index % 3, rowFromBottom = 1 - Math.floor(index / 3);
    assert.ok(region.offset[0] > column / 3);
    assert.ok(region.offset[0] + region.repeat[0] < (column + 1) / 3);
    assert.ok(region.offset[1] > rowFromBottom / 2);
    assert.ok(region.offset[1] + region.repeat[1] < (rowFromBottom + 1) / 2);
  }
  assert.equal(sceneBackdrop(0, 'popup'), 'popup.webp');
  assert.equal(sceneBackdrop(7, 'storybook', { storybook: { binding: 'unfolded-cosmos.webp' } }), 'unfolded-cosmos.webp');
  const inkling = atlasRegion(0, 3, 2, 0.004, ENEMY_ATLAS.regions.inkling);
  const scribe = atlasRegion(3, 3, 2, 0.004, ENEMY_ATLAS.regions.scribe);
  assert.ok(inkling.offset[1] > 1 - 468 / 1024, 'top-row crop excludes the neighbouring quill tip');
  assert.ok(scribe.offset[1] + scribe.repeat[1] < 1 - 468 / 1024, 'bottom row includes the quill without overlapping the top row');
});

test('guided travel and art swaps preserve calm framing and current enemy state', async () => {
  const originalLoad = TextureLoader.prototype.load;
  const requests = [];
  TextureLoader.prototype.load = function (url, onLoad) {
    requests.push(url);
    const texture = new Texture({ width: url.includes('enemy-atlas') ? 900 : 1600, height: url.includes('enemy-atlas') ? 400 : 900 });
    queueMicrotask(() => onLoad(texture)); return texture;
  };
  let diorama;
  try {
    const camera = new PerspectiveCamera(68, 16 / 9, 0.1, 70);
    const renderer = { domElement: { addEventListener() {}, removeEventListener() {} }, capabilities: { getMaxAnisotropy: () => 1 } };
    diorama = new GuidedDiorama(new Scene(), camera, renderer);
    await diorama.ready;
    for (const [name, ceiling] of [['paper-ground-contact', 0.12], ['paper-path-contact', 0.06]]) {
      const surface = diorama.paperWorld.group.getObjectByName(name);
      assert.ok(surface.material.every(material => material.opacity <= ceiling && material.depthWrite === false), 'physical floor must reveal the illustrated floor');
      const alpha = surface.geometry.attributes.color;
      assert.equal(alpha.itemSize, 4);
      assert.ok(Array.from({ length: alpha.count }, (_, i) => alpha.getW(i)).some(value => value === 0), 'floor contact fades completely at the horizon');
    }
    const definitions = [{ id: 'a', type: 'inkling', hp: 10 }, { id: 'b', type: 'warden', hp: 10 }];
    diorama.setEnemies(definitions).setTarget(1);
    // A rectangular 3x2 sheet must not stretch a 300x200 cell into a square.
    assert.equal(diorama.actors[0].sprite.scale.x, (900 / 3) / (400 * 468 / 1024));
    const liveMesh = diorama.actors[1].sprite;
    const beforeDefeat = camera.position.clone();
    diorama.setEnemies([{ ...definitions[0], hp: 0 }, definitions[1]]);
    assert.equal(diorama.getEnemyAnchor(0), null, 'a folding defeated sprite is immediately untargetable');
    diorama.update(0.16, 0.16);
    assert.equal(diorama.actors[0].group.visible, true);
    assert.ok(diorama.actors[0].group.scale.y < diorama.actors[0].baseScale);
    assert.ok(camera.position.equals(beforeDefeat), 'defeats never move the battle camera');
    diorama.update(0.2, 0.36);
    assert.equal(diorama.actors[0].group.visible, false);
    assert.equal(diorama.actors[1].sprite, liveMesh);
    await diorama.setStyle('theater');
    assert.equal(diorama.actors[0].group.visible, false, 'art changes cannot resurrect an enemy');
    assert.equal(diorama.selected, 1);
    assert.equal(diorama.actors[1].ring.visible, true);
    assert.equal(await diorama.setStyle('unknown'), false);
    const stableCamera = camera.position.clone();
    const travel = diorama.travelTo(4);
    await new Promise(resolve => setImmediate(resolve));
    diorama.update(0.3, 0.3); assert.equal(diorama.areaIndex, 0);
    assert.equal(camera.position.equals(stableCamera), false, 'guided travel makes a finite dolly');
    diorama.update(0.5, 0.8); assert.equal(diorama.areaIndex, 4);
    diorama.update(0.8, 1.6); assert.equal(await travel, true);
    assert.ok(camera.position.equals(stableCamera), 'chapter travel settles exactly at the stable battle camera');
    assert.equal(diorama.opacity, 1);
    const interrupted = diorama.travelTo(5);
    await new Promise(resolve => setImmediate(resolve));
    diorama.update(0.2, 1.8); diorama.setArea(0);
    assert.equal(await interrupted, false, 'external area reset resolves the old route instead of hanging');
    diorama.update(3, 4.8); assert.equal(diorama.areaIndex, 0, 'a stale route cannot jump to a later chapter after reset');
    const interruptedLoad = diorama.travelTo(6); diorama.setArea(0);
    assert.equal(await interruptedLoad, false, 'a route cancelled while assets load cannot start later');
    assert.equal(await diorama.travelTo(7, { reducedMotion: true }), true);
    const readAnchor = diorama.getWorldAnchor('read'); assert.ok(readAnchor?.isVector3);
    assert.equal(diorama.getWorldAnchor('unknown'), null);
    const focused = diorama.focusWorld('read'); diorama.update(0.7, 2.3);
    assert.equal(await focused, true);
    assert.equal(camera.position.equals(stableCamera), false);
    const heldCamera = camera.position.clone(); diorama.update(2, 4.3);
    assert.ok(camera.position.equals(heldCamera), 'focused camera stops instead of drifting');
    diorama.setWorldVisible(false); assert.equal(diorama.getWorldAnchor('read'), null);
    assert.ok(camera.position.equals(stableCamera), 'closing an exploration view restores battle framing');
    assert.equal(await diorama.focusWorld('forge'), false);
    diorama.setWorldVisible(true);
    assert.equal(await diorama.focusWorld('binding', { reducedMotion: true }), true);
    diorama.setEnemies(definitions); diorama.update(0.1, 10, { reducedMotion: true });
    assert.equal(await diorama.focusWorld('read'), false, 'living encounters cannot move the battle camera');
    assert.equal(diorama.actors[0].group.position.y, diorama.actors[0].baseY);
    assert.equal(diorama.actors[0].group.rotation.z, 0);
    camera.aspect = 0.56; diorama.update(0.1, 11, { reducedMotion: true });
    assert.ok(camera.position.z > stableCamera.z, 'portrait framing fits the encounter width');
    diorama.setEnemies(Array.from({ length: 4 }, (_, index) => ({ id: String(index), type: 'inkling', hp: 10 })));
    diorama.group.updateMatrixWorld(true);
    for (const actor of diorama.actors) for (const side of [-1, 1]) {
      const edge = actor.sprite.localToWorld(new Vector3(side * 1.75, 0, 0)).project(camera);
      assert.ok(Math.abs(edge.x) < 1, 'all four portrait enemy planes fit inside the view');
    }
    assert.ok(requests.some(url => url.endsWith('theater.webp')));
    diorama.dispose();
    assert.equal(await diorama.travelTo(0), false);
  } finally { diorama?.dispose(); TextureLoader.prototype.load = originalLoad; }
});
