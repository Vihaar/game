import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAPTER_BOOKS,
  chapterBook,
  worldAvailable,
} from "../src/world-interactions.mjs";
test("all eight optional books ask distinct chapter questions without awarding resources", () => {
  assert.equal(CHAPTER_BOOKS.length, 8);
  assert.equal(new Set(CHAPTER_BOOKS.map((book) => book.question)).size, 8);
  for (let i = 0; i < 8; i++) {
    assert.ok(chapterBook(i).passage.length > 100);
    assert.deepEqual(Object.keys(chapterBook(i)), [
      "title",
      "question",
      "passage",
    ]);
  }
});
test("world interaction is exclusive to exploration and never gates on reading", () => {
  const exploring = {
    started: true,
    phase: "explore",
    travelling: false,
    modal: false,
  };
  assert.equal(worldAvailable(exploring), true);
  assert.equal(worldAvailable({ ...exploring, readCount: 0 }), true);
  for (const phase of ["battle", "reward", "dead", "won"])
    assert.equal(worldAvailable({ ...exploring, phase }), false);
  for (const change of [
    { started: false },
    { travelling: true },
    { modal: true },
  ])
    assert.equal(worldAvailable({ ...exploring, ...change }), false);
});
