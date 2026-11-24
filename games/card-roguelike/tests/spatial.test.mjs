import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { AREAS, roomAt, enemyDefinitions } from '../src/areas.mjs';
import { lockedTell, tellHits, segmentHits, segmentUnobstructed, moveCapsule } from '../src/spatial.mjs';
import { LibraryWorld } from '../src/world.js';

test('attack windups keep their original aim and damage stays within the drawn footprint', () => {
  const actor = { x: 0, z: 0 }, target = { x: 0, z: -3 };
  const tell = lockedTell(actor, target, 'strike', 1.5, 3);
  actor.x = 20; target.z = 20;
  assert.deepEqual(tell.origin, { x: 0, z: 0 });
  assert.deepEqual(tell.target, { x: 0, z: -3 });
  assert.equal(tellHits(tell, { x: 1.499, z: -3 }), true);
  assert.equal(tellHits(tell, { x: 1.501, z: -3 }), false);
  const ring = lockedTell({ x: 0, z: 0 }, target, 'ring', 4, 4);
  assert.equal(tellHits(ring, { x: 4.001, z: 0 }), false);
  const cleave = lockedTell({ x: 0, z: 0 }, { x: 0, z: -3 }, 'cleave', 3, 3.4);
  assert.equal(tellHits(cleave, { x: 0, z: -3.399 }), true);
  assert.equal(tellHits(cleave, { x: 0, z: -3.401 }), false);
  assert.equal(tellHits(cleave, { x: 0, z: 1 }), false);
  assert.equal(tellHits(cleave, { x: Math.sin(0.751) * 2, z: -Math.cos(0.751) * 2 }), false);
});

test('fast projectiles sweep the whole step instead of skipping over the player', () => {
  assert.equal(segmentHits({ x: 0, z: 0 }, { x: -2, z: 0 }, { x: 2, z: 0 }, 0.55), true);
  assert.equal(segmentHits({ x: 0, z: 0.551 }, { x: -2, z: 0 }, { x: 2, z: 0 }, 0.55), false);
  assert.equal(segmentHits({ x: 2.6, z: 0 }, { x: -2, z: 0 }, { x: 2, z: 0 }, 0.55), false);
  assert.equal(segmentHits({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, 0.55), true);
});

test('projectile wall checks reject even a step ending just inside a real Octree wall', () => {
  const group = new Group();
  group.add(new Mesh(new BoxGeometry(0.4, 3, 6), new MeshBasicMaterial()));
  group.position.y = 1.5;
  group.updateMatrixWorld(true);
  const tree = new Octree().fromGraphNode(group);
  assert.equal(segmentUnobstructed({ x: -1, y: 1, z: 0 }, { x: -0.201, y: 1, z: 0 }, [tree]), true);
  assert.equal(segmentUnobstructed({ x: -1, y: 1, z: 0 }, { x: -0.15, y: 1, z: 0 }, [tree]), false);
  assert.equal(segmentUnobstructed({ x: -0.203, y: 1, z: 0 }, { x: -0.197, y: 1, z: 0 }, [tree]), false);
  assert.equal(segmentUnobstructed({ x: -1, y: 1, z: 4 }, { x: 1, y: 1, z: 4 }, [tree]), true);
  group.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
});

test('all eight areas have unique encounters and all seven gates really block then reopen', () => {
  // The world builds its actual production colliders; only cosmetic canvas drawing is stubbed.
  const previousDocument = globalThis.document;
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  let world;
  try { world = new LibraryWorld(new Scene()); }
  finally { globalThis.document = previousDocument; }
  assert.equal(AREAS.length, 8);
  assert.equal(world.gates.length, 7);
  assert.equal(world.locked.size, 7);
  const ids = new Set();
  AREAS.forEach((area, index) => {
    assert.equal(roomAt(area), index);
    for (const enemy of enemyDefinitions(index, () => 0.5)) {
      assert.equal(ids.has(enemy.id), false); ids.add(enemy.id);
      assert.equal(roomAt({ x: enemy.spawnX, z: enemy.spawnZ }), index);
      assert.ok(enemy.hp > 0 && enemy.damage > 0);
    }
  });
  const walkGate = (index, reverse = false) => {
    const gate = world.gates[index], a = AREAS[index], b = AREAS[index + 1];
    const direction = new Vector3(Math.sign(b.x - a.x), 0, Math.sign(b.z - a.z)).multiplyScalar(reverse ? -1 : 1);
    const start = new Vector3(gate.x, 0.35, gate.z).addScaledVector(direction, -1.4);
    const capsule = new Capsule(start, start.clone().add(new Vector3(0, 1.25, 0)), 0.35);
    for (let step = 0; step < 40; step++) moveCapsule(capsule, direction.clone().multiplyScalar(0.08), world.collisionTrees);
    return new Vector3(capsule.start.x - gate.x, 0, capsule.start.z - gate.z).dot(direction);
  };
  for (let index = 0; index < world.gates.length; index++) {
    assert.ok(walkGate(index) < -0.5, `gate ${index} blocks forward movement`);
    assert.ok(walkGate(index, true) < -0.5, `gate ${index} blocks backward movement`);
    const previousTree = world.gateOctree;
    world.unlock(index);
    assert.notEqual(world.gateOctree, previousTree, 'collision getter must use rebuilt gate octree');
    assert.equal(world.gates[index].mesh.visible, false);
    assert.ok(walkGate(index) > 1, `gate ${index} permits forward movement after unlock`);
    assert.ok(walkGate(index, true) > 1, `gate ${index} permits backtracking after unlock`);
    for (let future = index + 1; future < world.gates.length; future++) assert.equal(world.locked.has(future), true);
  }
  world.reset();
  assert.equal(world.locked.size, 7);
  assert.ok(walkGate(0) < -0.5, 'restart restores the first gate collider');
  world.group.traverse(node => {
    node.geometry?.dispose();
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose();
  });
});
