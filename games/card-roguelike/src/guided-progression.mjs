// Small run-changing discoveries. No art, UI, network or persistent player power.
export const GUIDED_RELICS = {
  emberseal: {
    id: "emberseal",
    name: "Charcoal Seal",
    description: "Your first damaging spell each battle deals 2 extra damage.",
  },
  marginward: {
    id: "marginward",
    name: "Silver Margin",
    description: "Your first guard spell each turn grants 2 extra guard.",
  },
  mirrorthread: {
    id: "mirrorthread",
    name: "Mirror Thread",
    description: "Guard spells also reflect 1 guarded damage this turn.",
  },
  dogear: {
    id: "dogear",
    name: "The Dog-Eared Page",
    description:
      "Your first spell that prepares more spells each battle restores 1 Focus.",
  },
  bloodbookmark: {
    id: "bloodbookmark",
    name: "Red Bookmark",
    description:
      "Combining during battle also grants 3 guard. It still costs 2 HP.",
  },
  quietlamp: {
    id: "quietlamp",
    name: "The Last Reading Lamp",
    description: "Recover 1 extra HP after each victory.",
  },
};
export const guidedRelicInfo = (id) => GUIDED_RELICS[id] || null;
export const guidedRelics = (state) =>
  (state.relics || []).map(guidedRelicInfo).filter(Boolean);
export function grantGuidedRelics(state, count, rng = Math.random) {
  state.relics ||= [];
  const gained = [];
  for (let n = 0; n < count; n++) {
    const pool = Object.keys(GUIDED_RELICS).filter(
      (id) => !state.relics.includes(id),
    );
    if (!pool.length) break;
    const id =
      pool[
        Math.min(
          pool.length - 1,
          Math.floor(Math.max(0, Number(rng()) || 0) * pool.length),
        )
      ];
    state.relics.push(id);
    gained.push(GUIDED_RELICS[id]);
  }
  return gained;
}
export function guidedRouteOptions(state) {
  if (
    state.phase !== "explore" ||
    state.forge ||
    state.routeChoice?.floor === state.floor
  )
    return [];
  return [
    {
      id: "archive",
      title:
        [
          "The Marginalia Room",
          "The Unread Collection",
          "The Last Reading Room",
        ][state.floor - 1] || "The Archive",
      description: "Search the shelves before the encounter.",
      risk: "Normal guardians",
      reward: "Discover 1 relic now",
    },
    {
      id: "guardian",
      title:
        ["The Sealed Wing", "The Forbidden Index", "The Locked Reflection"][
          state.floor - 1
        ] || "The Sealed Wing",
      description: "Challenge the library’s stronger keepers.",
      risk: "Guardians have 20% more HP and deal 1 extra damage",
      reward:
        state.floor === 3
          ? "Discover 2 relics before the final battle"
          : "Discover 2 relics after victory",
    },
  ];
}
export function guidedChooseRoute(state, id, rng = Math.random) {
  const option = guidedRouteOptions(state).find((route) => route.id === id);
  if (!option)
    return { ok: false, reason: "Choose an available path before the battle." };
  state.routeChoice = {
    id,
    floor: state.floor,
    rewardGranted: id === "guardian" && state.floor === 3,
  };
  state.lastRelics =
    id === "archive"
      ? grantGuidedRelics(state, 1, rng)
      : state.routeChoice.rewardGranted
        ? grantGuidedRelics(state, 2, rng)
        : [];
  return {
    ok: true,
    route: { ...state.routeChoice },
    relics: state.lastRelics,
  };
}
