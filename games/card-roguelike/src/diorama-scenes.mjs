/** Visual-only scene data. Combat state never comes from the illustration layer. */
export const DIORAMA_SCENES = [
  {
    id: "intake",
    backdrop: "storybook.webp",
    artTint: "#ffffff",
    paper: "#e9d7b9",
    edge: "#b78e62",
    ink: "#3e4f59",
    side: -1,
  },
  {
    id: "mycelium",
    backdrop: "world-atlas-a.webp",
    panel: 0,
    artTint: "#f2eee4",
    paper: "#d7e2c8",
    edge: "#91a88d",
    ink: "#355d57",
    side: 1,
  },
  {
    id: "flooded",
    backdrop: "world-atlas-a.webp",
    panel: 1,
    artTint: "#c8d5d4",
    paper: "#d0e5e4",
    edge: "#82b4bc",
    ink: "#315e73",
    side: -1,
  },
  {
    id: "glasshouse",
    backdrop: "world-atlas-a.webp",
    panel: 2,
    artTint: "#b8c3bf",
    paper: "#bbc1b6",
    edge: "#c29999",
    ink: "#5d6e67",
    side: -1,
  },
  {
    id: "observatory",
    backdrop: "world-atlas-a.webp",
    panel: 3,
    artTint: "#a6adc4",
    paper: "#9295ac",
    edge: "#a895c2",
    ink: "#4b486e",
    side: 1,
  },
  {
    id: "press",
    backdrop: "world-atlas-b-cursed.webp",
    panel: 0,
    artTint: "#d4c5c3",
    paper: "#77717d",
    edge: "#9a7879",
    ink: "#353144",
    side: 1,
  },
  {
    id: "broken",
    backdrop: "world-atlas-b-cursed.webp",
    panel: 1,
    artTint: "#c1bed0",
    paper: "#514d66",
    edge: "#84708f",
    ink: "#26253a",
    side: -1,
  },
  {
    id: "binding",
    backdrop: "world-atlas-b-cursed.webp",
    panel: 2,
    artTint: "#aca7c0",
    paper: "#35334a",
    edge: "#766277",
    ink: "#1b1c30",
    side: 1,
  },
];

export const ENEMY_ATLAS = {
  file: "enemy-atlas.webp",
  columns: 3,
  rows: 2,
  types: ["inkling", "eater", "warden", "scribe", "bell", "unbinder"],
  // Generated silhouettes occupy unequal rows: quills/hats begin above y=512.
  // These top-left-origin normalized rectangles exclude neighbouring silhouettes.
  regions: Object.fromEntries(
    ["inkling", "eater", "warden", "scribe", "bell", "unbinder"].map(
      (type, index) => [
        type,
        [
          (index % 3) / 3,
          index < 3 ? 0 : 468 / 1024,
          1 / 3,
          index < 3 ? 468 / 1024 : 556 / 1024,
        ],
      ],
    ),
  ),
};

export const DIORAMA_STYLES = {
  storybook: { label: "Handmade storybook", preview: "storybook.webp" },
  popup: { label: "Pop-up book", preview: "popup.webp" },
  theater: { label: "Paper theatre", preview: "theater.webp" },
};

export function sceneBackdrop(index, style = "storybook", overrides = {}) {
  const scene = DIORAMA_SCENES[Math.max(0, Math.min(7, index))];
  return (
    overrides[style]?.[scene.id] ??
    overrides[scene.id] ??
    (style === "storybook" ? scene.backdrop : DIORAMA_STYLES[style]?.preview) ??
    DIORAMA_STYLES.storybook.preview
  );
}

/** Crop only the selected chapter, leaving source textures reusable and immutable. */
export function sceneBackdropRegion(
  index,
  style = "storybook",
  overrides = {},
) {
  const scene = DIORAMA_SCENES[Math.max(0, Math.min(7, index))];
  if (
    style !== "storybook" ||
    overrides[style]?.[scene.id] ||
    overrides[scene.id] ||
    scene.panel === undefined
  )
    return null;
  return atlasRegion(scene.panel, 2, 2, 0.002);
}

/** Three UVs start at the bottom; generated atlas metadata is read top-to-bottom. */
export function atlasRegion(
  index,
  columns = ENEMY_ATLAS.columns,
  rows = ENEMY_ATLAS.rows,
  inset = 0.004,
  rectangle,
) {
  const safe = Math.max(0, Math.min(columns * rows - 1, index));
  const [x, y, width, height] = rectangle ?? [
    (safe % columns) / columns,
    Math.floor(safe / columns) / rows,
    1 / columns,
    1 / rows,
  ];
  return {
    repeat: [width - inset * 2, height - inset * 2],
    offset: [x + inset, 1 - y - height + inset],
    sourceSize: [width, height],
  };
}

export function enemyLayout(count, aspect = 1.6) {
  const compact = aspect < 0.85;
  const spacing = compact ? 2.75 : count > 3 ? 2.65 : 3.3;
  return Array.from({ length: count }, (_, index) => ({
    x: (index - (count - 1) / 2) * spacing,
    y: compact ? 3.5 : 3.2,
    z: index % 2 ? -0.05 : 0.25,
    scale: compact ? 0.76 : 1,
  }));
}
