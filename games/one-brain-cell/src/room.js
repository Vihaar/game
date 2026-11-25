/** PeerJS 1.5.5 supplies signaling/WebRTC; no new transport implementation. */
import Peer from "peerjs";
export class CoopRoom {
  constructor(
    roles,
    {
      onPacket = () => {},
      onStatus = () => {},
      onRole = () => {},
      onLeave = () => {},
    } = {},
  ) {
    Object.assign(this, { roles, onPacket, onStatus, onRole, onLeave });
    this.connections = new Map();
    this.seats = new Map();
    this.peer = null;
    this.isHost = false;
    this.isGuest = false;
    this.code = "";
  }
  close() {
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
    this.seats.clear();
    this.isHost = this.isGuest = false;
    this.code = "";
  }
  peers() {
    return [...this.seats.values()];
  }
  host(role) {
    this.close();
    this.role = role;
    this.isHost = true;
    const bytes = crypto.getRandomValues(new Uint8Array(6)),
      alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    this.code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(
      "",
    );
    this.onStatus("Opening room…");
    this.peer = new Peer("onebrain-" + this.code);
    this.peer.on("open", () =>
      this.onStatus("Room " + this.code + " · friends can join now"),
    );
    this.peer.on("error", (e) =>
      this.onStatus(
        "Connection unavailable: " + e.type + ". Offline modes still work.",
      ),
    );
    this.peer.on("connection", (connection) => {
      let accepted = false;
      connection.on("data", (packet) => {
        if (!packet || typeof packet !== "object") return;
        if (!accepted && packet.kind === "hello") {
          const taken = new Set([
            this.role,
            ...this.peers().map((s) => s.role),
          ]);
          const chosen =
            this.roles.find((r) => r === packet.role && !taken.has(r)) ??
            this.roles.find((r) => !taken.has(r));
          if (!chosen) {
            connection.send({ kind: "full" });
            return;
          }
          accepted = true;
          this.connections.set(connection.peer, connection);
          this.seats.set(connection.peer, {
            role: chosen,
            peer: connection.peer,
          });
          connection.send({ kind: "welcome", role: chosen });
          this.onStatus(
            "Room " +
              this.code +
              " · " +
              (this.connections.size + 1) +
              " / " +
              this.roles.length +
              " brains",
          );
        } else if (accepted)
          this.onPacket(packet, this.seats.get(connection.peer));
      });
      connection.on("close", () => {
        this.connections.delete(connection.peer);
        this.seats.delete(connection.peer);
        this.onStatus("A friend left. AI has their department.");
      });
    });
  }
  join(code, role) {
    this.close();
    this.code = String(code)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "");
    if (this.code.length !== 6) {
      this.onStatus("Use the six-letter room code.");
      return;
    }
    this.onStatus("Calling the other brain…");
    this.peer = new Peer();
    this.peer.on("open", () => {
      const connection = this.peer.connect("onebrain-" + this.code, {
        reliable: true,
        serialization: "json",
      });
      this.connection = connection;
      connection.on("open", () => connection.send({ kind: "hello", role }));
      connection.on("data", (packet) => {
        if (!packet || typeof packet !== "object") return;
        if (packet.kind === "welcome") {
          this.isGuest = true;
          this.role = packet.role;
          this.onRole(this.role);
          this.onStatus(
            "Connected as " + this.role + ". Host starts the round.",
          );
        } else if (packet.kind === "full")
          this.onStatus("All three departments are occupied.");
        else this.onPacket(packet, { role: "host" });
      });
      connection.on("close", () => {
        this.isGuest = false;
        this.onStatus("Host left. Start an offline game or join another room.");
        this.onLeave();
      });
      connection.on("error", () =>
        this.onStatus(
          "Could not reach that room. Check the code and host tab.",
        ),
      );
    });
    this.peer.on("error", (e) =>
      this.onStatus(
        "Connection unavailable: " + e.type + ". Try offline mode.",
      ),
    );
  }
  send(packet) {
    if (this.connection?.open) this.connection.send(packet);
  }
  broadcast(packet) {
    for (const connection of this.connections.values())
      if (connection.open) connection.send(packet);
  }
}
