/** Matter engine/body/constraint conventions adapted from the retained MIT
 * compound/manipulation examples and this repository's soup engine. */
import Matter from "matter-js";
import {
  ROUND_SECONDS,
  FLOOR,
  WORLD_WIDTH,
  DELIVERY,
  delivered,
  checkpoint,
  safeNumber,
} from "./rules.js";
const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;
export class DeliveryRun {
  constructor() {
    this.engine = Engine.create({
      positionIterations: 8,
      velocityIterations: 8,
    });
    this.engine.gravity.y = 1;
    this.reset(false);
  }
  reset(start = true) {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.elapsed = 0;
    this.phase = start ? "playing" : "waiting";
    this.rescues = 0;
    this.stable = 0;
    this.lastJump = -2;
    this.lastGrab = 0;
    this.lastJumpSeq = 0;
    this.message = "One Mike. Three departments. Zero coordination.";
    this.solids = [
      Bodies.rectangle(WORLD_WIDTH / 2, FLOOR + 35, WORLD_WIDTH + 120, 70, {
        isStatic: true,
        friction: 0.5,
      }),
      Bodies.rectangle(-30, 350, 60, 900, { isStatic: true }),
      Bodies.rectangle(WORLD_WIDTH + 5, 350, 70, 900, { isStatic: true }),
    ];
    this.bumps = [650, 1100, 1580].map((x, i) =>
      Bodies.trapezoid(x, FLOOR - 16 - i * 3, 160, 32 + i * 6, 0.35, {
        isStatic: true,
        friction: 0.35,
        label: "foam-bump",
      }),
    );
    this.solids.push(...this.bumps);
    const torso = Bodies.rectangle(125, FLOOR - 50, 42, 60, {
        chamfer: { radius: 10 },
      }),
      head = Bodies.circle(125, FLOOR - 92, 22);
    head.label = "head";
    this.mike = Body.create({
      parts: [torso, head],
      density: 0.003,
      friction: 0.65,
      frictionAir: 0.035,
      restitution: 0.03,
    });
    Body.setInertia(this.mike, this.mike.inertia * 3);
    this.sofa = Bodies.rectangle(270, FLOOR - 49, 210, 65, {
      chamfer: { radius: 12 },
      density: 0.0007,
      friction: 0.27,
      frictionAir: 0.018,
      restitution: 0.08,
    });
    Composite.add(this.engine.world, [...this.solids, this.mike, this.sofa]);
    this.grip = null;
    this.attach();
    return this;
  }
  attach() {
    if (this.grip) return;
    this.grip = Constraint.create({
      bodyA: this.mike,
      pointA: { x: 18, y: -18 },
      bodyB: this.sofa,
      pointB: { x: -78, y: -20 },
      length: 64,
      stiffness: 0.09,
      damping: 0.16,
    });
    Composite.add(this.engine.world, this.grip);
  }
  toggle() {
    if (this.grip) {
      Composite.remove(this.engine.world, this.grip);
      this.grip = null;
      this.message = "Jonah has invented dropping things.";
    } else if (
      Math.hypot(
        this.mike.position.x - this.sofa.position.x,
        this.mike.position.y - this.sofa.position.y,
      ) < 230
    ) {
      this.attach();
      this.message = "The arms department has rejoined the company.";
    } else this.message = "Too far away! Get Mike near the sofa first.";
  }
  rescue() {
    if (this.phase !== "playing") return;
    const x = checkpoint(Math.min(this.mike.position.x, this.sofa.position.x));
    for (const [body, offset] of [
      [this.mike, 0],
      [this.sofa, 145],
    ]) {
      Body.setPosition(body, { x: x + offset, y: FLOOR - 100 });
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngle(body, 0);
      Body.setAngularVelocity(body, 0);
    }
    this.attach();
    this.elapsed += 5;
    this.rescues++;
    this.message = "Emergency forklift. Five seconds added to your shame.";
  }
  jump() {
    if (this.elapsed - this.lastJump < 0.85) return;
    const touching = (body) =>
      Query.collides(body, this.solids).length > 0 ||
      Query.ray(
        this.solids,
        { x: body.position.x, y: body.bounds.max.y - 3 },
        { x: body.position.x, y: body.bounds.max.y + 14 },
        22,
      ).length > 0;
    const grounded =
      touching(this.mike) ||
      (this.grip && Math.abs(this.sofa.velocity.y) < 1 && touching(this.sofa));
    if (!grounded) return;
    Body.setVelocity(this.mike, { x: this.mike.velocity.x, y: -8.4 });
    if (this.grip)
      Body.setVelocity(this.sofa, { x: this.sofa.velocity.x, y: -6.5 });
    this.lastJump = this.elapsed;
    this.message = "Grant has pressed the airborne furniture button.";
  }
  step(dt, controls = {}) {
    if (this.phase !== "playing") return;
    this.elapsed += dt;
    const legs = controls.legs,
      arms = controls.arms,
      balance = controls.balance;
    if (arms) {
      if (arms.grabSeq !== this.lastGrab) {
        this.lastGrab = arms.grabSeq;
        this.toggle();
      }
    } else if (
      !this.grip &&
      Math.abs(this.mike.position.x - this.sofa.position.x) < 210
    )
      this.attach();
    const move = legs
      ? legs.move
      : this.grip
        ? 1
        : Math.sign(this.sofa.position.x - this.mike.position.x - 130);
    Body.applyForce(this.mike, this.mike.position, {
      x: move * this.mike.mass * 0.00075,
      y: 0,
    });
    if (!move)
      Body.setVelocity(this.mike, {
        x: this.mike.velocity.x * 0.86,
        y: this.mike.velocity.y,
      });
    if (Math.abs(this.mike.velocity.x) > 2.9)
      Body.setVelocity(this.mike, {
        x: Math.sign(this.mike.velocity.x) * 2.9,
        y: this.mike.velocity.y,
      });
    if (this.grip) {
      Body.applyForce(this.sofa, this.sofa.position, {
        x: move * this.sofa.mass * 0.00065,
        y: 0,
      });
      if (Math.abs(this.sofa.velocity.x) > 3.2)
        Body.setVelocity(this.sofa, {
          x: Math.sign(this.sofa.velocity.x) * 3.2,
          y: this.sofa.velocity.y,
        });
    }
    Body.setAngularVelocity(
      this.mike,
      this.mike.angularVelocity * 0.72 - this.mike.angle * 0.052,
    );
    if (balance) {
      if (balance.jumpSeq !== this.lastJumpSeq) {
        this.lastJumpSeq = balance.jumpSeq;
        this.jump();
      }
      if (balance.tilt)
        Body.setAngularVelocity(
          this.sofa,
          Math.max(
            -0.075,
            Math.min(0.075, this.sofa.angularVelocity + balance.tilt * 0.009),
          ),
        );
    } else {
      Body.setAngularVelocity(
        this.sofa,
        this.sofa.angularVelocity * 0.88 - this.sofa.angle * 0.035,
      );
      if (
        this.grip &&
        this.bumps.some(
          (b) =>
            this.sofa.bounds.max.x > b.bounds.min.x - 50 &&
            this.sofa.bounds.min.x < b.bounds.max.x + 25,
        )
      )
        this.jump();
    }
    const sneeze = this.elapsed % 14;
    if (sneeze > 13 && this.grip) {
      Body.applyForce(this.sofa, this.sofa.position, {
        x: Math.sin(this.elapsed * 18) * 0.00004 * this.sofa.mass,
        y: -0.00003 * this.sofa.mass,
      });
      this.message = "MIKE SNEEZED. The sofa is emotionally fine.";
    }
    Engine.update(this.engine, dt * 1000);
    if (this.mike.position.y > 900 || this.sofa.position.y > 900) this.rescue();
    this.stable =
      delivered(this.sofa.bounds) && Math.abs(this.sofa.velocity.x) < 3
        ? this.stable + dt
        : 0;
    if (this.stable > 0.55) {
      this.phase = "won";
      this.message = "Sofa delivered. HR has several questions.";
    } else if (this.elapsed >= ROUND_SECONDS - 1e-6) {
      this.phase = "lost";
      this.message = "Shift over. The sofa is still technically outside.";
    }
  }
  snapshot() {
    const pose = (b) => ({
      x: safeNumber(b.position.x),
      y: safeNumber(b.position.y),
      angle: safeNumber(b.angle),
    });
    return {
      phase: this.phase,
      elapsed: safeNumber(this.elapsed),
      mike: pose(this.mike),
      sofa: pose(this.sofa),
      grip: !!this.grip,
      rescues: this.rescues,
      message: this.message,
      sneeze:
        this.elapsed % 14 > 11 && this.elapsed % 14 < 13
          ? Math.ceil(13 - (this.elapsed % 14))
          : 0,
    };
  }
  dispose() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
