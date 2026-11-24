export interface LapApproach {
  lap: number; trackT: number; checkpointIndex: number; speed: number; raceProgress: number;
  finished: boolean; wrongWay: boolean;
}

/** Trigger once per valid lap approach, never on the starting grid or while reversing. */
export class LapCheckoutGate {
  private readonly seen = new Set<number>();
  shouldShow(s: LapApproach, raceTime: number): boolean {
    if (s.finished || s.wrongWay || raceTime < 10 || s.speed < 1 || s.lap < 1 ||
        s.checkpointIndex !== 0 || s.raceProgress < s.lap - 1 + 0.9 || s.trackT < 0.94 || s.trackT >= 1 || this.seen.has(s.lap)) return false;
    this.seen.add(s.lap);
    return true;
  }
}
