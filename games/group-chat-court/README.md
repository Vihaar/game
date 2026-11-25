# Group Chat Court

Three fictional cases, four friends, and no actual legal authority. Defend Mike, Torin, Jonah and Grant against absurd accusations involving late arrivals, soup and office-chair racing. Each case has distinct evidence, a closing argument, named AI jurors, a majority verdict and a harmless sentence. One hearing lasts three cases.

## Play

- **Solo:** play defense against an AI prosecutor. Read the opposition’s case if you want. Choose an exhibit and a closing argument to persuade at least two of three AI jurors.
- **Pass & play:** two people share one device. One prosecutes, the other defends. Handoff screens cover choices between turns. Both sides pick evidence and an argument; named AI jurors resolve the case.
- The jury’s public tastes are receipts, drama and vibes. Dots on evidence and argument choices show their strengths. Verdicts reveal each juror’s vote and reason. Campaign totals count all nine jury votes.
- Mouse, touch and keyboard Tab/Enter work throughout. Nothing is timed. New hearing restarts immediately; Leave court returns to mode selection.
- This prototype has **no online rooms**. Pass & play means the same device. No account, microphone, private message access, AI service or paid backend is used.

Use `?seed=42` for a repeatable case order, friend assignment, AI prosecution and jury inclinations. A new hearing creates a fresh docket. Jury outcomes depend on the actual evidence/argument strengths with a small seeded inclination; ties presume innocence.

## Run and contribute

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Vite accepts `GAME_BASE=/games/group-chat-court/` for embedded production hosting and defaults to `./`. The game is independent under this directory. Add fictional cases in src/rules.mjs; every case needs three exhibits per side, bounded persuasion values and both verdict endings. Do not import private chat data or target personal vulnerabilities.

Rules tests verify deterministic dockets, changed strategy changing votes, both hotseat handoffs, exact-once campaign scoring, invalid-input rejection, full three-case completion and restart. Browser QA covers a complete solo hearing, restart, hotseat verdict, 390px layout and reduced-motion support.

Code and original court drawings are MIT. Existing friend portraits retain separate rights; THIRD_PARTY.md and public/portraits/CREDITS.md explain their provenance. No legal advice is provided by this intentionally unqualified fictional court.
