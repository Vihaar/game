# Small games. Very questionable decisions.

Four open-source browser game prototypes. Play, break them, and help make them funnier.

| Game | What you do | Source |
| --- | --- | --- |
| [Server Kart](https://vihaar.me/games/mike/) | Everyone drives Mike. Friends join a room and replace AI racers. | [games/server-kart](games/server-kart) |
| [The Fold](https://vihaar.me/games/the-fold/) | Follow a guided paper-library journey, face questions in turn-based battles, and forge new knowledge. | [games/card-roguelike](games/card-roguelike) |
| [Don't Spill the Soup](https://vihaar.me/games/soup/) | Carry a full bowl through a short, inconvenient shift. | [games/soup](games/soup) |
| [One More Person](https://vihaar.me/games/elevator/) | Drag and rotate passengers into an increasingly crowded elevator. | [games/elevator](games/elevator) |

These are small first playable versions, with room for better art, balance, tracks, cards, passengers, and jokes. The hub is at [vihaar.me/games](https://vihaar.me/games/).

## Run locally

Use Node.js 22.12+ and npm. No API keys, database, or paid service is required to run the games. Kart rooms use PeerJS's public signaling service by default.

```sh
git clone https://github.com/Vihaar/game.git
cd game
npm ci
npm run setup:games
npm run dev
```

The default dev command opens the kart project's server. Choose another with `npm run dev:fold`, `npm run dev:soup`, or `npm run dev:elevator`. Open the URL printed by Vite.

```sh
npm run typecheck
npm test
npm run build
```

These check and build every game. Each game produces its own static `dist/`. The website repository downloads a pinned public source commit and publishes those builds under `/games/`.

## Playing kart with friends

Open **Play with friends**, choose a driver/name, and host a room. Share the invite link or six-character code. Up to eight people can play; remaining seats use AI. Keep the host tab open. Guest disconnects return their seat to AI; there is no host migration. Some restrictive networks require a TURN relay; connection errors are shown in the lobby. See the [kart guide](games/server-kart/README.md).

Kart controls: WASD/arrows drive, Space/Shift drift, E uses an item, Q looks back, Esc opens the menu, and M mutes the original ice-cream-truck-style chime music. Kart targets desktop keyboard/gamepad. The Fold uses visible buttons for guided exploration and turn-based battles, with mouse, touch and keyboard support.

The finish-line checkout is a **joke with imaginary MikeCoins**. It never collects card details or charges real money. The distraction item uses a nonsexual animated censor-card gag.

## Existing foundations first

The repository started from the [official Phaser Vite/TypeScript template](https://github.com/phaserjs/template-vite-ts). Each playable game then reuses a more directly relevant licensed foundation:

- Kart: a remix of [BridgeMind's complete Turbo Kart Rush](https://github.com/bridge-mind/turbo-kart-rush), with Three.js and PeerJS networking.
- The Fold: Three.js paper dioramas and turn-based card combat. Its initial [official Three.js Octree/Capsule example](https://github.com/mrdoob/three.js/blob/r181/examples/games_fps.html) adaptation remains in source; the guided game reuses Three.js geometry, texture atlases and raycasting.
- Soup and elevator: [Matter.js's actual ball-pool, compound-body, and manipulation examples](https://github.com/liabru/matter-js/tree/master/examples). Soup uses a rigid-particle approximation, not a real fluid solver.

Read the [foundation research](docs/FOUNDATIONS.md), [kart research](docs/KART_FOUNDATIONS.md), and each game's retained source/license notices. The original starter documentation remains in [docs/PHASER_TEMPLATE.md](docs/PHASER_TEMPLATE.md).

## Help build it

Anyone can contribute code, art, sound, jokes, ideas, or playtest feedback. Fork the repo and submit a pull request; collaborator access is not required. Start with a [good first issue](https://github.com/Vihaar/game/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22), or [suggest an idea](https://github.com/Vihaar/game/issues/new/choose). See [CONTRIBUTING.md](CONTRIBUTING.md).

Code is [MIT licensed](LICENSE), with retained third-party notices in each game. User-requested Discord avatar images are separate third-party assets and are excluded from the code license. See [THIRD_PARTY.md](THIRD_PARTY.md) and game-specific credits before reusing assets.
