import "./style.css";
import {
  FRIENDS,
  STYLES,
  ARGUMENTS,
  newCourt,
  currentCase,
  currentDefendant,
  juryFor,
  startCase,
  acceptPass,
  submitEvidence,
  submitArgument,
  nextCase,
  argumentInfo,
} from "./rules.mjs";
const app = document.querySelector("#app");
const suppliedSeed = new URLSearchParams(location.search).get("seed");
let state = newCourt({
  seed: suppliedSeed === null ? Date.now() : Number(suppliedSeed),
});
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const avatar = (friend, cls = "") =>
  `<span class="avatar ${cls}" style="--person:${friend.color}"><img src="${import.meta.env.BASE_URL}portraits/${friend.file}" alt="${friend.name}" width="88" height="88"></span>`;
const gavel = () =>
  `<svg class="gavel" aria-hidden="true" viewBox="0 0 220 170"><ellipse cx="110" cy="155" rx="83" ry="9" fill="#1b1324" opacity=".22"/><path d="M54 139Q110 127 166 139L171 151H49Z" fill="#8d573e" stroke="#392035" stroke-width="3"/><path d="M61 139Q113 130 160 139" fill="none" stroke="#e0ad72" stroke-width="3"/><g class="gavel-head" transform="rotate(-27 112 80)"><path d="M104 72H121L126 132Q114 140 102 132Z" fill="#aa6b49" stroke="#392035" stroke-width="3"/><path d="M111 81L114 127" stroke="#e5b27d" stroke-width="3"/><path d="M55 42Q111 30 165 42L164 77Q110 90 56 77Z" fill="#b37850" stroke="#392035" stroke-width="4"/><path d="M63 43Q111 33 157 44L156 55Q108 47 64 54Z" fill="#dca268"/><path d="M72 39V82M148 38V82" stroke="#f3d8a1" stroke-width="8"/><path d="M79 64Q112 56 141 65" fill="none" stroke="#6c4139" stroke-width="3"/></g></svg>`;
const button = (action, label, cls = "primary") =>
  `<button class="${cls}" data-action="${action}">${label}</button>`;
function masthead() {
  return `<header class="masthead"><a href="${import.meta.env.BASE_URL}" aria-label="Group Chat Court home" class="wordmark">group chat<br><em>court.</em></a><p>NO LEGAL AUTHORITY.<br>ENORMOUS CONFIDENCE.</p><span class="court-seal" aria-hidden="true">GC<br><i>COURT</i></span></header>`;
}
function progress() {
  return `<div class="docket-progress" aria-label="Case ${Math.min(3, state.caseIndex + 1)} of 3"><span>${state.mode === "hotseat" ? "PASS & PLAY · 2 PEOPLE" : "SOLO · AI PROSECUTOR"}</span><div>${[0, 1, 2].map((n) => `<i class="${n < state.caseIndex ? "done" : n === state.caseIndex ? "current" : ""}">${n + 1}</i>`).join("")}</div></div>`;
}
function jurors(reveal = false) {
  return `<section class="jury" aria-label="The AI jury">${juryFor(state)
    .map((j) => {
      const vote = reveal
        ? state.verdict.votes.find((v) => v.id === j.id)
        : null;
      return `<article class="juror ${vote ? (vote.innocent ? "innocent" : "guilty") : ""}">${avatar(j)}<strong>${j.name}</strong><span>${vote ? (vote.innocent ? "NOT GUILTY" : "GUILTY") : `Loves ${STYLES[j.preference]}`}</span>${vote ? `<p>${esc(vote.reason)}</p>` : ""}</article>`;
    })
    .join("")}<div class="jury-bench" aria-hidden="true"></div></section>`;
}
function caseHeading() {
  const c = currentCase(state),
    d = currentDefendant(state);
  return `<div class="case-heading"><div><p class="eyebrow">THE PEOPLE VS. ${esc(d.name.toUpperCase())}</p><h1 tabindex="-1">${esc(c.title)}</h1><p class="charge">Accused of ${esc(c.charge.charAt(0).toLowerCase() + c.charge.slice(1))}</p><p class="case-detail">${esc(c.detail)}</p></div><div class="defendant">${avatar(d)}<span>PLEADS<br>“WELL, TECHNICALLY…”</span></div></div>`;
}
function intro() {
  return `<main class="intro"><div class="intro-copy"><p class="eyebrow">THE GROUP CHAT IS NOW IN SESSION</p><h1 tabindex="-1">Objection.<br><em>That’s my friend.</em></h1><p class="intro-deck">Three ridiculous cases. Four deeply unqualified friends. Make your case and let the jury decide.</p><div class="cast-line">${FRIENDS.map((f) => `<span>${avatar(f)}<b>${f.name}</b></span>`).join("")}</div><div class="mode-choices">${button("solo", "Defend your friends <small>Solo · against an AI prosecutor</small>")}${button("hotseat", "Take both sides <small>Pass & play · 2 people, one device</small>", "secondary")}</div><details class="how"><summary>How does this court work?</summary><p>Pick one exhibit and one closing argument. Each AI juror values <b>receipts, drama or vibes</b>. Match your case to their tastes. Two votes win; a tie in persuasion means reasonable doubt.</p><p>Solo: you play defense. Pass & play: one person prosecutes, the other defends; pass the device between turns. All accusations are fictional. No online rooms or private messages.</p></details></div><div class="intro-art" aria-hidden="true"><div class="speech">The court will<br>allow the bit.</div>${gavel()}<div class="paper-stack"><span>OFFICIAL BUSINESS</span><b>UNOFFICIAL<br>BEHAVIOR</b><i>Filed under: technically true</i></div><span class="sticker">100%<br>made up</span></div></main>`;
}
function pass() {
  const side = state.phase === "pass-prosecution" ? "prosecutor" : "defense";
  return `<main class="pass-page">${progress()}<section class="handoff"><div class="privacy-seal" aria-hidden="true">✦</div><p class="eyebrow">CLOSED CHAMBERS</p><h1 tabindex="-1">Pass the device<br>to the ${side}.</h1><p>Your opponent’s choices stay covered until the verdict. No peeking over shoulders. This court has standards. Very few.</p>${button("accept", `I’m the ${side} — ready`)}<small>Two people · same device · named AI jury</small></section></main>`;
}
function ratings(power) {
  return `<div class="ratings">${Object.keys(STYLES)
    .map(
      (key) =>
        `<span><i>${"●".repeat(power[key])}${"○".repeat(4 - power[key])}</i>${STYLES[key]}</span>`,
    )
    .join("")}</div>`;
}
function evidenceCard(e, i) {
  return `<button class="exhibit" data-evidence="${e.id}"><span class="exhibit-tab">EXHIBIT ${String.fromCharCode(65 + i)}</span><span class="evidence-symbol" aria-hidden="true">${["↗", "§", "✦"][i]}</span><strong>${esc(e.title)}</strong><p>${esc(e.line)}</p>${ratings(e.power)}<span class="choose-label">Present this exhibit ↗</span></button>`;
}
function argumentCard(a) {
  return `<button class="argument" data-argument="${a.id}"><span class="argument-icon" aria-hidden="true">${a.id === "logic" ? "§" : a.id === "drama" ? "!" : "✦"}</span><strong>${esc(a.title)}</strong><p>${esc(a.line)}</p>${ratings(a.power)}<span class="choose-label">Make this argument ↗</span></button>`;
}
function opponent() {
  if (state.mode !== "solo") return "";
  const p = argumentInfo(state, "prosecution");
  return `<details class="opponent"><summary>The AI prosecutor’s case <span>Read the opposition</span></summary><p><b>${esc(p.evidence.title)}</b> — ${esc(p.evidence.line)}</p><p>Closing argument: <b>${esc(p.argument.title)}</b>.</p></details>`;
}
function hearing() {
  const side = state.phase.startsWith("prosecution")
      ? "prosecution"
      : "defense",
    isEvidence = state.phase.endsWith("-evidence"),
    c = currentCase(state),
    selected = !isEvidence
      ? c[side].find((e) => e.id === state.choices[side].evidence)
      : null;
  return `<main class="hearing">${progress()}${jurors()}<section class="case-file">${caseHeading()}<div class="turn-heading"><div><span class="side-tag ${side}">${side === "defense" ? "DEFENSE" : "PROSECUTION"}</span><h2 tabindex="-1">${isEvidence ? "Choose your evidence." : "Your closing argument."}</h2></div><span class="step">${isEvidence ? "1 · EVIDENCE" : "2 · ARGUMENT"}</span></div>${selected ? `<p class="selected-evidence">Your exhibit: <b>${esc(selected.title)}</b></p>` : ""}<div class="choices">${isEvidence ? c[side].map(evidenceCard).join("") : Object.values(ARGUMENTS).map(argumentCard).join("")}</div>${side === "defense" ? opponent() : ""}<p class="clerk-note">${isEvidence ? "The dots show what each exhibit is good at. The jury above tells you what they care about." : "Choose a style that complements your evidence. The jury casts its own votes."}</p></section></main>`;
}
function verdict() {
  const v = state.verdict,
    c = currentCase(state);
  return `<main class="verdict-page">${progress()}${jurors(true)}<section class="case-file">${caseHeading()}<div class="verdict-main"><div class="verdict-stamp ${v.guilty ? "guilty" : "innocent"}">${v.guilty ? "GUILTY" : "NOT GUILTY"}<small>BY A ${Math.max(v.defenseVotes, 3 - v.defenseVotes)}–${Math.min(v.defenseVotes, 3 - v.defenseVotes)} VOTE</small></div><div class="sentence"><p class="eyebrow">THE COURT ORDERS</p><h2 tabindex="-1">${esc(v.sentence)}</h2></div></div><div class="case-recap">${[
    "prosecution",
    "defense",
  ]
    .map((side) => {
      const info = argumentInfo(state, side);
      return `<div><span>${side.toUpperCase()}</span><b>${esc(info.evidence.title)}</b><p>${esc(info.argument.title)}</p></div>`;
    })
    .join(
      "",
    )}</div><div class="verdict-footer"><p>Defense ${state.defenseVotes} <span>·</span> Prosecution ${state.prosecutionVotes}<small>Total jury votes this hearing</small></p>${button("next", state.caseIndex === 2 ? "Close the court →" : "Next case →")}</div></section></main>`;
}
function between() {
  return `<main class="between-page">${progress()}<section class="handoff"><p class="eyebrow">THE NEXT FILE IS SOMEHOW WORSE</p><h1 tabindex="-1">Case ${state.caseIndex + 1}.<br>${esc(currentCase(state).title)}</h1><p>${currentDefendant(state).name} has requested a lawyer. Unfortunately, they have you.</p>${button("open", "Open the case file →")}</section></main>`;
}
function finished() {
  const wins = state.results.filter((r) => !r.guilty).length;
  return `<main class="finished"><div class="final-gavel">${gavel()}</div><p class="eyebrow">COURT ADJOURNED. FRIENDSHIP PENDING.</p><h1 tabindex="-1">${wins === 3 ? "Unreasonably good lawyer." : wins === 0 ? "A spectacular mistrial." : "Reasonable doubt. Unreasonable people."}</h1><p class="final-score">${wins}<span>/ 3 friends acquitted</span></p><p class="score-note">Defense ${state.defenseVotes} votes · Prosecution ${state.prosecutionVotes} votes</p><div class="final-files">${state.results.map((r, i) => `<article><span>CASE ${i + 1}</span><b>${FRIENDS.find((f) => f.id === r.defendant).name}</b><em class="${r.guilty ? "guilty" : "innocent"}">${r.guilty ? "Guilty" : "Not guilty"}</em><p>${esc(r.sentence)}</p></article>`).join("")}</div><div class="final-actions">${button("restart", "New hearing →")}${button("home", "Back to chambers", "secondary")}</div><p class="clerk-note">No friendships were harmed in the making of these entirely fictional accusations.</p></main>`;
}
function render(focus = true) {
  app.innerHTML =
    masthead() +
    (state.phase === "intro"
      ? intro()
      : state.phase.startsWith("pass-")
        ? pass()
        : state.phase === "verdict"
          ? verdict()
          : state.phase === "finished"
            ? finished()
            : state.phase === "between"
              ? between()
              : hearing()) +
    `<footer><span>GROUP CHAT COURT <i>·</i> FICTIONAL CASES, REAL NONSENSE</span>${state.phase !== "intro" ? button("home", "Leave court", "text-button") : ""}<a href="${import.meta.env.BASE_URL}THIRD_PARTY.txt">Credits</a></footer>`;
  if (focus)
    app.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
}
app.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.evidence) {
    if (submitEvidence(state, target.dataset.evidence)) render();
    return;
  }
  if (target.dataset.argument) {
    if (submitArgument(state, target.dataset.argument)) render();
    return;
  }
  if (action === "solo" || action === "hotseat") {
    state = newCourt({
      mode: action,
      seed: suppliedSeed === null ? Date.now() : Number(suppliedSeed),
    });
    startCase(state);
  } else if (action === "accept") acceptPass(state);
  else if (action === "next") nextCase(state);
  else if (action === "open") startCase(state);
  else if (action === "restart") {
    state = newCourt({ mode: state.mode, seed: Date.now() });
    startCase(state);
  } else if (action === "home") state = newCourt({ seed: Date.now() });
  else return;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
render(false);
