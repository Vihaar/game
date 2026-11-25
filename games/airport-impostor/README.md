# Airport Impostor · Terminal Odd

A small behavior-based social deduction game at a fictional airport. One impostor blends among 30 numbered travelers while secretly checking a flight board, swapping a suitcase full of forbidden rubber ducks and reaching Gate C. Security has three inspections and 150 seconds. The map and travelers are drawn from separate Phaser graphics, shapes, labels and containers; there is no complete scene image.

## Modes and controls

- **Be the impostor:** move against AI security. WASD/arrows walk, Shift runs, hold E/Space or the Interact button at an objective. Tap Walk here or click the map to walk to a location. Complete the flight board and luggage errands in either order; Gate C opens afterward. Continuous proximity/holding is required. Running raises AI attention; normal walking and pauses blend in.
- **Work security:** watch an AI impostor and 29 ordinary travelers. Select someone on the map or in the traveler selector, observe their route, then Inspect. Three wrong inspections lose; a correct inspection or keeping the impostor until time expires wins. Ordinary travelers visit the same stations, so one visit alone is not proof.
- **Local showdown:** two people share the device. The impostor reads a private assignment while security looks away, then hides it. WASD/arrows or the on-screen direction pad move the impostor; the second player selects and inspects with mouse/touch. No identity highlight remains during play. The timer and inspection controls pause during the private briefing.
- **Mobile:** the direction pad, Walk here buttons, hold-to-interact button and traveler selector cover all required actions. The terminal map scales to the screen.
- **Replay:** Play again starts a clean round; Change roles returns to the lobby. `?seed=42` makes traveler placement and role assignment repeatable for a test. Sound is disabled; reduced-motion CSS removes decorative transitions.

This prototype supports solo AI and local same-device play. It has **no online rooms or remote multiplayer**. No accounts, real-world airport data, private messages or paid backend are used. Suspicion is about movement and objectives, never appearance, race, religion or nationality. The contraband and setting are fictional comedy, not security advice.

## Run

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Set `GAME_BASE=/games/airport-impostor/` for embedded hosting; default is `./`. Phaser 3.90.0 is pinned. Vite’s production bundle includes the Phaser runtime; it loads no remote graphics or audio.

Rules live in src/rules.mjs and run without rendering. Phaser owns the canvas, rendering/input loop and resize handling; src/main.js composes the airport and connects the controls. Tests cover seeded assignment, movement normalization/bounds, real proximity/dwell objectives, gate prerequisites, exact inspection limits, both victory conditions, AI objective routines, behavioral AI inspection and restart. Browser QA checks a completed objective route, actual inspection, local privacy handoff, restart and 390px layout.

See THIRD_PARTY.md for engine/seed-helper provenance and public licenses. Original contributions are MIT.
