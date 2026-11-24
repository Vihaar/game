import type { CharacterDef, TrackDefinition } from '../core/types';
import type { PlayerProfile, RoomPlayer, RoomSettings, RoomStatus } from '../net';
import { el } from './dom';
import './room-lobby.css';

interface LobbyActions {
  create(profile: PlayerProfile, settings: RoomSettings): Promise<unknown>;
  join(code: string, profile: PlayerProfile): Promise<unknown>;
  profile(profile: PlayerProfile): void;
  settings(settings: RoomSettings): void;
  start(): void;
  restart(): void;
  close(): void;
  leave(): void;
}

/** Browser-local UI only. All room membership and authority live in RoomTransport. */
export class RoomLobby {
  private readonly root: HTMLElement;
  private readonly status: HTMLElement;
  private readonly name: HTMLInputElement;
  private readonly character: HTMLSelectElement;
  private readonly track: HTMLSelectElement;
  private readonly difficulty: HTMLSelectElement;
  private readonly laps: HTMLSelectElement;
  private readonly code: HTMLInputElement;
  private readonly roomCode: HTMLElement;
  private readonly players: HTMLElement;
  private readonly createButton: HTMLButtonElement;
  private readonly joinButton: HTMLButtonElement;
  private readonly startButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly leaveButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private host = false;
  private connected = false;
  private busy = false;
  private activeCode = '';
  private inRace = false;

  constructor(parent: HTMLElement, characters: readonly CharacterDef[], tracks: readonly TrackDefinition[], private readonly actions: LobbyActions) {
    this.root = el('section', 'room-overlay hidden', undefined, parent);
    this.root.setAttribute('aria-label', 'Play with friends'); this.root.setAttribute('role', 'dialog');
    const panel = el('div', 'room-panel', undefined, this.root);
    const head = el('header', 'room-head', undefined, panel);
    el('div', 'room-kicker', 'REAL FRIENDS. QUESTIONABLE DRIVING.', head);
    el('h1', '', 'Everybody drives Mike.', head);
    el('p', 'room-description', 'Create a room. Send the code. Your friends take over the bots — even after the race starts.', head);
    this.status = el('p', 'room-status', 'Up to 8 friends. No accounts. Empty seats stay bots.', panel); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    const identity = el('div', 'room-fields', undefined, panel);
    const nameLabel = el('label', '', 'Your name', identity); this.name = document.createElement('input'); this.name.maxLength = 24; this.name.setAttribute('autocomplete', 'nickname'); this.name.placeholder = 'Torin, Jonah, Grant…'; nameLabel.append(this.name);
    this.character = this.select(identity, 'Driver', characters.map((c) => [c.id, c.name]));
    let saved: { name?: string; characterId?: string } = {};
    try { saved = JSON.parse(localStorage.getItem('mike-room-profile') ?? '{}'); } catch { /* use defaults */ }
    this.name.value = saved.name ?? characters[0].name; this.character.value = characters.some((c) => c.id === saved.characterId) ? saved.characterId! : characters[0].id;
    const controls = el('div', 'room-fields room-race-settings', undefined, panel);
    this.track = this.select(controls, 'Circuit', tracks.map((t) => [t.id, t.name]));
    this.difficulty = this.select(controls, 'Bot difficulty', [['easy', 'Chill'], ['normal', 'Normal'], ['hard', 'Sweaty']]);
    this.laps = this.select(controls, 'Laps', [['1', '1 — quick race'], ['2', '2'], ['3', '3']]);
    const join = el('div', 'room-join', undefined, panel);
    const joinLabel = el('label', '', 'Room code', join); this.code = document.createElement('input'); this.code.maxLength = 6; this.code.placeholder = 'ABC234'; this.code.autocomplete = 'off'; this.code.spellcheck = false; this.code.setAttribute('aria-label', 'Room code'); joinLabel.append(this.code);
    this.joinButton = this.button(join, 'Join room', () => this.run(() => this.actions.join(this.code.value, this.getProfile())));
    this.createButton = this.button(join, 'Create room', () => this.run(() => this.actions.create(this.getProfile(), this.getSettings())), 'room-primary');
    this.roomCode = el('div', 'room-code-display', '', panel);
    this.players = el('div', 'room-players', undefined, panel); this.players.setAttribute('aria-label', 'Room racers');
    const buttons = el('div', 'room-actions', undefined, panel);
    this.copyButton = this.button(buttons, 'Copy invite link', () => void this.copyInvite());
    this.startButton = this.button(buttons, 'Start race', () => this.actions.start(), 'room-primary');
    this.restartButton = this.button(buttons, 'Restart lobby', () => this.actions.restart());
    this.closeButton = this.button(buttons, 'Solo practice', () => this.actions.close());
    this.leaveButton = this.button(buttons, 'Leave room', () => this.actions.leave(), 'room-danger');
    el('p', 'room-note', 'The host runs the race. Keep their tab open. Esc opens your menu without pausing everyone.', panel);
    this.character.addEventListener('change', () => this.changeProfile()); this.name.addEventListener('change', () => this.changeProfile());
    for (const input of [this.track, this.difficulty, this.laps]) input.addEventListener('change', () => { if (this.connected && this.host && !this.inRace) this.actions.settings(this.getSettings()); });
    this.code.addEventListener('input', () => { this.code.value = this.code.value.toUpperCase().replace(/[^A-Z2-9]/g, ''); });
    this.root.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.actions.close(); } });
    this.refresh();
  }
  get visible(): boolean { return !this.root.classList.contains('hidden'); }
  getProfile(): PlayerProfile { return { name: this.name.value.trim(), characterId: this.character.value }; }
  getSettings(): RoomSettings { return { characterId: this.character.value, trackId: this.track.value, difficulty: this.difficulty.value as RoomSettings['difficulty'], laps: Number(this.laps.value) }; }
  show(code?: string): void { this.root.classList.remove('hidden'); if (code) this.code.value = code.toUpperCase(); this.refresh(); }
  hide(): void { this.root.classList.add('hidden'); }
  setStatus(status: RoomStatus): void {
    this.busy = status === 'creating' || status === 'joining';
    if (status === 'creating') this.message('Reserving your room…');
    if (status === 'joining') this.message('Connecting to your friend…');
    if (status === 'idle' || status === 'error' || status === 'disconnected') { this.connected = false; this.inRace = false; this.activeCode = ''; this.players.replaceChildren(); }
    if (status === 'racing') this.inRace = true;
    if (status === 'lobby') this.inRace = false;
    this.refresh();
  }
  setRoom(code: string, roster: readonly RoomPlayer[], settings: RoomSettings, host: boolean, inRace: boolean): void {
    this.activeCode = code; this.connected = true; this.host = host; this.inRace = inRace;
    this.track.value = settings.trackId; this.difficulty.value = settings.difficulty; this.laps.value = String(settings.laps);
    this.players.replaceChildren();
    for (let slot = 0; slot < 8; slot++) {
      const player = roster.find((p) => p.slot === slot);
      const row = el('div', `room-player ${player ? 'human' : 'bot'}`, undefined, this.players);
      el('span', '', player ? player.name : 'Bot', row); el('small', '', player ? (slot === 0 ? 'HOST · MIKE' : 'ONLINE · MIKE') : 'OPEN SEAT · MIKE', row);
    }
    this.message(inRace ? 'Race in progress. New friends can still replace bots.' : host ? 'Your room is ready. Invite friends, then start whenever you like.' : 'You’re in. The host chooses the circuit and starts the race.');
    this.refresh();
  }
  message(text: string, error = false): void { this.status.textContent = text; this.status.classList.toggle('room-error', error); }
  dispose(): void { this.root.remove(); }
  private select(parent: HTMLElement, text: string, options: string[][]): HTMLSelectElement {
    const label = el('label', '', text, parent); const select = document.createElement('select');
    for (const [value, name] of options) { const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option); }
    label.append(select); return select;
  }
  private button(parent: HTMLElement, text: string, action: () => void, className = ''): HTMLButtonElement { const button = el('button', className, text, parent) as HTMLButtonElement; button.type = 'button'; button.addEventListener('click', action); return button; }
  private changeProfile(): void { const profile = this.getProfile(); try { localStorage.setItem('mike-room-profile', JSON.stringify(profile)); } catch { /* private storage may be disabled */ } if (this.connected && !this.inRace) this.actions.profile(profile); }
  private async run(action: () => Promise<unknown>): Promise<void> {
    if (this.busy) return;
    this.changeProfile(); this.busy = true; this.refresh();
    try { await action(); } catch (error) { this.message(error instanceof Error ? error.message : 'Connection failed. Try again.', true); }
    finally { this.busy = false; this.refresh(); }
  }
  private async copyInvite(): Promise<void> {
    const url = new URL(location.href); url.searchParams.set('room', this.activeCode);
    try { await navigator.clipboard.writeText(url.href); this.message('Invite link copied. Send it to your friends.'); }
    catch { this.message(`Share room code ${this.activeCode}, or copy this page’s URL with ?room=${this.activeCode}.`); }
  }
  private refresh(): void {
    this.roomCode.textContent = this.activeCode ? `ROOM ${this.activeCode}` : '';
    this.createButton.hidden = this.joinButton.hidden = this.connected;
    this.code.disabled = this.connected || this.busy;
    this.createButton.disabled = this.joinButton.disabled = this.busy;
    this.name.disabled = this.character.disabled = this.inRace || this.busy;
    this.track.disabled = this.difficulty.disabled = this.laps.disabled = this.busy || (this.connected && (!this.host || this.inRace));
    this.startButton.hidden = !this.connected || !this.host || this.inRace;
    this.restartButton.hidden = !this.connected || !this.host || !this.inRace;
    this.leaveButton.hidden = this.copyButton.hidden = !this.connected;
    this.closeButton.hidden = this.connected && !this.inRace;
    this.closeButton.textContent = this.connected ? (this.inRace ? 'Return to race' : 'Close lobby') : 'Solo practice';
  }
}
