import test from "node:test";
import assert from "node:assert/strict";
import { MeshStandardMaterial, Texture } from "three";
import { paintWorldMaterial } from "../src/painted-world-material.mjs";
import { createLibraryFloor } from "../src/library-architecture.mjs";
import {
  dressLibraryFloor,
  setLibraryKnowledgeScars,
} from "../src/illustrated-library.mjs";

const shader = () => ({
  uniforms: {},
  fragmentShader: "#include <map_fragment>\n#include <opaque_fragment>",
});

test("world painting composes existing material logic and preserves instanced color and texture ownership", () => {
  const map = new Texture(),
    material = new MeshStandardMaterial({ map, flatShading: true });
  material.onBeforeCompile = (program) => {
    program.uniforms.retained = { value: 17 };
  };
  material.customProgramCacheKey = () => "existing-world-logic";
  try {
    paintWorldMaterial(material, { seed: 3 });
    const compile = material.onBeforeCompile;
    paintWorldMaterial(material, { seed: 99 });
    assert.equal(
      material.onBeforeCompile,
      compile,
      "reapplying cannot stack shaders",
    );
    const program = shader();
    material.onBeforeCompile(program);
    assert.equal(program.uniforms.retained.value, 17);
    assert.equal(program.uniforms.worldPigmentSeed.value, 3);
    assert.match(material.customProgramCacheKey(), /existing-world-logic/);
    assert.match(program.fragmentShader, /paintTint = diffuseColor\.rgb/);
    assert.doesNotMatch(
      program.fragmentShader,
      /diffuseColor\.rgb = diffuse \*/,
    );
    assert.equal(material.map, map);
    assert.deepEqual(map.repeat.toArray(), [1, 1]);
    assert.equal(material.flatShading, false);
  } finally {
    material.dispose();
    map.dispose();
  }
});

test("painting retains the three-floor lamps, independent artwork and reversible knowledge layers", () => {
  const floor = createLibraryFloor(2);
  const source = {
    shelf: new Texture(),
    canopy: new Texture(),
    props: new Texture(),
  };
  try {
    dressLibraryFloor(floor, source);
    const count = floor.illustrated.children.length;
    const canopy = floor.illustrated.getObjectByName(
      "independent-illustrated-canopy",
    );
    assert.equal(canopy.material.userData.unlitLampCount, 4);
    assert.equal(canopy.material.userData.paintedWorld.illustration, true);
    const program = shader();
    canopy.material.onBeforeCompile(program);
    assert.equal(program.uniforms.libraryAllLampsOut.value, 1);
    assert.match(program.fragmentShader, /lampsOut \* brightGlass/);
    assert.match(program.fragmentShader, /inkNeighbour/);
    assert.equal(canopy.material.map, source.canopy);
    assert.equal(
      floor.illustrated.children.length,
      count,
      "contours require no duplicate geometry",
    );
    setLibraryKnowledgeScars(floor, ["fire"]);
    assert.equal(floor.knowledgeScars.visible, true);
    setLibraryKnowledgeScars(floor, []);
    assert.equal(floor.knowledgeScars.visible, false);
  } finally {
    floor.dispose();
    Object.values(source).forEach((texture) => texture.dispose());
  }
});
