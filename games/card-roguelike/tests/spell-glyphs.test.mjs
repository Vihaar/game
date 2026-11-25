import test from "node:test";
import assert from "node:assert/strict";
import { glyphModel, spellGlyph } from "../src/spell-glyphs.mjs";
import { getCard, recipeFor } from "../src/rules.mjs";

test("forged glyphs retain ingredient identity across discovered names", () => {
  const card = getCard(recipeFor("ember", "gust"));
  assert.equal(glyphModel(card).family, "lightning");
  assert.deepEqual(
    glyphModel(card),
    glyphModel({ ...card, name: "Renamed discovery" }),
  );
  assert.notDeepEqual(
    glyphModel(card).segments,
    glyphModel({ kind: "lightning" }).segments,
  );
});

test("recursive forging keeps glyph geometry bounded and unique across families", () => {
  const shapes = new Set();
  for (const kind of [
    "fire",
    "water",
    "stone",
    "wind",
    "light",
    "shadow",
    "lightning",
    "vine",
  ])
    shapes.add(JSON.stringify(glyphModel({ kind }).segments));
  assert.equal(shapes.size, 8);
  let key = "ember";
  for (let i = 0; i < 200; i++) {
    key = recipeFor(key, i % 2 ? "dew" : "stone");
    const glyph = glyphModel(getCard(key));
    assert.ok(glyph.segments.length <= 13);
    assert.match(glyph.color, /^#[0-9a-f]{6}$/);
  }
});

test("unknown discovery metadata cannot inject SVG or extra keyboard stops", () => {
  const svg = spellGlyph({
    kind: '<img onerror="bad()">',
    name: "<script>bad()</script>",
  });
  assert.equal(glyphModel({}).family, "light");
  assert.ok(!svg.includes("bad()"));
  assert.ok(svg.includes('aria-hidden="true"'));
  assert.ok(svg.includes('focusable="false"'));
});
