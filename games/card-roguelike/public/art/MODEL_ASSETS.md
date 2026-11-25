# AI-generated surface assets for the 3D library

Generated on 2026-11-24 using the built-in `image_gen.imagegen` tool: four separate native calls, one per asset. No API key, external model CLI, or third-party artwork was used. The warm storybook image was inspected as the existing art direction; these are newly generated **surface textures for actual meshes**, not room backdrops.

The original PNGs are preserved outside the published folder under `../../art-source/3d/`; runtime WebPs are under `3d/`. The generated source files also remain in the Codex generated-images directory. Every source was inspected with `view_image` before handoff. Conversion used FFmpeg `-c:v libwebp -q:v 90 -compression_level 6`; no image retouching, cropping, or atlas rearrangement was applied.

| Asset | Dimensions | Runtime WebP | Purpose |
| --- | --- | --- | --- |
| A | 1254 × 1254 | [paper-fiber.webp](3d/paper-fiber.webp) | Matte ivory paper albedo; requested as a repeatable fine-fiber material |
| B | 1254 × 1254 | [book-covers.webp](3d/book-covers.webp) | Four complete front-on decorative cover surfaces |
| C | 1254 × 1254 | [carved-panels.webp](3d/carved-panels.webp) | Four ivory architectural papercut relief surfaces |
| D | 1086 × 1448 | [rune-book.webp](3d/rune-book.webp) | Portrait grimoire cover surface, crescent/star/coral thread/moss foliage |

The originals have matching `.png` names. All four assets are opaque and should be loaded as sRGB color textures. Their fine relief is pictured artwork; thickness, silhouettes, stairs, shelves, books and room geometry must come from meshes and real lighting.

## Atlas regions

Coordinates are `[x, y, width, height]` in source pixels, with origin at top left. Use a small inset to avoid adjacent-cell filtering.

**B is not an exact half-height grid.** The generated color boundary is at **y = 578**, measured from the original RGB scan; the vertical boundary is x = 627. Do not assume four equal UV quadrants.

| B cover | Raw region | Suggested 3px-inset region |
| --- | --- | --- |
| Navy botanical | [0, 0, 627, 578] | [3, 3, 621, 572] |
| Moss cosmos | [627, 0, 627, 578] | [630, 3, 621, 572] |
| Coral runes | [0, 578, 627, 676] | [3, 581, 621, 670] |
| Honey knowledge | [627, 578, 627, 676] | [630, 581, 621, 670] |

**C uses equal quadrants**, split at x = 627 and y = 627.

| C panel | Suggested 3px-inset region |
| --- | --- |
| Branching vines | [3, 3, 621, 621] |
| Stars and crescent | [630, 3, 621, 621] |
| Fan leaves | [3, 630, 621, 621] |
| Interlocking folds | [630, 630, 621, 621] |

For a Three.js texture region `[x,y,w,h]`, use `repeat = [w / 1254, h / 1254]` and `offset = [x / 1254, 1 - (y + h) / 1254]`. Clone per-region textures before setting UV transforms so shared originals are unchanged.

A was prompted for seamless tiling and has uniform illumination without objects; exact opposite-edge pixel identity is not guaranteed by generation. Inspect repetition at the final mesh scale. B/C contain minimal intrinsic paper-relief shading rather than room lighting. D maps to a 3:4 portrait cover.

## Exact prompts

### A — paper-fiber

```text
Use case: stylized-concept. Asset type: seamless square albedo texture for actual 3D papercraft game meshes. Create a flat, full-frame, natural warm-ivory handmade cardstock surface, with fine tiny paper fibers and subtle organic grain, matte and tactile. The surface is uniform at all four edges and designed to tile seamlessly in both directions. Straight-on orthographic macro material scan, perfectly flat neutral illumination. Palette: warm ivory and very pale oatmeal, gentle low contrast suitable for floors and walls. No scene, objects, paper sheet edge, border, frame, folds, cracks, stains, lettering, symbols, gradients, vignette, directional light, cast shadows, or baked object shadows. The whole square is the material; it is not a room image or presentation mockup.
```

### B — book-covers

```text
Use case: stylized-concept. Asset type: a 2 by 2 texture atlas of four book-cover artworks to map onto actual rectangular 3D book-cover meshes in a warm storybook papercraft game. Straight-on orthographic flat surface scan. EXACTLY four equal square cells, arranged in a precise full-frame 2x2 grid, no gutters or separators. Each cell is a complete decorative cover surface filling its cell edge to edge, without a surrounding book object. Top-left: muted navy paper with layered ivory papercut botanical branches and leaves. Top-right: moss-green paper with layered ivory crescent moons, small stars and orbital cosmos motifs. Bottom-left: muted coral paper with layered ivory invented abstract rune-like geometric symbols, no letters or words. Bottom-right: honey-ochre paper with layered ivory interlocking folds and abstract knowledge motifs. Fine visible natural cardstock fibers, delicate die-cut ornament and creases, tactile matte paper, restrained craftsmanship consistent across all four covers. Flat neutral illumination; only very subtle intrinsic paper-relief shading. No cast shadows or lighting gradients. No letters, words, title, logo, UI, mockup, environment, perspective, book thickness, page edges, spine, stack, or gaps between cells. This is albedo artwork for surfaces, not an image of books in a scene.
```

### C — carved-panels

```text
Use case: stylized-concept. Asset type: 2x2 albedo atlas of four flat decorative paper architectural relief panels for mapping to actual 3D library meshes. EXACT layout: one square canvas divided at its exact horizontal and vertical midpoint into FOUR EQUAL square cells, edge-to-edge with no gutters. Each cell is an independent full front-on square paper-cut ornament surface, filling the square without a surrounding frame or object. Upper left: intricate branching vines with delicate leaves. Upper right: crescent stars and interlocking constellations. Lower left: layered fan leaves with folded ridges. Lower right: interlocking geometric paper folds and woven arches. Same warm ivory cut cardstock relief on a slightly darker oatmeal paper base in all four cells. Fine paper fibers, precise layered cut edges, elegant detailed craftsmanship matching a warm handmade storybook library. Orthographic front-on material scan, perfectly neutral even illumination, tiny intrinsic relief shading only. No environment, room, wall in perspective, floor, furniture, border, frame, UI, text, letters, numbers, logos, margins, divider lines, exterior shadows, vignette, or gradient. This is a surface texture atlas for meshes, not a picture of a room.
```

### D — rune-book

```text
Use case: stylized-concept. Asset type: one flat front-cover albedo artwork to map onto a real rectangular 3D grimoire cover mesh in a warm handmade storybook papercraft game. Show ONLY the antique cover surface in a perfectly straight-on orthographic view, filling the image edge-to-edge: warm ivory fibrous cardstock with intricate layered ivory paper cuts, a central crescent moon and small star, delicate moss-green botanical accents and one coral thread woven through the ornament. Elegant restrained handmade texture, visible fine fibers and subtle paper creases. Rectangular portrait cover composition, no surrounding background, all four surface edges aligned to the image edges. Flat neutral even illumination with minimal intrinsic relief detail only. No cast shadow, vignette, room, scene, desk, hands, whole book, book thickness, page edges, spine, open pages, metal clasp, letters, words, title, numbers, logo, UI, frame outside the cover, or presentation mockup. This is decorative texture artwork for a mesh, not a picture of a book object.
```


## File integrity

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| book-covers.png | 3796159 | 1fa09d77016b79c6958d8488aa5fdecc798b155e2fe90cbf3c402d32999a57d2 |
| book-covers.webp | 630182 | ab857417a75bad6fc7b3781c91eac547e0cba4c1ec8dd32222fadf512fff4f00 |
| carved-panels.png | 3407835 | eafd4dc77798f40b973316b576772fbccc43a870cf67c3448859d2170fe1aee4 |
| carved-panels.webp | 520576 | 89f291ea5aacb7569f85df09e44f7c2e49c41cb69b8dbbd83f0a00af16945963 |
| paper-fiber.png | 2815484 | ca928aeaec7f48662000cd6a6530d5c48d9bb77570162786c4e74d6c150fcbd6 |
| paper-fiber.webp | 321450 | d114b7890574853ced763b0431aba6134f141f7f95f59950899ab8185dc3bf04 |
| rune-book.png | 3351359 | 0309e077596eaa7af25256c06655ba6463419e96238b981e440f5e430161c883 |
| rune-book.webp | 504422 | eeb9ecd5725acda36fcce4ec1588b0be16eebed6ab50afc46494226ecece11a2 |
