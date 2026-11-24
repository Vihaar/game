/*
 * First-person movement adapted from Three.js r181 examples/games_fps.html.
 * Copyright © 2010–2025 three.js authors. MIT; see vendor/upstream/THREE-LICENSE.txt.
 * Reuses the example's Capsule/Octree collisions, damping, directional movement,
 * five substeps, and pointer-look pattern. Original example is retained in vendor.
 */
import { Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { moveCapsule } from './spatial.mjs';

export class Player {
  constructor(camera, octrees, canvas, canMove, pointerFree = () => false) {
    this.camera = camera;
    this.octrees = octrees;
    this.canvas = canvas;
    this.canMove = canMove;
    this.collider = new Capsule(new Vector3(0, 0.35, 8), new Vector3(0, 1.6, 8), 0.35);
    this.velocity = new Vector3();
    this.direction = new Vector3();
    this.keys = {};
    this.onFloor = false;
    this.speedScale = 1;
    this.dashCooldown = 0;
    this.dashRemaining = 0;
    this.dashDirection = new Vector3();
    this.dashRecharge = 3;
    camera.rotation.order = 'YXZ';
    document.addEventListener('keydown', event => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
      this.keys[event.code] = true;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code) && canMove()) event.preventDefault();
      if (event.code === 'Space' && !event.repeat) this.dodge();
    });
    document.addEventListener('keyup', event => { this.keys[event.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('click', () => { if (canMove() && !pointerFree()) canvas.requestPointerLock()?.catch?.(() => {}); });
    document.addEventListener('mousemove', event => {
      if (document.pointerLockElement === canvas && canMove()) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x - event.movementY / 500));
      }
    });
    document.addEventListener('pointerlockchange', () => { this.keys = {}; });
  }

  reset(x = 0, z = 8) {
    this.collider.start.set(x, 0.35, z);
    this.collider.end.set(x, 1.6, z);
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.collider.end);
    this.camera.rotation.set(0, 0, 0);
    this.keys = {};
    this.dashCooldown = 0; this.dashRemaining = 0;
  }

  forward() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    return this.direction.normalize();
  }

  side() { return this.forward().cross(this.camera.up); }

  dodge() {
    if (!this.canMove() || this.dashCooldown > 0) return false;
    const direction = new Vector3();
    if (this.keys.KeyW || this.keys.ArrowUp) direction.add(this.forward());
    if (this.keys.KeyS || this.keys.ArrowDown) direction.sub(this.forward());
    if (this.keys.KeyD) direction.add(this.side());
    if (this.keys.KeyA) direction.sub(this.side());
    if (direction.lengthSq() < 0.1) direction.copy(this.forward());
    this.dashDirection.copy(direction.normalize()); this.dashRemaining = 0.18; this.dashCooldown = this.dashRecharge;
    return true;
  }

  update(deltaTime) {
    this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime);
    if (!this.canMove()) { this.velocity.set(0, 0, 0); return; }
    if (this.keys.ArrowLeft) this.camera.rotation.y += deltaTime * 1.7;
    if (this.keys.ArrowRight) this.camera.rotation.y -= deltaTime * 1.7;
    for (let step = 0; step < 5; step++) {
      const delta = deltaTime / 5;
      const speedDelta = delta * (this.onFloor ? 22 : 8) * this.speedScale;
      if (this.keys.KeyW || this.keys.ArrowUp) this.velocity.addScaledVector(this.forward(), speedDelta);
      if (this.keys.KeyS || this.keys.ArrowDown) this.velocity.addScaledVector(this.forward(), -speedDelta);
      if (this.keys.KeyA) this.velocity.addScaledVector(this.side(), -speedDelta);
      if (this.keys.KeyD) this.velocity.addScaledVector(this.side(), speedDelta);
      let damping = Math.exp(-4 * delta) - 1;
      if (!this.onFloor) { this.velocity.y -= 30 * delta; damping *= 0.1; }
      this.velocity.addScaledVector(this.velocity, damping);
      const movement = this.velocity.clone().multiplyScalar(delta);
      if (this.dashRemaining > 0) { movement.addScaledVector(this.dashDirection, delta * 14); this.dashRemaining = Math.max(0, this.dashRemaining - delta); }
      this.onFloor = false;
      moveCapsule(this.collider, movement, this.octrees(), result => {
        if (result.normal.y > 0.5) { this.onFloor = true; this.velocity.y = Math.max(0, this.velocity.y); }
        else if (result.normal.dot(this.velocity) < 0) this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
      });
      this.camera.position.copy(this.collider.end);
    }
    if (this.camera.position.y < -5) this.reset();
  }
}
