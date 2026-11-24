import * as THREE from 'three';
import type { IItemManager, ITrack, ItemType } from '../core/types';
import { buildItemMesh } from '../items/itemVisuals';
import type { Vec3, WireHazard } from './protocol';

/** Reuses upstream item meshes/box instances, with no guest collision, roulette or pickup simulation. */
export class RemoteItemView {
  private hazards = new Map<number, THREE.Object3D>();
  private readonly boxes: THREE.InstancedMesh[];
  private readonly base: THREE.Vector3[];
  private readonly matrix = new THREE.Matrix4();
  private readonly rotation = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly scale = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private time = 0;

  constructor(private readonly items: IItemManager, track: ITrack) {
    this.boxes = ['itemBoxes', 'itemBoxQuestion', 'itemBoxRings'].map((name) => items.object.getObjectByName(name)).filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);
    this.base = track.itemBoxPositions.map((p) => new THREE.Vector3(p.x, track.query(p).groundY + 1.05, p.z));
  }
  update(dt: number, hazards: readonly WireHazard[] = [], activeBoxes: readonly Vec3[] = []): void {
    this.time += dt;
    const alive = new Set<number>();
    for (const h of hazards) {
      alive.add(h.id);
      let mesh = this.hazards.get(h.id);
      if (!mesh) { mesh = buildItemMesh(h.type as ItemType); this.hazards.set(h.id, mesh); this.items.object.add(mesh); }
      mesh.position.set(h.position.x, h.position.y, h.position.z);
      if (h.type !== 'banana') mesh.rotation.y += dt * 8;
    }
    for (const [id, mesh] of this.hazards) if (!alive.has(id)) { mesh.removeFromParent(); this.hazards.delete(id); }
    for (let i = 0; i < this.base.length; i++) {
      const base = this.base[i]; const active = activeBoxes.find((p) => Math.abs(p.x - base.x) < .5 && Math.abs(p.z - base.z) < .5);
      for (let layer = 0; layer < this.boxes.length; layer++) {
        const mesh = this.boxes[layer]; if (i >= mesh.count) continue;
        this.point.copy(base); if (active) this.point.y = active.y;
        this.euler.set(layer === 2 ? -Math.PI / 2 : this.time * .8 + i * .73, this.time * 1.3 + i * .73, 0);
        if (layer === 2) this.point.y = base.y - 1.02;
        this.rotation.setFromEuler(this.euler); this.scale.setScalar(active ? 1 : 0); this.matrix.compose(this.point, this.rotation, this.scale); mesh.setMatrixAt(i, this.matrix);
      }
    }
    for (const mesh of this.boxes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.uTime) mesh.material.uniforms.uTime.value = this.time;
    }
  }
  dispose(): void { for (const mesh of this.hazards.values()) mesh.removeFromParent(); this.hazards.clear(); }
}
