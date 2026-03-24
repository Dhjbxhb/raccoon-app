# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a premium real-time social matching platform for text and video chat. The app must feel instant, alive, smooth, and addictive with production-level UX, performance, and monetization.

---

## ✅ COMPLETED FEATURES

### Core Authentication
- Email/Password login and signup
- Guest mode with instant access
- Social login structure (Google, Apple, Phone OTP) - awaiting Firebase config
- JWT token-based authentication
- Age verification (18+) on first entry
- Terms & Privacy checkbox on signup

### Match System
- **Desktop Layout**: Horizontal split (LEFT=Me, RIGHT=Stranger)
- **Mobile Layout**: Vertical stack (TOP=Stranger, BOTTOM=Me)
- Camera auto-starts when matched (no manual toggle)
- Fast matching (2-5 seconds) with progressive filter relaxation
- Real-time WebSocket communication
- Skip and Block functionality

### Video Experience
- WebRTC peer-to-peer video calls
- Camera auto-start on match
- No camera/mic toggle buttons (always live)
- Snapchat-style camera filter carousel:
  - None, Beauty, Smooth, Warm, Cool
  - Vintage, Neon, Sparkle, Raccoon
  - Big Head, Glasses

### Games (Premium)
- **Truth or Dare**: 
  - Bottle spin animation in CENTER
  - Direction logic (Desktop: left=me, right=stranger | Mobile: up=stranger, down=me)
  - Truth/Dare selection after spin
  - Point scoring
- **Raccoon Feud** (Family Feud style):
  - Overlays only MY video side (stranger stays visible)
  - Answer reveal animations
  - Live scoring
  - 3-strike system

### Chat System
- Real-time messaging via Socket.IO
- Typing indicators
- Message history per session
- Premium-feeling bubble design with glow

### Premium Features (Gated)
- Gender filter (Male/Female preference)
- Country filter (searchable worldwide)
- Camera filters
- Games access

### Premium Subscriptions
- Weekly: $2.99
- Monthly: $7.99 (BEST VALUE)
- 3 Months: $19.99 (SAVE 44%)

### Legal & Compliance
- Terms of Service (/terms)
- Privacy Policy (/privacy)
- Community Guidelines (/guidelines)
- Refund Policy (/refund)
- Age verification modal (18+)
- Terms checkbox on signup

### Admin Panel (Full Control)
- **Dashboard**: Live stats from real data
  - Total users, active users, premium users
  - Total matches, messages
  - Today vs yesterday comparisons
- **User Management**: Search, filter, view profiles
- **Ban System**: Temporary and permanent bans
- **Premium Control**: Grant/remove premium
- **Report System**: Review, action, dismiss reports

### Country Detection
- Multi-provider IP geolocation fallback (ipapi.co, ip-api.com, ipwho.is)
- Never shows "Not detected" - defaults to US if all providers fail
- Auto-detect on signup/login

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/
│   ├── routes/ (auth, admin, payments, reports)
│   ├── services/ (auth, country, db, matching, game, moderation)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/ (games, filters, modals)
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching, useWebRTC)
        ├── pages/ (Landing, Login, Signup, Guest, Match, Premium, Admin, etc.)
        └── App.js
```

---

## Key API Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/guest
- GET /api/auth/me
- POST /api/reports/create
- GET /api/admin/dashboard
- GET /api/admin/users
- POST /api/admin/users/{id}/ban
- POST /api/admin/users/{id}/premium
- Socket.IO: /api/socket.io

---

## 🔴 Pending Configuration

### Firebase (Social Login)
Requires user-provided credentials to activate Google/Apple/Phone login:
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
```

### Stripe (Production)
Test mode working. Needs production keys for live payments.

---

## Admin Credentials
- Email: `admin@raccoon.app`
- Password: `Admin123!`

---

## Testing Status
- Backend: 100% pass (13/13 tests)
- Frontend: 100% pass
- Test reports: `/app/test_reports/iteration_6.json`
