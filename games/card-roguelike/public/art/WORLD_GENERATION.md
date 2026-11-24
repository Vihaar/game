# Fold world atlas generation

## Cursed B variant

User explicitly requested warmth turning to darkness as knowledge becomes a curse. Generated a separate `world-atlas-b-cursed.webp` without overwriting original B. Same dimensions1672×941 and same quadrant order; TL coral press with ink shadows, TR navy/plum suspended archive, BL cold ivory forbidden binding threaded in red, BR warm exterior. Built-in result inspected; quality88 WebP via ffmpeg only. Original PNG preserved at `C:/Users/Owner/.codex/generated_images/01a20f21-5087-71e0-9f8e-2209d9ebb154/exec-e0bfbbfd-4bcb-449e-9146-939d1970a49a.png`.

### Exact cursed variant prompt

```text
Use case: stylized-concept.
Asset type: in-game environment atlas, NOT a UI mockup.
Input image 1 is STYLE AND MATERIAL REFERENCE ONLY. Keep its exquisite handcrafted layered cut-paper diorama, fine-fiber ivory cardstock, intricate papercut library architecture, folded plants/books, tangible layered paper shadows. But the library becomes progressively darker as knowledge becomes a CURSE; later rooms must not feel like a happy golden finale.
Generate ONE high-detail wide 16:9 image as an EXACT STRAIGHT TWO-BY-TWO CONTACT SHEET: four equal rectangular quadrants, each individually a complete 16:9 LANDSCAPE environment. Quadrants touch exactly at center lines. NO gutters, NO borders, NO frames, NO dividers, NO labels. No objects cross quadrant boundaries. Four different explorable library environments. Human-eye-height viewpoint, strong depth, generous open central floor or bridge for gameplay, elaborate foreground/midground paper architecture left/right.
TOP LEFT — REDACTION PRESS: grand coral and ivory library printing press on the left, paper rollers and curled ribbons, suspended sheets with abstract cutout patterns; warm coral lamplight still remains but long ominous INK-BLUE shadows spread across the empty parchment center floor. Knowledge is beginning to stain the room. Muted teal details, no readable text, open central path.
TOP RIGHT — SHATTERED ARCHIVE: fragments of bound books become suspended library islands over a deep NAVY AND PLUM/VIOLET paper abyss. Folded geometric ivory bridges connect them. A central bridge remains walkable; paper edges catch thin moonlight, occasional small coral lamps. A dark uncanny vast chamber, layered navy cardstock ceiling and void, not a bright sunny sky. Beautiful crafted paper, oppressive secret knowledge.
BOTTOM LEFT — LAST BINDING: the forbidden source of all knowledge. An immense OPEN BOOK stands at the distant end of a central aisle, its pages forming a cold ivory papercut portal and branching book-tree. Surrounding chamber is almost black NAVY layered paper with deep plum shadows; cool moonlit ivory highlights carve the shapes. CORAL-RED THREAD binds and snakes through the book and branches like a curse, a restrained eerie red glow leaks through the binding. Sinister, beautiful, silent, dangerous knowledge. No warm golden sunrise or cheerful ending. Center foreground remains empty walkable dark parchment floor, sides hold shadowy book shelves.
BOTTOM RIGHT — WARM LIBRARY EXTERIOR: a welcoming huge upright ivory book forms the library building and intricately carved OPEN DOOR; dark ink-blue book spine, moss/coral folded plants, golden lamplight inside, warm daylight and softly blue sky outside. A generous central paper path leads into inviting door. Exterior stays warm as contrast with the cursed interiors.
Constraints: original papercraft quality and palette family, progressively dark curse among first three rooms, fourth is warm exterior; distinct scenes, no people, characters, creatures, faces, text, typography, logos, UI, watermark, labels, thick panel lines. No real-world glass, plastic, digital UI. No gore. Overall16:9 means each quadrant also16:9.
```

Generated 2026-11-24 with the built-in OpenAI image_gen tool, not an external API or CLI. These are generated in-game environment images, not imported UI mockups. Style reference: root `games/card-roguelike/public/art/storybook.webp`, inspected before generation. No third-party imagery added. The originals remain in Codex's generated_images directory.

## Deliverables

Root shared destination: `game/games/card-roguelike/public/art/`.

| File | Dimensions | TL | TR | BL | BR |
|---|---|---|---|---|---|
| world-atlas-a.webp | 1672×941 | Mycelium Stacks | Flooded Index | Glasshouse Errata | Astral Reading Room |
| world-atlas-b.webp | 1672×941 | Redaction Press | Shattered Archive | Last Binding | Library entrance exterior |

Straight 2×2 equal-quadrant layout; panels touch at image midpoint without borders, gutters, labels, or people. The image tool returned 1672×941 (approximately16:9); midpoint UV crops are intended, no resampling or physical crops were performed. Four panels each approximately836×470.5 pixels. Both results inspected inline for composition, reference style, distinct environments and clean contact-sheet layout.

Optimization only: ffmpeg `-c:v libwebp -quality 88 -compression_level 6`. No image-editing Python or other edits. Original PNGs preserved:

- A: `C:/Users/Owner/.codex/generated_images/01a20f21-5087-71e0-9f8e-2209d9ebb154/exec-9a57f458-7c8e-4c1a-9985-8f9d6a355e65.png`
- B: `C:/Users/Owner/.codex/generated_images/01a20f21-5087-71e0-9f8e-2209d9ebb154/exec-5abefa1f-c6aa-4076-bbb9-44b52cb5ebe7.png`

The original intake scene plus A's four rooms and B's first three rooms provide eight distinct worlds; B's fourth scene is an additional exterior option. Later user steering made knowledge a curse and requested darker late worlds. B had already completed before that update, so its requested original warm finale was preserved rather than regenerated. Parent informed; curse lighting/alternate art can be layered separately.

## Exact prompt A

```text
Use case: stylized-concept.
Asset type: in-game environment atlas, NOT a UI mockup.
Input image 1 is STYLE REFERENCE ONLY. Match its exquisite handmade layered cut-paper diorama, ivory textured cardstock architecture, warm golden sunlight, muted moss/coral/teal and ink-blue book covers, fine fiber texture and softly lit physical papercraft shadows. Invent distinct new room layouts.
Generate ONE high-detail wide 16:9 image as an EXACT STRAIGHT TWO-BY-TWO CONTACT SHEET: four equal rectangular quadrants, each individually a complete 16:9 LANDSCAPE environment. Quadrants touch at exact center lines. NO gutters, NO borders, NO frames, NO dividers, NO labels. No objects cross quadrant boundaries. These are four different explorable library rooms. Each room has same human-eye-height viewpoint, strong depth, a generous open central floor/path for gameplay, and elaborate foreground/midground paper architecture on left/right. Warm welcoming magical storybook atmosphere.
TOP LEFT — MYCELIUM STACKS: moss and ivory root-woven book trees, shelves growing into trunks, clusters of softly luminous folded-paper fungi, delicate mycelium threads, sunlit parchment clearing.
TOP RIGHT — FLOODED INDEX: muted teal folded ribbon water canals, ivory paper footbridges, floating closed books and cardstock index drawers, warm golden reflections; broad central bridge/path stays readable and open.
BOTTOM LEFT — GLASSHOUSE ERRATA: translucent vellum greenhouse cathedral with ribbed ivory framing, folded transforming plants and coral paper blooms, botanical books tucked into planters, golden light through glasslike paper; open center walkway.
BOTTOM RIGHT — ASTRAL READING ROOM: spacious warm ivory library with ink-blue domed paper cosmos ceiling, suspended folded stars, delicate brass-gold paper orrery, side reading alcoves and book shelves, central open circular floor. Stars are handmade paper cutouts, mood remains warm not cold.
Constraints: all four scenes distinct, coherent reference material/style; no people, characters, creatures, text, typography, logos, UI, watermark, labels, thick panel lines. No photoreal real-world glass or shiny plastic. No dark horror. No central object blocking the open walkable floor. Overall 16:9 so each equal quadrant also16:9.
```

## Exact prompt B

```text
Use case: stylized-concept.
Asset type: in-game environment atlas, NOT a UI mockup.
Input image 1 is STYLE REFERENCE ONLY. Match its exquisite handmade layered cut-paper diorama, ivory textured cardstock architecture, warm golden sunlight, muted moss/coral/teal and ink-blue book covers, fine fiber texture and softly lit physical papercraft shadows. Invent distinct new room layouts.
Generate ONE high-detail wide 16:9 image as an EXACT STRAIGHT TWO-BY-TWO CONTACT SHEET: four equal rectangular quadrants, each individually a complete 16:9 LANDSCAPE environment. Quadrants touch at exact center lines. NO gutters, NO borders, NO frames, NO dividers, NO labels. No objects cross quadrant boundaries. Four different explorable library environments. Each has same human-eye-height viewpoint, strong depth, generous open central walkable floor/path for gameplay, elaborate foreground/midground paper architecture on left/right. Warm magical storybook atmosphere.
TOP LEFT — REDACTION PRESS: a grand library printing room; an intricate coral and ivory handmade book printing press occupies LEFT side, long curled paper ribbons and hanging sheets, carved paper gears, muted teal ink vessels, right-side bound books and rollers. Central ivory floor and distant archway remain open. Rich coral accents, warmly sunlit.
TOP RIGHT — SHATTERED ARCHIVE: a spacious fantastical library of fragmented bound-book islands and ivory geometric folded-paper bridges suspended over a softly lit parchment void; broken shelf fragments float like mobile sculptures, intact open central bridge leads to a golden-lit distant book arch. Still warm, inviting and handcrafted, no horror, no dark abyss.
BOTTOM LEFT — LAST BINDING: a magnificent immense open book has become a branching ivory book-tree in the DISTANCE at the far end of a grand open floor. Its open pages form a luminous warm golden gateway, paper roots and branches hold all knowledge, shelves of teal/ink-blue/coral books at both sides, tiny vellum leaves suspended overhead. Majestic final library chamber, radiant sunlit hopeful opening, foreground path remains spacious and clear.
BOTTOM RIGHT — LIBRARY ENTRANCE EXTERIOR: outside the welcoming magical library, a huge upright ivory book itself forms the building and carved open door, tall layered pages become archway and branching shelves, moss/coral folded plants flank the approach, golden lamplight inside, warm soft daylight outside, ink-blue book spine details. Open central paper walkway leads through inviting door. Clearly exterior, distinct from interior rooms.
Constraints: all four scenes distinct, coherent reference material/style; no people, characters, creatures, text, typography, logos, UI, watermark, labels, thick panel lines. No shiny plastic. No dark horror. No foreground central obstruction. Overall 16:9 so each equal quadrant also16:9.
```

