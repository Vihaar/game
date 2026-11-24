# Contributing

Anyone can help. Bugs, sketches, sound effects, funny passenger ideas, and playtesting are as welcome as code.

## Your first contribution

1. Pick an [open issue](https://github.com/Vihaar/game/issues) or suggest an idea. Discuss large changes before spending a weekend on them.
2. Fork the repository to your GitHub account.
3. Clone your fork, run `npm ci`, then `npm run dev`.
4. Create a branch: `git switch -c your-name/short-description`.
5. Make a focused change. Run `npm run typecheck` and `npm run build`.
6. Push your branch and open a pull request to `Vihaar/game:main`.

Explain what changed and how you checked it. Include a screenshot for visual changes and the browser/device used for gameplay changes. Small pull requests are easier to review. GitHub's web editor also lets you propose documentation changes without a local setup.

## What we're aiming for

- One clear mechanic per small game, fast restarts, and short rounds.
- Mouse, touch, and keyboard controls wherever practical.
- Humor from situations and reactions.
- Existing frameworks and examples before new infrastructure. Link sources and preserve licenses.
- No accounts, secrets, analytics, or backend needed to play the initial games.

## Reused work and licensing

Only submit work you can legally share. List sources, authors, licenses, and local paths in `THIRD_PARTY.md`. Keep required notices. Do not copy proprietary game assets.

Original contributions are offered under this repository's MIT license. Separately licensed third-party material retains its own license; check compatibility before adding it.

## Working together

Be respectful, explain disagreements, and keep feedback about the work. Maintainers may request changes or close contributions that do not fit the game. Everyone can propose a change; repository write access is not required.
