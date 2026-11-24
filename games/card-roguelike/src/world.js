import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { AREAS, doorBetween, roomAt } from './areas.mjs';
import { flatDistance, hasLineOfSight } from './spatial.mjs';

let paperMap;
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, map: paperMap, ...extra });

export class LibraryWorld {
  constructor(scene) {
    this.scene = scene;
    const paper = document.createElement('canvas'); paper.width = paper.height = 256;
    const grain = paper.getContext('2d'); grain.fillStyle = '#faf7ef'; grain.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) { const x = (i * 67.31) % 256, y = (i * 31.73) % 256; grain.fillStyle = i % 3 ? '#ddd7cd30' : '#ffffff70'; grain.fillRect(x, y, 0.7, 1 + i % 4); }
    grain.strokeStyle = '#8a817b16'; grain.lineWidth = 1; grain.beginPath(); grain.moveTo(0, 15); grain.lineTo(256, 246); grain.stroke();
    paperMap = new THREE.CanvasTexture(paper); paperMap.colorSpace = THREE.SRGBColorSpace; paperMap.wrapS = paperMap.wrapT = THREE.RepeatWrapping;
    this.group = new THREE.Group();
    this.static = new THREE.Group();
    this.decor = new THREE.Group();
    this.group.add(this.static, this.decor);
    scene.add(this.group);
    this.gates = [];
    this.locked = new Set();
    this.animated = [];
    this.currentArea = 0;
    this.areaMeshes = AREAS.map(() => []);
    this.buildingArea = null;
    for (let i = 0; i < AREAS.length; i++) this.buildArea(i);
    for (let i = 0; i < AREAS.length - 1; i++) this.buildCorridor(i);
    this.static.updateMatrixWorld(true);
    this.staticOctree = new Octree().fromGraphNode(this.static);
    this.reset();
  }

  box(w, h, d, x, y, z, mat, parent = this.static) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); parent.add(mesh); if (this.buildingArea !== null) this.areaMeshes[this.buildingArea].push(mesh); return mesh;
  }

  mesh(geometry, mat, x, y, z, parent = this.decor) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z); parent.add(mesh); if (this.buildingArea !== null) this.areaMeshes[this.buildingArea].push(mesh); return mesh;
  }

  buildArea(index) {
    const area = AREAS[index], half = area.size / 2;
    this.buildingArea = index;
    const wall = material(area.wall), floor = material(area.floor), dark = material(area.wall).clone(); dark.color.multiplyScalar(0.63);
    const accent = material(area.accent);
    this.box(area.size + 0.8, 0.5, area.size + 0.8, area.x, -0.25, area.z, floor);
    const open = new Set();
    for (const neighbor of [AREAS[index - 1], AREAS[index + 1]].filter(Boolean)) open.add(neighbor.x < area.x ? 'west' : neighbor.x > area.x ? 'east' : neighbor.z < area.z ? 'north' : 'south');
    for (const side of ['north', 'south', 'west', 'east']) {
      const horizontal = ['north', 'south'].includes(side), sign = ['north', 'west'].includes(side) ? -1 : 1;
      const chunks = open.has(side) ? [[-(half + 3) / 2, half - 3], [(half + 3) / 2, half - 3]] : [[0, area.size]];
      for (const [offset, length] of chunks) this.box(horizontal ? length : 0.55, 5.8, horizontal ? 0.55 : length, area.x + (horizontal ? offset : sign * half), 2.65, area.z + (horizontal ? sign * half : offset), wall);
      if (open.has(side)) {
        for (const offset of [-3.2, 3.2]) this.box(horizontal ? 0.45 : 0.7, 4.3, horizontal ? 0.7 : 0.45, area.x + (horizontal ? offset : sign * half), 2.15, area.z + (horizontal ? sign * half : offset), accent);
        this.box(horizontal ? 6.8 : 0.7, 0.45, horizontal ? 0.7 : 6.8, area.x + (horizontal ? 0 : sign * half), 4.2, area.z + (horizontal ? sign * half : 0), accent);
      }
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      this.box(0.7, 5.9, 0.7, area.x + x * (half - 1), 2.7, area.z + z * (half - 1), dark);
      this.box(1.1, 0.2, 1.1, area.x + x * (half - 1), 4.7, area.z + z * (half - 1), accent);
    }
    if (area.theme === 'stacks' || area.theme === 'broken') {
      for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
        const x = area.x + side * (half - 1.5), z = area.z - 7 + row * 7;
        this.box(1, 3.6, 4.5, x, 1.8, z, dark);
        for (let shelf = 0; shelf < 4; shelf++) {
          this.box(1.2, 0.12, 4.4, x - side * 0.1, 0.55 + shelf * 0.85, z, accent);
          for (let book = 0; book < 6; book++) this.box(0.85, 0.5 + book % 2 * 0.15, 0.4, x - side * 0.1, 0.88 + shelf * 0.85, z - 1.7 + book * 0.65, material([0xa6b8cc, 0xd4bb99, 0xa9c5b1, 0xbba6d0][(book + shelf) % 4]), this.decor);
        }
      }
      for (const side of [-1, 1]) this.box(2.2, 1.3, 1.8, area.x + side * 4.8, 0.65, area.z + 0.5, dark);
      if (area.theme === 'broken') for (let i = 0; i < 16; i++) {
        const page = this.mesh(new THREE.BoxGeometry(0.7, 0.08, 1.0), material(area.accent), area.x + Math.sin(i * 2.7) * 7, 2.3 + i % 4 * 0.5, area.z + Math.cos(i * 3.8) * 7);
        page.rotation.set(i * 0.4, i, 0.3); this.animated.push({ mesh: page, baseY: page.position.y, phase: i, type: 'page' });
      }
    }
    if (area.theme === 'fungus' || area.theme === 'glass') {
      for (let i = 0; i < 9; i++) {
        const angle = i / 9 * Math.PI * 2, x = area.x + Math.sin(angle) * 8.2, z = area.z + Math.cos(angle) * 8.2;
        this.mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.8, 7), material(0xb9c8a7), x, 0.9, z);
        const top = this.mesh(new THREE.SphereGeometry(area.theme === 'fungus' ? 1.15 : 0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), material(i % 2 ? area.accent : 0x9dd7be, { emissive: area.accent, emissiveIntensity: 0.08 }), x, 1.85, z);
        if (area.theme === 'glass') { top.scale.y = 1.5; this.mesh(new THREE.OctahedronGeometry(0.4), material(0xedb2bb, { emissive: 0xa95b79, emissiveIntensity: 0.15 }), x, 2.3, z); }
      }
      for (const side of [-1, 1]) this.box(1.3, 1.2, 3.2, area.x + side * 4.3, 0.6, area.z + 1, dark);
      if (area.theme === 'glass') for (let i = 0; i < 5; i++) {
        const glass = this.mesh(new THREE.BoxGeometry(area.size - 1, 0.08, 3.3), material(0xa7d8d1, { transparent: true, opacity: 0.22, metalness: 0.6, roughness: 0.15 }), area.x, 5.4 + Math.sin(i) * 0.2, area.z - 9 + i * 4.5);
        glass.rotation.z = i % 2 ? 0.06 : -0.06;
      }
    }
    if (area.theme === 'water') {
      const water = this.mesh(new THREE.PlaneGeometry(area.size - 0.7, area.size - 0.7), material(0x74bec9, { transparent: true, opacity: 0.34, roughness: 0.85 }), area.x, 0.035, area.z);
      water.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
        const x = area.x + side * 7.4, z = area.z - 8 + i * 5;
        this.box(2.7, 0.4, 2.7, x, 0.18, z, accent);
        this.mesh(new THREE.CylinderGeometry(0.32, 0.42, 3.3, 8), dark, x, 1.9, z);
      }
      for (const side of [-1, 1]) this.box(1.4, 1.0, 2, area.x + side * 4.5, 0.5, area.z, dark);
    }
    if (area.theme === 'stars' || area.theme === 'vault') {
      for (let i = 0; i < 3; i++) {
        const ring = this.mesh(new THREE.TorusGeometry(2.3 + i * 0.7, 0.035, 5, 48), material(area.accent, { emissive: area.accent, emissiveIntensity: 0.3 }), area.x, 4.8, area.z);
        ring.rotation.set(0.5 + i * 0.5, i * 0.6, i); this.animated.push({ mesh: ring, baseY: 4.8, phase: i, type: 'ring' });
      }
      for (let i = 0; i < 18; i++) this.mesh(new THREE.OctahedronGeometry(0.07 + i % 3 * 0.025), material(area.accent, { emissive: area.accent, emissiveIntensity: 0.6 }), area.x + Math.sin(i * 2.3) * 9, 4.5 + i % 4 * 0.45, area.z + Math.cos(i * 1.7) * 9);
      for (const x of [-5.5, 5.5]) this.box(1.2, 2.2, 1.2, area.x + x, 1.1, area.z + 0.5, dark);
      if (area.theme === 'vault') {
        this.box(6, 0.5, 3.3, area.x, 0.25, area.z - 8, accent);
        this.mesh(new THREE.OctahedronGeometry(1.4), material(area.accent, { emissive: 0xd47065, emissiveIntensity: 0.3 }), area.x, 3.8, area.z - 9);
      }
    }
    if (area.theme === 'press') for (const side of [-1, 1]) {
      this.box(2.8, 0.8, 6, area.x + side * 5.6, 0.4, area.z, dark);
      for (let i = 0; i < 3; i++) {
        const roller = this.mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 12), material(0x3c394e, { metalness: 0.7 }), area.x + side * 5.6, 1.45, area.z - 2 + i * 2);
        roller.rotation.z = Math.PI / 2;
      }
      this.box(2.5, 1.8, 1, area.x + side * 5.6, 1.3, area.z + 2.9, wall);
    }
    const sign = this.text(area.name, area.accent);
    sign.position.set(area.x, 3.6, area.z - half + 0.32); this.decor.add(sign);
    // A central circular floor inlay makes attack footprints legible.
    const inlay = this.mesh(new THREE.RingGeometry(5.5, 5.55, 56), new THREE.MeshBasicMaterial({ color: area.accent, side: THREE.DoubleSide, transparent: true, opacity: 0.3 }), area.x, 0.025, area.z);
    inlay.rotation.x = -Math.PI / 2;
    this.buildingArea = null;
  }

  text(value, color) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString(); ctx.font = '42px Georgia'; ctx.textAlign = 'center'; ctx.fillText(value, 384, 66);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  }

  buildCorridor(index) {
    const a = AREAS[index], b = AREAS[index + 1], door = doorBetween(index), horizontal = door.horizontal;
    const separation = horizontal ? Math.abs(a.x - b.x) : Math.abs(a.z - b.z);
    const length = separation - a.size / 2 - b.size / 2 + 1;
    const centerX = horizontal ? (a.x + Math.sign(b.x - a.x) * a.size / 2 + b.x - Math.sign(b.x - a.x) * b.size / 2) / 2 : a.x;
    const centerZ = horizontal ? a.z : (a.z + Math.sign(b.z - a.z) * a.size / 2 + b.z - Math.sign(b.z - a.z) * b.size / 2) / 2;
    const stone = material(0x75819b);
    this.box(horizontal ? length : 6.3, 0.5, horizontal ? 6.3 : length, centerX, -0.25, centerZ, stone);
    for (const side of [-1, 1]) this.box(horizontal ? length : 0.4, 4.4, horizontal ? 0.4 : length, centerX + (horizontal ? 0 : side * 3.15), 2.1, centerZ + (horizontal ? side * 3.15 : 0), material(0x596780));
    const gate = new THREE.Group();
    gate.position.set(centerX, 2.1, centerZ);
    const plane = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.18 : 6, 4.2, horizontal ? 6 : 0.18), new THREE.MeshStandardMaterial({ color: 0xb69fde, emissive: 0x6f5399, emissiveIntensity: 0.15, transparent: true, opacity: 0.45 }));
    gate.add(plane); this.decor.add(gate);
    this.gates.push({ mesh: gate, x: centerX, z: centerZ, horizontal });
  }

  reset() { this.locked = new Set(this.gates.map((_, index) => index)); this.gates.forEach(gate => { gate.mesh.visible = true; }); this.rebuildGates(); }
  unlock(index) { if (this.locked.delete(index)) { this.gates[index].mesh.visible = false; this.rebuildGates(); } }
  rebuildGates() {
    const group = new THREE.Group();
    for (const index of this.locked) { const gate = this.gates[index]; const mesh = new THREE.Mesh(new THREE.BoxGeometry(gate.horizontal ? 0.45 : 6.3, 4.5, gate.horizontal ? 6.3 : 0.45)); mesh.position.set(gate.x, 2.15, gate.z); group.add(mesh); }
    group.updateMatrixWorld(true); this.gateOctree = new Octree().fromGraphNode(group);
    group.traverse(node => node.geometry?.dispose());
  }
  get collisionTrees() { return [this.staticOctree, this.gateOctree]; }
  paperMaterial(color, extra = {}) { return material(color, { flatShading: true, ...extra }); }
  canSee(from, to) { return hasLineOfSight(from, to, this.collisionTrees); }
  navigationTarget(from, to) {
    const a = roomAt(from), b = roomAt(to);
    if (a === b) return to;
    const next = a + Math.sign(b - a), door = this.gates[Math.min(a, next)];
    return flatDistance(from, door) < 2 ? { x: AREAS[next].x, z: AREAS[next].z } : door;
  }
  update(dt, time, position, reducedMotion) {
    this.currentArea = roomAt(position);
    for (let i = 0; i < this.areaMeshes.length; i++) for (const mesh of this.areaMeshes[i]) mesh.visible = Math.abs(i - this.currentArea) <= 1;
    const area = AREAS[this.currentArea];
    const color = new THREE.Color(area.fog);
    this.scene.background.lerp(color, Math.min(1, dt * 2)); this.scene.fog.color.lerp(color, Math.min(1, dt * 2));
    if (!reducedMotion) for (const item of this.animated) {
      if (Math.abs(item.mesh.position.x - position.x) + Math.abs(item.mesh.position.z - position.z) > 45) continue;
      if (item.type === 'page') item.mesh.position.y = item.baseY + Math.sin(time + item.phase) * 0.12;
      else item.mesh.rotation.z += dt * 0.08;
    }
  }
}
