# PartTrack Player (Phase 1, Plan 2 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Singers get an interactive practice player (per-part volume/solo/mute, pitch-preserved tempo, A-B loop, count-in); directors assign pieces by voice part and see who practiced.

**Architecture:** Stems play as `AudioBufferSourceNode`s at `playbackRate = rate` (pitch shifts) → per-part `GainNode`s → sum → ONE `signalsmith-stretch` AudioWorklet in **live-input mode** correcting pitch by `-12·log2(rate)` semitones → destination. Per-part mixing stays live; loop uses the sources' native `loopStart`/`loopEnd`; count-in clicks bypass the stretch node. Listen telemetry batches into `gw_parttrack_listens`; a security-invoker rollup view feeds the director accountability tab.

**Tech Stack:** signalsmith-stretch@1.3.2 (MIT, zero deps, verified: live-input mode applies `semitones` only), Web Audio, React, Postgres/RLS.

**Spec:** `docs/superpowers/specs/2026-07-31-parttrack-phase1-design.md` §§3–5. Plan 1 (pipeline) shipped as PRs #335–#338.

## Global Constraints

- New tables follow the Plan 1 pattern exactly (`tenant_id DEFAULT current_tenant_id()`, RESTRICTIVE tenant_iso, gw_ prefix) — copy from `supabase/migrations/20260801090000_parttrack_pipeline.sql`.
- Views MUST be `WITH (security_invoker = true)` or they bypass RLS.
- Prod `gw_profiles.voice_part` holds codes: `S1 A1 T1 B1 S2 A2 T2 B2` (verified 2026-08-01). PartTrack roles are `soprano|soprano_1|…|bass_2|piano|other`. All matching goes through one normalizer, both directions.
- Featured-part gain preset (from Plan 1 mix matrix): featured 1.0, other voices 0.15, piano 0.45.
- Tempo slider range 50–110%, default 100. Pitch compensation: `semitones = -12 * Math.log2(rate)`.
- Telemetry: accumulate seconds; flush every 30s, on pause, and on page hide; `mode: 'player' | 'download'`; downloads log one row with `seconds_listened` null.
- CSP already allows WASM (`script-src` has `'unsafe-eval'`); no CSP change needed. No new external hosts.
- UI: light tokens, `text-xs`/`text-sm` minimums, tenant-neutral copy ("students").
- Accountability surfaces are director-only: gate on `useUserRole().isAdmin()` — verify the exact helper name in `src/hooks/useUserRole.ts` before use and match neighboring usage.
- iOS webview: `AudioContext` resumes only after a user gesture — create/resume the context inside the Play handler.

---

### Task 1: Migration — assignments, listens, rollup view

**Files:**
- Create: `supabase/migrations/20260802090000_parttrack_player.sql`

**Interfaces:**
- Produces: `gw_parttrack_assignments`, `gw_parttrack_listens`, view `gw_parttrack_listen_rollup`.

- [ ] **Step 1: Write the migration**

```sql
-- PartTrack Plan 2: assignments by voice part + listen telemetry.
-- Spec §3, §5. Follows the tenant pattern of 20260801090000_parttrack_pipeline.sql.

CREATE TABLE IF NOT EXISTS public.gw_parttrack_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id    uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  ensemble_id uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL,
  voice_part  text,                -- normalized code (S1, A2, ...); NULL = all parts
  due_date    date,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_assignments_score_idx
  ON public.gw_parttrack_assignments (score_id);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_listens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id         uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_role        text,
  mode             text NOT NULL DEFAULT 'player' CHECK (mode IN ('player','download')),
  seconds_listened int,             -- null for download rows
  tempo_pct        int,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_listens_score_user_idx
  ON public.gw_parttrack_listens (score_id, user_id, occurred_at DESC);

-- Rollup for the accountability tab. security_invoker so RLS still applies.
CREATE OR REPLACE VIEW public.gw_parttrack_listen_rollup
WITH (security_invoker = true) AS
SELECT tenant_id, score_id, user_id,
       COALESCE(SUM(seconds_listened), 0)::int AS total_seconds,
       MAX(occurred_at)                        AS last_at,
       ROUND(AVG(tempo_pct))::int              AS avg_tempo_pct
FROM public.gw_parttrack_listens
WHERE mode = 'player'
GROUP BY tenant_id, score_id, user_id;

ALTER TABLE public.gw_parttrack_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_listens     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_parttrack_assignments','gw_parttrack_listens'] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_tenant_iso ON public.%1$s; ' ||
      'CREATE POLICY %1$s_tenant_iso ON public.%1$s AS RESTRICTIVE ' ||
      'FOR ALL TO authenticated, anon ' ||
      'USING (tenant_id = public.current_tenant_id()) ' ||
      'WITH CHECK (tenant_id = public.current_tenant_id());',
      t
    );
  END LOOP;
END $$;

-- Assignments: everyone reads, admins write.
DROP POLICY IF EXISTS gw_parttrack_assignments_read ON public.gw_parttrack_assignments;
CREATE POLICY gw_parttrack_assignments_read ON public.gw_parttrack_assignments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS gw_parttrack_assignments_admin_write ON public.gw_parttrack_assignments;
CREATE POLICY gw_parttrack_assignments_admin_write ON public.gw_parttrack_assignments
  FOR ALL TO authenticated
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

-- Listens: users insert their own rows and read their own; admins read all.
DROP POLICY IF EXISTS gw_parttrack_listens_insert_own ON public.gw_parttrack_listens;
CREATE POLICY gw_parttrack_listens_insert_own ON public.gw_parttrack_listens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS gw_parttrack_listens_read ON public.gw_parttrack_listens;
CREATE POLICY gw_parttrack_listens_read ON public.gw_parttrack_listens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin_or_super_admin());
```

- [ ] **Step 2: Sanity-check** — `grep -c "ENABLE ROW LEVEL SECURITY"` → 2; `security_invoker` present; every table has the tenant default.
- [ ] **Step 3: Commit** — `feat(parttrack): assignments + listens schema with rollup view`.

---

### Task 2: Voice-part normalizer

**Files:**
- Create: `src/features/part-tracks/voiceParts.ts`
- Test: `src/features/part-tracks/__tests__/voiceParts.test.ts`

**Interfaces:**
- Produces: `normalizeVoicePart(input: string | null | undefined): string | null` → canonical code (`S`, `S1`, `S2`, `A`, `A1`, … `B2`, `PIANO`, `OTHER`, or null); `voicePartsMatch(a, b): boolean` — true when equal after normalization OR one is the sectionless form of the other (`S` matches `S1`/`S2`); `roleToCode(role): string | null` is just `normalizeVoicePart`.

- [ ] **Step 1: Failing tests**

```typescript
import { describe, expect, it } from 'vitest';
import { normalizeVoicePart, voicePartsMatch } from '../voiceParts';

describe('normalizeVoicePart', () => {
  it.each([
    ['soprano', 'S'], ['soprano_1', 'S1'], ['Soprano 2', 'S2'],
    ['S1', 'S1'], ['s2', 'S2'], ['alto', 'A'], ['A2', 'A2'],
    ['tenor_1', 'T1'], ['T1', 'T1'], ['bass', 'B'], ['B2', 'B2'],
    ['baritone', 'B'], ['piano', 'PIANO'], ['other', 'OTHER'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeVoicePart(input)).toBe(expected);
  });
  it('handles null/empty/junk', () => {
    expect(normalizeVoicePart(null)).toBeNull();
    expect(normalizeVoicePart('')).toBeNull();
    expect(normalizeVoicePart('conductor')).toBeNull();
  });
});

describe('voicePartsMatch', () => {
  it('exact and sectionless matches', () => {
    expect(voicePartsMatch('soprano_1', 'S1')).toBe(true);
    expect(voicePartsMatch('soprano', 'S1')).toBe(true);   // section-agnostic role
    expect(voicePartsMatch('S1', 'soprano')).toBe(true);
    expect(voicePartsMatch('S1', 'S2')).toBe(false);
    expect(voicePartsMatch('alto', 'S1')).toBe(false);
    expect(voicePartsMatch(null, 'S1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to fail, then implement**

```typescript
const LETTERS: Record<string, string> = {
  soprano: 'S', alto: 'A', tenor: 'T', bass: 'B', baritone: 'B',
  s: 'S', a: 'A', t: 'T', b: 'B',
};

export function normalizeVoicePart(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith('piano') || raw.startsWith('accomp') || raw.startsWith('organ')) return 'PIANO';
  if (raw === 'other') return 'OTHER';
  const m = raw.match(/^([a-z]+)[\s_-]*([12])?$/);
  if (!m) return null;
  const letter = LETTERS[m[1]];
  if (!letter) return null;
  return m[2] ? `${letter}${m[2]}` : letter;
}

export function voicePartsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeVoicePart(a);
  const nb = normalizeVoicePart(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Sectionless matches sectioned within the same letter (S ~ S1/S2).
  return na[0] === nb[0] && (na.length === 1 || nb.length === 1);
}
```

- [ ] **Step 3: Tests pass; commit** — `feat(parttrack): voice-part normalizer`.

---

### Task 3: Player math + audio engine

**Files:**
- Create: `src/features/part-tracks/player/playerMath.ts`
- Create: `src/features/part-tracks/player/engine.ts`
- Test: `src/features/part-tracks/__tests__/playerMath.test.ts`

**Interfaces:**
- `playerMath.pitchCompSemitones(rate: number): number` — `-12 * Math.log2(rate)`.
- `playerMath.measureBounds(manifest, startMeasure, endMeasure): { startSec, endSec }` — buffer-time bounds from `manifest.measures` (`endSec` = next measure's start, or `duration_ms/1000` for the last).
- `playerMath.countInDelays(manifest, measureNumber, rate): number[]` — real-time click offsets: beat count from `manifest.beats` (last entry with `measure <= measureNumber`, default 4), spacing `(60 / bpm) / rate`.
- `playerMath.featuredGains(roles: string[], featuredRole: string | null): Record<string, number>` — featured 1.0 / others 0.15 / piano 0.45; when `featuredRole` null, all voices 1.0 and piano 1.0 (neutral).
- `engine.createPartTrackEngine({ stems: Array<{ role, url }>, manifest })` → Promise of:
  `{ play(), pause(), seekSeconds(bufferSec), setTempo(rate), setGain(role, v), setLoop(startSec, endSec | null), setCountIn(on: boolean), positionSeconds(): number, playing: boolean, onTick(cb), dispose() }`
  Implementation notes (write as code, these are the invariants):
  - Lazy `AudioContext` created/resumed inside `play()` (iOS gesture rule).
  - Fetch stem URLs → `decodeAudioData` once, cache buffers.
  - On every (re)start: fresh `AudioBufferSourceNode` per stem, `playbackRate.value = rate`, `loop`/`loopStart`/`loopEnd` set when a loop region exists, connect source → part gain → sum gain.
  - Sum gain → `await SignalsmithStretch(ctx)` node (import from `'signalsmith-stretch'`) → `ctx.destination`; node `.start()`ed once; on tempo change call `stretch.schedule({ semitones: pitchCompSemitones(rate) })` and set every source's `playbackRate.value = rate`.
  - Position tracking: `startedAtCtx`, `startedAtOffset`; `positionSeconds() = startedAtOffset + (ctx.currentTime - startedAtCtx) * rate`, wrapped into the loop region when looping.
  - Count-in: `play()` with count-in on schedules `OscillatorNode` clicks (880 Hz, 60 ms, gain envelope) straight to `ctx.destination` at `countInDelays(...)`, then starts sources after the last click.
  - Tempo change while playing: capture `positionSeconds()`, stop sources, restart at captured offset with new rate (restart is simpler and glitch-tolerable on a slider commit; bind the slider's `onValueCommit`, not every drag tick).
- Unit tests cover playerMath ONLY (engine wraps Web Audio, untestable in jsdom).

- [ ] **Step 1: Failing playerMath tests** — use a small inline manifest fixture (8 measures, 4/4, 96 bpm, duration 20000 ms):

```typescript
import { describe, expect, it } from 'vitest';
import { countInDelays, featuredGains, measureBounds, pitchCompSemitones } from '../player/playerMath';

const manifest = {
  duration_ms: 20000,
  tempo_map: [{ measure: 1, bpm: 96 }],
  measures: Array.from({ length: 8 }, (_, i) => ({ number: i + 1, seconds: i * 2.5 })),
  rehearsal_marks: [],
  beats: [{ measure: 1, count: 4 }],
};

describe('playerMath', () => {
  it('pitch compensation: 0 at 100%, +ve when slowed', () => {
    expect(pitchCompSemitones(1)).toBe(0);
    expect(pitchCompSemitones(0.5)).toBeCloseTo(12);
    expect(pitchCompSemitones(0.8)).toBeCloseTo(3.863, 2);
  });
  it('measureBounds maps measures to buffer seconds', () => {
    expect(measureBounds(manifest, 2, 3)).toEqual({ startSec: 2.5, endSec: 7.5 });
    expect(measureBounds(manifest, 8, 8)).toEqual({ startSec: 17.5, endSec: 20 });
  });
  it('countInDelays: 4 clicks spaced by beat, stretched by rate', () => {
    const d = countInDelays(manifest, 1, 1);
    expect(d).toHaveLength(4);
    expect(d[1] - d[0]).toBeCloseTo(60 / 96);
    const slow = countInDelays(manifest, 1, 0.5);
    expect(slow[1] - slow[0]).toBeCloseTo((60 / 96) / 0.5);
  });
  it('featuredGains applies the mix preset', () => {
    const g = featuredGains(['soprano', 'alto', 'piano'], 'soprano');
    expect(g).toEqual({ soprano: 1, alto: 0.15, piano: 0.45 });
    expect(featuredGains(['soprano', 'piano'], null)).toEqual({ soprano: 1, piano: 1 });
  });
});
```

- [ ] **Step 2: Run to fail; implement playerMath.ts** (pure functions matching the tests exactly), **then engine.ts** per the invariants above.
- [ ] **Step 3: Tests pass; `tsc --noEmit` clean; commit** — `feat(parttrack): player math + web audio engine with signalsmith tempo`.

---

### Task 4: Player UI + integration

**Files:**
- Create: `src/features/part-tracks/player/PartTrackPlayer.tsx`
- Modify: `src/features/part-tracks/PartTracksDialog.tsx` (ready state)
- Modify: `src/features/part-tracks/RendersList.tsx` (mixes-only downloads + download logging hook point)

**Interfaces:**
- `PartTrackPlayer({ score, renders, onListen })` — takes the ready `PartTrackScore` (manifest inside) and stem renders; resolves signed URLs via `getSignedUrl('parttrack', path, 3600)`; builds the engine; `onListen(partRole, seconds, tempoPct)` fires from the telemetry batcher (Task 5 wires it; until then pass a no-op).

- [ ] **Step 1: Build PartTrackPlayer**
  - Layout (mobile-first, `text-sm`): transport row (Play/Pause, position `m. N` + `mm:ss`, count-in toggle); tempo slider 50–110% with % readout (`onValueCommit` → `setTempo`); per-part strips: role label, volume `Slider` (0–100), Solo / Mute toggle buttons (`text-xs`); "My part" button — uses `normalizeVoicePart(profile.voice_part)` matched against stem roles via `voicePartsMatch`, applies `featuredGains`; A-B loop: two `Select`s (start/end measure from `manifest.measures`) + Clear, mapped through `measureBounds`.
  - Solo logic in the component: soloed set non-empty → gains 0 for all others (multiplied on top of slider values); mute wins over solo.
  - Fetch profile voice_part the way `useSectionLeaders.ts` reads it (verify the exact query there and reuse the pattern).
  - Total stem download size note before load on first open: sum unknown → show "Loading N parts…" progress instead (size not stored); decode sequentially to cap memory.
- [ ] **Step 2: Integrate into dialog + page**
  - `PartTracksDialog` ready state renders `<PartTrackPlayer …/>` first, then a "Downloads" `details` section with the existing `RendersList` filtered to `kind === 'mix'`.
  - `RendersList` gains an optional `onDownload?(render)` prop invoked on download-link click (Task 5 logs it).
- [ ] **Step 3: Verify** — `tsc --noEmit` clean; `vitest run src/features/part-tracks` green; `npm run build` green.
- [ ] **Step 4: Commit** — `feat(parttrack): interactive practice player`.

---

### Task 5: Listen telemetry

**Files:**
- Create: `src/features/part-tracks/player/listenTracker.ts`
- Modify: `src/features/part-tracks/api.ts` (add `recordListens`, `logDownload`)
- Modify: `src/features/part-tracks/player/PartTrackPlayer.tsx`, `PartTracksDialog.tsx` (wire)
- Test: `src/features/part-tracks/__tests__/listenTracker.test.ts`

**Interfaces:**
- `createListenTracker({ flush: (batch: ListenBatch) => void, flushIntervalMs = 30000, now?: () => number })` → `{ start(partRole, tempoPct), stop(), setContext(partRole, tempoPct), dispose() }`; `ListenBatch = { partRole: string | null, tempoPct: number, seconds: number }`. Accumulates wall-clock seconds while started; flushes on interval tick, on `stop()`, and on `dispose()`; never flushes zero-second batches.
- `api.recordListens(scoreId, userId, batch)` — insert into `gw_parttrack_listens` (`mode: 'player'`, explicit `user_id`); `.select().single()` + throw (demo-tenant rule), but callers swallow errors (telemetry must never break playback).
- `api.logDownload(scoreId, userId, partRole, mixPreset)` — one `mode: 'download'` row, `seconds_listened: null`.

- [ ] **Step 1: Failing tracker tests** (fake timers):

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListenTracker } from '../player/listenTracker';

describe('createListenTracker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flushes accumulated seconds on interval', () => {
    const flush = vi.fn();
    const t = createListenTracker({ flush, flushIntervalMs: 30000 });
    t.start('soprano', 85);
    vi.advanceTimersByTime(30000);
    expect(flush).toHaveBeenCalledWith({ partRole: 'soprano', tempoPct: 85, seconds: 30 });
    t.dispose();
  });

  it('flushes remainder on stop and never flushes zero', () => {
    const flush = vi.fn();
    const t = createListenTracker({ flush, flushIntervalMs: 30000 });
    t.start('alto', 100);
    vi.advanceTimersByTime(5000);
    t.stop();
    expect(flush).toHaveBeenCalledWith({ partRole: 'alto', tempoPct: 100, seconds: 5 });
    t.stop();
    expect(flush).toHaveBeenCalledTimes(1);
    t.dispose();
  });
});
```

- [ ] **Step 2: Implement; wire into player** — `start` on engine play (partRole = current featured part or null; tempoPct = round(rate*100)), `stop` on pause/unmount; `document.visibilitychange → hidden` also flushes. Downloads call `api.logDownload`.
- [ ] **Step 3: Tests pass; build green; commit** — `feat(parttrack): listen telemetry with batched flush`.

---

### Task 6: Assignments + accountability (director)

**Files:**
- Create: `src/features/part-tracks/AssignmentsPanel.tsx`
- Modify: `src/features/part-tracks/api.ts` (assignments + rollup queries)
- Modify: `src/features/part-tracks/PartTracksDialog.tsx` (director tabs on ready state)
- Modify: `src/pages/dashboard/PartTracksPage.tsx` ("Assigned to you" chip)

**Interfaces:**
- `api.listAssignments(scoreId)`, `api.createAssignment(scoreId, voicePart | null, dueDate | null, userId)`, `api.deleteAssignment(id)` — voicePart stored NORMALIZED (`normalizeVoicePart`).
- `api.getListenRollup(scoreId)` — selects `gw_parttrack_listen_rollup` rows for the score.
- `api.getTenantSingers()` — profiles with `voice_part` (reuse the exact query pattern in `usePeopleDirectory.ts` / `useSectionLeaders.ts`; select id, display name fields, voice_part).

- [ ] **Step 1: AssignmentsPanel (director-only)**
  - "Assign" form: voice-part `Select` built from this score's confirmed part roles (normalized, deduped) + "All parts"; optional due date; list of existing assignments with delete.
  - Accountability table below: one row per tenant singer whose `voice_part` matches any assignment (`voicePartsMatch`; assignment `voice_part` null = everyone with any voice_part) — columns: name, part, minutes (`total_seconds/60`, rounded), last practiced (relative date), avg tempo %. Singers with no rollup row show "—" (that's the accountability point).
- [ ] **Step 2: Dialog tabs** — ready state becomes `Tabs`: "Practice" (player + downloads) / "Assignments" (AssignmentsPanel, rendered only for directors per the role gate).
- [ ] **Step 3: Singer chip** — `PartTracksPage` rows: fetch assignments for listed scores; if the signed-in user's normalized voice_part matches (or assignment is all-parts), show `Badge` "Assigned" (+ `due <date>` when set).
- [ ] **Step 4: Verify** — `tsc`, part-tracks vitest suite, `npm run build` all green.
- [ ] **Step 5: Commit** — `feat(parttrack): voice-part assignments + accountability rollup`.

---

### Task 7: Ship

- [ ] **Step 1:** Full-suite regression vs baseline (`no new failures` rule), part-tracks + navigation suites green.
- [ ] **Step 2:** PR → merge (Kevin approves), fetch main.
- [ ] **Step 3:** Kevin applies migration `20260802090000_parttrack_player.sql` via the established `!` route (or extend `scripts/parttrack-golive.sh` pattern); frontend deploy via `scripts/deploy-frontend.sh`; verify live CACHE_VERSION.
- [ ] **Step 4:** Live smoke: play stems with parts mixed, drag tempo to 70% (pitch must not drop), A-B loop two measures, count-in, "My part" with a profile that has `voice_part = 'S1'`; assign a part + due date; confirm a listen row lands and the accountability table shows minutes.

**Deliberately out of scope:** Lion & Lamb batch generation (needs Kevin's engraving files — separate session), rehearsal-mark navigation UI beyond measure numbers, transposition control (engine supports it via semitone offset; UI deferred), practice streaks dashboard.

## Self-review notes

- Spec coverage: §4 player (Tasks 3–5), §5 assignments/accountability (Tasks 1, 2, 6), telemetry batching per spec §3 note (Task 5). Distribution stays signed-URL only (unchanged).
- Tempo architecture uses live-input pitch-correction rather than the spec's literal "stretch after sum" wording — verified against signalsmith-stretch's README (live-input mode ignores `rate`, applies `semitones`); net effect (pitch-preserved tempo, one worklet, pre-sum gains) is identical.
- Types: `ListenBatch`, normalized codes, and gain constants are single-sourced (`voiceParts.ts`, `playerMath.ts`) and reused across tasks.
