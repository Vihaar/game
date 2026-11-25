# Friend Market

A solo, five-day economic roguelite about questionable investments in Mike, Torin, Jonah and Grant. A run takes about 2–4 minutes. All money is imaginary; there are no payments, accounts, multiplayer connections or actual ownership of people.

Buy a roster, stack talents, sell into good events, and meet each closing target. Closing value includes cash after nightly income/costs plus the current selling value of your roster. Cash must remain nonnegative. One arrival per friend per day prevents buy/sell loops. After Tuesday, choose a permanent upgrade. Friday is the final checkpoint.

Mouse/touch: use Buy, Sell, upgrade and Close buttons. Keyboard: Tab/Shift+Tab to a control and Enter/Space to activate it. Replay keeps the week seed; New week changes it. `?seed=42` shares the same events/prices. Reduced-motion preferences disable smooth scrolling. No audio.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Vite defaults to relative asset URLs. Set `GAME_BASE=/games/friend-market/` for an explicit hosted subpath. Deploy `dist/` as static files. No backend is required.

The model lives in `src/rules.mjs`, separate from the DOM. Eight rule tests cover talent interactions, rejected trades, stock-loop prevention, upgrade persistence and full win/loss campaigns. Browser validation is recorded in the implementation handoff; a known legal default-week strategy buys Torin, Jonah, then Mike when affordable and takes the van. Different seeds and upgrades change opportunities.

## Reuse and contributing

Original game/rules/UI code: MIT. Start with the pure rules, add a meaningful regression test, then check the real UI at desktop and 390px. Keep portraits' separate rights notices when remixing. See THIRD_PARTY.md and public/licenses/NOTICE.txt for provenance. Contributions welcome through https://github.com/Vihaar/game.

Verified in an isolated muted headless Chromium session: legal default week won at 144¢ after five closes; replay reset cash/roster; idle Tuesday loss and second replay passed; all four portraits loaded; 390×844 had no horizontal overflow; no browser errors. screenshots/preview.png is real desktop play after buying Torin and Jonah. Screenshot mobile.png records the narrow layout.
