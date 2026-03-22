# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a real-time web application called "RACCOON APP" - a social matching platform similar to Omegle but more advanced with a premium, gamified feel.

---

## ✅ COMPLETED PHASES

### Phase 1 - Foundation & Authentication ✅
- FastAPI backend with JWT authentication
- Email/Password & Guest login
- Cinematic landing page with cool raccoon character
- Clean Login page (minimal)
- Branded Signup page with social login buttons (UI placeholders)
- Minimal Guest page
- IP-based country detection
- Responsive design

### Phase 2 - Real-Time Matching & Chat ✅
- Socket.IO integration (path: /api/socket.io)
- Real-time matching queue system
- Chat with typing indicators
- Skip & Block functionality
- Enhanced matching screen with:
  - Rotating raccoon facts (15 facts, 3-second intervals)
  - 5 raccoon emojis with wave animation
  - Purple glow effects
  - Centered cool raccoon image

### Phase 3 - Interactive Games ✅
- **Raccoon Feud** (Family Feud style)
  - Blue/gold theme
  - Survey-style questions with fuzzy answer matching
  - Score tracking, strike system
  - Turn-based gameplay
  
- **Truth or Dare**
  - Purple/pink theme
  - Bottle spin animation
  - Truth/Dare choice system
  - Manual question input from opponent

### Phase 4 - Admin Panel ✅
- User management table with search/filter
- Ban/Unban functionality
- Premium status control
- User statistics (total, premium, banned, active)

### Phase 5 - Premium & Profile ✅
- **Premium Page**:
  - Games: Play any game, choose which game
  - Filters: Funny filters, beauty filters, switch anytime
  - Matching Control: Gender filter, country filter
  - Chat Control: Chat preferences, priority queue
  - Pricing: $4/week, $12/month, $28/3months
  
- **Profile Page**:
  - User avatar and stats
  - Session/time/games metrics
  - Account details section

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/ (user, guest, message, match, game)
│   ├── routes/ (auth, auth_multiple, admin)
│   ├── services/ (auth, country, db, matching, game)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/ui/
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching)
        ├── pages/ 
        │   ├── Landing.js
        │   ├── Login.js
        │   ├── Signup.js
        │   ├── Guest.js
        │   ├── Dashboard.js
        │   ├── Match.js
        │   ├── Premium.js
        │   ├── Profile.js
        │   ├── GameFeud.js
        │   ├── GameTruthOrDare.js
        │   └── Admin.js
        └── App.js
```

## Key Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/guest
- GET /api/auth/me
- GET /api/admin/users
- POST /api/admin/users/{id}/ban
- POST /api/admin/users/{id}/premium
- Socket.IO: /api/socket.io

## Tech Stack
- Backend: FastAPI, python-socketio, Motor (MongoDB async)
- Frontend: React, socket.io-client, Tailwind CSS, Shadcn UI
- Database: MongoDB

---

## 🔴 MOCKED/Placeholder Features
- Social login buttons (Google, Apple, Phone) - UI only
- Payment integration for Premium - buttons only
- Camera filters - future feature

---

## 📋 Future Enhancements
- WebRTC video chat
- Camera filters integration
- Payment integration (Stripe)
- Push notifications
- User reporting system
- Chat history persistence
