// Original court rules. Seeded RNG adapted from the existing MIT Server Kart math helper.
export const FRIENDS = [
  {
    id: "mike",
    name: "Mike",
    file: "mike.webp",
    color: "#ddb85d",
    quip: "Receipts, please.",
  },
  {
    id: "torin",
    name: "Torin",
    file: "torin.png",
    color: "#c9a7e8",
    quip: "I respect a committed bit.",
  },
  {
    id: "jonah",
    name: "Jonah",
    file: "jonah.png",
    color: "#a5d6c1",
    quip: "Context is everything.",
  },
  {
    id: "grant",
    name: "Grant",
    file: "grant.png",
    color: "#f0a4a8",
    quip: "Make it entertaining.",
  },
];
export const STYLES = { logic: "receipts", drama: "drama", vibes: "vibes" };
export const ARGUMENTS = {
  logic: {
    id: "logic",
    title: "Follow the receipts",
    line: "A timeline. A diagram. A deeply unnecessary laser pointer.",
    power: { logic: 4, drama: 0, vibes: 1 },
  },
  drama: {
    id: "drama",
    title: "Make a closing speech",
    line: "Pause. Look at the ceiling. Whisper “society.”",
    power: { logic: 0, drama: 4, vibes: 1 },
  },
  vibes: {
    id: "vibes",
    title: "Commit to the bit",
    line: "Is it a crime, or is everyone simply afraid of innovation?",
    power: { logic: 1, drama: 0, vibes: 4 },
  },
};
const evidence = (id, title, line, logic, drama, vibes) => ({
  id,
  title,
  line,
  power: { logic, drama, vibes },
});
export const CASES = [
  {
    id: "onmyway",
    title: "“On my way.” Still in bed.",
    charge: "Sending “on my way” while still inside a duvet.",
    detail:
      "The getaway vehicle was a weighted blanket. The alleged delay: 47 minutes.",
    prosecution: [
      evidence(
        "timestamp",
        "The suspicious timestamp",
        "“On my way” at 8:03. “Which socks?” at 8:41.",
        4,
        2,
        0,
      ),
      evidence(
        "pillow",
        "Exhibit B: pillow marks",
        "A forehead with a remarkably specific waffle pattern.",
        1,
        4,
        1,
      ),
      evidence(
        "status",
        "The online status",
        "Somehow there was time to start another ranked match.",
        2,
        1,
        4,
      ),
    ],
    defense: [
      evidence(
        "context",
        "The full message",
        "The missing second line: “…to find my shoes.”",
        4,
        0,
        2,
      ),
      evidence(
        "blanket",
        "The emotional-support duvet",
        "Leaving it unattended would have been irresponsible.",
        0,
        4,
        2,
      ),
      evidence(
        "timezone",
        "An alternative time zone",
        "“On my way” is a state of mind, not a location.",
        2,
        1,
        4,
      ),
    ],
    guilty: "Sentenced to send live sock updates before the next hangout.",
    innocent: "Free to go. “On my way” must now include a location pin.",
  },
  {
    id: "soup",
    title: "The soup classification incident.",
    charge: "Declaring soup a beverage and attempting to drink it with a fork.",
    detail: "The table has requested compensation for emotional dampness.",
    prosecution: [
      evidence(
        "fork",
        "The completely dry fork",
        "Four tines. Zero soup transported.",
        4,
        1,
        1,
      ),
      evidence(
        "table",
        "A very wet table",
        "The table is a witness and would prefer not to be.",
        1,
        4,
        2,
      ),
      evidence(
        "menu",
        "The edited menu",
        "“Soup” has been crossed out and replaced with “chunky tea.”",
        2,
        0,
        4,
      ),
    ],
    defense: [
      evidence(
        "definition",
        "The dictionary loophole",
        "It says liquid food. It never says how ambitious to be.",
        4,
        1,
        1,
      ),
      evidence(
        "napkin",
        "One heroic napkin",
        "The accused attempted a cleanup. The napkin did its best.",
        1,
        4,
        2,
      ),
      evidence(
        "innovation",
        "A prototype spoon",
        "The fork was just an early access spoon.",
        2,
        0,
        4,
      ),
    ],
    guilty: "Sentenced to one meal with a perfectly normal spoon.",
    innocent: "Acquitted on a technicali-tea. The table remains unconvinced.",
  },
  {
    id: "cart",
    title: "The office-chair Grand Prix.",
    charge:
      "Entering an office chair in a kart race and calling it aerodynamic.",
    detail: "It had five wheels, lumbar support, and absolutely no brakes.",
    prosecution: [
      evidence(
        "wheels",
        "The wheel count",
        "Five tiny wheels. The race rules say “a kart, probably.”",
        4,
        2,
        0,
      ),
      evidence(
        "clip",
        "The dramatic replay",
        "A majestic 0.7-second spin followed by a printer collision.",
        0,
        4,
        2,
      ),
      evidence(
        "sponsor",
        "The fake sponsor sticker",
        "“Powered by back pain.” Printed on a sticky note.",
        2,
        1,
        4,
      ),
    ],
    defense: [
      evidence(
        "rulebook",
        "The untouched rulebook",
        "Office chairs are not specifically banned. Yet.",
        4,
        1,
        1,
      ),
      evidence(
        "ergonomic",
        "An ergonomic expert",
        "The expert is also the accused, wearing glasses.",
        1,
        4,
        1,
      ),
      evidence(
        "spirit",
        "The spirit of motorsport",
        "There was speed. There were wheels. There was screaming.",
        2,
        1,
        4,
      ),
    ],
    guilty: "Sentenced to a mandatory pit stop for posture correction.",
    innocent: "Certified race chair. A helmet is now strongly encouraged.",
  },
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
const shuffle = (items, rng) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function newCourt({ mode = "solo", seed = Date.now() } = {}) {
  const actual = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : 1,
    rng = seededRandom(actual);
  return {
    mode: mode === "hotseat" ? "hotseat" : "solo",
    seed: actual,
    phase: "intro",
    caseIndex: 0,
    order: shuffle(
      CASES.map((c) => c.id),
      rng,
    ),
    cast: shuffle(
      FRIENDS.map((f) => f.id),
      rng,
    ),
    choices: {},
    results: [],
    defenseVotes: 0,
    prosecutionVotes: 0,
  };
}
export function currentCase(state) {
  return CASES.find((c) => c.id === state.order[state.caseIndex]);
}
export function currentDefendant(state) {
  return FRIENDS.find(
    (f) => f.id === state.cast[state.caseIndex % state.cast.length],
  );
}
export function juryFor(state) {
  const defendant = currentDefendant(state),
    rng = seededRandom(state.seed + state.caseIndex * 1009 + 31);
  const tastes = shuffle(Object.keys(STYLES), rng);
  return FRIENDS.filter((f) => f.id !== defendant.id).map((friend, i) => ({
    ...friend,
    preference: tastes[i],
    lean: Math.floor(rng() * 3) - 1,
  }));
}
export function startCase(state) {
  if (!["intro", "between"].includes(state.phase) || state.caseIndex >= 3)
    return false;
  state.choices = {};
  state.verdict = null;
  state.phase =
    state.mode === "hotseat" ? "pass-prosecution" : "defense-evidence";
  if (state.mode === "solo") state.choices.prosecution = aiProsecution(state);
  return true;
}
export function acceptPass(state) {
  if (state.phase === "pass-prosecution") {
    state.phase = "prosecution-evidence";
    return true;
  }
  if (state.phase === "pass-defense") {
    state.phase = "defense-evidence";
    return true;
  }
  return false;
}
export function currentSide(state) {
  return state.phase.startsWith("prosecution-")
    ? "prosecution"
    : state.phase.startsWith("defense-")
      ? "defense"
      : null;
}
export function submitEvidence(state, id) {
  const side = currentSide(state);
  if (!side || state.phase !== side + "-evidence") return false;
  const item = currentCase(state)[side].find((e) => e.id === id);
  if (!item) return false;
  state.choices[side] = { evidence: id };
  state.phase = side + "-argument";
  return true;
}
export function submitArgument(state, id) {
  const side = currentSide(state);
  if (
    !side ||
    state.phase !== side + "-argument" ||
    !Object.hasOwn(ARGUMENTS, id)
  )
    return false;
  state.choices[side].argument = id;
  if (side === "prosecution") {
    state.phase = "pass-defense";
    return true;
  }
  return renderVerdict(state);
}
function points(choice, court, side, taste) {
  const e = court[side].find((e) => e.id === choice.evidence),
    a = ARGUMENTS[choice.argument];
  return e.power[taste] * 2 + a.power[taste];
}
function aiProsecution(state) {
  const court = currentCase(state),
    jury = juryFor(state),
    rng = seededRandom(state.seed + state.caseIndex * 109 + 7);
  let best = null,
    bestScore = -Infinity;
  for (const e of court.prosecution)
    for (const a of Object.values(ARGUMENTS)) {
      const choice = { evidence: e.id, argument: a.id };
      const score =
        jury.reduce(
          (sum, j) =>
            sum +
            Math.min(8, points(choice, court, "prosecution", j.preference)),
          0,
        ) +
        rng() * 5;
      if (score > bestScore) {
        bestScore = score;
        best = choice;
      }
    }
  return best;
}
export function renderVerdict(state) {
  if (
    state.phase !== "defense-argument" ||
    !state.choices.defense?.argument ||
    !state.choices.prosecution?.argument
  )
    return false;
  const court = currentCase(state),
    rng = seededRandom(state.seed + state.caseIndex * 7919 + 99);
  const votes = juryFor(state).map((j) => {
    const p = points(
        state.choices.prosecution,
        court,
        "prosecution",
        j.preference,
      ),
      d = points(state.choices.defense, court, "defense", j.preference),
      margin = d - p + j.lean + (rng() < 0.5 ? -1 : 1),
      innocent = margin >= 0;
    return {
      ...j,
      innocent,
      prosecution: p,
      defense: d,
      reason:
        margin === 0
          ? "Tie goes to reasonable doubt."
          : `${innocent ? "The defense" : "The prosecution"} had stronger ${STYLES[j.preference]}.`,
    };
  });
  const defenseVotes = votes.filter((v) => v.innocent).length,
    guilty = defenseVotes < 2;
  state.verdict = {
    caseId: court.id,
    defendant: currentDefendant(state).id,
    guilty,
    votes,
    defenseVotes,
    sentence: guilty ? court.guilty : court.innocent,
    choices: structuredClone(state.choices),
  };
  state.results.push(structuredClone(state.verdict));
  state.defenseVotes += defenseVotes;
  state.prosecutionVotes += 3 - defenseVotes;
  state.phase = "verdict";
  return true;
}
export function nextCase(state) {
  if (state.phase !== "verdict") return false;
  state.caseIndex++;
  state.phase = state.caseIndex >= 3 ? "finished" : "between";
  return true;
}
export function argumentInfo(state, side) {
  const choice = state.choices[side];
  if (!choice?.argument) return null;
  return {
    evidence: currentCase(state)[side].find((e) => e.id === choice.evidence),
    argument: ARGUMENTS[choice.argument],
  };
}
