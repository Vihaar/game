import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD,
  STATIONS,
  newAirport,
  movement,
  interact,
  inspect,
  tickClock,
  stepTravelers,
  aiInspector,
  seededRandom,
} from "./rules.mjs";
test("a seeded terminal has exactly thirty travelers and one reproducible impostor", () => {
  const a = newAirport({ seed: 42 }),
    b = newAirport({ seed: 42 });
  assert.deepEqual(a, b);
  assert.equal(a.travelers.length, 30);
  assert.equal(new Set(a.travelers.map((p) => p.id)).size, 30);
  assert.ok(a.impostor >= 0 && a.impostor < 30);
  assert.ok(a.travelers.every((p) => p.suspicion === 0));
});
test("movement is normalized, clamped and running raises behavioral attention rather than appearance", () => {
  const s = newAirport({ seed: 42 }),
    p = s.travelers[s.impostor],
    x = p.x,
    y = p.y;
  movement(s, { dx: 1, dy: 1 }, 1);
  assert.ok(Math.abs(Math.hypot(p.x - x, p.y - y) - 53) < 0.0001);
  movement(s, { dx: 100, dy: 0, run: true }, 20);
  assert.equal(p.x, 955);
  assert.ok(p.suspicion > 0);
});
test("errands require real proximity and continuous interaction; Gate C stays locked until both errands", () => {
  const s = newAirport({ seed: 42 }),
    p = s.travelers[s.impostor];
  assert.equal(interact(s, true, 10), false);
  p.x = STATIONS[2].x;
  p.y = STATIONS[2].y;
  assert.equal(interact(s, true, 10), false);
  assert.equal(s.objectives.length, 0);
  for (const station of STATIONS) {
    p.x = station.x;
    p.y = station.y;
    interact(s, true, 1);
    interact(s, false, 0);
    assert.equal(s.interaction, 0);
    for (let n = 0; n < 40 && !s.objectives.includes(station.id); n++)
      interact(s, true, 0.1);
    assert.ok(s.objectives.includes(station.id));
  }
  assert.equal(s.result, "impostor");
  assert.equal(s.phase, "ended");
});
test("inspections consume exactly one chance, never repeat a cleared traveler, and catch the actual impostor", () => {
  const s = newAirport({ role: "agent", seed: 42 }),
    other = s.travelers.find((p) => p.id !== s.impostor);
  const before = structuredClone(s);
  assert.equal(inspect(s, 999).ok, false);
  assert.deepEqual(s, before);
  assert.equal(inspect(s, other.id).caught, false);
  assert.equal(s.inspections, 2);
  assert.equal(inspect(s, other.id).ok, false);
  assert.equal(s.inspections, 2);
  assert.equal(inspect(s, s.impostor).caught, true);
  assert.equal(s.result, "agent");
  assert.equal(inspect(s, 1).ok, false);
});
test("three wrong inspections lose and timeout awards security, with no later result mutation", () => {
  const s = newAirport({ role: "agent", seed: 3 });
  for (const p of s.travelers.filter((p) => p.id !== s.impostor).slice(0, 3))
    inspect(s, p.id);
  assert.equal(s.result, "impostor");
  const timeout = newAirport({ seed: 42, duration: 0.2 });
  for (let n = 0; n < 4; n++) tickClock(timeout, 0.1);
  assert.equal(timeout.result, "agent");
  const before = structuredClone(timeout);
  movement(timeout, { dx: 1 }, 1);
  interact(timeout, true, 5);
  stepTravelers(timeout, 1);
  tickClock(timeout, 1);
  assert.deepEqual(timeout, before);
});
test("the AI impostor completes actual station visits and dwell times while ordinary travelers follow their routines", () => {
  const s = newAirport({ role: "agent", seed: 42 }),
    r = seededRandom(7),
    start = s.travelers.map((p) => ({ x: p.x, y: p.y }));
  for (let n = 0; n < 3000 && s.phase === "playing"; n++) {
    stepTravelers(s, 0.1, r);
    tickClock(s, 0.1);
  }
  assert.equal(s.result, "impostor");
  assert.deepEqual(s.objectives, ["sign", "bag", "gate"]);
  assert.equal(s.log.length, 3);
  assert.ok(s.log.every((e) => e.traveler === s.impostor));
  assert.ok(s.travelers.filter((p) => p.route > 0).length > 20);
  assert.ok(s.travelers.some((p, i) => p.x !== start[i].x));
  assert.ok(s.elapsed >= 20);
});
test("AI security reviews accumulated behavior, not an arbitrary verdict or traveler identity", () => {
  const s = newAirport({ role: "impostor", seed: 42 });
  assert.equal(
    aiInspector(s, 18, () => 0),
    null,
  );
  assert.equal(s.inspections, 3);
  const suspect = s.travelers.find((p) => p.id !== s.impostor);
  suspect.suspicion = 5;
  const clear = aiInspector(s, 18, () => 0);
  assert.equal(clear.caught, false);
  assert.ok(suspect.inspected);
  s.travelers[s.impostor].suspicion = 6;
  assert.equal(aiInspector(s, 18, () => 0).caught, true);
});
test("a fresh local round resets inspected travelers, timer, objectives and behavioral history", () => {
  const s = newAirport({ role: "local", seed: 4 });
  inspect(s, s.impostor);
  const fresh = newAirport({ role: "local", seed: 4 });
  assert.equal(fresh.phase, "playing");
  assert.equal(fresh.time, 150);
  assert.equal(fresh.inspections, 3);
  assert.equal(fresh.objectives.length, 0);
  assert.ok(fresh.travelers.every((p) => !p.inspected));
});
