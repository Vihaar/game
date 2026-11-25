# Painted library, spell targeting and run choices

Current slice: three floors, one nameless apprentice, spell-only combat, and a fixed 2 HP crafting price. Originals stay reusable; no Focus, corruption or extra enemy action is charged for combining. The book keeps only Spells and Combine tabs. Character selection and separate Strike/Guard actions are removed.

Library materials carry local pigment shading and uneven ink contours. Six original enemy types are separate curved body, hood, face, eyes, arms and prop layers; the running world no longer loads the complete enemy atlas. Battle framing exposes their whole bodies above the book. No full-room or full-book image replaces the code-composed scene.

Each floor offers normal archive and elite guardian routes with different relic timing. Six relics alter spells or recovery. Encounters vary by seed. Nine semantic combinations include Ricochet, Stolen Sentence and Borrowed Dawn; their animations follow actual targets and use the existing bounded effect pool. Contributor instructions live in SPELL_AUTHORING.md.

Verification: all 142 repository tests pass (109 Fold, 27 kart, 3 soup, 3 elevator), with typecheck and four builds. A real DOM-driven browser run crafted three spells for exactly 6 HP, completed archive/elite/archive encounters at 24 HP before final recovery, encountered copied player spells, and reached the ending without basic actions. Separate UI checks selected an attack spell and clicked an enemy to cast; Ricochet resolved three real hits, Stolen Sentence copied a 7-damage telegraph into 3 guard and 4 HP damage, and Borrowed Dawn restored Focus from 2 to 3 before reducing the next turn to 2. Desktop and 390px mobile rendering showed the drawn enemies above the book and no JavaScript or shader errors. Full permadeath and multi-seed rule coverage remain in tests; human feedback is still needed for difficulty and pacing.

---

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

The subsequent layered pass removes the flattened book image completely. Separate code-built cover, page stacks, leaves, folded corners and binding support raised SVG rune pieces with backing, colored face, engraved glyph and light layers. Resource/action icons share original SVG geometry. This construction rule is mandatory in ART_DIRECTION.md for every future world, UI and spell asset.

The first library-learning slice is also wired into the journal and enemy intentions: three successful casts teach a spell, a later guardian prepares and copies it, and between-battle forgetting sacrifices every owned copy to erase its danger. Browser playthrough reached the second floor without mutating game state: learned Ember and Stone, forgot both Stone copies, saw a guardian announce Ember, then blocked all four damage from its copied spell. Later chapter text and the ending reveal the guardians as versions of the player. Conceptual spell combinations and persistent room scars remain future work. Updated root validation: 101 tests, typecheck and all four builds pass.

## Ravenswatch composition and start-flow repair

The book now follows the reference's selection/detail arrangement: bookmark tabs, a left-page spell grid and a right-page illustrated entry with an explicit cast action. Every portrait is original layered SVG paper geometry, with separate silhouette, backing, folds, creases and lit edges. Selection does not spend ink. The keyboard's 1-5 shortcuts still cast directly. Almendra Regular/Italic are bundled locally under OFL; world prompts use ivory text with a dark ink edge rather than low-contrast gradient lettering.

The live start screen reached exploration, but its main continue control was hidden by old CSS and world labels were too faint to make the next action clear. The first-guardian action is now visible and centered. The path displays progress and offers Skip walk. Camera rails receive presentation wall time separately from capped simulation time; stalled/rejected cosmetic transitions recover instead of permanently owning the start flow.

Validation: root typecheck, 103 tests and all four builds pass. Browser checks cover an intentionally never-resolving entry animation recovering after six seconds, Skip walk, desktop/390px two-page layouts, locally loaded font, selection without ink loss, button casting with correct damage/cost, journal access after casting, Firestorm forging, a completed first battle and reward traversal to floor2. No JavaScript errors were observed. Updated screenshots show the new spread.

## Three-floor playtest and simple reusable fusion

The guided run now ends at three floors, with an immediate ending after the42HP mirror guardian. The current truths are Language, Memory and Self. Lamps, books and shelf sections disappear as rooms darken; hanging pages/debris mark abandonment. Original fire discoveries add bounded, reversible scorch/ash layers.

Combining retains reusable originals, supports same-spell inputs and has no recipe-depth cap. Six semantic discoveries supply replay, interruption, reflection, extra preparation and piercing. It is free between battles and costs1Focus plus the selected punishment in combat. Advanced choices are collapsed; two spell choices, one clear result and Combine form the main flow. Focus has its own crystal/star, visible label and values. Hand-drawn ink and painted SVG shading soften the spell art while retaining separate code layers.

Root verification passes119tests plus typecheck and all four builds. A legal browser run crafted MirrorWard, Afterflame and QuietPyre, completed all three floors, encountered its copied QuietPyre at the mirror boss, and won with27HP. Final victory did not require an irrelevant reward choice. Restart restored7source spells,0merges,0learned spells and0fire scars. Browser tests also created all six recipes, combined the same source twice, recursively combined new outputs, retained all source ownership, and confirmed free crafting kept Focus unchanged. Desktop/mobile composition and readability were inspected.
