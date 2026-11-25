# Trust Me Bro

A short maze game for one walker and an extremely confident navigator. Play solo with correct AI advice, or pass one device between two humans. Three increasingly large mazes take about 2–4 minutes. The navigator has the whole map; the walker sees a three-tile neighborhood. No online multiplayer is offered.

## Controls and rules

Arrow keys/WASD or the visible direction buttons move one tile. H asks the solo AI for advice or opens the local navigator handoff. Keyboard users can Tab/Enter on every button. On touch, movement/radio controls stay fixed below the walker view. A highlighted button shows the AI's recommended input; it never moves for you.

Reach the green door in each room before its 75-second timer expires. Walls are free BONKs. A trap adds one shared friendship mistake and sends you back to the entrance; that trap then disarms. Four mistakes ends the run. Mistakes persist between rooms, timers reset. Replay restarts the same seed immediately; New route changes the seed. Share ?seed=12345 for the same layout. R restarts after an ending. Hidden tabs pause the timer.

Room 1: normal compass. Room 2: full navigator map turns 180 degrees; its north label points to the bottom. Walker buttons stay normal. Room 3: inputs rotate clockwise (UP goes east, RIGHT south, DOWN west, LEFT north). Each twist is shown before entry and stays visible. Solo advice explicitly names the correct button and world direction.

Local mode is an honor-system private handoff: walker looks away, navigator reads the full map and chooses a world direction, then passes the device back behind a privacy curtain. The walker confirms readiness before controls return. Timer pauses during this handoff. This is same-device co-op, not remote multiplayer. To change mode/navigator, reload the page. Mike, Torin, Jonah and Grant supply different silly radio personalities without changing maze fairness.

## Development

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

No account, API, backend, sound, tracking or image download is needed. Vite's base is GAME_BASE or relative './'; publish dist/ under /games/trust-me-bro/. Reduced motion disables UI transitions and walking bob. Pure seeded generation/rules are separate from original canvas drawing and DOM controls. Matter.js performs real wall-body collision queries; the maze adapts an existing MIT recursive-backtracker rather than inventing new maze infrastructure.

Eight tests cover 60 seeded room generations, connected trap-free goals, real Matter collisions, AI completion of all twists, trap reset/disarming and fourth-error loss, timers, transitions, complete win/reset and limited-view data. See THIRD_PARTY.md and public/licenses/NOTICE.txt for pinned upstream source/licenses. Contributions welcome at https://github.com/Vihaar/game.

Browser QA: isolated muted Chromium completed all three rooms using visible AI advice and actual movement buttons (48steps, zero traps), then replay reset the run. A natural75-second timeout displayed the loss screen and replay reset timer/room/mistakes. Same-device map→direction→privacycurtain→walker was tested, including timer pause, blocked movement behind the curtain, and keyboard movement after readiness. Desktop gameplay screenshot: screenshots/preview.png. Mobile390×844 screenshot: screenshots/mobile.png; fixed touch controls leave the walker visible, with no horizontal overflow. No browser errors in the final pass. Online transport was not tested or exposed.
