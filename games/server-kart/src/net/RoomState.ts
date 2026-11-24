import { emptyWireInput, INPUT_TIMEOUT_MS, MAX_RACERS, type PlayerProfile, type RoomPlayer, type WireInput } from './protocol';

/** Stable, host-assigned slots. A departed guest releases exactly their former AI slot. */
export class RoomRoster {
  private players = new Map<string, RoomPlayer>();
  constructor(hostPeerId: string, profile: PlayerProfile) { this.players.set(hostPeerId, { ...profile, slot: 0, peerId: hostPeerId }); }
  list(): RoomPlayer[] { return [...this.players.values()].sort((a, b) => a.slot - b.slot).map((p) => ({ ...p })); }
  get(peerId: string): RoomPlayer | undefined { const p = this.players.get(peerId); return p ? { ...p } : undefined; }
  add(peerId: string, profile: PlayerProfile): RoomPlayer | null {
    const existing = this.get(peerId); if (existing) return existing;
    if (this.players.size >= MAX_RACERS) return null;
    const occupied = new Set(this.list().map((p) => p.slot));
    let slot = 1; while (occupied.has(slot)) slot++;
    const player = { ...profile, peerId, slot }; this.players.set(peerId, player); return { ...player };
  }
  update(peerId: string, profile: PlayerProfile): boolean {
    const player = this.players.get(peerId); if (!player) return false;
    this.players.set(peerId, { ...player, ...profile }); return true;
  }
  remove(peerId: string): RoomPlayer | null {
    const player = this.players.get(peerId); if (!player || player.slot === 0) return null;
    this.players.delete(peerId); return { ...player };
  }
}

/** Bounded token bucket; invalid/flooding packets never reach gameplay callbacks. */
export class MessageRateLimit {
  private tokens: number;
  private last: number;
  constructor(private readonly perSecond = 60, private readonly burst = 15, now = performance.now()) { this.tokens = burst; this.last = now; }
  accept(now = performance.now()): boolean {
    this.tokens = Math.min(this.burst, this.tokens + Math.max(0, now - this.last) * this.perSecond / 1000); this.last = Math.max(this.last, now);
    if (this.tokens < 1) return false; this.tokens--; return true;
  }
}

/** Stale/duplicate packets are ignored; disconnect/lost focus cannot leave a throttle stuck. */
export class RemoteInputBuffer {
  private entries = new Map<number, { sequence: number; time: number; input: WireInput }>();
  put(slot: number, sequence: number, input: WireInput, now = performance.now()): boolean {
    const old = this.entries.get(slot); if (old && sequence <= old.sequence) return false;
    this.entries.set(slot, { sequence, time: now, input: { ...input, useItem: input.useItem || Boolean(old && now - old.time <= INPUT_TIMEOUT_MS && old.input.useItem) } }); return true;
  }
  consume(slot: number, now = performance.now()): WireInput {
    const entry = this.entries.get(slot); if (!entry || now - entry.time > INPUT_TIMEOUT_MS) return emptyWireInput();
    const result = { ...entry.input }; entry.input.useItem = false; return result;
  }
  remove(slot: number): void { this.entries.delete(slot); }
  clear(): void { this.entries.clear(); }
}
