import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { MessageRateLimit, RemoteInputBuffer, RoomRoster } from './RoomState';
import {
  generateRoomCode, INPUT_INTERVAL_MS, normalizeRoomCode, parseClientMessage, parseHostMessage,
  parseInput, parseProfile, parseSettings, parseSnapshot, parseStandings, roomPeerId, SNAPSHOT_INTERVAL_MS,
  type ClientMessage, type HostMessage, type PlayerProfile, type RaceSnapshot, type RaceStart,
  type RoomPlayer, type RoomSettings, type RoomWelcome, type WireInput, type WireStanding,
} from './protocol';

export type RoomStatus = 'idle' | 'creating' | 'joining' | 'lobby' | 'racing' | 'results' | 'disconnected' | 'error';
export interface RoomError { code: string; message: string }
export interface RoomTransportCallbacks {
  onState?(state: RoomStatus): void;
  onRoster?(players: RoomPlayer[], settings: RoomSettings): void;
  onWelcome?(welcome: RoomWelcome): void;
  onStart?(start: RaceStart): void;
  onSnapshot?(snapshot: RaceSnapshot): void;
  onResults?(standings: WireStanding[], raceId: number): void;
  onRestart?(settings: RoomSettings, roster: RoomPlayer[]): void;
  onPlayerLeft?(player: RoomPlayer): void;
  onError?(error: RoomError): void;
}
export interface RoomTransportOptions {
  /** Omit to use PeerJS Cloud. Supply {host,port,path,secure,config} for your own signaling/ICE. */
  peerOptions?: PeerOptions;
  allowedCharacterIds?: readonly string[];
  allowedTrackIds?: readonly string[];
  /** Dependency injection for integration tests; production normally omits it. */
  createPeer?: (id: string | undefined, options: PeerOptions) => Peer;
  connectionTimeoutMs?: number;
}
interface GuestConnection { connection: DataConnection; limiter: MessageRateLimit; invalid: number; timer: ReturnType<typeof setTimeout> }

/** Host-authoritative star topology. Host owns physics/items/race; clients never send world state. */
export class RoomTransport {
  status: RoomStatus = 'idle';
  roomCode = '';
  localSlot = -1;
  isHost = false;
  raceId = 0;
  roster: RoomPlayer[] = [];
  settings: RoomSettings | null = null;

  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private guests = new Map<string, GuestConnection>();
  private hostRoster: RoomRoster | null = null;
  private readonly remoteInputs = new RemoteInputBuffer();
  private generation = 0;
  private inputSequence = 0;
  private lastInputAt = -Infinity;
  private queuedItem = false;
  private lastSnapshotAt = -Infinity;
  private lastSnapshotSequence = -1;
  private pendingCancel: (() => void) | null = null;
  private currentStart: RaceStart | null = null;
  private latestSnapshot: RaceSnapshot | null = null;
  private readySlots = new Set<number>();

  constructor(private readonly callbacks: RoomTransportCallbacks = {}, private readonly options: RoomTransportOptions = {}) {}

  async create(profile: PlayerProfile, settings: RoomSettings): Promise<string> {
    if (!this.validProfile(profile) || !this.validSettings(settings)) throw new Error('Choose a valid player and track first.');
    this.leave(); this.isHost = true; this.settings = { ...settings }; this.setState('creating');
    for (let attempt = 0; attempt < 4; attempt++) {
      this.roomCode = generateRoomCode();
      try {
        const peer = await this.openPeer(roomPeerId(this.roomCode));
        this.hostRoster = new RoomRoster(peer.id, profile); this.localSlot = 0;
        peer.on('connection', (connection) => this.acceptGuest(connection));
        this.publishRoster(); this.setState('lobby');
        this.callbacks.onWelcome?.({ roomCode: this.roomCode, slot: 0, settings: this.settings!, roster: this.roster });
        return this.roomCode;
      } catch (error) {
        if (this.status === 'idle') throw error;
        const code = this.errorCode(error);
        if (code === 'unavailable-id' && attempt < 3) continue;
        this.fail(code, this.describeError(code)); throw error;
      }
    }
    throw new Error('Could not reserve a room code.');
  }

  async join(rawCode: string, profile: PlayerProfile): Promise<RoomWelcome> {
    const code = normalizeRoomCode(rawCode);
    if (!code) throw new Error('Enter the six-letter room code.');
    if (!this.validProfile(profile)) throw new Error('Choose a valid player name and character.');
    this.leave(); this.roomCode = code; this.setState('joining');
    try {
      const peer = await this.openPeer(undefined);
      const generation = this.generation;
      return await new Promise<RoomWelcome>((resolve, reject) => {
        let settled = false;
        const connection = peer.connect(roomPeerId(code), { reliable: true, serialization: 'json', label: 'mike-kart-v1' });
        this.hostConnection = connection;
        const finish = (error?: RoomError, welcome?: RoomWelcome) => {
          if (settled) return; settled = true; clearTimeout(timer); this.pendingCancel = null;
          if (error) { this.fail(error.code, error.message); reject(new Error(error.message)); }
          else resolve(welcome!);
        };
        const timer = setTimeout(() => finish({ code: 'timeout', message: 'Could not reach this room. Check the code and ask the host to keep their tab open.' }), this.timeoutMs);
        this.pendingCancel = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Connection cancelled.')); } };
        connection.on('open', () => { if (generation === this.generation) this.send(connection, { v: 1, type: 'hello', profile }); });
        connection.on('data', (data) => {
          if (generation !== this.generation) return;
          const message = parseHostMessage(data); if (!message) return;
          if (!settled) {
            if (message.type === 'reject') { finish({ code: message.code, message: message.message }); return; }
            if (message.type !== 'welcome' || message.roomCode !== code || !message.roster.some((p) => p.peerId === peer.id && p.slot === message.slot)) return;
            if (!this.validSettings(message.settings) || message.roster.some((p) => !this.validProfile(p))) { finish({ code: 'version', message: 'The host is running a different game version. Reload both tabs.' }); return; }
            this.localSlot = message.slot; this.settings = message.settings; this.roster = message.roster;
            this.setState('lobby'); this.callbacks.onRoster?.(this.roster, this.settings); this.callbacks.onWelcome?.(message); finish(undefined, message); return;
          }
          this.receiveHost(message);
        });
        connection.on('close', () => {
          if (generation !== this.generation) return;
          if (!settled) finish({ code: 'room-closed', message: 'The room closed or rejected the connection.' });
          else { this.leave(); this.setState('disconnected'); this.callbacks.onError?.({ code: 'host-left', message: 'The host left. Create or join another room to race again.' }); }
        });
        connection.on('error', () => { if (generation === this.generation && !settled) finish({ code: 'connection', message: 'Could not connect to the host. Try another network or room.' }); });
      });
    } catch (error) {
      if (this.status === 'joining') this.fail(this.errorCode(error), this.describeError(this.errorCode(error)));
      throw error;
    }
  }

  updateProfile(profile: PlayerProfile): void {
    if (this.status !== 'lobby' || !this.validProfile(profile)) return;
    if (this.isHost && this.peer) { this.hostRoster?.update(this.peer.id, profile); this.publishRoster(); }
    else if (this.hostConnection) this.send(this.hostConnection, { v: 1, type: 'profile', profile });
  }
  updateSettings(settings: RoomSettings): void {
    if (!this.isHost || this.status !== 'lobby' || !this.validSettings(settings)) return;
    this.settings = { ...settings }; this.publishRoster();
  }
  startRace(): RaceStart {
    if (!this.isHost || this.status !== 'lobby' || !this.settings) throw new Error('Only the host can start a waiting room.');
    this.raceId++; this.resetRacePackets(); this.setState('racing');
    const start: RaceStart = { raceId: this.raceId, seed: crypto.getRandomValues(new Uint32Array(1))[0], settings: { ...this.settings }, roster: this.roster.map((p) => ({ ...p })) };
    this.currentStart = start; this.readySlots.clear();
    this.broadcast({ v: 1, type: 'start', ...start }); this.callbacks.onStart?.(start); return start;
  }
  markReady(): void {
    if (this.status !== 'racing') return;
    if (this.isHost) this.readySlots.add(0);
    else if (this.hostConnection) this.send(this.hostConnection, { v: 1, type: 'ready', raceId: this.raceId });
  }
  get allReady(): boolean { return this.isHost && this.roster.every((p) => this.readySlots.has(p.slot)); }
  /** Caller owns its 20Hz snapshot schedule; this also caps transmission to 20Hz. */
  broadcastSnapshot(snapshot: RaceSnapshot, now = performance.now()): boolean {
    if (!this.isHost || this.status !== 'racing' || now - this.lastSnapshotAt < SNAPSHOT_INTERVAL_MS || snapshot.raceId !== this.raceId || snapshot.sequence <= this.lastSnapshotSequence) return false;
    const safe = parseSnapshot(snapshot); if (!safe) return false;
    this.latestSnapshot = safe;
    this.lastSnapshotAt = now; this.lastSnapshotSequence = safe.sequence;
    this.broadcast({ v: 1, type: 'snapshot', snapshot: safe }, true); return true;
  }
  /** Call each render/input frame. Item press edges are retained until a packet is sent. */
  sendInput(input: WireInput, now = performance.now()): boolean {
    if (this.isHost || this.status !== 'racing' || !this.hostConnection) return false;
    const safe = parseInput(input); if (!safe) return false;
    this.queuedItem ||= safe.useItem;
    if (now - this.lastInputAt < INPUT_INTERVAL_MS) return false;
    safe.useItem = this.queuedItem;
    const sent = this.send(this.hostConnection, { v: 1, type: 'input', raceId: this.raceId, sequence: ++this.inputSequence, input: safe }, true);
    if (sent) { this.lastInputAt = now; this.queuedItem = false; } return sent;
  }
  /** Host physics tick: consume once per guest slot; menu/pause inputs never cross the wire. */
  consumeInput(slot: number, now = performance.now()): WireInput { return this.remoteInputs.consume(slot, now); }
  broadcastResults(standings: WireStanding[]): void {
    if (!this.isHost || this.status !== 'racing') return;
    const safe = parseStandings(standings); if (!safe) return;
    this.setState('results'); this.broadcast({ v: 1, type: 'results', raceId: this.raceId, standings: safe }); this.callbacks.onResults?.(safe, this.raceId);
  }
  /** Returns every participant to the same lobby; next start gets a fresh raceId. */
  restart(): void {
    if (!this.isHost || !this.settings || !['racing', 'results'].includes(this.status)) return;
    this.currentStart = null; this.latestSnapshot = null; this.readySlots.clear(); this.resetRacePackets(); this.setState('lobby');
    this.broadcast({ v: 1, type: 'restart', raceId: this.raceId, settings: this.settings, roster: this.roster });
    this.callbacks.onRestart?.(this.settings, this.roster);
  }
  leave(): void {
    this.generation++; this.pendingCancel?.(); this.pendingCancel = null;
    const peer = this.peer; this.peer = null; this.hostConnection = null;
    for (const entry of this.guests.values()) clearTimeout(entry.timer);
    this.guests.clear(); this.hostRoster = null; peer?.destroy();
    this.roomCode = ''; this.localSlot = -1; this.isHost = false; this.raceId = 0; this.roster = []; this.settings = null;
    this.currentStart = null; this.latestSnapshot = null; this.readySlots.clear();
    this.resetRacePackets(); this.setState('idle');
  }
  dispose(): void { this.leave(); }

  private get timeoutMs(): number { return this.options.connectionTimeoutMs ?? 15000; }
  private openPeer(id: string | undefined): Promise<Peer> {
    const generation = this.generation;
    this.peer?.destroy();
    const create = this.options.createPeer ?? ((peerId, options) => peerId ? new Peer(peerId, options) : new Peer(options));
    const peer = create(id, { debug: 0, ...this.options.peerOptions }); this.peer = peer;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; this.pendingCancel = null; peer.destroy(); reject(Object.assign(new Error('Signaling timeout.'), { type: 'timeout' })); } }, this.timeoutMs);
      this.pendingCancel = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Connection cancelled.')); } };
      peer.on('open', () => { if (!settled && generation === this.generation) { settled = true; clearTimeout(timer); this.pendingCancel = null; resolve(peer); } });
      peer.on('error', (error) => {
        if (generation !== this.generation) return;
        if (!settled) { settled = true; clearTimeout(timer); this.pendingCancel = null; reject(error); }
        else if (this.status === 'joining') this.fail(error.type, this.describeError(error.type));
        else if (error.type === 'disconnected' || error.type === 'network') this.callbacks.onError?.({ code: error.type, message: 'The signaling connection was interrupted. Existing racers may continue; new guests may need the host to recreate the room.' });
      });
      peer.on('disconnected', () => { if (generation === this.generation && this.status !== 'idle') this.callbacks.onError?.({ code: 'signaling-disconnected', message: 'Room discovery disconnected. Existing browser connections can continue; refresh the room before inviting more friends.' }); });
    });
  }
  private acceptGuest(connection: DataConnection): void {
    const generation = this.generation;
    if (!this.isHost || !this.hostRoster) { connection.close(); return; }
    if (this.guests.has(connection.peer)) { connection.close(); return; }
    const entry: GuestConnection = { connection, limiter: new MessageRateLimit(), invalid: 0, timer: setTimeout(() => this.dropGuest(connection.peer), 7000) };
    if (this.guests.size >= 7 || !['lobby', 'racing'].includes(this.status)) {
      clearTimeout(entry.timer);
      connection.on('open', () => this.reject(connection, this.status !== 'lobby' ? 'race-started' : 'room-full', this.status !== 'lobby' ? 'This race already started. Ask the host to restart the lobby.' : 'This room already has eight racers.'));
      return;
    }
    this.guests.set(connection.peer, entry);
    connection.on('data', (data) => {
      if (generation !== this.generation || this.guests.get(connection.peer) !== entry) return;
      if (!entry.limiter.accept()) return;
      const message = parseClientMessage(data);
      if (!message) { if (++entry.invalid >= 5) this.dropGuest(connection.peer); return; }
      const player = this.hostRoster?.get(connection.peer);
      if (!player) {
        if (message.type !== 'hello' || !['lobby', 'racing'].includes(this.status) || !this.validProfile(message.profile)) { this.reject(connection, 'invalid-player', 'Choose a valid racer and join a waiting room.'); this.dropGuest(connection.peer, false); return; }
        const added = this.hostRoster!.add(connection.peer, message.profile);
        if (!added || !this.settings) { this.reject(connection, 'room-full', 'This room already has eight racers.'); this.dropGuest(connection.peer, false); return; }
        clearTimeout(entry.timer);
        this.roster = this.hostRoster!.list();
        this.send(connection, { v: 1, type: 'welcome', roomCode: this.roomCode, slot: added.slot, settings: this.settings, roster: this.roster }); this.publishRoster();
        if (this.status === 'racing' && this.currentStart) {
          this.send(connection, { v: 1, type: 'start', ...this.currentStart, roster: this.roster });
          if (this.latestSnapshot) this.send(connection, { v: 1, type: 'snapshot', snapshot: this.latestSnapshot });
        }
        return;
      }
      if (message.type === 'profile' && this.status === 'lobby' && this.validProfile(message.profile)) { this.hostRoster!.update(connection.peer, message.profile); this.publishRoster(); }
      if (message.type === 'input' && this.status === 'racing' && message.raceId === this.raceId) this.remoteInputs.put(player.slot, message.sequence, message.input);
      if (message.type === 'ready' && this.status === 'racing' && message.raceId === this.raceId) this.readySlots.add(player.slot);
    });
    connection.on('close', () => { if (generation === this.generation) this.dropGuest(connection.peer); });
    connection.on('error', () => { if (generation === this.generation) this.dropGuest(connection.peer); });
  }
  private receiveHost(message: HostMessage): void {
    if (message.type === 'reject') { this.fail(message.code, message.message); return; }
    if (message.type === 'roster' || message.type === 'restart' || message.type === 'start') {
      if (!this.validSettings(message.settings) || message.roster.some((p) => !this.validProfile(p))) return;
      this.settings = message.settings; this.roster = message.roster; this.callbacks.onRoster?.(this.roster, this.settings);
    }
    if (message.type === 'start' && message.raceId > this.raceId && this.status === 'lobby') {
      this.raceId = message.raceId; this.resetRacePackets(); this.setState('racing'); this.callbacks.onStart?.(message);
    } else if (message.type === 'snapshot' && this.status === 'racing' && message.snapshot.raceId === this.raceId && message.snapshot.sequence > this.lastSnapshotSequence) {
      this.lastSnapshotSequence = message.snapshot.sequence; this.callbacks.onSnapshot?.(message.snapshot);
    } else if (message.type === 'results' && this.status === 'racing' && message.raceId === this.raceId) {
      this.setState('results'); this.callbacks.onResults?.(message.standings, message.raceId);
    } else if (message.type === 'restart' && message.raceId === this.raceId && ['racing', 'results'].includes(this.status)) {
      this.resetRacePackets(); this.setState('lobby'); this.callbacks.onRestart?.(message.settings, message.roster);
    }
  }
  private dropGuest(peerId: string, close = true): void {
    const entry = this.guests.get(peerId); if (!entry) return;
    this.guests.delete(peerId); clearTimeout(entry.timer); if (close) entry.connection.close();
    const player = this.hostRoster?.remove(peerId);
    if (player) { this.remoteInputs.remove(player.slot); this.readySlots.delete(player.slot); this.publishRoster(); this.callbacks.onPlayerLeft?.(player); }
  }
  private publishRoster(): void {
    if (!this.hostRoster || !this.settings) return;
    this.roster = this.hostRoster.list(); this.broadcast({ v: 1, type: 'roster', settings: this.settings, roster: this.roster }); this.callbacks.onRoster?.(this.roster, this.settings);
  }
  private broadcast(message: HostMessage, transient = false): void { for (const guest of this.guests.values()) if (this.hostRoster?.get(guest.connection.peer)) this.send(guest.connection, message, transient); }
  private send(connection: DataConnection, message: HostMessage | ClientMessage, transient = false): boolean {
    if (!connection.open || (transient && (connection.dataChannel?.bufferedAmount ?? 0) > 65536)) return false;
    try { connection.send(message); return true; } catch { return false; }
  }
  private reject(connection: DataConnection, code: string, message: string): void { this.send(connection, { v: 1, type: 'reject', code, message }); setTimeout(() => connection.close(), 250); }
  private validProfile(profile: PlayerProfile): boolean { return Boolean(parseProfile(profile)) && (!this.options.allowedCharacterIds || this.options.allowedCharacterIds.includes(profile.characterId)); }
  private validSettings(settings: RoomSettings): boolean { return Boolean(parseSettings(settings)) && (!this.options.allowedTrackIds || this.options.allowedTrackIds.includes(settings.trackId)) && (!this.options.allowedCharacterIds || this.options.allowedCharacterIds.includes(settings.characterId)); }
  private resetRacePackets(): void { this.remoteInputs.clear(); this.inputSequence = 0; this.queuedItem = false; this.lastInputAt = -Infinity; this.lastSnapshotAt = -Infinity; this.lastSnapshotSequence = -1; }
  private setState(status: RoomStatus): void { if (this.status !== status) { this.status = status; this.callbacks.onState?.(status); } }
  private fail(code: string, message: string): void { this.leave(); this.setState('error'); this.callbacks.onError?.({ code, message }); }
  private errorCode(error: unknown): string { return error && typeof error === 'object' && 'type' in error ? String(error.type) : 'connection'; }
  private describeError(code: string): string {
    if (code === 'peer-unavailable') return 'Room not found. Check the code and make sure the host is still here.';
    if (code === 'unavailable-id') return 'This room code was taken. Create another room.';
    if (code === 'browser-incompatible') return 'This browser cannot connect to racers. Try a recent Chrome, Edge, Firefox or Safari.';
    if (code === 'timeout') return 'Room discovery timed out. Check your connection and try again.';
    return 'Could not connect to the room service. Check your network and try again.';
  }
}

/** Translate Vite public configuration without coupling the transport to import.meta.env. */
export function peerOptionsFromEnv(env: Record<string, unknown>): PeerOptions {
  const options: PeerOptions = {};
  if (typeof env.VITE_PEER_HOST === 'string' && env.VITE_PEER_HOST) options.host = env.VITE_PEER_HOST;
  if (typeof env.VITE_PEER_PATH === 'string' && env.VITE_PEER_PATH) options.path = env.VITE_PEER_PATH;
  if (env.VITE_PEER_PORT !== undefined && env.VITE_PEER_PORT !== '') { const port = Number(env.VITE_PEER_PORT); if (Number.isInteger(port) && port > 0 && port <= 65535) options.port = port; }
  if (env.VITE_PEER_SECURE === 'true' || env.VITE_PEER_SECURE === true) options.secure = true;
  if (env.VITE_PEER_SECURE === 'false' || env.VITE_PEER_SECURE === false) options.secure = false;
  if (typeof env.VITE_PEER_ICE_SERVERS === 'string' && env.VITE_PEER_ICE_SERVERS) {
    try { const servers: unknown = JSON.parse(env.VITE_PEER_ICE_SERVERS); if (Array.isArray(servers) && servers.length <= 8 && servers.every((s) => s && typeof s === 'object' && 'urls' in s)) options.config = { iceServers: servers }; } catch { /* retain PeerJS defaults for malformed optional config */ }
  }
  return options;
}
