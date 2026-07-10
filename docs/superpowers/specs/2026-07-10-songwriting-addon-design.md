# Songwriting Add-On — Design

**Date:** 2026-07-10
**Status:** Approved (brainstorming session with Kevin)
**Source app:** kpjsongwriting.com (`~/songwriter` — React 18 + Vite client, Express + raw-`pg` Postgres server on the consolidated droplet)

## Summary

Port the kpjsongwriting.com AI-assisted lyric-writing app into GleeWorld as a paid
add-on module (`songwriting`), at full feature parity: section-based lyric editor
with live syllable counts, a "graveyard" for cut lines, AI assist (rhymes /
next-line / rewrites via DeepSeek), chord charts with Tone.js playback, demo
take recording, and browser speech-to-text dictation + TTS playback. The
standalone app is retired: kpjsongwriting.com becomes a static marketing page
that funnels to GleeWorld.

## Decisions made

| Question | Decision |
|---|---|
| Audience | All members of subscribed tenants — every student gets a personal songwriting workspace |
| Standalone site | Retired; domain becomes marketing → GleeWorld |
| V1 scope | Full parity with kpjsongwriting.com (editor, AI, chord charts, recording, dictation/TTS) |
| AI provider | Keep DeepSeek (`deepseek-chat` via OpenAI SDK), proxied through a Supabase edge function |
| Packaging | Paid add-on in the à-la-carte ladder + all-modules bundle |
| Price | $14.99/mo per tenant ($149/yr); catalog row ships dark, flipped live after Stripe price creation |
| Song privacy | Private to the writer by default; opt-in share makes a song readable tenant-wide |
| Migration | Archive ALL users' data losslessly; import Kevin's songs now; park other users until the individual-user (Personal plan) story is designed |

Pricing anchors (checked 2026-07-10): LyricStudio Pro $5.99/mo, Gold $9.99/mo
(individual seats; opentools.ai); Songcraft Pro $8/mo, free ≤5 songs
(songcraft.io/pricing); GleeWorld Personal plan $8.99/mo. A tenant-wide
$14.99/mo undercuts equipping even three students individually. Cost floor is
negligible: DeepSeek tokens are fractions of a cent per assist; recording
storage counts against the tenant's existing `storage_gb` quota.

## 1. Module, billing & navigation

**Catalog row** (new migration): `gw_billing_modules` id `songwriting`, name
"Songwriting", tier `addon`, category `create`, icon `PenLine`, description
(tenant-neutral, "students" terminology):

> AI-assisted songwriting for your students: lyric editor with syllable counts,
> rhyme and next-line suggestions, chord charts, and demo recording.

Ships **dark** (no `stripe_price_id`), matching the `box_office`/`store`
precedent — `create-module-checkout` already refuses null price ids. Go-live is
a Stripe Dashboard price + one UPDATE. Joins the all-modules bundle when the
bundle is next touched.

**Activation:** zero new plumbing. The port-3030 webhook handles any
`metadata.module_id` generically; superadmin's per-tenant toggle grants it to
pilot tenants immediately.

**Navigation & gating:**
- `NAV_CATALOG` entry with `gate: { module: 'songwriting' }`
- `ModuleFlags` / `toModuleFlags` wiring in `src/lib/navigation/moduleFlags.ts`
- Routes `/songwriting` (library) and `/songwriting/:songId` (editor), pages
  wrapped in `<ModuleGate moduleId="songwriting">` (upgrade panel for
  non-entitled tenants)

## 2. Data model, RLS & storage

All tables follow the multi-tenant hardening pattern: `tenant_id` with
`DEFAULT current_tenant_id()` **and** the BEFORE INSERT trigger, plus
RESTRICTIVE tenant RLS (both required to avoid silent write failures).

**`gw_songs`** — near-1:1 port of the old `songs` table:
- `id uuid PK`, `tenant_id`, `user_id` (writer, references `auth.users`)
- `title text`, `sections jsonb` (verse/pre-chorus/chorus/bridge/intro/outro
  blocks — same shape as the old app so migrated rows import unchanged),
  `notes text`, `tempo_bpm int`, `key_signature text`,
  `graveyard jsonb` (cut lines), `chord_chart jsonb`
- `visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','tenant'))`
- RLS: writes owner-only; reads owner OR (`visibility='tenant'` AND same
  tenant). Directors have no special access in v1 — sharing is the student's
  choice; a shared song is readable by the whole tenant (read-only).

**`gw_song_recordings`** — take metadata: `song_id`, `tenant_id`, `user_id`,
`storage_key`, `mime_type`, `size_bytes`, `duration_ms`. Owner-only RLS
(recordings are not shared in v1, even on shared songs).

**Storage:** new private bucket `songwriting`, paths
`<tenant>/<user>/<song>/take-*.{m4a,webm}`, modeled on the Studio sessions
bucket migration (`20260624010000_studio_sessions.sql`). The minute-cron
flatten script is bucket-generic — no extra work. Sizes count against the
tenant `storage_gb` quota.

**`gw_songwriting_ai_logs`** — `tenant_id`, `user_id`, `feature`
(rhymes/next_line/rewrite), input/output previews, token counts, `created_at`.
Serves the rate limit (200 AI calls / 15 min / user, counted in the edge
function) and per-tenant DeepSeek cost visibility.

**Not reused from the old app:** its `users` table (`auth.users` replaces it)
and on-disk upload storage.

## 3. Client UI, AI edge function & speech

**Pages** in `src/pages/songwriting/` — light-theme tokens, site sizing
standards (`text-sm` body, `w-4 h-4` icons minimum), `gleeworld-design` skill
governs styling:

- **Library** (`/songwriting`): song cards (title, updated, section count),
  new-song button, "Shared with your ensemble" section of tenant-visible songs.
- **Editor** (`/songwriting/:songId`): section blocks with live syllable
  counts, graveyard drawer, notes/tempo/key fields, 800 ms debounced autosave,
  AI panel, chord chart editor, recorder panel.

**Component transplants** from `~/songwriter/client` (already React +
Tailwind): `SectionBlock`, `AIPanel`, `ChordChartEditor`, `RecorderPanel`,
`lib/chordEngine.ts`, `lib/chords.ts`, `lib/syllables.ts`. Work per component =
swap the fetch-to-Express API layer for Supabase client calls + restyle to the
design system.

**AI edge function** `songwriting-ai` (replaces old Express `routes/ai.js`):
1. Verify caller JWT
2. Check entitlement via `tenant_has_billing_module('songwriting')`
3. Enforce rate limit against `gw_songwriting_ai_logs`
4. Proxy to DeepSeek (existing prompts: rhymes / next-line / rewrite) with
   `DEEPSEEK_API_KEY` from edge-function env on the droplet
5. Log the call (previews + token counts)

No CSP change: the client only ever talks to supabase.gleeworld.org.

**Chord playback:** Tone.js in-browser (already shipped for Studio).
**Dictation & TTS:** browser Web Speech API, no server side; feature-detect and
hide gracefully where unsupported. Verify on real iOS device during QA, not the
simulator.

**Deliberate v1 non-goals:** no Studio data coupling (a "send recording to
Media Library / open in Studio" bridge is phase 2, after Studio export ships);
no comments on shared songs; no per-person sharing; no director dashboards.

## 4. Migration, domain flip, error handling & testing

**Migration (archive before anything else):**
1. **Archive everything:** `pg_dump` of the songwriter DB + tarball of
   `uploads/recordings`, stored in DO Spaces. Lossless insurance for ALL users.
2. **Import Kevin's songs:** one-off script matching his Google email, mapping
   `songs` rows → `gw_songs` (JSONB shapes unchanged) under his auth user +
   main tenant; recordings → `songwriting` bucket + `gw_song_recordings` rows.
3. **Verify, then freeze:** old app read-only (banner, writes disabled) once
   the add-on is live for Kevin; stopped after the domain flips.
4. **Parked:** other users' data stays archived until the individual-user
   story (the $8.99 user-scoped Personal plan is the likely home).

**Domain flip:** kpjsongwriting.com → static one-page marketing site (nginx on
the existing droplet) funneling to gleeworld.org. DNS grey-cloud (Cloudflare
proxy causes the SPA reload loop).

**Error handling:**
- Autosave failure: toast + retry; lyric text lives in React state, never only
  in flight
- AI failure (outage / 429): friendly panel message, editor unaffected
- Recording upload: keep the local blob until storage write AND metadata row
  both confirm (Part Tracks lesson). Codec pick must reuse the PR #80 logic —
  Safari claims webm MediaRecorder support but produces husks; record m4a there.

**Testing:**
- Unit: ported `syllables.ts`, `chordEngine.ts`
- RLS: cross-tenant and cross-user read/write denials (db-auditor pass)
- Playwright on local preview (write-heavy E2E stays off prod): create song →
  type → syllable counts update → autosave → share toggle → library shows
  shared song; `songwriting-ai` mocked
- Recorder: manual on desktop Chrome + real-device Safari/iOS
- Deploys: migration applied on the droplet, `docker compose up -d
  --force-recreate functions` for the edge function, rsync without `--delete`

## Open items (tracked, not blocking)

1. Stripe price creation + `stripe_price_id` UPDATE to flip the module live
2. All-modules bundle inclusion when the bundle is next touched
3. Individual-user (Personal plan) songwriting story + import of parked users
4. Phase 2: Studio/Media Library bridge, comments on shared songs
5. iOS build bump when the SPA ships (app bundles `dist/`; needs
   MARKETING_VERSION bump per post-approval upload rule; ask before uploading)
