import * as THREE from 'three';
import { DIORAMA_SCENES, DIORAMA_STYLES, ENEMY_ATLAS, atlasRegion, enemyLayout, sceneBackdrop } from './diorama-scenes.mjs';

// Reuses Three's existing image-plane, texture UV and Raycaster implementations:
// https://threejs.org/manual/#en/billboards and https://threejs.org/docs/#Texture
// Three.js 0.181.2 is pinned by the host game and retains its MIT notice.
const artUrl = name => `${import.meta.env?.BASE_URL ?? './'}art/${name}`;
const ease = t => t * t * (3 - 2 * t);

export class GuidedDiorama {
  constructor(scene, camera, renderer, { onEnemyClick = () => {}, style = 'storybook', backdrops = {}, enemyAtlas = ENEMY_ATLAS } = {}) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.onEnemyClick = onEnemyClick;
    this.group = new THREE.Group(); scene.add(this.group);
    this.scenery = new THREE.Group(); this.cast = new THREE.Group(); this.group.add(this.scenery, this.cast);
    this.textures = new Map(); this.loading = new Map(); this.actors = []; this.areaIndex = 0; this.selected = -1;
    this.transition = null; this.opacity = 1; this.disposed = false; this.lastAspect = 0;
    this.style = DIORAMA_STYLES[style] ? style : 'storybook'; this.backdrops = backdrops; this.enemyAtlas = enemyAtlas;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.loader = new THREE.TextureLoader();
    scene.fog = null; scene.background = new THREE.Color('#e9d7b9');
    this.ready = Promise.all([sceneBackdrop(0, this.style, backdrops), enemyAtlas.file].map(file => this.loadTexture(file)));
    this.setArea(0); this.fitCamera();
    this.handlePointer = event => { const index = this.pickTarget(event); if (index >= 0) this.onEnemyClick(index); };
    renderer?.domElement?.addEventListener('pointerup', this.handlePointer);
  }

  loadTexture(file) {
    if (this.loading.has(file)) return this.loading.get(file);
    if (this.textures.has(file)) return Promise.resolve(this.textures.get(file));
    const pending = new Promise(resolve => {
      const texture = this.loader.load(artUrl(file), loaded => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = Math.min(4, this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
        if (!this.disposed) this.refreshTextures(file);
        this.loading.delete(file); resolve(loaded);
      }, undefined, () => { texture.userData.failed = true; this.loading.delete(file); resolve(null); });
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set(file, texture);
    });
    this.loading.set(file, pending); return pending;
  }

  paperMaterial(color, extra = {}) {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, toneMapped: false, ...extra });
    material.userData.baseOpacity = material.opacity;
    return material;
  }

  addPlane(parent, width, height, material, x, y, z) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.position.set(x, y, z); parent.add(plane); return plane;
  }

  refreshTextures(file) {
    if (this.backdrop && sceneBackdrop(this.areaIndex, this.style, this.backdrops) === file) {
      this.backdrop.material.map = this.textures.get(file); this.backdrop.material.needsUpdate = true;
      this.fitBackdrop();
    }
    if (file === this.enemyAtlas.file) { for (const actor of this.actors) this.applyEnemyTexture(actor); this.fitCamera(); }
  }

  clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.traverse(node => { node.geometry?.dispose(); if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) { if (material.map?.userData.atlasClone) material.map.dispose(); material.dispose(); } });
    }
  }

  setArea(index) {
    this.areaIndex = Math.max(0, Math.min(DIORAMA_SCENES.length - 1, Math.trunc(index)));
    const area = DIORAMA_SCENES[this.areaIndex];
    this.clearGroup(this.scenery); this.clearGroup(this.cast); this.actors = []; this.selected = -1;
    this.scene.background.set(area.paper);
    const backdrop = sceneBackdrop(this.areaIndex, this.style, this.backdrops);
    if (!this.textures.has(backdrop)) this.loadTexture(backdrop);
    this.backdrop = this.addPlane(this.scenery, 32, 18, this.paperMaterial('#ffffff', { map: this.textures.get(backdrop) }), 0, 4.1, -6);
    // The stage lip is three thin, torn sheets. The illustrated room remains the focal point.
    for (let layer = 0; layer < 3; layer++) {
      const shape = new THREE.Shape(); shape.moveTo(-40, -40);
      for (let point = 0; point <= 28; point++) {
        const x = -18 + point * 36 / 28;
        const y = -0.6 + layer * 0.12 + Math.sin(point * 1.9 + layer) * 0.07 + Math.abs(x) * 0.025;
        shape.lineTo(x, y);
      }
      shape.lineTo(40, -40); shape.closePath();
      const sheet = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.paperMaterial(layer === 2 ? area.paper : layer === 1 ? area.edge : area.ink));
      sheet.position.set(0, 0.4, 1.7 + layer * 0.055); this.scenery.add(sheet);
    }
    // Cropped paper wings frame the theatre without adding another competing scene.
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(side * 10, -4); shape.lineTo(side * 10, 14); shape.lineTo(side * 7.8, 14);
      shape.bezierCurveTo(side * 8.4, 9, side * 6.7, 4, side * 8.9, -4); shape.closePath();
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.paperMaterial(area.ink, { opacity: 0.82 }));
      wing.position.z = 2.0; this.scenery.add(wing);
    }
    this.applyOpacity(this.opacity); this.fitCamera();
    return this;
  }

  async travelTo(index, { reducedMotion = false } = {}) {
    await this.ready;
    if (this.disposed) return false;
    await this.loadTexture(sceneBackdrop(index, this.style, this.backdrops));
    if (this.disposed) return false;
    if (this.transition) { this.transition.resolve(false); this.transition = null; }
    if (reducedMotion || index === this.areaIndex) { this.setArea(index); this.applyOpacity(1); return true; }
    return new Promise(resolve => { this.transition = { to: index, elapsed: 0, duration: 1.1, switched: false, resolve }; });
  }

  async setStyle(style) {
    if (this.disposed || !DIORAMA_STYLES[style]) return false;
    this.style = style;
    await this.loadTexture(sceneBackdrop(this.areaIndex, style, this.backdrops));
    if (this.disposed) return false;
    const definitions = this.actors.map(actor => actor.definition), selected = this.selected;
    this.setArea(this.areaIndex); this.setEnemies(definitions); this.setTarget(selected);
    return true;
  }

  applyEnemyTexture(actor) {
    const source = this.textures.get(this.enemyAtlas.file);
    if (!source) return;
    const texture = source.clone(); texture.userData.atlasClone = true;
    const region = atlasRegion(Math.max(0, this.enemyAtlas.types.indexOf(actor.definition.type)), this.enemyAtlas.columns, this.enemyAtlas.rows, 0.004, this.enemyAtlas.regions?.[actor.definition.type]);
    texture.repeat.fromArray(region.repeat); texture.offset.fromArray(region.offset); texture.needsUpdate = true;
    if (actor.sprite.material.map?.userData.atlasClone) actor.sprite.material.map.dispose();
    actor.sprite.material.map = texture; actor.sprite.material.needsUpdate = true;
    const aspect = source.image?.width && source.image?.height ? (source.image.width * region.sourceSize[0]) / (source.image.height * region.sourceSize[1]) : 1;
    actor.sprite.scale.x = aspect;
  }

  setEnemies(definitions = []) {
    const sameCast = definitions.length === this.actors.length && definitions.every((enemy, index) => enemy.id === this.actors[index].definition.id);
    if (!sameCast) {
      this.clearGroup(this.cast);
      this.actors = definitions.map((definition, index) => {
        const group = new THREE.Group(); this.cast.add(group);
        const boss = definition.type === 'unbinder';
        const sprite = this.addPlane(group, boss ? 4.3 : 3.5, boss ? 4.3 : 3.5, this.paperMaterial('#ffffff', { alphaTest: 0.06, depthWrite: false }), 0, boss ? 0.35 : 0, 0);
        sprite.userData.enemyIndex = index;
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(boss ? 1.45 : 1.03, 48), this.paperMaterial('#22334b', { opacity: 0.13, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 0.48; shadow.position.set(0, -1.64, -0.1); group.add(shadow);
        const ring = new THREE.Mesh(new THREE.RingGeometry(boss ? 1.27 : 0.94, boss ? 1.35 : 1.02, 64), this.paperMaterial('#e7774f', { opacity: 0.88, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.scale.y = 0.58; ring.position.set(0, -1.6, 0.05); group.add(ring);
        const actor = { definition: { ...definition }, index, group, sprite, ring, shadow, intent: 'idle', baseY: 3.2, alive: definition.hp > 0 };
        this.applyEnemyTexture(actor); return actor;
      });
      this.fitCamera();
    }
    definitions.forEach((definition, index) => {
      const actor = this.actors[index]; actor.definition = { ...definition }; actor.alive = definition.hp > 0;
      actor.group.visible = actor.alive;
    });
    this.setTarget(this.selected); this.applyOpacity(this.opacity); return this;
  }

  setTarget(index) { this.selected = index; for (const actor of this.actors) actor.ring.visible = actor.alive && actor.index === index; return this; }
  setIntent(index, intent = 'idle') { if (this.actors[index]) this.actors[index].intent = intent; }

  layoutEnemies() {
    const layout = enemyLayout(this.actors.length, this.camera.aspect);
    this.actors.forEach((actor, index) => {
      const slot = layout[index]; actor.group.position.set(slot.x, slot.y, slot.z); actor.group.scale.setScalar(slot.scale); actor.baseY = slot.y;
    });
  }

  fitCamera() {
    const aspect = Math.max(0.35, this.camera.aspect || 1.6);
    this.lastAspect = aspect;
    this.camera.fov = 42; this.camera.near = 0.1; this.camera.far = 70;
    this.layoutEnemies();
    const halfWidth = this.actors.reduce((width, actor) => Math.max(width,
      Math.abs(actor.group.position.x) + actor.sprite.geometry.parameters.width * actor.sprite.scale.x * actor.group.scale.x / 2 + 0.2), 0);
    const fitWidth = halfWidth / (Math.tan(THREE.MathUtils.degToRad(21)) * aspect) + 0.5;
    this.camera.position.set(0, 3.6, Math.max(14, fitWidth, aspect < 0.85 ? 8.7 / aspect : 0));
    this.camera.lookAt(0, 2.6, 0); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.fitBackdrop();
  }

  fitBackdrop() {
    if (!this.backdrop) return;
    const image = this.backdrop.material.map?.image;
    const imageAspect = image?.width && image?.height ? image.width / image.height : 16 / 9;
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * (this.camera.position.z + 6);
    const height = Math.max(18, viewHeight + 3, viewHeight * this.camera.aspect / imageAspect + 0.5);
    this.backdrop.scale.set(height * imageAspect / 32, height / 18, 1);
  }

  getEnemyAnchor(index) {
    const actor = this.actors[index];
    return actor?.alive ? actor.group.localToWorld(new THREE.Vector3(0, 1.85, 0)) : null;
  }

  pickTarget(event) {
    const rect = this.renderer?.domElement?.getBoundingClientRect(); if (!rect?.width || !rect.height) return -1;
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.actors.filter(actor => actor.alive).map(actor => actor.sprite))[0];
    return hit?.object.userData.enemyIndex ?? -1;
  }

  applyOpacity(value) {
    this.opacity = value;
    this.group.traverse(node => { if (node.material) node.material.opacity = (node.material.userData.baseOpacity ?? 1) * value; });
  }

  update(dt, elapsed = 0, { reducedMotion = false } = {}) {
    if (this.disposed) return;
    if (Math.abs(this.camera.aspect - this.lastAspect) > 0.001) this.fitCamera();
    if (this.transition) {
      const transition = this.transition; transition.elapsed += Math.max(0, dt);
      const progress = Math.min(1, transition.elapsed / transition.duration);
      if (progress >= 0.5 && !transition.switched) { transition.switched = true; this.setArea(transition.to); }
      this.applyOpacity(progress < 0.5 ? 1 - ease(progress * 2) : ease((progress - 0.5) * 2));
      if (progress >= 1 || reducedMotion) {
        if (!transition.switched) this.setArea(transition.to);
        this.applyOpacity(1); this.transition = null; transition.resolve(true);
      }
    }
    for (const actor of this.actors) {
      actor.group.position.y = actor.baseY + (reducedMotion ? 0 : Math.sin(elapsed * 1.1 + actor.index * 1.7) * 0.035);
      actor.group.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 0.7 + actor.index) * 0.009;
    }
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    if (this.transition) { this.transition.resolve(false); this.transition = null; }
    this.renderer?.domElement?.removeEventListener('pointerup', this.handlePointer);
    this.clearGroup(this.scenery); this.clearGroup(this.cast); this.scene.remove(this.group);
    for (const texture of this.textures.values()) texture.dispose(); this.textures.clear();
  }
}
