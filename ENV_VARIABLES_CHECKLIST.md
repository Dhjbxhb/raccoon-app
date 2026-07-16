# RACCOON APP - Environment Variables Checklist

This file is safe to keep in source control because it contains **names and placeholders only**.

---

## Frontend `.env.production`

```env
REACT_APP_BACKEND_URL=https://raccoon.co.com

REACT_APP_FIREBASE_API_KEY=PUBLIC_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=raccoon-app-28508.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=raccoon-app-28508
REACT_APP_FIREBASE_STORAGE_BUCKET=raccoon-app-28508.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=468381925496
REACT_APP_FIREBASE_APP_ID=1:468381925496:web:d1bc7e628edfef0780ad8d
REACT_APP_FIREBASE_MEASUREMENT_ID=G-10KKXXFC0Q
```

### Optional frontend-only dev values
```env
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## Backend `.env`

```env
MONGO_URL=RECREATE_AND_ROTATE_THIS
DB_NAME=raccoon_app
CORS_ORIGINS=https://raccoon.co.com,https://www.raccoon.co.com
JWT_SECRET_KEY=GENERATE_A_NEW_SECRET

STRIPE_SECRET_KEY=ADD_IF_USING_STRIPE
STRIPE_WEBHOOK_SECRET=ADD_IF_USING_STRIPE

# Legacy / optional / platform-specific
EMERGENT_LLM_KEY=REMOVE_IF_NOT_NEEDED
```

---

## Variables Currently Mentioned in Placeholder / Unfinished Features

Only needed if you activate these features:

```env
GOOGLE_CLIENT_ID=

APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Public vs Secret

### Public
- all `REACT_APP_*`
- `DB_NAME`
- `CORS_ORIGINS`

### Secret
- `MONGO_URL`
- `JWT_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMERGENT_LLM_KEY`
- future Apple/Twilio/provider secrets

---

## Rotation Checklist

- [ ] Rotate MongoDB DB user password
- [ ] Rotate JWT secret
- [ ] Rotate Stripe API keys and webhook secret
- [ ] Review Firebase authorized domains
- [ ] Remove any Emergent-only keys not needed on VPS
