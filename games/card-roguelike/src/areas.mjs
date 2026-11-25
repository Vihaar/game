// A connected, hand-authored route. Every doorway is physical and backtracking stays open.
export const AREAS = [
  { id: 'intake', name: 'The Intake Hall', subtitle: 'Your name is already in the ledger.', x: 0, z: 0, size: 24, theme: 'stacks', wall: 0x7588a7, floor: 0x8d9bb1, accent: 0xe5bb7c, fog: 0x8ca3bb, enemies: ['inkling', 'warden'] },
  { id: 'mycelium', name: 'The Abandoned Stacks', subtitle: 'The lamps have gone cold. The dust holds your footprints.', x: 0, z: -34, size: 26, theme: 'fungus', wall: 0x466b68, floor: 0x657e77, accent: 0xc7e2a0, fog: 0x678c83, enemies: ['inkling', 'eater', 'scribe'] },
  { id: 'flooded', name: 'The Mirror Archive', subtitle: 'Your reflection already knows the next spell.', x: 34, z: -34, size: 26, theme: 'water', wall: 0x42758b, floor: 0x658c9c, accent: 0xa1e7e3, fog: 0x7ba6b5, enemies: ['scribe', 'warden', 'inkling'] },
  { id: 'glasshouse', name: 'Glasshouse of Errata', subtitle: 'These flowers remember your mistakes.', x: 34, z: -68, size: 26, theme: 'glass', wall: 0x778d88, floor: 0x98ada0, accent: 0xefc1b2, fog: 0xb0c9c0, enemies: ['bell', 'eater', 'scribe'] },
  { id: 'observatory', name: 'The Astral Reading Room', subtitle: 'The stars are marginal notes.', x: 0, z: -68, size: 26, theme: 'stars', wall: 0x4b4d7b, floor: 0x777ba4, accent: 0xd5bcff, fog: 0x7777a7, enemies: ['scribe', 'bell', 'eater', 'inkling'] },
  { id: 'press', name: 'The Redaction Press', subtitle: 'Some words were never meant to leave.', x: -34, z: -68, size: 26, theme: 'press', wall: 0x865c60, floor: 0x9d7d7a, accent: 0xf4ae86, fog: 0xaf8581, enemies: ['warden', 'warden', 'scribe', 'eater'] },
  { id: 'broken', name: 'The Shattered Archive', subtitle: 'Even the shelves are trying to escape.', x: -34, z: -102, size: 26, theme: 'broken', wall: 0x746c88, floor: 0x9992a7, accent: 0xf6d49b, fog: 0xa79cb5, enemies: ['eater', 'bell', 'scribe', 'warden'] },
  { id: 'binding', name: 'The Last Binding', subtitle: 'The librarian has been expecting you.', x: 0, z: -102, size: 28, theme: 'vault', wall: 0x3a5273, floor: 0x7688a2, accent: 0xffbe9d, fog: 0x7b8da7, enemies: ['unbinder', 'scribe', 'eater'] },
];

export const ENEMY_TYPES = {
  inkling: { name: 'Inkling', hp: 15, damage: 6, speed: 2.1, reach: 2.8, windup: 0.85, recovery: 1.2, radius: 1.55, pattern: 'strike', color: 0xbba9d3, tell: 'Ink burst' },
  eater: { name: 'Margin Eater', hp: 19, damage: 7, speed: 2.8, reach: 3.5, windup: 0.75, recovery: 1.3, radius: 1.45, pattern: 'lunge', color: 0x99ba9c, tell: 'Pounce' },
  warden: { name: 'Paper Warden', hp: 26, damage: 11, speed: 1.5, reach: 3.4, windup: 1.2, recovery: 1.8, radius: 2.7, pattern: 'cleave', color: 0xc8b18a, tell: 'Wide cleave' },
  scribe: { name: 'Quill Scribe', hp: 17, damage: 7, speed: 1.55, reach: 10, windup: 1.05, recovery: 1.8, radius: 0.5, pattern: 'bolt', color: 0x91b9d1, tell: 'Quill shot' },
  bell: { name: 'Bell Keeper', hp: 25, damage: 9, speed: 1.4, reach: 4.8, windup: 1.45, recovery: 2.0, radius: 4.0, pattern: 'ring', color: 0xd6a0a7, tell: 'Silence ring' },
  unbinder: { name: 'The Unbinder', hp: 105, damage: 14, speed: 1.8, reach: 8, windup: 1.35, recovery: 1.7, radius: 3.1, pattern: 'boss', color: 0xbaa2dc, tell: 'Unbinding' },
};

export function roomAt(position) {
  const inside = AREAS.findIndex(area => Math.abs(position.x - area.x) <= area.size / 2 && Math.abs(position.z - area.z) <= area.size / 2);
  if (inside >= 0) return inside;
  let nearest = 0, best = Infinity;
  AREAS.forEach((area, index) => { const distance = (position.x - area.x) ** 2 + (position.z - area.z) ** 2; if (distance < best) { best = distance; nearest = index; } });
  return nearest;
}

export function doorBetween(index) {
  const a = AREAS[index], b = AREAS[index + 1];
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, horizontal: a.z === b.z, from: index, to: index + 1 };
}

export function enemyDefinitions(areaIndex, rng = Math.random) {
  const area = AREAS[areaIndex];
  return area.enemies.map((type, index) => {
    const definition = ENEMY_TYPES[type];
    const hp = definition.hp + (type === 'unbinder' ? 0 : areaIndex * 2);
    return { id: `${area.id}-${index}`, type, name: definition.name, hp, maxHp: hp, damage: definition.damage + Math.floor(areaIndex / 3), spawnX: area.x + (index % 2 ? 1 : -1) * (3.7 + rng() * 1.7), spawnZ: area.z - 3 - Math.floor(index / 2) * 4 - rng() * 1.5 };
  });
}
