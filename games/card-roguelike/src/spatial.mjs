import { Vector3, Ray } from 'three';

export const flatDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Locked attack footprints never chase the player after their windup starts. */
export function circleHits(point, center, radius, bodyRadius = 0.32) {
  return flatDistance(point, center) <= radius + bodyRadius;
}

export function coneHits(point, origin, target, reach, halfAngle = 0.75, bodyRadius = 0.32) {
  const distance = flatDistance(point, origin);
  if (distance > reach + bodyRadius) return false;
  if (distance < bodyRadius) return true;
  const ax = target.x - origin.x, az = target.z - origin.z;
  const bx = point.x - origin.x, bz = point.z - origin.z;
  const cosine = (ax * bx + az * bz) / Math.max(0.00001, Math.hypot(ax, az) * distance);
  return cosine >= Math.cos(halfAngle + Math.asin(Math.min(1, bodyRadius / distance)));
}

export function segmentHits(point, a, b, radius) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / Math.max(0.000001, dx * dx + dz * dz)));
  return Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) <= radius;
}

/** Uses the existing Three.js Octree collision implementation for both actors. */
export function moveCapsule(capsule, delta, octrees, onCollision = () => {}) {
  capsule.translate(delta);
  for (let pass = 0; pass < 2; pass++) for (const octree of octrees) {
    const result = octree.capsuleIntersect(capsule);
    if (result && result.depth > 0.000001) { onCollision(result); capsule.translate(result.normal.multiplyScalar(result.depth)); }
  }
  return capsule;
}

export function hasLineOfSight(from, to, octrees, endpointTolerance = 0.1) {
  const start = new Vector3(from.x, from.y ?? 1.05, from.z);
  const end = new Vector3(to.x, to.y ?? 1.05, to.z);
  const distance = start.distanceTo(end);
  if (distance < 1e-8) return true;
  const ray = new Ray(start, end.sub(start).normalize());
  return octrees.every(tree => { const hit = tree.rayIntersect(ray); return !hit || hit.distance >= distance - endpointTolerance; });
}

export const segmentUnobstructed = (from, to, octrees) => hasLineOfSight(from, to, octrees, 0.00001);

export function lockedTell(actorPosition, playerPosition, pattern, radius, reach) {
  return { origin: { x: actorPosition.x, z: actorPosition.z }, target: { x: playerPosition.x, z: playerPosition.z }, pattern, radius, reach };
}

export function tellHits(tell, playerPosition) {
  if (tell.pattern === 'cleave') return coneHits(playerPosition, tell.origin, tell.target, tell.reach, 0.75, 0);
  if (tell.pattern === 'ring') return circleHits(playerPosition, tell.origin, tell.radius, 0);
  return circleHits(playerPosition, tell.target, tell.radius, 0);
}
