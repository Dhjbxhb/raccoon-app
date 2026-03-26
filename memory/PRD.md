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

### Real-Time Matching Queue & Sessions (TASK 22) ✅
- **Matching Queue** (`/app/backend/services/matching_service.py`):
  - Thread-safe queue with RLock
  - Duplicate entry prevention
  - Progressive filter relaxation for fast matching (2-5 seconds):
    1. Perfect match (gender + country)
    2. Relaxed country
    3. Relaxed all
  - Automatic cleanup on disconnect/skip/cancel
  - Queue statistics tracking
- **Session Model** (`/app/backend/models/session.py`):
  - Full lifecycle tracking: session_id, user1/user2, start/end times
  - Duration calculation
  - End reason enum (skipped, disconnected, blocked, timeout, etc.)
  - Message count, game played tracking
- **Socket Handlers** (`/app/backend/websocket/socket_handlers.py`):
  - `join_queue`: Adds user, attempts immediate match
  - `leave_queue`: Safe removal
  - `skip_match`: Ends session, notifies partner
  - `disconnect`: Cleans up queue and sessions
  - Session stored in DB with full metadata
  - Partner notification on all session state changes

### WebRTC Video System (TASK 23) ✅
- **Frontend Hook** (`/app/frontend/src/hooks/useWebRTC.js`):
  - Production-ready peer-to-peer video implementation
  - Polite peer pattern to prevent race conditions
  - ICE candidate queuing for reliable connections
  - Connection timeout handling (30s)
  - Proper cleanup on session end/skip
  - Auto-start camera when matched
  - Camera filter support (CSS-based)
- **WebRTC Config** (`/app/frontend/src/config/webrtcConfig.js`):
  - Multiple STUN servers (Google, Mozilla)
  - TURN server placeholders for production
  - Desktop and mobile media constraints
  - CSS camera filter presets
- **Backend Signaling** (`/app/backend/websocket/socket_handlers.py`):
  - `webrtc_offer`: Forward SDP offers between peers
  - `webrtc_answer`: Forward SDP answers
  - `webrtc_ice_candidate`: Forward ICE candidates
  - `webrtc_end_call`: Signal call termination
- **Match Page Integration** (`/app/frontend/src/pages/Match.js`):
  - Split video layout (local/remote)
  - Swipeable Snapchat-style camera filters
  - Connection state indicators
  - Error handling with user feedback

### Match Page Video Layout (TASK 24) ✅
- **Desktop Layout** (≥1024px):
  - Side-by-side split (50/50)
  - LEFT = My video (local) with green "You" label
  - RIGHT = Stranger video (remote) with blue label
  - No floating mini-preview - both videos equal size
- **Mobile Layout** (<1024px):
  - Vertical stack
  - TOP = Stranger video
  - BOTTOM = My video
  - Both panels large and visible
- **Styling** (`/app/frontend/src/styles/match.css`):
  - Premium dark theme with subtle purple glow
  - Rounded corners (16px desktop, 14px mobile)
  - 4px gap between panels
  - Smooth transitions and animations
  - Glass-morphism labels and controls
- **Components**:
  - `VideoPanel.jsx` - Reusable video container
  - Top bar with partner info, Report/Skip buttons
  - Bottom bar with games, chat toggle, message input
  - Chat overlay (desktop) with message bubbles

### Premium Match Top Bar (TASK 25) ✅
- **Component** (`/app/frontend/src/components/match/MatchTopBar.jsx`):
  - Reusable top bar for match controls
  - Safe area aware (notch/status bar support)
- **Partner Info Display**:
  - Avatar with first letter + premium gold badge
  - Username (truncated on mobile)
  - Country with flag emoji + location icon
  - Verified badge support
  - Session duration timer (MM:SS format)
- **Action Buttons**:
  - Report button: Orange styling, icon-only on mobile
  - Skip button: Prominent purple with glow effect
  - Both always visible (NOT hidden in menus)
- **Styling**:
  - Glass-morphism (blur + gradient overlay)
  - Doesn't block video content
  - Responsive (desktop: full labels, mobile: compact)
  - Smooth hover/press states

### Skip Logic & Session Exit (TASK 26) ✅
- **Frontend Hook** (`/app/frontend/src/hooks/useMatching.js`):
  - Clean skip flow with `isSkipping` loading state
  - Auto-rejoin queue after skip
  - Prevents double-skip with debouncing
  - Safety timeout (3s) for forced state reset
  - State cleanup prevents stale chat/video/game leaking
  - `endSession()` for clean page exit
  - `setAutoRejoin()` to control queue behavior
- **useChat Hook** (`/app/frontend/src/hooks/useChat.js`):
  - Auto-clear messages when session changes
  - `clearMessages()` for manual reset
- **Backend** (`/app/backend/websocket/socket_handlers.py`):
  - `skip_match` event updates DB session:
    - `status: 'ended'`
    - `end_reason: 'skipped'`
    - `ended_by: user_id`
    - `duration_seconds` calculated
    - `message_count` preserved
  - Partner notified with `match_ended` event
  - User returned to queue safely
- **UI Feedback**:
  - Skip button shows loading spinner while processing
  - Toast notification "Finding next match..."
  - Searching state shows "Skipping..." during transition

### Report System Backend (TASK 27) ✅
- **Report Model** (`/app/backend/models/report.py`):
  - Full report structure: report_id, reporter/reported info, reason, details, session_id
  - ReportReason enum (harassment, spam, underage, hate_speech, etc.)
  - ReportStatus enum (pending, under_review, resolved, dismissed, escalated)
  - ModerationAction enum (warning, temp bans, permanent ban)
  - Auto-priority calculation based on reason severity
- **Report Routes** (`/app/backend/routes/reports.py`):
  - `POST /api/reports/create` - Submit report with validation
  - `GET /api/reports/my-reports` - User's submitted reports
  - `GET /api/reports/admin/list` - Admin: list with filters
  - `GET /api/reports/admin/{id}` - Admin: get report details
  - `PATCH /api/reports/admin/{id}` - Admin: update status/action
  - `GET /api/reports/admin/stats` - Admin: report statistics
- **Validation**:
  - Can't report yourself
  - Can't report non-existent users
  - Rate limiting (1 report/user/hour)
  - Session linkage validated if provided
- **Database**: Reports stored with indexes for efficient querying

### Report Modal UI (TASK 28) ✅
- **Component** (`/app/frontend/src/components/match/ReportModal.jsx`):
  - Premium space-themed modal with animated entrance/exit
  - 10 categorized report reasons with icons and severity levels
  - Optional details field with 500 char limit and counter
  - Privacy note reassuring users about confidentiality
  - Keyboard accessible (Escape to close)
  - Success state with animated checkmark
  - Error handling with specific messages (rate limit, not found)
- **Styling** (`/app/frontend/src/styles/modals.css`):
  - Glass-morphism design
  - Orange accent color for report theme
  - Responsive grid layout for reasons
  - Smooth animations (fade, slide, shake for errors)
- **Integration**:
  - Connected to `/api/reports/create` endpoint
  - Proper token authentication
  - Toast notifications for success/error
  - Auto-close after successful submission

### Real-Time Chat System (TASK 29) ✅
- **Message Model** (`/app/backend/models/message.py`):
  - Complete model: message_id, session_id, sender info, content, timestamp
  - Moderation flags and delivery status
  - Database indexes for efficient querying
- **Backend Socket Events** (already in `socket_handlers.py`):
  - `send_message` - Stores in DB and forwards to partner
  - `typing_start` / `typing_stop` - Typing indicators
  - Messages linked to session for history
- **ChatPanel Component** (`/app/frontend/src/components/match/ChatPanel.jsx`):
  - Premium rounded message bubbles (purple own / dark partner)
  - Typing indicator with animated bouncing dots
  - Auto-scroll with "new message" button
  - Timestamp dividers every 5 minutes
  - Empty state with friendly message
  - Collapsible on mobile (bottom sheet style)
- **Chat Styles** (`/app/frontend/src/styles/chat.css`):
  - Glass-morphism overlay panel
  - Desktop: Fixed position overlay (20rem width)
  - Mobile: Bottom sheet (50vh max)
  - Keyboard-safe input handling
  - Smooth animations for messages
- **useChat Hook** (`/app/frontend/src/hooks/useChat.js`):
  - Real-time message sync
  - Typing indicator debounce (1.5s timeout)
  - Auto-clear on session change

### Matching Filter System (TASK 30) ✅
- **Full-Featured Filter Modal** (`/app/frontend/src/components/MatchingFilters.js`):
  - Premium-themed glass-morphism modal
  - Complete list of 200+ countries with flag emojis
  - Searchable country dropdown with live filtering
  - Gender preference filter (Anyone/Male/Female)
  - Premium lock indicators on non-free options
  - Auto-detected country suggestion
  - Reset and Apply buttons
- **useMatching Hook Integration** (`/app/frontend/src/hooks/useMatching.js`):
  - `startMatching(genderFilter, countryFilter)` passes filters to backend
  - `lastFiltersRef` stores filters for auto-rejoin after skip
- **Backend Queue Logic** (`/app/backend/services/matching_service.py`):
  - `add_to_queue()` accepts `gender_filter` and `country_filter`
  - Progressive filter relaxation for fast matching:
    1. Perfect match (exact gender + country)
    2. Relaxed country (gender only)
    3. Relaxed all (any compatible user)
  - Bidirectional filter compatibility checking
- **Socket Handler** (`/app/backend/websocket/socket_handlers.py`):
  - `join_queue` event extracts and passes filter params
- **Premium Gating**:
  - Free users: Only "Anyone" gender, "Any Country"
  - Premium users: All gender options, specific country selection

### Live Camera Filter System (TASK 31) ✅
- **Video Filter Engine** (`/app/frontend/src/utils/videoFilters.js`):
  - Core filter definitions with CSS values and canvas overlays
  - 13 filters across 4 categories: Basic, Beauty, Cinematic, Fun
  - Filters include: None, Beauty, Smooth, Glow, Warm, Cool, Vintage, B&W, Cinema, Raccoon, Neon, Sparkle, VHS, Dreamy
  - CSS-based filtering for 60fps performance
  - Canvas overlay renderer for advanced effects (raccoon mask, vignette, scanlines)
  - `VideoFilterEngine` class for frame processing
- **Swipe-Based Camera Filters UI** (`/app/frontend/src/components/match/CameraFilters.jsx`):
  - Horizontal swipe interaction (touch + mouse drag)
  - Circular filter icons with center = active selection
  - Purple glow ring on active filter
  - Smooth cubic-bezier animations
  - Premium lock badges with crown icon
  - Dot indicators for all filters
  - Arrow navigation buttons (desktop)
  - "Swipe to change filter" hint text
  - Haptic feedback on filter change (mobile)
  - Keyboard navigation (arrow keys + Escape)
- **Styling** (`/app/frontend/src/styles/filters.css`):
  - Glass-morphism filter panel
  - Responsive design for mobile
  - Animated pulse ring on active filter
  - Premium crown badges
- **Integration with Match Page** (`/app/frontend/src/pages/Match.js`):
  - Live CSS filter application on video element
  - Filter badge shows active filter name + icon
  - Swipe on video panel changes filters
  - Premium check before applying premium filters

### Raccoon Feud Backend & Multiplayer (TASK 32) ✅
- **Enhanced Question Bank** (`/app/backend/services/game_service.py`):
  - 20+ questions across 9 categories (technology, food, everyday, hobbies, vehicles, dating, habits, entertainment, animals)
  - Each answer has alternative accepted responses for flexible matching
  - Points range from 5-40 per answer
- **Advanced Fuzzy Matching**:
  - Uses `rapidfuzz` library for intelligent answer matching
  - Supports exact match, partial match, word overlap, and similarity scoring
  - 70% threshold for fuzzy acceptance
  - Alt answers like "instagram" matching "social media"
- **Game Models** (`/app/backend/models/feud_game.py`):
  - `FeudAnswer`: answer, points, revealed status, guessed_by
  - `FeudQuestion`: question_id, question, category, answers, total_points
  - `FeudGameState`: Complete game state with players, scores, strikes, history
  - `FeudGameResult`: Final result for DB persistence and leaderboards
- **FeudGameService Features**:
  - Turn-based gameplay with steal mechanics
  - 3-strike system per player
  - Steal opportunity after 3 strikes
  - Round scores and total scores tracked
  - Winner determination at game end
  - Guess history for replay/audit
- **Socket Events** (`/app/backend/websocket/socket_handlers.py`):
  - `start_feud_game`: Creates game and notifies both players
  - `feud_guess`: Submits guess, broadcasts result to both players
  - `feud_game_started`: Sends initial game state with player IDs
  - `feud_guess_result`: Real-time feedback (correct/strike/steal)
  - `feud_game_ended`: Final scores and winner announcement
  - `end_feud_game`: Early game termination
- **MongoDB Persistence**:
  - Saves game results to `feud_results` collection
  - Tracks duration, questions played, final scores
- **Multiplayer Frontend** (`/app/frontend/src/components/RaccoonFeudGameMultiplayer.jsx`):
  - Real-time socket sync between 2 players
  - Turn indicator ("Your turn" / "Opponent's turn")
  - Live scoreboard with strikes visualization
  - Correct/strike feedback animations
  - Steal attempt indicator
  - End-game winner screen with play again option

### Complete Game Systems Refactor (TASK 33) ✅
- **Database Models** (`/app/backend/models/`):
  - `feud_question.py`: FeudQuestion model with answers, scores, categories
  - `feud_session.py`: FeudSession with full game state persistence
  - `truth_session.py`: TruthSession with bottle mechanics and rounds
- **Enhanced Game Service** (`/app/backend/services/game_service_v2.py`):
  - 20 questions across 9 categories with fuzzy matching
  - FeudGameService: Turn-based play, 3-strike system, steal mechanics
  - TruthOrDareService: Bottle spin, direction calculation, round management
  - MongoDB persistence for both games
- **New Frontend Components** (`/app/frontend/src/components/games/`):
  - `FeudGame.jsx`: Premium overlay on MY video only, real-time sync
  - `TruthOrDare.jsx`: Bottle animation, direction logic (desktop/mobile)
- **Premium Styling** (`/app/frontend/src/styles/games.css`):
  - Space-themed glass-morphism overlays
  - Gold theme for Feud, pink theme for Truth or Dare
  - No childish visuals
- **Match Integration** (`/app/frontend/src/pages/Match.js`):
  - Games overlay on MY video panel only
  - Stranger video remains visible
  - Chat, report, skip still accessible
- **Bottle Direction Rules**:
  - Desktop: LEFT = me, RIGHT = stranger
  - Mobile: TOP = stranger, BOTTOM = me
  - Backend determines result, frontend syncs animation

### Strict Game-to-Match Integration (TASK 34) ✅
- **Video Priority Enforcement** (`/app/frontend/src/pages/Match.js`):
  - Single source of truth: `activeGame` state (null | 'feud' | 'truthordare')
  - Games can only overlay MY video panel
  - Stranger video ALWAYS remains visible and unobstructed
- **Conflict Prevention**:
  - Only one game can run at a time via `toggleGame()` function
  - Disabled state on other game button when one is active
  - Prevents duplicate game sessions via `isGameActive` check
- **State Reset Logic** (`resetAllGameState`):
  - Resets on: game end, match skip, partner disconnect, session change
  - Clears: activeGame, gameSessionId, messageInput, camera filters
  - Socket listeners for `feud_game_ended`, `tod_game_ended`, `partner_disconnected`
- **Layout Safety**:
  - Desktop: MY video (LEFT) + STRANGER video (RIGHT) - game on LEFT only
  - Mobile: STRANGER (TOP) + MY video (BOTTOM) - game on BOTTOM only
  - Game container inherits border-radius from video panel
  - z-index properly managed (game=25, controls=20)
- **Bottom Bar Integration** (`match-bottombar`):
  - Active game indicator with pulsing glow
  - Disabled state styling for unavailable game buttons
  - Chat input remains accessible during games
- **CSS Enhancements** (`/app/frontend/src/styles/match.css`, `games.css`):
  - `.game-container` with slide-in animation
  - Video dims when game overlay active
  - Border glow indicates active game type

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
- Tasks 35-41 pending (to be provided by user)

## Future/Backlog
- Full Stripe production integration
- Firebase social login activation
- Additional page backgrounds (Match, Premium, Admin)
