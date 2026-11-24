import * as THREE from 'three';
import type { IKart } from '../core/types';
import { ChaosClock, chooseTaxTargets, type ChaosSignal } from './chaosRules';

/** Funny disruptions are bounded, announced, and run only on the race authority. */
export class ServerChaos {
  private readonly clock = new ChaosClock();
  private reverseUntil = 0;
  private readonly banner = document.createElement('div');
  private bannerUntil = 0;
  private readonly upward = new THREE.Vector3(0, 6, 0);

  constructor(private readonly karts: readonly IKart[]) {
    this.banner.className = 'server-chaos hidden';
    this.banner.setAttribute('role', 'status');
    document.body.appendChild(this.banner);
  }

  get reverseSteering(): boolean { return this.clock.elapsed < this.reverseUntil; }
  get networkState(): { text: string; warning: boolean; reverseSteering: boolean } { return { text: this.banner.classList.contains('hidden') ? '' : this.banner.textContent ?? '', warning: this.banner.classList.contains('warning'), reverseSteering: this.reverseSteering }; }
  applyRemoteState(state: { text: string; warning: boolean }): void { this.banner.textContent = state.text; this.banner.classList.toggle('hidden', !state.text); this.banner.classList.toggle('warning', state.warning); }

  update(dt: number): void {
    for (const signal of this.clock.advance(dt)) this.run(signal);
    if (this.clock.elapsed >= this.bannerUntil) this.banner.classList.add('hidden');
  }

  private run(signal: ChaosSignal): void {
    this.banner.classList.remove('hidden');
    this.banner.classList.toggle('warning', signal.kind === 'warning');
    this.bannerUntil = this.clock.elapsed + (signal.kind === 'warning' ? 3 : signal.event.duration);
    if (signal.kind === 'warning') {
      this.banner.textContent = signal.event.warning;
      return;
    }
    this.banner.textContent = signal.event.title;
    const active = this.karts.filter(k => !k.state.finished);
    switch (signal.event.id) {
      case 'cheese': {
        const {leader,last} = chooseTaxTargets(active.map(k => k.state));
        const leadKart = active.find(k=>k.state===leader);
        leadKart?.applySquish(1.25);
        active.find(k=>k.state===last)?.applyBoost(1.25, 2, 'mushroom');
        this.banner.textContent = leadKart ? `${leadKart.state.character.name.toUpperCase()} PAID THE CHEESE TAX` : 'CHEESE TAX: EVERYONE IS IMMUNE';
        break;
      }
      case 'mic':
        for (const kart of active) if (!kart.state.isSpinning) kart.applyImpulse(this.upward);
        this.banner.textContent = 'MIC CHECK. MIKE CHECK. EVERYBODY BOUNCE.';
        break;
      case 'lag':
        this.reverseUntil = this.clock.elapsed + signal.event.duration;
        this.banner.textContent = 'LAG SWITCH: STEERING REVERSED FOR 2 SECONDS';
        break;
      case 'admin':
        for (const kart of active) kart.applyStar(signal.event.duration);
        this.banner.textContent = 'EVERYONE IS ADMIN. THIS WAS A MISTAKE.';
        break;
    }
  }

  dispose(): void { this.banner.remove(); }
}
