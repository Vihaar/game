/** Physics-only state needed to resume the existing Kart solver, separate from visual springs. */
export const physicsNumbers = ['lateralVel', 'vy', 'freeY', 'slip', 'groundVy', 'lastGroundY', 'absCharge', 'hopTimer', 'padCooldown', 'wallCooldown', 'frozenThrottleTime'] as const;
export interface KartPhysicsState {
  lateralVel: number; vy: number; freeY: number; slip: number; groundVy: number; lastGroundY: number;
  absCharge: number; hopTimer: number; padCooldown: number; wallCooldown: number; frozenThrottleTime: number;
  hasGroundSample: boolean; prevDriftHeld: boolean;
  groundNormal: { x: number; y: number; z: number };
  collisionCooldown: number[];
}
