import { Vector3 } from "three";

// Piecewise rails follow the actual aisle and stair treads, without spline
// overshoot through shelves. Smoothstep supplies a quiet start and arrival.
export class CameraRail {
  constructor(camera) {
    this.camera = camera;
    this.active = null;
  }
  cancel() {
    if (this.active) {
      this.active.resolve(false);
      this.active = null;
    }
  }
  start(
    points,
    target,
    { duration = 2, reducedMotion = false, lookAlong = false } = {},
  ) {
    this.cancel();
    const route = [
      this.camera.position.clone(),
      ...points.map((point) => point.clone()),
    ];
    const distances = [0];
    for (let i = 1; i < route.length; i++)
      distances.push(distances[i - 1] + route[i].distanceTo(route[i - 1]));
    const end = route.at(-1);
    if (reducedMotion || distances.at(-1) < 0.001) {
      this.camera.position.copy(end);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      this.active = {
        route,
        distances,
        target: target.clone(),
        elapsed: 0,
        duration: Math.max(0.1, duration),
        fromDirection: this.camera.getWorldDirection(new Vector3()),
        lookAlong,
        resolve,
      };
    });
  }
  update(dt, reducedMotion = false) {
    const rail = this.active;
    if (!rail) return;
    rail.elapsed += Math.max(0, dt);
    const t = reducedMotion ? 1 : Math.min(1, rail.elapsed / rail.duration);
    const eased = t * t * (3 - 2 * t),
      distance = eased * rail.distances.at(-1);
    let segment = 1;
    while (
      segment < rail.distances.length - 1 &&
      distance > rail.distances[segment]
    )
      segment++;
    const span = rail.distances[segment] - rail.distances[segment - 1];
    const alpha =
      span > 0 ? (distance - rail.distances[segment - 1]) / span : 1;
    this.camera.position.lerpVectors(
      rail.route[segment - 1],
      rail.route[segment],
      alpha,
    );
    if (rail.lookAlong && t < 0.88) {
      const direction = rail.route[segment]
        .clone()
        .sub(rail.route[segment - 1])
        .normalize();
      direction.y *= 0.3;
      const blend = 1 - Math.exp(-Math.max(0, dt) * 8);
      direction
        .lerpVectors(
          this.camera.getWorldDirection(new Vector3()),
          direction,
          blend,
        )
        .normalize();
      this.camera.lookAt(this.camera.position.clone().add(direction));
    } else {
      if (rail.lookAlong && !rail.settleDirection)
        rail.settleDirection = this.camera.getWorldDirection(new Vector3());
      const finalDirection = rail.target
        .clone()
        .sub(this.camera.position)
        .normalize();
      const blend = rail.lookAlong ? Math.max(0, (t - 0.88) / 0.12) : eased;
      const direction = (rail.settleDirection ?? rail.fromDirection)
        .clone()
        .lerp(finalDirection, blend)
        .normalize();
      this.camera.lookAt(this.camera.position.clone().add(direction));
    }
    this.camera.updateMatrixWorld();
    if (t >= 1) {
      this.camera.position.copy(rail.route.at(-1));
      this.camera.lookAt(rail.target);
      this.camera.updateMatrixWorld();
      this.active = null;
      rail.resolve(true);
    }
  }
}
