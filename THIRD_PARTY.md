# Third-party sources

## Included

- **Phaser Vite TypeScript template**, Phaser Studio Inc — [source](https://github.com/phaserjs/template-vite-ts), MIT. Generated through GitHub's template feature. Copyright and permission notice retained in `LICENSE`; original documentation in `docs/PHASER_TEMPLATE.md`.
- **Phaser**, Phaser Studio and contributors — [source](https://github.com/phaserjs/phaser), MIT. Installed through npm; includes its adapted Matter physics integration. Retain distributed dependency notices.
- **Vite, TypeScript, Terser** — build dependencies installed through npm. Their license notices remain in their distributions.

- **Matter.js 0.20 and official examples**, Liam Brummitt and contributors — [source](https://github.com/liabru/matter-js), MIT. Soup, elevator and One Brain Cell retain their reused examples and notices; Trust Me Bro uses Matter wall queries. Exact revisions and local paths are recorded per game.

## Researched, not yet incorporated

- **liquidfun-play-2**, Alex Birch and upstream contributors — [source](https://github.com/Birch-san/liquidfun-play-2). Preserve `LICENSE.zlib.txt` and `LICENSE.liquidfun.txt` when adapting code. Not installed or copied yet.
- **box2d-wasm / liquidfun-wasm**, Birch-san and upstream contributors — [source](https://github.com/Birch-san/box2d-wasm). Follow its Zlib and upstream notices if selected. Not installed yet.

Record source URLs, authors, license texts, commit revisions, and local paths whenever code or assets are brought in.

## Playable game foundations

- Server Kart: BridgeMind's Turbo Kart Rush, MIT, pinned at `6c0456c7642447eae29e0832e7e542fec07ec07d`; Three.js and PeerJS. Exact source/license notes are in games/server-kart/THIRD_PARTY.md.
- The Fold: official Three.js FPS example, MIT, pinned upstream sources retained under games/card-roguelike/vendor; see its THIRD_PARTY.md.
- Soup and elevator: official Matter.js examples, MIT; each game retains pinned upstream source and notices.
- Requested Discord avatars: separate third-party images under games/server-kart/public/portraits, excluded from MIT code licensing. No chats, account credentials, or private profile metadata are included.

- The Fold bundles unchanged Almendra Regular/Italic by Ana Sanfelippo under SIL OFL 1.1. Source, hashes and license location are recorded in games/card-roguelike/THIRD_PARTY.md.


## Friend arcade additions

- Friend Market, Friend Patch Notes and Group Chat Court reuse existing Vite/seeded project foundations with original game rules and UI. Each directory retains its build/template notices and separate portrait credits.
- Airport Impostor uses Phaser 3.90.0 (MIT) for its actual graphics, input and scene runtime, with original layered airport/traveler art. See games/airport-impostor/THIRD_PARTY.md.
- One Brain Cell uses Matter.js 0.20.0 and its retained official compound/manipulation/ball-pool examples, plus PeerJS 1.5.5 for tested online rooms. See games/one-brain-cell/THIRD_PARTY.md and its public dependency notices.
- Trust Me Bro adapts Kees Meijer's MIT maze-generator at 29da89fd5b43c9e5c521de3ec76d5069d405d76c and uses Matter collision queries. Pinned source and license are retained under games/trust-me-bro/upstream, with production notices under public/licenses.
- Requested friend portraits reused in the arcade remain excluded from the MIT code license. No private messages or account credentials are included.
