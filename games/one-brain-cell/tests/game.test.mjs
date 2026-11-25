import test from "node:test";
import assert from "node:assert/strict";
import { DeliveryRun } from "../src/physics.js";
import {
  delivered,
  cleanInput,
  checkpoint,
  ROUND_SECONDS,
  HeldActions,
} from "../src/rules.js";
test("releasing one co-op pointer preserves other departments and a second finger on the same control", () => {
  const held = new HeldActions();
  held.hold(11, "right");
  held.hold(22, "tilt-left");
  held.hold(33, "right");
  held.release(11);
  assert.equal(held.has("right"), true);
  assert.equal(held.has("tilt-left"), true);
  held.release(22);
  assert.equal(held.has("right"), true);
  assert.equal(held.has("tilt-left"), false);
  held.clear();
  assert.equal(held.has("right"), false);
});
test("delivery requires complete sofa containment, not a corner touching the bay", () => {
  assert.equal(
    delivered({ min: { x: 2100, y: 600 }, max: { x: 2320, y: 650 } }),
    false,
  );
  assert.equal(
    delivered({ min: { x: 2170, y: 600 }, max: { x: 2390, y: 650 } }),
    true,
  );
});
test("solo legs plus AI arms/balance can cross all three physics obstacles and finish", () => {
  const run = new DeliveryRun();
  try {
    run.reset();
    for (let i = 0; i < 5401 && run.phase === "playing"; i++)
      run.step(1 / 60, { legs: { move: 1 } });
    assert.equal(run.phase, "won");
    assert.ok(run.elapsed < ROUND_SECONDS);
    assert.equal(run.rescues, 0);
  } finally {
    run.dispose();
  }
});
test("the shift actually expires and restart clears its time, velocity and result", () => {
  const run = new DeliveryRun();
  try {
    run.reset();
    for (let i = 0; i < 5401; i++) run.step(1 / 60, { legs: { move: 0 } });
    assert.equal(run.phase, "lost");
    run.reset();
    assert.equal(run.phase, "playing");
    assert.equal(run.elapsed, 0);
    assert.equal(run.rescues, 0);
    assert.equal(run.mike.velocity.x, 0);
  } finally {
    run.dispose();
  }
});
test("human arms can drop and regrab once per action; rescue costs time and preserves a reachable pose", () => {
  const run = new DeliveryRun();
  try {
    run.reset();
    run.step(1 / 60, { legs: { move: 0 }, arms: { grabSeq: 1 } });
    assert.equal(!!run.grip, false);
    run.step(1 / 60, { legs: { move: 0 }, arms: { grabSeq: 1 } });
    assert.equal(!!run.grip, false);
    run.step(1 / 60, { legs: { move: 0 }, arms: { grabSeq: 2 } });
    assert.equal(!!run.grip, true);
    const old = run.elapsed;
    run.rescue();
    assert.equal(run.elapsed, old + 5);
    assert.equal(run.rescues, 1);
    assert.ok(run.mike.position.x >= 120);
    assert.ok(run.sofa.position.x > run.mike.position.x);
  } finally {
    run.dispose();
  }
});
test("wire inputs and snapshots stay finite and bounded", () => {
  assert.deepEqual(
    cleanInput({ move: Infinity, tilt: -99, jumpSeq: NaN, grabSeq: Infinity }),
    { move: 1, tilt: -1, jumpSeq: 0, grabSeq: 1e8 },
  );
  assert.equal(checkpoint(-900), 120);
  assert.equal(checkpoint(1e8), 1900);
  const run = new DeliveryRun();
  try {
    assert.doesNotThrow(() => JSON.stringify(run.snapshot()));
    assert.ok(JSON.stringify(run.snapshot()).length < 1500);
  } finally {
    run.dispose();
  }
});
