import "./style.css";
import { DeliveryRun } from "./physics.js";
import {
  ROUND_SECONDS,
  FLOOR,
  WORLD_WIDTH,
  DELIVERY,
  ROLE_INFO,
  ROLES,
  cleanInput,
  HeldActions,
} from "./rules.js";
import { CoopRoom } from "./room.js";
const $ = (s) => document.querySelector(s),
  canvas = $("#game"),
  ctx = canvas.getContext("2d"),
  run = new DeliveryRun(),
  keys = new Set(),
  held = new HeldActions(),
  remote = new Map();
let mode = "solo",
  role = "legs",
  paused = false,
  shownResult = false,
  guestState = null,
  grabSeq = 0,
  jumpSeq = 0,
  ticks = 0;
const portrait = new Image();
portrait.src = "portraits/mike.webp";
const room = new CoopRoom(ROLES, {
  onStatus: (text) => {
    $("#network").textContent = text;
  },
  onRole: (value) => {
    role = value;
    $("#role").value = value;
    $("#start").disabled = true;
  },
  onLeave: () => {
    paused = true;
    $("#status").textContent = "Host left. Open Modes / room to play offline.";
  },
  onPacket: (packet, seat) => {
    if (room.isHost && packet.kind === "input") {
      remote.set(seat.role, {
        ...cleanInput(packet.input),
        at: performance.now(),
      });
    } else if (room.isHost && packet.kind === "rescue") {
      run.rescue();
    } else if (
      room.isGuest &&
      packet.kind === "state" &&
      packet.state &&
      Number.isFinite(packet.state.elapsed)
    ) {
      const previous = guestState;
      guestState = packet.state;
      if (guestState.phase === "playing") {
        if (
          previous?.phase !== "playing" ||
          guestState.elapsed < previous.elapsed
        ) {
          grabSeq = jumpSeq = 0;
          keys.clear();
          held.clear();
          send();
        }
        if ($("#menu").open) $("#menu").close();
        if ($("#result").open) $("#result").close();
        shownResult = false;
      }
    }
  },
});
function input() {
  return cleanInput({
    move:
      Number(keys.has("KeyD") || held.has("right")) -
      Number(keys.has("KeyA") || held.has("left")),
    tilt:
      Number(keys.has("ArrowRight") || held.has("tilt-right")) -
      Number(keys.has("ArrowLeft") || held.has("tilt-left")),
    grabSeq,
    jumpSeq,
  });
}
function send() {
  if (room.isGuest) room.send({ kind: "input", input: input() });
}
function start() {
  if (mode === "online" && !room.isHost) return;
  keys.clear();
  held.clear();
  grabSeq = jumpSeq = 0;
  remote.clear();
  run.reset();
  paused = false;
  shownResult = false;
  guestState = null;
  $("#result").close();
  $("#menu").close();
  $("#pause").textContent = "Pause";
}
function openMenu() {
  room.close();
  remote.clear();
  guestState = null;
  paused = true;
  $("#start").disabled = false;
  $("#result").close();
  if (!$("#menu").open) $("#menu").showModal();
}
function owners() {
  const occupied = new Set(mode === "shared" ? ROLES : [role]);
  if (room.isHost) for (const seat of room.peers()) occupied.add(seat.role);
  if (room.isGuest)
    for (const value of guestState?.humans ?? []) occupied.add(value);
  for (const value of ROLES) {
    $("#" + value + "-owner").textContent =
      mode === "shared"
        ? "HUMAN"
        : value === role
          ? "YOU"
          : occupied.has(value)
            ? "FRIEND"
            : "AI";
    for (const button of document.querySelectorAll("." + value + " button"))
      button.disabled = mode !== "shared" && value !== role;
  }
  $("#share").hidden = !room.code;
  $("#share").textContent = room.code
    ? "Room " + room.code + " · Copy"
    : "Copy room invite";
  $("#menu-button").textContent =
    room.isHost || room.isGuest ? "Leave / modes" : "Modes / room";
  $("#pause").disabled = room.isGuest;
}
function step(dt) {
  if (room.isGuest) return;
  if (paused) return;
  const controls = {};
  if (mode === "shared") for (const value of ROLES) controls[value] = input();
  else controls[role] = input();
  if (room.isHost)
    for (const seat of room.peers()) {
      const value = remote.get(seat.role);
      controls[seat.role] =
        value && performance.now() - value.at < 850 ? value : cleanInput();
    }
  run.step(dt, controls);
}
function result(state) {
  if (!["won", "lost"].includes(state.phase) || shownResult) return;
  shownResult = true;
  $("#result-title").textContent =
    state.phase === "won" ? "Delivered. Somehow." : "Your shift has expired.";
  $("#result-copy").textContent =
    state.phase === "won"
      ? `The sofa arrived in ${Math.ceil(state.elapsed)} seconds. ${state.rescues} emergency forklifts. Mike would like a union.`
      : "The sofa has requested a different moving company. Try again: AI covers empty roles, and Unstick rescues furniture for five seconds.";
  $("#again").disabled = room.isGuest;
  if (!$("#result").open) $("#result").showModal();
}
function draw() {
  const state = room.isGuest ? (guestState ?? run.snapshot()) : run.snapshot();
  const rect = canvas.getBoundingClientRect(),
    dpr = Math.min(1.5, devicePixelRatio || 1);
  if (
    canvas.width !== Math.round(rect.width * dpr) ||
    canvas.height !== Math.round(rect.height * dpr)
  ) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width,
    h = rect.height;
  ctx.fillStyle = "#93d1d9";
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w / 700, h / 510),
    vw = w / scale,
    cam = Math.max(0, Math.min(WORLD_WIDTH - vw, state.mike.x - 220)),
    dy = h / scale - FLOOR - 65;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cam, dy);
  for (let x = 0; x < WORLD_WIDTH; x += 180) {
    ctx.strokeStyle = "#74bbc8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 120, 150, 380);
    ctx.fillStyle = "#b9e1df";
    ctx.fillRect(x + 16, 135, 118, 12);
  }
  ctx.fillStyle = "#e7ad63";
  ctx.fillRect(-50, FLOOR, WORLD_WIDTH + 100, 100);
  ctx.fillStyle = "#22283c";
  ctx.fillRect(-50, FLOOR, WORLD_WIDTH + 100, 5);
  for (let x = 0; x < WORLD_WIDTH; x += 45) {
    ctx.strokeStyle = "#ca8e4f";
    ctx.beginPath();
    ctx.moveTo(x, FLOOR + 15);
    ctx.lineTo(x + 20, FLOOR + 70);
    ctx.stroke();
  }
  ctx.fillStyle = "#c4e396";
  ctx.fillRect(DELIVERY.left, FLOOR - 150, DELIVERY.right - DELIVERY.left, 150);
  ctx.strokeStyle = "#22283c";
  ctx.lineWidth = 4;
  ctx.strokeRect(
    DELIVERY.left,
    FLOOR - 150,
    DELIVERY.right - DELIVERY.left,
    150,
  );
  label("PUT SOFA HERE", 2290, FLOOR - 120, 22);
  for (const [x, i] of [650, 1100, 1580].map((x, i) => [x, i])) {
    ctx.beginPath();
    ctx.moveTo(x - 80, FLOOR);
    ctx.lineTo(x - 52, FLOOR - 32 - i * 6);
    ctx.lineTo(x + 52, FLOOR - 32 - i * 6);
    ctx.lineTo(x + 80, FLOOR);
    ctx.closePath();
    ctx.fillStyle = "#ffda62";
    ctx.fill();
    ctx.strokeStyle = "#22283c";
    ctx.stroke();
    label(
      ["TOTALLY FLAT", "SPEED HUMP?", "LAST MISTAKE"][i],
      x,
      FLOOR - 75,
      13,
    );
  }
  if (state.grip) {
    ctx.strokeStyle = "#22283c";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(state.mike.x + 18, state.mike.y - 18);
    ctx.quadraticCurveTo(
      (state.mike.x + state.sofa.x) / 2,
      state.mike.y - 25,
      state.sofa.x - 78,
      state.sofa.y - 20,
    );
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(state.sofa.x, state.sofa.y);
  ctx.rotate(state.sofa.angle);
  rounded(-105, -33, 210, 66, 12, "#ff91a7");
  rounded(-80, -20, 52, 35, 7, "#ffc0cc");
  rounded(-25, -20, 52, 35, 7, "#ffc0cc");
  rounded(30, -20, 52, 35, 7, "#ffc0cc");
  ctx.fillStyle = "#22283c";
  ctx.fillRect(-82, 30, 18, 10);
  ctx.fillRect(64, 30, 18, 10);
  label("OVERSIZED FEELINGS", 0, -43, 12);
  ctx.restore();
  ctx.save();
  ctx.translate(state.mike.x, state.mike.y);
  ctx.rotate(state.mike.angle);
  rounded(-22, -29, 44, 62, 10, "#59bfcf");
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#22283c";
  ctx.beginPath();
  ctx.moveTo(-11, 31);
  ctx.lineTo(-15, 46);
  ctx.moveTo(11, 31);
  ctx.lineTo(15, 46);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -51, 27, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe6b8";
  ctx.fill();
  ctx.stroke();
  if (portrait.complete && portrait.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -51, 25, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(portrait, -25, -76, 50, 50);
    ctx.restore();
  } else {
    ctx.fillStyle = "#22283c";
    ctx.fillRect(-10, -58, 5, 5);
    ctx.fillRect(6, -58, 5, 5);
  }
  label("MIKE", 0, -88, 15);
  ctx.restore();
  ctx.restore();
  $("#time").textContent =
    Math.max(0, Math.ceil(ROUND_SECONDS - state.elapsed)) + "s";
  $("#grip").textContent = state.grip ? "ARMS: CONNECTED" : "ARMS: ON BREAK";
  $("#progress").textContent =
    "SOFA " +
    Math.min(100, Math.max(0, Math.floor((state.sofa.x - 270) / 20))) +
    "% →";
  $("#status").textContent = state.sneeze
    ? "MIKE SNEEZES IN " + state.sneeze + "…"
    : paused || state.paused
      ? "SHIFT PAUSED"
      : state.message;
  owners();
  result(state);
}
function rounded(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#22283c";
  ctx.lineWidth = 3;
  ctx.stroke();
}
function label(text, x, y, size) {
  ctx.font = `900 ${size}px 'Trebuchet MS',sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#22283c";
  ctx.fillText(text, x, y);
}
for (const button of document.querySelectorAll("[data-hold]")) {
  const value = button.dataset.hold;
  button.onpointerdown = (e) => {
    button.setPointerCapture(e.pointerId);
    held.hold(e.pointerId, value);
    send();
  };
  button.onpointerup =
    button.onpointercancel =
    button.onlostpointercapture =
      (e) => {
        held.release(e.pointerId);
        send();
      };
}
$("#jump").onclick = () => {
  jumpSeq++;
  send();
};
$("#grab").onclick = () => {
  grabSeq++;
  send();
};
$("#rescue").onclick = () => {
  if (room.isGuest) room.send({ kind: "rescue" });
  else run.rescue();
};
$("#pause").onclick = () => {
  if (room.isGuest) return;
  paused = !paused;
  $("#pause").textContent = paused ? "Resume" : "Pause";
};
$("#share").onclick = async () => {
  const link = new URL(location.href);
  link.searchParams.set("room", room.code);
  try {
    await navigator.clipboard.writeText(link.href);
    $("#network").textContent = "Invite copied. Keep the host tab open.";
  } catch {
    $("#network").textContent = "Share this code: " + room.code;
  }
};
$("#start").onclick = () => {
  mode = $("#mode").value;
  role = $("#role").value;
  start();
};
$("#again").onclick = start;
$("#result-menu").onclick = openMenu;
$("#menu-button").onclick = openMenu;
$("#mode").onchange = () => {
  $("#online").hidden = $("#mode").value !== "online";
};
$("#host").onclick = () => {
  mode = "online";
  role = $("#role").value;
  room.host(role);
};
$("#join").onclick = () => {
  mode = "online";
  role = $("#role").value;
  room.join($("#code").value, role);
};
const inputCode = (e) =>
  ({ a: "KeyA", d: "KeyD", f: "KeyF", " ": "Space" })[e.key?.toLowerCase()] ||
  e.code ||
  e.key;
window.addEventListener("keydown", (e) => {
  const code = inputCode(e);
  if (e.target.matches("input,select")) return;
  if (
    ["Space", "ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyF"].includes(
      code,
    ) &&
    !$("#menu").open
  ) {
    e.preventDefault();
    if (!e.repeat) {
      if (code === "Space") jumpSeq++;
      if (code === "KeyF") grabSeq++;
    }
    keys.add(code);
    send();
  }
});
window.addEventListener("keyup", (e) => {
  keys.delete(inputCode(e));
  send();
});
window.addEventListener("blur", () => {
  keys.clear();
  held.clear();
  send();
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  held.clear();
  send();
});
const code = new URL(location.href).searchParams.get("room");
if (code) {
  $("#mode").value = "online";
  $("#online").hidden = false;
  $("#code").value = code;
}
$("#menu").showModal();
let previous = performance.now(),
  acc = 0;
function frame(now) {
  const delta = document.hidden ? 0 : Math.min(0.05, (now - previous) / 1000);
  previous = now;
  acc += delta;
  while (acc >= 1 / 60) {
    step(1 / 60);
    acc -= 1 / 60;
    if (++ticks % 4 === 0 && room.isHost)
      room.broadcast({
        kind: "state",
        state: {
          ...run.snapshot(),
          paused,
          humans: [role, ...room.peers().map((seat) => seat.role)],
        },
      });
  }
  if (ticks % 3 === 0) send();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.DEV)
  window.__brainDebug = () => ({
    mode,
    role,
    room: room.code,
    isHost: room.isHost,
    isGuest: room.isGuest,
    seats: room.peers(),
    state: room.isGuest ? guestState : run.snapshot(),
  });
