import { fnv1a } from "./crafting.mjs";
export const EFFECT_LIMITS = Object.freeze({
  concurrent: 6,
  drawCalls: 24,
  particles: 32,
  ribbonSegments: 30,
});
const ALIASES = {
  ember: "fire",
  fire: "fire",
  dew: "water",
  water: "water",
  stone: "stone",
  earth: "stone",
  gust: "wind",
  wind: "wind",
  light: "light",
  shadow: "shadow",
  lightning: "lightning",
  vine: "vine",
  nature: "vine",
  memory: "light",
  silence: "shadow",
  mirror: "water",
};
const PALETTE = {
  fire: 0xda805b,
  water: 0x7cabb0,
  stone: 0xb5a078,
  wind: 0xb5c8bd,
  light: 0xe7ce8b,
  shadow: 0x8f7b9d,
  lightning: 0xb2a3d4,
  vine: 0x8ba781,
};
const CELLS = {
  ember: 0,
  stone: 1,
  dew: 2,
  gust: 3,
  flare: 4,
  bastion: 5,
  spring: 6,
  firestorm: 7,
  obsidian: 8,
  mist: 9,
};
export function artCell(card = {}) {
  const key = String(card.key || card.id || card.kind || "");
  return (
    CELLS[key] ??
    (card.fused || card.generated
      ? 4 + (fnv1a(key) % 12)
      : (CELLS[card.kind] ?? 15))
  );
}
export function effectProfile(
  card = {},
  { forge = false, reducedMotion = false } = {},
) {
  const elements = [
    ...new Set(
      [...(Array.isArray(card.elements) ? card.elements : []), card.kind]
        .filter((v) => Object.hasOwn(ALIASES, v))
        .map((v) => ALIASES[v]),
    ),
  ].sort();
  if (!elements.length) elements.push("light");
  const includes = (...values) => values.every((v) => elements.includes(v));
  const derived = includes("fire", "wind")
    ? "lightning"
    : includes("water", "stone")
      ? "vine"
      : includes("fire", "stone")
        ? "shadow"
        : includes("water", "wind")
          ? "light"
          : null;
  const semanticFamily = {
    replay: "fire",
    pierce: "fire",
    interrupt: "shadow",
    reflect: "water",
    recall: "wind",
    mirrorward: "stone",
    ricochet: "fire",
    stolensentence: "shadow",
    borroweddawn: "light",
  }[card.effect];
  const choreography =
    ["ricochet", "stolensentence", "borroweddawn"].find(
      (key) => card.effect === key || card.key === key || card.id === key,
    ) ?? null;
  const primary =
    semanticFamily || derived || ALIASES[card.kind] || elements[0];
  const families = [...new Set([primary, ...elements])].slice(0, 3);
  const depth = Number.isFinite(card.depth)
    ? Math.max(0, Math.min(64, card.depth))
    : 0;
  const signature = JSON.stringify([
    card.key || card.id || "",
    primary,
    elements,
    depth,
  ]);
  return Object.freeze({
    family: primary,
    families: Object.freeze(families),
    colors: Object.freeze(
      choreography === "stolensentence"
        ? [0x66577b, 0xc7b0d2, 0xe7ce8b]
        : choreography === "borroweddawn"
          ? [0xe7ce8b, 0xb7d1ca, 0xd8bb91]
          : families.map((v) => PALETTE[v]),
    ),
    seed: fnv1a(signature),
    cell: artCell(card),
    duration: reducedMotion
      ? 0.22
      : forge
        ? 0.8
        : choreography
          ? 1.0
          : 0.82 + Math.min(3, Math.log2(depth + 1)) * 0.025,
    particles: reducedMotion
      ? 6
      : choreography
        ? 24
        : Math.min(
            EFFECT_LIMITS.particles,
            18 + Math.ceil(Math.log2(depth + 1)) * 2,
          ),
    forge,
    reducedMotion,
    choreography,
  });
}
export function seededUnit(seed, index) {
  let n = Math.imul(
    (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0,
    0x85ebca6b,
  );
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
