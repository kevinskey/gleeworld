# Academy Roll Call (Rotating Challenge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `roll_call` attendance mode to Academy classes: students tap the symbol currently rotating on the classroom screen to be marked present, with all validation server-side.

**Architecture:** One migration adds two tables (per-session secret seed, challenge attempts), four SECURITY DEFINER RPCs, and a seeding trigger. The instructor display fetches a precomputed rotation *schedule* once and rotates locally (no client crypto, survives network blips). Students tap one of 8 fixed symbols; the server alone decides correctness (current or previous 30s slot). Wrong taps are recorded and surface as amber flags on the live roster; 10 wrong taps locks self check-in for that student.

**Tech Stack:** Postgres (self-hosted Supabase) migration SQL, plpgsql RPCs, React 18 + TanStack Query + supabase-js, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-02-academy-roll-call-design.md`

## Global Constraints

- New tables MUST have `tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()` + BEFORE INSERT trigger `public.set_tenant_id_default()` (function already exists — see `supabase/migrations/20260711120000_planner_module.sql:20-37`).
- The challenge seed must never be readable by students — no RLS path, no RPC path.
- All RPCs: `SECURITY DEFINER` + `SET search_path = public`; identify the caller via `auth.uid()` — never accept a user id parameter.
- Every realtime subscription MUST be paired with a polling fallback (`refetchInterval: 10000` or `setInterval` 10s).
- `gw_attendance_records.student_profile_id` stores **`gw_profiles.id`**, NOT `auth.uid()` — always map via `gw_profiles.user_id` (see `process_qr_attendance_scan` migration `20260210033346`).
- New RPCs are absent from generated types: call them as `supabase.rpc('name' as any, args)` (pattern: `src/hooks/useInvoices.ts:98`).
- Do not edit historical migrations; one new migration file only.
- Verification gate before PR: `npm run typecheck:guard` && `npm run test` && `npm run lint`.
- Deploy order (release time, not part of this plan's tasks): migration applied to prod (Kevin runs it) BEFORE `bash scripts/deploy-frontend.sh`.
- Work happens in the worktree `~/Documents/GitHub/gleeworld-rollcall`, branch `feature/academy-roll-call`.

---

### Task 1: Migration — tables, trigger, RPCs, realtime

**Files:**
- Create: `supabase/migrations/20260802120000_academy_roll_call.sql`
- Create: `supabase/migrations/tests/academy_roll_call_test.sql`

**Interfaces:**
- Produces (used by later tasks):
  - RPC `roll_call_check_in(p_session_id uuid, p_symbol_index int) → jsonb` — `{success, status?, marked_at?, already_recorded?, wrong_attempts?, locked?, error?, message}`
  - RPC `get_roll_call_schedule(p_session_id uuid) → jsonb` — `{first_slot, slots int[], interval_seconds, server_now, closes_at}` (instructor/TA/admin only)
  - RPC `get_my_roll_call_state(p_session_id uuid) → jsonb` — `{checked_in, status, marked_at, wrong_attempts, locked}`
  - RPC `get_roll_call_flags(p_session_id uuid) → jsonb` — array of `{user_id, student_profile_id, wrong_attempts, locked}` (instructor/TA/admin only)
  - `gw_attendance_sessions.mode` accepts `'roll_call'`; `gw_attendance_records.check_in_method` accepts `'self'`.

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- ACADEMY ROLL CALL — rotating-challenge self check-in
-- Spec: docs/superpowers/specs/2026-08-02-academy-roll-call-design.md
-- =============================================================================

-- 1. Widen mode / check_in_method constraints.
-- NOTE: live data contains check_in_method values beyond the original CHECK
-- (process_qr_attendance_scan inserts 'qr_scan'), so recreate the constraint
-- with the full observed set + 'self'. NOT VALID skips a scan of legacy rows.
ALTER TABLE public.gw_attendance_sessions DROP CONSTRAINT IF EXISTS gw_attendance_sessions_mode_check;
ALTER TABLE public.gw_attendance_sessions
  ADD CONSTRAINT gw_attendance_sessions_mode_check
  CHECK (mode IN ('qr', 'manual', 'hybrid', 'roll_call'));

ALTER TABLE public.gw_attendance_records DROP CONSTRAINT IF EXISTS gw_attendance_records_check_in_method_check;
ALTER TABLE public.gw_attendance_records
  ADD CONSTRAINT gw_attendance_records_check_in_method_check
  CHECK (check_in_method IN ('qr', 'manual', 'pin', 'auto', 'qr_scan', 'self')) NOT VALID;

-- 2. Per-session secret seed (NEVER student-readable)
CREATE TABLE public.gw_attendance_session_secrets (
  session_id UUID PRIMARY KEY REFERENCES public.gw_attendance_sessions(id) ON DELETE CASCADE,
  challenge_seed UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gw_attendance_session_secrets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_tenant_id_secrets BEFORE INSERT ON public.gw_attendance_session_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- Instructors/TAs of the course (and admins) may read; nobody writes directly.
CREATE POLICY "Instructors read roll call seeds"
ON public.gw_attendance_session_secrets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = gw_attendance_session_secrets.session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
      AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
      AND ar.is_active = true
  )
);

-- 3. Challenge attempts (written only by the check-in RPC)
CREATE TABLE public.gw_attendance_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.gw_attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  symbol_index INTEGER NOT NULL,
  was_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()
);
CREATE INDEX idx_challenge_attempts_session_user
  ON public.gw_attendance_challenge_attempts(session_id, user_id);
ALTER TABLE public.gw_attendance_challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_tenant_id_attempts BEFORE INSERT ON public.gw_attendance_challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE POLICY "Instructors and owner read challenge attempts"
ON public.gw_attendance_challenge_attempts FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = gw_attendance_challenge_attempts.session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
      AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
      AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
      AND ar.is_active = true
  )
);

-- 4. Seed trigger: every roll_call session gets a secret automatically.
CREATE OR REPLACE FUNCTION public.seed_roll_call_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mode = 'roll_call' THEN
    INSERT INTO gw_attendance_session_secrets (session_id)
    VALUES (NEW.id)
    ON CONFLICT (session_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER seed_roll_call_secret_trigger
  AFTER INSERT OR UPDATE OF mode ON public.gw_attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.seed_roll_call_secret();

-- 5. Shared symbol derivation. 8 symbols; slot = floor(epoch/30).
--    Correct index for a slot = first md5 byte of "seed:slot" mod 8.
CREATE OR REPLACE FUNCTION public.roll_call_symbol_for_slot(p_seed uuid, p_slot bigint)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT get_byte(decode(md5(p_seed::text || ':' || p_slot::text), 'hex'), 0) % 8;
$$;

-- 6. Student check-in RPC. Caller = auth.uid(); no user param.
CREATE OR REPLACE FUNCTION public.roll_call_check_in(p_session_id uuid, p_symbol_index integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_seed UUID;
  v_profile_id UUID;
  v_slot BIGINT;
  v_wrong_count INTEGER;
  v_status TEXT := 'present';
  v_existing RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Please sign in.');
  END IF;
  IF p_symbol_index IS NULL OR p_symbol_index < 0 OR p_symbol_index > 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAD_SYMBOL', 'message', 'Invalid symbol.');
  END IF;

  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL OR v_session.mode <> 'roll_call' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Roll call not found.');
  END IF;
  IF v_session.status <> 'open' OR v_now < v_session.opens_at OR v_now > v_session.closes_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_CLOSED', 'message', 'This roll call is not open.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = v_uid AND course_id = v_session.course_id AND enrollment_status = 'enrolled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ENROLLED', 'message', 'You are not enrolled in this course.');
  END IF;

  SELECT id INTO v_profile_id FROM gw_profiles WHERE user_id = v_uid;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Profile not found. See your instructor.');
  END IF;

  -- Already checked in? Idempotent success.
  SELECT * INTO v_existing FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_recorded', true,
      'status', v_existing.status, 'marked_at', v_existing.marked_at);
  END IF;

  -- Lockout BEFORE symbol validation (brute-force cap).
  SELECT count(*) INTO v_wrong_count FROM gw_attendance_challenge_attempts
  WHERE session_id = p_session_id AND user_id = v_uid AND was_correct = false;
  IF v_wrong_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCKED', 'locked', true,
      'message', 'Self check-in locked. See your instructor to be marked present.');
  END IF;

  SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  IF v_seed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_SEED', 'message', 'Session misconfigured. See your instructor.');
  END IF;

  v_slot := floor(extract(epoch FROM v_now) / 30)::bigint;
  IF p_symbol_index <> roll_call_symbol_for_slot(v_seed, v_slot)
     AND p_symbol_index <> roll_call_symbol_for_slot(v_seed, v_slot - 1) THEN
    INSERT INTO gw_attendance_challenge_attempts (session_id, user_id, symbol_index, was_correct)
    VALUES (p_session_id, v_uid, p_symbol_index, false);
    RETURN jsonb_build_object('success', false, 'error', 'WRONG_SYMBOL',
      'wrong_attempts', v_wrong_count + 1, 'locked', v_wrong_count + 1 >= 10,
      'message', 'That is not the symbol on the screen. Look up and try again.');
  END IF;

  -- Late handling per session settings.
  IF v_session.late_threshold_minutes IS NOT NULL
     AND v_now > v_session.opens_at + make_interval(mins => v_session.late_threshold_minutes) THEN
    IF v_session.allow_late_checkin THEN
      v_status := 'late';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'LATE_WINDOW_CLOSED',
        'message', 'The check-in window has closed. See your instructor.');
    END IF;
  END IF;

  INSERT INTO gw_attendance_challenge_attempts (session_id, user_id, symbol_index, was_correct)
  VALUES (p_session_id, v_uid, p_symbol_index, true);

  INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, marked_at)
  VALUES (p_session_id, v_profile_id, v_status, 'self', v_now)
  ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;

  -- Concurrent double-tap raced us; report the row that won.
  SELECT * INTO v_existing FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  RETURN jsonb_build_object('success', true, 'status', v_existing.status, 'marked_at', v_existing.marked_at);
END;
$$;

-- 7. Instructor schedule RPC: 480 slots (4h) from opens_at, rotate locally.
CREATE OR REPLACE FUNCTION public.get_roll_call_schedule(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_seed UUID;
  v_first_slot BIGINT;
  v_slots INTEGER[];
BEGIN
  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.course_id = v_session.course_id AND e.user_id = v_uid
        AND e.role IN ('instructor', 'ta') AND e.enrollment_status = 'enrolled'
    )
    OR EXISTS (
      SELECT 1 FROM app_roles ar
      WHERE ar.user_id = v_uid
        AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
        AND ar.is_active = true
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  IF v_seed IS NULL THEN
    -- Session predates the trigger or was flipped to roll_call oddly; self-heal.
    INSERT INTO gw_attendance_session_secrets (session_id) VALUES (p_session_id)
    ON CONFLICT (session_id) DO NOTHING;
    SELECT challenge_seed INTO v_seed FROM gw_attendance_session_secrets WHERE session_id = p_session_id;
  END IF;

  v_first_slot := floor(extract(epoch FROM v_session.opens_at) / 30)::bigint;
  SELECT array_agg(roll_call_symbol_for_slot(v_seed, s)) INTO v_slots
  FROM generate_series(v_first_slot, v_first_slot + 479) AS s;

  RETURN jsonb_build_object(
    'success', true,
    'first_slot', v_first_slot,
    'slots', to_jsonb(v_slots),
    'interval_seconds', 30,
    'server_now', now(),
    'closes_at', v_session.closes_at
  );
END;
$$;

-- 8. Student state RPC (records RLS keys on auth.uid but rows store profile id,
--    so students cannot reliably SELECT their own record — this is the sturdy path).
CREATE OR REPLACE FUNCTION public.get_my_roll_call_state(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile_id UUID;
  v_record RECORD;
  v_wrong INTEGER;
BEGIN
  SELECT id INTO v_profile_id FROM gw_profiles WHERE user_id = v_uid;
  SELECT count(*) INTO v_wrong FROM gw_attendance_challenge_attempts
  WHERE session_id = p_session_id AND user_id = v_uid AND was_correct = false;
  SELECT * INTO v_record FROM gw_attendance_records
  WHERE attendance_session_id = p_session_id AND student_profile_id = v_profile_id;
  RETURN jsonb_build_object(
    'checked_in', v_record IS NOT NULL,
    'status', v_record.status,
    'marked_at', v_record.marked_at,
    'wrong_attempts', v_wrong,
    'locked', v_wrong >= 10
  );
END;
$$;

-- 9. Instructor flags RPC for the live roster (amber indicators).
CREATE OR REPLACE FUNCTION public.get_roll_call_flags(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_session FROM gw_attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.course_id = v_session.course_id AND e.user_id = v_uid
        AND e.role IN ('instructor', 'ta') AND e.enrollment_status = 'enrolled'
    )
    OR EXISTS (
      SELECT 1 FROM app_roles ar
      WHERE ar.user_id = v_uid
        AND ar.role IN ('superadmin', 'admin', 'super_admin', 'super-admin')
        AND ar.is_active = true
    )
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', a.user_id,
    'student_profile_id', p.id,
    'wrong_attempts', a.wrong_attempts,
    'locked', a.wrong_attempts >= 10
  )), '[]'::jsonb) INTO v_result
  FROM (
    SELECT user_id, count(*) AS wrong_attempts
    FROM gw_attendance_challenge_attempts
    WHERE session_id = p_session_id AND was_correct = false
    GROUP BY user_id
  ) a
  LEFT JOIN gw_profiles p ON p.user_id = a.user_id;
  RETURN v_result;
END;
$$;

-- 10. Grants + realtime
GRANT EXECUTE ON FUNCTION public.roll_call_check_in(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roll_call_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roll_call_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roll_call_flags(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.roll_call_symbol_for_slot(uuid, bigint) FROM anon, authenticated;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'gw_attendance_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_attendance_records;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'gw_attendance_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_attendance_sessions;
  END IF;
END $do$;
```

- [ ] **Step 2: Write the companion test SQL** (convention: `supabase/migrations/tests/`, runs in a transaction and rolls back; Kevin executes it against staging/prod via `!` since Claude cannot write to the prod DB)

```sql
-- academy_roll_call_test.sql — run AFTER the migration; everything rolls back.
BEGIN;

-- Symbol derivation is deterministic and in range.
DO $$
DECLARE v_seed uuid := '00000000-0000-0000-0000-000000000001';
        v_a int; v_b int;
BEGIN
  v_a := public.roll_call_symbol_for_slot(v_seed, 1000);
  v_b := public.roll_call_symbol_for_slot(v_seed, 1000);
  ASSERT v_a = v_b, 'derivation must be deterministic';
  ASSERT v_a BETWEEN 0 AND 7, 'symbol index in 0..7';
  ASSERT (SELECT count(DISTINCT public.roll_call_symbol_for_slot(v_seed, s))
          FROM generate_series(1, 200) s) > 1, 'symbols must vary across slots';
END $$;

-- Seed trigger fires for roll_call sessions.
DO $$
DECLARE v_course uuid; v_session uuid;
BEGIN
  SELECT id INTO v_course FROM gw_courses LIMIT 1;
  IF v_course IS NULL THEN RAISE NOTICE 'no course to test with, skipping'; RETURN; END IF;
  INSERT INTO gw_attendance_sessions (course_id, title, mode, status)
  VALUES (v_course, 'RC test', 'roll_call', 'open') RETURNING id INTO v_session;
  ASSERT EXISTS (SELECT 1 FROM gw_attendance_session_secrets WHERE session_id = v_session),
    'seed row must exist after insert';
END $$;

-- Unauthenticated check-in is rejected (auth.uid() is NULL under psql).
DO $$
DECLARE v_res jsonb;
BEGIN
  v_res := public.roll_call_check_in(gen_random_uuid(), 3);
  ASSERT v_res->>'error' = 'NOT_AUTHENTICATED', 'expected NOT_AUTHENTICATED, got ' || v_res::text;
END $$;

ROLLBACK;
```

- [ ] **Step 3: Sanity-check the SQL parses** — `node` is not a SQL checker; instead re-read both files top to bottom checking: every `$$` pairs, every function ends `$$;`, policy names unique, no reference to columns that don't exist in the DDL shown in spec/migration `20260120142034`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260802120000_academy_roll_call.sql supabase/migrations/tests/academy_roll_call_test.sql
git commit -m "feat(attendance): roll_call mode schema + challenge RPCs"
```

---

### Task 2: Challenge helper library (pure, unit-tested)

**Files:**
- Create: `src/components/academy/attendance/rollCallChallenge.ts`
- Test: `src/components/academy/attendance/rollCallChallenge.test.ts`

**Interfaces:**
- Produces:
  - `ROLL_CALL_SYMBOLS: readonly string[]` (exactly 8 entries: `['🔺','🟦','⭐','🌙','⚡','❤️','🔔','☂️']`)
  - `ROTATION_SECONDS = 30`
  - `slotForTime(epochMs: number): number`
  - `clockOffsetMs(serverNowIso: string, clientNowMs: number): number`
  - `interface RollCallSchedule { firstSlot: number; slots: number[]; intervalSeconds: number; serverNow: string; closesAt: string }`
  - `parseSchedule(raw: any): RollCallSchedule | null` (validates the RPC jsonb payload)
  - `symbolIndexAt(schedule: RollCallSchedule, correctedNowMs: number): number | null`
  - `secondsRemainingInSlot(correctedNowMs: number): number`
  - `type RollCallCardStatus = 'ready' | 'present' | 'late' | 'locked'`
  - `deriveCardStatus(state: { checked_in: boolean; status?: string | null; locked: boolean }): RollCallCardStatus`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  ROLL_CALL_SYMBOLS, ROTATION_SECONDS, slotForTime, clockOffsetMs,
  parseSchedule, symbolIndexAt, secondsRemainingInSlot, deriveCardStatus,
} from './rollCallChallenge';

describe('rollCallChallenge', () => {
  it('has exactly 8 distinct symbols', () => {
    expect(ROLL_CALL_SYMBOLS).toHaveLength(8);
    expect(new Set(ROLL_CALL_SYMBOLS).size).toBe(8);
  });

  it('slotForTime matches floor(epochSeconds/30)', () => {
    expect(slotForTime(0)).toBe(0);
    expect(slotForTime(29_999)).toBe(0);
    expect(slotForTime(30_000)).toBe(1);
    expect(slotForTime(1_754_000_000_000)).toBe(Math.floor(1_754_000_000 / ROTATION_SECONDS));
  });

  it('clockOffsetMs is server minus client', () => {
    const client = Date.UTC(2026, 7, 2, 12, 0, 0);
    expect(clockOffsetMs('2026-08-02T12:00:05.000Z', client)).toBe(5000);
    expect(clockOffsetMs('2026-08-02T11:59:55.000Z', client)).toBe(-5000);
  });

  it('parseSchedule accepts the RPC payload and rejects junk', () => {
    const ok = parseSchedule({
      success: true, first_slot: 100, slots: [1, 2, 3],
      interval_seconds: 30, server_now: '2026-08-02T12:00:00Z', closes_at: '2026-08-02T14:00:00Z',
    });
    expect(ok).toEqual({
      firstSlot: 100, slots: [1, 2, 3], intervalSeconds: 30,
      serverNow: '2026-08-02T12:00:00Z', closesAt: '2026-08-02T14:00:00Z',
    });
    expect(parseSchedule(null)).toBeNull();
    expect(parseSchedule({ success: false, error: 'NOT_AUTHORIZED' })).toBeNull();
    expect(parseSchedule({ success: true, slots: 'nope' })).toBeNull();
  });

  it('symbolIndexAt indexes by absolute slot and returns null out of range', () => {
    const schedule = {
      firstSlot: 100, slots: [5, 6, 7], intervalSeconds: 30,
      serverNow: '', closesAt: '',
    };
    expect(symbolIndexAt(schedule, 100 * 30_000)).toBe(5);
    expect(symbolIndexAt(schedule, 102 * 30_000 + 29_999)).toBe(7);
    expect(symbolIndexAt(schedule, 99 * 30_000)).toBeNull();
    expect(symbolIndexAt(schedule, 103 * 30_000)).toBeNull();
  });

  it('secondsRemainingInSlot counts down within the 30s window', () => {
    expect(secondsRemainingInSlot(100 * 30_000)).toBe(30);
    expect(secondsRemainingInSlot(100 * 30_000 + 29_000)).toBe(1);
  });

  it('deriveCardStatus maps server state to card status', () => {
    expect(deriveCardStatus({ checked_in: true, status: 'present', locked: false })).toBe('present');
    expect(deriveCardStatus({ checked_in: true, status: 'late', locked: false })).toBe('late');
    expect(deriveCardStatus({ checked_in: false, status: null, locked: true })).toBe('locked');
    expect(deriveCardStatus({ checked_in: false, status: null, locked: false })).toBe('ready');
    // checked_in wins over locked (they succeeded eventually)
    expect(deriveCardStatus({ checked_in: true, status: 'present', locked: true })).toBe('present');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/components/academy/attendance/rollCallChallenge.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// Shared roll-call challenge math. The SERVER is the only validation authority
// (roll_call_check_in RPC); this mirror exists solely so the instructor display
// can rotate locally from a prefetched schedule and survive network blips.
export const ROLL_CALL_SYMBOLS = ['🔺', '🟦', '⭐', '🌙', '⚡', '❤️', '🔔', '☂️'] as const;
export const ROTATION_SECONDS = 30;

export interface RollCallSchedule {
  firstSlot: number;
  slots: number[];
  intervalSeconds: number;
  serverNow: string;
  closesAt: string;
}

export function slotForTime(epochMs: number): number {
  return Math.floor(epochMs / 1000 / ROTATION_SECONDS);
}

export function clockOffsetMs(serverNowIso: string, clientNowMs: number): number {
  return new Date(serverNowIso).getTime() - clientNowMs;
}

export function parseSchedule(raw: any): RollCallSchedule | null {
  if (!raw || raw.success !== true) return null;
  if (typeof raw.first_slot !== 'number' || !Array.isArray(raw.slots)) return null;
  if (!raw.slots.every((s: unknown) => typeof s === 'number')) return null;
  return {
    firstSlot: raw.first_slot,
    slots: raw.slots,
    intervalSeconds: typeof raw.interval_seconds === 'number' ? raw.interval_seconds : ROTATION_SECONDS,
    serverNow: String(raw.server_now ?? ''),
    closesAt: String(raw.closes_at ?? ''),
  };
}

export function symbolIndexAt(schedule: RollCallSchedule, correctedNowMs: number): number | null {
  const idx = slotForTime(correctedNowMs) - schedule.firstSlot;
  return idx >= 0 && idx < schedule.slots.length ? schedule.slots[idx] : null;
}

export function secondsRemainingInSlot(correctedNowMs: number): number {
  const intoSlot = Math.floor((correctedNowMs / 1000) % ROTATION_SECONDS);
  return ROTATION_SECONDS - intoSlot;
}

export type RollCallCardStatus = 'ready' | 'present' | 'late' | 'locked';

export function deriveCardStatus(state: {
  checked_in: boolean;
  status?: string | null;
  locked: boolean;
}): RollCallCardStatus {
  if (state.checked_in) return state.status === 'late' ? 'late' : 'present';
  if (state.locked) return 'locked';
  return 'ready';
}
```

- [ ] **Step 4: Run to verify pass** — same command → all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/academy/attendance/rollCallChallenge.ts src/components/academy/attendance/rollCallChallenge.test.ts
git commit -m "feat(attendance): roll call challenge helpers + tests"
```

---

### Task 3: Student check-in card

**Files:**
- Create: `src/components/academy/attendance/RollCallCheckInCard.tsx`
- Modify: `src/components/academy/attendance/index.ts` (export the new component)

**Interfaces:**
- Consumes: Task 1 RPCs (`roll_call_check_in`, `get_my_roll_call_state`), Task 2 helpers.
- Produces: `<RollCallCheckInCard courseId={string} />` — renders `null` when no open roll_call session exists; safe to mount unconditionally on any course surface.

- [ ] **Step 1: Implement the component** (TanStack Query per surrounding code; realtime + 10s poll)

```tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock, Lock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ROLL_CALL_SYMBOLS, deriveCardStatus } from './rollCallChallenge';

interface RollCallCheckInCardProps {
  courseId: string;
}

export const RollCallCheckInCard: React.FC<RollCallCheckInCardProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Open roll_call session for this course. RLS already restricts to enrolled users.
  const { data: session } = useQuery({
    queryKey: ['roll-call-open-session', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at, closes_at, status, mode')
        .eq('course_id', courseId)
        .eq('mode', 'roll_call')
        .eq('status', 'open')
        .lte('opens_at', new Date().toISOString())
        .gte('closes_at', new Date().toISOString())
        .order('opens_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!courseId && !!user?.id,
    refetchInterval: 10_000, // polling fallback — realtime alone is not trusted
  });

  const { data: myState } = useQuery({
    queryKey: ['roll-call-my-state', session?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_roll_call_state' as any, {
        p_session_id: session!.id,
      });
      if (error) throw error;
      return data as { checked_in: boolean; status: string | null; marked_at: string | null; wrong_attempts: number; locked: boolean };
    },
    enabled: !!session?.id && !!user?.id,
    refetchInterval: 10_000,
  });

  // Realtime nudge for session open/close.
  React.useEffect(() => {
    if (!courseId) return;
    const channel = supabase
      .channel(`roll-call-student-${courseId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gw_attendance_sessions', filter: `course_id=eq.${courseId}` },
        () => qc.invalidateQueries({ queryKey: ['roll-call-open-session', courseId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courseId, qc]);

  const tapMutation = useMutation({
    mutationFn: async (symbolIndex: number) => {
      const { data, error } = await supabase.rpc('roll_call_check_in' as any, {
        p_session_id: session!.id,
        p_symbol_index: symbolIndex,
      });
      if (error) throw error;
      return data as { success: boolean; error?: string; message?: string; status?: string; locked?: boolean };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['roll-call-my-state', session?.id, user?.id] });
      if (res.success) {
        toast({ title: res.status === 'late' ? 'Checked in (late)' : 'You are checked in!' });
      } else if (res.error === 'WRONG_SYMBOL') {
        toast({ title: 'Not quite', description: res.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check-in unavailable', description: res.message, variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: 'Network problem', description: 'Could not reach the server — try again.', variant: 'destructive' });
    },
  });

  if (!session || !user) return null;
  const status = myState ? deriveCardStatus(myState) : 'ready';

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            {session.title}
          </p>
          {status === 'present' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" /> Present
              {myState?.marked_at && ` · ${format(new Date(myState.marked_at), 'h:mm a')}`}
            </span>
          )}
          {status === 'late' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" /> Late
              {myState?.marked_at && ` · ${format(new Date(myState.marked_at), 'h:mm a')}`}
            </span>
          )}
        </div>

        {status === 'ready' && (
          <>
            <p className="text-xs text-muted-foreground">
              Tap the symbol on the classroom screen to check in.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ROLL_CALL_SYMBOLS.map((symbol, i) => (
                <Button
                  key={symbol}
                  variant="outline"
                  className="h-14 text-2xl"
                  disabled={tapMutation.isPending}
                  onClick={() => tapMutation.mutate(i)}
                  aria-label={`Symbol ${i + 1}`}
                >
                  {symbol}
                </Button>
              ))}
            </div>
            {(myState?.wrong_attempts ?? 0) > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {myState!.wrong_attempts} missed {myState!.wrong_attempts === 1 ? 'tap' : 'taps'} — look at the screen before tapping.
              </p>
            )}
          </>
        )}

        {status === 'locked' && (
          <p className="text-xs text-destructive flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Self check-in is locked. See your instructor to be marked present.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Export from the barrel** — in `src/components/academy/attendance/index.ts` add:

```ts
export { RollCallCheckInCard } from './RollCallCheckInCard';
```

- [ ] **Step 3: Verify compile** — `npm run typecheck:guard` → no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/academy/attendance/RollCallCheckInCard.tsx src/components/academy/attendance/index.ts
git commit -m "feat(attendance): student roll call check-in card"
```

---

### Task 4: Mount the student card on course surfaces

**Files:**
- Modify: `src/components/course/MobileCourseLanding.tsx` (mobile home tab)
- Modify: `src/components/academy/UnifiedCoursePage.tsx` (desktop — render above tab content so it is visible on every tab)

**Interfaces:**
- Consumes: `<RollCallCheckInCard courseId={course.id} />` from Task 3 (renders null when idle, so mounting is unconditional and safe).

- [ ] **Step 1: MobileCourseLanding** — import `{ RollCallCheckInCard } from '@/components/academy/attendance'` and render `<RollCallCheckInCard courseId={course.id} />` directly above the existing tour roll-call banner block (search for the `activeCheckin &&` JSX around the "I Am Here" tour card; the new card goes immediately before it, inside the same scroll container).

- [ ] **Step 2: UnifiedCoursePage** — import the same component; in the authenticated course layout (the wrapper that renders the tab content — locate the `isMobile && activeTab === 'home'` branch near line 338 and the desktop return below it), render `<RollCallCheckInCard courseId={course.id} />` as the first child of the desktop main content column so it shows regardless of the active tab.

- [ ] **Step 3: Verify** — `npm run typecheck:guard` && `npx vitest run src/components/academy/attendance/rollCallChallenge.test.ts` still green. Then `npm run build:dev` completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/course/MobileCourseLanding.tsx src/components/academy/UnifiedCoursePage.tsx
git commit -m "feat(attendance): surface roll call card on course pages"
```

---

### Task 5: Instructor challenge display + console mode

**Files:**
- Create: `src/components/academy/attendance/RollCallChallengeDisplay.tsx`
- Modify: `src/components/academy/attendance/AttendanceConsole.tsx` (mode select + display wiring)
- Modify: `src/hooks/useAttendanceSessions.ts` (type unions)
- Modify: `src/components/academy/attendance/index.ts` (export)

**Interfaces:**
- Consumes: `get_roll_call_schedule` RPC (Task 1); `parseSchedule`, `symbolIndexAt`, `secondsRemainingInSlot`, `clockOffsetMs`, `ROLL_CALL_SYMBOLS` (Task 2).
- Produces: `<RollCallChallengeDisplay sessionId={string} />`.

- [ ] **Step 1: Widen the shared types** — in `src/hooks/useAttendanceSessions.ts`:
  - `mode: 'qr' | 'manual' | 'hybrid'` → `mode: 'qr' | 'manual' | 'hybrid' | 'roll_call'`
  - `check_in_method: 'qr' | 'manual' | 'pin' | 'auto'` → `check_in_method: 'qr' | 'manual' | 'pin' | 'auto' | 'self'`

- [ ] **Step 2: Implement RollCallChallengeDisplay**

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  ROLL_CALL_SYMBOLS, parseSchedule, symbolIndexAt,
  secondsRemainingInSlot, clockOffsetMs,
} from './rollCallChallenge';

interface RollCallChallengeDisplayProps {
  sessionId: string;
}

export const RollCallChallengeDisplay: React.FC<RollCallChallengeDisplayProps> = ({ sessionId }) => {
  // One fetch; after that the display rotates locally and survives network loss.
  const { data: schedule, isLoading, refetch } = useQuery({
    queryKey: ['roll-call-schedule', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_roll_call_schedule' as any, {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return parseSchedule(data);
    },
    staleTime: Infinity,
    retry: 3,
  });

  const offsetRef = React.useRef(0);
  React.useEffect(() => {
    if (schedule?.serverNow) offsetRef.current = clockOffsetMs(schedule.serverNow, Date.now());
  }, [schedule]);

  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Re-sync after tab was backgrounded (setInterval throttling).
  React.useEffect(() => {
    const onVisible = () => { if (!document.hidden) refetch(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetch]);

  if (isLoading) return <LoadingSpinner text="Loading challenge..." />;
  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Could not load the challenge. Check your connection and reopen this panel.
        </CardContent>
      </Card>
    );
  }

  const corrected = nowMs + offsetRef.current;
  const symbolIndex = symbolIndexAt(schedule, corrected);
  const remaining = secondsRemainingInSlot(corrected);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-center">Tap this symbol on your device</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        {symbolIndex === null ? (
          <p className="text-muted-foreground text-sm">Roll call window has ended.</p>
        ) : (
          <>
            <div className="text-[9rem] leading-none select-none" role="img" aria-label="Current roll call symbol">
              {ROLL_CALL_SYMBOLS[symbolIndex]}
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              Changes in {remaining}s
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: Wire into AttendanceConsole**
  - Widen the local state type (line ~41): `mode: 'qr' as 'qr' | 'manual' | 'hybrid' | 'roll_call'` and the `onValueChange` cast (line ~143) to the same union.
  - Add to the mode `SelectContent` (after the existing items around line 151): `<SelectItem value="roll_call">Roll Call (tap-in)</SelectItem>`.
  - In the display area (the ternary at line ~333 that shows `AttendanceQRDisplay` for `qr`/`hybrid` open sessions), add a branch first: if `selectedSession.status === 'open' && selectedSession.mode === 'roll_call'` render `<RollCallChallengeDisplay sessionId={selectedSession.id} />`.
  - Export from `index.ts`: `export { RollCallChallengeDisplay } from './RollCallChallengeDisplay';`

- [ ] **Step 4: Verify** — `npm run typecheck:guard` → no new errors; `npm run test` → green.

- [ ] **Step 5: Commit**

```bash
git add src/components/academy/attendance/RollCallChallengeDisplay.tsx src/components/academy/attendance/AttendanceConsole.tsx src/components/academy/attendance/index.ts src/hooks/useAttendanceSessions.ts
git commit -m "feat(attendance): instructor roll call mode + rotating challenge display"
```

---

### Task 6: Amber flags on the live roster

**Files:**
- Modify: `src/components/academy/attendance/AttendanceLiveRoster.tsx`

**Interfaces:**
- Consumes: `get_roll_call_flags(p_session_id)` RPC (Task 1) → `[{ user_id, student_profile_id, wrong_attempts, locked }]`.

- [ ] **Step 1: Fetch flags** — the file uses plain `useState`/`useEffect` (not TanStack); follow that style. Add:

```tsx
interface RollCallFlag {
  user_id: string;
  student_profile_id: string | null;
  wrong_attempts: number;
  locked: boolean;
}

const [rollCallFlags, setRollCallFlags] = useState<RollCallFlag[]>([]);

useEffect(() => {
  let cancelled = false;
  const fetchFlags = async () => {
    const { data, error } = await supabase.rpc('get_roll_call_flags' as any, {
      p_session_id: sessionId,
    });
    if (!cancelled && !error && Array.isArray(data)) setRollCallFlags(data as RollCallFlag[]);
  };
  fetchFlags();
  const t = setInterval(fetchFlags, 10_000); // polling fallback by design
  return () => { cancelled = true; clearInterval(t); };
}, [sessionId]);
```

- [ ] **Step 2: Render the flag** — in the per-student row (where each enrolled student renders name/status; students are `EnrolledStudent { id, user_id, ... }`), look up `rollCallFlags.find(f => f.user_id === student.user_id)` and, when found, render next to the student name:

```tsx
{flag && (
  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-400 text-xs gap-1">
    <AlertTriangle className="h-3 w-3" />
    {flag.locked ? 'locked' : `${flag.wrong_attempts} missed ${flag.wrong_attempts === 1 ? 'tap' : 'taps'}`}
  </Badge>
)}
```

(`AlertTriangle` and `Badge` are already imported in this file.)

- [ ] **Step 3: Verify** — `npm run typecheck:guard` → no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/academy/attendance/AttendanceLiveRoster.tsx
git commit -m "feat(attendance): amber roll call flags on live roster"
```

---

### Task 7: Full verification gate + PR

**Files:** none new.

- [ ] **Step 1:** `npm run lint` — no new errors in touched files.
- [ ] **Step 2:** `npm run typecheck:guard` — passes.
- [ ] **Step 3:** `npm run test` — full suite green.
- [ ] **Step 4:** `npm run build` — completes.
- [ ] **Step 5:** Push branch, open PR to `main` titled "Academy Roll Call: rotating-challenge self check-in". PR body must state the deploy order requirement: **apply `20260802120000_academy_roll_call.sql` + run `tests/academy_roll_call_test.sql` on prod BEFORE deploying the frontend** (Kevin applies migrations; Claude cannot write to prod DB).

---

## Release checklist (Kevin-facing, after merge)

1. Apply migration on the droplet as postgres, then run the test SQL (rolls back).
2. `bash scripts/deploy-frontend.sh` from origin/main tip; verify CACHE_VERSION.
3. Smoke test: create a Roll Call session in a course → challenge screen rotates → student device shows card → correct tap = present, wrong tap = amber flag.
