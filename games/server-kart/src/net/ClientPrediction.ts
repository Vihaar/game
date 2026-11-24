import { FIXED_DT } from '../core/constants';
import { type Vec3, type WireInput, type WireKartState, type WireMove } from './protocol';

export interface PredictionAdapter {
  position(): Vec3;
  restore(state: WireKartState): void;
  simulate(input: WireInput, dt: number): void;
}
/** Rewinds the actual Kart solver to a host acknowledgement, then replays pending fixed moves. */
export class ClientPrediction {
  private history: WireMove[] = [];
  private sequence = 0;
  private sent = 0;
  private acknowledged = 0;
  ready = false;
  readonly visualOffset: Vec3 = { x: 0, y: 0, z: 0 };
  lastCorrection = 0;
  constructor(private readonly adapter: PredictionAdapter) {}
  get pendingCount(): number { return this.history.length; }
  get lastAcknowledged(): number { return this.acknowledged; }
  advance(input: WireInput): WireMove | null {
    if (!this.ready || this.history.length >= 240) return null;
    const move = { sequence: ++this.sequence, input: { ...input } }; this.history.push(move);
    this.adapter.simulate(move.input, FIXED_DT); return move;
  }
  unsent(): WireMove[] { return this.history.filter((m) => m.sequence > this.sent).slice(0, 24); }
  markSent(sequence: number): void { this.sent = Math.max(this.sent, sequence); }
  reconcile(state: WireKartState, acknowledgement: number): boolean {
    if (!state.physics || acknowledgement < this.acknowledged || acknowledgement > this.sequence) return false;
    const old = this.adapter.position();
    const rendered = { x: old.x + this.visualOffset.x, y: old.y + this.visualOffset.y, z: old.z + this.visualOffset.z };
    this.acknowledged = acknowledgement; this.history = this.history.filter((m) => m.sequence > acknowledgement);
    this.adapter.restore(state);
    if (state.finished) this.history = [];
    else for (const move of this.history) this.adapter.simulate(move.input, FIXED_DT);
    const corrected = this.adapter.position(); const delta = { x: rendered.x - corrected.x, y: rendered.y - corrected.y, z: rendered.z - corrected.z };
    this.lastCorrection = Math.hypot(delta.x, delta.y, delta.z);
    // Never ease a true respawn across the track. Ordinary small reconciliations
    // affect presentation only; the corrected simulation state is exact now.
    const smooth = this.ready && this.lastCorrection < 4;
    this.visualOffset.x = smooth ? delta.x : 0; this.visualOffset.y = smooth ? delta.y : 0; this.visualOffset.z = smooth ? delta.z : 0;
    this.ready = true; return true;
  }
  decayVisualOffset(dt: number): Vec3 {
    const decay = Math.exp(-18 * Math.max(0, dt));
    this.visualOffset.x *= decay; this.visualOffset.y *= decay; this.visualOffset.z *= decay; return this.visualOffset;
  }
}
