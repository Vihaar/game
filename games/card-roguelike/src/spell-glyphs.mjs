import { effectProfile } from "./effectprofile.mjs";

// Original, segmented inscriptions. Geometry is shared by every UI surface;
// spell identity comes from ingredients, never an AI-generated display name.
const FORMS = {
  fire: [
    "M48 12V27",
    "M41 31L29 47",
    "M27 54Q26 74 43 79",
    "M53 79Q72 73 69 55",
    "M66 47L56 34",
    "M48 45L41 59",
    "M42 66Q48 74 55 65",
  ],
  water: [
    "M45 14L34 32",
    "M29 40L22 53",
    "M21 61Q22 78 42 81",
    "M53 81Q74 76 75 60",
    "M74 52L64 36",
    "M59 29L51 16",
    "M36 58Q48 68 61 58",
  ],
  stone: [
    "M24 25H42",
    "M53 25H72",
    "M75 33V50",
    "M75 59V76H56",
    "M45 76H24",
    "M21 67V49",
    "M21 40V29",
    "M38 41H58V61H38Z",
  ],
  wind: [
    "M17 35H41",
    "M50 35H62Q77 35 75 22",
    "M17 49H34",
    "M43 49H80",
    "M27 63H45",
    "M54 63H62Q76 63 73 77",
  ],
  light: [
    "M48 12V27",
    "M48 69V84",
    "M12 48H27",
    "M69 48H84",
    "M31 31L38 38",
    "M58 58L65 65",
    "M31 65L38 58",
    "M58 38L65 31",
    "M48 37L59 48L48 59L37 48Z",
  ],
  shadow: [
    "M61 16Q39 10 25 30",
    "M21 39Q15 61 34 76",
    "M44 81Q63 84 77 67",
    "M70 62Q49 65 43 47",
    "M42 38Q43 26 53 20",
    "M65 36V45",
    "M61 40H69",
  ],
  lightning: [
    "M56 12L38 37",
    "M33 44L29 50H47",
    "M57 50H68L55 67",
    "M50 74L43 84",
    "M46 59L39 71",
    "M61 28L54 39",
  ],
  vine: [
    "M47 83V65",
    "M47 56V38",
    "M47 29V15",
    "M39 60Q18 59 20 40Q38 39 40 52",
    "M55 44Q77 42 75 23Q56 22 54 35",
    "M40 29L33 22",
    "M55 70L65 60",
  ],
};

export function glyphModel(card = {}) {
  const profile = effectProfile(card);
  const segments = [...FORMS[profile.family]];
  // Fused spells keep the recognisable core, with a stable personal inscription.
  if (card.fused || card.generated) {
    const marks = ["M9 18V27", "M78 9H87", "M87 69V78", "M9 87H18"];
    for (let i = 0; i < marks.length; i++)
      if ((profile.seed >>> i) & 1 || i === profile.seed % marks.length)
        segments.push(marks[i]);
  }
  return {
    family: profile.family,
    color: `#${profile.colors[0].toString(16).padStart(6, "0")}`,
    segments,
  };
}

export function spellGlyph(card = {}) {
  const { family, color, segments } = glyphModel(card);
  const paths = segments
    .map((d, i) => `<path d="${d}" pathLength="1" style="--segment:${i}"/>`)
    .join("");
  return `<svg class="spell-glyph" data-family="${family}" viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false" style="--glyph-color:${color}"><g class="glyph-engraving">${paths}</g><g class="glyph-light">${paths}</g></svg>`;
}

export function playGlyph(button, { reducedMotion = false } = {}) {
  if (!button) return;
  button.classList.add(reducedMotion ? "glyph-lit" : "glyph-casting");
}
