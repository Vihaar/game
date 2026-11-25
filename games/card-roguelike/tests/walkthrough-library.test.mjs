import test from "node:test";
import assert from "node:assert/strict";
import { Scene, PerspectiveCamera, Texture, TextureLoader } from "three";
import { WalkthroughLibrary } from "../src/walkthrough-library.js";

test("the playable world loads surface assets only and walks continuously into its next floor", async () => {
  const original = TextureLoader.prototype.load,
    requests = [];
  TextureLoader.prototype.load = function (url, onLoad) {
    requests.push(url);
    const texture = new Texture({ width: 1254, height: 1254 });
    queueMicrotask(() => onLoad(texture));
    return texture;
  };
  let world;
  try {
    const camera = new PerspectiveCamera(58, 16 / 9, 0.06, 140);
    const renderer = {
      domElement: { addEventListener() {}, removeEventListener() {} },
      capabilities: { getMaxAnisotropy: () => 1 },
    };
    world = new WalkthroughLibrary(new Scene(), camera, renderer);
    await world.ready;
    assert.equal(requests.length, 8);
    assert.ok(
      requests.every(
        (url) =>
          url.includes("/3d/") ||
          url.endsWith("enemy-atlas.webp") ||
          url.endsWith("prop-atlas.webp"),
      ),
      "no full-room picture is requested",
    );
    const entered = world.enterLibrary();
    for (let i = 0; i < 150; i++) world.update(1 / 60);
    assert.equal(await entered, true);
    const start = camera.position.clone(),
      travel = world.travelTo(1);
    world.update(0.5);
    assert.ok(camera.position.distanceTo(start) > 0.01);
    let sawStairs = false;
    for (let i = 0; i < 1500 && world.rail.active; i++) {
      world.update(1 / 60);
      sawStairs ||= camera.position.y > 2 && camera.position.y < 6;
    }
    assert.equal(await travel, true);
    assert.ok(sawStairs);
    assert.equal(world.areaIndex, 1);
    assert.ok(camera.position.equals(world.ensureFloor(1).exploreCamera));
    const stable = camera.position.clone();
    world.update(5);
    assert.ok(camera.position.equals(stable));
    const stale = world.travelTo(2);
    world.update(0.2);
    world.setArea(0);
    assert.equal(await stale, false);
    world.update(10);
    assert.equal(world.areaIndex, 0);
    world.setDiscoveries({ families: ["fire"] });
    for (const floor of world.floors.values())
      assert.equal(floor.knowledgeScars.visible, true);
    assert.equal(
      world.ensureFloor(3).knowledgeScars.visible,
      true,
      "later floors inherit the in-run choice",
    );
    world.resetDiscoveries();
    for (const floor of world.floors.values())
      assert.equal(floor.knowledgeScars.visible, false);
    world.setDiscoveries({ families: ["fire"] });
    world.setDiscoveries({ families: [] });
    assert.equal(
      world.ensureFloor(0).knowledgeScars.visible,
      false,
      "forgetting the fire discovery fades its scar",
    );
    world.setEnemies([{ id: "keeper", type: "warden", hp: 10 }]);
    const battle = camera.position.clone();
    world.setEnemies([{ id: "keeper", type: "warden", hp: 4 }]);
    world.update(0.1);
    assert.ok(
      camera.position.equals(battle),
      "a spell does not move the battle camera",
    );
    world.setEnemies([{ id: "keeper", type: "warden", hp: 0 }]);
    assert.equal(
      world.getEnemyAnchor(0),
      null,
      "defeat is untargetable during its animation",
    );
  } finally {
    world?.dispose();
    TextureLoader.prototype.load = original;
  }
});
