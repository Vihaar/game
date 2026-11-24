import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { RoomTransport } from '../RoomTransport.ts';
import { emptyWireInput } from '../protocol.ts';

class Connection extends EventEmitter {
  open = false; dataChannel = { bufferedAmount: 0 };
  bufferSize = 0;
  constructor(peer, serialization = 'binary') { super(); this.peer = peer; this.serialization = serialization; }
  send(message) {
    // Mirrors PeerJS1.5.5 JSONConnection's real limit; binary uses its chunking path.
    if (this.serialization === 'json' && new TextEncoder().encode(JSON.stringify(message)).length >= 16300) { this.emit('error', { type: 'message-too-big' }); return; }
    const copy = structuredClone(message); queueMicrotask(() => { if (this.other?.open) this.other.emit('data', copy); });
  }
  close() { if (!this.open) return; this.open = false; queueMicrotask(() => this.emit('close')); if (this.other?.open) { this.other.open = false; queueMicrotask(() => this.other.emit('close')); } }
}
function network(serializationOverride) {
  const peers = new Map(); let next = 0;
  class FakePeer extends EventEmitter {
    connections = []; destroyed = false;
    constructor(id) { super(); this.id = id ?? `guest-${++next}`; if (peers.has(this.id)) queueMicrotask(() => this.emit('error', { type: 'unavailable-id' })); else { peers.set(this.id, this); queueMicrotask(() => this.emit('open', this.id)); } }
    connect(id, options = {}) {
      const local = new Connection(id, serializationOverride ?? options.serialization); this.connections.push(local);
      queueMicrotask(() => {
        const host = peers.get(id); if (!host) { this.emit('error', { type: 'peer-unavailable' }); return; }
        const remote = new Connection(this.id, local.serialization); local.other = remote; remote.other = local; host.connections.push(remote); host.emit('connection', remote);
        local.open = remote.open = true; remote.emit('open'); local.emit('open');
      });
      return local;
    }
    destroy() { if (this.destroyed) return; this.destroyed = true; if (peers.get(this.id) === this) peers.delete(this.id); this.connections.forEach((c) => c.close()); }
  }
  return { createPeer: (id) => new FakePeer(id), connectionTimeoutMs: 1000 };
}
const settings = { characterId: 'torin', trackId: 'sunny-circuit', difficulty: 'easy', laps: 1 };
const profile = { name: 'Torin', characterId: 'torin' };
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('two browser adapters share lobby, authoritative start, safe input, results, restart, release and host disconnect', async () => {
  const options = network(); const starts = []; const restarts = []; const results = []; const departures = []; const errors = [];
  const host = new RoomTransport({ onPlayerLeft: (p) => departures.push(p) }, options);
  const client = new RoomTransport({ onStart: (s) => starts.push(s), onRestart: (s) => restarts.push(s), onResults: (s) => results.push(s), onError: (e) => errors.push(e) }, options);
  try {
    const code = await host.create(profile, settings);
    const welcome = await client.join(code.toLowerCase(), { name: 'Jonah', characterId: 'jonah' });
    assert.equal(welcome.slot, 1); assert.equal(client.localSlot, 1); assert.equal(host.roster.length, 2);
    client.updateProfile({ name: 'Grant', characterId: 'grant' }); await flush(); assert.equal(host.roster[1].name, 'Grant');
    const start = host.startRace(); await flush(); assert.equal(starts.length, 1); assert.equal(starts[0].raceId, start.raceId); assert.equal(client.status, 'racing');
    client.sendInput({ ...emptyWireInput(), throttle: 1, useItem: true }, 100); await flush();
    assert.equal(host.consumeInput(1).throttle, 1); assert.equal(host.consumeInput(1).useItem, false);
    const rows = [{ kartId: 1, name: 'Grant', color: 0xff00ff, place: 1, finishTime: 38, isPlayer: false }];
    host.broadcastResults(rows); await flush(); assert.equal(client.status, 'results'); assert.equal(results.length, 1);
    host.restart(); await flush(); assert.equal(client.status, 'lobby'); assert.equal(restarts.length, 1);
    host.startRace(); await flush(); assert.equal(client.raceId, 2);
    client.leave(); await flush(); assert.equal(host.roster.length, 1); assert.equal(departures[0].slot, 1); assert.deepEqual(host.consumeInput(1), emptyWireInput());
    host.restart(); await client.join(code, profile); host.leave(); await flush(); assert.equal(client.status, 'disconnected'); assert.equal(errors.at(-1).code, 'host-left');
  } finally { host.dispose(); client.dispose(); }
});

test('missing room rejects promptly with a room-not-found error', async () => {
  const errors = []; const room = new RoomTransport({ onError: (e) => errors.push(e) }, network());
  try { await assert.rejects(room.join('ABC234', profile)); assert.equal(room.status, 'error'); assert.equal(errors.at(-1).code, 'peer-unavailable'); }
  finally { room.dispose(); }
});

test('race in progress welcomes new guests into an AI slot and sends the current start', async () => {
  const options = network(); const host = new RoomTransport({}, options); const starts = []; const client = new RoomTransport({ onStart: (s) => starts.push(s) }, options);
  try { const code = await host.create(profile, settings); const start = host.startRace(); host.markReady(); assert.equal(host.allReady, true); const welcome = await client.join(code, profile); await flush(); assert.equal(welcome.slot, 1); assert.equal(host.roster.length, 2); assert.equal(starts[0].raceId, start.raceId); assert.equal(client.status, 'racing'); assert.equal(host.allReady, false); client.markReady(); await flush(); assert.equal(host.allReady, true); }
  finally { host.dispose(); client.dispose(); }
});

test('real handshakes enforce eight total racers and reuse the disconnected slot', async () => {
  const options = network(); const host = new RoomTransport({}, options); const guests = Array.from({ length: 8 }, () => new RoomTransport({}, options));
  try {
    const code = await host.create(profile, settings);
    for (let i = 0; i < 7; i++) { const joined = await guests[i].join(code, { ...profile, name: `Guest ${i}` }); assert.equal(joined.slot, i + 1); }
    await assert.rejects(guests[7].join(code, profile)); assert.equal(host.roster.length, 8);
    guests[2].leave(); await flush(); const replacement = await guests[7].join(code, profile); assert.equal(replacement.slot, 3); assert.equal(host.roster.length, 8);
  } finally { guests.forEach((g) => g.dispose()); host.dispose(); }
});

const busySnapshot = async () => JSON.parse(await readFile(new URL('./fixtures/busy-race.json', import.meta.url), 'utf8'));

test('busy real-engine state above PeerJS JSON limit stays connected and reaches binary guests, including late joins', async () => {
  const options = network(); const received = []; const host = new RoomTransport({}, options); const guest = new RoomTransport({ onSnapshot: (s) => received.push(s) }, options); const late = new RoomTransport({ onSnapshot: (s) => received.push(s) }, options);
  try {
    const snapshot = await busySnapshot();
    assert.ok(new TextEncoder().encode(JSON.stringify({ v: 1, type: 'snapshot', snapshot })).length > 16300);
    const code = await host.create(profile, settings); await guest.join(code, profile); host.startRace(); await flush();
    assert.equal(guest.hostConnection.serialization, 'binary');
    assert.equal(host.broadcastSnapshot({ ...snapshot, raceId: 1, sequence: 1 }, 100), true); await flush();
    assert.equal(received[0].hazards.length, 40); assert.equal(host.roster.length, 2); assert.equal(guest.status, 'racing');
    await late.join(code, profile); await flush(); assert.equal(late.status, 'racing'); assert.equal(received.length, 2); assert.equal(received[1].hazards.length, 40);
  } finally { host.dispose(); guest.dispose(); late.dispose(); }
});

test('old JSON guests get actionable reload notice before they can lose state mid-race', async () => {
  const options = network('json'); const host = new RoomTransport({}, options); const errors = []; const guest = new RoomTransport({ onError: (e) => errors.push(e) }, options);
  try { const code = await host.create(profile, settings); await assert.rejects(guest.join(code, profile)); assert.equal(errors.at(-1).code, 'version'); assert.match(errors.at(-1).message, /Reload both/); assert.equal(host.roster.length, 1); }
  finally { host.dispose(); guest.dispose(); }
});

test('WAN backpressure drops obsolete snapshots, keeps control traffic, and recovers with newest state', async () => {
  const options = network(); const received = []; const host = new RoomTransport({}, options); const guest = new RoomTransport({ onSnapshot: (s) => received.push(s) }, options);
  try {
    const snapshot = await busySnapshot(); const code = await host.create(profile, settings); await guest.join(code, profile); host.startRace(); await flush();
    const connection = host.guests.values().next().value.connection;
    connection.dataChannel.bufferedAmount = 40000;
    for (let i = 1; i <= 1200; i++) host.broadcastSnapshot({ ...snapshot, raceId: 1, sequence: i }, 100 + i * 50);
    await flush(); assert.equal(received.length, 0); assert.equal(host.diagnostics.droppedTransientPackets, 1200); assert.equal(host.roster.length, 2);
    connection.dataChannel.bufferedAmount = 0; connection.bufferSize = 1;
    host.broadcastSnapshot({ ...snapshot, raceId: 1, sequence: 1201 }, 60200); await flush(); assert.equal(received.length, 0);
    connection.bufferSize = 0;
    host.broadcastSnapshot({ ...snapshot, raceId: 1, sequence: 1202 }, 60300); await flush(); assert.equal(received.at(-1).sequence, 1202);
    connection.dataChannel.bufferedAmount = 40000;
    host.broadcastResults([{ kartId: 0, name: 'Torin', color: 0, place: 1, finishTime: 60, isPlayer: true }]); await flush(); assert.equal(guest.status, 'results');
  } finally { host.dispose(); guest.dispose(); }
});

test('a rejected individual send does not evict a racer and invalid snapshots are visible in diagnostics', async () => {
  const options = network(); const host = new RoomTransport({}, options); const guest = new RoomTransport({}, options);
  try {
    const code = await host.create(profile, settings); await guest.join(code, profile); host.startRace(); await flush();
    const connection = host.guests.values().next().value.connection; connection.emit('error', { type: 'message-too-big' }); assert.equal(host.roster.length, 2); assert.equal(host.diagnostics.sendErrors, 1);
    const snapshot = await busySnapshot(); snapshot.karts[0].speed = NaN; assert.equal(host.broadcastSnapshot(snapshot, 100), false); assert.equal(host.diagnostics.invalidOutgoingSnapshots, 1);
  } finally { host.dispose(); guest.dispose(); }
});
