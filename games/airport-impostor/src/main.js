import Phaser from "phaser";
import "./style.css";
import {
  WORLD,
  STATIONS,
  newAirport,
  seededRandom,
  movement,
  availableStation,
  interact,
  inspect,
  tickClock,
  stepTravelers,
  aiInspector,
  score,
} from "./rules.mjs";
const app = document.querySelector("#app"),
  query = new URLSearchParams(location.search);
let state = null,
  game = null,
  activeScene = null,
  selected = null,
  uiClock = 0,
  rng = null,
  keys = null,
  destination = null,
  held = false,
  localBrief = false;
const input = { dx: 0, dy: 0, run: false };
const keyboardHeld = new Set();
const seed = () => (query.has("seed") ? Number(query.get("seed")) : Date.now());
const plane = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M43 24L28 18V7Q25 2 22 7V18L6 24V28L22 25V37L16 41V44L25 41L34 44V41L28 37V25L43 28Z" fill="currentColor"/></svg>`;
const header = () =>
  `<header><a href="${import.meta.env.BASE_URL}" class="brand">${plane}<span>TERMINAL<br><b>ODD.</b></span></a><p>AIRPORT IMPOSTOR<br><span>BOARDING GROUP: SUSPICIOUSLY NORMAL</span></p><span class="terminal-tag">C</span></header>`;
const icon = (id) => (id === "sign" ? "↗" : id === "bag" ? "▣" : "→");
function home() {
  keyboardHeld.clear();
  game?.destroy(true);
  game = null;
  state = null;
  app.innerHTML =
    header() +
    `<main class="welcome"><div class="welcome-copy"><p class="eyebrow">THIRTY TRAVELERS. ONE SECRET PLAN.</p><h1>Act natural.<br><em>Gate’s closing.</em></h1><p class="deck">One traveler is smuggling a suitcase full of forbidden rubber ducks. Blend into the crowd—or spot the one who isn’t.</p><div class="role-options"><button data-start="impostor"><b>Be the impostor →</b><span>Move, mingle, finish 3 objectives. AI security watches.</span></button><button data-start="agent"><b>Work security →</b><span>Watch 30 travelers. Find the impostor in 3 inspections.</span></button><button data-start="local"><b>Local showdown →</b><span>2 people · one device · keys versus mouse or touch.</span></button></div><details><summary>What counts as suspicious?</summary><p>Behavior: racing around, visiting objectives in quick succession, or a very purposeful route. Everyone’s appearance is unrelated to their role. Travelers regularly stop at signs, luggage and gates too.</p><p>Impostor: walk with WASD/arrows, hold Shift to run, hold E or the Interact button at an objective. You can also click Walk here. Security: select a traveler and spend an inspection. Local mode hides the impostor assignment after a private briefing.</p><p>This prototype is solo or two players on the same device. No online room or account is required. The contraband is fictional rubber ducks.</p></details></div><div class="flight-board" aria-hidden="true"><p>DEPARTURES</p><div><span>DU 404</span><b>NOT A DUCK</b><i>DELAYED</i></div><div><span>SP 013</span><b>ACT NATURAL</b><i>BOARDING</i></div><div><span>GC 030</span><b>VERY NORMAL</b><i>GATE C</i></div><div class="board-footer">PLEASE KEEP ALL QUACKING TO A MINIMUM.</div><div class="luggage-art"><span>?</span><i></i><b>DUCK-FREE*</b></div></div></main><footer><span>PURELY FICTIONAL. ENTIRELY BEHAVIORAL.</span><a href="${import.meta.env.BASE_URL}THIRD_PARTY.txt">Sources & credits</a></footer>`;
}
function start(role) {
  keyboardHeld.clear();
  state = newAirport({ role, seed: seed() });
  rng = seededRandom(state.seed + 47);
  destination = null;
  selected = null;
  held = false;
  input.dx = input.dy = 0;
  input.run = false;
  localBrief = role === "local";
  renderPlay();
}
function renderPlay() {
  app.innerHTML =
    header() +
    `<main class="play"><div class="status-line"><span id="role-label">${state.role === "agent" ? "SECURITY · WATCH THE PATTERNS" : state.role === "local" ? "LOCAL SHOWDOWN · KEYS VS. INSPECTIONS" : "IMPOSTOR · BLEND INTO THE CROWD"}</span><strong id="timer">2:30</strong><button data-action="home">Leave terminal</button></div><div class="game-layout"><div class="map-wrap"><div id="stage" aria-label="Airport map with thirty travelers" role="img"></div><p class="map-caption">${state.role === "agent" ? "Select a traveler to follow their movement. Inspect only when you are ready." : state.role === "local" ? "Impostor uses WASD/arrows. Security clicks travelers and inspects." : "You are the traveler with the small mint ring. Match the crowd’s walking pace."}</p><div id="result" hidden></div>${localBrief ? `<section class="brief" id="brief"><p class="eyebrow">PRIVATE ASSIGNMENT</p><h2>Security, look away.</h2><p>The impostor should read their assignment before the round starts.</p><button data-action="reveal">Reveal my traveler</button></section>` : ""}</div><aside><section class="mission"><p class="eyebrow">${state.role === "agent" ? "OBSERVATION BRIEF" : "YOUR SECRET ERRANDS"}</p><h2>${state.role === "agent" ? "Follow the behavior." : "Pack light. Lie low."}</h2>${state.role === "agent" ? `<p>The impostor will check the flight board, swap the duck suitcase, then leave through Gate C.</p><p>Ordinary travelers visit those places too. Watch who connects all three.</p>` : `<ol id="objectives">${STATIONS.map((s) => `<li data-objective="${s.id}"><span>${icon(s.id)}</span><div><b>${s.id === "sign" ? "Check the flight board" : s.id === "bag" ? "Swap the duck suitcase" : "Reach Gate C"}</b><small>${s.id === "gate" ? "After the first two errands" : "Hold Interact nearby"}</small></div><button data-walk="${s.id}">Walk here</button></li>`).join("")}</ol><div class="interaction"><span id="nearby">Walk to an objective.</span><div><i id="interaction-progress"></i></div><button data-action="interact" id="interact-button">Hold to interact <kbd>E</kbd></button></div>${state.role === "impostor" ? `<div class="suspicion"><span>AI attention <b id="attention-label">Low</b></span><div><i id="attention-progress"></i></div><small>Rushing attracts attention. The crowd walks.</small></div>` : ""}`}</section><section class="inspector ${state.role === "impostor" ? "ai-only" : ""}"><p class="eyebrow">${state.role === "impostor" ? "AI SECURITY DESK" : "SECURITY DESK"}</p><h2><span id="inspections">3</span> inspections left.</h2>${state.role === "impostor" ? `<p>Security reviews suspicious behavior roughly every 18 seconds. Finish before the gate closes.</p>` : `<label for="traveler-select">Selected traveler</label><select id="traveler-select"><option value="">Select on the map or choose here</option>${state.travelers.map((p) => `<option value="${p.id}">Traveler ${String(p.id + 1).padStart(2, "0")}</option>`).join("")}</select><p id="observation">Watch their route before spending an inspection.</p><button data-action="inspect" id="inspect-button" disabled>Inspect traveler</button>`}<p id="inspection-message" role="status"></p></section>${state.role !== "agent" ? `<div class="touch-controls" aria-label="Movement controls"><button data-dir="up" aria-label="Move up">↑</button><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move down">↓</button><button data-dir="right" aria-label="Move right">→</button></div>` : ""}<p class="controls-note">${state.role === "agent" ? "Mouse/touch: select, then inspect." : "WASD / arrows · Shift: run · E: interact"}<br>150 seconds. No audio. No identity clues.</p></aside></div></main><footer><span>TERMINAL ODD · SOLO / LOCAL TWO-PLAYER</span><a href="${import.meta.env.BASE_URL}THIRD_PARTY.txt">Sources & credits</a></footer>`;
  launch();
}
function selectTraveler(id) {
  if (localBrief || state.role === "impostor" || state.phase !== "playing")
    return;
  selected = id;
  state.selected = id;
  document.querySelector("#traveler-select").value = id;
  document.querySelector("#inspect-button").disabled =
    state.travelers[id].inspected;
  const p = state.travelers[id];
  document.querySelector("#observation").textContent = p.inspected
    ? "Already inspected. Their suitcase contained only tiny socks."
    : `Traveler ${String(id + 1).padStart(2, "0")} · ${p.route} ordinary stops observed. Follow their path.`;
}
function inspection() {
  if (localBrief || selected === null) return;
  const r = inspect(state, selected);
  if (!r.ok) return;
  document.querySelector("#inspection-message").textContent = r.caught
    ? "Caught: a chorus of rubber ducks."
    : "Clear. Just a very ordinary suitcase. Keep watching.";
  syncHUD();
}
class TerminalScene extends Phaser.Scene {
  create() {
    activeScene = this;
    this.cameras.main.setBackgroundColor("#e4e6dc");
    const g = this.add.graphics();
    g.fillStyle(0xd4dfdf);
    g.fillRect(0, 0, 1000, 650);
    g.fillStyle(0xeee9d8);
    g.fillRoundedRect(30, 50, 940, 550, 18);
    g.lineStyle(1, 0xc8cebf, 0.6);
    for (let x = 50; x < 1000; x += 50) g.lineBetween(x, 55, x, 595);
    for (let y = 50; y < 650; y += 50) g.lineBetween(35, y, 965, y);
    g.fillStyle(0xa3c4cf);
    g.fillRect(50, 50, 900, 30);
    for (let x = 60; x < 950; x += 80) {
      g.fillStyle(0xe8f7f0);
      g.fillRect(x, 55, 66, 18);
    }
    g.fillStyle(0xb5c7bb);
    g.fillRect(50, 583, 900, 16);
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x759b8a);
      g.fillRoundedRect(260 + i * 42, 558, 30, 17, 5);
      g.lineStyle(3, 0x3a6159);
      g.strokeRoundedRect(260 + i * 42, 554, 30, 21, 5);
    }
    g.fillStyle(0xd4ba85);
    g.fillRoundedRect(70, 445, 160, 72, 8);
    g.fillStyle(0x30545d);
    g.fillRoundedRect(80, 455, 140, 15, 3);
    this.label(150, 492, "CAFÉ · 24/7", 16, "#536858");
    g.fillStyle(0xcabfa3);
    g.fillRoundedRect(440, 296, 110, 67, 8);
    g.fillStyle(0x759b8a);
    for (let x = 450; x < 550; x += 24) g.fillRoundedRect(x, 307, 15, 43, 4);
    this.label(495, 394, "WAIT HERE", 10, "#96a59a");
    for (const station of STATIONS) {
      const color =
        station.id === "sign"
          ? 0x213c4b
          : station.id === "bag"
            ? 0xc8ab75
            : 0x355d61;
      g.fillStyle(color);
      g.fillRoundedRect(station.x - 62, station.y - 26, 124, 52, 7);
      g.lineStyle(2, 0x183d49, 0.3);
      g.strokeRoundedRect(station.x - 62, station.y - 26, 124, 52, 7);
      this.label(
        station.x,
        station.y - 2,
        station.id === "sign"
          ? "FLIGHT BOARD"
          : station.id === "bag"
            ? "LOST LUGGAGE"
            : "GATE C →",
        12,
        station.id === "bag" ? "#493e36" : "#f7edce",
      );
      g.lineStyle(2, 0xb9a878, 0.45);
      g.strokeCircle(station.x, station.y, station.radius);
    }
    this.label(585, 95, "→ GATES B — C", 15, "#6c837d");
    this.label(80, 613, "ARRIVALS", 13, "#597776");
    this.label(890, 613, "TERMINAL ODD", 11, "#719087");
    this.people = state.travelers.map((p, i) => {
      const c = this.add.container(p.x, p.y);
      const shadow = this.add.ellipse(0, 9, 22, 9, 0x263b3f, 0.17),
        body = this.add
          .rectangle(
            0,
            2,
            15,
            20,
            [0x8ba7b0, 0xc29784, 0x7f9d85, 0xac93ad, 0xc4aa72][i % 5],
          )
          .setStrokeStyle(1, 0x48666a, 0.5),
        head = this.add
          .circle(0, -9, 7, 0xe7cab1)
          .setStrokeStyle(1, 0xa98e79, 0.45),
        bag = this.add
          .rectangle(13, 8, 8, 11, 0x655e64)
          .setStrokeStyle(1, 0x3d5157, 0.6),
        id = this.add
          .text(0, -24, String(i + 1).padStart(2, "0"), {
            fontFamily: "Arial",
            fontSize: "10px",
            color: "#4d686a",
          })
          .setOrigin(0.5);
      c.add([shadow, body, head, bag, id]);
      return c;
    });
    this.mark = this.add.graphics();
    this.cursor = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D,E,SHIFT,SPACE");
    keys = this.wasd;
    this.input.on("pointerdown", (pointer) => {
      if (localBrief) return;
      if (state.role === "impostor") {
        destination = { x: pointer.x, y: pointer.y };
      } else {
        const sorted = state.travelers
          .map((p) => ({
            id: p.id,
            d: Math.hypot(p.x - pointer.x, p.y - pointer.y),
          }))
          .sort((a, b) => a.d - b.d);
        if (sorted[0].d < 28) selectTraveler(sorted[0].id);
      }
    });
    this.game.canvas.setAttribute(
      "aria-label",
      "Top-down terminal with 30 numbered travelers, flight board, lost luggage and Gate C",
    );
    syncHUD();
  }
  label(x, y, text, size, color) {
    return this.add
      .text(x, y, text, {
        fontFamily: "Arial",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5);
  }
  update(time, delta) {
    if (!state || localBrief) return;
    const dt = Math.min(0.06, delta / 1000);
    if (state.phase === "playing") {
      if (state.role !== "agent") {
        let dx =
            (this.cursor.right.isDown ||
            this.wasd.D.isDown ||
            keyboardHeld.has("d") ||
            keyboardHeld.has("arrowright")
              ? 1
              : 0) -
            (this.cursor.left.isDown ||
            this.wasd.A.isDown ||
            keyboardHeld.has("a") ||
            keyboardHeld.has("arrowleft")
              ? 1
              : 0) +
            input.dx,
          dy =
            (this.cursor.down.isDown ||
            this.wasd.S.isDown ||
            keyboardHeld.has("s") ||
            keyboardHeld.has("arrowdown")
              ? 1
              : 0) -
            (this.cursor.up.isDown ||
            this.wasd.W.isDown ||
            keyboardHeld.has("w") ||
            keyboardHeld.has("arrowup")
              ? 1
              : 0) +
            input.dy;
        const p = state.travelers[state.impostor];
        if (dx || dy) destination = null;
        else if (destination) {
          const d = Math.hypot(destination.x - p.x, destination.y - p.y);
          if (d < 5) destination = null;
          else {
            dx = (destination.x - p.x) / d;
            dy = (destination.y - p.y) / d;
          }
        }
        movement(
          state,
          {
            dx,
            dy,
            run:
              this.wasd.SHIFT.isDown || input.run || keyboardHeld.has("shift"),
          },
          dt,
        );
        interact(
          state,
          held ||
            this.wasd.E.isDown ||
            this.wasd.SPACE.isDown ||
            keyboardHeld.has("e") ||
            keyboardHeld.has(" "),
          dt,
        );
      }
      stepTravelers(state, dt, rng);
      tickClock(state, dt);
      const ai = aiInspector(state, dt, rng);
      if (ai?.ok)
        document.querySelector("#inspection-message").textContent = ai.caught
          ? "Security noticed the rushing. Quack."
          : "Security inspected someone else. Keep blending.";
    }
    for (const p of state.travelers) {
      const c = this.people[p.id];
      c.setPosition(p.x, p.y);
      c.setAlpha(p.inspected ? 0.4 : 1);
      c.getAt(1).rotation = Math.sin(time * 0.008 + p.id) * 0.04;
    }
    this.mark.clear();
    if (state.role === "impostor") {
      const p = state.travelers[state.impostor];
      this.mark.lineStyle(2, 0x2c9279, 0.9).strokeCircle(p.x, p.y, 16);
    }
    if (selected !== null) {
      const p = state.travelers[selected];
      this.mark.lineStyle(3, 0xc57d47, 0.9).strokeCircle(p.x, p.y, 19);
    }
    if (destination) {
      this.mark
        .lineStyle(2, 0x428b82, 0.6)
        .strokeCircle(destination.x, destination.y, 7);
    }
    uiClock += dt;
    if (uiClock > 0.12 || state.phase === "ended") {
      uiClock = 0;
      syncHUD();
    }
  }
}
function launch() {
  game?.destroy(true);
  activeScene = null;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1000,
    height: 650,
    parent: "stage",
    transparent: false,
    scene: TerminalScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
    fps: { target: 30 },
    audio: { noAudio: true },
  });
}
function syncHUD() {
  if (!state) return;
  const seconds = Math.ceil(state.time),
    timer = document.querySelector("#timer");
  if (!timer) return;
  timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  document.querySelector("#inspections").textContent = state.inspections;
  for (const s of STATIONS) {
    const li = document.querySelector(`[data-objective="${s.id}"]`);
    if (li) {
      li.classList.toggle("done", state.objectives.includes(s.id));
      li.querySelector("small").textContent = state.objectives.includes(s.id)
        ? "Done"
        : s.id === "gate" && state.objectives.length < 2
          ? "Finish the first two errands"
          : "Hold Interact nearby";
      li.querySelector("button").disabled = state.objectives.includes(s.id);
    }
  }
  if (state.role !== "agent") {
    const near = availableStation(state);
    document.querySelector("#nearby").textContent = near
      ? `Nearby: ${near.name}. Hold to complete.`
      : "Walk to an unfinished objective.";
    document.querySelector("#interact-button").disabled = !near;
    document.querySelector("#interaction-progress").style.width =
      `${near ? (state.interaction / near.duration) * 100 : 0}%`;
    if (state.role === "impostor") {
      const suspicion = state.travelers[state.impostor].suspicion;
      document.querySelector("#attention-progress").style.width =
        `${Math.min(100, (suspicion / 5) * 100)}%`;
      document.querySelector("#attention-label").textContent =
        suspicion > 2.4 ? "High" : suspicion > 1 ? "Rising" : "Low";
    }
  }
  if (state.phase === "ended") {
    const panel = document.querySelector("#result");
    if (panel.hidden) {
      panel.hidden = false;
      const summary = score(state),
        playerWon =
          state.role === "agent"
            ? summary.winner === "agent"
            : summary.winner === "impostor";
      panel.innerHTML = `<p class="eyebrow">BOARDING COMPLETE</p><h2>${summary.winner === "impostor" ? "The ducks made the flight." : "The suitcase went quack."}</h2><p>${state.role === "local" ? (summary.winner === "impostor" ? "Impostor wins." : "Security wins.") : playerWon ? "You win. A very normal day at Terminal Odd." : "Round lost. Try a different route or watch a little longer."}</p><span>${summary.objectives}/3 errands · ${summary.seconds}s · ${summary.inspections} inspections</span><div><button data-action="restart">Play again →</button><button data-action="home">Change roles</button></div>`;
      panel.querySelector("button").focus({ preventScroll: true });
    }
  }
}
app.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.start) {
    start(b.dataset.start);
    return;
  }
  if (b.dataset.walk) {
    const s = STATIONS.find((s) => s.id === b.dataset.walk);
    destination = { x: s.x, y: s.y };
    return;
  }
  if (b.dataset.action === "home") {
    home();
    return;
  }
  if (b.dataset.action === "inspect") {
    inspection();
    return;
  }
  if (b.dataset.action === "restart") {
    start(state.role);
    return;
  }
  if (b.dataset.action === "reveal") {
    const p = state.travelers[state.impostor];
    document.querySelector("#brief").innerHTML =
      `<p class="eyebrow">IMPOSTOR EYES ONLY</p><h2>You are traveler ${String(p.id + 1).padStart(2, "0")}.</h2><p>Find that number on the map. Your assignment will disappear when the round starts. Security may look again after you press Begin.</p><button data-action="begin-local">Hide assignment & begin →</button>`;
    return;
  }
  if (b.dataset.action === "begin-local") {
    document.querySelector("#brief").remove();
    localBrief = false;
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "traveler-select" && e.target.value !== "")
    selectTraveler(Number(e.target.value));
});
app.addEventListener("pointerdown", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.action === "interact") {
    held = true;
    b.setPointerCapture?.(e.pointerId);
  }
  if (b.dataset.dir) {
    e.preventDefault();
    destination = null;
    input.dx =
      b.dataset.dir === "left" ? -1 : b.dataset.dir === "right" ? 1 : 0;
    input.dy = b.dataset.dir === "up" ? -1 : b.dataset.dir === "down" ? 1 : 0;
    b.setPointerCapture?.(e.pointerId);
  }
});
window.addEventListener("pointerup", () => {
  held = false;
  input.dx = input.dy = 0;
});
window.addEventListener("pointercancel", () => {
  held = false;
  input.dx = input.dy = 0;
});
window.addEventListener("blur", () => {
  held = false;
  input.dx = input.dy = 0;
  keyboardHeld.clear();
});
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (
    state?.phase === "playing" &&
    state.role !== "agent" &&
    !localBrief &&
    [
      "a",
      "w",
      "s",
      "d",
      "arrowleft",
      "arrowright",
      "arrowup",
      "arrowdown",
      "e",
      " ",
      "shift",
    ].includes(key)
  ) {
    keyboardHeld.add(key);
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) =>
  keyboardHeld.delete(event.key.toLowerCase()),
);
if (import.meta.env.DEV)
  window.__airportDebug = () =>
    state
      ? {
          role: state.role,
          phase: state.phase,
          impostor: state.impostor,
          objectives: [...state.objectives],
          time: state.time,
          position: {
            x: state.travelers[state.impostor].x,
            y: state.travelers[state.impostor].y,
          },
          travelers: state.travelers.map((p) => ({
            id: p.id,
            x: p.x,
            y: p.y,
            stops: p.route,
          })),
          localBrief,
        }
      : null;
home();
