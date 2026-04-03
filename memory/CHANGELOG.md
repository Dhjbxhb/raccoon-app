# RACCOON APP - CHANGELOG

## 2026-04-03 — Draw role-based chat visibility fix
- Removed the Draw chat panel entirely for the drawer role so nothing can overlap or block the canvas.
- Kept the chat panel visible for guessers only, with preserved mobile usability.
- Verified by testing agent report `iteration_20.json`.

## 2026-04-03 — Global game background system
- Added a single shared `GameBackground` component for all in-game screens, mounted once from `Match.js` only while a game is active.
- Replaced per-game cosmic backgrounds in Draw, UNO, and Feud with one unified cinematic deep-space layer.
- Implemented low-CPU CSS gradients, three slow-moving glow layers, and eight subtle particles using GPU-friendly transforms.
- Added mobile-specific reductions for glow size/blur to protect smoothness and camera performance.
- Verified by testing agent report `iteration_19.json` with no frontend or backend regressions.

## 2026-04-03 — Final UI + gameplay polish pass
- Added a private-room to live-match bridge so room start actions now launch real sessions instead of dead room states.
- Room-triggered game launches can now carry auto-start instructions into Match.
- Draw game polish: drawer input hidden, tools enlarged, smoother brush slider, centered desktop canvas, smaller desktop camera strip.
- UNO polish: centered/mobile-like desktop layout, opponent cards moved under opponent camera, animated turn arrow, large UNO flash on call.
- Feud polish: camera/name/score stack cleaned up with wider and slightly shorter desktop camera areas.
- Premium pricing CTA buttons are now clickable even when Stripe is unavailable, while the existing auth/payment guard still blocks unsafe activation.
- Verified by self-tests plus testing agent report `iteration_18.json`.

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
