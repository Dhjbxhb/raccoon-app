# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a real-time web application called "RACCOON APP" - a premium social matching platform similar to Omegle but more advanced with a premium, gamified feel. The app must feel instant, alive, smooth, and addictive with a focus on UX, performance, monetization, and scalability.

---

## ✅ COMPLETED PHASES

### Phase 1 - Foundation & Authentication ✅
- FastAPI backend with JWT authentication
- Email/Password & Guest login
- Cinematic landing page with cool raccoon character
- Clean Login page (minimal)
- Branded Signup page with social login buttons (UI placeholders)
- Minimal Guest page
- IP-based country detection (multi-provider fallback)
- Responsive design

### Phase 2 - Real-Time Matching & Chat ✅
- Socket.IO integration (path: /api/socket.io)
- Real-time matching queue system with progressive filter relaxation (2-5 sec target)
- Chat with typing indicators
- Skip & Block functionality
- Enhanced matching screen with rotating raccoon facts

### Phase 3 - Interactive Games ✅
- **Raccoon Feud** (Family Feud style)
- **Truth or Dare** with bottle spin animation
- Game UI components as non-intrusive overlays
- Points system during gameplay

### Phase 4 - Admin Panel ✅
- **Full Admin Control Center** with 5 tabs:
  - Dashboard, Users, Reports, Premium, Sessions
- Live Platform Stats
- User Management with search/filter
- Ban System (temporary and permanent)
- Premium Control
- Report System

### Phase 5 - Premium & Profile ✅
- **Premium Page** with subscription tiers:
  - Weekly: $2.99
  - Monthly: $7.99 (BEST VALUE)
  - 3 Months: $19.99 (SAVE 44%)
- **Profile Page** with user stats

### Phase 6 - Admin Security & Premium Gating ✅
- Admin Panel Security with `is_admin` field enforcement
- Premium Feature Gating with lock icons
- Instant redirect to /premium for locked features

### Phase 7 - Matching Filters & Camera Filters ✅
- **Matching Filters**: Gender Preference, Country Preference
- **Camera Filters (Snapchat-style)**: 11 filters using CSS
- Firebase Auth Structure (prepared)

### Phase 8 - Legal & Compliance (December 2025) ✅
- **Age Verification Modal (18+)** on first entry
  - Stores confirmation in localStorage
  - Links to Terms and Privacy Policy
- **Terms of Service** (/terms)
  - Age requirement, user responsibilities, prohibited content
  - Account suspension, premium services, liability
- **Privacy Policy** (/privacy)
  - Data collection, storage, security
  - Third-party services, user rights
- **Community Guidelines** (/guidelines)
  - DO/DON'T sections with clear consequences
  - Warning → Temporary Ban → Permanent Ban
- **Refund Policy** (/refund)
  - Subscription explanation, eligibility criteria
  - Contact: billing@raccoonapp.com
- **Terms Checkbox on Signup**
  - Required before account creation
- **Footer Links** on Landing Page
  - Terms, Privacy, Guidelines, 18+ only

### Phase 9 - Matching System Optimization ✅
- Progressive filter relaxation:
  1. Perfect match (exact filters)
  2. Relaxed country filter
  3. Relaxed gender filter (any)
- Multi-provider IP geolocation fallback (ipapi.co, ip-api.com, ipwho.is)
- Queue statistics tracking

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/ (user, guest, message, match, game, report)
│   ├── routes/ (auth, admin, payments, reports)
│   ├── services/ (auth, country, db, matching, game, moderation, chat_moderation)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/ (shadcn components)
        │   ├── AgeVerificationModal.js
        │   ├── Footer.js
        │   ├── VideoChat.js
        │   ├── MatchingFilters.js
        │   ├── TruthOrDareGame.js
        │   └── RaccoonFeudGame.js
        ├── config/ (firebase.config.js)
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching, useWebRTC, useCameraFilters)
        ├── services/ (api, firebase.service)
        ├── pages/ 
        │   ├── Landing.js, Login.js, Signup.js, Guest.js
        │   ├── Dashboard.js, Match.js, Profile.js
        │   ├── Premium.js, PremiumSuccess.js
        │   ├── Terms.js, Privacy.js, Guidelines.js, Refund.js
        │   ├── GameFeud.js, GameTruthOrDare.js
        │   └── Admin.js
        └── App.js
```

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

## Tech Stack
- Backend: FastAPI, python-socketio, Motor (MongoDB async), httpx
- Frontend: React, socket.io-client, Tailwind CSS, Shadcn UI
- Database: MongoDB
- Auth: JWT + Firebase Authentication (prepared)

---

## 🔴 Pending Firebase Configuration
Social login buttons (Google, Apple, Phone) are fully integrated but require Firebase credentials:
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

---

## 📋 Remaining Tasks / Backlog

### P0 - Critical
- [ ] Fix "Made with Emergent" branding (platform-injected, may need Emergent support)

### P1 - High Priority  
- [ ] WebRTC video chat auto-start optimization
- [ ] Real-time online user count from backend
- [ ] Push notifications setup

### P2 - Medium Priority
- [ ] Stripe live integration (test mode working)
- [ ] Firebase social login activation
- [ ] Chat history persistence

### P3 - Future Enhancements
- [ ] User profile customization
- [ ] More game modes
- [ ] Leaderboards

---

## Admin Credentials
- Email: admin@raccoon.app
- Password: Admin123!

---

## Testing Status
- Backend: 100% pass (iteration_4.json)
- Frontend: 100% pass (all features verified)
- Test files: /app/backend/tests/
