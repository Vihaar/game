# Validation — 2026-11-24

- `npm run typecheck`, six meaningful rule/physics/input tests, and production build pass.
- Isolated muted desktop Chromium: selected solo Torin, started the delivery, held D through all three obstacles, and reached the actual win dialog at 20.85 seconds without rescue. No state was moved or completed through a debug hook.
- Actual PeerJS public signaling + WebRTC: a separate host controlled Jonah/arms; another browser joined by room code as Torin/legs. Guest D input moved the authoritative host simulation. Both clients reached the same win state at 20.867 seconds with identical sofa poses. Host restart closed the guest result dialog and resumed its playing state.
- Same-device mode exposed all three departments. Pointer walking and keyboard jumping moved the load. Grab/drop detached the real constraint and reattached it; Pause held the physics still.
- A separate idle solo run reached the loss dialog at the actual 90-second deadline; restart cleared the result and timer.
- 390×844 layout has no horizontal overflow and shows all shared controls. `screenshots/mobile.png` and `screenshots/preview.png` are real game captures after motion settled. Pointer ownership is tracked per ID; a regression covers one finger releasing while other departments or a second finger on the same control remain held.
- No browser JavaScript errors were observed. Owned browser sessions and local development server were closed after validation. No native/user browser was controlled.

Online limitations remain: direct WebRTC connectivity varies by network, no private TURN relay is configured, and the host must stay open. Native phone hardware and geographically separate peers were not tested.
