# RACCOON APP - Migration Handoff Audit

This document is a codebase-first migration handoff for moving RACCOON APP off Emergent and onto your own VPS.

## Scope and Safety Notes
- Source of truth used: current preview workspace at `/app`
- Secrets are intentionally **redacted** from this document
- Where direct platform access is required (GitHub sync, DNS, production SSL, custom domain state), this document marks those items as **manual verification required**
- This audit does **not** assume the Emergent production deployment is identical to preview unless explicitly verified

---

## 1. Complete Frontend and Backend Technology Stack

### Frontend
- React `19.0.0`
- React Router DOM `7.5.1`
- Create React App + CRACO
- Tailwind CSS `3.4.x`
- Radix UI primitives
- Lucide React
- Axios
- Socket.IO Client `4.8.3`
- Firebase Web SDK `12.11.0`
- Sonner
- Recharts
- date-fns
- MediaPipe packages installed (`camera_utils`, `drawing_utils`, `face_mesh`) but not central to the current live camera path
- PostHog browser script embedded in `frontend/public/index.html`

### Backend
- Python `3.11+`
- FastAPI
- Uvicorn
- Python Socket.IO `5.11.0`
- Motor + PyMongo for MongoDB
- Pydantic v2
- bcrypt + JWT auth
- Stripe SDK installed
- httpx + requests
- Google/Firebase-related libraries installed
- boto3 installed but not actively wired into current core product flow

### Platform-specific dependencies to remove or review after migration
- `@emergentbase/visual-edits`
- `https://assets.emergent.sh/scripts/emergent-main.js`
- `.emergent/` metadata

---

## 2. Exact Frontend Install, Build, and Start Commands

Run from `/app/frontend`:

```bash
yarn install
yarn start
```

Build:

```bash
yarn build
```

Test:

```bash
yarn test
```

### Notes
- `yarn start` runs `craco start`
- Development port is typically `3000`
- Production build output is `frontend/build`

---

## 3. Exact Backend Install and Start Commands

Run from `/app/backend`:

### Create venv + install
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Development start
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Production start
Documented deployment command:

```bash
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8001 --timeout 60
```

### Important audit note
- `gunicorn` is referenced in deployment docs but is **not** pinned in `backend/requirements.txt`
- Install it explicitly on your VPS:

```bash
pip install gunicorn
```

---

## 4. Every Required Frontend Environment Variable Name

### Public frontend variables used by code
- `REACT_APP_BACKEND_URL`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

### Optional/workspace-only frontend variables
- `WDS_SOCKET_PORT`
- `ENABLE_HEALTH_CHECK`

---

## 5. Every Required Backend Environment Variable Name

### Active runtime variables
- `MONGO_URL`
- `DB_NAME`
- `CORS_ORIGINS`
- `JWT_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Present in workspace env but not core runtime for current product flow
- `EMERGENT_LLM_KEY`

### Used by backend tests only
- `REACT_APP_BACKEND_URL`

### Mentioned in placeholder/unfinished backend auth routes
- `GOOGLE_CLIENT_ID`
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- SMS provider credentials (Twilio or equivalent) - not yet formalized in active config

### Important mismatch
- Workspace backend env currently uses `STRIPE_API_KEY`
- Current code reads `STRIPE_SECRET_KEY`
- Result: Stripe remains effectively disabled unless you define `STRIPE_SECRET_KEY`

---

## 6. Which Environment Variables Are Public and Which Are Secret

### Public-by-design (frontend-exposed)
All `REACT_APP_*` variables are embedded into the frontend build and are public:
- `REACT_APP_BACKEND_URL`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

Also non-secret:
- `WDS_SOCKET_PORT`
- `ENABLE_HEALTH_CHECK`
- `DB_NAME`
- `CORS_ORIGINS`

### Secret
Do **not** expose:
- `MONGO_URL`
- `JWT_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMERGENT_LLM_KEY`
- Any future provider secrets for Google/Apple/SMS if implemented server-side

### Current storage locations
- Preview workspace files:
  - `frontend/.env`
  - `backend/.env`
- Possibly duplicated in Emergent deployment environment settings for preview and production

### Safe export / rotate / recreate
- MongoDB: create new DB user/password and rotate `MONGO_URL`
- JWT: generate a new strong random secret (32+ chars minimum)
- Stripe: rotate in Stripe Dashboard -> Developers -> API Keys and Webhooks
- Firebase web config: re-export from Firebase Console -> Project Settings

---

## 7. Every External Service Used by the Project

### Actively used
- MongoDB Atlas
- Firebase Auth
- Google Sign-In via Firebase popup
- Stripe (partially wired, not fully functional)
- PostHog
- IP geolocation providers:
  - `ipapi.co`
  - `ip-api.com`
  - `ipwho.is`
- Public STUN services:
  - Google STUN
  - Mozilla STUN
  - stunprotocol.org
- Google Fonts

### Emergent-specific artifacts
- `@emergentbase/visual-edits`
- `https://assets.emergent.sh/scripts/emergent-main.js`

### Installed but not clearly active in core product flow
- boto3 / S3-related packages
- OpenAI / emergentintegrations packages
- Google AI packages

---

## 8. MongoDB Database, Cluster, Connection Variable, Collections, and Schema Details

### Connection
- Environment variable: `MONGO_URL`
- DB name variable: `DB_NAME`
- Current DB name in workspace env: `raccoon_app`
- Atlas host visible from workspace env: `cluster0.99avx9n.mongodb.net`
- Local fallback exists in code: `mongodb://localhost:27017`

### Confirmed collections
- `users`
- `guests`
- `sessions`
- `messages`
- `reports`
- `subscriptions`
- `admin_logs`
- `blocked_users`
- `matches`
- `feud_sessions` (game storage)

### Core schema summary

#### users
Key fields:
- `user_id`
- `email`
- `username`
- `password_hash`
- `login_method`
- `firebase_uid`
- `auth_provider`
- `photo_url`
- `gender`
- `country`, `country_code`, `country_flag`
- `age_verified`
- `premium_status`, `premium_tier`, `premium_expires_at`
- `stripe_customer_id`, `stripe_subscription_id`
- `is_admin`, `is_moderator`
- usage stats (`total_sessions`, `total_time_spent`, `games_played`, `games_won`, etc.)
- legal acceptance fields
- timestamps

#### guests
- `guest_id`
- `username`
- `gender`
- `country`, `country_code`, `country_flag`
- `age_verified`
- `session_expires_at`
- `is_active`
- `is_banned`
- stats fields
- timestamps

#### sessions
Observed fields in runtime/session handling:
- `session_id`
- `user1_id`, `user2_id`
- `user1_username`, `user2_username`
- `user1_is_guest`, `user2_is_guest`
- `user1_country`, `user2_country`
- `start_time`
- `end_time`
- `status`
- `duration_seconds`
- `message_count`
- `end_reason`

#### messages
- `message_id`
- `session_id`
- `sender_id`
- `sender_username`
- `receiver_id`
- `content`
- `timestamp`
- `moderated`
- `status`

#### reports
- `report_id`
- reporter/reported IDs and usernames
- `reason`
- `details`
- `session_id`
- `status`, `priority`
- moderation notes/action
- timestamps

#### subscriptions
- `subscription_id`
- `user_id`
- `plan_type`
- `plan_id`
- `status`
- `start_date`
- `expiry_date`
- `provider`
- `provider_subscription_id`
- `provider_customer_id`
- `amount_paid`
- `currency`
- `auto_renew`

#### admin_logs
- `log_id`
- `action_type`
- `admin_id`
- `admin_username`
- `target_id`
- `target_type`
- `details`
- `created_at`

#### blocked_users
- `blocker_id`
- `blocked_id`
- `created_at`
- `reason`

#### matches
- `session_id`
- `user1_id`
- `user2_id`
- `created_at`
- `ended_at`
- `duration_seconds`

### Indexes
Important indexes are created in `backend/services/db_service.py`, including:
- unique: `user_id`, `guest_id`, `session_id`, `report_id`, `match_id`
- unique sparse: `email`, `username`
- message compound: `(session_id, timestamp)`
- blocked pair: `(blocker_id, blocked_id)`

---

## 9. Firebase Project ID, Web App Details, Authentication Providers, and Required Configuration

### Firebase web project details found in frontend env
- Project ID: `raccoon-app-28508`
- Auth domain: `raccoon-app-28508.firebaseapp.com`
- Storage bucket: `raccoon-app-28508.firebasestorage.app`
- Messaging sender ID: `468381925496`
- App ID: `1:468381925496:web:d1bc7e628edfef0780ad8d`
- Measurement ID present: `G-10KKXXFC0Q`

### Active Firebase usage
- Firebase app initialization in `frontend/src/services/firebase.service.js`
- Auth flow uses:
  - `GoogleAuthProvider`
  - `signInWithPopup()`
  - `browserLocalPersistence`
- No Firebase redirect flow is active
- No Firebase Messaging implementation found
- No Firebase Storage usage found in app logic

### Authentication providers
- Active:
  - Google Sign-In through Firebase popup
- Present only as placeholders / structure:
  - Apple Sign-In
  - Phone OTP login

---

## 10. Google OAuth Configuration and Redirect URLs

### Current active flow
- Frontend uses Firebase popup login (`signInWithPopup`)
- Backend endpoint: `POST /api/auth/google`

### Important audit note
- Current backend Google auth route accepts Firebase UID/email/idToken payload
- I do **not** see strong server-side cryptographic verification of the Firebase `idToken`
- This should be fixed during migration

### Redirect URLs
- No dedicated redirect callback route is used by the active frontend flow
- Because popup auth is used, Firebase authorized domains/origins matter more than redirect URIs

### Domains/origins you should verify in Firebase Auth
- `localhost`
- `raccoon-app-28508.firebaseapp.com`
- `premium-social-31.preview.emergentagent.com`
- `realtime-raccoon.emergent.host`
- `raccoon.co.com` (if using Google auth on custom domain)

### Placeholder backend OAuth route
`backend/routes/auth_multiple.py` mentions a future `GOOGLE_CLIENT_ID`, but that is **not** the active Google auth flow.

---

## 11. Google Analytics Configuration and Measurement ID

### Found
- `REACT_APP_FIREBASE_MEASUREMENT_ID`
- Current value in frontend env: `G-10KKXXFC0Q`

### Actual implementation status
- I did **not** find active Google Analytics/Firebase Analytics initialization (`getAnalytics`, `gtag`, etc.)
- So the measurement ID exists, but analytics does not appear to be fully wired

### What is active instead
- PostHog is embedded directly in `frontend/public/index.html`

---

## 12. Email Service Configuration

### Backend email sending
- No SMTP / SendGrid / Resend / SES / transactional mail integration found
- `email-validator` is installed only for validating email format

### Frontend email references (static content only)
- `billing@raccoonapp.com`
- `support@raccoonapp.com`
- `privacy@raccoonapp.com`

### Conclusion
- No active email service integration exists in code

---

## 13. STUN/TURN and WebRTC Configuration

Defined in `frontend/src/config/webrtcConfig.js`.

### STUN servers declared
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`
- `stun:stun3.l.google.com:19302`
- `stun:stun4.l.google.com:19302`
- `stun:stun.services.mozilla.com`
- `stun:stun.stunprotocol.org:3478`

### Active ICE config
- current code uses first 3 STUN servers in `ICE_SERVERS`
- `iceCandidatePoolSize: 5`
- `iceTransportPolicy: 'all'`

### TURN
- No active TURN server configured
- TURN block is placeholder only
- Production relay remains unfinished

### Media defaults
- ideal video: `640x480`
- max video: `1280x720`
- ideal frame rate: `24`
- camera facing mode: `user`
- audio:
  - echo cancellation
  - noise suppression
  - auto gain
  - mono channel

### Timeouts
- connection timeout: `15000 ms`
- ICE gathering timeout: `5000 ms`

---

## 14. WebSocket Configuration

### Client
File: `frontend/src/contexts/SocketContext.js`

- Base URL: `process.env.REACT_APP_BACKEND_URL`
- Path: `/api/socket.io`
- Transports: `['websocket', 'polling']`
- Reconnect enabled
- Reconnect attempts: `10`
- Reconnect delay: `500ms` to `2000ms`
- Timeout: `10000ms`
- Auth via `authenticate` socket event with JWT
- After `authenticated`, client emits `rejoin_session`

### Server
File: `backend/server.py`

- Socket.IO ASGI app mounted at:
  - `socketio_path='/api/socket.io'`
- Backend internal port: `8001`
- `ping_timeout=20`
- `ping_interval=10`
- `cors_allowed_origins='*'`

### Core socket events
- `authenticate`
- `join_queue`
- `leave_queue`
- `skip_match`
- `match_found`
- `session_ended`
- `rejoin_session`
- room/game events
- WebRTC signaling:
  - `webrtc_offer`
  - `webrtc_answer`
  - `webrtc_ice_candidate`
  - `webrtc_end_call`

---

## 15. Push Notification Configuration

### Status
- No web push implementation found
- No mobile push implementation found
- No Firebase Messaging usage found

### Partial config only
- Firebase `messagingSenderId` exists in frontend env
- But there is no actual push logic wired

---

## 16. All API URLs, Callback URLs, and Ports

### Base API pattern
Frontend uses:

```text
${REACT_APP_BACKEND_URL}/api/...
```

### Backend route base
- `/api`

### Key API groups
- `/api/auth/*`
- `/api/admin/*`
- `/api/reports/*`
- `/api/payments/*`
- `/api/stats/*`
- `/api/health`
- Socket.IO path: `/api/socket.io`

### Callback / redirect URLs found

#### Premium / Stripe frontend callbacks
- success URL: `${window.location.origin}/premium?success=true`
- cancel URL: `${window.location.origin}/premium?cancelled=true`

#### Stripe webhook
- `/api/payments/webhook/stripe`

#### Premium success page route
- `/premium/success?session_id=...`

### Bug note
- `PremiumSuccess.js` polls `/api/payments/status/{sessionId}`
- I do **not** see that backend route implemented

### Google auth
- Popup-based; no dedicated redirect callback route used in active flow
- Backend endpoint: `/api/auth/google`

### Ports
- frontend dev: `3000`
- backend app: `8001`
- local Mongo fallback: `27017`
- public via Nginx: `80`, `443`

---

## 17. Current Preview and Production Deployment URLs

### Preview
From current frontend env:
- `https://premium-social-31.preview.emergentagent.com`

### Production
From current environment context:
- `https://realtime-raccoon.emergent.host`

### Custom domain
User-reported domain:
- `raccoon.co.com`

### Verification status
- Preview URL: confirmed from workspace env
- Production URL: provided in current environment context
- Custom domain state: **manual verification required**

---

## 18. Current Custom-Domain and DNS Configuration

### What is confirmed from code/workspace
- No DNS records are stored in application code
- No repo Nginx config is specific to `raccoon.co.com`
- App is domain-agnostic except for:
  - frontend base URL env
  - Firebase authorized domains/origins
  - Stripe callback URLs
  - CORS settings

### Manual verification required
- whether `raccoon.co.com` currently points to Emergent or another host
- whether old A/AAAA records remain
- whether SSL is active on the custom domain
- whether broken DNS records still exist

### Migration recommendation
Before DNS cutover, document:
- current A/AAAA/CNAME/TXT records
- current SSL method
- current registrar / DNS host
- current Firebase authorized domains

---

## 19. File Storage Configuration

### Found
- Firebase storage bucket is configured in frontend env
- boto3 / S3 packages are installed in backend

### Not found
- No active upload flow in frontend
- No upload endpoints in backend
- No active S3 object storage integration
- No Firebase Storage usage in app logic

### Practical conclusion
- There is **no active file storage subsystem** in current app behavior
- Storage bucket config exists but is not actively used by core product flow

---

## 20. Background Workers, Scheduled Jobs, or Cron Jobs

### Active workers
- None found (no Celery, RQ, Dramatiq, etc.)

### In-request async work
- Stripe webhook uses FastAPI `BackgroundTasks`

### Periodic logic exists but is not scheduled
Methods exist for:
- subscription expiration processing
- premium expiration processing
- ban cleanup logic

But I did **not** find an actual scheduler/cron wiring.

### Frontend timers / heartbeats
- user heartbeat every 30s on Profile
- matching/game intervals
- branding-removal interval in `frontend/src/App.js`

### Recommendation
If you keep subscription lifecycle logic, add a cron or scheduled job on the VPS.

---

## 21. Any Secrets or Environment Settings Stored Inside Emergent

### Confirmed in workspace files

#### `frontend/.env`
Contains public frontend runtime config:
- backend URL
- Firebase web config
- health-check/dev toggles

#### `backend/.env`
Contains sensitive backend config:
- MongoDB connection string
- JWT secret
- Stripe-related config
- Emergent key

### Platform-level possibility
Preview and production may also have separate Emergent deployment env vars beyond what is visible in workspace.

### What you should export before leaving Emergent
- all frontend `.env` values
- all backend `.env` values
- all Deploy-screen env vars for preview and production
- domain config
- Firebase domains
- Stripe webhooks
- MongoDB users/passwords

---

## 22. Any Generated Files That Are Not Included in GitHub

### Definitely not meant for Git
From `.gitignore`:
- `.env`
- `.env.*`
- `node_modules/`
- `build/`
- `frontend/build/`
- logs
- coverage artifacts
- virtualenv folders

### Current tracked/generated-ish files present in workspace
Tracked in git here:
- `memory/PRD.md`
- `memory/test_credentials.md`
- `test_reports/*`
- `.emergent/emergent.yml`
- `design_guidelines.json`

### Likely not in GitHub even if source is up to date
- actual `.env` files
- deploy-screen env settings
- built frontend output
- local MongoDB data
- supervisor/systemd/Nginx host config
- live preview/production deployment state

---

## 23. Differences Between Emergent Workspace, GitHub Repository, Preview Deployment, and Production Deployment

### Workspace
- current editable source
- can contain changes live in preview via hot reload
- includes local `.env` files in this workspace
- includes Emergent metadata and test artifacts

### GitHub repository
- **cannot be verified from this workspace**
- `git remote -v` is empty here
- cannot confirm push status or parity with workspace

### Preview deployment
- tied to current preview workspace flow
- current preview backend URL in frontend env:
  - `https://premium-social-31.preview.emergentagent.com`

### Production deployment
- live deployment
- may use different env vars
- may lag preview
- may have custom domain and SSL attached

### High-risk differences to expect
- preview/prod env vars differ
- custom domain and SSL only exist in production
- GitHub will not include secrets
- preview can be ahead of GitHub if code was not pushed/exported

---

## 24. Full Ubuntu VPS Deployment Guide Using Nginx and SSL

### Recommended layout
```bash
/var/www/raccoon/
  frontend/
  backend/
  venv/
```

### A. Server prep
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential python3.11 python3.11-venv python3-pip certbot python3-certbot-nginx
```

Install Node 20:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
```

Optional local MongoDB if not using Atlas:
```bash
sudo apt install -y mongodb
```

### B. Copy source
```bash
sudo mkdir -p /var/www/raccoon
sudo chown -R $USER:$USER /var/www/raccoon
cd /var/www/raccoon
# copy your exported source here
```

### C. Frontend build
```bash
cd /var/www/raccoon/frontend
yarn install
yarn build
```

### D. Backend setup
```bash
cd /var/www/raccoon
python3.11 -m venv venv
source venv/bin/activate
cd backend
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### E. Backend env file
Create `/var/www/raccoon/backend/.env`:

```env
MONGO_URL=REDACTED_RECREATE_THIS
DB_NAME=raccoon_app
CORS_ORIGINS=https://raccoon.co.com,https://www.raccoon.co.com
JWT_SECRET_KEY=GENERATE_A_NEW_SECRET
STRIPE_SECRET_KEY=REDACTED_IF_USED
STRIPE_WEBHOOK_SECRET=REDACTED_IF_USED
```

### F. Frontend env file
Create `/var/www/raccoon/frontend/.env.production`:

```env
REACT_APP_BACKEND_URL=https://raccoon.co.com
REACT_APP_FIREBASE_API_KEY=PUBLIC_FIREBASE_VALUE
REACT_APP_FIREBASE_AUTH_DOMAIN=raccoon-app-28508.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=raccoon-app-28508
REACT_APP_FIREBASE_STORAGE_BUCKET=raccoon-app-28508.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=468381925496
REACT_APP_FIREBASE_APP_ID=1:468381925496:web:d1bc7e628edfef0780ad8d
REACT_APP_FIREBASE_MEASUREMENT_ID=G-10KKXXFC0Q
```

### G. systemd service
Create `/etc/systemd/system/raccoon-backend.service`:

```ini
[Unit]
Description=Raccoon FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/raccoon/backend
Environment="PATH=/var/www/raccoon/venv/bin"
ExecStart=/var/www/raccoon/venv/bin/gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8001 --timeout 60
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable raccoon-backend
sudo systemctl start raccoon-backend
sudo systemctl status raccoon-backend
```

### H. Nginx
Create `/etc/nginx/sites-available/raccoon`:

```nginx
server {
    listen 80;
    server_name raccoon.co.com www.raccoon.co.com;

    root /var/www/raccoon/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:8001/api/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/raccoon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### I. SSL
After DNS points to the VPS:

```bash
sudo certbot --nginx -d raccoon.co.com -d www.raccoon.co.com
```

### J. Final validation checklist
- frontend loads over HTTPS
- `/api/health` returns healthy
- `/api/socket.io/` connects
- MongoDB reachable
- Firebase auth works on the new domain
- Stripe webhooks updated if Stripe is kept
- `CORS_ORIGINS` locked down from `*`
- a real TURN server added if production WebRTC reliability matters

---

## 25. All Known Bugs, Unfinished Features, and Broken Integrations

### Confirmed unfinished / broken
1. Stripe checkout not implemented
   - `/api/payments/create-checkout-session` returns 503
2. `STRIPE_API_KEY` vs `STRIPE_SECRET_KEY` mismatch
3. `PremiumSuccess.js` polls `/api/payments/status/{sessionId}` but backend route is missing
4. TURN relay not configured
5. Alternate auth routes in `auth_multiple.py` are placeholders (Apple / Phone OTP / extra Google route)
6. Active `/api/auth/google` flow appears not to strongly verify Firebase ID token server-side
7. Google auth response consistency risk: `is_premium` may not always be explicitly set in all social-auth responses
8. Duplicate `/api/auth/google` definitions across route files create maintenance risk
9. Google Analytics measurement ID exists, but analytics runtime is not clearly wired
10. PostHog is hardcoded in `frontend/public/index.html`
11. Emergent script + visual-edit dependency remain in source
12. `backend/services/auth_service.py` contains insecure fallback JWT secret if env missing
13. Mongo local fallback is hardcoded; decide whether to keep it in production

### Product/backlog items carried in docs / handoff history
- Production TURN server setup
- Full live Stripe integration
- Twilio SMS OTP
- Large websocket handler refactor

---

## 26. Every External Account or Dashboard You Must Retain Ownership Of

- MongoDB Atlas project/account
- Firebase project `raccoon-app-28508`
- Stripe account
- Domain registrar / DNS provider for `raccoon.co.com`
- PostHog project/account
- Any mailboxes/domains used for:
  - `billing@raccoonapp.com`
  - `support@raccoonapp.com`
  - `privacy@raccoonapp.com`
- Any future Google Cloud / Apple Developer / Twilio accounts if you enable those unfinished flows
- Emergent account until migration validation is complete

---

## 27. Confirmation Whether GitHub Contains the Latest Complete Source Code

**Cannot be confirmed from this workspace.**

Why:
- `git remote -v` is empty in this environment
- no direct access to your GitHub remote state
- `.env` files are not expected to be in GitHub anyway

Practical conclusion:
- GitHub alone is not a complete backup unless you also export env vars and deployment/provider settings

---

## 28. Latest Commit or Version Matching the Current Emergent Preview

Latest visible local git commit in this workspace:
- Full SHA: `6c0197b019862efe60757380e419d6b31089f480`
- Short SHA: `6c0197b`
- Timestamp: `2026-04-02 21:31:32 +0000`
- Message: `auto-commit for 342d8d47-c624-48f1-8609-5efd42b4788a`

### Important caveat
- Preview may reflect hot-reload workspace state newer than the last visible git commit
- For migration, export/download the **current workspace source** now, not just a commit hash

---

## 29. Anything Else Required to Run the Project Independently from Emergent

### Must-do actions
- export both frontend and backend env vars
- rotate all sensitive secrets
- point DNS to your VPS
- set up Nginx + SSL
- authorize new domain(s) in Firebase Auth
- update Stripe webhooks if you keep Stripe
- choose Atlas vs local MongoDB intentionally
- set proper `CORS_ORIGINS`
- generate a new `JWT_SECRET_KEY`

### Strongly recommended cleanup after migration
- remove `https://assets.emergent.sh/scripts/emergent-main.js`
- remove `@emergentbase/visual-edits` if not needed
- review the branding-removal logic in `frontend/src/App.js`
- keep or replace PostHog intentionally
- add a real TURN server
- fix `/api/auth/google` token verification
- fix `PremiumSuccess.js` missing backend status route
- add a scheduled job for subscription expiration if premium is kept
- add `gunicorn` to backend dependency management

### Files you should archive now
- `frontend/.env`
- `backend/.env`
- `frontend/public/index.html`
- `frontend/src/config/firebase.config.js`
- `frontend/src/services/firebase.service.js`
- `backend/server.py`
- `backend/services/db_service.py`
- `backend/routes/auth.py`
- `backend/routes/payments.py`
- `DEPLOYMENT.md`

---

## Appendix A - Emergent Platform Migration Notes

### Verification from coding workspace

**Can verify:**
- code files and structure
- dependencies
- API endpoints and routes
- sanitized config names

**Cannot verify directly:**
- GitHub sync status
- preview deployment health beyond code expectations
- production deployment state
- SSL certificate validity
- DNS propagation state

### Secrets & environment variables

**Emergent storage locations:**
- Deploy settings -> Environment Variables
- workspace `.env` files
- production secrets may differ from preview

**Migration actions:**
1. export all env vars from deployment settings
2. rotate all secrets after migration
3. never commit secrets to GitHub
4. use VPS secret management (env files, systemd env, secret vault)

### Environment differences

| Environment | Typical role |
|---|---|
| Workspace | current editable code |
| GitHub | last pushed repository state |
| Preview | test deployment, may use test/staging env vars |
| Production | live deployment, prod env vars, domain, SSL |

### Emergent-generated files
- `.emergent/`
- visual-edit dependencies
- potential platform-specific scripts

### Custom domain & SSL migration
1. test VPS deployment before DNS switch
2. issue new Let's Encrypt certificate on VPS
3. repoint DNS to VPS IP
4. verify propagation

### Pre-migration checklist
- save code
- save env vars
- save Mongo/Firebase/Stripe settings
- save DNS records
- save custom-domain notes
- test on temporary VPS domain before switching real DNS
