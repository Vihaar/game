/**
 * Game: owns the renderer, scene, camera, lights, fixed-step loop and the
 * state machine. This is the only module allowed to import other workstreams'
 * concrete classes; everything is typed against the core interfaces.
 */
import * as THREE from 'three';
import type {
  CharacterDef,
  Difficulty,
  GameState,
  IAIDriver,
  IAudioEngine,
  IItemManager,
  IKart,
  InputState,
  IParticleSystem,
  IPostFX,
  ITrack,
  MusicTrack,
  RaceSettings,
  RaceStanding,
  TrackDefinition,
} from '../core/types';
import { createEmptyInput } from '../core/types';
import { events } from '../core/events';
import { COUNTDOWN_STEP_SECONDS, FIXED_DT, KART_COUNT, MAX_FRAME_DT } from '../core/constants';
import { clamp, clamp01, damp, seededRandom } from '../core/math';
import { RoomTransport, peerOptionsFromEnv, snapshotKart, snapshotHazard, kartNumbers, kartBooleans, emptyWireInput, type RaceStart, type RaceSnapshot, type WireStanding } from '../net';
import { RemoteItemView } from '../net/RemoteItemView';
import { RoomLobby } from '../ui/RoomLobby';

import { Kart } from '../kart/Kart';
import { InputManager } from '../kart/InputManager';
import { CHARACTERS, getCharacter } from '../kart/roster';
import { Track } from '../track/Track';
import { TRACKS, getTrackDef } from '../track/tracks';
import { ItemManager } from '../items/ItemManager';
import { buildItemIcon } from '../items/itemVisuals';
import { AIDriver } from '../ai/AIDriver';
import { AudioEngine } from '../audio/AudioEngine';
import { ParticleSystem } from '../fx/ParticleSystem';
import { PostFX } from '../fx/PostFX';

import { RaceManager } from './RaceManager';
import { ServerChaos } from './ServerChaos';
import { PlayerPranks } from './PlayerPranks';
import { FollowCamera } from './FollowCamera';
import { MenuBackdrop } from './MenuBackdrop';
import type { MenuFraming } from './MenuBackdrop';
import { HUD } from '../ui/HUD';
import { MainMenu } from '../ui/MainMenu';
import type { MenuPanel } from '../ui/MainMenu';
import { ResultsScreen } from '../ui/ResultsScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { LoadingScreen } from '../ui/LoadingScreen';
import { el } from '../ui/dom';
import { showToast } from '../ui/toast';

const MIN_LOADING_SECONDS = 0.8;
/** Give up waiting for async shader compilation after this long and just go. */
const MAX_COMPILE_WAIT_SECONDS = 8;
const RESULTS_DELAY_SECONDS = 1.6;
const MAX_STEPS_PER_FRAME = 8;
const SUN_DISTANCE = 90;
const SHADOW_HALF_EXTENT = 30;
const EMPTY_KARTS: readonly IKart[] = [];

function framingFor(panel: MenuPanel): MenuFraming {
  return panel === 'characterSelect' ? 'characters' : panel === 'trackSelect' ? 'tracks' : 'title';
}

interface PartialRace {
  track: ITrack | null;
  karts: IKart[];
  items: IItemManager | null;
  followCamera: FollowCamera | null;
  hud: HUD | null;
}

interface RaceContext {
  settings: RaceSettings;
  chaos: ServerChaos;
  pranks: PlayerPranks;
  trackDef: TrackDefinition;
  track: ITrack;
  karts: IKart[];
  aiDrivers: IAIDriver[];
  playerAutoDriver: IAIDriver | null;
  items: IItemManager;
  raceManager: RaceManager;
  followCamera: FollowCamera;
  hud: HUD;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** Soft camera-following fill so karts read on dark tracks (0 intensity on bright ones). */
  fill: THREE.DirectionalLight;
  fog: THREE.FogExp2 | null;
  background: THREE.Color;
  unsubs: (() => void)[];
  resultsTimer: number;
  baseCharacters: CharacterDef[];
  remoteItems: RemoteItemView | null;
}

export class Game {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly uiRoot: HTMLElement;

  private readonly input: InputManager;
  private readonly audio: IAudioEngine;
  private readonly particles: IParticleSystem;
  private readonly postfx: IPostFX;
  private postfxOk = true;

  private readonly backdrop: MenuBackdrop;
  private readonly mainMenu: MainMenu;
  private readonly results: ResultsScreen;
  private readonly pauseMenu: PauseMenu;
  private readonly loading: LoadingScreen;
  private readonly muteIndicator: HTMLElement;
  private readonly room: RoomTransport;
  private readonly lobby: RoomLobby;
  private readonly roomLaunch: HTMLButtonElement;
  private onlineStart: RaceStart | null = null;
  private latestSnapshot: RaceSnapshot | null = null;
  private onlineStandings: WireStanding[] | null = null;
  private remoteRaceTime = 0;
  private snapshotSequence = 0;
  private lastSnapshotSent = -Infinity;
  private readySent = false;
  private lastRemoteCountdown = -1;
  private remoteHasRaced = false;
  private receivedPose = false;
  private readonly remoteQuaternion = new THREE.Quaternion();
  private backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private backgroundTime = 0;

  private state: GameState = 'boot';
  private prePauseState: GameState = 'racing';
  private race: RaceContext | null = null;
  private pendingSettings: RaceSettings | null = null;
  private loadingElapsed = 0;
  private loadingFrames = 0;
  private loadingProgress = 0;
  private shadersReady = false;

  private rafId = 0;
  private lastTime = -1;
  private elapsed = 0;
  private accumulator = 0;
  private pendingUseItem = false;
  private currentMusic: MusicTrack = 'none';
  private audioStarted = false;
  private disposed = false;

  private readonly playerInput: InputState = createEmptyInput();
  private readonly unsubs: (() => void)[] = [];
  private readonly sunDir = new THREE.Vector3(0.4, 0.8, 0.3);
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();
  private speedFx = 0;
  private boostFx = 0;
  private hitFx = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // ---------------------------------------------------------- renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'game-canvas';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
    this.camera.position.set(0, 3, 8);
    this.scene.add(this.camera);

    this.uiRoot = el('div', '', undefined, container);
    this.uiRoot.id = 'ui';

    // ---------------------------------------------------------- systems
    this.input = new InputManager();
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.object);
    this.postfx = new PostFX();
    try {
      this.postfx.init(this.renderer, this.scene, this.camera);
    } catch (err) {
      console.error('[Game] PostFX init failed, using plain rendering', err);
      this.postfxOk = false;
    }

    // ---------------------------------------------------------- ui
    this.backdrop = new MenuBackdrop();
    this.mainMenu = new MainMenu(this.uiRoot, CHARACTERS as readonly CharacterDef[], TRACKS as readonly TrackDefinition[]);
    this.mainMenu.onHighlight = (id) => this.backdrop.setCharacter(getCharacter(id));
    this.mainMenu.onPanelChange = (panel) => this.onMenuPanel(panel);
    this.mainMenu.onStart = (settings) => this.startRace(settings);

    this.results = new ResultsScreen(this.uiRoot);
    this.results.onRaceAgain = () => {
      if (this.onlineStart) { if (this.room.isHost) this.room.restart(); else this.openLobby(); return; }
      if (this.race) this.startRace(this.race.settings);
    };
    this.results.onChangeTrack = () => { if (this.onlineStart) { if (this.room.isHost) this.room.restart(); else this.openLobby(); } else this.returnToMenu('trackSelect'); };
    this.results.onMainMenu = () => this.returnToMenu('title');

    this.pauseMenu = new PauseMenu(this.uiRoot);
    this.pauseMenu.onResume = () => this.resume();
    this.pauseMenu.onRestart = () => {
      if (this.onlineStart) { this.leavePause(); if (this.room.isHost) this.room.restart(); else this.openLobby(); return; }
      const settings = this.race?.settings;
      this.leavePause();
      if (settings) this.startRace(settings);
      else this.returnToMenu('title');
    };
    this.pauseMenu.onQuit = () => {
      this.leavePause();
      this.returnToMenu('title');
    };

    this.loading = new LoadingScreen(this.uiRoot);
    this.muteIndicator = el('div', 'mute-indicator', '🔇 MUTED', this.uiRoot);

    this.room = new RoomTransport({
      onState: (status) => { this.lobby?.setStatus(status); this.refreshRoomButton(); },
      onRoster: (roster, settings) => {
        this.lobby.setRoom(this.room.roomCode, roster, settings, this.room.isHost, this.room.status === 'racing' || this.room.status === 'results');
        if (this.race && this.onlineStart) this.updateOnlineRoster(this.race);
        this.refreshRoomButton();
      },
      onWelcome: () => { this.mainMenu.hide(); this.refreshRoomButton(); },
      onStart: (start) => {
        this.onlineStart = start; this.latestSnapshot = null; this.onlineStandings = null; this.remoteRaceTime = 0;
        this.snapshotSequence = 0; this.lastSnapshotSent = -Infinity; this.readySent = false; this.receivedPose = false; this.remoteHasRaced = false; this.lastRemoteCountdown = -1;
        this.lobby.hide(); this.startRace(start.settings);
      },
      onSnapshot: (snapshot) => { this.latestSnapshot = snapshot; if (this.race && this.state !== 'loading') this.applyRemoteSnapshot(snapshot); },
      onResults: (standings) => { this.onlineStandings = standings; if (this.race && this.state !== 'loading') this.showOnlineResults(standings); },
      onRestart: () => { this.onlineStart = null; this.latestSnapshot = null; this.onlineStandings = null; this.disposeRace(); this.showMenu('title'); this.mainMenu.hide(); this.lobby.show(); },
      onPlayerLeft: (player) => { showToast(`${player.name} left. Their Mike is now a bot.`, 'info'); },
      onError: (error) => {
        this.lobby.message(error.message, true);
        if (this.room.status === 'disconnected') { this.onlineStart = null; this.latestSnapshot = null; this.disposeRace(); this.showMenu('title'); this.mainMenu.hide(); this.lobby.show(); }
        if (this.room.status === 'error' && !this.onlineStart) this.lobby.show();
      },
    }, { peerOptions: peerOptionsFromEnv(import.meta.env), allowedCharacterIds: CHARACTERS.map((c) => c.id), allowedTrackIds: TRACKS.map((t) => t.id) });
    this.lobby = new RoomLobby(this.uiRoot, CHARACTERS, TRACKS, {
      create: (profile, settings) => this.room.create(profile, settings),
      join: (code, profile) => this.room.join(code, profile),
      profile: (profile) => this.room.updateProfile(profile),
      settings: (settings) => this.room.updateSettings(settings),
      start: () => this.room.startRace(), restart: () => this.room.restart(),
      close: () => { this.lobby.hide(); if (!this.onlineStart && this.room.status !== 'lobby') this.mainMenu.show('title'); },
      leave: () => this.returnToMenu('title'),
    });
    this.roomLaunch = el('button', 'room-launch', 'PLAY WITH FRIENDS', this.uiRoot) as HTMLButtonElement;
    this.roomLaunch.type = 'button'; this.roomLaunch.addEventListener('click', () => this.openLobby());

    // ---------------------------------------------------------- listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('pointerdown', this.onGesture, { passive: true });
    window.addEventListener('keydown', this.onGesture);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.onResize();
  }

  // ------------------------------------------------------------------ public

  start(): void {
    if (this.state !== 'boot') return;
    this.showMenu('title');
    const invite = new URLSearchParams(location.search).get('room');
    if (invite) { this.mainMenu.hide(); this.lobby.show(invite); }
    this.lastTime = -1;
    this.rafId = requestAnimationFrame(this.loop);
  }

  get currentState(): GameState {
    return this.state;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    if (this.backgroundTimer) clearInterval(this.backgroundTimer);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('pointerdown', this.onGesture);
    window.removeEventListener('keydown', this.onGesture);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    this.disposeRace();
    this.backdrop.detach(this.scene);
    this.backdrop.dispose();
    this.mainMenu.dispose();
    this.room.dispose(); this.lobby.dispose(); this.roomLaunch.remove();
    this.results.dispose();
    this.pauseMenu.dispose();
    this.loading.dispose();
    this.muteIndicator.remove();
    this.input.dispose();
    this.safe(() => this.audio.dispose());
    this.safe(() => this.particles.dispose());
    this.safe(() => this.postfx.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.uiRoot.remove();
  }

  // ------------------------------------------------------------- main loop

  private readonly loop = (now: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    if (this.lastTime < 0) this.lastTime = now;
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    // WebRTC host simulation has its own timer while the renderer is backgrounded.
    if (document.hidden && this.onlineStart && this.room.isHost) return;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    if (dt < 0) dt = 0;
    this.elapsed += dt;

    const input = this.input.update();
    try {
      this.frame(dt, input);
    } catch (err) {
      console.error('[Game] frame error', err);
      events.emit('ui:error', {});
    }
  };

  private frame(dt: number, input: InputState): void {
    switch (this.state) {
      case 'boot':
        return;
      case 'title':
      case 'characterSelect':
      case 'trackSelect':
        if (!this.lobby.visible && this.room.status !== 'lobby') this.mainMenu.handleInput(input);
        if (this.room.status === 'lobby' && !this.lobby.visible) this.lobby.show();
        this.backdrop.update(dt, this.camera);
        this.particles.update(dt, EMPTY_KARTS, this.camera);
        this.audio.update(dt, EMPTY_KARTS, -1, this.camera);
        this.render(dt);
        return;
      case 'loading':
        this.frameLoading(dt);
        return;
      case 'countdown':
      case 'racing':
      case 'finished':
        if (this.onlineStart) {
          if (input.pause) { if (this.lobby.visible) this.lobby.hide(); else this.openLobby(); }
          this.simulate(dt, this.lobby.visible ? createEmptyInput() : input);
          this.renderRace(dt, !this.lobby.visible && input.lookBack); return;
        }
        if (input.pause) {
          this.pause();
          this.render(dt);
          return;
        }
        this.simulate(dt, input);
        this.renderRace(dt, this.state === 'racing' && input.lookBack);
        return;
      case 'paused':
        this.pauseMenu.handleInput(input);
        if (input.pause && this.state === 'paused') this.resume();
        this.render(dt);
        return;
      case 'results':
        if (!this.lobby.visible) this.results.handleInput(input);
        if (this.race && this.state === 'results') {
          // Keep the world alive behind the results panel.
          this.simulate(dt, input);
          this.renderRace(dt, false);
        } else {
          this.render(dt);
        }
        return;
    }
  }

  private frameLoading(dt: number): void {
    this.loading.update(dt);
    this.loadingElapsed += dt;
    this.loadingFrames++;
    // Give the loading screen a frame to paint before the synchronous build.
    if (!this.race && this.loadingFrames >= 2 && this.pendingSettings) {
      const settings = this.pendingSettings;
      try {
        this.buildRace(settings);
      } catch (err) {
        console.error('[Game] failed to build race', err);
        showToast('Could not build the race. Check the console for details.', 'error');
        this.pendingSettings = null;
        if (this.onlineStart) { this.room.leave(); this.onlineStart = null; this.latestSnapshot = null; }
        this.loading.hide();
        this.showMenu('title');
        return;
      }
      this.warmShaders();
    }

    // Fake progress creeps toward 90% while shaders compile off-thread, then snaps to 100%.
    const ready = this.race !== null && (this.shadersReady || this.loadingElapsed > MAX_COMPILE_WAIT_SECONDS);
    const target = !this.race ? 0.12 : ready ? 1 : 0.9;
    this.loadingProgress = damp(this.loadingProgress, target, ready ? 14 : 1.4, dt);
    this.loading.setProgress(this.loadingProgress);

    if (this.race && ready) {
      // Warm the remaining passes (shadow depth, post-processing) behind the overlay.
      this.renderRace(dt, false);
      if (this.onlineStart && !this.readySent) { this.room.markReady(); this.readySent = true; }
      if (this.loadingElapsed >= MIN_LOADING_SECONDS && this.loadingProgress > 0.985 && (!this.onlineStart || !this.room.isHost || this.room.allReady)) this.enterCountdown();
    }
  }

  /** Kick off parallel shader compilation for the freshly built race scene. */
  private warmShaders(): void {
    const r = this.race;
    this.shadersReady = false;
    if (!r) return;
    const renderer = this.renderer as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    if (typeof renderer.compileAsync !== 'function') {
      this.shadersReady = true;
      return;
    }
    let promise: Promise<unknown>;
    try {
      promise = renderer.compileAsync.call(this.renderer, this.scene, this.camera);
    } catch (err) {
      console.warn('[Game] compileAsync threw; falling back to synchronous compile', err);
      this.shadersReady = true;
      return;
    }
    const done = (): void => {
      if (this.race === r) this.shadersReady = true;
    };
    promise.then(done, (err: unknown) => {
      console.warn('[Game] compileAsync failed; falling back to synchronous compile', err);
      done();
    });
  }

  private simulate(dt: number, input: InputState): void {
    const r = this.race;
    if (!r) return;
    if (this.onlineStart && !this.room.isHost) {
      this.room.sendInput(input); this.interpolateRemote(dt); return;
    }
    if (input.useItem) this.pendingUseItem = true;
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_DT, r, input, this.pendingUseItem);
      this.pendingUseItem = false;
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.accumulator = 0;
    if (this.onlineStart && this.room.isHost && performance.now() - this.lastSnapshotSent >= 50 && this.room.status === 'racing') {
      this.lastSnapshotSent = performance.now();
      this.room.broadcastSnapshot({ raceId: this.room.raceId, sequence: this.snapshotSequence++, raceTime: r.raceManager.raceTime, phase: r.raceManager.currentPhase, countdown: r.raceManager.countdownRemaining,
        karts: r.karts.map((k) => snapshotKart(k.state)), hazards: r.items.getHazards().map(snapshotHazard), activeBoxes: r.items.getActiveBoxPositions().map((p) => ({ x: p.x, y: p.y, z: p.z })), chaos: r.chaos.networkState });
    }
  }

  private step(dt: number, r: RaceContext, input: InputState, useItem: boolean): void {
    const { track, karts, items } = r;
    const player = karts[0];

    if (this.onlineStart) {
      for (const kart of karts) {
        const human = this.room.roster.some((p) => p.slot === kart.state.id);
        if (human && !kart.state.finished) {
          const controls = kart.state.id === 0 ? { ...input, useItem } : this.room.consumeInput(kart.state.id);
          kart.setInput({ ...createEmptyInput(), ...controls, steer: r.chaos.reverseSteering ? -controls.steer : controls.steer, pause: false });
        } else {
          const controls = r.aiDrivers[kart.state.id].update(dt, track, karts, items, player);
          if (r.chaos.reverseSteering) kart.setInput({ ...controls, steer: -controls.steer });
        }
      }
    } else {

    // Player input (or auto-drive after finishing).
    if (r.playerAutoDriver) {
      r.playerAutoDriver.update(dt, track, karts, items, null);
    } else {
      const p = this.playerInput;
      p.throttle = input.throttle;
      p.brake = input.brake;
      p.steer = r.chaos.reverseSteering ? -input.steer : input.steer;
      p.drift = input.drift;
      p.useItem = useItem;
      p.useItemHeld = input.useItemHeld;
      p.lookBack = input.lookBack;
      p.pause = false;
      p.confirm = false;
      p.back = false;
      p.menuUp = false;
      p.menuDown = false;
      p.menuLeft = false;
      p.menuRight = false;
      player.setInput(p);
    }

    for (let i = 1; i < r.aiDrivers.length; i++) {
      const controls = r.aiDrivers[i].update(dt, track, karts, items, player);
      if (r.chaos.reverseSteering) r.aiDrivers[i].kart.setInput({ ...controls, steer: -controls.steer });
    }
    }

    for (let i = 0; i < karts.length; i++) {
      karts[i].update(dt, track, karts);
    }

    for (let i = 0; i < karts.length; i++) {
      const k = karts[i];
      const inp = k.input;
      if (inp.useItem && !k.state.itemRouletteActive && k.state.item !== 'none') {
        items.requestUse(k, inp.brake > 0.5 || inp.lookBack);
      }
    }

    items.update(dt);
    r.raceManager.update(dt);
    if (r.raceManager.currentPhase === 'racing') r.chaos.update(dt);
  }

  private renderRace(dt: number, lookBack: boolean): void {
    const r = this.race;
    if (!r) {
      this.render(dt);
      return;
    }
    const player = r.karts[this.onlineStart ? Math.max(0, this.room.localSlot) : 0];
    if (this.onlineStart && !this.room.isHost) r.remoteItems?.update(dt, this.latestSnapshot?.hazards, this.latestSnapshot?.activeBoxes);
    for (let i = 0; i < r.karts.length; i++) r.karts[i].updateVisuals(dt);
    r.track.update(dt, this.elapsed);
    r.followCamera.update(dt, player, lookBack);
    this.updateSun(r, player);
    this.particles.update(dt, r.karts, this.camera);
    this.audio.update(dt, r.karts, player.state.id, this.camera);
    r.hud.update(dt, player, r.karts, this.onlineStart && !this.room.isHost ? this.remoteRaceTime : r.raceManager.raceTime, r.raceManager.totalLaps);
    r.pranks.update(player, this.onlineStart && !this.room.isHost ? this.remoteRaceTime : r.raceManager.raceTime, dt);
    this.updatePostFxFeel(dt, player);

    if (!this.onlineStart && this.state === 'finished' && r.resultsTimer > 0) {
      r.resultsTimer -= dt;
      if (r.resultsTimer <= 0) this.enterResults();
    }
    this.render(dt);
  }

  private render(dt: number): void {
    if (this.postfxOk) {
      try {
        this.postfx.render(dt);
        return;
      } catch (err) {
        console.error('[Game] PostFX render failed; falling back to plain rendering', err);
        this.postfxOk = false;
        this.safe(() => this.postfx.setEnabled(false));
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  private updateSun(r: RaceContext, player: IKart): void {
    const p = player.state.position;
    // Snap the shadow frustum to a coarse grid to avoid edge shimmer while driving.
    const snap = 2;
    this.tmpA.set(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, Math.round(p.z / snap) * snap);
    r.sun.target.position.copy(this.tmpA);
    r.sun.position.copy(this.tmpA).addScaledVector(this.sunDir, SUN_DISTANCE);

    // Fill light shines from just above the camera toward the player kart.
    if (r.fill.visible) {
      r.fill.position.copy(this.camera.position);
      r.fill.position.y += 2;
      r.fill.target.position.copy(p);
    }
  }

  private updatePostFxFeel(dt: number, player: IKart): void {
    if (!this.postfxOk) return;
    const s = player.state;
    const top = Math.max(1, player.topSpeed());
    const speedTarget = clamp01((Math.abs(s.speed) - top * 0.55) / (top * 0.9));
    const boostTarget = s.isBoosting ? clamp01(0.45 + s.boostStrength) : s.isInvincible ? 0.35 : 0;
    this.speedFx = damp(this.speedFx, speedTarget, 5, dt);
    this.boostFx = damp(this.boostFx, boostTarget, s.isBoosting ? 12 : 4, dt);
    if (this.hitFx > 0) {
      this.hitFx = damp(this.hitFx, 0, 3, dt);
      if (this.hitFx < 0.005) this.hitFx = 0;
    }
    this.postfx.setSpeedEffect(this.speedFx);
    this.postfx.setBoostEffect(this.boostFx);
    this.postfx.setHitEffect(this.hitFx);
  }

  // ------------------------------------------------------------ state flow

  private setState(next: GameState): void {
    if (next === this.state) return;
    const from = this.state;
    this.state = next;
    this.uiRoot.dataset.state = next;
    this.refreshRoomButton();
    events.emit('game:stateChange', { from, to: next });
  }

  private showMenu(panel: MenuPanel): void {
    this.results.hide();
    this.pauseMenu.hide();
    this.loading.hide();
    this.backdrop.setCharacter(this.mainMenu.highlightedCharacter);
    this.backdrop.setFraming(framingFor(panel), true);
    this.backdrop.attach(this.scene, this.camera, this.renderer);
    this.mainMenu.show(panel);
    this.setState(panel);
    this.playMusic('menu');
  }

  private onMenuPanel(panel: MenuPanel): void {
    if (this.state === 'title' || this.state === 'characterSelect' || this.state === 'trackSelect') {
      this.setState(panel);
      this.backdrop.setFraming(framingFor(panel));
    }
  }

  private returnToMenu(panel: MenuPanel): void {
    this.room.leave(); this.onlineStart = null; this.latestSnapshot = null; this.onlineStandings = null; this.lobby.hide();
    this.disposeRace();
    this.showMenu(panel);
  }

  private startRace(settings: RaceSettings): void {
    this.disposeRace();
    this.backdrop.detach(this.scene);
    this.mainMenu.hide();
    this.results.hide();
    this.pauseMenu.hide();
    this.safe(() => this.particles.reset());

    let trackDef: TrackDefinition;
    try {
      trackDef = getTrackDef(settings.trackId) as TrackDefinition;
    } catch {
      trackDef = TRACKS[0] as TrackDefinition;
    }
    if (!trackDef) {
      showToast('No tracks are available yet.', 'error');
      this.showMenu('title');
      return;
    }
    this.pendingSettings = { ...settings, trackId: trackDef.id };
    this.loadingElapsed = 0;
    this.loadingFrames = 0;
    this.loadingProgress = 0;
    this.shadersReady = false;
    this.loading.show(trackDef);
    this.scene.background = new THREE.Color(0x0b0b1a);
    this.scene.fog = null;
    this.setState('loading');
  }

  private buildRace(settings: RaceSettings): void {
    // Partially constructed pieces, cleaned up if a later constructor throws.
    const partial: PartialRace = { track: null, karts: [], items: null, followCamera: null, hud: null };
    try {
      this.buildRaceInner(settings, partial);
    } catch (err) {
      const { hud, followCamera, items, karts, track } = partial;
      if (hud) this.safe(() => hud.dispose());
      if (followCamera) this.safe(() => followCamera.dispose());
      if (items) this.safe(() => items.dispose());
      for (const k of karts) this.safe(() => k.dispose());
      if (track) this.safe(() => track.dispose());
      throw err;
    }
  }

  private buildRaceInner(settings: RaceSettings, partial: PartialRace): void {
    const trackDef = getTrackDef(settings.trackId) as TrackDefinition;
    const track: ITrack = new Track(trackDef);
    partial.track = track;
    const env = trackDef.environment;
    const karts = partial.karts;

    // Karts: player 0 with the chosen character, AI 1..7 with the rest shuffled.
    let playerChar: CharacterDef;
    try {
      playerChar = getCharacter(settings.characterId) as CharacterDef;
    } catch {
      playerChar = CHARACTERS[0] as CharacterDef;
    }
    const others = (CHARACTERS as readonly CharacterDef[]).filter((c) => c.id !== playerChar.id);
    const random = this.onlineStart ? seededRandom(this.onlineStart.seed) : Math.random;
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = others[i];
      others[i] = others[j];
      others[j] = t;
    }
    const baseCharacters = [playerChar, ...Array.from({ length: KART_COUNT - 1 }, (_, i) => others.length > 0 ? others[i % others.length] : playerChar)];
    for (let id = 0; id < KART_COUNT; id++) {
      const remote = this.onlineStart ? this.room.roster.find((p) => p.slot === id) : undefined;
      const def = remote ? { ...getCharacter(remote.characterId), name: remote.name } : baseCharacters[id];
      karts.push(new Kart(id, def, id === (this.onlineStart ? this.room.localSlot : 0)));
    }

    const difficulty: Difficulty = settings.difficulty;
    const aiDrivers: IAIDriver[] = [];
    for (let id = 0; id < karts.length; id++) {
      aiDrivers.push(new AIDriver(karts[id], difficulty, id));
    }

    const items: IItemManager = new ItemManager(this.particles);
    partial.items = items;
    items.init(track, karts);

    const raceManager = new RaceManager(track, karts, settings);
    if (this.onlineStart) raceManager.setHumanSlots(this.room.roster.map((p) => p.slot));
    const followCamera = new FollowCamera(this.camera);
    partial.followCamera = followCamera;
    followCamera.setTrack(track);

    const hud = new HUD(this.uiRoot, buildItemIcon);
    partial.hud = hud;
    hud.setTrack(track);

    // Lights from the track environment.
    const sun = new THREE.DirectionalLight(env.sunColor, env.sunIntensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -SHADOW_HALF_EXTENT;
    sc.right = SHADOW_HALF_EXTENT;
    sc.top = SHADOW_HALF_EXTENT;
    sc.bottom = -SHADOW_HALF_EXTENT;
    sc.near = 1;
    sc.far = SUN_DISTANCE + SHADOW_HALF_EXTENT * 3;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this.sunDir.set(env.sunDirection.x, env.sunDirection.y, env.sunDirection.z);
    if (this.sunDir.lengthSq() < 1e-6) this.sunDir.set(0.4, 0.8, 0.3);
    if (this.sunDir.y < 0) this.sunDir.y = -this.sunDir.y;
    if (this.sunDir.y < 0.15) this.sunDir.y = 0.15;
    this.sunDir.normalize();
    const hemi = new THREE.HemisphereLight(env.ambientSky, env.ambientGround, env.ambientIntensity);
    // Camera-following fill: strong on dim night tracks, zero on sunny ones.
    const darkness =
      clamp(0.9 - env.ambientIntensity, 0, 0.6) + clamp((1.6 - env.sunIntensity) * 0.3, 0, 0.3);
    const fill = new THREE.DirectionalLight(0xd9e4ff, darkness);
    fill.castShadow = false;
    fill.visible = darkness > 0.01;
    const fog = env.fogDensity > 0 ? new THREE.FogExp2(env.fogColor, env.fogDensity) : null;
    const background = new THREE.Color(env.skyHorizon);

    this.scene.add(track.object);
    for (const k of karts) this.scene.add(k.object);
    this.scene.add(items.object);
    this.scene.add(sun, sun.target, hemi, fill, fill.target);
    this.scene.fog = fog;
    this.scene.background = background;

    const r: RaceContext = {
      settings,
      chaos: new ServerChaos(karts),
      pranks: new PlayerPranks(),
      trackDef,
      track,
      karts,
      aiDrivers,
      playerAutoDriver: null,
      items,
      raceManager,
      followCamera,
      hud,
      sun,
      hemi,
      fill,
      fog,
      background,
      unsubs: [],
      resultsTimer: 0,
      baseCharacters,
      remoteItems: this.onlineStart && !this.room.isHost ? new RemoteItemView(items, track) : null,
    };
    this.race = r;
    this.accumulator = 0;
    this.pendingUseItem = false;
    this.speedFx = 0;
    this.boostFx = 0;
    this.hitFx = 0;

    if (import.meta.env.DEV) {
      // Dev-only: `?auto=1` lets the AI drive the player for soak testing.
      if (new URLSearchParams(location.search).has('auto')) {
        r.playerAutoDriver = new AIDriver(karts[0], 'hard', 0);
      }
      (window as unknown as { __tkr?: unknown }).__tkr = {
        game: this,
        getRace: () => this.race,
        renderer: this.renderer,
        events,
        room: this.room,
        lobby: this.lobby,
      };
    }

    // Sync visuals once so the first rendered frame is sane.
    for (const k of karts) k.updateVisuals(0);
    const local = karts[this.onlineStart ? Math.max(0, this.room.localSlot) : 0];
    followCamera.snapTo(local);
    this.updateSun(r, local);

    r.unsubs.push(
      events.on('race:start', () => {
        if (this.race === r && this.state === 'countdown') this.setState('racing');
      }),
      events.on('race:lap', (e) => {
        if (this.race !== r || !e.isPlayer) return;
        if (e.isFinalLap) this.playMusic('finalLap');
      }),
      events.on('race:finish', (e) => {
        if (this.race !== r || !e.isPlayer) return;
        this.onPlayerFinished(r);
      }),
      events.on('race:allFinished', () => {
        if (this.race !== r) return;
        if (this.onlineStart) { if (this.room.isHost) this.enterResults(); return; }
        if (this.state === 'finished') r.resultsTimer = RESULTS_DELAY_SECONDS;
        else if (this.state === 'racing' || this.state === 'countdown') this.enterResults();
      }),
      events.on('item:hit', (e) => {
        if (this.race !== r || !e.isPlayer) return;
        this.hitFx = 1;
      }),
      events.on('item:lightning', () => {
        if (this.race !== r || !this.postfxOk) return;
        this.safe(() => this.postfx.flash(0xffffff, 0.3));
      }),
    );
  }

  private enterCountdown(): void {
    const r = this.race;
    if (!r) return;
    this.pendingSettings = null;
    this.loading.hide();
    r.hud.show();

    // Cinematic: wide shot of the grid swooping into the chase position.
    const grid = r.track.startGrid;
    const center = this.tmpA.set(0, 0, 0);
    const n = Math.min(grid.length, KART_COUNT);
    if (n > 0) {
      for (let i = 0; i < n; i++) center.add(grid[i].position);
      center.multiplyScalar(1 / n);
    } else {
      center.copy(r.karts[0].state.position);
    }
    const forward = this.tmpB;
    r.karts[0].forwardDir(forward);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.y = 0;
    forward.normalize();
    const right = this.tmpC.set(-forward.z, 0, forward.x);
    const from = center.clone().addScaledVector(forward, 18).addScaledVector(right, 11);
    from.y += 6.5;
    const look = center.clone();
    look.y += 0.8;
    r.followCamera.setCinematic(from, look, 3 * COUNTDOWN_STEP_SECONDS, 46);

    if (!this.onlineStart || this.room.isHost) r.raceManager.startCountdown();
    this.setState('countdown');
    this.playMusic('race');
    if (this.onlineStart && !this.room.isHost && this.latestSnapshot) this.applyRemoteSnapshot(this.latestSnapshot);
    if (this.onlineStandings) this.showOnlineResults(this.onlineStandings);
  }

  private onPlayerFinished(r: RaceContext): void {
    if (this.state !== 'racing' && this.state !== 'countdown') return;
    if (this.onlineStart) { this.setState('finished'); if (this.postfxOk) this.safe(() => this.postfx.flash(0xffffff, .35)); return; }
    try {
      r.playerAutoDriver = new AIDriver(r.karts[0], 'normal', 0);
    } catch (err) {
      console.warn('[Game] could not create auto-driver for the player', err);
      r.playerAutoDriver = null;
    }
    if (this.postfxOk) this.safe(() => this.postfx.flash(0xffffff, 0.35));
    this.setState('finished');
    if (r.raceManager.allFinished) r.resultsTimer = RESULTS_DELAY_SECONDS;
  }

  private enterResults(): void {
    const r = this.race;
    if (!r || this.state === 'results') return;
    if (this.onlineStart) { if (this.room.isHost) this.room.broadcastResults(r.raceManager.getStandings()); return; }
    r.hud.hide();
    this.results.show(r.raceManager.getStandings());
    this.setState('results');
    this.playMusic('results');
  }

  private pause(): void {
    if (this.onlineStart) { this.openLobby(); return; }
    if (this.state !== 'countdown' && this.state !== 'racing' && this.state !== 'finished') return;
    this.prePauseState = this.state;
    this.setState('paused');
    this.pauseMenu.show();
    events.emit('game:pause', {});
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.pauseMenu.hide();
    this.accumulator = 0;
    this.pendingUseItem = false;
    this.setState(this.prePauseState);
    events.emit('game:resume', {});
  }

  /** Leave the paused state without returning to the race (restart / quit). */
  private leavePause(): void {
    this.pauseMenu.hide();
    if (this.state === 'paused') {
      // Other systems may have ducked audio / frozen timers on game:pause.
      events.emit('game:resume', {});
    }
  }

  private disposeRace(): void {
    const r = this.race;
    if (!r) return;
    this.race = null;
    for (const u of r.unsubs) u();
    r.unsubs.length = 0;

    this.scene.remove(r.track.object);
    for (const k of r.karts) this.scene.remove(k.object);
    this.scene.remove(r.items.object);
    this.scene.remove(r.sun, r.sun.target, r.hemi, r.fill, r.fill.target);
    r.sun.dispose();
    r.hemi.dispose();
    r.fill.dispose();
    this.scene.fog = null;

    r.remoteItems?.dispose();
    this.safe(() => r.items.dispose());
    for (const k of r.karts) this.safe(() => k.dispose());
    this.safe(() => r.track.dispose());
    r.chaos.dispose();
    r.pranks.dispose();
    r.raceManager.dispose();
    r.followCamera.dispose();
    r.hud.dispose();
    this.safe(() => this.particles.reset());
    if (this.postfxOk) {
      this.safe(() => {
        this.postfx.setSpeedEffect(0);
        this.postfx.setBoostEffect(0);
        this.postfx.setHitEffect(0);
      });
    }
    this.accumulator = 0;
    this.pendingUseItem = false;
  }

  // --------------------------------------------------------- online rooms

  private openLobby(): void {
    if (!this.onlineStart) this.mainMenu.hide();
    if (this.room.settings) this.lobby.setRoom(this.room.roomCode, this.room.roster, this.room.settings, this.room.isHost, Boolean(this.onlineStart));
    this.lobby.show();
  }

  private refreshRoomButton(): void {
    if (!this.roomLaunch) return;
    const connected = this.room && ['lobby', 'racing', 'results'].includes(this.room.status);
    this.roomLaunch.textContent = connected ? `ROOM ${this.room.roomCode} · ${this.room.roster.length}/8` : 'PLAY WITH FRIENDS';
    this.roomLaunch.hidden = !connected && !['title', 'characterSelect', 'trackSelect'].includes(this.state);
  }

  private updateOnlineRoster(r: RaceContext): void {
    for (const kart of r.karts) {
      const profile = this.room.roster.find((p) => p.slot === kart.state.id);
      const character = profile ? { ...getCharacter(profile.characterId), name: profile.name } : r.baseCharacters[kart.state.id];
      if (kart instanceof Kart) kart.setCharacter(character);
    }
    if (this.room.isHost) r.raceManager.setHumanSlots(this.room.roster.map((p) => p.slot));
  }

  private applyRemoteSnapshot(snapshot: RaceSnapshot): void {
    const r = this.race;
    if (!r || !this.onlineStart || this.room.isHost) return;
    this.remoteRaceTime = snapshot.raceTime;
    for (const wire of snapshot.karts) {
      const kart = r.karts[wire.id]; if (!kart) continue;
      const state = kart.state; const oldLap = state.lap; const oldFinished = state.finished; const oldSpin = state.isSpinning;
      const target = state as unknown as Record<string, unknown>;
      // Explicit, versioned field allowlists: arbitrary remote fields never touch game objects.
      for (const field of kartNumbers) target[field] = wire[field];
      for (const field of kartBooleans) target[field] = wire[field];
      state.item = wire.item as typeof state.item; state.surface = wire.surface as typeof state.surface;
      state.velocity.set(wire.velocity.x, wire.velocity.y, wire.velocity.z);
      if (!this.receivedPose || state.position.distanceToSquared(wire.position as THREE.Vector3) > 2500) {
        state.position.set(wire.position.x, wire.position.y, wire.position.z); state.quaternion.set(wire.quaternion.x, wire.quaternion.y, wire.quaternion.z, wire.quaternion.w);
      }
      if (wire.id === this.room.localSlot) {
        if (state.lap > oldLap && !state.finished) events.emit('race:lap', { kartId: wire.id, lap: state.lap, totalLaps: r.settings.laps, isPlayer: true, isFinalLap: state.lap === r.settings.laps });
        if (!oldSpin && state.isSpinning) { this.hitFx = 1; events.emit('item:hit', { kartId: wire.id, item: 'green_shell', sourceKartId: -1, isPlayer: true, position: state.position }); }
        if (!oldFinished && state.finished) events.emit('race:finish', { kartId: wire.id, place: state.place, time: state.finishTime, isPlayer: true });
      }
    }
    this.receivedPose = true;
    if (snapshot.chaos) r.chaos.applyRemoteState(snapshot.chaos);
    if (snapshot.phase === 'countdown') {
      const count = Math.ceil(snapshot.countdown ?? 3);
      if (count > 0 && count !== this.lastRemoteCountdown) { this.lastRemoteCountdown = count; events.emit('race:countdown', { count }); }
    }
    if (snapshot.phase === 'racing' && !this.remoteHasRaced) {
      this.remoteHasRaced = true; if (this.state === 'countdown') this.setState('racing');
      events.emit('race:start', { trackId: r.settings.trackId });
    }
  }

  private interpolateRemote(dt: number): void {
    const r = this.race, snapshot = this.latestSnapshot; if (!r || !snapshot || this.room.isHost) return;
    const alpha = 1 - Math.exp(-24 * dt);
    for (const wire of snapshot.karts) {
      const state = r.karts[wire.id]?.state; if (!state) continue;
      this.tmpA.set(wire.position.x, wire.position.y, wire.position.z); state.position.lerp(this.tmpA, alpha);
      this.remoteQuaternion.set(wire.quaternion.x, wire.quaternion.y, wire.quaternion.z, wire.quaternion.w); state.quaternion.slerp(this.remoteQuaternion, alpha);
    }
  }

  private showOnlineResults(standings: readonly WireStanding[]): void {
    const r = this.race; if (!r || !this.onlineStart) return;
    r.hud.hide(); this.lobby.hide();
    const local: RaceStanding[] = standings.map((row) => ({ ...row, isPlayer: row.kartId === this.room.localSlot }));
    this.results.show(local); this.setState('results'); this.playMusic('results');
  }

  // ---------------------------------------------------------------- audio

  private playMusic(track: MusicTrack): void {
    this.currentMusic = track;
    this.safe(() => this.audio.playMusic(track));
  }

  private readonly onGesture = (): void => {
    if (this.audioStarted) return;
    this.audioStarted = true;
    window.removeEventListener('pointerdown', this.onGesture);
    window.removeEventListener('keydown', this.onGesture);
    this.audio
      .init()
      .then(() => {
        if (this.currentMusic !== 'none') this.safe(() => this.audio.playMusic(this.currentMusic));
      })
      .catch((err: unknown) => {
        console.warn('[Game] audio init failed', err);
        this.audioStarted = false;
        window.addEventListener('pointerdown', this.onGesture, { passive: true });
        window.addEventListener('keydown', this.onGesture);
      });
  };

  private toggleMute(): void {
    const muted = !this.audio.muted;
    this.safe(() => this.audio.setMuted(muted));
    this.muteIndicator.classList.toggle('visible', muted);
  }

  // ------------------------------------------------------------- listeners

  private readonly onResize = (): void => {
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.postfxOk) {
      try {
        this.postfx.setSize(w, h, pr);
      } catch (err) {
        console.error('[Game] PostFX resize failed', err);
        this.postfxOk = false;
      }
    }
  };

  private readonly onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.repeat) return;
    if (ev.key === 'm' || ev.key === 'M') this.toggleMute();
  };

  private readonly onBlur = (): void => {
    if (this.onlineStart) { if (!this.room.isHost) this.room.sendInput(emptyWireInput()); return; }
    if (this.state === 'racing' || this.state === 'countdown') this.pause();
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) this.onBlur();
    if (this.backgroundTimer) { clearInterval(this.backgroundTimer); this.backgroundTimer = null; }
    if (document.hidden && this.onlineStart && this.room.isHost) {
      this.backgroundTime = performance.now();
      this.backgroundTimer = setInterval(() => {
        const now = performance.now(); const dt = Math.min(.2, (now - this.backgroundTime) / 1000); this.backgroundTime = now;
        if (document.hidden && this.onlineStart && this.room.isHost && ['countdown', 'racing', 'finished'].includes(this.state)) this.simulate(dt, createEmptyInput());
      }, 50);
    }
    if (!document.hidden) this.lastTime = performance.now();
  };

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      console.error('[Game]', err);
    }
  }
}
