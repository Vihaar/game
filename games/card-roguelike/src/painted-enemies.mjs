import * as THREE from "three";

// Original painted-fantasy silhouettes assembled as independent Three.js shapes.
// Shape/Curve/ShapeGeometry, DataTexture and vertex colors reuse Three.js (MIT).
const TYPES = ["inkling", "eater", "warden", "scribe", "bell", "unbinder"];
const PALETTES = {
  inkling: {
    cloth: 0x4e5577,
    shade: 0x303950,
    light: 0x8493ab,
    skin: 0xe3c399,
    accent: 0xb9935f,
  },
  eater: {
    cloth: 0x64735b,
    shade: 0x374b42,
    light: 0x9ea784,
    skin: 0xcbb88d,
    accent: 0x97675c,
  },
  warden: {
    cloth: 0x657366,
    shade: 0x3c514d,
    light: 0xabb29b,
    skin: 0xd7b28c,
    accent: 0xb49b67,
  },
  scribe: {
    cloth: 0x596f79,
    shade: 0x344958,
    light: 0x9db4b1,
    skin: 0xe0c7a6,
    accent: 0xa98363,
  },
  bell: {
    cloth: 0x81666f,
    shade: 0x4e3e52,
    light: 0xb69a9a,
    skin: 0xdfc4a2,
    accent: 0xc9a05c,
  },
  unbinder: {
    cloth: 0x665979,
    shade: 0x362f4e,
    light: 0xa79ab5,
    skin: 0xb7a9bb,
    accent: 0xc4a477,
  },
};
const INK = 0x463b40;
function shape(commands) {
  const s = new THREE.Shape();
  for (const [op, ...p] of commands) {
    if (op === "M") s.moveTo(...p);
    if (op === "L") s.lineTo(...p);
    if (op === "Q") s.quadraticCurveTo(...p);
    if (op === "C") s.bezierCurveTo(...p);
    if (op === "Z") s.closePath();
  }
  return s;
}
function oval(x, y, rx, ry) {
  const s = new THREE.Shape();
  s.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
}
function random(i) {
  let x = Math.imul(i + 1741, 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function pigment() {
  const n = 128,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        v = Math.round(225 + random(i) * 25 + Math.sin(x * 0.2 + y * 0.1) * 3);
      data[i * 4] = Math.min(255, v + 4);
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = Math.max(0, v - 7);
      data[i * 4 + 3] = 255;
    }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
export function createPaintedEnemy(type, { boss = false } = {}) {
  type = TYPES.includes(type) ? type : "inkling";
  boss = boss || type === "unbinder";
  const palette = PALETTES[type],
    group = new THREE.Group(),
    cloth = new THREE.Group(),
    head = new THREE.Group(),
    arms = [new THREE.Group(), new THREE.Group()],
    prop = new THREE.Group();
  group.name = `painted-${type}`;
  group.add(cloth, head, ...arms, prop);
  head.position.set(0, 1.96, 0.07);
  arms[0].position.set(-0.48, 1.36, 0.02);
  arms[1].position.set(0.48, 1.36, 0.04);
  prop.position.set(0, 0.95, 0.16);
  const texture = pigment(),
    materials = new Set(),
    geometries = new Set();
  let order = 0,
    disposed = false;
  function material(color, opacity = 1, paint = true) {
    const m = new THREE.MeshBasicMaterial({
      color,
      map: paint ? texture : null,
      vertexColors: paint,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      toneMapped: false,
    });
    m.userData.baseOpacity = opacity;
    m.userData.originalColor = color;
    materials.add(m);
    return m;
  }
  function ink(parent, paths, color = INK, opacity = 0.68) {
    const points = [];
    for (const path of paths) {
      const p = path.getPoints(24);
      for (let i = 1; i < p.length; i++)
        points.push(p[i - 1].x, p[i - 1].y, 0, p[i].x, p[i].y, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    geometries.add(geometry);
    const m = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    m.userData.baseOpacity = opacity;
    materials.add(m);
    const mesh = new THREE.LineSegments(geometry, m);
    mesh.position.z = 0.012 + order * 0.001;
    mesh.renderOrder = order++;
    parent.add(mesh);
    return mesh;
  }
  function wash(
    parent,
    paths,
    color,
    { outline = false, opacity = 1, name = "", fade = null } = {},
  ) {
    const geometry = new THREE.ShapeGeometry(paths, 24),
      pos = geometry.getAttribute("position"),
      colors = [],
      uv = geometry.getAttribute("uv");
    let minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      minY = Math.min(minY, pos.getY(i));
      maxY = Math.max(maxY, pos.getY(i));
    }
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) - minY) / Math.max(0.001, maxY - minY),
        edge =
          0.83 + t * 0.18 + Math.sin(pos.getX(i) * 8 + pos.getY(i) * 4) * 0.025;
      colors.push(edge, edge * 0.985, edge * 0.96);
      if (fade)
        colors.push(
          fade === "right"
            ? Math.max(0, Math.min(1, (pos.getX(i) + 0.08) / 0.48))
            : Math.max(0, Math.min(1, (0.12 - pos.getX(i)) / 0.5)),
        );
      uv.setXY(i, pos.getX(i) * 0.75, pos.getY(i) * 0.75);
    }
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, fade ? 4 : 3),
    );
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    mesh.name = name;
    mesh.position.z = order * 0.001;
    mesh.renderOrder = order++;
    parent.add(mesh);
    if (outline) ink(parent, Array.isArray(paths) ? paths : [paths]);
    return mesh;
  }
  // Curved ragged cloak. Its asymmetry and separate light washes carry the paint.
  const robe = shape([
    ["M", -0.78, 0.03],
    ["C", -0.55, 0.38, -0.81, 0.92, -0.54, 1.44],
    ["Q", -0.42, 1.72, -0.18, 1.74],
    ["Q", 0.2, 1.9, 0.49, 1.55],
    ["C", 0.78, 1.1, 0.58, 0.61, 0.91, 0.11],
    ["Q", 0.48, 0.22, 0.28, 0.02],
    ["Q", 0.1, 0.16, -0.04, 0.03],
    ["Q", -0.35, 0.2, -0.78, 0.03],
    ["Z"],
  ]);
  wash(cloth, robe, palette.cloth, { outline: true, name: "cloak-silhouette" });
  wash(
    cloth,
    shape([
      ["M", -0.18, 1.62],
      ["C", -0.4, 1.16, -0.12, 0.69, -0.51, 0.18],
      ["Q", -0.07, 0.43, 0.16, 0.07],
      ["C", 0.36, 0.63, 0.22, 1.22, 0.37, 1.64],
      ["Z"],
    ]),
    palette.shade,
    { name: "cloak-shadow-wash" },
  );
  wash(
    cloth,
    shape([
      ["M", -0.39, 1.51],
      ["Q", -0.25, 0.96, -0.61, 0.18],
      ["C", -0.31, 0.4, -0.2, 1.05, -0.1, 1.65],
      ["Z"],
    ]),
    palette.light,
    { opacity: 0.45, name: "cloth-edge-light" },
  );
  wash(
    cloth,
    shape([
      ["M", 0.34, 1.64],
      ["Q", 0.33, 0.94, 0.7, 0.2],
      ["Q", 0.54, 0.83, 0.58, 1.42],
      ["Z"],
    ]),
    palette.accent,
    { opacity: 0.55, name: "painted-lapel" },
  );
  for (let side = 0; side < 2; side++) {
    const sign = side ? 1 : -1;
    wash(
      arms[side],
      shape([
        ["M", -0.05, 0.24],
        ["C", sign * 0.38, 0.28, sign * 0.51, -0.05, sign * 0.38, -0.43],
        ["Q", sign * 0.19, -0.56, -0.1, -0.33],
        ["Q", -0.15, -0.02, -0.05, 0.24],
        ["Z"],
      ]),
      palette.cloth,
      { outline: side === 1, name: "sleeve" },
    );
  }
  // Hood and face are separately mounted, so a hit can nod without moving the robe.
  wash(
    head,
    shape([
      ["M", -0.56, -0.28],
      ["C", -0.68, 0.13, -0.39, 0.51, -0.05, 0.55],
      ["C", 0.3, 0.55, 0.61, 0.21, 0.56, -0.28],
      ["Q", 0.36, -0.57, 0, -0.5],
      ["Q", -0.4, -0.49, -0.56, -0.28],
      ["Z"],
    ]),
    palette.shade,
    { outline: true, name: "hood-outer" },
  );
  wash(
    head,
    shape([
      ["M", -0.49, -0.2],
      ["C", -0.49, 0.18, -0.31, 0.42, -0.04, 0.46],
      ["Q", 0.39, 0.43, 0.48, -0.12],
      ["Q", 0.16, 0.18, -0.04, 0.2],
      ["Q", -0.27, 0.14, -0.49, -0.2],
      ["Z"],
    ]),
    palette.cloth,
    { name: "hood-fold" },
  );
  wash(
    head,
    shape([
      ["M", -0.35, 0.1],
      ["Q", -0.03, 0.25, 0.31, 0.12],
      ["Q", 0.4, -0.11, 0.19, -0.32],
      ["Q", -0.01, -0.46, -0.25, -0.29],
      ["Q", -0.4, -0.12, -0.35, 0.1],
      ["Z"],
    ]),
    palette.skin,
    { outline: true, name: "face" },
  );
  wash(
    head,
    shape([
      ["M", -0.07, 0.16],
      ["Q", 0.28, 0.22, 0.34, 0.08],
      ["Q", 0.39, -0.14, 0.15, -0.33],
      ["Q", 0.04, -0.4, -0.03, -0.32],
      ["Q", 0.16, -0.15, -0.07, 0.16],
      ["Z"],
    ]),
    type === "unbinder" ? 0x625568 : 0x9c7661,
    { opacity: 0.7, fade: "right", name: "directional-cheek-shadow" },
  );
  wash(
    head,
    shape([
      ["M", -0.3, 0.09],
      ["Q", -0.17, 0.2, 0.02, 0.14],
      ["Q", -0.11, -0.02, -0.02, -0.18],
      ["Q", -0.2, -0.14, -0.31, -0.19],
      ["Z"],
    ]),
    type === "unbinder" ? 0xd9ccda : 0xffdfb0,
    { opacity: 0.58, fade: "left", name: "forehead-painted-light" },
  );
  wash(
    head,
    shape([
      ["M", -0.53, -0.18],
      ["C", -0.52, 0.18, -0.32, 0.42, -0.09, 0.47],
      ["Q", -0.37, 0.31, -0.4, -0.07],
      ["Z"],
    ]),
    palette.light,
    { opacity: 0.5, name: "hood-rim-wash" },
  );
  wash(
    head,
    [oval(-0.23, -0.2, 0.075, 0.04), oval(0.22, -0.19, 0.07, 0.04)],
    0xb98479,
    {
      opacity: type === "unbinder" ? 0 : type === "inkling" ? 0.23 : 0.12,
      name: "cheek-pigment",
    },
  );
  const slant = type === "warden" ? 0.012 : type === "eater" ? -0.018 : 0;
  const eyeHeight =
    type === "warden"
      ? 0.032
      : type === "bell"
        ? 0.027
        : type === "unbinder"
          ? 0.045
          : 0.052;
  wash(
    head,
    [
      oval(-0.145, -0.065 + slant, 0.071, eyeHeight),
      oval(0.15, -0.065 - slant, 0.071, type === "scribe" ? 0.029 : eyeHeight),
    ],
    type === "unbinder" ? 0x3a3449 : 0xf0e2c2,
    { name: "eye-whites" },
  );
  const pupils = wash(
    head,
    [
      oval(
        -0.125,
        -0.068 + slant,
        type === "unbinder" ? 0.016 : 0.028,
        type === "warden" || type === "bell" ? 0.024 : 0.041,
      ),
      oval(
        0.13,
        -0.068 - slant,
        type === "unbinder" ? 0.016 : 0.028,
        type === "warden" || type === "bell" ? 0.024 : 0.041,
      ),
    ],
    type === "unbinder" ? 0xe2d6c1 : 0x343744,
    { name: "eyes" },
  );
  wash(
    head,
    [
      oval(-0.114, -0.05 + slant, 0.009, 0.014),
      oval(0.141, -0.05 - slant, 0.009, 0.014),
    ],
    0xfff4d6,
    { name: "eye-highlights" },
  );
  const browLeft = shape([
      ["M", -0.235, 0.02],
      ["Q", -0.15, type === "warden" ? 0.0 : 0.072, -0.06, 0.012],
    ]),
    browRight = shape([
      ["M", 0.06, 0.012],
      ["Q", 0.16, 0.055, 0.24, 0.02],
    ]),
    nose = shape([
      ["M", 0.005, -0.08],
      ["Q", -0.045, -0.17, 0.02, -0.17],
    ]),
    mouth = shape([
      ["M", -0.09, -0.24],
      [
        "Q",
        0.0,
        type === "eater"
          ? -0.34
          : type === "warden" || type === "scribe"
            ? -0.2
            : type === "unbinder"
              ? -0.245
              : -0.265,
        0.1,
        -0.235,
      ],
    ]);
  ink(head, [browLeft, browRight, nose, mouth], INK, 0.78);
  if (type === "warden")
    wash(
      head,
      shape([
        ["M", -0.25, -0.23],
        ["Q", -0.05, -0.34, 0.22, -0.22],
        ["L", 0.17, -0.44],
        ["Q", 0, -0.56, -0.21, -0.39],
        ["Z"],
      ]),
      0x9b9984,
      { opacity: 0.85, name: "weathered-beard" },
    );
  if (type === "unbinder")
    ink(
      head,
      [
        shape([
          ["M", -0.21, 0.17],
          ["L", -0.17, 0.02],
          ["L", -0.2, -0.1],
        ]),
        shape([
          ["M", 0.22, -0.18],
          ["L", 0.15, -0.27],
          ["L", 0.17, -0.34],
        ]),
      ],
      0x65536c,
      0.45,
    );
  // Batched pen hatching follows actual folds, rather than covering the face in noise.
  const hatches = [];
  for (let i = 0; i < 13; i++) {
    const x = (i < 7 ? -0.45 : 0.37) + (i % 7) * 0.018,
      y = 0.37 + (i % 7) * 0.083;
    hatches.push(
      shape([
        ["M", x, y],
        ["L", x + 0.075, y + 0.04],
      ]),
    );
  }
  ink(cloth, hatches, palette.shade, 0.26);
  function book() {
    wash(
      prop,
      shape([
        ["M", -0.5, -0.16],
        ["L", 0, -0.27],
        ["L", 0.51, -0.1],
        ["L", 0.48, 0.22],
        ["L", 0, 0.08],
        ["L", -0.47, 0.24],
        ["Z"],
      ]),
      palette.accent,
      { outline: true, name: "book-cover" },
    );
    wash(
      prop,
      shape([
        ["M", -0.45, -0.09],
        ["Q", -0.22, -0.04, 0, -0.18],
        ["L", 0, 0.12],
        ["Q", -0.23, 0.28, -0.43, 0.25],
        ["Z"],
      ]),
      0xe4d3ac,
      { name: "book-left-pages" },
    );
    wash(
      prop,
      shape([
        ["M", 0, -0.18],
        ["Q", 0.25, -0.07, 0.46, -0.04],
        ["L", 0.43, 0.27],
        ["Q", 0.22, 0.26, 0, 0.12],
        ["Z"],
      ]),
      0xf3e5c6,
      { name: "book-right-pages" },
    );
    ink(
      prop,
      [
        shape([
          ["M", 0, -0.16],
          ["L", 0, 0.12],
        ]),
        ...[-0.01, 0.07, 0.15].map((y) =>
          shape([
            ["M", -0.37, y],
            ["Q", -0.2, y - 0.03, -0.07, y - 0.1],
          ]),
        ),
        ...[-0.02, 0.06, 0.14].map((y) =>
          shape([
            ["M", 0.07, y - 0.1],
            ["Q", 0.24, y - 0.02, 0.36, y],
          ]),
        ),
      ],
      0x8a765b,
      0.52,
    );
  }
  function shield() {
    wash(
      prop,
      shape([
        ["M", -0.1, 0.48],
        ["Q", 0.22, 0.59, 0.62, 0.48],
        ["L", 0.58, -0.04],
        ["Q", 0.48, -0.4, 0.23, -0.59],
        ["Q", -0.09, -0.39, -0.13, -0.04],
        ["Z"],
      ]),
      palette.accent,
      { outline: true, name: "shield-rim" },
    );
    wash(
      prop,
      shape([
        ["M", -0.035, 0.4],
        ["Q", 0.24, 0.48, 0.54, 0.4],
        ["L", 0.5, -0.02],
        ["Q", 0.42, -0.3, 0.23, -0.47],
        ["Q", 0.01, -0.26, -0.05, -0.01],
        ["Z"],
      ]),
      palette.shade,
      { name: "shield-painted-face" },
    );
    wash(
      prop,
      shape([
        ["M", 0.22, 0.34],
        ["L", 0.28, 0.08],
        ["L", 0.41, 0.02],
        ["L", 0.29, -0.03],
        ["L", 0.23, -0.29],
        ["L", 0.17, -0.03],
        ["L", 0.05, 0.02],
        ["L", 0.17, 0.08],
        ["Z"],
      ]),
      0xd9c398,
      { name: "shield-star" },
    );
  }
  if (type === "warden") {
    shield();
    prop.position.set(0.31, 0.94, 0.18);
    head.scale.x = 1.08;
    wash(
      head,
      shape([
        ["M", -0.55, 0.03],
        ["L", -0.4, 0.34],
        ["Q", 0, 0.51, 0.4, 0.34],
        ["L", 0.55, 0.03],
        ["Q", 0.07, 0.2, -0.55, 0.03],
        ["Z"],
      ]),
      palette.accent,
      { outline: true, name: "helmet" },
    );
  } else if (type === "scribe") {
    wash(
      head,
      shape([
        ["M", -0.54, 0.07],
        ["Q", -0.31, 0.29, 0.1, 0.51],
        ["Q", 0.42, 0.69, 0.51, 0.52],
        ["Q", 0.3, 0.57, 0.25, 0.28],
        ["Q", 0.48, 0.24, 0.59, 0.05],
        ["Q", 0.08, 0.21, -0.54, 0.07],
        ["Z"],
      ]),
      palette.cloth,
      { outline: true, name: "scholar-cap" },
    );
    book();
    prop.position.x = -0.13;
    wash(
      arms[1],
      shape([
        ["M", 0.25, -0.25],
        ["C", 0.16, 0.14, 0.2, 0.53, 0.53, 0.82],
        ["Q", 0.76, 0.42, 0.25, -0.25],
        ["Z"],
      ]),
      0xd3dfd0,
      { outline: true, name: "quill-feather" },
    );
    ink(
      arms[1],
      [
        shape([
          ["M", 0.2, -0.38],
          ["Q", 0.31, 0.2, 0.53, 0.75],
        ]),
      ],
      palette.shade,
      0.8,
    );
  } else if (type === "bell") {
    prop.position.x = 0.18;
    wash(
      prop,
      shape([
        ["M", -0.1, 0.32],
        ["Q", -0.13, 0.53, 0.08, 0.56],
        ["Q", 0.29, 0.55, 0.26, 0.33],
        ["C", 0.49, 0.16, 0.22, -0.11, 0.49, -0.3],
        ["Q", 0.12, -0.48, -0.3, -0.26],
        ["C", -0.05, -0.06, -0.26, 0.12, -0.1, 0.32],
        ["Z"],
      ]),
      0xbe9555,
      { outline: true, name: "bell" },
    );
    wash(prop, oval(0.08, -0.31, 0.1, 0.09), 0x66533f, {
      name: "bell-clapper",
    });
    wash(
      prop,
      shape([
        ["M", -0.04, 0.32],
        ["Q", 0.05, 0.4, 0.11, 0.29],
        ["L", 0.04, -0.22],
        ["L", -0.07, -0.23],
        ["Z"],
      ]),
      0xe2c48a,
      { opacity: 0.6, name: "bell-light" },
    );
  } else if (type === "eater") {
    book();
    prop.rotation.z = 0.19;
    prop.position.y = 1.2;
    head.position.y = 1.91;
    head.rotation.z = 0.09;
    wash(
      head,
      [
        shape([
          ["M", -0.07, -0.25],
          ["L", -0.035, -0.33],
          ["L", 0, -0.25],
          ["Z"],
        ]),
        shape([
          ["M", 0.04, -0.25],
          ["L", 0.07, -0.32],
          ["L", 0.1, -0.245],
          ["Z"],
        ]),
      ],
      0xf4e5c7,
      { name: "little-teeth" },
    );
  } else if (type === "unbinder") {
    book();
    prop.position.y = 1.02;
    const fan = [];
    for (const sign of [-1, 1])
      fan.push(
        shape([
          ["M", sign * 0.35, 1.36],
          ["Q", sign * 0.73, 1.92, sign * 1.06, 2.15],
          ["Q", sign * 0.99, 1.61, sign * 0.53, 1.16],
          ["Z"],
        ]),
      );
    wash(cloth, fan, 0xcfc1ae, { outline: true, name: "unwritten-page-wings" });
    wash(
      head,
      shape([
        ["M", -0.38, 0.22],
        ["L", -0.41, 0.58],
        ["L", -0.14, 0.4],
        ["L", 0, 0.59],
        ["L", 0.15, 0.4],
        ["L", 0.41, 0.58],
        ["L", 0.38, 0.22],
        ["Q", 0, 0.35, -0.38, 0.22],
        ["Z"],
      ]),
      palette.accent,
      { outline: true, name: "crown-of-questions" },
    );
  } else book();
  // Hands sit in front of the held object as another independent paint layer.
  wash(
    prop,
    [oval(-0.39, 0.02, 0.11, 0.09), oval(0.4, 0.02, 0.1, 0.085)],
    palette.skin,
    { name: "hands" },
  );
  const scale = boss ? 3.2 / 2.55 : 1;
  group.scale.setScalar(scale);
  const baseHead = {
      x: head.rotation.x,
      y: head.rotation.y,
      z: head.rotation.z,
    },
    baseProp = { x: prop.rotation.x, y: prop.rotation.y, z: prop.rotation.z };
  const metadata = {
    type,
    height: boss ? 3.2 : 2.55,
    width: boss ? 2.7 : 2.2,
    meshCount: 0,
  };
  group.traverse((node) => {
    if (node.isMesh || node.isLineSegments) metadata.meshCount++;
  });
  group.userData.paintedEnemy = metadata;
  function update({
    hit = 0,
    intent = "idle",
    elapsed = 0,
    reducedMotion = false,
    opacity = 1,
  } = {}) {
    if (disposed) return;
    const strength = Math.min(1, Math.max(0, hit) * 4.5),
      breath = reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.012;
    cloth.rotation.z = breath;
    head.rotation.set(
      baseHead.x,
      baseHead.y,
      baseHead.z + (reducedMotion ? 0 : breath * 0.7 - strength * 0.09),
    );
    const ready = /attack|spell|heavy/.test(intent) ? 1 : 0,
      guard = /guard|brace/.test(intent) ? 1 : 0;
    arms[0].rotation.z = reducedMotion ? 0 : breath - 0.055 * ready;
    arms[1].rotation.z = reducedMotion ? 0 : -breath + 0.07 * guard;
    prop.rotation.set(
      baseProp.x + (reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.018),
      baseProp.y,
      baseProp.z + (reducedMotion ? 0 : breath * 0.7),
    );
    pupils.position.x = reducedMotion ? 0 : Math.sin(elapsed * 0.65) * 0.008;
    for (const material of materials) {
      material.opacity =
        material.userData.baseOpacity * Math.max(0, Math.min(1, opacity));
      if (material.isMeshBasicMaterial)
        material.color
          .setHex(material.userData.originalColor)
          .multiply(
            new THREE.Color(1, 1 - strength * 0.1, 1 - strength * 0.16),
          );
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    texture.dispose();
    group.removeFromParent();
  }
  update();
  return { group, update, dispose };
}
