# Mike room transport

MIT-licensed [PeerJS](https://github.com/peers/peerjs/blob/master/LICENSE) supplies existing WebRTC data-channel/signaling infrastructure. This module adds the game's room protocol; it does not replace the reused kart simulation. Install `peerjs@1.5.5` in the application package. Preserve PeerJS's license with the project's other third-party notices.

## Architecture

The host reserves a six-character code as `vihaar-mike-v1-CODE`, owns slot 0, and runs every kart's simulation, AI, items, checkpoints, laps and results. Up to seven guests receive stable slots 1–7, replacing those AI drivers. Unoccupied/disconnected slots return to AI under the Game integration. Guests send controls only and render host snapshots. Clients never send positions, laps, results, arbitrary slot IDs or pause/menu commands. The host ignores stale/wrong-race packets and rejects malformed controls instead of clamping malicious values into a valid command.

[PeerJS Cloud](https://peerjs.com/client/faq) handles signaling by default; gameplay data normally flows browser-to-browser. Some networks require a TURN relay. This module does not promise universal NAT traversal or host migration. If the host tab closes, clients receive `host-left` and must create/join a new room. Anyone with the room code can join a waiting room; codes are invitations, not account authentication.

## API and integration

```ts
import { RoomTransport, peerOptionsFromEnv, snapshotKart } from './net';

const room = new RoomTransport({
  onState(status) { /* update lobby status */ },
  onRoster(roster, settings) { /* show players; mark slots occupied by humans */ },
  onWelcome({ slot, roomCode }) { /* local player/camera follows this slot */ },
  onStart({ raceId, seed, settings, roster }) { /* load same circuit and roster, then countdown */ },
  onSnapshot(snapshot) { /* clients only: apply/interpolate, never simulate authority */ },
  onResults(standings) { /* display same authoritative results, highlighting localSlot */ },
  onRestart(settings, roster) { /* dispose race and reopen shared lobby */ },
  onPlayerLeft(player) { /* host: return player.slot to AI */ },
  onError({ code, message }) { /* show text via textContent, not raw innerHTML */ },
}, {
  peerOptions: peerOptionsFromEnv(import.meta.env),
  allowedCharacterIds: rosterDefinitions.map((p) => p.id),
  allowedTrackIds: trackDefinitions.map((p) => p.id),
});

await room.create({ name: 'Torin', characterId: 'torin' }, settings);
// Another browser:
await room.join('ABC234', { name: 'Jonah', characterId: 'jonah' });
// Host only; invokes onStart on host and all connected guests:
room.startRace();
```

- Profiles are `{name, characterId}`; names have at most 24 characters. `RoomSettings` mirrors core `RaceSettings` (characterId, trackId, difficulty, laps). Game must use the roster's character per slot, rather than settings.characterId for every player.
- Roster entries are `{slot, peerId, name, characterId}`. Leave cosmetic cart naming to the game: everyone can ride a cart named Mike while driver labels identify friends.
- On host fixed updates, call `room.consumeInput(slot)` once for each remote human slot and pass `{...createEmptyInput(), ...remoteInput}` to its kart. Keep local host controls on slot 0. Invoke AI only for slots absent from room.roster. On clients, call `room.sendInput(localInput)` each input/render frame. The transport sends at most 30Hz, retaining an item edge until sent. Neutral controls replace missing packets after 300ms.
- Host snapshots: at 20Hz call `room.broadcastSnapshot({raceId: room.raceId, sequence: sequence++, raceTime: race.raceTime, phase: race.currentPhase, karts: karts.map(k => snapshotKart(k.state))})`. All eight kart states are required. This helper copies explicit primitive fields and vector components, excluding Three.js object graphs and private properties.
- Clients should buffer the newest snapshot during async scene loading and interpolate the authoritative poses once loaded. Update kart state and object transforms, then visual animation; avoid running client AI/physics/checkpoints/item simulation as a second authority. Host race timestamps are authoritative and need no wall-clock synchronization.
- Snapshot packet includes gameplay state for HUD/visuals. Optional `hazards` accepts `items.getHazards().map(snapshotHazard)` and optional `activeBoxes` accepts the active world positions; both are bounded and validated, so guest renderers can match host projectiles/dropped items/box availability. Game owns creating/updating these visual objects and must never use them as a second source of item collisions. Host item effects on kart states already replicate.
- `broadcastResults(standings)` broadcasts once from racing state and invokes host `onResults` as well. `restart()` returns the entire room to lobby; `startRace()` then increments raceId. A client should request restart through the UI's host, not call the host-only method locally.
- Call `leave()`/`dispose()` when leaving multiplayer or unloading the game. Switching game menus must not leave previous peers running.
- Late joining is supported: a guest replaces the lowest free AI seat, receives the active start/settings and newest world snapshot, and loads into the ongoing race. Disconnect releases the seat back to AI. Rejoining receives the lowest available seat, which may differ from the old one. Host migration, client prediction and rollback are not implemented.
- Initial start uses `markReady()` from each loaded browser and `allReady` on the host before beginning the shared countdown. Late-join readiness never pauses an already-running race.

## Configuration

Without environment variables, PeerJS uses its Cloud signaling defaults. A self-hosted PeerServer can be selected using public Vite variables:

```dotenv
VITE_PEER_HOST=localhost
VITE_PEER_PORT=9000
VITE_PEER_PATH=/mike
VITE_PEER_SECURE=false
```

Use secure signaling with a real TLS hostname for HTTPS sites. Optional `VITE_PEER_ICE_SERVERS` is a JSON array of RTCIceServer entries passed to PeerJS. Vite variables are public browser configuration; do not put durable secret TURN credentials in them. Supply short-lived relay credentials separately if needed. PeerJS supports custom `host`, `port`, `path`, `secure` and RTC `config` in its [Peer API](https://peerjs.com/client/api/peer).

## Validation

Run pure protocol/room tests and fake-peer end-to-end transport tests without a network server:

```sh
node --import tsx --test games/server-kart/src/net/tests/protocol.test.mjs games/server-kart/src/net/tests/transport.test.mjs
```

`tsx` is test tooling, not a runtime dependency. Tests cover slots/full-room/release, malformed and forged packets, edge input consumption/timeout, rate limiting, snapshots, joining, starting, authoritative input, results, restarting, missing room, mid-race rejection and host disconnection. They do not establish real-browser WebRTC connectivity; test two browser contexts against cloud or local signaling after Game integration.

Primary sources consulted: [PeerJS getting started](https://peerjs.com/client/getting-started), [Peer API/options](https://peerjs.com/client/api/peer), [DataConnection](https://peerjs.com/client/api/data-connection), [network/signaling FAQ](https://peerjs.com/client/faq), [client license](https://github.com/peers/peerjs/blob/master/LICENSE). Research date: 2026-11-24.
