# RACCOON APP - Roadmap

## P0 - Critical (Next Session)
- Production TURN server setup for WebRTC relay (required for cross-network video calls)
- Full Stripe integration with live subscription payments (requires user-provided live API keys)
- End-to-end WebRTC testing with real camera/mic (headless browser limitations prevent automated testing)

## P1 - Important
- Google Login domain verification (USER VERIFICATION PENDING - popup auth implemented, needs domain testing)
- Modularize `socket_handlers.py` (~2700 lines → split into `room_socket.py`, `match_socket.py`, `game_socket.py`)

## P2 - Backlog
- Twilio SMS for production OTP verification
- 2v2 room-vs-room gameplay UX
- Performance profiling and optimization for low-end devices
- Mobile PWA packaging

## Completed
- Full system correction: WebRTC, camera, game & mobile fixes (2026-04-03)
- Private Room → Persistent Lobby System architecture (2026-03-28)
- Game UI pixel-perfect restyle (Draw, UNO, Feud) (2026-03-27)
- WebRTC & matching architecture (2026-03-26)
- Authentication & core platform (2026-03-25)
