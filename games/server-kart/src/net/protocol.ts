/** Plain JSON wire protocol. Only the host sends world state; guests send bounded controls. */
export const PROTOCOL_VERSION = 1 as const;
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_RACERS = 8;
export const SNAPSHOT_INTERVAL_MS = 50;
export const INPUT_INTERVAL_MS = 1000 / 30;
export const INPUT_TIMEOUT_MS = 300;

export interface PlayerProfile { name: string; characterId: string }
export interface RoomPlayer extends PlayerProfile { slot: number; peerId: string }
export interface RoomSettings { characterId: string; trackId: string; difficulty: 'easy' | 'normal' | 'hard'; laps: number }
export interface WireInput { throttle: number; brake: number; steer: number; drift: boolean; useItem: boolean; useItemHeld: boolean; lookBack: boolean }
export interface Vec3 { x: number; y: number; z: number }
export interface Quat extends Vec3 { w: number }
export interface WireKartState {
  id: number; position: Vec3; quaternion: Quat; velocity: Vec3;
  speed: number; heading: number; steerVisual: number;
  lap: number; checkpointIndex: number; trackT: number; raceProgress: number; place: number; finished: boolean; finishTime: number; wrongWay: boolean;
  isDrifting: boolean; driftDirection: number; driftCharge: number; driftStage: number;
  isBoosting: boolean; boostTimer: number; boostStrength: number; isAirborne: boolean; airTime: number; isHopping: boolean;
  isSpinning: boolean; spinTimer: number; isSquished: boolean; squishTimer: number; isInvincible: boolean; starTimer: number;
  isShrunk: boolean; shrinkTimer: number; isFrozen: boolean;
  item: string; itemCount: number; itemRouletteActive: boolean; surface: string; wheelSpin: number;
}
export interface WireHazard { id: number; type: string; position: Vec3; velocity: Vec3; radius: number; ownerId: number }
export interface RaceSnapshot { raceId: number; sequence: number; raceTime: number; phase: 'grid' | 'countdown' | 'racing' | 'complete'; karts: WireKartState[]; hazards?: WireHazard[]; activeBoxes?: Vec3[]; countdown?: number; chaos?: { text: string; warning: boolean; reverseSteering: boolean } }
export interface WireStanding { kartId: number; name: string; color: number; place: number; finishTime: number; isPlayer: boolean }
export interface RaceStart { raceId: number; seed: number; settings: RoomSettings; roster: RoomPlayer[] }
export interface RoomWelcome { roomCode: string; slot: number; settings: RoomSettings; roster: RoomPlayer[] }
export type ClientMessage =
  | { v: 1; type: 'hello'; profile: PlayerProfile }
  | { v: 1; type: 'profile'; profile: PlayerProfile }
  | { v: 1; type: 'ready'; raceId: number }
  | { v: 1; type: 'input'; raceId: number; sequence: number; input: WireInput };
export type HostMessage =
  | ({ v: 1; type: 'welcome' } & RoomWelcome)
  | { v: 1; type: 'roster'; roster: RoomPlayer[]; settings: RoomSettings }
  | ({ v: 1; type: 'start' } & RaceStart)
  | { v: 1; type: 'snapshot'; snapshot: RaceSnapshot }
  | { v: 1; type: 'results'; raceId: number; standings: WireStanding[] }
  | { v: 1; type: 'restart'; raceId: number; settings: RoomSettings; roster: RoomPlayer[] }
  | { v: 1; type: 'reject'; code: string; message: string };

export const emptyWireInput = (): WireInput => ({ throttle: 0, brake: 0, steer: 0, drift: false, useItem: false, useItemHeld: false, lookBack: false });
export function normalizeRoomCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return code.length === 6 && [...code].every((c) => ROOM_ALPHABET.includes(c)) ? code : null;
}
export const roomPeerId = (code: string): string => `vihaar-mike-v1-${code}`;
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const number = (x: unknown, min = -1e6, max = 1e6): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const integer = (x: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): x is number => number(x, min, max) && Number.isInteger(x);
const ident = (x: unknown): x is string => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(x);
const shortString = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f<>]/.test(x);
export function parseProfile(x: unknown): PlayerProfile | null {
  return object(x) && shortString(x.name, 24) && x.name.trim().length > 0 && ident(x.characterId) ? { name: x.name.trim(), characterId: x.characterId } : null;
}
export function parseSettings(x: unknown): RoomSettings | null {
  if (!object(x) || !ident(x.characterId) || !ident(x.trackId) || typeof x.difficulty !== 'string' || !['easy', 'normal', 'hard'].includes(x.difficulty) || !integer(x.laps, 1, 5)) return null;
  return { characterId: x.characterId, trackId: x.trackId, difficulty: x.difficulty as RoomSettings['difficulty'], laps: x.laps };
}
export function parseInput(x: unknown): WireInput | null {
  if (!object(x) || !number(x.throttle, 0, 1) || !number(x.brake, 0, 1) || !number(x.steer, -1, 1)) return null;
  if (!['drift', 'useItem', 'useItemHeld', 'lookBack'].every((k) => typeof x[k] === 'boolean')) return null;
  return { throttle: x.throttle, brake: x.brake, steer: x.steer, drift: x.drift as boolean, useItem: x.useItem as boolean, useItemHeld: x.useItemHeld as boolean, lookBack: x.lookBack as boolean };
}
export function parseRoster(x: unknown): RoomPlayer[] | null {
  if (!Array.isArray(x) || x.length < 1 || x.length > MAX_RACERS) return null;
  const roster: RoomPlayer[] = [];
  for (const p of x) {
    const profile = parseProfile(p);
    if (!object(p) || !profile || !integer(p.slot, 0, 7) || !shortString(p.peerId, 128)) return null;
    if (roster.some((r) => r.slot === p.slot || r.peerId === p.peerId)) return null;
    roster.push({ ...profile, slot: p.slot, peerId: p.peerId });
  }
  return roster.some((p) => p.slot === 0) ? roster.sort((a, b) => a.slot - b.slot) : null;
}
export const kartNumbers = ['speed', 'heading', 'steerVisual', 'lap', 'checkpointIndex', 'trackT', 'raceProgress', 'place', 'finishTime', 'driftDirection', 'driftCharge', 'driftStage', 'boostTimer', 'boostStrength', 'airTime', 'spinTimer', 'squishTimer', 'starTimer', 'shrinkTimer', 'itemCount', 'wheelSpin'] as const;
export const kartBooleans = ['finished', 'wrongWay', 'isDrifting', 'isBoosting', 'isAirborne', 'isHopping', 'isSpinning', 'isSquished', 'isInvincible', 'isShrunk', 'isFrozen', 'itemRouletteActive'] as const;
const items = new Set(['none', 'banana', 'triple_banana', 'green_shell', 'triple_green_shell', 'red_shell', 'triple_red_shell', 'blue_shell', 'mushroom', 'triple_mushroom', 'golden_mushroom', 'star', 'lightning', 'bob_omb']);
const vec = (x: unknown): x is Vec3 => object(x) && number(x.x) && number(x.y) && number(x.z);
function parseKart(x: unknown): WireKartState | null {
  if (!object(x) || !integer(x.id, 0, 7) || !vec(x.position) || !vec(x.velocity) || !vec(x.quaternion) || !number((x.quaternion as unknown as Record<string, unknown>).w, -1, 1)) return null;
  if (!kartNumbers.every((k) => number(x[k])) || !kartBooleans.every((k) => typeof x[k] === 'boolean')) return null;
  if (typeof x.item !== 'string' || !items.has(x.item) || !['road', 'offroad', 'boost', 'wall', 'void'].includes(String(x.surface))) return null;
  return snapshotKart(x as unknown as WireKartState);
}
/** Copies only protocol fields, never Three.js objects, arbitrary keys, or object references. */
export function snapshotKart(s: WireKartState): WireKartState {
  const out: Record<string, unknown> = { id: s.id, position: { x: s.position.x, y: s.position.y, z: s.position.z }, velocity: { x: s.velocity.x, y: s.velocity.y, z: s.velocity.z }, quaternion: { x: s.quaternion.x, y: s.quaternion.y, z: s.quaternion.z, w: s.quaternion.w }, item: s.item, surface: s.surface };
  for (const k of kartNumbers) out[k] = s[k];
  for (const k of kartBooleans) out[k] = s[k];
  return out as unknown as WireKartState;
}
export function parseSnapshot(x: unknown): RaceSnapshot | null {
  if (!object(x) || !integer(x.raceId, 1) || !integer(x.sequence) || !number(x.raceTime, 0, 86400) || !['grid', 'countdown', 'racing', 'complete'].includes(String(x.phase)) || !Array.isArray(x.karts) || x.karts.length !== MAX_RACERS) return null;
  const karts: WireKartState[] = [];
  for (const k of x.karts) { const state = parseKart(k); if (!state || karts.some((s) => s.id === state.id)) return null; karts.push(state); }
  const snapshot: RaceSnapshot = { raceId: x.raceId, sequence: x.sequence, raceTime: x.raceTime, phase: x.phase as RaceSnapshot['phase'], karts };
  if (x.countdown !== undefined) { if (!number(x.countdown, 0, 5)) return null; snapshot.countdown = x.countdown; }
  if (x.chaos !== undefined) {
    if (!object(x.chaos) || typeof x.chaos.text !== 'string' || x.chaos.text.length > 180 || /[<>\u0000-\u001f]/.test(x.chaos.text) || typeof x.chaos.warning !== 'boolean' || typeof x.chaos.reverseSteering !== 'boolean') return null;
    snapshot.chaos = { text: x.chaos.text, warning: x.chaos.warning, reverseSteering: x.chaos.reverseSteering };
  }
  if (x.hazards !== undefined) {
    if (!Array.isArray(x.hazards) || x.hazards.length > 128) return null;
    const hazards: WireHazard[] = [];
    for (const h of x.hazards) {
      if (!object(h) || !integer(h.id, 0, 1e9) || typeof h.type !== 'string' || !items.has(h.type) || !vec(h.position) || !vec(h.velocity) || !number(h.radius, 0, 100) || !integer(h.ownerId, -1, 7) || hazards.some((v) => v.id === h.id)) return null;
      hazards.push(snapshotHazard(h as unknown as WireHazard));
    }
    snapshot.hazards = hazards;
  }
  if (x.activeBoxes !== undefined) {
    if (!Array.isArray(x.activeBoxes) || x.activeBoxes.length > 128 || !x.activeBoxes.every(vec)) return null;
    snapshot.activeBoxes = x.activeBoxes.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  }
  return snapshot;
}
export function snapshotHazard(h: WireHazard): WireHazard { return { id: h.id, type: h.type, position: { x: h.position.x, y: h.position.y, z: h.position.z }, velocity: { x: h.velocity.x, y: h.velocity.y, z: h.velocity.z }, radius: h.radius, ownerId: h.ownerId }; }
export function parseStandings(x: unknown): WireStanding[] | null {
  if (!Array.isArray(x) || x.length < 1 || x.length > MAX_RACERS) return null;
  const rows: WireStanding[] = [];
  for (const r of x) {
    if (!object(r) || !integer(r.kartId, 0, 7) || !shortString(r.name, 32) || !integer(r.color, 0, 0xffffff) || !integer(r.place, 1, 8) || !number(r.finishTime, -1, 86400) || typeof r.isPlayer !== 'boolean' || rows.some((p) => p.kartId === r.kartId || p.place === r.place)) return null;
    rows.push({ kartId: r.kartId, name: r.name, color: r.color, place: r.place, finishTime: r.finishTime, isPlayer: r.isPlayer });
  }
  return rows;
}
export function parseClientMessage(x: unknown): ClientMessage | null {
  if (!object(x) || x.v !== PROTOCOL_VERSION) return null;
  if (x.type === 'hello' || x.type === 'profile') { const profile = parseProfile(x.profile); return profile ? { v: 1, type: x.type, profile } : null; }
  if (x.type === 'ready' && integer(x.raceId, 1)) return { v: 1, type: 'ready', raceId: x.raceId };
  if (x.type === 'input' && integer(x.raceId, 1) && integer(x.sequence)) { const input = parseInput(x.input); return input ? { v: 1, type: 'input', raceId: x.raceId, sequence: x.sequence, input } : null; }
  return null;
}
export function parseHostMessage(x: unknown): HostMessage | null {
  if (!object(x) || x.v !== PROTOCOL_VERSION) return null;
  if (x.type === 'reject' && ident(x.code) && shortString(x.message, 160)) return { v: 1, type: 'reject', code: x.code, message: x.message };
  if (x.type === 'snapshot') { const snapshot = parseSnapshot(x.snapshot); return snapshot ? { v: 1, type: 'snapshot', snapshot } : null; }
  if (x.type === 'results' && integer(x.raceId, 1)) { const standings = parseStandings(x.standings); return standings ? { v: 1, type: 'results', raceId: x.raceId, standings } : null; }
  const settings = parseSettings(x.settings), roster = parseRoster(x.roster);
  if (!settings || !roster) return null;
  if (x.type === 'roster') return { v: 1, type: 'roster', settings, roster };
  if (x.type === 'welcome' && typeof x.roomCode === 'string' && normalizeRoomCode(x.roomCode) === x.roomCode && integer(x.slot, 1, 7) && roster.some((p) => p.slot === x.slot)) return { v: 1, type: 'welcome', roomCode: x.roomCode, slot: x.slot, settings, roster };
  if (x.type === 'start' && integer(x.raceId, 1) && integer(x.seed, 0, 0xffffffff)) return { v: 1, type: 'start', raceId: x.raceId, seed: x.seed, settings, roster };
  if (x.type === 'restart' && integer(x.raceId, 1)) return { v: 1, type: 'restart', raceId: x.raceId, settings, roster };
  return null;
}
