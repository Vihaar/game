/** Visual-only scene data. Combat state never comes from the illustration layer. */
export const DIORAMA_SCENES = [
  { id: 'intake', backdrop: 'library-stacks.webp', paper: '#e9d7b9', edge: '#b78e62', ink: '#3e4f59', side: -1 },
  { id: 'mycelium', backdrop: 'library-garden.webp', paper: '#d7e2c8', edge: '#91a88d', ink: '#355d57', side: 1 },
  { id: 'flooded', backdrop: 'library-water.webp', paper: '#d0e5e4', edge: '#82b4bc', ink: '#315e73', side: -1 },
  { id: 'glasshouse', backdrop: 'library-garden.webp', paper: '#ead5d0', edge: '#c29999', ink: '#5d6e67', side: -1 },
  { id: 'observatory', backdrop: 'library-stars.webp', paper: '#d8cfe7', edge: '#a895c2', ink: '#4b486e', side: 1 },
  { id: 'press', backdrop: 'library-stacks.webp', paper: '#e5c8b6', edge: '#bd8a76', ink: '#744c56', side: 1 },
  { id: 'broken', backdrop: 'library-stars.webp', paper: '#d8d0de', edge: '#aaa0bd', ink: '#61576c', side: -1 },
  { id: 'binding', backdrop: 'library-stars.webp', paper: '#ecd6b4', edge: '#baa084', ink: '#3c4c67', side: 1 },
];

export const ENEMY_ATLAS = {
  file: 'enemy-atlas.webp', columns: 3, rows: 2,
  types: ['inkling', 'eater', 'warden', 'scribe', 'bell', 'unbinder'],
};

export const DIORAMA_STYLES = {
  storybook: { label: 'Handmade storybook', preview: 'storybook.webp' },
  popup: { label: 'Pop-up book', preview: 'popup.webp' },
  theater: { label: 'Paper theatre', preview: 'theater.webp' },
};

export function sceneBackdrop(index, style = 'storybook', overrides = {}) {
  const scene = DIORAMA_SCENES[Math.max(0, Math.min(7, index))];
  return overrides[style]?.[scene.id] ?? overrides[scene.id] ?? DIORAMA_STYLES[style]?.preview ?? DIORAMA_STYLES.storybook.preview;
}

/** Three UVs start at the bottom; generated atlas metadata is read top-to-bottom. */
export function atlasRegion(index, columns = ENEMY_ATLAS.columns, rows = ENEMY_ATLAS.rows, inset = 0.004) {
  const safe = Math.max(0, Math.min(columns * rows - 1, index));
  return {
    repeat: [1 / columns - inset * 2, 1 / rows - inset * 2],
    offset: [safe % columns / columns + inset, 1 - (Math.floor(safe / columns) + 1) / rows + inset],
  };
}

export function enemyLayout(count, aspect = 1.6) {
  const compact = aspect < 0.85;
  const spacing = compact ? 1.65 : count > 3 ? 2.65 : 3.3;
  return Array.from({ length: count }, (_, index) => ({
    x: (index - (count - 1) / 2) * spacing,
    y: compact ? 3.5 : 3.2,
    z: index % 2 ? -0.05 : 0.25,
    scale: compact ? 0.76 : 1,
  }));
}
