import test from "node:test";
import assert from "node:assert/strict";
import { Texture } from "three";
import { createLibraryFloor } from "../src/library-architecture.mjs";
import {
  dressLibraryFloor,
  setLibraryKnowledgeScars,
} from "../src/illustrated-library.mjs";

test("the same separate illustrations become abandoned without changing their source textures", () => {
  const floor0 = createLibraryFloor(0),
    floor1 = createLibraryFloor(1),
    floor2 = createLibraryFloor(2);
  const source = {
    shelf: new Texture(),
    canopy: new Texture(),
    props: new Texture(),
  };
  try {
    for (const floor of [floor0, floor1, floor2])
      dressLibraryFloor(floor, source);
    const count = (floor, name) =>
      floor.illustrated.children.filter((child) => child.name === name).length;
    assert.deepEqual(
      [floor0, floor1, floor2].map((floor) =>
        count(floor, "independent-illustrated-bookshelf"),
      ),
      [6, 5, 2],
    );
    assert.deepEqual(
      [floor0, floor1, floor2].map((floor) =>
        count(floor, "independent-illustrated-canopy"),
      ),
      [4, 3, 2],
    );
    for (const [floor, out] of [
      [floor1, 2],
      [floor2, 4],
    ]) {
      const canopy = floor.illustrated.children.find(
        (child) => child.name === "independent-illustrated-canopy",
      );
      assert.equal(canopy.material.userData.unlitLampCount, out);
      assert.equal(canopy.material.map, source.canopy);
    }
    assert.equal(source.canopy.colorSpace, "");
    assert.equal(
      floor2.illustrated.getObjectByName("independent-illustrated-bookshelf")
        .material.color.r <
        floor0.illustrated.getObjectByName("independent-illustrated-bookshelf")
          .material.color.r,
      true,
    );
  } finally {
    [floor0, floor1, floor2].forEach((floor) => floor.dispose());
    Object.values(source).forEach((texture) => texture.dispose());
  }
});

test("fire knowledge adds one bounded reversible scorch-and-ash layer independent of the art", () => {
  const floor = createLibraryFloor(0);
  try {
    setLibraryKnowledgeScars(floor, ["water"]);
    assert.equal(floor.knowledgeScars, undefined);
    setLibraryKnowledgeScars(floor, ["fire"]);
    const group = floor.knowledgeScars;
    assert.equal(group.visible, true);
    assert.equal(group.getObjectByName("fallen-fire-ash").count, 40);
    const children = group.children.length;
    for (let i = 0; i < 100; i++)
      setLibraryKnowledgeScars(floor, ["fire", "fire"]);
    assert.equal(floor.knowledgeScars, group);
    assert.equal(group.children.length, children);
    setLibraryKnowledgeScars(floor, []);
    assert.equal(group.visible, false);
    setLibraryKnowledgeScars(floor, ["fire"]);
    assert.equal(group.visible, true);
  } finally {
    floor.dispose();
  }
});
