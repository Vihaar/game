import test from "node:test";
import assert from "node:assert/strict";
import { createPointerControls } from "./pointer-controls.mjs";
test("a second player's inspection tap cannot release a held movement pointer", () => {
  const c = createPointerControls();
  assert.deepEqual(c.press(11, "right"), { dx: 1, dy: 0, held: false });
  assert.deepEqual(c.release(22), { dx: 1, dy: 0, held: false });
  assert.deepEqual(c.release(11), { dx: 0, dy: 0, held: false });
});
test("interaction and movement have independent owners, including cancellation in either order", () => {
  const c = createPointerControls();
  c.press(11, "up");
  c.press(22, "interact");
  assert.deepEqual(c.snapshot(), { dx: 0, dy: -1, held: true });
  assert.deepEqual(c.release(11), { dx: 0, dy: 0, held: true });
  c.press(11, "left");
  assert.deepEqual(c.release(22), { dx: -1, dy: 0, held: false });
  assert.deepEqual(c.reset(), { dx: 0, dy: 0, held: false });
  assert.deepEqual(c.release(11), { dx: 0, dy: 0, held: false });
});
test("two movement pointers support diagonals, conflicting directions and normal mouse release", () => {
  const c = createPointerControls();
  c.press(1, "up");
  assert.deepEqual(c.press(2, "right"), { dx: 1, dy: -1, held: false });
  c.press(3, "left");
  assert.deepEqual(c.snapshot(), { dx: 0, dy: -1, held: false });
  c.release(2);
  assert.deepEqual(c.snapshot(), { dx: -1, dy: -1, held: false });
  c.reset();
  c.press(1, "interact");
  assert.deepEqual(c.release(1), { dx: 0, dy: 0, held: false });
});
