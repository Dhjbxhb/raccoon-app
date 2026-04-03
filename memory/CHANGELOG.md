# RACCOON APP - Changelog

## [2026-04-03] - Full System Correction: WebRTC, Camera, Game, & Mobile Fixes

### Critical Fixes
- **WebRTC Stream Preservation**: Fixed Match.js destroying video streams during game mode. Streams now stay alive (early return when `isGameActive`) so game components receive valid `localStream`/`remoteStream` props
- **Private Room Audio→Video**: Upgraded `RoomLobbyContext` from `audio-only` to `audio-video` mode so private room participants can see each other's cameras
- **getMediaConstraints Signature**: Fixed function to accept `settings` parameter from performance config, preventing potential constraint errors
- **Player ID Camera Rendering**: Fixed PrivateRoom.js and DrawGame.jsx to use `player.id === myId` matching instead of unreliable array index (`idx === 0/1`) for camera stream assignment

### Camera & UI Improvements
- Desktop camera panels: min-height 280→300px, max-height 380→420px (+~7%)
- Large desktop: min-height 320→360px, max-height 420→460px
- Mini cameras during game mode: 10rem→10.7rem width, 7.5rem→8rem height (mobile)
- Tablet mini cameras: 12rem→12.8rem width, 9rem→9.6rem height
- Desktop mini cameras: 16rem→17.1rem width, 12rem→12.8rem height

### Video Playback
- Added `el.play().catch(() => {})` after `srcObject` assignment in all game camera refs (UnoGame, FeudGame, DrawGame, PrivateRoom)
- Ensures video starts playing immediately, preventing black screen issues

### Existing Features (Unchanged)
- End Game, Skip, Report buttons in Match.js game mode controls (z-index 65)
- Skip Round buttons in FeudGame and DrawGame
- Touch event support for Draw canvas (pointer/touch events with touchAction: 'none')
- UNO card validation, turn system, wild card color picker, UNO call mechanism

---

## [Previous Sessions] - Core Platform Build

### [2026-03-28] - Private Room Persistent Lobby System
- Created `RoomLobbyContext` and `RoomLobbyProvider` for persistent room state
- Room voice/chat survives route transitions (Match → Dashboard → back)
- Games in rooms use `room_id` instead of temporary match sessions
- Skip/exit match returns instantly to room lobby without state loss

### [2026-03-27] - Game UI Pixel-Perfect Restyle
- Draw, UNO, Feud games restyled to match user-provided reference screenshots
- Cinematic space background (`GameBackground`) for all games
- Strict camera layout: Cameras at top, game UI below, no overlapping
- Fixed duplicate cameras bug during game modes
- Shared "End Game" button to terminate session for both players

### [2026-03-26] - WebRTC & Matching Architecture
- Full WebRTC lifecycle management with proper ICE candidate exchange
- Backend-validated premium security for game access
- Real-time matching queue with gender/country filters
- Skip with auto-rejoin queue (3 sec timeout with retry)
- Block user functionality

### [2026-03-25] - Authentication & Core Platform
- Firebase Auth integration (email/password + Google OAuth)
- Guest authentication with session persistence
- Admin dashboard with user management
- Premium subscription system (Stripe test mode)
- MongoDB data layer with proper indexing
