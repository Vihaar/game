import test from "node:test";
import assert from "node:assert/strict";
import {
  Scene,
  PerspectiveCamera,
  TextureLoader,
  Texture,
  Vector3,
  Matrix4,
} from "three";
import { SpellEffects } from "../src/spell-effects.js";
import { effectProfile } from "../src/effectprofile.mjs";
const cards = {
  ricochet: { key: "ricochet", effect: "ricochet", kind: "fire" },
  stolensentence: {
    key: "stolensentence",
    effect: "stolensentence",
    kind: "memory",
  },
  borroweddawn: { key: "borroweddawn", effect: "borroweddawn", kind: "memory" },
};
function engine(options = {}) {
  const load = TextureLoader.prototype.load;
  TextureLoader.prototype.load = () => new Texture();
  try {
    return new SpellEffects(new Scene(), {
      camera: new PerspectiveCamera(),
      ...options,
    });
  } finally {
    TextureLoader.prototype.load = load;
  }
}
test("semantic choreography follows stable spell identity, not display names", () => {
  for (const [key, card] of Object.entries(cards)) {
    assert.equal(effectProfile(card).choreography, key);
    assert.deepEqual(
      effectProfile(card),
      effectProfile({ ...card, name: "Renamed by a friend" }),
    );
  }
});
test("ricochet reaches the actual ordered hit anchors including repeated targets and owns its inputs", () => {
  const effects = engine(),
    origin = new Vector3(0, 1, 3),
    hits = [
      new Vector3(-2, 1, 0),
      new Vector3(2, 1, -1),
      new Vector3(2, 1, -1),
    ],
    expected = hits.map((v) => v.clone());
  try {
    effects.cast(cards.ricochet, origin, hits[0], { hits });
    hits[1].set(99, 99, 99);
    const slot = effects.slots.find((s) => s.active);
    let previous = 0;
    expected.forEach((target, i) => {
      const time = 0.1 + (0.74 * (i + 1)) / 3;
      effects.update(time - previous);
      previous = time;
      assert.ok(
        slot.payload.position.distanceTo(target) < 1e-6,
        `impact${i} is at its resolved target`,
      );
    });
    assert.ok(effects.stats.drawCalls <= 24);
    effects.update(1);
    assert.equal(effects.stats.active, 0);
  } finally {
    effects.dispose();
  }
});
test("Stolen Sentence pulls enemy ink to the hand and sends it back rather than using a generic outward bolt", () => {
  const effects = engine(),
    origin = new Vector3(0, 1, 3),
    target = new Vector3(2, 1, -1);
  try {
    effects.cast(cards.stolensentence, origin, target);
    const slot = effects.slots.find((s) => s.active);
    effects.update(0.1);
    assert.ok(slot.payload.position.distanceTo(target) < 1e-6);
    effects.update(0.37);
    assert.ok(slot.payload.position.distanceTo(origin) < 1e-6);
    effects.update(0.37);
    assert.ok(slot.payload.position.distanceTo(target) < 1e-6);
  } finally {
    effects.dispose();
  }
});
test("all semantic effects stay finite and pooled, including malformed or coincident hit lists", () => {
  const effects = engine();
  try {
    for (let i = 0; i < 40; i++) {
      const card = Object.values(cards)[i % 3];
      effects.cast(card, new Vector3(), new Vector3(), {
        hits: [
          new Vector3(),
          { x: Infinity, y: 0, z: 0 },
          new Vector3(),
          new Vector3(),
          new Vector3(9, 9, 9),
        ],
      });
      effects.update(0.02);
      assert.ok(effects.stats.active <= 6);
      assert.ok(effects.stats.drawCalls <= 24);
      for (const slot of effects.slots.filter((s) => s.active)) {
        assert.ok(slot.hitAnchors.length <= 3);
        assert.ok(
          [
            ...slot.particles.instanceMatrix.array,
            ...slot.ribbon.geometry.attributes.position.array,
          ].every(Number.isFinite),
        );
      }
    }
    effects.update(2);
    assert.equal(effects.stats.active, 0);
  } finally {
    effects.dispose();
  }
});
test("reduced motion keeps semantic fragments fixed and shows no travelling ribbon", () => {
  for (const card of Object.values(cards)) {
    const effects = engine({ reducedMotion: true });
    try {
      effects.cast(card, new Vector3(0, 1, 3), new Vector3(1, 1, -2), {
        hits: [new Vector3(-2, 1, -1), new Vector3(2, 1, -1)],
      });
      effects.update(0.04);
      const slot = effects.slots.find((s) => s.active),
        matrix = new Matrix4(),
        positions = [];
      for (let i = 0; i < slot.particles.count; i++) {
        slot.particles.getMatrixAt(i, matrix);
        positions.push(new Vector3().setFromMatrixPosition(matrix));
      }
      effects.update(0.08);
      for (let i = 0; i < slot.particles.count; i++) {
        slot.particles.getMatrixAt(i, matrix);
        assert.ok(
          new Vector3().setFromMatrixPosition(matrix).distanceTo(positions[i]) <
            1e-7,
        );
      }
      assert.equal(slot.ribbon.visible, false);
      effects.update(1);
      assert.equal(effects.stats.active, 0);
    } finally {
      effects.dispose();
    }
  }
});
