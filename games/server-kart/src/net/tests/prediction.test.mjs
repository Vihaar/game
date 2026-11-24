import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Kart } from '../../kart/Kart.ts';
import { RaceManager } from '../../game/RaceManager.ts';
import { CHARACTERS } from '../../kart/roster.ts';
import { FIXED_DT } from '../../core/constants.ts';
import { createEmptyInput } from '../../core/types.ts';
import { events } from '../../core/events.ts';
import { pack, unpack } from 'peerjs-js-binarypack';
import { readFile } from 'node:fs/promises';
import { createKartPrediction } from '../KartPrediction.ts';
import { RemoteMoveStreams } from '../MoveStream.ts';
import { emptyWireInput, snapshotKart, parsePhysics, parseClientMessage, parseSnapshot } from '../protocol.ts';

const flatTrack = {
  query(position, _hint, out) {
    out ??= {};
    Object.assign(out, { t: ((-position.z / 10000) % 1 + 1) % 1, surface: 'road', groundY: 0, lateral: position.x, halfWidth: 1000, wallHalfWidth: 1000 });
    out.groundNormal = new THREE.Vector3(0, 1, 0); out.tangent = new THREE.Vector3(0, 0, -1); out.binormal = new THREE.Vector3(1, 0, 0); out.center = new THREE.Vector3(0, 0, position.z); return out;
  },
};
function kart() { const k = new Kart(1, CHARACTERS[0], true, { visuals: false }); k.resetTo(new THREE.Vector3(), new THREE.Quaternion()); k.setFrozen(false); return k; }
const wire = (k) => ({ ...snapshotKart(k.state), physics: k.capturePhysics() });

test('actual Kart private state restores drift/hop physics exactly before replay', () => {
  const first = kart(), restored = kart();
  const controls = (i) => ({ ...createEmptyInput(), throttle: 1, steer: i > 180 ? .8 : 0, drift: i > 180 && i < 540 });
  for (let i = 0; i < 400; i++) { first.setInput(controls(i)); first.update(FIXED_DT, flatTrack, []); }
  const state = wire(first); assert.ok(parsePhysics(state.physics));
  const predictor = createKartPrediction(restored, flatTrack, () => false); assert.equal(predictor.reconcile(state, 0), true);
  for (let i = 400; i < 600; i++) { first.setInput(controls(i)); first.update(FIXED_DT, flatTrack, []); predictor.advance(controls(i)); }
  assert.ok(first.state.position.distanceTo(restored.state.position) < 1e-9);
  assert.ok(first.state.velocity.distanceTo(restored.state.velocity) < 1e-9);
  assert.equal(first.state.driftStage, restored.state.driftStage); assert.deepEqual(first.capturePhysics(), restored.capturePhysics());
  first.dispose(); restored.dispose();
});

test('150ms RTT with jitter predicts steering immediately, reconciles, and settles without a stop jump', () => {
  const host = kart(), client = kart(), streams = new RemoteMoveStreams();
  const prediction = createKartPrediction(client, flatTrack, () => false); prediction.reconcile(wire(host), 0);
  let now = 0, nextInputDelivery = 0, nextSnapshotDelivery = 0, maximumCorrection = 0, steeringResponseTick = null;
  const inputs = [], snapshots = [];
  const inputAt = (tick) => ({ ...emptyWireInput(), throttle: tick < 600 ? 1 : 0, brake: tick >= 600 && tick < 840 ? 1 : 0, steer: tick >= 240 && tick < 480 ? .7 : 0, drift: tick >= 300 && tick < 450 });
  for (let tick = 0; tick < 1800; tick++) {
    now = tick * FIXED_DT * 1000;
    for (let i = inputs.length - 1; i >= 0; i--) if (inputs[i].at <= now) { streams.put(1, inputs[i].moves, now); inputs.splice(i, 1); }
    for (let i = snapshots.length - 1; i >= 0; i--) if (snapshots[i].at <= now) { prediction.reconcile(snapshots[i].state, snapshots[i].ack); maximumCorrection = Math.max(maximumCorrection, prediction.lastCorrection); snapshots.splice(i, 1); }
    const heading = client.state.heading;
    prediction.advance(inputAt(tick));
    if (tick >= 240 && steeringResponseTick === null && Math.abs(client.state.heading - heading) > 1e-5) steeringResponseTick = tick;
    if (tick % 4 === 0) {
      const moves = prediction.unsent();
      if (moves.length) { nextInputDelivery = Math.max(nextInputDelivery + .01, now + 75 + (tick % 5 - 2) * 8); inputs.push({ at: nextInputDelivery, moves }); prediction.markSent(moves.at(-1).sequence); }
    }
    for (const move of streams.take(1, FIXED_DT)) { host.setInput({ ...createEmptyInput(), ...move.input }); host.update(FIXED_DT, flatTrack, []); streams.processed(1, move.sequence); }
    if (tick % 6 === 0) { nextSnapshotDelivery = Math.max(nextSnapshotDelivery + .01, now + 75 + (tick % 7 - 3) * 5); snapshots.push({ at: nextSnapshotDelivery, state: wire(host), ack: streams.acknowledgements()[1] }); }
    prediction.decayVisualOffset(FIXED_DT);
  }
  assert.ok((steeringResponseTick - 240) * FIXED_DT < .025, `steering reacted at tick ${steeringResponseTick}`);
  assert.ok(maximumCorrection < .5, `largest normal correction was ${maximumCorrection}m`);
  assert.ok(client.state.position.distanceTo(host.state.position) < .001);
  assert.ok(Math.abs(client.state.speed) < .001); assert.ok(Math.hypot(...Object.values(prediction.visualOffset)) < .001);
  assert.ok(prediction.pendingCount < 40); host.dispose(); client.dispose();
});

test('host fixed-time credit bounds command bursts; duplicate/stale moves do not speed up simulation', () => {
  const stream = new RemoteMoveStreams();
  const batch = (from, count) => Array.from({ length: count }, (_, i) => ({ sequence: from + i, input: emptyWireInput() }));
  stream.put(1, batch(1, 48), 0); stream.put(1, batch(1, 48), 0);
  assert.equal(stream.take(1, FIXED_DT).length, 1);
  let total = 1; for (let tick = 0; tick < 119; tick++) total += stream.take(1, FIXED_DT).length;
  assert.equal(total, 48); assert.equal(stream.take(1, 1000).length, 0);
  stream.put(1, batch(49, 100), 1000);
  const burst = stream.take(1, FIXED_DT); assert.ok(burst.length <= 12); assert.ok(stream.acknowledgements()[1] >= 100);
  assert.equal(stream.stale(1, 1400), true); stream.remove(1); assert.equal(stream.active(1), false);
});

test('physics and move parsing reject forged state/timing while prediction replay emits no gameplay events', () => {
  const k = kart(), prediction = createKartPrediction(k, flatTrack, () => false); const state = wire(k);
  assert.equal(parsePhysics({ ...state.physics, collisionCooldown: [0] }), null);
  assert.equal(parsePhysics({ ...state.physics, slip: NaN }), null);
  assert.equal(parseClientMessage({ v: 1, type: 'moves', raceId: 1, moves: Array.from({ length: 25 }, (_, i) => ({ sequence: i + 1, input: emptyWireInput() })) }), null);
  const parsed = parseClientMessage({ v: 1, type: 'moves', raceId: 1, moves: [{ sequence: 1, input: emptyWireInput(), dt: 1000, position: { x: 999 } }] });
  assert.ok(parsed); assert.equal('dt' in parsed.moves[0], false); assert.equal('position' in parsed.moves[0], false);
  let hops = 0; const off = events.on('kart:hop', () => hops++);
  prediction.reconcile(state, 0); for (let i = 0; i < 120; i++) prediction.advance({ ...emptyWireInput(), throttle: 1 });
  prediction.advance({ ...emptyWireInput(), throttle: 1, drift: true }); prediction.reconcile(state, 0);
  assert.equal(hops, 0); off(); k.dispose();
});

test('real BinaryPack round trip preserves stopped-racer snapshots after damping reaches subnormal floats', async () => {
  const snapshot = JSON.parse(await readFile(new URL('./fixtures/busy-race.json', import.meta.url), 'utf8'));
  const k = kart(); const state = wire(k);
  state.velocity.y = Number.MIN_VALUE; state.position.y = -1e-320; state.quaternion.x = 1e-310;
  state.physics.groundVy = -1e-320; state.physics.vy = Number.MIN_VALUE; state.physics.collisionCooldown[0] = 1e-319;
  snapshot.karts[1] = state; snapshot.inputAcks = [0, 10000, 0, 0, 0, 0, 0, 0];
  const safe = parseSnapshot(snapshot); assert.ok(safe);
  const decoded = unpack(await pack(safe)); assert.ok(parseSnapshot(decoded));
  assert.equal(decoded.karts[1].velocity.y, 0); assert.equal(decoded.karts[1].physics.groundVy, 0);
  state.velocity.y = NaN; assert.equal(parseSnapshot(snapshot), null); k.dispose();
});

test('host hit/lap/item state wins over predicted inputs, and an outage bounds replay history', () => {
  const host = kart(), client = kart(); const p = createKartPrediction(client, flatTrack, () => false);
  p.reconcile(wire(host), 0);
  for (let i = 1; i <= 60; i++) { p.advance({ ...emptyWireInput(), throttle: 1 }); if (i <= 30) { host.setInput({ ...createEmptyInput(), throttle: 1 }); host.update(FIXED_DT, flatTrack, []); } }
  host.applyHit('green_shell', 0); host.state.lap = 2; host.state.place = 7; host.state.item = 'none';
  assert.equal(p.reconcile(wire(host), 30), true);
  assert.equal(client.state.isSpinning, true); assert.equal(client.state.lap, 2); assert.equal(client.state.place, 7); assert.equal(client.state.item, 'none');
  for (let i = 0; i < 400; i++) p.advance(emptyWireInput());
  assert.equal(p.pendingCount, 240); assert.equal(p.advance(emptyWireInput()), null);
  assert.equal(p.reconcile(wire(host), 29), false); // delayed acknowledgement must not rewind newer authority
  host.dispose(); client.dispose();
});

test('a stopped remote human is not mistaken for a stuck bot and teleported after six seconds', () => {
  const karts = Array.from({ length: 8 }, (_, id) => new Kart(id, CHARACTERS[id], id === 0, { visuals: false }));
  const checkpoints = Array.from({ length: 12 }, (_, index) => ({ index, t: index / 12, position: new THREE.Vector3(0, 0, -index * 100), forward: new THREE.Vector3(0, 0, -1), halfWidth: 20, isFinishLine: index === 0 }));
  const track = { def: { id: 'test' }, checkpoints, startGrid: karts.map((_, i) => ({ position: new THREE.Vector3(i * 3, 0, 5), quaternion: new THREE.Quaternion(), t: .99 })), sample(t, out) { out.tangent.set(0, 0, -1); out.position.set(0, 0, -t * 1200); return out; } };
  const manager = new RaceManager(track, karts, { characterId: 'torin', trackId: 'test', difficulty: 'easy', laps: 1 }); manager.setHumanSlots([0, 1]);
  const respawns = []; const off = events.on('kart:respawn', (e) => respawns.push(e.kartId)); manager.startCountdown(); manager.update(4);
  for (let tick = 0; tick < 1000; tick++) manager.update(FIXED_DT);
  assert.equal(respawns.includes(1), false); assert.equal(respawns.includes(2), true);
  off(); manager.dispose(); karts.forEach((k) => k.dispose());
});
