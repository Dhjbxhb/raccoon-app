# RACCOON APP - CHANGELOG

## 2026-04-02 — Final stabilization pass
- Added persistent `currentSessionId` tracking for users and guests in auth records and `/api/auth/me`.
- Synced `currentSessionId` lifecycle with live match creation, stale-session cleanup, skip, disconnect, and blocked-session teardown.
- Hardened frontend rematch behavior so `session_ended` can immediately trigger safe auto-rejoin without duplicate queue spam.
- Locked private-room group matching to exactly 2 players and kept room UI aligned to `X/2` display.
- Updated local camera placeholder copy to `Connecting...` to avoid black-screen style UX during recovery.
- Verified with live socket script, preview smoke test, pytest suite, and testing agent report `iteration_17.json`.

## 2026-04-02 — Previously completed TPM-critical fixes
- Enforced strict backend premium security and removed premium bypass behavior.
- Fixed room capacity to 2 players and aligned UI display to `0/2`, `1/2`, `2/2`.
- Fixed synced skip/session teardown for both users.
- Enforced fresh WebRTC peer connection and media stream creation on every new match.
- Cleared stale session state before rematching to prevent `already in session` failures.
- Fixed async private-room socket sync with awaited room membership updates.
