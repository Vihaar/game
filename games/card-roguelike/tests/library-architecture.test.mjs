import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Texture } from "three";
import {
  createLibraryFloor,
  applyLibraryTextures,
  LIBRARY_FLOOR_THEMES,
} from "../src/library-architecture.mjs";

test("eight volumetric chapters have continuous eye-height routes across their actual stairs", () => {
  const floors = Array.from({ length: 8 }, (_, i) => createLibraryFloor(i));
  try {
    assert.equal(new Set(floors.map((floor) => floor.theme)).size, 8);
    floors.forEach((floor, index) => {
      assert.equal(floor.theme, LIBRARY_FLOOR_THEMES[index]);
      assert.equal(floor.entrance.y, index * 5 + 1.7);
      assert.equal(floor.battleCamera.z, -index * 36 + 5.5);
      assert.ok(floor.stations.binding.camera.equals(floor.battleCamera));
      assert.ok(floor.stations.binding.lookAt.equals(floor.battleTarget));
      const bounds = new Box3().setFromObject(floor.group);
      assert.ok(bounds.max.x - bounds.min.x >= 18);
      assert.ok(bounds.max.y - floor.baseY >= 7);
      let draws = 0;
      floor.group.traverse((object) => {
        if (object.isMesh) {
          assert.notEqual(
            object.geometry.type,
            "PlaneGeometry",
            "room architecture uses actual 3D shells",
          );
          draws += Array.isArray(object.material)
            ? object.geometry.groups.length
            : 1;
        }
      });
      assert.ok(
        draws < 120,
        `chapter ${index} has ${draws} geometry draw calls`,
      );
      assert.ok(
        floor.counts["dyed-book-spines"] >= 120,
        "abandoned rooms still retain a recognizable library",
      );
      if (index < 7) {
        assert.ok(floor.routeToNext[0].equals(floor.exit));
        assert.ok(floor.routeToNext.at(-1).equals(floors[index + 1].entrance));
        for (let point = 1; point < floor.routeToNext.length; point++) {
          assert.ok(
            floor.routeToNext[point].y >= floor.routeToNext[point - 1].y,
          );
          assert.ok(
            floor.routeToNext[point].z < floor.routeToNext[point - 1].z,
          );
        }
        assert.ok(floor.counts["cardstock-floor-and-stairs"] >= 21);
      } else assert.equal(floor.routeToNext.length, 0);
    });
  } finally {
    floors.forEach((floor) => floor.dispose());
  }
});

test("the three-floor slice visibly loses books, light and intact paper each chapter", () => {
  const floors = [0, 1, 2].map(createLibraryFloor);
  try {
    assert.deepEqual(
      floors.map((floor) => floor.moodProgress),
      [0, 0.5, 1],
    );
    assert.ok(
      floors[0].counts["dyed-book-spines"] >
        floors[1].counts["dyed-book-spines"],
    );
    assert.ok(
      floors[1].counts["dyed-book-spines"] >
        floors[2].counts["dyed-book-spines"],
    );
    assert.deepEqual(
      floors.map((floor) => floor.counts["folded-paper-lanterns"] ?? 0),
      [6, 3, 0],
    );
    assert.deepEqual(
      floors.map((floor) => floor.counts["unlit-paper-lanterns"] ?? 0),
      [0, 3, 6],
    );
    assert.equal(floors[0].counts["torn-hanging-pages"] ?? 0, 0);
    assert.ok(
      floors[2].counts["torn-hanging-pages"] >
        floors[1].counts["torn-hanging-pages"],
    );
    assert.ok(
      floors[2].counts["fallen-paper-fragments"] >
        floors[1].counts["fallen-paper-fragments"],
    );
  } finally {
    floors.forEach((floor) => floor.dispose());
  }
});

test("generated material atlases crop independently without mutating caller textures", () => {
  const floor = createLibraryFloor(0),
    books = new Texture(),
    panels = new Texture(),
    paper = new Texture(),
    grimoire = new Texture();
  books.userData.regions = [
    [0, 0, 0.5, 578 / 1254],
    [0.5, 0, 0.5, 578 / 1254],
    [0, 578 / 1254, 0.5, 676 / 1254],
    [0.5, 578 / 1254, 0.5, 676 / 1254],
  ];
  try {
    applyLibraryTextures(floor, { books, panels, paper, grimoire });
    assert.deepEqual(books.repeat.toArray(), [1, 1]);
    assert.deepEqual(books.offset.toArray(), [0, 0]);
    const maps = floor.materials.bookMaterials.map((material) => material.map);
    assert.equal(new Set(maps).size, 4);
    assert.ok(maps[0].offset.y > maps[2].offset.y);
    assert.ok(maps[0].repeat.y < maps[2].repeat.y);
    assert.ok(
      floor.materials.paperMaterials.every(
        (material) => material.map !== paper,
      ),
    );
    assert.notEqual(floor.materials.grimoireMaterials[0].map, grimoire);
    const owned = floor._ownTextures.size;
    applyLibraryTextures(floor, { books, panels, paper, grimoire });
    assert.equal(
      floor._ownTextures.size,
      owned,
      "independent asynchronous arrivals do not duplicate already-applied maps",
    );
    const replacement = new Texture();
    applyLibraryTextures(floor, { books: replacement });
    assert.equal(
      floor._ownTextures.size,
      owned,
      "replacing a material source releases old owned crops",
    );
    assert.equal(floor._ownTextures.has(maps[0]), false);
    replacement.dispose();
  } finally {
    floor.dispose();
    books.dispose();
    panels.dispose();
    paper.dispose();
    grimoire.dispose();
  }
});
