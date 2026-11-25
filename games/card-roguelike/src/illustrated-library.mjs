import * as THREE from "three";
import { atlasRegion } from "./diorama-scenes.mjs";
import { AREAS } from "./areas.mjs";

// Individually illustrated surfaces occupy different depths inside actual rooms.
// These are stage objects, never a full-room background or camera-facing skybox.
export function dressLibraryFloor(floor, { shelf, canopy, props } = {}) {
  if (!shelf || !canopy || !props || floor.illustrated) return;
  const group = new THREE.Group();
  group.name = "illustrated-library-objects";
  floor.group.add(group);
  const tint = new THREE.Color("#ffffff").lerp(
    new THREE.Color("#76728c"),
    (floor.index / 7) * 0.78,
  );
  const maps = [],
    geometries = [],
    materials = [];
  const make = (map, width, height, x, y, z, rotation = 0) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map,
      color: tint,
      transparent: true,
      alphaTest: 0.14,
      side: THREE.DoubleSide,
      depthWrite: true,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
    return mesh;
  };
  for (const side of [-1, 1])
    for (const z of [8.4, 1, -6.4]) {
      const asset = make(shelf, 4.45, 6.1, side * 6.75, 3.05, z, side * -0.32);
      asset.name = "independent-illustrated-bookshelf";
    }
  for (const z of [10.7, 3.4, -4.3, -11.6]) {
    const asset = make(canopy, 14.1, 7.94, 0, 4.0, z);
    asset.name = "independent-illustrated-canopy";
  }
  for (const [index, x] of [
    [0, -4.8],
    [1, 4.8],
  ]) {
    const map = props.clone(),
      region = atlasRegion(index, 3, 1, 0.006);
    map.repeat.fromArray(region.repeat);
    map.offset.fromArray(region.offset);
    map.needsUpdate = true;
    maps.push(map);
    const asset = make(map, 2.6, 2.6, x, 1.3, 2.5);
    asset.name =
      index === 0 ? "illustrated-reading-plinth" : "illustrated-forge-plinth";
  }
  // A separate open-book doorway stands before the real staircase.
  const door = props.clone(),
    region = atlasRegion(2, 3, 1, 0.006);
  door.repeat.fromArray(region.repeat);
  door.offset.fromArray(region.offset);
  door.needsUpdate = true;
  maps.push(door);
  make(door, 5.75, 5.75, 0, 2.875, -13.48).name = "illustrated-book-door";
  if (globalThis.document?.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.font = "500 92px Fraunces, Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#3c4945";
    context.fillText(AREAS[floor.index].name, 1024, 128, 1950);
    const inscription = new THREE.CanvasTexture(canvas);
    inscription.colorSpace = THREE.SRGBColorSpace;
    maps.push(inscription);
    make(inscription, 4.3, 0.54, 0, 5.25, -13.4).name = "doorway-inscription";
  }
  floor.group.traverse((object) => {
    if (
      object.name.startsWith("folded-vault-paper-panel-") ||
      [
        "structural-vault-rib",
        "creased-vault-rib-edges",
        "folded-paper-columns",
        "rolled-paper-rails-and-stems",
        "folded-paper-lanterns",
        "modeled-rune-grimoire",
        "sculptural-forge-runes",
      ].includes(object.name)
    )
      object.visible = false;
  });
  floor.stations.read.position.x = -4.8;
  floor.stations.forge.position.x = 4.8;
  const disposeFloor = floor.dispose.bind(floor);
  floor.dispose = () => {
    group.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const map of maps) map.dispose();
    disposeFloor();
  };
  floor.illustrated = group;
}
