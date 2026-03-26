# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a premium real-time social matching platform for text and video chat. The app must feel instant, alive, smooth, and addictive with production-level UX, performance, and monetization. Features a cool raccoon mascot (sunglasses, gold chain, cigar) with a cinematic dark space aesthetic.

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

### Brand Identity (TASK 16-17) ✅
- Cool raccoon mascot (sunglasses, gold chain, cigar)
- Circular frame display with purple glow
- Cinematic space aesthetic

### Global Cinematic Space Background (TASK 17) ✅
- Multi-layer animated starfield
- Subtle nebula gradients (purple/blue)
- Shooting star animations
- Applied to: Landing, Login, Signup, Guest, Dashboard, AgeVerification
- Mobile optimized, performance-friendly

### Frontend Authentication (TASK 19) ✅
- Created `/app/frontend/src/utils/auth.js`:
  - Client-side validation (email, password, username, gender, phone, OTP)
  - Form validation helpers (validateLoginForm, validateSignupForm)
  - Error message extraction from API responses
  - Token management (storage, validation, expiry check)
- Updated Login.js with:
  - Real inline error messages on validation failure
  - Form-level error display for API errors
  - Duplicate submit prevention (disabled while loading)
  - Proper redirect based on age_verified status
- Updated Signup.js with:
  - Client-side validation for all fields
  - Inline error display per field
  - Terms agreement validation
  - Proper redirect to age verification
- Enhanced AuthContext:
  - Token validation on mount (checks JWT expiry)
  - Automatic logout on invalid/expired tokens
  - Session restoration on page refresh
  - Better error handling
- Updated api.js:
  - Request interceptor with token validation
  - Response interceptor for 401/403 handling
  - Automatic redirect to login on auth failures

### Guest, Phone OTP, Social Auth (TASK 20) ✅
- **Guest Login**:
  - Creates REAL backend user in `guests` collection
  - Receives JWT token, trackable in sessions/moderation
  - Auto-generated username (Guest####)
- **Phone OTP Flow**:
  - Created `PhoneAuth.jsx` with state transitions (phone → OTP → success)
  - Backend endpoints: `/api/auth/phone/send-otp`, `/verify-otp`, `/resend-otp`
  - 5-minute OTP expiration, 3 attempt limit
  - Masked phone display, resend countdown timer
- **Social Auth (Google/Apple)**:
  - Created `SocialAuthButtons.jsx` with proper icons
  - Wired to Firebase handlers, backend `/api/auth/social` endpoint
  - Graceful fallback when Firebase not configured

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
        ├── components/
        │   ├── auth/ (AuthComponents.jsx)
        │   ├── background/ (SpaceBackground.jsx) ✅
        │   ├── branding/ (RaccoonLogo.jsx)
        │   ├── ui/ (Button.jsx, Input.jsx) ✅
        │   └── (games, filters, modals)
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
- POST /api/auth/verify-age
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
- Backend: 100% pass
- Frontend: Verified via screenshots
- Space Background: Working on all pages
- Design System: Button/Input components integrated

---

## Upcoming Tasks (From User's Master List)
- Tasks 19-46 pending (to be provided by user)

## Future/Backlog
- Full Stripe production integration
- Firebase social login activation
- Additional page backgrounds (Match, Premium, Admin)
