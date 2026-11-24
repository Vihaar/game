import test from 'node:test';
import assert from 'node:assert/strict';
import { DIORAMA_SCENES, sceneBackdrop, sceneBackdropRegion } from '../src/diorama-scenes.mjs';

test('every chapter has distinct storybook scenery without sampling adjacent atlas panels', () => {
  const views = new Set();
  for (let index = 0; index < DIORAMA_SCENES.length; index++) {
    const file = sceneBackdrop(index);
    const region = sceneBackdropRegion(index);
    views.add(JSON.stringify([file, region]));
    if (!region) continue;
    for (let axis = 0; axis < 2; axis++) {
      const start = region.offset[axis], end = start + region.repeat[axis];
      assert.ok(start > 0 && end < 1);
      assert.equal(Math.floor(start * 2), Math.floor(end * 2), 'UVs remain within one panel');
    }
    assert.deepEqual(region.sourceSize, [0.5, 0.5]);
  }
  assert.equal(views.size, 8);
  assert.equal(sceneBackdrop(0), 'storybook.webp');
  assert.equal(sceneBackdropRegion(0), null);
  assert.ok(sceneBackdropRegion(1).offset[1] > sceneBackdropRegion(3).offset[1], 'top row appears upright');
});

test('single-image overrides and archived art directions are never cropped as chapter atlases', () => {
  const overrides = { storybook: { mycelium: 'custom-garden.webp' } };
  assert.equal(sceneBackdrop(1, 'storybook', overrides), 'custom-garden.webp');
  assert.equal(sceneBackdropRegion(1, 'storybook', overrides), null);
  assert.equal(sceneBackdropRegion(4, 'popup'), null);
  assert.equal(sceneBackdropRegion(7, 'theater'), null);
});
