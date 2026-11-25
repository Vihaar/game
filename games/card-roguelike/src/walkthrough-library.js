import * as THREE from "three";
import { createLibraryFloor } from "./library-architecture.mjs";
import { CameraRail } from "./camera-rail.mjs";
import { dressLibraryFloor } from "./illustrated-library.mjs";
import { ENEMY_ATLAS, atlasRegion } from "./diorama-scenes.mjs";

const artUrl = (file) => `${import.meta.env?.BASE_URL ?? "./"}art/${file}`;
const files = {
  paper: "3d/paper-fiber.webp",
  books: "3d/book-covers.webp",
  panels: "3d/carved-panels.webp",
  grimoire: "3d/rune-book.webp",
  shelf: "3d/shelf-bay.webp",
  canopy: "3d/canopy.webp",
  props: "prop-atlas.webp",
  enemies: ENEMY_ATLAS.file,
};

/** Real rooms, geometry and stair-connected camera travel. No room backdrop. */
export class WalkthroughLibrary {
  constructor(
    scene,
    camera,
    renderer,
    { onEnemyClick = () => {}, floorFactory = createLibraryFloor } = {},
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.floorFactory = floorFactory;
    this.onEnemyClick = onEnemyClick;
    this.floors = new Map();
    this.textures = {};
    this.actors = [];
    this.areaIndex = 0;
    this.worldVisible = true;
    this.disposed = false;
    this.routeEpoch = 0;
    this.mode = "explore";
    this.lastAspect = camera.aspect;
    this.rail = new CameraRail(camera);
    this.cast = new THREE.Group();
    scene.add(this.cast);
    this.ambient = new THREE.HemisphereLight("#fff0ce", "#63523c", 1.2);
    this.sun = new THREE.DirectionalLight("#ffe7bc", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -16,
      right: 16,
      top: 22,
      bottom: -20,
      near: 0.5,
      far: 55,
    });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.camera.updateProjectionMatrix();
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    scene.add(this.ambient, this.sun, this.sun.target);
    scene.background = new THREE.Color("#cab995");
    scene.fog = new THREE.Fog("#cab995", 24, 65);
    camera.fov = 58;
    camera.near = 0.06;
    camera.far = 140;
    camera.updateProjectionMatrix();
    this.loader = new THREE.TextureLoader();
    this.ready = Promise.all(
      Object.entries(files).map(async ([key, file]) => {
        const texture = await new Promise((resolve) =>
          this.loader.load(artUrl(file), resolve, undefined, () =>
            resolve(null),
          ),
        );
        if (!texture) return;
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          4,
          renderer.capabilities?.getMaxAnisotropy?.() ?? 1,
        );
        if (key === "books")
          texture.userData.regions = [
            [0, 0, 0.5, 578 / 1254],
            [0.5, 0, 0.5, 578 / 1254],
            [0, 578 / 1254, 0.5, 676 / 1254],
            [0.5, 578 / 1254, 0.5, 676 / 1254],
          ];
        this.textures[key] = texture;
        for (const floor of this.floors.values()) {
          floor.setTextures?.(this.textures);
          dressLibraryFloor(floor, this.textures);
        }
        if (key === "enemies")
          for (const actor of this.actors) this.textureActor(actor);
      }),
    );
    this.setArea(0);
    this.handlePointer = (event) => {
      if (this.rail.active) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(
        this.actors.filter((a) => a.alive).map((a) => a.sprite),
      )[0];
      if (hit) this.onEnemyClick(hit.object.userData.enemyIndex);
    };
    renderer.domElement?.addEventListener("pointerup", this.handlePointer);
  }
  ensureFloor(index) {
    if (index < 0 || index > 7) return null;
    if (!this.floors.has(index)) {
      const floor = this.floorFactory(index);
      this.floors.set(index, floor);
      this.scene.add(floor.group);
      floor.setTextures?.(this.textures);
      dressLibraryFloor(floor, this.textures);
    }
    return this.floors.get(index);
  }
  updateVisibility(index = this.areaIndex) {
    this.ensureFloor(index + 1);
    for (const [i, floor] of this.floors)
      floor.group.visible = Math.abs(i - index) <= 1;
  }
  setMood(index) {
    const t = index / 7;
    this.ambient.color.set("#fff0ce").lerp(new THREE.Color("#9a9bbd"), t);
    this.ambient.groundColor.set("#63523c").lerp(new THREE.Color("#171625"), t);
    this.ambient.intensity = 1.2 - t * 0.55;
    this.sun.color.set("#ffe7bc").lerp(new THREE.Color("#b4a8d4"), t);
    this.sun.intensity = 2.6 - t * 1.5;
    const floor = this.ensureFloor(index),
      base = floor.entrance;
    this.sun.position.set(-8, index * 5 + 12, base.z + 1);
    this.sun.target.position.set(0, index * 5, base.z - 14);
    this.scene.background.set("#cab995").lerp(new THREE.Color("#10101e"), t);
    this.scene.fog.color.copy(this.scene.background);
  }
  setArea(index) {
    this.routeEpoch++;
    this.rail.cancel();
    this.clearActors();
    this.mode = "explore";
    this.areaIndex = Math.max(0, Math.min(7, Math.trunc(index)));
    const floor = this.ensureFloor(this.areaIndex);
    this.updateVisibility();
    this.setMood(this.areaIndex);
    this.camera.position.copy(floor.exploreCamera ?? floor.entrance);
    this.camera.lookAt(floor.battleTarget);
    this.camera.updateMatrixWorld();
    return this;
  }
  async enterLibrary({ reducedMotion = false } = {}) {
    const epoch = this.routeEpoch,
      floor = this.ensureFloor(0);
    this.camera.position.copy(floor.entrance);
    this.camera.lookAt(floor.battleTarget);
    this.camera.updateMatrixWorld();
    const done = await this.rail.start(
      [floor.exploreCamera ?? floor.battleCamera],
      floor.battleTarget,
      { duration: 2.4, reducedMotion, lookAlong: true },
    );
    return done && epoch === this.routeEpoch;
  }
  async travelTo(index, { reducedMotion = false } = {}) {
    if (this.disposed) return false;
    if (index === this.areaIndex) return true;
    const epoch = ++this.routeEpoch;
    this.rail.cancel();
    this.clearActors();
    this.mode = "explore";
    const from = this.ensureFloor(this.areaIndex),
      next = this.ensureFloor(index);
    this.updateVisibility(index);
    from.group.visible = true;
    const points = [
      new THREE.Vector3(0, this.camera.position.y, this.camera.position.z),
      from.exit,
      ...from.routeToNext,
      next.exploreCamera ?? next.entrance,
    ];
    const distance = points.reduce(
      (sum, point, i) =>
        sum + point.distanceTo(i ? points[i - 1] : this.camera.position),
      0,
    );
    const done = await this.rail.start(points, next.battleTarget, {
      duration: Math.max(3, distance / 4.5),
      reducedMotion,
      lookAlong: true,
    });
    if (!done || epoch !== this.routeEpoch || this.disposed) return false;
    this.areaIndex = index;
    this.setMood(index);
    this.updateVisibility(index);
    return true;
  }
  async focusWorld(id, { reducedMotion = false } = {}) {
    if (this.mode === "battle" || this.disposed) return false;
    const floor = this.ensureFloor(this.areaIndex),
      station = floor.stations[id];
    if (!station) return false;
    const destination =
      id === "binding"
        ? this.battlePose().position
        : (station.camera ??
          station.position.clone().add(new THREE.Vector3(0, 0.3, 2.7)));
    const target = id === "binding" ? floor.battleTarget : station.lookAt;
    const points = [
      new THREE.Vector3(
        0,
        destination.y,
        Math.max(this.camera.position.z, destination.z),
      ),
      destination,
    ];
    const distance = this.camera.position.distanceTo(destination);
    return this.rail.start(points, target, {
      duration: Math.max(0.8, Math.min(3.5, distance / 2.8)),
      reducedMotion,
    });
  }
  setWorldVisible(visible) {
    this.worldVisible = Boolean(visible);
    return this;
  }
  getWorldAnchor(id) {
    if (!this.worldVisible || this.mode === "battle") return null;
    return (
      this.ensureFloor(this.areaIndex).stations[id]?.position.clone() ?? null
    );
  }
  battlePose() {
    const floor = this.ensureFloor(this.areaIndex),
      position = floor.battleCamera.clone(),
      target = floor.battleTarget.clone();
    const halfWidth = Math.max(2.4, this.actors.length * 1.2 + 1.2);
    const needed =
      halfWidth /
      (Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
        Math.max(0.35, this.camera.aspect));
    position.z = Math.max(position.z, target.z + needed);
    return { position, target };
  }
  fitCamera() {
    this.lastAspect = this.camera.aspect;
    this.camera.updateProjectionMatrix();
    if (this.mode === "battle") {
      const pose = this.battlePose();
      this.camera.position.copy(pose.position);
      this.camera.lookAt(pose.target);
      this.camera.updateMatrixWorld();
    }
  }
  textureActor(actor) {
    const source = this.textures.enemies;
    if (!source) return;
    const region = atlasRegion(
      Math.max(0, ENEMY_ATLAS.types.indexOf(actor.definition.type)),
      3,
      2,
      0.004,
      ENEMY_ATLAS.regions[actor.definition.type],
    );
    const map = source.clone();
    map.repeat.fromArray(region.repeat);
    map.offset.fromArray(region.offset);
    map.needsUpdate = true;
    actor.sprite.material.map?.dispose();
    actor.sprite.material.map = map;
    actor.sprite.material.needsUpdate = true;
    actor.sprite.scale.x =
      (source.image.width * region.sourceSize[0]) /
      (source.image.height * region.sourceSize[1]);
  }
  clearActors() {
    for (const actor of this.actors)
      actor.group.traverse((node) => {
        node.geometry?.dispose();
        if (node.material) {
          node.material.map?.dispose();
          node.material.dispose();
        }
      });
    this.cast.clear();
    this.actors = [];
  }
  setEnemies(definitions = []) {
    const same =
      definitions.length === this.actors.length &&
      definitions.every((d, i) => d.id === this.actors[i].definition.id);
    if (!same) {
      this.clearActors();
      const floor = this.ensureFloor(this.areaIndex),
        y = this.areaIndex * 5;
      this.actors = definitions.map((definition, index) => {
        const group = new THREE.Group(),
          height = definition.type === "unbinder" ? 3.2 : 2.55;
        group.position.set(
          (index - (definitions.length - 1) / 2) * 2.5,
          y,
          floor.battleTarget.z,
        );
        const sprite = new THREE.Mesh(
          new THREE.PlaneGeometry(height, height),
          new THREE.MeshBasicMaterial({
            transparent: true,
            alphaTest: 0.08,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        sprite.position.y = height / 2;
        sprite.userData.enemyIndex = index;
        group.add(sprite);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.66, 0.73, 40),
          new THREE.MeshBasicMaterial({
            color: "#cf8d67",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.025;
        group.add(ring);
        const actor = {
          definition: { ...definition },
          group,
          sprite,
          ring,
          height,
          alive: definition.hp > 0,
          hit: 0,
          defeat: 0,
        };
        this.cast.add(group);
        this.textureActor(actor);
        return actor;
      });
    }
    definitions.forEach((definition, i) => {
      const actor = this.actors[i];
      if (definition.hp < actor.definition.hp) actor.hit = 0.22;
      if (actor.alive && definition.hp <= 0) actor.defeat = 0.3;
      actor.definition = { ...definition };
      actor.alive = definition.hp > 0;
      actor.group.visible = actor.alive || actor.defeat > 0;
    });
    if (definitions.length) {
      this.mode = "battle";
      this.rail.cancel();
      this.fitCamera();
    } else this.mode = "explore";
    return this;
  }
  setTarget(index) {
    this.actors.forEach(
      (actor, i) => (actor.ring.visible = actor.alive && i === index),
    );
    return this;
  }
  getEnemyAnchor(index) {
    const actor = this.actors[index];
    return actor?.alive
      ? actor.group.position
          .clone()
          .add(new THREE.Vector3(0, actor.height + 0.25, 0))
      : null;
  }
  update(dt, elapsed = 0, { reducedMotion = false, presentationDelta = dt } = {}) {
    if (this.disposed) return;
    this.rail.update(presentationDelta, reducedMotion);
    if (Math.abs(this.camera.aspect - this.lastAspect) > 0.001)
      this.fitCamera();
    for (const actor of this.actors) {
      actor.hit = Math.max(0, actor.hit - dt);
      actor.defeat = reducedMotion ? 0 : Math.max(0, actor.defeat - dt);
      actor.sprite.rotation.z = reducedMotion
        ? 0
        : Math.sin((actor.hit / 0.22) * Math.PI) * 0.045;
      actor.group.visible = actor.alive || actor.defeat > 0;
      actor.group.scale.y = actor.alive
        ? 1
        : Math.max(0.01, actor.defeat / 0.3);
      actor.sprite.material.opacity = actor.alive ? 1 : actor.defeat / 0.3;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.routeEpoch++;
    this.rail.cancel();
    this.clearActors();
    this.renderer.domElement?.removeEventListener(
      "pointerup",
      this.handlePointer,
    );
    for (const floor of this.floors.values()) {
      this.scene.remove(floor.group);
      floor.dispose?.();
    }
    for (const texture of Object.values(this.textures)) texture.dispose();
    this.scene.remove(this.cast, this.ambient, this.sun, this.sun.target);
  }
}
