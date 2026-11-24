import test from "node:test";
import assert from "node:assert/strict";
import {
  Scene,
  PerspectiveCamera,
  TextureLoader,
  Texture,
  Vector3,
} from "three";
import { effectProfile, EFFECT_LIMITS } from "../src/effectprofile.mjs";
import { getCard, recipeFor } from "../src/rules.mjs";
import { SpellEffects } from "../src/spell-effects.js";
test("spell identity follows elements, never a generated display name", () => {
  const spell = getCard(recipeFor("ember", "gust"));
  const a = effectProfile(spell),
    b = effectProfile({ ...spell, name: "Completely different AI label" });
  assert.deepEqual(a, b);
  assert.equal(a.family, "lightning");
  assert.ok(a.families.includes("fire"));
  assert.ok(a.families.includes("wind"));
  assert.equal(
    effectProfile(getCard(recipeFor("stone", "dew"))).family,
    "vine",
  );
});
test("all eight magic families are available without name parsing", () => {
  for (const family of [
    "fire",
    "water",
    "stone",
    "wind",
    "light",
    "shadow",
    "lightning",
    "vine",
  ])
    assert.equal(effectProfile({ kind: family }).family, family);
});
test("arbitrarily deep recursive spells keep finite timing and bounded draw work", () => {
  let key = "ember";
  for (let i = 0; i < 200; i++) {
    key = recipeFor(key, i % 2 ? "stone" : "gust");
    const p = effectProfile(getCard(key));
    assert.ok(p.duration >= 0.5 && p.duration <= 1);
    assert.ok(p.particles <= EFFECT_LIMITS.particles);
    assert.ok(p.families.length <= 3);
    assert.ok(p.cell >= 0 && p.cell < 16);
  }
  assert.ok(effectProfile({ depth: Infinity, kind: "bad" }).duration < 1);
  assert.ok(effectProfile({}, { reducedMotion: true }).duration < 0.3);
});
function engine(options = {}) {
  const load = TextureLoader.prototype.load;
  TextureLoader.prototype.load = () => new Texture();
  try {
    return new SpellEffects(new Scene(), { camera: new PerspectiveCamera(), ...options });
  } finally {
    TextureLoader.prototype.load = load;
  }
}
test("rapid casts reuse six pooled slots, stay under24draws, and disappear after their finite lifetimes", () => {
  const effects = engine();
  for (let i = 0; i < 40; i++) {
    effects.cast(getCard("ember"), new Vector3(0, 1, 1), new Vector3(2, 1, -2));
    assert.ok(effects.stats.active <= 6);
    assert.ok(effects.stats.drawCalls <= 24);
  }
  assert.equal(effects.stats.active, 6);
  effects.update(2, 2);
  assert.equal(effects.stats.active, 0);
  effects.dispose();
  assert.equal(effects.slots.length, 0);
  assert.equal(effects.cast({}, new Vector3(), new Vector3()), null);
});
test("projectiles visibly travel to target, forge uses two ingredient seals, and cleanup releases pooled GPU resources", () => {
  const effects = engine(),
    o = new Vector3(0, 1, 0),
    t = new Vector3(4, 1, -2);
  effects.cast(getCard("ember"), o, t);
  const slot = effects.slots.find((s) => s.active);
  effects.update(0.12, 0.12);
  const start = slot.payload.position.clone();
  effects.update(0.26, 0.38);
  assert.ok(slot.payload.position.distanceTo(o) > start.distanceTo(o));
  effects.update(0.16, 0.54);
  assert.ok(slot.payload.position.distanceTo(t) < 0.1);
  effects.update(1, 2);
  effects.forge(getCard("obsidian"), o);
  assert.equal(effects.stats.drawCalls, 4);
  assert.equal(
    effects.slots.find((s) => s.active).seals.filter((s) => s.visible).length,
    3,
  );
  let disposed = 0;
  effects.atlas.addEventListener("dispose", () => disposed++);
  effects.sharedShard.addEventListener("dispose", () => disposed++);
  effects.dispose();
  effects.dispose();
  assert.equal(disposed, 2);
});
test("same elapsed time yields same trajectory independent of frame partition", () => {
  const a = engine(),
    b = engine(),
    o = new Vector3(),
    t = new Vector3(3, 1, -3),
    card = getCard("gust");
  a.cast(card, o, t);
  b.cast(card, o, t);
  a.update(0.4, 0.4);
  for (let i = 0; i < 8; i++) b.update(0.05, (i + 1) * 0.05);
  assert.ok(
    a.slots[0].payload.position.distanceTo(b.slots[0].payload.position) < 1e-8,
  );
  a.dispose();
  b.dispose();
});

test("reduced-motion forging crossfades fixed ingredient seals without orbiting", () => {
  const effects = engine({ reducedMotion: true });
  effects.forge(getCard("obsidian"), new Vector3());
  const slot = effects.slots.find((s) => s.active);
  effects.update(0.04, 0.04);
  const positions = slot.seals.map((seal) => seal.position.clone());
  effects.update(0.08, 0.12);
  slot.seals.forEach((seal, i) =>
    assert.ok(seal.position.distanceTo(positions[i]) < 1e-8),
  );
  assert.equal(slot.ribbon.visible, false);
  effects.dispose();
});
