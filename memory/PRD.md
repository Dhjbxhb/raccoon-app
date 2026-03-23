# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a real-time web application called "RACCOON APP" - a premium social matching platform for text and video chat. The app must feel instant, alive, smooth, and addictive with focus on UX, performance, monetization, and scalability.

---

## ✅ COMPLETED FEATURES (December 2025)

### Core Foundation
- FastAPI backend with JWT authentication
- Email/Password & Guest login with auto-country detection
- MongoDB database with Motor async driver
- Socket.IO real-time communication

### UI/UX
- **Landing Page**: Dark theme, animated background, prominent "Start" button
- **Pre-Match Screen**: Minimalist card with premium-locked filters
- **Match Screen**: 
  - Camera auto-starts when matched (no click required)
  - Large, centered video layout
  - Clean control bar with Skip/Report/Block buttons
- **Mobile Responsive**: All buttons visible, chat input accessible
- **Premium Gating**: Lock icons on gender/country filters

### Legal & Compliance
- **Age Verification Modal (18+)** on first entry
- **Terms of Service** (/terms)
- **Privacy Policy** (/privacy)
- **Community Guidelines** (/guidelines)
- **Refund Policy** (/refund)
- **Terms Checkbox** on signup form

### Games (Premium)
- **Truth or Dare**: Bottle spin animation, result reveal
- **Raccoon Feud**: Family Feud style with answer reveal animations
- Points system during gameplay

### Camera Filters
11 CSS-based filters:
- None, Beauty, Smooth, Warm, Cool
- Vintage, Neon, Sparkle, Raccoon
- Big Head, Glasses
(Some filters premium-locked)

### Admin Panel
- Dashboard with live stats
- User management (search, filter, view profiles)
- Ban system (temporary/permanent)
- Premium control
- Report management

### Performance
- Fast matching (2-5 seconds with progressive filter relaxation)
- Multi-provider IP geolocation fallback
- Mobile-optimized responsive design
- No external branding visible

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/ (user, guest, message, match, game, report)
│   ├── routes/ (auth, admin, payments, reports)
│   ├── services/ (auth, country, db, matching, game, moderation)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/ (shadcn)
        │   ├── AgeVerificationModal.js
        │   ├── TruthOrDareGame.js
        │   ├── RaccoonFeudGame.js
        │   └── MatchingFilters.js
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching, useWebRTC, useCameraFilters)
        ├── pages/ 
        │   ├── Landing.js, Login.js, Signup.js, Guest.js
        │   ├── Dashboard.js, Match.js, Profile.js
        │   ├── Premium.js, Admin.js
        │   └── Terms.js, Privacy.js, Guidelines.js, Refund.js
        └── App.js (includes branding removal)
```

---

## Key Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/guest
- GET /api/auth/me
- POST /api/reports/create
- GET /api/admin/dashboard-stats
- GET /api/admin/users
- POST /api/admin/users/{id}/ban
- POST /api/admin/users/{id}/premium
- POST /api/payments/create-checkout-session
- Socket.IO: /api/socket.io

---

## Premium Subscription Tiers
- Weekly: $2.99
- Monthly: $7.99 (BEST VALUE)
- 3 Months: $19.99 (SAVE 44%)

---

## 🔴 Pending Configuration

### Firebase (Social Login)
Requires user-provided credentials:
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
```

### Stripe (Production)
Test mode working. Needs production keys for live payments.

---

## 📋 Backlog / Future Tasks

### P1 - High Priority
- [ ] Live online user count from backend
- [ ] WebRTC optimization for lower latency
- [ ] Push notifications

### P2 - Medium Priority
- [ ] Stripe live integration
- [ ] Firebase social login activation
- [ ] Chat history persistence

### P3 - Future
- [ ] User profile customization
- [ ] More game modes
- [ ] Leaderboards

---

## Admin Credentials
- Email: `admin@raccoon.app`
- Password: `Admin123!`

---

## Testing Status
- Backend: 100% pass (12/12 tests)
- Frontend: 100% pass (all features verified)
- Mobile responsive: Verified on 390x844 viewport
- Test reports: `/app/test_reports/iteration_5.json`

---

## Tech Stack
- **Backend**: FastAPI, python-socketio, Motor, httpx
- **Frontend**: React, socket.io-client, Tailwind CSS, Shadcn UI
- **Database**: MongoDB
- **Real-time**: WebSockets + WebRTC
- **Auth**: JWT
