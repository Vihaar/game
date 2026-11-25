import * as THREE from "three";
import { atlasRegion } from "./diorama-scenes.mjs";
import { AREAS } from "./areas.mjs";
import { libraryMoodProgress } from "./library-architecture.mjs";

function extinguishIllustratedLamps(material, progress) {
  if (!progress) return;
  material.userData.unlitLampCount = progress === 1 ? 4 : 2;
  material.customProgramCacheKey = () => `abandoned-paper-lamps-${progress}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.libraryAllLampsOut = { value: progress === 1 ? 1 : 0 };
    shader.fragmentShader =
      `uniform float libraryAllLampsOut;\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      vec2 libraryUv = vMapUv;
      float lampA = 1.0 - smoothstep(.72, 1.0, length((libraryUv - vec2(.141,.717)) / vec2(.034,.065)));
      float lampB = 1.0 - smoothstep(.72, 1.0, length((libraryUv - vec2(.197,.565)) / vec2(.033,.065)));
      float lampC = 1.0 - smoothstep(.72, 1.0, length((libraryUv - vec2(.860,.713)) / vec2(.034,.065)));
      float lampD = 1.0 - smoothstep(.72, 1.0, length((libraryUv - vec2(.809,.557)) / vec2(.033,.065)));
      vec3 paperSample = texture2D(map, libraryUv).rgb;
      float brightGlass = smoothstep(.17,.43,paperSample.r-paperSample.b) * smoothstep(.30,.65,paperSample.g);
      float lampsOut = clamp(lampA + lampD + (lampB + lampC) * libraryAllLampsOut, 0.0, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.065,.075,.10), lampsOut * brightGlass * .94);
    `,
    );
  };
}

// Individually illustrated surfaces occupy different depths inside actual rooms.
// These are stage objects, never a full-room background or camera-facing skybox.
export function dressLibraryFloor(floor, { shelf, canopy, props } = {}) {
  if (!shelf || !canopy || !props || floor.illustrated) return;
  const group = new THREE.Group();
  group.name = "illustrated-library-objects";
  floor.group.add(group);
  const progress = libraryMoodProgress(floor.index);
  const tint = new THREE.Color("#ffffff").lerp(
    new THREE.Color("#64617c"),
    progress * 0.9,
  );
  group.userData.moodProgress = progress;
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
    for (const [bay, z] of [8.4, 1, -6.4].entries()) {
      if (
        (progress >= 0.5 && side === 1 && bay === 1) ||
        (progress === 1 &&
          ((side === 1 && bay === 2) || (side === -1 && bay < 2)))
      )
        continue;
      const asset = make(shelf, 4.45, 6.1, side * 6.75, 3.05, z, side * -0.32);
      asset.name = "independent-illustrated-bookshelf";
      asset.rotation.z = side * progress * 0.045;
      asset.userData.abandoned = progress > 0;
    }
  for (const [bay, z] of [10.7, 3.4, -4.3, -11.6].entries()) {
    if ((progress >= 0.5 && bay === 2) || (progress === 1 && bay === 0))
      continue;
    const asset = make(canopy, 14.1, 7.94, 0, 4.0, z);
    asset.name = "independent-illustrated-canopy";
    extinguishIllustratedLamps(asset.material, progress);
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
      ].includes(object.name)
    )
      object.visible = progress > 0;
    if (
      [
        "folded-paper-lanterns",
        "unlit-paper-lanterns",
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

/** Separate reusable layers record a discovery without changing the illustration files. */
export function setLibraryKnowledgeScars(floor, families = []) {
  const fire = new Set(families).has("fire");
  if (!floor.knowledgeScars && !fire) return;
  if (!floor.knowledgeScars) {
    const group = new THREE.Group();
    group.name = "knowledge-fire-scars";
    const profile = new THREE.Shape();
    [
      [-1.05, -1.35],
      [-1.24, -0.8],
      [-1.15, -0.2],
      [-1.26, 0.24],
      [-0.9, 0.78],
      [-0.62, 1.05],
      [-0.2, 0.96],
      [0.24, 1.12],
      [0.76, 0.86],
      [1.05, 0.38],
      [0.92, -0.18],
      [1.17, -0.82],
      [0.71, -1.28],
      [0.2, -1.39],
      [-0.45, -1.22],
    ].forEach(([x, y], i) => (i ? profile.lineTo(x, y) : profile.moveTo(x, y)));
    profile.closePath();
    const charGeometry = new THREE.ShapeGeometry(profile);
    const charMaterial = new THREE.MeshBasicMaterial({
      color: "#26272b",
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: "#74472e",
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const shelfZ = libraryMoodProgress(floor.index) > 0 ? -6.29 : 1.08;
    for (const [material, scale, offset] of [
      [edgeMaterial, 0.9, 0],
      [charMaterial, 0.85, 0.025],
    ]) {
      const scar = new THREE.Mesh(charGeometry, material);
      scar.position.set(-6.58, 2.3, shelfZ + offset);
      scar.rotation.y = 0.32;
      scar.scale.setScalar(scale);
      group.add(scar);
    }
    const ashProfile = new THREE.Shape();
    ashProfile.moveTo(-0.12, -0.08);
    ashProfile.lineTo(0.04, -0.11);
    ashProfile.lineTo(0.13, 0.02);
    ashProfile.lineTo(0.03, 0.12);
    ashProfile.lineTo(-0.09, 0.06);
    ashProfile.closePath();
    const ashGeometry = new THREE.ShapeGeometry(ashProfile),
      ashMaterial = new THREE.MeshBasicMaterial({
        color: "#b4a89d",
        side: THREE.DoubleSide,
        toneMapped: false,
      });
    const ash = new THREE.InstancedMesh(ashGeometry, ashMaterial, 40);
    ash.name = "fallen-fire-ash";
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 40; i++) {
      dummy.position.set(
        -5.3 + Math.sin(i * 2.7) * (1.2 + (i % 3) * 0.2),
        0.035,
        1.8 + Math.cos(i * 1.8) * 2.5,
      );
      dummy.rotation.set(-Math.PI / 2, 0, i * 2.1);
      dummy.scale.setScalar(0.6 + (i % 4) * 0.23);
      dummy.updateMatrix();
      ash.setMatrixAt(i, dummy.matrix);
    }
    ash.instanceMatrix.needsUpdate = true;
    group.add(ash);
    floor.group.add(group);
    floor.knowledgeScars = group;
    const dispose = floor.dispose.bind(floor);
    floor.dispose = () => {
      group.removeFromParent();
      charGeometry.dispose();
      ashGeometry.dispose();
      charMaterial.dispose();
      edgeMaterial.dispose();
      ashMaterial.dispose();
      dispose();
    };
  }
  floor.knowledgeScars.visible = fire;
  floor.knowledgeScars.userData.families = fire ? ["fire"] : [];
}
