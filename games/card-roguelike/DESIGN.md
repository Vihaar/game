# The Fold: the climb

You wake without a name or memories before a library and begin climbing. Early learning is inviting. Curiosity becomes a thirst, each floor grows darker and more abandoned, and complete understanding reveals that knowledge is a curse. The opening should not spoil the motivation or ending. Follow [NARRATIVE.md](NARRATIVE.md), retaining full permadeath.

The chosen look is warm handmade storybook papercraft. Distinct illustrated rooms sit behind physical folded paths, book props and door arches. Later floors turn cold, eerie and ink-dark. Short smooth camera rails approach books, the forge and bindings. The camera settles for turn-based battles. No free walking, aiming, dodge timing or passive damage.

The open grimoire is the central interface. Prepared spells appear as circular rune inscriptions on its pages. The opposite page holds Strike, Guard, ink and End turn. Combining two owned rune imprints previews a new spell and its exact cost; forged spells can be ingredients again. The existing tested exact-copy and spell-rotation rules remain underneath. Product copy speaks in runes, inscriptions, spells and grimoire pages, rather than cards.

Menus must be quiet. The awakening and a single climb button lead the title screen; class and forge-price settings are secondary. Exploration exposes three objects: read a book, use the forge, enter a binding. Reading is optional and grants no hidden resources. Hide combat controls outside battles. Fraunces supplies a restrained wizard-book serif; DM Sans carries readable controls, spell effects and intentions. Avoid decorative body lettering. Detailed art never sits directly behind essential text.

Enemy name, HP and exact next move sit above each paper guardian. Target button and ring agree. End turn is the explicit commitment. Opening a book, journal or forge cannot trigger hidden combat hotkeys. A Time-price forge previews one named enemy action; corruption and health remain bounded alternatives. Scarce healing, full permadeath and deterministic combat remain unchanged.

Keep rendering inexpensive: capped pixel ratio and resolution, no default postprocessing or dynamic shadow maps. Target60Hz presentation with bounded animation deltas and reduced-motion alternatives. Smoothness means responsive input, finite camera transitions and stable reading, not continuous camera sway. Optional runtime AI supplies presentation only and stays disabled without configuration. Included scenery and rune art work offline after loading and require no generation account.

## Walk-through prototype revision

The first volumetric pass did not meet the art target. Use a representative passage to judge spatial composition and the HUD together. Real floors and stairs support a guided first-person camera; separately illustrated shelf bays, canopies and book objects occupy multiple depths. No full-room picture is loaded. The grimoire contains health, guard, ink and rune actions on its pages; world prompts have no cards or boxes, and doorway names are world-space inscriptions. Spell choreography is live code with a brief action lock through impact, reduced-motion alternatives, pooled resources and bounded effects. See PROTOTYPE_REVIEW.md and docs/FOLD_SHROOM_REFERENCE.md.
