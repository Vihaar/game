export const WORLD = { width: 1000, height: 650, count: 30, duration: 150 };
export const STATIONS = [
  {
    id: "sign",
    name: "Flight board",
    x: 190,
    y: 140,
    radius: 58,
    duration: 2.5,
  },
  {
    id: "bag",
    name: "Lost luggage",
    x: 790,
    y: 340,
    radius: 62,
    duration: 3.5,
  },
  { id: "gate", name: "Gate C", x: 790, y: 115, radius: 65, duration: 2.5 },
];
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function newAirport({
  role = "impostor",
  seed = Date.now(),
  duration = WORLD.duration,
} = {}) {
  const r = seededRandom(seed),
    impostor = Math.floor(r() * WORLD.count);
  const travelers = Array.from({ length: WORLD.count }, (_, id) => ({
    id,
    x: 105 + r() * 790,
    y: 180 + r() * 350,
    target: Math.floor(r() * 6),
    wait: r() * 3,
    suspicion: 0,
    heading: 0,
    stopped: 0,
    inspected: false,
    route: 0,
  }));
  return {
    role: ["impostor", "agent", "local"].includes(role) ? role : "impostor",
    seed: seed >>> 0,
    time: duration,
    duration,
    phase: "playing",
    impostor,
    travelers,
    objectives: [],
    interaction: 0,
    interacting: null,
    inspections: 3,
    selected: null,
    result: null,
    aiClock: 0,
    elapsed: 0,
    log: [],
  };
}
export function movement(state, { dx = 0, dy = 0, run = false } = {}, dt) {
  if (state.phase !== "playing" || !["impostor", "local"].includes(state.role))
    return false;
  const p = state.travelers[state.impostor],
    length = Math.hypot(dx, dy);
  if (length) {
    const speed = run ? 110 : 53;
    p.x = clamp(p.x + (dx / Math.max(1, length)) * speed * dt, 45, 955);
    p.y = clamp(p.y + (dy / Math.max(1, length)) * speed * dt, 70, 600);
    p.heading = Math.atan2(dy, dx);
    p.suspicion = clamp(p.suspicion + (run ? 0.9 : -0.05) * dt, 0, 12);
  }
  return true;
}
export function availableStation(state) {
  const p = state.travelers[state.impostor];
  return STATIONS.find(
    (s) =>
      Math.hypot(p.x - s.x, p.y - s.y) < s.radius &&
      !state.objectives.includes(s.id) &&
      (s.id !== "gate" || state.objectives.length >= 2),
  );
}
export function interact(state, pressed, dt) {
  if (state.phase !== "playing") return false;
  const s = availableStation(state);
  if (!pressed || !s) {
    state.interaction = 0;
    state.interacting = null;
    return false;
  }
  if (state.interacting !== s.id) {
    state.interaction = 0;
    state.interacting = s.id;
  }
  state.interaction += dt;
  if (state.interaction >= s.duration) {
    state.objectives.push(s.id);
    state.travelers[state.impostor].route++;
    state.log.push({
      time: state.elapsed,
      event: s.id,
      traveler: state.impostor,
    });
    state.travelers[state.impostor].suspicion += 1.3;
    state.interaction = 0;
    state.interacting = null;
    if (s.id === "gate") {
      state.phase = "ended";
      state.result = "impostor";
    }
    return true;
  }
  return false;
}
export function inspect(state, id) {
  if (
    state.phase !== "playing" ||
    !Number.isInteger(id) ||
    id < 0 ||
    id >= WORLD.count ||
    state.inspections <= 0 ||
    state.travelers[id].inspected
  )
    return { ok: false };
  state.inspections--;
  state.travelers[id].inspected = true;
  state.selected = id;
  const caught = id === state.impostor;
  if (caught) {
    state.phase = "ended";
    state.result = "agent";
  } else if (state.inspections === 0) {
    state.phase = "ended";
    state.result = "impostor";
  }
  return { ok: true, caught, remaining: state.inspections };
}
export function tickClock(state, dt) {
  if (state.phase !== "playing") return;
  const delta = Math.max(0, Math.min(0.1, Number(dt) || 0));
  state.time = Math.max(0, state.time - delta);
  state.elapsed += delta;
  if (state.time === 0) {
    state.phase = "ended";
    state.result = "agent";
  }
}
export function score(state) {
  return {
    winner: state.result,
    objectives: state.objectives.length,
    seconds: Math.round(state.elapsed),
    inspections: 3 - state.inspections,
  };
}

export const WANDER_POINTS = [
  { x: 190, y: 140 },
  { x: 790, y: 340 },
  { x: 790, y: 115 },
  { x: 170, y: 480 },
  { x: 500, y: 380 },
  { x: 820, y: 520 },
];
function walkTo(p, target, speed, dt) {
  const dx = target.x - p.x,
    dy = target.y - p.y,
    d = Math.hypot(dx, dy);
  if (d < 5) return true;
  p.x += (dx / d) * Math.min(d, speed * dt);
  p.y += (dy / d) * Math.min(d, speed * dt);
  p.heading = Math.atan2(dy, dx);
  return false;
}
export function stepTravelers(state, dt, rng = Math.random) {
  if (state.phase !== "playing") return;
  const delta = Math.max(0, Math.min(0.1, Number(dt) || 0));
  for (const p of state.travelers) {
    p.suspicion = Math.max(0, p.suspicion - delta * 0.025);
    if (p.id === state.impostor) {
      if (state.role === "agent") {
        const next = STATIONS.find((s) => !state.objectives.includes(s.id));
        if (!next) continue;
        if (p.wait > 0) {
          p.wait -= delta;
          continue;
        }
        const arrived = walkTo(p, next, 50, delta);
        if (arrived) {
          if (interact(state, true, delta)) p.wait = 2 + rng() * 4;
        }
      }
      continue;
    }
    if (p.wait > 0) {
      p.wait -= delta;
      p.stopped += delta;
      continue;
    }
    const target = WANDER_POINTS[p.target];
    if (walkTo(p, target, 43 + (p.id % 7) * 3, delta)) {
      p.wait = 3 + rng() * 8;
      p.stopped = 0;
      p.target = Math.floor(rng() * WANDER_POINTS.length);
      p.route++;
    }
  }
}
export function aiInspector(state, dt, rng = Math.random) {
  if (state.role !== "impostor" || state.phase !== "playing") return null;
  state.aiClock += dt;
  if (state.aiClock < 18) return null;
  state.aiClock = 0;
  const candidates = state.travelers.filter((p) => !p.inspected);
  const suspect = candidates.toSorted((a, b) => b.suspicion - a.suspicion)[0];
  if (suspect?.suspicion >= 3 || state.time < 30) {
    return inspect(
      state,
      suspect?.suspicion >= 3
        ? suspect.id
        : candidates[Math.floor(rng() * candidates.length)].id,
    );
  }
  return null;
}
