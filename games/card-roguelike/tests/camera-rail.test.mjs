import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { CameraRail } from "../src/camera-rail.mjs";

test("a guided walk traverses the actual stair path and settles without idle drift", async () => {
  const camera = new PerspectiveCamera();
  camera.position.set(0, 1.7, 0);
  camera.lookAt(0, 1.7, -20);
  const rail = new CameraRail(camera);
  const done = rail.start(
    [
      new Vector3(0, 1.7, -2),
      new Vector3(0, 6.7, -10),
      new Vector3(0, 6.7, -12),
    ],
    new Vector3(0, 6.7, -20),
    { duration: 4, lookAlong: true },
  );
  let previousZ = 0,
    observedRise = false;
  for (let i = 0; i < 241; i++) {
    rail.update(1 / 60);
    assert.ok(camera.position.z <= previousZ + 1e-8);
    assert.ok(
      camera.position.y >= 1.7 - 1e-8 && camera.position.y <= 6.7 + 1e-8,
    );
    assert.equal(camera.position.x, 0, "no spline overshoot into shelf space");
    observedRise ||= camera.position.y > 2 && camera.position.y < 6;
    previousZ = camera.position.z;
  }
  assert.equal(await done, true);
  assert.ok(observedRise);
  assert.deepEqual(camera.position.toArray(), [0, 6.7, -12]);
  const position = camera.position.clone(),
    rotation = camera.quaternion.clone();
  rail.update(10);
  assert.ok(camera.position.equals(position));
  assert.ok(camera.quaternion.equals(rotation));
});

test("new routes and reset cancel old walks; reduced motion reaches the same destination", async () => {
  const camera = new PerspectiveCamera(),
    rail = new CameraRail(camera);
  const stale = rail.start([new Vector3(0, 0, -10)], new Vector3(0, 0, -20));
  rail.update(0.2);
  rail.cancel();
  assert.equal(await stale, false);
  const stopped = camera.position.clone();
  rail.update(10);
  assert.ok(camera.position.equals(stopped));
  const instant = await rail.start(
    [new Vector3(0, 5, -30)],
    new Vector3(0, 5, -40),
    { reducedMotion: true },
  );
  assert.equal(instant, true);
  assert.equal(rail.active, null);
  assert.deepEqual(camera.position.toArray(), [0, 5, -30]);
});
