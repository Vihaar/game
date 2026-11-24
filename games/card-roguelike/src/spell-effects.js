/** Paper spell choreography over Three.js + the bundled Tween.js23.1.1.
 * Actual reused tween implementation: three/addons/libs/tween.module.js (MIT).
 * See SPELL_EFFECTS_RESEARCH.md and vendor/upstream/TWEEN-LICENSE.txt.
 */
import * as THREE from "three";
import {
  Group as TweenGroup,
  Tween,
  Easing,
} from "three/addons/libs/tween.module.js";
import { getCard } from "./rules.mjs";
import {
  EFFECT_LIMITS,
  artCell,
  effectProfile,
  seededUnit,
} from "./effectprofile.mjs";
const TAU = Math.PI * 2,
  UP = new THREE.Vector3(0, 1, 0);
const valid = (v) => v && [v.x, v.y, v.z].every(Number.isFinite);
function paperMaterial(color = 0xffffff, map = null) {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    transparent: true,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    depthWrite: false,
    toneMapped: false,
  });
}
function foldedShard() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0.9, 0, -0.35, 0, 0, 0, -0.8, 0.16, 0, 0.9, 0, 0, -0.8, 0.16, 0.35,
        0, 0,
      ],
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}
function setCell(geometry, cell) {
  const uv = geometry.getAttribute("uv"),
    base = geometry.userData.baseUV;
  const x = cell % 4,
    y = Math.floor(cell / 4),
    inset = 0.006;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      x / 4 + inset + base[i * 2] * (0.25 - 2 * inset),
      1 - (y + 1) / 4 + inset + base[i * 2 + 1] * (0.25 - 2 * inset),
    );
  uv.needsUpdate = true;
}
export class SpellEffects {
  constructor(
    scene,
    { camera = null, renderer = null, reducedMotion = false } = {},
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.reducedMotion = reducedMotion;
    this.clock = 0;
    this.serial = 0;
    this.disposed = false;
    this.tweens = new TweenGroup();
    this.sharedShard = foldedShard();
    this.ballGeometry = new THREE.IcosahedronGeometry(0.27, 1);
    const faces = this.ballGeometry.getAttribute("position"),
      faceColors = [];
    for (let i = 0; i < faces.count; i++) {
      const value = 0.72 + seededUnit(781, Math.floor(i / 3)) * 0.28;
      faceColors.push(value, value * 0.98, value * 0.91);
    }
    this.ballGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(faceColors, 3),
    );
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.atlas = new THREE.TextureLoader().load(
      "art/card-atlas.webp",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (this.disposed) texture.dispose();
      },
    );
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.slots = Array.from({ length: EFFECT_LIMITS.concurrent }, () =>
      this.createSlot(),
    );
  }
  createSlot() {
    const group = new THREE.Group();
    group.name = "paper-spell-effect";
    group.visible = false;
    this.scene.add(group);
    const particles = new THREE.InstancedMesh(
      this.sharedShard,
      paperMaterial(),
      EFFECT_LIMITS.particles,
    );
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particles.frustumCulled = false;
    group.add(particles);
    const positions = new Float32Array(
        (EFFECT_LIMITS.ribbonSegments + 1) * 2 * 3,
      ),
      ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const indices = [];
    for (let i = 0; i < EFFECT_LIMITS.ribbonSegments; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    ribbonGeometry.setIndex(indices);
    const ribbon = new THREE.Mesh(ribbonGeometry, paperMaterial());
    ribbon.frustumCulled = false;
    group.add(ribbon);
    const seals = Array.from({ length: 3 }, () => {
      const geometry = new THREE.CircleGeometry(0.5, 32);
      geometry.userData.baseUV = new Float32Array(
        geometry.getAttribute("uv").array,
      );
      const mesh = new THREE.Mesh(
        geometry,
        paperMaterial(0xffffff, this.atlas),
      );
      group.add(mesh);
      return mesh;
    });
    const payload = new THREE.Mesh(this.ballGeometry, paperMaterial());
    payload.material.vertexColors = true;
    group.add(payload);
    return {
      group,
      particles,
      ribbon,
      seals,
      payload,
      active: false,
      tween: null,
      profile: null,
      origin: new THREE.Vector3(),
      target: new THREE.Vector3(),
      progress: { t: 0 },
    };
  }
  claim(card, origin, target, forge) {
    if (this.disposed || !valid(origin) || !valid(target)) return null;
    const slot =
      this.slots.find((s) => !s.active) ||
      this.slots.reduce((a, b) => (a.order < b.order ? a : b));
    this.release(slot);
    slot.active = true;
    slot.order = ++this.serial;
    slot.started = this.clock;
    slot.profile = effectProfile(card, {
      forge,
      reducedMotion: this.reducedMotion,
    });
    slot.origin.copy(origin);
    slot.target.copy(target);
    slot.progress = { t: 0 };
    slot.group.visible = true;
    slot.particles.count = slot.profile.particles;
    const parents = Array.isArray(card?.parents)
      ? card.parents
          .slice(0, 2)
          .map((key) => getCard(key) || { key, kind: card.kind, fused: true })
      : [];
    const cells = forge
      ? [
          artCell(parents[0] || card),
          artCell(parents[1] || card),
          slot.profile.cell,
        ]
      : [slot.profile.cell];
    slot.seals.forEach((seal, i) => {
      seal.visible = i < cells.length;
      seal.material.opacity = 0;
      setCell(seal.geometry, cells[i] ?? slot.profile.cell);
    });
    slot.payload.visible = !forge;
    slot.payload.material.color.setHex(slot.profile.colors[0]);
    slot.ribbon.visible = !forge && !this.reducedMotion;
    slot.ribbon.material.color.setHex(slot.profile.colors[0]);
    for (let i = 0; i < slot.profile.particles; i++)
      slot.particles.setColorAt(
        i,
        this.color.setHex(
          slot.profile.family === "fire"
            ? [0xda805b, 0xe8b77c, 0xf0d3a4][i % 3]
            : slot.profile.colors[i % slot.profile.colors.length],
        ),
      );
    if (slot.particles.instanceColor)
      slot.particles.instanceColor.needsUpdate = true;
    slot.tween = new Tween(slot.progress, this.tweens)
      .to({ t: 1 }, slot.profile.duration * 1000)
      .easing(Easing.Cubic.InOut)
      .start(this.clock)
      .onComplete(() => this.release(slot));
    this.paint(slot);
    return slot.order;
  }
  cast(card, originVector3, targetVector3) {
    return this.claim(card || {}, originVector3, targetVector3, false);
  }
  forge(card, originVector3) {
    return this.claim(card || {}, originVector3, originVector3, true);
  }
  paint(slot) {
    const p = slot.progress.t,
      profile = slot.profile,
      age = (this.clock - slot.started) / 1000;
    const opacity = Math.sin(Math.PI * Math.min(1, age / profile.duration));
    const linear = Math.min(1, age / profile.duration),
      travel = profile.reducedMotion
        ? 1
        : Easing.Quadratic.InOut(
            Math.max(0, Math.min(1, (linear - 0.12) / 0.5)),
          ),
      impact = Math.max(0, (linear - 0.62) / 0.38);
    const center = slot.origin.clone().lerp(slot.target, travel),
      direction = slot.target.clone().sub(slot.origin).normalize();
    if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
    const side = direction.clone().cross(UP).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    if (profile.family === "water" && !profile.forge)
      center.y += Math.sin(travel * Math.PI) * 0.6;
    const radius = profile.reducedMotion
      ? 0.18
      : impact > 0
        ? 0.2 + impact * 0.95
        : 0.12 + Math.sin(travel * Math.PI) * 0.13;
    slot.payload.position.copy(center);
    slot.payload.rotation.set(travel * 4, travel * 3, travel * 2);
    const payloadScale = profile.reducedMotion
      ? 0.6
      : (linear < 0.12 ? 0.4 + linear * 5 : 1) *
        Math.max(0.01, 1 - impact * 2.8);
    slot.payload.scale.set(
      payloadScale,
      profile.family === "stone" ? payloadScale * 1.4 : payloadScale,
      profile.family === "stone" ? payloadScale * 0.2 : payloadScale,
    );
    slot.payload.material.opacity =
      impact > 0.35 ? 0 : Math.min(1, linear * 12);
    const particleOpacity = Math.max(0, opacity) * 0.9;
    slot.particles.material.opacity = particleOpacity;
    for (let i = 0; i < profile.particles; i++) {
      const u = seededUnit(profile.seed, i),
        v = seededUnit(profile.seed, i + 100),
        angle = i * 2.39996 + p * TAU * (profile.family === "wind" ? 2 : 1),
        spread = radius * (0.35 + v);
      let x = Math.cos(angle) * spread,
        y = Math.sin(angle) * spread,
        z = (u - 0.5) * spread;
      switch (profile.family) {
        case "fire":
          x *= 0.65;
          y = Math.abs(y) + impact * 0.6;
          z -= (1 - i / profile.particles) * 0.85 * (1 - impact);
          break;
        case "water":
          x *= 1.2;
          y = Math.sin(angle + p * TAU) * spread * 0.45;
          z += Math.sin(p * Math.PI) * 0.4;
          break;
        case "stone":
          x =
            Math.cos((i * TAU) / profile.particles) *
            (0.6 + v * 0.2) *
            Math.sin(Math.PI * p);
          y =
            Math.sin((i * TAU) / profile.particles) *
            (0.6 + v * 0.2) *
            Math.sin(Math.PI * p);
          z *= 0.2;
          break;
        case "wind":
          x *= 1.4;
          z += (i / profile.particles - 0.5) * 1.4;
          break;
        case "light":
          x *= 1.1;
          y *= 1.1;
          z *= 0.3;
          break;
        case "shadow":
          x *= 1 - p * 0.6;
          y *= 1 - p * 0.6;
          z -= Math.sin(Math.PI * p) * 0.35;
          break;
        case "lightning":
          x = (i % 2 ? 1 : -1) * spread * 0.45;
          y = (i / profile.particles - 0.5) * 1.5;
          z *= 0.3;
          break;
        case "vine":
          x = Math.cos(angle) * spread * 0.55;
          y = (i / profile.particles - 0.5) * 1.5;
          z = Math.sin(angle) * spread * 0.55;
          break;
      }
      if (profile.forge) {
        const orbit = angle + p * TAU * 1.5;
        x = Math.cos(orbit) * (1 - p) * 1.0;
        y = Math.sin(orbit) * (1 - p) * 0.7;
        z = (v - 0.5) * 0.25;
      }
      if (profile.reducedMotion) {
        x *= 0.25;
        y *= 0.25;
        z = 0;
      }
      this.dummy.position
        .copy(center)
        .addScaledVector(side, x)
        .addScaledVector(UP, y)
        .addScaledVector(direction, z);
      this.dummy.rotation.set(p * TAU + u * TAU, angle * 0.3, angle);
      const scale =
        (0.07 + v * 0.075) *
        (profile.family === "stone" ? 1.6 : 1) *
        Math.max(0.05, opacity);
      this.dummy.scale.set(
        scale,
        ["wind", "fire"].includes(profile.family) ? scale * 2.5 : scale,
        scale,
      );
      this.dummy.updateMatrix();
      slot.particles.setMatrixAt(i, this.dummy.matrix);
    }
    slot.particles.instanceMatrix.needsUpdate = true;
    if (slot.ribbon.visible) {
      const attr = slot.ribbon.geometry.getAttribute("position");
      for (let i = 0; i <= EFFECT_LIMITS.ribbonSegments; i++) {
        const t = i / EFFECT_LIMITS.ribbonSegments,
          q = Math.max(0, travel - 0.3 * (1 - t)),
          point = slot.origin.clone().lerp(slot.target, q);
        const curl =
          profile.family === "lightning"
            ? (i % 2 ? 1 : -1) * 0.14
            : Math.sin(t * TAU * 2 + p * TAU) * 0.12;
        point.addScaledVector(UP, curl * Math.sin(t * Math.PI));
        const width =
          0.012 +
          Math.sin(t * Math.PI) * (profile.family === "fire" ? 0.12 : 0.055);
        for (let j = 0; j < 2; j++) {
          const pos = point.clone().addScaledVector(side, j ? width : -width);
          attr.setXYZ(i * 2 + j, pos.x, pos.y, pos.z);
        }
      }
      attr.needsUpdate = true;
      slot.ribbon.material.opacity = opacity * 0.6;
    }
    slot.seals.forEach((seal, i) => {
      if (!seal.visible) return;
      if (profile.forge && profile.reducedMotion) {
        seal.position.copy(center);
        if (i < 2) seal.position.addScaledVector(side, i ? 0.45 : -0.45);
        seal.material.opacity = opacity * (i === 2 ? linear : 1 - linear);
        seal.scale.setScalar(i === 2 ? 0.75 : 0.55);
        seal.rotation.set(0, 0, 0);
      } else if (profile.forge) {
        const output = i === 2,
          stage = output
            ? Math.max(0, (p - 0.45) / 0.55)
            : Math.max(0, 1 - p / 0.75);
        const a = (i ? Math.PI : 0) + p * TAU;
        seal.position.copy(center);
        if (!output)
          seal.position
            .addScaledVector(side, Math.cos(a) * (1 - p) * 0.75)
            .addScaledVector(UP, Math.sin(a) * (1 - p) * 0.45);
        seal.material.opacity = Math.min(1, stage * 2) * opacity;
        seal.scale.setScalar(output ? 0.25 + p * 0.95 : 0.65 * (1 - p * 0.7));
        seal.rotation.z = output ? -p * 0.3 : (i ? 1 : -1) * p * Math.PI;
      } else {
        seal.position.copy(i ? slot.target : slot.origin);
        seal.material.opacity = opacity * Math.max(0, 1 - linear * 4);
        seal.scale.setScalar(i ? 0.45 + p * 0.75 : 0.8 - p * 0.3);
        seal.rotation.z = (i ? 1 : -1) * p * 0.5;
      }
      if (this.camera) {
        const roll = seal.rotation.z;
        seal.quaternion.copy(this.camera.quaternion);
        seal.rotateZ(roll);
      }
    });
  }
  update(dt, _elapsed) {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    this.clock += dt * 1000;
    this.tweens.update(this.clock);
    for (const slot of this.slots) if (slot.active) this.paint(slot);
  }
  release(slot) {
    if (slot.tween) {
      slot.tween.stop();
      slot.tween = null;
    }
    slot.active = false;
    slot.group.visible = false;
  }
  get stats() {
    const active = this.slots.filter((s) => s.active);
    return {
      active: active.length,
      drawCalls: active.reduce(
        (sum, s) =>
          sum +
          1 +
          Number(s.ribbon.visible) +
          Number(s.payload.visible) +
          s.seals.filter((x) => x.visible).length,
        0,
      ),
      maxDrawCalls: EFFECT_LIMITS.drawCalls,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const slot of this.slots) {
      this.release(slot);
      this.scene.remove(slot.group);
      slot.particles.material.dispose();
      slot.payload.material.dispose();
      slot.ribbon.geometry.dispose();
      slot.ribbon.material.dispose();
      for (const seal of slot.seals) {
        seal.geometry.dispose();
        seal.material.dispose();
      }
    }
    this.tweens.removeAll();
    this.sharedShard.dispose();
    this.ballGeometry.dispose();
    this.atlas.dispose();
    this.slots = [];
  }
}
