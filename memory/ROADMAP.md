# RACCOON APP - ROADMAP

## P0 — Verified complete in current build
- 1v1 matching cleanup and rematch stability
- Room capacity fixed to exactly 2 players
- Premium-only room creation with free-user join support
- Backend-controlled premium security with blocked dev overrides
- `currentSessionId` lifecycle tracking and cleanup
- Mobile CTA clickability / no overlap regressions on core flows
- Private-room live session launch and room-triggered game bridge
- Draw / UNO / Feud gameplay polish for cleaner desktop/mobile presentation

## P1 — Next priority
- Google Login production-domain verification and any remaining authorized-domain/session edge fixes
- Production TURN relay setup for stronger WebRTC connectivity outside preview/local conditions
- Complete live Stripe production setup once real webhook/production keys are provided

## P2 — Backlog
- Twilio SMS OTP for production flows
- Modularize `/app/backend/websocket/socket_handlers.py` into smaller room/match/game modules
- If product scope still requires it later: full real 2v2 room-vs-room gameplay UX (currently guarded to exact 2-player room readiness only)

## Notes
- Stripe remains **MOCKED** in test mode.
- Current validation sources of truth: `/app/test_reports/iteration_17.json` and `/app/test_reports/iteration_18.json`.