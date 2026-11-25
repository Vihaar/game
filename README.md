# Small games. Very questionable decisions.

An open-source browser arcade. Play, break things, and help make the games funnier.

| Game | What you do | Source |
| --- | --- | --- |
| [Server Kart](https://vihaar.me/games/mike/) | Everyone drives Mike. Friends join a room and replace AI racers. | [games/server-kart](games/server-kart) |
| [The Fold](https://vihaar.me/games/the-fold/) | Follow a guided paper-library journey, face questions in turn-based battles, and forge new knowledge. | [games/card-roguelike](games/card-roguelike) |
| [Don't Spill the Soup](https://vihaar.me/games/soup/) | Carry a full bowl through a short, inconvenient shift. | [games/soup](games/soup) |
| [One More Person](https://vihaar.me/games/elevator/) | Drag and rotate passengers into an increasingly crowded elevator. | [games/elevator](games/elevator) |
| [Friend Market](https://vihaar.me/games/friend-market/) | Build a goofy friend roster and survive five market closes. Solo. | [games/friend-market](games/friend-market) |
| [Group Chat Court](https://vihaar.me/games/group-chat-court/) | Present evidence and persuade a deeply unqualified jury. Solo or same-device hotseat. | [games/group-chat-court](games/group-chat-court) |
| [One Brain Cell](https://vihaar.me/games/one-brain-cell/) | Share control of one Mike and complete a chaotic physics delivery. | [games/one-brain-cell](games/one-brain-cell) |
| [Airport Impostor](https://vihaar.me/games/airport-impostor/) | Blend into thirty travelers or identify an impostor by suspicious behavior. | [games/airport-impostor](games/airport-impostor) |
| [Friend Patch Notes](https://vihaar.me/games/friend-patch-notes/) | Draft ridiculous buffs and watch your friends battle. | [games/friend-patch-notes](games/friend-patch-notes) |
| [Trust Me, Bro](https://vihaar.me/games/trust-me-bro/) | Follow unreliable directions through a maze. | [games/trust-me-bro](games/trust-me-bro) |

These are small first playable versions, with room for better art, balance, tracks, cards, passengers, and jokes. The hub is at [vihaar.me/games](https://vihaar.me/games/).

## Run locally

Use Node.js 22.12+ and npm. The latest arcade prototype is on `codex/friends-arcade`; the hosted release records its exact source commit in [provenance.json](https://vihaar.me/games/provenance.json). No API keys, database, or paid service is required to run the games. Kart rooms use PeerJS's public signaling service by default.

```sh
git clone --branch codex/friends-arcade https://github.com/Vihaar/game.git
cd game
npm ci
npm run setup:games
npm run dev
```

The default dev command opens the kart project's server. Choose another with `npm run dev:fold`, `dev:soup`, `dev:elevator`, `dev:court`, `dev:market`, `dev:brain`, `dev:airport`, `dev:patch`, or `dev:trust` (prefix each with `npm run`). Open the URL printed by Vite.

```sh
npm run typecheck
npm test
npm run build
```

These discover, check and build every game directory with a package manifest. Each game produces its own static `dist/`. The website repository downloads a pinned public source commit and publishes those builds under `/games/`.

## Playing kart with friends

Open **Play with friends**, choose a driver/name, and host a room. Share the invite link or six-character code. Up to eight people can play; remaining seats use AI. Keep the host tab open. Guest disconnects return their seat to AI; there is no host migration. Some restrictive networks require a TURN relay; connection errors are shown in the lobby. See the [kart guide](games/server-kart/README.md).

Kart controls: WASD/arrows drive, Space/Shift drift, E uses an item, Q looks back, Esc opens the menu, and M mutes the original ice-cream-truck-style chime music. Kart targets desktop keyboard/gamepad. The Fold uses visible buttons for guided exploration and turn-based battles, with mouse, touch and keyboard support.

The finish-line checkout is a **joke with imaginary MikeCoins**. It never collects card details or charges real money. The distraction item uses a nonsexual animated censor-card gag.

## Friend arcade modes

The new friend games are small first playable prototypes. Friend Market and Friend Patch Notes are solo. Group Chat Court has solo AI and two-person pass-and-play on the same device. Read each game's visible mode labels and README for local co-op controls; do not assume that a shared URL connects players online. Kart remains the established online room-code game. All purchases, currencies, accusations and airport objectives are fictional; none collects money or private messages.

## Existing foundations first

The repository started from the [official Phaser Vite/TypeScript template](https://github.com/phaserjs/template-vite-ts). Each playable game then reuses a more directly relevant licensed foundation:

- Kart: a remix of [BridgeMind's complete Turbo Kart Rush](https://github.com/bridge-mind/turbo-kart-rush), with Three.js and PeerJS networking.
- The Fold: Three.js paper dioramas and turn-based card combat. Its initial [official Three.js Octree/Capsule example](https://github.com/mrdoob/three.js/blob/r181/examples/games_fps.html) adaptation remains in source; the guided game reuses Three.js geometry, texture atlases and raycasting.
- Soup and elevator: [Matter.js's actual ball-pool, compound-body, and manipulation examples](https://github.com/liabru/matter-js/tree/master/examples). Soup uses a rigid-particle approximation, not a real fluid solver.

Read the [foundation research](docs/FOUNDATIONS.md), [kart research](docs/KART_FOUNDATIONS.md), and each game's retained source/license notices. The original starter documentation remains in [docs/PHASER_TEMPLATE.md](docs/PHASER_TEMPLATE.md).

## Help build it

Anyone can contribute code, art, sound, jokes, ideas, or playtest feedback. Fork the repo and submit a pull request; collaborator access is not required. Start with a [good first issue](https://github.com/Vihaar/game/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22), or [suggest an idea](https://github.com/Vihaar/game/issues/new/choose). See [CONTRIBUTING.md](CONTRIBUTING.md).

Code is [MIT licensed](LICENSE), with retained third-party notices in each game. User-requested Discord avatar images are separate third-party assets and are excluded from the code license. See [THIRD_PARTY.md](THIRD_PARTY.md) and game-specific credits before reusing assets.
