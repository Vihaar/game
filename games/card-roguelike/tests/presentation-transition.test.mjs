import test from "node:test";
import assert from "node:assert/strict";
import { settleTransition } from "../src/presentation-transition.mjs";

test("a stalled cosmetic transition releases the start flow and snaps once", async () => {
  let finishes = 0;
  assert.equal(
    await settleTransition(
      () => new Promise(() => {}),
      () => finishes++,
      { timeoutMs: 5 },
    ),
    false,
  );
  assert.equal(finishes, 1);
});
test("normal completion cancels the fallback; rejected transitions reach recovery", async () => {
  let finishes = 0;
  assert.equal(
    await settleTransition(
      () => true,
      () => finishes++,
      { timeoutMs: 5 },
    ),
    true,
  );
  await assert.rejects(
    settleTransition(
      () => {
        throw Error("rail failure");
      },
      () => finishes++,
    ),
    /rail failure/,
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(finishes, 0);
});
