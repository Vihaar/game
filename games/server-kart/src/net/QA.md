# Multiplayer validation — 2026-11-24

## Long-run/busy-state regression follow-up

- Ran 240 simulated seconds of the real Kart/AI/ItemManager/ServerChaos implementation in an isolated muted headless browser. Validated all 4,800 20Hz snapshots: zero invalid states; normal-race sizes ranged from 8,998 to 10,347 JSON bytes with up to five active hazards. Strict finite-field validation was not the observed failure.
- Staged the engine's supported maximum of 40 moving shell hazards through ItemManager APIs. The resulting valid snapshot was 17,599 JSON bytes, exceeding PeerJS 1.5.5 JSONConnection's 16,300-byte cutoff. Its `message-too-big` event previously flowed into unconditional `dropGuest`, explaining a concrete busy-race disappearance path.
- With binary serialization, two real PeerJS peers negotiated through public cloud signaling and delivered a 25,776-JSON-byte/80-hazard protocol stress packet intact. Both peers remained racing with two roster members; diagnostics showed no send or parse errors. This deliberately exceeds the engine's normal 40-hazard cap to exercise transport headroom.
- Regression tests include the captured real-engine busy-state fixture, large state delivery/late joins, rejection of old JSON clients with reload instructions, individual rejected sends retaining membership, and 1,200 blocked snapshots over 60 virtual seconds. Clearing browser/PeerJS backpressure delivered only the newest snapshot, and results still reached the client while transient traffic was blocked.
- Existing game/protocol tests plus new transport regressions pass (20 tests). The audit browser was closed. These checks establish the reproduced packet-size failure and bounded queue recovery; they do not measure every household's real WAN quality.

The integrated game was exercised in two isolated agent-browser Chrome contexts, not the user's browser or native apps. Both test browsers were muted and closed after testing. Final typecheck/build and 13 protocol/game-rule tests pass.

## Real browser checks

- Local signaling: official `peer` PeerServer, port 9001, path `/mike`; Vite port 5199, two separate Chrome sessions. Torin hosted and Jonah joined slot 1; both completed readiness and shared countdown and reached racing. Camera/HUD used the guest's Jonah kart, not host slot 0.
- Guest keyboard throttle changed the authoritative host's kart 1 from z approximately -6.56 to -24.59, with observed speed 12.33m/s. This used real WebRTC data channels between the two browser contexts, not fake transport.
- Guest Escape opened only its room overlay. Host remained in racing and its race clock advanced from 48.26 to 53.80 seconds.
- Guest leaving released slot 1; host resumed AI for that seat, with observed AI throttle 0.849. Rejoining during the active race reclaimed an AI slot and received the existing race state without restarting everyone.
- Authority finish was triggered through the existing RaceManager finish/update methods to test delivery of the result lifecycle. Guest received results with its own row marked `(YOU)`. This validates result replication, not a complete manually driven lap.
- Host Race Again returned both clients to the same lobby; next Start began raceId 2.
- Navigating the host away disconnected the guest, which showed the host-left notice and invitation UI.
- Public signaling: repeated the host/join/start flow using `0.peerjs.com:443`, secure signaling, with no user credentials or private server. Torin and Grant joined and reached racing. Guest controls produced authoritative host kart speed 15.69m/s.
- Host created a dropped banana using the existing ItemManager API; guest received and displayed the matching remote hazard (one active mesh). Guest box instances reuse upstream item geometry/materials and follow the host's active-box list.
- Both contexts' browser error lists were empty during these checks. Guest canvas and lobby were captured and visually inspected.

## Scope and remaining limits

The tests used two separate browser contexts on one machine. Cross-household NAT/firewall combinations are not exhaustively verified; PeerJS defaults include its public ICE configuration and custom ICE/signaling options remain supported. Host migration is not implemented. Guest movement uses interpolated host snapshots rather than prediction/rollback. Background host simulation has a timer path, but OS sleep or a suspended browser can still stop the host.

The final PlayerPranks hook reuses the root-owned presentation module. That hook and small loading/background cleanup changes were typechecked/built after the browser runs; the combined root avatar/audio/prank styling changes require the root's final smoke check.

## Commands

```sh
npm run typecheck
npm run build
node --import tsx --test src/game/chaosRules.test.ts src/net/tests/protocol.test.mjs src/net/tests/transport.test.mjs
```

The original stylesheet has a late `@import './server.css'` build warning; the owner was notified to move that import before final publication. This integration does not overwrite the owner's shared stylesheet or customized item/portrait/audio modules.
