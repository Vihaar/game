# The Fold — papercraft art direction

## The world

A cursed library is consuming reality. Rooms, people and spells are being rebuilt from its pages. Everything should look physically constructed from folded paper, cut cardstock and bookbinding thread. The danger comes from a beautiful handmade world tearing itself apart.

## Signature

**A spell is a tiny paper sculpture lifted from the page.** Show the folded construction, not a painting of the subject. Card art and enemies share the same sharp folds, layered cut edges and visible material thickness. Spells combine by visibly stacking and folding their ingredients.

## Palette and type

| Material | Color | Use |
| --- | --- | --- |
| Warm paper | `#F1E6D2` | Cards, page surfaces, enemy labels |
| Cut edge | `#CBB797` | Fibers, folded seams, quiet borders |
| Book ink | `#22334B` | Text, deep room shapes, outlines |
| Ember paper | `#E7774F` | Fire, attack windups, health danger |
| Moss paper | `#6C9284` | Dew, rare healing, archive gardens |
| Violet paper | `#8577A5` | Wind, corruption, impossible rooms |

Keep colors as dyed paper, with slight fiber variation. Fraunces is the restrained chapter/display face; DM Sans is for readable controls and cards; system monospace is for numbers, timing and small ink-stamped labels. Existing font fallbacks must work without a network.

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

On 2026-11-24 the user selected the first preview, **warm handmade storybook**. Ivory paper, honey light, moss foliage, dusty coral bindings and book-ink blue now define every chapter. `public/art/SCENES.md` retains the original three concepts as provenance; the other two are archived studies. New chapter art must match `public/art/storybook.webp`.

The playable world uses a guided 2.5D composition: chapter-specific illustrations behind physical paper architecture, a folded path and book props. Perspective changes along short fixed camera rails when entering rooms or approaching a book or forge; battles remain still. The player explores by choosing visible objects, with mouse, touch and keyboard equivalents. Avoid recreating frantic free movement. Each of the eight truths must have its own identifiable room.

The signature is the path through an oversized open book: the learner moves from a blank page toward a library of connected ideas. Keep the center inviting and preserve the rich art around it. Interactive objects belong in the room; quiet paper labels make them discoverable. Reading and forging are optional before a battle and provide no hidden healing or combat bonuses.

## Generation prompt to reuse

Original spell-card miniature, [SUBJECT AND TWO INGREDIENTS]. A physically handmade layered papercraft diorama, folded and scored cardstock, visible paper thickness and fibers, crisp cut edges, curled strips, tiny construction imperfections. Consistent elevated three-quarter tabletop view, soft directional shadows, centered strong silhouette with breathing room. Warm ivory paper ground, book-ink blue, restrained coral, moss teal and muted violet dyed paper. All effects are cut paper. No text, frame, engraving, painting, chrome, plastic, neon glow, real people or brands.

The starter atlas is generated with the built-in image tool. Its exact sheet prompt and asset provenance live in `public/art/README.md`. Optional runtime AI must use this same direction; combat stats never come from an art model.
