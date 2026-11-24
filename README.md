# Two tiny games. Come build them.

We're making **Don't Spill the Soup** and **One More Person**: short, silly browser games you can send to a friend. A third experiment explores a **first-person card-crafting roguelike**.

Anyone can contribute code, art, sound, jokes, ideas, or playtest feedback.

**Status:** research and project setup. Running the app currently opens the upstream Phaser demo. Our games are not playable yet. The roguelike is being developed on a separate branch.

## The games

- **Don't Spill the Soup:** Carry a very full bowl across a room. Sudden movements send soup toward the rim. Survive interruptions and get a receipt for how much soup arrived. Target: 60–90 seconds.
- **One More Person:** Pack a tiny elevator with inconvenient passengers and their belongings. Drag, rotate, squeeze, then decide when to close the doors. Target: 1–3 minutes.
- **Card roguelike:** Explore in first person, collect cards, and combine them into new abilities. Start with a small playable run before expanding.

Read the [game plans](docs/GAME_PLANS.md) and [research into existing foundations](docs/FOUNDATIONS.md).

## Build on existing work

This repository was generated from the MIT-licensed [official Phaser + Vite + TypeScript template](https://github.com/phaserjs/template-vite-ts). Reuse established engines, examples, and assets with compatible licenses before writing custom systems. Keep attribution with everything reused.

- Elevator physics: [Matter.js](https://github.com/liabru/matter-js), available through Phaser, with existing dragging, compound-body, and stacking examples.
- Soup research: [LiquidFun browser demo and source](https://github.com/Birch-san/liquidfun-play-2). Its wave-machine example supplies real sloshing fluid; test its older toolchain before adapting it. It is not installed yet.
- Current starter: Phaser 4.0.0, Vite, TypeScript. The upstream README's Phaser 3 description is stale; package.json pins Phaser 4.

## Run locally

Use Node.js 22 LTS and npm. No API keys, database, or paid services are required.

```sh
git clone https://github.com/Vihaar/game.git
cd game
npm ci
npm run dev
```

Open the local URL printed by Vite. To check your changes:

```sh
npm run typecheck
npm run build
```

The build produces a static site in `dist/`. Default scripts skip the template's optional usage logger. Original starter documentation is preserved in [docs/PHASER_TEMPLATE.md](docs/PHASER_TEMPLATE.md).

## Join in

Start with a [good first issue](https://github.com/Vihaar/game/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22), or [suggest an idea](https://github.com/Vihaar/game/issues/new/choose).

Fork the repo, make a branch, and open a pull request. No collaborator access is required. See [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers review contributions before merging.

Code is [MIT licensed](LICENSE). Contributions must be yours to share or include a compatible license and credit. Third-party notices stay with their source; see [THIRD_PARTY.md](THIRD_PARTY.md).
