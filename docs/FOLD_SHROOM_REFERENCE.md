# Fold: Shroom and Gloom experience reference

Public primary-source analysis, checked2026-11-24. This is an adaptation brief, not extracted game code or assets. No executable, proprietary source, model, texture, or trailer was downloaded. Four publisher-supplied screenshots were inspected directly in memory through the Steam screenshot URLs. No video was watched or dependencies installed.

## What the developers actually describe

Shroom and Gloom is presented as a first-person roguelike with separate combat and exploration decks. Combat handles enemies; exploration changes traversal, cards, weapons and abilities. Hand-drawn art/animation exists inside3D spaces. Those are useful experience references, not a requirement to reproduce its card names, mushroom theme or eating mechanics. [Team Lazerbeam's official game page](https://teamlazerbeam.itch.io/shroom-and-gloom), [current Steam page](https://store.steampowered.com/app/3271280/Shroom_and_Gloom/)

The art-test devlog is especially relevant: the developers retained2D black-and-white illustrations placed in3D space, experimented with lighting and secondary colors, animated environmental details, and branching routes beyond the original single path. A3D scene can legitimately contain flat illustrated pieces. What matters for Fold is that the player actually moves among spatial layers, rather than seeing one full-room picture with a small camera zoom. [Official art-test devlog](https://teamlazerbeam.itch.io/shroom-and-gloom-jam/devlog/745144/announcement-things-are-happening-with-shroom-and-gloom)

The prototype devlog describes a separate environment-only art test, then a rebuilt Unity prototype, cohesive but distinct enemy designs, and repeated work on tunnels, branching rewards, exploration and feel. The lesson to adapt is one polished traversable sequence that integrates choices and encounters, before expanding many superficially different rooms. [Official prototype development account](https://teamlazerbeam.itch.io/shroom-and-gloom/devlog/798570/we-did-it-shroom-and-gloom-prototype-is-here)

## What the inspected official screenshots show

The following are visual observations of still images, not claims about exact runtime implementation:

| Official screenshot | Observed composition | Fold adaptation |
|---|---|---|
| [Locked-door exploration](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3271280/d35c20da471d04844aa8562b0008e919426c95aa/ss_d35c20da471d04844aa8562b0008e919426c95aa.1920x1080.jpg) | Close left/right architectural edges, a receding stepped floor and a door centered deeper into the room. Bright lock marks the actionable destination; tools occupy the lower foreground. | Make a book arch sit beyond multiple shelf bays, reachable along a real floor. Highlight its binding seal, with grimoire actions below the sightline. |
| [Exploration room and target line](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3271280/2f7d76d520d6e66f65f8ba0a753a5fa232e6b7d3/ss_2f7d76d520d6e66f65f8ba0a753a5fa232e6b7d3.1920x1080.jpg) | Several interactable objects sit at different depths; one tool projects a dashed aiming line to a marked object. Small badges annotate risks while the room remains visible. | Raycast reading lecterns, forges and seals; mark one selected target clearly. Label cost/consequence before confirmation rather than covering the entire room with menus. |
| [Combat encounter](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3271280/6ba8fd698afe137874df2ccc6e3c898164d7fa53/ss_6ba8fd698afe137874df2ccc6e3c898164d7fa53.1920x1080.jpg) | A stable frontal enemy lineup sits within an illustrated corridor. Enemies have distinct silhouettes, floating intent badges, HP/status strips and a lower foreground hand. World architecture frames the fight. | Settle the guided camera at a battle anchor. Keep enemy targets/intent readable and camera stationary while choosing runes. Retain Fold's open grimoire, strike/guard and rune fusion. |
| [Reward choice in scene](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3271280/225be3328c011baa4de48f40e601b2b08196d30e/ss_225be3328c011baa4de48f40e601b2b08196d30e.1920x1080.jpg) | Three choices appear in front of the still-visible room, with a clear decline control. Warm localized light changes the mood. | Present newly learned inscriptions at a physical book/plinth, keep the next passage visible, and provide an explicit continue/decline path when appropriate. |

The screenshots do not establish exact movement speed, FOV, easing curves, collision representation, turn timings or input behavior. Suggested values below are original implementation proposals and require actual playtesting.

## Concrete Fold sequence

Preserve previous decisions: original handmade ivory/moss/coral/ink-navy papercraft, library setting, grimoire runes, rune fusion, increasingly cursed knowledge, and full run permadeath. Bruno remains a smoothness reference only. Do not replace the art direction with fungal pen drawings or copy the other game's card UI.

1. **Threshold:** start at eye height inside a book door; near page edges and shelf corners flank the view. The floor continues into three visible bays, so depth is immediately evident.
2. **Approach:** a guided route moves forward through those bays. Independent floor seams, arch ribs, book spines and paper foliage pass at different speeds. Two turns reveal architecture previously occluded by shelves.
3. **Explore stop:** camera settles beside a reading lectern, forge or sealed arch. Objects are real meshes or separate illustrated surfaces positioned in3D; click/focus uses their world coordinates. Optional reading never blocks advancement.
4. **Commit:** the player confirms an action with its visible ink/HP/curse cost. The corresponding book, thread or seal reacts locally. Keep one authoritative rule state; world animations are its presentation.
5. **Battle stop:** camera reaches a fixed encounter anchor before enemies become actionable. Turn-based choices are calm; brief attack/recoil feedback returns exactly to that anchor.
6. **Knowledge reward:** the inscription reveals a truth while environment material/light changes suggest the price. The player remains inside the room, and the next arch is spatially beyond the encounter.
7. **Transition:** move through the arch into another library section rather than swapping a full-screen image. Later sections introduce longer navy shadows, missing shelf islands, red binding threads and the final forbidden book.
8. **Death:** close the current run, cancel pending camera/actions, show the final knowledge/curse outcome, and restart at the first threshold with the run's inventory/progress gone.

## Scene and camera implementation brief

These are recommendations for the existing Three.js project, not a demand for a new engine.

- Reuse existing floor, shelves, arches, player/controller and guided camera code. Define routes and interaction stops in room data. Reuse the verifiedCC0 models only where useful; original authored geometry is also genuine3D.
- Give each route an eye-height camera path, look target and valid floor corridor. Bound yaw/pitch and offer reduced-motion traversal. Initial tuning could use a moderate50–60° FOV and short smooth turn transitions, then adjust on actual desktop/mobile footage. These values are proposals, not reverse-engineered settings.
- Preserve real spatial occlusion. A shelf should hide the next bay until the camera rounds it; an arch should have visible thickness; floor seams should converge with perspective. Paper illustrations can embellish individual geometry surfaces, but cannot stand in for the whole room.
- Keep camera motion finite: approach → stop → interact/fight → departure. Do not orbit continuously while reading, choosing, forging or targeting.
- Make responsive turns visible from the first frame, with bounded easing rather than waiting for every decorative load. Preload the next bay and maintain a usable floor/lighting fallback on load failure.
- Keep the open grimoire low enough that the path and enemy silhouettes remain visible. Target labels should follow world anchors, avoid overlaps, and hide behind an open blocking panel. Touch targets must stay reachable at narrow viewports.
- Retain the turn-based combat model. Shroom and Gloom's double-deck idea can inspire two grimoire pages—journey tools and combat runes—without adding a second economy or copying its mechanics this iteration.

## Acceptance evidence for the next build

A screenshot alone is insufficient for the user's requested walkthrough. Verify a real-input sequence that advances through at least three separated architectural bays and one turn, stops to read/forge, begins a battle, casts/guards/ends a turn, earns a reward, passes through the next arch, dies/restarts, and returns to the initial world.

Record camera positions and route progress before/during/after movement; confirm parallax and occlusion against actual3D geometry. Confirm no pending promises or stale room mutations survive restart/dispose. Check desktop and portrait viewports, keyboard/pointer/touch paths, capped timestep behavior, and readable grimoire controls. Use muted owned headless browsers for automation.

## Research limits

Steam is current public presentation; the developer's itch devlogs describe older prototypes and should not be treated as current source-code documentation. Publisher site returned403 during this pass; the Steam listing and Team Lazerbeam's own game/devlog pages provided sufficient primary evidence. No proprietary internals were inspected or inferred as fact, and no copyrighted reference asset was added to Fold.

