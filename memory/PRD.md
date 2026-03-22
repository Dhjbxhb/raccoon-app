# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a real-time web application called "RACCOON APP" - a social matching platform similar to Omegle but more advanced with a premium, gamified feel.

## Core Features

### Authentication
- Email/Password login ✅
- Guest Mode ✅
- Google Login (placeholder) ✅
- Apple Login (placeholder) ✅
- Phone Number Login (placeholder) ✅

### Design Theme
- Dark theme (black + deep purple)
- Glassmorphism effects
- Purple glow accents
- "Cool raccoon" character branding
- Game UIs: Blue + Gold theme

### User System
- Profiles with country (auto-detected), gender, DOB (18+)
- Activity stats
- Premium status indicators

### Matching & Chat
- WebSocket (Socket.IO) real-time communication ✅
- Queue system ✅
- Gender filters
- Skip/Block functionality ✅

### Games
- **Raccoon Feud**: Family Feud style with fuzzy answer matching
- **Truth or Dare**: Bottle spin animation, manual questions

### Premium Features
- Play any game anytime
- All filters (funny, beauty)
- Gender & country matching filters
- Chat preferences
- Priority queue
- Pricing: $4/week, $12/month, $28/3months

---

## What's Been Implemented

### Phase 1 - Foundation & Auth ✅ (Completed Dec 2025)
- FastAPI backend with JWT auth
- Email/Password & Guest login
- Cinematic landing page with cool raccoon
- Clean Login page (minimal)
- Branded Signup page (with social buttons)
- Minimal Guest page
- IP-based country detection
- Premium page with all features listed

### Phase 2 - Real-Time Matching ✅ (Completed Dec 2025)
- Socket.IO integration (path: /api/socket.io)
- Matching queue system
- Real-time chat with typing indicators
- Skip & Block functionality
- Enhanced matching screen with:
  - Rotating raccoon facts
  - Walking mini raccoon animation
  - Purple glow effects

---

## Pending Tasks

### Phase 3 - Interactive Games (P0)
- [ ] Raccoon Feud UI (blue/gold theme)
- [ ] Truth or Dare UI with bottle spin
- [ ] Unique raccoon characters per game
- [ ] Game socket handlers
- [ ] HALT FOR USER REVIEW

### Phase 4 - Admin Panel (P2)
- [ ] Hidden admin interface
- [ ] User management
- [ ] Ban/Unban moderation
- [ ] Premium status control

### Phase 5 - Premium & Polish (P3)
- [ ] Premium UI enhancements
- [ ] User profile stats
- [ ] Final optimizations

### Phase 6 - Camera Filters (P4)
- [ ] WebRTC preparation
- [ ] Filter placeholder structure

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/ (user, guest, message, match, game)
│   ├── routes/ (auth, auth_multiple)
│   ├── services/ (auth, country, db, matching, game)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/ui/
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching)
        ├── pages/ (Landing, Login, Signup, Guest, Dashboard, Match, Premium)
        └── App.js
```

## Key Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/guest
- Socket.IO: /api/socket.io

## Tech Stack
- Backend: FastAPI, python-socketio, Motor (MongoDB)
- Frontend: React, socket.io-client, Tailwind CSS, Shadcn UI
- Database: MongoDB
