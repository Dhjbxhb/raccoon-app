# RACCOON APP - CHANGELOG

## 2026-04-03 — Draw reference-style restyle
- Restyled `DrawGame.jsx` to match the user-provided desktop and phone screenshots more closely: header, player cards, side panels, canvas card, tools, chat, and bottom actions.
- Preserved the working draw/guess socket flow while updating the UI structure and visual treatment.
- Verified by testing agent report `iteration_29.json`.

## 2026-04-03 — Feud reference-style restyle
- Restyled `FeudGame.jsx` to match the user-provided desktop and phone screenshots more closely: player cards, name pills, score chips, round row, question card, answer board, input row, and leave button.
- Cleaned the related Feud timer-effect dependency warning after review.
- Verified by testing agent report `iteration_28.json`.

## 2026-04-03 — Premium CTA click + room repeatability fix
- Added an explicit click handler to the dashboard `upgrade-now` premium CTA so it reliably redirects to `/premium` every time.
- Re-verified private room create/leave/re-enter/start flow repeatability without stuck state.
- Verified by testing agent report `iteration_27.json`.

## 2026-04-03 — Shared end-game session exit
- Added a shared game-mode `End Game` button that ends the full match session for both users, not just the local overlay.
- Backend now closes active UNO/Feud/Draw state, clears `currentSessionId` for both users, emits `session_ended` to both sides, and updates the session record.
- Frontend now performs WebRTC cleanup and redirects both users back to `/dashboard` when the shared end-game event lands.
- Verified by testing agent report `iteration_26.json`.

## 2026-04-03 — Draw/Feud overlap separation fix
- Shortened the Draw top camera strip and added a clear divider so the canvas stays visually separate.
- Reduced Feud camera heights again and added a clear divider above the answers area.
- Verified by testing agent report `iteration_25.json`.

## 2026-04-03 — Cross-game camera/info layout fix
- Standardized Draw, Feud, and UNO to keep cameras in the top section and game UI below.
- Aligned username/info blocks under the correct camera across all three games.
- Rebalanced desktop cameras to be slightly shorter and wider, while mobile stacks camera sections vertically.
- Verified by testing agent report `iteration_24.json`.

## 2026-04-03 — Duplicate camera visibility fix
- Hid the base Match camera layer during game mode and cleared its video `srcObject` values while games are active.
- Reattached streams automatically after game exit or skip so the standard match cameras restore cleanly.
- Verified by testing agent report `iteration_23.json`.

## 2026-04-03 — UNO black-screen guard fix
- Blocked UNO from opening unless valid session/player game state exists.
- Cleared stale UNO state on close so exit -> re-open starts fresh.
- Reset local UNO component state whenever initial game data is absent.
- Verified by testing agent report `iteration_22.json`.

## 2026-04-03 — Draw mobile toolbar usability fix
- Enlarged Draw mobile tool controls for pen/eraser, colors, brush slider, undo, and clear.
- Increased spacing in the mobile tools panel to reduce accidental taps.
- Moved drawer tools before the canvas in mobile flow so they stay visible without covering the drawing area.
- Verified by testing agent report `iteration_21.json`.

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
