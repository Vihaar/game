import { FIXED_DT } from '../core/constants';
import { INPUT_TIMEOUT_MS, type WireMove } from './protocol';

interface Stream { received: number; acknowledged: number; queue: WireMove[]; credit: number; lastPacket: number }
/** Host-issued fixed-tick credit, never client-supplied dt. Bursts cannot accelerate a racer. */
export class RemoteMoveStreams {
  private streams = new Map<number, Stream>();
  put(slot: number, moves: readonly WireMove[], now = performance.now()): void {
    let stream = this.streams.get(slot);
    if (!stream) { stream = { received: 0, acknowledged: 0, queue: [], credit: 0, lastPacket: now }; this.streams.set(slot, stream); }
    stream.lastPacket = now;
    for (const move of moves) {
      if (move.sequence <= stream.received) continue;
      stream.received = move.sequence; stream.queue.push({ sequence: move.sequence, input: { ...move.input } });
    }
    // After a lengthy stall, discard obsolete controls rather than replaying old
    // throttle for seconds. Ack includes these deliberately discarded commands.
    while (stream.queue.length > 48) stream.acknowledged = Math.max(stream.acknowledged, stream.queue.shift()!.sequence);
  }
  active(slot: number): boolean { return this.streams.has(slot); }
  take(slot: number, dt: number): WireMove[] {
    const stream = this.streams.get(slot); if (!stream) return [];
    stream.credit = Math.min(12, stream.credit + Math.max(0, Math.min(dt, .1)) / FIXED_DT);
    const count = Math.min(stream.queue.length, Math.floor(stream.credit + 1e-6)); stream.credit -= count;
    return stream.queue.splice(0, count);
  }
  processed(slot: number, sequence: number): void { const stream = this.streams.get(slot); if (stream) stream.acknowledged = Math.max(stream.acknowledged, sequence); }
  acknowledgements(): number[] { return Array.from({ length: 8 }, (_, slot) => this.streams.get(slot)?.acknowledged ?? 0); }
  stale(slot: number, now = performance.now()): boolean { const s = this.streams.get(slot); return !s || now - s.lastPacket > INPUT_TIMEOUT_MS; }
  remove(slot: number): void { this.streams.delete(slot); }
  clear(): void { this.streams.clear(); }
}
