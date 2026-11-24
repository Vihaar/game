# Server Kart: everybody drives Mike

A goofy 3D browser racer starring Torin, Jonah, Grant, and whoever joins the room. Eight seats, two-lap races, drift boosts, joke items, and server events. Every kart carries Mike's picture.

## Play locally

Use Node.js 22.12+ and npm.

```sh
cd games/server-kart
npm ci
npm run dev
```

Open the URL printed by Vite. WASD/arrows drive, Space/Shift drift, E uses an item, Q looks back, Esc opens the menu, and M mutes. The first version supports desktop keyboard and gamepad controls.

## Play with friends

Open **Play with friends**, choose a racer/name, and host a room. Share its link/code. Friends join and replace AI seats, including during a race. Empty or disconnected seats return to AI. The host keeps their tab open; there is no host migration.

PeerJS supplies existing WebRTC transport and public cloud signaling. The host runs the race; guests send controls and receive validated state. Some restrictive networks require a TURN relay. A failed connection shows an error rather than pretending to have joined. See [networking notes](src/net/README.md) for configurable signaling/ICE and protocol tests.

Graphics start in **Smooth** mode: no dynamic shadows or screen effects, with a capped drawing resolution. Use the bottom-right button to enable **Fancy** on a faster computer. During an online race, the bottom bar lists connected friends and local FPS. A red warning means no position updates have arrived for 1.5 seconds; reconnect to the room if it persists. The minimap shows racers who have driven out of view. Guests still depend on the host's connection and simulation; local input prediction and host migration are not implemented.

## The nonsense

- Cheese tax, mic-check bounces, a brief announced steering reversal, and temporary admin powers.
- A fake finish-line checkout advertises a coffee and quotes **$250,000 imaginary MikeCoins**. Both buttons reject the transaction. It auto-dismisses, never stops the race, and never collects payment details or charges money.
- The **Boobs Distraction** item displays an animated, nonsexual censor-card gag. There are no celebrity or sexual images in the game.
- Original ice-cream-truck-style chime music, synthesized with the existing audio engine. M mutes it.

## Check and build

```sh
npm run typecheck
npm test
npm run build
```

`dist/` is static and uses relative asset paths. The website hosting integration adds its `/games/mike/` document base when publishing.

## Reused foundation

This is a remix of [BridgeMind's Turbo Kart Rush](https://github.com/bridge-mind/turbo-kart-rush) at commit `6c0456c7642447eae29e0832e7e542fec07ec07d`, under its retained MIT [LICENSE](LICENSE). Its actual Three.js race loop, tracks, kart handling, drift, AI, item systems, procedural geometry/audio, UI, and race results are reused. Original upstream documentation is in [UPSTREAM_README.md](UPSTREAM_README.md).

Changes add the friend roster, requested avatar assets, Mike kart portraits, server events, fake checkout, censor distraction, chime music, and multiplayer. See [THIRD_PARTY.md](THIRD_PARTY.md). Contributions are welcome through the public repo.
