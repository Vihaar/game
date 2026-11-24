import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Texture, TextureLoader } from 'three';
import { GuidedDiorama } from '../src/diorama.js';
import { atlasRegion, sceneBackdrop } from '../src/diorama-scenes.mjs';

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
    const definitions = [{ id: 'a', type: 'inkling', hp: 10 }, { id: 'b', type: 'warden', hp: 10 }];
    diorama.setEnemies(definitions).setTarget(1);
    // A rectangular 3x2 sheet must not stretch a 300x200 cell into a square.
    assert.equal(diorama.actors[0].sprite.scale.x, 1.5);
    const liveMesh = diorama.actors[1].sprite;
    diorama.setEnemies([{ ...definitions[0], hp: 0 }, definitions[1]]);
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
    diorama.update(0.3, 0.6); assert.equal(diorama.areaIndex, 4);
    diorama.update(0.6, 1.2); assert.equal(await travel, true);
    assert.ok(camera.position.equals(stableCamera), 'chapter travel dissolves instead of moving the camera');
    assert.equal(diorama.opacity, 1);
    assert.equal(await diorama.travelTo(7, { reducedMotion: true }), true);
    diorama.setEnemies(definitions); diorama.update(0.1, 10, { reducedMotion: true });
    assert.equal(diorama.actors[0].group.position.y, diorama.actors[0].baseY);
    assert.equal(diorama.actors[0].group.rotation.z, 0);
    camera.aspect = 0.56; diorama.update(0.1, 11, { reducedMotion: true });
    assert.ok(camera.position.z > stableCamera.z, 'portrait framing fits the encounter width');
    assert.ok(requests.some(url => url.endsWith('theater.webp')));
    diorama.dispose();
    assert.equal(await diorama.travelTo(0), false);
  } finally { diorama?.dispose(); TextureLoader.prototype.load = originalLoad; }
});
