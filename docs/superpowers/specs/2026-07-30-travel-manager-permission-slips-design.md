# Travel Manager + Parent Permission Slips — Design

**Date:** 2026-07-30
**Status:** Design approved, ready for implementation plan

## Goal

Rename "Tour Manager" to "Travel Manager" in the GleeWorld UI, and add an electronic parent permission slip workflow. When a student is added to a travel roster in a K–12 ensemble, an email is sent to the student's guardian(s). The guardian opens a tokenized link, signs a canvas signature, and submits. The teacher sees the completed slip in the Travel Manager as a status badge on the roster row and inside a dedicated Permission Slips tab, plus an in-app notification.

## Non-goals

- No DB / route / module-id rename. Tour Manager stays `gw_tour_*`, `/tour-manager`, module id `tour-management`. Rename is UI-only.
- No paper / PDF signature capture. Canvas only.
- No SMS or mail delivery. Email only, via existing Resend infra.
- No Resend bounce webhook handling in v1.
- No age auto-detection. K–12 status is a tenant-level toggle.
- No multi-guardian signature quorum. One signature completes the slip.
- No dedicated notifications table. In-app bell is fed by an ephemeral query against `gw_permission_slips`.

## Rename plan (label-only)

- `src/lib/navigation/navCatalog.ts`: nav label `Tour Manager` → `Travel Manager`.
- `src/config/unified-modules.ts`: module `title` and any user-visible copy → `Travel Manager`.
- `src/components/modules/TourManagerModule.tsx`, `src/components/tour-manager/**`, `src/pages/TourPlanner.tsx`: replace any user-visible "Tour" copy with "Travel" (headings, buttons, empty states, toasts). Do not rename files, components, imports, or CSS classes.
- Routes: keep `/tour-manager` and `/tour-planner`. Add route aliases `/travel-manager` and `/travel-planner` that render the same components.
- Permission strings (`access_tour_planner`, `tour-manager` exec-board role, `is_current_user_tour_manager()` RPC): unchanged.
- DB tables (`gw_tour_*`): unchanged.
- Docs: leave prior spec filenames alone. New references use "Travel Manager".

## Data model

### New: `gw_guardians`

```
id                UUID PK DEFAULT gen_random_uuid()
tenant_id         UUID NOT NULL DEFAULT current_tenant_id()
student_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name              TEXT NOT NULL
email             TEXT NOT NULL           -- validated at write time
phone             TEXT
relationship      TEXT NOT NULL CHECK (relationship IN ('mother','father','guardian','other'))
is_primary        BOOLEAN NOT NULL DEFAULT false
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()

-- Enforce at most one primary per student
UNIQUE INDEX gw_guardians_one_primary
  ON gw_guardians(student_user_id) WHERE is_primary = true;
```

RLS (restrictive, per multi-tenant convention):
- Teachers with `is_current_user_tour_manager()` OR tenant admin: full CRUD in-tenant.
- Student: SELECT own row (`student_user_id = auth.uid()`), UPDATE own row.
- Everyone else: deny.

BEFORE INSERT trigger sets `tenant_id = current_tenant_id()` if NULL.

### New: `gw_permission_slips`

```
id                       UUID PK DEFAULT gen_random_uuid()
tenant_id                UUID NOT NULL DEFAULT current_tenant_id()
tour_id                  UUID NOT NULL REFERENCES gw_tour_events(id) ON DELETE CASCADE
student_user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
status                   TEXT NOT NULL CHECK (status IN ('pending','sent','signed','expired','revoked')) DEFAULT 'pending'
slip_token_jti           UUID                                -- current active JWT id; NULL if never sent or revoked
sent_to_guardian_id      UUID REFERENCES gw_guardians(id) ON DELETE SET NULL
sent_at                  TIMESTAMPTZ
signed_by_guardian_id    UUID REFERENCES gw_guardians(id) ON DELETE SET NULL
signed_at                TIMESTAMPTZ
signature_storage_path   TEXT                                -- permission-slips/<tenant>/<slip_id>.png
signature_audit          JSONB                               -- {ip, user_agent, typed_name, ts}
expires_at               TIMESTAMPTZ                         -- mirrors JWT exp; used for status='expired' materialization
created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (tour_id, student_user_id)
```

RLS (restrictive):
- Teachers with `is_current_user_tour_manager()` OR tenant admin: full CRUD in-tenant.
- Student: SELECT own slip.
- Parent access: never via the SDK — always through the parent-flow edge functions running with service role.

BEFORE INSERT trigger sets `tenant_id = current_tenant_id()` if NULL.

### Extend: `gw_branding_settings`

```
k12_ensemble BOOLEAN NOT NULL DEFAULT false
```

Semantics: when true, adding any student to `gw_tour_roster` auto-creates a `gw_permission_slips` row.

**Upsert trap reminder** (per `gw_branding_settings` legacy singleton PK issue): all writes to `gw_branding_settings` in the UI must use `.upsert({...}, { onConflict: 'tenant_id' })`. Bare `.upsert()` will hit the legacy singleton row and corrupt other tenants' branding. This is not new work — the `k12_ensemble` toggle just piggybacks on the existing General settings form, which must already follow this rule.

### Storage bucket: `permission-slips`

- Private, no public read.
- Path convention: `<tenant_id>/<slip_id>.png`.
- Signed URLs issued by teacher-side code only. Never client-readable by students or parents.

### Trigger: `gw_tour_roster` → auto-create slip

```
AFTER INSERT ON gw_tour_roster
FOR EACH ROW
WHEN (
  (SELECT k12_ensemble FROM gw_branding_settings
    WHERE tenant_id = NEW.tenant_id) = true
)
EXECUTE FUNCTION gw_create_permission_slip_for_roster();
```

Function inserts `(tenant_id, tour_id, student_user_id)` with `status='pending'`. UNIQUE constraint absorbs replays (idempotent on re-roster).

## Workflow

1. **Enable K–12.** Tenant admin toggles `k12_ensemble = true` in Branding / General settings.
2. **Roster add.** Teacher adds student to `gw_tour_roster` via the existing UI. Trigger inserts a `gw_permission_slips` row with `status='pending'`. UI shows badge "Not sent" on the roster row.
3. **Send.** Teacher clicks Send on the row (or Send all pending on the tab). `send-permission-slip-email` edge fn:
   - Verifies caller is a tour manager for this tenant.
   - Looks up primary guardian (fallback: first non-primary) from `gw_guardians`.
   - If none: aborts, returns `missing_guardian` — UI shows "Missing guardian contact" badge.
   - Mints a JWT with claims `{ slip_id, guardian_id, tenant_id, jti (uuid), exp = now + 14d }`, signed with `SLIP_SIGNING_KEY` (service-role secret, per-environment).
   - Writes `slip_token_jti`, `sent_to_guardian_id`, `sent_at`, `expires_at`, `status='sent'`.
   - Calls existing `gw-send-email` with a magic-link template: `https://<tenant-subdomain>/parent/permission-slip?token=<JWT>`.
   - Non-primary guardians: CC'd for visibility. Only the primary link is active.
4. **Parent opens link.** Route `/parent/permission-slip?token=<JWT>` is public (no auth). Page calls `verify-permission-slip-token` edge fn, which:
   - Verifies JWT signature and expiry.
   - Loads slip. Confirms `slip.slip_token_jti === jwt.jti` (revocation guard).
   - Loads trip context: tour title, destination, dates, cost, brief itinerary, emergency-contact procedures.
   - Returns trip context + guardian display name + student name.
5. **Sign.** Guardian draws canvas signature, types full name, checks "I authorize this trip", submits. `parent-sign-permission-slip` edge fn:
   - Re-verifies JWT.
   - Rejects if slip status not in (`sent`), or if `jti` mismatch.
   - Uploads PNG to `permission-slips/<tenant_id>/<slip_id>.png` (service role).
   - Writes `status='signed'`, `signed_by_guardian_id`, `signed_at`, `signature_storage_path`, `signature_audit = { ip, user_agent, typed_name, ts }`.
6. **Teacher sees it.** Roster badge flips to Signed ✓ on next fetch. In-app bell (see Notifications) shows the completion.
7. **Reminder digest.** A daily scheduled edge fn scans upcoming tours (within 48h) with any `pending` or `sent` slips, and emails each tenant's tour managers a single digest email listing outstanding students per trip.

## Teacher UI

### Roster row (existing `TourRosterSection.tsx`)

Add a status column: badge with one of:
- **Not sent** (gray) — status=`pending`, guardian on file.
- **Missing guardian** (yellow) — status=`pending`, no guardian row for this student.
- **Sent 2d ago** (blue) — status=`sent`, shows relative time.
- **Signed ✓** (green) — status=`signed`, shows relative time and click-to-view PDF.
- **Expired** (red) — status=`expired` or `expires_at < now`.
- **Revoked** (gray strike) — status=`revoked`.

Row action menu:
- **Send / Resend** — mint a new JWT (rotates `jti`, invalidating any old link), sets status back to `sent`.
- **Revoke** — sets `status='revoked'`, nulls `slip_token_jti`.
- **View signed** — opens a signed Storage URL to the PNG (if signed).
- **Add guardian** — opens a modal to create a `gw_guardians` row for the student (fast-path when badge is "Missing guardian").

### New tab: Permission Slips (inside `TourManagerDashboard`)

- Filterable table: student, tour, status, sent-at, signed-at, guardian.
- Filters: All / Pending / Sent / Signed / Missing guardian / Expired / Revoked.
- Bulk actions: Send all pending, Remind all sent-but-unsigned, Download signed PDFs (zip of PNGs).
- Callout at top listing students with "Missing guardian" for the currently-selected trip.

### Notification bell

- Reuse DashboardShell topbar bell if one already exists; otherwise this iteration adds a minimal bell that queries `gw_permission_slips WHERE status='signed' AND signed_at > last_seen_at` for the current teacher's tenant.
- Toast on the same event when the teacher is actively in the app.
- No new notifications table. `last_seen_at` stored in `localStorage` keyed by user id.

## Parent UI

Route: `/parent/permission-slip?token=<JWT>`

- Unauthenticated. Rendered under the tenant subdomain so CSP + branding pick up correctly. Follows GleeWorld light theme with tenant tint and logo.
- Mobile-first, single-column layout, targets iOS Safari and Android Chrome at 390px.
- Body sections:
  1. Header: tenant logo, "Permission slip for {student_name}", trip title.
  2. Trip details: destination, dates, cost, brief itinerary, emergency-contact procedures.
  3. Signature canvas (touch + mouse). Clear-signature button.
  4. Typed full name field.
  5. Checkbox: "I am {guardian_name} and I authorize {student_name} to travel on this trip."
  6. Submit button (disabled until signature drawn, name typed, and box checked).
- Post-submit: success page ("Thanks — {teacher_name} has been notified") + confirmation email to guardian summarizing what they signed.

Error states:
- **Invalid / expired token:** "This link is no longer valid. Contact your teacher to request a new one."
- **Already signed:** status page with signed-at timestamp and the trip summary.
- **Revoked:** "This link is no longer valid."

## Security

- **JWT:** HS256, signed with `SLIP_SIGNING_KEY` env var, per environment, service-role only. 14-day TTL. `jti` stored in the slip row so any Send/Resend/Revoke rotates the id and invalidates prior links.
- **RLS:** `gw_permission_slips` and `gw_guardians` restrictive per tenant with `DEFAULT current_tenant_id()` + BEFORE INSERT trigger, per the established GleeWorld multi-tenant model.
- **Parent flow:** all reads/writes go through edge functions with service role. The parent's browser never uses the Supabase JS SDK. This is why parents can access their child's slip without a Supabase auth session.
- **Signature file:** private Storage bucket. Read only via signed URL, issued by teacher-authenticated code. Not readable by students or parents after submission.
- **Audit:** `signature_audit JSONB` captures IP, user agent, typed name, and timestamp on submission. Sufficient for an e-sign audit trail for a school field-trip slip in typical US jurisdictions. Not a UETA/ESIGN-audited product; this is not offered as a legal e-signature service.
- **CSRF / replay:** JWT single-use is enforced by the status transition (`sent` → `signed`); resubmit attempts fail because status is no longer `sent`.

## Edge cases

- **Student has no guardian row:** slip stays `pending` with the "Missing guardian" badge. Teacher can add a guardian inline from the row action menu.
- **Tenant flips K–12 off after slips exist:** existing slips remain visible and continue to work. No new auto-creates fire until it's toggled back on.
- **Student removed from roster after slip is signed:** roster row disappears; slip remains for audit. Deleting the roster row does NOT delete the slip. (The `ON DELETE CASCADE` is only on `tour_id` and `student_user_id` for auth.users.)
- **Guardian's email is wrong:** teacher edits `gw_guardians`, clicks Resend on the row (rotates `jti`, invalidates old link).
- **Two guardians both click the link:** first submission wins; the second sees the "already signed" state. First-write-wins is guaranteed by the JWT being bound to a single guardian id (only the primary guardian's link is live).
- **Slip signed while teacher is offline:** in-app bell picks it up on next load via `last_seen_at` in localStorage.
- **Tenant subdomain not resolvable for the parent link:** parent-flow route is served from the same tenant subdomain that hosts the app; if the tenant uses a Cloudflare-proxied custom domain, the DNS must be grey-clouded per the existing custom-domain reload-loop note. Add a smoke test to the deploy checklist.

## Testing

Per the GleeWorld verify skill (Playwright at 390px + desktop):

- **E2E happy path:** K–12 tenant, teacher adds student to a tour → slip auto-created (`pending`, "Not sent" badge) → teacher clicks Send → mock Resend intercept captures the magic link → second browser context opens the link → draws canvas signature → submits → teacher's roster shows `Signed ✓` on refresh; bell shows +1.
- **E2E missing guardian:** teacher adds student with no `gw_guardians` row → badge shows "Missing guardian" → Send action is blocked with a toast.
- **E2E revoke + resend:** teacher revokes a sent slip → old link returns "not valid" → teacher resends → new link works → sign completes.
- **Real-phone smoke:** signature canvas usable on iOS Safari and Android Chrome at 390px, with both touch and Apple Pencil.
- **Edge-fn unit:** JWT verify rejects tampered signature, expired token, mismatched `jti`, wrong slip id.

## Open follow-ups (not v1)

- Resend bounce webhook → auto-flag slips whose delivery bounced.
- Multi-guardian quorum (all-must-sign) as a per-trip option.
- Paper-fallback PDF: teacher prints a slip, gets it back on paper, uploads a photo, marks as signed offline.
- Notifications: real notifications table + push if we grow beyond the ephemeral-bell model.
- SMS delivery via Twilio.
- Age auto-detection (add `birthdate` or `grade_level` to profiles) if per-student control ever becomes necessary.
