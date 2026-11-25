export const ROUND_SECONDS = 90,
  FLOOR = 650,
  WORLD_WIDTH = 2460;
export const ROLES = ["legs", "arms", "balance"];
export class HeldActions {
  constructor() {
    this.pointers = new Map();
  }
  hold(pointerId, action) {
    this.pointers.set(pointerId, action);
  }
  release(pointerId) {
    this.pointers.delete(pointerId);
  }
  has(action) {
    return [...this.pointers.values()].includes(action);
  }
  clear() {
    this.pointers.clear();
  }
}
export const ROLE_INFO = {
  legs: { name: "Torin", job: "LEGS", keys: "A / D", color: "#7dd9ec" },
  arms: {
    name: "Jonah",
    job: "ARMS",
    keys: "F — grab / drop",
    color: "#ff987a",
  },
  balance: {
    name: "Grant",
    job: "BALANCE",
    keys: "Space + ← / →",
    color: "#c4adf1",
  },
};
export const DELIVERY = { left: 2160, right: 2425, top: 490, bottom: 655 };
export function delivered(bounds) {
  return (
    bounds.min.x >= DELIVERY.left &&
    bounds.max.x <= DELIVERY.right &&
    bounds.min.y >= DELIVERY.top &&
    bounds.max.y <= DELIVERY.bottom
  );
}
export function cleanInput(value = {}) {
  return {
    move: Number(value.move) > 0 ? 1 : Number(value.move) < 0 ? -1 : 0,
    tilt: Number(value.tilt) > 0 ? 1 : Number(value.tilt) < 0 ? -1 : 0,
    jumpSeq: Math.max(0, Math.min(1e8, Math.trunc(Number(value.jumpSeq) || 0))),
    grabSeq: Math.max(0, Math.min(1e8, Math.trunc(Number(value.grabSeq) || 0))),
  };
}
export function checkpoint(x) {
  return Math.max(120, Math.min(1900, Math.floor((x - 150) / 450) * 450 + 120));
}
export const safeNumber = (value) =>
  Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0;
