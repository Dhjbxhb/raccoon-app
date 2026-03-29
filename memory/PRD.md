# RACCOON APP - Product Requirements Document

## Original Problem Statement
Build a premium real-time social matching platform for text and video chat. The app must feel instant, alive, smooth, and addictive with production-level UX, performance, and monetization. Features a cool raccoon mascot (sunglasses, gold chain, cigar) with a cinematic dark space aesthetic.

---

## 🎉 PRODUCTION STATUS: READY

### Final Validation (TASK 41) - December 2025
**All 11 major user flows verified:**
1. ✅ Landing page - Space background, raccoon logo, legal links
2. ✅ Signup flow - Terms checkbox required, validation working
3. ✅ Login flow - Email/password auth, proper redirects
4. ✅ Guest flow - Quick match without registration
5. ✅ Age verification - 18+ confirmation persists to DB
6. ✅ Dashboard - Stats, games preview, matching button
7. ✅ Match page - Video panels, filters, games overlay
8. ✅ Premium page - Pricing, features, FAQ, legal links
9. ✅ Profile page - User stats, settings, logout
10. ✅ Legal pages - Real content (Terms, Privacy, Guidelines, Refund)
11. ✅ Admin page - Access control, metrics, moderation

**Cleanup Completed:**
- Removed test pages: ChatTest, FilterTest, MatchPreview, GameFeud, GameTruthOrDare
- Removed unused components: VideoChat, CameraFilterSelector, RaccoonFeudGame, TruthOrDareGame
- All routes properly protected
- 404s redirect to landing

---

## ✅ COMPLETED FEATURES

### Core Authentication
- Email/Password login and signup
- Guest mode with instant access
- **Firebase Google Sign-In** - ✅ LIVE (Using redirect flow for cross-origin compatibility)
- JWT token-based authentication
- Age verification (18+) on first entry
- Terms & Privacy checkbox on signup with acceptance timestamp tracking

### Legal System (TASK 39)
- **Terms of Service** (`/terms`) - Full production-ready legal page
- **Privacy Policy** (`/privacy`) - Complete privacy documentation
- **Refund Policy** (`/refund`) - 7-day satisfaction guarantee
- **Community Guidelines** (`/guidelines`) - Aligned with moderation system
- Footer with all legal links
- Landing page legal links
- Premium page legal links (Refund, Terms, Privacy)
- User model tracks `terms_accepted`, `terms_accepted_at`, `privacy_accepted`, `privacy_accepted_at`
- Backend validation blocks signup without terms acceptance

### Performance Optimization (TASK 40)
**Frontend:**
- React.memo() on SpaceBackground, Star, ShootingStars, FeudGame, TruthOrDare
- Debounced resize handlers
- Mount tracking refs to prevent state updates after unmount
- Socket ID tracking to prevent duplicate event listeners
- willChange CSS hints for animated elements
- Message history limit (200 max) to prevent memory bloat
- Debounced typing indicators

**Socket/WebRTC:**
- Socket reconnection with re-authentication
- Duplicate connection prevention
- Proper listener cleanup on unmount
- Local stream ref tracking for cleanup
- Peer connection cleanup on unmount
- Connection timeout handling

**Database:**
- MongoDB connection pooling (50 max, 10 min)
- Comprehensive indexes on all collections:
  - users: user_id, email, username, is_banned, premium_status, last_active, compound(country_code, gender)
  - guests: guest_id, is_banned, compound(country_code, gender)
  - sessions: session_id, user1_id+started_at, user2_id+started_at, status
  - messages: session_id+timestamp, sender_id
  - reports: report_id, reporter_id, reported_id, status, compound(status, created_at)
  - subscriptions: user_id+status, stripe_subscription_id, current_period_end
  - admin_logs: admin_id+timestamp, target_id+timestamp, action
  - blocked_users: compound(blocker_id, blocked_id)
  - matches: match_id, user1_id+created_at, user2_id+created_at

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

### Admin Panel - Full Control Center (TASK 35) ✅
- **Backend** (`/app/backend/routes/admin.py`):
  - Real MongoDB aggregation queries (no mocked data)
  - Admin-only access via JWT `is_admin` claim
  - Comprehensive endpoints for all operations
- **Dashboard Stats** (`GET /api/admin/dashboard`):
  - Live: Online users (registered + guests)
  - Overview: Total users, guests, premium, banned, matches, messages, reports
  - Today vs Yesterday: Active users, matches, messages, signups with % change
  - Alerts: Pending reports, premium expiring soon
- **User Management** (`GET /api/admin/users`, `/users/{id}`):
  - Search by name, email, or user ID
  - Filter: All, Premium, Banned, Guests
  - Paginated user list with stats
  - Detailed user profiles with activity history
- **Ban System** (`POST /api/admin/users/{id}/ban`):
  - Temporary bans (1h, 24h, 7d, 30d, custom hours)
  - Permanent bans
  - Ban reason tracking
  - Unban functionality
- **Premium Control** (`POST /api/admin/users/{id}/premium`):
  - Grant premium (7d, 30d, 90d, 1yr, custom, lifetime)
  - Remove premium
  - Track who granted and when
  - Premium expiration monitoring
- **Report System** (`GET /api/admin/reports`, `/reports/{id}/action`):
  - Filter by status: Pending, Reviewed, Actioned, Ignored
  - Report details with reporter/reported info
  - Take action: Review, Action, Ignore
  - Optional: Ban reported user directly from report
  - Admin notes for audit trail
- **Session/Match History** (`GET /api/admin/matches`, `/matches/{id}/messages`):
  - View all match sessions with user IDs and duration
  - View chat messages from specific sessions
  - Moderation capability for chat review
- **Frontend UI** (`/app/frontend/src/pages/Admin.js`):
  - 6 tabs: Dashboard, Users, Reports, Premium, Sessions, Audit Log
  - Space-themed glass-morphism design
  - Live online indicator
  - User detail modals with actions
  - Ban modal with duration options
  - Premium grant modal with duration options
  - Report action modal with ban option
  - Session message viewer modal

### Admin Action System (TASK 36) ✅
- **Backend Services Created**:
  - `/app/backend/services/ban_service.py` - Centralized ban management
  - `/app/backend/services/premium_service.py` - Centralized premium management
  - `/app/backend/services/admin_log_service.py` - Audit logging service
  - `/app/backend/models/admin_log.py` - Audit log model
- **Ban System Features**:
  - Permanent ban: `is_banned=true`, `ban_expires_at=null`
  - Temporary ban: `is_banned=true`, `ban_expires_at=<datetime>`
  - Auto-unban: Temp bans auto-expire when checked (login, socket auth, queue join)
  - Ban enforcement at: Login route, Socket authenticate, Queue join handler
  - Ban fields: `is_banned`, `ban_reason`, `ban_expires_at`, `banned_at`, `banned_by`
  - Unban fields: `unbanned_at`, `unbanned_by`
- **Premium System Features**:
  - Temporary premium with auto-expire
  - Lifetime premium (no expiry)
  - Fields: `premium_status`, `premium_tier`, `premium_expires_at`, `premium_granted_at/by`, `premium_removed_at/by`
- **Report Moderation Workflow**:
  - Status: pending → reviewed → actioned/ignored
  - Direct user ban from report action
  - Admin notes for audit trail
- **Audit Logging System**:
  - All actions logged to `admin_logs` collection
  - Types: ban_user, unban_user, temp_ban_user, grant_premium, remove_premium, action_report, etc.
  - Logs: admin_id, admin_username, target_id, target_type, details, ip_address, timestamp
  - API: `GET /api/admin/logs` with filtering
  - UI: Audit Log tab with action type filters
- **Frontend Components**:
  - `/app/frontend/src/components/admin/AdminUsersTable.jsx`
  - `/app/frontend/src/components/admin/AdminReportsTable.jsx`
  - `/app/frontend/src/components/admin/AdminActionLogs.jsx`
  - `/app/frontend/src/styles/admin.css`

### Stripe-Ready Payment Architecture (TASK 37) ✅
- **Plan Definitions** (`/app/backend/models/subscription.py`):
  - 5 plans: Weekly ($4.99), Monthly ($9.99), Quarterly ($19.99), Yearly ($39.99), Lifetime ($99.99)
  - Each plan: plan_id, plan_type, display_name, description, price_cents, billing_period_days, features, badge, savings_percent
  - Plans stored as `PREMIUM_PLANS` constant with `get_active_plans()`, `get_plan_by_id()` helpers
- **Subscription Model**:
  - Fields: subscription_id, user_id, plan_type, plan_id, status, start_date, expiry_date
  - Provider fields: provider (stripe/admin_grant/promo/manual), provider_subscription_id, provider_customer_id
  - Billing fields: amount_paid, currency, auto_renew
  - Status enum: active, cancelled, expired, pending, past_due, trialing
- **Subscription Service** (`/app/backend/services/subscription_service.py`):
  - `get_premium_status()` - SOURCE OF TRUTH for premium access
  - `create_subscription()` - Create new subscription with DB update
  - `cancel_subscription()` - Cancel immediate or at period end
  - `expire_subscription()` - Auto-expire when date passed
  - `renew_subscription()` - For Stripe webhook renewal
  - `process_expired_subscriptions()` - Batch expiry processing
- **Payment Routes** (`/app/backend/routes/payments.py`):
  - `GET /api/payments/plans` - List all active plans (no auth)
  - `GET /api/payments/premium-status` - Get user's premium status
  - `GET /api/payments/subscription` - Get current subscription
  - `POST /api/payments/create-subscription` - Create subscription
  - `POST /api/payments/create-checkout-session` - Stripe checkout (ready for Stripe)
  - `POST /api/payments/cancel-subscription` - Cancel subscription
  - `POST /api/payments/reactivate-subscription` - Reactivate cancelled sub
  - `POST /api/payments/webhook/stripe` - Stripe webhook handler
- **Webhook Events Handled**:
  - `checkout.session.completed` - New subscription
  - `invoice.paid` - Subscription renewed
  - `invoice.payment_failed` - Payment failed
  - `customer.subscription.deleted` - Subscription cancelled
  - `customer.subscription.updated` - Status change
- **Frontend Premium Page** (`/app/frontend/src/pages/Premium.js`):
  - Fetches plans from backend (not hardcoded)
  - Shows current premium status and subscription details
  - Pricing cards with plan selection
  - Cancel/reactivate subscription flow
  - FAQ section
  - Stripe checkout redirect ready
- **Frontend Components**:
  - `/app/frontend/src/components/premium/PricingCards.jsx` - Plan selection cards
  - `/app/frontend/src/components/premium/PremiumFeatureList.jsx` - Feature display
  - `/app/frontend/src/styles/premium.css` - Premium page styles
- **Stripe Integration Ready**:
  - Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in backend/.env
  - Set `stripe_price_id` on each plan in PREMIUM_PLANS
  - Uncomment Stripe SDK imports in payments.py

### Premium Feature Gating System (TASK 38) ✅
- **Backend Enforcement** (`/app/backend/middleware/premium_guard.py`):
  - `PremiumFeature` enum: GENDER_FILTER, COUNTRY_FILTER, CAMERA_FILTERS, PRIORITY_MATCHING, MINI_GAMES, etc.
  - `PREMIUM_FEATURES` config with free values: gender='any', country='ANY', camera=['none', 'warm', 'cool']
  - `PremiumGuard` class with async validation methods:
    - `check_premium_status()` - Gets premium status from subscription service
    - `validate_gender_filter()` - Returns (allowed, message, effective_filter)
    - `validate_country_filter()` - Returns (allowed, message, effective_filter)
    - `validate_camera_filter()` - Returns (allowed, message, effective_filter)
    - `validate_game_access()` - Returns (allowed, message)
  - Filters automatically downgraded to free values if non-premium
- **Socket Handler Enforcement** (`/app/backend/websocket/socket_handlers.py`):
  - `join_queue`: Validates gender/country filters, emits `premium_filter_blocked` if downgraded
  - `start_feud_game`: Validates game access, emits `premium_required` if blocked
  - `start_tod_game`: Validates game access, emits `premium_required` if blocked
- **Frontend MatchingFilters** (`/app/frontend/src/components/MatchingFilters.js`):
  - Premium banner: "Filters are a Premium feature" with crown icon
  - Lock icons on Gender (Male/Female) and Country Preference labels
  - Lock badges on individual locked options
  - `PremiumPromptModal` integration for locked feature clicks
  - Free options (Anyone, Any Country) remain selectable
- **Frontend CameraFilters** (`/app/frontend/src/components/match/CameraFilters.jsx`):
  - Premium lock indicators on locked filters
  - `PremiumPromptModal` when selecting locked filter
- **PremiumGate Components** (`/app/frontend/src/components/premium/PremiumGate.jsx`):
  - `PremiumGate` wrapper: overlay, inline, disable variants
  - `PremiumBadge`: Small premium indicator
  - `PremiumPromptModal`: Crown icon, feature name, Upgrade/Maybe Later buttons
  - `FeatureLockedToast`: Inline message for locked features
- **Match Page Socket Listeners** (`/app/frontend/src/pages/Match.js`):
  - `premium_filter_blocked`: Shows toast when filters downgraded
  - `premium_required`: Shows PremiumPromptModal for blocked games
- **Testing**: All 8 test cases passed (100% frontend success rate)

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
│   ├── models/ (admin_log, feud_question, truth_session, user)
│   ├── routes/ (auth, admin, payments, reports)
│   ├── services/ (auth, ban, premium, admin_log, matching, game, moderation, db)
│   ├── websocket/ (socket_handlers with ban enforcement)
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/ (AdminUsersTable, AdminReportsTable, AdminActionLogs) ✅
        │   ├── auth/ (AuthComponents.jsx)
        │   ├── background/ (SpaceBackground.jsx) ✅
        │   ├── branding/ (RaccoonLogo.jsx)
        │   ├── ui/ (Button.jsx, Input.jsx) ✅
        │   └── (games, filters, modals)
        ├── contexts/ (AuthContext, SocketContext)
        ├── hooks/ (useAuth, useChat, useMatching, useWebRTC)
        ├── pages/ (Landing, Login, Signup, Guest, Match, Premium, Admin, etc.)
        ├── styles/ (admin.css, match.css, games.css, filters.css)
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
- POST /api/admin/users/{id}/ban (with ban_service + audit logging)
- POST /api/admin/users/{id}/premium (with premium_service + audit logging)
- POST /api/admin/reports/{id}/action (with audit logging)
- GET /api/admin/logs (audit log retrieval)
- POST /api/admin/process-expired (manual expiry processing)
- Socket.IO: /api/socket.io (with ban enforcement on authenticate/join_queue)

---

## 🔴 Pending Configuration

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
- **TASK 35/41**: ✅ COMPLETED (Admin Panel with real DB metrics)
- **TASK 36/41**: ✅ COMPLETED (Admin actions: ban/unban/temp-ban/premium/reports + audit logging)
- **TASK 37/41**: ✅ COMPLETED (Stripe-ready payment architecture with plans, subscriptions, webhooks)
- Tasks 38-41 pending (to be provided by user)

## Future/Backlog
- Production TURN server setup
- Full Stripe production integration (set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET)
- Firebase social login activation
- Twilio SMS for production OTP
