/** Deterministic local alchemy: canonical unordered pairs, cached discoveries and metadata.
 * FNV-1a and the sorted recipe-key pattern below are adapted from Infinite Alchemy:
 * https://github.com/sshh12/llm_alchemy/tree/e9d6937d8b2fc999976e45bd49fdc6d32fc54d99
 * src/shared/hash.ts and src/app/lib/ids.ts. Research verified its primary source/license.
 * No Neal.fun endpoint, provider account, or network is used by these rules.
 *
 * MIT License — Copyright (c) 2023 Shrivu Shankar
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export function fnv1a(value, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
export function canonicalPair(a, b) {
  return [a, b].sort();
}
export function pairKey(a, b) {
  return canonicalPair(a, b).join(",");
}
export function recipeIdentity(a, b) {
  const signature = `fold-v2:${pairKey(a, b)}`;
  return (
    "fold_" +
    [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
      .map((seed) => fnv1a(signature, seed).toString(16).padStart(8, "0"))
      .join("")
  );
}
export const CARD_LIMITS = Object.freeze({
  damage: 9,
  areaDamage: 5,
  block: 9,
  healing: 2,
  draw: 2,
  cost: 3,
});
const ELEMENTS = [
  "ember",
  "stone",
  "dew",
  "gust",
  "memory",
  "silence",
  "mirror",
];
const VISUAL_KIND = { memory: "gust", silence: "stone", mirror: "dew" };
const GLYPHS = { ember: "✦", stone: "⬡", dew: "◒", gust: "≋" };
const PREFIXES = [
  "Ashen",
  "Glass",
  "Moonlit",
  "Quiet",
  "Briar",
  "Copper",
  "Stormbound",
  "Hollow",
  "Radiant",
  "Velvet",
  "Ancient",
  "Silver",
  "Twilight",
  "Amber",
  "Wandering",
  "Iron",
];
const NOUNS = {
  ember: [
    "Lantern",
    "Phoenix",
    "Cinder",
    "Meteor",
    "Kiln",
    "Beacon",
    "Flame",
    "Comet",
  ],
  stone: [
    "Citadel",
    "Monolith",
    "Golem",
    "Rampart",
    "Anchor",
    "Crown",
    "Vault",
    "Bastion",
  ],
  dew: ["Grove", "Geyser", "Orchid", "Tide", "Oasis", "Bloom", "Pool", "River"],
  gust: [
    "Tempest",
    "Whisper",
    "Gale",
    "Falcon",
    "Zephyr",
    "Echo",
    "Cyclone",
    "Aurora",
  ],
};
const NAMED_PAIRS = new Map([
  [pairKey("ember", "dew"), "Steam"],
  [pairKey("stone", "dew"), "Moss"],
  [pairKey("stone", "gust"), "Sandstorm"],
  [pairKey("gust", "gust"), "Gale"],
  [pairKey("flare", "stone"), "Kiln"],
  [pairKey("bastion", "gust"), "Citadel"],
  [pairKey("spring", "ember"), "Geyser"],
  [pairKey("firestorm", "mist"), "Monsoon"],
]);
const STORAGE_KEY = "the-fold:discoveries:v2";
function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}
function plainText(value, limit) {
  return typeof value === "string" &&
    !/[<>\u0000-\u001f\u007f]/.test(value) &&
    value.trim()
    ? value.trim().slice(0, limit)
    : null;
}
const validKey = (key) =>
  typeof key === "string" && /^[a-z][a-z0-9_]{0,95}$/.test(key);
function effectsText(card) {
  return [
    card.damage &&
      !card.ricochet &&
      !card.stealIntent &&
      `Deal ${card.damage} damage${card.all ? " to nearby enemies" : ""}.`,
    card.block && `Gain ${card.block} block briefly.`,
    card.heal && `Restore ${card.heal} health.`,
    card.draw && `Prepare up to ${card.draw} inscriptions.`,
    card.replay && "Replay your previous attack as flame (up to 6; 4 if none).",
    card.interrupt && "Interrupt the target’s next announced move.",
    card.reflect && `Reflect up to ${card.reflect} guarded damage this turn.`,
    card.pierce && "Ignores enemy guard.",
    card.ricochet &&
      "Three 2-damage sparks: first at your target, then two seeded-random living targets; each meets guard separately.",
    card.stealIntent &&
      "Deals the target’s announced attack damage (2–8), or 3 when it is not attacking.",
    card.borrowFocus &&
      "Restore 2 Focus now, up to your maximum; next turn has 1 less Focus. Once per turn across all versions.",
  ]
    .filter(Boolean)
    .join(" ");
}
export function createCraftingSystem(cards, recipes) {
  const cache = new Map();
  const discoveries = new Map();
  for (const [key, card] of Object.entries(cards)) {
    card.key = key;
    card.id = key;
    card.depth = 0;
    card.generated = false;
    card.elements = [card.concept || card.kind];
    card.weights = Object.fromEntries(
      ELEMENTS.map((element) => [
        element,
        element === (card.concept || card.kind) ? 1 : 0,
      ]),
    );
    card.parents = [];
    card.benefit = card.text;
  }
  for (const recipe of recipes) {
    const parents = canonicalPair(...recipe.inputs),
      card = cards[recipe.output];
    cache.set(pairKey(...parents), recipe.output);
    card.parents = parents;
    card.depth = 1;
    card.elements = [
      ...new Set(parents.flatMap((key) => cards[key].elements)),
    ].sort();
    card.weights = Object.fromEntries(
      ELEMENTS.map((element) => [
        element,
        parents.filter((key) => cards[key].elements.includes(element)).length,
      ]),
    );
  }
  function getCard(key) {
    return validKey(key) && Object.hasOwn(cards, key) ? cards[key] : null;
  }
  function recipeFor(a, b) {
    const left = getCard(a),
      right = getCard(b);
    if (!left || !right) return null;
    const pair = pairKey(a, b);
    if (cache.has(pair)) return cache.get(pair);
    const key = recipeIdentity(a, b),
      parents = canonicalPair(a, b),
      hash = fnv1a(key);
    if (getCard(key)) {
      if (pairKey(...cards[key].parents) !== pair)
        throw new Error(
          "A crafting identity collision was detected. No recipe was substituted.",
        );
      cache.set(pair, key);
      return key;
    }
    const depth = Math.max(left.depth || 0, right.depth || 0) + 1;
    const weights = Object.fromEntries(
      ELEMENTS.map((element) => [
        element,
        Math.min(
          32,
          (left.weights?.[element] || 0) + (right.weights?.[element] || 0),
        ),
      ]),
    );
    const elements = ELEMENTS.filter((element) => weights[element] > 0);
    const strongest = Math.max(...Object.values(weights));
    const dominant = elements.filter(
      (element) => weights[element] === strongest,
    );
    const dominantConcept = dominant[hash % dominant.length];
    const kind = VISUAL_KIND[dominantConcept] || dominantConcept;
    const power = Math.min(9, 5 + Math.floor(Math.log2(depth + 1)));
    const card = {
      key,
      id: key,
      name:
        NAMED_PAIRS.get(pair) ||
        `${PREFIXES[hash % PREFIXES.length]} ${NOUNS[kind][(hash >>> 8) % NOUNS[kind].length]} ${key.slice(-3).toUpperCase()}`,
      glyph: GLYPHS[kind],
      kind,
      depth,
      generated: true,
      fused: true,
      parents,
      weights,
      elements,
      cost: 2,
    };
    if (kind === "ember") {
      card.damage = power;
      if (elements.includes("gust") && hash % 7 === 0) {
        card.all = true;
        card.damage = Math.min(5, power);
      }
    }
    if (kind === "stone") {
      card.block = power;
      if (elements.includes("ember") && hash % 3 === 0) card.damage = 3;
    }
    if (kind === "dew") {
      card.heal = depth >= 3 && hash % 11 === 0 ? 2 : 1;
      card.block = 2 + (hash % 3);
    }
    if (kind === "gust") {
      card.damage = 3 + (hash % 3);
      card.draw = 1;
    }
    // Better slot economy without weaker damage/guard per Focus; power remains capped.
    if (card.damage)
      card.damage = card.all
        ? Math.min(5, card.damage)
        : Math.max(8, card.damage);
    if (card.block && !card.damage && !card.heal)
      card.block = Math.max(8, card.block);
    card.cost = card.damage || card.block >= 7 ? 2 : 1;
    const inheritable = parents
      .map((key) => getCard(key))
      .filter((parent) => parent.effect);
    const inherited = inheritable.length
      ? inheritable[hash % inheritable.length]
      : null;
    if (inherited) {
      card.effect = inherited.effect;
      for (const key of ["replay", "interrupt", "reflect", "pierce"])
        if (inherited[key]) card[key] = inherited[key];
      if (card.effect === "replay") {
        delete card.damage;
        delete card.all;
        card.replay = true;
        card.cost = 1;
      }
      if (card.effect === "interrupt") {
        delete card.damage;
        card.block = Math.min(6, Math.max(4, inherited.block || 4));
        card.cost = 1;
      }
      if (card.effect === "reflect" || card.effect === "mirrorward") {
        delete card.damage;
        card.block = Math.min(6, Math.max(3, inherited.block || 3));
        card.cost = 1;
      }
      if (card.effect === "recall") {
        card.damage = 2;
        card.draw = 2;
        card.cost = 1;
      }
      if (["ricochet", "stolensentence", "focusdebt"].includes(card.effect)) {
        for (const key of [
          "damage",
          "block",
          "heal",
          "all",
          "draw",
          "replay",
          "interrupt",
          "reflect",
          "pierce",
        ])
          delete card[key];
        card.cost = 1;
        if (card.effect === "ricochet") {
          card.damage = 2;
          card.ricochet = 3;
        }
        if (card.effect === "stolensentence") {
          card.damage = 3;
          card.stealIntent = true;
        }
        if (card.effect === "focusdebt") {
          card.draw = 1;
          card.borrowFocus = 2;
          card.focusDebt = 1;
        }
      }
      if (card.effect === "pierce") {
        card.damage = 6;
        delete card.all;
        card.cost = 1;
      }
    }
    card.text = effectsText(card);
    card.benefit = card.text;
    card.description = `A fusion of ${getCard(parents[0]).name} and ${getCard(parents[1]).name}.`;
    cards[key] = card;
    cache.set(pair, key);
    return key;
  }
  function remember(key) {
    const card = getCard(key);
    if (!card || !card.parents.length) return false;
    discoveries.set(key, {
      key,
      parents: [...card.parents],
      name: card.name,
      description: card.description || "",
    });
    return true;
  }
  function getDiscoveryCatalog() {
    return [...discoveries.keys()].map((key) => {
      const card = getCard(key);
      return {
        ...card,
        parents: [...card.parents],
        elements: [...card.elements],
        weights: { ...card.weights },
      };
    });
  }
  function saveDiscoveries(storage = safeStorage()) {
    if (!storage) return false;
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, cards: [...discoveries.values()] }),
      );
      return true;
    } catch {
      return false;
    }
  }
  function applyCardDiscovery(key, metadata, storage = safeStorage()) {
    const card = getCard(key);
    // Existing named recipes stay named. Providers can never supply card powers or ownership.
    if (!card?.generated || !metadata || typeof metadata !== "object")
      return false;
    const name = plainText(metadata.name, 48),
      description = plainText(metadata.description, 180);
    if (!name && !description) return false;
    if (name) card.name = name;
    if (description) card.description = description;
    if (discoveries.has(key)) {
      remember(key);
      saveDiscoveries(storage);
    }
    return true;
  }
  function loadDiscoveries(storage = safeStorage()) {
    if (!storage) return 0;
    let raw;
    try {
      raw = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    } catch {
      return 0;
    }
    if (
      !raw ||
      raw.version !== 2 ||
      !Array.isArray(raw.cards) ||
      raw.cards.length > 20000
    )
      return 0;
    const pending = new Map(),
      dependents = new Map(),
      ready = [],
      loaded = new Set();
    for (const entry of raw.cards) {
      if (
        !entry ||
        !validKey(entry.key) ||
        !Array.isArray(entry.parents) ||
        entry.parents.length !== 2 ||
        !entry.parents.every(validKey) ||
        pending.has(entry.key)
      )
        continue;
      pending.set(entry.key, entry);
      for (const parent of new Set(entry.parents)) {
        if (!dependents.has(parent)) dependents.set(parent, []);
        dependents.get(parent).push(entry.key);
      }
    }
    for (const [key, entry] of pending)
      if (entry.parents.every((parent) => getCard(parent))) ready.push(key);
    for (let cursor = 0; cursor < ready.length; cursor++) {
      const key = ready[cursor];
      if (loaded.has(key)) continue;
      const entry = pending.get(key);
      if (!entry || !entry.parents.every((parent) => getCard(parent))) continue;
      const expected = recipeFor(...entry.parents);
      if (expected !== key) continue;
      remember(key);
      applyCardDiscovery(key, entry, null);
      remember(key);
      loaded.add(key);
      for (const child of dependents.get(key) || [])
        if (
          !loaded.has(child) &&
          pending.get(child).parents.every((parent) => getCard(parent))
        )
          ready.push(child);
    }
    return loaded.size;
  }
  return {
    getCard,
    recipeFor,
    remember,
    getDiscoveryCatalog,
    saveDiscoveries,
    loadDiscoveries,
    applyCardDiscovery,
    storageKey: STORAGE_KEY,
  };
}
