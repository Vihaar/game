import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { ENEMY_TYPES } from './areas.mjs';
import { applyEnemyDamage, corruptionDamageBonus } from './rules.mjs';
import { flatDistance, lockedTell, moveCapsule, segmentHits, tellHits, segmentUnobstructed } from './spatial.mjs';

function groundShape(tell, color) {
  let geometry;
  if (tell.pattern === 'cleave') {
    const angle = Math.atan2(-(tell.target.z - tell.origin.z), tell.target.x - tell.origin.x);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.absarc(0, 0, tell.reach, angle - 0.75, angle + 0.75, false); shape.lineTo(0, 0);
    geometry = new THREE.ShapeGeometry(shape, 28);
  } else geometry = new THREE.CircleGeometry(tell.radius, 48);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }));
  const center = ['ring', 'cleave'].includes(tell.pattern) ? tell.origin : tell.target;
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(center.x, 0.075, center.z);
  return mesh;
}

export class CombatEncounter {
  constructor(scene, world, labels, state, definitions, onDamage) {
    this.scene = scene; this.world = world; this.labels = labels; this.state = state; this.onDamage = onDamage;
    this.projectiles = []; this.time = 0; this.disposed = false;
    this.actors = definitions.map((definition, index) => this.createActor(definition, index));
  }

  createActor(definition, index) {
    const stats = ENEMY_TYPES[definition.type], bodyMaterial = this.world.paperMaterial(stats.color);
    const group = new THREE.Group();
    const bodyShape = definition.type === 'warden' ? new THREE.BoxGeometry(1.15, 1.45, 0.5)
      : definition.type === 'bell' ? new THREE.CylinderGeometry(0.4, 0.85, 1.4, 5)
      : definition.type === 'scribe' ? new THREE.ConeGeometry(0.65, 1.65, 4)
      : new THREE.OctahedronGeometry(definition.type === 'unbinder' ? 1.0 : 0.65, 0);
    const body = new THREE.Mesh(bodyShape, bodyMaterial); group.add(body);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyShape), new THREE.LineBasicMaterial({ color: 0x4d4557, transparent: true, opacity: 0.4 })); body.add(edges);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.08), this.world.paperMaterial(0x403b53)); eyes.position.set(0, 0.13, definition.type === 'warden' ? 0.29 : 0.53); group.add(eyes);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(definition.type === 'unbinder' ? 1.4 : 0.65, 0.85, 0.055), this.world.paperMaterial(0xf0dec2));
      wing.position.set(side * (definition.type === 'unbinder' ? 1.1 : 0.6), -0.2, 0); wing.rotation.z = side * 0.42; wing.rotation.y = side * 0.3; group.add(wing);
      if (definition.type === 'eater') {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.12), bodyMaterial); leg.position.set(side * 0.4, -0.7, 0.15); leg.rotation.z = side * 0.35; group.add(leg);
      }
      if (definition.type === 'unbinder') for (let i = 0; i < 3; i++) {
        const page = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.6, 3), this.world.paperMaterial(i % 2 ? 0xd8baac : 0xe8d9bc));
        page.position.set(side * (1 + i * 0.23), 0.25 + i * 0.1, -i * 0.2); page.rotation.z = side * (0.7 + i * 0.25); group.add(page);
      }
    }
    const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 40), new THREE.MeshBasicMaterial({ color: 0xf1b37e, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    selectionRing.rotation.x = -Math.PI / 2; selectionRing.position.y = definition.type === 'unbinder' ? -1.64 : -1.14; group.add(selectionRing);
    group.position.set(definition.spawnX, definition.type === 'unbinder' ? 1.7 : 1.2, definition.spawnZ);
    group.traverse(child => { child.userData.actorIndex = index; }); this.scene.add(group);
    const label = document.createElement('button'); label.type = 'button'; label.className = 'enemy-label'; label.dataset.enemy = String(index);
    const name = document.createElement('strong'); name.textContent = definition.name;
    const health = document.createElement('span'); health.className = 'enemy-health';
    const healthFill = document.createElement('i'); health.appendChild(healthFill);
    const numbers = document.createElement('span'); numbers.className = 'enemy-numbers';
    const intent = document.createElement('span'); intent.className = 'enemy-intent';
    label.append(name, health, numbers, intent); this.labels.appendChild(label);
    return { definition, stats, index, group, body, material: bodyMaterial, selectionRing, label, healthFill, numbers, intent,
      position: new THREE.Vector3(definition.spawnX, 0, definition.spawnZ),
      collider: new Capsule(new THREE.Vector3(definition.spawnX, 0.4, definition.spawnZ), new THREE.Vector3(definition.spawnX, 1.35, definition.spawnZ), 0.4),
      phase: 'stalking', remaining: 1.15 + index * 0.18, tell: null, tellMesh: null, attacks: 0, lastHp: definition.hp, hitFlash: 0, corpse: 0 };
  }

  update(dt, playerPosition) {
    if (this.disposed) return;
    this.time += dt;
    for (const actor of this.actors) {
      const enemy = this.state.enemies[actor.index];
      if (!enemy || enemy.hp <= 0) {
        actor.label.hidden = true;
        if (actor.tellMesh) this.removeTell(actor);
        actor.corpse += dt; actor.group.scale.setScalar(Math.max(0.01, 1 - actor.corpse * 2)); actor.group.visible = actor.corpse < 0.5;
        continue;
      }
      actor.selectionRing.visible = actor.index === this.state.target;
      if (enemy.hp < actor.lastHp) actor.hitFlash = 0.18;
      actor.lastHp = enemy.hp; actor.hitFlash = Math.max(0, actor.hitFlash - dt);
      actor.material.emissive.setHex(actor.hitFlash ? 0x9b4d3b : 0x000000);
      actor.material.emissiveIntensity = actor.hitFlash ? 0.4 : 0;
      actor.group.position.set(actor.position.x, actor.definition.type === 'unbinder' ? 1.7 : 1.2, actor.position.z);
      actor.group.lookAt(playerPosition.x, actor.group.position.y, playerPosition.z);
      if (this.state.phase !== 'battle') continue;
      actor.remaining -= dt;
      const distance = flatDistance(actor.position, playerPosition);
      if (actor.phase === 'windup') {
        if (actor.tellMesh) actor.tellMesh.traverse(mesh => { if (mesh.material) mesh.material.opacity = 0.18 + (1 - Math.max(0, actor.remaining) / actor.stats.windup) * 0.3; });
        if (actor.remaining <= 0) this.resolve(actor, playerPosition);
      } else if (actor.phase === 'recovery') {
        if (actor.remaining <= 0) { this.removeTell(actor); actor.phase = 'stalking'; actor.remaining = 0.1; }
      } else {
        const sees = this.world.canSee({ x: actor.position.x, y: 1.05, z: actor.position.z }, { x: playerPosition.x, y: 1.05, z: playerPosition.z });
        if (actor.remaining <= 0 && distance <= actor.stats.reach && sees) this.windup(actor, playerPosition);
        else if (distance > (actor.stats.pattern === 'bolt' ? 5 : 1.8) || !sees) this.pursue(actor, playerPosition, dt);
        else if (actor.stats.pattern === 'bolt' && distance < 3.8) this.pursue(actor, playerPosition, -dt * 0.6);
      }
    }
    this.updateProjectiles(dt, playerPosition);
  }

  pursue(actor, playerPosition, dt) {
    const target = this.world.navigationTarget(actor.position, playerPosition);
    const direction = new THREE.Vector3(target.x - actor.position.x, 0, target.z - actor.position.z).normalize();
    const before = actor.collider.end.clone();
    moveCapsule(actor.collider, direction.multiplyScalar(actor.stats.speed * dt), this.world.collisionTrees);
    if (flatDistance(before, actor.collider.end) < Math.abs(dt) * 0.12) {
      const tangent = new THREE.Vector3(direction.z, 0, -direction.x).normalize().multiplyScalar(actor.stats.speed * dt * (actor.index % 2 ? 1 : -1));
      moveCapsule(actor.collider, tangent, this.world.collisionTrees);
    }
    actor.position.set(actor.collider.end.x, 0, actor.collider.end.z);
  }

  windup(actor, playerPosition) {
    let pattern = actor.stats.pattern;
    if (pattern === 'boss') pattern = ['ring', 'volley', 'cleave'][actor.attacks % 3];
    const radius = actor.definition.type === 'unbinder' && pattern === 'ring' ? 5.1 : actor.stats.radius;
    actor.tell = lockedTell(actor.position, playerPosition, pattern, radius, pattern === 'cleave' ? 3.6 : actor.stats.reach);
    actor.phase = 'windup'; actor.remaining = actor.stats.windup;
    if (['bolt', 'volley'].includes(pattern)) {
      actor.tellMesh = new THREE.Group();
      for (const angle of pattern === 'volley' ? [-0.22, 0, 0.22] : [0]) {
        const direction = new THREE.Vector3(actor.tell.target.x - actor.tell.origin.x, 0, actor.tell.target.z - actor.tell.origin.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 12), new THREE.MeshBasicMaterial({ color: 0xf1b45d, transparent: true, opacity: 0.28, depthWrite: false }));
        strip.position.set(actor.position.x + direction.x * 6, 0.09, actor.position.z + direction.z * 6); strip.rotation.y = Math.atan2(direction.x, direction.z); actor.tellMesh.add(strip);
      }
    } else actor.tellMesh = groundShape(actor.tell, 0xe5aa53);
    this.scene.add(actor.tellMesh);
  }

  resolve(actor, playerPosition) {
    const tell = actor.tell;
    actor.attacks++;
    if (['bolt', 'volley'].includes(tell.pattern)) {
      for (const angle of tell.pattern === 'volley' ? [-0.22, 0, 0.22] : [0]) this.launchProjectile(actor, angle);
    } else {
      const clear = this.world.canSee({ x: tell.origin.x, y: 1.05, z: tell.origin.z }, { x: playerPosition.x, y: 1.05, z: playerPosition.z });
      if (tellHits(tell, playerPosition) && clear) this.onDamage(applyEnemyDamage(this.state, this.state.enemies[actor.index].damage), actor.definition.name);
    }
    if (actor.tellMesh) actor.tellMesh.traverse(mesh => { if (mesh.material) { mesh.material.color.setHex(0xc96b62); mesh.material.opacity = 0.18; } });
    actor.phase = 'recovery'; actor.remaining = actor.stats.recovery;
  }

  launchProjectile(actor, angle) {
    const direction = new THREE.Vector3(actor.tell.target.x - actor.tell.origin.x, 0, actor.tell.target.z - actor.tell.origin.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const position = new THREE.Vector3(actor.tell.origin.x, 1.0, actor.tell.origin.z).addScaledVector(direction, 0.9);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.7, 4), this.world.paperMaterial(0xe1a07c, { emissive: 0x8e4c3a, emissiveIntensity: 0.4 }));
    mesh.rotation.x = Math.PI / 2; mesh.rotation.z = -Math.atan2(direction.x, direction.z); mesh.position.copy(position); this.scene.add(mesh);
    this.projectiles.push({ mesh, position, direction, life: 2.4, damage: this.state.enemies[actor.index].damage, name: actor.definition.name });
  }

  updateProjectiles(dt, playerPosition) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i], previous = projectile.position.clone();
      projectile.life -= dt; projectile.position.addScaledVector(projectile.direction, dt * 11);
      const blocked = !segmentUnobstructed(previous, projectile.position, this.world.collisionTrees);
      const hit = this.state.phase === 'battle' && segmentHits(playerPosition, previous, projectile.position, 0.55);
      if (hit && !blocked) this.onDamage(applyEnemyDamage(this.state, projectile.damage), projectile.name);
      if (blocked || hit || projectile.life <= 0 || this.state.phase !== 'battle') { this.scene.remove(projectile.mesh); projectile.mesh.geometry.dispose(); projectile.mesh.material.dispose(); this.projectiles.splice(i, 1); }
      else projectile.mesh.position.copy(projectile.position);
    }
  }

  removeTell(actor) {
    if (!actor.tellMesh) return;
    this.scene.remove(actor.tellMesh); actor.tellMesh.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); }); actor.tellMesh = null;
  }

  projectLabels(camera, width, height) {
    const placed = [];
    for (const actor of this.actors) {
      const enemy = this.state.enemies[actor.index];
      if (!enemy || enemy.hp <= 0) { actor.label.hidden = true; continue; }
      const overhead = new THREE.Vector3(actor.position.x, actor.definition.type === 'unbinder' ? 3.9 : 2.6, actor.position.z);
      const distance = camera.position.distanceTo(overhead), projected = overhead.clone().project(camera);
      const visible = projected.z < 1 && projected.z > -1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.25 && distance < 25 && this.world.canSee(camera.position, overhead);
      actor.label.hidden = !visible;
      if (!visible) continue;
      let x = (projected.x * 0.5 + 0.5) * width, y = (-projected.y * 0.5 + 0.5) * height;
      for (const position of placed) if (Math.abs(position.x - x) < 150 && Math.abs(position.y - y) < 58) y = position.y - 65;
      x = Math.max(82, Math.min(width - 82, x)); y = Math.max(100, Math.min(height - 180, y)); placed.push({ x, y });
      actor.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      actor.label.classList.toggle('targeted', actor.index === this.state.target); actor.label.classList.toggle('winding', actor.phase === 'windup');
      actor.healthFill.style.width = `${Math.max(0, enemy.hp) / enemy.maxHp * 100}%`;
      actor.numbers.textContent = `${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP`;
      const tellName = actor.tell?.pattern === 'ring' ? 'Silence ring' : actor.tell?.pattern === 'cleave' ? 'Wide cleave' : actor.tell?.pattern === 'volley' ? 'Three-quill volley' : actor.stats.tell;
      const damage = enemy.damage + corruptionDamageBonus(this.state.corruption);
      const nextBoss = ['Silence ring', 'Three-quill volley', 'Wide cleave'][actor.attacks % 3];
      actor.intent.textContent = actor.phase === 'windup' ? `${tellName} · ${Math.max(0, actor.remaining).toFixed(1)}s · ${damage} dmg` : actor.phase === 'recovery' ? `Recovering ${Math.max(0, actor.remaining).toFixed(1)}s · next ${actor.stats.pattern === 'boss' ? nextBoss : actor.stats.tell}` : `${actor.stats.pattern === 'boss' ? nextBoss : actor.stats.tell} next · ${damage} dmg`;
    }
  }

  getTarget(index) { return this.actors[index]; }
  nearestTarget(position, maxRange = 18) {
    let nearest = -1, best = maxRange;
    this.actors.forEach(actor => { const distance = flatDistance(actor.position, position); if (this.state.enemies[actor.index]?.hp > 0 && distance < best && this.world.canSee({ x: position.x, y: 1.05, z: position.z }, { x: actor.position.x, y: 1.05, z: actor.position.z })) { nearest = actor.index; best = distance; } });
    return nearest;
  }
  dispose() {
    this.disposed = true;
    for (const actor of this.actors) { this.removeTell(actor); this.scene.remove(actor.group); actor.label.remove(); actor.group.traverse(child => { child.geometry?.dispose(); if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose()); else child.material?.dispose(); }); }
    for (const projectile of this.projectiles) { this.scene.remove(projectile.mesh); projectile.mesh.geometry.dispose(); projectile.mesh.material.dispose(); }
    this.projectiles = [];
  }
}
