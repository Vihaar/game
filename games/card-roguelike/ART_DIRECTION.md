# The Fold — papercraft art direction

## The world

A cursed library is consuming reality. Rooms, people and spells are being rebuilt from its pages. Everything should look physically constructed from folded paper, cut cardstock and bookbinding thread. The danger comes from a beautiful handmade world tearing itself apart.

## Signature

**A spell is a tiny paper sculpture lifted from the page.** Show the folded construction, not a painting of the subject. Card art and enemies share the same sharp folds, layered cut edges and visible material thickness. Spells combine by visibly stacking and folding their ingredients.

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
- No engraved/painted fantasy illustrations, photoreal people, glossy 3D toys, neon bloom, chrome, generic AI swirls, branded characters or ornamental typography.

## World, enemies and interface

Rooms are illustrated book dioramas: intricate folded architecture, layered floors, oversized page silhouettes, stitched bindings and torn doorways. Use real generated environment artwork as the scene's centerpiece, with restrained foreground paper layers. The previous blocky procedural rooms are not the visual target. The guided camera follows a fixed route between encounters and stays stable while the player chooses cards.

Enemy health and next move sit on small legible paper scraps above their illustrated cutout bodies. Turn intentions state who will act and what they will do; danger cannot rely only on color. Cards and menus use quiet stacked-paper edges, a single dog-ear fold, and readable dark ink. The scene remains visible while forging. Battles wait for deliberate player actions rather than requiring walking, aim or dodge timing.

Motion should read as a fold, flutter, snap or tear. Respect reduced motion; never shake or flash just to fill space. Runtime rendering stays inexpensive: capped resolution, no default dynamic shadows or postprocessing, a few layered artwork planes and illustrated paper creatures. Avoid constant camera sway or zoom while reading.

## Chosen direction: warm handmade storybook

On 2026-11-24 the user selected the first preview, **warm handmade storybook**, then specified that it should darken as knowledge reveals its curse. Ivory paper, honey light, moss foliage and dusty coral define the entrance. Later chapters introduce deep teal, long book-ink shadows, plum, moonlit ivory and red binding thread. Preserve the physical handmade material throughout; darkness changes the mood, not the medium. `public/art/SCENES.md` retains the original three concepts as provenance; the other two are archived studies.

The playable world uses a guided 2.5D composition: chapter-specific illustrations behind physical paper architecture, a folded path and book props. Perspective changes along short fixed camera rails when entering rooms or approaching a book or forge; battles remain still. The player explores by choosing visible objects, with mouse, touch and keyboard equivalents. Avoid recreating frantic free movement. Each of the eight truths must have its own identifiable room.

The signature is the path through an oversized open book: the learner moves from a blank page toward a library of connected ideas. Keep the center inviting and preserve the rich art around it. Interactive objects belong in the room; quiet paper labels make them discoverable. Reading and forging are optional before a battle and provide no hidden healing or combat bonuses.

## Generation prompt to reuse

Original spell-card miniature, [SUBJECT AND TWO INGREDIENTS]. A physically handmade layered papercraft diorama, folded and scored cardstock, visible paper thickness and fibers, crisp cut edges, curled strips, tiny construction imperfections. Consistent elevated three-quarter tabletop view, soft directional shadows, centered strong silhouette with breathing room. Warm ivory paper ground, book-ink blue, restrained coral, moss teal and muted violet dyed paper. All effects are cut paper. No text, frame, engraving, painting, chrome, plastic, neon glow, real people or brands.

The starter atlas is generated with the built-in image tool. Its exact sheet prompt and asset provenance live in `public/art/README.md`. Optional runtime AI must use this same direction; combat stats never come from an art model.

## Grimoire inscriptions

The combat book uses original code-drawn SVG glyphs instead of raster medallions or emoji badges. Eight segmented forms share a 96-unit grid, rounded 3.2-unit strokes and generous open space. Each spell has separate cut-paper backing, raised edge, colored face, engraved strokes and animated light strokes. The book itself is coded as a separate cover, page stacks, individual leaves, folded corners and binding stitches; the archived full-book image is not used. Dark moss ink (`#344B49`) and muted writing (`#71644F`) sit on those paper layers. Almendra carries spell names; DM Sans carries resource values, effects and shortcuts. All numeric fields use tabular lining figures. Resources share one row; every prepared spell reserves equal rows for its glyph, two-line name, effect and cost. Resource and action icons are original SVG illustrations.

The signature is an inscription lighting segment by segment once when cast, coordinated with the existing world spell effect. Each family keeps its own silhouette. Forged spells retain the ingredient-derived family and gain bounded, deterministic peripheral marks. Discovered names cannot change glyph identity. Nothing Phone's segmented light language is an inspiration, with original shapes; no branding or hardware layouts are copied. Reduced motion uses a brief static illumination. There are no continuous idle pulses.

## Revised book composition and typography

Use the Ravenswatch book-menu composition closely: bookmark navigation above two individual leaves, a compact selection grid on the left, and one generous illustrated entry with its name, exact effects and cast action on the right. Reference: https://jonsilvestre.artstation.com/projects/3EEa5D. Keep the illustrated world visible above the book. The left page also holds a compact resource row and reusable Strike/Guard controls. Desktop uses a three-column spell grid; narrow screens retain two real pages with a two-column selection grid. Selection previews a spell without spending ink; the explicit Cast control commits it. Keyboard 1-5 remains direct cast.

Almendra, a locally bundled calligraphic manuscript font by Ana Sanfelippo, replaces the ordinary display face for wizard headings, spell names, world labels and short passages. DM Sans remains the utility face for exact values, costs and effects, with tabular figures. World prompts use warm ivory `#FFF0C9` against a dark ink edge `#23343B`; manuscript text uses `#2D383A` against parchment. Avoid transparent-gradient text over detailed art. Never sacrifice legibility for calligraphy.

Spell illustrations are assembled from separate original SVG silhouette, backing, fold, crease and animated edge layers. Fire reads as layered flame, water as a folded drop, stone as faceted rock, wind as curling paper strips. Keep consistent scale and construction across derived elemental families. The large preview adds separately coded diagram rings and frame corners. All cover, leaf, binding, ribbon, picture and control layers remain independent; no complete book image is used.
