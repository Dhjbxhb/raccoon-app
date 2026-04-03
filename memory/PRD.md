# RACCOON APP - Product Requirements Document

## Problem Statement
Premium live video social matching platform. Users connect randomly for video chat with strangers, play mini-games (UNO, Draw & Guess, Raccoon Feud), and create private rooms for persistent communication.

## Architecture
- **Frontend**: React + Socket.IO client + WebRTC
- **Backend**: FastAPI + Python Socket.IO + MongoDB
- **Auth**: Firebase Auth (email/password, Google OAuth, Guest)
- **Payments**: Stripe (test mode)
- **Real-time**: Socket.IO for game sync, WebRTC for peer-to-peer video/audio

## Core Features
1. **Random Video Matching** — Queue-based matching with gender/country filters
2. **Private Rooms** — Persistent lobby with voice/video/chat, games run inside room
3. **Mini-Games** — UNO, Draw & Guess, Raccoon Feud (premium-only)
4. **Premium System** — Subscription unlocks games, filters, room creation
5. **Admin Dashboard** — User management, moderation, analytics

## Key Files
```
/app/backend/websocket/socket_handlers.py — All socket event handlers (~2785 lines)
/app/backend/services/uno_service.py — UNO game engine
/app/backend/services/draw_game_service.py — Draw game engine
/app/backend/services/game_service_v2.py — Feud game engine
/app/frontend/src/hooks/useWebRTC.js — WebRTC hook
/app/frontend/src/hooks/useMatching.js — Matching queue hook
/app/frontend/src/contexts/RoomLobbyContext.js — Persistent room state
/app/frontend/src/pages/Match.js — Main video chat page
/app/frontend/src/pages/PrivateRoom.js — Private room page
/app/frontend/src/components/games/ — Game components (DrawGame, UnoGame, FeudGame)
```

## Architecture Rules
- Room vs Match: Never conflate. Room = persistent lobby. Match = temporary session.
- WebRTC Layering: Room = audio-video. Match = video+audio. Separate connections.
- UI: Cameras always at top, game UI below. No overlapping.
- Games in rooms use `room_id`, not temporary match sessions.

## What's Implemented
- [x] Full authentication (Firebase + Guest)
- [x] Random video matching with WebRTC
- [x] Private rooms as persistent lobbies
- [x] UNO game (full backend + frontend) — Fixed in call mode (Apr 3)
- [x] Draw & Guess game (canvas + sync)
- [x] Raccoon Feud game (quiz format)
- [x] Premium subscription system (Stripe test mode)
- [x] Admin dashboard
- [x] WebRTC stream preservation during game mode
- [x] Camera sizing optimization for desktop/mobile
- [x] Player ID-based camera rendering (not index-based)
- [x] Video play() calls on all game camera refs

## What's Pending
- [ ] Production TURN server (P0)
- [ ] Live Stripe payments (P0)
- [ ] Google Login domain verification (P1)
- [ ] Modularize socket_handlers.py (P1)
- [ ] Twilio SMS OTP (P2)

## Bug Fix Log
### UNO Not Working in Call Mode (Fixed Apr 3, 2026)
- **Root Cause**: `uno_service.get_player_state()` did not return `player1_id`/`player2_id`. Frontend `handleUnoStarted` in Match.js validated for these fields, always rejecting game state.
- **Fix**: Added fields to backend return + changed frontend validation to check `my_hand`/`top_card`.
- **Test**: 40/40 unit tests pass, 9 dedicated bug fix tests created.
