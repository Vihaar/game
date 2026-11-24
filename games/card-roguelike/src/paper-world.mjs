import * as THREE from "three";

// Paper reliefs reuse Three's ExtrudeGeometry/Shape, not a second rendering engine.
// https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry
const ink = "#4a5960",
  paper = "#f1e4cd",
  edge = "#c9ac82",
  moss = "#728c78",
  coral = "#cd8b6c";
function material(color, extra = {}) {
  const value = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    toneMapped: false,
    ...extra,
  });
  value.userData.baseOpacity = value.opacity;
  return value;
}
function polygon(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  return shape;
}
function relief(shape, depth, color, parent) {
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 16,
    }),
    [material(color), material(edge)],
  );
  parent.add(mesh);
  return mesh;
}
function book(parent, width, height, depth, color) {
  const group = new THREE.Group();
  parent.add(group);
  const cover = polygon([
    [-width / 2, 0],
    [-width / 2, height - 0.06],
    [-width / 2 + 0.06, height],
    [width / 2, height],
    [width / 2, 0],
  ]);
  relief(cover, depth, color, group);
  const pages = relief(
    polygon([
      [-width / 2 + 0.05, 0.06],
      [-width / 2 + 0.05, height - 0.08],
      [width / 2 - 0.04, height - 0.08],
      [width / 2 - 0.04, 0.06],
    ]),
    depth * 0.84,
    paper,
    group,
  );
  pages.position.z = depth * 0.07;
  for (const y of [height * 0.24, height * 0.73]) {
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, 0.035),
      material("#b8a685"),
    );
    band.position.set(0, y, depth + 0.002);
    group.add(band);
  }
  return group;
}
function paperGrain() {
  const size = 64,
    pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const fiber = 249 + (((i * 73) ^ (i >> 2)) % 7);
    pixels.set([fiber, fiber, fiber - 2, 255], i * 4);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export function createPaperWorld(area, index = 0) {
  const group = new THREE.Group(),
    texture = paperGrain();
  const progress = Math.max(0, Math.min(1, index / 7));
  const floorColor = new THREE.Color(area.paper || paper).lerp(
    new THREE.Color("#625969"),
    progress * 0.28,
  );
  const pathColor = new THREE.Color("#f4e7d1").lerp(
    new THREE.Color("#6d6579"),
    progress * 0.78,
  );
  group.name = "layered-paper-world";
  const ground = relief(
    polygon([
      [-22, -26],
      [22, -26],
      [22, 9],
      [-22, 9],
    ]),
    0.12,
    floorColor,
    group,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 1.16;
  ground.material[0].map = texture;
  const path = relief(
    polygon([
      [-5.7, -26],
      [5.7, -26],
      [2.1, 8],
      [-2.1, 8],
    ]),
    0.035,
    pathColor,
    group,
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 1.3;
  path.material[0].map = texture;
  // Visible thin page seams give the path depth without covering the illustrated architecture.
  for (let i = 0; i < 10; i++) {
    const seam = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5 + i * 0.11, 0.014),
      material("#d9c5a6", { opacity: 0.48 }),
    );
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(Math.sin(i * 1.3) * 0.09, 1.339, -6 + i * 2.25);
    group.add(seam);
  }
  // Small book-built shelves sit at the edges; there are no opaque curtain wings.
  for (const side of [-1, 1]) {
    const shelf = new THREE.Group();
    shelf.position.set(side * 7.0, 1.3, -1.3);
    shelf.rotation.y = side * -0.18;
    group.add(shelf);
    for (let row = 0; row < 1; row++) {
      const board = relief(
        polygon([
          [-1.4, 0],
          [1.4, 0],
          [1.4, 0.09],
          [-1.4, 0.09],
        ]),
        0.85,
        edge,
        shelf,
      );
      board.position.set(0, row * 1.35, -0.25);
      for (let i = 0; i < 4; i++) {
        if (index >= 5 && i === 1) continue;
        const volume = book(
          shelf,
          0.36 + (i % 2) * 0.05,
          0.85 + ((i + index) % 3) * 0.1,
          0.48,
          [ink, moss, coral, "#a49ab0"][(i + index + row) % 4],
        );
        volume.position.set(-1.05 + i * 0.49, row * 1.35 + 0.1, -0.12);
        volume.rotation.z = ((i % 3) - 1) * (0.045 + progress * 0.11);
      }
    }
  }
  const read = new THREE.Group();
  group.add(read);
  const desk = book(read, 1.7, 1.2, 0.17, ink);
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(0, 0.62, 0.4);
  for (const side of [-1, 1]) {
    const leaf = relief(
      polygon([
        [0, 0],
        [side * 0.82, 0.1],
        [side * 0.82, 1.05],
        [0, 0.94],
      ]),
      0.045,
      paper,
      read,
    );
    leaf.rotation.set(-0.94, side * -0.12, 0);
    leaf.position.set(0, 0.74, 0.36);
    for (let line = 0; line < 5; line++) {
      const rule = new THREE.Mesh(
        new THREE.PlaneGeometry(0.53, 0.012),
        material("#baa58a", { opacity: 0.65 }),
      );
      rule.position.set(side * 0.42, 0.25 + line * 0.12, 0.049);
      leaf.add(rule);
    }
  }
  const forge = new THREE.Group();
  group.add(forge);
  const plinth = book(forge, 1.6, 1.15, 0.2, moss);
  plinth.rotation.x = -Math.PI / 2;
  plinth.position.set(0, 0.55, 0.4);
  for (let i = 0; i < 3; i++) {
    const card = relief(
      polygon([
        [-0.45, 0],
        [0.45, 0],
        [0.45, 0.72],
        [-0.45, 0.72],
      ]),
      0.028,
      [paper, "#b8c7af", "#e5b89d"][i],
      forge,
    );
    card.rotation.set(-Math.PI / 2 + i * 0.055, 0, (i - 1) * 0.22);
    card.position.set((i - 1) * 0.21, 0.72 + i * 0.05, 0.25);
  }
  const foldGeometry = new THREE.OctahedronGeometry(0.35, 0),
    foldColors = [];
  const foldPalette = ["#e7b29b", "#b98472", "#f1d1b2"].map(
    (color) => new THREE.Color(color),
  );
  for (
    let vertex = 0;
    vertex < foldGeometry.attributes.position.count;
    vertex++
  ) {
    const color = foldPalette[Math.floor(vertex / 3) % foldPalette.length];
    foldColors.push(color.r, color.g, color.b);
  }
  foldGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(foldColors, 3),
  );
  const foldedSpell = new THREE.Mesh(
    foldGeometry,
    material("#ffffff", { vertexColors: true }),
  );
  foldedSpell.position.set(0, 1.35, 0);
  foldedSpell.rotation.set(0.3, 0.5, 0.2);
  forge.add(foldedSpell);
  const binding = new THREE.Group();
  group.add(binding);
  const arch = (width, height, thickness) => {
    const s = new THREE.Shape(),
      half = width / 2,
      shoulder = height * 0.64;
    s.moveTo(-half, 0);
    s.lineTo(-half, shoulder);
    s.bezierCurveTo(-half, height, half, height, half, shoulder);
    s.lineTo(half, 0);
    s.lineTo(half - thickness, 0);
    s.lineTo(half - thickness, shoulder);
    s.bezierCurveTo(
      half - thickness,
      height - thickness,
      -half + thickness,
      height - thickness,
      -half + thickness,
      shoulder,
    );
    s.lineTo(-half + thickness, 0);
    s.closePath();
    return s;
  };
  relief(arch(3.7, 4.0, 0.16), 0.13, edge, binding);
  const face = relief(arch(3.4, 3.83, 0.08), 0.035, "#f5e7cc", binding);
  face.position.z = 0.15;
  const ribbon = relief(
    polygon([
      [-0.09, 0],
      [0.09, 0],
      [0.09, 0.65],
      [0, 0.55],
      [-0.09, 0.65],
    ]),
    0.025,
    coral,
    binding,
  );
  ribbon.position.set(0, 3.65, 0.18);
  const markers = [];
  for (const object of [read, forge, binding]) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.25, 24),
      material("#d5a36e", { opacity: 0.8 }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(0, 0.03, 0.55);
    object.add(marker);
    markers.push(marker);
  }
  const anchors = {
    read: new THREE.Object3D(),
    forge: new THREE.Object3D(),
    binding: new THREE.Object3D(),
  };
  anchors.read.position.set(0, 1.75, 0.15);
  read.add(anchors.read);
  anchors.forge.position.set(0, 1.9, 0.15);
  forge.add(anchors.forge);
  anchors.binding.position.set(0, 4.25, 0.1);
  binding.add(anchors.binding);
  const layout = (compact) => {
    read.position.set(compact ? -2.35 : -4.3, 1.34, compact ? 1.6 : 2.3);
    forge.position.set(compact ? 2.35 : 4.3, 1.34, compact ? 1.6 : 2.3);
    read.scale.setScalar(compact ? 0.85 : 1);
    forge.scale.setScalar(compact ? 0.85 : 1);
    binding.position.set(0, 1.34, -3.5);
    binding.scale.setScalar(compact ? 0.92 : 1);
  };
  layout(false);
  return { group, anchors, markers, texture, layout };
}
