import { glyphModel } from "./spell-glyphs.mjs";

// Original cut-paper shapes. Backing, silhouette, folds and lit edges remain
// independent SVG layers; no finished spell image is used as a UI background.
const SHAPES = {
  fire: {
    paper: "#be6544",
    light: "#efb466",
    dark: "#7e3933",
    outline:
      "M78 19C91 51 126 64 121 100C118 132 94 148 76 146C44 144 26 119 35 95C40 80 54 65 54 48C63 55 66 67 66 77C81 62 84 43 78 19Z",
    fold: "M78 59C88 84 107 91 101 115C97 132 84 138 73 132C57 125 54 112 62 98C65 93 69 86 69 80C80 91 77 102 78 107C90 96 87 79 78 59Z",
    crease: "M78 21 69 82M38 103 64 115M117 104 98 117",
  },
  water: {
    paper: "#4e8f9b",
    light: "#b7d7cf",
    dark: "#32586f",
    outline:
      "M80 20C66 50 34 80 34 105C34 133 54 148 80 148C106 148 126 131 126 105C126 81 93 50 80 20Z",
    fold: "M80 24C75 73 47 95 48 113C52 142 89 149 107 128C88 137 67 122 68 107C69 88 87 68 80 24Z",
    crease: "M37 106Q57 91 79 108T124 107M42 123Q60 110 81 125T118 124",
  },
  stone: {
    paper: "#71858b",
    light: "#bcc4b5",
    dark: "#3b535e",
    outline: "M26 89 53 41 102 37 137 87 120 134 56 145 25 125Z",
    fold: "M53 41 71 93 26 89M102 37 94 87 71 93M94 87 120 134 56 145 71 93Z",
    crease: "M53 41 102 37 94 87 137 87M25 125 71 93 56 145",
  },
  wind: {
    paper: "#7a9e9a",
    light: "#d2dbc4",
    dark: "#42646f",
    outline:
      "M22 71C52 47 90 89 119 61C133 46 117 30 102 39C109 12 148 28 137 58C127 89 76 82 49 76C35 73 29 72 22 71ZM22 99C60 72 89 120 119 91C132 80 148 83 143 99C139 114 123 121 103 118C69 112 55 95 22 99ZM37 121C64 106 74 140 99 127C105 124 108 115 105 110C126 124 113 147 93 146C68 145 60 123 37 121Z",
    fold: "M22 71C61 61 91 90 123 66M22 99C65 89 93 130 135 104M37 121Q75 133 100 136",
    crease: "M109 38Q127 33 126 51",
  },
  light: {
    paper: "#c69e52",
    light: "#f1df9c",
    dark: "#89623d",
    outline: "M80 18 94 60 135 81 96 101 80 150 64 103 24 81 65 61Z",
    fold: "M80 18 80 81 135 81 96 101 80 81 80 150 64 103 80 81 24 81 65 61Z",
    crease: "M80 18V150M24 81H135",
  },
  shadow: {
    paper: "#625372",
    light: "#a99abc",
    dark: "#37364e",
    outline:
      "M109 26C57 19 27 53 30 95C34 141 82 161 120 127C75 137 56 100 67 68C74 47 90 34 109 26Z",
    fold: "M109 26C64 38 45 82 55 112C63 135 91 144 120 127C78 166 32 134 30 95C27 53 57 19 109 26Z",
    crease: "M40 76 55 88M47 114 63 119M62 47 72 54",
  },
  lightning: {
    paper: "#9a83b5",
    light: "#e4c99e",
    dark: "#51456e",
    outline: "M91 18 36 91 70 91 57 151 127 69 91 69 112 18Z",
    fold: "M91 18 59 80 84 80 57 151 103 81 80 81 112 18Z",
    crease: "M37 91H70M91 69H127",
  },
  vine: {
    paper: "#648660",
    light: "#b5c48a",
    dark: "#3f6052",
    outline:
      "M75 151 80 47 86 22 91 25 86 74C101 40 130 43 138 44C140 75 118 99 87 94L84 151ZM78 114C44 118 22 95 25 68C52 65 73 80 78 104Z",
    fold: "M25 68 77 112 78 104C73 80 52 65 25 68ZM87 94 138 44C130 43 101 40 86 74Z",
    crease: "M25 68 77 112M87 94 138 44M83 40 79 148",
  },
  memory: {
    paper: "#9b7eaa",
    light: "#e5cdae",
    dark: "#584763",
    outline:
      "M40 35Q20 33 23 54Q25 68 39 65L43 129Q43 148 61 149H112Q135 143 129 124Q124 113 111 119L106 45Q104 30 89 29Z",
    fold: "M40 35Q32 50 39 65L43 129Q43 148 61 149Q45 133 63 122H111L106 45Q94 56 79 52Z",
    crease: "M53 66H95M56 82H93M57 98H85M63 122H111",
  },
  silence: {
    paper: "#69788c",
    light: "#c5c7cc",
    dark: "#384b62",
    outline:
      "M80 25 121 49 121 112 80 145 38 112 38 49ZM53 62V104L80 124 106 104V62L80 45Z",
    fold: "M80 25V45L53 62 38 49ZM106 62 121 49V112L106 104ZM38 112 80 145V124L53 104Z",
    crease: "M55 85H105M65 72V98M80 68V102M95 72V98",
  },
  mirror: {
    paper: "#6f999f",
    light: "#e2e2cc",
    dark: "#3d6070",
    outline:
      "M80 19 124 51 124 111 80 145 36 111 36 51ZM80 34 48 58 48 104 80 129 112 104 112 58Z",
    fold: "M80 34 48 58V104L65 116 104 52ZM90 43 61 114 80 129 112 104V58Z",
    crease:
      "M80 19V34M36 51 48 58M124 51 112 58M36 111 48 104M80 145V129M124 111 112 104",
  },
};
let illustrationSerial = 0;
export function spellIllustration(card = {}, { detailed = false } = {}) {
  const glyph = glyphModel(card),
    shape = SHAPES[card.key] || SHAPES[card.kind] || SHAPES[glyph.family];
  const paintId = `spell-paint-${++illustrationSerial}`;
  const orbit = detailed
    ? `<g class="illustration-notes" fill="none" stroke="${shape.dark}" stroke-width=".7" opacity=".28"><circle cx="80" cy="88" r="64"/><circle cx="80" cy="88" r="70" stroke-dasharray="2 7"/><path d="M8 88H152M80 10V164M27 35 133 141M27 141 133 35"/></g>`
    : "";
  return `<svg class="spell-illustration spell-glyph" data-family="${glyph.family}" viewBox="0 0 160 174" aria-hidden="true" focusable="false" style="--glyph-color:${shape.light}"><defs><linearGradient id="${paintId}" x1=".15" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="${shape.light}"/><stop offset=".35" stop-color="${shape.paper}"/><stop offset=".72" stop-color="${shape.paper}"/><stop offset="1" stop-color="${shape.dark}"/></linearGradient></defs>${orbit}<g class="sculpture-shadow" transform="translate(3 5)"><path d="${shape.outline}" fill="${shape.dark}" stroke="${shape.dark}" stroke-width="2"/></g><g class="sculpture-paper"><path d="${shape.outline}" fill="url(#${paintId})" stroke="${shape.dark}" stroke-width="1.8"/><path d="${shape.fold}" fill="${shape.light}" opacity=".58" stroke="${shape.light}" stroke-width="1.2"/><path d="${shape.crease}" fill="none" stroke="${shape.dark}" opacity=".5" stroke-width="1"/><path d="${shape.outline}" transform="translate(.5 -.4)" fill="none" stroke="${shape.light}" opacity=".25" stroke-width=".65"/></g><g class="glyph-light" fill="none" stroke="${shape.light}" stroke-width="2"><path d="${shape.outline}" pathLength="1" style="--segment:0"/><path d="${shape.crease}" pathLength="1" style="--segment:1"/></g></svg>`;
}
