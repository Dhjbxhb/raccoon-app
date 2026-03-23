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

### Phase 4 - Admin Panel ✅ (COMPLETELY REBUILT)
- **Full Admin Control Center** with 5 tabs:
  - Dashboard, Users, Reports, Premium, Sessions
  
- **Live Platform Stats**:
  - Total Users, Guests, Premium, Banned
  - Total Matches, Messages, Reports
  - Live Online count (users online now)
  - Today vs Yesterday comparisons with % changes
  - Alerts for pending reports and expiring premium
  
- **User Management**:
  - Search by name, email, or ID
  - Filter: All, Premium, Banned, Guests
  - Click to view full user details:
    - Stats (matches, messages, reports, days on platform)
    - Profile info (country, gender, auth method, join date)
    - Quick actions (ban/unban, grant/remove premium)
  
- **Ban System**:
  - Temporary bans (1h, 24h, 7d, 30d, custom)
  - Permanent bans
  - Ban reason tracking
  
- **Premium Control**:
  - Grant premium (7d, 30d, 90d, 1yr, lifetime)
  - Remove premium
  - View expiring subscriptions
  
- **Report System**:
  - Report button in chat header
  - 8 report reasons (harassment, spam, etc.)
  - Admin report management with filters
  - Review/Action/Ignore reports
  - Ban user directly from report
  
- **Session Moderation**:
  - View match history
  - Inspect chat messages per session

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

### Phase 6 - Admin Security & Premium Gating ✅ (December 2025)
- **Admin Panel Security**:
  - `is_admin` field enforcement on all admin routes
  - Backend returns 403 for non-admin users
  - Frontend "Access Denied" page for unauthorized access
  - Admin account: `admin@raccoon.app` with full access
  
- **Premium Feature Gating**:
  - Lock icons on game cards for non-premium users
  - Instant redirect to /premium when clicking locked features
  - "Unlock All Premium Features" banner on Dashboard
  - Premium badge system ("PREMIUM" vs "PLAY NOW")

- **Admin Stats Enhancement**:
  - 7 stat cards: Total Users, Premium, Banned, Active Today, Total Matches, Messages Today, Guest Users
  - New `/api/admin/stats` endpoint

### Phase 7 - Matching Filters & Camera Filters ✅ (December 2025)
- **Matching Filters**:
  - Gender Preference (Anyone, Male, Female)
  - Country Preference (30+ countries with flags)
  - Premium-gated for non-"any" selections
  - Backend support for country matching
  
- **Camera Filters (Snapchat-style)**:
  - 11 filters: None, Beauty, Smooth Skin, Warm Glow, Cool Tone, Vintage, Raccoon, Big Head, Glasses, Sparkle, Neon
  - Real-time CSS filter processing
  - Filter selector overlay in VideoChat component
  - Premium-gated for advanced filters
  
- **Firebase Auth Structure** (Prepared):
  - Google Login integration ready
  - Apple Login structure prepared
  - Phone OTP flow prepared
  - Backend `/api/auth/social` endpoint for social auth sync

---

## Code Architecture
```
/app/
├── backend/
│   ├── models/ (user, guest, message, match, game)
│   ├── routes/ (auth, admin, payments)
│   ├── services/ (auth, country, db, matching, game, moderation)
│   ├── websocket/ (socket_handlers)
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/
        │   ├── VideoChat.js (with camera filters)
        │   └── MatchingFilters.js
        ├── config/
        │   └── firebase.config.js
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching, useWebRTC, useCameraFilters)
        ├── services/ (api, firebase.service)
        ├── pages/ 
        │   ├── Landing.js
        │   ├── Login.js (with social auth)
        │   ├── Signup.js
        │   ├── Guest.js
        │   ├── Dashboard.js (with premium gating)
        │   ├── Match.js (with matching filters)
        │   ├── Premium.js
        │   ├── Profile.js
        │   ├── GameFeud.js
        │   ├── GameTruthOrDare.js
        │   └── Admin.js (secured)
        └── App.js
```

## Key Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/guest
- POST /api/auth/social (NEW - Firebase social auth)
- GET /api/auth/me
- GET /api/admin/users (Admin only)
- GET /api/admin/stats (Admin only - NEW)
- POST /api/admin/users/{id}/ban (Admin only)
- POST /api/admin/users/{id}/premium (Admin only)
- POST /api/admin/setup-admin (One-time setup)
- Socket.IO: /api/socket.io

## Tech Stack
- Backend: FastAPI, python-socketio, Motor (MongoDB async)
- Frontend: React, socket.io-client, Tailwind CSS, Shadcn UI, Firebase
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

## 📋 Remaining Tasks
- [ ] WebRTC video chat full implementation
- [ ] Payment integration (Stripe)
- [ ] Push notifications
- [ ] User reporting system
- [ ] Chat history persistence
