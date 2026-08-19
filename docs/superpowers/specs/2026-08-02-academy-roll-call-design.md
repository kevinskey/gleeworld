# Academy Roll Call — rotating-challenge self check-in

**Date:** 2026-08-02
**Status:** Approved by Kevin (design conversation, this date)

## Problem

Academy attendance today requires either a projected QR code, a typed PIN, or manual
marking. Kevin wants the one-tap "I Am Here" experience from Tour Manager roll call
available for academy classes — but a bare tap can be done from a dorm room. GPS
geofencing was considered and rejected (permission friction, indoor inaccuracy,
Capacitor plugin surface). Face recognition was considered and rejected (avatar
quality, demographic bias, biometric-law exposure with minor students).

**Chosen mechanism:** a rotating on-screen challenge. Proof of presence comes from
seeing the classroom screen, not from typing or scanning anything.

## User experience

**Instructor** (Attendance Console, existing):
1. Creates a session with new mode **Roll Call** (alongside QR / Manual / Hybrid).
2. Opens the session → a display view shows one large symbol from a fixed grid of 8
   visually distinct color+shape emoji. The correct symbol rotates every 30 seconds
   with a visible countdown ring. Projected or shown on the instructor's device.
3. The existing live roster board fills in as students tap. Students who logged
   wrong taps before succeeding show an **amber flag** with attempt count.
   Manual marking stays available on the same board (fallback for dead phones).

**Student** (course page, mobile + desktop):
1. When a roll_call session is open for an enrolled course, an "I Am Here" card
   appears (same pattern as the tour banner in `StudentTourView` /
   `MobileCourseLanding`).
2. Card shows the 8-symbol grid: "Tap the symbol on the classroom screen."
3. Correct tap → green "Present · h:mm a" state (or "Late" per session threshold).
   Wrong tap → gentle "That's not it — look at the screen and try again."
   After 10 wrong taps in one session, self check-in locks for that student
   ("See your instructor to be marked present").

## Architecture

### Security model — the server is the only authority

- New table `gw_attendance_session_secrets` (`session_id` PK/FK,
  `challenge_seed uuid`, `tenant_id` default + trigger): RLS grants SELECT only to
  the course's instructors/TAs and admins. **No student-readable path to the seed.**
- Correct symbol for a slot = `hash(seed || floor(epoch/30s)) mod 8`, computed
  **in Postgres**. Student clients never compute anything.
- Student tap calls SECURITY DEFINER RPC `roll_call_check_in(p_session_id,
  p_symbol_index)`:
  - Validates: session exists, mode = roll_call, status = open, now() within
    opens_at..closes_at, caller enrolled in the course.
  - Accepts current slot **or the immediately previous slot** (clock skew /
    slow taps never falsely reject).
  - On match: upsert attendance record (`status` = present, or late if past
    `opens_at + late_threshold_minutes`; `check_in_method` = 'self'). Re-tap when
    already recorded returns success (idempotent; unique constraint already exists).
  - On mismatch: insert an attempt row, return remaining-attempts info. ≥10 wrong
    attempts → locked response.
- New table `gw_attendance_challenge_attempts` (`session_id`, `user_id`,
  `symbol_index`, `was_correct`, `created_at`, `tenant_id` default + trigger):
  written only by the RPC; readable by instructors/TAs/admins and by the student
  (own rows only, so the client can show attempts-remaining after reload).
- Instructor display RPC `get_roll_call_seed(p_session_id)` (or direct SELECT via
  RLS) returns the seed **only** to instructors/TAs/admins; display then rotates
  locally — a network blip never freezes the projected symbol.
- Blind-guess math: 1/8 per rotation, all misses recorded and flagged, hard cap 10.
  Deterrence is visibility: a student in the room essentially never misses twice.

### Schema changes (one migration, deploys BEFORE frontend)

1. `gw_attendance_sessions.mode` CHECK → add `'roll_call'`.
2. `gw_attendance_records.check_in_method` CHECK → add `'self'`.
3. Create `gw_attendance_session_secrets` + RLS + tenant default/trigger.
4. Create `gw_attendance_challenge_attempts` + RLS + tenant default/trigger + index
   on (session_id, user_id).
5. RPC `roll_call_check_in` (SECURITY DEFINER, search_path pinned).
6. AFTER INSERT trigger on gw_attendance_sessions (WHEN mode='roll_call') seeds the
   secret row — no frontend code path can forget it.
7. Realtime: add new tables to `supabase_realtime` publication as needed
   (attendance_records likely already present; verify).

### Frontend

- **Shared:** `src/components/academy/attendance/rollCallChallenge.ts` — pure
  helpers: the canonical 8-symbol list (single source for both UIs), slot math
  mirror for the instructor display, types. Unit-tested.
- **Instructor:**
  - `AttendanceConsole`: add "Roll Call" to the mode select; hide QR-specific UI
    for roll_call sessions; show "Show Challenge Screen" button when open.
  - New `RollCallChallengeDisplay`: fullscreen-friendly rotating symbol + countdown
    ring; fetches seed once, rotates locally; re-syncs on visibility change.
  - `AttendanceLiveRoster`: amber flag + attempt count per student (from attempts
    table), realtime + **10s polling fallback**.
- **Student:**
  - New `RollCallCheckInCard`: symbol grid, present/late/locked/closed states,
    optimistic-but-server-confirmed. Rendered on the course landing surfaces
    (`MobileCourseLanding` + the desktop course page) when an open roll_call
    session exists for an enrolled course. Realtime + 10s polling fallback for
    session discovery.

### Reliability requirements (non-negotiable)

- All validation server-side; no client clocks trusted.
- Realtime subscriptions always paired with polling fallback.
- Instructor display functions offline after initial seed fetch.
- Idempotent check-in; graceful duplicate handling.
- Manual marking remains available for every roll_call session (dead-phone path).
- Tenant model: new tables follow DEFAULT current_tenant_id() + BEFORE INSERT
  trigger convention.
- Migration must be applied to production BEFORE the frontend deploy.

## Testing

- Vitest unit tests: slot math + symbol derivation mirror (fixed seed → known
  sequence), attempt-lockout state logic, card state machine reducers.
- RPC behavior verified against a checklist executed via SQL (wrong symbol,
  previous-slot acceptance, expired session, closed session, not-enrolled caller,
  double check-in, late threshold, 10-attempt lock).
- `npm run typecheck:guard` + full `npm run test` before deploy.

## Out of scope (later phases)

- Photo-as-audit-artifact attached to sessions.
- Seating-chart attendance integration.
- Retrofitting Tour Manager roll call with the challenge mechanism.
- Grading hooks beyond what sessions already support.
