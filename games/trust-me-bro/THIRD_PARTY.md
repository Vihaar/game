# Research and third-party notices

Primary source inspected before implementation: Kees Meijer's maze-generator, https://github.com/keesiemeijer/maze-generator/tree/29da89fd5b43c9e5c521de3ec76d5069d405d76c . The recursive-backtracking grid/carving approach is adapted in src/maze.js to seeded small rooms, BFS advice and safe trap placement. Original pinned maze.js and full MIT license (Copyright2017 Kees Meijer) are retained under upstream/. A production copy of the license is public/licenses/maze-generator.txt. The maze, traps and walker are separate code-rendered layers, not a flattened image.

Matter.js0.20.0 by Liam Brummitt/contributors (MIT) is actually used: Bodies.rectangle/circle and Query.collides validate moves against wall bodies. Primary reference: https://brm.io/matter-js/docs/classes/Query.html . Full MIT notice at public/licenses/matter-js.txt. No physics engine was written from scratch.

The existing project Vite6 static build convention is reused with GAME_BASE configurable relative hosting. Its installed build dependencies retain their licenses. The existing source transport room.js uses PeerJS1.5.5 (MIT; public/licenses/peerjs.txt) and remains available as a future experiment, but it is not imported into this game's UI/build, and remote multiplayer is neither offered nor claimed as tested. No network connection is created during normal play.

All UI, canvas character/map rendering, walkie-talkie styling, radio text, local privacy-handoff and game-rule additions are original MIT code. No AI-generated raster assets, proprietary artwork, remote fonts or friend photographs are needed. Original contribution license: LICENSE and public/licenses/trust-me-bro.txt.
