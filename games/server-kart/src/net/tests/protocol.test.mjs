import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWireInput, normalizeRoomCode, parseClientMessage, parseHostMessage, parseInput, parseRoster, parseSettings, parseSnapshot, snapshotKart } from '../protocol.ts';
import { MessageRateLimit, RemoteInputBuffer, RoomRoster } from '../RoomState.ts';

const profile = { name: 'Torin', characterId: 'torin' };

test('host keeps slot zero; guests fill lowest available AI slots; ninth racer is rejected', () => {
  const roster = new RoomRoster('host', profile);
  for (let slot = 1; slot <= 7; slot++) assert.equal(roster.add(`guest${slot}`, profile)?.slot, slot);
  assert.equal(roster.add('overflow', profile), null);
  assert.equal(roster.add('guest4', profile)?.slot, 4);
  assert.equal(roster.remove('host'), null);
  assert.equal(roster.remove('guest3')?.slot, 3);
  assert.equal(roster.add('replacement', profile)?.slot, 3);
  assert.equal(roster.get('guest4')?.slot, 4);
  const copy = roster.list(); copy[0].name = 'Mutated'; assert.equal(roster.get('host')?.name, 'Torin');
});

test('wire controls reject non-finite, out-of-range, coercible and forged packets', () => {
  for (const bad of [NaN, Infinity, -0.01, 1.01, '1', null]) assert.equal(parseInput({ ...emptyWireInput(), throttle: bad }), null);
  assert.equal(parseInput({ ...emptyWireInput(), steer: -2 }), null);
  assert.equal(parseInput({ ...emptyWireInput(), drift: 1 }), null);
  assert.equal(parseClientMessage({ v: 1, type: 'snapshot', snapshot: {} }), null);
  assert.equal(parseClientMessage({ v: 2, type: 'hello', profile }), null);
  assert.equal(parseClientMessage({ v: 1, type: 'input', raceId: 1, sequence: -1, input: emptyWireInput() }), null);
  const packet = parseClientMessage({ v: 1, type: 'input', raceId: 1, sequence: 9, slot: 0, input: { ...emptyWireInput(), position: { x: 999 } } });
  assert.ok(packet); assert.equal('slot' in packet, false); assert.equal('position' in packet.input, false);
});

test('code/settings/profile/roster validation bounds room announcements', () => {
  assert.equal(normalizeRoomCode(' abc234 '), 'ABC234');
  assert.equal(normalizeRoomCode('ABC12O'), null);
  assert.equal(parseSettings({ characterId: 'torin', trackId: '../../bad', laps: 1, difficulty: 'easy' }), null);
  assert.equal(parseClientMessage({ v: 1, type: 'hello', profile: { ...profile, name: '<script>' } }), null);
  const host = { ...profile, peerId: 'host', slot: 0 };
  assert.equal(parseRoster([host, { ...host, peerId: 'other' }]), null);
  assert.equal(parseRoster([{ ...host, slot: 1 }]), null);
  assert.equal(parseHostMessage({ v: 1, type: 'welcome', roomCode: 'ABC234', slot: 7, roster: [host], settings: { characterId: 'torin', trackId: 'track', difficulty: 'easy', laps: 1 } }), null);
});

test('input press edges survive batching, fire once, ignore stale sequence and expire', () => {
  const input = new RemoteInputBuffer();
  assert.equal(input.put(1, 2, { ...emptyWireInput(), throttle: 1, useItem: true }, 100), true);
  assert.equal(input.put(1, 3, { ...emptyWireInput(), throttle: 0.5 }, 110), true);
  assert.equal(input.put(1, 1, { ...emptyWireInput(), throttle: 1 }, 120), false);
  assert.equal(input.consume(1, 120).useItem, true);
  assert.equal(input.consume(1, 121).useItem, false);
  assert.equal(input.consume(1, 121).throttle, 0.5);
  assert.equal(input.consume(1, 500).throttle, 0);
  input.put(2, 1, { ...emptyWireInput(), useItem: true }, 100);
  input.put(2, 2, emptyWireInput(), 500); assert.equal(input.consume(2, 501).useItem, false);
  input.remove(1); assert.deepEqual(input.consume(1, 120), emptyWireInput());
});

test('snapshot validation strips unknown fields, clones poses and rejects duplicate racers and bad values', () => {
  const source = {
    id: 0, position: { x: 1, y: 2, z: 3 }, velocity: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 },
    item: 'none', surface: 'road', speed: 0, heading: 0, steerVisual: 0, lap: 0, checkpointIndex: 0, trackT: 0, raceProgress: 0, place: 1, finishTime: 0,
    driftDirection: 0, driftCharge: 0, driftStage: 0, boostTimer: 0, boostStrength: 0, airTime: 0, spinTimer: 0, squishTimer: 0, starTimer: 0, shrinkTimer: 0, itemCount: 0, wheelSpin: 0,
    finished: false, wrongWay: false, isDrifting: false, isBoosting: false, isAirborne: false, isHopping: false, isSpinning: false, isSquished: false, isInvincible: false, isShrunk: false, isFrozen: true, itemRouletteActive: false,
    arbitrary: 'ignored',
  };
  const snapshot = { raceId: 1, sequence: 0, raceTime: 0, phase: 'grid', karts: Array.from({ length: 8 }, (_, id) => ({ ...source, id })) };
  const safe = parseSnapshot(snapshot); assert.ok(safe);
  assert.equal('arbitrary' in safe.karts[0], false); source.position.x = 99; assert.equal(safe.karts[0].position.x, 1);
  assert.equal('arbitrary' in snapshotKart(source), false);
  const visualSnapshot = { ...snapshot, hazards: [{ id: 3, type: 'banana', position: { x: 1, y: 0, z: 2 }, velocity: { x: 0, y: 0, z: 0 }, radius: 1, ownerId: 1 }], activeBoxes: [{ x: 3, y: 1, z: 2 }] };
  assert.equal(parseSnapshot(visualSnapshot)?.hazards?.[0].type, 'banana');
  assert.equal(parseSnapshot({ ...visualSnapshot, hazards: Array(129).fill(visualSnapshot.hazards[0]) }), null);
  assert.equal(parseSnapshot({ ...visualSnapshot, activeBoxes: [{ x: NaN, y: 0, z: 0 }] }), null);
  snapshot.karts[1].id = 0; assert.equal(parseSnapshot(snapshot), null); snapshot.karts[1].id = 1;
  snapshot.karts[1].speed = Infinity; assert.equal(parseSnapshot(snapshot), null);
});

test('rate limiter bounds bursts and recovers at the configured rate', () => {
  const limit = new MessageRateLimit(30, 3, 100);
  assert.equal(limit.accept(100), true); assert.equal(limit.accept(100), true); assert.equal(limit.accept(100), true);
  assert.equal(limit.accept(100), false); assert.equal(limit.accept(100), false);
  assert.equal(limit.accept(134), true); assert.equal(limit.accept(134), false);
  assert.equal(limit.accept(0), false); assert.equal(limit.accept(200), true);
});
