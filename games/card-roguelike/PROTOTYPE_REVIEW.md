# Walk-through prototype: art direction review

This branch is a design prototype, held back from the production site. The previous implementation put a full-room illustration behind a small camera movement. The first volumetric version then used crude geometry with decorative textures. Neither met the requested Shroom and Gloom level of scene composition.

The revised representative passage uses separately generated bookshelf bays, canopy frames, book plinths and an open-book doorway at different world depths, supported by actual floors, walls, arches and connected stairs. These are distinct objects that the first-person camera moves among. There is no full-room picture in the runtime. Floors still have eight themes, but the first passage is the art-quality checkpoint; later floors are not being presented as finished environments.

The HUD is being reduced to the physical grimoire: health, guard, ink and prepared rune controls on its pages. The room name is an inscription on the doorway. Projected Read/Inscribe/Ascend prompts have no boxes. Enemy intentions retain legible projected lettering. This is a prototype interface, not a claim that adding shimmer solves the art direction.

Spell animation is code, using Three.js and the bundled MIT Tween.js implementation. Fire has anticipation, a traveling paper fireball and an impact burst. Other elemental families have distinct bounded motion, and forged spells derive effects from their elemental data rather than a display name. The generated rune art seeds cast and forge seals. Reduced-motion alternatives are included.

Reusable sources and limits are documented in docs/FOLD_3D_RESEARCH.md, docs/FOLD_SHROOM_REFERENCE.md and SPELL_EFFECTS_RESEARCH.md. Public reference material was studied; no Shroom and Gloom or Hearthstone source or assets were extracted.

A useful next review is one complete passage, exploration stop, fight and next staircase. Judge consistent art, readable low-clutter interface, actual depth while moving and satisfying cast timing together before expanding more content.

## Grimoire glyph pass

Prepared spells, inventory and fusion previews now share original code-drawn segmented SVG inscriptions. Raster medallions and emoji badges are removed from those controls. Each family has its own form; forged glyphs retain their ingredient identity and gain bounded peripheral marks. A single light sequence plays on a successful cast, while reduced motion gives a brief static illumination. The world projectile/effect still plays independently.

Resources use tabular figures on one shared baseline. Spell slots reserve equal rows for glyph, two-line name, effect and ink cost, including wrapped fusion names. Desktop and 390px mobile screenshots accompany this pass. Headless browser validation covered entry, a targeted Ember cast, Ember/Gust forging into Firestorm, an area cast, enemy turn, keyboard Strike/Guard and reduced-motion casting. Measured desktop baselines matched across all five slots; reduced motion produced zero glyph animations. Root typecheck, 92 tests and all four production builds passed.
