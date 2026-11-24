/*
 * First-person movement adapted from Three.js r181 examples/games_fps.html.
 * Copyright © 2010–2025 three.js authors. MIT; see vendor/upstream/THREE-LICENSE.txt.
 * Reuses the example's Capsule/Octree collisions, damping, directional movement,
 * five substeps, and pointer-look pattern. Original example is retained in vendor.
 */
import { Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

export class Player {
  constructor(camera, worldOctree, canvas, canMove) {
    this.camera = camera;
    this.worldOctree = worldOctree;
    this.canvas = canvas;
    this.canMove = canMove;
    this.collider = new Capsule(new Vector3(0, 0.35, 8), new Vector3(0, 1.6, 8), 0.35);
    this.velocity = new Vector3();
    this.direction = new Vector3();
    this.keys = {};
    this.onFloor = false;
    camera.rotation.order = 'YXZ';
    document.addEventListener('keydown', event => { this.keys[event.code] = true; if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code) && !document.querySelector('dialog[open]')) event.preventDefault(); });
    document.addEventListener('keyup', event => { this.keys[event.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('click', () => { if (canMove()) canvas.requestPointerLock()?.catch?.(() => {}); });
    document.addEventListener('mousemove', event => {
      if (document.pointerLockElement === canvas && canMove()) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x - event.movementY / 500));
      }
    });
    document.addEventListener('pointerlockchange', () => { this.keys = {}; });
  }

  reset() {
    this.collider.start.set(0, 0.35, 8);
    this.collider.end.set(0, 1.6, 8);
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.collider.end);
    this.camera.rotation.set(0, 0, 0);
    this.keys = {};
  }

  forward() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    return this.direction.normalize();
  }

  side() { return this.forward().cross(this.camera.up); }

  update(deltaTime) {
    if (!this.canMove()) { this.velocity.set(0, 0, 0); return; }
    if (this.keys.ArrowLeft) this.camera.rotation.y += deltaTime * 1.7;
    if (this.keys.ArrowRight) this.camera.rotation.y -= deltaTime * 1.7;
    for (let step = 0; step < 5; step++) {
      const delta = deltaTime / 5;
      const speedDelta = delta * (this.onFloor ? 22 : 8);
      if (this.keys.KeyW || this.keys.ArrowUp) this.velocity.addScaledVector(this.forward(), speedDelta);
      if (this.keys.KeyS || this.keys.ArrowDown) this.velocity.addScaledVector(this.forward(), -speedDelta);
      if (this.keys.KeyA) this.velocity.addScaledVector(this.side(), -speedDelta);
      if (this.keys.KeyD) this.velocity.addScaledVector(this.side(), speedDelta);
      let damping = Math.exp(-4 * delta) - 1;
      if (!this.onFloor) { this.velocity.y -= 30 * delta; damping *= 0.1; }
      this.velocity.addScaledVector(this.velocity, damping);
      this.collider.translate(this.velocity.clone().multiplyScalar(delta));
      const result = this.worldOctree.capsuleIntersect(this.collider);
      this.onFloor = false;
      if (result) {
        this.onFloor = result.normal.y > 0;
        if (!this.onFloor) this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
        if (result.depth >= 1e-10) this.collider.translate(result.normal.multiplyScalar(result.depth));
      }
      this.camera.position.copy(this.collider.end);
    }
    if (this.camera.position.y < -5) this.reset();
  }
}
