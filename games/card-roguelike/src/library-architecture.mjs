import * as THREE from "three";
import { paintWorldMaterial } from "./painted-world-material.mjs";

// Reuses the room/theme, paper-grain and shelf rhythm of this game's world.js.
// Geometry, instancing, extrusion and material rendering are Three.js 0.181.2:
// https://threejs.org/docs/#api/en/objects/InstancedMesh (Three MIT notice retained).
export const LIBRARY_FLOOR_THEMES = [
  "stacks",
  "fungus",
  "water",
  "glass",
  "stars",
  "press",
  "broken",
  "vault",
];
// The playable slice has three chapters; later internal rooms retain the final mood.
export const libraryMoodProgress = (index) =>
  Math.min(2, Math.max(0, Number(index) || 0)) / 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function shape(points) {
  const value = new THREE.Shape();
  points.forEach(([x, y], index) =>
    index ? value.lineTo(x, y) : value.moveTo(x, y),
  );
  value.closePath();
  return value;
}
function extrude(profile, depth) {
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 1,
    curveSegments: 18,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox,
    uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (uv.getX(i) - box.min.x) / Math.max(0.001, box.max.x - box.min.x),
      (uv.getY(i) - box.min.y) / Math.max(0.001, box.max.y - box.min.y),
    );
  return geometry;
}
function arch(span, height, spring, width) {
  const h = span / 2,
    s = new THREE.Shape();
  s.moveTo(-h, 0);
  s.lineTo(-h, spring);
  s.quadraticCurveTo(-h * 0.76, height * 0.91, 0, height);
  s.quadraticCurveTo(h * 0.76, height * 0.91, h, spring);
  s.lineTo(h, 0);
  s.lineTo(h - width, 0);
  s.lineTo(h - width, spring);
  s.quadraticCurveTo(h * 0.72, height * 0.91 - width, 0, height - width);
  s.quadraticCurveTo(-h * 0.72, height * 0.91 - width, -h + width, spring);
  s.lineTo(-h + width, 0);
  s.closePath();
  return s;
}
function piercedWall(width, height, opening, peak, spring) {
  const half = width / 2,
    hole = opening / 2,
    s = new THREE.Shape();
  s.moveTo(-half, 0);
  s.lineTo(-half, height);
  s.lineTo(half, height);
  s.lineTo(half, 0);
  s.lineTo(hole, 0);
  s.lineTo(hole, spring);
  s.quadraticCurveTo(hole * 0.76, peak * 0.91, 0, peak);
  s.quadraticCurveTo(-hole * 0.76, peak * 0.91, -hole, spring);
  s.lineTo(-hole, 0);
  s.closePath();
  return s;
}
function foldedLeaf() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.12, 0.23, 0, 0, 0.5, 0.065, 0, 0, 0, 0, 0.5, 0.065, 0.12,
        0.23, 0,
      ],
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [0.5, 0, 0, 0.5, 0.5, 1, 0.5, 0, 0.5, 1, 1, 0.5],
      2,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
function grainTexture() {
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i++) {
    const fiber = 248 + (((i * 67) ^ (i >> 3)) % 8);
    pixels.set([fiber, fiber, fiber - 1, 255], i * 4);
  }
  const texture = new THREE.DataTexture(pixels, 64, 64, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** One actual room and its upward staircase, all in shared world coordinates. */
export function createLibraryFloor(requestedIndex = 0) {
  const index = Math.max(0, Math.min(7, Math.trunc(requestedIndex) || 0)),
    progress = libraryMoodProgress(index);
  const baseY = index * 5,
    baseZ = -index * 36,
    theme = LIBRARY_FLOOR_THEMES[index];
  const group = new THREE.Group();
  group.name = `paper-library-${theme}`;
  group.position.set(0, baseY, baseZ);
  const ownTextures = new Set(),
    texture = grainTexture();
  ownTextures.add(texture);
  const materials = {
    paperMaterials: [],
    bookMaterials: [],
    panelMaterials: [],
    grimoireMaterials: [],
  };
  const paper = mix("#eadbc0", "#8b8399", progress),
    wall = mix("#d9c6a5", "#716b80", progress),
    trim = mix("#f2e7d1", "#a59ab5", progress);
  const ink = mix("#455762", "#28273d", progress),
    leafColor = mix("#6b8b62", "#645969", progress);
  function mat(color, extra = {}, bucket = "paperMaterials") {
    const material = new THREE.MeshStandardMaterial({
      color,
      map: texture,
      roughness: 0.98,
      metalness: 0,
      flatShading: true,
      ...extra,
    });
    paintWorldMaterial(material, {
      progress,
      seed: materials[bucket].length * 1.73 + index * 0.8,
    });
    materials[bucket].push(material);
    return material;
  }
  const floorMat = mat(paper),
    wallMat = mat(wall),
    trimMat = mat(trim),
    inkMat = mat(ink),
    whiteMat = mat("#ffffff");
  const pageMat = mat(mix("#f0e3cb", "#aca2af", progress));
  const foliageMat = mat("#ffffff", { side: THREE.DoubleSide });
  const lanternMat = mat(mix("#f5ca7c", "#be9dad", progress), {
    emissive: mix("#c48435", "#50455e", progress),
    emissiveIntensity: 0.27 * (1 - progress * 0.65),
  });
  const bookMats = Array.from({ length: 4 }, () =>
    mat(mix("#ffffff", "#9d98aa", progress), {}, "bookMaterials"),
  );
  const panelMats = Array.from({ length: 4 }, () =>
    mat(trim, {}, "panelMaterials"),
  );
  const grimoireMat = mat("#ffffff", {}, "grimoireMaterials");
  const cube = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 6),
    leafGeometry = foldedLeaf();
  const batches = new Map(),
    dummy = new THREE.Object3D();
  function batch(name, geometry, material) {
    const value = { name, geometry, material, items: [] };
    batches.set(name, value);
    return value;
  }
  function instance(
    target,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
    color,
  ) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    target.items.push({
      matrix: dummy.matrix.clone(),
      color: color && new THREE.Color(color),
    });
  }
  function beam(target, a, b, radius) {
    dummy.position.copy(a).add(b).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(Y_AXIS, b.clone().sub(a).normalize());
    dummy.scale.set(radius, a.distanceTo(b), radius);
    dummy.updateMatrix();
    target.items.push({ matrix: dummy.matrix.clone() });
  }
  function mesh(geometry, material, x, y, z, ry = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.rotation.y = ry;
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }
  const slabs = batch("cardstock-floor-and-stairs", cube, floorMat),
    boards = batch("layered-bookcase-boards", cube, trimMat);
  const rails = batch("rolled-paper-rails-and-stems", cylinder, inkMat),
    columns = batch(
      "folded-paper-columns",
      new THREE.CylinderGeometry(0.27, 0.34, 1, 8),
      trimMat,
    );
  const covers = bookMats.map((material, i) =>
    batch(`book-cover-pattern-${i}`, cube, material),
  );
  const spines = batch("dyed-book-spines", cube, whiteMat),
    pageEdges = batch("visible-book-page-edges", cube, pageMat),
    bands = batch("bookbinding-bands", cube, trimMat);
  const leaves = batch("folded-paper-leaves", leafGeometry, foliageMat),
    lanterns = batch(
      "folded-paper-lanterns",
      new THREE.CylinderGeometry(0.24, 0.3, 0.65, 6),
      lanternMat,
    );
  const unlitLanterns = batch(
    "unlit-paper-lanterns",
    lanterns.geometry,
    mat("#53515f"),
  );
  instance(slabs, 0, -0.16, 0, 18.5, 0.32, 28.5);
  for (const side of [-1, 1])
    instance(boards, side * 8.85, 0.17, 0, 0.24, 0.3, 28);
  for (let strip = 0; strip < 7; strip++)
    instance(boards, 0, 0.012, -12 + strip * 4, 4.6, 0.022, 0.04);
  // Real pierced walls and layered arches remain volumetric when viewed from the stairs.
  const endWall = extrude(piercedWall(18, 7, 4.7, 5.15, 3.1), 0.34);
  mesh(endWall, wallMat, 0, 0, -14.15);
  mesh(endWall, wallMat, 0, 0, 13.82);
  const doorFrame = extrude(arch(5.1, 5.45, 3.15, 0.19), 0.16);
  mesh(doorFrame, panelMats[index % 4], 0, 0, -13.9);
  mesh(doorFrame, trimMat, 0, 0, 13.72);
  const doorContours = batch(
    "layered-door-cardstock-contours",
    extrude(arch(5.6, 5.8, 3.16, 0.09), 0.1),
    whiteMat,
  );
  for (const z of [-13.75, 13.6])
    for (let layer = 0; layer < 2; layer++)
      instance(
        doorContours,
        0,
        0,
        z + layer * 0.1,
        1 - layer * 0.045,
        1 - layer * 0.025,
        1,
        0,
        0,
        0,
        layer ? ink : trim,
      );
  const nicheFrames = batch(
    "cut-paper-recessed-niche-frames",
    extrude(arch(2.6, 4.1, 2.3, 0.085), 0.1),
    whiteMat,
  );
  const nicheProfile = shape([
    [-0.98, 0],
    [-0.98, 2.1],
    [-0.7, 2.9],
    [0, 3.6],
    [0.7, 2.9],
    [0.98, 2.1],
    [0.98, 0],
  ]);
  const nichePanels = batch(
    "carved-cardstock-niche-reliefs",
    extrude(nicheProfile, 0.065),
    panelMats[1],
  );
  for (const side of [-1, 1]) {
    instance(nichePanels, side * 5.25, 0.8, -13.57);
    for (let layer = 0; layer < 3; layer++)
      instance(
        nicheFrames,
        side * 5.25,
        0.58,
        -13.46 + layer * 0.075,
        1 - layer * 0.045,
        1 - layer * 0.025,
        1,
        0,
        0,
        0,
        layer === 1 ? ink : trim,
      );
  }
  const windowWall = extrude(piercedWall(8.8, 4.8, 4.4, 4.35, 2.1), 0.27);
  const windowFrame = extrude(arch(4.7, 4.55, 2.12, 0.13), 0.09);
  for (const side of [-1, 1]) {
    instance(boards, side * 9.05, 1.05, 0, 0.32, 2.1, 28);
    for (let bay = 0; bay < 3; bay++) {
      const z = -9 + bay * 9;
      mesh(windowWall, wallMat, side * 9.05, 2.05, z, Math.PI / 2);
      mesh(windowFrame, panelMats[bay % 4], side * 8.87, 2.06, z, Math.PI / 2);
    }
  }
  const vaultRib = extrude(arch(13.8, 7.0, 4.2, 0.19), 0.21);
  const ribSeams = batch(
    "creased-vault-rib-edges",
    extrude(arch(13.5, 6.82, 4.17, 0.045), 0.04),
    inkMat,
  );
  for (const z of [-11, -3.5, 4, 11.5]) {
    mesh(vaultRib, trimMat, 0, 0, z).name = "structural-vault-rib";
    instance(ribSeams, 0, 0, z + 0.22);
    for (const side of [-1, 1]) {
      instance(columns, side * 6.86, 2.12, z, 1, 4.24, 1);
      instance(boards, side * 6.86, 0.14, z, 0.85, 0.28, 0.85);
      instance(boards, side * 6.86, 4.19, z, 0.72, 0.17, 0.72);
    }
  }
  const roofBatches = panelMats.map((material, i) =>
    batch(`folded-vault-paper-panel-${i}`, cube, material),
  );
  const roofPoints = [
    [-6.9, 4.3],
    [-3.45, 6.25],
    [0, 7.16],
    [3.45, 6.25],
    [6.9, 4.3],
  ];
  for (let segment = 0; segment < 4; segment++) {
    const [ax, ay] = roofPoints[segment],
      [bx, by] = roofPoints[segment + 1];
    for (let tile = 0; tile < 4; tile++)
      instance(
        roofBatches[(segment + tile) % 4],
        (ax + bx) / 2,
        (ay + by) / 2,
        -10.5 + tile * 7,
        Math.hypot(bx - ax, by - ay),
        0.055,
        7.02,
        0,
        0,
        Math.atan2(by - ay, bx - ax),
      );
  }
  // 640 books use a handful of instanced batches, with covers, pages and binding bands.
  const bookPalette = [
    "#748e81",
    "#657c8b",
    "#c49074",
    "#ad986f",
    "#8f829c",
    "#d0b790",
  ];
  for (const side of [-1, 1])
    for (let bay = 0; bay < 4; bay++) {
      if (
        (progress >= 0.5 && side === 1 && bay === 1) ||
        (progress === 1 && side === -1 && bay === 2)
      )
        continue;
      const z = -9 + bay * 6;
      for (let shelf = 0; shelf < 5; shelf++)
        instance(boards, side * 8.02, 0.22 + shelf * 0.82, z, 1.05, 0.11, 4.8);
      for (const end of [-1, 1])
        instance(boards, side * 8.02, 2.02, z + end * 2.4, 1.06, 4.0, 0.12);
      for (let shelf = 0; shelf < 4; shelf++)
        for (let bookIndex = 0; bookIndex < 20; bookIndex++) {
          if ((bookIndex * 7 + shelf * 3 + bay) % 10 < Math.round(progress * 6))
            continue;
          const height = 0.5 + ((bookIndex * 11 + shelf * 7 + bay) % 5) * 0.048;
          const bz = z - 2.14 + bookIndex * 0.224,
            by = 0.31 + shelf * 0.82 + height / 2;
          const tilt =
            (bookIndex % 7 === 0 ? 0.08 : 0) +
            Math.sin(bookIndex * 3 + bay) * progress * 0.16;
          const tint = mix(
            bookPalette[(bookIndex + shelf + bay) % bookPalette.length],
            "#4b435b",
            progress * 0.38,
          );
          instance(
            spines,
            side * 7.82,
            by,
            bz,
            0.62,
            height,
            0.175,
            tilt,
            0,
            0,
            tint,
          );
          instance(
            covers[(bookIndex + shelf) % 4],
            side * 7.82,
            by,
            bz - 0.094,
            0.64,
            height + 0.035,
            0.022,
            tilt,
          );
          instance(
            pageEdges,
            side * 7.82,
            by + height / 2 - 0.035,
            bz,
            0.54,
            0.035,
            0.135,
            tilt,
          );
          for (const band of [-1, 1])
            instance(
              bands,
              side * 7.49,
              by + band * height * 0.27,
              bz,
              0.025,
              0.024,
              0.175,
              tilt,
            );
        }
      // A few face-out volumes expose their generated full-cover designs in real 3D.
      if (progress < 0.5 || bay % 2 === 0) {
        instance(
          pageEdges,
          side * 7.47,
          2.34,
          z,
          0.76,
          0.94,
          0.13,
          0,
          (-side * Math.PI) / 2,
        );
        instance(
          covers[bay % 4],
          side * 7.38,
          2.34,
          z,
          0.8,
          0.99,
          0.032,
          0,
          (-side * Math.PI) / 2,
        );
      }
    }
  for (const side of [-1, 1])
    for (let strand = 0; strand < 4; strand++) {
      const z = -10.5 + strand * 7.3,
        points = [];
      for (let segment = 0; segment <= 9; segment++)
        points.push(
          vec(
            side * (6.55 - segment * 0.22 + Math.sin(segment) * 0.14),
            3.2 + segment * 0.18,
            z + Math.sin(segment * 0.6) * 0.24,
          ),
        );
      for (let i = 1; i < points.length; i++) {
        beam(rails, points[i - 1], points[i], 0.021);
        if (progress === 0 || i % (progress === 1 ? 3 : 2) === 0) {
          instance(
            leaves,
            points[i].x,
            points[i].y,
            points[i].z,
            1.05,
            0.95,
            1.05,
            0.3,
            i * 1.7,
            side * -0.75,
            leafColor,
          );
          instance(
            leaves,
            points[i].x + side * 0.08,
            points[i].y - 0.08,
            points[i].z + 0.11,
            0.85,
            0.9,
            0.85,
            -0.25,
            i * -1.3,
            side * 0.85,
            leafColor,
          );
        }
      }
    }
  for (const side of [-1, 1])
    for (const [lampIndex, z] of [-9.5, -1.5, 7].entries()) {
      const extinguished =
        progress === 1 ||
        (progress >= 0.5 && (lampIndex + (side === 1 ? 1 : 0)) % 2 === 0);
      instance(extinguished ? unlitLanterns : lanterns, side * 5.6, 4.05, z);
      beam(rails, vec(side * 5.6, 4.4, z), vec(side * 5.6, 5.8, z), 0.018);
      for (const y of [3.72, 4.38])
        instance(rails, side * 5.6, y, z, 0.31, 0.045, 0.31);
    }
  if (progress > 0) {
    const tornPage = extrude(
      shape([
        [-0.25, 0],
        [0.22, 0.03],
        [0.31, 0.18],
        [0.2, 0.22],
        [0.3, 0.3],
        [0.23, 0.46],
        [-0.23, 0.5],
        [-0.16, 0.31],
        [-0.27, 0.23],
      ]),
      0.008,
    );
    const torn = batch(
      "torn-hanging-pages",
      tornPage,
      mat(mix("#c8bba3", "#a49cab", progress)),
    );
    const fallen = batch("fallen-paper-fragments", tornPage, pageMat);
    for (let i = 0; i < Math.round(22 * progress); i++)
      instance(
        torn,
        (i % 2 ? 1 : -1) * (3.4 + (i % 4) * 0.48),
        3.55 - (i % 3) * 0.23,
        10 - i * 1.1,
        1.2,
        1.35,
        1,
        0.16,
        i * 1.1,
        Math.sin(i) * 0.28,
      );
    for (let i = 0; i < Math.round(38 * progress); i++)
      instance(
        fallen,
        (i % 2 ? 1 : -1) * (2.8 + (i % 5) * 0.42),
        0.045,
        11 - i * 0.59,
        1.5,
        1.4,
        1,
        -Math.PI / 2,
        0,
        i * 1.7,
      );
  }
  // Read and forge stations are modeled books and folded-paper plinths, not pictures.
  const pedestal = new THREE.CylinderGeometry(0.78, 0.92, 0.16, 8),
    pedestalStem = new THREE.CylinderGeometry(0.36, 0.62, 0.95, 8);
  for (const x of [-5.4, 5.4]) {
    mesh(pedestalStem, wallMat, x, 0.48, 2);
    mesh(pedestal, panelMats[index % 4], x, 1.03, 2);
    mesh(pedestal, trimMat, x, 0.12, 2);
  }
  const grimoire = new THREE.Group();
  grimoire.name = "modeled-rune-grimoire";
  grimoire.position.set(-5.4, 1.18, 2);
  grimoire.rotation.y = -0.16;
  group.add(grimoire);
  const bookBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.05, 1.48),
    inkMat,
  );
  bookBase.position.y = -0.08;
  bookBase.castShadow = true;
  grimoire.add(bookBase);
  for (const side of [-1, 1]) {
    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.59, 0.12, 1.37),
      pageMat,
    );
    pages.position.set(side * 0.3, 0.04, 0);
    pages.rotation.z = side * 0.16;
    pages.castShadow = true;
    pages.receiveShadow = true;
    grimoire.add(pages);
    const pageFace = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.012, 1.34),
      grimoireMat,
    );
    pageFace.position.set(side * 0.3, 0.106, 0);
    pageFace.rotation.z = side * 0.16;
    pageFace.receiveShadow = true;
    grimoire.add(pageFace);
  }
  const folds = batch(
    "sculptural-forge-runes",
    new THREE.OctahedronGeometry(0.25, 0),
    mat(mix("#dba780", "#9c88ac", progress)),
  );
  for (let i = 0; i < 5; i++)
    instance(
      folds,
      5.4 + Math.sin(i * 2.4) * 0.44,
      1.38 + i * 0.29,
      2 + Math.cos(i * 2.4) * 0.28,
      0.75,
      1.0,
      0.75,
      i * 0.3,
      i,
    );
  // Each chapter adds a distinct physical silhouette around the clear central route.
  if (theme === "fungus" || theme === "glass") {
    const tops = batch(
      "folded-paper-garden",
      theme === "fungus"
        ? new THREE.ConeGeometry(0.7, 0.32, 8)
        : new THREE.OctahedronGeometry(0.55, 0),
      mat(theme === "fungus" ? "#bac19b" : "#d6b2bd"),
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const x = side * (4.4 + (i % 2) * 0.35),
          z = -10 + i * 4.8;
        instance(tops, x, 0.95 + (i % 2) * 0.2, z, 1, 1, 1, 0, i);
        beam(rails, vec(x, 0, z), vec(x, 0.92, z), 0.07);
      }
  }
  if (theme === "water") {
    const water = mat("#77a6b1");
    for (const side of [-1, 1]) {
      const channel = mesh(
        extrude(
          shape([
            [-0.7, -11.8],
            [0.7, -11.8],
            [0.82, 11.8],
            [-0.82, 11.8],
          ]),
          0.055,
        ),
        water,
        side * 4.6,
        0.065,
        0,
      );
      channel.rotation.x = -Math.PI / 2;
    }
  }
  if (theme === "stars" || theme === "vault") {
    const rings = batch(
      "paper-orrery-rings",
      new THREE.TorusGeometry(1, 0.023, 5, 60),
      mat("#b6a3ce"),
    );
    for (let i = 0; i < 4; i++)
      instance(
        rings,
        0,
        5.15,
        -5.5,
        1.35 + i * 0.3,
        1.35 + i * 0.3,
        1.35 + i * 0.3,
        i * 0.6,
        i * 0.5,
        0.3,
      );
    for (let i = 0; i < 16; i++)
      instance(
        folds,
        Math.sin(i * 2.3) * 4.2,
        4.9 + (i % 3) * 0.35,
        -5.5 + Math.cos(i * 1.7) * 4,
        0.24,
        0.24,
        0.24,
        i,
        i,
      );
  }
  if (theme === "press") {
    const rollers = batch(
      "paper-redaction-rollers",
      new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8),
      mat("#8b6c77"),
    );
    for (const side of [-1, 1])
      for (const z of [-7, 6]) {
        instance(boards, side * 4.7, 0.3, z, 2.3, 0.6, 2.2);
        for (let i = 0; i < 3; i++)
          instance(
            rollers,
            side * 4.7,
            0.92,
            z - 0.65 + i * 0.65,
            1,
            1,
            1,
            0,
            0,
            Math.PI / 2,
          );
      }
  }
  if (theme === "broken")
    for (let i = 0; i < 28; i++)
      instance(
        leaves,
        Math.sin(i * 2.7) * 4.7,
        0.06 + (i % 3) * 0.02,
        -11 + i * 0.82,
        2.3,
        1.6,
        1.3,
        -Math.PI / 2,
        0,
        i * 1.4,
        "#bca7b0",
      );
  // The next room starts 36m behind this one and 5m higher: 20 real 25cm steps.
  if (index < 7) {
    for (let step = 0; step < 20; step++) {
      const h = (step + 1) * 0.25;
      instance(slabs, 0, h / 2, -14.2 - step * 0.4, 4.2, h, 0.4);
    }
    for (const side of [-1, 1]) {
      for (let post = 0; post <= 5; post++) {
        const z = -14 - post * 1.6,
          y = post;
        beam(
          rails,
          vec(side * 2.25, y, z),
          vec(side * 2.25, y + 0.95, z),
          0.045,
        );
      }
      beam(
        rails,
        vec(side * 2.25, 0.95, -14),
        vec(side * 2.25, 5.95, -22),
        0.055,
      );
    }
  }
  const counts = {};
  for (const entry of batches.values()) {
    if (!entry.items.length) continue;
    const instances = new THREE.InstancedMesh(
      entry.geometry,
      entry.material,
      entry.items.length,
    );
    instances.name = entry.name;
    instances.castShadow = true;
    instances.receiveShadow = true;
    entry.items.forEach((item, i) => {
      instances.setMatrixAt(i, item.matrix);
      if (item.color) instances.setColorAt(i, item.color);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    group.add(instances);
    counts[entry.name] = entry.items.length;
  }
  const world = (x, y, z) => vec(x, baseY + y, baseZ + z);
  const battleCamera = world(0, 1.7, 5.5),
    battleTarget = world(0, 1.65, -3);
  const floor = {
    group,
    index,
    theme,
    moodProgress: progress,
    baseY,
    baseZ,
    materials,
    counts,
    entrance: world(0, 1.7, 12),
    exploreCamera: world(0, 1.7, 8),
    battleCamera,
    battleTarget,
    exit: world(0, 1.7, -13),
    stations: {
      read: {
        position: world(-5.4, 2.35, 2),
        camera: world(-2.8, 1.7, 6),
        lookAt: world(-5.4, 1.35, 2),
      },
      forge: {
        position: world(5.4, 2.7, 2),
        camera: world(2.8, 1.7, 6),
        lookAt: world(5.4, 1.7, 2),
      },
      binding: {
        position: world(0, 4.7, -12.8),
        camera: battleCamera.clone(),
        lookAt: battleTarget.clone(),
      },
    },
    routeToNext:
      index < 7
        ? [
            world(0, 1.7, -13),
            world(0, 1.7, -14),
            ...Array.from({ length: 4 }, (_, i) =>
              world(0, 2.95 + i * 1.25, -16 - i * 2),
            ),
            world(0, 6.7, -24),
          ]
        : [],
    setTextures(textures) {
      applyLibraryTextures(floor, textures);
      return floor;
    },
    dispose() {
      const geometries = new Set(),
        values = new Set();
      group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material)
          for (const value of Array.isArray(object.material)
            ? object.material
            : [object.material])
            values.add(value);
      });
      for (const bucket of Object.values(materials))
        for (const value of bucket) values.add(value);
      for (const geometry of geometries) geometry.dispose();
      for (const value of values) value.dispose();
      for (const value of ownTextures) value.dispose();
      group.removeFromParent();
    },
    _ownTextures: ownTextures,
    _textureSources: {},
    _textureClones: {},
  };
  return floor;
}

/** AI images are material maps on the modeled objects; no room image is rendered. */
export function applyLibraryTextures(
  floor,
  { paper, books, panels, grimoire } = {},
) {
  function changed(key, source) {
    if (!source || floor._textureSources[key] === source) return false;
    for (const old of floor._textureClones[key] ?? []) {
      old.dispose();
      floor._ownTextures.delete(old);
    }
    floor._textureClones[key] = [];
    floor._textureSources[key] = source;
    return true;
  }
  function copy(source, region, repeat = 1, key) {
    const texture = source.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    if (region) {
      const [x, y, w, h] = region,
        inset = 0.003;
      texture.repeat.set(w - inset * 2, h - inset * 2);
      texture.offset.set(x + inset, 1 - y - h + inset);
    } else if (repeat !== 1) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
    }
    texture.needsUpdate = true;
    floor._ownTextures.add(texture);
    if (key) floor._textureClones[key].push(texture);
    return texture;
  }
  if (changed("paper", paper)) {
    const texture = copy(paper, null, 2, "paper");
    for (const material of floor.materials.paperMaterials) {
      material.map = texture;
      material.needsUpdate = true;
    }
  }
  for (const [key, source, target] of [
    ["books", books, floor.materials.bookMaterials],
    ["panels", panels, floor.materials.panelMaterials],
  ])
    if (changed(key, source)) {
      target.forEach((material, i) => {
        const region = source.userData?.regions?.[i] ?? [
          (i % 2) / 2,
          Math.floor(i / 2) / 2,
          0.5,
          0.5,
        ];
        material.map = copy(source, region, 1, key);
        material.needsUpdate = true;
      });
    }
  if (changed("grimoire", grimoire)) {
    const texture = copy(grimoire, null, 1, "grimoire");
    for (const material of floor.materials.grimoireMaterials) {
      material.map = texture;
      material.needsUpdate = true;
    }
  }
  return floor;
}
