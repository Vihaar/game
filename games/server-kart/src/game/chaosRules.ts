/** Original server-event timing; the racing simulation stays in the upstream engine. */
export const CHAOS_EVENTS = [
  { id: 'cheese', title: 'CHEESE TAX', warning: 'The leader owes cheese in 3 seconds.', duration: 2.8 },
  { id: 'mic', title: 'MIC CHECK', warning: 'Everyone is about to peak. Brace in 3 seconds.', duration: 2.4 },
  { id: 'lag', title: 'LAG SWITCH', warning: 'Left becomes right in 3 seconds. Briefly.', duration: 2.2 },
  { id: 'admin', title: 'EVERYONE IS ADMIN', warning: 'Terrible permissions update in 3 seconds.', duration: 3.5 },
] as const;

export type ChaosEvent = (typeof CHAOS_EVENTS)[number];
export type ChaosSignal = { kind: 'warning' | 'fire'; event: ChaosEvent; index: number };

export class ChaosClock {
  elapsed = 0;
  private next = 14;
  private index = 0;
  private warned = false;

  advance(dt: number): ChaosSignal[] {
    if (!Number.isFinite(dt) || dt <= 0) return [];
    this.elapsed += Math.min(dt, 0.1);
    const event = CHAOS_EVENTS[this.index % CHAOS_EVENTS.length];
    const out: ChaosSignal[] = [];
    if (!this.warned && this.elapsed >= this.next - 3) {
      this.warned = true;
      out.push({ kind: 'warning', event, index: this.index });
    }
    if (this.elapsed >= this.next) {
      out.push({ kind: 'fire', event, index: this.index });
      this.index++;
      this.next += 19;
      this.warned = false;
    }
    return out;
  }
}

export function chooseTaxTargets<T extends { place: number; finished: boolean; isInvincible: boolean }>(states: readonly T[]): {leader?: T; last?: T} {
  const eligible = states.filter(s => !s.finished);
  const leader = eligible.filter(s => !s.isInvincible).sort((a,b) => a.place-b.place)[0];
  const last = eligible.filter(s => s !== leader).sort((a,b) => b.place-a.place)[0];
  return {leader,last};
}
