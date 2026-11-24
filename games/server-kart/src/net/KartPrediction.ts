import { createEmptyInput, type ITrack } from '../core/types';
import { events } from '../core/events';
import type { Kart } from '../kart/Kart';
import { ClientPrediction } from './ClientPrediction';
import { kartNumbers, kartBooleans, type WireKartState } from './protocol';

/** Uses the upstream Kart solver itself; no second movement/steering implementation. */
export function createKartPrediction(kart: Kart, track: ITrack, reverseSteering: () => boolean): ClientPrediction {
  return new ClientPrediction({
    position: () => kart.state.position,
    restore: (wire: WireKartState) => {
      const s = kart.state, target = s as unknown as Record<string, unknown>;
      for (const field of kartNumbers) target[field] = wire[field];
      for (const field of kartBooleans) target[field] = wire[field];
      s.item = wire.item as typeof s.item; s.surface = wire.surface as typeof s.surface;
      s.position.set(wire.position.x, wire.position.y, wire.position.z); s.velocity.set(wire.velocity.x, wire.velocity.y, wire.velocity.z);
      s.quaternion.set(wire.quaternion.x, wire.quaternion.y, wire.quaternion.z, wire.quaternion.w);
      kart.restorePhysics(wire.physics!);
    },
    simulate: (input, dt) => {
      events.withoutEmitting(() => {
        kart.setInput({ ...createEmptyInput(), ...input, steer: reverseSteering() ? -input.steer : input.steer });
        // Only the static track is predicted. Authority resolves other racers,
        // item hits/pickups and race/checkpoint progression, then corrects us.
        kart.update(dt, track, []);
      });
    },
  });
}
