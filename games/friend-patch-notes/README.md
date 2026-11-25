# Friend Patch Notes

A solo, five-round autobattler about writing terrible software updates to Mike, Torin, Jonah and Grant. Pick one of three permanent patches each round, read the opponent's counterpatch, then run the build. A short campaign takes roughly 2–4 minutes when reading decisions; animations can be skipped. Three wins out of five renews your contract. Three losses fires you early.

Twelve real mechanical patches cover Mike's size/range/lifesteal, Torin's dash/speed/third-hit burst, Jonah's shield/healing/armor, and Grant's knockback/damage/splash. All patches persist, both teams heal between rounds, and announced clone base HP/damage escalate. Thirty-two simulated seconds is the battle limit; surviving HP fraction decides unfinished battles, ties favor clones. No player action changes combat after it begins.

Mouse/touch: select a patch, Run the build, then Draft next patch. Keyboard: Tab/Shift+Tab and Enter/Space activate controls. Show result skips animation; reduced motion shows outcomes immediately. Replay preserves the seed; New build changes it. Share `?seed=4` to reproduce the default campaign. No audio, backend, login, payments or network multiplayer.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Deploy dist/ as static files. Vite uses relative URLs by default; set GAME_BASE=/games/friend-patch-notes/ for an explicit subpath. Seeded pure simulation is in src/rules.mjs, DOM portrait choreography in src/main.js. Eight tests cover seed replay, patch lifecycle, every mechanical modifier, shield protection, real spatial knockback/dash, alternate choices, full victory and early defeat. Keep code changes focused and verify both the model and 390px UI.

Source code is MIT. Portrait rights are separate: see THIRD_PARTY.md, public/portraits/CREDITS.md and public/licenses/NOTICE.txt. Contributions welcome at https://github.com/Vihaar/game.

Browser verification: isolated muted Chromium played a natural animated first battle (actors advanced and HP changed), then completed all five rounds with a 5–0 victory; replay cleared patches and round progress. A seed-3 campaign lost after three rounds, replay reset, and reduced motion resolved immediately without playing. Final mobile390×844 has no horizontal overflow, all three patch buttons fit, all portraits loaded, and no browser errors remained after the frame-timestamp regression was fixed. screenshots/preview.png shows genuine in-flight combat; mobile.png records the narrow draft layout.
