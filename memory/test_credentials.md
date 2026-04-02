# RACCOON APP Test Credentials

## Seeded Premium/Admin Account
- Email: `admin@raccoon.app`
- Password: `Admin123!`
- Notes: premium-enabled backend account; can create private rooms and access premium-only flows.

## Guest Testing
- No fixed credentials required.
- Create guest users from the UI via the guest flow.

## Testing Notes
- Premium purchase activation without payment is intentionally blocked.
- `/api/admin/dev/set-premium` is intentionally disabled and should return `403`.