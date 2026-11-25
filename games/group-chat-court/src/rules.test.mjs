import test from "node:test";
import assert from "node:assert/strict";
import {
  newCourt,
  currentCase,
  currentDefendant,
  juryFor,
  startCase,
  acceptPass,
  submitEvidence,
  submitArgument,
  nextCase,
  renderVerdict,
  CASES,
  ARGUMENTS,
} from "./rules.mjs";
function defend(s, e = 0, a = "logic") {
  const c = currentCase(s);
  assert.ok(submitEvidence(s, c.defense[e].id));
  assert.ok(submitArgument(s, a));
}
test("seeded dockets contain three distinct cases, four friends and three impartial non-defendant jurors", () => {
  const a = newCourt({ seed: 42 }),
    b = newCourt({ seed: 42 });
  assert.deepEqual(a, b);
  assert.equal(new Set(a.order).size, 3);
  assert.equal(new Set(a.cast).size, 4);
  assert.equal(juryFor(a).length, 3);
  assert.ok(juryFor(a).every((j) => j.id !== currentDefendant(a).id));
  assert.equal(new Set(juryFor(a).map((j) => j.preference)).size, 3);
});
test("solo resolves actual evidence and argument strengths, records exactly three votes and cannot vote twice", () => {
  const s = newCourt({ seed: 42 });
  startCase(s);
  assert.equal(s.phase, "defense-evidence");
  assert.ok(s.choices.prosecution.argument);
  defend(s);
  assert.equal(s.phase, "verdict");
  assert.equal(s.verdict.votes.length, 3);
  assert.equal(s.defenseVotes + s.prosecutionVotes, 3);
  const before = structuredClone(s);
  assert.equal(renderVerdict(s), false);
  assert.equal(submitArgument(s, "vibes"), false);
  assert.deepEqual(s, before);
});
test("a different defense can change the verdict; jury is derived from chosen evidence, not a coin flip", () => {
  const outcomes = [];
  for (let e = 0; e < 3; e++)
    for (const argument of Object.keys(ARGUMENTS)) {
      const s = newCourt({ seed: 42 });
      startCase(s);
      defend(s, e, argument);
      outcomes.push(s.verdict.defenseVotes);
    }
  assert.ok(new Set(outcomes).size > 1);
  assert.ok(outcomes.some((n) => n >= 2));
  assert.ok(outcomes.some((n) => n < 2));
});
test("hotseat requires both handoffs and both complete arguments before any jury verdict", () => {
  const s = newCourt({ mode: "hotseat", seed: 3 });
  startCase(s);
  assert.equal(s.phase, "pass-prosecution");
  assert.equal(submitEvidence(s, currentCase(s).prosecution[0].id), false);
  acceptPass(s);
  assert.equal(s.phase, "prosecution-evidence");
  submitEvidence(s, currentCase(s).prosecution[0].id);
  submitArgument(s, "drama");
  assert.equal(s.phase, "pass-defense");
  assert.equal(s.verdict, null);
  assert.equal(submitArgument(s, "logic"), false);
  acceptPass(s);
  defend(s, 2, "vibes");
  assert.equal(s.phase, "verdict");
  assert.equal(s.verdict.choices.prosecution.argument, "drama");
});
test("three cases complete once and a fresh hearing resets every result and vote", () => {
  const s = newCourt({ seed: 42 });
  for (let n = 0; n < 3; n++) {
    assert.ok(startCase(s));
    defend(s, n % 3, "vibes");
    assert.ok(nextCase(s));
  }
  assert.equal(s.phase, "finished");
  assert.equal(s.results.length, 3);
  assert.equal(s.defenseVotes + s.prosecutionVotes, 9);
  assert.equal(startCase(s), false);
  assert.equal(nextCase(s), false);
  const fresh = newCourt({ seed: 42 });
  assert.equal(fresh.results.length, 0);
  assert.equal(fresh.defenseVotes, 0);
  assert.equal(fresh.caseIndex, 0);
});
test("invalid submissions and prototype names never mutate court state", () => {
  const s = newCourt({ seed: 9 });
  startCase(s);
  let before = structuredClone(s);
  assert.equal(submitEvidence(s, "not-evidence"), false);
  assert.equal(submitArgument(s, "logic"), false);
  assert.deepEqual(s, before);
  submitEvidence(s, currentCase(s).defense[0].id);
  before = structuredClone(s);
  assert.equal(submitArgument(s, "constructor"), false);
  assert.deepEqual(s, before);
});
test("case content is complete and no campaign repeats its defendant", () => {
  for (const c of CASES) {
    assert.equal(c.prosecution.length, 3);
    assert.equal(c.defense.length, 3);
    assert.ok(c.guilty && c.innocent);
    for (const e of [...c.prosecution, ...c.defense])
      assert.ok(Object.values(e.power).every((n) => n >= 0 && n <= 4));
  }
  const s = newCourt({ seed: 1 });
  const defendants = [];
  for (let n = 0; n < 3; n++) {
    startCase(s);
    defendants.push(currentDefendant(s).id);
    defend(s);
    nextCase(s);
  }
  assert.equal(new Set(defendants).size, 3);
});
