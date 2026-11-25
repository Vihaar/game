# The Fold — an inked, painted library

## The world

A cursed library is consuming reality. Rooms, people and spells are being rebuilt from its pages. Everything shares the feel of an original hand-painted fantasy illustration: warm pigment, deliberately uneven ink contours, expressive silhouettes and visible paper underneath. Spatial paper layers and bookbinding thread remain physical; sharp fold facets must not dominate the illustration. The danger comes from a beautiful handmade world tearing itself apart.

## Signature

**The library is a hand-drawn illustration you can enter.** Shelves, arches, books, enemies and spells share painted shading, irregular ink lines and separate physical layers. Use broad color masses, darker painted undersides and selective highlights. Contours describe a form; avoid outlining every triangle or adding a noisy full-screen sketch filter. Hearthstone informs the warmth and expressive painted fantasy, with original characters and compositions.

## Mandatory construction rule: everything is layered

**Build everything from separate layers assembled with code. Never use a single finished image as the world, a room, the grimoire, a spell, or an interface.** This is a user requirement, not an optional visual treatment.

- Build the book from separate covers, page stacks, individual leaves, binding, tabs, inscriptions, glyph pieces, resource icons and controls. Their depth, overlap, shadows and movement belong in code.
- Build environments from separate architecture, shelves, books, foliage, creatures, props, materials and lighting. The camera must move through actual spatial layers.
- Build spells from separate glyph strokes, cut-paper shapes, projectiles, trails, particles and impacts. Animate those parts independently in code.
- AI images may supply individual isolated assets or material textures. Keep those assets separate and composite them with SVG, CSS, canvas or Three.js. An AI-generated picture of the complete composition is a reference only, never the playable implementation.
- Preserve useful silhouettes, paper thickness, occlusion and restrained shadows at each layer. Layers must create readable physical structure, rather than adding decorative clutter.
- New designs and reviews must identify their component layers. Reject a flattened replacement even if its standalone image looks attractive.

## Palette and type

| Material     | Color     | Use                                 |
| ------------ | --------- | ----------------------------------- |
| Warm paper   | `#F1E6D2` | Cards, page surfaces, enemy labels  |
| Cut edge     | `#CBB797` | Fibers, folded seams, quiet borders |
| Book ink     | `#22334B` | Text, deep room shapes, outlines    |
| Ember paper  | `#E7774F` | Fire, attack windups, health danger |
| Moss paper   | `#6C9284` | Dew, rare healing, archive gardens  |
| Violet paper | `#8577A5` | Wind, corruption, impossible rooms  |

Keep colors as dyed paper, with slight fiber variation. Almendra is the calligraphic chapter/display face; DM Sans is for readable controls and cards; system monospace is for numbers, timing and small ink-stamped labels. Existing font fallbacks must work without a network.

## Card illustrations

- Square miniature dioramas photographed from a consistent elevated three-quarter angle.
- One immediately readable spell sculpture per image, centered with breathing room.
- Two to six overlapping cardstock layers, scored folds, visible paper edges, small cut imperfections, and soft directional tabletop shadows.
- A neutral paper ground; colored materials carry the element identity. No card border or lettering inside the bitmap.
- Fire is folded coral/orange paper, water is layered pale teal paper, stone is folded gray-blue cardstock, wind is curled strips of violet paper. Light and smoke are paper shapes too.
- Fused spells combine material and silhouette cues from both ingredients. They remain handmade, never become polished metal or glowing plastic.
- Avoid photoreal people, glossy 3D toys, neon bloom, chrome, generic swirls and branded characters. The current direction welcomes hand-painted fantasy shading and hand-drawn ink over separate paper layers.

## World, enemies and interface

Rooms are painted book dioramas: curved architecture, layered floors, oversized page silhouettes, stitched bindings and torn doorways. Assemble separate shelves, canopy pieces, painted material surfaces, ink contours and foreground objects in real space. Neither a complete scene picture nor a full-screen filter is a substitute for drawing these forms. The guided camera follows a fixed route between encounters and stays stable while the player chooses spells.

Enemies are original layered drawings, built from independently coded cloak/body, hood/face, eyes, arms, held book/quill/shield, painted shade, highlights and ink details. No complete enemy sprite replaces these components. Hands and props may react gently to hits or actions; respect reduced motion. Enemy health and exact next move stay legible above the body, using the existing labels. Danger cannot rely only on color. Menus use quiet stacked-paper edges and readable dark ink. The scene remains visible while combining. Battles wait for deliberate player actions.

Motion should read as a fold, flutter, snap or tear. Respect reduced motion; never shake or flash just to fill space. Runtime rendering stays inexpensive: capped resolution, no default dynamic shadows or postprocessing, a few layered artwork planes and illustrated paper creatures. Avoid constant camera sway or zoom while reading.

## Chosen direction: warm handmade storybook

On 2026-11-24 the user selected the first preview, **warm handmade storybook**, then specified that it should darken as knowledge reveals its curse. Ivory paper, honey light, moss foliage and dusty coral define the entrance. Later chapters introduce deep teal, long book-ink shadows, plum, moonlit ivory and red binding thread. Preserve the physical handmade material throughout; darkness changes the mood, not the medium. `public/art/SCENES.md` retains the original three concepts as provenance; the other two are archived studies.

The playable world uses real three-dimensional rooms, shelves, arches, stairs and separate illustrated props. Perspective changes along short fixed camera rails when entering rooms or approaching a book or forge; battles remain still. The player explores by choosing visible objects, with mouse, touch and keyboard equivalents. Avoid recreating frantic free movement. The three playable floors each have an identifiable mood and room composition.

The signature is the path through an oversized open book: the learner moves from a blank page toward a library of connected ideas. Keep the center inviting and preserve the rich art around it. Interactive objects belong in the room; quiet paper labels make them discoverable. Reading and forging are optional before a battle and provide no hidden healing or combat bonuses.

## Generation prompt to reuse

Original isolated fantasy illustration layer, [ONE SUBJECT OR MATERIAL]. Hand-painted pigment on warm textured paper, expressive curved silhouette, slightly irregular dark ink contour, broad soft shading and selective warm highlights. Warm ivory, book-ink blue, restrained coral, moss teal and muted violet. Transparent surrounding space where appropriate. No lettering, interface, complete room, complete book composition, chrome, plastic, neon glow, real people or branded characters. Composite this isolated layer with the other parts in code.

The starter atlas is generated with the built-in image tool. Its exact sheet prompt and asset provenance live in `public/art/README.md`. Optional runtime AI must use this same direction; combat stats never come from an art model.

## Grimoire inscriptions

The combat book uses original code-drawn SVG glyphs instead of raster medallions or emoji badges. Eight segmented forms share a 96-unit grid, rounded 3.2-unit strokes and generous open space. Each spell has separate cut-paper backing, raised edge, colored face, engraved strokes and animated light strokes. The book itself is coded as a separate cover, page stacks, individual leaves, folded corners and binding stitches; the archived full-book image is not used. Dark moss ink (`#344B49`) and muted writing (`#71644F`) sit on those paper layers. Almendra carries spell names; DM Sans carries resource values, effects and shortcuts. All numeric fields use tabular lining figures. Resources share one row; every prepared spell reserves equal rows for its glyph, two-line name, effect and cost. Resource and action icons are original SVG illustrations.

The signature is an inscription lighting segment by segment once when cast, coordinated with the existing world spell effect. Each family keeps its own silhouette. Forged spells retain the ingredient-derived family and gain bounded, deterministic peripheral marks. Discovered names cannot change glyph identity. Nothing Phone's segmented light language is an inspiration, with original shapes; no branding or hardware layouts are copied. Reduced motion uses a brief static illumination. There are no continuous idle pulses.

## Revised book composition and typography

Use the Ravenswatch book-menu composition closely: bookmark navigation above two individual leaves, a compact selection grid on the left, and one generous illustrated entry with its name, exact effects and cast action on the right. Reference: https://jonsilvestre.artstation.com/projects/3EEa5D. Keep the illustrated world visible above the book. The left page holds a compact resource row and five prepared spells. Attack and defense come from spells; there are no separate Strike/Guard controls. Desktop uses a three-column spell grid; narrow screens retain two real pages with a two-column selection grid. Selection previews a spell without spending ink; the explicit Cast control commits it. Keyboard 1-5 remains direct cast.

Almendra, a locally bundled calligraphic manuscript font by Ana Sanfelippo, replaces the ordinary display face for wizard headings, spell names, world labels and short passages. DM Sans remains the utility face for exact values, costs and effects, with tabular figures. World prompts use warm ivory `#FFF0C9` against a dark ink edge `#23343B`; manuscript text uses `#2D383A` against parchment. Avoid transparent-gradient text over detailed art. Never sacrifice legibility for calligraphy.

Spell illustrations are assembled from separate original SVG silhouette, backing, fold, crease and animated edge layers. Fire reads as layered flame, water as a folded drop, stone as faceted rock, wind as curling paper strips. Keep consistent scale and construction across derived elemental families. The large preview adds separately coded diagram rings and frame corners. All cover, leaf, binding, ribbon, picture and control layers remain independent; no complete book image is used.

## Three-floor atmosphere and Focus

The current playable slice compresses the descent in mood into three floors. Floor1 is honey-lit, inhabited-looking and intact. Floor2 is colder, with extinguished lamps, missing shelf sections and dust. Floor3 is the Mirror Archive: dark teal and violet, abandoned, torn and threatening. Preserve enough ambient light to read the path and interact with books; HTML lettering retains its ivory/dark-ink contrast.

The casting resource is named Focus. Use the original four-point crystal/star SVG and a visible Focus label, with exact values and spell costs. Do not use the water/ink drop for this resource, since it collides with the Dew spell's visual identity. Focus refills on End turn. Combination previews separate what the player gains from the full price; source imprints visibly remain reusable and a new result can itself become an ingredient.

## Simpler pages and hand-drawn spell art

The current player preference is a hand-drawn/painted fantasy feel inspired by Hearthstone's illustration, retaining this game's paper library. Spell silhouettes, colored pigment shading, imperfect ink edges and animated outlines are separate original SVG layers. Procedural grain supplies brush variation; no finished card picture replaces code layers. Keep the battle book to Spells and Combine tabs. The global journal remains outside the book. Combining is simply pick two spells, see one clear benefit, then Combine. Every new combination costs exactly 2 HP. Show this single price; do not add a price selector. Prefer plain words such as spell, original, Focus and Combine to repeated inscription/imprint terminology.

## Shared world and enemy treatment

Use the same six material colors above, with honey light on floor one, desaturated moss and plum on floor two, and cold teal/violet on floor three. Painted shade and ink remain part of each object, so camera travel exposes genuine depth. Preserve original asset details where useful; add code-composed pigment and contour layers locally rather than flattening or replacing the room. Reuse Three.js ShapeGeometry, curved paths, vertex colors and material hooks already supported by the pinned engine. References: https://threejs.org/docs/pages/ShapeGeometry.html and https://threejs.org/docs/pages/CubicBezierCurve.html. No extra renderer or postprocessing pipeline is needed.

The book stays deliberately simple: two tabs, five prepared spells, one selected illustration, one effect description, one cast action. Play one nameless apprentice without a character picker. Route choices appear only between encounters; relic descriptions belong in the existing Journal. This world-art pass must not add a menu, tooltip layer, resource, ornament frame or decorative text.
