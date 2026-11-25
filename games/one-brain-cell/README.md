# One Brain Cell

Three departments jointly control one Mike while delivering an oversized sofa through a physics workshop. A round has a 90-second deadline, three foam obstacles, a telegraphed sneeze, and an emergency forklift costing five seconds.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Static output is `dist/`, suitable for `/games/one-brain-cell/`. Vite uses `GAME_BASE` or relative URLs.

## Controls

| Department | Keyboard | Pointer/touch |
|---|---|---|
| Torin: legs | A / D | Walk buttons |
| Jonah: arms | F grabs or drops | Grab / drop |
| Grant: jump and balance | Space, left/right arrows | Jump and tilt buttons |

Solo: choose one department; AI fills the others. Same-keyboard mode enables all three departments for 2–3 people at one device. Empty online departments use AI. Unstick returns both bodies to a checkpoint and costs five seconds. Pause freezes the shift; background tabs stop simulation. No audio is played.

## Online rooms

Choose Online, host a room, and share its six-character code or Copy room invite. Friends join a department and replace its AI, including during a delivery. The host starts/restarts and simulates physics; guests send controls and receive small pose snapshots. Keep the host tab open and visible; backgrounding the host pauses this prototype. Leaving a department restores AI. There is no host migration.

Offline modes require no service. Online uses PeerJS 1.5.5's public signaling and direct WebRTC data channels, without accounts or keys. Some restrictive networks need a TURN relay; this prototype supplies no private relay and cannot promise universal connectivity. Connection errors remain visible and offline modes stay available.

## Engineering limits

Matter.js 0.20 supplies rigid-body collisions and constraints. Mike's leg motor assists the attached sofa, and Grant's jump lifts the attached load: these are deliberate arcade controls, not a biomechanical simulation. AI balance and checkpoint rescue prevent permanent furniture softlocks. No purchases, analytics, server storage or Discord connection.

Original canvas art is code; Mike's user-requested portrait is separately credited and excluded from the MIT code license. See `THIRD_PARTY.md` and `public/licenses/`.
